#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "payloads", "mission_sera_m19.payload.js"), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(`check_sera_m19_payload: ${message}`); };
assert(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'key: "sera-m19"', 'title: "TRUST FALL"', 'world: "migalOuterSunset"',
  'escortRadius: 2600', 'pursuitKillsRequired: 2', 'cumulativeThreshold: 8',
  'ctx.addMission(mission, { after: "sera-m18" })'
]) assert(source.includes(token), `missing source contract ${token}`);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-m19-check-"));
const modulePath = path.join(tempDir, "mission_sera_m19.mjs");
fs.writeFileSync(modulePath, source, "utf8");
try {
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  const MISSIONS = [{ key: "sera-m18", campaign: "sera", campaignOrder: 18 }];
  const anchors = {
    playerStart: [0, 10800], battleCenter: [0, -1800], convoyStart: [0, 8800],
    convoyExit: [0, -13200], westIntercept: [-9800, 3200], eastIntercept: [9800, 1800],
    northIntercept: [0, 14200], lowIntercept: [-7600, -7600],
    arcaEntry: [-11200, -3400], arcaExit: [12400, -10400]
  };
  const types = ["f15c", "f15", "c17", "uav", "mig29", "su35", "s70", "su57", "jammer", "f3"];
  const aircraft = Object.fromEntries(types.map((key) => [key, {}]));
  const profiles = Object.fromEntries(["mig29", "su35", "s70", "su57", "jammer", "f3"].map((key) => [key, {}]));
  let mission = null;
  let insertion = null;
  register({
    tables: {
      MISSIONS, WORLD_PRESETS: { migalOuterSunset: { missionAnchors: anchors } },
      AIRCRAFT_TYPES: aircraft, ENEMY_AI_PROFILES: profiles, ENEMY_MISSILE_PROFILES: { f3: {} }
    },
    addMission(def, options) { mission = def; insertion = options; MISSIONS.push(def); return def; }
  });
  assert(mission?.campaignOrder === 19 && insertion?.after === "sera-m18", "identity/insertion changed");
  assert(mission.friendlies.wingmen.some((entry) => entry.type === "f15c" && entry.label === "CROWN")
      && mission.friendlies.wingmen.some((entry) => entry.type === "f15" && entry.label.includes("LARK")),
    "CROWN F-15C / LARK F-15E fixed roster changed");
  const escorts = mission.friendlies.transportGroups;
  assert(escorts[0].aircraft === "c17" && escorts[0].count === 1
      && escorts[1].aircraft === "uav" && escorts[1].count === 3,
    "ceasefire transport/distribution drone formation changed");
  const air = mission.sequence.flatMap((entry) => entry.types || []);
  assert(air.filter((type) => type === "mig29").length === 6
      && air.filter((type) => type === "s70").length === 4
      && air.filter((type) => type === "su35").length === 4
      && air.filter((type) => type === "su57").length === 1,
    "red attacker totals or one-Su-57 limit changed");
  const arca = mission.sequence.find((entry) => entry.missionTag === "m19ArcaRetreat");
  assert(arca?.types.length === 4 && arca.types.every((type) => type === "f3")
      && arca.tgt === false && arca.rankNeutral === true,
    "retreating ARCA must remain four optional rank-neutral F-3 contacts");
  console.log("check_sera_m19_payload: PASS");
  console.log("  CROWN F-15C + LARK F-15E / four-aircraft escort / 16 red TGTs / four white F-3s");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
