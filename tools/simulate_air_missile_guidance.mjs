#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

// Deterministic 2D engagement model used to compare guidance laws before they
// are wired into Three.js. It deliberately shares the game's authored speed,
// acceleration and turn limits, but does not pretend to be a full 6DOF model.

const DEG = Math.PI / 180;
const GRAVITY = 9.81;
const NAVIGATION_RATIO = 3;
const MISSILE_ACCELERATION = 180;
const MISSILE_MAX_SPEED = 556;
const MISSILE_MAX_TURN_RATE = 75 * DEG;
const MISSILE_MAX_LATERAL_ACCELERATION = 50 * GRAVITY;
const AUTOPILOT_TIME_CONSTANT = 0.18;
const GUIDANCE_RAMP_START = 0.04;
const GUIDANCE_RAMP_END = 0.24;
const FUSE_RADIUS = 16;
const TERMINAL_COMMIT_TIME = 0.44;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a, scalar) => ({ x: a.x * scalar, y: a.y * scalar });
const dot = (a, b) => a.x * b.x + a.y * b.y;
const cross = (a, b) => a.x * b.y - a.y * b.x;
const length = (value) => Math.hypot(value.x, value.y);
const normal = (value) => {
  const magnitude = length(value);
  return magnitude > 1e-9 ? mul(value, 1 / magnitude) : { x: 0, y: 0 };
};
const smoothstep = (min, max, value) => {
  const t = clamp((value - min) / Math.max(max - min, 1e-9), 0, 1);
  return t * t * (3 - 2 * t);
};
const wrapAngle = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

function solveInterceptTime(relativePosition, targetVelocity, projectileSpeed) {
  const speed = Math.max(0, projectileSpeed);
  const c = dot(relativePosition, relativePosition);
  if (c <= 1e-9 || speed <= 1e-6) return 0;
  const a = dot(targetVelocity, targetVelocity) - speed * speed;
  const b = 2 * dot(relativePosition, targetVelocity);
  if (Math.abs(a) <= 1e-9) {
    const linear = Math.abs(b) > 1e-9 ? -c / b : NaN;
    return Number.isFinite(linear) && linear > 0 ? linear : Math.sqrt(c) / speed;
  }
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return Math.sqrt(c) / speed;
  const root = Math.sqrt(discriminant);
  const first = (-b - root) / (2 * a);
  const second = (-b + root) / (2 * a);
  let result = Infinity;
  if (first > 0) result = first;
  if (second > 0) result = Math.min(result, second);
  return Number.isFinite(result) ? result : Math.sqrt(c) / speed;
}

function segmentMissDistance(missileStart, missileEnd, targetStart, targetEnd) {
  const relativeStart = sub(targetStart, missileStart);
  const relativeTravel = sub(sub(targetEnd, targetStart), sub(missileEnd, missileStart));
  const travelSq = dot(relativeTravel, relativeTravel);
  const t = travelSq > 1e-9
    ? clamp(-dot(relativeStart, relativeTravel) / travelSq, 0, 1)
    : 0;
  return length(add(relativeStart, mul(relativeTravel, t)));
}

function targetControl(profile, time, range) {
  if (profile === "constant-turn") return { turnRate: 24 * DEG, targetSpeed: 260 };
  if (profile === "brake-turn") {
    const braking = range < 420;
    return { turnRate: braking ? 38 * DEG : 24 * DEG, targetSpeed: braking ? 125 : 260 };
  }
  if (profile === "brake-boost-turn") {
    if (range >= 420) return { turnRate: 24 * DEG, targetSpeed: 260 };
    if (range >= 250) return { turnRate: 40 * DEG, targetSpeed: 125 };
    return { turnRate: 18 * DEG, targetSpeed: 390 };
  }
  return { turnRate: 0, targetSpeed: 260 };
}

function runScenario({
  mode,
  profile = "constant-turn",
  fps = 120,
  range = 900,
  launchSpeed = 260,
  seconds = 6
}) {
  const dt = 1 / fps;
  let targetPosition = { x: 0, y: range };
  let targetHeading = Math.PI / 2;
  let targetSpeed = 260;
  let missilePosition = { x: 0, y: 0 };
  let missileHeading = Math.PI / 2;
  let missileSpeed = launchSpeed;
  let achievedAcceleration = 0;
  let terminalCommitPoint = null;
  let minimumDistance = Infinity;
  let hit = false;
  const samples = [];

  for (let frame = 0; frame < Math.ceil(seconds * fps); frame += 1) {
    const time = frame * dt;
    const relativePosition = sub(targetPosition, missilePosition);
    const rangeNow = length(relativePosition);
    const control = targetControl(profile, time, rangeNow);
    targetHeading += control.turnRate * dt;
    const targetResponse = 1 - Math.exp(-dt / 0.55);
    targetSpeed += (control.targetSpeed - targetSpeed) * targetResponse;
    const targetVelocity = {
      x: Math.cos(targetHeading) * targetSpeed,
      y: Math.sin(targetHeading) * targetSpeed
    };
    const targetNext = add(targetPosition, mul(targetVelocity, dt));

    const missileForward = {
      x: Math.cos(missileHeading),
      y: Math.sin(missileHeading)
    };
    const missileVelocity = mul(missileForward, missileSpeed);
    const relativeVelocity = sub(targetVelocity, missileVelocity);
    let commandedAcceleration = 0;
    let losRate = 0;

    if (mode === "predictive") {
      const interceptTime = clamp(
        solveInterceptTime(relativePosition, targetVelocity, missileSpeed),
        0,
        6
      );
      const aim = add(relativePosition, mul(targetVelocity, interceptTime));
      const desiredHeading = Math.atan2(aim.y, aim.x);
      const requestedRate = wrapAngle(desiredHeading - missileHeading) / dt;
      const effectiveRate = clamp(
        requestedRate,
        -MISSILE_MAX_TURN_RATE,
        MISSILE_MAX_TURN_RATE
      );
      missileHeading += effectiveRate * dt;
      commandedAcceleration = Math.abs(effectiveRate) * missileSpeed;
      achievedAcceleration = commandedAcceleration;
    } else {
      const interceptTime = clamp(
        solveInterceptTime(relativePosition, targetVelocity, missileSpeed),
        0,
        6
      );
      if (mode === "pn-commit" && !terminalCommitPoint && interceptTime <= TERMINAL_COMMIT_TIME) {
        terminalCommitPoint = add(targetPosition, mul(targetVelocity, interceptTime));
      }
      const guidancePosition = terminalCommitPoint
        ? sub(terminalCommitPoint, missilePosition)
        : relativePosition;
      const guidanceVelocity = terminalCommitPoint
        ? mul(missileVelocity, -1)
        : relativeVelocity;
      const rangeSq = Math.max(dot(guidancePosition, guidancePosition), 1e-9);
      losRate = cross(guidancePosition, guidanceVelocity) / rangeSq;
      const closingSpeed = Math.max(
        0,
        -dot(guidancePosition, guidanceVelocity) /
          Math.max(length(guidancePosition), 1e-9)
      );
      const signedCommand = NAVIGATION_RATIO * closingSpeed * losRate;
      const authority = smoothstep(GUIDANCE_RAMP_START, GUIDANCE_RAMP_END, time);
      commandedAcceleration = clamp(
        signedCommand * authority,
        -MISSILE_MAX_LATERAL_ACCELERATION,
        MISSILE_MAX_LATERAL_ACCELERATION
      );
      const response = 1 - Math.exp(-dt / AUTOPILOT_TIME_CONSTANT);
      achievedAcceleration += (commandedAcceleration - achievedAcceleration) * response;
      const achievedRate = clamp(
        achievedAcceleration / Math.max(missileSpeed, 1),
        -MISSILE_MAX_TURN_RATE,
        MISSILE_MAX_TURN_RATE
      );
      missileHeading += achievedRate * dt;
    }

    missileSpeed = Math.min(
      MISSILE_MAX_SPEED,
      missileSpeed + MISSILE_ACCELERATION * dt
    );
    const missileNext = add(missilePosition, {
      x: Math.cos(missileHeading) * missileSpeed * dt,
      y: Math.sin(missileHeading) * missileSpeed * dt
    });
    const missDistance = segmentMissDistance(
      missilePosition,
      missileNext,
      targetPosition,
      targetNext
    );
    minimumDistance = Math.min(minimumDistance, missDistance);
    samples.push({
      time,
      missile: { ...missilePosition },
      target: { ...targetPosition },
      range: rangeNow,
      missileHeading,
      missileSpeed,
      targetSpeed,
      losRate,
      commandedG: commandedAcceleration / GRAVITY,
      achievedG: achievedAcceleration / GRAVITY
      ,terminalCommitted: Boolean(terminalCommitPoint)
    });
    missilePosition = missileNext;
    targetPosition = targetNext;
    if (missDistance < FUSE_RADIUS) {
      hit = true;
      break;
    }
  }

  const firstTenth = samples.find((sample) => sample.time >= 0.1) || samples.at(-1);
  const firstQuarter = samples.find((sample) => sample.time >= 0.25) || samples.at(-1);
  return {
    mode,
    profile,
    fps,
    range,
    launchSpeed,
    hit,
    minimumDistance,
    headingChangeAtPointOneDeg: Math.abs(wrapAngle(firstTenth.missileHeading - Math.PI / 2)) / DEG,
    lateralDisplacementAtPointOne: Math.abs(firstTenth.missile.x),
    headingChangeAtPointTwoFiveDeg: Math.abs(wrapAngle(firstQuarter.missileHeading - Math.PI / 2)) / DEG,
    lateralDisplacementAtPointTwoFive: Math.abs(firstQuarter.missile.x),
    samples
  };
}

function trajectorySvg(results) {
  const all = results.flatMap((result) => result.samples.flatMap((sample) => [sample.missile, sample.target]));
  const minX = Math.min(...all.map((point) => point.x));
  const maxX = Math.max(...all.map((point) => point.x));
  const minY = Math.min(...all.map((point) => point.y));
  const maxY = Math.max(...all.map((point) => point.y));
  const width = 1200;
  const height = 800;
  const margin = 45;
  const scale = Math.min(
    (width - margin * 2) / Math.max(maxX - minX, 1),
    (height - margin * 2) / Math.max(maxY - minY, 1)
  );
  const point = (value) => `${margin + (value.x - minX) * scale},${height - margin - (value.y - minY) * scale}`;
  const colors = { predictive: "#ff4545", pn: "#35d07f", "pn-commit": "#4da3ff" };
  const paths = results.map((result) => {
    const missile = result.samples.map((sample) => point(sample.missile)).join(" ");
    return `<polyline fill="none" stroke="${colors[result.mode]}" stroke-width="4" points="${missile}"/>`;
  });
  const target = results[0].samples.map((sample) => point(sample.target)).join(" ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#101820"/>
  <polyline fill="none" stroke="#e9eef4" stroke-width="4" points="${target}"/>
  ${paths.join("\n  ")}
  <text x="50" y="45" fill="#ff4545" font-family="monospace" font-size="22">red: current predictive</text>
  <text x="50" y="75" fill="#35d07f" font-family="monospace" font-size="22">green: PN + ramp + autopilot</text>
  <text x="50" y="105" fill="#4da3ff" font-family="monospace" font-size="22">blue: PN + 0.44s terminal commit</text>
  <text x="50" y="135" fill="#e9eef4" font-family="monospace" font-size="22">white: target aircraft</text>
</svg>`;
}

const outputFlag = process.argv.indexOf("--out");
const outputDirectory = outputFlag >= 0 ? path.resolve(process.argv[outputFlag + 1]) : null;
const representative = ["predictive", "pn", "pn-commit"].map((mode) => runScenario({ mode }));
const summary = [];
for (const profile of ["constant-turn", "brake-turn", "brake-boost-turn"]) {
  for (const mode of ["predictive", "pn", "pn-commit"]) {
    let hits = 0;
    let cases = 0;
    for (const fps of [30, 60, 120]) {
      for (const range of [600, 900, 1200]) {
        for (const launchSpeed of [128, 170, 300, 430]) {
          const result = runScenario({ mode, profile, fps, range, launchSpeed });
          hits += result.hit ? 1 : 0;
          cases += 1;
        }
      }
    }
    summary.push({ profile, mode, hits, cases });
  }
}

if (outputDirectory) {
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(outputDirectory, "air-missile-guidance-trajectories.svg"),
    trajectorySvg(representative),
    "utf8"
  );
  fs.writeFileSync(
    path.join(outputDirectory, "air-missile-guidance-summary.json"),
    JSON.stringify({ representative, summary }, null, 2),
    "utf8"
  );
}

console.log("simulate_air_missile_guidance:");
for (const result of representative) {
  console.log(
    `  ${result.mode.padEnd(10)} hit=${String(result.hit).padEnd(5)}` +
    ` 0.10s heading=${result.headingChangeAtPointOneDeg.toFixed(2)}deg` +
    ` lateral=${result.lateralDisplacementAtPointOne.toFixed(2)}m` +
    ` min=${result.minimumDistance.toFixed(2)}m`
  );
}
for (const row of summary) {
  console.log(`  ${row.profile.padEnd(17)} ${row.mode.padEnd(10)} ${row.hits}/${row.cases}`);
}
if (outputDirectory) console.log(`  output=${outputDirectory}`);
