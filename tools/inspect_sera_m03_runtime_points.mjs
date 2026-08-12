#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const functionNames = [...source.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((match) => match[1]);

console.log("[sera-m03-runtime-points] matching functions");
for (const name of functionNames.filter((value) => /checkpoint|enemy|mission|payload|hook|friendly|facility|heli|ground/i.test(value))) {
  console.log(name);
}

const markers = [
  "const rankStats =",
  "let protectedFacilityLosses",
  "let spawningFacilityIndex",
  "function saveCheckpoint(",
  "function restartFromCheckpoint(",
  "function restoreCheckpoint(",
  "function updateEnemies(",
  "function damageEnemy(",
  "function refreshDebugHook(",
  "function syncDebugHook(",
  "window.__game =",
  "const payloadContext =",
  "function buildPayloadContext("
];

for (const marker of markers) {
  let start = 0;
  let count = 0;
  while (true) {
    const at = source.indexOf(marker, start);
    if (at < 0) break;
    count += 1;
    const from = Math.max(0, at - 700);
    const to = Math.min(source.length, at + marker.length + 1800);
    console.log(`\n===== ${marker} #${count} @ ${at} =====\n`);
    console.log(source.slice(from, to));
    start = at + marker.length;
  }
  if (count === 0) console.log(`\n===== ${marker} NOT FOUND =====\n`);
}
