#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "payloads", "mission_sera_m16.payload.js"), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`check_sera_m16_payload: ${message}`);
};
assert(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'key: "sera-m16"', 'title: "HOME FLEET"', 'world: "hadorDeepSea"',
  'ssgnIds: Object.freeze([1601, 1602])', 'weaponTotal: 8',
  'fleetLabel: "HOME FLEET"', 'ctx.addMission(mission, { after: "sera-m15" })'
]) assert(source.includes(token), `missing source contract ${token}`);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-m16-check-"));
const modulePath = path.join(tempDir, "mission_sera_m16.mjs");
fs.writeFileSync(modulePath, source, "utf8");
try {
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  const MISSIONS = [{ key: "sera-m15", campaign: "sera", campaignOrder: 15 }];
  const anchors = {
    playerStart: [-1800, 7200], battleCenter: [0, -1600], fleetCenter: [0, -1800],
    fleetCourse: [0, -10800], westSsgn: [-7200, -900], eastSsgn: [7600, -3200],
    bomberEntry: [0, 14200], northCap: [-8600, 9800], southCap: [9200, -11600],
    reconStation: [9600, 5200]
  };
  const aircraft = Object.fromEntries(["fa18", "tu22m3", "su33", "awacs", "cruiseWeapon"].map((key) => [key, {}]));
  const profiles = Object.fromEntries(["tu22m3", "su33", "awacs", "cruiseWeapon"].map((key) => [key, {}]));
  const ships = Object.fromEntries(["carrier", "cruiser", "frigate", "ssgn"].map((key) => [key, {}]));
  let mission = null;
  let insertion = null;
  register({
    tables: {
      MISSIONS,
      WORLD_PRESETS: { hadorDeepSea: { missionAnchors: anchors } },
      AIRCRAFT_TYPES: aircraft,
      ENEMY_AI_PROFILES: profiles,
      SHIP_TYPES: ships
    },
    addMission(def, options) { mission = def; insertion = options; MISSIONS.push(def); return def; }
  });
  assert(mission?.campaignOrder === 16 && insertion?.after === "sera-m15",
    "mission identity/insertion changed");
  assert(mission.friendlies.carrier.label === "CVN EPOCH"
      && mission.friendlies.shipGroups.length === 2
      && mission.friendlies.guard.readout === "integrity",
    "aggregate four-hull fleet deployment changed");
  const air = mission.sequence.flatMap((entry) => entry.types || []);
  assert(air.filter((type) => type === "tu22m3").length === 4
      && air.filter((type) => type === "su33").length === 6
      && air.filter((type) => type === "awacs").length === 1,
    "4 bomber / 6 Su-33 / 1 recon force changed");
  assert(mission.m16FleetContract.ssgnIds.length === 2
      && mission.m16FleetContract.weaponTotal === 8
      && mission.m16FleetContract.permanentSurfaceAfter === 3,
    "SSGN firing-window contract changed");
  console.log("check_sera_m16_payload: PASS");
  console.log("  four-hull HOME FLEET / SSGN x2 / Tu-22M3 x4 / Su-33 x6 / 8 interceptable weapons");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
