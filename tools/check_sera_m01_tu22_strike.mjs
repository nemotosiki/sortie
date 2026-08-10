#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const must = (condition, message) => {
  if (!condition) throw new Error(`[sera-m01-tu22-strike] ${message}`);
};

must(source.includes('new Set(["bomber", "tu95", "tu22m3", "su24m"])'),
  "Tu-22M3 is not classified as strike air alongside the M02 Su-24M");
must(source.includes("const strikeSpawnObjective = Number.isInteger(spawningFacilityIndex)"),
  "strike-air spawn no longer resolves the authored objective");
must(source.includes(": friendlyBase;"),
  "M01's legacy single friendlyBase fallback was removed");
must(source.includes("if (STRIKE_AIR_TYPES.has(enemy.type) && !bomberFirstKillFired)"),
  "first-bomber event bypasses the shared strike classification");

console.log("check_sera_m01_tu22_strike: PASS");
console.log("  M01 Tu-22M3 keeps the friendlyBase path; M02 Su-24M may use indexed facilities");
