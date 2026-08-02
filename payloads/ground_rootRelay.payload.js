export default function register(ctx) {
  const { GROUND_TYPES } = ctx.tables;

  // ---------------------------------------------------------------------------
  // 1. Spec
  // ---------------------------------------------------------------------------
  // `radarSite` is the spread source, for the same two reasons ewVehicle uses
  // it: it is the existing unarmed sensor entry (`aa: null`, so this thing never
  // shoots back - clearing it is an errand, not a duel), and it already carries
  // `dishSpin`, which the pivoted dish below needs. The unit is a transmitter,
  // not a weapon.
  //
  // It is NOT spread from `tank`/`adTank` even though it is a vehicle: this one
  // is a deployed relay standing on its outriggers, and giving it `mobile` would
  // let a mission drive a truck around with its jacks down and a nine-metre dish
  // erected. If a later pass wants it to convoy, `mobile` is the one field to
  // add and the outriggers become a lie - that is a deliberate fork, not an
  // oversight.
  //
  // BALANCE TODO: placeholder throughout. hp, smokeHeight, radarColor,
  // tracerColor, explosionColor and dishSpin are radarSite's numbers, spread
  // through unreviewed. Only the label/role text and the dimensions below are
  // authored for this unit.
  const radarSite = GROUND_TYPES.radarSite;
  if (!radarSite) {
    throw new Error("[rootRelay] expected the radarSite ground template to exist");
  }

  ctx.addGroundType("rootRelay", {
    ...radarSite,
    key: "rootRelay",
    label: "ROOT RELAY",
    role: "ROOT Transmission Window Relay",
    // BALANCE TODO: placeholder (radarSite's 70). A soft-skinned truck under a
    // deployed dish should probably be softer than an emplaced search radar,
    // but that is a tuning pass.
    hp: 70,
    // Dimensions are the one block that is NOT inherited: radarSite is a square
    // 12 m installation and this is an 11 m truck whose outriggers spread it to
    // 13.5 m across the pads and whose dish crown reaches 12.4 m. Measured off
    // the model below - hull z -5.5..+5.5, outrigger pads at x +/-6.0 and
    // z +/-4.4, dish top at 12.4 - so the lock box contains both the dish and
    // the deployed footprint instead of stopping at the cab roof.
    hitRadius: 22,
    crash: { halfLen: 5.6, halfBeam: 6.8, top: 12.5 },
    hitBox: { x: 14, y: 13, z: 13 },
    // BALANCE TODO: placeholder (radarSite's 7).
    smokeHeight: 7,
    // BALANCE TODO: placeholder (radarSite's 0.6). Kept deliberately at the
    // SEARCH rate rather than the AD tank's 1.4 - a transmission relay holds a
    // window on one bearing, so a slow sweep reads right and a fast one would
    // make it look like a tracking radar, i.e. like something that shoots.
    dishSpin: radarSite.dishSpin,
    aa: null
  });

  // ---------------------------------------------------------------------------
  // 2. Model
  // ---------------------------------------------------------------------------
  // Built nose-along -Z and to real metres, the frame every ground branch uses.
  //
  // SCALE, from measured existing implementations rather than by eye:
  //   - ewVehicle (payload, the nearest cousin) is a 10 m hull, 3.2 m wide over
  //     the tyres, wheels drawn as 0.85-radius cylinders = 1.7 m tyres.
  //   - the TEL payload is 19 m on 1.5 m wheels, chassis 2.9 m wide.
  //   The brief's 11 m therefore lands between them: hull z -5.5 .. +5.5,
  //   2.9 m over the frame, 3.4 m over the tyres, 0.8-radius (1.6 m) wheels on
  //   three axles. That keeps this unit visibly the same army's truck as the
  //   other two instead of a differently-scaled prop.
  //
  // THREE THINGS have to read from 2 km up, and the model spends its parts on
  // those and nothing else:
  //   1. THE DISH - 9 m across (radius 4.5) on an 11 m truck. It is 82% of the
  //      vehicle's whole length and it is the unit. Erected on a mast at 8.9 m
  //      so its lower rim clears the cab roof and it sits against open sky in
  //      every one of the four preview views.
  //   2. FOUR GROUND OUTRIGGERS - jack legs raked out to pads at x +/-6.0 and
  //      z +/-4.4, i.e. clear of BOTH the 3.4 m tyre track and the 4.5 m dish
  //      radius, so the four pads make an unmistakable 12 x 8.8 m rectangle in
  //      the top-down view that no other ground unit has. They are what says
  //      "deployed and jacked, not driving".
  //   3. CABLE REEL + EQUIPMENT BOXES on the rear deck - a drum with visible
  //      flanges and spokes, plus the transmitter crates it feeds.
  //
  // DIFFERENTIATION FROM othRadar (the brief's explicit requirement): that unit
  // is an 80 m FIXED FLAT LATTICE CURTAIN with no vehicle anywhere in it and no
  // rotating part at all. This one is a small truck carrying ONE solid circular
  // parabolic dish that spins. Flat rectangular mesh 8x the size of a building
  // versus round solid plate on wheels - there is no angle from which the two
  // silhouettes could be confused.
  ctx.addGroundModel("rootRelay", {
    build(env) {
      const { THREE, geometry, steel, olive, dark, light, markings, add, addRoot } = env;

      // ---- Running gear ----------------------------------------------------
      // Three axles: two aft under the equipment deck, one forward under the
      // cab, with the pair-gap amidships. Six wheels, drawn OUTBOARD of the
      // frame at x +/-1.7 so the count survives the top-down view.
      for (const side of [-1, 1]) {
        for (const z of [-3.4, 2.0, 3.9]) {
          add(geometry.shipCylinder, dark, side * 1.7, 0.8, z,
            0.8, 0.55, 0.8, 0, 0, Math.PI / 2);
        }
      }
      // Axle beams bridging each pair, so the underside is structure and not a
      // gap between six floating discs.
      for (const z of [-3.4, 2.0, 3.9]) {
        add(geometry.panel, steel, 0, 0.82, z, 3.4, 0.3, 0.5);
      }

      // ---- Chassis ---------------------------------------------------------
      // Deep box frame the full 11 m (z -5.5 .. +5.5), narrower than the wheel
      // track so the running gear stays visible under it.
      add(geometry.panel, olive, 0, 1.5, 0, 2.7, 1.2, 11);
      // Front bumper / tow pintle, the detail that gives the nose an end.
      add(geometry.panel, dark, 0, 1.3, -5.6, 3.2, 0.7, 0.5);

      // ---- Cab -------------------------------------------------------------
      // A short forward cab, deliberately SMALL: the whole read of this unit is
      // "the equipment is too big for the truck", and a full-length crew cab
      // would compete with the dish. Roof at 3.6 m against a 12.4 m dish crown.
      add(geometry.panel, olive, 0, 2.75, -3.9, 2.9, 1.9, 2.9);
      // Sloped windscreen on the forward face.
      add(geometry.panel, dark, 0, 3.0, -5.3, 2.4, 1.2, 0.35, -0.28);
      // Side glazing, so the cab reads as a cab and not as a crate.
      for (const side of [-1, 1]) {
        add(geometry.panel, dark, side * 1.5, 3.05, -3.9, 0.14, 0.9, 2.2);
      }
      // Roof cap in a lighter tone, separating cab from deck when both are seen
      // against the ground from directly above.
      add(geometry.panel, steel, 0, 3.75, -3.9, 3.0, 0.22, 3.0);

      // ---- Equipment deck --------------------------------------------------
      // The transmitter shelter behind the cab. This is the surface the mast is
      // bolted to, so it is flat-topped and it stops SHORT of the rear axle -
      // the last two metres of deck are left open for the reel.
      add(geometry.panel, olive, 0, 2.9, 0.4, 3.0, 2.2, 5.2);
      add(geometry.panel, steel, 0, 4.05, 0.4, 3.2, 0.28, 5.4);
      // Access door aft and a generator box on the flank: the two details that
      // keep the shelter from reading as a plain brick from behind and side-on.
      add(geometry.panel, dark, 0, 2.8, 3.05, 1.6, 1.6, 0.3);
      add(geometry.panel, dark, -1.7, 2.6, 1.4, 0.4, 1.1, 2.4);

      // ---- IDENTITY 3: cable reel and equipment boxes -----------------------
      // The drum sits across the tail of the deck, axis athwartships, so its
      // circular flanges face out to port and starboard and it reads as a REEL
      // from the side and as a fat cylinder from above. 2.6 m over the flanges
      // on a 2.7 m frame: it is deck cargo, sized like real cable plant.
      // Pushed right aft to z 5.1, at the very tail of the 11 m chassis. Round 1
      // had it at 4.6 and the dish - which overhangs to z +4.9 when canted -
      // put it in shade in both the top and the front views. At the tail it
      // stands out past the whole dish footprint and is the one thing on the
      // rear of the vehicle.
      const REEL_Z = 5.1;
      const REEL_Y = 2.75;
      // Drum core, narrower than the flanges are apart so the flanges stand
      // proud of it and the drum reads as WOUND rather than as a solid roller.
      add(geometry.shipCylinder, dark, 0, REEL_Y, REEL_Z,
        1.15, 2.0, 1.15, 0, 0, Math.PI / 2);
      // The two flanges. These discs are the whole reel read - without them the
      // drum is just another cylinder on a truck full of cylinders. They are
      // 3.0 m across on a 2.9 m body, i.e. the reel is as wide as the truck.
      for (const side of [-1, 1]) {
        add(geometry.shipOctPlate, light, side * 1.15, REEL_Y, REEL_Z,
          1.5, 0.2, 1.5, 0, 0, Math.PI / 2);
        // Four spokes per flange, laid across the disc face at 45 degrees to
        // each other. A blank disc reads as a wheel; spokes read as a reel.
        for (let s = 0; s < 4; s += 1) {
          add(geometry.panel, steel, side * 1.28, REEL_Y, REEL_Z,
            0.13, 2.8, 0.13, s * Math.PI / 4, 0, 0);
        }
        // Reel cradle: an A-stand under each flange, down onto the chassis deck,
        // so the drum is mounted rather than balanced.
        add(geometry.panel, steel, side * 1.28, 1.8, REEL_Z, 0.4, 1.9, 1.0);
      }
      // Paid-out cable: a run leaving the bottom of the drum forward along the
      // deck and down the flank into the ground. It is what makes the reel read
      // as IN USE - a relay that is transmitting is a relay that is plugged in.
      add(geometry.panel, dark, 0, 1.6, 3.7, 0.36, 0.36, 2.4);
      add(geometry.panel, dark, 1.1, 1.1, 2.5, 0.32, 0.32, 2.0, 0, -0.5, 0);
      add(geometry.panel, dark, 2.3, 0.32, 1.5, 0.3, 0.3, 2.6, 0, -0.9, 0);
      // Two transmitter crates on the deck between shelter and reel, flanking
      // the mast foot. Kept low so they never crowd the dish.
      for (const side of [-1, 1]) {
        add(geometry.panel, steel, side * 0.95, 4.55, 2.4, 1.1, 0.75, 1.6);
      }

      // ---- IDENTITY 2: four ground outriggers ------------------------------
      // Jack legs at the four corners of the chassis, raked OUTBOARD so their
      // pads land at x +/-4.2 - well outside the 3.4 m tyre track - and z
      // +/-3.6. Four pads at the corners of an 8.4 x 7.2 m rectangle is a
      // footprint no other ground unit in the game draws, and it is legible from
      // directly overhead, which is where this is mostly seen from.
      //
      // Each leg is drawn by SPAN, not by eye: the box is placed at the midpoint
      // of the two endpoints, its Y scaled to the true length and rotated about
      // Z by the span's own angle. That is the only way a raked member lands on
      // BOTH the point it hangs from and the pad it stands on; rotating a
      // centred box by a guessed angle swings both ends off the vehicle (the
      // othRadar payload documents the same failure and the same fix).
      // PAD_X is set from the DISH radius, not from the chassis: at 4.5 m the
      // dish overhangs the truck so far that pads inside its radius are hidden
      // under the disc in the top-down view - which is the view this identity
      // exists for. Round 1 of this model had them at 4.2 and lost them. 6.0
      // puts every pad clear of the 4.5 m plate with a 1.5 m margin, so the four
      // corners read as four corners from directly overhead.
      const HANG_X = 1.45;   // where the leg leaves the chassis frame
      const HANG_Y = 1.55;
      const PAD_X = 6.0;     // where the pad lands - outside the dish radius
      const PAD_Y = 0.42;
      const legDx = PAD_X - HANG_X;
      const legDy = HANG_Y - PAD_Y;
      const legLen = Math.hypot(legDx, legDy);
      const legTilt = Math.atan2(legDx, legDy);
      for (const side of [-1, 1]) {
        for (const z of [-4.4, 4.4]) {
          // Outrigger beam: the horizontal box the leg slides out of, which is
          // what says the legs were EXTENDED rather than welded on. It is drawn
          // full-length from the frame out to the pad, so from above the four
          // arms are visible as arms even where the dish shades the pad itself.
          add(geometry.panel, olive, side * ((HANG_X + PAD_X) / 2 - 0.3), 1.75, z,
            PAD_X - HANG_X + 0.6, 0.5, 0.8);
          // The raked leg itself.
          add(geometry.panel, steel,
            side * (HANG_X + PAD_X) / 2, (HANG_Y + PAD_Y) / 2, z,
            0.5, legLen, 0.5, 0, 0, -side * legTilt);
          // Ground pad: a wide flat foot, painted light so it separates from the
          // terrain underneath it and the four pads count at a glance. 1.5 m
          // across - deliberately oversized for the leg it carries, because a
          // pad the width of its own jack is invisible from 2 km up.
          add(geometry.shipOctPlate, light, side * PAD_X, 0.24, z,
            1.5, 0.48, 1.5);
          // Hazard chevron on the pad - the one piece of unlit paint on the
          // unit, and it marks the four corners as the things standing on the
          // ground rather than as parts of the truck.
          add(geometry.panel, markings, side * PAD_X, 0.52, z, 1.05, 0.14, 1.05);
        }
      }

      // ---- Mast ------------------------------------------------------------
      // Two stages with a visible step, carrying the dish pivot to 8.9 m off a
      // 3.6 m cab.
      //
      // Stood at z -0.9, i.e. FORWARD of the chassis centre, not on it. Round 2
      // had it at 0.4 and the 4.5 m dish then covered the whole 11 m truck in
      // the top-down view - the unit read as a floating disc with four arms and
      // no vehicle, which loses half the identity ("dish too big FOR THE CAR"
      // needs the car). Moved forward, the dish shades the cab and the shelter
      // while the rear deck, the reel and the cable run stay in clear sky aft of
      // it, and the mass still sits inside the outrigger rectangle.
      const MAST_Z = -0.9;
      add(geometry.panel, steel, 0, 5.3, MAST_Z, 1.0, 2.4, 1.0);
      add(geometry.panel, light, 0, 7.5, MAST_Z, 0.7, 2.6, 0.7);
      // Two guy struts off the mast base down to the shelter roof, fore and aft,
      // running from the roof (y 4.2) up to the mast (y 5.6) so both ends are on
      // something. A mast carrying a nine-metre dish with nothing bracing it
      // reads as an error.
      add(geometry.panel, dark, 0, 4.9, MAST_Z - 1.3, 0.2, 0.2, 2.0, 0.66);
      add(geometry.panel, dark, 0, 4.9, MAST_Z + 1.3, 0.2, 0.2, 2.0, -0.66);
      // Slew ring at the top of the mast: the bearing the dish turns on. It
      // gives the spinning assembly a visible joint instead of an intersection.
      add(geometry.shipCylinder, dark, 0, 8.75, MAST_Z, 0.95, 0.4, 0.95);

      // ---- IDENTITY 1: the oversized deployed dish -------------------------
      // 9 m across (plate radius 4.5) against an 11 m truck and a 2.9 m body.
      // It is over three times the width of the vehicle it stands on, and that
      // disproportion is the entire point of the unit - a relay is an aperture
      // with a truck attached, not a truck with an antenna.
      //
      // Construction follows the search radar and ewVehicle exactly: an
      // octagonal plate on a Group handed back as `dish`, so updateGroundUnit
      // sweeps it while the unit is alive and it stops dead when it is not. The
      // plate, its rim, its ribs and its feed all live on a TILTED SUB-GROUP so
      // the feed boom is genuinely normal to the dish face - tilting each mesh
      // separately leaves the feed off-axis, which is the failure the ewVehicle
      // payload documents.
      const dishPivot = new THREE.Group();
      dishPivot.position.set(0, 8.9, MAST_Z);
      const face = new THREE.Group();
      // Canted back 40 deg: enough elevation that the dish face is presented to
      // the camera in the top view (where its diameter is the read) while the
      // side view still shows it edge-on as a tall disc rather than as a line.
      face.rotation.x = -0.7;
      dishPivot.add(face);

      const DISH_R = 4.5;
      const plate = new THREE.Mesh(geometry.shipOctPlate, light);
      plate.scale.set(DISH_R, 0.3, DISH_R);
      face.add(plate);
      // Rim ring standing proud of the front face. A flat octagon reads as a
      // table top; a rim gives it depth and says "reflector".
      const rim = new THREE.Mesh(geometry.shipCylinder, steel);
      rim.scale.set(DISH_R * 1.02, 0.5, DISH_R * 1.02);
      rim.position.set(0, 0.32, 0);
      face.add(rim);
      // Back ribs: four radial spars across the rear face, the structure a dish
      // this size obviously needs. They are also what stops the back of the
      // plate from being a blank disc in the rear three-quarter view.
      for (let i = 0; i < 4; i += 1) {
        const rib = new THREE.Mesh(geometry.panel, dark);
        rib.scale.set(0.28, 0.28, DISH_R * 1.9);
        rib.position.set(0, -0.4, 0);
        rib.rotation.y = i * Math.PI / 4;
        face.add(rib);
      }
      // Hub casting on the back, where the ribs meet the pivot.
      const hub = new THREE.Mesh(geometry.shipCylinder, steel);
      hub.scale.set(1.15, 1.2, 1.15);
      hub.position.set(0, -0.85, 0);
      face.add(hub);

      // Feed on a tripod quadripod off the dish face, at roughly the focal
      // length of a shallow reflector this size (~0.4 D = 3.6 m). Legs are drawn
      // from the rim in to the feed so the assembly is braced to the plate,
      // which is what a real feed support is.
      const FEED_Y = 3.4;
      for (let i = 0; i < 3; i += 1) {
        const a = i * (Math.PI * 2 / 3);
        const rimX = Math.cos(a) * (DISH_R - 0.5);
        const rimZ = Math.sin(a) * (DISH_R - 0.5);
        const leg = new THREE.Mesh(geometry.panel, dark);
        const span = Math.hypot(Math.hypot(rimX, rimZ), FEED_Y);
        leg.scale.set(0.16, span, 0.16);
        leg.position.set(rimX / 2, FEED_Y / 2, rimZ / 2);
        // Aim the leg along its own span: rotate about Z by the in-plane offset
        // and about Y to point it at the right rim station.
        leg.rotation.y = -a;
        leg.rotation.z = Math.atan2(Math.hypot(rimX, rimZ), FEED_Y);
        face.add(leg);
      }
      const feed = new THREE.Mesh(geometry.shipCylinder, steel);
      feed.scale.set(0.62, 1.0, 0.62);
      feed.position.set(0, FEED_Y, 0);
      face.add(feed);
      const feedCap = new THREE.Mesh(geometry.shipOctPlate, light);
      feedCap.scale.set(0.8, 0.28, 0.8);
      feedCap.position.set(0, FEED_Y - 0.6, 0);
      face.add(feedCap);

      addRoot(dishPivot);

      // `dish` is the one field read off this return: the pivot above, already
      // parented via addRoot, which updateGroundUnit spins at the spec's
      // dishSpin.
      return { dish: dishPivot };
    }
  });
}
