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

// Assist ceilings by what the airframe is for. Each pair is near -> far across
// the gun's own range; the falloff curve, the 0.55s rise and the 0.18s fall are
// untouched, so only the ceiling moves. AIR keeps the figures every aircraft
// used to fly with, which is why an air-superiority fighter feels unchanged
// against aircraft and suddenly clumsy against a convoy.
const ASSIST = Object.freeze({
  AIR:       { air: { near: 0.75, far: 0.30 }, surface: { near: 0.22, far: 0.08 } },
  INTERCEPT: { air: { near: 0.72, far: 0.28 }, surface: { near: 0.18, far: 0.06 } },
  MULTI:     { air: { near: 0.62, far: 0.24 }, surface: { near: 0.52, far: 0.20 } },
  CARRIER:   { air: { near: 0.64, far: 0.25 }, surface: { near: 0.66, far: 0.26 } },
  ATTACK:    { air: { near: 0.30, far: 0.10 }, surface: { near: 0.82, far: 0.34 } },
  LEGACY:    { air: { near: 0.55, far: 0.20 }, surface: { near: 0.42, far: 0.15 } }
});

const freezeProfile = (p) => Object.freeze({
  rate: p.rate,
  range: p.range,
  assist: Object.freeze({
    air: Object.freeze({ ...p.assist.air }),
    surface: Object.freeze({ ...p.assist.surface })
  }),
  muzzles: Object.freeze(p.muzzles.map((m) => Object.freeze({ ...m })))
});

// What an airframe with no profile flies with. The muzzle pair is the old
// hardcoded geometry moved verbatim - forward 8.5, down 0.15, alternating
// 2.8 either side - so an unlisted aircraft shoots from exactly where it did.
export const DEFAULT_PLAYER_GUN_PROFILE = freezeProfile({
  rate: GUN_RATE,
  range: GUN_RANGE,
  assist: { air: { near: GUN_GIMBAL_STRENGTH, far: GUN_ASSIST_FAR },
            surface: { near: GUN_GIMBAL_STRENGTH, far: GUN_ASSIST_FAR } },
  muzzles: [
    { forward: 8.5, right: -2.8, up: -0.15 },
    { forward: 8.5, right: 2.8, up: -0.15 }
  ]
});

// One barrel means no alternation: a single-cannon aircraft fires ten rounds
// from the same port, which is the visible half of what makes it feel heavy.
const P = (rate, range, assist, ...muzzles) => freezeProfile({ rate, range, assist, muzzles });

export const PLAYER_GUN_PROFILES = Object.freeze({
  a10:     P(5.0, 650, ASSIST.ATTACK,    { forward: 8.6, right: 0, up: -0.65 }),
  su25:    P(5.0, 675, ASSIST.ATTACK,    { forward: 7.3, right: -0.22, up: -0.45 },
                                          { forward: 7.3, right: 0.22, up: -0.45 }),
  mig21:   P(5.5, 700, ASSIST.LEGACY,    { forward: 6.6, right: 0, up: -0.40 }),
  f4:      P(5.5, 725, ASSIST.LEGACY,    { forward: 8.1, right: 0, up: -0.45 }),
  mig23:   P(6.0, 775, ASSIST.INTERCEPT, { forward: 7.5, right: 0, up: -0.45 }),
  f16:     P(6.5, 800, ASSIST.MULTI,     { forward: 7.2, right: -1.05, up: -0.05 }),
  gripen:  P(6.5, 800, ASSIST.MULTI,     { forward: 7.0, right: -0.85, up: 0 }),
  f2a:     P(6.5, 800, ASSIST.MULTI,     { forward: 7.2, right: -1.05, up: -0.05 }),
  fa18:    P(6.5, 775, ASSIST.CARRIER,   { forward: 7.8, right: 0, up: -0.15 }),
  f14:     P(6.0, 825, ASSIST.CARRIER,   { forward: 8.4, right: -0.95, up: 0.05 }),
  f15:     P(6.5, 850, ASSIST.AIR,       { forward: 8.0, right: 1.15, up: 0 }),
  f22:     P(7.0, 900, ASSIST.AIR,       { forward: 8.0, right: 0.95, up: 0.05 }),
  f35c:    P(6.5, 850, ASSIST.CARRIER,   { forward: 7.7, right: -0.90, up: 0.18 }),
  rafale:  P(7.0, 850, ASSIST.CARRIER,   { forward: 7.2, right: 0.85, up: 0 }),
  typhoon: P(7.0, 850, ASSIST.AIR,       { forward: 7.4, right: 0.90, up: 0 }),
  mig31:   P(5.5, 900, ASSIST.INTERCEPT, { forward: 9.0, right: 0.80, up: -0.10 }),
  mig29:   P(6.5, 800, ASSIST.MULTI,     { forward: 7.2, right: -0.85, up: 0 }),
  su33:    P(6.5, 825, ASSIST.CARRIER,   { forward: 8.0, right: 0.85, up: 0 }),
  su35:    P(7.0, 850, ASSIST.AIR,       { forward: 8.1, right: 0.90, up: 0 }),
  su37:    P(7.0, 850, ASSIST.AIR,       { forward: 8.1, right: 0.90, up: 0 }),
  su47:    P(7.0, 850, ASSIST.AIR,       { forward: 7.8, right: 0.85, up: 0 }),
  su57:    P(7.0, 900, ASSIST.AIR,       { forward: 8.2, right: 0.95, up: 0 })
});

export function playerGunProfileFor(aircraftId) {
  return PLAYER_GUN_PROFILES[aircraftId] || DEFAULT_PLAYER_GUN_PROFILE;
}

export function createPlayerGunController({
  THREE,
  getPlayer,
  getPlayerSpeed,
  getEnemies,
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

  // Resolved once when the aircraft is loaded, never looked up per frame.
  let profile = DEFAULT_PLAYER_GUN_PROFILE;
  // Which barrel fires next. The sight draws from this one and the round leaves
  // from this one, so what is aimed and what is fired are the same port; it only
  // advances after a shot actually goes out.
  let muzzleIndex = 0;

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
  const tmpMuzzleF = new THREE.Vector3();
  const tmpMuzzleR = new THREE.Vector3();
  const tmpMuzzleU = new THREE.Vector3();
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
  const hitRaycaster = new THREE.Raycaster();
  const hitRayResults = [];

  // Where the barrel at `index` sits right now, in world space. Offsets are read
  // against the aircraft's own axes, so a wing-root cannon stays on the wing
  // through a roll instead of swinging out to the side.
  function muzzleAt(index, out) {
    const player = getPlayer();
    const m = profile.muzzles[index % profile.muzzles.length];
    forwardOf(player, tmpMuzzleF);
    rightOf(player, tmpMuzzleR);
    upOf(player, tmpMuzzleU);
    return out.copy(player.position)
      .addScaledVector(tmpMuzzleF, m.forward)
      .addScaledVector(tmpMuzzleR, m.right)
      .addScaledVector(tmpMuzzleU, m.up);
  }

  function muzzleOrigin(out) {
    return muzzleAt(muzzleIndex, out);
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

  // Resolve a hull against every visible mesh that actually makes up the ship:
  // bow, deck, superstructure and all. This is both tighter than the authored
  // envelope box and complete over the vessel's real rendered dimensions. A
  // subsystem has no separate visible model, so its small oriented hit box is
  // the collision surface. The old length-derived sphere made the empty water
  // beside a carrier as solid as its flight deck.
  function preciseShipIntersection(start, direction, enemy, maxRange) {
    if (!enemy.surface || enemy.ground || !enemy.hitbox) return null;
    if (!(maxRange > 0) || direction.lengthSq() < 1e-10) return null;

    const collisionRoot = enemy.subsystem
      ? enemy.hitbox
      : (enemy.model && enemy.model.group ? enemy.model.group : enemy.hitbox);
    collisionRoot.updateWorldMatrix(true, true);
    hitRaycaster.near = 0;
    hitRaycaster.far = maxRange;
    hitRaycaster.set(start, tmpV2.copy(direction).normalize());
    hitRayResults.length = 0;
    hitRaycaster.intersectObject(collisionRoot, !enemy.subsystem, hitRayResults);
    const intersection = hitRayResults[0];
    if (!intersection) return null;
    return {
      enemy,
      distance: intersection.distance,
      missDistance: 0,
      point: intersection.point.clone(),
      precise: true
    };
  }

  function intersectEnemy(start, direction, enemy, maxRange = profile.range) {
    if (!enemy || !enemy.alive) return null;

    const shipHit = preciseShipIntersection(start, direction, enemy, maxRange);
    if (enemy.surface && !enemy.ground) return shipHit;

    const range = leadPoint(start, enemy, tmpV5);
    if (range > maxRange) return null;
    tmpV5.sub(start);
    const along = tmpV5.dot(direction);
    if (along <= 0 || along > maxRange) return null;
    const missDistance = Math.sqrt(Math.max(0, tmpV5.lengthSq() - along * along));
    const baseRadius = enemyHitSphereRadius(enemy);
    if (baseRadius <= 0) return null;
    const radius = baseRadius * aimForgiveness(range, enemy);
    if (missDistance > radius) return null;
    return {
      enemy,
      distance: along,
      missDistance,
      point: new THREE.Vector3().copy(start).addScaledVector(direction, along),
      precise: false
    };
  }

  function resolveHit(start, direction, maxRange = profile.range) {
    const hits = [];
    for (const enemy of getEnemies()) {
      const hit = intersectEnemy(start, direction, enemy, maxRange);
      if (hit) hits.push(hit);
    }
    hits.sort((a, b) => a.distance - b.distance);
    if (hits.length === 0) return null;
    // Pure nearest-surface resolution is now possible because hulls use their
    // rendered meshes rather than one envelope box. A mount wins only when its
    // own box is encountered first; a far-side mount behind steel cannot be
    // damaged through the hull, and a subsystem on another ship can never
    // steal a shot from the vessel in front of it.
    return hits[0];
  }

  function aimForgiveness(range, target = null) {
    // Ships and their mounted subsystems already expose their physical
    // hull radius. Fighter-scale close-range forgiveness must not turn a
    // carrier into a several-hundred-metre invisible sphere. Ground units
    // retain the original help because their hit volumes are small.
    if (target && target.surface && !target.ground) return 1;
    const t = THREE.MathUtils.clamp(range / profile.range, 0, 1);
    return THREE.MathUtils.lerp(GUN_CLOSE_FORGIVENESS, 1, t);
  }

  function gimbalDecision(angleRad, distance) {
    if (!(distance > 0) || distance > profile.range) return { applied: false, reason: "range" };
    if (angleRad > THREE.MathUtils.degToRad(GUN_GIMBAL_DEG)) return { applied: false, reason: "angle" };
    return { applied: true, reason: "ok" };
  }

  // Ships and ground installations are one class, everything that flies is the
  // other. The distinction already exists on the entity; nothing new is invented
  // for it, and helicopters count as aircraft because that is what they are to
  // a gun.
  function targetClass(target) {
    return target && (target.ground || target.surface) ? "surface" : "air";
  }

  function assistCap(range, target) {
    const limits = profile.assist[targetClass(target)];
    const t = THREE.MathUtils.clamp(range / profile.range, 0, 1);
    return THREE.MathUtils.lerp(limits.near, limits.far, t);
  }

  function assistStep(state, targetId, angleRad, range, dt, target) {
    if (targetId !== state.targetId) {
      state.targetId = targetId;
      state.k = 0;
    }
    if (targetId == null) {
      state.k = 0;
      return 0;
    }
    const cap = gimbalDecision(angleRad, range).applied ? assistCap(range, target) : 0;
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

    // The barrel the sight has been drawing from. It advances only once the
    // round is away, so the ring and the round never disagree about which port
    // they belong to.
    const start = muzzleAt(muzzleIndex, new THREE.Vector3());
    muzzleIndex = (muzzleIndex + 1) % profile.muzzles.length;

    const gimbalTargetId = assistState.targetId;
    lastGimbal.applied = false;
    lastGimbal.angleDeg = null;
    lastGimbal.rangeM = null;
    lastGimbal.k = null;
    if (gimbalTargetId != null) {
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

    let end = new THREE.Vector3().copy(start).addScaledVector(tmpV1, profile.range);

    const hit = resolveHit(start, tmpV1, profile.range);
    if (hit) {
      const victim = hit.enemy;
      end.copy(hit.point);
      damageEnemy(
        victim,
        victim.surface ? getDamage() * getGroundBonus() : getDamage(),
        false
      );
      createImpactBurst(end, 0xffb04a, 0.7);
    }

    createTracer(start, end, 0xffd35f, 0.11, 0.9);
    createMuzzleFlash(start, 0xffe39a);
    return hit ? hit.enemy.id : null;
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
      if (range > profile.range || range >= bestRange) continue;
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
    const k = assistStep(assistState, best.id, offAngle, bestRange, dt, best);

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
    gunsightState.forgiveness = aimForgiveness(bestRange, best);
  }

  // Called once when an aircraft is loaded. Switching airframes resets which
  // barrel is up next, so the first round of a sortie always leaves the first
  // muzzle rather than wherever the previous aircraft happened to stop.
  function setAircraft(aircraftId) {
    profile = playerGunProfileFor(aircraftId);
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
    return profile;
  }

  return Object.freeze({
    assistState,
    lastGimbal,
    gunsightState,
    muzzleOrigin,
    leadPoint,
    enemyHitSphereRadius,
    intersectEnemy,
    resolveHit,
    aimForgiveness,
    gimbalDecision,
    assistCap,
    assistStep,
    fire,
    updateGunsight,
    setAircraft,
    muzzleAt,
    targetClass,
    getProfile: () => profile,
    getMuzzleIndex: () => muzzleIndex
  });
}
