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
if (!playwright) throw new Error("check_ground_missile_guidance_e2e: Playwright is unavailable");

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details === null ? "" : `\n${JSON.stringify(details, null, 2)}`;
  throw new Error(`check_ground_missile_guidance_e2e: ${message}${suffix}`);
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

async function runWeapon(aircraft, weapon, missionKey = "sera-m05", geometry = {}) {
  const context = await browser.newContext({ viewport: { width: 960, height: 540 } });
  await context.addInitScript(() => {
    window.localStorage.setItem("sortieHangarPurchases", JSON.stringify({
      schemaVersion: 2,
      campaigns: { usa: [], rus: [], sera: ["a10"] }
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
    await page.goto(`http://127.0.0.1:${port}/index.html`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000
    });
    await page.waitForFunction(() => Boolean(
      window.__game?.forceStartMissionByKey
      && window.__game?.debug?.forceFireWeapon
      && window.__game?.debug?.missileProbe
    ), null, { timeout: 120_000 });
    const start = await page.evaluate((id) => ({
      started: window.__game.forceStartMissionByKey(id.missionKey, id.aircraft),
      state: window.__game.state,
      missions: window.__game.missionTable?.map((entry) => entry.key) || [],
      aircraft: window.__game.aircraft || null
    }), { aircraft, missionKey });
    assert(start.started, `${missionKey} did not start with ${aircraft}`, start);
    if (missionKey === "sera-m02") {
      const activated = await page.evaluate(() => window.__game.forceSeraM02ActivateGround());
      assert(activated, "Sera M02 ground phase did not activate");
    }
    await page.keyboard.press("m");

    const setup = await page.evaluate((launchConfig) => {
      const selectedWeapon = launchConfig.selectedWeapon;
      const geometry = launchConfig;
      const target = window.__game.enemies.find((entry) => entry.alive && entry.ground && !entry.subsystem);
      if (!target) return null;
      const standoff = Number(geometry.standoff) || (selectedWeapon === "spw" ? 1500 : 900);
      const launchHeight = Number(geometry.launchHeight) || (selectedWeapon === "spw" ? 120 : 80);
      const lateralOffset = Number(geometry.lateralOffset) || 0;
      const launch = {
        x: target.position.x + lateralOffset,
        y: target.position.y + launchHeight,
        z: target.position.z + standoff
      };
      const dx = target.position.x - launch.x;
      const dy = target.position.y - launch.y;
      const dz = target.position.z - launch.z;
      const horizontal = Math.hypot(dx, dz);
      const yaw = Math.atan2(dx, -dz) * 180 / Math.PI;
      const pitch = Math.atan2(dy, horizontal) * 180 / Math.PI;
      window.__game.debug.forceTeleport(launch.x, launch.y, launch.z);
      window.__game.debug.forceAttitude(yaw, pitch, 0);
      window.__game.debug.forceSelectWeapon(selectedWeapon);
      window.__groundGuidanceAim = window.setInterval(() => {
        const liveTarget = window.__game.enemies.find((entry) => entry.id === target.id && entry.alive);
        if (!liveTarget) return;
        const player = window.__game.player.position;
        const liveDx = liveTarget.position.x - player.x;
        const liveDy = liveTarget.position.y - player.y;
        const liveDz = liveTarget.position.z - player.z;
        window.__game.debug.forceAttitude(
          Math.atan2(liveDx, -liveDz) * 180 / Math.PI,
          Math.atan2(liveDy, Math.hypot(liveDx, liveDz)) * 180 / Math.PI,
          0
        );
      }, 16);
      return { targetId: target.id, hp: target.hp, launch, yaw, pitch };
    }, { selectedWeapon: weapon, ...geometry });
    assert(setup, "M05 exposed no ground target");

    try {
      await page.waitForFunction(() => window.__game.lock.locked, null, { timeout: 15_000 });
    } catch {
      const lockFailure = await page.evaluate(() => ({
        lock: window.__game.debug.lockProbe(),
        player: window.__game.player,
        weapon: window.__game.loadout,
        nearby: window.__game.enemies.filter((entry) => entry.alive && entry.ground).slice(0, 8)
      }));
      assert(false, `${weapon} did not complete a ground lock`, { setup, lockFailure });
    }
    await page.evaluate(() => {
      window.clearInterval(window.__groundGuidanceAim);
      delete window.__groundGuidanceAim;
    });
    // Multi-lock salvos acquire in parallel with the primary solution, but the
    // hook updates on the following RAF. Give that latch one frame to publish.
    await page.waitForTimeout(100);
    const fired = await page.evaluate((selectedWeapon) => selectedWeapon === "spw"
      ? window.__game.debug.forceFireSpw()
      : { fired: window.__game.debug.forceFireWeapon() ? 1 : 0 }, weapon);
    assert(fired.fired > 0, `${weapon} launcher reported no round away`, { setup, fired });

    const initialRounds = await page.evaluate(() => window.__game.debug.missileProbe());
    const targetIds = [...new Set(initialRounds.map((entry) => entry.targetId).filter((id) => id !== null))];
    assert(targetIds.length > 0, `${weapon} left the rail unguided`, { setup, fired, initialRounds });
    const before = await page.evaluate((ids) => Object.fromEntries(
      window.__game.enemies.filter((entry) => ids.includes(entry.id)).map((entry) => [entry.id, entry.hp])
    ), targetIds);

    const trace = [];
    const hitIds = new Set();
    for (let sample = 0; sample < 140; sample += 1) {
      await page.waitForTimeout(100);
      const state = await page.evaluate((ids) => ({
        rounds: window.__game.debug.missileProbe(),
        hp: Object.fromEntries(
          window.__game.enemies.filter((entry) => ids.includes(entry.id)).map((entry) => [entry.id, entry.hp])
        )
      }), targetIds);
      trace.push(state.rounds.map((round) => ({
        targetId: round.targetId,
        life: Number(round.life.toFixed(2)),
        range: round.range === null ? null : Number(round.range.toFixed(1)),
        x: round.x,
        y: round.y,
        z: round.z,
        speed: Number(round.speed.toFixed(1)),
        diving: round.diving,
        phase: round.launchPhase
      })));
      for (const id of targetIds) {
        if (state.hp[id] === undefined || state.hp[id] < before[id]) hitIds.add(id);
      }
      if (hitIds.size === targetIds.length || state.rounds.length === 0) break;
    }
    const after = await page.evaluate((ids) => Object.fromEntries(
      window.__game.enemies.filter((entry) => ids.includes(entry.id)).map((entry) => [entry.id, entry.hp])
    ), targetIds);
    return {
      aircraft,
      weapon,
      setup,
      fired,
      targetIds,
      before,
      after,
      hit: hitIds.size === targetIds.length,
      hitIds: [...hitIds],
      lastTrace: trace.slice(-8),
      pageErrors,
      consoleErrors
    };
  } finally {
    await context.close();
  }
}

try {
  const agm4 = await runWeapon("a10", "spw");
  const standard = await runWeapon("f16", "msl");
  const movingAgm4 = await runWeapon("a10", "spw", "sera-m02");
  const movingStandard = await runWeapon("f16", "msl", "sera-m02");
  const m09Agm4 = await runWeapon("a10", "spw", "sera-m09");
  const m09Standard = await runWeapon("f16", "msl", "sera-m09");
  const crossingAgm4 = await runWeapon("a10", "spw", "sera-m05", {
    standoff: 900,
    launchHeight: 120,
    lateralOffset: 700
  });
  const crossingStandard = await runWeapon("f16", "msl", "sera-m05", {
    standoff: 700,
    launchHeight: 80,
    lateralOffset: 500
  });
  assert(agm4.hit, "4AGM did not guide into any locked ground target", agm4);
  assert(standard.hit, "standard missile did not guide into its locked ground target", standard);
  assert(movingAgm4.hit, "4AGM did not guide into the moving M02 ground targets", movingAgm4);
  assert(movingStandard.hit, "standard missile did not guide into the moving M02 ground target", movingStandard);
  assert(m09Agm4.hit, "4AGM did not guide into the M09 ground targets", m09Agm4);
  assert(m09Standard.hit, "standard missile did not guide into the M09 ground target", m09Standard);
  assert(crossingAgm4.hit, "4AGM did not guide from an offset approach", crossingAgm4);
  assert(crossingStandard.hit, "standard missile did not guide from an offset approach", crossingStandard);
  const browserRuns = [
    agm4,
    standard,
    movingAgm4,
    movingStandard,
    m09Agm4,
    m09Standard,
    crossingAgm4,
    crossingStandard
  ];
  for (const run of browserRuns) {
    assert(run.pageErrors.length === 0 && run.consoleErrors.length === 0,
      `browser errors during ${run.aircraft}/${run.weapon} run`, run);
  }
  console.log("check_ground_missile_guidance_e2e: PASS");
  console.log(JSON.stringify({
    agm4: { fired: agm4.fired.fired, targets: agm4.targetIds, before: agm4.before, after: agm4.after },
    standard: { fired: standard.fired.fired, targets: standard.targetIds, before: standard.before, after: standard.after },
    movingAgm4: { fired: movingAgm4.fired.fired, targets: movingAgm4.targetIds, before: movingAgm4.before, after: movingAgm4.after },
    movingStandard: { fired: movingStandard.fired.fired, targets: movingStandard.targetIds, before: movingStandard.before, after: movingStandard.after },
    m09Agm4: { fired: m09Agm4.fired.fired, targets: m09Agm4.targetIds, before: m09Agm4.before, after: m09Agm4.after },
    m09Standard: { fired: m09Standard.fired.fired, targets: m09Standard.targetIds, before: m09Standard.before, after: m09Standard.after },
    crossingAgm4: { fired: crossingAgm4.fired.fired, targets: crossingAgm4.targetIds, before: crossingAgm4.before, after: crossingAgm4.after },
    crossingStandard: { fired: crossingStandard.fired.fired, targets: crossingStandard.targetIds, before: crossingStandard.before, after: crossingStandard.after }
  }, null, 2));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
