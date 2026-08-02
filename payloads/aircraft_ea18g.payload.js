// EA-18G GROWLER - the electronic-attack Super Hornet.
//
// Enemy/support-only registration: no AIRCRAFT_ORDER entry ({ order: false }),
// no CAMPAIGNS edit, no mission touched. The airframe exists so escort and
// stand-off-jammer roles can field it; putting it in the hangar is a separate
// decision made elsewhere.
//
// Every flight number is inherited wholesale from the F/A-18F and marked
// BALANCE TODO - which is nearly the truth anyway, since the real EA-18G is an
// F/A-18F with the guns traded for receivers. The work in this file is the
// SHAPE, and the shape is three things the stock Hornet next to it lacks:
//   1. LERX STRAKES that read: broad flat leading-edge root extensions drawn
//      as a real planform surface running from the NOSE (z -7.4, on the radome
//      cone itself) out to a 2.95 half-width and then stepping BACK INBOARD to
//      2.15 at the wing root, so there is a visible notch between strake and
//      wing rather than the one fused delta a straight-through strake gives.
//      The inline hornet branch fakes all of this with two thin box panels.
//      The edge is drawn as an `accent` band tracing both sweep angles - see
//      build(), where a control render settled that the strips were correctly
//      placed all along and only the contrast was wrong
//   2. OUTWARD-CANTED TWIN TAILS pushed past the F/A-18F's own numbers on
//      purpose: rz +/-0.46 at +/-2.35 and scaled up, against the stock 0.36 at
//      +/-1.95. The deck-mate's exact figures were tried first and the fins
//      disappeared behind the pods; the spec requires the cant to survive at
//      thumbnail size, so legibility wins over matching the donor airframe
//   3. PODS EVERYWHERE - the aircraft's whole identity. Wingtip ALQ-218
//      receiver pods where the Hornet carries its AIM-9 rails, four ALQ-99
//      jamming pods on the wing pylons (each with the ram-air-turbine disc on
//      its nose), and a centreline drop tank. Strip the pods off and this
//      model MUST become indistinguishable from an F/A-18F; that is the test
//      of having built the right aircraft.
//
// Scale: the real EA-18G is 18.3 m long on a 13.6 m span against the
// F/A-18F's 18.31 / 13.62 - the same airframe to within centimetres, so it
// has to come out at 1.00x the Hornet sitting next to it. Measured off the
// live `hornet` branch rather than guessed: that model runs z -8.1 minus the
// nose cone's 2.1 half-length = -10.2 (radome tip) to 8.35 + the nozzle's 0.7
// half-length = 9.05 (nozzle lip) = 19.25 model units, and 19.25 x its scale
// 1.02 = 19.64 world; its half-span is the wingHornet planform's 7.9 x 1.02
// = 8.06 world.
//
// This airframe deliberately keeps the identical stations - radome tip -10.2,
// nozzle lip 9.05, wingHornet at the same z 0.8 - and the identical scale
// 1.02, so it comes out 1.00x the Hornet in both axes against a real ratio of
// 1.00. Size separates the two by nothing; the pods separate them at a glance.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;
  const hornet = AIRCRAFT_TYPES.fa18;
  const hornetAI = ENEMY_AI_PROFILES.fa18;
  if (!hornet || !hornetAI) {
    throw new Error("[ea18g] expected the fa18 aircraft and AI templates to exist");
  }

  // Sera (US) carrier grey, taken off the F/A-18F line so the two read as the
  // same air wing: the accent (intakes, nozzle shells) is the Hornet's own
  // navy blue, the canopy and exhaust are identical. Primary and secondary
  // sit half a tone darker than the Hornet's 0xb9c2ca / 0x707a85 - the
  // low-visibility scheme EW jets actually wear - which leaves the pods,
  // carried in the shared `light` detail material with `dark` bands, as the
  // brightest things on the airframe. Pods brighter than skin is the paint
  // half of "the pods are the aircraft".
  const theme = {
    primary: 0xaab4bd,
    secondary: 0x66707b,
    accent: 0x2f4f75,
    canopy: 0x8fe0ff,
    exhaust: 0x8cecff,
    scale: 1.02,
    variant: "ea18g"
  };

  // BALANCE TODO: placeholder. Every performance number below is the
  // F/A-18F's, unchanged - including the QAAM rack, which on this airframe
  // stands in for HARM-class stand-off shots until someone tunes it. Only
  // identity, dimensions and paint are authored here; a real Growler is a
  // touch heavier and draggier with the pods on, and the numbers should
  // eventually say so.
  ctx.addAircraft("ea18g", {
    ...hornet,
    id: "ea18g",
    label: "EA-18G GROWLER",
    role: "Electronic Attack",
    tag: "SUPPORT",
    enemyOnly: true,
    blurb: "F/A-18Fの機体に受信機と妨害装置を詰め込んだ電子戦機。翼端のレシーバーポッドと翼下のジャミングポッドで敵レーダーを黙らせる。ポッドこそが本体。",
    // Geometric tip for the contrail: the wingtip station is occupied by the
    // ALQ-218 pod (centre x 7.95, body z -0.47..4.87), so the trail leaves
    // the pod the way the Hornet's leaves its tip rail - tipZ 2.2 is the pod
    // body's mid-length, not the wing chord's.
    tipSpan: 7.95, tipZ: 2.2,
    theme
  }, { order: false });

  // BALANCE TODO: placeholder. The AI profile is the F/A-18F's formation
  // template with nothing but the label and the paint changed, so a Growler
  // flies exactly like a Hornet until someone tunes it. Same hitbox too,
  // which for once is correct: it is the same airframe.
  ctx.addEnemyProfile("ea18g", {
    ...hornetAI,
    label: "EA-18G",
    theme
  });

  ctx.addAircraftModel("ea18g", {
    // Top view in the shared 40x44 box, nose up. Traced off the model rather
    // than drawn freehand: every vertex is a real part station run through
    // x = 20 + 1.85*mx, y = 2 + 2.05*(mz + 10.2), so the outline and the
    // aircraft cannot drift apart.
    //
    // Reading down the page, and matching the three authored features in
    // order: the LERX edge kinking out from the NOSE (21.6 7.7) through its
    // widest point (25.5 18.4) and then STEPPING BACK INBOARD to the wing
    // root - that step is the notch the build() comment describes, and it is
    // in the outline because it is in the geometry; the wingtip pods standing
    // proud of the tips both fore and aft (the Hornet's own silhouette has
    // nothing outboard of the wing at all); and the canted fin roots as
    // separate blades outboard of the tailplane, aft of the wing trailing
    // edge, before the forward-swept stab and the twin nozzles.
    silhouette:
      "M20 2 L21.6 7.7 L24.3 13.5 L25.5 18.4 L28.3 20.7 L34.6 25.4 " +
      "L34.7 20.2 L35.6 21.1 L35.6 33.1 L34.7 34 L34.6 29.1 L25.6 31.9 " +
      "L26.5 33.4 L24.3 33.4 L23.6 35.6 L29.4 38.7 L22.3 37.7 L22.4 40.2 " +
      "L21.5 41.5 L20 41.5 L18.5 41.5 L17.6 40.2 L17.7 37.7 L10.6 38.7 " +
      "L16.4 35.6 L15.7 33.4 L13.5 33.4 L14.4 31.9 L5.4 29.1 L5.3 34 " +
      "L4.4 33.1 L4.4 21.1 L5.3 20.2 L5.4 25.4 L11.7 20.7 L14.5 18.4 " +
      "L15.7 13.5 L18.4 7.7 Z",

    build(env) {
      const {
        geometry, extrudedSurface,
        primary, secondary, accent, canopy, dark, light, navL, navR,
        add, addFlame
      } = env;

      // ---- Planforms ------------------------------------------------------
      // IDENTITY 1: THE LERX STRAKE. The inline hornet branch fakes its LERX
      // with two thin box panels (z -6.5..-2.7) that never leave the
      // fuselage's shadow from above; here it is a real planform surface, and
      // the numbers are chosen against the fuselage it has to escape.
      //
      // What it has to beat: `fuselage` is a cone r 0.95 (front) to 1.55
      // (rear) over length 11.5, added at sx 1.1 and z -0.45 - so it runs
      // z -6.2..5.3 with a half-width of 1.045 at its nose end growing to
      // 1.705 at the tail. `nose` is a cone r 1.02 x 4.2 at sx 0.76 and
      // z -8.1, so it runs z -10.2..-6.0 tapering from 0.775 half-width down
      // to the tip. THE STRAKE ONLY READS WHERE IT IS WIDER THAN THOSE.
      //
      // So the blade starts at 0.85 on the nose cone at z -7.4 (against the
      // cone's local ~0.48 there: already proud of it, and that kink ON the
      // nose is what the spec calls "from the nose"), runs out to 2.3 by
      // z -4.6 (1.25 proud of the fuselage's 1.06) and 2.95 by z -2.2 (1.85
      // proud), then RETURNS INBOARD to 2.15 at the wing root station z 0.9.
      //
      // That return is the whole trick, and it was arrived at by looking at
      // the render. A first pass carried the strake's maximum width straight
      // back into the wing root, and because the strake and the wing are the
      // same `secondary` tone the two fused into one continuous delta from
      // above - the aircraft read as a cropped-delta Viper and the LERX was
      // not a feature at all, just the front half of a big wing. Pulling the
      // trailing edge back inboard cuts a visible NOTCH between the strake's
      // widest point (2.95 at z -2.2) and the wing's leading edge (which at
      // that station is only x 2.2, since wingHornet runs [1.9,-2.9] to
      // [7.9,1.2]). The strake now overhangs the wing root ahead of the
      // leading edge and steps back behind it, which is what a LERX does and
      // what no other planform in this hangar has.
      //
      // The centre section is buried in the fuselage; only the flared flanks
      // show.
      const lerxGrowler = extrudedSurface([
        [0.85, -7.4], [2.3, -4.6], [2.95, -2.2], [2.15, 0.9], [0, 1.1],
        [-2.15, 0.9], [-2.95, -2.2], [-2.3, -4.6], [-0.85, -7.4]
      ], 0.1);

      // ---- Body: the F/A-18F, station for station -------------------------
      // Deliberately copied from the inline hornet branch (fuselage, nose,
      // canopy, wing, tailplane, canted fins, nacelles, intakes, nozzles all
      // at its exact numbers). The Growler must be the SAME aircraft; every
      // authored difference in this file hangs off these stations rather than
      // moving them.
      add(geometry.fuselage, primary, 0, 0.04, -0.45, 1.1, 0.78, 1);
      add(geometry.nose, primary, 0, 0.02, -8.1, 0.76, 0.66, 1);
      // Long tandem canopy - two crew, pilot and EWO, same glass as the F.
      add(geometry.canopy, canopy, 0, 0.92, -3.2, 0.72, 0.56, 2.1);
      // The strake blade sits at the fuselage shoulder, above the wing plane
      // (wing y 0.18) so its edge is not swallowed by the wing root, and in
      // `secondary` against the `primary` body so the ledge is a tone change
      // from above rather than a silhouette-only feature.
      add(lerxGrowler, secondary, 0, 0.26, 0);
      // Dark leading-edge strips laid ALONG the strake edge, one per side, in
      // two segments that follow its two sweep angles (nose-to-mid, then
      // mid-to-root). These must YAW to lie on the edge rather than lie
      // across it, and `add`'s 9th argument is rotation.Z (the wing-cant
      // control the V-tails and canted fins use), NOT rotation.Y - so the
      // yaw is set on the returned mesh the way the hornet branch sets its
      // arrestor hook's pitch. Using rz here would roll the strip on its
      // side and draw nothing from above, which is the whole point of it.
      //
      // Angles off the z axis: the forward segment runs (0.85,-7.4) to
      // (2.3,-4.6), atan(1.45/2.8) = 0.48 rad; the aft segment runs
      // (2.3,-4.6) to (2.95,-2.2), atan(0.65/2.4) = 0.26 rad. Rotation.y is
      // NEGATIVE on the +x side to rake a strip outboard-forward.
      //
      // Width 0.34, not the 0.13 of a first pass: at 0.13 these were two
      // pixels wide in the top view and did nothing at all. A LERX edge is a
      // structural leading-edge member, so drawing it as a real band rather
      // than a hairline is both more honest and the only version that
      // survives being scaled down.
      //
      // In `accent` (the navy the intakes and nozzle shells already wear)
      // rather than `dark`, and this was settled by a control render, not by
      // taste. Drawn in `dark` these strips were invisible from above: the
      // strake beside them is `secondary` in shadow, which lands within a few
      // percent of `dark`'s value, so a correctly placed part simply did not
      // exist to the eye. Re-rendered in a loud colour they turned out to be
      // sitting exactly on the edge the whole time - the placement was never
      // the problem, the CONTRAST was. `accent` is the darkest tone on the
      // aircraft that is still a different hue from the skin, so the edge
      // reads without turning into a racing stripe.
      for (const side of [-1, 1]) {
        add(geometry.panel, accent, side * 1.5, 0.32, -6.05, 0.34, 0.14, 3.0)
          .rotation.y = side * 0.48;
        add(geometry.panel, accent, side * 2.55, 0.32, -3.45, 0.34, 0.14, 2.6)
          .rotation.y = side * 0.26;
      }
      // The Hornet's own wing, unchanged: clipped low-sweep trapezoid,
      // half-span 7.9 at z 0.8.
      add(geometry.wingHornet, secondary, 0, 0.18, 0.8);
      add(geometry.tailWing, primary, 0, -0.04, 6.2, 0.95, 1, 0.9);

      // ---- Identity 2: the outward-canted twin tails ----------------------
      // The one place this file knowingly leaves the F/A-18F's numbers, and
      // the reason is legibility rather than accuracy. The stock hornet
      // branch flies rz +/-0.36 fins at +/-1.95, scaled 0.8 x 1 x 0.82; in
      // the first render of this aircraft they vanished - two small dark
      // shapes tucked between the nozzles and the tailplane, with four
      // jamming pods and two tip pods shouting over them. The spec lists the
      // canted twin tail as one of three features that must survive at
      // thumbnail size, so it has to be readable next to the pods, not just
      // present.
      //
      // Three changes, each doing one job:
      //  - rz +/-0.46 (26 deg) rather than 0.36 (21 deg). The real Hornet
      //    family sits at 20 deg; overstating it by 6 is what makes the V
      //    obvious in the front and rear three-quarter views, where a 20 deg
      //    cant on a small fin is inside the noise of the perspective.
      //  - stations pushed out to +/-2.35 from +/-1.95, clear of the +/-0.82
      //    nacelles, so each fin stands on open deck and its base is not
      //    read as part of the engine bulge.
      //  - scaled up to 0.92 x 1.15 x 0.9. Taller fins on a wider base is
      //    the pair reading as a V from behind rather than as two blades.
      //
      // Kept in `primary` (not the hornet's `secondary`) so they are LIGHTER
      // than the wing they stand over, which is the opposite of every other
      // surface on the aircraft and the reason they separate from the
      // tailplane in the top view.
      add(geometry.fin, primary, -2.35, 0.5, 4.35, 0.92, 1.15, 0.9, 0.46);
      add(geometry.fin, primary, 2.35, 0.5, 4.35, 0.92, 1.15, 0.9, -0.46);
      add(geometry.rearBody, secondary, -0.82, -0.06, 6.4, 0.8, 0.8, 1.15);
      add(geometry.rearBody, secondary, 0.82, -0.06, 6.4, 0.8, 0.8, 1.15);
      add(geometry.intake, accent, -1.5, -0.16, -1.6, 0.75, 0.95, 1.15);
      add(geometry.intake, accent, 1.5, -0.16, -1.6, 0.75, 0.95, 1.15);
      add(geometry.nozzle, accent, -0.82, -0.06, 8.35, 0.95, 0.95, 1);
      add(geometry.nozzle, accent, 0.82, -0.06, 8.35, 0.95, 0.95, 1);
      addFlame(-0.82, -0.06, 9.7, 0.95, 0.95);
      addFlame(0.82, -0.06, 9.7, 0.95, 0.95);

      // ---- Identity 3: the pods -------------------------------------------
      // Wingtip ALQ-218 receiver pods, where the Hornet hangs its AIM-9s.
      // Each is a fat cylinder (missileBody at 1.6x, so ~0.45 radius against
      // the AIM-9's 0.28) whose nose cone reaches z -1.3 - 3.3 units AHEAD of
      // the wingtip leading edge (z 2.0), which is the one thing that makes
      // the planform read as "pods", not "missiles": a store longer than the
      // tip chord, overhanging it at both ends. The square `dark` band
      // standing proud of the barrel mid-length is the antenna fairing, and
      // the nav lights ride the pod noses because the pods ARE the tips now.
      for (const side of [-1, 1]) {
        add(geometry.panel, dark, side * 7.9, 0.14, 2.3, 0.2, 0.14, 2.4);
        add(geometry.missileBody, light, side * 7.95, -0.12, 2.2, 1.6, 1.6, 1.3);
        add(geometry.missileNose, light, side * 7.95, -0.12, -0.6, 1.55, 1.55, 1.4);
        add(geometry.nozzle, dark, side * 7.95, -0.12, 5.0, 0.7, 0.7, 0.7);
        add(geometry.panel, dark, side * 7.95, -0.12, 1.4, 0.85, 0.85, 0.5);
      }
      add(geometry.canopy, navL, -7.95, 0.1, -1.1, 0.12, 0.12, 0.12);
      add(geometry.canopy, navR, 7.95, 0.1, -1.1, 0.12, 0.12, 0.12);

      // Underwing ALQ-99 jamming pods, two per side on pylons at +/-2.9 and
      // +/-5.1. Fatter than the tip pods (missileBody at 2.0x - these are the
      // biggest stores on the aircraft), each with the ram-air-turbine disc
      // on its nose (the thin dark `nozzle` slice ahead of the nose cone -
      // the ALQ-99's generator propeller, and the detail that says "jammer"
      // rather than "fuel tank") and a cruciform of steering vanes at the
      // tail. Four of them fill the underwing the way the spec's "covered in
      // pods" demands - the Hornet's own underwing carries nothing.
      for (const side of [-1, 1]) {
        for (const station of [2.9, 5.1]) {
          const x = side * station;
          add(geometry.panel, secondary, x, -0.28, 1.9, 0.18, 0.55, 1.7);
          add(geometry.missileBody, light, x, -0.85, 2.0, 2.0, 2.0, 1.15);
          add(geometry.missileNose, dark, x, -0.85, -0.35, 1.9, 1.9, 1.1);
          add(geometry.nozzle, dark, x, -0.85, -0.85, 0.55, 0.55, 0.2);
          add(geometry.panel, secondary, x, -0.85, 4.1, 1.3, 0.08, 0.7);
          add(geometry.panel, secondary, x, -0.85, 4.1, 0.08, 1.3, 0.7);
        }
      }

      // Centreline drop tank: the seventh store. Painted in `light` with the
      // pods - one more bulge in the belly row, so the underside reads as a
      // rack of shapes from any low angle.
      add(geometry.panel, secondary, 0, -1.0, 1.2, 0.3, 0.5, 2.6);
      add(geometry.missileBody, light, 0, -1.35, 1.4, 2.6, 2.6, 1.2);
      add(geometry.missileNose, light, 0, -1.35, -1.35, 2.4, 2.4, 1.3);

      // ---- Details --------------------------------------------------------
      // Anti-glare strip and the black radome cap.
      add(geometry.panel, dark, 0, 0.66, -5.0, 0.66, 0.08, 2.0);
      add(geometry.nose, dark, 0, 0.02, -9.7, 0.28, 0.24, 0.34);
      // Spine blade antennas fore and aft of the wing - the EW fit poking
      // through the skin, and the only dorsal difference from the F.
      add(geometry.panel, dark, 0, 0.85, -1.6, 0.07, 0.42, 0.5);
      add(geometry.panel, dark, 0, 0.8, 1.6, 0.07, 0.36, 0.5);
      // Arrestor hook stowed under the tail: still a carrier jet. Same idiom
      // as the hornet branch, and the only part needing rotation.x.
      add(geometry.panel, dark, 0, -0.95, 6.9, 0.13, 0.13, 2.6).rotation.x = 0.34;
    }
  });
}
