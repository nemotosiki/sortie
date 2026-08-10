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
  await context.addInitScript(() => { navigator.getGamepads = () => []; });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  async function waitForState(expected, timeout = 30_000) {
    await page.waitForFunction(
      (state) => document.body.dataset.gameState === state,
      expected,
      { timeout }
    );
  }

  async function waitForRadioLine(fragments, timeout = 15_000) {
    const expected = Array.isArray(fragments) ? fragments : [fragments];
    await page.waitForFunction(
      (needles) => {
        const fullText = window.__game?.debug?.radioProbe?.()?.fullText || "";
        return needles.some((needle) => fullText.includes(needle));
      },
      expected,
      { timeout }
    );
  }

  async function advanceBriefingToHangar() {
    await waitForState("briefing");
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const state = await page.evaluate(() => document.body.dataset.gameState);
      if (state === "ready") return;
      await page.click("#briefingNextBtn");
      await page.waitForTimeout(120);
    }
    await waitForState("ready");
  }

  async function startCurrentSortie() {
    const selected = await page.evaluate(() => window.__game.debug.forceSelectAircraft("f16"));
    assert(selected, "F-16C could not be selected in the hangar");
    await page.click("#startBtn");
    await waitForState("playing");
    await page.waitForTimeout(300);
  }

  async function retryCurrentMission() {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const state = await page.evaluate(() => document.body.dataset.gameState);
      if (state === "playing") return;
      await page.click("#retryBtn");
      await page.waitForTimeout(180);
    }
    await waitForState("playing", 10_000);
  }

  await page.goto(missionUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(
    () => Boolean(
      window.__game
      && window.__game.debug?.forceCampaignCursor
      && window.__game.seraM01Probe
    ),
    null,
    { timeout: 120_000 }
  );

  const payloads = await page.evaluate(() => window.__APPLIED_PAYLOADS__ || []);
  const hasPayload = (inlineId, filePath) => payloads.includes(inlineId) || payloads.includes(filePath);
  assert(hasPayload("map_renBay", "payloads/map_renBay.payload.js"),
    "Ren Bay payload did not load", payloads);
  assert(hasPayload("mission_sera_m01", "payloads/mission_sera_m01.payload.js"),
    "M01 payload did not load", payloads);

  // Exercise the real campaign -> mission -> briefing -> hangar -> launch flow,
  // rather than jumping directly into startMission().
  const routed = await page.evaluate(() => {
    const debug = window.__game.debug;
    const campaignSelected = debug.forceCampaignCursor("usa");
    const campaignConfirmed = campaignSelected && debug.forceConfirmCampaign();
    const m01Index = debug.missionIndexOf("m01");
    const missionSelected = campaignConfirmed && m01Index >= 0 && debug.forceMissionCursor(m01Index);
    const missionConfirmed = missionSelected && debug.forceConfirmMission();
    return {
      campaignSelected,
      campaignConfirmed,
      m01Index,
      missionSelected,
      missionConfirmed,
      state: document.body.dataset.gameState
    };
  });
  assert(routed.campaignSelected && routed.campaignConfirmed, "USA campaign could not be opened", routed);
  assert(routed.m01Index >= 0 && routed.missionSelected && routed.missionConfirmed,
    "M01 could not be selected through the mission screen", routed);

  await advanceBriefingToHangar();
  await startCurrentSortie();

  let probe = await page.evaluate(() => window.__game.seraM01Probe());
  assert(probe.missionKey === "m01", "wrong mission booted", probe);
  assert(probe.worldKey === "renBay", "M01 did not use Ren Bay", probe);

  const wingmen = probe.friendlies.filter((friendly) => friendly.kind === "wingman");
  assert(wingmen.length === 2, "M01 did not field two ROOK wingmen", wingmen);
  const crown = wingmen.find((wingman) => wingman.label === "ROOK 1 CROWN");
  const lark = wingmen.find((wingman) => wingman.label === "ROOK 3 LARK");
  assert(crown?.radioSpeaker === "crown", "CROWN was not fielded with his own radio identity", wingmen);
  assert(lark?.radioSpeaker === "lark", "LARK was not fielded with her own radio identity", wingmen);
  assert(crown?.type === "f15c", "M01 CROWN did not spawn in the canonical F-15C", wingmen);
  assert(lark?.type === "f16", "M01 LARK did not spawn in the canonical F-16C", wingmen);
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
  assert(perfect !== "S", "one breach did not remove S eligibility", perfect);

  const checkpointBeforeFailure = await page.evaluate(() => window.__game.debug.checkpointProbe());
  const terminalOnSecond = await page.evaluate(() => window.__game.forceSeraM01Breach());
  assert(terminalOnSecond === true, "two bomber breaches did not end M01");
  await waitForState("gameover", 10_000);
  await waitForRadioLine(["爆撃機2機", "防空任務を中止"]);
  probe = await page.evaluate(() => window.__game.seraM01Probe());
  const failureRadio = await page.evaluate(() => window.__game.debug.radioProbe());
  assert(probe.base?.hits === 2, "second breach was not recorded", probe);
  assert(probe.radio.speaker === "MERIDIAN", "breach failure was not called by MERIDIAN", probe.radio);
  assert(
    failureRadio.fullText.includes("爆撃機2機") || failureRadio.fullText.includes("防空任務を中止"),
    "M01 breach failure line did not activate",
    failureRadio
  );

  // Retry through the real result button. A mission with a banked checkpoint
  // resumes there; a mission without one restarts at the opening pair. Both
  // paths must clear the breach count and preserve the canonical ROOK aircraft.
  await retryCurrentMission();
  await page.waitForFunction(
    () => {
      const state = window.__game?.seraM01Probe?.();
      return Boolean(state && (state.activeGate || state.enemies.length > 0));
    },
    null,
    { timeout: 10_000 }
  );
  probe = await page.evaluate(() => window.__game.seraM01Probe());
  const checkpointAfterRetry = await page.evaluate(() => window.__game.debug.checkpointProbe());
  assert(probe.missionKey === "m01" && probe.state === "playing", "retry did not restart M01", probe);
  assert(probe.base?.hits === 0, "retry did not reset bomber breaches", probe.base);
  const openingRestart = probe.activeGate?.timeout === 75
    && probe.enemies.length === 2
    && probe.enemies.every((enemy) => enemy.type === "mig29");
  const checkpointResume = checkpointBeforeFailure.active
    && checkpointAfterRetry.used
    && probe.missionWaveIndex >= checkpointBeforeFailure.waveIndex
    && probe.enemies.length > 0;
  assert(openingRestart || checkpointResume,
    "retry restored neither the opening state nor the banked checkpoint",
    { probe, checkpointBeforeFailure, checkpointAfterRetry });
  const retryWingmen = probe.friendlies.filter((friendly) => friendly.kind === "wingman");
  assert(retryWingmen.some((wingman) => wingman.label === "ROOK 1 CROWN" && wingman.type === "f15c"),
    "retry lost CROWN's F-15C", retryWingmen);
  assert(retryWingmen.some((wingman) => wingman.label === "ROOK 3 LARK" && wingman.type === "f16"),
    "retry lost LARK's F-16C", retryWingmen);

  // Red TGTs alone are enough to clear: white contacts may survive, MERIDIAN
  // owns the return call, and the result screen must unlock the next sortie.
  const completed = await page.evaluate(() => window.__game.forceSeraM01Complete());
  assert(completed, "forced clean clear did not reach the accomplished hold");
  await waitForRadioLine(["レン湾上空クリア", "帰投せよ"]);
  probe = await page.evaluate(() => window.__game.seraM01Probe());
  const successRadio = await page.evaluate(() => window.__game.debug.radioProbe());
  assert(probe.outcomePending === true, "clean clear did not enter the accomplished hold", probe);
  assert(probe.enemies.some((enemy) => enemy.tgt === false),
    "clean clear incorrectly required every white hostile to be destroyed", probe.enemies);
  assert(probe.radio.speaker === "MERIDIAN", "success was not called by MERIDIAN", probe.radio);
  assert(
    successRadio.fullText.includes("レン湾上空クリア") || successRadio.fullText.includes("帰投せよ"),
    "M01 success line did not activate",
    successRadio
  );
  // The production success hold is 2.8 seconds. Headless Chromium may
  // throttle requestAnimationFrame and the game deliberately clamps frame dt,
  // so resolve the already-verified hold through the production timer handler.
  const outcomeResolved = await page.evaluate(() => window.__game.forceSeraM01ResolveOutcome());
  assert(outcomeResolved, "accomplished hold did not resolve through updateOutcomePending",
    await page.evaluate(() => window.__game.seraM01Probe()));
  await waitForState("missionComplete", 3_000);

  // The full-screen result transform can leave the button outside the
  // headless viewport even though it is visible and enabled. HTMLElement.click()
  // still exercises the production button handler without introducing a test-only
  // state mutation.
  await page.evaluate(() => document.getElementById("changeMissionBtn").click());
  await waitForState("missionSelect", 10_000);
  const nextMission = await page.evaluate(() => {
    const debug = window.__game.debug;
    const m02Index = debug.missionIndexOf("m02");
    const selected = m02Index >= 0 && debug.forceMissionCursor(m02Index);
    const confirmed = selected && debug.forceConfirmMission();
    return {
      m02Index,
      selected,
      confirmed,
      state: document.body.dataset.gameState
    };
  });
  assert(nextMission.m02Index >= 0 && nextMission.selected,
    "clearing M01 did not unlock/select M02", nextMission);
  assert(nextMission.confirmed, "M02 could not enter its briefing", nextMission);

  await advanceBriefingToHangar();
  await startCurrentSortie();
  probe = await page.evaluate(() => window.__game.seraM01Probe());
  assert(probe.missionKey === "m02" && probe.state === "playing",
    "the stock mission after M01 no longer boots", probe);

  assert(pageErrors.length === 0, "pageerror occurred", pageErrors);
  assert(consoleErrors.length === 0, "console error occurred", consoleErrors);
  console.log("check_sera_m01_e2e: PASS");
  console.log("  real menu flow -> Ren Bay M01 -> fail -> checkpoint-safe retry -> clean clear -> M02 boot");
  console.log("  CROWN=f15c / LARK=f16 / white tutorial / red bomber phases");
  console.log("  one breach removes S / two breaches=FAILED / white survivors allowed on clear");
} finally {
  await browser.close();
}
