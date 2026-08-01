// Player gun ownership: shared aiming solution, assist state, gimbal decision,
// hit resolution and gunsight presentation.
//
// This module imports no game feature. The composition root supplies live state
// through getters and supplies effects/damage as callbacks, so the dependency is
// main -> player gun and never player gun -> missions/world/entities.

export const DEFAULT_GUN_DAMAGE = 16;
export const DEFAULT_GUN_GROUND_BONUS = 1;
export const GUN_RANGE = 750;
export const GUN_GIMBAL_DEG = 4.5;
export const GUN_GIMBAL_STRENGTH = 0.75;
export const GUN_ASSIST_FAR = 0.3;
export const GUN_ASSIST_TAU_RISE = 0.55;
export const GUN_ASSIST_TAU_FALL = 0.18;
export const GUN_MUZZLE_SPEED = 900;
export const GUN_RATE = 6;

const GUNSIGHT_CONE_DEG = 20;
const GUN_CLOSE_FORGIVENESS = 2.2;

export function createPlayerGunController({
  THREE,
  getPlayer,
  getPlayerSpeed,
  getEnemies,
  getPreferredTargetId,
  getLockTargetId,
  getCamera,
  getUi,
  getDamage,
  getGroundBonus,
  getEnemyHitboxRadius,
  forwardOf,
  upOf,
  rightOf,
  isHudProjectionVisible,
  playSfx,
  damageEnemy,
  createImpactBurst,
  createTracer,
  createMuzzleFlash,
  onShot
}) {
  const GUNSIGHT_CONE_COS = Math.cos(THREE.MathUtils.degToRad(GUNSIGHT_CONE_DEG));

  const assistState = { k: 0, targetId: null };
  const lastGimbal = { applied: false, angleDeg: null, rangeM: null, k: null };
  const gunsightState = {
    active: false,
    targetId: null,
    x: 0,
    y: 0,
    rangeM: 0,
    leadM: 0,
    assistK: 0,
    hot: false,
    forgiveness: 1
  };

  const tmpMuzzle = new THREE.Vector3();
  const tmpLead = new THREE.Vector3();
  const tmpLeadB = new THREE.Vector3();
  const tmpLeadC = new THREE.Vector3();
  const tmpV1 = new THREE.Vector3();
  const tmpV2 = new THREE.Vector3();
  const tmpV3 = new THREE.Vector3();
  const tmpV4 = new THREE.Vector3();
  const tmpV5 = new THREE.Vector3();
  const tmpV6 = new THREE.Vector3();
  const tmpV7 = new THREE.Vector3();
  const tmpV8 = new THREE.Vector3();
  const tmpV9 = new THREE.Vector3();

  function muzzleOrigin(out) {
    const player = getPlayer();
    forwardOf(player, tmpMuzzle);
    return out.copy(player.position).addScaledVector(tmpMuzzle, 8.5);
  }

  function leadPoint(from, enemy, out) {
    const player = getPlayer();
    out.copy(enemy.group.position);
    const range = out.distanceTo(from);
    if (enemy.ground || enemy.surface) return range;
    forwardOf(enemy.group, tmpLead);
    tmpLead.multiplyScalar(enemy.speed || 0);
    forwardOf(player, tmpLeadC);
    tmpLead.addScaledVector(tmpLeadC, -getPlayerSpeed());
    tmpLead.multiplyScalar(range / GUN_MUZZLE_SPEED);
    if (range > 0.001) {
      tmpLeadB.copy(out).sub(from).multiplyScalar(1 / range);
      tmpLead.addScaledVector(tmpLeadB, -tmpLead.dot(tmpLeadB));
    }
    out.add(tmpLead);
    return range;
  }

  function enemyHitSphereRadius(enemy) {
    const box = enemy.spec.hitBox;
    if (box) return Math.max(box.x, box.y, box.z) * 0.5;
    if (enemy.spec.hitRadius) return enemy.spec.hitRadius;
    return getEnemyHitboxRadius() * (enemy.spec.hitboxScale || 1);
  }

  function aimForgiveness(range) {
    const t = THREE.MathUtils.clamp(range / GUN_RANGE, 0, 1);
    return THREE.MathUtils.lerp(GUN_CLOSE_FORGIVENESS, 1, t);
  }

  function gimbalDecision(angleRad, distance) {
    if (!(distance > 0) || distance > GUN_RANGE) return { applied: false, reason: "range" };
    if (angleRad > THREE.MathUtils.degToRad(GUN_GIMBAL_DEG)) return { applied: false, reason: "angle" };
    return { applied: true, reason: "ok" };
  }

  function assistCap(range) {
    const t = THREE.MathUtils.clamp(range / GUN_RANGE, 0, 1);
    return THREE.MathUtils.lerp(GUN_GIMBAL_STRENGTH, GUN_ASSIST_FAR, t);
  }

  function assistStep(state, targetId, angleRad, range, dt) {
    if (targetId !== state.targetId) {
      state.targetId = targetId;
      state.k = 0;
    }
    if (targetId == null) {
      state.k = 0;
      return 0;
    }
    const cap = gimbalDecision(angleRad, range).applied ? assistCap(range) : 0;
    const tau = cap > state.k ? GUN_ASSIST_TAU_RISE : GUN_ASSIST_TAU_FALL;
    if (dt > 0) state.k += (cap - state.k) * (1 - Math.exp(-dt / tau));
    return state.k;
  }

  function fire() {
    onShot();
    playSfx("gun", 0.22, 0.92 + Math.random() * 0.16);

    const player = getPlayer();
    const enemies = getEnemies();
    forwardOf(player, tmpV1);
    upOf(player, tmpV2);
    rightOf(player, tmpV3);

    const muzzleSide = Math.sin(performance.now() * 0.075) >= 0 ? 1 : -1;
    const start = new THREE.Vector3().copy(player.position)
      .addScaledVector(tmpV1, 8.5)
      .addScaledVector(tmpV2, -0.15)
      .addScaledVector(tmpV3, 2.8 * muzzleSide);

    const gimbalTargetId = assistState.targetId;
    lastGimbal.applied = false;
    lastGimbal.angleDeg = null;
    lastGimbal.rangeM = null;
    lastGimbal.k = null;
    if (gimbalTargetId) {
      const gimbalTarget = enemies.find((entity) => entity.id === gimbalTargetId && entity.alive);
      if (gimbalTarget) {
        const gimbalDist = leadPoint(start, gimbalTarget, tmpV4);
        tmpV4.sub(start);
        const leadDist = tmpV4.length();
        if (leadDist > 0) {
          tmpV4.multiplyScalar(1 / leadDist);
          const gimbalAngle = tmpV1.angleTo(tmpV4);
          lastGimbal.angleDeg = THREE.MathUtils.radToDeg(gimbalAngle);
          lastGimbal.rangeM = gimbalDist;
          lastGimbal.k = assistState.k;
          if (gimbalDecision(gimbalAngle, gimbalDist).applied && assistState.k >= 0.01) {
            tmpV1.lerp(tmpV4, assistState.k).normalize();
            lastGimbal.applied = true;
          }
        }
      }
    }

    const hits = [];
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const range = leadPoint(start, enemy, tmpV5);
      if (range > GUN_RANGE) continue;
      tmpV5.sub(start);
      const along = tmpV5.dot(tmpV1);
      if (along <= 0) continue;
      const missDistance = Math.sqrt(Math.max(0, tmpV5.lengthSq() - along * along));
      const baseRadius = enemyHitSphereRadius(enemy);
      if (baseRadius <= 0) continue;
      const radius = baseRadius * aimForgiveness(range);
      if (missDistance > radius) continue;
      hits.push({ enemy, distance: along, missDistance });
    }
    hits.sort((a, b) => a.distance - b.distance);
    let end = new THREE.Vector3().copy(start).addScaledVector(tmpV1, GUN_RANGE);

    if (hits.length > 0) {
      const focusId = getPreferredTargetId() ?? getLockTargetId();
      let hit = hits.find((entry) => entry.enemy.subsystem && entry.enemy.id === focusId);
      if (!hit) hit = hits.find((entry) => !entry.enemy.subsystem);
      if (hit) {
        const victim = hit.enemy;
        end = new THREE.Vector3().copy(start).addScaledVector(tmpV1, hit.distance);
        damageEnemy(
          victim,
          victim.surface ? getDamage() * getGroundBonus() : getDamage(),
          false
        );
        createImpactBurst(end, 0xffb04a, 0.7);
      }
    }

    createTracer(start, end, 0xffd35f, 0.11, 0.9);
    createMuzzleFlash(start, 0xffe39a);
  }

  function updateGunsight(dt = 0) {
    const player = getPlayer();
    const enemies = getEnemies();
    const camera = getCamera();
    const ui = getUi();

    let best = null;
    let bestRange = Infinity;
    forwardOf(player, tmpV9);
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      tmpV8.copy(enemy.group.position).sub(player.position);
      const range = tmpV8.length();
      if (range > GUN_RANGE || range >= bestRange) continue;
      if (tmpV8.dot(tmpV9) <= range * GUNSIGHT_CONE_COS) continue;
      best = enemy;
      bestRange = range;
    }
    if (!best) {
      assistStep(assistState, null, 0, 0, dt);
      ui.gunsight.classList.add("hidden");
      gunsightState.active = false;
      gunsightState.targetId = null;
      return;
    }

    leadPoint(muzzleOrigin(tmpV4), best, tmpV8);
    const leadM = tmpV8.distanceTo(best.group.position);

    tmpV5.copy(tmpV8).sub(tmpV4);
    const solDist = tmpV5.length();
    const offAngle = solDist > 0.001
      ? tmpV9.angleTo(tmpV5.multiplyScalar(1 / solDist))
      : 0;
    const k = assistStep(assistState, best.id, offAngle, bestRange, dt);

    tmpV5.copy(tmpV4).addScaledVector(tmpV9, solDist).lerp(tmpV8, k);
    tmpV8.copy(tmpV5);

    tmpV7.copy(tmpV8).project(camera);
    tmpV6.copy(tmpV8).applyMatrix4(camera.matrixWorldInverse);
    if (!isHudProjectionVisible(tmpV7, tmpV6, 0.98)) {
      ui.gunsight.classList.add("hidden");
      gunsightState.active = false;
      gunsightState.targetId = null;
      return;
    }

    const x = (tmpV7.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-tmpV7.y * 0.5 + 0.5) * window.innerHeight;
    ui.gunsight.style.left = `${x}px`;
    ui.gunsight.style.top = `${y}px`;
    ui.gunsight.classList.remove("hidden");
    ui.boresight.classList.add("hidden");
    const hot = gimbalDecision(offAngle, bestRange).applied;

    gunsightState.active = true;
    gunsightState.targetId = best.id;
    gunsightState.x = x;
    gunsightState.y = y;
    gunsightState.rangeM = bestRange;
    gunsightState.leadM = leadM;
    gunsightState.assistK = k;
    gunsightState.hot = hot;
    gunsightState.forgiveness = aimForgiveness(bestRange);
  }

  return Object.freeze({
    assistState,
    lastGimbal,
    gunsightState,
    muzzleOrigin,
    leadPoint,
    enemyHitSphereRadius,
    aimForgiveness,
    gimbalDecision,
    assistCap,
    assistStep,
    fire,
    updateGunsight
  });
}
