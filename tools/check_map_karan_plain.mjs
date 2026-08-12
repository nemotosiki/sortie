#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = path.join(root, "payloads", "map_karanPlain.payload.js");
const assert = (condition, message) => {
  if (!condition) throw new Error(`check_map_karan_plain: ${message}`);
};

assert(fs.existsSync(payloadPath), "payloads/map_karanPlain.payload.js is missing");
const source = fs.readFileSync(payloadPath, "utf8");
assert(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'ctx.addWorldPreset("karanPlain"',
  'ctx.addWorldDecorator("karanPlainWorks"',
  'name = "karanPlainWorks"',
  'normalSpeed: [0, 0]',
  '"karan-river"',
  '"karan-bridge-deck"',
  '"karan-military-road"',
  '"karan-evacuation-road"'
]) {
  assert(source.includes(token), `missing source contract ${token}`);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "karan-map-check-"));
const modulePath = path.join(tempDir, "map_karanPlain.mjs");
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

  const world = worlds.karanPlain;
  assert(world?.label === "KARAN PLAIN", "world label changed");
  assert(world?.regionId === "karan_plain", "region id changed");
  assert(world?.variant === "clear_afternoon", "weather variant changed");
  assert(world?.missionAnchors?.playerStart?.[1] === -7600, "player-start anchor changed");
  assert(world?.missionAnchors?.riverCrossing?.[1] === 1100, "river crossing anchor changed");
  assert(JSON.stringify(world?.ocean?.normalSpeed) === JSON.stringify([0, 0]), "dry ground is moving");
  assert(world?.mountains?.plateau === null, "open plain acquired a central plateau");
  assert(world?.decor?.city === null, "procedural city must remain disabled");
  assert(world?.decor?.keepClear?.[0]?.r >= 9000, "combat corridor is not kept clear");
  assert(decorators.karanPlainWorks?.worlds?.includes("karanPlain"), "decorator world binding missing");
  assert(typeof decorators.karanPlainWorks?.build === "function", "decorator build function missing");

  console.log("check_map_karan_plain: PASS");
  console.log("  crop grid / paired convoy roads / river bridge / villages / windbreak contract registered");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
