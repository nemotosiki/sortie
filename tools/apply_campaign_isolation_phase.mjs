#!/usr/bin/env node
// Temporary, idempotent patch driver for the current campaign-isolation phase.
// The GitHub Actions wrapper commits only the files changed by this script.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GIT_DIR = path.resolve(
  ROOT,
  execFileSync("git", ["rev-parse", "--git-dir"], { cwd: ROOT, encoding: "utf8" }).trim()
);
const MESSAGE = path.join(GIT_DIR, "campaign-isolation-message");
const PATCH_FILE = path.join(ROOT, "tools/campaign_isolation_phase.patch");
const PATCH = fs.readFileSync(PATCH_FILE);

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
    "apply_campaign_isolation_phase: M01 isolation patch matches neither the old nor new tree"
  );
}

fs.rmSync(PATCH_FILE, { force: true });
fs.writeFileSync(MESSAGE, "Isolate Sera M01 from legacy USA M01\n");

function run(args) {
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: "inherit" });
}

run(["tools/check_sera_m01_payload.mjs"]);
run(["tools/check_sera_m01_breach_host.mjs"]);
run(["tools/check_sera_m01_rook_host.mjs"]);
run(["tools/check_sera_m01_tu22_strike.mjs"]);
run(["tools/check_sera_m01_wave_host.mjs"]);
run(["--experimental-vm-modules", "tools/check_sera_m01_isolation.mjs"]);
run(["--experimental-vm-modules", "tools/check_campaign_records.mjs"]);
run(["--experimental-vm-modules", "tools/check_campaign_economy.mjs"]);
run(["--experimental-vm-modules", "tools/check_campaign_shell.mjs"]);
run(["--check", "tools/check_sera_m01_e2e.mjs"]);
run(["tools/sync_inlined_payload.mjs", "payloads/mission_sera_m01.payload.js", "--check"]);
console.log("apply_campaign_isolation_phase: Sera M01 isolated and checked");
