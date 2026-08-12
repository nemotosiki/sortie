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
const PATCH_FILE = path.join(ROOT, "tools/phases/m03_isolation.patch.gz");
if (!fs.existsSync(PATCH_FILE)) {
  throw new Error("apply_campaign_isolation_phase: missing M03 isolation patch");
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
    "apply_campaign_isolation_phase: M03 isolation patch matches neither the old nor new tree"
  );
}

// The first isolation run proved the legacy mission itself was correct
// (LOW GUARDIAN / coastalPlain / HAMMER 2), but its E2E used the internal
// `active` probe as a content discriminator. That flag is not mission-owned.
// Assert the observable absence of Sera facilities, transports and APCs instead.
const e2ePath = path.join(ROOT, "tools/check_sera_m03_e2e.mjs");
let e2e = fs.readFileSync(e2ePath, "utf8");
const oldLegacyAssertion = `  assert(probe.missionKey === "m-heli" && probe.title === "LOW GUARDIAN"\n      && probe.worldKey === "coastalPlain" && probe.active === false,\n    "legacy m-heli still resolves to LOW WATER content", probe);`;
const newLegacyAssertion = `  assert(probe.missionKey === "m-heli" && probe.title === "LOW GUARDIAN"\n      && probe.worldKey === "coastalPlain"\n      && probe.facilities.length === 0\n      && probe.transportSpawned === 0\n      && probe.transportLandings === 0\n      && probe.apcSpawned === 0\n      && probe.apcArrivals === 0,\n    "legacy m-heli still resolves to LOW WATER content", probe);`;
if (e2e.includes(oldLegacyAssertion)) {
  e2e = e2e.replace(oldLegacyAssertion, newLegacyAssertion);
  fs.writeFileSync(e2ePath, e2e);
} else if (!e2e.includes(newLegacyAssertion)) {
  throw new Error("apply_campaign_isolation_phase: legacy M03 isolation assertion was not found");
}

fs.rmSync(PATCH_FILE, { force: true });
const phaseDir = path.dirname(PATCH_FILE);
if (fs.existsSync(phaseDir) && fs.readdirSync(phaseDir).length === 0) fs.rmdirSync(phaseDir);
fs.writeFileSync(MESSAGE, "Isolate Sera M03 from legacy USA m-heli\n");

function run(args) {
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: "inherit" });
}
run(["tools/check_sera_m03_payload.mjs"]);
run(["tools/check_sera_m03_inline.mjs"]);
run(["tools/check_sera_m03_runtime_host.mjs"]);
run(["tools/check_sera_m03_preflight.mjs"]);
run(["--experimental-vm-modules", "tools/check_sera_m03_isolation.mjs"]);
run(["--experimental-vm-modules", "tools/check_campaign_records.mjs"]);
run(["--experimental-vm-modules", "tools/check_campaign_economy.mjs"]);
run(["--experimental-vm-modules", "tools/check_campaign_shell.mjs"]);
run(["tools/migrate_registry_mission_snapshot.mjs", "--self-test"]);
run(["--check", "tools/migrate_registry_mission_snapshot.mjs"]);
run(["--check", "tools/check_sera_m03_e2e.mjs"]);
run(["tools/sync_inlined_payload.mjs", "payloads/mission_sera_m03.payload.js", "--check"]);
console.log("apply_campaign_isolation_phase: Sera M03 isolated and checked");
