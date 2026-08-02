export default function register(ctx) {
  const { GROUND_TYPES } = ctx.tables;

  // `radarSite` is the spread source the brief asks for and it is also the
  // right one on behaviour: `aa: null`, so like the search radar this thing
  // never shoots back. It is a sensor, and clearing it is a SEAD errand.
  const radarSite = GROUND_TYPES.radarSite;
  if (!radarSite) {
    throw new Error("[othRadar] expected the radarSite ground template to exist");
  }

  ctx.addGroundType("othRadar", {
    ...radarSite,
    key: "othRadar",
    label: "OTH RADAR",
    role: "Over-the-Horizon Radar Array",
    // BALANCE TODO: placeholder. hp is the search radar's 70 multiplied out to
    // structure scale by eye only - no pass has been made on how many rounds a
    // landmark-class target should be worth, and `radarColor` / `tracerColor` /
    // `explosionColor` / `smokeHeight` are radarSite's numbers verbatim.
    hp: 220,
    // Dimensions, and only these, are authored. Measured off the model below:
    // the face spans x -40..+40 (80 m) and y 0..35, the back trusses put the
    // deepest structure at z +12.6, and the compound sits out to z -14.
    // hitRadius is the plan half-diagonal of that footprint, rounded up.
    hitRadius: 48,
    crash: Object.freeze({ halfLen: 16, halfBeam: 41, top: 35 }),
    hitBox: Object.freeze({ x: 82, y: 36, z: 30 }),
    // BALANCE TODO: placeholder. Radar site's 7, on a structure five times the
    // height - the column should probably rise from the compound rather than
    // from the array's centre.
    smokeHeight: radarSite.smokeHeight,
    // No `dishSpin`, and the build returns no `dish`: a backscatter curtain is
    // a fixed aperture. It does not sweep, it is steered electrically, and a
    // rotating part anywhere on it would be a lie about how it works. The
    // caption reading DISH no is the correct result for this unit.
    dishSpin: undefined,
    aa: null
  });

  ctx.addGroundModel("othRadar", {
    build(env) {
      const { geometry, steel, olive, dark, light, markings, add } = env;

      // Face plane and lattice extent. Every number below is derived from
      // these five so the grid stays square when any of them is retuned.
      const HALF_W = 40;        // face spans x -40..+40 = the brief's 80 m
      const BASE_Y = 5.4;       // bottom stringer: the curtain is held clear of
                                // the ground, which is most of why it reads as
                                // an aperture rather than a fence
      const TOP_Y = 33;         // top stringer, crown trim to 35
      const FACE_Z = 0;         // the curtain plane
      const BAYS = 8;           // 8 bays => 9 masts on 10 m centres
      const ROWS = 6;           // 6 courses => 7 stringers
      const MAST_STEP = (HALF_W * 2) / BAYS;
      const ROW_STEP = (TOP_Y - BASE_Y) / ROWS;

      // ---- Ground works ------------------------------------------------------
      // A concrete strip under the whole footprint. Wide enough that the back
      // trusses land on it too, which is what visually ties the two structures
      // into one installation from directly above.
      // Spans z -17 to +19: the transformer fence at -15 and the truss feet at
      // +13 both land inside it with a margin.
      add(geometry.panel, olive, 0, 0.4, 1, 88, 0.8, 36);
      // Nine pile caps, one under each mast. Cheap (nine boxes) and they do the
      // single most important job in the top-down view: they turn a floating
      // grid into something anchored to the pad.
      for (let i = 0; i <= BAYS; i += 1) {
        const x = -HALF_W + i * MAST_STEP;
        add(geometry.panel, steel, x, 1.5, FACE_Z, 3.4, 2.2, 4.6);
      }

      // ---- THE LATTICE (the feature) ----------------------------------------
      // The curtain is built as three passes over the same rectangle so the
      // crossing pattern is regular: uprights, then stringers, then one
      // diagonal per bay. Members are 0.55-0.7 m thick against 10 m bays, i.e.
      // about 6% fill - open enough that the background shows through at every
      // preview angle, which is the test this shape has to pass.

      // Verticals. The two outer masts are doubled in section because the edges
      // of a curtain array are its towers, and a lattice with no defined edge
      // reads as a torn piece of mesh.
      for (let i = 0; i <= BAYS; i += 1) {
        const x = -HALF_W + i * MAST_STEP;
        const edge = i === 0 || i === BAYS;
        const gauge = edge ? 1.4 : 0.5;
        add(geometry.panel, steel, x, (BASE_Y + TOP_Y) / 2 + 0.5,
          FACE_Z, gauge, TOP_Y - BASE_Y + 3.6, gauge);
        // Each edge tower is a box column, not a stick: a second leg set back
        // at z +2.2 with rungs between, so the ends have real thickness when
        // the array is viewed from three-quarters.
        if (edge) {
          add(geometry.panel, steel, x, (BASE_Y + TOP_Y) / 2 + 0.5,
            FACE_Z + 2.2, 1.5, TOP_Y - BASE_Y + 3.6, 1.5);
          for (let r = 0; r <= ROWS; r += 1) {
            add(geometry.panel, steel, x, BASE_Y + r * ROW_STEP,
              FACE_Z + 1.1, 1.2, 0.5, 3.2);
          }
        }
      }

      // Horizontals. Full width, one per course, sitting just forward of the
      // masts so the two sets visibly cross rather than co-planing into a
      // single grey sheet.
      for (let r = 0; r <= ROWS; r += 1) {
        const y = BASE_Y + r * ROW_STEP;
        add(geometry.panel, steel, 0, y, FACE_Z - 0.6, HALF_W * 2, 0.46, 0.46);
      }

      // Diagonals, on a CHECKERBOARD of bays rather than in every one. This is
      // the pass that makes the grid look ENGINEERED - a plain square mesh
      // reads as a fence, and a herringbone of braces reads as a truss wall -
      // but bracing all 48 bays closed the curtain up into a solid billboard,
      // which is exactly the failure this unit exists to avoid. Half the bays,
      // alternating like a chessboard, gives the same herringbone read at a
      // glance while leaving every other bay a clean open square to see sky
      // through. Each brace is a stringer-length stick rotated about z to span
      // its bay corner to corner; the angle is the bay's own aspect, so it
      // lands on the intersections instead of near them.
      const braceLen = Math.hypot(MAST_STEP, ROW_STEP);
      const braceAngle = Math.atan2(ROW_STEP, MAST_STEP);
      for (let r = 0; r < ROWS; r += 1) {
        for (let i = 0; i < BAYS; i += 1) {
          if ((r + i) % 2 !== 0) continue;
          add(geometry.panel, steel,
            -HALF_W + (i + 0.5) * MAST_STEP,
            BASE_Y + (r + 0.5) * ROW_STEP,
            FACE_Z + 0.7,
            braceLen, 0.42, 0.42,
            // Mirrored about the centreline rather than run one way across the
            // whole face. A single direction let the braces on adjacent
            // courses line up end to end into two 80 m zigzags reading as one
            // giant X over the array; flipping at x 0 breaks the chain and
            // gives the symmetric herringbone a real antenna curtain has.
            0, 0, (i < BAYS / 2 ? 1 : -1) * braceAngle);
        }
      }

      // Feed line: the horizontal cage slung under the bottom stringer that
      // carries the array's own transmission line in to the compound. Painted
      // dark so it draws a line across the base of the curtain and stops the
      // lattice from appearing to hover.
      add(geometry.panel, dark, 0, BASE_Y - 1.6, FACE_Z - 1.2, HALF_W * 2 - 4, 1.1, 1.6);
      for (let i = 0; i < 9; i += 1) {
        add(geometry.panel, dark, -36 + i * 9, BASE_Y - 0.7, FACE_Z - 1.2, 0.4, 1.8, 0.4);
      }

      // Crown trim. A capping beam plus obstruction lights - the top edge of a
      // structure this tall is the part a pilot sees against the sky, and the
      // white markings are the only unlit paint on the unit.
      add(geometry.panel, light, 0, TOP_Y + 1.9, FACE_Z, HALF_W * 2 + 1.6, 0.7, 1.4);
      for (const x of [-40, -20, 0, 20, 40]) {
        add(geometry.panel, markings, x, TOP_Y + 2.7, FACE_Z, 0.9, 0.9, 0.9);
      }

      // ---- BACK TRUSS ROW ----------------------------------------------------
      // Five raking A-frames, one every 20 m. Each frame is a pair of legs
      // meeting high on the face - a rear leg raking back to a foot at z +13,
      // and a near-vertical front leg - joined by three rungs and a diagonal.
      // Edge-on this row IS the unit, so the legs are deliberately heavier
      // gauge (0.9) than the lattice members they brace.
      //
      // The legs are drawn by SPAN rather than by eye. `strut` takes the two
      // endpoints in the frame's own z-y plane, puts the box at their midpoint,
      // scales Y to the true length and rotates about X by the span's own
      // angle - which is the only way a raked member lands on both of the
      // points it is supposed to connect. Rotating a centred box by a guessed
      // angle (the first cut here) swings both ends off the structure.
      const strut = (x, z0, y0, z1, y1, gauge, material) => {
        const dz = z1 - z0;
        const dy = y1 - y0;
        return add(geometry.panel, material, x, (y0 + y1) / 2, (z0 + z1) / 2,
          gauge, Math.hypot(dz, dy), gauge, Math.atan2(dz, dy));
      };
      const TRUSS_HEAD_Y = 29.5;   // where both legs meet the face
      const TRUSS_FOOT_Z = 13;     // how far the rake reaches back
      for (let t = 0; t <= 4; t += 1) {
        const x = -HALF_W + t * (HALF_W / 2);
        // Rear leg: pad at z +13 up to the face just under the crown.
        strut(x, TRUSS_FOOT_Z, 1.2, 1.6, TRUSS_HEAD_Y, 0.9, steel);
        // Front leg: near-vertical, standing on the face's own pile line and
        // taking the curtain's weight straight down.
        strut(x, 2.6, 1.2, 1.2, TRUSS_HEAD_Y, 0.85, steel);
        // Rungs between the two legs. Their z spans are interpolated off the
        // same two lines, so they shorten as the frame closes - which is what
        // makes it read as a triangle rather than a ladder. Only two, and both
        // low: near the apex the legs are already touching, and a rung up there
        // is a lump on the join rather than a member.
        for (const f of [0.24, 0.52]) {
          const rearZ = TRUSS_FOOT_Z + (1.6 - TRUSS_FOOT_Z) * f;
          const frontZ = 2.6 + (1.2 - 2.6) * f;
          const y = 1.2 + (TRUSS_HEAD_Y - 1.2) * f;
          add(geometry.panel, steel, x, y, (rearZ + frontZ) / 2,
            0.6, 0.6, Math.abs(rearZ - frontZ) + 0.6);
        }
        // One long diagonal across the frame, foot to head, same herringbone
        // logic as the curtain's braces.
        strut(x, TRUSS_FOOT_Z - 0.6, 8, 2.2, 24, 0.55, steel);
        // Foot block where the rake lands on the pad.
        add(geometry.panel, dark, x, 1.2, TRUSS_FOOT_Z, 2.6, 2.4, 3.2);
      }
      // Three longitudinal ties running the width of the truss row, which is
      // what turns five separate frames into one braced structure from above.
      // Their z values are read off the rear-leg line at the height each sits
      // at, so a tie touches every frame it crosses.
      for (const [ty, tz] of [[24, 3.6], [16, 7.3], [8, 10.9]]) {
        add(geometry.panel, steel, 0, ty, tz, HALF_W * 2, 0.55, 0.55);
      }

      // ---- COMPOUND ----------------------------------------------------------
      // Four transmitter containers in a row out front, each a 12 x 4 m box on
      // a plinth with a ribbed roof and a door - drawn at real ISO-shelter
      // proportions so the eye has something it knows the size of.
      for (let c = 0; c < 4; c += 1) {
        const cx = -27 + c * 18;
        add(geometry.panel, olive, cx, 2.1, -8.6, 12.4, 3.8, 4.4);
        add(geometry.panel, steel, cx, 4.2, -8.6, 13, 0.5, 4.8, 0.05);
        add(geometry.panel, dark, cx - 5, 1.8, -10.9, 1.6, 2.8, 0.4);
        // Roof plant: one air-handling hood per shelter, the detail that keeps
        // the row from reading as four identical bricks from directly above.
        add(geometry.panel, dark, cx + 3.4, 4.9, -8, 2.4, 1.2, 2.4);
      }
      // Transformer bank off the port end: three cylinders behind a low fence,
      // outboard of the shelter row so it does not sit inside the cable run.
      for (let i = 0; i < 3; i += 1) {
        add(geometry.shipCylinder, light, -40 + i * 3.6, 2.3, -12.6, 1.3, 4.6, 1.3);
      }
      add(geometry.panel, dark, -36.4, 1.6, -15, 13, 3, 0.3);
      // Cable gallery: the raised trunking run linking the shelters back to the
      // feed line under the array. It is the one part that crosses between the
      // two halves of the compound, and without it the containers look parked
      // rather than connected.
      add(geometry.panel, dark, 0, 3.4, -4.6, 62, 0.9, 1.2);
      for (const gx of [-27, -9, 9, 27]) {
        add(geometry.panel, dark, gx, 2.4, -4.6, 0.5, 3, 0.5);
        // Spur off the trunk into the shelter behind it, so the run visibly
        // terminates at hardware rather than stopping in mid-air.
        add(geometry.panel, dark, gx, 3.4, -6.2, 0.5, 0.5, 4);
      }

      // No return value at all: nothing on this unit rotates. See the spec's
      // `dishSpin` note above.
    }
  });
}
