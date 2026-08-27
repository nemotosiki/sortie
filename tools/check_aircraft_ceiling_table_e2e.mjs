#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [
  process.env.SORTIE_PLAYWRIGHT,
  "playwright",
  "C:/Users/user01/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright"
].filter(Boolean);
let playwright = null;
for (const candidate of candidates) {
  try { playwright = require(candidate); break; } catch { /* next */ }
}
if (!playwright) throw new Error("Playwright is unavailable");

const assert = (condition, message, details = null) => {
  if (condition) return;
  throw new Error(`check_aircraft_ceiling_table_e2e: ${message}${
    details === null ? "" : `\n${JSON.stringify(details, null, 2)}`
  }`);
};

const server = http.createServer((request, response) => {
  const relative = decodeURIComponent(request.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
  const file = path.resolve(root, relative);
  if (!(file === root || file.startsWith(`${root}${path.sep}`))) {
    response.writeHead(403); response.end(); return;
  }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, {
      "Content-Type": path.extname(file) === ".html" ? "text/html" : "text/javascript"
    });
    response.end(data);
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

const browser = await playwright.chromium.launch({
  executablePath: process.env.SORTIE_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
});
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(String(error?.stack || error)));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

try {
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?seraDev=1`, {
    waitUntil: "load",
    timeout: 120_000
  });
  await page.waitForFunction(() => Boolean(window.__game?.debug?.flightEnvelopeTable), null, {
    timeout: 120_000
  });
  const table = await page.evaluate(() => window.__game.debug.flightEnvelopeTable());
  const byId = Object.fromEntries(table.map((entry) => [entry.id, entry]));
  const foxhound = byId.mig31;
  assert(foxhound && foxhound.boostSpeed === 833
      && foxhound.estimatedCeiling >= 11800
      && foxhound.estimatedCeiling <= 12100,
    "MiG-31 lost its high-altitude design point", foxhound);

  const attackAircraft = new Set(["a10", "su25", "f111f"]);
  const ordinaryFighters = table.filter((entry) => (
    entry.id !== "mig31" && !attackAircraft.has(entry.id)
  ));
  const outsideBand = ordinaryFighters.filter((entry) => (
    entry.estimatedCeiling < 9000 || entry.estimatedCeiling > 10700
  ));
  assert(outsideBand.length === 0,
    "ordinary fighter escaped the common roughly-10km capability band", outsideBand);
  assert(byId.f4 && byId.f4.boostSpeed === 560
      && byId.f4.estimatedCeiling < 10000,
    "F-4 became a high-altitude exception instead of retaining only its speed", byId.f4);
  assert(errors.length === 0, "browser errors", errors);

  console.log("check_aircraft_ceiling_table_e2e: PASS");
  console.log(JSON.stringify({
    ordinaryBand: {
      minimum: Math.min(...ordinaryFighters.map((entry) => entry.estimatedCeiling)),
      maximum: Math.max(...ordinaryFighters.map((entry) => entry.estimatedCeiling))
    },
    mig31: foxhound,
    aircraft: table
  }, null, 2));
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
