// B-2 SPIRIT - the flying wing. A strategic bomber with no fuselage and no
// tail, which is a thing no other airframe in this game is.
//
// Enemy/support-only registration: no AIRCRAFT_ORDER entry ({ order: false }),
// no CAMPAIGNS edit, no mission touched, no balance table adjusted. The
// airframe exists so a mission or an ace profile can name it; putting it in
// the hangar is a separate decision made elsewhere.
//
// Every flight number is inherited wholesale from the in-game B-52H (`bomber`)
// and marked BALANCE TODO. The work in this file is the SHAPE, and the shape
// is three things nothing else in the roster has:
//
//   1. A PURE FLYING WING. No fuselage tube, no vertical fin, no tailplane,
//      no nacelle hanging in the airstream - the entire aircraft is one
//      continuous planform. Every other airframe in this game, the B-52H
//      included, is "a tube with wings and a fin bolted on". This one has to
//      read as a single sheet from every angle or it is not a B-2. That
//      absence is the identification, the way the YF-23's missing fins are.
//
//   2. The DOUBLE-W SAWTOOTH TRAILING EDGE. Reading from the centreline
//      outboard on one side, the trailing edge goes: aft point (the centre
//      "beaver tail") -> forward notch -> aft point -> forward notch -> tip.
//      Two full W's across the full span, four notches in all. This is the
//      single most recognisable thing about the aircraft from above and the
//      one feature that must survive at thumbnail size. An earlier flying-wing
//      shape in this codebase (the MQ-99's `wingUav`) has a SINGLE shallow W;
//      drawing that here would produce a big drone, not a Spirit, so the
//      notches are cut deep (2.0 model units, ~18% of the length) and there
//      are unmistakably four of them.
//
//   3. The CENTRE BULGE: a low, wide cockpit blister on the leading-edge
//      centreline, flanked by the two BURIED-ENGINE DORSAL INTAKE humps at
//      +/-2.7. The real aircraft's only vertical relief is this cluster - the
//      engines are inside the wing, breathing through serrated humps that sit
//      on TOP of the surface, and exhausting through slots let into the upper
//      deck rather than round nozzles hanging off a back end. Nothing on this
//      airframe protrudes below the wing plane at all.
//
// Scale: the real B-2 is 21.0 m long on a 52.4 m span - a length/span ratio of
// 0.40, where every other aircraft in this game sits near 1.0 and the B-52H
// (48.5 / 56.4) sits at 0.86. It is by far the widest and, relative to its
// width, by far the shortest airframe in the roster, and that proportion IS
// the silhouette.
//
// Calibrated off the live `bomber` branch rather than guessed. That model
// carries geometry.wingBomber at half-span 12.5 model units on theme scale
// 2.2, so its span is 12.5 x 2 x 2.2 = 55.0 world against a real B-52 span of
// 56.4 m: the world unit is 1.025 m at heavy-bomber size. (Its LENGTH is not
// usable as a reference - nose tip z -15.55 to tail turret z ~11.6 is 27.15
// model = 59.7 world against a real 48.5 m, so the B-52H is drawn about 23%
// long. Span is the honest calibration and the one used here.)
//
// At 1.025 m per world unit the B-2 wants 51.1 world of span and 20.5 world of
// length. On theme scale 1.8 that is a half-span of 14.2 model units against a
// length near 11.4 model, and the wing is drawn to +/-14.2 exactly: span comes
// out 28.4 x 1.8 = 51.1 world = 52.4 m, dead on the real figure.
//
// Length lands slightly over. The airframe runs z -6.90 (nose apex) to +4.92
// (the TIP trailing edge, which after the notches were cut deep is the aftmost
// point on the aircraft, further back than the centre "beaver tail" at 4.48) =
// 11.82 model, so 11.82 x 1.8 = 21.3 world = 21.8 m against a real 21.0 m.
// That is 4% long, and it is the deliberate cost of making the sawtooth
// legible - see the notch-depth note in the planform below. Length/span is
// 0.416 against the real 0.401.
//
// Against the B-52H sitting next to it: 1.14x the span and 0.36x the length,
// where the real pair is 0.93x span and 0.43x length by those same numbers.
// The model reads wider and stubbier than the real ratio, which is the correct
// direction to err - at thumbnail size the whole point is "impossibly wide,
// impossibly short".
//
// Leading-edge sweep is the real aircraft's 33 deg: the apex at z -6.90 runs
// out to the tip at z +2.32, and 14.2 x tan(33 deg) = 9.22 is exactly that
// run. Both leading edges are one straight unbroken line from tip to tip
// through the nose, which is the other half of the planform read.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;
  const heavy = AIRCRAFT_TYPES.bomber;
  const heavyAI = ENEMY_AI_PROFILES.bomber;
  if (!heavy || !heavyAI) {
    throw new Error("[b2] expected the bomber aircraft and AI templates to exist");
  }

  // Sera stealth palette. Darker than anything else flying: the B-2's whole
  // scheme is one near-black grey with no contrast panel and no marking a
  // player could resolve, so `primary` and `secondary` are only two steps
  // apart rather than the usual five. The accent is deliberately dim - a
  // bright trim line would undo the "one continuous unlit sheet" read that the
  // paint is doing half the work of.
  //
  // The canopy is small and dark-tinted rather than the F-22's gold wash: on
  // the real aircraft the glass is a narrow band low on the leading edge, and
  // a bright canopy at this size would draw the eye to the one place the
  // aircraft is trying not to have a feature.
  const theme = {
    primary: 0x24272b,
    secondary: 0x191c1f,
    accent: 0x3b4650,
    canopy: 0x5d7480,
    exhaust: 0x9fb6c4,
    scale: 1.8,
    variant: "b2"
  };

  // BALANCE TODO: placeholder. Every performance number below is the in-game
  // B-52H's, unchanged. Only identity, dimensions and paint are authored here.
  // The real B-2 is subsonic like the B-52 but far more survivable, and if
  // this airframe is ever fielded its numbers should say so (lower radar
  // signature has no representation in this game yet, so it would land as
  // health or as detection range rather than as speed).
  ctx.addAircraft("b2", {
    ...heavy,
    id: "b2",
    label: "B-2 SPIRIT",
    role: "Stealth Strategic Bomber",
    tag: "ENEMY",
    enemyOnly: true,
    blurb: "全翼のステルス戦略爆撃機。胴体も尾翼も持たず、鋸歯状の後縁だけが機影を描く。レーダーにはほとんど映らない。",
    // Geometric wingtip for the contrail. The planform tip is at half-span
    // 14.2 with a tip chord running z 2.32 to 4.92, and the wing is added at
    // z 0, so the trail leaves the middle of the actual tip edge at (14.2,
    // 3.62) rather than a root station inherited from the B-52H's 12.5 / 1.2.
    tipSpan: 14.2, tipZ: 3.62,
    theme
  }, { order: false });

  // BALANCE TODO: placeholder. The AI profile is the B-52H's heavy template
  // with nothing but the paint changed, so a B-2 flies exactly like a
  // Stratofortress until someone tunes it.
  ctx.addEnemyProfile("b2", {
    ...heavyAI,
    label: "B-2",
    theme
  });

  ctx.addAircraftModel("b2", {
    // Top view in the shared 40x44 box, nose up. Traced off the model rather
    // than drawn freehand: every vertex is a real planform station run through
    // x = 20 + 1.268*mx, y = 1.5 + 3.43*(mz + 6.9), so the outline and the
    // aircraft cannot drift apart. (1.268 = 18/14.2 fills the box width with
    // the span; 3.43 = 39/11.38 fills its height with the length. The two
    // scales differ because the box is portrait and this aircraft is not -
    // which is itself worth noting: the B-2 is the only airframe here whose
    // silhouette has to be squashed to fit a nose-up box at all.)
    //
    // Reading down the page: the nose apex, both straight leading edges out to
    // the pointed tips, and then the double-W back along the trailing edge -
    // tip, forward notch, aft point, forward notch, the centre point, and the
    // mirror of all of it. Nothing else. There is no fin to draw, no
    // tailplane, and no fuselage outline anywhere: the planform IS the
    // aircraft.
    silhouette:
      "M20 1.5 L38 33.1 L38 42 L33.5 30 L29 41.3 L24.5 29.2 L20 40.5 " +
      "L15.5 29.2 L11 41.3 L6.5 30 L2 42 L2 33.1 Z",

    build(env) {
      const {
        geometry, extrudedSurface,
        primary, secondary, accent, canopy, dark, navL, navR,
        add, addFlame
      } = env;

      // ---- THE planform ---------------------------------------------------
      // The whole aircraft, in one surface.
      //
      // THE TRAILING EDGE IS BUILT ON CHORD, NOT ON Z. That is the correction
      // that made this planform work, and it is worth stating plainly because
      // the obvious approach fails: the first pass placed the four notches by
      // eyeballing absolute z values, and at the outboard notch the chord
      // collapsed to 0.43 units - the cut had eaten almost the whole way to
      // the leading edge, leaving no material to carry a tooth. What rendered
      // was a smooth shallow V, i.e. the MQ-99's single-W with extra vertices.
      //
      // So the edge is derived instead. Take a mean trailing edge from a
      // linear chord taper - root chord 11.38 at the centreline down to 2.60
      // at the tip, against a leading edge at z = -6.90 + x*tan(33 deg) - and
      // then cut each notch a FIXED 3.40 forward of that line. Because the
      // taper and the sweep very nearly cancel, the mean trailing edge sits
      // almost straight across at z 4.5-4.9, so every notch is the same visual
      // depth and no station is ever starved of chord (the minimum is 1.39, at
      // the outer notch). Stations are evenly spaced at quarter-span intervals
      // so the teeth are the same size, which is what makes them read as a
      // repeating sawtooth rather than as damage.
      //
      // THE NOTCHES ARE CUT DEEP ON PURPOSE, and that is the third correction
      // this planform needed. An earlier pass cut them 1.90, which is close to
      // scale and which measured out at 6.7% of span - about 25 pixels on the
      // contact sheet. Rendered, it read as a straight trailing edge with two
      // small nicks near the centreline: technically drawn, and invisible as a
      // feature. At 3.40 the peak-to-valley is 3.29 units, 12% of span, ~44
      // pixels, and the sawtooth is the first thing the eye finds. A feature
      // that only survives measurement is not an identification cue, and this
      // one is the whole aircraft.
      //
      // Reading the loop from the nose apex down the RIGHT side:
      //
      //   [  0.00, -6.90]  nose apex, on the centreline
      //   [ 14.20,  2.32]  right tip, leading edge - one straight 33 deg run
      //   [ 14.20,  4.92]  right tip, trailing edge (2.60 of tip chord, so the
      //                    tip is a real edge rather than a mathematical point;
      //                    a point renders as a jagged sliver at distance and
      //                    there has to be somewhere to put the nav light)
      //   [ 10.65,  1.41]  OUTER NOTCH   - 3.40 forward of the mean TE
      //   [  7.10,  4.70]  outer aft point
      //   [  3.55,  1.19]  INNER NOTCH   - 3.40 forward of the mean TE
      //   [  0.00,  4.48]  centre trailing point, the aftmost thing on the
      //                    aircraft (the "beaver tail")
      //   ...then the mirror of all of it back up the left side.
      //
      // Four notches, two per side: that is the double-W, and it is the whole
      // reason this planform is worth its vertex count.
      //
      // Depth 0.55: this surface is the entire aircraft's thickness, so it is
      // roughly twice what a fighter's wing gets. A flying wing IS its own
      // fuselage and a 0.3 sheet reads as paper from the side view.
      const wingB2 = extrudedSurface([
        [0, -6.90],
        [14.20, 2.32], [14.20, 4.92],
        [10.65, 1.41], [7.10, 4.70],
        [3.55, 1.19], [0, 4.48],
        [-3.55, 1.19], [-7.10, 4.70],
        [-10.65, 1.41], [-14.20, 4.92], [-14.20, 2.32]
      ], 0.55);

      // ---- Body -----------------------------------------------------------
      // The planform goes down at y 0 and it is the aircraft's reference
      // plane, its fuselage and its only structural member. Nothing below is
      // allowed to break that plane downward: on the real aircraft the
      // underside is a single smooth face and the whole silhouette from ahead
      // is a thin knife edge. Everything added from here sits ON TOP.
      add(wingB2, primary, 0, 0, 0);

      // The centre body swell. Not a fuselage - a THICKENING of the wing
      // around the crew station and the bays, done as a second, smaller,
      // taller copy of the planform's inner section rather than as a cylinder.
      // A cylinder here would put a tube on a flying wing and lose the whole
      // aircraft, which is what the first pass did with geometry.fuselage.
      //
      // Half-span 4.6 (a third of the wing's), running from the nose apex back
      // to just short of the centre trailing point, and lifted to y 0.30 so it
      // stands ~0.55 proud of the surface it sits on. The result from the side
      // is a wing whose centre section is thick and whose outer panels taper
      // to nothing, which is exactly the real profile.
      // Its trailing edge is held FORWARD of the wing's own at every station
      // it spans, so the swell can never fill in a notch: the wing's edge runs
      // 4.48 at the centreline down to 1.33 at x 3.40 (it is diving toward the
      // inner notch at 1.19), and this body runs 3.20 down to 0.90 against it.
      // Burying a tooth under the centre body would undo the planform work
      // above at the one station where the eye looks first, and the deeper the
      // notches were cut the more room this shape had to give back.
      const centreBodyB2 = extrudedSurface([
        [0, -6.60], [2.20, -4.20], [3.20, 0.20],
        [2.90, 0.90], [0, 3.20],
        [-2.90, 0.90], [-3.20, 0.20], [-2.20, -4.20]
      ], 0.62);
      add(centreBodyB2, primary, 0, 0.30, 0);

      // ---- The cockpit blister and the intake humps -----------------------
      // THE upper-surface cluster, and identity point 3. All of it lives in
      // the forward centre body between x -3.4 and +3.4, and nothing else on
      // the aircraft rises above the wing plane at all - so this cluster is
      // the only thing that gives the silhouette a top edge, and its shape is
      // therefore the aircraft's entire profile view.
      //
      // The blister itself: LOW and WIDE (sy 0.34 against a fighter canopy's
      // 0.5-0.6, sx 1.15), set well forward at z -4.4 where the real
      // aircraft's glass sits just aft of the leading edge. A tall canopy here
      // would read as a cockpit stuck on a wing rather than a wing with a
      // cockpit inside it.
      add(geometry.canopy, primary, 0, 0.52, -4.4, 1.30, 0.42, 2.10);
      // The glass, in two flat panels either side of the centreline rather
      // than one dome: on the real aircraft the windows are four separate
      // rectangles low in the blister and there is solid structure between
      // them. Sunk into the blister (y 0.60 against its 0.52 top at ~0.75).
      add(geometry.panel, canopy, -0.62, 0.60, -5.05, 0.42, 0.30, 1.05, 0.10);
      add(geometry.panel, canopy, 0.62, 0.60, -5.05, 0.42, 0.30, 1.05, -0.10);

      // The two DORSAL INTAKE humps. Buried engines, so the inlets are on the
      // upper surface and there is nothing under the wing to see. Set at
      // +/-2.70, aft of the blister, and built as a low mound (sy 0.36) with
      // its own dark inlet face let into the front so the hump reads as
      // something that breathes rather than as a bump.
      for (const side of [-1, 1]) {
        add(geometry.canopy, primary, side * 2.70, 0.50, -1.90, 1.00, 0.36, 2.30);
        // The inlet mouth, in `dark` - the deepest tone available, so it reads
        // as a hole in the hump. Tilted (rz) so the two mouths splay outboard
        // the way the real aircraft's serrated lips do.
        add(geometry.panel, dark, side * 2.70, 0.46, -3.70, 0.80, 0.44, 0.16, side * -0.14);
        // Serration on the inlet lip: two small forward-facing teeth per side.
        // Every opening on this aircraft is sawtoothed for the same reason the
        // trailing edge is, and at this size two teeth is the most that can be
        // resolved.
        add(geometry.panel, secondary, side * 2.30, 0.50, -3.90, 0.26, 0.22, 0.34, 0.5);
        add(geometry.panel, secondary, side * 3.10, 0.50, -3.90, 0.26, 0.22, 0.34, 0.5);
      }

      // ---- Exhaust: slots in the upper deck, not nozzles ------------------
      // The engines exhaust over the TOP of the wing through shallow troughs
      // that end well short of the trailing edge, so the hot gas is shielded
      // from below by the aircraft's own structure. There is no nozzle
      // anywhere on this airframe and nothing hangs off the back: the flames
      // sit on the deck at deck height, ahead of the trailing edge.
      //
      // Placed at +/-2.10, INBOARD of the +/-2.70 intake humps that feed them,
      // and stopped well forward. Every z here is set by the trailing edge
      // rather than chosen, because the edge DIVES forward through this region
      // on its way to the inner notch at (3.55, 1.19): it is at z 2.53 at
      // x 2.10 and only 2.12 at x 2.55, which is the outboard limit of the
      // flame's own radius.
      //
      // `addFlame` is the trap. It scales x and y but NOT z, and geometry.flame
      // is a 2.6-long cone, so the flame always reaches 1.3 beyond the point it
      // is placed at no matter what is passed in. Two passes were spent moving
      // the exhaust outboard and then aft before that was the thing measured;
      // both rendered as bright slivers poking through the sawtooth, which is
      // debris on the one feature this model cannot afford to have any on.
      // With the flame centred at z 0.50 its tip lands at 1.80, clear of the
      // 2.12 edge above it.
      //
      // The inset is also the real aircraft's arrangement rather than a
      // compromise: the exhaust stops well short of the trailing edge
      // precisely so the structure shields the hot gas from below.
      for (const side of [-1, 1]) {
        // The trough floor, in `dark`, sunk into a `primary` deck so it reads
        // as a slot and not a stripe.
        add(geometry.panel, dark, side * 2.10, 0.32, -0.60, 0.90, 0.14, 2.60);
        // The hot section at the aft end, in `accent` - the one bright thing
        // on the upper surface.
        add(geometry.panel, accent, side * 2.10, 0.34, 0.30, 0.76, 0.12, 1.00);
        // Flat and WIDE (sx 0.9, sy 0.16): a slot exhaust lying on the upper
        // deck, not a round pipe pointing aft.
        addFlame(side * 2.10, 0.34, 0.50, 0.90, 0.16);
      }

      // ---- Surface detail --------------------------------------------------
      // Panel lines running parallel to the leading edge. On an aircraft with
      // no features these are most of what tells the eye the surface has size
      // and direction; without them the wing reads as a flat cardboard cutout
      // at every distance.
      //
      // These are drawn as thin extrudedSurface SLIVERS in the x-z plane, not
      // as boxes, and that is a correction worth recording. `add`'s only
      // rotation argument is `rz`, which turns a part in the x-y plane - it
      // cannot rake a box along a swept line in PLAN. Feeding the sweep angle
      // to it (as the first pass did) stands the strip on edge and tips it up
      // out of the wing, which rendered as four loose sticks hanging off the
      // leading edge. A surface built from its own two endpoints has no
      // rotation to get wrong: the sliver is simply four points on the wing.
      //
      // Both lines are derived from the SAME leading-edge equation the
      // planform uses, z = -6.90 + x*tan(33 deg), and each is placed at a
      // FRACTION OF LOCAL CHORD rather than at a fixed distance aft of it.
      // That distinction is the second correction this block needed: a fixed
      // offset works inboard where the chord is 11 units deep and runs clean
      // off the back of the wing outboard where it is under 2. The outer line
      // did exactly that - at x 13.2 it sat at z 5.1 against a trailing edge
      // at 3.5, so 1.5 units of it hung in open air past the tip and crossed
      // the outer notch on the way, which is where the stray bright spikes at
      // the sawtooth came from. Chord-relative placement makes overhang
      // impossible at every station by construction.
      const TAN_SWEEP = Math.tan(0.576); // 33 deg, the planform's leading edge
      const leadZ = (x) => -6.90 + x * TAN_SWEEP;
      // Local chord from the same linear taper the trailing edge was built on
      // (11.38 at the root to 1.70 at the tip), less the notch depth, so a
      // line placed at a fraction of it clears the sawtooth as well.
      const chordZ = (x) => (11.38 * (1 - x / 14.20) + 2.60 * (x / 14.20)) - 3.40;
      for (const [xa, xb, frac] of [[2.60, 11.60, 0.34], [5.20, 11.80, 0.62]]) {
        const za = leadZ(xa) + chordZ(xa) * frac;
        const zb = leadZ(xb) + chordZ(xb) * frac;
        const panelLineB2 = extrudedSurface([
          [xa, za], [xb, zb], [xb, zb + 0.20], [xa, za + 0.20],
          [-xa, za + 0.20], [-xb, zb + 0.20], [-xb, zb], [-xa, za]
        ], 0.06);
        add(panelLineB2, secondary, 0, 0.30, 0);
      }
      // The two weapons-bay doors, side by side on the centreline underside,
      // outlined dark. Set just BELOW the wing plane (y -0.30) - the only
      // thing on the aircraft that is, and only barely, because on the real
      // aircraft the closed doors are flush and the outline is a paint line.
      add(geometry.panel, dark, -1.30, -0.30, -0.60, 0.80, 0.04, 4.00);
      add(geometry.panel, dark, 1.30, -0.30, -0.60, 0.80, 0.04, 4.00);
      // Sawtooth trim: a thin strip laid along each of the four notch cuts, so
      // a notch keeps its edge under flat light. The notches are the identity
      // and they have to survive the one lighting condition that flattens
      // everything else.
      //
      // Same sliver treatment and for the same reason - a box rotated by `rz`
      // stood these on end and put four bright spikes through the trailing
      // edge. Each cut runs from a notch vertex to the aft point outboard of
      // it: inner (3.55, 1.19)->(7.10, 4.70), outer (10.65, 1.41)->(14.20,
      // 4.92). Both have the identical run (3.55 out, 3.51 aft), which is what
      // a repeating sawtooth means and a useful check that the planform above
      // came out regular. The strip is inset 0.16 forward of the cut so it
      // sits ON the wing rather than overhanging the edge it is tracing.
      for (const [x0, z0] of [[3.55, 1.19], [10.65, 1.41]]) {
        const x1 = x0 + 3.55, z1 = z0 + 3.51;
        const notchTrimB2 = extrudedSurface([
          [x0, z0 - 0.16], [x1, z1 - 0.16], [x1, z1 - 0.38], [x0, z0 - 0.38],
          [-x0, z0 - 0.38], [-x1, z1 - 0.38], [-x1, z1 - 0.16], [-x0, z0 - 0.16]
        ], 0.06);
        add(notchTrimB2, secondary, 0, 0.30, 0);
      }
      // Nav lights on the geometric tips of the planform, at the wing station.
      // z 3.62 is the middle of the tip chord (2.32 to 4.92), so they sit ON
      // the tip edge rather than floating past it.
      add(geometry.canopy, navL, -14.00, 0.06, 3.62, 0.16, 0.16, 0.16);
      add(geometry.canopy, navR, 14.00, 0.06, 3.62, 0.16, 0.16, 0.16);
    }
  });
}
