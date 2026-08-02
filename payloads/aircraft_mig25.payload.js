// MiG-25 FOXBAT - the steel interceptor that out-ran everything and turned
// with nothing.
//
// Enemy-only registration: no AIRCRAFT_ORDER entry ({ order: false }), no
// CAMPAIGNS edit, no mission touched. The airframe exists so the Elem order of
// battle can field the Foxhound's ancestor; anything past that is a decision
// made elsewhere.
//
// Every flight number is inherited wholesale from the MiG-31B and marked
// BALANCE TODO. The work in this file is the SHAPE, and the shape is three
// things that must survive at thumbnail size:
//   1. ENORMOUS box side intakes - two rectangular ducts, each 2.0 wide by
//      2.0 tall by 8.6 long, flanking a fuselage only 1.4 wide. They are 45%
//      of the aircraft's length, they are the widest thing on its forward
//      half, and they stand taller than the body between them. The Foxhound
//      inherited these; here they are bigger still relative to the airframe,
//      because on the MiG-25 the ducts ARE the fuselage
//   2. two LARGE vertical tails with NO outward cant - the Foxhound's fins
//      lean out (rz 0.14); these stand dead upright, taller than its, and
//      rooted far apart on the duct centrelines so the parallel pair with
//      sky between them is the rear-quarter identification
//   3. a THIN shoulder-mounted swept wing - depth 0.22 against the Eagle
//      wing's 0.30, and rooted OUTBOARD at x 3.1 on the top corner of the
//      duct rather than at the centreline, so it grows off the boxes instead
//      of hiding them
//
// Scale: the real MiG-25 is 19.75 m long on a 14.02 m span against the
// MiG-31B's 22.69 / 13.46, so it must come out ~13% SHORTER and ~4% WIDER
// than the Foxhound it will share a sky with. Measured off the live
// `foxhound` branch rather than guessed: that model runs z -11.4 - 2.1x0.42
// = -12.28 (radome cap tip) to 8.9 + 0.7x1.15 = 9.71 (nozzle shell) = 21.99
// model units at theme scale 1.16; its wing is wingEagle at sx 0.94, so
// half-span 8.6 x 0.94 = 8.08 model.
//
// This airframe keeps the SAME scale 1.16 so the two are measured in one
// unit, and sizes the geometry by the real ratios: z -10.44 (radome tip) to
// 8.84 (nozzle shell) = 19.28 model, 0.877x the Foxhound against a real
// 0.870; half-span 8.41 model, 1.041x the Foxhound's 8.08 against a real
// 1.042. Shorter and wider, which is the correct read.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;
  const foxhound = AIRCRAFT_TYPES.mig31;
  const foxhoundAI = ENEMY_AI_PROFILES.mig31;
  if (!foxhound || !foxhoundAI) {
    throw new Error("[mig25] expected the mig31 aircraft and AI templates to exist");
  }

  // Elem (Russian) interceptor line, keyed off the Foxhound's palette so the
  // two read as one regiment - same dark-red accent, same canopy and exhaust.
  // The body tones are deliberately LIGHTER: the real MiG-25 flew in bare
  // nickel-steel silver-grey where the -31 wears low-vis grey, and at range
  // the paint value is the one difference a player can resolve.
  const theme = {
    primary: 0xb6bdc4,
    secondary: 0x848c94,
    accent: 0x8c2f2f,
    canopy: 0x8fe0ff,
    exhaust: 0xbfd4ff,
    scale: 1.16,
    variant: "mig25"
  };

  // BALANCE TODO: placeholder. Every performance number below is the
  // MiG-31B's, unchanged. Only identity, dimensions and paint are authored
  // here; the real MiG-25 was faster still, blinder and far less flexible,
  // and the numbers should eventually say so.
  ctx.addAircraft("mig25", {
    ...foxhound,
    id: "mig25",
    label: "MiG-25 FOXBAT",
    role: "High-Speed Recon Interceptor",
    tag: "ENEMY",
    enemyOnly: true,
    blurb: "冷戦の空を最速で駆け抜けた高速迎撃・偵察機。機体の半分を占める巨大な箱型インテークに、直立した大型の双垂直尾翼、肩に載せた薄い後退翼。旋回は捨て、ただ速度だけを装甲とする銀灰の直線番長だ。",
    // Geometric wingtip for the contrail: the planform's tip chord sits at
    // half-span 8.41 between z 3.0 and 3.95, so the trail leaves the actual
    // clipped tip at its mid-chord rather than a copied Foxhound station.
    tipSpan: 8.41, tipZ: 3.5,
    theme
  }, { order: false });

  // BALANCE TODO: placeholder. The AI profile is the MiG-31B's stand-off
  // template with nothing but the paint changed - and NO
  // ENEMY_MISSILE_PROFILES entry is registered, so unlike the Foxhound this
  // aircraft is gun-only until someone decides what an R-40 shot is worth.
  // A Foxbat that fights exactly like a Foxhound would erase the -31's one
  // identity (the longest missile reach in the air), so the round is left as
  // an explicit balance decision rather than a copied number.
  ctx.addEnemyProfile("mig25", {
    ...foxhoundAI,
    label: "MiG-25",
    theme
  });

  ctx.addAircraftModel("mig25", {
    // Top view in the shared 40x44 box, nose up. Traced off the model rather
    // than drawn freehand: every vertex is a real part station run through
    // x = 20 + 2.2*mx, y = 0.8 + 2.2*(mz + 10.44), so the outline and the
    // aircraft cannot drift apart.
    //
    // Reading down the page: the cone forebody, the sudden width JUMP where
    // the box intakes begin (a step from x 21.6 to 27.0 - no other silhouette
    // here does that; the Foxhound's own outline widens gradually), then the
    // duct wall running dead straight for 40% of the length, the thin swept
    // wing off the top of it to a clipped tip, and the swept tailplane behind
    // a clear gap. The straight parallel duct walls carry feature 1 in the
    // outline alone, which is the only place a radar blip can show it.
    silhouette:
      "M20 0.8 L21.6 9.2 L27 10.8 L27 19.6 L38.5 29.5 L38.5 31.7 " +
      "L26.9 32.2 L26.7 35.2 L31.8 36.7 L31.8 40.3 L26.7 41.4 L26.7 42.7 " +
      "L13.3 42.7 L13.3 41.4 L8.2 40.3 L8.2 36.7 L13.3 35.2 L13.1 32.2 " +
      "L1.5 31.7 L1.5 29.5 L13 19.6 L13 10.8 L18.4 9.2 Z",

    build(env) {
      const {
        geometry, extrudedSurface,
        primary, secondary, accent, canopy, dark, light, navL, navR,
        add, addFlame
      } = env;

      // ---- Planform -------------------------------------------------------
      // The shoulder wing: thin (depth 0.22 against wingEagle's 0.30), swept
      // ~40 deg on the leading edge, clipped square at half-span 8.41 with a
      // near-straight trailing edge - the real aircraft's trailing edge is
      // barely swept, and keeping it flat is what separates this planform
      // from the Eagle-family trapezoids at a glance from above.
      //
      // The ROOT starts outboard at x 3.1, not at the centreline: on this
      // aircraft the wing grows off the OUTER wall of the intake duct, which
      // is why the ducts can read as a separate mass from above. A root at
      // x 0 (the first pass) buried the boxes under the wing and the top view
      // lost feature 1 entirely - the whole aircraft went to one grey blob.
      const wingFoxbat = extrudedSurface([
        [3.1, -1.9], [3.9, -1.6], [8.41, 2.6], [8.41, 3.6], [3.1, 3.85],
        [-3.1, 3.85], [-8.41, 3.6], [-8.41, 2.6], [-3.9, -1.6], [-3.1, -1.9]
      ], 0.22);

      // ---- Body -----------------------------------------------------------
      // A conventional spindle, deliberately NARROW (sx 0.72): on this
      // aircraft the fuselage is only the thing that keeps the two ducts
      // apart, and drawing it thin is what makes the boxes beside it read as
      // half the airframe. Its flank sits at ~1.12 against the duct inner
      // wall at 1.15, so the three masses touch without the body swallowing
      // them.
      add(geometry.fuselage, primary, 0, 0.1, -0.9, 0.72, 0.7, 1.15);
      add(geometry.nose, primary, 0, 0.14, -7.8, 0.7, 0.6, 1.05);
      // Radome cap - the front measuring point (tip z -10.44).
      add(geometry.nose, dark, 0, 0.14, -9.6, 0.3, 0.26, 0.4);
      // Single-seat canopy, small and well forward - half the length of the
      // Foxhound's tandem glass, which is the two airframes' cockpit
      // difference in one part. It sits at y 0.86, ABOVE the duct crowns
      // (0.95), so the only thing breaking the flat top line is the glass.
      add(geometry.canopy, canopy, 0, 0.86, -5.9, 0.56, 0.46, 1.3);
      add(geometry.panel, dark, 0, 0.55, -7.6, 0.44, 0.07, 1.7);
      // Narrow spine between the two ducts, level with their crowns - the
      // aircraft's flat back. Half-width 1.1 keeps it INSIDE the duct inner
      // walls so it never widens the top-view silhouette; the earlier 2.4
      // plate bridged straight over the boxes and erased their inner edges.
      add(geometry.panel, secondary, 0, 0.92, -0.6, 1.1, 0.12, 8.6);
      // Recon camera windows under the nose - the one part that says the
      // "R" in the role. A dark glazed strip where the -31 carries nothing.
      add(geometry.panel, dark, 0, -0.4, -8.2, 0.42, 0.16, 1.1);

      // ---- THE intakes ----------------------------------------------------
      // Feature 1, and the part the whole model is arranged around. Two
      // rectangular ducts spanning x 1.15..3.15, y -1.05..0.95, z -5.9..2.7:
      // 2.0 wide, 2.0 tall and 8.6 long each. The pair alone is 6.3 across
      // against the wing's 16.8 and stands taller than the fuselage they
      // flank, so from the front the aircraft is two boxes with a spindle
      // wedged between them, and from above they are the widest thing on the
      // airframe short of the wing itself.
      //
      // Three things make them read where the first pass failed:
      //   - TONE. `secondary` against a `primary` body and wing. Painted
      //     primary (first pass) the duct/fuselage/wing edges vanished at
      //     thumbnail size and the top view was one flat grey mass.
      //   - OUTBOARD. Outer wall at 3.15 = the wing root station, so the
      //     duct's own edge is the aircraft's widest line for its whole
      //     forward half rather than hiding under the planform.
      //   - PROPORTION. sz 8.6 out of a 19.3-unit airframe is 45% of the
      //     length. The Foxhound's boxes are sy 1.5 x sz 5.2 on a LONGER
      //     aircraft, which is what makes "the intake is half the aircraft"
      //     true here and only here.
      // `geometry.panel` is a UNIT box, so the scale arguments are the part's
      // real dimensions - sx 2.0 is 2.0 wide, spanning x 1.15..3.15 about a
      // centre at 2.15. (An earlier pass wrote sx 1.0 believing the box was
      // 2 units across; the ducts came out half-width, sat inboard of the
      // wing root, and vanished from the top view. The measurement is the
      // feature here, so it is stated rather than assumed.)
      add(geometry.panel, secondary, -2.15, -0.05, -1.6, 2.0, 2.0, 8.6);
      add(geometry.panel, secondary, 2.15, -0.05, -1.6, 2.0, 2.0, 8.6);
      // Dark inlet mouths on the front face, raked so the upper lip overhangs
      // the lower - the real aircraft's shock-wedge inlet. add() has no pitch
      // argument, so the rake is set on the returned mesh, the way the inline
      // branches pitch their arrestor hooks.
      add(geometry.panel, dark, -2.15, -0.05, -5.75, 1.94, 2.05, 0.6).rotation.x = -0.28;
      add(geometry.panel, dark, 2.15, -0.05, -5.75, 1.94, 2.05, 0.6).rotation.x = -0.28;
      // Splitter plates in the boundary-layer gap between duct and body.
      add(geometry.panel, dark, -1.1, -0.05, -5.2, 0.07, 1.7, 1.6);
      add(geometry.panel, dark, 1.1, -0.05, -5.2, 0.07, 1.7, 1.6);
      // Accent lip along each upper inlet edge: the regiment's dark red, worn
      // where the Foxhound wears it (on the intake) so the two read as one
      // air force at a glance. Also the line that tells a viewer where the
      // top of the box is when the aircraft is seen head-on.
      add(geometry.panel, accent, -2.15, 0.98, -5.5, 2.0, 0.1, 0.9);
      add(geometry.panel, accent, 2.15, 0.98, -5.5, 2.0, 0.1, 0.9);
      // A dark seam ON TOP of each duct, inboard of the wing root, running
      // the length of the box. From above the wing covers the duct's outer
      // half and the fuselage covers nothing, so this strip is what draws the
      // duct's inner edge in the TOP view - the one view where a box buried
      // under a planform otherwise leaves no line at all.
      add(geometry.panel, dark, -1.35, 0.97, -1.9, 0.28, 0.06, 7.6);
      add(geometry.panel, dark, 1.35, 0.97, -1.9, 0.28, 0.06, 7.6);
      // The FORWARD deck of each duct, ahead of the wing leading edge and
      // painted `secondary` against the `primary` wing behind it. This is the
      // top view's version of feature 1: a pair of broad flat panels running
      // from the inlet lip up alongside the canopy, tonally separated from
      // both the wing and the body, so from above the aircraft reads as
      // "two boxes with a nose between them" for its whole forward half
      // rather than as a single tapering fuselage.
      add(geometry.panel, secondary, -2.15, 0.99, -3.9, 1.9, 0.06, 3.6);
      add(geometry.panel, secondary, 2.15, 0.99, -3.9, 1.9, 0.06, 3.6);
      // Outer duct wall in `dark`: a thin vertical strip flush on the box
      // side at x 3.15. This is the edge that survives when the model is 30
      // pixels wide - a flat-shaded grey box against a grey sky has no
      // outline of its own, and without the strip the ducts stopped being
      // separate objects at distance.
      add(geometry.panel, dark, -3.16, -0.05, -1.6, 0.08, 1.9, 8.4);
      add(geometry.panel, dark, 3.16, -0.05, -1.6, 0.08, 1.9, 8.4);

      // ---- Wing -----------------------------------------------------------
      // Mounted at y 0.78 - just under the duct crowns at 0.95, which is what
      // "shoulder-mounted" means from the front: the wing leaves the TOP
      // corner of the boxes and runs flat out from there, rather than
      // emerging from the middle of a fuselage side.
      add(wingFoxbat, primary, 0, 0.85, 0);
      // Root fillets closing the gap between the duct crown (0.95) and the
      // wing underside (0.74), sitting on the outer top corner of each box.
      add(geometry.panel, primary, -3.0, 0.85, 0.4, 0.3, 0.24, 4.6);
      add(geometry.panel, primary, 3.0, 0.85, 0.4, 0.3, 0.24, 4.6);

      // ---- Engines --------------------------------------------------------
      // The ducts feed straight into the nozzles: nacelle centres at +/-2.15
      // line up with the box centres exactly, so the airflow path reads as
      // one straight tunnel from inlet to flame down each side. The Foxhound
      // necks its engines in to +/-1.0; keeping them out here is what makes
      // the rear view a pair of widely spaced pipes rather than a bundle.
      add(geometry.rearBody, secondary, -2.15, -0.05, 5.4, 0.94, 0.94, 1.35);
      add(geometry.rearBody, secondary, 2.15, -0.05, 5.4, 0.94, 0.94, 1.35);
      // Nozzle shells - the aft measuring point (z 8.84).
      add(geometry.nozzle, accent, -2.15, -0.05, 8.0, 1.05, 1.05, 1.05);
      add(geometry.nozzle, accent, 2.15, -0.05, 8.0, 1.05, 1.05, 1.05);
      addFlame(-2.15, -0.05, 9.5, 1.0, 1.0);
      addFlame(2.15, -0.05, 9.5, 1.0, 1.0);

      // ---- Tails ----------------------------------------------------------
      // Feature 2. Two big blades with NO cant argument - dead upright, where
      // every other twin-fin airframe in the game leans its pair out (F-14
      // 0.16, Su-37 0.2, Foxhound 0.14) or in (F-22, F-35).
      //
      // Both halves of "large twin fins, no cant" are load-bearing, and so is
      // the SEPARATION. Rooted at +/-2.15 on the duct centrelines (the first
      // pass had them at +/-1.5, nearly touching, which read as one thick fin
      // from any angle off the beam); at sy 1.5 they stand 5.85 tall on a
      // 19.3-long aircraft. Two tall parallel blades with clear sky between
      // them is the rear-quarter identification, and it only works if the gap
      // is wider than the blades.
      add(geometry.fin, secondary, -2.15, 0.75, 4.4, 1.0, 1.5, 1.05);
      add(geometry.fin, secondary, 2.15, 0.75, 4.4, 1.0, 1.5, 1.05);
      // Ventral strakes under the engines, canted out - the fins are not, and
      // the contrast is deliberate: the only leaning surfaces on the aircraft
      // are the ones below it.
      add(geometry.panel, dark, -1.5, -0.95, 6.4, 0.14, 0.8, 1.9, 0.25);
      add(geometry.panel, dark, 1.5, -0.95, 6.4, 0.14, 0.8, 1.9, -0.25);
      // Swept tailplane, low on the aft body and well behind the wing, so the
      // top view shows wing / gap / stab rather than one continuous surface.
      add(geometry.tailWing, primary, 0, -0.15, 7.0, 1.05, 1, 0.9);

      // ---- Details --------------------------------------------------------
      // One R-40 round per wing on a pylon - the biggest air-to-air missile
      // ever fielded, so the body scale is 1.1 against the Foxhound's 0.9
      // recessed R-33s. Hung UNDER the wing (y -0.1) and inboard at +/-5.2,
      // where the first pass had them at +/-3.6 standing above the wing plane
      // and reaching forward past the nose, which added a second pair of
      // wing-like shapes to the top view and cost feature 3 its clarity.
      // BALANCE TODO: visual only; no missile profile fires it.
      add(geometry.panel, dark, -5.2, 0.42, 2.2, 0.16, 0.36, 1.6);
      add(geometry.panel, dark, 5.2, 0.42, 2.2, 0.16, 0.36, 1.6);
      add(geometry.missileBody, light, -5.2, -0.1, 2.6, 1.05, 1.05, 1.1);
      add(geometry.missileBody, light, 5.2, -0.1, 2.6, 1.05, 1.05, 1.1);
      add(geometry.missileNose, dark, -5.2, -0.1, 0.05, 0.9, 0.9, 0.9);
      add(geometry.missileNose, dark, 5.2, -0.1, 0.05, 0.9, 0.9, 0.9);
      // Nav lights on the clipped tips at the wing plane.
      add(geometry.canopy, navL, -8.3, 0.78, 3.1, 0.13, 0.13, 0.13);
      add(geometry.canopy, navR, 8.3, 0.78, 3.1, 0.13, 0.13, 0.13);
    }
  });
}
