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
  throw new Error(`check_sera_enemy_ai_watchdog_e2e: ${message}${
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

const aggressive = new Set(["intercept", "qra", "relief", "pinning", "interceptor"]);
const defensive = new Set(["screen", "escort", "cap", "top-cover"]);
const station = new Set(["support", "withdraw"]);
const summaries = [];
let worstSimulation = { key: null, milliseconds: 0, aircraft: 0 };

try {
  for (let missionNumber = 1; missionNumber <= 20; missionNumber += 1) {
    const key = `sera-m${String(missionNumber).padStart(2, "0")}`;
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
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
      && window.__game?.debug?.forceDeployAllPendingWaves
      && window.__game?.debug?.enemyObjectiveProbe
    ), null, { timeout: 120_000 });
    assert(await page.evaluate((missionKey) => window.__game.forceStartMissionByKey(missionKey, "f16"), key),
      `${key} could not start`);
    await page.waitForFunction(() => window.__game.state === "playing", null, { timeout: 20_000 });
    const simulationMs = await page.evaluate(() => {
      window.__game.debug.forceDeployAllPendingWaves();
      const startedAt = performance.now();
      window.__game.debug.forceEnemyFlightFrames(180);
      return performance.now() - startedAt;
    });
    const snapshot = await page.evaluate(() => ({
      state: window.__game.state,
      objectives: window.__game.debug.enemyObjectiveProbe(),
      live: window.__game.enemies.filter((enemy) => enemy.alive && !enemy.surface && !enemy.heli)
    }));

    assert(snapshot.state === "playing", `${key} left play during the AI watchdog`, snapshot.state);
    assert(Number.isFinite(simulationMs) && simulationMs < 5000,
      `${key} AI simulation exceeded the watchdog budget`, simulationMs);
    assert(snapshot.objectives.length > 0, `${key} exposed no fixed-wing objective state`);
    for (const enemy of snapshot.objectives) {
      assert(enemy.purpose, `${key} has a fixed-wing aircraft without purpose`, enemy);
      assert(Number.isFinite(enemy.sensorRange) && enemy.sensorRange >= 7000,
        `${key} has a short or invalid sensor`, enemy);
      assert(enemy.aimKind, `${key} aircraft produced no aim state after 180 frames`, enemy);
      assert(
        enemy.target
          || station.has(enemy.purpose)
          || enemy.purpose === "strike"
          || enemy.purpose === "cas"
          || (defensive.has(enemy.purpose) && enemy.contactState === "search"),
        `${key} detected or attack-tasked aircraft has no target`, enemy
      );
      if (aggressive.has(enemy.purpose)) {
        assert(enemy.mode === "pursuit" && ["track", "vector", "engaged"].includes(enemy.contactState),
          `${key} aggressive flight stayed dormant`, enemy);
      }
      if (defensive.has(enemy.purpose)) {
        assert(["patrol", "pursuit"].includes(enemy.mode)
            && ["search", "track", "engaged", "memory"].includes(enemy.contactState),
          `${key} defensive flight left its bounded state machine`, enemy);
      }
      if (station.has(enemy.purpose)) {
        assert(enemy.mode === "patrol" && enemy.contactState === "station",
          `${key} station aircraft abandoned its mission role`, enemy);
      }
      if (enemy.purpose === "interceptor") {
        assert(["inbound", "egress", "reattack"].includes(enemy.interceptorPhase),
          `${key} interceptor has no pass phase`, enemy);
      }
    }
    for (const enemy of snapshot.live) {
      assert(Number.isFinite(enemy.position.x) && Number.isFinite(enemy.position.y)
          && Number.isFinite(enemy.position.z) && Number.isFinite(enemy.speed),
        `${key} produced non-finite flight state`, enemy);
    }
    assert(errors.length === 0, `${key} browser errors`, errors);
    if (simulationMs > worstSimulation.milliseconds) {
      worstSimulation = {
        key,
        milliseconds: simulationMs,
        aircraft: snapshot.objectives.length
      };
    }
    summaries.push(`${key}:${snapshot.objectives.length}/${simulationMs.toFixed(0)}ms`);
    await context.close();
  }

  console.log("check_sera_enemy_ai_watchdog_e2e: PASS");
  console.log(`  ${summaries.join(" ")}`);
  console.log(`  worst=${worstSimulation.key} ${worstSimulation.aircraft} aircraft ${worstSimulation.milliseconds.toFixed(1)}ms/180frames`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
