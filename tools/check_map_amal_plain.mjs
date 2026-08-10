#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const payloadPath = path.join(root, "payloads", "map_amalPlain.payload.js");

function fail(message) {
  console.error(`check_map_amal_plain: FAIL - ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

assert(fs.existsSync(payloadPath), "payloads/map_amalPlain.payload.js is missing");
const source = fs.readFileSync(payloadPath, "utf8");
assert(!source.includes("\r"), "payload must be LF-only");
assert(source.includes('ctx.addWorldPreset("amalPlain"'), "amalPlain preset registration missing");
assert(source.includes('ctx.addWorldDecorator("amalPlainWorks"'), "amalPlain decorator registration missing");
assert(source.includes("radarFacility(2450, -1280"), "south radar facility anchor changed");
assert(source.includes("radarFacility(3350, 2080"), "north radar facility anchor changed");
assert(source.includes("normalSpeed: [0, 0]"), "dry ground plane is moving");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "amal-plain-check-"));
const modulePath = path.join(tempDir, "map_amalPlain.mjs");
fs.writeFileSync(modulePath, source, "utf8");

try {
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  assert(typeof register === "function", "default export is not register(ctx)");

  const desertBasin = {
    atmosphere: {}, ocean: {}, terrain: {}, mountains: {}, islands: {}, clouds: {}, decor: {}
  };
  const worlds = {};
  const decorators = {};
  register({
    tables: { WORLD_PRESETS: { desertBasin } },
    addWorldPreset(key, def) {
      assert(!worlds[key], `duplicate world ${key}`);
      worlds[key] = def;
      return def;
    },
    addWorldDecorator(key, def) {
      assert(!decorators[key], `duplicate decorator ${key}`);
      decorators[key] = def;
      return def;
    }
  });

  const world = worlds.amalPlain;
  assert(world, "amalPlain was not registered");
  assert(world.label === "AMAL PLAIN", `unexpected label ${world.label}`);
  assert(world.sceneryOrigin?.[0] === 0 && world.sceneryOrigin?.[1] === 0, "battlefield is not centred at the origin");
  assert(world.ocean?.textureProfile === "sand", "dry-plane texture profile missing");
  assert(JSON.stringify(world.ocean?.normalSpeed) === JSON.stringify([0, 0]), "dry-plane normal drift must be zero");
  assert(world.ocean?.metalness === 0, "farmland ground must not be metallic");
  assert(world.mountains?.plateau === null, "open plain unexpectedly has a central plateau");
  assert(world.decor?.city === null, "dense procedural city must remain disabled");
  assert(world.decor?.keepClear?.[0]?.r >= 7000, "combat corridor is not kept clear");

  const decorator = decorators.amalPlainWorks;
  assert(decorator?.worlds?.includes("amalPlain"), "decorator is not bound to amalPlain");
  assert(typeof decorator.build === "function", "decorator build function missing");

  console.log("check_map_amal_plain: PASS");
  console.log("  dawn dry plain, east-west military road and two authored radar facilities registered");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
