// Shared fixed-wing translational dynamics.
//
// There is exactly one persistent WORLD-space velocity. Gravity, thrust, lift,
// drag and the finite centripetal force that bends the flight path all update
// that same state. The HUD, collision, weapons and visual effects can therefore
// agree on what the aircraft is actually doing.

export const FLIGHT_GRAVITY_MPS2 = 9.80665;
export const FLIGHT_DYNAMICS_MAX_STEP = 1 / 120;
export const FLIGHT_AOA_ONSET_DEG = 14;
// FAA training material places the critical AOA for conventional aircraft in
// roughly the 16-20 degree region. Sortie's shared fighter wing starts to lose
// attached flow at 14 degrees and is fully separated by 22; low energy by
// itself is a mush/sink condition and does not redefine the critical AOA.
export const FLIGHT_AOA_FULL_DEG = 22;

const EPSILON = 1e-9;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep01(value) {
  const x = clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
}

function finite(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function length(x, y, z) {
  return Math.hypot(x, y, z);
}

function normalized(vector, fallback) {
  const x = finite(vector?.x, fallback.x);
  const y = finite(vector?.y, fallback.y);
  const z = finite(vector?.z, fallback.z);
  const magnitude = length(x, y, z);
  if (magnitude <= EPSILON) return { ...fallback };
  return { x: x / magnitude, y: y / magnitude, z: z / magnitude };
}

function projectedNormal(vector, direction) {
  const dot = vector.x * direction.x + vector.y * direction.y + vector.z * direction.z;
  const x = vector.x - direction.x * dot;
  const y = vector.y - direction.y * dot;
  const z = vector.z - direction.z * dot;
  const magnitude = length(x, y, z);
  if (magnitude <= EPSILON) return null;
  return { x: x / magnitude, y: y / magnitude, z: z / magnitude };
}

function rotateToward(x, y, z, target, maxAngle) {
  const speed = length(x, y, z);
  if (speed <= EPSILON || maxAngle <= 0) return { x, y, z, angle: 0 };
  const source = { x: x / speed, y: y / speed, z: z / speed };
  const dot = clamp(
    source.x * target.x + source.y * target.y + source.z * target.z,
    -1,
    1
  );
  const angle = Math.acos(dot);
  if (angle <= EPSILON) return { x, y, z, angle: 0 };
  const step = Math.min(angle, maxAngle);
  const sinAngle = Math.sin(angle);
  let nx;
  let ny;
  let nz;
  if (Math.abs(sinAngle) > 1e-6) {
    const sourceWeight = Math.sin(angle - step) / sinAngle;
    const targetWeight = Math.sin(step) / sinAngle;
    nx = source.x * sourceWeight + target.x * targetWeight;
    ny = source.y * sourceWeight + target.y * targetWeight;
    nz = source.z * sourceWeight + target.z * targetWeight;
  } else {
    // A 180-degree disagreement has no unique shortest plane. Use a stable
    // orthogonal direction instead of manufacturing an instantaneous reversal.
    const axis = Math.abs(source.y) < 0.9
      ? normalized({ x: source.z, y: 0, z: -source.x }, { x: 1, y: 0, z: 0 })
      : { x: 1, y: 0, z: 0 };
    nx = source.x * Math.cos(step) + axis.x * Math.sin(step);
    ny = source.y * Math.cos(step) + axis.y * Math.sin(step);
    nz = source.z * Math.cos(step) + axis.z * Math.sin(step);
  }
  const magnitude = length(nx, ny, nz) || 1;
  return {
    x: nx / magnitude * speed,
    y: ny / magnitude * speed,
    z: nz / magnitude * speed,
    angle: step
  };
}

function rotateAroundAxis(vector, axis, angle) {
  if (Math.abs(angle) <= EPSILON) return { ...vector };
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const dot = vector.x * axis.x + vector.y * axis.y + vector.z * axis.z;
  return {
    x: vector.x * cosine + (axis.y * vector.z - axis.z * vector.y) * sine +
      axis.x * dot * (1 - cosine),
    y: vector.y * cosine + (axis.z * vector.x - axis.x * vector.z) * sine +
      axis.y * dot * (1 - cosine),
    z: vector.z * cosine + (axis.x * vector.y - axis.y * vector.x) * sine +
      axis.z * dot * (1 - cosine)
  };
}

export function resetFlightDynamicsState(state = {}, velocity = null) {
  state.initialized = Boolean(velocity);
  state.x = finite(velocity?.x);
  state.y = finite(velocity?.y);
  state.z = finite(velocity?.z);
  state.airspeed = length(state.x, state.y, state.z);
  state.angleOfAttackDeg = 0;
  state.flowMisalignmentDeg = 0;
  state.separatedFlow = 0;
  state.liftDeficit = 0;
  state.stallRatio = 0;
  state.controlAuthority = {
    pitchUp: 1,
    pitchDown: 1,
    roll: 1,
    yaw: 1,
    path: 1
  };
  state.forces = {
    gravity: { x: 0, y: -FLIGHT_GRAVITY_MPS2, z: 0 },
    control: { x: 0, y: 0, z: 0 },
    thrust: { x: 0, y: 0, z: 0 },
    drag: { x: 0, y: 0, z: 0 },
    lift: { x: 0, y: 0, z: 0 },
    acceleration: { x: 0, y: 0, z: 0 }
  };
  state.telemetry = {
    supportSpeed: 1,
    availableLiftG: 0,
    requestedLiftG: 0,
    loadFactorG: 0,
    supportDeficit: 0,
    dynamicPressureRatio: 0,
    pathCommandLoadG: 0,
    engineAuthority: 1,
    thrustLapse: 1,
    dragAcceleration: 0,
    pathTurnDegPerSec: 0
  };
  return state;
}

export function flightDynamicsVelocity(state, out = {}) {
  out.x = finite(state?.x);
  out.y = finite(state?.y);
  out.z = finite(state?.z);
  return out;
}

function stepFlightDynamics(state, input, dt) {
  const forward = normalized(input.forward, { x: 0, y: 0, z: -1 });
  const bodyUp = normalized(input.up, { x: 0, y: 1, z: 0 });
  const baseMaxSpeed = Math.max(30, finite(input.baseMaxSpeed, 340));
  const baseCruiseSpeed = clamp(finite(input.baseCruiseSpeed, baseMaxSpeed * 0.5), 0, baseMaxSpeed);
  const baseStallSpeed = Math.max(20, finite(input.baseStallSpeed, 84));
  const envelope = input.envelope || {};
  const speedRetention = clamp(finite(envelope.maxSpeedFactor, 1), 0.35, 1);
  const densityRatio = clamp(finite(envelope.effectiveDensityRatio, 1), 0.05, 1);
  const supportSpeed = Math.max(
    baseStallSpeed,
    finite(envelope.minimumControlledSpeed, baseStallSpeed)
  );
  const stability = clamp(finite(input.stability, 0.5), 0, 1);
  const structuralRating = clamp(finite(input.structuralG, 3), 1, 5.5);
  // The authored structural figure is a compact game stat rather than a literal
  // certification load. This common mapping yields 8-18 g of arcade authority
  // without per-aircraft exceptions.
  const maximumLoadG = 1 + structuralRating * 3.1;
  const throttle = clamp(finite(input.throttle, 0), 0, 1);
  const airBrake = clamp(finite(input.airBrake, 0), 0, 1);

  if (!state.initialized) {
    const initialSpeed = Math.max(0, finite(input.initialSpeed, baseCruiseSpeed));
    state.x = forward.x * initialSpeed;
    state.y = forward.y * initialSpeed;
    state.z = forward.z * initialSpeed;
    state.initialized = true;
  }

  let speed = length(state.x, state.y, state.z);
  let direction = speed > EPSILON
    ? { x: state.x / speed, y: state.y / speed, z: state.z / speed }
    : { ...forward };
  const directionBeforeStep = { ...direction };
  let noseDot = clamp(
    direction.x * forward.x + direction.y * forward.y + direction.z * forward.z,
    -1,
    1
  );
  let flowMisalignmentDeg = Math.acos(noseDot) * 180 / Math.PI;
  let signedAoaDeg = -Math.asin(clamp(
    direction.x * bodyUp.x + direction.y * bodyUp.y + direction.z * bodyUp.z,
    -1,
    1
  )) * 180 / Math.PI;
  let angleOfAttackDeg = Math.abs(signedAoaDeg);
  let separatedFlow = smoothstep01(
    (angleOfAttackDeg - FLIGHT_AOA_ONSET_DEG) /
      (FLIGHT_AOA_FULL_DEG - FLIGHT_AOA_ONSET_DEG)
  );
  const energyRatio = speed / supportSpeed;
  const energyAuthority = smoothstep01((energyRatio - 0.38) / 0.67);
  let requestedSupportG = Math.sqrt(Math.max(0, 1 - direction.y * direction.y));
  let availableLiftG = Math.min(
    maximumLoadG,
    Math.pow(Math.max(0, speed) / supportSpeed, 2)
  );
  let baseAuthority = clamp(
    (0.1 + 0.9 * energyAuthority) * (1 - separatedFlow * 0.9),
    0.06,
    1
  );
  let pitchDownAuthority = clamp(0.30 + baseAuthority * 0.70, 0.30, 1);
  let pitchUpAuthority = clamp(0.10 + baseAuthority * 0.90, 0.10, 1);
  let rollAuthority = clamp(0.18 + baseAuthority * 0.82, 0.18, 1);
  let yawAuthority = clamp(0.12 + baseAuthority * 0.88, 0.12, 1);
  let pathAuthority = clamp(0.045 + baseAuthority * 0.955, 0.045, 1);

  // The attitude controller turns the visible nose before this translational
  // step. A pilot-requested turn therefore needs an equally explicit flight-
  // path command; otherwise the nose can sweep at the authored arcade rate
  // while WORLD velocity hardly turns, manufacturing 20-30 degrees of false
  // AOA during an ordinary bank. This is deliberately opt-in and rate-limited.
  // With no active pitch/yaw/normal-mode turn rate it is exactly zero, so it
  // cannot recapture a knife-edge, inverted or stalled trajectory and erase
  // the gravity-driven fall.
  const fallbackPathSteeringRate = Math.max(0, finite(input.pathSteeringRate, 0));
  const requestedPathYawRate = finite(input.pathYawRate, 0);
  const requestedPathPitchRate = finite(input.pathPitchRate, 0);
  const requestedPathRate = Math.hypot(
    requestedPathYawRate,
    requestedPathPitchRate
  ) || fallbackPathSteeringRate;
  let controlAccelerationX = 0;
  let controlAccelerationY = 0;
  let controlAccelerationZ = 0;
  let pathCommandLoadG = 0;
  if (requestedPathRate > EPSILON && speed > EPSILON) {
    const beforeX = state.x;
    const beforeY = state.y;
    const beforeZ = state.z;
    // A direction change is a lateral acceleration (a = v * omega), not a
    // free kinematic rotation. Reserve enough of the available lift vector to
    // oppose gravity, then allow the pilot command to consume only the
    // remaining load. At and below the support speed there is no spare load:
    // the nose can still rotate, but the flight path cannot follow it, so AOA
    // rises and the wing can genuinely stall.
    const maneuverLoadG = Math.sqrt(Math.max(
      0,
      availableLiftG * availableLiftG - requestedSupportG * requestedSupportG
    ));
    const physicalTurnRate = maneuverLoadG * FLIGHT_GRAVITY_MPS2 / speed;
    const steeringTurnRate = Math.min(requestedPathRate * pathAuthority, physicalTurnRate);
    const steeringScale = steeringTurnRate / requestedPathRate;
    let steered;
    if (Math.abs(requestedPathYawRate) > EPSILON ||
        Math.abs(requestedPathPitchRate) > EPSILON) {
      // Keep the axes distinct. A coordinated heading command rotates the path
      // around WORLD up and therefore cannot erase a gravity-driven descent;
      // pitch rotates around the real wing axis. The former generic
      // rotate-toward-nose operation incorrectly used a bank turn to pull a
      // sinking aircraft back up to the horizon for free.
      const yawed = rotateAroundAxis(
        { x: state.x, y: state.y, z: state.z },
        { x: 0, y: 1, z: 0 },
        requestedPathYawRate * steeringScale * dt
      );
      const right = normalized({
        x: forward.y * bodyUp.z - forward.z * bodyUp.y,
        y: forward.z * bodyUp.x - forward.x * bodyUp.z,
        z: forward.x * bodyUp.y - forward.y * bodyUp.x
      }, { x: 1, y: 0, z: 0 });
      steered = rotateAroundAxis(
        yawed,
        right,
        requestedPathPitchRate * steeringScale * dt
      );
      steered.angle = Math.acos(clamp(
        (beforeX * steered.x + beforeY * steered.y + beforeZ * steered.z) /
          Math.max(EPSILON, speed * speed),
        -1,
        1
      ));
    } else {
      steered = rotateToward(
        state.x,
        state.y,
        state.z,
        forward,
        steeringTurnRate * dt
      );
    }
    state.x = steered.x;
    state.y = steered.y;
    state.z = steered.z;
    controlAccelerationX = (state.x - beforeX) / dt;
    controlAccelerationY = (state.y - beforeY) / dt;
    controlAccelerationZ = (state.z - beforeZ) / dt;
    pathCommandLoadG = steered.angle / Math.max(dt, EPSILON) * speed /
      FLIGHT_GRAVITY_MPS2;
    speed = length(state.x, state.y, state.z);
    direction = speed > EPSILON
      ? { x: state.x / speed, y: state.y / speed, z: state.z / speed }
      : { ...forward };
    noseDot = clamp(
      direction.x * forward.x + direction.y * forward.y + direction.z * forward.z,
      -1,
      1
    );
    flowMisalignmentDeg = Math.acos(noseDot) * 180 / Math.PI;
    signedAoaDeg = -Math.asin(clamp(
      direction.x * bodyUp.x + direction.y * bodyUp.y + direction.z * bodyUp.z,
      -1,
      1
    )) * 180 / Math.PI;
    angleOfAttackDeg = Math.abs(signedAoaDeg);
    separatedFlow = smoothstep01(
      (angleOfAttackDeg - FLIGHT_AOA_ONSET_DEG) /
        (FLIGHT_AOA_FULL_DEG - FLIGHT_AOA_ONSET_DEG)
    );
    baseAuthority = clamp(
      (0.1 + 0.9 * energyAuthority) * (1 - separatedFlow * 0.9),
      0.06,
      1
    );
    pitchDownAuthority = clamp(0.30 + baseAuthority * 0.70, 0.30, 1);
    pitchUpAuthority = clamp(0.10 + baseAuthority * 0.90, 0.10, 1);
    rollAuthority = clamp(0.18 + baseAuthority * 0.82, 0.18, 1);
    yawAuthority = clamp(0.12 + baseAuthority * 0.88, 0.12, 1);
    pathAuthority = clamp(0.045 + baseAuthority * 0.955, 0.045, 1);
    requestedSupportG = Math.sqrt(Math.max(0, 1 - direction.y * direction.y));
    availableLiftG = Math.min(
      maximumLoadG,
      Math.pow(Math.max(0, speed) / supportSpeed, 2)
    );
  }

  const directionBeforeForces = { ...direction };

  const wingNormal = projectedNormal(bodyUp, direction);
  const supportNormal = projectedNormal({ x: 0, y: 1, z: 0 }, direction);
  const liftDirection = wingNormal || supportNormal || { x: 0, y: 0, z: 0 };
  const supportAlignment = supportNormal && wingNormal
    ? clamp(
      wingNormal.x * supportNormal.x +
        wingNormal.y * supportNormal.y +
        wingNormal.z * supportNormal.z,
      -1,
      1
    )
    : 0;
  // Gravity perpendicular to the current path is the load the wing must
  // support. A vertical zoom needs no 1g wing support; gravity correctly spends
  // its axial speed instead.
  const availableBodyLiftG = Math.sqrt(Math.max(
    0,
    availableLiftG * availableLiftG - pathCommandLoadG * pathCommandLoadG
  ));
  const trimLiftG = supportAlignment > 0.08
    ? Math.min(maximumLoadG, requestedSupportG / supportAlignment)
    : 0;
  const pitchCommand = clamp(finite(input.pitchInput, 0), -1, 1);
  const maneuverLiftG = signedAoaDeg * 0.16 +
    pitchCommand * maximumLoadG * 0.32;
  let bodyLiftG = clamp(
    trimLiftG + maneuverLiftG,
    -availableBodyLiftG,
    availableBodyLiftG
  );
  if (supportAlignment > 0.08 && Math.abs(pitchCommand) < 0.05) {
    // The flight-control trim holds the selected bank attitude. Without this
    // floor the lift-induced path bend itself reduced computed AOA, which then
    // removed the very lift supporting a steady coordinated turn.
    bodyLiftG = Math.max(bodyLiftG, Math.min(trimLiftG, availableBodyLiftG));
  }
  if (supportAlignment < -0.08 && bodyLiftG < 0) {
    // Negative-G lift exists, but an inverted fighter may not use the positive-G
    // structural limit as an unlimited upside-down support system. Stability
    // augmentation improves the brief negative-G response without making the
    // aircraft immune to WORLD-down gravity.
    bodyLiftG = Math.max(bodyLiftG, -(0.34 + stability * 0.28));
  }
  bodyLiftG *= 1 - separatedFlow * 0.9;
  const stabilityAssistG = supportNormal
    ? requestedSupportG * stability * 0.32 * smoothstep01((0.35 - supportAlignment) / 1.35)
    : 0;
  const remainingAssistG = Math.max(0, availableBodyLiftG - Math.abs(bodyLiftG));
  const generatedAssistG = Math.min(stabilityAssistG, remainingAssistG) *
    (1 - separatedFlow * 0.9);
  const generatedSupportG = Math.max(0, bodyLiftG * supportAlignment + generatedAssistG);
  const supportDeficit = requestedSupportG > EPSILON
    ? clamp(1 - generatedSupportG / requestedSupportG, 0, 1)
    : 0;
  const liftDeficit = requestedSupportG > EPSILON
    ? clamp(1 - availableLiftG / requestedSupportG, 0, 1)
    : 0;

  const engineAcceleration = 8 + baseMaxSpeed * 0.055;
  const thrustLapse = densityRatio * speedRetention * speedRetention;
  const engineAuthority = 1 - separatedFlow * 0.74;
  const thrustAcceleration = engineAcceleration * thrustLapse * throttle * engineAuthority;
  const dynamicDrag = engineAcceleration * densityRatio *
    Math.pow(speed / baseMaxSpeed, 2);
  const dragFactor = 1 + airBrake * 4.2 + separatedFlow * 4.8;
  const dragAcceleration = dynamicDrag * dragFactor;

  const liftX = (
    liftDirection.x * bodyLiftG + (supportNormal?.x || 0) * generatedAssistG
  ) * FLIGHT_GRAVITY_MPS2;
  const liftY = (
    liftDirection.y * bodyLiftG + (supportNormal?.y || 0) * generatedAssistG
  ) * FLIGHT_GRAVITY_MPS2;
  const liftZ = (
    liftDirection.z * bodyLiftG + (supportNormal?.z || 0) * generatedAssistG
  ) * FLIGHT_GRAVITY_MPS2;
  const thrustX = forward.x * thrustAcceleration;
  const thrustY = forward.y * thrustAcceleration;
  const thrustZ = forward.z * thrustAcceleration;
  const dragX = -direction.x * dragAcceleration;
  const dragY = -direction.y * dragAcceleration;
  const dragZ = -direction.z * dragAcceleration;
  const forceAccelerationX = thrustX + dragX + liftX;
  const forceAccelerationY = -FLIGHT_GRAVITY_MPS2 + thrustY + dragY + liftY;
  const forceAccelerationZ = thrustZ + dragZ + liftZ;
  const accelerationX = controlAccelerationX + forceAccelerationX;
  const accelerationY = controlAccelerationY + forceAccelerationY;
  const accelerationZ = controlAccelerationZ + forceAccelerationZ;

  // Path steering was already applied as the direction-preserving velocity
  // rotation above. Integrate only gravity/aerodynamic/engine force here; the
  // combined acceleration is retained below for instrumentation.
  state.x += forceAccelerationX * dt;
  state.y += forceAccelerationY * dt;
  state.z += forceAccelerationZ * dt;
  state.airspeed = length(state.x, state.y, state.z);
  const directionAfterForces = state.airspeed > EPSILON
    ? {
      x: state.x / state.airspeed,
      y: state.y / state.airspeed,
      z: state.z / state.airspeed
    }
    : directionBeforeForces;
  const pathTurnAngle = Math.acos(clamp(
    directionBeforeStep.x * directionAfterForces.x +
      directionBeforeStep.y * directionAfterForces.y +
      directionBeforeStep.z * directionAfterForces.z,
    -1,
    1
  ));
  state.angleOfAttackDeg = angleOfAttackDeg;
  state.flowMisalignmentDeg = flowMisalignmentDeg;
  state.separatedFlow = separatedFlow;
  state.liftDeficit = liftDeficit;
  // Insufficient dynamic pressure means the wing cannot support the requested
  // path and the aircraft must sink/descend. It is not an aerodynamic stall
  // until the wing also exceeds critical AOA and separates. Keeping these two
  // states distinct prevents a high-altitude, low-energy aircraft at 3 degrees
  // AOA from being falsely trapped in a full-stall control state.
  const targetStallRatio = separatedFlow;
  const stallResponse = targetStallRatio > state.stallRatio ? 6.5 : 2.4;
  state.stallRatio += (targetStallRatio - state.stallRatio) *
    (1 - Math.exp(-stallResponse * dt));
  state.stallRatio = clamp(state.stallRatio, 0, 1);
  state.controlAuthority.pitchUp = pitchUpAuthority;
  state.controlAuthority.pitchDown = pitchDownAuthority;
  state.controlAuthority.roll = rollAuthority;
  state.controlAuthority.yaw = yawAuthority;
  state.controlAuthority.path = pathAuthority;
  state.forces.gravity = { x: 0, y: -FLIGHT_GRAVITY_MPS2, z: 0 };
  state.forces.control = {
    x: controlAccelerationX,
    y: controlAccelerationY,
    z: controlAccelerationZ
  };
  state.forces.thrust = { x: thrustX, y: thrustY, z: thrustZ };
  state.forces.drag = { x: dragX, y: dragY, z: dragZ };
  state.forces.lift = { x: liftX, y: liftY, z: liftZ };
  state.forces.acceleration = { x: accelerationX, y: accelerationY, z: accelerationZ };
  state.telemetry.supportSpeed = supportSpeed;
  state.telemetry.availableLiftG = availableLiftG;
  state.telemetry.requestedLiftG = requestedSupportG;
  state.telemetry.loadFactorG = Math.hypot(
    bodyLiftG,
    generatedAssistG,
    pathCommandLoadG
  );
  state.telemetry.pathCommandLoadG = pathCommandLoadG;
  state.telemetry.supportDeficit = supportDeficit;
  // q / q_ref with q_ref taken at the airframe's sea-level stall speed.
  // The 1/2 and reference density cancel, leaving a compact dimensionless
  // number that makes altitude, speed and control-energy contradictions easy
  // to inspect without introducing kilograms or a hidden wing area.
  state.telemetry.dynamicPressureRatio = densityRatio * Math.pow(speed / baseStallSpeed, 2);
  state.telemetry.engineAuthority = engineAuthority;
  state.telemetry.thrustLapse = thrustLapse;
  state.telemetry.dragAcceleration = dragAcceleration;
  state.telemetry.pathTurnDegPerSec = dt > 0 ? pathTurnAngle / dt * 180 / Math.PI : 0;
}

export function neutralThrottleForEnvelope(
  baseCruiseSpeed,
  baseMaxSpeed,
  envelope,
  supportMargin = 1.035
) {
  const maximum = Math.max(1, finite(baseMaxSpeed, 340));
  const retention = clamp(finite(envelope?.maxSpeedFactor, 1), 0.35, 1);
  const available = maximum * retention;
  const cruise = Math.max(0, finite(baseCruiseSpeed, maximum * 0.5)) * retention;
  const support = Math.max(0, finite(envelope?.minimumControlledSpeed, 0)) *
    Math.max(1, finite(supportMargin, 1.035));
  const trimmed = Math.min(available, Math.max(cruise, support));
  return clamp(Math.pow(trimmed / Math.max(1, available), 2), 0, 1);
}

export function updateFlightDynamicsState(state, input, dt) {
  const elapsed = Math.max(0, finite(dt));
  if (elapsed <= 0) return state;
  const steps = Math.max(1, Math.ceil(elapsed / FLIGHT_DYNAMICS_MAX_STEP));
  const step = elapsed / steps;
  for (let index = 0; index < steps; index += 1) {
    stepFlightDynamics(state, input, step);
  }
  return state;
}
