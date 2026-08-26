// Shared high-altitude envelope for player and AI fixed-wing aircraft.
//
// Sortie's HUD uses metres and km/h, while its translational speed is m/s.
// This module keeps those units and applies a compressed ISA-inspired combat
// envelope above 6.5 km. It is deliberately pure so the ceiling can be tested
// without WebGL or the mission state machine.

export const HIGH_ALTITUDE_EFFECT_START_M = 6500;
export const GAME_SERVICE_CEILING_M = 9144; // 30,000 ft
export const GAME_ABSOLUTE_CEILING_M = 11000;

const ISA_SEA_LEVEL_TEMPERATURE_K = 288.15;
const ISA_TROPOSPHERE_LAPSE_K_PER_M = 0.0065;
const ISA_DENSITY_EXPONENT = 4.255879812716677;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

// ISA troposphere density ratio rho/rho0. Sortie's soft ceiling is below the
// 11 km tropopause, so one continuous equation covers the whole playable band.
export function isaTroposphereDensityRatio(altitudeM) {
  const altitude = clamp(Number(altitudeM) || 0, 0, GAME_ABSOLUTE_CEILING_M);
  const temperatureRatio = 1 -
    (ISA_TROPOSPHERE_LAPSE_K_PER_M * altitude) / ISA_SEA_LEVEL_TEMPERATURE_K;
  return Math.pow(Math.max(0.01, temperatureRatio), ISA_DENSITY_EXPONENT);
}

export function highAltitudeEnvelopeAt(altitudeM) {
  const altitude = Math.max(0, Number(altitudeM) || 0);
  const sampledAltitude = Math.min(altitude, GAME_ABSOLUTE_CEILING_M);
  const densityRatio = isaTroposphereDensityRatio(sampledAltitude);
  const thinAir = smoothstep(
    HIGH_ALTITUDE_EFFECT_START_M,
    GAME_SERVICE_CEILING_M,
    altitude
  );
  const ceiling = smoothstep(
    GAME_SERVICE_CEILING_M,
    GAME_ABSOLUTE_CEILING_M,
    altitude
  );

  // Below 6.5 km the effective ratio is exactly one, preserving every existing
  // low/medium-altitude sortie. By 30,000 ft the real ISA ratio is fully active.
  const effectiveDensityRatio = 1 + (densityRatio - 1) * thinAir;
  const stallSpeedMultiplier = 1 / Math.sqrt(Math.max(0.01, effectiveDensityRatio));

  return Object.freeze({
    altitude,
    densityRatio,
    effectiveDensityRatio,
    thinAir,
    ceiling,
    stallSpeedMultiplier,
    // Full penalty at 30,000 ft, then a narrower final margin to 11 km.
    turnAuthority: clamp(1 - thinAir * 0.28 - ceiling * 0.20, 0.52, 1),
    thrustFactor: clamp(1 - thinAir * 0.30 - ceiling * 0.25, 0.45, 1),
    maxSpeedFactor: clamp(1 - thinAir * 0.18 - ceiling * 0.10, 0.72, 1),
    climbAuthority: clamp(1 - thinAir * 0.35 - ceiling * 0.65, 0, 1),
    // No hard wall. Level flight begins to settle above the service ceiling;
    // past 11 km the excess term pushes the aircraft back into the envelope.
    ceilingSinkSpeed: -(32 * ceiling + Math.max(0, altitude - GAME_ABSOLUTE_CEILING_M) * 0.08)
  });
}

export function altitudeAdjustedResponseK(responseK, thrustFactor) {
  const response = clamp(Number(responseK) || 0.001, 0.001, 0.999999);
  const thrust = clamp(Number(thrustFactor) || 0, 0.05, 1);
  // Sortie's damping convention is inverted: a larger K responds more slowly.
  return Math.pow(response, thrust);
}

export function altitudeAdjustedVerticalSpeed(forwardVerticalSpeed, envelope) {
  const commanded = Number(forwardVerticalSpeed) || 0;
  const climb = commanded > 0
    ? commanded * clamp(Number(envelope?.climbAuthority) || 0, 0, 1)
    : commanded;
  return climb + (Number(envelope?.ceilingSinkSpeed) || 0);
}

// Restrict the flight-path angle without deleting translational speed. The
// old integration scaled only the upward component, so a jet pointing nearly
// vertical at the ceiling kept a large HUD airspeed while barely changing
// position. Thin air should make the velocity vector lag behind the nose, not
// make hundreds of metres per second disappear. The disallowed climb is kept
// in the horizontal component and the resulting vector retains `speedMps`.
export function altitudeAdjustedFlightVelocity(
  forwardDirection,
  speedMps,
  envelope,
  aerodynamicVerticalSpeed = 0,
  fallbackHorizontal = null,
  out = forwardDirection
) {
  const speed = Math.max(0, Number(speedMps) || 0);
  const fx = Number(forwardDirection?.x) || 0;
  const fy = Number(forwardDirection?.y) || 0;
  const fz = Number(forwardDirection?.z) || 0;
  const forwardLength = Math.hypot(fx, fy, fz);
  const nx = forwardLength > 1e-12 ? fx / forwardLength : 0;
  const ny = forwardLength > 1e-12 ? fy / forwardLength : 0;
  const nz = forwardLength > 1e-12 ? fz / forwardLength : -1;
  const fallbackX = Number(fallbackHorizontal?.x) || 0;
  const fallbackZ = Number(fallbackHorizontal?.z) || 0;

  const verticalSpeed = clamp(
    altitudeAdjustedVerticalSpeed(ny * speed, envelope) +
      (Number(aerodynamicVerticalSpeed) || 0),
    -speed,
    speed
  );
  const horizontalSpeed = Math.sqrt(Math.max(0, speed * speed - verticalSpeed * verticalSpeed));
  let hx = nx;
  let hz = nz;
  let horizontalLength = Math.hypot(hx, hz);
  if (horizontalLength <= 1e-12) {
    hx = fallbackX;
    hz = fallbackZ;
    horizontalLength = Math.hypot(hx, hz);
  }
  if (horizontalLength <= 1e-12) {
    hx = 0;
    hz = -1;
    horizontalLength = 1;
  }

  out.x = hx / horizontalLength * horizontalSpeed;
  out.y = verticalSpeed;
  out.z = hz / horizontalLength * horizontalSpeed;
  return out;
}
