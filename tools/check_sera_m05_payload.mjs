#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = path.join(root, "payloads", "mission_sera_m05.payload.js");
const source = fs.readFileSync(payloadPath, "utf8");
const fail = (message) => { throw new Error(`check_sera_m05_payload: ${message}`); };
const assert = (condition, message) => { if (!condition) fail(message); };

assert(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'key: "sera-m05"', 'campaign: "sera"', 'campaignOrder: 5', 'world: "sarkPortAsh"',
  'holdUntilPhase1Clear: true', 'minimumEscapeTime: 150', 'failWhenTanksLost: 4',
  'landingMark: "m03TransportLanding"', 'breachMark: "m04LhdBreach"',
  'sCommandBeforeRepairBridge: true', 'label: "DESTROY COMMAND VEHICLE"'
]) assert(source.includes(token), `missing ${token}`);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-m05-check-"));
const modulePath = path.join(tempDir, "mission_sera_m05.mjs");
fs.writeFileSync(modulePath, source, "utf8");
try {
  const MISSIONS = [{ key: "sera-m04", campaign: "sera", campaignOrder: 4 }];
  let added = null;
  const groundKeys = ["autonomousSam", "spaag", "tank", "ifv", "aaGun", "mobileCommand"];
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  register({
    tables: {
      MISSIONS,
      WORLD_PRESETS: { sarkPortAsh: {} },
      AIRCRAFT_TYPES: { f4: {}, f16: {}, mig29: {} },
      ENEMY_AI_PROFILES: { mig29: {} },
      HELI_TYPES: { ka52: {} },
      GROUND_TYPES: Object.fromEntries(groundKeys.map((key) => [key, {}]))
    },
    addMission(def) {
      assert(!MISSIONS.some((mission) => mission.key === def.key), `duplicate key ${def.key}`);
      const totalTargets = def.sequence.filter((wave) => wave.tgt !== false)
        .reduce((sum, wave) => sum + wave.types.length, 0);
      const totalContacts = def.sequence.reduce((sum, wave) => sum + wave.types.length, 0);
      added = { ...def, totalTargets, totalContacts };
      MISSIONS.push(added);
      return added;
    }
  });

  assert(added?.key === "sera-m05" && added?.campaignOrder === 5, "mission identity changed");
  assert(added?.title === "PORT OF ASH", `unexpected title ${added?.title}`);
  assert(added?.totalTargets === 17, `expected 17 red TGT, got ${added?.totalTargets}`);
  assert(added?.totalContacts === 26, `expected 26 contacts, got ${added?.totalContacts}`);
  const count = (type) => added.sequence.flatMap((wave) => wave.types).filter((entry) => entry === type).length;
  assert(count("autonomousSam") === 2 && count("spaag") === 3, "phase 1 composition changed");
  assert(count("tank") === 8 && count("ifv") === 3, "ground armor composition changed");
  assert(count("mobileCommand") === 1 && count("ka52") === 2 && count("mig29") === 4,
    "phase 3 composition changed");
  const white = added.sequence.filter((wave) => wave.tgt === false);
  assert(white.length === 3 && white.every((wave) => wave.rankNeutral === true),
    "all white formations must remain rank-neutral");
  assert(added.friendlies?.wingmen?.length === 2, "CROWN/LARK wingmen missing");
  assert(added.friendlies?.playerStart?.x === -4200 && added.friendlies?.playerStart?.z === -5000,
    "local-to-world player start translation changed");
  const contract = added.m05GroundBattleContract;
  assert(contract?.origin?.[1] === -3000, "Sark origin changed");
  assert(contract?.friendlyGround?.route?.length === 8, "friendly ground route incomplete");
  assert(contract?.phase3?.commandRoute?.length === 6, "command escape route incomplete");
  assert(contract?.carryover?.m03?.zeroLandingsIfvDelta === -1, "M03 zero-landing carryover missing");
  assert(contract?.carryover?.m04?.oneBreachTankDelta === 1, "M04 breach carryover missing");
  assert(contract?.rank?.sFriendlyTanksAlive === 3 && contract?.rank?.sTime === 930,
    "S-rank contract changed");
  assert(added.fixedRadio?.some((line) => line.id === "m05_chase_02"), "command-distance radio missing");
  console.log("check_sera_m05_payload: PASS");
  console.log("  red=AD5/armor9/command1/Ka52x2 white=tank2/gun3/MiG29x4 routes and carry-over staged");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
