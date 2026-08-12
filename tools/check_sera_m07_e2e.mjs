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
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
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
    && window.__game?.forceSeraM07Recover
    && window.__game?.forceSeraM07FlyToSite
    && window.__game?.forceSeraM07DestroyTargets
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
  assert(!selected.error, "Sera campaign could not be entered from the production campaign screen", selected);
  assert(selected.cardState && !selected.cardState.locked && selected.cardState.disabled === "false",
    "Sera campaign card is still locked", selected);
  assert(selected.index >= 0 && selected.cursor && selected.title === "BLACK CURRENT" && selected.confirm,
    "M07 could not be selected through the production mission screen", selected);
  assert(selected.state === "briefing", "M07 selection did not open its briefing", selected);
}

async function startM07(page) {
  const started = await page.evaluate(() => window.__game.forceStartMissionByKey("sera-m07", "f16"));
  assert(started, "BLACK CURRENT did not start through the production launcher");
  await waitState(page, "playing");
  await page.waitForTimeout(300);
}

async function flyPickup(page, id) {
  const moved = await page.evaluate((siteId) => window.__game.forceSeraM07FlyToSite(siteId), id);
  assert(moved, `could not position the player at ${id}`);
  await page.waitForFunction((siteId) => {
    const probe = window.__game.seraM07Probe();
    return probe && (probe.recovered.includes(siteId) || probe.expiredSite === siteId);
  }, id, { timeout: 5_000 });
}

async function destroyTargetsAndResolve(page) {
  const destroyed = await page.evaluate(() => window.__game.forceSeraM07DestroyTargets());
  assert(destroyed > 0, "no red M07 targets were available to destroy");
  await page.waitForFunction(() => window.__game.seraM07Probe()?.outcomePending, null, { timeout: 8_000 });
  const resolved = await page.evaluate(() => window.__game.forceSeraM07ResolveOutcome());
  assert(resolved, "M07 accomplished hold did not resolve");
  await waitState(page, "missionComplete");
}

function assertNoErrors(run, label) {
  assert(run.pageErrors.length === 0, `${label}: pageerror`, run.pageErrors);
  assert(run.consoleErrors.length === 0, `${label}: console error`, run.consoleErrors);
}

try {
  // Route A: enter through normal menus and make a real low-pass rescue-first pickup.
  const rescue = await openPage();
  const payloads = await rescue.page.evaluate(() => window.__APPLIED_PAYLOADS__ || []);
  for (const id of ["map_naharStrait", "mission_sera_m04", "map_sarkPortAsh", "mission_sera_m05", "map_damarSeaStorm", "mission_sera_m07"]) {
    assert(payloads.includes(id), `normal startup did not apply ${id}`, payloads);
  }
  await selectThroughMenu(rescue.page);
  await startM07(rescue.page);
  let probe = await rescue.page.evaluate(() => window.__game.seraM07Probe());
  assert(probe.liveTargets.length === 4 && probe.liveTargets.every((type) => type === "su33"),
    "opening red CAP is not four Su-33s", probe);
  assert(probe.liveWhite.filter((type) => type === "missileBoat").length === 2,
    "two optional missile boats are not alive", probe);
  assert(probe.liveRecoveryMarkers.length === 4, "four recovery HUD markers were not created", probe);
  assert(probe.friendlies.some((friendly) => friendly.type === "fa18" && friendly.label === "ROOK 2 LARK"),
    "post-M06 LARK wingman is missing", probe.friendlies);
  assert(probe.friendlies.some((friendly) => friendly.label === "SEALIGHT 1" && friendly.vulnerable),
    "guarded SAR flying boat is missing", probe.friendlies);
  assert(probe.friendlies.some((friendly) => friendly.label === "MERIDIAN 1" && !friendly.vulnerable),
    "maritime patrol aircraft is missing", probe.friendlies);

  const screenshot = process.env.SORTIE_M07_SCREENSHOT;
  if (screenshot) {
    await rescue.page.evaluate(() => {
      window.__game.debug.forceTeleport(-1450, 700, 900);
      window.__game.debug.forceAttitude(0, -24, 0);
    });
    await rescue.page.waitForTimeout(180);
    await rescue.page.screenshot({ path: screenshot, fullPage: false });
  }

  await flyPickup(rescue.page, "crown");
  probe = await rescue.page.evaluate(() => window.__game.seraM07Probe());
  assert(probe.route === "rescue" && probe.expiredSite === "data" && probe.recovered.includes("crown"),
    "rescue-first route did not lock from the real proximity pass", probe);
  assert(probe.marks.crown1Recovered === 1 && probe.marks.m07Route === "rescue",
    "early CROWN recovery marks were not set", probe.marks);
  assert(!(await rescue.page.evaluate(() => window.__game.forceSeraM07Recover("data"))),
    "expired data capsule remained recoverable");
  assert(await rescue.page.evaluate(() => window.__game.forceSeraM07Recover("crew-b")), "crew-b recovery failed");
  assert(await rescue.page.evaluate(() => window.__game.forceSeraM07Recover("crew-c")), "crew-c recovery failed");
  probe = await rescue.page.evaluate(() => window.__game.seraM07Probe());
  assert(probe.recoveryComplete && probe.marks.m07SurvivorsRecovered === 3 && !probe.reinforcementsSpawned,
    "rescue-first completion or marks are wrong", probe);

  await destroyTargetsAndResolve(rescue.page);
  const rescueResult = await rescue.page.evaluate(() => ({
    records: JSON.parse(localStorage.getItem("sortieMissionRecords") || "{}"),
    epilogue: window.__game.epilogue
  }));
  assert(rescueResult.records["sera-m07"]?.cleared, "rescue-first M07 record was not saved", rescueResult.records["sera-m07"]);
  assert(rescueResult.records["sera-m07"].marks?.m07Route === "rescue"
      && rescueResult.records["sera-m07"].marks?.m07SurvivorsRecovered === 3
      && rescueResult.records["sera-m07"].marks?.damarDataRecovered === undefined,
    "rescue-first persistent marks are wrong", rescueResult.records["sera-m07"]);
  assert(rescueResult.epilogue.lines?.[0]?.includes("三つの救難信号"),
    "rescue-first route epilogue was not selected", rescueResult.epilogue);
  assertNoErrors(rescue, "rescue-first");
  await rescue.context.close();

  // Route B: data-first loses one beacon and adds two designated Foxhounds.
  const intel = await openPage();
  await startM07(intel.page);
  await flyPickup(intel.page, "data");
  probe = await intel.page.evaluate(() => window.__game.seraM07Probe());
  assert(probe.route === "intel" && probe.expiredSite === "crew-c" && probe.reinforcementsSpawned,
    "data-first route did not lock and launch reinforcements", probe);
  assert(probe.liveTargets.filter((type) => type === "su33").length === 4
      && probe.liveTargets.filter((type) => type === "mig31").length === 2,
    "data-first live TGT composition is not Su-33 x4 plus MiG-31 x2", probe.liveTargets);
  assert(!(await intel.page.evaluate(() => window.__game.forceSeraM07Recover("crew-c"))),
    "expired survivor beacon remained recoverable");
  assert(await intel.page.evaluate(() => window.__game.forceSeraM07Recover("crown")), "data route CROWN recovery failed");
  assert(await intel.page.evaluate(() => window.__game.forceSeraM07Recover("crew-b")), "data route crew-b recovery failed");
  probe = await intel.page.evaluate(() => window.__game.seraM07Probe());
  assert(probe.recoveryComplete && probe.marks.m07SurvivorsRecovered === 2
      && probe.marks.damarDataRecovered === 1 && probe.marks.crown1Recovered === undefined,
    "data-first completion or consequences are wrong", probe);
  await destroyTargetsAndResolve(intel.page);
  const intelResult = await intel.page.evaluate(() => ({
    record: JSON.parse(localStorage.getItem("sortieMissionRecords") || "{}")["sera-m07"],
    epilogue: window.__game.epilogue
  }));
  assert(intelResult.record?.marks?.m07Route === "intel"
      && intelResult.record?.marks?.m07SurvivorsRecovered === 2
      && intelResult.record?.marks?.damarDataRecovered === 1,
    "data-first persistent marks are wrong", intelResult.record);
  assert(intelResult.epilogue.lines?.[0]?.includes("記録球"),
    "data-first route epilogue was not selected", intelResult.epilogue);
  assertNoErrors(intel, "data-first");
  await intel.context.close();

  // Failure and Retry: clearing the red board is insufficient, losing SAR is terminal,
  // and a new attempt has a clean route/marker ledger.
  const retry = await openPage();
  await startM07(retry.page);
  const killedEarly = await retry.page.evaluate(() => window.__game.forceSeraM07DestroyTargets());
  assert(killedEarly === 4, "pre-recovery target clear did not remove the four Su-33s", killedEarly);
  await retry.page.waitForTimeout(250);
  probe = await retry.page.evaluate(() => window.__game.seraM07Probe());
  assert(probe.state === "playing" && !probe.outcomePending && !probe.recoveryComplete,
    "M07 cleared before a recovery route was complete", probe);
  const lost = await retry.page.evaluate(() => window.__game.forceSeraM07LoseGuard());
  assert(lost === 1, "guard failure did not destroy exactly the SAR flying boat", lost);
  await waitState(retry.page, "gameover");
  await retry.page.evaluate(() => document.getElementById("retryBtn")?.click());
  await waitState(retry.page, "playing");
  await retry.page.waitForTimeout(250);
  probe = await retry.page.evaluate(() => window.__game.seraM07Probe());
  assert(probe.route === null && probe.recovered.length === 0 && probe.expiredSite === null
      && !probe.recoveryComplete && probe.liveRecoveryMarkers.length === 4,
    "Retry carried recovery choice/state into the new attempt", probe);
  assert(probe.guarded.length === 1 && probe.guarded[0].alive,
    "Retry did not restore the guarded SAR flying boat", probe.guarded);
  assertNoErrors(retry, "failure-retry");
  await retry.context.close();

  console.log("check_sera_m07_e2e: PASS");
  console.log("  campaign UI -> M07 briefing -> Damar storm world -> Su-33 x4 / optional boats / SAR support");
  console.log("  rescue-first low pass -> 3 survivors / no data / no reinforcement -> route epilogue + persistent marks");
  console.log("  data-first low pass -> one beacon lost / MiG-31 x2 -> 2 survivors + data -> route epilogue + persistent marks");
  console.log("  red-board clear held by recovery -> SAR loss failure -> clean Retry");
} finally {
  server.close();
  await browser.close();
}
