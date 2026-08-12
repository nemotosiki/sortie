#!/usr/bin/env node
import fs from "node:fs";
const source = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
for (const marker of ["function registerSpawnedValue", "rankStats.playerKillValue", "rankStats.spawnedValue"]) {
  let from = 0;
  let hit = 0;
  while (true) {
    const at = source.indexOf(marker, from);
    if (at < 0) break;
    hit += 1;
    console.log(`\n===== ${marker} #${hit} @ ${at} =====\n`);
    console.log(source.slice(Math.max(0, at - 1400), Math.min(source.length, at + 2400)));
    from = at + marker.length;
  }
  if (hit === 0) console.log(`[sera-m03-rank] marker not found: ${marker}`);
}
