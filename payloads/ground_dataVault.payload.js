export default function register(ctx) {
  const { GROUND_TYPES } = ctx.tables;

  const truckTemplate = GROUND_TYPES.tank;
  if (!truckTemplate) {
    throw new Error("[dataVault] expected the existing `tank` template");
  }

  // -------------------------------------------------------------------------
  // 1. Spec
  // -------------------------------------------------------------------------
  // Spread from `tank`, which is the only complete schema in GROUND_TYPES that
  // is BOTH mobile and `aa: null`. That combination is the whole requirement:
  // the vault truck drives a route and never shoots back, so the template has
  // to be an unarmed vehicle rather than fuelTank (static) or adTank (armed).
  // Only identity, dimensions and durability are overridden below.
  ctx.addGroundType("dataVault", {
    ...truckTemplate,
    key: "dataVault",
    label: "DATA VAULT",
    role: "Credential Transport Truck",

    // BALANCE TODO: placeholder. 130 is "two missiles and a bit" - above the
    // MBT's 110 because the payload is a hardened safe rather than a crew
    // compartment, and the escort side of the mission needs the truck to
    // survive a stray hit rather than pop on the first one. Not tuned against
    // any authored mission; revisit when M31 exists.
    hp: 130,

    // Measured off the build below, not guessed: the drawn envelope is
    // x -2.05..2.05, y 0..5.9, z -7.09..6.91 - 14.0 m long, 3.6 m across the
    // body (4.1 m over the mirrors), 5.9 m to the top of the roof placard,
    // wheels sitting exactly on y=0 like the tank's tracks do.
    //
    // hitBox is rounded outward from that envelope the way the other vehicles'
    // are; hitRadius is half the plan diagonal, rounded up.
    hitRadius: 19,
    hitBox: { x: 8, y: 8, z: 14 },
    crash: { halfLen: 7, halfBeam: 3.6, top: 5.9 },
    smokeHeight: 5.5,

    // BALANCE TODO: placeholder. Unarmed by inheritance - the courier's whole
    // defence is its escort, and giving it a gun would make the escort
    // pointless.
    aa: null,

    // BALANCE TODO: placeholder. Slower and less nimble than the MBT it is
    // spread from: a loaded 14 m armoured truck. Values are eyeballed against
    // convoyTruck (19) and mlrs (12), not measured against a route.
    mobile: {
      speed: 13,
      turnRate: truckTemplate.mobile.turnRate * 0.85
    },

    // BALANCE TODO: placeholder. Warm amber on the radar so a protect-this
    // contact is not the same colour as the things shooting at it.
    radarColor: "#ffd089",
    tracerColor: 0xffb06a,
    explosionColor: 0xffa348
  });

  // -------------------------------------------------------------------------
  // 2. Geometry
  // -------------------------------------------------------------------------
  // Built nose-along -Z, which is the forward the baked route heading drives -
  // same convention as the inline tank and train cars.
  //
  // The silhouette has to say "sealed box on wheels" from a kilometre up, and
  // three things do all of that work: a cab that is visibly SMALLER than what
  // it is towing, a container that is windowless and ribbed all the way round,
  // and a hazard stripe that wraps the whole body. Everything else is running
  // gear.
  ctx.addGroundModel("dataVault", {
    build(env) {
      const { geometry, makeAircraftMaterial, steel, dark, light, markings,
              extraMaterials, add } = env;

      // Two materials of its own, because the brief is a body DARKER than the
      // surrounding units plus one warning accent, and the four themed
      // standards have no colour in that range - `dark` is the near-black used
      // for shadow gaps, and painting a 14 m body in it would lose the panel
      // reads. Both go into extraMaterials or they leak with the model.
      const hullPaint = makeAircraftMaterial(0x3c4249, 0.28, 0.7);
      const hazard = makeAircraftMaterial(0xd9a13a, 0.2, 0.68);
      extraMaterials.push(hullPaint, hazard);

      // ---- Running gear --------------------------------------------------
      // Chassis rails the whole 14 m, then three axles: one under the cab and a
      // tandem pair under the container, which is where the mass is. A plain
      // band per side reads as wheels once the truck is moving, the same trick
      // the tank's road wheels use, and costs two boxes instead of twelve.
      // Everything here is kept INBOARD of the 3.4 m body: a chassis that
      // overhangs the bodywork reads as a flatbed trailer from above, which is
      // the opposite of what this unit is.
      add(geometry.panel, dark, 0, 1.4, 0.3, 2.6, 1.0, 12.8);
      add(geometry.panel, dark, -1.5, 0.9, -3.9, 0.65, 1.8, 2.5);
      add(geometry.panel, dark, 1.5, 0.9, -3.9, 0.65, 1.8, 2.5);
      add(geometry.panel, dark, -1.5, 0.9, 3.3, 0.65, 1.8, 5.4);
      add(geometry.panel, dark, 1.5, 0.9, 3.3, 0.65, 1.8, 5.4);

      // ---- Cab -----------------------------------------------------------
      // Deliberately short (3.6 m of the 14) and lower than the container, so
      // the box is what the eye lands on. Armoured: a slab front with a small
      // slit windscreen rather than a glasshouse. Pushed back until it touches
      // the vault's front face - a visible gap between cab and load makes the
      // two read as two separate vehicles.
      add(geometry.panel, hullPaint, 0, 2.9, -4.65, 3.3, 2.9, 3.9);
      // Deck plate bridging the cab to the vault's front face, so the two read
      // as one vehicle carrying a load rather than as a truck parked in front
      // of a box.
      add(geometry.panel, hullPaint, 0, 1.95, -2.5, 3.1, 0.6, 1.6);
      add(geometry.panel, hullPaint, 0, 3.65, -6.3, 3.1, 1.9, 1.0, 0.34);
      add(geometry.panel, dark, 0, 3.9, -6.4, 2.4, 0.55, 0.45, 0.34);
      // Bumper and grille.
      add(geometry.panel, steel, 0, 1.7, -6.5, 3.2, 0.9, 0.45);
      add(geometry.panel, dark, 0, 2.5, -6.5, 2.3, 0.9, 0.3);
      // Exhaust stack up the back of the cab, and mirrors - three cheap parts
      // that say "truck" rather than "APC". The mirrors are the only thing on
      // the vehicle outboard of the body, and they are 0.2 m of it per side.
      add(geometry.shipCylinder, dark, -1.45, 4.6, -3.1, 0.15, 2.6, 0.15);
      add(geometry.panel, dark, -1.8, 3.9, -5.9, 0.5, 0.45, 0.12);
      add(geometry.panel, dark, 1.8, 3.9, -5.9, 0.5, 0.45, 0.12);

      // ---- Vault container ------------------------------------------------
      // THE unit. A sealed armoured safe on the bed: 9 m long, full width,
      // taller than the cab, and it has no windows anywhere - the only
      // openings modelled are a locked rear hatch and two small vents.
      //
      // The walls are the OUTERMOST surface and the ribs are shallow strips
      // laid on them (0.06-0.1 m proud). An earlier pass had the ribs standing
      // 0.3 m off the skin, and a box behind deep vertical posts stops reading
      // as sealed at all - it reads as an open gondola with stanchions.
      // Bed frame, inset behind the container walls and in the body colour: a
      // bright slab wider than the box turns the load into a pallet on a
      // flatbed, which is the read this unit must not have.
      add(geometry.panel, hullPaint, 0, 1.95, 2.2, 3.2, 0.6, 8.4);
      add(geometry.panel, hullPaint, 0, 3.85, 2.2, 3.4, 3.4, 8.6);
      // Corner posts, in the body colour rather than bare steel. Two rounds of
      // previews said the same thing: any bright vertical member standing off
      // this box turns the flank into a cage and the walls into the gaps
      // between bars. The posts have to be part of the WALL, so they are the
      // hull colour and only 0.05 m proud.
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          add(geometry.panel, hullPaint, sx * 1.74, 3.85, 2.2 + sz * 4.06, 0.16, 3.44, 0.5);
        }
      }
      // Reinforcing ribs: three hoops, each a thin strip over the roof and one
      // down each flank. Thin in Z (0.24 m) as well as shallow, because the
      // face the camera sees on a flank rib is its Z-facing side, and a deep
      // rib shows a wide bright band there whatever its thickness.
      for (const rib of [-2.4, 0, 2.4]) {
        add(geometry.panel, steel, 0, 5.62, 2.2 + rib, 3.42, 0.12, 0.24);
        add(geometry.panel, steel, -1.73, 3.85, 2.2 + rib, 0.08, 3.4, 0.24);
        add(geometry.panel, steel, 1.73, 3.85, 2.2 + rib, 0.08, 3.4, 0.24);
      }
      // Roof cap, slightly proud of the walls so the top edge catches light.
      add(geometry.panel, hullPaint, 0, 5.58, 2.2, 3.5, 0.36, 8.7);

      // Rear face: a locked double hatch, set into a bright steel surround with
      // a central lock pillar, a lock housing and hinge straps. This is the
      // only way into the box, so it is the one part of the container that is
      // not blank - and it is drawn in STEEL against the dark body because a
      // dark hatch on a dark wall is invisible from the rear, which is the
      // angle a strike runs in from.
      add(geometry.panel, steel, 0, 3.55, 6.54, 2.8, 3.2, 0.12);
      add(geometry.panel, dark, 0, 3.55, 6.62, 2.5, 2.9, 0.1);
      add(geometry.panel, steel, 0, 3.55, 6.68, 0.22, 2.9, 0.16);
      add(geometry.panel, steel, 0, 3.55, 6.72, 0.9, 0.75, 0.2);
      add(geometry.panel, hazard, 0, 3.55, 6.84, 0.36, 0.36, 0.14);
      for (const sy of [-1, 1]) {
        add(geometry.panel, steel, -1.0, 3.55 + sy * 1.1, 6.68, 0.45, 0.2, 0.16);
        add(geometry.panel, steel, 1.0, 3.55 + sy * 1.1, 6.68, 0.45, 0.2, 0.16);
      }
      // The only other openings: two small louvred vents high on the left
      // flank. Deliberately TINY and dark. A previous pass framed them in the
      // light material to make them legible and they immediately read as
      // windows, which is the one thing this container must never have - so
      // they are a shallow steel bezel around a dark slot, at a size (0.3 m
      // tall) no glazing would be, and they are allowed to disappear at range.
      for (const vz of [0.6, 4.2]) {
        add(geometry.panel, steel, -1.75, 5.05, vz, 0.06, 0.34, 0.7);
        add(geometry.panel, dark, -1.79, 5.05, vz, 0.05, 0.2, 0.56);
      }

      // ---- Warning band ---------------------------------------------------
      // One hazard stripe wrapped round the container plus a bumper stripe on
      // the cab, so the truck is identifiable as marked special cargo from any
      // of the four approaches. On the flanks and the front it runs at mid
      // height, which keeps it clear of the roof cap (an earlier pass had it
      // tucked under the cap, where it read as roof trim rather than as a
      // marking on the body). At the back it steps up over the hatch surround
      // instead of cutting through it. Every strip sits proud of the rib
      // strips so it is never z-fighting and is never chopped into segments.
      add(geometry.panel, hazard, -1.79, 3.85, 2.2, 0.08, 0.55, 8.6);
      add(geometry.panel, hazard, 1.79, 3.85, 2.2, 0.08, 0.55, 8.6);
      add(geometry.panel, hazard, 0, 5.32, 6.56, 3.44, 0.4, 0.08);
      add(geometry.panel, hazard, 0, 3.85, -2.14, 3.44, 0.55, 0.08);
      add(geometry.panel, hazard, 0, 1.72, -6.76, 3.1, 0.45, 0.08);
      // Roof placard, in the unlit marking white - the single thing that is
      // legible from directly overhead, which is the angle the player attacks
      // or escorts this from.
      add(geometry.panel, markings, 0, 5.78, 3.2, 1.4, 0.06, 2.6);
      add(geometry.panel, light, 0, 5.78, 0.0, 2.2, 0.06, 0.5);

      // No rotating part on this unit: it carries data, not a radar. The build
      // returns nothing, which leaves `dish` null exactly as every other
      // unarmed installation already is.
    }
  });
}
