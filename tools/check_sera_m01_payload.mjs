#!/usr/bin/env node
// Static/runtime-contract check for payloads/mission_sera_m01.payload.js.
//
// This test does not require a browser. It imports a temporary .mjs copy of the
// payload, supplies the smallest compatible registry context, and proves that
// the stock first mission is replaced in place with the intended IFF counts.

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
assert(source.includes('friendlyBase:'), "mission has no bomber strike destination");
assert(source.includes('tgt: false'), "mission has no white optional contacts");

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
      AIRCRAFT_TYPES: { tu22m3: {}, mig29: {} },
      ENEMY_AI_PROFILES: { tu22m3: {}, mig29: {} }
    },
    addMission(def) {
      for (const required of ["key", "title", "sequence", "map"]) {
        assert(def[required] !== undefined, `replacement missing ${required}`);
      }
      assert(!MISSIONS.some((mission) => mission.key === def.key), `duplicate mission key ${def.key}`);
      const normalized = Object.freeze({ ...def, waves: def.sequence, waveCount: def.sequence.length });
      MISSIONS.push(normalized);
      return normalized;
    }
  };

  register(ctx);

  assert(MISSIONS.length === 1, `expected one mission after replacement, got ${MISSIONS.length}`);
  const mission = MISSIONS[0];
  assert(mission.key === "m01", `first mission key changed to ${mission.key}`);
  assert(mission.title === "FIRST CONTACT", `unexpected title ${mission.title}`);
  assert(mission.world === "renBay", `unexpected world ${mission.world}`);
  assert(mission.parTime === 660, `unexpected parTime ${mission.parTime}`);
  assert(mission.sequence.length === 6, `expected 6 sequence entries, got ${mission.sequence.length}`);

  const tgt = mission.sequence
    .filter((wave) => wave.tgt !== false)
    .reduce((sum, wave) => sum + wave.types.length, 0);
  const optional = mission.sequence
    .filter((wave) => wave.tgt === false)
    .reduce((sum, wave) => sum + wave.types.length, 0);
  const bombers = mission.sequence
    .flatMap((wave) => wave.types)
    .filter((type) => type === "tu22m3").length;
  const escorts = mission.sequence
    .flatMap((wave) => wave.types)
    .filter((type) => type === "mig29").length;

  assert(tgt === 6, `expected 6 red TGT contacts, got ${tgt}`);
  assert(optional === 10, `expected 10 white optional contacts, got ${optional}`);
  assert(bombers === 6, `expected 6 Tu-22M3 bombers, got ${bombers}`);
  assert(escorts === 10, `expected 10 MiG-29 escorts, got ${escorts}`);
  assert(mission.friendlyBase?.label === "REN BAY AIRPORT", "friendlyBase contract missing");
  assert(mission.battleRadius === 15000, `unexpected battleRadius ${mission.battleRadius}`);

  console.log("check_sera_m01_payload: PASS");
  console.log(`  mission=${mission.key} world=${mission.world} TGT=${tgt} WHITE=${optional} par=${mission.parTime}s`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
