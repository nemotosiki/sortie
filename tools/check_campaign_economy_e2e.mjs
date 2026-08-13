#!/usr/bin/env node
import { chromium } from "playwright";

const baseUrl = process.env.SORTIE_BASE_URL || "http://127.0.0.1:8000";
const missionUrl = `${baseUrl}/index.html`;

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details === null ? "" : `\n${JSON.stringify(details, null, 2)}`;
  throw new Error(`check_campaign_economy_e2e: ${message}${suffix}`);
}

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=swiftshader", "--disable-gpu-sandbox", "--disable-dev-shm-usage"]
});

async function loadWithPurchases(seed) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript((value) => {
    navigator.getGamepads = () => [];
    localStorage.clear();
    localStorage.setItem("sortieHangarPurchases", value);
  }, seed);
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto(missionUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(() => Boolean(window.__game?.debug?.campaigns), null, { timeout: 120_000 });
  const stored = await page.evaluate(() => ({
    purchases: JSON.parse(localStorage.getItem("sortieHangarPurchases") || "null"),
    backup: localStorage.getItem("sortieHangarPurchases.backup.v1"),
    campaigns: window.__game.debug.campaigns()
  }));
  return { context, pageErrors, consoleErrors, stored };
}

try {
  const v1Raw = JSON.stringify(["f15c", "mig29", "removed-airframe"]);
  const migrated = await loadWithPurchases(v1Raw);
  const first = migrated.stored;
  assert(first.purchases?.schemaVersion === 2, "V1 purchases were not migrated to schema V2", first);
  assert(first.backup === v1Raw, "the original V1 purchase array was not backed up", first);
  assert(first.campaigns.includes("sera"), "the Sera campaign shell was absent during migration", first);
  assert(first.purchases.campaigns.usa.includes("f15c"), "USA lost its purchased F-15C", first);
  assert(first.purchases.campaigns.sera.includes("f15c"),
    "a shared F-15C was not copied into the Sera namespace", first);
  assert(!first.purchases.campaigns.rus.includes("f15c"),
    "a western airframe leaked into the Russian namespace", first);
  assert(first.purchases.campaigns.rus.includes("mig29"), "Russia lost its purchased MiG-29", first);
  assert(!first.purchases.campaigns.usa.includes("removed-airframe")
      && !first.purchases.campaigns.rus.includes("removed-airframe")
      && !first.purchases.campaigns.sera.includes("removed-airframe"),
    "a stale aircraft id survived migration", first);
  assert(migrated.pageErrors.length === 0, "pageerror during V1 migration", migrated.pageErrors);
  assert(migrated.consoleErrors.length === 0, "console error during V1 migration", migrated.consoleErrors);
  await migrated.context.close();

  const v2Raw = JSON.stringify({
    schemaVersion: 2,
    campaigns: { usa: [], rus: [], sera: ["f15c"] }
  });
  const isolated = await loadWithPurchases(v2Raw);
  const second = isolated.stored;
  assert(second.purchases.campaigns.sera.includes("f15c"), "Sera ownership did not persist", second);
  assert(!second.purchases.campaigns.usa.includes("f15c"),
    "Sera ownership leaked back into the legacy USA namespace", second);
  assert(second.backup === null, "a V2 profile was incorrectly treated as a legacy profile", second);
  assert(isolated.pageErrors.length === 0, "pageerror while reading V2 purchases", isolated.pageErrors);
  assert(isolated.consoleErrors.length === 0, "console error while reading V2 purchases", isolated.consoleErrors);
  await isolated.context.close();

  console.log("check_campaign_economy_e2e: PASS");
  console.log("  V1 backup + shared-roster migration / V2 namespace isolation / no stale ids");
} finally {
  await browser.close();
}
