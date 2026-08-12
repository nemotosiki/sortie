#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = path.join(root, "payloads", "map_ormBasin.payload.js");
const source = fs.readFileSync(payloadPath, "utf8");
const fail = (message) => { throw new Error(`check_map_orm_basin: ${message}`); };
const assert = (condition, message) => { if (!condition) fail(message); };

assert(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'ctx.addWorldPreset("ormBasinNight"',
  'ctx.addWorldDecorator("ormBasinNightWorks"',
  'regionId: "orm_basin"',
  'variant: "night_moonlit"',
  'settlementLights.name = "ormBasinSettlementLights"',
  'runwayLights.name = "ormBasinRunwayLights"'
]) assert(source.includes(token), `missing ${token}`);
assert(!/\bscene\.add\s*\(/.test(source), "decorator must not bypass addRoot");
assert(!/\bdispose\s*\(/.test(source), "decorator must not own disposal");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "orm-basin-check-"));
const modulePath = path.join(tempDir, "map_ormBasin.mjs");
fs.writeFileSync(modulePath, source, "utf8");

try {
  let preset = null;
  let decorator = null;
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  register({
    tables: {
      WORLD_PRESETS: {
        desertBasin: {
          atmosphere: {}, ocean: {}, terrain: {}, lights: {}, mountains: {},
          clouds: {}, decor: {}, islands: {}
        }
      }
    },
    addWorldPreset(key, def) {
      assert(key === "ormBasinNight", `unexpected preset key ${key}`);
      preset = def;
      return def;
    },
    addWorldDecorator(id, def) {
      assert(id === "ormBasinNightWorks", `unexpected decorator id ${id}`);
      decorator = def;
      return def;
    }
  });

  assert(preset && decorator, "preset or decorator did not register");
  assert(preset.regionId === "orm_basin" && preset.variant === "night_moonlit",
    "world identity changed");
  assert(preset.sun === null && preset.moon && preset.stars?.count >= 400,
    "moonlit night contract is incomplete");
  assert(preset.fog?.far >= 12000 && preset.fog?.far <= 14000,
    `unexpected combat visibility ${preset.fog?.far}`);
  assert(preset.mountains?.count >= 16 && preset.mountains?.distance?.[0] >= 5500,
    "basin mountain ring is incomplete");
  assert(preset.missionAnchors?.airfield?.length === 2
      && preset.missionAnchors?.fuelDistrict?.length === 2
      && preset.missionAnchors?.paymentRelay?.length === 2
      && preset.missionAnchors?.settlement?.length === 2,
    "mission landmarks are incomplete");
  assert(Array.isArray(decorator.worlds) && decorator.worlds.length === 1
      && decorator.worlds[0] === "ormBasinNight",
    "decorator world scope changed");
  assert(typeof decorator.build === "function", "decorator build function is missing");

  console.log("check_map_orm_basin: PASS");
  console.log("  moonlit basin + night airfield + fuel works + payment relay + blackout settlement");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
