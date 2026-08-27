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
  throw new Error(`check_sera_m20_e2e: ${message}${details === null ? "" : `\n${JSON.stringify(details, null, 2)}`}`);
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

async function openMission(records) {
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
  await page.waitForFunction(() => Boolean(window.__game?.forceStartMissionByKey && window.__game?.seraM20Probe), null, { timeout: 120_000 });
  assert(await page.evaluate(() => window.__game.forceStartMissionByKey("sera-m20", "f16")),
    "THE GUARANTOR could not start through the production launcher");
  await page.waitForFunction(() => window.__game.seraM20Probe()?.state === "playing", null, { timeout: 20_000 });
  await page.waitForTimeout(250);
  return { context, page, pageErrors, consoleErrors };
}

function clean(opened, label) {
  assert(opened.pageErrors.length === 0, `page error on ${label}`, opened.pageErrors);
  assert(opened.consoleErrors.length === 0, `console error on ${label}`, opened.consoleErrors);
}

try {
  const normal = await openMission({
    "sera-m19": { cleared: true, seraFinalRoute: "oneShem", ravenFinalPursuit: false, ravenArcaKills: 0 }
  });
  assert(await normal.page.evaluate(() => window.__game.forceSeraM20DeployPending()),
    "normal-route phase-one package did not deploy");
  let probe = await normal.page.evaluate(() => window.__game.seraM20Probe());
  const phaseOne = probe.contacts.filter((entry) => entry.alive && entry.missionTag === probe.phaseOneTag);
  assert(probe.worldKey === "migalCoreDawn" && probe.final.route === "oneShem"
      && phaseOne.length === 24 && phaseOne.every((entry) => entry.tgt),
    "normal route or 24-target final defence changed", probe);
  assert(probe.wingmen.some((entry) => entry.label === "CROWN" && entry.type === "f15c" && entry.alive)
      && probe.wingmen.some((entry) => entry.label.includes("LARK") && entry.type === "f15" && entry.alive),
    "normal blue CROWN/LARK roster changed", probe);
  assert(await normal.page.evaluate(() => window.__game.forceSeraM20ClearPhaseOne()) === 24,
    "normal route phase one could not be cleared");
  probe = await normal.page.evaluate(() => window.__game.seraM20Probe());
  assert(probe.outcomePending && probe.final.completed && !probe.final.fakeAccomplished
      && !probe.final.duelStarted && probe.wingmen.every((entry) => entry.alive),
    "ONE SHEM did not enter the true clear with both wingmen blue", probe);
  assert(await normal.page.evaluate(() => window.__game.forceSeraM20ResolveOutcome()),
    "normal route outcome did not resolve");
  probe = await normal.page.evaluate(() => window.__game.seraM20Probe());
  assert(probe.record?.seraFinalRoute === "oneShem"
      && probe.record?.m20FakeAccomplished === false
      && probe.record?.m20BossDuel === false
      && probe.record?.seraCampaignEnding === "oneShem",
    "ONE SHEM result was not persisted", probe);
  assert(await normal.page.evaluate(() => window.__game.forceStartMissionByKey("sera-m20", "f16")),
    "M20 Retry/relaunch failed");
  probe = await normal.page.evaluate(() => window.__game.seraM20Probe());
  assert(probe.final.phase === "phase1" && !probe.final.fakeAccomplished
      && !probe.final.radioSuppressed && !probe.final.musicSuppressed,
    "M20 state did not reset on Retry/relaunch", probe);
  clean(normal, "ONE SHEM route");
  await normal.context.close();

  const gibor = await openMission({
    "sera-m19": { cleared: true, seraFinalRoute: "gibor", ravenFinalPursuit: true, ravenArcaKills: 8 }
  });
  await gibor.page.evaluate(() => window.__game.forceSeraM20DeployPending());
  assert(await gibor.page.evaluate(() => window.__game.forceSeraM20ClearPhaseOne()) === 24,
    "GIBOR phase one could not be cleared");
  probe = await gibor.page.evaluate(() => window.__game.seraM20Probe());
  assert(probe.final.phase === "post-clear-silence" && probe.final.fakeAccomplished
      && !probe.outcomePending && probe.banner.text === "MISSION ACCOMPLISHED"
      && probe.wingmen.every((entry) => entry.alive && entry.visible)
      && probe.contacts.filter((entry) => entry.alive && entry.missionTag === probe.bossTag).length === 0
      && probe.final.radioSuppressed && probe.final.musicSuppressed
      && !probe.radio.active && probe.radio.queue === 0,
    "fake clear did not preserve silent blue CROWN/LARK state", probe);

  assert(await gibor.page.evaluate(() => window.__game.forceSeraM20EndSilence()),
    "GIBOR silence did not transition to the duel");
  probe = await gibor.page.evaluate(() => window.__game.seraM20Probe());
  const bosses = probe.contacts.filter((entry) => entry.alive && entry.missionTag === probe.bossTag);
  const allActive = probe.contacts.filter((entry) => entry.alive);
  assert(probe.final.phase === "duel" && bosses.length === 2 && allActive.length === 2
      && bosses.some((entry) => entry.name === "CROWN" && entry.type === "f15c")
      && bosses.some((entry) => entry.name === "LARK" && entry.type === "f15")
      && bosses.every((entry) => entry.tgt && entry.maxHp === entry.ordinaryHp)
      && probe.wingmen.every((entry) => !entry.alive && entry.retired && !entry.visible)
      && probe.final.radioSuppressed && !probe.radio.active && probe.radio.queue === 0,
    "simultaneous ordinary-HP CROWN/LARK red conversion changed", probe);

  assert(await gibor.page.evaluate(() => window.__game.forceSeraM20KillBoss("LARK")),
    "LARK-first kill failed");
  probe = await gibor.page.evaluate(() => window.__game.seraM20Probe());
  assert(probe.final.phase === "duel" && probe.final.larkNeutralized
      && !probe.final.crownNeutralized && !probe.outcomePending
      && probe.contacts.filter((entry) => entry.alive).length === 1
      && !probe.radio.active && probe.radio.queue === 0,
    "either-order duel incorrectly completed or spoke after first kill", probe);
  assert(await gibor.page.evaluate(() => window.__game.forceSeraM20KillBoss("CROWN")),
    "CROWN-second kill failed");
  probe = await gibor.page.evaluate(() => window.__game.seraM20Probe());
  assert(probe.final.phase === "no-hostile-hold" && probe.final.noHostileHold
      && probe.banner.text === "NO HOSTILE CONTACTS" && !probe.outcomePending
      && probe.contacts.filter((entry) => entry.alive).length === 0
      && !probe.radio.active && probe.radio.queue === 0,
    "two kills did not enter the silent free-flight hold", probe);
  assert(await gibor.page.evaluate(() => window.__game.forceSeraM20EndNoHostileHold()),
    "NO HOSTILE CONTACTS hold did not reach the true result");
  assert(await gibor.page.evaluate(() => window.__game.forceSeraM20ResolveOutcome()),
    "GIBOR true outcome did not resolve");
  probe = await gibor.page.evaluate(() => window.__game.seraM20Probe());
  assert(probe.record?.seraFinalRoute === "gibor"
      && probe.record?.m20FakeAccomplished === true
      && probe.record?.m20BossDuel === true
      && probe.record?.m20CrownNeutralized === true
      && probe.record?.m20LarkNeutralized === true
      && probe.record?.m20NoHostileHold === true
      && probe.record?.seraCampaignEnding === "gibor",
    "GIBOR final result was not persisted", probe);
  clean(gibor, "GIBOR route");
  await gibor.context.close();

  console.log("check_sera_m20_e2e: PASS");
  console.log("  ONE SHEM true clear / GIBOR false clear / silent simultaneous duel / either kill order / delayed true result");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
