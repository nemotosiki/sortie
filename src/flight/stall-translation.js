// Persistent WORLD-space flight path for a fixed-wing aircraft. Ordinary
// flight follows the nose with a short arcade response; a stalled wing retains
// its real inertia, applies drag and WORLD-down gravity, and only lets the body
// recapture the path after angle of attack and airspeed recover.

export const STALL_TRANSLATION_ACTIVATION = 0.08;
export const STALL_TRANSLATION_RELEASE = 0.02;
export const STALL_WORLD_GRAVITY = 9.80665;
// Linearised separated-flow drag.  0.24 made gravity-only terminal velocity
// about 41m/s, below every fighter's recovery speed, so a deep stall was
// mathematically unrecoverable.  0.08 permits a nose-low dive to rebuild
// 100m/s-class airflow while retaining strong energy loss.
export const STALL_DRAG_RATE = 0.08;
export const STALL_RECOVERY_CAPTURE_RATE = 7.0;
export const STALL_TERMINAL_FALL_SPEED = 180;
export const STALL_AOA_ONSET_DEG = 12;
export const STALL_AOA_FULL_DEG = 42;
export const STALL_ENGINE_ACCELERATION = 18;
export const STALL_ENGINE_AUTHORITY_AT_FULL_LOSS = 0.18;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep01(value) {
  const x = clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
}

export function resetStallTranslationState(state = {}) {
  state.initialized = false;
  state.active = false;
  state.x = 0;
  state.y = 0;
  state.z = 0;
  state.gravityWeight = 0;
  state.pathLoss = 0;
  state.angleOfAttackDeg = 0;
  return state;
}

export function updateStallTranslationState(state, desiredVelocity, stallSeverity, dt) {
  const severity = clamp(Number(stallSeverity) || 0, 0, 1);
  const elapsed = Math.max(0, Number(dt) || 0);
  const desiredX = Number(desiredVelocity?.x) || 0;
  const desiredY = Number(desiredVelocity?.y) || 0;
  const desiredZ = Number(desiredVelocity?.z) || 0;

  // Velocity is persistent WORLD-space state, not a value reconstructed from
  // the current nose every time a stall begins.  On the first frame there is
  // no earlier flight path, so the authored launch velocity is the only valid
  // seed.  After that, moving the nose cannot manufacture inertia.
  if (!state.initialized) {
    state.x = desiredX;
    state.y = desiredY;
    state.z = desiredZ;
    state.initialized = true;
  }

  const currentLength = Math.hypot(state.x, state.y, state.z);
  const desiredLength = Math.hypot(desiredX, desiredY, desiredZ);
  let angleOfAttack = 0;
  if (currentLength > 1e-6 && desiredLength > 1e-6) {
    const dot = clamp(
      (state.x * desiredX + state.y * desiredY + state.z * desiredZ) /
        (currentLength * desiredLength),
      -1,
      1
    );
    angleOfAttack = Math.acos(dot) * 180 / Math.PI;
  }
  state.angleOfAttackDeg = angleOfAttack;

  // Once the flight path has separated from the body, scalar airspeed alone
  // cannot declare recovery.  The pilot must first lower the nose back toward
  // the real velocity vector.  This is the missing angle-of-attack half of the
  // old speed-only stall switch.
  const aoaLoss = smoothstep01(
    (angleOfAttack - STALL_AOA_ONSET_DEG) /
      (STALL_AOA_FULL_DEG - STALL_AOA_ONSET_DEG)
  );
  const pathLoss = Math.max(severity, aoaLoss);
  state.pathLoss = pathLoss;

  if (!state.active && pathLoss >= STALL_TRANSLATION_ACTIVATION && elapsed > 0) {
    state.active = true;
  }

  if (!state.active) {
    // Ordinary flight remains intentionally arcade-responsive, but it still
    // carries one continuous velocity.  This finite capture is what preserves
    // inertia across the frame where a stall starts.
    const capture = 1 - Math.exp(-STALL_RECOVERY_CAPTURE_RATE * elapsed);
    state.x += (desiredX - state.x) * capture;
    state.y += (desiredY - state.y) * capture;
    state.z += (desiredZ - state.z) * capture;
    state.gravityWeight = 0;
    return state;
  }

  // Lift fades progressively rather than switching off at one magic speed.
  // Deep stall reaches full gravity; early buffet keeps most of the authored
  // arcade flight path and therefore does not produce a visible step.
  const gravityWeight = smoothstep01(
    (pathLoss - STALL_TRANSLATION_RELEASE) /
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

  // The engine still produces thrust in separated flow, but thrust is an
  // acceleration along the BODY axis; it is not permission to replace the
  // WORLD velocity with `nose * commandedSpeed`.  At full separation the
  // retained authority is deliberately below one gravity, so pointing a
  // stalled jet straight up cannot manufacture a climb.  Lowering the nose
  // lets thrust and gravity combine to rebuild real airspeed for recovery.
  if (desiredLength > 1e-6 && elapsed > 0) {
    const nx = desiredX / desiredLength;
    const ny = desiredY / desiredLength;
    const nz = desiredZ / desiredLength;
    const axialSpeed = state.x * nx + state.y * ny + state.z * nz;
    const speedError = desiredLength - axialSpeed;
    if (speedError > 0) {
      const engineAuthority = STALL_ENGINE_AUTHORITY_AT_FULL_LOSS +
        (1 - STALL_ENGINE_AUTHORITY_AT_FULL_LOSS) * (1 - pathLoss);
      const acceleration = Math.min(
        STALL_ENGINE_ACCELERATION * engineAuthority,
        speedError / elapsed
      );
      state.x += nx * acceleration * elapsed;
      state.y += ny * acceleration * elapsed;
      state.z += nz * acceleration * elapsed;
    }
  }

  // At severity 1 the nose has no authority over the flight path. As lift
  // returns, the path smoothly converges on the ordinary nose-led velocity and
  // only then hands control back to the normal model.
  const captureRate = STALL_RECOVERY_CAPTURE_RATE * Math.pow(1 - pathLoss, 2);
  const capture = 1 - Math.exp(-captureRate * elapsed);
  state.x += (desiredX - state.x) * capture;
  state.y += (desiredY - state.y) * capture;
  state.z += (desiredZ - state.z) * capture;

  if (pathLoss <= STALL_TRANSLATION_RELEASE) {
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
      state.pathLoss = 0;
      state.angleOfAttackDeg = 0;
    }
  }
  return state;
}
