#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[1], "../..");
const source = fs.readFileSync(path.join(root, "index.html"), "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`check_missile_speed_floor: FAIL - ${message}`);
    process.exit(1);
  }
}

assert(
  source.includes("const STANDARD_MISSILE_MAX_SPEED = 556;"),
  "ordinary missile floor must be 556 m/s (2001.6 km/h)"
);
assert(
  source.includes("const MISSILE_MAX_SPEED = STANDARD_MISSILE_MAX_SPEED;"),
  "player MSL must use the shared speed floor"
);

const qaam = source.match(/qaam: Object\.freeze\(\{[\s\S]*?^      \}\),/m)?.[0] || "";
assert(qaam.includes("maxSpeed: STANDARD_MISSILE_MAX_SPEED"), "QAAM must use the shared speed floor");

for (const key of ["aam4", "aam6", "aam8", "agm4"]) {
  const block = source.match(new RegExp(`${key}: Object\\.freeze\\(\\{[\\s\\S]*?^      \\}\\),`, "m"))?.[0] || "";
  assert(block.includes("maxSpeed: STANDARD_MISSILE_MAX_SPEED"), `${key} must use the shared speed floor`);
}

assert(
  source.includes("maxSpeed: enemyMissileMaxSpeed(enemy, charge, profile)"),
  "enemy launch path must apply the speed-floor policy"
);
assert(
  source.includes("Math.max(STANDARD_MISSILE_MAX_SPEED, authoredMax)"),
  "ordinary enemy AAM/SAM floor missing"
);
assert(
  source.includes("(charge && isFriendlyShip(charge)) || (enemy && enemy.heli)"),
  "anti-ship and helicopter special-flight exceptions missing"
);
assert(
  source.includes("missileSpeedProbe: () => ({"),
  "runtime speed probe missing"
);
assert(
  source.includes("maxSpeed: missile.maxSpeed,"),
  "live enemy-missile telemetry must expose its effective maximum"
);

console.log("check_missile_speed_floor: PASS");
console.log("  player MSL/QAAM and ordinary enemy AAM/SAM floor = 556 m/s (2001.6 km/h)");
console.log("  anti-ship cruise missiles and helicopter rockets remain explicit exceptions");
