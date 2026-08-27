#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [process.env.SORTIE_PLAYWRIGHT, "playwright",
  "C:/Users/user01/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright"].filter(Boolean);
const chromePath = process.env.SORTIE_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const assert = (condition, message, details = null) => {
  if (condition) return;
  throw new Error(`check_sera_m13_e2e: ${message}${details === null ? "" : `\n${JSON.stringify(details, null, 2)}`}`);
};
let playwright = null;
for (const candidate of candidates) { try { playwright = require(candidate); break; } catch { /* next */ } }
if (!playwright) throw new Error("Playwright is unavailable");

const server = http.createServer((request, response) => {
  const relative = decodeURIComponent(request.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
  const file = path.resolve(root, relative);
  if (!(file === root || file.startsWith(`${root}${path.sep}`))) { response.writeHead(403); response.end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404); response.end(); return; }
    const ext = path.extname(file);
    response.writeHead(200, { "Content-Type": ext === ".html" ? "text/html" : (ext === ".json" ? "application/json" : "text/javascript") });
    response.end(data);
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await playwright.chromium.launch({
  executablePath: chromePath, headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
});

async function openMission() {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  await context.addInitScript(() => {
    navigator.getGamepads = () => [];
    localStorage.setItem("sortieHangarPurchases", JSON.stringify({ schemaVersion: 2, campaigns: { usa: [], rus: [], sera: ["f16"] } }));
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto(`${baseUrl}/index.html?seraDev=1`, { waitUntil: "load", timeout: 120_000 });
  await page.waitForFunction(() => Boolean(window.__game?.forceStartMissionByKey && window.__game?.seraM13Probe), null, { timeout: 120_000 });
  assert(await page.evaluate(() => window.__game.forceStartMissionByKey("sera-m13", "f16")),
    "LIFELINE could not start through the production launcher");
  await page.waitForFunction(() => window.__game.seraM13Probe()?.state === "playing", null, { timeout: 20_000 });
  await page.waitForTimeout(500);
  return { context, page, pageErrors, consoleErrors };
}
function clean(opened, label) {
  assert(opened.pageErrors.length === 0, `page error on ${label}`, opened.pageErrors);
  assert(opened.consoleErrors.length === 0, `console error on ${label}`, opened.consoleErrors);
}

try {
  const delayed = await openMission();
  let probe = await delayed.page.evaluate(() => window.__game.seraM13Probe());
  assert(probe.worldKey === "hadorIslands", "wrong M13 world", probe.worldKey);
  assert(probe.guard.active && probe.guard.total === 4 && probe.guard.readout === "integrity"
      && probe.lifeline.filter((entry) => entry.type === "c17").length === 3
      && probe.lifeline.filter((entry) => entry.type === "tanker").length === 1,
    "four-aircraft aggregate escort did not arm", probe);
  assert(probe.recoveryGauge.visible && probe.recoveryGauge.label.includes("LIFELINE")
      && probe.recoveryGauge.width === "100%", "aggregate HP gauge is not visible/full", probe.recoveryGauge);
  const before = probe.pending.filter((entry) => entry.missionTag === "m13Reinforcement")
    .map((entry) => entry.delay).sort((a, b) => a - b);
  assert(before.length === 4, "four delayed reinforcement waves were not queued", probe.pending);
  assert(await delayed.page.evaluate(() => window.__game.forceSeraM13ClearAwacs()),
    "A-100 choice did not apply reinforcement delay");
  probe = await delayed.page.evaluate(() => window.__game.seraM13Probe());
  const after = probe.pending.filter((entry) => entry.missionTag === "m13Reinforcement")
    .map((entry) => entry.delay).sort((a, b) => a - b);
  assert(after.length === before.length && after.every((value, index) => Math.abs(value - before[index] - 45) < 1),
    "A-100 destruction did not add 45 seconds to every pending interceptor wave", { before, after });
  assert(probe.escort.delayedWaves === 4 && probe.escort.delayedAircraft === 8,
    "delayed wave/aircraft ledger is wrong", probe.escort);
  await delayed.page.evaluate(() => window.__game.forceSeraM13DamageEscort(0, 98));
  probe = await delayed.page.evaluate(() => window.__game.seraM13Probe());
  assert(probe.guard.integrity < 1 && probe.recoveryGauge.width !== "100%",
    "aggregate HP gauge did not react to escort damage", probe);
  await delayed.page.evaluate(() => window.__game.forceSeraM13DeployPending());
  await delayed.page.evaluate(() => window.__game.forceSeraM13ClearDesignated());
  probe = await delayed.page.evaluate(() => window.__game.seraM13Probe());
  assert(probe.outcomePending, "AWACS route did not complete", probe);
  await delayed.page.evaluate(() => window.__game.forceSeraM13ResolveOutcome());
  probe = await delayed.page.evaluate(() => window.__game.seraM13Probe());
  assert(probe.record?.lifelineAircraftSaved === 4 && probe.record?.lifelineAircraftLost === 0
      && probe.record?.enemyAwacsDestroyed === true && probe.record?.reinforcementsDelayed === 8,
    "AWACS route result was not persisted", probe.record);
  clean(delayed, "AWACS-delay route");
  await delayed.context.close();

  const loss = await openMission();
  await loss.page.evaluate(() => window.__game.forceSeraM13DeployPending());
  await loss.page.evaluate(() => window.__game.forceSeraM13DamageEscort(0, 9999));
  probe = await loss.page.evaluate(() => window.__game.seraM13Probe());
  assert(probe.state === "playing" && probe.guard.lost === 1,
    "one escort loss should not fail M13", probe);
  await loss.page.evaluate(() => window.__game.forceSeraM13ClearDesignated());
  await loss.page.evaluate(() => window.__game.forceSeraM13ResolveOutcome());
  probe = await loss.page.evaluate(() => window.__game.seraM13Probe());
  assert(probe.record?.lifelineAircraftSaved === 3 && probe.record?.lifelineAircraftLost === 1
      && probe.record?.enemyAwacsDestroyed === false && probe.record?.rank !== "S",
    "partial-survival clear/result/rank cap is wrong", probe.record);
  clean(loss, "one-loss route");
  await loss.context.close();

  const failed = await openMission();
  for (let index = 0; index < 4; index += 1) {
    await failed.page.evaluate((slot) => window.__game.forceSeraM13DamageEscort(slot, 9999), index);
  }
  probe = await failed.page.evaluate(() => window.__game.seraM13Probe());
  assert(probe.state === "gameover" && probe.guard.lost === 4,
    "all four escort losses did not fail M13", probe);
  clean(failed, "full escort loss");
  await failed.context.close();

  console.log("check_sera_m13_e2e: PASS");
  console.log("  aggregate 3+1 HP / AWACS adds 45s to four waves / one-loss clear / four-loss fail");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
