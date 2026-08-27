// HADOR DEEP SEA (`hadorDeepSea`) — the western carrier anchorage.
// Open water owns the frame: low layered cloud, a cold afternoon horizon and
// only navigation buoys to give the fleet scale. No decorative island may
// masquerade as the Hador island chain several hundred kilometres astern.
export default function register(ctx) {
  const { WORLD_PRESETS } = ctx.tables;
  const base = WORLD_PRESETS.sunsetOcean;
  if (!base) throw new Error("[hadorDeepSea] sunsetOcean base preset is missing");

  const missionAnchors = Object.freeze({
    playerStart: Object.freeze([-1800, 7200]),
    battleCenter: Object.freeze([0, -1600]),
    fleetCenter: Object.freeze([0, -1800]),
    fleetCourse: Object.freeze([0, -10800]),
    westSsgn: Object.freeze([-7200, -900]),
    eastSsgn: Object.freeze([7600, -3200]),
    bomberEntry: Object.freeze([0, 14200]),
    northCap: Object.freeze([-8600, 9800]),
    southCap: Object.freeze([9200, -11600]),
    reconStation: Object.freeze([9600, 5200])
  });

  ctx.addWorldPreset("hadorDeepSea", {
    ...base,
    label: "HADOR DEEP SEA — WESTERN ANCHORAGE",
    regionId: "hador_deep_sea",
    sectorIds: Object.freeze(["epoch_anchorage", "west_ssgn_lane", "deep_water_approach"]),
    variant: "cold_afternoon_low_cloud",
    sceneryOrigin: [0, -1600],
    previewFocus: [0, -1600],
    missionAnchors,
    clearColor: 0x526a79,
    sky: [
      [0, "#1a2d42"], [0.3, "#3d586b"], [0.49, "#718796"],
      [0.58, "#9aa6aa"], [0.76, "#687987"], [1, "#344a5d"]
    ],
    atmosphere: {
      ...base.atmosphere,
      seed: 0x48414436,
      noise: 0.024,
      haze: 0.16,
      thinClouds: 20,
      cloudOpacity: 0.11,
      cloudBand: [0.29, 0.63],
      cloudTint: 0xc4cdd1
    },
    fog: { color: 0x6f818b, near: 5600, far: 24800 },
    sun: {
      position: [-6100, 1750, -9400], color: 0xffd4a0, radius: 76,
      glare: [
        { scale: 1150, color: 0xffc78f, opacity: 0.2 },
        { scale: 340, color: 0xffead0, opacity: 0.54 }
      ]
    },
    sunRoad: { color: 0xd6b38a, opacity: 0.17, width: 720, length: 5200, rotationY: -0.5, position: [-1500, 0.4, -3100] },
    ocean: {
      ...base.ocean,
      base: "#173b4d",
      bright: "126, 162, 178",
      dark: "10, 35, 49",
      repeat: 44,
      roughness: 0.63,
      metalness: 0.1,
      textureProfile: "ocean",
      normalRepeat: 54,
      normalScale: [0.27, 0.36],
      normalSpeed: [0.028, 0.013],
      normalSeed: 0x48414437
    },
    lights: {
      hemi: { sky: 0xb7ccda, ground: 0x172b35, intensity: 1.42 },
      key: { color: 0xffd3a6, intensity: 1.85, position: [-6400, 2600, -7200] },
      fill: { color: 0x7198af, intensity: 0.58, position: [5400, 900, 2800] }
    },
    mountains: { ...base.mountains, count: 0, corridor: null, plateau: null },
    islands: { count: 0, stone: 0x3b4a50, green: 0x43544e },
    clouds: {
      ...base.clouds,
      scale: 1.5,
      hero: true,
      color: 0xc9d0d2,
      opacity: 0.86,
      cirrusColor: 0xaeb9c0,
      cirrusOpacity: 0.31,
      texture: { seed: 0x48414438, contrast: 1.12, underside: 0.58, softness: 1.05 }
    },
    decor: {
      seed: 0x48414439,
      keepClear: [{ x: 0, z: -1600, r: 15000 }],
      extraIslands: { count: 0, radius: [1, 1], height: [1, 1], distance: [1, 1] },
      shore: null,
      trees: null,
      rocks: null,
      extraClouds: { towers: 3, towerSize: [120, 210], towerBase: 760, stratus: 14, stratusSize: [300, 560], stratusBase: 1250, distance: [4600, 13800] }
    }
  });

  ctx.addWorldDecorator("hadorDeepSeaNavigation", {
    worlds: ["hadorDeepSea"],
    build({ THREE, addRoot, keepGeometry, keepMaterial }) {
      const root = new THREE.Group();
      root.name = "hadorDeepSeaNavigation";
      addRoot(root);
      const cylinder = keepGeometry(new THREE.CylinderGeometry(1, 1.15, 1, 10));
      const cap = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
      const steel = keepMaterial(new THREE.MeshStandardMaterial({ color: 0x4d5960, roughness: 0.72, metalness: 0.28 }));
      const amber = keepMaterial(new THREE.MeshStandardMaterial({ color: 0xffc15d, emissive: 0xff8a28, emissiveIntensity: 1.35, roughness: 0.42 }));
      const positions = [[-3900, 1800], [3900, 1800], [-4700, -5600], [4700, -5600], [0, -8900]];
      positions.forEach(([x, z], index) => {
        const body = new THREE.Mesh(cylinder, steel);
        body.name = `deep-water-buoy-${index + 1}`;
        body.position.set(x, 4.8, z);
        body.scale.set(4.2, 9.6, 4.2);
        root.add(body);
        const lamp = new THREE.Mesh(cap, amber);
        lamp.name = `deep-water-beacon-${index + 1}`;
        lamp.position.set(x, 11.4, z);
        lamp.scale.set(3.6, 3.2, 3.6);
        root.add(lamp);
      });
    }
  });
}
