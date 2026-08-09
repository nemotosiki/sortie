#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const must = (condition, message) => {
  if (!condition) throw new Error(`[sera-m01-breach-host] ${message}`);
};
const includes = (token, message) => must(source.includes(token), message);

includes("function playAuthoredRadio(line", "authored radio helper is missing");
includes("function authoredRadioPriority(line", "authored priorities are ignored");
includes("let missionFailureRadioOverride = null;", "objective-specific failure radio state is missing");
includes("checkpoint.friendlyBaseHits = friendlyBase ? friendlyBase.hits : 0;", "breach count is not checkpointed");
includes("friendlyBase.hits = at.friendlyBaseHits || 0;", "breach count is not restored");
includes("const breachRule = mission.bomberBreach || null;", "strike logic ignores mission breach rules");
includes("friendlyBase.hits >= failAt", "two-breach failure threshold is not enforced");
includes("if (updateStrikeThreat()) return;", "mission loop continues after breach failure");
includes("const breachCapped = Number.isFinite(breachCapAt)", "one-breach S cap is missing");
includes("const successLine = MISSIONS[currentMissionIndex].successRadio;", "M01 success line is ignored");
includes("const failureLine = missionFailureRadioOverride;", "M01 failure line is ignored");
includes("const authored = MISSIONS[currentMissionIndex].bomberFirstKillRadio;", "M01 first bomber kill line is ignored");
must((source.match(/for \(const line of wave\.radio\) playAuthoredRadio\(line\);/g) || []).length === 2,
  "not every wave radio path preserves authored priority");
must(!source.includes("updatePendingWaves(dt);\n      updateStrikeThreat();\n      updateLandingThreat();"),
  "legacy strike loop still ignores terminal failure");

console.log("check_sera_m01_breach_host: PASS");
