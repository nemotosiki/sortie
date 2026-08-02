// HOSPITAL TRANSPORT - a flying hospital on a four-turboprop airlifter.
//
// Neutral support registration: no AIRCRAFT_ORDER entry ({ order: false }), no
// CAMPAIGNS edit, no mission touched, no balance table moved. The airframe
// exists so a mission can put a protected medical flight in the sky; whether
// anything ever escorts it is a decision made elsewhere.
//
// Every flight number is inherited wholesale from the generic `transport` and
// marked BALANCE TODO. The work in this file is the SHAPE and the PAINT, and
// they carry three identities that have to survive at thumbnail size:
//
//   1. HIGH WING, FAT BODY, FOUR TURBOPROPS - the C-130 silhouette. An
//      essentially unswept plank of a wing sitting ON the fuselage spine, four
//      nacelles let INTO that wing with propeller discs turning ahead of its
//      leading edge, a slab-sided lower body with external gear sponsons, and
//      an upswept aft ramp under one tall single fin.
//   2. PURE WHITE. Not off-white: `primary` is literally 0xffffff and
//      `secondary` is one step off it, because this model is lit by the game's
//      own scene lights and a 0xf6f9fb hull shades to plain grey on every face
//      turned away from the key light. The first render of this airframe came
//      out looking like every other grey transport in the roster for exactly
//      that reason. Two near-identical whites still separate hull from
//      machinery under shading while never dropping to grey.
//   3. LARGE RED CROSSES on the roof and on BOTH flanks, in the accent red.
//      Sized off the surface they sit on rather than drawn small and neat: the
//      roof cross spans 6.4 units of a 7.0-unit-wide centre-section fairing and
//      the flank crosses stand 3.4 tall on a cabin wall 3.0 deep, so each one
//      fills its panel. A cross that fits comfortably inside its surface reads
//      as a decal at preview range and as nothing at all at combat range.
//
// The roster also carries an AC-130 on this same C-130 planform, so the
// separation from it is deliberate and total: this airframe is WHITE where the
// gunship is charcoal, wears CROSSES where the gunship wears a port-side gun
// row, and has NO weapon, muzzle, pylon or sensor ball anywhere on the hull.
// The unarmed-ness is enforced in the data too, not just in the geometry
// (`spw` and the rear-gun keys are stripped below), so a future retune of the
// shared transport template cannot leak a gun onto a protected flight.
//
// SCALE DERIVATION (measured off live airframes, not guessed). The roster runs
// a consistent metres-per-scaled-unit rate:
//   F-16  model spans z -10.9 .. 9.35 = 20.25 units at theme.scale 1.00
//         -> 20.25 scaled units for a real 15.03 m aircraft = 0.742 m/unit
//   Tu-95 model spans z -13.9 .. 12.5 = 26.4 units at theme.scale 2.30
//         -> 60.7 scaled units for a real 46.2 m aircraft = 0.761 m/unit
//   both land on ~0.75 m per scaled unit.
// The target is the C-130 footprint: 30 m long on a 40 m span, which needs
// 40.0 x 53.3 scaled units. This model runs z -10.15 (nose cap tip) to +10.2
// (tailplane trailing edge) = 20.35 units on a 13.4 half-span = 26.8 span, and
// theme.scale 2.0 puts it at 40.7 x 53.6 scaled units, which at the measured
// 0.75 m/unit is 30.5 m x 40.2 m against the 30 / 40 target. Correct on both
// axes to within 2%, and
// correctly SMALLER than the in-game C-17 transport (scale 2.6) parked beside
// it while being far wider than it is long - which is the Hercules proportion
// and the thing that separates this planform from every fighter in the game.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;
  const transport = AIRCRAFT_TYPES.transport;
  const transportAI = ENEMY_AI_PROFILES.transport;
  if (!transport || !transportAI) {
    throw new Error("[hospitalTransport] expected the transport aircraft and AI templates to exist");
  }

  // Neutral medical palette, matched to the hospital SHIP already in the game
  // (white hull, red crosses, near-white radar blip) so the two read as one
  // protected faction rather than as two accidents of paint.
  //
  // primary 0xffffff / secondary 0xf0f4f7: see identity note 2 above. The pair
  // is deliberately tighter than any other airframe's, because the ONE thing
  // this hull must never do is read grey.
  // accent IS the cross red, and it also lands on the propeller spinner hubs
  // (addProp paints its hub in `accent` automatically), which is exactly how a
  // civil operator paints them - so the choice pays for itself twice.
  const theme = {
    primary: 0xffffff,
    secondary: 0xf0f4f7,
    accent: 0xd42a24,
    canopy: 0x8fe0ff,
    exhaust: 0xffc79a,
    scale: 2.0,
    variant: "hospitalTransport"
  };

  // ---- 1. Flight entry -----------------------------------------------------
  // BALANCE TODO: placeholder. Every flight-model number below (speeds, rates,
  // damping, stall, HP) is the generic transport's, unreviewed for a smaller
  // four-prop airframe - a Hercules is slower and tighter-turning than a
  // strategic jet lifter and the numbers should eventually say so.
  // `spw` is stripped defensively: a special weapon is a player affordance and
  // this aircraft must never grow one, whatever the template does later.
  const { spw: _noPlayerSpecialWeapon, ...unarmedBase } = transport;
  ctx.addAircraft("hospitalTransport", {
    ...unarmedBase,
    id: "hospitalTransport",
    label: "MEDEVAC TRANSPORT",
    role: "Aerial Hospital",
    tag: "SUPPORT",
    enemyOnly: true,
    blurb: "純白の機体に赤十字を掲げる病院輸送機。負傷者と医療班を運ぶ非武装の中立機で、どの陣営の交戦規定でも撃ってはならない的として空を渡る。",
    // Contrail anchor on the geometric wingtip: the planform's half-span is
    // 13.4 and the tip chord runs z -1.0 .. 0.4, so the tip station is its
    // mid-chord at -0.3. The nav lights at the bottom of build() sit on the
    // same two numbers, so the trail leaves the light rather than floating
    // inboard of it.
    tipSpan: 13.4, tipZ: -0.3,
    theme
  }, { order: false });

  // ---- 2. AI profile -------------------------------------------------------
  // BALANCE TODO: placeholder. Spread from the transport profile - unarmed,
  // zero evasion, straight-line patrol. Only the hitbox and the fireball are
  // rescaled to this airframe and the radar blip goes neutral white to match
  // the hospital ship. The rear-gun keys are stripped for the same reason
  // `spw` is above.
  const { rearGun: _noRearGun, rearGunOffset: _noRearGunOffset, ...unarmedAI } = transportAI;
  ctx.addEnemyProfile("hospitalTransport", {
    ...unarmedAI,
    label: "MEDEVAC",
    // The transport carries hitboxScale 3.0 at theme scale 2.6; this airframe
    // is 2.0, and 3.0 x 2.0/2.6 = 2.3 keeps metres-per-hitbox identical rather
    // than handing the smaller aircraft the bigger jet's hit volume.
    hitboxScale: 2.3,
    // Same rule for the fireball: 1.7 x 2.0/2.6 = 1.3.
    explosionScale: 1.3,
    radarColor: "#eaf4ff",
    tracerColor: 0xffffff,
    explosionColor: 0xffd8c0,
    theme
  });

  // ---- 3. Model ------------------------------------------------------------
  ctx.addAircraftModel("hospitalTransport", {
    // Top view in the shared 40x44 box, nose up. Traced off the model rather
    // than drawn freehand: every vertex is a real part station run through
    // x = 20 + 1.4*mx, y = 1.5 + 1.942*(mz + 10.4), so the outline and the
    // aircraft cannot drift apart.
    //
    // Reading down the page: a blunt nose into a fat parallel body, then FOUR
    // nacelle noses standing ahead of a nearly straight leading edge, the wide
    // low-taper plank of a wing, and a broad straight tailplane at the fin.
    // Four bumps on an unswept wing is the C-130 read at HUD size - nothing
    // else in the game has anything standing ahead of its wing at all.
    silhouette:
      "M20 1.5 L22.1 6.3 L21.9 18.6 L23.7 18.7 L23.7 12.6 L25.5 12.6 " +
      "L25.5 18.8 L28.2 19.0 L28.2 12.6 L30.0 12.6 L30.0 19.2 L38.8 19.9 " +
      "L38.8 22.6 L21.9 25.4 L21.2 35.8 L27.3 36.6 L27.3 38.8 L21.1 41.1 " +
      "L20 41.4 L18.9 41.1 L12.7 38.8 L12.7 36.6 L18.8 35.8 L18.1 25.4 " +
      "L1.2 22.6 L1.2 19.9 L10.0 19.2 L10.0 12.6 L11.8 12.6 L11.8 19.0 " +
      "L14.5 18.8 L14.5 12.6 L16.3 12.6 L16.3 18.7 L18.1 18.6 L17.9 6.3 Z",

    build(env) {
      const {
        geometry, extrudedSurface, verticalSurface,
        primary, secondary, accent, canopy, dark, light, navL, navR,
        add, addProp
      } = env;

      // ---- Making the white actually read as WHITE --------------------------
      // The single most important line in this file, and the one thing two
      // renders of this airframe failed on before it existed.
      //
      // createAircraftModel builds `primary` as makeAircraftMaterial(colour,
      // metalness 0.52, roughness 0.34). A MeshStandardMaterial at metalness
      // 0.52 takes roughly half its colour from a reflected environment, and
      // this scene has no environment map - so the metallic half returns BLACK
      // and a 0xffffff hull renders as mid grey on every face. Setting
      // theme.primary whiter cannot fix that, because the theme colour is only
      // the dielectric half; the first pass raised it from 0xf6f9fb to pure
      // 0xffffff and the wing came out exactly as grey as before.
      //
      // These are this model's OWN material instances (createAircraftModel
      // makes a fresh set per airframe from the theme), and they are already in
      // the returned `standardMaterials`, so they are flashed on a hit and
      // disposed with the model. Retuning them here is therefore free: it
      // touches no other aircraft and leaks nothing. Building new materials
      // instead WOULD leak, because standardMaterials is a fixed list this
      // builder cannot add to.
      //
      // Chalky white paint is the physical truth here anyway - a hospital
      // aircraft is painted, not bare metal - so metalness 0.04 with a high
      // roughness is both the correct look and the correct material model. The
      // emissive lift on top guarantees the shadowed side stays white rather
      // than grey, which is what "do not shoot this" has to survive at range.
      for (const white of [primary, secondary]) {
        white.metalness = 0.04;
        white.roughness = 0.62;
        white.emissive.copy(white.color).multiplyScalar(0.34);
        white.emissiveIntensity = 1.0;
        // updateAircraftFlash restores from these on the way out of a hit
        // flash, so they have to be re-cached after the change or the first
        // hit would permanently reset the hull to the old dim emissive.
        white.userData.baseEmissive = white.emissive.clone();
        white.userData.baseIntensity = white.emissiveIntensity;
      }
      // The crosses get the same de-metalling so the red stays a saturated
      // signal red instead of going to maroon in shade, but a much smaller
      // emissive lift - they have to stay clearly DARKER than the hull or the
      // contrast that makes them legible disappears.
      accent.metalness = 0.05;
      accent.roughness = 0.5;
      accent.emissive.copy(accent.color).multiplyScalar(0.3);
      accent.emissiveIntensity = 1.0;
      accent.userData.baseEmissive = accent.emissive.clone();
      accent.userData.baseIntensity = accent.emissiveIntensity;

      // ---- Planforms ------------------------------------------------------
      // THE wing: half-span 13.4 on a 20.6 body - much wider than the aircraft
      // is long, and essentially UNSWEPT. The leading edge rakes back only 0.75
      // over the whole half-span where the in-game C-17 rakes 6.6, so from
      // above this is a plank: root chord 3.6 held nearly constant out past the
      // outboard engine station, then thinning to a 1.4 tip. Straight-and-
      // enormous is the first read of a Hercules from any height, and it is
      // also the whole separation from the swept C-17/Il-76 wing.
      const wingHerc = extrudedSurface([
        [0, -1.75], [3.2, -1.68], [13.4, -1.0], [13.4, 0.4], [7.0, 1.62],
        [0, 1.85], [-7.0, 1.62], [-13.4, 0.4], [-13.4, -1.0], [-3.2, -1.68]
      ], 0.34);

      // LOW-SET tailplane, half-span 5.2, carried on the fuselage with the same
      // straight leading edge as the wing. A C-130 puts its stab on the tail
      // cone, and that is the cheap and total separation from the C-17 / Il-76
      // T-tail family that shares this planform family otherwise.
      const stabHerc = extrudedSurface([
        [0, -1.5], [5.2, -1.1], [5.2, 0.1], [1.6, 1.2],
        [0, 1.3], [-1.6, 1.2], [-5.2, 0.1], [-5.2, -1.1]
      ], 0.28);

      // The fin: ONE broad tall blade, root chord 4.0 against height 3.6, with
      // a swept leading edge and a nearly upright trailing edge. The shared
      // geometry.fin is a fighter's raked blade (3.9 tall on a 3.45 chord) and
      // reads far too narrow on a fat transport tail.
      // verticalSurface maps shape +x onto model -z, so the LEADING edge is the
      // +x side and sweeping it back slides the tip chord toward NEGATIVE
      // shape-x - the same convention the stock fin is drawn with. Getting it
      // backwards draws a forward-swept fin, which no transport has.
      const finHerc = verticalSurface([
        [-2.0, 0], [2.0, 0], [0.3, 3.6], [-1.9, 3.6]
      ], 0.32);

      // One engine nacelle, drawn as a flat-topped pod in the horizontal plane
      // rather than scaled from geometry.fuselage. This is a correction from
      // the first render: four shrunken cylinders standing on the wing read as
      // four fuel drums, because a cylinder tapered 1.55 -> 0.95 has no
      // parallel section to look like an engine. A drawn pod is 3.9 long and
      // 1.5 wide with a rounded nose and a squared-off exhaust, which is a
      // turboprop nacelle from any angle.
      const nacelleHerc = extrudedSurface([
        [0, -2.5], [0.42, -2.2], [0.62, -1.2], [0.62, 1.15], [0.34, 1.4],
        [0, 1.4], [-0.34, 1.4], [-0.62, 1.15], [-0.62, -1.2], [-0.42, -2.2]
      ], 0.86);

      // ---- Fuselage -------------------------------------------------------
      // A fat parallel barrel. The shared cylinder tapers 0.95 (front) -> 1.55
      // (rear) over 11.5; at sx/sy ~0.95 the section comes out about 2.9 units
      // across = 4.3 m at this scale, which is the real C-130 cross-section.
      add(geometry.fuselage, primary, 0, 0.1, -2.2, 0.95, 0.92, 1.12);
      // Slab-sided lower body, x +/-1.35, running the length of the cabin. This
      // is the surface the FLANK CROSSES paint onto, and it is also what makes
      // the front view read as a box-bottomed airlifter instead of a tube. The
      // cylinder alone cannot hold a constant section, so the slab fakes it.
      add(geometry.panel, primary, 0, -0.55, -2.3, 2.7, 1.55, 11.8);
      // Blunt nose. The cone is 4.2 long and cut to 0.5 = 2.1, far shorter than
      // a fighter's, with a squashed sphere cap rounding the tip off instead of
      // spiking it - the idiom the E-2D uses for its stub radome. NO pitot boom
      // on the tip: the first render grew one and at preview size it read as a
      // gun barrel on an aircraft whose entire point is being unarmed.
      add(geometry.nose, primary, 0, 0.05, -8.9, 1.32, 1.02, 0.5);
      // Rounded cap closing the cone tip. Four passes went into these numbers
      // and each fixed a different wrong read:
      //  - a small ball at the tip read as a PITOT PROBE, which is the one
      //    thing an unarmed hospital aircraft must not appear to carry;
      //  - a wide flat cap standing at the tip read as a MUSHROOM, a separate
      //    bulb stuck on the end rather than the end of the nose itself;
      //  - and the fix for that was placed by ARITHMETIC ERROR at z -10.35,
      //    which put it in front of the cone entirely and made the mushroom
      //    worse. geometry.nose is a 4.2-long cone centred on its own origin,
      //    so at sz 0.5 it is 2.1 long and its tip is only 1.05 ahead of the
      //    station, not 2.1: from -8.9 the tip is at -9.95, not -11.0.
      // Seated correctly: the cap centre sits at -9.6, INSIDE the cone, with a
      // 0.55 z half-extent reaching -10.15 - so it protrudes 0.2 past the
      // cone's tip and the rest of the sphere is buried in it. The sphere's
      // 0.86 half-width against the cone's 1.02 base means the two surfaces
      // meet flush rather than stepping. The profile is one continuous blunt
      // radome, which is the C-130 nose.
      add(geometry.canopy, primary, 0, 0.05, -9.6, 0.86, 0.74, 0.55);
      // Flight deck right at the front the way a Hercules wears it: a stepped
      // windscreen band breaking the upper mould line, plus the big square side
      // windows that say "crewed flight deck" from the flanks.
      add(geometry.canopy, canopy, 0, 1.28, -7.5, 0.78, 0.44, 0.9);
      add(geometry.canopy, canopy, -1.02, 0.95, -7.4, 0.32, 0.3, 0.6);
      add(geometry.canopy, canopy, 1.02, 0.95, -7.4, 0.32, 0.3, 0.6);

      // Upswept aft body: the tail cone lifts its centreline to y 0.6 while the
      // ramp panel below climbs from the keel underside up to meet it. That
      // wedge under the tail is the rear-loader tell every Hercules profile
      // shows, and it is the reason the stab can sit low and still clear.
      add(geometry.fuselage, primary, 0, 0.6, 6.9, 0.74, 0.64, 0.56);
      add(geometry.panel, secondary, 0, -0.32, 5.0, 1.95, 0.18, 4.6).rotation.x = -0.28;

      // ---- High wing ------------------------------------------------------
      // Mounted ON the spine at y 1.4, on a flat centre-section fairing rather
      // than passing through the body. High wing over a fat barrel is half the
      // silhouette, and the fairing restores the flat constant top that the
      // tapering cylinder loses amidships - which is also the flat white panel
      // the ROOF CROSS needs to sit on.
      add(geometry.panel, primary, 0, 0.88, -0.9, 3.5, 0.9, 7.0);
      add(wingHerc, primary, 0, 1.4, 0);

      // ---- Four turboprops ------------------------------------------------
      // Inner pair at +/-3.4, outer at +/-6.6 - the real 4.9 m / 9.6 m engine
      // stations at this scale (x 3.4 x 2.0 x 0.75 = 5.1 m, x 6.6 = 9.9 m).
      //
      // Two placement corrections from the first render, and both are the
      // difference between "four engines on a wing" and "four objects near a
      // wing":
      //  - HEIGHT. The pods now sit at y 1.24 with the wing surface at
      //    1.4 +/- 0.17, so each nacelle is let INTO the wing and the leading
      //    edge cuts through it. At the first pass's y 0.95 they hung in clear
      //    air below the plank and the top view showed four free-floating
      //    cylinders.
      //  - REACH. The pod runs z -2.4 .. +1.5 about its centre at -0.9, so it
      //    projects 0.65 ahead of the root leading edge (-1.75) and its exhaust
      //    ends level with the trailing edge. A turboprop nacelle is longer
      //    than its wing chord in both directions; a pod that stops short of
      //    the leading edge cannot put a propeller disc in front of the wing,
      //    which is the entire C-130 read from above.
      //
      // Discs at radius 1.6 turn at z -3.1, a clear 1.35 ahead of the leading
      // edge. Slightly oversized the way the E-2D's are, because an
      // honest-scale disc vanishes at preview distance; adjacent discs still
      // clear each other by 0.0 at the 3.2 station gap, which is what a real
      // four-prop wing looks like from the front. Counter-rotating `side`
      // spins the pairs symmetrically.
      //
      // NO flames anywhere on this aircraft: a turboprop has no afterburner,
      // the rule the Tu-95 and the E-2D already follow in this codebase.
      for (const side of [-1, 1]) {
        for (const station of [3.4, 6.6]) {
          const x = side * station;
          add(nacelleHerc, secondary, x, 1.24, -0.9);
          // The spinner fairing ahead of the pod, in the same white as the
          // machinery - the red hub that addProp draws for us sits inside it.
          add(geometry.nose, secondary, x, 1.24, -3.4, 0.42, 0.42, 0.4);
          addProp(x, 1.24, -3.1, 1.6, side);
          // Exhaust stack on the pod's aft end. `light` rather than `dark`:
          // this is the only piece of machinery aft of the wing and a charcoal
          // ring here was the single largest dark mark on the first render's
          // upper surface, which fought the white.
          add(geometry.nozzle, light, x, 1.24, 0.9, 0.44, 0.44, 0.55);
        }
      }

      // ---- Tail group -----------------------------------------------------
      // Dorsal fillet running up into the fin root, then the single broad fin
      // and the low straight tailplane cutting through the tail cone.
      add(geometry.panel, primary, 0, 1.05, 5.2, 0.26, 1.05, 2.6);
      add(finHerc, primary, 0, 1.05, 7.9);
      add(stabHerc, primary, 0, 0.92, 8.7);

      // ---- THE RED CROSSES ------------------------------------------------
      // The identity, and the thing the first render got wrong by drawing them
      // politely small. Each cross is two crossed slabs in the accent red, and
      // each is sized to FILL the white surface it sits on rather than to sit
      // neatly inside it.
      //
      // ROOF CROSS: on the wing centre-section fairing (top surface y 1.33) and
      // on the wing upper skin at 1.57, dead on the centreline where the top
      // view has its one large uninterrupted white field. Arms 6.4 x 1.9 - the
      // fairing is 3.5 half-width so the transverse arm runs almost to its
      // edges, and 6.4 of span against the 3.6 root chord means the cross
      // overhangs the chord onto the wing skin, which is what makes it read as
      // a marking painted ACROSS the wing root rather than as a small plus sign
      // parked on it. Stood 0.06 proud of the skin so no z-fighting.
      add(geometry.panel, accent, 0, 1.63, 0.05, 6.4, 0.1, 1.9);
      add(geometry.panel, accent, 0, 1.63, 0.05, 1.9, 0.1, 6.4);

      // FLANK CROSSES: on the slab cabin sides at x +/-1.35, standing 0.06
      // proud so they read as paint from every angle including head-on.
      //
      // Sized to the WALL, not to taste. The slab is centred at y -0.55 with a
      // half-height of 0.775, so its wall runs y -1.325 .. +0.225 - and the
      // cross is centred at -0.55 with a 1.5 vertical arm, spanning -1.3 ..
      // +0.2. It fills the wall to within 0.025 top and bottom and does not
      // cross either edge. The pass before this used a 3.4 arm because bigger
      // seemed safer, and the result hung a metre and a half of red below the
      // keel line in the side view - a cross floating in air under the
      // aircraft, which is worse than a small one.
      // The 2.9 horizontal arm is the length the wall CAN carry, and it makes
      // the marking wider than it is tall, which is correct: the flank of an
      // airlifter is a long low panel and a square cross on it wastes the
      // space that makes the marking legible at range.
      // Placed at z -4.4, forward of the wing centre-section and the sponsons
      // and aft of the nose gear bulge - the one stretch of flank with nothing
      // else on it.
      // The two bars: a tall narrow one (1.5 deep in y, 1.0 long in z) crossed
      // by a wide short one (0.52 deep, 2.9 long). Same arm THICKNESS on both
      // (1.0 vs 0.52 is the y/z aspect of the same square arm once the wall's
      // proportions are accounted for), so the result is a cross and not a
      // plus-shaped smear.
      for (const side of [-1, 1]) {
        add(geometry.panel, accent, side * 1.41, -0.55, -4.4, 0.12, 1.5, 1.0);
        add(geometry.panel, accent, side * 1.41, -0.55, -4.4, 0.12, 0.52, 2.9);
      }

      // ---- Details --------------------------------------------------------
      // Main-gear sponsons: the long external blisters low on both flanks, aft
      // of the crosses and under the wing. A Hercules stows its mains OUTSIDE
      // the pressure hull and those bulges are half the side profile - without
      // them the lower body is a featureless white slab.
      add(geometry.panel, secondary, -1.52, -0.95, 1.3, 0.55, 0.9, 4.8);
      add(geometry.panel, secondary, 1.52, -0.95, 1.3, 0.55, 0.9, 4.8);
      // Nose-gear bulge under the flight deck.
      add(geometry.panel, secondary, 0, -1.45, -6.7, 0.72, 0.42, 1.7);
      // Anti-glare panel ahead of the windscreen - the ONE dark marking this
      // hull is allowed to keep, because it sits exactly where the crew looks
      // and its absence is more noticeable than its presence.
      add(geometry.panel, dark, 0, 1.3, -8.3, 0.62, 0.07, 1.1);
      // Cabin window band down both flanks: the small detail that separates a
      // patient-carrying hospital aircraft from a sealed freighter, and the
      // reason the flanks are not blank white.
      // Deliberately confined to z -2.4 .. +1.4, entirely AFT of the flank
      // cross (which spans -6.3 .. -2.9). The earlier pass ran the band from
      // -4.4 forward and it cut straight across the cross's aft arm, breaking
      // the one marking the side view exists to show. Nothing else is allowed
      // on the cabin wall forward of z -2.6.
      add(geometry.panel, canopy, -1.4, 0.4, -0.5, 0.1, 0.34, 3.8);
      add(geometry.panel, canopy, 1.4, 0.4, -0.5, 0.1, 0.34, 3.8);
      // Wingtip strobes on the geometric tips at the tip chord's mid-z, so the
      // contrail anchor (tipSpan 13.4 / tipZ -0.3) and the lights agree.
      add(geometry.canopy, navL, -13.45, 1.4, -0.3, 0.15, 0.15, 0.15);
      add(geometry.canopy, navR, 13.45, 1.4, -0.3, 0.15, 0.15, 0.15);
    }
  });
}
