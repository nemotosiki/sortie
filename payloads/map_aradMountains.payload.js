// ARAD MOUNTAINS (`aradMountainsArchive`) — KEREN's high valley and the
// mountain city whose power grid shares the superweapon's pylons.
export default function register(ctx) {
  const { WORLD_PRESETS } = ctx.tables;
  const base = WORLD_PRESETS.whitePass;
  if (!base) throw new Error("[aradMountains] whitePass base preset is missing");

  const missionAnchors = Object.freeze({
    playerStart: Object.freeze([0, 5400]),
    ingressGate: Object.freeze([0, 1850]),
    battleCenter: Object.freeze([0, -2650]),
    gunLine: Object.freeze([0, -3250]),
    commandCore: Object.freeze([0, -5350]),
    radarWest: Object.freeze([-330, -1500]),
    radarEast: Object.freeze([330, -1850]),
    powerNorth: Object.freeze([-390, -2350]),
    powerMid: Object.freeze([390, -3300]),
    powerSouth: Object.freeze([-390, -4300]),
    coolerWest: Object.freeze([-340, -3900]),
    coolerEast: Object.freeze([340, -4700]),
    city: Object.freeze([0, -7350]),
    airNorth: Object.freeze([-5200, -2100]),
    airSouth: Object.freeze([5200, -3600]),
    prototype: Object.freeze([0, -8200])
  });

  ctx.addWorldPreset("aradMountainsArchive", {
    ...base,
    label: "ARAD MOUNTAINS — KEREN BATTERY CANYON",
    regionId: "arad_mountains",
    sectorIds: Object.freeze(["keren_ingress", "mass_driver_valley", "mountain_city_grid"]),
    variant: "war_day_27_strong_crosswind",
    sceneryOrigin: [0, -2100],
    previewFocus: [0, -3150],
    missionAnchors,
    clearColor: 0x7596a8,
    sky: [[0, "#173653"], [0.28, "#477997"], [0.47, "#9ab6c3"], [0.54, "#d9d6c8"], [0.68, "#9daaa9"], [1, "#65716e"]],
    atmosphere: {
      ...base.atmosphere,
      seed: 0x41524144,
      noise: 0.045,
      haze: 0.16,
      thinClouds: 34,
      cloudOpacity: 0.11,
      cloudBand: [0.29, 0.74],
      cloudTint: 0xd8e0df
    },
    fog: { color: 0xa5b2b2, near: 3600, far: 13200 },
    sun: {
      position: [2700, 2300, 2050], color: 0xffe1b5, radius: 70,
      glare: [
        { scale: 920, color: 0xffd29b, opacity: 0.22 },
        { scale: 260, color: 0xfff5df, opacity: 0.62 }
      ]
    },
    lights: {
      hemi: { sky: 0xc6dce5, ground: 0x48513f, intensity: 1.7 },
      key: { color: 0xffdfb4, intensity: 2.25, position: [2500, 3200, 1900] },
      fill: { color: 0x7ca2bd, intensity: 0.68, position: [-2600, 1700, -3500] }
    },
    clouds: {
      ...base.clouds,
      scale: 1.28,
      hero: true,
      color: 0xe6e9e6,
      opacity: 0.66,
      cirrusColor: 0xcad4d6,
      cirrusOpacity: 0.38,
      texture: { seed: 0x41524145, contrast: 1.12, underside: 0.47, softness: 0.84 }
    },
    decor: {
      ...base.decor,
      seed: 0x41524146,
      keepClear: [
        { box: { x: 470, z0: -6200, z1: 2500 } },
        { x: 0, z: -7350, r: 1300 }
      ],
      trees: { count: 38, color: 0x3d5037, trunk: 0x504536, scale: [0.62, 1.0] },
      rocks: { count: 46, color: 0x66675f, scale: [7, 30] },
      extraClouds: { towers: 8, towerSize: [90, 180], towerBase: 900, stratus: 18, stratusSize: [220, 470], stratusBase: 1800, distance: [4800, 12800] }
    }
  });

  ctx.addWorldDecorator("aradKerenValley", {
    worlds: ["aradMountainsArchive"],
    build({ THREE, addRoot, keepGeometry, keepMaterial, surfaceHeightAt }) {
      const root = new THREE.Group();
      root.name = "aradKerenValley";
      addRoot(root);
      const box = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
      const cyl = keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 12));
      const material = (color, emissive = 0, intensity = 0) => keepMaterial(new THREE.MeshStandardMaterial({
        color, roughness: 0.72, metalness: 0.18, emissive, emissiveIntensity: intensity
      }));
      const concrete = material(0x6d706a);
      const dark = material(0x343a3b);
      const steel = material(0x899196);
      const power = material(0xb6e8ff, 0x55bfe8, 1.7);
      const city = material(0x777a72);
      const window = material(0xffdf9a, 0xffa53d, 1.0);
      const place = (geo, mat, name, x, y, z, sx, sy, sz) => {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = name;
        mesh.position.set(x, y, z);
        mesh.scale.set(sx, sy, sz);
        root.add(mesh);
        return mesh;
      };

      // Cut terraces make the six 100m-long gun models read as one installation
      // rather than six unrelated targets scattered over the valley floor.
      for (let row = 0; row < 3; row += 1) {
        const z = -2750 - row * 720;
        const y = surfaceHeightAt(0, z);
        place(box, dark, `keren-terrace-${row + 1}`, 0, y + 1.4, z, 760, 2.8, 470);
        place(box, concrete, `keren-service-road-${row + 1}`, 0, y + 3.1, z + 205, 580, 1.0, 28);
      }

      // A visible power line continues past the military complex into the city;
      // this is why the faster pylon route carries a civilian outage cost.
      for (let i = 0; i < 9; i += 1) {
        const x = i % 2 === 0 ? -430 : 430;
        const z = -2300 - i * 610;
        const y = surfaceHeightAt(x, z);
        place(box, steel, `arad-grid-mast-${i + 1}`, x, y + 38, z, 3, 76, 3);
        place(box, dark, `arad-grid-arm-${i + 1}`, x, y + 72, z, 58, 3, 3);
        place(cyl, power, `arad-grid-beacon-${i + 1}`, x, y + 77, z, 3.2, 5, 3.2);
      }

      // The mountain city is deliberately beyond the command core but still
      // visible down-valley, tying the strategic weapon to an inhabited place.
      const cityZ = -7350;
      const cityY = surfaceHeightAt(0, cityZ);
      for (let row = 0; row < 4; row += 1) {
        for (let col = -4; col <= 4; col += 1) {
          const x = col * 150 + (row % 2) * 55;
          const z = cityZ + row * 180;
          const height = 36 + ((Math.abs(col * 5 + row * 7) % 5) * 18);
          place(box, city, `arad-city-${row}-${col}`, x, cityY + height * 0.5, z, 94, height, 104);
          place(box, window, `arad-city-light-${row}-${col}`, x, cityY + height + 2, z, 34, 3, 34);
        }
      }
    }
  });
}
