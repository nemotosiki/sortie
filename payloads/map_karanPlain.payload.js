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
    build({ THREE, addRoot, keepGeometry, keepMaterial, surfaceHeightAt }) {
      const root = new THREE.Group();
      root.name = "karanPlainWorks";
      addRoot(root);

      const boxGeo = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
      const cylGeo = keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 10));
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
      const groundY = (x, z) => surfaceHeightAt(x, z) + 0.45;

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
          box(
            `karan-field-${fieldIndex}`,
            x,
            groundY(x, z),
            z,
            width,
            0.28,
            depth,
            fieldColors[fieldIndex % fieldColors.length],
            ((fieldIndex % 3) - 1) * 0.018,
            0.99,
            0
          );
          fieldIndex += 1;
        }
      }

      // River and floodbanks run east-west. The water is visual only; the CAS
      // route crosses at the authored bridge where the dry collision plane is.
      box("karan-river", 0, groundY(0, 1100) + 0.02, 1100, 16000, 0.22, 360, 0x356f78, 0, 0.48, 0.05);
      box("karan-river-north-bank", 0, groundY(0, 1390), 1390, 16000, 1.4, 110, 0x806f45);
      box("karan-river-south-bank", 0, groundY(0, 810), 810, 16000, 1.4, 110, 0x806f45);

      const road = (name, x, z, width, depth, color = 0x414442) => {
        box(name, x, groundY(x, z) + 0.34, z, width, 0.54, depth, color, 0, 0.98, 0.02);
      };
      // Two lanes make the mission's core image literal: armour and families
      // travel north in parallel, separated by less than a weapon blast radius.
      road("karan-military-road", -420, 800, 260, 14200);
      road("karan-evacuation-road", 420, 1200, 260, 13400);
      road("karan-south-link", 0, -3550, 6200, 150);
      road("karan-north-link", 0, 5150, 7000, 150);
      road("karan-west-farm-road", -3300, 200, 120, 12100, 0x5b5749);
      road("karan-east-farm-road", 3300, 750, 120, 11100, 0x5b5749);
      for (const z of [-4200, -2200, 3100, 4900]) {
        road(`karan-crossroad-${z}`, 0, z, 13000, 105, 0x56554a);
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
        for (let i = 0; i < 14; i += 1) {
          const row = Math.floor(i / 5);
          const col = i % 5;
          const x = cx + (col - 2) * 78 + (row % 2) * 24;
          const z = cz + (row - 1) * 96;
          const y = groundY(x, z);
          box(`${name}-house-${i}`, x, y + 10, z, 42, 20, 58, houseColors[i % houseColors.length], heading + (i % 2 ? 0.04 : -0.03));
          box(`${name}-roof-${i}`, x, y + 22, z, 48, 4, 64, i % 3 ? 0x6f4d3c : 0x766a55, heading + (i % 2 ? 0.04 : -0.03));
        }
        cylinder(`${name}-water-tower`, cx + 230, groundY(cx + 230, cz - 140) + 24, cz - 140, 15, 48, 0x8f978f);
        box(`${name}-square`, cx, groundY(cx, cz + 220) + 0.5, cz + 220, 390, 0.5, 120, 0x7e735f);
      }
      village("karan-village-southwest", -4300, -1650, 0.05);
      village("karan-village-east", 4050, 3000, -0.04);
      village("karan-village-northwest", -3900, 5000, 0.02);

      // Trees are rows and shelterbelts, never random noise. From high altitude
      // they divide parcels and reveal wind direction across the open plain.
      const treeMat = material(0x314b2f, 0.96, 0);
      const trunkMat = material(0x4c3724, 1, 0);
      const addTree = (name, x, z, scale = 1) => {
        const y = groundY(x, z);
        const trunk = new THREE.Mesh(cylGeo, trunkMat);
        trunk.name = `${name}-trunk`;
        trunk.position.set(x, y + 5 * scale, z);
        trunk.scale.set(1.2 * scale, 5 * scale, 1.2 * scale);
        root.add(trunk);
        const crown = new THREE.Mesh(cylGeo, treeMat);
        crown.name = `${name}-crown`;
        crown.position.set(x, y + 14 * scale, z);
        crown.scale.set(6 * scale, 9 * scale, 6 * scale);
        root.add(crown);
      };
      let treeIndex = 0;
      for (const x of [-1500, 1500, -5350, 5350]) {
        for (let z = -5900; z <= 6200; z += 210) {
          if (Math.abs(z - 1100) < 430) continue;
          addTree(`karan-windbreak-${treeIndex}`, x, z, 0.82 + (treeIndex % 4) * 0.06);
          treeIndex += 1;
        }
      }

      root.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = false;
        node.receiveShadow = true;
      });
    }
  });
}
