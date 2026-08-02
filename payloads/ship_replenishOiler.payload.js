// REPLENISHMENT OILER - a 200m fleet tanker whose identity is the rig amidships.
//
// The hull that keeps the blockade group at sea (spec_model_batch3 W2 #10). It
// is not a warship and it is not a freighter, and the silhouette has to say
// which of the two it is NOT at every range. Three shapes carry that, and they
// are the three the spec names:
//
//   * THE REPLENISHMENT GANTRY IS THE SHIP. Three kingpost towers standing on
//     the centreline amidships (z -46 / 0 / +40), each one a portal of two legs
//     with a crosshead on top, and each one throwing a HORIZONTAL hose arm out
//     over BOTH beams - six arms in all, reaching to x +/-30 on a 26m hull, so
//     the rig spans 60m across a ship 26m wide and is WIDER THAN THE SHIP BY
//     MORE THAN DOUBLE. Nothing else afloat in this game
//     puts hardware outboard of its own hull sides, so the plan view reads as a
//     ladder even at thumbnail size. The towers top out at y 51 against a 200m
//     length: tall enough to beat the aft bridge (y 44) and be the landmark.
//   * A DECK FULL OF TANKS. Nine cylindrical fuel tanks standing on the weather
//     deck in three groups, laid out down the run between and around the
//     towers. Round is the whole point - every other deck cargo in the game is
//     a box (the freighter's containers, the LST's vehicles, the arsenal's cell
//     fields), so a row of drums is unmistakably "this ship carries liquid".
//   * THE BRIDGE IS AFT. One block at z +72 with the funnel behind it at +88,
//     which leaves 150m of clear rig deck ahead of it. That is the tanker
//     layout and the opposite of the Aegis' one big forward house; it is also
//     what stops this hull reading as the cargo ship, whose aft tower is
//     TALLER than anything else it carries while this one is deliberately
//     shorter than its own gantry.
//
// Scale (bow at -Z, y up from the waterline). Measured off the hulls this game
// already draws rather than picked: the Aegis' slab runs 128m for a 155m LOA
// ship and the cargo ship's runs 174m for 200m, i.e. the parallel body is
// ~0.85 of length with the bow wedge making up the rest. So 200m LOA here =
// a 170m slab (z -85..+85) plus a 22m raked stem out to z -100, and the
// stern transom closing at +100. Beam 26m gives L/B 7.7 - finer than the
// freighter's 6.25 box and fuller than the Aegis' 8.2 blade, which is what a
// fast fleet auxiliary is. Freeboard 11m: between the LST's 10 and the
// freighter's 13, because a loaded tanker sits low but still has to carry a
// gantry deck.
export default function register(ctx) {
  const { SHIP_TYPES } = ctx.tables;

  // The cargo ship is the template, not the Aegis: this is an unarmed auxiliary
  // of almost exactly its size (200m LOA both), and it has already done the
  // work of neutering the landing-ship flag and the gun block that the frigate
  // and the Aegis carry live. Everything inherited through the spread is a
  // placeholder - see the BALANCE TODO below.
  const cargo = SHIP_TYPES.cargoShip;
  if (!cargo) {
    throw new Error("[ship-replenishOiler] SHIP_TYPES.cargoShip is the template and is missing");
  }

  ctx.addShipType("replenishOiler", {
    ...cargo,
    key: "replenishOiler",
    surface: true,
    // `landing` is already false on the cargo template, but it is restated
    // here rather than inherited silently: a hull that steers itself at the
    // nearest beach is a behaviour, not a paint job, and the one line that
    // turns it on is worth being explicit about on every auxiliary that copies
    // from another auxiliary.
    landing: false,
    label: "OILER",
    role: "Replenishment Oiler",

    // ---- Dimensions: 200m LOA, 26m beam -----------------------------------
    // Same length as the cargo ship, so hitRadius/halflen/offsets are its
    // numbers; beam is 6m finer, so the x extents come in with it. `top` is
    // measured off the tallest SOLID mass a crashing aircraft can be stopped
    // by - the gantry crossheads at y 46 - and not off the mast whip above the
    // bridge, which an aeroplane goes through rather than into.
    hitRadius: 92,
    crash: Object.freeze({ halfLen: 100, halfBeam: 14, top: 46 }),
    // x 62 is NOT the beam: the hose arms reach x +/-30 and the lock box has to
    // contain the hardware the player can see. y 56 is waterline to masthead,
    // z 200 the full LOA.
    hitBox: Object.freeze({ x: 62, y: 56, z: 200 }),
    sternOffset: 96,
    bowOffset: 98,
    blastSpread: 40,
    smokeOffset: 74,   // the funnel is aft at z +88, so the burning is too
    smokeHeight: 22,

    // BALANCE TODO: placeholder. hp / cruiseSpeed / turnRate / sinkDepth /
    // radarColor / tracerColor / explosionColor are the cargo ship's, inherited
    // verbatim by the spread above and NOT tuned for this hull. A tanker full
    // of fuel should plausibly be the most spectacular thing in the group to
    // kill and the slowest to turn, but none of that is decided here - this
    // file ships the shape.
    // BALANCE TODO: placeholder. The disarm below is the cargo ship's exact
    // structural disarm, inherited and restated: aaMounts empty, aa.tracers 0
    // and aa.range 0 rather than deleted keys, because registryAdd derives its
    // required-key set from the intersection of every SHIP_TYPES entry (all of
    // which carry aaMounts / aaHeight / aa) and updateShip dereferences
    // spec.aa.cooldownMin unconditionally every frame. `aa: undefined` is a
    // crash, not a disarm. Whether a fleet oiler should carry a self-defence
    // CIWS at all is a balance question and is not answered here.
    aaMounts: Object.freeze([]),
    aaHeight: 0,
    aa: Object.freeze({ range: 0, cooldownMin: 9999, cooldownSpread: 0, damage: 0, maxHitChance: 0, tracers: 0 }),
    // No subsystems, the cargo ship's choice for the same reason: there is no
    // gun, no VLS and no CIWS on the model, so there is no hardware to lock,
    // and an empty-but-present array would still put the hull into the NEXT
    // walk as a parent with nothing under it. Absent = the pre-M9 path, which
    // is the right one for a civilian-pattern target.
    subsystems: undefined,
    // Auxiliary grey-green on the radar rather than the freighter's warm white
    // or the fleet's amber, so an oiler is separable from both at a glance.
    radarColor: "#cfe0cd"
  });

  ctx.addShipModel("replenishOiler", {
    build(env) {
      const { geometry, add, friendly, makeAircraftMaterial,
              hull, deck, house, dark, light, olive2, markings,
              extraMaterials } = env;

      // Sera grey is the brief, and the five themed materials supply all of it
      // (hull grey / deck grey / house grey / shadow / white). One extra paint
      // is made here and one only: the hazard band every fuel deck in the world
      // wears, used on the tank tops and the hose-arm ends so the RAS gear
      // reads as gear rather than as more grey pipework. It goes into
      // extraMaterials or it leaks with every hull that sinks.
      const hazard = makeAircraftMaterial(friendly ? 0xb8862f : 0xc9922f, 0.18, 0.8);
      extraMaterials.push(hazard);

      // =====================================================================
      // 1. Hull - 200m x 26m, moderate freeboard
      // =====================================================================
      // Parallel body z -85..+85 (170m), which is the 0.85-of-length proportion
      // the Aegis and the cargo ship both draw. Deck edge at y 11.
      add(geometry.panel, hull, 0, 5.5, 0, 26, 11, 170);
      // Boot topping at the waterline - the same dark stripe every hull here
      // wears at its own scale, kept thin so the side does not read as twice
      // as deep as it is.
      add(geometry.panel, dark, 0, 0.8, 0, 26.6, 1.7, 171);
      // Forward section, narrowing into the stem.
      add(geometry.panel, hull, 0, 5.5, -91, 18, 11, 14);
      // Raked merchant stem: a shallow wedge, not a combatant's knife.
      // geometry.shipBow is a four-sided cone whose sx is a RADIUS, so a hull
      // 18 wide at the shoulder wants sx 9 to meet it flush - the Aegis'
      // calibration (19-wide hull, sx 9.5) at this beam.
      add(geometry.shipBow, hull, 0, 5.5, -99, 9, 8, 11, -Math.PI / 2);
      // Bulbous forefoot - the merchant tell the cargo ship also carries, and
      // the only round thing on the hull proper.
      add(geometry.shipCylinder, dark, 0, 1.8, -101, 2.4, 7, 2.4, 0, 0, Math.PI / 2);
      // Squared transom.
      add(geometry.panel, hull, 0, 5.5, 92, 23, 11, 16);
      add(geometry.panel, dark, 0, 5.5, 99.4, 20, 9, 1.2);
      // Sheer strake: one light band along the deck edge running the whole
      // parallel body. It is what separates the hull side from the tank deck
      // above it in the side elevation, where the two are otherwise one slab.
      add(geometry.panel, light, -13.2, 10.4, 0, 0.7, 1.1, 168);
      add(geometry.panel, light, 13.2, 10.4, 0, 0.7, 1.1, 168);

      // =====================================================================
      // 2. Weather deck and the fore/aft ends
      // =====================================================================
      const DECK_Y = 11.6;
      add(geometry.panel, deck, 0, DECK_Y - 0.5, -2, 25, 1.2, 180);
      // Forecastle: raised bow deck with mooring winches and a plain pole mast.
      // Deliberately low and plain - everything the eye should be spending on
      // this ship is spent amidships.
      add(geometry.panel, deck, 0, 13.4, -88, 17, 2.6, 20);
      add(geometry.shipCylinder, dark, -4.4, 15.8, -92, 1.3, 1.3, 1.3);
      add(geometry.shipCylinder, dark, 4.4, 15.8, -92, 1.3, 1.3, 1.3);
      add(geometry.shipCylinder, light, 0, 20, -83, 0.45, 9, 0.45);
      // Breakwater across the deck abaft the forecastle: a low angled plate,
      // the one thing forward of the rig allowed to stand on the tank deck.
      add(geometry.panel, house, 0, 13.2, -76, 20, 1.8, 3, 0.34);

      // =====================================================================
      // 3. THE FUEL TANK DECK - identity 2
      // =====================================================================
      // Nine cylindrical deck tanks in three groups. Round on a deck of boxes
      // is the read: the cargo ship's stack, the LST's vehicles and the
      // arsenal's cell fields are all rectangular masses, so a row of drums
      // cannot be confused with any of them from above or from the side.
      //
      // Group centres are chosen against the GANTRY table below, not
      // separately: the towers stand at z -46 / 0 / +40 and each group of
      // tanks fills the run BETWEEN two towers, so the profile alternates
      // tower - tanks - tower - tanks - tower down the whole 150m rig deck and
      // neither element ever sits inside the other.
      //   tanks -66 -> -54   forward group, ahead of tower 1
      //   tanks -32 -> -10   between towers 1 and 2
      //   tanks  14 ->  30   between towers 2 and 3
      // Pairs athwartships at x +/-6.6 where there is beam for it, singles on
      // the centreline where the gantry legs (x +/-5.4) would foul a pair.
      // 8.8m diameter standing 10m proud of an 11.6m deck. Sized off the
      // gantry, not off the hull: a drum shorter than the winch houses at the
      // foot of the towers disappeared under them in the side elevation, which
      // is what the first render showed. At 10m the tank tops sit above the
      // lower cross-brace of every portal and the row is legible from the beam.
      const TANK_R = 4.4;
      const TANK_H = 10;
      const tank = (x, z, r = TANK_R, h = TANK_H) => {
        // Body, then the hazard-painted crown and a small dark vent stack, so
        // each drum reads as a pressure vessel and not as a bollard.
        add(geometry.shipCylinder, house, x, DECK_Y + h / 2, z, r, h, r);
        add(geometry.shipCylinder, hazard, x, DECK_Y + h + 0.35, z, r + 0.25, 0.7, r + 0.25);
        add(geometry.shipCylinder, dark, x, DECK_Y + h + 2.2, z, 0.42, 3, 0.42);
        // Girth band at mid height: one dark ring that stops the cylinder
        // reading as a flat grey lozenge in the top-down view.
        add(geometry.shipCylinder, dark, x, DECK_Y + h * 0.45, z, r + 0.15, 0.5, r + 0.15);
      };
      // Forward group: a pair and a centreline drum, all clear of tower 1.
      tank(-6.6, -66);
      tank(6.6, -66);
      tank(0, -54, 4.2, 8.2);
      // Midships group, the biggest run of open deck on the ship.
      tank(-6.6, -30);
      tank(6.6, -30);
      tank(-6.6, -14);
      tank(6.6, -14);
      // After group, between towers 2 and 3.
      tank(0, 16, 4.2, 8.2);
      tank(0, 30, 4.2, 8.2);
      // Pipe gallery: the trunk main running the length of the tank deck on
      // both sides, feeding every tank and every tower. Two thin dark runs at
      // deck level - cheap, and it is what ties the drums together into a
      // system rather than nine separate objects standing on a plate.
      add(geometry.panel, dark, -10.4, DECK_Y + 1.4, -20, 1.1, 1.1, 132);
      add(geometry.panel, dark, 10.4, DECK_Y + 1.4, -20, 1.1, 1.1, 132);
      // Athwartships cross-connects at each tower station, so the trunk mains
      // visibly serve the rig.
      for (const z of [-46, 0, 40]) {
        add(geometry.panel, dark, 0, DECK_Y + 1.4, z, 21, 1.0, 1.0);
      }

      // =====================================================================
      // 4. THE REPLENISHMENT GANTRY - identity 1, and the whole silhouette
      // =====================================================================
      // Three kingpost towers, each a PORTAL: two legs at x +/-5.4 rising off
      // the deck to a crosshead, braced, with a horizontal hose arm cantilevered
      // out over each beam from the crosshead height.
      //
      // The arms are the point. ARM_REACH 24 against a 13m half-beam means the
      // arm head hangs 11m OUTBOARD of the ship's own side - which is what a
      // rig alongside a receiving ship actually does, and which no other hull
      // in this game does at all. In the top-down pane the six arms make a
      // ladder across the plan; in the side elevation the three crossheads make
      // the highest line on the ship. Both reads are deliberate and both are
      // the reason the numbers below are not smaller.
      //
      // Heights are chosen against the aft bridge, not picked: the bridge block
      // tops out at y 40 and its wheelhouse roof at 43.4, so a crosshead at
      // y 44 with a topmast to 50 keeps the rig as the tallest thing on the
      // ship by a clear margin. Getting that ordering backwards would make this
      // hull read as the cargo ship, whose aft tower IS the tallest mass.
      const LEG_X = 6.2;
      const HEAD_Y = 44;              // crosshead centreline
      const ARM_Y = 38;               // hose arms hang one level below the head
      const ARM_REACH = 30;           // arm head x, against a 13m half-beam
      const kingpost = (z, armSweep) => {
        const legH = HEAD_Y - DECK_Y;
        const legY = DECK_Y + legH / 2;
        // Two legs, raked very slightly inboard so the portal tapers the way a
        // real kingpost does instead of reading as two parallel sticks. 3.4m
        // square section, not the 2.4 of the first pass: at the range the
        // contact sheet frames a 200m hull, a 2.4m column is under two pixels
        // and the three towers rendered as three whiskers.
        add(geometry.panel, house, -LEG_X, legY, z, 3.4, legH, 4.6, 0, 0, -0.03);
        add(geometry.panel, house, LEG_X, legY, z, 3.4, legH, 4.6, 0, 0, 0.03);
        // Fore-and-aft raking struts, one pair per leg. These do no work in the
        // plan view - they exist entirely for the SIDE elevation, which is the
        // one pane where the hose arms are edge-on and therefore contribute
        // nothing. Without them the first two passes drew three bare poles in
        // profile and the rig, which is the identity, was invisible from the
        // beam. Splayed +/-0.34 rad in Z so each tower reads as a tripod.
        for (const dz of [-1, 1]) {
          add(geometry.panel, house, -LEG_X, DECK_Y + legH * 0.46, z + dz * 5.6,
              2.2, legH * 0.94, 2.2, dz * 0.34);
          add(geometry.panel, house, LEG_X, DECK_Y + legH * 0.46, z + dz * 5.6,
              2.2, legH * 0.94, 2.2, dz * 0.34);
        }
        // Cross-bracing: two bands low and high, plus a diagonal each side, so
        // the portal reads as structure rather than as a gate.
        add(geometry.panel, dark, 0, DECK_Y + legH * 0.34, z, 2 * LEG_X, 1.6, 1.8);
        add(geometry.panel, dark, 0, DECK_Y + legH * 0.68, z, 2 * LEG_X, 1.6, 1.8);
        add(geometry.panel, dark, 0, DECK_Y + legH * 0.51, z, 2 * LEG_X + 1.8, 1.1, 1.1, 0, 0, 0.55);
        add(geometry.panel, dark, 0, DECK_Y + legH * 0.51, z, 2 * LEG_X + 1.8, 1.1, 1.1, 0, 0, -0.55);
        // Crosshead: the beam across the top of the portal, and the block on
        // it that the hose arms pivot from.
        // Deep in Z (9m) as well as wide, so the crosshead is a slab in the
        // side elevation rather than a line: from the beam this is the piece
        // that says a tower is a structure.
        add(geometry.panel, house, 0, HEAD_Y, z, 2 * LEG_X + 5.4, 3.4, 9);
        add(geometry.panel, dark, 0, HEAD_Y + 2.3, z, 2 * LEG_X + 6, 1.1, 9.8);
        // Topmast above the crosshead with a small nav plate, so the tower has
        // a point rather than a flat lid.
        add(geometry.shipCylinder, light, 0, HEAD_Y + 4.4, z, 0.42, 7, 0.42);
        add(geometry.shipOctPlate, light, 0, HEAD_Y + 7.4, z, 1.3, 0.32, 1.3);

        // The hose arms. One per beam, drawn as a horizontal box whose long
        // axis is X, positioned so its INBOARD end sits on the crosshead
        // (x +/-3) and its head reaches ARM_REACH. Centre is therefore the
        // midpoint of that span, and the length is the difference - written as
        // arithmetic rather than as two magic numbers so the arm cannot drift
        // off the tower it hangs from, which is the failure the cargo ship's
        // crane comment documents for its jib.
        //
        // `armSweep` rotates the pair about Y by a few degrees, alternating
        // tower to tower. That is what keeps the three stations from reading as
        // one extruded shape in the top-down pane: real rigs train their arms
        // fore and aft of the beam, and a couple of degrees of difference is
        // enough for the eye to count three separate towers.
        const ROOT_X = 3.0;
        const armLen = ARM_REACH - ROOT_X;
        const armCx = (ARM_REACH + ROOT_X) / 2;
        for (const side of [-1, 1]) {
          // Arm proper: a lattice boom, drawn as a box with a thinner dark top
          // chord over it (the cargo ship's trick, and for the same reason - a
          // single stick reads as a pipe, two read as a truss).
          //
          // 2.8m section, not the 1.5 of the first pass. A 27m arm at 1.5m
          // section is a hairline in every pane of the contact sheet: the first
          // render put six of them on the ship and the top-down view showed
          // four faint scratches. The arm is the identity, so it is drawn at
          // the size the identity needs, which is roughly the section of a
          // kingpost leg rather than of a handrail.
          const arm = add(geometry.panel, light, side * armCx, ARM_Y, z, armLen, 2.8, 2.8);
          arm.rotation.order = "YXZ";
          arm.rotation.set(0, side * armSweep, 0);
          const chord = add(geometry.panel, dark, side * armCx, ARM_Y + 2.2, z, armLen - 3, 1.1, 1.1);
          chord.rotation.order = "YXZ";
          chord.rotation.set(0, side * armSweep, 0);
          // Kingpost stay: the diagonal from the crosshead down to the arm,
          // which is what makes a cantilever 27m long look held up.
          const stay = add(geometry.panel, dark,
                           side * (ROOT_X + armLen * 0.32), (ARM_Y + HEAD_Y + 2.3) / 2, z,
                           armLen * 0.72, 0.9, 0.9, 0, 0, side * 0.30);
          stay.rotation.order = "YXZ";
          stay.rotation.set(0, side * armSweep, -side * 0.30);
          // Arm head: the hazard-painted receiving trolley at the outboard end,
          // with the hose bight hanging plumb below it. This is the piece that
          // says "fuel is passed HERE" and it is the only colour on the rig -
          // six orange blocks standing 11m off the ship's own sides, which is
          // the mark that survives at thumbnail size.
          const head = add(geometry.panel, hazard, side * (ARM_REACH - 2.2), ARM_Y, z, 5.4, 4.2, 5);
          head.rotation.order = "YXZ";
          head.rotation.set(0, side * armSweep, 0);
          const hose = add(geometry.shipCylinder, dark,
                           side * (ARM_REACH - 2.2), ARM_Y - 4.6, z, 0.9, 6.6, 0.9);
          hose.rotation.order = "YXZ";
          hose.rotation.set(0, side * armSweep, 0);
        }
        // Winch house at the foot of the portal, between the legs - the mass
        // that stops the tower looking like it is standing on nothing. Kept
        // LOW (4m, topping out at y 15.6) and narrower than the tank drums are
        // tall: at the 5.2m of the previous pass it stood level with the tank
        // crowns and the two masses merged into one grey band along the deck,
        // which cost the tank row its separate read from the beam.
        add(geometry.panel, house, 0, DECK_Y + 2, z, 2 * LEG_X + 1.6, 4, 7);
        add(geometry.panel, dark, 0, DECK_Y + 4.3, z, 2 * LEG_X + 2.2, 0.9, 7.4);
      };
      // Three stations at z -46 / 0 / +40, sweeps alternating so the towers are
      // countable from above. The z values are the ones the tank groups and the
      // cross-connects above are written against.
      // Sweeps are LARGE (0.2-0.3 rad, 11-17 degrees), not the 0.1 of the first
      // passes. Two things buy that: the towers become countable from above,
      // and - the reason it matters - a swept arm projects 5-8m in Z, so in the
      // SIDE elevation the arm heads stand clear of their own towers instead of
      // hiding behind them. Alternating the sign fans the rig fore and aft the
      // way a real ship trains its stations to serve two receivers at once.
      kingpost(-46, 0.26);
      kingpost(0, -0.22);
      kingpost(40, 0.30);

      // Deck striping under the rig: one painted transfer lane down each side
      // of the tank deck, marking where the hoses land. It also draws the
      // 150m length of the rig deck as one continuous run in the top-down pane.
      add(geometry.shipDeck, markings, -9.2, DECK_Y + 0.2, -3, 2.2, 150, 1, -Math.PI / 2);
      add(geometry.shipDeck, markings, 9.2, DECK_Y + 0.2, -3, 2.2, 150, 1, -Math.PI / 2);

      // =====================================================================
      // 5. Aft superstructure - identity 3
      // =====================================================================
      // One block at z +72, five decks, DELIBERATELY shorter than the gantry:
      // house roof at y 40 against the crossheads' 44 and the topmasts' 51.
      // The cargo ship makes the opposite choice on purpose (its accommodation
      // block tops its own cargo), and that inversion is what tells the two
      // 200m auxiliaries apart in profile.
      add(geometry.panel, house, 0, 25.8, 72, 15, 28.4, 20);
      // Deck banding: five thin dark lines = five accommodation levels. Cheap,
      // and it is what sells "tower" rather than "grey slab" at range.
      for (let d = 0; d < 5; d += 1) {
        add(geometry.panel, dark, 0, 15.4 + d * 5.2, 72, 15.4, 0.5, 20.4);
      }
      // Wheelhouse: wider than the block below and overhanging both sides, with
      // a dark glazed strip across its front face. The overhang is what makes
      // the stern legible from directly above.
      add(geometry.panel, house, 0, 42, 69, 21, 4.4, 12);
      add(geometry.panel, dark, 0, 42.4, 62.8, 20, 2.8, 1.2);
      add(geometry.panel, dark, 0, 44.5, 69, 21.6, 0.9, 12.6);
      // Bridge-wing consoles on the outboard tips.
      add(geometry.panel, light, -10.3, 42, 69, 1.5, 1.7, 4.6);
      add(geometry.panel, light, 10.3, 42, 69, 1.5, 1.7, 4.6);
      // Mast above the wheelhouse: pole, nav plate, yard. Kept to y 55 so it is
      // the only thing on the ship above the rig, and it is a whip - an
      // aeroplane goes through it, which is why `crash.top` is measured off the
      // crossheads instead.
      add(geometry.shipCylinder, dark, 0, 50, 72, 0.55, 10, 0.55);
      add(geometry.shipOctPlate, light, 0, 52.4, 72, 1.4, 0.34, 1.4);
      add(geometry.panel, light, 0, 55, 72, 5.4, 0.4, 0.4);
      // Funnel abaft the block with the dark cap band every line paints on and
      // twin uptakes standing out of it.
      add(geometry.panel, house, 0, 27, 88, 9, 20, 10);
      add(geometry.panel, dark, 0, 36.4, 88, 9.6, 2.4, 10.6);
      add(geometry.shipCylinder, dark, -2.2, 38.8, 88, 1.3, 2.4, 1.3);
      add(geometry.shipCylinder, dark, 2.2, 38.8, 88, 1.3, 2.4, 1.3);
      // Poop deck aft of the funnel: mooring gear and two lashed stores pallets
      // in the vehicle olive, so the stern is not a blank plate.
      add(geometry.panel, deck, 0, 11.8, 96, 21, 1.4, 12);
      add(geometry.panel, olive2, -5.4, 13.8, 96, 4.6, 2.8, 8);
      add(geometry.panel, olive2, 5.4, 13.8, 96, 4.6, 2.8, 8);
      add(geometry.shipCylinder, dark, 0, 13.2, 100, 1.1, 1.3, 1.1);

      // =====================================================================
      // 6. Hull markings
      // =====================================================================
      // Draft marks and the load line disc - the civilian tells the cargo ship
      // also carries, at this hull's own scale.
      add(geometry.shockRing, markings, -13.2, 5.6, -12, 2.4, 2.4, 1, 0, -Math.PI / 2, 0);
      add(geometry.shockRing, markings, 13.2, 5.6, -12, 2.4, 2.4, 1, 0, Math.PI / 2, 0);
      add(geometry.panel, markings, -13.2, 5.6, -12, 0.35, 0.45, 11);
      add(geometry.panel, markings, 13.2, 5.6, -12, 0.35, 0.45, 11);
    }
  });
}
