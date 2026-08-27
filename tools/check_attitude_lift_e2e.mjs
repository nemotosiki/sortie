#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const candidates = [
  process.env.SORTIE_PLAYWRIGHT,
  "playwright",
  "C:/Users/user01/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright"
].filter(Boolean);
let playwright = null;
for (const candidate of candidates) {
  try { playwright = require(candidate); break; } catch { /* try next */ }
}
if (!playwright) throw new Error("check_attitude_lift_e2e: Playwright is unavailable");

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details === null ? "" : `\n${JSON.stringify(details, null, 2)}`;
  throw new Error(`check_attitude_lift_e2e: ${message}${suffix}`);
}

async function serve() {
  const mime = {
    ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
    ".json": "application/json", ".css": "text/css", ".png": "image/png",
    ".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg"
  };
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent((req.url || "/").split("?")[0]);
    const file = path.resolve(root, pathname === "/" ? "index.html" : `.${pathname}`);
    const relative = path.relative(root, file);
    if (relative.startsWith("..") || path.isAbsolute(relative)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, port: server.address().port };
}

const chrome = process.env.SORTIE_CHROME
  || "C:/Users/user01/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe";
const browser = await playwright.chromium.launch({
  headless: true,
  executablePath: fs.existsSync(chrome) ? chrome : undefined,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"]
});
const { server, port } = await serve();
const context = await browser.newContext({ viewport: { width: 960, height: 540 } });
const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];
page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

try {
  await page.goto(`http://127.0.0.1:${port}/index.html`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000
  });
  await page.waitForFunction(() => Boolean(
    window.__game?.forceStartMissionByKey
    && window.__game?.debug?.forceAttitude
    && window.__game?.debug?.forceResetAttitudeLift
    && window.__game?.debug?.forceFlightEnergy
    && window.__game?.debug?.forceFlightFrames
  ), null, { timeout: 120_000 });
  const started = await page.evaluate(() => window.__game.forceStartMissionByKey("sera-m04", "f16"));
  assert(started, "Sera M04 did not start through the production launcher");
  await page.keyboard.press("m");

  const results = await page.evaluate(() => {
    const debug = window.__game.debug;
    const run = (aircraft, bankDeg, seconds = 3) => {
      debug.forceLoadout(aircraft);
      debug.forceTeleport(0, 1800, 0);
      debug.forceResetAttitudeLift();
      debug.forceAttitude(0, 0, bankDeg);
      const before = debug.forceFlightFrames(0, 1 / 60).position.y;
      const result = debug.forceFlightFrames(Math.round(seconds * 60), 1 / 60);
      return {
        aircraft,
        bankDeg,
        drop: before - result.position.y,
        result,
        probe: debug.stabilityProbe()
      };
    };
    const ordinary = run("f16", 60);
    const knifeEdge = run("f16", 90);
    const f16 = run("f16", 180);
    const f22 = run("f22", 180);

    debug.forceLoadout("f16");
    debug.forceTeleport(0, 1800, 0);
    debug.forceResetAttitudeLift();
    debug.forceAttitude(0, 0, 180);
    const inverted = debug.forceFlightFrames(180, 1 / 60);
    debug.forceAttitude(0, 0, 0);
    const recovered = debug.forceFlightFrames(60, 1 / 60);

    // The old regression forced the jet above its ceiling and pinned severity.
    // That hid the production bug: at ordinary altitude automatic engine
    // recovery released the stall and rebuilt velocity from an upward nose.
    // Prime a real horizontal WORLD-space path first, then rotate only the body.
    const deepStall = (name, pitchDeg, bankDeg) => {
      debug.forceLoadout("f16");
      debug.forceTeleport(0, 2000, 0);
      debug.forceResetAttitudeLift();
      debug.forceAttitude(0, 0, 0);
      debug.forceFlightEnergy(70, 0);
      debug.forceFlightFrames(1, 1 / 60);
      const before = debug.forceFlightFrames(0, 1 / 60);
      debug.forceAttitude(0, pitchDeg, bankDeg);
      debug.forceFlightEnergy(70, 1);
      const first = debug.forceFlightFrames(1, 1 / 60);
      const samples = [before, first];
      for (let second = 0; second < 10; second += 1) {
        samples.push(debug.forceFlightFrames(60, 1 / 60));
      }
      const after = samples[samples.length - 1];
      return {
        name,
        firstDy: first.position.y - before.position.y,
        finalDy: after.position.y - before.position.y,
        minY: Math.min(...samples.map((sample) => sample.position.y)),
        maxY: Math.max(...samples.map((sample) => sample.position.y)),
        before,
        first,
        after
      };
    };
    const verticalStall = deepStall("nose-up", 90, 0);
    const knifeEdgeStall = deepStall("knife-edge", 0, 90);
    const invertedStall = deepStall("inverted", 0, 180);
    return {
      ordinary,
      knifeEdge,
      f16,
      f22,
      recovery: { inverted, recovered },
      verticalStall,
      knifeEdgeStall,
      invertedStall
    };
  });

  // The live RAF can finish one sub-frame around forceTeleport before the
  // synchronous production-step sample begins; 0.1m is still effectively zero
  // beside the 31m knife-edge/inverted cases this gate separates.
  assert(Math.abs(results.ordinary.drop) < 0.1,
    "ordinary 60-degree bank lost altitude", results.ordinary);
  assert(results.knifeEdge.drop > 27 && results.knifeEdge.drop < 31,
    "knife-edge did not lose altitude under WORLD gravity", results.knifeEdge);
  assert(results.f16.drop > 27 && results.f16.drop < 31,
    "F-16 inverted drop left the production tuning window", results.f16);
  assert(results.f22.drop > 13 && results.f22.drop < 16 && results.f22.drop < results.f16.drop,
    "F-22 STABILITY did not reduce, or wrongly removed, inverted drop", results.f22);
  assert(results.f16.probe.stability === 0.45 && results.f22.probe.stability === 1,
    "flight did not use the same STABILITY values as the hangar", results);
  assert(Math.abs(results.recovery.recovered.effectiveVerticalSpeed) <
      Math.abs(results.recovery.inverted.effectiveVerticalSpeed) * 0.25,
    "upright recovery did not arrest inverted sink", results.recovery);
  for (const sample of [results.verticalStall, results.knifeEdgeStall, results.invertedStall]) {
    assert(sample.firstDy <= 0.05,
      `${sample.name} body attitude manufactured upward inertia`, sample);
    assert(sample.finalDy < -120 && sample.after.velocity.y < -10,
      `${sample.name} stall did not produce a sustained WORLD-down fall`, sample);
    assert(sample.after.stallSeverity < 0.05,
      `${sample.name} stall could not recover after gaining dive airspeed`, sample);
  }
  assert(pageErrors.length === 0, "pageerror during attitude-lift check", pageErrors);
  assert(consoleErrors.length === 0, "console error during attitude-lift check", consoleErrors);

  console.log("check_attitude_lift_e2e: PASS");
  console.log(JSON.stringify({
    ordinaryDrop: results.ordinary.drop,
    knifeEdgeDrop: results.knifeEdge.drop,
    f16: { stability: results.f16.probe.stability, drop: results.f16.drop },
    f22: { stability: results.f22.probe.stability, drop: results.f22.drop },
    recoveryVerticalSpeed: results.recovery.recovered.effectiveVerticalSpeed,
    verticalStall: {
      firstDy: results.verticalStall.firstDy,
      finalDy: results.verticalStall.finalDy,
      minY: results.verticalStall.minY,
      finalVy: results.verticalStall.after.velocity.y
    },
    knifeEdgeFinalDy: results.knifeEdgeStall.finalDy,
    invertedFinalDy: results.invertedStall.finalDy
  }, null, 2));
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
