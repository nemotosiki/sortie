#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = path.join(root, "payloads", "mission_sera_m02.payload.js");

function fail(message) {
  console.error(`check_sera_m02_payload: FAIL - ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

assert(fs.existsSync(payloadPath), "payloads/mission_sera_m02.payload.js is missing");
const source = fs.readFileSync(payloadPath, "utf8");
assert(!source.includes("\r"), "payload must be LF-only");
assert(source.includes('world: "amalPlain"'), "M02 does not select Amal Plain");
assert(source.includes('delay: 0,'), "stock sequence[].delay schema was not preserved");
assert(source.includes('type: "f4",\n          label: "ROOK 1 CROWN"'), "CROWN F-4E assignment missing");
assert(source.includes('type: "f16",\n          label: "ROOK 3 LARK"'), "LARK F-16C assignment missing");
assert(source.includes('gate: { mode: "groundMarkClear", mark: "m02Tel" }'), "TEL ground-clear gate missing");
assert(source.includes("protectedFacilities:"), "two-facility contract missing");
assert(source.includes("groundPhaseContract:"), "TEL escape contract missing");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-m02-check-"));
const modulePath = path.join(tempDir, "mission_sera_m02.mjs");
fs.writeFileSync(modulePath, source, "utf8");

try {
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  assert(typeof register === "function", "default export is not register(ctx)");

  const stockM01 = { key: "m01", campaign: "usa", title: "FIRST CONTACT" };
  const stockM02 = { key: "m02", campaign: "usa", world: "archipelagoDay", title: "OLD M02" };
  const stockM03 = { key: "m03", campaign: "usa", title: "OLD M03" };
  const MISSIONS = [stockM01, stockM02, stockM03];

  const ctx = {
    tables: {
      MISSIONS,
      WORLD_PRESETS: { amalPlain: {} },
      AIRCRAFT_TYPES: { f4: {}, f16: {}, mig21: {}, mig23: {}, su24m: {} },
      ENEMY_AI_PROFILES: { mig21: {}, mig23: {}, su24m: {} },
      GROUND_TYPES: { tel: {}, aaGun: {}, adTank: {}, tank: {} }
    },
    addMission(def) {
      assert(!MISSIONS.some((mission) => mission.key === def.key), `duplicate mission key ${def.key}`);
      const normalized = Object.freeze({
        ...def,
        waves: Object.freeze(def.sequence.map((wave) => Object.freeze({ ...wave }))),
        waveCount: def.sequence.filter((wave) => !wave.concurrent).length,
        totalTargets:
          def.sequence.filter((wave) => wave.tgt !== false).reduce((sum, wave) => sum + wave.types.length, 0)
          + def.groundUnits.filter((unit) => unit.tgt !== false).length,
        totalContacts:
          def.sequence.reduce((sum, wave) => sum + wave.types.length, 0)
          + def.groundUnits.length
      });
      MISSIONS.push(normalized);
      return normalized;
    }
  };

  register(ctx);

  assert(MISSIONS.length === 4, `expected stock missions + Sera M02, got ${MISSIONS.length}`);
  assert(MISSIONS[0] === stockM01 && MISSIONS[1] === stockM02 && MISSIONS[2] === stockM03,
    "stock USA campaign order or objects changed");
  assert(stockM02.title === "OLD M02" && stockM02.world === "archipelagoDay",
    "stock USA M02 was modified");
  const mission = MISSIONS.find((entry) => entry.key === "sera-m02");
  assert(mission, "namespaced Sera M02 was not registered");
  assert(mission.campaign === "sera", `unexpected campaign ${mission.campaign}`);
  assert(mission.campaignOrder === 2, `unexpected campaign order ${mission.campaignOrder}`);
  assert(mission.title === "SHATTERED MORNING", `unexpected title ${mission.title}`);
  assert(mission.world === "amalPlain", `unexpected world ${mission.world}`);
  assert(mission.parTime === 720, `unexpected parTime ${mission.parTime}`);
  assert(mission.waves.length === 6, `expected 6 sequence entries, got ${mission.waves.length}`);
  assert(mission.waveCount === 4, `expected 4 principal phases, got ${mission.waveCount}`);
  assert(mission.totalTargets === 8, `expected 8 red TGT contacts, got ${mission.totalTargets}`);
  assert(mission.totalContacts === 20, `expected 20 total contacts, got ${mission.totalContacts}`);

  const airTgt = mission.waves
    .filter((wave) => wave.tgt !== false)
    .reduce((sum, wave) => sum + wave.types.length, 0);
  const airWhite = mission.waves
    .filter((wave) => wave.tgt === false)
    .reduce((sum, wave) => sum + wave.types.length, 0);
  assert(airTgt === 4, `expected 4 red air TGTs, got ${airTgt}`);
  assert(airWhite === 6, `expected 6 white aircraft, got ${airWhite}`);
  assert(mission.waves.filter((wave) => wave.tgt === false).every((wave) => wave.rankNeutral === true), "white aircraft must be rank-neutral");

  const su24 = mission.waves.flatMap((wave) => wave.types).filter((type) => type === "su24m").length;
  assert(su24 === 4, `expected 4 Su-24M attack aircraft, got ${su24}`);
  const mig21 = mission.waves.flatMap((wave) => wave.types).filter((type) => type === "mig21").length;
  const mig23 = mission.waves.flatMap((wave) => wave.types).filter((type) => type === "mig23").length;
  const mig29 = mission.waves.flatMap((wave) => wave.types).filter((type) => type === "mig29").length;
  assert(mig21 === 4 && mig23 === 2, `expected MiG-21x4/MiG-23x2, got ${mig21}/${mig23}`);
  assert(mig29 === 0, `M02 must not field MiG-29A, got ${mig29}`);
  const intercept = mission.waves.find((wave) => wave.label === "HIGH INTERCEPT");
  assert(intercept?.role === "line" && intercept?.skill === "regular",
    "MiG-23 high-intercept role/skill changed");
  assert(intercept?.gate?.mode === "clearOrTimeout", "MiG-23 phase timeout gate missing");
  assert(mission.waves.filter((wave) => wave.types.includes("su24m")).map((wave) => wave.facilityIndex).join(",") === "0,1", "strike waves do not split across both facilities");

  assert(mission.friendlies?.wingmen?.length === 2, "expected CROWN and LARK wingmen");
  const crown = mission.friendlies.wingmen.find((wingman) => wingman.label === "ROOK 1 CROWN");
  const lark = mission.friendlies.wingmen.find((wingman) => wingman.label === "ROOK 3 LARK");
  assert(crown?.type === "f4", `CROWN must fly F-4E/f4, got ${crown?.type}`);
  assert(lark?.type === "f16", `LARK must fly F-16C/f16, got ${lark?.type}`);

  assert(mission.protectedFacilities?.length === 2, "expected two protected facilities");
  assert(mission.facilityContract?.failWhenAllLost === false, "facility loss must not fail M02");
  assert(mission.facilityContract?.rankCapAfterLoss === "A", "one facility loss must cap S at A");

  const tel = mission.groundUnits.filter((unit) => unit.mark === "m02Tel");
  const optionalGround = mission.groundUnits.filter((unit) => unit.tgt === false);
  assert(tel.length === 4 && tel.every((unit) => unit.type === "tel"), "expected four TEL targets");
  assert(optionalGround.length === 6, `expected six optional ground escorts, got ${optionalGround.length}`);
  assert(optionalGround.every((unit) => unit.rankNeutral === true), "ground escorts must be rank-neutral");
  assert(mission.groundUnits.every((unit) => unit.phase === "m02-tel-column"), "ground column must remain dormant until phase 3");
  assert(mission.groundPhaseContract?.failAtRouteEnd === true, "TEL route-end failure missing");
  assert(mission.groundPhaseContract?.holdAfterClear === 4, "post-TEL clear hold changed");
  assert(Array.isArray(mission.convoyRoad) && mission.convoyRoad.length >= 8, "TEL escape road is too short");
  assert(mission.convoySpeed === 12, `unexpected convoy speed ${mission.convoySpeed}`);

  const speakers = new Set([
    ...mission.introRadio.map((line) => line.speaker),
    ...mission.waves.flatMap((wave) => wave.radio || []).map((line) => line.speaker)
  ]);
  for (const speaker of ["meridian", "crown", "lark"]) {
    assert(speakers.has(speaker), `${speaker} has no authored M02 line`);
  }

  console.log("check_sera_m02_payload: PASS");
  console.log(`  stock=m02 mission=${mission.key} campaign=${mission.campaign} TGT=${mission.totalTargets} contacts=${mission.totalContacts}`);
  console.log(`  air=${airTgt}/${airWhite} ground=4/6`);
  console.log(`  wingmen=${crown.type}/${lark.type} facilities=${mission.protectedFacilities.length} TEL escape=${mission.groundPhaseContract.failAtRouteEnd}`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
