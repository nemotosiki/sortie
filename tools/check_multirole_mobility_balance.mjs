#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[1], "../..");
const source = fs.readFileSync(path.join(root, "index.html"), "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`check_multirole_mobility_balance: FAIL - ${message}`);
    process.exit(1);
  }
}

function block(id, nextMarker) {
  const marker = `      ${id}: Object.freeze({\n        id: "${id}",`;
  const start = source.indexOf(marker);
  assert(start >= 0, `AIRCRAFT_TYPES.${id} missing`);
  const end = source.indexOf(nextMarker, start);
  assert(end > start, `could not bound AIRCRAFT_TYPES.${id}`);
  return source.slice(start, end);
}

const fa18 = block("fa18", "      // F-15C:");
assert(fa18.includes("pitchRateDeg: 44, rollRateDeg: 145, yawRateDeg: 12, maxBankAngleDeg: 55"), "F/A-18F axis-rate trim changed");
assert(fa18.includes("normalRollSpring: 40, rollRateLimitDeg: 140, turnRateDeg: 31"), "F/A-18F turn trim changed");
assert(fa18.includes("rollDamping: 11.8, stallWarnSpeed: 84, stallEntrySpeed: 72"), "F/A-18F carrier stability was unintentionally nerfed");
assert(fa18.includes("spwChoices: Object.freeze(["), "F/A-18F selectable loadout disappeared");

const f35 = block("f35c", "      rafale: Object.freeze({");
assert(f35.includes("pitchRateDeg: 43, rollRateDeg: 145, yawRateDeg: 12, maxBankAngleDeg: 56"), "F-35C axis-rate trim changed");
assert(f35.includes("normalRollSpring: 41, rollRateLimitDeg: 140, turnRateDeg: 31"), "F-35C turn trim changed");
assert(f35.includes("rollDamping: 12.0, stallWarnSpeed: 82, stallEntrySpeed: 70"), "F-35C carrier stability was unintentionally nerfed");
assert(f35.includes("spwChoices: Object.freeze(["), "F-35C selectable loadout disappeared");

const f15c = block("f15c", "      f15: Object.freeze({");
assert(f15c.includes("pitchRateDeg: 46, rollRateDeg: 170, yawRateDeg: 13, maxBankAngleDeg: 60"), "F-15C dedicated-fighter mobility changed");
assert(f15c.includes("turnRateDeg: 35"), "F-15C turn rate changed");

const f16 = block("f16", "      f4: Object.freeze({");
assert(f16.includes("pitchRateDeg: 40, rollRateDeg: 145, yawRateDeg: 11, maxBankAngleDeg: 52"), "starter F-16 mobility changed");
assert(f16.includes("turnRateDeg: 29"), "starter F-16 turn rate changed");

console.log("check_multirole_mobility_balance: PASS");
console.log("  fa18: pitch 44 / roll 145 / yaw 12 / turn 31");
console.log("  f35c: pitch 43 / roll 145 / yaw 12 / turn 31");
console.log("  carrier stability preserved; F-15C remains the sharper dedicated fighter");
