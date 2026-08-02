// F-117A NIGHTHAWK - the first operational faceted stealth aircraft.
//
// Enemy/support-only registration: { order: false }, no AIRCRAFT_ORDER entry,
// no CAMPAIGNS edit, no mission touched, no balance pass. Every flight number
// is inherited wholesale and marked BALANCE TODO. The work in this file is the
// SHAPE, and the shape is three things nothing else in the roster has:
//
//   1. FACETS. The whole airframe is flat planes meeting at hard angles - the
//      1970s answer to radar, before curved-surface solvers existed. There is
//      not one cylinder, cone or sphere in the build below: no `fuselage`, no
//      `nose`, no `rearBody`, no `canopy` sphere. Every part is either an
//      extruded planform (a polygon with a flat top and a flat bottom) or a
//      box panel rolled to a deliberate angle, so every silhouette edge in the
//      contact sheet is a straight line and every surface break is a crease.
//      This is the identity, and it is the one that has to survive at
//      thumbnail size.
//   2. An ARROWHEAD planform. One continuous 67.5 deg swept delta from a
//      pointed nose to a straight trailing edge, with wing and fuselage as the
//      same object - the F-117 has no wing root because it has no fuselage to
//      have a root against. From above it is a single triangle, notched at the
//      back where the two exhaust slots and the tail bay sit.
//   3. INWARD-canted V-tails, and this is deliberately the mirror of the YF-23
//      already in the roster. The Nighthawk's ruddervators lean IN toward each
//      other over the tail (they shield the exhaust deck between them); the
//      YF-23's lean OUT. Two aircraft, two black V-tails, opposite cant - so
//      the pair have to be told apart by which way the V opens, and this one
//      opens downward-outward from a narrow top.
//
// Told apart from the b2 (all-wing, 52 m span, no tail at all, long straight
// spanwise line) by being an ARROWHEAD with a body and a tail on it - the
// B-2's whole read is width and the absence of anything vertical, this one is
// a compact dart that is longer than it is wide.
//
// Scale: the real F-117A is 20.09 m long on a 13.20 m span, against the F-22's
// 18.92 / 13.56 - so it must come out ~6% LONGER and ~3% NARROWER than the
// Raptor parked next to it. Measured off the live `raptor` branch rather than
// guessed, using the same stations the YF-23 header measured: that model runs
// z -10.39 (nose tip) to 8.15 (nozzle shell) = 18.54 model units, and
// 18.54 x its scale 0.96 = 17.80 world for 18.92 m. That fixes the roster's
// exchange rate at 0.941 world units per metre.
//
//   target length 20.09 m x 0.941 = 18.91 world
//   target span   13.20 m x 0.941 = 12.42 world  ->  half-span 6.21
//
// This airframe runs z -9.6 (nose apex) to 9.1 (V-tail trailing edge) = 18.7
// model, and 18.7 x scale 1.01 = 18.89 world - 1.061x the Raptor against a
// real ratio of 1.062. Half-span is 6.15 x 1.01 = 6.21 world, 0.944x the
// Raptor's 6.58 against a real 0.973. Slightly narrower than the true ratio on
// purpose: the drawn planform carries its full width right back to a straight
// trailing edge, where the Raptor's half-span number is a pointed tip station,
// so equal numbers would draw a visibly wider aircraft than the real one is.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;
  // The A-10C is the template, not the F-22: the F-117 is a subsonic strike
  // aircraft that carries two bombs and runs away, and the Raptor's numbers
  // would make it a dogfighter. This is still a placeholder either way.
  const hog = AIRCRAFT_TYPES.a10;
  const hogAI = ENEMY_AI_PROFILES.a10 || ENEMY_AI_PROFILES.f22;
  if (!hog || !hogAI) {
    throw new Error("[f117] expected the a10 aircraft entry and an enemy AI template to exist");
  }

  // Sera (US) palette, and the only airframe in the roster painted to be
  // ILLEGIBLE. The real aircraft is one flat non-reflective black; the model
  // has to be readable on a dark contact sheet anyway, so the three body tones
  // are three near-blacks a hair apart (0x14161a / 0x0b0c0f / 0x1e2228) and the
  // separation is carried by the FACET NORMALS instead of by colour. That is
  // the correct way round for this aircraft: on a faceted hull every plane
  // catches the key light differently, so the creases draw themselves and any
  // real contrast in the paint would read as panel lines the F-117 does not
  // have.
  //
  // `accent` is the one exception and it is barely lighter - it marks the two
  // exhaust slot linings, which are the only place the real aircraft is not
  // black (heat-resistant tile). Exhaust is a dull ember rather than the
  // Raptor's cyan afterburner: the F-117's platypus nozzles were built to hide
  // the plume, so a bright torch behind it would contradict the whole airframe.
  const theme = {
    primary: 0x14161a,
    secondary: 0x0b0c0f,
    accent: 0x1e2228,
    canopy: 0x2b3138,
    exhaust: 0x6e7a86,
    scale: 1.01,
    variant: "f117"
  };

  // BALANCE TODO: placeholder. Every performance number below is the A-10C's,
  // unchanged. The real F-117 is faster than a Warthog, far more fragile, and
  // carries no gun at all - none of which the numbers say yet.
  // `spw` is a PLAYER contract (the hangar's special-weapon rack) so it is
  // stripped rather than inherited; an enemy-only airframe has no way to use
  // one and spreading it wholesale would hand it a rack it never draws.
  const { spw: _playerOnlySpw, ...hogWithoutSpw } = hog;

  ctx.addAircraft("f117", {
    ...hogWithoutSpw,
    id: "f117",
    label: "F-117A NIGHTHAWK",
    role: "Stealth Attack",
    tag: "ENEMY",
    enemyOnly: true,
    blurb: "全面が平面で構成された初の実用ステルス攻撃機。矢じり形の機影と内側に傾いたV字尾翼を持ち、レーダーにほとんど映らない。夜陰に紛れて拠点だけを正確に叩き、空戦は行わない。",
    // Geometric wingtip for the contrail. The planform's widest station is the
    // trailing-edge corner at (+/-6.15, 4.9) and the surface is added at
    // z 0.0, so the tip sits exactly there - the trail leaves the actual back
    // corner of the arrowhead rather than a mid-chord station a copied number
    // would have put it at.
    tipSpan: 6.15, tipZ: 4.9,
    theme
  }, { order: false });

  // BALANCE TODO: placeholder. The AI profile is the template's with nothing
  // but the paint and the radar colour changed, so an F-117 fights exactly
  // like the aircraft it was copied from until someone tunes it.
  ctx.addEnemyProfile("f117", {
    ...hogAI,
    label: "F-117A",
    theme
  });

  ctx.addAircraftModel("f117", {
    // Top view in the shared 40x44 box, nose up. Traced off the model rather
    // than drawn freehand: every vertex is a real part station run through
    // x = 20 + 2.44*mx, y = 1.5 + 2.24*(mz + 9.6), so the outline and the
    // aircraft cannot drift apart.
    //
    // Reading down the page: the nose apex, the 67.5 deg leading edge straight
    // out to the back corners with a single mid-span kink where the real
    // aircraft's leading edge changes sweep, then the trailing edge coming
    // back inboard in the two steps that make the tail bay notch, and the two
    // V-tail blades on the centreline behind it. No curve anywhere in the
    // path - every command is a straight L, which is the point of the shape.
    silhouette:
      "M20 1.5 L26.4 16.6 L35.0 32.5 L35.0 34.5 L27.4 34.5 L26.2 39.6 " +
      "L22.6 39.6 L21.4 42.5 L20 41.2 L18.6 42.5 L17.4 39.6 L13.8 39.6 " +
      "L12.6 34.5 L5.0 34.5 L5.0 32.5 L13.6 16.6 Z",

    build(env) {
      const {
        geometry, extrudedSurface, verticalSurface,
        primary, secondary, accent, canopy, dark, navL, navR,
        add, addFlame
      } = env;

      // ---- The faceted arrowhead ------------------------------------------
      // ONE planform carries the whole aircraft. There is no separate wing and
      // no separate fuselage anywhere below, because the F-117 does not have
      // them: the leading edge runs unbroken from the nose apex at z -9.6 out
      // to the back corners at (+/-6.15, 4.9), and the trailing edge steps back
      // inboard from there. A conventional fuselage laid on top of this would
      // destroy the read instantly - the arrowhead has to be edge to edge.
      //
      // The leading edge is drawn in TWO segments with a kink at (3.4, -2.4),
      // because the real aircraft's is: 67.5 deg over the forward body, then
      // slightly less out to the tip. A single straight edge draws a plain
      // delta and this aircraft is not a delta, it is a faceted dart. The kink
      // is what a viewer reads as "hand-cut planes" rather than "cone".
      //
      // The trailing edge steps in on each side (6.15 at z 4.9 -> 1.7 at z 3.6)
      // so the tail bay is a NOTCH in the back of the triangle rather than one
      // straight line. The notch is deliberately NARROW (+/-1.7) rather than
      // wide: the V-tails root at +/-2.45, and if the notch reached out that
      // far the blades would be standing in the hole instead of on the deck
      // either side of it. Roots outboard of the notch, exhausts inboard of the
      // roots - the aft end has three things on it and they cannot overlap.
      const outline = (k) => ([
        [0, -9.6],
        [1.2 * k, -6.9], [3.4 * k, -2.4], [6.15 * k, 4.4], [6.15 * k, 4.9],
        [1.7 * k, 4.9], [1.7 * k, 3.6], [-1.7 * k, 3.6], [-1.7 * k, 4.9],
        [-6.15 * k, 4.9], [-6.15 * k, 4.4], [-3.4 * k, -2.4], [-1.2 * k, -6.9]
      ]);

      // FOUR stacked slabs of the same outline at shrinking WIDTH build the
      // faceted cross-section. Each is thin and sits a step higher and narrower
      // than the one below, so a spanwise cut through the aircraft is a stepped
      // chevron - wide and flat at the bottom, narrow at the ridge - and every
      // step edge catches the key light as its own plane. This is how a
      // flat-plane aircraft is built out of extruded surfaces: the facets ARE
      // the steps.
      //
      // The width is narrowed by REDRAWING the polygon rather than by scaling
      // the mesh, because `add`'s sx would also drag the nose apex inboard and
      // the sz needed to keep the length would move the tail. Each slab is its
      // own geometry with its own vertices, so the apex stays on the centreline
      // at z -9.6 on every one of them and the stack tapers in span alone -
      // which is what a chine does.
      //
      // A single thick slab was the first pass and it rendered as a paper
      // aeroplane: correct outline, no volume, no creases, unreadable from the
      // side. The stack is what puts the shape back without introducing a
      // single curved surface.
      // The steps also SHORTEN as they narrow (the z offset plus the sz on the
      // upper slabs), so the stack tapers fore-and-aft as well as in span.
      // Without that the side view is a brick: five slabs of identical length
      // stacked flat, which is exactly what the second pass drew - a rectangle
      // with a nose on it and no wedge anywhere. The taper is what turns the
      // profile into the shallow dart the real aircraft has.
      //
      // DEPTH is set from the real proportions rather than by eye, because the
      // third pass got this wrong in the other direction: it stacked the slabs
      // 0.18 apart and the whole aircraft came out 1.1 units deep on an 18.7
      // length - a ratio of 0.06 against the real aircraft's 3.78 m on 20.09 m,
      // which is 0.19. It read as a sheet of paper from the side. At 0.42 per
      // step the stack spans y -0.95 to +1.35 = 2.3, plus the canopy on top of
      // it, which lands the model at 0.16 - shallow, as the aircraft is, but a
      // solid rather than a plate.
      // ALL ONE TONE. The fourth pass alternated `secondary` and `primary` up
      // the stack to "help the steps read" and it did the opposite: five slabs
      // in two colours drew five horizontal STRIPES down the side view, and the
      // aircraft looked like a pile of plates rather than one hull with creases
      // in it. Painting every slab the same colour hands the whole job to the
      // facet normals, which is what the header says this aircraft's legibility
      // rests on - each step's vertical edge faces sideways and its top faces
      // up, so the key light separates them on its own, and it separates them
      // as SHADING rather than as paint.
      add(extrudedSurface(outline(1.0), 0.3), primary, 0, -0.52, 0);
      add(extrudedSurface(outline(0.80), 0.3), primary, 0, -0.10, 0.15, 1, 1, 0.97);
      add(extrudedSurface(outline(0.58), 0.3), primary, 0, 0.32, 0.35, 1, 1, 0.92);
      add(extrudedSurface(outline(0.36), 0.3), primary, 0, 0.74, 0.6, 1, 1, 0.85);
      // The ridge cap: the narrowest slab of all, which is what the spine of
      // the real aircraft comes to. At 0.18 of full width its edges sit at
      // +/-1.1, inboard of the canopy shoulders, so the glass sits ON the ridge.
      add(extrudedSurface(outline(0.18), 0.3), primary, 0, 1.12, 0.9, 1, 1, 0.76);

      // ---- The underside vee ----------------------------------------------
      // The belly comes to a shallow keel rather than being a flat plate, and
      // it is built the same way as the deck: two more slabs of the outline
      // going NARROW as they go DOWN, so the lower half mirrors the upper half
      // and the section closes into a diamond.
      //
      // The first pass used long rolled box panels here instead. They were 12
      // units of straight box on a planform whose width changes at every
      // station, so from above they stuck out past the leading edge on both
      // sides and squared off the tail - the TOP view read as a rectangular
      // raft with an arrowhead somewhere under it, which is the one view the
      // identity has to survive. Slabs of the outline itself cannot do that,
      // because they ARE the outline.
      // Both in `secondary`, the darkest tone on the aircraft: the underside of
      // a real F-117 is in permanent shadow and the two belly steps are the one
      // place where a tone break helps rather than stripes the hull, because it
      // falls on the line where the aircraft turns from deck to belly.
      add(extrudedSurface(outline(0.70), 0.28), secondary, 0, -0.86, 0.1, 1, 1, 0.97);
      add(extrudedSurface(outline(0.42), 0.28), secondary, 0, -1.16, 0.3, 1, 1, 0.92);

      // ---- The nose ---------------------------------------------------------
      // No cone. The forebody is flat planes meeting at a point, built as a
      // narrow extruded diamond at the apex with smaller ones stacked above and
      // below it, so the nose is a faceted pyramid rather than a blunt wedge.
      // The real aircraft's nose is the most photographed faceting on it and a
      // `geometry.nose` cone here would throw the whole identity away in one
      // line - which is why no cone, sphere or cylinder appears anywhere in
      // this build.
      const noseFacet = (k) => ([
        [0, -2.6 * k], [0.62 * k, 0.5], [0, 1.1], [-0.62 * k, 0.5]
      ]);
      add(extrudedSurface(noseFacet(1.0), 0.42), primary, 0, -0.10, -7.6);
      add(extrudedSurface(noseFacet(0.66), 0.38), primary, 0, 0.30, -7.6);
      add(extrudedSurface(noseFacet(0.62), 0.38), secondary, 0, -0.50, -7.6);

      // ---- The canopy -------------------------------------------------------
      // FLAT PANES, not a bubble. The F-117's canopy is five flat pieces of
      // glass in a hard frame and it is the single most recognisable detail on
      // the forward fuselage. Built as a small extruded wedge (the flat top
      // pane) with two rolled side panes under it - `geometry.canopy` is a
      // sphere and is deliberately never used on this airframe.
      const canopyTop = extrudedSurface([
        [0, -1.35], [0.5, -0.45], [0.5, 0.95], [0, 1.35], [-0.5, 0.95], [-0.5, -0.45]
      ], 0.2);
      add(canopyTop, canopy, 0, 1.62, -4.6);
      add(geometry.panel, canopy, -0.52, 1.44, -4.6, 0.1, 0.4, 2.2, 0.42);
      add(geometry.panel, canopy, 0.52, 1.44, -4.6, 0.1, 0.4, 2.2, -0.42);
      // The frame: a dark bar along each side of the glass and one across the
      // front, which is what makes the panes read as separate flat pieces
      // instead of one dark blob on an already-black aircraft.
      add(geometry.panel, dark, -0.58, 1.3, -4.6, 0.09, 0.1, 2.4, 0.42);
      add(geometry.panel, dark, 0.58, 1.3, -4.6, 0.09, 0.1, 2.4, -0.42);
      add(geometry.panel, dark, 0, 1.72, -5.9, 0.9, 0.09, 0.14);

      // ---- The intakes ------------------------------------------------------
      // Flat grated boxes sunk into the upper surface either side of the
      // canopy. On the real aircraft these are covered by a fine radar grid,
      // which at this scale reads as a dark rectangle - so a dark rectangle is
      // exactly what they are. They sit ABOVE the wing plane and face forward,
      // unlike every other jet in the roster whose intakes hang below or beside
      // a round body.
      for (const side of [-1, 1]) {
        add(geometry.panel, dark, side * 1.5, 0.92, -3.2, 1.0, 0.6, 1.7, side * 0.14);
        // The splitter lip outboard of each grate, standing proud - a thin
        // edge that makes the dark grate read as a recess rather than a decal.
        add(geometry.panel, primary, side * 2.06, 0.92, -3.2, 0.12, 0.68, 1.8, side * 0.14);
      }

      // ---- The platypus exhausts -------------------------------------------
      // Two WIDE, FLAT slots across the trailing edge, not round nozzles. The
      // F-117's exhaust is spread into a letterbox and shielded above by a
      // shelf so the plume cools before anything can see it from below, and
      // that shelf is why there is a lip over each slot here.
      for (const side of [-1, 1]) {
        // Set at +/-4.5, well OUTBOARD of the V-tail roots at +/-2.6. The aft
        // end carries three features and they each need their own station: the
        // notch on the centreline (+/-1.7), the tail blades either side of it
        // (+/-2.6), the exhaust slots outboard of those. The first two passes
        // put the slots at +/-1.55, which buried them under the tails where
        // nothing could see them and left the outer trailing edge blank.
        //
        // The slot itself, in `accent` - the tile lining, and the one
        // non-black thing on the aircraft.
        add(geometry.panel, accent, side * 4.5, -0.16, 4.4, 1.5, 0.16, 1.1);
        // The shielding shelf over it, in body colour, overhanging aft.
        add(geometry.panel, primary, side * 4.5, 0.04, 4.7, 1.7, 0.12, 1.5);
        // Flat and WIDE (sx 1.5, sy 0.12), and short: a cooled letterbox plume,
        // not an afterburner torch. `exhaust` is a grey ember for the same
        // reason.
        addFlame(side * 4.5, -0.16, 5.2, 1.5, 0.14);
      }

      // ---- The V-tails, canted INWARD --------------------------------------
      // The blades lean toward each other over the tail bay, which is the
      // mirror of the YF-23's outward cant and the feature that tells the two
      // black V-tailed aircraft in this roster apart at a glance.
      //
      // Sign convention: `add`'s rz is a roll about +z, and the YF-23 roots its
      // blades at x -3.05 with rz +0.96 and at x +3.05 with rz -0.96 to lean
      // them OUT. Rooting at the same signs with the OPPOSITE rz therefore
      // leans them IN, which is what is written below. Getting this backwards
      // draws a YF-23 tail on an F-117, which is the one mistake this airframe
      // cannot survive.
      //
      // 0.84 rad = 48 deg from vertical - steeper than the real aircraft's 35,
      // and deliberately so. At 35 the blades stand close enough to upright
      // that from three-quarter rear they draw as two plain fins and a viewer
      // has to measure the lean to find it; the cant has to be past 45 before
      // "leaning in" is what the eye reports first. Every airframe in this
      // roster exaggerates the one feature it is identified by, and on this one
      // that feature is which way the V closes.
      //
      // Verified numerically rather than by eye, because this sign is the whole
      // feature: a blade tip at shape-y 3.0 rolled by rz lands at world
      // x = root - 3.0 sin(rz), so root -2.6 with rz -0.84 puts the left tip at
      // -2.6 + 2.23 = -0.37 and root +2.6 with rz +0.84 puts the right tip at
      // +2.6 - 2.23 = +0.37. The tips end up 0.74 apart while the roots are 5.2
      // apart - the V is seven times wider at the bottom than at the top, which
      // is inward cant and the exact mirror of the YF-23's outward one.
      //
      // SIZE and SPACING are why this is the third pass. Pass one drew a 3.3
      // chord on a 3.6 blade and it filled the aft half of the SIDE view as one
      // black mass. Pass two cut it to a 2.2 chord on a 2.5 blade rooted at
      // +/-1.95 and went too far the other way: the two blades were so close
      // together and so short that they overlapped into a single silhouette and
      // read as ONE swept fin. The V only reads if there is visible SKY between
      // the two blades, so this pass moves the roots out to +/-2.45 and takes
      // the blades up to 3.2 - the gap between the roots is now wider than
      // either blade is tall, and the two surfaces cross nothing.
      //
      // They are also painted in `accent` rather than `primary`. On an aircraft
      // where every tone is a near-black, two surfaces standing away from the
      // hull at an angle disappear into the hull behind them; a half-step
      // lighter is the minimum that lets the far blade separate from the near
      // one, which is what makes the pair legible as a V rather than as a fin.
      //
      // Proportion holds: 3.2 of length on a 2.4 root chord. As on the YF-23, a
      // blade wider than it is long projects as a fin from the side no matter
      // how it is canted, so the length has to beat the chord.
      const vtail = verticalSurface([
        [-1.35, 0], [1.15, 0], [-0.1, 3.0], [-1.0, 3.0]
      ], 0.2);
      add(vtail, accent, -2.6, 0.5, 4.5, 1, 1, 1, -0.84);
      add(vtail, accent, 2.6, 0.5, 4.5, 1, 1, 1, 0.84);

      // ---- Facet detail -----------------------------------------------------
      // The weapons bay doors: two long rectangles down the belly centreline.
      // The F-117 carries everything internally - there is not one pylon, rail,
      // drop tank or missile anywhere on this airframe, and that absence is as
      // much of the read as the facets are.
      add(geometry.panel, dark, -0.45, -1.34, 0.6, 0.7, 0.06, 4.6);
      add(geometry.panel, dark, 0.45, -1.34, 0.6, 0.7, 0.06, 4.6);

      // The two IR sensor apertures, faceted like everything else - small dark
      // boxes rather than balls, one under the nose and one on top of it.
      add(geometry.panel, dark, 0, -0.66, -6.4, 0.7, 0.26, 1.0);
      add(geometry.panel, dark, 0, 0.62, -6.2, 0.6, 0.22, 0.9);

      // The four pitot booms off the nose apex. On the real aircraft these are
      // the only things sticking out of the airframe anywhere, and they are why
      // a photograph of the nose reads as "spiky". Short (1.1) and set close
      // in: the first pass ran them 1.6 forward of a -9.6 apex, which put four
      // spikes past the nose in the TOP view and blunted the point the whole
      // planform builds to.
      for (const [bx, by] of [[-0.26, 0.22], [0.26, 0.22], [-0.26, -0.2], [0.26, -0.2]]) {
        add(geometry.panel, dark, bx, by, -9.9, 0.06, 0.06, 1.1);
      }

      // Nav lights on the back corners of the arrowhead, at the widest station
      // - which on this planform is the trailing-edge corner, not a mid-chord
      // tip. Small: they are the only emissive thing on a matt black aircraft
      // and anything larger would be the first thing a player sees.
      add(geometry.panel, navL, -6.0, -0.4, 4.6, 0.16, 0.1, 0.3);
      add(geometry.panel, navR, 6.0, -0.4, 4.6, 0.16, 0.1, 0.3);
    }
  });
}
