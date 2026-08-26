#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`check_sera_m11_preflight: ${message}`);
};

const host = read("index.html");
const correction = read("docs", "story_reboot", "v0.15", "02_m01_m11_m21_mission_correction.md");
const aircraftCanon = read("docs", "story_reboot", "v0.15", "03_crown_lark_aircraft_canon.md");
const difficulty = read("docs", "story_reboot", "v0.17", "00_player_aircraft_unlock_schedule_and_mission_difficulty.md");
const mapLedger = read("docs", "story_reboot", "v0.12", "01_map_mission_matrix.md");
const plan = read("docs", "implementation", "sera_m11_high_altitude_escort_implementation_plan.md");

for (const [name, source] of Object.entries({ host, correction, aircraftCanon, difficulty, mapLedger, plan })) {
  assert(!source.includes("\r"), `${name} must be LF-only`);
}

for (const token of [
  "M11がセラ側の高高度特殊任務", "高高度攻撃機編隊へ合流", "高速迎撃機から攻撃機を守る",
  "規定数の攻撃機が投下線／作戦線へ到達すればクリア", "専用の複雑な酸素"
]) {
  assert(correction.includes(token), `v0.15 correction token missing: ${token}`);
}
assert(aircraftCanon.includes("| M11 | FROZEN EYE | 前線離脱 | **F/A-18F + 4AAM** |"),
  "M11 title/LARK aircraft canon changed");
assert(difficulty.includes("高高度攻撃機護衛（v0.15訂正版）"),
  "v0.17 no longer identifies corrected M11");
assert(difficulty.includes("**F-14D** / F/A-18F"), "M11 player-aircraft role changed");
assert(mapLedger.includes("`ver_ice_coast`") && mapLedger.includes("`verIceCoast`")
  && mapLedger.includes("M11、M26"), "Ver Ice Coast ledger assignment changed");

for (const token of [
  'ctx.addAircraft("b1b"', 'label: "B-1B LANCER"', 'blurb: "セラ軍の超音速可変後退翼爆撃機',
  'mig29: Object.freeze({', 'mig31: Object.freeze({',
  'deployFriendlies(missionKey, def)', 'function spawnFriendlyTransports(config)',
  'hunt: entry.hunt === "air" || entry.hunt === "ship"', 'function armGuardObjective(config)',
  '// @payload:mission_sera_m10'
]) {
  assert(host.includes(token), `host prerequisite missing: ${token}`);
}
const missionIntegrated = host.includes('// @payload:mission_sera_m11');
const mapIntegrated = host.includes('// @payload:map_verIceCoast');
assert(missionIntegrated === mapIntegrated, "M11 map/mission integration is only half-applied");

for (const token of [
  "old M11 radar/SAM suppression body", "B-1B", "MiG-31 x2", "success: `guardState.saved >= 2`",
  "Do not add oxygen", "Do not field CROWN"
]) {
  assert(plan.includes(token), `plan contract missing: ${token}`);
}

console.log("check_sera_m11_preflight: PASS");
console.log(`  corrected high-altitude escort / FROZEN EYE / Ver Ice Coast / B-1B x3 / MiG-31 / ${missionIntegrated ? "integrated" : "ready"}`);
