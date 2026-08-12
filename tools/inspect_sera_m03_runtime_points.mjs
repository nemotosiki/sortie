#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) return null;
  const open = source.indexOf("{", start + marker.length);
  let depth = 0;
  let mode = "code";
  let quote = "";
  let escaped = false;
  let templateExprDepth = 0;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (mode === "lineComment") { if (ch === "\n") mode = "code"; continue; }
    if (mode === "blockComment") { if (ch === "*" && next === "/") { mode = "code"; i += 1; } continue; }
    if (mode === "string") {
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === quote) { mode = "code"; quote = ""; }
      continue;
    }
    if (mode === "template") {
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === "`" && templateExprDepth === 0) { mode = "code"; continue; }
      if (ch === "$" && next === "{") { templateExprDepth += 1; i += 1; continue; }
      if (templateExprDepth > 0) {
        if (ch === "{") templateExprDepth += 1;
        else if (ch === "}") templateExprDepth -= 1;
      }
      continue;
    }
    if (ch === "/" && next === "/") { mode = "lineComment"; i += 1; continue; }
    if (ch === "/" && next === "*") { mode = "blockComment"; i += 1; continue; }
    if (ch === "'" || ch === '"') { mode = "string"; quote = ch; continue; }
    if (ch === "`") { mode = "template"; templateExprDepth = 0; continue; }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`[sera-m03-runtime-points] unterminated ${name}`);
}

for (const name of [
  "normalizeWaveEntry",
  "deployWave",
  "spawnWave",
  "spawnEnemy",
  "spawnHeli",
  "updateHeli",
  "updateGroundUnit",
  "damageProtectedFacility",
  "updateMission",
  "saveCheckpoint",
  "restartFromCheckpoint",
  "computeMissionRank",
  "recordMissionResult",
  "syncGameHook"
]) {
  const body = extractFunction(name);
  console.log(`\n===== ${name}${body ? ` (${body.length} chars)` : " NOT FOUND"} =====\n`);
  if (body) console.log(body);
}
