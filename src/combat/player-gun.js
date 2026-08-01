// Player gun ownership: per-airframe profile selection, shared aiming solution,
// assist state, gimbal decision, hit resolution and gunsight presentation.
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

const DEFAULT_GUN_COLORS = Object.freeze({
  tracer: 0xffd35f,
  muzzle: 0xffe39a,
  impact: 0xffb04a
});

function freezeAssist(airNear, airFar, surfaceNear, surfaceFar) {
  return Object.freeze({
    air: Object.freeze({ near: airNear, far: airFar }),
    surface: Object.freeze({ near: surfaceNear, far: surfaceFar })
  });
}

const ASSIST = Object.freeze({
  DEFAULT: freezeAssist(0.75, 0.30, 0.75, 0.30),
  AIR: freezeAssist(0.75, 0.30, 0.22, 0.08),
  INTERCEPT: freezeAssist(0.72, 0.28, 0.18, 0.06),
  MULTI: freezeAssist(0.62, 0.24, 0.52, 0.20),
  CARRIER: freezeAssist(0.64, 0.25, 0.66, 0.26),
  ATTACK: freezeAssist(0.30, 0.10, 0.82, 0.34),
  LEGACY: freezeAssist(0.55, 0.20, 0.42, 0.15)
});

function freezeMuzzles(muzzles) {
  return Object.freeze(muzzles.map((muzzle) => Object.freeze({
    forward: muzzle.forward,
    right: muzzle.right,
    up: muzzle.up
  })));
}

function profile(rate, range, assist, muzzles, colors = DEFAULT_GUN_COLORS) {
  return Object.freeze({
    rate,
    range,
    assist,
    muzzles: freezeMuzzles(muzzles),
    colors
  });
}

function muzzle(forward, right, up) {
  return { forward, right, up };
}

// The fallback keeps every pre-profile gameplay value: six rounds per second,
// 750 m range, the original assist curve and the old left/right gun ports. It is
// also what payload-added or future aircraft receive until they opt into an
// explicit profile.
export const DEFAULT_PLAYER_GUN_PROFILE = profile(
  GUN_RATE,
  GUN_RANGE,
  ASSIST.DEFAULT,
  [muzzle(8.5, -2.8, -0.15), muzzle(8.5, 2.8, -0.15)]
);

// Player-only gun identity. AIRCRAFT_TYPES remains the shared airframe contract
// for player and enemy HP/performance/damage; these entries only describe how
// the player's cannon is aimed and where its rounds leave the model.
export const PLAYER_GUN_PROFILES = Object.freeze({
  a10: profile(5.0, 650, ASSIST.ATTACK, [muzzle(8.6, 0, -0.65)]),
  su25: profile(5.0, 675, ASSIST.ATTACK, [
    muzzle(7.3, -0.22, -0.45),
    muzzle(7.3, 0.22, -0.45)
  ]),
  mig21: profile(5.5, 700, ASSIST.LEGACY, [muzzle(6.6, 0, -0.40)]),
  f4: profile(5.5, 725, ASSIST.LEGACY, [muzzle(8.1, 0, -0.45)]),
  mig23: profile(6.0, 775, ASSIST.INTERCEPT, [muzzle(7.5, 0, -0.45)]),
  f16: profile(6.5, 800, ASSIST.MULTI, [muzzle(7.2, -1.05, -0.05)]),
  gripen: profile(6.5, 800, ASSIST.MULTI, [muzzle(7.0, -0.85, 0)]),
  f2a: profile(6.5, 800, ASSIST.MULTI, [muzzle(7.2, -1.05, -0.05)]),
  fa18: profile(6.5, 775, ASSIST.CARRIER, [muzzle(7.8, 0, -0.15)]),
  f14: profile(6.0, 825, ASSIST.CARRIER, [muzzle(8.4, -0.95, 0.05)]),
  f15: profile(6.5, 850, ASSIST.AIR, [muzzle(8.0, 1.15, 0)]),
  f22: profile(7.0, 900, ASSIST.AIR, [muzzle(8.0, 0.95, 0.05)]),
  f35c: profile(6.5, 850, ASSIST.CARRIER, [muzzle(7.7, -0.90, 0.18)]),
  rafale: profile(7.0, 850, ASSIST.CARRIER, [muzzle(7.2, 0.85, 0)]),
  typhoon: profile(7.0, 850, ASSIST.AIR, [muzzle(7.4, 0.90, 0)]),
  mig31: profile(5.5, 900, ASSIST.INTERCEPT, [muzzle(9.0, 0.80, -0.10)]),
  mig29: profile(6.5, 800, ASSIST.MULTI, [muzzle(7.2, -0.85, 0)]),
  su33: profile(6.5, 825, ASSIST.CARRIER, [muzzle(8.0, 0.85, 0)]),
  su35: profile(7.0, 850, ASSIST.AIR, [muzzle(8.1, 0.90, 0)]),
  su37: profile(7.0, 850, ASSIST.AIR, [muzzle(8.1, 0.90, 0)]),
  su47: profile(7.0, 850, ASSIST.AIR, [muzzle(7.8, 0.85, 0)]),
  su57: profile(7.0, 900, ASSIST.AIR, [muzzle(8.2, 0.95, 0)])
});

export function playerGunProfileFor(aircraftId) {
  return PLAYER_GUN_PROFILES[aircraftId] || DEFAULT_PLAYER_GUN_PROFILE;
}

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

  let activeAircraftId = null;
  let activeProfile = DEFAULT_PLAYER_GUN_PROFILE;
  let muzzleIndex = 0;

  const tmpMuzzleForward = new THREE.Vector3();
  const tmpMuzzleRight = new THREE.Vector3();
  const tmpMuzzleUp = new THREE.Vector3();
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

  function makeShotSolution() {
    return {
      origin: new THREE.Vector3(),
      nose: new THREE.Vector3(),
      lead: new THREE.Vector3(),
      leadDirection: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      aimPoint: new THREE.Vector3(),
      range: 0,
      solutionDistance: 0,
      offAngle: 0
    };
  }

  const fireSolution = makeShotSolution();
  const sightSolution = makeShotSolution();

  function resetProfileState() {
    muzzleIndex = 0;
    assistState.k = 0;
    assistState.targetId = null;
    lastGimbal.applied = false;
    lastGimbal.angleDeg = null;
    lastGimbal.rangeM = null;
    lastGimbal.k = null;
    gunsightState.active = false;
    gunsightState.targetId = null;
    gunsightState.assistK = 0;
    gunsightState.hot = false;
  }

  function setAircraft(aircraftId) {
    activeAircraftId = typeof aircraftId === "string" ? aircraftId : null;
    activeProfile = playerGunProfileFor(activeAircraftId);
    // A fresh sortie with the same airframe still starts from muzzle zero and
    // with no remembered target assist. The loadout boundary, not an ID change,
    // owns this reset.
    resetProfileState();
    return activeProfile;
  }

  function getProfile() {
    return activeProfile;
  }

  function getRate() {
    return activeProfile.rate;
  }

  function getRange() {
    return activeProfile.range;
  }

  function getMuzzleIndex() {
    return muzzleIndex;
  }

  function muzzleOrigin(out, index = muzzleIndex) {
    const player = getPlayer();
    const count = activeProfile.muzzles.length;
    const selected = activeProfile.muzzles[((index % count) + count) % count];
    forwardOf(player, tmpMuzzleForward);
    rightOf(player, tmpMuzzleRight);
    upOf(player, tmpMuzzleUp);
    return out.copy(player.position)
      .addScaledVector(tmpMuzzleForward, selected.forward)
      .addScaledVector(tmpMuzzleRight, selected.right)
      .addScaledVector(tmpMuzzleUp, selected.up);
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
    const t = THREE.MathUtils.clamp(range / activeProfile.range, 0, 1);
    return THREE.MathUtils.lerp(GUN_CLOSE_FORGIVENESS, 1, t);
  }

  function gimbalDecision(angleRad, distance) {
    if (!(distance > 0) || distance > activeProfile.range) {
      return { applied: false, reason: "range" };
    }
    if (angleRad > THREE.MathUtils.degToRad(GUN_GIMBAL_DEG)) {
      return { applied: false, reason: "angle" };
    }
    return { applied: true, reason: "ok" };
  }

  function targetClass(targetOrKind) {
    if (targetOrKind === "surface") return "surface";
    if (targetOrKind === "air" || !targetOrKind) return "air";
    return targetOrKind.ground || targetOrKind.surface ? "surface" : "air";
  }

  function assistCap(range, targetOrKind = "air") {
    const limits = activeProfile.assist[targetClass(targetOrKind)];
    const t = THREE.MathUtils.clamp(range / activeProfile.range, 0, 1);
    return THREE.MathUtils.lerp(limits.near, limits.far, t);
  }

  // The first five parameters are the pre-profile public contract. The optional
  // sixth parameter selects the existing air/surface target class; old callers
  // omit it and retain the air curve.
  function assistStep(state, targetId, angleRad, range, dt, targetOrKind = "air") {
    if (targetId !== state.targetId) {
      state.targetId = targetId;
      state.k = 0;
    }
    if (targetId == null) {
      state.k = 0;
      return 0;
    }
    const cap = gimbalDecision(angleRad, range).applied
      ? assistCap(range, targetOrKind)
      : 0;
    const tau = cap > state.k ? GUN_ASSIST_TAU_RISE : GUN_ASSIST_TAU_FALL;
    if (dt > 0) state.k += (cap - state.k) * (1 - Math.exp(-dt / tau));
    return state.k;
  }

  // One solution for both presentation and damage. `prepareShot` resolves the
  // next physical muzzle and the target lead; `resolveShot` applies the same
  // assist amount to produce both the world-space ring point and the firing ray.
  function prepareShot(target, index, out) {
    muzzleOrigin(out.origin, index);
    forwardOf(getPlayer(), out.nose);
    out.range = leadPoint(out.origin, target, out.lead);
    out.leadDirection.copy(out.lead).sub(out.origin);
    out.solutionDistance = out.leadDirection.length();
    if (out.solutionDistance > 0.001) {
      out.leadDirection.multiplyScalar(1 / out.solutionDistance);
      out.offAngle = out.nose.angleTo(out.leadDirection);
    } else {
      out.leadDirection.copy(out.nose);
      out.offAngle = 0;
    }
    return out;
  }

  function resolveShot(prepared, assistAmount) {
    prepared.direction.copy(prepared.nose)
      .lerp(prepared.leadDirection, THREE.MathUtils.clamp(assistAmount, 0, 1))
      .normalize();
    prepared.aimPoint.copy(prepared.origin)
      .addScaledVector(prepared.direction, prepared.solutionDistance);
    return prepared;
  }

  function fire() {
    onShot();
    playSfx("gun", 0.22, 0.92 + Math.random() * 0.16);

    const enemies = getEnemies();
    const firedMuzzleIndex = muzzleIndex;
    muzzleOrigin(fireSolution.origin, firedMuzzleIndex);
    forwardOf(getPlayer(), fireSolution.direction);

    const gimbalTargetId = assistState.targetId;
    lastGimbal.applied = false;
    lastGimbal.angleDeg = null;
    lastGimbal.rangeM = null;
    lastGimbal.k = null;
    if (gimbalTargetId != null) {
      const gimbalTarget = enemies.find((entity) => entity.id === gimbalTargetId && entity.alive);
      if (gimbalTarget) {
        prepareShot(gimbalTarget, firedMuzzleIndex, fireSolution);
        const decision = gimbalDecision(fireSolution.offAngle, fireSolution.range);
        lastGimbal.angleDeg = THREE.MathUtils.radToDeg(fireSolution.offAngle);
        lastGimbal.rangeM = fireSolution.range;
        lastGimbal.k = assistState.k;
        const effectiveK = decision.applied && assistState.k >= 0.01 ? assistState.k : 0;
        resolveShot(fireSolution, effectiveK);
        lastGimbal.applied = effectiveK > 0;
      }
    }

    const start = fireSolution.origin;
    const direction = fireSolution.direction;
    const hits = [];
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const range = leadPoint(start, enemy, tmpV5);
      if (range > activeProfile.range) continue;
      tmpV5.sub(start);
      const along = tmpV5.dot(direction);
      if (along <= 0) continue;
      const missDistance = Math.sqrt(Math.max(0, tmpV5.lengthSq() - along * along));
      const baseRadius = enemyHitSphereRadius(enemy);
      if (baseRadius <= 0) continue;
      const radius = baseRadius * aimForgiveness(range);
      if (missDistance > radius) continue;
      hits.push({ enemy, distance: along, missDistance });
    }
    hits.sort((a, b) => a.distance - b.distance);
    let end = new THREE.Vector3().copy(start).addScaledVector(direction, activeProfile.range);

    if (hits.length > 0) {
      const focusId = getPreferredTargetId() ?? getLockTargetId();
      let hit = hits.find((entry) => entry.enemy.subsystem && entry.enemy.id === focusId);
      if (!hit) hit = hits.find((entry) => !entry.enemy.subsystem);
      if (hit) {
        const victim = hit.enemy;
        end = new THREE.Vector3().copy(start).addScaledVector(direction, hit.distance);
        damageEnemy(
          victim,
          victim.surface ? getDamage() * getGroundBonus() : getDamage(),
          false
        );
        createImpactBurst(end, activeProfile.colors.impact, 0.7);
      }
    }

    createTracer(start, end, activeProfile.colors.tracer, 0.11, 0.9);
    createMuzzleFlash(start, activeProfile.colors.muzzle);
    muzzleIndex = (muzzleIndex + 1) % activeProfile.muzzles.length;
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
      if (range > activeProfile.range || range >= bestRange) continue;
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

    prepareShot(best, muzzleIndex, sightSolution);
    const leadM = sightSolution.lead.distanceTo(best.group.position);
    const k = assistStep(
      assistState,
      best.id,
      sightSolution.offAngle,
      sightSolution.range,
      dt,
      best
    );
    const decision = gimbalDecision(sightSolution.offAngle, sightSolution.range);
    const effectiveK = decision.applied ? k : 0;
    resolveShot(sightSolution, effectiveK);

    tmpV7.copy(sightSolution.aimPoint).project(camera);
    tmpV6.copy(sightSolution.aimPoint).applyMatrix4(camera.matrixWorldInverse);
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

    gunsightState.active = true;
    gunsightState.targetId = best.id;
    gunsightState.x = x;
    gunsightState.y = y;
    gunsightState.rangeM = sightSolution.range;
    gunsightState.leadM = leadM;
    gunsightState.assistK = k;
    gunsightState.hot = decision.applied;
    gunsightState.forgiveness = aimForgiveness(sightSolution.range);
  }

  function profileProbe() {
    const nextWorld = muzzleOrigin(new THREE.Vector3());
    const nextLocal = activeProfile.muzzles[muzzleIndex];
    return {
      aircraft: activeAircraftId,
      registered: Boolean(activeAircraftId && PLAYER_GUN_PROFILES[activeAircraftId]),
      rate: activeProfile.rate,
      range: activeProfile.range,
      assist: {
        air: { ...activeProfile.assist.air },
        surface: { ...activeProfile.assist.surface }
      },
      muzzleIndex,
      muzzleCount: activeProfile.muzzles.length,
      nextMuzzle: {
        local: { ...nextLocal },
        world: { x: nextWorld.x, y: nextWorld.y, z: nextWorld.z }
      },
      colors: { ...activeProfile.colors }
    };
  }

  return Object.freeze({
    assistState,
    lastGimbal,
    gunsightState,
    setAircraft,
    getProfile,
    getRate,
    getRange,
    getMuzzleIndex,
    muzzleOrigin,
    leadPoint,
    enemyHitSphereRadius,
    aimForgiveness,
    gimbalDecision,
    assistCap,
    assistStep,
    fire,
    updateGunsight,
    profileProbe
  });
}
