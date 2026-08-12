#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = path.join(root, "payloads", "mission_sera_m07.payload.js");
const hostPath = path.join(root, "index.html");

function assert(condition, message) {
  if (!condition) throw new Error(`[sera-m07] ${message}`);
}

const source = fs.readFileSync(payloadPath, "utf8");
const host = fs.readFileSync(hostPath, "utf8");
const register = vm.runInNewContext(
  source.replace("export default function register", "function register") + "\nregister;",
  { Object, Math, Error }
);

const rescueSites = [
  { id: "crown", kind: "survivor", label: "SOS CROWN", at: [-1450, -250] },
  { id: "crew-b", kind: "survivor", label: "SOS CREW B", at: [250, 1350] },
  { id: "crew-c", kind: "survivor", label: "SOS CREW C", at: [1650, -650] },
  { id: "data", kind: "data", label: "DATA CAPSULE", at: [300, -1700] }
];
const world = {
  missionAnchors: {
    playerStart: [-3900, -2500],
    sarFlyingBoatStart: [-3400, 1800], sarFlyingBoatExit: [3000, -2100],
    patrolStart: [-4500, -3600], patrolExit: [4300, 3500],
    enemyCapEntry: [3600, -3200], missileBoats: [2300, 600],
    rescueSites
  }
};
const aircraft = Object.fromEntries(["fa18", "e2d", "sarFlyingBoat", "su33", "mig31"].map((id) => [id, {}]));
const profiles = { su33: {}, mig31: {} };
let mission = null;
let options = null;
register({
  tables: {
    MISSIONS: [{ key: "sera-m05", campaign: "sera" }],
    WORLD_PRESETS: { damarSeaStorm: world },
    AIRCRAFT_TYPES: aircraft,
    ENEMY_AI_PROFILES: profiles,
    SHIP_TYPES: { missileBoat: {} }
  },
  addMission(def, opts) { mission = def; options = opts; }
});

assert(mission, "mission was not registered");
assert(mission.key === "sera-m07" && mission.campaign === "sera", "mission identity changed");
assert(mission.campaignOrder === 7 && mission.storyNo === 7 && mission.act === 2, "canonical M07 numbering changed");
assert(mission.world === "damarSeaStorm", "mission does not select the Damar storm world");
assert(options?.after === "sera-m05", "transitional insertion must follow the latest implemented Sera sortie");

const contract = mission.m07RecoveryContract;
assert(contract?.sites?.length === 4, "recovery contract must expose four sites");
assert(contract.sites.filter((site) => site.kind === "survivor").length === 3, "survivor count changed");
assert(contract.sites.filter((site) => site.kind === "data").length === 1, "data capsule count changed");
assert(contract.pickupRadius === 650 && contract.maximumAltitude === 460, "low-pass pickup envelope changed");
assert(contract.rescueFirst.route === "rescue" && contract.rescueFirst.requiredSurvivors === 3, "rescue-first branch is malformed");
assert(contract.rescueFirst.expireSite === "data", "rescue-first must lose the data capsule");
assert(contract.dataFirst.route === "intel" && contract.dataFirst.requiredSurvivors === 2, "data-first branch is malformed");
assert(contract.dataFirst.expireSite === "crew-c", "data-first must lose exactly crew-c");
assert(JSON.stringify(contract.dataFirst.reinforcement.types) === JSON.stringify(["mig31", "mig31"]), "data-first MiG-31 reinforcement changed");
assert(contract.epilogueByRoute.rescue.length === 3 && contract.epilogueByRoute.intel.length === 3, "route epilogues are missing");

assert(mission.friendlies?.wingmen?.length === 1, "M07 must field LARK as the sole combat wingman");
assert(mission.friendlies.wingmen[0].type === "fa18" && mission.friendlies.wingmen[0].label === "ROOK 2 LARK", "post-M06 LARK identity changed");
assert(mission.friendlies.transportGroups?.length === 2, "SAR and patrol flights must be separate transport groups");
assert(mission.friendlies.transportGroups[0].aircraft === "sarFlyingBoat" && mission.friendlies.transportGroups[0].vulnerable, "guarded SAR flying boat is missing");
assert(mission.friendlies.transportGroups[1].aircraft === "e2d" && !mission.friendlies.transportGroups[1].vulnerable, "maritime patrol aircraft is missing");
assert(mission.friendlies.guard?.failBanner === "RESCUE OPERATION LOST", "rescue-aircraft failure contract is missing");

const air = mission.sequence.find((wave) => Array.isArray(wave.types));
const boats = mission.sequence.find((wave) => wave.kind === "naval");
assert(air?.types?.length === 4 && air.types.every((type) => type === "su33"), "opening Su-33 CAP changed");
assert(boats?.fleet?.length === 2 && boats.fleet.every((type) => type === "missileBoat"), "missile-boat interference changed");
assert(boats.tgt === false && boats.rankNeutral === true && boats.concurrent === true, "missile boats must remain optional white contacts");

for (const needle of [
  "const m07State =",
  "function recoverM07Site(id)",
  "function updateM07Recovery()",
  "function m07RecoveryHoldsMission(mission)",
  "resetM07State(MISSIONS[currentMissionIndex])",
  "if (updateM07MissionThreat()) return;",
  "if (m07RecoveryHoldsMission(mission))",
  "Array.isArray(deployment.transportGroups)",
  "routeEpilogue"
]) assert(host.includes(needle), `host contract is missing ${needle}`);

console.log("check_sera_m07_payload: PASS");
console.log("  M07 identity, low-pass recovery choice, SAR guard, optional boats, conditional MiG-31s and route epilogues verified");
