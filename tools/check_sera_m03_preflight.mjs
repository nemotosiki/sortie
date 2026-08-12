#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");
const requireFile = (relative) => {
  const full = path.join(ROOT, relative);
  if (!fs.existsSync(full)) throw new Error(`[sera-m03-preflight] missing ${relative}`);
  return read(relative);
};
const requireText = (source, needle, label) => {
  if (!source.includes(needle)) throw new Error(`[sera-m03-preflight] missing ${label}: ${needle}`);
};
const firstCandidate = (source, candidates, label) => {
  const found = candidates.find((candidate) => source.includes(candidate));
  if (!found) throw new Error(`[sera-m03-preflight] no ${label} candidate found: ${candidates.join(", ")}`);
  return found;
};

const index = requireFile("index.html");
const map = requireFile("payloads/map_sarkPort.payload.js");
const heliPack = requireFile("payloads/ground_heli_pack.payload.js");
const m01 = requireFile("payloads/mission_sera_m01.payload.js");
const m02 = requireFile("payloads/mission_sera_m02.payload.js");
requireFile("tools/check_sera_m01_e2e.mjs");
requireFile("tools/check_sera_m02_e2e.mjs");
requireFile("tools/check_sera_m02_host.mjs");
requireFile("docs/implementation/sera_m03_low_water_safe_implementation_plan.md");

requireText(map, "sarkPort", "Sark Port world key");
requireText(map, "addWorldPreset", "Sark Port world preset registration");
requireText(map, "addWorldDecorator", "Sark Port decorator registration");
requireText(heliPack, 'addHeliType("ka52"', "Ka-52 registration");
requireText(heliPack, 'addHeliType("ah64"', "AH-64 registration");
requireText(heliPack, 'addHeliType("armedTransportHeli"', "armed transport registration");
requireText(heliPack, 'addGroundType("spaag"', "SPAAG registration");

for (const marker of [
  "protectedFacilities",
  "spawnProtectedFacilities",
  "activeGroundPhaseId",
  "groundPhaseFailureFired",
  "activateGroundPhase",
  "waveDef.activateGroundPhase",
  "GROUND_PHASE_CONTRACT.failAtRouteEnd",
  "m02FacilityStatus",
  "m02GroundStatus"
]) requireText(index, marker, "M02 reusable host contract");

for (const marker of ["wingmen:", "radioSpeaker:", "rankNeutral"]) {
  if (!m01.includes(marker) && !m02.includes(marker) && !index.includes(marker)) {
    throw new Error(`[sera-m03-preflight] missing reusable mission marker ${marker}`);
  }
}

requireText(index, "m-heli", "stock third mission slot");

const aircraftSource = `${index}\n${m01}\n${m02}`;
const mig21Key = firstCandidate(aircraftSource, ["mig21", "mig21bis", "mig-21"], "MiG-21 key");
const su25Key = firstCandidate(aircraftSource, ["su25", "su25t", "frogfoot"], "Su-25 key");
const groundKey = firstCandidate(index, ["apc", "ifv", "tank"], "APC-capable ground template");

const report = {
  branchContract: "chatgpt/sera-act1-implementation",
  world: "sarkPort",
  helicopterKeys: ["ka52", "ah64", "armedTransportHeli"],
  groundKeys: { spaag: "spaag", apcTemplate: groundKey },
  aircraftKeys: { mig21: mig21Key, su25: su25Key },
  thirdSlot: "m-heli",
  reusableHost: ["protectedFacilities", "groundPhaseContract", "rankNeutral", "multipleWingmen"]
};

console.log("[sera-m03-preflight] PASS");
console.log(JSON.stringify(report, null, 2));
process.exit(0);
