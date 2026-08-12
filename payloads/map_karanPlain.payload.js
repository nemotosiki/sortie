// KARAN PLAIN (`karanPlain`) — Sera M09 / Elem M29 agricultural battlefield.
//
// The dry base plane is inherited from desertBasin. A deterministic decorator
// supplies the authored information that matters to a low-altitude CAS sortie:
// crop parcels, a shared northbound road, a river crossing, three villages and
// windbreak rows. Mission routes use the same coordinates as these roads.
export default function register(ctx) {
  const { WORLD_PRESETS } = ctx.tables;
  const base = WORLD_PRESETS.desertBasin;
  if (!base) throw new Error("[karanPlain] desertBasin base preset is missing");

  const missionAnchors = Object.freeze({
    playerStart: Object.freeze([0, -7600]),
    battleCenter: Object.freeze([0, 900]),
    militaryRoadSouth: Object.freeze([-420, -3400]),
    militaryRoadNorth: Object.freeze([-420, 5900]),
    evacuationRoadSouth: Object.freeze([420, -1700]),
    evacuationRoadNorth: Object.freeze([420, 6500]),
    friendlyAdvanceSouth: Object.freeze([-2850, -6100]),
    riverCrossing: Object.freeze([0, 1100])
  });

  ctx.addWorldPreset("karanPlain", {
    ...base,
    label: "KARAN PLAIN",
    regionId: "karan_plain",
    sectorIds: Object.freeze(["south_granary_road", "river_crossing"]),
    variant: "clear_afternoon",
    sceneryOrigin: [0, 0],
    previewFocus: [0, 1000],
    previewSheets: Object.freeze({
      surfaceQa: Object.freeze([
        Object.freeze({ label: "ROAD JUNCTION", position: [-1700, 150, -5000], target: [0, 0, -4200] }),
        Object.freeze({ label: "RIVER BRIDGE", position: [-1800, 190, -250], target: [0, 0, 1100] }),
        Object.freeze({ label: "VILLAGE", position: [-5100, 180, -2600], target: [-4300, 0, -1650] }),
        Object.freeze({ label: "FIELD GRID", position: [0, 1750, -2400], target: [0, 0, -2400] })
      ])
    }),
    missionAnchors,
    clearColor: 0xaec9dc,
    sky: [
      [0, "#4f83ad"],
      [0.34, "#78a9ca"],
      [0.56, "#bad6df"],
      [0.72, "#e7d5a6"],
      [1, "#8fa6a4"]
    ],
    atmosphere: {
      ...base.atmosphere,
      seed: 0x4b415201,
      noise: 0.01,
      haze: 0.07,
      thinClouds: 7,
      cloudOpacity: 0.035,
      cloudBand: [0.5, 0.72],
      cloudTint: 0xf2f3e8
    },
    fog: { color: 0xb7c9c5, near: 7600, far: 26000 },
    sun: {
      position: [-5200, 3200, -4200],
      color: 0xffe2ad,
      radius: 86,
      glare: [
        { scale: 1380, color: 0xffcf8c, opacity: 0.3 },
        { scale: 410, color: 0xfff1cf, opacity: 0.74 }
      ]
    },
    moon: null,
    stars: null,
    sunRoad: null,

    // desertBasin already proves the ocean-plane-as-dry-ground contract. Zero
    // normal velocity is non-negotiable: cultivated fields must not crawl.
    ocean: {
      ...base.ocean,
      base: "#77754d",
      bright: "157, 158, 101",
      dark: "65, 72, 43",
      repeat: 22,
      roughness: 0.99,
      metalness: 0,
      textureProfile: "grassland",
      normalRepeat: 26,
      normalScale: [0.1, 0.14],
      normalSpeed: [0, 0],
      normalSeed: 0x4b415202
    },
    terrain: {
      ...base.terrain,
      seed: 0x4b415203,
      sand: 0x9a8756,
      grass: 0x657343,
      rock: 0x716b54,
      peak: 0x77725e,
      snow: 0xd9dfd8,
      textureProfile: "grassland",
      fineRepeat: 24,
      macroRepeat: 4.2,
      normalRepeat: 26,
      normalStrength: 0.16,
      islandNormalStrength: 0.12,
      normalFade: [240, 2200],
      rockSlope: [0.52, 0.88],
      shoreHeight: 0.1,
      snowSoftness: 0.08
    },
    lights: {
      hemi: { sky: 0xcce3ef, ground: 0x4a472f, intensity: 1.84 },
      key: { color: 0xffdfa8, intensity: 2.28, position: [-3200, 1700, -2600] },
      fill: { color: 0x8ab8d0, intensity: 0.5, position: [2600, 420, 1800] }
    },
    mountains: {
      ...base.mountains,
      count: 12,
      radius: [230, 520],
      height: [55, 150],
      distance: [10800, 14800],
      snowyAbove: 9999,
      snowLine: 0.8,
      roughness: 0.9,
      palette: {
        low: 0x596043,
        mid: 0x65634c,
        rock: 0x716b54,
        peak: 0x77725e,
        snow: 0xd9dfd8
      },
      corridor: null,
      plateau: null
    },
    islands: { count: 0, stone: 0x716b54, green: 0x657343 },
    clouds: {
      ...base.clouds,
      scale: 0.9,
      hero: false,
      color: 0xf4f3e8,
      opacity: 0.48,
      cirrusColor: 0xf0f1e9,
      cirrusOpacity: 0.18,
      texture: { seed: 0x4b415204, contrast: 1.01, underside: 0.35, softness: 1.08 }
    },
    decor: {
      ...base.decor,
      seed: 0x4b415205,
      keepClear: [{ x: 0, z: 900, r: 9400 }],
      extraIslands: { count: 7, radius: [140, 300], height: [18, 58], distance: [11200, 14500] },
      shore: null,
      trees: null,
      rocks: { count: 8, color: 0x5f604f, scale: [5, 13] },
      city: null,
      extraClouds: null
    }
  });

  ctx.addWorldDecorator("karanPlainWorks", {
    worlds: ["karanPlain"],
    build({ THREE, addRoot, keepGeometry, keepMaterial, surfaceHeightAt, classicDepthBuffer = false }) {
      const root = new THREE.Group();
      root.name = "karanPlainWorks";
      addRoot(root);

      const boxGeo = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
      const planeGeo = keepGeometry(new THREE.PlaneGeometry(1, 1));
      const cylGeo = keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 10));
      const pondGeo = keepGeometry(new THREE.CircleGeometry(1, 48));
      const pondBankGeo = keepGeometry(new THREE.RingGeometry(0.88, 1, 48));
      const roofGeo = keepGeometry(new THREE.BufferGeometry());
      roofGeo.setAttribute("position", new THREE.Float32BufferAttribute([
        -0.5, 0, -0.5, 0.5, 0, -0.5, 0, 0.5, -0.5,
        -0.5, 0, 0.5, 0.5, 0, 0.5, 0, 0.5, 0.5
      ], 3));
      roofGeo.setIndex([
        0, 1, 2, 3, 5, 4,
        0, 2, 5, 0, 5, 3,
        1, 4, 5, 1, 5, 2,
        0, 3, 4, 0, 4, 1
      ]);
      roofGeo.computeVertexNormals();
      const mats = new Map();
      const material = (color, roughness = 0.92, metalness = 0.01, emissive = 0) => {
        const key = `${color}:${roughness}:${metalness}:${emissive}`;
        if (!mats.has(key)) {
          mats.set(key, keepMaterial(new THREE.MeshStandardMaterial({
            color,
            roughness,
            metalness,
            emissive,
            emissiveIntensity: emissive ? 0.7 : 0
          })));
        }
        return mats.get(key);
      };
      const box = (name, x, y, z, sx, sy, sz, color, ry = 0, roughness = 0.92, metalness = 0.01) => {
        const mesh = new THREE.Mesh(boxGeo, material(color, roughness, metalness));
        mesh.name = name;
        mesh.position.set(x, y, z);
        mesh.scale.set(sx, sy, sz);
        mesh.rotation.y = ry;
        root.add(mesh);
        return mesh;
      };
      const cylinder = (name, x, y, z, radius, height, color) => {
        const mesh = new THREE.Mesh(cylGeo, material(color, 0.86, 0.04));
        mesh.name = name;
        mesh.position.set(x, y, z);
        mesh.scale.set(radius, height, radius);
        root.add(mesh);
        return mesh;
      };
      // Broad ground markings are one-sided planes, not kilometre-wide boxes.
      // The old 0.22-0.54m boxes exposed slab sides at low altitude and put the
      // top faces of every crossing road at exactly the same depth. Each plane
      // has a stable layer with both a small physical lift and polygon offset;
      // this stays deterministic on classic depth buffers as well as reversed-Z.
      const surfaceMats = new Map();
      const surfaceMaterial = (color, layer, roughness, metalness) => {
        const key = `${color}:${layer}:${roughness}:${metalness}`;
        if (!surfaceMats.has(key)) {
          surfaceMats.set(key, keepMaterial(new THREE.MeshStandardMaterial({
            color,
            roughness,
            metalness,
            polygonOffset: classicDepthBuffer,
            polygonOffsetFactor: classicDepthBuffer ? -layer : 0,
            polygonOffsetUnits: classicDepthBuffer ? -layer : 0
          })));
        }
        return surfaceMats.get(key);
      };
      const surface = (name, x, z, width, depth, color, options = {}) => {
        const layer = Math.max(1, Number(options.layer) || 1);
        const roughness = Number.isFinite(options.roughness) ? options.roughness : 0.96;
        const metalness = Number.isFinite(options.metalness) ? options.metalness : 0;
        const elevation = 0.54 + layer * 0.035;
        const mesh = new THREE.Mesh(planeGeo, surfaceMaterial(color, layer, roughness, metalness));
        mesh.name = name;
        mesh.position.set(x, surfaceHeightAt(x, z) + elevation, z);
        mesh.scale.set(width, depth, 1);
        mesh.rotateX(-Math.PI / 2);
        if (options.rotation) mesh.rotateZ(options.rotation);
        mesh.renderOrder = layer;
        mesh.userData.surfaceQa = {
          layer,
          width,
          depth,
          elevation,
          rotation: Number(options.rotation) || 0
        };
        root.add(mesh);
        return mesh;
      };
      const groundY = (x, z) => surfaceHeightAt(x, z) + 0.45;
      const house = (name, x, z, width, depth, wallColor, roofColor, heading = 0, height = 20) => {
        const y = groundY(x, z);
        box(`${name}-walls`, x, y + height / 2, z, width, height, depth, wallColor, heading);
        const roof = new THREE.Mesh(roofGeo, material(roofColor, 0.88, 0.01));
        roof.name = `${name}-roof`;
        roof.position.set(x, y + height + 0.12, z);
        roof.scale.set(width + 7, 17, depth + 9);
        roof.rotation.y = heading;
        root.add(roof);
      };
      const pathOffset = (points, offset) => points.map((point, index) => {
        const previous = points[Math.max(0, index - 1)];
        const next = points[Math.min(points.length - 1, index + 1)];
        const dx = next[0] - previous[0];
        const dz = next[1] - previous[1];
        const length = Math.hypot(dx, dz) || 1;
        return [point[0] - (dz / length) * offset, point[1] + (dx / length) * offset];
      });
      const ribbon = (name, points, width, color, options = {}) => {
        const layer = Math.max(1, Number(options.layer) || 2);
        const elevation = 0.54 + layer * 0.035;
        const positions = [];
        for (let index = 0; index < points.length; index += 1) {
          const point = points[index];
          const previous = points[Math.max(0, index - 1)];
          const next = points[Math.min(points.length - 1, index + 1)];
          const dx = next[0] - previous[0];
          const dz = next[1] - previous[1];
          const length = Math.hypot(dx, dz) || 1;
          const nx = -dz / length;
          const nz = dx / length;
          const y = surfaceHeightAt(point[0], point[1]) + elevation;
          positions.push(point[0] + nx * width / 2, y, point[1] + nz * width / 2);
          positions.push(point[0] - nx * width / 2, y, point[1] - nz * width / 2);
        }
        const indices = [];
        for (let index = 0; index < points.length - 1; index += 1) {
          const a = index * 2;
          indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
        const geometry = keepGeometry(new THREE.BufferGeometry());
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(
          geometry,
          surfaceMaterial(
            color,
            layer,
            Number.isFinite(options.roughness) ? options.roughness : 0.58,
            Number.isFinite(options.metalness) ? options.metalness : 0.03
          )
        );
        mesh.name = name;
        mesh.renderOrder = layer;
        mesh.userData.surfaceQa = { layer, shape: "ribbon", width, points: points.length };
        root.add(mesh);
        return mesh;
      };
      const pond = (name, x, z, radiusX, radiusZ) => {
        const water = new THREE.Mesh(pondGeo, surfaceMaterial(0x3b7472, 2, 0.42, 0.05));
        water.name = `${name}-water`;
        water.position.set(x, surfaceHeightAt(x, z) + 0.61, z);
        water.scale.set(radiusX * 0.88, radiusZ * 0.88, 1);
        water.rotateX(-Math.PI / 2);
        water.renderOrder = 2;
        water.userData.surfaceQa = { layer: 2, shape: "ellipse", radiusX: radiusX * 0.88, radiusZ: radiusZ * 0.88 };
        root.add(water);

        const bank = new THREE.Mesh(pondBankGeo, surfaceMaterial(0x7d7147, 3, 0.98, 0));
        bank.name = `${name}-bank`;
        bank.position.set(x, surfaceHeightAt(x, z) + 0.645, z);
        bank.scale.set(radiusX, radiusZ, 1);
        bank.rotateX(-Math.PI / 2);
        bank.renderOrder = 3;
        bank.userData.surfaceQa = { layer: 3, shape: "ring", radiusX, radiusZ };
        root.add(bank);
      };

      // High-altitude readability comes from large parcels, not tiny crop rows.
      // The palette alternates living crop, ripe grain and harvested earth.
      const fieldColors = [
        0x697943, 0x84914e, 0xb49b55, 0x8f7749,
        0x596d3d, 0xc0a65c, 0x765d3e, 0x9aa45c
      ];
      const fieldXs = [-6000, -4200, -2400, 1650, 3450, 5250];
      const fieldZs = [-5200, -3350, -1500, 2050, 3900, 5750];
      let fieldIndex = 0;
      for (let zi = 0; zi < fieldZs.length; zi += 1) {
        for (let xi = 0; xi < fieldXs.length; xi += 1) {
          const x = fieldXs[xi] + ((zi % 2) * 120);
          const z = fieldZs[zi];
          // Leave the river band and central road pair clean.
          if (Math.abs(z - 1100) < 720 || Math.abs(x) < 1250) continue;
          const width = 1380 + ((xi + zi) % 3) * 140;
          const depth = 1180 + ((xi * 2 + zi) % 3) * 150;
          surface(
            `karan-field-${fieldIndex}`,
            x,
            z,
            width,
            depth,
            fieldColors[fieldIndex % fieldColors.length],
            {
              layer: 1,
              rotation: ((fieldIndex % 3) - 1) * 0.018,
              roughness: 0.99,
              metalness: 0
            }
          );
          fieldIndex += 1;
        }
      }

      // River and floodbanks run east-west. The water is visual only; the CAS
      // route crosses at the authored bridge where the dry collision plane is.
      surface("karan-river", 0, 1100, 16000, 360, 0x356f78, {
        layer: 2, roughness: 0.48, metalness: 0.05
      });
      box("karan-river-north-bank", 0, groundY(0, 1390), 1390, 16000, 1.4, 110, 0x806f45);
      box("karan-river-south-bank", 0, groundY(0, 810), 810, 16000, 1.4, 110, 0x806f45);

      // A tributary and irrigation cuts make the plain read as cultivated land
      // rather than coloured rectangles. Each watercourse is one continuous
      // indexed ribbon, so bends do not stack coplanar cards at their joints.
      const tributary = [
        [-6350, -5200], [-6030, -4300], [-5550, -3400], [-5250, -2350],
        [-5050, -1200], [-4680, -100], [-4450, 820]
      ];
      ribbon("karan-west-tributary", tributary, 92, 0x356f78, { layer: 2, roughness: 0.46, metalness: 0.04 });
      ribbon("karan-west-tributary-bank-west", pathOffset(tributary, 58), 22, 0x786d46, { layer: 3, roughness: 0.99, metalness: 0 });
      ribbon("karan-west-tributary-bank-east", pathOffset(tributary, -58), 22, 0x786d46, { layer: 3, roughness: 0.99, metalness: 0 });
      ribbon("karan-south-irrigation-channel", [
        [950, -4050], [2250, -3980], [3550, -3750], [5050, -3650], [6250, -3300]
      ], 34, 0x407878, { layer: 2, roughness: 0.52, metalness: 0.03 });
      ribbon("karan-north-irrigation-channel", [
        [-3250, 3050], [-2300, 3400], [-1000, 3650], [450, 3920], [1850, 4300]
      ], 30, 0x407878, { layer: 2, roughness: 0.52, metalness: 0.03 });

      const paddyColors = [0x587b56, 0x6f8e5d, 0x47716b, 0x87905b, 0x557f62];
      const paddyBlock = (name, cx, cz, cols, rows, cellWidth, cellDepth, gap = 22) => {
        const totalWidth = cols * cellWidth + (cols - 1) * gap;
        const totalDepth = rows * cellDepth + (rows - 1) * gap;
        surface(`${name}-bed`, cx, cz, totalWidth + 36, totalDepth + 36, 0x786945, {
          layer: 1, roughness: 1, metalness: 0
        });
        let cell = 0;
        for (let row = 0; row < rows; row += 1) {
          for (let col = 0; col < cols; col += 1) {
            const x = cx - totalWidth / 2 + cellWidth / 2 + col * (cellWidth + gap);
            const z = cz - totalDepth / 2 + cellDepth / 2 + row * (cellDepth + gap);
            surface(`${name}-cell-${cell}`, x, z, cellWidth, cellDepth, paddyColors[cell % paddyColors.length], {
              layer: 2, roughness: cell % 3 === 2 ? 0.62 : 0.94, metalness: cell % 3 === 2 ? 0.03 : 0
            });
            cell += 1;
          }
        }
      };
      paddyBlock("karan-paddy-south", 2200, -3550, 4, 3, 270, 220);
      paddyBlock("karan-paddy-southeast", 4850, -2650, 4, 4, 250, 190);
      paddyBlock("karan-paddy-northwest", -2200, 3650, 4, 3, 260, 210);
      paddyBlock("karan-paddy-northeast", 2350, 4550, 5, 3, 235, 185);

      pond("karan-irrigation-pond-south", 3350, -4900, 260, 155);
      pond("karan-irrigation-pond-west", -5650, 2300, 220, 145);
      pond("karan-irrigation-pond-east", 5450, 1800, 285, 170);
      pond("karan-irrigation-pond-north", -650, 5450, 190, 130);

      const road = (name, x, z, width, depth, color = 0x414442, layer = 5) => {
        surface(name, x, z, width, depth, color, { layer, roughness: 0.98, metalness: 0.02 });
      };
      const horizontalRoad = (name, z, xMin, xMax, depth, color, layer, blockers) => {
        const cuts = blockers
          .map(({ x, width }) => [Math.max(xMin, x - width / 2), Math.min(xMax, x + width / 2)])
          .filter(([left, right]) => right > left)
          .sort((a, b) => a[0] - b[0]);
        let cursor = xMin;
        let part = 0;
        for (const [left, right] of cuts) {
          if (left > cursor) {
            road(`${name}-part-${part}`, (cursor + left) / 2, z, left - cursor, depth, color, layer);
            part += 1;
          }
          cursor = Math.max(cursor, right);
        }
        if (cursor < xMax) road(`${name}-part-${part}`, (cursor + xMax) / 2, z, xMax - cursor, depth, color, layer);
      };
      // Two lanes make the mission's core image literal: armour and families
      // travel north in parallel, separated by less than a weapon blast radius.
      // The trunk roads stop at the bridge deck instead of continuing below it
      // and competing with the river for the same pixels.
      road("karan-military-road-south", -420, -2740, 260, 7120, 0x414442, 6);
      road("karan-military-road-north", -420, 4640, 260, 6520, 0x414442, 6);
      road("karan-evacuation-road-south", 420, -2340, 260, 6320, 0x414442, 6);
      road("karan-evacuation-road-north", 420, 4640, 260, 6520, 0x414442, 6);
      road("karan-west-farm-road", -3300, 200, 120, 12100, 0x5b5749, 3);
      road("karan-east-farm-road", 3300, 750, 120, 11100, 0x5b5749, 3);
      const trunkBlockers = [{ x: -420, width: 260 }, { x: 420, width: 260 }];
      const allVerticalBlockers = [
        { x: -3300, width: 120 }, ...trunkBlockers, { x: 3300, width: 120 }
      ];
      horizontalRoad("karan-south-link", -3550, -3100, 3100, 150, 0x414442, 5, trunkBlockers);
      horizontalRoad("karan-north-link", 5150, -3500, 3500, 150, 0x414442, 5, allVerticalBlockers);
      for (const z of [-4200, -2200, 3100, 4900]) {
        horizontalRoad(`karan-crossroad-${z}`, z, -6500, 6500, 105, 0x56554a, 4, allVerticalBlockers);
      }

      // A broad concrete overpass carries the paired trunk road across the
      // river. Low deck height avoids implying a collision surface the host
      // does not own, while piers and guard walls make it read from altitude.
      box("karan-bridge-deck", 0, groundY(0, 1100) + 3.2, 1100, 1180, 4.8, 510, 0x7b7e78, 0, 0.78, 0.12);
      for (const x of [-430, 0, 430]) {
        for (const z of [920, 1280]) {
          cylinder(`karan-bridge-pier-${x}-${z}`, x, groundY(x, z) + 1.7, z, 18, 3.4, 0x676b67);
        }
      }
      for (const x of [-570, 570]) {
        box(`karan-bridge-rail-${x}`, x, groundY(x, 1100) + 6.2, 1100, 18, 2.2, 520, 0xb0b2a9, 0, 0.82, 0.08);
      }

      function village(name, cx, cz, heading = 0) {
        const houseColors = [0xc3aa7a, 0xa89472, 0xb8b0a0, 0x9e8767];
        const roofColors = [0x6f4d3c, 0x766a55, 0x875641, 0x65584a];
        surface(`${name}-main-lane`, cx, cz, 82, 720, 0x625f52, { layer: 4, rotation: heading });
        for (let i = 0; i < 24; i += 1) {
          const side = i % 2 === 0 ? -1 : 1;
          const plot = Math.floor(i / 2);
          const row = Math.floor(plot / 3);
          const column = plot % 3;
          const x = cx + side * (98 + column * 74) + (row % 2) * 13;
          const z = cz + (row - 1.5) * 102 + column * 9;
          const width = 38 + (i % 3) * 4;
          const depth = 52 + (i % 4) * 4;
          house(
            `${name}-house-${i}`,
            x,
            z,
            width,
            depth,
            houseColors[i % houseColors.length],
            roofColors[i % roofColors.length],
            heading + (side < 0 ? 0.035 : -0.035),
            18 + (i % 3) * 2
          );
        }
        house(`${name}-barn`, cx - 330, cz - 245, 86, 118, 0x9b8a68, 0x70463a, heading, 27);
        cylinder(`${name}-silo`, cx + 315, groundY(cx + 315, cz - 235) + 18, cz - 235, 15, 36, 0xa9aaa3);
        for (const [dx, dz] of [[-13, -13], [13, -13], [-13, 13], [13, 13]]) {
          cylinder(`${name}-water-tower-leg-${dx}-${dz}`, cx + 285 + dx, groundY(cx + 285 + dx, cz + 245 + dz) + 14, cz + 245 + dz, 1.8, 28, 0x727a76);
        }
        cylinder(`${name}-water-tower-tank`, cx + 285, groundY(cx + 285, cz + 245) + 33, cz + 245, 14, 10, 0x9ba39d);
        surface(`${name}-square`, cx, cz + 265, 430, 132, 0x7e735f, { layer: 3, rotation: heading });
      }
      village("karan-village-southwest", -4300, -1650, 0.05);
      village("karan-village-east", 4050, 3000, -0.04);
      village("karan-village-northwest", -3900, 5000, 0.02);
      village("karan-village-southeast", 5100, -4900, -0.025);

      function farmstead(name, cx, cz, heading = 0) {
        surface(`${name}-yard`, cx, cz, 360, 280, 0x85734d, { layer: 2, rotation: heading });
        house(`${name}-home`, cx - 92, cz - 42, 46, 64, 0xb6a27e, 0x754c3d, heading, 21);
        house(`${name}-barn`, cx + 78, cz + 25, 82, 124, 0x958264, 0x68483b, heading, 28);
        box(`${name}-shed`, cx - 105, groundY(cx - 105, cz + 82) + 8, cz + 82, 58, 16, 42, 0x87775f, heading);
        cylinder(`${name}-silo`, cx + 140, groundY(cx + 140, cz - 80) + 15, cz - 80, 13, 30, 0xa4a69f);
      }
      farmstead("karan-farmstead-southwest", -5700, -4300, 0.04);
      farmstead("karan-farmstead-south", -2100, -5050, -0.03);
      farmstead("karan-farmstead-southeast", 3850, -4300, 0.02);
      farmstead("karan-farmstead-west", -5600, 3450, -0.04);
      farmstead("karan-farmstead-north", 600, 5650, 0.03);
      farmstead("karan-farmstead-east", 5750, 4150, -0.02);

      // Trees are rows and shelterbelts, never random noise. From high altitude
      // they divide parcels and reveal wind direction across the open plain.
      const treeMat = material(0x314b2f, 0.96, 0);
      const trunkMat = material(0x4c3724, 1, 0);
      const treePlacements = [];
      const addTree = (name, x, z, scale = 1) => {
        const y = groundY(x, z);
        treePlacements.push({ name, x, y, z, scale });
      };
      let treeIndex = 0;
      for (const x of [-1500, 1500, -5350, 5350]) {
        for (let z = -5900; z <= 6200; z += 210) {
          if (Math.abs(z - 1100) < 430) continue;
          addTree(`karan-windbreak-${treeIndex}`, x, z, 0.82 + (treeIndex % 4) * 0.06);
          treeIndex += 1;
        }
      }
      const treeDummy = new THREE.Object3D();
      const trunks = new THREE.InstancedMesh(cylGeo, trunkMat, treePlacements.length);
      const crowns = new THREE.InstancedMesh(cylGeo, treeMat, treePlacements.length);
      trunks.name = "karan-windbreak-trunks";
      crowns.name = "karan-windbreak-crowns";
      for (let index = 0; index < treePlacements.length; index += 1) {
        const tree = treePlacements[index];
        treeDummy.position.set(tree.x, tree.y + 5 * tree.scale, tree.z);
        treeDummy.scale.set(1.2 * tree.scale, 10 * tree.scale, 1.2 * tree.scale);
        treeDummy.updateMatrix();
        trunks.setMatrixAt(index, treeDummy.matrix);
        treeDummy.position.set(tree.x, tree.y + 14 * tree.scale, tree.z);
        treeDummy.scale.set(6 * tree.scale, 18 * tree.scale, 6 * tree.scale);
        treeDummy.updateMatrix();
        crowns.setMatrixAt(index, treeDummy.matrix);
      }
      trunks.instanceMatrix.needsUpdate = true;
      crowns.instanceMatrix.needsUpdate = true;
      trunks.computeBoundingBox();
      trunks.computeBoundingSphere();
      crowns.computeBoundingBox();
      crowns.computeBoundingSphere();
      root.add(trunks, crowns);

      root.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = false;
        node.receiveShadow = true;
      });
    }
  });
}
