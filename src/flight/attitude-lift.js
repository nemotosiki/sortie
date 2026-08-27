// Arcade aerodynamic constraint for sustained knife-edge and inverted flight.
//
// Sortie's translational model intentionally remains light-weight: the nose
// still owns forward speed and the existing stall system still owns low-speed
// loss of control. This state adds only the WORLD-vertical velocity that
// appears when the wing's lift vector can no longer support the aircraft's
// weight.
// It is acceleration-based so a quick combat roll is nearly free, while an
// aircraft held inverted continues to settle until the pilot corrects it.

export const ATTITUDE_LIFT_LOSS_ONSET_DEG = 75;
export const ATTITUDE_LIFT_LOSS_ONSET_DOT = Math.cos(
  ATTITUDE_LIFT_LOSS_ONSET_DEG * Math.PI / 180
);
export const ATTITUDE_LIFT_GRAVITY = 9.81;
export const ATTITUDE_LIFT_STABILITY_REDUCTION = 0.65;
export const ATTITUDE_LIFT_MAX_SINK_SPEED = 44;
export const ATTITUDE_LIFT_LOOSE_RECOVERY_K = 0.18;
export const ATTITUDE_LIFT_STABLE_RECOVERY_K = 0.06;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep01(value) {
  const x = clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
}

export function attitudeLiftLossSeverity(upDot) {
  const dot = clamp(Number(upDot) || 0, -1, 1);
  // Only the upward component of the wing normal can oppose gravity. At the
  // 75-degree arcade onset most of that support has already gone; by a true
  // knife-edge (upDot=0) none remains. Continuing through inverted flight must
  // not somehow restore support, so the loss stays saturated from 90-180 deg.
  return smoothstep01(
    (ATTITUDE_LIFT_LOSS_ONSET_DOT - dot) / ATTITUDE_LIFT_LOSS_ONSET_DOT
  );
}

export function attitudeLiftDownAcceleration(upDot, stability) {
  const stable = clamp(Number(stability) || 0, 0, 1);
  return ATTITUDE_LIFT_GRAVITY * attitudeLiftLossSeverity(upDot) *
    (1 - ATTITUDE_LIFT_STABILITY_REDUCTION * stable);
}

export function resetAttitudeLiftState(state) {
  state.verticalSpeed = 0;
  state.severity = 0;
  state.downAcceleration = 0;
  state.upDot = 1;
  state.stability = 0;
  return state;
}

export function updateAttitudeLiftState(state, upDot, stability, dt) {
  const elapsed = Math.max(0, Number(dt) || 0);
  const stable = clamp(Number(stability) || 0, 0, 1);
  const dot = clamp(Number(upDot) || 0, -1, 1);
  const severity = attitudeLiftLossSeverity(dot);
  const downAcceleration = ATTITUDE_LIFT_GRAVITY * severity *
    (1 - ATTITUDE_LIFT_STABILITY_REDUCTION * stable);
  let verticalSpeed = Number(state.verticalSpeed) || 0;

  verticalSpeed -= downAcceleration * elapsed;

  // Whatever WORLD-up lift remains damps the accumulated sink. At knife-edge
  // and beyond there is no automatic vertical recovery, so gravity keeps
  // building the fall until the arcade cap. A high-STABILITY airframe both
  // loses less support and regains its trimmed flight path faster.
  const recoveryK = ATTITUDE_LIFT_LOOSE_RECOVERY_K +
    (ATTITUDE_LIFT_STABLE_RECOVERY_K - ATTITUDE_LIFT_LOOSE_RECOVERY_K) * stable;
  const remainingLift = 1 - severity;
  const recovery = 1 - Math.pow(recoveryK, elapsed * remainingLift);
  verticalSpeed += (0 - verticalSpeed) * recovery;
  verticalSpeed = clamp(verticalSpeed, -ATTITUDE_LIFT_MAX_SINK_SPEED, 0);

  state.verticalSpeed = verticalSpeed;
  state.severity = severity;
  state.downAcceleration = downAcceleration;
  state.upDot = dot;
  state.stability = stable;
  return state;
}
