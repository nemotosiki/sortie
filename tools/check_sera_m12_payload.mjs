#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = path.join(root, "payloads", "mission_sera_m12.payload.js");
const source = fs.readFileSync(payloadPath, "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`check_sera_m12_payload: ${message}`);
};

assert(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'key: "sera-m12"', 'title: "GLASS SWARM"', 'world: "norIndustrialBlackout"',
  'designatedTag: "m12Swarm"', 'replenishmentTag: "m12Replenishment"',
  'mark: "m12Power"', 'falseContacts: 6', 'type: "substation"',
  'ctx.addMission(mission, { after: "sera-m11" })'
]) assert(source.includes(token), `missing source contract ${token}`);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-m12-check-"));
const modulePath = path.join(tempDir, "mission_sera_m12.mjs");
fs.writeFileSync(modulePath, source, "utf8");

try {
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  const MISSIONS = [{ key: "sera-m11", campaign: "sera", campaignOrder: 11 }];
  let mission = null;
  let insertion = null;
  register({
    tables: {
      MISSIONS,
      WORLD_PRESETS: { norIndustrialBlackout: {} },
      AIRCRAFT_TYPES: Object.fromEntries(
        ["jammer", "s70", "uav", "mig29", "su35", "fa18"].map((id) => [id, {}])
      ),
      ENEMY_AI_PROFILES: Object.fromEntries(
        ["jammer", "s70", "uav", "mig29", "su35"].map((id) => [id, {}])
      ),
      GROUND_TYPES: { substation: {} }
    },
    addMission(def, options) {
      mission = def;
      insertion = options;
      MISSIONS.push(def);
      return def;
    }
  });

  assert(mission?.key === "sera-m12" && mission.campaignOrder === 12 && mission.storyNo === 12,
    "mission identity/numbering changed");
  assert(insertion?.after === "sera-m11", "M12 is not inserted after M11");
  assert(mission.groundUnits.length === 2 && mission.groundUnits.every((unit) => (
    unit.type === "substation" && unit.tgt === false && unit.rankNeutral
    && unit.mark === mission.m12SwarmContract.power.mark
  )), "two white shared-grid substations are required");

  const allTypes = mission.sequence.flatMap((entry) => entry.types);
  assert(allTypes.filter((type) => type === "jammer").length === 1,
    "one jammer/relay is required");
  assert(allTypes.filter((type) => type === "s70").length === 6,
    "S-70 total must remain six");
  assert(allTypes.filter((type) => type === "uav").length === 10,
    "MQ-99 total must remain ten");
  assert(allTypes.filter((type) => type === "mig29").length === 6,
    "MiG-29A main cover must total six");
  assert(allTypes.filter((type) => type === "su35").length === 2,
    "Su-35 elite cover must be limited to two");

  const replenishments = mission.sequence.filter((entry) => (
    entry.missionTag === mission.m12SwarmContract.replenishmentTag
  ));
  assert(replenishments.length === 2
      && replenishments.reduce((sum, entry) => sum + entry.types.length, 0) === 5
      && replenishments.every((entry) => entry.concurrent && entry.delay > 0 && entry.tgt),
    "finite cancellable replenishment set must contain five delayed red aircraft");
  const optionalAir = mission.sequence.filter((entry) => entry.tgt === false);
  assert(optionalAir.reduce((sum, entry) => sum + entry.types.length, 0) === 8
      && optionalAir.every((entry) => entry.rankNeutral),
    "all eight crewed cover aircraft must be white/rank-neutral");
  assert(mission.m12SwarmContract.jammer.falseContacts === 6,
    "jammer false-contact pressure changed");

  console.log("check_sera_m12_payload: PASS");
  console.log("  jammer x1 / S-70 x6 / MQ-99 x10 / MiG-29A x6 / Su-35 x2 / substations x2");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
