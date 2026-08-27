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
  throw new Error(`check_sera_enemy_purpose_e2e: ${message}${
    details === null ? "" : `\n${JSON.stringify(details, null, 2)}`
  }`);
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
      "Content-Type": ext === ".html" ? "text/html"
        : (ext === ".json" ? "application/json" : "text/javascript")
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

async function openPage() {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  await context.addInitScript(() => {
    navigator.getGamepads = () => [];
    localStorage.setItem("sortieHangarPurchases", JSON.stringify({
      schemaVersion: 2,
      campaigns: { usa: [], rus: [], sera: ["f16"] }
    }));
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto(`${baseUrl}/index.html?seraDev=1`, { waitUntil: "load", timeout: 120_000 });
  await page.waitForFunction(() => Boolean(
    window.__game?.forceStartMissionByKey
    && window.__game?.debug?.enemyObjectiveProbe
    && window.__game?.missionTable
  ), null, { timeout: 120_000 });
  return { context, page, pageErrors, consoleErrors };
}

async function start(opened, key, deployHook) {
  assert(await opened.page.evaluate((missionKey) => (
    window.__game.forceStartMissionByKey(missionKey, "f16")
  ), key), `${key} could not start`);
  await opened.page.waitForFunction(() => window.__game.state === "playing", null, { timeout: 20_000 });
  if (deployHook) {
    assert(await opened.page.evaluate((hook) => window.__game[hook](), deployHook),
      `${key} pending waves could not deploy`);
  }
  await opened.page.waitForTimeout(250);
  return opened.page.evaluate(() => window.__game.debug.enemyObjectiveProbe());
}

function clean(opened, label) {
  assert(opened.pageErrors.length === 0, `page error on ${label}`, opened.pageErrors);
  assert(opened.consoleErrors.length === 0, `console error on ${label}`, opened.consoleErrors);
}

try {
  let opened = await openPage();
  const missionTable = await opened.page.evaluate(() => window.__game.missionTable);
  const sera = missionTable.filter((mission) => mission.campaign === "sera");
  assert(sera.length === 20, "expected the complete M01-M20 campaign", sera.map((mission) => mission.key));
  const unassigned = sera.flatMap((mission) => mission.waves
    .filter((wave) => wave.kind === "air" && wave.types.length > 0 && !wave.purpose)
    .map((wave) => ({ mission: mission.key, label: wave.label, types: wave.types })));
  assert(unassigned.length === 0, "Sera air wave has no authored tactical purpose", unassigned);

  const arcaWaves = sera.flatMap((mission) => mission.waves
    .filter((wave) => String(wave.missionTag || "").toLowerCase().includes("arca"))
    .map((wave) => ({ mission: mission.key, ...wave })));
  assert(arcaWaves.length >= 4
      && arcaWaves.every((wave) => !wave.tgt && wave.rankNeutral),
    "white ARCA must remain optional and rank-neutral", arcaWaves);
  clean(opened, "static purpose table");
  await opened.context.close();

  opened = await openPage();
  let objectives = await start(opened, "sera-m14", "forceSeraM14DeployPending");
  const m14Cap = objectives.filter((enemy) => enemy.type === "su33");
  assert(m14Cap.length === 6
      && m14Cap.every((enemy) => ["cap", "relief"].includes(enemy.purpose))
      && m14Cap.filter((enemy) => enemy.purpose === "cap").every((enemy) => enemy.protectedLabel),
    "M14 carrier air is not tied to the landing fleet", m14Cap);
  const capPoint = m14Cap.find((enemy) => enemy.purpose === "cap")?.defencePoint;
  assert(capPoint, "M14 fleet CAP exposes no defended point", m14Cap);
  await opened.page.evaluate(([x, y, z]) => {
    window.__game.debug.forceTeleport(x + 120, y + 180, z);
    window.__game.debug.forceEnemyFlightFrames(4);
  }, capPoint);
  objectives = await opened.page.evaluate(() => window.__game.debug.enemyObjectiveProbe());
  assert(objectives.filter((enemy) => enemy.type === "su33" && enemy.purpose === "cap")
    .every((enemy) => enemy.mode === "pursuit"),
  "M14 CAP did not commit when RAVEN entered the fleet perimeter", objectives);
  await opened.page.evaluate(([x, y, z]) => {
    window.__game.debug.forceTeleport(x + 13000, y + 180, z);
    window.__game.debug.forceEnemyFlightFrames(4);
  }, capPoint);
  objectives = await opened.page.evaluate(() => window.__game.debug.enemyObjectiveProbe());
  assert(objectives.filter((enemy) => enemy.type === "su33" && enemy.purpose === "cap")
    .every((enemy) => enemy.mode === "patrol"),
  "M14 CAP did not return when RAVEN crossed the leash", objectives);
  clean(opened, "M14 fleet CAP");
  await opened.context.close();

  opened = await openPage();
  objectives = await start(opened, "sera-m17", "forceSeraM17DeployPending");
  const bombers = objectives.filter((enemy) => ["tu95", "tu22m3"].includes(enemy.type));
  const support = objectives.filter((enemy) => ["awacs", "jammer"].includes(enemy.type));
  const cover = objectives.filter((enemy) => enemy.type === "mig31");
  const helix = objectives.filter((enemy) => enemy.missionTag === "arcaHelixM17");
  assert(bombers.length === 8 && bombers.every((enemy) => enemy.purpose === "strike"),
    "M17 bombers do not own the strike objective", bombers);
  assert(support.length === 2 && support.every((enemy) => enemy.purpose === "support"),
    "M17 support aircraft do not hold support stations", support);
  assert(cover.length === 2 && cover.every((enemy) => (
    enemy.purpose === "escort" && enemy.protectedLabel && enemy.altitudeFloor === 7800
  )), "M17 high cover is not attached to the bomber package", cover);
  assert(helix.length === 2 && helix.every((enemy) => (
    enemy.purpose === "intercept" && !enemy.tgt && enemy.rankNeutral
  )), "M17 HELIX identity or intent changed", helix);
  await opened.page.evaluate(() => window.__game.debug.forceEnemyFlightFrames(120));
  objectives = await opened.page.evaluate(() => window.__game.debug.enemyObjectiveProbe());
  assert(objectives.filter((enemy) => ["awacs", "jammer"].includes(enemy.type))
    .every((enemy) => enemy.mode === "patrol" && String(enemy.aimKind).startsWith("loiter")),
  "M17 support aircraft left station during the manoeuvre probe", objectives);
  clean(opened, "M17 package doctrine");
  await opened.context.close();

  opened = await openPage();
  objectives = await start(opened, "sera-m20", "forceSeraM20DeployPending");
  const capitalStrike = objectives.filter((enemy) => enemy.type === "tu22m3");
  const finalFighters = objectives.filter((enemy) => ["mig29", "su35", "s70", "su57"].includes(enemy.type));
  const patrol = await opened.page.evaluate(() => window.__game.debug.patrolProbe());
  const liveBombers = patrol.filter((enemy) => enemy.type === "tu22m3");
  assert(capitalStrike.length === 4 && capitalStrike.every((enemy) => enemy.purpose === "strike")
      && liveBombers.length === 4 && liveBombers.every((enemy) => enemy.strike),
    "M20 capital bombers have no real strike destination", { capitalStrike, liveBombers });
  assert(finalFighters.length === 18 && finalFighters.every((enemy) => (
    ["pinning", "intercept", "interceptor"].includes(enemy.purpose)
  )), "M20 fighter waves are still range-gated loiterers", finalFighters);
  assert(finalFighters.filter((enemy) => enemy.purpose === "pinning").length === 2,
    "M20 PINNING is not the doctrine's two-aircraft pair", finalFighters);
  assert(patrol.every((enemy) => !enemy.hater),
    "spawn order still assigns a random wingman hunter", patrol);

  clean(opened, "purpose audit");
  await opened.context.close();

  opened = await openPage();
  await start(opened, "sera-m03", null);
  let cas = await opened.page.evaluate(() => window.__game.debug.casProbe());
  const m03Helo = cas.find((enemy) => enemy.heli);
  assert(cas.length >= 2 && m03Helo?.casTarget === "protected-facility"
      && m03Helo.targetId && m03Helo.targetHp > 0,
    "M03 Ka-52 has no live port-facility objective", cas);
  assert(await opened.page.evaluate((id) => window.__game.debug.forceCasAttack(id), m03Helo.id),
    "M03 Ka-52 CAS attack could not be forced");
  cas = await opened.page.evaluate(() => window.__game.debug.casProbe());
  assert(cas.find((enemy) => enemy.id === m03Helo.id)?.targetHp < m03Helo.targetHp,
    "M03 Ka-52 did not damage its port objective", { before: m03Helo, after: cas });
  clean(opened, "M03 CAS");
  await opened.context.close();

  opened = await openPage();
  await start(opened, "sera-m05", null);
  let protectedGround = await opened.page.evaluate(() => window.__game.debug.protectedGroundProbe());
  assert(protectedGround.length === 6
      && protectedGround.filter((unit) => unit.role === "m05FriendlyTank").length === 4
      && protectedGround.every((unit) => unit.held),
    "M05 joint ground column is absent or moved before SEAD clear", protectedGround);
  assert(await opened.page.evaluate(() => window.__game.debug.forceClearGroundMark("m05Phase1")) === 5,
    "M05 phase-one air defence could not be cleared");
  await opened.page.evaluate(() => window.__game.debug.forceEnemyFlightFrames(8));
  protectedGround = await opened.page.evaluate(() => window.__game.debug.protectedGroundProbe());
  assert(protectedGround.every((unit) => !unit.held)
      && protectedGround.some((unit) => unit.routeDistance > 0),
    "M05 joint column did not advance after the corridor opened", protectedGround);
  assert(await opened.page.evaluate(() => window.__game.debug.forceDeployWaveByLabel("ALLIGATOR")),
    "M05 Ka-52 phase could not be deployed");
  cas = await opened.page.evaluate(() => window.__game.debug.casProbe());
  const m05Helo = cas.find((enemy) => enemy.heli);
  assert(cas.length === 2 && m05Helo?.casTarget === "friendly-ground"
      && Number.isInteger(m05Helo.targetId),
    "M05 Ka-52 has no joint-column objective", cas);
  const m05Before = protectedGround.find((unit) => unit.id === m05Helo.targetId);
  assert(await opened.page.evaluate((id) => window.__game.debug.forceCasAttack(id), m05Helo.id),
    "M05 Ka-52 CAS attack could not be forced");
  protectedGround = await opened.page.evaluate(() => window.__game.debug.protectedGroundProbe());
  assert(protectedGround.find((unit) => unit.id === m05Helo.targetId)?.hp < m05Before.hp,
    "M05 Ka-52 did not damage the protected column", { before: m05Before, after: protectedGround });
  clean(opened, "M05 joint advance");
  await opened.context.close();

  opened = await openPage();
  await start(opened, "sera-m09", "forceSeraM09DeployPending");
  cas = await opened.page.evaluate(() => window.__game.debug.casProbe());
  const m09Frogfoot = cas.find((enemy) => enemy.type === "su25");
  assert(cas.length === 6 && cas.every((enemy) => enemy.casTarget === "friendly-ground"
      && String(enemy.targetLabel || "").startsWith("KEDEM")),
    "M09 CAS selected civilians or has no friendly-armour target", cas);
  const m09Before = m09Frogfoot.targetHp;
  assert(await opened.page.evaluate((id) => window.__game.debug.forceCasAttack(id), m09Frogfoot.id),
    "M09 Su-25 CAS attack could not be forced");
  cas = await opened.page.evaluate(() => window.__game.debug.casProbe());
  assert(cas.find((enemy) => enemy.id === m09Frogfoot.id)?.targetHp < m09Before,
    "M09 Su-25 did not damage friendly armour", { before: m09Frogfoot, after: cas });
  clean(opened, "M09 combined arms");
  await opened.context.close();

  console.log("check_sera_enemy_purpose_e2e: PASS");
  console.log("  M01-M20 purpose / fleet CAP / bomber escort / optional ARCA / capital strike / M03-M05-M09 CAS");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
