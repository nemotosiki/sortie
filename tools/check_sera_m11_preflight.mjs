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
const aircraftCanon = read("docs", "story_reboot", "v0.15", "03_crown_lark_aircraft_canon.md");
const mapLedger = read("docs", "story_reboot", "v0.12", "01_map_mission_matrix.md");
const oldPlan = read("docs", "implementation", "sera_m11_high_altitude_escort_implementation_plan.md");
const plan = read("docs", "implementation", "sera_m11_high_altitude_strike_rework_plan.md");

for (const [name, source] of Object.entries({ host, aircraftCanon, mapLedger, oldPlan, plan })) {
  assert(!source.includes("\r"), `${name} must be LF-only`);
}
assert(aircraftCanon.includes("| M11 | FROZEN EYE |") && aircraftCanon.includes("**F/A-18F + 4AAM**"),
  "FROZEN EYE/LARK F/A-18F + 4AAM canon changed");
assert(mapLedger.includes("`ver_ice_coast`") && mapLedger.includes("`verIceCoast`")
  && mapLedger.includes("M11、M26"), "Ver Ice Coast ledger assignment changed");
assert(oldPlan.includes("Superseded on 2026-08-27"), "old escort plan is not visibly superseded");

for (const token of [
  "cyclic-jamming anti-ground strike", "9,144 m / 30,000 ft", "ordinary energy ceiling",
  "electronic-support aircraft at 12,500 m", "HALO jams for 60 seconds", "9,000 m",
  "white NON-TGT secondary objective", "global 75 deg/s", "4,000 km/h maximum speed",
  "N=8 PN guidance"
]) assert(plan.includes(token), `rework plan contract missing: ${token}`);

for (const token of [
  'from "./src/flight/high-altitude-envelope.js?v=20260828-trimmed-launch-1"',
  'ctx.addAircraft("jammer"', 'label: "IL-22PP JAMMER"',
  'id="m11EwDirective"', "function updateM11ElectronicWarfare(mission)",
  "function m11EnhancedSamTuning(enemy)", "// @payload:map_verIceCoast",
  "// @payload:mission_sera_m11"
]) assert(host.includes(token), `host prerequisite missing: ${token}`);

console.log("check_sera_m11_preflight: PASS");
console.log("  FROZEN EYE / Ver Ice Coast / HALO EW x3 / 30,000ft strike / integrated");
