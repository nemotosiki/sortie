#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [
  process.env.SORTIE_PLAYWRIGHT,
  "playwright",
  "C:/Users/user01/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright"
].filter(Boolean);
let playwright = null;
for (const candidate of candidates) {
  try { playwright = require(candidate); break; } catch { /* next */ }
}
if (!playwright) throw new Error("Playwright is unavailable");

const assert = (condition, message, details = null) => {
  if (condition) return;
  throw new Error(`check_enemy_air_ai_sensor_e2e: ${message}${
    details === null ? "" : `\n${JSON.stringify(details, null, 2)}`
  }`);
};

const server = http.createServer((request, response) => {
  const relative = decodeURIComponent(request.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
  const file = path.resolve(root, relative);
  if (!(file === root || file.startsWith(`${root}${path.sep}`))) {
    response.writeHead(403); response.end(); return;
  }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, {
      "Content-Type": path.extname(file) === ".html" ? "text/html" : "text/javascript"
    });
    response.end(data);
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await playwright.chromium.launch({
  executablePath: process.env.SORTIE_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
});

async function openMission(key, deployHook = null) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  await context.addInitScript(() => {
    navigator.getGamepads = () => [];
    localStorage.setItem("sortieHangarPurchases", JSON.stringify({
      schemaVersion: 2,
      campaigns: { usa: [], rus: [], sera: ["f16"] }
    }));
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error?.stack || error)));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(`${baseUrl}/index.html?seraDev=1`, { waitUntil: "load", timeout: 120_000 });
  await page.waitForFunction(() => Boolean(
    window.__game?.forceStartMissionByKey
    && window.__game?.debug?.enemyObjectiveProbe
    && window.__game?.debug?.forceEnemyBreakCycle
    && window.__game?.debug?.forceInterceptorEgress
  ), null, { timeout: 120_000 });
  assert(await page.evaluate((missionKey) => window.__game.forceStartMissionByKey(missionKey, "f16"), key),
    `${key} could not start`);
  await page.waitForFunction(() => window.__game.state === "playing", null, { timeout: 20_000 });
  if (deployHook) {
    assert(await page.evaluate((hook) => window.__game[hook](), deployHook),
      `${key} could not deploy pending waves`);
  }
  await page.evaluate(() => window.__game.debug.forceEnemyFlightFrames(4));
  return { context, page, errors };
}

async function objectives(page) {
  return page.evaluate(() => window.__game.debug.enemyObjectiveProbe());
}

try {
  let opened = await openMission("sera-m14", "forceSeraM14DeployPending");
  let state = await objectives(opened.page);
  const cap = state.find((enemy) => enemy.purpose === "cap" && enemy.defencePoint);
  assert(cap && cap.sensorRange >= 11000 && cap.commitRange >= 4800 && cap.leashRange >= 7600,
    "fleet CAP did not receive the broad sensor / bounded commitment contract", cap);

  await opened.page.evaluate(([id, point]) => {
    window.__game.debug.forceTeleport(point[0] + 7000, point[1] + 180, point[2]);
    window.__game.debug.forceEnemyFlightFrames(4);
  }, [cap.id, cap.defencePoint]);
  state = await objectives(opened.page);
  let probe = state.find((enemy) => enemy.id === cap.id);
  assert(probe.mode === "patrol" && probe.contactState === "track",
    "CAP did not track a long-range contact outside its commitment perimeter", probe);

  await opened.page.evaluate((point) => {
    window.__game.debug.forceTeleport(point[0] + 180, point[1] + 180, point[2]);
    window.__game.debug.forceEnemyFlightFrames(4);
  }, cap.defencePoint);
  state = await objectives(opened.page);
  probe = state.find((enemy) => enemy.id === cap.id);
  assert(probe.mode === "pursuit" && probe.contactState === "engaged",
    "CAP did not commit inside the defended perimeter", probe);

  assert(await opened.page.evaluate((id) => window.__game.debug.forceEnemyBreakCycle(id), cap.id),
    "CAP break cycle could not be forced");
  await opened.page.evaluate(() => window.__game.debug.forceEnemyFlightFrames(4, 0.02));
  state = await objectives(opened.page);
  probe = state.find((enemy) => enemy.id === cap.id);
  assert(probe.mode === "pursuit",
    "missile break returned CAP to the obsolete close-range patrol state", probe);

  await opened.page.evaluate((point) => {
    window.__game.debug.forceTeleport(point[0] + 13000, point[1] + 180, point[2]);
    window.__game.debug.forceEnemyFlightFrames(4);
  }, cap.defencePoint);
  state = await objectives(opened.page);
  probe = state.find((enemy) => enemy.id === cap.id);
  assert(probe.mode === "patrol" && probe.contactState === "memory" && probe.contactMemory > 0,
    "CAP did not return under leash while retaining a last-known contact", probe);
  assert(opened.errors.length === 0, "browser errors during CAP sensor test", opened.errors);
  await opened.context.close();

  opened = await openMission("sera-m11", "forceSeraM11DeployPending");
  state = await objectives(opened.page);
  const assigned = state.filter((enemy) => enemy.assignedTarget !== "player");
  assert(assigned.some((enemy) => /LARK/.test(enemy.target || ""))
      && assigned.some((enemy) => /ARCA/.test(enemy.target || "")),
    "M11 assigned fighters did not split between LARK and ARCA", assigned);
  assert(state.filter((enemy) => ["intercept", "qra"].includes(enemy.purpose))
      .every((enemy) => enemy.sensorRange >= 14000 && enemy.mode === "pursuit"),
    "M11 intercept/QRA flights are still short-range gated", state);
  assert(opened.errors.length === 0, "browser errors during assigned-target test", opened.errors);
  await opened.context.close();

  opened = await openMission("sera-m20", "forceSeraM20DeployPending");
  state = await objectives(opened.page);
  const interceptor = state.find((enemy) => enemy.purpose === "interceptor");
  assert(interceptor && interceptor.interceptorPhase === "inbound",
    "M20 interceptor did not enter the pass state machine", interceptor);
  const overshootCases = await opened.page.evaluate(() => ({
    passed: window.__game.debug.interceptorOvershootProbe(650, 200, 540, -0.4),
    neverMerged: window.__game.debug.interceptorOvershootProbe(650, 600, 540, -0.4),
    stillClosing: window.__game.debug.interceptorOvershootProbe(500, 200, 540, -0.4),
    targetAhead: window.__game.debug.interceptorOvershootProbe(650, 200, 540, 0.4)
  }));
  assert(overshootCases.passed && !overshootCases.neverMerged
      && !overshootCases.stillClosing && !overshootCases.targetAhead,
    "interceptor overshoot classifier accepted an invalid pass", overshootCases);
  assert(await opened.page.evaluate((id) => window.__game.debug.forceInterceptorEgress(id), interceptor.id),
    "interceptor egress could not be forced");
  await opened.page.evaluate(() => window.__game.debug.forceEnemyFlightFrames(2, 0.05));
  state = await objectives(opened.page);
  let interceptorProbe = state.find((enemy) => enemy.id === interceptor.id);
  assert(interceptorProbe.interceptorPhase === "egress"
      && interceptorProbe.aimKind === "interceptor-egress"
      && interceptorProbe.interceptorPasses === 1,
    "interceptor did not extend after its pass", interceptorProbe);
  await opened.page.evaluate(() => window.__game.debug.forceEnemyFlightFrames(140, 0.05));
  state = await objectives(opened.page);
  interceptorProbe = state.find((enemy) => enemy.id === interceptor.id);
  assert(interceptorProbe.interceptorPhase === "reattack"
      && interceptorProbe.mode === "pursuit"
      && interceptorProbe.aimKind === "pursuit",
    "interceptor did not turn back for a second pass", interceptorProbe);
  assert(opened.errors.length === 0, "browser errors during interceptor pass test", opened.errors);
  await opened.context.close();

  opened = await openMission("sera-m19", "forceSeraM19DeployPending");
  const before = (await objectives(opened.page))
    .filter((enemy) => enemy.purpose === "hunt" && enemy.target)
    .map((enemy) => ({ id: enemy.id, target: enemy.target }));
  await opened.page.evaluate(() => window.__game.debug.forceEnemyFlightFrames(45));
  const after = await objectives(opened.page);
  assert(before.length >= 4 && before.every((entry) => (
    after.find((enemy) => enemy.id === entry.id)?.target === entry.target
  )), "hunt assignments oscillated while their charges were still alive", { before, after });
  assert(opened.errors.length === 0, "browser errors during hunt stability test", opened.errors);
  await opened.context.close();

  console.log("check_enemy_air_ai_sensor_e2e: PASS");
  console.log("  long-range track / bounded CAP / break resume / M11 target split / interceptor reattack / hunt stability");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
