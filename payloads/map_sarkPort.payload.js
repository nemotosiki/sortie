// SARK PORT (`sarkPort`) - the Kedem republic's container port, at noon-ish.
// Story map for M03 and M05 (`docs/story_reboot/02_maps_units_style.md`); M05
// "PORT OF ASH" revisits it burning, which is a SEPARATE preset built later.
// This one is the port in peacetime, and nothing here is on fire.
//
// ---- The three things that say "this is Sark Port" -------------------------
//   1. A ROW OF GANTRY CRANES standing along the western quay. Twelve of them,
//      108 m to the mast head against a 100 m tallest roof in town, with two
//      box boats alongside under their booms - so the silhouette against the
//      sea is the first thing read from any altitude.
//   2. A GRID OF COLOURED CONTAINERS behind them. ~660 stacks in nine liveries
//      on a 22 x 30 m lattice: a colour field from high up, individual boxes
//      from the deck.
//   3. A CANAL CUT INTO THE LAND with bridges over it. 1.2 km of water (dx -300
//      to +900, measured at build time, not authored) slicing the southern lobe
//      off the landmass, three bridges across it, the middle one a cable-stayed
//      span whose 118 m pylons are the tallest thing on the map.
//
// ---- Real-world scale ------------------------------------------------------
// The plateau is radius 1700 m at the waterline, so the island is ~3.4 km
// across - about the size of the built part of Rotterdam's Waalhaven, and half
// of Singapore's Tanjong Pagar. The city lattice is 96 m block pitch with 28 m
// streets (68 m of building), against nightCity's 128/34: a port town has
// smaller blocks than a capital. The city reaches r 660 m, so the built-up area
// is ~1.32 km across. The terminal apron is 860 x 980 m, which is a real
// two-berth container terminal (Waalhaven's are 700-1100 m of quay).
//
// Cost: 907 boxes and 16 cylinders, i.e. TWO instanced draw calls for the whole
// port, plus one quad for the canal. The city on top of that is the same single
// InstancedMesh nightCity ships.
//
// ---- The one number every placement is measured off -------------------------
// PLATEAU CAP = y 22. `mountains.plateau.height` is [22, 22] and a flat top
// sits at the FULL mesh height, so the ground the port stands on is y = 22
// exactly. `surfaceHeightAt` returns 20.24 there (the 0.92 collision clamp),
// which is 1.76 m LOW - see the desertBasin note in index.html for how that
// bug bites. Nothing here reads a height from the sampler; the sampler is used
// only as a yes/no test for "is this point on the flat cap", and every Y comes
// from the constant. Paved decks are at y 23 (1 m proud of the cap, so no
// coplanar z-fighting with the terrain).
//
// ---- Why the layout is shaped the way it is --------------------------------
// The cap is NOT a disc. buildMountainGeometry displaces a 16-gon cone by two
// angular harmonics, so the flat top's radius swings between ~1000 and ~1940 m
// depending on bearing. Measured in-page with a binary-search probe against
// `surfaceHeightAt` (mountains.count 6 fixes the rng draw order, so these are
// stable for this preset):
//
//   west  edge by dz:  -1000:1020  -800:1408  -600:1529  -400:1621  -200:1590
//                          0:1547   +200:1477  +400:1149  +600:812
//   south edge by dx:  -1000:1001  -800:1015  -600:1064  -400:1072  -200:1235
//                          0:1564   +200:1590  +400:1463  +600:1337  +800:1195
//                       +1000:1019
//   north edge by dx:   -400:1020  -200:1092      0:1200  +200:1437  +400:1665
//                        +600:1872  +800:1732  +1000:1592
//   east  edge by dz:   -400:1073  -200:1040      0:1042  +200:1066  +400:1098
//
// So: a broad west shore (1.4-1.6 km out for dz -800..+200) which is where the
// terminal goes, a big southern lobe (1.5 km at dx 0..+200) which is what the
// canal cuts off, a north-east bulge to 1.9 km, and pinch points at the
// north-west and due east around 1.0 km. The one circle guaranteed to be on
// flat ground is r 1000.
//
// The four preview cameras stand 115 degrees round from the sun, which for this
// preset's sun puts all three terrain shots due WEST of the island looking
// east. That is why the crane row runs NORTH-SOUTH (broadside to the camera,
// so it reads as a row rather than as one crane) and the canal runs EAST-WEST
// with its bridges crossing north-south (so the bridges are broadside too).
// Change the sun and the composition rotates out from under this.
export default function register(ctx) {
  ctx.addWorldPreset("sarkPort", {
    label: "SARK PORT",
    // The subject is the island, not the origin. Every origin-relative scenery
    // ring (background mountains, scenery islands, sea stacks, cloud decks)
    // re-centres on this, exactly as nightCity does - otherwise the horizon
    // around the port would be bare while a full archipelago sat in open water
    // 3 km behind the player.
    sceneryOrigin: [0, -3000],
    clearColor: 0x9fb9c4,
    // Early afternoon, hazier than coastalPlain: a working port throws dust and
    // stack gas, and the horizon going pale is what separates this from the
    // clean coastal map.
    sky: [[0, "#0d2440"], [0.3, "#2f6b93"], [0.6, "#9ac6d8"], [0.74, "#e8dfc8"], [1, "#57798a"]],
    atmosphere: { seed: 0x7a1c31, noise: 0.021, haze: 0.17, thinClouds: 16, cloudOpacity: 0.06, cloudBand: [0.44, 0.72], cloudTint: 0xf0f4f2 },
    // The longest visibility of any preset, and it has to be. The island is
    // 3.4 km across and the OVERVIEW camera stands 4.2 km out from its centre,
    // so the FAR shore is ~6.4 km from the lens. Measured on the first pass at
    // near/far 1400/6000: the near shore came back 39% fogged and the far shore
    // 100%, i.e. the whole island bleached to sky colour and the canal was gone.
    // 1800/9500 puts those at 18% and 60% - haze rather than erasure, and still
    // the second-shortest daylight visibility after desertBasin's dust.
    fog: { color: 0xa8c0c8, near: 1800, far: 9500 },
    // 26 degrees up and 150 degrees round - mid-afternoon, high enough to light
    // the container tops (which is where the colour lives) rather than only
    // their west faces.
    sun: {
      position: [1450, 1420, -2500], color: 0xfff0c8, radius: 86,
      glare: [
        { scale: 1600, color: 0xffeccb, opacity: 0.5 },
        { scale: 440, color: 0xfffbe8, opacity: 0.92 }
      ]
    },
    moon: null,
    stars: null,
    sunRoad: {
      color: 0xffd98a, opacity: 0.24, width: 560, length: 3200,
      rotationY: Math.atan2(-1450, 2500), position: [870, 0.4, -1500]
    },
    // Harbour water, not open ocean: normalScale and normalSpeed are both well
    // under archipelagoDay's, because a basin behind a breakwater does not have
    // a swell in it and a chopping sea next to a moored terminal reads wrong.
    ocean: {
      base: "#1a5a6e", bright: "168, 220, 226", dark: "10, 46, 60",
      repeat: 26, roughness: 0.42, metalness: 0.22,
      normalRepeat: 40, normalScale: [0.24, 0.4], normalSpeed: [0.008, 0.003], normalSeed: 0x7a1c32
    },
    // `peak` is the colour of the plateau cap, because a flat top's vertices
    // sit at height fraction 1.0 - i.e. this is the colour of the ground the
    // port stands on, seen between the blocks and around the terminal. Made
    // ground, not grass, and not beach: at the first pass's 0x8f8a7e the cap
    // came back the same value as the shore band under hemi 2.05 + key 2.9, and
    // the whole island read as a sand bar with a container yard parked on it.
    // This engine's daylight lifts a mid albedo by roughly 1.8x (measured
    // against coastalPlain's 0x8d9263 cap, which renders pale olive), so the
    // authored value has to sit that far BELOW the intended read: 0x565750
    // comes back as concrete.
    // `textureProfile: "urban"` is nightCity's, for the same reason.
    terrain: {
      seed: 0x7a1c33, sand: 0xa89a7c, grass: 0x5e7044, rock: 0x6a685c,
      peak: 0x565750, snow: 0xe9eff2, textureProfile: "urban",
      fineRepeat: 26, macroRepeat: 4.6, normalRepeat: 28,
      normalStrength: 0.3, islandNormalStrength: 0.2, normalFade: [180, 1350],
      rockSlope: [0.24, 0.68], shoreHeight: 0.2, snowSoftness: 0.09
    },
    // Daylight, so the ambient does most of the work; the key is only strong
    // enough to put a lit side and a shaded side on 800-odd container stacks,
    // which is the entire reason the yard reads as three-dimensional.
    lights: {
      hemi: { sky: 0xd8f0ff, ground: 0x35342b, intensity: 2.05 },
      key: { color: 0xfff2d8, intensity: 2.9, position: [1000, 1250, -700] },
      fill: { color: 0x8ccaff, intensity: 0.78, position: [-700, 260, 900] }
    },
    mountains: {
      // count 6 is load-bearing in a way it is not on any other map: the
      // mountain rng is a FIXED seed shared by every preset, so the plateau -
      // built last - draws its depth, yaw and displacement harmonics from
      // whatever the count leaves on the stream. Changing this number reshapes
      // the cap and invalidates every measured edge in the header above.
      //
      // distance starts past the plateau's own worst-case footprint (1700 x the
      // 1.38 peak of the angular displacement = 2350) plus a hill's own radius,
      // so the ring can never be drawn into the port.
      count: 6, radius: [170, 320], height: [110, 250], distance: [4300, 5400],
      snowyAbove: 9999, snowLine: 0.66, roughness: 0.94,
      palette: { low: 0x46543a, mid: 0x5b6746, rock: 0x6a685c, peak: 0x565750, snow: 0xe9eff2 },
      corridor: null,
      // The land. r 1700 / h 22 / topRadius 0.92 comes straight from the map
      // spec, and the three numbers pull in different directions: the radius
      // has to hold a terminal, a town and a canal side by side; the height has
      // to stay low so the 8% collision clamp is only 1.76 m (a mesa here would
      // bury ground units and force the fight above the city instead of in it);
      // and 0.92 leaves a 136 m rim that climbs 22 m - a 9 degree beach the
      // waterfront can sit on rather than a cliff.
      plateau: { radius: [1700, 1700], height: [22, 22], topRadius: 0.92, at: [0, -3000], snowyAbove: 9999 }
    },
    islands: { count: 6, stone: 0x5d6a58, green: 0x51703f },
    // scale 0.9 rather than the day map's 1.0: `hero: true` parks two big low
    // banks at fixed offsets from sceneryOrigin, and on the first pass one of
    // them sat on top of the island in the OVERVIEW cell. Fewer, smaller puffs
    // keep the sky populated without putting cotton over the subject.
    clouds: {
      scale: 0.9, hero: false, color: 0xf2f7f7, opacity: 0.7,
      cirrusColor: 0xe9f2f5, cirrusOpacity: 0.28,
      texture: { seed: 0x7a1c34, contrast: 1.03, underside: 0.4, softness: 1.02 }
    },
    decor: {
      seed: 0x8f3a11,
      // Fences the whole landmass plus the harbour basin the breakwater
      // encloses. The decoration pass knows nothing about where the decorator
      // put the quay, so a scenery island dropped at 2.4 km would stand in the
      // approach channel.
      keepClear: [{ x: 0, z: -3000, r: 2600 }],
      extraIslands: { count: 10, radius: [130, 300], height: [30, 90], distance: [3300, 4500] },
      shore: { sand: 0xc2b494, shallow: 0x63b3c4, opacity: 0.85, width: 1.28 },
      trees: { perIsland: 14, color: 0x3a5f38, trunk: 0x4a3a28, height: [10, 22] },
      rocks: { count: 18, color: 0x4a5a52, scale: [8, 22] },
      // ---- The town -------------------------------------------------------
      // One InstancedMesh for every building, exactly as nightCity does it.
      // `at` MUST equal the plateau's `at`: createWorld finds the plateau by
      // matching these two coordinates to within a metre, and a mismatch drops
      // the whole city to y 0 (buried in the island) with no cap clipping.
      city: {
        at: [0, -3000],
        // 96 m pitch with 28 m streets = 68 m of building. A port town's blocks
        // are smaller than a capital's (nightCity is 128/34), and the finer
        // lattice is most of what makes this read as a different KIND of place
        // rather than as the night city repainted.
        cell: 96, street: 28,
        // Two rings, and low. The core tops out at 78 m against nightCity's
        // 190 - Sark is a working town, not a financial district. r 710 is what
        // the terminal can spare and not a metre more: the inland container
        // store ends at dx -743, the canal's north quay wall stands at dz -888,
        // and the bridges' north ramps land at dz -760. All three are the
        // reason this number is not larger, and the first of them is also why
        // it is not 730 - at 730 the store had to be pulled back to dx -830,
        // which is inside the LOW PASS camera's 106 m blind zone, and that cell
        // lost every container in it.
        //
        // Both fills are up from the first pass (0.82/0.64): at that density
        // the outer ring came back as scattered boxes on bare ground - a
        // village, not a town - next to a terminal that fills every square
        // metre it owns.
        districts: [
          { r: [0, 320], height: [46, 78], fill: 0.86 },
          { r: [320, 710], height: [18, 42], fill: 0.76 }
        ],
        maxHeight: 78,
        // Pale plaster under a TERRACOTTA roof. Measured on the third pass:
        // at wall 0xa89f90 / roof 0x6b6157 the town was within a few percent of
        // the cap's own value and the whole district read as flat plates on
        // grey ground from every camera above 300 m. The port's own buildings
        // are grey and its ground is concrete, so giving the town the one warm
        // roof colour on the map separates "where people live" from "where
        // cargo is" instantly, at any altitude.
        wall: 0xc9bda6, roof: 0x9c5f42,
        // Daylight glazing, not lit rooms. The window sheet is an EMISSIVE map
        // (index.html hard-codes emissiveIntensity 0.55), so anything bright
        // here would be lit windows at noon. These two are dark slate blues:
        // multiplied through 0.55 they add ~0.05 of luminance, which reads as
        // glass catching the sky rather than as a light being on.
        windows: { warm: 0x3a4048, cold: 0x4a5866, lit: 0.34, rows: 14, cols: 10, repeat: 6 },
        // No `grid` and no `beacons`: both are additive point sprites written
        // for a night map, and street lamps burning at 14:00 is the single
        // fastest way to make a daylight city look wrong.
      },
      extraClouds: {
        towers: 4, towerSize: [70, 120], towerBase: 950,
        stratus: 9, stratusSize: [190, 320], stratusBase: 1600,
        distance: [2300, 4200]
      }
    }
  });

  // ---------------------------------------------------------------------------
  // The works: everything `decor` has no vocabulary for. Container terminal,
  // gantry cranes, canal, bridges, warehouses, tank farm, breakwater.
  //
  // Every solid here is a BOX, and every box is one instance of a single
  // InstancedMesh with a per-instance colour - ~1500 objects for one draw call.
  // The only exceptions are the tank farm and the lighthouse (cylinders, second
  // batch) and the canal surface (needs its own water material).
  //
  // Nothing in here is collision. `world.mountains` is untouched, so a crane is
  // scenery the same way a tree is: do not put a ground unit under one.
  // ---------------------------------------------------------------------------
  ctx.addWorldDecorator("sarkPortWorks", {
    worlds: ["sarkPort"],
    build(env) {
      const { THREE, preset, addRoot, keepGeometry, keepMaterial, surfaceHeightAt } = env;

      const plateau = preset.mountains.plateau;
      const CX = plateau.at[0];
      const CZ = plateau.at[1];
      // The cap sits at the full mesh height. surfaceHeightAt clamps to 0.92 of
      // it, which is what the on-cap test below compares against - it is a
      // membership test, never a height.
      const CAP_Y = plateau.height[0];
      const CLAMP_Y = CAP_Y * 0.92;
      // Paved surfaces. 1 m proud of the terrain so two coplanar quads never
      // fight over the same depth values.
      const DECK = CAP_Y + 1;

      // Local (dx, dz) are offsets from the plateau centre; every number in
      // this file is local, and only these two helpers convert.
      const onCap = (dx, dz) => surfaceHeightAt(CX + dx, CZ + dz) >= CLAMP_Y - 0.08;

      // Deterministic and self-contained: the world's own decorRng is not
      // exposed to decorators, and borrowing a shared stream would mean this
      // file's container colours changed whenever something upstream drew one
      // more random number.
      let seedState = 0x5a12c7 >>> 0;
      const rand = () => {
        seedState = (seedState + 0x6d2b79f5) >>> 0;
        let v = Math.imul(seedState ^ (seedState >>> 15), seedState | 1);
        v ^= v + Math.imul(v ^ (v >>> 7), v | 61);
        return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
      };
      const pick = (list) => list[Math.floor(rand() * list.length) % list.length];

      // ---- Box batch --------------------------------------------------------
      // Collected first, uploaded once: an InstancedMesh has to be allocated at
      // its final count, and an over-allocated instance buffer is GPU memory
      // paid for nothing.
      const boxes = [];
      // rot is [rx, ry, rz] in radians, omitted for the axis-aligned majority.
      const box = (x, y, z, sx, sy, sz, color, rot) => {
        boxes.push({ x, y, z, sx, sy, sz, color, rot });
      };
      const cylinders = [];
      const cyl = (x, y, z, r, h, color) => { cylinders.push({ x, y, z, r, h, color }); };

      const CONCRETE = 0x82817a;
      const DARK_CONCRETE = 0x6f6e68;
      const ASPHALT = 0x53534e;
      const STEEL_WHITE = 0xdfe4e6;
      const CRANE_ORANGE = 0xd4552f;
      const CRANE_BLUE = 0x2b5f8c;

      // =====================================================================
      // 1. TERMINAL APRON
      // =====================================================================
      // The quay is a straight line and the shoreline is not, so the apron is
      // reclaimed ground: a solid slab from y -4 up to the deck, laid across
      // the plateau's rim and out past the waterline everywhere along its
      // length. That is what gives the terminal a continuous 27 m quay wall
      // standing IN the water instead of a beach appearing wherever the cap
      // happens to recede.
      //
      // Extents are read off the measured west edge: over dz -790..+190 the cap
      // stops between 1414 and 1621 m out, and the waterline is 1.087x that
      // (the rim runs from 0.92r to r), i.e. 1537-1762. Outer face at 1800
      // clears the furthest of those by 38 m. Inner edge at 940 is 470 m inside
      // the nearest cap edge, so the landward half of the slab is buried.
      const APRON_W = -1800;
      const APRON_E = -940;
      const APRON_S = -790;
      const APRON_N = 190;
      box(
        (APRON_W + APRON_E) / 2, (DECK + -4) / 2, (APRON_S + APRON_N) / 2,
        APRON_E - APRON_W, DECK + 4, APRON_N - APRON_S,
        CONCRETE
      );
      // Fender line along the quay face. 16 m of dark deck is the crane rail,
      // the bollards and the fender run collapsed into the one thing that is
      // actually legible from the air: a hard edge saying where the ship goes.
      box(APRON_W + 12, DECK + 0.6, (APRON_S + APRON_N) / 2, 20, 2.2, APRON_N - APRON_S, 0x3a3833);
      // Two service roads across the apron, so the yard reads as blocks with
      // lanes between them rather than as one undifferentiated field.
      box((APRON_W + APRON_E) / 2, DECK + 0.15, -250, APRON_E - APRON_W, 0.6, 26, ASPHALT);
      box(-1105, DECK + 0.15, (APRON_S + APRON_N) / 2, 26, 0.6, APRON_N - APRON_S, ASPHALT);

      // =====================================================================
      // 2. GANTRY CRANES - identification feature #1
      // =====================================================================
      // Twelve ship-to-shore cranes on ONE rail pair, on 76 m centres, covering
      // 836 m of the 980 m quay. Two rules govern this block and both were
      // learned by getting them wrong first:
      //
      //   RULE 1 - THE CRANES STAND ON THE QUAY, NEVER IN THE YARD. Both rails
      //   (-1790 and -1756) are west of the yard's west edge (-1697), so there
      //   are 60 m of clear apron between the landward leg and the first
      //   container. The boom's backreach stops at -1720, which is still 23 m
      //   short of the yard - so nothing belonging to a crane is ever DRAWN
      //   over the stacks either. That last part matters as much as the first:
      //   the cameras look down the quay from the west, so anything projecting
      //   inland lands visually on top of the yard whether it stands there or
      //   not, and a boom that overhangs the stacks reads as a pole standing
      //   among them.
      //
      //   RULE 2 - THE PORTAL HAS TO BE A FRAME, AND THE BOOM HAS TO BE FLAT.
      //   The first build gave each crane a mast plus TWO orange diagonal stays
      //   on top of an orange boom. Thirty-six orange diagonals over a container
      //   yard is a scaffolding site, not a port (measured on the APPROACH pass
      //   - the row was unreadable). There is now exactly ONE orange element per
      //   crane, the boom, and it is horizontal; the only diagonal left is a
      //   single WHITE forestay. The frame underneath is what carries the
      //   silhouette: four 7 m box legs, a sill beam across the gauge at 15 m
      //   (the gate lorries drive through) and a 38 m deep machinery girder on
      //   top, which is what stops the portal reading as four sticks and a bar.
      //
      // Proportions are a real post-panamax crane: 34 m rail gauge, 62 m to the
      // portal girder, 84 m of outreach past the waterside rail (which is what
      // puts the boom over BOTH moored ships - see section 9), 36 m backreach.
      // Mast head at 22 + 92 = 114 m: the tallest thing on the map bar the
      // cable-stayed bridge's 118 m pylons.
      const CRANE_SEA_RAIL = -1790;
      const CRANE_LAND_RAIL = -1756;
      const CRANE_MID_RAIL = (CRANE_SEA_RAIL + CRANE_LAND_RAIL) / 2;
      const CRANE_BOOM_TIP = -1874;
      const CRANE_BOOM_HEEL = -1720;
      const CRANE_BOOM_Y = DECK + 72;
      const CRANE_MAST_TOP = DECK + 92;
      const CRANE_COUNT = 12;
      const CRANE_Z0 = -730;
      const CRANE_PITCH = 76;
      // The rails themselves, drawn once for the whole row rather than per
      // crane. Two dark lines running the length of the berth are the cheapest
      // possible way to say "these twelve machines are on one track".
      for (const rail of [CRANE_SEA_RAIL, CRANE_LAND_RAIL]) {
        box(rail, DECK + 0.35, -300, 7, 0.9, 1000, 0x3a3833);
      }
      for (let i = 0; i < CRANE_COUNT; i += 1) {
        const dz = CRANE_Z0 + i * CRANE_PITCH;
        for (const rail of [CRANE_SEA_RAIL, CRANE_LAND_RAIL]) {
          for (const off of [-15, 15]) {
            box(rail, DECK + 29, dz + off, 7, 58, 7, STEEL_WHITE);
          }
        }
        // Sill beams: the horizontal member that turns two pairs of legs into
        // two portals. Without these the leg tops are the only thing joined and
        // the machine reads as four separate posts.
        for (const off of [-15, 15]) {
          box(CRANE_MID_RAIL, DECK + 15, dz + off, 41, 5, 6, STEEL_WHITE);
        }
        // Machinery girder. 38 m deep in Z on purpose - it is the one solid
        // BLOCK in the whole assembly, and a solid block on four legs is what
        // the eye resolves as a gantry at two kilometres.
        box(CRANE_MID_RAIL, DECK + 62, dz, 48, 9, 38, STEEL_WHITE);
        // The boom: horizontal, 154 m, reaching 84 m past the waterside rail so
        // it is over the ship rather than over the water beside it.
        box(
          (CRANE_BOOM_TIP + CRANE_BOOM_HEEL) / 2, CRANE_BOOM_Y, dz,
          CRANE_BOOM_HEEL - CRANE_BOOM_TIP, 7, 13, CRANE_ORANGE
        );
        box(CRANE_BOOM_HEEL - 10, DECK + 74, dz, 20, 13, 24, CRANE_BLUE);
        box(CRANE_LAND_RAIL, DECK + 79, dz, 9, 26, 12, STEEL_WHITE);
        // One white forestay, mast head to boom tip. Rotated about Z, the axis
        // that tilts a box inside the XY plane the crane is drawn in.
        const fdx = CRANE_BOOM_TIP - CRANE_LAND_RAIL;
        const fdy = CRANE_BOOM_Y - CRANE_MAST_TOP;
        box(
          CRANE_LAND_RAIL + fdx / 2, CRANE_MAST_TOP + fdy / 2, dz,
          Math.hypot(fdx, fdy), 2.6, 2.6, STEEL_WHITE, [0, 0, Math.atan2(fdy, fdx)]
        );
      }

      // =====================================================================
      // 3. CONTAINER YARD - identification feature #2
      // =====================================================================
      // Each instance is a STACK, not a box: 14 x 26 m of ground carrying two
      // to five tiers of 2.7 m. A single 40-foot container is 12 x 2.4 m, which
      // is a third of a pixel at the OVERVIEW camera's 11 m/px - the yard has
      // to be built out of the unit a yard is actually read in, which is the
      // stack. At the LOW PASS camera's 2.1 m/px a stack is 6 x 12 px, so the
      // individual colours separate; at APPROACH's 6.3 m/px they fuse into the
      // speckled field a container terminal looks like from a run-in.
      //
      // The whole yard sits on the apron slab (dx -1800..-940), so no ground
      // test is needed here - the slab IS the ground.
      //
      // YARD_N is a composition number, not a capacity one. At +140 the stacks
      // ran the full 980 m of apron and the terminal filled the APPROACH frame
      // wall to wall: the required reading is "container yard AND town", and the
      // town was a strip in the corner. Cutting the north 240 m gives the yard
      // 540 x 640 m - still the biggest single object on the island and still
      // three hundred-odd stacks, but smaller in plan than the town (r 710),
      // with the northern third of the apron left as open quay and sheds.
      const LIVERIES = [
        0xb23a2e, 0x2f5f8a, 0x2e6b46, 0xc46a1f, 0x8a8f93,
        0x7a2f3a, 0x1f7a86, 0xc9a227, 0x8c4a2f
      ];
      const YARD_W = -1690;
      const YARD_E = -1120;
      const YARD_S = -740;
      const YARD_N = -100;
      const BAY_PITCH = 22;
      const ROW_PITCH = 30;
      for (let x = YARD_W; x <= YARD_E; x += BAY_PITCH) {
        // Every seventh bay is a straddle-carrier lane. Without it the yard is
        // a solid rectangle of colour; with it, it is blocks - and blocks are
        // what makes the eye read "stored goods" rather than "texture".
        if (Math.round((x - YARD_W) / BAY_PITCH) % 7 === 6) continue;
        for (let z = YARD_S; z <= YARD_N; z += ROW_PITCH) {
          if (rand() > 0.7) continue;
          const tiers = 2 + Math.floor(rand() * 4);
          const h = tiers * 2.7;
          box(x, DECK + h / 2, z, 14, h, 26, pick(LIVERIES));
        }
      }

      // =====================================================================
      // 4. WAREHOUSES AND THE BACK YARD
      // =====================================================================
      // The strip between the terminal and the town, dx -1090..-700. Three
      // things share it: transit sheds, an inland container store, and the rail
      // head.
      //
      // Sheds are 130 x 180 m and 24 m to the eaves, with a roof slab 6 m proud
      // of the body on every side. The overhang is the whole trick - a box with
      // a contrasting lid reads as a building with a roof, and a box without
      // one reads as a box. The first pass used 150 x 190 x 19 with a 8 m
      // overhang and a near-white lid, and they came back as flat painted
      // rectangles: the overhang was hiding the very walls that make a shed a
      // shed. 3 m of eave and a slate lid is what fixed it.
      //
      // The corner test is what keeps this honest if the plateau is ever
      // reshaped: a shed whose footprint leaves the flat cap is dropped rather
      // than left standing on a slope.
      // Warm MID greys, and both halves of that matter. They were cool
      // blue-greys, which put them within a few percent of the canal's own
      // value and hue - a shed roof and a stretch of water became the same pale
      // rectangle from the HORIZON camera. Warm fixes that. But the first swing
      // went to near-white (0xbcb6a8), and a near-white lid on a 24 m shed
      // blows out to a flat plate from any camera above 300 m, which is the
      // failure the eaves were shortened to fix. Warm and mid, not warm and
      // bright.
      const SHED_ROOFS = [0x9d968a, 0x7a6a58];
      const placeShed = (dx, dz, sx, sz, height, roof) => {
        const hx = sx / 2;
        const hz = sz / 2;
        if (!onCap(dx - hx, dz - hz) || !onCap(dx + hx, dz - hz) ||
            !onCap(dx - hx, dz + hz) || !onCap(dx + hx, dz + hz)) return false;
        box(dx, CAP_Y + height / 2, dz, sx, height, sz, 0xa8a49a);
        box(dx, CAP_Y + height + 1.4, dz, sx + 6, 2.8, sz + 6, roof);
        return true;
      };
      for (let col = 0; col < 2; col += 1) {
        placeShed(-1000 + col * 260, -620, 130, 180, 24, SHED_ROOFS[col % 2]);
        placeShed(-1000 + col * 260, -400, 130, 180, 24, SHED_ROOFS[(col + 1) % 2]);
      }
      // The north end of the apron, freed by pulling YARD_N back to -100.
      // Transit sheds rather than more stacks: the point of the cut was to stop
      // containers owning the island, so what replaces them has to be a
      // different kind of object. Base is DECK, not CAP_Y - this is the paved
      // slab, a metre proud of the terrain.
      for (let i = 0; i < 3; i += 1) {
        const dx = -1580 + i * 210;
        box(dx, DECK + 11, 40, 170, 22, 190, 0xa8a49a);
        box(dx, DECK + 23.4, 40, 176, 2.8, 196, SHED_ROOFS[i % 2]);
      }

      // Inland container store. This block exists for ONE camera: LOW PASS
      // stands at dx -897 / dz -80 at 80 m AGL and looks east, so this is the
      // ground directly ahead of it. Without something here that cell has no
      // container in it at all - the cranes and the yard are both behind the
      // lens by then.
      //
      // The EAST edge is the load-bearing number, not the west one. At 80 m up
      // and 5 degrees down, the bottom of the frame meets a 13 m stack 89 m
      // ahead of the camera, so anything east of about dx -808 is under the
      // shot. -750 puts three full columns in frame.
      for (let x = -1030; x <= -750; x += BAY_PITCH) {
        // The store straddles the apron's inner edge, so half of it stands on
        // paving at DECK and half on the bare cap a metre lower. Using one
        // height for both would bury a whole column by a metre.
        const base = x <= APRON_E ? DECK : CAP_Y;
        for (let z = -170; z <= 170; z += ROW_PITCH) {
          if (rand() > 0.66) continue;
          const h = (2 + Math.floor(rand() * 4)) * 2.7;
          box(x, base + h / 2, z, 14, h, 26, pick(LIVERIES));
        }
      }

      // Rail head. Three tracks on one ballast bed, running from the back of
      // the terminal to the goods station on the far side of the island, with a
      // spur up into the sheds and three quayside loading tracks on the apron.
      // A port with rail is a port that ships inland, and from the air a
      // dead-straight double line is the cheapest infrastructure cue there is.
      //
      // dz -846 threads a 50 m gap: the canal's north quay wall stands at -896
      // and the canal-side sheds start at -785. Nothing else on the map fits
      // between those two.
      const RAIL_Z = -846;
      const railLine = (cx, cz, lengthX, lengthZ) => {
        const along = lengthX >= lengthZ;
        box(cx, CAP_Y + 0.3, cz, lengthX, 0.6, lengthZ, 0x6a655c);
        for (const off of [-13, 0, 13]) {
          box(
            cx + (along ? 0 : off), CAP_Y + 0.75, cz + (along ? off : 0),
            along ? lengthX : 4, 0.9, along ? 4 : lengthZ, 0x3c3a35
          );
        }
      };
      railLine(-70, RAIL_Z, 1660, 44);
      railLine(-860, -613, 44, 466);
      for (const rx of [-1010, -1044, -1078]) {
        box(rx, DECK + 0.3, -290, 8, 0.9, 900, 0x3c3a35);
      }

      // =====================================================================
      // 5. CANAL - identification feature #3
      // =====================================================================
      // The terrain cannot be cut, so the canal is drawn ON the cap: a water
      // surface 184 m wide at y 22.4, edged by 26 m quay walls with a pale
      // coping strip along the top of each. The walls are what sell it - a
      // coloured strip lying on flat ground is a painted line, and the same
      // strip inside a raised kerb is a channel.
      //
      // ---- A CANAL JOINS TWO THINGS. ------------------------------------
      // The first build stopped the water where the SOUTH BANK ran out of
      // ground, which left a 1.2 km rectangle ending in the middle of the
      // island: a pond, not a canal. The three spans are now measured
      // separately, because they genuinely differ:
      //
      //   water  - runs as far as the CENTRELINE has cap under it, roughly
      //            dx -1020 to +1030, i.e. shore to shore
      //   south wall - only dx -290..+925, where the southern lobe exists
      //   north wall - nearly the full length, the north side being deeper land
      //
      // Past each end the surface continues as a RAMP that drops at 9 degrees
      // through the plateau's rim and carries on below y 0, where the ocean
      // plane hides it. The rim itself falls at ~14 degrees, so the ramp stays
      // clear of the terrain the whole way down and the channel reads as
      // running out into open water at both ends. That is the entire fix for
      // "a canal has to connect somewhere": it now does, twice.
      //
      // The centreline dz -1000 is fixed by what it has to clear at once.
      // North: the town reaches r 730, and the canal's north wall stands at
      // dz -882, leaving a 150 m waterfront street. South: the measured south
      // edge is 1001-1590 m out, which is what decides where the banks stop and
      // therefore how much of the southern lobe is cut off as a harbour island.
      const CANAL_Z = -1000;
      const CANAL_HALF = 92;
      const CANAL_S = CANAL_Z - CANAL_HALF;
      const CANAL_N = CANAL_Z + CANAL_HALF;
      // Walks outward from a known-good point in 20 m steps. Nothing here is
      // hard-coded: reshape the plateau and the canal re-measures itself.
      const spanOf = (probeZ) => {
        let lo = 300;
        let hi = 300;
        while (lo > -1600 && onCap(lo - 20, probeZ)) lo -= 20;
        while (hi < 1600 && onCap(hi + 20, probeZ)) hi += 20;
        return [lo, hi];
      };
      const [waterW, waterE] = spanOf(CANAL_Z);
      const [southW, southE] = spanOf(CANAL_S - 13);
      const [northW, northE] = spanOf(CANAL_N + 13);
      if (waterE - waterW > 400) {
        // Four cross-sections: the submerged end of the west ramp, the two
        // shore points where the surface goes level, and the submerged end of
        // the east ramp. RAMP_FALL at 9 degrees over 240 m puts both outer
        // sections 15.6 m under the sea surface.
        const RAMP_RUN_OUT = 240;
        const RAMP_FALL = RAMP_RUN_OUT * Math.tan((9 * Math.PI) / 180);
        const surfaceY = CAP_Y + 0.4;
        const sections = [
          [waterW - RAMP_RUN_OUT, surfaceY - RAMP_FALL],
          [waterW, surfaceY],
          [waterE, surfaceY],
          [waterE + RAMP_RUN_OUT, surfaceY - RAMP_FALL]
        ];
        // Hand-built rather than a rotated plane: three quads at three
        // different pitches is one buffer this way, and three meshes with
        // composed quaternions the other.
        const positions = [];
        const indices = [];
        for (const [sx, sy] of sections) {
          positions.push(sx, sy, CANAL_S, sx, sy, CANAL_N);
        }
        for (let i = 0; i < sections.length - 1; i += 1) {
          const a = i * 2;
          indices.push(a, a + 1, a + 3, a, a + 3, a + 2);
        }
        const canalGeometry = keepGeometry(new THREE.BufferGeometry());
        canalGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        canalGeometry.setIndex(indices);
        canalGeometry.computeVertexNormals();
        const canalMaterial = keepMaterial(new THREE.MeshStandardMaterial({
          // Darker, colder and less saturated than the first build's 0x27697e.
          // That value sat at the same lightness as the transit-shed roofs and
          // the two became indistinguishable rectangles from the HORIZON camera
          // - the single worst legibility failure on the map. Dredged water in
          // a walled cut is in shadow half the day; it should read closer to
          // the open sea (`ocean.base` #1a5a6e) than to anything built.
          color: 0x143f54, roughness: 0.5, metalness: 0.08
        }));
        const canal = new THREE.Mesh(canalGeometry, canalMaterial);
        canal.position.set(CX, 0, CZ);
        addRoot(canal);
        // Quay walls, each measured to its own bank. Bottom at 20 so they are
        // anchored in the cap rather than hovering on it; top at 27.5, i.e.
        // 5.5 m of parapet.
        const wall = (z, w, e) => {
          if (e - w < 200) return;
          box((w + e) / 2, 23.75, z, e - w, 7.5, 20, 0x807d73);
          // Coping: a 1.1 m capping strip along the top of the wall, which is
          // what draws the actual EDGE of the cut - at range the wall face is
          // in shadow and merges with the water, and this line is what says the
          // ground stops here.
          //
          // Both the width and the value are down from the first attempt at it
          // (30 m of 0xc6c2b6). Measured on the APPROACH pass: two near-white
          // 30 m strips either side of a 26 m wall put 112 m of bright concrete
          // around 184 m of water, and at 3.5 km through 22% fog the edging was
          // most of what the eye got - the channel read as a pale road. The
          // water itself was always right (#3d5b6a against the open sea's
          // #306273); it was being framed out of its own canal.
          box((w + e) / 2, 28.05, z, e - w, 1.1, 22, 0xada79a);
        };
        // Clamped to the water: the north bank has cap under it for 2.5 km,
        // which is 380 m more than the channel is long, and a quay wall running
        // on past the end of its own canal is a wall standing in a field.
        wall(CANAL_S - 13, Math.max(southW, waterW), Math.min(southE, waterE));
        wall(CANAL_N + 13, Math.max(northW, waterW), Math.min(northE, waterE));
      }

      // =====================================================================
      // 6. BRIDGES
      // =====================================================================
      // Three crossings. Decks run north-south, which is broadside to all three
      // terrain cameras - a bridge seen end-on is a wall. Deck top at y 34
      // gives 11.6 m over the canal surface, and the ramps drop 11 m over
      // 120 m (5 degrees) to meet the ground at either end.
      //
      // The middle span is cable-stayed. It is the one piece of pure landmark
      // on the map: 118 m pylons, visible from the HORIZON camera standing in
      // the middle of the city, and the thing that makes "there is a canal" a
      // fact readable from any of the four cells rather than three of them.
      const DECK_TOP = 34;
      const RAMP_RUN = 120;
      // The north approach is shorter than the south one. Its toe has to land
      // OUTSIDE the town's outer district (r 730) or a housing block ends up
      // standing on the road: at 120 m the toe was at dz -740 against blocks
      // reaching -742 with jitter, and at 100 m it is at -760 with 18 m clear.
      const RAMP_RUN_N = 100;
      const RAMP_DROP = DECK_TOP - (CAP_Y + 1);
      const buildBridge = (dx, cableStayed) => {
        const deckS = -1255;
        const deckN = -860;
        box(dx, DECK_TOP - 1.75, (deckS + deckN) / 2, 26, 3.5, deckN - deckS, DARK_CONCRETE);
        // Piers. Two stand in the channel, two on the banks; the banked pair is
        // mostly buried, which is correct and costs nothing.
        for (const pz of [-1200, -1070, -930, -880]) {
          box(dx, 19.25, pz, 13, 22.5, 13, DARK_CONCRETE);
        }
        // Approach ramps. Rotated about X: a positive angle drops the +Z end,
        // so the north ramp takes +theta and the south ramp -theta. Each is
        // clipped back to the last on-cap point if the lobe runs out first.
        const theta = Math.atan2(RAMP_DROP, RAMP_RUN);
        const runN = onCap(dx, deckN + RAMP_RUN_N) ? RAMP_RUN_N : RAMP_RUN_N * 0.5;
        box(
          dx, (DECK_TOP + CAP_Y + 1) / 2 - 1.75, deckN + runN / 2,
          26, 3.5, Math.hypot(runN, RAMP_DROP * (runN / RAMP_RUN_N)), DARK_CONCRETE,
          [Math.atan2(RAMP_DROP, RAMP_RUN_N), 0, 0]
        );
        const runS = onCap(dx, deckS - RAMP_RUN) ? RAMP_RUN : RAMP_RUN * 0.5;
        box(
          dx, (DECK_TOP + CAP_Y + 1) / 2 - 1.75, deckS - runS / 2,
          26, 3.5, Math.hypot(runS, RAMP_DROP * (runS / RAMP_RUN)), DARK_CONCRETE,
          [-theta, 0, 0]
        );
        if (!cableStayed) return;
        for (const pz of [CANAL_S, CANAL_N]) {
          for (const off of [-17, 17]) {
            box(dx + off, CAP_Y + 48, pz, 7, 96, 7, 0xe4e8e6);
            // Four stays per pylon face, fanning from the upper third of the
            // tower down to the deck. Thin boxes rather than lines: a Line has
            // no thickness in WebGL past 1 px and would vanish at range, which
            // is the one distance the bridge has to work at.
            for (let s = 0; s < 4; s += 1) {
              const top = CAP_Y + 96 - s * 9;
              const reach = 42 + s * 26;
              const dir = pz === CANAL_S ? -1 : 1;
              const dyy = DECK_TOP - top;
              box(
                dx + off, (top + DECK_TOP) / 2, pz + (dir * reach) / 2,
                2, 2, Math.hypot(reach, dyy), 0xd8dcda,
                [Math.atan2(-dyy, dir * reach), 0, 0]
              );
            }
          }
        }
      };
      buildBridge(-80, false);
      buildBridge(260, true);
      buildBridge(580, false);

      // =====================================================================
      // 7. HARBOUR ISLAND - tank farm and transit sheds
      // =====================================================================
      // The lobe the canal cuts off is 1.2 km long and up to 490 m deep at
      // dx 0..+200. Filling it matters: an empty strip of ground on the far
      // side of a canal reads as an accident of the terrain, and the same strip
      // with tanks and sheds on it reads as the reason the canal is there.
      const TANK_ROWS = [
        { dz: -1290, count: 5, dx0: 40 },
        { dz: -1400, count: 4, dx0: 100 }
      ];
      for (const row of TANK_ROWS) {
        for (let i = 0; i < row.count; i += 1) {
          const dx = row.dx0 + i * 96;
          if (!onCap(dx - 40, row.dz) || !onCap(dx + 40, row.dz)) continue;
          cyl(dx, CAP_Y + 11, row.dz, 36, 22, i % 3 === 0 ? 0xb9bcb4 : 0xdcdedb);
        }
      }
      for (let i = 0; i < 4; i += 1) {
        placeShed(-140 + i * 210, -1180, 150, 110, 15, SHED_ROOFS[i % 2]);
      }
      // A second, smaller stack of boxes on the island - the overflow yard.
      // Same liveries, so it reads as the same port rather than as unrelated
      // scenery that happens to be nearby.
      for (let x = 640; x <= 900; x += BAY_PITCH) {
        for (let z = -1270; z <= -1130; z += ROW_PITCH) {
          if (!onCap(x, z)) continue;
          if (rand() > 0.62) continue;
          const h = (2 + Math.floor(rand() * 3)) * 2.7;
          box(x, CAP_Y + h / 2, z, 14, h, 26, pick(LIVERIES));
        }
      }

      // =====================================================================
      // 8. CANAL-SIDE SHEDS, GOODS STATION AND THE NORTH-EAST WORKS
      // =====================================================================
      // Three fillers, and they are not decoration for its own sake. The cap
      // reaches 1.9 km on the north-east bearings and the town stops at 660, so
      // without them a third of the island is bare ground - which from OVERVIEW
      // reads as an undeveloped sandbar with a port bolted onto one edge.
      //
      // The canal-side row is low on purpose: anything tall in that strip would
      // compete with the bridge pylons, which are supposed to own it.
      for (let i = 0; i < 5; i += 1) {
        placeShed(-300 + i * 230, -800, 170, 70, 12, SHED_ROOFS[(i + 1) % 2]);
      }
      // Goods station on the east shore, where the rail line ends. Long sheds
      // parallel to the tracks, with the sidings running in between them.
      for (let i = 0; i < 3; i += 1) {
        placeShed(830, -540 + i * 230, 180, 150, 20, SHED_ROOFS[i % 2]);
      }
      railLine(790, -770, 240, 44);
      for (let i = 0; i < 3; i += 1) {
        box(700 + i * 34, CAP_Y + 0.75, -640, 6, 0.9, 320, 0x3c3a35);
      }
      // North-east works: the far bulge, seen mostly from OVERVIEW and HORIZON.
      // Sheds and a second tank group, thinned out with distance from the town
      // the way an industrial fringe actually thins out.
      const NE_SHEDS = [
        [420, 780], [660, 900], [250, 1000], [900, 620], [520, 1180]
      ];
      for (let i = 0; i < NE_SHEDS.length; i += 1) {
        placeShed(NE_SHEDS[i][0], NE_SHEDS[i][1], 140, 110, 18, SHED_ROOFS[i % 2]);
      }
      for (let i = 0; i < 4; i += 1) {
        const dx = 60 + i * 92;
        const dz = 760;
        if (!onCap(dx - 36, dz) || !onCap(dx + 36, dz)) continue;
        cyl(dx, CAP_Y + 10, dz, 32, 20, i % 2 === 0 ? 0xb9bcb4 : 0xdcdedb);
      }

      // =====================================================================
      // 9. SHIPS ALONGSIDE
      // =====================================================================
      // Two box boats on the berth. This is the single highest-value object on
      // the map per instance spent: a crane row over empty water is a row of
      // towers, and the same row with a hull under it is a working container
      // terminal - the boom tip at dx -1838 lands directly over the ships'
      // centreline, which is what a ship-to-shore crane is FOR.
      //
      // Hull sits 9 m off the quay face at -1800 with the waterline at y 0:
      // 11 m of draught below and 17 m of freeboard above, which is a real
      // 4000-TEU feeder's proportions on a 300 m hull.
      const buildShip = (dz, length, hull) => {
        box(-1832, 3, dz, 46, 28, length, hull);
        // Bow: a shorter, narrower block ahead of the parallel body. Not a real
        // taper - a rotated wedge at this size costs more than it reads - but
        // enough that the hull has a pointed end and a blunt one.
        box(-1832, 3, dz + length / 2 + 17, 28, 28, 38, hull);
        box(-1832, 17.4, dz + 4, 47, 2, length - 20, 0x2f3238);
        // Accommodation block and funnel, aft.
        box(-1832, 31, dz - length / 2 + 30, 36, 26, 40, 0xe6e8e6);
        box(-1832, 51, dz - length / 2 + 20, 15, 18, 15, 0x2b2b2b);
        // Deck load. Three rows across, which is what makes the ship read as
        // LOADED rather than as a barge - and it is the same nine liveries as
        // the yard, so the eye ties the two together.
        for (let r = 0; r < 3; r += 1) {
          for (let b = -length / 2 + 60; b < length / 2 - 10; b += 29) {
            if (rand() > 0.86) continue;
            const h = (2 + Math.floor(rand() * 3)) * 2.7;
            box(-1850 + r * 18, 18.4 + h / 2, dz + b, 16, h, 26, pick(LIVERIES));
          }
        }
      };
      buildShip(-560, 300, 0x2f4048);
      buildShip(40, 250, 0x6d2f2c);

      // =====================================================================
      // 10. BREAKWATER
      // =====================================================================
      // An L of rubble mound at dx -2150, which the measurements put ~390 m
      // outside the furthest waterline on this bearing - open sea. Its job is
      // compositional: it closes the basin, so from OVERVIEW the water in front
      // of the cranes reads as a harbour rather than as the same ocean that is
      // everywhere else. The first pass ran it dead straight and it read as a
      // stick floating offshore; the return arm at the south end is what turns
      // a line into an enclosure. Top at y 8 so it never occludes the terminal
      // from the APPROACH camera's 800 m.
      box(-2150, 1, -300, 44, 14, 1300, 0x6b6a63);
      box(-1990, 1, -930, 366, 14, 44, 0x6b6a63);
      // Harbour light on the head of the mole, in the traditional bands.
      cyl(-2150, 7, 350, 9, 12, 0xe8e6de);
      cyl(-2150, 19, 350, 7, 12, 0xb2382c);
      cyl(-2150, 29, 350, 5.5, 8, 0xe8e6de);

      // =====================================================================
      // Upload
      // =====================================================================
      // BoxGeometry(1,1,1) scaled per instance rather than one geometry per
      // size: every solid on this map is a rectangular prism, so they all share
      // the one 12-triangle buffer and the whole port costs a single draw call.
      const unitBox = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
      const worksMaterial = keepMaterial(new THREE.MeshLambertMaterial({ color: 0xffffff }));
      const worksMesh = new THREE.InstancedMesh(unitBox, worksMaterial, boxes.length);
      const matrix = new THREE.Matrix4();
      const quaternion = new THREE.Quaternion();
      const euler = new THREE.Euler();
      const position = new THREE.Vector3();
      const scale = new THREE.Vector3();
      const colour = new THREE.Color();
      for (let i = 0; i < boxes.length; i += 1) {
        const b = boxes[i];
        position.set(CX + b.x, b.y, CZ + b.z);
        scale.set(b.sx, b.sy, b.sz);
        if (b.rot) {
          euler.set(b.rot[0], b.rot[1], b.rot[2]);
          quaternion.setFromEuler(euler);
        } else {
          quaternion.identity();
        }
        worksMesh.setMatrixAt(i, matrix.compose(position, quaternion, scale));
        // Material colour stays white so the instance colour is the colour;
        // setHex goes through the renderer's colour management the same way a
        // material's own does, so these hexes match the ones in the preset.
        worksMesh.setColorAt(i, colour.setHex(b.color));
      }
      worksMesh.instanceMatrix.needsUpdate = true;
      if (worksMesh.instanceColor) worksMesh.instanceColor.needsUpdate = true;
      addRoot(worksMesh);

      if (cylinders.length > 0) {
        const unitCyl = keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 14, 1, false));
        const cylMaterial = keepMaterial(new THREE.MeshLambertMaterial({ color: 0xffffff }));
        const cylMesh = new THREE.InstancedMesh(unitCyl, cylMaterial, cylinders.length);
        for (let i = 0; i < cylinders.length; i += 1) {
          const c = cylinders[i];
          position.set(CX + c.x, c.y, CZ + c.z);
          scale.set(c.r, c.h, c.r);
          quaternion.identity();
          cylMesh.setMatrixAt(i, matrix.compose(position, quaternion, scale));
          cylMesh.setColorAt(i, colour.setHex(c.color));
        }
        cylMesh.instanceMatrix.needsUpdate = true;
        if (cylMesh.instanceColor) cylMesh.instanceColor.needsUpdate = true;
        addRoot(cylMesh);
      }
    }
  });
}
