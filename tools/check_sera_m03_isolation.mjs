#!/usr/bin/env node
import fs from "node:fs";
import vm from "node:vm";

const payload = fs.readFileSync(new URL("../payloads/mission_sera_m03.payload.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
function assert(condition, message) {
  if (!condition) throw new Error(`check_sera_m03_isolation: ${message}`);
}
assert(payload.includes('key: "sera-m03"'), "payload does not own a namespaced mission key");
assert(payload.includes('campaign: "sera"'), "payload is still assigned to legacy USA");
assert(payload.includes('campaignOrder: 3'), "Sera M03 campaign order is missing");
assert(payload.includes('MISSIONS.find((mission) => mission.key === "m-heli")'),
  "legacy m-heli is not used solely as an immutable template");
assert(!payload.includes("MISSIONS.splice("), "payload still removes or reorders a legacy mission");
assert(html.includes('key: "m-heli",\n        world: "coastalPlain"'), "legacy USA m-heli is absent");
assert(html.includes('key: "sera-m03",\n          campaign: "sera"'), "namespaced Sera M03 is absent");
assert(!html.includes("missionRecords.m03 = {"), "M03 still writes a compatibility result mirror");
assert(html.includes("missionRecords[key] = entry;"), "results are not stored by canonical mission key");
const open = html.indexOf('<script type="module">');
const start = html.indexOf(">", open) + 1;
const end = html.indexOf("</script>", start);
new vm.SourceTextModule(html.slice(start, end));
console.log("check_sera_m03_isolation: PASS");
console.log("  legacy m-heli retained / sera-m03 add-only / one canonical result key");
