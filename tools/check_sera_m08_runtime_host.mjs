#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = path.join(root, "index.html");
const source = fs.readFileSync(indexPath, "utf8");
const fail = (message) => { throw new Error(`check_sera_m08_runtime_host: ${message}`); };
const assert = (condition, message) => { if (!condition) fail(message); };

for (const name of [
  "resetM08State", "m08ResultSnapshot", "m08RelayRank", "armM08AircraftRetreat",
  "updateM08RetreatingAircraft", "beginM08RelayBlackout", "updateM08MissionThreat"
]) assert(source.includes(`function ${name}(`), `missing function ${name}`);

for (const [needle, label] of [
  ['const SERA_DEV_UNLOCK = new URLSearchParams(location.search).get("seraDev") === "1";', "explicit Sera dev unlock"],
  ['if (SERA_DEV_UNLOCK && missionCampaignId(MISSIONS[index]) === "sera") return true;', "staged Sera mission unlock"],
  ["resetM08State(MISSIONS[currentMissionIndex]);", "sortie reset"],
  ["const m08Result = m08ResultSnapshot(mission);", "result persistence"],
  ["const m08Rank = m08RelayRank(mission);", "relay rank override"],
  ["if (updateM08RetreatingAircraft(enemy, dt)) continue;", "weapon-safe retreat dispatch"],
  ["if (updateM08MissionThreat()) return;", "mission threat dispatch"],
  ["seraM08Probe: () => {", "M08 browser probe"],
  ["forceSeraM08RelayRoute: () => {", "relay test hook"],
  ["forceSeraM08DeployPending: () => {", "delayed aircraft test hook"],
  ["forceSeraM08FuelRoute: () => {", "fuel test hook"],
  ["forceSeraM08Failure: () => {", "timeout test hook"],
  ["lights.visible = false;", "settlement blackout"],
  ["enemy.fireCooldown = Number.POSITIVE_INFINITY;", "gun disarm"],
  ["enemy.missileCooldown = Number.POSITIVE_INFINITY;", "missile disarm"]
]) assert(source.includes(needle), `missing ${label}`);

const moduleScripts = [...source.matchAll(/<script\b([^>]*)type=["']module["']([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter((match) => !/\bsrc\s*=/.test(`${match[1]} ${match[2]}`))
  .map((match) => match[3]);
assert(moduleScripts.length > 0, "no inline module script found");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sortie-m08-syntax-"));
try {
  for (let i = 0; i < moduleScripts.length; i += 1) {
    const file = path.join(tempDir, `module-${i}.mjs`);
    fs.writeFileSync(file, moduleScripts[i], "utf8");
    const checked = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    assert(checked.status === 0, `inline module ${i} has invalid syntax\n${checked.stderr || checked.stdout}`);
  }
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log("check_sera_m08_runtime_host: PASS");
console.log("  route choice -> blackout/retreat -> rank/result -> Retry reset contracts");
