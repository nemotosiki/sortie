#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[1], "../..");
const source = fs.readFileSync(path.join(root, "index.html"), "utf8");

const assert = (condition, message) => {
  if (!condition) throw new Error(`check_fighter_speed_rebalance: ${message}`);
};

const scaleMatch = source.match(/const FIGHTER_SPEED_REBALANCE_SCALE = ([0-9.]+);/);
assert(scaleMatch, "fighter speed scale is missing");
const scale = Number(scaleMatch[1]);
assert(scale === 0.95, `fighter speed reduction must remain modest (0.95), got ${scale}`);

const idsMatch = source.match(/const FIGHTER_SPEED_REBALANCE_IDS = new Set\(\[([\s\S]*?)\n    \]\);/);
assert(idsMatch, "fighter speed roster is missing");
const ids = new Set([...idsMatch[1].matchAll(/"([a-z0-9]+)"/g)].map((match) => match[1]));

for (const id of [
  "f16", "gripen", "f2a", "fa18", "f15c", "f15", "f14", "f35c",
  "rafale", "typhoon", "su37", "f22", "mig21", "mig29", "su33",
  "su35", "su57", "su47", "mig23", "f3"
]) assert(ids.has(id), `${id} is missing from the fighter reduction roster`);

for (const id of [
  "mig31", "f4", "a10", "su25", "su24m", "su34", "bomber", "tu95",
  "tu22m3", "transport", "jammer", "ea18g", "uav"
]) assert(!ids.has(id), `${id} must keep its authored speed`);

for (const token of [
  "patrolSpeed: Math.round(effectiveCruise * ai.patrolSpeedScale)",
  "cruiseSpeed: effectiveCruise",
  "maxSpeed: effectiveBoost",
  "CRUISE_SPEED = effectiveAircraftCruiseSpeed(spec)",
  "BOOST_SPEED = effectiveAircraftBoostSpeed(spec)",
  "const speedScore = (spec) => effectiveAircraftBoostSpeed(spec)",
  "wingCruise: effectiveAircraftCruiseSpeed(spec)",
  "wingBoost: effectiveAircraftBoostSpeed(spec)"
]) assert(source.includes(token), `runtime/HUD path is not using adjusted speed: ${token}`);

assert(source.includes("highAltitudeCeilingBonus: 2000"),
  "MiG-31 high-altitude engine advantage is missing");
const aircraftTable = source.slice(
  source.indexOf("const AIRCRAFT_TYPES ="),
  source.indexOf("const FIGHTER_SPEED_REBALANCE_SCALE =")
);
const aircraftDefinition = (id) => {
  const start = aircraftTable.indexOf(`${id}: Object.freeze({`);
  assert(start >= 0, `aircraft definition missing: ${id}`);
  const tail = aircraftTable.slice(start + id.length + 17);
  const nextMatch = tail.match(/\n      [a-z0-9]+: Object\.freeze\(\{/);
  const end = nextMatch ? start + id.length + 17 + nextMatch.index : aircraftTable.length;
  return aircraftTable.slice(start, end);
};
assert(aircraftDefinition("mig31").includes("highAltitudeCeilingBonus: 2000"),
  "MiG-31 definition lost its 12km high-altitude exception");
assert(!aircraftDefinition("f4").includes("highAltitudeCeilingBonus"),
  "F-4 received a high-altitude exception; it is exempt from speed reduction only");

console.log("check_fighter_speed_rebalance: PASS");
console.log("  speed: modern fighters x0.95 / MiG-31, F-4, attack-support-heavy unchanged");
console.log("  altitude: MiG-31 exception only / F-4 remains an ordinary-ceiling fighter");
