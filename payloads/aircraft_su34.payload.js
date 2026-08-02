// Su-34 FULLBACK: the Flanker family's fighter-bomber, and the Elem faction's
// heavy strike aircraft for M08 / M29 / M35.
//
// Scope: one airframe, one AI profile, one missile profile, one 3D model and
// one HUD silhouette. Nothing here touches CAMPAIGNS, AIRCRAFT_ORDER, existing
// entries or any mission - it registers a shape and the minimum table rows the
// spawner needs to be able to field it.
//
// Every flight number and every AI number is inherited from the Su-35S, which
// is the closest existing airframe on the same real fuselage. They are
// PLACEHOLDERS: a strike aircraft has no business turning like a superiority
// fighter, and the balance pass is a separate job. See the BALANCE TODO notes.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES, ENEMY_MISSILE_PROFILES } = ctx.tables;
  const su35 = AIRCRAFT_TYPES.su35;
  const su35AI = ENEMY_AI_PROFILES.su35;
  const su35Missile = ENEMY_MISSILE_PROFILES.su35 || ENEMY_MISSILE_PROFILES.su33;

  if (!su35 || !su35AI || !su35Missile) {
    throw new Error("[su34] expected the Su-35S aircraft/AI templates and a Russian missile profile to copy");
  }

  // Elem (Russian) palette, taken from the Su-33's carrier-grey rather than the
  // Su-35S's near-black so the strike aircraft reads as a different machine in
  // the same air force. The exhaust stays WARM amber, which is the faction tell
  // every Russian airframe in the roster carries.
  const su34Theme = {
    primary: 0x6f7a72,
    secondary: 0x424b46,
    accent: 0x8a6f3c,
    canopy: 0x9fe6ff,
    exhaust: 0xffc79a,
    // Su-34 is 23.3 m long against the Su-35S's 21.9 m at scale 1.09, and the
    // F-16 sets the ladder's origin at 15.0 m = 1.00. 23.3/21.9 x 1.09 = 1.16,
    // which also lands it just under the MiG-31 (26.9 m) - correct: the
    // Fullback is the second-longest fighter in the roster, not the longest.
    scale: 1.16,
    variant: "su34"
  };

  // BALANCE TODO: placeholder. Every performance number below is the Su-35S's,
  // spread verbatim. A Fullback should be slower, far less agile in roll and
  // pitch, and considerably tougher than a superiority fighter - none of that
  // is expressed yet.
  ctx.addAircraft("su34", {
    ...su35,
    id: "su34",
    label: "Su-34 FULLBACK",
    role: "Strike Fighter-Bomber",
    tag: "ENEMY",
    blurb: "並列複座の重戦闘爆撃機。幅広の「カモノハシ」機首に二人の乗員を収め、装甲コックピットと大搭載量で敵地の目標を叩く。空戦機動は鈍いが、対地攻撃能力は敵航空戦力で随一。",
    // Half-span 8.9 is where the wingTerminator planform's geometric tip
    // actually is, so the contrail leaves the real wingtip. tipZ matches the
    // Su-37/Su-35S station because the wing sits at the same z on this model.
    tipSpan: 8.9,
    tipZ: 2.6,
    theme: su34Theme
  }, { order: false });

  // BALANCE TODO: placeholder. Spread from the Su-35S's "evasive" profile, which
  // is the wrong behaviour for a bomber - a strike aircraft should run a
  // formation/ingress pattern and break off rather than jink like an ace.
  ctx.addEnemyProfile("su34", {
    ...su35AI,
    behavior: "formation",
    // The only two fields moved off the template, and both are readability
    // rather than balance: the hitbox has to match a visibly bigger airframe,
    // and the radar blip has to be a different colour from the Su-35S's gold
    // or the player cannot tell the strike package from its escort.
    hitboxScale: 1.12,
    radarColor: "#c08a3a",
    theme: su34Theme
  });

  // BALANCE TODO: placeholder. Copied wholesale from the closest Russian
  // fighter's air-to-air launcher; a Fullback's missile envelope has not been
  // considered at all.
  ctx.addEnemyMissileProfile("su34", { ...su35Missile });

  // ---- The model ---------------------------------------------------------
  // Read against the inline flankerd / flankere / terminator branches, which
  // are the same real fuselage. What this build changes from them is entirely
  // the front end, plus the stinger - which is exactly what separates a Su-34
  // from a Su-27 in life.
  ctx.addAircraftModel("su34", {
    // Top view, 40x44, nose up, one closed path - same box and same style as
    // SILHOUETTE_PATHS' flankere entry, which this is derived from. The three
    // edits that make it a Fullback, in the order they read:
    //  - the nose is a BLUNT FLAT face, 5.6 wide across x 17.2-22.8 at y 3,
    //    where every other path in the table converges on a single point at 20
    //  - the canards are back (the shoulders out to x 10 / 30 at y 14-18.5,
    //    the same feature the flankerd path carries and flankere does not)
    //  - the tail runs past the stabilators to a centreline STINGER: the spike
    //    at x 19-21 reaching y 43.5, aft of the nozzle line at y 41
    silhouette:
      "M17.2 3 L22.8 3 L24 8 L24.6 12 L25 14 L30 16 L30 18.5 L25 17.5 L25.2 19.5 " +
      "L37 26.5 L37 30 L25 30 L27.5 32.5 L27.5 35.5 L25 34.5 L25 36 L32 38.5 L32 41.5 " +
      "L23 39.5 L21.6 41 L21 43.5 L19 43.5 L18.4 41 L17 39.5 L8 41.5 L8 38.5 L15 36 L15 34.5 " +
      "L12.5 35.5 L12.5 32.5 L15 30 L3 30 L3 26.5 L14.8 19.5 L15 17.5 L10 18.5 L10 16 " +
      "L15 14 L15.4 12 L16 8 Z",
    build(env) {
      const { geometry, extrudedSurface, add, addFlame,
              primary, secondary, accent, canopy, dark, light, navL, navR } = env;

      // ★ THE FEATURE: the "platypus" (утконос) forebody. The Flanker's nose is
      // a round radome on a slim boom; the Su-34's is a broad FLAT pan holding
      // two crew SIDE BY SIDE, wider than it is tall and wider than the
      // fuselage behind it. Everything else on this airframe is a Flanker, so
      // if this does not read the model has failed.
      //
      // Built as a plan-view surface rather than a scaled cone, because a cone
      // squashed in y is still round in plan and the whole point is that this
      // one is not.
      //
      // Proportion is the whole trick: 6.2 ACROSS against 7.1 long, so the pan
      // is nearly as wide as it is long. The fuselage cylinder behind it is
      // 3.1 across at its widest, which means the forebody is DOUBLE the width
      // of the body it is attached to - the single measurement that decides
      // whether this reads as a Fullback or as a Flanker with a fat nose.
      //
      // The two points at +/-0.62 on the front edge are the second half of it:
      // the planform STOPS at a 1.24-wide flat face instead of converging on a
      // single apex. A pan with a point on it just reads as a fat radome, which
      // is the exact mistake this shape exists to avoid.
      const platypus = extrudedSurface([
        [-0.62, -4.7], [0.62, -4.7], [1.35, -4.2], [2.35, -2.6], [3.1, 0.2], [3.05, 2.5],
        [0, 2.5],
        [-3.05, 2.5], [-3.1, 0.2], [-2.35, -2.6], [-1.35, -4.2]
      ], 0.86);
      // The same planform again, thinner and slightly higher: the upper deck of
      // the pan, which is what gives the nose a flat TOP as well as a flat
      // plan. Two stacked slabs read as one flattened box from the side, and a
      // total depth of 1.25 against 6.2 of width is what "flat" means here.
      const platypusDeck = extrudedSurface([
        [-0.5, -4.1], [0.5, -4.1], [1.15, -3.7], [2.05, -2.2], [2.7, 0.3], [2.65, 2.4],
        [0, 2.4],
        [-2.65, 2.4], [-2.7, 0.3], [-2.05, -2.2], [-1.15, -3.7]
      ], 0.4);

      // Core fuselage, pulled AFT and shortened (z-scale 0.72 = 8.3 long
      // against the Flanker branches' 11.3). The inline Flankers run the
      // cylinder forward to z -6.7 because a cone sits on the end of it; here
      // the pan is the forebody, and a full-length cylinder underneath it reads
      // in the top view as a spine laid over the nose - which is the one thing
      // that stops the pan being read as the nose at all.
      add(geometry.fuselage, primary, 0, 0.02, 1.6, 0.96, 0.72, 0.66);
      add(platypus, primary, 0, -0.14, -5.3);
      add(platypusDeck, primary, 0, 0.26, -5.2);
      // The shoulder: the pan's 6.2 of width has to come DOWN to the 3.0-wide
      // body somewhere, and if it does not the trailing edge of the forebody is
      // a wall you can see from above. One tapering plan surface runs from the
      // pan's aft edge back into the wing root and does that in a straight
      // line, which is also how the real aircraft's forebody fairs in.
      const shoulder = extrudedSurface([
        [0, -2.6], [3.0, -2.6], [1.9, 2.2], [0, 2.6],
        [-1.9, 2.2], [-3.0, -2.6]
      ], 0.66);
      add(shoulder, primary, 0, -0.08, -2.3);
      // Dark radome across the blunt face. Every other airframe in the roster
      // wears its radome as a cone on the end of a point; here it is a wide low
      // SLAB capping a flat face, and there is deliberately no cone anywhere on
      // the front of this aircraft - one would undo the pan in a single part.
      add(geometry.panel, dark, 0, -0.12, -10.1, 1.45, 0.52, 0.55);
      // ★ Side-by-side cockpit: TWO low blisters, not the Flanker's one tall
      // narrow bubble, and not one wide one either. A single sphere scaled to
      // 1.7 in x is still a circle from above, which is exactly the read a
      // one-seat canopy gives; a pair at +/-0.72 is unmistakably a crew of two
      // sitting shoulder to shoulder. They sit low (y 0.4 against the Su-35S's
      // 0.88) because this is a cockpit the crew walk into rather than climb
      // onto, and low+wide is the whole of what "platypus" describes.
      add(geometry.canopy, canopy, -0.72, 0.4, -5.4, 0.78, 0.42, 1.25);
      add(geometry.canopy, canopy, 0.72, 0.4, -5.4, 0.78, 0.42, 1.25);
      // The frame between the two crew stations, which is what stops the pair
      // merging back into one blister at range.
      add(geometry.panel, dark, 0, 0.5, -5.4, 0.16, 0.3, 2.5);
      // Chine strips along the straight flat sides of the pan, which is what
      // gives it a hard edge in the three-quarter views.
      add(geometry.panel, dark, -2.95, -0.1, -5.2, 0.2, 0.24, 3.6);
      add(geometry.panel, dark, 2.95, -0.1, -5.2, 0.2, 0.24, 3.6);

      // Blended centre section ahead of the tunnel - the Flanker's continuous
      // lifting body, identical treatment to the inline branches.
      add(geometry.panel, primary, 0, -0.16, 0.9, 3.6, 0.52, 7.4);
      add(geometry.wingTerminator, secondary, 0, -0.05, 1.7);
      // LERX from the cockpit sides into the wing root.
      add(geometry.panel, secondary, -1.55, 0.04, -3.6, 1.0, 0.12, 4.4);
      add(geometry.panel, secondary, 1.55, 0.04, -3.6, 1.0, 0.12, 4.4);
      // ★ Canards, the same full-span foreplane the Su-33 and Su-37 carry,
      // added ONCE on the centreline - two per-side copies would draw
      // overlapping surfaces through the forebody.
      //
      // Mounted at y 0.52, ABOVE the LERX (0.04) and above the forebody deck,
      // because on this airframe the strake and the wide nose are both big
      // enough to swallow a foreplane sitting at the Su-37's height. Stretched
      // 1.2 in span so the tips reach 5.2 - clear of the pan's 3.1 half-width
      // by two full units, which is what makes them read in plan at all. Painted
      // `primary` against the `secondary` strake underneath so the two surfaces
      // separate in the top view instead of merging into one shoulder.
      add(geometry.canardTerminator, primary, 0, 0.52, -2.2, 1.2, 1, 1.1);

      // Widely spaced nacelles with the tunnel open between them.
      add(geometry.rearBody, secondary, -2.0, -0.1, 5.4, 0.94, 0.94, 1.65);
      add(geometry.rearBody, secondary, 2.0, -0.1, 5.4, 0.94, 0.94, 1.65);
      // Intakes hang BELOW the shoulder surface (y -0.6 against the shoulder's
      // -0.08 on a 0.66-thick slab) rather than at the Flanker branches' -0.42.
      // The forebody on this airframe is wide enough to cover them completely
      // from above at the inline station, and the accent-painted intake lips
      // are one of the two places the faction colour shows on the airframe.
      add(geometry.intake, accent, -2.05, -0.6, -1.2, 1.0, 1.2, 1.65);
      add(geometry.intake, accent, 2.05, -0.6, -1.2, 1.0, 1.2, 1.65);
      // Straight nozzles: no vectoring on a Fullback.
      add(geometry.nozzle, accent, -2.0, -0.1, 8.8, 1.18, 1.18, 1.18);
      add(geometry.nozzle, accent, 2.0, -0.1, 8.8, 1.18, 1.18, 1.18);
      addFlame(-2.0, -0.1, 10.2, 1.1, 1.1);
      addFlame(2.0, -0.1, 10.2, 1.1, 1.1);

      // ★ THE STINGER: the long tail boom that runs out of the tunnel BETWEEN
      // the two nacelles and past both nozzles. On the real aircraft it houses
      // the rearward-facing radar, and it is the Su-34's second identifying
      // feature after the nose - from behind or from above, no other Flanker
      // has anything on the centreline aft of the engines.
      //
      // The boom reaches z 13.6 against the nozzles' trailing lip at 9.5 and
      // the flame tips at ~11.5, so more than two units of it stand clear of
      // the exhaust in every attitude. Anything shorter disappears into the
      // afterburner plume the moment the aircraft lights the burners, which is
      // exactly when the player is looking at its tail.
      add(geometry.rearBody, primary, 0, -0.06, 7.8, 0.52, 0.52, 1.7);
      add(geometry.fuselage, primary, 0, -0.06, 11.0, 0.3, 0.3, 0.52);
      // `geometry.nose` is authored apex-FORWARD (rotateX(-PI/2)), so a tail
      // cone has to be turned end for end - dropped in as-is it would taper
      // towards the cockpit and read as a dent rather than a boom.
      add(geometry.nose, dark, 0, -0.06, 13.0, 0.44, 0.44, 0.32).rotation.y = Math.PI;

      // Twin outward-canted fins above the nacelles, ventral fins below.
      add(geometry.fin, secondary, -2.35, 0.55, 5.3, 0.82, 1.12, 0.92, 0.2);
      add(geometry.fin, secondary, 2.35, 0.55, 5.3, 0.82, 1.12, 0.92, -0.2);
      add(geometry.panel, dark, -2.0, -0.9, 7.0, 0.16, 0.8, 2.0, 0.28);
      add(geometry.panel, dark, 2.0, -0.9, 7.0, 0.16, 0.8, 2.0, -0.28);
      // Stabilators outboard of the nacelles, straddling the stinger.
      add(geometry.tailWing, primary, 0, -0.14, 7.4, 1.14, 1, 0.95);

      // Details: dorsal spine, wingtip rails with rounds, and the strike
      // aircraft's reason for existing - four heavy underwing stores that no
      // other Flanker in the roster carries.
      add(geometry.panel, secondary, 0, 0.5, 2.9, 0.32, 0.2, 4.4);
      add(geometry.panel, dark, -8.9, 0.0, 4.4, 0.22, 0.16, 2.3);
      add(geometry.panel, dark, 8.9, 0.0, 4.4, 0.22, 0.16, 2.3);
      add(geometry.missileBody, light, -8.9, -0.24, 4.1, 0.8, 0.8, 0.75);
      add(geometry.missileBody, light, 8.9, -0.24, 4.1, 0.8, 0.8, 0.75);
      add(geometry.missileNose, dark, -8.9, -0.24, 2.3, 0.75, 0.75, 0.75);
      add(geometry.missileNose, dark, 8.9, -0.24, 2.3, 0.75, 0.75, 0.75);
      // Underwing pylons and air-to-ground stores, inboard and mid-span. Slung
      // CLOSE under the wing (y -0.55 on a 0.3-thick surface at -0.05) - hung
      // any lower they stop reading as ordnance on a pylon and start reading as
      // a second aircraft flying formation underneath this one.
      for (const side of [-1, 1]) {
        add(geometry.panel, dark, side * 4.2, -0.28, 2.4, 0.2, 0.36, 1.4);
        add(geometry.panel, dark, side * 6.4, -0.26, 2.9, 0.18, 0.34, 1.3);
        add(geometry.missileBody, dark, side * 4.2, -0.55, 2.6, 0.95, 0.95, 0.8);
        add(geometry.missileNose, dark, side * 4.2, -0.55, 0.95, 0.9, 0.9, 0.85);
        add(geometry.missileBody, dark, side * 6.4, -0.5, 3.0, 0.8, 0.8, 0.7);
        add(geometry.missileNose, dark, side * 6.4, -0.5, 1.6, 0.78, 0.78, 0.8);
      }
      // Nav lights at the geometric wingtips: left red, right green.
      add(geometry.canopy, navL, -9.02, 0.12, 3.8, 0.12, 0.12, 0.12);
      add(geometry.canopy, navR, 9.02, 0.12, 3.8, 0.12, 0.12, 0.12);
    }
  });
}
