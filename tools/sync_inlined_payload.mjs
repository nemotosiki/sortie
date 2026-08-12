#!/usr/bin/env node
// Keep an already inlined payload block in index.html synchronized with its
// payload source. Unlike inline_payload.mjs, this tool replaces an existing
// @payload:<name> block and refuses to insert or delete registrations.
//
// Usage:
//   node tools/sync_inlined_payload.mjs payloads/mission_sera_m01.payload.js
//   node tools/sync_inlined_payload.mjs payloads/*.payload.js --check
//
// --check exits non-zero when index.html is stale and never writes.
// --dry-run validates and reports the replacement without writing.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const INDEX = path.resolve(process.argv[1], "../../index.html");
const APPLY_PREFIX = "    applyPayload(\n";

function fail(message) {
  console.error(`sync_inlined_payload: ${message}`);
  process.exit(1);
}

function skipString(source, at, quote, file) {
  let i = at + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\") { i += 2; continue; }
    if (quote === "`" && ch === "$" && source[i + 1] === "{") {
      let depth = 1;
      i += 2;
      while (i < source.length && depth > 0) {
        const c = source[i];
        if (c === "{") depth += 1;
        else if (c === "}") depth -= 1;
        else if (c === '"' || c === "'" || c === "`") {
          i = skipString(source, i, c, file);
          continue;
        }
        i += 1;
      }
      continue;
    }
    if (ch === quote) return i + 1;
    i += 1;
  }
  fail(`${file}: unterminated string literal`);
  return -1;
}

function scanExpression(source, from, file) {
  let depth = 0;
  let i = from;
  let seenBody = false;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === "/" && next === "/") {
      i = source.indexOf("\n", i);
      if (i < 0) break;
      continue;
    }
    if (ch === "/" && next === "*") {
      const at = source.indexOf("*/", i + 2);
      if (at < 0) fail(`${file}: unterminated block comment`);
      i = at + 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(source, i, ch, file);
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth += 1;
      if (ch === "{") seenBody = true;
      i += 1;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth -= 1;
      i += 1;
      if (depth === 0 && seenBody) return i;
      if (depth < 0) fail(`${file}: unbalanced brackets before end of default export`);
      continue;
    }
    i += 1;
  }
  fail(`${file}: could not find the end of the default export`);
  return -1;
}

function extractRegisterSource(source, file) {
  const marker = /^[ \t]*export[ \t]+default[ \t]+/m.exec(source);
  if (!marker) fail(`${file}: no \`export default\` found`);
  const start = marker.index + marker[0].length;
  const end = scanExpression(source, start, file);
  return source.slice(start, end).trim().replace(/;$/, "");
}

function checkSyntax(html) {
  const open = html.indexOf('<script type="module">');
  if (open < 0) fail('index.html has no <script type="module"> block');
  const bodyStart = html.indexOf(">", open) + 1;
  const bodyEnd = html.indexOf("</script>", bodyStart);
  if (bodyEnd < 0) fail("index.html module script is not closed");
  const tmp = path.join(os.tmpdir(), `sync_inlined_payload_${process.pid}.mjs`);
  fs.writeFileSync(tmp, html.slice(bodyStart, bodyEnd));
  try {
    execFileSync(process.execPath, ["--check", tmp], { stdio: "pipe" });
  } catch (error) {
    fail(`synchronized module does not parse:\n${String(error.stderr || error.message)}`);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function payloadName(file) {
  return path.basename(file).replace(/\.(payload\.)?m?js$/, "");
}

function formatBlock(register, name) {
  const body = register
    .split("\n")
    .map((line) => (line.trim() ? `      ${line}` : ""))
    .join("\n");
  return `    applyPayload(\n${body},\n      ${JSON.stringify(name)}\n    ); // @payload:${name}\n`;
}

const args = process.argv.slice(2);
const check = args.includes("--check");
const dryRun = args.includes("--dry-run");
const files = args.filter((arg) => !arg.startsWith("--"));
if (files.length === 0) {
  fail("usage: node tools/sync_inlined_payload.mjs <payload.js> [...] [--check|--dry-run]");
}
if (check && dryRun) fail("use only one of --check or --dry-run");

let html = fs.readFileSync(INDEX, "utf8");
if (html.includes("\r")) fail("index.html contains CR bytes; LF-only is required");
let changed = false;
const stale = [];

for (const file of files) {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) fail(`${file}: no such file`);
  const name = payloadName(abs);
  const marker = `// @payload:${name}`;
  const markerHits = html.split("\n").filter((line) => line.trimEnd().endsWith(marker));
  if (markerHits.length !== 1) {
    fail(`${name}: expected exactly one inlined marker, found ${markerHits.length}`);
  }

  const markerAt = html.indexOf(marker);
  const blockStart = html.lastIndexOf(APPLY_PREFIX, markerAt);
  if (blockStart < 0) fail(`${name}: could not locate the owning applyPayload block`);
  const lineEnd = html.indexOf("\n", markerAt);
  if (lineEnd < 0) fail(`${name}: marker line is not newline terminated`);
  const blockEnd = lineEnd + 1;

  const source = fs.readFileSync(abs, "utf8").replace(/\r\n/g, "\n");
  const expected = formatBlock(extractRegisterSource(source, file), name);
  const current = html.slice(blockStart, blockEnd);
  if (current === expected) continue;

  stale.push(name);
  changed = true;
  html = html.slice(0, blockStart) + expected + html.slice(blockEnd);
}

checkSyntax(html);

if (check) {
  if (stale.length > 0) {
    fail(`index.html is stale for: ${stale.join(", ")}`);
  }
  console.log(`sync_inlined_payload: ${files.length} payload block(s) are synchronized`);
  process.exit(0);
}

if (dryRun) {
  console.log(changed
    ? `sync_inlined_payload: would update ${stale.join(", ")} (syntax OK)`
    : `sync_inlined_payload: no changes for ${files.length} payload block(s) (syntax OK)`);
  process.exit(0);
}

if (changed) {
  fs.writeFileSync(INDEX, html);
  console.log(`sync_inlined_payload: updated ${stale.join(", ")} (syntax OK)`);
} else {
  console.log(`sync_inlined_payload: no changes for ${files.length} payload block(s)`);
}
