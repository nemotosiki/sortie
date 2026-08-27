// NAHAR WESTERN APPROACHES (`naharMudflats`) — M14 open-ocean interdiction.
// The key is retained for save/registry compatibility; the old M04-derived
// coast, mudflats and settlement are intentionally gone.
export default function register(ctx) {
  const { WORLD_PRESETS } = ctx.tables;
  const base = WORLD_PRESETS.archipelagoDay;
  if (!base) throw new Error("[naharMudflats] archipelagoDay base preset is missing");

  const missionAnchors = Object.freeze({
    playerStart: Object.freeze([-5200, 5000]),
    battleCenter: Object.freeze([1000, -500]),
    assaultNorthEntry: Object.freeze([4600, 2000]),
    assaultSouthEntry: Object.freeze([6000, -3200]),
    transferLine: Object.freeze([-3000, -700]),
    hospitalStart: Object.freeze([300, -10800]),
    hospitalExit: Object.freeze([300, 10800]),
    northCapEntry: Object.freeze([9000, 8200]),
    southCapEntry: Object.freeze([9800, -8500])
  });

  ctx.addWorldPreset("naharMudflats", {
    ...base,
    label: "NAHAR WESTERN APPROACHES — OPEN SEA",
    regionId: "nahar_strait",
    sectorIds: Object.freeze(["western_offshore_approach", "hospital_crossing", "amphibious_transfer_line"]),
    variant: "high_noon_open_sea_interdiction",
    previewFocus: [1000, -500],
    missionAnchors,
    clearColor: 0x6f9fb8,
    sky: [
      [0, "#1d557f"], [0.3, "#4e8fb8"], [0.53, "#9cc8dc"],
      [0.7, "#d5e2e4"], [1, "#5f91a8"]
    ],
    atmosphere: {
      ...base.atmosphere,
      seed: 0x4e414814,
      noise: 0.018,
      haze: 0.09,
      thinClouds: 22,
      cloudOpacity: 0.055,
      cloudBand: [0.32, 0.7],
      cloudTint: 0xe7eff1
    },
    fog: { color: 0x8fb8c7, near: 14500, far: 43000 },
    sun: {
      position: [-6800, 9800, -4200], color: 0xfff3cf, radius: 105,
      glare: [
        { scale: 1680, color: 0xffe2a8, opacity: 0.27 },
        { scale: 430, color: 0xffffec, opacity: 0.82 }
      ]
    },
    sunRoad: {
      color: 0xffedc2, opacity: 0.2, width: 920, length: 7200,
      rotationY: Math.atan2(6800, 4200), position: [-1900, 0.35, -2500]
    },
    ocean: {
      ...base.ocean,
      base: "#1b6078",
      bright: "150, 222, 229",
      dark: "10, 52, 72",
      repeat: 34,
      roughness: 0.54,
      metalness: 0.24,
      normalRepeat: 56,
      normalScale: [0.3, 0.3],
      normalSpeed: [0.014, 0.006],
      normalSeed: 0x4e414815
    },
    lights: {
      hemi: { sky: 0xd0edf6, ground: 0x264553, intensity: 2.02 },
      key: { color: 0xfff2d4, intensity: 2.85, position: [-6200, 9100, -3800] },
      fill: { color: 0x7ac3dd, intensity: 0.7, position: [6500, 1800, 3200] }
    },
    mountains: { ...base.mountains, count: 0, plateau: null, corridor: null },
    islands: { ...base.islands, count: 0 },
    clouds: {
      ...base.clouds,
      hero: false,
      color: 0xf5f7f5,
      opacity: 0.67,
      cirrusColor: 0xdce8ec,
      cirrusOpacity: 0.32,
      texture: { seed: 0x4e414816, contrast: 0.98, underside: 0.34, softness: 1.1 }
    },
    decor: {
      seed: 0x4e414817,
      keepClear: [],
      extraIslands: null,
      shore: null,
      trees: null,
      lighthouse: null,
      rocks: null,
      extraClouds: {
        towers: 0, towerSize: [105, 180], towerBase: 980,
        stratus: 12, stratusSize: [260, 440], stratusBase: 2100,
        distance: [2400, 8400]
      }
    }
  });

  // Navigation buoys provide scale and heading references without turning the
  // sector back into a coastline. They sit outside both assault columns and
  // the hospital ship's crossing route.
  ctx.addWorldDecorator("naharOffshoreNavigation", {
    worlds: ["naharMudflats"],
    build({ THREE, addRoot, keepGeometry, keepMaterial }) {
      const root = new THREE.Group();
      root.name = "naharOffshoreNavigation";
      addRoot(root);
      const mastGeo = keepGeometry(new THREE.CylinderGeometry(1, 1.35, 1, 10));
      const cageGeo = keepGeometry(new THREE.TorusGeometry(1, 0.2, 6, 12));
      const red = keepMaterial(new THREE.MeshStandardMaterial({ color: 0xb94a3e, roughness: 0.72, metalness: 0.2 }));
      const white = keepMaterial(new THREE.MeshStandardMaterial({ color: 0xe8eee9, roughness: 0.7, metalness: 0.16 }));
      const positions = [
        [-7200, -6200], [-7000, 6900], [-4200, -7700], [-4000, 7900],
        [3600, -7200], [3900, 7600], [8200, -5900], [8500, 6200]
      ];
      positions.forEach(([x, z], index) => {
        const group = new THREE.Group();
        group.name = `nahar-offshore-buoy-${index}`;
        group.position.set(x, 2.2, z);
        const mast = new THREE.Mesh(mastGeo, index % 2 ? white : red);
        mast.scale.set(2.8, 9, 2.8);
        mast.position.y = 3.8;
        group.add(mast);
        const cage = new THREE.Mesh(cageGeo, index % 2 ? red : white);
        cage.rotation.x = Math.PI / 2;
        cage.scale.setScalar(3.7);
        cage.position.y = 8.6;
        group.add(cage);
        root.add(group);
      });
    }
  });
}
