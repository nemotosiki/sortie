// MIGAL OUTER (`migalOuterHigh`) — north-east high-altitude approach and the
// visible Ophan defence ring around the distant atoll capital.
export default function register(ctx) {
  const { WORLD_PRESETS } = ctx.tables;
  const base = WORLD_PRESETS.archipelagoDay;
  if (!base) throw new Error("[migalOuter] archipelagoDay base preset is missing");

  const missionAnchors = Object.freeze({
    playerStart: Object.freeze([0, 11800]),
    battleCenter: Object.freeze([0, -1800]),
    cityEdge: Object.freeze([0, -14800]),
    bomberNorth: Object.freeze([-3600, 15200]),
    bomberSouth: Object.freeze([3800, 14600]),
    awacsStation: Object.freeze([8900, 7200]),
    jammerStation: Object.freeze([-9200, 6500]),
    highCover: Object.freeze([7600, 10500]),
    helixEntry: Object.freeze([-10500, -1200]),
    helixExit: Object.freeze([9800, -13200]),
    prototypeEntry: Object.freeze([0, 16800])
  });

  ctx.addWorldPreset("migalOuterHigh", {
    ...base,
    label: "MIGAL OUTER — NORTH-EAST APPROACH",
    regionId: "migal_outer",
    sectorIds: Object.freeze(["north_east_approach", "ophan_defence_ring", "capital_outer_airspace"]),
    variant: "high_clear_afternoon",
    sceneryOrigin: [0, -3600],
    previewFocus: [0, -5200],
    missionAnchors,
    clearColor: 0x4a83b4,
    sky: [[0, "#081d3b"], [0.27, "#205b8b"], [0.47, "#72add1"], [0.61, "#c9ddea"], [0.82, "#8db8d0"], [1, "#416e8c"]],
    atmosphere: {
      ...base.atmosphere,
      seed: 0x4d494731,
      noise: 0.012,
      haze: 0.07,
      thinClouds: 11,
      cloudOpacity: 0.045,
      cloudBand: [0.34, 0.62],
      cloudTint: 0xe5eef2
    },
    fog: { color: 0x8bb7cc, near: 9600, far: 31800 },
    sun: {
      position: [-8200, 8700, -10500], color: 0xfff0cd, radius: 88,
      glare: [
        { scale: 1700, color: 0xffdeb0, opacity: 0.3 },
        { scale: 440, color: 0xfffae8, opacity: 0.72 }
      ]
    },
    ocean: {
      ...base.ocean,
      base: "#1e6282", bright: "126, 203, 225", dark: "13, 60, 83",
      repeat: 46, roughness: 0.44, metalness: 0.12,
      textureProfile: "ocean", normalRepeat: 48, normalScale: [0.18, 0.24],
      normalSpeed: [0.017, 0.009], normalSeed: 0x4d494732
    },
    lights: {
      hemi: { sky: 0xcdeaff, ground: 0x274855, intensity: 1.9 },
      key: { color: 0xffedcc, intensity: 2.7, position: [-7600, 9000, -8200] },
      fill: { color: 0x79b7d7, intensity: 0.72, position: [6600, 2300, 4400] }
    },
    mountains: {
      ...base.mountains,
      count: 4,
      distance: [14800, 21000],
      radius: [280, 720],
      height: [100, 360],
      snowyAbove: 9999,
      corridor: { x: 0, halfWidth: 4300 },
      plateau: { radius: [1900, 2100], height: [72, 72], topRadius: 0.91, at: [0, -14800], snowyAbove: 9999 }
    },
    islands: { count: 5, stone: 0x60746f, green: 0x477b61 },
    clouds: {
      ...base.clouds,
      scale: 1.15, hero: true, color: 0xf1f4f4, opacity: 0.68,
      cirrusColor: 0xd9e5ea, cirrusOpacity: 0.26,
      texture: { seed: 0x4d494733, contrast: 0.96, underside: 0.32, softness: 1.1 }
    },
    decor: {
      ...base.decor,
      seed: 0x4d494734,
      keepClear: [
        { box: { x: 4300, z0: -13200, z1: 13000 } },
        { x: 0, z: -14800, r: 2400 }
      ],
      extraIslands: { count: 8, radius: [220, 620], height: [32, 120], distance: [9800, 17200] },
      shore: { sand: 0xd7d0b3, shallow: 0x58b4c7, opacity: 0.66, width: 1.25 },
      trees: { count: 80, color: 0x3f7357, trunk: 0x62513f, scale: [0.7, 1.2] },
      rocks: { count: 22, color: 0x60706c, scale: [9, 28] },
      city: null,
      extraClouds: { towers: 4, towerSize: [100, 180], towerBase: 1100, stratus: 8, stratusSize: [270, 470], stratusBase: 2300, distance: [7400, 15200] }
    }
  });

  ctx.addWorldDecorator("migalOuterDefenceRing", {
    worlds: ["migalOuterHigh"],
    build({ THREE, addRoot, keepGeometry, keepMaterial, surfaceHeightAt }) {
      const root = new THREE.Group();
      root.name = "migalOuterDefenceRing";
      addRoot(root);
      const boxGeo = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
      const cylGeo = keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 12));
      const material = (color, emissive = 0, roughness = 0.76, metalness = 0.16) => keepMaterial(
        new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity: emissive ? 0.82 : 0 })
      );
      const concrete = material(0x737f84);
      const steel = material(0x53616b);
      const cyan = material(0x84efff, 0x2bbbd2, 0.48, 0.22);
      const city = material(0x69777f);
      const cityLight = material(0xffdc92, 0xff9d3b, 0.52, 0.08);
      const place = (geo, mat, name, x, y, z, sx, sy, sz) => {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = name;
        mesh.position.set(x, y, z);
        mesh.scale.set(sx, sy, sz);
        root.add(mesh);
        return mesh;
      };
      // Twelve Ophan nodes make the ring legible from the 7-9 km combat band.
      for (let i = 0; i < 12; i += 1) {
        const angle = i / 12 * Math.PI * 2;
        const x = Math.sin(angle) * 5600;
        const z = -5200 + Math.cos(angle) * 5600;
        const y = Math.max(0, surfaceHeightAt(x, z));
        place(cylGeo, concrete, `ophan-node-base-${i + 1}`, x, y + 7, z, 24, 14, 24);
        place(cylGeo, steel, `ophan-node-mast-${i + 1}`, x, y + 48, z, 5, 72, 5);
        place(boxGeo, cyan, `ophan-node-array-${i + 1}`, x, y + 87, z, 34, 8, 34);
      }
      // Distant Migal outer skyline on the authored plateau. It is a landmark,
      // not collision-critical combat geometry; the plateau owns the ground.
      const cityZ = -14800;
      const cityY = Math.max(0, surfaceHeightAt(0, cityZ));
      for (let row = 0; row < 5; row += 1) {
        for (let col = -5; col <= 5; col += 1) {
          const x = col * 245 + (row % 2) * 90;
          const z = cityZ - 720 + row * 310;
          const height = 80 + ((Math.abs(col * 7 + row * 11) % 7) * 34);
          place(boxGeo, city, `migal-outer-tower-${row}-${col}`, x, cityY + height * 0.5, z, 150, height, 150);
          place(boxGeo, cityLight, `migal-outer-light-${row}-${col}`, x, cityY + height + 4, z, 72, 5, 72);
        }
      }
    }
  });
}
