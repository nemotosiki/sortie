#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = path.join(root, "index.html");
const inlineTool = path.join(root, "tools", "inline_payload.mjs");

const payloads = [
  "payloads/ground_heli_pack.payload.js",
  "payloads/map_sarkPort.payload.js",
  "payloads/mission_sera_m03.payload.js"
];

function payloadName(relativePath) {
  return path.basename(relativePath).replace(/\.(payload\.)?m?js$/, "");
}

let html = fs.readFileSync(indexPath, "utf8");
const inserted = [];
const preserved = [];

for (const relativePath of payloads) {
  const name = payloadName(relativePath);
  const marker = `// @payload:${name}`;
  const alreadyPresent = html.split("\n").some((line) => line.trimEnd().endsWith(marker));
  if (alreadyPresent) {
    preserved.push(name);
    continue;
  }

  execFileSync(process.execPath, [inlineTool, path.join(root, relativePath)], {
    cwd: root,
    stdio: "inherit"
  });
  inserted.push(name);
  html = fs.readFileSync(indexPath, "utf8");
}

console.log(`[inline-sera-m03] inserted=${inserted.join(",") || "none"}`);
console.log(`[inline-sera-m03] preserved=${preserved.join(",") || "none"}`);
