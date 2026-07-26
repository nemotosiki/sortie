#!/usr/bin/env node
// registry_gate.mjs - "no registry entry or field may silently disappear".
//
//   node tools/registry_gate.mjs            # check, exit 1 on loss
//   node tools/registry_gate.mjs --update   # accept the current shape as truth
//
// See docs/spec_payload_registry.md §3.7. On 2026-07-26 seven hand-merged
// branches produced three cut-off accidents: adjacent inserts shared a closing
// brace, the naive union dropped the entry before them, and the result still
// parsed - `damage` / `life` / `launchDot` vanished off an enemy missile
// profile with no error anywhere. Nothing about that is visible in a diff
// review or a syntax check.
//
// So this loads index.html in a real browser, reads window.__REGISTRY_SNAPSHOT__
// (table -> entry id -> sorted list of key paths) and diffs it against
// tools/registry_snapshot.json. The rule is asymmetric on purpose:
//
//   added entry / added key path  -> fine, that is what a feature branch does
//   removed entry / removed key path -> FAIL, no exceptions
//
// A deliberate removal is recorded by re-running with --update. Because the
// check runs against the built page rather than against a git diff, it catches
// hand edits and pasted ChatGPT output too.

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(process.argv[1], "../..");
const SNAPSHOT = path.join(ROOT, "tools", "registry_snapshot.json");
// Port 0 = whatever the OS has free. A fixed port makes the gate fail whenever
// anything else on the machine happens to hold it, and this has to be runnable
// while the game itself is being served for play.
const PORT = Number(process.env.SORTIE_GATE_PORT || 0);

// Playwright is not a dependency of this repo - the game is one file on
// purpose, so there is no package.json to put it in. Try the normal resolution
// first, then fall back to the copy the globally installed @playwright/mcp
// carries. SORTIE_PLAYWRIGHT / SORTIE_CHROME override both.
const PLAYWRIGHT_CANDIDATES = [
  process.env.SORTIE_PLAYWRIGHT,
  "playwright",
  "C:/Users/user01/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright"
].filter(Boolean);

function loadPlaywright() {
  for (const candidate of PLAYWRIGHT_CANDIDATES) {
    try {
      return require(candidate);
    } catch { /* try the next one */ }
  }
  console.error("registry_gate: could not load playwright. Install it, or point");
  console.error("SORTIE_PLAYWRIGHT at an existing copy.");
  process.exit(1);
}

const CHROME = process.env.SORTIE_CHROME
  || "C:/Users/user01/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe";

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".css": "text/css", ".png": "image/png",
  ".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg"
};

async function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    const file = path.join(ROOT, url === "/" ? "index.html" : url);
    if (!path.resolve(file).startsWith(path.resolve(ROOT))) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end("not found"); return; }
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
  });
  await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
  return { server, port: server.address().port };
}

async function readSnapshot(query) {
  const { chromium } = loadPlaywright();
  const { server, port } = await serve();
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
  });
  try {
    const context = await browser.newContext();
    // Headless Chromium reports a phantom gamepad; the game polls it and the
    // page then flies itself. Disable it before any of the page runs.
    await context.addInitScript(() => { navigator.getGamepads = () => []; });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    await page.goto(`http://127.0.0.1:${port}/index.html${query || ""}`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__REGISTRY_SNAPSHOT__, null, { timeout: 45000 });
    const snapshot = await page.evaluate(() => window.__REGISTRY_SNAPSHOT__);
    return { snapshot, pageErrors };
  } finally {
    await browser.close();
    server.close();
  }
}

// Losses only. `AIRCRAFT_ORDER` is a plain array of ids, every other table is
// { id: [keyPath, ...] }.
function diffLosses(before, after) {
  const losses = [];
  for (const table of Object.keys(before)) {
    if (!(table in after)) { losses.push(`${table}: whole table missing`); continue; }
    const oldTable = before[table];
    const newTable = after[table];
    if (Array.isArray(oldTable)) {
      for (const id of oldTable) {
        if (!newTable.includes(id)) losses.push(`${table}: entry "${id}" removed`);
      }
      continue;
    }
    for (const id of Object.keys(oldTable)) {
      if (!(id in newTable)) { losses.push(`${table}.${id}: entry removed`); continue; }
      const kept = new Set(newTable[id]);
      for (const keyPath of oldTable[id]) {
        if (!kept.has(keyPath)) losses.push(`${table}.${id}: field "${keyPath}" removed`);
      }
    }
  }
  return losses;
}

function countGains(before, after) {
  let entries = 0;
  let fields = 0;
  for (const table of Object.keys(after)) {
    const oldTable = before[table];
    const newTable = after[table];
    if (Array.isArray(newTable)) {
      const had = new Set(oldTable || []);
      entries += newTable.filter((id) => !had.has(id)).length;
      continue;
    }
    for (const id of Object.keys(newTable)) {
      if (!oldTable || !(id in oldTable)) { entries++; continue; }
      const had = new Set(oldTable[id]);
      fields += newTable[id].filter((keyPath) => !had.has(keyPath)).length;
    }
  }
  return { entries, fields };
}

const update = process.argv.includes("--update");
const queryArg = process.argv.find((arg) => arg.startsWith("--payloads="));

// A gate that dies has not passed. readSnapshot throws when the page never
// reaches the point where it publishes the snapshot - which is precisely what a
// badly broken registry looks like - so that path has to exit non-zero instead
// of riding Node's default handling out to a success code. Verified by deleting
// a whole AIRCRAFT_TYPES entry: the page then threw on load, the wait timed out,
// and before this the gate reported exit 0.
let snapshot;
let pageErrors;
try {
  ({ snapshot, pageErrors } = await readSnapshot(queryArg ? `?${queryArg.slice(2)}` : ""));
} catch (error) {
  console.error("registry_gate: FAIL - could not read the registry snapshot.");
  console.error(`  ${error && error.message ? error.message : error}`);
  console.error("");
  console.error("The page never published window.__REGISTRY_SNAPSHOT__, so it threw");
  console.error("before finalizeRegistries() ran. Load index.html in a browser and");
  console.error("read the console to find out why.");
  process.exit(1);
}

if (pageErrors.length) {
  console.error("registry_gate: FAIL - the page threw while loading:");
  for (const error of pageErrors) console.error(`  ${error}`);
  process.exit(1);
}

if (!fs.existsSync(SNAPSHOT)) {
  fs.writeFileSync(SNAPSHOT, `${JSON.stringify(snapshot, null, 1)}\n`);
  console.log(`registry_gate: wrote initial snapshot to ${path.relative(ROOT, SNAPSHOT)}`);
  process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(SNAPSHOT, "utf8"));
const losses = diffLosses(baseline, snapshot);
const gains = countGains(baseline, snapshot);

if (update) {
  fs.writeFileSync(SNAPSHOT, `${JSON.stringify(snapshot, null, 1)}\n`);
  console.log(`registry_gate: snapshot updated (+${gains.entries} entries, +${gains.fields} fields, -${losses.length} losses accepted)`);
  process.exit(0);
}

if (losses.length) {
  console.error(`registry_gate: FAIL - ${losses.length} registry item(s) disappeared:`);
  for (const loss of losses.slice(0, 60)) console.error(`  ${loss}`);
  if (losses.length > 60) console.error(`  ... and ${losses.length - 60} more`);
  console.error("");
  console.error("This is the merge-truncation signature. Restore the missing entries;");
  console.error("only re-run with --update if the removal is intended.");
  process.exit(1);
}

const tableCount = Object.keys(snapshot).length;
console.log(`registry_gate: OK - ${tableCount} tables, no losses (+${gains.entries} entries, +${gains.fields} fields)`);
