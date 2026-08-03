// Campaign fighter completion and top-tier balance pass.
//
// Load after `aircraft_f3.payload.js`. Every campaign fighter planned for the
// reboot is already registered by main except the F-3 supplied by that payload;
// this file therefore does not duplicate airframes. It does three narrowly
// scoped jobs:
//   1. assert that the complete fighter/strike roster is present;
//   2. differentiate F-22 / Su-57 / F-3 without letting a lower-tier aircraft
//      beat any of them in overall five-axis combat value;
//   3. finish the existing SR-71 placeholder as an unarmed MiG-31-class target,
//      while preserving the MiG-31 as the fastest aircraft in the game.
//
// Nothing is added to AIRCRAFT_ORDER and no mission is touched.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;

  const REQUIRED_FIGHTER_ROSTER = Object.freeze([
    // Sera / US-family campaign roster.
    "f16", "f4", "f2a", "fa18", "a10", "f14", "f15", "f111f", "f35c", "f22",
    // Elem / Russian-family campaign roster.
    "mig21", "mig23", "su25", "mig29", "su33", "mig31", "su35", "su37", "su47", "su57",
    // ARCA and special combat-aircraft pool.
    "gripen", "rafale", "typhoon", "f3", "yf23", "mig25", "ea18g", "su24m", "su34", "s70",
    // High-altitude reconnaissance target requested for the Elem campaign.
    "sr71"
  ]);

  const missing = REQUIRED_FIGHTER_ROSTER.filter((id) => !AIRCRAFT_TYPES[id]);
  if (missing.length) {
    throw new Error(
      `[fighter-balance] missing planned aircraft: ${missing.join(", ")}. ` +
      "Load aircraft_f3.payload.js before this payload and use a current main base."
    );
  }

  const requiredProfiles = ["f22", "su57", "f3", "sr71", "mig31"];
  for (const id of requiredProfiles) {
    if (!ENEMY_AI_PROFILES[id]) {
      throw new Error(`[fighter-balance] missing ENEMY_AI_PROFILES.${id}`);
    }
  }
  if (Object.isFrozen(AIRCRAFT_TYPES) || Object.isFrozen(ENEMY_AI_PROFILES)) {
    throw new Error("[fighter-balance] registries were finalized before payload execution");
  }

  function replaceAircraft(id, patch, { preserveSpw = true } = {}) {
    const current = AIRCRAFT_TYPES[id];
    const next = { ...current, ...patch };
    // Model identity and paint always remain owned by the original airframe.
    next.theme = current.theme;
    if (preserveSpw && current.spw) next.spw = current.spw;
    AIRCRAFT_TYPES[id] = Object.freeze(next);
    return AIRCRAFT_TYPES[id];
  }

  function replaceProfile(id, patch) {
    const current = ENEMY_AI_PROFILES[id];
    const next = { ...current, ...patch };
    next.theme = current.theme;
    ENEMY_AI_PROFILES[id] = Object.freeze(next);
    return ENEMY_AI_PROFILES[id];
  }

  // -----------------------------------------------------------------------
  // F-22: STABILITY S / SPEED A / MSL S / DURABILITY A / MOBILITY A.
  // The long-sortie aircraft: the most stable firing platform, the deepest
  // standard-missile magazine and no weak axis. Mobility stays clearly above
  // F-15/F-35C/Su-35/Su-37, but Su-57 still owns the S mobility grade.
  // -----------------------------------------------------------------------
  const f22 = replaceAircraft("f22", {
    blurb: "最高の安定性と最大の通常ミサイル搭載数を持つ制空戦闘機。速度・耐久・機動性も上位で、長い作戦を最後まで崩れず戦い切る。",
    cruiseSpeed: 240,
    boostSpeed: 470,
    brakeSpeed: 122,
    boostResponse: 0.68,
    brakeResponse: 0.44,
    cruiseResponse: 0.52,
    pitchRateDeg: 55,
    rollRateDeg: 195,
    yawRateDeg: 16,
    maxBankAngleDeg: 68,
    normalRollSpring: 56,
    rollRateLimitDeg: 190,
    turnRateDeg: 42,
    rollDamping: 14.5,
    stallWarnSpeed: 78,
    stallEntrySpeed: 66,
    stallAuthorityLoss: 0.34,
    structuralG: 3.65,
    missileCapacity: 34,
    maxHealth: 210
  });

  // -----------------------------------------------------------------------
  // Su-57: STABILITY B / SPEED B / MSL B / DURABILITY A / MOBILITY S.
  // It wins the merge, not the spreadsheet: much sharper pitch/yaw/turn than
  // every lower-tier Flanker, but fewer rounds and less settled aim than F-22.
  // -----------------------------------------------------------------------
  const su57 = replaceAircraft("su57", {
    blurb: "機動性を最優先した第5世代制空戦闘機。瞬間旋回、低速機首振り、ヨー性能は全戦闘機中最高だが、安定性・速度・搭載数には明確な弱点を持つ。",
    cruiseSpeed: 232,
    boostSpeed: 448,
    brakeSpeed: 120,
    boostResponse: 0.70,
    brakeResponse: 0.40,
    cruiseResponse: 0.54,
    pitchRateDeg: 63,
    rollRateDeg: 220,
    yawRateDeg: 20,
    maxBankAngleDeg: 72,
    normalRollSpring: 45,
    rollRateLimitDeg: 210,
    turnRateDeg: 51,
    rollDamping: 9.8,
    stallWarnSpeed: 74,
    stallEntrySpeed: 62,
    stallAuthorityLoss: 0.50,
    structuralG: 3.75,
    missileCapacity: 26,
    maxHealth: 205
  });

  // -----------------------------------------------------------------------
  // F-3: STABILITY A / SPEED S / MSL A / DURABILITY B / MOBILITY B.
  // Fastest of the three top-tier fighters, but still below MiG-31 and SR-71.
  // The lower mobility/health are real costs, not cosmetic grade labels.
  // -----------------------------------------------------------------------
  const f3 = replaceAircraft("f3", {
    blurb: "アルカ加盟三国の次世代試作機。最上位戦闘機の中で最高の速度を持ち、安定性と搭載力も高い。耐久と旋回性能を捨て、交戦位置そのものを速度で選ぶ。",
    cruiseSpeed: 248,
    boostSpeed: 500,
    brakeSpeed: 126,
    boostResponse: 0.72,
    brakeResponse: 0.48,
    cruiseResponse: 0.54,
    pitchRateDeg: 50,
    rollRateDeg: 175,
    yawRateDeg: 14,
    maxBankAngleDeg: 62,
    normalRollSpring: 52,
    rollRateLimitDeg: 168,
    turnRateDeg: 36,
    rollDamping: 13.5,
    stallWarnSpeed: 84,
    stallEntrySpeed: 72,
    stallAuthorityLoss: 0.40,
    structuralG: 3.30,
    missileCapacity: 30,
    maxHealth: 180
  });

  // -----------------------------------------------------------------------
  // SR-71: finished reconnaissance profile.
  // It is 99% of the MiG-31's maximum speed, so the two are genuinely close,
  // but MiG-31 remains faster by construction. Unlike the placeholder, the
  // Blackbird carries no usable gun, standard missile or special-weapon ammo.
  // -----------------------------------------------------------------------
  const mig31 = AIRCRAFT_TYPES.mig31;
  const sr71Current = AIRCRAFT_TYPES.sr71;
  const sr71Spw = sr71Current.spw
    ? Object.freeze({ ...sr71Current.spw, capacity: 0 })
    : sr71Current.spw;
  const sr71 = replaceAircraft("sr71", {
    blurb: "MiG-31に匹敵する速度で高高度を横断する戦略偵察機。武装も格闘性能もなく、進路を先読みした迎撃以外では捕捉できない。",
    cruiseSpeed: Math.max(1, Math.round(mig31.cruiseSpeed * 0.99)),
    boostSpeed: Math.max(1, Math.min(mig31.boostSpeed - 2, Math.round(mig31.boostSpeed * 0.99))),
    brakeSpeed: mig31.brakeSpeed,
    boostResponse: Math.max(mig31.boostResponse, 0.74),
    brakeResponse: mig31.brakeResponse,
    cruiseResponse: mig31.cruiseResponse,
    pitchRateDeg: Math.min(18, Math.round(mig31.pitchRateDeg * 0.68)),
    rollRateDeg: Math.min(62, Math.round(mig31.rollRateDeg * 0.62)),
    yawRateDeg: Math.min(5, Math.round(mig31.yawRateDeg * 0.70)),
    maxBankAngleDeg: Math.min(26, Math.round(mig31.maxBankAngleDeg * 0.72)),
    normalRollSpring: Math.min(20, Math.round(mig31.normalRollSpring * 0.72)),
    rollRateLimitDeg: Math.min(58, Math.round(mig31.rollRateLimitDeg * 0.62)),
    turnRateDeg: Math.min(9, Math.round(mig31.turnRateDeg * 0.50)),
    rollDamping: Math.min(7.0, mig31.rollDamping),
    stallWarnSpeed: Math.max(mig31.stallWarnSpeed, 110),
    // Preserve the global brake invariant: full brake plus high-G input must
    // settle at or above stall entry. MiG-31's 150 brake speed leaves 98 here.
    stallEntrySpeed: Math.min(
      mig31.brakeSpeed - 52,
      Math.max(mig31.stallEntrySpeed, 96)
    ),
    stallAuthorityLoss: Math.max(mig31.stallAuthorityLoss, 0.88),
    structuralG: Math.min(mig31.structuralG, 2.2),
    gunDamage: 0,
    missileDamage: 98,
    missileCapacity: 0,
    maxHealth: 165,
    spw: sr71Spw
  }, { preserveSpw: false });

  const mig31AI = ENEMY_AI_PROFILES.mig31;
  replaceProfile("sr71", {
    behavior: ENEMY_AI_PROFILES.sr71.behavior,
    label: "SR-71",
    engageRange: 0,
    disengageRange: 99999,
    pursuitBack: 0,
    attackRange: 0,
    fireMin: 999,
    fireSpread: 0,
    hitChanceScale: 0,
    maxHitChance: 0,
    aimThreshold: 1,
    patrolSpeedScale: Math.max(0.96, Math.min(0.99, mig31AI.patrolSpeedScale || 0.99)),
    patrolPathScale: 0.60,
    verticalBias: Math.max(520, ENEMY_AI_PROFILES.sr71.verticalBias || 0),
    verticalAmplitude: 18,
    verticalFrequency: 0.12,
    evadeLateral: 18,
    evadeVertical: 8,
    evadeFrequency: 0.55,
    radarColor: "#c9a4ff"
  });

  // -----------------------------------------------------------------------
  // Contract gates. These fail at payload load time rather than allowing a
  // later aircraft addition or global tuning pass to silently invert the
  // hierarchy the campaign progression depends on.
  // -----------------------------------------------------------------------
  function mobility(spec) {
    return (
      0.35 * spec.turnRateDeg / 51 +
      0.30 * spec.pitchRateDeg / 63 +
      0.25 * spec.rollRateDeg / 220 +
      0.10 * spec.yawRateDeg / 20
    );
  }

  function stability(spec) {
    const lossQuality = Math.max(0, Math.min(1, (1 - spec.stallAuthorityLoss) / (1 - 0.34)));
    return (
      0.40 * Math.min(1, spec.normalRollSpring / 56) +
      0.35 * Math.min(1, spec.rollDamping / 14.5) +
      0.25 * lossQuality
    );
  }

  function overall(spec) {
    return (
      stability(spec) +
      Math.min(1, spec.boostSpeed / mig31.boostSpeed) +
      Math.min(1, spec.missileCapacity / f22.missileCapacity) +
      Math.min(1, spec.maxHealth / f22.maxHealth) +
      Math.min(1, mobility(spec))
    ) / 5;
  }

  const lowerTier = ["f15", "f35c", "su37", "su35"].map((id) => AIRCRAFT_TYPES[id]);
  const lowerCeiling = Math.max(...lowerTier.map(overall));
  for (const spec of [f22, su57, f3]) {
    if (!(overall(spec) > lowerCeiling + 0.01)) {
      throw new Error(
        `[fighter-balance] ${spec.id} overall ${overall(spec).toFixed(4)} ` +
        `does not clear lower-tier ceiling ${lowerCeiling.toFixed(4)}`
      );
    }
  }

  if (!(mig31.boostSpeed > sr71.boostSpeed && sr71.boostSpeed > f3.boostSpeed &&
        f3.boostSpeed > f22.boostSpeed && f22.boostSpeed > su57.boostSpeed)) {
    throw new Error("[fighter-balance] speed order must be MiG-31 > SR-71 > F-3 > F-22 > Su-57");
  }
  if (!(stability(f22) > stability(f3) && stability(f3) > stability(su57))) {
    throw new Error("[fighter-balance] stability order must be F-22 > F-3 > Su-57");
  }
  if (!(f22.missileCapacity > f3.missileCapacity && f3.missileCapacity > su57.missileCapacity)) {
    throw new Error("[fighter-balance] missile-capacity order must be F-22 > F-3 > Su-57");
  }
  if (!(f22.maxHealth >= su57.maxHealth && su57.maxHealth > f3.maxHealth)) {
    throw new Error("[fighter-balance] durability order must be F-22 >= Su-57 > F-3");
  }
  if (!(mobility(su57) > mobility(f22) && mobility(f22) > mobility(f3))) {
    throw new Error("[fighter-balance] mobility order must be Su-57 > F-22 > F-3");
  }
  for (const spec of [f22, su57, f3, sr71]) {
    if (spec.brakeSpeed - 52 < spec.stallEntrySpeed) {
      throw new Error(`[fighter-balance] ${spec.id} violates brake/stall invariant`);
    }
  }
}
