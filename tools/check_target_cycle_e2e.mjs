#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const candidates = [
  process.env.SORTIE_PLAYWRIGHT,
  "playwright",
  "C:/Users/user01/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright"
].filter(Boolean);
let playwright = null;
for (const candidate of candidates) {
  try {
    playwright = require(candidate);
    break;
  } catch {
    // Try the next supported installation.
  }
}
if (!playwright) throw new Error("Playwright is unavailable");

const baseUrl = String(process.env.SORTIE_BASE_URL || "http://127.0.0.1:8340").replace(/\/$/, "");
const browser = await playwright.chromium.launch({
  executablePath: process.env.SORTIE_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
});
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
await context.addInitScript(() => {
  navigator.getGamepads = () => [];
  localStorage.setItem("sortieHangarPurchases", JSON.stringify({
    schemaVersion: 2,
    campaigns: { usa: [], rus: [], sera: ["f16"] }
  }));
  window.__targetCycleHeartbeat = 0;
  const beat = () => {
    window.__targetCycleHeartbeat += 1;
    requestAnimationFrame(beat);
  };
  requestAnimationFrame(beat);
});

const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];
page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

try {
  await page.goto(`${baseUrl}/index.html?seraDev=1`, { waitUntil: "load", timeout: 120_000 });
  await page.waitForFunction(() => Boolean(
    window.__game?.forceStartMissionByKey
    && window.__game?.forceSeraM10DeployPending
    && window.__game?.debug?.lockProbe
  ), null, { timeout: 120_000 });

  assert.equal(
    await page.evaluate(() => window.__game.forceStartMissionByKey("sera-m10", "f16")),
    true,
    "M10 should start"
  );
  await page.waitForFunction(
    () => document.body.dataset.gameState === "playing",
    null,
    { timeout: 20_000 }
  );
  assert.equal(
    await page.evaluate(() => window.__game.forceSeraM10DeployPending()),
    true,
    "M10 delayed contacts should deploy"
  );

  const beforeFrames = await page.evaluate(() => window.__targetCycleHeartbeat);
  for (let press = 0; press < 120; press += 1) {
    await page.keyboard.press("Tab");
  }
  await page.waitForTimeout(750);

  const state = await page.evaluate(() => {
    const lock = window.__game.debug.lockProbe();
    const selected = window.__game.enemies.find((enemy) => enemy.id === lock.targetId) || null;
    return {
      frames: window.__targetCycleHeartbeat,
      gameState: window.__game.state,
      targetId: lock.targetId,
      selectedIsSubsystem: Boolean(selected?.subsystem)
    };
  });

  assert.equal(state.gameState, "playing", "target cycling must leave the sortie running");
  assert.ok(state.frames > beforeFrames, "animation heartbeat must continue after target cycling");
  assert.notEqual(state.targetId, null, "a visible contact should be selected");
  assert.equal(state.selectedIsSubsystem, false, "manual target cycling must not select ship subsystems");
  assert.deepEqual(pageErrors, [], "target cycling must not throw page errors");
  assert.deepEqual(consoleErrors, [], "target cycling must not log console errors");

  console.log("check_target_cycle_e2e: PASS");
} finally {
  await browser.close();
}
