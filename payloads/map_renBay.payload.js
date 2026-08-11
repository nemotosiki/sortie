// RECOVERED from the previous execution record; current createWorld schema aligned.
// REN BAY (`renBay`) — Sera's dawn coastal air-defence region for M01.
// Payload-only world preset. All resources are registered through the
// addWorldDecorator env contract and are reclaimed by disposeWorld.
export default function register(ctx) {
  ctx.addWorldPreset("renBay", {
    label: "REN BAY",
    sceneryOrigin: [0, 4300],
    // The gameplay plateau is shifted inland to place its north/side edges
    // beyond fog, but previews must keep looking at the airport and city.
    previewFocus: [0, 4300],
    clearColor: 0x8097ad,
    sky: [[0, "#142846"], [0.3, "#355d84"], [0.58, "#9ab5ca"], [0.76, "#efc9a2"], [1, "#5a7187"]],
    atmosphere: { seed: 0x724201, noise: 0.018, haze: 0.11, thinClouds: 13, cloudOpacity: 0.055, cloudBand: [0.42, 0.7], cloudTint: 0xeaf0f3 },
    fog: { color: 0x8fa6b7, near: 2600, far: 12500 },
    sun: {
      position: [-3300, 1250, -5200], color: 0xffd7ad, radius: 82,
      glare: [
        { scale: 1500, color: 0xffc691, opacity: 0.45 },
        { scale: 420, color: 0xfff1d4, opacity: 0.86 }
      ]
    },
    moon: null,
    stars: null,
    sunRoad: { color: 0xffc985, opacity: 0.21, width: 620, length: 3600, rotationY: 0.55, position: [-900, 0.4, -800] },
    ocean: {
      base: "#183f59", bright: "132, 188, 213", dark: "9, 31, 48",
      repeat: 24, roughness: 0.46, metalness: 0.19,
      normalRepeat: 34, normalScale: [0.3, 0.48], normalSpeed: [0.009, 0.004], normalSeed: 0x724202
    },
    terrain: {
      seed: 0x724203, sand: 0x9e967f, grass: 0x59684e, rock: 0x646862,
      peak: 0x5d625e, snow: 0xe8edf0, textureProfile: "urban",
      fineRepeat: 24, macroRepeat: 4.2, normalRepeat: 26,
      normalStrength: 0.27, islandNormalStrength: 0.18, normalFade: [240, 1900],
      rockSlope: [0.31, 0.72], shoreHeight: 0.2, snowSoftness: 0.08
    },
    continentalSheet: {
      // A true inland backfill. The local plateau still shapes the bay,
      // airport and city, while this surface continues behind it so no
      // side or rear polygon edge can enter the 12.5 km visibility range.
      width: 180000,
      depth: 120000,
      centerX: 0,
      coastZ: -6100,
      beachDepth: 1400,
      height: 28,
      segments: 320,
      uvWorldScale: 10800,
      coastWaves: [
        { amplitude: 260, wavelength: 18000, phase: 0.6 },
        { amplitude: 110, wavelength: 5200, phase: 1.7 }
      ]
    },
    lights: {
      hemi: { sky: 0xb8d6ec, ground: 0x30332f, intensity: 1.85 },
      key: { color: 0xffd8b5, intensity: 2.45, position: [-1500, 1150, -2500] },
      fill: { color: 0x8ebce3, intensity: 0.62, position: [1000, 330, 1200] }
    },
    mountains: {
      count: 8, radius: [190, 390], height: [100, 300], distance: [7300, 9100],
      snowyAbove: 9999, snowLine: 0.68, roughness: 0.94,
      palette: { low: 0x3f5142, mid: 0x556557, rock: 0x646862, peak: 0x5d625e, snow: 0xe8edf0 },
      corridor: null,
      // Continental back-country, not a finite island. The earlier 16 km
      // ellipse was wide only at its centre; near the southern approach it
      // tapered to a narrow point, so both side edges were visible in the M01
      // opening shot. Keep a real coast just ahead of the spawn, then move the
      // side and rear boundaries far beyond the 12.5 km fog horizon.
      plateau: {
        radius: [60000, 60000], depth: 24000, height: [28, 28],
        topRadius: 0.96, at: [0, 18000], rotationY: 0,
        radialSegments: 96, edgeNoise: 0.04, snowyAbove: 9999
      }
    },
    islands: { count: 5, stone: 0x59645f, green: 0x4b6348 },
    clouds: {
      scale: 0.92, hero: false, color: 0xecf2f4, opacity: 0.64,
      cirrusColor: 0xe9eef2, cirrusOpacity: 0.25,
      texture: { seed: 0x724204, contrast: 1.03, underside: 0.39, softness: 1.04 }
    },
    decor: {
      seed: 0x724205,
      keepClear: [{ x: 0, z: 4300, r: 6300 }, { x: 0, z: -2500, r: 4500 }],
      extraIslands: { count: 7, radius: [120, 280], height: [24, 80], distance: [7000, 9300] },
      shore: { sand: 0xb9ae93, shallow: 0x5a9eb1, opacity: 0.78, width: 1.22 },
      trees: { perIsland: 10, color: 0x365641, trunk: 0x493a2a, height: [9, 18] },
      rocks: { count: 14, color: 0x4d5856, scale: [7, 18] },
      // The city builder consumes radial bands (`r`) and height ranges rather
      // than the older radius/minHeight draft shape. Dawn keeps the windows
      // sparse; the low, broad skyline is carried by the wall mass, airport
      // and hospital landmarks rather than a night-city light field.
      city: {
        at: [0, 4300],
        cell: 118,
        street: 32,
        districts: [
          { r: [0, 1150], height: [18, 88], fill: 0.66 },
          { r: [1150, 2100], height: [10, 48], fill: 0.48 }
        ],
        maxHeight: 88,
        wall: 0x6f7479,
        roof: 0x565b60,
        windows: {
          warm: 0xffd5a0,
          cold: 0xbfd8ff,
          lit: 0.04,
          rows: 18,
          cols: 12,
          repeat: 8
        },
        grid: null,
        beacons: null
      }
    }
  });

  ctx.addWorldDecorator("renBayWorks", {
    worlds: ["renBay"],
    build({ THREE, addRoot, keepGeometry, keepMaterial, surfaceHeightAt }) {
      const root = new THREE.Group();
      root.name = "renBayWorks";
      addRoot(root);

      const boxGeo = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
      const cylGeo = keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 12));
      const mats = new Map();
      const mat = (color, opts = {}) => {
        const key = `${color}:${opts.emissive || 0}:${opts.roughness || 0.76}:${opts.metalness || 0.04}`;
        if (!mats.has(key)) mats.set(key, keepMaterial(new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.76, metalness: opts.metalness ?? 0.04, emissive: opts.emissive || 0, emissiveIntensity: opts.emissiveIntensity || 0 })));
        return mats.get(key);
      };
      const box = (x, y, z, sx, sy, sz, color, ry = 0, opts) => {
        const m = new THREE.Mesh(boxGeo, mat(color, opts));
        m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.y = ry; root.add(m); return m;
      };
      const cyl = (x, y, z, r, h, color) => {
        const m = new THREE.Mesh(cylGeo, mat(color));
        m.position.set(x, y, z); m.scale.set(r, h, r); root.add(m); return m;
      };
      const groundY = (x, z) => Math.max(28, surfaceHeightAt(x, z));
      void groundY;
      const deck = 29.2;

      // Airport: two parallel runways, taxiways, apron and terminal.
      for (const x of [-2850, -2050]) {
        box(x, deck, 5000, 64, 1.2, 3300, 0x30343a);
        for (let z = 3500; z <= 6500; z += 300) box(x, deck + 0.7, z, 4, 0.35, 72, 0xe8e2ce);
      }
      box(-2450, deck, 3220, 1150, 1.1, 310, 0x45494d);
      box(-2450, deck + 22, 3050, 850, 44, 170, 0x737980);
      box(-2450, deck + 48, 3070, 890, 8, 190, 0x565d63);
      box(-1450, deck, 4300, 620, 1.1, 52, 0x4a4e51, 0.18);
      // Control tower.
      cyl(-1500, deck + 43, 3300, 13, 86, 0x626a70);
      box(-1500, deck + 91, 3300, 45, 18, 45, 0x8aa0aa);
      box(-1500, deck + 102, 3300, 54, 5, 54, 0x4b555d);

      // Medical aviation district and helipads.
      const medX = 2700, medZ = 5000;
      box(medX, deck + 26, medZ, 520, 52, 300, 0xd5d9d8);
      box(medX + 360, deck + 16, medZ + 170, 260, 32, 230, 0xbfc8ca);
      box(medX - 360, deck + 14, medZ - 150, 240, 28, 210, 0xc7cdcb);
      for (const [hx, hz] of [[2250, 4450], [3100, 4450]]) {
        box(hx, deck + 0.2, hz, 150, 0.5, 150, 0x555b5e);
        box(hx, deck + 0.8, hz, 105, 0.5, 16, 0xe9e6da);
        box(hx, deck + 0.8, hz, 16, 0.5, 105, 0xe9e6da);
      }
      cyl(3300, deck + 38, 5200, 10, 76, 0x677077);
      box(3300, deck + 80, 5200, 35, 12, 35, 0x8ea8b0);

      // Coastal roads and seawall, visually separating the city from the bay.
      box(0, deck + 0.1, 1650, 7900, 0.8, 42, 0x404448);
      box(-1100, deck + 0.1, 2500, 42, 0.8, 3300, 0x404448, -0.08);
      box(1200, deck + 0.1, 2550, 42, 0.8, 3200, 0x404448, 0.06);
      box(0, 17, 1300, 7600, 34, 34, 0x777a74);

      // Breakwaters form the mouth of the bay without blocking the open southern airspace.
      box(-3550, 9, 300, 1700, 18, 75, 0x666a66, -0.22);
      box(3550, 9, 300, 1700, 18, 75, 0x666a66, 0.22);
      for (const x of [-4300, 4300]) {
        cyl(x, 33, 800, 24, 66, 0xe7e1d4);
        box(x, 69, 800, 40, 10, 40, 0xc54a3f);
      }

      // Airport beacons and medical helipad lights: sparse dawn points, not a night-city field.
      const beaconMat = mat(0xffc86b, { emissive: 0xff9b32, emissiveIntensity: 1.6, roughness: 0.5 });
      for (const x of [-2850, -2050]) {
        for (const z of [3350, 6650]) {
          const m = new THREE.Mesh(cylGeo, beaconMat); m.position.set(x, deck + 2.5, z); m.scale.set(3.2, 5, 3.2); root.add(m);
        }
      }

      root.traverse((node) => { if (node.isMesh) { node.castShadow = false; node.receiveShadow = true; } });
    }
  });
}
