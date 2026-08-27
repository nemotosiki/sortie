#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "payloads", "mission_sera_m17.payload.js"), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(`check_sera_m17_payload: ${message}`); };
assert(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'key: "sera-m17"', 'title: "THE LONG APPROACH"', 'world: "migalOuterHigh"',
  'helixTag: "arcaHelixM17"', 'lockMultiplierPerSupport: 0.55',
  'ctx.addAceProfile("helixForge"', 'ctx.addAceProfile("helixSwift"',
  'ctx.addMission(mission, { after: "sera-m16" })'
]) assert(source.includes(token), `missing source contract ${token}`);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-m17-check-"));
const modulePath = path.join(tempDir, "mission_sera_m17.mjs");
fs.writeFileSync(modulePath, source, "utf8");
try {
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  const MISSIONS = [{ key: "sera-m16", campaign: "sera", campaignOrder: 16 }];
  const anchors = {
    playerStart: [0, 11800], battleCenter: [0, -1800], cityEdge: [0, -14800],
    bomberNorth: [-3600, 15200], bomberSouth: [3800, 14600], awacsStation: [8900, 7200],
    jammerStation: [-9200, 6500], highCover: [7600, 10500], helixEntry: [-10500, -1200],
    helixExit: [9800, -13200], prototypeEntry: [0, 16800]
  };
  const aircraft = Object.fromEntries([
    "fa18", "f22", "uav", "tu95", "tu22m3", "awacs", "jammer", "mig31", "f3", "su57"
  ].map((key) => [key, {}]));
  const profiles = Object.fromEntries([
    "tu95", "tu22m3", "awacs", "jammer", "mig31", "f3", "su57"
  ].map((key) => [key, {}]));
  const aceTemplate = { theme: {}, radio: {} };
  let mission = null;
  let insertion = null;
  const aces = {};
  register({
    tables: {
      MISSIONS,
      WORLD_PRESETS: { migalOuterHigh: { missionAnchors: anchors } },
      AIRCRAFT_TYPES: aircraft,
      ENEMY_AI_PROFILES: profiles,
      ENEMY_MISSILE_PROFILES: { f3: {} },
      ACE_PROFILES: { longbow: aceTemplate }
    },
    addAceProfile(key, def) { aces[key] = def; return def; },
    addMission(def, options) { mission = def; insertion = options; MISSIONS.push(def); return def; }
  });
  assert(mission?.campaignOrder === 17 && insertion?.after === "sera-m16",
    "mission identity/insertion changed");
  const air = mission.sequence.flatMap((entry) => entry.types || []);
  assert(air.filter((type) => type === "tu95").length === 4
      && air.filter((type) => type === "tu22m3").length === 4
      && air.filter((type) => type === "mig31").length === 2
      && air.filter((type) => type === "su57").length === 1,
    "bomber/high-cover/prototype totals changed");
  const helix = mission.sequence.filter((entry) => entry.missionTag === "arcaHelixM17");
  assert(helix.length === 2 && helix.every((entry) => (
    entry.types.length === 1 && entry.types[0] === "f3" && entry.tgt === false && entry.rankNeutral === true
  )), "HELIX pair must remain separate optional rank-neutral F-3 contacts");
  assert(aces.helixForge?.callsign === "FORGE" && aces.helixSwift?.callsign === "SWIFT",
    "HELIX named profiles changed");
  console.log("check_sera_m17_payload: PASS");
  console.log("  8 bombers + 2 red support / optional HELIX F-3 pair / MiG-31 x2 / one Su-57");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
