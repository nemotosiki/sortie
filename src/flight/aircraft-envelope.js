// Shared arcade aerodynamic envelope for player and AI fixed-wing aircraft.
//
// Guidance chooses a target point and throttle. These functions decide how
// much of that command the airframe can actually deliver at its current energy
// state. Keeping that boundary pure makes it possible to tune and simulate the
// flight constraint without running the renderer or mission state machine.

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

export function aircraftCornerSpeed(stallEntrySpeed, structuralG) {
  const vStall = Math.max(1, Number(stallEntrySpeed) || 1);
  const gLimit = Math.max(1, Number(structuralG) || 1);
  return vStall * Math.sqrt(gLimit);
}

// Instantaneous turn rate of a banked turn: omega = sqrt(n^2 - 1) / v.
// Below corner speed, lift caps n at (v / vStall)^2. Above it, structural G
// caps n and the same available acceleration has to bend a faster flight path.
export function aircraftTurnRateAtSpeed(speed, stallEntrySpeed, structuralG) {
  const vStall = Math.max(1, Number(stallEntrySpeed) || 1);
  const v = Math.max(1, Number(speed) || 1);
  const liftLimitedG = Math.pow(v / vStall, 2);
  const n = Math.min(liftLimitedG, Math.max(1, Number(structuralG) || 1));
  return Math.sqrt(Math.max(n * n - 1, 0)) / v;
}

export function aircraftTurnGainAtSpeed(
  speed,
  referenceSpeed,
  stallEntrySpeed,
  structuralG
) {
  const reference = aircraftTurnRateAtSpeed(referenceSpeed, stallEntrySpeed, structuralG);
  if (reference <= 0) return 1;
  return aircraftTurnRateAtSpeed(speed, stallEntrySpeed, structuralG) / reference;
}

export function constrainedAircraftTurn({
  speed,
  referenceSpeed,
  stallEntrySpeed,
  structuralG,
  baseTurnRate,
  maximumGain = 1.25,
  minimumGain = 0.25,
  stallSeverity = 0,
  stallAuthorityLoss = 0.8
}) {
  const upper = Math.max(0, Number(maximumGain) || 0);
  const lower = Math.min(upper, Math.max(0, Number(minimumGain) || 0));
  const gain = clamp(
    aircraftTurnGainAtSpeed(speed, referenceSpeed, stallEntrySpeed, structuralG),
    lower,
    upper
  );
  const authority = clamp(
    1 - clamp(Number(stallSeverity) || 0, 0, 1) *
      clamp(Number(stallAuthorityLoss) || 0, 0, 1),
    0.18,
    1
  );
  return {
    rate: Math.max(0, Number(baseTurnRate) || 0) * gain * authority,
    gain,
    authority
  };
}

export function resetAerodynamicStallState(state) {
  state.timer = 0;
  state.severity = 0;
  state.stalling = false;
  state.controlAuthority = 1;
  state.lowSpeedRatio = 0;
  return state;
}

// Same build/recovery shape as the player flight loop. `turnDemand` is an AI
// command in [0, 1], not a physics override: asking for a hard turn while slow
// builds the stall sooner, but can never make the wing exceed its envelope.
export function updateAerodynamicStallState(state, options, dt) {
  const elapsed = Math.max(0, Number(dt) || 0);
  const speed = Math.max(0, Number(options.speed) || 0);
  const entry = Math.max(1, Number(options.stallEntrySpeed) || 1);
  const deep = Math.min(entry - 1, Math.max(0, Number(options.deepStallSpeed) || 0));
  const recovery = Math.max(entry, Number(options.recoverySpeed) || entry);
  const turnDemand = clamp(Number(options.turnDemand) || 0, 0, 1);
  const noseHighDemand = Math.max(0, Number(options.noseHighDemand) || 0);
  const authorityLoss = clamp(Number(options.stallAuthorityLoss) || 0, 0, 1);

  const lowSpeedRatio = clamp((entry - speed) / Math.max(1, entry - deep), 0, 1);
  let timer = clamp(Number(state.timer) || 0, 0, 1);
  if (speed < entry) {
    const buildRate = 0.28 + lowSpeedRatio * 1.35 +
      turnDemand * 0.42 + noseHighDemand * 0.32;
    timer += elapsed * buildRate;
  } else {
    const recoveryRate = speed > recovery ? 1.9 : 0.78;
    timer -= elapsed * recoveryRate;
  }
  timer = clamp(timer, 0, 1);

  const targetSeverity = smoothstep(0.18, 0.88, timer);
  const severityResponse = 1 - Math.pow(0.025, elapsed);
  let severity = (Number(state.severity) || 0) +
    (targetSeverity - (Number(state.severity) || 0)) * severityResponse;
  if (speed > recovery && timer <= 0.02) {
    severity = Math.max(0, severity - elapsed * 1.4);
  }
  severity = clamp(severity, 0, 1);

  state.timer = timer;
  state.severity = severity;
  state.stalling = severity > 0.24;
  state.controlAuthority = clamp(1 - severity * authorityLoss, 0.18, 1);
  state.lowSpeedRatio = lowSpeedRatio;
  return state;
}

// Tactical energy management. A large heading error asks the AI to wash speed
// off toward (never below) the airframe's corner-speed band. A stalled aircraft
// abandons that request and opens the throttle to recover. This is an AI choice;
// constrainedAircraftTurn remains the authority that enforces the result.
export function managedCombatTurnSpeed({
  commandedSpeed,
  headingErrorRad,
  stallSeverity,
  stallEntrySpeed,
  structuralG,
  cruiseSpeed,
  maxSpeed
}) {
  const commanded = Math.max(0, Number(commandedSpeed) || 0);
  const cruise = Math.max(0, Number(cruiseSpeed) || 0);
  const maximum = Math.max(cruise, Number(maxSpeed) || cruise);
  const cornerSpeed = aircraftCornerSpeed(stallEntrySpeed, structuralG);
  const turnDemand = smoothstep(
    18 * Math.PI / 180,
    78 * Math.PI / 180,
    Math.max(0, Number(headingErrorRad) || 0)
  );

  if ((Number(stallSeverity) || 0) > 0.02) {
    return {
      targetSpeed: clamp(Math.max(commanded, cruise), 0, maximum),
      turnDemand,
      cornerSpeed,
      recovering: true
    };
  }

  const maneuverSpeed = Math.max(
    (Number(stallEntrySpeed) || 0) + 8,
    cornerSpeed * 1.06
  );
  const blend = turnDemand * 0.88;
  const targetSpeed = commanded > maneuverSpeed
    ? commanded + (maneuverSpeed - commanded) * blend
    : commanded;
  return {
    targetSpeed: clamp(targetSpeed, 0, maximum),
    turnDemand,
    cornerSpeed,
    recovering: false
  };
}
