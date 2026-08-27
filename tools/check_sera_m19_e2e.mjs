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
  throw new Error(`check_sera_m19_e2e: ${message}${details === null ? "" : `\n${JSON.stringify(details, null, 2)}`}`);
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
async function openMission(records = {}) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  await context.addInitScript((seed) => {
    navigator.getGamepads = () => [];
    localStorage.setItem("sortieHangarPurchases", JSON.stringify({ schemaVersion: 2, campaigns: { usa: [], rus: [], sera: ["f16"] } }));
    localStorage.setItem("sortieMissionRecords", JSON.stringify(seed));
  }, records);
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto(`${baseUrl}/index.html?seraDev=1`, { waitUntil: "load", timeout: 120_000 });
  await page.waitForFunction(() => Boolean(window.__game?.forceStartMissionByKey && window.__game?.seraM19Probe), null, { timeout: 120_000 });
  assert(await page.evaluate(() => window.__game.forceStartMissionByKey("sera-m19", "f16")),
    "TRUST FALL could not start through the production launcher");
  await page.waitForFunction(() => window.__game.seraM19Probe()?.state === "playing", null, { timeout: 20_000 });
  await page.waitForTimeout(300);
  return { context, page, pageErrors, consoleErrors };
}
function clean(opened, label) {
  assert(opened.pageErrors.length === 0, `page error on ${label}`, opened.pageErrors);
  assert(opened.consoleErrors.length === 0, `console error on ${label}`, opened.consoleErrors);
}

try {
  const normalRoute = await openMission();
  await normalRoute.page.evaluate(() => window.__game.forceSeraM19DeployPending());
  let probe = await normalRoute.page.evaluate(() => window.__game.seraM19Probe());
  assert(probe.worldKey === "migalOuterSunset"
      && probe.wingmen.some((entry) => entry.label === "CROWN" && entry.type === "f15c")
      && probe.wingmen.some((entry) => entry.label.includes("LARK") && entry.type === "f15"),
    "CROWN F-15C / LARK F-15E blue roster changed", probe);
  assert(probe.escort.length === 4
      && probe.escort.filter((entry) => entry.type === "c17").length === 1
      && probe.escort.filter((entry) => entry.type === "uav").length === 3,
    "four-aircraft ceasefire escort changed", probe);
  const red = probe.contacts.filter((entry) => entry.alive && entry.missionTag === "m19Attackers");
  const white = probe.contacts.filter((entry) => entry.alive && entry.missionTag === "m19ArcaRetreat");
  assert(red.length === 16 && red.every((entry) => entry.tgt)
      && white.length === 4 && white.every((entry) => !entry.tgt && entry.rankNeutral && entry.retreating),
    "16-red/four-white contact contract changed", probe);
  assert(await normalRoute.page.evaluate(() => window.__game.forceSeraM19ClearRed()) === 16,
    "normal route red package could not be cleared");
  assert(await normalRoute.page.evaluate(() => window.__game.forceSeraM19Decision()),
    "normal route decision hold could not complete");
  probe = await normalRoute.page.evaluate(() => window.__game.seraM19Probe());
  assert(probe.outcomePending && probe.contacts.filter((entry) => entry.alive && entry.missionTag === "m19ArcaRetreat").length === 4,
    "white ARCA incorrectly blocked the normal clear", probe);
  assert(await normalRoute.page.evaluate(() => window.__game.forceSeraM19ResolveOutcome()),
    "normal route outcome did not resolve");
  probe = await normalRoute.page.evaluate(() => window.__game.seraM19Probe());
  assert(probe.record?.ceasefireTransportSafe === true
      && probe.record?.rootDistributionDronesSaved === 3
      && probe.record?.ravenFinalPursuit === false
      && probe.record?.seraFinalRoute === "oneShem",
    "normal escort result was not persisted", probe);
  clean(normalRoute, "normal route");
  await normalRoute.context.close();

  const selfDefence = await openMission({
    "sera-m15": { cleared: true, arcaKillsThisMission: 3 },
    "sera-m17": { cleared: true, arcaKillsThisMission: 3 }
  });
  await selfDefence.page.evaluate(() => window.__game.forceSeraM19DeployPending());
  await selfDefence.page.evaluate(() => window.__game.forceSeraM19ClearRed());
  assert(await selfDefence.page.evaluate(() => window.__game.forceSeraM19ClearArca(2)) === 2,
    "two inside-radius ARCA contacts could not be cleared");
  await selfDefence.page.evaluate(() => window.__game.forceSeraM19Decision());
  await selfDefence.page.evaluate(() => window.__game.forceSeraM19ResolveOutcome());
  probe = await selfDefence.page.evaluate(() => window.__game.seraM19Probe());
  assert(probe.record?.ravenArcaKills === 8 && probe.record?.ravenFinalPursuit === false
      && probe.record?.seraFinalRoute === "oneShem",
    "cumulative threshold alone incorrectly selected GIBOR", probe);
  clean(selfDefence, "inside-radius self-defence");
  await selfDefence.context.close();

  const pursuitRoute = await openMission({
    "sera-m15": { cleared: true, arcaKillsThisMission: 3 },
    "sera-m17": { cleared: true, arcaKillsThisMission: 3 }
  });
  await pursuitRoute.page.evaluate(() => window.__game.forceSeraM19DeployPending());
  await pursuitRoute.page.evaluate(() => window.__game.forceSeraM19ClearRed());
  assert(await pursuitRoute.page.evaluate(() => window.__game.forceSeraM19PlayerEscortPosition(true)),
    "player could not be moved outside the authored escort radius");
  assert(await pursuitRoute.page.evaluate(() => window.__game.forceSeraM19ClearArca(2)) === 2,
    "two outside-radius ARCA contacts could not be cleared");
  probe = await pursuitRoute.page.evaluate(() => window.__game.seraM19Probe());
  assert(probe.trust.pursuitKills === 2 && probe.trust.warningFired,
    "distance-qualified final pursuit was not armed", probe);
  await pursuitRoute.page.evaluate(() => window.__game.forceSeraM19Decision());
  await pursuitRoute.page.evaluate(() => window.__game.forceSeraM19ResolveOutcome());
  probe = await pursuitRoute.page.evaluate(() => window.__game.seraM19Probe());
  assert(probe.record?.ravenArcaKills === 8 && probe.record?.ravenFinalPursuit === true
      && probe.record?.seraFinalRoute === "gibor",
    "qualified pursuit plus cumulative threshold did not select GIBOR", probe);
  clean(pursuitRoute, "outside-radius pursuit");
  await pursuitRoute.context.close();

  const failureRoute = await openMission();
  assert(await failureRoute.page.evaluate(() => window.__game.forceSeraM19LoseTransport()),
    "ceasefire transport loss did not fail TRUST FALL");
  probe = await failureRoute.page.evaluate(() => window.__game.seraM19Probe());
  assert(probe.state === "gameover", "transport failure did not enter gameover", probe);
  clean(failureRoute, "transport failure");
  await failureRoute.context.close();

  console.log("check_sera_m19_e2e: PASS");
  console.log("  blue CROWN/LARK / aggregate escort / optional retreat / inside-vs-outside pursuit / ONE SHEM-GIBOR split");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
