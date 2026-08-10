#!/usr/bin/env node
import { chromium } from "playwright";

const baseUrl = process.env.SORTIE_BASE_URL || "http://127.0.0.1:8000";
const missionUrl = `${baseUrl}/index.html?payloads=payloads/map_amalPlain.payload.js,payloads/mission_sera_m02.payload.js`;

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details === null ? "" : `\n${JSON.stringify(details, null, 2)}`;
  throw new Error(`check_sera_m02_e2e: ${message}${suffix}`);
}

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=swiftshader", "--disable-gpu-sandbox", "--disable-dev-shm-usage"]
});

async function openMissionPage() {
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
    () => Boolean(
      window.__game
      && window.__REGISTRY_SNAPSHOT__
      && window.__game.forceStartMissionByKey
      && window.__game.seraM02Probe
      && window.__game.forceSeraM02Complete
    ),
    null,
    { timeout: 120_000 }
  );

  const payloads = await page.evaluate(() => window.__APPLIED_PAYLOADS__ || []);
  const hasPayload = (inlineId, filePath) => payloads.includes(inlineId) || payloads.includes(filePath);
  assert(hasPayload("map_amalPlain", "payloads/map_amalPlain.payload.js"),
    "Amal Plain payload did not load", payloads);
  assert(hasPayload("mission_sera_m02", "payloads/mission_sera_m02.payload.js"),
    "M02 payload did not load", payloads);

  return { context, page, pageErrors, consoleErrors };
}

async function waitForState(page, expected, timeout = 30_000) {
  await page.waitForFunction(
    (state) => document.body.dataset.gameState === state,
    expected,
    { timeout }
  );
}

async function startM02(page) {
  const started = await page.evaluate(() => window.__game.forceStartMissionByKey("m02", "f16"));
  assert(started, "M02 could not be started through the production mission launcher");
  await waitForState(page, "playing");
  await page.waitForTimeout(350);
}

async function retryCurrentMission(page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const state = await page.evaluate(() => document.body.dataset.gameState);
    if (state === "playing") return;
    await page.evaluate(() => document.getElementById("retryBtn")?.click());
    await page.waitForTimeout(200);
  }
  await waitForState(page, "playing", 10_000);
}

async function advanceUntil(page, predicate, description, maxAttempts = 5) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const probe = await page.evaluate(() => window.__game.seraM02Probe());
    if (predicate(probe)) return probe;
    const advanced = await page.evaluate(() => window.__game.forceSeraM02AdvancePhase());
    assert(advanced, `could not advance while waiting for ${description}`, probe);
    await page.waitForTimeout(320);
  }
  const probe = await page.evaluate(() => window.__game.seraM02Probe());
  assert(predicate(probe), `timed out waiting for ${description}`, probe);
  return probe;
}

try {
  // -----------------------------------------------------------------------
  // Scenario A: full mission structure, facility consequence and clean clear.
  // -----------------------------------------------------------------------
  const clean = await openMissionPage();
  const { page } = clean;
  await startM02(page);

  let probe = await page.evaluate(() => window.__game.seraM02Probe());
  assert(probe.missionKey === "m02" && probe.worldKey === "amalPlain",
    "wrong mission or world booted", probe);
  assert(probe.facilities.length === 2 && probe.facilities.every((facility) => facility.alive),
    "M02 did not start with two live protected facilities", probe.facilities);
  assert(probe.pendingGroundUnits.length === 10 && probe.activeGroundPhaseId === null,
    "TEL column was not dormant at mission start", {
      pending: probe.pendingGroundUnits,
      phase: probe.activeGroundPhaseId
    });

  const wingmen = probe.friendlies.filter((friendly) => friendly.kind === "wingman");
  assert(wingmen.length === 2, "M02 did not field two ROOK wingmen", wingmen);
  const crown = wingmen.find((wingman) => wingman.label === "ROOK 1 CROWN");
  const lark = wingmen.find((wingman) => wingman.label === "ROOK 3 LARK");
  assert(crown?.type === "f4" && crown?.radioSpeaker === "crown",
    "CROWN was not fielded in the canonical F-4E", wingmen);
  assert(lark?.type === "f16" && lark?.radioSpeaker === "lark",
    "LARK was not fielded in the canonical F-16C", wingmen);

  const openingRed = probe.enemies.filter((enemy) => enemy.tgt);
  const openingWhite = probe.enemies.filter((enemy) => !enemy.tgt);
  assert(openingRed.length === 4 && openingRed.every((enemy) => enemy.type === "mig29"),
    "opening red rearguard was not four MiG-29s", probe.enemies);
  assert(openingWhite.length === 4
      && openingWhite.every((enemy) => enemy.type === "mig29"
        && enemy.disposition === "HOSTILE_OPTIONAL"
        && enemy.rankNeutral),
    "opening screen was not four white rank-neutral MiG-29s", openingWhite);

  let perfect = await page.evaluate(() => window.__game.seraM02PerfectRankPreview());
  assert(perfect === "S", "a clean M02 was not initially S-capable", perfect);

  probe = await advanceUntil(
    page,
    (state) => state.enemies.filter((enemy) => enemy.type === "su24m" && enemy.tgt
      && enemy.facilityIndex === 0).length === 2,
    "the southern Su-24M strike pair"
  );
  const southStrike = probe.enemies.filter((enemy) => enemy.type === "su24m" && enemy.tgt);
  assert(southStrike.length === 2 && southStrike.every((enemy) => enemy.strike),
    "southern attack aircraft were not red strike traffic", southStrike);

  const lost = await page.evaluate(() => window.__game.forceSeraM02FacilityLoss(0));
  assert(lost, "facility-loss hook did not neutralize the first radar site");
  probe = await page.evaluate(() => window.__game.seraM02Probe());
  assert(probe.state === "playing" && probe.facilityLosses === 1,
    "losing one radar site incorrectly failed the sortie", probe);
  assert(probe.facilities[0].alive === false && probe.facilities[1].alive === true,
    "facility damage was not isolated to the selected site", probe.facilities);
  perfect = await page.evaluate(() => window.__game.seraM02PerfectRankPreview());
  assert(perfect === "A", "one protected-facility loss did not cap the best rank at A", perfect);

  probe = await advanceUntil(
    page,
    (state) => state.enemies.filter((enemy) => enemy.type === "su24m" && enemy.tgt
      && enemy.facilityIndex === 1).length === 2,
    "the northern Su-24M strike pair"
  );
  const northStrike = probe.enemies.filter((enemy) => enemy.type === "su24m" && enemy.tgt);
  assert(northStrike.length === 2 && northStrike.every((enemy) => enemy.strike),
    "northern attack aircraft were not red strike traffic", northStrike);

  probe = await advanceUntil(
    page,
    (state) => state.activeGroundPhaseId === "m02-tel-column"
      && state.enemies.filter((enemy) => enemy.ground && enemy.mark === "m02Tel" && enemy.tgt).length === 4,
    "the revealed TEL column"
  );
  assert(probe.pendingGroundUnits.length === 0,
    "ground phase activated but dormant units remained queued", probe.pendingGroundUnits);
  const tels = probe.enemies.filter((enemy) => enemy.ground && enemy.mark === "m02Tel");
  const groundEscorts = probe.enemies.filter((enemy) => enemy.ground && !enemy.tgt);
  assert(tels.length === 4 && tels.every((enemy) => enemy.tgt && enemy.type === "tel"),
    "final phase did not field four red TELs", tels);
  assert(groundEscorts.length === 6
      && groundEscorts.every((enemy) => enemy.rankNeutral
        && enemy.disposition === "HOSTILE_OPTIONAL"),
    "final column did not field six white rank-neutral ground escorts", groundEscorts);
  assert(probe.activeGate?.mode === "groundMarkClear" && probe.activeGate?.mark === "m02Tel",
    "final wave was not held open by the TEL mark", probe.activeGate);

  const completed = await page.evaluate(() => window.__game.forceSeraM02Complete());
  assert(completed, "clean M02 clear did not enter the accomplished hold",
    await page.evaluate(() => window.__game.seraM02Probe()));
  probe = await page.evaluate(() => window.__game.seraM02Probe());
  assert(probe.outcomePending === true, "clean M02 clear did not set outcomePending", probe);
  assert(probe.enemies.some((enemy) => enemy.tgt === false),
    "M02 incorrectly required every white contact to be destroyed", probe.enemies);

  const outcomeResolved = await page.evaluate(() => window.__game.forceSeraM02ResolveOutcome());
  assert(outcomeResolved, "M02 accomplished hold did not resolve through the production timer",
    await page.evaluate(() => window.__game.seraM02Probe()));
  await waitForState(page, "missionComplete", 5_000);

  // Clearing M02 should unlock the next stock sortie and its normal briefing.
  await page.evaluate(() => document.getElementById("changeMissionBtn")?.click());
  await waitForState(page, "missionSelect", 10_000);
  const nextMission = await page.evaluate(() => {
    const debug = window.__game.debug;
    const m03Index = debug.missionIndexOf("m03");
    const selected = m03Index >= 0 && debug.forceMissionCursor(m03Index);
    const confirmed = selected && debug.forceConfirmMission();
    return { m03Index, selected, confirmed, state: document.body.dataset.gameState };
  });
  assert(nextMission.m03Index >= 0 && nextMission.selected && nextMission.confirmed,
    "clearing M02 did not allow M03 briefing selection", nextMission);

  assert(clean.pageErrors.length === 0, "pageerror occurred during clean scenario", clean.pageErrors);
  assert(clean.consoleErrors.length === 0, "console error occurred during clean scenario", clean.consoleErrors);
  await clean.context.close();

  // -----------------------------------------------------------------------
  // Scenario B: one TEL escape is terminal, and Retry clears stale state.
  // -----------------------------------------------------------------------
  const failure = await openMissionPage();
  const failurePage = failure.page;
  await startM02(failurePage);

  const activated = await failurePage.evaluate(() => window.__game.forceSeraM02ActivateGround());
  assert(activated, "TEL phase could not be activated for the escape scenario");
  probe = await failurePage.evaluate(() => window.__game.seraM02Probe());
  assert(probe.enemies.filter((enemy) => enemy.mark === "m02Tel" && enemy.tgt).length === 4,
    "escape scenario did not create four TEL targets", probe.enemies);

  const escaped = await failurePage.evaluate(() => window.__game.forceSeraM02EscapeTel());
  assert(escaped, "a surviving TEL reaching the western boundary did not fail M02");
  await waitForState(failurePage, "gameover", 10_000);
  probe = await failurePage.evaluate(() => window.__game.seraM02Probe());
  assert(probe.missionKey === "m02" && probe.state === "gameover",
    "TEL escape did not terminate the correct mission", probe);

  await retryCurrentMission(failurePage);
  await failurePage.waitForFunction(
    () => {
      const state = window.__game?.seraM02Probe?.();
      return Boolean(state && state.state === "playing" && state.facilities.length === 2);
    },
    null,
    { timeout: 10_000 }
  );
  probe = await failurePage.evaluate(() => window.__game.seraM02Probe());
  assert(probe.facilityLosses === 0 && probe.facilities.every((facility) => facility.alive),
    "Retry carried a stale facility loss into the new attempt", probe.facilities);
  assert(probe.outcomePending === false,
    "Retry carried the previous terminal outcome into the new attempt", probe);
  const retryWingmen = probe.friendlies.filter((friendly) => friendly.kind === "wingman");
  assert(retryWingmen.some((wingman) => wingman.label === "ROOK 1 CROWN" && wingman.type === "f4"),
    "Retry lost CROWN's F-4E", retryWingmen);
  assert(retryWingmen.some((wingman) => wingman.label === "ROOK 3 LARK" && wingman.type === "f16"),
    "Retry lost LARK's F-16C", retryWingmen);

  assert(failure.pageErrors.length === 0, "pageerror occurred during failure/retry scenario", failure.pageErrors);
  assert(failure.consoleErrors.length === 0,
    "console error occurred during failure/retry scenario", failure.consoleErrors);
  await failure.context.close();

  console.log("check_sera_m02_e2e: PASS");
  console.log("  Amal Plain -> CROWN F-4E / LARK F-16C -> two strike sites -> TEL reveal");
  console.log("  one facility loss caps S at A without failure; red TELs clear with white survivors");
  console.log("  one TEL escape=FAILED; Retry restores a clean two-facility ROOK sortie");
} finally {
  await browser.close();
}
