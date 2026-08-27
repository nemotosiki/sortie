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
  'landingMark: "m03TransportLanding"', 'breachMark: "m04FleetBreach"',
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
      AIRCRAFT_TYPES: { f4: {}, f16: {}, mig21: {}, mig29: {} },
      ENEMY_AI_PROFILES: { mig21: {}, mig29: {} },
      HELI_TYPES: { ka52: {} },
      GROUND_TYPES: Object.fromEntries(groundKeys.map((key) => [key, {}]))
    },
    addMission(def) {
      assert(!MISSIONS.some((mission) => mission.key === def.key), `duplicate key ${def.key}`);
      const ground = Array.isArray(def.groundUnits) ? def.groundUnits : [];
      const totalTargets = def.sequence.filter((wave) => wave.tgt !== false)
        .reduce((sum, wave) => sum + wave.types.length, 0)
        + ground.filter((unit) => unit.tgt !== false).length;
      const totalContacts = def.sequence.reduce((sum, wave) => sum + wave.types.length, 0)
        + ground.length;
      added = { ...def, totalTargets, totalContacts };
      MISSIONS.push(added);
      return added;
    }
  });

  assert(added?.key === "sera-m05" && added?.campaignOrder === 5, "mission identity changed");
  assert(added?.title === "PORT OF ASH", `unexpected title ${added?.title}`);
  assert(added?.totalTargets === 17, `expected 17 red TGT, got ${added?.totalTargets}`);
  assert(added?.totalContacts === 34, `expected 34 contacts, got ${added?.totalContacts}`);
  const count = (type) => [
    ...added.sequence.flatMap((wave) => wave.types),
    ...(added.groundUnits || []).map((unit) => unit.type)
  ].filter((entry) => entry === type).length;
  assert(count("autonomousSam") === 2 && count("spaag") === 3, "phase 1 composition changed");
  assert(count("tank") === 12 && count("ifv") === 5, "enemy or friendly ground armor composition changed");
  assert(count("mobileCommand") === 1 && count("ka52") === 2 && count("mig29") === 2 && count("mig21") === 4,
    "phase 3 composition changed");
  const whiteWaves = added.sequence.filter((wave) => wave.tgt === false);
  const whiteGround = added.groundUnits.filter((unit) => unit.tgt === false);
  assert(whiteWaves.length === 3 && whiteWaves.every((wave) => wave.rankNeutral === true),
    "white air formation must remain rank-neutral");
  const qra = added.sequence.find((wave) => wave.label === "QRA");
  assert(qra?.role === "line" && qra?.skill === "regular" && qra?.types.length === 2,
    "MiG-29A QRA contract changed");
  assert(added.sequence.filter((wave) => wave.types.includes("mig21"))
    .every((wave) => wave.role === "trash" && wave.skill === "rookie"),
    "MiG-21 local-defence role/skill changed");
  assert(whiteGround.length === 11 && whiteGround.every((unit) => unit.rankNeutral === true),
    "white ground contacts must remain rank-neutral");
  const friendlyColumn = added.groundUnits.filter((unit) => unit.mark === "m05FriendlyGround");
  assert(friendlyColumn.length === 6
      && friendlyColumn.filter((unit) => unit.missionRole === "m05FriendlyTank").length === 4
      && friendlyColumn.filter((unit) => unit.missionRole === "m05FriendlyIfv").length === 2
      && friendlyColumn.every((unit) => unit.friendly && unit.protected
        && unit.holdUntilMarkClear === "m05Phase1"),
    "joint-recapture column is missing or not held behind phase-one SEAD");
  assert(added.friendlies?.wingmen?.length === 2, "CROWN/LARK wingmen missing");
  assert(added.friendlies?.playerStart?.x === -4200 && added.friendlies?.playerStart?.z === -5000,
    "local-to-world player start translation changed");
  const contract = added.m05GroundBattleContract;
  assert(contract?.origin?.[1] === -3000, "Sark origin changed");
  assert(contract?.friendlyGround?.route?.length === 8, "friendly ground route incomplete");
  assert(contract?.phase3?.commandRoute?.length === 6, "command escape route incomplete");
  assert(added.groundPhaseContracts?.length === 3, "three ground phases missing");
  assert(added.sequence.every((wave) => !wave.types.some((type) => groundKeys.includes(type))),
    "ground type leaked into aircraft sequence");
  assert(contract?.carryover?.m03?.zeroLandingsIfvDelta === -1, "M03 zero-landing carryover missing");
  assert(contract?.carryover?.m04?.oneBreachTankDelta === 1, "M04 breach carryover missing");
  assert(contract?.rank?.sFriendlyTanksAlive === 3 && contract?.rank?.sTime === 930,
    "S-rank contract changed");
  assert(added.fixedRadio?.some((line) => line.id === "m05_chase_02"), "command-distance radio missing");
  console.log("check_sera_m05_payload: PASS");
  console.log("  red=AD5/armor9/command1/Ka52x2 blue=tank4/IFV2 white=tank2/gun3/MiG21x4/MiG29x2");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
