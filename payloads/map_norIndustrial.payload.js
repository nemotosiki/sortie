// NOR INDUSTRIAL DUSK (`norIndustrialDusk`) — Sera M10 / later Nor variants.
//
// A flat industrial river corridor carries the armoured train from the freight
// yard in the south-west to the Arad transfer line in the north-east. The route
// coordinates are shared with mission_sera_m10; the decorator is visual only
// and every GPU resource is registered through the world ownership helpers.
export default function register(ctx) {
  const { WORLD_PRESETS } = ctx.tables;
  const base = WORLD_PRESETS.desertBasin;
  if (!base) throw new Error("[norIndustrialDusk] desertBasin base preset is missing");

  const railRoute = Object.freeze([
    Object.freeze([-5200, -4200]),
    Object.freeze([-4050, -3500]),
    Object.freeze([-2920, -2720]),
    Object.freeze([-1800, -1900]),
    Object.freeze([-780, -920]),
    Object.freeze([40, 120]),
    Object.freeze([780, 1120]),
    Object.freeze([1420, 1900]),
    Object.freeze([2360, 2780]),
    Object.freeze([3450, 3580]),
    Object.freeze([4750, 4320])
  ]);

  const missionAnchors = Object.freeze({
    playerStart: Object.freeze([-6100, -5600]),
    battleCenter: Object.freeze([-150, 350]),
    freightYard: Object.freeze([-4300, -3400]),
    industrialCore: Object.freeze([-1200, -900]),
    riverCrossing: Object.freeze([1120, 1580]),
    bridgeTarget: Object.freeze([1210, 1660]),
    aradTransfer: Object.freeze([4750, 4320]),
    airEntrySouth: Object.freeze([8600, -6200]),
    airEntryNorth: Object.freeze([-7600, 7800]),
    railRoute
  });

  ctx.addWorldPreset("norIndustrialDusk", {
    ...base,
    label: "NOR INDUSTRIAL — DUSK",
    regionId: "nor_industrial",
    sectorIds: Object.freeze(["south_freight_yard", "river_bridge", "arad_transfer_line"]),
    variant: "industrial_dusk",
    sceneryOrigin: [-150, 350],
    previewFocus: [200, 650],
    previewSheets: Object.freeze({
      surfaceQa: Object.freeze([
        Object.freeze({ label: "FREIGHT YARD", position: [-5600, 520, -4600], target: [-4100, 20, -3300] }),
        Object.freeze({ label: "INDUSTRIAL CORE", position: [-3300, 720, -1200], target: [-1000, 80, -650] }),
        Object.freeze({ label: "RAIL BRIDGE", position: [-900, 480, 3300], target: [1120, 45, 1580] }),
        Object.freeze({ label: "FULL CORRIDOR", position: [0, 3600, -1000], target: [0, 0, 400] })
      ])
    }),
    missionAnchors,
    clearColor: 0x6f6d70,
    sky: [
      [0, "#202938"],
      [0.3, "#4d5060"],
      [0.5, "#8c665b"],
      [0.7, "#d4865b"],
      [1, "#625759"]
    ],
    atmosphere: {
      ...base.atmosphere,
      seed: 0x4e4f5201,
      noise: 0.035,
      haze: 0.22,
      thinClouds: 18,
      cloudOpacity: 0.09,
      cloudBand: [0.38, 0.7],
      cloudTint: 0xc6a69d
    },
    fog: { color: 0x898080, near: 2700, far: 17000 },
    sun: {
      position: [-6200, 900, -5200],
      color: 0xffa164,
      radius: 118,
      glare: [
        { scale: 1950, color: 0xd66f4b, opacity: 0.42 },
        { scale: 520, color: 0xffc58e, opacity: 0.82 }
      ]
    },
    moon: null,
    stars: null,
    sunRoad: null,
    ocean: {
      ...base.ocean,
      base: "#4d4a43",
      bright: "105, 98, 82",
      dark: "42, 43, 40",
      repeat: 30,
      roughness: 0.98,
      metalness: 0,
      textureProfile: "sand",
      normalRepeat: 28,
      normalScale: [0.09, 0.12],
      normalSpeed: [0, 0],
      normalSeed: 0x4e4f5202
    },
    terrain: {
      ...base.terrain,
      seed: 0x4e4f5203,
      sand: 0x5c5547,
      grass: 0x4d5741,
      rock: 0x555459,
      peak: 0x68656a,
      snow: 0xd8d4d2,
      textureProfile: "rocky",
      fineRepeat: 30,
      macroRepeat: 5.4,
      normalRepeat: 28,
      normalStrength: 0.14,
      islandNormalStrength: 0.1,
      normalFade: [260, 2600],
      rockSlope: [0.56, 0.9],
      shoreHeight: 0.1,
      snowSoftness: 0.06
    },
    lights: {
      hemi: { sky: 0xa6a2aa, ground: 0x302f2c, intensity: 1.58 },
      key: { color: 0xff9f66, intensity: 2.42, position: [-4300, 920, -3600] },
      fill: { color: 0x657da0, intensity: 0.56, position: [3600, 620, 2900] }
    },
    mountains: {
      ...base.mountains,
      count: 18,
      radius: [320, 760],
      height: [90, 280],
      distance: [11200, 15700],
      snowyAbove: 9999,
      palette: {
        low: 0x44483f,
        mid: 0x50504b,
        rock: 0x5a575a,
        peak: 0x68656a,
        snow: 0xd8d4d2
      },
      corridor: null,
      plateau: null
    },
    islands: { count: 0, stone: 0x555459, green: 0x4d5741 },
    clouds: {
      ...base.clouds,
      scale: 1.08,
      hero: false,
      color: 0xc8b9b4,
      opacity: 0.64,
      cirrusColor: 0x9d8e91,
      cirrusOpacity: 0.3,
      texture: { seed: 0x4e4f5204, contrast: 1.1, underside: 0.62, softness: 0.96 }
    },
    decor: {
      ...base.decor,
      seed: 0x4e4f5205,
      keepClear: [{ x: -150, z: 350, r: 9800 }],
      extraIslands: { count: 8, radius: [180, 420], height: [24, 86], distance: [11800, 15300] },
      shore: null,
      trees: null,
      rocks: { count: 12, color: 0x4f4c49, scale: [7, 18] },
      city: null,
      extraClouds: null
    }
  });

  ctx.addWorldDecorator("norIndustrialWorks", {
    worlds: ["norIndustrialDusk"],
    build({ THREE, addRoot, keepGeometry, keepMaterial, surfaceHeightAt, classicDepthBuffer = false }) {
      const root = new THREE.Group();
      root.name = "norIndustrialWorks";
      addRoot(root);

      const boxGeo = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
      const cylGeo = keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 12));
      const planeGeo = keepGeometry(new THREE.PlaneGeometry(1, 1));
      const mats = new Map();
      const material = (color, roughness = 0.88, metalness = 0.04, emissive = 0, opacity = 1) => {
        const key = `${color}:${roughness}:${metalness}:${emissive}:${opacity}`;
        if (!mats.has(key)) {
          mats.set(key, keepMaterial(new THREE.MeshStandardMaterial({
            color,
            roughness,
            metalness,
            emissive,
            emissiveIntensity: emissive ? 0.9 : 0,
            transparent: opacity < 1,
            opacity
          })));
        }
        return mats.get(key);
      };
      const surfaceMats = new Map();
      const surfaceMaterial = (color, layer, roughness = 0.95, metalness = 0.01) => {
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
      const groundY = (x, z) => surfaceHeightAt(x, z) + 0.45;
      const box = (name, x, y, z, sx, sy, sz, color, ry = 0, options = {}) => {
        const mesh = new THREE.Mesh(boxGeo, material(
          color,
          options.roughness ?? 0.88,
          options.metalness ?? 0.04,
          options.emissive ?? 0,
          options.opacity ?? 1
        ));
        mesh.name = name;
        mesh.position.set(x, y, z);
        mesh.scale.set(sx, sy, sz);
        mesh.rotation.y = ry;
        root.add(mesh);
        return mesh;
      };
      const cylinder = (name, x, y, z, radius, height, color, options = {}) => {
        const mesh = new THREE.Mesh(cylGeo, material(
          color,
          options.roughness ?? 0.82,
          options.metalness ?? 0.08,
          options.emissive ?? 0,
          options.opacity ?? 1
        ));
        mesh.name = name;
        mesh.position.set(x, y + height * 0.5, z);
        mesh.scale.set(radius, height, radius);
        root.add(mesh);
        return mesh;
      };
      const surface = (name, x, z, width, depth, color, layer = 1, rotation = 0, roughness = 0.95, metalness = 0.01) => {
        const mesh = new THREE.Mesh(planeGeo, surfaceMaterial(color, layer, roughness, metalness));
        mesh.name = name;
        mesh.position.set(x, surfaceHeightAt(x, z) + 0.54 + layer * 0.035, z);
        mesh.scale.set(width, depth, 1);
        mesh.rotateX(-Math.PI / 2);
        if (rotation) mesh.rotateZ(rotation);
        mesh.renderOrder = layer;
        mesh.userData.surfaceQa = { layer, width, depth, rotation };
        root.add(mesh);
        return mesh;
      };
      const beam = (name, a, b, width, height, color, yOffset = 0) => {
        const dx = b[0] - a[0];
        const dz = b[1] - a[1];
        const length = Math.hypot(dx, dz);
        const x = (a[0] + b[0]) * 0.5;
        const z = (a[1] + b[1]) * 0.5;
        const y = groundY(x, z) + yOffset + height * 0.5;
        return box(name, x, y, z, width, height, length, color, Math.atan2(dx, dz), { roughness: 0.72, metalness: 0.12 });
      };

      // Asphalt and contaminated river water establish the large-scale read.
      surface("nor-river", 0, 1580, 16800, 520, 0x34454b, 2, 0, 0.42, 0.08);
      surface("nor-south-yard", -4050, -3350, 3300, 2100, 0x3c3d3c, 1);
      surface("nor-industrial-core", -900, -620, 4300, 3000, 0x42413e, 1);
      surface("nor-north-logistics", 3150, 3450, 3500, 2200, 0x46443e, 1);

      // The mission's one destructible bridge target stands at this crossing.
      // Geometry is split into named deck/pier groups so the runtime can hide
      // the centre span and reveal the broken abutments after destruction.
      const bridgeA = [870, 1250];
      const bridgeB = [1510, 1970];
      beam("nor-rail-bridge-deck", bridgeA, bridgeB, 34, 7, 0x55595d, 20);
      beam("nor-rail-bridge-rails", bridgeA, bridgeB, 9, 2, 0x2b2d30, 25);
      for (const [index, t] of [0.18, 0.42, 0.66, 0.86].entries()) {
        const x = bridgeA[0] + (bridgeB[0] - bridgeA[0]) * t;
        const z = bridgeA[1] + (bridgeB[1] - bridgeA[1]) * t;
        cylinder(`nor-rail-bridge-pier-${index}`, x, groundY(x, z), z, 16, 24, 0x666568);
      }
      box("nor-bridge-west-abutment", 840, groundY(840, 1220) + 13, 1220, 90, 26, 100, 0x5f5d5b, 0.72);
      box("nor-bridge-east-abutment", 1540, groundY(1540, 2000) + 13, 2000, 90, 26, 100, 0x5f5d5b, 0.72);

      // Freight yard tracks are visual parallel spurs; the moving rail line is
      // laid by the mission host and shares the missionAnchors route.
      for (let lane = -2; lane <= 2; lane += 1) {
        beam(`nor-yard-track-${lane}`, [-5250 + lane * 30, -4050 - lane * 24], [-2850 + lane * 30, -2550 - lane * 24], 5, 0.55, 0x24272a, 0.8);
      }
      for (let index = 0; index < 9; index += 1) {
        box(`nor-yard-crate-${index}`, -4740 + (index % 3) * 240, groundY(-4740, -3240) + 12, -3240 + Math.floor(index / 3) * 150, 150, 24, 72, 0x674e3c, 0.08);
      }
      box("nor-freight-station", -3550, groundY(-3550, -2940) + 28, -2940, 520, 56, 130, 0x615a52, 0.6);
      box("nor-freight-platform", -3650, groundY(-3650, -3100) + 2.5, -3100, 760, 5, 70, 0x77736c, 0.6);

      const factory = (id, x, z, width, depth, height, heading = 0) => {
        const y = groundY(x, z);
        box(`${id}-hall`, x, y + height * 0.5, z, width, height, depth, 0x57575a, heading, { roughness: 0.86, metalness: 0.08 });
        box(`${id}-roof`, x, y + height + 2.5, z, width + 8, 5, depth + 8, 0x35383c, heading, { roughness: 0.74, metalness: 0.14 });
        for (const side of [-1, 1]) {
          box(`${id}-window-${side}`, x + Math.cos(heading) * side * width * 0.42, y + height * 0.62, z - Math.sin(heading) * side * width * 0.42, 5, height * 0.2, depth * 0.65, 0x3d322d, heading, { emissive: 0xe67b3f });
        }
      };
      factory("nor-foundry", -1650, -950, 680, 420, 96, 0.12);
      factory("nor-rolling-mill", -460, -520, 980, 360, 82, -0.08);
      factory("nor-machine-works", 720, -140, 620, 520, 72, 0.04);
      factory("nor-north-depot", 2960, 3300, 760, 430, 66, 0.08);

      // Chimneys are the long-distance silhouette; dim orange caps survive the
      // industrial haze without turning the scene into a night map.
      const chimneys = [
        [-1900, -780, 18, 210], [-1450, -620, 15, 165], [-620, -280, 17, 235],
        [540, -20, 13, 145], [2580, 3180, 14, 178], [3340, 3520, 16, 205]
      ];
      for (const [index, [x, z, radius, height]] of chimneys.entries()) {
        cylinder(`nor-chimney-${index}`, x, groundY(x, z), z, radius, height, 0x4d4b4c, { roughness: 0.78, metalness: 0.08 });
        cylinder(`nor-chimney-cap-${index}`, x, groundY(x, z) + height - 8, z, radius + 2, 9, 0x7a3724, { emissive: 0xa84522 });
      }

      // Substation and utility corridor foreshadow the KEREN power cars.
      surface("nor-substation-yard", 1680, 320, 920, 640, 0x4a4947, 3);
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          const x = 1380 + col * 140;
          const z = 100 + row * 190;
          cylinder(`nor-substation-insulator-${row}-${col}`, x, groundY(x, z), z, 5, 34, 0x777b80, { metalness: 0.35 });
          box(`nor-substation-bus-${row}-${col}`, x, groundY(x, z) + 31, z, 62, 3, 4, 0xb07444, 0, { metalness: 0.45 });
        }
      }
      box("nor-substation-control", 2160, groundY(2160, 430) + 24, 430, 210, 48, 110, 0x5d5b56);

      // Workers' housing and service roads keep the bridge choice visibly civil.
      const housing = [
        [-3100, 500], [-2780, 520], [-2460, 540], [-3100, 840], [-2780, 860], [-2460, 880],
        [2250, 2150], [2570, 2180], [2890, 2210], [2250, 2490], [2570, 2520], [2890, 2550]
      ];
      for (const [index, [x, z]] of housing.entries()) {
        const y = groundY(x, z);
        box(`nor-housing-${index}`, x, y + 26, z, 180, 52, 110, index % 2 ? 0x6c625a : 0x625d59, (index % 3 - 1) * 0.03);
        box(`nor-housing-roof-${index}`, x, y + 54, z, 188, 5, 118, 0x3d3b3c, (index % 3 - 1) * 0.03);
      }
      surface("nor-workers-road-west", -2780, 700, 1100, 74, 0x333537, 5);
      surface("nor-workers-road-east", 2570, 2350, 1150, 74, 0x333537, 5);

      // Sparse orange industrial lamps trace the corridor at dusk.
      const lamps = [
        [-4850, -3800], [-4000, -3240], [-3100, -2600], [-2050, -1750],
        [-980, -760], [180, 300], [970, 1300], [1550, 2070], [2600, 3000], [3800, 3820]
      ];
      for (const [index, [x, z]] of lamps.entries()) {
        const y = groundY(x, z);
        cylinder(`nor-lamp-post-${index}`, x, y, z, 2.2, 28, 0x47494d, { metalness: 0.3 });
        box(`nor-lamp-head-${index}`, x, y + 29, z, 11, 4, 7, 0xffa05c, 0, { emissive: 0xff7b35 });
      }
    }
  });
}
