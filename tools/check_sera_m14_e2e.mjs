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
  throw new Error(`check_sera_m14_e2e: ${message}${details === null ? "" : `\n${JSON.stringify(details, null, 2)}`}`);
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
  await page.waitForFunction(() => Boolean(window.__game?.forceStartMissionByKey && window.__game?.seraM14Probe), null, { timeout: 120_000 });
  assert(await page.evaluate(() => window.__game.forceStartMissionByKey("sera-m14", "f16")),
    "BREAKWATER could not start through the production launcher");
  await page.waitForFunction(() => window.__game.seraM14Probe()?.state === "playing", null, { timeout: 20_000 });
  await page.waitForTimeout(500);
  return { context, page, pageErrors, consoleErrors };
}
function clean(opened, label) {
  assert(opened.pageErrors.length === 0, `page error on ${label}`, opened.pageErrors);
  assert(opened.consoleErrors.length === 0, `console error on ${label}`, opened.consoleErrors);
}

try {
  const landed = await openMission();
  let probe = await landed.page.evaluate(() => window.__game.seraM14Probe());
  assert(probe.worldKey === "naharMudflats" && probe.f35cUnlocked === false,
    "M14 world or pre-clear F-35C gate is wrong", probe);
  const hospital = probe.friendlies.find((entry) => entry.type === "hospitalShip");
  assert(hospital?.kind === "ship" && hospital.alive && !hospital.vulnerable
      && !probe.contacts.some((entry) => entry.type === "hospitalShip"),
    "hospital ship entered an enemy/lockable collection", probe);
  const plannedTypes = [
    ...probe.contacts.filter((entry) => entry.tgt).map((entry) => entry.type),
    ...probe.pending.filter((entry) => entry.tgt).flatMap((entry) => entry.types)
  ];
  assert(plannedTypes.filter((type) => type === "lhd").length === 1
      && plannedTypes.filter((type) => type === "landingShip").length === 4
      && plannedTypes.filter((type) => type === "missileBoat").length === 4
      && plannedTypes.filter((type) => type === "su33").length === 6
      && plannedTypes.filter((type) => type === "ka52").length === 4,
    "M14 force totals changed", plannedTypes);
  for (let slot = 0; slot < 4; slot += 1) {
    await landed.page.evaluate((index) => window.__game.forceSeraM14BeachLandingShip(index), slot);
  }
  probe = await landed.page.evaluate(() => window.__game.seraM14Probe());
  const armor = probe.contacts.filter((entry) => entry.alive && entry.mark === "m14LandedArmor");
  assert(probe.landing.beachedIds.length === 4 && armor.length === 8
      && armor.filter((entry) => entry.type === "tank").length === 6
      && armor.filter((entry) => entry.type === "spaag").length === 2,
    "four beached LSTs did not create the 6+2 ground phase", probe);
  await landed.page.evaluate(() => window.__game.forceSeraM14DeployPending());
  await landed.page.evaluate(() => window.__game.forceSeraM14ClearDesignated());
  probe = await landed.page.evaluate(() => window.__game.seraM14Probe());
  assert(probe.outcomePending && probe.landing.completed,
    "landed-armor route did not complete", probe);
  await landed.page.evaluate(() => window.__game.forceSeraM14ResolveOutcome());
  probe = await landed.page.evaluate(() => window.__game.seraM14Probe());
  assert(probe.record?.landingShipsBeached === 4 && probe.record?.landedArmorSpawned === 8
      && probe.record?.hospitalShipSafe === true && probe.f35cUnlocked === true,
    "landed route result/F-35C unlock was not persisted", probe);
  clean(landed, "landed route");
  await landed.context.close();

  const sea = await openMission();
  await sea.page.evaluate(() => window.__game.forceSeraM14DeployPending());
  await sea.page.evaluate(() => window.__game.forceSeraM14ClearDesignated());
  probe = await sea.page.evaluate(() => window.__game.seraM14Probe());
  assert(probe.outcomePending && probe.landing.beachedIds.length === 0
      && probe.landing.landedArmorSpawned === 0,
    "sea-intercept route spawned landed armor", probe);
  await sea.page.evaluate(() => window.__game.forceSeraM14ResolveOutcome());
  probe = await sea.page.evaluate(() => window.__game.seraM14Probe());
  assert(probe.record?.landingShipsBeached === 0 && probe.record?.landedArmorSpawned === 0
      && probe.record?.hospitalShipSafe === true && probe.f35cUnlocked === true,
    "sea-intercept result/F-35C unlock was not persisted", probe);
  clean(sea, "sea route");
  await sea.context.close();

  console.log("check_sera_m14_e2e: PASS");
  console.log("  blue hospital non-target / four LSTs spawn tanks x6 + SPAAG x2 / sea route / F-35C unlock");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
