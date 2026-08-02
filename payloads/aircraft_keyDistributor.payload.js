// KEY DISTRIBUTOR - the personal-key delivery aircraft: a boxy civil twin
// turboprop that hands out crypto keys to the population, one drop pallet at a
// time.
//
// Neutral/support-only registration: no AIRCRAFT_ORDER entry ({ order: false }),
// no campaign wiring, no mission touched. Every flight number is inherited
// wholesale from the transport and marked BALANCE TODO - the work in this file
// is the SHAPE, and the shape is three things (spec_model_batch3 W1 #9):
//   1. a BOXY, SMALL, twin-turboprop HIGH-WING utility airframe (Twin Otter /
//      C-27 lineage): a deep slab-sided box fuselage with a flat roof and a
//      flat belly, a straight constant-chord wing sitting ON that roof, two
//      prop discs hung under it, and bracing struts down to the lower corners
//   2. an OPEN REAR RAMP with a pallet of distribution pods riding it - the box
//      body runs full depth all the way aft and is then cut off SQUARE, so the
//      bay mouth is a real dark rectangle framed in white, with the ramp door
//      swung down below it carrying green key pods
//   3. BRIGHT CIVIL COLOURS - white body, green cheatline/tail/nacelles/wingtips
//      and a full row of cabin windows. It must read as an airline, not a
//      warplane.
//
// SHAPE NOTE - what the first pass got wrong and why the numbers below are what
// they are. Drawn initially on a 13.0 half-span against a 1.2 half-width body,
// the aircraft rendered as a glider: a wing 11x the width of its own fuselage
// leaves the body a thin plank, which kills identity #1, and a fuselage that
// tapers to a point aft leaves nothing to cut square, which kills #2. The real
// DHC-6 runs a 19.8 m span on a 1.6 m wide box - 12:1 - but it is 5.3 m TALL
// over the cabin, so what actually reads as "box" is the DEPTH, not the width.
// This pass therefore keeps a slim 1.6 half-width but takes the body to 3.4
// deep and holds that full section to a square-cut tail, and pulls the wing in
// to a 9.6 half-span so the span is 6x the body width rather than 11x. Boxy
// from the side and the front, blunt at the back.
//
// SCALE DERIVATION (not a guess - the roster runs a consistent metre/unit rate,
// measured off two shipped airframes):
//   F-16  model spans z -10.9..9.35 = 20.3 units at theme.scale 1.00 -> 15.03 m
//   Tu-95 model spans z -13.9..12.5 = 26.4 units at theme.scale 2.30 -> 46.2 m
//   both land on ~0.74 m per scaled unit.
// The spec pins this airframe at 23 m long on a 28 m span, so it needs
// ~31.1 x 37.8 scaled units. This model is drawn z -9.4 (nose cap) to 8.6 (fin
// trailing edge) = 18.0 units on a 9.6 half-span, and theme.scale 1.74 puts it
// at 31.3 x 33.4 scaled units = 23.2 m long. The span comes out 24.7 m against
// the quoted 28 m - deliberately 12% under, because the spec's own identity #1
// asks for a SMALL boxy utility machine and the honest 28 m span on this short
// a body is what produced the glider read. Length, which is the dimension a
// player compares against the transports parked next to it, is on spec to 1%.
// (The lowered ramp lip reaches z 9.9, past the fin, but it is a door hanging
// in the airstream rather than structure, so it is not counted in the length.)
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;
  const transport = AIRCRAFT_TYPES.transport;
  const transportAI = ENEMY_AI_PROFILES.transport;
  if (!transport || !transportAI) {
    throw new Error("[keyDistributor] expected the transport aircraft and AI templates to exist");
  }

  // Neutral civil livery, deliberately the brightest paint in the air roster:
  // near-white primary, leaf-green secondary for the cheatline/tail/nacelles,
  // a lighter lime accent for the spinners and pod lids. The exhaust is the
  // E-2D's warm turboprop stain - there is no afterburner here and no flame is
  // ever added, which is the same rule the Hawkeye and the Bear follow.
  const theme = {
    primary: 0xf4f7f2,
    secondary: 0x2fa15a,
    accent: 0x8ed254,
    canopy: 0x9fd9ef,
    exhaust: 0xffc79a,
    scale: 1.74,
    variant: "keyDistributor"
  };

  // ---- 1. Flight entry -----------------------------------------------------
  // Spread from `transport`: the only other unarmed, enemy-only, slow heavy in
  // the table, so every required field arrives proven (the E-2D took the same
  // route). BALANCE TODO: placeholder. Every flight-model number below (speeds,
  // rates, damping, stall, HP) is the transport's, unreviewed for an airframe
  // half its size. Only identity, dimensions and paint are authored here.
  const { spw: _noPlayerSpecialWeapon, ...unarmedBase } = transport;
  ctx.addAircraft("keyDistributor", {
    ...unarmedBase,
    id: "keyDistributor",
    label: "KEY DISTRIBUTOR",
    role: "Personal-Key Delivery Aircraft",
    tag: "SUPPORT",
    enemyOnly: true,
    blurb: "個人鍵を各地へ届ける民生の配布機。箱型の胴体に高翼と双発プロップ、開いた後部ランプから配布ポッドのパレットを送り出す。武装は無い。",
    // Geometric wingtip for the contrail anchor: the planform's half-span is
    // 9.6 and the wing is added at z -1.5, so the vortex leaves the actual tip
    // instead of a station inherited from the transport.
    tipSpan: 9.6,
    tipZ: -1.5,
    theme
  }, { order: false });

  // ---- 2. AI profile -------------------------------------------------------
  // BALANCE TODO: placeholder. Spread from the transport profile - unarmed
  // (attackRange 0 rejects every shot in attemptEnemyAttack), no missiles.
  // Only the hitbox/explosion follow the smaller airframe and the radar keeps a
  // soft neutral green so the contact reads civil, not hostile.
  ctx.addEnemyProfile("keyDistributor", {
    ...transportAI,
    label: "DISTRIBUTOR",
    hitboxScale: 1.7,
    explosionScale: 1.15,
    // Transits a delivery route rather than orbiting one station: wider path
    // than a radar orbit, lower than the heavy transport's cruise.
    patrolPathScale: 0.6,
    verticalBias: 26,
    radarColor: "#6fe896",
    tracerColor: 0x6fe896,
    explosionColor: 0xffc46a,
    theme
  });

  // ---- 3. Model ------------------------------------------------------------
  ctx.addAircraftModel("keyDistributor", {
    // Top view, 40x44 box, nose up, one closed path. Every vertex is a model
    // station run through x = 20 + 1.72*mx, y = 1.5 + 2.28*(mz + 9.4), so the
    // outline and the aircraft cannot drift apart. Reading down the page: the
    // blunt box nose, two prop-disc bulges ahead of the leading edge (the twin
    // turboprop read at HUD size), the straight constant-chord wing, the slab
    // fuselage held at CONSTANT width all the way aft, the tailplane, and then
    // the flat SQUARE tail with the ramp lip behind it. A fighter's plan view
    // comes to a point back there; a freighter with its door open ends in two
    // parallel straight lines and a flat edge, which is the whole read.
    silhouette:
      "M20 1.5 L22.75 4.4 L22.75 9.3 L25.4 9 L29.9 9 L30.6 12.4 " +
      "L30.6 16 L36.5 16.4 L36.5 21.2 L22.75 21.9 L22.75 32.3 " +
      "L28.9 33.4 L28.9 36.6 L22.75 37.5 L22.75 40.6 L23.6 40.6 " +
      "L23.6 43.2 L16.4 43.2 L16.4 40.6 L17.25 40.6 L17.25 37.5 " +
      "L11.1 36.6 L11.1 33.4 L17.25 32.3 L17.25 21.9 L3.5 21.2 " +
      "L3.5 16.4 L9.4 16 L9.4 12.4 L10.1 9 L14.6 9 L17.25 9.3 " +
      "L17.25 4.4 Z",

    build(env) {
      const {
        geometry, extrudedSurface, verticalSurface,
        primary, secondary, accent, canopy, dark, light, navL, navR,
        add, addProp
      } = env;

      // ---- Planform -------------------------------------------------------
      // A bush plane's wing: STRAIGHT and constant-chord, leading edge raking
      // back only 0.4 units over 9.6 of half-span where every fighter here
      // rakes 3-6. Chord 3.5 at the root and still 2.7 at the tip - no taper
      // worth the name, which together with the box body is the "utility
      // aircraft" read from above.
      const wingKeyd = extrudedSurface([
        [0, -1.8], [8.0, -1.65], [9.6, -1.35], [9.6, 1.35], [8.0, 1.6],
        [0, 1.7], [-8.0, 1.6], [-9.6, 1.35], [-9.6, -1.35], [-8.0, -1.65]
      ], 0.34);

      // Tailplane sized to the airframe (half-span 4.0, chord ~2.1), mounted
      // high on the fin so the plan and side views keep it clear of the ramp.
      const stabKeyd = extrudedSurface([
        [0, -1.1], [4.0, -0.75], [4.0, 0.8], [0, 1.15], [-4.0, 0.8], [-4.0, -0.75]
      ], 0.26);

      // Tall single fin, broad chord, squared tip: an airliner's tail, not a
      // fighter's swept blade. Points are (z, y); depth is thickness in x.
      const finKeyd = verticalSurface([
        [-1.9, 0], [1.6, 0], [1.35, 3.6], [-0.2, 3.6]
      ], 0.3);

      // ---- Box fuselage ---------------------------------------------------
      // Identity #1 lives or dies here. Every other fixed-wing in the roster is
      // built on the round `fuselage` cylinder; this one is the unit BOX, so it
      // has hard vertical sides, a flat roof and a flat belly.
      //
      // 3.2 wide x 3.4 DEEP x 13.4 long, z -8.0..5.4. Depth is the number that
      // matters: at 3.4 against a 3.2 width the section is very slightly taller
      // than it is wide, which is what a cargo box looks like head-on, and it
      // is more than twice the depth the first pass used. It also gives the
      // cabin windows, the cheatline and the bay mouth room to be separate
      // features on the flank instead of stacking into one green stripe.
      add(geometry.panel, primary, 0, 0, -1.3, 3.2, 3.4, 13.4);
      // Short nose box, one step narrower and lower and stepped DOWN from the
      // cabin roof (the flight deck of a high-wing box sits below the cargo
      // ceiling), then a squashed-sphere cap. A cone here would turn the front
      // end into a fighter radome.
      add(geometry.panel, primary, 0, -0.42, -8.6, 2.7, 2.4, 1.9);
      add(geometry.canopy, primary, 0, -0.5, -9.3, 1.3, 1.05, 0.6);
      // Two-pane airline windscreen wrapped onto the front of the nose box,
      // plus the dark anti-glare panel on top of it.
      add(geometry.canopy, canopy, 0, 0.28, -9.45, 1.25, 0.75, 0.55);
      add(geometry.canopy, canopy, -1.0, 0.24, -9.2, 0.5, 0.7, 0.55, 0.24);
      add(geometry.canopy, canopy, 1.0, 0.24, -9.2, 0.5, 0.7, 0.55, -0.24);
      add(geometry.panel, dark, 0, 0.73, -8.6, 2.1, 0.1, 1.5);

      // Civil livery down the flanks. Three separate bands on a deep slab:
      // the cabin WINDOW ROW up high (the detail that says airline rather than
      // freighter), the green cheatline below it, and a second thin green trim
      // line along the belly corner. Each stands 0.03 proud of the 1.6
      // half-width so it paints the slab instead of z-fighting inside it.
      // ONE green line only. An earlier pass ran a cheatline, a separate belly
      // trim line and green gear sponsons all down the same flank, and the side
      // view came out more green than white - which loses identity #3, because
      // "bright civil" is a WHITE aeroplane wearing a green stripe, not a green
      // aeroplane. The livery is now the window row, one cheatline, and the
      // tail/nacelles/wingtips; everything else on the body stays white.
      for (const side of [-1, 1]) {
        add(geometry.panel, canopy, side * 1.63, 0.95, -2.4, 0.06, 0.44, 9.6);
        add(geometry.panel, secondary, side * 1.63, 0.05, -1.3, 0.09, 0.5, 13.4);
        add(geometry.panel, secondary, side * 1.38, -0.7, -8.6, 0.09, 0.42, 1.9);
      }

      // ---- High wing and struts -------------------------------------------
      // On the ROOF at y 1.95, sitting on a shallow centre-section fairing that
      // spans the full body width: a wing over the box rather than through it
      // is the second half of identity #1, and it is what leaves room for the
      // prop discs to hang below the leading edge.
      add(geometry.panel, primary, 0, 1.78, -1.5, 3.4, 0.4, 4.0);
      add(wingKeyd, primary, 0, 1.98, -1.5);
      // Green wingtip caps carry the livery out to the tips.
      add(geometry.panel, secondary, -8.95, 1.98, -1.6, 1.5, 0.4, 2.8);
      add(geometry.panel, secondary, 8.95, 1.98, -1.6, 1.5, 0.4, 2.8);
      // Lift struts from the lower fuselage corner (x 1.6, y -1.3) to the wing
      // underside at x 5.4: the single most Twin Otter thing on the aircraft,
      // and visible in the front and side views where the wing itself is only a
      // line. Run through Rz: a unit-y panel rotated by -1.093 points its long
      // axis along (0.888, 0.460), which is exactly the corner-to-wing vector
      // (3.8, 1.97)/4.28 - so the strut lands on both ends instead of floating.
      add(geometry.panel, secondary, 3.5, -0.32, -1.5, 0.15, 4.28, 0.34, -1.093);
      add(geometry.panel, secondary, -3.5, -0.32, -1.5, 0.15, 4.28, 0.34, 1.093);

      // ---- Twin turboprops ------------------------------------------------
      // Two nacelles slung under the wing at +/-3.4, each with a spinner cone
      // and a four-blade disc OUT AHEAD of the leading edge where the side view
      // can see it. Discs turn opposite ways (dir = side). Radius 2.5 is
      // deliberately oversized against the 9.6 half-span, because the disc is
      // the entire "propeller aircraft" read at combat distance. NO flames
      // anywhere on this airframe.
      // The nacelle centre sits at y 1.05, a full 0.93 BELOW the wing plane at
      // 1.98, and the pod is 1.9 units tall - so roughly half of it hangs in
      // clear air under the leading edge. Drawn at the earlier y 1.15 with the
      // wing fairing 0.4 thick above it, the pods were buried in the planform
      // and read as two green patches painted on top of the wing, which took
      // the twin-engine layout out of the front and side views entirely and
      // left the prop discs spinning on bare stalks.
      for (const side of [-1, 1]) {
        // Long nacelle body, extended well aft of the trailing edge the way a
        // turboprop's exhaust fairing runs, so it is a POD with length rather
        // than a bulge at the wing root.
        add(geometry.panel, primary, side * 3.4, 1.05, -1.9, 1.5, 1.9, 6.0);
        // Green nacelle nose cowl - the livery detail that separates the pod
        // from the white wing above it at thumbnail size.
        add(geometry.rearBody, secondary, side * 3.4, 1.05, -4.75, 0.78, 0.78, 0.95);
        add(geometry.nose, accent, side * 3.4, 1.05, -5.6, 0.3, 0.3, 0.36);
        // addProp builds its four blades in `dark`, and on a dark background a
        // dark blade against empty sky is very nearly invisible - the discs
        // read as bare stalks, which loses the "propeller aircraft" half of
        // identity #1 in exactly the views the reader checks it in.
        //
        // The fix that does NOT work: ringing the disc with static bright chips
        // at the blade tips. Those have to be placed in the disc plane (x,y),
        // and the preview's TOP camera looks straight down y - so from above
        // the ring collapses onto the fuselage centreline and the chips scatter
        // as loose specks at stations the aircraft has no parts at. A marker
        // that is only correct from one camera is worse than no marker.
        //
        // What works is making the real blades bigger, since they are in the
        // disc plane by construction and rotate with it. A second disc at 45
        // degrees of phase, half a unit behind and slightly smaller, doubles
        // the apparent blade count into an eight-blade fan that holds its shape
        // from every angle - and it costs nothing extra, because the spin
        // helper drives both discs off the same propSpinners list.
        addProp(side * 3.4, 1.05, -6.15, 2.5, side);
        const backDisc = addProp(side * 3.4, 1.05, -5.75, 2.35, side);
        backDisc.rotation.z = Math.PI / 4;
        // Exhaust stub stain on the outboard flank, dark like the E-2D's.
        add(geometry.nozzle, dark, side * 3.4, 0.75, 1.2, 0.62, 0.62, 0.5);
      }

      // ---- THE OPEN REAR RAMP ---------------------------------------------
      // Identity #2, and the reason the box holds its full 3.4 depth all the
      // way to z 5.4 instead of tapering: a freighter that can open its tail
      // has to have a flat square face back there to open. The first pass
      // sloped the belly up into a slim boom, which reads as a pointed tail
      // cone from every angle and leaves the door nothing to hang off.
      //
      // The bay MOUTH: a dark slab standing 0.15 proud of the body's aft face,
      // inset 0.35 all round so a white frame of fuselage shows around it. The
      // deepest tone on the aircraft inside a white rim is what reads as a
      // HOLE; the same dark panel flush with the skin only reads as paint.
      add(geometry.panel, dark, 0, -0.15, 5.48, 2.5, 2.5, 0.5);
      // Bay interior: a light floor plate and a lit ceiling glow set back
      // inside the mouth, so the hole has visible depth when the rear 3/4 view
      // looks into it rather than being a flat black rectangle.
      add(geometry.panel, light, 0, -1.28, 4.4, 2.3, 0.14, 2.2);
      add(geometry.panel, accent, 0, 1.02, 4.6, 1.9, 0.08, 1.8);
      // The upper door, swung UP into the underside of the tail boom - a real
      // ramp opens in two halves, and the raised half is what makes the lower
      // one read as "open" rather than as a tray bolted to the tail. It has to
      // stay TUCKED against the airframe: hung further aft and higher it drew
      // as a loose white plate hovering behind the fin with daylight all round
      // it, which reads as a stray part rather than as a door. Rooted at the
      // top of the mouth (y 1.25, z 5.3) and raked back only 0.5 rad, its far
      // edge lands under the fin root instead of out in open air.
      const upperDoor = add(geometry.panel, primary, 0, 1.35, 5.9, 2.4, 0.18, 1.9);
      upperDoor.rotation.x = -0.5;
      // THE RAMP: hinged at the bay floor (z 5.4, y -1.35) and lowered a steep
      // 0.78 rad, a wide light interior-metal plate 3.6 long with green guide
      // rails down both edges. Its lip falls to about y -4.0 at z 8.0.
      //
      // The ANGLE is the fix that made identity #2 survive the SIDE view. At a
      // shallow 0.52 rad the door trailed aft almost horizontally and slid in
      // behind the tailplane and the fin, so the side elevation was one
      // undifferentiated cluster of overlapping white surfaces and the pods
      // disappeared into it. Steepening it swings the whole assembly DOWN into
      // the empty air under the tail boom, where nothing else is - the ramp is
      // now the lowest thing on the aircraft and reads as a distinct diagonal
      // against the sky from any horizontal angle.
      const rampParts = [
        add(geometry.panel, light, 0, -2.45, 6.85, 2.4, 0.22, 3.6),
        add(geometry.panel, secondary, -1.14, -2.28, 6.85, 0.18, 0.44, 3.6),
        add(geometry.panel, secondary, 1.14, -2.28, 6.85, 0.18, 0.44, 3.6),
        // Ramp lip: a thin dark edge across the far end, which is what stops
        // the plate from fading into the background at thumbnail size.
        add(geometry.panel, dark, 0, -3.75, 8.05, 2.4, 0.26, 0.45)
      ];
      for (const part of rampParts) part.rotation.x = 0.78;

      // The distribution PALLET riding the ramp: a light pallet slab carrying
      // four green key pods in two rows, every piece tilted with the door as if
      // mid-drop. The pods are 0.9 cubes - large enough to break the ramp's
      // outline from above and from the side, which is what makes the cargo
      // itself part of the silhouette rather than a texture detail.
      // Stations are measured along the ramp now that it hangs at 0.78 rad, so
      // the pods sit ON the plate instead of sinking through it: the plate's
      // local surface is at y -0.11 in ramp space, and a 0.9 cube centred 0.34
      // above that touches it.
      const palletParts = [add(geometry.panel, light, 0, -2.28, 7.0, 2.0, 0.16, 2.4)];
      for (const side of [-1, 1]) {
        palletParts.push(add(geometry.panel, secondary, side * 0.58, -1.85, 6.2, 0.95, 0.95, 0.95));
        palletParts.push(add(geometry.panel, secondary, side * 0.58, -2.85, 7.2, 0.95, 0.95, 0.95));
        // Lime lids, the one bright accent at the tail, marking the cargo as
        // the same green the livery wears.
        palletParts.push(add(geometry.panel, accent, side * 0.58, -1.35, 5.85, 1.0, 0.12, 1.0));
        palletParts.push(add(geometry.panel, accent, side * 0.58, -2.35, 6.85, 1.0, 0.12, 1.0));
      }
      for (const part of palletParts) part.rotation.x = 0.78;

      // ---- Tail group -----------------------------------------------------
      // Green fin (the airline tail) with a dorsal fillet running forward onto
      // the cabin roof, and the white tailplane crossing high on the fin so
      // both the plan view and the side view keep it clear of the ramp below.
      add(finKeyd, secondary, 0, 1.66, 7.0);
      const fillet = add(geometry.panel, secondary, 0, 1.82, 4.4, 0.24, 0.3, 3.0);
      fillet.rotation.x = -0.3;
      add(stabKeyd, primary, 0, 4.4, 7.2);
      add(geometry.panel, secondary, -3.7, 4.4, 7.2, 1.0, 0.3, 1.9);
      add(geometry.panel, secondary, 3.7, 4.4, 7.2, 1.0, 0.3, 1.9);

      // ---- Details --------------------------------------------------------
      // Fixed utility landing gear: a nose leg and two sponson-mounted main
      // legs on the belly corners. Small, dark, and enough to say "bush plane"
      // in the front view - nothing else in the air roster flies gear-down.
      add(geometry.panel, dark, 0, -2.35, -8.2, 0.4, 0.9, 0.6);
      for (const side of [-1, 1]) {
        add(geometry.panel, primary, side * 1.62, -1.5, -0.6, 0.5, 0.7, 2.4);
        add(geometry.panel, dark, side * 1.75, -2.45, -0.6, 0.5, 1.0, 1.0);
      }
      // Nav lights on the geometric tips (red left, green right) and the red
      // anti-collision beacon on the fin cap - a civil aircraft flies lit.
      add(geometry.canopy, navL, -9.65, 1.98, -1.5, 0.16, 0.16, 0.16);
      add(geometry.canopy, navR, 9.65, 1.98, -1.5, 0.16, 0.16, 0.16);
      add(geometry.canopy, navL, 0, 5.4, 7.1, 0.13, 0.13, 0.13);
    }
  });
}
