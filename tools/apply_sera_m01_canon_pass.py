#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAYLOAD = ROOT / "payloads" / "mission_sera_m01.payload.js"
RUNTIME_CHECK = ROOT / "tools" / "check_sera_m01_payload.mjs"
BROWSER_CHECK = ROOT / "tools" / "check_sera_m01_browser.mjs"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def patch_payload() -> None:
    source = PAYLOAD.read_text(encoding="utf-8")
    source = replace_once(
        source,
        '  for (const type of ["tu22m3", "mig29", "f16"]) {',
        '  for (const type of ["tu22m3", "mig29", "f16", "f15c"]) {',
        "M01 aircraft dependency list",
    )
    source = replace_once(
        source,
        '          type: "f16",\n          label: "ROOK 1 CROWN",',
        '          type: "f15c",\n          label: "ROOK 1 CROWN",',
        "CROWN canonical F-15C assignment",
    )
    PAYLOAD.write_text(source, encoding="utf-8")


def patch_runtime_check() -> None:
    source = RUNTIME_CHECK.read_text(encoding="utf-8")
    source = replace_once(
        source,
        '      AIRCRAFT_TYPES: { tu22m3: {}, mig29: {}, f16: {} },',
        '      AIRCRAFT_TYPES: { tu22m3: {}, mig29: {}, f16: {}, f15c: {} },',
        "M01 test aircraft registry",
    )
    anchor = '''  assert(wingmanLabels.includes("ROOK 1 CROWN"), "CROWN wingman missing");
  assert(wingmanLabels.includes("ROOK 3 LARK"), "LARK wingman missing");
  assert(mission.friendlies.wingmen.some((wingman) => wingman.radioSpeaker === "crown"), "CROWN radio identity missing");'''
    replacement = '''  assert(wingmanLabels.includes("ROOK 1 CROWN"), "CROWN wingman missing");
  assert(wingmanLabels.includes("ROOK 3 LARK"), "LARK wingman missing");
  const crown = mission.friendlies.wingmen.find((wingman) => wingman.label === "ROOK 1 CROWN");
  const lark = mission.friendlies.wingmen.find((wingman) => wingman.label === "ROOK 3 LARK");
  assert(crown?.type === "f15c", `CROWN must fly F-15C/f15c, got ${crown?.type}`);
  assert(lark?.type === "f16", `LARK must fly F-16C/f16, got ${lark?.type}`);
  assert(mission.friendlies.wingmen.some((wingman) => wingman.radioSpeaker === "crown"), "CROWN radio identity missing");'''
    source = replace_once(source, anchor, replacement, "M01 canonical wingman assertions")
    source = replace_once(
        source,
        '  console.log(`  wingmen=${wingmanLabels.join(" / ")} breach=${mission.bomberBreach.sCapAt}/${mission.bomberBreach.failAt}`);',
        '  console.log(`  wingmen=${wingmanLabels.join(" / ")} aircraft=${crown.type}/${lark.type} breach=${mission.bomberBreach.sCapAt}/${mission.bomberBreach.failAt}`);',
        "M01 test summary",
    )
    RUNTIME_CHECK.write_text(source, encoding="utf-8")


def write_browser_check() -> None:
    BROWSER_CHECK.write_text(r'''#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(process.argv[1], "../..");
const portRequested = Number(process.env.SORTIE_M01_PORT || 0);
const payloadQuery = "payloads=payloads/map_renBay.payload.js,payloads/mission_sera_m01.payload.js";

const playwrightCandidates = [
  process.env.SORTIE_PLAYWRIGHT,
  "playwright",
  "C:/Users/user01/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright"
].filter(Boolean);

function loadPlaywright() {
  for (const candidate of playwrightCandidates) {
    try { return require(candidate); } catch { /* try next */ }
  }
  throw new Error("playwright not found; set SORTIE_PLAYWRIGHT or install playwright");
}

const chromePath = process.env.SORTIE_CHROME
  || "C:/Users/user01/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe";

const mime = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".css": "text/css", ".png": "image/png",
  ".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg"
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    const file = path.join(root, url === "/" ? "index.html" : url);
    if (!path.resolve(file).startsWith(path.resolve(root))) {
      res.writeHead(403); res.end(); return;
    }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404); res.end("not found"); return; }
      res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
  });
  await new Promise((resolve) => server.listen(portRequested, "127.0.0.1", resolve));
  return { server, port: server.address().port };
}

const { chromium } = loadPlaywright();
const { server, port } = await serve();
const browser = await chromium.launch({
  executablePath: chromePath,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
});

try {
  const context = await browser.newContext();
  await context.addInitScript(() => { navigator.getGamepads = () => []; });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  await page.goto(`http://127.0.0.1:${port}/index.html?${payloadQuery}`, { waitUntil: "load" });
  await page.waitForFunction(
    () => window.__game && Array.isArray(window.__game.missionTable) && window.__REGISTRY_SNAPSHOT__,
    null,
    { timeout: 45000 }
  );

  const result = await page.evaluate(() => {
    const mission = window.__game.missionTable.find((entry) => entry.key === "m01");
    if (!mission) return null;
    return {
      title: mission.title,
      act: mission.act,
      storyNo: mission.storyNo,
      parTime: mission.parTime,
      totalTargets: mission.totalTargets,
      totalContacts: mission.totalContacts,
      waveCount: mission.waveCount,
      waves: mission.waves.map((wave) => ({
        kind: wave.kind,
        size: wave.size,
        types: wave.types,
        tgt: wave.tgt,
        label: wave.label,
        concurrent: wave.concurrent
      }))
    };
  });

  assert(pageErrors.length === 0, `page errors: ${pageErrors.join(" | ")}`);
  assert(result, "M01 was not registered by the payload pair");
  assert(result.title === "FIRST CONTACT", `unexpected M01 title: ${result.title}`);
  assert(result.act === 1 && result.storyNo === 1, `unexpected story placement: act=${result.act} storyNo=${result.storyNo}`);
  assert(result.parTime === 660, `unexpected par time: ${result.parTime}`);
  assert(result.totalTargets === 6, `expected 6 red TGT contacts, got ${result.totalTargets}`);
  assert(result.totalContacts === 16, `expected 16 total contacts, got ${result.totalContacts}`);
  assert(result.waveCount === 4, `expected 4 principal phases, got ${result.waveCount}`);
  assert(result.waves.length === 7, `expected 7 authored sequence entries, got ${result.waves.length}`);
  assert(result.waves[0].tgt === false && result.waves[0].size === 2, "opening white tutorial pair changed");
  assert(result.waves.filter((wave) => wave.tgt !== false).reduce((sum, wave) => sum + wave.size, 0) === 6, "red bomber total changed");
  assert(result.waves.filter((wave) => wave.tgt === false).reduce((sum, wave) => sum + wave.size, 0) === 10, "white hostile total changed");

  console.log("check_sera_m01_browser: PASS");
  console.log("  payload booted in Chromium with FIRST CONTACT, 6 TGT, 10 white contacts and 4 principal phases");
} finally {
  await browser.close();
  server.close();
}
''', encoding="utf-8")


patch_payload()
patch_runtime_check()
write_browser_check()
print("apply_sera_m01_canon_pass: CROWN=F-15C, LARK=F-16C, runtime and Chromium gates prepared")
