#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[1], "../..");
const source = fs.readFileSync(path.join(root, "index.html"), "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`check_f2_durability: FAIL - ${message}`);
    process.exit(1);
  }
}

function aircraftBlock(id, nextId) {
  const start = source.indexOf(`${id}: Object.freeze({`);
  const end = source.indexOf(`${nextId}: Object.freeze({`, start + 1);
  assert(start >= 0 && end > start, `cannot isolate ${id} aircraft config`);
  return source.slice(start, end);
}

function maxHealthOf(id, nextId) {
  const match = aircraftBlock(id, nextId).match(/maxHealth:\s*(\d+)/);
  assert(match, `${id} maxHealth is missing`);
  return Number(match[1]);
}

const f16Health = maxHealthOf("f16", "gripen");
const f2Health = maxHealthOf("f2a", "fa18a");
const gripenHealth = maxHealthOf("gripen", "f2a");

assert(f16Health === 100, "F-16 durability baseline changed");
assert(f2Health === 110, "F-2A durability must be 110");
assert(f2Health > f16Health, "F-2A is not tougher than F-16");
assert(f2Health < gripenHealth, "F-2A durability increase is no longer slight");
assert(
  aircraftBlock("f2a", "fa18a").includes("F-16よりわずかに頑丈"),
  "F-2A hangar description does not explain its durability advantage"
);

console.log("check_f2_durability: PASS");
console.log(`  F-16=${f16Health}, F-2A=${f2Health}, Gripen E=${gripenHealth}`);
