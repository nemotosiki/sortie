export default function register(ctx) {
  const { GROUND_TYPES } = ctx.tables;

  // adTank is the template, not samSite: this unit DRIVES (tracked chassis),
  // it carries a rotating sensor of its own and it shoots back, so the spread
  // has to bring across `mobile`, `dishSpin` and the `aaMounts`/`aaHeight`
  // pair the tracer origin is measured from. samSite is a static emplacement
  // and would drop all three.
  const adTank = GROUND_TYPES.adTank;
  if (!adTank) throw new Error("[ground-autonomousSam] expected GROUND_TYPES.adTank as the template");

  // ===========================================================================
  // 1. GROUND_TYPES entry
  // ===========================================================================
  //
  // BALANCE TODO: placeholder. Every combat number below - hp, the whole `aa`
  // block, `mobile`, aaMounts/aaHeight, dishSpin - is the AD TANK's, carried
  // across unexamined through the spread and restated only where the call site
  // should show it. Nothing about an UNMANNED battery has been costed: a SAM
  // whose authorisation has lapsed engages without a human in the loop, which
  // is a different threat model from a crewed autocannon (it never hesitates,
  // it also never checks), and expressing that is a balance pass' deliverable,
  // not this file's. What IS authored here are the dimensions: hitRadius, the
  // crash box and the hitbox are measured off the geometry below and are
  // correct for a 9 m tracked vehicle.
  ctx.addGroundType("autonomousSam", {
    ...adTank,
    key: "autonomousSam",
    label: "ROGUE SAM",
    role: "Lapsed-Authorisation Autonomous SAM",

    // --- Dimensions: authored for this hull, 9 m overall --------------------
    // The model runs z -4.5..+4.5 over a 3.5 m track gauge; the canister pack
    // stands to y 6.0 at its raised aft end and the sensor head tops out near
    // y 4.6. Everything here is geometry-derived so the lock box and the crash
    // volume match what is actually drawn.
    hitRadius: 14,
    // `top` is the collision ceiling, so it is taken off the canister pack
    // (the tallest piece of structure), the same way the AD TANK takes its 4
    // off the turret. Flying through the sensor mast is intended; flying
    // through the launcher is not.
    crash: Object.freeze({ halfLen: 4.7, halfBeam: 2.1, top: 6.0 }),
    hitBox: Object.freeze({ x: 6, y: 7, z: 10 }),
    // A launcher full of live rounds on a derelict chassis: it burns tall and
    // dirty when it goes, taller than the AD TANK's ammunition.
    smokeHeight: 5.5,

    // BALANCE TODO: placeholder - inherited from adTank, restated so the
    // values are visible at the call site instead of implied by the spread.
    hp: adTank.hp,                 // 90 (one missile)
    aa: adTank.aa,                 // range 600 / damage 7 / maxHitChance 0.15
    aaMounts: adTank.aaMounts,
    // The launch rails' mouths sit at y 4.4 on this model rather than the AD
    // TANK's 4.6 gun line, so anything leaving the unit leaves the canisters
    // rather than the empty air beside them. A dimension, not a balance number.
    aaHeight: 4.4,
    // BALANCE TODO: placeholder. Faster than the AD TANK's 1.4 tracker sweep
    // because the head hunting on its own with nobody cueing it is THE tell
    // that this battery is running unattended - a nervous, ceaseless sweep.
    dishSpin: 2.0,
    // BALANCE TODO: placeholder - the AD TANK's tracked speed and turn rate,
    // unchanged. Same class of chassis, so the same numbers until costed.
    mobile: adTank.mobile,

    // Unaffiliated: the blip is the same warning red as the beacons on the
    // model, so what shows on the radar and what shows on the hull agree. It
    // is deliberately not either faction's colour - nobody owns this thing.
    radarColor: "#ff4436",
    tracerColor: adTank.tracerColor,
    explosionColor: adTank.explosionColor
  });

  // ===========================================================================
  // 2. Geometry
  // ===========================================================================
  ctx.addGroundModel("autonomousSam", {
    build(env) {
      const { THREE, geometry, makeAircraftMaterial,
              steel, olive, dark, light, extraMaterials, add, addRoot } = env;

      // --- Scale derivation --------------------------------------------------
      // 9 m hull length, taken to the same measured-metres convention every
      // other ground payload uses (TEL: 19 m chassis drawn z -9.5..+9.5; LASER
      // AAV: 12 m drawn z -6..+6). So this one is drawn z -4.5..+4.5 and every
      // number below is a real metre. Cross-checked against the inline tracked
      // chassis in createGroundModel (`kind === "tank"`), which is 12.4 m of
      // track run at a 3.4 m half-gauge with its hull deck at y 1.9: this
      // vehicle is drawn to 9/12.4 = 0.73 of that length with the track tops
      // and deck heights held at the tank's, because a shorter tracked vehicle
      // is shorter, not smaller - road wheels stay road-wheel sized. That is
      // what keeps it reading as the same army's running gear parked next to
      // an MBT rather than as a scale model of one.
      //
      // --- Shape identity (three marks; anything not serving one is cut) -----
      //   1. TRACKED chassis carrying FOUR canted missile canisters. The tracks
      //      are the first separation from every other SAM in the game - the
      //      TEL and the LASER AAV are both wheeled - and the four-tube pack
      //      standing up at the back is the silhouette.
      //   2. A SENSOR HEAD that turns: an optical block on a turntable, on its
      //      own mast, and it is the returned `dish` so it never stops sweeping.
      //   3. RED WARNING BEACONS. Nothing else on this model is red. An
      //      unmanned battery with a lapsed key is supposed to be flashing a
      //      warning nobody is left to read, and that is the whole mood of the
      //      unit in one colour.
      //
      // --- Palette -----------------------------------------------------------
      // Unaffiliated / rusted grey. The themed `olive` is the army green every
      // other ground unit is painted in, so using it here would put this thing
      // back in somebody's order of battle. Instead the hull is a bespoke
      // brown-grey with the roughness pushed to 0.95 and metalness to near
      // zero - a surface that has been outdoors for years - and `steel` is
      // reserved for the few pieces that are still bare metal.
      const rust = makeAircraftMaterial(0x6b5a4c, 0.06, 0.95);
      extraMaterials.push(rust);
      // Streaked, redder oxide for the panels that have gone furthest: the
      // track skirts, the canister cradle, the corrosion patches. Two browns
      // one step apart is what reads as "weathered" rather than as "painted
      // brown", which a single flat tone always does.
      const oxide = makeAircraftMaterial(0x7d4a33, 0.05, 0.98);
      extraMaterials.push(oxide);
      // THE WARNING LIGHT. Unlit and additive so it stays hot against the
      // brown at every one of the preview's four light angles and reads as
      // something LIT rather than as a red dot painted on the hull. Pushed
      // into `extraMaterials` or it leaks with every unit destroyed.
      const beacon = new THREE.MeshBasicMaterial({
        color: 0xff3a24,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      extraMaterials.push(beacon);
      // The housing each beacon sits in - a dark red-tinted collar, so the lit
      // lens has a rim to sit against instead of floating on a brown face.
      const beaconBase = makeAircraftMaterial(0x50170f, 0.3, 0.55);
      extraMaterials.push(beaconBase);

      // Built nose-along -Z, which is the forward the route heading drives -
      // the same convention the tank, the TEL and the LASER AAV all use.

      // --- Running gear: TRACKS ------------------------------------------------
      // Two track runs the full 9 m, drawn the way the inline tank draws them
      // (a dark side box with a lighter road-wheel band under it) but with the
      // road wheels themselves broken out as six discrete cylinders a side plus
      // a drive sprocket and an idler. That count is what makes the TOP and
      // SIDE cells read as TRACKS and not as two dark bars: a plain box is
      // exactly what a wheeled hull's skirt looks like from 2 km up, and the
      // tracks are identity mark #1.
      for (const side of [-1, 1]) {
        // Track run: the dark inner belt, 0.9 m tall, held INBOARD at x 1.55
        // so the wheels can stand outboard of it and still be part of the same
        // assembly. It is deliberately the darkest thing on the vehicle: the
        // wheels are what has to be counted, and they only count against a
        // dark ground.
        add(geometry.panel, dark, side * 1.55, 0.9, 0, 0.55, 1.8, 9.0);
        // Return-roller top run, lighter, so the track has a visible top edge
        // instead of the run being one solid slab.
        add(geometry.panel, steel, side * 1.55, 1.75, 0, 0.5, 0.2, 8.6);
        // Six road wheels a side. Cylinders laid on their side (rz = PI/2
        // rolls the cylinder axis from +y onto +x, across the vehicle), 0.62
        // radius, hubs at x +/-1.95 which is 0.12 PROUD of the track belt.
        // That overhang is the whole reason the wheel count is legible from
        // directly above: wheels tucked inside the belt line are invisible in
        // the TOP cell and the unit reads as a box on two dark bars, which is
        // exactly what a wheeled hull's skirt looks like from 2 km up.
        //
        // First round of this model hid all of them behind a full-length
        // oxide skirt: the running gear vanished in every cell and identity
        // mark #1 was gone. The skirt is now two SHORT fenders (below) that
        // leave the middle four wheels in the open.
        for (const wz of [-3.35, -2.0, -0.65, 0.7, 2.05, 3.4]) {
          add(geometry.shipCylinder, steel, side * 1.95, 0.72, wz,
            0.62, 0.62, 0.62, 0, 0, Math.PI / 2);
          // Dark hub centre, so each wheel has a middle and the six do not
          // merge into one pale stripe when they are close together.
          add(geometry.shipCylinder, dark, side * 2.28, 0.72, wz,
            0.26, 0.1, 0.26, 0, 0, Math.PI / 2);
        }
        // Drive sprocket aft and idler forward, larger and higher than the
        // road wheels - the asymmetry at the two ends is what says "tracked
        // vehicle" rather than "row of rollers".
        add(geometry.shipCylinder, oxide, side * 1.95, 1.25, 4.2,
          0.82, 0.62, 0.82, 0, 0, Math.PI / 2);
        add(geometry.shipCylinder, oxide, side * 1.95, 1.25, -4.2,
          0.82, 0.62, 0.82, 0, 0, Math.PI / 2);
        // Rusted fenders: SHORT plates over the two ends only, in the redder
        // oxide. A bolted-on plate that has weathered differently from the
        // hull is the cheapest "abandoned" cue on the model, but run full
        // length it becomes a lid over the running gear - so it stops well
        // clear of the middle of the track.
        add(geometry.panel, oxide, side * 2.05, 2.05, -3.5, 0.5, 0.3, 2.0);
        add(geometry.panel, oxide, side * 2.05, 2.05, 3.5, 0.5, 0.3, 2.0);
      }

      // --- Hull ----------------------------------------------------------------
      // Low armoured box between the tracks, 3.0 m wide across the deck at
      // y 2.35 - narrower than the 3.5 m track gauge so a strip of running
      // gear shows down both sides from directly above. Getting this wrong
      // (a full-gauge deck) hides the tracks in the TOP cell and identity
      // mark #1 disappears in the one view that would have shown it best.
      add(geometry.panel, rust, 0, 1.9, 0, 3.0, 1.5, 8.6);
      // Sloped glacis over the nose, the standard tracked-vehicle front.
      add(geometry.panel, rust, 0, 2.2, -3.9, 2.9, 1.7, 2.4, -0.62);
      // Deck plate: a slightly lighter lid so the hull is not one brown mass
      // from directly above, inset from the hull sides.
      add(geometry.panel, steel, 0, 2.68, 0.3, 2.5, 0.2, 6.4);
      // Corrosion patches on the deck - two oxide plates breaking up that lid.
      // A vehicle that has been sitting for years is not uniformly coloured,
      // and this is the one place the camera looks straight down at.
      add(geometry.panel, oxide, -0.75, 2.8, -1.5, 0.9, 0.06, 1.8);
      add(geometry.panel, oxide, 0.85, 2.8, 1.9, 0.7, 0.06, 1.4);
      // Driver's station on the nose deck - a sealed hatch with NO glazing,
      // deliberately: every crewed vehicle in this game has a dark windscreen
      // band, and the absence of one is the quiet half of "unmanned". The
      // vision port is plated over in oxide instead.
      add(geometry.panel, rust, 0, 2.95, -3.0, 1.6, 0.6, 1.5);
      add(geometry.panel, oxide, 0, 3.05, -3.72, 1.2, 0.42, 0.16);
      // Tail plate and a stowage bin at the back, flush with the hull's aft
      // face so neither reads as a slab floating behind the vehicle in SIDE.
      add(geometry.panel, dark, 0, 2.1, 4.28, 2.8, 1.2, 0.24);
      add(geometry.panel, oxide, 0, 3.0, 3.5, 2.2, 0.7, 1.2);

      // ============ IDENTITY 1: FOUR CANTED MISSILE CANISTERS ==================
      // The silhouette. A cradle on the rear deck holding four square-section
      // canisters as a 2x2 pack, pitched nose-UP and forward at 0.42 rad (24
      // degrees). They are the tallest, longest thing on the vehicle and they
      // are meant to win the eye from every angle.
      //
      // Why FOUR IN A ROW and not a 2x2 block: the first round of this model
      // stacked them two-up, and the four tubes fused into one brown slab in
      // every cell of the contact sheet - the upper pair simply roofed the
      // lower one. A single transverse row of four, with a full 0.28 m of AIR
      // between neighbours, is the only arrangement where the count survives
      // from directly above, which is the view that decides whether the pack
      // reads as "four missiles" or as "a crate". The gaps are load-bearing:
      // touching tubes are one tube.
      //
      // Cant maths and WHICH END IS UP: each canister is 5.4 m long, pitched
      // rx = -0.42 rad (24 deg). Verified numerically rather than by eye: at
      // that rotation a point at local +z 2.7 lands at world (y +1.10,
      // z +2.47) and one at local -z 2.7 lands at (y -1.10, z -2.47). So the
      // AFT end rises and the FORWARD end drops.
      //
      // That means the open MOUTHS have to be on the aft (+z) end, and the
      // sealed blast caps on the forward (-z) end. Round 3 had this backwards
      // - mouths low and forward, caps high and aft - which draws a launcher
      // aimed down into the ground ahead of its own hull. A SAM elevates so
      // the round leaves upward and over the vehicle's tail; the elevated end
      // is the end that opens. Getting this the wrong way round is not a
      // detail, it is the difference between a launcher and a bulldozer.
      //
      // The run therefore spans z -0.95..+3.95 and climbs from y 2.9 at the
      // sealed nose to y 5.1 at the mouths, with the mouth collars reaching
      // 6.0 - which is the `crash.top` above. Nothing overhangs the hull nose
      // and nothing pokes below the deck.
      //
      // Elevating cradle the pack sits in: a trunnion box across the deck with
      // two rusted arms. Drawn first so the canisters sit ON it.
      add(geometry.panel, oxide, 0, 3.0, 2.9, 3.0, 0.7, 1.8);
      for (const side of [-1, 1]) {
        // Trunnion arm rising to the pivot - the reason the pack is at an
        // angle instead of simply floating over the deck.
        add(geometry.panel, steel, side * 1.45, 3.6, 2.85, 0.24, 1.6, 0.7);
      }
      // The four tubes, abreast at 0.94 m centres: x = -1.41, -0.47, +0.47,
      // +1.41. Each is 0.52 m across, so there is 0.42 m of OPEN AIR between
      // neighbours - nearly as wide as a tube. Round 2 used 0.58 m tubes on
      // 0.86 m centres (0.28 m gaps) and the pack still fused into one brown
      // roof in both 3/4 cells: at contact-sheet scale a gap has to be a
      // substantial fraction of the thing it separates before the eye reads it
      // as a gap at all. The outer pair at 1.41 +/- 0.26 still sits inside the
      // 3.5 m track gauge, so nothing overhangs the running gear.
      for (const cx of [-1.41, -0.47, 0.47, 1.41]) {
        // Body: a square-section box, not a cylinder. A launch CANISTER is a
        // crate - flat faces that catch four different shades at the preview's
        // four light angles - where a cylinder would read as the TEL's single
        // round tube, and the TEL is the unit this must not be confused with.
        add(geometry.panel, rust, cx, 4.0, 1.5, 0.52, 0.52, 5.4, -0.42);
        // A dark spine strip laid ALONG the top of each tube. This is what
        // finally separates them in the two 3/4 cells: the sunlit upper faces
        // of four adjacent boxes are all the same brown and merge into a roof,
        // so each one gets its own dark line down the middle and the pack
        // reads as four ribs instead of one slab.
        add(geometry.panel, dark, cx, 4.28, 1.62, 0.2, 0.1, 5.2, -0.42);
        // THE MOUTH, on the RAISED aft end: a pale steel collar with a dark
        // aperture recessed inside it. Four dark squares in pale rings, held
        // up at the top of the pack where nothing occludes them, is the single
        // clearest statement of the count on the whole model - and the two-part
        // collar-and-hole is what makes each box read as a tube with something
        // live inside it rather than as a girder.
        add(geometry.panel, steel, cx, 5.02, 3.83, 0.7, 0.7, 0.3, -0.42);
        add(geometry.panel, dark, cx, 5.14, 4.1, 0.52, 0.52, 0.24, -0.42);
        // Sealed nose cap on the low forward end, oxide: the blanked-off end,
        // deliberately the dull one so the eye is not offered two competing
        // "openings" per tube.
        add(geometry.panel, oxide, cx, 2.98, -1.02, 0.62, 0.62, 0.32, -0.42);
        // Retaining bands, two per canister, in bare steel: the marks that
        // break up a 5.4 m untextured box and say "container".
        add(geometry.panel, steel, cx, 3.62, -0.02, 0.68, 0.68, 0.22, -0.42);
        add(geometry.panel, steel, cx, 4.44, 1.86, 0.68, 0.68, 0.22, -0.42);
      }
      // Elevation strut under the raised aft end: a rusted A-frame leg from
      // the tail of the deck up to the underside of the pack. With the mouths
      // now at the top of the run, the four tubes overhang the back of the
      // hull and need something visibly holding them there - an unsupported
      // pack reads as if it is falling off. Kept LOW and narrow so it cannot
      // mask the mouths, which are the count's primary reading.
      add(geometry.panel, oxide, 0, 3.35, 3.95, 2.3, 1.5, 0.24, -0.5);
      for (const side of [-1, 1]) {
        add(geometry.panel, steel, side * 0.95, 3.4, 3.7, 0.2, 1.5, 0.2, -0.42);
      }

      // ============ IDENTITY 3 (part): HULL WARNING BEACONS ====================
      // Two beacons on the forward hull corners, each a dark collar with an
      // additive lens standing proud of it. Placed on the NOSE deck rather
      // than on the sensor mast so at least one pair of red marks is visible
      // in every one of the four preview cells including the head-on one,
      // where the mast head is edge-on and tiny.
      //
      // These are the only red on the model. Two of them plus the one on the
      // sensor head is the whole budget: a vehicle strung with warning lights
      // reads as a Christmas tree, and three reads as a machine flashing at
      // nobody.
      // Pushed right out to the hull's shoulders (x +/-1.42) and forward of
      // the sensor mast, so from directly above the pair brackets the nose
      // instead of clustering with the head's own light into one red smudge -
      // which is what the first round did at x 1.25 with the mast lamp only
      // 1.2 m behind them.
      // Round 2 put these at z -3.35, down on the glacis, where the sloped
      // nose plate ate both of them in the FRONT 3/4 cell. They now stand on
      // short posts at z -2.75 on the flat deck, with the lens at y 3.55 -
      // clear of the glacis crest and clear of the sensor block beside them.
      for (const side of [-1, 1]) {
        add(geometry.shipCylinder, beaconBase, side * 1.42, 3.05, -2.75, 0.2, 0.6, 0.2);
        add(geometry.shipOctPlate, beacon, side * 1.42, 3.55, -2.75, 0.32, 0.32, 0.32);
      }

      // ============ IDENTITY 2: THE ROTATING SENSOR HEAD =======================
      // A mast on the forward deck carrying an optical block on a turntable.
      // Everything that traverses hangs off ONE group so the head, its lenses
      // and its own beacon all turn together. Built as a Group (add() only
      // makes meshes) and parented through addRoot, then handed back as
      // `dish`: a pivot that is not parented is a sensor that is nowhere, and
      // one that is not returned is a sensor that never moves.
      //
      // Mounted FORWARD (z -1.75) and the launcher aft, so the two identity
      // marks occupy opposite ends of the vehicle instead of stacking into one
      // lump in the middle. The pivot sits at y 2.78 - the deck top - so the
      // block's roof lands at 5.28 and its beacon tip at 5.9, both under the
      // canister crown at 6.0. The launcher stays the top line of the
      // silhouette; the head is the second read, not a competing mast.
      const head = new THREE.Group();
      head.position.set(0, 2.78, -1.75);
      addRoot(head);

      const put = (geo, material, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
        const m = new THREE.Mesh(geo, material);
        m.position.set(x, y, z);
        m.scale.set(sx, sy, sz);
        m.rotation.set(rx, ry, rz);
        head.add(m);
        return m;
      };

      // Turntable: a low drum the mast stands on, 1.15 m across - wider than
      // the mast by a clear margin so it reads as a BEARING the head sits in.
      // This is the piece that makes the block above read as something that
      // TURNS rather than as a box bolted to the deck, the same job the LASER
      // AAV's traverse ring does.
      put(geometry.shipCylinder, steel, 0, 0.16, 0, 1.15, 0.32, 1.15);
      put(geometry.panel, dark, 0, 0.36, 0, 1.9, 0.1, 1.9);
      // Mast: a short post between turntable and head, so the optics sit above
      // the canisters' cradle line and clear the deck clutter in SIDE view.
      put(geometry.panel, steel, 0, 0.8, 0, 0.5, 1.0, 0.5);
      // The optical block: wider than tall, its face at z -0.9. Grown from the
      // first round's 1.5x0.85x1.25 to 2.1x1.15x1.7 - at contact-sheet scale
      // the smaller box was a knuckle on a stick and the mark did not survive.
      // It is still a clean slab: all the interest here is the lenses.
      put(geometry.panel, rust, 0, 1.85, 0, 2.1, 1.15, 1.7);
      // Roof cap in bare steel, inset. Light roof, dark seams and not the
      // other way round: from directly above the head is the only part of this
      // vehicle the camera sees in full, and a dark lid there turns it into a
      // black rectangle that reads as an open hatch in the deck.
      put(geometry.panel, steel, 0, 2.5, 0, 1.7, 0.16, 1.35);
      // Side radiator slots, so the block is not an untextured cube at any of
      // the four preview angles.
      put(geometry.panel, dark, -1.09, 1.85, 0.15, 0.1, 0.66, 1.1);
      put(geometry.panel, dark, 1.09, 1.85, 0.15, 0.1, 0.66, 1.1);
      // THE OPTICS. Two dark apertures side by side on the block's front face
      // - a wide-field window and a narrow tracker - with pale rims. A pair,
      // not one: two eyes on a turning head is what reads as a SENSOR, where a
      // single disc reads as the LASER AAV's emitter, and that is the other
      // unit this must not be confused with.
      //
      // shipOctPlate is a squat cylinder about its own +y, so rx = PI/2 stands
      // the plate up to FACE forward along -z. Without that rotation the
      // lenses lie flat on the roof like table tops and the mark is invisible
      // from every angle that matters.
      for (const side of [-1, 1]) {
        put(geometry.shipCylinder, light, side * 0.6, 1.85, -0.84, 0.46, 0.14, 0.46, Math.PI / 2);
        put(geometry.shipOctPlate, dark, side * 0.6, 1.85, -0.97, 0.36, 0.12, 0.36, Math.PI / 2);
      }
      // Sunshade hood over the two apertures - the lip that says the optics
      // are looking at something rather than being two holes. Its overhang is
      // also what gives the head a FRONT from directly above, so the sweep is
      // readable as a direction and not just as a box that happens to spin.
      put(geometry.panel, steel, 0, 2.42, -0.95, 1.9, 0.12, 0.75, 0.28);
      // A whip antenna off the back of the head, canted aft. It sweeps with
      // the block, which from directly above is the clearest evidence in the
      // whole contact sheet that this assembly rotates - a symmetric box gives
      // the eye nothing to track.
      put(geometry.panel, dark, 0, 2.1, 1.15, 0.12, 0.12, 1.5, 0.6);

      // The head's own beacon, standing on its roof: the third and last red
      // mark, and the one that moves. A rogue battery sweeping its own warning
      // light across the landscape is the entire character of the unit, so it
      // is the largest of the three lenses and sits on a visible post.
      put(geometry.shipCylinder, beaconBase, 0, 2.75, 0.3, 0.24, 0.36, 0.24);
      put(geometry.shipOctPlate, beacon, 0, 3.12, 0.3, 0.36, 0.34, 0.36);

      // `dish` is the only field read off this return. The spec's dishSpin 2.0
      // turns the whole head on Y for as long as the vehicle is alive, and
      // stops it dead when it is not.
      return { dish: head };
    }
  });
}
