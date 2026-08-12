// SSGN - Oscar II idiom cruise-missile submarine, SURFACED (170 m).
//
// The one hull in the fleet that is only a target part of the time: it can be
// hit while it is on the roof, and the whole read has to be "that is a
// submarine, and its hatches are OPEN" from a kilometre up, in the second
// before it goes under.
//
// Everything about the silhouette is chosen against the surface combatants it
// will be sitting next to on the radar, because the triage decision is which
// blip to spend the round on:
//   * NO superstructure block, NO mast, NO funnel, NO deck clutter. The frigate
//     and the Aegis are both "long hull carrying a tall building"; this is a
//     bare cigar with one fin on it. At range the absence is the identity.
//   * NO knife bow. geometry.shipBow appears nowhere in this file - a surfaced
//     boat shows a blunt rounded nose, not a flared clipper stem, and that is
//     the fastest way to tell it from the frigate in a top-down glance.
//   * a LOW freeboard: the casing crown sits at y 7.2 against the frigate's
//     7.7 deck on a hull 35 m longer, so it reads as half-drowned. Nothing
//     below the waterline is drawn at all - the pressure hull's lower half is
//     simply not built, because y 0 is the sea and the game has no way to see
//     under it.
//   * ONE tall sail well forward, and it is the only vertical thing on the
//     boat.
//   * TWO ROWS of open missile hatches down the flanks. This is the most
//     important feature in the file and it is drawn as hardware three times
//     over - a raised coaming ring, a dark bore sunk inside it, and the lid
//     standing up on edge beside it - so that "open" survives at any of the
//     four preview angles including straight down.
//
// Scale, measured rather than guessed. Oscar II is 154 m x 18.2 m beam with a
// sail about 9 m over the casing. Rounded to the brief's 170 m: the hull runs
// z -85 (nose) to +85 (tail) = 170 m, half-beam 9.2 m, and the sail crown at
// y 27.4 stands 20.2 m over the casing crown at 7.2. The sail is deliberately
// taller than scale - at 9 m it disappears against a 18 m beam from above, and
// the fin is the only thing that says "conning tower" rather than "log".
//
// Registration only: no mission places one, no weapon behaviour is touched.
export default function register(ctx) {
  const { SHIP_TYPES } = ctx.tables;
  const frigate = SHIP_TYPES.frigate;
  if (!frigate) {
    throw new Error("[ssgn] expected the frigate ship template to exist");
  }

  // BALANCE TODO: placeholder. hp, cruiseSpeed, turnRate and the entire `aa`
  // block are the frigate's numbers verbatim, spread in and left alone. Only
  // identity, dimensions and the subsystem layout are authored here. A real
  // pass should make this thing slow, near-blind to aircraft (a surfaced boat
  // has essentially no AA fit worth the name) and expensive to kill in the
  // window it is up - none of which is true of a Perry-class frigate.
  ctx.addShipType("ssgn", {
    ...frigate,
    key: "ssgn",
    surface: true,
    label: "SSGN",
    role: "Cruise Missile Submarine",
    // BALANCE TODO: placeholder (frigate's 196 = exactly 2 missiles).
    hp: frigate.hp,
    // Dimensions, and only these, are authored. 170 m hull, 18.4 m beam, and a
    // profile that is almost entirely below the sightline: hitBox y 29 covers
    // the sail crown at 27.4 with a hand's width to spare, and its x 20 covers
    // the 18.4 beam. Everything is measured off the model below.
    hitRadius: 74,
    crash: Object.freeze({ halfLen: 84, halfBeam: 10, top: 28 }),
    hitBox: Object.freeze({ x: 20, y: 29, z: 170 }),
    // Shallow: there is not much of it above the water to sink in the first
    // place, so a deep settle would drop the wreck out of sight instantly.
    sinkDepth: 14,
    blastSpread: 28,
    smokeOffset: -18,
    smokeHeight: 11,
    sternOffset: 82,
    bowOffset: 84,
    // BALANCE TODO: placeholder. One notional mount on the sail, at the sail's
    // own z, so the tracer at least leaves the only structure that could carry
    // a gun. `aa` itself is the frigate's, unchanged.
    aaMounts: Object.freeze([-30]),
    aaHeight: 20,
    // Destructible records for the two hatch rows and the sail.
    //
    // Every offset is a part this file actually draws, and the y values are the
    // coaming crowns rather than the casing, so each hit box sits ON the hardware:
    //   vls-port  x -7.4 / z  0  = centre of the PORT hatch row (6 coamings at
    //                              x -7.4, z -34..+34), coaming crown y 8.3
    //   vls-stbd  x  7.4 / z  0  = centre of the STARBOARD row, same numbers
    //   aa-sail   x  0   / z -30 = the sail, whose block spans z -47..-13;
    //                              y 16 is mid-fin, not the crown, so the box
    //                              covers the fin rather than floating over it
    subsystems: Object.freeze([
      Object.freeze({ key: "vls-port", kind: "vls", hitBox: Object.freeze({ x: 9, y: 7, z: 76 }), offset: Object.freeze({ x: -7.4, y: 8.3, z: 0 }) }),
      Object.freeze({ key: "vls-stbd", kind: "vls", hitBox: Object.freeze({ x: 9, y: 7, z: 76 }), offset: Object.freeze({ x: 7.4, y: 8.3, z: 0 }) }),
      Object.freeze({ key: "aa-sail", kind: "aa", hitBox: Object.freeze({ x: 16, y: 22, z: 38 }), offset: Object.freeze({ x: 0, y: 16, z: -30 }) })
    ]),
    // Cooler than the surface fleet's ambers, which is the radar's own way of
    // saying "different class of target".
    radarColor: "#9fd6c4",
    tracerColor: 0xffb04a,
    explosionColor: 0xffa348
  });

  ctx.addShipModel("ssgn", {
    build(env) {
      const { geometry, add, hull, deck, dark, light, markings } = env;

      // ---- Pressure hull ---------------------------------------------------
      // A cylinder lying along Z, 18.4 m across the beam and 170 m long, sunk so
      // that its AXIS IS AT y -1.6, i.e. BELOW the waterline. Only the top of
      // the barrel is above y 0, which is the whole trick: nothing under the
      // sea is modelled because the sea cuts it off, and the part that shows is
      // a low round back with a crown at y 7.2 and a 12 m wide wet strip at the
      // waterline where the round shoulders meet it. That is 5.6 m of freeboard
      // on a 170 m hull - a third of the frigate's proportion.
      add(geometry.shipCylinder, hull, 0, -1.6, 0, 9.2, 170, 8.8, Math.PI / 2);
      // Rounded nose and tail caps: stepped-down cylinders on the same sunken
      // axis, so the hull tapers to a blunt round nose and a blunt round tail.
      // shipBow is deliberately absent from this file - a clipper stem is the
      // one silhouette cue that would make this read as a surface combatant.
      add(geometry.shipCylinder, hull, 0, -1.6, -84, 8.2, 14, 7.8, Math.PI / 2);
      add(geometry.shipCylinder, hull, 0, -1.9, -91, 6.2, 10, 5.8, Math.PI / 2);
      add(geometry.shipCylinder, hull, 0, -2.4, -96, 3.6, 8, 3.4, Math.PI / 2);
      add(geometry.shipCylinder, hull, 0, -1.6, 84, 8.4, 14, 8, Math.PI / 2);
      add(geometry.shipCylinder, hull, 0, -1.9, 91, 6.4, 10, 6, Math.PI / 2);
      add(geometry.shipCylinder, hull, 0, -2.4, 96.5, 3.8, 8, 3.6, Math.PI / 2);
      // Boot topping: the wet band right at the waterline, the same trick the
      // frigate and the Aegis use to stop the hull dissolving into the sea.
      // Kept thin, because on this hull the waterline is most of what shows.
      add(geometry.panel, dark, 0, 0.6, 0, 15.6, 1.4, 166);

      // ---- Casing ----------------------------------------------------------
      // The flat walking deck laid along the crown. Narrow (11 m of a 18.4 m
      // beam) so the hull's round shoulders stay visible either side of it -
      // that curve is what makes the shape read as a submarine rather than a
      // barge. Painted `deck`, the one paint difference on an otherwise
      // single-colour boat.
      add(geometry.panel, deck, 0, 7.15, 0, 11, 0.5, 158);
      // Anechoic-tile break lines. Four thin dark bands across the casing, which
      // is the only surface detail on 170 m of otherwise blank hull and the
      // thing that keeps the top-down view from reading as an untextured slab.
      for (let i = 0; i < 4; i += 1) {
        add(geometry.panel, dark, 0, 7.45, -62 + i * 41, 11.4, 0.3, 1.2);
      }

      // ---- Sail (conning tower) --------------------------------------------
      // Block z -47..-13 (34 m long), x +/-3, rising from the casing at 7.2 to
      // 25.7, with a faired step on top to 27.4. Long, thin and knife-edged: the
      // Oscar's fin is a slab, not a tower, and the length is what stops it
      // looking like a deckhouse from above.
      add(geometry.panel, hull, 0, 16.4, -30, 6, 18.6, 34);
      // Rakes, and they have to be as TALL as the fin they rake or they read as
      // separate flaps lying against it - which is exactly what a short canted
      // box did the first two times this was drawn. Each spans very nearly the
      // fin's full height (y 8 to 24 against the block's 7.1 to 25.7), is
      // centred INSIDE the block's end rather than butted onto it, and is
      // rotated about x so the top edge overhangs the bottom: a leading edge
      // raked back and a trailing edge swept forward.
      add(geometry.panel, hull, 0, 16, -44.5, 6, 16.4, 9, 0.42);
      add(geometry.panel, hull, 0, 16, -15.5, 6, 16, 8, -0.38);
      add(geometry.panel, hull, 0, 26, -30, 5, 2.8, 28);
      // Sail top: the bridge cockpit cut into the crown, and the raised masts.
      // At this range the masts are what identify the fin as a conning tower.
      add(geometry.panel, dark, 0, 27.6, -38, 3.4, 0.8, 8);
      add(geometry.shipCylinder, dark, -1, 32, -30, 0.38, 11, 0.38);
      add(geometry.shipCylinder, dark, 1, 33.6, -26.5, 0.34, 14, 0.34);
      add(geometry.shipOctPlate, light, 1, 41, -26.5, 1.8, 0.35, 1.8);
      // Sail planes: the horizontal fins out of the fin's shoulders. The only
      // thing on the boat with any span, and the reason the fin reads as an
      // aerofoil rather than a chimney from the front.
      add(geometry.panel, hull, -6.6, 18.6, -28, 8, 0.8, 6, 0, 0, 0.09);
      add(geometry.panel, hull, 6.6, 18.6, -28, 8, 0.8, 6, 0, 0, -0.09);

      // ---- Missile hatches (THE feature) -----------------------------------
      // Six SS-N-19 tubes per beam, drawn as two rows of OPEN hatches at
      // x +/-7.4 running z -34 to +34 on 13.6 m centres. The pair of rows is
      // what the subsystems `vls-port` / `vls-stbd` are measured on:
      //   row centre z 0, coaming crown y 8.3, x +/-7.4 - the same three
      //   numbers, unrounded, that the two `vls` offsets above carry.
      //
      // Each hatch is four parts, because "open" has to survive the top-down
      // view, where a flat disc reads as a painted circle and a bump reads as a
      // closed lid:
      //   1. `light` coaming standing 1.1 m proud of the casing
      //   2. `dark` bore standing proud of the COAMING - the hole itself, and
      //      the reason the row reads as open rather than as twelve bumps
      //   3. `light` lid standing up on edge outboard of the bore, leaning 26
      //      deg so it is unmistakably a hinged door rather than more deck
      //   4. a `markings` ring painted around the coaming - white paint at the
      //      one place on the boat the eye is supposed to go
      for (let i = 0; i < 6; i += 1) {
        const hz = -34 + i * 13.6;
        for (const side of [-1, 1]) {
          const hx = side * 7.4;
          // Coaming: a short wide cylinder, its crown at y 8.3 (= subsystem y).
          // 3.4 m radius on a 11 m casing: the two rows take up the whole deck,
          // which is what the real boat looks like and what makes the hatches
          // the first thing read rather than a detail found later.
          add(geometry.shipCylinder, light, hx, 7.6, hz, 3.4, 1.4, 3.4);
          // The bore. The coaming is a SOLID cylinder, not a ring, so a bore
          // sunk inside it is simply invisible from above - which is the one
          // angle that has to work. It is therefore drawn as a narrower dark
          // cylinder whose top face stands 0.25 m PROUD of the coaming's,
          // reading as a dark disc inside a light annulus from overhead and as
          // an open tube mouth from every oblique angle. 2.35 m of the coaming's
          // 3.4 leaves a metre of visible lip all the way round.
          add(geometry.shipCylinder, dark, hx, 7.1, hz, 2.35, 3.5, 2.35);
          // The lid, hinged on the OUTBOARD lip and standing open on edge. Two
          // constraints fight here and both are load-bearing: leaning it far
          // enough inboard to stay inside the 9.2 m half-beam puts it over its
          // own bore and hides the hole from directly overhead, which is the
          // one angle that matters most. 26 deg of lean is the settlement - the
          // door clears the dark disc in the top-down, still reads as hinged
          // rather than as a wall, and its outer top corner reaches x 12.4,
          // outboard of the hull but well inside the 20 m hitBox. At 12 of them
          // it is the row of raised doors that carries "open" in the side view.
          add(geometry.panel, light, hx + side * 3.5, 10.8, hz, 0.6, 6.2, 6, 0, 0, side * -0.46);
          // Painted ring around the coaming: white paint at the one place on the
          // boat the eye is supposed to go.
          add(geometry.shockRing, markings, hx, 8.34, hz, 4, 4, 1, -Math.PI / 2);
        }
      }

      // ---- Stern -----------------------------------------------------------
      // Cruciform tail fins and the shaft fairings. Only the upper fin and the
      // horizontal pair are above water, which is exactly what a surfaced boat
      // shows: a small blade sticking up aft of everything else.
      // The upper rudder: a THIN blade, not a box. 1.4 m thick against 22 m of
      // chord and 13 m of height, with the leading edge raked forward off the
      // casing so it grows out of the hull instead of sitting on it. This is the
      // last vertical thing aft and it has to read as a fin at a glance,
      // otherwise it looks like deck cargo - which is what a fatter version of
      // it did look like.
      add(geometry.panel, hull, 0, 12.4, 74, 1.4, 13, 20);
      // Its leading rake, sized and rotated on the same rule as the sail's:
      // as tall as the blade it rakes and centred INSIDE the blade's end, so
      // the two read as one fin. A shorter one canted harder stood off the top
      // corner like a flag, which is the failure this line exists to avoid.
      add(geometry.panel, hull, 0, 12.4, 64.5, 1.4, 12.4, 8, -0.42);
      add(geometry.panel, dark, 0, 18.6, 75, 1.7, 1.2, 13);
      // Stern planes: the horizontal pair, right at the waterline where a
      // surfaced boat shows them as two wet blades either side of the tail.
      add(geometry.panel, hull, -8.4, 1.8, 74, 14, 1.2, 15);
      add(geometry.panel, hull, 8.4, 1.8, 74, 14, 1.2, 15);
      // Free-flood grating aft of the sail and a towed-array fairing on the
      // port quarter - two small dark blocks that keep the after casing from
      // being 80 m of nothing.
      add(geometry.panel, dark, 0, 7.5, 46, 9, 0.7, 14);
      add(geometry.panel, dark, -4.6, 7.6, 60, 1.6, 0.8, 26);
    }
  });
}
