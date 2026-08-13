#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[1], "../..");
const source = fs.readFileSync(path.join(root, "index.html"), "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`check_nonfighter_gun_speed_gate: FAIL - ${message}`);
    process.exit(1);
  }
}

function functionBlock(name) {
  return source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?^    \\}`, "m"))?.[0] || "";
}

assert(
  source.includes("const NON_FIGHTER_GUN_HIT_SPEED_LIMIT_KPH = 1000;"),
  "speed boundary must be 1000 km/h"
);
assert(
  source.includes("NON_FIGHTER_GUN_HIT_SPEED_LIMIT_KPH / 3.6"),
  "speed boundary is not converted to metres per second"
);

const classifier = functionBlock("isEnemyFighterGunPlatform");
assert(classifier.includes("enemy.surface"), "ships are not excluded from the fighter exception");
assert(classifier.includes("enemy.ground"), "ground guns are not excluded from the fighter exception");
assert(classifier.includes("enemy.heli"), "helicopters are not excluded from the fighter exception");
assert(classifier.includes("enemy.spec?.rearGun"), "rear gun turrets are not excluded from the fighter exception");
assert(
  source.includes("(fighter|interceptor|air superiority|air defense|multirole|omnirole)"),
  "fixed-wing fighter role classifier changed"
);

const speedPolicy = functionBlock("enemyGunCanHitAtSpeed");
assert(
  speedPolicy.includes("speedMetersPerSecond <= NON_FIGHTER_GUN_HIT_SPEED_LIMIT"),
  "non-fighter hit roll is not hard-gated above the boundary"
);
assert(
  speedPolicy.includes("isEnemyFighterGunPlatform(enemy)"),
  "fighter guns do not retain their exception"
);

for (const name of ["shipAaBurst", "ciwsBurst", "attemptEnemyAttack"]) {
  assert(
    functionBlock(name).includes("enemyGunCanHitPlayer(enemy)"),
    `${name} bypasses the speed hit gate`
  );
}
assert(
  !functionBlock("attemptEnemyGunOnFriendly").includes("enemyGunCanHitPlayer"),
  "escort/friendly damage incorrectly depends on player speed"
);
assert(
  source.includes("gunSpeedGateProbe:"),
  "runtime boundary probe is missing"
);

console.log("check_nonfighter_gun_speed_gate: PASS");
console.log("  non-fighter guns: hard miss above 1000 km/h");
console.log("  fighter forward guns: exempt");
