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
const aircraft = Object.fromEntries(["fa18", "e2d", "sarFlyingBoat", "su33", "mig29"].map((id) => [id, {}]));
const profiles = { su33: {}, mig29: {} };
let mission = null;
let options = null;
register({
  tables: {
  MISSIONS: [{ key: "sera-m06", campaign: "sera" }],
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
assert(options?.after === "sera-m06", "integrated insertion must follow Sera M06");

const contract = mission.m07RecoveryContract;
assert(contract?.sites?.length === 3, "automatic rescue route must expose three survivor sites");
assert(contract.sites.every((site) => site.kind === "survivor"), "player-choice data site remained in the rescue route");
assert(contract.requiredSurvivors === 3, "all three survivor sites must be recovered");
assert(contract.autoRecovery?.arriveRadius === 540 && contract.autoRecovery?.pickupTime === 10,
  "SEALIGHT automatic rescue timing is malformed");
assert(JSON.stringify(contract.interference?.types) === JSON.stringify(["mig29", "mig29"]), "M07 recurring interference flight changed");
assert(!contract.interference.hunt && contract.interference.liveCap === 4,
  "M07 white interference must pursue RAVEN with a four-aircraft live cap");
assert(JSON.stringify(contract.midInterference?.types) === JSON.stringify(["mig29", "mig29"])
    && contract.midInterference.triggerRecovered === 1
    && contract.midInterference.skill === "veteran",
  "M07 mid-mission veteran MiG-29A reinforcement is malformed");
assert(!contract.dataFirst && !contract.rescueFirst, "discarded player-choice branches are still authored");
assert(contract.epilogueByRoute.rescue.length === 3, "escort-route epilogue is missing");

assert(mission.friendlies?.wingmen?.length === 1, "M07 must field LARK as the sole combat wingman");
assert(mission.friendlies.wingmen[0].type === "fa18" && mission.friendlies.wingmen[0].label === "ROOK 2 LARK", "post-M06 LARK identity changed");
assert(mission.friendlies.transportGroups?.length === 2, "SAR and patrol flights must be separate transport groups");
assert(mission.friendlies.transportGroups[0].aircraft === "sarFlyingBoat" && mission.friendlies.transportGroups[0].vulnerable, "guarded SAR flying boat is missing");
assert(mission.friendlies.transportGroups[1].aircraft === "e2d" && !mission.friendlies.transportGroups[1].vulnerable, "maritime patrol aircraft is missing");
assert(mission.friendlies.guard?.failBanner === "RESCUE OPERATION LOST", "rescue-aircraft failure contract is missing");
assert(mission.friendlies.guard?.readout === "integrity", "SEALIGHT guard readout must show HP integrity");

const redFlights = mission.sequence.filter((wave) => Array.isArray(wave.types) && wave.tgt !== false);
const boats = mission.sequence.find((wave) => wave.kind === "naval");
assert(redFlights.length === 3 && redFlights.every((wave) => (
  wave.types.length === 2 && wave.types.every((type) => type === "su33")
)), "red Su-33 TGTs must be three two-aircraft flights");
assert(redFlights.reduce((sum, wave) => sum + wave.types.length, 0) === 6,
  "red Su-33 TGT total must be six");
assert(redFlights.every((wave) => wave.hunt === "air"),
  "red TGT Su-33s must attack the protected rescue asset");
assert(!redFlights[0].concurrent && redFlights[1].concurrent && redFlights[1].delay === 30
    && redFlights[2].concurrent && redFlights[2].delay === 60,
  "red Su-33 flights must deploy 2 + 2 + 2 at 30-second intervals");
assert(redFlights.every((wave) => JSON.stringify(wave.at) === JSON.stringify([5400, -4800])),
  "red Su-33 entry must be 1.5x farther from the rescue corridor");
assert(boats?.fleet?.length === 2 && boats.fleet.every((type) => type === "missileBoat"), "missile-boat interference changed");
assert(boats.tgt === false && boats.rankNeutral === true && boats.concurrent === true, "missile boats must remain optional white contacts");
assert(host.includes('id="recoveryAircraftBody"') && host.includes('id="recoveryGaugeFill"'),
  "FRIENDS-style aircraft silhouette/HP gauge is missing");
assert(host.includes('ui.recoveryGaugeLabel.textContent = "SEALIGHT HP"'),
  "FRIENDS gauge is not connected to SEALIGHT HP");
assert(!host.includes("data-recovery-site"), "recovery UI regressed to per-site cells instead of one aircraft image");

for (const needle of [
  "const m07State =",
  "function recoverM07Site(id)",
  "function updateM07AutoRecovery(dt)",
  "function m07RescueUnit()",
  "function updateM07Interference(mission, dt)",
  "function m07RecoveryHoldsMission(mission)",
  "resetM07State(MISSIONS[currentMissionIndex])",
  "if (updateM07MissionThreat(dt)) return;",
  "if (m07RecoveryHoldsMission(mission))",
  "Array.isArray(deployment.transportGroups)",
  "routeEpilogue"
]) assert(host.includes(needle), `host contract is missing ${needle}`);

console.log("check_sera_m07_payload: PASS");
console.log("  M07 identity, SEALIGHT auto-rescue, Su-33 x6 in distant 2-aircraft staggered flights, HP gauge and MiG-29As verified");
