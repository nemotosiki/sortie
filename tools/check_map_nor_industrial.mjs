#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = path.join(root, "payloads", "map_norIndustrial.payload.js");
const assert = (condition, message) => {
  if (!condition) throw new Error(`check_map_nor_industrial: ${message}`);
};

assert(fs.existsSync(payloadPath), "map payload is missing");
const source = fs.readFileSync(payloadPath, "utf8");
assert(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'ctx.addWorldPreset("norIndustrialDusk"',
  'ctx.addWorldDecorator("norIndustrialWorks"',
  'regionId: "nor_industrial"',
  'variant: "industrial_dusk"',
  'normalSpeed: [0, 0]',
  'const railRoute = Object.freeze([',
  'bridgeTarget: Object.freeze([1210, 1660])',
  '"nor-river"',
  '"nor-rail-bridge-deck"',
  '"nor-freight-station"',
  '"nor-foundry"',
  '"nor-substation-yard"',
  '"nor-workers-road-west"',
  'previewSheets: Object.freeze({'
]) {
  assert(source.includes(token), `missing source contract ${token}`);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nor-map-check-"));
const modulePath = path.join(tempDir, "map_norIndustrial.mjs");
fs.writeFileSync(modulePath, source, "utf8");

try {
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  const desertBasin = {
    atmosphere: {}, ocean: {}, terrain: {}, mountains: {}, islands: {}, clouds: {}, decor: {}
  };
  const worlds = {};
  const decorators = {};
  register({
    tables: { WORLD_PRESETS: { desertBasin } },
    addWorldPreset(key, def) { worlds[key] = def; return def; },
    addWorldDecorator(key, def) { decorators[key] = def; return def; }
  });

  const world = worlds.norIndustrialDusk;
  assert(world?.label === "NOR INDUSTRIAL — DUSK", "world label changed");
  assert(world?.regionId === "nor_industrial", "region id changed");
  assert(world?.variant === "industrial_dusk", "variant changed");
  assert(world?.missionAnchors?.railRoute?.length === 11, "rail route must have eleven control points");
  assert(world?.missionAnchors?.playerStart?.[0] === -6100, "player-start anchor changed");
  assert(world?.missionAnchors?.riverCrossing?.[1] === 1580, "river crossing changed");
  assert(JSON.stringify(world?.ocean?.normalSpeed) === JSON.stringify([0, 0]), "dry industrial ground is moving");
  assert(world?.mountains?.plateau === null, "rail corridor acquired a central plateau");
  assert(world?.decor?.keepClear?.[0]?.r >= 9500, "combat corridor is not kept clear");
  assert(world?.previewSheets?.surfaceQa?.length === 4, "surface QA camera sheet changed");
  assert(decorators.norIndustrialWorks?.worlds?.includes("norIndustrialDusk"), "decorator binding missing");
  assert(typeof decorators.norIndustrialWorks?.build === "function", "decorator build function missing");

  const route = world.missionAnchors.railRoute;
  const routeLength = route.slice(1).reduce((sum, point, index) => (
    sum + Math.hypot(point[0] - route[index][0], point[1] - route[index][1])
  ), 0);
  assert(routeLength >= 12000 && routeLength <= 15000, `rail route length ${routeLength.toFixed(1)}m is outside contract`);

  console.log("check_map_nor_industrial: PASS");
  console.log(`  dusk industrial corridor / river bridge / freight yard / ${routeLength.toFixed(0)}m rail route registered`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
