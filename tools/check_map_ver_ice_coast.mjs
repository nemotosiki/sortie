#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = path.join(root, "payloads", "map_verIceCoast.payload.js");
const hostPath = path.join(root, "index.html");
const source = fs.readFileSync(payloadPath, "utf8");
const host = fs.readFileSync(hostPath, "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`check_map_ver_ice_coast: ${message}`);
};

assert(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'ctx.addWorldPreset("verIceCoast"',
  'ctx.addWorldDecorator("verIceCoastWorks"',
  'regionId: "ver_ice_coast"',
  'variant: "polar_morning_high_altitude"',
  'root.name = "verIceCoastWorks"',
  'verIceShelfWest', 'verIceLeadOne', 'verHarbourQuay',
  'previewFocus: [...frozenEyeBase]', 'verFrozenEyeInlandGrade',
  'verBaseRoadNorth', 'verBaseCentralApron', 'verBaseOpsWing',
  'verBasePortalMass', 'verBaseSupport', 'verWeatherMast',
  'verBaseAccessRoadUpper', 'verBaseAccessRoadHarbour'
]) assert(source.includes(token), `missing ${token}`);
assert(!/\bscene\.add\s*\(/.test(source), "decorator must not bypass addRoot");
assert(!/\bdispose\s*\(/.test(source), "decorator must not own disposal");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ver-ice-coast-check-"));
const modulePath = path.join(tempDir, "map_verIceCoast.mjs");
fs.writeFileSync(modulePath, source, "utf8");

try {
  let preset = null;
  let decorator = null;
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  register({
    tables: {
      WORLD_PRESETS: {
        glacierCanyon: {
          atmosphere: {}, ocean: {}, terrain: {}, lights: {}, mountains: {},
          clouds: {}, decor: {}, islands: {}
        }
      }
    },
    addWorldPreset(key, def) {
      assert(key === "verIceCoast", `unexpected preset key ${key}`);
      preset = def;
      return def;
    },
    addWorldDecorator(id, def) {
      assert(id === "verIceCoastWorks", `unexpected decorator id ${id}`);
      decorator = def;
      return def;
    }
  });

  assert(preset && decorator, "preset or decorator did not register");
  assert(preset.regionId === "ver_ice_coast", "region identity changed");
  assert(preset.fog?.near >= 9000 && preset.fog?.far >= 32000,
    `high-altitude visibility regressed: ${preset.fog?.near}/${preset.fog?.far}`);
  assert(preset.mountains?.corridor === null && preset.mountains?.plateau === null,
    "random relief obstructs the escort corridor");
  assert(preset.mountains?.height?.[1] <= 1400,
    "terrain reaches too high into the 4.8–5.4 km escort band");
  assert(preset.decor?.extraClouds?.stratusBase >= 2400,
    "low hard-edged stratus intrudes into the polar coast view");

  const anchors = preset.missionAnchors;
  for (const key of [
    "playerStart", "strikeStart", "strikeExit", "operationLine", "battleCenter",
    "firstIntercept", "northIntercept", "southIntercept", "baseCapEntry",
    "coastQraEntry", "inlandQraEntry", "arcaWatchStart", "arcaWatchExit",
    "diversionEntry", "weatherStation"
  ]) assert(anchors?.[key]?.length === 2, `mission anchor ${key} is malformed`);
  const base = anchors.weatherStation;
  assert(base[0] === 0 && base[1] === 6500,
    `Frozen Eye must sit on the western mainland shelf, got ${base.join(",")}`);
  const playerToBattleCenter = Math.hypot(
    anchors.playerStart[0] - anchors.battleCenter[0],
    anchors.playerStart[1] - anchors.battleCenter[1]
  );
  const baseToBattleCenter = Math.hypot(
    base[0] - anchors.battleCenter[0],
    base[1] - anchors.battleCenter[1]
  );
  assert(playerToBattleCenter < 16000 && baseToBattleCenter < 7000,
    "battle volume no longer covers both ingress and mainland base without an opening warning");
  assert(preset.previewFocus[0] === base[0] && preset.previewFocus[1] === base[1],
    "preview focus did not follow the relocated mainland base");
  for (const key of ["baseCapEntry", "coastQraEntry", "inlandQraEntry"]) {
    const range = Math.hypot(anchors[key][0] - base[0], anchors[key][1] - base[1]);
    assert(range >= 8000 && range <= 10500,
      `${key} must start 8-10.5km from the base, got ${range.toFixed(1)}`);
  }
  assert(anchors.baseCapEntry[0] < base[0] - 8000,
    "local CAP no longer approaches from the west");
  assert(anchors.coastQraEntry[1] < base[1] && anchors.inlandQraEntry[1] > base[1],
    "coast and inland QRA entries do not bracket the mainland base");
  const arcaRoute = Math.hypot(
    anchors.arcaWatchExit[0] - anchors.arcaWatchStart[0],
    anchors.arcaWatchExit[1] - anchors.arcaWatchStart[1]
  );
  assert(arcaRoute >= 14500 && arcaRoute <= 16000,
    `ARCA observer route should retire near the first radar window, got ${arcaRoute.toFixed(1)}m`);
  const routeLength = Math.hypot(
    anchors.strikeExit[0] - anchors.strikeStart[0],
    anchors.strikeExit[1] - anchors.strikeStart[1]
  );
  assert(routeLength >= 22500 && routeLength <= 23500,
    `escort route must remain about 23 km, got ${routeLength.toFixed(1)}`);
  assert(preset.fog.far > routeLength * 1.35,
    "operation line can enter the fog/camera cutoff from the opening formation");
  assert(Array.isArray(decorator.worlds) && decorator.worlds.length === 1
      && decorator.worlds[0] === "verIceCoast",
    "decorator leaks into another world");
  assert(typeof decorator.build === "function", "decorator build is missing");
  assert(host.includes("Math.max(CAMERA_BASE_FAR, preset.fog.far * CAMERA_FOG_FAR_MARGIN)"),
    "host no longer derives camera distance from world fog");

  console.log("check_map_ver_ice_coast: PASS");
  console.log(`  route=${routeLength.toFixed(0)}m fog=${preset.fog.near}-${preset.fog.far}m relief<=${preset.mountains.height[1]}m`);
  console.log("  broad shelf + dark leads + harbour-linked mainland Frozen Eye base registered");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
