// Air-defence cruiser (Kirov / Slava idiom, 220m). The fleet's middle rank by
// tonnage but its first rank by reach: this is the hull that sits in the centre
// of the standard package and puts the SAM umbrella over everything else, so
// its identity marks are the ones a player has to read at a kilometre to know
// which ship to open on.
//
// What separates it from the AEGIS at range is proportion, not detail:
//   * a very long clear forecastle - a third of the hull forward of the bridge -
//     carrying two visible VLS cell grids and one big main mount right on the
//     bow, where the destroyer has a short forecastle and one small gun,
//   * a PYRAMID of superstructure stepping up in four tiers instead of the
//     destroyer's single slab block, with the big phased-array panels carried
//     on the tier faces rather than tucked on a deckhouse corner,
//   * TWO masts - a heavy forward lattice tower and a separate aft pole with a
//     search plate - which is the Soviet cruiser silhouette in one line,
//   * four CIWS drums on beam sponsons, two per side, which is twice anything
//     else afloat here and the visual reason the hull is a defence problem.
//
// Registration only: SHIP_TYPES entry + hull geometry. No mission places it.
export default function register(ctx) {
  const { SHIP_TYPES } = ctx.tables;
  // The destroyer is the template because it is the only hull in the table with
  // the full fit this ship needs - gun, VLS fields and CIWS all present - so the
  // spread brings the whole combat schema across and this file only states what
  // is different about a cruiser.
  const aegis = SHIP_TYPES.aegis;
  if (!aegis) throw new Error("[ship-cruiser] expected SHIP_TYPES.aegis as the template");

  // ===========================================================================
  // 1. SHIP_TYPES entry
  // ===========================================================================
  //
  // BALANCE TODO: placeholder. Every combat number below that is not a
  // dimension - hp, cruiseSpeed, turnRate, and the whole `aa` block inherited
  // from the destroyer via the spread - is carried over unexamined and has NOT
  // been tuned for a 220m hull. hp in particular is still the destroyer's 500
  // (5 standard missiles) while the ship is 40% longer and carries twice the
  // CIWS; a balance pass owns whether that becomes ~700 (7 missiles, the 98
  // quantum the rest of the table is built on) and whether the SAM cooldown
  // should tighten to match the "long-range SAM" role. Dimensions, subsystems
  // and the model are the deliverable here.
  ctx.addShipType("cruiser", {
    ...aegis,
    key: "cruiser",
    surface: true,
    label: "CRUISER",
    role: "Air-Defence Missile Cruiser",

    // --- Dimensions: authored for this hull, 220m overall ---------------------
    // The model's hull box runs z -110..+110 at 30m beam. Everything here is
    // measured off that rather than scaled off the destroyer's numbers.
    hitRadius: 116,
    // `top` is the collision ceiling, so it is the tier-1 roof (26) rather than
    // the mast head (78) - the destroyer does the same, taking its 22 off the
    // deckhouse and not off its 31m mast. Flying through a lattice is the
    // intended behaviour; flying through the block is not.
    crash: Object.freeze({ halfLen: 112, halfBeam: 18, top: 26 }),
    hitBox: Object.freeze({ x: 32, y: 50, z: 224 }),
    sinkDepth: 34,
    blastSpread: 44,
    smokeOffset: 18,
    smokeHeight: 22,
    sternOffset: 108,
    bowOffset: 106,

    // BALANCE TODO: placeholder - hp/speed/turn inherited, restated only so the
    // spread's values are visible at the call site instead of implied.
    hp: aegis.hp,
    cruiseSpeed: 12,
    // 2.4 deg/s in radians, written as a literal because THREE is module-scoped
    // inside index.html and is not on the payload ctx - it reaches a payload
    // only through the model builder's env, which does not run until spawn.
    turnRate: 2.4 * Math.PI / 180,

    // Tracer origins for the gun burst: the amidships mount at z -16 and the
    // forward CIWS sponson at z +42, both hardware the model draws. aaHeight is
    // the mid-point of the two (y 30 and y 19), which is where the beam gun's
    // muzzle actually is.
    aaMounts: Object.freeze([-16, 42]),
    aaHeight: 26,

    // --- Subsystems: NEXT-target walk, and the model hardware each one is on --
    // Order is the cycle order: hull, then forward VLS, aft VLS, the two beam
    // AA mounts, then the two CIWS drums. Offsets are hull-local metres with
    // the bow at -Z and y measured up from the waterline; each one is the
    // centre of a part the build() below actually draws, and the model
    // comments carry the same z values so the pair cannot drift apart.
    subsystems: Object.freeze([
      // Forward VLS grid on the forecastle - the 4x5 cell field at z -58,
      // y 15 = the hatch deck on top of its plinth.
      Object.freeze({ key: "vls-fore", kind: "vls", offset: Object.freeze({ x: 0, y: 15, z: -58 }) }),
      // Second VLS grid immediately aft of it at z -38, ahead of the bridge.
      Object.freeze({ key: "vls-aft", kind: "vls", offset: Object.freeze({ x: 0, y: 15, z: -38 }) }),
      // Amidships gun mounts, port and starboard, on tier 1's shoulder roof.
      Object.freeze({ key: "aa-port", kind: "aa", offset: Object.freeze({ x: -12.5, y: 30, z: -16 }) }),
      Object.freeze({ key: "aa-stbd", kind: "aa", offset: Object.freeze({ x: 12.5, y: 30, z: -16 }) }),
      // Two of the four CIWS drums are lockable: the forward pair on the beam
      // sponsons at z +42. The aft pair at z +70 are drawn but not lockable, so
      // the NEXT walk stays six stops long instead of eight.
      Object.freeze({ key: "ciws-port", kind: "ciws", offset: Object.freeze({ x: -15.5, y: 19, z: 42 }) }),
      Object.freeze({ key: "ciws-stbd", kind: "ciws", offset: Object.freeze({ x: 15.5, y: 19, z: 42 }) })
    ]),

    radarColor: "#ffa878",
    tracerColor: 0xffb04a,
    explosionColor: 0xffa348
  });

  // ===========================================================================
  // 2. Hull geometry
  // ===========================================================================
  ctx.addShipModel("cruiser", {
    build(env) {
      const {
        geometry, add,
        hull, deck, house, dark, light, markings
      } = env;

      // --- Hull, boot topping and weather deck -------------------------------
      // 220m x 30m beam. The dark band is the boot topping at the waterline,
      // the same trick the destroyer uses to keep the hull from reading as one
      // flat grey slab from the side.
      add(geometry.panel, hull, 0, 5.5, 4, 30, 12, 196);
      // Bow wedge: sy is its LENGTH along the hull once rx has laid the cone
      // down, sx/sz its half-beam and half-depth. 24 long on a 15m half-beam
      // keeps the stem a wedge; the destroyer's 20-on-9.5 is the same ratio.
      add(geometry.shipBow, hull, 0, 5.5, -102, 15, 24, 6.4, -Math.PI / 2);
      add(geometry.panel, dark, 0, 1.0, 4, 30.6, 2.2, 197);
      add(geometry.panel, deck, 0, 12.0, 6, 29.6, 0.8, 190);
      // Bulwark down each side of the long forecastle - it is the flat
      // foredeck that makes this hull read as a cruiser, so it gets an edge.
      add(geometry.panel, house, -14.4, 13.6, -62, 1.2, 2.4, 78);
      add(geometry.panel, house, 14.4, 13.6, -62, 1.2, 2.4, 78);

      // --- Bow: main mount ---------------------------------------------------
      // One big turret right forward at z -78: a barbette, a gunhouse taller
      // than it is long, and twin barrels at elevation reaching almost to the
      // stem. Deliberately about twice the destroyer's 5-inch mount in every
      // dimension - it is the second thing the eye finds after the cell fields.
      add(geometry.shipCylinder, dark, 0, 14.6, -78, 7.0, 4.4, 7.0);
      add(geometry.panel, light, 0, 19.6, -78, 11, 7.2, 14);
      add(geometry.panel, dark, 0, 22.6, -78, 11.4, 1.2, 14.4);
      // Barrels: dark against the light gunhouse, run out past the stem and
      // already at elevation, which is what tells the eye it is a gun and not
      // another deckhouse from the top-down view.
      add(geometry.panel, dark, -2.2, 21.4, -89, 0.9, 0.9, 18, 0.12);
      add(geometry.panel, dark, 2.2, 21.4, -89, 0.9, 0.9, 18, 0.12);
      // Breakwater chevron between the mount and the cell fields.
      add(geometry.panel, dark, 0, 13.8, -68, 18, 2.2, 2.4, -0.32);

      // --- Forecastle VLS: two cell grids ------------------------------------
      // The hatch lattice is the identity of this foredeck, so it is drawn as
      // actual cells rather than a painted rectangle: two fields of 4 x 5, each
      // hatch a dark plate in a light frame.
      //   field 1 centre z -58  ->  subsystems "vls-fore" { x 0, y 12, z -58 }
      //   field 2 centre z -38  ->  subsystems "vls-aft"  { x 0, y 12, z -38 }
      for (const fieldZ of [-58, -38]) {
        // The field sits on a raised plinth rather than flush in the deck, so
        // the grid still has a silhouette from a shallow attack angle instead
        // of flattening into deck paint the moment the camera drops.
        add(geometry.panel, house, 0, 13.4, fieldZ, 16.4, 3.0, 18.4);
        add(geometry.panel, dark, 0, 15.0, fieldZ, 16.8, 0.5, 18.8);
        for (let row = 0; row < 5; row += 1) {
          for (let col = 0; col < 4; col += 1) {
            const cx = -5.4 + col * 3.6;
            const cz = fieldZ - 6.4 + row * 3.2;
            // Hatch, then its raised light-grey coaming: the pair is what makes
            // the cells read as cells at range and not as a chequer pattern.
            add(geometry.panel, dark, cx, 15.4, cz, 3.0, 0.7, 2.6);
            add(geometry.panel, light, cx, 15.2, cz, 3.3, 0.5, 2.9);
          }
        }
      }

      // --- Superstructure: four-tier pyramid ---------------------------------
      // The identity mark, so the steps are large: each tier is ~9m tall, a
      // clear 4-5m narrower per side than the one under it, and shorter
      // fore-and-aft, giving four distinct silhouette steps between the weather
      // deck at y 12 and the bridge roof at y 50. The destroyer's block is one
      // slab 9.5m tall; this is a staircase four times that.
      // Tier 1's front face is at z -26, which is 12m clear astern of the aft
      // cell field's back edge (z -38 + 9.2). That clearance is not cosmetic:
      // with the block any further forward it overhangs the second grid and the
      // foredeck reads as ONE cell field from above, which is the destroyer's
      // layout and not this ship's.
      add(geometry.panel, house, 0, 19.0, 0, 26, 14, 52);     // tier 1: 12..26
      add(geometry.panel, house, 0, 31.0, -2, 19, 10, 38);    // tier 2: 26..36
      add(geometry.panel, house, 0, 40.0, -5, 13, 8, 25);     // tier 3: 36..44
      add(geometry.panel, house, 0, 47.0, -9, 9, 6, 16);      // tier 4: 44..50 bridge
      // Deck lips on every step - the overhang is what makes a step read as a
      // step rather than as a seam between two greys.
      add(geometry.panel, dark, 0, 26.3, 0, 26.8, 0.9, 52.8);
      add(geometry.panel, dark, 0, 36.3, -2, 19.8, 0.9, 38.8);
      add(geometry.panel, dark, 0, 44.3, -5, 13.8, 0.9, 25.8);
      add(geometry.panel, dark, 0, 50.3, -9, 9.8, 0.9, 16.8);
      // Bridge glazing, wrapped round the front face of the top tier.
      add(geometry.panel, dark, 0, 48.4, -16.6, 9.2, 2.6, 2.4);
      // Bridge wings out to the beam, port and starboard.
      add(geometry.panel, house, -6.4, 45.4, -14, 4, 1.2, 6);
      add(geometry.panel, house, 6.4, 45.4, -14, 4, 1.2, 6);

      // --- Phased-array panels -----------------------------------------------
      // Four big octagonal faces on the corners of tier 2. Two rotations, both
      // load-bearing: rx = PI/2 stands the plate up on edge (shipOctPlate is a
      // cylinder about +y, so without this it lies flat like a table top), then
      // ry swings the face off the fore-aft axis so it looks out over the
      // quarter instead of straight ahead. Without the ry the plate is edge-on
      // from the beam and disappears at the only angle a player attacks from.
      //
      // 7.6 across against the destroyer's 4.1 - nearly twice the array, which
      // is the whole reason a cruiser is the fleet's air-defence ship.
      //
      // rx = PI/2 then rz, exactly the destroyer's pair of rotations and NOT
      // rx + ry. The order matters: rx lays the plate's axis along +z so the
      // octagon FACE looks fore-and-aft, and rz then rolls the plate in its own
      // plane to cant the face outboard while keeping it face-on to anything
      // approaching from ahead or astern. Substituting ry swings the axis into
      // the xz plane instead, which turns the face away from the camera and
      // leaves the drum's rim showing - a pale crescent that reads as a scoop.
      //
      // sy is the plate's THICKNESS once it is on edge, and it is 0.55 - the
      // destroyer's number, not the 1.2-1.6 an "array is a big slab" instinct
      // reaches for. A thick octagon standing half in a wall shows the curve of
      // its rim rather than its face, and a lit rim beside a grey wall reads as
      // a crescent-shaped scoop from three of the four preview angles. Thin
      // enough and there is no rim to catch the light at all.
      //
      // x +/-10.2 puts the plate a metre proud of tier 2's 9.5m half-beam, so
      // the whole face is outside the wall instead of half-buried in it.
      add(geometry.shipOctPlate, light, -10.2, 31.4, -15, 7.6, 0.55, 7.6, Math.PI / 2, 0, Math.PI - 0.5);
      add(geometry.shipOctPlate, light, 10.2, 31.4, -15, 7.6, 0.55, 7.6, Math.PI / 2, 0, Math.PI + 0.5);
      add(geometry.shipOctPlate, light, -10.2, 31.4, 11, 7.6, 0.55, 7.6, Math.PI / 2, 0, 0.5);
      add(geometry.shipOctPlate, light, 10.2, 31.4, 11, 7.6, 0.55, 7.6, Math.PI / 2, 0, -0.5);
      // A canted plate is edge-on from somewhere by definition - from the beam
      // the octagons above are a pair of narrow leaves. The beam is also the
      // angle most attack runs come in on, so each side additionally carries a
      // flat broadside face let into the tier-2 wall: nothing about it can go
      // edge-on, so the ship always has a visible array from the direction it
      // is most often looked at. The octagons carry the outline from ahead and
      // astern; these carry it from abeam.
      for (const side of [-1, 1]) {
        // Dark surround INBOARD of the light face, not outboard - reversed, the
        // frame stands in front of the panel and hides what it is meant to edge.
        add(geometry.panel, dark, side * 9.5, 31.4, -2, 0.5, 8.0, 21.4);
        add(geometry.panel, light, side * 9.9, 31.4, -2, 0.5, 7.2, 20);
      }

      // --- Mast 1: heavy forward lattice tower --------------------------------
      // A real tower rather than a pole: four legs on a 9 x 9m footprint raking
      // inboard as they climb, three cross-brace bands up the height, a plate
      // array on top and a whip above that. Tops out at ~74m, half the beam of
      // the ship above the bridge, which is what makes the two-mast silhouette
      // read at a kilometre.
      for (const [lx, lz, tiltX, tiltZ] of [
        [-4.5, 0.5, 0, 0.115], [4.5, 0.5, 0, -0.115],
        [-4.5, 8.5, 0, 0.115], [4.5, 8.5, 0, -0.115]
      ]) {
        add(geometry.shipCylinder, dark, lx, 58, lz, 0.9, 22, 0.9, tiltX, 0, tiltZ);
      }
      for (const [braceY, braceW, braceD] of [[50, 10.5, 9.6], [58, 9, 9.6], [66, 7.5, 9.6]]) {
        add(geometry.panel, dark, 0, braceY, 0.5, braceW, 0.8, 0.8);
        add(geometry.panel, dark, 0, braceY, 8.5, braceW, 0.8, 0.8);
        add(geometry.panel, dark, -braceW / 2 + 0.3, braceY, 4.5, 0.8, 0.8, braceD);
        add(geometry.panel, dark, braceW / 2 - 0.3, braceY, 4.5, 0.8, 0.8, braceD);
      }
      // Yardarm across the tower at mid height - the cross that makes a tower
      // read as a mast rather than as a chimney from dead ahead.
      add(geometry.panel, dark, 0, 54, 4.5, 22, 0.7, 0.7);
      add(geometry.panel, house, 0, 69.5, 4.5, 7.6, 3.4, 8);
      add(geometry.shipOctPlate, light, 0, 73.2, 4.5, 4.6, 0.9, 4.6);
      add(geometry.shipCylinder, dark, 0, 78, 4.5, 0.4, 8, 0.4);

      // --- Funnels and the aft mast ------------------------------------------
      // Two uptakes in line abaft the bridge, each capped dark and each rising
      // clear of tier 1's roof at y 26, then the second mast: a plain pole with
      // a rotating-style search plate. It stands 40m aft of the tower and tops
      // out ~20m lower, so the pair reads as tower-forward / pole-aft side-on
      // instead of as two of the same thing.
      // Both funnels are raked aft (rx -0.16) and capped in dark, standing on
      // tier 1's roof so they clear it by 12m instead of merging into it. The
      // rake is what stops them reading as two more superstructure boxes.
      add(geometry.panel, house, 0, 33.0, 22, 13, 16, 13, -0.16);
      add(geometry.panel, dark, 0, 41.2, 20.6, 14, 1.4, 14, -0.16);
      add(geometry.panel, dark, 0, 41.6, 20.6, 9, 1.6, 9, -0.16);
      add(geometry.panel, house, 0, 31.0, 42, 11.5, 13, 11, -0.16);
      add(geometry.panel, dark, 0, 37.6, 40.9, 12.5, 1.4, 12, -0.16);
      add(geometry.panel, dark, 0, 38.0, 40.9, 8, 1.6, 7.6, -0.16);
      // Aft mast: a pole with a search plate, 50m astern of the tower and 20m
      // shorter, so the pair reads as tower-forward / pole-aft side-on rather
      // than as two of the same thing.
      add(geometry.shipCylinder, dark, 0, 40, 55, 1.0, 20, 1.0);
      add(geometry.panel, dark, 0, 46, 55, 14, 0.7, 0.7);
      add(geometry.panel, light, 0, 52.2, 55, 11, 3.6, 0.8, 0, 0, 0.2);
      add(geometry.shipCylinder, dark, 0, 56, 55, 0.4, 7, 0.4);

      // --- Beam gun mounts ---------------------------------------------------
      // Port/starboard tubs on tier 1's roof (y 26), out at the shoulder where
      // they clear tier 2, barrels trained forward at elevation.
      //   -> subsystems "aa-port"/"aa-stbd" { x -/+12.5, y 30, z -16 }
      for (const side of [-1, 1]) {
        add(geometry.shipCylinder, light, side * 12.5, 28.4, -16, 2.8, 3.2, 2.8);
        // Barrel at a shallow 12 deg rather than the 20 the other hulls use:
        // this mount stands 26m up on the block, and a steep barrel that high
        // reads as a flagpole instead of a gun from the beam.
        add(geometry.panel, dark, side * 12.5, 30.6, -21.5, 0.7, 0.7, 9, -0.21);
      }

      // --- CIWS: four drums on beam sponsons ---------------------------------
      // Two per side, clear of the superstructure on their own sponsons out at
      // the deck edge. Each is a sponson shelf, a pedestal, a drum and the
      // radome dot on top - the same idiom the destroyer's single drum uses,
      // so four of them read as "four of those" and not as a new part.
      //   forward pair z +42  -> subsystems "ciws-port"/"ciws-stbd"
      //                          { x -/+15.5, y 19, z 42 }
      //   aft pair     z +70  -> drawn only; not lockable (see subsystems note)
      for (const side of [-1, 1]) {
        for (const dz of [42, 70]) {
          add(geometry.panel, dark, side * 15.5, 14.4, dz, 7, 4.5, 13);
          add(geometry.shipCylinder, light, side * 15.5, 18.6, dz, 2.4, 3.0, 2.4);
          add(geometry.enemyHitbox, light, side * 15.5, 21.4, dz, 0.2, 0.2, 0.2);
        }
      }

      // --- Stern: hangar and helo deck ---------------------------------------
      // Hangar block with its door face, then the flight deck aft of it with
      // the painted landing circle - the last 45m of the ship, and the only
      // part of the weather deck that is flat and empty.
      add(geometry.panel, house, 0, 21.0, 64, 19, 17, 24);
      add(geometry.panel, dark, 0, 29.6, 64, 19.6, 1.2, 24.6);
      add(geometry.panel, dark, 0, 18.0, 75.4, 12, 10, 1.8);
      add(geometry.panel, deck, 0, 12.8, 92, 22, 1.2, 36);
      add(geometry.shockRing, markings, 0, 13.5, 94, 9, 9, 1, -Math.PI / 2);
      // Deck-edge safety netting down both sides of the flight deck.
      add(geometry.panel, dark, -11.2, 12.4, 92, 0.7, 1.0, 34);
      add(geometry.panel, dark, 11.2, 12.4, 92, 0.7, 1.0, 34);
    }
  });
}
