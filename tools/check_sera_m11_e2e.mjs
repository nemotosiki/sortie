#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const externalBaseUrl = String(process.env.SORTIE_BASE_URL || "").replace(/\/$/, "");
const chromePath = process.env.SORTIE_CHROME
  || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const candidates = [
  process.env.SORTIE_PLAYWRIGHT,
  "playwright",
  "C:/Users/user01/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright"
].filter(Boolean);
const loadPlaywright = () => {
  for (const candidate of candidates) {
    try { return require(candidate); } catch { /* try next */ }
  }
  throw new Error("playwright not found; set SORTIE_PLAYWRIGHT");
};
const assert = (condition, message) => { if (!condition) throw new Error(`check_sera_m11_e2e: ${message}`); };
const mime = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json" };

async function serve() {
  const server = http.createServer((request, response) => {
    const requestPath = decodeURIComponent(request.url.split("?")[0]);
    const file = path.join(root, requestPath === "/" ? "index.html" : requestPath);
    if (!path.resolve(file).startsWith(root)) { response.writeHead(403); response.end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { response.writeHead(404); response.end("not found"); return; }
      response.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
      response.end(data);
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, port: server.address().port };
}

const { chromium } = loadPlaywright();
const served = externalBaseUrl ? { server: null, port: null } : await serve();
const baseUrl = externalBaseUrl || `http://127.0.0.1:${served.port}`;
const browser = await chromium.launch({
  executablePath: chromePath,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
});
const payloadQuery = "payloads=payloads/map_verIceCoast.payload.js,payloads/mission_sera_m11.payload.js";
const pageErrors = [];
const consoleErrors = [];

async function newMissionPage() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    navigator.getGamepads = () => [];
    localStorage.setItem("sortieMissionRecords", JSON.stringify({
      "sera-m10": { cleared: true, rank: "A", scores: [1], times: [1] }
    }));
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto(`${baseUrl}/index.html?${payloadQuery}`, { waitUntil: "load", timeout: 45000 });
  await page.waitForFunction(
    () => window.__game?.debug?.missionKeys?.().includes("sera-m11"),
    null,
    { timeout: 45000 }
  );
  const unlock = await page.evaluate(() => {
    const index = window.__game.debug.missionIndexOf("sera-m11");
    return { index, unlocked: window.__game.mission.unlocked[index] };
  });
  assert(unlock.index >= 0 && unlock.unlocked, "M10 clear does not unlock M11 in the normal campaign chain");
  const started = await page.evaluate(() => window.__game.forceStartMissionByKey("sera-m11", "f16"));
  assert(started, "production launcher could not start M11");
  await page.waitForFunction(
    () => window.__game?.seraM11Probe?.()?.missionKey === "sera-m11",
    null,
    { timeout: 45000 }
  );
  await page.waitForTimeout(250);
  return { context, page };
}

try {
  // Production boot and unresolved-escort hold.
  {
    const { context, page } = await newMissionPage();
    const opening = await page.evaluate(() => window.__game.seraM11Probe());
    assert(opening.worldKey === "verIceCoast", "M11 did not create Ver Ice Coast");
    assert(opening.halo.length === 3 && opening.halo.every((aircraft) => (
      aircraft.type === "b1b" && aircraft.alive && !aircraft.retired
        && aircraft.position[1] >= 5080 && aircraft.position[1] <= 5120
    )), "HALO B-1B x3 opening formation is malformed");
    assert(opening.guard.active && opening.guard.total === 3 && opening.guard.saved === 0 && opening.guard.lost === 0,
      "HALO count guard did not arm cleanly");
    assert(opening.contacts.filter((contact) => contact.tgt).length === 2 && opening.pending.length === 3,
      "opening/interceptor queue is malformed");

    assert(await page.evaluate(() => window.__game.forceSeraM11DeployPending()),
      "delayed M11 waves did not deploy");
    await page.waitForTimeout(500);
    const deployed = await page.evaluate(() => window.__game.seraM11Probe());
    const red = deployed.contacts.filter((contact) => contact.tgt);
    const white = deployed.contacts.filter((contact) => !contact.tgt);
    assert(red.length === 6 && red.filter((contact) => contact.type === "mig31").length === 4,
      "six designated interceptors did not reach the board");
    assert(white.length === 2 && white.every((contact) => contact.type === "mig29" && !contact.hunt),
      "white MiG-29A diversion is malformed");
    assert(red.every((contact) => contact.hunt === "air" && String(contact.charge || "").startsWith("HALO ")),
      "red TGTs are not actually charging HALO aircraft");

    assert(await page.evaluate(() => window.__game.forceSeraM11ClearTargets()),
      "clearing the red board incorrectly ended M11 before escort arrival");
    let held = await page.evaluate(() => window.__game.seraM11Probe());
    assert(held.state === "playing" && !held.outcomePending && held.guard.saved === 0,
      `destroy-all resolver escaped the M11 escort hold: ${JSON.stringify(held)}`);

    assert(await page.evaluate(() => window.__game.forceSeraM11PlayerFar()),
      "far-from-formation warning did not arm");
    held = await page.evaluate(() => window.__game.seraM11Probe());
    assert(held.escort.proximityWarnings === 1 && held.escort.nearestHalo >= 4300,
      "proximity warning did not measure live HALO range");
    assert(await page.evaluate(() => window.__game.forceSeraM11PlayerNear()),
      "proximity warning hysteresis did not clear near HALO");
    assert(await page.evaluate(() => window.__game.forceSeraM11Progress(0.52)),
      "HALO halfway debug drive failed");
    assert(await page.evaluate(() => window.__game.forceSeraM11Progress(0.84)),
      "HALO operation-line approach debug drive failed");
    held = await page.evaluate(() => window.__game.seraM11Probe());
    assert(held.escort.halfwayFired && held.escort.nearLineFired,
      "formation-progress radio milestones did not fire");

    assert(await page.evaluate(() => window.__game.forceSeraM11Save(3)) === 3,
      "all-safe HALO arrival could not be driven through retireFriendly");
    const success = await page.evaluate(() => window.__game.seraM11Probe());
    assert(success.outcomePending && success.escort.completed
        && success.escort.finalSaved === 3 && success.escort.finalLost === 0,
      "all-safe success snapshot is wrong");
    assert(await page.evaluate(() => window.__game.forceSeraM11ResolveOutcome()),
      "all-safe ACCOMPLISHED hold did not resolve");
    const record = await page.evaluate(() => window.__game.seraM11Probe().record);
    assert(record?.cleared && record.attackAircraftSaved === 3
        && record.attackAircraftLost === 0 && record.allAttackAircraftSafe === true,
      `all-safe record is wrong: ${JSON.stringify(record)}`);
    await context.close();
  }

  // One loss remains a clear but cannot be an all-safe/S result.
  {
    const { context, page } = await newMissionPage();
    assert(await page.evaluate(() => window.__game.forceSeraM11Lose(1)) === 1,
      "single HALO loss could not be driven");
    let probe = await page.evaluate(() => window.__game.seraM11Probe());
    assert(probe.state === "playing" && probe.guard.lost === 1 && probe.escort.oneLostFired,
      "M11 did not continue after one loss");
    assert(await page.evaluate(() => window.__game.forceSeraM11Save(2)) === 2,
      "two surviving HALO aircraft could not reach the line");
    probe = await page.evaluate(() => window.__game.seraM11Probe());
    assert(probe.outcomePending && probe.escort.finalSaved === 2 && probe.escort.finalLost === 1,
      "one-loss success snapshot is wrong");
    assert(await page.evaluate(() => window.__game.forceSeraM11ResolveOutcome()),
      "one-loss ACCOMPLISHED hold did not resolve");
    const result = await page.evaluate(() => ({
      record: window.__game.seraM11Probe().record,
      rank: window.__game.mission.rank
    }));
    assert(result.record?.cleared && result.record.attackAircraftSaved === 2
        && result.record.attackAircraftLost === 1 && result.record.allAttackAircraftSafe === false,
      `one-loss record is wrong: ${JSON.stringify(result.record)}`);
    assert(result.rank !== "S", `one-loss clear incorrectly received S rank: ${result.rank}`);
    await context.close();
  }

  // Two losses make the required force impossible and Retry rebuilds all state.
  {
    const { context, page } = await newMissionPage();
    assert(await page.evaluate(() => window.__game.forceSeraM11Lose(2)) === 2,
      "two-loss failure drive did not destroy two HALO aircraft");
    let probe = await page.evaluate(() => window.__game.seraM11Probe());
    assert(probe.state === "gameover" && probe.escort.failed
        && probe.escort.finalLost === 2 && probe.guard.saved === 0,
      "impossible-survival condition did not fail immediately");
    await page.locator("#retryBtn").click();
    await page.waitForFunction(
      () => window.__game?.seraM11Probe?.()?.state === "playing",
      null,
      { timeout: 10000 }
    );
    probe = await page.evaluate(() => window.__game.seraM11Probe());
    assert(probe.halo.length === 3 && probe.halo.every((aircraft) => aircraft.alive && !aircraft.retired),
      "Retry did not rebuild all three HALO aircraft");
    assert(probe.guard.saved === 0 && probe.guard.lost === 0
        && !probe.escort.failed && !probe.escort.completed && probe.escort.proximityWarnings === 0,
      "Retry retained stale M11 guard/progress state");
    assert(await page.evaluate(() => window.__game.forceSeraM11Timeout()),
      "operation-window timeout did not fail M11");
    await context.close();
  }

  assert(pageErrors.length === 0, `page errors: ${pageErrors.join(" | ")}`);
  assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join(" | ")}`);
  console.log("check_sera_m11_e2e: PASS");
  console.log("  M10 unlock / HALO x3 / red6+white2 / target-clear hold / proximity / all-safe / one-loss / impossible-loss / Retry / timeout");
} finally {
  await browser.close();
  if (served.server) await new Promise((resolve) => served.server.close(resolve));
}
