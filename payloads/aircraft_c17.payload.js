// C-17 GLOBEMASTER III - the strategic airlifter, built as its own airframe.
//
// Enemy/support-only registration: no AIRCRAFT_ORDER entry ({ order: false }),
// no CAMPAIGNS edit, no mission touched, no balance number authored. Every
// flight figure below is inherited wholesale from the existing enemy
// `transport` and marked BALANCE TODO. The work in this file is the SHAPE.
//
// ---------------------------------------------------------------------------
// Why this exists when `transport` is already labelled C-17
// ---------------------------------------------------------------------------
// The inline `transport` variant is a C-17 in outline but it is the roster's
// generic heavy: it is also flown as AWACS, tanker and jammer by
// support-aircraft.payload, so its geometry is deliberately non-specific and
// its proportions were never pinned to the real aircraft. Measured off the live
// build, that model runs 71.3 world long on a 59.3 world span - a wu/m ratio of
// 1.147 against the 0.97 every purpose-built airframe in the game uses (see the
// scale note below). It is ~18% oversized, its wing carries no winglets, and
// its aft body lifts without narrowing.
//
// This entry is the aircraft itself, at roster scale, with the three features a
// player has to be able to read at thumbnail size - and it has to survive
// standing next to an An-124 and an Il-76, which are the same silhouette
// family. The three-way separation is stated explicitly at the end of this
// header because getting it wrong is the one failure this model cannot recover
// from.
//
// ---------------------------------------------------------------------------
// Shape identity - three features, in the order they have to survive shrinking
// ---------------------------------------------------------------------------
//   1. HIGH WING WITH FOUR UNDERSLUNG TURBOFANS. The wing rides the top of the
//      fuselage (y +1.5, above a body whose crown is +1.45) and four separate
//      pods hang BELOW it on visible pylons, each pod forward of the leading
//      edge. Four discrete nacelles, not two pairs: that is what separates it
//      from the B-52's four twin-pods in the same roster, and the high mount is
//      what separates the whole airlifter family from every low-wing jet here.
//   2. T-TAIL. The tailplane sits on TOP of the fin, at y +8.0, with nothing on
//      the fuselage aft of the wing. This is the single feature that tells a
//      C-17 from an An-124 at any distance, so the fin is drawn tall and the
//      stabiliser wide (half-span 5.3) with a visible bullet fairing at the
//      junction. An An-124 must get a low tailplane on the fuselage and an
//      Il-76 gets a T-tail as well but keeps its chin glazing (see below).
//   3. UPSWEPT AFT FUSELAGE + WINGLETS. The rear body climbs from y 0 at the
//      wing trailing edge to y +2.1 at the tail while narrowing to 0.62 of the
//      forward body's width, with the loading ramp visible as a flat underside
//      wedge. At the other end of the wing, two swept-back BLADE WINGLETS stand
//      2.4 model units proud of the tip. The real aircraft's winglets are
//      2.9 m on a 25.85 m half-span = 11%; 2.4 on 11.14 is 22%, deliberately
//      exaggerated because a scale-accurate winglet vanishes below ~8 px and
//      this is one of the three required reads.
//
// ---------------------------------------------------------------------------
// Scale - measured off existing airframes, not guessed
// ---------------------------------------------------------------------------
// The roster's working conversion is ~0.97 world units per metre. Measured as
// world half-span (tipSpan x theme.scale) against real half-span:
//
//   F-22 `raptor`   tipSpan 6.85  x 0.96 =  6.58 world / 6.78 m  = 0.970 wu/m
//   B-52 `bomber`   tipSpan 12.5  x 2.2  = 27.50 world / 28.2 m  = 0.975 wu/m
//   YF-23 payload   tipSpan 6.6   x 0.98 =  6.47 world / 6.65 m  = 0.973 wu/m
//   (`transport`    tipSpan 11.4  x 2.6  = 29.64 world / 25.85 m = 1.147 - the
//    outlier this entry does not copy)
//
// So the C-17's real 53.0 m x 51.7 m wants 51.4 x 50.1 world. At scale 2.25
// that is 22.85 model units long on a 22.28 model span, i.e. half-span 11.14.
//
// This airframe is built to exactly those stations: the radome apex sits at
// z -11.60 and the fin trailing edge at z +11.25, so the model is 22.85 long,
// x 2.25 = 51.4 world = 53.0 m at 0.97 wu/m. The wing reaches x 11.14, so the
// span is 22.28 x 2.25 = 50.1 world = 51.7 m. Both dimensions land on the real
// aircraft rather than near it, and the length/span ratio comes out 1.025
// against the real 53.0/51.7 = 1.025.
//
// Wing slenderness is set the same way. Root chord 5.2 against tip chord 1.2 on
// half-span 11.14 gives an aspect ratio of 6.96 against the real aircraft's
// 51.7^2 / 353 m2 = 7.57 - fat enough to still read as an airlifter wing at
// thumbnail size, slender enough that it is visibly not the B-52's 12.5-over-6
// bomber wing sitting in the same table.
//
// ---------------------------------------------------------------------------
// Three-way separation from the other two airlifters in this batch
// ---------------------------------------------------------------------------
//   c17   (this) T-tail    | 51.4 world long | winglets      | grey, no chin
//   an124        LOW tail on the fuselage, visibly bigger (69 m / 73 m), and an
//                upward-hinged nose visor. Its tailplane must NOT be on the fin.
//   il76         T-tail like this one, but a GLAZED CHIN under the nose and a
//                white+blue airline scheme. Its tell is the chin, so this
//                aircraft deliberately carries a plain dark radome and nothing
//                at all under the forward fuselage except the gear pods.
//
// Sera grey. This is a Sera (US) airlifter, painted off the existing
// `transport` grey so the two read as the same air force, darkened one step so
// the purpose-built hull is distinguishable from the generic one when both are
// in the air.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;
  const transport = AIRCRAFT_TYPES.transport;
  const transportAI = ENEMY_AI_PROFILES.transport;
  if (!transport || !transportAI) {
    throw new Error("[c17] expected the transport aircraft and AI templates to exist");
  }

  const theme = {
    primary: 0x808b95,
    secondary: 0x565f68,
    accent: 0x2e353b,
    canopy: 0x8fe0ff,
    exhaust: 0xa8b6c0,
    // 22.85 model units x 2.25 = 51.4 world = 53.0 m at the roster's 0.97 wu/m.
    scale: 2.25,
    variant: "c17"
  };

  // BALANCE TODO: placeholder. Every performance number below is the enemy
  // `transport`'s, unchanged - same speeds, same rates, same HP, same unarmed
  // contract (gunDamage 0, missileCapacity 0). Only identity, dimensions and
  // paint are authored here.
  ctx.addAircraft("c17", {
    ...transport,
    id: "c17",
    label: "C-17 GLOBEMASTER III",
    role: "Strategic Airlifter",
    tag: "ENEMY",
    enemyOnly: true,
    blurb: "四発の戦略輸送機。高翼から吊り下げたターボファン、T字尾翼、跳ね上がった後部胴体とウィングレットが特徴。武装は無く、ただ荷を積んで飛ぶ。",
    // Geometric wingtip for the contrail: the wing planform reaches x 11.14 and
    // is added at z +1.20, so the trail leaves the actual tip station rather
    // than an inboard rib. tipZ is the tip chord's midpoint in model space -
    // shape z 2.59..3.88 plus the 1.20 offset gives 3.79..5.08, midpoint 4.44.
    tipSpan: 11.14, tipZ: 4.44,
    theme
  }, { order: false });

  // BALANCE TODO: placeholder. The unarmed transport AI verbatim - attackRange
  // 0 is what makes it a target rather than an opponent - with only the hitbox
  // corrected for a hull that is 12% smaller in world units than the generic
  // transport's (3.0 x 51.4/58.6 world length ~ 2.6).
  ctx.addEnemyProfile("c17", {
    ...transportAI,
    label: "C-17",
    hitboxScale: 2.6,
    theme
  });

  ctx.addAircraftModel("c17", {
    // Top view in the shared 40x44 box, nose up. Traced off the model rather
    // than drawn freehand: every vertex is a real part station run through
    // x = 20 + 1.60*mx, y = 1.5 + 1.60*(mz + 11.6), so the outline and the
    // aircraft cannot drift apart. 1.60 is the largest factor that fits both
    // the 11.14 half-span and the 22.85 length inside the box.
    //
    // Reading down the page: a blunt radome, the parallel slab sides of the
    // hold, the swept high wing out to a wide tip, then the aft body VISIBLY
    // NARROWING, and finally the T-tail's stabiliser as its own wide bar right
    // at the back. The narrow waist between wing and tailplane is the read: an
    // An-124's fuselage-mounted tailplane sits on a body that is still full
    // width there, so its outline has no waist at all.
    silhouette:
      "M20 1.5 L21.1 3.7 L22.4 6.9 L22.4 17.8 L37.8 26.1 L37.8 28.2 " +
      "L23.5 25.8 L21.8 33.5 L21.2 34.5 L28.5 35.3 L28.5 37.3 L22.2 " +
      "38.1 L20 38.1 L17.8 38.1 L11.5 37.3 L11.5 35.3 L18.8 34.5 L18.2 " +
      "33.5 L16.5 25.8 L2.2 28.2 L2.2 26.1 L17.6 17.8 L17.6 6.9 L18.9 " +
      "3.7 L20 1.5 Z",

    build(env) {
      const {
        geometry, extrudedSurface, verticalSurface,
        primary, secondary, accent, canopy, dark, light, navL, navR,
        add, addFlame
      } = env;

      // ---- Planforms ------------------------------------------------------
      // THE wing. Every number here is the real aircraft's, converted at the
      // 0.97 wu/m in this file's header and divided by theme.scale 2.25:
      //
      //   half-span  25.85 m -> 11.14   (the tipSpan the airframe entry states)
      //   root chord  9.80 m ->  4.22
      //   tip chord   3.00 m ->  1.29
      //   LE sweep 25 deg     ->  5.19 of z across the half-span
      //
      // giving a wing area of 61.4 model units and an aspect ratio of 8.09
      // against the real aircraft's 7.57. Both edges sweep AFT - the leading
      // edge by 5.19 and the trailing edge by 2.26 - which is what a tapered
      // swept wing does.
      //
      // The first pass got this backwards. It used a 5.2 root chord and raked
      // the trailing edge FORWARD (root TE at z 3.8, tip TE at 3.4), which
      // makes the outline a triangle: from above the aircraft read as a delta
      // rather than as an airlifter, because a delta is exactly the shape a
      // wing has when its trailing edge is straight and its leading edge sweeps
      // into it. Getting the real chords in is what fixes it - the wing is now
      // visibly SLENDER, which is the point.
      //
      // The comparison that matters is inside this game: the B-52's wingBomber
      // is 12.5 half-span over a 6.2 root chord with a near-straight trailing
      // edge, and the generic wingTransport is 11.4 over 7.0 (AR ~5.2, visibly
      // stubby). This is slimmer than both.
      const wingC17 = extrudedSurface([
        [0, -2.60], [1.9, -2.30], [11.14, 2.59], [11.14, 3.88], [3.2, 2.30],
        [0, 1.62], [-3.2, 2.30], [-11.14, 3.88], [-11.14, 2.59], [-1.9, -2.30]
      ], 0.30);

      // T-tail stabiliser. Half-span 5.3 - 48% of the wing's, which is a big
      // tailplane by fighter standards and the correct proportion for a heavy
      // that has to trim a shifting load. Swept 21 deg so it reads as part of
      // the same design as the wing, and wide enough that at thumbnail size the
      // top of the fin is unmistakably a horizontal bar rather than a point.
      const stabC17 = extrudedSurface([
        [0, -1.5], [5.3, 0.6], [5.3, 1.8], [1.6, 2.3],
        [-1.6, 2.3], [-5.3, 1.8], [-5.3, 0.6]
      ], 0.28);

      // The fin, drawn rather than borrowed. geometry.fin is a fighter fin -
      // short root, raked tip - and scaling it tall enough to carry a T-tail
      // stretched the rake into a swept spike. This one is a transport fin: a
      // 5.0 root chord narrowing to 2.8 at the tip over a 7.6 blade, swept back
      // 26 deg, with a broad tip for the stabiliser to sit on.
      //
      // verticalSurface maps shape +x onto model -z, so the LEADING edge of a
      // swept-back fin is at POSITIVE shape-x and the tip chord shifts NEGATIVE
      // relative to the root. Getting this backwards draws a forward-swept fin,
      // which on a T-tail puts the stabiliser out ahead of the aircraft.
      //
      // The sweep is set by where the TIP has to end up, not by taste: rooted at
      // z 7.50 the tip chord runs z 8.41..11.21, and the stabiliser runs
      // 7.45..11.25. They overlap along their whole length, which is what welds
      // the T together. An earlier pass used a 33 deg sweep on a 6.0 root chord
      // and the tip chord landed at 10.4..13.0 - the stabiliser then had to sit
      // a unit and a half behind the fin it was supposed to be standing on, and
      // the side view read as a tailplane floating off the back of the aircraft.
      const finC17 = verticalSurface([
        [-2.2, 0], [2.8, 0], [-0.91, 7.6], [-3.71, 7.6]
      ], 0.34);

      // ---- Fuselage -------------------------------------------------------
      // A slab hold, near-constant in section from the flight deck to the wing
      // trailing edge. The width is not a taste call: the real fuselage is
      // 6.86 m across on a 51.7 m span = 13% of span, so at this scale it wants
      // a half-width of 1.48 model units. The shared cylinder's aft radius is
      // 1.55, so sx 0.96 puts it exactly there. sy 0.84 makes it ~6.0 m tall.
      //
      // The first pass ran sx 1.30 (half-width 2.02, 18% of span) and the body
      // ate the wing root from above - the aircraft read as a fat tube with
      // stubs rather than as a wing with a hull hung under it. On an airlifter
      // the wing has to look like the big part.
      //
      // Stations: the shared cylinder is 11.5 long, so at sz 1.20 centred on
      // z -2.3 it runs z -9.20 .. +4.60 - the nose section forward and the
      // upswept section aft pick up from those ends.
      add(geometry.fuselage, primary, 0, 0, -2.3, 0.96, 0.84, 1.20);

      // ③ UPSWEPT AFT BODY. Two short sections that both LIFT and NARROW:
      // y +0.85 at sx 0.78 into y +2.05 at sx 0.50, so the body climbs 2.05 and
      // shrinks to just over half its width across 6.8 units of length. The
      // narrowing is as much of the read as the lift is: a section that rises
      // without shrinking looks like a broken back rather than a ramp.
      //
      // The aft end stops at z 11.0, INSIDE the fin's trailing edge at 11.25.
      // The first pass ran the tail cone out to 11.54 - past everything - and
      // the side view showed a long straight tube overhanging the tail, which
      // is the one thing an upswept aft body is supposed to not look like.
      add(geometry.fuselage, primary, 0, 0.85, 6.3, 0.78, 0.72, 0.365);
      add(geometry.fuselage, primary, 0, 2.05, 9.5, 0.50, 0.52, 0.261);

      // The ramp itself, under the upswept section: a flat wedge on the
      // underside running up and aft, in `secondary` so the door line is
      // visible against the body. This is what the upsweep is FOR, and drawing
      // it is what stops the tail cone from reading as a simple taper.
      add(geometry.panel, secondary, 0, 0.10, 6.0, 1.70, 0.22, 4.2);
      add(geometry.panel, secondary, 0, 1.30, 9.0, 1.10, 0.20, 3.0);
      // Cargo door side rails, in `dark`, running the length of the ramp
      // section. Without them the aft body is one smooth grey taper and reads
      // as empty; two hard lines converging with the narrowing hull is what
      // says "the back of this aircraft opens".
      for (const side of [-1, 1]) {
        add(geometry.panel, dark, side * 0.92, 0.42, 6.1, 0.14, 0.36, 4.0);
        add(geometry.panel, dark, side * 0.58, 1.50, 9.0, 0.12, 0.30, 2.8);
      }

      // Nose. The cone is 4.2 long with its apex 2.1 forward of its station, so
      // at sz 1.14 on z -9.21 the apex lands at z -11.60 - the forward end of
      // the 22.85-unit length this airframe's scale note is built on. Blunt
      // (radius 1.02 x sx 1.16 = 1.18 against a body half-width of 1.48, over a
      // 4.8-long taper) because a cargo radome is a fat dome, not the fighter
      // spike the same primitive draws at fighter proportions.
      add(geometry.nose, primary, 0, -0.05, -9.21, 1.30, 1.12, 1.14);
      // Radome cap: a low dome, so the front of the aircraft is ROUNDED rather
      // than pointed - a pointed nose on a transport reads as a bomber. Kept
      // FLAT against the cone (sz 0.55 on a station 0.5 behind the apex) so it
      // blends the taper instead of hanging off it as a ball, which is what a
      // deeper sphere did in the first pass.
      //
      // Deliberately plain, with nothing at all under it: the Il-76 in this
      // same batch is identified by its glazed chin, so this aircraft carries
      // no glazing whatsoever forward of the flight deck.
      add(geometry.canopy, dark, 0, -0.05, -10.60, 0.62, 0.56, 0.55);

      // Flight deck: high on the crown and well forward, a shallow blister
      // rather than a fighter bubble. On the real aircraft the windscreen is a
      // narrow band on top of a very deep forebody, which is exactly the
      // proportion that says "big" - a canopy scaled to the body would make the
      // whole aircraft read as a fighter photographed close up.
      add(geometry.canopy, canopy, 0, 0.94, -7.30, 0.62, 0.36, 1.40);
      add(geometry.panel, dark, 0, 1.16, -8.00, 0.66, 0.09, 1.60);

      // Landing-gear pods down the lower fuselage sides. The C-17's main bogies
      // retract into external blisters and they are one of the type's clearest
      // tells from the side and from below. Set out at x 1.42 so they bulge
      // past a 1.48 half-width body rather than sitting inside it, and kept
      // shallow so they do not widen the aircraft's read from above.
      for (const side of [-1, 1]) {
        add(geometry.panel, secondary, side * 1.42, -0.72, 0.20, 0.62, 0.62, 5.2);
        add(geometry.panel, dark, side * 1.68, -0.84, 0.20, 0.22, 0.40, 4.6);
      }

      // ---- ① The high wing and four underslung pods -----------------------
      // y +1.34: the wing sits ON the crown of a body whose top is at +1.30,
      // not through its middle. Everything else in the roster mounts at or
      // below the centreline, so the shoulder mount alone identifies the
      // airlifter family from head-on before any other feature resolves.
      add(wingC17, secondary, 0, 1.34, 1.20);

      // Wing root fairing. On a real airlifter this is a big object - the wing
      // box plus its fairing runs most of the hold's length - and drawing it
      // small leaves the wing looking laid on top of the fuselage like a plank.
      // It spans z -2.20..+4.60, i.e. from ahead of the root leading edge
      // (-1.40) back to the end of the parallel body, which is what gives the
      // top view a continuous centre structure instead of a thin wing crossing
      // an empty tube.
      //
      // Kept NARROWER than the fuselage (half-width 1.32 against 1.49) so it
      // reads as a fillet rather than as a second, wider hull.
      add(geometry.panel, primary, 0, 1.02, 1.20, 2.64, 0.62, 6.8);

      // FOUR pods, at x 4.45 and x 8.05, hung BELOW the wing on visible pylons.
      // Stations follow the swept leading edge, which at those two span
      // stations sits at z +0.67 and z +2.35, so each pod is placed to put its
      // intake ~2.3 FORWARD of the wing above it and its exhaust just aft of
      // the leading edge. Standing clear of the leading edge is what makes the
      // engines countable from above: in the first pass the pods sat under the
      // wing and the top view showed a plain grey planform with nothing on it.
      // They also step aft with the sweep the way real underwing pods do;
      // setting both at the same z draws a straight pod row, which is the
      // B-52's arrangement and the one thing this must not look like.
      //
      // The engines hang LOW: nacelle centres at y -0.10 and +0.02 against a
      // wing underside of +1.17, so each pod's crown clears the wing by ~0.15
      // and the pylon boxes visibly bridge the gap. That gap is the whole
      // point - four DISCRETE pods under a wing is what separates this from the
      // B-52's four twin-pod pairs in the same roster.
      for (const side of [-1, 1]) {
        // Nacelle bodies. rearBody is a 3.1-long cylinder tapering 1.35 -> 0.95
        // toward +z, which is the right way round for a turbofan: fat intake
        // lip, narrower exhaust. Big (0.80 x 1.35 = 1.08 radius) because a
        // high-bypass fan on a 51.7 m wing is a very large object and undersized
        // pods make the aircraft read as a regional turboprop.
        add(geometry.rearBody, secondary, side * 4.45, -0.10, -0.85, 0.80, 0.80, 1.55);
        add(geometry.rearBody, secondary, side * 8.05, 0.02, 0.85, 0.76, 0.76, 1.45);
        // Intake lips, in `light` so each pod has a bright ring at its front -
        // four bright rings standing forward of a grey wing is what makes the
        // engine count legible when the pods are only a few pixels wide.
        add(geometry.nozzle, light, side * 4.45, -0.10, -3.00, 1.18, 1.18, 0.70);
        add(geometry.nozzle, light, side * 8.05, 0.02, -1.15, 1.12, 1.12, 0.70);
        // Exhaust cones and the flames, at the aft end of each pod.
        add(geometry.nozzle, accent, side * 4.45, -0.10, 1.40, 0.94, 0.94, 0.90);
        add(geometry.nozzle, accent, side * 8.05, 0.02, 2.90, 0.90, 0.90, 0.90);
        addFlame(side * 4.45, -0.10, 2.40, 0.58, 0.58);
        addFlame(side * 8.05, 0.02, 3.85, 0.55, 0.55);
        // Pylons: the visible struts from pod to wing underside. Tall enough
        // (sy 1.30 / 1.20 on a unit box) that the gap between nacelle and wing
        // is real rather than implied - a pod flush against the wing reads as a
        // wing-root bulge, not as an engine. Each spans from its nacelle's
        // crown up to the leading edge above it.
        add(geometry.panel, primary, side * 4.45, 0.62, 0.10, 0.30, 1.30, 2.4);
        add(geometry.panel, primary, side * 8.05, 0.72, 1.80, 0.26, 1.20, 2.2);

        // ③ WINGLETS. Swept-back blades standing on the geometric tip at
        // x 11.14, 2.6 units proud of it. Rooted on the tip chord, which with
        // the wing's own z 1.20 offset runs z 3.79..5.08 - so the blade is
        // centred at 4.44 and raked back so its top trails its bottom, which is
        // the real winglet's sweep and the thing that stops it reading as a
        // wingtip missile rail.
        //
        // 2.6 units on an 11.14 half-span is 23%, against the real aircraft's
        // 2.9 m on 25.85 m = 11%. Deliberately doubled: a scale-accurate
        // winglet disappears below ~8 px, and this is one of the three reads
        // this model is not allowed to lose. It is also drawn in `secondary`
        // rather than `primary` so it separates in value from the wing it
        // stands on - at the first pass's `primary` it vanished into the
        // planform from every angle except dead astern.
        //
        // A plain box, because at 2.6 tall x 1.5 in chord a box IS the shape.
        // Canted 0.12 rad outboard so it does not look bolted on square.
        add(geometry.panel, secondary, side * 11.14, 2.60, 4.44, 0.20, 2.60, 1.50, side * -0.12);
        add(geometry.panel, accent, side * 11.14, 3.80, 4.70, 0.22, 0.30, 0.90, side * -0.12);
      }

      // ---- ② The T-tail ---------------------------------------------------
      // The fin roots at z +7.50 on the upswept body's crown (y +1.75) and
      // stands 7.6 units tall, so the stabiliser sits at y +9.35 - more than
      // three fuselage diameters above the spine. Nothing at all is mounted on
      // the fuselage aft of the wing, which is half of what makes a T read as a
      // T: the horizontal surface is not just high, it is the ONLY horizontal
      // surface back there. (The An-124 in this batch must do the opposite -
      // its tailplane goes on the fuselage - and that is the whole difference.)
      add(finC17, secondary, 0, 1.75, 7.50, 1.00, 1.00, 1.00);

      // The stabiliser, ON TOP, at z +8.95 so its chord (7.45..11.25) covers
      // the fin's tip chord (8.41..11.21) end to end. The fin's sweep carries
      // its tip 1.45 aft of its root, so placing the stabiliser at the root's z
      // would hang it off the fin's leading edge in mid-air - which is exactly
      // what the first pass did.
      add(stabC17, primary, 0, 9.35, 8.95, 1.00, 1.00, 1.00);
      // Bullet fairing at the junction. Every T-tail has one, and at thumbnail
      // size it is what visually welds the two surfaces into a single T instead
      // of leaving a fin and a floating bar.
      add(geometry.canopy, secondary, 0, 9.35, 9.30, 0.42, 0.44, 1.60);

      // ---- Details --------------------------------------------------------
      // Dorsal spine fairing from the wing root back to the fin, in `primary`
      // one step proud of the body: it ties the wing box to the tail and stops
      // the upswept section from looking like a separate part.
      add(geometry.panel, primary, 0, 1.42, 4.60, 0.36, 0.30, 5.2);
      // Cargo door outline on the belly, under the hold.
      add(geometry.panel, dark, 0, -1.20, -0.60, 1.40, 0.09, 6.2);
      // Fin leading-edge fairing (dorsal fillet), so the fin has a rooted base
      // rather than emerging from the skin as a blade.
      add(geometry.panel, secondary, 0, 1.92, 5.60, 0.26, 0.50, 3.0);
      // Nav lights on the geometric tips, at the winglet roots (tip chord
      // midpoint z 4.44).
      add(geometry.canopy, navL, -11.14, 1.40, 4.44, 0.20, 0.20, 0.20);
      add(geometry.canopy, navR, 11.14, 1.40, 4.44, 0.20, 0.20, 0.20);
    }
  });
}
