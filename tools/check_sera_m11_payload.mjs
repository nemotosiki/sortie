#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = path.join(root, "payloads", "mission_sera_m11.payload.js");
const source = fs.readFileSync(payloadPath, "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`check_sera_m11_payload: ${message}`);
};

assert(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'key: "sera-m11"', 'title: "FROZEN EYE"', 'world: "verIceCoast"',
  'aircraft: "jammer"', 'spw: "aam4"', 'operationAltitude = 9144',
  'safeAltitude = 9000', 'interceptorAltitude = 10650', 'jamDuration: 100',
  'radarOnlineDuration: 18', 'warningLead: 35', 'enhancedTurnRateDeg: 75',
  'missionRole: "fireControlRadar"', 'missionRole: "baseSam"',
  'ctx.addMission(mission, { after: "sera-m10" })'
]) assert(source.includes(token), `missing source contract ${token}`);
for (const forbidden of ['aircraft: "b1b"', 'type: "mig29"', "CROWN 1"]) {
  assert(!source.includes(forbidden), `superseded content leaked into M11: ${forbidden}`);
}

const anchors = {
  playerStart: [-10800, -7200], strikeStart: [-9600, -6400], strikeExit: [9600, 6400],
  operationLine: [9000, 6000], battleCenter: [0, 0], firstIntercept: [-1800, 4100],
  northIntercept: [3100, 8600], southIntercept: [11200, -6500],
  diversionEntry: [-2500, -8200], weatherStation: [4300, -2500]
};
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-m11-check-"));
const modulePath = path.join(tempDir, "mission_sera_m11.mjs");
fs.writeFileSync(modulePath, source, "utf8");

try {
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  const MISSIONS = [{ key: "sera-m10", campaign: "sera", campaignOrder: 10 }];
  let mission = null;
  let insertion = null;
  register({
    tables: {
      MISSIONS,
      WORLD_PRESETS: { verIceCoast: { missionAnchors: anchors } },
      AIRCRAFT_TYPES: { fa18: {}, jammer: {}, mig31: {} },
      ENEMY_AI_PROFILES: { mig31: {} },
      GROUND_TYPES: { radarSite: {}, bunker: {}, fuelTank: {}, samSite: {}, aaGun: {} }
    },
    addMission(def, options) {
      mission = def;
      insertion = options;
      MISSIONS.push(def);
      return def;
    }
  });

  assert(mission?.key === "sera-m11" && mission.campaignOrder === 11 && mission.storyNo === 11,
    "mission identity/numbering changed");
  assert(insertion?.after === "sera-m10", "M11 is not inserted after M10");
  assert(!JSON.stringify(mission.friendlies).includes("CROWN"), "CROWN returned after M06");

  const wingman = mission.friendlies.wingmen?.[0];
  assert(mission.friendlies.wingmen.length === 1 && wingman.type === "fa18"
      && wingman.label === "ROOK 2 LARK" && wingman.spw === "aam4",
    "LARK F/A-18F + 4AAM identity changed");
  const halo = mission.friendlies.transportGroups?.[0];
  assert(mission.friendlies.transportGroups.length === 1 && halo.aircraft === "jammer"
      && halo.count === 3 && halo.vulnerable && halo.holdAtExit,
    "HALO electronic-support formation is malformed");
  assert(halo.altitude === 9144 && halo.hp === 392 && halo.speed === 180,
    "HALO altitude/HP/speed changed");
  assert(mission.friendlies.guard.readout === "integrity", "HALO aggregate integrity readout missing");

  const redGround = mission.groundUnits.filter((unit) => unit.tgt !== false);
  assert(redGround.length === 10 && redGround.every((unit) => unit.mark === "m11BaseNode"),
    "red base target set must contain ten marked facilities");
  assert(redGround.filter((unit) => unit.missionRole === "fireControlRadar").length === 2,
    "two fire-control radars are required");
  assert(redGround.filter((unit) => unit.missionRole === "baseSam").length === 3,
    "three tagged base SAMs are required");

  assert(mission.sequence.length === 2 && mission.sequence.every((wave) => (
    wave.tgt === false && wave.rankNeutral && wave.hunt === "air"
      && wave.types.length === 2 && wave.types.every((type) => type === "mig31")
      && wave.huntAltitudeFloor === 10650 && wave.altitude === 10650
  )), "MiG-31 secondary flights are malformed");
  assert(mission.sequence[1].delay === 92, "second MiG-31 pair timing changed");

  const contract = mission.m11EscortContract;
  assert(contract.total === 3 && contract.requiredSaved === 2 && contract.timeLimit === 330,
    "HALO survival contract changed");
  assert(contract.operationAltitude === 9144 && contract.safeAltitude === 9000
      && contract.interceptorAltitude === 10650,
    "mission altitude geometry changed");
  assert(contract.base.total === 10 && contract.rank.secondaryKillsForS === 4,
    "base/secondary result contract changed");
  assert(contract.electronicWarfare.enhancedTurnRateDeg <= 75,
    "M11 SAM boost bypasses the global turn ceiling");
  assert(10650 - 9144 > 1200 && 10650 - 9144 < 2000,
    "MiG-31 vertical separation must exceed MSL and fit 4AAM range");

  console.log("check_sera_m11_payload: PASS");
  console.log("  HALO EW x3 / base TGT x10 / 100s jam + 18s online / white MiG-31 x4");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
