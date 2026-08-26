#!/usr/bin/env node
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const radio = fs.readFileSync(new URL("../src/ui/radio.js", import.meta.url), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(`check_campaign_shell: ${message}`);
}

function moduleBody(source) {
  const open = source.indexOf('<script type="module">');
  const start = source.indexOf(">", open) + 1;
  const end = source.indexOf("</script>", start);
  assert(open >= 0 && start > open && end > start, "module script not found");
  return source.slice(start, end);
}

assert(html.includes('id: "sera"'), "Sera campaign is not registered");
assert(html.includes('callsign: "RAVEN"'), "Sera player callsign is missing");
const seraCampaign = html.match(/id: "sera",[\s\S]*?locked: (true|false),\s*lockNote: "([^"]*)"/);
assert(seraCampaign, "Sera campaign lock fields are missing");
assert(seraCampaign[1] === "false" && seraCampaign[2] === "",
  "Sera campaign must be selectable after mission/state migration");
for (const marker of [
  "mission_sera_m01", "mission_sera_m02", "mission_sera_m03", "mission_sera_m04",
  "mission_sera_m05", "mission_sera_m06", "mission_sera_m07", "mission_sera_m08", "mission_sera_m09",
  "mission_sera_m10"
]) {
  assert(html.includes(`// @payload:${marker}`), `${marker} is not integrated into the campaign build`);
}
assert(html.includes('const PRICE_CAP = Object.freeze({ usa: 42000, rus: 44000, sera: 42000 });'),
  "Sera economy cap is missing");
assert(html.includes('const STARTER_AIRCRAFT = Object.freeze({ usa: "f16", rus: "mig21", sera: "f16" });'),
  "Sera starter aircraft is missing");
assert(html.includes('grid-template-columns: repeat(auto-fit,'),
  "campaign cards are still hard-coded to two columns");
assert(html.includes('throw new Error(`[campaign] unknown campaign id'),
  "unknown campaigns still silently fall back to USA");
assert(html.includes('must author its wingmen'),
  "a campaign without authored wingmen still silently falls back to USA");
assert(radio.includes('sera: { command: "MERIDIAN", wingman: "CROWN" }'),
  "generic Sera radio labels can still resolve to SKYEYE/HAMMER 2");

new vm.SourceTextModule(moduleBody(html));
console.log("check_campaign_shell: PASS");
console.log("  unlocked ten-mission Sera shell / strict lookup / responsive three-card UI");
console.log("  Sera economy defaults / no implicit USA wingman / safe radio labels");
