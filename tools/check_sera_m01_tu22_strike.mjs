#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const must = (condition, message) => {
  if (!condition) throw new Error(`[sera-m01-tu22-strike] ${message}`);
};

must(source.includes('new Set(["bomber", "tu95", "tu22m3"])'),
  "Tu-22M3 is not classified as strike air");
must(source.includes("if (STRIKE_AIR_TYPES.has(spec.key) && friendlyBase)"),
  "strike classification is not consumed by spawnEnemy");
must(source.includes("if (STRIKE_AIR_TYPES.has(enemy.type) && !bomberFirstKillFired)"),
  "first-bomber event bypasses the shared strike classification");

console.log("check_sera_m01_tu22_strike: PASS");
