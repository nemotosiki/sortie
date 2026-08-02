export default function register(ctx) {
  const { GROUND_TYPES } = ctx.tables;

  // ---------------------------------------------------------------------------
  // 1. Spec
  // ---------------------------------------------------------------------------
  // radarSite is the template rather than adTank because this vehicle does not
  // shoot: radarSite is the existing unarmed sensor entry (aa: null) and it
  // already carries dishSpin, which the roof dish below needs. Only label /
  // role / dimensions / HP are authored. Every combat number is inherited.
  //
  // BALANCE TODO: placeholder - hp, hitRadius, crash, smokeHeight, radarColor,
  // tracerColor, explosionColor and dishSpin are radarSite's values, unreviewed
  // for this unit. M12/M32 owns the real pass.
  ctx.addGroundType("ewVehicle", {
    ...GROUND_TYPES.radarSite,
    key: "ewVehicle",
    label: "EW VEHICLE",
    role: "Electronic Warfare Command Vehicle",
    // BALANCE TODO: placeholder (radarSite's 70).
    hp: 70,
    // Dimensions are the one thing that is NOT inherited: radarSite is a square
    // 12 m installation and this is a 10 m long, ~3.2 m wide wheeled vehicle
    // whose mast makes it 16 m tall. hitBox follows the model - x across the
    // hull, z along it, y up to the mast head - so the lock box contains the
    // mast instead of stopping at the roof.
    hitRadius: 20,
    crash: { halfLen: 5.2, halfBeam: 2.4, top: 16 },
    hitBox: { x: 7, y: 17, z: 13 },
    // BALANCE TODO: placeholder (radarSite's 7).
    smokeHeight: 7
  });

  // ---------------------------------------------------------------------------
  // 2. Model
  // ---------------------------------------------------------------------------
  // Built nose-along -Z and to real metres, the same frame every inline ground
  // branch uses: 10 m hull (z -5 .. +5), 3.2 m over the tyres, 8 wheels on four
  // axles. Part density is deliberately in the band the existing vehicles sit
  // in (adTank 13, trainLoco 17) - the mast and its antennas are where the
  // budget goes, and the chassis is built the way the tank chassis is built
  // (two runs of boxes, a sloped nose plate, one stowage box) rather than being
  // detailed for its own sake.
  ctx.addGroundModel("ewVehicle", {
    build(env) {
      const { THREE, geometry, steel, olive, dark, light, add, addRoot } = env;

      // ---- Chassis ---------------------------------------------------------
      // Eight wheels: four axles at +/-1.55 across, spaced 2.2 m apart with the
      // pair-gap in the middle that an 8x8 armoured car actually has (two
      // forward axles close together, two aft). A wheel is one squashed
      // cylinder laid on its side, which is what reads as a tyre at range.
      for (const side of [-1, 1]) {
        for (const z of [-3.5, -1.5, 1.6, 3.6]) {
          add(geometry.shipCylinder, dark, side * 1.55, 0.85, z,
            0.85, 0.5, 0.85, 0, 0, Math.PI / 2);
        }
      }
      // Hull floor / axle box tying the wheels together, so the vehicle does not
      // read as a body hovering over eight discs.
      add(geometry.panel, dark, 0, 0.95, 0, 2.6, 0.7, 9);

      // Armoured body: a flat-sided box 10 m long with a sloped bow plate. The
      // sides are vertical and the roof is flat because the roof is a working
      // deck here - it carries the mast, the dish and the whips.
      add(geometry.panel, olive, 0, 2.15, 0.2, 3.2, 2.1, 9.4);
      add(geometry.panel, olive, 0, 2.0, -4.9, 3.1, 2.2, 1.9, -0.5);
      // Cab: stepped down and forward of the equipment box, with a dark band
      // for the windscreen so the front end is identifiable from the front 3/4.
      add(geometry.panel, olive, 0, 3.15, -3.2, 3.0, 1.5, 3.0);
      add(geometry.panel, dark, 0, 3.35, -4.65, 2.5, 0.95, 0.35, -0.22);
      // Equipment shelter over the rear two thirds - the operators' box. This
      // is the surface the mast is bolted to.
      add(geometry.panel, olive, 0, 3.55, 1.6, 3.3, 2.4, 6.4);
      add(geometry.panel, steel, 0, 4.85, 1.6, 3.5, 0.3, 6.6);
      // Rear door and a generator/AC box on the flank: the two details that keep
      // the shelter from reading as a plain crate from behind and from the side.
      add(geometry.panel, dark, 0, 3.3, 4.85, 1.9, 1.9, 0.3);
      add(geometry.panel, dark, -1.85, 3.1, 2.6, 0.5, 1.2, 2.6);

      // ---- Telescopic mast (the identifier) --------------------------------
      // Erected, four visible stages tapering as they go up (0.85 -> 0.62 ->
      // 0.44 -> 0.30 across), carrying the head to 14.6 m and the crossbar to
      // 14.7 m against a 3.2 m hull. That is 4.5x the hull height and 1.5x the
      // vehicle's own 10 m length - the brief's floor is 1.5x, and clearing it
      // by height alone was not enough: the mast also has to beat the tallest
      // thing already on the ground (the armoured locomotive, ~9 m) by a margin
      // the player reads instantly.
      //
      // Stages are separate boxes with visible steps rather than one tall box
      // because the step is what says "telescopic" instead of "pole".
      add(geometry.panel, steel, 0, 5.4, 1.6, 0.85, 3.0, 0.85);
      add(geometry.panel, light, 0, 8.2, 1.6, 0.62, 3.0, 0.62);
      add(geometry.panel, steel, 0, 11.0, 1.6, 0.44, 3.0, 0.44);
      add(geometry.panel, light, 0, 13.4, 1.6, 0.3, 2.4, 0.3);
      // Guy struts off the base of the mast down to the shelter roof, fore and
      // aft. A mast this tall with nothing bracing it looks like it fell out of
      // the model. They run from y 5.0 (roof) to y 6.6 (mast), so both ends are
      // on something rather than in the air.
      add(geometry.panel, dark, 0, 5.55, 0.55, 0.18, 0.18, 2.1, 0.75);
      add(geometry.panel, dark, 0, 5.55, 2.65, 0.18, 0.18, 2.1, -0.75);

      // Mast head: a horizontal crossbar carrying a pair of dipole elements per
      // side. This is the second half of the silhouette - a bare mast is a
      // flagpole, a mast with a crossbar is an antenna.
      add(geometry.panel, dark, 0, 14.7, 1.6, 7.2, 0.28, 0.28);
      for (const side of [-1, 1]) {
        add(geometry.panel, light, side * 2.4, 15.4, 1.6, 0.2, 1.5, 0.2);
        add(geometry.panel, light, side * 3.4, 15.2, 1.6, 0.18, 1.1, 0.18);
        // Short down-leads back to the bar, so the elements read as wired to it.
        add(geometry.panel, dark, side * 2.9, 14.7, 1.6, 1.2, 0.16, 0.16);
      }

      // ---- Log-periodic whips ----------------------------------------------
      // Four raked whips off the roof corners, splayed outward. They are what
      // fills the space between the hull and the mast head, and their rake is
      // what makes the roof read as crowded rather than as a box with a pole.
      for (const side of [-1, 1]) {
        for (const z of [-1.0, 4.3]) {
          add(geometry.shipCylinder, light, side * 1.5, 6.9, z,
            0.09, 4.0, 0.09, 0, 0, side * 0.3);
        }
      }
      // Two more whips off the rear face of the shelter, raked back and shorter
      // than the four above - a log-periodic fit is a set of UNEQUAL elements,
      // and antennas cut to one length read as a fence. Raked aft rather than
      // stood upright so they clear the mast in the side and top views instead
      // of hiding behind it.
      for (const side of [-1, 1]) {
        add(geometry.shipCylinder, light, side * 1.4, 5.9, 4.7,
          0.08, 2.6, 0.08, 0.5, 0, side * 0.12);
      }

      // ---- Parabolic dish --------------------------------------------------
      // One steerable dish, canted up on its own pivot. Same construction as the
      // search radar's: an octagonal plate on a Group handed back as `dish`, so
      // updateGroundUnit sweeps it while the vehicle is alive and it stops dead
      // when the vehicle is not.
      //
      // It sits on the CAB roof, forward of everything else, rather than on the
      // shelter roof with the mast. Two attempts at putting it aft with the
      // antenna farm both ended with the plate reading as a pale blob behind the
      // mast in three of the four views: the mast, the guy struts and the whips
      // all occupy that airspace, and a dish is only legible against empty sky.
      // The cab roof is the one clear platform on the vehicle.
      const dishPivot = new THREE.Group();
      dishPivot.position.set(0, 4.6, -3.2);
      // The plate and its feed live on a tilted sub-group so the boom really is
      // normal to the dish face. Tilting three meshes separately, as an inline
      // branch does when it has only a plate, leaves the feed off-axis.
      const face = new THREE.Group();
      face.rotation.x = -0.7;
      dishPivot.add(face);
      const plate = new THREE.Mesh(geometry.shipOctPlate, light);
      plate.scale.set(1.9, 0.3, 1.9);
      face.add(plate);
      // Short pedestal under the plate, down onto the cab roof, so the dish
      // stands on the vehicle instead of floating an antenna's width above it.
      const pedestal = new THREE.Mesh(geometry.shipCylinder, steel);
      pedestal.scale.set(0.42, 1.0, 0.42);
      pedestal.position.set(0, -0.55, 0);
      dishPivot.add(pedestal);
      // Feed horn on its boom, standing off the face of the dish. Two parts, and
      // without them the plate reads as a table rather than as a dish.
      //
      // The boom is kept SHORT and the horn deliberately fat: a thin rod a dish
      // radius long, seen from the side, reads as an elevated gun barrel, and
      // this unit must not look like it shoots - it is the one ground unit in
      // the game whose whole identity is that it does not.
      const boom = new THREE.Mesh(geometry.panel, dark);
      boom.scale.set(0.14, 0.95, 0.14);
      boom.position.set(0, 0.6, 0);
      face.add(boom);
      const horn = new THREE.Mesh(geometry.shipCylinder, steel);
      horn.scale.set(0.5, 0.5, 0.5);
      horn.position.set(0, 1.15, 0);
      face.add(horn);
      addRoot(dishPivot);

      return { dish: dishPivot };
    }
  });
}
