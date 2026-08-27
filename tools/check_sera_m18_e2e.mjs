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
  throw new Error(`check_sera_m18_e2e: ${message}${details === null ? "" : `\n${JSON.stringify(details, null, 2)}`}`);
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
async function openMission(prior = null) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  await context.addInitScript((seed) => {
    navigator.getGamepads = () => [];
    localStorage.setItem("sortieHangarPurchases", JSON.stringify({ schemaVersion: 2, campaigns: { usa: [], rus: [], sera: ["f16"] } }));
    if (seed) localStorage.setItem("sortieMissionRecords", JSON.stringify({ "sera-m10": seed }));
  }, prior);
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto(`${baseUrl}/index.html?seraDev=1`, { waitUntil: "load", timeout: 120_000 });
  await page.waitForFunction(() => Boolean(window.__game?.forceStartMissionByKey && window.__game?.seraM18Probe), null, { timeout: 120_000 });
  assert(await page.evaluate(() => window.__game.forceStartMissionByKey("sera-m18", "f16")),
    "HORN OF HEAVEN could not start through the production launcher");
  await page.waitForFunction(() => window.__game.seraM18Probe()?.state === "playing", null, { timeout: 20_000 });
  await page.waitForTimeout(300);
  return { context, page, pageErrors, consoleErrors };
}
function clean(opened, label) {
  assert(opened.pageErrors.length === 0, `page error on ${label}`, opened.pageErrors);
  assert(opened.consoleErrors.length === 0, `console error on ${label}`, opened.consoleErrors);
}

try {
  const radarRoute = await openMission();
  let probe = await radarRoute.page.evaluate(() => window.__game.seraM18Probe());
  const alive = (type) => probe.contacts.filter((entry) => entry.alive && entry.type === type).length;
  assert(probe.worldKey === "aradMountainsArchive"
      && alive("kerenGun") === 6 && alive("kerenPylon") === 3
      && alive("kerenCooler") === 2 && alive("kerenRadar") === 2
      && alive("kerenCore") === 0 && probe.pendingGround.length === 1,
    "initial KEREN component board or dormant core changed", probe);
  await radarRoute.page.evaluate(() => window.__game.forceSeraM18DeployPending());
  probe = await radarRoute.page.evaluate(() => window.__game.seraM18Probe());
  assert(probe.contacts.filter((entry) => entry.alive && entry.type === "ka52").length === 4
      && probe.contacts.filter((entry) => entry.alive && entry.type === "mig29").length === 4
      && probe.contacts.filter((entry) => entry.alive && entry.type === "su57").length === 1,
    "M18 air package or one-prototype limit changed", probe);
  assert(await radarRoute.page.evaluate(() => window.__game.forceSeraM18ClearCoolers()) === 2,
    "cooling plants could not be destroyed");
  probe = await radarRoute.page.evaluate(() => window.__game.seraM18Probe());
  assert(probe.keren.route === null && !probe.keren.coreExposed,
    "coolers incorrectly selected a primary route", probe);
  assert(await radarRoute.page.evaluate(() => window.__game.forceSeraM18Route("radar")),
    "radar route did not expose the core");
  probe = await radarRoute.page.evaluate(() => window.__game.seraM18Probe());
  assert(probe.keren.route === "radar" && probe.keren.destroyed.radar === 2
      && probe.keren.coreExposed && probe.keren.coreMaxHp === 170,
    "radar route/core cooling durability changed", probe);
  assert(await radarRoute.page.evaluate(() => window.__game.forceSeraM18ClearCore()),
    "exposed command core could not complete M18");
  assert(await radarRoute.page.evaluate(() => window.__game.forceSeraM18ResolveOutcome()),
    "radar route outcome did not resolve");
  probe = await radarRoute.page.evaluate(() => window.__game.seraM18Probe());
  assert(probe.record?.kerenRoute === "radar" && probe.record?.aradCivilianBlackout === false
      && probe.record?.kerenCoreDurability === 170 && probe.record?.kerenComponentsDestroyed === 4,
    "radar route result was not persisted", probe);
  clean(radarRoute, "radar route");
  await radarRoute.context.close();

  const powerRoute = await openMission({ cleared: true, powerCarsEscaped: 2, materialCarsEscaped: 3 });
  probe = await powerRoute.page.evaluate(() => window.__game.seraM18Probe());
  assert(probe.keren.priorPowerEscaped === 2 && probe.keren.priorMaterialEscaped === 3
      && probe.keren.fireInterval === 40,
    "M10 escaped power/material state did not reach M18", probe);
  assert(await powerRoute.page.evaluate(() => window.__game.forceSeraM18Route("power")),
    "power route did not expose the core");
  probe = await powerRoute.page.evaluate(() => window.__game.seraM18Probe());
  assert(probe.keren.route === "power" && probe.keren.coreMaxHp === 336
      && probe.keren.fireInterval === 82 && probe.keren.civilianOutage,
    "power route interval/outage/material durability changed", probe);
  await powerRoute.page.evaluate(() => window.__game.forceSeraM18ClearCore());
  await powerRoute.page.evaluate(() => window.__game.forceSeraM18ResolveOutcome());
  probe = await powerRoute.page.evaluate(() => window.__game.seraM18Probe());
  assert(probe.record?.kerenRoute === "power" && probe.record?.aradCivilianBlackout === true,
    "power-route civilian result was not persisted", probe);
  clean(powerRoute, "power route");
  await powerRoute.context.close();

  const directRoute = await openMission();
  assert(await directRoute.page.evaluate(() => window.__game.forceSeraM18Route("direct")),
    "direct gun route did not expose the core");
  probe = await directRoute.page.evaluate(() => window.__game.seraM18Probe());
  assert(probe.keren.destroyed.direct === 6 && probe.keren.coreExposed
      && probe.contacts.filter((entry) => entry.alive && entry.type === "kerenGun").length === 0,
    "direct route did not destroy all six barrels", probe);
  await directRoute.page.evaluate(() => window.__game.forceSeraM18ClearCore());
  await directRoute.page.evaluate(() => window.__game.forceSeraM18ResolveOutcome());
  probe = await directRoute.page.evaluate(() => window.__game.seraM18Probe());
  assert(probe.record?.kerenRoute === "direct" && probe.record?.aradCivilianBlackout === false,
    "direct route result was not persisted", probe);
  clean(directRoute, "direct route");
  await directRoute.context.close();

  const failureRoute = await openMission();
  for (let i = 0; i < 3; i += 1) {
    assert(await failureRoute.page.evaluate(() => window.__game.forceSeraM18StrategicShot(true)),
      `strategic hit ${i + 1} could not be forced`);
  }
  probe = await failureRoute.page.evaluate(() => window.__game.seraM18Probe());
  assert(probe.state === "gameover" && probe.keren.strategicHits === 3,
    "three KEREN impacts did not fail the mission", probe);
  clean(failureRoute, "strategic failure");
  await failureRoute.context.close();

  console.log("check_sera_m18_e2e: PASS");
  console.log("  dormant core / radar-power-direct routes / M10 carry-over / civilian outage / three-impact failure");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
