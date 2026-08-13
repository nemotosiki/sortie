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
assert(
  source.includes("const STATIC_MISSILE_EJECTION_SPEED = 100 / 3.6;"),
  "static launcher ejection speed must be 100 km/h"
);
assert(
  source.includes("if (platform === player) return Math.max(0, playerSpeed);"),
  "air-launched player rounds do not inherit player speed"
);
assert(
  source.includes("platform?.surface || platform?.ground"),
  "static launcher ejection policy is not scoped to surface/ground platforms"
);
assert(
  [...source.matchAll(/const launchSpeed = missileLaunchSpeedFor\(player\);/g)].length === 2,
  "player MSL and SP.W launch paths do not share inherited launch speed"
);
assert(
  source.includes("const launchSpeed = missileLaunchSpeedFor(enemy, profile.speed);"),
  "hostile missile launch path does not inherit platform speed"
);
assert(
  !source.includes("speed: Math.max(playerSpeed + 120, 300),"),
  "legacy 300 m/s player launch-speed floor remains"
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
assert(
  [...source.matchAll(/launchSpeed: missile\.launchSpeed,/g)].length === 2,
  "player/enemy live missile telemetry must preserve release speed"
);

console.log("check_missile_speed_floor: PASS");
console.log("  player MSL/QAAM and ordinary enemy AAM/SAM floor = 556 m/s (2001.6 km/h)");
console.log("  air launch=inherited platform speed; static ejection=100 km/h");
console.log("  anti-ship cruise missiles and helicopter rockets remain explicit exceptions");
