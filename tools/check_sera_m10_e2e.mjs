#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const externalBaseUrl = String(process.env.SORTIE_BASE_URL || "").replace(/\/$/, "");
const playwrightCandidates = [
  process.env.SORTIE_PLAYWRIGHT,
  "playwright",
  "C:/Users/user01/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright"
].filter(Boolean);
const chromePath = process.env.SORTIE_CHROME
  || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const mime = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".css": "text/css", ".png": "image/png",
  ".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg"
};

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details === null ? "" : `\n${JSON.stringify(details, null, 2)}`;
  throw new Error(`check_sera_m10_e2e: ${message}${suffix}`);
}

function loadPlaywright() {
  for (const candidate of playwrightCandidates) {
    try { return require(candidate); } catch { /* try next installation */ }
  }
  throw new Error("Playwright is unavailable; set SORTIE_PLAYWRIGHT to an installed copy");
}

async function serve() {
  const server = http.createServer((request, response) => {
    const requestPath = decodeURIComponent(request.url.split("?")[0]);
    const relative = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
    const file = path.resolve(root, relative);
    if (!(file === root || file.startsWith(`${root}${path.sep}`))) {
      response.writeHead(403); response.end(); return;
    }
    fs.readFile(file, (error, data) => {
      if (error) { response.writeHead(404); response.end("not found"); return; }
      response.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
      response.end(data);
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, port: server.address().port };
}

const { chromium } = loadPlaywright();
const served = externalBaseUrl ? { server: null, port: null } : await serve();
const baseUrl = externalBaseUrl || `http://127.0.0.1:${served.port}`;
const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
});

async function openPage(url, records = null) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  await context.addInitScript((seedRecords) => {
    navigator.getGamepads = () => [];
    localStorage.setItem("sortieHangarPurchases", JSON.stringify({
      schemaVersion: 2,
      campaigns: { usa: [], rus: [], sera: ["f16"] }
    }));
    if (seedRecords) {
      localStorage.setItem("sortieMissionRecords", JSON.stringify(seedRecords));
    }
  }, records);
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto(url, { waitUntil: "load", timeout: 120_000 });
  return { context, page, pageErrors, consoleErrors };
}

async function openMission() {
  const opened = await openPage(`${baseUrl}/index.html?seraDev=1`);
  await opened.page.waitForFunction(() => Boolean(
    window.__game?.forceStartMissionByKey
    && window.__game?.seraM10Probe
    && window.__game?.forceSeraM10BridgeRoute
    && window.__game?.forceSeraM10DeployPending
    && window.__game?.forceSeraM10PrecisionRoute
    && window.__game?.forceSeraM10CargoEscape
    && window.__game?.forceSeraM10CriticalEscape
  ), null, { timeout: 120_000 });
  const payloads = await opened.page.evaluate(() => window.__APPLIED_PAYLOADS__ || []);
  for (const payload of ["map_norIndustrial", "mission_sera_m09", "mission_sera_m10"]) {
    assert(payloads.includes(payload), `production startup did not apply ${payload}`, payloads);
  }
  const started = await opened.page.evaluate(() => window.__game.forceStartMissionByKey("sera-m10", "f16"));
  assert(started, "LAST TRAIN could not start through the production launcher");
  await opened.page.waitForFunction(() => document.body.dataset.gameState === "playing", null, { timeout: 20_000 });
  await opened.page.waitForTimeout(350);
  return opened;
}

function assertClean(opened, label) {
  assert(opened.pageErrors.length === 0, `page error on ${label}`, opened.pageErrors);
  assert(opened.consoleErrors.length === 0, `console error on ${label}`, opened.consoleErrors);
}

try {
  const seraKeys = Array.from({ length: 10 }, (_, index) => `sera-m${String(index + 1).padStart(2, "0")}`);
  const clearedThrough = (last) => Object.fromEntries(
    seraKeys.slice(0, last).map((key) => [key, { cleared: true, rank: "A" }])
  );

  // Production campaign chain: M10 remains hidden after M08, then becomes a
  // normal selectable sortie as soon as M09 has a clear record. This uses no
  // seraDev override and drives the same campaign/list buttons as the player.
  const lockedShell = await openPage(`${baseUrl}/index.html`, clearedThrough(8));
  await lockedShell.page.waitForFunction(
    () => Boolean(window.__game?.debug?.forceCampaignCursor),
    null,
    { timeout: 120_000 }
  );
  assert(await lockedShell.page.evaluate(() => window.__game.debug.forceCampaignCursor("sera")),
    "Sera campaign card could not be selected before the M09 gate");
  await lockedShell.page.click("#campaignConfirmBtn");
  await lockedShell.page.waitForFunction(
    () => document.body.dataset.gameState === "missionSelect",
    null,
    { timeout: 20_000 }
  );
  await lockedShell.page.click('[data-mission="sera-m10"]');
  const lockedM10 = await lockedShell.page.evaluate(() => ({
    keys: window.__game.mission.campaignKeys,
    name: document.getElementById("missionInfoName")?.textContent,
    disabled: document.getElementById("missionConfirmBtn")?.disabled
  }));
  assert(JSON.stringify(lockedM10.keys) === JSON.stringify(seraKeys),
    "Sera campaign order is not M01-M10", lockedM10.keys);
  assert(lockedM10.name === "?????" && lockedM10.disabled === true,
    "M10 unlocked without an M09 clear", lockedM10);
  assertClean(lockedShell, "M10 locked campaign shell");
  await lockedShell.context.close();

  const unlockedShell = await openPage(`${baseUrl}/index.html`, clearedThrough(9));
  await unlockedShell.page.waitForFunction(
    () => Boolean(window.__game?.debug?.forceCampaignCursor),
    null,
    { timeout: 120_000 }
  );
  assert(await unlockedShell.page.evaluate(() => window.__game.debug.forceCampaignCursor("sera")),
    "Sera campaign card could not be selected after the M09 gate");
  await unlockedShell.page.click("#campaignConfirmBtn");
  await unlockedShell.page.waitForFunction(
    () => document.body.dataset.gameState === "missionSelect",
    null,
    { timeout: 20_000 }
  );
  await unlockedShell.page.click('[data-mission="sera-m10"]');
  const unlockedM10 = await unlockedShell.page.evaluate(() => ({
    name: document.getElementById("missionInfoName")?.textContent,
    disabled: document.getElementById("missionConfirmBtn")?.disabled
  }));
  assert(unlockedM10.name === "LAST TRAIN" && unlockedM10.disabled === false,
    "M09 clear did not unlock M10", unlockedM10);
  await unlockedShell.page.click("#missionConfirmBtn");
  await unlockedShell.page.waitForFunction(
    () => document.body.dataset.gameState === "briefing",
    null,
    { timeout: 20_000 }
  );
  assertClean(unlockedShell, "M10 unlocked campaign shell");
  await unlockedShell.context.close();

  // The integrated decorator must build with valid meshes before the mission
  // contract is exercised. This also catches missing tracked GPU resources.
  const map = await openPage(`${baseUrl}/index.html?worldPreview=norIndustrialDusk`);
  await map.page.waitForFunction(
    () => window.__game?.debug?.worldDecorators?.().activeOn === "norIndustrialDusk",
    null,
    { timeout: 120_000 }
  );
  await map.page.waitForTimeout(900);
  const mapProbe = await map.page.evaluate(() => ({
    decorator: window.__game.debug.worldDecorators(),
    mesh: window.__game.debug.worldMeshIntegrity()
  }));
  assert(mapProbe.decorator?.activeOn === "norIndustrialDusk", "Nor decorator did not activate", mapProbe);
  assert(Array.isArray(mapProbe.mesh?.issues) && mapProbe.mesh.issues.length === 0,
    "Nor world contains invalid meshes", mapProbe.mesh);
  assertClean(map, "Nor map preview");
  await map.context.close();

  // Precision route, including one escaped car of each white cargo class.
  const precision = await openMission();
  assert(await precision.page.evaluate(() => window.__game.forceSeraM10DeployPending()),
    "delayed Su-34/MiG-29A flights could not deploy");
  let probe = await precision.page.evaluate(() => window.__game.seraM10Probe());
  const live = probe.contacts.filter((contact) => contact.alive);
  assert(probe.missionKey === "sera-m10" && probe.worldKey === "norIndustrialDusk",
    "wrong mission/world started", probe);
  assert(probe.totalTargets === 3 && live.length === 17, "M10 contact board changed", probe);
  assert(live.filter((contact) => contact.tgt).length === 3
    && live.filter((contact) => !contact.tgt).length === 14,
  "M10 red/white contact split changed", live);
  assert(probe.bridgeVisuals.length === 2 && probe.bridgeVisuals.every((object) => object.visible),
    "intact bridge visual is absent", probe.bridgeVisuals);
  assert(await precision.page.evaluate(() => window.__game.forceSeraM10CargoEscape("power")),
    "power car could not cross the transfer line");
  assert(await precision.page.evaluate(() => window.__game.forceSeraM10CargoEscape("material")),
    "material car could not cross the transfer line");
  assert(await precision.page.evaluate(() => window.__game.forceSeraM10PrecisionRoute()),
    "precision route did not enter ACCOMPLISHED hold");
  probe = await precision.page.evaluate(() => window.__game.seraM10Probe());
  assert(probe.m10.route === "precision" && probe.m10.precisionTargetsDestroyed === 3
    && probe.m10.trainCarsDestroyed === 3 && probe.m10.powerCarsEscaped === 1
    && probe.m10.materialCarsEscaped === 1 && !probe.m10.bridgeDestroyed,
  "precision outcome ledger is wrong", probe.m10);
  assert(probe.contacts.filter((contact) => contact.alive && contact.mark?.startsWith("m10")).every(
    (contact) => contact.speed === 0
  ), "surviving train did not stop on precision completion", probe.contacts);
  assert(await precision.page.evaluate(() => window.__game.forceSeraM10ResolveOutcome()),
    "precision outcome did not resolve to debrief");
  probe = await precision.page.evaluate(() => window.__game.seraM10Probe());
  assert(probe.record?.route === "precision" && probe.record.powerCarsEscaped === 1
    && probe.record.materialCarsEscaped === 1 && probe.record.civilianRailDisruption === false,
  "precision result was not persisted", probe.record);
  assertClean(precision, "precision route");
  await precision.context.close();

  // Bridge route: immediate stop, visible missing span, persistent disruption.
  const bridge = await openMission();
  assert(await bridge.page.evaluate(() => window.__game.forceSeraM10BridgeRoute()),
    "bridge route did not enter ACCOMPLISHED hold");
  probe = await bridge.page.evaluate(() => window.__game.seraM10Probe());
  assert(probe.m10.route === "bridge" && probe.m10.bridgeDestroyed
    && probe.m10.civilianRailDisruption,
  "bridge outcome ledger is wrong", probe.m10);
  assert(probe.bridgeVisuals.length === 2 && probe.bridgeVisuals.every((object) => !object.visible),
    "bridge centre span did not disappear", probe.bridgeVisuals);
  const train = probe.contacts.filter((contact) => contact.id >= 201 && contact.id <= 208 && contact.alive);
  assert(train.length === 8 && train.every((contact) => contact.speed === 0),
    "bridge route did not stop all surviving cars", train);
  assert(await bridge.page.evaluate(() => window.__game.forceSeraM10ResolveOutcome()),
    "bridge outcome did not resolve to debrief");
  probe = await bridge.page.evaluate(() => window.__game.seraM10Probe());
  assert(probe.record?.route === "bridge" && probe.record.bridgeDestroyed
    && probe.record.civilianRailDisruption,
  "bridge result was not persisted", probe.record);
  assertClean(bridge, "bridge route");
  await bridge.context.close();

  // Breakthrough failure and the actual Retry button must restore every M10
  // mission-scoped field and rebuild the intact decorator span.
  const failure = await openMission();
  assert(await failure.page.evaluate(() => window.__game.forceSeraM10CriticalEscape()),
    "critical train escape did not fail the mission");
  await failure.page.waitForFunction(() => document.body.dataset.gameState === "gameover", null, { timeout: 10_000 });
  probe = await failure.page.evaluate(() => window.__game.seraM10Probe());
  assert(probe.m10.failed && probe.m10.escapedIds.length === 1 && probe.m10.route === null,
    "breakthrough failure ledger is wrong", probe.m10);
  await failure.page.click("#retryBtn");
  await failure.page.waitForFunction(() => document.body.dataset.gameState === "playing", null, { timeout: 20_000 });
  await failure.page.waitForTimeout(250);
  probe = await failure.page.evaluate(() => window.__game.seraM10Probe());
  assert(!probe.m10.failed && probe.m10.escapedIds.length === 0 && probe.m10.route === null
    && probe.m10.trainCarsDestroyed === 0 && probe.m10.powerCarsEscaped === 0
    && probe.m10.materialCarsEscaped === 0,
  "Retry did not reset M10 mission state", probe.m10);
  assert(probe.bridgeVisuals.length === 2 && probe.bridgeVisuals.every((object) => object.visible),
    "Retry did not restore the intact bridge", probe.bridgeVisuals);
  assertClean(failure, "failure and Retry route");
  await failure.context.close();

  console.log("check_sera_m10_e2e: PASS");
  console.log("  M01-M10 order + M09 unlock gate + Nor preview + precision/bridge/escape/Retry routes");
} finally {
  await browser.close();
  if (served.server) await new Promise((resolve) => served.server.close(resolve));
}
