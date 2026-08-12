#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[1], "../..");
const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const guidanceSource = fs.readFileSync(
  path.join(root, "src/combat/missile-guidance.js"),
  "utf8"
);

function assert(condition, message) {
  if (!condition) {
    console.error(`check_missile_turn_cap: FAIL - ${message}`);
    process.exit(1);
  }
}

const cap = 100;
assert(
  indexSource.includes(`const MAX_MISSILE_TURN_RATE_DEG = ${cap};`),
  `global missile turn cap must be ${cap} deg/s`
);
assert(
  indexSource.includes("const STANDARD_MISSILE_TURN_RATE_DEG = MAX_MISSILE_TURN_RATE_DEG;"),
  "player standard missile does not use the global cap"
);
assert(
  indexSource.includes("Math.min(numeric, MAX_MISSILE_TURN_RATE)"),
  "launch-time turn-rate clamp missing"
);
assert(
  guidanceSource.includes("Math.min(missile.turnRate ?? defaultTurnRate, maxTurnRate)"),
  "guidance-kernel turn-rate clamp missing"
);

const spwSource = indexSource.slice(
  indexSource.indexOf("const SPW_TYPES"),
  indexSource.indexOf("const AIRCRAFT_TYPES")
);
const spwRates = [...spwSource.matchAll(/turnRateDeg:\s*(\d+(?:\.\d+)?)/g)]
  .map((match) => Number(match[1]));
assert(spwRates.length > 0, "no SP.W missile turn rates found");
assert(
  spwRates.every((rate) => rate <= cap),
  `authored SP.W turn rate exceeds ${cap}: ${spwRates.filter((rate) => rate > cap).join(", ")}`
);

const enemySource = indexSource.slice(
  indexSource.indexOf("const ENEMY_MISSILE_PROFILES"),
  indexSource.indexOf("const ANTI_SHIP_MISSILE_PROFILE")
);
const enemyRates = [...enemySource.matchAll(
  /turnRate:\s*THREE\.MathUtils\.degToRad\((\d+(?:\.\d+)?)\)/g
)].map((match) => Number(match[1]));
assert(enemyRates.length > 0, "no hostile missile turn rates found");
assert(
  enemyRates.every((rate) => rate <= cap),
  `authored hostile missile turn rate exceeds ${cap}: ${enemyRates.filter((rate) => rate > cap).join(", ")}`
);

assert(
  indexSource.includes("turnRate: cappedMissileTurnRate(THREE.MathUtils.degToRad(PLAYER_SPW.turnRateDeg))"),
  "player SP.W launch path bypasses the cap"
);
assert(
  indexSource.includes("turnRate: cappedMissileTurnRate("),
  "hostile missile launch path bypasses the cap"
);

console.log("check_missile_turn_cap: PASS");
console.log(`  player/enemy guided-missile maximum = ${cap} deg/s`);
console.log(`  authored SP.W max = ${Math.max(...spwRates)} deg/s`);
console.log(`  authored hostile-profile max = ${Math.max(...enemyRates)} deg/s`);
