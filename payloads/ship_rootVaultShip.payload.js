// ROOT VAULT SHIP - a 250m container hull built around a fortress strongroom.
//
// ROOT's key custody, put to sea. The design brief is one sentence: a merchant
// hull that stopped being a merchant. Everything in the silhouette follows
// from that, and every choice is made AGAINST the cargoShip, because the two
// share a hull family and a 50m length difference is not a silhouette.
//
//   * THE CITADEL. One monolithic armoured block standing amidships where a
//     freighter carries its tallest bay of boxes. 44m long, 30m wide, rising
//     from the weather deck at y 14 to a flat crown at y 50 - a 36m tower on a
//     250m hull, and the ONLY tall mass forward of the stern. It is banded with
//     GLOWING SLITS: four ranks of narrow emissive strips down both flanks and
//     across the bow face, drawn with markings (unlit MeshBasicMaterial), so
//     they hold their brightness at every range and in every light the map has.
//     A container stack is many small boxes in many colours; this is one big
//     box in one colour with light coming out of it. That is the whole read,
//     and it survives at thumbnail size where a paint difference does not.
//   * A RADOME PAIR, one forward of the citadel at z -74 and one aft at z +66,
//     mounted on short pylons so they stand clear of the deck line. Spheres are
//     the one shape nothing else on this hull has - the cargoShip's only round
//     thing is a bulbous bow at the waterline - and a matched fore-and-aft pair
//     reads as deliberate equipment rather than as a mast fitting.
//   * DARK PAINT. The hull is drawn in `dark` rather than `hull`, which is the
//     inverse of every other surface unit here: the fleet wears grey and the
//     freighter wears a container rainbow, so a black 250m hull is separable
//     from both before any detail resolves.
//   * The container heritage is kept but demoted: two short, LOW bays (two
//     tiers, one colour each) on the forecastle and quarterdeck, so the hull
//     still reads as a box boat while the citadel is unmistakably the point.
//     Three colours in five-tier stacks is the cargoShip's signature and is
//     deliberately NOT repeated.
//
// Scale (bow at -Z, y up from the waterline). LOA 250m: the hull core runs
// z -108..+118 with a 17m bow wedge ahead of it, so stem to transom is
// -125..+125. That is the arsenal's length exactly, measured the same way, and
// the aegis' 155m is the calibration both are written against. Beam 38m: a
// 250m box boat is 6.6:1 L/B, wider than the 200m cargoShip's 32m (6.25:1 at
// its own length, so 38 is the same proportion grown) and visibly narrower
// than the arsenal's deliberately barge-like 44m (5.7:1). The deck plane sits
// at y 14, matching the cargoShip's high merchant freeboard rather than the
// arsenal's low warship sheer - a vault ship is a wall-sided box.
//
// Registration only: SHIP_TYPES entry + hull geometry. No mission fields it,
// nothing is added to AIRCRAFT_ORDER, and no balance table is touched.
export default function register(ctx) {
  const { SHIP_TYPES } = ctx.tables;

  // The cargoShip is the template rather than the aegis: this hull is a
  // freighter that has been militarised, so it should inherit a freighter's
  // handling, a freighter's (empty) gun fit and a freighter's absent
  // subsystems, not a destroyer's. Every combat number rides in on the spread
  // and none of it has been tuned here - see the BALANCE TODO below.
  const cargo = SHIP_TYPES.cargoShip;
  if (!cargo) {
    throw new Error("[ship-rootVaultShip] SHIP_TYPES.cargoShip is the template and is missing");
  }

  // ---------------------------------------------------------------------------
  // Hull geometry constants, shared by the SHIP_TYPES box below and by build().
  // These are not independent numbers: each is written against the line of
  // build() that draws the hardware it measures, and both places say so.
  //   deck plane        y 14.0     (weather deck, high merchant freeboard)
  //   citadel           z -8 +/-22, x +/-15, y 14 -> 50   (the strongroom)
  //   forward radome    z -74, y 25.5, r 6.4
  //   aft radome        z  66, y 25.5, r 6.4
  //   bridge crown      z  98, y 14 -> 44                 (aft accommodation)
  //   funnel cap        z 112, y 46
  // ---------------------------------------------------------------------------

  ctx.addShipType("rootVaultShip", {
    ...cargo,
    key: "rootVaultShip",
    surface: true,
    label: "VAULT",
    role: "Mobile Key Vault",

    // ---- Dimensions: 250m LOA, 38m beam -------------------------------------
    // Measured off the hull this file draws, on the fleet's own conventions:
    // hitBox.z is the full LOA, crash.halfLen is half of it, and the stern/bow
    // offsets are where the wake and the bow spray pin. The cargoShip's 200m
    // numbers (hitRadius 92, halfLen 100, hitBox.z 200) scale by 1.25 to this
    // hull's length, and the arsenal's 250m numbers (hitRadius 128, halfLen
    // 124, hitBox.z 252) are the independent check that they land right.
    hitRadius: 118,
    // `top` is where a crashing aircraft is stopped, so it is measured off the
    // tallest SOLID mass drawn - the citadel crown at y 58, which stands above
    // the aft bridge (44) and the radome caps (42). The mast above the bridge
    // runs to y 60 and is deliberately excluded, for the same reason the
    // cargoShip excludes its crane booms: an aeroplane goes through a pole,
    // not into it.
    crash: Object.freeze({ halfLen: 125, halfBeam: 20, top: 58 }),
    // y 66 is waterline to masthead; z 250 is the full LOA; x 40 is the beam
    // plus the bridge-wing overhang.
    hitBox: Object.freeze({ x: 40, y: 66, z: 250 }),
    sternOffset: 121,
    bowOffset: 123,
    blastSpread: 46,
    smokeOffset: 108,  // the funnel is aft with the accommodation block
    smokeHeight: 26,

    // BALANCE TODO: placeholder. hp / cruiseSpeed / turnRate / sinkDepth and
    // the whole disarmed gun block (aaMounts [] / aaHeight 0 / aa range 0) are
    // the cargoShip's, inherited verbatim by the spread above and NOT tuned for
    // this hull. A 250m armoured vault ship should almost certainly be far
    // tougher and slower than a 200m freighter, and it is an open question
    // whether it should stay unarmed at all - none of that is decided here.
    // This file ships the shape.
    // BALANCE TODO: placeholder - `landing` is cleared for the same reason the
    // cargoShip clears it (the flag would steer the hull at the nearest beach),
    // and `subsystems` stays undefined, which keeps this hull on the pre-M9
    // lock path with nothing lockable on it. If the citadel is ever meant to be
    // a destroyable objective it wants a subsystem entry at { 0, 32, -8 } -
    // the centre of the block build() draws - but that is a mission decision.
    landing: false,
    subsystems: undefined,

    // Cold institutional blue-white on the radar rather than the cargoShip's
    // merchant orange-white, so a vault in a convoy is separable from the
    // freighters it hides among.
    radarColor: "#cfe2ff",
    // BALANCE TODO: placeholder - inherited tracer/explosion colours. Nothing
    // on this hull fires, so tracerColor is dead weight carried by the spread.
    tracerColor: cargo.tracerColor,
    explosionColor: cargo.explosionColor
  });

  ctx.addShipModel("rootVaultShip", {
    build(env) {
      const { geometry, add, friendly, makeAircraftMaterial,
              hull, deck, house, dark, light, markings, extraMaterials } = env;

      // Two authored materials, both of which MUST go into extraMaterials or
      // they leak with every hull that sinks (the one leak path a payload hull
      // has). Neither can come from the five themed materials: those are hull
      // grey / deck grey / house grey / shadow / white, and this ship needs a
      // near-black for the vault plating and a hot amber for the slit glow.
      //
      // Consequence of being extra rather than standard: neither flashes white
      // on a hit. For the slits that is correct - a light source does not
      // flash - and for the vault plate it is the price of having a colour no
      // themed material offers.
      const vaultPlate = makeAircraftMaterial(friendly ? 0x1a222e : 0x20242a, 0.42, 0.5);
      extraMaterials.push(vaultPlate);
      // The slit glow. MeshBasicMaterial via makeAircraftMaterial would still
      // take lighting, so this is deliberately built as an emissive-looking
      // standard material with a bright base and low roughness; the `markings`
      // material (unlit MeshBasicMaterial, near-white) does the actual glowing
      // strips, and this one is the warm surround that sells them as apertures
      // rather than as painted lines.
      const slitSurround = makeAircraftMaterial(friendly ? 0x2b6ea8 : 0xb8791f, 0.1, 0.35);
      extraMaterials.push(slitSurround);

      // =====================================================================
      // 1. Hull - 250m x 38m, dark, high freeboard
      // =====================================================================
      // Painted in `dark`, not `hull`. Every other surface unit in the game is
      // grey; this one is the black hull, and that is a third of the "not a
      // cargoShip" read on its own. `hull` is still used, sparingly, for the
      // raised forecastle and the transom so the black is not a flat void.
      //
      // Core slab z -108..+118 = 226m of parallel body on a 250m LOA, 38m
      // beam, 14m of freeboard (deck edge y 14, same as the cargoShip's 13 at
      // its own smaller scale). The slab STOPS at the bow wedge's base rather
      // than running out to the stem, which is the lesson the arsenal's header
      // records: run it further and the wedge sits inside the slab and the ship
      // ends in a squared block with a triangle recessed in it.
      add(geometry.panel, dark, 0, 7, 5, 38, 14, 226);
      // Boot topping at the waterline. Kept thin and in `hull` grey: on a black
      // hull the usual dark stripe is invisible, so the band has to be LIGHTER
      // than the plating rather than darker. This is the one place the standard
      // scheme is inverted, and it is what stops the hull reading as a
      // silhouette cut out of the sea.
      add(geometry.panel, hull, 0, 1.1, 5, 38.6, 2.2, 227);
      // Raked stem: a shallow merchant wedge, not a combatant's knife.
      // geometry.shipBow is a four-sided cone whose scale is a RADIUS: sx is
      // the half-beam of its base. The aegis calibrates it - a 19m hull carries
      // sx 9.5, exactly half - so a 38m hull wants sx 19 to meet the slab
      // flush. sy 17 is the -Z run (stem lands at z -125 = the LOA) and sz 14
      // matches the freeboard so the wedge is the full depth of the hull side.
      add(geometry.shipBow, dark, 0, 7, -116, 19, 17, 14, -Math.PI / 2);
      // Bulbous bow at the forefoot, the one genuinely round thing below the
      // waterline and the merchant tell this hull keeps from its ancestry.
      add(geometry.shipCylinder, hull, 0, 2.6, -122, 3.2, 9, 3.2, 0, 0, Math.PI / 2);
      // Squared transom.
      add(geometry.panel, dark, 0, 7, 118, 34, 14, 14);
      add(geometry.panel, hull, 0, 7, 124.4, 30, 11, 1.4);
      // Hull-side armour belt: a raised strake running the length of the
      // parallel body at deck-edge height. On a black hull this is the only
      // thing that gives the side a horizon line in profile, and it is the
      // structural cue that the plating is thick.
      add(geometry.panel, hull, -19.2, 11.4, 5, 1.6, 2.2, 214);
      add(geometry.panel, hull, 19.2, 11.4, 5, 1.6, 2.2, 214);

      // =====================================================================
      // 2. Weather deck
      // =====================================================================
      add(geometry.panel, deck, 0, 14.4, 2, 36, 1.2, 216);
      // Deck-edge coaming down both sides, so what stands on the deck reads as
      // set into it rather than balanced on a plate.
      add(geometry.panel, dark, -17.4, 15.6, 2, 1.6, 2.4, 214);
      add(geometry.panel, dark, 17.4, 15.6, 2, 1.6, 2.4, 214);
      // Raised forecastle with mooring gear and a plain pole mast, in `hull`
      // grey so the bow end is not a black void. The forecastle deck ends at
      // z -100 and the stem at -125, so nothing here overhangs the wedge.
      add(geometry.panel, hull, 0, 16.6, -106, 26, 3.2, 22);
      add(geometry.shipCylinder, dark, -6, 19.4, -111, 1.6, 1.6, 1.6);
      add(geometry.shipCylinder, dark, 6, 19.4, -111, 1.6, 1.6, 1.6);
      add(geometry.shipCylinder, light, 0, 25, -100, 0.6, 12, 0.6);

      // =====================================================================
      // 3. THE CITADEL - the identity
      // =====================================================================
      // One monolithic strongroom amidships, z -30..+14 (44m long), x +/-15
      // (30m wide in a 38m beam, so it very nearly fills the deck), standing
      // from the deck at y 14 to a flat crown at y 50. 36m tall on a 250m hull.
      //
      // The proportions are chosen against the cargoShip's peak container bay,
      // which tops out at y 41.4 over a 34m x 26m footprint of small
      // multicoloured boxes. This is ONE box, taller than that peak, and it is
      // near-black. The two hulls cannot be confused from above, from the side
      // or in silhouette, which is the requirement.
      // Grown in the third pass. At 44m long and topping out at y 50 the block
      // was the tallest thing on the ship but not the DOMINANT one: in the side
      // elevation the enlarged radomes (cap y 42) and the aft block plus funnel
      // read as three comparable masses, and a fortress that is merely the
      // biggest of several deck structures is not a fortress. 56m of length and
      // a crown at y 58 puts the citadel a clear head above everything else and
      // makes it a fifth of the whole hull.
      const CIT_Z = -8;
      const CIT_LEN = 56;
      const CIT_HALF_W = 16;
      const CIT_BASE = 14;
      const CIT_TOP = 58;
      const CIT_H = CIT_TOP - CIT_BASE;             // 36
      const CIT_MID = CIT_BASE + CIT_H / 2;         // 32

      // A plinth one metre proud of the block on every face, so the tower
      // stands ON something instead of growing out of the deck. Drawn first so
      // the block's own faces win the depth fight where they overlap.
      add(geometry.panel, house, 0, 15.6, CIT_Z, CIT_HALF_W * 2 + 4, 3.2, CIT_LEN + 4);
      // The block itself.
      add(geometry.panel, vaultPlate, 0, CIT_MID, CIT_Z, CIT_HALF_W * 2, CIT_H, CIT_LEN);
      // Corner buttresses: four narrow full-height pilasters at the block's
      // corners, in `house` grey. They break the flanks into panels, which is
      // what makes a 30x44x36 box read as ARMOUR rather than as a shipping
      // container blown up to twenty times its size. Without them the earlier
      // read was "one very large crate".
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          add(geometry.panel, house,
              sx * (CIT_HALF_W - 0.4), CIT_MID, CIT_Z + sz * (CIT_LEN / 2 - 1.4),
              3.4, CIT_H - 1.5, 3.4);
        }
      }
      // Crown: a heavy overhanging cap slab plus a dark inner deck, so the top
      // of the tower is a defined edge from directly above - the angle the
      // player spends most of a strafing run at.
      add(geometry.panel, house, 0, CIT_TOP + 0.9, CIT_Z, CIT_HALF_W * 2 + 5, 1.8, CIT_LEN + 5);
      add(geometry.panel, dark, 0, CIT_TOP + 2.4, CIT_Z, CIT_HALF_W * 2 - 3, 1.2, CIT_LEN - 3);

      // ---- The glowing slits ----------------------------------------------
      // Four ranks of narrow apertures down both flanks and across the forward
      // face. Each aperture is TWO meshes: a recessed warm surround in
      // `slitSurround` and a thinner white bar in `markings` laid on top of it.
      // `markings` is the hull's unlit MeshBasicMaterial - it takes no shading
      // from the preview's key light and none from the map's sun - so the bar
      // is exactly as bright at 4km as it is at 400m, which is the whole reason
      // the glow survives at thumbnail size. The surround does take light, and
      // that difference is what makes the pair read as depth rather than as a
      // decal.
      //
      // FIVE ranks at y 21 / 27.5 / 34 / 40.5 / 47, evenly spread over the
      // block's 44m between the plinth and the crown with clearance at both
      // ends. Four ranks were right for the 36m block of the first two passes;
      // keeping four on a 44m block would have stretched the spacing until the
      // flank read as a few stripes on a wall rather than as a stack of
      // apertures, so the rank COUNT grows with the height and the 6.5m pitch
      // stays where it was.
      const SLIT_YS = [21, 27.5, 34, 40.5, 47];
      for (const y of SLIT_YS) {
        for (const sx of [-1, 1]) {
          // Flank rank. Set 0.25m OUTBOARD of the block's own face at
          // CIT_HALF_W so the strips are not z-fighting with the plating they
          // sit on. Length 44 against the block's 56 leaves the buttressed
          // corners clear at both ends.
          add(geometry.panel, slitSurround, sx * (CIT_HALF_W + 0.25), y, CIT_Z, 0.7, 2.2, 44);
          add(geometry.panel, markings, sx * (CIT_HALF_W + 0.55), y, CIT_Z, 0.5, 1.1, 43);
        }
        // Forward face rank, on the bow-facing end of the block at z -36.
        // Shorter (25 of the 32m width) so the corner pilasters stay solid.
        add(geometry.panel, slitSurround, 0, y, CIT_Z - CIT_LEN / 2 - 0.25, 25, 2.2, 0.7);
        add(geometry.panel, markings, 0, y, CIT_Z - CIT_LEN / 2 - 0.55, 24, 1.1, 0.5);
      }
      // One vertical slit up the centreline of the forward face, crossing all
      // four ranks. This is the vault-door line: it is what turns four
      // horizontal bands into a face with a middle, and it reads from dead
      // ahead where the horizontal ranks foreshorten to nothing.
      add(geometry.panel, slitSurround, 0, CIT_MID, CIT_Z - CIT_LEN / 2 - 0.25, 3.4, CIT_H - 6, 0.7);
      add(geometry.panel, markings, 0, CIT_MID, CIT_Z - CIT_LEN / 2 - 0.55, 1.6, CIT_H - 7, 0.5);
      // Crown lighting. The first pass put four small plates at the cap corners
      // and the plan view showed a blank black lid: from directly above, the
      // flank and bow slit ranks all foreshorten to nothing, so the entire
      // identity vanished in the one view where this ship is a rectangle and
      // the cargoShip is a rectangle. The fix is to put the glow ON the top
      // face as a shape, not as four dots.
      //
      // A cross of glowing seams down the crown's centrelines - one running
      // fore-and-aft the length of the block, one athwartships across its
      // width - which is the vault-door split read from above and the thing
      // that separates this deck plan from a container bay at a glance.
      add(geometry.panel, slitSurround, 0, CIT_TOP + 2.9, CIT_Z, 3.6, 1.1, CIT_LEN - 4);
      add(geometry.panel, markings, 0, CIT_TOP + 3.3, CIT_Z, 1.8, 0.6, CIT_LEN - 5);
      add(geometry.panel, slitSurround, 0, CIT_TOP + 2.9, CIT_Z, CIT_HALF_W * 2 - 4, 1.1, 3.6);
      add(geometry.panel, markings, 0, CIT_TOP + 3.3, CIT_Z, CIT_HALF_W * 2 - 5, 0.6, 1.8);
      // Four corner beacons on the cap, enlarged from the 2.2 plates of the
      // first pass which were below the size a plan view resolves at all.
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          add(geometry.shipOctPlate, markings,
              sx * 11.5, CIT_TOP + 3.1, CIT_Z + sz * 16.5, 3.4, 0.5, 3.4);
        }
      }

      // =====================================================================
      // 4. The radome pair
      // =====================================================================
      // Fore at z -74 and aft at z +66, both on the centreline, both the same
      // size. geometry.shipCylinder is the only round primitive the ship set
      // offers, so a "dome" is built as a short fat drum with a narrower drum
      // capping it - which from any distance is a radome, and up close is
      // honest about being made of two cylinders.
      //
      // The pair is what makes this hull scan as equipment-carrying rather than
      // cargo-carrying: a freighter has nothing spherical above its deck, and
      // one radome could be a mast fitting while two matched ones bracketing
      // the citadel are obviously a system.
      // Sized up substantially from the first pass, which drew a 6.4m dome on a
      // 5m pedestal: at that scale, against a 36m citadel and a 30m aft block,
      // both domes read as deck tanks sitting in the coaming rather than as
      // radar. A radome has to be a LANDMARK on the deck to be an identity
      // feature, so the dome is now 9m in radius on a 13m tower - 31m to the
      // cap, which is two thirds of the citadel's height and taller than
      // anything else on the weather deck.
      const radome = (z) => {
        // Lattice-free tower: a tapered two-stage pedestal that lifts the dome
        // clear of the deck edge, so it is a sphere on a stalk in profile
        // instead of a lump on a plate.
        add(geometry.panel, house, 0, 18.5, z, 13, 7, 13);
        add(geometry.panel, house, 0, 24.5, z, 9.5, 6, 9.5);
        // Skirt, equator drum, shoulder, cap - four stacked cylinders of
        // decreasing radius, which is as close to a hemisphere as this
        // geometry set gets, and enough steps that the profile curves.
        add(geometry.shipCylinder, house, 0, 28.4, z, 9, 3, 9);
        add(geometry.shipCylinder, light, 0, 32.4, z, 9, 6, 9);
        add(geometry.shipCylinder, light, 0, 36.6, z, 6.6, 3, 6.6);
        add(geometry.shipCylinder, light, 0, 39.2, z, 3.6, 2.6, 3.6);
        add(geometry.shipCylinder, light, 0, 41, z, 1.6, 1.6, 1.6);
        // Dark seam bands round the drum, so it reads as a panelled radome
        // rather than as a plain white can. Two bands, not one: a single band
        // at the waist looked like a join between two separate objects.
        add(geometry.shipCylinder, dark, 0, 30.2, z, 9.2, 0.7, 9.2);
        add(geometry.shipCylinder, dark, 0, 34.6, z, 9.2, 0.7, 9.2);
      };
      radome(-74);
      radome(66);

      // =====================================================================
      // 5. Demoted container heritage - two low bays
      // =====================================================================
      // The hull keeps its box-boat ancestry, but quietly: two SHORT bays of
      // TWO tiers each, one colour apiece, forward at z -50 and aft at z +40.
      // The cargoShip's signature is four bays of three to five tiers in three
      // interleaved colours; two flat two-tier blocks in single tones is
      // recognisably the same kind of cargo and unmistakably not the same read.
      //
      // The colours are muted rather than merchant-bright, because a vault ship
      // painting its deck cargo in shipping-line livery would undo the dark
      // hull it just bought.
      const boxColors = friendly ? [0x3d5670, 0x4a5c50] : [0x4a5364, 0x55604f];
      const crates = boxColors.map((color) => {
        const m = makeAircraftMaterial(color, 0.14, 0.88);
        extraMaterials.push(m);
        return m;
      });
      const TIER = 5.2;
      const DECK_Y = 15.0;
      // bay z centre, half-length, colour index. Both are clear of the citadel
      // (which runs z -36..+20 after the third pass grew it) and of the radomes
      // (z -74 and +66, each 13m wide on its pylon), which is why the centres
      // are -52 and +42 and both bays are short:
      //   fwd bay  -52 +/-8 = -60..-44   radome pylon ends at -67.5, citadel at -36
      //   aft bay   42 +/-8 =  34.. 50   citadel ends at 20, radome pylon at 59.5
      const BAYS = [
        { z: -52, half: 8, color: 0 },
        { z: 42, half: 8, color: 1 }
      ];
      for (const bay of BAYS) {
        // Lashing bridge at the foot: a dark band tying the bay to the deck.
        add(geometry.panel, dark, 0, DECK_Y + 0.8, bay.z, 28, 1.6, bay.half * 2 + 1);
        for (let t = 0; t < 2; t += 1) {
          // Three rows across, as on the cargoShip, so the pitch reads as
          // container-sized against a hull whose beam the player already knows.
          for (let c = 0; c < 3; c += 1) {
            add(geometry.panel, crates[bay.color],
                (c - 1) * 9, DECK_Y + 1.6 + t * TIER + (TIER - 0.4) / 2, bay.z,
                8.4, TIER - 0.4, bay.half * 2);
          }
        }
      }

      // =====================================================================
      // 6. Aft accommodation block and funnel
      // =====================================================================
      // The merchant layout the hull was born with, kept because it is what
      // says which end is the stern - and deliberately made SHORTER than the
      // citadel (crown y 44 against the vault's 50) so nothing out-reads the
      // strongroom. On the cargoShip the aft tower is the tallest thing afloat;
      // here it is the second tallest, and that inversion is itself part of the
      // difference between the two hulls.
      add(geometry.panel, house, 0, 29, 98, 18, 30, 22);
      // Deck banding: five thin dark lines = five accommodation levels.
      for (let d = 0; d < 5; d += 1) {
        add(geometry.panel, dark, 0, 18 + d * 5.2, 98, 18.4, 0.5, 22.4);
      }
      // Bridge deck, overhanging both sides, with a glazed strip across the
      // front face looking forward down the ship at the citadel.
      add(geometry.panel, house, 0, 46.5, 96, 26, 5, 14);
      add(geometry.panel, dark, 0, 47, 88.8, 25, 3.2, 1.2);
      add(geometry.panel, dark, 0, 49.3, 96, 26.6, 1, 14.6);
      // Bridge-wing consoles on the outboard tips.
      add(geometry.panel, light, -12.8, 46.5, 96, 1.6, 1.8, 5);
      add(geometry.panel, light, 12.8, 46.5, 96, 1.6, 1.8, 5);
      // Mast: pole, one navigation plate, a yard. Tallest point on the ship at
      // y 60, and excluded from crash.top for the reason the box records.
      add(geometry.shipCylinder, dark, 0, 55, 98, 0.6, 12, 0.6);
      add(geometry.shipOctPlate, light, 0, 57.4, 98, 1.6, 0.4, 1.6);
      add(geometry.panel, light, 0, 60, 98, 6.5, 0.4, 0.4);
      // Funnel abaft the block, with the dark cap band and twin uptakes.
      add(geometry.panel, house, 0, 31, 112, 11, 26, 12);
      add(geometry.panel, dark, 0, 43.4, 112, 11.6, 2.6, 12.6);
      add(geometry.shipCylinder, dark, -2.6, 46, 112, 1.5, 2.6, 1.5);
      add(geometry.shipCylinder, dark, 2.6, 46, 112, 1.5, 2.6, 1.5);

      // =====================================================================
      // 7. Hull markings
      // =====================================================================
      // Draft marks and a load line disc amidships - the civilian tell the hull
      // has not repainted over, and on black plating the white is the only
      // thing that gives the mid-hull side any scale at all.
      add(geometry.shockRing, markings, -19.4, 8, -6, 3, 3, 1, 0, -Math.PI / 2, 0);
      add(geometry.shockRing, markings, 19.4, 8, -6, 3, 3, 1, 0, Math.PI / 2, 0);
      add(geometry.panel, markings, -19.4, 8, -6, 0.4, 0.5, 14);
      add(geometry.panel, markings, 19.4, 8, -6, 0.4, 0.5, 14);
    }
  });
}
