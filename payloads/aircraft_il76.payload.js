// IL-76 CANDID - the Soviet four-jet strategic airlifter.
//
// Elem (Russian) support registration: no AIRCRAFT_ORDER entry ({ order: false }),
// no CAMPAIGNS edit, no mission touched, no balance table moved. The airframe
// exists so a mission can put a Russian heavy lifter in the sky; whether
// anything ever intercepts it is a decision made elsewhere.
//
// Every flight number is inherited wholesale from the in-game `transport`
// (C-17) and marked BALANCE TODO. The work in this file is the SHAPE, and the
// shape has to survive next to TWO other four-engine high-wing airlifters this
// roster now carries - the C-17 (`transport`, inline) and the An-124 - so the
// three identities below are chosen for what SEPARATES them, not just for what
// an Il-76 has:
//
//   1. HIGH WING, FOUR PODDED TURBOFANS. The wing sits ON the spine and each
//      engine hangs UNDER it on its own pylon, forward of the leading edge.
//      Shared with the C-17 by definition - this is the airlifter class read -
//      but drawn with the Il-76's own planform: a much sharper 25-deg leading
//      edge sweep than the C-17's, and the engines set further outboard and
//      further FORWARD (the nacelle noses stand a full 3.4 ahead of the leading
//      edge, where the C-17's stand 2.4), which is the Candid's distinctive
//      "four pods reaching out in front of the wing" top view.
//   2. T-TAIL. Shared with the C-17 and NOT with the An-124 (which wears a low
//      conventional stab), so this is the feature that splits the roster's
//      three lifters into 2+1 and cannot on its own identify this aircraft.
//      Drawn taller and narrower than the C-17's: the fin stands 7.0 on a 4.6
//      root chord, and the stab is carried at its ABSOLUTE top - its 1.6 root
//      chord is sized to the fin's own 1.5 tip chord so it caps the fin
//      instead of overhanging it, with a bullet fairing welding the junction.
//   3. THE GLAZED CHIN. **This is the one feature no other aircraft in the
//      game has, and it is the whole reason this file is separate from the
//      C-17's.** The real Il-76 carries a navigator/bombardier station in a
//      fully glazed hemispherical blister slung UNDER the nose, below and
//      forward of the flight deck - a Soviet transport idiom inherited
//      straight from their bombers. It is drawn here as a large canopy-material
//      bulb 2.2 across, 1.7 deep and 3.4 long, hung at y -1.75 and forward at
//      z -11.2 so that 1.5 of it stands in clear air BELOW the keel line and
//      clear of the radome that would otherwise mask it, with a dark frame ring
//      behind it, a dark keel strip under it and TWO glazed panel faces let
//      into its flanks - so it reads as glass from the side, from below and
//      head-on. Nothing else with a nose in this roster has anything hanging
//      under it, and the C-17 specifically has a plain unbroken radome there.
//
// SEPARATION FROM THE C-17, stated explicitly because it is the acceptance
// test for this model (spec §3 W3 identification risk):
//   - chin glazing: PRESENT here, absent on the C-17
//   - aft body: this aircraft's ramp sweeps up only gently and carries a
//     TAIL GUNNER'S TURRET fairing at the very end of the tail cone (the
//     Il-76M idiom); the C-17's aft body kicks up hard and ends in a blunt
//     unarmed cone
//   - paint: white upper hull with a BLUE CHEATLINE down both flanks and a
//     grey underside (the Aeroflot-derived scheme every Il-76 wears), against
//     the C-17's uniform slate grey. The theme's `primary` is white and the
//     `accent` IS the blue stripe, so at HUD range this reads white-and-blue
//     where the C-17 reads grey.
//   - wingtips: no winglets here (the Il-76 has none); the C-17's raked
//     winglets are its own tell.
//
// SCALE DERIVATION (measured off live airframes, not guessed). The roster runs
// a consistent metres-per-scaled-unit rate:
//   F-16  model spans z -10.9 .. 9.35 = 20.25 units at theme.scale 1.00
//         -> 20.25 scaled units for a real 15.03 m aircraft = 0.742 m/unit
//   Tu-95 model spans z -13.9 .. 12.5 = 26.4 units at theme.scale 2.30
//         -> 60.7 scaled units for a real 46.2 m aircraft = 0.761 m/unit
//   both land on ~0.75 m per scaled unit.
// The target is the Il-76 footprint: 46.6 m long on a 50.5 m span, which needs
// 62.1 x 67.3 scaled units. This model runs z -13.2 (radome cap tip) to +12.6
// (stab trailing edge) = 25.8 units on a 13.9 half-span = 27.8 span, and
// theme.scale 2.4 puts it at 61.9 x 66.7 scaled units, which at the measured
// 0.75 m/unit is 46.4 m x 50.0 m against the 46.6 / 50.5 target. Correct on
// both axes to within 1%.
// The in-game C-17 is scale 2.6 on a 26.6-unit body (z -13.0 .. 13.6) = 69.2
// scaled units = 51.9 m, against a real C-17's 53.0 m - so this airframe comes
// out correctly SHORTER than the C-17 parked next to it (46.4 vs 51.9), which
// is the true relationship (46.6 vs 53.0 m) and one more thing that separates
// the two at a glance.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;
  const lifter = AIRCRAFT_TYPES.transport;
  const lifterAI = ENEMY_AI_PROFILES.transport;
  if (!lifter || !lifterAI) {
    throw new Error("[il76] expected the transport aircraft and AI templates to exist");
  }

  // Elem (Russian) transport scheme, and deliberately NOT the Russian combat
  // palette the Su-34 / Tu-22M wear. Soviet and Russian heavy lifters fly in
  // the civil-derived Aeroflot livery whoever owns them: white upper hull, grey
  // belly, blue cheatline, blue-grey engine pods.
  //
  // `accent` IS the cheatline blue and it is the single most load-bearing
  // colour choice in the file: it is what makes a white transport read as
  // ELEM rather than as the neutral white hospital aircraft already in the
  // roster (which wears red crosses on the same kind of white), and what makes
  // it read as an Il-76 rather than as the grey C-17.
  const theme = {
    primary: 0xf2f5f8,
    secondary: 0x93a2af,
    accent: 0x1f5fa8,
    canopy: 0x9fe2ff,
    exhaust: 0xb8c8d4,
    scale: 2.4,
    variant: "il76"
  };

  // ---- 1. Flight entry -----------------------------------------------------
  // BALANCE TODO: placeholder. Every flight-model number below (speeds, rates,
  // damping, stall, HP, missile damage) is the C-17 `transport` template's,
  // unreviewed. A real Il-76 is slightly smaller and slightly faster than a
  // C-17 and the numbers should eventually say so. maxHealth is left at the
  // transport's 196 rather than scaled down with the airframe, because touching
  // it would be a balance decision and this file makes none.
  ctx.addAircraft("il76", {
    ...lifter,
    id: "il76",
    label: "IL-76 CANDID",
    role: "Strategic Airlifter",
    tag: "ENEMY",
    enemyOnly: true,
    blurb: "エレム軍の四発戦略輸送機。白と青の民間塗装をまとい、機首の下には一面ガラス張りの観測窓が突き出す。武装は尾部銃座だけで、積荷を運ぶことしかできない大きな的だ。",
    // Contrail anchor on the geometric wingtip: the planform's half-span is
    // 13.9 and the tip chord runs z 0.6 .. 2.4, so the tip station is its
    // mid-chord at 1.5, and the wing is added at z 0.6 - putting the world
    // station at 2.1. The nav lights at the bottom of build() sit on the same
    // two numbers, so the trail leaves the light rather than floating inboard.
    tipSpan: 13.9, tipZ: 2.1,
    theme
  }, { order: false });

  // ---- 2. AI profile -------------------------------------------------------
  // BALANCE TODO: placeholder. Spread from the transport profile - the armored
  // straight-line patrol behaviour, zero evasion, no forward gun. Only the
  // hitbox, the fireball and the radar colour are touched, and the first two
  // only to keep metres-per-hitbox constant across a scale change.
  ctx.addEnemyProfile("il76", {
    ...lifterAI,
    label: "IL-76",
    // The transport carries hitboxScale 3.0 at theme scale 2.6; this airframe
    // is 2.4, and 3.0 x 2.4/2.6 = 2.77 keeps metres-per-hitbox identical rather
    // than handing a smaller aircraft the bigger jet's hit volume.
    hitboxScale: 2.77,
    // Same rule for the fireball: 1.7 x 2.4/2.6 = 1.57.
    explosionScale: 1.57,
    // Elem blue on the radar, matching the cheatline, so the blip and the
    // aircraft agree about which air force this is.
    radarColor: "#6fb4ff",
    tracerColor: 0x6fb4ff,
    explosionColor: 0xffc46a,
    theme
  });

  // ---- 3. Model ------------------------------------------------------------
  ctx.addAircraftModel("il76", {
    // Top view in the shared 40x44 box, nose up. Traced off the model rather
    // than drawn freehand: every vertex is a real part station run through
    // x = 20 + 0.65*mx, y = 1.5 + 1.593*(mz + 13.2), so the outline and the
    // aircraft cannot drift apart. Regenerated after the wing planform was
    // retaped in the third render pass; the earlier path still described the
    // delta-ish wing and no longer matched the model.
    //
    // Reading down the page: a blunt nose into a long parallel body, then FOUR
    // nacelle noses standing well ahead of a sharply swept leading edge, the
    // swept wing out to a plain unwinglet tip, and the wide T-tail stab at the
    // very back. Four pods reaching forward off a hard-swept wing is the
    // Candid read at HUD size; the C-17's pods sit much closer in to its
    // shallower leading edge.
    silhouette:
      "M20 1.5 L20.8 6.3 L21.1 12.2 L21.1 11.7 L23.1 11.7 L23.1 20.9 " +
      "L23.9 20.9 L23.9 11.7 L21.1 11.7 L21.1 19 L25.8 14.7 L25.8 24 " +
      "L26.7 24 L26.7 14.7 L29 24.4 L29 27.3 L22.3 27.6 L21.1 27.6 " +
      "L21.1 36.9 L24.3 38.7 L24.3 43 L20 43 L15.7 43 L15.7 38.7 " +
      "L18.9 36.9 L18.9 27.6 L17.7 27.6 L11 27.3 L11 24.4 L13.3 14.7 " +
      "L13.3 24 L14.2 24 L14.2 14.7 L18.9 19 L18.9 11.7 L16.1 11.7 " +
      "L16.1 20.9 L16.9 20.9 L16.9 11.7 L18.9 11.7 L18.9 12.2 L19.2 6.3 Z",

    build(env) {
      const {
        geometry, extrudedSurface, verticalSurface,
        primary, secondary, accent, canopy, dark, light, navL, navR,
        add, addFlame
      } = env;

      // ---- Making the white read as WHITE ---------------------------------
      // createAircraftModel builds `primary` as makeAircraftMaterial(colour,
      // metalness 0.52, roughness 0.34). A MeshStandardMaterial at metalness
      // 0.52 takes roughly half its colour from a reflected environment, and
      // this scene has no environment map - so the metallic half returns BLACK
      // and a near-white hull renders as mid grey on every face turned away
      // from the key light. The MEDEVAC transport in this roster hit exactly
      // that and its fix is reused here for the same reason: without it, a
      // white-and-blue Il-76 renders as just another grey transport and the
      // paint half of the C-17 separation is lost.
      //
      // These are this model's OWN material instances (createAircraftModel
      // makes a fresh set per airframe from the theme) and they are already in
      // `standardMaterials`, so they still flash on a hit and are disposed with
      // the model. Retuning them here touches no other aircraft and leaks
      // nothing; building NEW materials would leak, because standardMaterials
      // is a fixed list this builder cannot add to.
      //
      // The lift is smaller than the hospital aircraft's (0.22 against 0.34):
      // this hull is a military lifter in civil paint, not a protected flight
      // that must glow, and too much emissive would flatten the cheatline.
      primary.metalness = 0.06;
      primary.roughness = 0.58;
      primary.emissive.copy(primary.color).multiplyScalar(0.22);
      primary.emissiveIntensity = 1.0;
      primary.userData.baseEmissive = primary.emissive.clone();
      primary.userData.baseIntensity = primary.emissiveIntensity;
      // The cheatline blue gets the same de-metalling so it stays a saturated
      // blue instead of going near-black in shade, with a smaller lift so it
      // stays clearly DARKER than the hull - the contrast IS the stripe.
      accent.metalness = 0.08;
      accent.roughness = 0.48;
      accent.emissive.copy(accent.color).multiplyScalar(0.26);
      accent.emissiveIntensity = 1.0;
      accent.userData.baseEmissive = accent.emissive.clone();
      accent.userData.baseIntensity = accent.emissiveIntensity;

      // ---- Planforms ------------------------------------------------------
      // THE wing: half-span 13.9, root chord 6.4, tip chord 1.3, and a leading
      // edge raked back 7.3 in z over that half-span = 27.7 deg of sweep. The
      // real Il-76 wing is swept 25 deg at quarter chord, which is HARD for an
      // airlifter - it cruises at M0.75 - and it is the planform difference
      // from the C-17's shared `wingTransport` (which rakes 6.6 over an 11.4
      // half-span = 30 deg but on a much shorter, fatter surface).
      //
      // Drawn rather than reused for a second reason: `geometry.wingTransport`
      // is the C-17's own wing and putting the two aircraft on the same
      // planform would delete the top-view separation the spec asks for. The
      // wing here is longer (13.9 against 11.4) and more slender, which is the
      // correct read for the aircraft with the higher aspect ratio.
      //
      // No winglets. The real Il-76 has none, and the C-17's raked tips are its
      // own identity - leaving them off is a separation, not an omission.
      //
      // TRAILING EDGE CORRECTION from the first render. The first pass ran the
      // trailing edge from a root at z 3.0 out to a tip at 4.9 - it swept AFT
      // by 1.9 - and combined with a leading edge raking 7.0 aft that made the
      // planform a near-triangle. From above it read as a bomber's delta, and
      // the top view is where an airlifter is supposed to be most obviously an
      // airlifter. The real Il-76's trailing edge is essentially STRAIGHT
      // (it carries full-span double-slotted flaps, which is why), so it now
      // runs from a root at 3.6 to a tip at 4.4 - 0.8 of sweep against the
      // leading edge's 7.0. A hard-swept leading edge over a straight trailing
      // edge is a tapered swept wing, and it cannot read as a delta.
      //
      // TAPER AND OVERLAP CORRECTION, arrived at over three renders and the
      // single hardest thing in this file to get right.
      //
      // Pass 1 ran a 7.0 root against a 1.0 tip with the trailing edge swept
      // aft as well - a taper ratio of 0.14 and two converging edges, which is
      // a triangle. Pass 2 straightened the trailing edge and cut the taper to
      // 0.33, and it was STILL reading as a delta from above. The reason was
      // not taper at all: the tip chord (z 3.0 .. 4.8) sat entirely BEHIND the
      // root chord (-2.8 .. 2.6). When no part of the tip overlaps any part of
      // the root in z, the eye has nothing to read as a constant-chord band and
      // joins the root leading edge straight to the tip trailing edge - which
      // draws a triangle no matter what the actual outline is.
      //
      // The tip is now at z 0.6 .. 2.4, which OVERLAPS the root's 2.6 aft end
      // by 1.8. The leading edge still rakes hard (3.4 of sweep from -2.8 to
      // 0.6) so the aircraft still reads as swept, but the trailing edge now
      // rakes only 0.2 (2.6 to 2.4) - essentially straight, which is what the
      // real Il-76's full-span flapped trailing edge does. Root 5.4, tip 1.8,
      // taper 0.33, and a wide band of overlapping chord down the whole span:
      // a tapered swept transport wing, and no longer a bomber's delta.
      const wingCandid = extrudedSurface([
        [0, -2.8], [2.4, -2.3], [13.9, 0.6], [13.9, 2.4], [3.6, 2.6],
        [0, 2.6], [-3.6, 2.6], [-13.9, 2.4], [-13.9, 0.6], [-2.4, -2.3]
      ], 0.32);

      // The T-tail stabiliser: half-span 6.6, straight-tapered, mounted at the
      // ABSOLUTE top of the fin. Wider than the C-17's shared stabTransport
      // (5.4) because it has to be legible sitting 5.6 units up in the air, and
      // because a wide stab on a tall fin is what makes a T-tail read as a T
      // rather than as a cross.
      //
      // ROOT CHORD IS TIED TO THE FIN TIP CHORD, and that is a correction from
      // the first render. The fin tip chord runs world z 10.10 .. 11.60 = 1.5
      // long; the first pass drew a stab with a 4.3 root chord (shape -1.9 ..
      // 2.4) and mounted it at z 10.3, so 2.8 units of stab root hung FORWARD
      // of the fin into open air. From the side that reads as a tailplane
      // crossing the fin at mid-height - a conventional cross tail - which is
      // exactly the feature this aircraft must not have. The root chord is now
      // 1.6 (shape -0.8 .. 0.8) against the fin's 1.5, so the stab sits ON the
      // fin tip with nothing hanging off either end and the junction reads as
      // the top bar of a T.
      const stabCandid = extrudedSurface([
        [0, -0.8], [6.6, 1.0], [6.6, 1.9], [2.0, 1.5],
        [0, 0.8], [-2.0, 1.5], [-6.6, 1.9], [-6.6, 1.0]
      ], 0.28);

      // The fin: ONE tall blade, root chord 4.4 on a height of 5.6, with a
      // hard-swept leading edge and a near-upright trailing edge. Taller and
      // narrower than the C-17's (which uses the fighter `geometry.fin` scaled
      // to 1.25 x 2.3), because the stab has to be carried high enough that the
      // gap under it is visible from the side - a T-tail whose stab is close to
      // the body reads as a conventional tail.
      //
      // verticalSurface maps shape +x onto model -z, so the LEADING edge is the
      // +x side and sweeping it back slides the tip chord toward NEGATIVE
      // shape-x. Getting it backwards draws a forward-swept fin, which no
      // transport has.
      // Height raised from 5.6 to 7.0 after the first render: at 5.6 the fin
      // stood barely above the wing centre-section on a body this long and the
      // side view read the stab as sitting on the spine. A T-tail is only
      // legible when the GAP between the stab and the fuselage is obviously
      // taller than the fuselage is deep - the body's half-depth here is ~1.7,
      // and 7.0 of fin puts the stab 5.3 clear of the spine, or three body
      // depths of air under it.
      const finCandid = verticalSurface([
        [-2.3, 0], [2.3, 0], [-0.6, 7.0], [-2.1, 7.0]
      ], 0.34);

      // One engine nacelle, drawn as a long flat-sided pod rather than scaled
      // from geometry.rearBody. The C-17 uses scaled cylinders and they read as
      // fat barrels; the Il-76's D-30KP pods are notably LONG and slim (the
      // aircraft's engines are older, lower-bypass and less fat than a C-17's
      // PW2040s), and drawing the pod is the only way to get that proportion.
      // 5.2 long against 1.5 wide.
      const podCandid = extrudedSurface([
        [0, -2.9], [0.44, -2.55], [0.66, -1.4], [0.66, 1.9], [0.4, 2.3],
        [0, 2.3], [-0.4, 2.3], [-0.66, 1.9], [-0.66, -1.4], [-0.44, -2.55]
      ], 1.0);

      // ---- Fuselage -------------------------------------------------------
      // A long parallel tube. The shared cylinder tapers 0.95 (front) -> 1.55
      // (rear) over 11.5; at sx/sy ~1.15 the section comes out about 3.4 units
      // across = 5.1 m at this scale, against the real Il-76's 4.8 m hold
      // width. sz 1.55 stretches it to 17.8 units, which is the long
      // constant-section hold a strategic lifter has.
      add(geometry.fuselage, primary, 0, 0, -1.4, 1.15, 1.12, 1.55);
      // Upswept aft body, and DELIBERATELY GENTLE. The shared cylinder is
      // already narrower at its +z end, so lifting this section 0.7 and running
      // it back gives the tail-up profile a rear-loader needs - but the C-17
      // beside it lifts 0.95 over a shorter body and kicks up hard, which the
      // spec names as that aircraft's own tell. Half the lift over a longer
      // run is a visibly shallower ramp angle, and it is the correct one: the
      // Il-76's aft body is famously long and shallow.
      add(geometry.fuselage, primary, 0, 0.7, 8.6, 0.98, 0.92, 0.92);

      // ---- Nose and THE GLAZED CHIN ---------------------------------------
      // The radome: short and blunt, the cone cut to 0.85 = 3.6 long.
      add(geometry.nose, primary, 0, 0.12, -10.6, 1.12, 1.04, 0.85);
      // Rounded cap closing the cone tip. geometry.nose is a 4.2-long cone
      // centred on its own origin, so at sz 0.85 it is 3.57 long and its tip is
      // 1.78 ahead of the station: from -10.6 the tip is at -12.38. The cap
      // centre sits at -12.1 with a 1.1 z half-extent reaching -13.2, so it
      // protrudes 0.82 past the cone and the rest of the sphere is buried in
      // it. Its 0.9 half-width against the cone's 1.04 base means the two
      // surfaces meet flush rather than stepping, and the profile is one
      // continuous blunt weather radome.
      add(geometry.canopy, primary, 0, 0.12, -12.1, 0.9, 0.82, 1.1);

      // ================== THE GLAZED CHIN (identity 3) ====================
      // The feature this whole file exists for, and the ONE thing that
      // distinguishes this aircraft from the C-17 at any range.
      //
      // The real Il-76 hangs a navigator's station in a fully glazed
      // hemispherical blister UNDER the nose, below and ahead of the flight
      // deck. It is the single most recognisable thing about the type, it is
      // shared with no other aircraft in this game, and the C-17 specifically
      // has a plain unbroken radome in the same place.
      //
      // Drawn BIG, and hung LOW, and the second of those is the correction the
      // first render forced. The fuselage cylinder is added at sy 1.12 on a
      // primitive whose radius runs 0.95 .. 1.55, so amidships the body's own
      // underside is near y -1.7 and at the nose station it is near y -1.06.
      // The first pass placed the blister's centre at y -0.95 with a 0.62
      // half-height, so the entire bulb lived from -0.33 to -1.57 - which is
      // INSIDE the barrel it was supposed to hang beneath. It rendered as
      // nothing at all: the identity feature of the aircraft was completely
      // swallowed by the hull, and the side view showed a plain C-17 nose.
      //
      // STATION, not just size, was the third render's remaining failure. The
      // blister sat at z -9.4 - but geometry.nose is a 4.2-long cone and at
      // sz 0.85 from station -10.6 it occupies z -12.38 .. -8.82. The chin was
      // therefore directly UNDER the widest part of the radome, and from abeam
      // the cone's own silhouette covered it: the side view showed a plain
      // C-17-ish nose with a faint lump. Being big did not help, because the
      // thing hiding it was in front of it.
      //
      // The blister is now at z -11.2, which is under the cone's FORWARD half
      // where the cone has narrowed to roughly half its base width, and it is
      // dropped to y -1.75. It therefore projects clear of the radome's own
      // outline both downward and forward and cannot be masked by it from any
      // side angle. Spanning 2.2 across, 1.7 deep and 3.4 long, hung so that
      // 1.5 of it stands in open air below the keel: at preview size it is the
      // first thing the eye finds on the nose, which is exactly what an
      // identity feature has to be.
      add(geometry.canopy, canopy, 0, -1.75, -11.2, 1.1, 0.85, 1.7);
      // The glazing FRAME: a dark ring immediately aft of the blister, and a
      // dark strip along its underside centreline. Without these the bulb is a
      // single flat-shaded blue lump and at distance it reads as a sensor
      // turret or a radome, not as WINDOWS. The frame is what says "glass".
      add(geometry.nozzle, dark, 0, -1.6, -9.5, 0.7, 0.55, 0.5);
      add(geometry.panel, dark, 0, -2.55, -11.2, 0.6, 0.1, 2.8);
      // Two glazed FACES let into the blister's flanks, standing proud of it,
      // so the chin reads as glass from directly abeam as well as from below
      // and head-on. Three viewing angles is the test a thumbnail feature has
      // to pass; a bulb visible only from underneath fails it in the side view,
      // which is the view a reviewer looks at first.
      //
      // The flank faces are pushed OUT to x +/-1.24 - wider than the blister's
      // own 1.1 half-width - so they stand proud of its curvature rather than
      // being tangent to it. A face flush with a sphere's side is edge-on from
      // abeam and contributes almost nothing to the side view, which is what
      // the fourth render still showed; a face standing 0.14 proud presents its
      // full area and is what finally makes the chin read as GLASS rather than
      // as a grey fairing when the aircraft is seen from directly beside.
      for (const side of [-1, 1]) {
        add(geometry.panel, canopy, side * 1.24, -1.75, -11.3, 0.12, 1.0, 2.6);
        // Frame bars breaking each face into panes - the same trick the frame
        // ring does, applied where the side view can see it. A single unbroken
        // blue rectangle reads as a painted patch; two bars crossing it read as
        // a window, and that difference is the whole feature.
        add(geometry.panel, dark, side * 1.31, -1.75, -11.3, 0.06, 1.02, 0.14);
        add(geometry.panel, dark, side * 1.31, -1.12, -11.3, 0.06, 0.14, 2.6);
      }
      // A flat glazed face on the blister's UNDERSIDE too, so the top-down and
      // bottom-up reads also land on glass. The dark keel strip above runs
      // along its centreline and breaks it into a left and a right pane.
      add(geometry.panel, canopy, 0, -2.48, -11.2, 0.95, 0.1, 2.6);
      // ====================================================================

      // Flight deck ABOVE and AFT of the chin, on top of the hold. Keeping the
      // two glazed volumes clearly separated in both y and z is what makes the
      // nose read as "cockpit on top, observation station underneath" rather
      // than as one big smear of glass. The step between them is the Il-76's
      // profile.
      add(geometry.canopy, canopy, 0, 1.28, -8.3, 0.8, 0.5, 1.25);
      // Flight-deck side windows, so the crew station is legible from abeam
      // too.
      add(geometry.panel, canopy, -1.15, 1.05, -8.2, 0.1, 0.3, 1.5);
      add(geometry.panel, canopy, 1.15, 1.05, -8.2, 0.1, 0.3, 1.5);

      // ---- High wing ------------------------------------------------------
      // Mounted ON the spine at y 1.5, on a flat centre-section fairing rather
      // than passing through the body. High wing over a fat barrel is the
      // airlifter read, and the fairing restores the flat constant top that the
      // tapering cylinder loses amidships.
      add(geometry.panel, primary, 0, 1.0, 0.4, 3.2, 0.9, 8.0);
      add(wingCandid, primary, 0, 1.5, 0.6);

      // ---- Four podded turbofans ------------------------------------------
      // Stations at +/-5.4 and +/-9.6 - the real Il-76's 8.1 m / 14.4 m engine
      // positions at this scale (5.4 x 2.4 x 0.75 = 9.7 m... the inner pair is
      // set slightly wide of exact so the two pods on each wing are visually
      // separate at preview size rather than merging into one long smear).
      //
      // THE placement decision, and the C-17 separation in the top view: each
      // pod is centred 3.4 ahead of the leading edge station it hangs from, so
      // the nacelle noses stand well out in front of the wing. The C-17's sit
      // close in. Because the wing is sharply swept, the outboard pair sits
      // much further aft than the inboard pair and the four pods form two
      // diagonal lines reaching forward - which is the Candid's top view.
      //
      // Hung UNDER the wing on visible pylons: pod centres at y 0.15 and 0.35
      // against a wing underside of 1.34, with the pylon panels bridging the
      // gap. An engine that touches the wing reads as buried; the gap is what
      // makes it podded, and podded-under is the whole airlifter idiom.
      // HEIGHT is the correction from the first render and the difference
      // between "four engines on a wing" and "four boxes flying in formation
      // near a wing". The wing is added at y 1.5 with a 0.32 extrusion depth,
      // so its underside is at 1.34. The first pass hung the pods at y 0.15 -
      // a 1.19 gap, which at preview size is more air than pod, and the front
      // 3/4 view showed four detached rectangles under an empty wing. The pods
      // now sit at 0.72 and 0.86 (gaps of 0.62 and 0.48) with the pylons
      // physically spanning the remaining distance: close enough to be hung
      // from the wing, far enough that the gap still reads as podded rather
      // than buried.
      for (const side of [-1, 1]) {
        // Inboard pair. The leading edge runs from a root at z -2.8 to a tip at
        // 0.6, so at x 5.4 it is at -2.8 + (5.4/13.9)*3.4 = -1.48; the pod
        // centred at -3.9 puts its nose at -6.8, a clear 6.25 ahead of that
        // edge, and its exhaust at -1.6, just aft of it.
        add(podCandid, secondary, side * 5.4, 0.72, -3.9);
        // Pylon centred at y 1.06 with a 0.32 half-height, so it runs 0.74 ..
        // 1.38 and physically closes the gap between the pod top (0.72+0.5 =
        // 1.22 at the pod's widest) and the wing underside (1.34).
        add(geometry.panel, secondary, side * 5.4, 1.06, -2.6, 0.24, 0.32, 2.4);
        add(geometry.nozzle, dark, side * 5.4, 0.72, -1.4, 0.8, 0.8, 0.9);
        addFlame(side * 5.4, 0.72, -0.3, 0.5, 0.5);
        // Outboard pair, further aft by 1.9 because the swept leading edge has
        // moved out from under them by that much (x 9.6 puts the LE at -0.45).
        add(podCandid, secondary, side * 9.6, 0.86, -2.0);
        add(geometry.panel, secondary, side * 9.6, 1.16, -0.7, 0.22, 0.26, 2.2);
        add(geometry.nozzle, dark, side * 9.6, 0.86, 0.5, 0.76, 0.76, 0.9);
        addFlame(side * 9.6, 0.86, 1.6, 0.48, 0.48);
        // Main-gear blisters low on both flanks. The Il-76 stows its four-bogie
        // main gear in enormous external pods either side of the lower hull and
        // they are a real part of its side profile.
        //
        // SHRUNK from the first pass, which ran them 5.6 long and 1.7 deep in
        // the mid-grey `secondary`. At that size they were the largest single
        // mark on the flank and the side view read as a white aircraft with a
        // dark grey band down its middle - they swallowed the cheatline, the
        // engine pods and half the chin. They are now 4.2 long and 1.1 deep and
        // sit lower (y -1.35), so they read as the blisters they are and the
        // features that actually identify the aircraft get the flank back.
        add(geometry.panel, secondary, side * 1.68, -1.35, 1.8, 0.7, 0.55, 4.2);
      }

      // ---- T-tail group ----------------------------------------------------
      // Dorsal fillet running up into the fin root, the tall fin, then the stab
      // carried at its ABSOLUTE top with a bullet fairing at the junction.
      //
      // Every number in this block is DERIVED from the fin, not chosen by eye.
      // A T-tail whose stab floats above, sinks below, or overhangs its fin tip
      // is the one way this configuration can look wrong, and it is what the
      // first render did.
      //
      // The fin is added at y 0.95 and is 7.0 tall, so its tip is at y 7.95.
      // verticalSurface maps shape +x onto model -z, so at the mount station
      // z 9.6 the fin's TIP CHORD runs world z 9.6-(-0.6)=10.2 back to
      // 9.6-(-2.1)=11.7, i.e. 10.2 .. 11.7, centred on 10.95.
      // The stab is therefore mounted at exactly y 7.95, z 10.95 and its own
      // root chord is 1.6 against that 1.5 - so it caps the fin tip and
      // overhangs it by 0.05 at each end instead of 2.8 at the front.
      add(geometry.panel, primary, 0, 1.1, 6.0, 0.3, 1.1, 3.6);
      add(finCandid, primary, 0, 0.95, 9.6);
      // The bullet fairing at the fin/stab junction: a streamlined pod the real
      // aircraft carries there. It also visually WELDS the stab to the fin,
      // which stops the two surfaces reading as separate objects at distance.
      add(geometry.fuselage, primary, 0, 7.95, 10.95, 0.28, 0.28, 0.34);
      add(stabCandid, primary, 0, 7.95, 10.95);

      // ---- Tail gunner's turret (the second C-17 separation) ---------------
      // The Il-76M carries a manned tail turret under the fin - a genuinely
      // odd thing on a transport, and one this roster's C-17 does not have.
      // Kept small and dark so it reads as a fairing rather than as a weapon
      // dominating an aircraft whose whole role is being a target.
      add(geometry.rearBody, secondary, 0, 0.6, 11.9, 0.5, 0.5, 0.7);
      add(geometry.panel, canopy, 0, 0.85, 12.2, 0.44, 0.28, 0.24);

      // ---- THE CHEATLINE (the paint half of the identity) -------------------
      // A blue stripe down both flanks at the window line, the length of the
      // hold, plus a blue fin flash. This is what makes a white-hulled
      // transport read as ELEM rather than as the neutral white hospital
      // aircraft, and the reason `accent` is blue rather than the grey a
      // military scheme would use.
      //
      // Set out at x +/-1.62 so it stands proud of the fuselage skin (the
      // barrel's half-width is ~1.55 amidships) and cannot z-fight with it,
      // and run from z -8.4 to +6.0 - forward of the tail fillet, aft of the
      // flight-deck windows - which is the one uninterrupted stretch of flank.
      for (const side of [-1, 1]) {
        add(geometry.panel, accent, side * 1.62, 0.42, -1.2, 0.1, 0.34, 14.4);
        // Grey underside below the stripe: the third band of the civil scheme,
        // and what stops the lower hull being a featureless white slab in the
        // bottom view.
        //
        // Trimmed from a 3.0-deep slab to 1.2 and moved down to y -1.15, and
        // shortened at the front to z 0.0 +/- 6.0 so it STOPS at z -6.0 rather
        // than running to -8.2. Both changes are the same correction: the first
        // pass ran a tall grey band the length of the hull and it (a) reached
        // forward over the chin blister's station and greyed out the one
        // feature the side view exists to show, and (b) merged with the gear
        // blisters into a single dark mass. The grey now sits strictly below
        // the cheatline and strictly aft of the nose.
        add(geometry.panel, secondary, side * 1.6, -1.15, 0.0, 0.1, 0.6, 12.0);
      }
      // Fin flash, on both faces of the blade.
      add(geometry.panel, accent, 0, 3.4, 9.4, 0.2, 1.7, 1.9);

      // ---- Details --------------------------------------------------------
      // Anti-glare panel ahead of the windscreen.
      add(geometry.panel, dark, 0, 1.52, -9.4, 0.6, 0.08, 1.4);
      // Wing-to-tail dorsal fairing behind the wing root.
      add(geometry.panel, primary, 0, 1.6, 5.2, 0.34, 0.28, 3.6);
      // Ramp panel under the aft body, climbing from the keel to meet the tail
      // cone - the rear-loading door, seen from below and from the flanks.
      add(geometry.panel, light, 0, -0.5, 7.4, 1.6, 0.16, 4.6).rotation.x = -0.22;
      // Wingtip strobes on the geometric tips at the tip chord's mid-z, so the
      // contrail anchor (tipSpan 13.9 / tipZ 2.1) and the lights agree: the
      // wing is added at z 0.6 and the tip chord's midpoint is 1.5, giving
      // 2.1 in model space.
      add(geometry.canopy, navL, -13.95, 1.5, 2.1, 0.16, 0.16, 0.16);
      add(geometry.canopy, navR, 13.95, 1.5, 2.1, 0.16, 0.16, 0.16);
    }
  });
}
