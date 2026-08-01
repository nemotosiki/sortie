// Player-missile guidance kernel.
//
// The game loop still owns missile arrays, CIWS interception, damage, effects,
// scoring and removal. This module owns only seeker state, popup steering,
// terminal substeps, propulsion direction and the swept proximity-fuse test.
// It imports no mission/entity feature; all shared contracts arrive as values or
// callbacks from the composition root.

// How far out the sea-skimmer pushes over, as a multiple of how far it has to
// come down. At 1.2 a round launched from 600m started down 720m out and
// arrived at nearly 40 degrees - but its own turn radius is 448m at 430m/s, so
// inside the last 66m of fuse it could no longer correct, and it went past the
// hull and into the water. Measured: two of three rounds ended at 56m and 59m
// altitude having missed a ship whose fuse reaches 66m.
//
// At 3.4 the same launch starts down some 2km out and arrives at about 16
// degrees, which the seeker can hold all the way in.
export const POPUP_DIVE_RATIO = 3.4;
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
// The ground fuse is generous where the sea-skimmer's is not: a round that
// arrives from directly overhead is either on the target or nowhere near it,
// so there is no shallow near-miss to be strict about.
export const GROUND_FUSE_SCALE = 0.9;
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

export function createMissileGuidance({
  THREE,
  localForward,
  forwardOf,
  damping,
  defaultTurnRate,
  defaultMaxSpeed,
  defaultFuse,
  terminalRange,
  terminalSubsteps,
  seekerLossTime,
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
    seekerLostNow: false
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
  function requiredClimbSlope(missile, target, groundRange) {
    let slope = -Infinity;
    for (let s = 1; s <= TERRAIN_SAMPLES; s += 1) {
      const t = s / TERRAIN_SAMPLES;
      const h = surfaceHeightAt(
        missile.mesh.position.x + (target.group.position.x - missile.mesh.position.x) * t,
        missile.mesh.position.z + (target.group.position.z - missile.mesh.position.z) * t
      );
      const need = (h + TERRAIN_CLEARANCE - missile.mesh.position.y) /
        Math.max(groundRange * t, 1);
      if (need > slope) slope = need;
    }
    return slope;
  }

  // Aim along the ground track at the given climb slope. Reads and mutates
  // `horizontal`, which the caller has already loaded with the ground-track
  // vector; only called with groundRange comfortably above zero.
  function climbAim(slope, groundRange) {
    horizontal.multiplyScalar(1 / groundRange);
    return horizontal.setY(THREE.MathUtils.clamp(slope, -0.6, 0.6)).normalize();
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

  function step(missile, target, slice) {
    result.hit = false;
    result.seekerLostNow = false;

    if (target) {
      toTarget.copy(target.group.position).sub(missile.mesh.position);
      const distance = toTarget.length();
      missile.closing = distance < missile.lastTargetDistance;
      missile.lastTargetDistance = distance;
      toTarget.normalize();

      const seekerRate = missile.turnRate ?? defaultTurnRate;
      if (!missile.lost) {
        if (!missile.reattack) {
          if (missile.losValid && slice > 0 && missile.los.angleTo(toTarget) / slice > seekerRate) {
            missile.lostTime += slice;
            if (missile.lostTime >= seekerLossTime) {
              missile.lost = true;
              result.seekerLostNow = true;
            }
          } else {
            missile.lostTime = 0;
          }
        }
        missile.los.copy(toTarget);
        missile.losValid = true;

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
            if (groundRange <= LOFT_TERMINAL_RANGE) {
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
            // Ships: sea-skim at launch altitude, push over when the remaining
            // ground range falls under the height difference times the ratio,
            // and latch. An island on the run-in lifts the round over itself;
            // it never descends toward the clearance height, so an open-sea
            // shot flies exactly as it always did.
            const drop = missile.mesh.position.y - target.group.position.y;
            const pushover = drop * POPUP_DIVE_RATIO;
            if (drop <= POPUP_MIN_DROP || groundRange * groundRange <= pushover * pushover) {
              missile.diving = true;
            } else if (groundRange > 0.001) {
              const slope = requiredClimbSlope(missile, target, groundRange);
              aim = slope > 0
                ? climbAim(slope, groundRange)
                : horizontal.multiplyScalar(1 / groundRange);
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
        targetQuaternion.setFromUnitVectors(localForward, aim);
        missile.mesh.quaternion.rotateTowards(targetQuaternion, seekerRate * slice);
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
