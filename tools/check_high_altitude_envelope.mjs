#!/usr/bin/env node
import {
  GAME_REFERENCE_FIGHTER_CEILING_M,
  GAME_SERVICE_CEILING_M,
  HIGH_ALTITUDE_EFFECT_START_M,
  altitudeAdjustedFlightVelocity,
  altitudeAdjustedResponseK,
  altitudeAdjustedStallThreshold,
  altitudeAdjustedVerticalSpeed,
  altitudeEnergyAdjustedSpeed,
  estimatedSustainableAltitudeM,
  highAltitudeClimbAuthorityAtSpeed,
  highAltitudeControlAuthorityAtSpeed,
  highAltitudeEnergyFloorAt,
  highAltitudeEnvelopeAt,
  highAltitudeSpeedRetentionAt,
  isaTroposphereDensityRatio
} from "../src/flight/high-altitude-envelope.js";

const assert = (condition, message) => {
  if (!condition) throw new Error(`check_high_altitude_envelope: ${message}`);
};
const near = (actual, expected, tolerance, label) => {
  assert(Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected} +/- ${tolerance}, got ${actual}`);
};

const sea = highAltitudeEnvelopeAt(0, 84, 570);
const onset = highAltitudeEnvelopeAt(HIGH_ALTITUDE_EFFECT_START_M, 84, 570);
for (const sample of [sea, onset]) {
  near(sample.effectiveDensityRatio, 1, 1e-12, "below-onset effective density");
  near(sample.maxSpeedFactor, 1, 1e-12, "below-onset speed retention");
  near(sample.energyFloorSpeed, 0, 1e-12, "below-onset energy floor");
  near(sample.minimumControlledSpeed, 84, 1e-12, "below-onset stall entry");
  near(highAltitudeControlAuthorityAtSpeed(84, sample), 1, 1e-12,
    "below-onset control authority");
  near(highAltitudeClimbAuthorityAtSpeed(84, sample), 1, 1e-12,
    "below-onset climb authority");
}

// NASA's standard-atmosphere table gives 0.000889 / 0.002377 = 0.374 at
// 30,000 ft. The closed-form ISA curve should land within table rounding.
const nasaTableRatio = 0.000889 / 0.002377;
const service = highAltitudeEnvelopeAt(GAME_SERVICE_CEILING_M, 84, 570);
near(isaTroposphereDensityRatio(GAME_SERVICE_CEILING_M), nasaTableRatio, 0.006,
  "30,000 ft density ratio");
assert(service.stallSpeedMultiplier > 1.62 && service.stallSpeedMultiplier < 1.65,
  `30,000 ft density stall multiplier out of band: ${service.stallSpeedMultiplier}`);

near(highAltitudeSpeedRetentionAt(11000), 2 / 3, 1e-12,
  "11km shared speed retention");
near(highAltitudeSpeedRetentionAt(12000), 0.66, 1e-12,
  "12km shared speed retention");
near(highAltitudeEnergyFloorAt(11000), 535, 1e-12,
  "11km control-energy floor");
near(highAltitudeEnergyFloorAt(12000), 550, 1e-12,
  "12km control-energy floor");
assert(GAME_REFERENCE_FIGHTER_CEILING_M === 10000,
  "ordinary fighter reference band changed");

const foxhound11 = highAltitudeEnvelopeAt(11000, 96, 833);
near(foxhound11.availableMaxSpeed * 3.6, 1999.2, 1e-9,
  "MiG-31 11km maximum speed");
near(foxhound11.minimumControlledSpeed, 535, 1e-9,
  "MiG-31 11km minimum controlled speed");
assert(foxhound11.availableMaxSpeed > foxhound11.minimumControlledSpeed,
  "MiG-31 lost its narrow 11km energy margin");
const foxhoundControl = highAltitudeControlAuthorityAtSpeed(
  foxhound11.availableMaxSpeed,
  foxhound11
);
const foxhoundClimb = highAltitudeClimbAuthorityAtSpeed(
  foxhound11.availableMaxSpeed,
  foxhound11
);
assert(foxhoundControl > 0.8 && foxhoundControl < 0.9,
  `MiG-31 11km control authority out of band: ${foxhoundControl}`);
assert(foxhoundClimb > 0.1 && foxhoundClimb < 0.15,
  `MiG-31 11km climb margin out of band: ${foxhoundClimb}`);
near(foxhound11.ceilingSinkSpeed, 0, 1e-12,
  "aircraft received an artificial ceiling sink");

const ceilingCases = [
  ["MiG-31", 96, 833, 11920],
  ["F-3", 72, 780 * 0.95, 10460],
  ["F-22", 66, 725 * 0.95, 10205],
  ["F-4", 92, 560, 9680],
  ["F-16", 82, 570 * 0.95, 9610],
  ["F/A-18A", 70, 520 * 0.95, 9435]
];
for (const [label, stall, maximum, expected] of ceilingCases) {
  near(estimatedSustainableAltitudeM(stall, maximum), expected, 5,
    `${label} sustainable altitude`);
}

const f16At10000 = highAltitudeEnvelopeAt(10000, 82, 570 * 0.95);
assert(f16At10000.availableMaxSpeed < f16At10000.minimumControlledSpeed,
  "F-16 can sustain full-power flight above its simulated ceiling");
const f22At10000 = highAltitudeEnvelopeAt(10000, 66, 725 * 0.95);
assert(f22At10000.availableMaxSpeed > f22At10000.minimumControlledSpeed,
  "F-22 lost its modest top-tier margin at 10km");
const ordinaryAt11900 = highAltitudeEnvelopeAt(11900, 84, 570);
assert(ordinaryAt11900.availableMaxSpeed < ordinaryAt11900.minimumControlledSpeed,
  "ordinary fighter can loiter in the MiG-31 band");

const f16At9000 = highAltitudeEnvelopeAt(9000, 82, 570 * 0.95);
near(
  altitudeAdjustedStallThreshold(82, 82, f16At9000),
  f16At9000.minimumControlledSpeed,
  1e-12,
  "stall entry follows shared energy floor"
);
assert(altitudeAdjustedStallThreshold(62, 82, f16At9000)
    < f16At9000.minimumControlledSpeed,
  "deep-stall offset collapsed into stall entry");
assert(altitudeAdjustedStallThreshold(114, 82, f16At9000)
    > f16At9000.minimumControlledSpeed,
  "recovery offset collapsed into stall entry");

const verticalCommand = altitudeAdjustedVerticalSpeed(
  200,
  foxhound11,
  foxhound11.availableMaxSpeed
);
near(verticalCommand, 200, 1e-12,
  "ballistic climb velocity must not be erased by altitude logic");
const verticalNose = altitudeAdjustedFlightVelocity(
  { x: 0, y: 1, z: 0 },
  foxhound11.availableMaxSpeed,
  foxhound11,
  0,
  {}
);
near(verticalNose.y, foxhound11.availableMaxSpeed, 1e-12,
  "11km vertical zoom must retain forward kinetic velocity");
assert(verticalNose.x === 0 && verticalNose.z === 0,
  `vertical climb invented horizontal motion: ${JSON.stringify(verticalNose)}`);

near(altitudeEnergyAdjustedSpeed(200, 1, foxhound11, 1), 200 - 9.80665, 1e-9,
  "vertical zoom climb spends gravitational energy");
near(altitudeEnergyAdjustedSpeed(200, -1, foxhound11, 1), 200 + 9.80665, 1e-9,
  "vertical dive returns gravitational energy");

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
assert(altitudeAdjustedResponseK(0.6, foxhound11.thrustFactor) > 0.6,
  "thin air must slow Sortie's inverted-K throttle response");

console.log("check_high_altitude_envelope: PASS");
console.log(`  MiG-31 @11km ${(foxhound11.availableMaxSpeed * 3.6).toFixed(0)}km/h / ceiling ${estimatedSustainableAltitudeM(96, 833)}m`);
console.log(`  ordinary band ${estimatedSustainableAltitudeM(70, 520 * 0.95)}-${estimatedSustainableAltitudeM(72, 780 * 0.95)}m`);
