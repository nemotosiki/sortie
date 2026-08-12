#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = path.join(root, "payloads", "mission_sera_m08.payload.js");
const source = fs.readFileSync(payloadPath, "utf8");
const fail = (message) => { throw new Error(`check_sera_m08_payload: ${message}`); };
const assert = (condition, message) => { if (!condition) fail(message); };

assert(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'key: "sera-m08"', 'campaign: "sera"', 'campaignOrder: 8', 'world: "ormBasinNight"',
  'relayMark: "m08Relay"', 'fuelMark: "m08Fuel"', 'settlementLightObject: "ormBasinSettlementLights"',
  'label: "SHEM PAYMENT RELAY"', 'ace: "vesper"', 'callsign: "VESPER"'
]) assert(source.includes(token), `missing ${token}`);
assert(!source.includes('types: ["su35"'), "Su-35 must remain unavailable before M12");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-m08-check-"));
const modulePath = path.join(tempDir, "mission_sera_m08.mjs");
fs.writeFileSync(modulePath, source, "utf8");

try {
  const MISSIONS = [{ key: "sera-m07", campaign: "sera", campaignOrder: 7 }];
  const aircraftKeys = ["fa18", "f111f", "mig29", "su24m"];
  const groundKeys = ["samSite", "ewVehicle", "mobileCommand", "convoyTruck", "rootRelay"];
  const aceTemplate = {
    callsign: "HATI",
    theme: { primary: 0, secondary: 0, accent: 0, canopy: 0, exhaust: 0 },
    radio: { inbound: "", wingman: "", engage: "", down: "" }
  };
  let added = null;
  let vesper = null;
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  register({
    tables: {
      MISSIONS,
      WORLD_PRESETS: { ormBasinNight: {} },
      AIRCRAFT_TYPES: Object.fromEntries(aircraftKeys.map((key) => [key, {}])),
      ENEMY_AI_PROFILES: { mig29: {}, su24m: {} },
      GROUND_TYPES: Object.fromEntries(groundKeys.map((key) => [key, {}])),
      ACE_PROFILES: { hati: aceTemplate }
    },
    addAceProfile(id, def) {
      assert(id === "vesper", `unexpected ace id ${id}`);
      vesper = def;
      return def;
    },
    addMission(def) {
      assert(!MISSIONS.some((mission) => mission.key === def.key), `duplicate key ${def.key}`);
      const airCount = def.sequence.reduce((sum, wave) => sum + wave.types.length, 0);
      const totalTargets = def.sequence.filter((wave) => wave.tgt !== false)
        .reduce((sum, wave) => sum + wave.types.length, 0)
        + def.groundUnits.filter((unit) => unit.tgt !== false).length;
      added = {
        ...def,
        totalTargets,
        totalContacts: airCount + def.groundUnits.length
      };
      MISSIONS.push(added);
      return added;
    }
  });

  assert(added?.key === "sera-m08" && added?.title === "NIGHT AUDIT",
    "mission identity changed");
  assert(added.totalTargets === 9, `expected 9 red TGT, got ${added.totalTargets}`);
  assert(added.totalContacts === 21, `expected 21 contacts, got ${added.totalContacts}`);
  assert(vesper?.callsign === "VESPER" && vesper?.role.includes("NIGHTJAR 1"),
    "VESPER ace profile is incomplete");

  const countAir = (type) => added.sequence.flatMap((wave) => wave.types)
    .filter((entry) => entry === type).length;
  const countGround = (type) => added.groundUnits.filter((unit) => unit.type === type).length;
  assert(countAir("mig29") === 4 && countAir("su24m") === 4,
    "MiG-29/Su-24M air composition changed");
  assert(countGround("samSite") === 3 && countGround("mobileCommand") === 2
      && countGround("ewVehicle") === 1 && countGround("convoyTruck") === 6
      && countGround("rootRelay") === 1,
    "ground composition changed");
  assert(added.sequence.filter((wave) => wave.types.length > 0)
    .every((wave) => wave.tgt === false && wave.rankNeutral === true),
    "all aircraft must remain white and rank-neutral");
  assert(added.groundUnits.filter((unit) => unit.tgt === false).length === 4,
    "payment network must remain four white contacts");
  assert(added.groundUnits.filter((unit) => unit.tgt !== false).length === 9,
    "military board must remain nine red targets");
  const relay = added.groundUnits.find((unit) => unit.mark === "m08Relay");
  assert(relay?.type === "rootRelay" && relay?.rankNeutral === true && relay?.tgt === false,
    "optional relay target changed IFF or scoring");

  const contract = added.m08ChoiceContract;
  assert(contract?.relayChoice === "relay" && contract?.fuelChoice === "fuel",
    "route identity changed");
  assert(contract?.timeLimit === 1200 && contract?.relayRank?.sTime === 480,
    "time/rank contract changed");
  assert(added.friendlies?.wingmen?.length === 1
      && added.friendlies.wingmen[0].label === "ROOK 2 LARK"
      && added.friendlies.wingmen[0].type === "fa18",
    "LARK deployment is incomplete");
  assert(added.friendlies?.transports?.aircraft === "f111f"
      && added.friendlies.transports.count === 2
      && added.friendlies.transports.vulnerable === false,
    "SABER F-111 strike package is incomplete");

  console.log("check_sera_m08_payload: PASS");
  console.log("  red=9 military TGT white=4 payment + MiG29x4/Su24Mx4, VESPER and dual route staged");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
