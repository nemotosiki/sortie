#!/usr/bin/env node
import { chromium } from "playwright";

const baseUrl = process.env.SORTIE_BASE_URL || "http://127.0.0.1:8000";
const missionUrl = `${baseUrl}/index.html?payloads=payloads/map_amalPlain.payload.js,payloads/mission_sera_m02.payload.js`;

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=swiftshader", "--disable-gpu-sandbox", "--disable-dev-shm-usage"]
});

function compact(probe) {
  return {
    state: probe.state,
    waveNumber: probe.waveNumber,
    missionWaveIndex: probe.missionWaveIndex,
    outcomePending: probe.outcomePending,
    groundPhase: probe.activeGroundPhaseId,
    gate: probe.activeGate,
    red: probe.enemies.filter((enemy) => enemy.tgt).map((enemy) => ({
      id: enemy.id,
      type: enemy.type,
      ground: enemy.ground,
      mark: enemy.mark,
      facilityIndex: enemy.facilityIndex,
      strike: enemy.strike
    })),
    whiteCount: probe.enemies.filter((enemy) => !enemy.tgt).length,
    pendingGround: probe.pendingGroundUnits.length
  };
}

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(() => { navigator.getGamepads = () => []; });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto(missionUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(
    () => Boolean(window.__game?.forceStartMissionByKey && window.__game?.seraM02Probe),
    null,
    { timeout: 120_000 }
  );
  const started = await page.evaluate(() => window.__game.forceStartMissionByKey("m02", "f16"));
  if (!started) throw new Error("M02 did not start");
  await page.waitForTimeout(300);

  for (let step = 0; step < 6; step += 1) {
    const before = await page.evaluate(() => window.__game.seraM02Probe());
    console.log(`M02_PHASE_BEFORE_${step} ${JSON.stringify(compact(before))}`);
    if (before.outcomePending || before.activeGroundPhaseId) break;
    const advanced = await page.evaluate(() => window.__game.forceSeraM02AdvancePhase());
    console.log(`M02_PHASE_ADVANCE_${step} ${advanced}`);
    await page.waitForTimeout(120);
    const after = await page.evaluate(() => window.__game.seraM02Probe());
    console.log(`M02_PHASE_AFTER_${step} ${JSON.stringify(compact(after))}`);
    if (after.outcomePending || after.activeGroundPhaseId) break;
  }

  if (pageErrors.length || consoleErrors.length) {
    throw new Error(JSON.stringify({ pageErrors, consoleErrors }, null, 2));
  }
  await context.close();
} finally {
  await browser.close();
}
