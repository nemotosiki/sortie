#!/usr/bin/env node
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
function assert(condition, message) {
  if (!condition) throw new Error(`check_campaign_records: ${message}`);
}
for (const token of [
  'const MISSION_RECORDS_STORAGE_KEY = "sortieMissionRecords";',
  'const MISSION_RECORDS_BACKUP_KEY = `${MISSION_RECORDS_STORAGE_KEY}.backup.pre-sera-namespace`;',
  'function cloneMissionRecord(record, sourceKey, ambiguous = true)',
  'function migrateSeraMissionRecords(records, rawText)',
  '["m01", "sera-m01"]',
  '["m02", "sera-m02"]',
  'function validMissionRecord(record)',
  'records["sera-m03"]',
  'sourceKey !== "m03"',
  'migratedImport = true',
  'cloned.ambiguousImport = true',
  'recordSource: sourceKey'
]) assert(html.includes(token), `missing record migration contract: ${token}`);
assert(html.includes('if (!validMissionRecord(legacy) || records[seraKey]) continue;'),
  "migration can overwrite a namespaced result or clone malformed data");
assert(html.includes('validMissionRecord(records.m03)'),
  "formal M03 compatibility records are not preferred");
assert(html.includes('validMissionRecord(records["m-heli"])'),
  "pre-formal M03 slot records have no migration fallback");
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
console.log("  M01/M02 records are copied; formal M03 wins over the legacy slot; existing Sera records win");
console.log("  the pre-namespace profile is backed up before the first migration");
