#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[1], "../..");
const source = fs.readFileSync(path.join(root, "index.html"), "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`check_lock_persistence: FAIL - ${message}`);
    process.exit(1);
  }
}

function functionBody(name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`function ${nextName}(`, start + 1);
  assert(start >= 0 && end > start, `cannot isolate ${name}()`);
  return source.slice(start, end);
}

const normalLaunch = functionBody("launchMissile", "updateMissileReload");
const singleSpwLaunch = functionBody("launchSpSingle", "launchSpSalvo");
const salvoLaunch = functionBody("launchSpSalvo", "spawnSpMissile");
const lockUpdate = functionBody("updateLock", "resetLock");

assert(!normalLaunch.includes("resetLock();"), "normal MSL clears lock after launch");
assert(!singleSpwLaunch.includes("resetLock();"), "single-target SP.W clears lock after launch");
assert(!salvoLaunch.includes("resetLock();"), "multi-target SP.W clears primary lock after launch");
assert(
  salvoLaunch.includes("clearMultiLock();"),
  "multi-target SP.W must still consume its fired salvo latches"
);
assert(
  lockUpdate.includes("if (lockGraceTimer >= LOCK_GRACE_TIME) resetLock();"),
  "lock no longer releases after a target leaves the valid seeker picture"
);
assert(
  source.includes("if (lock.targetId === enemy.id) resetLock();"),
  "destroyed targets no longer release the lock"
);

console.log("check_lock_persistence: PASS");
console.log("  normal MSL and single/multi SP.W preserve the primary lock after firing");
console.log("  multi-lock salvo latches are consumed; invalid/dead targets still release lock");
