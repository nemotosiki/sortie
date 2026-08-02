// Armed transport helicopter (Mi-8/Mi-17 gunship fit) - one airframe, one file.
//
// The gap this fills: every rotorcraft in the game is currently drawn by the
// inline Hind, which is a narrow tandem-cockpit gunship on stub wings. A
// transport is the opposite silhouette in every dimension that matters - a fat
// round cabin bus with a row of windows down the side, a big sliding door, a
// glasshouse nose and clamshell freight doors at the back. Fitting rocket pods
// to the outrigger pylons is what makes it an ARMED transport without turning
// it into a third attack-helicopter shape.
//
// Scale: 18 m fuselage nose-to-tail-rotor, 21 m main disc (radius 10.5), which
// is Mi-8 true scale and roughly 1.5x the Hind's footprint - a transport should
// read as the biggest helicopter on the board.
//
// Nose is -Z, up is +Y, metres. Registration + geometry only: no mission places
// this kind, no renderer or scaling code is touched.
export default function register(ctx) {
  const { HELI_TYPES } = ctx.tables;

  const transport = HELI_TYPES.transportHeli || HELI_TYPES.hind;
  if (!transport) throw new Error("[heli_armedTransport] expected an existing helicopter template");

  // ---------------------------------------------------------------------------
  // Type
  // ---------------------------------------------------------------------------
  // BALANCE TODO: every number below is inherited from transportHeli and then
  // nudged only where the airframe's SIZE demands it (hull volume -> hp/hitBox,
  // 21 m disc -> clearance). The combat figures - attackRange, aa.*, standoff,
  // orbitRate, rotorSpin - are PLACEHOLDERS carried over from the transport and
  // have NOT been tuned against the existing range layers (420/650/720/820/900).
  // Nothing in the game spawns this kind yet, so nothing depends on them being
  // right; tune before putting it in a mission.
  ctx.addHeliType("armedTransport", {
    ...transport,
    key: "armedTransport",
    label: "MI-8 ARMED TRANSPORT",
    role: "Armed Transport Helicopter",
    // Hull: the largest helicopter here, so the most hull. BALANCE TODO.
    hp: 210,
    hitRadius: 17,
    // Measured off the airframe below, not guessed: 8.4 m across the outrigger
    // pods (NOT the 21 m rotor - a disc is not a hull), 8 m from the gear to
    // the mast, 20 m from the nose cone to the tail rotor.
    hitBox: { x: 9, y: 8, z: 20 },
    // BALANCE TODO: a laden Mi-8 cruises ~225 km/h. Slow, but not as slow as the
    // unarmed transport, because this one is supposed to be worth chasing.
    cruiseSpeed: 40,
    dashSpeed: 58,
    accel: 18,
    turnRate: HELI_TYPES.hind.turnRate * 0.6,
    climbRate: 16,
    standoff: 800,
    orbitRate: 0.09,
    hoverBand: [68, 130],
    // 21 m disc: the hard floor has to clear a rotor half-span plus the gear.
    clearance: 36,
    // BALANCE TODO: door gun + rocket pods. Untuned.
    attackRange: 820,
    aimThreshold: 0.64,
    // Slower and bigger than the Hind's disc, which is what a 21 m rotor looks
    // like. Never zero.
    rotorSpin: 18,
    // Nose gun forward of the hub, plus the door gun back at the cabin door.
    aaMounts: [8, -3.5],
    aaHeight: 0,
    aa: {
      range: 700,
      cooldownMin: 1.3,
      cooldownSpread: 1.0,
      damage: 5,
      maxHitChance: 0.08,
      tracers: 2
    },
    smokeHeight: 3.4,
    explosionScale: 1.3,
    radarColor: "#ffa268",
    tracerColor: 0xffbe86,
    explosionColor: 0xffa860
  });

  // ---------------------------------------------------------------------------
  // Airframe
  // ---------------------------------------------------------------------------
  ctx.addHeliModel("armedTransport", {
    build(env) {
      const {
        THREE, geometry, makeAircraftMaterial,
        olive, dark, glass, light, rotorSkin, markings,
        extraMaterials, add, addRoot
      } = env;

      // Aeroflot-era two-tone: the fuselage sits in the shared `olive` (which
      // takes the hit flash), and the upper decking gets a lighter grey-green so
      // the round cross-section reads as round instead of as one flat slab. Both
      // spare materials go into extraMaterials or they leak on dispose.
      const deckGreen = makeAircraftMaterial(0x6a7550, 0.2, 0.74);
      const doorTrim = makeAircraftMaterial(0x3c4530, 0.24, 0.7);
      extraMaterials.push(deckGreen, doorTrim);

      // ---- Fuselage ---------------------------------------------------------
      // A FAT ROUND BUS. shipCylinder is a 10-sided barrel about its own +Y, so
      // rx = PI/2 lays it down the aircraft's Z: radius 1.85 m (3.7 m across)
      // over 11 m of parallel cabin. That is a touch wider than a real Mi-8's
      // 3.2 m shell on purpose - roundness and BULK are this airframe's whole
      // identity against the narrow Hind, and at the ranges the player sees it
      // a scale-exact tube reads as a stick. The v1 pass at r=1.55 did exactly
      // that in the TOP view.
      add(geometry.shipCylinder, olive, 0, 0.4, -0.6, 1.85, 11, 1.85, Math.PI / 2);
      // Belly fairing under the cabin - flattens the bottom of the barrel so it
      // does not look like a floating pipe, and carries the fuel panniers below.
      add(geometry.panel, olive, 0, -1.0, -0.6, 3.0, 1.5, 10.5);
      // Upper decking: the flat top the engines and gearbox sit on, in the
      // lighter tone.
      add(geometry.panel, deckGreen, 0, 1.72, -0.4, 2.9, 0.9, 8.6);

      // ---- Nose: the wide glasshouse ---------------------------------------
      // Mi-8's face is a bulbous, deeply glazed nose that drops below the cabin
      // line, with the navigator's bay glazed right round the tip. Round nose
      // cap first (shipBow is a 4-sided cone of RADIUS 1, so it is scaled as a
      // radius and rolled 45deg about Z to put a flat facet on top rather than
      // a ridge - a transport nose is blunt, not knife-edged).
      add(geometry.shipCylinder, olive, 0, 0.15, -6.1, 1.78, 1.6, 1.7, Math.PI / 2);
      add(geometry.shipBow, olive, 0, 0.05, -7.6, 1.8, 1.7, 1.8, -Math.PI / 2, 0, Math.PI / 4);
      // The glass, and it has to be BIG. v1 sized these to the real aircraft's
      // panes and they vanished into the fuselage at preview distance; the
      // whole point of this nose is that it is a wraparound glasshouse, so the
      // windscreen now spans the full 3.4 m of cabin width and stands proud of
      // the skin (the +/-x panes wrap it round the corners).
      add(geometry.panel, glass, 0, 0.85, -6.5, 2.95, 1.55, 1.7, -0.3);
      add(geometry.panel, glass, 0, 0.05, -7.4, 2.35, 1.35, 0.9, -0.6);
      // Wrapped side panes at the corners of the glasshouse - these are what
      // stop the windscreen reading as one flat plate bolted to the front,
      // which is exactly what the v2 pass did in the TOP view.
      for (const side of [-1, 1]) {
        add(geometry.panel, glass, side * 1.45, 0.65, -6.2, 0.55, 1.3, 2.1, 0, side * 0.22, 0);
      }
      // Chin bubble - the glazed panel under the nose that is the give-away of
      // this family from any forward angle.
      add(geometry.panel, glass, 0, -0.9, -6.7, 2.1, 0.9, 2.0, 0.42);
      // Windscreen framing, in the LIGHT tone rather than dark: against a dark
      // olive fuselage a dark frame disappears, and it is the frame that makes
      // the glass read as windows instead of as a wet patch. Thin bands only -
      // a wide one becomes the shape instead of outlining it.
      add(geometry.panel, light, 0, 0.85, -6.55, 0.13, 1.65, 1.8, -0.3);
      add(geometry.panel, light, 0, 1.5, -5.75, 3.0, 0.16, 0.45, -0.3);
      add(geometry.panel, light, 0, 0.25, -7.28, 2.7, 0.15, 0.38, -0.3);

      // ---- Side doors + round window row ------------------------------------
      // THE signature. Every Mi-8 has a big sliding door on the port side at the
      // cabin front and a line of small round portholes down both flanks.
      for (const side of [-1, 1]) {
        // Sliding door. v1 built this to scale (1.4 x 1.7 m) and it was
        // indistinguishable from the porthole row two metres aft of it. A
        // transport's door is the one opening a soldier walks through, so it
        // gets 2.4 m of cabin length, floor-to-roof height, and a LIGHT frame -
        // the frame is what carries it, because a dark recess in a dark olive
        // flank is not a door, it is a smudge.
        add(geometry.panel, light, side * 1.83, 0.15, -2.7, 0.16, 2.5, 2.7);
        add(geometry.panel, doorTrim, side * 1.9, 0.15, -2.7, 0.14, 2.15, 2.35);
        // Door rail above and the sill below - what makes it read as SLIDING
        // rather than as a hatch.
        add(geometry.panel, light, side * 1.88, 1.45, -2.35, 0.2, 0.2, 3.6);
        add(geometry.panel, dark, side * 1.88, -1.08, -2.7, 0.2, 0.18, 2.8);
        // Door window - the one square pane in a row of round ones.
        add(geometry.panel, glass, side * 1.95, 0.62, -2.7, 0.1, 0.85, 1.15);

        // Porthole row: five round windows aft of the door, evenly spaced down
        // the cabin. shipOctPlate rolled 90deg about Z is a disc facing
        // outboard. Ring in `light` and pane in `glass`, stacked so the bright
        // ring outlines a dark pane - that contrast is the only thing that
        // makes a 0.8 m window visible on a 20 m aircraft.
        for (let i = 0; i < 5; i += 1) {
          // Stops at z=4.6, forward of the clamshell bulkhead at 5.05: in v2
          // the last window of the row was buried in the freight door frame.
          const wz = -1.2 + i * 1.45;
          add(geometry.shipOctPlate, light, side * 1.83, 0.55, wz, 0.52, 0.16, 0.52, 0, 0, Math.PI / 2);
          add(geometry.shipOctPlate, glass, side * 1.9, 0.55, wz, 0.38, 0.12, 0.38, 0, 0, Math.PI / 2);
        }
        // One more porthole FORWARD of the door, at the flight-deck side window.
        add(geometry.shipOctPlate, light, side * 1.8, 0.72, -4.5, 0.48, 0.16, 0.48, 0, 0, Math.PI / 2);
        add(geometry.shipOctPlate, glass, side * 1.87, 0.72, -4.5, 0.35, 0.12, 0.35, 0, 0, Math.PI / 2);
      }

      // ---- Outrigger pylons + rocket pods -----------------------------------
      // Not the Hind's big lifting stub wings: a Mi-8's armament rides on short
      // truss outriggers bolted to the cabin sides, so the pods hang close in
      // and level rather than out on an anhedral wing.
      for (const side of [-1, 1]) {
        // Two truss arms fore and aft, reaching well clear of the 3.7 m cabin
        // so the pods stand OFF the fuselage. At v1's x=2.95 they were tucked
        // against the flank and read as belly tanks.
        add(geometry.panel, dark, side * 2.7, -0.2, -1.1, 2.4, 0.34, 1.2, 0, 0, side * 0.18);
        add(geometry.panel, dark, side * 2.7, -0.2, 1.7, 2.4, 0.34, 1.2, 0, 0, side * 0.18);
        // Pylon post down to the pod rail.
        add(geometry.panel, dark, side * 3.7, -0.85, 0.3, 0.34, 1.3, 3.6);
        // Rocket pods, two per side, stacked - a UB-32 is a 0.9 m fat tube of
        // 32 tubes and they are always carried in pairs on this airframe.
        for (const dy of [0.15, -0.95]) {
          add(geometry.shipCylinder, dark, side * 3.7, -0.6 + dy, 0.3, 0.48, 3.2, 0.48, Math.PI / 2);
          // Muzzle face, in the lighter tone so the mouth of the tube catches
          // light and the pod reads as a ROCKET POD and not as a fuel tank.
          add(geometry.shipOctPlate, light, side * 3.7, -0.6 + dy, -1.42, 0.5, 0.16, 0.5, Math.PI / 2);
          add(geometry.shipOctPlate, dark, side * 3.7, -0.6 + dy, -1.52, 0.34, 0.12, 0.34, Math.PI / 2);
        }
      }

      // ---- Engine deck, intakes and mast ------------------------------------
      // Two TV3-117 nacelles side by side on top of the cabin, ahead of the
      // gearbox, with round intakes facing forward and the dust filters bulging
      // over them. This hump is what gives the transport its top-heavy profile.
      add(geometry.panel, deckGreen, 0, 2.4, -1.6, 2.8, 1.15, 4.6);
      for (const side of [-1, 1]) {
        add(geometry.shipCylinder, dark, side * 0.92, 2.6, -2.0, 0.66, 3.8, 0.66, Math.PI / 2);
        // Intake lip / dust filter at the front of each nacelle.
        add(geometry.shipCylinder, light, side * 0.92, 2.65, -4.0, 0.74, 0.5, 0.74, Math.PI / 2);
        add(geometry.shipOctPlate, dark, side * 0.92, 2.65, -4.28, 0.54, 0.16, 0.54, Math.PI / 2);
        // Exhaust stub, canted outward, aft.
        add(geometry.shipCylinder, dark, side * 1.05, 2.55, 0.5, 0.42, 1.5, 0.42, Math.PI / 2, 0, side * 0.2);
      }
      // Main gearbox fairing and the mast the disc turns on.
      add(geometry.panel, deckGreen, 0, 3.15, 0.35, 2.1, 1.0, 2.6);
      add(geometry.shipCylinder, dark, 0, 3.85, 0.4, 0.5, 1.5, 0.5);

      // ---- Tail boom, clamshell doors, fin -----------------------------------
      // Rear clamshell freight doors: the cabin does not taper to the boom, it
      // ENDS in a pair of hinged doors and the boom starts above them. Two
      // angled leaves, split down the centreline, so the back of the aircraft
      // reads as an opening and not as a cone.
      // Bulkhead frame the leaves close against, standing PROUD of the cabin so
      // there is a hard step where the fuselage stops. In v1 the aft end faded
      // into the boom and the rear three-quarter read as one green slab.
      // The aperture frame, drawn as four thin bands around the opening rather
      // than as one filled slab. v2 used a 3.9 x 3.3 m plate in `light` and it
      // read from the side as a white wall, which is the opposite of a door.
      add(geometry.panel, light, 0, 1.72, 5.15, 3.7, 0.26, 0.4);
      add(geometry.panel, light, 0, -1.25, 5.15, 3.7, 0.26, 0.4);
      for (const side of [-1, 1]) {
        add(geometry.panel, light, side * 1.72, 0.25, 5.15, 0.26, 3.2, 0.4);
        // Each leaf: a flat panel toed OUT at its outer edge, which is how a
        // closed pair of clamshells sits - a shallow tent, apex on the
        // centreline. Painted in doorTrim, two full stops darker than the
        // olive flank, so the aft end is a pair of PANELS and not a wedge.
        add(geometry.panel, doorTrim, side * 0.88, 0.25, 5.6, 1.78, 3.05, 0.8, 0, side * -0.22, 0);
        // Hinge strap down the outer edge of each leaf.
        add(geometry.panel, dark, side * 1.74, 0.25, 5.5, 0.2, 3.0, 0.66);
        // Latch handle, so the leaf has something on its face.
        add(geometry.panel, light, side * 0.55, 0.1, 6.0, 0.55, 0.24, 0.3, 0, side * -0.22, 0);
      }
      // Centreline split between the two leaves, in the bright tone: this one
      // line is what says "these are DOORS" from directly astern.
      add(geometry.panel, light, 0, 0.25, 5.85, 0.2, 3.1, 0.75);

      // Boom: distinctly thinner than the 3.7 m cabin and set HIGH above the
      // clamshell, which is exactly how this family gets a full-height freight
      // opening at the back. Two segments, tapering.
      add(geometry.shipCylinder, olive, 0, 1.45, 7.0, 0.72, 3.4, 0.72, Math.PI / 2);
      add(geometry.shipCylinder, olive, 0, 1.6, 9.5, 0.5, 2.6, 0.5, Math.PI / 2);
      // Fin, swept, carrying the tail rotor on its port face.
      add(geometry.panel, olive, 0, 2.6, 10.7, 0.34, 2.9, 1.9, 0.24);
      add(geometry.panel, olive, 0, 3.8, 11.2, 0.3, 1.2, 1.3, 0.34);
      // Low tailplane, the small one this family carries.
      add(geometry.panel, olive, 0, 1.6, 9.9, 3.3, 0.22, 1.1);
      // Tail skid under the boom.
      add(geometry.panel, dark, 0, 0.7, 10.5, 0.24, 1.1, 0.5, -0.3);

      // ---- Landing gear ------------------------------------------------------
      // Fixed tricycle, which a transport keeps down. Legs + wheels, so the
      // side and rear views have something under the belly.
      add(geometry.shipCylinder, dark, 0, -1.7, -5.4, 0.24, 1.4, 0.24);
      add(geometry.shipOctPlate, dark, 0, -2.35, -5.4, 0.42, 0.42, 0.42, 0, 0, Math.PI / 2);
      for (const side of [-1, 1]) {
        add(geometry.shipCylinder, dark, side * 1.7, -1.7, 1.1, 0.2, 1.6, 0.2, 0, 0, side * 0.3);
        add(geometry.panel, dark, side * 1.3, -1.5, 1.1, 1.6, 0.18, 0.22, 0, 0, side * 0.3);
        add(geometry.shipOctPlate, dark, side * 2.25, -2.4, 1.1, 0.52, 0.5, 0.52, 0, 0, Math.PI / 2);
        // Fuel pannier along the belly side, the long box a Mi-8 carries.
        add(geometry.panel, olive, side * 1.75, -1.15, -0.8, 0.6, 0.85, 5.4);
      }

      // ---- Door gun and nose gun --------------------------------------------
      // The "armed" part that is not a pod: a pintle gun in the port doorway
      // (aaMounts -3.5) and a fixed nose gun (aaMounts 8).
      add(geometry.shipCylinder, dark, -2.15, 0.35, -3.1, 0.09, 1.6, 0.09, Math.PI / 2, 0, 0.1);
      add(geometry.shipCylinder, dark, 0, -1.2, -7.6, 0.1, 1.6, 0.1, Math.PI / 2);

      // ---- Markings ----------------------------------------------------------
      // Red star on each side of the boom, and one on the upper decking.
      add(geometry.shipOctPlate, markings, -0.74, 1.45, 7.4, 0.62, 0.06, 0.62, 0, 0, Math.PI / 2);
      add(geometry.shipOctPlate, markings, 0.74, 1.45, 7.4, 0.62, 0.06, 0.62, 0, 0, Math.PI / 2);
      add(geometry.shipOctPlate, markings, 0, 2.2, 3.2, 0.75, 0.06, 0.75);

      // ---- Rotors ------------------------------------------------------------
      // Five blades on a 21 m disc. At RPM that is a translucent plate, so the
      // plate is the model and the blades are shadows across it - painting it
      // `dark` would park a 21 m opaque slab at gun range, which is exactly what
      // rotorSkin exists to avoid. A Group cannot go through add(); addRoot is
      // the only way to parent it, and it must be returned in `rotors` or the
      // disc is welded still.
      const rotors = [];
      const main = new THREE.Group();
      main.position.set(0, 4.5, 0.4);
      const disc = new THREE.Mesh(geometry.shipOctPlate, rotorSkin);
      disc.scale.set(10.5, 0.06, 10.5);
      main.add(disc);
      // Five blades at 36deg apart. Only three are drawn: a 5-blade head reads
      // by the SPACING of its shadows, and 21 m of full-length box per blade is
      // real geometry cost on a unit that spawns in flights.
      for (let i = 0; i < 3; i += 1) {
        const blade = new THREE.Mesh(geometry.panel, dark);
        blade.scale.set(21, 0.16, 0.62);
        blade.rotation.y = (i * Math.PI * 2) / 5;
        main.add(blade);
      }
      // Hub cap, so the centre of the disc is solid.
      const hub = new THREE.Mesh(geometry.shipOctPlate, dark);
      hub.scale.set(0.65, 0.4, 0.65);
      main.add(hub);
      addRoot(main);
      rotors.push(main);

      // Tail rotor on the PORT face of the fin. The pivot is rolled 90deg about
      // Z so its local Y - the only axis updateHeli spins - lies across the
      // aircraft.
      const tail = new THREE.Group();
      tail.position.set(-0.5, 3.05, 10.9);
      tail.rotation.z = Math.PI / 2;
      const tailDisc = new THREE.Mesh(geometry.shipOctPlate, rotorSkin);
      tailDisc.scale.set(1.95, 0.05, 1.95);
      tail.add(tailDisc);
      for (let i = 0; i < 2; i += 1) {
        const tb = new THREE.Mesh(geometry.panel, dark);
        tb.scale.set(3.9, 0.12, 0.34);
        tb.rotation.y = i * Math.PI * 0.5;
        tail.add(tb);
      }
      addRoot(tail);
      rotors.push(tail);

      return { rotors };
    }
  });
}
