#!/usr/bin/env node
import { chromium } from "playwright";

const baseUrl = process.env.SORTIE_BASE_URL || "http://127.0.0.1:8000";
const missionUrl = `${baseUrl}/index.html`;
function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details === null ? "" : `\n${JSON.stringify(details, null, 2)}`;
  throw new Error(`check_campaign_records_e2e: ${message}${suffix}`);
}
const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=swiftshader", "--disable-gpu-sandbox", "--disable-dev-shm-usage"]
});

async function load(seed) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript((records) => {
    navigator.getGamepads = () => [];
    localStorage.clear();
    localStorage.setItem("sortieMissionRecords", JSON.stringify(records));
  }, seed);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error?.stack || error)));
  await page.goto(missionUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(() => Boolean(window.__game?.debug?.campaigns), null, { timeout: 120_000 });
  const result = await page.evaluate(() => ({
    records: JSON.parse(localStorage.getItem("sortieMissionRecords") || "{}"),
    backup: localStorage.getItem("sortieMissionRecords.backup.pre-sera-namespace")
  }));
  await context.close();
  return { ...result, errors };
}

try {
  const seed = {
    m01: { cleared: true, rank: "A", scores: [1200], times: [91.2], marks: { beacon: 1 } },
    m02: { cleared: true, rank: "B", scores: [900], times: [140.5] },
    "m-heli": { cleared: true, rank: "B", transportLandings: 2 },
    m03: { cleared: true, rank: "S", transportLandings: 0, recordSource: "m-heli" }
  };
  const first = await load(seed);
  assert(first.errors.length === 0, "pageerror during record migration", first.errors);
  assert(first.records.m01?.rank === "A" && first.records.m02?.rank === "B",
    "legacy records were moved or altered", first.records);
  assert(first.records["sera-m01"]?.rank === "A"
      && first.records["sera-m01"]?.ambiguousImport
      && first.records["sera-m01"]?.recordSource === "m01",
    "M01 was not copied into the Sera namespace", first.records);
  assert(first.records["sera-m01"]?.marks?.beacon === 1,
    "nested M01 record data was not preserved", first.records["sera-m01"]);
  assert(first.records["sera-m02"]?.rank === "B"
      && first.records["sera-m02"]?.recordSource === "m02",
    "M02 was not copied into the Sera namespace", first.records);
  assert(first.records["sera-m03"]?.rank === "S"
      && first.records["sera-m03"]?.transportLandings === 0
      && first.records["sera-m03"]?.recordSource === "m03"
      && first.records["sera-m03"]?.migratedImport === true
      && !first.records["sera-m03"]?.ambiguousImport,
    "formal M03 record was not preferred for the Sera namespace", first.records);
  assert(first.records["m-heli"]?.rank === "B" && first.records.m03?.rank === "S",
    "M03 source records were moved or altered", first.records);
  assert(first.backup === JSON.stringify(seed), "pre-namespace records were not backed up", first);

  const protectedSeed = {
    m01: { cleared: true, rank: "A" },
    "m-heli": { cleared: true, rank: "A", transportLandings: 1 },
    "sera-m01": { cleared: true, rank: "S", scores: [9999] },
    "sera-m03": { cleared: true, rank: "S", scores: [7777] }
  };
  const second = await load(protectedSeed);
  assert(second.records["sera-m01"]?.rank === "S"
      && second.records["sera-m01"]?.scores?.[0] === 9999,
    "an existing namespaced record was overwritten", second.records);
  assert(second.records["sera-m02"] === undefined,
    "a missing legacy M02 record produced a phantom Sera record", second.records);
  assert(second.records["sera-m03"]?.scores?.[0] === 7777,
    "an existing namespaced M03 record was overwritten", second.records);

  const fallbackSeed = {
    "m-heli": { cleared: true, rank: "A", transportLandings: 1 }
  };
  const third = await load(fallbackSeed);
  assert(third.records["sera-m03"]?.rank === "A"
      && third.records["sera-m03"]?.recordSource === "m-heli"
      && third.records["sera-m03"]?.ambiguousImport === true,
    "legacy M03 slot fallback was not copied conservatively", third.records);

  console.log("check_campaign_records_e2e: PASS");
  console.log("  legacy records retained / formal M03 preferred / slot fallback preserved / existing Sera result protected");
} finally {
  await browser.close();
}
