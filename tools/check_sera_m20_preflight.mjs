#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(`check_sera_m20_preflight: ${message}`); };
const host = read("index.html");
const map = read("payloads", "map_migalCore.payload.js");
const mission = read("payloads", "mission_sera_m20.payload.js");
const finale = read("docs", "story_reboot", "v0.15", "00_gibor_crown_lark_finale.md");
const aircraft = read("docs", "story_reboot", "v0.15", "03_crown_lark_aircraft_canon.md");
const plan = read("docs", "implementation", "sera_m12_m20_campaign_completion_plan.md");
for (const [name, source] of Object.entries({ host, map, mission, finale, aircraft, plan })) {
  assert(!source.includes("\r"), `${name} must be LF-only`);
}
for (const token of [
  '// @payload:map_migalCore', '// @payload:mission_sera_m20',
  'function startM20FalseAccomplished(mission)', 'function spawnM20FinalDuel(mission)',
  'function beginM20NoHostileHold(mission = m20Mission())',
  'function updateM20MissionThreat(dt = 0)', 'function m20ResultSnapshot(mission)',
  'handleM20EnemyDestroyed(enemy, byWingman)', 'resetM20State(MISSIONS[currentMissionIndex])',
  'if (missionRadioSuppressed) return false;', 'if (missionMusicSuppressed) return null;'
]) assert(host.includes(token), `integrated host contract missing: ${token}`);
assert(finale.includes("の2機で固定する")
    && finale.includes("NO HOSTILE CONTACTS")
    && finale.includes("CROWN／LARK／MERIDIANの無線が0"),
  "v0.15 silent-finale canon changed");
assert(aircraft.includes("BLUE CROWN / F-15C -> RED TGT CROWN / F-15C")
    && aircraft.includes("BLUE LARK  / F-15E -> RED TGT LARK  / F-15E"),
  "v0.15 CROWN/LARK aircraft canon changed");
assert(plan.includes("### M20 THE GUARANTOR")
    && plan.includes("Only those two aircraft are present in the final duel."),
  "master plan lost the M20 final-duel contract");
console.log("check_sera_m20_preflight: PASS");
console.log("  false clear / three-second silence / simultaneous blue-to-red / radio suppression / free-flight hold");
