#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(`[sera-m03-inline] ${message}`);
}

const markers = {
  ground: "// @payload:ground_heli_pack",
  map: "// @payload:map_sarkPort",
  mission: "// @payload:mission_sera_m03"
};

for (const [label, marker] of Object.entries(markers)) {
  const count = source.split(marker).length - 1;
  assert(count === 1, `${label} marker must appear exactly once, found ${count}`);
}

const groundAt = source.indexOf(markers.ground);
const mapAt = source.indexOf(markers.map);
const missionAt = source.indexOf(markers.mission);
assert(groundAt < missionAt, "ground/helicopter types must register before M03");
assert(mapAt < missionAt, "Sark Port must register before M03");
assert(source.includes('key: "m-heli"'), "M03 third-slot key is missing from the inlined mission");
assert(source.includes('title: "LOW WATER"'), "LOW WATER mission is missing from normal startup");
assert(source.includes('world: "sarkPort"'), "LOW WATER does not select Sark Port");
assert(source.includes("// SERA M03 RUNTIME CONTRACT"), "M03 runtime host is not installed");

console.log("[sera-m03-inline] PASS");
console.log(`  order ground=${groundAt} map=${mapAt} mission=${missionAt}`);
