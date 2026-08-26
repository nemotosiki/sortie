// VER ICE COAST (`verIceCoast`) — Sera M11's high-altitude polar escort map.
//
// The mission crosses a broad frozen coast at about 5,100 m. Large-scale ice
// shelves and dark sea leads provide motion/altitude cues while all random
// relief remains far below and outside the 23 km operation corridor.
export default function register(ctx) {
  const { WORLD_PRESETS } = ctx.tables;
  const base = WORLD_PRESETS.glacierCanyon;
  if (!base) throw new Error("[verIceCoast] glacierCanyon base preset is missing");

  const missionAnchors = Object.freeze({
    playerStart: Object.freeze([-10800, -7200]),
    strikeStart: Object.freeze([-9600, -6400]),
    strikeExit: Object.freeze([9600, 6400]),
    operationLine: Object.freeze([9000, 6000]),
    battleCenter: Object.freeze([0, 0]),
    firstIntercept: Object.freeze([-1800, 4100]),
    northIntercept: Object.freeze([3100, 8600]),
    southIntercept: Object.freeze([11200, -6500]),
    diversionEntry: Object.freeze([-2500, -8200]),
    weatherStation: Object.freeze([4300, -2500]),
    fishingHarbour: Object.freeze([-3300, 3300])
  });

  ctx.addWorldPreset("verIceCoast", {
    ...base,
    label: "VER ICE COAST",
    regionId: "ver_ice_coast",
    sectorIds: Object.freeze(["western_ice_approach", "ver_shelf", "operation_line"]),
    variant: "polar_morning_high_altitude",
    sceneryOrigin: [0, 0],
    previewFocus: [0, 0],
    missionAnchors,
    clearColor: 0xa7c2d1,
    sky: [
      [0, "#17355a"], [0.27, "#3d7198"], [0.44, "#8eb8cf"],
      [0.5, "#e4d5bb"], [0.57, "#abc4d0"], [0.73, "#819fab"], [1, "#607985"]
    ],
    atmosphere: {
      ...base.atmosphere,
      seed: 0x56455211,
      noise: 0.012,
      haze: 0.085,
      thinClouds: 18,
      cloudOpacity: 0.045,
      cloudBand: [0.38, 0.7],
      cloudTint: 0xe7f0f3
    },
    // The longest live escort geometry is about 26 km. The camera far plane
    // follows this value in the host, so the operation line remains drawable.
    fog: { color: 0xa7c2d1, near: 10500, far: 34000 },
    sun: {
      position: [-2700, 780, -1100], color: 0xffe2bd, radius: 74,
      glare: [
        { scale: 1350, color: 0xffd5a2, opacity: 0.34 },
        { scale: 340, color: 0xfff5df, opacity: 0.82 }
      ]
    },
    moon: null,
    stars: null,
    sunRoad: {
      color: 0xffdfb2, opacity: 0.17, width: 900, length: 6200,
      rotationY: Math.atan2(2700, 1100), position: [1600, 0.5, 650]
    },
    ocean: {
      ...base.ocean,
      base: "#153f58",
      bright: "155, 203, 220",
      dark: "9, 36, 52",
      repeat: 32,
      roughness: 0.34,
      metalness: 0.27,
      normalRepeat: 40,
      normalScale: [0.2, 0.28],
      normalSpeed: [0.004, 0.001],
      normalSeed: 0x56455212
    },
    terrain: {
      ...base.terrain,
      seed: 0x56455213,
      sand: 0x89a8b5,
      grass: 0xb9ccd3,
      rock: 0x748b98,
      peak: 0xd8e5e9,
      snow: 0xf0f5f4,
      fineRepeat: 17,
      macroRepeat: 3.3,
      normalRepeat: 24,
      normalStrength: 0.2,
      islandNormalStrength: 0.13,
      normalFade: [300, 2400],
      rockSlope: [0.2, 0.58],
      shoreHeight: 0.17,
      snowLine: 0.1,
      snowSoftness: 0.1
    },
    lights: {
      hemi: { sky: 0xd6edf5, ground: 0x334a55, intensity: 2.05 },
      key: { color: 0xffe2bd, intensity: 2.25, position: [-2700, 780, -1100] },
      fill: { color: 0x92c5e4, intensity: 0.72, position: [1500, 450, 2400] }
    },
    // Relief sits outside the combat route and never reaches the 4.8–5.4 km
    // escort corridor. At mission altitude it reads as a distant coast/ridge.
    mountains: {
      ...base.mountains,
      count: 12,
      radius: [700, 1500],
      height: [580, 1380],
      distance: [14500, 22500],
      snowyAbove: 0,
      snowLine: 0.18,
      roughness: 0.94,
      palette: {
        low: 0x607a87, mid: 0x8099a4, rock: 0x9db0b8,
        peak: 0xd5e2e7, snow: 0xeff5f6
      },
      corridor: null,
      plateau: null
    },
    islands: { count: 8, stone: 0x78929e, green: 0xd9e7ea },
    clouds: {
      ...base.clouds,
      scale: 1.08,
      hero: false,
      color: 0xeaf2f3,
      opacity: 0.56,
      cirrusColor: 0xe5edef,
      cirrusOpacity: 0.31,
      texture: { seed: 0x56455214, contrast: 0.9, underside: 0.38, softness: 1.12 }
    },
    decor: {
      ...base.decor,
      seed: 0x56455215,
      keepClear: [{ box: { x: 4200, z0: -9000, z1: 9000 } }],
      extraIslands: { count: 10, radius: [260, 760], height: [50, 220], distance: [8500, 15000] },
      shore: { sand: 0xdce9eb, shallow: 0x78aec0, opacity: 0.58, width: 1.24 },
      trees: null,
      floes: { count: 34, color: 0xdcebed, scale: [45, 150], along: { x: 12000, z: [9000, -9000] } },
      rocks: { count: 12, color: 0x6d8792, scale: [16, 48] },
      extraClouds: {
        towers: 0, towerSize: [70, 110], towerBase: 1600,
        stratus: 16, stratusSize: [300, 650], stratusBase: 2600,
        distance: [6500, 15000]
      }
    }
  });

  ctx.addWorldDecorator("verIceCoastWorks", {
    worlds: ["verIceCoast"],
    build({ THREE, addRoot, keepGeometry, keepMaterial }) {
      const root = new THREE.Group();
      root.name = "verIceCoastWorks";
      addRoot(root);

      const boxGeometry = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
      const cylinderGeometry = keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 12));
      const materials = new Map();
      const material = (color, options = {}) => {
        const key = `${color}:${options.emissive || 0}:${options.opacity ?? 1}:${options.metalness ?? 0.02}`;
        if (!materials.has(key)) {
          materials.set(key, keepMaterial(new THREE.MeshStandardMaterial({
            color,
            roughness: options.roughness ?? 0.9,
            metalness: options.metalness ?? 0.02,
            emissive: options.emissive || 0,
            emissiveIntensity: options.emissive ? (options.emissiveIntensity ?? 1) : 0,
            transparent: (options.opacity ?? 1) < 1,
            opacity: options.opacity ?? 1,
            depthWrite: (options.opacity ?? 1) >= 1
          })));
        }
        return materials.get(key);
      };
      const box = (name, x, y, z, sx, sy, sz, color, rotation = 0, options = {}) => {
        const mesh = new THREE.Mesh(boxGeometry, material(color, options));
        mesh.name = name;
        mesh.position.set(x, y, z);
        mesh.scale.set(sx, sy, sz);
        mesh.rotation.y = rotation;
        root.add(mesh);
        return mesh;
      };
      const cylinder = (name, x, y, z, radius, height, color, options = {}) => {
        const mesh = new THREE.Mesh(cylinderGeometry, material(color, options));
        mesh.name = name;
        mesh.position.set(x, y, z);
        mesh.scale.set(radius, height, radius);
        root.add(mesh);
        return mesh;
      };

      const flatPolygon = (name, points, y, color, options = {}) => {
        const shape = new THREE.Shape();
        points.forEach(([x, z], index) => {
          // ShapeGeometry is authored in XY and then laid into XZ. Invert its
          // second axis here so the named world-space Z anchors stay literal
          // after the -90 degree rotation below.
          if (index === 0) shape.moveTo(x, -z);
          else shape.lineTo(x, -z);
        });
        shape.closePath();
        const geometry = keepGeometry(new THREE.ShapeGeometry(shape, 12));
        const mesh = new THREE.Mesh(geometry, material(color, options));
        mesh.name = name;
        mesh.position.y = y;
        mesh.rotation.x = -Math.PI / 2;
        root.add(mesh);
        return mesh;
      };

      // One continuous, jagged shelf replaces a stack of rectangular plates.
      // The coastline points turn at 1–4 km intervals so the silhouette remains
      // irregular even from 5 km, while the far boundary stays beyond fog.
      flatPolygon("verIceShelfWest", [
        [-30000, -1000], [-27000, -400], [-24000, 350], [-21300, -650],
        [-18800, 800], [-16000, 250], [-13400, 1600], [-10800, 550],
        [-8200, 2250], [-5900, 1450], [-3700, 3100], [-1400, 2450],
        [900, 4100], [3200, 3300], [5500, 5200], [8100, 4250],
        [10800, 6100], [13900, 5400], [16800, 7300], [20100, 6500],
        [23200, 8500], [26500, 7800], [30000, 9800], [30000, 30000],
        [-30000, 30000]
      ], 1.35, 0xd7e7e9, { roughness: 0.93 });
      flatPolygon("verIceShelfEast", [
        [14200, -1800], [16400, -900], [18300, -1300], [20100, 100],
        [22200, -250], [24500, 1500], [26300, 1100], [28600, 3100],
        [30000, 2700], [30000, 7600], [26500, 6800], [23200, 6500],
        [20400, 5000], [17800, 4700], [15700, 2900], [13900, 1900]
      ], 1.3, 0xc9dde1, { roughness: 0.91 });

      // Wide jagged blue-grey leads break the shelf and show its scale. They
      // are visual water windows, not colliders or mission surfaces.
      flatPolygon("verIceLeadOne", [
        [-5900, 1350], [-5350, 1750], [-5100, 3150], [-4550, 3900],
        [-4350, 5550], [-3700, 6500], [-3550, 9100], [-4100, 11200],
        [-4750, 9000], [-4900, 6750], [-5550, 5800], [-5650, 3750],
        [-6200, 2850]
      ], 1.8, 0x17485f, { roughness: 0.4, metalness: 0.17 });
      flatPolygon("verIceLeadTwo", [
        [5400, 5050], [6100, 5400], [7100, 6600], [7800, 6800],
        [9000, 7900], [9700, 8100], [11100, 9600], [10600, 10500],
        [9300, 9100], [8450, 8900], [7350, 7600], [6700, 7400],
        [5750, 6200], [5000, 5900]
      ], 1.82, 0x214f63, { roughness: 0.42, metalness: 0.15 });

      // Authored floe field along the operation-line side of the coast.
      for (let i = 0; i < 42; i += 1) {
        const angle = i * 2.3999632297;
        const band = 2500 + (i % 9) * 690;
        const x = 2500 + Math.cos(angle) * band + (i % 4) * 520;
        const z = -3200 + Math.sin(angle) * band * 0.72;
        const radius = 70 + (i % 7) * 34;
        const floe = cylinder(`verAuthoredFloe${i + 1}`, x, 1.45, z, radius, 2.4, i % 3 ? 0xdcebed : 0xc8dce1);
        floe.scale.z *= 0.56 + (i % 5) * 0.11;
        floe.rotation.y = angle * 0.37;
      }

      // A compact fishing harbour gives the western shelf a recognizable
      // human scale cue without becoming a target or entering collision logic.
      box("verHarbourQuay", -3300, 8, 3300, 950, 13, 130, 0x596a70, 0.18);
      for (let i = 0; i < 9; i += 1) {
        const x = -3800 + (i % 5) * 250;
        const z = 3850 + Math.floor(i / 5) * 230;
        box(`verHarbourBuilding${i + 1}`, x, 27, z, 150, 50 + (i % 3) * 16, 120,
          i % 2 ? 0xb95a49 : 0xd4d9d5, (i % 3 - 1) * 0.08);
      }
      cylinder("verHarbourBeacon", -2770, 45, 3170, 10, 82, 0xe5e9e6);
      cylinder("verHarbourBeaconLamp", -2770, 89, 3170, 18, 7, 0x7ce8dc,
        { emissive: 0x62e6d7, emissiveIntensity: 2.1 });

      // Weather station: four instrument masts around a low operations block.
      box("verWeatherStation", 4300, 24, -2500, 410, 48, 250, 0xcbd5d5, -0.12);
      for (const [index, x, z] of [[1, 4050, -2750], [2, 4550, -2740], [3, 4100, -2220], [4, 4560, -2200]]) {
        cylinder(`verWeatherMast${index}`, x, 70, z, 6, 136, 0x6f7e83);
        cylinder(`verWeatherLamp${index}`, x, 141, z, 13, 7, 0xff7c5b,
          { emissive: 0xff4f35, emissiveIntensity: 2.2 });
      }

      root.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = false;
        node.receiveShadow = true;
      });
    }
  });
}
