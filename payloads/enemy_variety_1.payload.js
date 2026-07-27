// Enemy variety batch 1: four ground target classes, three helicopter classes,
// and the requested additions to r06, r08, r09 and r11.
//
// This payload intentionally does not touch index.html or AIRCRAFT_TYPES.
export default function register(ctx) {
  const {
    GROUND_TYPES,
    HELI_TYPES,
    ENEMY_MISSILE_PROFILES,
    MISSIONS
  } = ctx.tables;

  const samMissile = ENEMY_MISSILE_PROFILES.samSite;
  const hindMissile = ENEMY_MISSILE_PROFILES.hind;
  if (!samMissile || !hindMissile) {
    throw new Error("[enemy-variety-1] expected samSite and hind missile profiles");
  }

  // ---- Ground target classes ---------------------------------------------
  // A parked self-propelled battery. The vehicle chassis and short-range gun
  // come from adTank; its actual SAM round is registered below from samSite.
  ctx.addGroundType("mobileSam", {
    ...GROUND_TYPES.adTank,
    key: "mobileSam",
    label: "MOBILE SAM",
    role: "Short-Range Mobile SAM Vehicle",
    hp: 72,
    hitRadius: 18,
    aaMounts: [2.8, 3.6],
    aaHeight: 4.6,
    aa: {
      range: 420,
      cooldownMin: 1.15,
      cooldownSpread: 0.85,
      damage: 6,
      maxHitChance: 0.1,
      tracers: 1
    },
    dishSpin: 0.9,
    radarColor: "#ff8f5a"
  });
  ctx.addEnemyMissileProfile("mobileSam", {
    ...samMissile,
    cooldownMin: samMissile.cooldownMin * 1.15,
    cooldownSpread: samMissile.cooldownSpread * 1.1,
    range: samMissile.range * 0.72,
    minRange: samMissile.minRange * 0.82,
    speed: samMissile.speed * 0.92,
    maxSpeed: samMissile.maxSpeed * 0.9
  });

  ctx.addGroundType("commandPost", {
    ...GROUND_TYPES.bunker,
    key: "commandPost",
    label: "COMMAND POST",
    role: "Command and Communications Post",
    hp: 100,
    hitRadius: 30,
    aa: null,
    smokeHeight: 7,
    explosionColor: 0xffa96a
  });

  ctx.addGroundType("ammoDepot", {
    ...GROUND_TYPES.fuelTank,
    key: "ammoDepot",
    label: "AMMO DEPOT",
    role: "Ammunition Storage Site",
    hp: 60,
    hitRadius: 22,
    aa: null,
    chain: { radius: 62, damage: 82 },
    smokeHeight: 9,
    explosionColor: 0xff8d32
  });

  ctx.addGroundType("ciws", {
    ...GROUND_TYPES.aaGun,
    key: "ciws",
    label: "CIWS",
    role: "Close-In Weapon System",
    hp: 78,
    hitRadius: 21,
    aaMounts: [-3.4, -1.1, 1.1, 3.4],
    aaHeight: 4.8,
    aa: {
      range: 420,
      cooldownMin: 0.32,
      cooldownSpread: 0.22,
      damage: 7,
      maxHitChance: 0.24,
      tracers: 4
    },
    radarColor: "#ff7650"
  });

  // ---- Helicopter classes -------------------------------------------------
  ctx.addHeliType("scoutHeli", {
    ...HELI_TYPES.hind,
    key: "scoutHeli",
    label: "SCOUT HELI",
    role: "Light Reconnaissance Helicopter",
    hp: 54,
    hitRadius: 9,
    hitBox: { x: 6.5, y: 6, z: 15 },
    cruiseSpeed: 62,
    dashSpeed: 84,
    accel: 34,
    turnRate: HELI_TYPES.hind.turnRate * 1.35,
    climbRate: 30,
    standoff: 700,
    orbitRate: 0.24,
    hoverBand: [70, 140],
    clearance: 24,
    attackRange: 650,
    aimThreshold: 0.68,
    rotorSpin: 28,
    aaMounts: [5],
    aaHeight: 0,
    aa: {
      range: 420,
      cooldownMin: 2.4,
      cooldownSpread: 1.8,
      damage: 3,
      maxHitChance: 0.045,
      tracers: 1
    },
    smokeHeight: 1.6,
    explosionScale: 0.55
  });

  // updateHeli currently dereferences spec.aa unconditionally. A zero-range,
  // zero-damage fit therefore represents an unarmed transport without using
  // aa:null (which would crash the existing updater).
  ctx.addHeliType("transportHeli", {
    ...HELI_TYPES.hind,
    key: "transportHeli",
    label: "TRANSPORT HELI",
    role: "Heavy Transport Helicopter",
    hp: 145,
    hitRadius: 16,
    hitBox: { x: 12, y: 11, z: 30 },
    cruiseSpeed: 34,
    dashSpeed: 48,
    accel: 16,
    turnRate: HELI_TYPES.hind.turnRate * 0.55,
    climbRate: 14,
    standoff: 850,
    orbitRate: 0.07,
    hoverBand: [65, 125],
    clearance: 32,
    attackRange: 0,
    aimThreshold: 1.1,
    rotorSpin: 19,
    aa: {
      range: 0,
      cooldownMin: 9999,
      cooldownSpread: 0,
      damage: 0,
      maxHitChance: 0,
      tracers: 1
    },
    smokeHeight: 3,
    explosionScale: 1.2
  });

  ctx.addHeliType("heavyAttackHeli", {
    ...HELI_TYPES.hind,
    key: "heavyAttackHeli",
    label: "HEAVY GUNSHIP",
    role: "Heavy Attack Helicopter",
    hp: 125,
    hitRadius: 14,
    hitBox: { x: 10, y: 10, z: 24 },
    cruiseSpeed: 50,
    dashSpeed: 76,
    accel: 30,
    turnRate: HELI_TYPES.hind.turnRate * 1.12,
    climbRate: 24,
    standoff: 680,
    orbitRate: 0.19,
    hoverBand: [60, 125],
    clearance: 30,
    attackRange: 1800,
    aimThreshold: 0.48,
    rotorSpin: 25,
    aaMounts: [7, 4],
    aaHeight: 0,
    aa: {
      range: 1050,
      cooldownMin: 1.05,
      cooldownSpread: 0.8,
      damage: 8,
      maxHitChance: 0.16,
      tracers: 3
    },
    smokeHeight: 2.8,
    explosionScale: 1.05,
    radarColor: "#ff7048"
  });
  ctx.addEnemyMissileProfile("heavyAttackHeli", {
    ...hindMissile,
    cooldownMin: hindMissile.cooldownMin * 0.75,
    cooldownSpread: hindMissile.cooldownSpread * 0.8,
    range: hindMissile.range * 1.2,
    maxSpeed: hindMissile.maxSpeed * 1.08,
    turnRate: hindMissile.turnRate * 1.08
  });

  // Re-register one existing mission through the normal addMission path so all
  // derived fields (waves, totalTargets, totalContacts and waveCount) are
  // recalculated. The old object is removed only for the duration of this call.
  function extendMission(key, makeReplacement) {
    const at = MISSIONS.findIndex((mission) => mission.key === key);
    if (at <= 0) throw new Error(`[enemy-variety-1] mission ${key} not found at a replaceable index`);
    const original = MISSIONS[at];
    const after = MISSIONS[at - 1].key;
    const replacement = makeReplacement(original);

    MISSIONS.splice(at, 1);
    try {
      return ctx.addMission(replacement, { after });
    } catch (error) {
      MISSIONS.splice(at, 0, original);
      throw error;
    }
  }

  // GLACIER SHIELD: reuse the four terrain-proven ridge positions from the
  // mirror mission's staggered canyon ladder.
  extendMission("r06", (mission) => ({
    ...mission,
    groundUnits: [
      ...(mission.groundUnits || []),
      { id: 41, type: "samSite", x: -298, z: -800, heading: -1.57 },
      { id: 42, type: "radarSite", x: 299, z: -1400, heading: 1.57 },
      { id: 43, type: "samSite", x: -287, z: -2000, heading: -1.57 },
      { id: 44, type: "commandPost", x: 295, z: -2600, heading: 1.57 }
    ]
  }));

  // SCRAMBLE: a compact hostile force spread around the measured night-base
  // plateau centre (900, -1200), clear of the exact centre point.
  extendMission("r08", (mission) => ({
    ...mission,
    groundUnits: [
      ...(mission.groundUnits || []),
      { id: 41, type: "tank", x: 700, z: -1050, heading: 2.45 },
      { id: 42, type: "tank", x: 900, z: -930, heading: 3.08 },
      { id: 43, type: "tank", x: 1100, z: -1050, heading: -2.45 },
      { id: 44, type: "adTank", x: 900, z: -1400, heading: 0.05 },
      { id: 45, type: "ciws", x: 720, z: -1370, heading: 0.62 },
      { id: 46, type: "ciws", x: 1080, z: -1370, heading: -0.62 }
    ]
  }));

  // IRON UMBRELLA: insert the gunships as the second designated wave, after
  // the first strike wave's concurrent escort and before the existing F-14 wave.
  extendMission("r09", (mission) => {
    const sequence = [...mission.sequence];
    const secondDesignatedAt = sequence.findIndex(
      (wave, index) => index > 0 && wave.tgt !== false && !wave.concurrent
    );
    if (secondDesignatedAt < 0) {
      throw new Error("[enemy-variety-1] r09 has no second designated-wave insertion point");
    }
    sequence.splice(secondDesignatedAt, 0, {
      types: ["heavyAttackHeli", "heavyAttackHeli", "heavyAttackHeli"],
      band: 1,
      label: "GUNSHIP"
    });
    return { ...mission, sequence };
  });

  // SAND WALL: positions are taken from the proven desert airbase corridor;
  // the batteries form an ingress belt and the depots sit beside the flight line.
  extendMission("r11", (mission) => ({
    ...mission,
    groundUnits: [
      ...(mission.groundUnits || []),
      { id: 41, type: "mobileSam", x: -1180, z: -640, heading: 2.72 },
      { id: 42, type: "mobileSam", x: -40, z: -380, heading: 3.1 },
      { id: 43, type: "mobileSam", x: 1150, z: -700, heading: -2.66 },
      { id: 44, type: "ammoDepot", x: -300, z: -2420, heading: 0.06 },
      { id: 45, type: "ammoDepot", x: 260, z: -2450, heading: -0.06 },
      { id: 46, type: "aaGun", x: -1140, z: -1900, heading: 1.6 },
      { id: 47, type: "aaGun", x: 1100, z: -2140, heading: -1.5 }
    ]
  }));
}
