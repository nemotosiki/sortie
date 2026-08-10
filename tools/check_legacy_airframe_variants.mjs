#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[1], "../..");
const source = fs.readFileSync(path.join(root, "index.html"), "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`check_legacy_airframe_variants: FAIL - ${message}`);
    process.exit(1);
  }
}

function block(id, nextMarker) {
  const start = source.indexOf(`      ${id}: Object.freeze({\n        id: "${id}",`);
  assert(start >= 0, `AIRCRAFT_TYPES.${id} missing`);
  const end = source.indexOf(nextMarker, start);
  assert(end > start, `could not bound AIRCRAFT_TYPES.${id}`);
  return source.slice(start, end);
}

const fa18a = block("fa18a", "      fa18: Object.freeze({\n        id: \"fa18\",");
const f15c = block("f15c", "      f15: Object.freeze({\n        id: \"f15\",");
const f15e = block("f15", "      // F-14D:");

assert(fa18a.includes('label: "F/A-18A HORNET"'), "fa18a label wrong");
assert(fa18a.includes('variant: "legacyhornet"'), "fa18a model variant wrong");
assert(fa18a.includes('spw: Object.freeze({ key: "lasm", capacity: 10 })'), "fa18a must carry LASM");

assert(f15c.includes('label: "F-15C EAGLE"'), "f15c label wrong");
assert(f15c.includes('variant: "lancer"'), "f15c must use the single-seat Eagle model");
assert(f15c.includes('spw: Object.freeze({ key: "xlaa", capacity: 14 })'), "f15c must carry XLAA");

assert(f15e.includes('label: "F-15E STRIKE EAGLE"'), "legacy f15 key is not F-15E");
assert(f15e.includes('variant: "strikeeagle"'), "f15/F-15E model variant wrong");
assert(f15e.includes('spw: Object.freeze({ key: "agm4", capacity: 16 })'), "F-15E must carry 4AGM");
assert(!source.includes('label: "F-15 EAGLE"'), "old ambiguous F-15 label remains");

const expectedOrder = '"f2a", "fa18a", "fa18", "f15c", "f15", "f14"';
assert(source.includes(expectedOrder), "hangar order does not expose A/F Hornet and C/E Eagle variants");
assert(source.includes('theme.variant === "legacyhornet"'), "legacy Hornet model branch missing");
assert(source.includes('theme.variant === "strikeeagle"'), "Strike Eagle model branch missing");
assert(source.includes('"legacyhornet", "hornet"'), "legacy Hornet is not reserved as an inline variant");
assert(source.includes('"lancer", "strikeeagle"'), "Strike Eagle is not reserved as an inline variant");

for (const id of ["fa18a", "f15c"]) {
  const ai = source.indexOf(`      ${id}: Object.freeze({\n        behavior: "formation",`);
  assert(ai >= 0, `ENEMY_AI_PROFILES.${id} missing`);
}
assert(source.includes('      fa18a: Object.freeze({\n        cooldownMin: 9.5,'), "ENEMY_MISSILE_PROFILES.fa18a missing");
assert(source.includes('      f15c: Object.freeze({\n        cooldownMin: 8.2,'), "ENEMY_MISSILE_PROFILES.f15c missing");

console.log("check_legacy_airframe_variants: PASS");
console.log("  f15=F-15E / f15c=F-15C / fa18a=F/A-18A / fa18=F/A-18F");
