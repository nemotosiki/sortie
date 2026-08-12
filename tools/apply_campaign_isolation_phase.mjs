#!/usr/bin/env node
// Temporary, idempotent patch driver for the current campaign-isolation phase.
// The GitHub Actions wrapper commits only the files changed by this script.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX = path.join(ROOT, "index.html");
const CHECK = path.join(ROOT, "tools/check_campaign_economy.mjs");
const MESSAGE = path.join(ROOT, ".git/campaign-isolation-message");

function fail(message) {
  throw new Error(`apply_campaign_isolation_phase: ${message}`);
}

function replaceExact(source, before, after, label) {
  const oldCount = source.split(before).length - 1;
  const newCount = source.split(after).length - 1;
  if (oldCount === 1 && newCount === 0) return source.replace(before, after);
  if (oldCount === 0 && newCount === 1) return source;
  fail(`${label}: expected old xor new exactly once, found old=${oldCount}, new=${newCount}`);
}

function replaceSection(source, oldStart, newSignature, endMarker, replacement, label) {
  if (source.includes(newSignature)) return source;
  const start = source.indexOf(oldStart);
  if (start < 0) fail(`${label}: old start marker not found`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) fail(`${label}: end marker not found`);
  return source.slice(0, start) + replacement + source.slice(end);
}

let html = fs.readFileSync(INDEX, "utf8");

html = replaceSection(
  html,
  "    // ---- Hangar economy (purchase record) -------------------------------\n    // Persisted state is ONE array of aircraft ids.",
  "    const PURCHASES_SCHEMA_VERSION = 2;",
  "    // The two stock fighter waves.",
  `    // ---- Hangar economy (purchase record) -------------------------------
    // Purchases are campaign-scoped. Sera shares airframes with the legacy USA
    // hangar, so a single Set<aircraftId> cannot say which campaign paid for an
    // F-15C. Version 2 keeps one Set per campaign while preserving the old
    // storage key so existing profiles migrate in place.
    const PURCHASES_SCHEMA_VERSION = 2;
    const PURCHASES_BACKUP_KEY = \`\${PURCHASES_STORAGE_KEY}.backup.v1\`;

    function emptyCampaignPurchases() {
      return Object.fromEntries(Object.keys(STARTER_AIRCRAFT).map((campaignId) => [campaignId, new Set()]));
    }

    function campaignRosterHas(campaignId, aircraftId) {
      const campaign = CAMPAIGNS.find((entry) => entry.id === campaignId);
      return Boolean(campaign && (campaign.aircraft || []).includes(aircraftId));
    }

    function writeAircraftPurchases(purchases) {
      const campaigns = {};
      for (const campaignId of Object.keys(STARTER_AIRCRAFT)) {
        campaigns[campaignId] = [...(purchases[campaignId] || [])]
          .filter((id) => AIRCRAFT_ORDER.includes(id) && campaignRosterHas(campaignId, id));
      }
      window.localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify({
        schemaVersion: PURCHASES_SCHEMA_VERSION,
        campaigns
      }));
    }

    function readAircraftPurchases() {
      const purchases = emptyCampaignPurchases();
      try {
        const rawText = window.localStorage.getItem(PURCHASES_STORAGE_KEY);
        if (!rawText) return purchases;
        const raw = JSON.parse(rawText);

        if (Array.isArray(raw)) {
          // V1 did not record ownership. Preserve progress by copying a bought
          // airframe into every campaign roster that contains it, then persist
          // the unambiguous V2 shape. The untouched raw value is retained once.
          if (!window.localStorage.getItem(PURCHASES_BACKUP_KEY)) {
            window.localStorage.setItem(PURCHASES_BACKUP_KEY, rawText);
          }
          for (const id of raw) {
            if (!AIRCRAFT_ORDER.includes(id)) continue;
            for (const campaignId of Object.keys(purchases)) {
              if (campaignRosterHas(campaignId, id)) purchases[campaignId].add(id);
            }
          }
          writeAircraftPurchases(purchases);
          return purchases;
        }

        const campaigns = raw && raw.schemaVersion === PURCHASES_SCHEMA_VERSION
          && raw.campaigns && typeof raw.campaigns === "object"
          ? raw.campaigns
          : null;
        if (!campaigns) return purchases;
        for (const campaignId of Object.keys(purchases)) {
          const ids = Array.isArray(campaigns[campaignId]) ? campaigns[campaignId] : [];
          for (const id of ids) {
            if (AIRCRAFT_ORDER.includes(id) && campaignRosterHas(campaignId, id)) {
              purchases[campaignId].add(id);
            }
          }
        }
        return purchases;
      } catch {
        return purchases;
      }
    }

    const aircraftPurchases = readAircraftPurchases();

    function purchasesFor(campaignId = selectedCampaignId) {
      const purchases = aircraftPurchases[campaignId];
      if (!purchases) throw new Error(\`[hangar] unknown purchase namespace "\${campaignId}"\`);
      return purchases;
    }

    function clearAircraftPurchases() {
      for (const purchases of Object.values(aircraftPurchases)) purchases.clear();
    }

    function saveAircraftPurchases() {
      try {
        writeAircraftPurchases(aircraftPurchases);
      } catch {
        // Storage can be unavailable; the hangar simply doesn't persist.
      }
    }

`,
  "campaign purchase persistence"
);

html = replaceExact(
  html,
  "          aircraftPurchases.clear();",
  "          clearAircraftPurchases();",
  "debug purchase reset"
);

html = replaceSection(
  html,
  "    // Which side's wallet an airframe is bought from.",
  "    function aircraftPrice(id, campaignId = selectedCampaignId)",
  "    // Everything this campaign has ever paid out",
  `    function isStarterAircraft(id, campaignId = selectedCampaignId) {
      return STARTER_AIRCRAFT[campaignId] === id;
    }

    function aircraftPrice(id, campaignId = selectedCampaignId) {
      if (!campaignRosterHas(campaignId, id)) {
        throw new Error(\`[hangar] aircraft "\${id}" is not in campaign "\${campaignId}"\`);
      }
      // The jet the campaign hands you. Free, and priced at zero rather than
      // merely pre-owned, so a wiped purchase list can never leave a player
      // grounded with an empty wallet.
      if (isStarterAircraft(id, campaignId)) return 0;
      const cap = PRICE_CAP[campaignId];
      if (!Number.isFinite(cap)) throw new Error(\`[hangar] campaign "\${campaignId}" has no price cap\`);
      const raw = cap * (PRICE_FLOOR_FRACTION + (1 - PRICE_FLOOR_FRACTION) * Math.pow(aircraftPower(id), PRICE_CURVE));
      return Math.round(raw / 1000) * 1000;
    }

    function ownsAircraft(id, campaignId = selectedCampaignId) {
      return isStarterAircraft(id, campaignId) || purchasesFor(campaignId).has(id);
    }

`,
  "campaign purchase ownership"
);

html = replaceExact(
  html,
  `    function campaignSpending(campaignId) {
      let sum = 0;
      for (const id of aircraftPurchases) {
        if (aircraftCampaignId(id) !== campaignId) continue;
        sum += aircraftPrice(id);
      }
      return sum;
    }`,
  `    function campaignSpending(campaignId) {
      let sum = 0;
      for (const id of purchasesFor(campaignId)) sum += aircraftPrice(id, campaignId);
      return sum;
    }`,
  "campaign spending"
);

html = replaceExact(
  html,
  `    function purchaseAircraft(id) {
      if (ownsAircraft(id)) return { ok: false, reason: "owned" };
      if (!campaignAircraft().includes(id)) return { ok: false, reason: "roster" };
      const campaignId = aircraftCampaignId(id);
      const price = aircraftPrice(id);
      const wallet = walletFor(campaignId);
      if (wallet < price) return { ok: false, reason: "funds", short: price - wallet, price, wallet };
      aircraftPurchases.add(id);
      saveAircraftPurchases();
      return { ok: true, price, wallet: walletFor(campaignId) };
    }`,
  `    function purchaseAircraft(id) {
      const campaignId = selectedCampaignId;
      if (ownsAircraft(id, campaignId)) return { ok: false, reason: "owned" };
      if (!campaignAircraft(campaignId).includes(id)) return { ok: false, reason: "roster" };
      const price = aircraftPrice(id, campaignId);
      const wallet = walletFor(campaignId);
      if (wallet < price) return { ok: false, reason: "funds", short: price - wallet, price, wallet };
      purchasesFor(campaignId).add(id);
      saveAircraftPurchases();
      return { ok: true, price, wallet: walletFor(campaignId) };
    }`,
  "campaign purchase transaction"
);

fs.writeFileSync(INDEX, html);

fs.writeFileSync(CHECK, `#!/usr/bin/env node
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
function assert(condition, message) {
  if (!condition) throw new Error(\`check_campaign_economy: \${message}\`);
}
const open = html.indexOf('<script type="module">');
const start = html.indexOf(">", open) + 1;
const end = html.indexOf("</script>", start);
assert(open >= 0 && end > start, "module script not found");

for (const token of [
  "const PURCHASES_SCHEMA_VERSION = 2;",
  "const PURCHASES_BACKUP_KEY = \`\${PURCHASES_STORAGE_KEY}.backup.v1\`;",
  "function emptyCampaignPurchases()",
  "function campaignRosterHas(campaignId, aircraftId)",
  "function purchasesFor(campaignId = selectedCampaignId)",
  "function clearAircraftPurchases()",
  "for (const id of purchasesFor(campaignId)) sum += aircraftPrice(id, campaignId);",
  "purchasesFor(campaignId).add(id);"
]) assert(html.includes(token), \`missing campaign-scoped purchase contract: \${token}\`);

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
`);
fs.chmodSync(CHECK, 0o755);
fs.writeFileSync(MESSAGE, "Separate hangar purchases by campaign\n");

function run(args) {
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: "inherit" });
}
run(["--experimental-vm-modules", "tools/check_campaign_economy.mjs"]);
run(["--experimental-vm-modules", "tools/check_campaign_shell.mjs"]);
run(["--check", "tools/check_campaign_economy.mjs"]);
run([
  "tools/sync_inlined_payload.mjs",
  "payloads/mission_sera_m01.payload.js",
  "payloads/mission_sera_m02.payload.js",
  "payloads/mission_sera_m03.payload.js",
  "--check"
]);
console.log("apply_campaign_isolation_phase: campaign economy applied and checked");
