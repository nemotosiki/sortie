// E-2D ADVANCED HAWKEYE - carrier-borne airborne early warning aircraft.
//
// Sera (US) fleet controller for M21/M22/M24/M36. Enemy/friendly support only:
// no hangar entry, no campaign wiring, no mission edits. This payload adds
// exactly one airframe (flight entry + AI profile + 3D model + HUD outline).
//
// SCALE DERIVATION (not a guess - the roster runs a consistent metre/unit rate):
//   F-16   model spans z -10.9..9.35 = 20.3 units at theme.scale 1.00 -> 15.03 m real
//   Tu-95  model spans z -13.9..12.5 = 26.4 units at theme.scale 2.30 -> 46.2 m real
//   both land on ~0.74 m per scaled unit.
// The E-2D is 17.6 m long / 24.6 m span, so it needs 23.8 x 33.2 scaled units.
// This model is drawn 18.4 units nose-to-tail with a 12.9 half-span, and
// theme.scale 1.30 puts it at 23.9 x 33.5 scaled units - correctly a little
// longer than the F-16 (20.3) and less than half the Tu-95 (60.7), while being
// the widest-for-its-length planform in the game, which is what a Hawkeye is.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;
  const transport = AIRCRAFT_TYPES.transport;
  const transportAI = ENEMY_AI_PROFILES.transport;

  if (!transport || !transportAI) {
    throw new Error("[e2d] expected the transport aircraft and AI templates to exist");
  }

  // Naval grey, matched to the F/A-18F carrier scheme already in the table
  // (primary 0xb9c2ca / secondary 0x707a85 / canopy 0x8fe0ff) so the Hawkeye
  // reads as the Hornet's deck-mate rather than a new faction. The accent is
  // the darker grey the real low-visibility scheme uses for the radome and
  // propeller spinners, and the exhaust is a warm turboprop stain rather than
  // the Hornet's blue-white afterburner - there is no afterburner here.
  const e2dTheme = {
    primary: 0xb9c2ca,
    secondary: 0x707a85,
    accent: 0x4a545e,
    canopy: 0x8fe0ff,
    exhaust: 0xffc79a,
    scale: 1.3,
    variant: "e2d"
  };

  // ---- 1. Flight entry -----------------------------------------------------
  // Spread from `transport`: the only other unarmed, enemy-only, propeller-slow
  // aircraft class in the table, so every required field arrives proven.
  // BALANCE TODO: placeholder. Every flight-model number below (speeds, rates,
  // damping, stall, HP) is the C-17's, unreviewed for a much smaller airframe.
  // Only identity, dimensions and theme are authored here.
  const { spw: _noPlayerSpecialWeapon, ...unarmedBase } = transport;
  ctx.addAircraft("e2d", {
    ...unarmedBase,
    id: "e2d",
    label: "E-2D ADVANCED HAWKEYE",
    role: "Carrier Airborne Early Warning",
    tag: "SUPPORT",
    enemyOnly: true,
    blurb: "空母から上がる艦載早期警戒機。背中の回転レドームで艦隊の目となり、迎撃機を管制する。武装は無い。",
    // Geometric wingtip, in model units, for the contrail anchor. Matches the
    // planform's half-span (12.9) and the wing's mid-chord z, so the vortex
    // leaves the actual tip.
    tipSpan: 12.9,
    tipZ: 1.6,
    theme: e2dTheme
  }, { order: false });

  // ---- 2. AI profile -------------------------------------------------------
  // BALANCE TODO: placeholder. Spread from the transport profile - unarmed
  // (attackRange 0 rejects every shot in attemptEnemyAttack), no rear gun, no
  // missile profile. Only the hitbox/explosion size and the radar colour are
  // authored, and both follow from this being a smaller aircraft than the C-17.
  const { rearGun: _noRearGun, rearGunOffset: _noRearGunOffset, ...unarmedAI } = transportAI;
  ctx.addEnemyProfile("e2d", {
    ...unarmedAI,
    label: "HAWKEYE",
    // 1.3 theme scale against the transport's 2.6, so half its hitbox.
    hitboxScale: 1.6,
    explosionScale: 1.15,
    // Orbits its station rather than transiting: a controller holds a racetrack.
    patrolPathScale: 0.3,
    verticalBias: 40,
    verticalAmplitude: 6,
    verticalFrequency: 0.18,
    radarColor: "#7ad4ff",
    tracerColor: 0x7ad4ff,
    explosionColor: 0xffc46a,
    theme: e2dTheme
  });

  // ---- 3. Model ------------------------------------------------------------
  ctx.addAircraftModel("e2d", {
    // Top view, 40x44 box, nose up. Drawn as one closed path from the nose,
    // clockwise down the right side and back up the left. What has to survive
    // at HUD size is the order of the reads: a very wide straight wing on a
    // stubby body, the disc overlapping the wing trailing edge, and FOUR
    // fins on the tailplane. The disc cannot be a separate subpath (the HUD
    // sets one `d`), so it is cut into the outline as a hexagonal bulge either
    // side of the fuselage at the wing's trailing edge - at 40px wide it reads
    // as the round thing on the back, which is the identification.
    silhouette:
      "M20 2 L22 5 L22.5 11 L22.5 15 L39 17 L39 21 L22.5 22.5 " +
      "L29 24 L32 28 L29 32 L22.5 33.5 L22.5 34.5 " +
      "L26 34.5 L26 41 L23.5 41 L23.5 36 L22.5 36 " +
      "L31 37 L31 43 L28.5 43 L28.5 38.5 L20 37.5 " +
      "L11.5 38.5 L11.5 43 L9 43 L9 37 L17.5 36 " +
      "L16.5 36 L16.5 41 L14 41 L14 34.5 L17.5 34.5 L17.5 33.5 " +
      "L11 32 L8 28 L11 24 L17.5 22.5 L1 21 L1 17 L17.5 15 L17.5 11 L18 5 Z",

    build(env) {
      const {
        geometry, extrudedSurface, verticalSurface,
        primary, secondary, accent, canopy, dark, light, navL, navR,
        add, addProp
      } = env;

      // ---- Planform -------------------------------------------------------
      // The E-2's wing is the widest-for-its-length surface in the game: half
      // span 12.9 on a fuselage only 18.4 long, and essentially UNSWEPT - the
      // leading edge rakes back barely 1.4 units over the whole half-span,
      // where every fighter here rakes 3-6. Straight and enormous is the first
      // read from above, and the only other unswept wing in the roster is the
      // A-10's (half-span 9.6 on a body of similar length). Constant thickness,
      // slight taper at the tip so the nav light has a facet to sit on.
      const wingHawkeye = extrudedSurface([
        [0, -2.9], [2.2, -2.7], [12.9, -1.5], [12.9, 1.2], [3.2, 2.6],
        [0, 2.7], [-3.2, 2.6], [-12.9, 1.2], [-12.9, -1.5], [-2.2, -2.7]
      ], 0.3);

      // The tailplane is unusually large because it carries the whole fin
      // group: half-span 6.6, chord 2.8. That is 51% of the wing's half-span
      // where a fighter's stabilator runs 60-70% of a much smaller wing, and it
      // has to stay WIDER than the 3.7-radius rotodome or the disc hides it in
      // plan view. Its span is what sets the fin spacing below - the outer pair
      // sits at the tips, the inner pair just outboard of the fuselage.
      const stabHawkeye = extrudedSurface([
        [0, -1.4], [6.6, -0.6], [6.6, 1.6], [2.2, 2.0],
        [-2.2, 2.0], [-6.6, 1.6], [-6.6, -0.6]
      ], 0.26);

      // One vertical fin, drawn short and broad with a rounded-off top: the
      // Hawkeye's fins are stubby paddles, not the tall swept blade
      // geometry.fin is. Four of these go on, and getting the proportion wrong
      // (using the shared tall fin) would read as a jet with a tail problem
      // rather than as a Hawkeye. Points are (z, y); `depth` becomes thickness
      // in x, the same convention geometry.fin is built with.
      // Chord 2.65 over height 2.3, and only 0.16 thick: a broad low paddle.
      // The leading edge rakes back and the tip is cut off short of the trailing
      // edge, which is the shape that stops four of them reading as a picket
      // fence. The shared geometry.fin is 3.9 tall on a 3.45 chord - far too
      // tall here, and using it was what made the first draft's tail look wrong.
      const finHawkeye = verticalSurface([
        [-1.3, 0], [1.35, 0], [1.25, 1.75], [0.35, 2.3], [-0.75, 2.05]
      ], 0.16);

      // The rotodome disc. extrudedSurface takes (x, z) points and lays the
      // result FLAT in the xz plane with `depth` as its thickness in y - which
      // is exactly a radar plate and the reason it cannot be a scaled
      // geometry.nozzle: that primitive's axis is z, so squashing it produces a
      // wedge, not a disc. Twelve-sided at radius 3.7, so 7.4 across - wider
      // than the tailplane and the single biggest feature on the aircraft.
      // Radius 3.4 - so 6.8 across against a 25.8 span, the 26% the real
      // aircraft runs (7.3 m dome on a 24.6 m span). Sixteen-sided rather than
      // twelve so the rim reads as round rather than as a stop sign in the
      // top-down view, where this is the largest thing on the aircraft.
      const domePoints = [];
      for (let i = 0; i < 16; i += 1) {
        const a = (i / 16) * Math.PI * 2;
        domePoints.push([Math.cos(a) * 3.4, Math.sin(a) * 3.4]);
      }
      // 0.95 thick: a lens, not a plate. The real dome is about 0.8 m on 7.3 m
      // and at that ratio it vanished completely in the pure side view, which
      // is one of the four angles this has to read from - so it is drawn
      // deliberately fatter than scale.
      const rotodome = extrudedSurface(domePoints, 0.95);
      // The dark antenna band around the rim: the same polygon at a slightly
      // larger radius and much thinner, so it shows as a stripe on the edge of
      // the plate rather than as a second disc.
      const domeRim = extrudedSurface(
        domePoints.map(([x, z]) => [x * 1.02, z * 1.02]), 0.2
      );

      // ---- Fuselage -------------------------------------------------------
      // Short and DEEP - the Hawkeye's fineness ratio is about 4:1 against a
      // fighter's 10:1 and the Tu-95's 12:1, and that stubbiness is a named
      // requirement. The shared cylinder is 11.5 long, so 0.66 in z gives a
      // 7.6-long barrel; holding x/y at ~1.15 makes it 2.6 wide against that,
      // which is the ratio. The Tu-95 uses the same primitive at 1.75 in z and
      // 0.9 across, so the two are opposite ends of the same knob.
      add(geometry.fuselage, primary, 0, 0, -0.9, 1.2, 1.16, 0.66);
      // Belly pannier under the cabin. The E-2's lower fuselage is a deep
      // slab-sided box holding the mission equipment, and adding it is what
      // takes the side profile from a 7:1 tube toward the ~4:1 the aircraft
      // actually has - the single thing that most makes it read as stubby.
      // y -1.85 clears the fuselage cylinder's own underside (bottom radius
      // 1.55 x 1.16 = 1.80 at its widest), so the box shows as a keel rather
      // than sitting invisibly inside the skin.
      add(geometry.panel, primary, 0, -1.62, -0.9, 1.85, 1.05, 6.4);
      // Fairing blending the keel's aft end up into the tail boom, so the box
      // ends in a taper rather than in a cut face.
      add(geometry.panel, primary, 0, -1.15, 2.9, 1.5, 0.85, 2.6);
      // Aft boom, tapering and lifting into the tail. Overlapped deliberately
      // with the cabin section (its forward end at z 1.4 against the cabin's
      // aft end at 2.9) so the two read as one continuous body rather than as
      // two cylinders with a step between them.
      add(geometry.fuselage, primary, 0, 0.34, 4.2, 0.86, 0.82, 0.48);
      // Short blunt radome. Cone height 4.2 x 0.52 = 2.2 long against the
      // F-16's 4.4 - a Hawkeye's nose is a stub, not a spike, and a long one
      // here was the single biggest thing wrong with the first draft.
      add(geometry.nose, primary, 0, 0.05, -4.6, 1.06, 1.0, 0.6);
      // Blunt cap on the tip. The shared cone comes to a point, which on a
      // 2.5-long radome reads as a spike from above; a small squashed sphere
      // sunk into the last of the cone rounds it off without becoming a bulb.
      add(geometry.canopy, primary, 0, 0.05, -5.55, 0.3, 0.28, 0.34);

      // Flight deck: a low windscreen band set into the forward upper fuselage,
      // not a fighter's bubble. Flattened in y so it reads as glazing.
      add(geometry.canopy, canopy, 0, 0.78, -3.3, 0.74, 0.4, 1.05);
      // Cheek windows down the cabin sides for the three radar operators - the
      // detail that says "crewed cabin" rather than "cockpit".
      add(geometry.canopy, canopy, -1.22, 0.2, -0.4, 0.14, 0.24, 1.8);
      add(geometry.canopy, canopy, 1.22, 0.2, -0.4, 0.14, 0.24, 1.8);

      // ---- High wing ------------------------------------------------------
      // Mounted on the SPINE at y 1.05, clear above the fuselage centreline, so
      // the nacelles hang under it with room for oversized discs. High wing
      // plus underslung props is the whole reason the propellers can be this
      // large, and it is also what keeps the dome's struts short.
      add(wingHawkeye, secondary, 0, 1.05, 1.5);

      // ---- Turboprop nacelles ---------------------------------------------
      // Two only - the Hawkeye's twin T56s, against the Tu-95's four nacelles
      // of contra-rotating pairs. One four-blade disc each, at the nacelle
      // NOSE and well ahead of the leading edge where it is visible from the
      // side, and NO flames anywhere: a turboprop has no afterburner, which is
      // the same rule the Bear follows.
      for (const side of [-1, 1]) {
        // Long nacelle slung under the wing, running from ahead of the leading
        // edge back past the trailing edge. rearBody is 3.1 long, so 1.9 in z
        // makes it 5.9 - as long as the cabin, which is what a T56 installation
        // looks like on an airframe this short.
        add(geometry.rearBody, secondary, side * 3.4, 0.5, 0.7, 0.88, 0.88, 1.9);
        // Pylon bridging nacelle top to wing underside.
        add(geometry.panel, secondary, side * 3.4, 1.0, 1.1, 0.36, 0.6, 2.6);
        // Spinner cone at the nacelle nose, then the disc in front of it.
        add(geometry.nose, accent, side * 3.4, 0.5, -3.2, 0.26, 0.26, 0.5);
        // Four-blade disc, radius 2.6 - so 5.2 across on a fuselage only 2.6
        // wide. Oversized props are the third read after the dome and the
        // fins, and undersizing them was the other clear miss in the first
        // draft. The two discs turn opposite ways (dir = side).
        addProp(side * 3.4, 0.5, -3.7, 2.6, side);
        // Main gear blister on the nacelle underside: the E-2 stows its mains
        // in the nacelles, and the bulge is a clear tell against a C-17.
        add(geometry.panel, secondary, side * 3.4, -0.35, 1.4, 0.66, 0.5, 2.4);
        // Jet-pipe stain aft of each nacelle, in the dark detail material.
        add(geometry.nozzle, dark, side * 3.4, 0.5, 3.3, 0.85, 0.85, 0.9);
      }

      // ---- Rotodome -------------------------------------------------------
      // THE feature: a 6.8-wide disc on struts above the wing. At theme scale
      // 1.3 that is 8.8 scaled units - larger than any single part on any other
      // airframe in the game, and wider than this aircraft's own tailplane.
      // domeY 3.05 puts the plate's underside about 1.4 clear of the wing
      // upper surface (y 1.05 + half the 0.3 extrusion), so the gap under the
      // disc is visible from the side and from both three-quarter views. A dome
      // resting on the wing reads as a slab of cargo, not as a radar.
      // domeZ 1.6 puts the disc's centre directly over the wing, which is where
      // it sits on the real aircraft and what stops it looking like a trailer
      // being towed behind the cabin. Its aft rim then overhangs to z 5.0,
      // leaving the tailplane at 6.9 clear of it in plan view.
      const domeY = 2.85;
      const domeZ = 1.9;
      // Bipod struts, canted outward, from the spine up to the disc underside.
      // Two struts, not one column: the daylight between them at this height is
      // what makes the disc read as mounted ON something.
      add(geometry.panel, secondary, -0.9, 1.9, domeZ, 0.34, 2.1, 1.9, 0.2);
      add(geometry.panel, secondary, 0.9, 1.9, domeZ, 0.34, 2.1, 1.9, -0.2);
      // Pintle the disc turns on, between the strut tops and the plate.
      add(geometry.panel, dark, 0, domeY - 0.5, domeZ, 0.8, 0.8, 0.8);
      // The plate, then the dark antenna band on its rim.
      add(rotodome, primary, 0, domeY, domeZ);
      add(domeRim, dark, 0, domeY - 0.15, domeZ);
      // Dorsal fairing under the strut feet, blending them into the spine.
      add(geometry.panel, secondary, 0, 1.2, domeZ, 0.9, 0.5, 4.2);

      // ---- Quadruple tail --------------------------------------------------
      // The second signature, and the reason the airframe cannot be confused
      // with anything else in the roster. FOUR vertical surfaces on one
      // tailplane: the aircraft has to fit a carrier hangar, so the fin area a
      // single tall fin would need is split four ways and kept under the deck
      // height limit. The outer pair sits at the tailplane tips (+/-5.35) and
      // is canted outward; the inner pair (+/-2.0) stands vertical. Only the
      // outer two carry rudders on the real aircraft, so the inner pair is
      // drawn slightly shorter - the asymmetry is what stops the four reading
      // as a fence.
      add(stabHawkeye, primary, 0, 0.6, 6.9);
      // Outer pair, at the tips and canted outward - these carry the rudders.
      add(finHawkeye, secondary, -6.3, 0.68, 6.9, 1.0, 1.15, 1.0, 0.22);
      add(finHawkeye, secondary, 6.3, 0.68, 6.9, 1.0, 1.15, 1.0, -0.22);
      // Inner pair, vertical and slightly shorter: on the real aircraft these
      // are fixed surfaces without rudders, and drawing them at the same height
      // as the outer pair is what would turn four fins into a fence.
      add(finHawkeye, secondary, -2.3, 0.68, 6.9, 0.9, 0.9, 0.92);
      add(finHawkeye, secondary, 2.3, 0.68, 6.9, 0.9, 0.9, 0.92);

      // ---- Carrier kit and details ----------------------------------------
      // Arrestor hook stowed under the tail boom - the same idiom the Hornet
      // and the Rafale M use, and the only other place rotation.x is set.
      add(geometry.panel, dark, 0, -0.85, 5.9, 0.14, 0.14, 2.6).rotation.x = 0.32;
      // Fat twin-wheel nose leg fairing, well forward under the flight deck and
      // ahead of the belly pannier.
      add(geometry.panel, dark, 0, -1.5, -4.3, 0.36, 0.6, 1.3);
      // Anti-glare panel ahead of the windscreen.
      add(geometry.panel, dark, 0, 0.86, -5.0, 0.6, 0.08, 1.6);
      // Refuelling probe on the spine, ahead of the dome struts.
      add(geometry.panel, dark, 0, 1.1, -2.6, 0.1, 0.1, 1.6);
      // Wingtip strobes at the geometric tips, so the contrail anchor at
      // tipSpan 12.9 and the lights agree. Red left, green right.
      add(geometry.canopy, navL, -12.95, 1.08, 1.6, 0.14, 0.14, 0.14);
      add(geometry.canopy, navR, 12.95, 1.08, 1.6, 0.14, 0.14, 0.14);
      // Underwing ESM antenna fairings, in the light detail material - the only
      // things hanging off the wing, because this aircraft carries no stores.
      add(geometry.missileBody, light, -7.6, 0.72, 1.3, 0.5, 0.5, 0.55);
      add(geometry.missileBody, light, 7.6, 0.72, 1.3, 0.5, 0.5, 0.55);
    }
  });
}
