#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(`check_sera_m19_preflight: ${message}`); };
const host = read("index.html");
const map = read("payloads", "map_migalOuter.payload.js");
const mission = read("payloads", "mission_sera_m19.payload.js");
const canon = read("docs", "story_reboot", "v0.15", "03_crown_lark_aircraft_canon.md");
const plan = read("docs", "implementation", "sera_m12_m20_campaign_completion_plan.md");
for (const [name, source] of Object.entries({ host, map, mission, canon, plan })) {
  assert(!source.includes("\r"), `${name} must be LF-only`);
}
for (const token of [
  'ctx.addWorldPreset("migalOuterSunset"', 'variant: "war_day_30_ceasefire_sunset"',
  '// @payload:map_migalOuter', '// @payload:mission_sera_m19',
  'function updateM19MissionThreat(dt = 0)', 'function updateM19RetreatingAircraft(enemy, dt)',
  'function m19ResultSnapshot(mission)', 'handleM19EnemyDestroyed(enemy, byWingman)',
  'resetM19State(MISSIONS[currentMissionIndex])'
]) assert(`${map}\n${mission}\n${host}`.includes(token), `integrated contract missing: ${token}`);
assert(canon.includes("M19でCROWNがF-15Cへ限定復帰する")
    && canon.includes("M19 | TRUST FALL | **F-15Cで限定復帰** | **F-15E**"),
  "CROWN/LARK M19 aircraft canon changed");
assert(plan.includes("### M19 TRUST FALL")
    && plan.includes("Leaving the escort radius")
    && plan.includes("destroying at least two arms `ravenFinalPursuit`"),
  "master plan lost the flight-observed pursuit contract");
console.log("check_sera_m19_preflight: PASS");
console.log("  sunset outer ring / aggregate escort HUD / white retreat / distance-qualified pursuit ledger");
