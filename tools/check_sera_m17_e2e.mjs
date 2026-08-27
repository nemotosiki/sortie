#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [process.env.SORTIE_PLAYWRIGHT, "playwright",
  "C:/Users/user01/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright"].filter(Boolean);
let playwright = null;
for (const candidate of candidates) { try { playwright = require(candidate); break; } catch { /* next */ } }
if (!playwright) throw new Error("Playwright is unavailable");
const assert = (condition, message, details = null) => {
  if (condition) return;
  throw new Error(`check_sera_m17_e2e: ${message}${details === null ? "" : `\n${JSON.stringify(details, null, 2)}`}`);
};
const server = http.createServer((request, response) => {
  const relative = decodeURIComponent(request.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
  const file = path.resolve(root, relative);
  if (!(file === root || file.startsWith(`${root}${path.sep}`))) { response.writeHead(403); response.end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404); response.end(); return; }
    const ext = path.extname(file);
    response.writeHead(200, { "Content-Type": ext === ".html" ? "text/html" : (ext === ".json" ? "application/json" : "text/javascript") });
    response.end(data);
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await playwright.chromium.launch({
  executablePath: process.env.SORTIE_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
});
async function openMission() {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  await context.addInitScript(() => {
    navigator.getGamepads = () => [];
    localStorage.setItem("sortieHangarPurchases", JSON.stringify({ schemaVersion: 2, campaigns: { usa: [], rus: [], sera: ["f16"] } }));
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto(`${baseUrl}/index.html?seraDev=1`, { waitUntil: "load", timeout: 120_000 });
  await page.waitForFunction(() => Boolean(window.__game?.forceStartMissionByKey && window.__game?.seraM17Probe), null, { timeout: 120_000 });
  assert(await page.evaluate(() => window.__game.forceStartMissionByKey("sera-m17", "f16")),
    "THE LONG APPROACH could not start through the production launcher");
  await page.waitForFunction(() => window.__game.seraM17Probe()?.state === "playing", null, { timeout: 20_000 });
  await page.waitForTimeout(350);
  return { context, page, pageErrors, consoleErrors };
}
function clean(opened, label) {
  assert(opened.pageErrors.length === 0, `page error on ${label}`, opened.pageErrors);
  assert(opened.consoleErrors.length === 0, `console error on ${label}`, opened.consoleErrors);
}

try {
  const normalRoute = await openMission();
  await normalRoute.page.evaluate(() => window.__game.forceSeraM17DeployPending());
  let probe = await normalRoute.page.evaluate(() => window.__game.seraM17Probe());
  assert(probe.worldKey === "migalOuterHigh"
      && probe.contacts.filter((entry) => entry.alive && entry.missionTag === "m17BomberMain").length === 8
      && probe.contacts.filter((entry) => entry.alive && (entry.missionTag === "m17RedAwacs" || entry.missionTag === "m17RedJammer")).length === 2,
    "eight-bomber/two-support red package changed", probe);
  const helix = probe.contacts.filter((entry) => entry.alive && entry.missionTag === "arcaHelixM17");
  assert(helix.length === 2 && helix.every((entry) => entry.type === "f3" && !entry.tgt && entry.rankNeutral)
      && helix.map((entry) => entry.name).sort().join(",") === "FORGE,SWIFT",
    "HELIX pair is not separate white rank-neutral named F-3 contacts", probe);
  assert(probe.contacts.filter((entry) => entry.alive && entry.type === "mig31").length === 2
      && probe.contacts.filter((entry) => entry.alive && entry.type === "su57").length === 1,
    "high cover or one-prototype limit changed", probe);
  assert(Math.abs(probe.approach.bomberLockTime - 1.785) < 0.001,
    "AWACS+jammer did not extend bomber lock to 2.1x", probe);

  assert(await normalRoute.page.evaluate(() => window.__game.forceSeraM17ClearSupport()) === 2,
    "red electronic support could not be cleared");
  probe = await normalRoute.page.evaluate(() => window.__game.seraM17Probe());
  assert(probe.approach.supportAlive === 0
      && Math.abs(probe.approach.bomberLockTime - probe.approach.baseLockTime) < 0.001,
    "bomber lock delay did not return to baseline", probe);
  await normalRoute.page.evaluate(() => window.__game.forceSeraM17ClearDesignated());
  probe = await normalRoute.page.evaluate(() => window.__game.seraM17Probe());
  assert(probe.outcomePending && probe.approach.completed
      && probe.contacts.filter((entry) => entry.alive && entry.missionTag === "arcaHelixM17").length === 2
      && probe.approach.arcaKillsThisSortie === 0,
    "red-only normal route did not complete while HELIX remained alive", probe);
  assert(await normalRoute.page.evaluate(() => window.__game.forceSeraM17ResolveOutcome()),
    "normal route outcome did not resolve");
  probe = await normalRoute.page.evaluate(() => window.__game.seraM17Probe());
  assert(probe.record?.migalOuterBombHits === 0
      && probe.record?.m17AwacsDestroyed === true
      && probe.record?.m17JammerDestroyed === true
      && probe.record?.arcaKillsThisMission === 0,
    "normal route result was not persisted", probe);
  clean(normalRoute, "normal route");
  await normalRoute.context.close();

  const pursuitRoute = await openMission();
  await pursuitRoute.page.evaluate(() => window.__game.forceSeraM17DeployPending());
  assert(await pursuitRoute.page.evaluate(() => window.__game.forceSeraM17ClearHelix()) === 2,
    "optional HELIX pair could not be destroyed");
  await pursuitRoute.page.evaluate(() => window.__game.forceSeraM17ClearDesignated());
  assert(await pursuitRoute.page.evaluate(() => window.__game.forceSeraM17ResolveOutcome()),
    "HELIX pursuit route outcome did not resolve");
  probe = await pursuitRoute.page.evaluate(() => window.__game.seraM17Probe());
  assert(probe.record?.arcaKillsThisMission === 2 && probe.record?.ravenArcaKills === 2,
    "white HELIX kills were not persisted outside the rank ledger", probe);
  clean(pursuitRoute, "HELIX pursuit route");
  await pursuitRoute.context.close();

  const failureRoute = await openMission();
  for (let i = 0; i < 3; i += 1) {
    assert(await failureRoute.page.evaluate(() => window.__game.forceSeraM17CityHit()),
      `city hit ${i + 1} could not be forced`);
  }
  probe = await failureRoute.page.evaluate(() => window.__game.seraM17Probe());
  assert(probe.state === "gameover" && probe.approach.cityHits === 3,
    "three bomber penetrations did not fail Migal defence", probe);
  clean(failureRoute, "failure route");
  await failureRoute.context.close();

  console.log("check_sera_m17_e2e: PASS");
  console.log("  8+2 red package / 2.1x-to-1.0x lock delay / optional HELIX / one Su-57 / three-hit failure");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
