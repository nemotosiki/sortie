#!/usr/bin/env node
import fs from "node:fs";
import {
  MAX_FRAME_DELTA_SECONDS,
  MAX_SIMULATION_STEP_SECONDS,
  frameStepPlan
} from "../src/core/frame-step.js";

const source = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

const assert = (condition, message, details = null) => {
  if (condition) return;
  throw new Error(`check_frame_step: ${message}${details ? `\n${JSON.stringify(details, null, 2)}` : ""}`);
};

for (const fps of [5, 10, 20, 30, 60, 120]) {
  const plan = frameStepPlan(1 / fps, 1);
  assert(Math.abs(plan.rawDelta - 1 / fps) < 1e-12,
    `${fps}fps elapsed time was discarded`, plan);
  assert(Math.abs(plan.simulatedDelta - 1 / fps) < 1e-12,
    `${fps}fps simulation did not match wall time`, plan);
  assert(plan.simulatedStep <= MAX_SIMULATION_STEP_SECONDS + 1e-12,
    `${fps}fps physics step exceeded 1/60s`, plan);
}

const resumed = frameStepPlan(2, 1);
assert(resumed.rawDelta === MAX_FRAME_DELTA_SECONDS,
  "tab-resume frame was not bounded", resumed);
const killCam = frameStepPlan(0.2, 0.18);
assert(Math.abs(killCam.rawDelta - 0.2) < 1e-12
    && Math.abs(killCam.simulatedDelta - 0.036) < 1e-12
    && killCam.simulatedStep <= MAX_SIMULATION_STEP_SECONDS,
  "time-scale substeps mixed wall and simulation time", killCam);

assert(source.includes('from "./src/core/frame-step.js?v='),
  "runtime does not import the shared frame-step planner");
assert(source.includes("const stepPlan = frameStepPlan(rawDt, timeScale);"),
  "runtime does not apply the frame-step planner");
assert(!source.includes("Math.min(clock.getDelta(), 0.05)"),
  "runtime still discards wall time below 20fps");

console.log("check_frame_step: PASS");
console.log(JSON.stringify({
  fiveFps: frameStepPlan(0.2, 1),
  thirtyFps: frameStepPlan(1 / 30, 1),
  killCam,
  maxFrame: MAX_FRAME_DELTA_SECONDS
}, null, 2));
