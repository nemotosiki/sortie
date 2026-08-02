// OPHAN - stratospheric unmanned defence node (one node of twelve).
//
// One airframe, one AI profile, one 3D model, one silhouette. Nothing else:
// no missions, no waves, no CAMPAIGNS edits, no hangar entry, no gameplay.
//
// This is deliberately NOT an aircraft. Everything the roster uses to say
// "military jet" is absent by construction - there is no fuselage cylinder, no
// nose cone, no canopy, no fin, no tailplane, no nozzle, no exhaust flame, no
// propeller, no engine pod of any kind. What is left is an 80 m-class flying
// wing so thin it is a sheet: a white solar plank that loiters in the
// stratosphere on sunlight, with the authentication core's ring glowing at its
// centre and a row of drone bay doors along its underside.
//
// The reads, in the order the player gets them:
//   1. ASPECT RATIO. Half-span 15.0 against a 2.4 root chord and a 0.34 body
//      depth. Nothing else in the game is remotely this slender - the B-52's
//      12.5/6.2 is the current record and it is twice as fat. From any angle
//      this is a line, not a body.
//   2. THE PANEL GRID on the upper surface. Eight spanwise cells per side, laid
//      as raised slats with dark seams between them, so the top view is a
//      chequered sheet rather than a painted wing. This is the single most
//      important feature in the brief and it is the one the TOP view sells.
//   3. THE RING. An accent-coloured emissive torus lying flat around the
//      central core pod - Ophan's own sigil, and the only saturated colour on
//      an otherwise white machine.
//   4. THE BAY DOORS. A row of recessed dark openings down the underside,
//      visible only from below, which is where the drones come from.
//   5. FOUR HAIR-THIN ANTENNAS. Two dorsal, two ventral, at 0.06 units across.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;

  // `uav` rather than `transport` for the flight model: this node is unmanned
  // and the UAV entry is the roster's existing statement of that (gunDamage 5,
  // missileCapacity 0, maxHealth 98, no `spw`). Spreading it satisfies the
  // required-key schema without this payload restating a contract it does not
  // own. The AI template is `transport`'s, because that is the roster's only
  // "unarmed, holds a station, does not fight" profile and it is what a passive
  // orbital-relay platform has to behave like - the UAV's AI attacks.
  const uav = AIRCRAFT_TYPES.uav;
  const transportAI = ENEMY_AI_PROFILES.transport;
  if (!uav || !transportAI) {
    throw new Error("[ophanNode] expected the uav aircraft and transport AI templates to exist");
  }

  // Pale, near-white, low-metalness. Every other airframe in the game sits on
  // the grey-green military ladder; this one is deliberately brighter than the
  // sky behind it. primary/secondary are two steps of off-white so the panel
  // slats read against the skin without a colour change, and the accent is the
  // one saturated value on the machine - the ring.
  //
  // `exhaust` is defined because the theme shape requires it, but NOTHING on
  // this model burns: build() never calls addFlame, so flameMaterial is created
  // and disposed without ever being drawn. That absence is the point - a
  // contact with no exhaust plume at all is the first thing that says this is
  // not an aircraft.
  //
  // The values are pushed hard toward white because `primary` is instantiated
  // at metalness 0.52, and a metallic surface takes its colour from what it
  // reflects rather than from its albedo - 0xeef2f5 at that metalness renders
  // as mid-grey under this lighting, which is exactly the military value the
  // brief rules out. Pure white plus the flat-paint override built in build()
  // is what actually lands "white" on screen.
  const theme = {
    primary: 0xffffff,
    secondary: 0xdfe7ec,
    accent: 0x3ecfff,
    canopy: 0x8ff0ff,
    exhaust: 0x8ff0ff,
    // Real node: 80 m span. Model half-span is 15.0, so 15.0 x 3.4 = 51.0
    // visual half-span = 102 visual span, against the C-17's 59 and the Tu-95's
    // 61. That ratio (1.7x the largest existing aircraft) is what has to survive
    // in the HUD, because "80 m class" is not a number the player can read - it
    // is only ever the comparison against the heavies flying beside it.
    scale: 3.4,
    variant: "ophanNode"
  };

  // BALANCE TODO: placeholder. Every flight-model number below is inherited
  // from `uav` unchanged except the three that would look absurd on an 80 m
  // sailplane at 20 km - it cruises at a third of the drone's speed and turns
  // like a continent. This payload ships a SHAPE, not a balance pass, and no
  // mission fields it.
  ctx.addAircraft("ophanNode", {
    ...uav,
    id: "ophanNode",
    label: "OPHAN NODE",
    role: "Stratospheric Defence Node",
    tag: "ENEMY",
    enemyOnly: true,
    blurb: "オファンを構成する十二基のノードのうちの一基。成層圏に静止し、太陽光だけで浮き続ける全翼の板。武装も推進音も持たず、中央の環が認証コアを示す。",
    // BALANCE TODO: a station-keeping platform, not a flying machine.
    cruiseSpeed: 96, boostSpeed: 104, brakeSpeed: 88,
    turnRateDeg: 4,
    // Geometric wingtip of the model below: half-span 15.0, tip chord runs
    // z -0.5..0.5 with the wing centred at 0, so 0.0 is its mid-chord.
    // Contrails then leave the real tip rather than floating inboard of it.
    tipSpan: 15.0,
    tipZ: 0.0,
    theme: { ...theme }
  }, { order: false });

  // BALANCE TODO: placeholder. The unarmed `transport` contract verbatim -
  // attackRange 0 is what states "this never shoots" - with only the
  // readability fields moved: a much wider hitbox for a much wider airframe, a
  // near-stationary orbit (a node holds a point in the sky, it does not patrol),
  // and the node's own cyan instead of the airlifter's colours.
  ctx.addEnemyProfile("ophanNode", {
    ...transportAI,
    label: "NODE",
    hitboxScale: 4.4,
    patrolSpeedScale: 0.62,
    patrolPathScale: 0.1,
    verticalBias: 60,
    verticalAmplitude: 2,
    verticalFrequency: 0.08,
    explosionScale: 2.1,
    radarColor: "#64e0ff",
    tracerColor: 0x64e0ff,
    explosionColor: 0x9ff0ff,
    theme: { ...theme }
  });
  // No addEnemyMissileProfile: the absence of an entry in that table IS the
  // "carries no missiles" statement, the same way it is for the transport.

  ctx.addAircraftModel("ophanNode", {
    // Top view in the shared 40x44 box, nose up. Traced from the model's own
    // extents (half-span 15.0, root chord z -1.36..0.82, tip chord z -0.5..0.5)
    // and then squeezed to the box: the real planform is 30 wide by 2.18 deep,
    // an aspect ratio of 13.8, which at the box's full 36 of width would be
    // 2.6 units of depth. Drawn at 3.2 instead, because below about three
    // units the HUD's own stroke closes the shape into a solid line and the
    // outline stops being a planform at all - this is the one place the model's
    // real proportion has to be cheated, and it is cheated in the direction
    // that keeps the read (still by far the thinnest outline in the game; the
    // B-52's is 13 deep over the same width).
    //
    // Reading across the path: a straight leading edge from a wingtip that is
    // barely more than a point, a shallow forward step at the centre where the
    // core plate sits, and the ring drawn as the one interior feature. There is
    // no fuselage, no fin, no tailplane and no engine anywhere in this outline
    // - a bare unbroken bar across the full width of the box. Every other
    // silhouette in this game has something sticking out fore or aft of its
    // wing; this one has nothing, and that emptiness is the identification.
    silhouette:
      "M2 20.9 L14.2 19.9 L17.4 19.4 L18.5 18.6 L21.5 18.6 L22.6 19.4 " +
      "L25.8 19.9 L38 20.9 L38 22.8 L25.8 22.3 L22.6 23.0 L22.6 25.4 " +
      "L17.4 25.4 L17.4 23.0 L14.2 22.3 L2 22.8 Z",
    build(env) {
      const { THREE, geometry, extrudedSurface, add,
              primary, secondary, accent, canopy, dark, light, navL, navR } = env;

      // ---- Paint ----------------------------------------------------------
      // The five themed materials arrive at fighter settings - metalness 0.52
      // for `primary`, 0.46 for `secondary` - and a metallic surface under this
      // three-point rig renders as the reflected environment, which here is a
      // dark blue-grey room. That is why round one of this model came out the
      // same value as every other airframe in the game despite a near-white
      // albedo. Overriding the two skin materials to a flat matte paint
      // (metalness 0, roughness 0.62, plus a low self-lit floor so the shadow
      // side never falls to grey) is what makes an 80 m solar sail actually
      // read as white against sky.
      //
      // Mutating the themed materials rather than making new ones is not a
      // shortcut, it is the only correct option on this hook. All eight - the
      // five themed plus dark/light/nav - are built per model inside
      // createAircraftModel and handed to the return shape's
      // `standardMaterials`, so they flash white on a hit and are disposed with
      // the airframe. A material made HERE would be in neither: the payload env
      // exposes no `extraMaterials` array (the ship and heli hooks do; the
      // aircraft hook does not), and disposeAircraftMaterials only walks
      // standardMaterials + flameMaterial + extraMaterials. A locally made
      // skin would therefore leak one MeshStandardMaterial on every despawn of
      // every node, silently. So this model repaints what it is given and
      // creates nothing.
      //
      // That constraint is also why the array is built from `dark` and `light`
      // rather than from a purpose-made cell colour: five paints is the budget,
      // and they have to cover skin, array, seam, ring and lens.
      const paint = (mat, hex, metalness, roughness, emissive) => {
        mat.color.setHex(hex);
        mat.metalness = metalness;
        mat.roughness = roughness;
        mat.emissive.setHex(emissive);
        mat.emissiveIntensity = 1;
        mat.userData.baseEmissive = mat.emissive.clone();
        mat.userData.baseIntensity = mat.emissiveIntensity;
        return mat;
      };
      // Skin: flat white matte with a self-lit floor, so the shadow side of an
      // 80 m sheet never falls to the grey the round-one render came out as.
      paint(primary, 0xffffff, 0.0, 0.62, 0x39424a);
      // Seam / frame grey: the lattice the cells sit in. Between the white skin
      // and the dark cell face, so it reads as structure and not as a gap.
      paint(secondary, 0xb9c6d0, 0.05, 0.6, 0x272e34);
      // The cell face. `dark` arrives as an almost-black radome grey (0x262b31)
      // which on this model would read as holes punched in the wing; a
      // photovoltaic cell is a dark BLUE absorber, and lifting it to that plus
      // a low roughness is what makes sixteen rectangles read as an array
      // rather than as battle damage.
      paint(dark, 0x3f5266, 0.3, 0.3, 0x161d26);
      // Bright structural white for spar caps, door lips and antenna masts -
      // one step above the seam grey so edge details stay visible on a white
      // aircraft.
      paint(light, 0xe8eef2, 0.06, 0.55, 0x333c43);

      // ---- The plank -----------------------------------------------------
      // ONE surface, 30.0 across and 2.4 deep at the root, tapering to a 1.0
      // chord at the tip. Extrusion depth 0.16: this is the whole structural
      // thickness of the aircraft, and it is a quarter of the thinnest wing
      // already in the game (the UAV's 0.22 over a 14.4 span). A solar plank
      // has no volume to spare - it is a sheet that happens to fly.
      //
      // The leading edge is UNSWEPT out to x 11 and then rakes very gently
      // back, and the trailing edge steps forward at x 4.6. Both are small
      // moves on purpose: sweep is a transonic feature and this thing loiters
      // at 90 knots, so a straight span is the honest shape and it is also the
      // one that cannot be mistaken for the swept planforms around it.
      // Root chord is 2.16 (z -1.36..0.8), not the 2.4 of round two. The deeper
      // root put a bright white wedge in front of the array at the centreline
      // that read as a separate triangular body bolted between two wings - the
      // exact fuselage-and-wings impression this model exists to avoid. Pulling
      // the root leading edge back to -1.36 brings the plank's own chord within
      // 0.1 of the array's 2.16 coverage, so from above the white skin is a
      // hairline border around the cells rather than a shape of its own.
      const plank = extrudedSurface([
        [0, -1.36], [4.6, -1.38], [11.0, -1.12], [15.0, -0.5],
        [15.0, 0.5], [11.0, 0.72], [4.6, 0.8], [0, 0.82],
        [-4.6, 0.8], [-11.0, 0.72], [-15.0, 0.5], [-15.0, -0.5],
        [-11.0, -1.12], [-4.6, -1.38]
      ], 0.16);
      add(plank, primary, 0, 0, 0);

      // ---- Solar panel grid: the most important feature on the model -------
      // Sixteen cells - eight per side - laid across the top of the plank as
      // raised slats in the DARKER of the two skin greys, with the white plank
      // showing between them as the seam. Raised rather than painted because a
      // flat colour change reads as camouflage at any distance, while a 0.05
      // step catches the key light and reads as hardware.
      //
      // Cell 0 starts at x 1.5 (clear of the core pod) and each is 1.55 wide on
      // a 1.68 pitch, so the seam is 0.13 - about 8% of the cell, which is what
      // an actual panel array looks like from above. The outermost cell ends at
      // x 14.1, leaving the last 0.9 of span as bare structure for the tip.
      //
      // Cell chord shrinks outboard with the plank's own taper (1.86 at the
      // root down to 0.74 at the tip) so the array covers the surface instead
      // of overhanging its trailing edge, and each cell's z centre follows the
      // wing's mid-chord line, which drifts aft from -0.4 to +0.11.
      //
      // TWO ROWS per side, not one. Round one laid a single row of cells whose
      // chord (2.0 down to 0.78) was larger than their width (1.55), and a row
      // of tall thin rectangles is read as STRIPES - which is exactly what the
      // first render showed. Splitting the chord into a fore and an aft cell
      // gives 32 cells that are wider than they are deep, and the continuous
      // chordwise seam between the two rows is the second axis a grid needs.
      // One row is a barcode; two rows is a lattice.
      for (const side of [-1, 1]) {
        // The lattice: one continuous seam-grey plate under the whole array,
        // sized so it stands 0.06 outboard of every cell in both axes. The
        // cells are then dropped ON it, and what shows between them is this
        // plate - so the seams are a real surface at a real depth rather than
        // gaps that let the white skin through at full brightness.
        add(geometry.panel, secondary, side * 7.87, 0.1, -0.16, 13.14, 0.055, 2.16);
        for (let cell = 0; cell < 8; cell += 1) {
          const cx = 1.55 + cell * 1.62 + 0.81;
          const t = cx / 15.0;
          const chord = 1.86 - 1.12 * t;
          const midZ = -0.4 + 0.51 * t;
          // Fore and aft cell of this bay. Each is 1.44 wide on a 1.62 pitch
          // (0.18 seam = 11% of pitch) and half the local chord deep less a
          // 0.1 seam, so the lattice shows on all four sides of every cell.
          const half = chord * 0.5;
          add(geometry.panel, dark, side * cx, 0.135, midZ - half * 0.5, 1.44, 0.05, half - 0.1);
          add(geometry.panel, dark, side * cx, 0.135, midZ + half * 0.5, 1.44, 0.05, half - 0.1);
        }
        // Structural spar caps along the leading and trailing edges, in the
        // bright structural white. They give the plank a defined outline from
        // above and cap the array so it does not bleed off the surface.
        add(geometry.panel, light, side * 8.0, 0.07, -1.3, 13.4, 0.09, 0.17);
        add(geometry.panel, light, side * 8.0, 0.07, 0.66, 13.4, 0.09, 0.17);
        // ONE spanwise rib, at the three-quarter station, and drawn in the seam
        // grey rather than the structural white. Round two put two ribs in
        // `light` at 0.11 wide, and on screen they came out as bare white bands
        // interrupting the array - a rib that is brighter than the cells around
        // it stops being structure and becomes a gap. Grey, narrow, and only
        // one of them: the array's job is to be continuous.
        add(geometry.panel, secondary, side * 8.03, 0.15, -0.1, 0.09, 0.08, 1.9);
      }

      // ---- Authentication core: the centre pod and the ring ----------------
      // A flat DISC, not a blister. Round two built the pod from the shared
      // sphere and it rendered as a big white dome sitting on the spine - the
      // single most eye-catching mass on the model, and it read as a cockpit,
      // which is the one thing an unmanned platform must not have. A sphere
      // squashed to y 0.34 still bulges at the crown, exactly the way the A-100
      // payload's notes say a squashed sphere always will.
      //
      // So: a 14-sided cylinder 1.5 in radius and 0.34 thick, laid flat. Total
      // height above the skin is 0.25 against a 30-unit span - a coin on a
      // sheet. Chamfered by a second, wider, thinner disc underneath so the
      // edge is a bevel rather than a wall.
      const corePlate = new THREE.CylinderGeometry(1.5, 1.5, 0.34, 14, 1, false);
      const coreSkirt = new THREE.CylinderGeometry(1.86, 1.62, 0.16, 14, 1, false);
      add(coreSkirt, primary, 0, 0.03, -0.36);
      add(corePlate, secondary, 0, 0.12, -0.36);

      // THE RING. A torus lying FLAT in the wing plane - Ophan's sigil, and the
      // one saturated thing on the machine. Radius 2.3 with a 0.13 tube, so it
      // is a hoop around the core pod rather than a disc: the hole in the middle
      // is what makes it read as a ring, and the pod showing through it is what
      // makes it read as mounted.
      //
      // rotateX on the geometry rather than on the mesh, because `add` only
      // exposes rotation.z. Painted with the emissive canopy material - the
      // only emissive surface the model has - so it glows on a machine that is
      // otherwise entirely unlit, and a second slightly larger, dimmer accent
      // ring sits under it as the housing.
      const coreRing = new THREE.TorusGeometry(2.3, 0.13, 8, 40);
      coreRing.rotateX(Math.PI / 2);
      const ringHousing = new THREE.TorusGeometry(2.52, 0.09, 6, 40);
      ringHousing.rotateX(Math.PI / 2);
      add(coreRing, canopy, 0, 0.2, -0.36);
      add(ringHousing, accent, 0, 0.16, -0.36);
      // Four short spokes bridging the pod to the ring, so the hoop is
      // structurally carried rather than floating around the core.
      for (const side of [-1, 1]) {
        add(geometry.panel, secondary, side * 1.75, 0.16, -0.36, 1.3, 0.07, 0.22);
        add(geometry.panel, secondary, 0, 0.16, -0.36 + side * 1.75, 0.22, 0.07, 1.3);
      }
      // The core eye itself: a small emissive lens on top of the plate, on the
      // ring's own axis. From directly above this is the pupil inside the ring.
      // A disc for the same reason the plate is one - the shared sphere would
      // put a second dome on a machine whose whole read is flatness.
      const coreLens = new THREE.CylinderGeometry(0.62, 0.72, 0.12, 14, 1, false);
      add(coreLens, canopy, 0, 0.3, -0.36);

      // ---- Drone bays: a row of openings along the underside ---------------
      // Five per side. Each is a dark recess set BELOW the skin (y -0.14
      // against a plank underside of -0.08), so from above and from the side
      // there is nothing to see, and from underneath there is a row of black
      // rectangles down the span. That asymmetry is the whole idea - the bays
      // exist only when the player is under the node.
      //
      // Bay 0 sits at x 2.9 and they step out on a 2.2 pitch to x 11.7. Each
      // gets a pale door lip fore and aft so the opening reads as a hatch in a
      // surface rather than as a painted patch.
      for (const side of [-1, 1]) {
        for (let bay = 0; bay < 5; bay += 1) {
          const bx = 2.9 + bay * 2.2;
          add(geometry.panel, dark, side * bx, -0.14, -0.15, 1.5, 0.14, 1.05);
          add(geometry.panel, light, side * bx, -0.12, -0.72, 1.62, 0.1, 0.12);
          add(geometry.panel, light, side * bx, -0.12, 0.42, 1.62, 0.1, 0.12);
        }
        // A ventral keel strip running the length of the bay row, which is what
        // the doors are cut into. Kept shallow (0.1) so the node stays a sheet.
        add(geometry.panel, secondary, side * 7.3, -0.11, -0.15, 11.5, 0.1, 1.5);
      }

      // ---- Antennas --------------------------------------------------------
      // Four hair-thin masts, 0.06 across: two standing off the top surface and
      // two hanging below it, set at different stations so they never line up
      // into a pair of fins. At 0.06 x 1.5 they are threads, which is the only
      // way an antenna can be told apart from a tail on a wing this thin - a
      // mast any thicker than this reads as a vertical stabiliser and turns the
      // whole platform back into an aircraft.
      add(geometry.panel, light, -3.9, 0.72, 0.1, 0.06, 1.28, 0.06);
      add(geometry.panel, light, 3.9, 0.72, 0.1, 0.06, 1.28, 0.06);
      add(geometry.panel, light, -6.5, -0.62, -0.5, 0.05, 1.05, 0.05);
      add(geometry.panel, light, 6.5, -0.62, -0.5, 0.05, 1.05, 0.05);
      // Small sensor pads at the foot of the two dorsal masts, so the threads
      // are planted on hardware rather than growing out of the skin. Flat pads
      // in the seam grey, not dark blisters: `dark` is the array's cell colour
      // on this model, and two dark dots out on the span were read as two
      // missing panels in the round-one render.
      add(geometry.panel, secondary, -3.9, 0.16, 0.1, 0.44, 0.1, 0.44);
      add(geometry.panel, secondary, 3.9, 0.16, 0.1, 0.44, 0.1, 0.44);

      // ---- Tips ------------------------------------------------------------
      // Tip fences: the only vertical surfaces on the node. Round two drew them
      // 0.7 tall and they rendered as grey boxes capping the span - at this
      // aspect ratio anything with visible height at the tip reads as a fin,
      // and a fin is an aircraft part. Halved to 0.34 and stretched in chord so
      // what remains is a thin blade lying along the edge: enough to end the
      // plank on, not enough to be a tail.
      add(geometry.panel, secondary, -14.9, 0.15, -0.02, 0.1, 0.34, 1.1);
      add(geometry.panel, secondary, 14.9, 0.15, -0.02, 0.1, 0.34, 1.1);
      // Nav lights at the geometric wingtips: left red, right green. Kept
      // because they are what an object in controlled airspace carries, and
      // they are the only warm colour anywhere on the machine.
      add(geometry.canopy, navL, -15.0, 0.06, 0.0, 0.16, 0.16, 0.16);
      add(geometry.canopy, navR, 15.0, 0.06, 0.0, 0.16, 0.16, 0.16);
    }
  });
}
