#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const indexPath = path.join(root, "index.html");
const source = fs.readFileSync(indexPath, "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(`[sera-m03-runtime-host] ${message}`);
}

const marker = "// SERA M03 RUNTIME CONTRACT";
assert(source.split(marker).length - 1 === 1, "runtime marker must appear exactly once");
for (const name of [
  "resetM03State",
  "createM03LandingState",
  "updateM03TransportLanding",
  "completeM03Unload",
  "spawnM03Apc",
  "arriveM03Apc",
  "updateM03MissionThreat",
  "m03RankShouldCapS",
  "m03ResultSnapshot"
]) {
  assert(source.includes(`function ${name}(`), `missing function ${name}`);
}

for (const [needle, label] of [
  ["spawned.m03Landing = createM03LandingState(spawned);", "transport spawn binding"],
  ["if (enemy.m03Landing && updateM03TransportLanding(enemy, dt)) return;", "transport FSM dispatch"],
  ["if (enemy.m03Apc) arriveM03Apc(enemy);", "APC arrival dispatch"],
  ["resetM03State(MISSIONS[currentMissionIndex]);", "sortie reset"],
  ["checkpoint.m03State = snapshotM03State();", "checkpoint snapshot"],
  ["restoreM03State(at.m03State);", "checkpoint restore"],
  ["const m03RankCapped = m03RankShouldCapS(mission);", "rank contract"],
  ["missionRecords.m03 = {", "formal M03 record"],
  ["seraM03Probe: () => {", "M03 probe"],
  ["forceSeraM03LandTransport: (id = null) => {", "landing test hook"],
  ["pendingWaves.some((entry) => entry.wave && isTgtEntry(entry.wave))", "delayed TGT hold"]
]) assert(source.includes(needle), `missing ${label}`);

const moduleScripts = [...source.matchAll(/<script\b([^>]*)type=["']module["']([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter((match) => !/\bsrc\s*=/.test(`${match[1]} ${match[2]}`))
  .map((match) => match[3]);
assert(moduleScripts.length > 0, "no inline module script found");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sortie-m03-syntax-"));
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

console.log("[sera-m03-runtime-host] PASS");
console.log("  landing FSM -> APC conversion -> command failure -> rank/result/checkpoint contracts");
