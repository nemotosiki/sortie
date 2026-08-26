#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const externalBaseUrl = String(process.env.SORTIE_BASE_URL || "").replace(/\/$/, "");
const screenshotPath = path.resolve(
  process.env.SORTIE_VER_ICE_SCREENSHOT || path.join(os.tmpdir(), "sortie-ver-ice-coast-preview.png")
);
const chromePath = process.env.SORTIE_CHROME
  || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const candidates = [
  process.env.SORTIE_PLAYWRIGHT,
  "playwright",
  "C:/Users/user01/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright"
].filter(Boolean);
const loadPlaywright = () => {
  for (const candidate of candidates) {
    try { return require(candidate); } catch { /* try next */ }
  }
  throw new Error("playwright not found; set SORTIE_PLAYWRIGHT");
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const mime = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png" };

async function serve() {
  const server = http.createServer((request, response) => {
    const requestPath = decodeURIComponent(request.url.split("?")[0]);
    const file = path.join(root, requestPath === "/" ? "index.html" : requestPath);
    if (!path.resolve(file).startsWith(root)) { response.writeHead(403); response.end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { response.writeHead(404); response.end("not found"); return; }
      response.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
      response.end(data);
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, port: server.address().port };
}

const { chromium } = loadPlaywright();
const served = externalBaseUrl ? { server: null, port: null } : await serve();
const baseUrl = externalBaseUrl || `http://127.0.0.1:${served.port}`;
const browser = await chromium.launch({
  executablePath: chromePath,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
});

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.addInitScript(() => { navigator.getGamepads = () => []; });

  const url = `${baseUrl}/index.html?payloads=payloads/map_verIceCoast.payload.js&worldPreview=verIceCoast`;
  await page.goto(url, { waitUntil: "load", timeout: 45000 });
  await page.waitForFunction(
    () => window.__game?.debug?.worldDecorators?.().activeOn === "verIceCoast",
    null,
    { timeout: 45000 }
  );
  await page.waitForTimeout(2600);
  const probe = await page.evaluate(() => {
    const decorators = window.__game.debug.worldDecorators();
    const meshIntegrity = window.__game.debug.worldMeshIntegrity();
    const distance = window.__game.debug.renderDistanceProbe();
    const caption = [...document.querySelectorAll("div")]
      .map((element) => element.textContent || "")
      .find((text) => text.includes("VER ICE COAST") && text.includes("DECOR")) || "";
    return {
      decorators,
      meshIntegrity,
      distance,
      caption,
      canvasCount: document.querySelectorAll("canvas").length,
      preview: window.__WORLD_PREVIEW__ || null
    };
  });

  await page.screenshot({ path: screenshotPath, type: "png" });
  assert(pageErrors.length === 0, `page errors: ${pageErrors.join(" | ")}`);
  assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join(" | ")}`);
  assert(probe.decorators.applies.includes("verIceCoastWorks"), "Ver Ice Coast decorator did not apply");
  assert(probe.decorators.roots >= 1, "decorator root was not tracked");
  assert(probe.meshIntegrity.issues.length === 0,
    `mesh integrity failed: ${probe.meshIntegrity.issues.join(" | ")}`);
  assert(probe.meshIntegrity.degenerateTriangles === 0,
    `found ${probe.meshIntegrity.degenerateTriangles} degenerate triangles`);
  assert(probe.distance.cameraFar >= 40000 && probe.distance.fogFar === 34000,
    `far-distance contract failed: camera=${probe.distance.cameraFar} fog=${probe.distance.fogFar}`);
  assert(probe.caption.includes("PAYLOAD PRESET"), `preview caption is wrong: ${JSON.stringify(probe.caption)}`);
  assert(probe.canvasCount >= 2, `preview sheet did not initialize: ${probe.canvasCount} canvases`);

  console.log("check_map_ver_ice_coast_browser: PASS");
  console.log(JSON.stringify({ ...probe, screenshotPath }, null, 2));
} finally {
  await browser.close();
  if (served.server) await new Promise((resolve) => served.server.close(resolve));
}
