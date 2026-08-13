#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATTITUDE_LIFT_LOSS_ONSET_DOT,
  ATTITUDE_LIFT_MAX_SINK_SPEED,
  attitudeLiftLossSeverity,
  resetAttitudeLiftState,
  updateAttitudeLiftState
} from "../src/flight/attitude-lift.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details === null ? "" : `\n${JSON.stringify(details, null, 2)}`;
  throw new Error(`check_attitude_lift: ${message}${suffix}`);
}

function simulate({ stability, bankDeg, seconds = 3, fps = 60, state = null }) {
  const attitude = state || resetAttitudeLiftState({});
  const upDot = Math.cos(bankDeg * Math.PI / 180);
  const dt = 1 / fps;
  let y = 0;
  for (let frame = 0; frame < Math.round(seconds * fps); frame += 1) {
    updateAttitudeLiftState(attitude, upDot, stability, dt);
    y += attitude.verticalSpeed * dt;
  }
  return { drop: -y, state: { ...attitude } };
}

assert(Math.abs(attitudeLiftLossSeverity(ATTITUDE_LIFT_LOSS_ONSET_DOT)) < 1e-12,
  "loss must begin at 75 degrees without a step");
assert(attitudeLiftLossSeverity(Math.cos(60 * Math.PI / 180)) === 0,
  "ordinary 60-degree combat bank must remain unaffected");
assert(attitudeLiftLossSeverity(0) > 0 && attitudeLiftLossSeverity(0) < 0.12,
  "knife-edge onset must be present but gentle");
assert(Math.abs(attitudeLiftLossSeverity(-1) - 1) < 1e-12,
  "fully inverted attitude must reach full loss severity");

const stabilityCases = [
  { id: "f4", stability: 0.20 },
  { id: "f16", stability: 0.45 },
  { id: "su57", stability: 0.63 },
  { id: "f22", stability: 1.00 }
].map((entry) => ({ ...entry, ...simulate({ stability: entry.stability, bankDeg: 180 }) }));

for (let i = 1; i < stabilityCases.length; i += 1) {
  assert(stabilityCases[i].drop < stabilityCases[i - 1].drop,
    "higher STABILITY did not reduce inverted altitude loss", stabilityCases);
}
assert(stabilityCases[0].drop > 37 && stabilityCases[0].drop < 41,
  "low-STABILITY three-second inverted drop left the tuned window", stabilityCases[0]);
assert(stabilityCases[1].drop > 30 && stabilityCases[1].drop < 34,
  "F-16-class three-second inverted drop left the tuned window", stabilityCases[1]);
assert(stabilityCases[3].drop > 14 && stabilityCases[3].drop < 18,
  "maximum-STABILITY aircraft became immune or too heavily penalized", stabilityCases[3]);

const knifeEdge = simulate({ stability: 0.45, bankDeg: 90 });
const ordinaryBank = simulate({ stability: 0.20, bankDeg: 60 });
assert(knifeEdge.drop > 0.5 && knifeEdge.drop < 2,
  "knife-edge penalty is not gentle", knifeEdge);
assert(ordinaryBank.drop === 0,
  "normal-bank handling changed", ordinaryBank);

const frameRates = [30, 60, 120].map((fps) => ({
  fps,
  ...simulate({ stability: 0.45, bankDeg: 180, fps })
}));
const frameDrops = frameRates.map((entry) => entry.drop);
assert(Math.max(...frameDrops) - Math.min(...frameDrops) < 0.4,
  "inverted drop is frame-rate dependent", frameRates);

const recoveryState = resetAttitudeLiftState({});
simulate({ stability: 0.45, bankDeg: 180, seconds: 3, state: recoveryState });
const sinkBeforeRecovery = recoveryState.verticalSpeed;
simulate({ stability: 0.45, bankDeg: 0, seconds: 1, state: recoveryState });
assert(Math.abs(recoveryState.verticalSpeed) < Math.abs(sinkBeforeRecovery) * 0.25,
  "upright lift did not arrest accumulated sink", { sinkBeforeRecovery, recoveryState });

const capped = simulate({ stability: 0, bankDeg: 180, seconds: 20 });
assert(capped.state.verticalSpeed === -ATTITUDE_LIFT_MAX_SINK_SPEED,
  "attitude sink exceeded its arcade safety cap", capped);

for (const required of [
  'from "./src/flight/attitude-lift.js?v=20260813-attitude-lift-1"',
  "PLAYER_STABILITY = aircraftStabilityRating(spec);",
  "updateAttitudeLiftState(",
  "tmpV2.dot(WORLD_UP)",
  "return Math.min(\n        playerAttitudeLift.verticalSpeed,",
  "return playerKinematicVelocity(out);",
  "playerKinematicVelocity(velocityOut).addScaledVector(tmpV3, -dropSpeed);",
  "hook.flight.aerodynamicVerticalSpeed = playerAttitudeLift.verticalSpeed;"
]) {
  assert(indexSource.includes(required), `production integration is missing: ${required}`);
}
assert(!indexSource.includes("STALL_SINK_RATE * stallSeverity + playerAttitudeLift"),
  "stall and attitude sink were added as duplicate penalties");

console.log("check_attitude_lift: PASS");
console.log(`  ordinary bank 60deg drop=${ordinaryBank.drop.toFixed(2)}m; knife-edge 90deg drop=${knifeEdge.drop.toFixed(2)}m`);
console.log(`  inverted 3s: ${stabilityCases.map((entry) => `${entry.id}=${entry.drop.toFixed(1)}m`).join(", ")}`);
console.log(`  30/60/120fps spread=${(Math.max(...frameDrops) - Math.min(...frameDrops)).toFixed(3)}m; sink cap=${ATTITUDE_LIFT_MAX_SINK_SPEED}m/s`);

