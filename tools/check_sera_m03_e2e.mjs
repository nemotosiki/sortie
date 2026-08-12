#!/usr/bin/env node
import { chromium } from "playwright";

const baseUrl = process.env.SORTIE_BASE_URL || "http://127.0.0.1:8000";
const missionUrl = `${baseUrl}/index.html`;

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details === null ? "" : `\n${JSON.stringify(details, null, 2)}`;
  throw new Error(`check_sera_m03_e2e: ${message}${suffix}`);
}

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=swiftshader", "--disable-gpu-sandbox", "--disable-dev-shm-usage"]
});

async function openMissionPage() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(() => {
    navigator.getGamepads = () => [];
    const records = JSON.parse(localStorage.getItem("sortieMissionRecords") || "{}");
    records.m01 = records.m01 || { cleared: true, rank: "A", scores: [0], times: [0] };
    records.m02 = records.m02 || { cleared: true, rank: "A", scores: [0], times: [0] };
    localStorage.setItem("sortieMissionRecords", JSON.stringify(records));
  });

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
      && window.__game.seraM03Probe
      && window.__game.forceSeraM03DeployPending
      && window.__game.forceSeraM03LandTransport
      && window.__game.forceSeraM03Complete
    ),
    null,
    { timeout: 120_000 }
  );

  const payloads = await page.evaluate(() => window.__APPLIED_PAYLOADS__ || []);
  for (const payload of ["ground_heli_pack", "map_sarkPort", "mission_sera_m03"]) {
    assert(payloads.includes(payload), `normal startup did not apply ${payload}`, payloads);
  }

  return { context, page, pageErrors, consoleErrors };
}

async function waitForState(page, expected, timeout = 30_000) {
  await page.waitForFunction(
    (state) => document.body.dataset.gameState === state,
    expected,
    { timeout }
  );
}

async function startM03(page) {
  const started = await page.evaluate(() => window.__game.forceStartMissionByKey("sera-m03", "f16"));
  assert(started, "namespaced LOW WATER could not be started through the production launcher");
  await waitForState(page, "playing");
  await page.waitForTimeout(350);
}

async function deployAllOpeningContacts(page) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const probe = await page.evaluate(() => window.__game.seraM03Probe());
    if (probe.transportSpawned === 3 && probe.pendingTargetWaves === 0) return probe;
    const deployed = await page.evaluate(() => window.__game.forceSeraM03DeployPending());
    assert(deployed, "could not release delayed M03 contacts", probe);
    await page.waitForTimeout(100);
  }
  const probe = await page.evaluate(() => window.__game.seraM03Probe());
  assert(probe.transportSpawned === 3 && probe.pendingTargetWaves === 0,
    "not all three transports entered the battle", probe);
  return probe;
}

async function retryCurrentMission(page) {
  await page.evaluate(() => document.getElementById("retryBtn")?.click());
  await waitForState(page, "playing", 10_000);
  await page.waitForTimeout(250);
}

try {
  // Scenario A: normal boot, overlapping low-altitude package and air-to-ground conversion.
  const landing = await openMissionPage();
  await startM03(landing.page);

  let probe = await landing.page.evaluate(() => window.__game.seraM03Probe());
  assert(probe.missionKey === "sera-m03" && probe.title === "LOW WATER" && probe.worldKey === "sarkPort",
    "wrong namespaced Sera mission or world booted", probe);
  assert(probe.active && probe.facilities.length === 3 && probe.facilities.every((facility) => facility.alive),
    "LOW WATER did not start with its three protected port sites", probe);
  assert(probe.pendingTargetWaves === 3,
    "opening engagement did not retain its three delayed red formations", probe);
  const openingRed = probe.enemies.filter((enemy) => enemy.alive && enemy.tgt);
  const openingWhite = probe.enemies.filter((enemy) => enemy.alive && !enemy.tgt);
  assert(openingRed.length === 2 && openingRed.every((enemy) => enemy.type === "ka52"),
    "opening red contacts were not the first Ka-52 pair", openingRed);
  assert(openingWhite.length === 2
      && openingWhite.every((enemy) => enemy.type === "mig21" && enemy.rankNeutral),
    "opening top cover was not white rank-neutral MiG-21 traffic", openingWhite);
  assert(await landing.page.evaluate(() => window.__game.seraM03PerfectRankPreview()) === "S",
    "zero-landings route was not initially S-capable");

  probe = await deployAllOpeningContacts(landing.page);
  const transports = probe.enemies.filter((enemy) => enemy.alive && enemy.type === "armedTransportHeli");
  assert(transports.length === 3 && transports.every((enemy) => enemy.landingState === "APPROACH"),
    "transport landing FSM did not arm all three transports", transports);

  const firstLanding = await landing.page.evaluate(() => window.__game.forceSeraM03LandTransport());
  assert(firstLanding, "transport could not complete the production unload conversion");
  probe = await landing.page.evaluate(() => window.__game.seraM03Probe());
  const apcs = probe.enemies.filter((enemy) => enemy.alive && enemy.m03Apc);
  assert(probe.transportLandings === 1 && probe.apcSpawned === 2 && apcs.length === 2,
    "one transport did not become two live APC TGTs", probe);
  assert(apcs.every((enemy) => enemy.ground && enemy.tgt && enemy.mark === "m03Apc"),
    "converted APC contacts lost their red ground-target contract", apcs);
  assert(await landing.page.evaluate(() => window.__game.seraM03PerfectRankPreview()) === "S",
    "preserved port-defence route was not S-capable after one landing");

  let arrived = await landing.page.evaluate(() => window.__game.forceSeraM03ApcArrival(1));
  assert(arrived === 1, "first APC arrival did not register");
  probe = await landing.page.evaluate(() => window.__game.seraM03Probe());
  assert(probe.state === "playing" && probe.apcArrivals === 1 && probe.command.hp === 145,
    "first APC arrival did not apply the authored command damage", probe);
  assert(await landing.page.evaluate(() => window.__game.seraM03PerfectRankPreview()) === "S",
    "command post above 70% with both defences alive should retain S");

  arrived = await landing.page.evaluate(() => window.__game.forceSeraM03ApcArrival(1));
  assert(arrived === 1, "second APC arrival did not register");
  probe = await landing.page.evaluate(() => window.__game.seraM03Probe());
  assert(probe.state === "playing" && probe.apcArrivals === 2 && probe.command.hp === 110,
    "second APC arrival produced the wrong non-terminal state", probe);
  assert(await landing.page.evaluate(() => window.__game.seraM03PerfectRankPreview()) === "A",
    "a landing with command integrity below 70% did not cap the best rank at A");

  assert(landing.pageErrors.length === 0, "pageerror occurred during landing conversion", landing.pageErrors);
  assert(landing.consoleErrors.length === 0,
    "console error occurred during landing conversion", landing.consoleErrors);
  await landing.context.close();

  // Scenario B: four APC arrivals are terminal, and Retry resets the port board.
  const failure = await openMissionPage();
  await startM03(failure.page);
  await deployAllOpeningContacts(failure.page);
  assert(await failure.page.evaluate(() => window.__game.forceSeraM03LandTransport()),
    "first failure-scenario transport could not unload");
  assert(await failure.page.evaluate(() => window.__game.forceSeraM03LandTransport()),
    "second failure-scenario transport could not unload");
  arrived = await failure.page.evaluate(() => window.__game.forceSeraM03ApcArrival(4));
  assert(arrived === 4, "four APCs could not reach the command post", arrived);
  await waitForState(failure.page, "gameover", 10_000);
  probe = await failure.page.evaluate(() => window.__game.seraM03Probe());
  assert(probe.failed && probe.apcArrivals === 4 && probe.command.alive,
    "four-arrival failure did not fire before physical command destruction", probe);

  await retryCurrentMission(failure.page);
  probe = await failure.page.evaluate(() => window.__game.seraM03Probe());
  assert(probe.active && !probe.failed && probe.transportLandings === 0
      && probe.apcSpawned === 0 && probe.apcArrivals === 0,
    "Retry carried M03 landing state into the new attempt", probe);
  assert(probe.facilities.length === 3 && probe.facilities.every((facility) => facility.alive),
    "Retry did not restore the three protected port sites", probe.facilities);

  assert(failure.pageErrors.length === 0, "pageerror occurred during failure/retry", failure.pageErrors);
  assert(failure.consoleErrors.length === 0,
    "console error occurred during failure/retry", failure.consoleErrors);
  await failure.context.close();

  // Scenario C: destroy every red contact before a landing, clear with white traffic alive,
  // and persist only the namespaced Sera record.
  const clean = await openMissionPage();
  await startM03(clean.page);
  const completed = await clean.page.evaluate(() => window.__game.forceSeraM03Complete());
  assert(completed, "clean zero-landing clear did not enter the accomplished hold",
    await clean.page.evaluate(() => window.__game.seraM03Probe()));
  probe = await clean.page.evaluate(() => window.__game.seraM03Probe());
  assert(probe.outcomePending && probe.transportLandings === 0,
    "clean route landed a transport or skipped the accomplished hold", probe);
  assert(probe.enemies.some((enemy) => enemy.alive && !enemy.tgt),
    "LOW WATER incorrectly required every white MiG-21 to be destroyed", probe.enemies);

  const resolved = await clean.page.evaluate(() => window.__game.forceSeraM03ResolveOutcome());
  assert(resolved, "LOW WATER accomplished hold did not resolve through production code");
  await waitForState(clean.page, "missionComplete", 10_000);
  const records = await clean.page.evaluate(() => JSON.parse(
    localStorage.getItem("sortieMissionRecords") || "{}"
  ));
  assert(records["sera-m03"]?.cleared && records["sera-m03"]?.rank === "S"
      && records["sera-m03"]?.transportLandings === 0,
    "namespaced Sera M03 result was not persisted", records["sera-m03"]);
  assert(records["m-heli"] === undefined && records.m03 === undefined,
    "clearing Sera M03 wrote a legacy compatibility record", records);

  const legacyStarted = await clean.page.evaluate(() => window.__game.forceStartMissionByKey("m-heli", "f16"));
  assert(legacyStarted, "legacy USA m-heli could not start after the Sera clear");
  await waitForState(clean.page, "playing", 10_000);
  await clean.page.waitForTimeout(250);
  probe = await clean.page.evaluate(() => window.__game.seraM03Probe());
  const legacyWingmen = probe.friendlies.filter((friendly) => friendly.kind === "wingman");
  assert(probe.missionKey === "m-heli" && probe.title === "LOW GUARDIAN"
      && probe.worldKey === "coastalPlain"
      && probe.facilities.length === 0
      && probe.transportSpawned === 0
      && probe.transportLandings === 0
      && probe.apcSpawned === 0
      && probe.apcArrivals === 0,
    "legacy m-heli still resolves to LOW WATER content", probe);
  assert(!legacyWingmen.some((wingman) => wingman.label.includes("CROWN") || wingman.label.includes("LARK")),
    "ROOK wingmen leaked into legacy m-heli", legacyWingmen);

  assert(clean.pageErrors.length === 0, "pageerror occurred during clean completion", clean.pageErrors);
  assert(clean.consoleErrors.length === 0,
    "console error occurred during clean completion", clean.consoleErrors);
  await clean.context.close();

  console.log("check_sera_m03_e2e: PASS");
  console.log("  normal startup -> Sark Port -> Ka-52/transport overlap -> APC conversion");
  console.log("  command integrity rank route -> four-arrival failure -> clean Retry");
  console.log("  zero-landing S clear -> sera-m03 record only -> legacy m-heli still boots independently");
} finally {
  await browser.close();
}
