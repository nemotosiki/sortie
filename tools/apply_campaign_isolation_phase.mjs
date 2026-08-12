#!/usr/bin/env node
// Temporary, idempotent patch driver for the current campaign-isolation phase.
// The GitHub Actions wrapper commits only the files changed by this script.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GIT_DIR = path.resolve(
  ROOT,
  execFileSync("git", ["rev-parse", "--git-dir"], { cwd: ROOT, encoding: "utf8" }).trim()
);
const MESSAGE = path.join(GIT_DIR, "campaign-isolation-message");
const PARTS = [
  path.join(ROOT, "tools/phases/m02_isolation.patch.gz.part00"),
  path.join(ROOT, "tools/phases/m02_isolation.patch.gz.part01")
];

for (const file of PARTS) {
  if (!fs.existsSync(file)) throw new Error(`apply_campaign_isolation_phase: missing staged patch part ${file}`);
}
const PATCH = gunzipSync(Buffer.concat(PARTS.map((file) => fs.readFileSync(file))));

function gitApply(args) {
  try {
    execFileSync("git", ["apply", ...args, "-"], {
      cwd: ROOT,
      input: PATCH,
      stdio: ["pipe", "pipe", "pipe"]
    });
    return true;
  } catch {
    return false;
  }
}

if (gitApply(["--check"])) {
  execFileSync("git", ["apply", "--whitespace=nowarn", "-"], {
    cwd: ROOT,
    input: PATCH,
    stdio: ["pipe", "inherit", "inherit"]
  });
} else if (!gitApply(["--reverse", "--check"])) {
  throw new Error(
    "apply_campaign_isolation_phase: M02 isolation patch matches neither the old nor new tree"
  );
}

for (const file of PARTS) fs.rmSync(file, { force: true });
const phaseDir = path.dirname(PARTS[0]);
if (fs.existsSync(phaseDir) && fs.readdirSync(phaseDir).length === 0) fs.rmdirSync(phaseDir);
fs.writeFileSync(MESSAGE, "Isolate Sera M02 from legacy USA M02\n");

function run(args) {
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: "inherit" });
}

run(["tools/check_sera_m02_payload.mjs"]);
run(["tools/check_sera_m02_host.mjs"]);
run(["--experimental-vm-modules", "tools/check_sera_m02_isolation.mjs"]);
run(["--experimental-vm-modules", "tools/check_campaign_records.mjs"]);
run(["--experimental-vm-modules", "tools/check_campaign_economy.mjs"]);
run(["--experimental-vm-modules", "tools/check_campaign_shell.mjs"]);
run(["tools/migrate_registry_mission_snapshot.mjs", "--self-test"]);
run(["--check", "tools/migrate_registry_mission_snapshot.mjs"]);
run(["--check", "tools/check_sera_m02_e2e.mjs"]);
run(["tools/sync_inlined_payload.mjs", "payloads/mission_sera_m02.payload.js", "--check"]);
console.log("apply_campaign_isolation_phase: Sera M02 isolated and checked");
