#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = path.join(root, "payloads", "map_naharStrait.payload.js");
const hostPath = path.join(root, "index.html");
const fail = (message) => {
  console.error(`check_map_nahar_strait: FAIL - ${message}`);
  process.exit(1);
};
const assert = (condition, message) => { if (!condition) fail(message); };

assert(fs.existsSync(payloadPath), "payloads/map_naharStrait.payload.js is missing");
const source = fs.readFileSync(payloadPath, "utf8");
const host = fs.readFileSync(hostPath, "utf8");
assert(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'ctx.addWorldPreset("naharStrait"',
  'ctx.addWorldDecorator("naharStraitWorks"',
  'worlds: ["naharStrait"]',
  'landingBreachLineX: -6500',
  'elemFleetEntry: Object.freeze([11500, 0])',
  'northEastCapEntry: Object.freeze([8500, 7000])',
  'southEastStrikeEntry: Object.freeze([9500, -7500])',
  'const northCoastProfile = Object.freeze([',
  'continentalSheets: Object.freeze([',
  'inlandSign: -1',
  'High central bridge',
  'naharShallows',
  'naharBeach',
  'Civil navigation buoys',
  'naharTownBuildings',
  'naharApartmentPrefabs',
  'naharOfficePrefabs',
  'naharResidentialPrefabRoofs',
  'naharBuildingFootings',
  'naharRoofEquipment',
  'naharTowerCrowns',
  'naharLandUseFields',
  'naharTreeBelts',
  'naharHarbourContainers',
  'naharStreetGrid',
  'central-boulevard-',
  'port-access-',
  'naharStreetLights',
  'makeBuildingTextures'
]) assert(source.includes(token), `missing ${token}`);
for (const token of [
  "Array.isArray(preset.continentalSheets)",
  "const coastPoints = Array.isArray(sheet.coastPoints)",
  "const inlandSign = sheet.inlandSign === -1 ? -1 : 1;",
  "const relief = sheet.relief;"
]) assert(host.includes(token), `host missing ${token}`);
assert(!/\bscene\.add\s*\(/.test(source), "decorator must not use scene.add");
assert(!/\.dispose\s*\(/.test(source), "decorator must not own disposal");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nahar-strait-check-"));
const modulePath = path.join(tempDir, "map_naharStrait.mjs");
fs.writeFileSync(modulePath, source, "utf8");

try {
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  const sunsetOcean = {
    atmosphere: {}, ocean: {}, terrain: {}, lights: {}, mountains: {}, clouds: {}, decor: {}
  };
  const worlds = { sunsetOcean };
  const decorators = {};
  register({
    tables: { WORLD_PRESETS: worlds },
    addWorldPreset(key, def) {
      assert(!worlds[key], `duplicate world ${key}`);
      worlds[key] = def;
      return def;
    },
    addWorldDecorator(key, def) {
      assert(!decorators[key], `duplicate decorator ${key}`);
      assert(def.worlds.every((world) => worlds[world]), `unknown world bound by ${key}`);
      decorators[key] = def;
      return def;
    }
  });

  const world = worlds.naharStrait;
  assert(world, "naharStrait was not registered");
  assert(world.label === "NAHAR STRAIT", `unexpected label ${world.label}`);
  assert(world.regionId === "nahar_strait", "regionId changed");
  assert(world.variant === "sunset_clear", "variant changed");
  assert(world.fog?.far >= 20000, "32 km strait visibility is too short");
  assert(world.sun?.position?.[0] < 0, "sun must remain west of the battle area");
  assert(world.mountains?.count === 0 && world.mountains?.plateau === null,
    "random terrain can obstruct the authored ship lane");
  assert(world.continentalSheets?.length === 2, "both collision-aware strait banks are required");
  const [northBank, southBank] = world.continentalSheets;
  assert(northBank.inlandSign === 1 && southBank.inlandSign === -1,
    "bank inland directions changed");
  assert(northBank.coastPoints?.length === 11 && southBank.coastPoints?.length === 11,
    "authored coastline profiles are incomplete");
  assert(northBank.coastPoints[5][1] === 800 && southBank.coastPoints[5][1] === -800,
    "1.6 km bridge throat changed");
  assert(northBank.relief?.start >= 10000 && southBank.relief?.start >= 10000,
    "back-country relief can enter mission infrastructure");
  assert(northBank.terrainHeightScale >= 190 && southBank.terrainHeightScale >= 190,
    "terrain biome normalization can make the low coastal plain all rock");
  assert(world.decor?.keepClear?.[0]?.r >= 17000, "generic decoration can enter the fleet route");
  assert(world.missionAnchors?.centralBridge?.[0] === 0 && world.missionAnchors?.centralBridge?.[1] === 0,
    "central bridge anchor moved");
  assert(world.missionAnchors?.alliedFleet?.[0] === -9000, "allied fleet anchor moved");
  assert(world.missionAnchors?.playerStart?.[0] === -7200 && world.missionAnchors?.playerStart?.[1] === -4200,
    "player start anchor moved");
  assert(world.missionAnchors?.landingBreachLineX === -6500, "breach line moved");
  assert(world.sectorIds?.includes("west_interdiction") && world.sectorIds?.includes("east_breakthrough"),
    "M04/M24 sector reuse contract missing");

  const decorator = decorators.naharStraitWorks;
  assert(decorator?.worlds?.length === 1 && decorator.worlds[0] === "naharStrait",
    "decorator binding changed");
  assert(typeof decorator?.build === "function", "decorator build function missing");

  console.log("check_map_nahar_strait: PASS");
  console.log("  32x20 km fleet corridor, textured towns/ports, bridge throat and M04/M24 anchors registered");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
