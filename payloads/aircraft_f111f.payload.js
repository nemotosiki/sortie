// F-111F Aardvark — Sera (US-family) low-level strike / interdiction airframe.
//
// Delivered as ONE payload: flight-model entry, enemy AI profile, enemy missile
// profile, 3D airframe and HUD silhouette. Nothing here touches index.html,
// CAMPAIGNS, AIRCRAFT_ORDER or any existing table entry.
//
// Everything numeric on the flight model and the AI is inherited from the
// closest existing template and left alone — see the BALANCE TODO notes. The
// work in this file is the SHAPE.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES, ENEMY_MISSILE_PROFILES } = ctx.tables;

  const f14 = AIRCRAFT_TYPES.f14;
  const f14ai = ENEMY_AI_PROFILES.f14;
  const f14missile = ENEMY_MISSILE_PROFILES.f14;
  if (!f14 || !f14ai) {
    throw new Error("[f111f] expected the F-14D aircraft entry and enemy AI profile as templates");
  }

  // Sera livery: the same cool grey/blue family the F-14D and the rest of the
  // US-family airframes wear, one step darker because this one lives at 200 ft.
  const theme = {
    primary: 0x9aa6b2,
    secondary: 0x53616e,
    accent: 0x2a3742,
    canopy: 0x8fe0ff,
    exhaust: 0x8cecff,
    // 22.4 m airframe. `scale` is NOT read off the table's ladder directly,
    // because what ends up on screen is (model's own z-extent) x scale and the
    // models are not all the same length. Measured on the built geometry:
    //
    //   F-16     20.5 units x 1.00 = 20.5 on screen for 15.0 m
    //   F-14D    20.1        x 1.06 = 21.3            for 19.1 m
    //   MiG-31   21.9        x 1.16 = 25.4            for 22.7 m
    //   this     23.8        x 1.06 = 25.2            for 22.4 m
    //
    // 1.06 is the number that lands a 22.4 m aircraft level with the 22.7 m
    // MiG-31 and about 18% longer than the 19.1 m F-14D — which is the real
    // ratio. Reading 1.16 off the ladder would have made it the biggest
    // fighter in the game by a wide margin, because this model carries a much
    // longer nose than the airframes the ladder was fitted to.
    scale: 1.06,
    variant: "f111f"
  };

  // ---------------------------------------------------------------- 1. entry
  // Spread from the F-14D: the only other variable-geometry airframe in the
  // table, so every field that exists because of the swing wing already reads
  // correctly here.
  //
  // BALANCE TODO: placeholder. Every flight/damage/HP number below is the
  // F-14D's, unchanged. The F-111 is not an interceptor — it should end up
  // slower in a turn, tougher, and with a strike loadout rather than LASM —
  // but tuning it is a separate pass with the rest of the roster in view.
  // `spw` is a PLAYER contract (the special-weapon rack in the hangar), so it
  // is stripped rather than inherited — the same rule payloads/support_aircraft
  // applies to its enemy-only entries. Spreading the F-14D wholesale would
  // otherwise hand an enemy airframe a LASM loadout it has no way to use.
  const { spw: _playerOnlySpw, ...f14WithoutSpw } = f14;

  ctx.addAircraft("f111f", {
    ...f14WithoutSpw,
    id: "f111f",
    label: "F-111F AARDVARK",
    role: "Strike Interdictor",
    tag: "ENEMY",
    enemyOnly: true,
    blurb: "セラ軍の可変翼戦闘爆撃機。長い機首と並列複座を持つ低空侵攻機で、地形に張り付いて進入し、拠点や輸送列車を叩く。格闘戦の機体ではない。",
    // Where the contrail leaves the airframe, in MODEL units before scale (the
    // host multiplies by theme.scale). Taken off the built geometry rather
    // than off the real aircraft's 19.2 m span: the wing pivot sits at x 1.6
    // and the panel reaches 10.2 from there, so the drawn tip is at 11.8 and
    // its chord centre is 2.35 aft of the pivot's z of 0.2. Slightly inboard
    // of 11.8 so the ribbon starts on the panel, not off its edge.
    tipSpan: 11.5, tipZ: 2.35,
    theme
    // { order: false } — enemy-only airframe, kept out of the hangar list.
  }, { order: false });

  // ------------------------------------------------------------ 2. enemy AI
  // BALANCE TODO: placeholder. Spread from the F-14D profile; only the
  // readability fields (radar/tracer/explosion colour, hitbox for the bigger
  // hull, and the livery) are set here. Behaviour, ranges, fire timing and hit
  // chance are the Tomcat's and want a strike-aircraft pass later.
  ctx.addEnemyProfile("f111f", {
    ...f14ai,
    hitboxScale: 1.22,
    radarColor: "#ffb35c",
    tracerColor: 0xffab4d,
    explosionColor: 0xffbb6a,
    theme: { ...theme }
  });

  // Optional and minimal: the same launcher contract the Tomcat carries, so
  // this airframe can shoot back at all rather than being gun-only.
  // BALANCE TODO: placeholder — F-14D values verbatim.
  if (f14missile) {
    ctx.addEnemyMissileProfile("f111f", { ...f14missile });
  }

  // ------------------------------------------------------------- 3. airframe
  ctx.addAircraftModel("f111f", {
    // Top view, 40x44 box, nose up. The read is: a very long fine nose spike,
    // a smooth body that swells at the intakes, shoulder gloves whose trailing
    // edge runs unbroken into the tailplane, wings at mid sweep, one fin.
    // Deliberately narrower and MUCH longer-nosed than the tomcat path above
    // it, and with a single centreline fin instead of the Tomcat's two.
    silhouette:
      "M20 1 L20.8 9 L21.6 16 L22 19 L23.6 21 L23.6 24 " +
      "L36.5 31.5 L36.5 35.5 L23.6 30.5 L23.6 33.5 L30 38 L30 41 " +
      "L21.6 39 L21.6 41 L23 43 L17 43 L18.4 41 L18.4 39 " +
      "L10 41 L10 38 L16.4 33.5 L16.4 30.5 L3.5 35.5 L3.5 31.5 " +
      "L16.4 24 L16.4 21 L18 19 L18.4 16 L19.2 9 Z",

    build(env) {
      const {
        geometry, extrudedSurface,
        primary, secondary, accent, canopy, dark, light, navL, navR,
        add, addWingPivot, addFlame
      } = env;

      // Outer wing panel, ONE side only (+x) with its inboard edge on the
      // pivot line — the contract wingTomcat and wingFlogger follow, because
      // each panel is parented to its own rotating group. The biggest of the
      // three: the real F-111 spreads 19.2 m, wider than the Tomcat's 19.5 m
      // over a shorter body, so half-span 10.2 matches this airframe's tipSpan
      // and the tip is where the contrail leaves it.
      //
      // Drawn at a MID sweep (leading edge back 4.6 z over 8.6 of span, about
      // 28 deg) for the same reason the tomcat silhouette is: at the real
      // 16 deg spread the panel reads as an unswept plank next to the Su-25
      // already in the roster, and the whole point of a VG airframe is that it
      // looks like it is caught between two shapes.
      const wingAardvark = extrudedSurface([
        [0.2, -3.4], [1.6, -3.0], [10.2, 1.6], [10.2, 2.7], [2.2, 3.1], [0.2, 3.1]
      ], 0.3);

      // ---- Body ------------------------------------------------------------
      // Su-24 is a flat-sided box; this one must not be. Overlapping tapered
      // cylinders and nothing slab-sided anywhere is the whole difference —
      // the F-111 is a smooth area-ruled tube that swells at the intakes and
      // necks down at the tail. The three sections overlap in z by more than a
      // radius each so no step is visible from any angle.
      add(geometry.fuselage, primary, 0, 0, -2.4, 1.0, 0.94, 1.05);
      add(geometry.fuselage, primary, 0, -0.06, 3.6, 1.02, 0.9, 0.85);
      add(geometry.rearBody, secondary, 0, -0.12, 8.2, 1.05, 0.92, 1.0);
      // The Aardvark: a long, fine, drooped nose, but a NOSE and not a needle.
      // 0.72 radius over 6.0 z of cone is the sharpest taper on any airframe
      // here while still reading as a fuselage, and the -y is the real
      // aircraft's downward rake.
      add(geometry.nose, primary, 0, -0.14, -10.9, 0.86, 0.7, 1.4);
      // ONE long bridging section rather than a butt joint. `fuselage` is a
      // cone frustum (0.95 forward, 1.55 aft), so a single stretched copy runs
      // continuously from the cone's base out to the cockpit section without a
      // step anywhere — which is the "rounder and smoother than an Su-24" read
      // the whole airframe is built around. Three abutting short cylinders
      // would each show their own rim; one long one shows none.
      add(geometry.fuselage, primary, 0, -0.08, -7.4, 0.62, 0.56, 0.72);

      // ---- Cockpit ---------------------------------------------------------
      // SIDE-BY-SIDE, one piece. Every other two-seater in the game is tandem
      // (long in z, narrow in x); this one is the inverse — wide in x, short
      // in z — and that is the identification from the front and from above.
      // The escape-capsule shoulders under it carry the width down into the
      // body so the canopy does not look bolted on.
      // Escape-capsule shoulders first, then the glass ON TOP of them, so the
      // canopy is the highest thing on the forward body instead of being
      // swallowed by its own fairing.
      add(geometry.panel, primary, 0, 0.32, -4.6, 1.62, 0.9, 3.4);
      add(geometry.canopy, canopy, 0, 0.86, -4.9, 1.05, 0.56, 1.55);
      // Windscreen frame down the middle of the two-place glass.
      add(geometry.panel, dark, 0, 1.22, -4.9, 0.08, 0.2, 2.7);
      // Anti-glare panel running forward from the windscreen onto the spike.
      add(geometry.panel, dark, 0, 0.6, -7.4, 0.56, 0.1, 2.6);

      // ---- Shoulder gloves + swing wings -----------------------------------
      // Mounted HIGH on the body (y 0.62 against the Tomcat's 0.16), which is
      // the shoulder-wing read, and the fixed gloves are long in z because the
      // real wing tucks its whole span into them at 72.5 degrees.
      add(geometry.panel, secondary, -1.55, 0.5, 0.4, 1.9, 0.3, 5.4, 0.07);
      add(geometry.panel, secondary, 1.55, 0.5, 0.4, 1.9, 0.3, 5.4, -0.07);
      // Glove fairings blending into the spine, so the wing root is a curve
      // rather than a step — the smoothness the brief asks for against Su-24.
      add(geometry.canopy, secondary, -1.5, 0.44, -1.6, 0.95, 0.5, 2.4);
      add(geometry.canopy, secondary, 1.5, 0.44, -1.6, 0.95, 0.5, 2.4);
      // The pivots. Each outer panel hangs off its own group whose rotation.y
      // IS the sweep, and addWingPivot stamps userData.sweepSide so the sign
      // is right on both sides. Drawn at the deployed 16 deg spread.
      //
      // (Was a host gap: `wingPivots` is a local of createAircraftModel and is
      // not in the build env, so a payload could call the helper but not
      // register the result, and the panels sat at the modelled sweep. Fixed
      // in the host by having addWingPivot self-register — the option named
      // here — so this payload needed no edit.)
      addWingPivot(wingAardvark, secondary, -1, -1.6, 0.62, 0.2);
      addWingPivot(wingAardvark, secondary, 1, 1.6, 0.62, 0.2);

      // ---- Engines ---------------------------------------------------------
      // BURIED in the lower half of the fuselage: the nacelles sit at +/-0.86
      // (against the Tomcat's 2.05) and at y -0.42, so they read as part of
      // the body rather than as two separate tubes with a tunnel between them.
      // That single spacing choice is the F-111/F-14 tell from directly behind.
      add(geometry.rearBody, secondary, -0.8, -0.44, 7.4, 0.86, 0.82, 1.7);
      add(geometry.rearBody, secondary, 0.8, -0.44, 7.4, 0.86, 0.82, 1.7);
      // Quarter-round intakes tucked under the glove, canted outward at the
      // lip like the real Triple Plow inlets, with a rounded shock-cone
      // fairing on the outer face.
      add(geometry.intake, accent, -1.32, -0.3, -2.4, 1.05, 1.55, 1.7, 0.16);
      add(geometry.intake, accent, 1.32, -0.3, -2.4, 1.05, 1.55, 1.7, -0.16);
      add(geometry.canopy, accent, -1.36, -0.3, -4.1, 0.6, 0.72, 0.75);
      add(geometry.canopy, accent, 1.36, -0.3, -4.1, 0.6, 0.72, 0.75);
      add(geometry.nozzle, accent, -0.8, -0.44, 9.2, 1.1, 1.1, 1.15);
      add(geometry.nozzle, accent, 0.8, -0.44, 9.2, 1.1, 1.1, 1.15);
      addFlame(-0.8, -0.44, 10.5, 1.02, 1.02);
      addFlame(0.8, -0.44, 10.5, 1.02, 1.02);

      // ---- Tail ------------------------------------------------------------
      // ONE tall fin on the centreline, and the stabilators mounted LOW — well
      // below the wing line at y -0.55 — which together are the aft-quarter
      // read against the F-14D's twin canted fins and shoulder-height stabs.
      // The stabs are deliberately smaller than the wing panels above them
      // (half-span 5.1 against 10.2) — on a swing-wing the tailplane must
      // never compete with the wing for the eye — but big enough to be seen
      // past the nozzles from above, because an all-moving slab tailplane is
      // how this aircraft is controlled and it should look like it.
      // Fin height is measured against the BODY, not against another fighter:
      // this hull is 24 units long, so a fin scaled like the MiG-23's (1.45 on
      // a 20-unit body) disappears. 1.85 puts the tip roughly a body-diameter
      // and a half above the spine, which is the real aircraft's proportion.
      add(geometry.fin, secondary, 0, 0.55, 5.4, 1.05, 1.85, 1.1);
      add(geometry.tailWing, primary, 0, -0.58, 7.0, 1.0, 1, 1.05);
      // Ventral strakes under the nozzles.
      add(geometry.panel, dark, -0.9, -1.05, 8.4, 0.14, 0.62, 2.0, 0.24);
      add(geometry.panel, dark, 0.9, -1.05, 8.4, 0.14, 0.62, 2.0, -0.24);

      // ---- Details ---------------------------------------------------------
      // Attack-radar radome in the tip of the spike, pitot boom ahead of it.
      add(geometry.nose, dark, 0, -0.1, -12.6, 0.3, 0.26, 0.44);
      add(geometry.panel, dark, 0, -0.1, -13.6, 0.06, 0.06, 1.1);
      // Dorsal spine from the canopy to the fin root.
      add(geometry.panel, secondary, 0, 0.78, 2.2, 0.3, 0.22, 6.2);
      // Pallet stores on the glove pylons: this aircraft carries bombs, and
      // the underwing hardware is what says "interdictor" rather than "fighter".
      add(geometry.missileBody, light, -2.4, -0.55, 1.6, 1.2, 1.2, 1.25);
      add(geometry.missileBody, light, 2.4, -0.55, 1.6, 1.2, 1.2, 1.25);
      add(geometry.missileNose, dark, -2.4, -0.55, -1.4, 1.15, 1.15, 1.05);
      add(geometry.missileNose, dark, 2.4, -0.55, -1.4, 1.15, 1.15, 1.05);
      add(geometry.panel, dark, -2.4, -0.1, 1.2, 0.2, 0.65, 1.8);
      add(geometry.panel, dark, 2.4, -0.1, 1.2, 0.2, 0.65, 1.8);
      // Nav lights on the GLOVES, not the tips — the tips move with the sweep.
      add(geometry.canopy, navL, -2.9, 0.62, -1.4, 0.13, 0.13, 0.13);
      add(geometry.canopy, navR, 2.9, 0.62, -1.4, 0.13, 0.13, 0.13);
    }
  });
}
