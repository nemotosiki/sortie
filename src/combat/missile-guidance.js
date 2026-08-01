// Player-missile guidance kernel.
//
// The game loop still owns missile arrays, CIWS interception, damage, effects,
// scoring and removal. This module owns only seeker state, popup steering,
// terminal substeps, propulsion direction and the swept proximity-fuse test.
// It imports no mission/entity feature; all shared contracts arrive as values or
// callbacks from the composition root.

export const POPUP_DIVE_RATIO = 1.2;
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
  seekerLossTime
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

  function proximityFuseFor(target) {
    if (target.subsystem) return target.spec.hitRadius;
    // A tank at 18m radius fused at 0.35 is a 6.3m target - smaller than the
    // 16m an aircraft gets, for something that cannot dodge. That is the other
    // half of why anti-ground rounds missed.
    if (isGroundTarget(target)) return target.spec.hitRadius * GROUND_FUSE_SCALE;
    if (target.surface) return target.spec.hitRadius * 0.35;
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
        if (missile.popup && !missile.diving) {
          horizontal.set(
            target.group.position.x - missile.mesh.position.x,
            0,
            target.group.position.z - missile.mesh.position.z
          );
          const groundRange = horizontal.length();

          if (isGroundTarget(target)) {
            // Loft: hold a cruise altitude above both the launch point and the
            // target until the terminal range, then point straight down at it.
            // The dive is committed once entered - a live ratio test would flip
            // back to level halfway down, because during a dive height falls as
            // fast as ground range does.
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
              // already high by the time the terminal leg starts.
              const climb = missile.loftCeiling - missile.mesh.position.y;
              horizontal.multiplyScalar(1 / groundRange);
              aim = horizontal.setY(
                THREE.MathUtils.clamp(climb / Math.max(groundRange, 1), -0.6, 0.6)
              ).normalize();
            }
          } else {
            // Ships: unchanged. Sea-skim at launch altitude, push over when the
            // remaining ground range falls under the height difference times
            // the ratio, and latch.
            const drop = missile.mesh.position.y - target.group.position.y;
            const pushover = drop * POPUP_DIVE_RATIO;
            if (drop <= POPUP_MIN_DROP || groundRange * groundRange <= pushover * pushover) {
              missile.diving = true;
            } else if (groundRange > 0.001) {
              aim = horizontal.multiplyScalar(1 / groundRange);
            }
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
