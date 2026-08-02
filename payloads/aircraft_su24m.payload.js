// Su-24M FENCER - Elem front-line bomber (enemy-only, low-level strike).
//
// Scope: one airframe. AIRCRAFT_TYPES entry, ENEMY_AI_PROFILES entry, an
// ENEMY_MISSILE_PROFILES entry for its short-range self-defence round, the 3D
// model and the HUD outline. No missions, no waves, no hangar entry.
//
// Everything numeric outside the geometry is inherited from the Su-25's
// entries, because a low-level strike aircraft is the same KIND of opponent as
// the Frogfoot - it flies its line, it is not trying to win a merge - and the
// Fencer's own balance pass has not happened yet. Those values are marked
// BALANCE TODO and are placeholders, not statements about the aircraft.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES, ENEMY_MISSILE_PROFILES } = ctx.tables;
  const su25 = AIRCRAFT_TYPES.su25;
  const su25AI = ENEMY_AI_PROFILES.su25;
  const su25Missile = ENEMY_MISSILE_PROFILES.su25;
  if (!su25 || !su25AI || !su25Missile) {
    throw new Error("[su24m] expected the Su-25 aircraft / AI / missile templates to exist");
  }

  // Elem (Russian-side) palette: the same olive-over-grey the MiG-23 and Su-25
  // wear, so the Fencer reads as belonging to the same air force at a glance,
  // with the warm orange accent every Elem airframe here carries.
  const theme = {
    primary: 0x82887a,
    secondary: 0x555b4d,
    accent: 0xba5e2a,
    canopy: 0xa8e4ff,
    exhaust: 0xff9a42,
    // Set from the model's own drawn length, not by eye. The body below runs
    // z -13.2 (pitot) to +8.5 (nozzle) = 21.7 units, so 1.18 puts the Fencer
    // at 25.6 world units for its real 22.5 m = 1.14 units/m.
    //
    // The roster's existing ratios, measured the same way, are: MiG-23 1.04,
    // Su-25 1.18, Tu-95 1.34, F-16 1.37. 1.14 sits inside that band, and the
    // resulting lengths are the ones that matter: 25.6 against the F-16's
    // 20.5 (visibly bigger, as 22.5 m against 15 m should be) and against the
    // Tu-95's 66.5 (visibly a fraction of it, as 22.5 m against 49.5 m should
    // be). Cross-checked against the MiG-31, the roster's other 22.6 m
    // airframe, which lands at 25.4 - within 1% of this one.
    scale: 1.18,
    variant: "su24m"
  };

  ctx.addAircraft("su24m", {
    ...su25,
    id: "su24m",
    label: "Su-24M FENCER",
    role: "Variable-Geometry Strike",
    tag: "ENEMY",
    enemyOnly: true,
    blurb: "敵の可変翼前線爆撃機。並列複座の角張った機体で低空を這うように侵攻する。鈍重だが頑丈で、迎撃されるまで爆装を降ろさない。",
    // BALANCE TODO: placeholder. Every flight-model number below this line is
    // the Su-25's, inherited wholesale. A 1400 km/h swing-wing bomber is not a
    // 250 km/h CAS aircraft and these will not survive a balance pass.
    // Only the geometry-linked fields are authored here:
    //   tipSpan  9.35 = the pivot station (2.45) plus the panel's outboard edge
    //                   (6.9), so the contrail leaves the real tip rather than
    //                   floating inboard of it
    //   tipZ     3.45 = that tip's fore-aft station: the pivot sits at z 1.2 and
    //                   the panel's outboard edge spans z 1.5..3.0 on it
    tipSpan: 9.35, tipZ: 3.45,
    theme
  }, { order: false });

  ctx.addEnemyProfile("su24m", {
    ...su25AI,
    // BALANCE TODO: placeholder. Inherited from the Su-25's "armored" branch -
    // it flies a line and does not jink, which is the right shape for a strike
    // aircraft, but the envelope, the gun reach and the hit ceiling are all the
    // Frogfoot's and have not been tuned for a faster, larger target.
    radarColor: "#ff9a4a",
    tracerColor: 0xff8a3a,
    explosionColor: 0xff9d48,
    theme
  });

  ctx.addEnemyMissileProfile("su24m", {
    ...su25Missile
    // BALANCE TODO: placeholder. The Su-25's short-range self-defence round,
    // unchanged. The real aircraft carries R-60s for the same job, so the
    // template is at least the right class of weapon.
  });

  ctx.addAircraftModel("su24m", {
    // Top view, 40x44 box, nose up, traced off the model's own TOP cell so the
    // HUD outline and the aircraft agree. Four features carry it, in the order
    // they read:
    //   1. the long WIDE forebody (x 17.4..22.6 for a third of the length) -
    //      the side-by-side cockpit, and the only nose in the roster that does
    //      not pinch to a point,
    //   2. the intake boxes stepping OUT again at x 15.2/24.8, which no other
    //      outline here does - every other body narrows monotonically aft,
    //   3. two swept outer panels off the gloves, drawn at the spread setting,
    //   4. wide stabilators well aft, with the tail cone between them.
    // Against the MiG-23's outline (a spindle with wings) this is a plank.
    silhouette: "M20 1 L21.4 5 L22.2 9.5 L22.6 13 L22.6 16.5 L24.8 17.2 L24.8 25.5 L23 26 L23 27 L36.5 32.5 L36.5 36.5 L23 33 L23 34.5 L31.5 38 L31.5 41 L22.6 39 L22.6 40.2 L21 43 L19 43 L17.4 40.2 L17.4 39 L8.5 41 L8.5 38 L17 34.5 L17 33 L3.5 36.5 L3.5 32.5 L17 27 L17 26 L15.2 25.5 L15.2 17.2 L17.4 16.5 L17.4 13 L17.8 9.5 L18.6 5 Z",

    build(env) {
      const {
        geometry, extrudedSurface, primary, secondary, accent, canopy, dark, light,
        navL, navR, add, addWingPivot, addFlame
      } = env;

      // ---- Planforms authored for this airframe --------------------------
      // Outer wing panel, ONE side only (+x) with its inboard edge on the pivot
      // line - the same contract wingTomcat and wingFlogger follow, because each
      // panel hangs off its own rotating group. It reaches 6.9 out from the
      // pivot at x 2.45, so the tip lands at tipSpan 9.35 at the modelled
      // spread setting. The real Fencer's outer panel is bigger and much
      // squarer than a MiG-23's (17.6 m spread against 13.97 m): a deep,
      // near-constant chord and shallow rake, not a fighter's raked triangle.
      const wingSu24 = extrudedSurface([
        [0.2, -2.6], [1.1, -2.3], [6.9, 1.5], [6.9, 3.0], [1.5, 3.0], [0.2, 3.0]
      ], 0.3);
      // Fixed glove: the part of the wing that does NOT move. Drawn as one
      // full-span surface on the centreline (the stabRaptor / stabBear
      // contract), with a hard 45-deg leading-edge rake out to the hinge at
      // +/-2.45 and a straight trailing edge. Reaching a little past the hinge
      // (2.6) leaves no gap when the panel is drawn at spread.
      const gloveSu24 = extrudedSurface([
        [0, -3.4], [2.6, -1.0], [2.6, 3.0], [1.4, 3.2],
        [-1.4, 3.2], [-2.6, 3.0], [-2.6, -1.0]
      ], 0.32);
      // Stabilators: all-moving slabs, wide and low-swept, because a body this
      // broad needs a tail that reaches outside it. Drawn as ONE full-span
      // surface and added on the centreline (the stabRaptor / stabBear
      // contract) - adding it per side would draw two overlapping tailplanes.
      const stabSu24 = extrudedSurface([
        [0, -2.0], [6.4, 0.7], [6.4, 2.4], [1.8, 2.8],
        [-1.8, 2.8], [-6.4, 2.4], [-6.4, 0.7]
      ], 0.28);

      // ---- Slab-sided box fuselage ----------------------------------------
      // The Fencer is a welded box, and unlike the MiG-31 - which squares off a
      // `fuselage` CYLINDER with plates bolted to its flanks - there is no
      // cylinder here at all. A round core of radius 1.55 would poke through
      // any slab narrow enough to look like a Su-24's flat side, so the whole
      // body is boxes: one long centre section, flat top and flat belly, with
      // the flanks standing proud of both.
      add(geometry.panel, primary, 0, 0.0, 1.2, 3.0, 2.2, 9.8);
      add(geometry.panel, secondary, 0, 1.16, 1.2, 3.16, 0.26, 9.4);
      add(geometry.panel, secondary, 0, -1.14, 1.4, 3.1, 0.26, 8.8);
      add(geometry.panel, primary, -1.58, 0.0, 1.2, 0.24, 2.1, 9.4);
      add(geometry.panel, primary, 1.58, 0.0, 1.2, 0.24, 2.1, 9.4);

      // ---- Wide flat-sided forebody: the identification --------------------
      // Side-by-side seating makes the forward fuselage the WIDEST part of the
      // aeroplane ahead of the wing, and flat-sided with it. Where every other
      // airframe in the roster tapers a cone into a spindle, this one carries a
      // slab 3.24 wide against 2.0 tall for most of its length and only then
      // chisels down. That ratio, not the outline, is the whole read.
      //
      // Four boxes stepping down in width, and every step is SHALLOW: the plan
      // taper from 3.24 to 1.9 happens over 7 units of z. Cutting it faster (or
      // capping it with a long cone) puts a needle back on the front, which was
      // the first thing that went wrong here.
      add(geometry.panel, primary, 0, 0.02, -5.0, 3.24, 2.0, 4.0);
      add(geometry.panel, primary, 0, -0.02, -8.0, 3.0, 1.6, 2.2);
      add(geometry.panel, primary, 0, -0.06, -9.9, 2.5, 1.2, 1.8);
      add(geometry.panel, primary, 0, -0.1, -11.2, 1.9, 0.86, 1.0);
      // Chined flanks on the forebody, standing proud of the box so the flat
      // side reads as a surface with an edge on it rather than a plain slab.
      add(geometry.panel, secondary, -1.7, 0.02, -5.0, 0.24, 1.76, 3.8);
      add(geometry.panel, secondary, 1.7, 0.02, -5.0, 0.24, 1.76, 3.8);
      // Radome: a cone squashed WIDE (1.05 x) and FLAT (0.4 y) and, crucially,
      // SHORT (0.34 z = 1.4 units of cone). Anything longer puts a needle back
      // on the front of a top view that spent four boxes staying a plank, which
      // is the single mistake this forebody exists to avoid.
      add(geometry.nose, dark, 0, -0.1, -12.0, 1.05, 0.42, 0.34);
      // Stub pitot boom, for the same reason.
      add(geometry.panel, dark, 0, -0.1, -12.9, 0.09, 0.09, 0.55);

      // ---- Side-by-side cockpit --------------------------------------------
      // TWO canopies abreast at +/-0.86, not one on the centreline. Nothing
      // else in the roster does this: every other cockpit here is a single
      // bubble, tandem at most, so a pair of hoods sitting shoulder to shoulder
      // identifies the aircraft from directly above or in front. A centre rib
      // and a flat windscreen plate tie them into one glasshouse.
      add(geometry.canopy, canopy, -0.86, 1.06, -5.2, 0.74, 0.46, 1.4);
      add(geometry.canopy, canopy, 0.86, 1.06, -5.2, 0.74, 0.46, 1.4);
      add(geometry.panel, dark, 0, 1.08, -5.2, 0.14, 0.42, 2.6);
      add(geometry.panel, dark, 0, 0.76, -7.0, 2.5, 0.2, 0.7);
      // Anti-glare panel between the glass and the radome.
      add(geometry.panel, dark, 0, 0.6, -8.8, 2.1, 0.12, 2.9);

      // ---- Box intakes on the fuselage SIDES --------------------------------
      // Rectangular, vertical-sided, bolted flat to the flanks and running the
      // length of the mid-body. Bigger and further forward than the MiG-23's,
      // and outboard of the slab (x 2.15 against the flank at 1.58) so they
      // stand off the body as their own boxes rather than blending into it -
      // which is exactly how the real aircraft's look.
      //
      // Painted in `secondary`, not `accent`. A box this large in the warm
      // accent colour reads as a fuel tank strapped to the side rather than as
      // structure - it swamped the side view when it was tried. `accent` stays
      // where the rest of the roster puts it: on the intake LIP and the
      // nozzles, as a trim line rather than a mass.
      add(geometry.panel, secondary, -2.15, -0.24, 0.6, 0.86, 1.85, 6.8);
      add(geometry.panel, secondary, 2.15, -0.24, 0.6, 0.86, 1.85, 6.8);
      // Intake lips, then the dark faces inside them so they read as breathing.
      add(geometry.panel, accent, -2.15, -0.24, -2.86, 0.9, 1.9, 0.3);
      add(geometry.panel, accent, 2.15, -0.24, -2.86, 0.9, 1.9, 0.3);
      add(geometry.panel, dark, -2.15, -0.24, -2.6, 0.8, 1.72, 0.34);
      add(geometry.panel, dark, 2.15, -0.24, -2.6, 0.8, 1.72, 0.34);
      // Raked splitter plates standing outboard of each lip.
      add(geometry.panel, dark, -2.66, -0.24, -2.5, 0.16, 1.8, 1.4, 0.16);
      add(geometry.panel, dark, 2.66, -0.24, -2.5, 0.16, 1.8, 1.4, -0.16);

      // ---- Shoulder-mounted variable geometry -------------------------------
      // Fixed glove sitting ON TOP of the box at y 1.06 - shoulder height, on
      // the top deck and above the intakes rather than through them. This is
      // the third of the three features: the MiG-23 carries its gloves mid-body
      // on a spindle and the F-14 carries them at pancake level, so the same
      // swing-wing machinery reads differently on all three.
      //
      // The glove is drawn as its OWN raked planform rather than a plain box,
      // because that is what makes the variable geometry read: a fixed stub
      // with a hard leading-edge rake, and a separate panel hinged off its
      // outboard end. A rectangular glove (tried first) blends into the panel
      // and the whole wing comes out looking like one fixed trapezoid.
      add(gloveSu24, secondary, 0, 1.06, 1.2);
      // Hinge fairings over the pivot line - the visible seam between what
      // moves and what does not.
      add(geometry.panel, dark, -2.45, 1.2, 0.4, 0.3, 0.34, 3.4);
      add(geometry.panel, dark, 2.45, 1.2, 0.4, 0.3, 0.34, 3.4);
      // The panels themselves, each on its own pivot group at the glove's
      // outboard end. Same call the MiG-23 and F-14 branches make.
      //
      // ★ HOST GAP: the inline branches do `wingPivots.push(addWingPivot(...))`
      // - the helper only records the group in `parts`, it does NOT put it in
      // the sweep list. A payload is handed `addWingPivot` but not the
      // `wingPivots` array, so these two groups are built correctly, carry the
      // right `userData.sweepSide`, and are simply never driven by
      // updateWingSweep. The wing is modelled at its spread setting and stays
      // there. The fix is one line in the host (have addWingPivot push into
      // wingPivots itself, which is what every existing caller already does by
      // hand); this payload needs no edit when that lands.
      addWingPivot(wingSu24, secondary, -1, -2.45, 1.06, 1.2);
      addWingPivot(wingSu24, secondary, 1, 2.45, 1.06, 1.2);

      // ---- Twin engines buried in the rear box ------------------------------
      // Side by side inside the body, not in podded nacelles: the box is what
      // encloses them, and only the nozzles come out the back.
      add(geometry.rearBody, secondary, -0.8, -0.1, 6.0, 1.05, 1.05, 1.3);
      add(geometry.rearBody, secondary, 0.8, -0.1, 6.0, 1.05, 1.05, 1.3);
      add(geometry.nozzle, accent, -0.8, -0.1, 7.6, 1.25, 1.25, 1.25);
      add(geometry.nozzle, accent, 0.8, -0.1, 7.6, 1.25, 1.25, 1.25);
      addFlame(-0.8, -0.1, 9.0, 1.12, 1.12);
      addFlame(0.8, -0.1, 9.0, 1.12, 1.12);

      // ---- ONE fin, and the tail --------------------------------------------
      // A single tall fin on the centreline with a long dorsal fillet running
      // forward into the spine. Against the MiG-31 and the Flanker family -
      // twin canted fins - one big fin standing on a wide flat box is what the
      // Fencer looks like from astern.
      add(geometry.fin, secondary, 0, 1.18, 3.8, 1.05, 0.95, 1.05);
      add(geometry.panel, secondary, 0, 1.26, 1.4, 0.44, 0.3, 4.4);
      add(stabSu24, primary, 0, -0.3, 7.2);
      // Ventral strakes under the tail.
      add(geometry.panel, dark, -1.05, -1.5, 5.8, 0.16, 0.8, 2.4, 0.26);
      add(geometry.panel, dark, 1.05, -1.5, 5.8, 0.16, 0.8, 2.4, -0.26);

      // ---- Strike load ------------------------------------------------------
      // A bomber flies with something under it, and the Su-24's stores live on
      // the fixed structure - the swinging panels cannot carry pylons, which is
      // why the real aircraft's load hangs inboard under the gloves and belly.
      for (const side of [-1, 1]) {
        add(geometry.panel, dark, side * 1.1, -1.35, 1.4, 0.24, 0.42, 2.0);
        add(geometry.missileBody, light, side * 1.1, -1.72, 1.6, 1.3, 1.3, 1.25);
        add(geometry.missileNose, dark, side * 1.1, -1.72, -1.5, 1.25, 1.25, 1.15);
        add(geometry.panel, dark, side * 2.7, -0.9, 1.6, 0.24, 0.55, 1.8);
        add(geometry.missileBody, light, side * 2.7, -1.36, 1.8, 1.15, 1.15, 1.1);
        add(geometry.missileNose, dark, side * 2.7, -1.36, -0.9, 1.1, 1.1, 1.05);
      }

      // ---- Nav lights on the GLOVES -----------------------------------------
      // The tips move, so the lights go where they cannot: on the fixed glove,
      // the same choice the MiG-23 and F-14 branches make.
      // Placed at the glove's outboard LEADING corner and just ahead of the
      // hinge fairing rather than under it - an earlier placement at x 2.5 /
      // z -0.8 put both lamps inside the fairing box and neither was visible
      // from any of the four preview angles.
      add(geometry.canopy, navL, -2.62, 1.24, -0.6, 0.15, 0.15, 0.15);
      add(geometry.canopy, navR, 2.62, 1.24, -0.6, 0.15, 0.15, 0.15);
    }
  });
}
