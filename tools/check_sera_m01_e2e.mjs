#!/usr/bin/env node
import { chromium } from "playwright";

const baseUrl = process.env.SORTIE_BASE_URL || "http://127.0.0.1:8000";
const missionUrl = `${baseUrl}/index.html?payloads=payloads/map_renBay.payload.js,payloads/mission_sera_m01.payload.js`;

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details === null ? "" : `\n${JSON.stringify(details, null, 2)}`;
  throw new Error(`check_sera_m01_e2e: ${message}${suffix}`);
}

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=swiftshader", "--disable-gpu-sandbox", "--disable-dev-shm-usage"]
});

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  async function boot() {
    await page.goto(missionUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForFunction(
      () => Boolean(window.__game && window.__game.forceStartMissionByKey && window.__game.seraM01Probe),
      null,
      { timeout: 120_000 }
    );
    const payloads = await page.evaluate(() => window.__APPLIED_PAYLOADS__ || []);
    assert(payloads.includes("map_renBay"), "Ren Bay payload did not load", payloads);
    assert(payloads.includes("mission_sera_m01"), "M01 payload did not load", payloads);
    const started = await page.evaluate(() => window.__game.forceStartMissionByKey("m01", "f16"));
    assert(started, "debug launch did not enter M01");
    await page.waitForFunction(
      () => document.body.dataset.gameState === "playing",
      null,
      { timeout: 30_000 }
    );
    await page.waitForTimeout(300);
  }

  await boot();
  let probe = await page.evaluate(() => window.__game.seraM01Probe());
  assert(probe.missionKey === "m01", "wrong mission booted", probe);
  assert(probe.worldKey === "renBay", "M01 did not use Ren Bay", probe);

  const wingmen = probe.friendlies.filter((friendly) => friendly.kind === "wingman");
  assert(wingmen.length === 2, "M01 did not field two ROOK wingmen", wingmen);
  assert(wingmen.some((wingman) => wingman.label === "ROOK 1 CROWN" && wingman.radioSpeaker === "crown"),
    "CROWN was not fielded with his own radio identity", wingmen);
  assert(wingmen.some((wingman) => wingman.label === "ROOK 3 LARK" && wingman.radioSpeaker === "lark"),
    "LARK was not fielded with her own radio identity", wingmen);
  const separation = Math.hypot(
    wingmen[0].position[0] - wingmen[1].position[0],
    wingmen[0].position[1] - wingmen[1].position[1],
    wingmen[0].position[2] - wingmen[1].position[2]
  );
  assert(separation > 120, "CROWN and LARK spawned in the same formation slot", { separation, wingmen });

  assert(probe.activeGate?.timeout === 75, "opening clear-or-timeout gate is not active", probe.activeGate);
  assert(probe.enemies.length === 2, "opening phase did not contain exactly two contacts", probe.enemies);
  assert(probe.enemies.every((enemy) => enemy.type === "mig29"), "opening contacts were not MiG-29s", probe.enemies);
  assert(probe.enemies.every((enemy) => enemy.tgt === false && enemy.disposition === "HOSTILE_OPTIONAL"),
    "opening contacts were not white optional hostiles", probe.enemies);
  assert(probe.enemies.every((enemy) => Math.abs(enemy.position[0] - 8200) < 1800),
    "opening contacts ignored the authored east-southeast approach", probe.enemies);

  let perfect = await page.evaluate(() => window.__game.seraM01PerfectRankPreview());
  assert(perfect === "S", "a clean M01 was not S-capable", perfect);

  const advanced = await page.evaluate(() => window.__game.forceSeraM01AdvancePhase());
  assert(advanced, "opening phase could not advance on timeout");
  await page.waitForTimeout(300);
  probe = await page.evaluate(() => window.__game.seraM01Probe());
  const firstBombers = probe.enemies.filter((enemy) => enemy.type === "tu22m3" && enemy.tgt);
  assert(firstBombers.length === 2, "first red bomber pair did not spawn", probe.enemies);
  assert(firstBombers.every((enemy) => enemy.disposition === "TGT" && enemy.strike),
    "first bomber pair was not red TGT strike traffic", firstBombers);
  assert(probe.enemies.filter((enemy) => !enemy.tgt).length === 4,
    "tutorial survivors plus first escorts did not remain white", probe.enemies);
  perfect = await page.evaluate(() => window.__game.seraM01PerfectRankPreview());
  assert(perfect === "S", "clean defence lost S after the first bomber group", perfect);

  const terminalOnFirst = await page.evaluate(() => window.__game.forceSeraM01Breach());
  assert(terminalOnFirst === false, "one bomber breach ended M01");
  await page.waitForTimeout(250);
  probe = await page.evaluate(() => window.__game.seraM01Probe());
  assert(probe.state === "playing" && probe.base?.hits === 1,
    "one breach did not continue with one recorded hit", probe);
  perfect = await page.evaluate(() => window.__game.seraM01PerfectRankPreview());
  assert(perfect === "A", "one breach did not cap a perfect score at A", perfect);

  const terminalOnSecond = await page.evaluate(() => window.__game.forceSeraM01Breach());
  assert(terminalOnSecond === true, "two bomber breaches did not end M01");
  await page.waitForFunction(
    () => document.body.dataset.gameState === "gameover",
    null,
    { timeout: 10_000 }
  );
  await page.waitForTimeout(1600);
  probe = await page.evaluate(() => window.__game.seraM01Probe());
  assert(probe.base?.hits === 2, "second breach was not recorded", probe);
  assert(probe.radio.speaker === "MERIDIAN", "breach failure was not called by MERIDIAN", probe.radio);
  assert(probe.radio.text.includes("爆撃機2機") || probe.radio.text.includes("防空任務を中止"),
    "M01 breach failure line did not play", probe.radio);

  // A fresh sortie proves the other terminal path: red TGTs alone are enough,
  // white contacts may survive, and MERIDIAN owns the successful return call.
  await boot();
  const completed = await page.evaluate(() => window.__game.forceSeraM01Complete());
  assert(completed, "forced clean clear did not reach the accomplished hold");
  await page.waitForTimeout(1400);
  probe = await page.evaluate(() => window.__game.seraM01Probe());
  assert(probe.outcomePending === true, "clean clear did not enter the accomplished hold", probe);
  assert(probe.enemies.some((enemy) => enemy.tgt === false),
    "clean clear incorrectly required every white hostile to be destroyed", probe.enemies);
  assert(probe.radio.speaker === "MERIDIAN", "success was not called by MERIDIAN", probe.radio);
  assert(probe.radio.text.includes("レン湾上空クリア") || probe.radio.text.includes("帰投せよ"),
    "M01 success line did not play", probe.radio);
  await page.waitForFunction(
    () => document.body.dataset.gameState === "missionComplete",
    null,
    { timeout: 10_000 }
  );

  assert(pageErrors.length === 0, "pageerror occurred", pageErrors);
  assert(consoleErrors.length === 0, "console error occurred", consoleErrors);
  console.log("check_sera_m01_e2e: PASS");
  console.log("  Ren Bay / two ROOK wingmen / white tutorial / red bomber phases");
  console.log("  one breach=A cap / two breaches=FAILED / white survivors allowed on clear");
} finally {
  await browser.close();
}
