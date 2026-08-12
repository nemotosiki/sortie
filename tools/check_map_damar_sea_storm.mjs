#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = path.join(root, "payloads", "map_damarSeaStorm.payload.js");
const hostPath = path.join(root, "index.html");

function assert(condition, message) {
  if (!condition) throw new Error(`[damar-sea-storm] ${message}`);
}

const source = fs.readFileSync(payloadPath, "utf8");
const host = fs.readFileSync(hostPath, "utf8");
const executable = source.replace("export default function register", "function register") + "\nregister;";
const register = vm.runInNewContext(executable, { Object, Math, Error });

const stormOcean = {
  label: "STORM FRONT",
  atmosphere: { seed: 1 },
  ocean: { normalScale: [1, 1] },
  terrain: { seed: 2 },
  lights: {},
  mountains: { count: 2 },
  islands: { count: 4 },
  clouds: { scale: 1 },
  decor: { seed: 3 }
};
const worlds = { stormOcean };
const decorators = [];
register({
  tables: { WORLD_PRESETS: worlds },
  addWorldPreset(id, def) { assert(!worlds[id], `duplicate world ${id}`); worlds[id] = def; },
  addWorldDecorator(id, def) { decorators.push({ id, ...def }); }
});

const world = worlds.damarSeaStorm;
assert(world, "damarSeaStorm was not registered");
assert(world !== stormOcean, "Damar world aliases stormOcean instead of deriving a distinct preset");
assert(world.regionId === "damar_sea", "regionId must be damar_sea");
assert(world.variant === "storm_evening_rescue", "storm rescue variant is missing");
assert(world.sectorIds?.includes("west_rescue_lane"), "west rescue lane sector is missing");
assert(world.fog?.far >= 2600 && world.fog?.far <= 3200, "rescue visibility band drifted outside the playable contract");
assert(world.mountains?.count === 0 && world.islands?.count === 0, "authored open-sea lane is obstructed by random land");
assert(world.decor?.extraIslands?.count === 0, "random islands can hide rescue sites");

const anchors = world.missionAnchors;
assert(anchors?.rescueSites?.length === 4, "expected three survivor sites and one data capsule");
const ids = new Set(anchors.rescueSites.map((site) => site.id));
for (const id of ["crown", "crew-b", "crew-c", "data"]) assert(ids.has(id), `missing rescue site ${id}`);
assert(anchors.rescueSites.filter((site) => site.kind === "survivor").length === 3, "survivor site count changed");
assert(anchors.rescueSites.filter((site) => site.kind === "data").length === 1, "data site count changed");
assert(anchors.playerStart?.length === 2 && anchors.enemyCapEntry?.length === 2, "mission approach anchors are malformed");

const decorator = decorators.find((entry) => entry.id === "damarSeaRescueLane");
assert(decorator, "Damar rescue-lane decorator was not registered");
assert(decorator.worlds?.length === 1 && decorator.worlds[0] === "damarSeaStorm", "decorator leaks into another world");
assert(typeof decorator.build === "function", "decorator build callback is missing");

for (const needle of [
  "damarNavigationPlatform",
  "m07-site-${id}",
  "damarSarHelicopter1",
  "damarSarHelicopter2",
  "damarStormRain",
  "damarLightningBolt",
  "root.userData.worldTick"
]) assert(source.includes(needle), `visual contract is missing ${needle}`);

assert(host.includes("root.userData.worldTick = null"), "host does not contain the fail-closed decorator animation hook");
assert(host.includes("tick({ camera, dt, time: worldTickTime, gameState })"), "host does not drive decorator animation with camera/time");

console.log("check_map_damar_sea_storm: PASS");
console.log("  distinct Damar storm preset, 4 recovery sites, platform, SAR silhouettes, rain and lightning registered");
