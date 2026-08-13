// Player-missile guidance kernel.
//
// The game loop still owns missile arrays, CIWS interception, damage, effects,
// scoring and removal. This module owns only seeker state, popup steering,
// terminal substeps, propulsion direction and the swept proximity-fuse test.
// It imports no mission/entity feature; all shared contracts arrive as values or
// callbacks from the composition root.

// Anti-ship rounds fly the profile real ones fly: drop to wave-top height
// straight off the rail, run in under the defences, and only rise to the deck
// at the very end. SKIM_ALTITUDE is the cruise height over whatever surface
// the samples report (so an island lifts the round over itself by the same
// margin); SKIM_DESCENT_SLOPE caps how hard the round noses down to get
// there - steeper than the 0.6 climb cap because going downhill is free.
export const SKIM_ALTITUDE = 50;
export const SKIM_DESCENT_SLOPE = -1.2;
// How far ahead the descent aims to be at wave height. Short enough that the
// round gets down right after launch instead of gliding at the target on a
// straight line - which is what "descend toward where you arrive" computed.
export const SKIM_DESCENT_HORIZON = 350;
// Terminal latch: inside this range (or once the round is already at wave
// height), aim straight at the hull. drop x 1.5 keeps a round that is still
// high - fired close, or forced up over an island - entering its final
// pursuit early enough that the dive never steepens past what a 55 deg/s
// seeker can fly.
export const SKIM_TERMINAL_RANGE = 500;
export const SKIM_DIVE_RATIO = 1.5;
export const POPUP_MIN_DROP = 60;

// Anti-ship and anti-ground shared one profile and it suited neither. A ship
// sits on flat sea with 84m of hull to aim at; a bunker is 34m across on ground
// that is not flat, and its fuse is a third of its radius - 6 to 12 metres. The
// sea-skimming push-over fires on height difference, so against something that
// low it triggers with most of the ground still to cross, and the round flies a
// long shallow approach into a small target and lands short.
//
// Ships keep exactly what they had. Ground rounds climb, cross above the
// terrain and drop steeply, which is both what real anti-armour rounds do and
// what arrives inside a fuse that small.
export const LOFT_ABOVE_LAUNCH = 120;
export const LOFT_ABOVE_TARGET = 180;
export const LOFT_TERMINAL_RANGE = 420;
// A fixed 420m dive point assumed the round was only LOFT_ABOVE_TARGET up.
// The LASM locks ground targets too, cruises wherever its launch altitude
// put it, and from 700m up a 420m dive point demands a 60-79 degree dive
// that a 55 deg/s seeker cannot fly: it fell past the target - measured 50
// of 144 ground shots lost exactly that way. The dive point now also scales
// with height, so the entry angle never has to beat ~27 degrees.
export const GROUND_DIVE_RATIO = 2.0;
// The ground fuse is generous where the sea-skimmer's is not: a round that
// arrives from directly overhead is either on the target or nowhere near it,
// so there is no shallow near-miss to be strict about. 0.9 left an aaGun
// (radius 20) with an 18m fuse and a measured pursuit-lag miss of 18.5m -
// the full radius closes exactly that knife edge.
export const GROUND_FUSE_SCALE = 1.0;
// Ships were fused at 0.35 of their radius, which on a 62m frigate is 21.7m and
// on a 26m missile boat is 9.1m: a round had to arrive within a third of the
// hull's own extent or pass straight through it. An aircraft, by contrast, is
// 10.5m across and fused at 16 - larger than the thing it is chasing. Surface
// rounds fly at something that cannot dodge, so the fuse should cover the hull
// rather than a core of it.
export const SHIP_FUSE_SCALE = 0.85;

// The terrain kill test in the game loop cut both ways: it stopped rounds
// flying through hills into the ground below the target, and it started
// killing every round whose cruise altitude was below a ridge on the way in.
// A loft ceiling of launch+120 does not clear a 260m hill when the player
// fires from 200m, and the round died on the hillside 600m short - measured
// 24 of 72 low-altitude shots in the ridge scenario. So guidance now samples
// the terrain between the round and its target and cruises above the highest
// point it finds, with this much air under the keel.
export const TERRAIN_CLEARANCE = 90;
export const TERRAIN_SAMPLES = 6;

// Guidance state is kept separate from steering geometry so the pass count and
// overshoot contract can be exercised without constructing a Three.js scene.
// Physical turn authority is NOT seeker authority: reaching the configured turn
// cap merely means the airframe cannot bend any harder. It keeps tracking until
// it has actually flown past the target and the range is opening.
export const SEEKER_STATE = Object.freeze({
  TRACKING: 0,
  REACQUIRING: 1,
  REACQUIRED: 2,
  RETRY_STARTED: 3,
  LOST_NOW: 4,
  LOST: 5
});

// A confirmed miss is deliberately geometric and hysteretic. The target must
// be behind the missile, the missile must previously have been closing, and it
// must have opened at least 20 m from closest approach for 0.1 s. This avoids
// spending a QAAM pass on a one-frame distance wobble or a hard crossing that
// the missile has not physically flown through yet.
export const OVERSHOOT_CONFIRM_TIME = 0.1;
export const OVERSHOOT_MIN_SEPARATION = 20;
export const OVERSHOOT_MIN_OPENING_SPEED = 20;
export const OVERSHOOT_REAR_DOT = -0.1;

// Air-to-air guidance does not chase the target's current position. It solves
// the constant-velocity intercept course again every guided slice, then spends
// only the physical turn budget needed to settle onto that course. Six seconds
// is deliberately longer than any normal terminal engagement but finite: a
// receding target just inside the speed envelope must not make the aim point
// jump kilometres beyond the playable fight.
export const MAX_INTERCEPT_LEAD_TIME = 6;

// Longitudinal motor acceleration is a real rate, not a smoothing half-life.
// 180 m/s^2 (about 18 g) takes a round released at 260 m/s roughly 1.65 s to
// reach the ordinary 556 m/s ceiling. The speed only rises: aircraft-style
// throttle drag and turn-energy loss are intentionally outside this arcade
// flight model.
export const DEFAULT_MISSILE_ACCELERATION = 180;

// Air-to-air homing is acceleration-commanded proportional navigation, not
// "point the body at a freshly solved intercept point".  N=3 is the classical
// baseline: it drives LOS rotation toward zero without asking the round to cut
// sideways onto the shortest geometric line every frame.
export const AIR_MISSILE_NAVIGATION_RATIO = 3;
export const AIR_MISSILE_MAX_LATERAL_G = 50;
export const STANDARD_GRAVITY = 9.81;
export const AIR_MISSILE_MAX_LATERAL_ACCELERATION =
  AIR_MISSILE_MAX_LATERAL_G * STANDARD_GRAVITY;

// A guidance law only commands acceleration; fins, autopilot and airframe take
// finite time to achieve it.  The 0.18s first-order response is deliberately
// kept separate from the 0.04-0.24s launch-authority ramp.  Together they keep
// the inherited launch tangent continuous before the round bends smoothly onto
// a collision course.
export const AIR_MISSILE_AUTOPILOT_TIME_CONSTANT = 0.18;
export const AIR_MISSILE_GUIDANCE_RAMP_START = 0.04;
export const AIR_MISSILE_GUIDANCE_RAMP_END = 0.24;
// Once only 0.44s of predicted flight remains, freeze the collision point for
// this pursuit pass.  A steady turn remains on the collision geometry, while a
// correctly timed brake/re-acceleration can move the aircraft off it.  PN is
// still used to fly to that point, so there is no attitude hard switch.
export const AIR_MISSILE_TERMINAL_COMMIT_TIME = 0.44;

// A missile which leaves a vertical cell does not yet have useful closing
// geometry for proportional navigation. Keep the cold-launch tangent long
// enough to clear the deck, establish a target-bearing attitude with the same
// 50G / 75deg/s authority as every other round, then blend into PN. These are
// launch-platform states, deliberately separate from seeker pass/reacquisition
// state: a flare or QAAM retry must never put a live round back in its cell.
export const VLS_EJECT_TIME = 0.18;
export const VLS_CAPTURE_ANGLE_DEG = 25;
export const VLS_CAPTURE_MIN_CLOSING_SPEED = 40;
export const VLS_CAPTURE_RESPONSE_TIME = 0.35;
export const VLS_TO_PN_BLEND_TIME = 0.5;

// LASM and 4AGM inherit the launch aircraft's velocity and attitude for one
// short, deterministic rail-clearance leg before sea-skimming or loft guidance
// is allowed to move the nose. At 260m/s this is about 31m of separation.
export const SPECIAL_PROFILE_SAFE_SEPARATION_TIME = 0.12;

export function accelerateMissileSpeed(
  currentSpeed,
  maximumSpeed,
  acceleration = DEFAULT_MISSILE_ACCELERATION,
  elapsed = 0
) {
  const current = Math.max(0, Number(currentSpeed) || 0);
  const maximum = Number(maximumSpeed);
  if (!Number.isFinite(maximum) || maximum < 0) return current;
  if (current >= maximum) return maximum;

  const rate = Math.max(0, Number(acceleration) || 0);
  const seconds = Math.max(0, Number(elapsed) || 0);
  return Math.min(maximum, current + rate * seconds);
}

export function solveInterceptTime(relativePosition, targetVelocity, projectileSpeed) {
  const speed = Math.max(0, Number(projectileSpeed) || 0);
  const c = relativePosition.lengthSq();
  if (c <= 1e-9 || speed <= 1e-6) return 0;

  const a = targetVelocity.lengthSq() - speed * speed;
  const b = 2 * relativePosition.dot(targetVelocity);
  if (Math.abs(a) <= 1e-9) {
    const linear = Math.abs(b) > 1e-9 ? -c / b : NaN;
    return Number.isFinite(linear) && linear > 0 ? linear : Math.sqrt(c) / speed;
  }

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return Math.sqrt(c) / speed;
  const root = Math.sqrt(discriminant);
  const first = (-b - root) / (2 * a);
  const second = (-b + root) / (2 * a);
  let intercept = Infinity;
  if (first > 0) intercept = first;
  if (second > 0) intercept = Math.min(intercept, second);
  return Number.isFinite(intercept) ? intercept : Math.sqrt(c) / speed;
}

export function resetMissileAirGuidanceState(missile) {
  missile.guidanceAge = 0;
  missile.guidanceTargetRef = null;
  missile.commandedLateralG = 0;
  missile.achievedLateralG = 0;
  missile.lineOfSightRate = 0;
  missile.airGuidancePhase = "launch";
  missile.terminalCommitted = false;
  missile.terminalCommittedPass = 0;
  if (missile.achievedLateralAcceleration?.set) {
    missile.achievedLateralAcceleration.set(0, 0, 0);
  }
}

export function resetMissileOvershootTracking(missile) {
  missile.closing = false;
  missile.wasClosing = false;
  missile.lastTargetDistance = Infinity;
  missile.minTargetDistance = Infinity;
  missile.openingSpeed = 0;
  missile.targetForwardDot = 1;
  missile.overshootTime = 0;
}

export function sampleMissileOvershoot(
  missile,
  dt,
  distance,
  targetForwardDot,
  skipSample = false
) {
  const elapsed = Math.max(0, Number(dt) || 0);
  const range = Math.max(0, Number(distance) || 0);
  const previous = Number(missile.lastTargetDistance);
  const previousValid = Number.isFinite(previous);

  missile.targetForwardDot = Number.isFinite(targetForwardDot) ? targetForwardDot : 1;
  missile.minTargetDistance = Math.min(
    Number.isFinite(missile.minTargetDistance) ? missile.minTargetDistance : Infinity,
    range
  );

  // The first terminal substep sees a full frame of target motion divided by
  // one eighth of a frame. Establish the new range baseline but do not turn
  // that artificial rate spike into either a closing or opening observation.
  if (skipSample || elapsed <= 0 || !previousValid) {
    missile.lastTargetDistance = range;
    missile.closing = false;
    missile.openingSpeed = 0;
    return false;
  }

  const rangeRate = (range - previous) / elapsed;
  missile.lastTargetDistance = range;
  missile.closing = range < previous;
  if (missile.closing) missile.wasClosing = true;
  missile.openingSpeed = Math.max(0, rangeRate);

  const openedPastClosest = range >= missile.minTargetDistance + OVERSHOOT_MIN_SEPARATION;
  const confirmedGeometry = Boolean(
    missile.wasClosing &&
    missile.targetForwardDot < OVERSHOOT_REAR_DOT &&
    missile.openingSpeed >= OVERSHOOT_MIN_OPENING_SPEED &&
    openedPastClosest
  );

  if (confirmedGeometry) missile.overshootTime += elapsed;
  else missile.overshootTime = 0;
  return missile.overshootTime >= OVERSHOOT_CONFIRM_TIME;
}

export function updateSeekerState(missile, dt, overshot) {
  if (missile.lost) return SEEKER_STATE.LOST;

  const elapsed = Math.max(0, Number(dt) || 0);
  const reacquireTimer = Math.max(0, Number(missile.reacquireTimer) || 0);
  if (reacquireTimer > 0) {
    missile.reacquireTimer = Math.max(0, reacquireTimer - elapsed);
    if (missile.reacquireTimer <= 0) {
      // Pass two starts with fresh closest-approach history. Without this reset,
      // the opening range from pass one immediately spends the second pass too.
      resetMissileOvershootTracking(missile);
      return SEEKER_STATE.REACQUIRED;
    }
    return SEEKER_STATE.REACQUIRING;
  }

  if (!overshot) return SEEKER_STATE.TRACKING;

  // Count total tracking passes, not "retries remaining". QAAM maxPasses=2
  // therefore means initial pursuit plus exactly one reacquisition; there is no
  // ambiguous off-by-one that can accidentally produce a third attack.
  const maxPasses = Math.max(1, Math.floor(Number(missile.maxPasses) || 1));
  const passesStarted = Math.max(1, Math.floor(Number(missile.passesStarted) || 1));
  if (passesStarted < maxPasses) {
    missile.passesStarted = passesStarted + 1;
    missile.reacquireTimer = Math.max(0, Number(missile.reacquireDelay) || 0);
    resetMissileAirGuidanceState(missile);
    resetMissileOvershootTracking(missile);
    return SEEKER_STATE.RETRY_STARTED;
  }

  missile.lost = true;
  return SEEKER_STATE.LOST_NOW;
}

export function createMissileGuidance({
  THREE,
  localForward,
  forwardOf,
  defaultTurnRate,
  maxTurnRate = Infinity,
  defaultMaxSpeed,
  defaultAcceleration = DEFAULT_MISSILE_ACCELERATION,
  defaultFuse,
  terminalRange,
  terminalSubsteps,
  targetVelocityOf = (_target, out) => out.set(0, 0, 0),
  surfaceHeightAt = () => -Infinity
}) {
  const toTarget = new THREE.Vector3();
  const horizontal = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const swept = new THREE.Vector3();
  const targetVelocity = new THREE.Vector3();
  const targetPosition = new THREE.Vector3();
  const targetStart = new THREE.Vector3();
  const relativeDelta = new THREE.Vector3();
  const relativeVelocity = new THREE.Vector3();
  const missileVelocity = new THREE.Vector3();
  const losRate = new THREE.Vector3();
  const commandedAcceleration = new THREE.Vector3();
  const pnAcceleration = new THREE.Vector3();
  const captureAcceleration = new THREE.Vector3();
  const captureDirection = new THREE.Vector3();
  const lateralDirection = new THREE.Vector3();
  const steeredDirection = new THREE.Vector3();
  const guidanceRelativePosition = new THREE.Vector3();
  const guidanceRelativeVelocity = new THREE.Vector3();
  const targetQuaternion = new THREE.Quaternion();
  const result = {
    direction,
    travel: 0,
    hit: false,
    guidanceEndedNow: false,
    reattackStartedNow: false,
    reacquiredNow: false
  };

  function stepsFor(missile, target) {
    if (target) {
      if (missile.mesh.position.distanceTo(target.group.position) < terminalRange) {
        return terminalSubsteps;
      }
    } else {
      missile.closing = false;
    }
    return 1;
  }

  function sweptMissDistance(from, dir, length, point) {
    swept.copy(point).sub(from);
    const along = THREE.MathUtils.clamp(swept.dot(dir), 0, length);
    return swept.addScaledVector(dir, -along).length();
  }

  // Continuous closest approach of two moving points over one simulation
  // slice. The old test swept the missile against the target's final point;
  // at high closing speed a target that crossed the missile's path during the
  // same frame could therefore be reported as a miss even when the two paths
  // intersected. `targetEnd` is the already-updated entity position and the
  // start is reconstructed from its kinematic velocity.
  function movingTargetMissDistance(from, dir, length, targetEnd, velocity, dt) {
    const elapsed = Math.max(0, Number(dt) || 0);
    targetStart.copy(targetEnd).addScaledVector(velocity, -elapsed);
    swept.copy(targetStart).sub(from);
    relativeDelta.copy(velocity).multiplyScalar(elapsed).addScaledVector(dir, -length);
    const relativeTravelSq = relativeDelta.lengthSq();
    const along = relativeTravelSq > 1e-9
      ? THREE.MathUtils.clamp(-swept.dot(relativeDelta) / relativeTravelSq, 0, 1)
      : 0;
    return swept.addScaledVector(relativeDelta, along).length();
  }

  // Recomputed lead-pursuit course. The target velocity is supplied by the
  // composition root, keeping this kernel independent of aircraft, ships and
  // mission entities. A target can manoeuvre freely: the tangent changes next
  // frame and a new intercept is solved, while rotateTowards() below remains
  // the single authority that enforces the physical turn-rate ceiling.
  function predictiveAimFor(missile, point, velocity, out) {
    out.copy(point).sub(missile.mesh.position);
    const interceptTime = THREE.MathUtils.clamp(
      solveInterceptTime(out, velocity, missile.speed),
      0,
      MAX_INTERCEPT_LEAD_TIME
    );
    out.addScaledVector(velocity, interceptTime);
    if (out.lengthSq() <= 1e-9) return out.copy(direction);
    return out.normalize();
  }

  function lineOfSightRateFor(relativePosition, velocity, out) {
    const rangeSq = relativePosition.lengthSq();
    if (!(rangeSq > 1e-9)) return out.set(0, 0, 0);
    return out.crossVectors(relativePosition, velocity).multiplyScalar(1 / rangeSq);
  }

  // True proportional navigation in vector form.  The guidance law produces a
  // lateral acceleration command; it never produces an attitude or aim point.
  // `omega_LOS x forward` selects the normal direction which reduces LOS
  // rotation, while closing speed supplies the physically useful gain.
  function proportionalNavigationAccelerationFor(
    relativePosition,
    velocity,
    missileForward,
    navigationRatio,
    out
  ) {
    const range = relativePosition.length();
    if (!(range > 1e-6)) return out.set(0, 0, 0);
    const closingSpeed = Math.max(0, -relativePosition.dot(velocity) / range);
    if (!(closingSpeed > 1e-6)) return out.set(0, 0, 0);
    lineOfSightRateFor(relativePosition, velocity, losRate);
    return out.crossVectors(losRate, missileForward).multiplyScalar(
      Math.max(0, Number(navigationRatio) || 0) * closingSpeed
    );
  }

  function guidanceAuthorityAt(age) {
    return THREE.MathUtils.smoothstep(
      Math.max(0, Number(age) || 0),
      AIR_MISSILE_GUIDANCE_RAMP_START,
      AIR_MISSILE_GUIDANCE_RAMP_END
    );
  }

  function effectiveAirTurnRateFor(missile) {
    const authored = Math.max(0, Number(missile.turnRate ?? defaultTurnRate) || 0);
    const absolute = Math.max(0, Number(maxTurnRate));
    const speed = Math.max(0, Number(missile.speed) || 0);
    const accelerationRate = speed > 1e-6
      ? AIR_MISSILE_MAX_LATERAL_ACCELERATION / speed
      : Infinity;
    return Math.min(authored, absolute, accelerationRate);
  }

  function updateAirMissileAutopilot(missile, command, missileForward, slice) {
    if (!missile.achievedLateralAcceleration?.isVector3) {
      missile.achievedLateralAcceleration = new THREE.Vector3();
    }
    const achieved = missile.achievedLateralAcceleration;
    const elapsed = Math.max(0, Number(slice) || 0);
    const response = AIR_MISSILE_AUTOPILOT_TIME_CONSTANT > 0
      ? 1 - Math.exp(-elapsed / AIR_MISSILE_AUTOPILOT_TIME_CONSTANT)
      : 1;
    achieved.lerp(command, response);
    // Numerical integration and a changing forward axis can leave a tiny axial
    // component.  A missile cannot use the PN channel as extra thrust, so strip
    // it every slice before enforcing the airframe acceleration limit.
    achieved.addScaledVector(missileForward, -achieved.dot(missileForward));
    if (achieved.lengthSq() > AIR_MISSILE_MAX_LATERAL_ACCELERATION ** 2) {
      achieved.setLength(AIR_MISSILE_MAX_LATERAL_ACCELERATION);
    }
    return achieved;
  }

  function isVlsLaunchPhaseActive(missile) {
    return missile?.launchProfile === "vls" && missile.launchPhase !== "homing";
  }

  function holdSafeSeparation(missile, slice) {
    if (missile?.launchProfile !== "safe-separation" ||
        missile.launchPhase !== "safe-separation") {
      return false;
    }
    const elapsed = Math.max(0, Number(slice) || 0);
    missile.launchPhaseAge = Math.max(0, Number(missile.launchPhaseAge) || 0) + elapsed;
    missile.airGuidancePhase = "safe-separation";
    if (missile.launchPhaseAge >= SPECIAL_PROFILE_SAFE_SEPARATION_TIME) {
      missile.launchPhase = "profile";
      missile.launchPhaseAge = 0;
    }
    // The complete current slice remains on the inherited launch tangent. This
    // can exceed 0.12s by at most one simulation slice and avoids splitting the
    // game loop's swept collision/terrain contract at a second time boundary.
    return true;
  }

  function vlsCaptureAccelerationFor(missile, relativePosition, missileForward, out) {
    if (relativePosition.lengthSq() <= 1e-9) return out.set(0, 0, 0);
    captureDirection.copy(relativePosition).normalize();
    const forwardDot = THREE.MathUtils.clamp(
      missileForward.dot(captureDirection),
      -1,
      1
    );
    out.copy(captureDirection).addScaledVector(missileForward, -forwardDot);
    if (out.lengthSq() <= 1e-9) return out.set(0, 0, 0);
    const headingError = Math.acos(forwardDot);
    const requestedRate = Math.min(
      effectiveAirTurnRateFor(missile),
      headingError / VLS_CAPTURE_RESPONSE_TIME
    );
    const requestedAcceleration = Math.min(
      AIR_MISSILE_MAX_LATERAL_ACCELERATION,
      requestedRate * Math.max(0, Number(missile.speed) || 0)
    );
    return out.setLength(requestedAcceleration);
  }

  function guideAirMissile(missile, targetRef, point, velocity, slice) {
    if (missile.guidanceTargetRef !== targetRef) {
      resetMissileAirGuidanceState(missile);
      missile.guidanceTargetRef = targetRef;
    }
    const elapsed = Math.max(0, Number(slice) || 0);
    const age = Math.max(0, Number(missile.guidanceAge) || 0);
    forwardOf(missile.mesh, direction);
    relativeDelta.copy(point).sub(missile.mesh.position);
    missileVelocity.copy(direction).multiplyScalar(Math.max(0, Number(missile.speed) || 0));
    relativeVelocity.copy(velocity).sub(missileVelocity);
    const interceptTime = THREE.MathUtils.clamp(
      solveInterceptTime(relativeDelta, velocity, missile.speed),
      0,
      MAX_INTERCEPT_LEAD_TIME
    );
    const vlsActive = isVlsLaunchPhaseActive(missile);
    if (!vlsActive &&
        !missile.terminalCommitted &&
        interceptTime <= AIR_MISSILE_TERMINAL_COMMIT_TIME) {
      if (!missile.terminalCommitPoint?.isVector3) {
        missile.terminalCommitPoint = new THREE.Vector3();
      }
      missile.terminalCommitPoint.copy(point).addScaledVector(velocity, interceptTime);
      missile.terminalCommitted = true;
      missile.terminalCommittedPass = Math.max(
        1,
        Math.floor(Number(missile.passesStarted) || 1)
      );
    }
    if (missile.terminalCommitted && missile.terminalCommitPoint?.isVector3) {
      guidanceRelativePosition.copy(missile.terminalCommitPoint).sub(missile.mesh.position);
      // The committed collision point is stationary in world space.  Once the
      // round flies past it, closing speed becomes negative and PN commands
      // zero acceleration instead of U-turning toward an obsolete point.
      guidanceRelativeVelocity.copy(missileVelocity).multiplyScalar(-1);
    } else {
      guidanceRelativePosition.copy(relativeDelta);
      guidanceRelativeVelocity.copy(relativeVelocity);
    }
    proportionalNavigationAccelerationFor(
      guidanceRelativePosition,
      guidanceRelativeVelocity,
      direction,
      missile.navigationRatio ?? AIR_MISSILE_NAVIGATION_RATIO,
      pnAcceleration
    );
    const authority = guidanceAuthorityAt(age);
    pnAcceleration.multiplyScalar(authority);
    commandedAcceleration.copy(pnAcceleration);

    if (vlsActive) {
      let launchPhase = missile.launchPhase || "vls-eject";
      let launchPhaseAge = Math.max(0, Number(missile.launchPhaseAge) || 0);
      const range = relativeDelta.length();
      const closingSpeed = range > 1e-6
        ? Math.max(0, -relativeDelta.dot(relativeVelocity) / range)
        : 0;
      const captureAngle = range > 1e-6
        ? Math.acos(THREE.MathUtils.clamp(
            direction.dot(captureDirection.copy(relativeDelta).normalize()),
            -1,
            1
          ))
        : 0;

      missile.launchCaptureAngleDeg = THREE.MathUtils.radToDeg(captureAngle);
      missile.launchClosingSpeed = closingSpeed;

      if (launchPhase === "vls-eject") {
        commandedAcceleration.set(0, 0, 0);
        launchPhaseAge += elapsed;
        if (launchPhaseAge >= VLS_EJECT_TIME) {
          launchPhase = "vls-capture";
          launchPhaseAge = 0;
          if (missile.achievedLateralAcceleration?.set) {
            missile.achievedLateralAcceleration.set(0, 0, 0);
          }
        }
      } else {
        vlsCaptureAccelerationFor(
          missile,
          relativeDelta,
          direction,
          captureAcceleration
        );
        if (launchPhase === "vls-capture") {
          commandedAcceleration.copy(captureAcceleration);
          launchPhaseAge += elapsed;
          if (captureAngle <= THREE.MathUtils.degToRad(VLS_CAPTURE_ANGLE_DEG) &&
              closingSpeed >= VLS_CAPTURE_MIN_CLOSING_SPEED) {
            launchPhase = "vls-blend";
            launchPhaseAge = 0;
          }
        } else if (launchPhase === "vls-blend") {
          const captureWeight = 1 - THREE.MathUtils.clamp(
            launchPhaseAge / VLS_TO_PN_BLEND_TIME,
            0,
            1
          );
          commandedAcceleration.copy(pnAcceleration).lerp(
            captureAcceleration,
            captureWeight
          );
          launchPhaseAge += elapsed;
          if (launchPhaseAge >= VLS_TO_PN_BLEND_TIME) {
            launchPhase = "homing";
            launchPhaseAge = 0;
          }
        }
      }

      missile.launchPhase = launchPhase;
      missile.launchPhaseAge = launchPhaseAge;
    }
    if (commandedAcceleration.lengthSq() > AIR_MISSILE_MAX_LATERAL_ACCELERATION ** 2) {
      commandedAcceleration.setLength(AIR_MISSILE_MAX_LATERAL_ACCELERATION);
    }
    const achieved = updateAirMissileAutopilot(
      missile,
      commandedAcceleration,
      direction,
      elapsed
    );
    const achievedMagnitude = achieved.length();
    const speed = Math.max(0, Number(missile.speed) || 0);
    const requestedRate = speed > 1e-6 ? achievedMagnitude / speed : 0;
    const turnRate = Math.min(requestedRate, effectiveAirTurnRateFor(missile));
    const turn = Math.max(0, turnRate * elapsed);

    if (turn > 1e-9 && achievedMagnitude > 1e-9) {
      lateralDirection.copy(achieved).multiplyScalar(1 / achievedMagnitude);
      steeredDirection.copy(direction)
        .multiplyScalar(Math.cos(turn))
        .addScaledVector(lateralDirection, Math.sin(turn))
        .normalize();
      targetQuaternion.setFromUnitVectors(localForward, steeredDirection);
      missile.mesh.quaternion.copy(targetQuaternion).normalize();
    }

    lineOfSightRateFor(guidanceRelativePosition, guidanceRelativeVelocity, losRate);
    missile.guidanceAge = age + elapsed;
    missile.commandedLateralG = commandedAcceleration.length() / STANDARD_GRAVITY;
    missile.achievedLateralG = achievedMagnitude / STANDARD_GRAVITY;
    missile.lineOfSightRate = losRate.length();
    missile.airGuidancePhase = isVlsLaunchPhaseActive(missile)
      ? missile.launchPhase
      : (missile.terminalCommitted
          ? "terminal-commit"
          : (authority >= 1 ? "homing" : "launch"));
    forwardOf(missile.mesh, direction);
    return direction;
  }

  // Ground units carry both flags - `surface` for "not in the air" and `ground`
  // for "on land" - so `ground` is what separates a battery from a frigate.
  function isGroundTarget(target) {
    return Boolean(target && target.ground);
  }

  // The climb slope that clears every terrain sample between the round and
  // its target with TERRAIN_CLEARANCE to spare. Each sample demands its own
  // slope over its own distance - a ridge halfway needs twice the gradient
  // that spreading the same climb over the full path would give, and using
  // the path-averaged slope is exactly how rounds clipped hilltops. Sampled
  // sparsely and re-sampled every guided frame, so it also tracks the round's
  // progress and a moving target. Negative when nothing is in the way.
  function requiredClimbSlope(missile, target, groundRange, clearance = TERRAIN_CLEARANCE) {
    let slope = -Infinity;
    for (let s = 1; s <= TERRAIN_SAMPLES; s += 1) {
      const t = s / TERRAIN_SAMPLES;
      const h = surfaceHeightAt(
        missile.mesh.position.x + (target.group.position.x - missile.mesh.position.x) * t,
        missile.mesh.position.z + (target.group.position.z - missile.mesh.position.z) * t
      );
      const need = (h + clearance - missile.mesh.position.y) /
        Math.max(groundRange * t, 1);
      if (need > slope) slope = need;
    }
    return slope;
  }

  // The slope a sea-skimmer flies while running in: nose down hard enough to
  // be at wave height SKIM_DESCENT_HORIZON ahead, but never through a terrain
  // sample it will reach inside that horizon. Far samples are ignored - the
  // command is recomputed every frame, so an island beyond the horizon starts
  // binding as soon as the round gets near it.
  function skimSlope(missile, target, groundRange) {
    let slope = -Infinity;
    let nearGround = 0;
    for (let s = 1; s <= TERRAIN_SAMPLES; s += 1) {
      const t = s / TERRAIN_SAMPLES;
      const d = groundRange * t;
      if (s > 1 && d > SKIM_DESCENT_HORIZON) break;
      const h = surfaceHeightAt(
        missile.mesh.position.x + (target.group.position.x - missile.mesh.position.x) * t,
        missile.mesh.position.z + (target.group.position.z - missile.mesh.position.z) * t
      );
      if (s === 1) nearGround = h;
      const need = (h + SKIM_ALTITUDE - missile.mesh.position.y) / Math.max(d, 1);
      if (need > slope) slope = need;
    }
    const descent = (nearGround + SKIM_ALTITUDE - missile.mesh.position.y) /
      SKIM_DESCENT_HORIZON;
    return Math.max(slope, descent);
  }

  // True when the straight line from the round to its target clears the
  // terrain samples between them. The dive is a latch, so this is checked
  // before committing: a round that dives while a crest still pokes through
  // the sight line flies into the crest. The sample nearest the target is
  // skipped - that is the ground the target itself sits on.
  function sightLineClear(missile, target) {
    // Ground at or below the target's own footing is the plane the target
    // stands on, not an obstacle: a wave-top run at a ship holds a sight
    // line within metres of the sea the whole way, and treating the water
    // as blocking meant the skimmer never latched at all. Anything higher
    // is real terrain and gets a conservative 10m margin, because the dive
    // is a latch and clipping a crest is fatal.
    const footing = target.group.position.y + 2;
    for (let s = 1; s < TERRAIN_SAMPLES; s += 1) {
      const t = s / TERRAIN_SAMPLES;
      const h = surfaceHeightAt(
        missile.mesh.position.x + (target.group.position.x - missile.mesh.position.x) * t,
        missile.mesh.position.z + (target.group.position.z - missile.mesh.position.z) * t
      );
      if (h <= footing) continue;
      const lineY = missile.mesh.position.y +
        (target.group.position.y - missile.mesh.position.y) * t;
      if (h > lineY - 10) return false;
    }
    return true;
  }

  // Aim along the ground track at the given climb slope. Reads and mutates
  // `horizontal`, which the caller has already loaded with the ground-track
  // vector; only called with groundRange comfortably above zero.
  function climbAim(slope, groundRange, minSlope = -0.6) {
    horizontal.multiplyScalar(1 / groundRange);
    return horizontal.setY(THREE.MathUtils.clamp(slope, minSlope, 0.6)).normalize();
  }

  function proximityFuseFor(target) {
    if (target.subsystem) return target.spec.hitRadius;
    // A tank at 18m radius fused at 0.35 is a 6.3m target - smaller than the
    // 16m an aircraft gets, for something that cannot dodge. That is the other
    // half of why anti-ground rounds missed.
    if (isGroundTarget(target)) return target.spec.hitRadius * GROUND_FUSE_SCALE;
    if (target.surface) return target.spec.hitRadius * SHIP_FUSE_SCALE;
    return defaultFuse;
  }

  function step(missile, target, slice, skipSeekerSample = false, targetLag = 0) {
    result.hit = false;
    result.guidanceEndedNow = false;
    result.reattackStartedNow = false;
    result.reacquiredNow = false;
    const safeSeparationHeld = holdSafeSeparation(missile, slice);

    if (target) {
      targetVelocityOf(target, targetVelocity);
      if (!Number.isFinite(targetVelocity.x) ||
          !Number.isFinite(targetVelocity.y) ||
          !Number.isFinite(targetVelocity.z)) {
        targetVelocity.set(0, 0, 0);
      }
      // The target has already advanced for the full frame. Terminal missile
      // substeps replay that frame in order instead of steering every substep
      // at the final target point.
      targetPosition.copy(target.group.position).addScaledVector(
        targetVelocity,
        -Math.max(0, Number(targetLag) || 0)
      );
      toTarget.copy(targetPosition).sub(missile.mesh.position);
      const distance = toTarget.length();
      toTarget.normalize();

      // Last-line safety for every player-guided path. Launchers already clamp
      // authored values, but guidance itself owns the actual rotateTowards()
      // budget and therefore enforces the global ceiling too.
      const seekerRate = Math.min(missile.turnRate ?? defaultTurnRate, maxTurnRate);
      let canSteer = !missile.lost;
      if (canSteer) {
        // A surface-bound round owns its terminal profile and does not use the
        // air-to-air pass counter. An air-to-air round gives up only after a
        // confirmed physical overshoot; exceeding turn authority by itself is
        // never a lock-loss event.
        if (!target.surface) {
          forwardOf(missile.mesh, direction);
          const waitingToReacquire = (missile.reacquireTimer || 0) > 0;
          const overshot = waitingToReacquire ? false : sampleMissileOvershoot(
            missile,
            slice,
            distance,
            direction.dot(toTarget),
            skipSeekerSample
          );
          const seekerState = updateSeekerState(
            missile,
            slice,
            overshot
          );
          result.guidanceEndedNow = seekerState === SEEKER_STATE.LOST_NOW;
          result.reattackStartedNow = seekerState === SEEKER_STATE.RETRY_STARTED;
          result.reacquiredNow = seekerState === SEEKER_STATE.REACQUIRED;
          canSteer = seekerState === SEEKER_STATE.TRACKING || seekerState === SEEKER_STATE.REACQUIRED;
        } else {
          missile.closing = distance < missile.lastTargetDistance;
          missile.lastTargetDistance = distance;
        }

        let aim = toTarget;
        if (target.surface && !missile.diving) {
          horizontal.set(
            target.group.position.x - missile.mesh.position.x,
            0,
            target.group.position.z - missile.mesh.position.z
          );
          const groundRange = horizontal.length();

          if (missile.popup && isGroundTarget(target)) {
            // Loft: hold a cruise altitude above the launch point, the target
            // and every ridge in between until the terminal range, then point
            // straight down at it. The dive is committed once entered - a live
            // ratio test would flip back to level halfway down, because during
            // a dive height falls as fast as ground range does.
            if (missile.loftCeiling === undefined) {
              missile.loftCeiling = Math.max(
                missile.mesh.position.y + LOFT_ABOVE_LAUNCH,
                target.group.position.y + LOFT_ABOVE_TARGET
              );
            }
            const drop = missile.mesh.position.y - target.group.position.y;
            // Half a turn radius of anticipation: bending from the climb into
            // the dive is not free, and a close-in shot that climbed first
            // was reversing 46 degrees with 420m to do it in.
            const entry = 0.5 * missile.speed / seekerRate;
            if (groundRange <= Math.max(LOFT_TERMINAL_RANGE, drop * GROUND_DIVE_RATIO) + entry &&
                sightLineClear(missile, target)) {
              missile.diving = true;
            } else if (groundRange > 0.001) {
              // Climb toward the ceiling while running in, so the round is
              // already high by the time the terminal leg starts - and no
              // shallower than the ridges on the way demand.
              aim = climbAim(
                Math.max(
                  (missile.loftCeiling - missile.mesh.position.y) / Math.max(groundRange, 1),
                  requiredClimbSlope(missile, target, groundRange)
                ),
                groundRange
              );
            }
          } else if (missile.popup) {
            // Ships: drop to wave-top height straight off the rail, run in at
            // SKIM_ALTITUDE over whatever surface is below (an island lifts
            // the round over itself), and latch onto the hull at the terminal
            // range - or immediately, if the round is already down at wave
            // height. A round still high when the latch distance arrives
            // enters its pursuit at drop x 1.5, so the dive never steepens
            // past what its seeker can fly.
            const drop = missile.mesh.position.y - target.group.position.y;
            if ((drop <= POPUP_MIN_DROP ||
                 groundRange <= Math.max(SKIM_TERMINAL_RANGE, drop * SKIM_DIVE_RATIO)) &&
                sightLineClear(missile, target)) {
              missile.diving = true;
            } else if (groundRange > 0.001) {
              aim = climbAim(
                skimSlope(missile, target, groundRange),
                groundRange,
                SKIM_DESCENT_SLOPE
              );
            }
          } else if (groundRange > LOFT_TERMINAL_RANGE) {
            // A plain missile at a surface target flies pure pursuit, and pure
            // pursuit flies into the hill the target is behind. Lift it over;
            // inside the terminal range the sight line is clear and it flies
            // straight at the mark as before.
            const slope = requiredClimbSlope(missile, target, groundRange);
            if (slope > 0) aim = climbAim(slope, groundRange);
          }
        }
        if (canSteer && target.surface && !safeSeparationHeld) {
          targetQuaternion.setFromUnitVectors(localForward, aim);
          missile.mesh.quaternion.rotateTowards(targetQuaternion, seekerRate * slice);
        } else if (canSteer && !safeSeparationHeld) {
          guideAirMissile(
            missile,
            target,
            targetPosition,
            targetVelocity,
            slice
          );
        }
      }
    }

    missile.speed = accelerateMissileSpeed(
      missile.speed,
      missile.maxSpeed ?? defaultMaxSpeed,
      missile.acceleration ?? defaultAcceleration,
      slice
    );
    forwardOf(missile.mesh, direction);
    result.travel = missile.speed * slice;
    result.hit = Boolean(
      target &&
      movingTargetMissDistance(
        missile.mesh.position,
        direction,
        result.travel,
        targetPosition,
        targetVelocity,
        slice
      )
        < proximityFuseFor(target)
    );
    return result;
  }

  return Object.freeze({
    stepsFor,
    step,
    sweptMissDistance,
    movingTargetMissDistance,
    predictiveAimFor,
    lineOfSightRateFor,
    proportionalNavigationAccelerationFor,
    guidanceAuthorityAt,
    effectiveAirTurnRateFor,
    updateAirMissileAutopilot,
    isVlsLaunchPhaseActive,
    holdSafeSeparation,
    vlsCaptureAccelerationFor,
    guideAirMissile,
    proximityFuseFor,
    isGroundTarget
  });
}
