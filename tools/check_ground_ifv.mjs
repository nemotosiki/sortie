#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = path.join(root, "payloads", "ground_ifv.payload.js");
const source = fs.readFileSync(payloadPath, "utf8");
const fail = (message) => { throw new Error(`check_ground_ifv: ${message}`); };
const assert = (condition, message) => { if (!condition) fail(message); };

assert(!source.includes("\r"), "payload must be LF-only");
assert(source.includes('ctx.addGroundType("ifv"'), "IFV type registration missing");
assert(source.includes('ctx.addGroundModel("ifv"'), "IFV model registration missing");
assert(source.includes('role: "Infantry Fighting Vehicle"'), "IFV identity missing");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ifv-check-"));
const modulePath = path.join(tempDir, "ground_ifv.mjs");
fs.writeFileSync(modulePath, source, "utf8");
try {
  const tank = {
    key: "tank", surface: true, ground: true, label: "TANK", role: "Main Battle Tank",
    hp: 110, hitRadius: 18, crash: {}, hitBox: {}, smokeHeight: 3, aa: null,
    mobile: { speed: 15, turnRate: 0.48 }, radarColor: "#fff", tracerColor: 1, explosionColor: 2
  };
  let type = null;
  let model = null;
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  register({
    tables: { GROUND_TYPES: { tank } },
    addGroundType(key, def) { assert(key === "ifv", `unexpected type ${key}`); type = def; },
    addGroundModel(key, def) { assert(key === "ifv", `unexpected model ${key}`); model = def; }
  });
  assert(type?.hp === 82, `unexpected hp ${type?.hp}`);
  assert(type?.mobile?.speed === 19, `unexpected speed ${type?.mobile?.speed}`);
  assert(type?.aa === null, "IFV must not become an anti-air unit");
  assert(type?.hitBox?.z === 9 && type?.crash?.top === 3.1, "IFV dimensions changed");
  assert(typeof model?.build === "function", "IFV model builder missing");
  console.log("check_ground_ifv: PASS");
  console.log("  light tracked IFV type and distinct troop-carrier model registered");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
