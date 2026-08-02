// B-1B LANCER - Sera (US-family) supersonic variable-geometry heavy bomber.
//
// Enemy/support-only registration: no AIRCRAFT_ORDER entry ({ order: false }),
// no CAMPAIGNS edit, no mission touched, no balance pass. Every flight,
// damage and AI number below is inherited wholesale from the closest existing
// heavy and carries a BALANCE TODO. The work in this file is the SHAPE.
//
// ---------------------------------------------------------------------------
// SHAPE IDENTITY - the three things that must survive at thumbnail size
// ---------------------------------------------------------------------------
//
// 1. VARIABLE-GEOMETRY WING on real pivots (`addWingPivot`, so the host's
//    updateWingSweep actually drives them). The real aircraft spans 41.8 m
//    spread and 24 m swept - a 17.8 m swing, the largest of any airframe in
//    the game, and about 43% of its own span. The panel is therefore modelled
//    at the SPREAD extreme rather than at a mid sweep the way the Tu-22M3 and
//    the F-111F are: those two are compromise poses that read as "a bit swept"
//    at any speed, whereas the Lancer's whole identity is that the two states
//    are visibly different aircraft. Modelled spread + host sweeping it aft to
//    68 deg is the only way both states exist. See the panel comment for the
//    geometry that makes the swept state read as a dart rather than a stub.
//
// 2. BLENDED BODY. There is no place on this aircraft where a wing is bolted
//    to a tube. The fuselage is a wide flattened lifting body (sx 1.5 against
//    a fighter's ~1.0, sy 0.72 against ~0.94) and the fixed glove is a large
//    horizontal surface that runs from the forebody chine all the way to the
//    tail on both sides, so the planform is continuous from nose to stabilator
//    and the moving panels emerge FROM it rather than off a hinge in mid-air.
//    Against the Tu-22M3 - the game's other swing-wing heavy, a cigar with two
//    box ducts stuck on its flanks - this is the whole difference.
//
// 3. FOUR ENGINES IN TWO PAIRED NACELLES under the glove, inboard at x +/-2.2
//    and +/-4.0, each pair sharing one wide fairing so it reads as two blocks
//    of two rather than four separate pods. B-52 (also in the roster) hangs
//    four pods out on the wing at x 5.1/8.4 below and AHEAD of it; C-17 hangs
//    four singles on pylons. The Lancer buries its four under the body next to
//    the centreline, which is the tell from directly behind and from below.
//
// ---------------------------------------------------------------------------
// SCALE - measured off the live models, not guessed
// ---------------------------------------------------------------------------
//
// What ends up on screen is (the model's own z-extent) x theme.scale, and the
// models are not all the same length, so `scale` cannot be read off any ladder
// directly. Measured on the two heavies this aircraft has to rank between:
//
//   B-52 ("bomber", inline)  nose tip z -15.55 (cone at -12.4, 4.2 x sz 1.5)
//                            to tail gun 12.33 = 27.88 model x 2.20 = 61.3
//                            world for a real 48.5 m  -> 1.264 world/m
//   Tu-22M3 (payload)        nose tip -12.51 to turret barrel 14.42
//                            = 26.93 model x 1.95 = 52.5 world
//                            for a real 42.4 m       -> 1.238 world/m
//
// This airframe runs z -13.9 (radome tip) to 14.6 (nozzle shell) = 28.5 model
// units. A real 44.5 m at the 1.25 world/m the two heavies agree on wants
// 55.6 world, so scale = 55.6 / 28.5 = 1.95. Rounded to 1.94, which lands it
// 5% longer than the Backfire (real ratio 44.5/42.4 = 1.049) and 10% shorter
// than the B-52 (real 44.5/48.5 = 0.918, drawn 0.902). Both reads correct.
//
// Span: 41.8 m spread is 20.9 m of half-span = 26.1 world = 13.5 model units
// at 1.94. The pivot sits at x 2.6 and the panel reaches 10.9 beyond it, so
// the drawn tip is at 13.5 - which is what tipSpan promises the contrail.
// Swept, the host turns the pivot by 48 deg (WING_SWEEP_FORWARD_DEG 20 ->
// WING_SWEEP_AFT_DEG 68), pulling the tip in to 2.6 + 10.9 cos48 = 9.9 model
// = 15.3 m of half-span, 30.7 m span against a real 24 m. Not exact - the host
// sweep range is shared by every VG airframe and is not this payload's to
// change - but the drawn swing is 41.8 -> 30.7 m, which is unmistakable.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;
  const strato = AIRCRAFT_TYPES.bomber;
  const stratoAI = ENEMY_AI_PROFILES.bomber;
  if (!strato || !stratoAI) {
    throw new Error("[b1b] expected the bomber (B-52H) aircraft and AI templates to exist");
  }

  // Sera (US) heavy palette. Taken off the B-52's line so the two American
  // bombers read as one air force, then pulled a step darker and cooler: the
  // real B-1B wears gunship-grey over a dark grey wraparound, which is the one
  // paint difference a player can resolve between the two at range. The accent
  // is the darkest tone on the aircraft because on this airframe it paints the
  // four nacelle blocks, and those have to separate from the body from below.
  const theme = {
    primary: 0x555d64,
    secondary: 0x393f45,
    accent: 0x232830,
    canopy: 0x8fe0ff,
    exhaust: 0xffb877,
    scale: 1.94,
    variant: "b1b"
  };

  // BALANCE TODO: placeholder. Every performance number below is the B-52H's,
  // spread through unchanged. The real B-1B is supersonic, far more agile and
  // much less durable than a Stratofortress, and it has no tail turret at all
  // - all of which the numbers should eventually say. Tuning it is a separate
  // pass with the rest of the roster in view, not this delivery.
  ctx.addAircraft("b1b", {
    ...strato,
    id: "b1b",
    label: "B-1B LANCER",
    role: "Supersonic Heavy Bomber",
    tag: "ENEMY",
    enemyOnly: true,
    blurb: "セラ軍の超音速可変後退翼爆撃機。胴体と翼が滑らかに融合した機体形状を持ち、翼を畳んで低空を超音速で突入する。胴体下に4基のエンジンを2基ずつ束ねて抱える。",
    // Where the contrail leaves the airframe, in MODEL units before scale. The
    // pivot is at x 2.6 and the drawn panel reaches 10.9 beyond it, so the tip
    // is at 13.5; 13.2 keeps the ribbon on the panel rather than off its edge.
    // tipZ is the tip chord's centre (2.8 - 4.6 in panel space, so 3.7), plus
    // the pivot's own z of 1.4.
    tipSpan: 13.2, tipZ: 5.1,
    theme
  }, { order: false });

  // BALANCE TODO: placeholder. The B-52H's heavy-bomber AI, spread unchanged
  // apart from the three numbers that would otherwise be visibly wrong on a
  // different-sized model: the hitbox, the tail-turret station and the paint.
  // (The real Lancer has no tail gun; leaving `rearGun` inherited is a balance
  // decision, so it stays with the rest of the placeholders rather than being
  // quietly dropped here.)
  ctx.addEnemyProfile("b1b", {
    ...stratoAI,
    label: "B-1B",
    hitboxScale: 2.4,
    // Local z of the aft body (12.6) times this model's scale (1.94), so the
    // tracers leave the aircraft where the geometry ends - the same contract
    // the B-52 and the Backfire follow.
    rearGunOffset: 24,
    radarColor: "#7fd8ff",
    tracerColor: 0x9fd8ff,
    explosionColor: 0xffc07a,
    theme: { ...theme }
  });

  ctx.addAircraftModel("b1b", {
    // Top view in the shared 40x44 box, nose up, drawn at the SPREAD sweep the
    // model is built at. Traced off the built geometry rather than drawn
    // freehand: the airframe runs z -15.34 (radome tip) to 14.37 (tail cone) on
    // a 13.5 half-span, and every vertex below is a real part station run
    // through x = 20 + 1.333*mx, y = 1.5 + 1.414*(mz + 15.34) - so the outline
    // and the aircraft cannot drift apart.
    //
    // Reading down the page: a long fine chined forebody that widens without a
    // step (no shoulder anywhere - that is identity #2), the glove flaring out
    // and aft to the pivot station, the swing panels running out to the tips at
    // x 2 / 38 with barely any rake on them (spread, identity #1), then the
    // trailing edge coming back in along the glove into the stabilators. The
    // absence of a waist between wing and tail is what separates this outline
    // from the Tu-22M3's at the same size.
    silhouette:
      "M20 1.5 L21 6.5 L22 13.9 L22.1 15.6 L24.5 20.9 L25.5 23.5 " +
      "L38 29.1 L38 31.7 L25.9 31.4 L26.1 31.7 L23.5 35.1 " +
      "L26.1 40.2 L26.1 41.6 L22 41.3 L21.2 43.5 L18.8 43.5 L18 41.3 " +
      "L13.9 41.6 L13.9 40.2 L16.5 35.1 L13.9 31.7 L14.1 31.4 " +
      "L2 31.7 L2 29.1 L14.5 23.5 L15.5 20.9 L17.9 15.6 L18 13.9 L19 6.5 Z",

    build(env) {
      const {
        geometry, extrudedSurface, verticalSurface,
        primary, secondary, accent, canopy, dark, light, navL, navR,
        add, addWingPivot, addFlame
      } = env;

      // ---- Planforms ------------------------------------------------------
      // THE outer wing panel. ONE side only (+x) with its inboard edge on the
      // pivot line - the contract wingTomcat, wingFlogger, wingBackfire and
      // wingAardvark all follow, because each panel is parented to its own
      // rotating group rather than being one mirrored mesh.
      //
      // Reaching x 10.9 off a pivot at 2.6 gives the 13.5 half-span the entry's
      // tipSpan promises, and it is the longest panel in the game (the Bear's
      // fixed wing reaches 13.2 from the centreline; this one reaches 13.5 from
      // a pivot 2.6 out). It has to be: 41.8 m is the widest span in the roster.
      //
      // Drawn at the SPREAD extreme, and two choices in the outline exist only
      // so the SWEPT state reads:
      //
      // - The leading edge rakes just 2.6 of z across 10.7 of span (14 deg),
      //   which is the real aircraft's 15 deg spread setting. A panel already
      //   drawn swept has nowhere to go when the host rotates it; starting
      //   nearly straight is what makes the 48 deg the host adds visible.
      // - The tip chord is 1.8 deep rather than closing to a point, and the
      //   trailing edge sweeps FORWARD from the tip back to the root (root TE
      //   at z 4.4, tip TE at 4.6 - only 0.2 of rake against the LE's 2.6). At
      //   full aft sweep the panel lies almost along the glove's own trailing
      //   edge, so the two merge into one continuous dart instead of leaving a
      //   notch, which is exactly what the real aircraft does at 67.5 deg.
      //
      // Painted `primary` with the GLOVE in `secondary` underneath it, and the
      // order of those two matters more than it looks. Round 1 drew both in
      // primary and the top view read as one solid planform with no hinge line
      // in it. Round 2 swapped only the panel to secondary - and the panels
      // disappeared outright, because in the preview rig (and in the air) a
      // large FLAT HORIZONTAL surface in the darkest body tone catches almost
      // no key light and goes to background value. The moving panel is the
      // biggest horizontal surface on the aircraft and therefore has to wear
      // the LIGHTEST tone; the contrast that shows the hinge comes from
      // darkening the fixed glove instead. Same total contrast, opposite sign,
      // and only one of the two is legible from above.
      //
      // Chord is deliberately DEEP - 6.6 at the root and 3.2 at the tip against
      // the Flogger panel's 4.6 / 0.8 - because this is a bomber wing carrying
      // a 216-tonne aircraft, not a fighter's. Round 5 drew 4.4 / 2.4 and the
      // exposed planform outboard of the glove was a thin sliver that read as a
      // MiG-23's panel scaled up; on a heavy the wing has to look like it is
      // holding something up.
      const wingLancer = extrudedSurface([
        [0.2, -2.6], [1.5, -2.2], [10.9, 1.6], [10.9, 4.8], [1.8, 4.0], [0.2, 4.0]
      ], 0.32);

      // The BLENDED GLOVE - identity #2, and the largest single surface on the
      // aircraft. It spans both sides through the fuselage as one piece (unlike
      // the moving panels) and it is deliberately drawn as a long continuous
      // chine rather than a wing root: the leading edge starts at the FOREBODY
      // (z -7.6 on the centreline) and runs unbroken out and aft to the pivot
      // station, and the trailing edge runs all the way back to z 9.4 where the
      // stabilator fillet picks it up. There is no station along the body where
      // the planform stops and the fuselage starts, which is the read.
      //
      // Width: 5.8 half-span, so it stands 3.2 outboard of the pivot at 2.6 and
      // the moving panel emerges from behind it instead of hinging off nothing.
      // Rounds 1-3 drew 4.6 against a body whose own half-width is 2.33, which
      // left barely two units of glove visible on each side - from directly
      // above the aircraft was a tube with two planks bolted to it and the
      // blended read did not exist. A glove that does not clearly outreach the
      // fuselage it grows from cannot show that the two are one surface.
      //
      // The forward point is at z -8.6 rather than the earlier -7.6 so the
      // leading edge starts ON the forebody, level with the chine strips, and
      // the aircraft has ONE unbroken edge from the radome to the wing pivot.
      //
      // The outboard TRAILING edge is cut hard FORWARD - z 3.2 out at x 5.8
      // against 8.4 on the centreline - for the same reason the Backfire's
      // glove is: with a square outboard edge the glove and the moving panel
      // occupy the same chord out to x 5.8 and the wing reads as a stub growing
      // out of a delta. Raking it forward means the panel emerges from BEHIND
      // the glove and its whole 10.9 of span is exposed planform.
      const gloveLancer = extrudedSurface([
        [0, -8.6], [1.9, -7.0], [4.0, -2.8], [5.8, 0.4], [5.8, 3.2],
        [2.8, 7.6], [0, 8.4],
        [-2.8, 7.6], [-5.8, 3.2], [-5.8, 0.4], [-4.0, -2.8], [-1.9, -7.0]
      ], 0.5);

      // Stabilators, cut to the glove's own trailing-edge line so the tail is
      // one design with the body rather than a separate surface. Short-span
      // (4.6 against the wing's 13.5) so it can never be read as a second wing,
      // and pulled in to exactly the glove's own half-span so the two surfaces
      // share an outboard line - round 1 drew them at 5.4, standing PROUD of
      // the glove, and from above the aircraft appeared to have three pairs of
      // planforms in a row rather than one wing and one tail.
      const stabLancer = extrudedSurface([
        [0, -1.6], [4.6, 1.6], [4.6, 2.6], [1.5, 2.4],
        [-1.5, 2.4], [-4.6, 2.6], [-4.6, 1.6]
      ], 0.3);

      // ---- Body -----------------------------------------------------------
      // FLAT, and only moderately wide - sx 1.16 against the Backfire's 1.06
      // and sy 0.62 against its 1.0. The flattening is the identity; the width
      // is deliberately NOT pushed further, because the glove has to outreach
      // the body for the blend to be visible from above and a 1.5-wide body
      // (rounds 1-3) swallowed it whole. The proportion that reads as "blended"
      // is a shallow body sitting INSIDE a much wider planform, not a fat one.
      // Two long overlapping sections rather than three short ones - each rim
      // is a step, and this airframe cannot afford one anywhere.
      add(geometry.fuselage, primary, 0, 0.04, -3.0, 1.16, 0.62, 1.25);
      add(geometry.fuselage, primary, 0, 0.02, 6.4, 1.1, 0.6, 1.05);
      // Forebody: a long CHINED wedge, not a radar cone. Drawn as a horizontal
      // planform surface (a long thin diamond) with the shared cone laid over
      // it flattened to sy 0.5, so the section is wide and shallow with hard
      // side edges running back into the glove's leading edge - which is what
      // the real aircraft's chine does and what a plain cone can never do.
      const forebodyLancer = extrudedSurface([
        [0, -5.4], [0.9, -2.2], [1.5, 3.0], [0, 4.2], [-1.5, 3.0], [-0.9, -2.2]
      ], 0.5);
      add(forebodyLancer, primary, 0, -0.04, -9.0);
      add(geometry.nose, primary, 0, -0.02, -12.4, 0.86, 0.5, 1.4);
      // Flight deck: four crew, so the glazing runs long, but it is SHALLOW
      // (sy 0.42) and sits low on the forebody. On the real aircraft the
      // windscreen barely breaks the upper mould line - the opposite of the
      // B-52's stepped airliner deck, and half of the "smooth" read.
      add(geometry.canopy, canopy, 0, 0.42, -9.6, 0.62, 0.42, 1.9);
      add(geometry.panel, dark, 0, 0.62, -9.4, 0.06, 0.14, 1.5);
      // Anti-glare panel running forward from the windscreen onto the chine.
      add(geometry.panel, dark, 0, 0.34, -11.6, 0.5, 0.06, 2.2);

      // The glove goes down AFTER the body and slightly below its centreline
      // (y -0.1) so its upper surface is flush with the flattened fuselage
      // flank rather than sitting on top of it. Mid-mounted, not shoulder: the
      // Lancer's wing comes out of the middle of the body's side, which is what
      // "blended" means here and what the F-111F's y 0.62 shoulder gloves are
      // deliberately not.
      add(gloveLancer, secondary, 0, -0.1, 1.0);
      // Chine strips down the forebody sides, carrying the glove's leading edge
      // forward as a hard line all the way to the radome. Without these the
      // forebody and the glove are two shapes that happen to touch; with them
      // the aircraft has one continuous edge from nose to pivot.
      add(geometry.panel, secondary, -1.3, -0.04, -8.2, 0.6, 0.12, 6.6, 0.06);
      add(geometry.panel, secondary, 1.3, -0.04, -8.2, 0.6, 0.12, 6.6, -0.06);
      // Dorsal fillet from the deck back to the fin root, so the spine is one
      // unbroken curve as well.
      add(geometry.panel, secondary, 0, 0.44, 2.0, 0.6, 0.34, 13.0);

      // ---- Swing wings ----------------------------------------------------
      // Identity #1. Each outer panel hangs off its own group whose rotation.y
      // IS the sweep, and addWingPivot self-registers the group in wingPivots
      // (the host gap the F-111F payload documents) so updateWingSweep actually
      // drives it. Pivot at x 2.6, tucked 2.0 inboard of the glove's 4.6 edge,
      // and at y 0.06, which is 0.16 ABOVE the glove rather than coplanar with
      // it. Coplanar was the obvious choice and it was wrong: two surfaces at
      // the same y overlap in the same plane, so from directly above the glove
      // occluded the whole inboard half of the panel and the wing read as a
      // short deep stub no matter how much chord it was given. Lifting it by a
      // sixth of a unit makes the panel the top surface everywhere outboard
      // while the offset stays far too small to open a visible gap at the root
      // (the glove is 0.5 thick and the fairing slabs cover the joint).
      addWingPivot(wingLancer, primary, -1, -2.6, 0.06, 1.4);
      addWingPivot(wingLancer, primary, 1, 2.6, 0.06, 1.4);
      // Pivot fairings: the low bulges that cover the hinge on the real
      // aircraft, and the thing that stops the panel root looking like a cut
      // edge when the wing is swept. Drawn as flat `panel` slabs in the GLOVE's
      // own tone rather than as spheres in the body's: rounds 3 and 4 used
      // `canopy` spheres in `primary` and from directly above they read as two
      // external fuel tanks parked on the wing roots - a light rounded blob is
      // the most conspicuous thing a top view can contain, and a fairing is
      // supposed to disappear into the blend rather than announce itself.
      add(geometry.panel, secondary, -2.6, 0.0, 1.6, 1.7, 0.34, 4.4, 0.03);
      add(geometry.panel, secondary, 2.6, 0.0, 1.6, 1.7, 0.34, 4.4, -0.03);

      // ---- Engines: four, in two paired nacelles --------------------------
      // Identity #3. Inboard pair at x 2.2, outboard at 4.0, both slung UNDER
      // the glove at y -0.95 - close to the centreline where the B-52's pods
      // are out at 5.1 and 8.4, and below the body where the C-17's hang on
      // pylons ahead of the wing. Each side gets one wide fairing over its two
      // nacelles (sx 2.3 covering both stations) so the four read as TWO
      // BLOCKS OF TWO, which is the actual read on the real aircraft and the
      // reason "four engines" and "B-52" are not the same silhouette.
      for (const side of [-1, 1]) {
        // The shared pair fairing first, so the two tubes sit inside it. Its
        // width (3.4, spanning x 1.4 - 4.8 on each side) is what makes the pair
        // one block: round 1 drew 2.6 and the outboard nacelle hung off the
        // edge of it, so from below the aircraft had four separate pods and
        // read as a B-52 with the engines moved inboard rather than as a Lancer.
        add(geometry.panel, accent, side * 3.1, -0.92, 2.6, 3.4, 1.15, 9.0);
        // The two nacelles, sunk INTO that block rather than proud of it, so
        // what stands out from below is the block and its two exhausts.
        add(geometry.rearBody, accent, side * 2.2, -1.0, 4.0, 1.0, 1.0, 2.0);
        add(geometry.rearBody, accent, side * 4.0, -1.0, 4.0, 1.0, 1.0, 2.0);
        // Raked intake mouths at the front of the block. Set at z -0.6 so the
        // mouths sit UNDER the glove's leading edge rather than ahead of it -
        // round 3 put them at -2.0 and from above two black rectangles stuck
        // out in front of the wing, which read as sponsons bolted to the sides
        // instead of as engines buried beneath a blended body.
        add(geometry.intake, accent, side * 2.2, -1.0, -0.6, 1.0, 1.7, 1.8, side * -0.1);
        add(geometry.intake, accent, side * 4.0, -1.0, -0.6, 1.0, 1.7, 1.8, side * -0.1);
        // Splitter plate on the OUTBOARD face of the block - one per pair, not
        // one per engine, because that is the wedge the real aircraft carries
        // and drawing two per side broke the block back into separate pods.
        add(geometry.panel, dark, side * 4.82, -1.0, -0.2, 0.14, 1.5, 3.4);
        // Nozzles and afterburner flames. Four of them, in two pairs: from
        // directly behind this is the identification.
        add(geometry.nozzle, accent, side * 2.2, -1.0, 8.0, 1.25, 1.25, 1.3);
        add(geometry.nozzle, accent, side * 4.0, -1.0, 8.0, 1.25, 1.25, 1.3);
        addFlame(side * 2.2, -1.0, 9.6, 1.05, 1.05);
        addFlame(side * 4.0, -1.0, 9.6, 1.05, 1.05);
      }

      // ---- Tail -----------------------------------------------------------
      // ONE tall fin on the centreline and low-set stabilators, both growing
      // off the glove's trailing edge rather than off a tail boom. Fin height
      // is measured against the BODY: this hull is 28 units long, so a fin
      // scaled like a fighter's disappears on it. 2.1 puts the tip about a
      // body-width above the spine, which is the real aircraft's proportion and
      // a shade shorter than the Backfire's 2.0 on a 27-unit body. Sitting on a
      // dorsal fillet that runs forward along the spine, so the fin grows out
      // of the body the way everything else on this aircraft does.
      add(geometry.fin, secondary, 0, 0.3, 8.2, 1.15, 1.9, 1.55);
      add(geometry.panel, secondary, 0, 0.5, 5.4, 0.42, 0.5, 6.4);
      add(stabLancer, primary, 0, -0.24, 10.4, 1.0, 1, 1.0);
      // Aft body closing the fuselage out to the stabilator station. Kept
      // narrow (sx 1.05) so the planform is visibly wider than the body here,
      // which is what stops the tail reading as a separate boom.
      add(geometry.rearBody, secondary, 0, -0.06, 12.2, 1.05, 0.72, 1.4);

      // ---- Details ---------------------------------------------------------
      // Radome cap on the tip of the chined forebody, and the pitot boom.
      add(geometry.nose, dark, 0, -0.02, -13.4, 0.34, 0.24, 0.4);
      add(geometry.panel, dark, 0, -0.02, -14.4, 0.06, 0.06, 1.2);
      // Three weapons-bay door outlines down the belly - the real aircraft has
      // three tandem bays, and they are the only markings on its underside.
      add(geometry.panel, dark, 0, -0.58, -4.2, 1.3, 0.1, 4.0);
      add(geometry.panel, dark, 0, -0.58, 0.4, 1.3, 0.1, 4.0);
      add(geometry.panel, dark, 0, -0.58, 5.0, 1.3, 0.1, 4.0);
      // Ventral strakes under the nozzle pairs.
      add(geometry.panel, dark, -3.1, -1.6, 7.0, 0.14, 0.6, 2.4, 0.2);
      add(geometry.panel, dark, 3.1, -1.6, 7.0, 0.14, 0.6, 2.4, -0.2);
      // Defensive-avionics blisters on the tail cone, which on the real
      // aircraft are where a B-52's turret would be.
      add(geometry.canopy, light, -0.7, 0.1, 13.4, 0.32, 0.3, 0.7);
      add(geometry.canopy, light, 0.7, 0.1, 13.4, 0.32, 0.3, 0.7);
      // Nav lights on the GLOVE tips at x 5.7, not the wing tips - the tips
      // move with the sweep, so a light out there swings across the sky.
      add(geometry.canopy, navL, -5.7, -0.06, 3.0, 0.18, 0.18, 0.18);
      add(geometry.canopy, navR, 5.7, -0.06, 3.0, 0.18, 0.18, 0.18);
    }
  });
}
