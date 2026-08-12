#!/usr/bin/env node
// Runtime-contract check for payloads/mission_sera_m01.payload.js.
//
// This imports a temporary .mjs copy of the payload, supplies the smallest
// compatible registry context, and proves that the canonical Sera mission is
// added under its own key without modifying the stock USA first mission.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const PAYLOAD = path.join(ROOT, "payloads", "mission_sera_m01.payload.js");

function fail(message) {
  console.error(`check_sera_m01_payload: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

if (!fs.existsSync(PAYLOAD)) fail(`missing ${path.relative(ROOT, PAYLOAD)}`);
const source = fs.readFileSync(PAYLOAD, "utf8");
assert(!source.includes("\r"), "payload must be LF-only");
assert(source.includes('world: "renBay"'), "mission does not select renBay");
assert(source.includes("friendlyBase:"), "mission has no bomber strike destination");
assert(source.includes("bomberBreach:"), "mission has no breach contract");
assert(source.includes("wingmen:"), "mission has no two-wingman roster");
assert(source.includes('"f15c"'), "canonical CROWN F-15C dependency is missing");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-m01-check-"));
const tempModule = path.join(tempDir, "mission_sera_m01.mjs");
fs.writeFileSync(tempModule, source, "utf8");

try {
  const moduleUrl = `${pathToFileURL(tempModule).href}?v=${Date.now()}`;
  const { default: register } = await import(moduleUrl);
  assert(typeof register === "function", "default export is not register(ctx)");

  const stockMission = {
    key: "m01",
    campaign: "usa",
    world: "archipelagoDay",
    title: "OLD FIRST CONTACT",
    sequence: [{ types: ["tu95", "tu95"] }],
    map: { x: 0.2, y: 0.2 },
    parTime: 180
  };

  const MISSIONS = [stockMission];
  const ctx = {
    tables: {
      MISSIONS,
      WORLD_PRESETS: { renBay: {} },
      AIRCRAFT_TYPES: { tu22m3: {}, mig29: {}, f16: {}, f15c: {} },
      ENEMY_AI_PROFILES: { tu22m3: {}, mig29: {} }
    },
    addMission(def) {
      for (const required of ["key", "title", "sequence", "map"]) {
        assert(def[required] !== undefined, `replacement missing ${required}`);
      }
      assert(!MISSIONS.some((mission) => mission.key === def.key), `duplicate mission key ${def.key}`);
      const normalized = Object.freeze({
        ...def,
        waves: def.sequence,
        waveCount: def.sequence.filter((wave) => !wave.concurrent).length
      });
      MISSIONS.push(normalized);
      return normalized;
    }
  };

  register(ctx);

  assert(MISSIONS.length === 2, `expected stock + Sera missions, got ${MISSIONS.length}`);
  assert(MISSIONS[0] === stockMission && MISSIONS[0].title === "OLD FIRST CONTACT",
    "stock USA M01 was modified or removed");
  const mission = MISSIONS.find((entry) => entry.key === "sera-m01");
  assert(mission, "namespaced Sera M01 was not registered");
  assert(mission.campaign === "sera", `unexpected campaign ${mission.campaign}`);
  assert(mission.campaignOrder === 1, `unexpected campaign order ${mission.campaignOrder}`);
  assert(mission.title === "FIRST CONTACT", `unexpected title ${mission.title}`);
  assert(mission.world === "renBay", `unexpected world ${mission.world}`);
  assert(mission.parTime === 660, `unexpected parTime ${mission.parTime}`);
  assert(mission.sequence.length === 7, `expected 7 sequence entries, got ${mission.sequence.length}`);
  assert(mission.waveCount === 4, `expected 4 principal phases, got ${mission.waveCount}`);

  const tgtWaves = mission.sequence.filter((wave) => wave.tgt !== false);
  const optionalWaves = mission.sequence.filter((wave) => wave.tgt === false);
  const tgt = tgtWaves.reduce((sum, wave) => sum + wave.types.length, 0);
  const optional = optionalWaves.reduce((sum, wave) => sum + wave.types.length, 0);
  const bombers = mission.sequence.flatMap((wave) => wave.types).filter((type) => type === "tu22m3").length;
  const escorts = mission.sequence.flatMap((wave) => wave.types).filter((type) => type === "mig29").length;

  assert(tgt === 6, `expected 6 red TGT contacts, got ${tgt}`);
  assert(optional === 10, `expected 10 white optional contacts, got ${optional}`);
  assert(bombers === 6, `expected 6 Tu-22M3 bombers, got ${bombers}`);
  assert(escorts === 10, `expected 10 MiG-29 contacts, got ${escorts}`);
  assert(optionalWaves.every((wave) => wave.rankNeutral === true), "white M01 contacts must be rank-neutral");

  const tutorial = mission.sequence[0];
  assert(tutorial.tgt === false, "tutorial contacts must be white/non-TGT");
  assert(tutorial.gate?.mode === "clearOrTimeout", "tutorial phase gate is missing");
  assert(tutorial.gate?.timeout === 75, `unexpected tutorial timeout ${tutorial.gate?.timeout}`);
  assert(Array.isArray(tutorial.at) && tutorial.at.length === 2, "tutorial has no authored approach point");

  assert(mission.friendlies?.wingmen?.length === 2, "expected CROWN and LARK wingmen");
  const crown = mission.friendlies.wingmen.find((wingman) => wingman.label === "ROOK 1 CROWN");
  const lark = mission.friendlies.wingmen.find((wingman) => wingman.label === "ROOK 3 LARK");
  assert(crown, "CROWN wingman missing");
  assert(lark, "LARK wingman missing");
  assert(crown.type === "f15c", `CROWN must fly f15c in M01, got ${crown.type}`);
  assert(lark.type === "f16", `LARK must fly f16 in M01, got ${lark.type}`);
  assert(crown.radioSpeaker === "crown", "CROWN radio identity missing");
  assert(lark.radioSpeaker === "lark", "LARK radio identity missing");
  assert(mission.friendlies.playerStart?.facing, "player start has no authored facing point");

  assert(mission.bomberBreach?.sCapAt === 1, "one-breach S cap missing");
  assert(mission.bomberBreach?.failAt === 2, "two-breach failure threshold missing");
  assert(mission.successRadio?.speaker === "meridian", "success is not owned by MERIDIAN");
  assert(mission.failureRadio?.speaker === "meridian", "failure is not owned by MERIDIAN");
  assert(mission.friendlyBase?.label === "REN BAY AIRPORT", "friendlyBase contract missing");
  assert(mission.battleRadius === 15000, `unexpected battleRadius ${mission.battleRadius}`);

  const speakerIds = new Set([
    ...mission.introRadio.map((line) => line.speaker),
    ...mission.sequence.flatMap((wave) => wave.radio || []).map((line) => line.speaker)
  ]);
  for (const speaker of ["meridian", "crown", "lark"]) {
    assert(speakerIds.has(speaker), `${speaker} has no authored M01 line`);
  }

  console.log("check_sera_m01_payload: PASS");
  console.log(`  stock=m01 mission=${mission.key} campaign=${mission.campaign} world=${mission.world} TGT=${tgt} WHITE=${optional} phases=${mission.waveCount}`);
  console.log(`  wingmen=CROWN:${crown.type} / LARK:${lark.type} breach=${mission.bomberBreach.sCapAt}/${mission.bomberBreach.failAt}`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
