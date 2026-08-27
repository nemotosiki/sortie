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
if (!playwright) throw new Error("check_enemy_flight_envelope_e2e: Playwright is unavailable");

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details === null ? "" : `\n${JSON.stringify(details, null, 2)}`;
  throw new Error(`check_enemy_flight_envelope_e2e: ${message}${suffix}`);
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
    && window.__game?.debug?.forceEnemyFlightFrames
    && window.__game?.debug?.enemyFlightProbe
  ), null, { timeout: 120_000 });
  const started = await page.evaluate(() => window.__game.forceStartMissionByKey("sera-m01", "f16"));
  assert(started, "Sera M01 did not start through the production launcher");
  await page.keyboard.press("m");

  const results = await page.evaluate(() => {
    const debug = window.__game.debug;
    const initial = debug.enemyFlightProbe()[0];
    if (!initial) return { error: "no fixed-wing enemy" };
    const id = initial.id;
    const spec = initial;
    const resetState = (speed) => {
      debug.forceConfigureEnemyFlight(id, { speed, offsetY: 500, offsetZ: -400 });
    };
    const sample = (speed) => {
      resetState(speed);
      debug.forceEnemyFlightFrames(1, 1 / 60);
      return debug.enemyFlightProbe(id)[0];
    };

    const high = sample(spec.maxSpeed);
    const cruise = sample(spec.cruiseSpeed);
    const cornerSpeed = spec.stallEntrySpeed * Math.sqrt(spec.structuralG);
    const corner = sample(cornerSpeed);

    debug.forceConfigureEnemyFlight(id, {
      speed: spec.cruiseSpeed,
      altitude: 9144,
      offsetZ: -400
    });
    debug.forceEnemyFlightFrames(1, 1 / 60);
    const highAltitude = debug.enemyFlightProbe(id)[0];

    resetState(spec.stallEntrySpeed * 0.55);
    let peakStall = null;
    for (let frame = 0; frame < 90; frame += 1) {
      // Hold the article below entry long enough to prove the constraint; the
      // AI itself correctly opens the throttle almost immediately.
      debug.forceEnemySpeed(id, spec.stallEntrySpeed * 0.55);
      debug.forceEnemyFlightFrames(1, 1 / 60);
      const probe = debug.enemyFlightProbe(id)[0];
      if (!peakStall || probe.stallSeverity > peakStall.stallSeverity) peakStall = probe;
    }
    // Recovery now follows real WORLD velocity rather than the engine-command
    // scalar. Give the aircraft time to lower its nose, accelerate through the
    // descending flight path and then shed the stall hysteresis.
    for (let frame = 0; frame < 480; frame += 1) {
      debug.forceEnemyFlightFrames(1, 1 / 60);
    }
    const recovered = debug.enemyFlightProbe(id)[0];

    debug.forceConfigureEnemyFlight(id, {
      speed: spec.cruiseSpeed,
      offsetY: 1600,
      offsetZ: -400
    });
    const beforeY = debug.enemyFlightProbe(id)[0].position[1];
    for (let frame = 0; frame < 180; frame += 1) {
      // Keep the test article inverted while the production AI, stall and
      // translation steps run. The helper preserves accumulated lift state.
      debug.forceEnemyAttitude(id, 0, 0, 180, false);
      debug.forceEnemyFlightFrames(1, 1 / 60);
    }
    const inverted = debug.enemyFlightProbe(id)[0];
    inverted.drop = beforeY - inverted.position[1];

    debug.forceConfigureEnemyFlight(id, {
      speed: spec.cruiseSpeed,
      offsetY: 1600,
      offsetZ: -400
    });
    const knifeEdgeBeforeY = debug.enemyFlightProbe(id)[0].position[1];
    for (let frame = 0; frame < 180; frame += 1) {
      debug.forceEnemyAttitude(id, 0, 0, 90, false);
      debug.forceEnemyFlightFrames(1, 1 / 60);
    }
    const knifeEdge = debug.enemyFlightProbe(id)[0];
    knifeEdge.drop = knifeEdgeBeforeY - knifeEdge.position[1];

    return {
      id,
      type: initial.type,
      high,
      cruise,
      corner,
      highAltitude,
      cornerSpeed,
      peakStall,
      recovered,
      inverted,
      knifeEdge
    };
  });

  assert(!results.error, "mission did not expose a fixed-wing test article", results);
  assert(results.high.turnEnvelopeGain < results.cruise.turnEnvelopeGain,
    "production AI did not lose turn authority at maximum speed", results);
  assert(results.corner.turnEnvelopeGain > results.cruise.turnEnvelopeGain,
    "production AI did not gain high-G authority near corner speed", results);
  assert(results.highAltitude.highAltitude.stallSpeedMultiplier > 1.62 &&
      results.highAltitude.highAltitude.turnAuthority < 0.73,
    "production AI did not receive the 30,000 ft thin-air envelope", results.highAltitude);
  assert(results.peakStall.stalling && results.peakStall.stallSeverity > 0.24,
    "production AI never entered a forced low-speed stall", results.peakStall);
  assert(results.recovered.speed > results.peakStall.speed &&
      results.recovered.stallSeverity < results.peakStall.stallSeverity,
    "production AI did not accelerate and recover after the stall", results);
  assert(results.inverted.drop > 8 && results.inverted.attitudeLiftLoss > 0.9,
    "production enemy translation ignored sustained inverted lift loss", results.inverted);
  assert(results.knifeEdge.drop > 8 && results.knifeEdge.attitudeLiftLoss > 0.9,
    "production enemy translation ignored knife-edge WORLD gravity", results.knifeEdge);
  assert(pageErrors.length === 0, "pageerror during enemy flight check", pageErrors);
  assert(consoleErrors.length === 0, "console error during enemy flight check", consoleErrors);

  console.log("check_enemy_flight_envelope_e2e: PASS");
  console.log(JSON.stringify({
    aircraft: results.type,
    turnGain: {
      high: results.high.turnEnvelopeGain,
      cruise: results.cruise.turnEnvelopeGain,
      corner: results.corner.turnEnvelopeGain
    },
    highAltitude: results.highAltitude.highAltitude,
    peakStall: {
      speed: results.peakStall.speed,
      severity: results.peakStall.stallSeverity,
      authority: results.peakStall.controlAuthority
    },
    recovered: {
      speed: results.recovered.speed,
      severity: results.recovered.stallSeverity
    },
    invertedDrop: results.inverted.drop,
    knifeEdgeDrop: results.knifeEdge.drop
  }, null, 2));
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
