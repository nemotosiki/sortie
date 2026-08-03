// F-3 - ARCA next-generation air-superiority demonstrator.
//
// Story role: the top aircraft of the nominally neutral ARCA security force.
// In hostile missions it is an ordinary shootable/lockable enemy with `tgt:
// false`: it attacks the player but is never a mandatory mission objective.
// Sera's early campaign may instead spawn the same airframe through the allied
// support path. The airframe itself remains hangar-excluded (`order: false`).
//
// The real-world inspiration is the Japanese/British/Italian GCAP programme,
// whose final production shape and performance are not fixed. This therefore
// does not claim to reproduce an official completed aircraft. It authors an
// original blended twin-engine stealth fighter around the public design ideas:
// a broad cranked wing, chined forebody, buried engines and canted twin tails.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES, ENEMY_MISSILE_PROFILES } = ctx.tables;
  const raptor = AIRCRAFT_TYPES.f22;
  const raptorAI = ENEMY_AI_PROFILES.f22;
  const raptorMissile = ENEMY_MISSILE_PROFILES.f22;
  if (!raptor || !raptorAI || !raptorMissile) {
    throw new Error("[f3] expected the f22 aircraft, AI and missile templates to exist");
  }

  const theme = {
    // ARCA uses a pale low-visibility blue-grey rather than either campaign's
    // dark Sera stealth paint or Elem warm-grey scheme. The white-violet
    // exhaust is the quickest faction read from directly astern.
    primary: 0x71808d,
    secondary: 0x3d4650,
    accent: 0xbfd2df,
    canopy: 0x8fd7e8,
    exhaust: 0xc6d8ff,
    scale: 1.03,
    variant: "f3"
  };

  // v0.8 contract:
  //   stability A / speed S / missile capacity A / durability B / mobility B.
  // The F-22 remains the stability-and-magazine leader; the Su-57 remains the
  // manoeuvrability leader. F-3 wins only the speed axis. Values are expressed
  // relative to the live F-22 so later global balance changes do not silently
  // turn this into a completely different tier.
  const maxHealth = Math.max(98, Math.round(raptor.maxHealth * 0.82));
  const missileCapacity = Math.max(12, Math.round(raptor.missileCapacity * 0.78));

  ctx.addAircraft("f3", {
    ...raptor,
    id: "f3",
    label: "F-3",
    role: "Next-Generation Air Superiority Fighter",
    tag: "ARCA",
    enemyOnly: true,
    blurb: "アルカ加盟三国が共同研究した次世代試作機。最高速度を最優先した大型ステルス戦闘機で、交差後に一気に距離を取り、別角度から戦域へ戻る。中立執行を名目に両陣営の作戦へ割り込む。",

    // SPEED S: highest top-end of the three top-tier fighters, but acceleration
    // is not allowed to exceed the Raptor's stability/energy-management niche.
    cruiseSpeed: Math.round(raptor.cruiseSpeed * 1.07),
    boostSpeed: Math.round(raptor.boostSpeed * 1.10),
    brakeSpeed: Math.round(raptor.brakeSpeed * 1.04),
    boostResponse: raptor.boostResponse * 0.96,
    cruiseResponse: raptor.cruiseResponse * 0.98,
    brakeResponse: raptor.brakeResponse * 0.96,

    // MOBILITY B: still a top-tier fighter, but clearly below the F-22 and far
    // below the Su-57 in a sustained turning contest.
    pitchRateDeg: raptor.pitchRateDeg * 0.86,
    rollRateDeg: raptor.rollRateDeg * 0.84,
    yawRateDeg: raptor.yawRateDeg * 0.86,
    turnRateDeg: raptor.turnRateDeg * 0.83,
    maxBankAngleDeg: raptor.maxBankAngleDeg * 0.95,
    rollRateLimitDeg: raptor.rollRateLimitDeg * 0.86,

    // STABILITY A: close to the F-22, but not equal to its S grade.
    normalRollSpring: raptor.normalRollSpring * 0.93,
    rollDamping: raptor.rollDamping * 0.92,
    structuralG: raptor.structuralG * 0.92,

    // DURABILITY B / MISSILE CAPACITY A.
    maxHealth,
    missileCapacity,

    // Model-space geometric wingtip; the cranked wing below reaches x +/-8.6
    // and its outer panel is centred around z 3.0.
    tipSpan: 8.6,
    tipZ: 3.0,
    theme
  }, { order: false });

  // Hostile ARCA aircraft use ordinary fighter combat AI. Mission definitions
  // decide allegiance: Sera's early campaign uses the allied support spawner;
  // Sera's middle/late campaign and all of Erem use the hostile spawner with
  // `tgt: false`. The absence of TGT affects objectives, not lock-on or combat.
  ctx.addEnemyProfile("f3", {
    ...raptorAI,
    label: "ARCA F-3",
    hitboxScale: 1.12,
    patrolSpeedScale: Math.max(1.08, raptorAI.patrolSpeedScale || 1),
    patrolPathScale: 0.72,
    verticalBias: 150,
    verticalAmplitude: 54,
    verticalFrequency: 0.24,
    explosionScale: 1.12,
    radarColor: "#ff715e",
    tracerColor: 0xff9a72,
    explosionColor: 0xff9270,
    theme
  });

  // F-3 must be able to fight like every other hostile ARCA aircraft. Reuse the
  // live F-22 launcher contract for now; airframe differentiation remains in
  // the F-3's lower mobility/durability and higher speed. Mission-level `tgt:
  // false` keeps it optional even while it launches missiles and uses its gun.
  ctx.addEnemyMissileProfile("f3", { ...raptorMissile });

  ctx.addAircraftModel("f3", {
    // Top view in the shared 40x44 HUD box. The broad cranked wing and long
    // centrebody make a wider, cleaner arrow than the F-22; the twin tail roots
    // remain visible as two aft shoulders rather than one central fin.
    silhouette:
      "M20 1 L21.5 5.5 L22.2 11.5 L23.8 15.5 " +
      "L29.5 19.4 L39 27.4 L38.2 30.8 L29.2 29.2 L27.2 33.7 " +
      "L29.2 39.5 L25.8 42.5 L22.8 39.4 L20 43 L17.2 39.4 " +
      "L14.2 42.5 L10.8 39.5 L12.8 33.7 L10.8 29.2 L1.8 30.8 " +
      "L1 27.4 L10.5 19.4 L16.2 15.5 L17.8 11.5 L18.5 5.5 Z",

    build(env) {
      const {
        geometry, extrudedSurface, verticalSurface,
        primary, secondary, accent, canopy, dark, navL, navR,
        add, addFlame
      } = env;

      // Main cranked wing. A long inboard leading edge breaks into a broad
      // outer panel; the aft edge kinks forward around the engine shoulders.
      // It is deliberately wider than the F-22's clipped diamond and carries
      // enough area to read as a GCAP-inspired heavy fighter rather than a
      // scaled Raptor.
      const wingF3 = extrudedSurface([
        [0, -5.0], [2.0, -4.0], [5.0, -1.4], [8.6, 2.3], [8.6, 3.6],
        [4.8, 3.2], [3.0, 5.0], [0, 4.5], [-3.0, 5.0], [-4.8, 3.2],
        [-8.6, 3.6], [-8.6, 2.3], [-5.0, -1.4], [-2.0, -4.0]
      ], 0.34);

      // Compact all-moving tailplanes, separated from the wing's trailing edge
      // so the silhouette remains recognisably a tailed fighter from the side.
      const tailF3 = extrudedSurface([
        [0, -1.8], [4.0, 0.7], [4.0, 1.8], [1.0, 2.1],
        [0, 1.7], [-1.0, 2.1], [-4.0, 1.8], [-4.0, 0.7]
      ], 0.22);

      // One outward-canted fin. The broad root and clipped tip match the heavy
      // wing without copying the F-22's smaller diamond fins.
      const finF3 = verticalSurface([
        [-2.2, 0], [2.0, 0], [1.0, 3.9], [-0.8, 3.9]
      ], 0.2);

      // Wing first: the upper body blends into it instead of covering the
      // cranked leading edge that identifies the aircraft from above.
      add(wingF3, secondary, 0, 0.0, 0.7);

      // Broad, shallow centrebody and chined forebody.
      add(geometry.fuselage, primary, 0, 0.12, -1.8, 1.28, 0.58, 1.08);
      const forebodyF3 = extrudedSurface([
        [0, -5.0], [0.72, -2.0], [1.18, 2.5], [0, 3.4],
        [-1.18, 2.5], [-0.72, -2.0]
      ], 0.38);
      add(forebodyF3, primary, 0, 0.08, -6.9);
      add(geometry.nose, primary, 0, 0.08, -9.2, 0.62, 0.4, 1.0);
      add(geometry.canopy, canopy, 0, 0.64, -5.2, 0.62, 0.42, 1.55);

      // Wide aft deck over two buried engines. The centre channel is kept dark
      // to split the nacelles in top view and prevent a single-engine read.
      add(geometry.panel, primary, 0, 0.18, 4.1, 6.4, 0.5, 5.6);
      add(geometry.panel, dark, 0, 0.43, 4.6, 0.48, 0.16, 5.4);

      for (const side of [-1, 1]) {
        // Shoulder intake and buried engine body.
        add(geometry.intake, accent, side * 1.65, -0.35, -2.2, 0.96, 0.68, 1.55, -side * 0.12);
        add(geometry.rearBody, secondary, side * 1.65, -0.28, 4.1, 1.0, 0.62, 1.55);
        // Faceted nozzle and a long, narrow high-speed plume.
        add(geometry.nozzle, accent, side * 1.65, -0.15, 7.3, 1.0, 0.82, 0.95);
        addFlame(side * 1.65, -0.15, 8.55, 0.92, 0.62);
        // Intake splitter and upper engine shoulder.
        add(geometry.panel, dark, side * 2.22, -0.32, -3.3, 0.1, 0.7, 1.55, side * 0.12);
        add(geometry.panel, accent, side * 1.65, 0.46, 5.4, 1.35, 0.12, 3.0);
      }

      add(tailF3, primary, 0, 0.04, 6.0);

      // Canted twin fins. Rooted outside the engine shoulders and rolled
      // outward; no centre fin.
      add(finF3, primary, -2.75, 0.15, 5.7, 1, 1, 1, 0.42);
      add(finF3, primary, 2.75, 0.15, 5.7, 1, 1, 1, -0.42);

      // Sensor and bay details: three-country demonstrator markings are kept as
      // pale geometric panels rather than national flags.
      add(geometry.panel, dark, -1.03, 0.05, -6.4, 0.24, 0.07, 4.6, 0.06);
      add(geometry.panel, dark, 1.03, 0.05, -6.4, 0.24, 0.07, 4.6, -0.06);
      add(geometry.panel, dark, 0, -0.38, 0.4, 1.6, 0.1, 4.6);
      add(geometry.panel, accent, -3.7, 0.16, 1.8, 0.42, 0.08, 3.4, 0.06);
      add(geometry.panel, accent, 3.7, 0.16, 1.8, 0.42, 0.08, 3.4, -0.06);

      // Navigation lights at the actual outer-panel tips.
      add(geometry.canopy, navL, -8.48, 0.02, 3.0, 0.12, 0.12, 0.12);
      add(geometry.canopy, navR, 8.48, 0.02, 3.0, 0.12, 0.12, 0.12);
    }
  });
}
