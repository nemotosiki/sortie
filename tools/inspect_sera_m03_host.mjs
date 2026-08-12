#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const unique = (values) => [...new Set(values)].sort();

const functionNames = unique(
  [...source.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)]
    .map((match) => match[1])
    .filter((name) => /(ground|phase|facility|heli|mission|wave|friendly)/i.test(name))
);
const identifiers = unique(
  [...source.matchAll(/\b([A-Za-z_$][\w$]*(?:Ground|Phase|Facility|Heli|Mission|Wave)[A-Za-z_$\d]*)\b/g)]
    .map((match) => match[1])
);

const knownKeys = [
  "mig21bis", "mig21", "su25", "su25t", "frogfoot",
  "ka52", "ah64", "armedTransportHeli", "spaag", "apc", "ifv", "tank",
  "protectedFacilities", "groundPhaseContract", "activateGroundPhase",
  "resetGroundPhaseState", "spawnProtectedFacilities", "m02GroundStatus"
].filter((key) => source.includes(key));

const snippets = [];
for (const marker of ["protectedFacilities", "groundPhaseContract", "activateGroundPhase", "m02GroundStatus", "m-heli"]) {
  const at = source.indexOf(marker);
  if (at < 0) continue;
  snippets.push(`\n--- ${marker} @ ${at} ---\n${source.slice(Math.max(0, at - 500), Math.min(source.length, at + 900))}`);
}

console.log("[sera-m03-inspect] source bytes", source.length);
console.log("[sera-m03-inspect] related functions", JSON.stringify(functionNames, null, 2));
console.log("[sera-m03-inspect] related identifiers", JSON.stringify(identifiers.slice(0, 240), null, 2));
console.log("[sera-m03-inspect] known keys", JSON.stringify(knownKeys, null, 2));
console.log(snippets.join("\n"));
