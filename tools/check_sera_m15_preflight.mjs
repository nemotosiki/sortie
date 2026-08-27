#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`check_sera_m15_preflight: ${message}`);
};
const host = read("index.html");
const map = read("payloads", "map_migalCity.payload.js");
const weapon = read("payloads", "aircraft_cruiseWeapon.payload.js");
const plan = read("docs", "implementation", "sera_m12_m20_campaign_completion_plan.md");
for (const [name, source] of Object.entries({ host, map, weapon, plan })) {
  assert(!source.includes("\r"), `${name} must be LF-only`);
}
for (const token of [
  'ctx.addWorldPreset("migalCityNight"', 'regionId: "migal_city"',
  'ctx.addAircraft("cruiseWeapon"', '// @payload:aircraft_cruiseWeapon',
  '// @payload:map_migalCity', '// @payload:mission_sera_m15',
  'function spawnM15CruiseWeapon(bomber, mission)',
  'function updateM15CruiseWeapon(enemy, dt)',
  'function updateM15MissionThreat()', 'function m15ResultSnapshot(mission)',
  'handleM15EnemyDestroyed(enemy, byWingman)',
  'resetM15State(MISSIONS[currentMissionIndex])'
]) assert(`${map}\n${weapon}\n${host}`.includes(token), `integrated contract missing: ${token}`);
assert(plan.includes("### M15 NIGHT OF NUMBERS")
    && plan.includes("Start the persistent `ravenArcaKills` ledger"),
  "master plan lost the M15 ARCA contract");
console.log("check_sera_m15_preflight: PASS");
console.log("  Migal districts / independent cruise contacts / ARCA transition / persistent ledger integrated");
