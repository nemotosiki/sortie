#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = fs.readFileSync(path.join(root, "index.html"), "utf8");
const payload = fs.readFileSync(path.join(root, "payloads", "mission_sera_m11.payload.js"), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`check_sera_m11_runtime: ${message}`);
};

for (const [name, source] of Object.entries({ host, payload })) {
  assert(!source.includes("\r"), `${name} must be LF-only`);
}
for (const token of [
  "const m11State =",
  "function resetM11State(mission)",
  "function m11HaloAircraft(mission = m11Mission())",
  "function m11FormationProgress(mission = m11Mission())",
  "function updateM11Proximity(mission)",
  "function updateM11MissionThreat()",
  "function m11ResultSnapshot(mission)",
  "function m11RankCap(mission)",
  "resetM11State(MISSIONS[currentMissionIndex]);",
  "if (updateM11MissionThreat()) return;",
  "const m11Result = m11ResultSnapshot(mission);",
  "const m11Cap = m11RankCap(mission);",
  "seraM11Probe: () =>",
  "forceSeraM11ClearTargets: () =>",
  "forceSeraM11Save: (count = 1) =>",
  "forceSeraM11Lose: (count = 1) =>",
  "forceSeraM11Timeout: () =>"
]) assert(host.includes(token), `host contract missing ${token}`);

assert(host.includes("const capable = guardState.saved + active;"),
  "runtime does not fail as soon as two survivors become impossible");
assert(host.includes("if (guardState.saved >= required)"),
  "runtime does not clear on the required operation-line arrivals");
assert(host.includes("return true;\n    }\n\n    function m11ResultSnapshot"),
  "M11 does not own the unresolved frame against generic destroy-all completion");
assert(host.includes("player.position.distanceTo(friendly.group.position)"),
  "formation proximity is not measured against live HALO aircraft");
assert(host.includes("missionElapsed >= m11State.nextProximityWarningAt"),
  "proximity warning has no repeat throttle");

for (const token of [
  "route: Object.freeze({", "start: Object.freeze([...anchors.strikeStart])",
  "exit: Object.freeze([...anchors.strikeExit])", "requiredSaved: 2",
  "warningDistance: 4300", "clearDistance: 3000", "timeLimit: 330"
]) assert(payload.includes(token), `payload/runtime handshake missing ${token}`);

console.log("check_sera_m11_runtime: PASS");
console.log("  2-of-3 progress completion / impossible-survival fail / proximity hysteresis / result+rank hooks");
