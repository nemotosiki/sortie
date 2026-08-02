// Rescue vessel — a 110m orange offshore salvage/SAR ship.
//
// The neutral hull the player must NOT shoot, and the one that has to survive
// being confused with the hospital ship at a kilometre. Both are white-topped
// civilians; everything below is chosen so the two never read alike:
//
//   * ORANGE HULL, white superstructure. The hospital ship is white from the
//     waterline up with red crosses on the topsides; this one is a solid
//     high-visibility orange slab below the deck edge and pure white above it.
//     At range the eye gets a two-tone band — orange bottom / white top — which
//     is the SAR livery and is not a thing any other hull here wears. No red
//     cross anywhere on this ship, deliberately: the cross IS the hospital
//     ship's identity and duplicating it would undo the separation.
//   * A HELIDECK RIGHT AFT with a painted circle and an H inside it, standing
//     on the quarterdeck as a distinct raised platform with its safety net
//     skirt overhanging the transom. The hospital ship's aviation is a small
//     circle flush on its stern deck under a 53m tall superstructure block;
//     here the pad IS the after third of the ship and nothing stands on it.
//   * ONE BIG CRANE amidships — a lattice pedestal, a boom raked up and out
//     over the starboard rail, and the hook hanging off it on a visible fall.
//     It is 34m from deck to boom tip on a 110m hull, i.e. the tallest thing
//     aboard by a wide margin, so the top-down and the profile views both show
//     a long diagonal arm crossing the deck line. No warship or merchant in
//     the game has a raked lattice boom, so this is the shape that survives
//     downscaling to a radar-range silhouette.
//
// ---- Scale derivation (110m LOA) -------------------------------------------
// Measured against the hulls already in index.html rather than picked: the
// Aegis is 155m LOA with hitBox.z 162 and a 19m beam, the frigate is 135m with
// hitBox.z 135 and 15.8m beam, the missile boat ~40m with 8m beam. The house
// convention is that hitBox.z is the full length in metres, crash.halfLen is
// half of it, and bow/sternOffset are where the spray and wake pin to.
//
// So 110m LOA here is drawn literally: the hull box runs z -38 .. +54 (92m),
// the raked stem slab carries the topsides out to z -50 and the underwater
// wedge to the same point, and the helideck overhangs the transom to z +56 —
// 106m of hull with the pad's after edge at 56 => 110m stem to net. Beam 18m:
// a salvage ship is beamy for
// its length (110/18 = 6.1:1) against the frigate's 8.5:1 and the Aegis' 8.2:1,
// which is the working-ship proportion and reads as "not a warship" from above
// before any paint is applied. Freeboard 8.4m and deck plane at y 8.4, chosen
// off the frigate's 7.5m/7.7m at 135m — a shorter hull with the same working
// deck height, so the topsides look tall for the length the way a rescue ship's
// do.
//
// Registration only: SHIP_TYPES entry + hull geometry. No mission fields it,
// nothing is added to AIRCRAFT_ORDER, no balance table is touched.
export default function register(ctx) {
  const { SHIP_TYPES } = ctx.tables;

  // The frigate is the template rather than the carrier or the Aegis: at 135m
  // it is the closest hull in the fleet by length, so everything the spread
  // carries and this entry does not override (hp, cruiseSpeed, turnRate,
  // colours) is at least in the right order of magnitude while it waits for a
  // balance pass. It is a template for NUMBERS ONLY — the frigate's gun is
  // explicitly deleted below, because this ship does not shoot.
  const frigate = SHIP_TYPES.frigate;
  if (!frigate) throw new Error("[ship-rescueVessel] SHIP_TYPES.frigate is the template and is missing");

  // ---------------------------------------------------------------------------
  // Hull geometry constants — shared by the SHIP_TYPES offsets and by build().
  // Hull-local metres, bow at -Z, y measured up from the waterline.
  //   stem tip        z -56      (bow wedge point)
  //   hull box        z -38 .. +54, 18m beam, deck plane y 8.4
  //   superstructure  z -30 .. -4, white, bridge roof y 24.6
  //   crane pedestal  z +2,  boom tip out to starboard at x +17 / y 34
  //   helideck        z +34 .. +56 centre z +42, pad surface y 10.6
  // ---------------------------------------------------------------------------

  ctx.addShipType("rescueVessel", {
    ...frigate,
    key: "rescueVessel",
    surface: true,
    label: "RESCUE",
    role: "Rescue & Salvage Vessel",

    // ---- Dimensions: 110m LOA, 18m beam -------------------------------------
    // Read straight off the geometry build() draws, on the frigate's own
    // conventions (hitBox.z = full length, crash.halfLen = half of it).
    // The top of the crash box is 38 rather than the deck height because the
    // crane's head sheave is the tallest hardware at y 36, and halfBeam is 11
    // rather than the hull's 9 because the boom reaches out to x +20 — the
    // hook is genuinely outboard of the rail and a box drawn to the hull alone
    // would let an aircraft fly through it.
    hitRadius: 58,
    crash: Object.freeze({ halfLen: 55, halfBeam: 11, top: 38 }),
    hitBox: Object.freeze({ x: 24, y: 42, z: 110 }),
    sinkDepth: 22,
    blastSpread: 24,
    smokeOffset: -12,  // the funnel is in the forward superstructure, not aft
    smokeHeight: 16,
    sternOffset: 54,   // the transom face
    bowOffset: 50,     // the stem head, where the raked slab and the wedge meet

    // BALANCE TODO: placeholder. hp / cruiseSpeed / turnRate are inherited
    // verbatim from the frigate by the spread above and have NOT been tuned.
    // A 110m civilian salvage hull should almost certainly be slower than the
    // fleet's fastest escort (frigate cruiseSpeed 15) and is not meant to be a
    // worthwhile target at all, but none of that is decided here — this file
    // ships the shape.

    // ---- Disarmed, structurally ---------------------------------------------
    // Same disarm the cargo ship and the hospital ship use, and for the same
    // reason: `aa` cannot be deleted (updateShip dereferences spec.aa.cooldownMin
    // every frame, so `aa: undefined` is a crash rather than a disarm), so it is
    // neutered instead. tracers 0 makes aaFiringPoints' legacy loop produce zero
    // mounts and shipAaBurst returns on the empty list; range 0 means it would
    // have returned one branch earlier anyway. Nothing on the model draws a
    // barrel and ENEMY_MISSILE_PROFILES has no rescueVessel entry, so no SAM.
    aaMounts: Object.freeze([]),
    aaHeight: 0,
    aa: Object.freeze({ range: 0, cooldownMin: 9999, cooldownSpread: 0, damage: 0, maxHitChance: 0, tracers: 0 }),

    // ---- Subsystems: none ---------------------------------------------------
    // With no gun, no VLS and no CIWS there is no hardware on this model worth
    // locking, so the hull itself is the only NEXT stop — which is exactly the
    // read a neutral wants: the player who cycles onto it sees one box labelled
    // RESCUE and nothing to pick apart. `subsystems` is not in the required set
    // (the frigate and the missile boat both lack it), so clearing it is legal
    // where deleting the gun keys is not.
    subsystems: undefined,

    // Rescue orange on the radar, distinct from the fleet's amber blips and
    // from the hospital ship's near-white "#eaf4ff".
    radarColor: "#ff9a4a",
    tracerColor: 0xffb04a,      // inherited; nothing on this hull fires
    explosionColor: 0xffa348
  });

  ctx.addShipModel("rescueVessel", {
    build(env) {
      const { geometry, add, friendly, makeAircraftMaterial,
              deck, house, dark, light, markings, extraMaterials } = env;

      // The five themed materials are hull grey / deck grey / house grey /
      // shadow / white, and none of them can supply high-visibility orange, so
      // the two identity paints are made here and MUST go into extraMaterials
      // or they leak with every hull that sinks (the payload contract's one
      // documented leak path).
      //
      // Consequence: parts painted with these do NOT flash white on a hit, the
      // same trade the cargo ship's containers make. The grey/white hardware
      // under them still flashes, and this ship is not supposed to be shot at.
      //
      // Orange is emissive-boosted for the reason the hospital ship's white is:
      // makeAircraftMaterial's default emissive is 0.045x the colour, which
      // lets a saturated hue sink to brown under the night maps' weak ambient.
      // "Visible at sea in bad light" is literally what the paint is for, so it
      // gets 0.26x. baseEmissive must be updated with it, otherwise
      // updateAircraftFlash writes the dim default back when a hit flash decays.
      const orange = makeAircraftMaterial(friendly ? 0xff8a2b : 0xf07a1e, 0.05, 0.72);
      orange.emissive.setHex(friendly ? 0xff8a2b : 0xf07a1e).multiplyScalar(0.26);
      orange.userData.baseEmissive = orange.emissive.clone();
      extraMaterials.push(orange);
      // Superstructure white. Diffuse rather than metallic for the same
      // night-legibility reason, one notch dimmer than the orange so the
      // two-tone band has a clear boundary instead of two glowing slabs.
      const white = makeAircraftMaterial(0xf3f7f9, 0.0, 0.9);
      white.emissive.setHex(0xf3f7f9).multiplyScalar(0.2);
      white.userData.baseEmissive = white.emissive.clone();
      extraMaterials.push(white);

      // =====================================================================
      // 1. Hull — 110m, orange, beamy
      // =====================================================================
      // Core slab: 92m long, 18m beam, freeboard 8.4m (waterline y 0 to deck
      // plane y 8.4). Runs z -38 to +54; it STOPS at the bow wedge's base so
      // the wedge is the actual stem, the same construction the arsenal ship
      // documents (a slab running past the wedge leaves a squared-off block
      // with a triangle recessed in it).
      add(geometry.panel, orange, 0, 4.2, 8, 18, 8.4, 92);
      // Boot topping: the dark waterline band every hull here wears. Kept thin
      // (1.6m of 8.4m freeboard) so it reads as a stripe and does not eat into
      // the orange the identity depends on.
      add(geometry.panel, dark, 0, 0.7, 8, 18.5, 1.6, 92.5);
      // Bow wedge. geometry.shipBow is a FOUR-SIDED cone whose scale is a
      // RADIUS, not a width: sx is the half-beam of its base and sy is its run
      // along -Z once it is laid down by rx = -PI/2. The frigate calibrates it —
      // a 15.8m hull carries sx 7.9, exactly half — so this 18m hull wants
      // sx 9.0 to meet the slab flush. sy 18 puts the tip at z -56, and a
      // salvage ship gets a BLUFF entry (18m of run on a 9m half-beam, 2:1)
      // rather than the frigate's fine 16.6-on-7.9 knife: it is built to hold
      // station in a sea, not to sprint.
      //
      // The wedge is the ONLY thing forward of z -38. Round 1 of this file also
      // put a full-width orange box there "to back the cone up", which produced
      // a squared-off orange shelf with a triangle recessed into it — exactly
      // the failure the arsenal hull's comments warn about. The cone's own base
      // sits at z -38 and meets the slab flush, so nothing else is needed.
      //
      // sz is NOT the hull's full height. Measured across the six hulls already
      // in index.html the ratio is fixed: sx is exactly the half-beam on every
      // one of them, and sz is about 0.5 of the hull-box height (aegis 5/9,
      // frigate 4.2/7.5, hospital 11/22). Round 2 of this file used sz 8.4 —
      // the FULL freeboard, i.e. a 16.8m tall cone on an 8.4m hull — and the
      // stem came out as an arrowhead standing well above and below the
      // topsides.
      //
      // Round 3 then showed the OTHER half of the problem: ConeGeometry(1,1,4)
      // puts its four base vertices at local (0,+r),(+r,0),(0,-r),(-r,0), so
      // after rx=-PI/2 the section is a DIAMOND standing on a corner — it is
      // full beam only on the centreline of its height, and it tapers to a
      // point at the deck line. A wedge alone therefore leaves a triangular
      // void under the forecastle and reads in profile as a spike below the
      // sheer. The fix is the two-piece stem every blunt-bowed hull here uses:
      // a SHORT wedge for the underwater entry, plus a raked slab above it that
      // carries the topsides forward to the stem head.
      add(geometry.shipBow, orange, 0, 3.4, -44, 9.0, 12, 3.4, -Math.PI / 2);
      // Second wedge, up at the sheer and NARROWER (sx 6.4 against the hull's
      // 9), tucked into the top of the raked slab. It is what turns the stem
      // from a brick into a point: the slab alone gave the front three-quarter
      // a flat square nose (round 5), because a raked box is still a box when
      // you look at its corner. Two wedges stacked - one at the waterline, one
      // at the deck edge - taper the bow in plan at both heights the eye reads.
      add(geometry.shipBow, orange, 0, 8.0, -45, 6.4, 12, 2.8, -Math.PI / 2);
      // Raked stem: a full-height orange slab from the hull box out to z -50,
      // tipped forward about X so its top edge overhangs its foot. The rake is
      // SMALL (-0.16, about 9 degrees). Round 4 used -0.32 and stacked a second
      // raked bulwark on top of it, and the two overhangs compounded into a
      // duck-bill hanging several metres past the stem in profile. One modest
      // rake on the slab, with the bulwark above it kept vertical, gives the
      // flare without the beak.
      add(geometry.panel, orange, 0, 5.0, -42.0, 17.4, 9.2, 9, -0.16);
      // Flared forecastle bulwark: a solid orange rail round the foredeck,
      // carried forward to the stem head so the front quarter view shows one
      // continuous orange sheer instead of a rail that stops in mid-air (which
      // is what round 3 showed). Vertical, and stopping at z -46 — just inboard
      // of the stem slab's own top edge, so the bulwark never becomes the
      // ship's foremost point.
      add(geometry.panel, orange, -8.6, 10.6, -28, 1.0, 4.4, 28);
      add(geometry.panel, orange, 8.6, 10.6, -28, 1.0, 4.4, 28);
      add(geometry.panel, orange, 0, 10.6, -41.5, 16, 4.4, 1.2);
      // Transom: flat cut stern under the helideck.
      add(geometry.panel, orange, 0, 4.2, 52, 17, 8.4, 6);
      add(geometry.panel, dark, 0, 4.6, 55.3, 15, 6.4, 1.0);

      // =====================================================================
      // 2. Working deck
      // =====================================================================
      // Flush deck plane at y 8.4, deliberately DARK against the orange sides:
      // a salvage ship's after deck is bare steel, and the contrast is what
      // makes the orange read as HULL SIDES rather than as a solid orange brick
      // from above. (The hospital ship goes the other way and keeps its deck
      // near-white; that difference is itself part of the separation.)
      add(geometry.panel, deck, 0, 8.7, 10, 17.4, 0.7, 94);
      // Deck edge coaming, low and dark, so the working deck reads as set into
      // a bulwark instead of floating on top of the hull.
      add(geometry.panel, dark, -8.5, 9.4, 14, 0.9, 1.4, 84);
      add(geometry.panel, dark, 8.5, 9.4, 14, 0.9, 1.4, 84);
      // Deck cargo the crane is there to move: two lashed-down containers and a
      // rescue-boat cradle on the port side, forward of the crane. Small enough
      // not to compete with the boom, but they stop the working deck from being
      // 40m of nothing and they explain the crane.
      add(geometry.panel, dark, -4.4, 10.6, -6, 5.0, 3.6, 11);
      add(geometry.panel, white, 5.0, 10.4, -8, 3.6, 3.2, 8);
      // Fast rescue boat on its davit, starboard side forward — an orange hull
      // in a cradle, canted. The one small orange object above the deck line,
      // which ties the topsides back to the hull colour.
      add(geometry.panel, dark, 7.6, 10.4, 14, 1.6, 3.4, 9);
      add(geometry.panel, orange, 8.4, 12.6, 14, 2.6, 2.0, 8, 0, 0, -0.12);

      // =====================================================================
      // 3. Forward superstructure — WHITE, and only here
      // =====================================================================
      // Set forward (z -30..-4) so the after half of the ship is clear for the
      // crane and the pad. That is the offshore-vessel layout and the opposite
      // of the hospital ship, whose block sits amidships and runs 150m.
      // Three tiers, stepped back, topping out at y 24.6 — about a fifth of the
      // hull length, so the ship stays low and wide rather than tower-like.
      add(geometry.panel, white, 0, 12.6, -17, 16, 8.4, 26);
      add(geometry.panel, white, 0, 19.2, -20, 13, 4.8, 18);
      add(geometry.panel, white, 0, 23.4, -22, 10, 3.6, 12);
      // Bridge windows: one dark band wrapping the front and the two forward
      // corners of the top tier. A rescue ship's bridge overlooks its own bow,
      // so the glass is the front face, not a slit.
      add(geometry.panel, dark, 0, 23.8, -28.1, 9.6, 2.4, 0.5, -0.18);
      add(geometry.panel, dark, -5.1, 23.8, -24, 0.5, 2.4, 8);
      add(geometry.panel, dark, 5.1, 23.8, -24, 0.5, 2.4, 8);
      // Tier roof edges, dark, so white-on-white steps read without relying on
      // shadow. Thin strakes only — a full plate would black out the roofs from
      // directly above and cost the white/orange two-tone its top half.
      add(geometry.panel, dark, 0, 16.9, -17, 16.3, 0.5, 26.3);
      add(geometry.panel, dark, 0, 21.7, -20, 13.3, 0.5, 18.3);
      // Mast on the bridge roof: a short pole with a search radar plate and a
      // whip, kept to y 33 so it does not out-reach the crane boom (y 34).
      add(geometry.shipCylinder, dark, 0, 27.6, -20, 0.34, 4.8, 0.34);
      add(geometry.shipOctPlate, light, 0, 30.4, -20, 2.4, 0.4, 2.4);
      add(geometry.shipCylinder, dark, 0, 32.0, -20, 0.2, 3.2, 0.2);
      // Funnel pair, low, flanking the after face of tier 1 — smokeOffset -12
      // above is pinned to these.
      add(geometry.panel, white, -4.6, 18.6, -8, 3.2, 5.2, 5);
      add(geometry.panel, white, 4.6, 18.6, -8, 3.2, 5.2, 5);
      add(geometry.panel, dark, -4.6, 21.4, -8, 3.5, 0.9, 5.3);
      add(geometry.panel, dark, 4.6, 21.4, -8, 3.5, 0.9, 5.3);
      // Two searchlights on the bridge wings, pointed outboard-forward: the
      // small hardware that says "this ship looks for people at night".
      add(geometry.shipCylinder, light, -6.6, 18.0, -28, 0.9, 1.0, 0.9, Math.PI / 2, 0, 0);
      add(geometry.shipCylinder, light, 6.6, 18.0, -28, 0.9, 1.0, 0.9, Math.PI / 2, 0, 0);

      // =====================================================================
      // 4. The crane — the tallest thing aboard
      // =====================================================================
      // Pedestal on the centreline at z +2, immediately abaft the deck house,
      // so the boom's arc covers the whole working deck and the helideck edge.
      // A 7m drum standing 9m above the deck: heavy enough to look like it
      // could lift, and the base of the diagonal that follows.
      add(geometry.shipCylinder, house, 0, 13.4, 2, 3.5, 9.2, 3.5);
      add(geometry.shipCylinder, dark, 0, 18.3, 2, 3.8, 0.7, 3.8);
      // Slewing house on top — a proper machinery box, not a cap: 7m wide and
      // 8m long, so the crane has a mass at its root and the boom looks like it
      // is hinged off something rather than glued to a pole.
      add(geometry.panel, house, 0, 21.0, 2, 7.0, 5.0, 8.0);
      add(geometry.panel, dark, 0, 23.7, 2, 7.4, 0.6, 8.4);
      // The A-frame the boom pivots against. Its legs are splayed FORE AND AFT
      // (one raked forward, one aft) rather than athwartships, which is the one
      // arrangement that gives the crane an outline in the pure side view — the
      // view that looks straight down the boom's own axis and therefore cannot
      // see the arm at all. Rounds 2-4 splayed them across the beam and the
      // side view showed a plain vertical post that read as a mast.
      add(geometry.panel, house, 0, 27.4, -1.6, 2.6, 9.6, 1.4, -0.26, 0, 0);
      add(geometry.panel, house, 0, 27.4, 6.0, 2.6, 9.6, 1.4, 0.26, 0, 0);
      // Head beam bridging the two legs, and a cross brace halfway down: the
      // triangle is what makes it an A-frame instead of two poles.
      add(geometry.panel, dark, 0, 32.0, 2.2, 3.4, 1.4, 3.0);
      add(geometry.panel, dark, 0, 26.6, 2.2, 2.0, 0.7, 7.6);
      //
      // ---- The boom ---------------------------------------------------------
      // Root at (x 0, y 23) on the slew house, tip at (x 20, y 36) out over the
      // STARBOARD rail: a boom lying along the centreline is invisible in the
      // top-down view (it hides inside the ship's own outline), and the plan
      // view showing an arm reaching off the side of the hull is the whole
      // point of the feature.
      //
      // SIGN: `add` applies rotation.set(rx, ry, rz) with no ordering trick, so
      // rz is a roll about +Z and a POSITIVE rz swings the box's +x end UP.
      // Round 1 used rz -0.70 with segment centres computed for an upward lean,
      // which laid the boom flat across the deck and buried it in the hull —
      // the arm was simply not there in any of the four views.
      //
      // ELEVATION + SLEW. Round 5's boom lay entirely in the X-Y plane, and the
      // pure SIDE view looks straight down that plane's normal: the arm was
      // unmistakable in the front three-quarter and the top-down and reduced to
      // a stub in the side, where the crane went on reading as a mast. A real
      // ship's crane is almost never square to the beam, so the fix is also the
      // realistic one — slew it 34 degrees aft as well as elevating it, and the
      // boom then has extent along all three axes and cannot be edge-on to any
      // of the four camera positions.
      //
      // `add` calls rotation.set(rx, ry, rz), i.e. three.js' default XYZ Euler
      // order, which composes as Rx*Ry*Rz — so rz elevates the box's +x axis
      // first and ry then yaws the already-elevated arm about the vertical.
      // With rz 0.576 and ry -0.6 the unit +x axis lands on
      // (0.692, 0.545, 0.474), and every centre below is root + t*that, so no
      // piece can drift off the line:
      //   root (0, 23, 2)   t=0
      //   tip  (16.6, 36.1, 13.4)   t=24
      // The tip is 16.6m outboard of the centreline on an 18m beam — 7.6m past
      // the starboard rail — and 11m aft of the pedestal, which is the diagonal
      // the plan view needs and the profile the side view needs.
      //
      // Both spans are painted `light` (near-white) rather than `house` grey:
      // the boom has to win the contrast fight against the white superstructure
      // behind it as well as against the dark deck below.
      const boomEl = 0.576;
      const boomYaw = -0.6;
      // Inboard heel section — thick, t 0 -> 8.
      add(geometry.panel, light, 2.77, 25.18, 3.89, 9.6, 2.6, 2.6, 0, boomYaw, boomEl);
      // Main span — t 8 -> 24, one piece so it has no seams.
      add(geometry.panel, light, 11.07, 31.71, 9.58, 17.6, 1.9, 1.9, 0, boomYaw, boomEl);
      // Head sheave block at the tip.
      add(geometry.panel, dark, 16.61, 36.07, 13.36, 2.6, 2.6, 2.6, 0, boomYaw, boomEl);
      // Lattice cross-bracing: five short struts spaced along the span, each
      // centred on the boom line and rolled off it, so the arm reads as an open
      // truss rather than a solid bar at mid range.
      const braceAt = [
        [2.77, 25.18, 3.89], [5.54, 27.36, 5.79], [8.31, 29.54, 7.68],
        [11.07, 31.71, 9.58], [13.84, 33.89, 11.47]
      ];
      braceAt.forEach((p, i) => {
        add(geometry.panel, dark, p[0], p[1], p[2],
            3.2, 0.5, 0.5, 0, boomYaw, boomEl + (i % 2 ? 1.05 : -1.05));
      });
      // Backstay pendant from the A-frame head (0, 32, 2.2) out to the boom's
      // mid-span: the taut line that tells the eye the arm carries its weight.
      add(geometry.panel, dark, 5.5, 31.9, 5.9, 12.4, 0.4, 0.4, 0, -0.62, 0.0);
      // Hook block on its fall, hanging free off the tip. The fall is a thin
      // vertical bar down to y 17, so the hook reads as "raised and stowed"
      // rather than as a spike through the sea, and because the tip is 7.6m
      // outboard of the rail the whole thing hangs over open water — which is
      // the read that says "this ship lifts people out of the sea".
      add(geometry.panel, dark, 16.61, 27.0, 13.36, 0.32, 18.0, 0.32);
      add(geometry.panel, dark, 16.61, 17.4, 13.36, 1.6, 2.6, 1.6);
      // Counterweight slab aft of the slew house — small, dark, and it balances
      // the boom visually so the crane does not look bolted on.
      add(geometry.panel, dark, -4.0, 21.4, 3.0, 4.4, 3.4, 4.0);

      // =====================================================================
      // 5. Helideck aft — a raised platform with a painted H
      // =====================================================================
      // Pad plane at y 13.2, i.e. 4.8m above the working deck, standing on four
      // stanchions and overhanging the transom: an offshore helideck is a
      // separate structure cantilevered off the stern, not a painted rectangle
      // on the main deck. Centre z +42, 20m wide x 24m long, so it covers the
      // after fifth of the 110m hull and is the widest flat thing aboard —
      // wider than the 18m hull, which is what makes it read as a PAD from
      // above instead of as more deck.
      //
      // The 4.8m of air under it is the point. Round 2 had the pad only 2.2m
      // up, which put its edge level with the deck coaming and made the whole
      // stern read as one flat grey extension of the working deck in profile —
      // the helideck vanished in the two views that matter for identification
      // at range. Lifted clear, the side view shows a dark slab standing on
      // legs above an orange stern, which is unmistakable.
      add(geometry.panel, deck, 0, 12.9, 42, 20, 0.9, 24);
      // Orange perimeter band round the pad's edge, 0.4m proud of it on all
      // four sides. Two jobs: it ties the pad back to the hull's identity
      // colour (so the after third is not a grey slab on an orange ship), and
      // in the side and rear views it draws the pad's outline against the dark
      // deck, which is the difference between "a platform" and "a smudge".
      add(geometry.panel, orange, -10.0, 13.0, 42, 1.0, 1.2, 24.8);
      add(geometry.panel, orange, 10.0, 13.0, 42, 1.0, 1.2, 24.8);
      add(geometry.panel, orange, 0, 13.0, 53.8, 20.8, 1.2, 1.0);
      add(geometry.panel, orange, 0, 13.0, 30.2, 20.8, 1.2, 1.0);
      // Stanchions under the four corners, plus the two amidships legs a
      // cantilever this size needs.
      for (const sx of [-8.2, 8.2]) {
        for (const sz of [32, 42, 52]) {
          add(geometry.shipCylinder, house, sx, 10.9, sz, 0.55, 4.4, 0.55);
        }
      }
      // Safety net skirt: a thin dark lip round three sides of the pad, canted
      // down and outboard. The overhang is what separates a helideck from a
      // helipad in one glance.
      add(geometry.panel, dark, -10.4, 12.6, 42, 2.0, 0.35, 24, 0, 0, 0.42);
      add(geometry.panel, dark, 10.4, 12.6, 42, 2.0, 0.35, 24, 0, 0, -0.42);
      add(geometry.panel, dark, 0, 12.6, 54.4, 20, 0.35, 2.0, -0.42);
      // The landing circle, painted with the same shockRing every flight deck
      // in the game uses, laid flat on the pad.
      add(geometry.shockRing, markings, 0, 13.35, 42, 7.4, 7.4, 1, -Math.PI / 2);
      // ---- The H ------------------------------------------------------------
      // Drawn as three painted bars rather than a texture: at this size a decal
      // canvas would cost a material, a texture and a dispose contract for
      // something three boxes do exactly. Each bar is a flat plate 0.28m proud
      // of the pad (above the ring at 10.75 so it wins the z-fight), and the
      // proportions are the real marking's — two uprights 8m long, a crossbar
      // 5.2m spanning between them at half height.
      //
      // The H is oriented so its uprights run FORE AND AFT, which is how a real
      // helideck paints it (the pilot approaches over the stern), and which is
      // also the orientation that survives the top-down preview view.
      add(geometry.panel, markings, -2.6, 13.5, 42, 1.5, 0.3, 8.0);
      add(geometry.panel, markings, 2.6, 13.5, 42, 1.5, 0.3, 8.0);
      add(geometry.panel, markings, 0, 13.5, 42, 5.2, 0.3, 1.5);
      // Perimeter lighting: four small white plates at the pad corners, the
      // last hardware that says "aviation" from directly above.
      for (const sx of [-9.2, 9.2]) {
        for (const sz of [33, 51]) {
          add(geometry.panel, light, sx, 13.5, sz, 1.0, 0.3, 1.0);
        }
      }

      // =====================================================================
      // 6. Livery details
      // =====================================================================
      // White sheer stripe along the top of the orange topsides, running the
      // full length of the hull box. It is what turns "an orange ship" into the
      // SAR two-tone: orange below, thin white line, white above.
      add(geometry.panel, white, -9.15, 7.6, 8, 0.3, 1.4, 92);
      add(geometry.panel, white, 9.15, 7.6, 8, 0.3, 1.4, 92);
      // Diagonal high-visibility flash on each bow, the international rescue
      // marking: one broad white slash raked across the orange forward
      // topsides, set 0.2m proud of the side so it never z-fights.
      //
      // Two parallel slashes rather than one: a single plate rotated about X
      // came out reading as a "7" against the sheer stripe above it (rounds 2
      // and 3), because the stripe supplied a horizontal bar the slash then
      // hung off. A pair of thinner strokes cannot make that letter, and the
      // doubled diagonal is closer to the real marking anyway. Height 6.4
      // against the 8.4m topsides keeps both ends of each slash on the orange.
      for (const side of [-1, 1]) {
        add(geometry.panel, white, side * 9.25, 4.2, -30, 0.3, 6.4, 2.4, 0.5);
        add(geometry.panel, white, side * 9.25, 4.2, -24, 0.3, 6.4, 2.4, 0.5);
      }
      // Hull name band aft on each side — a dark plate standing in for
      // lettering. Small; the point is that the eye finds SOMETHING between the
      // white sheer stripe and the boot topping so the orange slab has scale.
      add(geometry.panel, dark, -9.2, 5.6, 34, 0.3, 1.6, 14);
      add(geometry.panel, dark, 9.2, 5.6, 34, 0.3, 1.6, 14);
    }
  });
}
