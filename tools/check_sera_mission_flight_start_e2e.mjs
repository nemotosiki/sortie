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
  throw new Error(`check_sera_mission_flight_start_e2e: ${message}${
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

const browser = await playwright.chromium.launch({
  executablePath: process.env.SORTIE_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
});
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

try {
  const samples = [];
  for (let number = 1; number <= 20; number += 1) {
    const key = `sera-m${String(number).padStart(2, "0")}`;
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html?seraDev=1`, {
      waitUntil: "load",
      timeout: 120_000
    });
    await page.waitForFunction(() => Boolean(
      window.__game?.forceStartMissionByKey && window.__game?.debug?.forceFlightFrames
    ), null, { timeout: 120_000 });
    samples.push(await page.evaluate((missionKey) => {
      const started = window.__game.forceStartMissionByKey(missionKey, "f16");
      const before = started ? window.__game.debug.forceFlightFrames(0, 1 / 60) : null;
      const after = started
        ? window.__game.debug.forceFlightFrames(120, 1 / 60, { boost: true })
        : null;
      return { key: missionKey, started, before, after, state: window.__game.state };
    }, key));
  }

  for (const sample of samples) {
    assert(sample.started && sample.before && sample.after,
      `${sample.key} did not remain playable for its first two flight seconds`, sample);
    const finite = [
      sample.after.position.x,
      sample.after.position.y,
      sample.after.position.z,
      sample.after.kinematicSpeedMps,
      sample.after.velocity.x,
      sample.after.velocity.y,
      sample.after.velocity.z
    ].every(Number.isFinite);
    assert(finite, `${sample.key} generated non-finite flight state`, sample.after);
    assert(sample.after.hudSpeedKph === Math.round(sample.after.kinematicSpeedMps * 3.6)
        && Math.abs(sample.after.speedMps - sample.after.kinematicSpeedMps) < 1e-8,
      `${sample.key} launch instruments disagree with displacement velocity`, sample.after);
    assert(sample.after.dynamics.stallRatio < 0.35,
      `${sample.key} entered an unrecoverable deep stall immediately after launch`, sample.after);
    assert(sample.after.position.y > Math.max(20, sample.before.position.y - 300),
      `${sample.key} lost implausible altitude in its first two seconds`, {
        before: sample.before.position,
        after: sample.after.position,
        dynamics: sample.after.dynamics
      });
  }
  assert(errors.length === 0, "browser errors", errors);

  console.log("check_sera_mission_flight_start_e2e: PASS");
  console.log(JSON.stringify(samples.map((sample) => ({
    key: sample.key,
    altitude: Number(sample.before.position.y.toFixed(1)),
    speedKph: sample.after.hudSpeedKph,
    stall: Number(sample.after.dynamics.stallRatio.toFixed(3)),
    twoSecondAltitudeDelta: Number((sample.after.position.y - sample.before.position.y).toFixed(2))
  })), null, 2));
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
