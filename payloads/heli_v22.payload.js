// V-22 class tiltrotor transport, HOVER configuration (kind "v22").
//
// Registration only: one HELI_TYPES entry and one addHeliModel airframe. No
// mission places it, no missile profile is registered, nothing existing is
// touched. The spec inherits transportHeli (or the Hind if that key is absent)
// so every required field is present, and the flight numbers are placeholders
// flagged BALANCE TODO - the deliverable here is the geometry.
//
// What has to read from every angle, in order of how badly its absence would
// break the identification:
//   1. Two BIG nacelles standing UPRIGHT on the wingtips. In hover the whole
//      engine pod is rotated nose-up, so the pods are vertical columns, not
//      the horizontal cigars of an aeroplane. This is the aircraft.
//   2. Two large three-blade proprotors above those pods, discs FACING UP.
//   3. A fat, square transport fuselage with a rear ramp.
//   4. A high wing carrying the pods, and twin vertical fins on the tailplane.
// Sea-service grey throughout - `light` is the pale hull paint the ships use,
// so the airframe reads western/grey rather than the Hind's olive.
//
// Real-scale reference the numbers are built from:
//   length 17.5 m  -> fuselage z spans -8.6 .. +8.9
//   nacelle centres +/- 7.0 m, proprotor radius 5.8 m -> tip span 25.6 m
//   proprotor diameter 11.6 m, three blades
export default function register(ctx) {
  const { HELI_TYPES } = ctx.tables;

  // transportHeli is the closest existing class: a big, slow, lightly armed
  // hull rather than a gunship. Falling back to hind only guarantees the
  // required-field set is complete if that key was never registered.
  const base = HELI_TYPES.transportHeli || HELI_TYPES.hind;
  if (!base) throw new Error("[heli_v22] expected an existing transport/hind template");

  ctx.addHeliType("v22", {
    ...base,
    key: "v22",
    heli: true,
    label: "V-22 OSPREY",
    role: "Tiltrotor Transport",

    // ---- BALANCE TODO -------------------------------------------------
    // Everything from here to the end of this block is a PLACEHOLDER sized
    // by eye off transportHeli, not a tuned entry. A tiltrotor's whole
    // selling point is that it cruises like a turboprop, so the honest
    // numbers would put cruise/dash well above every rotorcraft here and
    // change what the player has to do to catch it - that is a balance
    // decision, not a modelling one, and it is deliberately NOT made here.
    // Revisit against docs/ref_unit_stats_20260728.md before fielding it.
    hp: 210,
    hitRadius: 17,
    hitBox: { x: 13, y: 11, z: 20 },
    cruiseSpeed: 44,           // BALANCE TODO: should plausibly be ~2x this
    dashSpeed: 64,             // BALANCE TODO
    accel: 19,                 // BALANCE TODO
    turnRate: HELI_TYPES.hind.turnRate * 0.58,  // BALANCE TODO: heavy, slow yaw
    climbRate: 19,             // BALANCE TODO
    standoff: 840,             // BALANCE TODO
    orbitRate: 0.09,           // BALANCE TODO
    // NOT a placeholder: hoverBand and clearance are the fields that keep the
    // hull out of the terrain. Sized off the 25.5 m span and the tall pods.
    hoverBand: [72, 138],
    clearance: 36,
    attackRange: 700,          // BALANCE TODO
    aimThreshold: 0.68,        // BALANCE TODO
    // Proprotors turn far slower than a helicopter's main disc in reality;
    // kept well clear of zero so the model never reads as static.
    rotorSpin: 17,             // BALANCE TODO
    // Ramp gun only, aft of the hub - a transport, not an attack aircraft.
    aaMounts: [-6.5],
    aaHeight: 0,
    aa: {                      // BALANCE TODO (whole block)
      range: 600,
      cooldownMin: 1.5,
      cooldownSpread: 1.1,
      damage: 5,
      maxHitChance: 0.07,
      tracers: 2
    },
    smokeHeight: 3.4,
    explosionScale: 1.3,
    radarColor: "#ffa878",
    tracerColor: 0xffc48c,
    explosionColor: 0xffa86a
  });

  ctx.addHeliModel("v22", {
    build(env) {
      const { THREE, geometry, makeAircraftMaterial,
              dark, glass, rotorSkin, extraMaterials, add, addRoot } = env;

      // Sea-service grey, and it has to be MADE here: the five themed
      // materials are the Hind's Russian palette, and the nearest of them
      // (`light`, 0x8b9483) is a sage green that paints this airframe olive -
      // exactly the faction read the brief rules out. So `hull` is the pale
      // grey the fuselage wears and `grey` is a darker shade for the wing,
      // nacelles and sponsons, which is what separates the high wing from the
      // fuselage under the preview's flat top-down light instead of letting
      // the two merge into one blob.
      // Both are made in build(), so both MUST go into extraMaterials or they
      // leak every time a model is disposed.
      const hull = makeAircraftMaterial(0x9aa1a6, 0.26, 0.7);
      const grey = makeAircraftMaterial(0x6f767c, 0.3, 0.66);
      extraMaterials.push(hull, grey);

      // ---------------------------------------------------------------
      // Fuselage: a deep, near-rectangular box. A tiltrotor is a cargo
      // aircraft first - constant section over most of its length, which is
      // what makes it read as a transport next to the Hind's tapered gunship
      // body. 3.6 wide x 3.5 tall x 13.6 long as the main barrel.
      // ---------------------------------------------------------------
      // Length budget: the airframe has to measure 17.5 m nose to tail, and
      // the first cut of this model came out 21.7 m because the nose cone and
      // the fins were each allowed to run past where they should stop. The
      // structure is now laid out against a fixed budget - nose tip at
      // z = -8.6, fin trailing edge at z = +8.9 - and every part below is
      // placed to sit inside it. A transport is SHORT and FAT; letting the
      // fuselage stretch is what made it read as a gunship from above.
      add(geometry.panel, hull, 0, 0, 0.1, 3.7, 3.5, 11.0);
      // Chine strakes: the real fuselage cross-section is squarer at the top
      // than the bottom. Two slim boxes tuck the lower corners in.
      for (const side of [-1, 1]) {
        add(geometry.panel, hull, side * 1.8, -1.35, 0.1, 0.9, 1.2, 10.8, 0, 0, side * -0.55);
      }
      // Nose: SHORT, blunt and drooping - a flight deck with a radome on the
      // front, not a point. shipBow is a 4-sided cone of RADIUS 1 and HEIGHT 1,
      // so scale x/z are radii and y is the length; -PI/2 about x lays it down
      // pointing -Z. Height 1.1 (was 1.6) is most of the length that came off.
      add(geometry.panel, hull, 0, -0.15, -6.0, 3.45, 3.1, 1.6);
      add(geometry.shipBow, hull, 0, -0.4, -7.85, 1.85, 1.05, 1.85, -Math.PI / 2);
      // Flight deck glass: a wide wrapped windscreen sitting high and forward.
      add(geometry.panel, glass, 0, 0.8, -5.5, 3.2, 1.3, 2.2, -0.17);
      add(geometry.panel, glass, 0, 0.4, -6.85, 2.7, 1.15, 1.0, -0.5);
      // Refuelling probe on the starboard nose - a small spike, and kept short
      // so a 2 m rod is not what sets the aircraft's overall length.
      add(geometry.shipCylinder, dark, 1.3, -0.6, -8.0, 0.12, 1.1, 0.12, Math.PI / 2);

      // ---------------------------------------------------------------
      // Rear ramp. The aft end steps UP and closes with a sloped plate: the
      // whole back of the aircraft is a door, and the upsweep under it is the
      // shape a loading ramp makes. Without this the fuselage is just a box.
      // ---------------------------------------------------------------
      add(geometry.panel, hull, 0, 0.45, 6.4, 3.6, 3.1, 2.6, -0.13);
      // The ramp itself: a broad plate hinged at the cabin floor and angled
      // down and aft. Painted `grey` against the hull so the door reads as a
      // door from the side and from the rear 3/4 rather than as more skin.
      add(geometry.panel, grey, 0, -0.6, 7.15, 3.3, 0.4, 2.8, 0.44);
      // Upswept aft deck over the ramp - the shape the top of a cargo bay
      // makes when the floor drops away under it.
      add(geometry.panel, hull, 0, 1.25, 7.6, 3.0, 1.7, 1.9, -0.36);
      // Rear-ramp gun position (aaMounts -6.5 is behind the hub).
      add(geometry.shipCylinder, dark, 0, -0.7, 8.2, 0.18, 1.3, 0.18, Math.PI / 2);

      // ---------------------------------------------------------------
      // Sponsons: the fat blisters low on each side that carry the fuel and
      // the main gear. They are also what stops the fuselage from reading as
      // a plain crate from the side.
      // ---------------------------------------------------------------
      for (const side of [-1, 1]) {
        add(geometry.panel, grey, side * 2.1, -1.25, 1.9, 1.5, 1.6, 5.6);
        add(geometry.shipBow, grey, side * 2.1, -1.25, -1.35, 0.9, 1.2, 0.9, -Math.PI / 2);
        add(geometry.shipBow, grey, side * 2.1, -1.25, 5.05, 0.9, 1.2, 0.9, Math.PI / 2);
      }

      // ---------------------------------------------------------------
      // HIGH WING. Mounted on top of the fuselage, spanning 14.0 m tip to
      // tip (+/-7.0 nacelle centres) with the whole aircraft's weight coming
      // through it. Slight forward sweep, thick section - it has to look like
      // a structural beam carrying two engines, not like a fighter's wing.
      // ---------------------------------------------------------------
      // Chord 3.9 over a 14.0 span: deliberately stubby. This wing carries two
      // engines and a whole aircraft's download in hover, and a thin high-aspect
      // strip would read as a glider's. Thickness 0.72 for the same reason.
      add(geometry.panel, grey, 0, 2.4, 0.9, 14.0, 0.72, 4.3);
      // Leading and trailing edge tapers, so the section is not a flat slab.
      add(geometry.panel, grey, 0, 2.34, -0.95, 13.5, 0.46, 1.1, 0.13);
      add(geometry.panel, grey, 0, 2.34, 2.75, 13.5, 0.42, 1.2, -0.15);
      // Wing/fuselage fairing - the big spine hump the wing pivots on.
      add(geometry.panel, hull, 0, 1.95, 0.8, 3.3, 1.6, 5.0);
      add(geometry.shipBow, hull, 0, 1.95, -1.9, 1.6, 1.7, 1.6, -Math.PI / 2);

      // ---------------------------------------------------------------
      // Twin tail. Two vertical fins on the ends of a wide tailplane - the
      // second identification cue after the pods, and the reason the rear 3/4
      // view is not ambiguous with any single-fin helicopter here.
      // ---------------------------------------------------------------
      // Placement here is driven by the TOP view, where the first two cuts of
      // this model had NO tail at all: sitting it at y=1.85 put it under the
      // wing and inside the fuselage box, so from directly overhead the
      // aircraft ended at the ramp. The tailplane is now carried on a short
      // boom ABOVE the aft deck and behind the ramp, which is also where the
      // real one is - the fins have to clear the rotor downwash.
      add(geometry.panel, hull, 0, 1.5, 7.5, 2.2, 1.1, 2.6, -0.06);   // boom out of the aft deck
      add(geometry.panel, grey, 0, 2.55, 8.35, 8.6, 0.5, 2.6);        // tailplane, clear of the body
      for (const side of [-1, 1]) {
        // Fin: tall, swept back, canted slightly outboard at the top. The
        // trailing edge lands at z = +9.4, the aft end of the length budget -
        // the first cut let these run to +11.5 and that single overrun was
        // most of the 4 m the airframe was too long by.
        add(geometry.panel, grey, side * 4.05, 4.35, 8.2, 0.42, 3.3, 2.5, 0, 0, side * -0.11);
        add(geometry.panel, grey, side * 4.34, 5.9, 8.55, 0.4, 1.5, 1.8, 0.28, 0, side * -0.11);
        // Rudder strip, one shade darker so each fin has a hard trailing edge
        // in the top-down view instead of dissolving into the tailplane.
        add(geometry.panel, dark, side * 4.05, 4.4, 9.15, 0.46, 3.0, 0.44, 0, 0, side * -0.11);
      }

      // ---------------------------------------------------------------
      // NACELLES + PROPROTORS - the whole point of the airframe.
      //
      // In hover the engine pod is rotated 90 deg nose-up, so each pod is a
      // VERTICAL column standing on the wingtip with the spinner on TOP and
      // the exhaust pointing DOWN and aft. Everything below is built upright
      // for that reason; a horizontal pod would be the cruise configuration
      // and would lose the aircraft entirely.
      //
      // The rotor pivot is a Group whose local Y is the spin axis (updateHeli
      // turns each entry about its own local Y), and in hover that axis is
      // already vertical - so unlike a tail rotor this pivot takes NO roll.
      // It is given a small outboard/aft cant instead, matching the real
      // aircraft's slightly tilted discs, which also proves in the preview
      // that the pivot is a real 3D frame and not an accident of alignment.
      // ---------------------------------------------------------------
      const rotors = [];
      const NAC_X = 7.0;          // nacelle centreline half-span
      const ROTOR_R = 5.8;        // proprotor radius -> 25.6 m over the tips
      const HUB_Y = 7.15;         // hub height: on top of the pod, not inside it

      for (const side of [-1, 1]) {
        const x = side * NAC_X;

        // Wingtip stub the pod pivots on.
        add(geometry.panel, grey, side * 6.3, 2.4, 0.9, 2.0, 1.25, 3.7);

        // Pod body: a standing cylinder, and the single most important shape
        // on the aircraft. Radius 1.5 over a 5.0 m column - it has to look
        // like an engine big enough to lift the thing, because a slim post
        // reads as a wingtip tank and the aircraft stops being a tiltrotor.
        add(geometry.shipCylinder, grey, x, 3.95, 0.9, 1.5, 5.0, 1.5);
        // Squared-off outboard cheek: the real pod is not a plain tube, and a
        // flat face catches the key light so the column has a lit and a shadow
        // side instead of one continuous gradient.
        add(geometry.panel, grey, side * (NAC_X + 0.95), 3.9, 0.9, 0.75, 4.4, 2.7);
        // Upper cowl taper into the gearbox, and the spinner cap above it.
        add(geometry.shipCylinder, grey, x, 6.55, 0.9, 1.26, 1.3, 1.26);
        add(geometry.shipBow, hull, x, 7.35, 0.9, 1.02, 1.0, 1.02);
        // Intake lip, dark, just under the gearbox so the top of the pod
        // reads as machinery rather than as a plain post.
        add(geometry.shipCylinder, dark, x, 5.75, 0.9, 1.56, 0.5, 1.56);
        // Exhaust: down and aft out of the bottom of the pod - the direction
        // that only makes sense if the engine has been rotated to hover, and
        // therefore one of the few parts that would be WRONG on a cruise-mode
        // model. Two stages so the efflux reads as a duct, not a peg.
        // Tucked close under the pod and steeply raked (0.62 rad): at the
        // shallower angle this first had, the duct stood off the nacelle in
        // side view and read as battle damage hanging off the wing rather
        // than as part of the engine.
        add(geometry.shipCylinder, grey, x, 1.75, 1.75, 0.86, 1.7, 0.86, 0.62);
        add(geometry.shipCylinder, dark, x, 1.0, 2.35, 0.66, 0.7, 0.66, 0.62);

        // ---- the disc ------------------------------------------------
        const pivot = new THREE.Group();
        pivot.position.set(x, HUB_Y, 0.9);
        // Discs tilted a few degrees outboard and nose-down, as they sit in a
        // real hover. Local Y stays close to vertical = the disc still faces
        // UP, which is the requirement.
        pivot.rotation.z = side * -0.06;
        pivot.rotation.x = -0.05;

        // Translucent plate first: a proprotor at power is something you see
        // THROUGH. An opaque 11.6 m plate at gun range is exactly the failure
        // rotorSkin exists to prevent.
        const disc = new THREE.Mesh(geometry.shipOctPlate, rotorSkin);
        disc.scale.set(ROTOR_R, 0.06, ROTOR_R);
        pivot.add(disc);

        // THREE blades, 120 deg apart - the count is part of the aircraft's
        // identity and is countable in the top-down view.
        for (let i = 0; i < 3; i++) {
          const blade = new THREE.Mesh(geometry.panel, dark);
          // Chord 1.05, not the 0.62 this started at: at 11.6 m across, a
          // narrow blade is a hairline in the top-down view and the count -
          // which is part of the identification - cannot be read. A proprotor
          // blade is genuinely broad, so widening it is both more accurate and
          // more legible.
          // Offset OUT from the hub so each slab spans hub->tip; centring it
          // would draw three blades through the middle and read as six.
          blade.scale.set(ROTOR_R * 0.97, 0.15, 1.05);
          blade.position.set(ROTOR_R * 0.5, 0.02, 0);
          const arm = new THREE.Group();
          arm.rotation.y = (i * Math.PI * 2) / 3;
          arm.add(blade);
          pivot.add(arm);
        }
        // Hub cap on top of the blades so the centre is solid.
        const hub = new THREE.Mesh(geometry.shipCylinder, dark);
        hub.scale.set(0.62, 0.7, 0.62);
        pivot.add(hub);

        addRoot(pivot);
        rotors.push(pivot);
      }

      // Two proprotors, no anti-torque rotor - a tiltrotor does not have one,
      // and the preview's ROTORS 2 is the check that both pivots came back.
      return { rotors };
    }
  });
}
