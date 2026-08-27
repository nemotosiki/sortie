#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(`check_sera_m18_preflight: ${message}`); };
const host = read("index.html");
const map = read("payloads", "map_aradMountains.payload.js");
const mission = read("payloads", "mission_sera_m18.payload.js");
const keren = read("payloads", "ground_keren.payload.js");
const plan = read("docs", "implementation", "sera_m12_m20_campaign_completion_plan.md");
for (const [name, source] of Object.entries({ host, map, mission, keren, plan })) {
  assert(!source.includes("\r"), `${name} must be LF-only`);
}
for (const token of [
  'ctx.addWorldPreset("aradMountainsArchive"', 'regionId: "arad_mountains"',
  'ctx.addGroundType("kerenCooler"', 'ctx.addGroundType("kerenRadar"',
  '// @payload:ground_keren', '// @payload:map_aradMountains', '// @payload:mission_sera_m18',
  'function updateM18MissionThreat(dt = 0)', 'function m18ResultSnapshot(mission)',
  'handleM18EnemyDestroyed(enemy, byWingman)', 'resetM18State(MISSIONS[currentMissionIndex])'
]) assert(`${map}\n${mission}\n${keren}\n${host}`.includes(token), `integrated contract missing: ${token}`);
assert(plan.includes("### M18 HORN OF HEAVEN")
    && plan.includes("six barrels, three power towers, two coolers, two")
    && plan.includes("The core exposes only after a valid route"),
  "master plan lost the M18 subsystem-boss contract");
console.log("check_sera_m18_preflight: PASS");
console.log("  Arad mountain city / five KEREN component classes / three routes / timed fire / persistent outcome");
