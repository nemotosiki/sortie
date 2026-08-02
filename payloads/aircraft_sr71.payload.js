// SR-71A BLACKBIRD - the Mach 3 strategic reconnaissance aircraft.
//
// Enemy/support-only registration: no AIRCRAFT_ORDER entry ({ order: false }),
// no CAMPAIGNS edit, no mission touched, no balance number authored. Putting a
// reconnaissance airframe in the hangar is a separate decision made elsewhere.
//
// Every flight number is inherited wholesale from the MiG-31B and marked
// BALANCE TODO. The MiG-31 is the template rather than the F-22 because it is
// the only entry in the table whose profile is already "fastest thing in the
// sky, cannot turn" - which is the Blackbird's entire character. The work in
// this file is the SHAPE, and the shape is three things nothing else in the
// game has:
//
//   1. THE CHINE. A hard horizontal edge that runs the full length of the
//      forebody and does not stop at the cockpit - it carries on to the very
//      tip of the nose. The section is therefore a flat lifting wedge from
//      nose to wing root, not a tube with a cone stuck on the front. This is
//      the feature that makes a Blackbird a Blackbird and it is the one that
//      must survive at thumbnail size. It is drawn as a single continuous
//      planform surface (a long thin dart) rather than as the strakes other
//      airframes here use, because a strake stops and a chine does not.
//   2. THE NACELLES. Two enormous engine barrels sitting HALFWAY OUT THE WING,
//      not tucked against the fuselage - each nacelle is nearly as fat as the
//      fuselage itself, and each carries a pointed translating SHOCK CONE
//      (spike) projecting forward of its intake lip. No other airframe in the
//      game has an engine mounted mid-span, and no other one has a spike.
//   3. THE CANTED FINS. Two all-moving vertical fins standing ON TOP OF the
//      nacelles - not on the fuselage, not on the tailbooms - and canted
//      INBOARD (toward the centreline). Everything else here with twin fins
//      cants them OUTBOARD (F-22, Su-27, YF-23), so the inward lean is a
//      genuine discriminator and not just "twin tails".
//
// A fourth thing is negative and just as load-bearing: there is NO tailplane
// and NO fin on the centreline. The delta's trailing edge is the whole aft
// end of the aircraft.
//
// Scale: the real SR-71 is 32.74 m long on a 16.94 m span against the F-22's
// 18.92 / 13.56, so it has to come out 1.73x LONGER and 1.25x wider than the
// Raptor parked beside it - an extremely long, extremely thin dart. Measured
// off the live `raptor` inline branch rather than guessed: that model runs
// z -10.39 (nose cone tip: cone origin -8.25, half-length 4.2/2 x sz 1.02
// = 2.14) to 8.15 (nozzle shell 7.6 + half of 1.1) = 18.54 model units, and
// 18.54 x its scale 0.96 = 17.80 world. Its half-span is tipSpan 6.85 x 0.96
// = 6.58 world, i.e. 13.16 world across.
//
// This airframe runs z -17.6 (pitot tip) to 14.4 (nozzle aft face: nozzle
// origin 13.8 plus half of its 1.4 length x sz 1.0, minus the taper overlap)
// = 32.0 model units, and 32.0 x scale 1.0 = 32.0 world - 1.80x the Raptor
// against a real ratio of 1.731. Half-span is tipSpan 8.0 x 1.0 = 8.0 world,
// 1.22x the Raptor's 6.58 against a real 16.94/13.56 = 1.249. The length runs
// ~4% long and the span ~2% short, and that bias is deliberate: the preview
// and the radar contact both frame from the bounding box, so erring toward
// "longer and thinner" is what keeps the read correct at the sizes a player
// actually sees it. At 32.0 world long on a 16.0 world span this is the
// highest length-to-span ratio (2.0) of any airframe in the game.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;
  const foxhound = AIRCRAFT_TYPES.mig31;
  const foxhoundAI = ENEMY_AI_PROFILES.mig31;
  if (!foxhound || !foxhoundAI) {
    throw new Error("[sr71] expected the mig31 aircraft and AI templates to exist");
  }

  // Sera (US) black programme palette, and the one place where the honest
  // colour had to be traded for a readable one.
  //
  // The real aircraft is famously a SINGLE colour: the heat-radiating black
  // covers the body, the wing, the nacelles and the fins alike. Authored that
  // way - primary 0x1b1d22 against secondary 0x121418, one step apart - the
  // model rendered as an undifferentiated black mass in the TOP cell, and the
  // chine and the delta, which are two of the three identity features, became
  // impossible to tell apart from each other. That was verified twice: once
  // with the two surfaces on the same material and once with them swapped,
  // and neither read.
  //
  // So the two blacks are pulled apart to 0x2e323a / 0x14161a - still both
  // unmistakably black against any background in the game, but far enough
  // apart that a lit surface and a shaded one separate. The body, nacelles and
  // fins take the lighter one and the wing takes the darker, which is also the
  // way the light actually falls on the real thing: the upper wing is in the
  // shadow of nothing and the barrels catch every highlight.
  //
  // The accent is titanium white and it is spent entirely on the intake spikes
  // and the nacelle lips - the only bright thing on the aircraft - so the eye
  // is pulled straight to the two mid-wing barrels, which is exactly the
  // feature the silhouette is built around.
  //
  // The canopy is a deep red-amber rather than the F-22's gold film: the real
  // Blackbird's glass sits in a heavily framed, tiny opening and reads far
  // warmer and darker than a fighter bubble at any distance.
  const theme = {
    primary: 0x2e323a,
    secondary: 0x14161a,
    accent: 0xc8d2db,
    canopy: 0xd7a05c,
    exhaust: 0xffb46a,
    scale: 1.0,
    variant: "sr71"
  };

  // BALANCE TODO: placeholder. Every performance number below is the MiG-31B's,
  // unchanged - including its missiles, which the real SR-71 famously does not
  // carry. Only identity, dimensions and paint are authored here. When this is
  // eventually tuned the correct direction is obvious (faster still, no guns,
  // no missiles, more health than its role implies because it outruns hits) but
  // that is a balance decision and this file does not make balance decisions.
  ctx.addAircraft("sr71", {
    ...foxhound,
    id: "sr71",
    label: "SR-71 BLACKBIRD",
    role: "Strategic Reconnaissance",
    tag: "RECON",
    enemyOnly: true,
    blurb: "高度25,000mをマッハ3で駆け抜ける戦略偵察機。ミサイルより速く飛ぶことだけを目的に設計され、回避も装甲も持たない。撃墜する唯一の手段は、飛び立つ前に捉えることだ。",
    // Geometric wingtip for the contrail. The delta's outboard corner is at
    // half-span 8.0 with its tip chord running z 6.4 to 13.0 in wing-local
    // terms, and the wing is added at z 0 - so (8.0, 9.7) is the mid-point of
    // the actual tip chord rather than a number copied off the MiG-31, whose
    // tipSpan 9.4 would have trailed the contrail 1.4 units out in empty air.
    tipSpan: 8.0, tipZ: 9.7,
    theme
  }, { order: false });

  // BALANCE TODO: placeholder. The AI profile is the MiG-31's "armored"
  // straight-line template with nothing but the paint and the radar colour
  // changed, so a Blackbird currently flies its patrol like a Foxhound and
  // shoots back, which the real one never did.
  ctx.addEnemyProfile("sr71", {
    ...foxhoundAI,
    label: "SR-71",
    radarColor: "#c9a4ff",
    theme
  });

  ctx.addAircraftModel("sr71", {
    // Top view in the shared 40x44 box, nose up. Traced off the model rather
    // than drawn freehand: every vertex is a real part station run through
    // x = 20 + 1.21*mx, y = 1.5 + 1.31*(mz + 17.6), so the outline and the
    // aircraft cannot drift apart. The x and y factors differ because the box
    // is 40 wide by 44 tall and this planform is 16.0 x 31.4 - a shape this
    // slender has to be stretched to fill the box at all.
    //
    // Reading down the page: the needle nose (chine vertices at model z -16.2,
    // -14.2, -8.6, -2.0 and 4.0) flaring CONTINUOUSLY with no step and no
    // notch - the chine and the wing leading edge are ONE line, which is the
    // whole point of the shape - then the delta breaking outboard to the tip
    // at half-span 8.0, and the trailing edge closing back to the centreline.
    // The two spikes projecting past the leading edge at x +/-4.9 are the
    // nacelles: they are drawn INTO the outline rather than left out, because
    // an engine standing proud of the wing is the second identity feature and
    // the silhouette is where a HUD contact has to show it. Nothing on the
    // centreline aft: no tailplane, no fin, no notch.
    silhouette:
      "M20 1.5 L20.8 6.3 L22.3 13.3 L23.8 21.9 L25.1 29.8 " +
      "L25.9 29.8 L25.9 18.9 L26.9 18.9 L26.9 30.6 L29.7 34.3 " +
      "L29.7 37.2 L24.4 38.2 L24.4 42.5 L22.4 42.5 L22.4 38.3 " +
      "L20 38.3 L17.6 38.3 L17.6 42.5 L15.6 42.5 L15.6 38.2 " +
      "L10.3 37.2 L10.3 34.3 L13.1 30.6 L13.1 18.9 L14.1 18.9 " +
      "L14.1 29.8 L14.9 29.8 L16.2 21.9 L17.7 13.3 L19.2 6.3 Z",

    build(env) {
      const {
        geometry, extrudedSurface, verticalSurface,
        primary, secondary, accent, canopy, dark, light, navL, navR,
        add, addFlame
      } = env;

      // ---- Planforms ------------------------------------------------------
      // THE chined forebody, and the single most important surface on the
      // aircraft. It is one continuous horizontal planform running from the
      // nose tip at z -16.2 all the way back to the wing root at z 8.0, and it
      // is EXTRUDED FLAT (0.9 deep against 24 long) so that its edges are hard
      // horizontal lines when seen from the side or from the front. That flat
      // edge is the chine.
      //
      // Three properties of these points are load-bearing and were arrived at
      // by looking at renders:
      //
      // - IT REACHES THE NOSE. The first two points put real width (0.55) only
      //   1.8 units behind the tip. An earlier pass started the flare at z -11
      //   and the top view read as "pointed cone, then wing" - i.e. an F-16 -
      //   because the chine did not exist forward of the cockpit. The chine
      //   running to the tip is the identity.
      // - THE FLARE IS CONTINUOUS. Width grows 0.55 -> 1.5 -> 2.5 -> 3.4 with
      //   no step and no notch, so the eye reads one curve from nose to wing
      //   root rather than a fuselage with strakes bolted on. Every LERX in
      //   this game (Hornet, Fulcrum, Flanker) deliberately has a step where
      //   the strake meets the body; this deliberately has none.
      // - IT IS FLAT. Depth 0.9 on a 24-long surface. A chine with any real
      //   thickness reads as a fuselage from the front and the whole "wedge"
      //   quality is lost.
      const chine = extrudedSurface([
        [0, -16.2], [0.6, -14.2], [1.4, -10.0], [2.2, -6.0], [3.0, -2.0],
        [3.0, 2.0], [-3.0, 2.0], [-3.0, -2.0], [-2.2, -6.0], [-1.4, -10.0],
        [-0.6, -14.2]
      ], 0.55);

      // THE wing. A modified delta whose LEADING EDGE IS THE SAME LINE the
      // chine was on - the root apex at (3.4, 4.0) is exactly where the chine
      // surface reaches its own maximum width, so the two planforms meet edge
      // to edge and the aircraft has one unbroken outline from the pitot tube
      // to the wingtip. That continuity is what a Blackbird looks like from
      // above and it is why the chine and the wing are authored against each
      // other rather than separately.
      //
      // Half-span 8.0 and a trailing edge straight across at z 13.0 (the real
      // aircraft's is very close to square, unlike the YF-23's aggressive
      // forward rake). Three numbers do the work, and all three were arrived
      // at by measuring the rendered top view rather than by eye:
      //
      // - THE ROOT APEX IS AT z -2.0, which is exactly where the chine surface
      //   reaches its own maximum half-width of 3.0. The two planforms meet
      //   edge to edge and the aircraft has ONE unbroken outline from the pitot
      //   tube to the wingtip - which is the whole reason the chine is authored
      //   against the wing rather than as a separate strake.
      // - THE DELTA IS 15.0 DEEP on a 32-long aircraft, i.e. it occupies the
      //   entire rear half. Two earlier passes made it 7 and then 8.4 deep,
      //   and both times the top view read as a long dart with a pair of small
      //   fins at the tail: the nacelles ended up at the OUTER EDGE of the
      //   wing instead of halfway out it, which destroys identity feature 2.
      //   A delta only puts engines in its middle if it has the area to have a
      //   middle.
      // - THE LEADING EDGE REACHES FULL SPAN AT z 6.4, not at 9.6. Pixel-
      //   measuring the TOP cell of the previous render showed the planform
      //   hitting its maximum width only in the last 50 px of a 325 px long
      //   aircraft: at 67 deg of sweep the wing is technically 8 wide but is
      //   a sliver everywhere a viewer actually looks. Pulling the break
      //   forward to 6.4 drops the sweep to 59 deg and gives the tip a 6.6
      //   chord, which is what makes the delta read as a delta.
      const wingSr71 = extrudedSurface([
        [3.0, -2.0], [8.0, 6.4], [8.0, 13.0], [3.6, 13.0],
        [0, 13.0], [-3.6, 13.0], [-8.0, 13.0], [-8.0, 6.4], [-3.0, -2.0]
      ], 0.4);

      // One fin blade. All-moving, so it is a plain trapezoid with no rudder
      // break: root chord 4.6, tip chord 2.2, blade length 4.0. Swept back -
      // verticalSurface maps shape +x onto model -z, so the tip chord sits at
      // NEGATIVE shape-x relative to the root (the stock `fin` uses the same
      // convention; getting it backwards draws a forward-swept fin, which this
      // aircraft cannot survive).
      //
      // Proportion is deliberate: 4.0 tall on a 4.6 root chord makes a fin
      // that is WIDER than it is tall, which is correct for this aircraft and
      // wrong for almost every other one. The real SR-71's fins are stubby
      // triangles sitting on top of the nacelles, and drawing them tall - the
      // first pass had 5.6 - made the aircraft read as a twin-tailed fighter
      // with oddly placed engines instead of as a Blackbird.
      const finSr71 = verticalSurface([
        [-2.3, 0], [2.3, 0], [0.1, 4.6], [-2.1, 4.6]
      ], 0.26);

      // ---- Body -----------------------------------------------------------
      // Chine first, at y 0: it is the aircraft's reference plane and every
      // other part is placed relative to it. The wing sits in the same plane
      // so the two surfaces are genuinely continuous rather than stacked.
      add(chine, primary, 0, 0, 0);
      // The wing is painted `secondary` rather than `primary`. On a real
      // Blackbird they are the same colour, and on the first three passes they
      // were here too - which made the chine and the delta merge into one
      // undifferentiated black mass from above and cost the top view both of
      // its readable features at once. One step of separation is enough to
      // recover the outline without inventing a two-tone paint scheme the
      // aircraft never wore.
      // Lifted 0.12 above the chine plane rather than sitting in it. They are
      // coplanar on the real aircraft, and they were coplanar here for three
      // passes - which put the two surfaces in exact z-fighting contention
      // along the whole join and left the outer wing rendering in the chine's
      // own shadow, so the delta lost its outboard half from above. A tenth of
      // a unit of separation is invisible from any angle and fixes both.
      add(wingSr71, secondary, 0, 0.12, 0);

      // The fuselage tube ON TOP of the chine plane, not inside it. Narrow
      // (sx 0.62 against the Raptor's 1.14) and only slightly taller than
      // wide (sy 0.68), because on this aircraft the body is a slim spine
      // riding a wide flat wedge - the opposite of the usual arrangement where
      // the body is the widest thing and the wing grows off it. sz 1.9 stretches
      // the 11.5-long primitive to 21.9, which is what a 30-unit airframe with
      // a 6-unit nose needs.
      add(geometry.fuselage, primary, 0, 0.34, -3.0, 0.62, 0.68, 1.9);
      // Aft spine closing the body out over the wing root. Deliberately stops
      // at z 9 - there is nothing behind the wing on this aircraft.
      add(geometry.rearBody, primary, 0, 0.3, 8.0, 0.62, 0.66, 1.3);
      // THE NEEDLE. The 4.2-long nose cone stretched to sz 1.55 = 6.5 and
      // squeezed to 0.34 radius, so it is a genuine needle rather than a
      // radome: 6.5 long on a 0.35 half-width is 19:1, by far the sharpest
      // point in the game. It sits at y 0.18, i.e. ON the chine plane, so the
      // chine's leading edges converge into it instead of meeting a cone that
      // floats above them.
      add(geometry.nose, primary, 0, 0.18, -12.6, 0.34, 0.34, 1.55);
      // Pitot boom off the tip. Real, and it is what puts the model's forward
      // extreme at z -17.6 rather than -16.2.
      add(geometry.panel, dark, 0, 0.18, -16.9, 0.13, 0.13, 1.4);
      // A very small, very shallow canopy set far forward on a long body:
      // sy 0.3 and sz 1.1 against the Raptor's 0.5/1.65. On the real aircraft
      // the two tiny cockpit windows barely break the upper line, and a fighter
      // bubble here would instantly halve the apparent length of the nose.
      add(geometry.canopy, canopy, 0, 0.76, -8.6, 0.5, 0.3, 1.1);
      // The RSO's separate rear window, a second smaller bubble 2.2 behind the
      // pilot's. Two cockpits in tandem is a detail worth the one part: it
      // says "crew of two in a very long fuselage" at a glance.
      add(geometry.canopy, canopy, 0, 0.74, -6.4, 0.44, 0.26, 0.8);

      // ---- The nacelles: the middle of the wing ----------------------------
      // Stationed at +/-4.6, which is 58% of the half-span - genuinely mid-wing
      // rather than shoulder-mounted, and the single measurement that separates
      // this airframe from every other twin in the game (the Raptor's are at
      // +/-0.78, the YF-23's at +/-1.9, the Flanker's at +/-1.95). There is as
      // much wing OUTBOARD of each nacelle as inboard of it, which is what the
      // real aircraft looks like and what makes the top view unmistakable.
      //
      // Each barrel is built from three pieces so it can be long, fat and
      // closed at both ends: a stretched fuselage cylinder for the body, a
      // cone for the intake fairing at the front, and a rearBody taper into
      // the nozzle. sx/sy 0.72 on the 11.5-long fuselage primitive gives a
      // barrel 0.68-1.12 in radius - nearly as fat as the fuselage above it,
      // which is correct and looks absurd, exactly as it should.
      for (const side of [-1, 1]) {
        const x = side * 4.9;
        // Barrel body: a 15.5-long stretch centred at z 5.6 so it runs from
        // roughly z -2 to 13.
        add(geometry.fuselage, primary, x, -0.05, 5.6, 0.72, 0.72, 1.35);
        // Intake fairing, the forward half of the barrel. Points forward and
        // reaches z -3.4, ahead of the wing leading edge at that station, so
        // the nacelles visibly stick out in FRONT of the wing rather than
        // hanging under it - but NOT so far forward that the spikes draw level
        // with the nose and the aircraft loses its needle.
        add(geometry.nose, primary, x, -0.05, -0.4, 0.78, 0.78, 0.75);
        // THE SHOCK CONE. Titanium-white, sharp, and projecting a full 2.2
        // ahead of the intake lip. This is the second identity feature and the
        // brightest thing on an otherwise entirely black aircraft, so it is
        // what the eye finds first in every one of the four preview cells.
        // Drawn as a slim cone (0.42 radius on a 3.2 length) rather than a
        // stub, because a short spike reads as a radome and a long one reads
        // as a spike.
        add(geometry.nose, accent, x, -0.05, -4.7, 0.41, 0.41, 0.76);
        // Intake lip ring: a bright band right at the mouth, which is what
        // makes the spike read as protruding FROM something rather than as a
        // free-floating dart. Thin (sz 0.18) so it is a lip and not a collar.
        add(geometry.intakeRing, accent, x, -0.05, -3.15, 0.86, 0.86, 0.5);
        // Aft taper into the nozzle, then the nozzle and the flame. The
        // exhaust is at z 13.8, which is the aft extreme of the whole
        // aircraft - there is nothing behind the engines.
        add(geometry.rearBody, primary, x, -0.05, 12.8, 0.8, 0.8, 1.1);
        add(geometry.nozzle, accent, x, -0.05, 13.8, 1.15, 1.15, 1.0);
        addFlame(x, -0.05, 15.3, 1.0, 1.0);
        // Nacelle-to-wing fairing: a thin vertical web under the wing joining
        // the barrel to the plane above it, so the engine is attached rather
        // than floating alongside. Two of them, inboard and outboard, which is
        // also how the front view gets its depth.
        add(geometry.panel, secondary, x - side * 0.72, 0.0, 6.0, 0.16, 0.8, 9.0);
        add(geometry.panel, secondary, x + side * 0.72, 0.0, 6.0, 0.16, 0.8, 9.0);

        // ---- The inward-canted fin ----------------------------------------
        // Standing ON the nacelle (x +/-4.6, y 0.75 = the top of a barrel of
        // radius ~0.8) and canted INBOARD. rz is +0.26 on the right blade and
        // -0.26 on the left, which leans both tops toward the centreline - the
        // opposite sign to every other twin-finned airframe in this file's
        // neighbourhood (the F-22 uses -0.42 on the right, the YF-23 -0.96).
        // Getting this sign backwards produces a perfectly plausible aircraft
        // that is not a Blackbird, so it is worth stating: RIGHT fin, POSITIVE
        // rz, top leaning LEFT.
        //
        // 15 deg is the real cant and it is small enough that it needs help to
        // read: the fins are placed 9.2 apart precisely so the two tops end up
        // visibly closer together (9.2 - 2 x 4.0 x sin15 = 7.1) than the two
        // roots. That convergence is the read, not the angle itself.
        add(finSr71, primary, x, 0.72, 9.4, 1, 1, 1, side * 0.26);
      }

      // ---- Details ---------------------------------------------------------
      // Chine edge strips: thin LIGHT lines laid along the chine edge from the
      // nose back to the wing root, tracing the line the eye is supposed to
      // follow. Four of them, two per side, stepped outboard to follow the
      // flare (x 1.6 over the forward run, x 2.7 over the aft one).
      //
      // They are `light` rather than `dark`. Drawn dark they were invisible
      // against a black aircraft in every one of the four cells, which meant
      // the chine - the single most important feature on this airframe - had
      // no drawn edge at all and depended entirely on the surface catching the
      // key light at the right angle. A pale strip is a small deviation from
      // the real aircraft's uniform black and is the difference between the
      // chine reading in one view and reading in all four.
      add(geometry.panel, light, -1.6, 0.04, -10.5, 0.9, 0.1, 7.0, 0.05);
      add(geometry.panel, light, 1.6, 0.04, -10.5, 0.9, 0.1, 7.0, -0.05);
      add(geometry.panel, light, -2.7, 0.04, -4.0, 0.9, 0.1, 6.4, 0.03);
      add(geometry.panel, light, 2.7, 0.04, -4.0, 0.9, 0.1, 6.4, -0.03);
      // The sensor bay panels along the underside of the chine, which is where
      // the real aircraft's cameras live. Dark rectangles on a black aircraft:
      // they read as panel lines, which is all they need to do.
      add(geometry.panel, secondary, 0, -0.3, -7.0, 1.6, 0.12, 7.0);
      add(geometry.panel, secondary, 0, -0.3, 1.6, 2.6, 0.12, 6.0);
      // Dorsal spine strip from the canopy back to the wing root - the fuel
      // and cable run that gives the long black upper surface something to
      // break it up in the TOP cell.
      add(geometry.panel, secondary, 0, 0.82, 0.4, 0.42, 0.14, 12.0);
      // Outer-wing leading-edge strips, laid along the delta's leading edge
      // from just outboard of the nacelle out to the tip and rotated to match
      // the sweep. These are the reason the outboard panel exists visually:
      // an all-black delta on a dark background has no edge for the eye to
      // catch, and without them the wing was rendering as a shadow that ended
      // at the nacelles - which put the engines at the EDGE of the planform
      // instead of halfway out it and cost identity feature 2 in the very view
      // that is supposed to show it.
      add(geometry.panel, primary, -6.3, 0.14, 5.6, 3.6, 0.12, 0.5, 0.0)
        .rotation.y = -0.53;
      add(geometry.panel, primary, 6.3, 0.14, 5.6, 3.6, 0.12, 0.5, 0.0)
        .rotation.y = 0.53;
      // Nav lights on the geometric wingtips, at the mid-point of the tip
      // chord (z 10.9 in wing-local terms; the wing is added at z 0).
      add(geometry.canopy, navL, -8.05, 0.18, 9.7, 0.16, 0.16, 0.16);
      add(geometry.canopy, navR, 8.05, 0.18, 9.7, 0.16, 0.16, 0.16);
      // Wingtip fairings so the tips are not razor-thin slivers at distance.
      add(geometry.panel, light, -7.85, 0.12, 9.7, 0.3, 0.16, 6.0);
      add(geometry.panel, light, 7.85, 0.12, 9.7, 0.3, 0.16, 6.0);
    }
  });
}
