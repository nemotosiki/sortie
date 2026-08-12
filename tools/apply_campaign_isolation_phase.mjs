#!/usr/bin/env node
// Temporary, idempotent patch driver for the current campaign-isolation phase.
// The GitHub Actions wrapper commits only the files changed by this script.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX = path.join(ROOT, "index.html");
const STATIC_CHECK = path.join(ROOT, "tools/check_campaign_records.mjs");
const BROWSER_CHECK = path.join(ROOT, "tools/check_campaign_records_e2e.mjs");
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

const oldRecordBlock = `    function readMissionRecords() {
      try {
        const parsed = JSON.parse(window.localStorage.getItem("sortieMissionRecords") || "{}");
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      } catch {
        return {};
      }
    }

    const missionRecords = readMissionRecords();

    function saveMissionRecords() {
      try {
        window.localStorage.setItem("sortieMissionRecords", JSON.stringify(missionRecords));
      } catch {
        // Storage can be unavailable; records simply don't persist.
      }
    }
`;

const newRecordBlock = `    const MISSION_RECORDS_STORAGE_KEY = "sortieMissionRecords";
    const MISSION_RECORDS_BACKUP_KEY = \`\${MISSION_RECORDS_STORAGE_KEY}.backup.pre-sera-namespace\`;

    function cloneMissionRecord(record, sourceKey) {
      return {
        ...JSON.parse(JSON.stringify(record)),
        ambiguousImport: true,
        recordSource: sourceKey
      };
    }

    function migrateSeraMissionRecords(records, rawText) {
      let changed = false;
      for (const [legacyKey, seraKey] of [["m01", "sera-m01"], ["m02", "sera-m02"]]) {
        const legacy = records[legacyKey];
        if (!legacy || typeof legacy !== "object" || Array.isArray(legacy) || records[seraKey]) continue;
        records[seraKey] = cloneMissionRecord(legacy, legacyKey);
        changed = true;
      }
      if (!changed) return records;
      try {
        if (rawText && !window.localStorage.getItem(MISSION_RECORDS_BACKUP_KEY)) {
          window.localStorage.setItem(MISSION_RECORDS_BACKUP_KEY, rawText);
        }
        window.localStorage.setItem(MISSION_RECORDS_STORAGE_KEY, JSON.stringify(records));
      } catch {
        // In-memory migration still protects this session when storage is unavailable.
      }
      return records;
    }

    function readMissionRecords() {
      try {
        const rawText = window.localStorage.getItem(MISSION_RECORDS_STORAGE_KEY) || "{}";
        const parsed = JSON.parse(rawText);
        const records = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
        return migrateSeraMissionRecords(records, rawText);
      } catch {
        return {};
      }
    }

    const missionRecords = readMissionRecords();

    function saveMissionRecords() {
      try {
        window.localStorage.setItem(MISSION_RECORDS_STORAGE_KEY, JSON.stringify(missionRecords));
      } catch {
        // Storage can be unavailable; records simply don't persist.
      }
    }
`;

let html = fs.readFileSync(INDEX, "utf8");
html = replaceExact(html, oldRecordBlock, newRecordBlock, "mission record migration");
fs.writeFileSync(INDEX, html);

const staticSource = `#!/usr/bin/env node
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
function assert(condition, message) {
  if (!condition) throw new Error(\`check_campaign_records: \${message}\`);
}
for (const token of [
  'const MISSION_RECORDS_STORAGE_KEY = "sortieMissionRecords";',
  'const MISSION_RECORDS_BACKUP_KEY = \`\${MISSION_RECORDS_STORAGE_KEY}.backup.pre-sera-namespace\`;',
  'function cloneMissionRecord(record, sourceKey)',
  'function migrateSeraMissionRecords(records, rawText)',
  '["m01", "sera-m01"]',
  '["m02", "sera-m02"]',
  'ambiguousImport: true',
  'recordSource: sourceKey'
]) assert(html.includes(token), \`missing record migration contract: \${token}\`);
assert(html.includes('if (!legacy || typeof legacy !== "object" || Array.isArray(legacy) || records[seraKey]) continue;'),
  "migration can overwrite a namespaced result or clone malformed data");
assert(html.includes('window.localStorage.setItem(MISSION_RECORDS_BACKUP_KEY, rawText);'),
  "legacy records are not backed up before duplication");
assert(html.includes('In-memory migration still protects this session'),
  "storage failure can discard migrated records from the current session");
assert(html.includes('return migrateSeraMissionRecords(records, rawText);'),
  "record migration is not executed at boot");
const open = html.indexOf('<script type="module">');
const start = html.indexOf(">", open) + 1;
const end = html.indexOf("</script>", start);
new vm.SourceTextModule(html.slice(start, end));
console.log("check_campaign_records: PASS");
console.log("  m01/m02 records are copied, not moved; existing sera records win");
console.log("  the pre-namespace profile is backed up before the first migration");
`;

const browserSource = `#!/usr/bin/env node
import { chromium } from "playwright";

const baseUrl = process.env.SORTIE_BASE_URL || "http://127.0.0.1:8000";
const missionUrl = \`\${baseUrl}/index.html\`;
function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details === null ? "" : \`\\n\${JSON.stringify(details, null, 2)}\`;
  throw new Error(\`check_campaign_records_e2e: \${message}\${suffix}\`);
}
const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=swiftshader", "--disable-gpu-sandbox", "--disable-dev-shm-usage"]
});

async function load(seed) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript((records) => {
    navigator.getGamepads = () => [];
    localStorage.clear();
    localStorage.setItem("sortieMissionRecords", JSON.stringify(records));
  }, seed);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error?.stack || error)));
  await page.goto(missionUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(() => Boolean(window.__game?.debug?.campaigns), null, { timeout: 120_000 });
  const result = await page.evaluate(() => ({
    records: JSON.parse(localStorage.getItem("sortieMissionRecords") || "{}"),
    backup: localStorage.getItem("sortieMissionRecords.backup.pre-sera-namespace")
  }));
  await context.close();
  return { ...result, errors };
}

try {
  const seed = {
    m01: { cleared: true, rank: "A", scores: [1200], times: [91.2], marks: { beacon: 1 } },
    m02: { cleared: true, rank: "B", scores: [900], times: [140.5] }
  };
  const first = await load(seed);
  assert(first.errors.length === 0, "pageerror during record migration", first.errors);
  assert(first.records.m01?.rank === "A" && first.records.m02?.rank === "B",
    "legacy records were moved or altered", first.records);
  assert(first.records["sera-m01"]?.rank === "A"
      && first.records["sera-m01"]?.ambiguousImport
      && first.records["sera-m01"]?.recordSource === "m01",
    "M01 was not copied into the Sera namespace", first.records);
  assert(first.records["sera-m01"]?.marks?.beacon === 1,
    "nested M01 record data was not preserved", first.records["sera-m01"]);
  assert(first.records["sera-m02"]?.rank === "B"
      && first.records["sera-m02"]?.recordSource === "m02",
    "M02 was not copied into the Sera namespace", first.records);
  assert(first.backup === JSON.stringify(seed), "pre-namespace records were not backed up", first);

  const protectedSeed = {
    m01: { cleared: true, rank: "A" },
    "sera-m01": { cleared: true, rank: "S", scores: [9999] }
  };
  const second = await load(protectedSeed);
  assert(second.records["sera-m01"]?.rank === "S"
      && second.records["sera-m01"]?.scores?.[0] === 9999,
    "an existing namespaced record was overwritten", second.records);
  assert(second.records["sera-m02"] === undefined,
    "a missing legacy M02 record produced a phantom Sera record", second.records);

  console.log("check_campaign_records_e2e: PASS");
  console.log("  legacy records retained / Sera copies created / backup written / existing Sera result protected");
} finally {
  await browser.close();
}
`;

for (const [file, source] of [[STATIC_CHECK, staticSource], [BROWSER_CHECK, browserSource]]) {
  if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== source) {
    fs.writeFileSync(file, source);
    fs.chmodSync(file, 0o755);
  }
}
fs.writeFileSync(MESSAGE, "Migrate legacy M01-M02 records into Sera namespace\n");

function run(args) {
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: "inherit" });
}
run(["--experimental-vm-modules", "tools/check_campaign_records.mjs"]);
run(["--experimental-vm-modules", "tools/check_campaign_economy.mjs"]);
run(["--experimental-vm-modules", "tools/check_campaign_shell.mjs"]);
run(["--check", "tools/check_campaign_records_e2e.mjs"]);
run([
  "tools/sync_inlined_payload.mjs",
  "payloads/mission_sera_m01.payload.js",
  "payloads/mission_sera_m02.payload.js",
  "payloads/mission_sera_m03.payload.js",
  "--check"
]);
console.log("apply_campaign_isolation_phase: record namespace migration applied and checked");
