#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = fs.readFileSync(path.join(root, "index.html"), "utf8");
const payload = fs.readFileSync(path.join(root, "payloads", "mission_sera_m11.payload.js"), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`check_sera_m11_runtime: ${message}`);
};

for (const [name, source] of Object.entries({ host, payload })) {
  assert(!source.includes("\r"), `${name} must be LF-only`);
}
for (const token of [
  "function m11BaseTargets(mission = m11Mission(), aliveOnly = false)",
  "function m11SecondaryKills(mission = m11Mission())",
  "function m11FireControlRadars(mission = m11Mission())",
  "function m11EnhancedSamTuning(enemy)",
  "function updateM11ElectronicWarfare(mission)",
  "function updateM11MissionThreat()",
  "m11State.jammingRemaining <= warningLead",
  'm11State.jammingPhase = "radar-online"',
  'm11State.jammingPhase = "fire-control-destroyed"',
  "player.position.y >= m11State.safeAltitude",
  "missile.m11RadarBoosted", 'missile.airGuidancePhase = "altitude-sanctuary"',
  "maxLateralAcceleration: enhancedTuning", "enhancedTuning.enhancedMaxLateralG",
  "cullDistance: enhancedTuning", "profileRange * envelope + 400",
  "distanceToSquared(player.position) > cullDistance * cullDistance",
  "function updateM11EwDirective()", 'id="m11EwDirective"',
  'ui.recoveryGaugeLabel.textContent = "HALO TOTAL HP"',
  "forceSeraM11ClearRadar: () =>", "forceSeraM11SetPlayerAltitude: (altitude = 9000) =>",
  "forceSeraM11AdvanceJamming: (seconds = 1) =>", "forceSeraM11DamageHalo: (index = 0, damage = 98) =>",
  "forceSeraM11ClearSecondary: () =>", "forceSeraM11Lose: (count = 1) =>",
  "forceSeraM11Timeout: () =>"
]) assert(host.includes(token), `host contract missing ${token}`);

const transientWarningCss = host.match(
  /#stallWarning,\s*#lockWarning,\s*#missileWarning,\s*#battleAreaWarning\s*\{([\s\S]*?)\n\s*\}/
)?.[1] || "";
const m11DirectiveCss = host.match(/#m11EwDirective\s*\{([\s\S]*?)\n\s*\}/)?.[1] || "";
const missionBannerCss = host.match(/#missionBanner\s*\{([\s\S]*?)\n\s*\}/)?.[1] || "";
assert(transientWarningCss.includes("background: transparent;")
    && transientWarningCss.includes("border: 0;"),
  "transient HUD warnings returned to opaque web-style panels");
assert(m11DirectiveCss.includes("background: transparent;")
    && m11DirectiveCss.includes("border: 0;"),
  "M11 directive returned to an opaque web-style panel");
assert(missionBannerCss.includes("background: transparent;")
    && missionBannerCss.includes("border: 0;"),
  "mission banner returned to an opaque web-style panel");
assert(host.includes("#m11EwDirective::before")
    && host.includes("#battleAreaWarning::after")
    && host.includes("#missionBanner::after"),
  "transparent warning captions are missing HUD corner rails");

assert(host.includes("const capable = guardState.saved + active;"),
  "runtime does not fail as soon as two HALO survivors become impossible");
assert(host.includes("if (m11State.baseRemaining === 0 && baseTargets.length > 0)"),
  "runtime does not complete on base neutralisation");
assert(host.includes("secondaryComplete ? null : \"A\""),
  "secondary objective does not participate in S-rank cap");
assert(host.includes("Math.min(\n              MAX_MISSILE_TURN_RATE_DEG"),
  "enhanced SAM does not retain the global turn-rate clamp");

for (const token of [
  "jamDuration: 100", "radarOnlineDuration: 18", "warningLead: 35",
  "safeAltitude,", "enhancedRange: 12000", "radarOnlineMissileMaxSpeed = 4000 / 3.6",
  "enhancedTurnRateDeg: 75", "enhancedNavigationRatio: 8", "enhancedMaxLateralG: 150",
  'missionRole: "fireControlRadar"', 'missionRole: "baseSam"',
  "secondaryKillsForS: 4"
]) assert(payload.includes(token), `payload/runtime handshake missing ${token}`);

console.log("check_sera_m11_runtime: PASS");
console.log("  cyclic EW / 9,000m sanctuary / enhanced M11-only SAM / base clear / HALO fail / S cap");
