#!/usr/bin/env node
// Temporary, idempotent patch driver for the current campaign-isolation phase.
// The GitHub Actions wrapper commits only the files changed by this script.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX = path.join(ROOT, "index.html");
const RADIO = path.join(ROOT, "src/ui/radio.js");
const CHECK = path.join(ROOT, "tools/check_campaign_shell.mjs");
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

let html = fs.readFileSync(INDEX, "utf8");
html = replaceExact(
  html,
  '    const PRICE_CAP = Object.freeze({ usa: 42000, rus: 44000 });',
  '    const PRICE_CAP = Object.freeze({ usa: 42000, rus: 44000, sera: 42000 });',
  "price cap"
);
html = replaceExact(
  html,
  '    const STARTER_AIRCRAFT = Object.freeze({ usa: "f16", rus: "mig21" });',
  '    const STARTER_AIRCRAFT = Object.freeze({ usa: "f16", rus: "mig21", sera: "f16" });',
  "starter aircraft"
);
html = replaceExact(
  html,
  `    /* ---- Campaign select ------------------------------------------------
       Two wide cards side by side rather than the mission screen's vertical
       list: the choice is a fork, not a sequence, and left/right has to read
       as the natural input the moment the screen appears. */`,
  `    /* ---- Campaign select ------------------------------------------------
       Campaign cards share one responsive grid. Two legacy viewpoints and the
       independent Sera campaign can coexist without changing the input model:
       left/right still traverses one ordered list. */`,
  "campaign layout comment"
);
html = replaceExact(
  html,
  "      grid-template-columns: repeat(2, 1fr);",
  "      grid-template-columns: repeat(auto-fit, minmax(min(230px, 100%), 1fr));",
  "campaign grid"
);
html = replaceExact(
  html,
  `    // Two sides of the same war (docs/spec_campaign_story.md). The American
    // campaign is everything that ships today; the Russian one is a frame and a
    // route, deliberately locked until its missions exist.`,
  `    // Campaign registry. USA/RUS are the legacy two-sided war; Sera is a
    // separate story namespace. Sera begins locked while its mission ids and
    // persistent state are migrated, so adding the card cannot expose a half-
    // isolated campaign.`,
  "campaign registry comment"
);
html = replaceExact(
  html,
  `      Object.freeze({
        id: "rus",
        name: "RUSSIAN CAMPAIGN",
        operation: "OPERATION NORTHERN STAR",
        side: "NORTHERN FEDERATION FORCES",
        callsign: "IRONBACK",
        jp: "北方連邦軍。同じ20の戦闘を、反対側から飛ぶ。プレイヤーはIRONBACK——米編の宿敵その人。",
        locked: false,
        lockNote: "",
        // Ten airframes against the American twelve. Every one of these was
        // already written out in full to fly as an enemy - flight model, hull,
        // gun and missile damage, stall behaviour - so admitting them to the
        // hangar is a registration change, not a design one. The Su-57 is
        // IRONBACK's own jet, which is the point: this campaign is flown as
        // IRONBACK.
        aircraft: Object.freeze([
          "mig21", "mig23", "mig29", "mig31", "su25", "su33", "su37", "su47", "su35", "su57"
        ])
      })
`,
  `      Object.freeze({
        id: "rus",
        name: "RUSSIAN CAMPAIGN",
        operation: "OPERATION NORTHERN STAR",
        side: "NORTHERN FEDERATION FORCES",
        callsign: "IRONBACK",
        jp: "北方連邦軍。同じ20の戦闘を、反対側から飛ぶ。プレイヤーはIRONBACK——米編の宿敵その人。",
        locked: false,
        lockNote: "",
        // Ten airframes against the American twelve. Every one of these was
        // already written out in full to fly as an enemy - flight model, hull,
        // gun and missile damage, stall behaviour - so admitting them to the
        // hangar is a registration change, not a design one. The Su-57 is
        // IRONBACK's own jet, which is the point: this campaign is flown as
        // IRONBACK.
        aircraft: Object.freeze([
          "mig21", "mig23", "mig29", "mig31", "su25", "su33", "su37", "su47", "su35", "su57"
        ])
      }),
      Object.freeze({
        id: "sera",
        name: "SERA CAMPAIGN",
        operation: "ROOK — OPENING WAR",
        side: "SERA AIR DEFENCE FORCE",
        callsign: "RAVEN",
        jp: "セラ開戦章。ROOK 2 RAVENとして、CROWN、LARK、MERIDIANとともに侵攻初期の空を飛ぶ。",
        locked: true,
        lockNote: "MIGRATION IN PROGRESS",
        aircraft: Object.freeze([
          "f16", "f4", "f15c", "gripen", "f2a", "fa18a", "fa18", "f15", "f14", "rafale", "typhoon", "f35c", "a10", "f22"
        ])
      })
`,
  "Sera campaign entry"
);
html = replaceExact(
  html,
  `    function campaignById(id) {
      return CAMPAIGNS.find((campaign) => campaign.id === id) || CAMPAIGNS[0];
    }`,
  `    function campaignById(id) {
      const campaign = CAMPAIGNS.find((entry) => entry.id === id);
      if (!campaign) throw new Error(\`[campaign] unknown campaign id "\${id}"\`);
      return campaign;
    }`,
  "strict campaign lookup"
);
html = replaceExact(
  html,
  `      const campaignEntry = WINGMAN_BY_CAMPAIGN[selectedCampaignId] || WINGMAN_BY_CAMPAIGN.usa;
      const type = config && config.type ? config.type : campaignEntry.type;`,
  `      const campaignEntry = WINGMAN_BY_CAMPAIGN[selectedCampaignId] || null;
      if (!config && !campaignEntry) {
        throw new Error(\`[friendly] campaign "\${selectedCampaignId}" must author its wingmen\`);
      }
      const type = config && config.type ? config.type : campaignEntry.type;`,
  "strict wingman fallback"
);
fs.writeFileSync(INDEX, html);

let radio = fs.readFileSync(RADIO, "utf8");
radio = replaceExact(
  radio,
  `const RADIO_SPEAKER_LABELS = {
  usa: { command: "SKYEYE", wingman: "HAMMER 2" },
  rus: { command: "NORTHSTAR", wingman: "SICKLE 2" }
};`,
  `const RADIO_SPEAKER_LABELS = {
  usa: { command: "SKYEYE", wingman: "HAMMER 2" },
  rus: { command: "NORTHSTAR", wingman: "SICKLE 2" },
  // Transitional safety net while generic combat callouts are converted to
  // role-based speakers. Explicit Sera mission lines still use meridian,
  // crown and lark directly.
  sera: { command: "MERIDIAN", wingman: "CROWN" }
};`,
  "Sera radio labels"
);
fs.writeFileSync(RADIO, radio);

fs.writeFileSync(CHECK, `#!/usr/bin/env node
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const radio = fs.readFileSync(new URL("../src/ui/radio.js", import.meta.url), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(\`check_campaign_shell: \${message}\`);
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
assert(html.includes('lockNote: "MIGRATION IN PROGRESS"'),
  "Sera shell must remain locked until mission/state migration completes");
assert(html.includes('const PRICE_CAP = Object.freeze({ usa: 42000, rus: 44000, sera: 42000 });'),
  "Sera economy cap is missing");
assert(html.includes('const STARTER_AIRCRAFT = Object.freeze({ usa: "f16", rus: "mig21", sera: "f16" });'),
  "Sera starter aircraft is missing");
assert(html.includes('grid-template-columns: repeat(auto-fit,'),
  "campaign cards are still hard-coded to two columns");
assert(html.includes('throw new Error(\`[campaign] unknown campaign id'),
  "unknown campaigns still silently fall back to USA");
assert(html.includes('must author its wingmen'),
  "a campaign without authored wingmen still silently falls back to USA");
assert(radio.includes('sera: { command: "MERIDIAN", wingman: "CROWN" }'),
  "generic Sera radio labels can still resolve to SKYEYE/HAMMER 2");

new vm.SourceTextModule(moduleBody(html));
console.log("check_campaign_shell: PASS");
console.log("  Sera registry shell / strict lookup / responsive three-card UI");
console.log("  Sera economy defaults / no implicit USA wingman / safe radio labels");
`);
fs.chmodSync(CHECK, 0o755);
fs.writeFileSync(MESSAGE, "Add isolated Sera campaign shell\n");

function run(args, options = {}) {
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: "inherit", ...options });
}
run(["--experimental-vm-modules", "tools/check_campaign_shell.mjs"]);
run(["--check", "src/ui/radio.js"]);
run(["--check", "tools/check_campaign_shell.mjs"]);
run([
  "tools/sync_inlined_payload.mjs",
  "payloads/mission_sera_m01.payload.js",
  "payloads/mission_sera_m02.payload.js",
  "payloads/mission_sera_m03.payload.js",
  "--check"
]);
console.log("apply_campaign_isolation_phase: campaign shell applied and checked");
