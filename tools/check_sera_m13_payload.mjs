#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = path.join(root, "payloads", "mission_sera_m13.payload.js");
const source = fs.readFileSync(payloadPath, "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`check_sera_m13_payload: ${message}`);
};

assert(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'key: "sera-m13"', 'title: "LIFELINE"', 'world: "hadorIslands"',
  'aircraft: "c17"', 'aircraft: "tanker"', 'readout: "integrity"',
  'missionTag: "m13Awacs"', 'reinforcementDelay: 45', 'fleet: ["missileBoat", "missileBoat"]',
  'ctx.addMission(mission, { after: "sera-m12" })'
]) assert(source.includes(token), `missing source contract ${token}`);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-m13-check-"));
const modulePath = path.join(tempDir, "mission_sera_m13.mjs");
fs.writeFileSync(modulePath, source, "utf8");
try {
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  const MISSIONS = [{ key: "sera-m12", campaign: "sera", campaignOrder: 12 }];
  const anchors = {
    playerStart: [-900, 9200], convoyStart: [0, 8200], convoyExit: [0, -12600],
    battleCenter: [0, -2200], awacsStation: [9300, -2600], eastIntercept: [9000, 5400],
    westIntercept: [-9200, 1200], northIntercept: [2200, 12400], southIntercept: [-1800, -14800],
    eastMissileBoats: [4700, -2800], westMissileBoats: [-4800, -5200]
  };
  let mission = null;
  let insertion = null;
  register({
    tables: {
      MISSIONS,
      WORLD_PRESETS: { hadorIslands: { missionAnchors: anchors } },
      AIRCRAFT_TYPES: Object.fromEntries(
        ["c17", "tanker", "fa18", "mig29", "mig31", "a100"].map((id) => [id, {}])
      ),
      ENEMY_AI_PROFILES: { mig29: {}, mig31: {}, a100: {} },
      SHIP_TYPES: { missileBoat: {} }
    },
    addMission(def, options) { mission = def; insertion = options; MISSIONS.push(def); return def; }
  });

  assert(mission?.campaignOrder === 13 && mission.storyNo === 13,
    "mission identity/numbering changed");
  assert(insertion?.after === "sera-m12", "M13 is not inserted after M12");
  const groups = mission.friendlies.transportGroups;
  assert(groups.length === 2 && groups[0].aircraft === "c17" && groups[0].count === 3
      && groups[1].aircraft === "tanker" && groups[1].count === 1
      && groups.every((group) => group.vulnerable),
    "LIFELINE must contain three C-17s and one vulnerable tanker");
  assert(mission.friendlies.guard.readout === "integrity"
      && mission.m13EscortContract.total === 4,
    "four-aircraft aggregate integrity contract is missing");

  const airTypes = mission.sequence.flatMap((entry) => entry.types || []);
  assert(airTypes.filter((type) => type === "mig29").length === 8,
    "MiG-29A main force must total eight");
  assert(airTypes.filter((type) => type === "mig31").length === 2,
    "high-altitude MiG-31 element must total two");
  const awacs = mission.sequence.find((entry) => entry.missionTag === "m13Awacs");
  assert(awacs?.types?.join(",") === "a100" && awacs.tgt === false && awacs.rankNeutral,
    "distant A-100 must be white/rank-neutral");
  const delayed = mission.sequence.filter((entry) => entry.missionTag === "m13Reinforcement");
  assert(delayed.length === 4 && delayed.reduce((sum, entry) => sum + entry.types.length, 0) === 8
      && delayed.every((entry) => entry.concurrent && entry.delay > 0 && entry.hunt === "air"),
    "four delayed transport-hunter waves are malformed");
  const boats = mission.sequence.find((entry) => entry.kind === "naval");
  assert(boats?.fleet?.join(",") === "missileBoat,missileBoat" && boats.tgt,
    "two designated route-crossing missile boats are required");

  console.log("check_sera_m13_payload: PASS");
  console.log("  LIFELINE 3+1 / MiG-29A x8 / MiG-31 x2 / A-100 choice / boats x2");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
