#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[1], "../..");
const source = fs.readFileSync(path.join(root, "index.html"), "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`check_attacker_flare_capacity: FAIL - ${message}`);
    process.exit(1);
  }
}

function aircraftBlock(id, nextId) {
  const start = source.indexOf(`${id}: Object.freeze({`);
  const end = source.indexOf(`${nextId}: Object.freeze({`, start + 1);
  assert(start >= 0 && end > start, `cannot isolate ${id} aircraft config`);
  return source.slice(start, end);
}

assert(
  source.includes("const DEFAULT_FLARE_CAPACITY = 2;") &&
    source.includes("const ATTACKER_FLARE_CAPACITY = 4;"),
  "flare capacity tiers are not 2 standard / 4 attacker"
);

for (const [id, nextId] of [["a10", "f22"], ["su25", "tu95"]]) {
  assert(
    aircraftBlock(id, nextId).includes("flareCapacity: ATTACKER_FLARE_CAPACITY"),
    `${id} is not configured as a four-flare dedicated attacker`
  );
}

for (const [id, nextId] of [["f16", "gripen"], ["f2a", "fa18a"], ["f15", "f14"], ["f35c", "rafale"]]) {
  assert(
    !aircraftBlock(id, nextId).includes("flareCapacity:"),
    `${id} must retain the standard two-flare multirole/fighter loadout`
  );
}

assert(
  source.includes("PLAYER_FLARE_CAPACITY = flareCapacityForAircraft(spec);"),
  "selected aircraft does not apply its flare capacity"
);
assert(
  source.includes("flareCount = PLAYER_FLARE_CAPACITY;"),
  "sortie start does not load the selected aircraft's flares"
);
assert(
  source.includes("String(flareCapacityForAircraft(spec))"),
  "hangar ammo display does not show the selected aircraft's flare capacity"
);
assert(source.includes("flareProbe: () => ({"), "runtime flare probe is missing");
assert(!source.includes("const FLARE_CAPACITY ="), "obsolete global flare capacity remains");

console.log("check_attacker_flare_capacity: PASS");
console.log("  A-10C / Su-25: 4 flares");
console.log("  fighters and multirole aircraft: 2 flares");
console.log("  hangar display and sortie initialization use the per-aircraft capacity");
