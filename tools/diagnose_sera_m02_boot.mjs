#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const mime = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".css": "text/css", ".png": "image/png",
  ".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg"
};

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(root, pathname === "/" ? "index.html" : pathname);
  if (!path.resolve(file).startsWith(root)) {
    res.writeHead(403); res.end(); return;
  }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=swiftshader", "--disable-gpu-sandbox", "--disable-dev-shm-usage"]
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const pageErrors = [];
  const consoleMessages = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));
  page.on("console", (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
  const url = `http://127.0.0.1:${port}/index.html?payloads=payloads/ground_tel.payload.js,payloads/map_amalPlain.payload.js,payloads/mission_sera_m02.payload.js`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(5000);
  const snapshot = await page.evaluate(() => ({
    state: document.body?.dataset?.gameState || null,
    hasGame: Boolean(window.__game),
    hasRegistry: Boolean(window.__REGISTRY_SNAPSHOT__),
    payloads: window.__APPLIED_PAYLOADS__ || [],
    bodyText: document.body?.innerText?.slice(0, 500) || ""
  }));
  console.log(JSON.stringify({ snapshot, pageErrors, consoleMessages }, null, 2));
  if (!snapshot.hasRegistry || pageErrors.length > 0 || consoleMessages.some((line) => line.startsWith("error:"))) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
  server.close();
}
