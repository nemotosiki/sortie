#!/usr/bin/env node
import fs from "node:fs";

const targetUrl = new URL("../payloads/mission_sera_m03.payload.js", import.meta.url);
let source = fs.readFileSync(targetUrl, "utf8");

function replaceOnce(needle, replacement, label) {
  const first = source.indexOf(needle);
  if (first < 0) throw new Error(`[sera-m03-payload-tuning] missing ${label}`);
  if (source.indexOf(needle, first + needle.length) >= 0) {
    throw new Error(`[sera-m03-payload-tuning] ambiguous ${label}`);
  }
  source = source.slice(0, first) + replacement + source.slice(first + needle.length);
}

if (!source.includes("approachSpeed: 72")) {
  replaceOnce(
    "    unloadDelay: 2.8,\n    apcType: \"tank\",",
    "    unloadDelay: 2.8,\n    approachSpeed: 72,\n    apcSpeed: 18,\n    commandDamagePerArrival: 35,\n    timeLimit: 1260,\n    apcType: \"tank\",",
    "landing runtime tuning"
  );
}

if (source.includes('      rankCapAfterLoss: "A",\n')) {
  replaceOnce('      rankCapAfterLoss: "A",\n', "", "generic facility rank cap");
}

fs.writeFileSync(targetUrl, source, "utf8");
console.log("[sera-m03-payload-tuning] applied");
