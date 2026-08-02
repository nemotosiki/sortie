export default function register(ctx) {
  const { GROUND_TYPES } = ctx.tables;

  // A substation neither shoots nor moves, so the template has to be an
  // emplaced entry whose `aa` is already null - spreading one of those disarms
  // by construction rather than by overriding a live weapon block. `fuelTank`
  // is the closest match in kind: a fixed industrial installation whose value
  // is what it stores and distributes, not what it can do to an aircraft.
  const depot = GROUND_TYPES.fuelTank;
  if (!depot) throw new Error("[substation] expected the fuelTank ground template");

  // BALANCE TODO: placeholder. Every combat number below is the fuel depot's,
  // spread in unchanged - hp 50, aa null, smokeHeight, the chain cook-off
  // block, and all three colours. A 50 m switchyard full of steel and oil is
  // not obviously the same two-strafing-passes proposition a row of fuel
  // bunkers is, and the `chain` radius it inherits (90 m / 55 dmg) was authored
  // for tank farms stored shoulder to shoulder, not for a fenced plot with one
  // neighbour. Both want a tuning pass; neither is this delivery.
  //
  // Only identity and the dimensions the much larger silhouette forces are
  // authored here.
  ctx.addGroundType("substation", {
    ...depot,
    key: "substation",
    label: "SUBSTATION",
    role: "Power Distribution Substation",
    // Geometry-derived so the lock box and the crash volume match what is
    // drawn. The site is 50 m square at the fence, but the thing an aircraft
    // can actually hit is the fenced yard's contents: 35 m of gantry across,
    // 23 m to the top of the pylon.
    hitRadius: 32,
    crash: Object.freeze({ halfLen: 18, halfBeam: 18, top: 23 }),
    hitBox: Object.freeze({ x: 36, y: 24, z: 34 }),
    smokeHeight: 9
  });

  ctx.addGroundModel("substation", {
    build(env) {
      const { geometry, steel, olive, dark, light, add } = env;

      // ---- Site ------------------------------------------------------------
      // Graded gravel plot, 50 x 50, sitting just clear of the terrain. This is
      // the footprint the fence encloses and it is what gives the unit its
      // area from directly above.
      add(geometry.panel, olive, 0, 0.25, 0, 50, 0.5, 50);
      // Concrete apron under the transformer row - lighter and raised, so the
      // switchyard proper is visibly a hard-standing inside a wider plot. Kept
      // to the row itself rather than to the whole yard: an apron that covered
      // the plot turned the top-down view into one pale rectangle.
      add(geometry.panel, steel, 0, 0.6, 2.5, 38, 0.7, 13);
      // Access road from the gate, running up the east side of the yard and
      // turning in behind the gantry. Drawn in `steel` rather than `dark`: at
      // this size a black band reads as a hole punched through the site from
      // directly above, which is exactly what the first draft did.
      add(geometry.panel, steel, 17, 0.6, 8, 6, 0.55, 34);
      add(geometry.panel, steel, 4, 0.6, -14, 32, 0.55, 5);

      // ---- Transformers ----------------------------------------------------
      // THE feature. Three of them in a row on the apron, each an oil tank with
      // a radiator bank down its back and three bushings standing on the roof.
      //
      // The bushings are painted `light` (the pale grey-white the models use
      // for radar plates and wingtip stores) against `dark` tanks, and they are
      // the only tall pale objects on the site. That value contrast is doing
      // the identification at range, so they are drawn generously: 2.4 m of
      // column plus a wider skirt, standing 5.4 m above the tank roof.
      const BAYS = [-13, 0, 13];
      const XZ = 2.5;
      for (const bay of BAYS) {
        // Plinth. Every transformer sits in its own bunded concrete cell.
        add(geometry.panel, steel, bay, 1.0, XZ, 9.4, 1.2, 8.2);
        // Oil tank: the body of the machine, 8 x 5.6 x 5.4 tall.
        add(geometry.panel, dark, bay, 4.3, XZ, 8, 5.0, 5.6);
        // Tank roof cap, slightly overhanging, so the top edge catches the key
        // light and the box does not read flat from above.
        add(geometry.panel, steel, bay, 6.7, XZ, 8.4, 0.55, 6.0);
        // Radiator bank: cooling fins hung off the south face. Four thick
        // vertical slabs is what breaks a plain box into a transformer, and
        // four is where the read stops improving - six cost six more meshes
        // per machine and looked identical from every distance this is seen at.
        for (let fin = 0; fin < 4; fin += 1) {
          add(geometry.panel, steel, bay - 2.7 + fin * 1.8, 4.1, XZ + 3.6,
            0.5, 4.0, 2.6);
        }
        // Conservator drum along the top of the tank - the horizontal cylinder
        // every oil-filled transformer carries above its radiators.
        add(geometry.shipCylinder, steel, bay, 6.9, XZ + 2.9, 0.75, 6.8, 0.75,
          0, 0, Math.PI / 2);

        // Bushings. Three per machine, one per phase, spaced across the roof.
        // These are the tallest things on the transformer and the only pale
        // vertical objects at this end of the yard, so they are drawn long -
        // 6.4 m of column above a 6.7 m roof, reaching y 13.3, well clear of
        // the tank so the row of nine stalks is unmistakable from any angle.
        // Three meshes per bushing, not five. The column and the terminal cap
        // are the read; a base flange and a second shed ring were invisible
        // behind the tank's own roof cap from every angle and cost six more
        // meshes per machine.
        for (const phase of [-2.7, 0, 2.7]) {
          // The porcelain column itself.
          add(geometry.shipCylinder, light, bay + phase, 10.0, XZ - 0.6, 0.46, 6.6, 0.46);
          // One wider shed ring at mid height, which is what makes a bushing
          // read as an insulator rather than as a pipe.
          add(geometry.shipCylinder, light, bay + phase, 10.0, XZ - 0.6, 0.86, 0.6, 0.86);
          // Terminal cap on top.
          add(geometry.shipCylinder, dark, bay + phase, 13.4, XZ - 0.6, 0.58, 0.8, 0.58);
        }
      }

      // ---- Portal gantry ---------------------------------------------------
      // The switchyard's overhead busbar structure: two lattice legs at
      // x = +/-17 carrying a head beam 16.4 m up, spanning the whole yard
      // behind the transformer row. Lattice is faked the way the ships fake
      // railings - a slender leg with visible cross bracing rather than a solid
      // post - so it reads as open steel from a distance.
      //
      // Deliberately built out of few, LARGE pieces. The reference for part
      // budget here is the carrier, which is the biggest object in this game
      // and is 30 meshes; a lattice tower drawn strut-by-strut buys nothing at
      // the range a ground unit is ever seen from and costs more than the whole
      // rest of the roster put together.
      const GZ = -7;
      const GANTRY_TOP = 16.4;
      for (const side of [-1, 1]) {
        const legX = side * 17;
        // Two corner posts per leg, fore and aft, so the leg has depth rather
        // than being a single flat pole.
        for (const post of [-1.5, 1.5]) {
          add(geometry.panel, steel, legX, GANTRY_TOP / 2, GZ + post,
            0.6, GANTRY_TOP, 0.6);
        }
        // Cross bracing between the posts, alternating diagonals up the leg -
        // this is what makes the leg read as lattice rather than as a column.
        for (let rung = 0; rung < 4; rung += 1) {
          const y = 3.0 + rung * 4.0;
          add(geometry.panel, steel, legX, y, GZ, 0.46, 0.36, 4.4,
            (rung % 2 === 0 ? 0.66 : -0.66));
        }
        // Footing block.
        add(geometry.panel, steel, legX, 0.9, GZ, 2.8, 1.4, 4.4);
      }
      // Head beam across the top, and a second chord below it with diagonal
      // bracing between - the beam is a truss, not a bar. It spans the full
      // 34 m between the legs, the widest single line on the site.
      add(geometry.panel, steel, 0, GANTRY_TOP, GZ, 35, 0.6, 0.7);
      add(geometry.panel, steel, 0, 14.4, GZ, 35, 0.55, 0.6);
      for (let bay = 0; bay < 6; bay += 1) {
        add(geometry.panel, steel, -14 + bay * 5.6, 15.4, GZ, 6.2, 0.34, 0.44,
          0, 0, (bay % 2 === 0 ? 0.36 : -0.36));
      }
      // A second, lower busbar beam behind the portal, carried on the same
      // legs. Two horizontal lines at different heights is what a switchyard
      // looks like from the side.
      add(geometry.panel, steel, 0, 10.6, GZ - 2.6, 34, 0.5, 0.55);
      // Hanging insulator strings under the head beam, one per phase over each
      // transformer bay. Pale, like the bushings, so the gantry line and the
      // machines below it read as the same electrical system.
      for (const bay of BAYS) {
        for (const phase of [-2.7, 0, 2.7]) {
          add(geometry.shipCylinder, light, bay + phase, 13.0, GZ, 0.34, 3.0, 0.34);
        }
      }
      // Disconnect switches between the gantry and the machines: one plinth and
      // one blade bar on three posts per bay - the low, repeated hardware that
      // fills the middle of a real yard without becoming its own model.
      for (const bay of BAYS) {
        for (const phase of [-2.7, 0, 2.7]) {
          add(geometry.shipCylinder, light, bay + phase, 3.4, GZ + 4.2, 0.34, 4.6, 0.34);
        }
        add(geometry.panel, steel, bay, 5.9, GZ + 4.2, 6.4, 0.4, 0.5);
        add(geometry.panel, steel, bay, 1.0, GZ + 4.2, 7.2, 1.0, 1.8);
      }

      // ---- Incoming transmission pylon -------------------------------------
      // One small lattice tower on the far edge, the tallest thing on the site
      // at 22 m. Four splayed legs converging to a narrow waist, three
      // crossarms, and a peak - the standard suspension-tower profile.
      // The base is deliberately WIDE - 4.2 m half-width against a 22 m height -
      // because a narrow tower at this scale reads as a ladder, which is what
      // the first draft did. The taper from that base to a 1.4 m waist at y 10
      // is the whole silhouette.
      // Pushed right back to the fence line: at z -17 its 14 m bottom crossarm
      // and the gantry's head beam were only 10 m apart and the two structures
      // read as one confused mass of steel from three of the four views.
      const pylonZ = -20.5;
      const PYL_BASE = 4.2;
      const PYL_WAIST = 1.4;
      const PYL_KNEE = 10.0;
      for (const cornerX of [-1, 1]) {
        for (const cornerZ of [-1, 1]) {
          // Splayed lower leg, drawn by placing the bar at the MIDPOINT of the
          // splayed run and tilting it by the run's own angle, so the foot
          // lands on PYL_BASE and the head lands on PYL_WAIST exactly.
          const mid = (PYL_BASE + PYL_WAIST) / 2;
          const lean = Math.atan2(PYL_BASE - PYL_WAIST, PYL_KNEE);
          const legLen = Math.hypot(PYL_BASE - PYL_WAIST, PYL_KNEE);
          // Signs: a positive rz tips the bar's head toward -x, and a positive
          // rx tips it toward +z, so the head of the +x/-z leg needs rz +lean
          // and rx +lean to come INWARD. Getting either backwards splays the
          // tower the wrong way and it stops reading as a pylon at all.
          add(geometry.panel, steel, cornerX * mid, PYL_KNEE / 2, pylonZ + cornerZ * mid,
            0.5, legLen, 0.5, -cornerZ * lean, 0, cornerX * lean);
          // Upper shaft: parallel, from the waist to under the peak.
          add(geometry.panel, steel, cornerX * PYL_WAIST, 15.6, pylonZ + cornerZ * PYL_WAIST,
            0.42, 11.6, 0.42);
        }
      }
      // Belt bracing, three tiers, at whatever width the legs have reached
      // there. Two meshes per tier - one belt across the south face and one
      // diagonal over it - rather than a full ring of four plus a diagonal: the
      // north face of the tower is never the side being looked at when the
      // south face is, so the ring's other three sides were paying for nothing.
      for (const belt of [{ y: 2.4, half: 3.6 }, { y: 6.4, half: 2.4 },
        { y: 12.0, half: PYL_WAIST }]) {
        add(geometry.panel, steel, 0, belt.y, pylonZ + belt.half,
          belt.half * 2, 0.32, 0.36);
        add(geometry.panel, steel, 0, belt.y, pylonZ - belt.half,
          belt.half * 2, 0.32, 0.36);
        // Diagonal over the tier, so the tower is visibly latticed rather than
        // four posts and some rings. Length and angle are solved from the tier
        // itself (2*half wide, 2 m tall) instead of being guessed - a fixed
        // 0.6 rad on the widest tier threw a 7 m beam right out past the fence
        // in the first draft.
        const braceLen = Math.hypot(belt.half * 2, 2.0);
        add(geometry.panel, steel, 0, belt.y + 1.0, pylonZ + belt.half,
          braceLen, 0.26, 0.3, 0, 0, Math.atan2(2.0, belt.half * 2));
      }
      // Crossarms: three tiers, widest at the bottom, each hung with a pale
      // insulator string at its tip. Nothing says "power line" like this stack,
      // and it has to be WIDE - the bottom arm spans 14 m, half the yard - or
      // the tower stops reading as a transmission structure from above.
      const ARMS = [
        { y: 12.6, half: 7.0 },
        { y: 16.4, half: 5.6 },
        { y: 20.0, half: 4.0 }
      ];
      for (const arm of ARMS) {
        add(geometry.panel, steel, 0, arm.y, pylonZ, arm.half * 2, 0.5, 0.6);
        for (const tip of [-1, 1]) {
          // Diagonal tie from the mast head down to the arm tip. This one brace
          // does the kingpost's job too, so the arm reads as a truss on four
          // meshes a tier instead of eight.
          add(geometry.panel, steel, tip * arm.half * 0.55, arm.y + 0.9, pylonZ,
            arm.half * 1.25, 0.3, 0.34, 0, 0, tip * 0.26);
          // Suspension insulator string hanging under the tip.
          add(geometry.shipCylinder, light, tip * arm.half, arm.y - 1.4, pylonZ,
            0.32, 2.6, 0.32);
        }
      }
      // Peak above the top crossarm, carrying the earth wire.
      add(geometry.panel, steel, 0, 21.4, pylonZ, 1.8, 2.8, 1.8);
      add(geometry.panel, steel, 0, 23.0, pylonZ, 0.4, 1.4, 0.4);

      // ---- Ancillaries -----------------------------------------------------
      // Control/switchgear house on the east side of the yard. Small, low and
      // ordinary on purpose: it is the one part of the site that looks like a
      // building, and it makes the electrical hardware around it read as big.
      add(geometry.panel, light, -16, 2.6, 14, 9, 4.6, 8);
      add(geometry.panel, steel, -16, 5.1, 14, 9.6, 0.55, 8.6, 0, 0, 0.05);
      add(geometry.panel, dark, -16, 2.0, 18.2, 1.8, 3.2, 0.4);
      // Cable trench running from the house to the transformer row.
      add(geometry.panel, dark, -16, 0.9, 8, 2.6, 0.5, 6);
      // Line surge arresters on the east apron, so the yard has something on
      // both sides of its centre line. Two pale posts on one plinth each.
      for (const z of [11, 15]) {
        add(geometry.panel, steel, 6, 0.9, z, 3.4, 1.0, 3.4);
        add(geometry.shipCylinder, light, 6, 2.8, z, 0.42, 3.0, 0.42);
      }
      // Standby generator shed and an oil bund just inside the gate. The south
      // third of the plot was bare from directly above without them, and an
      // empty third of a 50 m site reads as an unfinished model.
      add(geometry.panel, light, -6, 2.0, 20, 8, 3.4, 6);
      add(geometry.panel, steel, -6, 3.9, 20, 8.6, 0.5, 6.6);
      add(geometry.shipCylinder, dark, -6, 4.9, 18.4, 0.5, 2.2, 0.5);
      add(geometry.shipCylinder, steel, 1, 1.7, 21, 1.8, 2.4, 1.8);
      add(geometry.panel, steel, 1, 0.85, 21, 6, 0.9, 4);

      // ---- Perimeter fence -------------------------------------------------
      // 50 m square, 2.6 m of mesh on posts. Drawn as four thin slabs plus
      // corner posts and a gate gap on the south side - the outline is what
      // makes the whole plot read as one installation from directly above,
      // so it matters more than its own detail does.
      const HALF = 25;
      for (const side of [-1, 1]) {
        // East/west runs, full length.
        add(geometry.panel, steel, side * HALF, 1.6, 0, 0.25, 2.4, HALF * 2);
        // North run, full. South run, split either side of a 6 m gate.
        add(geometry.panel, steel, 0, 1.6, side * HALF, HALF * 2, 2.4, 0.25);
      }
      // Gate: two leaves standing in the south fence, drawn darker so the
      // opening is visible rather than being a gap in a line.
      for (const leaf of [-1, 1]) {
        add(geometry.panel, dark, leaf * 3.2, 1.7, HALF, 5.6, 2.6, 0.35);
      }
      // Corner posts, taller than the run, which is what keeps a thin fence
      // from disappearing at range.
      for (const cornerX of [-1, 1]) {
        for (const cornerZ of [-1, 1]) {
          add(geometry.panel, steel, cornerX * HALF, 1.9, cornerZ * HALF, 0.6, 3.4, 0.6);
        }
      }

      // Nothing on a substation rotates, so no `dish` is returned.
    }
  });
}
