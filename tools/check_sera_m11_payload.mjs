#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = path.join(root, "payloads", "mission_sera_m11.payload.js");
const source = fs.readFileSync(payloadPath, "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`check_sera_m11_payload: ${message}`);
};

assert(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'key: "sera-m11"', 'title: "FROZEN EYE"', 'world: "verIceCoast"',
  'aircraft: "b1b"', 'spw: "aam4"', 'hunt: "air"',
  'm11EscortContract', 'requiredSaved: 2', 'ctx.addMission(mission, { after: "sera-m10" })'
]) assert(source.includes(token), `missing source contract ${token}`);
for (const forbidden of ["shared civilian-radar", "radar suppression", "su35", "su47", "su57", "CROWN 1"]) {
  assert(!source.includes(forbidden), `superseded/late content leaked into M11: ${forbidden}`);
}

const anchors = {
  playerStart: [-10800, -7200], strikeStart: [-9600, -6400], strikeExit: [9600, 6400],
  operationLine: [9000, 6000], battleCenter: [0, 0], firstIntercept: [-1800, 4100],
  northIntercept: [3100, 8600], southIntercept: [11200, -6500], diversionEntry: [-2500, -8200]
};
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-m11-check-"));
const modulePath = path.join(tempDir, "mission_sera_m11.mjs");
fs.writeFileSync(modulePath, source, "utf8");

try {
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  const MISSIONS = [{ key: "sera-m10", campaign: "sera", campaignOrder: 10 }];
  let mission = null;
  let insertion = null;
  register({
    tables: {
      MISSIONS,
      WORLD_PRESETS: { verIceCoast: { missionAnchors: anchors } },
      AIRCRAFT_TYPES: { fa18: {}, b1b: {}, mig29: {}, mig31: {} },
      ENEMY_AI_PROFILES: { mig29: {}, mig31: {} }
    },
    addMission(def, options) {
      mission = def;
      insertion = options;
      MISSIONS.push(def);
      return def;
    }
  });

  assert(mission?.key === "sera-m11" && mission.campaignOrder === 11 && mission.storyNo === 11,
    "mission identity/numbering changed");
  assert(insertion?.after === "sera-m10", "M11 is not inserted after M10");
  assert(mission.world === "verIceCoast" && mission.title === "FROZEN EYE",
    "title or retained map changed");
  assert(!JSON.stringify(mission.friendlies).includes("CROWN"),
    "CROWN returned to the M11 flight after M06");

  const wingman = mission.friendlies?.wingmen?.[0];
  assert(mission.friendlies.wingmen.length === 1
      && wingman.type === "fa18" && wingman.label === "ROOK 2 LARK" && wingman.spw === "aam4",
    "LARK F/A-18F + 4AAM identity changed");
  const halo = mission.friendlies.transportGroups?.[0];
  assert(mission.friendlies.transportGroups.length === 1
      && halo.aircraft === "b1b" && halo.count === 3 && halo.vulnerable,
    "HALO B-1B x3 formation changed");
  assert(halo.altitude === 5100 && halo.speed === 128 && halo.hp === 520,
    "HALO altitude/speed/HP changed");
  assert(halo.start.x === anchors.strikeStart[0] && halo.exit.z === anchors.strikeExit[1],
    "HALO does not use map-authored route");
  assert(mission.friendlies.guard.readout === "count" && mission.friendlies.guard.label === "HALO",
    "HALO count HUD contract changed");

  const red = mission.sequence.filter((wave) => wave.tgt !== false);
  const white = mission.sequence.filter((wave) => wave.tgt === false);
  const redTypes = red.flatMap((wave) => wave.types);
  assert(redTypes.filter((type) => type === "mig29").length === 2,
    "red first-wave MiG-29A count changed");
  assert(redTypes.filter((type) => type === "mig31").length === 4,
    "red MiG-31 count changed");
  assert(red.length === 3 && red.every((wave) => wave.hunt === "air" && wave.missionTag === "m11HaloHunter"),
    "all red interceptors must hunt HALO");
  assert(white.length === 1 && white[0].types.length === 2
      && white[0].types.every((type) => type === "mig29") && !white[0].hunt && white[0].rankNeutral,
    "white RAVEN diversion changed");
  assert(mission.sequence[1].delay === 45 && mission.sequence[2].delay === 82
      && mission.sequence[3].delay === 128,
    "staggered interception timing changed");
  assert(!mission.sequence.flatMap((wave) => wave.types).some((type) => ["su35", "su47", "su57"].includes(type)),
    "late-game fighter leaked into M11");

  const contract = mission.m11EscortContract;
  assert(contract.total === 3 && contract.requiredSaved === 2 && contract.timeLimit === 330,
    "2-of-3 escort objective changed");
  assert(JSON.stringify(contract.route.start) === JSON.stringify(anchors.strikeStart)
      && JSON.stringify(contract.route.exit) === JSON.stringify(anchors.strikeExit),
    "runtime escort route no longer matches the map anchors");
  assert(contract.proximity.warningDistance > contract.proximity.clearDistance,
    "proximity warning hysteresis is malformed");
  assert(contract.rank.sGuardLosses === 0 && contract.rank.ignoreWhiteTargets,
    "all-safe S rank/white-target contract changed");

  const routeLength = Math.hypot(
    halo.exit.x - halo.start.x,
    halo.exit.z - halo.start.z
  );
  assert(routeLength > 22500 && routeLength < 23500, `HALO route must be about 23 km, got ${routeLength}`);
  const predictedAt = (delay) => {
    const fraction = Math.min(1, (delay * halo.speed) / routeLength);
    return [
      halo.start.x + (halo.exit.x - halo.start.x) * fraction,
      halo.start.z + (halo.exit.z - halo.start.z) * fraction
    ];
  };
  for (const wave of red) {
    const strike = predictedAt(Number(wave.delay) || 0);
    const standoff = Math.hypot(wave.at[0] - strike[0], wave.at[1] - strike[1]);
    assert(standoff >= 9500, `${wave.label} spawns too close to HALO: ${standoff.toFixed(0)}m`);
  }

  console.log("check_sera_m11_payload: PASS");
  console.log("  HALO B-1B x3 / 2 required / red MiG-29A x2 + MiG-31 x4 / white diversion x2");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
