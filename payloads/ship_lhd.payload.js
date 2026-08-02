// LHD - amphibious assault ship (Wasp-class idiom, 257 m LOA).
//
// The mothership of the landing force's air arm: armed transport helos and
// gunships (M04 / M14) fly off a full-length flight deck, and the vehicles go
// out the stern through a well dock. It is the missing middle of the naval
// roster - the LST is a 165 m box of trucks with a bow ramp, the carrier is a
// 330 m airfield, and this sits between them at 257 m as the hull the helo
// waves actually come from.
//
// SILHOUETTE. Three marks tell it from the carrier at a kilometre, and all
// three are drawn rather than implied:
//   * a full-length flight deck with NO angled recovery deck and no catapult
//     lines - a rectangle of deck with a column of helo spot circles down the
//     centre, which is the whole visual argument for "helicopters, not jets",
//   * an island that is small, tall and set hard against the starboard deck
//     edge (the carrier's is a long low block set inboard),
//   * an open well dock at the stern: a squared-off notch cut into the
//     transom with the dock gate lying down inside it, which no other hull in
//     the game has.
//
// SCALE. Bow at -Z, one unit = one metre, the same contract every hull here is
// built on (aegis 155 m -> 128-long hull panel + bow cone; carrier 330 m ->
// 300 + cone). The deck here runs z -124 .. +126 = 250 m of deck inside a
// 257 m hull, and the hull panel is 230 long with the bow wedge carrying the
// remaining ~27 m forward.
//
// BEAM. Real Wasp is 32 m of flight deck on a 42 m hull at the sponsons. The
// deck is drawn 48 wide instead - 50% over scale - and this is a deliberate
// trade made after looking at the first render. At a true 32 the top view is
// a plank: 250 long by 32 wide is a 7.8:1 rectangle, and next to the
// carrier's 332x76 (4.4:1) it reads as "a thinner carrier" rather than as a
// different class of ship. 250x48 is 5.2:1, which is close enough to the
// carrier's proportion that the eye compares them, and the comparison is the
// one that says "shorter, beamier, no angled deck". Length is exact at 257 m
// because that is the number the roster is built on; beam is the one given up.
export default function register(ctx) {
  const { SHIP_TYPES } = ctx.tables;
  const carrier = SHIP_TYPES.carrier;
  if (!carrier) {
    throw new Error("[lhd] expected the carrier entry to spread from");
  }

  // BALANCE TODO: placeholder. Everything not listed in the overrides below is
  // the carrier's number, inherited by spread and deliberately untouched:
  // cruiseSpeed, turnRate, the whole `aa` spec, blastSpread, smokeOffset,
  // smokeHeight, radarColor / tracerColor / explosionColor. A 257 m amphib
  // should not steer, shoot or burn exactly like a 330 m supercarrier - hp
  // 1040 in particular is four LASM, which is capital-ship money for a hull
  // whose job is to be interrupted rather than to be a fortress. Left as-is on
  // purpose: this payload is a MODEL, and picking those numbers is a balance
  // pass with missions to test them in, which this is not.
  //
  // What IS authored here: identity (key/label/role), the hull's physical size
  // (hitRadius / crash / hitBox / sinkDepth / stern-bow offsets), and the
  // subsystem fit, because all of those are statements about the geometry
  // below and would be simply wrong if inherited from a 330 m hull.
  ctx.addShipType("lhd", {
    ...carrier,
    key: "lhd",
    surface: true,
    label: "LHD",
    role: "Amphibious Assault Ship",
    // Sized off the model, not off the carrier. Hull 257 m long x 48 m over
    // the flight deck x 64 m from waterline to the island's mast head.
    hitRadius: 118,
    crash: Object.freeze({ halfLen: 130, halfBeam: 26, top: 24 }),
    hitBox: Object.freeze({ x: 52, y: 44, z: 264 }),
    sinkDepth: 36,
    sternOffset: 126,
    bowOffset: 130,
    // The two gun tubs the ciws subsystems sit on, in hull-local z. Read by
    // the AA burst code for tracer origins, so they have to be the model's
    // own mounts and nothing else.
    aaMounts: Object.freeze([-108, 110]),
    aaHeight: 24,
    // NEXT-target walk: hull, then this array in order. Every offset below is
    // the centre of a part the build() function actually draws - the numbers
    // are repeated in comments at each part so the two cannot drift.
    //
    // Fit is a real Wasp's: no VLS anywhere (an amphib carries none), one gun
    // position up on the island, and a CIWS drum at each end of the deck.
    subsystems: Object.freeze([
      // -> island gun tub: shipCylinder at (18, 24.4, -20), barrel above it.
      Object.freeze({ key: "aa-island", kind: "aa", offset: Object.freeze({ x: 18, y: 25, z: -20 }) }),
      // -> forward CIWS drum: shipCylinder at (-24, 23.6, -108) on the port
      //    bow deck-edge sponson.
      Object.freeze({ key: "ciws-fore", kind: "ciws", offset: Object.freeze({ x: -24, y: 24, z: -108 }) }),
      // -> aft CIWS drum: shipCylinder at (24, 23.6, 110) on the starboard
      //    quarter sponson.
      Object.freeze({ key: "ciws-aft", kind: "ciws", offset: Object.freeze({ x: 24, y: 24, z: 110 }) })
    ])
  });

  ctx.addShipModel("lhd", {
    build(env) {
      const {
        geometry, add,
        hull, deck, house, dark, light, olive2, markings
      } = env;

      // ---- Hull -------------------------------------------------------
      // 226 m of parallel body, 36 wide at the waterline, with the bow wedge
      // carrying the forward 31 m. Boot topping (the dark band) is drawn a
      // touch proud of the hull exactly as the carrier and Aegis draw theirs.
      add(geometry.panel, hull, 0, 8, 10, 36, 18, 226);
      // shipBow is ConeGeometry(1, 1, 4) - a 4-sided pyramid of RADIUS 1 and
      // HEIGHT 1. Three.js composes as T*R*S, so the scale is applied in the
      // cone's OWN frame and only then swung round by the -PI/2 x-rotation.
      // That means the axes are not what the argument names suggest, and
      // getting it wrong is how the first pass hung a black fin under the
      // keel (sy 22 on an 18 m hull = a 44 m deep wedge):
      //   sx -> half-BEAM   (18 => 36 m across, matching the 36 m hull)
      //   sy -> LENGTH      (31 => the forward 31 m, tip landing at z -128.5)
      //   sz -> half-DEPTH  (9  => 18 m tall, exactly the hull's 18, so the
      //         wedge's top and bottom are the hull's own)
      // Cross-check against the Aegis, which is the same idiom at 155 m:
      // (9.5, 20, 5) on a hull 19 wide x 9 tall x 128 long.
      add(geometry.shipBow, hull, 0, 8, -113, 18, 31, 9, -Math.PI / 2);
      add(geometry.panel, dark, 0, 1, 10, 36.6, 2, 227);
      // Sponson shelf: the hull flares out under the deck overhang along the
      // whole parallel body, which is what stops the flight deck from looking
      // like a plank balanced on a box in the side and front views.
      add(geometry.panel, hull, -19, 15, 6, 6, 7, 196);
      add(geometry.panel, hull, 19, 15, 6, 6, 7, 196);

      // ---- Well dock --------------------------------------------------
      // The identity mark at the stern: the transom is left OPEN. Rather than
      // one box across the back, the aft 44 m of hull is drawn as two side
      // walls and a floor, so there is a real 15 m x 40 m hole you can see
      // into from the rear 3/4 view. The gate lies flat in the water behind
      // it, lowered, which is what an LHD looks like when it is working.
      add(geometry.panel, hull, -13.5, 8, 105, 9, 18, 48);
      add(geometry.panel, hull, 13.5, 8, 105, 9, 18, 48);
      // Dock floor, awash - dark so the opening reads as a shadowed cavity
      // rather than a notch in a bright surface. Dropped to y 2.6 and the
      // walls left full height so the cavity is 12 m deep at the transom,
      // which is what makes it survive being lit from above in the TOP view.
      add(geometry.panel, dark, 0, 2.6, 105, 18, 2, 48);
      // Dock side walls, inboard faces, in the dark paint - two more surfaces
      // of shadow inside the mouth. Without these the first render read the
      // opening as a flat notch rather than a hole.
      add(geometry.panel, dark, -9.4, 8, 105, 1.2, 16, 48);
      add(geometry.panel, dark, 9.4, 8, 105, 1.2, 16, 48);
      // Overhead of the dock (the underside of the flight deck aft) and the
      // transom lintel over the opening.
      add(geometry.panel, dark, 0, 16.6, 105, 18, 3, 48);
      // Lowered stern gate: a ramp hinged at the sill, angled down aft.
      add(geometry.panel, light, 0, 3, 134, 17, 1.4, 18, 0.3);
      // Two LCACs / landing craft chocked in the dock, army green like the
      // LST's vehicles - the cargo is the point, so it is drawn. Sat down in
      // the well (y 5.0) so they are seen THROUGH the transom mouth, which is
      // the readout that the opening is an opening.
      add(geometry.panel, olive2, 0, 5, 96, 12, 3.4, 18);
      add(geometry.panel, dark, 0, 7.4, 94, 7, 1.6, 7);
      add(geometry.panel, olive2, 0, 5, 118, 12, 3.4, 18);
      add(geometry.panel, dark, 0, 7.4, 116, 7, 1.6, 7);

      // ---- Flight deck ------------------------------------------------
      // 250 m x 48 m, flush, no angle and no catapult. Drawn as a solid slab
      // (not the carrier's textured plane, which paints jet runway decals -
      // exactly the wrong marks for this ship) with the deck edge picked out
      // dark so the plan view has an outline. Ends at z +126, so the deck
      // overhangs the well dock rather than being cut short of it - which is
      // what a real LHD does, and why the dock is a cave rather than a trench.
      add(geometry.panel, deck, 0, 20, 1, 48, 3, 250);
      // Deck edge, drawn just BELOW the deck surface rather than flush with
      // it. The second pass had these standing proud at deck level, where a
      // 1.4 m dark stripe down each side ate 3 m off a 48 m deck in the TOP
      // view and made the beam the ship was widened for read as narrow again.
      add(geometry.panel, dark, -23.8, 18.9, 1, 1.2, 2.2, 250);
      add(geometry.panel, dark, 23.8, 18.9, 1, 1.2, 2.2, 250);
      // Deck-edge safety nets, port side and forward - thin dark strips just
      // below deck level, the detail that keeps the side view from being two
      // flat rectangles.
      add(geometry.panel, dark, -25.4, 18.8, 1, 3, 0.5, 236);
      add(geometry.panel, dark, 25.4, 18.8, -60, 3, 0.5, 110);
      // Deck-edge aircraft elevator, port side aft - a Wasp's second elevator
      // hangs off the port quarter, and it is the one asymmetry on this side.
      add(geometry.panel, deck, -26.5, 20, 60, 8, 2.6, 24);

      // ---- Helo spots -------------------------------------------------
      // Nine landing circles down the deck, painted white with the shockRing
      // geometry (an annulus) laid flat - the same part the Aegis and frigate
      // use for their single helo circle, so the paint reads the same on all
      // three hulls. Radius 9 m spots on a 26 m pitch: the column of rings IS
      // the "this ship flies helicopters" signal from the top view, and there
      // is no other way to say it at this range.
      //
      // The column runs down the PORT half of the deck (x -7) rather than the
      // centreline, because the island eats the starboard side aft - which is
      // where a Wasp's spots actually are, and it also leaves the starboard
      // strip free as the taxi lane the parked airframes sit on.
      for (let spot = 0; spot < 9; spot += 1) {
        const sz = -110 + spot * 26;
        add(geometry.shockRing, markings, -10, 21.6, sz, 9.5, 9.5, 1, -Math.PI / 2);
      }
      // Spot numbers, or as close as a primitive gets to one: a short bar
      // painted just outboard of each circle, alternating side so the deck
      // does not read as one dashed line.
      for (let spot = 0; spot < 9; spot += 1) {
        const sz = -110 + spot * 26;
        add(geometry.panel, markings, spot % 2 ? -21.5 : 1.5, 21.6, sz, 3.6, 0.4, 1.2);
      }

      // ---- Island -----------------------------------------------------
      // Compact, TALL, and hard against the starboard deck edge (x +18 on a
      // 48-wide deck, i.e. the outboard sixth) rather than the carrier's long
      // low block set inboard. Height is the readable difference: this island
      // stands 34 m above the deck on a 12 m footprint, so from the side it
      // is a tower, where the carrier's is a shed with a pole on it.
      //
      // Two renders were spent losing this island in the deck. The fix was not
      // more parts, it was VALUE: the deck slab and `house` sit close enough
      // in tone that a superstructure painted entirely in `house` disappears
      // against it from directly overhead, which is the view the player spends
      // an attack run in. The base block stays `house`, but every level above
      // it steps up to `light` (the near-white the masts and gun tubs use), so
      // the tower reads as a bright stack against a dark deck in the TOP view
      // and as a silhouette in the two three-quarters.
      // Footprint is 14 m x 48 m. A real Wasp's island is about 50 m long on a
      // 250 m deck and the fourth render still had this at 34 - readable, but
      // reading as a deckhouse rather than as the ship's one tower. 48 is the
      // number that makes the starboard side of the TOP view look occupied.
      add(geometry.panel, house, 18, 29, 8, 14, 15, 48);
      add(geometry.panel, light, 18, 39.5, -2, 11.5, 7.5, 28);
      add(geometry.panel, dark, 18, 43.6, -2, 12.1, 1.2, 28.6);
      // Bridge windows: one dark band wrapping the forward face of the upper
      // block, tilted like a real bridge visor.
      add(geometry.panel, dark, 18, 40, -15.8, 11.7, 3.4, 1.4, -0.22);
      // Two uptakes / stacks aft on the island - a Wasp has a pair, and they
      // are the easiest way to tell the island from the carrier's single one.
      add(geometry.panel, light, 18, 42, 17, 8, 11, 10);
      add(geometry.panel, dark, 18, 47.8, 17, 8.4, 1.6, 10.4);
      add(geometry.panel, light, 18, 40, 28, 6.8, 9, 8);
      add(geometry.panel, dark, 18, 44.8, 28, 7.2, 1.6, 8.4);
      // Mast: two canted legs and a cross brace, topped by an octagonal air
      // search plate and a whip - the frigate's lattice idiom, shortened.
      add(geometry.shipCylinder, dark, 16.4, 52, 5, 0.6, 16, 0.6, 0, 0, 0.07);
      add(geometry.shipCylinder, dark, 19.6, 52, 5, 0.6, 16, 0.6, 0, 0, -0.07);
      add(geometry.panel, dark, 18, 55, 5, 5.2, 0.5, 0.5);
      add(geometry.shipOctPlate, light, 18, 61, 5, 4, 0.8, 4, Math.PI / 2, 0, 0.5);
      add(geometry.shipCylinder, dark, 18, 65, 5, 0.34, 6, 0.34);
      // SPS-style flat panels on the island's two faces, port and outboard.
      add(geometry.shipOctPlate, light, 25.4, 34, -8, 3.2, 0.8, 3.2, Math.PI / 2, 0, Math.PI - 0.5);
      add(geometry.shipOctPlate, light, 10.6, 34, -8, 3.2, 0.8, 3.2, Math.PI / 2, 0, 0.5);

      // ---- Subsystem hardware -----------------------------------------
      // Every mount below is drawn where its subsystems offset says it is.
      // aa-island  -> (18, 25, -20)    gun tub + barrel on the island's front
      add(geometry.shipCylinder, light, 18, 24.4, -20, 2.4, 2.6, 2.4);
      add(geometry.panel, dark, 18, 26.6, -24.6, 0.55, 0.55, 8, -0.3);
      // ciws-fore  -> (-24, 24, -108)  drum on the port bow deck-edge sponson
      add(geometry.panel, dark, -24, 20.4, -108, 7, 5, 14);
      add(geometry.shipCylinder, light, -24, 23.6, -108, 2.1, 2.4, 2.1);
      add(geometry.enemyHitbox, light, -24, 25.8, -108, 0.17, 0.17, 0.17);
      // ciws-aft   -> (24, 24, 110)    drum on the starboard quarter sponson
      add(geometry.panel, dark, 24, 20.4, 110, 7, 5, 14);
      add(geometry.shipCylinder, light, 24, 23.6, 110, 2.1, 2.4, 2.1);
      add(geometry.enemyHitbox, light, 24, 25.8, 110, 0.17, 0.17, 0.17);

      // ---- Parked helicopters -----------------------------------------
      // Three airframes chocked down the STARBOARD taxi lane, clear of the
      // spot column and forward of the island. Deliberately crude - a
      // fuselage box, a tail boom, rotor BLADES and a tail rotor - because
      // createHeliModel is the flying unit's model and calling it here would
      // put a 4-metre-scale detailed helo on a 257-metre ship AND tie this
      // hull's build to that function's material contract.
      //
      // The rotor is drawn as FOUR THIN BLADES rather than the solid disc the
      // first pass used. A 19 m opaque disc at deck level rendered as a black
      // hole punched in the flight deck from directly overhead - it hid the
      // airframe underneath it and read as damage, not as an aircraft. Blades
      // let the deck and the fuselage show through the swept circle, which is
      // what makes the shape parse as a helicopter from the TOP view, and the
      // top view is the one where the deck clutter matters at all.
      //
      // Proportions are a Sea Stallion's: 22 m fuselage under a 22 m rotor,
      // which is why the blades reach past the tail boom.
      // PAINT ORDER matters more than the parts here, and the third render is
      // what proved it: with the blades in `light` over an `olive2` fuselage,
      // the TOP view showed three bright X's floating on a deck with no
      // aircraft under them. The rotor was the brightest thing in the group
      // and the airframe the dimmest, which is exactly backwards - the blades
      // are the accessory, the fuselage is the object. So the fuselage is now
      // `light` (it is the thing that must be seen) and the rotor is `dark`
      // (a shadow over it), which is also how a real grey-on-grey deck shot
      // reads.
      // All three sit FORWARD of the island (which now runs z -16 .. +32) with
      // the aftmost airframe's tail 6 m clear of the island's front face.
      const parked = [
        { x: 13, z: -100, ry: 0.16 },
        { x: 13, z: -68, ry: -0.1 },
        { x: 13, z: -36, ry: 0.22 }
      ];
      for (const helo of parked) {
        const { x, z, ry } = helo;
        const sin = Math.sin(ry);
        const cos = Math.cos(ry);
        // Fuselage, then the olive cockpit block stepped down at the nose.
        add(geometry.panel, light, x, 23.8, z, 5.4, 4.2, 15, 0, ry, 0);
        add(geometry.panel, olive2, x + sin * 8.8, 23.2, z - cos * 8.8, 4.2, 3.2, 4.6, 0, ry, 0);
        // Sponsons either side of the fuselage - the wide stance is what tells
        // a naval transport helo from a gunship at a glance.
        add(geometry.panel, olive2, x - cos * 3.4, 22.5, z - sin * 3.4, 1.9, 1.9, 6.4, 0, ry, 0);
        add(geometry.panel, olive2, x + cos * 3.4, 22.5, z + sin * 3.4, 1.9, 1.9, 6.4, 0, ry, 0);
        // Tail boom running aft, the fin, and the tail rotor disc on its side.
        add(geometry.panel, light, x - sin * 10.4, 24.4, z + cos * 10.4, 1.8, 1.8, 8, 0, ry, 0);
        add(geometry.panel, light, x - sin * 14.4, 26.6, z + cos * 14.4, 1.1, 5.2, 3.2, 0, ry, 0);
        add(geometry.shipCylinder, dark, x - sin * 14.4 + 1.2, 27.6, z + cos * 14.4,
          2.6, 0.3, 2.6, 0, 0, Math.PI / 2);
        // Rotor head on its mast, then the blades. TWO crossed blades rather
        // than the four an earlier pass drew: four at 45 deg spacing put eight
        // thin spokes in one circle and the TOP view read them as a scribble -
        // a spider on the deck, not a rotor. Two wide blades read as a rotor
        // at any size the ship is ever seen at, and they are also what a
        // parked airframe with its blades spread looks like from above once
        // the disc is not turning.
        add(geometry.shipCylinder, dark, x, 26.4, z - 1, 0.9, 2, 0.9);
        add(geometry.panel, dark, x, 27.4, z - 1, 2.2, 0.4, 21, 0, ry + 0.35, 0);
        add(geometry.panel, dark, x, 27.4, z - 1, 2.2, 0.4, 21, 0, ry + 0.35 + Math.PI / 2, 0);
      }
    }
  });
}
