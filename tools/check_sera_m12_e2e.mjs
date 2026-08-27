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
const chromePath = process.env.SORTIE_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const mime = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json" };
const assert = (condition, message, details = null) => {
  if (condition) return;
  throw new Error(`check_sera_m12_e2e: ${message}${details === null ? "" : `\n${JSON.stringify(details, null, 2)}`}`);
};

function loadPlaywright() {
  for (const candidate of playwrightCandidates) {
    try { return require(candidate); } catch { /* try next */ }
  }
  throw new Error("Playwright is unavailable; set SORTIE_PLAYWRIGHT to an installed copy");
}

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
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const { chromium } = loadPlaywright();
const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
});

async function openMission() {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  await context.addInitScript(() => {
    navigator.getGamepads = () => [];
    localStorage.setItem("sortieHangarPurchases", JSON.stringify({
      schemaVersion: 2, campaigns: { usa: [], rus: [], sera: ["f16"] }
    }));
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto(`${baseUrl}/index.html?seraDev=1`, { waitUntil: "load", timeout: 120_000 });
  await page.waitForFunction(() => Boolean(
    window.__game?.forceStartMissionByKey && window.__game?.seraM12Probe
    && window.__game?.forceSeraM12CutGrid && window.__game?.forceSeraM12ClearJammer
  ), null, { timeout: 120_000 });
  const payloads = await page.evaluate(() => window.__APPLIED_PAYLOADS__ || []);
  assert(payloads.includes("map_norIndustrial") && payloads.includes("mission_sera_m12"),
    "production startup did not apply M12 payloads", payloads);
  assert(await page.evaluate(() => window.__game.forceStartMissionByKey("sera-m12", "f16")),
    "GLASS SWARM could not start through the production launcher");
  await page.waitForFunction(() => window.__game.seraM12Probe()?.state === "playing", null, { timeout: 20_000 });
  await page.waitForTimeout(450);
  return { context, page, pageErrors, consoleErrors };
}

function assertClean(opened, label) {
  assert(opened.pageErrors.length === 0, `page error on ${label}`, opened.pageErrors);
  assert(opened.consoleErrors.length === 0, `console error on ${label}`, opened.consoleErrors);
}

try {
  const grid = await openMission();
  let probe = await grid.page.evaluate(() => window.__game.seraM12Probe());
  assert(probe.worldKey === "norIndustrialBlackout", "M12 launched on the wrong world", probe.worldKey);
  assert(probe.ghostMarkers === 6, "jammer did not inject six non-lockable HUD ghosts", probe);
  const planned = [...probe.contacts.filter((entry) => entry.tgt), ...probe.pending.filter((entry) => entry.tgt)
    .flatMap((entry) => entry.types.map((type) => ({ type })))];
  assert(planned.filter((entry) => entry.type === "jammer").length === 1
      && planned.filter((entry) => entry.type === "s70").length === 6
      && planned.filter((entry) => entry.type === "uav").length === 10,
    "initial board/pending queue lost a designated drone", planned);
  assert(await grid.page.evaluate(() => window.__game.forceSeraM12ClearJammer()),
    "jammer could not be destroyed");
  probe = await grid.page.evaluate(() => window.__game.seraM12Probe());
  assert(probe.ghostMarkers === 0 && probe.swarm.jammerDownFired,
    "jammer ghosts survived relay destruction", probe);
  assert(await grid.page.evaluate(() => window.__game.forceSeraM12CutGrid()),
    "shared power grid route did not activate");
  probe = await grid.page.evaluate(() => window.__game.seraM12Probe());
  assert(probe.swarm.cancelledAircraft === 5
      && !probe.pending.some((entry) => entry.missionTag === "m12Replenishment"),
    "grid cut did not cancel exactly the two pending replenishment flights", probe);
  await grid.page.evaluate(() => window.__game.forceSeraM12DeployPending());
  await grid.page.evaluate(() => window.__game.forceSeraM12ClearDesignated());
  probe = await grid.page.evaluate(() => window.__game.seraM12Probe());
  assert(probe.outcomePending && probe.swarm.completed, "grid-cut route did not reach completion", probe);
  await grid.page.evaluate(() => window.__game.forceSeraM12ResolveOutcome());
  probe = await grid.page.evaluate(() => window.__game.seraM12Probe());
  assert(probe.record?.gridCut === true && probe.record?.civilianHeatingInterrupted === true
      && probe.record?.reinforcementAircraftCancelled === 5,
    "grid-cut result was not persisted", probe.record);
  assertClean(grid, "grid-cut route");
  await grid.context.close();

  const air = await openMission();
  await air.page.evaluate(() => window.__game.forceSeraM12ClearJammer());
  await air.page.evaluate(() => window.__game.forceSeraM12DeployPending());
  probe = await air.page.evaluate(() => window.__game.seraM12Probe());
  assert(probe.contacts.filter((entry) => entry.alive && entry.missionTag === "m12Replenishment").length === 5,
    "all-air route did not launch all five replenishment aircraft", probe);
  await air.page.evaluate(() => window.__game.forceSeraM12ClearDesignated());
  probe = await air.page.evaluate(() => window.__game.seraM12Probe());
  assert(probe.outcomePending && probe.swarm.completed && !probe.swarm.gridCut,
    "all-air route did not complete with power intact", probe);
  await air.page.evaluate(() => window.__game.forceSeraM12ResolveOutcome());
  probe = await air.page.evaluate(() => window.__game.seraM12Probe());
  assert(probe.record?.gridCut === false && probe.record?.civilianHeatingInterrupted === false
      && probe.record?.reinforcementAircraftCancelled === 0,
    "all-air result was not persisted", probe.record);
  assertClean(air, "all-air route");
  await air.context.close();

  console.log("check_sera_m12_e2e: PASS");
  console.log("  jammer ghosts clear / grid-cut cancels five / all-air launches five / both results persist");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
