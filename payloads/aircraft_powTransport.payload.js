// POW EXCHANGE TRANSPORT - the neutral airliner that carries prisoners home.
//
// Enemy/support-only registration: no AIRCRAFT_ORDER entry ({ order: false }),
// no CAMPAIGNS edit, no mission touched. The airframe exists so an exchange
// flight can appear as a protected contact; fielding it is a separate decision
// made elsewhere.
//
// Every flight number is inherited wholesale from the C-17 `transport` and
// marked BALANCE TODO. The work in this file is the SHAPE, and the shape is
// three things nothing else in the air here has:
//   1. a LOW-WING TWIN-JET NARROWBODY airliner silhouette - a slim
//      constant-section tube with a swept low wing, ONE podded engine under
//      each wing and a conventional swept fin. Every other heavy in the game
//      is a high-wing military hull with four engines (C-17, Il-76/A-100) or
//      a bomber; an airliner planform is instantly civilian
//   2. WINDOW ROWS - a dotted line of cabin windows down both fuselage sides.
//      No military airframe in the roster has one, and it is the read that
//      says "people, not cargo" at thumbnail size
//   3. NEUTRAL WHITE-AND-BLUE paint - white hull, a blue cheatline under the
//      windows and a blue band across the white tail. Deliberately neither
//      Sera grey nor Elem silver, and the exhaust is the transport's cold
//      neutral grey rather than either faction's burn colour
//
// Scale: the real aircraft is a 40 m / 36 m-span narrowbody (757/A321 class).
// Measured off the live heavies rather than guessed:
//   - `transport` (C-17) runs z -13.84 (radome tip) to 13.58 (aft hull) =
//     27.4 model units x scale 2.6 = 71.2 world for a real 53.0 m; half-span
//     11.4 x 2.6 = 29.6 world for a real 25.85 m.
//   - `a100` (Il-76 hull) runs z -13.1 to 12.6 = 25.7 x 2.3 = 59.1 world for
//     a real 46.6 m.
// Holding the real ratios: 40/53.0 = 0.755 x 71.2 = 53.7 world off the C-17,
// 40/46.6 = 0.858 x 59.1 = 50.7 off the A-100 - so the target is 51-54 world.
// Span the same way: 36/51.7 x 59.3 = 41.3 world (20.6 half) off the C-17,
// 36/50.5 x 59.8 = 42.6 (21.3 half) off the A-100.
// This airframe runs z -13.4 (radome tip) to 13.1 (tailcone tip) = 26.5 model
// x scale 2.0 = 53.0 world length, right between the two anchors, and
// half-span 11.9 x 2.0 = 23.8 world.
//
// The span was 10.5 (21.0 world) for two render passes and it was wrong. The
// bracket above is derived from military heavies whose span/length runs
// ~0.97-1.08; a narrowbody runs 36/40 = 0.90, and holding THAT ratio against
// this hull needs 26.5 x 0.90 / 2 = 11.9 of half-span. At 10.5 the model was
// at 0.79 and the top view read as a long tube with clipped wings - the one
// proportion an airliner cannot get wrong. 23.8 world is a little over the
// anchor bracket, which is the correct direction: this wing must never be
// mistaken for a fighter's.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;
  const transport = AIRCRAFT_TYPES.transport;
  const transportAI = ENEMY_AI_PROFILES.transport;
  if (!transport || !transportAI) {
    throw new Error("[powTransport] expected the transport aircraft and AI templates to exist");
  }

  // Neutral livery: white hull, light grey wings/belly, exchange-commission
  // blue for the cheatline and tail band. The canopy blue doubles as the
  // cabin-window glass. Exhaust is the C-17 transport's cold neutral grey -
  // deliberately NOT the Western blue-white or the Elem warm burn, because
  // this aircraft belongs to neither side and the exhaust is the game's
  // faction cue from astern.
  const theme = {
    primary: 0xf2f5f7,
    secondary: 0xb8c2cb,
    accent: 0x2456b8,
    canopy: 0x9fd4ff,
    exhaust: 0xa8b6c0,
    scale: 2.0,
    variant: "powTransport"
  };

  // BALANCE TODO: placeholder. Every performance number below is the C-17
  // transport's, unchanged - a 40 m twinjet should eventually cruise a touch
  // faster and turn no better, and the numbers should some day say so. Only
  // identity, dimensions and paint are authored here. maxHealth stays on the
  // 98-point quantum (196 = exactly two missiles).
  ctx.addAircraft("powTransport", {
    ...transport,
    id: "powTransport",
    label: "POW EXCHANGE TRANSPORT",
    role: "Prisoner Exchange Airliner",
    tag: "NEUTRAL",
    enemyOnly: true,
    blurb: "捕虜交換の白い旅客機。両陣営の合意の下、青帯一本を通行証にして戦域を横切る。武装は無く、撃てばそこで交渉は終わる。",
    // Geometric wingtip of the planform below: half-span 11.9 with the tip
    // chord at z 2.6..3.4 and the wing mounted at z 0.6, so the tip mid-chord
    // sits at (11.9, 3.6) and the contrail leaves the actual tip.
    tipSpan: 11.9,
    tipZ: 3.6,
    theme
  }, { order: false });

  // BALANCE TODO: placeholder. The unarmed `transport` contract verbatim -
  // attackRange 0 is what states "this aircraft never shoots" - with only the
  // readability fields moved: the hitbox follows the airframe's real size
  // (transport runs 3.0 on a 29.6 world half-span; 23.8/29.6 x 3.0 = 2.4),
  // the fireball shrinks with the hull, and the radar/tracer colour is the
  // hospital ship's neutral white instead of the C-17's enemy green - on the
  // scope this contact reads as "protected", not as a target.
  ctx.addEnemyProfile("powTransport", {
    ...transportAI,
    label: "POW EXCHANGE",
    hitboxScale: 2.4,
    explosionScale: 1.35,
    radarColor: "#eaf4ff",
    tracerColor: 0xeaf4ff,
    theme
  });
  // No addEnemyMissileProfile: the absence of an entry in that table IS the
  // "carries no missiles" statement, the same way it is for the transport.

  ctx.addAircraftModel("powTransport", {
    // Top view in the shared 40x44 box, nose up. Projected point-for-point
    // from the model through ONE isotropic scale (the s70 lesson): x = 20 +
    // 1.59*mx, y = 1 + 1.59*(mz + 13.43), so the outline keeps the real
    // proportion - a long slim tube on a modest wing - instead of being
    // stretched to fill the box.
    //
    // Reading down the path: the pointed nose opening onto parallel fuselage
    // sides, the swept wing with its straight inboard trailing edge and kink,
    // the two engine nacelles standing out ahead of the leading edge as
    // square-ended tabs at HALF SPAN (the twinjet statement - one bump per
    // side, not two, and not tucked against the root), the long parallel
    // afterbody no bomber here has, and a small swept tailplane dying into
    // the tailcone. No T-tail bar, no four-pod comb: an airliner.
    //
    // The nacelle tabs were moved out with the model when round 1 showed the
    // pods reading as slivers at x 3.5: they now sit at model x 4.6 +/-1.15
    // = path x 25.5..29.1, running from y 16.2 (intake lip) up to the wing
    // leading edge, which is what the eye needs to count two engines.
    silhouette:
      "M20 1 L21.6 6.4 L21.6 18.9 L25.5 21.2 L25.5 16.2 L29.1 16.2 " +
      "L29.1 23.6 L38.9 26.5 L38.9 27.8 L24.5 26.8 L21.6 26.8 L21.6 31.4 " +
      "L21.2 37.9 L26.3 41.6 L21.6 40.9 L20.35 43 L19.65 43 L18.4 40.9 " +
      "L13.7 41.6 L18.8 37.9 L18.4 31.4 L18.4 26.8 L15.5 26.8 L1.1 27.8 " +
      "L1.1 26.5 L10.9 23.6 L10.9 16.2 L14.5 16.2 L14.5 21.2 L18.4 18.9 " +
      "L18.4 6.4 Z",

    build(env) {
      const {
        geometry, extrudedSurface,
        primary, secondary, accent, canopy, dark, navL, navR,
        add, addFlame
      } = env;

      // ---- Planform ---------------------------------------------------------
      // An airliner wing: ~25 deg of leading-edge sweep, a straight inboard
      // trailing edge out to a kink at x 2.8 and a swept outboard panel to
      // the tip - the 737/757 planform, and half as swept as any fighter wing
      // in the game.
      //
      // Half-span 11.9, up from the 10.5 of the first two passes. That number
      // is not taste: the real aircraft is 36 m across a 40 m length = 0.90,
      // and at half-span 10.5 on this 26.5-long hull the model was running
      // 21.0/26.5 = 0.79 - visibly stubbier than the header's own arithmetic
      // claimed, and the top view showed it as a long tube with small wings.
      // 11.9 x 2 / 26.5 = 0.898 puts the planform back on the real ratio, and
      // 11.9 x scale 2.0 = 23.8 world half-span against the C-17-derived
      // bracket of 20.6-21.3 - slightly over, which is the correct direction
      // for a wing that must not read as a fighter's.
      //
      // The tip carries a 0.8 chord so it renders clean at distance and the
      // nav light has something to sit on.
      const wingPow = extrudedSurface([
        [0, -2.2], [1.1, -2.0], [11.9, 2.6], [11.9, 3.4], [2.8, 2.8],
        [0, 2.8], [-2.8, 2.8], [-11.9, 3.4], [-11.9, 2.6], [-1.1, -2.0]
      ], 0.26);

      // ---- Fuselage ---------------------------------------------------------
      // THE narrowbody tube, and the reason this build does not start from
      // geometry.fuselage: that cylinder tapers 1.55 to 0.95 over its length,
      // which is a fighter's spine, and an airliner cabin is CONSTANT section
      // nose to tailcone. shipCylinder is a plain unit cylinder (axis +y), so
      // one mesh rotated onto z gives radius 1.0 from z -10.2 all the way to
      // 6.4 with no waist and no bulge - the single strongest "airliner" cue
      // in the side view. Centreline at y 0.3 so the low wing meets the
      // belly, not the middle of the hull.
      add(geometry.shipCylinder, primary, 0, 0.3, -1.9, 1.0, 16.6, 1.0)
        .rotation.x = Math.PI / 2;
      // Nose cone, base radius matched to the tube (1.02 x 0.98 = 1.0) and
      // its base plane tucked 0.15 into the tube's front rim so there is no
      // visible step at the joint. Squat (sz 0.75 = a 3.15 taper) because an
      // airliner nose is blunt - the C-17 runs 4.6 at the same station.
      add(geometry.nose, primary, 0, 0.3, -11.63, 0.98, 0.98, 0.75);
      // Flight-deck glazing on the nose slope, where the real windscreen
      // wraps: a shallow dome standing ~0.2 proud of the cone. Small on
      // purpose - a bubble here would read "fighter canopy".
      add(geometry.canopy, canopy, 0, 0.72, -10.4, 0.55, 0.4, 1.0);
      // Tailcone: the tapering shared fuselage finally earns its keep, run
      // aft from the tube with its centreline lifted to 0.55 for the
      // airliner's upswept rear. Radius steps 1.02 down to 0.63.
      add(geometry.fuselage, primary, 0, 0.55, 8.6, 0.66, 0.62, 0.52);
      // Tail tip: the nose cone flipped aft (rotation.y = PI points its apex
      // at +z) to close the tailcone in a point at z 13.1 instead of a
      // sawn-off disc.
      add(geometry.nose, primary, 0, 0.72, 11.9, 0.6, 0.55, 0.55)
        .rotation.y = Math.PI;
      // Weather-radar radome cap on the very tip of the nose.
      add(geometry.nose, dark, 0, 0.3, -12.9, 0.3, 0.3, 0.25);

      // ---- Low wing, belly fairing, twin engines ----------------------------
      // The wing sits at y -0.55 against a hull bottom of -0.7: ON the belly.
      // Both military heavies in this game carry their wing on the SPINE, so
      // wing height alone separates this hull from them in the front view.
      //
      // Painted in the HULL WHITE, not the wing grey the first pass used.
      // In the round-1 render the grey planform was the largest thing in the
      // top view and it swallowed the white fuselage, so the aircraft read as
      // a grey machine with a white stripe - the exact opposite of identity 3.
      // A neutral commission paints the whole upper surface white and leaves
      // grey only for the belly and the pods, which is what this does now.
      add(wingPow, primary, 0, -0.55, 0.6);
      // Wing-to-body fairing: the grey belly blister every modern airliner
      // wears where the wing carries through the hull. This stays grey - it is
      // under the aircraft, so it never competes with the white top surface,
      // and it is what gives the low wing a visible root.
      add(geometry.panel, secondary, 0, -0.62, 0.9, 2.2, 0.55, 5.2);

      for (const side of [-1, 1]) {
        // ONE podded turbofan per wing, slung ahead of the leading edge on a
        // visible pylon. Twin engines is the read that says "narrowbody" -
        // the C-17 and the A-100 both hang four - so there is exactly one
        // nacelle station per side.
        //
        // Sized and placed off the first render rather than guessed. Pass 1
        // ran 0.72 wide x 1.15 long at x 3.5, and in the SIDE view the two
        // pods stacked into a single grey smear under the wing root while the
        // TOP view showed them as slivers: too small to be a turbofan, too
        // far inboard to clear the fairing. Widened to 0.92 and lengthened to
        // 1.55 (a fat short can, which is what a high-bypass fan is) and moved
        // out to x 4.6, half-way along the semi-span, where the real 757/A321
        // hangs its engine. Dropped to y -1.5 so the pod hangs clear BELOW the
        // wing plane instead of being half-buried in it - hanging pods are the
        // whole low-wing airliner read from the front.
        add(geometry.rearBody, secondary, side * 4.6, -1.5, -1.5, 0.92, 0.92, 1.55);
        // The pylon now has real work to do: it spans from the pod's spine up
        // to the wing at y -0.55, so it must be tall enough to be seen (0.72)
        // and long enough to look like a strut (1.5).
        add(geometry.panel, secondary, side * 4.6, -1.0, 0.05, 0.24, 0.72, 1.5);
        // One dark ring at the exhaust end only (the a100 lesson: a second
        // ring at the intake turns a pod into a stack of tubes).
        add(geometry.nozzle, dark, side * 4.6, -1.5, 0.85, 0.95, 0.95, 0.95);
        // A light intake lip at the front of the pod. A high-bypass fan's fat
        // white cowl is the single most airliner-ish detail there is, and it
        // also stops the nacelle from reading as a missile at thumbnail size.
        add(geometry.nozzle, primary, side * 4.6, -1.5, -2.5, 1.0, 1.0, 0.55);
        // Cold, small and grey: an airliner at cruise thrust, not a burner.
        // Pulled in to 1.25 (the pod's aft rim is at z ~0.9 and the nozzle
        // ring at 0.85) because at 1.75 the plume stood off the back of the
        // pod as a detached dark spike in the side view, which read as a
        // stores pylon rather than as exhaust.
        addFlame(side * 4.6, -1.5, 1.25, 0.5, 0.5);

        // ---- Identity 2: the window row -------------------------------------
        // Nine cabin windows down each side at y 0.72, each a small glass
        // chip proud of the skin, 1.55 apart from z -8.6 to 3.8. Painted with
        // the canopy material so they read as GLAZING - a dotted emissive
        // line down a white hull - rather than as panel gaps. No other
        // airframe in the game has anything repeating along its fuselage.
        // Raised to y 0.95 from 0.72 after round 3: at 0.72 the window row and
        // the cheatline below it were 0.54 apart and merged into one blue
        // smear in the side view, collapsing two separate identity cues into
        // one. Windows now sit high on the shoulder of the tube where a real
        // cabin's do, a clear 0.77 above the band, and the two read as a
        // dotted line ABOVE a solid line - which is the actual livery.
        for (let i = 0; i < 9; i += 1) {
          add(geometry.panel, canopy, side * 0.93, 0.95, -8.6 + i * 1.55, 0.14, 0.3, 0.55);
        }
        // ---- Identity 3: the blue cheatline ---------------------------------
        // One continuous blue band under the window line, running the full
        // cabin (z -9.6..6.2), standing 0.04 proud so it never z-fights the
        // tube. Below the windows, the classic exchange-flight livery.
        add(geometry.panel, accent, side * 0.99, 0.18, -1.7, 0.1, 0.3, 15.8);
      }

      // ---- Tail -------------------------------------------------------------
      // A CONVENTIONAL swept fin with the tailplane on the FUSELAGE - both
      // military heavies here are T-tails, so the empty fin tip is itself a
      // silhouette cue. Fin in the hull white with the blue band across it;
      // stab in the wing grey, mounted at the tailcone.
      add(geometry.fin, primary, 0, 0.85, 10.3, 1.0, 1.5, 1.1);
      // The tail band: a blue slab thicker than the fin (0.36 against 0.33)
      // so it paints both faces, crossing the fin mid-height the way a
      // neutral commission marks its aircraft.
      add(geometry.panel, accent, 0, 4.2, 9.95, 0.36, 0.85, 2.3);
      // Tailplane in the hull white for the same reason the wing is: the whole
      // upper surface of this aircraft is white and the only colour on it is
      // the one blue band. Kept small (0.78 span scale) against the fin so the
      // conventional low-set tail cannot be misread as a T-tail bar.
      add(geometry.tailWing, primary, 0, 0.65, 10.8, 0.78, 1, 0.85);

      // ---- Details ----------------------------------------------------------
      // Nav lights on the geometric wingtips at the tip mid-chord.
      add(geometry.canopy, navL, -11.8, -0.55, 3.6, 0.14, 0.14, 0.14);
      add(geometry.canopy, navR, 11.8, -0.55, 3.6, 0.14, 0.14, 0.14);
    }
  });
}
