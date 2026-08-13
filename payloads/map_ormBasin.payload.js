// ORM BASIN NIGHT (`ormBasinNight`) — Sera M08's moonlit low-level strike map.
//
// The base engine's desert plane is reused as dry ground. A dark mountain ring
// gives the basin a real collision silhouette, while the decorator owns the
// airfield, fuel works, payment relay and settlement. Settlement lighting lives
// in its own named group so the M08 host contract can black it out without
// touching the runway or oil-field navigation lights.
export default function register(ctx) {
  const { WORLD_PRESETS } = ctx.tables;
  const base = WORLD_PRESETS.desertBasin;
  if (!base) throw new Error("[ormBasin] desertBasin base preset is missing");

  const missionAnchors = Object.freeze({
    playerStart: Object.freeze([-7600, -2800]),
    basinCenter: Object.freeze([0, 0]),
    airfield: Object.freeze([1450, 250]),
    fuelDistrict: Object.freeze([1800, -1350]),
    paymentRelay: Object.freeze([-1650, -900]),
    settlement: Object.freeze([-2850, -1650]),
    westernIngress: Object.freeze([-5200, -1900])
  });

  ctx.addWorldPreset("ormBasinNight", {
    ...base,
    label: "ORM BASIN · NIGHT",
    sceneryOrigin: [0, 0],
    previewFocus: [0, 0],
    regionId: "orm_basin",
    sectorIds: Object.freeze(["western_ingress", "night_airfield", "payment_district"]),
    variant: "night_moonlit",
    missionAnchors,
    clearColor: 0x080b18,
    sky: [
      [0, "#02030a"],
      [0.28, "#070b19"],
      [0.46, "#17223a"],
      [0.56, "#242e44"],
      [0.7, "#0c1120"],
      [1, "#060915"]
    ],
    atmosphere: {
      ...base.atmosphere,
      seed: 0x4f524d08,
      noise: 0.026,
      haze: 0.12,
      thinClouds: 8,
      cloudOpacity: 0.045,
      cloudBand: [0.4, 0.67],
      cloudTint: 0x777f9a
    },
    fog: { color: 0x171d2c, near: 2600, far: 13200 },
    sun: null,
    moon: {
      position: [-3600, 1800, -4800],
      color: 0xe8edff,
      radius: 78,
      glare: [
        { scale: 1050, color: 0x899bd8, opacity: 0.28 },
        { scale: 280, color: 0xf4f6ff, opacity: 0.82 }
      ]
    },
    stars: { count: 480, radius: 7200, size: 2.1, seed: 0x4f524d09, color: 0xcbd6ff, warm: 0xffd2a4 },
    sunRoad: {
      color: 0x9aaeff,
      opacity: 0,
      width: 10,
      length: 10,
      rotationY: 0,
      position: [0, 0.4, 0]
    },
    ocean: {
      ...base.ocean,
      base: "#171713",
      bright: "63, 60, 50",
      dark: "8, 9, 10",
      textureProfile: "sand",
      colorContrast: 0.18,
      repeat: 22,
      roughness: 1,
      metalness: 0,
      colorSpeed: [0, 0],
      normalRepeat: 20,
      normalScale: [0.09, 0.12],
      normalSpeed: [0, 0],
      normalSeed: 0x4f524d0a
    },
    terrain: {
      ...base.terrain,
      seed: 0x4f524d0b,
      sand: 0x514a38,
      grass: 0x37372b,
      rock: 0x34363d,
      peak: 0x464955,
      snow: 0x555968,
      textureProfile: "sand",
      fineRepeat: 25,
      macroRepeat: 3.4,
      normalRepeat: 28,
      normalStrength: 0.42,
      islandNormalStrength: 0.28,
      normalFade: [220, 1800],
      rockSlope: [0.3, 0.75],
      shoreHeight: 0.1,
      snowSoftness: 0.08
    },
    lights: {
      hemi: { sky: 0x4b587a, ground: 0x252014, intensity: 0.9 },
      key: { color: 0xc8d5ff, intensity: 0.95, position: [-3000, 1600, -3600] },
      fill: { color: 0x6b4630, intensity: 0.32, position: [2100, 260, -1200] }
    },
    mountains: {
      ...base.mountains,
      count: 18,
      radius: [520, 980],
      height: [390, 820],
      distance: [5800, 7600],
      snowyAbove: 9999,
      snowLine: 0.82,
      roughness: 0.98,
      palette: {
        low: 0x18191d,
        mid: 0x202126,
        rock: 0x28292e,
        peak: 0x383a42,
        snow: 0x565b6b
      },
      corridor: null,
      plateau: null
    },
    islands: { count: 0, stone: 0x25262b, green: 0x222218 },
    clouds: {
      ...base.clouds,
      scale: 0.72,
      hero: false,
      color: 0x292d3c,
      opacity: 0.34,
      cirrusColor: 0x363b50,
      cirrusOpacity: 0.16,
      texture: { seed: 0x4f524d0c, contrast: 0.92, underside: 0.62, softness: 1.08 }
    },
    decor: {
      ...base.decor,
      seed: 0x4f524d0d,
      keepClear: [{ x: 0, z: -250, r: 5200 }],
      extraIslands: { count: 10, radius: [180, 420], height: [55, 150], distance: [7800, 9800] },
      shore: null,
      trees: null,
      rocks: { count: 42, color: 0x22221f, scale: [8, 28] },
      city: null,
      extraClouds: {
        towers: 0,
        towerSize: [60, 100],
        towerBase: 1600,
        stratus: 5,
        stratusSize: [220, 420],
        stratusBase: 1900,
        distance: [2600, 6200]
      }
    }
  });

  ctx.addWorldDecorator("ormBasinNightWorks", {
    worlds: ["ormBasinNight"],
    build({ THREE, addRoot, keepGeometry, keepMaterial, surfaceHeightAt }) {
      const root = new THREE.Group();
      root.name = "ormBasinNightWorks";
      addRoot(root);

      const boxGeometry = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
      const cylinderGeometry = keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 14));
      const sphereGeometry = keepGeometry(new THREE.SphereGeometry(1, 10, 8));
      const materials = new Map();
      const material = (color, options = {}) => {
        const key = `${color}:${options.emissive || 0}:${options.opacity ?? 1}:${options.metalness ?? 0.04}`;
        if (!materials.has(key)) {
          materials.set(key, keepMaterial(new THREE.MeshStandardMaterial({
            color,
            roughness: options.roughness ?? 0.88,
            metalness: options.metalness ?? 0.04,
            emissive: options.emissive || 0,
            emissiveIntensity: options.emissive ? (options.emissiveIntensity ?? 1.1) : 0,
            transparent: (options.opacity ?? 1) < 1,
            opacity: options.opacity ?? 1,
            depthWrite: (options.opacity ?? 1) >= 1
          })));
        }
        return materials.get(key);
      };
      const groundY = (x, z) => surfaceHeightAt(x, z);
      const box = (x, z, sx, sy, sz, color, options = {}) => {
        const mesh = new THREE.Mesh(boxGeometry, material(color, options));
        mesh.position.set(x, groundY(x, z) + (options.yOffset ?? sy * 0.5), z);
        mesh.scale.set(sx, sy, sz);
        mesh.rotation.y = options.rotation || 0;
        root.add(mesh);
        return mesh;
      };
      const cylinder = (x, z, radius, height, color, options = {}) => {
        const mesh = new THREE.Mesh(cylinderGeometry, material(color, options));
        mesh.position.set(x, groundY(x, z) + (options.yOffset ?? height * 0.5), z);
        mesh.scale.set(radius, height, radius);
        root.add(mesh);
        return mesh;
      };
      const lightBox = (parent, x, z, color, sx = 5, sz = 5, y = 1.2) => {
        const mesh = new THREE.Mesh(boxGeometry, material(color, { emissive: color, emissiveIntensity: 2.2 }));
        mesh.position.set(x, groundY(x, z) + y, z);
        mesh.scale.set(sx, 0.5, sz);
        parent.add(mesh);
        return mesh;
      };

      // Western low-level ingress road. It points directly toward the dark
      // relay district but bends away from the lit military runway.
      const road = [
        [-5200, -1900], [-4100, -1650], [-3150, -1450], [-2350, -1150],
        [-1650, -900], [-500, -500], [700, -100], [1450, 250], [2700, 800]
      ];
      for (let i = 0; i < road.length - 1; i += 1) {
        const [ax, az] = road[i];
        const [bx, bz] = road[i + 1];
        const dx = bx - ax;
        const dz = bz - az;
        const length = Math.hypot(dx, dz);
        box((ax + bx) / 2, (az + bz) / 2, 26, 0.35, length, 0x202027, {
          rotation: Math.atan2(dx, dz), yOffset: 0.28, roughness: 0.98
        });
      }

      // East-west runway and parallel taxiway. The cold paired edge lights are
      // deliberately separate from the civilian group and never black out.
      box(1450, 250, 3400, 1.2, 78, 0x23262c, { yOffset: 0.42, roughness: 0.96 });
      box(1450, 520, 2600, 0.8, 30, 0x2d2e31, { yOffset: 0.38, roughness: 0.96 });
      const runwayLights = new THREE.Group();
      runwayLights.name = "ormBasinRunwayLights";
      root.add(runwayLights);
      for (let x = -200; x <= 3100; x += 110) {
        lightBox(runwayLights, x, 205, 0xb8d5ff, 3.5, 3.5, 1.0);
        lightBox(runwayLights, x, 295, 0xb8d5ff, 3.5, 3.5, 1.0);
      }
      for (const x of [-250, 3150]) {
        for (let z = 215; z <= 285; z += 18) lightBox(runwayLights, x, z, x < 0 ? 0x66d5a6 : 0xff625b, 4, 4, 1.0);
      }

      // Hardened aircraft shelters and the low control block.
      for (const [x, z, rotation] of [[550, 760, 0], [900, 820, 0], [1300, 860, 0], [2450, 760, Math.PI]]) {
        box(x, z, 180, 38, 120, 0x34363a, { rotation, metalness: 0.12 });
        box(x, z - 25, 130, 8, 86, 0x17181b, { rotation, yOffset: 10 });
      }
      box(1850, 820, 190, 34, 110, 0x3a3c40);
      box(1850, 820, 70, 62, 70, 0x2f3238, { yOffset: 65 });
      lightBox(root, 1850, 820, 0xffb55c, 40, 12, 96);

      // Military fuel district: six tanks, pipe racks and two live flare stacks.
      for (const [x, z, radius] of [
        [1280, -1540, 54], [1510, -1570, 48], [1760, -1530, 58],
        [2020, -1490, 52], [2220, -1640, 44], [2460, -1530, 50]
      ]) {
        cylinder(x, z, radius, 30, 0x67635b, { metalness: 0.25, roughness: 0.7 });
        cylinder(x, z, radius * 0.86, 1.5, 0xb1a36f, {
          emissive: 0x493714, emissiveIntensity: 0.3, yOffset: 30.8
        });
      }
      for (let x = 1160; x <= 2520; x += 170) {
        box(x, -1790, 120, 5, 10, 0x4c4a46, { metalness: 0.35 });
      }
      for (const [x, z] of [[2720, -1820], [3000, -1450]]) {
        cylinder(x, z, 5, 88, 0x4b4a47, { metalness: 0.4 });
        const flame = new THREE.Mesh(sphereGeometry, material(0xff6a22, {
          emissive: 0xff3d08, emissiveIntensity: 3.4, opacity: 0.9
        }));
        flame.position.set(x, groundY(x, z) + 96, z);
        flame.scale.set(13, 25, 13);
        root.add(flame);
        const point = new THREE.PointLight(0xff6a28, 2.4, 760, 2);
        point.position.set(x, groundY(x, z) + 92, z);
        root.add(point);
      }

      // Payment relay compound. Its central mast is the white optional target's
      // landmark; the target model itself is spawned by the mission.
      box(-1650, -900, 360, 4, 260, 0x282a2f, { yOffset: 2.1 });
      box(-1650, -900, 145, 34, 90, 0x343740);
      cylinder(-1650, -900, 8, 118, 0x555963, { metalness: 0.42 });
      cylinder(-1650, -900, 44, 4, 0x9aa5b8, { metalness: 0.34, yOffset: 118 });
      lightBox(root, -1650, -900, 0xe6e8ff, 18, 18, 126);
      for (const [x, z] of [[-1800, -1040], [-1500, -1040], [-1800, -760], [-1500, -760]]) {
        box(x, z, 72, 20, 56, 0x303239);
        lightBox(root, x, z, 0x9eb4ff, 12, 4, 24);
      }

      // Civilian settlement and every light that must disappear after the
      // relay strike. Hiding this named group leaves dark building silhouettes.
      const settlementLights = new THREE.Group();
      settlementLights.name = "ormBasinSettlementLights";
      root.add(settlementLights);
      const houseColors = [0x282625, 0x302b27, 0x25272a, 0x342e28];
      let houseIndex = 0;
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < 7; col += 1) {
          const x = -3450 + col * 190 + (row % 2) * 40;
          const z = -2100 + row * 190;
          const height = 18 + ((row * 7 + col * 3) % 4) * 7;
          box(x, z, 110, height, 92, houseColors[houseIndex % houseColors.length], { rotation: (col % 3 - 1) * 0.04 });
          lightBox(settlementLights, x - 26, z - 47, 0xffbd72, 16, 3, height * 0.52);
          lightBox(settlementLights, x + 25, z - 47, 0xffd38f, 13, 3, height * 0.66);
          houseIndex += 1;
        }
      }
      for (let x = -3500; x <= -2200; x += 150) {
        lightBox(settlementLights, x, -1180, 0xff9a48, 4, 4, 3.2);
      }
      const townGlow = new THREE.PointLight(0xff8f45, 2.1, 1900, 2);
      townGlow.position.set(-2850, 80, -1650);
      settlementLights.add(townGlow);

      // Three authored SAM pads make the mission targets readable from low
      // altitude without pretending the decoration is the target hitbox.
      for (const [x, z] of [[-2600, 1500], [0, 2400], [2600, 1300]]) {
        cylinder(x, z, 105, 1.2, 0x2c2d2e, { roughness: 0.96 });
        for (let i = 0; i < 8; i += 1) {
          const a = (i / 8) * Math.PI * 2;
          box(x + Math.sin(a) * 92, z + Math.cos(a) * 92, 26, 2, 10, 0x4a4336, { rotation: a });
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
