// Tu-22M3 BACKFIRE: an Elem-side supersonic strategic bomber, enemy-only.
//
// Registers exactly three things - the airframe entry, the enemy AI profile and
// the 3D model with its HUD outline. It adds no mission, no wave, no campaign
// edit and no hangar entry, and it does not touch index.html.
//
// The Backfire sits between the two heavies already in the roster: it is a jet
// like the B-52 but flies fast and low like a fighter, and it is Russian like
// the Tu-95 but has no propellers anywhere. Its read is the variable-geometry
// wing on a cigar fuselage with two enormous box intake trunks running down the
// flanks - nothing else in the game has that.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;
  const bear = AIRCRAFT_TYPES.tu95;
  const bearAI = ENEMY_AI_PROFILES.tu95;
  if (!bear || !bearAI) {
    throw new Error("[tu22m3] expected the tu95 aircraft and AI templates");
  }

  // Elem palette, taken from the Tu-95's so the two Russian heavies read as one
  // air force. The accent is darkened a shade because on this airframe it paints
  // the two full-length intake trunks rather than four propeller nacelles, and
  // those have to separate from the primary-grey body along their whole run.
  const theme = {
    primary: 0x9aa3a8,
    secondary: 0x646d74,
    accent: 0x39424a,
    canopy: 0xa8e4ff,
    exhaust: 0xffc47a,
    // 42.4 m against the Tu-95's 49.5 m at scale 2.3 -> 1.97. Rounded to 1.95,
    // which puts it a clear step below both heavies (B-52 2.2, Tu-95 2.3) and
    // well above every fighter (0.74 - 1.16), exactly as the real sizes rank.
    scale: 1.95,
    variant: "tu22m3"
  };

  // BALANCE TODO: placeholder. Every flight-model number below is the Tu-95's,
  // spread through unchanged - the Backfire should end up markedly faster and
  // less durable than the Bear, but that is a tuning pass, not this delivery.
  ctx.addAircraft("tu22m3", {
    ...bear,
    id: "tu22m3",
    label: "Tu-22M3 BACKFIRE",
    role: "Supersonic Strategic Bomber",
    tag: "ENEMY",
    enemyOnly: true,
    blurb: "エレム軍の超音速戦略爆撃機。可変後退翼と胴体脇の巨大なインテークが特徴で、市街・艦隊への長距離攻撃を担う。尾部銃座を備える。",
    // Half-span at full spread: 34.3 m of real wingspan against the Bear's
    // 50.1 m, corrected for the two aircraft's different theme scales, so the
    // contrail leaves the geometric tip of the modelled wing.
    tipSpan: 10.6,
    tipZ: 2.2,
    theme
  }, { order: false });

  // BALANCE TODO: placeholder. The Tu-95's armored heavy-bomber AI, spread
  // unchanged apart from the two numbers that would otherwise be visibly wrong
  // on a different-sized model: the hitbox and the tail turret's position.
  ctx.addEnemyProfile("tu22m3", {
    ...bearAI,
    hitboxScale: 2.4,
    // Local z of the turret (12.4) times this model's scale (1.95).
    rearGunOffset: 24,
    theme
  });

  ctx.addAircraftModel("tu22m3", {
    // Top view, nose up, in the same 40x44 box every inline outline uses. Drawn
    // at the mid-sweep the model is built at. Reading down: a long pointed nose,
    // the flanks bulging out where the intake trunks start, the broad glove
    // shoulders, the swept outer panels, then the tail with one big fin behind
    // the swept stabilators. The narrow waist between the glove and the tail is
    // what tells it apart from the B-52's straight slab at this size.
    silhouette: "M20 2 L22 7 L22.5 13 L25 15 L25 20 L36 31 L36 34 L25 26 L25 30 L29.5 35 L29.5 38 L23 36.5 L23 40 L24.5 43 L15.5 43 L17 40 L17 36.5 L10.5 38 L10.5 35 L15 30 L15 26 L4 34 L4 31 L15 20 L15 15 L17.5 13 L18 7 Z",
    build(env) {
      const { geometry, extrudedSurface, add, addWingPivot, addFlame,
              primary, secondary, accent, canopy, dark, light, navL, navR } = env;

      // ---- Outer wing panel -------------------------------------------------
      // ONE side only (+x) with its inboard edge on the pivot line, the contract
      // wingTomcat and wingFlogger both follow, because each panel is parented
      // to its own rotating group rather than being one mirrored mesh. Drawn at
      // the intermediate sweep the real aircraft cruises at, which on a
      // 26-unit-long body means a leading edge that rakes 4.4 of z across 5.4 of
      // span - a hard 40 deg, twice the Tomcat panel's rake, because a bomber
      // wing at cruise sweep is not a fighter wing at full spread.
      // Reaching x 7.0 off a pivot at x 3.6 gives the 10.6 half-span the
      // airframe entry's tipSpan promises.
      const wingBackfire = extrudedSurface([
        [0.2, -1.9], [1.4, -1.5], [7.0, 4.2], [7.0, 5.2], [1.6, 2.4], [0.2, 2.4]
      ], 0.3);

      // Swept stabilators, cut to the same sweep line as the wing so the tail
      // reads as one design with it - the Bear does the same thing with stabBear.
      // Deliberately short-span (5.0 against the wing's 10.6 half-span) so it
      // can never be mistaken for a second wing from above.
      const stabBackfire = extrudedSurface([
        [0, -1.3], [5.0, 2.1], [5.0, 3.0], [1.5, 2.5],
        [-1.5, 2.5], [-5.0, 3.0], [-5.0, 2.1]
      ], 0.28);

      // ---- Fuselage ---------------------------------------------------------
      // A long cigar in three sections, near-constant in width the whole way.
      // The Bear tapers to a slim tail cone; this one stays fat back to the
      // turret because the two engines live inside it, and that fullness aft is
      // half of what makes a Backfire look like a Backfire from the side.
      add(geometry.fuselage, primary, 0, 0, -3.2, 1.06, 1.0, 1.35);
      add(geometry.fuselage, primary, 0, 0, 6.0, 1.1, 1.04, 1.05);
      // Blunt, fat forebody rather than a needle. The shared cone is scaled 1.06
      // wide against 0.9 long, so it reads as a rounded radome on the front of
      // the tube instead of the fighter spike every other variant carries - the
      // Backfire has a metre-class radar dish behind that fairing.
      add(geometry.nose, primary, 0, -0.06, -11.0, 1.1, 1.0, 0.72);
      // Radome cap: a SPHERE, not a second cone. The cone tip is what made the
      // first two rounds read as a fighter spike; capping the taper with a
      // rounded dome at 0.86 radius is the only way to get a blunt Tupolev nose
      // out of primitives that are all pointed.
      add(geometry.canopy, dark, 0, -0.1, -12.0, 0.86, 0.8, 1.5);
      // Stepped flight deck behind it. Two crew rows, so the glazing runs long -
      // but it sits well forward on a 26-unit body, which is what says "bomber"
      // rather than "big fighter".
      add(geometry.canopy, canopy, 0, 0.72, -9.4, 0.62, 0.46, 1.7);
      add(geometry.panel, dark, 0, 0.9, -9.2, 0.44, 0.14, 0.16);

      // ---- Wing glove -------------------------------------------------------
      // The fixed inner wing: a single broad surface spanning both sides through
      // the fuselage, thick in chord and heavily raked. On the real aircraft the
      // glove is nearly as much wing as the moving panels are, and it is what
      // carries the silhouette when the wing is swept fully aft.
      // Widened to x 4.4 so it stands clear of the 1.72-offset intake trunks
      // instead of hiding inside them - a glove that does not visibly emerge
      // from the flank is not a glove.
      // The outboard trailing edge is cut FORWARD (z 1.9 at x 4.4 against 3.8 on
      // the centreline) so the moving panel emerges from behind it instead of
      // being buried inside it - with a square glove the two surfaces overlapped
      // and the wing read as a stub.
      const glove = extrudedSurface([
        [0, -4.8], [2.0, -4.6], [5.0, -1.2], [5.0, 2.2],
        [0, 4.2], [-5.0, 2.2], [-5.0, -1.2], [-2.0, -4.6]
      ], 0.5);
      add(glove, secondary, 0, -0.34, 0.2);

      // ---- Swing wings ------------------------------------------------------
      // Low-mounted, at y -0.3 rather than the MiG-23's shoulder height: the
      // Backfire's wing comes out of the bottom of the body, which is the third
      // read after the trunks and the length.
      // Pivot at x 3.6, outboard of the 3.5 outer face of the intake trunk, so
      // the panel root is clear of the duct rather than intersecting it.
      addWingPivot(wingBackfire, secondary, -1, -3.6, -0.4, -0.4);
      addWingPivot(wingBackfire, secondary, 1, 3.6, -0.4, -0.4);

      // ---- Intake trunks ----------------------------------------------------
      // The signature. Two enormous rectangular ducts bolted to the flanks,
      // starting level with the cockpit and running most of the way to the tail
      // - far longer than the MiG-23's or MiG-31's side boxes, which stop at the
      // wing root. Each is built from a long box for the trunk, a raked splitter
      // plate at its mouth and a shallower fairing on top that blends the duct
      // into the fuselage shoulder.
      for (const side of [-1, 1]) {
        // The trunk itself: 1.5 wide, 2.0 deep and 14.4 long, set out at x 2.05
        // so its inner face is clear of the 1.55-radius fuselage and its outer
        // face stands at x 2.8. That width is the whole read - at 0.92 it was a
        // dark stripe painted on the body; at 1.5 it is a duct bolted to it.
        // Mouth at z -5.4, tail end at z 7.2: the duct starts BEHIND the cockpit
        // and runs most of the way to the nozzles, which is the direction that
        // matters. Reaching forward past the canopy (the first attempt's z -6.6
        // mouth) made the aircraft read nose-heavy and hid the forebody; running
        // it back past the stabilator root turned the whole tail into one black
        // brick from the side, so it stops short of them.
        // 2.3 wide against the fuselage's 1.7 radius and set out at x 2.35, so
        // the duct spans x 1.2 - 3.5 and reads as a BOX beside the body from
        // directly above. At 1.5 wide it was a sliver; the trunks are the
        // identification, so they get the width the real aircraft's do.
        add(geometry.panel, accent, side * 2.35, -0.2, 0.9, 2.3, 2.1, 12.6);
        // Raked intake mouth: the lip plate at the front of the duct, canted
        // outward so the front quarter shows a rectangular hole, not a flat end.
        add(geometry.panel, dark, side * 2.35, -0.2, -5.3, 2.36, 2.16, 0.5);
        add(geometry.panel, dark, side * 3.48, -0.2, -3.9, 0.2, 2.04, 3.6, side * -0.14);
        // Shoulder fairing blending the duct top into the spine, and the
        // boundary-layer splitter gap plate between duct and fuselage skin -
        // which is why the trunks stand off the body instead of merging with it.
        add(geometry.panel, secondary, side * 2.0, 0.98, 0.8, 1.5, 0.44, 11.2);
        add(geometry.panel, dark, side * 1.22, -0.2, -1.6, 0.14, 1.8, 8.0);
      }

      // ---- Tail -------------------------------------------------------------
      // ONE fin, tall and hard-swept, sitting on a dorsal fillet that runs
      // forward along the spine. The stabilators are set below and behind it.
      add(geometry.fin, secondary, 0, 0.66, 6.8, 1.2, 2.0, 1.65);
      add(geometry.panel, secondary, 0, 0.92, 3.6, 0.36, 0.5, 5.4);
      // Stabilators AHEAD of the nozzles at z 8.6, not out past them - on the
      // real aircraft they sit on the sides of the engine bay, and pushing them
      // any further aft is what made them read as a second wing.
      add(stabBackfire, primary, 0, -0.2, 8.6, 1.0, 1, 1.0);

      // ---- Engines ----------------------------------------------------------
      // Twin nozzles side by side in the tail, close-coupled at +/-0.86 - the
      // two engines are buried in the aft fuselage and exhaust through a single
      // flat tail face, which is why there are no nacelles anywhere on this
      // aircraft. Afterburners: this is the only heavy in the game with them.
      add(geometry.rearBody, secondary, -0.86, -0.1, 9.4, 0.9, 0.9, 1.3);
      add(geometry.rearBody, secondary, 0.86, -0.1, 9.4, 0.9, 0.9, 1.3);
      add(geometry.nozzle, accent, -0.86, -0.1, 11.3, 1.25, 1.25, 1.3);
      add(geometry.nozzle, accent, 0.86, -0.1, 11.3, 1.25, 1.25, 1.3);
      addFlame(-0.86, -0.1, 12.9, 1.15, 1.15);
      addFlame(0.86, -0.1, 12.9, 1.15, 1.15);

      // ---- Tail turret ------------------------------------------------------
      // At z 12.4, which is the rearGunOffset 24 in the AI profile divided by
      // this model's scale of 1.95 - so the cannon is visibly where the rounds
      // come from, exactly as on the B-52 and the Bear.
      add(geometry.panel, dark, 0, 0.34, 12.4, 0.8, 0.72, 1.2);
      add(geometry.missileBody, dark, -0.26, 0.34, 13.4, 0.5, 0.5, 0.5);
      add(geometry.missileBody, dark, 0.26, 0.34, 13.4, 0.5, 0.5, 0.5);

      // ---- Details ----------------------------------------------------------
      // Anti-glare panel ahead of the windscreen, a ventral store on the
      // centreline recess (the Kh-22 the aircraft exists to carry), and nav
      // lights on the GLOVES rather than the tips, because the tips move.
      add(geometry.panel, dark, 0, 0.48, -10.6, 0.5, 0.08, 1.9);
      add(geometry.missileBody, light, 0, -1.5, 0.4, 1.7, 1.7, 1.9);
      add(geometry.missileNose, dark, 0, -1.5, -3.6, 1.6, 1.6, 1.6);
      // Nav lights on the GLOVE tips at x 5.0, not the wing tips - the tips move.
      add(geometry.canopy, navL, -5.0, -0.32, -0.6, 0.16, 0.16, 0.16);
      add(geometry.canopy, navR, 5.0, -0.32, -0.6, 0.16, 0.16, 0.16);
    }
  });
}
