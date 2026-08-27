#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
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

const server = http.createServer((request, response) => {
  const relative = decodeURIComponent(request.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
  const file = path.resolve(root, relative);
  if (!(file === root || file.startsWith(`${root}${path.sep}`))) {
    response.writeHead(403); response.end(); return;
  }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, {
      "Content-Type": path.extname(file) === ".html" ? "text/html" : "text/javascript",
      "Cache-Control": "no-store"
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
const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const missionKey = process.env.SORTIE_STALL_MISSION || "sera-m01";
const aircraftId = process.env.SORTIE_STALL_AIRCRAFT || "f16";
const expertMode = process.env.SORTIE_STALL_EXPERT === "1";
const verbose = process.env.SORTIE_STALL_VERBOSE === "1";
const scenario = process.env.SORTIE_STALL_SCENARIO || "stall";
const holdRecoveryInput = process.env.SORTIE_STALL_HOLD_RECOVERY === "1";
await context.addInitScript((aircraft) => {
  navigator.getGamepads = () => [];
  localStorage.setItem("sortieHangarPurchases", JSON.stringify({
    schemaVersion: 2,
    campaigns: { usa: [], rus: [], sera: ["f16", aircraft] }
  }));
  // The debug mission launcher intentionally honours hangar progression. Give
  // this isolated browser profile the F-35C's real M14 prerequisite so M11 can
  // be reproduced with the same aircraft reported by the player.
  localStorage.setItem("sortieMissionRecords", JSON.stringify({
    "sera-m14": { cleared: true, rank: "C", scores: [1] }
  }));
}, aircraftId);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(String(error?.stack || error)));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : "";
  throw new Error(`check_stall_recovery_real_input_e2e: ${message}${suffix}`);
}

const read = async (phase, elapsed) => page.evaluate(({ phase, elapsed }) => {
  const flight = window.__game.flight;
  const velocityHeading = Math.atan2(flight.velocity.x, -flight.velocity.z) * 180 / Math.PI;
  const attitudeHeading = Math.atan2(
    flight.attitudeForward.x,
    -flight.attitudeForward.z
  ) * 180 / Math.PI;
  return {
    phase,
    elapsed: Number(elapsed.toFixed(2)),
    state: window.__game.state,
    altitude: Number(flight.altitudeM.toFixed(2)),
    speed: Number(flight.dynamics.airspeed.toFixed(2)),
    verticalSpeed: Number(flight.velocity.y.toFixed(2)),
    position: {
      x: Number(flight.position.x.toFixed(2)),
      z: Number(flight.position.z.toFixed(2))
    },
    attitudeHeading: Number(attitudeHeading.toFixed(2)),
    velocityHeading: Number(velocityHeading.toFixed(2)),
    attitudeY: Number(flight.attitudeForward.y.toFixed(4)),
    aoa: Number(flight.dynamics.angleOfAttackDeg.toFixed(2)),
    flowMisalignment: Number((flight.dynamics.flowMisalignmentDeg || 0).toFixed(2)),
    separated: Number(flight.dynamics.separatedFlow.toFixed(3)),
    stall: Number(flight.stallSeverity.toFixed(3)),
    supportSpeed: Number(flight.dynamics.telemetry.supportSpeed.toFixed(2)),
    thrustY: Number(flight.dynamics.forces.thrust.y.toFixed(2)),
    accelerationY: Number(flight.dynamics.forces.acceleration.y.toFixed(2)),
    authority: { ...flight.dynamics.controlAuthority },
    input: { ...flight.input },
    warning: document.getElementById("stallWarning")?.textContent || ""
  };
}, { phase, elapsed });

const samples = [];
async function sampleFor(phase, maximumSeconds, stop) {
  const started = Date.now();
  let latest = await read(phase, 0);
  samples.push(latest);
  while ((Date.now() - started) / 1000 < maximumSeconds && !stop(latest)) {
    await page.waitForTimeout(250);
    latest = await read(phase, (Date.now() - started) / 1000);
    samples.push(latest);
    if (latest.state !== "playing") break;
  }
  return latest;
}

const label = `${missionKey}-${aircraftId}-${expertMode ? "expert" : "normal"}`;
const stallShot = path.join(os.tmpdir(), `sortie-real-input-stall-${label}.png`);
const recoveryShot = path.join(os.tmpdir(), `sortie-real-input-recovery-${label}.png`);
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?seraDev=1`, {
    waitUntil: "load",
    timeout: 120_000
  });
  await page.waitForFunction(() => Boolean(window.__game?.forceStartMissionByKey && window.__game?.flight), null, {
    timeout: 120_000
  });
  if (!await page.evaluate(([mission, aircraft]) => (
    window.__game.forceStartMissionByKey(mission, aircraft)
  ), [missionKey, aircraftId])) {
    throw new Error(`${missionKey} ${aircraftId} launch failed`);
  }
  await page.waitForFunction(() => window.__game.state === "playing", null, { timeout: 20_000 });
  if (expertMode) await page.keyboard.press("m");
  await page.waitForTimeout(1000);

  let stalled = null;
  let recovered = null;
  if (scenario === "turn") {
    // Ordinary AC-style flight: firewall the throttle and hold one bank input.
    // This must not create a sideslip/critical-AOA stall merely because the old
    // visual heading rate outruns the new WORLD velocity.
    await page.keyboard.down("Shift");
    await page.keyboard.down("a");
    recovered = await sampleFor("ordinary-turn", 8, () => false);
    await page.keyboard.up("a");
    await page.keyboard.up("Shift");
    await page.screenshot({ path: recoveryShot });
  } else {
    // Real keyboard events and the real requestAnimationFrame loop.  Pull to a
    // modest climb, then keep the airbrake out until the wing is deeply stalled.
    await page.keyboard.down("Control");
    await page.keyboard.down("s");
    await sampleFor("pitch-up", 4, (sample) => sample.attitudeY >= 0.42);
    // Keep pulling while the brake bleeds energy. Releasing pitch here lets a
    // stable aircraft lower its nose and enter a controlled descent without
    // ever exceeding critical AOA; that is a low-energy mush, not a stall.
    stalled = await sampleFor("decelerate", 18, (sample) => sample.stall >= 0.5);
    await page.keyboard.up("s");
    await page.keyboard.up("Control");
    await page.screenshot({ path: stallShot });

    // The player's actual recovery action: full power, lower the nose through
    // the horizon, then neutralise pitch while keeping power on. Holding the
    // stick through a complete outside loop is a separate over-control defect,
    // not the recovery technique this probe is meant to measure.
    await page.keyboard.down("Shift");
    await page.keyboard.down("w");
    if (!holdRecoveryInput) {
      await sampleFor("lower-nose", 8, (sample) => sample.attitudeY <= -0.16);
      await page.keyboard.up("w");
    }
    recovered = await sampleFor("recover", holdRecoveryInput ? 28 : 24, (sample) => (
      sample.elapsed >= 1
        && sample.stall < 0.08
        && sample.aoa < 10
        && sample.speed > sample.supportSpeed * 1.05
    ));
    await page.keyboard.up("Shift");
    await page.screenshot({ path: recoveryShot });
  }

  const recoveredSuccessfully = scenario === "turn"
    ? recovered.stall < 0.12 && recovered.aoa < 12
    : stalled.stall >= 0.5
      && stalled.separated >= 0.5
      && recovered.stall < 0.08
      && recovered.aoa < 10
      && recovered.speed > recovered.supportSpeed * 1.05;
  assert(recoveredSuccessfully, scenario === "turn"
    ? "ordinary real-input turn created a false stall"
    : "real-input stall entry or recovery did not complete", { stalled, recovered });
  assert(errors.length === 0, "browser errors", errors);
  console.log("check_stall_recovery_real_input_e2e: PASS");
  console.log(JSON.stringify({
    missionKey,
    aircraftId,
    controlMode: expertMode ? "expert" : "normal",
    scenario,
    holdRecoveryInput,
    stalled,
    recovered,
    recoveredSuccessfully,
    errors,
    stallShot,
    recoveryShot,
    samples: verbose ? samples : samples.filter((sample, index) => (
      index === 0
        || index === samples.length - 1
        || sample.stall >= 0.24
        || (index > 0 && sample.phase !== samples[index - 1].phase)
    ))
  }, null, 2));
} finally {
  await page.keyboard.up("w").catch(() => {});
  await page.keyboard.up("s").catch(() => {});
  await page.keyboard.up("Shift").catch(() => {});
  await page.keyboard.up("Control").catch(() => {});
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
