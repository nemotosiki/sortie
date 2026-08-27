#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hostSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const m11Inlined = hostSource.includes("// @payload:map_verIceCoast")
  && hostSource.includes("// @payload:mission_sera_m11");
const externalBaseUrl = String(process.env.SORTIE_BASE_URL || "").replace(/\/$/, "");
const chromePath = process.env.SORTIE_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
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
const assert = (condition, message, details = null) => {
  if (condition) return;
  throw new Error(`check_sera_m11_e2e: ${message}${details ? `\n${JSON.stringify(details, null, 2)}` : ""}`);
};
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
  executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
});
const payloadQuery = m11Inlined
  ? ""
  : "payloads=payloads/map_verIceCoast.payload.js,payloads/mission_sera_m11.payload.js";
const screenshotPath = path.resolve(
  process.env.SORTIE_M11_SCREENSHOT || path.join(os.tmpdir(), "sortie-sera-m11-ew-strike.png")
);
const pageErrors = [];
const consoleErrors = [];

async function newMissionPage(aircraft = "f16") {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    navigator.getGamepads = () => [];
    localStorage.setItem("sortieMissionRecords", JSON.stringify({
      "sera-m10": { cleared: true, rank: "A", scores: [1], times: [1] }
    }));
    localStorage.setItem("sortieHangarPurchases", JSON.stringify({
      schemaVersion: 2,
      campaigns: { usa: [], rus: [], sera: ["fa18"] }
    }));
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto(`${baseUrl}/index.html${payloadQuery ? `?${payloadQuery}` : ""}`, {
    waitUntil: "load",
    timeout: 60_000
  });
  await page.waitForFunction(
    () => window.__game?.debug?.missionKeys?.().includes("sera-m11"),
    null,
    { timeout: 60_000 }
  );
  const unlock = await page.evaluate(() => {
    const index = window.__game.debug.missionIndexOf("sera-m11");
    return { index, unlocked: window.__game.mission.unlocked[index] };
  });
  assert(unlock.index >= 0 && unlock.unlocked, "M10 clear does not unlock M11");
  const started = await page.evaluate((aircraftId) => (
    window.__game.forceStartMissionByKey("sera-m11", aircraftId)
  ), aircraft);
  assert(started, "production launcher could not start M11");
  await page.waitForFunction(() => window.__game?.seraM11Probe?.()?.missionKey === "sera-m11", null, {
    timeout: 60_000
  });
  await page.waitForTimeout(250);
  return { context, page };
}

try {
  // Full mission loop: aggregate HP, EW transitions, boosted SAM, sanctuary,
  // radar-first counterplay, secondary sweep, base clear and S-cap record.
  {
    const { context, page } = await newMissionPage();
    let probe = await page.evaluate(() => window.__game.seraM11Probe());
    assert(probe.worldKey === "verIceCoast", "M11 did not create Ver Ice Coast");
    assert(probe.halo.length === 3 && probe.halo.every((aircraft) => (
      aircraft.type === "jammer" && aircraft.alive && !aircraft.retired
        && aircraft.position[1] >= 10470 && aircraft.position[1] <= 10530
    )), "HALO electronic-support formation is malformed", probe.halo);
    assert(probe.guard.active && probe.guard.total === 3 && probe.guard.lost === 0,
      "HALO guard did not arm cleanly", probe.guard);
    assert(probe.contacts.filter((contact) => contact.tgt && contact.mark === "m11BaseNode").length === 10,
      "ten red base nodes did not spawn", probe.contacts);
    assert(probe.contacts.filter((contact) => (
      !contact.tgt && contact.rankNeutral && contact.mark === "m11PerimeterContact"
    )).length === 6, "six white perimeter defenders did not spawn", probe.contacts);
    assert(probe.contacts.filter((contact) => !contact.tgt && contact.type === "mig31").length === 2
        && probe.pending.length === 5
        && probe.pending.reduce((sum, wave) => sum + wave.types.length, 0) === 8,
      "opening MiG-31 pair/reinforcement queue is malformed", probe);
    assert(probe.contacts.filter((contact) => contact.type === "mig31").every((contact) => (
      contact.hunt === "air" && contact.charge?.startsWith("HALO")
        && contact.position[1] >= 10400
    )), "MiG-31 did not remain in HALO's high-altitude band", probe.contacts);
    assert(probe.arca.length === 2 && probe.arca.every((aircraft) => (
      aircraft.type === "typhoon" && aircraft.alive && !aircraft.retired
        && aircraft.vulnerable === false && aircraft.label.startsWith("ARCA POLAR WATCH")
        && aircraft.position[1] >= 9770 && aircraft.position[1] <= 9830
    )), "blue ARCA observer flight is malformed", probe.arca);
    assert(probe.recoveryGauge.visible && probe.recoveryGauge.label === "HALO TOTAL HP"
        && probe.recoveryGauge.value === "1176/1176"
        && probe.recoveryGauge.className.includes("formation"),
      "aggregate HALO HP panel is malformed", probe.recoveryGauge);
    assert(probe.directive.visible && probe.directive.title.startsWith("JAMMING ACTIVE")
        && probe.directive.instruction.includes("DESCEND"),
      "opening AC-style EW directive is wrong", probe.directive);
    const speedParity = await page.evaluate(() => {
      window.__game.forceSeraM11SetPlayerAltitude(10625);
      window.__game.debug.forceAttitude(90, 87, 0);
      const before = window.__game.debug.forceFlightFrames(0, 1 / 60);
      const after = window.__game.debug.forceFlightFrames(1, 1 / 60);
      const dx = after.position.x - before.position.x;
      const dy = after.position.y - before.position.y;
      const dz = after.position.z - before.position.z;
      const displacementSpeedMps = Math.hypot(dx, dy, dz) / after.step;
      window.__game.debug.forceAttitude(0, 0, 0);
      window.__game.debug.forceResetAttitudeLift();
      window.__game.forceSeraM11SetPlayerAltitude(9144);
      return { before, after, displacementSpeedMps };
    });
    assert(Math.abs(speedParity.displacementSpeedMps - speedParity.after.speedMps) < 0.1
        && Math.abs(speedParity.after.kinematicSpeedMps - speedParity.after.speedMps) < 1e-6
        && speedParity.after.hudSpeedKph === Math.round(speedParity.after.speedMps * 3.6),
      "high-altitude HUD speed diverged from actual displacement speed", speedParity);
    assert(await page.evaluate(() => window.__game.forceSeraM11DamageHalo(0, 98)),
      "HALO damage probe failed");
    probe = await page.evaluate(() => window.__game.seraM11Probe());
    assert(probe.recoveryGauge.value === "1078/1176" && parseFloat(probe.recoveryGauge.width) < 92,
      "aggregate HP did not sum individual damage", probe.recoveryGauge);

    const warning = await page.evaluate(() => window.__game.forceSeraM11AdvanceJamming(25));
    assert(warning.active && warning.remaining <= 35, "35-second jam warning did not arm", warning);
    probe = await page.evaluate(() => window.__game.seraM11Probe());
    assert(probe.directive.className.includes("warning") && probe.directive.instruction.includes("9000"),
      "HUD did not order a climb before jamming stopped", probe.directive);
    await page.waitForTimeout(220);
    const warningVisual = await page.evaluate(() => {
      const sample = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          visible: element.classList.contains("visible") || element.classList.contains("active"),
          className: element.className,
          opacity: Number(style.opacity),
          color: style.color,
          background: style.backgroundColor,
          borderTop: style.borderTopWidth,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
        };
      };
      return {
        directive: sample(document.getElementById("m11EwDirective")),
        altitude: sample(document.getElementById("stallWarning")),
        banner: sample(document.getElementById("missionBanner"))
      };
    });
    assert(warningVisual.directive.opacity >= 0.95
        && warningVisual.directive.color === "rgb(255, 200, 92)"
        && warningVisual.directive.background === "rgba(0, 0, 0, 0)"
        && warningVisual.directive.borderTop === "0px",
      "M11 warning is not opaque transparent HUD symbology", warningVisual.directive);
    assert(warningVisual.altitude.opacity >= 0.8
        && warningVisual.altitude.background === "rgba(0, 0, 0, 0)"
        && warningVisual.altitude.borderTop === "0px",
      "high-altitude caution retained a web-style panel", warningVisual.altitude);
    assert((!warningVisual.banner.visible || warningVisual.banner.opacity >= 0.8)
        && warningVisual.banner.background === "rgba(0, 0, 0, 0)"
        && warningVisual.banner.borderTop === "0px",
      "transient mission banner retained a web-style panel", warningVisual.banner);
    probe = await page.evaluate(() => window.__game.seraM11Probe());
    assert(probe.radioEvents.includes("m11-arca-watch"),
      "PAX/ARCA monitoring report did not enter the fixed-radio ledger", probe.radioEvents);
    await page.screenshot({ path: screenshotPath, type: "png" });

    const online = await page.evaluate(() => window.__game.forceSeraM11AdvanceJamming(36));
    assert(!online.active && online.phase === "radar-online", "radar-online window did not start", online);
    probe = await page.evaluate(() => window.__game.seraM11Probe());
    assert(probe.escort.playerSafe && probe.directive.className.includes("safe")
        && probe.directive.title.includes("SAFE ALTITUDE"),
      "9,144m did not read as sanctuary during radar-online", probe.directive);

    const nearBase = await page.evaluate(() => window.__game.forceSeraM11SetPlayerNearBase(1500, 3500));
    assert(nearBase?.samId && nearBase.distance > 1500 && nearBase.distance < 12000,
      "SAM test geometry is outside jammed/enhanced envelopes", nearBase);
    assert(await page.evaluate((id) => window.__game.debug.forceEnemyMissileReady(id), nearBase.samId),
      "base SAM could not be armed");
    await page.waitForFunction(
      () => window.__game.seraM11Probe().missiles.some((missile) => missile.radarBoosted),
      null,
      { timeout: 5_000 }
    );
    probe = await page.evaluate(() => window.__game.seraM11Probe());
    const boosted = probe.missiles.find((missile) => missile.radarBoosted);
    assert(boosted && Math.abs(boosted.maxSpeed * 3.6 - 4000) <= 0.5
        && boosted.turnRateDeg === 75 && boosted.navigationRatio === 8
        && boosted.maxLateralG === 150,
      "radar-online SAM did not receive the 4,000 km/h near-unavoidable guidance tune", {
        missiles: probe.missiles,
        sam: probe.contacts.find((contact) => contact.id === nearBase.samId),
        escort: probe.escort
      });
    assert(probe.directive.className.includes("danger") && probe.directive.instruction.includes("9000"),
      "low-altitude radar-online HUD is not critical", probe.directive);

    assert(await page.evaluate(() => window.__game.forceSeraM11SetPlayerAltitude(9000)),
      "9,000m sanctuary did not arm");
    await page.waitForFunction((id) => {
      const missile = window.__game.seraM11Probe().missiles.find((entry) => entry.id === id);
      return !missile || missile.lost;
    }, boosted.id, { timeout: 2_000 });
    probe = await page.evaluate(() => window.__game.seraM11Probe());
    const escaped = probe.missiles.find((missile) => missile.id === boosted.id);
    assert(!escaped || escaped.lost, "enhanced SAM kept guidance above sanctuary", escaped);

    const shoradSetup = await page.evaluate(() => {
      const shorad = window.__game.seraM11Probe().contacts.find((contact) => (
        contact.alive && contact.type === "m11Shorad"
      ));
      if (!shorad) return null;
      window.__game.debug.forceTeleport(shorad.position[0] + 700, 450, shorad.position[2]);
      window.__game.forceSeraM11SetJammingActive(false);
      return {
        id: shorad.id,
        ready: window.__game.debug.forceEnemyMissileReady(shorad.id)
      };
    });
    assert(shoradSetup?.ready, "perimeter SHORAD could not be armed", shoradSetup);
    assert(await page.evaluate((id) => (
      window.__game.debug.forceGroundMissileLockFrames(id, 240, 1 / 60)
    ), shoradSetup.id) === 1, "perimeter SHORAD did not complete its ordinary lock/fire sequence");
    probe = await page.evaluate(() => window.__game.seraM11Probe());
    const shoradMissile = probe.missiles.find((missile) => missile.ownerType === "m11Shorad");
    assert(shoradMissile && !shoradMissile.radarBoosted
        && shoradMissile.maxSpeed * 3.6 >= 1995
        && shoradMissile.maxSpeed * 3.6 <= 2010
        && shoradMissile.navigationRatio < 8,
      "white perimeter SHORAD inherited the radar-online base-SAM boost", shoradMissile);
    await page.evaluate(() => window.__game.debug.forceTeleport(-10000, 9000, -7000));

    assert(await page.evaluate(() => window.__game.forceSeraM11ClearRadar()) === 2,
      "fire-control radars could not be neutralised");
    probe = await page.evaluate(() => window.__game.seraM11Probe());
    assert(probe.escort.fireControlDisabled && probe.escort.fireControlRadarsAlive === 0
        && probe.directive.title.includes("RADAR DESTROYED"),
      "radar-first permanent counterplay did not latch", probe);

    assert(await page.evaluate(() => window.__game.forceSeraM11DeployPending()),
      "M11 delayed air-defence waves did not deploy");
    probe = await page.evaluate(() => window.__game.seraM11Probe());
    const mig29s = probe.contacts.filter((contact) => contact.type === "mig29");
    const mig31s = probe.contacts.filter((contact) => contact.type === "mig31");
    const granite = mig31s.find((contact) => contact.name === "GRANITE");
    assert(mig29s.length === 6 && mig29s.every((contact) => (
      !contact.tgt && contact.rankNeutral && contact.hunt === null
        && contact.missionTag === "m11BaseAirDefence"
    )), "MiG-29A CAP/QRA deployment is malformed", mig29s);
    assert(mig31s.length === 4 && granite && granite.hunt === null
        && granite.rankNeutral && granite.missionTag === "m11HaloHunter"
        && mig31s.filter((contact) => contact.hunt === "air").length === 3,
      "MiG-31/GRANITE role split is malformed", mig31s);
    const otherWhiteCleared = await page.evaluate(() => {
      const probe = window.__game.seraM11Probe();
      const contacts = probe.contacts.filter((contact) => (
        contact.alive && !contact.tgt && contact.missionTag !== "m11HaloHunter"
      ));
      let cleared = 0;
      for (const contact of contacts) {
        if (window.__game.debug.forceDamageEnemy(contact.id, 9999)) cleared += 1;
      }
      return cleared;
    });
    assert(otherWhiteCleared === 12,
      `full optional route did not clear perimeter x6 + MiG-29A x6: ${otherWhiteCleared}`);
    assert(await page.evaluate(() => window.__game.forceSeraM11ClearSecondary()) === 4,
      "four MiG-31 secondary contacts could not be cleared");
    probe = await page.evaluate(() => window.__game.seraM11Probe());
    assert(probe.escort.secondaryKills === 4, "secondary kill ledger did not reach four", probe.escort);

    assert(await page.evaluate(() => window.__game.forceSeraM11ClearTargets()),
      "base neutralisation did not enter ACCOMPLISHED hold");
    probe = await page.evaluate(() => window.__game.seraM11Probe());
    assert(probe.outcomePending && probe.escort.completed && probe.escort.baseRemaining === 0
        && probe.escort.finalSaved === 3 && probe.escort.finalLost === 0,
      "all-safe base-clear snapshot is wrong", probe);
    assert(await page.evaluate(() => window.__game.forceSeraM11ResolveOutcome()),
      "all-safe ACCOMPLISHED hold did not resolve");
    const result = await page.evaluate(() => ({
      record: window.__game.seraM11Probe().record,
      rank: window.__game.seraM11Probe().record?.rank || null
    }));
    assert(result.record?.cleared && result.record.electronicSupportAircraftSaved === 3
        && result.record.electronicSupportAircraftLost === 0
        && result.record.allElectronicSupportAircraftSafe === true
        && result.record.secondaryAircraftDestroyed === 4,
      "all-safe EW strike record is wrong", result.record);
    assert(result.rank === "S", `full secondary/all-safe clear should retain S, got ${result.rank}`);
    await context.close();
  }

  // Partial optional route with the canonical LARK airframe pairing: two of
  // four MiG-31s destroyed, every HALO aircraft safe, base still clearable.
  {
    const { context, page } = await newMissionPage("fa18");
    assert(await page.evaluate(() => window.__game.forceSeraM11DeployPending()),
      "partial-route delayed waves did not deploy");
    const partialKills = await page.evaluate(() => {
      const ids = window.__game.seraM11Probe().contacts
        .filter((contact) => contact.alive && contact.type === "mig31")
        .slice(0, 2)
        .map((contact) => contact.id);
      return ids.filter((id) => window.__game.debug.forceDamageEnemy(id, 9999)).length;
    });
    assert(partialKills === 2, `partial route destroyed ${partialKills}/2 MiG-31s`);
    assert(await page.evaluate(() => window.__game.forceSeraM11ClearTargets()),
      "partial optional route could not clear the ten red base targets");
    assert(await page.evaluate(() => window.__game.forceSeraM11ResolveOutcome()),
      "partial optional route did not resolve");
    const result = await page.evaluate(() => window.__game.seraM11Probe().record);
    assert(result?.cleared && result.electronicSupportAircraftSaved === 3
        && result.electronicSupportAircraftLost === 0
        && result.secondaryAircraftDestroyed === 2,
      "partial optional route record is wrong", result);
    assert(result.rank !== "S", "partial two-of-four MiG-31 route incorrectly received S");
    await context.close();
  }

  // One loss and an incomplete secondary objective still clear the base but cap S.
  {
    const { context, page } = await newMissionPage();
    assert(await page.evaluate(() => window.__game.forceSeraM11Lose(1)) === 1,
      "single HALO loss could not be driven");
    assert(await page.evaluate(() => window.__game.forceSeraM11ClearTargets()),
      "one-loss base clear did not enter ACCOMPLISHED hold");
    assert(await page.evaluate(() => window.__game.forceSeraM11ResolveOutcome()),
      "one-loss outcome did not resolve");
    const result = await page.evaluate(() => ({
      record: window.__game.seraM11Probe().record,
      rank: window.__game.seraM11Probe().record?.rank || null
    }));
    assert(result.record?.cleared && result.record.electronicSupportAircraftSaved === 2
        && result.record.electronicSupportAircraftLost === 1
        && result.record.allElectronicSupportAircraftSafe === false,
      "one-loss record is wrong", result.record);
    assert(result.rank !== "S", "one-loss/incomplete-secondary clear incorrectly received S");
    await context.close();
  }

  // Two losses fail immediately; Retry rebuilds HP/EW/base state, then timeout fails.
  {
    const { context, page } = await newMissionPage();
    const resourcesBefore = await page.evaluate(() => {
      const state = window.__game.debug.worldDecorators();
      return {
        roots: state.roots, geometries: state.geometries,
        materials: state.materials, textures: state.textures
      };
    });
    assert(await page.evaluate(() => window.__game.forceSeraM11Lose(2)) === 2,
      "two-loss failure drive did not destroy two HALO aircraft");
    let probe = await page.evaluate(() => window.__game.seraM11Probe());
    assert(probe.state === "gameover" && probe.escort.failed && probe.escort.finalLost === 2,
      "HALO network collapse did not fail immediately", probe);
    await page.locator("#retryBtn").click();
    await page.waitForFunction(() => window.__game?.seraM11Probe?.()?.state === "playing", null, {
      timeout: 10_000
    });
    probe = await page.evaluate(() => window.__game.seraM11Probe());
    assert(probe.halo.length === 3 && probe.halo.every((aircraft) => aircraft.alive),
      "Retry did not rebuild HALO x3", probe.halo);
    assert(probe.guard.lost === 0 && !probe.escort.failed && probe.escort.jammingActive
        && probe.escort.baseRemaining === 10 && probe.recoveryGauge.value === "1176/1176",
      "Retry retained stale EW/HP/base state", probe);
    const resourcesAfter = await page.evaluate(() => {
      const state = window.__game.debug.worldDecorators();
      return {
        roots: state.roots, geometries: state.geometries,
        materials: state.materials, textures: state.textures
      };
    });
    assert(JSON.stringify(resourcesAfter) === JSON.stringify(resourcesBefore),
      "Retry duplicated Ver Ice Coast decorator resources", { resourcesBefore, resourcesAfter });
    assert(await page.evaluate(() => window.__game.forceSeraM11Timeout()),
      "operation-window timeout did not fail M11");
    await context.close();
  }

  assert(pageErrors.length === 0, "page errors", pageErrors);
  assert(consoleErrors.length === 0, "console errors", consoleErrors);
  console.log("check_sera_m11_e2e: PASS");
  console.log("  unlock / HALO HP / EW HUD / enhanced SAM / sanctuary / red x10 / white x16 / ARCA / full-partial-zero optional routes / Retry / timeout");
  console.log(`  screenshot: ${screenshotPath}`);
} finally {
  await browser.close();
  if (served.server) await new Promise((resolve) => served.server.close(resolve));
}
