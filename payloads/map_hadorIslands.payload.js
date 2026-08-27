// HADOR ISLANDS (`hadorIslands`) — Sera M13 northern airlift corridor.
//
// The convoy flies down a broad north/south channel with inhabited islands on
// both sides. The centre is kept open for the slow transport formation while
// headlands, villages and navigation lights provide low-altitude speed cues.
export default function register(ctx) {
  const { WORLD_PRESETS } = ctx.tables;
  const base = WORLD_PRESETS.archipelagoDay;
  if (!base) throw new Error("[hadorIslands] archipelagoDay base preset is missing");

  const missionAnchors = Object.freeze({
    playerStart: Object.freeze([-900, 9200]),
    convoyStart: Object.freeze([0, 8200]),
    convoyExit: Object.freeze([0, -12600]),
    battleCenter: Object.freeze([0, -2200]),
    awacsStation: Object.freeze([9300, -2600]),
    eastIntercept: Object.freeze([9000, 5400]),
    westIntercept: Object.freeze([-9200, 1200]),
    northIntercept: Object.freeze([2200, 12400]),
    southIntercept: Object.freeze([-1800, -14800]),
    eastMissileBoats: Object.freeze([4700, -2800]),
    westMissileBoats: Object.freeze([-4800, -5200])
  });

  ctx.addWorldPreset("hadorIslands", {
    ...base,
    label: "HADOR ISLANDS — NORTH ROUTE",
    regionId: "hador_islands",
    sectorIds: Object.freeze(["north_airlift_gate", "twin_channel", "south_relief_route"]),
    variant: "clear_midday_airlift",
    sceneryOrigin: [0, -2200],
    previewFocus: [0, -2200],
    missionAnchors,
    clearColor: 0x76b8e7,
    sky: [
      [0, "#2f86ca"],
      [0.34, "#6ab6e8"],
      [0.52, "#b9dcf2"],
      [0.72, "#e5eef3"],
      [1, "#8bc5e2"]
    ],
    atmosphere: {
      ...base.atmosphere,
      seed: 0x48414431,
      noise: 0.018,
      haze: 0.095,
      thinClouds: 14,
      cloudOpacity: 0.055,
      cloudBand: [0.36, 0.7],
      cloudTint: 0xe4edf3
    },
    fog: { color: 0xa8cfdf, near: 5200, far: 23800 },
    sun: {
      position: [-6800, 7200, -4800],
      color: 0xfff3d0,
      radius: 106,
      glare: [
        { scale: 1800, color: 0xffdca0, opacity: 0.28 },
        { scale: 470, color: 0xfff7df, opacity: 0.76 }
      ]
    },
    moon: null,
    stars: null,
    ocean: {
      ...base.ocean,
      base: "#276e91",
      bright: "94, 181, 211",
      dark: "20, 75, 105",
      repeat: 36,
      roughness: 0.58,
      metalness: 0.05,
      textureProfile: "ocean",
      normalRepeat: 40,
      normalScale: [0.17, 0.25],
      normalSpeed: [0.022, 0.014],
      normalSeed: 0x48414432
    },
    lights: {
      hemi: { sky: 0xc4e6ff, ground: 0x315c54, intensity: 1.75 },
      key: { color: 0xfff0c9, intensity: 2.55, position: [-6200, 7600, -4300] },
      fill: { color: 0x78b7d8, intensity: 0.68, position: [5200, 1600, 3600] }
    },
    islands: { count: 12, stone: 0x667873, green: 0x4f8663 },
    mountains: {
      ...base.mountains,
      count: 20,
      distance: [13200, 19800],
      radius: [260, 760],
      height: [100, 420],
      snowyAbove: 9999,
      corridor: { x: 0, halfWidth: 3100 },
      plateau: null
    },
    clouds: {
      ...base.clouds,
      scale: 1.0,
      hero: true,
      color: 0xf2f5f4,
      opacity: 0.72,
      cirrusColor: 0xd7e3e8,
      cirrusOpacity: 0.28,
      texture: { seed: 0x48414433, contrast: 0.92, underside: 0.34, softness: 1.08 }
    },
    decor: {
      ...base.decor,
      seed: 0x48414434,
      keepClear: [{ box: { x: 3100, z0: -13600, z1: 9200 } }],
      extraIslands: { count: 14, radius: [180, 540], height: [26, 130], distance: [4800, 13600] },
      shore: { sand: 0xd6d0ad, shallow: 0x54b6c4, opacity: 0.74, width: 1.3 },
      trees: { count: 170, color: 0x3e7651, trunk: 0x655341, scale: [0.7, 1.3] },
      rocks: { count: 34, color: 0x65726e, scale: [7, 24] },
      city: null,
      extraClouds: { towers: 5, towerSize: [90, 150], towerBase: 1250, stratus: 5, stratusSize: [260, 430], stratusBase: 2100, distance: [6200, 12800] }
    }
  });

  ctx.addWorldDecorator("hadorNorthernSettlements", {
    worlds: ["hadorIslands"],
    build({ THREE, addRoot, keepGeometry, keepMaterial, surfaceHeightAt }) {
      const root = new THREE.Group();
      root.name = "hadorNorthernSettlements";
      addRoot(root);

      const islandGeo = keepGeometry(new THREE.CylinderGeometry(1, 1.12, 1, 28));
      const boxGeo = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
      const cylGeo = keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 12));
      const material = (color, roughness = 0.9, metalness = 0.02, emissive = 0) => keepMaterial(
        new THREE.MeshStandardMaterial({
          color, roughness, metalness, emissive,
          emissiveIntensity: emissive ? 0.72 : 0
        })
      );
      const rock = material(0x667873, 0.96);
      const grass = material(0x4f8663, 0.94);
      const concrete = material(0x9a9d95, 0.9);
      const roof = material(0x55616b, 0.82, 0.08);
      const beacon = material(0xffe3a0, 0.5, 0.04, 0xffb84a);
      const steel = material(0x6d7478, 0.7, 0.25);

      const island = (name, x, z, rx, rz, height) => {
        const baseY = surfaceHeightAt(x, z) - 3;
        const body = new THREE.Mesh(islandGeo, rock);
        body.name = `${name}-rock`;
        body.position.set(x, baseY + height * 0.5, z);
        body.scale.set(rx, height, rz);
        root.add(body);
        const top = new THREE.Mesh(islandGeo, grass);
        top.name = `${name}-green`;
        top.position.set(x, baseY + height + 1.4, z);
        top.scale.set(rx * 0.88, 3, rz * 0.88);
        root.add(top);
        return baseY + height + 3;
      };
      const box = (name, x, y, z, sx, sy, sz, mat, rotation = 0) => {
        const mesh = new THREE.Mesh(boxGeo, mat);
        mesh.name = name;
        mesh.position.set(x, y, z);
        mesh.scale.set(sx, sy, sz);
        mesh.rotation.y = rotation;
        root.add(mesh);
        return mesh;
      };
      const tower = (name, x, z, ground, height) => {
        const mast = new THREE.Mesh(cylGeo, steel);
        mast.name = `${name}-mast`;
        mast.position.set(x, ground + height * 0.5, z);
        mast.scale.set(2.2, height, 2.2);
        root.add(mast);
        box(`${name}-beacon`, x, ground + height + 2, z, 10, 4, 10, beacon);
      };

      const landmarks = [
        ["hador-west-north", -5200, 5400, 1080, 760, 82],
        ["hador-east-north", 4950, 3300, 1320, 900, 106],
        ["hador-west-mid", -4700, -900, 1450, 980, 122],
        ["hador-east-mid", 5200, -3400, 1180, 760, 88],
        ["hador-west-south", -5000, -7600, 980, 680, 74],
        ["hador-east-south", 4600, -9800, 1360, 880, 112]
      ];
      for (const [name, x, z, rx, rz, height] of landmarks) {
        const ground = island(name, x, z, rx, rz, height);
        for (let i = 0; i < 7; i += 1) {
          const px = x - 220 + (i % 4) * 145;
          const pz = z - 120 + Math.floor(i / 4) * 180;
          box(`${name}-house-${i}`, px, ground + 13, pz, 78, 26, 54, concrete, (i % 3 - 1) * 0.08);
          box(`${name}-roof-${i}`, px, ground + 28, pz, 84, 4, 60, roof, (i % 3 - 1) * 0.08);
        }
        tower(`${name}-nav`, x + rx * 0.52, z - rz * 0.42, ground, 42);
      }
    }
  });
}
