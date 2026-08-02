// MQ-40 CISTERN - Sera unmanned aerial refuelling tanker.
//
// Enemy/support-only registration: no AIRCRAFT_ORDER entry ({ order: false }),
// no CAMPAIGNS edit, no mission touched, no balance pass. One airframe, one AI
// profile, one 3D model, one silhouette.
//
// Every flight number is inherited wholesale from `transport` and marked
// BALANCE TODO. The work in this file is the SHAPE, and the shape is three
// things, all of which have to survive at thumbnail size:
//
//   1. NO CANOPY. Not a dark canopy, not a small canopy - the `canopy` material
//      is never used anywhere in build(). Every other airframe in the game,
//      including the MQ-99 UAV, puts a glass blister somewhere on its
//      forebody; this one has a smooth unbroken upper mould line running from
//      the radome to the intake. A pilotless nose is a NEGATIVE feature, so it
//      cannot carry itself: the forebody is drawn as a wide flat faceted wedge
//      with a chin sensor turret under it, which is what makes the blankness
//      read as "unmanned" rather than as "the cockpit failed to render".
//   2. A DORSAL INTAKE. One shoulder-high scoop standing on the spine, exactly
//      where every manned aircraft here carries its cockpit. It is the same
//      part of the airframe doing the opposite job, and that swap is the whole
//      identification from the side and from above. It is fed by a raised
//      spine fairing running aft to the engine, so the air visibly goes
//      somewhere instead of the box being a lump on the back.
//   3. HOSE & DROGUE PODS under the wing, two of them, each trailing a hose
//      AFT of the aircraft ending in a cone-shaped drogue basket. Nothing else
//      in the game has anything hanging behind its trailing edge, so two thin
//      lines with baskets on the ends are unmistakable from above and from the
//      side. The drogues sit at z 13.6 and y -3.3, aft of the tailplane's
//      trailing edge and well below it, so they are read as trailed stores and
//      never as part of the tail.
//
// Planform: a long thin high-aspect wing, because the airframe is a 25 m
// aircraft on a 40 m span - wider than it is long, which is true of no other
// aircraft in this game and of very few real ones. Half-span 23.0 against a
// 4.4 root chord is an aspect ratio around 10, roughly double the C-17's wing
// and quadruple any fighter's. A tanker loiters; the wing has to say so.
//
// Scale: measured off the live models rather than guessed. The C-17
// (`transport`) is a real 53.0 m / 51.7 m aircraft carried at tipSpan 11.4 x
// scale 2.6 = 29.64 world half-span, so the game runs 51.7 / 59.28 = 0.872 m
// per world unit; the A-100 (50.5 m span, tipSpan 13.0 x 2.3 = 29.9) gives
// 0.845, so ~0.86 m/world is the house rate for heavies.
//
// This airframe wants 40 m of span and 25 m of length:
//   half-span 40 / 2 / 0.86 = 23.3 world  ->  tipSpan 23.0 x scale 1.0 = 23.0
//                                             world = 39.6 m span. Good.
//   length    25 / 0.86     = 29.1 world  ->  the model runs z -14.2 (radome
//                                             tip) to +14.4 (fin trailing
//                                             edge) = 28.6 model, x scale 1.0
//                                             = 28.6 world = 24.6 m. Good.
// scale 1.0 rather than a heavy's 2.3-2.6 because the model units are already
// drawn large: this is a 46-unit-wide model at scale 1, where the C-17 is a
// 22.8-unit-wide model at scale 2.6. The ratio that matters is the finished
// world size, and 23.0 world half-span against the C-17's 29.64 is 0.78 - the
// real 40 m / 51.7 m is 0.77. Length comes out 28.6 against the C-17's ~70
// world (26.9 model x 2.6), which is 0.41 against a real 25 / 53 = 0.47; the
// tanker is drawn very slightly short, which is the correct direction of error
// for an aircraft whose identity is that it is far wider than it is long.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;

  // The nearest existing template on both tables: an unarmed, enemy-only,
  // heavy, non-manoeuvring machine. Spreading it is what guarantees the
  // required-key schema is satisfied without this payload restating a contract
  // it does not own.
  const transport = AIRCRAFT_TYPES.transport;
  const transportAI = ENEMY_AI_PROFILES.transport;
  if (!transport || !transportAI) {
    throw new Error("[droneTanker] expected the transport aircraft and AI templates to exist");
  }

  // Sera (Western) support paint, and deliberately the lightest airframe in the
  // game. Tankers are painted white-grey in reality because they spend their
  // lives in sunlight at altitude, and here it does a second job: the two
  // heavies this thing will share sky with (the C-17 at 0x8d99a3 and the A-100
  // at 0x9aa3a8) are mid-greys, so a near-white body separates from both at the
  // range a contact is first identified. Exhaust is the cold Western blue-white
  // the faction cue depends on.
  const theme = {
    primary: 0xd3d9dd,
    secondary: 0x9aa4ac,
    accent: 0x4d5762,
    // Carried because the theme contract expects the key and the shared
    // material set is built from it - but the `canopy` MATERIAL is never once
    // applied to a mesh in build(). That absence is feature #1.
    canopy: 0x9fd0e0,
    exhaust: 0x9fd8ff,
    // See the header: the model is authored at final world size, so scale is 1.
    scale: 1.0,
    variant: "droneTanker"
  };

  // BALANCE TODO: placeholder. Every performance number below is `transport`'s,
  // unchanged, including the 98-point health quantum (196 = exactly two
  // missiles). A real tanker should be slower and more fragile than an
  // airlifter, but that is a tuning pass and not this delivery.
  ctx.addAircraft("droneTanker", {
    ...transport,
    id: "droneTanker",
    label: "MQ-40 CISTERN",
    role: "Unmanned Aerial Tanker",
    tag: "ENEMY",
    enemyOnly: true,
    blurb: "無人の大型給油機。コックピットを持たず、背中のインテークと翼下のホース&ドローグだけが機能を語る。武装は無いが、これを墜とせば敵編隊は足を失う。",
    // Geometric wingtip of the model below: half-span 23.0, and the tip chord
    // runs z 3.0..4.2 with the wing added at z 0.4, so 4.0 is its mid-chord in
    // model space. The contrail then leaves the actual point of the wing rather
    // than floating inboard of it.
    tipSpan: 23.0,
    tipZ: 4.0,
    theme: { ...theme }
  }, { order: false });

  // BALANCE TODO: placeholder. The unarmed `transport` AI contract verbatim -
  // attackRange 0 is what states "this aircraft never shoots" - with only the
  // readability fields moved: a wider hitbox for a much wider airframe, and a
  // flatter, slower orbit, because a tanker flies a racetrack and does not
  // manoeuvre. Colours stay on the Sera cold-blue side.
  ctx.addEnemyProfile("droneTanker", {
    ...transportAI,
    label: "TANKER",
    hitboxScale: 3.2,
    patrolSpeedScale: 0.9,
    patrolPathScale: 0.2,
    verticalBias: 26,
    verticalAmplitude: 3,
    verticalFrequency: 0.14,
    explosionScale: 1.8,
    theme: { ...theme }
  });
  // No addEnemyMissileProfile: the absence of an entry in that table IS the
  // "carries no missiles" statement, the same way it is for the transport.

  ctx.addAircraftModel("droneTanker", {
    // Top view in the shared 40x44 box, nose up. Traced off the model rather
    // than drawn freehand: every vertex is a real part station run through
    // x = 20 + 0.826 * mx and y = 1.5 + 1.34 * (mz + 14.2), so the outline and
    // the aircraft cannot drift apart. (0.826 = 19 / 23.0 half-span,
    // 1.34 = 39 / 29.1 total length from radome tip to drogue rim.)
    //
    // Reading down the page: a blunt blank nose with no canopy notch anywhere
    // on it, the dorsal intake standing on the spine as a distinct widening of
    // the forebody, the enormous straight high-aspect wing running the full
    // width of the box, the two pods hanging under it, the small tail - and
    // then the two hoses trailing off the back, each ending in a drogue basket.
    // Those two dangling lines with lumps on the ends are the identification,
    // and they are the reason this outline can never be confused with the
    // C-17's or the A-100's.
    //
    // The path is one closed loop, so the hoses are drawn as a there-and-back
    // spur down the right side and up the left rather than as separate shapes:
    // out along the wing, back in, down the starboard hose to its basket, back
    // up, across the tail, then the mirror image on the port side.
    silhouette:
      "M20 1.5 L21.4 4.3 L21.9 8.5 L22.2 11.4 " +
      "L23.9 12.2 L23.9 17.1 L22.0 17.9 " +
      "L39 22.4 L39 24.0 L22.6 24.4 " +
      "L22.6 27.0 L21.0 27.0 L21.0 34.9 L22.6 34.9 L22.6 37.1 " +
      "L20.6 37.1 L20.6 27.0 L20.1 27.0 L20.1 32.5 " +
      "L25.1 34.7 L25.1 36.2 L20.1 35.4 L20.1 43.5 L19.9 43.5 L19.9 35.4 " +
      "L14.9 36.2 L14.9 34.7 L19.9 32.5 L19.9 27.0 L19.4 27.0 L19.4 37.1 " +
      "L17.4 37.1 L17.4 34.9 L19.0 34.9 L19.0 27.0 L17.4 27.0 L17.4 24.4 " +
      "L1 24.0 L1 22.4 L18.0 17.9 L16.1 17.1 L16.1 12.2 L17.8 11.4 " +
      "L18.1 8.5 L18.6 4.3 Z",

    build(env) {
      const {
        THREE, geometry, extrudedSurface, verticalSurface,
        primary, secondary, accent, dark, light, navL, navR,
        add, addFlame
      } = env;
      // NOTE: `canopy` is deliberately NOT destructured. This aircraft has no
      // glass on it anywhere, and not having the material in scope is the
      // cheapest way to guarantee a later edit cannot quietly put a cockpit
      // back on the one airframe whose identity is not having one.

      // ---- Planforms ------------------------------------------------------
      // THE wing, and the reason the aircraft is recognisable from above before
      // any detail resolves: half-span 23.0 on a 4.4 root chord and a 1.2 tip
      // chord. That is an aspect ratio near 10 against the C-17's 4.6 and a
      // fighter's 2.5 - the wing is a plank, and a very long one.
      //
      // Sweep is almost nothing (the leading edge rakes 2.0 of z across 23.0 of
      // span, about 5 deg) because a high-aspect loiter wing is straight. Every
      // other big wing in this game is swept 30-40 deg, so unswept plus slender
      // is two separate cues pointing at the same read.
      //
      // The tip keeps a 1.2 chord rather than closing to a point: a
      // mathematical point renders as a jagged sliver at distance, and the nav
      // light and the winglet both need something to stand on.
      const wingTanker = extrudedSurface([
        [0, -2.2], [2.6, -2.0], [23.0, 3.0], [23.0, 4.2], [3.2, 2.2],
        [0, 2.2], [-3.2, 2.2], [-23.0, 4.2], [-23.0, 3.0], [-2.6, -2.0]
      ], 0.34);

      // Tailplane. Deliberately tiny against the wing - half-span 6.2 is 27% of
      // the wing's 23.0, where a fighter's stabilator is typically 55-60% of
      // its wing. A small tail behind a huge wing is what sells the aspect
      // ratio: if the tail were proportionally normal the wing would just look
      // like a normal wing on a small aircraft.
      const stabTanker = extrudedSurface([
        [0, -1.4], [6.2, 0.9], [6.2, 1.8], [1.5, 1.9],
        [-1.5, 1.9], [-6.2, 1.8], [-6.2, 0.9]
      ], 0.26);

      // A winglet blade, drawn in the vertical plane and stood on each wingtip.
      // Swept back, short (2.4), and narrow-chorded. verticalSurface maps shape
      // +x onto model -z, so the tip chord of a SWEPT-BACK blade sits at
      // negative shape-x relative to the root; getting that backwards draws a
      // forward-raked winglet, which reads as damage.
      const wingletTanker = verticalSurface([
        [-0.6, 0], [0.6, 0], [-0.2, 2.4], [-0.9, 2.4]
      ], 0.18);

      // The drogue basket: an open cone, wide end AFT. Built here rather than
      // reusing geometry.nose because the shared cone is 4.2 long on a 1.02
      // radius (a needle) and a drogue is the opposite - almost as wide as it
      // is long. Eight segments, so it reads as a basket of ribs rather than as
      // a smooth ice-cream cone, which is what the real thing looks like.
      const drogueBasket = new THREE.ConeGeometry(0.95, 1.7, 8, 1, true);
      // Wide end aft: the cone points +y by default, so rotating -90 deg about
      // x sends the apex to -z (forward, toward the hose) and opens the mouth
      // to +z (aft, toward the receiver).
      drogueBasket.rotateX(-Math.PI / 2);

      // ---- Body -----------------------------------------------------------
      // A slim constant-section tube. sx/sy 0.86 against the C-17's 1.35/1.30 -
      // this is a flying fuel tank with no hold and no ramp, so the body is a
      // pipe rather than a box, and its slimness is what leaves the wing
      // looking as wide as it is.
      add(geometry.fuselage, primary, 0, 0, -1.6, 0.86, 0.86, 1.05);
      add(geometry.fuselage, primary, 0, 0.06, 6.6, 0.8, 0.78, 0.55);

      // ---- FEATURE 1: the blank nose ---------------------------------------
      // No canopy, no windscreen, no anti-glare panel, no framing. What is here
      // instead is a wide flat FACETED forebody: a horizontal planform wedge
      // with the shared cone laid over it flattened to sy 0.62, so the section
      // is wide and shallow with hard side edges rather than being a plain
      // circular radome. A flat-sided unmanned nose is a shape decision; a
      // round one with nothing on it is just an aircraft missing its cockpit.
      const forebodyTanker = extrudedSurface([
        [0, -4.6], [0.9, -2.0], [1.32, 1.6], [0, 2.6], [-1.32, 1.6], [-0.9, -2.0]
      ], 0.62);
      add(forebodyTanker, primary, 0, 0.08, -8.6);
      add(geometry.nose, primary, 0, 0.06, -11.6, 0.92, 0.7, 1.05);
      // Radome cap, in `dark` - a rounded blunt tip rather than a spike, which
      // is what an aircraft with a big weather/rendezvous radar and no pilot
      // behind it actually has.
      add(geometry.canopy, dark, 0, 0.04, -13.4, 0.62, 0.5, 0.9);
      // The chin sensor turret. This is the part that does the work the missing
      // canopy would have done: a dark ball slung UNDER the nose, where a
      // manned aircraft has nothing, telling the player the machine sees
      // without eyes. Set at y -0.62 so it hangs clear of the fuselage line and
      // is visible in the side view rather than being buried in the skin.
      add(geometry.canopy, dark, 0, -0.62, -10.4, 0.54, 0.46, 0.62);
      // Two flat sensor plates on the forebody flanks, angled with the chine.
      // They are the only markings on the upper forebody, and being PLATES
      // rather than windows is the point: the aircraft is instrumented all over
      // and glazed nowhere.
      add(geometry.panel, accent, -1.24, 0.12, -9.4, 0.1, 0.5, 2.6, 0.1);
      add(geometry.panel, accent, 1.24, 0.12, -9.4, 0.1, 0.5, 2.6, -0.1);
      // Chine strips down the forebody sides, marking the hard edge where the
      // flat top meets the flat side. Without them the wedge reads as a soft
      // cone from a distance.
      add(geometry.panel, dark, -1.16, -0.2, -9.0, 0.24, 0.08, 4.4, 0.06);
      add(geometry.panel, dark, 1.16, -0.2, -9.0, 0.24, 0.08, 4.4, -0.06);

      // ---- FEATURE 2: the dorsal intake ------------------------------------
      // A single scoop standing on the SPINE, at z -4.4 - which is precisely
      // the station where the C-17, the A-100 and every fighter in this game
      // put their cockpit. Same place, opposite job, and that substitution is
      // the read: from the side the aircraft has a raised box on its back where
      // the glass should be, and from above the fuselage visibly widens there.
      //
      // Built in four pieces so it reads as an inlet and not as a crate:
      //   - the MOUTH, a dark box standing proud at the front. This is a HOLE,
      //     and it is drawn in the darkest tone on the aircraft against a
      //     near-white body so that at thumbnail size it is the highest-contrast
      //     feature anywhere on the upper surface.
      //   - the lip ring around it, in `secondary`, half a unit larger in every
      //     direction, so the mouth is recessed inside a rim.
      //   - the trunk, a raised wedge in `primary`, running aft and down.
      //   - the splitter plate underneath, holding the mouth off the body - the
      //     boundary-layer diverter every dorsal-inlet aircraft carries, and
      //     the detail that makes the inlet look engineered rather than glued on.
      //
      // ROUNDS 1 AND 2 both under-built this. Round 1 stood it 0.76 clear of the
      // spine and it vanished; round 2 took it to 1.2 clear and it read as a
      // dark patch rather than as an inlet. The failure both times was the same
      // one: the box was scaled up but it was still a box SITTING ON the
      // fuselage, and a box sitting on a tube reads as cargo.
      //
      // What it needed was to become part of the airframe's outline. The hump
      // now rises 2.7 clear of the spine (top at y 3.35 against a fuselage top
      // of 0.86) and is built as a DUCT with a shape: a raked lip standing
      // ahead of and above a recessed mouth, then a trunk that slopes down and
      // aft into the spine over 9 units. In the side view the upper line of the
      // aircraft now visibly climbs, opens, and falls away - which is what a
      // dorsal inlet does to a silhouette and what no other airframe here has.
      //
      // The MOUTH is the highest-contrast object on the aircraft by design:
      // `dark` on a near-white body, recessed inside a `secondary` rim, so at
      // any range the eye finds a black hole on the spine exactly where every
      // other aircraft in the game has a canopy. Features 1 and 2 are therefore
      // the same read from the same angle - no glass in front, a hole behind.
      //
      // ROUND 3 got the hump right and the MOUTH wrong: the dark box was placed
      // at the same station as the tall duct and was therefore swallowed by it,
      // so the spine read as a solid block. The fix is that a mouth is a face,
      // not a volume. It is now a thin dark PLATE standing on the front face of
      // the duct at z -6.25, forward of everything behind it, with the cowl ring
      // built around its edges out of four separate bars rather than as one box
      // that could bury it. The hole is drawn by what surrounds it.
      //
      // The dark plate: the opening itself, 2.4 wide by 1.9 tall.
      add(geometry.panel, dark, 0, 1.75, -6.25, 2.4, 1.9, 0.34);
      // The cowl ring around it - top, bottom and two sides, each standing
      // slightly proud of the plate in z so the opening is visibly recessed
      // inside a raised rim from every forward angle.
      add(geometry.panel, secondary, 0, 2.82, -6.35, 3.0, 0.36, 0.8);
      add(geometry.panel, secondary, 0, 0.72, -6.35, 3.0, 0.36, 0.8);
      add(geometry.panel, secondary, -1.38, 1.75, -6.35, 0.34, 2.5, 0.8);
      add(geometry.panel, secondary, 1.38, 1.75, -6.35, 0.34, 2.5, 0.8);
      // The main duct hump behind the mouth, the tallest thing on the spine.
      // Started at z -4.9 so its front face is at -3.1 and it cannot reach
      // forward over the opening.
      add(geometry.panel, secondary, 0, 1.55, -4.3, 2.9, 3.5, 2.6);
      add(geometry.panel, primary, 0, 1.25, -1.6, 2.6, 3.0, 3.2);
      // The trunk sloping aft and down into the spine, in two steps, so the
      // hump has a visible back slope rather than a cliff.
      add(geometry.panel, primary, 0, 0.95, 1.2, 2.1, 2.2, 3.4);
      add(geometry.panel, secondary, 0, 0.76, 4.4, 1.5, 1.5, 3.6);
      // Boundary-layer splitter plate under the inlet, holding the whole duct
      // off the fuselage skin. Set at y 0.36 - below the cowl's bottom bar at
      // 0.72, so the two do not intersect - and run in `accent` so it draws a
      // hard dark line under the raised structure. That line is what makes the
      // duct read as STANDING ON the fuselage rather than as being part of it,
      // which is the difference between an inlet and a hump.
      add(geometry.panel, accent, 0, 0.36, -5.6, 2.7, 0.3, 3.6);
      // A vertical splitter standing in the middle of the mouth, proud of the
      // dark plate, so the hole reads as a twin-duct inlet and not as an open
      // hatch. z -6.45 puts it in front of the plate at -6.25.
      add(geometry.panel, secondary, 0, 1.75, -6.45, 0.24, 1.9, 0.5);

      // ---- Wing and the engine ---------------------------------------------
      // The wing rides the spine at y 0.62, not the belly: shoulder-mounted, so
      // the pods have room to hang beneath it and the whole span is visible
      // from above with nothing on top of it.
      add(wingTanker, secondary, 0, 0.62, 0.4);
      // Wing root fairings, blending the plank into the pipe. A high-aspect
      // wing meeting a slim body at a hard corner reads as a mistake; the
      // fairing is what makes it read as a design.
      add(geometry.panel, primary, 0, 0.34, 0.4, 3.2, 0.62, 5.0);

      // ONE engine, buried in the aft body and fed by the dorsal inlet. A
      // single centreline exhaust is the third consequence of the dorsal
      // intake: podded wing engines would have competed with the pods for the
      // same underwing space and turned the identification into a guess.
      add(geometry.rearBody, secondary, 0, 0.06, 9.6, 0.82, 0.82, 1.5);
      add(geometry.nozzle, dark, 0, 0.06, 11.1, 0.95, 0.95, 1);
      addFlame(0, 0.06, 12.4, 0.62, 0.62);

      // ---- FEATURE 3: the hose & drogue pods -------------------------------
      // Two refuelling pods slung under the wing at half-span 11.5 - half way
      // out, where the real hardware lives, and far enough outboard that the
      // top view shows clear sky between each pod and the fuselage.
      //
      // Each assembly is four parts, and all four are needed for the read:
      //   1. the POD itself, a fat cylinder hung below the wing on a pylon.
      //   2. the tail cone closing it off, in `dark`, so the hose emerges from
      //      a hole rather than from the end of a bare tube.
      //   3. the HOSE: a long thin bar running AFT and DOWNWARD, past the
      //      tailplane and out beyond the rear of the aircraft. Sagging is what
      //      makes it a hose and not a boom, so it is pitched nose-up-tail-down
      //      by rotating it about x - a straight horizontal rod would read as a
      //      probe or a missile rail.
      //   4. the DROGUE at the end of it, mouth aft.
      //
      // The drogues sit at z 13.6, which is 1.4 clear of the tailplane's
      // trailing edge at 12.2 in z and, more importantly, 3.1 BELOW it in y -
      // so nothing overlaps and the baskets hang in clear air behind and under
      // the aircraft. Nothing else in this game has anything behind its
      // trailing edge at all.
      //
      // ROUND 1 put them at z 20.6. That was correct aerodynamically and wrong
      // for the sheet: the preview frames on the bounding-box DIAGONAL, so
      // trailing 21 units of empty air behind a 28-unit aircraft shrank the
      // whole airframe to about 60% of the cell and made every feature on it
      // unreadable. Pulling the drogues in to 13.6 costs a little realism and
      // buys back the entire model's legibility - and legibility at thumbnail
      // size is the requirement this shape is built against.
      for (const side of [-1, 1]) {
        const podX = side * 11.5;
        // Pylon bridging the gap from the wing underside (about y 0.45) down to
        // the pod top (about y -0.4), so the pod visibly hangs rather than
        // being embedded in the surface.
        add(geometry.panel, secondary, podX, 0.1, 1.0, 0.34, 1.0, 2.8);
        // The pod: a barrel, nose cone forward, tail cone aft. Grown from
        // round 1's 0.72 to 0.95 in radius - at the previous size it read as a
        // fuel tank at thumbnail scale, and a hose has to come out of something
        // visibly large enough to have a drum inside it.
        add(geometry.rearBody, light, podX, -1.15, 0.8, 0.95, 0.95, 1.7);
        add(geometry.nose, light, podX, -1.15, -1.9, 0.9, 0.9, 0.5);
        add(geometry.nozzle, dark, podX, -1.15, 2.85, 1.05, 1.05, 1.0);
        // A dark band around the pod's waist, so at distance it separates from
        // the near-white wing it hangs under instead of dissolving into it.
        add(geometry.panel, accent, podX, -1.15, 1.5, 1.05, 1.05, 0.7);

        // THE HOSE, running from the pod tail at (podX, -1.2, 3.3) aft and down
        // to the drogue at (podX, -3.3, 13.6). Drawn as one bar and pitched by
        // rotation.x: the drop is 2.1 over a 10.3 run, so the angle is
        // atan(2.1 / 10.3) = 0.201 rad. Positive rotation.x tips the +z end
        // DOWNWARD, which is the sag a trailed hose has under its own weight
        // and the drag of the basket.
        //
        // Thickness went 0.16 -> 0.30 after round 1, where the hose rendered as
        // a one-pixel scratch in the top view and vanished entirely in the
        // front 3/4. A refuelling hose is a thick armoured line, and it has to
        // be drawn as one to survive being seen from any distance at all.
        const hose = add(geometry.panel, dark, podX, -2.25, 8.45, 0.3, 0.3, 10.5);
        hose.rotation.x = 0.201;
        // A thicker sleeve on the first stretch where it leaves the pod - the
        // reinforced section every real hose-drum unit has, and the detail that
        // stops the hose reading as a wire.
        const sleeve = add(geometry.panel, accent, podX, -1.42, 4.2, 0.46, 0.46, 2.2);
        sleeve.rotation.x = 0.201;

        // THE DROGUE, mouth aft, at the end of the hose. 1.5 in radius against
        // a 0.30 hose - five times the thickness - because the basket is the
        // part that has to survive being a few pixels tall, and a drogue only
        // slightly fatter than its hose reads as a knot in a rope. Round 1's
        // 0.95 basket did exactly that.
        add(drogueBasket, light, podX, -3.3, 13.6, 1.55, 1.55, 1.5);
        // Rim ring on the mouth, in `accent`, so the basket has an edge and
        // reads as OPEN. A plain cone reads as a dart - pointing the wrong way,
        // which would make the whole assembly look like a rearward-firing
        // weapon rather than a refuelling drogue.
        add(geometry.nozzle, accent, podX, -3.3, 14.9, 3.0, 3.0, 0.36);
        // Stabilising ribs on the basket, in the vertical and horizontal
        // planes, which is what a real drogue's canopy ribs project as. They
        // are also what makes the mouth read as a cross-braced basket from
        // directly astern, where the cone itself is a plain circle.
        add(geometry.panel, accent, podX, -3.3, 14.3, 3.1, 0.14, 0.7);
        add(geometry.panel, accent, podX, -3.3, 14.3, 0.14, 3.1, 0.7);
      }

      // ---- Tail -------------------------------------------------------------
      // One conventional fin and a low tailplane on the aft body - NOT a T-tail,
      // because the two heavies this aircraft shares the sky with (the C-17 and
      // the A-100) both have one, and a third T-tail would have made all three
      // read as the same machine from behind. A single modest fin also leaves
      // the aft view clear so the hoses passing beneath it are unobstructed.
      // Raised to 1.3 in height scale after round 2: the dorsal hump's top is
      // now at y 3.35, and a fin shorter than the intake made the aircraft look
      // like it was flying backwards. The fin peak sits at about y 5.4, clearly
      // the highest point, which is the ordering every aircraft has.
      add(geometry.fin, secondary, 0, 0.3, 11.8, 1.05, 1.3, 1.0);
      add(stabTanker, primary, 0, 0.2, 12.2);

      // ---- Details ----------------------------------------------------------
      // Winglets standing on the geometric wingtips. On a wing this slender the
      // winglet is the natural terminator, and it also gives the tip a vertical
      // element so the span does not just fade out at distance.
      add(wingletTanker, secondary, -23.0, 0.68, 3.6, 1, 1, 1, 0.18);
      add(wingletTanker, secondary, 23.0, 0.68, 3.6, 1, 1, 1, -0.18);
      // Fuel-transfer plumbing blisters along the wing underside, marking where
      // the tanks feed the pods. Long, low and outboard, so they read as a
      // system rather than as stores.
      add(geometry.panel, secondary, -6.0, 0.3, 1.6, 4.0, 0.28, 1.6);
      add(geometry.panel, secondary, 6.0, 0.3, 1.6, 4.0, 0.28, 1.6);
      // Belly tank fairing: this aircraft's cargo is fuel, and a long shallow
      // bulge under the body is what says so.
      add(geometry.panel, secondary, 0, -0.72, 1.0, 1.2, 0.5, 9.0);
      // Ventral fin under the tail, a small keel that a long-bodied, small-
      // finned aircraft needs and that adds a second silhouette element aft.
      add(geometry.panel, secondary, 0, -0.7, 11.4, 0.14, 0.9, 2.0);
      // Nav lights on the geometric wingtips: left red, right green.
      add(geometry.canopy, navL, -23.0, 0.66, 3.6, 0.26, 0.26, 0.26);
      add(geometry.canopy, navR, 23.0, 0.66, 3.6, 0.26, 0.26, 0.26);
      // Anti-collision beacons on the spine and belly, in `light` - the only
      // bright points on the upper surface, and standard on a machine that
      // spends its life being formated on by other aircraft.
      add(geometry.canopy, light, 0, 1.0, 7.6, 0.2, 0.2, 0.2);
      add(geometry.canopy, light, 0, -0.9, -3.0, 0.2, 0.2, 0.2);
    }
  });
}
