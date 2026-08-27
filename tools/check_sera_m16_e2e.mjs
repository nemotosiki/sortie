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
  throw new Error(`check_sera_m16_e2e: ${message}${details === null ? "" : `\n${JSON.stringify(details, null, 2)}`}`);
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
  await page.waitForFunction(() => Boolean(window.__game?.forceStartMissionByKey && window.__game?.seraM16Probe), null, { timeout: 120_000 });
  assert(await page.evaluate(() => window.__game.forceStartMissionByKey("sera-m16", "f16")),
    "HOME FLEET could not start through the production launcher");
  await page.waitForFunction(() => window.__game.seraM16Probe()?.state === "playing", null, { timeout: 20_000 });
  await page.waitForTimeout(350);
  return { context, page, pageErrors, consoleErrors };
}
function clean(opened, label) {
  assert(opened.pageErrors.length === 0, `page error on ${label}`, opened.pageErrors);
  assert(opened.consoleErrors.length === 0, `console error on ${label}`, opened.consoleErrors);
}

try {
  const cleanRoute = await openMission();
  let probe = await cleanRoute.page.evaluate(() => window.__game.seraM16Probe());
  assert(probe.worldKey === "hadorDeepSea" && probe.fleet.label === "HOME FLEET"
      && probe.fleet.units.length === 4 && probe.fleet.units.every((unit) => unit.alive)
      && probe.fleet.integrity === 1,
    "deep-sea map or aggregate four-hull fleet opening is wrong", probe);
  assert(probe.contacts.filter((entry) => entry.missionTag === "m16Bomber" && entry.alive).length === 4
      && probe.contacts.filter((entry) => entry.missionTag === "m16Recon" && entry.alive).length === 1,
    "opening bomber/recon package changed", probe);

  assert(await cleanRoute.page.evaluate(() => window.__game.forceSeraM16SurfaceWindow()) === 2,
    "first SSGN pair did not surface");
  assert(await cleanRoute.page.evaluate(() => window.__game.forceSeraM16LaunchSsgnSalvo()) === 2,
    "first SSGN salvo did not launch");
  probe = await cleanRoute.page.evaluate(() => window.__game.seraM16Probe());
  const firstIds = probe.contacts.filter((entry) => entry.ssgn).map((entry) => entry.id).sort();
  assert(firstIds.join(",") === "1601,1602"
      && probe.contacts.filter((entry) => entry.ssgn && entry.alive && !entry.submerged).length === 2
      && probe.homeFleet.weaponsLaunched === 2,
    "first surfaced window is not using two live authored hulls", probe);

  assert(await cleanRoute.page.evaluate(() => window.__game.forceSeraM16CloseWindow()) === 2,
    "SSGNs did not submerge after the firing window");
  probe = await cleanRoute.page.evaluate(() => window.__game.seraM16Probe());
  assert(probe.contacts.filter((entry) => entry.ssgn && entry.submerged && !entry.alive && !entry.visible).length === 2,
    "submerged SSGNs remained selectable/visible", probe);
  assert(await cleanRoute.page.evaluate(() => window.__game.forceSeraM16NextSurface()) === 2,
    "same SSGNs did not return for the second window");
  assert(await cleanRoute.page.evaluate(() => window.__game.forceSeraM16LaunchSsgnSalvo()) === 2,
    "second SSGN salvo did not launch");
  assert(await cleanRoute.page.evaluate(() => window.__game.forceSeraM16ReleaseBombers()) === 4,
    "four bomber weapons did not release");
  probe = await cleanRoute.page.evaluate(() => window.__game.seraM16Probe());
  assert(probe.homeFleet.weaponsLaunched === 8
      && probe.contacts.filter((entry) => entry.antiShipWeapon && entry.alive).length === 8,
    "maximum eight independent anti-ship contacts were not retained", probe);

  assert(await cleanRoute.page.evaluate(() => window.__game.forceSeraM16InterceptWeapons()) === 8,
    "eight anti-ship contacts could not be intercepted");
  assert(await cleanRoute.page.evaluate(() => window.__game.forceSeraM16ClearSsgns()) === 2,
    "two SSGNs could not be destroyed while surfaced");
  assert(await cleanRoute.page.evaluate(() => window.__game.forceSeraM16ClearBombers()) === 4,
    "four bombers could not be cleared");
  probe = await cleanRoute.page.evaluate(() => window.__game.seraM16Probe());
  assert(probe.outcomePending && probe.homeFleet.completed
      && probe.homeFleet.weaponsIntercepted === 8 && probe.homeFleet.ssgnDestroyed === 2
      && probe.homeFleet.praiseFired,
    "clean HOME FLEET route did not complete with interception/GIBOR ledgers", probe);
  assert(await cleanRoute.page.evaluate(() => window.__game.forceSeraM16ResolveOutcome()),
    "clean route outcome did not resolve");
  probe = await cleanRoute.page.evaluate(() => window.__game.seraM16Probe());
  assert(probe.record?.homeFleetShipsSurvived === 4
      && probe.record?.homeFleetIntegrity === 1
      && probe.record?.epochSurvived === true
      && probe.record?.antiShipWeaponsLaunched === 8
      && probe.record?.antiShipWeaponsIntercepted === 8
      && probe.record?.ssgnDestroyed === 2
      && probe.record?.m20FleetSupportStrength === 4,
    "fleet survival result was not persisted", probe);
  clean(cleanRoute, "clean route");
  await cleanRoute.context.close();

  const failureRoute = await openMission();
  assert(await failureRoute.page.evaluate(() => window.__game.forceSeraM16LoseEpoch()),
    "EPOCH loss did not fail the sortie");
  probe = await failureRoute.page.evaluate(() => window.__game.seraM16Probe());
  assert(probe.state === "gameover" && probe.homeFleet.failed
      && probe.fleet.units.find((unit) => unit.label === "CVN EPOCH")?.alive === false,
    "EPOCH failure state is wrong", probe);
  clean(failureRoute, "failure route");
  await failureRoute.context.close();

  console.log("check_sera_m16_e2e: PASS");
  console.log("  aggregate fleet HP / reusable SSGN windows / 8 interceptable weapons / GIBOR praise / EPOCH failure");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
