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
  try { playwright = require(candidate); break; } catch { /* try next */ }
}
if (!playwright) throw new Error("Playwright is unavailable");

const assert = (condition, message, details = null) => {
  if (condition) return;
  const suffix = details === null ? "" : `\n${JSON.stringify(details, null, 2)}`;
  throw new Error(`check_sera_aircraft_progression_e2e: ${message}${suffix}`);
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
    response.writeHead(200, {
      "Content-Type": ext === ".html" ? "text/html" : (ext === ".json" ? "application/json" : "text/javascript")
    });
    response.end(data);
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await playwright.chromium.launch({
  executablePath: process.env.SORTIE_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
});

const SERA_KEYS = Array.from({ length: 20 }, (_, index) => `sera-m${String(index + 1).padStart(2, "0")}`);
const EXPECTED_ROSTER = [
  "f16", "f4", "f2a", "fa18", "f111f", "a10", "f15c", "f15", "f14", "f35c", "f22"
];
const UNLOCKS = {
  f4: "sera-m02", f2a: "sera-m03", fa18: "sera-m04", f111f: "sera-m07",
  a10: "sera-m08", f15c: "sera-m09", f15: "sera-m09", f14: "sera-m10", f35c: "sera-m14"
};

function record(rank = "A", score = 120_000) {
  return { rank, scores: [score], times: [180], cleared: true };
}

async function openProfile(records, purchases = ["f22"]) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(({ seededRecords, seededPurchases }) => {
    navigator.getGamepads = () => [];
    localStorage.clear();
    localStorage.setItem("sortieMissionRecords", JSON.stringify(seededRecords));
    localStorage.setItem("sortieHangarPurchases", JSON.stringify({
      schemaVersion: 2,
      campaigns: { usa: [], rus: [], sera: seededPurchases }
    }));
  }, { seededRecords: records, seededPurchases: purchases });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto(`${baseUrl}/index.html?seraDev=1`, { waitUntil: "load", timeout: 120_000 });
  try {
    await page.waitForFunction(() => Boolean(window.__game?.debug?.aircraftProgression), null, { timeout: 20_000 });
  } catch (error) {
    const boot = await page.evaluate(() => ({
      hasGame: Boolean(window.__game),
      gameKeys: window.__game ? Object.keys(window.__game).slice(-30) : []
    }));
    throw new Error(`progression probe did not boot: ${error}\n${JSON.stringify({ boot, pageErrors, consoleErrors }, null, 2)}`);
  }
  const snapshot = await page.evaluate((ids) => {
    window.__game.debug.forceCampaign("sera");
    return {
      roster: window.__game.debug.hangarRoster("sera"),
      aircraft: Object.fromEntries(ids.map((id) => [id, window.__game.debug.aircraftProgression(id, "sera")])),
      excluded: {
        gripen: window.__game.debug.aircraftProgression("gripen", "sera"),
        fa18a: window.__game.debug.aircraftProgression("fa18a", "sera"),
        rafale: window.__game.debug.aircraftProgression("rafale", "sera"),
        typhoon: window.__game.debug.aircraftProgression("typhoon", "sera"),
        su57: window.__game.debug.aircraftProgression("su57", "sera"),
        f3: window.__game.debug.aircraftProgression("f3", "sera")
      }
    };
  }, EXPECTED_ROSTER);
  return { context, snapshot, pageErrors, consoleErrors };
}

function assertClean(opened, label) {
  assert(opened.pageErrors.length === 0, `page error in ${label}`, opened.pageErrors);
  assert(opened.consoleErrors.length === 0, `console error in ${label}`, opened.consoleErrors);
}

try {
  const fresh = await openProfile({});
  assert(JSON.stringify(fresh.snapshot.roster) === JSON.stringify(EXPECTED_ROSTER),
    "Sera roster/order does not match v0.17", fresh.snapshot.roster);
  assert(fresh.snapshot.aircraft.f16.owned && fresh.snapshot.aircraft.f16.canFly,
    "starter F-16 was not issued", fresh.snapshot.aircraft.f16);
  for (const id of Object.keys(UNLOCKS)) {
    assert(!fresh.snapshot.aircraft[id].unlocked && !fresh.snapshot.aircraft[id].canFly,
      `${id} unlocked before its clear gate`, fresh.snapshot.aircraft[id]);
  }
  assert(!fresh.snapshot.aircraft.f22.unlocked && !fresh.snapshot.aircraft.f22.owned
      && !fresh.snapshot.aircraft.f22.canFly && fresh.snapshot.aircraft.f22.price === 0
      && fresh.snapshot.aircraft.f22.reward,
    "a legacy F-22 purchase bypassed the all-S direct-award gate", fresh.snapshot.aircraft.f22);
  assert(Object.values(fresh.snapshot.excluded).every((value) => value === null),
    "an excluded or non-player aircraft leaked into the Sera hangar", fresh.snapshot.excluded);
  assertClean(fresh, "fresh profile");
  await fresh.context.close();

  const stagedRecords = Object.fromEntries(Object.values(UNLOCKS).map((key) => [key, record()]));
  const staged = await openProfile(stagedRecords, []);
  for (const [id, key] of Object.entries(UNLOCKS)) {
    assert(staged.snapshot.aircraft[id].unlocked,
      `${id} did not unlock after ${key}`, staged.snapshot.aircraft[id]);
    assert(!staged.snapshot.aircraft[id].owned && !staged.snapshot.aircraft[id].canFly,
      `${id} clear gate incorrectly granted ownership`, staged.snapshot.aircraft[id]);
  }
  assert(!staged.snapshot.aircraft.f22.unlocked, "ordinary clears awarded the F-22", staged.snapshot.aircraft.f22);
  assertClean(staged, "clear gates");
  await staged.context.close();

  const nineteenS = Object.fromEntries(SERA_KEYS.map((key) => [key, record(key === "sera-m20" ? "A" : "S")]));
  const almost = await openProfile(nineteenS, ["f22"]);
  assert(!almost.snapshot.aircraft.f22.unlocked && almost.snapshot.aircraft.f22.badge === "M01-M20 ALL S",
    "19 S ranks incorrectly awarded the F-22", almost.snapshot.aircraft.f22);
  assertClean(almost, "nineteen S ranks");
  await almost.context.close();

  const twentyS = Object.fromEntries(SERA_KEYS.map((key) => [key, record("S")]));
  const awarded = await openProfile(twentyS, []);
  assert(awarded.snapshot.aircraft.f22.unlocked && awarded.snapshot.aircraft.f22.owned
      && awarded.snapshot.aircraft.f22.canFly && awarded.snapshot.aircraft.f22.price === 0
      && awarded.snapshot.aircraft.f22.badge === "AWARDED",
    "twenty S ranks did not directly award the F-22", awarded.snapshot.aircraft.f22);
  assertClean(awarded, "twenty S ranks");
  await awarded.context.close();

  console.log("check_sera_aircraft_progression_e2e: PASS");
  console.log("  exact roster / mission clear gates / legacy purchase ignored / F-22 all-S direct award");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
