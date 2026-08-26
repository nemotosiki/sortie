#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = fs.readFileSync(path.join(root, "index.html"), "utf8");
const story = fs.readFileSync(path.join(root, "docs", "story_reboot", "11_sera_act2.md"), "utf8");
const ledger = fs.readFileSync(path.join(root, "docs", "story_reboot", "v0.12", "01_map_mission_matrix.md"), "utf8");
const plan = fs.readFileSync(path.join(root, "docs", "implementation", "sera_m10_last_train_implementation_plan.md"), "utf8");

const assert = (condition, message) => {
  if (!condition) throw new Error(`check_sera_m10_preflight: ${message}`);
};

for (const token of [
  'key: "sera-m09"',
  '// @payload:mission_sera_m09',
  'trainLoco: Object.freeze({',
  'trainFlak: Object.freeze({',
  'trainCar: Object.freeze({',
  'key: "m-train"',
  'const authoredPath = mission.convoyRoad || mission.railLine || null;',
  'railLine: mission.railLine ? road : null,',
  'speed: unit.speed || mission.convoySpeed || mission.railSpeed || 0,',
  'ctx.addAircraft("su34"',
  'ctx.addEnemyProfile("su34"',
  'ctx.addEnemyMissileProfile("su34"',
  'function recordMissionResult(',
  'function resetMissionRuntime()',
  'addWorldDecorator(id, def)',
  'addGroundModel(kind, def)'
]) {
  assert(host.includes(token), `host contract missing: ${token}`);
}

for (const token of [
  "## M10 — LAST TRAIN",
  "装甲列車・橋梁攻撃",
  "橋を破壊すれば即座に停止する",
  "機関車と高射車だけを正確に破壊"
]) {
  assert(story.includes(token), `canonical story token missing: ${token}`);
}

for (const token of [
  "`nor_industrial`",
  "`norIndustrial`",
  "### `norIndustrialDusk`",
  "装甲列車、橋梁、貨物駅"
]) {
  assert(ledger.includes(token), `map-ledger token missing: ${token}`);
}

for (const token of [
  "Eight independently damageable cars",
  "`route`: `bridge` or `precision`",
  "Su-34 x4",
  "MiG-29A x2",
  "bridge clear, precision clear, escape failure, and Retry"
]) {
  assert(plan.includes(token), `implementation-plan token missing: ${token}`);
}

assert(!plan.includes("Su-35 x4"), "M10 plan reintroduced early mass Su-35");
assert(!plan.includes("Su-57 x"), "M10 plan reintroduced generic Su-57");

console.log("check_sera_m10_preflight: PASS");
console.log("  M09 predecessor, train/Su-34 host assets, Nor ledger, and dual-route plan are ready");
