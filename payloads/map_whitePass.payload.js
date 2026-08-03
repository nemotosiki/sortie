// WHITE PASS (`whitePass`) - the Kedem highland pass, half an hour after
// sunrise. Story map for M06 and M23 (`docs/story_reboot/02_maps_units_style.md`):
// the road-and-rail throat between the Kedem coast and the interior, which is
// why both a transit sortie and a late re-entry are set here.
//
// This is NOT glacierCanyon repainted. That map is ice standing in open water;
// this one is a forested rock valley with a river on its floor, a road over its
// shoulder and a tunnel through its flank. The only thing the two share is the
// `corridor` generator, and even there the numbers are 2.9x apart (see below).
//
// ---- The three things that say "this is White Pass" -------------------------
//   1. A RIVER MEANDERING DOWN THE VALLEY FLOOR. Not a straight channel: the
//      centreline is two sines (2.45 km and 6.2 km wavelengths) whose amplitudes
//      are fractions of the MEASURED floor, so it crosses the valley axis three
//      times over its 6.5 km, wandering from x -117 to x +226, with a pale
//      braided gravel bed (x -206 to +321) nearly three times its own width
//      around it and an abandoned channel braiding away from it. Dark, low
//      saturation water against a dry olive floor - the same read the Sark Port
//      canal was tuned to, only bent.
//   2. A PASS ROAD SWITCHBACKING UP THE EAST WALL. Five legs, one continuous
//      ribbon, folding back on itself from the valley floor at y 81 to y 616 -
//      64% of that ridge's height. It is drawn at very nearly its real width -
//      a 10 m carriageway inside a 16 m deck inside a 28 m batter - because a
//      mountain road is a THIN DARK LINE WITH LIGHT EDGES, and the wide pale
//      scar this map used to draw instead (52 m, one value, clipped white under
//      hemi 1.85) folded back on itself six times and read as a zigzag drawn on
//      the hillside with chalk. The contrast now lives inside the section, so
//      the road reads as a road at range without painting the wall.
//   3. TUNNEL PORTALS WHERE THE ROAD STOPS DEAD. Two of them, on opposite walls:
//      the summit tunnel at the head of the switchbacks (the old route, over the
//      shoulder and through, at y 616) and the base tunnel driven through the
//      toe of the west wall (the modern route, straight through, measured onto
//      the skirt at y 61 and reached by a spur that crosses the whole floor on a
//      bridge). Both are a cold grey headwall with a near-black hole in it,
//      driven 46 m into the slope with 108 m wing walls splaying back into the
//      cutting either side, standing at the head of its own forecourt - and both
//      are placed where the road's continuity visibly breaks. The depth and the
//      wings are the whole difference between a tunnel mouth and a board leaned
//      against a mountain, which is what an 18 m slab with 58 m stubs was.
//
// Plus the two artefacts the map spec requires that are not identification
// features: a SAM emplacement cut into the east wall at 42% height (a bulldozed
// bench with a retaining wall, a planar-array radar and four elevated launch
// boxes - the SHAPE of a site, not the units, which belong to mission design),
// and a valley-floor RESCUE POINT (helipad with an H, two red-roofed huts, a
// windsock mast and a fuel bladder) on the flat beside the river.
//
// ---- Real-world scale ------------------------------------------------------
// The two ridge centrelines are 2000 m apart. Fourteen peaks were drawn between
// 731 and 1062 m of mesh height (collision summits 673-977, which is the 0.92
// clamp), so the walls stand 0.7-1.1 km over the floor.
//
// The FLYABLE floor is MEASURED, not authored, and the decorator does the
// measuring at build time: walking `surfaceHeightAt` out from the axis until the
// ground clears 6 m, at 150 m stations over the length of the valley, gives west
// toes between x -184 and -592 and east toes between +264 and +704. Over the 34
// stations from z -3300 to +1800 the open floor is 640 to 1208 m wide and 907 m
// on average, and the tightest point of the whole pass is 640 m across.
//
// The floor is NOT SYMMETRIC about the axis and that is the single fact every
// floor feature is built on: the peaks' radii, depths and displacement harmonics
// are random, so the middle of the open ground wanders 400 m across the map. The
// river, the road, the rescue site, the talus and the woods are all expressed as
// fractions of the measured half-width either side of the measured centre.
//
// The massif is 6.9 km along its axis (northernmost peak z +2060 to southernmost
// z -3270, plus their skirts), of which 5.3 km is valley. Those are the
// proportions of a real transalpine pass: the Reuss valley below the Gotthard is
// 1-2 km of floor under 1000 m walls over about 6 km of climb.
//
// ---- Why this is a valley an aircraft can actually fly ---------------------
// glacierCanyon is the only shipped corridor and therefore the only proven
// number: rows 2, per 6, gap 700, step 1200, radius [150,230] - a 700 m lane
// between spire CENTRES, which after the radius and the +-30% angular
// displacement leaves as little as 80 m between opposing rocks. It is a slalom,
// and it is meant to be flown as one.
//
// White Pass deviates deliberately and in one direction only - WIDER:
//   gap    2000 against 700   (2.9x). The floor has to hold a river, a road, a
//                              rescue site and the space between them; a 700 m
//                              lane is narrower than the river's own meander.
//                              It used to be 3000, and 3000 was WRONG: with the
//                              wall toes 475-725 m out from their centrelines
//                              the open floor measured 1655-2490 m against
//                              700-1000 m walls, which photographs as a field
//                              with cones standing on it. A valley is a
//                              PROPORTION, not a pair of ridges - at 2000 the
//                              floor is 640-1208 m under the same walls and
//                              every cell of the sheet reads as a trough.
//   radius [560,780] against [150,230]. Cones at glacier's proportions are
//                              59-degree needles. Here the fourteen draws
//                              measured out at flanks of 40 to 60 degrees
//                              (height over measured toe) - still steep, but
//                              slopes rather than spires, and the only kind of
//                              thing a road can be drawn on.
//   height [720,1080] against [420,620]. This is what makes it a valley instead
//                              of cones on a plain: at 900 m the walls stand
//                              ABOVE the sheet's 800 m APPROACH camera, so that
//                              cell looks INTO the pass rather than down on it.
//                              The first build at 430-720 m photographed as
//                              scattered pyramids on open ground from every cell.
//   step   820 against 1200.   Peaks 820 m apart with ~1400 m footprints OVERLAP,
//                              so each row reads as one continuous RIDGE. Glacier
//                              wants separated spires to weave between; a pass
//                              wants walls.
// Net: the narrowest measured gap between opposing toes is 640 m, which is 92%
// of glacier's LANE and about eight times its worst pinch, because glacier's
// 700 m is measured between spire CENTRES and this 640 m is measured between
// the toes themselves. The shipped map is flown at 700 m of nominal lane with
// 80 m squeezes in it; nothing on this map is anywhere near that tight, and
// nothing here is a slalom.
//
// ---- The light is doing the terrain's job ----------------------------------
// The sun is 15 degrees up on bearing 085 - a low morning sun square across the
// valley axis. That single choice is what makes the map legible: the west wall's
// east-facing flanks are lit at 0.89 of full key while the east wall's inner
// face gets ambient and fill only, so the valley reads as a lit side and a dark
// side with a floor between them. Under a high sun both walls come back the same
// value and a 1 km valley photographs flat.
//
// It also decides where every built thing goes, and in the opposite direction to
// the obvious one. The shaded east wall is where the two BUILT works live - the
// SAM bench and the pass road - because CONCRETE on a slope lit only by
// hemisphere and fill is the highest-contrast object on the map, while the same
// pale grey on the lit west wall lands within a few percent of the rock it is
// cut into. Sections 3 and 5 both argue this from renders.
//
// The corollary took a rebuild to learn: on THIS wall a pale surface does not
// merely contrast, it CLIPS. hemi 1.85 of a pale sky colour lifts anything much
// over 0x96 to white with or without the key, so the shaded flank is the last
// place to put a broad pale area. Structures may have one - a bench is meant to
// be a bright rectangle - but a road may not, because a road is long. Hence the
// road section below: a dark deck, a pale line at each edge, and a batter that
// is allowed to sit close to the rock.
//
// It also fixes the composition. The preview sheet stands its three terrain
// cameras 115 degrees round from the light, so bearing 085 puts them at 200 -
// south-south-west, looking up the valley along its axis. Move the sun and the
// cameras swing out of the valley and shoot across it instead.
//
// ---- No plateau, and why ---------------------------------------------------
// Every other land map needs `mountains.plateau` because its ground is a plateau
// cap standing out of the sea. This map's ground is the OCEAN PLANE ITSELF,
// re-skinned as an alpine floor - desertBasin's trick (`ocean.textureProfile:
// "sand"`, zero wave speed, a dry palette), and the right one here: the floor of
// a pass is flat, it is at the bottom, and it extends past the map. So there is
// already a perfectly flat surface at y 0 for the rescue site to stand on and a
// plateau would only put a butte in the middle of the valley.
//
// The two jobs a plateau would otherwise have been carrying are done elsewhere:
//   - the SAM's flat ground is CUT, by the decorator, into the side of a wall,
//     which is where a mountain-top site has to be anyway - a plateau is placed
//     by `at` on open ground and could never be on a ridge;
//   - the preview sheet's aim point falls through to `sceneryOrigin`, which is
//     set to the middle of the valley and costs no geometry.
// PLATEAU CAP does not exist on this map. Every Y the decorator stands
// something on comes from `surfaceHeightAt`, never from a constant, because
// every surface here is either the flat floor at y 0 or a random cone. The one
// set of objects placed at a literal y 0 is the backdrop ranges in section 9,
// and y 0 IS the floor plane out there - they are cones standing on it, exactly
// as the corridor's own peaks are.
//
// ---- What the decorator may and may not assume ------------------------------
// The corridor peaks are drawn from the shared mountain RNG: radius, height,
// depth, yaw and two displacement harmonics are all random, so NOTHING on a
// wall OR ON THE FLOOR can be placed by arithmetic. Every wall feature in
// `whitePassWorks` starts by walking `surfaceHeightAt` outward along a bearing
// to find that peak's toe, then walks back in to find the radius at a target
// height; every floor feature is placed against a profile of the open ground
// that the decorator measures for itself at build time (section 0b). Change
// `mountains.count` or the corridor's gap/rows/per and the peaks reshape - and
// the river, the road, the rescue site, the talus, the woods, the switchbacks,
// the portals and the SAM bench all re-measure themselves onto the new ones.
// The one thing that does NOT re-measure is which peak carries the switchbacks
// and on what bearing, because that was chosen by sweeping camera visibility
// (section 3) and a reshape invalidates the sweep, not the code.
export default function register(ctx) {
  ctx.addWorldPreset("whitePass", {
    label: "WHITE PASS",
    // The subject is the valley, and the valley is not at the origin: the
    // corridor runs from z +1800 to z -3150. Every origin-relative ring
    // (background peaks, scenery islands, boulders, cloud decks) re-centres
    // here, and the preview sheet aims here too - see the header on why there
    // is no plateau to aim at instead.
    sceneryOrigin: [0, -620],
    clearColor: 0xb2c2c8,
    // First light. Deep blue at the zenith (stop 0), a NARROW amber band on the
    // horizon (stop 0.5 - makeSkyTexture puts the dome's equator there and peaks
    // its haze envelope on it), cold grey below.
    //
    // The band's width is the whole argument. The first build ran amber from
    // 0.42 to 0.58 with haze 0.24 on top, and every cell whose horizon sat high
    // in frame came back as a desert sunset - the sky was more amber than blue
    // by area, and an amber sky over an olive floor is the Sahara. Amber now
    // spans 0.47-0.53 with a grey shoulder either side and haze is down to 0.14,
    // so the warm light is a rim on the horizon and the rest of the dome is a
    // cold morning blue.
    sky: [[0, "#12274a"], [0.24, "#33628f"], [0.4, "#7ba2bd"], [0.47, "#b6c4c8"], [0.5, "#f0c795"], [0.53, "#c3a48c"], [0.62, "#8b979b"], [1, "#4a565c"]],
    atmosphere: { seed: 0x2d6b51, noise: 0.016, haze: 0.14, thinClouds: 12, cloudOpacity: 0.05, cloudBand: [0.42, 0.7], cloudTint: 0xeceff0 },
    // Morning valley haze, and the numbers are set by the sheet's longest shot.
    // OVERVIEW stands 4200 m out from the middle of a 6.9 km massif, so the near
    // ridge is ~3.8 km from the lens and the far end is past 7 km - which is
    // also the camera's FAR PLANE (index.html builds it at 7000). far 7600 is
    // chosen against that number and not against taste: it puts the ridge the
    // road is on at 38% fogged - a receding grey ladder, which is the look - and
    // everything the far plane would clip at 90%+, so nothing can be seen to pop
    // out of existence at the clip. near 1500 keeps the APPROACH and LOW PASS
    // foregrounds clear; at 1150 the OVERVIEW cell came back bleached across
    // its whole middle distance and the valley stopped reading as a trough.
    fog: { color: 0xb2c2c8, near: 1500, far: 7600 },
    // 15 degrees up, bearing 085. See the header: this is the single most
    // load-bearing number on the map, because it decides which wall is lit AND
    // where the preview cameras stand. |position| is 3000, inside the 3600 sky
    // dome, as every other preset's is.
    //
    // The glare is smaller and weaker than the day maps': from the valley floor
    // the sun is BEHIND the east wall (the ridge subtends 27 degrees, the sun
    // sits at 15), so the disc is depth-tested away and only the glare sprites
    // come over the top. That is the correct picture - sun not yet over the
    // ridge - but a day-map glare at that size is a white hole in the middle of
    // the HORIZON cell rather than a rim of light on it.
    sun: {
      position: [2890, 776, 253], color: 0xffdca6, radius: 78,
      glare: [
        { scale: 1150, color: 0xffd9a0, opacity: 0.36 },
        { scale: 330, color: 0xfff4dc, opacity: 0.8 }
      ]
    },
    moon: null,
    stars: null,
    // No sun road. The glint is a reflection in water, and this map's y 0 plane
    // is dry ground - a 3 km amber streak lying across a valley floor would read
    // as a flooded pass.
    sunRoad: null,
    // NOT WATER. This is the valley floor: desertBasin's technique, with the
    // wave profile replaced by static dune-scale variation and both drift speeds
    // pinned to zero, because ground that crawls is the fastest way to give the
    // trick away. The palette is dry alpine pasture over gravel - authored dark,
    // since this engine's daylight lifts a mid albedo by roughly 1.8x, so
    // #545a48 comes back as the pale olive the header describes.
    // The colour is greener and the relief is quieter than the first build's.
    // Two separate fixes: #545a48 with contrast 0.26 read as pale sand under
    // this light, and the "sand" profile's dune octave at normalScale 0.18/0.26
    // drew visible diagonal corduroy across the whole floor at the LOW PASS
    // camera - dunes, in a pass. repeat 22 with half the normal strength turns
    // that into ground grain.
    ocean: {
      base: "#4e5a44", bright: "146, 156, 124", dark: "50, 58, 44",
      textureProfile: "sand", colorContrast: 0.2, repeat: 22,
      roughness: 0.98, metalness: 0, colorSpeed: [0, 0],
      normalRepeat: 20, normalMultipliers: [1, 2.6, 6.2],
      normalWeights: [0.7, 0.22, 0.08], normalAngles: [0.2, 0.24, 0.1],
      normalFades: [[500, 2200], [220, 900], [80, 340]],
      normalScale: [0.1, 0.14], normalSpeed: [0, 0], normalSeed: 0x2d6b52
    },
    // The banding that makes these cones read as forested rock rather than as
    // ice. Four of the five colours are doing identifiable work:
    //   sand  - scree and dry grass in the first 16% of a wall's height, chosen
    //           to sit close to the floor plane so the toe of a wall does not
    //           show a hard line where the mesh meets y 0.
    //   grass - the CONIFER BELT. Dark blue-green, and the reason `rockSlope`
    //           is opened up to [0.20, 0.62]: every cone in this engine has the
    //           same 0.32 slope value on its flank regardless of scale (the
    //           normals come off the unmodified unit cylinder), so that pair
    //           decides the belt/rock ratio directly. At [0.20,0.62] the flank
    //           lands at 61% green against 39% rock - trees with the mountain
    //           showing through them. glacierCanyon's [0.16,0.5] would give
    //           bare rock, sarkPort's [0.24,0.68] near-solid green.
    //   rock/peak - grey-brown below, paler above 0.58, so the top third of
    //           every wall goes bare before any snow starts.
    //   snow  - only reached on peaks that pass `snowyAbove`, and then only
    //           above snowLine 0.72. This is a pass in a green range, not an
    //           icefield: the white is a cap on the highest ridges, which is
    //           what the map is named for.
    terrain: {
      seed: 0x2d6b53, sand: 0x5e6046, grass: 0x36482c, rock: 0x585448,
      peak: 0x767162, snow: 0xe4ecf0,
      fineRepeat: 18, macroRepeat: 3.2, normalRepeat: 22,
      normalStrength: 0.34, islandNormalStrength: 0.22, normalFade: [260, 1800],
      rockSlope: [0.2, 0.62], shoreHeight: 0.16, snowLine: 0.72, snowSoftness: 0.1
    },
    // A low sun cannot light a valley floor on its own - at 15 degrees the key
    // delivers only 0.26 of itself to horizontal ground - so the hemisphere
    // carries the floor and the key carries the walls. Measured intent:
    // lit wall ~3.9, floor ~2.8, shaded wall ~1.6, i.e. the two walls are 2.4x
    // apart, which is the whole point of the hour chosen.
    //
    // The fill comes from bearing 250 (west-south-west) at a fifth of the key,
    // purely so the east wall's shaded inner face keeps some form instead of
    // going to a flat silhouette. Any stronger and the two walls converge again.
    lights: {
      hemi: { sky: 0xbcd4e8, ground: 0x2a3024, intensity: 1.85 },
      key: { color: 0xffe0b0, intensity: 3.1, position: [2600, 700, 228] },
      fill: { color: 0x8fb4d8, intensity: 0.55, position: [-940, 380, -342] }
    },
    mountains: {
      // The surround, and the LIMIT of what a circular ring can do here. The
      // massif is 4 km across and 7 km long, so the smallest circle that clears
      // its own ends is set by the long axis: the southernmost skirt reaches
      // 3510 m from sceneryOrigin and a ring peak carries up to 910 m of its own
      // displaced radius, so 4100 is the floor and it buys nothing on the flanks,
      // where the same circle stands 2 km further out than it needs to. Pulled
      // in from 4400/6200 to 4100/5600 - every peak 300-600 m closer, which is
      // all the geometry allows - and the actual closing of the horizon is done
      // by the decorator's ranges, which can be an ellipse with two gates in it.
      //
      // count 6 -> 8 for the same reason: it is worth two more peaks of textured,
      // COLLIDABLE mass, and it is not worth more, because the azimuths come out
      // of the shared mountain rng and the counts that fill the empty eastern
      // sector also drop peaks into the ends of the valley (measured: 10, 13 and
      // 354 degrees appear at counts 9, 11 and 13). The corridor peaks are drawn
      // FIRST, so this number cannot move them and nothing the decorator
      // measured is invalidated by it; the scenery islands and clouds downstream
      // of it do move, and they are decoration.
      count: 8, radius: [380, 700], height: [600, 1150], distance: [4100, 5600],
      snowyAbove: 950, snowLine: 0.72, roughness: 0.93,
      palette: { low: 0x5e6046, mid: 0x36482c, rock: 0x585448, peak: 0x767162, snow: 0xe4ecf0 },
      // THE VALLEY. Every number is argued in the header; the two that are not
      // are here:
      //   startZ 1650 / stagger 410 puts the two row midpoints at z -810 and
      //   -400, i.e. the massif straddles sceneryOrigin (0,-620) rather than
      //   running away from it, so the preview cameras look ALONG the pass
      //   instead of at one end of it.
      //   snowyAbove 960 against a height range of [720,1080] means the top
      //   quarter of the draw gets the snow material. Measured on the actual
      //   draw: mesh heights came out 731-1062 and five of the fourteen cleared
      //   960, so five ridges carry a cap. Snow on every wall is glacierCanyon;
      //   snow on none of them is a map with no business being called White Pass.
      corridor: {
        rows: 2, per: 7, gap: 2000, step: 820, startZ: 1650, stagger: 410,
        radius: [560, 780], height: [720, 1080], snowyAbove: 960
      },
      plateau: null
    },
    // Forested knolls on the valley floor and in the side bays. `islands` are
    // decoration only - not in world.mountains, so nothing collides with them -
    // and the decoration pass plants `trees` on every one it is allowed to
    // reach, which is what puts stands of conifer on the flat as well as on the
    // walls' own green band.
    islands: { count: 5, stone: 0x6e7364, green: 0x3f5533 },
    // hero false: the hero bank is parked at a fixed offset from sceneryOrigin,
    // which on this map is 620 m off the valley axis at 470 m altitude - i.e.
    // inside the pass, at the height of the walls, in front of every camera.
    clouds: {
      scale: 0.85, hero: false, color: 0xeef2f0, opacity: 0.62,
      cirrusColor: 0xdfe6e6, cirrusOpacity: 0.26,
      texture: { seed: 0x2d6b54, contrast: 0.98, underside: 0.34, softness: 1.06 }
    },
    decor: {
      seed: 0xa5410d,
      // A LANE, not a bubble: |x| < 2100 over the whole length of the pass. That
      // is the floor, both ridge lines AND their outer skirts, so the decoration
      // pass can put knolls and boulders in the side country but never on the
      // walls the road and the SAM are drawn on, and never in the air the player
      // flies through. extraIslands pad this by their own radius x 1.6, so they
      // actually start ~2640 m off the axis, which is past the outer toe.
      keepClear: [{ box: { x: 2100, z0: -4300, z1: 2800 } }],
      extraIslands: { count: 16, radius: [150, 340], height: [60, 260], distance: [2600, 5000] },
      // No shore ring. It is a two-disc beach drawn where land meets sea, and
      // this map's "sea" is a meadow - it would draw a pale halo round every
      // knoll for no reason. Same call desertBasin makes.
      shore: null,
      trees: { perIsland: 18, color: 0x2f4a2b, trunk: 0x3a2c20, height: [16, 34] },
      rocks: { count: 16, color: 0x5f6154, scale: [10, 30] },
      extraClouds: {
        towers: 3, towerSize: [70, 120], towerBase: 1150,
        stratus: 8, stratusSize: [200, 340], stratusBase: 1750,
        distance: [2200, 4400]
      }
    }
  });

  // ---------------------------------------------------------------------------
  // The works: the river, the road, the two tunnels, the SAM bench and the
  // rescue site. Everything `decor` has no vocabulary for.
  //
  // Two build primitives cover the whole map:
  //   BOXES / CYLINDERS / CONES - three InstancedMeshes with per-instance
  //     colour, i.e. three draw calls for every solid object on the map.
  //   RIBBONS - a strip of quads following a polyline, DRAPED: every edge vertex
  //     takes its own Y from surfaceHeightAt. That is what lets one code path
  //     draw a river on flat ground and a switchback on a 44-degree wall. A flat
  //     bench laid on that slope would float 40 m on its downhill edge and bury
  //     itself on the uphill one; a draped ribbon cannot do either.
  //
  // Nothing in here is collision. `world.mountains` is untouched, so the road
  // deck and the SAM bench are scenery in exactly the way a tree is.
  // ---------------------------------------------------------------------------
  ctx.addWorldDecorator("whitePassWorks", {
    worlds: ["whitePass"],
    build(env) {
      const { THREE, preset, addRoot, keepGeometry, keepMaterial, surfaceHeightAt } = env;
      const lane = preset.mountains.corridor;

      // ---- Deterministic noise ---------------------------------------------
      // The world's decorRng is not exposed to decorators, and borrowing a
      // shared stream would mean this file's tree scatter changed whenever
      // something upstream drew one more random number.
      let seedState = 0x2d6b55 >>> 0;
      const rand = () => {
        seedState = (seedState + 0x6d2b79f5) >>> 0;
        let v = Math.imul(seedState ^ (seedState >>> 15), seedState | 1);
        v ^= v + Math.imul(v ^ (v >>> 7), v | 61);
        return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
      };

      // ---- Instance batches -------------------------------------------------
      const boxes = [];
      const cylinders = [];
      const cones = [];
      // A fourth batch, and the one exception to "three draw calls". The tree
      // cone is a 6-gon, which is right for a 30 m conifer and wrong for an
      // 800 m mountain: at that size the six facets are 130 m wide on the
      // silhouette and the thing reads as a crystal. The backdrop gets its own
      // 11-gon geometry rather than paying for 11 sides on two thousand trees.
      const ridgeCones = [];
      // `rot` is [pitch, yaw, roll] and is applied in YXZ order. That order is
      // not decoration: with the default XYZ, a pitch applied after a yaw tilts
      // the object about the WORLD x axis, so a launcher elevated 55 degrees
      // comes out flat when it happens to face east. Under YXZ the pitch is
      // always about the object's own transverse axis, so "elevated 55, facing
      // 210" means what it says whatever the yaw is.
      const box = (x, y, z, sx, sy, sz, color, rot) => { boxes.push({ x, y, z, sx, sy, sz, color, rot }); };
      const cyl = (x, y, z, r, h, color) => { cylinders.push({ x, y, z, r, h, color }); };
      const cone = (x, y, z, r, h, color) => { cones.push({ x, y, z, r, h, color }); };
      const ridgeCone = (x, y, z, r, h, color) => { ridgeCones.push({ x, y, z, r, h, color }); };

      // ---- Palette ----------------------------------------------------------
      // All authored ~0.55x of the intended read, for the daylight lift.
      const ASPHALT = 0x33352f;
      // THE BATTER - the cut and fill slope either side of the carriageway, and
      // NOT the road surface. It is authored dark on purpose: hemi is 1.85 of a
      // pale sky colour, so anything over ~150 renders clipped to white on this
      // map, and at 0xa79f8e the whole 52 m width of the pass road came back as
      // solid white paint - a zigzag DECAL on the hillside rather than a road.
      // At 0x7b7565 the batter renders as a band of bare pale earth roughly 1.5x
      // the conifer/rock flank it is cut into: present, not glowing.
      //
      // Losing the old value does NOT bring back the "melts into the rock"
      // failure that pushed it up from 0x8e8878, because the road no longer
      // depends on the batter to be seen. What carries it is the pair below -
      // a dark carriageway with a pale edge either side of it - and a dark line
      // fringed with light survives any amount of value agreement between the
      // batter and the mountain.
      const ROAD_CUT = 0x7b7565;
      // The pale edge, and the ONLY white on the road. Parapet, kerb and the
      // scuffed shoulder gravel of a mountain road all land here. It is drawn as
      // a strip 3 m proud of the carriageway on each side, i.e. it is a LINE,
      // and it renders clipped-bright by design: 3 m of white against 10 m of
      // near-black is what makes the carriageway read as a surface with edges.
      const ROAD_EDGE = 0xc9c5b6;
      const CONCRETE = 0x9a9486;
      const DARK_CONCRETE = 0x6d6a60;
      // A COLD grey, and deliberately not CONCRETE: the headwall has to separate
      // from its own warm apron, and hue does that where value cannot (at
      // 0x9a9486 against the apron the two were within 6% of each other and the
      // portal dissolved into a smudge with a dark speck in it).
      //
      // The hue split is kept and the VALUE is down 25% from 0x7a7d82. At that
      // value the wall was the brightest object on a shaded flank and read as a
      // blue-grey board propped against the mountain; at 0x5c6067 it sits just
      // under the rock it is driven into, which is what a concrete face in the
      // shade of its own cutting does.
      const PORTAL_WALL = 0x5c6067;
      const TUNNEL_DARK = 0x08090b;
      const WATER = 0x1a3a44;
      const GRAVEL = 0x827e70;
      // Talus is DRIER and greyer than the river's gravel, and that separation is
      // the point: the same pale rock debris ends up in two places on this map -
      // washed and sorted in the river bed, angular and unwashed at the foot of
      // the walls - and if the two are the same colour the floor reads as one
      // smear of light ground instead of a river with hillsides either side of it.
      const SCREE = 0x6e695d;
      // The BLOCKS are much darker than the fans they lie in, and that is not a
      // stylistic choice. hemi is 1.85 of a pale sky colour, so a mid grey box
      // standing on a shaded 50-degree flank comes back paler than the lit rock
      // beside it: the first pass used 0x6f6c60 and the toes of both walls came
      // back strewn with what read as cream-coloured packing crates. Rock that
      // has to sit INSIDE a scree fan has to be authored below it.
      const TALUS_BLOCK = 0x484539;
      const TALUS_BLOCK_PALE = 0x565244;
      const BOULDER = 0x494740;
      const STEEL_WHITE = 0xd6dad8;
      const HUT_WALL = 0xb0a795;
      const HUT_ROOF = 0x8a4130;
      const RESCUE_ORANGE = 0xd8622c;
      const TREE_DARK = 0x2b4327;
      const TREE_LIGHT = 0x3a5730;
      // The surrounding ranges. Authored DARK and low-saturation because they are
      // seen through 55-80% fog: anything with local contrast at that distance
      // reads as a near object that has been shrunk, which is the classic way a
      // backdrop stops being a backdrop.
      const RIDGE_LOW = 0x3f4a37;
      const RIDGE_MID = 0x4a5142;
      const RIDGE_HIGH = 0x5b5c4e;
      const RIDGE_SNOW = 0xdae4ea;

      // =====================================================================
      // 0. THE RIDGES, AND HOW ANYTHING IS PLACED ON THEM
      // =====================================================================
      // The slot table is rebuilt with createWorld's own formula rather than
      // read back off world.mountains (which the decorator has no handle on).
      // Row 0 is the WEST wall, row 1 the EAST wall.
      const ridge = [];
      for (let row = 0; row < lane.rows; row += 1) {
        const x = (row - (lane.rows - 1) / 2) * lane.gap;
        const shift = row % 2 === 1 ? lane.stagger : 0;
        for (let i = 0; i < lane.per; i += 1) {
          ridge.push({ row, x, z: lane.startZ + shift - i * lane.step });
        }
      }
      const west = ridge.filter((p) => p.row === 0);
      const east = ridge.filter((p) => p.row === 1);

      const groundAt = (x, z) => surfaceHeightAt(x, z);
      // Bearings are compass-style: 0 = +Z, 90 = +X, the same convention
      // renderWorldPreview uses for the sun.
      const dirOf = (deg) => {
        const r = (deg * Math.PI) / 180;
        return { x: Math.sin(r), z: Math.cos(r), yaw: r };
      };
      // Anything at or under this is the valley floor, not a mountain. The floor
      // plane is at y 0 and the cones' own skirts flatten out well under 6 m.
      const FLOOR_EPS = 6;
      // Walks outward from just off the summit until the sampler drops back to
      // the floor. This is THE measurement everything on a wall hangs off, and
      // it has to be a measurement: radius, depth, yaw and two displacement
      // harmonics are all random per peak, so the toe is a different distance on
      // every bearing of every mountain.
      const probeToe = (peak, dir) => {
        let last = 60;
        for (let r = 60; r < 1800; r += 20) {
          if (groundAt(peak.x + dir.x * r, peak.z + dir.z * r) <= FLOOR_EPS) break;
          last = r;
        }
        return last;
      };
      // ...and back in again, to the radius where the flank reaches a height.
      const radiusAtHeight = (peak, dir, target, rMax) => {
        for (let r = rMax; r > 30; r -= 8) {
          if (groundAt(peak.x + dir.x * r, peak.z + dir.z * r) >= target) return r;
        }
        return 30;
      };
      // The sampler clamps to 0.92 of a mountain's mesh height, so this is the
      // COLLISION summit and every fraction below is taken against it. That is
      // the right reference here: nothing is being stood on the true apex.
      const summitOf = (peak) => groundAt(peak.x, peak.z);

      // =====================================================================
      // 0b. THE FLOOR, MEASURED - what every floor feature is placed against
      // =====================================================================
      // With the walls 2 km apart the floor is 640-1280 m wide and, more to the
      // point, it is NOT CENTRED ON THE AXIS. The peaks' radii, depths and two
      // displacement harmonics are all random, so the west toe reaches x -180 at
      // z -800 and x -635 at z +1200 while the east toe swings between +245 and
      // +705. A river authored as `30 + 165*sin(z/390)` - which is what this map
      // had while the gap was 3000 and the floor was 1.8 km wide - would spend
      // half its length inside a hillside.
      //
      // So the floor is measured first and everything on it is expressed in the
      // floor's own frame: c(z) is the middle of the open ground and h(z) is its
      // half-width, and the river, the road, the rescue site, the talus and the
      // riparian woods are all placed as fractions of h either side of c. Reshape
      // the corridor again and the whole floor re-measures itself.
      //
      // Cost is bounded on purpose: 49 stations at 150 m, walked out at 40 m and
      // refined at 8, i.e. ~2200 samples - the same order as the tree scatter.
      const FLOOR_Z0 = -4400;
      const FLOOR_Z1 = 2800;
      const FLOOR_STEP = 150;
      // Past these the corridor has run out and the "floor" is the open plain, so
      // the walk would return the 1500 m cap and drag the profile out with it.
      const FLOOR_H_MAX = 640;
      const FLOOR_C_MAX = 460;
      const floorRaw = [];
      for (let z = FLOOR_Z0; z <= FLOOR_Z1; z += FLOOR_STEP) {
        const edge = (sign) => {
          let r = 0;
          while (r < 1500 && groundAt(sign * r, z) <= FLOOR_EPS) r += 40;
          let f = Math.max(0, r - 40);
          while (f < r && groundAt(sign * f, z) <= FLOOR_EPS) f += 8;
          return f;
        };
        const w = -edge(-1);
        const e = edge(1);
        floorRaw.push({
          w,
          e,
          // A walk that ran to the cap found no wall at all: past the ends of
          // the corridor the "floor" is the open plain.
          walled: w > -1400 && e < 1400,
          c: Math.max(-FLOOR_C_MAX, Math.min(FLOOR_C_MAX, (w + e) / 2)),
          h: Math.max(160, Math.min(FLOOR_H_MAX, (e - w) / 2))
        });
      }
      // The UNSMOOTHED edge, for the things that have to sit exactly on the break
      // of slope. The filtered profile below is right for a road and a river,
      // which want to ignore the per-peak jitter, and wrong for scree, which is
      // made BY that jitter: a talus fan placed on the filtered toe lands up to
      // 200 m inside the real one at the stations where a displacement lobe
      // sticks out, and a draped ribbon that starts 200 m up a 50-degree wall
      // photographs as a sheet of paper pasted to the mountain. (It did.)
      const toeRawAt = (z, sign) => {
        const t = (z - FLOOR_Z0) / FLOOR_STEP;
        const i = Math.max(0, Math.min(floorRaw.length - 1, Math.round(t)));
        const row = floorRaw[i];
        return { x: sign < 0 ? row.w : row.e, walled: row.walled };
      };
      // Five-station box filter. The raw profile steps by up to 180 m between
      // neighbouring stations wherever one peak's displacement lobe ends and the
      // next begins, and a road built straight onto that has a kink in it every
      // 150 m. The filter keeps the valley's real course - it wanders 400 m over
      // its length - and throws away the per-peak jitter.
      const floorProfile = floorRaw.map((_, i) => {
        let c = 0;
        let h = 0;
        for (let k = -2; k <= 2; k += 1) {
          const s = floorRaw[Math.min(floorRaw.length - 1, Math.max(0, i + k))];
          c += s.c;
          h += s.h;
        }
        return { c: c / 5, h: h / 5 };
      });
      const floorAt = (z) => {
        const t = (z - FLOOR_Z0) / FLOOR_STEP;
        const i = Math.max(0, Math.min(floorProfile.length - 1, Math.floor(t)));
        const j = Math.min(floorProfile.length - 1, i + 1);
        const f = Math.max(0, Math.min(1, t - i));
        const a = floorProfile[i];
        const b = floorProfile[j];
        return { c: a.c + (b.c - a.c) * f, h: a.h + (b.h - a.h) * f };
      };

      // ---- Ribbons ----------------------------------------------------------
      // Six accumulators, one per material, so the whole road-and-river network
      // is six draw calls no matter how many separate ribbons feed it.
      //
      // EVERY ROAD IS THREE RIBBONS ON ONE CENTRELINE, not two, and the order
      // outward from the middle is dark, pale, mid: the carriageway, a 3 m edge
      // strip either side of it, then the batter. Two ribbons could only give a
      // dark line inside a pale field, which is what made the pass road read as
      // a white zigzag drawn on the mountain. Three give the contrast at the
      // EDGE of the deck, which is where a real road's contrast lives, and that
      // is what keeps a 28 m road legible on a 900 m wall without painting a
      // 52 m stripe on it.
      const strips = {
        asphalt: { pos: [], idx: [], color: ASPHALT, roughness: 0.95, metalness: 0 },
        edge: { pos: [], idx: [], color: ROAD_EDGE, roughness: 0.9, metalness: 0 },
        cut: { pos: [], idx: [], color: ROAD_CUT, roughness: 0.97, metalness: 0 },
        water: { pos: [], idx: [], color: WATER, roughness: 0.42, metalness: 0.06 },
        gravel: { pos: [], idx: [], color: GRAVEL, roughness: 0.96, metalness: 0 },
        scree: { pos: [], idx: [], color: SCREE, roughness: 0.98, metalness: 0 }
      };
      // `pts` is a polyline of {x, z} (a per-point `hw` overrides the width).
      // Both edge vertices are sampled independently, which is the draping: on
      // the flat this is a flat ribbon, on a wall it is a stripe lying on the
      // slope. `lift` is small - 1 to 4 m - because the only thing it has to
      // beat is the facet chord error between two samples 15-25 m apart, and a
      // larger one starts to read as a plank propped over the ground.
      const pushRibbon = (target, pts, halfWidth, lift) => {
        if (pts.length < 2) return;
        const base = target.pos.length / 3;
        for (let i = 0; i < pts.length; i += 1) {
          const p = pts[i];
          const prev = pts[Math.max(0, i - 1)];
          const next = pts[Math.min(pts.length - 1, i + 1)];
          let dx = next.x - prev.x;
          let dz = next.z - prev.z;
          const len = Math.hypot(dx, dz) || 1;
          dx /= len;
          dz /= len;
          // Left normal in the xz plane. Emitting left first keeps every quad
          // wound so its face normal comes out +Y.
          const nx = dz;
          const nz = -dx;
          const hw = p.hw === undefined ? halfWidth : p.hw;
          const lx = p.x + nx * hw;
          const lz = p.z + nz * hw;
          const rx = p.x - nx * hw;
          const rz = p.z - nz * hw;
          target.pos.push(lx, groundAt(lx, lz) + lift, lz);
          target.pos.push(rx, groundAt(rx, rz) + lift, rz);
        }
        for (let i = 0; i < pts.length - 1; i += 1) {
          const a = base + i * 2;
          target.idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
        }
      };
      // One road, laid in one call so no alignment can drift between its three
      // strips. `hw` is [batter, edge, deck] half-widths and `lift` the matching
      // clearances, ascending: the deck is narrowest and highest, so it wins the
      // depth test over the edge, which wins over the batter. On a steep flank
      // the gaps have to be metres rather than centimetres - a wide draped strip
      // interpolates ACROSS the cross-slope between its two edges while a narrow
      // one follows the ground, so the two disagree by a metre or so wherever
      // the hillside is convex.
      const pushRoad = (pts, hw, lift) => {
        pushRibbon(strips.cut, pts, hw[0], lift[0]);
        pushRibbon(strips.edge, pts, hw[1], lift[1]);
        pushRibbon(strips.asphalt, pts, hw[2], lift[2]);
      };

      // =====================================================================
      // 1. THE RIVER - identification feature #1
      // =====================================================================
      // Two sines an octave and a half apart, but their AMPLITUDES are fractions
      // of the measured half-width rather than metres: the long one (6.2 km)
      // walks the river across the floor over the length of the map, the short
      // one (2.45 km) is the meander itself, and together they take the water out
      // to 0.37 h either side of the floor's own centreline. With the bed at a
      // further 0.22 h, the pale scar reaches 0.59 h - so at the tightest station
      // on the map (h 320) the whole braid is 190 m off centre against a 320 m
      // toe, and at the widest (h 604) it is 358 m against 604. It cannot climb
      // the hillside at any station, because the hillside is what it is measured
      // against.
      //
      // The braided gravel bed is nearly three times the water's width and is
      // the reason this reads as a mountain river rather than as a canal: an
      // alpine river in a flat-floored valley is a narrow thread wandering
      // inside a wide pale scar of its own making.
      const riverX = (z) => {
        const f = floorAt(z);
        return f.c + f.h * (0.24 * Math.sin(z / 390 + 0.6) + 0.13 * Math.sin(z / 990 - 0.4));
      };
      // Bed half-width, capped so the scar never eats a narrow station whole.
      const bedHalf = (z) => Math.min(0.22 * floorAt(z).h, 84) + 12 * Math.abs(Math.sin(z / 430 + 1.1));
      const RIVER_Z0 = -4000;
      const RIVER_Z1 = 2500;
      const riverPts = [];
      const bedPts = [];
      for (let z = RIVER_Z0; z <= RIVER_Z1; z += 45) {
        const x = riverX(z);
        // Width breathes along the course: pools where it meanders hardest.
        riverPts.push({ x, z, hw: 21 + 13 * Math.abs(Math.sin(z / 610)) });
        bedPts.push({ x, z, hw: bedHalf(z) });
      }
      pushRibbon(strips.gravel, bedPts, 80, 1);
      pushRibbon(strips.water, riverPts, 26, 2.4);
      // An ABANDONED CHANNEL, offset from the live one on a third phase and half
      // its width. One thread of water in a wide pale scar is a canal that has
      // been given a fringe; two threads that braid apart and rejoin over 600 m
      // is a river that moves, and it is the cheapest thing on this map that
      // says the floor is alluvium rather than a lawn.
      const oldPts = [];
      for (let z = RIVER_Z0 + 200; z <= RIVER_Z1 - 200; z += 45) {
        const f = floorAt(z);
        oldPts.push({
          x: riverX(z) + f.h * 0.11 * Math.sin(z / 265 + 2.2),
          z,
          hw: 22 + 16 * Math.abs(Math.sin(z / 350 - 0.7))
        });
      }
      pushRibbon(strips.gravel, oldPts, 34, 1.4);
      // A CROSSING. Any spur that reaches the far bank has to get over the water,
      // and a draped ribbon cannot: the road cut is laid at ground + 2 and the
      // water at ground + 2.4, so without a deck the river is drawn ON TOP of
      // the road it crosses. Invisible from height, unmissable at 80 m. A girder
      // deck on two piers, 18 m wide, 7 m over the bed - a metre or two more
      // than a real one, and the least that reads as a gap from the air. `yaw`
      // is the compass bearing of the road, so the deck lies along it.
      const riverCrossing = (z, yaw) => {
        const x = riverX(z);
        const g = groundAt(x, z);
        const span = 2 * (bedHalf(z) + 34);
        box(x, g + 7, z, 18, 3, span, DARK_CONCRETE, [0, yaw, 0]);
        box(x, g + 9.6, z, 22, 2.2, span, CONCRETE, [0, yaw, 0]);
        for (const s of [-1, 1]) {
          box(x + Math.sin(yaw) * s * span * 0.38, g + 3.5, z + Math.cos(yaw) * s * span * 0.38,
            14, 8, 8, DARK_CONCRETE, [0, yaw, 0]);
        }
      };

      // =====================================================================
      // 2. THE VALLEY FLOOR ROAD
      // =====================================================================
      // Pinned at 0.72 of the half-width EAST of the floor's centre, i.e. about
      // 130 m inside the measured toe wherever that toe happens to be. A valley
      // road goes against the hillside - the flat middle belongs to the river -
      // and holding it to a fraction rather than to an x means it stays there
      // however the wall is shaped.
      //
      // East rather than west, and that is a consequence of where the pass road
      // had to go (section 3): the switchbacks are on the east wall because that
      // is the only wall these cameras can see a road on, and a pass road that
      // leaves the valley road has to leave it from the same bank or the map
      // needs a bridge for every junction. The one place the network does cross
      // the water is the base tunnel's spur, which is the modern alignment and
      // is supposed to ignore the terrain.
      //
      // Drawn with the same three-strip section as the switchbacks - dark deck,
      // pale edge, dark batter - so the eye reads one road that changes gradient
      // rather than two unrelated stripes. It is the widest road on the map
      // (a 12 m carriageway against the pass road's 10) because it is the
      // through route on the flat, and it is still half the 44 m it used to be.
      const roadX = (z) => {
        const f = floorAt(z);
        return f.c + f.h * 0.72;
      };
      const valleyPts = [];
      for (let z = -3800; z <= 2200; z += 50) valleyPts.push({ x: roadX(z), z });
      pushRoad(valleyPts, [15, 9, 6], [2, 2.9, 3.8]);

      // =====================================================================
      // 3. THE PASS ROAD - identification feature #2
      // =====================================================================
      // Five legs up the south-west flank of the EAST wall's third peak. Both the
      // wall and the bearing were MEASURED, and the measurement overturned the
      // rule this file used to state.
      //
      // THE WEST WALL CANNOT CARRY A ROAD ON THIS MAP. With the corridor at
      // 2000 m the three terrain cameras stand at x -1437, -889 and -308 against
      // a west ridge line at x -1000: two of the three are OUTSIDE that wall,
      // looking along it from the south. So a west-wall road is either on the
      // valley-facing flank, which is over the crest and seen from behind at
      // 30 degrees of depression - the whole flight foreshortens into one grey
      // smear on the skyline - or on a south-east flank, where the peak 820 m
      // further south stands in the way. Sweeping bearings 100/115/135/150/165
      // over four west peaks and ray-marching the sampler from all three cameras
      // gives, on the flank this road used to be drawn on, a visible band of
      // exactly two stations out of thirteen. It was being drawn correctly and
      // photographed as nothing.
      //
      // THE EAST WALL CARRIES IT EVERYWHERE. The same sweep on the east row
      // returns "visible from all three cameras" for EVERY station from 0.95 to
      // 0.35 of the toe on bearings 225 and 245, because that wall is seen
      // broadside across an open floor rather than end-on along a ridge.
      //
      // The cost is the light: bearing 225 is a shaded flank under an 085 sun,
      // and a shaded flank is exactly where a pale surface stops being subtle -
      // hemi 1.85 lifts anything over ~150 to clipped white whether the key
      // reaches it or not. That is why this road's contrast is built ACROSS its
      // own section rather than against the mountain: a dark deck between two
      // pale edges reads as a road under any light, while a pale deck on a dark
      // flank reads as paint. Section 5's bench is the same argument for a
      // structure, which is why the bench is still a pale slab and this is not.
      //
      // The zigzag is built in the peak's own polar frame: each node is a radius
      // (found by walking the sampler in from the toe to a target height) and a
      // tangential offset that flips sign every leg. Legs are then resampled at
      // twelve points each so the ribbon follows the mesh's facets instead of
      // cutting the chord.
      //
      // TANG 0.34 is the aspect ratio of the whole flight of switchbacks: at the
      // toe the legs are 0.8 x the toe radius wide, tightening as they climb,
      // which is what gives the stack its taper. Below about 0.3 the legs get so
      // short the thing reads as a single wiggly line; above 0.5 the road wraps
      // so far round the cone that consecutive legs stop stacking above each
      // other and it stops looking like one road.
      const polarPoint = (peak, dir, tan, r, t) => ({
        x: peak.x + dir.x * r + tan.x * t,
        z: peak.z + dir.z * r + tan.z * t
      });
      // The node ladder, spaced evenly in RADIUS and alternating sides.
      //
      // The first build spaced it evenly in HEIGHT, walking the sampler in to
      // find the radius at each step, which is the more obviously correct thing
      // to do and is wrong. Measured on the pass peak, equal 58 m height steps
      // came back at radii 892, 860, 804, 692, 596, 380, 332 - steps of 32, 56,
      // 112, 96, 216, 48 m. The flank is not a clean cone: the corridor steps
      // its peaks 820 m apart so their skirts merge, and the height profile
      // along any bearing is a blend of two of them. Three legs ended up piled
      // into the outer 90 m and one leapt 216 m.
      //
      // Radius spacing is even by construction, and the drape takes care of the
      // heights: each leg simply climbs whatever the hillside under it does.
      const zigzagNodes = (rOuter, rInner, legs) => {
        const nodes = [];
        for (let k = 0; k <= legs; k += 1) {
          nodes.push({ r: rOuter + (rInner - rOuter) * (k / legs), s: k % 2 === 0 ? 1 : -1 });
        }
        return nodes;
      };
      // A flight of switchbacks in one peak's polar frame. Two things here are
      // the difference between a road and a tangle, and the first build got both
      // wrong:
      //
      //   THE LEGS HAVE TO BE FURTHER APART THAN THE ROAD IS WIDE, WITH BARE
      //   HILLSIDE BETWEEN THEM. A draped scar's footprint ON THE HILLSIDE is
      //   its plan width divided by cos(slope), which on this map's 40-60 degree
      //   flanks is 1.3-1.7x. The first build's nine legs sat 51 m apart in plan
      //   against a 52 m scar and simply overlapped - one solid smear with darts
      //   sticking out of it. Narrowing the road to 30 m is what finally opened
      //   the flight up: five legs 59 m apart in radius now leave 29 m of plan
      //   gap, i.e. roughly half the pitch is untouched mountain. That gap is
      //   the difference between a flight of switchbacks and a hatched patch,
      //   and it matters more than any colour on the deck.
      //
      //   THE HAIRPINS HAVE TO TURN, NOT REVERSE. With the tangential offset
      //   interpolated linearly the direction flips 180 degrees at a single
      //   vertex, and there the ribbon's perpendicular is computed from a
      //   near-zero difference of neighbours - which is exactly where the darts
      //   came from. Easing the tangential term with smoothstep while the radial
      //   term stays linear takes the path THROUGH the fall line at each apex:
      //   dt/df is zero there, so the road is pointing straight uphill at the
      //   turn, the perpendicular is well defined, and the corner comes out as
      //   the U a hairpin actually is.
      const zigzagPath = (peak, dir, tan, nodes, tangFactor, samples) => {
        const pts = [];
        for (let k = 0; k < nodes.length - 1; k += 1) {
          const a = nodes[k];
          const b = nodes[k + 1];
          const ta = a.s * tangFactor * a.r;
          const tb = b.s * tangFactor * b.r;
          for (let s = 0; s < samples; s += 1) {
            const f = s / samples;
            const e = f * f * (3 - 2 * f);
            pts.push(polarPoint(peak, dir, tan, a.r + (b.r - a.r) * f, ta + (tb - ta) * e));
          }
        }
        const last = nodes[nodes.length - 1];
        pts.push(polarPoint(peak, dir, tan, last.r, last.s * tangFactor * last.r));
        return pts;
      };

      const PASS_PEAK = east[2];
      const PASS_BEARING = 225;
      const TANG = 0.34;
      const passDir = dirOf(PASS_BEARING);
      const passTan = { x: passDir.z, z: -passDir.x };
      const passToe = probeToe(PASS_PEAK, passDir);
      const PASS_LEGS = 5;
      // 0.95 to 0.50 of the measured toe (660 m on this bearing), i.e. 627 m in
      // to 330 m: five legs 59 m apart in radius, which on this 55-degree flank
      // is 103 m of hillside against a 30 m scar covering 39 m of it. Two thirds
      // of the pitch is therefore bare mountain, which is what the flight needs
      // to read as separate legs at all - and the eased hairpins keep the turns
      // from tearing even so.
      //
      // THE INNER LIMIT is no longer a visibility number, because on this wall
      // there is nothing to hide behind: the sweep says the flank is visible
      // from all three cameras down to 0.35. It is a GEOMETRY number instead. At
      // 0.50 the head lands at y ~613, 64% of this peak's 959 m collision
      // summit, and the 130 m headwall standing there already wraps 24 degrees
      // of the cone. Higher up the portal becomes a belt round the mountain.
      //
      // THE OUTER LIMIT is not the toe itself. The corridor's peaks are 820 m
      // apart and their skirts merge, so the last stretch out here is the saddle
      // between this mountain and the next; a flight that starts on the saddle
      // spends its longest leg on nearly flat ground, which reads as a road
      // wandering in circles rather than a climb.
      const passNodes = zigzagNodes(passToe * 0.95, passToe * 0.5, PASS_LEGS);
      const passPts = [];
      {
        // The junction. The pass road does not begin on the hillside: it leaves
        // the valley road on the flat and runs at the mountain, which is what
        // makes the two read as one network.
        const first = polarPoint(PASS_PEAK, passDir, passTan, passNodes[0].r, passNodes[0].s * TANG * passNodes[0].r);
        const junction = { x: roadX(first.z), z: first.z };
        for (let s = 0; s < 6; s += 1) {
          const f = s / 6;
          passPts.push({ x: junction.x + (first.x - junction.x) * f, z: junction.z + (first.z - junction.z) * f });
        }
        for (const p of zigzagPath(PASS_PEAK, passDir, passTan, passNodes, TANG, 12)) passPts.push(p);
        // And out of the last hairpin, a short run STRAIGHT UP THE FALL LINE.
        // This is the segment the portal stands on, and it is radial on purpose:
        // a tunnel mouth at the end of a tangential leg sits on ground the same
        // height as the road with nothing above it, and reads as a shed. Turned
        // uphill, the mountain is directly behind the hole.
        //
        // 22 m, not the 110 the first build used. A radial metre is 0.84 m of
        // climb on this flank, so 110 m put the portal 92 m above the last
        // hairpin, with bare slope between them - two unrelated objects. It is
        // also 110 m of road pointing straight AWAY from a camera that is nearly
        // in the fall line, i.e. foreshortened to a sliver, so the connection was
        // invisible as well as long.
        const top = passNodes[PASS_LEGS];
        const tTop = top.s * TANG * top.r;
        for (let s = 1; s <= 4; s += 1) {
          const f = s / 4;
          passPts.push(polarPoint(PASS_PEAK, passDir, passTan, top.r - 22 * f, tTop * (1 - f)));
        }
      }
      // A 10 m carriageway inside a 16 m deck inside a 28 m batter - one
      // mountain lane with passing places, at very nearly its real width, where
      // the first build drew 52 m of pale scar with an 18 m road in it.
      //
      // The old numbers were argued from resolution: at the OVERVIEW camera's
      // 9.4 m/px a 52 m scar is five and a half pixels and an 18 m road is two,
      // so the scar was made to carry the read. It carried it too well. Five
      // pixels of clipped white folded back on itself six times is a zigzag
      // DRAWN on the mountain, and no amount of colour tuning fixes a stripe
      // that is a fifth of the height of the wall it is on. Three pixels of
      // dark-cored line is a road seen from four kilometres, which is the
      // correct picture; the section only has to resolve on the two cameras
      // that are close enough to resolve anything, and it does.
      //
      // Lifts 3/5/7, not 2/3.6: on a flank this steep the ribbon is sampled
      // every 20-40 m across facets 100 m wide, 2 m of clearance let the mesh's
      // convex ridges through the deck, and the three strips need to clear each
      // other by more than the cross-slope error between a 28 m chord and a
      // 10 m one.
      pushRoad(passPts, [14, 8, 5], [3, 5, 7]);

      // =====================================================================
      // 4. TUNNEL PORTALS - identification feature #3
      // =====================================================================
      // A cut apron, a headwall, a hole, two splayed wing walls and a hood. The
      // hole is a near-black box inset in the headwall and stood 2 m proud of
      // its outer face: at every camera range on this map that offset is
      // invisible, and it is what stops the hole z-fighting the wall it is cut
      // into.
      //
      // Sizes are 8-10x a real portal, for the same reason every solid on Sark
      // Port is: a 12 m arch is a third of a pixel from the sheet's high
      // cameras. At 130 m wide (summit) and 112 m (base), with holes 60% of
      // that, the headwall is 14 px wide with 8 px of black in it from
      // OVERVIEW - the smallest either can be and still read as an opening
      // rather than as a smudge.
      //
      // The APRON is what actually sells the tunnel at range, more than the hole
      // does. A road that stops in the middle of a hillside reads as a rendering
      // error; a road that widens into a platform and THEN stops reads as a road
      // that goes somewhere. It is drawn as a shallow slab rather than a ribbon
      // because it wants to be flat and level, which is what a portal forecourt
      // is.
      //
      // A PORTAL IS DRIVEN INTO A HILL, NOT STOOD AGAINST ONE, and the first
      // build only said so in the comments: an 18 m headwall standing on the
      // surface with 58 m stubs beside it photographed as a board propped on the
      // slope, which is the one thing a tunnel mouth may not look like. The mass
      // is now 46 m deep and set 14 m back, so it runs 37 m into ground that is
      // climbing, and the wing walls step DOWN AND OUT from its edges on ground
      // each of them samples for itself. Between them the structure is tied to
      // the hillside on three sides and the only part left standing in the open
      // is the face and the cutting in front of it.
      const buildPortal = (x, z, bearingDeg, width, height) => {
        const dir = dirOf(bearingDeg);
        const tan = { x: dir.z, z: -dir.x };
        const g = groundAt(x, z);
        const ax = x + dir.x * (width * 0.5);
        const az = z + dir.z * (width * 0.5);
        // Only ~5 m of the slab is proud of the ground; the rest is buried, so
        // it reads as a levelled forecourt and not as a plinth. The first build
        // stood a 26 m box on ground+1 and it came back as a wedge stuck to the
        // hillside. Trimmed with the road that reaches it: a 156 m forecourt at
        // the end of a 28 m carriageway was the largest flat surface on the wall.
        box(ax, groundAt(ax, az) - 4, az, width * 1.05, 18, width * 0.78, ROAD_CUT, [0, dir.yaw, 0]);
        // Headwall, DRIVEN IN. 30 m deep against the old 18 and set back 6, so
        // the outer face stays exactly where the road ends - the hole's 2 m of
        // proudness is unchanged - while the back of it sits 21 m inside a
        // rising hillside instead of 9. Buried 34 at the bottom for the same
        // reason as before: no gap may open under it where the slope falls away
        // faster than the sampler was walked.
        //
        // 30 and not more, and this is the number the base portal set. That one
        // is 530 m from LOW PASS and 90 degrees off its own bearing, so what
        // that camera sees is the headwall's SIDE - and depth, which buys
        // embedding when seen from the front, buys nothing but exposed plate
        // when seen from the flank. At 46 the side alone was 4000 sq m of blue
        // grey standing off the slope and the fix had become the fault.
        //
        // The FACE is 0.88 of the nominal width and 0.92 of the nominal height,
        // not all of either. The hole has to stay at 0.6 of the width (it is the
        // legibility feature, and its size is argued from pixels above), so
        // taking the wall in turns a slab with a hole in it into a frame around
        // a hole; and stopping the top just clear of the hood turns the last few
        // metres of blank wall into a coping. Both changes take area out of the
        // one part of the assembly that cannot be tucked into the hill.
        box(x - dir.x * 6, g + height * 0.45 - 17, z - dir.z * 6, width * 0.88, height * 0.9 + 34, 30, PORTAL_WALL, [0, dir.yaw, 0]);
        const oW = width * 0.6;
        const oH = height * 0.66;
        box(x + dir.x * 11, g + oH * 0.5 - 1, z + dir.z * 11, oW, oH, 4, TUNNEL_DARK, [0, dir.yaw, 0]);
        // Hood over the opening: the one horizontal line in the assembly, and
        // what turns a grey rectangle with a dark patch on it into a structure.
        box(x + dir.x * 8, g + oH + 6, z + dir.z * 8, width * 0.82, 11, 28, DARK_CONCRETE, [0, dir.yaw, 0]);
        // Wing walls, and they are the other half of "driven in": three STEPPED
        // segments a side, running forward out of the mouth, flaring as they go
        // and each one standing on its OWN sampled ground.
        //
        // The stepping is not styling, it is the only shape that works on both
        // of this map's portals. A wing wall is one box and a box has one Y, so
        // a single 108 m slab buries itself on the summit portal's 40-degree
        // flank and stands 70 m clear of the base portal's 20-degree skirt -
        // where it photographed as a dark plate leaning against the hillside,
        // which is the exact fault it was lengthened to cure. Sampling each
        // segment lands it on the ground under it at any slope, and a stepped
        // top is what a real retaining wall has anyway.
        //
        // Segment 0 is flush with the headwall's own edge, at 0.44 of the width
        // and 0.6 of the height, and each step out is 11 m forward, 7 m wider
        // and 13% of the height shorter, so the chain has fallen to a fifth of
        // the portal over 35 m and stops there.
        //
        // The tall first segment is doing a second job besides retaining the
        // cutting: it stands ON the corner of the headwall, which is where that
        // exposed side face begins, and breaks the side into a wall and a
        // buttress. A tunnel mouth seen from the flank is a stepped mass, not a
        // rectangle.
        //
        // THE WHOLE CHAIN IS SHORTER THAN A SWITCHBACK PITCH, and that is the
        // constraint that sets both the step and the count. The summit portal's
        // flank falls 0.84 m per metre and its legs are 59 m apart in radius, so
        // a chain reaching 65 m forward drops 55 m and arrives ON TOP of the leg
        // below - which it did, as a row of fins standing in the road. 35 m of
        // reach is 30 m of fall, i.e. half a pitch, and it lands on bare slope.
        // Within that reach the step also has to be smaller than the fall
        // between its ends or the segments read as separate blocks rather than
        // as a wall: 11 m of step against 9 m of fall keeps every top inside a
        // segment's own height of its neighbour.
        for (const s of [-1, 1]) {
          for (let k = 0; k < 4; k += 1) {
            const wx = x + dir.x * (2 + k * 11) + tan.x * s * (width * 0.44 + k * 7);
            const wz = z + dir.z * (2 + k * 11) + tan.z * s * (width * 0.44 + k * 7);
            const wh = height * (0.6 - k * 0.13);
            // Buried 22: a 14 m box across a 40-degree flank spans 12 m of fall
            // and the segments straddle the break into the forecourt, so the
            // skirt has to be deeper than either.
            box(wx, groundAt(wx, wz) + wh * 0.5 - 22, wz, 14, wh + 44, 26, PORTAL_WALL, [0, dir.yaw + s * 0.34, 0]);
          }
        }
      };
      // Summit portal: the last point of the switchbacks, facing the way the
      // road was climbing. The ribbon ENDS here - that break is the whole point.
      {
        // Stood EXACTLY on the deck's last point, with no offset of any kind.
        // Every attempt to set it back into the hill by a "small" radial amount
        // came out detached in the render - 18 m of radius is 24 m of climb here
        // and the terrain between is a convex spur that hides the difference -
        // so the offset is now zero and the connection is structural rather than
        // hopeful. The headwall is 18 m deep and sunk 10 m, so it straddles the
        // end of the deck; its forecourt slab lands downhill over the last 60 m
        // of it; and the whole thing faces PASS_BEARING, i.e. back down the road
        // at the traffic, with the mountain behind the hole.
        const head = passPts[passPts.length - 1];
        buildPortal(head.x, head.z, PASS_BEARING, 130, 64);
      }
      // Base portal: the modern route, boring the toe of the WEST wall's fourth
      // spur (west[3], at z -810, i.e. 1.2 km down the valley and across it from
      // the mountain the switchbacks climb), 55 m up its skirt so that the spur
      // which reaches it visibly climbs. A portal at ground level in flat
      // country reads as a shed.
      //
      // The two tunnels being on OPPOSITE WALLS is the story rather than a
      // compromise: the old road climbs one side with the ground and goes
      // through its shoulder, and the modern alignment refuses the climb
      // altogether, crosses the floor on a bridge and drives straight through
      // the other side at valley level. It is also the only arrangement the
      // cameras allow. Swept from all three, west[3] on bearing 100 at 0.95 of
      // its toe is the ONE place on the west wall visible from OVERVIEW,
      // APPROACH and LOW PASS at once - it is the near shoulder of the peak
      // nearest the low camera - so the map's clearest tunnel read is put there
      // and the flight of switchbacks takes the wall that shows a road at all.
      //
      // Bearing 100, i.e. very nearly due east, straight at the valley. That is
      // a MEASUREMENT constraint before it is a compositional one. The corridor
      // steps its peaks 820 m apart in Z, so their skirts overlap and the
      // sampler returns the NEIGHBOUR's height on any bearing near 000 or 180:
      // the first build put this portal on bearing 160 and both probes - the toe
      // walk and the height walk - climbed the saddle into the next mountain
      // south, which buried the whole structure 800 m from where it was meant to
      // be. At bearing 100 the nearest neighbour's centre is 1070 m from the
      // probe line, well outside its own toe.
      {
        const peak = west[3];
        const dir = dirOf(100);
        const toe = probeToe(peak, dir);
        const r = radiusAtHeight(peak, dir, 55, toe);
        const px = peak.x + dir.x * r;
        const pz = peak.z + dir.z * r;
        buildPortal(px, pz, 100, 112, 58);
        // The spur off the valley road. Runs to a point 55 m short of the
        // headwall, i.e. under its forecourt, so the deck disappears INTO the
        // structure rather than stopping in front of it.
        //
        // The valley road is on the EAST bank, so this spur crosses the whole
        // floor and the river to get here. That is the modern alignment's
        // signature and not an accident of layout: the old road climbs the far
        // wall with the ground, and this one runs dead straight across the
        // valley on a bridge and goes through the mountain.
        const spur = [];
        const startZ = pz - 150;
        const start = { x: roadX(startZ), z: startZ };
        const endX = px - dir.x * 55;
        const endZ = pz - dir.z * 55;
        for (let s = 0; s <= 14; s += 1) {
          const f = s / 14;
          spur.push({ x: start.x + (endX - start.x) * f, z: start.z + (endZ - start.z) * f });
        }
        pushRoad(spur, [13, 8, 5], [2.4, 3.2, 4]);
        // Where it crosses. Solved rather than assumed: walk the spur until the
        // sign of (river - road) flips, which is the crossing whatever the
        // meander is doing at this z.
        {
          const yaw = Math.atan2(endX - start.x, endZ - start.z);
          let prev = start.x - riverX(start.z);
          for (let s = 1; s <= 28; s += 1) {
            const f = s / 28;
            const zx = start.x + (endX - start.x) * f;
            const zz = start.z + (endZ - start.z) * f;
            const now = zx - riverX(zz);
            if (prev * now <= 0) { riverCrossing(zz, yaw); break; }
            prev = now;
          }
        }
      }

      // =====================================================================
      // 5. SAM EMPLACEMENT ON THE EAST WALL
      // =====================================================================
      // The map spec asks for a site that LOOKS like a site - the units that
      // would stand on it are mission design, not terrain - so what is built
      // here is the ground works plus the two silhouettes that identify the
      // battery: a planar-array face and elevated launch boxes.
      //
      // It is on the EAST wall, which is the shaded one, and that is deliberate:
      // the bench is pale concrete cut into a slope that is receiving ambient
      // and fill only, so it is the single highest-contrast object on the map.
      // Putting it on the lit west wall would have hidden it inside the same
      // brightness as the rock, on top of crowding the only wall the road uses.
      //
      // Bearing 225 is the south-west flank: turned towards the valley AND
      // towards the cameras.
      //
      // The bench has to be CUT. This peak measured 989 m of mesh height over a
      // 720 m toe, i.e. a 54-degree flank, so a level pad 64 m deep needs 44 m
      // of cut at the back and 44 m of fill at the front - and that is exactly
      // what is drawn: the box's top is set to the natural ground at its own
      // centre, its uphill half is buried, and its downhill half stands out of
      // the hill as a retaining wall. A pad hung at one height with no body
      // under it floats off the mountain.
      {
        const peak = east[4];
        const dir = dirOf(225);
        const tan = { x: dir.z, z: -dir.x };
        const toe = probeToe(peak, dir);
        const summit = summitOf(peak);
        const padTarget = summit * 0.42;
        const rPad = radiusAtHeight(peak, dir, padTarget, toe);
        const cx = peak.x + dir.x * rPad;
        const cz = peak.z + dir.z * rPad;
        const padY = groundAt(cx, cz) + 3;
        const TW = 112;
        const RD = 32;
        // Local frame for everything on the bench: +Z is downhill (radially
        // out), +X is along the contour.
        const at = (t, u) => ({ x: cx + tan.x * t + dir.x * u, z: cz + tan.z * t + dir.z * u });
        box(cx, padY - 55, cz, TW * 2, 110, RD * 2, CONCRETE, [0, dir.yaw, 0]);
        // Revetment: a berm down the open (downhill) edge and a stub at each
        // end. Three thin boxes, and they are what make the pad read as a
        // fortified position rather than as a car park.
        {
          const d = at(0, RD - 4);
          box(d.x, padY + 5, d.z, TW * 2, 10, 12, DARK_CONCRETE, [0, dir.yaw, 0]);
          for (const s of [-1, 1]) {
            const e = at(s * (TW - 6), 0);
            box(e.x, padY + 5, e.z, 12, 10, RD * 2, DARK_CONCRETE, [0, dir.yaw, 0]);
          }
        }
        // Radar: mast, a vertical planar-array face turned down the valley, and
        // a search bar over it. Kept vertical on purpose - a tilted panel needs
        // a compound rotation whose apparent angle changes with yaw, and at
        // these ranges the tilt buys nothing the outline does not already say.
        {
          const p = at(-64, -6);
          cyl(p.x, padY + 13, p.z, 5, 26, STEEL_WHITE);
          box(p.x, padY + 40, p.z, 48, 30, 6, STEEL_WHITE, [0, dir.yaw + 0.5, 0]);
          box(p.x, padY + 58, p.z, 34, 4, 4, STEEL_WHITE, [0, dir.yaw + 0.5, 0]);
        }
        // Four launch boxes, elevated 55 degrees and trained down the valley.
        // The negative pitch is what raises the local +Z end under YXZ.
        for (let i = 0; i < 4; i += 1) {
          const p = at(-6 + i * 40, 4);
          box(p.x, padY + 13, p.z, 13, 12, 34, DARK_CONCRETE, [-0.96, dir.yaw + 0.35, 0]);
        }
        // Command shelter and a generator drum, at the sheltered end.
        {
          const p = at(88, -12);
          box(p.x, padY + 6, p.z, 34, 12, 18, HUT_WALL, [0, dir.yaw, 0]);
          box(p.x, padY + 13, p.z, 40, 3, 24, DARK_CONCRETE, [0, dir.yaw, 0]);
          const q = at(66, 14);
          cyl(q.x, padY + 5, q.z, 7, 10, 0x9c9a90);
        }
        // Access track: three short legs down the same flank to the toe, so the
        // battery is connected to something. Same polar zigzag as the pass road,
        // and now the same three-strip section - a service track is narrower
        // still (16 m of batter round a 6 m running surface), and it has to be
        // read as subordinate to the pass road rather than as a second one.
        {
          const nodes = zigzagNodes(toe * 0.98, rPad, 3);
          const pts = zigzagPath(peak, dir, tan, nodes, 0.26, 11);
          pushRoad(pts, [8, 5, 3], [2.6, 4.2, 5.8]);
        }
      }

      // =====================================================================
      // 6. RESCUE POINT ON THE VALLEY FLOOR
      // =====================================================================
      // A rescue post goes where the road, the water and a piece of flat ground
      // meet, and on a 750-1170 m floor whose river wanders across it there is
      // about one such place per kilometre. So the site is not authored at an
      // (x, z): BOTH banks are measured at 40 m intervals - the strip between the
      // road's edge and the gravel bed on the west, and between the bed and the
      // east toe on the east - and the site is dropped in the middle of the
      // widest one found. That is also the place a surveyor would pick.
      //
      // The scan is confined to z -1800..-200 because the site has to be IN
      // FRAME as well as on flat ground: LOW PASS stands at (-308, -1466) at 80 m
      // looking up the valley, and a rescue post behind that lens is a rescue
      // post nobody has to build.
      //
      // The FAR BANK CARRIES A 120 m PENALTY, which is the width of the widest
      // strip a bridge is worth. Raw, the west bank wins at 332 m against the
      // east bank's 267 - and buys a second river crossing 700 m from the base
      // tunnel's, on a valley floor that should have about one. With the penalty
      // the site stays on the road's own side, at the point where the meander
      // has swung furthest away from it. Reshape the corridor so the far bank is
      // 120 m better and the scan will take it and the spur will build itself a
      // crossing.
      const rescue = (() => {
        let best = null;
        for (let z = -1800; z <= -200; z += 40) {
          const f = floorAt(z);
          // [strip start, strip end, the direction that leads away from the
          // water, the cost of getting there]
          const banks = [
            [f.c - f.h + 40, riverX(z) - bedHalf(z) - 20, -1, 120],
            [riverX(z) + bedHalf(z) + 20, roadX(z) - 46, 1, 0]
          ];
          for (const [lo, hi, side, toll] of banks) {
            const gap = hi - lo;
            if (!best || gap - toll > best.score) best = { z, gap, side, score: gap - toll, x: (lo + hi) / 2 };
          }
        }
        return best;
      })();
      {
        const PX = rescue.x;
        const PZ = rescue.z;
        // The apron wants to be 92 m; it gives way to the strip it is standing
        // in, down to a floor of 56 m (below which the H stops being legible from
        // APPROACH and the site may as well not be there).
        const APRON = Math.max(56, Math.min(92, rescue.gap - 44));
        const A = APRON / 2;
        const g = groundAt(PX, PZ);
        // Apron. Dark, so the white H on it is the highest-contrast pair of
        // values on the valley floor.
        box(PX, g + 0.6, PZ, APRON, 1.2, APRON, 0x3a3c38);
        // Pale kerb on all four sides - the same job the Sark Port canal coping
        // does, which is to draw the EDGE of a flat thing seen from above.
        for (const s of [-1, 1]) {
          box(PX + s * A, g + 1.1, PZ, 5, 2.2, APRON, 0xb6b0a0);
          box(PX, g + 1.1, PZ + s * A, APRON, 2.2, 5, 0xb6b0a0);
        }
        // The H. Two uprights and a crossbar, 0.48 of the apron across in plan -
        // a real one is 12 m, and a 12 m mark is one pixel from anywhere but the
        // deck.
        for (const s of [-1, 1]) box(PX + s * A * 0.34, g + 2.2, PZ, 9, 1.4, A * 0.96, 0xdfe2e0);
        box(PX, g + 2.2, PZ, A * 0.68, 1.4, 9, 0xdfe2e0);
        // Station buildings, on the flat side away from the water. Red roofs:
        // the only warm hue on the map outside the sky, so the site is findable
        // at a glance from any altitude, and a rescue post is exactly the thing
        // that should be.
        const HUT_X = PX + rescue.side * (A + 34);
        for (let i = 0; i < 2; i += 1) {
          const hz = PZ - 34 + i * 58;
          box(HUT_X, g + 7, hz, 30, 14, 22, HUT_WALL);
          box(HUT_X, g + 15, hz, 38, 3.4, 30, HUT_ROOF);
        }
        // A white cross on the nearer roof, for the same reason the H is there.
        box(HUT_X, g + 17.2, PZ - 34, 24, 1.2, 7, 0xe8ecea);
        box(HUT_X, g + 17.2, PZ - 34, 7, 1.2, 17, 0xe8ecea);
        // Fuel bladder and a windsock mast.
        cyl(HUT_X, g + 5, PZ + 70, 11, 10, 0xa8a496);
        box(PX - rescue.side * A * 0.6, g + 19, PZ - 48, 3, 38, 3, STEEL_WHITE);
        box(PX - rescue.side * A * 0.6, g + 36, PZ - 42, 3, 5, 14, RESCUE_ORANGE);
        // Spur to the valley road, run at constant z so that if it ever has to
        // cross the water the crossing is square to it.
        {
          const spur = [];
          const from = roadX(PZ);
          const to = HUT_X - rescue.side * 24;
          for (let s = 0; s <= 8; s += 1) {
            const f = s / 8;
            spur.push({ x: from + (to - from) * f, z: PZ });
          }
          pushRoad(spur, [11, 7, 4.5], [2, 2.8, 3.6]);
          const rx = riverX(PZ);
          if ((rx - from) * (to - rx) > 0) riverCrossing(PZ, Math.PI / 2);
        }
      }

      // =====================================================================
      // 7. TALUS, AND THE FLOODPLAIN
      // =====================================================================
      // What was wrong with this floor was not the river; it was that between
      // the river and the walls there was NOTHING - a flat green field with a
      // road on one side of it. At 80 m and 300 knots a field has no scale, and
      // a valley whose walls meet its floor along a clean line has no geology.
      //
      // Three populations fix it, and all three are drawn along the MEASURED toe
      // so they arrive wherever the wall actually is:
      //
      //   TALUS FANS - scree spreading OUT OF the wall and ONTO the floor: each
      //   one starts 80 m up the slope as a 24 m gully mouth and opens to 130 m
      //   where it runs out on the flat, 90-170 m clear of the toe. That direction
      //   is the whole of it. The first build ran them the other way, 350 m up
      //   the flank tapering as they went, and they photographed as sheets of
      //   paper pasted halfway up a mountain - debris does not climb, and a fan
      //   that reaches a third of the way up a 900 m wall is not a fan, it is a
      //   glacier. Ribbons, so they drape over the break of slope rather than
      //   bridging it.
      //
      //   TALUS BLOCKS - the coarse fraction, scattered in a band straddling the
      //   toe. This is the population doing the scale work: a 6-22 m block at
      //   the bottom of a 900 m wall is the only object on the floor whose size
      //   the eye already knows.
      //
      //   FLOODPLAIN BOULDERS - the same rock, sorted and rounded, out on the
      //   gravel. Denser near the bed and thinning outward, so the braid has a
      //   fringe rather than an edge.
      for (let z = -3900; z <= 2400; z += 150) {
        for (const sign of [-1, 1]) {
          if (rand() > 0.55) continue;
          const t = toeRawAt(z, sign);
          if (!t.walled) continue;
          const toe = t.x;
          const up = 55 + rand() * 55;
          const out = 90 + rand() * 80;
          const skew = (rand() - 0.5) * 90;
          const pts = [];
          for (let s = 0; s <= 6; s += 1) {
            const t = s / 6;
            pts.push({
              // t 0 = the gully mouth on the slope, t 1 = the toe of the fan on
              // the floor. Runs downhill, i.e. towards the axis.
              x: toe + sign * (up - (up + out) * t),
              z: z + skew * t,
              hw: 12 + 54 * t
            });
          }
          pushRibbon(strips.scree, pts, 40, 1.4);
        }
      }
      for (let z = -4000; z <= 2450; z += 26) {
        for (const sign of [-1, 1]) {
          const t = toeRawAt(z, sign);
          if (!t.walled) continue;
          const toe = t.x;
          // Clustered rather than even: a run of three stations with blocks and
          // then two without is what a wall foot looks like, and an even
          // scatter at this density is gravel wallpaper.
          const n = rand() > 0.45 ? 1 + Math.floor(rand() * 2) : 0;
          for (let i = 0; i < n; i += 1) {
            const x = toe + sign * (rand() * 150 - 40);
            const zz = z + (rand() - 0.5) * 26;
            const g = groundAt(x, zz);
            // Nothing above the conifer belt: this is debris at the foot of a
            // wall, and a boulder halfway up one is a boulder in mid-air.
            if (g > 130) continue;
            const s = 5 + rand() * 11;
            box(x, g + s * 0.24, zz, s, s * 0.48, s * (0.6 + rand() * 0.9),
              rand() > 0.65 ? TALUS_BLOCK_PALE : TALUS_BLOCK, [0, rand() * 3.14, 0]);
          }
        }
      }
      for (let z = RIVER_Z0 + 60; z <= RIVER_Z1 - 60; z += 34) {
        const cx = riverX(z);
        const bh = bedHalf(z);
        for (let i = 0; i < 2; i += 1) {
          const side = rand() > 0.5 ? 1 : -1;
          const spread = rand();
          const x = cx + side * bh * (0.55 + spread * spread * 2.4);
          const zz = z + (rand() - 0.5) * 34;
          const g = groundAt(x, zz);
          if (g > 60) continue;
          const s = 4 + rand() * 9;
          box(x, g + s * 0.26, zz, s, s * 0.52, s * (0.8 + rand() * 0.6),
            rand() > 0.5 ? BOULDER : TALUS_BLOCK_PALE, [0, rand() * 3.14, 0]);
        }
      }

      // =====================================================================
      // 8. CONIFERS
      // =====================================================================
      // The single cheapest thing on the map that says "not a glacier". Three
      // populations, one InstancedMesh:
      //
      //   RIPARIAN - stands either side of the river, offset from the bed's own
      //   edge out to 0.94 of the floor half-width, so they frame the gravel
      //   rather than stand in it however wide the braid is at that station.
      //   This is what gives the floor depth cues at LOW PASS, where the ground
      //   plane is otherwise a texture with no objects of known size on it.
      //
      //   GROVES - clusters of 9-22 on the open floor, thrown at 190 m intervals
      //   and rejected wherever they land on the gravel or the road. Scattering
      //   single trees evenly over a floor gives an orchard; real valley woodland
      //   is patches with meadow between them, and the patch edge is another
      //   piece of information the eye can measure distance against.
      //
      //   SLOPE - scattered over the bottom third of every wall, between the toe
      //   and 34% of the peak's height. The terrain shader already paints a
      //   green belt there; these are the trees that give it silhouette, and
      //   capping them at 34% is what leaves the top two thirds bare rock.
      //
      // All three reject any spot the sampler puts outside their own band, so
      // nothing is planted in mid-air, on a cliff or in the river.
      const treeAt = (x, z, h) => {
        cone(x, h + 0, z, 5 + rand() * 4, 17 + rand() * 17, rand() > 0.45 ? TREE_DARK : TREE_LIGHT);
      };
      // 165 m of cleared ground round the rescue post. Not landscaping: at LOW
      // PASS the site is 995 m ahead of the lens at 80 m AGL, which puts a 30 m
      // conifer 300 m in front of it exactly over the apron. The first build
      // planted the riparian band straight through it and the H, the huts and
      // the windsock all came back behind a screen of trees. A helicopter pad in
      // a wood is cleared for the same reason.
      const clearOfRescue = (x, z) => Math.hypot(x - rescue.x, z - rescue.z) > 165;
      for (let z = RIVER_Z0 + 120; z <= RIVER_Z1 - 120; z += 34) {
        const cx = riverX(z);
        const f = floorAt(z);
        const inner = bedHalf(z) + 24;
        for (let i = 0; i < 5; i += 1) {
          const side = rand() > 0.5 ? 1 : -1;
          const x = cx + side * (inner + rand() * Math.max(60, f.h * 0.94 - inner));
          const zz = z + (rand() - 0.5) * 34;
          const g = groundAt(x, zz);
          if (g > 190 || !clearOfRescue(x, zz)) continue;
          treeAt(x, zz, g);
        }
      }
      for (let z = RIVER_Z0 + 260; z <= RIVER_Z1 - 260; z += 190) {
        const f = floorAt(z);
        const side = rand() > 0.5 ? 1 : -1;
        const cx = f.c + side * f.h * (0.42 + rand() * 0.42);
        const cz = z + (rand() - 0.5) * 150;
        // Not on the braid and not on the carriageway.
        if (Math.abs(cx - riverX(cz)) < bedHalf(cz) + 30) continue;
        if (Math.abs(cx - roadX(cz)) < 46) continue;
        const spread = 44 + rand() * 62;
        const n = 9 + Math.floor(rand() * 14);
        for (let i = 0; i < n; i += 1) {
          const x = cx + (rand() - 0.5) * 2 * spread;
          const zz = cz + (rand() - 0.5) * 2 * spread;
          const g = groundAt(x, zz);
          if (g > 190 || !clearOfRescue(x, zz)) continue;
          treeAt(x, zz, g);
        }
      }
      for (const peak of ridge) {
        const summit = summitOf(peak);
        const lo = 18;
        const hi = summit * 0.34;
        for (let i = 0; i < 78; i += 1) {
          const bearing = rand() * 360;
          const dir = dirOf(bearing);
          // Sampled on a ring rather than probed per tree: a bisection per tree
          // would be 12 raycasts x 78 trees x 14 peaks for scenery nobody
          // measures. Anything that lands outside the band is simply dropped.
          const r = 320 + rand() * 720;
          const x = peak.x + dir.x * r;
          const z = peak.z + dir.z * r;
          const g = groundAt(x, z);
          if (g < lo || g > hi) continue;
          treeAt(x, z, g);
        }
      }

      // =====================================================================
      // 9. THE SURROUNDING RANGES
      // =====================================================================
      // A pass is a gap in a mountain range. Before this the map was a pair of
      // walls standing on an unbounded green plain: every camera above 300 m had
      // flat ground running to the fog on both flanks, which is the one thing a
      // highland pass cannot look like.
      //
      // WHY THIS IS NOT `mountains.count`. The preset's background ring is a
      // CIRCLE at a random azimuth, and this massif is a 4 km x 7 km ellipse, so
      // the smallest circle that clears its own ends (3540 m from sceneryOrigin,
      // plus a hill's own 900 m skirt) is already at 4400 m - which is where the
      // ring sits, and there is nothing left to tighten. Worse, the azimuths are
      // drawn from the shared mountain rng: raising `count` to fill the eastern
      // flank also drops peaks into the two places nothing may stand, which are
      // the ends of the valley. Measured over counts 6-30, no value leaves both
      // axis windows clear. The ring is therefore left doing what it is good at
      // (textured, collidable mass at 4.1-5.6 km, now eight peaks instead of six)
      // and the CLOSING is done here, where the azimuth is a decision.
      //
      // THE SHAPE IS A BOX WITH TWO GATES. Two ranges parallel to the valley at
      // x +-3600 - far enough out to leave a 700 m parallel bay beyond each wall's
      // outer skirt, near enough that from the preview sheet's OVERVIEW and
      // APPROACH cameras (which stand at x -1437 and -889, i.e. INSIDE the west
      // bay) they fill the flanks of frame - and two cross ranges closing the
      // north and south at z +4300 and -5300, each of which stops 1350 m short of
      // the axis on both sides. That 2700 m gate is the pass itself: from the
      // valley floor it subtends 29 degrees of open horizon at each end, with
      // mountains either side of it, and it is the only direction on this map
      // that is not walled.
      //
      // Peaks are stepped at 400 m against footprints of 680-1360 m, i.e. every
      // one overlaps its neighbours by at least a third - the same trick the
      // corridor uses, and the reason these read as RANGES and not as the field
      // of separate cones the map used to be.
      //
      // NO COLLISION. These are decoration, like the trees: `world.mountains` is
      // untouched. That is the accepted cost of controlling where they go, and it
      // is bounded by the fact that they stand 3.6 km off an axis whose keepClear
      // lane is 2.1 km wide - a sortie that reaches them has already left the map.
      {
        const RANGE_X = 3600;
        const RANGE_Z0 = 3300;
        const RANGE_Z1 = -6200;
        const RANGE_STEP = 400;
        const GATE = 1350;
        const CROSS_OUT = 4700;
        const drawRidge = (x, z, scale) => {
          const r = (330 + rand() * 350) * scale;
          const h = (400 + rand() * 500) * scale;
          const tone = rand();
          ridgeCone(x, 0, z, r, h, tone > 0.72 ? RIDGE_HIGH : (tone > 0.34 ? RIDGE_MID : RIDGE_LOW));
          // Snow only on what earns it, and the cap is drawn 0.37 of the body
          // against a body radius of 0.36 at that height - one per cent proud,
          // which is a collar rather than a coplanar face that would z-fight.
          if (h > 720) ridgeCone(x, h * 0.64, z, r * 0.37, h * 0.37, RIDGE_SNOW);
        };
        for (let z = RANGE_Z0; z >= RANGE_Z1; z -= RANGE_STEP) {
          for (const sign of [-1, 1]) {
            drawRidge(sign * (RANGE_X + (rand() - 0.5) * 520), z + (rand() - 0.5) * 260, 1);
          }
        }
        // FOOTHILLS IN THE TWO BAYS. Between each wall's outer skirt (|x| ~2010)
        // and the range behind it there is 1.6 km of open ground, and from the
        // two high cameras - which both stand INSIDE the western bay - it is the
        // nearest thing in frame and takes up the whole lower corner. Left bare
        // it is a green apron under a row of mountains, which is the same
        // complaint the ranges were built to answer, only closer. A row of low
        // hills at 0.4 scale on 520 m centres breaks it into ground.
        for (let z = 3000; z >= -5800; z -= 520) {
          for (const sign of [-1, 1]) {
            if (rand() > 0.82) continue;
            drawRidge(sign * (2560 + (rand() - 0.5) * 460), z + (rand() - 0.5) * 340, 0.4);
          }
        }
        for (const cz of [4300, -5300]) {
          for (let x = GATE; x <= CROSS_OUT; x += 420) {
            for (const sign of [-1, 1]) {
              drawRidge(sign * (x + (rand() - 0.5) * 220), cz + (rand() - 0.5) * 420, 0.94);
            }
          }
        }
      }

      // =====================================================================
      // 10. UPLOAD
      // =====================================================================
      // Six ribbon meshes, then one InstancedMesh per primitive. computeVertex-
      // Normals on the ribbons rather than authored normals: a draped strip on a
      // 44-degree wall genuinely is not flat, and its shading has to come from
      // the shape it ended up with.
      for (const key of Object.keys(strips)) {
        const strip = strips[key];
        if (strip.idx.length === 0) continue;
        const geometry = keepGeometry(new THREE.BufferGeometry());
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(strip.pos, 3));
        geometry.setIndex(strip.idx);
        geometry.computeVertexNormals();
        const material = keepMaterial(new THREE.MeshStandardMaterial({
          color: strip.color, roughness: strip.roughness, metalness: strip.metalness
        }));
        addRoot(new THREE.Mesh(geometry, material));
      }

      const matrix = new THREE.Matrix4();
      const quaternion = new THREE.Quaternion();
      const euler = new THREE.Euler();
      const position = new THREE.Vector3();
      const scale = new THREE.Vector3();
      const colour = new THREE.Color();
      const upload = (list, geometry, read) => {
        if (list.length === 0) return;
        const mesh = new THREE.InstancedMesh(
          geometry,
          keepMaterial(new THREE.MeshLambertMaterial({ color: 0xffffff })),
          list.length
        );
        for (let i = 0; i < list.length; i += 1) {
          const item = list[i];
          read(item, position, scale);
          if (item.rot) {
            euler.set(item.rot[0], item.rot[1], item.rot[2], "YXZ");
            quaternion.setFromEuler(euler);
          } else {
            quaternion.identity();
          }
          mesh.setMatrixAt(i, matrix.compose(position, quaternion, scale));
          // The material stays white so the instance colour IS the colour, and
          // setHex runs through the same colour management a material's own
          // value would - so these hexes match the ones in the preset.
          mesh.setColorAt(i, colour.setHex(item.color));
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        addRoot(mesh);
      };
      upload(boxes, keepGeometry(new THREE.BoxGeometry(1, 1, 1)), (b, p, s) => {
        p.set(b.x, b.y, b.z);
        s.set(b.sx, b.sy, b.sz);
      });
      upload(cylinders, keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 14, 1, false)), (c, p, s) => {
        p.set(c.x, c.y, c.z);
        s.set(c.r, c.h, c.r);
      });
      upload(cones, keepGeometry(new THREE.ConeGeometry(1, 1, 6)), (c, p, s) => {
        p.set(c.x, c.y + c.h * 0.5, c.z);
        s.set(c.r, c.h, c.r);
      });
      upload(ridgeCones, keepGeometry(new THREE.ConeGeometry(1, 1, 11)), (c, p, s) => {
        p.set(c.x, c.y + c.h * 0.5, c.z);
        s.set(c.r, c.h, c.r);
      });
    }
  });
}
