// AH-64 APACHE — western attack helicopter geometry.
//
// The kind `ah64` already exists in HELI_TYPES (ground_heli_pack registers it)
// and registration is add-only, so calling ctx.addHeliType("ah64", ...) here
// would throw at load and take the page down with it. See the guard below:
// this file registers the TYPE only if nobody else has, which keeps the
// payload loadable on its own (`?payloads=payloads/heli_ah64.payload.js`) AND
// alongside the pack that already owns the entry.
//
// What the model has to say, in order of how badly it reads if it is missing:
//   1. TANDEM STEPPED CANOPY. Gunner low and forward, pilot raised and aft,
//      with a visible step between the two glasshouses. This is the Apache
//      silhouette; a single bubble is a different helicopter.
//   2. Chin sensor turret (TADS/PNVS) and the M230 chain gun under the nose.
//   3. Four-blade main rotor + a canted four-blade tail rotor.
//   4. Stub wings carrying two rocket pods a side.
//   5. Tailwheel undercarriage — two mains forward, one wheel right at the
//      base of the fin.
//   6. US Army olive-drab paint with a low-visibility star-and-bar.
//
// Scale: real metres, same as every other airframe in the file. Rotor disc is
// 14.6 m across (7.3 m radius), fuselage nose z=-8.6 to tail rotor z=+7.6.
export default function register(ctx) {
  const { HELI_TYPES } = ctx.tables;

  // ---- TYPE ---------------------------------------------------------------
  // Only registered when the kind is absent. Spread from the Hind, per the
  // required-key rule (the requirement set is derived from HELI_TYPES.hind, so
  // spreading it is the only way to be sure nothing is missing).
  if (!HELI_TYPES.ah64) {
    ctx.addHeliType("ah64", {
      ...HELI_TYPES.hind,
      key: "ah64",
      label: "AH-64 APACHE",
      role: "Attack Helicopter",
      // BALANCE TODO: placeholder, every number below is the Hind's with a
      // hand-waved western-gunship lean on it — faster, tighter turning,
      // standing further off — and no pass has been made on where it sits in
      // the cannon/missile range ladder against the other gunships. Only the
      // geometry-derived fields (hitBox, hitRadius, aaMounts) are authored.
      hp: 98,
      hitRadius: 11,
      // Measured off the model below: span across the wing pods is ~8 m, the
      // rotor mast tops out near y=4.2, and the hull runs z -8.6..+7.6.
      hitBox: { x: 8, y: 8, z: 18 },
      cruiseSpeed: 55,
      dashSpeed: 82,
      accel: 32,
      turnRate: HELI_TYPES.hind.turnRate * 1.18,
      climbRate: 27,
      standoff: 920,
      orbitRate: 0.2,
      // hoverBand and clearance are the load-bearing pair: an AGL band that
      // does not clear `clearance` puts the airframe through the terrain.
      // Hind's floor kept verbatim, band raised only where the Hind's already
      // sat above it.
      hoverBand: [62, 132],
      clearance: 28,
      attackRange: 2200,
      aimThreshold: 0.54,
      rotorSpin: 27,
      // The chin gun's muzzle, in metres forward of the hub. Matches where the
      // M230 barrel is modelled below (z = -5.4).
      aaMounts: [5.4],
      aaHeight: 0,
      aa: {
        range: 820,
        cooldownMin: 0.94,
        cooldownSpread: 0.7,
        damage: 8,
        maxHitChance: 0.14,
        tracers: 2
      },
      smokeHeight: 2.1,
      explosionScale: 0.88,
      radarColor: "#ff8b55",
      tracerColor: 0xffb06a,
      explosionColor: 0xffa15e
    });
  }

  // ---- MODEL --------------------------------------------------------------
  ctx.addHeliModel("ah64", {
    build(env) {
      const {
        THREE, geometry, makeAircraftMaterial,
        olive, dark, glass, light, rotorSkin,
        extraMaterials, add, addRoot
      } = env;

      // US Army olive drab. `olive` in the shared set is the Soviet green the
      // Hind wears; the Apache is a flatter, browner grey-green and the two
      // parked next to each other should not be the same paint. Made here, so
      // it MUST go into extraMaterials or it leaks on every despawn.
      const army = makeAircraftMaterial(0x565d46, 0.18, 0.78);
      extraMaterials.push(army);
      // Star-and-bar, low-vis: the US roundel is white-on-black at this size,
      // and a MeshBasic keeps it flat the way a decal is flat.
      // Kept deliberately dull: MeshBasic ignores the lighting rig, so a bright
      // value here reads as a lamp on the boom rather than as a painted decal.
      const insignia = new THREE.MeshBasicMaterial({ color: 0x6f7a83 });
      extraMaterials.push(insignia);

      // =====================================================================
      // Fuselage — narrow and deep, and it TAPERS toward the nose rather than
      // stepping down: the Apache's forward fuselage is a slim blade seen from
      // above, which is what makes the tandem seating read as tandem.
      // =====================================================================
      // Main body under the transmission. 1.5 m wide, not the 2.2 the first
      // pass used: an Apache fuselage is barely wider than a man's shoulders,
      // and a wide box turns the whole airframe into a bus with a rotor.
      // Runs z -2.5 .. +3.3: it STOPS where the boom fairing starts, so the
      // side view has a shoulder there instead of one unbroken slab from the
      // nose to the fin.
      add(geometry.panel, army, 0, 0.05, 0.4, 1.5, 1.85, 5.8);
      // Forward fuselage, narrower still, carrying the two cockpits. Long -
      // the tandem seating needs the length or there is nowhere for the step
      // to happen.
      add(geometry.panel, army, 0, -0.05, -3.9, 1.16, 1.5, 4.6);
      // Nose, tapering into the sensor mount.
      add(geometry.panel, army, 0, -0.22, -6.55, 0.98, 1.1, 1.5);
      // shipBow is a 4-sided cone; rotated -90 about x it points down -z, and
      // it is what turns the nose from a cut-off box into a nose.
      add(geometry.shipBow, army, 0, -0.28, -7.62, 0.56, 1.2, 0.62, -Math.PI / 2);
      // Belly keel: the Apache's underside is a flat plank with the ammo bay
      // in it, not a rounded belly.
      add(geometry.panel, dark, 0, -0.88, -2.2, 1.05, 0.42, 6.6);

      // =====================================================================
      // TANDEM STEPPED CANOPY — requirement #1.
      // Gunner (front) sits LOW at y~0.75 with a small flat-panel glasshouse;
      // pilot (rear) sits ~0.9 m higher and further back. The step between
      // them is a hard vertical face, not a blend, because that hard face is
      // the whole silhouette.
      // =====================================================================
      // Front (CPG) canopy: LOW, sitting on the nose deck, and forward-raked.
      // Roof at y ~ 1.36.
      add(geometry.panel, glass, 0, 0.86, -5.5, 1.14, 0.9, 2.5, -0.1);
      // Front canopy frame cap. Roof line lands at y = 1.37.
      add(geometry.panel, dark, 0, 1.37, -5.48, 1.2, 0.12, 2.5, -0.1);
      // THE STEP — the one shape this airframe cannot be recognised without.
      // A hard vertical face between the two cockpits, rising from the front
      // roof at 1.36 to the rear roof at 2.26. Drawn in paint, not glass, so
      // it reads as structure and the two hoods read as two.
      add(geometry.panel, army, 0, 1.42, -4.06, 1.18, 1.62, 0.3, 0.1);
      // Rear (pilot) canopy: taller, set back and up, and slightly wider so
      // the pilot's hood visibly overhangs the gunner's.
      // Roof line lands at y = 2.36: a full metre above the gunner's, which is
      // the step, and it is the whole point of the airframe's profile.
      add(geometry.panel, glass, 0, 1.82, -2.72, 1.26, 1.08, 2.5, -0.04);
      add(geometry.panel, dark, 0, 2.36, -2.7, 1.32, 0.12, 2.52, -0.04);
      // Canopy centre rail — the bow frame down the spine of both hoods.
      add(geometry.panel, dark, 0, 1.34, -5.48, 0.08, 0.95, 2.55, -0.1);
      add(geometry.panel, dark, 0, 2.34, -2.7, 0.08, 1.1, 2.55, -0.04);
      // Windscreen frames: one flat plate at the front of each hood, the
      // faceted look the Apache has instead of a blown bubble.
      add(geometry.panel, dark, 0, 0.95, -6.72, 1.2, 1.05, 0.1, -0.1);
      add(geometry.panel, dark, 0, 1.9, -3.94, 1.3, 1.16, 0.1, -0.04);
      // Fairing behind the pilot's head, blending the rear hood into the
      // engine deck.
      add(geometry.panel, army, 0, 1.74, -1.3, 1.2, 1.05, 1.2, 0.16);

      // =====================================================================
      // Chin sensor turret + M230 chain gun — requirement #2.
      // The turret is the double-drum TADS/PNVS ball on the nose; the gun
      // hangs BELOW and BEHIND it on a yoke, muzzle at z = -5.4 to match
      // aaMounts.
      // =====================================================================
      // PNVS drum ON TOP of the nose, ahead of the gunner's windscreen - it is
      // the smaller of the two and it sits above, which is the pair that makes
      // the Apache nose read from any forward angle.
      add(geometry.shipCylinder, dark, 0, 0.4, -7.45, 0.3, 0.52, 0.3, 0, 0, Math.PI / 2);
      add(geometry.shipOctPlate, glass, 0, 0.4, -7.73, 0.2, 0.1, 0.24, Math.PI / 2);
      // TADS ball UNDER the nose - the big double-drum, and the thing the
      // Apache is recognised by head-on.
      add(geometry.shipCylinder, dark, 0, -0.62, -7.35, 0.5, 0.96, 0.5, 0, 0, Math.PI / 2);
      // Sensor faces: two flat windows on the front of the ball.
      add(geometry.shipOctPlate, glass, -0.24, -0.62, -7.86, 0.22, 0.1, 0.3, Math.PI / 2);
      add(geometry.shipOctPlate, glass, 0.24, -0.62, -7.86, 0.22, 0.1, 0.3, Math.PI / 2);
      // Chain gun turret ring and receiver, slung under the forward fuselage
      // at the fuselage station the M230 actually hangs from.
      add(geometry.shipCylinder, dark, 0, -0.98, -3.5, 0.26, 0.42, 0.26);
      add(geometry.panel, dark, 0, -1.42, -3.7, 0.34, 0.5, 1.1);
      // Trunnion arms either side of the receiver.
      add(geometry.shipCylinder, dark, -0.3, -1.5, -3.7, 0.14, 0.5, 0.14, 0, 0, Math.PI / 2);
      add(geometry.shipCylinder, dark, 0.3, -1.5, -3.7, 0.14, 0.5, 0.14, 0, 0, Math.PI / 2);
      // The barrel. Ends at z = -5.4: that is the aaMounts muzzle, so the
      // tracers leave the gun rather than the middle of the nose.
      add(geometry.shipCylinder, dark, 0, -1.5, -4.6, 0.085, 1.55, 0.085, Math.PI / 2);
      // Muzzle.
      add(geometry.shipCylinder, light, 0, -1.5, -5.34, 0.12, 0.2, 0.12, Math.PI / 2);

      // =====================================================================
      // Stub wings and stores — requirement #4.
      // Short, thick, slightly ANHEDRAL pylons: two 19-shot rocket pods per
      // side, inboard and outboard, on visible pylon stubs.
      // =====================================================================
      for (const side of [-1, 1]) {
        // Wing root fairing where the stub meets the fuselage.
        add(geometry.panel, army, side * 0.86, 0.2, -0.5, 0.6, 0.9, 2.0);
        // The stub itself: the Apache's wing is 5.2 m tip to tip, so 2.6 m a
        // side measured from centreline - it is a SHORT wing and stretching it
        // to clear the rotor turns the airframe into a Hind.
        add(geometry.panel, army, side * 1.75, 0.1, -0.5, 1.9, 0.32, 1.9, 0, 0, side * 0.08);
        // Wingtip end plate with the ECM/chaff can on it.
        add(geometry.panel, dark, side * 2.62, 0.03, -0.5, 0.16, 0.6, 1.7);
        add(geometry.shipCylinder, light, side * 2.62, 0.36, -0.9, 0.13, 0.8, 0.13, Math.PI / 2);

        // Two pylons a side, hanging the stores below the stub.
        for (const px of [1.15, 2.15]) {
          add(geometry.panel, dark, side * px, -0.36, -0.5, 0.3, 0.62, 1.0);
          // 19-shot rocket pod: fat cylinder, laid along the airframe. Hung a
          // clear 0.3 m below the belly plank so it reads as ordnance on a
          // pylon and not as part of the hull.
          add(geometry.shipCylinder, dark, side * px, -0.92, -0.5, 0.33, 2.1, 0.33, Math.PI / 2);
          // Pod muzzle face, so the tube reads as something with rockets in it
          // rather than as a fuel tank.
          add(geometry.shipCylinder, army, side * px, -0.92, -1.5, 0.35, 0.18, 0.35, Math.PI / 2);
          add(geometry.shipOctPlate, light, side * px, -0.92, -1.62, 0.26, 0.06, 0.26, Math.PI / 2);
        }
      }

      // =====================================================================
      // Engine nacelles + transmission deck.
      // The two T700s sit HIGH and OUTBOARD on the sides of the mast, with
      // their exhausts kicked outward — another strong Apache read from the
      // rear three-quarter.
      // =====================================================================
      for (const side of [-1, 1]) {
        // Nacelle: ~1 m across, tucked against the transmission rather than
        // slung out on a pylon. The first pass had these at 1.24 m diameter
        // standing proud of the hull and they read as drop tanks.
        add(geometry.shipCylinder, army, side * 0.92, 1.5, 0.9, 0.46, 2.6, 0.5, Math.PI / 2);
        // Intake, forward end, with a dark plug in it.
        add(geometry.shipCylinder, dark, side * 0.92, 1.55, -0.36, 0.38, 0.22, 0.42, Math.PI / 2);
        // Exhaust - the "black hole" suppressor, canted out and up.
        add(geometry.shipCylinder, dark, side * 1.06, 1.58, 2.24, 0.38, 0.75, 0.42, Math.PI / 2, side * 0.36, 0);
      }
      // Transmission hump between the nacelles.
      add(geometry.panel, army, 0, 1.55, 0.5, 1.0, 0.9, 2.8);
      // Rotor mast and hub. The Apache's mast is TALL and bare - a long
      // exposed shaft under the head, which is most of the "high hub" read.
      add(geometry.shipCylinder, dark, 0, 2.4, 0.4, 0.22, 1.5, 0.22);
      add(geometry.shipCylinder, light, 0, 3.2, 0.4, 0.42, 0.36, 0.42);

      // =====================================================================
      // Tail boom, fin and stabilator.
      // The boom is slender and rises slightly; the fin is a broad swept
      // triangle with the tail rotor on its LEFT side, and the stabilator sits
      // low and full-span at the very back.
      // =====================================================================
      // Slender - 0.72 m across, half the hull's width. A boom as thick as the
      // fuselage is what made the first pass read as one long slab.
      add(geometry.shipCylinder, army, 0, 0.66, 5.5, 0.34, 4.4, 0.38, Math.PI / 2);
      // Boom-to-body fairing so the transition is not a butt joint.
      add(geometry.panel, army, 0, 0.62, 3.2, 0.9, 1.0, 2.0);
      // Fin: swept, broad at the root, carrying the tail gearbox at its top.
      // Root panel, then a taller upper panel: the fin has to reach ABOVE the
      // tail rotor's tip circle (hub 2.28 + 1.4 radius = 3.68) or the disc
      // floats off the top of the aircraft with nothing holding it.
      add(geometry.panel, army, 0, 1.6, 7.35, 0.28, 2.3, 1.9, 0.36);
      add(geometry.panel, army, 0, 3.05, 7.95, 0.24, 1.6, 1.25, 0.46);
      // Tail gearbox housing, LEFT side of the fin - that side is where the
      // Apache's tail rotor lives and the rotor below is hung to match.
      add(geometry.shipCylinder, dark, -0.32, 2.28, 7.55, 0.26, 0.4, 0.3, 0, 0, Math.PI / 2);
      // Stabilator: full-span, low, right at the back of the boom.
      add(geometry.panel, army, 0, 0.6, 7.8, 3.3, 0.16, 1.1);
      add(geometry.panel, dark, -1.55, 0.7, 7.8, 0.12, 0.5, 0.9);
      add(geometry.panel, dark, 1.55, 0.7, 7.8, 0.12, 0.5, 0.9);

      // =====================================================================
      // TAILWHEEL LANDING GEAR — requirement #5.
      // Two long trailing-arm mains under the wing roots, splayed out, and one
      // small wheel right under the fin. A tricycle nosewheel here would be
      // the wrong aircraft.
      // =====================================================================
      for (const side of [-1, 1]) {
        // Trailing arm, running down and outboard from the hull to the axle.
        add(geometry.shipCylinder, dark, side * 1.0, -1.2, -1.0, 0.11, 1.4, 0.11, 0.32, 0, side * 0.5);
        // Oleo strut, up into the wing root.
        add(geometry.shipCylinder, light, side * 0.95, -0.9, -0.3, 0.09, 1.3, 0.09, -0.42, 0, side * 0.18);
        // Wheel: a squat cylinder rolled onto its side.
        add(geometry.shipCylinder, dark, side * 1.3, -1.85, -1.5, 0.34, 0.24, 0.34, 0, 0, Math.PI / 2);
      }
      // Tailwheel under the fin — the whole point of a tailwheel airframe is
      // that the third leg is at the BACK, not under the nose.
      add(geometry.shipCylinder, dark, 0, 0.1, 7.2, 0.09, 0.85, 0.09);
      add(geometry.shipCylinder, dark, 0, -0.32, 7.2, 0.2, 0.16, 0.2, 0, 0, Math.PI / 2);

      // =====================================================================
      // Markings — requirement #6. Low-vis star-and-bar on both flanks of the
      // tail boom, and a small one on the belly plank. shipOctPlate rolled
      // 90deg about z stands the disc up against the side of the boom.
      // =====================================================================
      for (const side of [-1, 1]) {
        add(geometry.shipOctPlate, insignia, side * 0.35, 0.66, 5.1, 0.26, 0.03, 0.26, 0, 0, Math.PI / 2);
        // The two bars either side of the star.
        add(geometry.panel, insignia, side * 0.36, 0.66, 4.75, 0.02, 0.13, 0.3);
        add(geometry.panel, insignia, side * 0.36, 0.66, 5.45, 0.02, 0.13, 0.3);
      }

      // =====================================================================
      // ROTORS.
      // Main: four blades on a fully-articulated hub, 14.6 m across. Drawn as
      // the translucent disc every gunship here wears plus four blade shadows
      // — `rotorSkin`, never `dark`, or this becomes a 15 m opaque plate at
      // gun range.
      // =====================================================================
      const rotors = [];

      const mainRotor = new THREE.Group();
      mainRotor.position.set(0, 3.42, 0.4);
      // shipOctPlate is a RADIUS-1 cylinder, so the scale is the radius, not
      // the diameter: 7.3 gives the Apache's 14.6 m disc. (Setting 14.6 here
      // draws a 29 m rotor and the contact sheet frames the sky instead of the
      // helicopter — that is how this was caught.)
      const disc = new THREE.Mesh(geometry.shipOctPlate, rotorSkin);
      disc.scale.set(7.3, 0.06, 7.3);
      mainRotor.add(disc);
      // Four blades, 90deg apart — the count is the Apache's, and the top view
      // is the only place it can be counted. The whole set is rolled 45deg
      // (BLADE_PHASE) so no arm lies along the fuselage or the stub wing: at
      // phase 0 two of the four hid inside the airframe and the rotor read as
      // a two-blade teetering head.
      const BLADE_PHASE = Math.PI * 0.25;
      for (let i = 0; i < 4; i += 1) {
        const angle = BLADE_PHASE + i * Math.PI * 0.5;
        const blade = new THREE.Mesh(geometry.panel, dark);
        // Half-length bar offset out to one side, so four of them make four
        // arms rather than two overlapping full-span planks.
        blade.scale.set(7.3, 0.12, 0.5);
        blade.rotation.y = angle;
        // Push the bar out along its own +x so the root sits at the hub.
        blade.position.set(Math.cos(angle) * 3.65, 0, -Math.sin(angle) * 3.65);
        mainRotor.add(blade);
      }
      // Hub cap, so the four arms meet in something.
      const hubCap = new THREE.Mesh(geometry.shipOctPlate, light);
      hubCap.scale.set(0.62, 0.3, 0.62);
      mainRotor.add(hubCap);
      addRoot(mainRotor);
      rotors.push(mainRotor);

      // Tail rotor: four blades in two offset pairs (the Apache's scissor
      // arrangement), on the LEFT of the fin. The pivot is rolled 90deg about
      // z so its local Y — the axis updateHeli spins it about — lies across
      // the aircraft.
      const tailRotor = new THREE.Group();
      tailRotor.position.set(-0.58, 2.28, 7.55);
      tailRotor.rotation.z = Math.PI / 2;
      // Radius again, not diameter: 1.4 = the Apache's 2.8 m tail disc.
      const tailDisc = new THREE.Mesh(geometry.shipOctPlate, rotorSkin);
      tailDisc.scale.set(1.4, 0.05, 1.4);
      tailRotor.add(tailDisc);
      // Scissor pair: ~55deg apart rather than 90, which is the giveaway.
      for (const angle of [0, 0.96]) {
        const blade = new THREE.Mesh(geometry.panel, dark);
        blade.scale.set(2.8, 0.09, 0.3);
        blade.rotation.y = angle;
        tailRotor.add(blade);
      }
      addRoot(tailRotor);
      rotors.push(tailRotor);

      return { rotors };
    }
  });
}
