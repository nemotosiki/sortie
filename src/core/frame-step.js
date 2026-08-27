// Render cadence and simulation cadence are separate concerns. Preserve up to
// 250ms of real elapsed time, then divide simulated time into <= 1/60s slices.
// This keeps a temporary 5-20fps render slowdown from making HUD speed and
// wall-clock displacement disagree, while the cap prevents a tab-resume spiral.

export const MAX_FRAME_DELTA_SECONDS = 0.25;
export const MAX_SIMULATION_STEP_SECONDS = 1 / 60;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function frameStepPlan(rawDeltaSeconds, timeScale = 1) {
  const raw = clamp(Number(rawDeltaSeconds) || 0, 0, MAX_FRAME_DELTA_SECONDS);
  const scale = clamp(Number(timeScale) || 0, 0, 4);
  const simulated = raw * scale;
  const steps = Math.max(1, Math.ceil(simulated / MAX_SIMULATION_STEP_SECONDS));
  return Object.freeze({
    rawDelta: raw,
    simulatedDelta: simulated,
    steps,
    rawStep: raw / steps,
    simulatedStep: simulated / steps
  });
}
