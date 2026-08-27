#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "payloads", "mission_sera_m14.payload.js"), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`check_sera_m14_payload: ${message}`);
};
assert(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'key: "sera-m14"', 'title: "BREAKWATER"', 'world: "naharMudflats"',
  'hull: "hospitalShip"', 'vulnerable: false', 'fleet: ["lhd", "landingShip"',
  'landingShipIds: Object.freeze([1412, 1413, 1414, 1415])',
  'ctx.addMission(mission, { after: "sera-m13" })'
]) assert(source.includes(token), `missing source contract ${token}`);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-m14-check-"));
const modulePath = path.join(tempDir, "mission_sera_m14.mjs");
fs.writeFileSync(modulePath, source, "utf8");
try {
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  const MISSIONS = [{ key: "sera-m13", campaign: "sera", campaignOrder: 13 }];
  const anchors = {
    playerStart: [-10800, 300], battleCenter: [-3800, -900], assaultEntry: [5200, 0],
    beachhead: [-7800, -2150], hospitalStart: [-9800, 900], hospitalExit: [9000, 1250],
    northCapEntry: [7800, 7600], southCapEntry: [8200, -7600]
  };
  let mission = null;
  let insertion = null;
  register({
    tables: {
      MISSIONS,
      WORLD_PRESETS: { naharMudflats: { missionAnchors: anchors } },
      AIRCRAFT_TYPES: { fa18: {}, su33: {} },
      ENEMY_AI_PROFILES: { su33: {} },
      HELI_TYPES: { ka52: {} },
      SHIP_TYPES: { lhd: {}, landingShip: {}, missileBoat: {}, hospitalShip: {} },
      GROUND_TYPES: { tank: {}, spaag: {} }
    },
    addMission(def, options) { mission = def; insertion = options; MISSIONS.push(def); return def; }
  });
  assert(mission?.campaignOrder === 14 && mission.storyNo === 14,
    "mission identity/numbering changed");
  assert(insertion?.after === "sera-m13", "M14 is not inserted after M13");
  assert(mission.friendlies.ships.hull === "hospitalShip"
      && mission.friendlies.ships.count === 1 && mission.friendlies.ships.vulnerable === false,
    "hospital ship must be an invulnerable blue friendly");
  const naval = mission.sequence.find((entry) => entry.kind === "naval");
  assert(naval.fleet.filter((type) => type === "lhd").length === 1
      && naval.fleet.filter((type) => type === "landingShip").length === 4
      && naval.fleet.filter((type) => type === "missileBoat").length === 4
      && naval.tgt, "assault fleet mix changed");
  const air = mission.sequence.flatMap((entry) => entry.types || []);
  assert(air.filter((type) => type === "su33").length === 6
      && air.filter((type) => type === "ka52").length === 4,
    "carrier-air/attack-helicopter totals changed");
  assert(mission.m14LandingContract.landingShipIds.join(",") === "1412,1413,1414,1415",
    "LST ids do not match the naval formation slots");
  console.log("check_sera_m14_payload: PASS");
  console.log("  LHD x1 / LST x4 / missile boats x4 / Su-33 x6 / Ka-52 x4 / blue hospital ship");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
