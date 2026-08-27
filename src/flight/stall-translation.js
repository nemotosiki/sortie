// WORLD-space translation while a fixed-wing aircraft is aerodynamically
// stalled. The normal arcade model points velocity wherever the nose points;
// that is responsive while the wing is flying, but it lets a deep-stalled jet
// climb forever merely by holding its nose at the sky. During a stall we retain
// the flight path that existed at entry, apply drag and WORLD-down gravity, and
// only let the nose recapture that path as lift returns.

export const STALL_TRANSLATION_ACTIVATION = 0.08;
export const STALL_TRANSLATION_RELEASE = 0.02;
export const STALL_WORLD_GRAVITY = 9.80665;
export const STALL_DRAG_RATE = 0.24;
export const STALL_RECOVERY_CAPTURE_RATE = 5.0;
export const STALL_TERMINAL_FALL_SPEED = 180;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep01(value) {
  const x = clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
}

export function resetStallTranslationState(state = {}) {
  state.active = false;
  state.x = 0;
  state.y = 0;
  state.z = 0;
  state.gravityWeight = 0;
  return state;
}

export function updateStallTranslationState(state, desiredVelocity, stallSeverity, dt) {
  const severity = clamp(Number(stallSeverity) || 0, 0, 1);
  const elapsed = Math.max(0, Number(dt) || 0);
  const desiredX = Number(desiredVelocity?.x) || 0;
  const desiredY = Number(desiredVelocity?.y) || 0;
  const desiredZ = Number(desiredVelocity?.z) || 0;

  if (!state.active) {
    state.x = desiredX;
    state.y = desiredY;
    state.z = desiredZ;
    if (severity < STALL_TRANSLATION_ACTIVATION || elapsed <= 0) {
      state.gravityWeight = 0;
      return state;
    }
    state.active = true;
  }

  // Lift fades progressively rather than switching off at one magic speed.
  // Deep stall reaches full gravity; early buffet keeps most of the authored
  // arcade flight path and therefore does not produce a visible step.
  const gravityWeight = smoothstep01(
    (severity - STALL_TRANSLATION_RELEASE) /
      (STALL_TRANSLATION_ACTIVATION + 0.62 - STALL_TRANSLATION_RELEASE)
  );
  state.gravityWeight = gravityWeight;

  // Separated flow removes kinetic energy. Damping all three WORLD components
  // prevents an upward entry velocity from being immortal, while gravity below
  // still establishes an actual downward terminal fall.
  const drag = Math.exp(-STALL_DRAG_RATE * gravityWeight * elapsed);
  state.x *= drag;
  state.y *= drag;
  state.z *= drag;
  state.y = Math.max(
    -STALL_TERMINAL_FALL_SPEED,
    state.y - STALL_WORLD_GRAVITY * gravityWeight * elapsed
  );

  // At severity 1 the nose has no authority over the flight path. As lift
  // returns, the path smoothly converges on the ordinary nose-led velocity and
  // only then hands control back to the normal model.
  const captureRate = STALL_RECOVERY_CAPTURE_RATE * Math.pow(1 - severity, 2);
  const capture = 1 - Math.exp(-captureRate * elapsed);
  state.x += (desiredX - state.x) * capture;
  state.y += (desiredY - state.y) * capture;
  state.z += (desiredZ - state.z) * capture;

  if (severity <= STALL_TRANSLATION_RELEASE) {
    const error = Math.hypot(
      desiredX - state.x,
      desiredY - state.y,
      desiredZ - state.z
    );
    if (error < 1) {
      state.active = false;
      state.x = desiredX;
      state.y = desiredY;
      state.z = desiredZ;
      state.gravityWeight = 0;
    }
  }
  return state;
}
