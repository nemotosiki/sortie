#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = path.join(root, "payloads", "mission_sera_m09.payload.js");
const assert = (condition, message) => {
  if (!condition) throw new Error(`check_sera_m09_payload: ${message}`);
};

assert(fs.existsSync(payloadPath), "payloads/mission_sera_m09.payload.js is missing");
const source = fs.readFileSync(payloadPath, "utf8");
assert(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'key: "sera-m09"', 'title: "IRON HARVEST"', 'world: "karanPlain"',
  'missionRole: "civilian"', 'missionRole: "friendlyArmor"',
  'firstVolleyDelay: 38', 'intervalAfterCommandLoss: 48', 'failAtLosses: 3'
]) {
  assert(source.includes(token), `missing source contract ${token}`);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-m09-check-"));
const modulePath = path.join(tempDir, "mission_sera_m09.mjs");
fs.writeFileSync(modulePath, source, "utf8");

try {
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  const MISSIONS = [{ key: "sera-m08", campaign: "sera", campaignOrder: 8 }];
  let added = null;
  register({
    tables: {
      MISSIONS,
      WORLD_PRESETS: { karanPlain: {} },
      AIRCRAFT_TYPES: { fa18: {}, su25: {}, mig29: {} },
      ENEMY_AI_PROFILES: { su25: {}, mig29: {} },
      HELI_TYPES: { ka52: {} },
      GROUND_TYPES: {
        tank: {}, spaag: {}, mlrs: {}, mobileCommand: {}, evacBus: {}, ambulance: {}
      }
    },
    addMission(def) {
      assert(!MISSIONS.some((mission) => mission.key === def.key), `duplicate key ${def.key}`);
      const totalTargets = def.sequence.filter((wave) => wave.tgt !== false)
        .reduce((sum, wave) => sum + wave.types.length, 0)
        + def.groundUnits.filter((unit) => unit.tgt !== false).length;
      const totalContacts = def.sequence.reduce((sum, wave) => sum + wave.types.length, 0)
        + def.groundUnits.length;
      added = { ...def, totalTargets, totalContacts };
      MISSIONS.push(added);
      return added;
    }
  });

  assert(added?.key === "sera-m09" && added?.campaignOrder === 9, "mission identity changed");
  assert(added?.totalTargets === 18, `expected 18 red TGT, got ${added?.totalTargets}`);
  assert(added?.totalContacts === 33, `expected 33 contacts, got ${added?.totalContacts}`);
  const countGround = (type) => added.groundUnits.filter((unit) => unit.type === type).length;
  const countAir = (type) => added.sequence.flatMap((wave) => wave.types).filter((entry) => entry === type).length;
  assert(countGround("tank") === 12, "enemy plus Kedem tank count changed");
  assert(countGround("spaag") === 4 && countGround("mlrs") === 3, "air-defence/artillery count changed");
  assert(countGround("mobileCommand") === 1, "mobile command count changed");
  assert(countGround("evacBus") === 4 && countGround("ambulance") === 1, "civilian column changed");
  assert(countAir("ka52") === 2 && countAir("su25") === 4 && countAir("mig29") === 2,
    "air package changed");

  const civilians = added.groundUnits.filter((unit) => unit.missionRole === "civilian");
  const friendlyArmor = added.groundUnits.filter((unit) => unit.missionRole === "friendlyArmor");
  assert(civilians.length === 5 && civilians.every((unit) => (
    unit.friendly && unit.protected && unit.tgt === false && unit.rankNeutral
  )), "civilian IFF/protection contract changed");
  assert(friendlyArmor.length === 4 && friendlyArmor.every((unit) => (
    unit.friendly && unit.protected && unit.tgt === false && unit.rankNeutral
  )), "Kedem armour protection contract changed");
  const enemyArmor = added.groundUnits.filter((unit) => unit.missionRole === "enemyArmor");
  assert(enemyArmor.length === 8 && enemyArmor.every((unit) => unit.dispersePath?.length === 3),
    "command-loss dispersal routes changed");
  assert(added.friendlies?.wingmen?.length === 1
    && added.friendlies.wingmen[0].type === "fa18"
    && added.friendlies.wingmen[0].label === "ROOK 2 LARK"
    && added.friendlies.wingmen[0].spw === "agm4", "LARK canonical sortie changed");
  assert(added.sequence.filter((wave) => wave.tgt === false).every((wave) => wave.rankNeutral),
    "optional aircraft must remain rank-neutral");
  assert(added.m09Contract?.rank?.sFriendlyArmorAlive === 4, "S-rank armour requirement changed");

  console.log("check_sera_m09_payload: PASS");
  console.log("  red=armor8/SPAAG4/MLRS3/command1/Ka52x2 white=Su25x4/MiG29x2 blue=civil5/Kedem4");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
