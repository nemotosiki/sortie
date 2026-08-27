#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [
  process.env.SORTIE_PLAYWRIGHT,
  "playwright",
  "C:/Users/user01/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright"
].filter(Boolean);
let playwright = null;
for (const candidate of candidates) {
  try { playwright = require(candidate); break; } catch { /* next */ }
}
if (!playwright) throw new Error("Playwright is unavailable");
const assert = (condition, message, details = null) => {
  if (condition) return;
  throw new Error(`check_sera_m14_e2e: ${message}${details === null ? "" : `\n${JSON.stringify(details, null, 2)}`}`);
};
const server = http.createServer((request, response) => {
  const relative = decodeURIComponent(request.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
  const file = path.resolve(root, relative);
  if (!(file === root || file.startsWith(`${root}${path.sep}`))) {
    response.writeHead(403); response.end(); return;
  }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404); response.end(); return; }
    const ext = path.extname(file);
    const type = ext === ".html" ? "text/html; charset=utf-8"
      : (ext === ".js" || ext === ".mjs" ? "text/javascript; charset=utf-8" : "application/octet-stream");
    response.writeHead(200, { "content-type": type, "cache-control": "no-store" });
    response.end(data);
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;
const browser = await playwright.chromium.launch({
  executablePath: process.env.SORTIE_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true
});

async function openMission() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto(`${baseUrl}/index.html?seraDev=1`, { waitUntil: "load", timeout: 120_000 });
  await page.waitForFunction(
    () => Boolean(window.__game?.forceStartMissionByKey && window.__game?.seraM14Probe),
    null,
    { timeout: 120_000 }
  );
  assert(await page.evaluate(() => window.__game.forceStartMissionByKey("sera-m14", "f16")),
    "BREAKWATER could not start through the production launcher");
  await page.waitForFunction(() => window.__game.seraM14Probe()?.state === "playing", null, { timeout: 20_000 });
  await page.waitForTimeout(600);
  return { context, page, pageErrors, consoleErrors };
}
function clean(opened, label) {
  assert(opened.pageErrors.length === 0, `page error on ${label}`, opened.pageErrors);
  assert(opened.consoleErrors.length === 0, `console error on ${label}`, opened.consoleErrors);
}
const plannedTypes = (probe, predicate) => [
  ...probe.contacts.filter(predicate).map((entry) => entry.type),
  ...probe.pending.filter(predicate).flatMap((entry) => entry.types)
];

try {
  const partial = await openMission();
  let probe = await partial.page.evaluate(() => window.__game.seraM14Probe());
  assert(probe.worldKey === "naharMudflats" && probe.f35cUnlocked === false,
    "M14 world or pre-clear F-35C gate is wrong", probe);
  const hospital = probe.friendlies.find((entry) => entry.type === "hospitalShip");
  assert(hospital?.kind === "ship" && hospital.alive && !hospital.vulnerable
      && !probe.contacts.some((entry) => entry.type === "hospitalShip"),
    "hospital ship entered an enemy/lockable collection", probe);

  const red = plannedTypes(probe, (entry) => entry.tgt && entry.missionTag === "m14AssaultCapacity");
  assert(red.filter((type) => type === "lhd").length === 1
      && red.filter((type) => type === "landingShip").length === 4
      && red.length === 5,
    "red objective is not capacity-only", red);
  const screen = plannedTypes(probe, (entry) => !entry.tgt && entry.missionTag === "m14EscortScreen");
  assert(screen.filter((type) => type === "aegis").length === 1
      && screen.filter((type) => type === "frigate").length === 2
      && screen.filter((type) => type === "missileBoat").length === 4,
    "white escort screen totals changed", screen);
  const air = plannedTypes(probe, (entry) => !entry.tgt && entry.missionTag === "m14CarrierAir");
  assert(air.filter((type) => type === "su33").length === 6
      && air.filter((type) => type === "ka52").length === 4,
    "white optional air totals changed", air);
  const transferLine = probe.interdiction.transferLine;
  const approachBefore = new Map(probe.contacts
    .filter((entry) => entry.alive && entry.tgt && entry.missionTag === "m14AssaultCapacity")
    .map((entry) => [entry.id, Math.hypot(entry.x - transferLine.x, entry.z - transferLine.z)]));
  await partial.page.waitForTimeout(1200);
  probe = await partial.page.evaluate(() => window.__game.seraM14Probe());
  const approachAfter = probe.contacts
    .filter((entry) => approachBefore.has(entry.id))
    .map((entry) => ({
      id: entry.id,
      speed: entry.speed,
      before: approachBefore.get(entry.id),
      after: Math.hypot(entry.x - transferLine.x, entry.z - transferLine.z)
    }));
  assert(approachAfter.length === 3
      && approachAfter.every((entry) => entry.speed === 16 && entry.after < entry.before - 8),
    "initial LHD/LST column is not physically advancing toward the transfer line", approachAfter);
  const hud = await partial.page.evaluate(() => ({
    directive: document.querySelector("#m11EwDirective strong")?.textContent || "",
    directiveVisible: document.getElementById("m11EwDirective")?.classList.contains("visible"),
    baseVisible: document.getElementById("baseMarker")?.classList.contains("visible")
  }));
  assert(hud.directiveVisible && hud.directive.includes("INTERDICT ASSAULT CAPACITY") && !hud.baseVisible,
    "offshore directive/hidden transfer marker is wrong", hud);
  if (process.env.SORTIE_M14_SCREENSHOT) {
    await partial.page.screenshot({ path: process.env.SORTIE_M14_SCREENSHOT });
  }

  assert(await partial.page.evaluate(() => window.__game.forceSeraM14DeployPending()),
    "M14 pending force did not deploy");
  assert(await partial.page.evaluate(() => window.__game.forceSeraM14CrossAssaultShip(0)),
    "first assault hull did not cross the transfer line");
  probe = await partial.page.evaluate(() => window.__game.seraM14Probe());
  assert(probe.state === "playing" && !probe.outcomePending
      && probe.interdiction.escapedIds.length === 1
      && probe.interdiction.remaining === 4,
    "one crossing must continue with four objectives", probe);
  await partial.page.evaluate(() => window.__game.forceSeraM14ClearDesignated());
  probe = await partial.page.evaluate(() => window.__game.seraM14Probe());
  const optionalAlive = probe.contacts.filter((entry) => entry.alive && !entry.tgt
    && (entry.missionTag === "m14EscortScreen" || entry.missionTag === "m14CarrierAir")).length;
  assert(probe.outcomePending && probe.interdiction.completed && optionalAlive > 0,
    "capacity clear waited for optional white contacts", probe);
  await partial.page.evaluate(() => window.__game.forceSeraM14ResolveOutcome());
  probe = await partial.page.evaluate(() => window.__game.seraM14Probe());
  assert(probe.record?.assaultShipsStopped === 4
      && probe.record?.landingShipsEscaped === 1
      && probe.record?.landingShipsBeached === 1
      && probe.record?.landedArmorSpawned === 0
      && probe.record?.hospitalShipSafe === true
      && ["A", "B", "C"].includes(probe.record?.rank)
      && probe.f35cUnlocked === true,
    "partial-stop result/rank cap/F-35C unlock was not persisted", probe);
  clean(partial, "one-crossing route");
  await partial.context.close();

  const perfect = await openMission();
  await perfect.page.evaluate(() => window.__game.forceSeraM14DeployPending());
  await perfect.page.evaluate(() => window.__game.forceSeraM14ClearDesignated());
  probe = await perfect.page.evaluate(() => window.__game.seraM14Probe());
  assert(probe.outcomePending && probe.interdiction.remaining === 0
      && probe.interdiction.escapedIds.length === 0,
    "perfect interception did not complete", probe);
  await perfect.page.evaluate(() => window.__game.forceSeraM14ResolveOutcome());
  probe = await perfect.page.evaluate(() => window.__game.seraM14Probe());
  assert(probe.record?.assaultShipsStopped === 5
      && probe.record?.landingShipsEscaped === 0
      && probe.record?.landingShipsBeached === 0
      && probe.record?.landedArmorSpawned === 0
      && probe.record?.hospitalShipSafe === true
      && probe.f35cUnlocked === true,
    "perfect interception result/F-35C unlock was not persisted", probe);
  clean(perfect, "perfect route");
  await perfect.context.close();

  const failed = await openMission();
  await failed.page.evaluate(() => window.__game.forceSeraM14DeployPending());
  assert(await failed.page.evaluate(() => window.__game.forceSeraM14CrossAssaultShip(0)),
    "failure route first crossing failed");
  assert(await failed.page.evaluate(() => window.__game.forceSeraM14CrossAssaultShip(1)),
    "failure route second crossing failed");
  probe = await failed.page.evaluate(() => window.__game.seraM14Probe());
  assert(probe.state === "gameover" && probe.interdiction.failed
      && probe.interdiction.escapedIds.length === 2 && !probe.outcomePending,
    "two crossings did not fail the mission", probe);
  clean(failed, "two-crossing failure");
  await failed.context.close();

  console.log("check_sera_m14_e2e: PASS");
  console.log("  physical approach / objective IFF / HUD deadline / 1-cross A cap / perfect clear / 2-cross fail / blue hospital / F-35C unlock");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
