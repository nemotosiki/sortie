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
const plan = read("docs", "implementation", "sera_m12_m20_campaign_completion_plan.md");
const unlock = read("docs", "story_reboot", "v0.17", "02_f15_mid_tier_f35_unlock_correction.md");
for (const [name, source] of Object.entries({ host, map, plan, unlock })) {
  assert(!source.includes("\r"), `${name} must be LF-only`);
}
for (const token of [
  'ctx.addWorldPreset("naharMudflats"', '...base.missionAnchors',
  '// @payload:map_naharMudflats', '// @payload:mission_sera_m14',
  'function spawnM14LandedArmor(mission, ship, slot)',
  'function updateM14MissionThreat()', 'function m14ResultSnapshot(mission)',
  'function aircraftProgressionUnlocked(id, campaignId = selectedCampaignId)',
  'f35c: Object.freeze({ mode: "clear", missionKey: "sera-m14", requirement: "M14 CLEAR" })',
  'resetM14State(MISSIONS[currentMissionIndex])'
]) assert(`${map}\n${host}`.includes(token), `integrated contract missing: ${token}`);
assert(unlock.includes("F-35Cは**M14クリア後に購入許可、M15から使用可能**"),
  "v0.17 F-35C unlock source changed");
assert(plan.includes("### M14 BREAKWATER") && plan.includes("hospital ship blue/neutral")
  && plan.includes("Completion unlocks F-35C"), "master plan lost the M14 contract");
console.log("check_sera_m14_preflight: PASS");
console.log("  Nahar geography reuse / per-LST armor / blue hospital / F-35C gate / integrated");
