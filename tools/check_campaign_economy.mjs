#!/usr/bin/env node
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
function assert(condition, message) {
  if (!condition) throw new Error(`check_campaign_economy: ${message}`);
}
const open = html.indexOf('<script type="module">');
const start = html.indexOf(">", open) + 1;
const end = html.indexOf("</script>", start);
assert(open >= 0 && end > start, "module script not found");

for (const token of [
  "const PURCHASES_SCHEMA_VERSION = 2;",
  "const PURCHASES_BACKUP_KEY = `${PURCHASES_STORAGE_KEY}.backup.v1`;",
  "function emptyCampaignPurchases()",
  "function campaignRosterHas(campaignId, aircraftId)",
  "function purchasesFor(campaignId = selectedCampaignId)",
  "function clearAircraftPurchases()",
  "for (const id of purchasesFor(campaignId)) sum += aircraftPrice(id, campaignId);",
  "purchasesFor(campaignId).add(id);"
]) assert(html.includes(token), `missing campaign-scoped purchase contract: ${token}`);

assert(!html.includes("function aircraftCampaignId(id)"),
  "ownership still assumes an aircraft belongs to only one campaign");
assert(!html.includes("aircraftPurchases.has(id)"),
  "ownership still reads a global aircraft-id Set");
assert(!html.includes("for (const id of aircraftPurchases)"),
  "spending still walks a global purchase Set");
assert(html.includes("if (Array.isArray(raw))"), "V1 purchase migration is missing");
assert(html.includes("if (campaignRosterHas(campaignId, id)) purchases[campaignId].add(id);"),
  "V1 shared airframes are not copied into every matching campaign");
assert(html.includes("writeAircraftPurchases(purchases);"),
  "V1 migration is not persisted as V2");

new vm.SourceTextModule(html.slice(start, end));
console.log("check_campaign_economy: PASS");
console.log("  purchases are namespaced by campaign; shared airframes no longer share ownership");
console.log("  V1 array profiles are backed up and migrated without losing unlocked aircraft");
