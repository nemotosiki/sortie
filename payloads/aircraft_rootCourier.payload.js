// ROOT COURIER - Sera's armoured key transport. The aircraft that physically
// carries ROOT signing material between vaults, because the one thing you never
// put on a network is the key to the network.
//
// Enemy/support-only registration: no AIRCRAFT_ORDER entry ({ order: false }),
// no CAMPAIGNS edit, no mission touched, no balance pass. Every flight number
// below is inherited wholesale from `transport` and marked BALANCE TODO. The
// work in this file is the SHAPE, and the shape is three things nothing else in
// the game has:
//
//   1. NACELLES ON TOP OF THE WING. An-72/An-74 "Cheburashka" layout - the two
//      turbofans sit ON the upper surface, well forward of the leading edge,
//      and blow their exhaust ACROSS the wing top (Coanda flap blowing) instead
//      of behind a fuselage or under a pylon. Every other multi-engine airframe
//      here - C-17, A-100, B-52, Tu-95 - hangs its engines BELOW the wing, so
//      "the engines are above the wing" is the single read that identifies this
//      aircraft from any angle, and the one that has to survive at thumbnail
//      size. The flames sit on the wing's upper deck, not off a tailpipe.
//   2. NO WINDOWS ANYWHERE. Not a dark canopy - the absence of one. This
//      airframe registers no `canopy` mesh at all: where a flight deck would be
//      there is an armour plate in `dark`, and the fuselage sides carry
//      continuous belt armour instead of a window line. Every other aircraft in
//      the game, transports included, has glass somewhere on the nose. A blank
//      armoured hull reads as "this thing is a safe with wings", which is what
//      it is.
//   3. YELLOW/BLACK HAZARD STRIPES. A chevron band of alternating yellow and
//      black blocks around the mid fuselage and repeated on the wing roots -
//      the only saturated colour on an otherwise near-black machine, so it is
//      what the eye lands on first and what separates this from the game's
//      other dark-grey heavies at range.
//
// Scale: the real An-72 is 28.07 m long on a 31.89 m span; this ship is
// specified at 28 m / 32 m. Measured off the live models rather than guessed.
// The A-100 branch spans tipSpan 13.0 x scale 2.3 = 29.9 world half-span for a
// real 50.5 m span, i.e. 29.9 / 25.25 = 1.184 world units per real metre of
// half-span; the C-17 `transport` branch gives 11.4 x 2.6 = 29.64 against 25.85
// = 1.147, so the convention is ~1.17 world/m across the heavies. A 16 m real
// half-span therefore wants ~18.7 world, and tipSpan 12.1 x scale 1.55 = 18.76.
//
// Length uses the same two anchors: the C-17 model runs z -13.3 (radome cap) to
// +13.6 (aft body) = 26.9 model x 2.6 = 69.9 world for a real 53 m, and the
// A-100 runs -12.9..+13.5 = 26.4 x 2.3 = 60.7 for 46.6 m, so 1.30-1.32 world
// per real metre. 28 m wants ~36.7 world; this airframe runs z -12.0 (nose cap)
// to +11.7 (fin trailing edge) = 23.7 model x 1.55 = 36.7 world. Both axes land
// on the convention, so a Courier parked beside the C-17 is a little over half
// its size in both directions - which is the correct read for an An-72 next to
// a Globemaster.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;

  // The nearest existing template on both tables: an unarmed enemy-only
  // transport. Spreading it satisfies the required-key schema without this
  // payload restating a contract it does not own.
  const transport = AIRCRAFT_TYPES.transport;
  const transportAI = ENEMY_AI_PROFILES.transport;
  if (!transport || !transportAI) {
    throw new Error("[rootCourier] expected the transport aircraft and AI templates to exist");
  }

  // Sera (US) dark-operations paint - the darkest airframe on the roster, but
  // only just dark enough. The first render pass ran primary 0x2c3138 /
  // secondary 0x1b1f24 and the aircraft came out as a single black mass in
  // which no panel line, no nacelle edge and no wing root could be told from
  // any other: at that value the three-point preview rig has nothing left to
  // shade with, and identity 1 (engines standing ON the wing) died with it,
  // because that read is entirely carried by the SHADOW between pod and wing.
  //
  // The second pass lifted primary to 0x484f58 and that was still not enough:
  // the preview rig is a dim three-point setup on a 0x2a2f36 background, and at
  // 0x484f58 the hull sat barely two steps off the backdrop, so the fuselage
  // and the wing behind it merged into one silhouette and the pods standing on
  // that wing had nothing to stand against. This pass settles on 0x6b737d for
  // primary - two full steps up again, still visibly the darkest heavy in the
  // game (the C-17 runs 0x8d99a3, the A-100 0x9aa3a8) but now clear of its own
  // background - against a secondary held down at 0x2b3037.
  //
  // That primary/secondary gap is the single thing that draws every edge on
  // this aircraft, and it is spent deliberately: the WING is the dark one and
  // the NACELLES are the light one, so the pods read as bright objects sitting
  // on a dark surface. Painting them the other way round loses identity 1 no
  // matter where the geometry is.
  //
  // The accent is the hazard yellow itself: it is used for nothing else, so
  // every yellow pixel on this aircraft belongs to the warning band.
  //
  // `canopy` is still set because the theme schema wants the key and the
  // material is built unconditionally by createAircraftModel - but no mesh in
  // build() is ever painted with it. Set to the body's own graphite so that if
  // anything downstream ever did paint with it, the result would still be a
  // blank hull rather than a window appearing on an aircraft that has none.
  //
  // Exhaust is Sera blue-white, matching the C-17/F-22 family: the faction cue
  // this game uses is exhaust temperature, and this is a Sera machine.
  const theme = {
    primary: 0x6b737d,
    secondary: 0x2b3037,
    accent: 0xf5c518,
    canopy: 0x6b737d,
    exhaust: 0xa8c8e0,
    scale: 1.55,
    variant: "rootCourier"
  };

  // BALANCE TODO: placeholder. Every performance number below is `transport`'s,
  // unchanged - this payload ships a SHAPE, not a balance pass. The real An-72
  // is a STOL tactical machine and should eventually be quicker and tighter
  // than a strategic airlifter, and maxHealth should come off the 196 (two
  // missiles) that a C-17-sized hull earns down to a one-quantum 98, but none
  // of that is decided here.
  ctx.addAircraft("rootCourier", {
    ...transport,
    id: "rootCourier",
    label: "ROOT COURIER",
    role: "Armoured Key Transport",
    tag: "ENEMY",
    enemyOnly: true,
    blurb: "ROOT署名鍵を物理的に運ぶ装甲輸送機。主翼の上に載ったエンジンと窓の一切無い装甲胴、そして黄黒の警告帯が目印。ネットワークに載せられない鍵は、この機体が空を渡る。",
    // Geometric wingtip of the model below: half-span 12.1, and the tip chord
    // runs z 2.0..3.3 with the wing added at z -0.4, so 2.25 is its mid-chord
    // in model space. Contrails then leave the actual tip rather than floating
    // inboard of it or trailing from a copied root station.
    tipSpan: 12.1,
    tipZ: 2.25,
    theme: { ...theme }
  }, { order: false });

  // BALANCE TODO: placeholder. The unarmed `transport` AI contract verbatim -
  // attackRange 0 is what states "this aircraft never shoots" - with only the
  // paint carried over so a Courier is identified by livery on the radar the
  // same way it is in the air.
  ctx.addEnemyProfile("rootCourier", {
    ...transportAI,
    label: "ROOT COURIER",
    theme: { ...theme }
  });

  ctx.addAircraftModel("rootCourier", {
    // Top view in the shared 40x44 box, nose up. Traced off the model rather
    // than drawn freehand: every vertex is a real part station run through
    // x = 20 + 1.30*mx, y = 1.5 + 1.73*(mz + 12.0), so the outline and the
    // aircraft cannot drift apart.
    //
    // Reading down the page: the blunt armoured nose (a flat chord, not a
    // point - this hull has no radome to taper into), the parallel-sided
    // freight body, the high wing running out to a square tip, the two NACELLE
    // BLOCKS standing on the wing's upper surface as separate rectangles inside
    // the planform (the one feature of this outline no other aircraft in the
    // game has - every other engine here is hidden under its wing and therefore
    // invisible from above), and the T-tail slab across the back.
    silhouette:
      "M17.4 1.5 L22.6 1.5 L23.5 4.6 L23.5 20.9 " +
      "L35.7 25.7 L35.7 27.9 L23.5 26.2 L23.5 33.6 " +
      "L24.6 35.6 L24.6 39.4 L27.9 39.4 L27.9 42.5 L12.1 42.5 L12.1 39.4 " +
      "L15.4 39.4 L15.4 35.6 L16.5 33.6 L16.5 26.2 L4.3 27.9 L4.3 25.7 " +
      "L16.5 20.9 L16.5 4.6 Z " +
      "M25.1 15.6 L28.4 15.6 L28.4 25.6 L25.1 25.6 Z " +
      "M11.6 15.6 L14.9 15.6 L14.9 25.6 L11.6 25.6 Z",

    build(env) {
      const {
        THREE, geometry, extrudedSurface,
        primary, secondary, accent, dark, navL, navR,
        add, addFlame
      } = env;

      // ---- Planforms ------------------------------------------------------
      // The An-72 wing: a moderately swept high-mounted surface, half-span 12.1
      // (matching the airframe's tipSpan exactly) over a 7.5 root chord. Much
      // stubbier in aspect ratio than the C-17's 11.4-over-7.0 relative to its
      // fuselage, because a STOL tactical machine is a short fat wing on a
      // short fat body, not an airliner. Cropped SQUARE at the tip rather than
      // tapering to a point: there has to be a tip chord for the nav light and
      // for the winglet plate to sit on.
      //
      // The root chord was widened from 5.6 to 7.5 after the second render
      // pass, and for the nacelles rather than for the wing: a pod standing on
      // a surface needs SURFACE showing around it, and at 5.6 the inboard wing
      // was almost entirely covered by the two pods and their blown-flap
      // panels. Trailing edge back at z 3.9 gives each nozzle a clear run of
      // wing behind it to blow over, which is the whole point of the layout.
      const wingCourier = extrudedSurface([
        [0, -3.6], [1.9, -3.3], [12.1, 2.0], [12.1, 3.3], [3.4, 3.9],
        [0, 3.9], [-3.4, 3.9], [-12.1, 3.3], [-12.1, 2.0], [-1.9, -3.3]
      ], 0.34);

      // T-tail plane. Half-span 5.1 - proportionally wide against a 12.1 wing,
      // which is what a T-tail on a short-coupled STOL airframe looks like. Set
      // at the very top of the fin, the same arrangement the C-17 and A-100 use
      // and the correct one for an An-72.
      const stabCourier = extrudedSurface([
        [0, -1.7], [5.1, 0.9], [5.1, 2.0], [1.5, 2.3],
        [-1.5, 2.3], [-5.1, 2.0], [-5.1, 0.9]
      ], 0.26);

      // The armoured nose cap. Drawn as a horizontal planform wedge with a
      // BLUNT front edge rather than reusing geometry.nose, because a cone is a
      // radome and this aircraft does not have one: it has a rounded armour
      // bulkhead. The front edge is 1.5 wide at its narrowest, so from any
      // distance the nose reads as chopped off rather than pointed, which is
      // half of "there is no cockpit up there".
      const noseCourier = extrudedSurface([
        [0.75, -3.0], [1.85, -1.4], [2.05, 1.6], [-2.05, 1.6],
        [-1.85, -1.4], [-0.75, -3.0]
      ], 1.9);

      // ---- Body -------------------------------------------------------------
      // A short fat freight hull with near-parallel sides. sx/sy 1.16 against
      // the C-17's 1.35/1.30 and sz 1.12 against its 1.55: smaller in every
      // direction, and proportionally DEEPER for its length, which is the
      // tactical-airlifter section (a cargo box you can drive into) rather than
      // the strategic one (a long tube).
      add(geometry.fuselage, primary, 0, 0, -1.4, 1.16, 1.16, 1.12);
      // Upswept aft body: the rear loading ramp. The shared fuselage cylinder
      // already narrows at its +z end, so lifting this section and running it
      // back to z 9.6 gives the tail-up taper an airlifter has. Two steps, the
      // second much smaller, so the upsweep is a curve rather than a hinge.
      add(geometry.fuselage, primary, 0, 0.62, 5.2, 1.06, 0.98, 0.6);
      add(geometry.fuselage, primary, 0, 1.30, 8.3, 0.82, 0.74, 0.42);
      // The blunt armoured nose, and the flat armour bulkhead capping it. This
      // is where every other aircraft in the game puts glass.
      add(noseCourier, primary, 0, 0.06, -9.4);
      add(geometry.panel, dark, 0, 0.35, -11.55, 1.25, 1.05, 0.34);

      // ---- IDENTITY 2: no windows -------------------------------------------
      // There is no add(geometry.canopy, canopy, ...) call anywhere in this
      // build, and that omission is deliberate and load-bearing. In its place:
      //
      //  - a raised armoured crew box on the spine where a flight deck would be,
      //    painted `secondary` and capped with a `dark` plate. It has the
      //    VOLUME of a cockpit and none of the glass, which is what makes the
      //    absence read as armour rather than as an unfinished model.
      //  - three narrow vision SLITS in `accent` across the front of that box,
      //    the only opening on the entire hull. A blank box alone read as a
      //    fairing in the first render pass; the slits are what say "there are
      //    people in there and they are looking through a letterbox".
      //  - continuous belt armour down both fuselage sides, standing proud of
      //    the skin exactly where a passenger window line would run. A window
      //    row and an armour belt occupy the same band on a fuselage, so
      //    putting a solid plate there is the strongest available statement
      //    that this hull has no windows.
      add(geometry.panel, secondary, 0, 1.36, -7.6, 1.5, 0.72, 2.8);
      add(geometry.panel, dark, 0, 1.76, -7.6, 1.4, 0.14, 2.7);
      // The slits. Three of them across the front face of the box, and set in
      // `dark` against a `secondary` box rather than in `accent`: the first
      // pass drew them yellow and at distance three small bright marks on the
      // nose read as LIT WINDOWS, which inverted the entire point of the
      // aircraft. A slit has to be a hole, and a hole is darker than what
      // surrounds it.
      for (const slit of [-0.62, 0, 0.62]) {
        add(geometry.panel, dark, slit, 1.36, -8.98, 0.42, 0.2, 0.2);
      }
      for (const side of [-1, 1]) {
        // Belt armour: a full-length plate standing 0.34 proud of the skin,
        // running the whole hold from the nose bulkhead to the ramp, on the
        // band where a passenger window line would be. It is drawn in `dark`
        // against a `primary` hull so it is the strongest horizontal line on
        // the side view - an unbroken black bar exactly where the windows are
        // not.
        add(geometry.panel, dark, side * 1.32, 0.28, -3.2, 0.34, 0.9, 8.6);
        // Rivet/frame ribs in `secondary` breaking the belt into armour
        // segments, so it reads as bolted plate rather than as a painted
        // stripe - and so the bar has internal detail instead of being a void.
        for (const zRib of [-6.9, -5.2, -3.5, -1.8, -0.1, 1.6]) {
          add(geometry.panel, secondary, side * 1.42, 0.28, zRib, 0.2, 0.98, 0.28);
        }
      }

      // ---- High wing --------------------------------------------------------
      // Mounted on the spine at y 1.42 - a shoulder wing on a fuselage whose
      // top sits at about 1.16 - so the surface passes OVER the hull rather
      // than through it, and the nacelles that stand on it clear the body.
      //
      // Painted `primary` - the LIGHT tone - and the nacelles standing on it in
      // `primary` as well, with the separation between them carried entirely by
      // the shading of a real gap rather than by a colour difference.
      //
      // The fourth render pass is what settled this, by trying the opposite and
      // then trying to rescue it. Pass 3 painted the wing `secondary` (dark) so
      // the bright pods would pop off it; the wing then had no terminator of
      // its own against a dark background and the outer panels dissolved, which
      // took away the surface the pods were supposed to be standing on. Pass 4
      // tried to fix that with a bright leading-edge strip and it read as a
      // white plank laid across the wing - worse than the problem, because a
      // straight box cannot follow a swept edge and there is no ry on `add`.
      //
      // The actual answer is that the pods do not need to contrast with the
      // wing. They need to cast a shadow on it, and for that the wing has to be
      // lit. One tone for both, a real 0.6-unit air gap between them, and the
      // preview rig's key light draws the separation for free.
      add(wingCourier, primary, 0, 1.42, -0.4);
      // Wing-root fairing blending the surface into the spine, so the wing is
      // planted on the fuselage instead of floating. In `secondary` now that
      // the wing itself is `primary`: a dark band under the wing root is what
      // separates the planform from the hull it crosses, which the two being
      // the same tone would otherwise lose.
      add(geometry.panel, secondary, 0, 1.16, -0.4, 3.0, 0.5, 6.4);

      // ---- IDENTITY 1: nacelles ON TOP OF the wing --------------------------
      // The whole aircraft. Two turbofans standing on the wing's UPPER surface
      // at +/-3.9, mounted well FORWARD so their exhaust blows back across the
      // wing top and over the flaps - the An-72/An-74 Coanda arrangement, and
      // the thing that makes the real aircraft look like nothing else flying.
      //
      // The numbers that make it read, and why each one is what it is:
      //
      //  - HEIGHT, and this is the number the aircraft lives or dies on. The
      //    wing is added at y 1.42 with a 0.34 extrusion, so its upper skin is
      //    at 1.59. Nacelle centres sit at y 3.55 on a 1.0 radius scale
      //    (rearBody radius 1.35), putting the pod undersides at 2.20 - a full
      //    0.61 of open daylight above the wing, bridged only by a narrow
      //    saddle - and the pod tops at 4.90, over three units clear.
      //
      //    This took three render passes to get right and both earlier values
      //    failed for the same reason. Pass 1 put the centres at 2.62 (pod
      //    underside 1.30, i.e. BELOW the wing skin): the pods were sunk into
      //    the surface and read as fuselage sponsons. Pass 2 raised them to
      //    3.15 (underside 1.80, a 0.21 gap): the gap existed in the numbers
      //    but at preview resolution it closed up into a shading seam and the
      //    pods still read as blisters ON the planform rather than objects
      //    standing on it. The lesson is that "above the wing" is not a
      //    geometric relation here, it is a VISIBLE HOLE - there has to be
      //    background showing through between pod and wing at thumbnail size,
      //    and 0.6 model units (0.93 world) is what buys it.
      //  - SPAN STATION. +/-5.0, at 41% of half-span. Walked outboard over
      //    three passes from 3.9 to 4.4 to here, each time for the same
      //    complaint in the front three-quarter view: at 3.9 the pod skirts
      //    merged with the raised crew box and the nose read as a three-lobed
      //    blob, and at 4.4 the two pods and the fuselage still touched into
      //    one mass. At 5.0 there is clear sky between hull and pod from every
      //    angle, which is what lets the eye count three separate bodies -
      //    fuselage, pod, pod - instead of seeing one wide one.
      //
      //    This is as far out as it can go. Out at the C-17's +/-8.2 the pods
      //    stop being on the wing's shoulder and become ordinary underwing pods
      //    that happen to be drawn high, and identity 1 is lost the other way.
      //  - FORE-AFT. Nacelle centre z -1.0 against a wing leading edge that is
      //    at z -3.7 at the root and -2.2 at this station: the pod straddles
      //    the leading edge, hanging its intake AHEAD of the wing and laying
      //    its long tail back ON it. That overhang is what a top view needs to
      //    tell "engine on the wing" from "engine in the wing".
      //  - EXHAUST. The nozzles are at z 1.2, still over the wing surface, and
      //    the flames run back from there ACROSS the upper deck. No other
      //    airframe in the game exhausts onto its own wing.
      for (const side of [-1, 1]) {
        // The nacelle body. sz 2.3 makes it long - these are big high-bypass
        // pods on a small aircraft, which is the correct proportion and also
        // what lets the pod span the wing chord. Painted `primary` (the light
        // tone) against a `secondary` wing, so the pod is the BRIGHTEST large
        // surface on the aircraft and the eye goes to it first.
        add(geometry.rearBody, primary, side * 5.0, 3.55, -1.0, 1.0, 1.0, 2.3);
        // Intake lip standing ahead of the wing, and a dark ring inside it so
        // the face reads as an open hole rather than as the end of a log.
        add(geometry.rearBody, secondary, side * 5.0, 3.55, -4.15, 1.1, 1.1, 0.42);
        add(geometry.nozzle, dark, side * 5.0, 3.55, -4.55, 2.0, 2.0, 0.5);
        // Nacelle-to-wing saddle: the pylon that spans the daylight gap. NARROW
        // on purpose - sx 0.62 against the pod's 2.7 diameter - so that what is
        // seen between pod and wing is mostly background with one thin leg
        // crossing it. A wide saddle fills the gap with solid geometry and
        // undoes the entire height decision above; that is exactly what pass 2
        // did with sx 0.9, and why the pods still read as blisters there.
        add(geometry.panel, dark, side * 5.0, 1.90, -1.2, 0.62, 0.95, 3.4);
        // Exhaust nozzle at the aft end, still over the wing.
        add(geometry.nozzle, dark, side * 5.0, 3.55, 1.35, 1.8, 1.8, 1.0);
        // A hazard collar in `accent` around the top of each pod. It does two
        // jobs at once and both were found in the render rather than planned:
        // it is the third statement of identity 3, and - because it sits on the
        // pod's UPPER surface - it is a bright mark that is only visible from
        // above if the pod is above the wing. From the top view it is the
        // fastest possible confirmation of the layout, and on a dark-shaded pod
        // it is the only thing keeping the nacelle from reading as a shadow.
        add(geometry.panel, accent, side * 5.0, 4.62, -1.0, 1.5, 0.18, 0.9);
        add(geometry.panel, accent, side * 5.0, 4.62, 0.5, 1.5, 0.18, 0.9);
        // The blown-flap deck: a panel let into the wing's upper surface
        // directly behind each nozzle, marking the strip of wing the exhaust
        // washes over. This is the visual explanation of the whole layout and
        // it only exists because the engines are up here.
        //
        // In `dark`, following the wing: pass 1 drew it dark on a dark wing and
        // it vanished, pass 3 flipped it to `light` on that same dark wing and
        // it read, and now that the wing is `primary` it has to go back to
        // `dark` for the same reason it was `light` before. The rule is that
        // the blown strip contrasts with the WING, whatever the wing is.
        add(geometry.panel, dark, side * 5.0, 1.64, 2.9, 2.0, 0.1, 3.2);
        // Flames lying ON the wing deck at nacelle height, wide and flat rather
        // than as a round plume, because what is being drawn is a jet sheet
        // running over a surface. They are also the second statement of the
        // gap: exhaust visibly floating above the wing rather than emerging
        // from inside it.
        addFlame(side * 5.0, 3.45, 2.7, 1.2, 0.95);
      }

      // ---- IDENTITY 3: yellow/black hazard stripes --------------------------
      // A chevron band around the mid fuselage, built as alternating blocks of
      // `accent` (hazard yellow) and `dark` rather than as a texture - this
      // renderer has no decal path, so a stripe is geometry or it does not
      // exist. Five blocks per run at 1.15 pitch, wrapped onto four faces (both
      // sides, the spine and the belly) so the band is visible from above, from
      // either beam and from below.
      //
      // SIZE is the whole lesson of the first render pass. That pass drew the
      // blocks 0.44 long and 0.14 thick on a 23.7-unit airframe seen at
      // 800x460 per view, and every one of them landed on well under a pixel:
      // the stripes were literally four yellow specks and identity 3 did not
      // exist. This pass runs them 0.95 long, 0.34 proud of the skin and 1.9
      // tall on the sides, i.e. roughly a fifth of the fuselage depth each -
      // deliberately coarser than anything a real paint scheme would be,
      // because the requirement is that they survive a thumbnail, not that
      // they scale.
      //
      // Set at z 0.4..5.0, aft of the wing root and forward of the ramp, which
      // is where a real cargo aircraft paints its "danger, do not stand here"
      // band - around the hold, under the jet line.
      //
      // Each side block is CANTED (rz 0.5, about 29 deg) so the band reads as
      // diagonal hazard chevrons and not as a row of dashes. Upright blocks
      // read as a WINDOW ROW at distance, which is the one thing this aircraft
      // must never appear to have.
      for (let i = 0; i < 5; i += 1) {
        const z = 0.4 + i * 1.15;
        const mat = i % 2 === 0 ? accent : dark;
        for (const side of [-1, 1]) {
          add(geometry.panel, mat, side * 1.34, 0.3, z, 0.34, 1.9, 0.95, side * 0.5);
        }
        // Spine run of the same band, so the stripes are the first thing read
        // from directly above - which is the angle a player usually gets on a
        // transport. Full body width (sx 2.5) and standing 0.3 proud, so from
        // the top view this is a solid yellow-and-black ladder across the hull
        // rather than a thin line on it.
        add(geometry.panel, mat, 0, 1.24, z, 2.5, 0.3, 0.95);
        // Belly run, for the pass underneath.
        add(geometry.panel, mat, 0, -1.16, z, 2.2, 0.3, 0.95);
      }
      // Wing-root hazard chevrons, repeating the band where the crew walk out
      // to the engines. Four blocks each side on the upper surface, inboard of
      // the nacelles - big enough (1.0 x 1.5) to be a second, wider read of the
      // same warning from directly above.
      for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i += 1) {
          add(geometry.panel, i % 2 === 0 ? accent : dark,
              side * 2.4, 1.66, -2.2 + i * 1.3, 1.0, 0.12, 1.5, side * 0.5);
        }
      }
      // Hazard band around the ramp lip at the very back of the hold, which is
      // the other place a real airlifter paints one. Wraps the aft face so the
      // stripes are also the last thing seen from directly astern.
      add(geometry.panel, accent, 0, 0.95, 7.1, 1.9, 0.85, 0.42);
      add(geometry.panel, dark, 0, 0.95, 7.6, 1.9, 0.85, 0.42);
      add(geometry.panel, accent, 0, 0.95, 8.1, 1.9, 0.85, 0.42);

      // ---- T-tail -----------------------------------------------------------
      // Carried at the top of a tall fin, aft of the ramp. The fin is the
      // tallest thing on the aircraft (top near y 8.6) which is what a T-tail
      // has to be to hold its tailplane clear of a blown wing's wake - and on
      // this airframe that wake is coming off engines mounted ON the wing, so
      // the tall tail is a consequence of identity 1 rather than decoration.
      add(geometry.fin, secondary, 0, 0.85, 9.2, 1.15, 1.95, 1.15);
      add(stabCourier, primary, 0, 8.2, 9.0);
      // Fin leading-edge fillet running forward onto the spine, so the fin
      // grows out of the body instead of being stuck on it.
      add(geometry.panel, secondary, 0, 1.5, 7.0, 0.28, 0.7, 3.0);

      // ---- Landing gear fairings and details ---------------------------------
      // An-72 main bogies retract into pods on the fuselage sides, which stand
      // proud of the skin - set out at 1.5 so they bulge past it. On this
      // aircraft they also serve the silhouette: they thicken the lower hull so
      // the armour belt above them has something to sit on.
      for (const side of [-1, 1]) {
        add(geometry.panel, secondary, side * 1.5, -0.86, 1.4, 0.76, 0.72, 4.0);
        // Winglet plates standing on the square wingtips - small, vertical, and
        // in `dark` so the tips terminate against the now-light wing. They also
        // give the nav lights something solid to sit beside instead of floating
        // off a bare edge.
        add(geometry.panel, dark, side * 12.05, 1.95, 2.6, 0.12, 1.0, 1.2);
        // Ventral strakes under the tail, the STOL-airframe detail that keeps
        // the ramp end from wagging.
        add(geometry.panel, secondary, side * 0.8, -0.75, 6.8, 0.14, 0.7, 2.2);
      }
      // The courier's own marking: a yellow key-slot block on the spine forward
      // of the wing, clear of the armour belt so the two do not fight. One
      // saturated mark on the back is what lets a player pick the right
      // aircraft out of a formation of dark transports from directly above.
      add(geometry.panel, accent, 0, 1.28, -4.6, 0.9, 0.26, 1.8);
      add(geometry.panel, dark, 0, 1.3, -4.6, 0.34, 0.3, 0.7);
      // Nav lights on the geometric wingtips: left red, right green.
      add(geometry.canopy, navL, -12.1, 1.7, 2.25, 0.2, 0.2, 0.2);
      add(geometry.canopy, navR, 12.1, 1.7, 2.25, 0.2, 0.2, 0.2);
      // Anti-collision beacon on top of the fin, and a tail-end warning light.
      add(geometry.canopy, navR, 0, 8.5, 9.6, 0.16, 0.16, 0.16);

      // `THREE` is destructured above and deliberately unused: this airframe is
      // built entirely from the shared primitives and two extruded planforms,
      // with no bespoke geometry of its own. Kept in the destructure so a later
      // pass that needs a cylinder does not have to re-derive where it comes
      // from.
      void THREE;
    }
  });
}
