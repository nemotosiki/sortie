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

function simulate({ desired, severity = 1, seconds = 8, fps = 60 }) {
  const state = resetStallTranslationState({});
  const dt = 1 / fps;
  let x = 0;
  let y = 0;
  let z = 0;
  let peakY = 0;
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
assert(noseUp.peakY > 0, "a climbing stall lost all entry inertia", noseUp);
assert(noseUp.state.y < -24 && noseUp.position.y < noseUp.peakY - 45,
  "nose-up deep stall never passed its ballistic peak into WORLD-down fall", noseUp);
assert(Math.hypot(noseUp.position.x, noseUp.position.z) < 1e-9,
  "vertical stall invented lateral motion", noseUp);

const directionState = resetStallTranslationState({});
updateStallTranslationState(directionState, { x: 0, y: 70, z: 0 }, 1, 1 / 60);
for (let frame = 0; frame < 360; frame += 1) {
  updateStallTranslationState(directionState, { x: 90, y: 0, z: 0 }, 1, 1 / 60);
}
assert(Math.abs(directionState.x) < 1e-9 && directionState.y < 0,
  "deep-stalled velocity rotated with the aircraft nose", directionState);

const frameRates = [30, 60, 120].map((fps) => ({ fps, ...simulate({ desired: { x: 0, y: 70, z: 0 }, fps }) }));
const finalY = frameRates.map((entry) => entry.position.y);
assert(Math.max(...finalY) - Math.min(...finalY) < 2,
  "stall fall is frame-rate dependent", frameRates);

const recovery = resetStallTranslationState({});
for (let frame = 0; frame < 240; frame += 1) {
  updateStallTranslationState(recovery, { x: 0, y: 0, z: -80 }, 1, 1 / 60);
}
for (let frame = 0; frame < 240 && recovery.active; frame += 1) {
  updateStallTranslationState(recovery, { x: 0, y: 0, z: -80 }, 0, 1 / 60);
}
assert(!recovery.active && Math.abs(recovery.y) < 1 && Math.abs(recovery.z + 80) < 1,
  "recovered wing did not smoothly recapture the normal flight path", recovery);
assert(noseUp.state.y >= -STALL_TERMINAL_FALL_SPEED,
  "stall fall exceeded the arcade terminal-speed cap", noseUp);

console.log("check_stall_translation: PASS");
console.log(`  nose-up peak=${noseUp.peakY.toFixed(1)}m, y@8s=${noseUp.position.y.toFixed(1)}m, vy=${noseUp.state.y.toFixed(1)}m/s`);
console.log(`  30/60/120fps spread=${(Math.max(...finalY) - Math.min(...finalY)).toFixed(3)}m`);
