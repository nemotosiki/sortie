// B-52 STRATOFORTRESS - Sera (US-family) eight-engine strategic bomber.
//
// Enemy/support-only registration: no AIRCRAFT_ORDER entry ({ order: false }),
// no CAMPAIGNS edit, no mission touched, no balance pass. Every flight, damage
// and AI number below is inherited wholesale from the closest existing heavy
// and carries a BALANCE TODO. The work in this file is the SHAPE.
//
// ---------------------------------------------------------------------------
// WHY THIS AIRFRAME EXISTS ALONGSIDE THE INLINE "bomber"
// ---------------------------------------------------------------------------
//
// The inline chain already answers `bomber` and its comment names it a B-52H.
// That branch is NOT touched and cannot be: addAircraftModel refuses any
// variant the chain answers, and the add-only rule is the point. What that
// model actually draws, measured off the source, is FOUR single pods - one
// nacelle each at x 5.1 and 8.4 with one nozzle and one flame apiece - hung
// under a LOW wing at y 0.62 on a body whose centreline is y 0. Eight engines
// is the one thing about a Stratofortress that no other aircraft on earth
// shares, and that model does not have them.
//
// So this is the same real aircraft drawn to its actual defining feature, and
// the three identity points below are chosen to be exactly the ones the inline
// heavy lacks. Where the two ever appear together they read as the same type;
// where a player looks closely, this one is the one that counts to eight.
//
// ---------------------------------------------------------------------------
// SHAPE IDENTITY - the three things that must survive at thumbnail size
// ---------------------------------------------------------------------------
//
// 1. EIGHT ENGINES IN FOUR TWIN PODS. Not four engines, and not eight separate
//    pods: four fairings hung on pylons below and AHEAD of the wing, each one
//    carrying TWO intake mouths side by side and TWO nozzles side by side.
//    Sixteen visible round openings on the aircraft, in four groups of four.
//    Each pod is 3.9 wide - 12% of the aircraft's own span - with its two
//    barrels at +/-0.95 inside it standing proud of the fairing's underside,
//    and a dark splitter rib down the centre of the block. So at any range
//    where the pods resolve at all the pairing resolves with them; and at
//    ranges where it does not, four fat pods still outnumber the C-17's four
//    thin singles and sit far outboard of the B-1B's two centreline blocks.
//    This is the whole reason the file exists and the one feature that must
//    never be compromised.
//
// 2. A LONG THIN HIGH WING THAT DROOPS. Half-span 16.6 on a 6.4 root chord,
//    so the aircraft is WIDER THAN IT IS LONG (drawn 1.15 against a real
//    1.16) - true of nothing else in the roster, and the proportion that makes
//    the top view unmistakable. Highest aspect ratio in the game by a wide
//    margin, past the Bear's 13.2 and the inline bomber's 12.5. Mounted on the
//    SPINE at y 1.05 rather than on the belly, and given real ANHEDRAL: the
//    wing is added in three spanwise pieces, the outer two rolled 8 and 19
//    degrees DOWN, so the tips sit 2.7 units below the root. Every other wing
//    in the game is a flat plate. The real aircraft's wing sags visibly on the
//    ground and flexes up in flight, and the droop plus the outboard gear pods
//    are what make it read as a wing too big for the fuselage it is bolted to.
//
// 3. ONE ENORMOUS FIN. A 5.6-tall slab on a 6.6 root chord - taller than the
//    fuselage is long from the cockpit forward, and more than twice the height
//    of anything else in the roster - on a broad dorsal fillet, with NOTHING
//    beside it. The tail is a single slab on the centreline. Round 1 drew it
//    at 4.2 and against a 33-unit span it vanished; on this aircraft the fin
//    has to be sized against the WING, not against the body, because the wing
//    is what sets the viewer's sense of scale. Combined with the wide low-set
//    tailplane it makes the aft end a cross, which no twin-finned airframe in
//    the roster can imitate.
//
// ---------------------------------------------------------------------------
// SCALE - measured off the live models, not guessed
// ---------------------------------------------------------------------------
//
// What ends up on screen is (the model's own z-extent) x theme.scale, so the
// scale factor cannot be read off a ladder - it depends on how long the model
// was drawn. Measured on the two heavies this aircraft has to agree with:
//
//   inline "bomber"   nose tip z -15.55 (cone at -12.4, the shared `nose` is
//                     4.2 long at sz 1.5 -> 3.15 forward of centre) to the
//                     tail-turret barrels at 12.33 = 27.88 model x scale 2.20
//                     = 61.34 world, for a real 48.5 m  -> 1.265 world/m
//   B-1B (payload)    -13.9 to 14.6 = 28.5 model x 1.94 = 55.3 world for a
//                     real 44.5 m                       -> 1.243 world/m
//
// This is the SAME real aircraft as the inline heavy, so it has to come out at
// the same world length - 61.3, not a hair more. Measured on the built parts
// rather than on the intent: the forebody cone sits at z -12.6 at sz 1.35 and
// the shared `nose` is 4.2 long, so its tip is at -15.43, and the tail-turret
// barrels end at 12.9 + 0.92 = 13.82. That is 29.25 model units of AIRFRAME.
// (The pitot boom reaches -15.70 and the flames trail past the tail, but a
// whisker and a light are not length - the inline heavy's own 27.88 is
// measured cone-tip to barrel on the same terms, so the two ladders compare.)
//
// scale = 61.34 / 29.25 = 2.097, rounded to 2.10, giving 61.4 world = 1.266
// world/m: within 0.1% of the inline heavy and 1.8% of the Lancer's ladder.
//
// Span: a real 56.4 m is 28.2 m of half-span = 35.7 world at 1.266 = 17.0
// model units, and the wing is drawn out to 16.6 flat - which the droop then
// folds in to a projected 16.29 - rather than to a comfortable number. Round 1
// followed the inline heavy's 12.5 instead and the result was measurably
// wrong: drawn span over drawn length came out 0.94 against the real
// aircraft's 56.4/48.5 = 1.16, and in the render the wing read as a fighter's
// - barely twice the tailplane, with the pods crowding the tips. A
// Stratofortress is WIDER THAN IT IS LONG, which is true of nothing else in
// the roster, and that single proportion is what makes the silhouette
// unmistakable. At 16.29 projected the drawn ratio is 2 x 16.29 / 29.25 =
// 1.11, against the real 1.16 - the 4% shortfall is the droop, and paying it
// is the right trade because the sag is itself identity #2.
//
// The slenderness rides on top of that: 16.6 of half-span on a 6.4 root chord
// is a half-aspect of 2.6, against the Bear's 13.2 on 6.8 = 1.94, the inline
// heavy's 12.5 on 6.0 = 2.08 and the C-17's 11.4 on 7.0 = 1.63. It is by a
// wide margin the most slender planform in the game, which is correct - the
// real B-52's aspect ratio of 8.5 is roughly triple a fighter's - and the
// taper does the rest: the chord falls from 6.4 at the root to 1.5 at the tip,
// so the outer third is nearly a blade.
//
// tipSpan follows the DRAWN tip after the droop rotation, not the flat one, so
// the contrail leaves the geometry rather than a station in mid-air.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;
  const strato = AIRCRAFT_TYPES.bomber;
  const stratoAI = ENEMY_AI_PROFILES.bomber;
  if (!strato || !stratoAI) {
    throw new Error("[b52] expected the bomber (HEAVY BOMBER) aircraft and AI templates to exist");
  }

  // Sera (US) heavy palette, taken off the inline bomber's line so the two read
  // as the same air force, then pulled toward the real aircraft's late-service
  // scheme: a darker, flatter charcoal over the same grey-green. The accent is
  // the lightest of the three here rather than the darkest, because on this
  // airframe it paints the FOUR PODS - identity #1 - and those have to separate
  // from a dark wing seen from below, which is the angle a player fights a
  // bomber stream from. The inline heavy paints its pods in `accent` too but
  // its accent is 0x20262a, darker than either body tone, so its pods sink into
  // the wing instead of standing off it.
  const theme = {
    primary: 0x474f52,
    secondary: 0x2e3538,
    accent: 0x6c777c,
    canopy: 0x8fe0ff,
    exhaust: 0x9fb0b8,
    scale: 2.10,
    variant: "b52"
  };

  // BALANCE TODO: placeholder. Every performance number below is the inline
  // B-52H's, spread through unchanged - same speeds, same rates, same 290 HP,
  // same zero missile capacity. This is the same real aircraft, so inheriting
  // wholesale is the correct placeholder rather than a lazy one; if the two
  // ever need to differ it is a balance decision made with the roster in view,
  // not here.
  ctx.addAircraft("b52", {
    ...strato,
    id: "b52",
    label: "B-52 STRATOFORTRESS",
    role: "Strategic Bomber",
    tag: "ENEMY",
    enemyOnly: true,
    blurb: "セラ軍の八発戦略爆撃機。主翼下に2基ずつ束ねたエンジンポッドを4つ吊り下げ、垂れ下がるほど細長い高翼と一枚の巨大な垂直尾翼を持つ。鈍重だが極めて頑丈で、尾部に後方防御銃座を備える。",
    // Where the contrail leaves the airframe, in MODEL units before scale. The
    // outer wing panel's drawn tip is at x 16.6, but the panel is rolled 19 deg
    // down about a hinge at x 11.0, so the tip's actual x is 11.0 + 5.6*cos19 =
    // 16.29. 16.2 keeps the ribbon on the panel rather than off its edge. tipZ
    // is the tip chord's centre: the panel spans z 8.4 to 9.9 out there, so 9.2.
    tipSpan: 16.2, tipZ: 9.2,
    theme
  }, { order: false });

  // BALANCE TODO: placeholder. The inline B-52H's heavy-bomber AI, spread
  // unchanged apart from the two numbers that would be visibly wrong on a
  // model of a different size: the tail-turret station and the label. Behaviour
  // (never pursues, never evades, rear gun only) is inherited on purpose - it
  // is the same aircraft and the same threat.
  ctx.addEnemyProfile("b52", {
    ...stratoAI,
    label: "B-52",
    // Local z of the turret (12.4) times this model's scale (2.10) = 26.0, so
    // the tracers leave the aircraft where the geometry ends - the same
    // contract the inline heavy (10.8 x 2.2 = 24) and the Lancer follow.
    rearGunOffset: 26,
    theme: { ...theme }
  });

  ctx.addAircraftModel("b52", {
    // Top view in the shared 40x44 box, nose up. Traced off the built geometry
    // rather than drawn freehand: the airframe runs z -15.4 (radome tip) to
    // 13.2 (turret barrels) on a 16.6 half-span, and every vertex below is a
    // real part station run through x = 20 + 1.084*mx, y = 2.0 + 1.399*(mz +
    // 15.4) - so the outline and the aircraft cannot drift apart. The z scale
    // is 4% tighter than a strict fit so the tailplane clears the swept
    // wingtips; at HUD size a tail touching the wing reads as one blob.
    //
    // Reading down the page: a long fine forebody, then the WING, which is the
    // whole outline. It reaches the full width of the box (x 2 and 38) while
    // the fuselage never leaves x 18.3-21.7, so the glyph is essentially a
    // long thin cross - and no other silhouette in the table is. The tips sit
    // at y 35-37, nearly as far aft as the tailplane at 40-42, because 35 deg
    // of sweep on a span this wide carries them there; that near-collision of
    // wingtip and tailplane is itself part of the read.
    //
    // The pods are NOT cut into the outline. Round 1 drew them as four notches
    // standing ahead of the leading edge and at HUD size they turned the wing
    // into a dashed line - the outline is 40 px wide in the rack, so a 2-px
    // notch is noise rather than information. The pod count is carried by the
    // model, where it can actually be resolved; the glyph carries the span.
    silhouette:
      "M20 2 L21 7.5 L21.5 16.3 L21.6 18.8 L21.7 19.1 L25 23.5 " +
      "L31.9 29.8 L38 35.3 L38 37.4 L31.9 33.2 L25 29 L21.8 28.3 " +
      "L21.6 32.5 L21.5 37.2 L26.9 39.9 L26.9 41.7 L21.2 41.3 " +
      "L21 42 L19 42 L18.8 41.3 L13.1 41.7 L13.1 39.9 L18.5 37.2 " +
      "L18.4 32.5 L18.2 28.3 L15 29 L8.1 33.2 L2 37.4 L2 35.3 " +
      "L8.1 29.8 L15 23.5 L18.3 19.1 L18.4 18.8 L18.5 16.3 L19 7.5 Z",

    build(env) {
      const {
        geometry, extrudedSurface, verticalSurface,
        primary, secondary, accent, canopy, dark, light, navL, navR,
        add, addFlame
      } = env;

      // ---- Planforms ------------------------------------------------------
      // THE wing, and it is drawn in THREE spanwise pieces rather than one
      // mirrored surface, because identity #2 is the droop and a single
      // extruded plate cannot bend. The centre section is flat and carries the
      // roots; the mid and outer panels are separate one-sided surfaces added
      // twice each with a roll angle, so the wing steps down in two stages and
      // reads as a continuous sag rather than a hinge.
      //
      // Two stages, not one: a single 15 deg panel off the root put the whole
      // droop in one crease at the fuselage side, which reads as a broken wing.
      // Breaking it at x 4.6 (inboard pod station) and 9.4 (outboard pod
      // station) puts each crease exactly where a pylon already interrupts the
      // line, so the eye reads the pylons and not the joints.
      //
      // Sweep: 35 deg on the real aircraft, and it is held all the way out -
      // the leading edge moves 9.5 of z across 13.6 of span (35.0 deg exactly).
      // The chord narrows from 6.4 at the root to 1.6 at the tip, which is the
      // taper that makes a 13.6 half-span read as slender instead of vast.

      // Centre section: root chord 6.4 (z -3.2 to 3.2), out to the first pod
      // station at 4.6 where the LE has reached z -0.0. Full-span, added once
      // on the centreline like every other wing in the game.
      const wingCentreB52 = extrudedSurface([
        [0, -3.2], [4.6, 0.0], [4.6, 3.9], [0, 3.2],
        [-4.6, 3.9], [-4.6, 0.0]
      ], 0.3);

      // Mid panel: ONE side only (+x) with its inboard edge on the hinge line
      // at x 0, so it can be added twice with opposite roll. Runs 6.4 further
      // out (to the aircraft's x 11.0) and drops the chord from 3.9 to 2.4.
      // The inboard edge duplicates the centre section's outboard edge exactly
      // (z 0.0 to 3.9), so the two meet with no notch at any roll angle small
      // enough to be a droop.
      const wingMidB52 = extrudedSurface([
        [0, 0.0], [6.4, 4.48], [6.4, 6.88], [0, 3.9]
      ], 0.28);

      // Outer panel: 5.6 more span (to the aircraft's x 16.6) closing to a 1.5
      // tip chord. This is the piece that carries the nav light and the
      // contrail station, and the one rolled hardest. Long and very narrow -
      // 5.6 of span on chords of 2.4 and 1.5 - because the outer third of a
      // B-52 wing is nearly a blade, and that is where the slenderness reads.
      const wingOuterB52 = extrudedSurface([
        [0, 4.48], [5.6, 8.4], [5.6, 9.9], [0, 6.88]
      ], 0.24);

      // Tailplane. Wide - 6.4 half-span against the inline heavy's tailWing at
      // sx 1.25 (6.4 as well) - and swept to match the wing, because on the
      // real aircraft the tailplane is nearly as big as a fighter's whole wing
      // and it is what makes the tail read as a cross rather than a fin on a
      // stick. Low-set, at the base of the fin, not on top of it: that is the
      // difference from the C-17 and the Il-76 in the same roster.
      const stabB52 = extrudedSurface([
        [0, -1.9], [6.4, 1.6], [6.4, 3.0], [2.0, 2.6],
        [-2.0, 2.6], [-6.4, 3.0], [-6.4, 1.6]
      ], 0.28);

      // THE fin - identity #3. Drawn rather than scaled off `geometry.fin`
      // because the shared fin is a fighter's proportion (3.9 tall on a 3.45
      // root chord) and stretching it vertically thins the chord to a blade.
      // This is a 6.6 root chord on a 5.6 blade with a large leading-edge
      // sweep and a wide 3.0 tip chord: a slab, not a blade. On the real
      // aircraft the fin folds sideways to fit a hangar, which is the kind of
      // thing only an absurdly large fin needs to do.
      //
      // 5.6 rather than round 1's 4.2, and the reason is the wing: against a
      // 33-unit span a 4.2 fin was a bump on the spine. The fin has to be
      // sized against the biggest thing on the aircraft or it does not read as
      // enormous, which is the entire point of it.
      //
      // verticalSurface maps shape +x onto model -z, so a swept-BACK fin puts
      // its tip chord at NEGATIVE shape-x relative to the root: the root spans
      // -3.3..3.3 and the tip -3.3..-0.3, which rakes the leading edge aft.
      const finB52 = verticalSurface([
        [-3.3, 0], [3.3, 0], [-0.3, 5.6], [-3.3, 5.6]
      ], 0.3);

      // ---- Body -----------------------------------------------------------
      // Long and SLAB-SIDED, and deliberately narrow: sx 0.98 against the
      // inline heavy's 1.0 and the C-17's 1.35. The Stratofortress fuselage is
      // a 5 m tube under a 56 m wing, and the aircraft only reads correctly if
      // the body looks undersized for the planform bolted to it. Three
      // overlapping sections so the 28-unit length has no visible rim.
      add(geometry.fuselage, primary, 0, 0, -3.4, 0.98, 0.94, 1.55);
      add(geometry.fuselage, primary, 0, 0, 4.6, 0.94, 0.9, 1.1);
      add(geometry.rearBody, primary, 0, 0.02, 10.4, 0.9, 0.86, 1.5);
      add(geometry.nose, primary, 0, 0.02, -12.6, 0.9, 0.86, 1.35);
      // Stepped airliner flight deck, WELL forward and standing proud of the
      // spine (y 0.86, sy 0.52). This is the opposite of the B-1B's flush
      // shallow glazing in the same roster and it is deliberate: the real
      // B-52's cockpit is a bump on top of a tube, and the step is half of why
      // the forebody reads as 1950s rather than as a modern blended nose.
      add(geometry.canopy, canopy, 0, 0.86, -9.8, 0.62, 0.52, 1.5);
      // Anti-glare panel forward of the windscreen.
      add(geometry.panel, dark, 0, 0.72, -11.6, 0.56, 0.08, 2.2);

      // ---- The wing, drooping ---------------------------------------------
      // Identity #2. Everything is hung at y 1.05 - ON the spine, above the
      // body's centreline - which is the high-wing mounting the inline heavy's
      // y 0.62 low wing does not have, and it is what puts the pods far enough
      // above the ground line to hang beneath the wing without burying them in
      // the fuselage.
      const WING_Y = 1.05;
      add(wingCentreB52, secondary, 0, WING_Y, 0.4);
      // Mid panels at 7 deg down. The hinge sits at the aircraft's x 4.6 and
      // the panel is added with side-mirroring done by the roll sign: rz is
      // negative on the right (+x) panel to drop its tip, positive on the left.
      // Each mirrored copy also needs its planform flipped, which `add` cannot
      // do - so the left panel uses the same surface rotated by pi about y is
      // not available either. Instead the panel is drawn symmetric in the sense
      // that matters: its outline is defined in +x only and the LEFT copy is
      // placed with a negative x scale, which mirrors the shape about the
      // hinge exactly the way addWingPivot does for the swing-wing airframes.
      const MID_DROOP = 0.140; // 8.0 deg
      add(wingMidB52, secondary, 4.6, WING_Y, 0.4, 1, 1, 1, -MID_DROOP);
      add(wingMidB52, secondary, -4.6, WING_Y, 0.4, -1, 1, 1, MID_DROOP);
      // Outer panels at 19 deg down, hinged at the aircraft's x 11.0 where the
      // mid panel ends. Its own droop has already dropped that station to
      // y 1.05 - 6.4*sin8 = 0.16, so the outer panel is placed there rather
      // than at WING_Y: hanging it off the undropped height would leave a step
      // in the leading edge exactly where the outboard pod pylon crosses it.
      //
      // The two angles are steeper than round 1's 7/15 because the span grew:
      // droop is only legible as the VERTICAL DROP at the tip, and the same
      // angles on a longer wing would have read as a flatter one. 8 and 19 put
      // the tip 2.9 below the root against round 1's 1.7, which is what makes
      // the front view show a wing hanging off its roots rather than a plank.
      const OUTER_Y = WING_Y - 6.4 * Math.sin(MID_DROOP);
      const OUTER_DROOP = 0.332; // 19.0 deg
      add(wingOuterB52, secondary, 11.0, OUTER_Y, 0.4, 1, 1, 1, -OUTER_DROOP);
      add(wingOuterB52, secondary, -11.0, OUTER_Y, 0.4, -1, 1, 1, OUTER_DROOP);

      // ---- EIGHT ENGINES IN FOUR TWIN PODS --------------------------------
      // Identity #1, and the reason the file exists.
      //
      // Stations: inboard pair at x 4.5, outboard at 10.6 - 28% and 65% of
      // half-span. Both are set just INBOARD of their droop hinges (4.6 and
      // 11.0) so each pod hangs from the flat part of its panel rather than
      // straddling a crease, and both stand a long way AHEAD of the local
      // leading edge: the pod noses reach z -5.6 and -1.4 against leading edges
      // at -0.07 and 4.20, so each pod projects 5.5 units of clear fairing in
      // front of the wing. That forward offset is as much of the identity as
      // the pairing - engines tucked under a wing are invisible from every
      // angle a player actually fights from, and the top view is the one that
      // has to carry the count.
      //
      // The four stay spread across the INNER TWO THIRDS of the wing: pushed
      // further out they crowd the tip and the wing loses the clean outer blade
      // that carries its slenderness, and pulled further in they bunch against
      // the fuselage and read as the B-1B's two centreline blocks.
      //
      // Y: the wing is a 0.3-thick plate at y 1.05 (inboard) and 0.16
      // (outboard), so pod centres at -0.4 and -1.1 leave a clear gap of about
      // 0.8 that the pylons visibly bridge. Both follow the droop down; hung at
      // one height they would float above the drooped outer panel and the wing
      // would stop reading as drooping at all.
      //
      // Each pod: one wide fairing block (sx 1.55 - wider than the 0.72 barrel
      // separation, so the two tubes sit INSIDE one body) with TWO nacelle
      // tubes, TWO intake mouths and TWO nozzles side by side. Sixteen circular
      // openings on the aircraft, in four groups of four. Drawing eight
      // separate single pods was tried and rejected: at any distance they merge
      // into an unreadable row, and the real aircraft's read is four objects
      // each of which turns out to be two.
      // Sizes are set against the WING, not against the fuselage. Round 2 grew
      // the span to 16.6 and left the pods at their round-1 size; on a 33-wide
      // aircraft a 2.9-wide pod is 9% of span and from above the four of them
      // read as small tabs under the leading edge rather than as the aircraft's
      // main feature. These are 3.9 and 3.5 wide (12% and 11% of span) with the
      // barrels pushed out to +/-0.95 inside them, so each pod is unmistakably
      // TWO tubes in one fairing at the size the preview actually renders.
      const POD_HALF = 0.95;
      const pods = [
        { x: 4.5, y: -0.4, z: -2.6, s: 1.0 },
        { x: 10.6, y: -1.1, z: 1.3, s: 0.9 }
      ];
      for (const side of [-1, 1]) {
        for (const pod of pods) {
          const px = side * pod.x;
          // The shared pod fairing, in `accent` - the LIGHTEST tone on the
          // aircraft, so four pale blocks stand off a dark wing from below.
          add(geometry.panel, accent, px, pod.y, pod.z, 3.9 * pod.s, 1.6 * pod.s, 6.0 * pod.s);
          // Pylon bridging the visible gap up to the wing underside. Thin in x
          // (0.36) and deep in z so it reads as a strut, not as a second body.
          add(geometry.panel, secondary, px, pod.y + 0.9 * pod.s, pod.z + 1.0, 0.36, 1.6, 3.0);
          for (const eng of [-1, 1]) {
            const ex = px + eng * POD_HALF * pod.s;
            // The nacelle barrel, standing PROUD of the fairing's underside
            // rather than sunk flush into it (y -0.2 below the block centre, on
            // a block 1.6 deep): round 2 buried them and from every angle but
            // dead astern each pod was a plain slab. The two tubes have to
            // break the block's own outline for the pairing to exist.
            add(geometry.rearBody, accent, ex, pod.y - 0.2, pod.z + 0.4, 0.78 * pod.s, 0.78 * pod.s, 1.7 * pod.s);
            // Intake mouth: a dark ring at the front of each barrel. TWO per
            // pod, and this is the count the player can actually make from the
            // forward quarter.
            add(geometry.intakeRing, dark, ex, pod.y - 0.2, pod.z - 2.9 * pod.s, 0.74 * pod.s, 0.74 * pod.s, 1.0 * pod.s);
            // Nozzle and exhaust: TWO per pod again, so the count survives from
            // directly behind as well.
            add(geometry.nozzle, dark, ex, pod.y - 0.2, pod.z + 2.9 * pod.s, 0.9 * pod.s, 0.9 * pod.s, 1.0);
            addFlame(ex, pod.y - 0.2, pod.z + 4.1 * pod.s, 0.64 * pod.s, 0.64 * pod.s);
          }
          // Splitter rib down the middle of the pod's nose, between the two
          // mouths, and running the full depth of the block in `dark`. One per
          // pod, and it is what stops the twin barrels reading as one wide oval
          // opening at distance - the dark line down the centre is the cheapest
          // possible statement of "this is two of something".
          add(geometry.panel, dark, px, pod.y - 0.15, pod.z - 1.2 * pod.s, 0.18, 1.5 * pod.s, 3.6 * pod.s);
        }
        // Outrigger gear pods on the drooping outer panel, out at x 14.8 -
        // 89% of half-span. The real aircraft carries its outboard wheels out
        // here because the wing sags far enough to touch the runway, so these
        // are the droop's consequence made visible, and no other airframe in
        // the game has anything hanging that far out. Placed on the drooped
        // panel's own line so they sit under the wing rather than beside it.
        const outriggerY = OUTER_Y - (14.8 - 11.0) * Math.sin(OUTER_DROOP) - 0.5;
        add(geometry.rearBody, secondary, side * 14.8, outriggerY, 7.2, 0.42, 0.42, 0.85);
      }

      // ---- Tail -------------------------------------------------------------
      // Identity #3. The fin goes on a broad dorsal fillet that runs forward
      // along the spine, so the slab grows out of the body instead of being
      // planted on it. Fillet first, fin on top of it.
      add(geometry.panel, secondary, 0, 0.62, 6.4, 0.42, 0.5, 8.4);
      add(finB52, secondary, 0, 0.68, 9.4);
      // Rudder hinge line, so the slab has one vertical division on it and does
      // not read as a blank plate. Runs the full height of the taller fin.
      add(geometry.panel, dark, 0, 3.0, 10.6, 0.1, 4.2, 0.12);
      // Tailplane low at the fin root - NOT a T-tail. Set at y 0.3 so it sits
      // below the fillet and the cross reads clearly from behind.
      add(stabB52, primary, 0, 0.3, 10.2);

      // Tail turret at z 12.4: the tracer origin in attemptEnemyAttack is the
      // same point (rearGunOffset 26 = 12.4 x scale 2.14), so the guns are
      // visibly where the rounds come from.
      add(geometry.panel, dark, 0, 0.1, 11.8, 0.95, 0.8, 1.2);
      add(geometry.missileBody, dark, -0.3, 0.1, 12.9, 0.5, 0.5, 0.45);
      add(geometry.missileBody, dark, 0.3, 0.1, 12.9, 0.5, 0.5, 0.45);

      // ---- Details ---------------------------------------------------------
      // Radome cap and pitot boom on the tip of the forebody.
      add(geometry.nose, dark, 0, 0.02, -14.4, 0.32, 0.3, 0.35);
      add(geometry.panel, dark, 0, 0.02, -15.2, 0.06, 0.06, 1.0);
      // Chin blisters: the real aircraft's forward-looking TV and IR turrets,
      // two small domes under the nose. They are the only thing on the
      // underside of the forebody and they date the airframe as clearly as the
      // stepped deck does.
      add(geometry.canopy, light, -0.42, -0.62, -11.4, 0.28, 0.24, 0.34);
      add(geometry.canopy, light, 0.42, -0.62, -11.4, 0.28, 0.24, 0.34);
      // Bomb-bay door outline down the belly, between the wing roots.
      add(geometry.panel, dark, 0, -0.8, -1.0, 1.1, 0.1, 6.0);
      // Dorsal spine from the deck back to the fillet.
      add(geometry.panel, secondary, 0, 0.72, -3.0, 0.3, 0.2, 9.0);
      // Nav lights on the drooped outer tips. Placed at the panel's real tip
      // station - x 11.0 + 5.6*cos19 = 16.29, y OUTER_Y - 5.6*sin19 - so the
      // lights sag with the wing instead of floating at the undropped height.
      const TIP_X = 11.0 + 5.6 * Math.cos(OUTER_DROOP);
      const TIP_Y = OUTER_Y - 5.6 * Math.sin(OUTER_DROOP);
      add(geometry.canopy, navL, -TIP_X, TIP_Y, 9.5, 0.16, 0.16, 0.16);
      add(geometry.canopy, navR, TIP_X, TIP_Y, 9.5, 0.16, 0.16, 0.16);
    }
  });
}
