#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const payloadPath = path.join(root, "payloads", "mission_sera_m03.payload.js");

function fail(message) {
  console.error(`check_sera_m03_payload: FAIL - ${message}`);
  process.exit(1);
}
function assert(condition, message) {
  if (!condition) fail(message);
}

assert(fs.existsSync(payloadPath), "payloads/mission_sera_m03.payload.js is missing");
const source = fs.readFileSync(payloadPath, "utf8");
assert(!source.includes("\r"), "payload must be LF-only");
assert(source.includes('world: "sarkPort"'), "M03 does not select Sark Port");
assert(source.includes('key: "m-heli"'), "M03 does not preserve the third campaign slot");
assert(source.includes('transportType: "armedTransportHeli"'), "transport landing contract missing");
assert(source.includes('apcMark: "m03Apc"'), "dynamic APC mark missing");
assert(source.includes('failArrivals: 4'), "four-arrival failure threshold missing");
assert(source.includes("m03RankContract:"), "two-route S-rank contract missing");
assert(!source.includes('"mig29"'), "MiG-29 must not appear in M03");
assert(!source.includes('"mig23"'), "MiG-23 must not appear in M03");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-m03-check-"));
const modulePath = path.join(tempDir, "mission_sera_m03.mjs");
fs.writeFileSync(modulePath, source, "utf8");

try {
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  assert(typeof register === "function", "default export is not register(ctx)");

  const stockM01 = { key: "m01", campaign: "usa", title: "FIRST CONTACT" };
  const stockM02 = { key: "m02", campaign: "usa", title: "SHATTERED MORNING" };
  const stockM03 = { key: "m-heli", campaign: "usa", world: "coastalPlain", title: "LOW GUARDIAN" };
  const stockM04 = { key: "m03", campaign: "usa", title: "OLD M04" };
  const MISSIONS = [stockM01, stockM02, stockM03, stockM04];

  const ctx = {
    tables: {
      MISSIONS,
      WORLD_PRESETS: { sarkPort: {} },
      AIRCRAFT_TYPES: { f4: {}, f16: {}, mig21: {}, su25: {} },
      ENEMY_AI_PROFILES: { mig21: {}, su25: {} },
      HELI_TYPES: { ka52: {}, armedTransportHeli: {} },
      GROUND_TYPES: { tank: {}, spaag: {} }
    },
    addMission(def) {
      assert(!MISSIONS.some((mission) => mission.key === def.key), `duplicate mission key ${def.key}`);
      const waves = Object.freeze(def.sequence.map((wave) => Object.freeze({ ...wave })));
      const normalized = Object.freeze({
        ...def,
        waves,
        waveCount: waves.filter((wave) => !wave.concurrent).length,
        totalTargets: waves
          .filter((wave) => wave.tgt !== false)
          .reduce((sum, wave) => sum + wave.types.length, 0),
        totalContacts: waves.reduce((sum, wave) => sum + wave.types.length, 0)
      });
      MISSIONS.push(normalized);
      return normalized;
    }
  };

  register(ctx);

  assert(MISSIONS.length === 4, `replacement changed mission count to ${MISSIONS.length}`);
  assert(MISSIONS[0] === stockM01 && MISSIONS[1] === stockM02 && MISSIONS[3] === stockM04, "M03 replacement changed campaign order");
  const mission = MISSIONS[2];
  assert(mission.key === "m-heli", `unexpected mission key ${mission.key}`);
  assert(mission.title === "LOW WATER", `unexpected title ${mission.title}`);
  assert(mission.world === "sarkPort", `unexpected world ${mission.world}`);
  assert(mission.parTime === 810, `unexpected parTime ${mission.parTime}`);
  assert(mission.waves.length === 8, `expected 8 sequence entries, got ${mission.waves.length}`);
  assert(mission.waveCount === 2, `expected 2 principal phases, got ${mission.waveCount}`);
  assert(mission.totalTargets === 9, `expected 9 red TGT contacts, got ${mission.totalTargets}`);
  assert(mission.totalContacts === 13, `expected 13 total contacts, got ${mission.totalContacts}`);

  const countType = (type) => mission.waves.flatMap((wave) => wave.types).filter((entry) => entry === type).length;
  assert(countType("ka52") === 4, `expected 4 Ka-52s, got ${countType("ka52")}`);
  assert(countType("armedTransportHeli") === 3, `expected 3 transports, got ${countType("armedTransportHeli")}`);
  assert(countType("su25") === 2, `expected 2 Su-25s, got ${countType("su25")}`);
  assert(countType("mig21") === 4, `expected 4 MiG-21s, got ${countType("mig21")}`);

  const white = mission.waves.filter((wave) => wave.tgt === false);
  assert(white.length === 2, `expected two white MiG-21 formations, got ${white.length}`);
  assert(white.every((wave) => wave.types.every((type) => type === "mig21")), "only MiG-21 may be a white fighter in M03");
  assert(white.every((wave) => wave.rankNeutral === true), "white MiG-21s must be rank-neutral");

  const delayedRed = mission.waves.filter((wave) => wave.concurrent && wave.tgt !== false && wave.delay > 0);
  assert(delayedRed.some((wave) => wave.types.includes("armedTransportHeli")), "transports do not overlap the Ka-52 phase");
  assert(delayedRed.some((wave) => wave.types.includes("ka52")), "second Ka-52 pair does not overlap the transports");

  assert(mission.friendlies?.wingmen?.length === 2, "expected CROWN and LARK wingmen");
  assert(mission.protectedFacilities?.length === 3, "expected command post and two port-defence sites");
  assert(mission.protectedFacilities.some((facility) => facility.id === "sark-command"), "port command facility missing");

  const landing = mission.landingContract;
  assert(landing.transportType === "armedTransportHeli", "wrong landing transport type");
  assert(landing.capY === 22 && landing.touchdownY === 34, "Sark Port fixed-height contract changed");
  assert(landing.apcType === "tank" && landing.apcPerTransport === 2, "transport must deploy two APC templates");
  assert(landing.failArrivals === 4, "four APC arrivals must fail M03");
  assert(Array.isArray(landing.lzs) && landing.lzs.length === 2, "expected two landing zones");
  assert(landing.lzs.every((lz) => lz.route.length >= 4 && lz.apcPath.length >= 4), "landing/APC routes are incomplete");

  const rank = mission.m03RankContract;
  assert(rank.commandFacilityId === "sark-command", "rank contract command id mismatch");
  assert(rank.commandHpForS === 70, "S route must preserve 70% command HP");
  assert(rank.defenseSurvivorsForS === 2, "defence-preservation route must retain both sites");
  assert(rank.zeroLandingAlternative === true, "zero-landing alternative route missing");

  const speakers = new Set([
    ...mission.introRadio.map((line) => line.speaker),
    ...mission.waves.flatMap((wave) => wave.radio || []).map((line) => line.speaker),
    mission.landingContract.landingRadio.speaker,
    mission.landingContract.arrivalWarningRadio.speaker
  ]);
  for (const speaker of ["meridian", "crown", "lark"]) {
    assert(speakers.has(speaker), `${speaker} has no authored M03 line`);
  }

  console.log("check_sera_m03_payload: PASS");
  console.log(`  TGT=${mission.totalTargets} contacts=${mission.totalContacts} red=Ka52x4/transportx3/Su25x2 white=MiG21x4`);
  console.log(`  LZ=${landing.lzs.length} APC max=${3 * landing.apcPerTransport} fail arrivals=${landing.failArrivals}`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
