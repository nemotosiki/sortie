#!/usr/bin/env node
import fs from "node:fs";
import vm from "node:vm";

const payload = fs.readFileSync(new URL("../payloads/mission_sera_m01.payload.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
function assert(condition, message) {
  if (!condition) throw new Error(`check_sera_m01_isolation: ${message}`);
}
assert(payload.includes('key: "sera-m01"'), "payload does not own a namespaced mission key");
assert(payload.includes('campaign: "sera"'), "payload is still assigned to the legacy USA campaign");
assert(payload.includes('campaignOrder: 1'), "Sera M01 has no campaign-local order");
assert(payload.includes('MISSIONS.find((mission) => mission.key === "m01")'),
  "legacy M01 is not used solely as an immutable template");
assert(!payload.includes("MISSIONS.splice("), "payload still removes or reorders a legacy mission");
assert(!payload.includes('key: "m01",\n    campaign:'), "payload still reuses the legacy persistent key");
assert(html.includes('key: "m01",\n        world: "archipelagoDay"'),
  "legacy USA M01 is absent from the production mission table");
assert(html.includes('key: "sera-m01",\n          campaign: "sera"'),
  "namespaced Sera M01 is absent from the production payload block");
assert((html.match(/mission\.key !== "sera-m01"/g) || []).length === 5,
  "Sera M01 debug hooks still target the legacy key");
assert(!html.includes('mission.key !== "m01"'),
  "a Sera M01 helper still accepts the legacy mission");
const open = html.indexOf('<script type="module">');
const start = html.indexOf(">", open) + 1;
const end = html.indexOf("</script>", start);
new vm.SourceTextModule(html.slice(start, end));
console.log("check_sera_m01_isolation: PASS");
console.log("  legacy m01 retained / sera-m01 add-only / Sera debug hooks namespaced");
