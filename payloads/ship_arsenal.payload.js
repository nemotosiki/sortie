// Arsenal ship — a 250m missile magazine with a hull attached.
//
// The blockade group's centrepiece (M20 / M40): it never closes, it saturates.
// Every silhouette decision below follows from that one sentence:
//
//   * The deck IS the weapon. A flush, unbroken 250m plane whose whole surface
//     is VLS cell grid — four fields, 536 hatches, running 164m of the 250m
//     hull nearly rail to rail. Nothing else stands on it. A carrier's flat-top
//     says "aircraft live here"; this one says "the missiles are loaded".
//   * ONE superstructure, small, right aft (z +89), so the forward four fifths
//     of the ship is uninterrupted cell field. That is the opposite of the
//     Aegis' one big forward block and the reason the two never read alike at
//     a kilometre.
//   * Tumblehome sides. The hull slabs are rolled inboard ~14 degrees and the
//     deck (40m) is NARROWER than the waterline (44m), which is the stealth-
//     combatant read and the only ship here that has it. The hull is also the
//     beamiest afloat at 5.7:1, because ten cells abreast need the width and
//     because a barge-like plan is itself part of the identity.
//   * TWO CIWS drums and nothing else for self defence — deliberately
//     asymmetric (one to port on a deck-edge tub, one a level higher on the
//     island's starboard shoulder) so the "this thing cannot defend itself"
//     read is visual, not a stat the player discovers by surviving a pass.
//
// Registration only: SHIP_TYPES entry + hull geometry. No mission fields it.
export default function register(ctx) {
  const { SHIP_TYPES } = ctx.tables;

  // The Aegis is the template rather than the carrier: this is a surface
  // combatant that steams in company with the fleet, not a flat-top with its
  // own aviation-shaped fields. Everything the spread carries and this entry
  // does not override is a placeholder — see the BALANCE TODO below.
  const aegis = SHIP_TYPES.aegis;
  if (!aegis) throw new Error("[ship-arsenal] SHIP_TYPES.aegis is the template and is missing");

  // ---------------------------------------------------------------------------
  // Hull geometry constants — shared by the SHIP_TYPES offsets and by build().
  // The subsystem offsets below are NOT independent numbers: each is written
  // against the line of build() that draws the hardware it sits on, and the
  // pairing is called out in both places.
  // ---------------------------------------------------------------------------
  // Four VLS fields, each a quadrant of the deck. Centres in hull-local metres
  // (bow at -Z), deck plane at y 8.4, hatch tops at y 9.33.
  //   vls-1  z -73  forecastle field   (bow-most, narrowed by the hull taper)
  //   vls-2  z -34  forward main field
  //   vls-3  z  18  after main field
  //   vls-4  z  62  quarterdeck field  (last one before the island)
  // The port CIWS tub is at x -18 / z +78; the starboard drum is on the island
  // shoulder at x +15.6 / z +92 and is hardware only.

  ctx.addShipType("arsenal", {
    ...aegis,
    key: "arsenal",
    surface: true,
    label: "ARSENAL",
    role: "Arsenal Ship",

    // ---- Dimensions: 250m LOA, 44m beam at the waterline --------------------
    // Measured off the hull this file draws, on the Aegis' own conventions:
    // hitBox.z is the full length, crash.halfLen is half of it, and the
    // stern/bow offsets are where the wake and the bow spray are pinned.
    hitRadius: 128,
    crash: Object.freeze({ halfLen: 124, halfBeam: 24, top: 20 }),
    hitBox: Object.freeze({ x: 48, y: 30, z: 252 }),
    sinkDepth: 34,
    blastSpread: 52,
    smokeOffset: 88,   // the funnel is in the aft island, not amidships
    smokeHeight: 20,
    sternOffset: 122,
    bowOffset: 124,

    // BALANCE TODO: placeholder. hp / cruiseSpeed / turnRate / aa / aaHeight /
    // radarColor / tracerColor / explosionColor are all inherited verbatim from
    // the Aegis by the spread above and have NOT been tuned for this hull.
    // A 250m magazine ship should almost certainly be slower and more fragile
    // per-tonne than a destroyer, and its self-defence gun should be weaker
    // than the Aegis' (two CIWS and nothing else is the design intent), but
    // none of that is decided here — this file ships the shape.
    // BALANCE TODO: placeholder — aaMounts is the Aegis' [-48, 50], which does
    // not correspond to hardware this hull draws. It exists only because the
    // spread carries it; the live mounts are the `subsystems` entries below.

    // ---- Subsystems: NEXT-target walk = hull, VLS x4, CIWS ------------------
    // Every offset is the centre of a part build() actually draws, so a player
    // who locks one is aiming at hardware they can see.
    //   vls-1 { 0, 9.4, -73 }  hatch field drawn at z -73 ( 80 cells,  8x10)
    //   vls-2 { 0, 9.4, -34 }  hatch field drawn at z -34 (168 cells, 12x14)
    //   vls-3 { 0, 9.4,  18 }  hatch field drawn at z  18 (168 cells, 12x14)
    //   vls-4 { 0, 9.4,  62 }  hatch field drawn at z  62 (120 cells, 12x10)
    //   ciws  { -18, 13.4, 78 } port drum, on its tub at x -18 / z +78
    // y 9.4 is the deck plane (8.4) plus the hatch coaming: the lock box sits
    // on the cell mouths rather than inside the hull.
    subsystems: Object.freeze([
      Object.freeze({ key: "vls-1", kind: "vls", offset: Object.freeze({ x: 0, y: 9.4, z: -73 }) }),
      Object.freeze({ key: "vls-2", kind: "vls", offset: Object.freeze({ x: 0, y: 9.4, z: -34 }) }),
      Object.freeze({ key: "vls-3", kind: "vls", offset: Object.freeze({ x: 0, y: 9.4, z: 18 }) }),
      Object.freeze({ key: "vls-4", kind: "vls", offset: Object.freeze({ x: 0, y: 9.4, z: 62 }) }),
      Object.freeze({ key: "ciws", kind: "ciws", offset: Object.freeze({ x: -18, y: 13.4, z: 78 }) })
    ])
  });

  ctx.addShipModel("arsenal", {
    build(env) {
      const { THREE, geometry, add, friendly,
              hull, deck, house, dark, light, markings, extraMaterials } = env;

      // =====================================================================
      // 1. Hull — 250m, low freeboard, tumblehome
      // =====================================================================
      // Core slab: 250 long and 44 wide at the waterline — length-to-beam about
      // 5.7:1, i.e. deliberately BEAMIER than any warship here (the Aegis is
      // nearer 10:1, and the carrier's hull proper about 8:1). The extra beam
      // is not decoration: the deck has to carry ten cells abreast and still
      // read as a DECK from above rather than as a spine, and that top-down
      // read is the whole silhouette.
      // Runs z -96 to +126: it STOPS at the bow wedge's base rather than
      // running out to the stem, so the wedge is the ship's actual nose. When
      // the slab ran the full 244m the wedge sat inside it and the hull ended
      // in a squared-off block with a triangle recessed in it.
      add(geometry.panel, hull, 0, 4.4, 15, 44, 8.8, 222);
      // Boot topping / waterline band, the same dark stripe every hull here
      // wears at its own scale.
      add(geometry.panel, dark, 0, 0.8, 15, 44.6, 1.9, 223);
      // Tumblehome: two long slabs rolled INBOARD ~14 degrees, so the sides
      // lean in from the waterline to the deck edge. This is the stealth read
      // and the one thing no other hull in the game does — the Aegis' sides
      // are vertical. Rolled about z, so port leans +x-up and starboard -x-up.
      // Set OUTBOARD of the core slab's own faces (x +/-19) so the lean is a
      // visible overhang from the side, not a slab buried inside another slab.
      add(geometry.panel, hull, -21.4, 5.6, 16, 4.6, 11.4, 218, 0, 0, 0.25);
      add(geometry.panel, hull, 21.4, 5.6, 16, 4.6, 11.4, 218, 0, 0, -0.25);
      // Knuckle line where the tumblehome meets the deck edge — a thin dark
      // strake that draws the inward lean as a hard edge instead of a soft one.
      add(geometry.panel, dark, -20.0, 8.6, 16, 2.4, 0.6, 218, 0, 0, 0.25);
      add(geometry.panel, dark, 20.0, 8.6, 16, 2.4, 0.6, 218, 0, 0, -0.25);
      // Faceted bow. A wave-piercing wedge rather than the Aegis' knife: wide
      // at the base, raked, and SHORT — the point is that it looks like it was
      // designed to be invisible rather than to be fast.
      //
      // geometry.shipBow is a FOUR-SIDED cone whose scale is a RADIUS, not a
      // width: sx is the half-beam of its base, and the base sits aft with the
      // point forward once it is rotated -PI/2 about X. The Aegis' numbers are
      // the calibration — a 19-wide hull carries sx 9.5, i.e. exactly half —
      // so a 44-wide hull wants sx 22 to meet it flush. sx 30 made the stem
      // visibly flare wider than the ship, which is what the last pass showed.
      //
      // sy is then the -Z run and sz the height: 26m of entry, 9.6m tall, so
      // the wedge is a long shallow stealth stem rather than the flat blade
      // (sz 5.4) or the stubby barge nose (sy 14) of the two passes before it.
      add(geometry.shipBow, hull, 0, 4.6, -109, 22, 26, 9.6, -Math.PI / 2);
      // Forecastle breakwater: a low angled plate across the deck ahead of the
      // first cell field, abaft the wedge's root at z -95. Set at y 9.6 so it
      // stands just proud of the hatches it shelters — the one thing forward of
      // the island allowed to break the flush deck line, and only by a metre.
      add(geometry.panel, house, 0, 9.6, -92, 26, 1.9, 4, 0.36);
      // Transom — flat cut stern, squared off, another line the fleet's other
      // hulls do not have.
      add(geometry.panel, hull, 0, 4.9, 120, 41, 9.6, 8);
      add(geometry.panel, dark, 0, 4.9, 124.4, 37, 8, 1.2);

      // =====================================================================
      // 2. The deck — one flush plane, and the four cell fields ON it
      // =====================================================================
      // The deck is NARROWER than the waterline beam (40 against 44) because
      // of the tumblehome. Flush from the breakwater right aft to the island,
      // with nothing standing on it except cells.
      // Runs z -108 to +122: it stops at the breakwater rather than carrying on
      // over the bow wedge, which is what made the deck visibly overhang the
      // stem in profile.
      add(geometry.panel, deck, 0, 8.4, 7, 40, 1.2, 230);
      // Deck-edge coaming: a low continuous lip so the cell fields read as
      // being set INTO a deck rather than stacked on top of a slab.
      add(geometry.panel, house, -19.4, 9.1, 7, 1.4, 1.6, 228);
      add(geometry.panel, house, 19.4, 9.1, 7, 1.4, 1.6, 228);

      // The VLS fields. The grid is PAINTED, not built cell by cell, for the
      // same reason the carrier's runway markings are painted: 492 hatches is
      // 984 meshes, two orders of magnitude past what any hull here costs, and
      // the cells are flat lids seen from above — exactly the case a decal
      // answers better than geometry. Each field is a plate (the armoured box
      // the cells are sunk into) with one textured plane laid on it.
      //
      // The texture is this hull's only non-standard material, so it goes into
      // `extraMaterials` and is disposed with the model - the same contract the
      // carrier's deck skin follows. One canvas is shared by all four fields;
      // per-field extent comes from the plane's scale and the texture's repeat,
      // so a field is always a whole number of cells wide and long.
      const cellCanvas = document.createElement("canvas");
      cellCanvas.width = 64;
      cellCanvas.height = 64;
      {
        const g = cellCanvas.getContext("2d");
        // One cell: a mid-grey lid on a near-black surround, with the centre
        // seam every real hatch has. Drawn once and tiled, so the pitch is
        // exact.
        //
        // The gaps are WIDE (7 of 64 px) and the lid is deliberately NOT white.
        // This is an unlit MeshBasicMaterial, so it takes no shading from the
        // preview's key light and none from the map's sun: whatever contrast
        // the canvas has is all the contrast there will ever be, at every
        // range and every angle. A pale lid on a thin seam turned the fields
        // into four blank white slabs in the three-quarter views - the grid
        // only survived looking straight down. Dark seams this wide keep it
        // legible where the player actually sees the ship, from off the bow.
        g.fillStyle = friendly ? "#161d27" : "#1b1f24";
        g.fillRect(0, 0, 64, 64);
        g.fillStyle = friendly ? "#5d718a" : "#6d757d";
        g.fillRect(7, 7, 50, 50);
        g.fillStyle = friendly ? "#161d27" : "#1b1f24";
        g.fillRect(29, 7, 6, 50);
        // Hinge line along one edge, so the lids read as lids and the field has
        // a direction rather than being a chequerboard.
        g.fillStyle = friendly ? "#93a8bd" : "#9ea7af";
        g.fillRect(7, 7, 50, 6);
      }
      // `fieldCount` hands the first field the original texture and every later
      // one a clone, so the CanvasTexture that is made here always ends up
      // owned by a material in `extraMaterials` rather than orphaned.
      const cellTexture = new THREE.CanvasTexture(cellCanvas);
      let fieldCount = 0;

      // buildCellField(zc, cols, rows) lays a cols x rows field centred on
      // (0, zc) at pitch 2.9m. Twelve columns spans 34.8m across a 40m deck, so
      // the grid runs very nearly rail to rail and the walkways left over are
      // the narrow strips a real ship has, not empty deck.
      const pitch = 2.9;
      const buildCellField = (zc, cols, rows) => {
        const w = cols * pitch;
        const len = rows * pitch;
        // Field surround: the armoured box the cells are sunk into, standing a
        // little proud of the deck so the field has a visible edge in profile.
        add(geometry.panel, house, 0, 8.7, zc, w + 1.8, 0.9, len + 1.8);
        add(geometry.panel, dark, 0, 9.16, zc, w + 1.0, 0.22, len + 1.0);
        // The cell grid itself, one plane laid flat on the box top. Each field
        // needs its OWN texture object: `repeat` lives on the texture, so a
        // single shared map would end up wearing the last field's cell count on
        // all four. The clones share the one source canvas, and each rides in
        // `extraMaterials` with the material that holds it - which is what
        // disposes it with the model. A material made in build() and left out
        // of that array is the one way a payload hull can leak.
        const map = fieldCount === 0 ? cellTexture : cellTexture.clone();
        fieldCount += 1;
        map.needsUpdate = true;
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.repeat.set(cols, rows);
        // No mipmaps. A field is about a hundred pixels across on screen while
        // carrying a dozen cells, so every mip level past the first averages the
        // seams into the lids and the field turns into one pale slab - which is
        // exactly what the three-quarter views showed before this line. Linear
        // magnification with a LinearMipmap minFilter is the default and is the
        // wrong default here: the grid IS the ship's identity, so it is worth
        // the aliasing to keep it visible at the range the player flies at.
        map.generateMipmaps = false;
        map.minFilter = THREE.LinearFilter;
        map.magFilter = THREE.LinearFilter;
        const fieldSkin = new THREE.MeshBasicMaterial({ map });
        extraMaterials.push(fieldSkin);
        add(geometry.shipDeck, fieldSkin, 0, 9.29, zc, w, len, 1, -Math.PI / 2);
      };

      // Four fields running z -87.5 to +76.5 with only 4m walkways between them:
      // 164m of the 250m hull is cell hatch, which is the "one whole face of
      // the deck is grid" requirement made literal. 536 cells.
      //
      // vls-1  { x 0, y 9.4, z -73 } — forecastle field, 8 x 10 = 80 cells.
      // Four columns narrower and four rows shorter than the main fields: the
      // hull is still tapering into the 30m bow wedge here (root at z -95), and
      // a field any longer would put hatches inside the stem.
      buildCellField(-73, 8, 10);
      // vls-2  { x 0, y 9.4, z -34 } — forward main field, 12 x 14 = 168 cells.
      buildCellField(-34, 12, 14);
      // vls-3  { x 0, y 9.4, z  18 } — after main field, 12 x 14 = 168 cells.
      buildCellField(18, 12, 14);
      // vls-4  { x 0, y 9.4, z  62 } — quarterdeck field, 12 x 10 = 120 cells.
      // Ten rows rather than fourteen: at pitch 2.9 this field runs out to
      // z 76.5, and the island's forward face is at z 77. Fourteen would put
      // hatches inside the superstructure.
      buildCellField(62, 12, 10);

      // Deck striping in the walkways between the fields: the only bare deck on
      // the ship, painted so the fields read as four separate blocks instead of
      // one continuous carpet. This is what makes "four lockable quadrants"
      // visible before the player locks anything.
      for (const z of [-60, -8, 41]) {
        add(geometry.shipDeck, markings, 0, 9.05, z, 36, 1.4, 1, -Math.PI / 2);
      }

      // =====================================================================
      // 3. Aft island — the ONLY superstructure
      // =====================================================================
      // Small, faceted, and shoved right aft at z +88, which leaves 200m of
      // clear cell deck ahead of it. Sides tapered inboard to match the hull's
      // tumblehome so the whole ship shares one geometry language.
      add(geometry.panel, house, 0, 13.4, 89, 26, 9, 24);
      add(geometry.panel, house, -12.6, 13.4, 89, 2.6, 8.6, 23, 0, 0, 0.24);
      add(geometry.panel, house, 12.6, 13.4, 89, 2.6, 8.6, 23, 0, 0, -0.24);
      // Bridge box on top, set forward on the island so it overlooks the deck.
      add(geometry.panel, house, 0, 20.4, 85, 19, 5, 13);
      add(geometry.panel, dark, 0, 22.3, 85, 19.6, 0.9, 13.6);
      // Bridge windows — one dark band round the front face.
      add(geometry.panel, dark, 0, 21.4, 78.3, 17.6, 1.9, 0.6);
      // Faceted enclosed mast: a single tapered tower, not a lattice. Stealth
      // ships hide their antennas inside one; the frigate's open lattice is the
      // deliberate contrast. Kept SHORT relative to the hull (tops out at 34m
      // against a 250m length) so nothing on this ship out-reads the deck.
      add(geometry.panel, house, 0, 28.4, 91, 8.4, 8.4, 8.4);
      add(geometry.panel, house, 0, 33.6, 91, 5, 4, 5);
      add(geometry.shipOctPlate, light, 0, 36.2, 91, 3.4, 0.5, 3.4);
      add(geometry.shipCylinder, dark, 0, 38.8, 91, 0.34, 4.6, 0.34);
      // Exhaust: two flush uptakes let into the island roof aft, angled, rather
      // than a funnel standing proud of it.
      add(geometry.panel, dark, -5.6, 18.6, 97, 4, 2.4, 7, -0.22);
      add(geometry.panel, dark, 5.6, 18.6, 97, 4, 2.4, 7, -0.22);
      // Helipad on the quarterdeck abaft the island — the one flat thing left.
      add(geometry.panel, deck, 0, 9.3, 111, 30, 0.7, 18);
      add(geometry.shockRing, markings, 0, 9.72, 111, 7.4, 7.4, 1, -Math.PI / 2);

      // =====================================================================
      // 4. Self defence — two CIWS drums, and that is the entire fit
      // =====================================================================
      // Asymmetric on purpose: the port drum is on a deck-edge tub level with
      // the island front, the starboard one is a deck higher on the island's
      // own shoulder. From the front three-quarter the ship therefore shows one
      // gun where a warship shows a battery, which is the whole read.
      //
      // ciws subsystem { x -15, y 13.4, z 78 } == the PORT tub + drum below.
      add(geometry.panel, house, -18, 11.2, 78, 7, 3.4, 9);
      add(geometry.shipCylinder, light, -18, 13.4, 78, 2.1, 2.4, 2.1);
      add(geometry.panel, dark, -18, 15.4, 74.4, 0.55, 0.55, 6.4, -0.3);
      // Starboard drum: hardware only, no subsystem entry — the design intent
      // is a single lockable CIWS, and a second lock box on a 250m hull whose
      // point is its cell fields would dilute the NEXT walk.
      add(geometry.panel, house, 15.6, 15.2, 92, 6, 3.2, 8);
      add(geometry.shipCylinder, light, 15.6, 17.5, 92, 2, 2.3, 2);
      add(geometry.panel, dark, 15.6, 19.4, 88.6, 0.5, 0.5, 6, -0.3);
      // Two decoy launcher blocks flanking the quarterdeck, low and canted with
      // the tumblehome. Small enough not to break the "one superstructure" read.
      add(geometry.panel, dark, -17.2, 10.4, 104, 3.4, 2.4, 5, 0, 0, 0.22);
      add(geometry.panel, dark, 17.2, 10.4, 104, 3.4, 2.4, 5, 0, 0, -0.22);
    }
  });
}
