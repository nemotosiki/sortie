#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const playwrightCandidates = [
  process.env.SORTIE_PLAYWRIGHT,
  "playwright",
  "C:/Users/user01/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright"
].filter(Boolean);
const chromePath = process.env.SORTIE_CHROME
  || "C:/Users/user01/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe";
const screenshotDir = process.env.SORTIE_M08_SCREENSHOT_DIR
  ? path.resolve(process.env.SORTIE_M08_SCREENSHOT_DIR)
  : null;
const mime = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".css": "text/css", ".png": "image/png",
  ".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg"
};

const fail = (message, details = null) => {
  const suffix = details === null ? "" : `\n${JSON.stringify(details, null, 2)}`;
  throw new Error(`check_sera_m08_e2e: ${message}${suffix}`);
};
const assert = (condition, message, details = null) => { if (!condition) fail(message, details); };

function loadPlaywright() {
  for (const candidate of playwrightCandidates) {
    try { return require(candidate); } catch { /* try next */ }
  }
  fail("Playwright is unavailable; set SORTIE_PLAYWRIGHT to an installed copy");
}

async function serve() {
  const server = http.createServer((req, res) => {
    const requestPath = decodeURIComponent(req.url.split("?")[0]);
    const file = path.join(root, requestPath === "/" ? "index.html" : requestPath);
    if (!path.resolve(file).startsWith(path.resolve(root))) {
      res.writeHead(403); res.end(); return;
    }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404); res.end("not found"); return; }
      res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, port: server.address().port };
}

const { chromium } = loadPlaywright();
const { server, port } = await serve();
const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
});
const missionUrl = `http://127.0.0.1:${port}/index.html?seraDev=1&payloads=payloads/map_ormBasin.payload.js,payloads/mission_sera_m08.payload.js`;

function registryLosses(before, after) {
  const losses = [];
  for (const [table, oldTable] of Object.entries(before)) {
    const newTable = after[table];
    if (newTable === undefined) { losses.push(`${table}: table removed`); continue; }
    if (Array.isArray(oldTable)) {
      for (const id of oldTable) if (!newTable.includes(id)) losses.push(`${table}.${id}`);
      continue;
    }
    for (const [id, oldFields] of Object.entries(oldTable)) {
      if (!(id in newTable)) { losses.push(`${table}.${id}`); continue; }
      const newFields = new Set(newTable[id]);
      for (const field of oldFields) {
        if (!newFields.has(field)) losses.push(`${table}.${id}.${field}`);
      }
    }
  }
  return losses;
}

async function snapshotAt(url) {
  const context = await browser.newContext();
  await context.addInitScript(() => { navigator.getGamepads = () => []; });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error?.stack || error)));
  await page.goto(url, { waitUntil: "load", timeout: 120_000 });
  await page.waitForFunction(() => Boolean(window.__REGISTRY_SNAPSHOT__), null, { timeout: 120_000 });
  const runtime = await page.evaluate(() => ({
    snapshot: window.__REGISTRY_SNAPSHOT__,
    campaigns: window.__game?.campaign?.list || []
  }));
  await context.close();
  assert(errors.length === 0, "pageerror while collecting live registry snapshot", errors);
  return runtime;
}

async function captureMapPreview() {
  if (!screenshotDir) return;
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  await context.addInitScript(() => { navigator.getGamepads = () => []; });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error?.stack || error)));
  const url = `http://127.0.0.1:${port}/index.html?payloads=payloads/map_ormBasin.payload.js&worldPreview=ormBasinNight`;
  await page.goto(url, { waitUntil: "load", timeout: 120_000 });
  await page.waitForFunction(
    () => window.__game?.debug?.worldDecorators?.().activeOn === "ormBasinNight",
    null,
    { timeout: 120_000 }
  );
  await page.waitForTimeout(2500);
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, "orm-basin-night-preview.png"), fullPage: false });
  await context.close();
  assert(errors.length === 0, "pageerror during Orm Basin visual preview", errors);
}

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
  await page.goto(missionUrl, { waitUntil: "load", timeout: 120_000 });
  await page.waitForFunction(() => Boolean(
    window.__REGISTRY_SNAPSHOT__
    && window.__game?.forceStartMissionByKey
    && window.__game?.seraM08Probe
    && window.__game?.forceSeraM08RelayRoute
    && window.__game?.forceSeraM08DeployPending
    && window.__game?.forceSeraM08FuelRoute
    && window.__game?.forceSeraM08Failure
    && window.__game?.forceSeraM08ResolveOutcome
  ), null, { timeout: 120_000 });
  const payloads = await page.evaluate(() => window.__APPLIED_PAYLOADS__ || []);
  assert(payloads.includes("payloads/map_ormBasin.payload.js")
      && payloads.includes("payloads/mission_sera_m08.payload.js"),
    "external M08 payloads did not register", payloads);
  return { context, page, pageErrors, consoleErrors };
}

async function waitForState(page, state, timeout = 15_000) {
  await page.waitForFunction(
    (expected) => document.body.dataset.gameState === expected,
    state,
    { timeout }
  );
}

async function startM08(page) {
  const started = await page.evaluate(() => window.__game.forceStartMissionByKey("sera-m08", "f16"));
  assert(started, "NIGHT AUDIT could not start through the production launcher");
  await waitForState(page, "playing");
  await page.waitForTimeout(350);
  return page.evaluate(() => window.__game.seraM08Probe());
}

async function capture(page, name) {
  if (!screenshotDir) return;
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: false });
}

function assertOpeningBoard(probe) {
  assert(probe?.missionKey === "sera-m08" && probe.worldKey === "ormBasinNight",
    "wrong mission or world booted", probe);
  assert(probe.choice === null && !probe.civilianBlackout && probe.settlementLightsVisible === true,
    "choice or settlement lighting leaked into a new sortie", probe);
  assert(probe.livingRed === 9 && probe.livingWhite === 6,
    "opening IFF board is not 9 red / 6 white", probe);
  assert(probe.pendingAircraft === 6, "six delayed aircraft are not queued", probe);
  const red = probe.contacts.filter((contact) => contact.tgt);
  const white = probe.contacts.filter((contact) => !contact.tgt);
  assert(red.length === 9 && red.every((contact) => contact.ground && !contact.rankNeutral),
    "red board contains a non-military or rank-neutral target", red);
  assert(white.length === 6 && white.every((contact) => contact.rankNeutral),
    "white board contains a rank-bearing contact", white);
  assert(white.some((contact) => contact.label === "SHEM PAYMENT RELAY" && contact.mark === "m08Relay"),
    "payment relay label/mark did not reach the live target", white);
  assert(white.some((contact) => contact.name === "VESPER" && contact.type === "mig29"),
    "VESPER did not enter the opening CAP", white);
  assert(probe.friendlies.some((friendly) => friendly.label === "ROOK 2 LARK"),
    "LARK is missing from ROOK flight", probe.friendlies);
  assert(probe.friendlies.filter((friendly) => friendly.label.startsWith("SABER ")).length === 2,
    "the two-ship F-111 SABER package is missing", probe.friendlies);
}

try {
  await captureMapPreview();
  // Compare against this exact checkout at runtime. The repository's older
  // checked-in registry_snapshot.json can lag intentional campaign tuning;
  // this live delta proves the M08 payload removes nothing from the host.
  const baseRuntime = await snapshotAt(`http://127.0.0.1:${port}/index.html`);
  const m08Runtime = await snapshotAt(missionUrl);
  const baseSnapshot = baseRuntime.snapshot;
  const m08Snapshot = m08Runtime.snapshot;
  const losses = registryLosses(baseSnapshot, m08Snapshot);
  assert(losses.length === 0, "M08 payload removed live registry entries or fields", losses);
  assert(m08Snapshot.MISSIONS?.["sera-m08"]
      && m08Snapshot.WORLD_PRESETS?.ormBasinNight
      && m08Snapshot.ACE_PROFILES?.vesper,
    "M08 registry additions are incomplete");
  assert(baseRuntime.campaigns.find((campaign) => campaign.id === "sera")?.playable === false
      && m08Runtime.campaigns.find((campaign) => campaign.id === "sera")?.playable === true,
    "seraDev did not remain an explicit development-only campaign unlock", {
      base: baseRuntime.campaigns,
      m08: m08Runtime.campaigns
    });

  // The player-facing route: Sera campaign card -> M08 list row -> briefing
  // -> hangar -> LAUNCH. Only the cursor setup uses a debug helper; every
  // transition itself is the production button/list interaction.
  const menuRun = await openMissionPage();
  assert(await menuRun.page.evaluate(() => window.__game.debug.forceCampaignCursor("sera")),
    "Sera campaign card could not be selected");
  await menuRun.page.click("#campaignConfirmBtn");
  await waitForState(menuRun.page, "missionSelect");
  await menuRun.page.click('[data-mission="sera-m08"]');
  const missionCard = await menuRun.page.evaluate(() => ({
    name: document.getElementById("missionInfoName")?.textContent,
    disabled: document.getElementById("missionConfirmBtn")?.disabled
  }));
  assert(missionCard.name === "NIGHT AUDIT" && missionCard.disabled === false,
    "M08 was not selectable from the unlocked Sera mission list", missionCard);
  await menuRun.page.click("#missionConfirmBtn");
  await waitForState(menuRun.page, "briefing");
  for (let step = 0; step < 4; step += 1) {
    if (await menuRun.page.evaluate(() => document.body.dataset.gameState === "ready")) break;
    await menuRun.page.click("#briefingNextBtn");
    await menuRun.page.waitForTimeout(100);
  }
  await waitForState(menuRun.page, "ready");
  await menuRun.page.click("#startBtn");
  await waitForState(menuRun.page, "playing");
  await menuRun.page.waitForTimeout(300);
  assertOpeningBoard(await menuRun.page.evaluate(() => window.__game.seraM08Probe()));
  assert(menuRun.pageErrors.length === 0, "pageerror during menu/briefing/hangar launch", menuRun.pageErrors);
  assert(menuRun.consoleErrors.length === 0,
    "console error during menu/briefing/hangar launch", menuRun.consoleErrors);
  await menuRun.context.close();

  // Route A: the white relay ends the sortie with all nine red targets alive.
  const relayRun = await openMissionPage();
  let probe = await startM08(relayRun.page);
  assertOpeningBoard(probe);
  await capture(relayRun.page, "sera-m08-opening");
  assert(await relayRun.page.evaluate(() => window.__game.forceSeraM08DeployPending()),
    "delayed M08 aircraft could not be deployed");
  probe = await relayRun.page.evaluate(() => window.__game.seraM08Probe());
  assert(probe.livingWhite === 12 && probe.pendingAircraft === 0,
    "full white air board did not deploy", probe);
  const relayCleared = await relayRun.page.evaluate(() => window.__game.forceSeraM08RelayRoute());
  assert(relayCleared, "relay route did not enter the accomplished hold");
  probe = await relayRun.page.evaluate(() => window.__game.seraM08Probe());
  assert(probe.choice === "relay" && probe.civilianBlackout
      && probe.settlementLightsVisible === false && probe.relayDestroyed,
    "relay route did not black out the civilian settlement", probe);
  assert(probe.livingRed === 9 && probe.retreatingAircraft === 8,
    "relay route did not preserve red ground targets and retreat all eight aircraft", probe);
  assert(probe.contacts.filter((contact) => contact.retreating)
    .every((contact) => !contact.tgt && contact.rankNeutral),
    "retreating aircraft changed IFF or rank contract", probe.contacts);
  await relayRun.page.waitForTimeout(250);
  await capture(relayRun.page, "sera-m08-relay-blackout");
  assert(await relayRun.page.evaluate(() => window.__game.forceSeraM08ResolveOutcome()),
    "relay accomplished hold did not resolve");
  await waitForState(relayRun.page, "missionComplete");
  let record = await relayRun.page.evaluate(() => JSON.parse(
    localStorage.getItem("sortieMissionRecords") || "{}"
  )["sera-m08"]);
  assert(record?.cleared && record.rank === "S" && record.m08Choice === "relay"
      && record.m08CivilianBlackout === true,
    "relay choice/rank was not persisted", record);
  assert(relayRun.pageErrors.length === 0, "pageerror during relay route", relayRun.pageErrors);
  assert(relayRun.consoleErrors.length === 0, "console error during relay route", relayRun.consoleErrors);
  await relayRun.context.close();

  // Route B: all nine red targets can clear while the relay and white air survive.
  const fuelRun = await openMissionPage();
  probe = await startM08(fuelRun.page);
  assertOpeningBoard(probe);
  assert(await fuelRun.page.evaluate(() => window.__game.forceSeraM08DeployPending()),
    "delayed M08 aircraft could not be deployed for fuel route");
  const fuelCleared = await fuelRun.page.evaluate(() => window.__game.forceSeraM08FuelRoute());
  assert(fuelCleared, "fuel route did not enter the accomplished hold");
  probe = await fuelRun.page.evaluate(() => window.__game.seraM08Probe());
  assert(probe.choice === "fuel" && !probe.civilianBlackout
      && probe.settlementLightsVisible === true && !probe.relayDestroyed,
    "fuel route damaged the payment/civilian network", probe);
  assert(probe.livingRed === 0 && probe.livingWhite === 12 && probe.retreatingAircraft === 0,
    "fuel route did not leave all white contacts fighting/alive", probe);
  assert(await fuelRun.page.evaluate(() => window.__game.forceSeraM08ResolveOutcome()),
    "fuel accomplished hold did not resolve");
  await waitForState(fuelRun.page, "missionComplete");
  record = await fuelRun.page.evaluate(() => JSON.parse(
    localStorage.getItem("sortieMissionRecords") || "{}"
  )["sera-m08"]);
  assert(record?.cleared && record.m08Choice === "fuel" && record.m08CivilianBlackout === false,
    "fuel choice was not persisted", record);
  assert(fuelRun.pageErrors.length === 0, "pageerror during fuel route", fuelRun.pageErrors);
  assert(fuelRun.consoleErrors.length === 0, "console error during fuel route", fuelRun.consoleErrors);
  await fuelRun.context.close();

  // Failure + production Retry must restore targets, choice state and lights.
  const retryRun = await openMissionPage();
  probe = await startM08(retryRun.page);
  assertOpeningBoard(probe);
  assert(await retryRun.page.evaluate(() => window.__game.forceSeraM08Failure()),
    "time-limit failure did not reach GAME OVER");
  await waitForState(retryRun.page, "gameover");
  await retryRun.page.evaluate(() => document.getElementById("retryBtn")?.click());
  await waitForState(retryRun.page, "playing");
  await retryRun.page.waitForTimeout(300);
  probe = await retryRun.page.evaluate(() => window.__game.seraM08Probe());
  assertOpeningBoard(probe);
  assert(retryRun.pageErrors.length === 0, "pageerror during failure/Retry", retryRun.pageErrors);
  assert(retryRun.consoleErrors.length === 0, "console error during failure/Retry", retryRun.consoleErrors);
  await retryRun.context.close();

  console.log("check_sera_m08_e2e: PASS");
  console.log("  live registry delta=0 losses; ormBasinNight/sera-m08/vesper added");
  console.log("  fresh profile -> Sera campaign -> M08 list -> briefing -> hangar -> launch");
  console.log("  boot 9 red / 6 white -> deploy all 8 aircraft -> relay blackout with 9 red survivors");
  console.log("  fuel clear with 12 white survivors -> persisted routes -> timeout failure -> clean Retry");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
