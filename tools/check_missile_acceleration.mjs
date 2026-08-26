#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.argv[1], "../..");
const guidancePath = path.join(root, "src/combat/missile-guidance.js");
const indexPath = path.join(root, "index.html");
const guidanceSource = fs.readFileSync(guidancePath, "utf8");
const indexSource = fs.readFileSync(indexPath, "utf8");
const {
  DEFAULT_MISSILE_ACCELERATION,
  accelerateMissileSpeed
} = await import(`${pathToFileURL(guidancePath).href}?v=${Date.now()}`);

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details === null ? "" : `\n${JSON.stringify(details, null, 2)}`;
  throw new Error(`check_missile_acceleration: ${message}${suffix}`);
}

function simulate({ launchSpeed, maximumSpeed, seconds, fps }) {
  let speed = launchSpeed;
  const frames = Math.round(seconds * fps);
  for (let frame = 0; frame < frames; frame += 1) {
    const next = accelerateMissileSpeed(
      speed,
      maximumSpeed,
      DEFAULT_MISSILE_ACCELERATION,
      1 / fps
    );
    assert(next >= speed, "missile speed decreased below its ceiling", {
      fps,
      frame,
      speed,
      next
    });
    speed = next;
  }
  return speed;
}

assert(
  DEFAULT_MISSILE_ACCELERATION === 180,
  "shared acceleration must remain the authored 180 m/s^2"
);

const oneSecond = [30, 60, 120].map((fps) => simulate({
  launchSpeed: 260,
  maximumSpeed: 556,
  seconds: 1,
  fps
}));
for (const speed of oneSecond) {
  assert(Math.abs(speed - 440) < 1e-9, "one-second acceleration is frame-rate dependent", {
    oneSecond
  });
}

const twoSeconds = [30, 60, 120].map((fps) => simulate({
  launchSpeed: 260,
  maximumSpeed: 556,
  seconds: 2,
  fps
}));
for (const speed of twoSeconds) {
  assert(speed === 556, "missile did not stop at its maximum speed", { twoSeconds });
}

assert(
  accelerateMissileSpeed(556, 556, DEFAULT_MISSILE_ACCELERATION, 1) === 556,
  "missile at maximum speed must not accelerate past it"
);
assert(
  accelerateMissileSpeed(260, 556, DEFAULT_MISSILE_ACCELERATION, 0) === 260,
  "zero elapsed time changed missile speed"
);
assert(
  !guidanceSource.includes("damping(0.012, slice)"),
  "player missile still uses the near-instant smoothing acceleration"
);
assert(
  !indexSource.includes("damping(0.022, dt)"),
  "enemy missile still uses the near-instant smoothing acceleration"
);
assert(
  indexSource.includes("acceleration: enhancedTuning")
    && indexSource.includes("Number(enhancedTuning.enhancedAcceleration)")
    && indexSource.includes(": MISSILE_ACCELERATION,"),
  "ordinary enemy missiles must retain shared acceleration while explicit mission tuning may raise it"
);

console.log("check_missile_acceleration: PASS");
console.log("  inherited 260 m/s launch -> 440 m/s after 1.0 s -> 556 m/s ceiling after 1.65 s");
console.log("  acceleration=180 m/s^2; monotonic and frame-rate independent at 30/60/120 fps");
