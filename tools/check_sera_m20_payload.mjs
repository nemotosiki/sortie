#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const mapSource = read("payloads", "map_migalCore.payload.js");
const missionSource = read("payloads", "mission_sera_m20.payload.js");
const assert = (condition, message) => { if (!condition) throw new Error(`check_sera_m20_payload: ${message}`); };
assert(!mapSource.includes("\r") && !missionSource.includes("\r"), "payloads must be LF-only");
for (const token of [
  'ctx.addWorldPreset("migalCoreDawn"', 'regionId: "migal_core"',
  'key: "sera-m20"', 'title: "THE GUARANTOR"', 'world: "migalCoreDawn"',
  'silenceDuration: 3', 'freeFlightDuration: 4',
  'ctx.addMission(mission, { after: "sera-m19" })'
]) assert(`${mapSource}\n${missionSource}`.includes(token), `missing source contract ${token}`);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-m20-check-"));
try {
  const mapPath = path.join(tempDir, "map_migalCore.mjs");
  const missionPath = path.join(tempDir, "mission_sera_m20.mjs");
  fs.writeFileSync(mapPath, mapSource, "utf8");
  fs.writeFileSync(missionPath, missionSource, "utf8");
  const { default: registerMap } = await import(`${pathToFileURL(mapPath).href}?v=${Date.now()}`);
  const WORLD_PRESETS = { migalOuterHigh: { label: "outer", atmosphere: {}, ocean: {}, mountains: {}, clouds: {}, decor: {} } };
  const decorators = [];
  registerMap({
    tables: { WORLD_PRESETS },
    addWorldPreset(key, def) { WORLD_PRESETS[key] = def; return def; },
    addWorldDecorator(key, def) { decorators.push({ key, def }); return def; }
  });
  const world = WORLD_PRESETS.migalCoreDawn;
  assert(world?.regionId === "migal_core" && world.missionAnchors?.councilRing,
    "Migal core geography/anchors changed");
  assert(decorators.some((entry) => entry.key === "migalCoreCapital"
      && entry.def.worlds.includes("migalCoreDawn")),
    "Migal central-ring decorator is missing");

  const { default: registerMission } = await import(`${pathToFileURL(missionPath).href}?v=${Date.now()}`);
  const MISSIONS = [{ key: "sera-m19", campaign: "sera", campaignOrder: 19 }];
  const typeKeys = ["f15c", "f15", "tu22m3", "jammer", "mig29", "su35", "s70", "su57"];
  const AIRCRAFT_TYPES = Object.fromEntries(typeKeys.map((key) => [key, {}]));
  const ENEMY_AI_PROFILES = Object.fromEntries(typeKeys.map((key) => [key, {}]));
  const ACE_PROFILES = { longbow: { theme: {}, radio: { inbound: "x", wingman: "x", engage: "x", down: "x" } } };
  let mission = null;
  let insertion = null;
  registerMission({
    tables: { MISSIONS, WORLD_PRESETS, AIRCRAFT_TYPES, ENEMY_AI_PROFILES, ACE_PROFILES },
    addAceProfile(id, def) { ACE_PROFILES[id] = def; return def; },
    addMission(def, options) { mission = def; insertion = options; MISSIONS.push(def); return def; }
  });
  assert(mission?.campaignOrder === 20 && insertion?.after === "sera-m19",
    "identity/insertion changed");
  assert(mission.friendlies.wingmen.some((entry) => entry.type === "f15c" && entry.label === "CROWN")
      && mission.friendlies.wingmen.some((entry) => entry.type === "f15" && entry.label.includes("LARK")),
    "CROWN F-15C / LARK F-15E fixed roster changed");
  const air = mission.sequence.flatMap((entry) => entry.types || []);
  assert(air.length === 24
      && air.filter((type) => type === "su57").length === 2
      && air.filter((type) => type === "mig29").length === 6
      && air.filter((type) => type === "su35").length === 6,
    "24-contact phase-one package or two-Su-57 cap changed");
  assert(mission.sequence.every((entry) => entry.tgt === true
      && entry.missionTag === mission.m20FinalContract.phaseOneTag),
    "phase-one contacts must all be conventional red TGTs");
  assert(mission.m20FinalContract.crown.type === "f15c"
      && mission.m20FinalContract.lark.type === "f15"
      && mission.m20FinalContract.crown.id !== mission.m20FinalContract.lark.id,
    "final CROWN/LARK identity contract changed");
  assert(!Object.hasOwn(ACE_PROFILES.m20Crown, "hp") && !Object.hasOwn(ACE_PROFILES.m20Lark, "hp"),
    "M20 pilots must not receive boss-only HP");
  console.log("check_sera_m20_payload: PASS");
  console.log("  Migal core dawn / 24 red TGTs / two Su-57 cap / ordinary F-15C-F-15E finale");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
