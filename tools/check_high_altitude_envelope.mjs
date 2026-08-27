#!/usr/bin/env node
import {
  GAME_ABSOLUTE_CEILING_M,
  GAME_SERVICE_CEILING_M,
  HIGH_ALTITUDE_EFFECT_START_M,
  altitudeAdjustedFlightVelocity,
  altitudeAdjustedResponseK,
  altitudeAdjustedVerticalSpeed,
  altitudeEnergyAdjustedSpeed,
  highAltitudeEnvelopeAt,
  isaTroposphereDensityRatio
} from "../src/flight/high-altitude-envelope.js";

const assert = (condition, message) => {
  if (!condition) throw new Error(`check_high_altitude_envelope: ${message}`);
};
const near = (actual, expected, tolerance, label) => {
  assert(Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected} +/- ${tolerance}, got ${actual}`);
};

const sea = highAltitudeEnvelopeAt(0);
const onset = highAltitudeEnvelopeAt(HIGH_ALTITUDE_EFFECT_START_M);
const service = highAltitudeEnvelopeAt(GAME_SERVICE_CEILING_M);
const absolute = highAltitudeEnvelopeAt(GAME_ABSOLUTE_CEILING_M);

near(sea.densityRatio, 1, 1e-12, "sea-level density ratio");
for (const sample of [sea, onset]) {
  near(sample.stallSpeedMultiplier, 1, 1e-12, "below-onset stall multiplier");
  near(sample.turnAuthority, 1, 1e-12, "below-onset turn authority");
  near(sample.maxSpeedFactor, 1, 1e-12, "below-onset max speed");
}

// NASA's standard-atmosphere table gives 0.000889 / 0.002377 = 0.374 at
// 30,000 ft. The closed-form ISA curve should land within table rounding.
const nasaTableRatio = 0.000889 / 0.002377;
near(isaTroposphereDensityRatio(GAME_SERVICE_CEILING_M), nasaTableRatio, 0.006,
  "30,000 ft density ratio");
near(service.stallSpeedMultiplier, 1 / Math.sqrt(service.densityRatio), 1e-12,
  "30,000 ft density-derived stall multiplier");
assert(service.stallSpeedMultiplier > 1.62 && service.stallSpeedMultiplier < 1.65,
  `30,000 ft stall multiplier out of band: ${service.stallSpeedMultiplier}`);
near(service.turnAuthority, 0.72, 1e-12, "service-ceiling turn authority");
assert(service.thrustFactor > 0.36 && service.thrustFactor < 0.42,
  `service-ceiling thrust factor out of band: ${service.thrustFactor}`);
assert(service.maxSpeedFactor > 0.34 && service.maxSpeedFactor < 0.40,
  `service-ceiling speed factor out of band: ${service.maxSpeedFactor}`);
near(service.climbAuthority, 0.75, 1e-12, "service-ceiling climb authority");
near(service.ceilingSinkSpeed, 0, 1e-12, "service-ceiling forced sink disabled");

near(absolute.turnAuthority, 0.52, 1e-12, "absolute-ceiling turn authority");
near(absolute.thrustFactor, 0.28, 1e-12, "absolute-ceiling thrust factor");
near(absolute.maxSpeedFactor * 570, absolute.ceilingSustainableSpeed, 1e-9,
  "absolute-ceiling sustainable speed");
near(absolute.ceilingSustainableSpeed / (84 * absolute.stallSpeedMultiplier), 1.03, 1e-12,
  "absolute-ceiling stall margin");
near(absolute.climbAuthority, 0.60, 1e-12, "absolute-ceiling climb authority");
near(absolute.ceilingSinkSpeed, 0, 1e-12, "absolute-ceiling forced sink disabled");
near(altitudeAdjustedVerticalSpeed(200, absolute), 120, 1e-12,
  "ceiling weakens climb without applying a positional wall");
const verticalNose = altitudeAdjustedFlightVelocity(
  { x: 0, y: 1, z: 0 },
  500,
  absolute,
  0,
  {}
);
near(verticalNose.y, 300, 1e-12, "absolute-ceiling vertical flight-path speed");
assert(verticalNose.x === 0 && verticalNose.z === 0,
  `vertical climb invented horizontal motion: ${JSON.stringify(verticalNose)}`);
near(altitudeEnergyAdjustedSpeed(200, 1, absolute, 1), 200 - 9.80665, 1e-9,
  "vertical zoom climb spends gravitational energy");
near(altitudeEnergyAdjustedSpeed(200, -1, absolute, 1), 200 + 9.80665, 1e-9,
  "vertical dive returns gravitational energy");

const steepAngle = 87 * Math.PI / 180;
const steepHigh = altitudeAdjustedFlightVelocity(
  { x: Math.cos(steepAngle), y: Math.sin(steepAngle), z: 0 },
  518,
  highAltitudeEnvelopeAt(10625),
  0,
  {}
);
near(steepHigh.x, Math.cos(steepAngle) * 518, 1e-9,
  "10,625m horizontal component");
assert(Math.abs(steepHigh.x) < 30,
  `10,625m climb restriction invented sideways speed: ${JSON.stringify(steepHigh)}`);

const stalledVertical = altitudeAdjustedFlightVelocity(
  { x: 0, y: 1, z: 0 },
  60,
  sea,
  -44,
  {}
);
near(stalledVertical.y, 16, 1e-12, "vertical stall gravity deceleration");
assert(stalledVertical.x === 0 && stalledVertical.z === 0,
  `WORLD gravity became lateral motion: ${JSON.stringify(stalledVertical)}`);

const stalledLevel = altitudeAdjustedFlightVelocity(
  { x: 0, y: 0, z: -1 },
  60,
  sea,
  -44,
  {}
);
near(stalledLevel.y, -44, 1e-12, "level stall WORLD-down speed");
near(stalledLevel.z, -60, 1e-12, "level stall retained forward speed");

near(altitudeAdjustedResponseK(0.6, 1), 0.6, 1e-12,
  "sea-level throttle response");
assert(altitudeAdjustedResponseK(0.6, service.thrustFactor) > 0.6,
  "thin air must slow Sortie's inverted-K throttle response");

const specialistBonus = 2000;
const high = highAltitudeEnvelopeAt(11900, specialistBonus, 96, 833);
assert(high.climbAuthority >= 0.6 && high.climbAuthority < 0.62,
  `MiG-31 attack band should retain weak but non-zero climb response: ${high.climbAuthority}`);
assert(high.ceilingSinkSpeed === 0,
  `MiG-31 attack band received an artificial sink: ${high.ceilingSinkSpeed}`);
assert(high.maxSpeedFactor * 833 > high.stallSpeedMultiplier * 96,
  "MiG-31 must retain a narrow level-flight margin at 11.9km");
assert(high.absoluteCeiling === GAME_ABSOLUTE_CEILING_M + specialistBonus,
  `specialist ceiling bonus was not applied: ${high.absoluteCeiling}`);
const ordinaryAtInterceptorBand = highAltitudeEnvelopeAt(11900, 0, 84, 570);
assert(ordinaryAtInterceptorBand.maxSpeedFactor * 570
    < ordinaryAtInterceptorBand.stallSpeedMultiplier * 84,
  `ordinary fighter can sustain powered flight in the MiG-31 band: ${JSON.stringify(ordinaryAtInterceptorBand)}`);
const foxhoundAboveCeiling = highAltitudeEnvelopeAt(12500, specialistBonus, 96, 833);
assert(foxhoundAboveCeiling.maxSpeedFactor * 833
    < foxhoundAboveCeiling.stallSpeedMultiplier * 96,
  "MiG-31 can loiter with HALO above its own 12km energy ceiling");

console.log("check_high_altitude_envelope: PASS");
console.log(`  30,000 ft density ${service.densityRatio.toFixed(3)} / stall x${service.stallSpeedMultiplier.toFixed(3)}`);
console.log(`  combat ceiling ${GAME_SERVICE_CEILING_M}m / ordinary energy ceiling ${GAME_ABSOLUTE_CEILING_M}m`);
