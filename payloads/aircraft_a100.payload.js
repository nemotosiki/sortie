// A-100 PREMIER - Elem airborne early warning & control aircraft.
//
// One airframe, one AI profile, one 3D model, one silhouette. Nothing else:
// no missions, no waves, no CAMPAIGNS edits, no hangar entry.
//
// The A-100 is the Il-76 airlifter airframe with a rotodome on it, which is
// exactly how the model is built: the same high-wing / four-podded-turbofan /
// T-tail skeleton the C-17 branch already establishes, plus the one feature
// nothing else in the game has - a 7.2-unit disc standing on two struts above
// the spine, aft of the wing. Against `transport` the reads are the dome (from
// every angle), the shorter fatter fuselage, and the glazed navigator nose
// under the flight deck.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;

  // The nearest existing template on both tables: an unarmed enemy-only heavy.
  // Spreading it is what guarantees the required-key schema is satisfied
  // without restating a contract this payload does not own.
  const transport = AIRCRAFT_TYPES.transport;
  const transportAI = ENEMY_AI_PROFILES.transport;
  if (!transport || !transportAI) {
    throw new Error("[a100] expected the transport aircraft and AI templates to exist");
  }

  // Elem (Russian) support-aircraft paint. The faction cue this game uses is
  // the exhaust colour - Western airframes burn blue-white, Elem airframes burn
  // warm - so the exhaust is taken from the Tu-95's family (0xffc47a) rather
  // than the C-17's cold grey. Primary/secondary sit on the same grey ladder
  // the other Elem heavies use; the accent is the maritime-patrol red the
  // faction's support machines already carry.
  const theme = {
    primary: 0x9aa3a8,
    secondary: 0x666f75,
    accent: 0xb0453d,
    canopy: 0xa8e4ff,
    exhaust: 0xffc47a,
    // Real A-100: 46.6 m long, 50.5 m span - within a metre of the Tu-95 on
    // both, so it carries the Tu-95's scale. tipSpan 13.0 x 2.3 = 29.9 visual
    // half-span, which lands between the Bear's 30.4 and the C-17's 29.6 and
    // holds the real ratio against the F-16's 7.2.
    scale: 2.3,
    variant: "a100"
  };

  // BALANCE TODO: placeholder. Every flight-model number below is inherited
  // from `transport` unchanged - this payload ships a SHAPE, not a balance
  // pass. maxHealth stays on the 98-point quantum (196 = exactly two missiles).
  ctx.addAircraft("a100", {
    ...transport,
    id: "a100",
    label: "A-100 PREMIER",
    role: "Airborne Early Warning & Control",
    tag: "ENEMY",
    enemyOnly: true,
    blurb: "敵の早期警戒管制機。背中の巨大な円盤レーダーで戦域を見渡し、僚機を誘導する。武装は無いが、これを落とせば敵の目が潰れる。",
    // Geometric wingtip of the model above: half-span 13.0, and the tip chord
    // runs z 3.2..4.8 with the wing mounted at -0.2, so 4.0 is its mid-chord.
    // Contrails then leave the real tip rather than floating inboard of it.
    tipSpan: 13.0,
    tipZ: 4.0,
    theme: { ...theme }
  }, { order: false });

  // BALANCE TODO: placeholder. The unarmed `transport` contract verbatim -
  // attackRange 0 is what states "this aircraft never shoots" - with only the
  // readability fields moved: a bigger hitbox for a wider airframe, a slightly
  // higher and flatter orbit than the airlifter (an AWACS holds a station), and
  // the Elem warm radar/tracer colours instead of the C-17's green.
  ctx.addEnemyProfile("a100", {
    ...transportAI,
    label: "AWACS",
    hitboxScale: 3.1,
    patrolSpeedScale: 0.96,
    patrolPathScale: 0.22,
    verticalBias: 30,
    verticalAmplitude: 4,
    verticalFrequency: 0.18,
    explosionScale: 1.75,
    radarColor: "#ffb45a",
    tracerColor: 0xffb45a,
    explosionColor: 0xffc063,
    theme: { ...theme }
  });
  // No addEnemyMissileProfile: the absence of an entry in that table IS the
  // "carries no missiles" statement, the same way it is for the transport.

  ctx.addAircraftModel("a100", {
    // Top view in the shared 40x44 box, nose up, traced from the model's own
    // z/x extents (nose tip -13.1, tail 12.6, half-span 13.0) so the outline
    // and the geometry are the same aircraft.
    //
    // Reading down the path: the blunt glazed nose, the parallel-sided freight
    // hull, the four engine nacelles stepping out ahead of the wing leading
    // edge, the big swept high wing out to x 2/38, and then the feature that
    // makes this outline unmistakable - the fuselage swelling into a fat
    // OCTAGONAL disc between the wing and the tail before pinching back in for
    // the T-tail's wide slab. A round waist aft of the wing is a read no other
    // outline in this game has, and it is the one the HUD has to sell, because
    // the strut gap that carries it does not exist in a top view.
    silhouette:
      "M20 1 L21.6 3.4 L22.4 7.5 L22.4 19 " +
      "L25.4 20.4 L25.4 15.5 L28.4 16.4 L28.4 21.4 " +
      "L31.2 21.8 L31.2 18.6 L34 19.6 L34 23 " +
      "L38 24.6 L38 27.4 L22.4 24.6 " +
      "L24.2 25.4 L25.6 26.8 L26.2 28.8 L26.2 33.4 L25.6 35.4 L24.2 36.8 " +
      "L22.4 37.6 L22.4 40.6 " +
      "L28.2 40.6 L28.2 43.4 L11.8 43.4 L11.8 40.6 L17.6 40.6 L17.6 37.6 " +
      "L15.8 36.8 L14.4 35.4 L13.8 33.4 L13.8 28.8 L14.4 26.8 L15.8 25.4 " +
      "L17.6 24.6 " +
      "L2 27.4 L2 24.6 L6 23 L6 19.6 L8.8 18.6 L8.8 21.8 " +
      "L11.6 21.4 L11.6 16.4 L14.6 15.5 L14.6 20.4 L17.6 19 " +
      "L17.6 7.5 L18.4 3.4 Z",
    build(env) {
      const { THREE, geometry, extrudedSurface, add, addFlame,
              primary, secondary, accent, canopy, dark, navL, navR } = env;

      // ---- Wing ---------------------------------------------------------
      // The Il-76 wing: a big swept high-mounted surface, drawn separately
      // rather than reusing wingTransport because the A-100 is a metre and a
      // half wider in half-span and rather deeper in root chord. Half-span
      // 13.0 matches the airframe's tipSpan exactly.
      const wingPremier = extrudedSurface([
        [0, -4.2], [1.9, -3.8], [13.0, 3.0], [13.0, 4.6], [3.4, 3.2],
        [0, 3.0], [-3.4, 3.2], [-13.0, 4.6], [-13.0, 3.0], [-1.9, -3.8]
      ], 0.32);
      // T-tail plane. Wider than the C-17's (half-span 5.9 against 5.4) and
      // swept to match the wing, so the tail reads as one design with it.
      const stabPremier = extrudedSurface([
        [0, -2.0], [5.9, 1.4], [5.9, 2.6], [1.7, 2.8],
        [-1.7, 2.8], [-5.9, 2.6], [-5.9, 1.4]
      ], 0.28);
      // The rotodome itself: an 18-sided disc, 3.6 in radius and 0.6 thick, so
      // it is a plate seen edge-on from the side and a full circle from above.
      // Built here rather than scaled from geometry.canopy because a sphere
      // squashed flat still bulges at the rim, and a radar disc must not.
      // 7.2 across against a 26.0 span is roughly the real A-100 proportion,
      // and 3.6 is the smallest radius that still reads as a radar disc rather
      // than as a blister at the range the player first sees this contact.
      const rotodome = new THREE.CylinderGeometry(3.6, 3.6, 0.6, 18, 1, false);
      // The rim ring, drawn as a slightly larger, much thinner disc so the dome
      // has a visible edge band rather than being one flat pancake.
      const rotodomeRim = new THREE.CylinderGeometry(3.72, 3.72, 0.24, 18, 1, false);

      // ---- Fuselage -----------------------------------------------------
      // Il-76: a fat, near-constant-section freight hull. Shorter and thicker
      // than the Bear's slim body sharing this scale.
      add(geometry.fuselage, primary, 0, 0, -1.6, 1.3, 1.28, 1.4);
      // Upswept aft body running back to the ramp, the airlifter tell the
      // transport branch already uses. Lifted and tapered. Run out to z 13.4
      // in two steps rather than one: the rotodome sits on the FIRST of them,
      // aft of the wing where the real aircraft carries it, and the second is
      // the ramp itself. A single section would have put the disc over the
      // wing, where it is half hidden from above by the surface it is meant to
      // stand clear of.
      add(geometry.fuselage, primary, 0, 0.4, 5.6, 1.2, 1.15, 0.62);
      add(geometry.fuselage, primary, 0, 1.25, 9.4, 0.92, 0.82, 0.55);
      // Rounded glazed nose. The Il-76 forebody is short and blunt, so the
      // cone is squat (z 1.0) rather than the Bear's long 1.6 taper.
      add(geometry.nose, primary, 0, 0.05, -11.1, 1.26, 1.22, 0.95);
      // Flight deck high on the spine, and the navigator's glazed nose blister
      // BELOW it - the Il-76 signature that no Western heavy here has. Two
      // canopy pieces stacked is what makes the nose read as glass rather than
      // as a radome, and the lower one runs right out to the tip so the nose
      // is glazed rather than merely windowed.
      add(geometry.canopy, canopy, 0, 1.26, -8.2, 0.76, 0.52, 1.5);
      add(geometry.canopy, canopy, 0, -0.2, -11.3, 0.74, 0.6, 1.5);

      // ---- High wing and four podded turbofans ---------------------------
      // The wing rides the spine at y 1.5, not the belly.
      add(wingPremier, secondary, 0, 1.5, -0.2);
      for (const side of [-1, 1]) {
        // Four engines slung UNDER the wing on pylons and ahead of its leading
        // edge. Nacelle tops sit at y 0.55 / 0.75 against a wing underside of
        // 1.34, so the pylons visibly bridge the gap instead of the pods being
        // buried in the surface. The outboard pair is further aft because the
        // wing is swept and the pylons follow its edge outboard.
        // Nacelles in `secondary`, not `accent`: this airframe's accent is the
        // faction red that the rotodome trim needs, and four red barrels under
        // the wing read as ordnance rather than as engines.
        add(geometry.rearBody, secondary, side * 4.9, -0.62, -4.5, 0.9, 0.9, 1.6);
        add(geometry.rearBody, secondary, side * 8.9, -0.38, -1.9, 0.86, 0.86, 1.5);
        add(geometry.panel, secondary, side * 4.9, 1.0, -3.8, 0.26, 0.85, 1.5);
        add(geometry.panel, secondary, side * 8.9, 1.14, -1.2, 0.24, 0.66, 1.4);
        // ONE dark ring per pod, at the exhaust end. The intake face is left as
        // the bare nacelle: a second dark ring at the front turned each pod
        // into a stack of tubes rather than into an engine.
        add(geometry.nozzle, dark, side * 4.9, -0.62, -2.1, 1.0, 1.0, 1);
        add(geometry.nozzle, dark, side * 8.9, -0.38, 0.35, 0.96, 0.96, 1);
        addFlame(side * 4.9, -0.62, -0.85, 0.55, 0.55);
        addFlame(side * 8.9, -0.38, 1.6, 0.52, 0.52);
        // Main-gear blister pods down the lower fuselage sides. The Il-76
        // carries its bogies in fairings that stand proud of the skin, so they
        // are set out at 1.9 to bulge past it.
        add(geometry.panel, secondary, side * 1.9, -1.0, 0.8, 0.9, 0.76, 4.4);
      }

      // ---- Rotodome: the whole point of the aircraft ----------------------
      // Two struts standing on the spine behind the wing, carrying a 7.2-wide
      // disc clear above the fuselage. Nothing else in the game has anything
      // above its spine, so this is the identification from every angle: a
      // circle from above, a plate on legs from the side, a wide bar from the
      // front. The struts are set fore and aft (z 5.1 / 8.5) rather than side
      // by side, which is the real pylon arrangement and keeps the disc
      // supported when it is seen from directly ahead.
      //
      // Centred at z 6.8 - AFT of the wing's root trailing edge at 2.8, which
      // is where the Il-76-based aircraft actually carries it, and far enough
      // back that the top view shows the WHOLE circle standing clear of the
      // wing instead of a disc half buried in the surface behind it. That
      // clearance is the reason the wing root chord was cut back to 3.0 rather
      // than the airlifter's 3.6: the dome has to have its own sky.
      //
      // Dome underside at y 4.05 against a fuselage top of about 1.5 and a wing
      // top of 1.66: a 2.4-unit air gap, so the disc is unmistakably STANDING
      // on legs rather than being a blister on the back. That gap is the whole
      // read from the side, and it is the reason the struts are 2.8 tall.
      add(geometry.panel, dark, 0, 3.0, 5.1, 0.6, 2.8, 0.75);
      add(geometry.panel, dark, 0, 3.0, 8.5, 0.6, 2.8, 0.75);
      add(rotodome, secondary, 0, 4.35, 6.8, 1, 1, 1);
      // Rim band in the faction red, and a hub cap on top. The band is a
      // slightly wider, much thinner disc set at the dome's mid-height, so it
      // paints the EDGE only - the flat faces stay grey and the disc reads as
      // a machined radar plate instead of a red counter.
      add(rotodomeRim, accent, 0, 4.35, 6.8, 1, 1, 1);
      add(geometry.nozzle, accent, 0, 4.77, 6.8, 1.1, 1.1, 0.5).rotation.x = Math.PI / 2;
      // Fairings where the two struts meet the spine, so the legs are planted
      // on the fuselage rather than passing through its skin.
      add(geometry.panel, secondary, 0, 1.55, 5.1, 0.8, 0.55, 1.6);
      add(geometry.panel, secondary, 0, 1.5, 8.5, 0.72, 0.5, 1.5);

      // ---- T-tail ---------------------------------------------------------
      // Carried at the very top of the fin, and set at z 11.4 - behind the
      // dome's aft edge at 9.8, so the two never overlap in the top view and
      // the tailplane is not read as part of the radar installation. The fin
      // is the tallest surface on the aircraft (top at y 10.6 against the
      // dome's 4.65), which is what a T-tail has to be to carry a tailplane
      // clear of the wing wake.
      add(geometry.fin, secondary, 0, 1.0, 11.4, 1.35, 2.5, 1.35);
      add(stabPremier, primary, 0, 10.3, 11.2);

      // ---- Details --------------------------------------------------------
      // Weather radar nose cap, flight-deck anti-glare panel, the dorsal spine
      // running from the wing root back under the dome to the fin, and a pair
      // of ventral antenna blades that mark this out as a sensor aircraft.
      add(geometry.nose, dark, 0, 0.2, -12.9, 0.34, 0.32, 0.26);
      add(geometry.panel, dark, 0, 1.55, -9.4, 0.78, 0.09, 1.9);
      add(geometry.panel, secondary, 0, 1.45, 10.2, 0.3, 0.22, 2.4);
      add(geometry.panel, dark, 0, -1.45, -4.8, 0.16, 0.55, 1.8);
      add(geometry.panel, dark, 0, -1.3, 3.4, 0.16, 0.5, 1.8);
      // Nav lights at the geometric wingtips: left red, right green.
      add(geometry.canopy, navL, -13.0, 1.62, 3.6, 0.2, 0.2, 0.2);
      add(geometry.canopy, navR, 13.0, 1.62, 3.6, 0.2, 0.2, 0.2);
    }
  });
}
