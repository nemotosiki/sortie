// Shared high-altitude envelope for player and AI fixed-wing aircraft.
//
// Sortie's HUD uses metres and km/h, while its translational speed is m/s.
// This module keeps those units and applies a compressed ISA-inspired combat
// envelope above 6.5 km. It is deliberately pure so the ceiling can be tested
// without WebGL or the mission state machine.

export const HIGH_ALTITUDE_EFFECT_START_M = 6500;
export const GAME_SERVICE_CEILING_M = 9144; // 30,000 ft
export const GAME_REFERENCE_FIGHTER_CEILING_M = 10000;

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

// One speed-retention curve for every fixed-wing aircraft. The one-third loss
// at 11 km calibrates an authored 833 m/s MiG-31 to 1,999 km/h without naming
// the aircraft. The shallow 11-12 km shoulder permits a brief stratospheric
// dash; the common lapse resumes above it.
export function highAltitudeSpeedRetentionAt(altitudeM) {
  const altitude = Math.max(0, Number(altitudeM) || 0);
  return clamp(
    1
      - (1 / 3) * smoothstep(6500, 11000, altitude)
      - (1 / 150) * smoothstep(11000, 12000, altitude)
      - 0.08 * smoothstep(12000, 14000, altitude),
    0.50,
    1
  );
}

// Compressed combat-energy requirement. It is common to every fighter: the
// aircraft's own maximum speed decides where that aircraft runs out of margin.
// The floor is zero below the high-altitude layer and reaches 550 m/s at 12 km.
export function highAltitudeEnergyFloorAt(altitudeM) {
  const altitude = Math.max(0, Number(altitudeM) || 0);
  return 520 * smoothstep(6500, 11000, altitude)
    + 30 * smoothstep(10000, 12000, altitude);
}

export function highAltitudeEnvelopeAt(
  altitudeM,
  stallEntrySpeedMps = 84,
  maxPoweredSpeedMps = 570
) {
  const altitude = Math.max(0, Number(altitudeM) || 0);
  const densityRatio = isaTroposphereDensityRatio(altitude);
  const thinAir = smoothstep(
    HIGH_ALTITUDE_EFFECT_START_M,
    GAME_SERVICE_CEILING_M,
    altitude
  );
  // Below 6.5 km the effective ratio is exactly one, preserving every existing
  // low/medium-altitude sortie. By 30,000 ft the real ISA ratio is fully active.
  const effectiveDensityRatio = 1 + (densityRatio - 1) * thinAir;
  const densityStallMultiplier = 1 /
    Math.sqrt(Math.max(0.01, effectiveDensityRatio));
  const seaLevelStallSpeed = Math.max(1, Number(stallEntrySpeedMps) || 84);
  const seaLevelMaxSpeed = Math.max(
    seaLevelStallSpeed * 1.05,
    Number(maxPoweredSpeedMps) || 570
  );
  const energyFloorSpeed = highAltitudeEnergyFloorAt(altitude);
  const minimumControlledSpeed = Math.max(
    seaLevelStallSpeed * densityStallMultiplier,
    energyFloorSpeed
  );
  const maxSpeedFactor = highAltitudeSpeedRetentionAt(altitude);
  const availableMaxSpeed = seaLevelMaxSpeed * maxSpeedFactor;

  const envelope = {
    altitude,
    densityRatio,
    effectiveDensityRatio,
    thinAir,
    densityStallMultiplier,
    // Compatibility/readout name: this is the physical density multiplier,
    // not the much larger shared control-energy floor.
    stallSpeedMultiplier: densityStallMultiplier,
    energyFloorSpeed,
    minimumControlledSpeed,
    availableMaxSpeed,
    thrustFactor: clamp(0.45 + 0.55 * maxSpeedFactor, 0.45, 1),
    maxSpeedFactor,
    ceilingSinkSpeed: 0
  };
  envelope.turnAuthority = highAltitudeControlAuthorityAtSpeed(
    availableMaxSpeed,
    envelope
  );
  envelope.climbAuthority = highAltitudeClimbAuthorityAtSpeed(
    availableMaxSpeed,
    envelope
  );
  return Object.freeze(envelope);
}

export function altitudeAdjustedStallThreshold(
  baseThresholdMps,
  baseStallEntryMps,
  envelope
) {
  const baseEntry = Math.max(1, Number(baseStallEntryMps) || 1);
  const baseThreshold = Math.max(1, Number(baseThresholdMps) || baseEntry);
  const densityMultiplier = Math.max(
    1,
    Number(envelope?.densityStallMultiplier) || 1
  );
  const minimum = Math.max(
    baseEntry * densityMultiplier,
    Number(envelope?.minimumControlledSpeed) || baseEntry
  );
  return Math.max(1, minimum + (baseThreshold - baseEntry) * densityMultiplier);
}

export function highAltitudeControlAuthorityAtSpeed(speedMps, envelope) {
  const thinAir = clamp(Number(envelope?.thinAir) || 0, 0, 1);
  if (thinAir <= 0) return 1;
  const minimum = Math.max(1, Number(envelope?.minimumControlledSpeed) || 1);
  const ratio = Math.max(0, Number(speedMps) || 0) / minimum;
  const highAltitudeAuthority = 0.15 + 0.85 * smoothstep(0.82, 1.12, ratio);
  return 1 + (highAltitudeAuthority - 1) * thinAir;
}

export function highAltitudeClimbAuthorityAtSpeed(speedMps, envelope) {
  const thinAir = clamp(Number(envelope?.thinAir) || 0, 0, 1);
  if (thinAir <= 0) return 1;
  const minimum = Math.max(1, Number(envelope?.minimumControlledSpeed) || 1);
  const ratio = Math.max(0, Number(speedMps) || 0) / minimum;
  const highAltitudeAuthority = smoothstep(1.00, 1.18, ratio);
  return 1 + (highAltitudeAuthority - 1) * thinAir;
}

export function estimatedSustainableAltitudeM(
  stallEntrySpeedMps,
  maxPoweredSpeedMps,
  maxAltitudeM = 14000
) {
  const maximum = Math.max(HIGH_ALTITUDE_EFFECT_START_M, Number(maxAltitudeM) || 14000);
  let sustainable = HIGH_ALTITUDE_EFFECT_START_M;
  for (let altitude = HIGH_ALTITUDE_EFFECT_START_M; altitude <= maximum; altitude += 5) {
    const envelope = highAltitudeEnvelopeAt(
      altitude,
      stallEntrySpeedMps,
      maxPoweredSpeedMps
    );
    if (envelope.availableMaxSpeed + 1e-9 < envelope.minimumControlledSpeed) break;
    sustainable = altitude;
  }
  return sustainable;
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

export function altitudeAdjustedVerticalSpeed(
  forwardVerticalSpeed,
  _envelope,
  _speedMps = 0
) {
  // Never erase or redirect a ballistic zoom's WORLD-vertical velocity. Thin
  // air limits the pitch response and sustainable speed; gravity then spends
  // the climb's kinetic energy and the shared stall/nose-drop path recovers the
  // aircraft. Scaling this component directly recreates an invisible ceiling.
  return Number(forwardVerticalSpeed) || 0;
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
  out.y = altitudeAdjustedVerticalSpeed(ny * speed, envelope, speed) +
    (Number(aerodynamicVerticalSpeed) || 0);
  out.z = nz * speed;
  return out;
}
