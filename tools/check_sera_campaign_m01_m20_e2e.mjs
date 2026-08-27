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
  throw new Error(`check_sera_campaign_m01_m20_e2e: ${message}${details === null ? "" : `\n${JSON.stringify(details, null, 2)}`}`);
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

const expected = Array.from({ length: 20 }, (_, index) => `sera-m${String(index + 1).padStart(2, "0")}`);
const pageErrors = [];
const consoleErrors = [];
async function campaignPage(records, dev = false) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript((seed) => {
    navigator.getGamepads = () => [];
    localStorage.clear();
    localStorage.setItem("sortieMissionRecords", JSON.stringify(seed));
    localStorage.setItem("sortieHangarPurchases", JSON.stringify({ schemaVersion: 2, campaigns: { usa: [], rus: [], sera: ["f16"] } }));
  }, records);
  const page = await context.newPage();
  page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto(`${baseUrl}/index.html${dev ? "?seraDev=1" : ""}`, { waitUntil: "load", timeout: 120_000 });
  await page.waitForFunction(() => Boolean(window.__game?.debug?.missionKeys && window.__game?.missionTable), null, { timeout: 120_000 });
  return { context, page };
}

try {
  const fresh = await campaignPage({});
  await fresh.page.evaluate(() => window.__game.debug.forceCampaign("sera"));
  await fresh.page.waitForTimeout(100);
  let snapshot = await fresh.page.evaluate(() => {
    const rows = window.__game.missionTable
      .map((mission, index) => ({ key: mission.key, unlocked: window.__game.mission.unlocked[index] }))
      .filter((entry) => entry.key.startsWith("sera-m"));
    return { rows, campaign: window.__game.campaign.list.find((entry) => entry.id === "sera") };
  });
  assert(snapshot.rows.map((entry) => entry.key).join(",") === expected.join(","),
    "Sera campaign is not ordered M01 through M20", snapshot);
  assert(snapshot.rows.filter((entry) => entry.unlocked).map((entry) => entry.key).join(",") === "sera-m01",
    "fresh profile did not expose only M01", snapshot);
  assert(snapshot.campaign?.missions === 20, "campaign card does not report twenty missions", snapshot.campaign);
  await fresh.context.close();

  const throughM19 = Object.fromEntries(expected.slice(0, 19).map((key) => [key, { cleared: true, rank: "A" }]));
  const finalOpen = await campaignPage(throughM19);
  assert(await finalOpen.page.evaluate(() => window.__game.debug.forceCampaignCursor("sera")),
    "Sera campaign card could not be selected");
  assert(await finalOpen.page.evaluate(() => window.__game.debug.forceConfirmCampaign()),
    "Sera campaign card did not enter mission select");
  const m20Index = await finalOpen.page.evaluate(() => window.__game.debug.missionIndexOf("sera-m20"));
  assert(await finalOpen.page.evaluate((index) => window.__game.debug.forceMissionCursor(index), m20Index),
    "M20 could not be selected through the normal mission list");
  await finalOpen.page.waitForTimeout(100);
  snapshot = await finalOpen.page.evaluate(() => ({
    unlocked: window.__game.mission.unlocked,
    table: window.__game.missionTable.map((entry) => entry.key),
    missionName: document.getElementById("missionInfoName")?.textContent,
    confirmDisabled: document.getElementById("missionConfirmBtn")?.disabled,
    campaignKeys: window.__game.mission.campaignKeys
  }));
  const seraIndices = snapshot.table.map((key, index) => key.startsWith("sera-m") ? index : -1).filter((index) => index >= 0);
  assert(seraIndices.every((index) => snapshot.unlocked[index]),
    "M01-M19 clear record did not unlock the complete M01-M20 chain", snapshot);
  assert(snapshot.missionName === "THE GUARANTOR" && snapshot.confirmDisabled === false
      && snapshot.campaignKeys.join(",") === expected.join(","),
    "normal mission-select UI did not expose M20", snapshot);
  assert(await finalOpen.page.evaluate(() => window.__game.debug.forceConfirmMission()),
    "normal M20 selection did not enter briefing");
  await finalOpen.context.close();

  // M04-M06 are the only campaign rows without their own browser objective
  // script. Boot each through the same production launch hook and keep it live
  // long enough for its world, first wave and HUD to update.
  const smokeExpected = new Map([
    ["sera-m04", "naharStrait"],
    ["sera-m05", "sarkPortAsh"],
    ["sera-m06", "whitePass"]
  ]);
  for (const [key, world] of smokeExpected) {
    const opened = await campaignPage({}, true);
    assert(await opened.page.evaluate((missionKey) => window.__game.forceStartMissionByKey(missionKey, "f16"), key),
      `${key} could not launch`);
    await opened.page.waitForFunction((missionKey) => (
      window.__game.state === "playing" && window.__game.mission.key === missionKey
    ), key, { timeout: 20_000 });
    await opened.page.waitForTimeout(350);
    const live = await opened.page.evaluate(() => ({
      state: window.__game.state,
      key: window.__game.mission.key,
      world: window.__game.world.preset,
      contacts: window.__game.mission.enemies.length,
      friendlies: window.__game.friendlies.length
    }));
    assert(live.state === "playing" && live.key === key && live.world === world
        && live.contacts > 0 && live.friendlies >= 2,
      `${key} did not produce a playable first frame`, live);
    await opened.context.close();
  }

  assert(pageErrors.length === 0, "page errors during campaign chain/smoke", pageErrors);
  assert(consoleErrors.length === 0, "console errors during campaign chain/smoke", consoleErrors);
  console.log("check_sera_campaign_m01_m20_e2e: PASS");
  console.log("  fresh M01-only unlock / exact M01-M20 order / M19->M20 unlock / normal M20 selection / M04-M06 live smoke");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
