#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.resolve(process.env.SORTIE_M07_VISUAL_DIR || path.join(root, "artifacts", "sera-m07-visual"));
fs.mkdirSync(output, { recursive: true });

const require = createRequire(import.meta.url);
const candidates = [
  process.env.SORTIE_PLAYWRIGHT,
  "playwright",
  "C:/Users/user01/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright"
].filter(Boolean);
let playwright = null;
for (const candidate of candidates) {
  try { playwright = require(candidate); break; } catch { /* try next */ }
}
if (!playwright) throw new Error("capture_sera_m07_visuals: Playwright is unavailable");

const mime = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".css": "text/css", ".png": "image/png"
};
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent((req.url || "/").split("?")[0]);
  const file = path.resolve(root, pathname === "/" ? "index.html" : `.${pathname}`);
  const relative = path.relative(root, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

const chrome = process.env.SORTIE_CHROME
  || "C:/Users/user01/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe";
const browser = await playwright.chromium.launch({
  headless: true,
  executablePath: fs.existsSync(chrome) ? chrome : undefined,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-dev-shm-usage"]
});

const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await context.addInitScript(() => {
  navigator.getGamepads = () => [];
  const records = {};
  for (const key of ["sera-m01", "sera-m02", "sera-m03", "sera-m04", "sera-m05"]) {
    records[key] = { cleared: true, rank: "A", scores: [0], times: [0], marks: {} };
  }
  localStorage.setItem("sortieMissionRecords", JSON.stringify(records));
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(String(error?.stack || error)));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

try {
  await page.goto(
    `http://127.0.0.1:${server.address().port}/index.html?worldPreview=damarSeaStorm&worldPreviewDetail=rescue`,
    { waitUntil: "load", timeout: 120_000 }
  );
  await page.waitForFunction(() => window.__WORLD_PREVIEW__?.sheet === "rescue", null, { timeout: 120_000 });
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(output, "01-rescue-detail.png") });

  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, {
    waitUntil: "domcontentloaded", timeout: 120_000
  });
  await page.waitForFunction(() => Boolean(window.__game?.forceStartMissionByKey && window.__game?.debug?.forceTeleport), null, {
    timeout: 120_000
  });
  if (!(await page.evaluate(() => window.__game.forceStartMissionByKey("sera-m07", "f16")))) {
    throw new Error("could not start sera-m07");
  }
  await page.waitForFunction(() => document.body.dataset.gameState === "playing", null, { timeout: 15_000 });
  const moved = await page.evaluate(() => window.__game.debug.forceTeleport(-1450, 700, 900)
    && window.__game.debug.forceAttitude(0, -24, 0));
  if (!moved) throw new Error("could not stage approach");
  await page.waitForTimeout(220);
  await page.screenshot({ path: path.join(output, "02-gameplay-approach.png") });
  if (errors.length) throw new Error(`browser errors:\n${errors.join("\n")}`);
  console.log(`capture_sera_m07_visuals: PASS - rescue detail + gameplay approach -> ${output}`);
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
