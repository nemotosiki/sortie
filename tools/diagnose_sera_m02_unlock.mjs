#!/usr/bin/env node
import { chromium } from "playwright";

const baseUrl = process.env.SORTIE_BASE_URL || "http://127.0.0.1:8000";
const url = `${baseUrl}/index.html?payloads=payloads/map_amalPlain.payload.js,payloads/mission_sera_m02.payload.js`;

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=swiftshader", "--disable-gpu-sandbox", "--disable-dev-shm-usage"]
});

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(() => {
    navigator.getGamepads = () => [];
    const records = JSON.parse(localStorage.getItem("sortieMissionRecords") || "{}");
    records.m01 = records.m01 || { cleared: true, rank: "A", scores: [0], times: [0] };
    localStorage.setItem("sortieMissionRecords", JSON.stringify(records));
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error?.stack || error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(
    () => Boolean(window.__game?.forceStartMissionByKey && window.__game?.forceSeraM02Complete),
    null,
    { timeout: 120_000 }
  );
  const started = await page.evaluate(() => window.__game.forceStartMissionByKey("m02", "f16"));
  if (!started) throw new Error("M02 did not start");
  await page.waitForTimeout(250);
  const completed = await page.evaluate(() => window.__game.forceSeraM02Complete());
  if (!completed) throw new Error(`M02 did not enter outcome hold: ${JSON.stringify(await page.evaluate(() => window.__game.seraM02Probe()))}`);
  const resolved = await page.evaluate(() => window.__game.forceSeraM02ResolveOutcome());
  if (!resolved) throw new Error("M02 outcome did not resolve");
  await page.waitForFunction(() => document.body.dataset.gameState === "missionComplete", null, { timeout: 5000 });

  const afterResult = await page.evaluate(() => ({
    state: document.body.dataset.gameState,
    records: JSON.parse(localStorage.getItem("sortieMissionRecords") || "{}"),
    gameKeys: Object.keys(window.__game || {}).sort(),
    debugKeys: Object.keys(window.__game?.debug || {}).sort(),
    missionTable: Array.isArray(window.__game?.missionTable)
      ? window.__game.missionTable.map((mission, index) => ({
          index,
          key: mission.key,
          campaign: mission.campaign,
          title: mission.title
        }))
      : null
  }));
  console.log(`M02_UNLOCK_AFTER_RESULT ${JSON.stringify(afterResult)}`);

  await page.evaluate(() => document.getElementById("changeMissionBtn")?.click());
  await page.waitForFunction(() => document.body.dataset.gameState === "missionSelect", null, { timeout: 10_000 });

  const unlock = await page.evaluate(() => {
    const debug = window.__game.debug;
    const keys = ["m01", "m02", "m03", "m04", "m05"];
    const indices = Object.fromEntries(keys.map((key) => [key, debug.missionIndexOf(key)]));
    const selected = indices.m03 >= 0 && debug.forceMissionCursor(indices.m03);
    const confirmed = selected && debug.forceConfirmMission();
    return {
      state: document.body.dataset.gameState,
      records: JSON.parse(localStorage.getItem("sortieMissionRecords") || "{}"),
      indices,
      selected,
      confirmed,
      missionTable: Array.isArray(window.__game?.missionTable)
        ? window.__game.missionTable.map((mission, index) => ({
            index,
            key: mission.key,
            campaign: mission.campaign,
            title: mission.title
          }))
        : null
    };
  });
  console.log(`M02_UNLOCK_SELECTION ${JSON.stringify(unlock)}`);

  if (errors.length) throw new Error(JSON.stringify(errors, null, 2));
  await context.close();
} finally {
  await browser.close();
}
