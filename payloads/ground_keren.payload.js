export default function register(ctx) {
  const { GROUND_TYPES } = ctx.tables;

  // KEREN - the mountain railgun complex. Three kinds ship in this one payload
  // because they are one installation: the guns, the towers that feed them and
  // the fire-control core that points them. They are registered as three
  // separate GROUND_TYPES rather than one, because a superweapon the player
  // dismantles piece by piece has to BE pieces to the target list.
  //
  // Every one of them spreads a template whose `aa` is already null. That is
  // not incidental: the brief is models only, and spreading an unarmed entry
  // disarms by construction instead of by remembering to override a live
  // weapon block. `bunker` is the hardened-structure template (hp 120, the
  // highest emplaced value in the table) and `radarSite` is the sensor one.
  const bunker = GROUND_TYPES.bunker;
  const radarSite = GROUND_TYPES.radarSite;
  if (!bunker) throw new Error("[keren] expected GROUND_TYPES.bunker as a template");
  if (!radarSite) throw new Error("[keren] expected GROUND_TYPES.radarSite as a template");

  // ===========================================================================
  // 1. GROUND_TYPES entries
  // ===========================================================================
  //
  // BALANCE TODO: placeholder. Every combat field on all three entries is the
  // template's, spread in unexamined - `aa` (null), `radarColor`,
  // `tracerColor`, `explosionColor`, and the `chain` any template carries.
  // The `hp` values ARE overridden, and they are placeholders too: they were
  // picked as multiples of the bunker's 120 to say "this is the hardest class
  // of structure in the game" and nothing more. No pass has been made on how
  // many missiles a superweapon emplacement should be worth, whether the gun
  // and its power plant should die at the same rate, or how any of it
  // interacts with a part-destruction system that does not exist yet.
  //
  // What IS authored, and is correct, is the dimension set on each entry:
  // hitRadius / crash / hitBox / smokeHeight are all measured off the models
  // below and are the numbers that make the lock box match what is drawn.

  ctx.addGroundType("kerenGun", {
    ...bunker,
    key: "kerenGun",
    label: "KEREN GUN",
    role: "Electromagnetic Mass Driver",
    // BALANCE TODO: placeholder. Bunker's 120 x 3.
    hp: 360,
    // Measured off the model. The barrel is 60 m at 45 degrees from a trunnion
    // at y 15 / z -4, so its muzzle is at y 15 + 60·sin45 = 57 and z -4 - 60·
    // cos45 = -46: the gun reaches as far FORWARD and UP as the capacitor hall
    // does aft (z +58). The terrace runs z -26..+58 inside revetments at
    // x ±19, which is the plan box; hitRadius is the half-diagonal of the
    // whole 84 m run, rounded.
    hitRadius: 52,
    crash: Object.freeze({ halfLen: 46, halfBeam: 19, top: 57 }),
    hitBox: Object.freeze({ x: 40, y: 58, z: 108 }),
    smokeHeight: 16,
    aa: null
  });

  ctx.addGroundType("kerenPylon", {
    ...bunker,
    key: "kerenPylon",
    label: "KEREN PYLON",
    role: "Mass Driver Power Pylon",
    // BALANCE TODO: placeholder. Bunker's 120 x 1.5 - the thinnest structure
    // of the three and the one that is all lattice and air.
    hp: 180,
    // 42 m to the obstruction light, 18 m across the widest crossarm, on a
    // 16 m square base pad. `halfBeam` is the arm's own 9, not the pad's 8:
    // the arms are the widest thing on the tower and they are what an
    // aircraft actually clips.
    hitRadius: 20,
    crash: Object.freeze({ halfLen: 9, halfBeam: 9, top: 42 }),
    hitBox: Object.freeze({ x: 20, y: 43, z: 18 }),
    smokeHeight: 10,
    aa: null
  });

  ctx.addGroundType("kerenCore", {
    ...radarSite,
    key: "kerenCore",
    label: "KEREN CORE",
    role: "Fire Control Centre",
    // BALANCE TODO: placeholder. Bunker's 120 x 2 - it is a hardened dome, not
    // a search radar, so the sensor template's 70 was never going to be right.
    hp: 240,
    // The armoured dome is 26 m across on a 40 m base block. `top` is the
    // uplink mast's 30.4 rather than the targeting array's crown at ~33: the
    // mast is fixed structure, the array is a spinning panel, and flying
    // through a sensor is intended where flying through the building is not -
    // the same distinction the AD TANK draws when it takes its `top` off the
    // turret and not off its dish.
    hitRadius: 30,
    crash: Object.freeze({ halfLen: 21, halfBeam: 21, top: 31 }),
    hitBox: Object.freeze({ x: 44, y: 34, z: 44 }),
    smokeHeight: 9,
    // Kept from radarSite, and earned: the build returns the targeting plate's
    // pivot as `dish`, so the caption reading DISH yes is the proof it turns.
    dishSpin: radarSite.dishSpin,
    aa: null
  });

  // ===========================================================================
  // 2. kerenGun - the electromagnetic mass driver
  // ===========================================================================
  ctx.addGroundModel("kerenGun", {
    build(env) {
      const { THREE, geometry, makeAircraftMaterial,
              steel, olive, dark, light, extraMaterials, add, addRoot } = env;

      // ---- The one accent system -----------------------------------------
      // A single emissive material, used only on the accelerator coils and the
      // energy conduit that feeds them. Unlit and additive so it survives all
      // four preview light angles as something SHINING rather than a pale
      // plate, and pushed into extraMaterials or it leaks with every gun that
      // dies. One system, one colour: the moment a second glow colour appears
      // the eye stops reading the coil stack as a single circuit.
      const coilGlow = new THREE.MeshBasicMaterial({
        color: 0x9fd8ff,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      extraMaterials.push(coilGlow);
      // The housing the glow sits in - a dark blue-tinted steel so each lit
      // ring has a rim to sit against instead of floating on bare grey.
      const coilCase = makeAircraftMaterial(0x24455c, 0.55, 0.42);
      extraMaterials.push(coilCase);

      // ---- Geometry constants ---------------------------------------------
      // ELEV is THE number on this unit. 45 deg (0.785 rad) is dead centre of
      // the brief's 40-50 band and it is also what the silhouette wants: at 40
      // the barrel reads as a long gun, at 50 it reads as a launch rail, and
      // at 45 it reads as both, which is the point of a weapon that was built
      // to shoot at rocks in space and got repurposed.
      //
      // The barrel is NOT drawn by placing rotated boxes one at a time. Every
      // piece of it goes into a Group that is tilted once, so the two rails,
      // every coil ring, the muzzle brace and the breech are guaranteed to
      // stay on the same bore line no matter what ELEV is retuned to. Building
      // it the other way - a rotation per mesh, with the offsets pre-solved by
      // hand - is how a 60 m barrel ends up with its coils floating beside it,
      // and the error is invisible at the angle you happened to check.
      const ELEV = Math.PI / 4;      // 45 deg
      const BARREL_LEN = 60;         // the brief's 60 m, along the bore
      // Rail gauge and section are set against the LENGTH, not by eye. A 60 m
      // barrel drawn at the first cut's 1.9 m gauge and 2.2 m section came out
      // as a drinking straw next to a 26 m turntable - correct in metres and
      // wrong in every view. At 3.0 m gauge with a 3.6 m section the pair is
      // ~9.6 m across the flats, i.e. 1:6 against its own length, which is
      // about what a naval gun barrel reads at and is heavy enough to still be
      // the subject when the capacitor hall is in the same frame.
      //
      // The GAP matters as much as the gauge. Each rail is 3.2 wide and they
      // are 3.4 apart on centres, leaving a 3.6 m slot down the middle - i.e.
      // the empty channel is WIDER than either rail. That is the whole reason
      // this reads as a railgun rather than as a cannon: at a gauge only just
      // over the section the two boxes touch and the pair becomes one beam.
      //
      // 4.4 rather than the 3.4 of the third cut, because 3.4 only worked in
      // the TOP view. From the two 3/4 views the near rail, the far rail and
      // the ribs between them stacked up into one continuous mass and the
      // slot was invisible in three views out of four. The gap has to be big
      // enough to survive foreshortening: at 4.4 gauge and 3.2 section the
      // slot is 5.6 m wide - wider than a rail and wider than it is deep -
      // and it stays open at every angle the preview offers.
      const RAIL_GAUGE = 4.4;        // half-distance between the two rails
      const TRUNNION_Y = 15;         // where the bore line crosses the mount
      const TRUNNION_Z = -4;         // and where along the deck that is

      // ---- Foundation ------------------------------------------------------
      // A cut mountain terrace, not a pad. The gun is emplaced in rock: two
      // stepped slabs, the upper one carrying the turntable and the lower one
      // running back under the capacitor hall, so the whole assembly reads as
      // built INTO the site rather than parked on it.
      //
      // SIZED AGAINST THE BARREL, which is the mistake the first cut made: a
      // 44 x 108 slab under a 60 m gun swallowed it, and every preview view
      // was a photograph of a car park with a stick on it. The terrace is now
      // 34 wide and runs z -26..+58 (84 long) - still the biggest single
      // element in plan, but the barrel's 42 m of vertical reach is now the
      // tallest thing on the unit by a factor of three and the framing camera
      // (which fits the model's bounding sphere) puts the gun in the middle of
      // the cell instead of the slab.
      add(geometry.panel, dark, 0, 1.2, 16, 38, 2.4, 84);
      add(geometry.panel, steel, 0, 2.8, -6, 32, 1.6, 40);
      // Revetment walls up both flanks of the terrace - the thing that says
      // "hardened emplacement" from directly above, where the terrace is
      // otherwise a plain rectangle.
      for (const side of [-1, 1]) {
        // Wall centreline at 17.5, so its inner face sits at 16 - clear of the
        // 15 m turntable that has to turn inside it.
        add(geometry.panel, dark, side * 17.5, 4.6, 16, 3, 5.6, 80);
        // Buttresses along the outside of each wall, so the wall has depth in
        // the top-down view instead of being a drawn line.
        for (let b = 0; b < 6; b += 1) {
          add(geometry.panel, dark, side * 19.7, 3.6, -20 + b * 15, 2.4, 3.6, 4.4);
        }
      }

      // ---- Turntable -------------------------------------------------------
      // The traverse ring the whole gun stands on. Deliberately massive - 26 m
      // across - because the barrel above it is 60 m long, and a slender mount
      // under that much cantilever reads as a mistake rather than as a design.
      // Radius 15 so the cheeks, which reach x 13.2, land on the ring rather
      // than overhang it - a mount wider than the turntable it stands on is
      // the kind of thing only the TOP view catches, and it catches it hard.
      add(geometry.shipCylinder, steel, 0, 4.4, TRUNNION_Z, 15, 1.8, 15);
      add(geometry.shipCylinder, dark, 0, 5.6, TRUNNION_Z, 13.6, 1.4, 13.6);
      // Roller bogies around the ring: eight blocks on the circle, the detail
      // that turns a stack of discs into a bearing.
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        add(geometry.panel, steel, Math.sin(a) * 14.2, 4.6, TRUNNION_Z + Math.cos(a) * 14.2,
          2.6, 2.2, 2.6, 0, -a, 0);
      }

      // ---- Mount cheeks ----------------------------------------------------
      // Two slab-sided towers rising from the turntable to the trunnion, one
      // each side of the breech. These carry the barrel and they are the
      // reason the gun looks HEAVY: a 60 m rail on a thin yoke looks like an
      // antenna, and on two 10 m armoured cheeks it looks like ordnance.
      //
      // The cheeks stand OUTBOARD of the rails, which is what sets their x.
      // The rail pair occupies x -6.0..+6.0 across the flats (gauge 4.4 plus a
      // 1.6 half-section) and the coil glow reaches 6.6, so a cheek inboard of
      // 7 is inside the barrel's swept volume and the two interpenetrate as
      // the elevation is retuned. 9.8 clears the coils with 0.7 to spare.
      for (const side of [-1, 1]) {
        add(geometry.panel, olive, side * 9.8, 10, TRUNNION_Z, 5.0, 12, 15);
        // Sloped outer face - the armour angle, and a second value against the
        // flat inner face so the cheek is not one grey block.
        add(geometry.panel, steel, side * 12.5, 10.4, TRUNNION_Z, 1.4, 10.6, 13.4,
          0, 0, -side * 0.16);
        // Trunnion bearing housing: the round boss the barrel actually pivots
        // in. Laid on its side (rz = PI/2) so its axis is across the gun.
        add(geometry.shipCylinder, dark, side * 8.6, TRUNNION_Y, TRUNNION_Z,
          3.6, 2.2, 3.6, 0, 0, Math.PI / 2);
        add(geometry.shipCylinder, steel, side * 10.6, TRUNNION_Y, TRUNNION_Z,
          2.4, 1.8, 2.4, 0, 0, Math.PI / 2);
        // Elevation ram: the hydraulic strut from the deck up to a point under
        // the barrel behind the trunnion. Drawn by span - midpoint and true
        // angle - so both ends land where they should. A ram placed by eye at
        // a guessed angle is the classic way to get a strut whose head is in
        // mid-air 4 m off the barrel it is supposed to be pushing.
        const ramFootZ = 18, ramFootY = 6.6;
        const ramHeadZ = 9.4, ramHeadY = 22.5;
        const dz = ramHeadZ - ramFootZ, dy = ramHeadY - ramFootY;
        add(geometry.shipCylinder, steel, side * 8.8, (ramFootY + ramHeadY) / 2,
          (ramFootZ + ramHeadZ) / 2, 1.7, Math.hypot(dz, dy), 1.7,
          Math.atan2(dz, dy));
        add(geometry.panel, dark, side * 8.8, ramFootY, ramFootZ, 3.8, 3.4, 3.8);
      }

      // ---- THE BARREL (the feature) ---------------------------------------
      // One group, one rotation. Inside it the bore runs along -Z from the
      // breech at z 0 to the muzzle at z -BARREL_LEN, and the group is then
      // pitched nose-up by ELEV and stood at the trunnion.
      //
      // rx = +ELEV is the sign that LIFTS a -Z-pointing barrel: R_x(t) sends
      // (0,0,-1) to (0, sin t, -cos t), so a positive angle raises the muzzle
      // and a negative one buries it. The first cut here used -ELEV and drew a
      // 60 m rail pointing 45 degrees into the mountain - which, because the
      // rest of the unit is symmetric about x, looked like a plausible model
      // in the TOP view and only failed in the two 3/4 views. Worth stating
      // because it is the single most load-bearing sign in the file: the whole
      // brief is "fixed elevation, 40-50 degrees".
      const barrel = new THREE.Group();
      barrel.position.set(0, TRUNNION_Y, TRUNNION_Z);
      barrel.rotation.x = ELEV;
      addRoot(barrel);
      // Local add for the barrel group - same signature as env.add so the body
      // below reads the same as the rest of the file, but parenting into the
      // pivot instead of into `parts`.
      const bar = (geo, material, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
        const m = new THREE.Mesh(geo, material);
        m.position.set(x, y, z);
        m.scale.set(sx, sy, sz);
        m.rotation.set(rx, ry, rz);
        barrel.add(m);
        return m;
      };

      // The two rails. THE identity of the weapon: parallel, square-section,
      // running the full 60 m with nothing bridging the gap between them
      // except the coils. That empty slot down the middle is what makes it a
      // railgun instead of a cannon, so it is kept open on purpose - the
      // temptation is to fill it with structure and the moment you do, the
      // unit is a big artillery piece.
      for (const side of [-1, 1]) {
        bar(geometry.panel, steel, side * RAIL_GAUGE, 0, -BARREL_LEN / 2 + 2,
          3.2, 4.2, BARREL_LEN - 4);
        // A darker channel down the inboard face of each rail - the conductor
        // slot, and the line that keeps a 60 m box from being featureless.
        bar(geometry.panel, dark, side * (RAIL_GAUGE - 1.7), 0, -BARREL_LEN / 2 + 2,
          0.7, 2.4, BARREL_LEN - 6);
        // Outboard rib pack: seven short fins along each rail. They give the
        // barrel a rhythm at range and they are the reason it does not read as
        // an extruded rectangle in the SIDE view. Kept SHALLOW (2.8 against
        // the rail's 4.2) and strictly outboard: a rib as tall as the rail
        // widens the barrel's apparent section by its own height at every
        // oblique angle, and closing up the slot is the one thing nothing on
        // this barrel is allowed to do.
        for (let f = 0; f < 7; f += 1) {
          bar(geometry.panel, olive, side * (RAIL_GAUGE + 1.9), 0, -6 - f * 8,
            1.0, 2.8, 3.4);
        }
      }

      // Accelerator coils. Six rings up the barrel, each a cased torus - dark
      // housing outside, glowing ring inside - straddling both rails so it is
      // visibly the thing that couples them. Spaced along the FIRST two thirds
      // and getting closer together toward the muzzle, because a stack at even
      // spacing reads as decoration and a stack that tightens reads as
      // acceleration.
      //
      // SIZE AND COUNT ARE BOTH RESTRAINED, and that is the whole lesson of
      // this element. The second cut drew six rings at radius 6.6 and 3.0 m of
      // axial thickness on a 60 m barrel: 18 m of the bore's 60 was ring, they
      // were wider than the rails were apart, and the barrel came out as one
      // continuous glowing tube. The two-rail silhouette - which is the single
      // most important read on this unit - was gone, and the coils had eaten
      // it. A coil is a BAND: it has to be thin along the bore (1.2 m against
      // 11 m of spacing = 11% coverage, so 89% of the barrel is visibly rails
      // and open slot) and only just wider than the rails it couples (4.8
      // against the 4.8 the rail pair spans, so it is flush with their outer
      // faces rather than swallowing them).
      const COIL_Z = [-9, -20, -30, -38, -45];
      for (const cz of COIL_Z) {
        // Housing: a squat cylinder laid across the bore (rx = PI/2 stands
        // shipCylinder's own +y along the barrel's z). Radius 6.2 against the
        // rail pair's 6.0 half-span, so it is flush with their outer faces.
        bar(geometry.shipCylinder, coilCase, 0, 0, cz, 6.2, 1.2, 6.2, Math.PI / 2);
        // The lit ring itself. It is proud of the housing RADIALLY (5.6
        // against 5.2) and INSET axially (0.7 against 1.2), which is the
        // opposite of what the third cut did - that one stood the glow proud
        // along the bore instead, so what showed was the disc's two end CAPS
        // poking out of the case, and with additive blending an octagonal cap
        // seen at an angle reads as a cone. Five glowing funnels up the
        // barrel, not five bands. Standing it proud around the rim instead
        // shows the ring's SIDE, which is the band.
        bar(geometry.shipCylinder, coilGlow, 0, 0, cz, 6.6, 0.7, 6.6, Math.PI / 2);
        // Cross-tie under the coil joining the two rails - the structural job
        // the ring is doing, made visible.
        bar(geometry.panel, dark, 0, -2.6, cz, RAIL_GAUGE * 2 + 1.4, 1.1, 2.4);
      }

      // Energy conduit: the trunking that carries the accent system down the
      // outside of the barrel from the breech to the last coil. This is the
      // second half of the "one accent system" rule - a glow at the coils with
      // no visible feed is a decoration, and a feed makes it a circuit. Run
      // under the barrel where it will not compete with the rails' silhouette.
      //
      // The lit part is a SLOT in the trunking, not a bar hung under it. The
      // third cut drew a 2.2 m-wide glowing strip below a 3.4 m case and, at
      // any distance, the strip won: a 46 m unbroken blue line running under
      // the barrel that read as a beam the gun was firing rather than as a
      // cable feeding it. Now the case is the object and the glow is a 0.9 m
      // ribbon recessed into its underside - visible along the run, never the
      // brightest thing in frame, and always subordinate to the coil rings it
      // feeds, which is the correct hierarchy for the one accent system.
      bar(geometry.panel, coilCase, 0, -4.2, -26, 3.6, 2.4, 48);
      bar(geometry.panel, coilGlow, 0, -5.2, -26, 0.9, 0.3, 46);
      // Junction boxes where the conduit taps each coil.
      for (const cz of COIL_Z) {
        bar(geometry.panel, coilCase, 0, -3.8, cz, 4.6, 2.8, 3.4);
      }

      // Muzzle assembly. The last 8 m: a heavier brace ring holding the rails
      // apart against the recoil that never comes, and a flared shroud. This
      // is the end of the longest line in the model and it needs a terminator,
      // or the barrel reads as cut off rather than as finished.
      //
      // Kept OPEN, not capped. The second cut ended the bore in a solid 7.2 m
      // drum and the tip of the gun became a grey barrel-end - the read of a
      // cannon, and the exact thing the open slot between the rails exists to
      // deny. What is here now is a brace ring and two side blocks: the muzzle
      // is framed, and you can still see through it.
      bar(geometry.panel, steel, 0, 0, -BARREL_LEN + 3.6, RAIL_GAUGE * 2 + 5.2, 6.6, 2.4);
      for (const side of [-1, 1]) {
        bar(geometry.panel, steel, side * (RAIL_GAUGE + 0.4), 0, -BARREL_LEN + 1.4,
          4.2, 5.4, 3.2);
        bar(geometry.panel, dark, side * (RAIL_GAUGE + 0.4), 0, -BARREL_LEN - 0.3,
          3.6, 4.6, 0.8);
      }
      // Two stay bars from the muzzle brace back along the rails, so the tip
      // is visibly held rather than cantilevered into space.
      for (const side of [-1, 1]) {
        bar(geometry.panel, steel, side * (RAIL_GAUGE + 3.2), 0, -BARREL_LEN + 9,
          1.1, 1.1, 12);
      }

      // Breech block. The mass at the low end of the barrel, behind the
      // trunnion, which is what keeps a 60 m rail from looking like it will
      // tip the mount over. It extends aft (+z inside the group) so with the
      // barrel at 45 deg it drops toward the deck behind the cheeks - the
      // counterweight read.
      bar(geometry.panel, olive, 0, 0, 6.4, RAIL_GAUGE * 2 + 6.2, 8.4, 14);
      bar(geometry.panel, steel, 0, 0, 13.2, RAIL_GAUGE * 2 + 3.6, 6.6, 3.4);
      bar(geometry.shipCylinder, dark, 0, 0, 15.4, 3.4, 2.0, 3.4, Math.PI / 2);
      // Injector rails feeding the breech from below - where the projectile
      // comes in from the magazine under the deck.
      bar(geometry.panel, dark, 0, -4.8, 8.4, 4.4, 1.8, 10);

      // ---- Capacitor bank hall --------------------------------------------
      // Behind the mount, on the lower terrace: the energy store. Four rows of
      // banked capacitor stacks in an open colonnade, because a shed would
      // hide the one thing this structure is for. Each stack is a dark drum
      // with a pale cap, and they are the repeated element that gives the aft
      // half of the unit its texture in the TOP view.
      const BANK_Z0 = 18;
      for (let row = 0; row < 4; row += 1) {
        const rz = BANK_Z0 + row * 8.6;
        for (let col = 0; col < 5; col += 1) {
          const cx = -10 + col * 5;
          add(geometry.shipCylinder, dark, cx, 6.4, rz, 1.9, 5.6, 1.9);
          add(geometry.shipCylinder, light, cx, 9.4, rz, 2.2, 0.7, 2.2);
          // Terminal post on each - the pale stalk that catches the key light
          // and stops the bank from being 20 identical grey pegs.
          add(geometry.shipCylinder, light, cx, 10.4, rz, 0.4, 1.6, 0.4);
        }
        // Busbar over each row, tying its five stacks together.
        add(geometry.panel, steel, 0, 11.4, rz, 26, 0.7, 0.9);
      }
      // Gantry frame over the whole bank: two longitudinal beams on eight
      // posts. This is what turns four rows of drums into one machine hall.
      // Held at x 13 - inboard of the revetment walls at 15.6, because a
      // gantry leg standing in a wall is the kind of intersection that reads
      // as a modelling error from directly above and nowhere else.
      for (const side of [-1, 1]) {
        add(geometry.panel, steel, side * 13, 14.4, BANK_Z0 + 12.9, 1.1, 1.1, 42);
        for (let p = 0; p < 4; p += 1) {
          add(geometry.panel, steel, side * 13, 8, BANK_Z0 + p * 8.6, 1.3, 13, 1.3);
        }
      }
      // Cross ties over the top, alternating with the busbars below.
      for (let t = 0; t < 5; t += 1) {
        add(geometry.panel, steel, 0, 14.4, BANK_Z0 - 3 + t * 7.8, 26, 0.8, 0.8);
      }
      // Cooling plant at the far end of the hall - a pair of radiator banks
      // and a stack, so the aft end of the terrace terminates in hardware
      // rather than trailing off.
      for (const side of [-1, 1]) {
        add(geometry.panel, olive, side * 8, 5.6, 52, 7, 6, 7);
        for (let fin = 0; fin < 4; fin += 1) {
          add(geometry.panel, steel, side * 8, 5.6, 49.4 + fin * 2, 7.6, 5.2, 0.5);
        }
      }
      add(geometry.shipCylinder, dark, 0, 8, 52, 2.4, 11, 2.4);

      // ---- Cable runs ------------------------------------------------------
      // The heavy feeders from the capacitor hall forward to the mount. These
      // are the brief's "thick cables crawling to the base" and they do real
      // work in the composition: without them the gun and its power plant are
      // two separate objects on one slab. Drawn as slack catenary-ish runs -
      // three straight segments each, sagging in the middle - which reads as
      // cable where a single straight bar reads as a pipe.
      // Each run is drawn by SPAN between two named points, the same way the
      // elevation ram is: a cable placed by eye at a guessed angle has both
      // its ends in mid-air, and the first cut here had exactly that - four
      // rods floating beside the terrace, touching neither the bank nor the
      // mount. `sag` takes the two endpoints in the run's own z-y plane and
      // drops the middle by `dip`, then draws the two halves.
      const cable = (x, z0, y0, z1, y1, gauge) => {
        const dz = z1 - z0, dy = y1 - y0;
        add(geometry.shipCylinder, dark, x, (y0 + y1) / 2, (z0 + z1) / 2,
          gauge, Math.hypot(dz, dy), gauge, Math.atan2(dz, dy));
      };
      for (const side of [-1, 1]) {
        for (const lane of [0, 1]) {
          const x = side * (10.4 + lane * 2.4);
          // Out of the bank's termination box (z 14.6, y 8.4), sagging to a
          // low point mid-span, then up into the mount's box (z 3.6, y 8.0).
          cable(x, 14.6, 8.4, 9.6, 5.2, 0.7);
          cable(x, 9.6, 5.2, 3.6, 8.0, 0.7);
          // Termination boxes at both ends so a cable ends at hardware.
          add(geometry.panel, steel, x, 8.9, 15.8, 2.4, 2.8, 2.4);
          add(geometry.panel, steel, x, 8.4, 2.6, 2.6, 3.4, 2.6);
        }
      }
      // Cable trench cover running under them, tying the two ends on the deck.
      add(geometry.panel, dark, 0, 4.1, 9, 26, 0.6, 14);

      // ---- Ancillaries -----------------------------------------------------
      // Crew bunker and switchgear house off the port flank. Small, low and
      // ordinary on purpose: they are the only human-sized objects on the
      // unit, and they are what tell the eye how big the barrel is.
      add(geometry.panel, olive, -10.4, 5.4, -18, 7, 4, 11);
      add(geometry.panel, steel, -10.4, 7.6, -18, 7.8, 0.6, 11.8);
      add(geometry.panel, dark, -10.4, 4.8, -23.6, 1.8, 2.8, 0.5);
      // Ammunition/projectile magazine to starboard, with a rail spur into the
      // mount - the route the round takes to the breech.
      add(geometry.panel, olive, 10.4, 5.6, -18, 7.6, 4.4, 13);
      add(geometry.panel, steel, 10.4, 8.1, -18, 8.4, 0.6, 13.8);
      add(geometry.panel, steel, 6, 4.2, -13, 8, 0.5, 2.6);
      // Obstruction lights along the revetment crest - the pale marks that
      // read against a dark terrace from directly above.
      for (const side of [-1, 1]) {
        for (const z of [-22, -2, 22, 50]) {
          add(geometry.panel, light, side * 17.5, 7.6, z, 1.2, 0.8, 1.2);
        }
      }

      // No `dish`. The gun traverses and elevates as one assembly and the
      // `dish` contract spins its object about local Y forever; handing back
      // the barrel pivot would give a 60 m rail helicoptering over the
      // mountain. The caption reading DISH no is correct for this unit.
    }
  });

  // ===========================================================================
  // 3. kerenPylon - the power tower
  // ===========================================================================
  ctx.addGroundModel("kerenPylon", {
    build(env) {
      const { THREE, geometry, makeAircraftMaterial,
              steel, olive, dark, light, extraMaterials, add } = env;

      // Same single accent system as the gun, restated here because each
      // build gets its own materials. Only the coil crown wears it.
      const coilGlow = new THREE.MeshBasicMaterial({
        color: 0x9fd8ff,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      extraMaterials.push(coilGlow);
      const coilCase = makeAircraftMaterial(0x24455c, 0.55, 0.42);
      extraMaterials.push(coilCase);

      // ---- Proportions -----------------------------------------------------
      // 40 m to the top of the coil crown. A transmission pylon of that height
      // is a delicate lattice; this is not one. It is a POWER TOWER for a mass
      // driver, so the section is heavy all the way up: four box legs on a
      // 5.2 m half-base tapering to a 2.4 m waist, which is roughly twice the
      // slenderness ratio of the substation's suspension tower. That ratio is
      // the whole difference between the two structures and it is why this one
      // does not need to be told apart by its crown alone.
      const BASE_HALF = 5.2;
      const WAIST_HALF = 2.4;
      const KNEE_Y = 16;       // where the splay ends and the shaft goes parallel
      const SHAFT_TOP = 33;    // where the shaft ends and the crown begins

      // Foundation: a stepped concrete block, 16 m square, with a pile cap
      // under each leg. A tower this heavy standing on bare ground looks
      // dropped rather than built.
      add(geometry.panel, dark, 0, 0.9, 0, 16, 1.8, 16);
      add(geometry.panel, steel, 0, 2.2, 0, 13, 1.2, 13);
      for (const cx of [-1, 1]) {
        for (const cz of [-1, 1]) {
          add(geometry.panel, steel, cx * BASE_HALF, 3.2, cz * BASE_HALF, 3.6, 2.6, 3.6);
        }
      }

      // Legs. Splayed lower section drawn by SPAN - the bar sits at the
      // midpoint of the run and is tilted by the run's own angle, so the foot
      // lands on BASE_HALF and the head lands on WAIST_HALF exactly. A guessed
      // angle on a centred box throws both ends off the structure, and on a
      // 16 m run the error is metres.
      //
      // Signs: a positive rz tips the bar's head toward -x and a positive rx
      // tips it toward +z, so the +x/-z leg needs rz +lean and rx +lean to
      // come inward. Getting either backwards splays the tower outward and it
      // stops reading as a tower at all.
      const mid = (BASE_HALF + WAIST_HALF) / 2;
      const lean = Math.atan2(BASE_HALF - WAIST_HALF, KNEE_Y);
      const legLen = Math.hypot(BASE_HALF - WAIST_HALF, KNEE_Y);
      for (const cx of [-1, 1]) {
        for (const cz of [-1, 1]) {
          add(geometry.panel, steel, cx * mid, KNEE_Y / 2, cz * mid,
            1.3, legLen, 1.3, -cz * lean, 0, cx * lean);
          // Parallel upper shaft from the waist to the crown.
          add(geometry.panel, steel, cx * WAIST_HALF, (KNEE_Y + SHAFT_TOP) / 2,
            cz * WAIST_HALF, 1.15, SHAFT_TOP - KNEE_Y, 1.15);
        }
      }

      // Belt bracing. Four tiers, each at whatever half-width the legs have
      // reached there, with a diagonal over the tier so the tower is visibly
      // braced rather than four posts and some rings. Two faces per tier
      // (+z and -z) rather than a full ring: the far face is never the one
      // being looked at when the near face is.
      const BELTS = [
        { y: 4.4, half: 4.7 },
        { y: 10.2, half: 3.6 },
        { y: 16.0, half: WAIST_HALF },
        { y: 25.0, half: WAIST_HALF }
      ];
      for (const belt of BELTS) {
        for (const face of [-1, 1]) {
          add(geometry.panel, steel, 0, belt.y, face * belt.half,
            belt.half * 2, 0.7, 0.75);
        }
        // Diagonal solved from the tier's own dimensions - a fixed angle on
        // the widest tier throws a beam right out past the foundation.
        const braceLen = Math.hypot(belt.half * 2, 3.0);
        add(geometry.panel, steel, 0, belt.y + 1.5, belt.half,
          braceLen, 0.5, 0.55, 0, 0, Math.atan2(3.0, belt.half * 2));
        add(geometry.panel, steel, 0, belt.y + 1.5, -belt.half,
          braceLen, 0.5, 0.55, 0, 0, -Math.atan2(3.0, belt.half * 2));
      }

      // ---- Large insulators ------------------------------------------------
      // Two crossarms carrying the feeders out to the gun line, each arm hung
      // with a BIG post insulator at its tip - 1.5 m across and 6 m long,
      // where the substation's suspension strings are 0.32 across and 2.6
      // long. That size difference is deliberate and it is most of what makes
      // this a mass-driver pylon rather than a grid pylon: the voltage it
      // implies is absurd, which is the read.
      //
      // The arms have to REACH. At the second cut's 6.5 m half-span against a
      // 2.4 m shaft half-width, only 4 m of each arm was outside the tower's
      // own section - the insulators looked like they were bolted to the legs
      // and the crossarms themselves were invisible behind the lattice from
      // three views. 9.0 and 7.4 put the tips nearly four shaft-widths out,
      // which is what makes the TOP view read as a pylon (a cross) instead of
      // as a tower with a lit hat (a bullseye).
      const ARMS = [
        { y: 20.5, half: 9.0 },
        { y: 27.5, half: 7.4 }
      ];
      for (const arm of ARMS) {
        // The arm is TWO parallel chords, not one bar. The first cut used a
        // single 1.2 m-deep beam and at this tower's gauge it disappeared
        // behind its own insulators from three of the four views - the arms
        // read as insulators hanging off nothing. A pair of chords 2.4 m apart
        // in z, with the ties below, gives the arm its own visible depth from
        // the SIDE and TOP views where a single bar is edge-on.
        for (const chord of [-1.2, 1.2]) {
          add(geometry.panel, steel, 0, arm.y, chord, arm.half * 2, 1.3, 1.1);
        }
        // Rungs between the chords, spaced out along the arm, so the pair
        // reads as one ladder-framed member rather than two separate sticks.
        for (let r = -3; r <= 3; r += 1) {
          if (r === 0) continue;
          add(geometry.panel, steel, r * (arm.half / 3.4), arm.y, 0,
            0.7, 0.9, 2.5);
        }
        for (const tip of [-1, 1]) {
          // Diagonal tie from the shaft up-and-out to the arm tip, doing the
          // kingpost's job so an arm reads as a truss on few meshes.
          add(geometry.panel, steel, tip * arm.half * 0.55, arm.y + 1.8, 0,
            arm.half * 1.3, 0.6, 0.7, 0, 0, tip * 0.32);
          // The post insulator: a stack of three wide sheds on a column, in
          // `light` so it is the palest thing at this height.
          add(geometry.shipCylinder, light, tip * arm.half, arm.y - 3.4, 0,
            0.72, 5.6, 0.72);
          for (let shed = 0; shed < 3; shed += 1) {
            add(geometry.shipCylinder, light, tip * arm.half, arm.y - 1.6 - shed * 1.7, 0,
              1.5, 0.55, 1.5);
          }
          // Terminal cap and the cable clamp under it.
          add(geometry.shipCylinder, dark, tip * arm.half, arm.y - 6.6, 0,
            0.95, 0.9, 0.95);
        }
      }

      // ---- Coil crown ------------------------------------------------------
      // The top of the tower, and the only place the accent colour appears:
      // three stacked toroids on a short mast, tapering upward, with the
      // glowing ring proud of each case. The crown is what makes the tower
      // belong to the gun rather than to a national grid, so it is drawn
      // GENEROUSLY - 7 m across at its widest against a 4.8 m shaft - and it
      // is the last thing on the silhouette against the sky.
      add(geometry.panel, steel, 0, SHAFT_TOP + 1.2, 0, 5.4, 2.4, 5.4);
      const CROWN = [
        { y: 35.0, r: 3.5 },
        { y: 37.2, r: 2.8 },
        { y: 39.0, r: 2.0 }
      ];
      // Each ring is a dark case with the glow standing proud AROUND its rim,
      // not above and below it. The cased-coil rule from the gun's barrel,
      // and for the same reason: a glow scaled proud on the vertical axis
      // shows its end caps, and three stacked caps of decreasing radius read
      // as a tiered wedding cake rather than as a coil stack. Proud on the
      // radius shows the band.
      for (const ring of CROWN) {
        add(geometry.shipCylinder, coilCase, 0, ring.y, 0, ring.r, 1.5, ring.r);
        add(geometry.shipCylinder, coilGlow, 0, ring.y, 0, ring.r * 1.1, 0.85, ring.r * 1.1);
      }
      // Mast through the crown, and the spike above it.
      add(geometry.panel, steel, 0, 36.5, 0, 1.0, 7, 1.0);
      add(geometry.panel, steel, 0, 40.4, 0, 0.5, 2.8, 0.5);
      // Obstruction light on the very top - the one pale mark on the crown.
      add(geometry.panel, light, 0, 41.9, 0, 0.9, 0.9, 0.9);

      // ---- Cables ----------------------------------------------------------
      // Feeders leaving both crossarms toward the gun line, and a down-lead
      // running the height of the tower into a base termination. Each feeder
      // is two straight segments at different angles, which is the cheapest
      // thing that reads as a hanging catenary rather than as a rod.
      //
      // Drawn by SPAN from the clamp under each insulator, not by eye: the
      // first cut placed four rods at guessed angles and they hung in the air
      // beside the tower, attached to nothing at either end. Each feeder now
      // starts exactly at the terminal cap's underside and runs out to a
      // notional next tower off +z, sagging on the way.
      const feeder = (x, z0, y0, z1, y1) => {
        const dz = z1 - z0, dy = y1 - y0;
        add(geometry.shipCylinder, dark, x, (y0 + y1) / 2, (z0 + z1) / 2,
          0.42, Math.hypot(dz, dy), 0.42, Math.atan2(dz, dy));
      };
      for (const arm of ARMS) {
        for (const tip of [-1, 1]) {
          // Clamp is at y = arm.y - 7.1 (the cap's underside), z 0.
          const clampY = arm.y - 7.1;
          feeder(tip * arm.half, 0, clampY, 9, clampY - 5.2);
          feeder(tip * arm.half, 9, clampY - 5.2, 19, clampY - 6.6);
        }
      }
      // Down-lead in the accent housing, running the full height on the -x
      // face, into a switch cabinet at the foot. Dark, not glowing: only the
      // crown is lit, and a second lit line would break the one-system rule.
      add(geometry.panel, coilCase, -3.4, 18, 0, 1.1, 30, 1.1);
      add(geometry.panel, dark, -3.4, 5.4, 3.6, 3.4, 4.4, 3.4);
      add(geometry.panel, steel, -3.4, 7.8, 3.6, 3.8, 0.6, 3.8);

      // Nothing on a pylon rotates, so no `dish` is returned.
    }
  });

  // ===========================================================================
  // 4. kerenCore - the fire control centre
  // ===========================================================================
  ctx.addGroundModel("kerenCore", {
    build(env) {
      const { THREE, geometry, makeAircraftMaterial,
              steel, olive, dark, light, extraMaterials, add, addRoot } = env;

      // Same single accent system again, on the dome's aperture band only.
      const coilGlow = new THREE.MeshBasicMaterial({
        color: 0x9fd8ff,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      extraMaterials.push(coilGlow);
      const coilCase = makeAircraftMaterial(0x24455c, 0.55, 0.42);
      extraMaterials.push(coilCase);

      // ---- Base block ------------------------------------------------------
      // A 40 m hardened plinth cut into the slope, stepping up twice to the
      // dome. Steps, not a single box: the whole read of this unit is "buried
      // command post with its head above ground", and a plinth with terraces
      // says that where a plain pedestal says "building".
      add(geometry.panel, dark, 0, 1.4, 0, 40, 2.8, 40);
      add(geometry.panel, olive, 0, 4.4, 0, 33, 4, 33);
      add(geometry.panel, steel, 0, 7.4, 0, 27, 2.4, 27);
      // Blast walls on the two exposed faces, with embrasure slots.
      for (const side of [-1, 1]) {
        add(geometry.panel, dark, side * 18.4, 4.4, 0, 2.6, 6, 38);
        for (let s = 0; s < 5; s += 1) {
          add(geometry.panel, steel, side * 18.4, 6.2, -15 + s * 7.5, 3.0, 1.0, 2.6);
        }
      }
      // Vehicle ramp down the -z face, so the block has a way in.
      add(geometry.panel, steel, 0, 2.6, -22.5, 9, 1.2, 9, 0.22);
      add(geometry.panel, dark, 0, 4.6, -16.8, 5.4, 4, 0.8);
      // Ventilation and generator plant along the +z face - the ordinary
      // hardware that makes the dome above read as the important part.
      for (let v = 0; v < 4; v += 1) {
        add(geometry.panel, steel, -11 + v * 7.3, 10, 15, 4.4, 3.2, 4.4);
        add(geometry.shipCylinder, dark, -11 + v * 7.3, 12.4, 15, 1.5, 2.4, 1.5);
      }

      // ---- Armoured dome ---------------------------------------------------
      // 26 m across, built as three stacked cylinders of decreasing radius
      // rather than as a sphere - the geometry cache has no hemisphere and a
      // stepped drum is what a hardened radome actually looks like anyway.
      // This is the largest single mass on the unit and it has to be, or the
      // antennas on top of it become the subject.
      add(geometry.shipCylinder, olive, 0, 10.6, 0, 13, 4, 13);
      add(geometry.shipCylinder, olive, 0, 13.8, 0, 11.4, 2.6, 11.4);
      add(geometry.shipCylinder, steel, 0, 15.8, 0, 8.8, 1.8, 8.8);
      add(geometry.shipCylinder, steel, 0, 17.2, 0, 5.6, 1.4, 5.6);
      // Segment seams: eight ribs up the dome's flank, which is what stops a
      // 26 m drum from being a featureless cylinder at every angle.
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        add(geometry.panel, steel, Math.sin(a) * 12.6, 11.4, Math.cos(a) * 12.6,
          1.6, 7.6, 1.4, 0, -a, 0);
      }
      // The aperture band: the one accent line on this unit, a lit ring
      // standing PROUD of the dome's shoulder under a dark hood. Radius 13.6
      // against the drum's 13, so it overhangs by 0.6 all the way round - the
      // first cut set it flush at 12.2 (inside the 13 drum) and the glow was
      // swallowed by the dome from every view except straight down. A lit ring
      // has to project past the surface it belongs to or it is not a ring.
      // Kept to a single band - a second one anywhere and the dome reads as a
      // lamp rather than as armour with an aperture in it.
      add(geometry.shipCylinder, coilCase, 0, 13.0, 0, 13.6, 1.5, 13.6);
      add(geometry.shipCylinder, coilGlow, 0, 13.0, 0, 13.3, 0.8, 13.3);

      // ---- Targeting radar (the dish) --------------------------------------
      // A large rectangular phased-array plate on a pivot standing off the top
      // of the dome. This is the `dish` the spec's dishSpin turns, and it is
      // the reason this unit is the CORE - a mass driver aims by knowing where
      // the target is, and this is the part that knows.
      //
      // The pivot is a Group and therefore cannot go through `add` (meshes
      // only, and into `parts`); `addRoot` is the one way to parent a subtree.
      // Returning a pivot that was never parented gives a unit whose radar is
      // nowhere - it looks perfect in a screenshot and is missing in play.
      const pivot = new THREE.Group();
      pivot.position.set(0, 18.6, 0);
      addRoot(pivot);
      const spin = (geo, material, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
        const m = new THREE.Mesh(geo, material);
        m.position.set(x, y, z);
        m.scale.set(sx, sy, sz);
        m.rotation.set(rx, ry, rz);
        pivot.add(m);
        return m;
      };
      // Turntable and yoke.
      spin(geometry.shipCylinder, steel, 0, 0.5, 0, 5.6, 1.2, 5.6);
      // Yoke arms, set at the plate's own half-width rather than at some
      // narrower figure: a yoke inboard of the panel it carries reads as a
      // stand the plate is balanced on instead of as trunnions it hangs in.
      for (const side of [-1, 1]) {
        spin(geometry.panel, steel, side * 7.8, 4.4, 0.6, 1.3, 8.6, 2.0);
      }
      // The array face itself: a broad flat plate held in the yoke and canted
      // back. The CANT was found by looking, over three passes, and it is the
      // one number on this unit that trades one view against another: at
      // -0.35 rad (20 deg) the plate stood near vertical and the TOP view saw
      // only its 0.7 m edge, so the unit's single moving part vanished in the
      // view where it should be least missable; at -0.7 (40 deg) it lay so far
      // back it read as a lid on the dome and the 3/4 views lost it instead.
      // -0.62 rad (36 deg) is where all four hold: the projected face from
      // overhead is 16 x 10.5 m, which is two thirds of the dome's own width
      // and unmistakable, and there is still 8 m of standing plate breaking
      // the skyline from the side.
      //
      // It also has to stand CLEAR of the dome. The plate is 15 m tall on a
      // pivot at y 18.6, so its centre sits 8.4 above the pivot - anything
      // lower and the bottom corner of a canted plate this size swings through
      // the dome's own crown as it turns. Pale, because it is the one surface
      // on this unit meant to be seen from the air, and 16 m wide against the
      // 26 m dome so it owns most of the width of what it stands on.
      spin(geometry.panel, light, 0, 8.4, 0.6, 16, 15, 0.7, -0.62);
      // Frame around it and a horizontal stiffener across the face, so the
      // plate is a structure rather than a card.
      spin(geometry.panel, steel, 0, 8.4, 1.2, 16.9, 15.8, 0.55, -0.62);
      spin(geometry.panel, dark, 0, 8.4, 0.1, 16.2, 0.8, 0.7, -0.62);
      // Counterweight and the feed horn behind the array, which is what makes
      // the plate read as an antenna aimed forward rather than as a billboard.
      spin(geometry.panel, dark, 0, 3.6, 2.8, 4.4, 2.4, 2.6);
      spin(geometry.shipCylinder, dark, 0, 6.6, 3.2, 0.85, 3.0, 0.85, Math.PI / 2 - 0.52);
      // A small IFF/uplink plate on the back of the yoke, riding with it.
      spin(geometry.shipOctPlate, light, 0, 10.8, 3.4, 2.2, 0.35, 2.2, -0.5);

      // ---- Fixed antenna farm ----------------------------------------------
      // Communications, not targeting: these do not turn, and they surround
      // the dome so the unit reads as the place all the wires come to. Four
      // whip masts at the corners of the plinth, two dish stubs and a horn.
      for (const cx of [-1, 1]) {
        for (const cz of [-1, 1]) {
          // Masts stand on the plinth's own corners at 11.5, which is OUTSIDE
          // the 13.6 aperture band's footprint in plan but well clear of it in
          // height - the mast foot is at y 8.6 on the steel step and the band
          // is at 13.0 on a drum of radius 13, so the two never touch.
          add(geometry.panel, steel, cx * 14.5, 13.6, cz * 14.5, 0.65, 10, 0.65);
          add(geometry.panel, steel, cx * 14.5, 19.4, cz * 14.5, 0.35, 4.4, 0.35);
          // Guy stay from the mast head down and outboard to a foot on the
          // plinth apron.
          //
          // A stay leaning in TWO axes at once cannot be placed with two Euler
          // angles read off the run's components independently - rotations do
          // not commute, and the second one turns the axis the first was
          // measured against. The second cut here did exactly that and the
          // stays came out at neither the right angle nor the right length,
          // with both ends in mid-air. The fix is to build the ROTATION FIRST
          // and take the position from it: quaternion from +Y to the unit run
          // direction, then set the mesh's own quaternion. Then the bar is
          // along the run by construction and only its length has to be right.
          const from = new THREE.Vector3(0, 1, 0);
          const dir = new THREE.Vector3(cx * 3.2, -9.0, cz * 3.2);
          const glen = dir.length();
          const stay = add(geometry.shipCylinder, dark, 0, 0, 0, 0.26, glen, 0.26);
          stay.quaternion.setFromUnitVectors(from, dir.clone().normalize());
          // Midpoint of the run: head at the mast (y 18.2), foot 9 m below and
          // 3.2 m further out along both horizontal axes.
          stay.position.set(cx * 14.5 + dir.x / 2, 18.2 + dir.y / 2, cz * 14.5 + dir.z / 2);
        }
      }
      // Two fixed comms dishes on short posts at the front of the block,
      // canted up and outboard - the pale octagons that give the base a
      // second scale of detail under the big plate.
      for (const side of [-1, 1]) {
        add(geometry.panel, steel, side * 9, 10.4, -12.5, 0.8, 4.4, 0.8);
        add(geometry.shipOctPlate, light, side * 9, 13.2, -12.5,
          3.4, 0.5, 3.4, -0.85, 0, side * 0.35);
        add(geometry.panel, dark, side * 9, 12.3, -13.2, 0.5, 1.4, 0.5, -0.85);
      }
      // The tall mast: one lattice whip carrying the long-range uplink, offset
      // from the dome so the silhouette has an asymmetric spike. This is the
      // top of the unit at y 30.
      add(geometry.panel, steel, -13, 18, 6, 1.5, 22, 1.5);
      for (let r = 0; r < 4; r += 1) {
        add(geometry.panel, steel, -13, 10 + r * 5.2, 6, 3.2, 0.5, 3.2);
      }
      add(geometry.panel, steel, -13, 29.4, 6, 0.6, 5, 0.6);
      add(geometry.panel, light, -13, 30.4, 6, 0.9, 0.9, 0.9);
      // Cable gallery from the block out to the -x edge, where the pylon feed
      // would arrive. One line across the plinth, so the core is visibly wired
      // to the rest of the complex rather than sitting alone on its rock.
      add(geometry.panel, dark, -14, 9.2, 0, 12, 1.2, 3.4);
      add(geometry.panel, dark, -19.6, 5.4, 0, 2.6, 6.4, 4.4);

      // `dish` is the single field read off this return, and the pivot it
      // names is already parented by the addRoot above. dishSpin 0.6 turns it
      // about its own local Y for as long as the unit is alive.
      return { dish: pivot };
    }
  });
}
