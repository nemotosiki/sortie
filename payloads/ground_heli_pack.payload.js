// Ground / helicopter threat pack: three rotorcraft and six ground classes.
//
// Registration only. No mission, aircraft, world, HP-scaling or renderer code is
// changed here. Every class inherits an existing complete schema, so the current
// fallback models are reused and this payload adds no geometry or texture branch.
//
// Range layers filled by this batch:
//   helicopter guns: 650 / 720 / 820 m (the previous gap between 420 and 900)
//   ground gun:       760 m             (the previous ground ceiling was 620)
//   long-range SAM:  1900 m             (between AEGIS 1700 and MiG-31 2100)
export default function register(ctx) {
  const {
    GROUND_TYPES,
    HELI_TYPES,
    ENEMY_MISSILE_PROFILES
  } = ctx.tables;

  const heavyHeli = HELI_TYPES.heavyAttackHeli || HELI_TYPES.hind;
  const transportHeli = HELI_TYPES.transportHeli || HELI_TYPES.hind;
  const hindMissile = ENEMY_MISSILE_PROFILES.hind;
  const heavyMissile = ENEMY_MISSILE_PROFILES.heavyAttackHeli || hindMissile;
  const samMissile = ENEMY_MISSILE_PROFILES.samSite;

  if (!heavyHeli || !transportHeli || !hindMissile || !heavyMissile || !samMissile) {
    throw new Error("[ground-heli-pack] expected existing helicopter and SAM templates");
  }

  // -------------------------------------------------------------------------
  // Helicopters
  // -------------------------------------------------------------------------

  // Russian attack helicopter. Agile, low-profile and happiest circling close
  // enough that its 720 m cannon layer overlaps neither the scout's 420 m nor
  // the Hind's 900 m. The missile remains below the western gunship's long arm.
  ctx.addHeliType("ka52", {
    ...heavyHeli,
    key: "ka52",
    label: "KA-52 ALLIGATOR",
    role: "Russian Attack Helicopter",
    hp: 98,
    hitRadius: 11,
    hitBox: { x: 8.5, y: 8, z: 19 },
    cruiseSpeed: 58,
    dashSpeed: 88,
    accel: 36,
    turnRate: HELI_TYPES.hind.turnRate * 1.28,
    climbRate: 30,
    standoff: 760,
    orbitRate: 0.25,
    hoverBand: [58, 122],
    clearance: 27,
    attackRange: 1720,
    aimThreshold: 0.5,
    rotorSpin: 29,
    aaMounts: [5.8, 3.2],
    aaHeight: 0,
    aa: {
      range: 720,
      cooldownMin: 0.82,
      cooldownSpread: 0.62,
      damage: 7,
      maxHitChance: 0.13,
      tracers: 2
    },
    smokeHeight: 2.2,
    explosionScale: 0.9,
    radarColor: "#ff7d50",
    tracerColor: 0xff9b62,
    explosionColor: 0xff9a58
  });
  ctx.addEnemyMissileProfile("ka52", {
    ...hindMissile,
    cooldownMin: 11.8,
    cooldownSpread: 5.0,
    range: 1680,
    minRange: 250,
    speed: 220,
    maxSpeed: 370,
    turnRate: hindMissile.turnRate * 1.12,
    damage: 98,
    life: 7.5,
    launchDot: 0.52
  });

  // Western attack helicopter for the Russian campaign. It stands farther off
  // than every existing gunship: the 820 m cannon fills the top of the missing
  // medium band and the 2050 m missile sits just below the MiG-31's 2100 m edge.
  ctx.addHeliType("ah64", {
    ...heavyHeli,
    key: "ah64",
    label: "AH-64 APACHE",
    role: "Western Attack Helicopter",
    hp: 98,
    hitRadius: 11,
    hitBox: { x: 8, y: 8, z: 18 },
    cruiseSpeed: 55,
    dashSpeed: 82,
    accel: 32,
    turnRate: HELI_TYPES.hind.turnRate * 1.18,
    climbRate: 27,
    standoff: 920,
    orbitRate: 0.2,
    hoverBand: [62, 132],
    clearance: 28,
    attackRange: 2200,
    aimThreshold: 0.54,
    rotorSpin: 27,
    aaMounts: [5.4],
    aaHeight: 0,
    aa: {
      range: 820,
      cooldownMin: 0.94,
      cooldownSpread: 0.7,
      damage: 8,
      maxHitChance: 0.14,
      tracers: 2
    },
    smokeHeight: 2.1,
    explosionScale: 0.88,
    radarColor: "#ff8b55",
    tracerColor: 0xffb06a,
    explosionColor: 0xffa15e
  });
  ctx.addEnemyMissileProfile("ah64", {
    ...heavyMissile,
    cooldownMin: 12.8,
    cooldownSpread: 5.2,
    range: 2050,
    minRange: 300,
    speed: 235,
    maxSpeed: 405,
    turnRate: hindMissile.turnRate * 1.06,
    damage: 98,
    life: 9.2,
    launchDot: 0.58
  });

  // Armed transport. It carries two missiles' worth of hull but only a door-gun
  // fit; its purpose is to remain a worthwhile transport target without becoming
  // a third attack-helicopter clone. 650 m occupies the lowest open medium band.
  ctx.addHeliType("armedTransportHeli", {
    ...transportHeli,
    key: "armedTransportHeli",
    label: "ARMED TRANSPORT",
    role: "Armed Transport Helicopter",
    hp: 196,
    hitRadius: 16,
    hitBox: { x: 12, y: 11, z: 30 },
    cruiseSpeed: 38,
    dashSpeed: 56,
    accel: 18,
    turnRate: HELI_TYPES.hind.turnRate * 0.62,
    climbRate: 17,
    standoff: 780,
    orbitRate: 0.1,
    hoverBand: [68, 132],
    clearance: 34,
    attackRange: 760,
    aimThreshold: 0.66,
    rotorSpin: 20,
    aaMounts: [7.2, -4.8],
    aaHeight: 0,
    aa: {
      range: 650,
      cooldownMin: 1.35,
      cooldownSpread: 1.0,
      damage: 5,
      maxHitChance: 0.075,
      tracers: 2
    },
    smokeHeight: 3.2,
    explosionScale: 1.25,
    radarColor: "#ff9b61",
    tracerColor: 0xffb978,
    explosionColor: 0xffa35f
  });

  // -------------------------------------------------------------------------
  // Ground targets
  // -------------------------------------------------------------------------

  // The missing upper layer of land-based air defence. Its local gun is absent;
  // the threat is the 1900 m missile registered below, so entering its umbrella
  // feels different from another 560-620 m tracer battery.
  ctx.addGroundType("longRangeSam", {
    ...GROUND_TYPES.samSite,
    key: "longRangeSam",
    label: "LONG RANGE SAM",
    role: "Long-Range Surface-to-Air Missile Battery",
    hp: 98,
    hitRadius: 28,
    hitBox: { x: 18, y: 12, z: 20 },
    aa: null,
    dishSpin: 0.55,
    smokeHeight: 7,
    radarColor: "#ff684d",
    tracerColor: 0xff9b62,
    explosionColor: 0xff8c4a
  });
  ctx.addEnemyMissileProfile("longRangeSam", {
    ...samMissile,
    cooldownMin: 12.8,
    cooldownSpread: 5.2,
    range: 1900,
    minRange: 320,
    speed: 180,
    maxSpeed: 560,
    turnRate: samMissile.turnRate * 0.9,
    damage: 98,
    life: 11.5,
    launchDot: -1
  });

  // Sensor-only node. Destroying it can later be used as a mission choice, but
  // this registration adds no radar mechanic and claims none: it is an inert,
  // high-value early-warning installation using the existing radar silhouette.
  ctx.addGroundType("earlyWarningRadar", {
    ...GROUND_TYPES.radarSite,
    key: "earlyWarningRadar",
    label: "EWR RADAR",
    role: "Early Warning Radar",
    hp: 70,
    hitRadius: 25,
    hitBox: { x: 14, y: 15, z: 14 },
    aa: null,
    dishSpin: 1.35,
    smokeHeight: 6,
    radarColor: "#ffb06a",
    tracerColor: 0xffb06a,
    explosionColor: 0xffa361
  });

  // Mobile gun layer above the existing train flak's 620 m ceiling. It trades
  // CIWS accuracy for reach and movement, creating a genuine 700+ m tracer zone.
  ctx.addGroundType("spaag", {
    ...GROUND_TYPES.adTank,
    key: "spaag",
    label: "SPAAG",
    role: "Self-Propelled Anti-Aircraft Gun",
    hp: 90,
    hitRadius: 20,
    hitBox: { x: 9, y: 7, z: 13 },
    aaMounts: [-2.8, 2.8],
    aaHeight: 4.7,
    aa: {
      range: 760,
      cooldownMin: 0.48,
      cooldownSpread: 0.38,
      damage: 6,
      maxHitChance: 0.12,
      tracers: 3
    },
    mobile: {
      speed: 14,
      turnRate: GROUND_TYPES.adTank.mobile.turnRate
    },
    dishSpin: 1.1,
    radarColor: "#ff7350",
    tracerColor: 0xffa05d,
    explosionColor: 0xff9554
  });

  // Soft convoy body. One missile is deliberately overkill; guns and bombs are
  // the economical answer. It inherits the proven moving-vehicle contract.
  ctx.addGroundType("convoyTruck", {
    ...GROUND_TYPES.tank,
    key: "convoyTruck",
    label: "CARGO TRUCK",
    role: "Convoy Cargo Truck",
    hp: 54,
    hitRadius: 14,
    hitBox: { x: 7, y: 6, z: 16 },
    aa: null,
    mobile: {
      speed: 19,
      turnRate: GROUND_TYPES.tank.mobile.turnRate
    },
    smokeHeight: 4.5,
    radarColor: "#ffc27a",
    tracerColor: 0xffb06a,
    explosionColor: 0xff9b55
  });

  // Rocket artillery is dangerous because of what a mission says it is about,
  // not because this batch invents a bombardment mechanic. It is registered as
  // a mobile, non-AA target and waits for a later authored mission placement.
  ctx.addGroundType("mlrs", {
    ...GROUND_TYPES.tank,
    key: "mlrs",
    label: "MLRS",
    role: "Multiple Launch Rocket System",
    hp: 98,
    hitRadius: 19,
    hitBox: { x: 9, y: 8, z: 15 },
    aa: null,
    mobile: {
      speed: 12,
      turnRate: GROUND_TYPES.tank.mobile.turnRate * 0.9
    },
    smokeHeight: 5.5,
    radarColor: "#ffac66",
    tracerColor: 0xffac66,
    explosionColor: 0xff8744
  });

  // A moving command node, distinct from the fixed bunker-derived command post.
  // No aura, buff or scripting is added; it is simply a mobile high-value target.
  ctx.addGroundType("mobileCommand", {
    ...GROUND_TYPES.commandPost,
    key: "mobileCommand",
    label: "MOBILE COMMAND",
    role: "Mobile Command Vehicle",
    hp: 100,
    hitRadius: 20,
    hitBox: { x: 9, y: 8, z: 17 },
    aa: null,
    mobile: {
      speed: 11,
      turnRate: GROUND_TYPES.tank.mobile.turnRate * 0.82
    },
    dishSpin: 0.72,
    smokeHeight: 5.5,
    radarColor: "#ff9d60",
    tracerColor: 0xff9d60,
    explosionColor: 0xff9856
  });
}
