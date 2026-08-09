#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const must = (condition, message) => {
  if (!condition) throw new Error(`[sera-m01-rook-host] ${message}`);
};
const includes = (token, message) => must(source.includes(token), message);

includes("function missionFriendlyDeployment(mission)", "mission-owned friendly deployment is missing");
includes("Array.isArray(deployment.wingmen)", "multiple wingmen are not spawned");
includes("radioSpeaker:", "wingmen do not own radio identities");
includes("wingOffset,", "wingmen do not own formation slots");
includes("playerFlightFrame.setFromUnitVectors(LOCAL_FORWARD, tmpV1)", "authored player facing is ignored");
includes("const claimedByOther = friendlies.some(", "CROWN and LARK can poach the same contact");
includes("const wingmanRefs = friendlies.filter(", "enemy pressure still sees only one wingman");
includes("wingmanRefs[Math.abs(enemy.serial || 0) % wingmanRefs.length]", "wingman hunters are not distributed");
must(!source.includes("const deployment = FRIENDLY_DEPLOYMENTS[mission.key];\n      if (!deployment || !deployment.playerStart) return;"), "player start still bypasses mission friendlies");

console.log("check_sera_m01_rook_host: PASS");
