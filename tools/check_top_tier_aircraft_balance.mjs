#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[1], "../..");
const source = fs.readFileSync(path.join(root, "index.html"), "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`check_top_tier_aircraft_balance: FAIL - ${message}`);
    process.exit(1);
  }
}

function aircraftBlock(id) {
  const match = source.match(new RegExp(
    `^      ${id}: Object\\.freeze\\(\\{\\n        id: "${id}",[\\s\\S]*?^      \\}\\),`,
    "m"
  ));
  assert(match, `AIRCRAFT_TYPES.${id} missing`);
  return match[0];
}

function numericField(block, key) {
  const match = block.match(new RegExp(`\\b${key}:\\s*([0-9.]+)`));
  assert(match, `${key} missing`);
  return Number(match[1]);
}

const statKeys = [
  "cruiseSpeed", "boostSpeed", "brakeSpeed", "boostResponse",
  "brakeResponse", "cruiseResponse", "pitchRateDeg", "rollRateDeg",
  "yawRateDeg", "maxBankAngleDeg", "normalRollSpring",
  "rollRateLimitDeg", "turnRateDeg", "rollDamping", "stallWarnSpeed",
  "stallEntrySpeed", "stallAuthorityLoss", "structuralG", "gunDamage",
  "missileDamage", "missileCapacity", "maxHealth"
];

function parsedAircraft(id) {
  const block = aircraftBlock(id);
  return Object.fromEntries(statKeys.map((key) => [key, numericField(block, key)]));
}

const orderMatch = source.match(/const AIRCRAFT_ORDER = \[([\s\S]*?)\n    \];/);
assert(orderMatch, "AIRCRAFT_ORDER missing");
const order = [...orderMatch[1].matchAll(/"([a-z0-9]+)"/g)].map((match) => match[1]);
const fleet = Object.fromEntries(order.map((id) => [id, parsedAircraft(id)]));

const tables = {
  AIRCRAFT_TYPES: {
    ...fleet,
    f22: Object.freeze({
      ...fleet.f22,
      id: "f22",
      label: "F-22 RAPTOR",
      theme: Object.freeze({ variant: "raptor" }),
      spw: Object.freeze({ key: "aam4", capacity: 20 })
    })
  },
  ENEMY_AI_PROFILES: {
    f22: Object.freeze({
      behavior: "evasive",
      hitboxScale: 0.94,
      patrolSpeedScale: 1.06,
      patrolPathScale: 1.12,
      engageRange: 1060,
      disengageRange: 1680,
      pursuitBack: 96,
      verticalBias: 20,
      verticalAmplitude: 36,
      verticalFrequency: 1.6,
      evadeLateral: 82,
      evadeVertical: 32,
      evadeFrequency: 2.4,
      speedResponse: 0.014,
      theme: Object.freeze({ variant: "raptor" })
    })
  },
  ENEMY_MISSILE_PROFILES: {
    f22: Object.freeze({ range: 1420, damage: 98 })
  }
};

const registrations = { aircraftOptions: null, models: {} };
const context = {
  tables,
  addAircraft(id, spec, options) {
    tables.AIRCRAFT_TYPES[id] = Object.freeze(spec);
    registrations.aircraftOptions = options;
  },
  addEnemyProfile(id, spec) {
    tables.ENEMY_AI_PROFILES[id] = Object.freeze(spec);
  },
  addEnemyMissileProfile(id, spec) {
    tables.ENEMY_MISSILE_PROFILES[id] = Object.freeze(spec);
  },
  addAircraftModel(id, spec) {
    registrations.models[id] = spec;
  }
};

const payloadSource = fs.readFileSync(path.join(root, "payloads", "aircraft_f3.payload.js"), "utf8");
const payloadUrl = `data:text/javascript;base64,${Buffer.from(payloadSource).toString("base64")}`;
const { default: registerF3 } = await import(payloadUrl);
registerF3(context);

const f22 = tables.AIRCRAFT_TYPES.f22;
const su57 = fleet.su57;
const f3 = tables.AIRCRAFT_TYPES.f3;

assert(f3 && tables.ENEMY_AI_PROFILES.f3 && tables.ENEMY_MISSILE_PROFILES.f3, "F-3 combat registries incomplete");
assert(registrations.models.f3, "F-3 model missing");
assert(f3.enemyOnly === true && registrations.aircraftOptions?.order === false, "F-3 must remain non-playable");
assert(!order.includes("f3"), "F-3 leaked into AIRCRAFT_ORDER");

const axisMean = (key) => Object.values(fleet).reduce((sum, spec) => sum + spec[key], 0) / order.length;
const means = Object.fromEntries(
  ["turnRateDeg", "pitchRateDeg", "rollRateDeg", "yawRateDeg"].map((key) => [key, axisMean(key)])
);
const mobility = (spec) =>
  (spec.turnRateDeg / means.turnRateDeg) * 0.35 +
  (spec.pitchRateDeg / means.pitchRateDeg) * 0.30 +
  (spec.rollRateDeg / means.rollRateDeg) * 0.25 +
  (spec.yawRateDeg / means.yawRateDeg) * 0.10;
const stability = (spec) =>
  spec.rollDamping * 10 - spec.stallEntrySpeed * 0.3 - spec.stallAuthorityLoss * 30;

assert(f3.boostSpeed > f22.boostSpeed && f22.boostSpeed > su57.boostSpeed, "speed order must be F-3 > F-22 > Su-57");
assert(stability(f22) > stability(f3) && stability(f3) > stability(su57), "stability order must be F-22 > F-3 > Su-57");
assert(f22.missileCapacity > f3.missileCapacity && f3.missileCapacity > su57.missileCapacity, "missile order must be F-22 > F-3 > Su-57");
assert(f22.maxHealth === su57.maxHealth && su57.maxHealth > f3.maxHealth, "durability order must be F-22 = Su-57 > F-3");
assert(mobility(su57) > mobility(f22) && mobility(f22) > mobility(f3), "mobility order must be Su-57 > F-22 > F-3");

assert(f3.boostSpeed < fleet.mig31.boostSpeed, "F-3 must not replace MiG-31 as the absolute speed specialist");
assert(f22.missileCapacity - f3.missileCapacity >= 4 && f3.missileCapacity - su57.missileCapacity >= 4, "missile grades are not perceptibly separated");
assert(mobility(su57) - mobility(f22) >= 0.15 && mobility(f22) - mobility(f3) >= 0.10, "mobility grades are not perceptibly separated");
assert(stability(f22) - stability(f3) >= 10 && stability(f3) - stability(su57) >= 20, "stability grades are not perceptibly separated");

for (const spec of [f22, su57, f3]) {
  assert(spec.brakeSpeed - 52 >= spec.stallEntrySpeed, `${spec.id || "top-tier aircraft"} violates brake/stall invariant`);
}

const f3AI = tables.ENEMY_AI_PROFILES.f3;
assert(f3AI.patrolPathScale >= 1.25 && f3AI.pursuitBack >= 180, "F-3 AI must fly wide, standoff passes");
assert(f3AI.disengageRange > f3AI.engageRange, "F-3 AI engagement hysteresis is invalid");

console.log("check_top_tier_aircraft_balance: PASS");
console.log(`  speed: F-3 ${f3.boostSpeed} > F-22 ${f22.boostSpeed} > Su-57 ${su57.boostSpeed}`);
console.log(`  missiles: F-22 ${f22.missileCapacity} > F-3 ${f3.missileCapacity} > Su-57 ${su57.missileCapacity}`);
console.log(`  durability: F-22 ${f22.maxHealth} = Su-57 ${su57.maxHealth} > F-3 ${f3.maxHealth}`);
console.log(`  stability score: ${stability(f22).toFixed(1)} > ${stability(f3).toFixed(1)} > ${stability(su57).toFixed(1)}`);
console.log(`  mobility score: ${mobility(su57).toFixed(3)} > ${mobility(f22).toFixed(3)} > ${mobility(f3).toFixed(3)}`);
