// Shared high-altitude envelope for player and AI fixed-wing aircraft.
//
// Sortie's HUD uses metres and km/h, while its translational speed is m/s.
// This module keeps those units and applies a compressed ISA-inspired combat
// envelope above 6.5 km. It is deliberately pure so the ceiling can be tested
// without WebGL or the mission state machine.

export const HIGH_ALTITUDE_EFFECT_START_M = 6500;
export const GAME_SERVICE_CEILING_M = 9144; // 30,000 ft
export const GAME_ABSOLUTE_CEILING_M = 10000;

const ISA_SEA_LEVEL_TEMPERATURE_K = 288.15;
const ISA_TROPOSPHERE_LAPSE_K_PER_M = 0.0065;
const ISA_DENSITY_EXPONENT = 4.255879812716677;
const ISA_TROPOPAUSE_M = 11000;
const ISA_TROPOPAUSE_TEMPERATURE_K = 216.65;
const ISA_GRAVITY_MPS2 = 9.80665;
const ISA_AIR_GAS_CONSTANT = 287.05287;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

// ISA density ratio rho/rho0. Specialist aircraft can cross the tropopause, so
// the troposphere and isothermal lower-stratosphere layers meet at 11 km.
export function isaTroposphereDensityRatio(altitudeM) {
  // Specialist airframes may extend their own envelope above the ordinary
  // game ceiling, so atmosphere sampling itself cannot clamp at 11 km.
  const altitude = clamp(Number(altitudeM) || 0, 0, 20000);
  const troposphereAltitude = Math.min(altitude, ISA_TROPOPAUSE_M);
  const temperatureRatio = 1 -
    (ISA_TROPOSPHERE_LAPSE_K_PER_M * troposphereAltitude) / ISA_SEA_LEVEL_TEMPERATURE_K;
  const troposphereRatio = Math.pow(Math.max(0.01, temperatureRatio), ISA_DENSITY_EXPONENT);
  if (altitude <= ISA_TROPOPAUSE_M) return troposphereRatio;
  const scaleHeight =
    (ISA_AIR_GAS_CONSTANT * ISA_TROPOPAUSE_TEMPERATURE_K) / ISA_GRAVITY_MPS2;
  return troposphereRatio * Math.exp(-(altitude - ISA_TROPOPAUSE_M) / scaleHeight);
}

export function highAltitudeEnvelopeAt(
  altitudeM,
  absoluteCeilingBonusM = 0,
  stallEntrySpeedMps = 84,
  maxPoweredSpeedMps = 570
) {
  const altitude = Math.max(0, Number(altitudeM) || 0);
  const absoluteCeiling = GAME_ABSOLUTE_CEILING_M +
    Math.max(0, Number(absoluteCeilingBonusM) || 0);
  const densityRatio = isaTroposphereDensityRatio(altitude);
  const thinAir = smoothstep(
    HIGH_ALTITUDE_EFFECT_START_M,
    GAME_SERVICE_CEILING_M,
    altitude
  );
  const ceiling = smoothstep(
    GAME_SERVICE_CEILING_M,
    absoluteCeiling,
    altitude
  );
  const engineLapse = smoothstep(
    HIGH_ALTITUDE_EFFECT_START_M,
    absoluteCeiling,
    altitude
  );

  // Below 6.5 km the effective ratio is exactly one, preserving every existing
  // low/medium-altitude sortie. By 30,000 ft the real ISA ratio is fully active.
  const effectiveDensityRatio = 1 + (densityRatio - 1) * thinAir;
  const stallSpeedMultiplier = 1 / Math.sqrt(Math.max(0.01, effectiveDensityRatio));
  const seaLevelStallSpeed = Math.max(1, Number(stallEntrySpeedMps) || 84);
  const seaLevelMaxSpeed = Math.max(
    seaLevelStallSpeed * 1.05,
    Number(maxPoweredSpeedMps) || 570
  );
  const ceilingDensityRatio = isaTroposphereDensityRatio(absoluteCeiling);
  const ceilingStallSpeed = seaLevelStallSpeed /
    Math.sqrt(Math.max(0.01, ceilingDensityRatio));
  // At the airframe's quoted ceiling, full power leaves only three percent of
  // straight-and-level stall margin. A climb or turn spends that margin and
  // the ordinary stall model takes over. This is an energy ceiling, not a
  // positional wall: a fast zoom climb can cross it briefly, but cannot loiter.
  const ceilingSustainableSpeed = ceilingStallSpeed * 1.03;
  const ceilingSpeedFactor = clamp(
    ceilingSustainableSpeed / seaLevelMaxSpeed,
    0.12,
    0.55
  );
  const maxSpeedFactor = 1 + (ceilingSpeedFactor - 1) * engineLapse;

  return Object.freeze({
    altitude,
    densityRatio,
    effectiveDensityRatio,
    thinAir,
    ceiling,
    stallSpeedMultiplier,
    engineLapse,
    ceilingStallSpeed,
    ceilingSustainableSpeed,
    // Full thin-air penalty at 30,000 ft, then a narrow energy margin to the
    // airframe's own aerodynamic ceiling.
    turnAuthority: clamp(1 - thinAir * 0.28 - ceiling * 0.20, 0.52, 1),
    thrustFactor: clamp(1 - engineLapse * 0.72, 0.28, 1),
    maxSpeedFactor,
    // Climb response weakens with available power, but never becomes a hidden
    // altitude clamp. Speed loss and the shared stall/gravity model decide
    // whether the aircraft can keep climbing.
    climbAuthority: clamp(1 - thinAir * 0.25 - ceiling * 0.15, 0.60, 1),
    ceilingSinkSpeed: 0,
    absoluteCeiling
  });
}

// Convert nose-up flight into the corresponding loss of kinetic energy. This
// only fades in with the high-altitude layer so existing low-level arcade
// handling is preserved. Nose-down flight returns the same gravitational
// energy. Combined with the density-derived stall speed and engine lapse above,
// a zoom climb may cross the nominal ceiling but cannot remain there.
export function altitudeEnergyAdjustedSpeed(
  speedMps,
  forwardVerticalComponent,
  envelope,
  dt
) {
  const speed = Math.max(0, Number(speedMps) || 0);
  const vertical = clamp(Number(forwardVerticalComponent) || 0, -1, 1);
  const elapsed = Math.max(0, Number(dt) || 0);
  const coupling = clamp(Number(envelope?.thinAir) || 0, 0, 1);
  return Math.max(0, speed - ISA_GRAVITY_MPS2 * vertical * coupling * elapsed);
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

// Build the actual WORLD-space translation vector. The horizontal components
// remain the aircraft's forward motion, while thin-air climb loss, ceiling
// sink and aerodynamic fall act only along WORLD Y. Never reallocate blocked
// vertical motion into an arbitrary horizontal fallback: that made a vertical
// or stalled aircraft slide sideways instead of yielding to gravity.
//
// The returned magnitude may differ from `speedMps`. That is intentional:
// `speedMps` is the airframe's powered/forward speed, while gravity and a
// restricted climb change the actual displacement measured by the HUD.
export function altitudeAdjustedFlightVelocity(
  forwardDirection,
  speedMps,
  envelope,
  aerodynamicVerticalSpeed = 0,
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
  out.x = nx * speed;
  out.y = altitudeAdjustedVerticalSpeed(ny * speed, envelope) +
    (Number(aerodynamicVerticalSpeed) || 0);
  out.z = nz * speed;
  return out;
}
