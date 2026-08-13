#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(process.argv[1], "../..");
const portRequested = Number(process.env.SORTIE_FA18F_PORT || 0);

const playwrightCandidates = [
  process.env.SORTIE_PLAYWRIGHT,
  "playwright",
  "C:/Users/user01/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright"
].filter(Boolean);

function loadPlaywright() {
  for (const candidate of playwrightCandidates) {
    try { return require(candidate); } catch { /* next */ }
  }
  throw new Error("playwright not found; set SORTIE_PLAYWRIGHT or install playwright");
}

const chromePath = process.env.SORTIE_CHROME
  || "C:/Users/user01/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe";

const mime = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".css": "text/css", ".png": "image/png",
  ".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg"
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    const file = path.join(root, url === "/" ? "index.html" : url);
    if (!path.resolve(file).startsWith(path.resolve(root))) {
      res.writeHead(403); res.end(); return;
    }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404); res.end("not found"); return; }
      res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
  });
  await new Promise((resolve) => server.listen(portRequested, "127.0.0.1", resolve));
  return { server, port: server.address().port };
}

const { chromium } = loadPlaywright();
const { server, port } = await serve();
const browser = await chromium.launch({
  executablePath: chromePath,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
});

try {
  const context = await browser.newContext();
  await context.addInitScript(() => { navigator.getGamepads = () => []; });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "load" });
  await page.waitForFunction(
    () => window.__game && window.__game.debug && window.__game.debug.aircraftSpwProbe,
    null,
    { timeout: 45000 }
  );

  const result = await page.evaluate(() => {
    const hook = window.__game.debug;
    const readUi = () => ({
      value: document.getElementById("spwLoadoutValue")?.textContent || "",
      ammo: document.getElementById("ammoGrid")?.textContent || "",
      hidden: document.getElementById("spwLoadoutSelect")?.classList.contains("hidden") ?? true,
      hintHidden: document.getElementById("hangarSpwHint")?.classList.contains("hidden") ?? true
    });

    const states = {};
    states.selectedFa18 = hook.forceSelectAircraft("fa18");
    states.default = { probe: hook.aircraftSpwProbe(), ui: readUi() };

    states.selectGround = hook.forceSelectAircraftSpw("agm4");
    states.groundPreview = { probe: hook.aircraftSpwProbe(), ui: readUi() };
    states.loadGround = hook.forceLoadout("fa18");
    states.groundApplied = { probe: hook.aircraftSpwProbe(), ui: readUi() };

    states.selectShip = hook.forceSelectAircraftSpw("lasm");
    states.loadShip = hook.forceLoadout("fa18");
    states.shipApplied = { probe: hook.aircraftSpwProbe(), ui: readUi() };

    states.selectAir = hook.forceSelectAircraftSpw("aam4");
    states.loadAir = hook.forceLoadout("fa18");
    states.airApplied = { probe: hook.aircraftSpwProbe(), ui: readUi() };

    states.selectedF35 = hook.forceSelectAircraft("f35c");
    states.f35Default = { probe: hook.aircraftSpwProbe(), ui: readUi() };
    states.f35SelectGround = hook.forceSelectAircraftSpw("agm4");
    states.f35LoadGround = hook.forceLoadout("f35c");
    states.f35GroundApplied = { probe: hook.aircraftSpwProbe(), ui: readUi() };
    states.f35SelectShip = hook.forceSelectAircraftSpw("lasm");
    states.f35LoadShip = hook.forceLoadout("f35c");
    states.f35ShipApplied = { probe: hook.aircraftSpwProbe(), ui: readUi() };
    states.f35SelectAir = hook.forceSelectAircraftSpw("aam4");
    states.f35LoadAir = hook.forceLoadout("f35c");
    states.f35AirApplied = { probe: hook.aircraftSpwProbe(), ui: readUi() };

    states.selectedF16 = hook.forceSelectAircraft("f16");
    states.loadF16 = hook.forceLoadout("f16");
    states.fixedAircraft = { probe: hook.aircraftSpwProbe(), ui: readUi() };
    return states;
  });

  assert(pageErrors.length === 0, `page errors: ${pageErrors.join(" | ")}`);
  assert(result.selectedFa18 === true, "could not select F/A-18F");
  assert(JSON.stringify(result.default.probe.options) === JSON.stringify([
    { key: "aam4", capacity: 16 },
    { key: "agm4", capacity: 12 },
    { key: "lasm", capacity: 12 }
  ]), "F/A-18F option order or capacities are wrong");
  assert(result.default.probe.selectedKey === "aam4", "4AAM is not the default");
  assert(result.default.ui.hidden === false && result.default.ui.hintHidden === false, "selector is hidden for F/A-18F");
  assert(result.default.ui.value.includes("4AAM") && result.default.ui.value.includes("AIR"), "4AAM preview label is wrong");
  assert(result.default.ui.ammo.includes("4AAM") && result.default.ui.ammo.includes("16"), "4AAM ammo preview is wrong");

  assert(result.selectGround === true && result.loadGround === true, "4AGM selection/apply failed");
  assert(result.groundApplied.probe.selectedKey === "agm4", "4AGM was not retained");
  assert(result.groundApplied.probe.activeKey === "agm4" && result.groundApplied.probe.activeCapacity === 12, "4AGM was not applied to flight loadout");
  assert(result.groundPreview.ui.value.includes("4AGM") && result.groundPreview.ui.value.includes("GROUND"), "4AGM preview label is wrong");
  assert(result.groundPreview.ui.ammo.includes("4AGM") && result.groundPreview.ui.ammo.includes("12"), "4AGM ammo preview is wrong");

  assert(result.selectShip === true && result.loadShip === true, "LASM selection/apply failed");
  assert(result.shipApplied.probe.activeKey === "lasm" && result.shipApplied.probe.activeCapacity === 12, "LASM was not applied to flight loadout");
  assert(result.shipApplied.ui.value.includes("LASM") && result.shipApplied.ui.value.includes("SHIP"), "LASM preview label is wrong");

  assert(result.selectAir === true && result.loadAir === true, "4AAM re-selection/apply failed");
  assert(result.airApplied.probe.activeKey === "aam4" && result.airApplied.probe.activeCapacity === 16, "4AAM was not reapplied");

  assert(result.selectedF35 === true, "could not select F-35C");
  assert(JSON.stringify(result.f35Default.probe.options) === JSON.stringify([
    { key: "aam4", capacity: 16 },
    { key: "agm4", capacity: 12 },
    { key: "lasm", capacity: 14 }
  ]), "F-35C option order or capacities are wrong");
  assert(result.f35Default.probe.selectedKey === "aam4", "F-35C 4AAM is not the default");
  assert(result.f35Default.ui.hidden === false && result.f35Default.ui.hintHidden === false, "selector is hidden for F-35C");
  assert(result.f35SelectGround === true && result.f35LoadGround === true, "F-35C 4AGM selection/apply failed");
  assert(result.f35GroundApplied.probe.activeKey === "agm4" && result.f35GroundApplied.probe.activeCapacity === 12, "F-35C 4AGM was not applied");
  assert(result.f35SelectShip === true && result.f35LoadShip === true, "F-35C LASM selection/apply failed");
  assert(result.f35ShipApplied.probe.activeKey === "lasm" && result.f35ShipApplied.probe.activeCapacity === 14, "F-35C LASM was not applied");
  assert(result.f35ShipApplied.ui.value.includes("LASM") && result.f35ShipApplied.ui.value.includes("SHIP"), "F-35C LASM preview label is wrong");
  assert(result.f35SelectAir === true && result.f35LoadAir === true, "F-35C 4AAM re-selection/apply failed");
  assert(result.f35AirApplied.probe.activeKey === "aam4" && result.f35AirApplied.probe.activeCapacity === 16, "F-35C 4AAM was not reapplied");

  assert(result.selectedF16 === true && result.loadF16 === true, "fixed-loadout aircraft test setup failed");
  assert(result.fixedAircraft.probe.aircraftId === "f16", "F-16 probe is not active");
  assert(result.fixedAircraft.probe.options.length === 1 && result.fixedAircraft.probe.selectedKey === "qaam", "fixed F-16 SP.W contract changed");
  assert(result.fixedAircraft.ui.hidden === true && result.fixedAircraft.ui.hintHidden === true, "selector leaked to a non-F/A-18F aircraft");

  console.log("check_fa18f_spw_select_browser: PASS");
  console.log("  F/A-18F and F-35C both preview and apply 4AAM / 4AGM / LASM before mission start");
  console.log("  selector remains hidden for fixed-loadout aircraft");
} finally {
  await browser.close();
  server.close();
}
