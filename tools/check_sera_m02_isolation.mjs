#!/usr/bin/env node
import fs from "node:fs";
import vm from "node:vm";

const payload = fs.readFileSync(new URL("../payloads/mission_sera_m02.payload.js", import.meta.url), "utf8");
const storyEvents = fs.readFileSync(new URL("../payloads/story_events_2.payload.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(`check_sera_m02_isolation: ${message}`);
}

assert(payload.includes('key: "sera-m02"'), "payload does not own a namespaced mission key");
assert(payload.includes('campaign: "sera"'), "payload is still assigned to the legacy USA campaign");
assert(payload.includes('campaignOrder: 2'), "Sera M02 has no campaign-local order");
assert(payload.includes('MISSIONS.find((mission) => mission.key === "m02")'),
  "legacy M02 is not used solely as an immutable template");
assert(!payload.includes("MISSIONS.splice("), "payload still removes or reorders a legacy mission");
assert(!payload.includes('key: "m02",\n    campaign:'), "payload still reuses the legacy persistent key");
assert(html.includes('key: "m02",\n        world: "archipelagoDay"'),
  "legacy USA M02 is absent from the production mission table");
assert(html.includes('key: "sera-m02",\n          campaign: "sera"'),
  "namespaced Sera M02 is absent from the production payload block");
assert((html.match(/mission\.key !== "sera-m02"/g) || []).length === 8,
  "Sera M02 debug hooks still target the legacy key");
assert(!html.includes('mission.key !== "m02"'),
  "a Sera M02 helper still accepts the legacy mission");
assert(storyEvents.includes('if (runtime.key === "m02")'),
  "legacy DAGGER succession event is no longer attached to legacy M02");
assert(!storyEvents.includes('runtime.key === "sera-m02"'),
  "legacy DAGGER succession event was retargeted into Sera M02");
assert(storyEvents.includes('const WATCHED_KEYS = new Set(["m02"'),
  "legacy story watcher no longer includes M02");
const open = html.indexOf('<script type="module">');
const start = html.indexOf(">", open) + 1;
const end = html.indexOf("</script>", start);
new vm.SourceTextModule(html.slice(start, end));
console.log("check_sera_m02_isolation: PASS");
console.log("  legacy m02 retained / sera-m02 add-only / Sera debug hooks namespaced");
console.log("  DAGGER/HAMMER succession runtime remains attached only to legacy m02");
