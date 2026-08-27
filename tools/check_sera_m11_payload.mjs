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
  'aircraft: "jammer"', 'spw: "aam4"', 'playerStartAltitude = 9144',
  'operationAltitude = 10500',
  'safeAltitude = 9000', 'interceptorAltitude = 10650', 'jamDuration: 60',
  'radarOnlineDuration: 18', 'warningLead: 35', 'enhancedTurnRateDeg: 75',
  'radarOnlineMissileMaxSpeed = 4000 / 3.6', 'enhancedNavigationRatio: 8',
  'enhancedMaxLateralG: 150', 'enhancedLife: 18',
  'ctx.addGroundType("m11FireControlRadar"', 'ctx.addGroundModel("m11FireControlRadar"',
  'ctx.addGroundType("m11ControlStation"', 'ctx.addGroundType("m11PowerPlant"',
  'ctx.addGroundType("m11FuelFarm"', 'ctx.addAceProfile("granite"',
  'missionRole: "fireControlRadar"', 'missionRole: "baseSam"',
  'callsign: "ARCA POLAR WATCH"', 'speaker: "pax"',
  'ctx.addMission(mission, { after: "sera-m10" })'
]) assert(source.includes(token), `missing source contract ${token}`);
for (const forbidden of ['aircraft: "b1b"', "CROWN 1", 'aircraft: "f3"']) {
  assert(!source.includes(forbidden), `superseded content leaked into M11: ${forbidden}`);
}

const anchors = {
  playerStart: [-10800, -7200], strikeStart: [-9600, -6400], strikeExit: [9600, 6400],
  operationLine: [9000, 6000], battleCenter: [0, 0], firstIntercept: [-1800, 4100],
  northIntercept: [3100, 8600], southIntercept: [11200, -6500],
  baseCapEntry: [-3500, 1000], coastQraEntry: [12400, 1000], inlandQraEntry: [6500, -12100],
  arcaWatchStart: [-6500, 8000], arcaWatchExit: [8500, 6000],
  diversionEntry: [-2500, -8200], weatherStation: [4300, -2500]
};
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-m11-check-"));
const modulePath = path.join(tempDir, "mission_sera_m11.mjs");
fs.writeFileSync(modulePath, source, "utf8");

try {
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  const MISSIONS = [{ key: "sera-m10", campaign: "sera", campaignOrder: 10 }];
  const GROUND_TYPES = {
    radarSite: { hp: 70 }, bunker: { hp: 120 }, fuelTank: { hp: 50 },
    samSite: { hp: 90 }, aaGun: { hp: 60 }, adTank: { hp: 128 }
  };
  const ACE_PROFILES = { longbow: { behavior: "armored", theme: { scale: 1 } } };
  const groundModels = new Map();
  let mission = null;
  let insertion = null;
  register({
    tables: {
      MISSIONS,
      WORLD_PRESETS: { verIceCoast: { missionAnchors: anchors } },
      AIRCRAFT_TYPES: { fa18: {}, jammer: {}, mig29: {}, mig31: {}, typhoon: {} },
      ENEMY_AI_PROFILES: { mig29: {}, mig31: {} },
      ACE_PROFILES,
      GROUND_TYPES
    },
    addGroundType(id, def) {
      assert(!GROUND_TYPES[id], `duplicate custom ground type ${id}`);
      GROUND_TYPES[id] = def;
      return def;
    },
    addGroundModel(id, def) {
      assert(!groundModels.has(id), `duplicate custom ground model ${id}`);
      groundModels.set(id, def);
      return def;
    },
    addAceProfile(id, def) {
      assert(!ACE_PROFILES[id], `duplicate ace profile ${id}`);
      ACE_PROFILES[id] = def;
      return def;
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
  assert(mission.friendlies.playerStart.y === 9144,
    "RAVEN/LARK must enter below the HALO/MiG-31 high-altitude fight");
  assert(halo.altitude === 10500 && halo.hp === 392 && halo.speed === 180,
    "HALO altitude/HP/speed changed");
  assert(mission.friendlies.guard.readout === "integrity", "HALO aggregate integrity readout missing");
  const arca = mission.friendlies.supportFlights?.[0];
  assert(mission.friendlies.supportFlights.length === 1 && arca.aircraft === "typhoon"
      && arca.callsign === "ARCA POLAR WATCH" && arca.count === 2
      && arca.vulnerable === false && arca.altitude === 9800,
    "blue ARCA observer flight is malformed");

  for (const id of ["m11FireControlRadar", "m11ControlStation", "m11PowerPlant", "m11FuelFarm"]) {
    assert(GROUND_TYPES[id]?.key === id && typeof groundModels.get(id)?.build === "function",
      `custom target type/model is missing: ${id}`);
  }
  assert(ACE_PROFILES.granite?.callsign === "GRANITE"
      && ACE_PROFILES.granite.role.includes("WARDEN 1"),
    "GRANITE ace profile is malformed");

  const redGround = mission.groundUnits.filter((unit) => unit.tgt !== false);
  assert(redGround.length === 10 && redGround.every((unit) => unit.mark === "m11BaseNode"),
    "red base target set must contain ten marked facilities");
  assert(redGround.filter((unit) => unit.missionRole === "fireControlRadar").length === 2,
    "two fire-control radars are required");
  assert(redGround.filter((unit) => unit.missionRole === "baseSam").length === 3,
    "three tagged base SAMs are required");
  assert(redGround.slice(0, 5).map((unit) => unit.type).join(",") === [
    "m11FireControlRadar", "m11FireControlRadar", "m11ControlStation",
    "m11PowerPlant", "m11FuelFarm"
  ].join(","), "red facility identities changed");
  const perimeter = mission.groundUnits.filter((unit) => unit.mark === "m11PerimeterContact");
  assert(perimeter.length === 6 && perimeter.every((unit) => (
    unit.tgt === false && unit.rankNeutral && unit.missionRole === "perimeterDefence"
  )), "white perimeter-defence set is malformed");
  assert(perimeter.filter((unit) => unit.type === "adTank").length === 2
      && perimeter.filter((unit) => unit.type === "aaGun").length === 4,
    "perimeter mix must be SHORAD x2 + AAA x4");
  assert(perimeter.every((unit) => unit.missionRole !== "baseSam" && unit.mark !== "m11BaseNode"),
    "white perimeter defence can inherit the enhanced base-SAM contract");

  assert(mission.sequence.length === 6 && mission.sequence.every((wave) => (
    wave.tgt === false && wave.rankNeutral
  )), "M11 optional-air wave contract is malformed");
  const airTypes = mission.sequence.flatMap((wave) => wave.types);
  assert(airTypes.filter((type) => type === "mig29").length === 6
      && airTypes.filter((type) => type === "mig31").length === 4,
    "air-defence total must be MiG-29A x6 + MiG-31 x4");
  const mig29Waves = mission.sequence.filter((wave) => wave.types.every((type) => type === "mig29"));
  assert(mig29Waves.length === 3 && mig29Waves.map((wave) => wave.delay).join(",") === "18,75,87"
      && mig29Waves.every((wave) => wave.types.length === 2 && !wave.hunt),
    "CAP/QRA stagger is malformed");
  const mig31Waves = mission.sequence.filter((wave) => wave.types.every((type) => type === "mig31"));
  assert(mig31Waves.length === 3 && mig31Waves.reduce((sum, wave) => sum + wave.types.length, 0) === 4,
    "MiG-31 secondary flights are malformed");
  assert(mig31Waves[0].hunt === "air" && mig31Waves[0].altitude === 10650
      && mig31Waves[1].ace === "granite" && mig31Waves[1].delay === 145
      && !mig31Waves[1].hunt && mig31Waves[2].hunt === "air" && mig31Waves[2].delay === 149,
    "opening hunter / GRANITE / WARDEN wing roles are malformed");

  const contract = mission.m11EscortContract;
  assert(contract.total === 3 && contract.requiredSaved === 2 && contract.timeLimit === 330,
    "HALO survival contract changed");
  assert(contract.operationAltitude === 10500 && contract.safeAltitude === 9000
      && contract.interceptorAltitude === 10650,
    "mission altitude geometry changed");
  assert(contract.base.total === 10 && contract.rank.secondaryKillsForS === 4,
    "base/secondary result contract changed");
  assert(contract.electronicWarfare.enhancedTurnRateDeg <= 75,
    "M11 SAM boost bypasses the global turn ceiling");
  assert(Math.abs(contract.electronicWarfare.enhancedMaxSpeed * 3.6 - 4000) < 1e-9,
    "radar-online SAM maximum speed must be exactly 4,000 km/h");
  assert(contract.electronicWarfare.enhancedNavigationRatio === 8
      && contract.electronicWarfare.enhancedMaxLateralG === 150
      && contract.electronicWarfare.enhancedLife === 18,
    "radar-online SAM near-unavoidable guidance contract changed");
  assert(10650 - mission.friendlies.playerStart.y > 1200
      && 10650 - mission.friendlies.playerStart.y < 2000,
    "MiG-31 vertical separation must exceed MSL and fit 4AAM range");
  assert(Math.abs(10650 - halo.altitude) <= 200,
    "MiG-31 must remain in HALO's high-altitude band while hunting it");

  console.log("check_sera_m11_payload: PASS");
  console.log("  HALO x3 / red base x10 / perimeter x6 / MiG-29A x6 + MiG-31 x4 / blue ARCA x2");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
