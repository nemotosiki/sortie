#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const missionSource = fs.readFileSync(path.join(root, "payloads", "mission_sera_m14.payload.js"), "utf8");
const mapSource = fs.readFileSync(path.join(root, "payloads", "map_naharMudflats.payload.js"), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`check_sera_m14_payload: ${message}`);
};
assert(!missionSource.includes("\r") && !mapSource.includes("\r"), "payloads must be LF-only");
for (const token of [
  'key: "sera-m14"', 'title: "BREAKWATER"', 'world: "naharMudflats"',
  'hull: "hospitalShip"', 'vulnerable: false',
  'objectiveShipIds: Object.freeze([1411, 1412, 1413, 1414, 1415])',
  'hidden: true, hudHidden: true',
  'ctx.addMission(mission, { after: "sera-m13" })'
]) assert(missionSource.includes(token), `missing mission source contract ${token}`);
for (const token of [
  'const base = WORLD_PRESETS.archipelagoDay',
  'label: "NAHAR WESTERN APPROACHES — OPEN SEA"',
  'variant: "high_noon_open_sea_interdiction"',
  'mountains: { ...base.mountains, count: 0',
  'islands: { ...base.islands, count: 0',
  'ctx.addWorldDecorator("naharOffshoreNavigation"'
]) assert(mapSource.includes(token), `missing map source contract ${token}`);
for (const forbidden of ["WORLD_PRESETS.naharStrait", "surfaceHeightAt", "coast-house", "revetment"]) {
  assert(!mapSource.includes(forbidden), `retired shoreline token remains: ${forbidden}`);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-m14-check-"));
const missionPath = path.join(tempDir, "mission_sera_m14.mjs");
const mapPath = path.join(tempDir, "map_naharMudflats.mjs");
fs.writeFileSync(missionPath, missionSource, "utf8");
fs.writeFileSync(mapPath, mapSource, "utf8");
try {
  const { default: registerMap } = await import(`${pathToFileURL(mapPath).href}?v=${Date.now()}`);
  const base = {
    atmosphere: {}, ocean: {}, lights: {}, mountains: { count: 7, plateau: {} },
    islands: { count: 10 }, clouds: {}, decor: {}
  };
  let world = null;
  let decorator = null;
  registerMap({
    tables: { WORLD_PRESETS: { archipelagoDay: base } },
    addWorldPreset(key, def) { assert(key === "naharMudflats", "map key changed"); world = def; return def; },
    addWorldDecorator(key, def) { decorator = { key, ...def }; return def; }
  });
  assert(world?.mountains?.count === 0 && world?.islands?.count === 0,
    "open-ocean map still creates terrain");
  assert(world?.missionAnchors?.transferLine?.length === 2
      && decorator?.key === "naharOffshoreNavigation",
    "offshore anchors/decorator are missing");

  const { default: registerMission } = await import(`${pathToFileURL(missionPath).href}?v=${Date.now()}`);
  const MISSIONS = [{ key: "sera-m13", campaign: "sera", campaignOrder: 13 }];
  let mission = null;
  let insertion = null;
  registerMission({
    tables: {
      MISSIONS,
      WORLD_PRESETS: { naharMudflats: world },
      AIRCRAFT_TYPES: { fa18: {}, su33: {} },
      ENEMY_AI_PROFILES: { su33: {} },
      HELI_TYPES: { ka52: {} },
      SHIP_TYPES: {
        lhd: {}, landingShip: {}, aegis: {}, frigate: {},
        missileBoat: {}, hospitalShip: {}
      }
    },
    addMission(def, options) { mission = def; insertion = options; MISSIONS.push(def); return def; }
  });
  assert(mission?.campaignOrder === 14 && mission.storyNo === 14,
    "mission identity/numbering changed");
  assert(insertion?.after === "sera-m13", "M14 is not inserted after M13");
  assert(mission.friendlies.ships.hull === "hospitalShip"
      && mission.friendlies.ships.count === 1 && mission.friendlies.ships.vulnerable === false,
    "hospital ship must be an invulnerable blue friendly");
  assert(mission.friendlyBase.hidden && mission.friendlyBase.hudHidden,
    "offshore transfer line must be logical-only");

  const naval = mission.sequence.filter((entry) => entry.kind === "naval");
  const assault = naval.filter((entry) => entry.tgt).flatMap((entry) => entry.fleet);
  const screen = naval.filter((entry) => !entry.tgt).flatMap((entry) => entry.fleet);
  assert(assault.filter((type) => type === "lhd").length === 1
      && assault.filter((type) => type === "landingShip").length === 4
      && assault.length === 5,
    "red TGT must be LHD x1 + LST x4 only");
  assert(screen.filter((type) => type === "aegis").length === 1
      && screen.filter((type) => type === "frigate").length === 2
      && screen.filter((type) => type === "missileBoat").length === 4
      && naval.filter((entry) => !entry.tgt).every((entry) => entry.rankNeutral),
    "white escort screen composition/IFF changed");

  const airWaves = mission.sequence.filter((entry) => Array.isArray(entry.types));
  const air = airWaves.flatMap((entry) => entry.types);
  assert(air.filter((type) => type === "su33").length === 6
      && air.filter((type) => type === "ka52").length === 4
      && airWaves.every((entry) => !entry.tgt && entry.rankNeutral),
    "Su-33/Ka-52 must remain white optional pressure");
  assert(mission.m14LandingContract.objectiveShipIds.join(",") === "1411,1412,1413,1414,1415"
      && mission.m14LandingContract.escapeFailAt === 2,
    "interdiction objective IDs/failure threshold changed");
  console.log("check_sera_m14_payload: PASS");
  console.log("  open sea / red LHD x1 + LST x4 / white screen x7 + Su-33 x6 + Ka-52 x4 / blue hospital ship");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
