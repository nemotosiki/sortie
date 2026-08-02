// Heavy lift helicopter (Mi-26 class). One new HELI_TYPES key plus the airframe
// that goes with it - nothing else. No mission places it: the type exists so a
// campaign author can, and so the model has a key to hang off.
//
// The whole point of this airframe is SIZE. Every other rotorcraft in the game
// is a Hind-sized gunship: ~19m long on a 17.4m disc. This one is ~40m long on
// a 32m disc, which is very nearly double in both, and the model is authored so
// that reads instantly at any of the four preview angles - a fuselage that is
// still going long after a Hind would have ended, and an eight-blade disc that
// covers three-quarters of it. If it does not look oversized next to heli:hind,
// it is wrong.
export default function register(ctx) {
  const { HELI_TYPES } = ctx.tables;

  // -------------------------------------------------------------------------
  // Type. Inherits the transport (unarmed, slow, high hover) rather than the
  // Hind, because a flying crane is a transport with the numbers pushed out,
  // not a gunship with the numbers pulled in.
  // -------------------------------------------------------------------------
  const base = HELI_TYPES.transportHeli || HELI_TYPES.hind;
  if (!base) throw new Error("[heli-heavyLift] expected an existing helicopter template");

  ctx.addHeliType("heavyLift", {
    ...base,
    key: "heavyLift",
    label: "HEAVY LIFTER",
    role: "Heavy Lift Helicopter",
    // BALANCE TODO: placeholder numbers, scaled off transportHeli by silhouette
    // size alone. Nothing flies this type yet (no mission places it), so none of
    // these have been tuned against a live engagement - hp, the hover band and
    // the hit box in particular want a pass once it appears in a wave.
    hp: 190,
    hitRadius: 22,
    hitBox: { x: 17, y: 15, z: 42 },
    // Slower than the transport in every axis: 56t of helicopter does not dash.
    cruiseSpeed: 28,
    dashSpeed: 40,
    accel: 11,
    turnRate: HELI_TYPES.hind.turnRate * 0.4,
    climbRate: 10,
    standoff: 950,
    orbitRate: 0.05,
    // Sits higher and keeps more air under it, because the disc is 16m of
    // radius and the clearance figure is measured to the hub.
    hoverBand: [80, 150],
    clearance: 40,
    // Unarmed, exactly as the transport is. The aa block is kept whole (the
    // shared AA path reads every field) with the range at zero so it never
    // fires, and aaMounts pushed forward of the much longer nose.
    attackRange: 0,
    aimThreshold: 1.2,
    aaMounts: [19],
    aaHeight: 0,
    aa: { range: 0, cooldownMin: 9999, cooldownSpread: 0, damage: 0, maxHitChance: 0, tracers: 1 },
    // Big disc, slow disc. Never zero.
    rotorSpin: 14,
    smokeHeight: 4.2,
    explosionScale: 1.6,
    radarColor: "#ffc46a",
    tracerColor: 0xffb04a,
    explosionColor: 0xffa348
  });

  // -------------------------------------------------------------------------
  // Airframe. Nose at -Z, up +Y, real metres.
  //
  // Layout, in the aircraft's own Z: flight deck -19..-13, cargo hold -13..+7,
  // clamshell doors and ramp +7..+13, tail boom +13..+21, fin and tail rotor at
  // +20. Main hub at z=-3, which sits the 32m disc over the hold and lets its
  // trailing edge reach past the clamshell - the overhang IS the scale cue.
  //
  // The fuselage is deliberately WIDE (7.4m across the hold) as well as long. A
  // long narrow box reads as a stretched gunship; a long wide box with a flat
  // floor and a square section reads as something with a cargo bay in it.
  // -------------------------------------------------------------------------
  ctx.addHeliModel("heavyLift", {
    build(env) {
      const { THREE, geometry, olive, dark, glass, light, rotorSkin, markings,
              add, addRoot } = env;

      // --- Fuselage: one very long, deep, SQUARE-SECTION box for the hold,
      // stepping down and narrowing into the flight deck.
      add(geometry.panel, olive, 0, 0.4, -3, 7.4, 6.6, 20);          // cargo hold
      add(geometry.panel, olive, 0, 1.0, -15.2, 6.0, 5.4, 6.4);      // flight deck box
      add(geometry.panel, olive, 0, 0.3, 9.0, 6.2, 5.6, 6.4);        // clamshell section
      // Blunt, rounded-off nose. shipBow is a 4-sided cone whose x/z scale is a
      // RADIUS, rolled 45deg about Z so a flat faces up instead of an edge -
      // this class has a fat freighter nose, not a gunship point.
      // shipBow rotated -PI/2 about X puts the apex at -Z and its HEIGHT scale
      // spans +/-half either side of the given z. At 2.6 tall centred on -19.6
      // its base sat at -18.3 and swallowed the windscreen behind it, so it is
      // shortened and pushed forward until the base is clear of the glazing.
      add(geometry.shipBow, olive, 0, 0.2, -20.4, 3.4, 1.9, 3.2, -Math.PI / 2, 0, Math.PI / 4);
      // Under-nose fairing between the cone and the deck box, so the join is a
      // taper rather than a step.
      add(geometry.panel, olive, 0, -0.4, -19.0, 5.2, 3.0, 2.6, 0.12);
      // Chine strakes down each side of the hold: they run the whole 40m and
      // are the line that tells the eye how long this thing is.
      for (const side of [-1, 1]) {
        add(geometry.panel, dark, side * 3.75, -2.1, -2, 0.4, 0.9, 26);
        add(geometry.panel, dark, side * 3.75, 2.8, -4, 0.34, 0.55, 21);
      }
      // Belly pan, flat and wide - the flat bottom is what a cargo hold looks
      // like from below and it separates this from every gunship in the game.
      add(geometry.panel, dark, 0, -2.9, -3, 7.0, 0.9, 25);

      // --- Flight deck glazing: a stepped, wide, forward-raked windscreen with
      // a second row of panes under it. Crew sit side by side and high, above
      // the hold floor, so the glass wraps the whole front of the deck box.
      add(geometry.panel, glass, 0, 2.9, -17.6, 5.0, 2.5, 2.4, -0.34);   // windscreen
      add(geometry.panel, glass, 0, 0.9, -18.7, 4.4, 2.0, 1.6, 0.30);    // lower panes
      add(geometry.panel, glass, 0, 2.2, -15.4, 5.9, 2.0, 3.0);          // deck side glass
      // Cabin roof cap over the glass, so the deck reads as a box with windows
      // rather than as a dark hole in the nose.
      add(geometry.panel, olive, 0, 4.0, -15.8, 6.0, 0.7, 6.2, -0.03);
      // Downward-view blisters either side of the nose (the crane crew watch
      // the slung load through them).
      for (const side of [-1, 1]) {
        add(geometry.shipOctPlate, glass, side * 3.05, 0.7, -16.2, 1.1, 1.3, 1.1, 0, 0, Math.PI / 2);
      }
      // Wipers/frame bar across the windscreen: a light line that stops the
      // glazing reading as one black slab from the front quarter.
      add(geometry.panel, light, 0, 1.9, -18.5, 5.0, 0.22, 0.3, -0.34);

      // --- Small round window rows. Nine per side down the hold, plus one pair
      // on the flight-deck box: the repeated small circles are what sells the
      // fuselage as LONG rather than merely big.
      for (const side of [-1, 1]) {
        for (let i = 0; i < 9; i++) {
          const z = -11.6 + i * 2.6;
          add(geometry.shipOctPlate, glass, side * 3.72, 1.6, z, 0.66, 0.18, 0.66, 0, 0, Math.PI / 2);
        }
        add(geometry.shipOctPlate, glass, side * 3.02, 1.4, -14.2, 0.58, 0.18, 0.58, 0, 0, Math.PI / 2);
      }

      // --- Engine deck: two big turboshafts side by side ON TOP of the cabin,
      // ahead of the mast, with the intake mouths facing forward. On a Mi-26
      // this deck is the bulge that carries the rotor head.
      add(geometry.panel, olive, 0, 4.9, -7.0, 6.0, 2.8, 9.6);
      for (const side of [-1, 1]) {
        // Nacelles sit ON the deck and stop at its front face: pushed any
        // further forward they float clear of the airframe over the flight deck
        // instead of reading as engines bolted to a roof.
        add(geometry.shipCylinder, dark, side * 1.9, 5.9, -7.2, 1.35, 7.2, 1.35, Math.PI / 2);
        // Intake mouth, at the front of the nacelle.
        add(geometry.shipCylinder, light, side * 1.9, 5.9, -11.2, 1.45, 1.2, 1.45, Math.PI / 2);
        // Exhaust, aft of the nacelle.
        add(geometry.shipCylinder, dark, side * 2.3, 5.7, -3.2, 0.9, 1.8, 0.9, Math.PI / 2);
      }
      // Gearbox fairing and mast under the hub.
      add(geometry.panel, olive, 0, 6.5, -3.2, 4.0, 2.0, 5.0);
      // Mast fairing, then the mast itself. Without the fairing the hub sits on
      // a bare pole eight metres above the roof and reads as detached.
      add(geometry.panel, olive, 0, 7.7, -3.0, 2.6, 1.6, 3.4);
      add(geometry.shipCylinder, dark, 0, 8.5, -3.0, 1.15, 1.6, 1.15);

      // --- Tail boom. It has to be VISIBLE as a boom, so it starts aft of the
      // clamshell, is thinner than the fuselage, and sits high enough that the
      // dropped ramp underneath it is clear - that is the shape a rear-loading
      // helicopter has.
      add(geometry.shipCylinder, olive, 0, 2.3, 15.6, 1.7, 5.6, 1.7, Math.PI / 2);
      add(geometry.shipCylinder, olive, 0, 2.9, 19.8, 1.2, 3.6, 1.2, Math.PI / 2);
      // Dorsal spine along the boom, so the boom reads even head-on.
      add(geometry.panel, olive, 0, 3.9, 16.6, 0.9, 1.1, 9.0, -0.05);
      // Fin: tall and swept, carrying the tail rotor high up its port face.
      add(geometry.panel, olive, 0, 6.6, 21.2, 0.9, 7.6, 4.4, 0.3);
      add(geometry.panel, olive, 0, 10.4, 22.6, 0.75, 2.6, 2.8, 0.4);
      // Tailplane with endplates, low on the boom and well forward of the fin.
      add(geometry.panel, olive, 0, 2.6, 18.2, 9.0, 0.5, 2.8);
      for (const side of [-1, 1]) {
        add(geometry.panel, olive, side * 4.4, 3.4, 18.2, 0.4, 2.0, 2.4);
      }

      // --- Rear clamshell doors + loading ramp. The doors are hinged at the
      // top corners of the hold and swung UP and OUT, so the opening under the
      // boom is a hole with the ramp coming out of it.
      for (const side of [-1, 1]) {
        add(geometry.panel, olive, side * 2.55, 1.6, 12.2, 0.6, 4.4, 4.0, -0.34, 0, side * 0.24);
      }
      // The opening itself: a dark recess so the doors read as open.
      add(geometry.panel, dark, 0, -0.4, 12.0, 4.6, 4.2, 1.0);
      // Ramp, hinged at the hold floor and angled down aft. Wide and pale on
      // purpose: it is the one part that says "things drive out of the back of
      // this", and at hold width it reads from every angle including top-down.
      add(geometry.panel, light, 0, -2.6, 14.2, 5.6, 0.5, 7.0, 0.4);
      // Ramp side rails, so it is a ramp and not a loose plank.
      for (const side of [-1, 1]) {
        add(geometry.panel, dark, side * 2.7, -2.3, 14.2, 0.3, 0.7, 7.0, 0.4);
      }
      // Ramp lip on the ground end.
      add(geometry.panel, dark, 0, -4.1, 17.2, 5.4, 0.4, 1.3, 0.4);

      // --- Fixed tricycle gear. No retraction on this class: the legs stay
      // down, which is another thing that tells it apart from the gunships.
      // Nose unit under the flight deck.
      add(geometry.shipCylinder, dark, 0, -3.7, -16.8, 0.34, 2.2, 0.34);
      for (const side of [-1, 1]) {
        add(geometry.shipOctPlate, dark, side * 0.8, -4.9, -16.8, 0.9, 0.55, 0.9, 0, 0, Math.PI / 2);
      }
      // Main units on sponsons, two wheels a side, wide track.
      for (const side of [-1, 1]) {
        add(geometry.panel, olive, side * 4.0, -1.7, 0.6, 1.7, 2.4, 7.4);      // sponson
        add(geometry.shipCylinder, dark, side * 4.4, -3.7, -1.4, 0.36, 2.6, 0.36, 0, 0, side * 0.24);
        add(geometry.shipCylinder, dark, side * 4.4, -3.7, 2.6, 0.36, 2.6, 0.36, 0, 0, side * 0.24);
        for (const dz of [-1.4, 2.6]) {
          add(geometry.shipOctPlate, dark, side * 4.9, -5.0, dz, 1.05, 0.68, 1.05, 0, 0, Math.PI / 2);
        }
      }

      // --- Markings: red star on each flank of the cargo hold. It has to sit ON
      // the hold (half-width 3.7, z -13..+7) - out at the clamshell the body is
      // narrower and the star hangs in mid-air beside the aircraft, which is
      // exactly what it did at x=3.76 / z=8.
      // Outboard of the chine strake (x 3.75) or the strake clips through it.
      add(geometry.shipOctPlate, markings, -3.82, 3.1, 4.4, 1.7, 0.06, 1.7, 0, 0, Math.PI / 2);
      add(geometry.shipOctPlate, markings, 3.82, 3.1, 4.4, 1.7, 0.06, 1.7, 0, 0, Math.PI / 2);

      const rotors = [];

      // --- Main rotor: 32m across, EIGHT blades. Same trick the inline Hind
      // uses - the disc is the translucent plate (rotorSkin, never `dark`, or a
      // 32m opaque board stands in front of the player), with blades laid over
      // it so the eye has something to watch turn. Eight of them, because the
      // blade count is the other half of "this is not a gunship": a Hind shows
      // two shadows on an 8.7m plate, this shows eight on a 16m one.
      //
      // The plate is shipOctPlate - an EIGHT-sided cylinder, so its scale is the
      // circumscribed radius and its flats sit at 0.924 of it. Sized at 17.4 so
      // even the flats (16.1m) stay outside the 16m blade tips; sizing it AT the
      // tip radius lets four blades poke through the flats.
      const main = new THREE.Group();
      main.position.set(0, 9.0, -3);
      const disc = new THREE.Mesh(geometry.shipOctPlate, rotorSkin);
      disc.scale.set(17.4, 0.06, 17.4);
      main.add(disc);
      // Hub: a fat drum the blade roots come out of.
      const hub = new THREE.Mesh(geometry.shipCylinder, dark);
      hub.scale.set(1.7, 1.7, 1.7);
      main.add(hub);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        // Each blade is a HALF-span bar pushed out from the hub along its own
        // heading, so eight of them read as eight distinct blades rather than
        // as four bars crossing at the centre. Root at 1.6m, tip at 16m.
        const span = 14.4;
        const mid = 1.6 + span / 2;
        const blade = new THREE.Mesh(geometry.panel, dark);
        blade.scale.set(span, 0.22, 1.3);
        blade.position.set(Math.cos(angle) * mid, 0.4, -Math.sin(angle) * mid);
        blade.rotation.y = angle;
        main.add(blade);
        // Light leading-edge strip along each blade. Not decoration: `dark`
        // blades over the `dark` engine nacelles and over this background are
        // the same value, and the forward blade simply vanished in the top view
        // without it. Eight blades that cannot be counted are not eight blades.
        const edge = new THREE.Mesh(geometry.panel, light);
        edge.scale.set(span, 0.1, 0.3);
        edge.position.set(
          Math.cos(angle) * mid - Math.sin(angle) * 0.62,
          0.56,
          -Math.sin(angle) * mid - Math.cos(angle) * 0.62
        );
        edge.rotation.y = angle;
        main.add(edge);
        // Root cuff, at the hub end of each blade.
        const cuff = new THREE.Mesh(geometry.shipCylinder, light);
        cuff.scale.set(0.36, 1.7, 0.36);
        cuff.position.set(Math.cos(angle) * 1.7, 0.4, -Math.sin(angle) * 1.7);
        cuff.rotation.set(Math.PI / 2, 0, -angle);
        main.add(cuff);
      }
      addRoot(main);
      rotors.push(main);

      // --- Tail rotor, high on the port face of the fin. Pivot rolled 90deg
      // about Z so its LOCAL Y - the only axis updateHeli spins - lies across
      // the aircraft. Five blades on an 8m disc.
      const tail = new THREE.Group();
      tail.position.set(-1.2, 7.4, 21.2);
      tail.rotation.z = Math.PI / 2;
      const tailDisc = new THREE.Mesh(geometry.shipOctPlate, rotorSkin);
      tailDisc.scale.set(4.3, 0.05, 4.3);
      tail.add(tailDisc);
      const tailHub = new THREE.Mesh(geometry.shipCylinder, dark);
      tailHub.scale.set(0.6, 1.0, 0.6);
      tail.add(tailHub);
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const span = 3.2;
        const mid = 0.6 + span / 2;
        const blade = new THREE.Mesh(geometry.panel, dark);
        blade.scale.set(span, 0.14, 0.55);
        blade.position.set(Math.cos(angle) * mid, 0, -Math.sin(angle) * mid);
        blade.rotation.y = angle;
        tail.add(blade);
      }
      addRoot(tail);
      rotors.push(tail);

      return { rotors };
    }
  });
}
