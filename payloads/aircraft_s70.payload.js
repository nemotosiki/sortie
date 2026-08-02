// S-70 OKHOTNIK - heavy stealth attack drone, enemy only (Elem / Russian bloc).
//
// This payload adds exactly one airframe: the flight-model entry, its enemy AI
// profile, its 3D model and its HUD outline. It touches no mission, no existing
// entry, and it stays out of the hangar (`order: false`), because the roster it
// belongs to is the M11/M12/M32 unmanned-war line, not anything the player buys.
//
// SIZE AND PROPORTION. Real S-70: 19 m span over 14 m length - a WIDER-THAN-
// LONG flying wing, ratio 1.357. That ratio is the whole silhouette of this
// aircraft and it is the one thing a top view has to get right, so it is
// measured rather than asserted: rendered through ?modelPreview and measured
// off the TOP cell, the model's drawn extent is 1.353 wide-to-long, including
// the exhaust plume that the render puts on the back of it.
//
// The numbers that produce it: half-span 12.0 (span 24.0) over an airframe
// running z -7.4 at the apex to +8.55 at the nozzle lip, with the flame cone
// carrying the drawn extent out to ~10.4. 24.0 / 17.8 = 1.35.
//
// Against the rest of the sky that lands where it should: the F-16 (viper,
// 9.96 m real) spans 14.4 units and the Tu-95 (bear, 50.1 m real) spans 60.7,
// which puts the game's fighters at ~1.45 units/m and its heavies at ~1.21.
// 24.0 / 19 m = 1.26 units/m sits at the heavies' end of that band, so the
// Okhotnik reads as clearly bigger than an F-16 and clearly smaller than a
// Bear - which is what a 19 m drone actually is. It is also nearly four
// times the MQ-99's 6.48-unit span, so the two drones can share a sky without
// being confused for one another for a moment.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;
  const uav = AIRCRAFT_TYPES.uav;
  const uavAI = ENEMY_AI_PROFILES.uav;
  if (!uav || !uavAI) {
    throw new Error("[s70] expected the MQ-99 drone entries to spread from");
  }

  // Elem's stealth palette, taken from the Su-57 (felon) entry's family rather
  // than invented: a thin dark grey airframe with a colder, darker secondary
  // and an almost-black accent for intake lip and nozzle. The nav/sensor colour
  // stays on the drone line's amber-free side; exhaust is a dull heat glow
  // instead of a fighter's blue afterburner, because this thing does not have
  // one - the nozzle is a plain unaugmented duct.
  const theme = {
    primary: 0x4a5057,
    secondary: 0x33383e,
    accent: 0x1e2227,
    canopy: 0xff7a3c,
    exhaust: 0xff9a4d,
    scale: 1,
    variant: "s70"
  };

  // BALANCE TODO: placeholder. Every flight-model number below is the MQ-99's,
  // inherited by spread and deliberately untouched - a 19 m airframe should not
  // fly like a 7 m one, and HP 98 (one missile) is far too light for a heavy.
  // Only identity, size (tipSpan/tipZ) and theme are authored here.
  ctx.addAircraft("s70", {
    ...uav,
    id: "s70",
    label: "S-70 OKHOTNIK",
    role: "Heavy Unmanned Combat Aerial Vehicle",
    tag: "ENEMY",
    enemyOnly: true,
    blurb: "エレムの重無人攻撃機。尾翼を持たない全翼のステルス機で、全長より全幅が大きい横長の平面形。MQ-99の四倍近い巨体を持ち、有人機の随伴なしに単独で戦域へ入る、無人戦争の主役。",
    // Half-span 12.0 is the geometric wingtip of the planform below, so the
    // wingtip contrails leave the actual tip. tipZ 5.4 is that tip's z - well
    // aft, because on a 47-degree flying wing the tip IS the back corner.
    tipSpan: 12.0,
    tipZ: 5.4,
    theme
  }, { order: false });

  // BALANCE TODO: placeholder. Spread from the MQ-99's AI wholesale; only the
  // HUD label, the hitbox (which has to follow the airframe's real size or the
  // gun's analytic test disagrees with what the player sees), the explosion
  // scale and the radar/tracer colours are set. Jink amplitudes, engage ranges
  // and gun numbers are all still the small drone's and want a pass of their own.
  ctx.addEnemyProfile("s70", {
    ...uavAI,
    label: "S-70",
    // The MQ-99 runs 0.55 against a 3.2 m half-span (ratio ~1.78). This airframe's
    // half-span is 12.0 units, so the same ratio asks for ~2.1.
    hitboxScale: 2.1,
    explosionScale: 1.15,
    radarColor: "#ff8a4d",
    tracerColor: 0xff8a4d,
    explosionColor: 0xffb066,
    theme
  });

  ctx.addAircraftModel("s70", {
    // Top view in the shared 40x44 box, nose up. Projected point-for-point from
    // the same planform polygon the 3D model extrudes, through ONE isotropic
    // scale (38 / 24.0 span = 1.5833) applied to both axes, so the HUD outline
    // carries the aircraft's real proportion instead of being stretched to fill
    // the box. That is the whole reason the previous outline lied: it scaled x
    // and z independently to reach all four edges, which turned a wing that is
    // wider than it is long into one that is taller than it is wide. This path
    // is 38 wide over 23.8 tall - 1.60 - and is centred vertically in the box.
    //
    // It is the only path in the table with NO fin, NO tailplane and no
    // fuselage break anywhere - one continuous chevron from tip to tip. The
    // leading edge leaves the apex almost straight, cranks at the shoulder and
    // runs out at 47 deg to tips that reach the full width of the box; the
    // trailing edge is the real aircraft's W, cutting forward from each tip to
    // a notch and back out to the exhaust shelf either side of the centreline.
    silhouette: "M20.0 10.1 L22.6 13.0 L25.4 15.8 L39.0 30.4 L37.9 32.0 L27.8 28.5 L23.8 33.9 L20.0 33.4 L16.2 33.9 L12.2 28.5 L2.1 32.0 L1.0 30.4 L14.6 15.8 L17.4 13.0 Z",
    build(env) {
      const { geometry, extrudedSurface, verticalSurface,
              primary, secondary, accent, canopy, dark, light, navL, navR,
              add, addFlame } = env;

      // THE AIRFRAME. One surface, and it is the whole aeroplane: there is no
      // fuselage cylinder, no fin, no tailplane and no separate wing anywhere
      // below - which is the single fact that has to read from every angle.
      // Every other airframe in the game is a body with things bolted to it.
      //
      // Planform, +z aft. Apex on the nose at z -7.4, half-span 12.0 at z 5.4:
      // 24.0 of span over 12.8 of wing length, and the tip sits AFT, near the
      // trailing edge, which is what 47 deg of leading-edge sweep means and
      // what makes the top view read wide. The trailing edge is the real
      // S-70's W: it runs FORWARD from the tip to a notch at x +/-4.95 / z 4.2,
      // back out to the exhaust shelf at x +/-2.38 / z 7.6, and the centreline
      // sits at 7.3 between them. Authored as one closed polygon so the two
      // halves cannot drift apart.
      const blendedWing = extrudedSurface([
        [0, -7.4],
        [1.62, -5.6], [3.43, -3.8], [12.0, 5.4],
        [11.33, 6.4], [4.95, 4.2], [2.38, 7.6], [0, 7.3],
        [-2.38, 7.6], [-4.95, 4.2], [-11.33, 6.4],
        [-12.0, 5.4], [-3.43, -3.8], [-1.62, -5.6]
      ], 0.42);
      add(blendedWing, primary, 0, 0, 0);

      // The centrebody. Not a fuselage - a shallow lens faired INTO the wing,
      // so from the side the aircraft is a wedge that thickens toward the
      // engine and thins to nothing at the tips. Built from stacked panels
      // rather than geometry.fuselage on purpose: a cylinder would put a round
      // body back on an aircraft whose whole identity is not having one.
      // Wider and shorter than the wing it replaces, because the centrebody of
      // a wide flying wing is a broad shallow lens and not a spine.
      add(geometry.panel, primary, 0, 0.4, 0.0, 6.0, 0.66, 8.4);
      add(geometry.panel, primary, 0, -0.36, 0.0, 5.4, 0.46, 7.8);
      // The forebody tapering into the apex, narrow enough to stay inside the
      // planform's cranked leading edge all the way forward.
      add(geometry.panel, primary, 0, 0.16, -4.4, 2.6, 0.44, 3.6);
      add(geometry.panel, primary, 0, 0.06, -5.9, 1.4, 0.3, 1.9);
      // Forebody chine: the flat faceted edge that carries the leading-edge
      // line into the apex, the same trick the Su-57 uses down its nose sides.
      add(geometry.panel, secondary, -1.6, 0.02, -3.8, 0.9, 0.18, 3.2).rotation.y = -0.30;
      add(geometry.panel, secondary, 1.6, 0.02, -3.8, 0.9, 0.18, 3.2).rotation.y = 0.30;

      // DORSAL INTAKE. A shouldered box sitting ON TOP of the centre spine,
      // fed by a raked lip ahead of it, with the duct fairing running aft to
      // the engine. Nothing else in the game breathes from its back except the
      // MQ-99, and this one is four times the size and has a visible lip and
      // spine - a low-observable inlet hides the compressor face from below,
      // which is exactly why it is up here.
      add(geometry.intake, secondary, 0, 0.98, -1.9, 3.4, 0.95, 1.5);
      // The mouth: a wide, flat, dark rectangular aperture across the front of
      // that box. Deliberately much wider than it is tall - a low-observable
      // inlet is a letterbox, not a round hole, and it is the shape that reads
      // as "intake" from the front quarter rather than as a lump on the spine.
      add(geometry.panel, accent, 0, 0.98, -3.45, 3.5, 0.6, 0.42);
      // Splitter lip standing proud above the mouth, and the two side cheeks
      // that box the aperture in.
      add(geometry.panel, primary, 0, 1.4, -3.2, 3.6, 0.24, 1.05);
      add(geometry.panel, primary, -1.82, 1.0, -2.7, 0.22, 0.7, 2.3);
      add(geometry.panel, primary, 1.82, 1.0, -2.7, 0.22, 0.7, 2.3);
      // Duct fairing: the spine that swells from the inlet back to the nozzle.
      add(geometry.panel, primary, 0, 0.92, 0.6, 3.0, 0.9, 5.0);
      add(geometry.panel, primary, 0, 0.78, 4.0, 2.4, 0.82, 2.6);
      // Shoulder fillets blending the intake box down into the wing upper
      // surface, so the box does not read as a crate dropped on the aircraft.
      add(geometry.panel, primary, -1.7, 0.66, -0.9, 1.1, 0.6, 6.0, 0.26);
      add(geometry.panel, primary, 1.7, 0.66, -0.9, 1.1, 0.6, 6.0, -0.26);

      // EXPOSED SINGLE NOZZLE. The real aircraft flies with a plain round
      // unshrouded AL-31 duct hanging out of the trailing edge, which is the
      // one un-stealthy thing on it and therefore worth showing: one nozzle,
      // on the centreline, standing clear behind the trailing edge notch
      // rather than being buried in a shelf.
      // Shelf: the short tailboom the duct exits through, carrying the nozzle
      // clear of the trailing edge so it is a separate object from behind
      // rather than a hole in the wing. Kept SHORT on purpose - a long tailboom
      // is length, and length is the one thing this airframe cannot spend. A
      // clearance of about one nozzle diameter is enough to read as separate.
      add(geometry.panel, secondary, 0, 0.62, 6.7, 2.3, 1.0, 1.8);
      add(geometry.nozzle, accent, 0, 0.62, 7.7, 2.0, 2.0, 1.1);
      add(geometry.nozzle, dark, 0, 0.62, 8.35, 1.6, 1.6, 0.4);
      addFlame(0, 0.62, 8.9, 1.4, 1.3);

      // Control surfaces scribed into the trailing edge - elevons outboard and
      // the split drag rudders that do this aircraft's yaw, because there is no
      // fin to do it with. Thin dark panels, canted to follow the swept edge.
      // Outboard elevons, laid along the tip-to-notch trailing edge segment
      // (11.33,6.4)->(4.95,4.2): centre (8.14,5.3), length 6.75, rotation.y -0.332.
      add(geometry.panel, dark, -8.14, 0.14, 5.3, 6.4, 0.2, 0.62).rotation.y = 0.332;
      add(geometry.panel, dark, 8.14, 0.14, 5.3, 6.4, 0.2, 0.62).rotation.y = -0.332;
      // Split drag rudders on the inboard segment (4.95,4.2)->(2.38,7.6), which
      // is what does this aircraft's yaw - there is no fin to do it with.
      add(geometry.panel, dark, -3.67, 0.16, 5.9, 4.0, 0.24, 0.62).rotation.y = -0.924;
      add(geometry.panel, dark, 3.67, 0.16, 5.9, 4.0, 0.24, 0.62).rotation.y = 0.924;

      // Facet lines on the upper surface: the sawtooth panel joints that make a
      // large flat wing read as a low-observable one rather than as a sheet.
      // The leading edge runs (3.43,-3.8)->(12.0,5.4), so a scribe line parallel
      // to it is a thin z-long box turned by 0.750 about y. Set inboard of the
      // edge and stopped short of both ends so it stays on the surface.
      add(geometry.panel, secondary, -5.7, 0.26, 0.2, 0.16, 0.1, 5.6).rotation.y = -0.750;
      add(geometry.panel, secondary, 5.7, 0.26, 0.2, 0.16, 0.1, 5.6).rotation.y = 0.750;
      add(geometry.panel, secondary, -8.9, 0.16, 3.0, 0.14, 0.08, 3.2).rotation.y = -0.750;
      add(geometry.panel, secondary, 8.9, 0.16, 3.0, 0.14, 0.08, 3.2).rotation.y = 0.750;

      // Weapons-bay doors scribed into the belly. This airframe carries
      // everything internally - the same reason the F-35C's belly is scribed -
      // and it is the only detail on the underside, so it is what tells the
      // bottom view apart from the top.
      add(geometry.panel, dark, -1.4, -0.62, 0.9, 1.2, 0.14, 5.0);
      add(geometry.panel, dark, 1.4, -0.62, 0.9, 1.2, 0.14, 5.0);

      // NO COCKPIT. The canopy material goes on the electro-optical turret
      // faired into the underside of the apex, exactly as the MQ-99 does it: a
      // single emissive eye under the nose instead of a windscreen. That, and
      // the missing tail, are the two reads that say "unmanned" head-on.
      add(geometry.canopy, canopy, 0, -0.46, -5.1, 0.46, 0.3, 0.56);
      // Flush apertures either side of it - the conformal sensor panels.
      add(geometry.panel, dark, -0.9, -0.3, -4.4, 0.4, 0.1, 1.1, 0.1);
      add(geometry.panel, dark, 0.9, -0.3, -4.4, 0.4, 0.1, 1.1, -0.1);
      // Flat radome facet on the apex itself, kept narrow so the nose stays a
      // point rather than growing a lump. No pitot boom anywhere: a
      // low-observable drone does not hang a metal rod off its radar cross
      // section, and there is no pilot to trust it.
      add(geometry.panel, light, 0, 0.04, -6.4, 0.42, 0.2, 1.2);

      // LIGHTING, minimal by design. Two small nav lights at the geometric
      // tips and nothing else - no beacon, no strobes, no formation strips.
      // Every crewed airframe here wears more; a machine sent somewhere it is
      // not supposed to be wears the legal minimum, and at 0.1 they are barely
      // more than a pinprick against the 24-unit span.
      add(geometry.canopy, navL, -11.5, 0.06, 5.6, 0.1, 0.1, 0.1);
      add(geometry.canopy, navR, 11.5, 0.06, 5.6, 0.1, 0.1, 0.1);

      // `verticalSurface` is deliberately unused: there is no vertical surface
      // anywhere on this aircraft. Kept destructured so the omission is a
      // stated decision rather than something nobody thought about.
      void verticalSurface;
    }
  });
}
