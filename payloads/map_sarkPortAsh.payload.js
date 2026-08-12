// SARK PORT ASH (`sarkPortAsh`) — Sera M05's dawn battle-damage variant.
//
// Geographic data is inherited from the already-registered `sarkPort` preset.
// This preserves the plateau, city lattice, coast, fog footprint and procedural
// seed without changing M03's source map. The decorator re-authors the port's
// fixed landmarks at their original local anchors, then adds M05-only damage.
export default function register(ctx) {
  const { WORLD_PRESETS } = ctx.tables;
  const base = WORLD_PRESETS.sarkPort;
  if (!base) throw new Error("[sarkPortAsh] sarkPort base preset is missing");

  const missionAnchors = Object.freeze({
    friendlyGroundStart: Object.freeze([900, 900]),
    northWarehouseDefense: Object.freeze([-700, 600]),
    centralArmor: Object.freeze([-150, 50]),
    westCraneDefense: Object.freeze([-1350, -250]),
    commandVehicleStart: Object.freeze([300, -900]),
    commandEscapeBridge: Object.freeze([650, -1200]),
    playerStart: Object.freeze([-4200, -2000]),
    airReinforcement: Object.freeze([4500, -2500])
  });

  ctx.addWorldPreset("sarkPortAsh", {
    ...base,
    label: "PORT OF ASH",
    regionId: "sark_port",
    sectorIds: Object.freeze(["west_city_recapture"]),
    variant: "dawn_smoke_damage",
    missionAnchors,
    // Keep all geographic/procedural objects by reference. The payload never
    // mutates them; the static gate asserts that Sark Port itself is unchanged.
    sceneryOrigin: base.sceneryOrigin,
    previewFocus: base.sceneryOrigin,
    terrain: base.terrain,
    mountains: base.mountains,
    islands: base.islands,
    decor: base.decor,
    clearColor: 0x8d9693,
    sky: [
      [0, "#17243a"],
      [0.28, "#465a6c"],
      [0.47, "#b2765a"],
      [0.56, "#e4a267"],
      [0.7, "#8b7770"],
      [1, "#4f565b"]
    ],
    atmosphere: {
      ...base.atmosphere,
      seed: 0x41534801,
      noise: 0.028,
      haze: 0.24,
      thinClouds: 20,
      cloudOpacity: 0.085,
      cloudBand: [0.38, 0.72],
      cloudTint: 0xd6b39b
    },
    fog: { color: 0x969b94, near: 1500, far: 9000 },
    sun: {
      position: [2800, 720, -1800],
      color: 0xffad72,
      radius: 104,
      glare: [
        { scale: 1800, color: 0xd98255, opacity: 0.42 },
        { scale: 480, color: 0xffd2a5, opacity: 0.8 }
      ]
    },
    sunRoad: {
      color: 0xd8794f,
      opacity: 0.25,
      width: 620,
      length: 3300,
      rotationY: Math.atan2(-2800, 1800),
      position: [1500, 0.4, -1000]
    },
    ocean: {
      ...base.ocean,
      base: "#194854",
      bright: "178, 181, 168",
      dark: "9, 38, 45",
      roughness: 0.5,
      normalSeed: 0x41534802
    },
    lights: {
      hemi: { sky: 0xc7c7bd, ground: 0x302d2a, intensity: 1.72 },
      key: { color: 0xffa56c, intensity: 2.25, position: [1800, 820, -900] },
      fill: { color: 0x8199ad, intensity: 0.58, position: [-900, 280, 700] }
    },
    clouds: {
      ...base.clouds,
      color: 0xd8d4cb,
      opacity: 0.66,
      cirrusColor: 0xb9aaa1,
      cirrusOpacity: 0.3,
      texture: { seed: 0x41534803, contrast: 1.08, underside: 0.5, softness: 1.02 }
    }
  });

  ctx.addWorldDecorator("sarkPortAshWorks", {
    worlds: ["sarkPortAsh"],
    build({ THREE, preset, addRoot, keepGeometry, keepMaterial }) {
      const root = new THREE.Group();
      root.name = "sarkPortAshWorks";
      addRoot(root);

      const [CX, CZ] = preset.sceneryOrigin;
      const CAP_Y = preset.mountains.plateau.height[0];
      const DECK = CAP_Y + 1;
      const boxGeometry = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
      const cylinderGeometry = keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 12));
      const sphereGeometry = keepGeometry(new THREE.SphereGeometry(1, 10, 8));
      const materials = new Map();
      const material = (color, options = {}) => {
        const key = `${color}:${options.emissive || 0}:${options.opacity ?? 1}`;
        if (!materials.has(key)) {
          materials.set(key, keepMaterial(new THREE.MeshStandardMaterial({
            color,
            roughness: options.roughness ?? 0.9,
            metalness: options.metalness ?? 0.03,
            emissive: options.emissive || 0,
            emissiveIntensity: options.emissive ? 0.85 : 0,
            transparent: (options.opacity ?? 1) < 1,
            opacity: options.opacity ?? 1,
            depthWrite: (options.opacity ?? 1) >= 1
          })));
        }
        return materials.get(key);
      };
      const box = (dx, y, dz, sx, sy, sz, color, rotation = [0, 0, 0], options) => {
        const mesh = new THREE.Mesh(boxGeometry, material(color, options));
        mesh.position.set(CX + dx, y, CZ + dz);
        mesh.scale.set(sx, sy, sz);
        mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
        root.add(mesh);
        return mesh;
      };
      const cylinder = (dx, y, dz, radius, height, color, options) => {
        const mesh = new THREE.Mesh(cylinderGeometry, material(color, options));
        mesh.position.set(CX + dx, y, CZ + dz);
        mesh.scale.set(radius, height, radius);
        root.add(mesh);
        return mesh;
      };

      // The same terminal footprint used by sarkPort: local x -1800..-940,
      // local z -790..190. Dark scorch patches are M05-only.
      box(-1370, 9.5, -300, 860, 27, 980, 0x696963);
      box(-1370, DECK + 0.2, -300, 820, 0.6, 930, 0x55544f);
      box(-1450, DECK + 0.65, -520, 310, 0.35, 180, 0x2d2c29, [0, 0.08, 0], { opacity: 0.76 });

      // Eleven standing cranes plus one visibly leaning crane. Crane #2 and
      // #7 use unlit dark machinery housings to mark the two stopped units.
      const craneZ0 = -730;
      const cranePitch = 76;
      const craneMidX = -1773;
      for (let i = 0; i < 12; i += 1) {
        const z = craneZ0 + i * cranePitch;
        const lean = i === 2 ? -0.2 : 0;
        const stopped = i === 2 || i === 7;
        for (const rail of [-1790, -1756]) {
          for (const off of [-15, 15]) {
            box(rail, DECK + 29, z + off, 7, 58, 7, stopped ? 0x8b8981 : 0xd9dcda, [0, 0, lean]);
          }
        }
        box(craneMidX, DECK + 62, z, 48, 9, 38, stopped ? 0x4a4641 : 0xd9dcda, [0, 0, lean]);
        box(-1797, DECK + 72, z, 154, 7, 13, stopped ? 0x71382c : 0xc84f32, [0, 0, lean]);
        box(-1730, DECK + 80, z, 16, 28, 18, stopped ? 0x34383a : 0x315a76, [0, 0, lean]);
      }

      // Collapsed container rows leave a navigable corridor through the yard.
      const liveries = [0xa9362d, 0x315b80, 0x346448, 0xb76325, 0x777b7c, 0x78313c];
      for (let x = -1690; x <= -1120; x += 44) {
        for (let z = -740; z <= -100; z += 60) {
          const corridor = x > -1480 && x < -1340;
          if (corridor || ((x + z) / 4) % 5 === 0) continue;
          const tiers = 2 + (Math.abs(Math.round((x + z) / 20)) % 3);
          const height = tiers * 2.7;
          const collapsed = (Math.round(x / 44) + Math.round(z / 60)) % 9 === 0;
          box(x, DECK + height / 2, z, 14, height, 26,
            liveries[Math.abs(Math.round((x - z) / 20)) % liveries.length],
            collapsed ? [0.16, 0.35, 0.22] : [0, 0, 0]);
        }
      }

      // Canal and all three original bridge X anchors. The middle cable-stayed
      // bridge (x=260) is broken; the southern bridge (x=580) carries patches.
      box(0, CAP_Y + 0.45, -1000, 2100, 0.5, 184, 0x173f4b, [0, 0, 0], { roughness: 0.55 });
      const bridgeDeck = 0x5c5c58;
      const bridge = (x, mode) => {
        if (mode === "broken") {
          box(x, 32.5, -1190, 26, 3.5, 130, bridgeDeck, [0.12, 0, 0.04]);
          box(x, 31.5, -910, 26, 3.5, 95, bridgeDeck, [-0.18, 0, -0.05]);
          box(x + 24, 15, -1040, 18, 3, 80, 0x3f403e, [0.6, 0.2, 0.4]);
          return;
        }
        box(x, 32.5, -1057.5, 26, 3.5, 395, bridgeDeck);
        if (mode === "repaired") {
          for (const z of [-1160, -1070, -980, -890]) {
            box(x, 34.5, z, 28, 0.8, 54, 0x9a7c52);
          }
        }
      };
      bridge(-80, "intact");
      bridge(260, "broken");
      bridge(580, "repaired");
      for (const x of [-80, 260, 580]) {
        for (const z of [-1200, -930]) box(x, 17, z, 13, 28, 13, 0x4d4e4c);
      }

      // Two burned warehouses at the canonical north-warehouse anchor area.
      for (const [dx, dz, rotation] of [[-700, 600, -0.08], [-470, 520, 0.06]]) {
        box(dx, CAP_Y + 15, dz, 170, 30, 120, 0x4a423b, [0, rotation, 0]);
        box(dx, CAP_Y + 31, dz, 176, 2.5, 126, 0x2b2927, [0.08, rotation, 0.03]);
        box(dx + 35, CAP_Y + 18, dz - 20, 44, 36, 30, 0x251f1b, [0, rotation, 0], { emissive: 0x4a170c });
      }

      // Wrecked transport helicopter near the canal and one sunken freighter
      // off the western quay. Neither carries a gameplay marker.
      box(-250, CAP_Y + 4, -1180, 16, 8, 62, 0x323833, [0.12, 0.35, 0.42]);
      box(-250, CAP_Y + 7, -1180, 82, 1.8, 8, 0x222522, [0.12, 0.35, 0.42]);
      box(-2050, -4, -450, 52, 25, 250, 0x30383a, [0.08, 0.2, 0.16]);
      box(-2050, 7, -500, 34, 18, 60, 0x262a2c, [0.08, 0.2, 0.16]);

      // Smoke columns are broad landmarks, not opaque walls. Their lowest
      // nodes begin above target-marker height so low-level approaches remain
      // readable through the base of each plume.
      const smokeMaterial = material(0x373634, { opacity: 0.2, roughness: 1 });
      const smokeColumn = (dx, dz, scale = 1) => {
        for (let i = 0; i < 5; i += 1) {
          const puff = new THREE.Mesh(sphereGeometry, smokeMaterial);
          puff.position.set(CX + dx + (i % 2 ? 14 : -10) * scale, 64 + i * 58 * scale, CZ + dz);
          puff.scale.set((30 + i * 10) * scale, (38 + i * 12) * scale, (30 + i * 10) * scale);
          root.add(puff);
        }
        cylinder(dx, 34, dz, 10 * scale, 24, 0x6f2c18, { emissive: 0x5a1609, opacity: 0.55 });
      };
      smokeColumn(-700, 600, 1.15);
      smokeColumn(-1350, -250, 0.95);
      smokeColumn(300, -900, 0.82);
      smokeColumn(620, 260, 0.7);

      // The single friendly ground route: north-east city, central crossing,
      // intact north bridge, west crane district. Thin paint remains visible
      // through smoke and gives mission units an authored line to follow.
      const route = [
        [900, 900], [620, 620], [250, 300], [-120, 80], [-80, -700], [-80, -1280], [-700, -1050], [-1350, -250]
      ];
      for (let i = 0; i < route.length - 1; i += 1) {
        const [ax, az] = route[i];
        const [bx, bz] = route[i + 1];
        const dx = bx - ax;
        const dz = bz - az;
        const length = Math.hypot(dx, dz);
        box((ax + bx) / 2, CAP_Y + 0.8, (az + bz) / 2, 18, 0.35, length, 0x6d6659,
          [0, Math.atan2(dx, dz), 0]);
      }

      root.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = false;
        node.receiveShadow = true;
      });
    }
  });
}
