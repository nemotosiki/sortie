// AN-124 RUSLAN - the biggest airframe in the roster, and a strategic
// outsize-cargo lifter rather than a tactical one.
//
// Elem support registration: no AIRCRAFT_ORDER entry ({ order: false }), no
// CAMPAIGNS edit, no mission touched, no balance table moved. The airframe
// exists so a mission can put an outsize-cargo flight in the sky; whether it is
// ever escorted, intercepted or flyable is a decision made elsewhere.
//
// Every flight number is inherited wholesale from the generic `transport` (the
// in-game C-17) and marked BALANCE TODO. The work in this file is the SHAPE and
// the PAINT.
//
// THE PROBLEM THIS FILE HAS TO SOLVE. The batch this airframe belongs to also
// contains a C-17 and an Il-76, and all three are "high wing, four turbofans,
// fat body". A silhouette that only says "big four-engined airlifter" is a
// FAILED silhouette here, because it describes three different aircraft. So the
// three identities below are chosen specifically as the things the other two do
// NOT have, and every one of them survives at thumbnail size:
//
//   1. SIZE. It is not merely large, it is a full step larger than the C-17
//      standing next to it - 1.30x its length and 1.41x its span (see the scale
//      derivation below). The wing is the single widest surface in the game.
//      A viewer with no reference will not see this; a viewer who has seen the
//      C-17 preview will, and that is the correct audience for the cue.
//   2. A LOW, CONVENTIONAL TAIL. This is THE identification against the C-17,
//      which carries a T-tail, and against the Il-76, which also carries one.
//      The tailplane on this aircraft is bolted to the AFT FUSELAGE at spine
//      height (y 3.16) with the fin standing free ABOVE and BEHIND it - so from
//      the side there is a clear gap of open air between the top of the
//      tailplane and the bottom of the fin, and from above the tailplane is
//      plainly a fuselage-level surface rather than a crossbar on a mast. A
//      T-tail draws a T; this draws a cross with the arms low on the stem.
//      The tailplane is also given real span (half-span 7.4 against the
//      C-17's 5.4 on a T-tail) so it cannot read as a small trim surface.
//   3. AN UPWARD-OPENING NOSE VISOR. The real Ruslan loads through the nose:
//      the entire flight-deck-forward section hinges up. It cannot be modelled
//      as an animation here, so it is modelled as the SEAM - a dark split line
//      running around the forward fuselage where the visor breaks, plus the two
//      hinge fairings on the crown of the nose that the seam runs into, plus
//      the visor's own lower lip standing slightly proud of the skin below it.
//      Neither the C-17 nor the Il-76 has anything at all in this location, so
//      a dark band around the nose is unambiguous even when the seam's exact
//      geometry is not legible.
//
// A fourth thing is worth naming because it is doing work even though it is not
// on the identity list: the upper-deck HUMP. The real aircraft's flight deck
// sits on top of the hold on a raised forward deck, which gives it a
// distinctive stepped crown. It is modelled here as a long low fairing running
// from the visor seam back past the wing root, and it is what keeps the fat
// body from reading as a plain tube.
//
// SCALE DERIVATION (measured off the live `transport` branch, not guessed).
// The in-game C-17 is the correct yardstick because it is the same class of
// aircraft and it is what this model has to be visibly bigger than:
//
//   its fuselage cylinder is 11.5 long and its nose cone 4.2 (apex at local
//   z -2.1); the radome `nose` at z -13.0 scaled sz 0.4 puts the tip at
//   -13.0 - 2.1*0.4 = -13.84, and the aft body `fuselage` at z 8.4 scaled
//   sz 0.9 puts its back face at 8.4 + 5.75*0.9 = 13.57. So the C-17 spans
//   27.41 model units, and 27.41 x its theme.scale 2.6 = 71.28 world units for
//   a real 53 m aircraft = 0.744 m per world unit.
//   Its half-span is tipSpan 11.4 x 2.6 = 29.64 world for a real 25.85 m
//   half-span = 0.872 m per world unit.
//
// The real An-124 is 69 m on a 73 m span, so this airframe must come out at
// 69/53 = 1.302x the C-17's length and 73/51.7 = 1.412x its span:
//   length  71.28 x 1.302 = 92.80 world
//   half-span 29.64 x 1.412 = 41.85 world
//
// MEASURED, not estimated: the assembled parts were run through an analytic
// AABB pass rather than added up by hand, because the first two rounds of this
// file both got the vertical arithmetic wrong in ways only the render caught
// (the wing was 1.33 units INSIDE the fuselage and the tailplane was entirely
// inside the aft body - see the ROUND 3 notes in build()).
//
// This model runs z -14.45 (radome blister) to +16.00 (fin trailing edge) =
// 30.45 model units on a half-span of 13.95, and theme.scale 3.0 puts it at
// 91.35 world long on a 41.85 half-span. That is 1.282x the C-17's length and
// 1.412x its span against real ratios of 1.302 and 1.412, so at the measured
// rates above the aircraft reads as 67.9 m x 73.0 m against a real 69 x 73:
// exact on span, 1.6% short on length, and correctly bigger by MORE in span
// than in length. That last part is the read that matters - the Ruslan is the
// wider aircraft even more than it is the longer one.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;
  const transport = AIRCRAFT_TYPES.transport;
  const transportAI = ENEMY_AI_PROFILES.transport;
  if (!transport || !transportAI) {
    throw new Error("[an124] expected the transport aircraft and AI templates to exist");
  }

  // Elem livery: white over grey, which is the civil-registered heavy-lift
  // scheme the real aircraft wears and the opposite of the C-17's uniform
  // military grey. `primary` is the white upper hull, `secondary` the grey the
  // wing and the lower hull are painted in, so from any angle the aircraft
  // reads as a WHITE aeroplane with GREY machinery hanging off it rather than
  // as one flat tone.
  //
  // primary is 0xf2f5f8 and not 0xffffff on purpose: this hull is not a medical
  // flight, and pure white is spoken for by the hospital transport in the same
  // batch. One step down from white still reads white against the preview's
  // 0x2a2f36 background while leaving the crosses-and-ambulance whites their
  // own register.
  //
  // exhaust is the warm 0xffcc9a of the Russian-built airframes already in the
  // roster rather than the Western blue-white, so a contact is identified as
  // Elem from directly astern before the planform resolves.
  const theme = {
    primary: 0xf2f5f8,
    secondary: 0x8d959d,
    accent: 0x5a636c,
    canopy: 0x9fd6ef,
    exhaust: 0xffcc9a,
    scale: 3.0,
    variant: "an124"
  };

  // BALANCE TODO: placeholder. Every performance number below is the in-game
  // C-17's, unchanged. Only identity, dimensions and paint are authored here.
  // The real Ruslan is heavier, slower to turn and tougher than a C-17 and the
  // numbers should eventually say so; maxHealth in particular is left at the
  // C-17's 196 rather than raised for the extra size, because raising it is a
  // balance decision and this file does not make those.
  ctx.addAircraft("an124", {
    ...transport,
    id: "an124",
    label: "AN-124 RUSLAN",
    role: "Strategic Heavy Airlifter",
    tag: "ENEMY",
    enemyOnly: true,
    blurb: "現存最大級の超大型輸送機。C-17を一回り上回る巨体と、上へ開く機首バイザーから戦車すら丸ごと呑み込む。低い位置の通常尾翼が同型の輸送機群との識別点。",
    // Geometric wingtip for the contrail. The wing planform's apex is at
    // half-span 13.95 and the wing is added at z 1.0, so the trail leaves the
    // actual tip of the widest surface in the game rather than a station copied
    // off the C-17.
    tipSpan: 13.95, tipZ: 1.0,
    theme
  }, { order: false });

  // BALANCE TODO: placeholder. The AI profile is the transport's template with
  // nothing but the label and the paint changed, so a Ruslan flies exactly like
  // the C-17 already in the game until someone tunes it.
  ctx.addEnemyProfile("an124", {
    ...transportAI,
    label: "AN-124",
    theme
  });

  ctx.addAircraftModel("an124", {
    // Top view in the shared 40x44 box, nose up. Traced off the model rather
    // than drawn freehand: every vertex is a real part station run through
    // x = 20 + 0.68*mx, y = 1.5 + 1.34*(mz + 14.45), so the outline and the
    // aircraft cannot drift apart. The x rate is deliberately much tighter than
    // the y rate because this aircraft is wider than it is long and a
    // proportional trace would run off both sides of the box.
    //
    // Reading down the page: the blunt visor nose, the enormous straight-taper
    // wing out to a squared tip at x 29.5, the parallel-sided hold, and then the
    // WIDE LOW TAILPLANE crossing the fuselage well short of the tail cone -
    // with the fin's own chord drawn as the narrow spike on the centreline
    // BEHIND it. The tailplane arms are the second-widest thing on the page and
    // they are not at the end of the aircraft: that pair of facts is the whole
    // difference from the C-17's T-tail in plan.
    silhouette:
      "M20.0 1.5 L20.9 4.0 L21.3 7.5 L21.3 18.3 L29.5 22.1 L29.5 25.0 " +
      "L22.4 28.4 L21.3 29.0 L21.3 34.3 L21.0 36.9 L25.0 38.4 L25.0 40.7 " +
      "L21.5 41.9 L20.7 41.9 L20.0 42.3 L19.3 41.9 L18.5 41.9 L15.0 40.7 " +
      "L15.0 38.4 L19.0 36.9 L18.7 34.3 L18.7 29.0 L17.6 28.4 L10.5 25.0 " +
      "L10.5 22.1 L18.7 18.3 L18.7 7.5 L19.1 4.0 Z",

    build(env) {
      const {
        geometry, extrudedSurface, verticalSurface,
        primary, secondary, accent, canopy, dark, light, navL, navR,
        add, addFlame
      } = env;

      // ---- Planforms ------------------------------------------------------
      // THE wing, and the widest surface in the game: half-span 13.95 against
      // the C-17's 11.4 and the B-52's 12.5. Straight-tapered with a modest
      // sweep, because the real Ruslan's wing is a 32 deg quarter-chord surface
      // built for load rather than the 25 deg high-aspect plank of a Hercules
      // or the sharply-swept high-aspect wing of a B-52.
      //
      // Two numbers here are doing identity work:
      // - ROOT CHORD 7.6 (against the C-17's 7.0 on a smaller aircraft). A wide
      //   root is what makes the wing look like it is carrying something. A
      //   scaled-up C-17 wing read as a glider's from above in the first pass.
      // - TIP CHORD 1.9, squared off rather than pointed. The real wing ends in
      //   a blunt tip with no winglet, and the absence of a winglet is a live
      //   difference from the C-17, which has a big canted one.
      //
      // ROUND 2: the first pass ran the leading edge from z -3.4 at the root out
      // to +2.5 at the tip - 5.9 of rake across 13.95 of span - and from above
      // it read as a swept fighter wing on a big fuselage, not as a heavy
      // lifter's. The real Ruslan's wing is a high-aspect load-carrying surface
      // whose leading edge barely moves aft; it is nothing like a bomber's.
      // The rake is now 3.0 across the same span, and the tip chord is 2.6
      // instead of 1.9, so what reads from above is a long straight-tapered
      // plank - which is the airlifter cue and the thing that must not be
      // confused with the B-52 sitting in the same table.
      //
      // ROUND 3 (from the render, and this is the third planform): round 2 put
      // the leading edge at z -4.1 root / -1.1 tip (3.0 of rake) but left the
      // trailing edge at 4.1 root / 1.5 tip - 2.6 of FORWARD rake. Two edges
      // raking towards each other draw an arrowhead, and from above the wing
      // read as a swept fighter planform on a fat body no matter how straight
      // the leading edge was. Both edges now rake AFT by a similar small amount
      // (LE 2.9, TE 2.3 across 13.95 of span), which is what a straight-tapered
      // plank actually is: the chord shrinks outboard, the surface does not
      // sweep. This is the single most load-bearing shape on the aircraft,
      // because the wing is 229 units of top-view area against the fuselage's
      // 88 - it IS the silhouette from above.
      const wingAn124 = extrudedSurface([
        [0, -4.2], [2.6, -4.0], [13.95, -1.3], [13.95, 0.9], [3.6, 3.4],
        [0, 3.9], [-3.6, 3.4], [-13.95, 0.9], [-13.95, -1.3], [-2.6, -4.0]
      ], 0.34);

      // THE TAILPLANE, and identity 2. Half-span 6.2 - wider than the C-17's
      // T-tail plane at 5.4 on a smaller aircraft - and modestly swept so it
      // reads as one design with the wing. It is deliberately NOT the shared
      // `stabTransport`, because that surface is authored to be carried on top
      // of a fin and the whole point of this one is that it is not.
      //
      // ROUND 2: grown from 6.2 half-span to 7.4 and from 0.28 to 0.40 deep.
      // At 6.2 it was legible in plan but vanished in the side and rear-quarter
      // views, and the LOW TAIL is this aircraft's headline identity - a
      // feature that only reads in one of four cells is not carrying it. At 7.4
      // it is over half the fuselage's own length in span and it is the second
      // widest surface on the airframe, which is roughly the proportion the
      // real aircraft's tailplane has and is impossible to miss from any angle.
      const stabAn124 = extrudedSurface([
        [0, -2.4], [7.4, 0.7], [7.4, 2.4], [2.2, 3.3],
        [-2.2, 3.3], [-7.4, 2.4], [-7.4, 0.7]
      ], 0.40);

      // The fin. Drawn here rather than taken from `geometry.fin` because the
      // stock fin's proportions are a fighter's - short chord, hard taper - and
      // this one has to be a broad, low-aspect transport fin whose LEADING EDGE
      // starts well forward of the tailplane it stands behind. verticalSurface
      // maps shape +x onto model -z, so the root's leading edge is the largest
      // positive x: 3.6 forward, -3.4 aft, blade height 4.6.
      const finAn124 = verticalSurface([
        [-3.4, 0], [3.6, 0], [-0.4, 4.6], [-2.6, 4.6]
      ], 0.32);

      // The dorsal fillet that carries the fin's leading edge down onto the
      // spine. Drawn as a vertical surface too, so it is a real wedge in
      // profile rather than a box: this is what makes the fin look rooted in
      // the fuselage instead of stuck on it, and on a low-tailed aircraft the
      // fin root is right where the eye goes to check whether the tailplane is
      // on the fin or not.
      const finFillet = verticalSurface([
        [-4.4, 0], [4.6, 0], [-3.6, 1.5]
      ], 0.34);

      // ---- Body -----------------------------------------------------------
      // A FAT hold, and the fattest in the game: sx 1.72 / sy 1.62 against the
      // C-17's 1.35 / 1.30 on a model that is already a third longer. The real
      // aircraft's cargo bay is 6.4 m wide and 4.4 m high and it is the reason
      // the type exists, so the body is authored to look like a container with
      // wings rather than a tube with a hold in it.
      //
      // Two sections rather than one, both parallel-sided, so the hold has a
      // constant cross-section over its whole length. The shared fuselage
      // cylinder tapers, and a single one stretched to this length drew a cone.
      //
      // ROUND 2: widened from 1.72/1.62 to 1.95/1.80. The first pass looked
      // like a long tube from every view; the hold has to look like a BOX with
      // a skin over it, because "you could drive a tank into this" is the one
      // thing the type is for. At 1.95 the body is wider than the C-17's by the
      // same margin the real cargo bays differ by (6.4 m against 5.5 m).
      add(geometry.fuselage, primary, 0, 0, -5.4, 1.95, 1.80, 1.27);
      add(geometry.fuselage, primary, 0, 0.12, 4.4, 1.88, 1.74, 0.72);
      // The upswept aft body over the rear ramp. Lifted and tapered, running
      // back to the tail cone at z 13.2 - the airlifter profile, and the reason
      // the tailplane below has clear air under it.
      add(geometry.fuselage, primary, 0, 1.05, 10.9, 1.48, 1.30, 0.66);
      add(geometry.rearBody, secondary, 0, 1.6, 14.0, 0.68, 0.62, 0.9);

      // ---- Nose and identity 3: the visor ----------------------------------
      // A BLUNT nose. The real aircraft's forward fuselage is a flat-fronted
      // hinged door with the radome bolted to the bottom of it, so the cone is
      // deliberately short (sz 0.92 on a body this size) and fat (sx 1.6),
      // which stops the front of the aircraft from tapering to a fighter's
      // point. The whole read is "the front of this thing opens".
      //
      // ROUND 2: the first pass added a second `nose` cone in `dark` at sz 0.95
      // as a radome, and because the shared cone is 4.2 long that drew a thin
      // black NEEDLE nearly 4 units out in front of the aircraft. In the top
      // and side cells it was the most prominent thing on the model and it read
      // as a refuelling probe or a pitot boom - the exact opposite of the blunt
      // door-fronted nose this aircraft needs. The needle is gone: the visor
      // cone is now the whole nose, made shorter (sz 0.80) and fatter (sx 1.82)
      // so the front of the aircraft is a rounded blunt face, and the radar is
      // a small rounded blister UNDER the chin rather than a cone in front.
      add(geometry.nose, primary, 0, 0.05, -11.9, 1.82, 1.66, 0.80);
      // Radome under the chin of the visor, not on its centreline: on the real
      // aircraft the weather radar has to live BELOW the hinge line or the door
      // cannot open. It is a squashed sphere (the `canopy` primitive in the
      // dark tone), not a cone, so it bulges rather than points.
      add(geometry.canopy, dark, 0, -1.05, -13.1, 1.05, 0.62, 1.35);

      // THE VISOR SEAM. A dark band standing very slightly proud of the skin,
      // wrapped round the forward fuselage at z -8.4 where the door breaks.
      // Three pieces because a single box cannot follow a round section: a
      // crown strip across the top and one strip down each flank, each set out
      // past the skin (x +/-1.62 against a body half-width of 1.60, crown at
      // y 1.42 against a body top of 1.30) so they are visibly ON the surface
      // and not sunk into it.
      //
      // The seam is thin in z (0.34) and long in the other two axes on purpose:
      // it has to read as a LINE. An early pass drew it 1.0 deep and it looked
      // like a painted band, which says nothing about the nose opening.
      //
      // ROUND 2: the seam did not read at all in the first render. Three things
      // were wrong and all three are fixed here. It was 0.34 deep, which is
      // sub-pixel at preview range - it is now 0.62, still a line against a
      // fuselage 21 units long but a line that actually has area. It was set
      // for a body half-width of 1.60 and the body is now 1.95, so the flank
      // strips floated inside the skin instead of on it. And it was one band;
      // there are now TWO parallel bands 1.5 apart, because a single dark line
      // on a hull reads as an arbitrary panel while a pair reads as a door and
      // its frame - which is what a nose that opens actually looks like.
      for (const seamZ of [-9.4, -7.9]) {
        add(geometry.panel, dark, 0, 2.68, seamZ, 3.60, 0.22, 0.62);
        add(geometry.panel, dark, -1.86, 0.15, seamZ, 0.20, 2.80, 0.62);
        add(geometry.panel, dark, 1.86, 0.15, seamZ, 0.20, 2.80, 0.62);
      }
      // The visor's lower lip: the door's bottom edge standing proud of the
      // skin below it, which is what a real split line looks like when the two
      // halves do not sit perfectly flush. Runs forward from the seam under the
      // chin, so from the side there is a visible step at z -8.4 and a lip
      // running away from it towards the radome.
      add(geometry.panel, secondary, 0, -1.58, -11.1, 2.40, 0.24, 3.40);
      // The two HINGE FAIRINGS on the crown of the nose, immediately aft of the
      // seam - the blisters the visor pivots on. They are the one piece of
      // geometry on this aircraft whose only possible explanation is an opening
      // nose, so they are set out at +/-0.9 and stood proud at y 1.34 where the
      // top-down and front-quarter views both catch them.
      add(geometry.panel, accent, -1.0, 2.80, -8.65, 0.62, 0.44, 1.30);
      add(geometry.panel, accent, 1.0, 2.80, -8.65, 0.62, 0.44, 1.30);

      // ---- The upper deck --------------------------------------------------
      // The flight deck sits ON TOP of the hold, aft of the visor seam, and it
      // is high and short. The real cockpit glass is a shallow band across the
      // front of a raised deck rather than a bubble, so sy is only 0.42 on a
      // 1.5-wide canopy.
      add(geometry.canopy, canopy, 0, 3.02, -7.0, 1.15, 0.50, 1.40);
      // The upper-deck fairing: a long low crown running from behind the visor
      // seam back over the wing centre section. This is what keeps the fat
      // body from reading as a plain cylinder, and it is why the flight deck
      // does not look bolted on.
      //
      // ROUND 3: at half-width 2.20 this fairing was WIDER than the fuselage it
      // sits on (1.95) and 10.6 long, so in the top view it covered the entire
      // spine as one flat grey slab - it swallowed the visor seam, buried the
      // wing root and tapered to a point at the front that made the blunt nose
      // read as sharp. Four separate problems, one part. It is now 1.05 half-
      // width (just over half the body) and stops short of the seam at z -6.4,
      // so it is a HUMP on a visible fuselage rather than a lid over it.
      add(geometry.panel, primary, 0, 2.92, -3.4, 1.05, 0.44, 7.60);

      // ---- The wing and its four engines ------------------------------------
      // The wing rides the SPINE at y 1.30, not the belly. High wing plus
      // underslung pods is the airlifter idiom; getting the wing low would make
      // this an airliner.
      //
      // ROUND 3 (measured, not eyeballed): the fuselage was widened to sy 1.80
      // in round 2, which puts the shared cylinder's crown at y 1.55*1.80 =
      // 2.79 - and the wing was still being added at y 1.46, so the entire wing
      // root was 1.33 INSIDE the fuselage. That is what made the top view read
      // as one grey mass with stubs coming out of it: the high wing, which is
      // the whole airlifter idiom, was not on top of anything. It now sits at
      // 2.72, just under the crown so the fillet still closes, with the surface
      // itself standing proud of the skin.
      add(wingAn124, secondary, 0, 2.72, 2.2);

      for (const side of [-1, 1]) {
        // Four pods slung UNDER the wing on pylons and AHEAD of its leading
        // edge, spaced 5.6 / 10.0 - much further apart than the C-17's 4.6 /
        // 8.2 because the wing they hang from is 22% wider. The inboard pair is
        // the larger, which is how the real aircraft's D-18T installation
        // looks under a wing that thins fast outboard.
        add(geometry.rearBody, secondary, side * 5.6, -0.55, -3.4, 1.05, 1.05, 1.85);
        add(geometry.rearBody, secondary, side * 10.0, -0.25, -0.6, 0.95, 0.95, 1.70);
        // Pylons visibly bridging the gap from pod to wing underside.
        add(geometry.panel, accent, side * 5.6, 1.76, -2.7, 0.30, 1.90, 1.70);
        add(geometry.panel, accent, side * 10.0, 1.86, 0.1, 0.28, 1.60, 1.60);
        // Intake lips at the front of each pod, in the light detail tone, so
        // the pods read as open ducts from the front quarter rather than as
        // grey sausages.
        add(geometry.nozzle, light, side * 5.6, -0.55, -6.2, 1.20, 1.20, 0.5);
        add(geometry.nozzle, light, side * 10.0, -0.25, -3.4, 1.10, 1.10, 0.5);
        // Nozzles and flames at the back of each pod.
        add(geometry.nozzle, dark, side * 5.6, -0.55, -0.7, 1.15, 1.15, 1);
        add(geometry.nozzle, dark, side * 10.0, -0.25, 1.9, 1.05, 1.05, 1);
        addFlame(side * 5.6, -0.55, 0.7, 0.68, 0.68);
        addFlame(side * 10.0, -0.25, 3.3, 0.62, 0.62);
        // The main-gear fairings down the lower fuselage flanks. The Ruslan
        // carries ten wheels a side in two long blisters, so these are longer
        // and deeper than the C-17's single pod - and they are a large part of
        // why the lower body looks heavy.
        add(geometry.panel, secondary, side * 2.62, -1.45, 0.6, 1.05, 1.05, 8.20);
      }

      // ---- The tail: identity 2 ---------------------------------------------
      // THE TAILPLANE, mounted on the AFT FUSELAGE at y 1.5 - spine height, not
      // fin height. Sitting at z 12.6 it crosses the upswept aft body well
      // short of the tail cone at 13.4.
      //
      // The fin is added SECOND and BEHIND it, rooted at z 11.6 with its blade
      // running from y 1.9 up to 6.5. That leaves 0.4 of open air between the
      // top of the tailplane surface and the bottom of the fin blade, which is
      // the entire visual difference from a T-tail: the tailplane is a separate
      // surface the fin does not touch. A first pass rooted the fin at y 1.5
      // and the two surfaces met, and from the side it read as a very short
      // T-tail rather than as a low tail.
      //
      // ROUND 2: the first pass put the tailplane at y 1.50 and the fin root at
      // y 1.90 - a 0.4 gap - and in the render the two simply touched. The gap
      // is now 1.1 (tailplane surface top at y 1.60, fin blade starting at
      // 2.70), which at this model's scale is a full fuselage-radius of clear
      // sky between them. It is deliberately more than a real Ruslan has,
      // because the question a viewer is answering at thumbnail size is binary
      // - "is the tailplane ON the fin or not" - and an ambiguous answer here
      // makes the aircraft a C-17.
      //
      // The tailplane also moved forward from z 12.6 to 11.8, so it crosses the
      // fuselage mid-way along the upswept aft body rather than out at the tail
      // cone. A tailplane at the very back of an aircraft reads as the end of
      // it; one that plainly has fuselage BEHIND it reads as a fuselage-mounted
      // surface, which is what it is.
      //
      // ROUND 3 (measured): the aft body runs y -0.97..3.07, so a tailplane at
      // y 1.40 was entirely INSIDE it - the low tail, which is this aircraft's
      // headline identity, was invisible in three of four cells for the same
      // reason the wing was. It is now at 3.16, sitting on the aft body's crown
      // where it is unambiguously a fuselage-mounted surface, with the fin
      // rooted above it.
      add(stabAn124, primary, 0, 3.16, 12.4);
      add(finFillet, primary, 0, 2.95, 9.8);
      add(finAn124, secondary, 0, 4.40, 12.6);
      // Fin cap fairing, so the top of the fin is squared like the real one's
      // rather than ending in the extrude's raw edge. It is also the one thing
      // up there that catches the key light, which stops the fin from
      // disappearing into the background in the side view.
      add(geometry.panel, secondary, 0, 8.92, 11.8, 0.42, 0.32, 2.40);

      // ---- Details -----------------------------------------------------------
      // The grey/white break line down each flank: the real aircraft's paint
      // scheme is white above and grey below with a hard line between, and
      // painting that line is what makes the hull read as a two-tone livery
      // rather than as a white tube with a shading problem.
      add(geometry.panel, secondary, -1.90, -0.55, -1.6, 0.16, 0.40, 17.0);
      add(geometry.panel, secondary, 1.90, -0.55, -1.6, 0.16, 0.40, 17.0);
      // Flight-deck anti-glare panel forward of the glass.
      add(geometry.panel, dark, 0, 3.22, -8.4, 1.30, 0.14, 1.00);
      // The rear ramp outline under the upswept aft body - the other end the
      // cargo comes out of.
      add(geometry.panel, accent, 0, -0.05, 10.4, 1.70, 0.16, 4.20);
      // Nav lights on the geometric tips of the widest wing in the game.
      add(geometry.canopy, navL, -13.9, 2.80, 2.2, 0.24, 0.24, 0.24);
      add(geometry.canopy, navR, 13.9, 2.80, 2.2, 0.24, 0.24, 0.24);
    }
  });
}
