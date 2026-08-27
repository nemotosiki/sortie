#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`check_sera_m14_preflight: ${message}`);
};
const host = read("index.html");
const map = read("payloads", "map_naharMudflats.payload.js");
const mission = read("payloads", "mission_sera_m14.payload.js");
const plan = read("docs", "implementation", "sera_m12_m20_campaign_completion_plan.md");
const rework = read("docs", "implementation", "sera_m14_open_sea_interdiction_rework_plan.md");
const unlock = read("docs", "story_reboot", "v0.17", "02_f15_mid_tier_f35_unlock_correction.md");
for (const [name, source] of Object.entries({ host, map, mission, plan, rework, unlock })) {
  assert(!source.includes("\r"), `${name} must be LF-only`);
}
for (const token of [
  'ctx.addWorldPreset("naharMudflats"',
  'const base = WORLD_PRESETS.archipelagoDay',
  'variant: "high_noon_open_sea_interdiction"',
  '// @payload:map_naharMudflats',
  '// @payload:mission_sera_m14',
  'function crossM14TransferLine(mission, ship)',
  'function updateM14MissionThreat()',
  'function m14TargetRemaining(mission = m14Mission())',
  'function m14RankCap(mission)',
  'function m14ResultSnapshot(mission)',
  'forceSeraM14CrossAssaultShip',
  'function aircraftProgressionUnlocked(id, campaignId = selectedCampaignId)',
  'f35c: Object.freeze({ mode: "clear", missionKey: "sera-m14", requirement: "M14 CLEAR" })',
  'resetM14State(MISSIONS[currentMissionIndex])'
]) assert(`${map}\n${mission}\n${host}`.includes(token), `integrated contract missing: ${token}`);
assert(unlock.includes("F-35Cは**M14クリア後に購入許可、M15から使用可能**"),
  "v0.17 F-35C unlock source changed");
assert(plan.includes("### M14 BREAKWATER") && plan.includes("open-ocean")
    && plan.includes("Completion unlocks F-35C"),
  "master plan lost the revised M14 contract");
for (const token of [
  "same strategic war stage", "LHD + four LSTs", "One crossing caps rank at A",
  "second crossing fails", "M34"
]) assert(rework.includes(token), `rework plan missing: ${token}`);
for (const forbidden of [
  "function spawnM14LandedArmor", "groundMark: \"m14LandedArmor\""
]) assert(!`${mission}\n${host}`.includes(forbidden), `retired M14 contract remains: ${forbidden}`);
assert(!map.includes("WORLD_PRESETS.naharStrait"), "M14 map still derives from the M04 coastline");
console.log("check_sera_m14_preflight: PASS");
console.log("  pure open sea / capacity-only TGT / 1-cross A cap / 2-cross fail / blue hospital / F-35C gate");
