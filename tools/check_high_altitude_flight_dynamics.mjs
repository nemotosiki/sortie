#!/usr/bin/env node
import {
  resetFlightDynamicsState,
  updateFlightDynamicsState
} from "../src/flight/flight-dynamics.js";
import { highAltitudeEnvelopeAt } from "../src/flight/high-altitude-envelope.js";

const assert = (condition, message, details = null) => {
  if (condition) return;
  throw new Error(`check_high_altitude_flight_dynamics: ${message}${details ? `\n${JSON.stringify(details, null, 2)}` : ""}`);
};

function simulate({ label, altitude, stallSpeed, maxSpeed, cruiseSpeed, structuralG, stability, seconds = 30 }) {
  const initialEnvelope = highAltitudeEnvelopeAt(altitude, stallSpeed, maxSpeed);
  const state = resetFlightDynamicsState({}, {
    x: 0,
    y: 0,
    z: -initialEnvelope.availableMaxSpeed
  });
  let y = altitude;
  const dt = 1 / 60;
  for (let frame = 0; frame < seconds / dt; frame += 1) {
    const envelope = highAltitudeEnvelopeAt(y, stallSpeed, maxSpeed);
    updateFlightDynamicsState(state, {
      forward: { x: 0, y: 0, z: -1 },
      up: { x: 0, y: 1, z: 0 },
      throttle: 1,
      airBrake: 0,
      baseCruiseSpeed: cruiseSpeed,
      baseMaxSpeed: maxSpeed,
      baseStallSpeed: stallSpeed,
      structuralG,
      stability,
      envelope,
      pitchInput: 0
    }, dt);
    y += state.y * dt;
  }
  return {
    label,
    startAltitude: altitude,
    finalAltitude: y,
    altitudeDelta: y - altitude,
    speed: state.airspeed,
    verticalSpeed: state.y,
    initial: {
      availableMaxSpeed: initialEnvelope.availableMaxSpeed,
      minimumControlledSpeed: initialEnvelope.minimumControlledSpeed,
      liftMargin: Math.pow(
        initialEnvelope.availableMaxSpeed / initialEnvelope.minimumControlledSpeed,
        2
      )
    },
    dynamics: {
      liftDeficit: state.liftDeficit,
      loadFactorG: state.telemetry.loadFactorG,
      thrustLapse: state.telemetry.thrustLapse
    }
  };
}

function simulateZoomCycles() {
  const aircraft = {
    stallSpeed: 96,
    maxSpeed: 833,
    cruiseSpeed: 405,
    structuralG: 2.5,
    stability: 0.04
  };
  let altitude = 11000;
  const initial = highAltitudeEnvelopeAt(altitude, aircraft.stallSpeed, aircraft.maxSpeed);
  const state = resetFlightDynamicsState({}, { x: 0, y: 0, z: -initial.availableMaxSpeed });
  const dt = 1 / 60;
  const peaks = [];
  const flyPhase = (seconds, pitchDeg, trackPeak = false) => {
    const pitch = pitchDeg * Math.PI / 180;
    const forward = { x: 0, y: Math.sin(pitch), z: -Math.cos(pitch) };
    const up = { x: 0, y: Math.cos(pitch), z: Math.sin(pitch) };
    let peak = altitude;
    for (let frame = 0; frame < seconds / dt; frame += 1) {
      const envelope = highAltitudeEnvelopeAt(altitude, aircraft.stallSpeed, aircraft.maxSpeed);
      updateFlightDynamicsState(state, {
        forward,
        up,
        throttle: 1,
        airBrake: 0,
        baseCruiseSpeed: aircraft.cruiseSpeed,
        baseMaxSpeed: aircraft.maxSpeed,
        baseStallSpeed: aircraft.stallSpeed,
        structuralG: aircraft.structuralG,
        stability: aircraft.stability,
        envelope,
        pitchInput: pitchDeg > 0 ? 0.12 : -0.08
      }, dt);
      altitude += state.y * dt;
      peak = Math.max(peak, altitude);
    }
    if (trackPeak) peaks.push(peak);
  };
  for (let cycle = 0; cycle < 3; cycle += 1) {
    flyPhase(15, 8, true);
    flyPhase(15, -6, false);
  }
  return {
    peaks,
    finalAltitude: altitude,
    finalSpeed: state.airspeed,
    finalVerticalSpeed: state.y
  };
}

const f16At10 = simulate({
  label: "F-16 @10km",
  altitude: 10000,
  stallSpeed: 82,
  maxSpeed: 570 * 0.95,
  cruiseSpeed: 260,
  structuralG: 3,
  stability: 0.45
});
const mig31At11 = simulate({
  label: "MiG-31 @11km",
  altitude: 11000,
  stallSpeed: 96,
  maxSpeed: 833,
  cruiseSpeed: 405,
  structuralG: 2.5,
  stability: 0.04
});
const mig31At12 = simulate({
  label: "MiG-31 @12km",
  altitude: 12000,
  stallSpeed: 96,
  maxSpeed: 833,
  cruiseSpeed: 405,
  structuralG: 2.5,
  stability: 0.04
});
const mig31Above = simulate({
  label: "MiG-31 @12.5km",
  altitude: 12500,
  stallSpeed: 96,
  maxSpeed: 833,
  cruiseSpeed: 405,
  structuralG: 2.5,
  stability: 0.04
});
const mig31ZoomCycles = simulateZoomCycles();

assert(f16At10.initial.liftMargin < 1 && f16At10.altitudeDelta < -100,
  "ordinary fighter sustained level flight above its natural envelope", f16At10);
assert(Math.abs(mig31At11.initial.availableMaxSpeed * 3.6 - 1999.2) < 0.1,
  "MiG-31 lost its authored 11km high-speed performance", mig31At11);
assert(mig31At11.initial.liftMargin > 1 && Math.abs(mig31At11.altitudeDelta) < 20,
  "MiG-31 cannot hold its intended 11km station", mig31At11);
assert(mig31At12.initial.liftMargin >= 0.999
    && Math.abs(mig31At12.altitudeDelta) < 60,
  "MiG-31 12km boundary is not a narrow sustainable edge", mig31At12);
assert(mig31Above.initial.liftMargin < 1 && mig31Above.altitudeDelta < -50,
  "MiG-31 received an unlimited ceiling above its high-altitude design band", mig31Above);
assert(Math.max(...mig31ZoomCycles.peaks) < 13000
    && mig31ZoomCycles.peaks.slice(1).every((peak) => peak <= mig31ZoomCycles.peaks[0] + 100),
  "MiG-31 regenerated an unlimited ceiling through repeated zoom cycles", mig31ZoomCycles);

console.log("check_high_altitude_flight_dynamics: PASS");
console.log(JSON.stringify({ f16At10, mig31At11, mig31At12, mig31Above, mig31ZoomCycles }, null, 2));
