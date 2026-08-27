#!/usr/bin/env node
import {
  STALL_TERMINAL_FALL_SPEED,
  resetStallTranslationState,
  updateStallTranslationState
} from "../src/flight/stall-translation.js";

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
  fps = 60
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
    updateStallTranslationState(state, desired, severity, dt);
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

console.log("check_stall_translation: PASS");
console.log(`  nose-up peak=${noseUp.peakY.toFixed(1)}m, y@8s=${noseUp.position.y.toFixed(1)}m, vy=${noseUp.state.y.toFixed(1)}m/s`);
console.log(`  30/60/120fps spread=${(Math.max(...finalY) - Math.min(...finalY)).toFixed(3)}m`);
