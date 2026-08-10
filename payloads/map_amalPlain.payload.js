// AMAL PLAIN (`amalPlain`) — Sera's dawn radar corridor for M02.
//
// The map is deliberately open. M01 taught basic interception over the coast;
// M02 needs long sight lines so the player can read an eastern air attack and a
// western TEL escape at the same time. The dry base plane is inherited from
// desertBasin, but its palette, haze, distant relief and procedural works turn
// it into cultivated steppe rather than sand.
export default function register(ctx) {
  const { WORLD_PRESETS } = ctx.tables;
  const base = WORLD_PRESETS.desertBasin;
  if (!base) throw new Error("[amalPlain] desertBasin base preset is missing");

  ctx.addWorldPreset("amalPlain", {
    ...base,
    label: "AMAL PLAIN",
    sceneryOrigin: [0, 0],
    clearColor: 0xa9b5b3,
    sky: [
      [0, "#152946"],
      [0.28, "#426b8a"],
      [0.5, "#9bb5bf"],
      [0.58, "#e5c39a"],
      [0.68, "#c8b69a"],
      [1, "#687778"]
    ],
    atmosphere: {
      ...base.atmosphere,
      seed: 0x4a6d2101,
      noise: 0.015,
      haze: 0.12,
      thinClouds: 10,
      cloudOpacity: 0.045,
      cloudBand: [0.44, 0.68],
      cloudTint: 0xe9edef
    },
    fog: { color: 0xaeb9b4, near: 2100, far: 11800 },
    sun: {
      position: [-2850, 980, -4700],
      color: 0xffd2a1,
      radius: 76,
      glare: [
        { scale: 1380, color: 0xffbf84, opacity: 0.38 },
        { scale: 390, color: 0xffead0, opacity: 0.82 }
      ]
    },
    moon: null,
    stars: null,
    sunRoad: null,

    // The engine's ocean plane is reused as dry land, following desertBasin's
    // proven contract. Both normal speeds remain zero so the fields never crawl.
    ocean: {
      ...base.ocean,
      base: "#5b6046",
      bright: "137, 143, 96",
      dark: "54, 60, 42",
      repeat: 18,
      roughness: 0.98,
      metalness: 0,
      textureProfile: "sand",
      normalRepeat: 22,
      normalScale: [0.12, 0.18],
      normalSpeed: [0, 0],
      normalSeed: 0x4a6d2102
    },
    terrain: {
      ...base.terrain,
      seed: 0x4a6d2103,
      sand: 0x827c58,
      grass: 0x596443,
      rock: 0x666454,
      peak: 0x696858,
      snow: 0xdde1dc,
      textureProfile: "grassland",
      fineRepeat: 20,
      macroRepeat: 3.8,
      normalRepeat: 22,
      normalStrength: 0.2,
      islandNormalStrength: 0.15,
      normalFade: [220, 1900],
      rockSlope: [0.38, 0.78],
      shoreHeight: 0.2,
      snowSoftness: 0.08
    },
    lights: {
      hemi: { sky: 0xb8d1df, ground: 0x34362d, intensity: 1.72 },
      key: { color: 0xffd5ac, intensity: 2.2, position: [-1600, 950, -2400] },
      fill: { color: 0x87b3d0, intensity: 0.54, position: [1100, 260, 900] }
    },
    mountains: {
      ...base.mountains,
      count: 9,
      radius: [180, 360],
      height: [70, 190],
      distance: [7600, 9800],
      snowyAbove: 9999,
      snowLine: 0.72,
      roughness: 0.95,
      palette: {
        low: 0x4f5942,
        mid: 0x5c6249,
        rock: 0x666454,
        peak: 0x696858,
        snow: 0xdde1dc
      },
      corridor: null,
      plateau: null
    },
    islands: { count: 0, stone: 0x666454, green: 0x596443 },
    clouds: {
      ...base.clouds,
      scale: 0.88,
      hero: false,
      color: 0xeaf0f1,
      opacity: 0.55,
      cirrusColor: 0xe6ebed,
      cirrusOpacity: 0.21,
      texture: { seed: 0x4a6d2104, contrast: 1.02, underside: 0.42, softness: 1.05 }
    },
    decor: {
      ...base.decor,
      seed: 0x4a6d2105,
      keepClear: [{ x: 0, z: 0, r: 7200 }],
      extraIslands: { count: 8, radius: [100, 240], height: [20, 80], distance: [7600, 9400] },
      shore: null,
      trees: { perIsland: 7, color: 0x364b2f, trunk: 0x453625, height: [8, 17] },
      rocks: { count: 10, color: 0x55574d, scale: [6, 16] },
      city: null,
      extraClouds: null
    }
  });

  ctx.addWorldDecorator("amalPlainWorks", {
    worlds: ["amalPlain"],
    build({ THREE, addRoot, keepGeometry, keepMaterial, surfaceHeightAt }) {
      const root = new THREE.Group();
      root.name = "amalPlainWorks";
      addRoot(root);

      const boxGeo = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
      const cylGeo = keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 12));
      const mats = new Map();
      const material = (color, roughness = 0.9, metalness = 0.02, emissive = 0) => {
        const key = `${color}:${roughness}:${metalness}:${emissive}`;
        if (!mats.has(key)) {
          mats.set(key, keepMaterial(new THREE.MeshStandardMaterial({
            color, roughness, metalness,
            emissive,
            emissiveIntensity: emissive ? 0.9 : 0
          })));
        }
        return mats.get(key);
      };
      const box = (x, y, z, sx, sy, sz, color, ry = 0, roughness = 0.9, metalness = 0.02) => {
        const mesh = new THREE.Mesh(boxGeo, material(color, roughness, metalness));
        mesh.position.set(x, y, z);
        mesh.scale.set(sx, sy, sz);
        mesh.rotation.y = ry;
        root.add(mesh);
        return mesh;
      };
      const cylinder = (x, y, z, radius, height, color, emissive = 0) => {
        const mesh = new THREE.Mesh(cylGeo, material(color, 0.76, 0.08, emissive));
        mesh.position.set(x, y, z);
        mesh.scale.set(radius, height, radius);
        root.add(mesh);
        return mesh;
      };
      const groundY = (x, z) => surfaceHeightAt(x, z) + 0.55;

      // Broad farm parcels. Thin boxes avoid adding a texture dependency and
      // remain legible from both high altitude and low attack runs.
      const fieldColors = [0x697348, 0x77754a, 0x59683f, 0x8a8155, 0x626b43];
      const fields = [
        [-4400, -2600, 1700, 900, -0.05], [-2300, -2800, 1500, 820, 0.03],
        [200, -2850, 1900, 760, -0.02], [2700, -2600, 1500, 900, 0.04],
        [4550, -2300, 1100, 720, -0.06], [-4200, -700, 1450, 760, 0.02],
        [-1900, -650, 1650, 720, -0.03], [550, -620, 1750, 760, 0.02],
        [3100, -720, 1600, 700, -0.04], [-3900, 1350, 1500, 780, -0.02],
        [-1450, 1450, 1700, 820, 0.04], [1100, 1450, 1800, 780, -0.03],
        [3650, 1450, 1450, 820, 0.03], [-3200, 3350, 1800, 760, 0.02],
        [-650, 3400, 1900, 820, -0.03], [2350, 3300, 1900, 780, 0.04]
      ];
      fields.forEach(([x, z, sx, sz, ry], index) => {
        box(x, groundY(x, z), z, sx, 0.32, sz, fieldColors[index % fieldColors.length], ry, 0.98, 0);
      });

      // East-west military highway. TELs use the same authored line in mission
      // data, so their movement reads as driving on the visible road.
      box(0, groundY(0, 180), 180, 13200, 0.8, 34, 0x3c4140, 0, 0.96, 0.02);
      box(0, groundY(0, 180) + 0.55, 180, 13200, 0.16, 2.6, 0xd8d1b8, 0, 0.9, 0);
      for (let x = -6200; x <= 6200; x += 240) {
        box(x, groundY(x, 180) + 0.8, 180, 82, 0.18, 1.5, 0xe3dfca, 0, 0.88, 0);
      }

      // Two north-south service roads join the friendly radar facilities.
      for (const x of [2200, 3300]) {
        box(x, groundY(x, 900), 900, 22, 0.65, 3500, 0x444846, 0, 0.96, 0.02);
      }
      box(2750, groundY(2750, 2500), 2500, 2200, 0.65, 24, 0x444846, 0, 0.96, 0.02);

      function radarFacility(x, z, heading, labelOffset) {
        const y = groundY(x, z);
        box(x, y, z, 340, 1.1, 260, 0x555a58, heading, 0.98, 0);
        box(x - 70, y + 18, z, 130, 36, 105, 0x7c817d, heading, 0.82, 0.04);
        box(x + 95, y + 13, z + 45, 95, 26, 78, 0x6f7572, heading, 0.84, 0.04);
        cylinder(x + 40, y + 55, z - 45, 8, 105, 0x6a706e);
        const dish = new THREE.Mesh(cylGeo, material(0xb9c2c0, 0.72, 0.22));
        dish.position.set(x + 40, y + 112, z - 45);
        dish.scale.set(42, 4.5, 42);
        dish.rotation.z = Math.PI * 0.5;
        dish.rotation.y = heading + 0.35;
        root.add(dish);
        cylinder(x - 118, y + 34, z - 78, 3.5, 68, 0x767d79, 0xe46645);
        box(x + labelOffset, y + 4, z - 125, 56, 8, 18, 0x58615c, heading, 0.88, 0.02);
      }

      // Coordinates are shared with M02's protected-facility contract.
      radarFacility(2450, -1280, 0.08, -145);
      radarFacility(3350, 2080, -0.06, 145);

      // Sparse farm settlements and windbreaks; enough to establish scale but
      // never dense enough to hide ground targets.
      const hamlets = [[-3300, -1500], [-1150, 2300], [850, -1900], [4450, 850]];
      for (const [hx, hz] of hamlets) {
        const y = groundY(hx, hz);
        for (let i = 0; i < 7; i += 1) {
          const ox = (i % 3) * 48 - 48;
          const oz = Math.floor(i / 3) * 58 - 58;
          box(hx + ox, y + 8, hz + oz, 30, 16, 42, i % 2 ? 0x8b8171 : 0x77796e, 0.05 * i, 0.92, 0.01);
          box(hx + ox, y + 17, hz + oz, 34, 3, 46, 0x594c43, 0.05 * i, 0.9, 0.01);
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
