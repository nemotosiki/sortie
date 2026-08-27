#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`check_sera_m16_preflight: ${message}`);
};
const host = read("index.html");
const map = read("payloads", "map_hadorDeepSea.payload.js");
const mission = read("payloads", "mission_sera_m16.payload.js");
const plan = read("docs", "implementation", "sera_m12_m20_campaign_completion_plan.md");
for (const [name, source] of Object.entries({ host, map, mission, plan })) {
  assert(!source.includes("\r"), `${name} must be LF-only`);
}
for (const token of [
  'ctx.addWorldPreset("hadorDeepSea"', 'regionId: "hador_deep_sea"',
  '// @payload:map_hadorDeepSea', '// @payload:mission_sera_m16',
  'if (Array.isArray(deployment.shipGroups))', 'missionTag: spawningMissionTag',
  'function spawnM16Ssgns(mission)', 'function openM16SsgnWindow(mission, forcePermanent = false)',
  'function spawnM16AntiShipWeapon(origin, target, owner = null)',
  'function updateM16AntiShipWeapon(enemy, dt)', 'function updateM16MissionThreat()',
  'function m16ResultSnapshot(mission)', 'handleM16EnemyDestroyed(enemy, byWingman)',
  'resetM16State(MISSIONS[currentMissionIndex])'
]) assert(`${map}\n${mission}\n${host}`.includes(token), `integrated contract missing: ${token}`);
assert(plan.includes("### M16 HOME FLEET")
    && plan.includes("Aggregate fleet HP is visible")
    && plan.includes("First in-story use of `GIBOR` is praise/nickname only"),
  "master plan lost the M16 fleet/GIBOR contract");
console.log("check_sera_m16_preflight: PASS");
console.log("  deep-sea map / aggregate fleet HP / reusable surfaced hulls / independent anti-ship contacts / result ledger");
