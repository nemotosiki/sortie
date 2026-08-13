#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = path.join(root, "payloads", "map_sarkPortAsh.payload.js");
const fail = (message) => {
  console.error(`check_map_sark_port_ash: FAIL - ${message}`);
  process.exit(1);
};
const assert = (condition, message) => { if (!condition) fail(message); };

assert(fs.existsSync(payloadPath), "payloads/map_sarkPortAsh.payload.js is missing");
const source = fs.readFileSync(payloadPath, "utf8");
assert(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'ctx.addWorldPreset("sarkPortAsh"',
  'ctx.addWorldDecorator("sarkPortAshWorks"',
  'worlds: ["sarkPortAsh"]',
  'friendlyGroundStart: Object.freeze([900, 900])',
  'northWarehouseDefense: Object.freeze([-700, 600])',
  'westCraneDefense: Object.freeze([-1350, -250])',
  'commandVehicleStart: Object.freeze([300, -900])',
  'commandEscapeBridge: Object.freeze([650, -1200])',
  'playerStart: Object.freeze([-4200, -2000])',
  'airReinforcement: Object.freeze([4500, -2500])',
  'bridge(-80, "intact")',
  'bridge(260, "broken")',
  'bridge(580, "repaired")',
  'smokeColumn(-700, 600',
  'const route = ['
]) assert(source.includes(token), `missing ${token}`);
assert(!/\bscene\.add\s*\(/.test(source), "decorator must not use scene.add");
assert(!/\.dispose\s*\(/.test(source), "decorator must not own disposal");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sark-port-ash-check-"));
const modulePath = path.join(tempDir, "map_sarkPortAsh.mjs");
fs.writeFileSync(modulePath, source, "utf8");

try {
  const sarkPort = {
    label: "SARK PORT",
    sceneryOrigin: [0, -3000],
    atmosphere: { seed: 1 },
    ocean: { normalSeed: 2 },
    terrain: { seed: 3 },
    mountains: { plateau: { radius: [1700, 1700], height: [22, 22], topRadius: 0.92, at: [0, -3000] } },
    islands: { count: 6 },
    lights: {},
    clouds: {},
    decor: { seed: 0x8f3a11, city: { at: [0, -3000], cell: 96, street: 28 } }
  };
  const before = JSON.stringify(sarkPort);
  const worlds = { sarkPort };
  const decorators = {};
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
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

  assert(JSON.stringify(sarkPort) === before, "base sarkPort preset was mutated");
  const world = worlds.sarkPortAsh;
  assert(world, "sarkPortAsh was not registered");
  assert(world.label === "PORT OF ASH", `unexpected label ${world.label}`);
  assert(world.regionId === "sark_port", "regionId changed");
  assert(world.variant === "dawn_smoke_damage", "variant changed");
  assert(world.sceneryOrigin === sarkPort.sceneryOrigin, "scenery origin must be inherited exactly");
  assert(world.terrain === sarkPort.terrain, "terrain geography must be inherited exactly");
  assert(world.mountains === sarkPort.mountains, "plateau geography must be inherited exactly");
  assert(world.islands === sarkPort.islands, "island geography must be inherited exactly");
  assert(world.decor === sarkPort.decor, "city/road procedural geography must be inherited exactly");
  assert(world.mountains.plateau.at[0] === 0 && world.mountains.plateau.at[1] === -3000,
    "Sark Port plateau centre moved");
  assert(world.mountains.plateau.height[0] === 22, "Sark Port cap height moved");
  assert(world.missionAnchors?.commandVehicleStart?.[0] === 300 &&
    world.missionAnchors?.commandVehicleStart?.[1] === -900, "command vehicle anchor moved");
  assert(world.missionAnchors?.commandEscapeBridge?.[0] === 650 &&
    world.missionAnchors?.commandEscapeBridge?.[1] === -1200, "escape bridge anchor moved");

  const decorator = decorators.sarkPortAshWorks;
  assert(decorator?.worlds?.length === 1 && decorator.worlds[0] === "sarkPortAsh",
    "damage decorator must never bind to M03 sarkPort");
  assert(typeof decorator?.build === "function", "damage decorator build function missing");

  console.log("check_map_sark_port_ash: PASS");
  console.log("  Sark Port geography inherited unchanged; damaged cranes, bridges, smoke and M05 route registered separately");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
