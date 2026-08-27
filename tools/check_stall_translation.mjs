#!/usr/bin/env node
import {
  STALL_TERMINAL_FALL_SPEED,
  resetStallTranslationState,
  updateStallTranslationState
} from "../src/flight/stall-translation.js";
import {
  GAME_SERVICE_CEILING_M,
  altitudeAdjustedStallThreshold,
  highAltitudeEnvelopeAt
} from "../src/flight/high-altitude-envelope.js";

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details === null ? "" : `\n${JSON.stringify(details, null, 2)}`;
  throw new Error(`check_stall_translation: ${message}${suffix}`);
}

function simulate({
  entry = { x: 0, y: 0, z: -70 },
  desired,
  severity = 1,
  seconds = 8,
  fps = 60,
  kernelOptions = {}
}) {
  const state = resetStallTranslationState({});
  const dt = 1 / fps;
  let x = 0;
  let y = 0;
  let z = 0;
  let peakY = 0;
  // Establish the actual pre-stall flight path before the body attitude moves.
  // A nose change on the next frame must not rewrite this inertia.
  updateStallTranslationState(state, entry, 0, 0);
  for (let frame = 0; frame < Math.round(seconds * fps); frame += 1) {
    updateStallTranslationState(state, desired, severity, dt, kernelOptions);
    x += state.x * dt;
    y += state.y * dt;
    z += state.z * dt;
    peakY = Math.max(peakY, y);
  }
  return { state: { ...state }, position: { x, y, z }, peakY };
}

const noseUp = simulate({ desired: { x: 0, y: 70, z: 0 } });
assert(noseUp.peakY === 0 && noseUp.position.y < -100 && noseUp.state.y < -20,
  "moving the nose upward manufactured climb instead of WORLD-down fall", noseUp);
assert(noseUp.position.z < -100,
  "stall entry discarded the pre-existing horizontal inertia", noseUp);

const directionState = resetStallTranslationState({});
updateStallTranslationState(directionState, { x: 0, y: 0, z: -70 }, 0, 0);
for (let frame = 0; frame < 360; frame += 1) {
  updateStallTranslationState(directionState, { x: 90, y: 0, z: 0 }, 1, 1 / 60);
}
assert(Math.abs(directionState.x) < 20 && directionState.z < -10 && directionState.y < 0,
  "deep-stalled velocity rotated with the aircraft nose", directionState);

const frameRates = [30, 60, 120].map((fps) => ({ fps, ...simulate({ desired: { x: 0, y: 70, z: 0 }, fps }) }));
const finalY = frameRates.map((entry) => entry.position.y);
assert(Math.max(...finalY) - Math.min(...finalY) < 2,
  "stall fall is frame-rate dependent", frameRates);

const recovery = resetStallTranslationState({});
updateStallTranslationState(recovery, { x: 0, y: 0, z: -80 }, 0, 0);
for (let frame = 0; frame < 240; frame += 1) {
  updateStallTranslationState(recovery, { x: 0, y: 0, z: -80 }, 1, 1 / 60);
}
// Recovery first lowers the nose into the actual descending flight path.  Only
// after angle of attack collapses may lift recapture the commanded speed.
for (let frame = 0; frame < 240 && recovery.active; frame += 1) {
  const length = Math.hypot(recovery.x, recovery.y, recovery.z) || 1;
  updateStallTranslationState(recovery, {
    x: recovery.x / length * 80,
    y: recovery.y / length * 80,
    z: recovery.z / length * 80
  }, 0, 1 / 60);
}
assert(!recovery.active && Math.abs(Math.hypot(recovery.x, recovery.y, recovery.z) - 80) < 1,
  "lowering the nose into the flight path did not recover the wing", recovery);
assert(noseUp.state.y >= -STALL_TERMINAL_FALL_SPEED,
  "stall fall exceeded the arcade terminal-speed cap", noseUp);

// M11/F-35C reproduction: at 9,144m the shared envelope permits 426.6m/s,
// requires 327.6m/s for control and 399.5m/s for full recovery. The old kernel
// fell to 138.1m/s after this exact 20-degree nose-down/full-power run because
// low-speed severity simultaneously imposed full drag and removed engine
// thrust. AOA-separated drag must now let the real path cross recovery speed.
const f35M11Envelope = highAltitudeEnvelopeAt(GAME_SERVICE_CEILING_M, 70, 540);
const f35M11RecoverySpeed = altitudeAdjustedStallThreshold(
  114,
  70,
  f35M11Envelope
);
const f35M11Target = f35M11Envelope.availableMaxSpeed;
const f35M11Pitch = 20 * Math.PI / 180;
const f35M11Recovery = simulate({
  entry: { x: 0, y: 0, z: -270 },
  desired: {
    x: 0,
    y: -Math.sin(f35M11Pitch) * f35M11Target,
    z: -Math.cos(f35M11Pitch) * f35M11Target
  },
  seconds: 20,
  kernelOptions: { thrustFactor: f35M11Envelope.thrustFactor }
});
assert(Math.hypot(
  f35M11Recovery.state.x,
  f35M11Recovery.state.y,
  f35M11Recovery.state.z
) > f35M11RecoverySpeed, "F-35C M11 nose-down recovery remains impossible", f35M11Recovery);
assert(f35M11Recovery.position.y < -1000
    && f35M11Recovery.state.separatedFlow < 0.05
    && f35M11Recovery.state.engineAuthority > 0.95,
  "F-35C recovery did not trade altitude for low-AOA acceleration", f35M11Recovery);

const f35FrameRates = [30, 60, 120].map((fps) => ({
  fps,
  ...simulate({
    entry: { x: 0, y: 0, z: -270 },
    desired: {
      x: 0,
      y: -Math.sin(f35M11Pitch) * f35M11Target,
      z: -Math.cos(f35M11Pitch) * f35M11Target
    },
    seconds: 20,
    fps,
    kernelOptions: { thrustFactor: f35M11Envelope.thrustFactor }
  })
}));
const f35FinalSpeeds = f35FrameRates.map(({ state }) =>
  Math.hypot(state.x, state.y, state.z));
assert(Math.max(...f35FinalSpeeds) - Math.min(...f35FinalSpeeds) < 1,
  "F-35C recovery speed is frame-rate dependent", f35FrameRates);

console.log("check_stall_translation: PASS");
console.log(`  nose-up peak=${noseUp.peakY.toFixed(1)}m, y@8s=${noseUp.position.y.toFixed(1)}m, vy=${noseUp.state.y.toFixed(1)}m/s`);
console.log(`  30/60/120fps spread=${(Math.max(...finalY) - Math.min(...finalY)).toFixed(3)}m`);
console.log(`  F-35C M11 nose-down recovery=${f35FinalSpeeds[1].toFixed(1)}m/s`);
