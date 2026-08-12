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
if (!playwright) throw new Error("check_sera_m07_e2e: Playwright is unavailable");

const mime = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".css": "text/css", ".png": "image/png",
  ".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg"
};

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details === null ? "" : `\n${JSON.stringify(details, null, 2)}`;
  throw new Error(`check_sera_m07_e2e: ${message}${suffix}`);
}

async function serve() {
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
const url = `http://127.0.0.1:${port}/index.html`;

async function openPage() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(() => {
    navigator.getGamepads = () => [];
    const records = {};
    for (const key of ["sera-m01", "sera-m02", "sera-m03", "sera-m04", "sera-m05", "sera-m06"]) {
      records[key] = { cleared: true, rank: "A", scores: [0], times: [0], marks: {} };
    }
    localStorage.setItem("sortieMissionRecords", JSON.stringify(records));
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(() => Boolean(
    window.__game?.forceStartMissionByKey
    && window.__game?.seraM07Probe
    && window.__game?.forceSeraM07AdvanceRescue
    && window.__game?.forceSeraM07DeployNextRedPair
    && window.__game?.forceSeraM07DamageGuard
    && window.__game?.forceSeraM07DestroyTargets
    && window.__game?.forceSeraM07Interference
  ), null, { timeout: 120_000 });
  return { context, page, pageErrors, consoleErrors };
}

async function waitState(page, state, timeout = 15_000) {
  await page.waitForFunction((expected) => document.body.dataset.gameState === expected, state, { timeout });
}

async function selectThroughMenu(page) {
  await waitState(page, "campaignSelect");
  const selected = await page.evaluate(() => {
    const debug = window.__game.debug;
    if (!debug.forceCampaignCursor("sera")) return { error: "cursor" };
    const card = document.querySelector('[data-campaign="sera"]');
    const cardState = card ? { locked: card.classList.contains("locked"), disabled: card.getAttribute("aria-disabled") } : null;
    if (!debug.forceConfirmCampaign()) return { error: "confirm", cardState };
    const index = debug.missionIndexOf("sera-m07");
    const cursor = debug.forceMissionCursor(index);
    const title = document.getElementById("missionInfoName")?.textContent;
    const confirm = debug.forceConfirmMission();
    return { cardState, index, cursor, title, confirm, state: document.body.dataset.gameState };
  });
  assert(!selected.error, "Sera campaign could not be entered", selected);
  assert(selected.cardState && !selected.cardState.locked && selected.cardState.disabled === "false",
    "Sera campaign card is still locked", selected);
  assert(selected.index >= 0 && selected.cursor && selected.title === "BLACK CURRENT" && selected.confirm,
    "M07 could not be selected through the mission screen", selected);
  assert(selected.state === "briefing", "M07 selection did not open its briefing", selected);
}

async function startM07(page) {
  const started = await page.evaluate(() => window.__game.forceStartMissionByKey("sera-m07", "f16"));
  assert(started, "BLACK CURRENT did not start through the production launcher");
  await waitState(page, "playing");
  await page.waitForTimeout(300);
}

function assertNoErrors(run, label) {
  assert(run.pageErrors.length === 0, `${label}: pageerror`, run.pageErrors);
  assert(run.consoleErrors.length === 0, `${label}: console error`, run.consoleErrors);
}

try {
  const escort = await openPage();
  const payloads = await escort.page.evaluate(() => window.__APPLIED_PAYLOADS__ || []);
  for (const id of ["map_damarSeaStorm", "mission_sera_m07"]) {
    assert(payloads.includes(id), `normal startup did not apply ${id}`, payloads);
  }
  await selectThroughMenu(escort.page);
  await startM07(escort.page);
  await escort.page.waitForFunction(() => {
    const probe = window.__game.seraM07Probe?.();
    return probe?.redTargeting?.length === 2
      && probe.redTargeting.every((entry) => entry.charge === "SEALIGHT 1");
  }, null, { timeout: 8_000 });

  let probe = await escort.page.evaluate(() => window.__game.seraM07Probe());
  assert(probe.liveTargets.length === 2 && probe.liveTargets.every((type) => type === "su33")
      && probe.pendingRedWaves.length === 2
      && probe.pendingRedWaves.every((wave) => wave.types.length === 2 && wave.types.every((type) => type === "su33")),
    "red TGT board is not opening Su-33 x2 plus two delayed pairs", probe);
  assert(probe.redTargeting.length === 2 && probe.redTargeting.every((entry) => (
    entry.hunt === "air" && entry.charge === "SEALIGHT 1"
  )), "red TGT Su-33s are not prioritizing the protected rescue asset", probe.redTargeting);
  assert(probe.redTargeting.every((entry) => (
    Math.hypot(entry.position[0], entry.position[2]) > 6500
  )), "opening Su-33 pair did not spawn at the farther 1.5x entry", probe.redTargeting);
  assert(probe.liveWhite.filter((type) => type === "missileBoat").length === 2,
    "two optional missile boats are not alive", probe);
  assert(probe.liveRecoveryMarkers.length === 0,
    "rescue sites remained player-facing HUD search contacts", probe.liveRecoveryMarkers);
  assert(probe.route === "rescue" && probe.rescueIndex === 0 && probe.rescuePhase === "transit",
    "SEALIGHT automatic rescue route was not armed", probe);
  assert(probe.guarded.length === 1 && probe.guarded[0].label === "SEALIGHT 1"
      && probe.guarded[0].hp === 980 && probe.guarded[0].maxHp === 980,
    "guarded SEALIGHT HP contract is wrong", probe.guarded);
  assert(Math.round(probe.guarded[0].destination[0]) === -1450
      && Math.round(probe.guarded[0].destination[2]) === -250,
    "SEALIGHT is not navigating to the first rescue point", probe.guarded[0]);
  assert(probe.recoveryGauge.label === "SEALIGHT HP" && probe.recoveryGauge.value === "980/980"
      && Number.parseFloat(probe.recoveryGauge.width) === 100 && probe.recoveryGauge.status === "ESCORT SEALIGHT",
    "green FRIENDS panel is not an aircraft HP gauge", probe.recoveryGauge);

  const movedFromAuthoredStart = Math.hypot(
    probe.guarded[0].position[0] - (-3400),
    probe.guarded[0].position[2] - 1800
  );
  assert(movedFromAuthoredStart > 1,
    "SEALIGHT did not begin its automatic route while RAVEN was far from the rescue point", probe.guarded[0]);

  assert(await escort.page.evaluate(() => window.__game.forceSeraM07DamageGuard(245)),
    "could not apply controlled SEALIGHT damage");
  probe = await escort.page.evaluate(() => window.__game.seraM07Probe());
  assert(probe.guarded[0].hp === 735 && probe.recoveryGauge.value === "735/980"
      && Number.parseFloat(probe.recoveryGauge.width) === 75,
    "FRIENDS gauge did not follow SEALIGHT HP", probe);

  const interference = await escort.page.evaluate(() => [
    window.__game.forceSeraM07Interference(),
    window.__game.forceSeraM07Interference(),
    window.__game.forceSeraM07Interference()
  ]);
  probe = await escort.page.evaluate(() => window.__game.seraM07Probe());
  assert(JSON.stringify(interference) === JSON.stringify([2, 2, 0])
      && probe.liveInterference.length === 4
      && probe.liveInterference.every((type) => type === "mig29"),
    "recurring SAR interference or its live cap is wrong", { interference, probe });
  assert(probe.interferenceTargeting.length === 4 && probe.interferenceTargeting.every((entry) => (
    entry.hunt === null && !entry.wingmanHunter && entry.charge === null && entry.targetsPlayer
  )), "white MiG-29A reinforcements are not dedicated to RAVEN", probe.interferenceTargeting);

  const killedEarly = await escort.page.evaluate(() => window.__game.forceSeraM07DestroyTargets());
  assert(killedEarly === 2, "opening target clear did not remove exactly the first Su-33 pair", killedEarly);
  await escort.page.waitForTimeout(250);
  probe = await escort.page.evaluate(() => window.__game.seraM07Probe());
  assert(probe.state === "playing" && !probe.outcomePending && !probe.recoveryComplete
      && !probe.combatCleared && probe.pendingRedWaves.length === 2,
    "M07 declared red-board clear before its delayed Su-33 pairs arrived", probe);

  for (const expectedDelay of [30, 60]) {
    assert((await escort.page.evaluate(() => window.__game.forceSeraM07DeployNextRedPair())) === 2,
      `could not deploy delayed Su-33 pair at ${expectedDelay}s`);
    await escort.page.waitForFunction(() => {
      const probe = window.__game.seraM07Probe?.();
      return probe?.redTargeting?.length === 2
        && probe.redTargeting.every((entry) => entry.charge === "SEALIGHT 1");
    }, null, { timeout: 8_000 });
    probe = await escort.page.evaluate(() => window.__game.seraM07Probe());
    assert(probe.liveTargets.length === 2 && probe.liveTargets.every((type) => type === "su33")
        && probe.redTargeting.every((entry) => entry.hunt === "air" && entry.charge === "SEALIGHT 1")
        && probe.redTargeting.every((entry) => Math.hypot(entry.position[0], entry.position[2]) > 6500),
      `delayed Su-33 pair at ${expectedDelay}s has wrong composition, target, or distance`, probe);
    assert((await escort.page.evaluate(() => window.__game.forceSeraM07DestroyTargets())) === 2,
      `could not destroy delayed Su-33 pair at ${expectedDelay}s`);
  }
  await escort.page.waitForTimeout(250);
  probe = await escort.page.evaluate(() => window.__game.seraM07Probe());
  assert(probe.liveTargets.length === 0 && probe.pendingRedWaves.length === 0 && probe.combatCleared,
    "red board did not clear after all six staggered Su-33s were destroyed", probe);

  for (const [index, expected] of ["crown", "crew-b", "crew-c"].entries()) {
    assert(await escort.page.evaluate(() => window.__game.forceSeraM07AdvanceRescue()),
      `could not advance automatic rescue at ${expected}`);
    probe = await escort.page.evaluate(() => window.__game.seraM07Probe());
    assert(probe.recovered.includes(expected), `SEALIGHT did not recover ${expected}`, probe);
    if (index === 0) {
      assert(probe.midInterferenceSpawned && probe.midInterferenceTargeting.length === 2
          && probe.midInterferenceTargeting.every((entry) => (
            entry.type === "mig29" && entry.hunt === null && !entry.wingmanHunter
            && entry.charge === null && entry.targetsPlayer
          )),
      "mid-mission veteran MiG-29A flight did not pursue RAVEN", probe.midInterferenceTargeting);
    }
  }
  assert(probe.recoveryComplete && probe.rescuePhase === "egress"
      && probe.marks.m07Route === "rescue" && probe.marks.m07SurvivorsRecovered === 3,
    "automatic three-site rescue did not complete", probe);
  assert(probe.radioEvents?.includes("m07_rescue_progress_1")
      && probe.radioEvents?.includes("m07_rescue_progress_2")
      && probe.radioEvents?.includes("m07_mid_interference")
      && probe.radioEvents?.includes("m07_recovery_complete"),
    "1/3, 2/3 and 3/3 rescue radio reports did not fire", probe.radioEvents);
  assert((await escort.page.evaluate(() => window.__game.forceSeraM07Interference())) === 0,
    "SAR interference continued after rescue completed");

  await escort.page.waitForFunction(() => window.__game.seraM07Probe()?.outcomePending, null, { timeout: 8_000 });
  assert(await escort.page.evaluate(() => window.__game.forceSeraM07ResolveOutcome()),
    "M07 accomplished hold did not resolve");
  await waitState(escort.page, "missionComplete");
  const result = await escort.page.evaluate(() => ({
    record: JSON.parse(localStorage.getItem("sortieMissionRecords") || "{}")["sera-m07"],
    epilogue: window.__game.epilogue
  }));
  assert(result.record?.cleared && result.record.marks?.m07SurvivorsRecovered === 3,
    "escort M07 record was not saved", result.record);
  assert(result.epilogue.lines?.[0]?.includes("SEALIGHT"),
    "escort-route epilogue was not selected", result.epilogue);
  assertNoErrors(escort, "escort-success");
  await escort.context.close();

  const retry = await openPage();
  await startM07(retry.page);
  assert((await retry.page.evaluate(() => window.__game.forceSeraM07LoseGuard())) === 1,
    "guard failure did not destroy exactly SEALIGHT");
  await waitState(retry.page, "gameover");
  await retry.page.evaluate(() => document.getElementById("retryBtn")?.click());
  await waitState(retry.page, "playing");
  await retry.page.waitForTimeout(250);
  probe = await retry.page.evaluate(() => window.__game.seraM07Probe());
  assert(probe.route === "rescue" && probe.recovered.length === 0 && probe.rescueIndex === 0
      && probe.rescuePhase === "transit" && probe.liveRecoveryMarkers.length === 0,
    "Retry carried rescue progress into the new attempt", probe);
  assert(probe.guarded.length === 1 && probe.guarded[0].alive && probe.guarded[0].hp === 980,
    "Retry did not restore SEALIGHT at full HP", probe.guarded);
  assertNoErrors(retry, "failure-retry");
  await retry.context.close();

  console.log("check_sera_m07_e2e: PASS");
  console.log("  campaign UI -> BLACK CURRENT -> SEALIGHT auto-route with no player search markers");
  console.log("  green FRIENDS silhouette gauge -> exact SEALIGHT HP -> damage reflected at 75%");
  console.log("  rescue radio 1/3 -> veteran MiG-29A mid-wave -> 2/3 -> 3/3 -> recurring waves stop");
  console.log("  Su-33 x6 -> distant 2 + 2 + 2 stagger -> red-board clear held by escort -> success and clean Retry");
} finally {
  server.close();
  await browser.close();
}
