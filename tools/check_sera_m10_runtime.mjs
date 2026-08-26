#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = fs.readFileSync(path.join(root, "index.html"), "utf8");
const payload = fs.readFileSync(path.join(root, "payloads", "mission_sera_m10.payload.js"), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`check_sera_m10_runtime: ${message}`);
};

assert(!host.includes("\r") && !payload.includes("\r"), "host and payload must be LF-only");
for (const token of [
  "const m10State = {",
  "function resetM10State(mission)",
  "function handleM10GroundDestroyed(enemy)",
  "function handleM10GroundRouteEnd(enemy)",
  "function m10AirCoverRemaining(mission = m10Mission())",
  "function m10TargetRemaining(mission = m10Mission())",
  "function updateM10MissionThreat()",
  "function m10ResultSnapshot(mission)",
  "function m10RankCap(mission)",
  "else if (handleM10GroundRouteEnd(enemy)) return;",
  "handleM10GroundDestroyed(enemy);",
  "if (updateM10MissionThreat()) return;",
  "const m10Result = m10ResultSnapshot(mission);",
  "resetM10State(MISSIONS[currentMissionIndex]);",
  "forceSeraM10BridgeRoute",
  "forceSeraM10DeployPending",
  "forceSeraM10PrecisionRoute",
  "forceSeraM10ClearAirCover",
  "forceSeraM10CriticalEscape",
  "forceSeraM10ResolveOutcome"
]) {
  assert(host.includes(token), `missing host contract ${token}`);
}

const stateReset = host.indexOf("resetM10State(MISSIONS[currentMissionIndex]);");
const groundSpawn = host.indexOf("spawnMissionGround(MISSIONS[currentMissionIndex]);", stateReset);
assert(stateReset >= 0 && groundSpawn > stateReset, "M10 must reset before ground units spawn");

const routeHook = host.indexOf("else if (handleM10GroundRouteEnd(enemy)) return;");
const legacyEscape = host.indexOf("else failEscapingGroundTarget(enemy);", routeHook);
assert(routeHook >= 0 && legacyEscape > routeHook,
  "M10 route-end ownership must run before the generic escape contract");

const damageHook = host.indexOf("handleM10GroundDestroyed(enemy);");
const scoring = host.indexOf("const isTgtKill = isTgtEntry(enemy);", damageHook);
const missionThreat = host.indexOf("if (updateM10MissionThreat()) return;", scoring);
assert(damageHook >= 0 && scoring > damageHook && missionThreat > scoring,
  "M10 route selection must score before the mission threat resolves completion");

for (const field of [
  "route", "bridgeDestroyed", "powerCarsEscaped", "materialCarsEscaped",
  "trainCarsDestroyed", "precisionTargetsDestroyed", "civilianRailDisruption"
]) {
  assert(payload.includes(`${field}: \"${field}\"`), `payload outcome field missing: ${field}`);
  assert(host.includes(`[fields.${field} || \"${field}\"]`), `result field is not persisted: ${field}`);
}

assert(host.includes("setM10BridgeDestroyedVisual(mission, true);"),
  "bridge route does not alter the physical bridge");
assert(host.includes("stopM10Train(mission);"), "successful route does not stop the surviving train");
assert(!host.includes("return { complete: true, route: m10State.route };"),
  "train stop still completes M10 before the air cover is defeated");
assert(host.includes("m10AirCoverRemaining(mission) > 0"),
  "air cover does not hold ACCOMPLISHED");
assert(host.includes("m10State.failed = true;"), "critical escape has no deterministic failure latch");
assert(host.includes("m10State.escapedIds = new Set();"), "Retry does not reset the escape ledger");
assert(host.includes("m10Cap && rank === m10Cap"), "bridge-route rank cap is absent from debrief math");

console.log("check_sera_m10_runtime: PASS");
console.log("  bridge|precision stop, mandatory air-cover clear, escape failure, result, rank, and Retry are wired");
