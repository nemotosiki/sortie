#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = path.join(root, "payloads", "mission_sera_m10.payload.js");
const assert = (condition, message) => {
  if (!condition) throw new Error(`check_sera_m10_payload: ${message}`);
};

assert(fs.existsSync(payloadPath), "payloads/mission_sera_m10.payload.js is missing");
const source = fs.readFileSync(payloadPath, "utf8");
assert(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'key: "sera-m10"', 'title: "LAST TRAIN"', 'world: "norIndustrialDusk"',
  'ctx.addGroundType("trainPower"', 'ctx.addGroundType("railBridgeControl"',
  'mark: "m10Precision"', 'mark: "m10Bridge"', 'routes: Object.freeze({ bridge: "bridge", precision: "precision" })'
]) {
  assert(source.includes(token), `missing source contract ${token}`);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-m10-check-"));
const modulePath = path.join(tempDir, "mission_sera_m10.mjs");
fs.writeFileSync(modulePath, source, "utf8");

try {
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  const railRoute = [[-5200, -4200], [-1000, -800], [1200, 1600], [4750, 4320]];
  const MISSIONS = [{ key: "sera-m09", campaign: "sera", campaignOrder: 9 }];
  const addedTypes = new Map();
  const addedModels = new Map();
  let added = null;
  let insertion = null;
  register({
    tables: {
      MISSIONS,
      WORLD_PRESETS: { norIndustrialDusk: { missionAnchors: { railRoute } } },
      AIRCRAFT_TYPES: { fa18: {}, su34: {}, mig29: {} },
      ENEMY_AI_PROFILES: { su34: {}, mig29: {} },
      GROUND_TYPES: {
        trainLoco: { hp: 196 }, trainFlak: { hp: 98 },
        trainCar: { hp: 98, mobile: {} }, spaag: { hp: 98 }
      }
    },
    addGroundType(key, def) {
      assert(!addedTypes.has(key), `duplicate ground type ${key}`);
      addedTypes.set(key, def);
    },
    addGroundModel(key, def) {
      assert(!addedModels.has(key), `duplicate ground model ${key}`);
      assert(typeof def?.build === "function", `${key} model has no build()`);
      addedModels.set(key, def);
    },
    addMission(def, options) {
      assert(!MISSIONS.some((mission) => mission.key === def.key), `duplicate key ${def.key}`);
      const totalTargets = def.sequence.filter((wave) => wave.tgt !== false)
        .reduce((sum, wave) => sum + wave.types.length, 0)
        + def.groundUnits.filter((unit) => unit.tgt !== false).length;
      const totalContacts = def.sequence.reduce((sum, wave) => sum + wave.types.length, 0)
        + def.groundUnits.length;
      added = { ...def, totalTargets, totalContacts };
      insertion = options;
      MISSIONS.push(added);
      return added;
    }
  });

  assert(added?.key === "sera-m10" && added?.campaignOrder === 10, "mission identity changed");
  assert(insertion?.after === "sera-m09", "M10 is not inserted after M09");
  assert(added?.railLine === railRoute, "mission does not use the map-authored rail route");
  assert(added?.totalTargets === 3, `expected 3 red TGT, got ${added?.totalTargets}`);
  assert(added?.totalContacts === 17, `expected 17 contacts, got ${added?.totalContacts}`);
  assert(addedTypes.has("trainPower") && addedModels.has("trainPower"), "power car extension missing");
  assert(addedTypes.has("railBridgeControl") && addedModels.has("railBridgeControl"), "bridge extension missing");
  assert(addedTypes.get("railBridgeControl").mobile === null, "bridge target must remain static");

  const train = added.groundUnits.filter((unit) => unit.id >= 201 && unit.id <= 208);
  const red = train.filter((unit) => unit.tgt !== false);
  const white = train.filter((unit) => unit.tgt === false);
  assert(train.length === 8 && train.every((unit) => unit.path === railRoute && unit.speed === 18),
    "eight-car coupled route contract changed");
  assert(red.length === 3 && red.every((unit) => unit.mark === "m10Precision"),
    "precision train targets changed");
  assert(white.length === 5 && white.every((unit) => unit.rankNeutral),
    "white cargo contact contract changed");
  assert(train.filter((unit) => unit.type === "trainPower").length === 2, "power-car count changed");
  assert(train.filter((unit) => unit.mark === "m10Material").length === 3, "material-car count changed");

  const bridge = added.groundUnits.find((unit) => unit.mark === "m10Bridge");
  assert(bridge?.type === "railBridgeControl" && bridge.tgt === false && bridge.rankNeutral,
    "bridge must be a selectable white strategic contact");
  const bridgeDefence = added.groundUnits.filter((unit) => unit.mark === "m10BridgeDefence");
  assert(bridgeDefence.length === 2 && bridgeDefence.every((unit) => unit.tgt === false && unit.rankNeutral),
    "bridge SPAAG contract changed");

  const air = added.sequence.flatMap((wave) => wave.types);
  assert(air.filter((type) => type === "su34").length === 4, "Su-34 count changed");
  assert(air.filter((type) => type === "mig29").length === 2, "MiG-29A count changed");
  assert(!air.includes("su35") && !air.includes("su57"), "late-game fighter leaked into M10");
  assert(added.sequence.every((wave) => wave.tgt === false && wave.rankNeutral && wave.concurrent),
    "air pressure must remain optional, rank-neutral, and concurrently scheduled");
  assert(added.sequence[1].delay === 65 && added.sequence[2].delay === 135,
    "delayed reinforcement timing changed");
  assert(added.m10Contract?.precision?.required === 3, "precision objective count changed");
  assert(added.m10Contract?.bridge?.decoratorNames?.includes("nor-rail-bridge-deck")
    && added.m10Contract.bridge.decoratorNames.includes("nor-rail-bridge-rails"),
  "bridge visual names no longer match the Nor decorator");
  assert(added.m10Contract?.rank?.bridgeRouteCap === "A", "bridge-route consequence changed");

  console.log("check_sera_m10_payload: PASS");
  console.log("  red=train3 white=cargo5/bridge1/SPAAG2/air6 routes=precision|bridge");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
