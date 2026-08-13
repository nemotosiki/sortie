#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const source = fs.readFileSync(path.join(root, "index.html"), "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`check_sera_m02_host: FAIL - ${message}`);
    process.exit(1);
  }
}

for (const contract of [
  'mode: "groundMarkClear"',
  'facilityIndex: Number.isInteger(entry.facilityIndex)',
  'activateGroundPhase: typeof entry.activateGroundPhase === "string"',
  'const protectedFacilities = [];',
  'function spawnProtectedFacilities(mission)',
  'function updateProtectedFacilityThreat()',
  'function activateGroundPhase(phaseId)',
  'function failEscapingGroundTarget(enemy)',
  'rankNeutral: Boolean(rankNeutral)',
  'new Set(["bomber", "tu95", "tu22m3", "su24m"])',
  'const strikeSpawnObjective = Number.isInteger(spawningFacilityIndex)',
  '(wave) => isTgtEntry(wave) || Boolean(wave.activateGroundPhase)',
  'if (protectedFacilities.length > 0) return updateProtectedFacilityThreat();',
  'if (wave.activateGroundPhase) activateGroundPhase(wave.activateGroundPhase);',
  'enemy.mark === activeWaveGate.mark',
  'seraM02Probe: () =>',
  'forceSeraM02EscapeTel: () =>',
  'forceSeraM02DestroyTels: () =>'
]) {
  assert(source.includes(contract), `missing host contract: ${contract}`);
}

assert(source.includes('mode: "clearOrTimeout"'), "M01 clear-or-timeout gate was removed");
assert(source.includes('if (protectedFacilities.length > 0) return updateProtectedFacilityThreat();\n      if (!friendlyBase) return false;'),
  "legacy friendlyBase strike path is no longer preserved");
assert(source.includes('const facilityCap = mission.facilityContract && protectedFacilityLosses > 0'),
  "facility-loss rank cap missing");
assert(source.includes('failEscapingGroundTarget(enemy);'), "route-end TEL failure is not wired");
assert((source.match(/window\.__game = \{/g) || []).length === 1, "window.__game assignment count changed");

console.log("check_sera_m02_host: PASS");
console.log("  multi-facility strike, delayed ground phase, ground-mark gate and TEL escape failure are wired");
console.log("  M01 clear-or-timeout and single-friendlyBase contracts remain present");
