#!/usr/bin/env node
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(`check_enemy_lock_warning: ${message}`);
}

function moduleBody(source) {
  const open = source.indexOf('<script type="module">');
  const start = source.indexOf(">", open) + 1;
  const end = source.indexOf("</script>", start);
  assert(open >= 0 && start > open && end > start, "module script not found");
  return source.slice(start, end);
}

assert(html.includes("const ENEMY_MISSILE_LOCK_TIME = LOCK_TIME;"),
  "enemy lock dwell is not tied to the player's lock time");
assert(html.includes("const ENEMY_MISSILE_FIRE_DELAY_MIN = 0.5;"),
  "enemy post-lock trigger delay minimum is not 0.5 seconds");
assert(html.includes("const ENEMY_MISSILE_FIRE_DELAY_MAX = 1.0;"),
  "enemy post-lock trigger delay maximum is not 1.0 seconds");
assert(html.includes('id="lockWarning">WARNING</div>'), "WARNING HUD element is missing");

const accumulator = html.match(/function advanceEnemyMissileLock[\s\S]*?^    \}/m)?.[0] || "";
assert(accumulator.includes("enemy.missileLockTarget !== target"),
  "target changes can inherit old lock progress");
assert(accumulator.includes("Math.max(0, dt) / ENEMY_MISSILE_LOCK_TIME"),
  "enemy lock does not accumulate against the shared dwell time");

const attempt = html.match(/function attemptEnemyMissile[\s\S]*?^    \}/m)?.[0] || "";
assert(attempt.includes("advanceEnemyMissileLaunchSequence(enemy, lockTarget, dt)"),
  "enemy launch path does not wait for acquisition and trigger reaction");
assert(attempt.includes("resetEnemyMissileLock(enemy);"),
  "enemy lock does not clear after launch or a broken solution");
const launchSequence = html.match(/function advanceEnemyMissileLaunchSequence[\s\S]*?^    \}/m)?.[0] || "";
assert(launchSequence.includes("if (!wasLocked || !Number.isFinite(enemy.missileFireDelay))"),
  "lock completion does not arm a separate trigger delay");
assert(launchSequence.includes("enemy.missileFireDelay - Math.max(0, dt)"),
  "post-lock trigger delay is not advanced over later frames");
assert(launchSequence.includes('enemy.missileLockPhase = "launchReady";'),
  "three-stage sequence has no launch-ready state");
assert((html.match(/attemptEnemyMissile\(enemy, (?:charge|null), dt\)/g) || []).length === 4,
  "not every enemy missile platform advances lock time each frame");
assert((html.match(/enemy\.missileLockProgress > 0\s*\? 0/g) || []).length === 4,
  "an acquiring platform is being put back on retry cooldown");

const threat = html.match(/function enemyLockThreatOnPlayer[\s\S]*?^    \}/m)?.[0] || "";
assert(threat.includes("enemy.missileLockTarget !== player"),
  "WARNING is not limited to locks on the player");
assert(html.includes("playerTargetedBy > 0 && !threat"),
  "MISSILE ALERT does not suppress WARNING");
assert(html.includes("body.missileAlert #lockWarning"),
  "CSS priority guard for missile alert is missing");
const radarMissiles = html.match(/\/\/ Incoming missiles are small white square contacts\.[\s\S]*?ctx\.shadowBlur = 0;/)?.[0] || "";
assert(radarMissiles.includes('ctx.fillStyle = "#f4f7fa";'),
  "incoming missile radar marker is not white");
assert(radarMissiles.includes("ctx.fillRect(px - 1.5, py - 1.5, 3, 3);"),
  "incoming missile radar marker is not the 3px square");
assert(!radarMissiles.includes("ctx.lineTo"),
  "legacy triangular incoming missile radar marker remains");

new vm.SourceTextModule(moduleBody(html));
console.log("check_enemy_lock_warning: PASS");
console.log("  shared 0.85s hostile dwell / 0.5-1.0s post-lock trigger delay");
console.log("  MISSILE ALERT priority / all four hostile launch paths covered");
