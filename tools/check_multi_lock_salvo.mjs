#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.argv[1], "../..");
const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const stateSource = fs.readFileSync(path.join(root, "src/combat/multi-lock.js"), "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`check_multi_lock_salvo: FAIL - ${message}`);
    process.exit(1);
  }
}

function weaponBlock(key, nextKey) {
  const start = indexSource.indexOf(`${key}: Object.freeze({`);
  const endMarker = nextKey.startsWith("const ") ? nextKey : `${nextKey}: Object.freeze({`;
  const end = indexSource.indexOf(endMarker, start + 1);
  assert(start >= 0 && end > start, `cannot isolate ${key} config`);
  return indexSource.slice(start, end);
}

const configs = [
  ["aam4", "aam8", 4],
  ["aam8", "aam6", 8],
  ["aam6", "ugb", 6],
  ["agm4", "const AIRCRAFT_TYPES", 4]
];
for (const [key, nextKey, count] of configs) {
  const block = weaponBlock(key, nextKey);
  assert(block.includes(`multi: ${count}`), `${key} simultaneous target ceiling is not ${count}`);
  assert(block.includes(`tubes: ${count}`), `${key} cannot launch one round per locked target`);
  assert(!block.includes("multiLockTime"), `${key} still carries obsolete sequential-lock timing`);
}

const launchStart = indexSource.indexOf("function launchSpSalvo(");
const launchEnd = indexSource.indexOf("function spawnSpMissile(", launchStart);
assert(launchStart >= 0 && launchEnd > launchStart, "cannot isolate salvo launcher");
const salvo = indexSource.slice(launchStart, launchEnd);
assert(
  salvo.includes("const maxRounds = Math.min(spwAmmo, spwLoaded);"),
  "salvo does not safely cap firing by loaded ammunition"
);
assert(
  salvo.includes("targets.forEach((target, index) => spawnSpMissile(target, index));"),
  "locked targets are not all launched in the same trigger frame"
);
assert(
  salvo.includes("return targets.length;"),
  "launcher does not charge exactly one missile per locked target"
);
assert(
  indexSource.includes("eligible.map((entry) => entry.id)"),
  "runtime does not pass every eligible target to concurrent acquisition"
);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sortie-multi-lock-"));
const modulePath = path.join(tempDir, "multi-lock.mjs");
try {
  fs.writeFileSync(modulePath, stateSource, "utf8");
  const {
    clearConcurrentMultiLock,
    createConcurrentMultiLockState,
    updateConcurrentMultiLock
  } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);

  function acquireTogether(maxLocks, candidateCount) {
    const state = createConcurrentMultiLockState();
    const candidates = Array.from({ length: candidateCount }, (_, i) => i + 1);
    updateConcurrentMultiLock(state, 0.4, candidates, maxLocks, 0.85, 0.4);
    assert(state.ids.length === 0, `${maxLocks}-lock weapon guided before lock completion`);
    assert(
      state.timers.size === Math.min(maxLocks, candidateCount),
      `${maxLocks}-lock weapon is not acquiring every slot concurrently`
    );
    updateConcurrentMultiLock(state, 0.45, candidates, maxLocks, 0.85, 0.4);
    assert(
      state.ids.length === Math.min(maxLocks, candidateCount),
      `${maxLocks}-lock weapon did not complete all in-cone locks together`
    );
    assert(
      state.ids.every((id, i) => id === candidates[i]),
      `${maxLocks}-lock weapon did not keep nearest-first target order`
    );
    return state;
  }

  acquireTogether(4, 7);
  acquireTogether(6, 9);
  acquireTogether(8, 10);
  const partial = acquireTogether(4, 2);
  assert(partial.ids.length === 2, "salvo must match the actual locked target count below capacity");

  const independent = createConcurrentMultiLockState();
  updateConcurrentMultiLock(independent, 0.8, [1], 4, 0.85, 0.4);
  updateConcurrentMultiLock(independent, 0.05, [1, 2], 4, 0.85, 0.4);
  assert(independent.ids.length === 1 && independent.ids[0] === 1, "first contact did not finish its own dwell");
  assert(
    Math.abs(independent.timers.get(2) - 0.05) < 1e-9,
    "late contact inherited another target's lock dwell"
  );

  const grace = acquireTogether(4, 4);
  updateConcurrentMultiLock(grace, 0.2, [], 4, 0.85, 0.4);
  assert(grace.ids.length === 4, "brief empty cone discarded completed locks");
  updateConcurrentMultiLock(grace, 0.21, [], 4, 0.85, 0.4);
  assert(grace.ids.length === 0, "sustained empty cone failed to clear salvo locks");

  const cleared = acquireTogether(6, 6);
  clearConcurrentMultiLock(cleared);
  assert(cleared.ids.length === 0 && cleared.timers.size === 0, "explicit weapon/launch clear left stale locks");

  console.log("check_multi_lock_salvo: PASS");
  console.log("  4AAM/4AGM=4, 6AAM=6, 8AAM=8 concurrent independent locks");
  console.log("  all in-cone targets finish after one shared 0.85s window, never N windows");
  console.log("  one trigger spawns one missile per locked target in the same frame");
  console.log("  partial salvo follows actual lock/ammo/tube count; late contacts pay full dwell");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
