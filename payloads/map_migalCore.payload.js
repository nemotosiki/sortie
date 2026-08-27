// MIGAL CORE (`migalCoreDawn`) — the Ophan capital ring at first light.
// The outer ring remains geographically continuous with M17/M19; this variant
// moves the fight over the central atoll instead of inventing another city.
export default function register(ctx) {
  const { WORLD_PRESETS } = ctx.tables;
  const base = WORLD_PRESETS.migalOuterHigh;
  if (!base) throw new Error("[migalCore] migalOuterHigh base preset is missing");

  const missionAnchors = Object.freeze({
    playerStart: Object.freeze([0, 13200]),
    battleCenter: Object.freeze([0, -1200]),
    councilRing: Object.freeze([0, -1200]),
    northLane: Object.freeze([0, 15400]),
    westLane: Object.freeze([-12600, 4100]),
    eastLane: Object.freeze([12600, 3400]),
    southLane: Object.freeze([0, -15800]),
    highLane: Object.freeze([8800, 11400]),
    crownBoss: Object.freeze([-760, -1880]),
    larkBoss: Object.freeze([820, -1680])
  });

  ctx.addWorldPreset("migalCoreDawn", {
    ...base,
    label: "MIGAL CORE — OPHAN DAWN",
    regionId: "migal_core",
    sectorIds: Object.freeze(["ophan_central_ring", "four_councils", "capital_core_airspace"]),
    variant: "war_day_31_first_light",
    sceneryOrigin: [0, -1200],
    previewFocus: [0, -1200],
    missionAnchors,
    clearColor: 0x405f7b,
    sky: [[0, "#07152d"], [0.23, "#1d3d66"], [0.4, "#617f9d"], [0.5, "#e79d76"], [0.57, "#f2c89c"], [0.72, "#849eb0"], [1, "#36536c"]],
    atmosphere: {
      ...base.atmosphere,
      seed: 0x4d493230,
      noise: 0.017,
      haze: 0.12,
      thinClouds: 14,
      cloudOpacity: 0.058,
      cloudBand: [0.3, 0.64],
      cloudTint: 0xf2d2c0
    },
    fog: { color: 0x93a8b2, near: 8500, far: 30400 },
    sun: {
      position: [-6100, 1020, -12800], color: 0xffbf86, radius: 108,
      glare: [
        { scale: 2050, color: 0xff9c68, opacity: 0.34 },
        { scale: 510, color: 0xffead0, opacity: 0.78 }
      ]
    },
    sunRoad: {
      position: [-4200, 3, -8200], rotationY: -0.22, width: 520, length: 7600,
      color: 0xffbd81, opacity: 0.3
    },
    ocean: {
      ...base.ocean,
      base: "#254c68", bright: "226, 167, 127", dark: "15, 47, 70",
      roughness: 0.47, metalness: 0.15,
      normalSpeed: [0.018, 0.01], normalSeed: 0x4d493231
    },
    lights: {
      hemi: { sky: 0xa9c8df, ground: 0x493f42, intensity: 1.65 },
      key: { color: 0xffbd86, intensity: 2.65, position: [-6200, 1700, -10800] },
      fill: { color: 0x6f9ac0, intensity: 0.7, position: [6800, 3100, 5200] }
    },
    mountains: {
      ...base.mountains,
      count: 3,
      distance: [17000, 22200],
      radius: [260, 620],
      height: [80, 250],
      snowyAbove: 9999,
      corridor: { x: 0, halfWidth: 5600 },
      plateau: { radius: [4650, 4850], height: [82, 82], topRadius: 0.95, at: [0, -1200], snowyAbove: 9999 }
    },
    islands: { count: 3, stone: 0x687878, green: 0x486f5c },
    clouds: {
      ...base.clouds,
      color: 0xead5ca,
      opacity: 0.66,
      cirrusColor: 0xd8bdba,
      cirrusOpacity: 0.3,
      texture: { seed: 0x4d493232, contrast: 1.0, underside: 0.42, softness: 1.02 }
    },
    decor: {
      ...base.decor,
      seed: 0x4d493233,
      keepClear: [
        { box: { x: 5600, z0: -17000, z1: 14500 } },
        { x: 0, z: -1200, r: 6900 }
      ],
      extraIslands: { count: 5, radius: [180, 460], height: [24, 82], distance: [10800, 16800] },
      trees: { count: 120, color: 0x426f58, trunk: 0x62513f, scale: [0.7, 1.15] },
      rocks: { count: 18, color: 0x657270, scale: [8, 24] },
      city: null,
      extraClouds: { towers: 3, towerSize: [95, 165], towerBase: 1200, stratus: 7, stratusSize: [260, 440], stratusBase: 2450, distance: [9800, 16200] }
    }
  });

  ctx.addWorldDecorator("migalCoreCapital", {
    worlds: ["migalCoreDawn"],
    build({ THREE, addRoot, keepGeometry, keepMaterial, surfaceHeightAt }) {
      const root = new THREE.Group();
      root.name = "migalCoreCapital";
      addRoot(root);
      const boxGeo = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
      const cylGeo = keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 16));
      const torusGeo = keepGeometry(new THREE.TorusGeometry(1, 0.012, 8, 48));
      const material = (color, emissive = 0, roughness = 0.7, metalness = 0.18) => keepMaterial(
        new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity: emissive ? 0.86 : 0 })
      );
      const concrete = material(0x7d898c);
      const steel = material(0x4d5c66, 0, 0.52, 0.3);
      const glass = material(0x668fa3, 0x1b6f8b, 0.42, 0.2);
      const cyan = material(0x8ceeff, 0x27b7d2, 0.42, 0.24);
      const amber = material(0xffd696, 0xff9838, 0.48, 0.08);
      const dark = material(0x2b3942, 0, 0.8, 0.12);
      const place = (geo, mat, name, x, y, z, sx, sy, sz, rotationX = 0) => {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = name;
        mesh.position.set(x, y, z);
        mesh.scale.set(sx, sy, sz);
        mesh.rotation.x = rotationX;
        root.add(mesh);
        return mesh;
      };
      const centerZ = -1200;
      const cityY = Math.max(0, surfaceHeightAt(0, centerZ));

      // The two concentric structures are the Ophan central ring seen from the
      // outer missions. Twelve nodes line up with the earlier defence ring.
      place(torusGeo, steel, "ophan-core-outer-ring", 0, cityY + 22, centerZ, 4050, 4050, 4050, Math.PI / 2);
      place(torusGeo, cyan, "ophan-core-inner-ring", 0, cityY + 28, centerZ, 2450, 2450, 2450, Math.PI / 2);
      for (let i = 0; i < 12; i += 1) {
        const angle = i / 12 * Math.PI * 2;
        const x = Math.sin(angle) * 4050;
        const z = centerZ + Math.cos(angle) * 4050;
        const y = Math.max(cityY, surfaceHeightAt(x, z));
        place(cylGeo, concrete, `ophan-core-node-base-${i + 1}`, x, y + 12, z, 32, 24, 32);
        place(cylGeo, steel, `ophan-core-node-mast-${i + 1}`, x, y + 72, z, 7, 96, 7);
        place(boxGeo, cyan, `ophan-core-node-array-${i + 1}`, x, y + 126, z, 42, 10, 42);
      }

      // Four council towers face the central chamber, while a dense but
      // low-rise city fills the ring without blocking low-altitude passes.
      const council = [[-1180, -1200], [1180, -1200], [0, -2380], [0, -20]];
      council.forEach(([x, z], index) => {
        place(cylGeo, dark, `council-foundation-${index + 1}`, x, cityY + 18, z, 210, 36, 210);
        place(boxGeo, glass, `council-tower-${index + 1}`, x, cityY + 270, z, 250, 500, 250);
        place(boxGeo, amber, `council-crown-${index + 1}`, x, cityY + 530, z, 185, 12, 185);
      });
      place(cylGeo, concrete, "ophan-central-chamber", 0, cityY + 55, centerZ, 620, 110, 620);
      place(cylGeo, glass, "ophan-central-spire", 0, cityY + 410, centerZ, 92, 710, 92);
      place(cylGeo, amber, "ophan-central-beacon", 0, cityY + 780, centerZ, 34, 34, 34);

      for (let row = -6; row <= 6; row += 1) {
        for (let col = -6; col <= 6; col += 1) {
          if (Math.abs(row) <= 1 && Math.abs(col) <= 1) continue;
          const x = col * 390 + (row % 2) * 115;
          const z = centerZ + row * 360;
          if (Math.hypot(x, z - centerZ) > 3350) continue;
          const height = 55 + (Math.abs(row * 13 + col * 17) % 8) * 31;
          place(boxGeo, concrete, `migal-core-block-${row}-${col}`, x, cityY + height * 0.5, z, 245, height, 235);
          place(boxGeo, amber, `migal-core-roof-${row}-${col}`, x, cityY + height + 3, z, 128, 5, 120);
        }
      }
    }
  });
}
