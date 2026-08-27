#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(`check_sera_m17_preflight: ${message}`); };
const host = read("index.html");
const map = read("payloads", "map_migalOuter.payload.js");
const mission = read("payloads", "mission_sera_m17.payload.js");
const f3 = read("payloads", "aircraft_f3.payload.js");
const plan = read("docs", "implementation", "sera_m12_m20_campaign_completion_plan.md");
for (const [name, source] of Object.entries({ host, map, mission, f3, plan })) {
  assert(!source.includes("\r"), `${name} must be LF-only`);
}
for (const token of [
  'ctx.addWorldPreset("migalOuterHigh"', 'regionId: "migal_outer"',
  'ctx.addAircraft("f3"', '// @payload:aircraft_f3', '// @payload:map_migalOuter',
  '// @payload:mission_sera_m17', 'function m17PlayerLockTime(targets)',
  'function updateM17MissionThreat()', 'function m17ResultSnapshot(mission)',
  'handleM17EnemyDestroyed(enemy, byWingman)', 'resetM17State(MISSIONS[currentMissionIndex])'
]) assert(`${map}\n${mission}\n${f3}\n${host}`.includes(token), `integrated contract missing: ${token}`);
assert(plan.includes("### M17 THE LONG APPROACH")
    && plan.includes("HELIX 1 FORGE and HELIX 2 SWIFT")
    && plan.includes("One late elite prototype is allowed"),
  "master plan lost the M17 HELIX/elite limit contract");
console.log("check_sera_m17_preflight: PASS");
console.log("  outer-ring map / F-3 registration / support-driven lock delay / white rank-neutral HELIX ledger");
