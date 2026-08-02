// KA-52 ALLIGATOR - coaxial-rotor attack helicopter (Elem / Russian bloc).
//
// MODEL ONLY. `HELI_TYPES.ka52` is already registered by ground_heli_pack, so
// this payload calls `addHeliModel` and nothing else: no type, no missile
// profile, no balance number is touched here. Until now ka52 has been drawing
// the Hind, and the Hind is the single silhouette this aircraft must not be
// mistaken for.
//
// WHAT MAKES IT A KA-52 AND NOT A GUNSHIP-SHAPED BOX
//
//  1. COAXIAL ROTORS, NO TAIL ROTOR. This is the whole identity. Two contra-
//     rotating discs stacked on one mast at y 3.9 and y 5.7 - 1.8 apart, with
//     a bare shaft visible between them - and the tail boom ends in a fin and
//     a tailplane with nothing spinning on it. If a viewer can find a tail
//     rotor, the model has failed.
//  2. SIDE-BY-SIDE COCKPIT. Wide, flat, low: two crew abreast behind a broad
//     shallow windscreen, not the Hind's stepped tandem greenhouse. The canopy
//     is 3.45 wide and only 1.1 tall - three times wider than tall - with a
//     centre pillar splitting it, which is the read from the front and above.
//  3. Slim tail boom, big fin, high-set tailplane with endplate fins.
//  4. Stub wings carrying four pylons (pods and tube launchers).
//  5. Three-point fixed gear (two mains under the wing roots, one nose leg).
//
// SIZE. Real Ka-52: 13.5 m fuselage, 14.5 m rotor diameter. The Hind is
// modelled at ~1.0 unit/m (17.4-unit blades against a 17.3 m real rotor), so
// this airframe is drawn at the same scale: blades 14.5 long tip-to-tip
// (disc radius 7.25) over a fuselage running z -6.65 (nose cone tip) to +7.3
// (fin trailing edge) = 13.95. Set beside the Hind it reads as the shorter,
// stubbier machine it is, and its rotor is visibly the smaller of the two.
//
// COLOUR. `olive` is the shared airframe green and stays the base. The Ka-52's
// two-tone Russian scheme is carried by `light` on the upper decks and canopy
// frame, `dark` on the boom underside, gear, pylons and the rotor mast - so
// the aircraft reads as painted rather than as one flat green mass, using only
// the five materials the host already owns and disposes.
export default function register(ctx) {
  // TYPE is registered elsewhere (ground_heli_pack). Registering it again here
  // would throw and take the whole page down with it.
  ctx.addHeliModel("ka52", {
    build(env) {
      const {
        THREE, geometry,
        olive, dark, glass, light, rotorSkin, markings,
        add, addRoot
      } = env;

      // ---------------------------------------------------------------------
      // Fuselage. A short, deep, slab-sided body. Unlike the Hind it does NOT
      // taper down toward the nose - the Ka-52's forward fuselage is the
      // widest part of the aircraft, because two crew sit across it.
      // ---------------------------------------------------------------------
      // Main body block, z -4.0 .. +2.0.
      add(geometry.panel, olive, 0, 0.05, -1.0, 2.8, 2.2, 6.0);
      // Forward crew section: WIDER than the body behind it - the "shoulders"
      // the side-by-side cockpit sits on. 3.5 across against a 2.9 body is
      // what makes the top view bulge at the cockpit instead of tapering.
      add(geometry.panel, olive, 0, -0.25, -4.3, 3.55, 1.95, 3.1);
      // Nose: BLUNT. A short truncated cone (a cone scaled shallow in z reads
      // as a chisel, not a spike) plus a flat chin plate under it, which is
      // the Ka-52's squared-off snout rather than a fighter's point.
      // The cone is FOUR-sided, so it is rolled 45 degrees about its own axis:
      // unrolled, its corners point left/right and the top view shows a
      // diamond wedge - a fighter nose. Rolled, the flats face outboard and it
      // reads as the chiselled snout of a helicopter.
      // The roll goes in `rz`, not `ry`: rotation order is XYZ applied as
      // Rx*Ry*Rz, so `rz` acts FIRST, in the cone's own untilted frame - it is
      // the spin about the cone's long axis while that axis is still +y. `ry`
      // there would yaw the finished nose sideways instead.
      add(geometry.shipBow, olive, 0, -0.3, -6.15, 1.45, 0.75, 1.45, -Math.PI / 2, 0, Math.PI / 4);
      add(geometry.panel, olive, 0, -0.3, -5.75, 2.95, 1.6, 1.2);
      // Chin sensor ball + the gun's own stub. aaMounts [5.8, 3.2] fire from
      // ahead of the nose, so the barrel wants something to come out of.
      add(geometry.shipCylinder, dark, 0, -1.25, -4.7, 0.6, 0.5, 0.6);
      add(geometry.shipOctPlate, dark, 0, -1.6, -4.7, 0.52, 0.34, 0.52);
      // Side-mounted 2A42 cannon, starboard of the nose - the Ka-52's gun is
      // NOT a chin turret, it is a fixed-ish mount on the fuselage side.
      add(geometry.panel, dark, 0.95, -0.85, -4.9, 0.4, 0.5, 1.5);
      add(geometry.shipCylinder, dark, 0.95, -0.9, -6.1, 0.09, 1.5, 0.09, Math.PI / 2);

      // ---------------------------------------------------------------------
      // Side-by-side cockpit. Wide and flat: a shallow raked windscreen, a
      // wide flat glass roof and a dark frame band along the top. Total width
      // 3.0 against 1.15 of height - the proportion that separates this
      // aircraft from every tandem gunship in the game.
      // ---------------------------------------------------------------------
      // Raked windscreen: 3.3 wide against 1.2 of height, so the front view is
      // a letterbox rather than a fighter's teardrop.
      add(geometry.panel, glass, 0, 0.72, -5.35, 3.3, 1.2, 1.5, -0.55);
      // Flat cabin glass over both seats.
      add(geometry.panel, glass, 0, 1.12, -3.9, 3.45, 1.1, 2.5, -0.05);
      // Canopy rear bulkhead. This is a BAND at the back of the glass, not a
      // roof: covering the canopy with a `light` panel put the brightest
      // surface on the aircraft exactly where the glass should be, and the top
      // view lost the side-by-side cockpit entirely.
      add(geometry.panel, light, 0, 1.5, -2.75, 3.3, 0.75, 0.5);
      // Centre pillar between the two crew - the visual "two seats abreast".
      add(geometry.panel, dark, 0, 1.2, -4.4, 0.18, 1.15, 3.0, -0.05);
      // Cockpit sill line. Deliberately NARROWER than the crew section and in
      // the dark tone: at 3.62 wide in `light` this plate became the biggest
      // pale surface on the aircraft and swallowed the whole nose in the top
      // view. It is a trim line, not a deck.
      add(geometry.panel, dark, 0, 0.1, -4.4, 3.6, 0.18, 3.0);
      // Side door glass panels, one per crew station.
      for (const side of [-1, 1]) {
        add(geometry.panel, glass, side * 1.78, 0.4, -3.9, 0.1, 1.05, 2.1);
      }

      // Upper deck / engine bay. Two TV3-117 nacelles sit high and outboard,
      // shoulder-mounted either side of the rotor mast.
      add(geometry.panel, olive, 0, 1.6, -0.6, 2.6, 1.1, 4.0);
      for (const side of [-1, 1]) {
        // Nacelles are SHORT and set outboard of the mast, not one long slab
        // down the spine: 0.5 radius over 2.2 of length, with a clear gap at
        // the centreline for the rotor head to sit in.
        add(geometry.shipCylinder, dark, side * 1.15, 2.05, -0.7, 0.42, 2.0, 0.42, Math.PI / 2);
        // Intake lip forward, exhaust stub aft and canted outboard.
        add(geometry.shipOctPlate, light, side * 1.15, 2.05, -1.75, 0.46, 0.2, 0.46, Math.PI / 2);
        add(geometry.shipCylinder, dark, side * 1.45, 2.1, 0.65, 0.28, 0.85, 0.28, Math.PI / 2, 0, side * 0.34);
      }
      // Rotor mast fairing under the coaxial head - taller than a single-rotor
      // machine's, because two heads are stacked on it.
      add(geometry.shipCylinder, dark, 0, 2.9, -0.4, 0.46, 1.7, 0.46);
      // The exposed inter-rotor mast section. This short bare shaft BETWEEN the
      // two discs is the part that makes the stack read as coaxial rather than
      // as one thick rotor: the eye needs to see daylight and a shaft between
      // the two planes.
      add(geometry.shipCylinder, light, 0, 4.65, -0.4, 0.22, 2.0, 0.22);
      add(geometry.shipCylinder, dark, 0, 5.75, -0.4, 0.15, 0.5, 0.15);

      // ---------------------------------------------------------------------
      // Stub wings with four pylons. Level, not anhedral - another Hind
      // difference. Wingtip ECM/countermeasure pods cap them.
      // ---------------------------------------------------------------------
      for (const side of [-1, 1]) {
        add(geometry.panel, olive, side * 2.5, 0.5, 0.0, 2.6, 0.34, 2.5, 0, 0, side * 0.05);
        // Wingtip ECM pod: a short spindle running fore-and-aft, capping the
        // wing rather than crossing it.
        add(geometry.shipCylinder, light, side * 3.8, 0.5, -0.15, 0.3, 1.9, 0.3, Math.PI / 2);
        add(geometry.shipBow, light, side * 3.8, 0.5, -1.35, 0.3, 0.6, 0.3, -Math.PI / 2);
        // Inboard pylon: B-8 rocket pod, hung UNDER the wing on a short strut.
        add(geometry.panel, dark, side * 1.95, 0.1, 0.0, 0.18, 0.55, 1.3);
        add(geometry.shipCylinder, dark, side * 1.95, -0.5, 0.1, 0.42, 1.9, 0.42, Math.PI / 2);
        add(geometry.shipOctPlate, light, side * 1.95, -0.5, -0.88, 0.42, 0.12, 0.42, Math.PI / 2);
        // Outboard pylon: Vikhr ATGM tube launcher - a flat rack of tubes, so
        // it reads as ordnance rather than as another pod.
        add(geometry.panel, dark, side * 3.15, 0.1, 0.0, 0.18, 0.55, 1.2);
        add(geometry.panel, dark, side * 3.15, -0.5, -0.1, 0.72, 0.42, 1.9);
        add(geometry.panel, dark, side * 3.15, -0.86, -0.1, 0.72, 0.34, 1.7);
      }

      // ---------------------------------------------------------------------
      // Tail boom, fin and tailplane. Slim boom, LARGE fin, and a high
      // tailplane with endplate fins - and deliberately no tail rotor.
      // ---------------------------------------------------------------------
      // Boom: a genuinely SLIM tube (radius 0.42 against a 2.9-wide body) that
      // runs a long way aft, z 1.6 .. 6.8. Slimness is what sells "there is no
      // drive shaft or gearbox out here" - the coaxial machine's boom carries
      // nothing but the tail surfaces.
      add(geometry.shipCylinder, olive, 0, 0.5, 4.3, 0.44, 5.4, 0.44, Math.PI / 2);
      // Boom root fairing, blending into the body so the tube does not just
      // stop in mid-air at the fuselage.
      add(geometry.panel, olive, 0, 0.45, 1.9, 1.5, 1.1, 1.6);
      // Boom spine plate under the red star, so the marking sits on a surface
      // instead of floating beside a 0.44-radius tube.
      add(geometry.panel, olive, 0, 0.5, 3.35, 0.82, 0.72, 1.7);
      // Fin. Swept fins are built as a STACK of untilted boxes with shrinking
      // chord, not as one tilted box: a rotated slab reads as a panel that has
      // fallen over, which is what the first pass produced here. Three steps
      // give a clean leading-edge sweep and a vertical trailing edge.
      add(geometry.panel, olive, 0, 1.35, 6.5, 0.24, 1.6, 1.6);
      add(geometry.panel, olive, 0, 2.45, 6.75, 0.22, 0.9, 1.15);
      add(geometry.panel, olive, 0, 3.1, 6.95, 0.2, 0.6, 0.85);
      add(geometry.panel, light, 0, 3.5, 7.05, 0.19, 0.3, 0.7);
      // Ventral fin under the boom end.
      add(geometry.panel, olive, 0, -0.3, 6.3, 0.2, 1.2, 1.1);
      // Tailplane: WIDE (span 4.6) and set FORWARD of the fin, so the two do
      // not merge into one green mass in side view - there is boom visible
      // between them. An endplate fin stands on each tip; that trio (big
      // centre fin plus two endplates) is the Ka-52's tail read.
      add(geometry.panel, olive, 0, 0.75, 4.75, 4.6, 0.2, 1.2);
      for (const side of [-1, 1]) {
        // Endplate fins stand STRAIGHT UP for the same reason the main fin is
        // stepped rather than tilted, and they are kept SHORT (1.05 tall
        // against the centre fin's 2.6): tall endplates set just ahead of the
        // fin fill the gap between boom and fin and the whole tail collapses
        // into one green rectangle in side view.
        add(geometry.panel, olive, side * 2.2, 1.32, 4.75, 0.16, 1.05, 1.1);
        add(geometry.panel, light, side * 2.2, 1.92, 4.85, 0.15, 0.3, 0.75);
      }

      // ---------------------------------------------------------------------
      // Three-point fixed gear: two mains under the wing roots, one nose leg.
      // ---------------------------------------------------------------------
      for (const side of [-1, 1]) {
        // Main leg + wheel.
        add(geometry.shipCylinder, dark, side * 1.7, -1.5, 1.1, 0.13, 1.5, 0.13, 0, 0, side * 0.22);
        add(geometry.shipOctPlate, dark, side * 1.9, -2.2, 1.1, 0.42, 0.28, 0.42, 0, 0, Math.PI / 2);
      }
      add(geometry.shipCylinder, dark, 0, -1.55, -3.6, 0.12, 1.3, 0.12);
      add(geometry.shipOctPlate, dark, 0, -2.15, -3.6, 0.34, 0.24, 0.34, 0, 0, Math.PI / 2);

      // Red stars on the boom - the faction read, same marking the Hind wears.
      add(geometry.shipOctPlate, markings, -0.45, 0.55, 3.4, 0.48, 0.06, 0.48, 0, 0, Math.PI / 2);
      add(geometry.shipOctPlate, markings, 0.45, 0.55, 3.4, 0.48, 0.06, 0.48, 0, 0, Math.PI / 2);

      // ---------------------------------------------------------------------
      // COAXIAL ROTORS. Two discs on one mast, 1.2 apart vertically so the
      // gap is unmistakable from the side and from a 3/4 view.
      //
      // Contra-rotation: updateHeli adds a POSITIVE rate to every entry's own
      // local Y, so the only way to make one disc turn the other way is to
      // point its local Y down - rotation.z = PI rolls the pivot over and the
      // same +Y increment then reads as the opposite direction on screen.
      // The upper disc gets that roll; the lower one does not.
      //
      // Both discs wear `rotorSkin` (translucent, depthWrite off). Painting a
      // 14.5-unit plate with `dark` would put two opaque slabs across the
      // player's gunsight, which is exactly the failure the shared rotor paint
      // exists to prevent. Blades are thin `dark` strips ON TOP of the skin, so
      // there is something to see turning without an opaque disc.
      // ---------------------------------------------------------------------
      const rotors = [];

      const makeDisc = (y, flip) => {
        const pivot = new THREE.Group();
        pivot.position.set(0, y, -0.4);
        // Flipped pivot = local Y points down = the shared positive spin reads
        // as counter-rotation against the other disc.
        if (flip) pivot.rotation.z = Math.PI;
        const disc = new THREE.Mesh(geometry.shipOctPlate, rotorSkin);
        disc.scale.set(7.25, 0.05, 7.25);
        pivot.add(disc);
        // Three blade shadows per disc (the real head has three per rotor).
        for (let i = 0; i < 3; i += 1) {
          const blade = new THREE.Mesh(geometry.panel, dark);
          blade.scale.set(14.5, 0.12, 0.52);
          blade.rotation.y = (i * Math.PI) / 3;
          pivot.add(blade);
        }
        // Hub cap so the two heads read as stacked hardware, not two floating
        // plates. Rides with the pivot, which is the point.
        const hub = new THREE.Mesh(geometry.shipCylinder, dark);
        hub.scale.set(0.34, 0.34, 0.34);
        pivot.add(hub);
        addRoot(pivot);
        rotors.push(pivot);
        return pivot;
      };

      makeDisc(3.9, false);  // lower disc, turns one way
      makeDisc(5.7, true);   // upper disc, rolled over = turns the other

      // `rotors` is the only field read back. Two entries = the coaxial pair,
      // and there is no third because this aircraft has no tail rotor.
      return { rotors };
    }
  });
}
