// Player-missile guidance kernel.
//
// The game loop still owns missile arrays, CIWS interception, damage, effects,
// scoring and removal. This module owns only seeker state, popup steering,
// terminal substeps, propulsion direction and the swept proximity-fuse test.
// It imports no mission/entity feature; all shared contracts arrive as values or
// callbacks from the composition root.

export const POPUP_DIVE_RATIO = 1.2;
export const POPUP_MIN_DROP = 60;

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

  function proximityFuseFor(target) {
    if (target.subsystem) return target.spec.hitRadius;
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
          const drop = missile.mesh.position.y - target.group.position.y;
          horizontal.set(
            target.group.position.x - missile.mesh.position.x,
            0,
            target.group.position.z - missile.mesh.position.z
          );
          const pushover = drop * POPUP_DIVE_RATIO;
          if (drop <= POPUP_MIN_DROP || horizontal.lengthSq() <= pushover * pushover) {
            missile.diving = true;
          } else {
            aim = horizontal.normalize();
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
    proximityFuseFor
  });
}
