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
  throw new Error(`check_sera_m15_e2e: ${message}${details === null ? "" : `\n${JSON.stringify(details, null, 2)}`}`);
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
  await page.waitForFunction(() => Boolean(window.__game?.forceStartMissionByKey && window.__game?.seraM15Probe), null, { timeout: 120_000 });
  assert(await page.evaluate(() => window.__game.forceStartMissionByKey("sera-m15", "f16")),
    "NIGHT OF NUMBERS could not start through the production launcher");
  await page.waitForFunction(() => window.__game.seraM15Probe()?.state === "playing", null, { timeout: 20_000 });
  await page.waitForTimeout(350);
  return { context, page, pageErrors, consoleErrors };
}
function clean(opened, label) {
  assert(opened.pageErrors.length === 0, `page error on ${label}`, opened.pageErrors);
  assert(opened.consoleErrors.length === 0, `console error on ${label}`, opened.consoleErrors);
}

try {
  const cleanRoute = await openMission();
  let probe = await cleanRoute.page.evaluate(() => window.__game.seraM15Probe());
  assert(probe.worldKey === "migalCityNight" && probe.facilities.length === 3
      && probe.facilities.every((facility) => facility.alive) && probe.ghostMarkers === 7,
    "M15 map/district/jammer opening is wrong", probe);
  assert(probe.friendlies.filter((entry) => entry.label.startsWith("ARCA CIVIC WATCH")).length === 2
      && probe.contacts.filter((entry) => entry.missionTag === "arcaWhiteM15").length === 0,
    "blue and white ARCA overlapped at mission start", probe);

  await cleanRoute.page.evaluate(() => window.__game.forceSeraM15ClearJammer());
  await cleanRoute.page.evaluate(() => window.__game.forceSeraM15DeployPending());
  const launched = await cleanRoute.page.evaluate(() => window.__game.forceSeraM15ReleaseCruiseWeapons());
  probe = await cleanRoute.page.evaluate(() => window.__game.seraM15Probe());
  assert(launched === 4 && probe.ghostMarkers === 0
      && probe.contacts.filter((entry) => entry.alive && entry.type === "tu22m3").length === 6
      && probe.contacts.filter((entry) => entry.alive && entry.type === "su35").length === 6
      && probe.contacts.filter((entry) => entry.alive && entry.type === "cruiseWeapon").length === 4,
    "three-lane attack package or independent cruise contacts changed", probe);
  assert(probe.facilities.every((facility) => facility.alive)
      && probe.facilities.filter((facility) => facility.hp === 50).length === 2,
    "the two non-cruise bombers did not release their direct weapons", probe);

  assert(await cleanRoute.page.evaluate(() => window.__game.forceSeraM15RetireBlueArca()) === 2,
    "blue ARCA flight did not retire");
  probe = await cleanRoute.page.evaluate(() => window.__game.seraM15Probe());
  assert(probe.friendlies.filter((entry) => entry.label.startsWith("ARCA CIVIC WATCH"))
      .every((entry) => entry.retired)
      && probe.contacts.filter((entry) => entry.alive && entry.missionTag === "arcaWhiteM15").length === 2,
    "white ARCA was not spawned as a separate post-retirement object", probe);
  assert(await cleanRoute.page.evaluate(() => window.__game.forceSeraM15ClearWhiteArca()) === 2,
    "white ARCA pair could not be destroyed as optional contacts");
  await cleanRoute.page.evaluate(() => window.__game.forceSeraM15ClearDesignated());
  probe = await cleanRoute.page.evaluate(() => window.__game.seraM15Probe());
  assert(probe.outcomePending && probe.city.completed && probe.city.cruiseIntercepted === 4
      && probe.city.arcaKillsThisSortie === 2,
    "clean city route did not complete with cruise/ARCA ledgers", probe);
  await cleanRoute.page.evaluate(() => window.__game.forceSeraM15ResolveOutcome());
  probe = await cleanRoute.page.evaluate(() => window.__game.seraM15Probe());
  assert(probe.record?.migalDistrictsSaved === 3
      && probe.record?.cruiseWeaponsLaunched === 4
      && probe.record?.cruiseWeaponsIntercepted === 4
      && probe.record?.arcaKillsThisMission === 2
      && probe.record?.ravenArcaKills === 2,
    "clean route result was not persisted", probe);
  clean(cleanRoute, "clean route");
  await cleanRoute.context.close();

  const failureRoute = await openMission();
  await failureRoute.page.evaluate(() => window.__game.forceSeraM15ClearJammer());
  await failureRoute.page.evaluate(() => window.__game.forceSeraM15DeployPending());
  await failureRoute.page.evaluate(() => window.__game.forceSeraM15ReleaseCruiseWeapons());
  // One ROOT, one POWER and two HOSPITAL weapons combine with the two direct
  // releases to destroy all three districts.
  for (let index = 0; index < 4; index += 1) {
    await failureRoute.page.evaluate(() => window.__game.forceSeraM15ImpactCruise(0));
  }
  probe = await failureRoute.page.evaluate(() => window.__game.seraM15Probe());
  assert(probe.city.failed && probe.state === "gameover"
      && probe.facilities.every((facility) => !facility.alive),
    "all-district-loss route did not fail", probe);
  clean(failureRoute, "failure route");
  await failureRoute.context.close();

  console.log("check_sera_m15_e2e: PASS");
  console.log("  3 districts / 6+6 attack package / 4 independent cruise contacts / separate white ARCA / loss route");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
