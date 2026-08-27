#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hostSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const m11Inlined = hostSource.includes("// @payload:map_verIceCoast")
  && hostSource.includes("// @payload:mission_sera_m11");
const chromePath = process.env.SORTIE_CHROME
  || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const playwrightCandidates = [
  process.env.SORTIE_PLAYWRIGHT,
  "playwright",
  "C:/Users/user01/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright"
].filter(Boolean);
let playwright = null;
for (const candidate of playwrightCandidates) {
  try { playwright = require(candidate); break; } catch { /* next */ }
}
if (!playwright) throw new Error("playwright not found; set SORTIE_PLAYWRIGHT");

const assert = (condition, message, details = null) => {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : "";
  throw new Error(`check_stall_recovery_e2e: ${message}${suffix}`);
};

const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json"
};
const server = http.createServer((request, response) => {
  const requestPath = decodeURIComponent(request.url.split("?")[0]);
  const file = path.join(root, requestPath === "/" ? "index.html" : requestPath);
  if (!path.resolve(file).startsWith(root)) {
    response.writeHead(403); response.end(); return;
  }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404); response.end("not found"); return; }
    response.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(data);
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await playwright.chromium.launch({
  executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
});
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await context.addInitScript(() => {
  navigator.getGamepads = () => [];
  localStorage.setItem("sortieMissionRecords", JSON.stringify({
    "sera-m10": { cleared: true, rank: "A", scores: [1], times: [1] },
    "sera-m14": { cleared: true, rank: "A", scores: [1], times: [1] }
  }));
  localStorage.setItem("sortieHangarPurchases", JSON.stringify({
    schemaVersion: 2,
    campaigns: { usa: [], rus: [], sera: ["f35c"] }
  }));
});

const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];
page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

try {
  const payloadQuery = m11Inlined
    ? ""
    : "?payloads=payloads/map_verIceCoast.payload.js,payloads/mission_sera_m11.payload.js";
  await page.goto(`${baseUrl}/index.html${payloadQuery}`, {
    waitUntil: "load",
    timeout: 60_000
  });
  await page.waitForFunction(() => Boolean(
    window.__game?.forceStartMissionByKey
      && window.__game?.debug?.forceFlightFrames
      && window.__game?.forceSeraM11SetPlayerAltitude
  ), null, { timeout: 60_000 });

  const launch = await page.evaluate(() => {
    const started = window.__game.forceStartMissionByKey("sera-m11", "f35c");
    return { started, sample: window.__game.debug.forceFlightFrames(0, 1 / 60) };
  });
  assert(launch.started, "F-35C M11 production launch failed", launch);
  assert(launch.sample.speedMps >= launch.sample.highAltitude.minimumControlledSpeed * 1.05
      && launch.sample.speedMps <= launch.sample.highAltitude.availableMaxSpeed
      && launch.sample.stallSeverity < 0.01,
    "M11 did not launch F-35C in a trimmed sustainable state", launch.sample);

  const lowEnergy = await page.evaluate(() => {
    const debug = window.__game.debug;
    window.__game.forceSeraM11SetPlayerAltitude(9144);
    debug.forceResetAttitudeLift();
    debug.forceAttitude(0, 0, 0);
    debug.forceFlightEnergy(270, 0);
    const before = debug.forceFlightFrames(0, 1 / 60);
    const after = debug.forceFlightFrames(180, 1 / 60);
    return { before, after };
  });
  assert(lowEnergy.after.position.y < lowEnergy.before.position.y - 10
      && lowEnergy.after.dynamics.liftDeficit > 0.15
      && lowEnergy.after.stallSeverity < 0.08
      && lowEnergy.after.flightPath.separatedFlow < 0.05,
    "high-altitude low energy did not produce a non-stalled sinking path", lowEnergy);

  const recovery = await page.evaluate(() => {
    const debug = window.__game.debug;
    window.__game.forceSeraM11SetPlayerAltitude(9144);
    const primePhysicalStall = () => {
      debug.forceResetAttitudeLift();
      debug.forceAttitude(0, 0, 0);
      debug.forceFlightEnergy(300, 0);
      debug.forceFlightFrames(1, 1 / 60);
      // Rotate the body, not WORLD velocity, then keep pulling while energy is
      // bled. This establishes the same above-critical-AOA separation as the
      // real keyboard regression without pinning an impossible stall flag.
      debug.forceAttitude(0, 30, 0);
      let sample = debug.forceFlightFrames(1, 1 / 60, { brake: true, pitch: 0.7 });
      for (let batch = 0; batch < 8 && sample.stallSeverity < 0.75; batch += 1) {
        sample = debug.forceFlightFrames(15, 1 / 60, { brake: true, pitch: 0.7 });
      }
      return sample;
    };
    const samples = [primePhysicalStall()];
    for (let second = 0; second < 16; second += 1) {
      samples.push(debug.forceFlightFrames(60, 1 / 60, {
        boost: true,
        pitch: second < 3 ? -0.65 : 0
      }));
      if (samples.at(-1).stallSeverity < 0.08
          && !samples.at(-1).flightPath.active
          && samples.at(-1).kinematicSpeedMps >
            samples.at(-1).highAltitude.minimumControlledSpeed * 1.05) break;
    }
    return samples;
  });
  const recoveryStart = recovery[0];
  const recoveryEnd = recovery.at(-1);
  assert(recoveryStart.flightPath.separatedFlow > 0.5
      && recoveryStart.stallSeverity > 0.5,
    "recovery probe did not begin from a physical AOA stall", recoveryStart);
  const recoveredBelowCriticalAoa = recoveryEnd.flightPath.separatedFlow < 0.05
    && recoveryEnd.flightPath.angleOfAttackDeg < 18;
  assert(recoveredBelowCriticalAoa
      && recoveryEnd.stallSeverity < 0.08
      && !recoveryEnd.flightPath.active
      && recoveryEnd.dynamics.controlAuthority.pitchDown > 0.8,
    "nose-down + boost did not complete F-35C M11 stall recovery", recovery);
  assert(recoveryEnd.position.y < recoveryStart.position.y - 100
      && recoveryEnd.position.y > recoveryStart.position.y - 4000,
    "high-altitude recovery did not exchange a bounded amount of altitude for speed", recovery);
  assert(recoveryEnd.hudSpeedKph === Math.round(recoveryEnd.kinematicSpeedMps * 3.6),
    "recovery HUD speed diverged from world-space motion", recoveryEnd);

  assert(pageErrors.length === 0, "page errors", pageErrors);
  assert(consoleErrors.length === 0, "console errors", consoleErrors);
  console.log("check_stall_recovery_e2e: PASS");
  console.log(`  launch=${launch.sample.speedMps.toFixed(1)}m/s minimum=${launch.sample.highAltitude.minimumControlledSpeed.toFixed(1)}m/s`);
  console.log(`  low-energy 3s=${lowEnergy.after.kinematicSpeedMps.toFixed(1)}m/s liftDeficit=${lowEnergy.after.dynamics.liftDeficit.toFixed(2)}`);
  console.log(`  recovered in ${recovery.length - 1}s at ${recoveryEnd.kinematicSpeedMps.toFixed(1)}m/s after ${(recoveryStart.position.y - recoveryEnd.position.y).toFixed(0)}m descent`);
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
