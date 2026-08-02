export default function register(ctx) {
  const { GROUND_TYPES } = ctx.tables;
  const tank = GROUND_TYPES.tank;
  if (!tank) {
    throw new Error("[bridgeLayer] expected the tank template to exist");
  }

  // BALANCE TODO: placeholder. Every combat number here is the MBT's, spread in
  // unchanged - hp, hitRadius, smokeHeight, mobile.speed, mobile.turnRate and
  // the colours. Only identity and the dimensions the bigger silhouette forces
  // (crash / hitBox) are authored below. An unarmoured-topped engineer vehicle
  // hauling a steel span should not plausibly take the same two missiles a main
  // battle tank does, and it should be slower; the numbers do not say that yet.
  //
  // `tank` is the right template for an unarmed unit specifically because its
  // `aa` is already null - MBTs are deliberately not in this game's list of
  // things that shoot at aircraft - so spreading it disarms by construction
  // rather than by overriding a live weapon block.
  ctx.addGroundType("bridgeLayer", {
    ...tank,
    key: "bridgeLayer",
    label: "BRIDGE LAYER",
    role: "Armoured Vehicle-Launched Bridge",
    // Wider and much taller than the donor. `crash.top` is where a crashing
    // aircraft is stopped, so it is measured to the raised ramp ends of the
    // folded span (y ~7.4) rather than to the bare deck the tank's 3.2 refers
    // to, and halfBeam covers the span's overhang rather than the tracks.
    crash: Object.freeze({ halfLen: 9.6, halfBeam: 5, top: 7.6 }),
    // x = span width plus rails, y = ground to apex, z = the full folded span,
    // which overhangs the hull at both ends and is what the player is aiming at.
    hitBox: Object.freeze({ x: 11, y: 9, z: 20 }),
    // Ranged off the longer object rather than off the chassis: between the
    // tank's 18 and the trainLoco-class targets.
    hitRadius: 21
  });

  ctx.addGroundModel("bridgeLayer", {
    build(env) {
      const { geometry, steel, olive, dark, light, add } = env;

      // ---- Chassis -------------------------------------------------------
      // Deliberately the inline `tank` branch's running gear and hull, at the
      // same offsets, so the two vehicles read as one army's chassis. What is
      // NOT copied is the turret: the deck above y 3 is left clear for the span.
      add(geometry.panel, dark, -3.4, 1, 0, 1.7, 2, 12.4);
      add(geometry.panel, dark, 3.4, 1, 0, 1.7, 2, 12.4);
      add(geometry.panel, steel, -3.4, 0.55, 0, 1.9, 0.7, 11);
      add(geometry.panel, steel, 3.4, 0.55, 0, 1.9, 0.7, 11);
      add(geometry.panel, olive, 0, 1.9, 0, 7.2, 1.9, 12);
      // Sloped glacis over the nose, same rake as the tank's.
      add(geometry.panel, olive, 0, 2.3, -5.4, 7, 2.4, 3.4, -0.62);
      // Low crew cupola pushed off the centreline to the left, which is where
      // the driver sits once the turret ring is gone - and the detail that
      // stops the bare deck from reading as an unfinished tank.
      add(geometry.panel, steel, -1.9, 3.3, -3.1, 2.4, 1.2, 2.8);
      add(geometry.panel, dark, -1.9, 4.0, -3.1, 2.0, 0.36, 2.4);

      // ---- Launch cradle --------------------------------------------------
      // The span does not sit on the deck, it sits on a low frame with the
      // pivot at the rear. Two bearing blocks either side of the hull centre
      // plus a rear kingpost, which is what gives the V something to hinge on.
      add(geometry.panel, steel, 0, 3.2, 1.2, 5.6, 1.0, 7.6);
      for (const side of [-1, 1]) {
        add(geometry.panel, dark, side * 2.4, 4.2, 3.0, 0.8, 1.6, 3.2);
      }
      // Hydraulic rams running up from the rear bearings to the hinge, one per
      // side, raked forward and set OUTBOARD of the cradle blocks so they are
      // silhouetted in the gap between deck and span rather than buried in it.
      // That gap is what keeps the vehicle from reading as one solid mass.
      for (const side of [-1, 1]) {
        add(geometry.shipCylinder, steel, side * 3.0, 4.3, 2.2, 0.3, 2.4, 0.3, -0.55);
      }
      // Rear spade / stabiliser blade, dropped at the tail. Every launcher has
      // one, and it is the read that the back of this vehicle is the working end.
      add(geometry.panel, dark, 0, 1.9, 6.6, 6.2, 2.4, 0.7, 0.28);

      // ---- Folded scissors span (the identity) -----------------------------
      // Two halves hinged at the CENTRE and folded UPWARD: the hinge is the low
      // point at z 0, and both halves rise away from it so the ends are the
      // high corners. That is the shape - an upward, shallow V - and getting it
      // the other way round (ends drooping off a high apex) is the one mistake
      // that turns this vehicle into a tank wearing a roof. Every AVLB carries
      // its folded span exactly this way, hinge down on the deck and the two
      // ramp ends cocked up over the nose and the tail.
      //
      // The rake is 0.19 rad (~11deg) - shallow on purpose, because a steep
      // fold reads as a launched ramp and this has to read as a carried load.
      //
      // Each half is the same pieces: a pair of treadways, an outboard guide
      // rail on each, and a girder under each. The rails are why this is a
      // bridge and not a slab: they are the outermost thing on the vehicle, so
      // the span overhangs the tracks from every angle.
      const HALF_LEN = 9.6;     // each folded half, z
      const HALF_BEAM = 4.7;    // span half-width - wider than the hull's 3.6
      const HINGE_Y = 5.4;      // the LOW point, sitting down on the cradle
      const RAKE = 0.21;
      const MID_Z = HALF_LEN * 0.5;
      // Each half's centre sits above the hinge by the rise its own rake makes
      // over half its length, so the two halves meet exactly at the hinge.
      const MID_Y = HINGE_Y + Math.sin(RAKE) * MID_Z;
      // The deck is TWO TREADWAYS with a gap down the middle, not one plate.
      // That gap is doing real work: it is why the top-down view shows a pair
      // of ladders with the tracks visible between them instead of a slab that
      // hides the whole vehicle, and it is what a real scissors span looks like.
      const TREAD_W = 2.1;
      const TREAD_X = HALF_BEAM - TREAD_W * 0.5 - 0.25;

      for (const end of [-1, 1]) {
        const cz = end * MID_Z;
        // rx sign: the +z half must tip its far end UP, which is a negative
        // rotation about x, so the rake is applied as -end * RAKE throughout.
        const rake = -end * RAKE;
        for (const side of [-1, 1]) {
          // Treadway deck.
          add(geometry.panel, olive, side * TREAD_X, MID_Y, cz,
            TREAD_W, 0.45, HALF_LEN, rake);
          // Guide rail standing proud along the OUTBOARD edge of each treadway.
          // These are the outermost thing on the vehicle, so they are what makes
          // the span read as wider than the hull from every angle.
          add(geometry.panel, steel, side * (HALF_BEAM - 0.3), MID_Y + 0.5, cz,
            0.6, 0.85, HALF_LEN, rake);
          // Underside box girder per treadway - what stops the span reading as
          // a flat board in the side view.
          add(geometry.panel, dark, side * TREAD_X, MID_Y - 0.6, cz,
            1.3, 0.9, HALF_LEN - 1.2, rake);
        }
        // Cross-brace tying the two treadways together near the raised end,
        // and the blunt ramp lip on the very tip of the span.
        const tipY = MID_Y + Math.sin(RAKE) * MID_Z * 0.85;
        add(geometry.panel, dark, 0, tipY, end * (HALF_LEN - 1.6),
          HALF_BEAM * 2 - 1.6, 0.4, 1.0, rake);
        add(geometry.panel, light, 0, tipY + 0.05, end * (HALF_LEN - 0.4),
          HALF_BEAM * 2 - 0.9, 0.42, 1.4, rake);
      }
      // The hinge itself, at the LOW centre of the V: a crossbeam joining the
      // two halves plus a knuckle either side. This is the pinch point the
      // whole span folds about, and it sits down on the cradle.
      add(geometry.panel, steel, 0, HINGE_Y - 0.35, 0, HALF_BEAM * 2 + 0.3, 0.7, 1.6);
      for (const side of [-1, 1]) {
        add(geometry.shipCylinder, dark, side * (HALF_BEAM - 0.2), HINGE_Y - 0.35, 0,
          0.45, 1.1, 0.45, 0, 0, Math.PI / 2);
      }

      // No `dish`: nothing on an engineer vehicle rotates, and the spec carries
      // no dishSpin. Returning nothing is the contract for that.
    }
  });
}
