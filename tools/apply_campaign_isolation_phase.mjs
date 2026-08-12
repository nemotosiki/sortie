#!/usr/bin/env node
// Temporary, idempotent patch driver for the current campaign-isolation phase.

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
const PATCH_FILE = path.join(ROOT, "tools/phases/m03_record_migration.patch.gz");
if (!fs.existsSync(PATCH_FILE)) {
  throw new Error("apply_campaign_isolation_phase: missing M03 record migration patch");
}
const PATCH = gunzipSync(fs.readFileSync(PATCH_FILE));

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
    "apply_campaign_isolation_phase: M03 record patch matches neither the old nor new tree"
  );
}

fs.rmSync(PATCH_FILE, { force: true });
const phaseDir = path.dirname(PATCH_FILE);
if (fs.existsSync(phaseDir) && fs.readdirSync(phaseDir).length === 0) fs.rmdirSync(phaseDir);
fs.writeFileSync(MESSAGE, "Migrate M03 records into Sera namespace\n");

function run(args) {
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: "inherit" });
}
run(["--experimental-vm-modules", "tools/check_campaign_records.mjs"]);
run(["--experimental-vm-modules", "tools/check_campaign_economy.mjs"]);
run(["--experimental-vm-modules", "tools/check_campaign_shell.mjs"]);
run(["--check", "tools/check_campaign_records_e2e.mjs"]);
run(["tools/sync_inlined_payload.mjs", "payloads/mission_sera_m01.payload.js", "--check"]);
run(["tools/sync_inlined_payload.mjs", "payloads/mission_sera_m02.payload.js", "--check"]);
run(["tools/sync_inlined_payload.mjs", "payloads/mission_sera_m03.payload.js", "--check"]);
console.log("apply_campaign_isolation_phase: M03 record migration applied and checked");
