#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requestedPort = Number(process.env.SORTIE_M09_PORT || 0);
const externalBaseUrl = String(process.env.SORTIE_BASE_URL || "").replace(/\/$/, "");
const artifactDir = path.resolve(process.env.SORTIE_M09_ARTIFACTS || path.join(root, "artifacts"));
const mapScreenshot = path.join(artifactDir, "karan-plain-quality.png");
const missionScreenshot = path.join(artifactDir, "sera-m09-gameplay.png");

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
  throw new Error(`check_sera_m09_e2e: ${message}${suffix}`);
}

function loadPlaywright() {
  for (const candidate of playwrightCandidates) {
    try { return require(candidate); } catch { /* try next installation */ }
  }
  throw new Error("playwright not found; set SORTIE_PLAYWRIGHT or install playwright");
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
  await new Promise((resolve) => server.listen(requestedPort, "127.0.0.1", resolve));
  return { server, port: server.address().port };
}

const payloadQuery = [
  "tools/fixtures/mission_sera_m08_stub.payload.js",
  "payloads/map_karanPlain.payload.js",
  "payloads/mission_sera_m09.payload.js"
].join(",");

const { chromium } = loadPlaywright();
const served = externalBaseUrl ? { server: null, port: null } : await serve();
const baseUrl = externalBaseUrl || `http://127.0.0.1:${served.port}`;
const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
});

async function openPage(url) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  await context.addInitScript(() => {
    navigator.getGamepads = () => [];
    localStorage.setItem("sortieHangarPurchases", JSON.stringify({
      schemaVersion: 2,
      campaigns: { usa: [], rus: [], sera: ["a10"] }
    }));
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto(url, { waitUntil: "load", timeout: 90_000 });
  return { context, page, pageErrors, consoleErrors };
}

async function openMission() {
  const opened = await openPage(`${baseUrl}/index.html?payloads=${payloadQuery}`);
  await opened.page.waitForFunction(
    () => Boolean(
      window.__game?.forceStartMissionByKey
      && window.__game?.seraM09Probe
      && window.__game?.forceSeraM09DeployPending
      && window.__game?.forceSeraM09Complete
    ),
    null,
    { timeout: 90_000 }
  );
  const payloads = await opened.page.evaluate(() => window.__APPLIED_PAYLOADS__ || []);
  for (const payload of [
    "tools/fixtures/mission_sera_m08_stub.payload.js",
    "payloads/map_karanPlain.payload.js",
    "payloads/mission_sera_m09.payload.js"
  ]) {
    assert(payloads.includes(payload), `development loader did not apply ${payload}`, payloads);
  }
  const started = await opened.page.evaluate(() => window.__game.forceStartMissionByKey("sera-m09", "a10"));
  assert(started, "IRON HARVEST could not start through the production launcher");
  await opened.page.waitForFunction(() => document.body.dataset.gameState === "playing", null, { timeout: 20_000 });
  await opened.page.waitForTimeout(350);
  return opened;
}

try {
  fs.mkdirSync(artifactDir, { recursive: true });

  // Visual world gate: the authored decorator must build without a page error.
  const map = await openPage(
    `${baseUrl}/index.html?payloads=payloads/map_karanPlain.payload.js&worldPreview=karanPlain`
  );
  await map.page.waitForFunction(
    () => window.__game?.debug?.worldDecorators?.().activeOn === "karanPlain",
    null,
    { timeout: 90_000 }
  );
  await map.page.waitForTimeout(1800);
  const mapProbe = await map.page.evaluate(() => ({
    label: window.__game.world.label,
    preset: window.__game.world.preset,
    decorator: window.__game.debug.worldDecorators(),
    mesh: window.__game.debug.worldMeshIntegrity()
  }));
  assert(mapProbe.decorator?.activeOn === "karanPlain", "Karan decorator is not active", mapProbe);
  assert(Array.isArray(mapProbe.mesh?.issues) && mapProbe.mesh.issues.length === 0,
    "Karan world contains invalid meshes", mapProbe.mesh);
  await map.page.screenshot({ path: mapScreenshot, fullPage: false });
  assert(map.pageErrors.length === 0, "page error during Karan preview", map.pageErrors);
  assert(map.consoleErrors.length === 0, "console error during Karan preview", map.consoleErrors);
  await map.context.close();

  // Success route: all authored contacts, MLRS pressure, command dispersal and
  // the final ACCOMPLISHED transition run in the real browser host.
  const success = await openMission();
  assert(await success.page.evaluate(() => window.__game.forceSeraM09DeployPending()),
    "delayed MiG-29 pair could not deploy");
  let probe = await success.page.evaluate(() => window.__game.seraM09Probe());
  assert(probe.missionKey === "sera-m09" && probe.worldKey === "karanPlain",
    "wrong mission/world started", probe);
  assert(await success.page.evaluate(() => window.__game.selectedAircraft) === "a10",
    "M09 did not launch in its intended A-10C specialist");
  assert(probe.totalTargets === 18 && probe.totalContacts === 33,
    "resolved target/contact totals changed", probe);
  const alive = probe.contacts.filter((contact) => contact.alive);
  const red = alive.filter((contact) => contact.disposition === "TGT");
  const white = alive.filter((contact) => contact.disposition === "HOSTILE_OPTIONAL");
  const blue = alive.filter((contact) => contact.disposition === "FRIENDLY");
  assert(alive.length === 33 && red.length === 18 && white.length === 6 && blue.length === 9,
    "three-colour contact board is wrong", { alive: alive.length, red: red.length, white: white.length, blue: blue.length });
  assert(blue.every((contact) => contact.friendly && contact.protected && contact.rankNeutral && !contact.tgt),
    "protected ground contacts lost their blue/rank-neutral contract", blue);
  assert(await success.page.evaluate(() => window.__game.seraM09PerfectRankPreview()) === "S",
    "untouched IRON HARVEST is not S-capable");

  assert(await success.page.evaluate(() => window.__game.forceSeraM09MlrsVolley()),
    "MLRS could not fire a forced volley");
  probe = await success.page.evaluate(() => window.__game.seraM09Probe());
  assert(probe.m09.volleys === 1 && probe.m09.friendlyArmorLost === 1 && probe.state === "playing",
    "first MLRS volley did not remove one Kedem tank", probe);
  assert(await success.page.evaluate(() => window.__game.seraM09PerfectRankPreview()) === "A",
    "one Kedem loss did not cap a perfect score at A");

  assert(await success.page.evaluate(() => window.__game.forceSeraM09DestroyCommand()),
    "mobile command could not be destroyed");
  probe = await success.page.evaluate(() => window.__game.seraM09Probe());
  assert(probe.m09.commandDestroyed && probe.m09.dispersedArmor === 8,
    "command loss did not disperse all surviving enemy armour", probe.m09);
  const enemyArmor = probe.contacts.filter((contact) => contact.alive && contact.missionRole === "enemyArmor");
  assert(enemyArmor.length === 8 && enemyArmor.every((contact) => contact.routeEnd > 0),
    "dispersed enemy armour has no live route", enemyArmor);
  await success.page.waitForTimeout(250);
  await success.page.screenshot({ path: missionScreenshot, fullPage: false });

  assert(await success.page.evaluate(() => window.__game.forceSeraM09Complete()),
    "all red TGT could not reach outcome pending");
  probe = await success.page.evaluate(() => window.__game.seraM09Probe());
  assert(probe.outcomePending && probe.kills === 18, "ACCOMPLISHED hold has wrong kill state", probe);
  assert(await success.page.evaluate(() => window.__game.forceSeraM09ResolveOutcome()),
    "ACCOMPLISHED hold could not resolve to debrief");
  assert(success.pageErrors.length === 0, "page error on success route", success.pageErrors);
  assert(success.consoleErrors.length === 0, "console error on success route", success.consoleErrors);
  await success.context.close();

  // Civilian route: loss is a penalty/cap, and the third blue vehicle is a
  // terminal failure rather than a bonus kill.
  const civilianFailure = await openMission();
  assert(await civilianFailure.page.evaluate(() => window.__game.forceSeraM09DestroyCommand()),
    "failure route could not create a positive score baseline");
  probe = await civilianFailure.page.evaluate(() => window.__game.seraM09Probe());
  assert(probe.score === 1000, "command TGT did not award the normal score baseline", probe);
  assert(await civilianFailure.page.evaluate(() => window.__game.forceSeraM09CivilianLoss(1)) === 1,
    "first civilian loss could not be forced");
  probe = await civilianFailure.page.evaluate(() => window.__game.seraM09Probe());
  assert(probe.score === 0 && probe.m09.civilianLosses === 1 && probe.state === "playing",
    "first civilian loss did not subtract score and continue", probe);
  assert(await civilianFailure.page.evaluate(() => window.__game.seraM09PerfectRankPreview()) === "A",
    "first civilian loss did not cap rank at A");
  assert(await civilianFailure.page.evaluate(() => window.__game.forceSeraM09CivilianLoss(1)) === 1,
    "second civilian loss could not be forced");
  assert(await civilianFailure.page.evaluate(() => window.__game.seraM09PerfectRankPreview()) === "B",
    "second civilian loss did not cap rank at B");
  assert(await civilianFailure.page.evaluate(() => window.__game.forceSeraM09CivilianLoss(1)) === 1,
    "third civilian loss could not be forced");
  await civilianFailure.page.waitForFunction(() => document.body.dataset.gameState === "gameover", null, { timeout: 10_000 });
  probe = await civilianFailure.page.evaluate(() => window.__game.seraM09Probe());
  assert(probe.m09.civilianLosses === 3 && probe.m09.failed,
    "third civilian loss was not terminal", probe);
  assert(civilianFailure.pageErrors.length === 0, "page error on civilian-failure route", civilianFailure.pageErrors);
  assert(civilianFailure.consoleErrors.length === 0,
    "console error on civilian-failure route", civilianFailure.consoleErrors);
  await civilianFailure.context.close();

  // MLRS failure route: leaving all three batteries alive costs one friendly
  // tank per volley and ends the sortie at the authored fourth loss.
  const armourFailure = await openMission();
  for (let i = 0; i < 4; i += 1) {
    assert(await armourFailure.page.evaluate(() => window.__game.forceSeraM09MlrsVolley()),
      `forced MLRS volley ${i + 1} did not fire`);
  }
  await armourFailure.page.waitForFunction(() => document.body.dataset.gameState === "gameover", null, { timeout: 10_000 });
  probe = await armourFailure.page.evaluate(() => window.__game.seraM09Probe());
  assert(probe.m09.friendlyArmorLost === 4 && probe.m09.failed,
    "four MLRS volleys did not fail the sortie", probe);
  assert(armourFailure.pageErrors.length === 0, "page error on MLRS-failure route", armourFailure.pageErrors);
  assert(armourFailure.consoleErrors.length === 0,
    "console error on MLRS-failure route", armourFailure.consoleErrors);
  await armourFailure.context.close();

  console.log("check_sera_m09_e2e: PASS");
  console.log("  Karan preview + 33-contact three-colour board + MLRS/command/civilian success and failure routes");
  console.log(`  screenshots: ${mapScreenshot}`);
  console.log(`               ${missionScreenshot}`);
} finally {
  await browser.close();
  if (served.server) await new Promise((resolve) => served.server.close(resolve));
}
