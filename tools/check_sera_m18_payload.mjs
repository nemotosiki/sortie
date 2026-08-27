#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "payloads", "mission_sera_m18.payload.js"), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(`check_sera_m18_payload: ${message}`); };
assert(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'key: "sera-m18"', 'title: "HORN OF HEAVEN"', 'world: "aradMountainsArchive"',
  'routeRequired: Object.freeze({ radar: 2, power: 3, direct: 6 })',
  'corePhase: "m18CoreExposure"', 'ctx.addMission(mission, { after: "sera-m17" })'
]) assert(source.includes(token), `missing source contract ${token}`);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-m18-check-"));
const modulePath = path.join(tempDir, "mission_sera_m18.mjs");
fs.writeFileSync(modulePath, source, "utf8");
try {
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  const MISSIONS = [{ key: "sera-m17", campaign: "sera", campaignOrder: 17 }];
  const anchors = {
    playerStart: [0, 5400], battleCenter: [0, -2650], commandCore: [0, -5350],
    radarWest: [-330, -1500], radarEast: [330, -1850], powerNorth: [-390, -2350],
    powerMid: [390, -3300], powerSouth: [-390, -4300], coolerWest: [-340, -3900],
    coolerEast: [340, -4700], airNorth: [-5200, -2100], airSouth: [5200, -3600],
    prototype: [0, -8200]
  };
  const aircraft = Object.fromEntries(["f15", "ea18g", "b2", "a10", "mig29", "su57"].map((key) => [key, {}]));
  const ground = Object.fromEntries([
    "kerenGun", "kerenPylon", "kerenCooler", "kerenRadar", "kerenCore", "longRangeSam", "spaag"
  ].map((key) => [key, {}]));
  let mission = null;
  let insertion = null;
  register({
    tables: {
      MISSIONS, WORLD_PRESETS: { aradMountainsArchive: { missionAnchors: anchors } },
      AIRCRAFT_TYPES: aircraft, ENEMY_AI_PROFILES: { mig29: {}, su57: {} },
      HELI_TYPES: { ka52: {} }, GROUND_TYPES: ground
    },
    addMission(def, options) { mission = def; insertion = options; MISSIONS.push(def); return def; }
  });
  assert(mission?.campaignOrder === 18 && insertion?.after === "sera-m17", "identity/insertion changed");
  const countGround = (type) => mission.groundUnits.filter((unit) => unit.type === type).length;
  assert(countGround("kerenGun") === 6 && countGround("kerenPylon") === 3
      && countGround("kerenCooler") === 2 && countGround("kerenRadar") === 2
      && countGround("kerenCore") === 1, "KEREN subsystem totals changed");
  assert(countGround("longRangeSam") === 4 && countGround("spaag") === 6,
    "valley defence totals changed");
  const air = mission.sequence.flatMap((entry) => entry.types || []);
  assert(air.filter((type) => type === "ka52").length === 4
      && air.filter((type) => type === "mig29").length === 4
      && air.filter((type) => type === "su57").length === 1,
    "air-defence totals or one-prototype limit changed");
  const core = mission.groundUnits.find((unit) => unit.type === "kerenCore");
  assert(core?.phase === "m18CoreExposure" && mission.groundPhaseContracts[0].activeInitially === false,
    "command core must remain dormant until a valid route");
  console.log("check_sera_m18_payload: PASS");
  console.log("  6 guns / 3 pylons / 2 coolers / 2 radars / dormant core / 10 air-defence units / one Su-57");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
