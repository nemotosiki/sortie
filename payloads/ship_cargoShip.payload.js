// CARGO SHIP - a 200m container ship for the convoy missions (M13 / M33).
//
// The one hull in the game with no weapon on it at all. Everything about the
// silhouette is chosen so the player reads "civilian freighter" before the lock
// box even resolves, because the whole point of the convoy sorties is that the
// food, the medicine and the ordnance all arrive in the same paint:
//
//   * a DECK STACKED WITH CONTAINERS running most of the hull length, in three
//     colours, in visibly separated bays. This is the identity. Nothing else on
//     the water in this game has a rectangular multicoloured mass on top of it,
//     so it is readable from any angle and at any range.
//   * a TALL NARROW BOX of a bridge shoved right aft over the engine room, with
//     the funnel behind it - the merchant layout, and the opposite of the
//     Aegis' one big forward block.
//   * HIGH FREEBOARD: the hull sides are a slab, not a warship's low sheer, so
//     the container stack sits well above the waterline.
//   * TWO DECK CRANES on the centreline between the bays - the give-away that
//     this is a self-geared ship rather than a warship with cargo lashed down.
//   * NO gun tub, NO mast-mounted radar plate, NO launcher of any kind.
//
// Scale (bow at -Z, y measured up from the waterline): hull runs z -100..+100 =
// 200m LOA, against the Aegis' 155m and the carrier's 330m. Beam 32m, which is
// the real Panamax-ish proportion (200/32 = 6.25 L/B) and deliberately wider
// than the 165m LST's 26m - a freighter is a box, a warship is a blade.
export default function register(ctx) {
  const { SHIP_TYPES } = ctx.tables;
  const lst = SHIP_TYPES.landingShip;
  if (!lst) {
    throw new Error("[cargoShip] expected the landingShip template to exist");
  }

  // BALANCE TODO: placeholder. Every combat number below - hp, cruiseSpeed,
  // turnRate, the aa block, blastSpread, sinkDepth - is the landing ship's,
  // inherited unchanged. Only identity, dimensions and the (empty) armament fit
  // are authored here. A loaded 200m freighter should almost certainly be
  // slower to turn and harder to sink than an LST, and the numbers should
  // eventually say so.
  ctx.addShipType("cargoShip", {
    ...lst,
    key: "cargoShip",
    surface: true,
    // The LST's `landing:true` MUST be cleared. That flag tells updateShip to
    // steer at the nearest beach and updateLandingThreat to punish the player
    // for letting one arrive - a merchant hull inherits neither behaviour, and
    // leaving it set would silently turn every convoy into a beachhead timer.
    landing: false,
    label: "CARGO",
    role: "Container Ship",
    // 200m LOA / 32m beam. hitRadius sits between the LST's 78 (165m) and the
    // carrier's 150 (330m), scaled off length the way the others are.
    hitRadius: 92,
    // `top` is the height a crashing aircraft is stopped at, so it is measured
    // off the tallest SOLID mass the model draws - the bridge block, which
    // runs to y 52 - and not off the mast or the crane booms, which an
    // aeroplane would go through rather than into.
    crash: Object.freeze({ halfLen: 100, halfBeam: 17, top: 52 }),
    // y 63 is waterline to masthead; z 200 is the full LOA; x 34 is the beam
    // plus the bridge-wing overhang.
    hitBox: Object.freeze({ x: 34, y: 63, z: 200 }),
    sternOffset: 96,
    bowOffset: 98,
    blastSpread: 40,
    smokeOffset: 60,   // the funnel is aft, so the burning is too
    smokeHeight: 24,
    // UNARMED. The three gun keys have to stay PRESENT and be neutered in
    // place rather than deleted, for two independent reasons:
    //   1. registryAdd derives its required-key set from the intersection of
    //      every existing SHIP_TYPES entry, and all five carry aaMounts /
    //      aaHeight / aa. Dropping them is a load-time throw.
    //   2. updateShip dereferences `spec.aa.cooldownMin` unconditionally every
    //      frame, so `aa: undefined` is a crash, not a disarm. Same trap the
    //      transportHeli payload documents for updateHeli.
    // The disarm is therefore structural: tracers 0 means aaFiringPoints'
    // legacy loop produces zero mounts and shipAaBurst returns on the empty
    // list, and range 0 means it would have returned before that anyway.
    // Nothing on the model draws a barrel, and nothing in the sim fires one.
    aaMounts: Object.freeze([]),
    aaHeight: 0,
    aa: Object.freeze({ range: 0, cooldownMin: 9999, cooldownSpread: 0, damage: 0, maxHitChance: 0, tracers: 0 }),
    // No subsystems either, for the same reason the missile boat has none: with
    // no gun, no VLS and no CIWS there is no hardware on the model to lock, and
    // an empty-but-present array would still put the hull into the NEXT walk as
    // a parent with nothing under it. Absent = the pre-M9 path, which is what a
    // civilian target should take. `subsystems` is NOT in the required set (the
    // frigate and the missile boat both lack it), so deleting it is legal here
    // where deleting the gun keys is not.
    subsystems: undefined,
    // Merchant orange-white rather than the fleet's amber, so it is separable
    // from its escorts on the radar at a glance.
    radarColor: "#ffe6c2",
    tracerColor: 0xffb04a,      // inherited; nothing on this hull fires
    explosionColor: 0xffa348
  });

  ctx.addShipModel("cargoShip", {
    build(env) {
      const { geometry, add, friendly, makeAircraftMaterial,
              hull, deck, house, dark, light, olive2, markings,
              extraMaterials } = env;

      // Container paint. Three tones is the brief and three tones is what
      // reads: a rust red, a sea green and a slate blue. The five themed
      // materials cannot supply these (they are hull grey / deck grey / house
      // grey / shadow / white), so they are made here - and therefore MUST go
      // into extraMaterials or they leak with every hull that sinks.
      //
      // Consequence of being extra rather than standard: containers do NOT
      // flash white on a hit. That is the correct read anyway - the cargo is
      // not the thing taking the damage, the ship is, and the grey hull under
      // the stack still flashes.
      const boxColors = friendly
        ? [0xa8443a, 0x3f7d6a, 0x4a6288]
        : [0xb8503f, 0x46876f, 0x53688f];
      const crates = boxColors.map((color) => {
        const m = makeAircraftMaterial(color, 0.14, 0.88);
        extraMaterials.push(m);
        return m;
      });

      // ---- Hull: a slab, 200m x 32m. -------------------------------------
      // Freeboard is deliberately the tallest afloat here in absolute terms
      // (deck edge y 13 against the LST's 10 and the Aegis' 9) but the SAME
      // fraction of length the others run - a merchant is a wall-sided box,
      // not a deeper ship. The read comes from the stack sitting on top of a
      // tall unbroken side with no sheer, no deckhouse and no gun on it.
      add(geometry.panel, hull, 0, 6.5, 6, 32, 13, 174);
      // Boot topping at the waterline. Thin: the earlier 3.2m band read as a
      // second hull and made the whole thing look twice as deep as it is.
      add(geometry.panel, dark, 0, 0.9, 6, 32.6, 1.9, 175);
      // Forward section, narrower in beam, running out to the stem.
      add(geometry.panel, hull, 0, 6.5, -85, 23, 13, 22);
      // Raked stem: a shallow wedge, not the knife bow every combatant carries.
      add(geometry.shipBow, hull, 0, 6.5, -97, 11.5, 13, 7, -Math.PI / 2);
      // Bulbous bow at the forefoot - a merchant tell, and the only genuinely
      // round thing on the hull.
      add(geometry.shipCylinder, dark, 0, 2.2, -99, 2.8, 8, 2.8, 0, 0, Math.PI / 2);
      // Squared transom.
      add(geometry.panel, hull, 0, 6.5, 94, 29, 13, 12);

      // ---- Weather deck + the hatch coamings the stack sits in ------------
      add(geometry.panel, deck, 0, 13.4, 0, 31, 1.2, 184);
      // Coaming rails down both sides of the cargo run: the containers read as
      // held in a slot rather than balanced on a flat plate.
      // Span matches the cargo run in the BAYS table: z -93..53, centre -20.
      add(geometry.panel, dark, -14.4, 15.2, -20, 1.8, 3, 146);
      add(geometry.panel, dark, 14.4, 15.2, -20, 1.8, 3, 146);
      // Forecastle: raised bow deck, mooring winches, and a plain pole mast.
      add(geometry.panel, deck, 0, 15.4, -88, 21, 2.8, 20);
      add(geometry.shipCylinder, dark, -5, 17.8, -92, 1.4, 1.4, 1.4);
      add(geometry.shipCylinder, dark, 5, 17.8, -92, 1.4, 1.4, 1.4);
      add(geometry.shipCylinder, light, 0, 22, -84, 0.5, 10, 0.5);

      // ---- THE CARGO ------------------------------------------------------
      // The identity of the hull, and the one thing that must survive at
      // thumbnail size. Four bays running z -93..+53 - 146m of stack, nearly
      // three quarters of the deck - separated by 10m gaps that read as bay
      // divisions rather than as empty deck.
      //
      // Part budget drove the construction. The inline hulls run 28-30 parts
      // apiece and a literal grid of 40ft boxes came out at 244, which is not
      // worth 8x the scene cost. The unit drawn here is therefore a ROW-TIER:
      // one mesh spanning a whole bay's length, one third of its beam and one
      // stacking level. Three rows x 3-5 tiers = 9-15 meshes a bay, and every
      // one of them is a different colour from the three neighbours it touches.
      //
      // An intermediate version merged tiers into two tall slabs with painted
      // seam lines to save meshes. It rendered as two painted slabs. The
      // chequerboard only reads when the colour changes at every level, so the
      // tiers are real geometry and the seams are the 0.35m gaps between them.
      //
      // Deck at y 14.0. Tier height 5.4m, so a 5-tier bay is 27m of boxes
      // standing on 13m of freeboard - the stack is twice as tall as the hull
      // is deep, which is the proportion that says "loaded container ship" and
      // the one the first pass got wrong.
      const DECK_Y = 14.0;
      const TIER = 5.4;
      // Bay centres bow->stern, their length, and tiers carried. The profile
      // steps UP from the bow to a 5-tier peak amidships and back DOWN toward
      // the bridge, so the top line is a staircase and not a lid.
      //
      // Extents are written out and the CRANE GAPS are named, because both
      // earlier passes got this wrong by arithmetic rather than by taste: one
      // overlapped two bays, and the next buried a crane pedestal inside the
      // bay it was supposed to stand forward of.
      //   bay 0   -80 +/-13 = -93..-67
      //   GAP     -67..-57                <- crane at -62
      //   bay 1   -38 +/-19 = -57..-19
      //   GAP     -19.. -9                <- crane at -14
      //   bay 2     8 +/-17 =  -9.. 25
      //   bay 3    40 +/-13 =  27.. 53
      // The forecastle ends at z -78 and the stem at -100, so the forward bay
      // sits ON deck rather than out over the water - which the first pass,
      // with the bay running to -105, did not.
      const BAYS = [
        { z: -80, len: 26, tiers: 3, half: 9.6 },   // fine bow bay: narrow, low
        { z: -38, len: 38, tiers: 4, half: 13.2 },
        { z: 8, len: 34, tiers: 5, half: 13.2 },    // peak
        { z: 40, len: 26, tiers: 3, half: 13.2 }    // steps down under the bridge
      ];
      for (let b = 0; b < BAYS.length; b += 1) {
        const bay = BAYS[b];
        const pitch = (bay.half * 2) / 3;
        const rowW = pitch - 0.55;          // 0.55m air between rows
        for (let t = 0; t < bay.tiers; t += 1) {
          // The top tier of every bay is one box shorter fore and aft. That
          // single inset is what stops a bay reading as an extruded prism from
          // the side, and it costs nothing.
          const top = t === bay.tiers - 1;
          const len = top ? bay.len - 12 : bay.len;
          for (let c = 0; c < 3; c += 1) {
            // Colour walk. `2 * t` rather than `t` so a row's colour changes by
            // two steps between levels: with a stride of one, (c + t) makes the
            // stack read as diagonal stripes instead of a chequerboard.
            const mat = crates[(b + c + 2 * t) % 3];
            add(geometry.panel, mat,
                (c - 1) * pitch, DECK_Y + 0.35 + t * TIER + (TIER - 0.35) / 2,
                bay.z, rowW, TIER - 0.35, len);
          }
        }
        // Lashing bridge at the foot of the bay: a dark band tying the whole
        // bay to the deck, which also hides the join with the coaming.
        add(geometry.panel, dark, 0, DECK_Y + 0.9, bay.z, bay.half * 2 + 0.6, 1.8, bay.len + 0.5);
      }

      // ---- Two deck cranes, standing in the bay gaps at z -62 and z -14 ----
      // Pedestal, slewing house, and a jib raked up and FORWARD over the
      // stack. Both are on the centreline, which is how a self-geared feeder
      // carries them and what lets the jibs plumb either side.
      //
      // The numbers are derived, not eyeballed, because two earlier passes put
      // a floating jib next to a pedestal it never touched. The boom is a
      // 32m box whose long axis is +Z, rotated by rotation.x = +RAKE. For
      // Rx(t) a local point (0,0,h) lands at (y - h sin t, z + h cos t), so
      // with RAKE POSITIVE the +Z half goes DOWN and AFT - that end is the
      // heel - and the -Z half goes UP and FORWARD over the cargo. Getting
      // that sign backwards (rotation.x = -RAKE, which is what the previous
      // pass wrote) hangs the boom head off the stern and the heel in the air
      // above the pedestal, which is exactly how it rendered.
      //   dz = cos(0.55) * 16 = 13.6    dy = sin(0.55) * 16 = 8.3
      // Heel is the top of the slewing house at HEEL_Y, so the boom's CENTRE -
      // which is what `add` positions - sits at HEEL_Y + 8.3, z cz - 13.6, and
      // the head reaches HEEL_Y + 16.6 at z cz - 27.2.
      //
      // HEEL_Y 44 is chosen against the cargo, not picked: the peak bay tops
      // out at DECK_Y + 5*TIER = 41.4, so a heel below that buries the boom
      // heel in containers and hides the pedestal from every angle except
      // straight down. 44 clears the tallest stack.
      const crane = (cz, swing) => {
        const RAKE = 0.55;
        const BOOM = 32;
        const HEEL_Y = 44;
        const dz = Math.cos(RAKE) * BOOM / 2;
        const dy = Math.sin(RAKE) * BOOM / 2;
        // Pedestal: a fat column standing on the deck (y 14) and running all
        // the way up into the slewing house - 27m of column centred at 27.5.
        add(geometry.shipCylinder, house, 0, 27.5, cz, 2.6, 27, 2.6);
        // Slewing house on top, and its dark roof at the heel line.
        add(geometry.panel, house, 0, 41.4, cz, 6.6, 5.6, 8.5, 0, swing, 0);
        add(geometry.panel, dark, 0, 44.4, cz, 7, 1, 8.9, 0, swing, 0);
        // Boom, plus a thinner top chord that makes it read as a lattice
        // rather than a stick. rotation.order is YXZ deliberately: `add`
        // writes rotation in the default XYZ, which for a raked AND slewed
        // boom tips it out of its own vertical plane. YXZ = slew first, then
        // rake within the slewed plane, which is how a real crane moves.
        const jib = add(geometry.panel, light, 0, HEEL_Y + dy, cz - dz, 1.6, 1.6, BOOM);
        jib.rotation.order = "YXZ";
        jib.rotation.set(RAKE, swing, 0);
        const chord = add(geometry.panel, dark, 0, HEEL_Y + dy + 1.6, cz - dz, 0.7, 0.7, BOOM - 4);
        chord.rotation.order = "YXZ";
        chord.rotation.set(RAKE, swing, 0);
        // Hook block, hanging plumb 5m below the boom head.
        add(geometry.shipCylinder, dark, 0, HEEL_Y + dy * 2 - 5, cz - dz * 2, 0.9, 2.6, 0.9);
      };
      // z -62 and z -14 are the two bay gaps listed in the BAYS table above.
      // Both pedestals therefore stand on open deck with cargo fore and aft of
      // them, which is the whole point: a crane inside a bay is invisible.
      crane(-62, 0.18);
      crane(-14, -0.15);

      // ---- Aft superstructure: the tall narrow box ------------------------
      // Six-deck accommodation block sitting right over the engine room. 16m
      // wide in a 32m beam and 30m tall on a 20m footprint - taller than it is
      // long in BOTH plan axes, which is the merchant proportion and the exact
      // opposite of the LST's low wide deckhouse.
      // Block runs y 14 -> 47: it has to top the 41m peak of the container
      // stack, or the tallest thing on the ship is its cargo and the aft
      // tower stops being the landmark that says which end is the stern.
      add(geometry.panel, house, 0, 30.5, 66, 16, 33, 20);
      // Deck banding: six thin dark lines = six accommodation levels. Cheap,
      // and it is what sells "tall box" rather than "grey slab" at range.
      for (let d = 0; d < 6; d += 1) {
        add(geometry.panel, dark, 0, 18 + d * 5, 66, 16.4, 0.5, 20.4);
      }
      // Bridge deck: wider than the block below and overhanging both sides,
      // with a dark glazed strip across its front face. The overhang is what
      // makes the top of the ship legible from directly above.
      add(geometry.panel, house, 0, 49.5, 64, 24, 5, 13);
      add(geometry.panel, dark, 0, 50, 57.3, 23, 3.2, 1.2);
      add(geometry.panel, dark, 0, 52.3, 64, 24.6, 1, 13.6);
      // Bridge-wing consoles on the outboard tips.
      add(geometry.panel, light, -11.8, 49.5, 64, 1.6, 1.8, 5);
      add(geometry.panel, light, 11.8, 49.5, 64, 1.6, 1.8, 5);
      // Mast above the bridge: pole, one small navigation plate, a yard.
      add(geometry.shipCylinder, dark, 0, 58, 66, 0.6, 11, 0.6);
      add(geometry.shipOctPlate, light, 0, 60, 66, 1.5, 0.35, 1.5);
      add(geometry.panel, light, 0, 63, 66, 6, 0.4, 0.4);
      // Funnel, aft of the block, with the dark cap band every line paints on
      // and twin exhaust uptakes standing out of it.
      add(geometry.panel, house, 0, 33, 82, 10, 24, 11);
      add(geometry.panel, dark, 0, 44.4, 82, 10.6, 2.6, 11.6);
      add(geometry.shipCylinder, dark, -2.4, 47, 82, 1.4, 2.4, 1.4);
      add(geometry.shipCylinder, dark, 2.4, 47, 82, 1.4, 2.4, 1.4);
      // Poop deck aft of the funnel: mooring gear and two lashed spares in the
      // vehicle olive, so the stern is not a blank plate.
      add(geometry.panel, deck, 0, 14.2, 94, 25, 1.4, 12);
      add(geometry.panel, olive2, -6, 16.4, 94, 5, 3, 9);
      add(geometry.panel, olive2, 6, 16.4, 94, 5, 3, 9);
      add(geometry.shipCylinder, dark, 0, 15.8, 99, 1.2, 1.4, 1.2);

      // ---- Hull markings: draft marks and the load line disc ----
      // The disc is the shockRing standing on the hull side amidships - the
      // Plimsoll mark, which is a civilian tell no warship carries.
      add(geometry.shockRing, markings, -16.2, 7, -5, 2.8, 2.8, 1, 0, -Math.PI / 2, 0);
      add(geometry.shockRing, markings, 16.2, 7, -5, 2.8, 2.8, 1, 0, Math.PI / 2, 0);
      add(geometry.panel, markings, -16.2, 7, -5, 0.4, 0.5, 13);
      add(geometry.panel, markings, 16.2, 7, -5, 0.4, 0.5, 13);
    }
  });
}
