export default function register(ctx) {
  const { GROUND_TYPES } = ctx.tables;

  const truck = GROUND_TYPES.tank;
  if (!truck) throw new Error("[tel] expected the tank ground template");

  // The TEL is unarmed against aircraft - it is the thing you race to kill, not
  // a thing that shoots back - so it is spread from `tank`, the mobile entry
  // that already carries `aa: null` and the proven vehicle contract, rather
  // than from adTank. Only the identity and the size numbers are overridden.
  //
  // BALANCE TODO: placeholder. hp, hitRadius and every mobile/colour value is
  // the tank's, spread through unchanged. A 19 m launcher on a highway chassis
  // should end up slower and softer than an MBT, but that is a tuning pass and
  // not this delivery.
  ctx.addGroundType("tel", {
    ...truck,
    key: "tel",
    label: "TEL",
    role: "Mobile Ballistic Missile Launcher",
    // Geometry-derived, so the lock box and the crash volume match what is
    // drawn: 19 m long, 5.5 m wide over the wheels, 4.9 m to the top of the
    // canister. Everything else above is the template's.
    hitRadius: 22,
    crash: { halfLen: 9.5, halfBeam: 2.8, top: 5 },
    hitBox: { x: 6, y: 7, z: 20 },
    smokeHeight: 5
  });

  ctx.addGroundModel("tel", {
    build(env) {
      const { geometry, olive, steel, dark, light, add } = env;

      // Built nose-along -Z, which is the forward the route heading drives, and
      // to real metres: the chassis runs z = -9.5 .. +9.5.
      //
      // Three things have to read from 2 km up, and the model spends its parts
      // on those and nothing else:
      //   1. the canister - a 2.2 m tube lying down the whole length of the
      //      vehicle with a domed cap on the nose. It is the unit.
      //   2. eight axles of wheels, which is what says "this is not a tank".
      //   3. the split cab, a driving compartment on each side of the tube.

      // ---- Running gear ---------------------------------------------------
      // Eight axles: four forward under the cab pair, four aft under the launch
      // end, with the classic Topol gap amidships that separates the two
      // groups. Wheels are 1.5 m tall and set OUTBOARD of the frame so the
      // count is legible from directly above, which is where this is seen from.
      const AXLES = [-8.3, -6.5, -4.7, -2.9, 2.6, 4.4, 6.2, 8.0];
      for (const z of AXLES) {
        for (const side of [-1, 1]) {
          // A cylinder laid on its side, so its axis runs across the vehicle.
          add(geometry.shipCylinder, dark, side * 1.95, 0.78, z,
            0.78, 0.62, 0.78, 0, 0, Math.PI / 2);
        }
        // Axle beam bridging the pair, so the underside is not a gap.
        add(geometry.panel, steel, 0, 0.8, z, 3.9, 0.32, 0.5);
      }

      // ---- Chassis --------------------------------------------------------
      // Deep box frame the full 19 m. Narrower than the wheel track and only
      // as tall as it needs to be, so the running gear stays visible under it.
      add(geometry.panel, olive, 0, 1.75, 0, 2.9, 1.5, 19);
      // Rear jacking/blast pad under the launch end - the outrigger deck the
      // vehicle sits on to fire, and the reason the tail reads as heavy.
      add(geometry.panel, steel, 0, 1.1, 8.1, 3.8, 0.8, 3.4);

      // ---- Canister -------------------------------------------------------
      // THE feature, and it owns the vehicle: a 2.2 m tube running 17 m from
      // z = -8.4 to z = +8.6, i.e. almost the entire chassis. Its centreline is
      // at 3.65 m: high enough that its full 2.2 m diameter clears the chassis
      // deck and the aft equipment, so the tube reads as ONE unbroken run in
      // profile rather than as three segments between obstructions, and low
      // enough that it is still nested between the two cabs.
      add(geometry.shipCylinder, light, 0, 3.65, 0.1,
        1.1, 8.5, 1.1, Math.PI / 2);
      // Reinforcing bands. Four of them break up a 17 m untextured tube and
      // are what make it read as a container rather than as a pipe.
      for (const z of [-5.8, -1.9, 2.0, 5.9]) {
        add(geometry.shipCylinder, steel, 0, 3.65, z,
          1.2, 0.45, 1.2, Math.PI / 2);
      }
      // Front lid: a collar, then a shallow dome standing proud on the very
      // nose of the tube. This is the end that opens, and it is deliberately
      // the lightest, roundest thing on the model.
      add(geometry.shipCylinder, steel, 0, 3.65, -8.6,
        1.24, 0.55, 1.24, Math.PI / 2);
      add(geometry.shipOctPlate, light, 0, 3.65, -9.1,
        1.16, 0.6, 1.16, Math.PI / 2);
      add(geometry.shipOctPlate, light, 0, 3.65, -9.5,
        0.78, 0.4, 0.78, Math.PI / 2);
      // Blast/exhaust ring on the aft end.
      add(geometry.shipCylinder, dark, 0, 3.65, 8.7,
        1.18, 0.7, 1.18, Math.PI / 2);
      // Cradle saddles carrying the tube off the chassis, one over each wheel
      // group so the load path is visible. Their tops are held at 2.55 m, the
      // underside of the tube, so they support it without cutting into it.
      for (const z of [-5.6, 5.6]) {
        add(geometry.panel, olive, 0, 2.2, z, 2.7, 0.8, 2.2);
      }

      // ---- Split cab ------------------------------------------------------
      // The other identifier: a driving compartment on EACH side of the
      // canister rather than one cab across the nose, because the tube runs
      // through where a cab would be. Each is a tall box set outboard of the
      // tube and pushed right forward to z = -7.6, so the pair BRACKETS the
      // canister's domed nose instead of hiding behind it - that gap between
      // them, with the lid sitting in it, is the whole silhouette read.
      // Roofs stop at 4.47 m, just under the canister crown at 4.75 m, so the
      // tube stays the top line.
      for (const side of [-1, 1]) {
        add(geometry.panel, olive, side * 2.0, 2.9, -7.6, 1.7, 2.8, 3.6);
        // Sloped windscreen, dark, on the forward face.
        add(geometry.panel, dark, side * 2.0, 3.4, -9.35, 1.5, 1.7, 0.5, -0.3);
        // Side glazing, so each half reads as a cab and not as a crate.
        add(geometry.panel, dark, side * 2.85, 3.6, -7.8, 0.12, 1.2, 2.4);
        // Roof cap - a thin lighter lid that separates the cab from the tube
        // behind it when both are seen against the ground from above.
        add(geometry.panel, steel, side * 2.0, 4.35, -7.6, 1.8, 0.24, 3.7);
      }
      // Bumper tying the two cabs together under the canister nose.
      add(geometry.panel, dark, 0, 1.6, -9.6, 4.4, 0.9, 0.6);

      // ---- Aft equipment --------------------------------------------------
      // Launch control / power unit boxes flanking the tube on the rear deck.
      // Kept outboard of the tube's 1.1 m radius and capped at its underside,
      // so the launch end is busy without hiding any of the canister.
      for (const side of [-1, 1]) {
        add(geometry.panel, olive, side * 2.0, 2.05, 7.2, 1.5, 1.1, 3.2);
      }

      // Nothing on this vehicle rotates, so no `dish` is returned.
    }
  });
}
