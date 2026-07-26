#!/usr/bin/env node
// inline_payload.mjs - splice a payload module into index.html's payload block.
//
//   node tools/inline_payload.mjs payloads/russia_m01.payload.js
//   node tools/inline_payload.mjs payloads/*.payload.js --dry-run
//
// See docs/spec_payload_registry.md. A payload is an ES module whose default
// export is `function register(ctx) { ... }`. This tool lifts that function's
// SOURCE TEXT - not a re-serialisation of it - and inserts
//
//   applyPayload(function register(ctx) { ... }, "<name>"); // @payload:<name>
//
// immediately before the `// ==== @PAYLOADS:END ====` marker in index.html.
// Text-level insertion is the point: the long design comments authors write
// inside a mission definition survive verbatim, which they would not if the
// payload were imported and its objects re-emitted as JSON.
//
// Re-inserting a name that is already spliced is refused (Hygen's `skip_if`
// idea) so that re-running the tool cannot produce two copies of one mission.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import os from "node:os";

const INDEX = path.resolve(process.argv[1], "../../index.html");
const BEGIN = "// ==== @PAYLOADS:BEGIN ====";
const END = "// ==== @PAYLOADS:END ====";

function fail(message) {
  console.error(`inline_payload: ${message}`);
  process.exit(1);
}

// The exported register function, as text. Two authored forms are accepted:
//   export default function register(ctx) { ... }
//   export default (ctx) => { ... }
// Both are found by locating `export default` and then walking the source with
// a brace/paren/bracket counter that skips strings, template literals, comments
// and regex-free content, so a `}` inside a briefing string does not end it.
function extractRegisterSource(source, file) {
  const marker = /^[ \t]*export[ \t]+default[ \t]+/m.exec(source);
  if (!marker) fail(`${file}: no \`export default\` found`);
  const start = marker.index + marker[0].length;
  const end = scanExpression(source, start, file);
  return source.slice(start, end).trim().replace(/;$/, "");
}

// Returns the index just past the end of the expression starting at `from`.
function scanExpression(source, from, file) {
  let depth = 0;
  let i = from;
  let seenBody = false;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === "/" && next === "/") { i = source.indexOf("\n", i); if (i < 0) break; continue; }
    if (ch === "/" && next === "*") { const at = source.indexOf("*/", i + 2); if (at < 0) fail(`${file}: unterminated block comment`); i = at + 2; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { i = skipString(source, i, ch, file); continue; }
    if (ch === "(" || ch === "[" || ch === "{") { depth++; if (ch === "{") seenBody = true; i++; continue; }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      i++;
      if (depth === 0 && seenBody) return i;
      if (depth < 0) fail(`${file}: unbalanced brackets before end of default export`);
      continue;
    }
    i++;
  }
  fail(`${file}: could not find the end of the default export`);
  return -1;
}

function skipString(source, at, quote, file) {
  let i = at + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\") { i += 2; continue; }
    if (quote === "`" && ch === "$" && source[i + 1] === "{") {
      // Template substitution: recurse through the braces so a `}` inside it
      // is not mistaken for the end of the string.
      let depth = 1;
      i += 2;
      while (i < source.length && depth > 0) {
        const c = source[i];
        if (c === "{") depth++;
        else if (c === "}") depth--;
        else if (c === '"' || c === "'" || c === "`") { i = skipString(source, i, c, file); continue; }
        i++;
      }
      continue;
    }
    if (ch === quote) return i + 1;
    i++;
  }
  fail(`${file}: unterminated string literal`);
  return -1;
}

// The module script's body, for the post-splice syntax check. `new vm.Script()`
// cannot parse ESM, so this writes a .mjs and shells out to `node --check`.
function checkSyntax(html) {
  const open = html.indexOf('<script type="module">');
  if (open < 0) fail("index.html has no <script type=\"module\"> block");
  const bodyStart = html.indexOf(">", open) + 1;
  const body = html.slice(bodyStart, html.indexOf("</script>", bodyStart));
  const tmp = path.join(os.tmpdir(), `inline_payload_check_${process.pid}.mjs`);
  fs.writeFileSync(tmp, body);
  try {
    execFileSync(process.execPath, ["--check", tmp], { stdio: "pipe" });
    return null;
  } catch (error) {
    return String(error.stderr || error.message);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const files = args.filter((arg) => !arg.startsWith("--"));
if (!files.length) fail("usage: node tools/inline_payload.mjs <payload.js> [...] [--dry-run]");

let html = fs.readFileSync(INDEX, "utf8");
if (html.includes("\r")) fail("index.html contains CR bytes; the working copy must be LF-only");
if (!html.includes(BEGIN) || !html.includes(END)) fail("index.html has no @PAYLOADS:BEGIN/END markers");

const inserted = [];
for (const file of files) {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) fail(`${file}: no such file`);
  const name = path.basename(abs).replace(/\.(payload\.)?m?js$/, "");
  const tag = `// @payload:${name}`;
  if (html.includes(tag)) fail(`${name} is already spliced into index.html (marker "${tag}"); nothing was written`);

  const source = fs.readFileSync(abs, "utf8").replace(/\r\n/g, "\n");
  const register = extractRegisterSource(source, file);

  // Re-indented to sit level with the rest of the module body, so the file
  // stays readable and future diffs stay small.
  const block = register
    .split("\n")
    .map((line) => (line.trim() ? `      ${line}` : ""))
    .join("\n");

  const snippet = `    applyPayload(\n${block},\n      ${JSON.stringify(name)}\n    ); ${tag}\n`;

  const at = html.indexOf(`    ${END}`);
  if (at < 0) fail("the @PAYLOADS:END marker is not at the expected indentation");
  html = html.slice(0, at) + snippet + html.slice(at);
  inserted.push(name);
}

const syntaxError = checkSyntax(html);
if (syntaxError) fail(`the spliced result does not parse; index.html was NOT written.\n${syntaxError}`);
if (html.includes("\r")) fail("splice introduced CR bytes; index.html was NOT written");

if (dryRun) {
  console.log(`inline_payload: --dry-run, would splice ${inserted.join(", ")} (syntax OK)`);
} else {
  fs.writeFileSync(INDEX, html);
  console.log(`inline_payload: spliced ${inserted.join(", ")} into index.html (syntax OK)`);
}
console.log("inline_payload: now run `node tools/registry_gate.mjs --update` once the addition is reviewed.");
