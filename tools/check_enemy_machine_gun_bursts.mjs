#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[1], "../..");
const source = fs.readFileSync(path.join(root, "index.html"), "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`check_enemy_machine_gun_bursts: FAIL - ${message}`);
    process.exit(1);
  }
}

function functionBlock(name) {
  return source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?^    \\}`, "m"))?.[0] || "";
}

const burst = functionBlock("createEnemyMachineGunBurst");
assert(source.includes("const ENEMY_GUN_BURST_INTERVAL = 0.055;"), "machine-gun interval changed");
assert(source.includes("const ENEMY_GUN_BURST_MIN_SHOTS = 5;"), "burst no longer has at least five rounds");
assert(burst.includes("const commonMiss"), "burst rounds do not share one miss solution");
assert(burst.includes("i * interval"), "rounds are not time-staggered");
assert(burst.includes("createTracer(start, end, color"), "burst does not render tracers");
assert(burst.includes("createMuzzleFlash(start, color, delay)"), "burst does not sequence muzzle flashes");

for (const name of ["shipAaBurst", "ciwsBurst", "attemptEnemyAttack", "attemptEnemyGunOnFriendly"]) {
  const block = functionBlock(name);
  assert(block.includes("createEnemyMachineGunBurst"), `${name} does not use the machine-gun burst renderer`);
  assert(block.includes("1 - distance") || block.includes("1 - distanceToPlayer"), `${name} lost distance-scaled accuracy`);
}

const aircraftAttack = functionBlock("attemptEnemyAttack");
assert(
  (aircraftAttack.match(/Math\.random\(\) < hitChance/g) || []).length === 1,
  "aircraft burst has more than one independent hit roll"
);
const shipAttack = functionBlock("shipAaBurst");
assert(
  (shipAttack.match(/Math\.random\(\) < hitChance/g) || []).length === 1,
  "ship burst has more than one independent hit roll"
);

assert(source.includes("function createTracer(start, end, color, duration, opacity, delay = 0)"), "tracer delay support missing");
assert(source.includes("function createMuzzleFlash(position, color, delay = 0)"), "muzzle-flash delay support missing");

console.log("check_enemy_machine_gun_bursts: PASS");
console.log("  enemy guns: narrow 5-10 round time-staggered bursts");
console.log("  accuracy: closer targets remain more likely to be hit");
