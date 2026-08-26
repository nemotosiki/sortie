#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  aircraftCornerSpeed,
  constrainedAircraftTurn,
  managedCombatTurnSpeed,
  resetAerodynamicStallState,
  updateAerodynamicStallState
} from "../src/flight/aircraft-envelope.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details === null ? "" : `\n${JSON.stringify(details, null, 2)}`;
  throw new Error(`check_enemy_flight_envelope: ${message}${suffix}`);
}

const f16 = {
  cruiseSpeed: 260,
  boostSpeed: 570,
  stallEntrySpeed: 82,
  structuralG: 3,
  stallAuthorityLoss: 0.7,
  baseTurnRate: 29 * Math.PI / 180
};
const cornerSpeed = aircraftCornerSpeed(f16.stallEntrySpeed, f16.structuralG);

function turnAt(speed, stallSeverity = 0) {
  return constrainedAircraftTurn({
    speed,
    referenceSpeed: f16.cruiseSpeed,
    stallEntrySpeed: f16.stallEntrySpeed,
    structuralG: f16.structuralG,
    baseTurnRate: f16.baseTurnRate,
    maximumGain: 1.25,
    minimumGain: 0.25,
    stallSeverity,
    stallAuthorityLoss: f16.stallAuthorityLoss
  });
}

const high = turnAt(f16.boostSpeed);
const cruise = turnAt(f16.cruiseSpeed);
const corner = turnAt(cornerSpeed);
const stalledCorner = turnAt(cornerSpeed, 1);
assert(high.rate < cruise.rate,
  "maximum-speed enemy did not lose turn performance", { high, cruise, cornerSpeed });
assert(corner.rate > cruise.rate && corner.gain === 1.25,
  "corner-speed enemy did not receive the capped high-G turn", { high, cruise, corner });
assert(stalledCorner.rate < corner.rate * 0.35 && Math.abs(stalledCorner.authority - 0.3) < 1e-9,
  "stall did not remove the configured control authority", { corner, stalledCorner });

const straight = managedCombatTurnSpeed({
  commandedSpeed: 310,
  headingErrorRad: 0,
  stallSeverity: 0,
  stallEntrySpeed: f16.stallEntrySpeed,
  structuralG: f16.structuralG,
  cruiseSpeed: f16.cruiseSpeed,
  maxSpeed: f16.boostSpeed
});
const hardTurn = managedCombatTurnSpeed({
  commandedSpeed: 310,
  headingErrorRad: Math.PI / 2,
  stallSeverity: 0,
  stallEntrySpeed: f16.stallEntrySpeed,
  structuralG: f16.structuralG,
  cruiseSpeed: f16.cruiseSpeed,
  maxSpeed: f16.boostSpeed
});
const recoveryThrottle = managedCombatTurnSpeed({
  commandedSpeed: 110,
  headingErrorRad: Math.PI / 2,
  stallSeverity: 0.5,
  stallEntrySpeed: f16.stallEntrySpeed,
  structuralG: f16.structuralG,
  cruiseSpeed: f16.cruiseSpeed,
  maxSpeed: f16.boostSpeed
});
assert(straight.targetSpeed === 310,
  "straight flight bled energy without a turn request", straight);
assert(hardTurn.targetSpeed < straight.targetSpeed && hardTurn.targetSpeed > f16.stallEntrySpeed,
  "hard-turn AI did not brake into a safe corner-speed band", { straight, hardTurn });
assert(recoveryThrottle.recovering && recoveryThrottle.targetSpeed >= f16.cruiseSpeed,
  "stalled AI did not abandon the turn-speed request for recovery throttle", recoveryThrottle);

function simulateStall({ speed, seconds, state, fps = 60, turnDemand = 1 }) {
  const dt = 1 / fps;
  for (let i = 0; i < Math.round(seconds * fps); i += 1) {
    updateAerodynamicStallState(state, {
      speed,
      stallEntrySpeed: f16.stallEntrySpeed,
      deepStallSpeed: 62,
      recoverySpeed: 114,
      stallAuthorityLoss: f16.stallAuthorityLoss,
      turnDemand,
      noseHighDemand: 0.35
    }, dt);
  }
  return state;
}

const stall = simulateStall({
  speed: 52,
  seconds: 2,
  state: resetAerodynamicStallState({})
});
assert(stall.stalling && stall.severity > 0.7 && stall.controlAuthority < 0.5,
  "sustained low-speed turn did not enter a material stall", stall);
const stalledSnapshot = { ...stall };
const recovered = simulateStall({ speed: 260, seconds: 2, state: stall, turnDemand: 0 });
assert(!recovered.stalling && recovered.severity < 0.05 && recovered.controlAuthority > 0.95,
  "cruise-speed recovery did not restore the wing", recovered);

for (const required of [
  'from "./src/flight/aircraft-envelope.js?v=20260813-enemy-envelope-1"',
  "updateEnemyAerodynamicState(enemy, dt);",
  "applyEnemyEnergyManagement(enemy, enemy.headingError);",
  "const turnRate = enemyConstrainedTurn(enemy, requestedRate);",
  "applyEnemyStallNoseDrop(enemy, dt);",
  "moveEnemyFixedWing(enemy, dt);",
  "stallState: resetAerodynamicStallState({}),",
  "stability: aircraftStabilityRating(air),",
  "altitudeAdjustedFlightVelocity(",
  "enemyEffectiveVerticalSpeed(enemy)",
  "enemy.velocity,\n        enemy.velocity"
]) {
  assert(indexSource.includes(required), `production integration is missing: ${required}`);
}

console.log("check_enemy_flight_envelope: PASS");
console.log(`  F-16 turn gain: boost=${high.gain.toFixed(2)}, cruise=${cruise.gain.toFixed(2)}, corner=${corner.gain.toFixed(2)}`);
console.log(`  hard-turn target=${hardTurn.targetSpeed.toFixed(1)} (corner=${cornerSpeed.toFixed(1)}); recovery target=${recoveryThrottle.targetSpeed.toFixed(1)}`);
console.log(`  low-speed stall severity=${stalledSnapshot.severity.toFixed(3)}; recovered severity=${recovered.severity.toFixed(3)}`);
