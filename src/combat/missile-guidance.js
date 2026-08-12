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
// Physical turn authority is NOT seeker authority: reaching the 100 deg/s turn
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
  damping,
  defaultTurnRate,
  maxTurnRate = Infinity,
  defaultMaxSpeed,
  defaultFuse,
  terminalRange,
  terminalSubsteps,
  surfaceHeightAt = () => -Infinity
}) {
  const toTarget = new THREE.Vector3();
  const horizontal = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const swept = new THREE.Vector3();
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

  function step(missile, target, slice, skipSeekerSample = false) {
    result.hit = false;
    result.guidanceEndedNow = false;
    result.reattackStartedNow = false;
    result.reacquiredNow = false;

    if (target) {
      toTarget.copy(target.group.position).sub(missile.mesh.position);
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
        if (canSteer) {
          targetQuaternion.setFromUnitVectors(localForward, aim);
          missile.mesh.quaternion.rotateTowards(targetQuaternion, seekerRate * slice);
        }
      }
    }

    missile.speed = THREE.MathUtils.lerp(
      missile.speed,
      missile.maxSpeed ?? defaultMaxSpeed,
      damping(0.012, slice)
    );
    forwardOf(missile.mesh, direction);
    result.travel = missile.speed * slice;
    result.hit = Boolean(
      target &&
      sweptMissDistance(missile.mesh.position, direction, result.travel, target.group.position)
        < proximityFuseFor(target)
    );
    return result;
  }

  return Object.freeze({
    stepsFor,
    step,
    sweptMissDistance,
    proximityFuseFor,
    isGroundTarget
  });
}
