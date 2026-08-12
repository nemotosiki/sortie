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
const PATCH_FILE = path.join(ROOT, "tools/campaign_isolation_phase.patch");
const PATCH = fs.readFileSync(PATCH_FILE);
const REGISTRY_PATCH = gunzipSync(Buffer.from(
  "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",
  "base64"
));

function gitApply(patch, args) {
  try {
    execFileSync("git", ["apply", ...args, "-"], {
      cwd: ROOT,
      input: patch,
      stdio: ["pipe", "pipe", "pipe"]
    });
    return true;
  } catch {
    return false;
  }
}

function applyPatch(patch, label) {
  if (gitApply(patch, ["--check"])) {
    execFileSync("git", ["apply", "--whitespace=nowarn", "-"], {
      cwd: ROOT,
      input: patch,
      stdio: ["pipe", "inherit", "inherit"]
    });
    return;
  }
  if (!gitApply(patch, ["--reverse", "--check"])) {
    throw new Error(
      `apply_campaign_isolation_phase: ${label} patch matches neither the old nor new tree`
    );
  }
}

applyPatch(PATCH, "M01 isolation");
applyPatch(REGISTRY_PATCH, "registry mission migration support");
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
run(["tools/registry_gate.mjs", "--self-test-migration"]);
run(["--check", "tools/registry_gate.mjs"]);
run(["--check", "tools/check_sera_m01_e2e.mjs"]);
run(["tools/sync_inlined_payload.mjs", "payloads/mission_sera_m01.payload.js", "--check"]);
console.log("apply_campaign_isolation_phase: Sera M01 isolated and checked");
