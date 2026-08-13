#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

// Deterministic launch-phase trade study. This is intentionally independent of
// Three.js and the game loop: it compares trajectory contracts before any of
// them are wired into runtime state.

const DEG = Math.PI / 180;
const GRAVITY = 9.81;
const NAVIGATION_RATIO = 3;
const ACCELERATION = 180;
const STANDARD_MAX_SPEED = 556;
const STANDARD_LIFE = 9.5;
const MAX_TURN_RATE = 75 * DEG;
const MAX_LATERAL_ACCELERATION = 50 * GRAVITY;
const AUTOPILOT_TIME_CONSTANT = 0.18;
const GUIDANCE_RAMP_START = 0.04;
const GUIDANCE_RAMP_END = 0.24;
const AIR_FUSE = 16;
const SEA_CLEARANCE = 55;
const SEA_TERMINAL_RANGE = 180;

const SKIM_ALTITUDE = 50;
const SKIM_DESCENT_SLOPE = -1.2;
const SKIM_DESCENT_HORIZON = 350;
const SKIM_TERMINAL_RANGE = 500;
const SKIM_DIVE_RATIO = 1.5;
const POPUP_MIN_DROP = 60;
const LOFT_ABOVE_LAUNCH = 120;
const LOFT_ABOVE_TARGET = 180;
const LOFT_TERMINAL_RANGE = 420;
const GROUND_DIVE_RATIO = 2;
const TERRAIN_CLEARANCE = 90;
const TERRAIN_SAMPLES = 6;

const v = (x = 0, y = 0, z = 0) => ({ x, y, z });
const clone = (a) => v(a.x, a.y, a.z);
const add = (a, b) => v(a.x + b.x, a.y + b.y, a.z + b.z);
const sub = (a, b) => v(a.x - b.x, a.y - b.y, a.z - b.z);
const mul = (a, scalar) => v(a.x * scalar, a.y * scalar, a.z * scalar);
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => v(
  a.y * b.z - a.z * b.y,
  a.z * b.x - a.x * b.z,
  a.x * b.y - a.y * b.x
);
const lengthSq = (a) => dot(a, a);
const length = (a) => Math.sqrt(lengthSq(a));
const normal = (a, fallback = v(1, 0, 0)) => {
  const magnitude = length(a);
  return magnitude > 1e-9 ? mul(a, 1 / magnitude) : clone(fallback);
};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (from, to, amount) => from + (to - from) * amount;
const lerpVector = (from, to, amount) => v(
  lerp(from.x, to.x, amount),
  lerp(from.y, to.y, amount),
  lerp(from.z, to.z, amount)
);
const angleBetween = (a, b) => Math.acos(clamp(dot(normal(a), normal(b)), -1, 1));
const smoothstep = (min, max, value) => {
  const amount = clamp((value - min) / Math.max(max - min, 1e-9), 0, 1);
  return amount * amount * (3 - 2 * amount);
};

function solveInterceptTime(relativePosition, targetVelocity, projectileSpeed) {
  const speed = Math.max(0, projectileSpeed);
  const c = lengthSq(relativePosition);
  if (c <= 1e-9 || speed <= 1e-6) return 0;
  const a = lengthSq(targetVelocity) - speed * speed;
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

function movingSegmentMissDistance(missileStart, missileEnd, targetStart, targetEnd) {
  const relativeStart = sub(targetStart, missileStart);
  const relativeTravel = sub(sub(targetEnd, targetStart), sub(missileEnd, missileStart));
  const travelSq = lengthSq(relativeTravel);
  const time = travelSq > 1e-9
    ? clamp(-dot(relativeStart, relativeTravel) / travelSq, 0, 1)
    : 0;
  return length(add(relativeStart, mul(relativeTravel, time)));
}

function pnCommand(relativePosition, relativeVelocity, missileForward, authority = 1) {
  const range = length(relativePosition);
  if (!(range > 1e-6)) return v();
  const closingSpeed = Math.max(0, -dot(relativePosition, relativeVelocity) / range);
  if (!(closingSpeed > 1e-6)) return v();
  const losRate = mul(cross(relativePosition, relativeVelocity), 1 / (range * range));
  const command = mul(cross(losRate, missileForward), NAVIGATION_RATIO * closingSpeed * authority);
  const magnitude = length(command);
  return magnitude > MAX_LATERAL_ACCELERATION
    ? mul(command, MAX_LATERAL_ACCELERATION / magnitude)
    : command;
}

function captureCommand(missileForward, desiredDirection, missileSpeed) {
  const desired = normal(desiredDirection, missileForward);
  const forwardDot = clamp(dot(missileForward, desired), -1, 1);
  const lateral = sub(desired, mul(missileForward, forwardDot));
  const lateralMagnitude = length(lateral);
  if (!(lateralMagnitude > 1e-9)) return v();
  const error = Math.acos(forwardDot);
  const requestedRate = Math.min(MAX_TURN_RATE, error / 0.35);
  const requestedAcceleration = Math.min(
    MAX_LATERAL_ACCELERATION,
    requestedRate * Math.max(missileSpeed, 1)
  );
  return mul(lateral, requestedAcceleration / lateralMagnitude);
}

function updateAutopilot(achieved, command, forward, dt) {
  const response = 1 - Math.exp(-dt / AUTOPILOT_TIME_CONSTANT);
  let next = lerpVector(achieved, command, response);
  next = sub(next, mul(forward, dot(next, forward)));
  const magnitude = length(next);
  if (magnitude > MAX_LATERAL_ACCELERATION) {
    next = mul(next, MAX_LATERAL_ACCELERATION / magnitude);
  }
  return next;
}

function steerFromAcceleration(forward, acceleration, speed, dt) {
  const magnitude = length(acceleration);
  if (!(magnitude > 1e-9)) return { forward, rate: 0 };
  const rate = Math.min(
    MAX_TURN_RATE,
    MAX_LATERAL_ACCELERATION / Math.max(speed, 1),
    magnitude / Math.max(speed, 1)
  );
  const angle = rate * dt;
  const lateral = normal(acceleration);
  return {
    forward: normal(add(mul(forward, Math.cos(angle)), mul(lateral, Math.sin(angle))), forward),
    rate
  };
}

function steerTowardDirection(forward, desiredDirection, speed, dt) {
  const desired = normal(desiredDirection, forward);
  const error = angleBetween(forward, desired);
  if (!(error > 1e-9)) return { forward, rate: 0 };
  const rate = Math.min(
    MAX_TURN_RATE,
    MAX_LATERAL_ACCELERATION / Math.max(speed, 1),
    error / dt
  );
  const lateral = normal(sub(desired, mul(forward, dot(forward, desired))));
  const angle = rate * dt;
  return {
    forward: normal(add(mul(forward, Math.cos(angle)), mul(lateral, Math.sin(angle))), forward),
    rate
  };
}

function targetVelocityFor(motion) {
  if (motion === "inbound") return v(-260, 0, 0);
  if (motion === "crossing") return v(0, 0, 260);
  return v(260, 0, 0);
}

function runAirScenario({
  mode,
  fps,
  range,
  altitude,
  motion,
  ejectTime = 0.18,
  captureAngleDeg = 25,
  minimumClosingSpeed = 30,
  blendTime = 0.2,
  directLaunch = false,
  aircraftLaunch = false
}) {
  const dt = 1 / fps;
  let missilePosition = v(0, aircraftLaunch ? altitude : 13, 0);
  let targetPosition = v(range, altitude, 0);
  const targetVelocity = targetVelocityFor(motion);
  let missileForward = (directLaunch || aircraftLaunch)
    ? normal(sub(targetPosition, missilePosition))
    : v(0, 1, 0);
  let missileSpeed = aircraftLaunch ? 260 : 100 / 3.6;
  let achievedAcceleration = v();
  let phase = mode === "vls-phased" ? "eject" : "homing";
  let blendAge = 0;
  let terminalCommitPoint = null;
  let captureStartedAt = null;
  let homingStartedAt = mode === "vls-phased" ? null : 0;
  let minimumDistance = Infinity;
  let maximumAltitude = missilePosition.y;
  let minimumAltitude = missilePosition.y;
  let maximumG = 0;
  let maximumTurnRate = 0;
  let seaImpact = false;
  let hit = false;
  const samples = [];

  for (let frame = 0; frame < Math.ceil(STANDARD_LIFE * fps); frame += 1) {
    const time = frame * dt;
    const targetNext = add(targetPosition, mul(targetVelocity, dt));
    const actualRelative = sub(targetPosition, missilePosition);
    const actualDistance = length(actualRelative);
    minimumDistance = Math.min(minimumDistance, actualDistance);

    let guidancePoint = clone(targetPosition);
    if (actualDistance > SEA_TERMINAL_RANGE && guidancePoint.y < SEA_CLEARANCE) {
      guidancePoint.y = SEA_CLEARANCE;
    }
    let relativePosition = sub(guidancePoint, missilePosition);
    const missileVelocity = mul(missileForward, missileSpeed);
    let relativeVelocity = sub(targetVelocity, missileVelocity);
    const closingSpeed = Math.max(
      0,
      -dot(relativePosition, relativeVelocity) / Math.max(length(relativePosition), 1e-9)
    );
    const leadTime = clamp(
      solveInterceptTime(relativePosition, targetVelocity, missileSpeed),
      0,
      6
    );
    const leadDirection = normal(add(relativePosition, mul(targetVelocity, leadTime)), relativePosition);
    // Capture is an attitude-establishment phase, not another predictive
    // guidance law. Point into the target-bearing hemisphere first; PN owns the
    // lead once a useful closing geometry exists.
    const captureDirection = normal(relativePosition);
    let command = v();
    let directSafetyDirection = null;

    // Match the runtime Aegis/frigate corridor: a low target is approached at
    // 55m until terminal range, and a descending round starts recovering early
    // enough to arrest its existing flight-path angle. The eject hold itself is
    // never interrupted because it cannot be descending yet.
    if (phase !== "eject") {
      if (targetPosition.y < SEA_CLEARANCE) {
        if (mode === "vls-phased") {
          // The candidate treats corridor exit as a phase transition too. The
          // aim height blends from 55m to the real low-flying target between
          // 420m and 180m instead of dropping the safety channel in one frame.
          const corridorWeight = smoothstep(
            SEA_TERMINAL_RANGE,
            420,
            actualDistance
          );
          directSafetyDirection = normal(sub(
            v(
              targetPosition.x,
              lerp(targetPosition.y, SEA_CLEARANCE, corridorWeight),
              targetPosition.z
            ),
            missilePosition
          ));
        } else if (actualDistance > SEA_TERMINAL_RANGE) {
          directSafetyDirection = normal(sub(
            v(targetPosition.x, SEA_CLEARANCE, targetPosition.z),
            missilePosition
          ));
        }
      }
      const downwardAngle = Math.asin(clamp(-missileForward.y, 0, 1));
      const recoveryDrop = missileSpeed * (1 - Math.cos(downwardAngle)) /
        Math.max(MAX_TURN_RATE, 0.001);
      if (missileForward.y < -0.01 && missilePosition.y < SEA_CLEARANCE + recoveryDrop) {
        directSafetyDirection = normal(v(
          missileForward.x,
          Math.max(0.35, missileForward.y),
          missileForward.z
        ));
      }
    }

    if (mode === "vls-phased") {
      if (phase === "eject" && time >= ejectTime) {
        phase = "capture";
        captureStartedAt = time;
      }
      if (phase === "capture") {
        command = captureCommand(missileForward, captureDirection, missileSpeed);
        if (angleBetween(missileForward, captureDirection) <= captureAngleDeg * DEG &&
            closingSpeed >= minimumClosingSpeed) {
          phase = "blend";
          blendAge = 0;
        }
      } else if (phase === "blend") {
        const capture = captureCommand(missileForward, captureDirection, missileSpeed);
        const pn = pnCommand(relativePosition, relativeVelocity, missileForward);
        const captureWeight = 1 - clamp(blendAge / Math.max(blendTime, 1e-9), 0, 1);
        command = lerpVector(pn, capture, captureWeight);
        blendAge += dt;
        if (blendAge >= blendTime) {
          phase = "homing";
          homingStartedAt = time;
        }
      } else if (phase === "homing") {
        if (!terminalCommitPoint && leadTime <= 0.44) {
          terminalCommitPoint = add(targetPosition, mul(targetVelocity, leadTime));
        }
        if (terminalCommitPoint) {
          relativePosition = sub(terminalCommitPoint, missilePosition);
          relativeVelocity = mul(missileVelocity, -1);
        }
        command = pnCommand(relativePosition, relativeVelocity, missileForward);
      }
    } else {
      if (!terminalCommitPoint && leadTime <= 0.44) {
        terminalCommitPoint = add(targetPosition, mul(targetVelocity, leadTime));
      }
      if (terminalCommitPoint) {
        relativePosition = sub(terminalCommitPoint, missilePosition);
        relativeVelocity = mul(missileVelocity, -1);
      }
      const authority = smoothstep(GUIDANCE_RAMP_START, GUIDANCE_RAMP_END, time);
      command = pnCommand(relativePosition, relativeVelocity, missileForward, authority);
    }

    const steered = directSafetyDirection
      ? steerTowardDirection(missileForward, directSafetyDirection, missileSpeed, dt)
      : (() => {
          achievedAcceleration = updateAutopilot(
            achievedAcceleration,
            command,
            missileForward,
            dt
          );
          return steerFromAcceleration(
            missileForward,
            achievedAcceleration,
            missileSpeed,
            dt
          );
        })();
    missileForward = steered.forward;
    maximumTurnRate = Math.max(maximumTurnRate, steered.rate);
    maximumG = Math.max(
      maximumG,
      directSafetyDirection
        ? steered.rate * missileSpeed / GRAVITY
        : length(achievedAcceleration) / GRAVITY
    );
    missileSpeed = Math.min(STANDARD_MAX_SPEED, missileSpeed + ACCELERATION * dt);
    const missileNext = add(missilePosition, mul(missileForward, missileSpeed * dt));
    const missDistance = movingSegmentMissDistance(
      missilePosition,
      missileNext,
      targetPosition,
      targetNext
    );
    minimumDistance = Math.min(minimumDistance, missDistance);
    samples.push({
      time,
      missile: clone(missilePosition),
      target: clone(targetPosition),
      phase,
      speed: missileSpeed,
      closingSpeed,
      angleErrorDeg: angleBetween(missileForward, captureDirection) / DEG,
      achievedG: directSafetyDirection
        ? steered.rate * missileSpeed / GRAVITY
        : length(achievedAcceleration) / GRAVITY,
      clearanceActive: Boolean(directSafetyDirection),
      terminalCommitted: Boolean(terminalCommitPoint)
    });
    missilePosition = missileNext;
    targetPosition = targetNext;
    maximumAltitude = Math.max(maximumAltitude, missilePosition.y);
    minimumAltitude = Math.min(minimumAltitude, missilePosition.y);
    if (missDistance < AIR_FUSE) {
      hit = true;
      break;
    }
    if (missilePosition.y <= 0) {
      seaImpact = true;
      break;
    }
  }

  return {
    mode,
    fps,
    range,
    altitude,
    motion,
    hit,
    seaImpact,
    expired: !hit && !seaImpact,
    minimumDistance,
    maximumAltitude,
    minimumAltitude,
    maximumG,
    maximumTurnRateDeg: maximumTurnRate / DEG,
    captureStartedAt,
    homingStartedAt,
    finalPhase: phase,
    samples
  };
}

function terrainFor(kind, range) {
  if (kind === "island") {
    const centre = range * 0.52;
    const halfWidth = Math.min(420, range * 0.16);
    return (x) => Math.max(0, 220 * (1 - Math.abs(x - centre) / halfWidth));
  }
  if (kind === "ridge") {
    const centre = range * 0.56;
    const halfWidth = Math.min(340, range * 0.18);
    return (x) => Math.max(0, 260 * (1 - Math.abs(x - centre) / halfWidth));
  }
  return () => 0;
}

function sightLineClear2D(position, target, terrain) {
  const footing = target.y + 2;
  for (let sample = 1; sample < TERRAIN_SAMPLES; sample += 1) {
    const amount = sample / TERRAIN_SAMPLES;
    const x = lerp(position.x, target.x, amount);
    const height = terrain(x);
    if (height <= footing) continue;
    const lineY = lerp(position.y, target.y, amount);
    if (height > lineY - 10) return false;
  }
  return true;
}

function requiredClimbSlope2D(position, target, terrain, clearance) {
  const groundRange = Math.abs(target.x - position.x);
  let slope = -Infinity;
  for (let sample = 1; sample <= TERRAIN_SAMPLES; sample += 1) {
    const amount = sample / TERRAIN_SAMPLES;
    const distance = groundRange * amount;
    const x = lerp(position.x, target.x, amount);
    const required = (terrain(x) + clearance - position.y) / Math.max(distance, 1);
    slope = Math.max(slope, required);
  }
  return slope;
}

function skimSlope2D(position, target, terrain) {
  const groundRange = Math.abs(target.x - position.x);
  let slope = -Infinity;
  let nearGround = 0;
  for (let sample = 1; sample <= TERRAIN_SAMPLES; sample += 1) {
    const amount = sample / TERRAIN_SAMPLES;
    const distance = groundRange * amount;
    if (sample > 1 && distance > SKIM_DESCENT_HORIZON) break;
    const x = lerp(position.x, target.x, amount);
    const height = terrain(x);
    if (sample === 1) nearGround = height;
    const required = (height + SKIM_ALTITUDE - position.y) / Math.max(distance, 1);
    slope = Math.max(slope, required);
  }
  const descent = (nearGround + SKIM_ALTITUDE - position.y) / SKIM_DESCENT_HORIZON;
  return Math.max(slope, descent);
}

function rotateToward2D(forward, desired, maximumAngle) {
  const from = Math.atan2(forward.y, forward.x);
  const to = Math.atan2(desired.y, desired.x);
  const error = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  const next = from + clamp(error, -maximumAngle, maximumAngle);
  return v(Math.cos(next), Math.sin(next), 0);
}

function runSurfaceScenario({
  profile,
  fps,
  range,
  altitude,
  terrainKind,
  separationTime
}) {
  const dt = 1 / fps;
  const terrain = terrainFor(terrainKind, range);
  const target = v(range, profile === "lasm" ? 8 : terrain(range), 0);
  let missilePosition = v(0, altitude, 0);
  let missileForward = v(1, 0, 0);
  let missileSpeed = 260;
  const maximumSpeed = profile === "lasm" ? 833 : STANDARD_MAX_SPEED;
  const life = profile === "lasm" ? 14 : 11;
  const fuse = profile === "lasm" ? 52 : 20;
  let diving = false;
  let loftCeiling;
  let minimumDistance = Infinity;
  let minimumClearance = Infinity;
  let maximumAltitude = altitude;
  let maximumTurnRate = 0;
  let hit = false;
  let terrainImpact = false;
  let terminalStartedAt = null;
  const samples = [];

  for (let frame = 0; frame < Math.ceil(life * fps); frame += 1) {
    const time = frame * dt;
    const relative = sub(target, missilePosition);
    const distance = length(relative);
    const groundRange = Math.abs(relative.x);
    minimumDistance = Math.min(minimumDistance, distance);
    let phase = time < separationTime ? "separation" : "cruise";
    let desired = missileForward;

    if (time >= separationTime) {
      if (profile === "lasm") {
        const drop = missilePosition.y - target.y;
        if (!diving &&
            (drop <= POPUP_MIN_DROP ||
             groundRange <= Math.max(SKIM_TERMINAL_RANGE, drop * SKIM_DIVE_RATIO)) &&
            sightLineClear2D(missilePosition, target, terrain)) {
          diving = true;
          terminalStartedAt = time;
        }
        if (diving) {
          phase = "terminal";
          desired = normal(relative);
        } else {
          phase = "sea-skim";
          const slope = clamp(skimSlope2D(missilePosition, target, terrain), SKIM_DESCENT_SLOPE, 0.6);
          desired = normal(v(Math.sign(relative.x), slope, 0));
        }
      } else {
        if (loftCeiling === undefined) {
          loftCeiling = Math.max(
            missilePosition.y + LOFT_ABOVE_LAUNCH,
            target.y + LOFT_ABOVE_TARGET
          );
        }
        const drop = missilePosition.y - target.y;
        const entry = 0.5 * missileSpeed / MAX_TURN_RATE;
        if (!diving &&
            groundRange <= Math.max(LOFT_TERMINAL_RANGE, drop * GROUND_DIVE_RATIO) + entry &&
            sightLineClear2D(missilePosition, target, terrain)) {
          diving = true;
          terminalStartedAt = time;
        }
        if (diving) {
          phase = "terminal";
          desired = normal(relative);
        } else {
          phase = "loft";
          const slope = Math.max(
            (loftCeiling - missilePosition.y) / Math.max(groundRange, 1),
            requiredClimbSlope2D(missilePosition, target, terrain, TERRAIN_CLEARANCE)
          );
          desired = normal(v(Math.sign(relative.x), clamp(slope, -0.6, 0.6), 0));
        }
      }
      const before = missileForward;
      missileForward = rotateToward2D(missileForward, desired, MAX_TURN_RATE * dt);
      maximumTurnRate = Math.max(maximumTurnRate, angleBetween(before, missileForward) / dt);
    }

    missileSpeed = Math.min(maximumSpeed, missileSpeed + ACCELERATION * dt);
    const missileNext = add(missilePosition, mul(missileForward, missileSpeed * dt));
    const missDistance = movingSegmentMissDistance(
      missilePosition,
      missileNext,
      target,
      target
    );
    minimumDistance = Math.min(minimumDistance, missDistance);
    const terrainHeight = terrain(missileNext.x);
    minimumClearance = Math.min(minimumClearance, missileNext.y - terrainHeight);
    samples.push({
      time,
      missile: clone(missilePosition),
      target: clone(target),
      phase,
      speed: missileSpeed,
      terrain: terrain(missilePosition.x)
    });
    missilePosition = missileNext;
    maximumAltitude = Math.max(maximumAltitude, missilePosition.y);
    if (missDistance < fuse) {
      hit = true;
      break;
    }
    if (missilePosition.y <= terrainHeight) {
      terrainImpact = true;
      break;
    }
  }

  return {
    profile,
    fps,
    range,
    altitude,
    terrainKind,
    separationTime,
    hit,
    terrainImpact,
    expired: !hit && !terrainImpact,
    minimumDistance,
    minimumClearance,
    maximumAltitude,
    maximumTurnRateDeg: maximumTurnRate / DEG,
    terminalStartedAt,
    samples
  };
}

function summarise(results) {
  const count = results.length;
  const average = (read) => results.reduce((sum, result) => sum + read(result), 0) / Math.max(count, 1);
  return {
    cases: count,
    hits: results.filter((result) => result.hit).length,
    hitRate: results.filter((result) => result.hit).length / Math.max(count, 1),
    seaImpacts: results.filter((result) => result.seaImpact).length,
    terrainImpacts: results.filter((result) => result.terrainImpact).length,
    expired: results.filter((result) => result.expired).length,
    averageMinimumDistance: average((result) => result.minimumDistance),
    averageMaximumAltitude: average((result) => result.maximumAltitude),
    maximumObservedAltitude: Math.max(...results.map((result) => result.maximumAltitude)),
    maximumObservedG: Math.max(...results.map((result) => result.maximumG || 0)),
    maximumObservedTurnRateDeg: Math.max(...results.map((result) => result.maximumTurnRateDeg || 0)),
    averageHomingStart: average((result) => result.homingStartedAt || 0),
    minimumObservedClearance: Math.min(...results.map((result) => result.minimumClearance ?? Infinity))
  };
}

const AIR_FPS = [30, 60, 120];
const AIR_RANGES = [500, 1000, 1700];
const AIR_ALTITUDES = [40, 100, 300, 600];
const AIR_MOTIONS = ["inbound", "crossing", "outbound"];

function airGrid(mode, config = {}, directLaunch = false, aircraftLaunch = false) {
  const results = [];
  for (const fps of AIR_FPS) {
    for (const range of AIR_RANGES) {
      for (const altitude of AIR_ALTITUDES) {
        for (const motion of AIR_MOTIONS) {
          results.push(runAirScenario({
            mode,
            fps,
            range,
            altitude,
            motion,
            directLaunch,
            aircraftLaunch,
            ...config
          }));
        }
      }
    }
  }
  return results;
}

function selectVlsCandidate() {
  const candidates = [];
  for (const ejectTime of [0.12, 0.18, 0.24]) {
    for (const captureAngleDeg of [10, 15, 20, 25]) {
      for (const minimumClosingSpeed of [20, 40]) {
        for (const blendTime of [0.5, 0.75, 1, 1.5, 2]) {
          const config = { ejectTime, captureAngleDeg, minimumClosingSpeed, blendTime };
          const results = airGrid("vls-phased", config);
          const summary = summarise(results);
          const altitudePenalty = Math.max(0, summary.averageMaximumAltitude - 800) / 100;
          const score = summary.hits * 1000 -
            summary.seaImpacts * 2000 -
            summary.expired * 1000 -
            summary.averageMinimumDistance -
            altitudePenalty -
            Math.abs(ejectTime - 0.18) * 5;
          candidates.push({ config, summary, score });
        }
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

const surfaceScenarios = {
  lasm: {
    ranges: [1000, 2000, 3500, 4000],
    altitudes: [120, 300, 700],
    terrains: ["sea", "island"]
  },
  agm4: {
    ranges: [800, 1400, 2000],
    altitudes: [120, 300, 700],
    terrains: ["flat", "ridge"]
  }
};

function surfaceGrid(profile, separationTime) {
  const results = [];
  const scenarios = surfaceScenarios[profile];
  for (const fps of AIR_FPS) {
    for (const range of scenarios.ranges) {
      for (const altitude of scenarios.altitudes) {
        for (const terrainKind of scenarios.terrains) {
          results.push(runSurfaceScenario({
            profile,
            fps,
            range,
            altitude,
            terrainKind,
            separationTime
          }));
        }
      }
    }
  }
  return results;
}

function selectSurfaceSeparation(profile) {
  const candidates = [0, 0.08, 0.12, 0.16, 0.2, 0.25].map((separationTime) => {
    const results = surfaceGrid(profile, separationTime);
    const summary = summarise(results);
    const score = summary.hits * 1000 -
      summary.terrainImpacts * 2000 -
      summary.expired * 1000 -
      Math.abs(separationTime - 0.12) * 10;
    return { separationTime, summary, score };
  });
  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

function compact(result) {
  return Object.fromEntries(Object.entries(result).filter(([key]) => key !== "samples"));
}

function trajectoryPanel({ title, results, x, y, width, height, terrain = null }) {
  const points = results.flatMap((result) => result.samples.map((sample) => ({
    x: Math.hypot(sample.missile.x, sample.missile.z),
    y: sample.missile.y
  })));
  const maxX = Math.max(1, ...points.map((point) => point.x));
  const maxY = Math.max(100, ...points.map((point) => point.y));
  const minY = Math.min(0, ...points.map((point) => point.y));
  const margin = 32;
  const px = (value) => x + margin + (value / maxX) * (width - margin * 2);
  const py = (value) => y + height - margin - ((value - minY) / Math.max(maxY - minY, 1)) * (height - margin * 2);
  const colors = ["#ff5a5f", "#38d996", "#50a7ff"];
  const paths = results.map((result, index) => {
    const pathPoints = result.samples.map((sample) =>
      `${px(Math.hypot(sample.missile.x, sample.missile.z)).toFixed(1)},${py(sample.missile.y).toFixed(1)}`
    ).join(" ");
    return `<polyline fill="none" stroke="${colors[index]}" stroke-width="3" points="${pathPoints}"/>`;
  }).join("\n");
  let terrainPath = "";
  if (terrain) {
    const terrainPoints = [];
    for (let sample = 0; sample <= 80; sample += 1) {
      const distance = maxX * sample / 80;
      terrainPoints.push(`${px(distance).toFixed(1)},${py(terrain(distance)).toFixed(1)}`);
    }
    terrainPath = `<polyline fill="none" stroke="#8a7658" stroke-width="4" points="${terrainPoints.join(" ")}"/>`;
  } else {
    terrainPath = `<line x1="${px(0)}" y1="${py(0)}" x2="${px(maxX)}" y2="${py(0)}" stroke="#37677a" stroke-width="2"/>`;
  }
  const legend = results.map((result, index) =>
    `<text x="${x + 42}" y="${y + 48 + index * 18}" fill="${colors[index]}" font-size="13">${result.mode || `${result.profile} separation=${result.separationTime.toFixed(2)}s`}</text>`
  ).join("\n");
  return `<g>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#101820" stroke="#46606f"/>
    <text x="${x + 16}" y="${y + 23}" fill="#f2f5f7" font-size="16" font-weight="bold">${title}</text>
    ${terrainPath}
    ${paths}
    ${legend}
  </g>`;
}

function renderSvg(vlsConfig, lasmSeparation, agm4Separation) {
  const vlsBaseline = runAirScenario({
    mode: "vls-pn", fps: 120, range: 1000, altitude: 300, motion: "crossing"
  });
  const vlsCandidate = runAirScenario({
    mode: "vls-phased", fps: 120, range: 1000, altitude: 300, motion: "crossing", ...vlsConfig
  });
  const lasmBaseline = runSurfaceScenario({
    profile: "lasm", fps: 120, range: 3500, altitude: 300, terrainKind: "sea", separationTime: 0
  });
  const lasmCandidate = runSurfaceScenario({
    profile: "lasm", fps: 120, range: 3500, altitude: 300, terrainKind: "sea", separationTime: lasmSeparation
  });
  const agmBaseline = runSurfaceScenario({
    profile: "agm4", fps: 120, range: 1400, altitude: 300, terrainKind: "ridge", separationTime: 0
  });
  const agmCandidate = runSurfaceScenario({
    profile: "agm4", fps: 120, range: 1400, altitude: 300, terrainKind: "ridge", separationTime: agm4Separation
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="930" viewBox="0 0 1400 930">
  <rect width="100%" height="100%" fill="#091117"/>
  <text x="30" y="35" fill="#f2f5f7" font-size="22" font-weight="bold">Sortie missile launch-phase simulation</text>
  ${trajectoryPanel({ title: "VLS: pure PN vs eject/capture/PN", results: [vlsBaseline, vlsCandidate], x: 30, y: 60, width: 1340, height: 260 })}
  ${trajectoryPanel({ title: "LASM: immediate sea-skim vs separation phase", results: [lasmBaseline, lasmCandidate], x: 30, y: 335, width: 1340, height: 260, terrain: terrainFor("sea", 3500) })}
  ${trajectoryPanel({ title: "4AGM: immediate loft vs separation phase", results: [agmBaseline, agmCandidate], x: 30, y: 610, width: 1340, height: 260, terrain: terrainFor("ridge", 1400) })}
  <text x="30" y="905" fill="#9fb3c2" font-size="13">Red = current/no phase, green = selected phased candidate. Axes: ground distance and altitude.</text>
</svg>`;
}

const vlsBaselineResults = airGrid("vls-pn");
const directStaticResults = airGrid("vls-pn", {}, true);
const ordinaryAirResults = airGrid("vls-pn", {}, false, true);
const vlsCandidates = selectVlsCandidate();
const selectedVls = vlsCandidates[0];
const selectedVlsResults = airGrid("vls-phased", selectedVls.config);
const lasmCandidates = selectSurfaceSeparation("lasm");
const agm4Candidates = selectSurfaceSeparation("agm4");
const selectedLasm = lasmCandidates[0];
const selectedAgm4 = agm4Candidates[0];
const baselineLasmResults = surfaceGrid("lasm", 0);
const selectedLasmResults = surfaceGrid("lasm", selectedLasm.separationTime);
const baselineAgm4Results = surfaceGrid("agm4", 0);
const selectedAgm4Results = surfaceGrid("agm4", selectedAgm4.separationTime);

function outcomeDifferences(baseline, candidate) {
  const key = (result) => [
    result.fps,
    result.range,
    result.altitude,
    result.terrainKind
  ].join(":");
  const baselineByKey = new Map(baseline.map((result) => [key(result), result]));
  return candidate
    .filter((result) => {
      const before = baselineByKey.get(key(result));
      return !before || before.hit !== result.hit ||
        before.terrainImpact !== result.terrainImpact ||
        before.expired !== result.expired;
    })
    .map(compact);
}

function summariesByTerrain(results) {
  const kinds = [...new Set(results.map((result) => result.terrainKind))];
  return Object.fromEntries(kinds.map((kind) => [
    kind,
    summarise(results.filter((result) => result.terrainKind === kind))
  ]));
}

const report = {
  constants: {
    navigationRatio: NAVIGATION_RATIO,
    acceleration: ACCELERATION,
    standardMaxSpeed: STANDARD_MAX_SPEED,
    maximumTurnRateDeg: MAX_TURN_RATE / DEG,
    maximumLateralG: MAX_LATERAL_ACCELERATION / GRAVITY,
    autopilotTimeConstant: AUTOPILOT_TIME_CONSTANT
  },
  classification: {
    ordinaryAirToAir: "launch-authority ramp, then PN; no trajectory phase",
    qaam: "same launch as ordinary AAM; reattack is a seeker phase, not a launch phase",
    vlsShipSam: "vertical eject, bounded capture, blended PN",
    directGroundSamAndMissileBoat: "target-bearing ejection, then PN; no VLS capture",
    lasm: "safe separation, sea-skimming cruise, terminal latch",
    agm4: "safe separation, terrain-aware loft, terminal dive",
    bomb: "ballistic release; excluded from guided launch-phase state"
  },
  vls: {
    baseline: summarise(vlsBaselineResults),
    baselineFailures: vlsBaselineResults.filter((result) => !result.hit).map(compact),
    directStaticControl: summarise(directStaticResults),
    directStaticFailures: directStaticResults.filter((result) => !result.hit).map(compact),
    ordinaryAirLaunchControl: summarise(ordinaryAirResults),
    ordinaryAirLaunchFailures: ordinaryAirResults.filter((result) => !result.hit).map(compact),
    selected: selectedVls,
    selectedFailures: selectedVlsResults.filter((result) => !result.hit).map(compact),
    topFive: vlsCandidates.slice(0, 5),
    representativeBaseline: compact(runAirScenario({
      mode: "vls-pn", fps: 120, range: 1000, altitude: 300, motion: "crossing"
    })),
    representativeSelected: compact(runAirScenario({
      mode: "vls-phased", fps: 120, range: 1000, altitude: 300, motion: "crossing", ...selectedVls.config
    }))
  },
  lasm: {
    baseline: summarise(baselineLasmResults),
    selected: selectedLasm,
    candidates: lasmCandidates,
    selectedByTerrain: summariesByTerrain(selectedLasmResults),
    selectedFailures: selectedLasmResults.filter((result) => !result.hit).map(compact),
    outcomeDifferencesFromBaseline: outcomeDifferences(baselineLasmResults, selectedLasmResults)
  },
  agm4: {
    baseline: summarise(baselineAgm4Results),
    selected: selectedAgm4,
    candidates: agm4Candidates,
    selectedByTerrain: summariesByTerrain(selectedAgm4Results),
    selectedFailures: selectedAgm4Results.filter((result) => !result.hit).map(compact),
    outcomeDifferencesFromBaseline: outcomeDifferences(baselineAgm4Results, selectedAgm4Results)
  }
};

console.log("VLS pure PN       ", JSON.stringify(report.vls.baseline));
console.log("Direct static PN  ", JSON.stringify(report.vls.directStaticControl));
console.log("Ordinary air PN   ", JSON.stringify(report.vls.ordinaryAirLaunchControl));
console.log("VLS selected      ", JSON.stringify(selectedVls));
console.log("LASM selected     ", JSON.stringify(selectedLasm));
console.log("4AGM selected     ", JSON.stringify(selectedAgm4));

const outArg = process.argv.indexOf("--out");
if (outArg >= 0) {
  const outputDirectory = path.resolve(process.argv[outArg + 1]);
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(outputDirectory, "launch-phase-report.json"),
    `${JSON.stringify(report, null, 2)}\n`
  );
  fs.writeFileSync(
    path.join(outputDirectory, "launch-phase-trajectories.svg"),
    renderSvg(
      selectedVls.config,
      selectedLasm.separationTime,
      selectedAgm4.separationTime
    )
  );
  console.log(`wrote ${outputDirectory}`);
}
