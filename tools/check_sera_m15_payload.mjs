#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "payloads", "mission_sera_m15.payload.js"), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`check_sera_m15_payload: ${message}`);
};
assert(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'key: "sera-m15"', 'title: "NIGHT OF NUMBERS"', 'world: "migalCityNight"',
  'cruiseType: "cruiseWeapon"', 'whiteArcaTag: "arcaWhiteM15"',
  'cruiseEligibleIds: Object.freeze([1511, 1531, 1551, 1552])',
  'ctx.addMission(mission, { after: "sera-m14" })'
]) assert(source.includes(token), `missing source contract ${token}`);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-m15-check-"));
const modulePath = path.join(tempDir, "mission_sera_m15.mjs");
fs.writeFileSync(modulePath, source, "utf8");
try {
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  const MISSIONS = [{ key: "sera-m14", campaign: "sera", campaignOrder: 14 }];
  const anchors = {
    playerStart: [0, 600], battleCenter: [0, -7600], militaryRoot: [0, -9000],
    powerDistrict: [-920, -9380], hospitalDistrict: [940, -8620],
    northernLane: [0, 900], westernLane: [-9800, -8000], easternLane: [9800, -7800],
    arcaEntry: [-5200, -4700], arcaExit: [5200, -11800]
  };
  const aircraft = Object.fromEntries([
    "tu22m3", "su35", "jammer", "typhoon", "cruiseWeapon", "fa18", "f15c", "uav"
  ].map((key) => [key, {}]));
  const profiles = Object.fromEntries([
    "tu22m3", "su35", "jammer", "typhoon", "cruiseWeapon"
  ].map((key) => [key, {}]));
  let mission = null;
  let insertion = null;
  register({
    tables: {
      MISSIONS,
      WORLD_PRESETS: { migalCityNight: { missionAnchors: anchors } },
      AIRCRAFT_TYPES: aircraft,
      ENEMY_AI_PROFILES: profiles
    },
    addMission(def, options) { mission = def; insertion = options; MISSIONS.push(def); return def; }
  });
  assert(mission?.campaignOrder === 15 && insertion?.after === "sera-m14",
    "mission identity/insertion changed");
  assert(mission.protectedFacilities.length === 3,
    "three city districts are required");
  const air = mission.sequence.flatMap((entry) => entry.types || []);
  assert(air.filter((type) => type === "tu22m3").length === 6
      && air.filter((type) => type === "su35").length === 6,
    "bomber/escort totals changed");
  const arca = mission.sequence.find((entry) => entry.missionTag === "arcaWhiteM15");
  assert(arca && arca.tgt === false && arca.rankNeutral === true
      && arca.types.length === 2 && arca.types.every((type) => type === "typhoon"),
    "white ARCA must remain optional and rank-neutral");
  assert(mission.friendlies.supportFlights.some((flight) => (
    flight.callsign === "ARCA CIVIC WATCH" && flight.holdAtExit === false
  )), "blue ARCA withdrawal flight is missing");
  console.log("check_sera_m15_payload: PASS");
  console.log("  jammer / three bomber lanes / 4 cruise weapons / separate blue-to-white ARCA objects");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
