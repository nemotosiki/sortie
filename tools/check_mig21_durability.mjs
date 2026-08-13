#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[1], "../..");
const source = fs.readFileSync(path.join(root, "index.html"), "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`check_mig21_durability: FAIL - ${message}`);
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
const mig21Health = maxHealthOf("mig21", "mig29");

assert(f16Health === 100, "F-16 durability baseline changed");
assert(mig21Health === f16Health, "MiG-21 durability does not match F-16");

console.log("check_mig21_durability: PASS");
console.log(`  F-16=${f16Health}, MiG-21=${mig21Health}`);
