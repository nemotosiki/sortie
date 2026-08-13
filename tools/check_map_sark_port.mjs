#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(ROOT, "payloads/map_sarkPort.payload.js"), "utf8");
const requireText = (needle, label) => {
  if (!source.includes(needle)) throw new Error(`[sark-port] missing ${label}: ${needle}`);
};

for (const [needle, label] of [
  ['addWorldPreset("sarkPort"', "world preset"],
  ['addWorldDecorator("sarkPortWorks"', "world decorator"],
  ['worlds: ["sarkPort"]', "decorator world binding"],
  ['sceneryOrigin: [0, -3000]', "mission origin"],
  ['plateau: { radius: [1700, 1700], height: [22, 22], topRadius: 0.92, at: [0, -3000]', "flat cap contract"],
  ['GANTRY', "gantry crane landmark"],
  ['CONTAINER', "container-yard landmark"],
  ['CANAL', "canal landmark"],
  ['BRIDGE', "bridge landmark"]
]) requireText(needle, label);

if (!source.includes("surfaceHeightAt") || !source.includes("20.24") || !source.includes("y = 22")) {
  throw new Error("[sark-port] missing documented cap-height/sampler contract");
}

const authoredAnchor = (x, z) => Math.hypot(x, z) <= 1700 * 1.2;
const anchors = {
  command: [-650, 350],
  warehouse: [-850, 600],
  lzA: [-300, -1250],
  lzB: [500, -1100]
};
for (const [name, [x, z]] of Object.entries(anchors)) {
  if (!authoredAnchor(x, z)) throw new Error(`[sark-port] ${name} anchor is outside authored cap envelope`);
}

console.log("[sark-port] PASS", JSON.stringify({ world: "sarkPort", decorator: "sarkPortWorks", capY: 22, origin: [0, -3000], anchors }, null, 2));
