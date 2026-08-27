#!/usr/bin/env node
import {
  FLIGHT_GRAVITY_MPS2,
  neutralThrottleForEnvelope,
  resetFlightDynamicsState,
  updateFlightDynamicsState
} from "../src/flight/flight-dynamics.js";
import { highAltitudeEnvelopeAt } from "../src/flight/high-altitude-envelope.js";

const assert = (condition, message, details = null) => {
  if (condition) return;
  throw new Error(`check_flight_dynamics: ${message}${details ? `\n${JSON.stringify(details, null, 2)}` : ""}`);
};
const near = (actual, expected, tolerance, message) => {
  assert(Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected} +/- ${tolerance}, got ${actual}`);
};
const stepFor = (state, input, seconds, dt = 1 / 60) => {
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += dt) {
    updateFlightDynamicsState(state, input, Math.min(dt, seconds - elapsed));
  }
  return state;
};

const sea = highAltitudeEnvelopeAt(0, 70, 540);
const base = {
  forward: { x: 0, y: 0, z: -1 },
  up: { x: 0, y: 1, z: 0 },
  baseCruiseSpeed: 270,
  baseMaxSpeed: 540,
  baseStallSpeed: 70,
  structuralG: 3.1,
  stability: 0.8,
  envelope: sea,
  pathTurnRate: Math.PI,
  throttle: neutralThrottleForEnvelope(270, 540, sea),
  airBrake: 0
};

const trim = resetFlightDynamicsState({}, { x: 0, y: 0, z: -270 });
stepFor(trim, base, 20);
assert(Math.abs(trim.y) < 1.5, "level trim did not balance gravity", trim);
assert(Math.abs(trim.airspeed - 270) < 3, "neutral throttle did not hold cruise speed", trim);
near(trim.forces.gravity.y, -FLIGHT_GRAVITY_MPS2, 1e-12,
  "gravity is not the single WORLD-down acceleration");

const coast = resetFlightDynamicsState({}, { x: 0, y: 0, z: -270 });
const braked = resetFlightDynamicsState({}, { x: 0, y: 0, z: -270 });
stepFor(coast, base, 5);
stepFor(braked, { ...base, throttle: 0.03, airBrake: 1 }, 5);
assert(coast.airspeed - braked.airspeed > 55,
  "airbrake did not materially reduce actual velocity", { coast, braked });

const stalledLevel = resetFlightDynamicsState({}, { x: 0, y: 0, z: -55 });
stepFor(stalledLevel, { ...base, throttle: 0 }, 4);
assert(stalledLevel.y < -12 && stalledLevel.stallRatio > 0.18,
  "low-energy aircraft did not fall under WORLD gravity", stalledLevel);

const noseDown = resetFlightDynamicsState({}, { x: 0, y: 0, z: -70 });
const noseUp = resetFlightDynamicsState({}, { x: 0, y: 0, z: -70 });
const downDirection = { x: 0, y: -0.5, z: -Math.sqrt(0.75) };
const upDirection = { x: 0, y: 0.5, z: -Math.sqrt(0.75) };
stepFor(noseDown, { ...base, forward: downDirection, throttle: 1 }, 5);
stepFor(noseUp, { ...base, forward: upDirection, throttle: 1 }, 5);
assert(noseDown.y < noseUp.y - 18 && noseDown.airspeed > noseUp.airspeed + 8,
  "nose-down recovery and nose-up departure are not dynamically distinct",
  { noseDown, noseUp });
assert(noseDown.controlAuthority.pitchDown >= 0.3
    && noseDown.controlAuthority.roll >= 0.18
    && noseDown.controlAuthority.yaw >= 0.12,
  "stall removed all control authority", noseDown.controlAuthority);

const fpsRun = (dt) => {
  const state = resetFlightDynamicsState({}, { x: 0, y: 0, z: -55 });
  stepFor(state, { ...base, throttle: 1 }, 10, dt);
  return state;
};
const fps = [fpsRun(1 / 30), fpsRun(1 / 60), fpsRun(1 / 120)];
assert(Math.max(...fps.map((sample) => sample.y)) - Math.min(...fps.map((sample) => sample.y)) < 0.5,
  "flight integration is frame-rate dependent", fps);
assert(Math.max(...fps.map((sample) => sample.airspeed)) - Math.min(...fps.map((sample) => sample.airspeed)) < 0.2,
  "airspeed integration is frame-rate dependent", fps);

console.log("check_flight_dynamics: PASS");
console.log(JSON.stringify({
  trim: { speed: trim.airspeed, verticalSpeed: trim.y },
  brakeDelta: coast.airspeed - braked.airspeed,
  stall: { verticalSpeed: stalledLevel.y, ratio: stalledLevel.stallRatio },
  recovery: {
    noseDownSpeed: noseDown.airspeed,
    noseDownVy: noseDown.y,
    noseUpSpeed: noseUp.airspeed,
    noseUpVy: noseUp.y
  },
  fps: fps.map(({ airspeed, y }) => ({ airspeed, y }))
}, null, 2));
