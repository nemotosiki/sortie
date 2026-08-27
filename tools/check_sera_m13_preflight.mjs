#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`check_sera_m13_preflight: ${message}`);
};
const host = read("index.html");
const map = read("payloads", "map_hadorIslands.payload.js");
const mission = read("payloads", "mission_sera_m13.payload.js");
const plan = read("docs", "implementation", "sera_m12_m20_campaign_completion_plan.md");
for (const [name, source] of Object.entries({ host, map, mission, plan })) {
  assert(!source.includes("\r"), `${name} must be LF-only`);
}
for (const token of [
  'ctx.addWorldPreset("hadorIslands"', 'ctx.addWorldDecorator("hadorNorthernSettlements"',
  '// @payload:map_hadorIslands', '// @payload:mission_sera_m13',
  'function updateM13MissionState()', 'queued.timer += delay',
  'function m13ResultSnapshot(mission)', 'resetM13State(MISSIONS[currentMissionIndex])',
  'if (updateM13MissionState()) return;'
]) assert(`${map}\n${host}`.includes(token), `integrated contract missing: ${token}`);
assert(plan.includes("### M13 LIFELINE") && plan.includes("aggregate four-aircraft HP gauge")
  && plan.includes("MiG-31 is a two-aircraft"), "master plan lost the M13 escort contract");

console.log("check_sera_m13_preflight: PASS");
console.log("  Hador corridor / aggregate guard integrity / delayed reinforcement choice / integrated");
