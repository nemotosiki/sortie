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
if (!playwright) throw new Error("check_missile_launch_phases_e2e: Playwright is unavailable");

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details === null ? "" : `\n${JSON.stringify(details, null, 2)}`;
  throw new Error(`check_missile_launch_phases_e2e: ${message}${suffix}`);
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
    && window.__game?.debug?.forceTeleport
    && window.__game?.debug?.forceEnemyMissileReady
    && window.__game?.threats?.incomingMissiles
  ), null, { timeout: 120_000 });

  const started = await page.evaluate(() => window.__game.forceStartMissionByKey("sera-m04", "f16"));
  assert(started, "Sera M04 did not start through the production launcher");
  await page.waitForFunction(() => document.body.dataset.gameState === "playing", null, { timeout: 15_000 });

  const engagement = await page.evaluate(() => {
    const ship = window.__game.enemies
      .filter((enemy) => enemy.alive && enemy.type === "aegis")
      .sort((a, b) => a.missileReadyIn - b.missileReadyIn)[0];
    if (!ship) return null;
    const teleported = window.__game.debug.forceTeleport(
      ship.position.x - 1200,
      Math.max(700, ship.position.y + 690),
      ship.position.z
    );
    const cooldownAdvanced = window.__game.debug.forceEnemyMissileReady(ship.id);
    return {
      shipId: ship.id,
      position: ship.position,
      initialCooldown: ship.missileReadyIn,
      teleported,
      cooldownAdvanced
    };
  });
  assert(engagement?.teleported && engagement?.cooldownAdvanced,
    "Aegis runtime engagement could not be prepared", engagement);

  const trace = await page.evaluate(async ({ shipId }) => {
    const deadline = performance.now() + 45_000;
    let missileId = null;
    const samples = [];
    const firstByPhase = {};
    const phaseOrder = [];
    while (performance.now() < deadline) {
      const ship = window.__game.enemies.find((enemy) => enemy.id === shipId && enemy.alive);
      if (missileId === null && ship) {
        // Hold the target in the missile envelope but above the ship's gun
        // envelope while the unmodified cooldown/lock/fire-delay chain runs.
        window.__game.debug.forceTeleport(
          ship.position.x - 1200,
          Math.max(700, ship.position.y + 690),
          ship.position.z
        );
        window.__game.debug.forceSetHealth(100);
      }
      const incoming = window.__game.threats.incomingMissiles;
      let missile = missileId === null
        ? incoming.find((entry) => entry.ownerId === shipId && entry.ownerType === "aegis")
        : incoming.find((entry) => entry.id === missileId);
      if (missile && missileId === null) missileId = missile.id;
      if (missile) {
        const sample = {
          id: missile.id,
          phase: missile.launchPhase,
          age: Number(missile.launchPhaseAge.toFixed(4)),
          y: Number(missile.position.y.toFixed(3)),
          speed: Number(missile.speed.toFixed(3)),
          captureAngleDeg: Number(missile.launchCaptureAngleDeg.toFixed(3)),
          closingSpeed: Number(missile.launchClosingSpeed.toFixed(3)),
          clearance: Number(missile.clearance.toFixed(3))
        };
        samples.push(sample);
        if (!(sample.phase in firstByPhase)) {
          firstByPhase[sample.phase] = sample;
          phaseOrder.push(sample.phase);
        }
        if (sample.phase === "homing" && sample.age >= 0.04) break;
      }
      await new Promise((resolve) => setTimeout(resolve, missileId === null ? 50 : 12));
    }
    return { missileId, phaseOrder, firstByPhase, samples };
  }, { shipId: engagement.shipId });

  assert(trace.missileId !== null, "Aegis did not fire after cooldown, lock dwell and fire delay", {
    engagement,
    enemies: await page.evaluate(() => window.__game.enemies.filter((enemy) => enemy.type === "aegis"))
  });
  const expected = ["vls-eject", "vls-capture", "vls-blend", "homing"];
  let cursor = -1;
  for (const phase of expected) {
    const next = trace.phaseOrder.indexOf(phase);
    assert(next > cursor, `runtime trace did not enter ${phase} in order`, trace);
    cursor = next;
  }
  const ejectSamples = trace.samples.filter((sample) => sample.phase === "vls-eject");
  assert(ejectSamples.length >= 2, "runtime trace did not sample the VLS eject hold", trace);
  assert(Math.max(...ejectSamples.map((sample) => sample.y)) > Math.min(...ejectSamples.map((sample) => sample.y)) + 1,
    "VLS round did not rise while steering was held during eject", ejectSamples);
  assert(trace.samples.every((sample) => sample.clearance > 0),
    "VLS round touched the sea during launch phases", trace.samples);
  assert(pageErrors.length === 0, "pageerror during runtime VLS check", pageErrors);
  assert(consoleErrors.length === 0, "console error during runtime VLS check", consoleErrors);

  const compactTrace = expected.map((phase) => trace.firstByPhase[phase]);
  console.log("check_missile_launch_phases_e2e: PASS");
  console.log(JSON.stringify({ engagement, phaseOrder: trace.phaseOrder, firstByPhase: compactTrace }, null, 2));
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
