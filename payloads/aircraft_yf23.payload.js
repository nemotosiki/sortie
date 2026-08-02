// YF-23A BLACK WIDOW II - the prototype that lost ATF to the F-22.
//
// Enemy-only registration: no AIRCRAFT_ORDER entry ({ order: false }), no
// CAMPAIGNS edit, no mission touched. The airframe exists so an ace profile can
// name it; putting it in the hangar is a separate decision made elsewhere.
//
// Every flight number is inherited wholesale from the F-22 and marked
// BALANCE TODO. The work in this file is the SHAPE, and the shape is four
// things the Raptor does not have:
//   1. a true DIAMOND wing - leading edge swept 40 deg out to a pointed tip and
//      the trailing edge swept FORWARD by the same 40 deg back to the root, so
//      the planform is a rhombus rather than the Raptor's clipped diamond
//   2. NO vertical fins and NO tailplane. Two enormous all-moving V-tails
//      canted 55 deg outward do both jobs. This is the aircraft's whole
//      identity and the one feature that must survive at thumbnail size
//   3. a wide, flat, low fuselage the wing grows out of rather than sits on
//   4. widely separated nacelles feeding EXHAUST TROUGHS sunk into the upper
//      deck - the flames sit on top of the aft body, not behind round nozzles
//
// Scale: the real YF-23 is 20.6 m long on a 13.3 m span against the F-22's
// 18.92 / 13.56, so it has to come out ~9% LONGER and ~2% NARROWER than the
// Raptor sitting next to it. Measured off the live `raptor` branch rather than
// guessed: that model spans z -10.39 (nose tip) to 8.15 (nozzle shell) = 18.54
// model units, and 18.54 x its scale 0.96 = 17.80 world; its half-span is
// tipSpan 6.85 x 0.96 = 6.58 world.
//
// This airframe runs z -10.9 (radome tip) to 8.6 (V-tail trailing edge) = 19.5
// model, and 19.5 x scale 0.98 = 19.1 world - 1.07x the Raptor against a real
// ratio of 1.089. Half-span is tipSpan 6.6 x 0.98 = 6.47 world, 0.98x the
// Raptor against a real 0.98. Longer and thinner, which is the correct read.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;
  const raptor = AIRCRAFT_TYPES.f22;
  const raptorAI = ENEMY_AI_PROFILES.f22;
  if (!raptor || !raptorAI) {
    throw new Error("[yf23] expected the f22 aircraft and AI templates to exist");
  }

  // Sera (US) stealth palette, taken off the F-22 line so the two read as the
  // same air force: same graphite/charcoal body, same cyan accent and exhaust.
  // The canopy is the one deliberate difference - the real YF-23's glass was
  // plain tinted rather than the Raptor's gold-film wash, and at a distance the
  // canopy tint is the only paint detail a player can actually resolve.
  const theme = {
    primary: 0x373d45,
    secondary: 0x1d2127,
    accent: 0x35c2e0,
    canopy: 0x8fc4d8,
    exhaust: 0x8cecff,
    scale: 0.98,
    variant: "yf23"
  };

  // BALANCE TODO: placeholder. Every performance number below is the F-22's,
  // unchanged. Only identity, dimensions and paint are authored here; the real
  // YF-23 was faster and less agile than the Raptor and the numbers should
  // eventually say so.
  ctx.addAircraft("yf23", {
    ...raptor,
    id: "yf23",
    label: "YF-23 BLACK WIDOW II",
    role: "Prototype Stealth Fighter",
    tag: "ENEMY",
    enemyOnly: true,
    blurb: "ATF計画で敗れた試作ステルス戦闘機。菱形主翼と大きく外傾したV字尾翼を持ち、F-22より細長く滑らかな機影を描く。ごく一部のエースだけが駆る幻の機体。",
    // Geometric wingtip for the contrail. The rhombus apex is at half-span 6.6
    // and the wing is added at z 0.9, so the tip sits at (6.6, 0.9) - the trail
    // leaves the actual point of the diamond rather than floating inboard of it
    // or trailing from a root station the way a copied number would.
    tipSpan: 6.6, tipZ: 0.9,
    theme
  }, { order: false });

  // BALANCE TODO: placeholder. The AI profile is the F-22's evasive template
  // with nothing but the paint and the radar colour changed, so a YF-23 fights
  // exactly like a Raptor until someone tunes it.
  ctx.addEnemyProfile("yf23", {
    ...raptorAI,
    label: "YF-23",
    theme
  });

  ctx.addAircraftModel("yf23", {
    // Top view in the shared 40x44 box, nose up. Traced off the model rather
    // than drawn freehand: every vertex is a real part station run through
    // x = 20 + 2.18*mx, y = 1.5 + 2.10*(mz + 10.9), so the outline and the
    // aircraft cannot drift apart.
    //
    // Reading down the page: the chined forebody, the rhombus wing out to a
    // POINTED tip at y 26 with its trailing edge raked forward back to the
    // root, and then the two V-tail blades as separate surfaces springing off
    // the trailing edge outboard. No fin, no tailplane, nothing on the
    // centreline aft - the empty tail is as much of the read as the diamond is.
    silhouette:
      "M20 1.5 L21.3 6.8 L22.1 15.2 L22.8 17 L34.4 25.8 L34.4 26.8 " +
      "L27.2 32.9 L26.6 33.6 L34.3 35.7 L32.9 39.1 L26.2 41.8 L23.2 40.6 " +
      "L23.2 35.9 L20 38 L16.8 35.9 L16.8 40.6 L13.8 41.8 L7.1 39.1 " +
      "L5.7 35.7 L13.4 33.6 L12.8 32.9 L5.6 26.8 L5.6 25.8 L17.2 17 " +
      "L17.9 15.2 L18.7 6.8 Z",

    build(env) {
      const {
        geometry, extrudedSurface, verticalSurface,
        primary, secondary, accent, canopy, dark, navL, navR,
        add, addFlame
      } = env;

      // ---- Planforms ------------------------------------------------------
      // THE wing, and a rhombus rather than the Raptor's clipped diamond. The
      // leading edge runs from the root apex at z -5.5 out to a POINTED tip at
      // (+/-6.6, 0), and the trailing edge runs back from that same tip to the
      // root at z 5.5 - forward-swept by the identical 40 deg (6.6 of span
      // against 5.54 of z on both edges). Four edges, two parallel pairs, one
      // point at each corner: that is what makes it a diamond and not a delta,
      // and it is the difference a player sees from above.
      //
      // The tips carry a 0.5-deep chord rather than closing to nothing, because
      // a mathematical point renders as a jagged sliver at distance and there
      // has to be something for the nav light to sit on.
      const wingYf23 = extrudedSurface([
        [0, -5.5], [1.3, -4.4], [6.6, -0.25], [6.6, 0.25], [1.3, 4.4],
        [0, 5.5], [-1.3, 4.4], [-6.6, 0.25], [-6.6, -0.25], [-1.3, -4.4]
      ], 0.3);

      // One V-tail blade, drawn in the vertical plane and rolled outboard by
      // the variant. All-moving, so it is a single trapezoid with no rudder
      // break: root chord 4.2, tip chord 1.3, blade length 4.4.
      //
      // Two things about this shape were arrived at by looking at the render,
      // and both are load-bearing:
      //
      // - PROPORTION. An earlier pass drew a 5.8 root chord on a 3.6 blade and
      //   it read as an F-14's twin fin from the side no matter how far it was
      //   canted, because a blade wider than it is long projects a fin. Making
      //   it longer than its chord (4.4 against 4.2) is what lets the cant show.
      // - TRAILING EDGE. The tip chord is raked FORWARD of the root's (tip TE at
      //   shape -1.5 against the root's -2.1), so the trailing edge sweeps
      //   forward like the wing's. A blade with a straight vertical trailing
      //   edge reads as a fin from the side even at the right proportions.
      //
      // verticalSurface maps shape +x onto model -z, so a SWEPT-BACK blade puts
      // its tip chord at NEGATIVE shape-x relative to the root. The stock `fin`
      // follows the same convention; getting it backwards draws a forward-swept
      // tail, which is the one mistake this planform cannot survive.
      const vtailYf23 = verticalSurface([
        [-2.1, 0], [2.1, 0], [-0.2, 4.4], [-1.5, 4.4]
      ], 0.22);

      // ---- Body -----------------------------------------------------------
      // THE wing goes down first and everything else is placed not to bury it.
      // At y 0.0 it is the aircraft's reference plane: the body sits ON it, the
      // nacelles hang from it and the tails grow off its trailing edge. Every
      // airframe in the game stacks the other way round, and the reason this
      // one does not is that the diamond has to be visible edge to edge from
      // above or the aircraft is unidentifiable.
      add(wingYf23, secondary, 0, 0, 0.9);

      // Wide and FLAT: sx 1.2 against the Raptor's 1.14 and sy 0.46 against its
      // 0.66, so the same primitive reads as a lifting platter rather than a
      // tube. sz 0.88 shortens it hard - the body only has to cover the cockpit
      // and the bay, because on this aircraft everything aft of the wing root
      // is deck and everything forward of it is chined forebody.
      add(geometry.fuselage, primary, 0, 0.12, -2.6, 1.2, 0.46, 0.88);
      // The forebody is a flat chined WEDGE, not a radar cone. Drawn as a
      // horizontal planform surface (a long thin diamond) with the cone laid
      // over it flattened to sy 0.34, so the section is wide and shallow with
      // hard side edges - which is what the real aircraft's chine line does and
      // what a plain cone can never look like.
      const forebodyYf23 = extrudedSurface([
        [0, -4.4], [0.6, -1.6], [0.98, 2.4], [0, 3.2], [-0.98, 2.4], [-0.6, -1.6]
      ], 0.34);
      add(forebodyYf23, primary, 0, 0.1, -6.8);
      add(geometry.nose, primary, 0, 0.12, -8.7, 0.56, 0.34, 1.05);
      // Flush low-profile canopy well forward, small and shallow (sy 0.4): on
      // the real aircraft the glass barely breaks the upper mould line, which
      // is the opposite of the F-16's bubble and half the "smooth" read.
      add(geometry.canopy, canopy, 0, 0.5, -5.4, 0.56, 0.4, 1.6);

      // The aft deck: a flat plate between and OVER the nacelles, carrying the
      // troughs. Half-width 2.6 covers both nacelle stations (+/-1.9) so the
      // engines are buried under one continuous upper surface - which is how
      // the real aircraft gets a flat top to sink the exhausts into - while
      // still being far narrower than the wing, so it can never be mistaken for
      // the planform from above. A wider plate swallowed the diamond in the
      // first pass; a narrower one let the nacelles poke through it in the
      // second, which put the troughs behind two round tubes.
      add(geometry.panel, primary, 0, 0.2, 4.3, 5.2, 0.44, 5.6);

      // ---- Nacelles and the upper-surface exhaust troughs -------------------
      // Set at +/-1.9, more than twice the Raptor's +/-0.78, and hung BELOW the
      // deck (y -0.5, sy 0.58) rather than sitting proud of it. The engines are
      // separated so the exhaust can be spread flat across the top; if they
      // stand above the deck there is no top left to spread it on.
      add(geometry.rearBody, secondary, -1.9, -0.5, 4.2, 1.0, 0.58, 1.6);
      add(geometry.rearBody, secondary, 1.9, -0.5, 4.2, 1.0, 0.58, 1.6);
      // Trapezoidal shoulder intakes with their outboard splitter plates, raked
      // like the wing root they feed off and slung UNDER the wing at y -0.42.
      add(geometry.intake, accent, -1.95, -0.42, -2.4, 0.9, 0.76, 1.6, 0.2);
      add(geometry.intake, accent, 1.95, -0.42, -2.4, 0.9, 0.76, 1.6, -0.2);
      add(geometry.panel, dark, -2.44, -0.42, -3.7, 0.1, 0.8, 1.5, 0.2);
      add(geometry.panel, dark, 2.44, -0.42, -3.7, 0.1, 0.8, 1.5, -0.2);

      // THE troughs. Each is a dark slot let into the upper deck, walled on
      // both sides by a thin light-toned lip, running from the nacelle station
      // back over the trailing edge. There are no nozzles anywhere on this
      // aircraft: the flames sit IN the slots, on the deck, at deck height -
      // which is the read no other airframe in the game has.
      for (const side of [-1, 1]) {
        // The slot floor, in `dark` - the deepest tone on the aircraft, sunk
        // into a `primary` deck so the trough reads as a hole and not a stripe.
        add(geometry.panel, dark, side * 1.9, 0.4, 5.6, 1.5, 0.22, 5.2);
        // The hot section at the aft end of it, in `accent`. This is the one
        // bright thing on the airframe's upper surface and it is why the top
        // view identifies a YF-23 rather than a generic stealth twin.
        add(geometry.panel, accent, side * 1.9, 0.44, 7.2, 1.3, 0.18, 2.4);
        // Trough lips: thin walls either side, standing proud of the deck.
        add(geometry.panel, secondary, side * 1.06, 0.48, 5.6, 0.22, 0.34, 5.2);
        add(geometry.panel, secondary, side * 2.74, 0.48, 5.6, 0.22, 0.34, 5.2);
        // Flat and WIDE (sx 1.5, sy 0.24): a slot exhaust lying on the upper
        // deck, not a round pipe hanging off the back.
        addFlame(side * 1.9, 0.46, 7.9, 1.5, 0.24);
      }

      // ---- The V-tails -----------------------------------------------------
      // Two blades, and nothing else back here. They replace BOTH the fins and
      // the tailplane, and deleting the tailplane is as much of the silhouette
      // as adding these is: it leaves the centreline aft completely empty,
      // which no other airframe in the game does.
      //
      // Canted 55 deg outward (rz +/-0.96). Verified against a control render
      // at rz 0 - at zero cant these draw as two upright fins and the aircraft
      // reads as an F-15, so the angle is doing the work it is supposed to.
      // The tip ends up at x 3.05 + 4.4 sin55 = 6.65, just outboard of the
      // wingtip at 6.6, and only 2.52 above its root: a wide shallow V.
      //
      // Rooted at +/-3.05, just outboard of the deck edge (2.6) and the outer
      // trough lip (2.74), so the blades grow off the corner of the upper
      // surface instead of intersecting the exhaust.
      //
      // z 6.3 puts the root leading edge at 4.2, which is where the wing's own
      // trailing edge crosses x 3.05 (0.9 + 5.5 x (1 - 3.05/6.6) = 3.86). The
      // blades therefore start where the diamond ends. At an earlier z 4.9 they
      // overlapped the wing by 1.3 and the top view read them as a tailplane
      // growing out of the trailing edge instead of as a separate pair of
      // surfaces, which is the whole feature.
      add(vtailYf23, primary, -3.05, 0.2, 6.3, 1, 1, 1, 0.96);
      add(vtailYf23, primary, 3.05, 0.2, 6.3, 1, 1, 1, -0.96);

      // ---- Details ---------------------------------------------------------
      // Chine strips down the forebody sides. Longer and shallower than the
      // Raptor's because the YF-23's chine runs almost to the cockpit.
      add(geometry.panel, dark, -0.88, 0.06, -6.4, 0.36, 0.06, 4.6, 0.08);
      add(geometry.panel, dark, 0.88, 0.06, -6.4, 0.36, 0.06, 4.6, -0.08);
      // Radome cap and the weapons-bay door outline under the belly.
      add(geometry.nose, dark, 0, 0.12, -10.2, 0.24, 0.18, 0.3);
      add(geometry.panel, dark, 0, -0.34, 0.2, 1.4, 0.1, 4.4);
      // Nav lights on the geometric tips of the rhombus, at the wing station.
      add(geometry.canopy, navL, -6.5, 0.0, 0.9, 0.12, 0.12, 0.12);
      add(geometry.canopy, navR, 6.5, 0.0, 0.9, 0.12, 0.12, 0.12);
    }
  });
}
