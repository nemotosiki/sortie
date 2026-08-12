#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = path.join(root, "payloads", "mission_sera_m04.payload.js");
const source = fs.readFileSync(payloadPath, "utf8");
const fail = (message) => { throw new Error(`check_sera_m04_payload: ${message}`); };
const assert = (condition, message) => { if (!condition) fail(message); };

assert(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'key: "sera-m04"', 'campaign: "sera"', 'campaignOrder: 4', 'world: "naharStrait"',
  'breachLineX: -6500', 'failAtBreaches: 2', 'quietDelay: Object.freeze([12, 18])',
  'firstMissileNotBefore: 60', 'breachMark: "m04LhdBreach"', 'hunt: "ship"',
  'banner: "PROTECT CVN EPOCH"'
]) assert(source.includes(token), `missing ${token}`);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-m04-check-"));
const modulePath = path.join(tempDir, "mission_sera_m04.mjs");
fs.writeFileSync(modulePath, source, "utf8");
try {
  const MISSIONS = [{ key: "sera-m03", campaign: "sera", campaignOrder: 3 }];
  let added = null;
  const types = Object.fromEntries(["f2a", "f4", "f16", "mig21", "mig29", "su34"].map((key) => [key, {}]));
  const enemies = Object.fromEntries(["mig21", "mig29", "su34"].map((key) => [key, {}]));
  const ships = Object.fromEntries(["cruiser", "lhd", "missileBoat", "carrier", "frigate"].map((key) => [key, {}]));
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  register({
    tables: {
      MISSIONS,
      WORLD_PRESETS: { naharStrait: {} },
      AIRCRAFT_TYPES: types,
      ENEMY_AI_PROFILES: enemies,
      SHIP_TYPES: ships
    },
    addMission(def) {
      assert(!MISSIONS.some((mission) => mission.key === def.key), `duplicate key ${def.key}`);
      const entries = (wave) => wave.kind === "naval" ? wave.fleet : wave.types;
      const totalTargets = def.sequence.filter((wave) => wave.tgt !== false)
        .reduce((sum, wave) => sum + entries(wave).length, 0);
      const totalContacts = def.sequence.reduce((sum, wave) => sum + entries(wave).length, 0);
      added = { ...def, totalTargets, totalContacts };
      MISSIONS.push(added);
      return added;
    }
  });

  assert(added?.key === "sera-m04" && added?.campaignOrder === 4, "mission identity changed");
  assert(added?.title === "NARROW SEA", `unexpected title ${added?.title}`);
  assert(added?.totalTargets === 6, `expected 6 red TGT, got ${added?.totalTargets}`);
  assert(added?.totalContacts === 14, `expected 14 contacts, got ${added?.totalContacts}`);
  const count = (type) => added.sequence
    .flatMap((wave) => wave.kind === "naval" ? wave.fleet : wave.types)
    .filter((entry) => entry === type).length;
  assert(count("cruiser") === 1 && count("lhd") === 3 && count("missileBoat") === 4,
    "fleet composition changed");
  assert(count("su33") === 0 && count("su34") === 2 && count("mig29") === 2 && count("mig21") === 2,
    "air composition changed");
  const white = added.sequence.filter((wave) => wave.tgt === false);
  assert(white.length === 3 && white.every((wave) => wave.rankNeutral === true),
    "all white formations must remain rank-neutral");
  const cap = added.sequence.find((wave) => wave.label === "FLEET CAP");
  const relief = added.sequence.find((wave) => wave.label === "SHORE RELIEF");
  assert(cap?.role === "line" && cap?.skill === "regular", "MiG-29A CAP must be line/regular");
  assert(relief?.role === "trash" && relief?.skill === "rookie" && relief?.delay === 90,
    "MiG-21 shore relief contract changed");
  assert(added.friendlies?.carrier?.label === "CVN EPOCH" && added.friendlies?.carrier?.vulnerable === true,
    "EPOCH guard deployment missing");
  assert(added.friendlies?.wingmen?.length === 2, "CROWN/LARK wingmen missing");
  const contract = added.m04FleetContract;
  assert(contract?.redFleet?.failAtBreaches === 2, "two-breach failure missing");
  assert(contract?.shipRoute?.speed === 14, "authored fleet transit speed missing");
  assert(contract?.missionUpdate?.afterRedFleetDestroyed === true, "mission update gate missing");
  assert(contract?.rank?.sTime === 990 && contract?.rank?.sEpochHpPercent === 70, "S-rank contract changed");
  assert(added.fixedRadio?.some((line) => line.id === "m04_missile_01"), "anti-ship warning radio missing");
  console.log("check_sera_m04_payload: PASS");
  console.log("  red=cruiser1/LHD3/Su34x2 white=boats4/MiG29x2/MiG21x2 EPOCH guard and breach contract staged");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
