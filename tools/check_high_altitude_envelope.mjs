#!/usr/bin/env node
import {
  GAME_ABSOLUTE_CEILING_M,
  GAME_SERVICE_CEILING_M,
  HIGH_ALTITUDE_EFFECT_START_M,
  altitudeAdjustedFlightVelocity,
  altitudeAdjustedResponseK,
  altitudeAdjustedVerticalSpeed,
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
near(service.thrustFactor, 0.70, 1e-12, "service-ceiling thrust factor");
near(service.maxSpeedFactor, 0.82, 1e-12, "service-ceiling speed factor");
near(service.climbAuthority, 0.65, 1e-12, "service-ceiling climb authority");
near(service.ceilingSinkSpeed, 0, 1e-12, "service-ceiling sink onset");

near(absolute.turnAuthority, 0.52, 1e-12, "absolute-ceiling turn authority");
near(absolute.thrustFactor, 0.45, 1e-12, "absolute-ceiling thrust factor");
near(absolute.maxSpeedFactor, 0.72, 1e-12, "absolute-ceiling speed factor");
near(absolute.climbAuthority, 0, 1e-12, "absolute-ceiling climb authority");
near(absolute.ceilingSinkSpeed, -32, 1e-12, "absolute-ceiling sink");
near(altitudeAdjustedVerticalSpeed(200, absolute), -32, 1e-12,
  "positive climb cannot cross the soft absolute ceiling");
const verticalNose = altitudeAdjustedFlightVelocity(
  { x: 0, y: 1, z: 0 },
  500,
  absolute,
  0,
  { x: 1, y: 0, z: 0 },
  {}
);
near(Math.hypot(verticalNose.x, verticalNose.y, verticalNose.z), 500, 1e-9,
  "absolute-ceiling velocity magnitude");
near(verticalNose.y, -32, 1e-12, "absolute-ceiling vertical flight-path speed");
assert(verticalNose.x > 498 && verticalNose.z === 0,
  `blocked climb did not remain as horizontal inertia: ${JSON.stringify(verticalNose)}`);

const steepAngle = 87 * Math.PI / 180;
const steepHigh = altitudeAdjustedFlightVelocity(
  { x: Math.cos(steepAngle), y: Math.sin(steepAngle), z: 0 },
  518,
  highAltitudeEnvelopeAt(10625),
  0,
  { x: 1, y: 0, z: 0 },
  {}
);
near(Math.hypot(steepHigh.x, steepHigh.y, steepHigh.z), 518, 1e-9,
  "10,625m steep-climb velocity magnitude");
assert(Math.abs(steepHigh.x) > 500,
  `10,625m climb restriction deleted forward speed: ${JSON.stringify(steepHigh)}`);

near(altitudeAdjustedResponseK(0.6, 1), 0.6, 1e-12,
  "sea-level throttle response");
assert(altitudeAdjustedResponseK(0.6, service.thrustFactor) > 0.6,
  "thin air must slow Sortie's inverted-K throttle response");

const high = highAltitudeEnvelopeAt(10650);
assert(high.climbAuthority > 0 && high.climbAuthority < 0.12,
  `MiG-31 attack band should retain only a narrow climb margin: ${high.climbAuthority}`);
assert(high.ceilingSinkSpeed < -27,
  `MiG-31 attack band should require a climb attitude to hold height: ${high.ceilingSinkSpeed}`);

console.log("check_high_altitude_envelope: PASS");
console.log(`  30,000 ft density ${service.densityRatio.toFixed(3)} / stall x${service.stallSpeedMultiplier.toFixed(3)}`);
console.log(`  combat ceiling ${GAME_SERVICE_CEILING_M}m / soft absolute ${GAME_ABSOLUTE_CEILING_M}m`);
