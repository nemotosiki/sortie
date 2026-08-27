#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`check_sera_m12_preflight: ${message}`);
};

const host = read("index.html");
const map = read("payloads", "map_norIndustrial.payload.js");
const mission = read("payloads", "mission_sera_m12.payload.js");
const plan = read("docs", "implementation", "sera_m12_m20_campaign_completion_plan.md");
for (const [name, source] of Object.entries({ host, map, mission, plan })) {
  assert(!source.includes("\r"), `${name} must be LF-only`);
}

for (const token of [
  'ctx.addWorldPreset("norIndustrialBlackout"',
  'worlds: ["norIndustrialDusk", "norIndustrialBlackout"]',
  'const blackout = worldKey === "norIndustrialBlackout"',
  '// @payload:map_norIndustrial', '// @payload:mission_sera_m12',
  'function updateM12MissionThreat()', 'function cancelM12Replenishments(mission)',
  'function updateM12GhostHudMarkers()', 'function m12ResultSnapshot(mission)',
  'resetM12State(MISSIONS[currentMissionIndex])', 'if (updateM12MissionThreat()) return;'
]) assert(`${map}\n${host}`.includes(token), `integrated contract missing: ${token}`);

assert(mission.includes("already in the air remain") || mission.includes("already in the air"),
  "payload does not document in-flight replenishment survival");
assert(plan.includes("### M12 GLASS SWARM") && plan.includes("tagged replenishment cancellation")
  && plan.includes("jammer HUD false-contact pressure"), "master plan lost the M12 route contract");

console.log("check_sera_m12_preflight: PASS");
console.log("  Nor blackout variant / finite route cancellation / non-lockable jammer ghosts / integrated");
