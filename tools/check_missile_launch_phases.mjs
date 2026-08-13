#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(process.argv[1], "../..");
const source = fs.readFileSync(path.join(root, "src/combat/missile-guidance.js"), "utf8");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details === null ? "" : `\n${JSON.stringify(details, null, 2)}`;
  throw new Error(`check_missile_launch_phases: ${message}${suffix}`);
}

assert(source.includes("export const VLS_EJECT_TIME = 0.18;"), "VLS eject duration drifted");
assert(source.includes("export const VLS_CAPTURE_ANGLE_DEG = 25;"), "VLS capture cone drifted");
assert(
  source.includes("export const VLS_CAPTURE_MIN_CLOSING_SPEED = 40;"),
  "VLS closing-speed handoff drifted"
);
assert(source.includes("export const VLS_TO_PN_BLEND_TIME = 0.5;"), "VLS blend duration drifted");
assert(
  source.includes("export const SPECIAL_PROFILE_SAFE_SEPARATION_TIME = 0.12;"),
  "special-profile safe separation drifted"
);
assert(
  index.includes('launchProfile: shipSamClearance ? "vls" : "standard"') &&
    index.includes('launchPhase: shipSamClearance ? "vls-eject" : "homing"'),
  "Aegis/frigate launch path is not wired to VLS phases"
);
assert(
  index.includes('launchProfile: PLAYER_SPW.popup ? "safe-separation" : "standard"') &&
    index.includes('launchPhase: PLAYER_SPW.popup ? "safe-separation" : "homing"'),
  "LASM/4AGM popup path is not wired to safe separation"
);
assert(
  /if \(vlsLaunchActive\) \{[\s\S]*?guideAirMissile\([\s\S]*?launchGuidancePoint/.test(index),
  "VLS launch phases do not take priority over the sea-clearance steering branch"
);
assert(
  /const overshot = waitingToReacquire \|\| vlsLaunchActive \? false/.test(index),
  "VLS ejection/capture can incorrectly spend its only seeker pass"
);

const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "sortie-launch-phases-"));
try {
  execFileSync(
    process.execPath,
    [path.join(root, "tools/simulate_missile_launch_phases.mjs"), "--out", tempDirectory],
    { cwd: root, stdio: "pipe" }
  );
  const report = JSON.parse(
    fs.readFileSync(path.join(tempDirectory, "launch-phase-report.json"), "utf8")
  );
  assert(
    report.vls.selected.summary.hits > report.vls.baseline.hits,
    "VLS phased candidate did not improve on vertical pure PN",
    { baseline: report.vls.baseline, selected: report.vls.selected.summary }
  );
  assert(
    report.vls.selected.summary.seaImpacts === 0,
    "selected VLS phase still produced sea impacts",
    report.vls.selected.summary
  );
  assert(
    report.vls.selected.config.ejectTime === 0.18 &&
      report.vls.selected.config.captureAngleDeg === 25 &&
      report.vls.selected.config.minimumClosingSpeed === 40 &&
      report.vls.selected.config.blendTime === 0.5,
    "implemented VLS candidate is no longer the simulated winner",
    report.vls.selected.config
  );
  assert(
    report.lasm.outcomeDifferencesFromBaseline.length === 0 &&
      report.agm4.outcomeDifferencesFromBaseline.length === 0,
    "0.12s safe separation changed a LASM/4AGM scenario outcome",
    {
      lasm: report.lasm.outcomeDifferencesFromBaseline,
      agm4: report.agm4.outcomeDifferencesFromBaseline
    }
  );
} finally {
  fs.rmSync(tempDirectory, { recursive: true, force: true });
}

console.log("check_missile_launch_phases: PASS");
console.log("  VLS = 0.18s eject -> 25deg/40mps capture -> 0.50s PN blend");
console.log("  VLS phase improves pure vertical PN and keeps sea impacts at zero");
console.log("  LASM/4AGM = 0.12s safe separation with unchanged scenario outcomes");
console.log("  ordinary AAM/QAAM, direct SAM/missile boat and UGB remain outside VLS phases");
