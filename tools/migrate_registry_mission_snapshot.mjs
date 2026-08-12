#!/usr/bin/env node
// Selectively migrate a mission's registry shape from a legacy key to a new
// namespaced key. The current snapshot must first be captured in a disposable
// worktree with `registry_gate.mjs --update`; this tool then compares it to a
// preserved baseline and refuses any unrelated disappearance before writing the
// narrowly migrated baseline back to the current snapshot path.

import fs from "node:fs";
import path from "node:path";

function fail(message) {
  throw new Error(`migrate_registry_mission_snapshot: ${message}`);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function diffLosses(before, after) {
  const losses = [];
  for (const table of Object.keys(before)) {
    if (!(table in after)) {
      losses.push(`${table}: whole table missing`);
      continue;
    }
    const oldTable = before[table];
    const newTable = after[table];
    if (Array.isArray(oldTable)) {
      for (const id of oldTable) {
        if (!newTable.includes(id)) losses.push(`${table}: entry "${id}" removed`);
      }
      continue;
    }
    for (const id of Object.keys(oldTable)) {
      if (!(id in newTable)) {
        losses.push(`${table}.${id}: entry removed`);
        continue;
      }
      const kept = new Set(newTable[id]);
      for (const keyPath of oldTable[id]) {
        if (!kept.has(keyPath)) losses.push(`${table}.${id}: field "${keyPath}" removed`);
      }
    }
  }
  return losses;
}

function parseMigrations(values) {
  const migrations = values.map((spec) => {
    const [oldKey, newKey, ...extra] = String(spec || "").split(":");
    if (!oldKey || !newKey || extra.length || oldKey === newKey) {
      fail(`invalid --mission=${spec || ""}; expected distinct old:new keys`);
    }
    return { oldKey, newKey };
  });
  const oldKeys = new Set();
  const newKeys = new Set();
  for (const { oldKey, newKey } of migrations) {
    if (oldKeys.has(oldKey) || newKeys.has(newKey)) {
      fail(`duplicate migration involving ${oldKey}:${newKey}`);
    }
    oldKeys.add(oldKey);
    newKeys.add(newKey);
  }
  return migrations;
}

function migrateBaseline(baseline, current, migrations) {
  if (!baseline.MISSIONS || Array.isArray(baseline.MISSIONS)) {
    fail("baseline has no keyed MISSIONS table");
  }
  if (!current.MISSIONS || Array.isArray(current.MISSIONS)) {
    fail("current snapshot has no keyed MISSIONS table");
  }

  const protectedBaseline = cloneJson(baseline);
  const nextBaseline = cloneJson(baseline);
  const migrated = [];

  for (const { oldKey, newKey } of migrations) {
    const oldBaseline = baseline.MISSIONS[oldKey];
    const oldCurrent = current.MISSIONS[oldKey];
    const newCurrent = current.MISSIONS[newKey];
    if (!oldBaseline) fail(`baseline mission "${oldKey}" does not exist`);
    if (!oldCurrent) fail(`current legacy mission "${oldKey}" does not exist`);
    if (!newCurrent) fail(`current namespaced mission "${newKey}" does not exist`);

    // First run: the old baseline contains the Sera-shaped mission that used
    // the legacy key. Later runs: the namespaced baseline is already canonical.
    const movedShape = baseline.MISSIONS[newKey] || oldBaseline;
    const fieldsAtNewKey = new Set(newCurrent);
    const missingFromNew = movedShape.filter((field) => !fieldsAtNewKey.has(field));
    if (missingFromNew.length) {
      fail(`${newKey} is missing ${missingFromNew.length} migrated field(s): `
        + missingFromNew.slice(0, 10).join(", "));
    }

    // Suppress only the intentional shrink at the old key. Every other prior
    // table, entry and field remains protected by the ordinary no-loss rule.
    protectedBaseline.MISSIONS[oldKey] = [...oldCurrent];
    nextBaseline.MISSIONS[oldKey] = [...oldCurrent];
    if (!nextBaseline.MISSIONS[newKey]) nextBaseline.MISSIONS[newKey] = [...newCurrent];
    migrated.push(`${oldKey}->${newKey}`);
  }

  const unrelatedLosses = diffLosses(protectedBaseline, current);
  if (unrelatedLosses.length) {
    fail(`refusing ${unrelatedLosses.length} unrelated disappearance(s): `
      + unrelatedLosses.slice(0, 10).join(" | "));
  }
  if (diffLosses(nextBaseline, current).length) {
    fail("selectively migrated baseline still reports registry losses");
  }
  return { snapshot: nextBaseline, migrated };
}

function option(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? process.argv[at + 1] : null;
}

function options(name) {
  const prefix = `--${name}=`;
  const values = [];
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (arg.startsWith(prefix)) values.push(arg.slice(prefix.length));
    else if (arg === `--${name}`) {
      values.push(process.argv[i + 1]);
      i += 1;
    }
  }
  return values;
}

function selfTest() {
  const baseline = {
    AIRCRAFT_ORDER: ["f16"],
    MISSIONS: {
      m01: ["key", "friendlies", "bomberBreach"],
      m02: ["key", "sequence"]
    }
  };
  const current = {
    AIRCRAFT_ORDER: ["f16"],
    MISSIONS: {
      m01: ["key", "sequence"],
      "sera-m01": ["key", "campaign", "friendlies", "bomberBreach"],
      m02: ["key", "sequence"]
    }
  };
  const migrated = migrateBaseline(baseline, current, parseMigrations(["m01:sera-m01"]));
  if (!migrated.snapshot.MISSIONS["sera-m01"].includes("bomberBreach")) {
    fail("self-test did not preserve the moved mission shape");
  }
  const broken = cloneJson(current);
  broken.MISSIONS.m02 = ["key"];
  let refused = false;
  try {
    migrateBaseline(baseline, broken, parseMigrations(["m01:sera-m01"]));
  } catch {
    refused = true;
  }
  if (!refused) fail("self-test accepted an unrelated loss");
  console.log("migrate_registry_mission_snapshot: self-test PASS");
}

if (process.argv.includes("--self-test")) {
  selfTest();
  process.exit(0);
}

const baselinePath = option("baseline");
const currentPath = option("current");
const migrationSpecs = options("mission");
if (!baselinePath || !currentPath || migrationSpecs.length === 0) {
  fail("usage: --baseline=<old.json> --current=<new.json> --mission=old:new [...]");
}

const baseline = JSON.parse(fs.readFileSync(path.resolve(baselinePath), "utf8"));
const current = JSON.parse(fs.readFileSync(path.resolve(currentPath), "utf8"));
const result = migrateBaseline(baseline, current, parseMigrations(migrationSpecs));
fs.writeFileSync(path.resolve(currentPath), `${JSON.stringify(result.snapshot, null, 1)}\n`);
console.log(`migrate_registry_mission_snapshot: migrated ${result.migrated.join(", ")}`);
