// NAHAR WEST MUDFLATS (`naharMudflats`) — M14 daylight landing corridor.
// Reuses the exact Nahar Strait continental sheets and coastline from M04.
export default function register(ctx) {
  const { WORLD_PRESETS } = ctx.tables;
  const base = WORLD_PRESETS.naharStrait;
  if (!base) throw new Error("[naharMudflats] naharStrait base preset is missing");

  const missionAnchors = Object.freeze({
    ...base.missionAnchors,
    playerStart: Object.freeze([-10800, 300]),
    battleCenter: Object.freeze([-3800, -900]),
    assaultEntry: Object.freeze([5200, 0]),
    beachhead: Object.freeze([-7800, -2150]),
    hospitalStart: Object.freeze([-9800, 900]),
    hospitalExit: Object.freeze([9000, 1250]),
    northCapEntry: Object.freeze([7800, 7600]),
    southCapEntry: Object.freeze([8200, -7600])
  });

  ctx.addWorldPreset("naharMudflats", {
    ...base,
    label: "NAHAR WEST COAST — MUDFLATS",
    sectorIds: Object.freeze(["west_mudflat_defence", "hospital_channel", "assault_approach"]),
    variant: "clear_midday_mudflats",
    previewFocus: [-3800, -900],
    missionAnchors,
    clearColor: 0x75b8db,
    sky: [
      [0, "#2d80bd"], [0.34, "#69b4de"], [0.52, "#badbea"],
      [0.7, "#e3e9e6"], [1, "#8bbfd1"]
    ],
    atmosphere: {
      ...base.atmosphere,
      seed: 0x4e414814,
      noise: 0.02,
      haze: 0.13,
      thinClouds: 18,
      cloudOpacity: 0.07,
      cloudBand: [0.34, 0.68],
      cloudTint: 0xe2e7e5
    },
    fog: { color: 0x9fc9d4, near: 10500, far: 39000 },
    sun: {
      position: [-5400, 7200, -3600], color: 0xfff0c7, radius: 112,
      glare: [
        { scale: 1750, color: 0xffd592, opacity: 0.3 },
        { scale: 470, color: 0xfff7dc, opacity: 0.75 }
      ]
    },
    sunRoad: null,
    ocean: {
      ...base.ocean,
      base: "#2d7581",
      bright: "121, 190, 193",
      dark: "27, 86, 99",
      roughness: 0.67,
      normalSeed: 0x4e414815
    },
    lights: {
      hemi: { sky: 0xc5e5f2, ground: 0x52634d, intensity: 1.72 },
      key: { color: 0xffefc5, intensity: 2.45, position: [-4800, 7300, -3400] },
      fill: { color: 0x7fb6c9, intensity: 0.62, position: [5200, 1200, 2800] }
    },
    clouds: {
      ...base.clouds,
      color: 0xf0f2ee,
      opacity: 0.66,
      cirrusColor: 0xd3dfe2,
      cirrusOpacity: 0.28,
      texture: { seed: 0x4e414816, contrast: 0.94, underside: 0.38, softness: 1.08 }
    },
    decor: { ...base.decor, seed: 0x4e414817 }
  });

  ctx.addWorldDecorator("naharMudflatDefence", {
    worlds: ["naharMudflats"],
    build({ THREE, addRoot, keepGeometry, keepMaterial, surfaceHeightAt }) {
      const root = new THREE.Group();
      root.name = "naharMudflatDefence";
      addRoot(root);
      const boxGeo = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
      const cylGeo = keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 12));
      const planeGeo = keepGeometry(new THREE.PlaneGeometry(1, 1));
      const mat = (color, roughness = 0.9, metalness = 0.03) => keepMaterial(
        new THREE.MeshStandardMaterial({ color, roughness, metalness })
      );
      const mud = mat(0x756d59, 0.98);
      const sand = mat(0xa79a78, 0.96);
      const concrete = mat(0x85877f, 0.9);
      const steel = mat(0x505a5e, 0.68, 0.25);
      const roof = mat(0x4b5154, 0.78, 0.12);
      const ground = (x, z) => surfaceHeightAt(x, z) + 0.6;
      const box = (name, x, y, z, sx, sy, sz, material, ry = 0) => {
        const mesh = new THREE.Mesh(boxGeo, material);
        mesh.name = name;
        mesh.position.set(x, y, z);
        mesh.scale.set(sx, sy, sz);
        mesh.rotation.y = ry;
        root.add(mesh);
      };
      const patch = (name, x, z, sx, sz, material, ry = 0) => {
        const mesh = new THREE.Mesh(planeGeo, material);
        mesh.name = name;
        mesh.position.set(x, ground(x, z), z);
        mesh.scale.set(sx, sz, 1);
        mesh.rotateX(-Math.PI / 2);
        mesh.rotateZ(ry);
        root.add(mesh);
      };

      // Irregular exposed flats and shallow sandbars continue the south-bank
      // coastline into the actual landing sector without replacing terrain.
      patch("nahar-mudflat-west", -7900, -2450, 3800, 720, mud, 0.03);
      patch("nahar-mudflat-channel", -5900, -2300, 2100, 460, sand, -0.06);
      patch("nahar-mudflat-east", -9400, -2320, 1600, 520, mud, 0.09);

      // Coastal revetments and a small fishing settlement show that this is a
      // defended inhabited shore, not an empty target slab.
      for (let i = 0; i < 8; i += 1) {
        const x = -9100 + (i % 4) * 310;
        const z = -3100 - Math.floor(i / 4) * 260;
        const y = ground(x, z);
        box(`nahar-coast-house-${i}`, x, y + 18, z, 150, 36, 90, concrete, (i % 3 - 1) * 0.04);
        box(`nahar-coast-roof-${i}`, x, y + 38, z, 160, 5, 100, roof, (i % 3 - 1) * 0.04);
      }
      for (let i = 0; i < 9; i += 1) {
        const x = -8750 + i * 250;
        const z = -2730 + Math.sin(i * 0.8) * 80;
        box(`nahar-revetment-${i}`, x, ground(x, z) + 5, z, 150, 10, 28, concrete, -0.04);
      }
      for (const [index, x] of [-9200, -7800, -6500].entries()) {
        const z = -2580;
        const mast = new THREE.Mesh(cylGeo, steel);
        mast.name = `nahar-channel-marker-${index}`;
        mast.position.set(x, ground(x, z) + 18, z);
        mast.scale.set(3, 36, 3);
        root.add(mast);
      }
    }
  });
}
