export default function register(ctx) {
  const { GROUND_TYPES } = ctx.tables;

  // adTank is the template rather than samSite because this is a WHEELED,
  // MOVING, radar-carrying vehicle: the spread brings across the full ground
  // schema plus the three optional fields this unit actually needs to be what
  // it is - `mobile` (it drives), `dishSpin` (it has a radar to spin) and the
  // `aaMounts`/`aaHeight` pair the tracer origin is measured from.
  const adTank = GROUND_TYPES.adTank;
  if (!adTank) throw new Error("[ground-laserTruck] expected GROUND_TYPES.adTank as the template");

  // ===========================================================================
  // 1. GROUND_TYPES entry
  // ===========================================================================
  //
  // BALANCE TODO: placeholder. Every combat number here - hp, the whole `aa`
  // block, `mobile`, aaMounts/aaHeight, dishSpin - is the AD TANK's, carried
  // over unexamined through the spread. Nothing about a laser has been costed:
  // a directed-energy mount that intercepts missiles is a different threat
  // model from a 600m autocannon (no travel time, no ammunition, but it can
  // only serve one target at a time), and the numbers that express that are a
  // balance pass' deliverable, not this file's. What IS authored here is the
  // dimensions - the hitbox, the crash box and the radius are measured off the
  // model below and are correct for a 12m truck.
  ctx.addGroundType("laserTruck", {
    ...adTank,
    key: "laserTruck",
    label: "LASER AAV",
    role: "Anti-Air Laser Vehicle",

    // --- Dimensions: authored for this hull, 12m overall ----------------------
    // The model runs z -6..+6 at 2.9m half-beam over the wheel arches, with the
    // turret roof at y 4.1 and the radar plate topping out near y 4.6.
    hitRadius: 16,
    // `top` is the collision ceiling, so it is the turret roof (4.2) and not
    // the radar plate - the AD TANK does the same, taking its 4 off the turret
    // and not off its dish. Flying through the sensor is intended; flying
    // through the truck is not.
    crash: Object.freeze({ halfLen: 6.2, halfBeam: 3.0, top: 4.2 }),
    hitBox: Object.freeze({ x: 7, y: 6, z: 13 }),
    // A wheeled truck is a softer target than a tracked AD gun and burns
    // taller when it goes: it is a fuel-and-electronics vehicle, not armour.
    smokeHeight: 4.5,

    // BALANCE TODO: placeholder - inherited from adTank, restated only so the
    // values are visible at the call site instead of implied by the spread.
    hp: adTank.hp,                 // 90 (one missile)
    aa: adTank.aa,                 // range 600 / damage 7 / maxHitChance 0.15
    aaMounts: adTank.aaMounts,
    // The emitter aperture sits at y 3.5 on this model rather than the AD
    // TANK's 4.6 gun line, so the tracer leaves the optics box rather than the
    // empty air above it. A dimension, not a balance number.
    aaHeight: 3.5,
    // Faster than the search radar's 0.6, same as the AD TANK's tracker: this
    // one is following a missile, and the sweep is the tell the truck is live.
    dishSpin: adTank.dishSpin,     // 1.4
    // Wheels on a road surface: quicker than a tracked chassis, and the reason
    // it is drawn as a truck at all.
    mobile: Object.freeze({ speed: 17, turnRate: adTank.mobile.turnRate }),

    // The accent colour of the whole unit - the lens below is painted in it, so
    // the blip on the radar and the glow on the model are the same colour.
    radarColor: "#7fe6ff",
    tracerColor: adTank.tracerColor,
    explosionColor: adTank.explosionColor
  });

  // ===========================================================================
  // 2. Geometry
  // ===========================================================================
  ctx.addGroundModel("laserTruck", {
    build(env) {
      const { THREE, geometry, makeAircraftMaterial,
              steel, olive, dark, light, extraMaterials, add, addRoot } = env;

      // The one material this model makes for itself: the emitter aperture.
      // Unlit and additive so it stays bright against the olive at every one of
      // the preview's four light angles and reads as something SHINING rather
      // than as a pale blue plate. Pushed into `extraMaterials` or it leaks
      // with every truck that is destroyed.
      const lensGlow = new THREE.MeshBasicMaterial({
        color: 0x8ceeff,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      extraMaterials.push(lensGlow);
      // The housing the aperture sits in - a dark cyan-tinted ring so the lit
      // disc has a rim to sit against instead of floating on a grey box face.
      const lensRing = makeAircraftMaterial(0x1c4a58, 0.5, 0.4);
      extraMaterials.push(lensRing);

      // --- Chassis -------------------------------------------------------------
      // Built nose-along -Z, which is the forward the route heading drives, the
      // same convention the tank and the train cars use.
      //
      // 12m overall (z -6..+6) on a 5.6m-wide hull. The armoured body is ONE
      // continuous box from the nose to the tail - a wheeled AFV, not a tractor
      // and a trailer - and the cab is a raised step on the front third of it
      // rather than a separate cabin with air behind it. Getting this wrong is
      // the one mistake that makes an 8x8 read as two vehicles from the side.
      // Lower hull: full-length armoured body, z -5.6..+5.8.
      add(geometry.panel, olive, 0, 1.55, 0.1, 5.4, 1.7, 11.4);
      // Sloped lower side skirts, port and starboard - the flank angle that
      // says "armoured" and catches a different light than the flat deck.
      add(geometry.panel, olive, -2.72, 1.5, 0.1, 0.5, 1.5, 11.0, 0, 0, 0.26);
      add(geometry.panel, olive, 2.72, 1.5, 0.1, 0.5, 1.5, 11.0, 0, 0, -0.26);
      // Cargo deck: the flat bed the turret stands on, over the rear half.
      // Narrower than the hull (4.2 against 5.4) so a strip of olive body shows
      // down both sides of it from directly above - a full-width steel deck
      // turns the whole rear of the vehicle into one grey rectangle in the TOP
      // view and the hull stops reading as a hull.
      add(geometry.panel, steel, 0, 2.5, 2.3, 4.2, 0.35, 6.8);
      // Deck sill down each flank - the lip that keeps the bed from reading as
      // a painted rectangle on top of the hull from a shallow angle. In the
      // hull's OWN olive, deliberately: a pale sill running the whole length of
      // the bed is the brightest thing on the vehicle from the side and from
      // astern, and it competes with the aperture - which is the one mark that
      // is allowed to win the eye on this unit.
      add(geometry.panel, olive, -2.15, 2.72, 2.3, 0.34, 0.55, 6.8);
      add(geometry.panel, olive, 2.15, 2.72, 2.3, 0.34, 0.55, 6.8);
      // Stowage: generator and coolant packs at the tail, which is what a laser
      // vehicle carries instead of ready rounds. Aft of the turret so they do
      // not crowd the aperture, in the hull's own olive with a narrow dark
      // grille slot on the tail face rather than a black end panel.
      add(geometry.panel, olive, -1.2, 3.1, 4.9, 1.7, 0.9, 1.9);
      add(geometry.panel, olive, 1.2, 3.1, 4.9, 1.7, 0.9, 1.9);
      add(geometry.panel, dark, -1.2, 3.1, 5.87, 1.3, 0.34, 0.18);
      add(geometry.panel, dark, 1.2, 3.1, 5.87, 1.3, 0.34, 0.18);
      // Tail plate, flush with the hull's aft face rather than hung off it -
      // set any further aft and it reads as a separate slab floating behind
      // the truck in the SIDE view.
      add(geometry.panel, dark, 0, 2.0, 5.72, 4.8, 1.3, 0.3);

      // --- Cab -----------------------------------------------------------------
      // Armoured forward cab: a raised crew step on the front of the same hull,
      // with a sloped glacis and a dark windscreen band. Its roof at y 3.9 sits
      // a clear metre below the turret roof, so the vehicle steps DOWN from cab
      // to deck and back UP into the mount - the profile that reads as a truck.
      add(geometry.panel, olive, 0, 3.0, -3.9, 5.0, 1.5, 3.4);
      // Sloped glacis over the front axle.
      add(geometry.panel, olive, 0, 2.85, -5.7, 4.9, 2.0, 1.8, -0.62);
      // Windscreen: dark band across the cab front, canted back.
      add(geometry.panel, dark, 0, 3.35, -5.42, 4.1, 1.0, 0.4, -0.32);
      // Cab roof lip and a small hatch, so the roof is not one flat grey face
      // from directly above. Inset rather than overhanging the full 5.4m body:
      // a pale plate wider than the cab is the brightest surface on the whole
      // vehicle from astern and pulls the eye off the mount.
      add(geometry.panel, olive, 0, 3.82, -3.9, 4.8, 0.3, 3.4);
      add(geometry.panel, dark, -1.2, 4.08, -3.3, 1.4, 0.3, 1.3);
      // Side vision blocks on the cab flanks. Small - a door-sized black
      // rectangle down the whole cab side reads as an open hole in the armour
      // from the SIDE view, which is the one cell where the cab is the subject.
      add(geometry.panel, dark, -2.52, 3.25, -4.4, 0.14, 0.6, 1.1);
      add(geometry.panel, dark, 2.52, 3.25, -4.4, 0.14, 0.6, 1.1);
      // Bumper and light clusters on the nose.
      add(geometry.panel, dark, 0, 1.5, -5.95, 4.8, 0.6, 0.7);
      add(geometry.panel, light, -1.95, 2.15, -6.05, 0.6, 0.5, 0.3);
      add(geometry.panel, light, 1.95, 2.15, -6.05, 0.6, 0.5, 0.3);

      // --- Running gear: EIGHT wheels ------------------------------------------
      // Four axles a side, in the 8x8 grouping the vehicle class actually uses:
      // a steering pair close together up front under the cab, then a driven
      // pair close together at the back under the deck, with a clear gap
      // amidships. Even spacing would read as a train of rollers; the 2+2
      // grouping is what says "eight-wheeler" from above.
      //
      // Wheels are cylinders laid on their side (rz = PI/2 rolls the cylinder
      // axis from +y onto +x, across the vehicle), 0.85 radius on a 0.62 tread,
      // with a light hub plate so the wheel has a centre and does not read as a
      // black lozenge.
      //
      // The hub sits at x +/-2.95, which is 0.25 PROUD of the hull's 2.7
      // half-beam. That overhang is the whole reason the axle count is legible
      // from directly above: wheels tucked inside the body line are invisible
      // in the TOP cell and the unit reads as a tracked box.
      for (const side of [-1, 1]) {
        for (const axleZ of [-4.5, -2.7, 2.2, 4.0]) {
          add(geometry.shipCylinder, dark, side * 2.95, 0.85, axleZ,
            0.85, 0.62, 0.85, 0, 0, Math.PI / 2);
          add(geometry.shipCylinder, steel, side * 3.28, 0.85, axleZ,
            0.4, 0.14, 0.4, 0, 0, Math.PI / 2);
        }
        // Mudguard arches over each axle pair. Set INBOARD of the hubs (x 2.72
        // against the wheel's 2.95) and narrow, so from directly above they
        // read as a fender line with the tyres showing outside it rather than
        // as a lid that hides the running gear - which is the whole point of
        // drawing eight wheels.
        add(geometry.panel, olive, side * 2.72, 1.9, -3.6, 0.42, 0.3, 4.6);
        add(geometry.panel, olive, side * 2.72, 1.9, 3.1, 0.42, 0.3, 4.4);
      }

      // --- Turret: the pivot, and the reason this file exists -------------------
      // Everything that traverses hangs off ONE group so the whole mount turns
      // together - the optics box, the aperture, the radar. Built as a Group
      // (add() only makes meshes) and parented through addRoot, then handed
      // back as `dish`: a pivot that is not parented is a turret that is
      // nowhere, and one that is not returned is a turret that never moves.
      // Base at y 2.68 - the top face of the cargo deck - and z 1.9, far enough
      // aft of the cab roof that the mount can traverse a full circle without
      // the optics box visually clipping the crew compartment.
      const turret = new THREE.Group();
      turret.position.set(0, 2.68, 1.9);
      addRoot(turret);

      const put = (geo, material, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
        const m = new THREE.Mesh(geo, material);
        m.position.set(x, y, z);
        m.scale.set(sx, sy, sz);
        m.rotation.set(rx, ry, rz);
        turret.add(m);
        return m;
      };

      // Traverse ring the mount sits on - a low drum on the deck, which is what
      // makes the box above it read as a turret rather than as freight.
      put(geometry.shipCylinder, steel, 0, 0.3, 0, 1.5, 0.35, 1.5);
      // Optics box: the main housing, wider than tall, its front face at
      // z -1.55 where the aperture goes. Deliberately a clean slab - all the
      // visual interest on this unit is meant to be the lens.
      put(geometry.panel, steel, 0, 1.35, 0, 2.9, 1.7, 3.1);
      // Roof cap and side radiator panels: three boxes, enough to keep the
      // housing from being an untextured cube at any of the four preview
      // angles, and no more.
      //
      // The cap is STEEL and narrow, not a dark full-width lid. From directly
      // above the mount is the only part of this vehicle the camera sees in
      // full, and a dark plate covering its roof turns the turret into a black
      // rectangle that reads as an open hatch in the deck rather than as a
      // housing standing on it. Light roof, dark seams: the opposite way round.
      put(geometry.panel, steel, 0, 2.3, 0.2, 2.5, 0.3, 2.5);
      put(geometry.panel, dark, 0, 2.47, 0.2, 0.5, 0.14, 2.4);
      put(geometry.panel, dark, -1.52, 1.35, 0.5, 0.22, 1.2, 2.0);
      put(geometry.panel, dark, 1.52, 1.35, 0.5, 0.22, 1.2, 2.0);

      // THE APERTURE. A large emitter lens filling most of the box's front
      // face: a dark surround ring, then the glowing disc proud of it, then a
      // faint halo plate a touch further forward so the glow has a bloom
      // instead of a hard edge.
      //
      // shipOctPlate is a squat cylinder about its own +y, so rx = PI/2 stands
      // the disc up to FACE forward along -z. Without that rotation the lens
      // lies flat on top of the box like a table top and the unit's one
      // identity mark is invisible from every angle that matters.
      put(geometry.shipCylinder, lensRing, 0, 1.35, -1.5, 1.28, 0.22, 1.28, Math.PI / 2);
      put(geometry.shipOctPlate, lensGlow, 0, 1.35, -1.72, 1.02, 0.12, 1.02, Math.PI / 2);
      put(geometry.shipOctPlate, lensGlow, 0, 1.35, -1.86, 0.66, 0.1, 0.66, Math.PI / 2);
      // Two short beam-director rails flanking the aperture, so the emitter
      // reads as aimed at something rather than as a porthole. Steel, and low
      // enough not to break the roof line: drawn dark and tall they frame the
      // lens with two black bars, and the three together read from above as a
      // slot cut in the housing instead of as hardware bolted to its face.
      put(geometry.panel, steel, -1.08, 1.7, -1.25, 0.24, 0.24, 1.5);
      put(geometry.panel, steel, 1.08, 1.7, -1.25, 0.24, 0.24, 1.5);

      // Small tracking radar on the back of the mount, canted up. It turns with
      // the turret rather than on a pivot of its own: one rotating assembly is
      // what the `dish` contract gives, and a laser that is not looking where
      // its tracker is looking would be the wrong read anyway.
      //
      // Deliberately SMALL - 1.05 across against the AD TANK's 2.6 - and kept
      // low on a short post. It is a supporting mark, and a plate any larger
      // than this is the tallest, palest thing on the vehicle and steals the
      // silhouette from the aperture, which is the part that has to read first.
      put(geometry.panel, steel, 0, 2.45, 1.3, 0.3, 0.55, 0.3);
      put(geometry.shipOctPlate, light, 0, 2.92, 1.42, 1.05, 0.18, 1.05, -0.95);
      put(geometry.panel, dark, 0, 2.74, 1.16, 0.4, 0.16, 0.6, -0.95);

      // `dish` is the only field read off this return. The spec's dishSpin 1.4
      // turns the whole mount on Y for as long as the truck is alive.
      return { dish: turret };
    }
  });
}
