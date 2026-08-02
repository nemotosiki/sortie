// SAR FLYING BOAT - US-2 style search-and-rescue amphibian, neutral livery.
//
// Support-only registration: no AIRCRAFT_ORDER entry ({ order: false }), no
// CAMPAIGNS edit, no mission touched. The airframe exists so a rescue flight
// can appear over water in a mission; wiring one in is a separate decision
// made elsewhere.
//
// Every flight number is inherited wholesale from the C-17 `transport` entry
// and marked BALANCE TODO. The work in this file is the SHAPE, and the shape
// is three things nothing else in the roster has:
//   1. a STEPPED PLANING HULL - a deep boat bottom under the forward fuselage
//      that ends in an abrupt step just aft of amidships, with the aft keel
//      raked up toward the tail. The step discontinuity must survive in the
//      pure side view or the aircraft is just a fat transport
//   2. a HIGH WING carrying WINGTIP FLOATS - small boat-shaped pods hung on
//      struts under the outboard wing, the one feature that says "this thing
//      lands on water" from every angle
//   3. FOUR TURBOPROPS on the wing leading edge - spinner cones and four-blade
//      discs, no afterburner and no flame anywhere, same rule the Tu-95 and
//      the E-2D follow
// Plus the neutral paint: white overall with rescue-orange bands (nose band,
// aft band, fin band, wingtip and float stripes) - the "do not shoot" livery.
//
// SCALE DERIVATION (not a guess - the roster runs a consistent metre/unit rate):
//   F-16   model spans z -10.9..9.35 = 20.3 units at theme.scale 1.00 -> 15.03 m real
//   Tu-95  model spans z -13.9..12.5 = 26.4 units at theme.scale 2.30 -> 46.2 m real
//   both land on ~0.74 m per scaled unit.
// The US-2 is 33.3 m long on a 33.2 m span, so it needs ~45 x 45 scaled units.
// This model runs z -10.1 (bow tip) to 9.9 (tailplane trailing edge) = 20.0
// model units with a 10.15 half-span, and theme.scale 2.2 puts it at 44.0 long
// by 44.7 span scaled units = 32.6 x 33.1 m - squarely between the E-2D (23.9)
// and the C-17 transport (scale 2.6), with the near-1:1 length-to-span ratio
// the real aircraft has.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;
  const transport = AIRCRAFT_TYPES.transport;
  const transportAI = ENEMY_AI_PROFILES.transport;

  if (!transport || !transportAI) {
    throw new Error("[sarFlyingBoat] expected the transport aircraft and AI templates to exist");
  }

  // Neutral rescue scheme: white hull, pale grey working surfaces, and
  // international-orange bands. Deliberately unlike every faction palette in
  // the table - Sera flies graphite, Elem flies silver-grey, and nothing else
  // is white with orange - so the aircraft reads as "neither side" before its
  // planform does. Warm turboprop exhaust stain like the E-2D and the Bear:
  // there is no afterburner on this airframe.
  const sarTheme = {
    primary: 0xf0f4f6,
    secondary: 0xc9d2d8,
    accent: 0xff7a1f,
    canopy: 0x9fd8ff,
    exhaust: 0xffc79a,
    scale: 2.2,
    variant: "sarFlyingBoat"
  };

  // ---- 1. Flight entry -----------------------------------------------------
  // Spread from `transport`: the only other unarmed, support-shaped heavy in
  // the table, so every required field arrives proven. Strip the special
  // weapon slot the same way the E-2D does - a rescue aircraft carries
  // nothing.
  // BALANCE TODO: placeholder. Every flight-model number below (speeds, rates,
  // damping, stall, HP) is the C-17's, unreviewed for a smaller seaplane that
  // should really fly lower and slower. Only identity, dimensions and theme
  // are authored here.
  const { spw: _noPlayerSpecialWeapon, ...unarmedBase } = transport;
  ctx.addAircraft("sarFlyingBoat", {
    ...unarmedBase,
    id: "sarFlyingBoat",
    label: "SAR FLYING BOAT",
    role: "Search and Rescue Amphibian",
    tag: "SUPPORT",
    enemyOnly: true,
    blurb: "中立の救難飛行艇。段差のついた艇体で荒れた海面にも降り、遭難者を拾い上げる。武装は無い。白い機体に走る橙帯は「撃つな」の印だ。",
    // Geometric wingtip, in model units, for the contrail anchor. Matches the
    // planform's half-span (10.15) and the orange tip panel's mid-chord z, so
    // the vortex leaves the actual tip.
    tipSpan: 10.15,
    tipZ: 0.05,
    theme: sarTheme
  }, { order: false });

  // ---- 2. AI profile -------------------------------------------------------
  // BALANCE TODO: placeholder. Spread from the transport profile - unarmed
  // (attackRange 0 rejects every shot in attemptEnemyAttack), no missile
  // profile. Only the hitbox/explosion size, the search pattern and the radar
  // colour are authored, and all follow from what this aircraft is: a smaller
  // airframe than the C-17 that orbits a datum low over the water rather than
  // transiting.
  const { rearGun: _noRearGun, rearGunOffset: _noRearGunOffset, ...unarmedAI } = transportAI;
  ctx.addEnemyProfile("sarFlyingBoat", {
    ...unarmedAI,
    label: "RESCUE",
    // 2.2 theme scale against the transport's 2.6 at hitboxScale 3.0.
    hitboxScale: 2.5,
    explosionScale: 1.5,
    // A searcher holds a racetrack over its datum rather than crossing the
    // map, and holds it LOW - verticalBias 18 against the transport's 24.
    patrolPathScale: 0.35,
    verticalBias: 18,
    verticalAmplitude: 4,
    verticalFrequency: 0.16,
    // Amber on the scope: not the hostile red family, not the friendly green
    // the transport target wears - a third thing, which a neutral is.
    radarColor: "#ffcf7a",
    tracerColor: 0xffcf7a,
    explosionColor: 0xffc46a,
    theme: sarTheme
  });

  // ---- 3. Model ------------------------------------------------------------
  ctx.addAircraftModel("sarFlyingBoat", {
    // Top view in the shared 40x44 box, nose up. Traced off the model rather
    // than drawn freehand: every vertex is a real part station run through
    // x = 20 + 1.8*mx, y = 1.5 + 2.0*(mz + 10.1), so the outline and the
    // aircraft cannot drift apart.
    //
    // Reading down the page: the beamy hull, the straight high wing with TWO
    // nacelle-and-prop bumps breaking forward of each leading edge (four
    // engines is the read), the tip float pods trailing aft of the outboard
    // trailing edge, and the T-tailplane drawn at its own aft station.
    //
    // The float notch moved with the parts: the pods are now at model x
    // +/-9.5 (they were 8.3), so their outline sits at 20 +/- 1.8*9.5 = 2.9 /
    // 37.1 and runs from the bow cone tip at model z -2.4 to the body tail at
    // 2.3, i.e. y 16.9..26.3 - protruding AFT of the outboard trailing edge
    // rather than being swallowed by it, which is exactly the correction the
    // 3D pass made.
    //
    // The wing trailing edge moved with it too: root TE is now model z 2.35
    // (y 26.4) and tip TE z 1.4 (y 24.5), against the first pass's 2.9 / 0.75.
    // That is the same de-delta-ing the 3D planform got - a TE raking 4.3 of
    // y over the half-span drew a triangle, 1.9 draws a transport wing.
    silhouette:
      "M20 1.5 L21.3 4.5 L22.6 9.7 L22.5 19.1 L24.6 19 " +
      "L24.6 13.3 L27 13.3 L27 18.9 L30.7 18.7 " +
      "L30.7 13.5 L33.1 13.5 L33.1 18.5 L38.3 20.6 L38.3 24.5 " +
      "L37.8 24.5 L37.8 26.3 L36.4 26.3 L36.4 24.8 L24.7 26.4 " +
      "L21.2 33.5 L20.9 36 L28.1 37.5 L28.1 39.9 L21.1 41 L20 41.6 " +
      "L18.9 41 L11.9 39.9 L11.9 37.5 L19.1 36 L18.8 33.5 L15.3 26.4 " +
      "L3.6 24.8 L3.6 26.3 L2.2 26.3 L2.2 24.5 L1.7 24.5 L1.7 20.6 " +
      "L6.9 18.5 L6.9 13.5 L9.3 13.5 L9.3 18.7 " +
      "L13 18.9 L13 13.3 L15.4 13.3 L15.4 19 L17.5 19.1 L17.4 9.7 L18.7 4.5 Z",

    build(env) {
      const {
        geometry, extrudedSurface, verticalSurface,
        primary, secondary, accent, canopy, dark, light, navL, navR,
        add, addProp
      } = env;

      // ---- Planforms ------------------------------------------------------
      // A long STRAIGHT high wing: half-span 10.15 on a 20-long body, leading
      // edge nearly unswept (0.6 of rake over the whole half-span against a
      // fighter's 3-6), constant centre section over the hull, gentle taper
      // outboard.
      //
      // The taper is the number the render forced. The first pass ran a 4.6
      // root chord against a 1.8 tip - ratio 0.39, and with all of it on the
      // trailing edge the top view drew a DELTA, not a transport wing. This
      // runs 3.9 root against 2.35 tip (ratio 0.60, which is the real
      // aircraft's), and splits the taper between both edges so the trailing
      // edge stays nearly straight. A high-aspect straight wing is what a
      // patrol seaplane has and what separates this shape from every fighter
      // in the roster; a delta would have thrown that away.
      const wingSar = extrudedSurface([
        [0, -1.55], [2.6, -1.5], [10.15, -0.95], [10.15, 1.4], [2.6, 2.35],
        [0, 2.35], [-2.6, 2.35], [-10.15, 1.4], [-10.15, -0.95], [-2.6, -1.5]
      ], 0.42);

      // T-tailplane, drawn as its own surface and mounted on the FIN TIP, not
      // the fuselage: a flying boat lifts its tailplane out of the spray, and
      // the high crossbar is half the aircraft's side-view identity. Half-span
      // 4.5, root chord 2.45.
      const stabSar = extrudedSurface([
        [0, -1.15], [1.3, -1.05], [4.5, -0.45], [4.5, 0.75], [1.5, 1.2],
        [0, 1.3], [-1.5, 1.2], [-4.5, 0.75], [-4.5, -0.45], [-1.3, -1.05]
      ], 0.3);

      // The fin: tall (4.5) on a 3.8 root chord, leading edge swept, trailing
      // edge near-vertical, tip chord 1.85 wide enough to carry the stab.
      // verticalSurface maps shape +x onto model -z, so the swept-back tip
      // puts its leading edge at LOW positive x and its trailing edge at
      // negative x - same convention the shared fin and the YF-23's V-tail
      // blades are built with.
      const finSar = verticalSurface([
        [-1.9, 0], [1.9, 0], [0.35, 4.5], [-1.5, 4.5]
      ], 0.34);

      // ---- Fuselage tube --------------------------------------------------
      // The shared fuselage cylinder is wide at -z and narrow at +z, which is
      // exactly a boat: beamy round bow section tapering to the stern. Kept
      // fairly slim in y (0.88) because the DEPTH of a flying boat comes from
      // the planing bottom boxes below, not from a fat tube.
      add(geometry.fuselage, primary, 0, 0.5, -1.9, 0.95, 0.88, 1.0);
      // Blunt bow cone ahead of it, slightly drooped to the hull line.
      add(geometry.nose, primary, 0, 0.55, -8.5, 0.9, 0.72, 0.75);
      // Aft boom: the same tapering cylinder shortened and RAISED (y 0.95
      // against the tube's 0.5) so the rear fuselage sweeps up toward the tail
      // the way a boat's stern lifts clear of the water.
      add(geometry.fuselage, primary, 0, 0.95, 5.4, 0.68, 0.6, 0.5);
      // Rounded stern cap under the fin.
      add(geometry.canopy, primary, 0, 0.95, 8.2, 0.6, 0.5, 0.7);

      // ---- THE stepped planing hull ---------------------------------------
      // Identity feature 1, and the reason the side view cannot be mistaken
      // for a transport. The whole feature is ONE number: the vertical drop
      // between the forward keel and the afterbody keel at the step station.
      //
      // The first pass put that drop at 0.7 model units and lost it entirely -
      // the render read as a fat transport belly, because 0.7 against a 2.0
      // hull depth is inside the width of the shading gradient. This pass runs
      // the drop at 1.45 (forebody keel -2.05, afterbody keel -0.6 at the same
      // station) and walls it with a face in a CONTRASTING tone, which is what
      // finally draws it.
      //
      // NOTE ON UNITS, because the first two passes both got this wrong:
      // `geometry.panel` is a UNIT box, so the `sy` argument is the FULL
      // height and the box reaches sy/2 either side of its y. A 2.2-tall
      // forebody box at y -0.95 therefore hangs to -2.05 AND rises to +0.15,
      // which is where the second pass's "plane sitting on a brick" came from:
      // the hull box was swallowing the fuselage tube it was supposed to hang
      // under. Every box below is sized from its two EDGES, written out.
      //
      // Forward planing bottom: top edge -0.30 (tucked just under the tube's
      // -0.38 underside, so the tube still reads as a separate round body),
      // keel -1.90. Height 1.60 at y -1.10. It runs from the bow back to
      // z 0.90, where it ENDS IN A VERTICAL FACE. That face is the step.
      // Beam 2.15 - wider than the tube, so the chine stands outboard.
      add(geometry.panel, primary, 0, -1.10, -3.7, 2.15, 1.60, 9.2);
      // THE STEP FACE: a full-beam transverse wall closing the forebody at
      // z 0.90, in `secondary` so it is a different tone from the white hull
      // either side, with a `dark` shadow strip along its lower lip. Drawn as
      // a real surface rather than left to shading, because this is the one
      // part that has to survive at thumbnail size.
      add(geometry.panel, secondary, 0, -1.30, 0.90, 2.22, 1.30, 0.30);
      add(geometry.panel, dark, 0, -1.86, 0.98, 2.18, 0.30, 0.44);
      // The afterbody bottom: top edge -0.30 (continuous with the forebody's,
      // so the hull sides are one line) but keel only -0.85 at the step - a
      // 1.05 DROP against the forebody's -1.90, which is the whole feature.
      // Pitched nose-down 0.22 rad so that keel rises hard and continuously
      // toward the stern; by z 6 it has left the water line entirely, which is
      // why a flying boat's tail sits so high.
      add(geometry.panel, primary, 0, -0.575, 3.6, 1.75, 0.55, 5.6).rotation.x = -0.22;
      // The bow rake: a short wedge pitched up 0.45 so the keel sweeps up to
      // meet the bow cone - a boat bow, not a slab front. Sized off the
      // forebody's own section so the two share a chine.
      add(geometry.panel, primary, 0, -1.05, -8.5, 1.9, 1.35, 2.6).rotation.x = 0.45;
      // Spray strakes flaring off the chines either side of the forward
      // bottom, in the light detail grey - the thin lips that throw spray
      // outboard on the real hull. They stop AT the step, which is one more
      // line ending at that station and so one more thing pointing at it.
      add(geometry.panel, light, -1.16, -0.70, -4.3, 0.44, 0.16, 7.4, -0.3);
      add(geometry.panel, light, 1.16, -0.70, -4.3, 0.44, 0.16, 7.4, 0.3);
      // Dark keel line down the centre of the forward bottom, also stopping at
      // the step - so the side view has a hard dark line the length of the
      // forebody and then nothing behind it.
      add(geometry.panel, dark, 0, -1.92, -3.7, 0.34, 0.12, 8.8);

      // ---- Flight deck and cabin glazing ----------------------------------
      // Airliner-style windscreen band above the bow, not a fighter bubble.
      add(geometry.canopy, canopy, 0, 1.42, -6.4, 0.72, 0.42, 0.95);
      // Observer windows down the cabin sides - the SAR crew stations.
      add(geometry.canopy, canopy, -1.34, 0.62, -3.2, 0.12, 0.26, 1.7);
      add(geometry.canopy, canopy, 1.34, 0.62, -3.2, 0.12, 0.26, 1.7);

      // ---- High wing ------------------------------------------------------
      // Identity feature 2a: the wing rides ON TOP of the fuselage at y 2.2,
      // a full radius above the tube's centreline, on a raised fairing - so
      // the daylight between wing and hull reads from the front and the props
      // clear the spray. Nothing else in the roster mounts a straight wing
      // this high.
      add(geometry.panel, primary, 0, 1.55, 0.6, 1.9, 1.25, 5.0);
      add(wingSar, primary, 0, 2.2, 0.4);

      // ---- Four turboprops ------------------------------------------------
      // Identity feature 3. Two nacelles per side at +/-3.2 and +/-6.6, slung
      // just below the leading edge, each with a spinner cone and a four-blade
      // disc of radius 1.6 - which is the real proportion: a 4.9 m prop is
      // 6.6 scaled units = 3.2 model units across at scale 2.2. Stations 3.4
      // apart so the discs cannot overlap (1.6..4.8 and 5.0..8.2). Inner and
      // outer pairs counter-rotate per side (dir = side, then -side), and
      // there is NO flame anywhere on this aircraft.
      for (const side of [-1, 1]) {
        for (const [station, dir] of [[3.2, side], [6.6, -side]]) {
          const x = side * station;
          // Nacelle: the tapering fuselage cylinder at 1/3 z, fat end forward
          // into the airstream.
          add(geometry.fuselage, secondary, x, 1.9, -1.4, 0.44, 0.42, 0.32);
          // Spinner cone ahead of the nacelle nose, in the orange accent so
          // the four engines carry the rescue colour to the front view.
          add(geometry.nose, accent, x, 1.9, -3.6, 0.22, 0.22, 0.3);
          // The disc, just ahead of the spinner tip.
          addProp(x, 1.9, -4.0, 1.6, dir);
          // Exhaust stub aft of the nacelle, dark: a turboprop stains, it
          // does not glow.
          add(geometry.nozzle, dark, x, 1.75, 0.7, 0.5, 0.5, 0.5);
        }
      }

      // ---- Wingtip floats -------------------------------------------------
      // Identity feature 2b, and the one that says "this lands on water" from
      // every angle. The first pass hung them at +/-8.3 on a 10.15 half-span
      // and they vanished: from above the wing itself covered them, and from
      // the side they were lost against the four nacelles at the same height.
      // Two corrections, both from the render:
      //
      // - OUTBOARD to +/-9.5, right under the tip panel. At 8.3 they were
      //   mid-panel and read as a fifth and sixth engine; at 9.5 they sit at
      //   the end of the wing where a float belongs, and the top view shows
      //   them protruding past the trailing edge instead of hiding under it.
      // - DOWN to y 0.15, a full 2.05 below the wing plane, on visibly long
      //   struts. The daylight between wing and float is the feature; a pod
      //   pressed against the underside is just a pylon store.
      //
      // Each float is a tapering cylinder plus a bow cone - a little hull,
      // deliberately the same construction as the aircraft's own hull - and
      // longer than it is wide (2.9 of body against 0.7 of beam) so it cannot
      // be mistaken for a drop tank.
      for (const side of [-1, 1]) {
        const x = side * 9.5;
        // Two flat struts, fore and aft, wing underside down to the float
        // deck. Tall (sy 2.0) because the gap is the point.
        add(geometry.panel, secondary, x, 1.2, -0.5, 0.18, 2.0, 0.44);
        add(geometry.panel, secondary, x, 1.2, 1.4, 0.18, 2.0, 0.44);
        // The float: body plus bow cone, nose forward, keel below the strut
        // feet so the whole pod hangs in clear air.
        add(geometry.fuselage, primary, x, 0.15, 0.9, 0.36, 0.34, 0.4);
        add(geometry.nose, primary, x, 0.15, -1.95, 0.36, 0.3, 0.42);
        // Orange stripe along the float's shoulder, so the pod carries the
        // rescue colour out to the tip and separates from the white wing above.
        add(geometry.panel, accent, x, 0.46, 0.8, 0.8, 0.2, 2.6);
      }

      // ---- T-tail ---------------------------------------------------------
      // Tall fin on the raised stern, tailplane across its TIP with a bullet
      // fairing at the joint. The high crossbar plus the upswept boom is the
      // whole rear half of the side-view read.
      add(finSar, primary, 0, 1.3, 7.8);
      add(stabSar, primary, 0, 5.75, 8.35);
      add(geometry.canopy, secondary, 0, 5.75, 7.5, 0.3, 0.26, 0.8);

      // ---- The orange bands -----------------------------------------------
      // Rescue livery: thin accent boxes wrapped proud of the skin so they
      // read as paint bands, not cargo. Nose band ahead of the wing, aft band
      // on the boom, one across the fin, and solid orange outboard wing tips.
      add(geometry.panel, accent, 0, 0.3, -5.6, 2.9, 2.6, 1.1);
      add(geometry.panel, accent, 0, 0.85, 4.6, 2.2, 1.9, 1.0);
      add(geometry.panel, accent, 0, 3.3, 8.05, 0.44, 0.95, 2.6);
      // Tip panels pushed outboard to +/-9.85 (they were at 9.5, which is now
      // the float station - two orange boxes at the same x read as one blob).
      // At 9.85 the wing tip is orange, the float below it is white with its
      // own orange stripe, and the two separate.
      add(geometry.panel, accent, -9.85, 2.2, 0.05, 0.9, 0.56, 1.9);
      add(geometry.panel, accent, 9.85, 2.2, 0.05, 0.9, 0.56, 1.9);

      // ---- Details --------------------------------------------------------
      // Anti-glare panel ahead of the windscreen.
      add(geometry.panel, dark, 0, 1.35, -7.3, 0.6, 0.1, 1.3);
      // Search radar thimble on the bow tip, dark - the one sensor a rescue
      // aircraft carries.
      add(geometry.nose, dark, 0, 0.55, -10.0, 0.3, 0.24, 0.24);
      // Wingtip strobes at the geometric tips, agreeing with tipSpan 10.15.
      // Red left, green right.
      add(geometry.canopy, navL, -10.2, 2.2, 0.05, 0.14, 0.14, 0.14);
      add(geometry.canopy, navR, 10.2, 2.2, 0.05, 0.14, 0.14, 0.14);
    }
  });
}
