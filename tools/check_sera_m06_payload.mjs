#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = path.join(root, "payloads", "mission_sera_m06.payload.js");
const source = fs.readFileSync(payloadPath, "utf8");
const host = fs.readFileSync(path.join(root, "index.html"), "utf8");
const fail = (message) => { throw new Error(`check_sera_m06_payload: ${message}`); };
const assert = (condition, message) => { if (!condition) fail(message); };

assert(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'key: "sera-m06"', 'campaign: "sera"', 'campaignOrder: 6', 'world: "whitePass"',
  'title: "WHITE PASS"', 'missionTag: "m06-reem"', 'missionTag: "m06-return"',
  'type: "f15c"', 'type: "f16"', 'aircraft: "ea18g"', 'aircraft: "f4"',
  'm06CrownSurvived', 'm06RookSuccession', 'ROOK 1 RAVEN', 'ROOK 2 LARK'
]) assert(source.includes(token), `missing ${token}`);
for (const token of [
  "// @payload:mission_sera_m06", "function updateM06Mission()",
  "if (damageM06Reem(enemy, amount, byWingman)) return;",
  "if (updateM06Mission()) return;", "deployment.supportFlights",
  "missionTag: spawningMissionTag"
]) assert(host.includes(token), `runtime integration missing ${token}`);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-m06-check-"));
const modulePath = path.join(tempDir, "mission_sera_m06.mjs");
fs.writeFileSync(modulePath, source, "utf8");
try {
  const MISSIONS = [{ key: "sera-m05", campaign: "sera", campaignOrder: 5 }];
  const aircraft = ["f15c", "f16", "ea18g", "f4", "mig23", "mig29", "mig31", "su35"];
  const enemies = ["mig23", "mig29", "mig31", "su35"];
  const ground = ["longRangeSam", "earlyWarningRadar", "spaag"];
  let added = null;
  let ace = null;
  let options = null;
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  register({
    tables: {
      ACE_PROFILES: { ironback: {
        role: "lead", behavior: "evasive", evadeLateral: 1, evadeVertical: 1,
        evadeFrequency: 1, radarColor: "#fff", tracerColor: 0xffffff,
        theme: {}, radio: { inbound: "", wingman: "", engage: "", down: "" }
      } },
      AIRCRAFT_TYPES: Object.fromEntries(aircraft.map((key) => [key, {}])),
      ENEMY_AI_PROFILES: Object.fromEntries(enemies.map((key) => [key, {}])),
      GROUND_TYPES: Object.fromEntries(ground.map((key) => [key, {}])),
      MISSIONS,
      WORLD_PRESETS: { whitePass: {} }
    },
    addAceProfile(id, def) {
      assert(id === "polka", `unexpected ace id ${id}`);
      ace = def;
      return def;
    },
    addMission(def, receivedOptions) {
      added = def;
      options = receivedOptions;
      MISSIONS.push(def);
      return def;
    }
  });

  assert(ace?.callsign === "POLKA" && ace?.role === "REEM 1", "POLKA ace profile changed");
  assert(added?.key === "sera-m06" && added?.campaignOrder === 6, "mission identity changed");
  assert(options?.after === "sera-m05", "M06 is not inserted after M05");
  assert(added.friendlies?.wingmen?.[0]?.type === "f15c", "CROWN must fly F-15C");
  assert(added.friendlies?.wingmen?.[1]?.type === "f16", "LARK must fly F-16C");
  assert(added.friendlies?.supportFlights?.length === 2, "EW and low-level attack support missing");
  const countGround = (type) => added.groundUnits.filter((unit) => unit.type === type).length;
  assert(countGround("earlyWarningRadar") === 2, "expected two EWR sites");
  assert(countGround("longRangeSam") === 3, "expected three long-range SAM sites");
  assert(countGround("spaag") === 4, "expected four SPAAGs");
  const reem = added.sequence.find((wave) => wave.missionTag === "m06-reem");
  assert(reem?.types?.[0] === "su35" && reem?.tgt === false && reem?.rankNeutral === true,
    "REEM pass must remain a rank-neutral NON-TGT Su-35");
  const returnWave = added.sequence.find((wave) => wave.missionTag === "m06-return");
  assert(returnWave?.types?.length === 2 && returnWave.types.every((type) => type === "mig29"),
    "return intercept must remain two MiG-29A TGTs");
  assert(added.m06WhitePassContract?.marks?.crownSurvived === "m06CrownSurvived",
    "fixed CROWN survival mark missing");
  assert(added.epilogue?.some((line) => line.includes("ROOK 1")), "ROOK succession is absent from debrief");
  console.log("check_sera_m06_payload: PASS");
  console.log("  EWR2/SAM3/SPAAG4, POLKA pass, MiG-29 return intercept, CROWN survival and ROOK succession staged");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
