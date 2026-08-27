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
const candidates = [
  process.env.SORTIE_PLAYWRIGHT,
  "playwright",
  "C:/Users/user01/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright"
].filter(Boolean);
let playwright = null;
for (const candidate of candidates) {
  try { playwright = require(candidate); break; } catch { /* next */ }
}
if (!playwright) throw new Error("playwright not found; set SORTIE_PLAYWRIGHT");

const assert = (condition, message, details = null) => {
  if (condition) return;
  throw new Error(`check_unified_flight_dynamics_e2e: ${message}${details ? `\n${JSON.stringify(details, null, 2)}` : ""}`);
};
const mime = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript" };
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
  await page.goto(`${baseUrl}/index.html${payloadQuery}`, { waitUntil: "load", timeout: 60_000 });
  await page.waitForFunction(() => Boolean(
    window.__game?.forceStartMissionByKey
      && window.__game?.debug?.forceFlightFrames
      && window.__game?.forceSeraM11SetPlayerAltitude
  ), null, { timeout: 60_000 });
  const results = await page.evaluate(() => {
    const started = window.__game.forceStartMissionByKey("sera-m11", "f35c");
    const debug = window.__game.debug;
    const reset = (altitude, speed = 270, severity = 0) => {
      window.__game.forceSeraM11SetPlayerAltitude(altitude);
      debug.forceResetAttitudeLift();
      debug.forceAttitude(0, 0, 0);
      debug.forceFlightEnergy(speed, severity);
      return debug.forceFlightFrames(0, 1 / 60);
    };
    const runSeconds = (seconds, dt, input) => {
      let remaining = Math.round(seconds / dt);
      let sample = debug.forceFlightFrames(0, dt);
      while (remaining > 0) {
        const frames = Math.min(remaining, 720);
        sample = debug.forceFlightFrames(frames, dt, input);
        remaining -= frames;
      }
      return sample;
    };
    const runFrom = (altitude, speed, severity, seconds, dt, input) => {
      const before = reset(altitude, speed, severity);
      const after = runSeconds(seconds, dt, input);
      return { before, after };
    };

    const frameBefore = reset(9144, 340, 0);
    const frameAfter = debug.forceFlightFrames(1, 1 / 60, { boost: true });

    // Airbrake effectiveness is an ordinary-altitude handling check. At
    // 14,765 m dynamic pressure is intentionally tiny, so demanding the same
    // deceleration there contradicts the atmospheric model being tested.
    const coast = runFrom(2500, 270, 0, 10, 1 / 60, {});
    const brake = runFrom(2500, 270, 0, 10, 1 / 60, { brake: true });
    const noseDown = runFrom(14765, 270, 1, 5, 1 / 60, { boost: true, pitch: -0.65 });
    const noseUp = runFrom(14765, 270, 1, 5, 1 / 60, { boost: true, pitch: 0.65 });

    reset(9144, 347, 0);
    runSeconds(15, 1 / 60, { boost: true });
    const climbSamples = [debug.forceFlightFrames(0, 1 / 60)];
    // Fifteen seconds of level acceleration above plus 165 seconds of the
    // repeated zoom command makes the authored 180-second ceiling probe.
    for (let second = 0; second < 165; second += 1) {
      const last = climbSamples.at(-1);
      const pitch = last.attitudeForward.y < 0.30 ? 0.10 : 0;
      const next = debug.forceFlightFrames(60, 1 / 60, { boost: true, pitch });
      if (!next) break;
      climbSamples.push(next);
    }

    const fps = [1 / 30, 1 / 60, 1 / 120].map((dt) =>
      runFrom(14765, 270, 1, 10, dt, { boost: true, pitch: -0.35 }).after);
    return { started, frameBefore, frameAfter, coast, brake, noseDown, noseUp, climbSamples, fps };
  });

  assert(results.started, "M11 F-35C launch failed");
  const expectedDelta = {
    x: results.frameAfter.velocity.x / 60,
    y: results.frameAfter.velocity.y / 60,
    z: results.frameAfter.velocity.z / 60
  };
  const actualDelta = {
    x: results.frameAfter.position.x - results.frameBefore.position.x,
    y: results.frameAfter.position.y - results.frameBefore.position.y,
    z: results.frameAfter.position.z - results.frameBefore.position.z
  };
  assert(Math.hypot(
    actualDelta.x - expectedDelta.x,
    actualDelta.y - expectedDelta.y,
    actualDelta.z - expectedDelta.z
  ) < 1e-6, "position did not integrate the reported velocity", { actualDelta, expectedDelta });
  assert(results.frameAfter.hudSpeedKph === Math.round(results.frameAfter.kinematicSpeedMps * 3.6)
      && Math.abs(results.frameAfter.speedMps - results.frameAfter.kinematicSpeedMps) < 1e-9,
    "HUD, scalar and WORLD velocity disagree", results.frameAfter);
  assert(results.frameAfter.dynamics.forces.gravity.x === 0
      && results.frameAfter.dynamics.forces.gravity.z === 0
      && Math.abs(results.frameAfter.dynamics.forces.gravity.y + 9.80665) < 1e-9,
    "gravity is not exactly WORLD-down", results.frameAfter.dynamics.forces.gravity);
  assert(Number.isFinite(results.frameAfter.dynamics.telemetry.dynamicPressureRatio)
      && results.frameAfter.dynamics.telemetry.dynamicPressureRatio > 0,
    "runtime does not expose finite dynamic-pressure telemetry", results.frameAfter.dynamics.telemetry);

  const brakeSpeedDelta = results.coast.after.kinematicSpeedMps - results.brake.after.kinematicSpeedMps;
  assert(brakeSpeedDelta > 35,
    "airbrake did not materially change actual displacement speed", { brakeSpeedDelta, coast: results.coast, brake: results.brake });
  assert(results.brake.after.dynamics.controlAuthority.pitchDown >= 0.30
      && results.brake.after.dynamics.controlAuthority.roll >= 0.18
      && results.brake.after.dynamics.controlAuthority.yaw >= 0.12,
    "deep stall made every control axis unavailable", results.brake.after.dynamics.controlAuthority);

  assert(results.noseDown.after.attitudeForward.y < results.noseUp.after.attitudeForward.y - 0.7
      && results.noseDown.after.position.y < results.noseUp.after.position.y - 40,
    "nose-down and nose-up inputs did not create distinct physical trajectories",
    { noseDown: results.noseDown, noseUp: results.noseUp });

  const altitudes = results.climbSamples.map((sample) => sample.position.y);
  const maxAltitude = Math.max(...altitudes);
  const finalAltitude = altitudes.at(-1);
  assert(maxAltitude < 14000 && finalAltitude < maxAltitude - 500,
    "ordinary fighter could sustain or regenerate an unlimited high-altitude climb",
    { maxAltitude, finalAltitude, altitudes });

  const fpsAltitudes = results.fps.map((sample) => sample.position.y);
  const fpsSpeeds = results.fps.map((sample) => sample.kinematicSpeedMps);
  assert(Math.max(...fpsAltitudes) - Math.min(...fpsAltitudes) < 5,
    "10-second flight path changes with frame rate", { fpsAltitudes, fpsSpeeds });
  assert(Math.max(...fpsSpeeds) - Math.min(...fpsSpeeds) < 1,
    "10-second airspeed changes with frame rate", { fpsAltitudes, fpsSpeeds });
  assert(pageErrors.length === 0, "page errors", pageErrors);
  assert(consoleErrors.length === 0, "console errors", consoleErrors);

  console.log("check_unified_flight_dynamics_e2e: PASS");
  console.log(JSON.stringify({
    instrumentDeltaError: Math.hypot(
      actualDelta.x - expectedDelta.x,
      actualDelta.y - expectedDelta.y,
      actualDelta.z - expectedDelta.z
    ),
    brakeSpeedDelta,
    noseDownAltitude: results.noseDown.after.position.y,
    noseUpAltitude: results.noseUp.after.position.y,
    maxAltitude,
    finalAltitude,
    fpsAltitudes,
    fpsSpeeds
  }, null, 2));
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
