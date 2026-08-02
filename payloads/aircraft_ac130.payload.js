// AC-130 GUNSHIP - a Hercules airlifter turned into a side-firing weapon.
//
// Enemy/support registration: no AIRCRAFT_ORDER entry ({ order: false }), no
// CAMPAIGNS edit, no mission touched, no balance table moved. The airframe
// exists so a mission can put a circling gunship in the sky; whether anything
// ever flies against it is a decision made elsewhere.
//
// Every flight number is inherited wholesale from the generic `transport` and
// marked BALANCE TODO. The work in this file is the SHAPE and the PAINT, and
// they carry three identities that have to survive at thumbnail size:
//
//   1. HIGH WING, FAT BODY, FOUR TURBOPROPS - the C-130 silhouette. An
//      essentially unswept plank of a wing sitting ON the fuselage spine, four
//      nacelles let INTO that wing with propeller discs turning ahead of its
//      leading edge, a low tailplane under one tall single fin, and an upswept
//      aft ramp. Nothing else in the game has anything standing AHEAD of its
//      wing, which is what makes four bumps on a straight plank read at HUD
//      size.
//   2. THE PORT-SIDE GUN ROW. Three barrels protruding from the LEFT flank
//      only, growing longer aft (a 25 mm rotary forward, a 40 mm amidships, a
//      105 mm howitzer at the aft station), each standing on a raised sponson
//      fairing and each surrounded by a black gun-port panel. This is the
//      aircraft's whole identity: an airlifter is symmetric, and the single
//      thing that says GUNSHIP is that the left side of the hull grew hardware
//      the right side did not. The asymmetry has to be readable from the top
//      view as well as the side, which is why the barrels project 2.5 units
//      CLEAR of the hull rather than being tucked flush.
//   3. CHARCOAL + SENSOR BALL. A dark grey/near-black special-operations hull
//      with a large chin sensor turret under the nose and a second ball low on
//      the port forward flank. Dark paint plus a sphere hanging under the nose
//      is the night-gunship read, and it is also the total separation from the
//      other C-130 on this planform.
//
// SEPARATION FROM hospitalTransport (deliberate and total, both directions):
// that airframe is PURE WHITE with red crosses and is explicitly unarmed with
// no muzzle, pylon or sensor ball anywhere on the hull. This one is CHARCOAL,
// carries three barrels out of its port flank and two sensor balls, and wears
// no cross of any kind. Same planform family, opposite paint, opposite
// hardware - a viewer cannot confuse them at any range at which either is
// visible at all.
//
// SCALE DERIVATION (measured off live airframes, not guessed). The roster runs
// a consistent metres-per-scaled-unit rate:
//   F-16  model spans z -10.9 .. 9.35 = 20.25 units at theme.scale 1.00
//         -> 20.25 scaled units for a real 15.03 m aircraft = 0.742 m/unit
//   Tu-95 model spans z -13.9 .. 12.5 = 26.4 units at theme.scale 2.30
//         -> 60.7 scaled units for a real 46.2 m aircraft = 0.761 m/unit
//   both land on ~0.75 m per scaled unit.
// The target is the AC-130 footprint from the spec: 29.8 m long on a 40.4 m
// span, which needs 39.7 x 53.9 scaled units. This model runs z -10.15 (nose
// cap tip) to +10.2 (tailplane trailing edge) = 20.35 units on a 13.5
// half-span = 27.0 span, and theme.scale 2.0 puts it at 40.7 x 54.0 scaled
// units. At the measured 0.75 m/unit that is 30.5 m x 40.5 m against the
// 29.8 / 40.4 target - within 2.4% on length and 0.2% on span, and correctly
// SMALLER than the in-game C-17 transport (scale 2.6) parked beside it while
// being far wider than it is long, which is the Hercules proportion.
//
// The half-span is 13.5 against hospitalTransport's 13.4 on purpose: the real
// AC-130 spans 40.4 m against the C-130H's 40.4 m as well, so the two should
// be within a hair of each other rather than identical by copy. The 0.1
// difference is the gun-side sponson work, not a different wing.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;
  const transport = AIRCRAFT_TYPES.transport;
  const transportAI = ENEMY_AI_PROFILES.transport;
  if (!transport || !transportAI) {
    throw new Error("[ac130] expected the transport aircraft and AI templates to exist");
  }

  // Sera special-operations palette: a charcoal hull one step off black with a
  // slightly darker machinery tone, and a dull amber accent that lands on the
  // propeller spinner hubs (addProp paints its hub in `accent` automatically)
  // and on the muzzle flash rings around the gun ports. Amber rather than the
  // cyan the fighter line uses, because the one thing this aircraft's paint has
  // to say is "night", and a cold accent on a black hull reads as stealth
  // fighter instead of gunship.
  //
  // primary 0x2f3338 is NOT pure black on purpose. A MeshStandardMaterial at
  // metalness 0.52 in a scene with no environment map returns black for its
  // metallic half, so an already-black theme colour renders as an unreadable
  // silhouette with no surface at all - the gun row would vanish into the hull
  // it protrudes from. The build() function below de-metals the hull for the
  // same reason hospitalTransport does, in the opposite direction: that one
  // needed white not to go grey, this one needs charcoal not to go black.
  const theme = {
    primary: 0x2f3338,
    secondary: 0x24282d,
    accent: 0xc98a2e,
    canopy: 0x7ac6e0,
    exhaust: 0xffb066,
    scale: 2.0,
    variant: "ac130"
  };

  // ---- 1. Flight entry -----------------------------------------------------
  // BALANCE TODO: placeholder. Every flight-model number below (speeds, rates,
  // damping, stall, HP) is the generic transport's, unreviewed for a smaller
  // four-prop airframe - a Hercules is slower and tighter-turning than a
  // strategic jet lifter, and a gunship in its firing orbit flies a continuous
  // banked left-hand pylon turn that no number here expresses. The numbers
  // should eventually say all of that.
  // `spw` is stripped: a special weapon is a player affordance and this
  // airframe is not in the hangar.
  const { spw: _noPlayerSpecialWeapon, ...gunshipBase } = transport;
  ctx.addAircraft("ac130", {
    ...gunshipBase,
    id: "ac130",
    label: "AC-130 GUNSHIP",
    role: "Fire Support Gunship",
    tag: "ENEMY",
    enemyOnly: true,
    blurb: "輸送機の左舷を砲列に置き換えた重火力ガンシップ。暗灰の機体で夜を旋回し、左へ傾いたまま地上を舐めるように撃つ。鈍重だが、その射線に入れば逃げ場は無い。",
    // Contrail anchor on the geometric wingtip: the planform's half-span is
    // 13.5 and the tip chord runs z -1.0 .. 0.4, so the tip station is its
    // mid-chord at -0.3. The nav lights at the bottom of build() sit on the
    // same two numbers, so the trail leaves the light rather than floating
    // inboard of it.
    tipSpan: 13.5, tipZ: -0.3,
    theme
  }, { order: false });

  // ---- 2. AI profile -------------------------------------------------------
  // BALANCE TODO: placeholder. Spread from the transport profile, which flies a
  // straight unarmed patrol. A real gunship orbits and shoots sideways, and the
  // `armored` behaviour has no concept of either - so this entry is honest
  // about being a placeholder rather than pretending to be a fire-support AI.
  // Only the hitbox, the fireball and the radar/tracer colours are rescaled to
  // this airframe here.
  ctx.addEnemyProfile("ac130", {
    ...transportAI,
    label: "GUNSHIP",
    // The transport carries hitboxScale 3.0 at theme scale 2.6; this airframe
    // is 2.0, and 3.0 x 2.0/2.6 = 2.3 keeps metres-per-hitbox identical rather
    // than handing the smaller aircraft the bigger jet's hit volume.
    hitboxScale: 2.3,
    // Same rule for the fireball: 1.7 x 2.0/2.6 = 1.3.
    explosionScale: 1.3,
    radarColor: "#ffb04d",
    tracerColor: 0xffb04d,
    explosionColor: 0xffb066,
    theme
  });

  // ---- 3. Model ------------------------------------------------------------
  ctx.addAircraftModel("ac130", {
    // Top view in the shared 40x44 box, nose up. Traced off the model rather
    // than drawn freehand: every vertex is a real part station run through
    // x = 20 + 1.4*mx, y = 1.5 + 1.942*(mz + 10.4), so the outline and the
    // aircraft cannot drift apart.
    //
    // Reading down the page: a blunt nose into a fat parallel body, then FOUR
    // nacelle noses standing ahead of a nearly straight leading edge, the wide
    // low-taper plank of a wing, and a broad straight tailplane at the fin -
    // the Hercules read - PLUS three barrels breaking the LEFT edge of the
    // body outline between the wing root and the flight deck. Screen-left is
    // model -x, so the aircraft's port side is the left edge of this path and
    // that is where the spikes are drawn. A silhouette that stayed symmetric
    // would throw away the one feature that identifies this aircraft.
    silhouette:
      "M20 1.5 L22.1 6.3 L21.9 18.6 L23.7 18.7 L23.7 12.6 L25.5 12.6 " +
      "L25.5 18.8 L28.2 19.0 L28.2 12.6 L30.0 12.6 L30.0 19.2 L38.9 19.9 " +
      "L38.9 22.6 L21.9 25.4 L21.2 35.8 L27.3 36.6 L27.3 38.8 L21.1 41.1 " +
      "L20 41.4 L18.9 41.1 L12.7 38.8 L12.7 36.6 L18.8 35.8 L18.1 25.4 " +
      "L1.1 22.6 L1.1 19.9 L10.0 19.2 L10.0 12.6 L11.8 12.6 L11.8 19.0 " +
      "L14.5 18.8 L14.5 12.6 L16.3 12.6 L16.3 18.7 L18.1 18.6 " +
      "L18.1 15.4 L14.0 14.9 L14.0 14.0 L18.1 14.4 " +
      "L18.05 12.2 L13.2 11.6 L13.2 10.7 L18.05 11.2 " +
      "L18.0 9.0 L12.4 8.3 L12.4 7.4 L18.0 8.0 L17.9 6.3 Z",

    build(env) {
      const {
        geometry, extrudedSurface, verticalSurface,
        primary, secondary, accent, canopy, dark, light, navL, navR,
        add, addProp
      } = env;

      // ---- Making the charcoal actually read as a SURFACE --------------------
      // The mirror image of the problem hospitalTransport solved, and just as
      // load-bearing here.
      //
      // createAircraftModel builds `primary` as makeAircraftMaterial(colour,
      // metalness 0.52, roughness 0.34). A MeshStandardMaterial at metalness
      // 0.52 takes roughly half its colour from a reflected environment, and
      // this scene has no environment map - so the metallic half returns BLACK.
      // On a white hull that produces grey; on a hull that is ALREADY dark it
      // produces an unlit silhouette with no readable form at all, and every
      // piece of shape work in this file - the gun row, the sponsons, the
      // nacelles - would be invisible against the body it sits on.
      //
      // These are this model's OWN material instances (createAircraftModel
      // makes a fresh set per airframe from the theme) and they are already in
      // the returned `standardMaterials`, so they are flashed on a hit and
      // disposed with the model. Retuning them here is therefore free: it
      // touches no other aircraft and leaks nothing. Building new materials
      // instead WOULD leak, because standardMaterials is a fixed list this
      // builder cannot add to.
      //
      // Low-sheen tactical paint is the physical truth for a special-operations
      // hull anyway, so metalness 0.05 with a high roughness is both the right
      // look and the right material model. The small emissive lift guarantees
      // the shadowed side keeps enough value for the gun row's black port
      // panels to still read as DARKER than the hull around them - which is
      // the contrast the identity depends on.
      primary.metalness = 0.05;
      primary.roughness = 0.68;
      primary.emissive.copy(primary.color).multiplyScalar(0.5);
      primary.emissiveIntensity = 1.0;
      // updateAircraftFlash restores from these on the way out of a hit flash,
      // so they have to be re-cached after the change or the first hit would
      // permanently reset the hull to the old dim emissive.
      primary.userData.baseEmissive = primary.emissive.clone();
      primary.userData.baseIntensity = primary.emissiveIntensity;
      // Machinery one step darker but lifted slightly LESS, so nacelles and
      // sponsons stay distinguishable from the hull they are mounted on rather
      // than merging into one black mass.
      secondary.metalness = 0.05;
      secondary.roughness = 0.7;
      secondary.emissive.copy(secondary.color).multiplyScalar(0.4);
      secondary.emissiveIntensity = 1.0;
      secondary.userData.baseEmissive = secondary.emissive.clone();
      secondary.userData.baseIntensity = secondary.emissiveIntensity;
      // The amber accent is the ONE warm thing on the aircraft and it marks the
      // gun ports and the spinner hubs. It gets a real emissive lift so the
      // muzzle rings stay legible against charcoal at preview range - on a dark
      // hull an unlit accent is just another dark patch.
      accent.metalness = 0.08;
      accent.roughness = 0.44;
      accent.emissive.copy(accent.color).multiplyScalar(0.62);
      accent.emissiveIntensity = 1.0;
      accent.userData.baseEmissive = accent.emissive.clone();
      accent.userData.baseIntensity = accent.emissiveIntensity;
      // `light` is the stock 0xd8dee3 grey and it is what the BARRELS are made
      // of. Gun steel is the brightest thing on this airframe by a wide margin,
      // and that is the entire reason the barrels read: three light spikes on a
      // charcoal hull. Painting them `dark` (the obvious "gun is black" choice)
      // was the first version of this file and the row disappeared completely.
      light.metalness = 0.42;
      light.roughness = 0.42;
      light.emissive.copy(light.color).multiplyScalar(0.26);
      light.emissiveIntensity = 1.0;
      light.userData.baseEmissive = light.emissive.clone();
      light.userData.baseIntensity = light.emissiveIntensity;

      // ---- Planforms ------------------------------------------------------
      // THE wing: half-span 13.5 on a 20.4 body - much wider than the aircraft
      // is long, and essentially UNSWEPT. The leading edge rakes back only 0.75
      // over the whole half-span where the in-game C-17 rakes 6.6, so from
      // above this is a plank: root chord 3.6 held nearly constant out past the
      // outboard engine station, then thinning to a 1.4 tip. Straight-and-
      // enormous is the first read of a Hercules from any height, and it is
      // also the whole separation from the swept C-17/Il-76 wing.
      const wingHerc = extrudedSurface([
        [0, -1.75], [3.2, -1.68], [13.5, -1.0], [13.5, 0.4], [7.0, 1.62],
        [0, 1.85], [-7.0, 1.62], [-13.5, 0.4], [-13.5, -1.0], [-3.2, -1.68]
      ], 0.34);

      // LOW-SET tailplane, half-span 5.2, carried on the tail cone with the
      // same straight leading edge as the wing. A C-130 puts its stab on the
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
      // rather than scaled from geometry.fuselage: a cylinder tapered
      // 1.55 -> 0.95 has no parallel section and four of them on a wing read as
      // four fuel drums. A drawn pod is 3.9 long and 1.5 wide with a rounded
      // nose and a squared-off exhaust, which is a turboprop nacelle from any
      // angle.
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
      // is the wall the GUN SPONSONS mount to and it is what makes the front
      // view read as a box-bottomed airlifter instead of a tube. The cylinder
      // alone cannot hold a constant section, so the slab fakes it.
      add(geometry.panel, primary, 0, -0.55, -2.3, 2.7, 1.55, 11.8);
      // Blunt nose. The cone is 4.2 long and cut to 0.5 = 2.1, far shorter than
      // a fighter's, with a squashed sphere cap rounding the tip off instead of
      // spiking it - the idiom the E-2D uses for its stub radome.
      add(geometry.nose, primary, 0, 0.05, -8.9, 1.32, 1.02, 0.5);
      // Rounded cap closing the cone tip. geometry.nose is a 4.2-long cone
      // centred on its own origin, so at sz 0.5 it is 2.1 long and its tip is
      // only 1.05 ahead of the station: from -8.9 the tip is at -9.95. The cap
      // centre sits at -9.6, INSIDE the cone, with a 0.55 z half-extent
      // reaching -10.15 - so it protrudes 0.2 past the cone's tip and the rest
      // of the sphere is buried in it. The sphere's 0.86 half-width against the
      // cone's 1.02 base means the two surfaces meet flush rather than
      // stepping. The profile is one continuous blunt radome, the C-130 nose.
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
      // tapering cylinder loses amidships.
      add(geometry.panel, primary, 0, 0.88, -0.9, 3.5, 0.9, 7.0);
      add(wingHerc, primary, 0, 1.4, 0);

      // ---- Four turboprops ------------------------------------------------
      // Inner pair at +/-3.4, outer at +/-6.6 - the real 4.9 m / 9.6 m engine
      // stations at this scale (x 3.4 x 2.0 x 0.75 = 5.1 m, x 6.6 = 9.9 m).
      //
      // HEIGHT: the pods sit at y 1.24 with the wing surface at 1.4 +/- 0.17,
      // so each nacelle is let INTO the wing and the leading edge cuts through
      // it. Hung lower they read as four free-floating cylinders under a plank.
      // REACH: the pod runs z -2.4 .. +1.5 about its centre at -0.9, so it
      // projects 0.65 ahead of the root leading edge (-1.75) and its exhaust
      // ends level with the trailing edge. A turboprop nacelle is longer than
      // its wing chord in both directions; a pod that stops short of the
      // leading edge cannot put a propeller disc in front of the wing, which is
      // the entire C-130 read from above.
      //
      // Discs at radius 1.6 turn at z -3.1, a clear 1.35 ahead of the leading
      // edge. Slightly oversized the way the E-2D's are, because an
      // honest-scale disc vanishes at preview distance. Counter-rotating `side`
      // spins the pairs symmetrically.
      //
      // NO flames anywhere on this aircraft: a turboprop has no afterburner,
      // the rule the Tu-95 and the E-2D already follow in this codebase.
      for (const side of [-1, 1]) {
        for (const station of [3.4, 6.6]) {
          const x = side * station;
          add(nacelleHerc, secondary, x, 1.24, -0.9);
          // Spinner fairing ahead of the pod; the amber hub addProp draws for
          // us sits inside it.
          add(geometry.nose, secondary, x, 1.24, -3.4, 0.42, 0.42, 0.4);
          addProp(x, 1.24, -3.1, 1.6, side);
          // Exhaust stack on the pod's aft end, in `dark` - on a charcoal hull
          // the machinery accents go DARKER, the opposite of what the white
          // medevac airframe needs.
          add(geometry.nozzle, dark, x, 1.24, 0.9, 0.44, 0.44, 0.55);
        }
      }

      // ---- Tail group -----------------------------------------------------
      // Dorsal fillet running up into the fin root, then the single broad fin
      // and the low straight tailplane cutting through the tail cone.
      add(geometry.panel, primary, 0, 1.05, 5.2, 0.26, 1.05, 2.6);
      add(finHerc, primary, 0, 1.05, 7.9);
      add(stabHerc, primary, 0, 0.92, 8.7);

      // ---- THE PORT-SIDE GUN ROW ------------------------------------------
      // The identity, and the only reason this airframe is not the medevac
      // transport in different paint.
      //
      // Everything here is at NEGATIVE x and there is no mirrored loop, which
      // is the point: the row must be visibly one-sided. On the real aircraft
      // the guns fire out of the left side because the pilot flies a left-hand
      // pylon turn and can see the target over his own shoulder, and the
      // asymmetry is the most recognisable thing about the type.
      //
      // Three stations, running aft, each bigger than the last - the real
      // ascending battery (25 mm rotary / 40 mm Bofors / 105 mm howitzer). The
      // size gradient matters as much as the count: three identical spikes read
      // as a sensor rail or an antenna farm, while three spikes growing aft
      // read as a battery. Station z values are spread over the whole cabin
      // (-5.4 to +1.6) rather than bunched, so the row is a ROW at top-view
      // scale and not a single blob.
      //
      // BARREL PROJECTION is the number that decides whether this works. The
      // slab wall is at x -1.35; each barrel's outboard tip reaches x -3.9 to
      // -4.6, so 2.5 to 3.2 units of gun stand clear of the hull. That is 1.9
      // to 2.4 m at this scale - deliberately longer than scale honesty would
      // give a 105 mm tube sticking out of a fuselage, because at preview and
      // combat range a flush-mounted muzzle is invisible and the aircraft
      // reverts to being a plain transport. The barrels are also the BRIGHTEST
      // material on the model (`light`), for the same reason.
      //
      // Each station is built the same way: a raised sponson fairing on the
      // wall, a black gun-port recess panel let into it, an amber muzzle ring,
      // and the barrel itself lying along x.
      //
      // geometry.nozzle and geometry.missileBody are both cylinders built
      // around the model's z axis, so a barrel pointing sideways has to be
      // ROTATED. `add` only exposes rotation.z, which is not the axis needed
      // here - so the barrel meshes are rotated on y after the fact via the
      // returned mesh, the same way the aft ramp panel above sets rotation.x.
      // Rotating a z-axis cylinder by -PI/2 about y sends its long axis to +x;
      // the meshes are placed at negative x so their bodies extend outboard to
      // port.
      // THREE CORRECTIONS from the first render, and all three are the
      // difference between "a gunship" and "a transport with some panel lines":
      //
      //  - HEIGHT. The guns now sit at y -1.05, near the BOTTOM of the slab
      //    wall, rather than at its mid-height -0.35. The wing above spans
      //    +/-13.5 at y 1.4 and it OCCLUDES everything close to the hull's
      //    vertical centre from directly above - the first pass put the whole
      //    row in the wing's shadow and the top view showed three faint
      //    hairlines that read as panel seams on the wing, not as guns on the
      //    body. Slung low, the barrels clear the wing's underside and stand
      //    against open background in the top view, which is the only place
      //    the one-sidedness can be counted.
      //  - MASS. Barrel radii went 0.17/0.23/0.32 -> 0.30/0.40/0.55 and the
      //    sponsons grew with them. The propeller blades are 0.34 wide and
      //    there are sixteen of them; a barrel thinner than a prop blade loses
      //    every contest for attention on this airframe, and the first render
      //    lost all three. A 105 mm tube on a Hercules really is about as thick
      //    as a man, so the fat end of this range is honest scale as well.
      //  - REACH. Barrel lengths went 2.5/3.0/3.4 -> 3.4/4.0/4.6, so the aft
      //    muzzle now stands at x -6.7 against a 1.35 hull wall: over five
      //    units of gun in clear air. Deliberately longer than scale honesty
      //    would give, because the top view is 40 units wide and a barrel that
      //    protrudes less than a tenth of that is not a feature.
      //  - STATION SPACING, the correction from the SECOND render. The middle
      //    gun was at z -1.6, which is dead under the wing root: the plank runs
      //    chord -1.75 .. +1.85 at the centreline, so from directly above that
      //    barrel was covered along its entire inboard half and the top view
      //    showed TWO guns, not three. Two spikes read as a pair of pylons;
      //    three reads as a battery, and the count is the identity. The row is
      //    now split around the wing rather than through it - two stations
      //    FORWARD of the leading edge (-6.4, -3.6) and one well AFT of the
      //    trailing edge (+3.4) - so every barrel meets open background in the
      //    top view. Splitting 2+1 also matches the real aircraft, which hangs
      //    its light guns forward of the wing box and its howitzer behind it,
      //    because the wing box is exactly where a cabin cannot have a hole in
      //    its side.
      //  - THE SCALE BUG, and the reason two renders in a row drew hairlines
      //    where this file asked for gun barrels. `add` takes SCALE FACTORS,
      //    not dimensions, and geometry.missileBody is a cylinder of radius
      //    ~0.25 and length 4.1 - so passing barrelR 0.34 produced an actual
      //    radius of 0.34 x 0.25 = 0.085, about a QUARTER of the intended
      //    thickness and thinner than a propeller blade. Every "make the
      //    barrels fatter" pass before this one was multiplying a number that
      //    was already four times too small. The stations below now carry real
      //    model-unit dimensions and the scale factors are DERIVED from them
      //    against the primitive's own size, which is the only way these
      //    numbers stay meaningful when read back.
      const BARREL_GEO_RADIUS = 0.25;   // geometry.missileBody, measured
      const BARREL_GEO_LENGTH = 4.1;    // geometry.missileBody, measured
      const NOZZLE_GEO_RADIUS = 0.55;   // geometry.nozzle, measured (0.48/0.62 ends)
      const NOZZLE_GEO_LENGTH = 1.4;    // geometry.nozzle, measured
      const gunStations = [
        // [z station, barrel length, barrel RADIUS in model units, sponson half-z]
        [-6.6, 3.6, 0.30, 1.05],  // 25 mm rotary, forward, thinnest
        [-3.2, 4.3, 0.42, 1.25],  // 40 mm Bofors, ahead of the wing
        [3.6, 5.2, 0.58, 1.75]    // 105 mm howitzer, aft of the wing, the fat one
      ];
      const gunY = -1.05;
      for (const [z, barrelLen, barrelR, sponsonHalfZ] of gunStations) {
        // Sponson fairing: a raised blister on the port wall that the gun grows
        // out of. Without it the barrels look glued to a flat slab; with it
        // they look mounted, and the blister itself is a second, coarser cue
        // that survives when the thin barrels stop resolving at distance.
        add(geometry.panel, secondary, -1.66, gunY, z, 0.72, 1.15, sponsonHalfZ * 2);
        // The gun port: a black recess panel standing just proud of the
        // sponson, the darkest thing on the airframe. This is what makes the
        // row read as OPENINGS in the side of the aircraft, and it is the cue
        // that carries the SIDE view where the barrels are pointing at the
        // camera and project to almost nothing.
        add(geometry.panel, dark, -2.06, gunY, z, 0.16, 0.92, sponsonHalfZ * 1.6);
        // Amber muzzle ring at the barrel root - the one warm mark on the
        // flank, and the thing that catches the eye and sends it to the guns.
        // Sized to stand 1.6x the barrel's own radius so it reads as a collar
        // around the tube rather than as a bead on a wire.
        {
          const ringR = (barrelR * 1.6) / NOZZLE_GEO_RADIUS;
          add(geometry.nozzle, accent, -2.24, gunY, z, ringR, ringR, 0.3 / NOZZLE_GEO_LENGTH)
            .rotation.y = -Math.PI / 2;
        }
        // THE BARREL. Placed so its centre is barrelLen/2 outboard of the
        // muzzle ring, giving a tube running from x -2.24 out to
        // x = -2.24 - barrelLen. At the aft station that is -7.44, against a
        // hull wall at -1.35: over six units of gun standing in clear air on a
        // 40-unit-wide sheet.
        //
        // geometry.missileBody is a cylinder built around the model's z axis,
        // so a sideways barrel has to be rotated; `add` only exposes
        // rotation.z, which is the wrong axis, so the mesh is rotated on y
        // afterwards the same way the aft ramp panel sets rotation.x. Rotating
        // a z-axis cylinder by -PI/2 about y sends its long axis to +x, and the
        // negative placement extends the body outboard to port.
        //
        // Both scale factors are DERIVED, not guessed: dividing the wanted
        // dimension by the primitive's measured one. This is the fix for the
        // hairline bug described above.
        add(
          geometry.missileBody, light,
          -2.24 - barrelLen / 2, gunY, z,
          barrelR / BARREL_GEO_RADIUS,
          barrelR / BARREL_GEO_RADIUS,
          barrelLen / BARREL_GEO_LENGTH
        ).rotation.y = -Math.PI / 2;
        // Muzzle cap: a wider dark ring at the outboard tip, so each barrel
        // terminates in a definite muzzle rather than fading out into the
        // background at the exact point the eye is trying to measure it.
        {
          const capR = (barrelR * 1.35) / NOZZLE_GEO_RADIUS;
          add(geometry.nozzle, dark, -2.24 - barrelLen, gunY, z, capR, capR, 0.36 / NOZZLE_GEO_LENGTH)
            .rotation.y = -Math.PI / 2;
        }
      }
      // Blast/heat shielding strake along the port wall linking the three
      // stations into one continuous installation. Without it the guns read as
      // three unrelated objects; with it they read as a battery bay, which is
      // what the real aircraft's armoured left side looks like. Run along the
      // BOTTOM edge of the sponson band at the new gun height.
      add(geometry.panel, dark, -1.5, gunY - 1.0, -1.5, 0.12, 0.26, 10.4);

      // ---- SENSOR BALLS ---------------------------------------------------
      // Identity 3, and the other half of the "night gunship" read. Two turrets:
      //
      // CHIN BALL, on the centreline under the nose - the big EO/IR turret.
      // Placed at z -7.6, under the flight deck and clear of the nose gear, and
      // sized 0.82 so it is unmistakably a SPHERE hanging below the hull rather
      // than a bulge in it. A gunship that finds its targets in the dark is
      // defined as much by this ball as by the guns, and it is the feature that
      // reads from head-on where the port row is edge-on and weakest.
      add(geometry.canopy, secondary, 0, -1.32, -7.6, 0.82, 0.78, 0.82);
      // The dark glass face on its forward-lower quadrant, so the ball reads as
      // an optical turret and not as a fuel tank.
      add(geometry.canopy, dark, 0, -1.52, -8.05, 0.56, 0.5, 0.36);
      // PORT FORWARD BALL, on the gun side ahead of the first gun station - the
      // second sensor a real gunship carries so the fire-control officer keeps
      // eyes on the target through the whole orbit. It also serves a
      // compositional purpose: it caps the forward end of the gun row, so the
      // row reads as an installation that starts somewhere rather than as three
      // objects trailing off toward the nose.
      // Carried HIGH on the wall (y 0.15) rather than at gun height, because
      // the forward gun station moved to z -6.4 in the third pass and the two
      // would otherwise occupy the same volume. High and forward is also where
      // the real aircraft's second turret sits.
      add(geometry.canopy, secondary, -1.5, 0.15, -6.9, 0.5, 0.5, 0.5);
      add(geometry.canopy, dark, -1.86, 0.1, -7.0, 0.26, 0.34, 0.34);

      // ---- Details --------------------------------------------------------
      // Main-gear sponsons: the long external blisters low on both flanks,
      // under the wing. A Hercules stows its mains OUTSIDE the pressure hull
      // and those bulges are half the side profile. These are SYMMETRIC - they
      // are landing gear, not weapons, and making them asymmetric would blunt
      // the one asymmetry that matters.
      add(geometry.panel, secondary, -1.52, -0.95, 3.2, 0.55, 0.9, 3.4);
      add(geometry.panel, secondary, 1.52, -0.95, 1.3, 0.55, 0.9, 4.8);
      // Nose-gear bulge under the flight deck, offset aft of the chin ball so
      // the two do not fight for the same station.
      add(geometry.panel, secondary, 0, -1.45, -5.9, 0.72, 0.42, 1.4);
      // Anti-glare panel ahead of the windscreen.
      add(geometry.panel, dark, 0, 1.3, -8.3, 0.62, 0.07, 1.1);
      // Countermeasure dispenser blocks on the aft lower flanks - the boxes a
      // low-flying gunship wears, and a cheap piece of "this thing expects to
      // be shot at" on an otherwise plain aft body.
      add(geometry.panel, dark, -1.5, -1.1, 4.6, 0.16, 0.3, 1.2);
      add(geometry.panel, dark, 1.5, -1.1, 4.6, 0.16, 0.3, 1.2);
      // Dorsal SATCOM blister on the spine aft of the wing.
      add(geometry.canopy, secondary, 0, 1.42, 3.2, 0.6, 0.34, 1.1);
      // Wingtip strobes on the geometric tips at the tip chord's mid-z, so the
      // contrail anchor (tipSpan 13.5 / tipZ -0.3) and the lights agree.
      add(geometry.canopy, navL, -13.55, 1.4, -0.3, 0.15, 0.15, 0.15);
      add(geometry.canopy, navR, 13.55, 1.4, -0.3, 0.15, 0.15, 0.15);
    }
  });
}
