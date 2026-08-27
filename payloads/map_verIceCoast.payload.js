// VER ICE COAST (`verIceCoast`) — Sera M11's high-altitude polar escort map.
//
// The mission crosses a broad frozen coast at about 5,100 m. Large-scale ice
// shelves and dark sea leads provide motion/altitude cues while all random
// relief remains far below and outside the 23 km operation corridor.
export default function register(ctx) {
  const { WORLD_PRESETS } = ctx.tables;
  const base = WORLD_PRESETS.glacierCanyon;
  if (!base) throw new Error("[verIceCoast] glacierCanyon base preset is missing");

  // FROZEN EYE is a coastal mainland installation, not an offshore ice base.
  // This point lies 1.2-3.0 km inland of verIceShelfWest's jagged coastline,
  // between the two authored sea leads and clear of the fishing harbour.
  const frozenEyeBase = Object.freeze([0, 6500]);
  const missionAnchors = Object.freeze({
    playerStart: Object.freeze([-10800, -7200]),
    strikeStart: Object.freeze([-9600, -6400]),
    strikeExit: Object.freeze([9600, 6400]),
    operationLine: Object.freeze([9000, 6000]),
    // Keep the battle volume centred between the seaward ingress and the
    // mainland objective. Centring it on the relocated base would put the
    // player in the warning band at mission start.
    battleCenter: Object.freeze([0, 0]),
    firstIntercept: Object.freeze([-4200, 11500]),
    northIntercept: Object.freeze([4200, 14500]),
    southIntercept: Object.freeze([11200, -6500]),
    baseCapEntry: Object.freeze([-8500, 6500]),
    coastQraEntry: Object.freeze([8500, 3000]),
    inlandQraEntry: Object.freeze([2400, 15500]),
    arcaWatchStart: Object.freeze([-6500, 12500]),
    arcaWatchExit: Object.freeze([8500, 10500]),
    diversionEntry: Object.freeze([-2500, -8200]),
    weatherStation: frozenEyeBase,
    fishingHarbour: Object.freeze([-3300, 3300])
  });

  ctx.addWorldPreset("verIceCoast", {
    ...base,
    label: "VER ICE COAST",
    regionId: "ver_ice_coast",
    sectorIds: Object.freeze(["western_ice_approach", "ver_shelf", "operation_line"]),
    variant: "polar_morning_high_altitude",
    sceneryOrigin: [0, 0],
    previewFocus: [...frozenEyeBase],
    missionAnchors,
    clearColor: 0xa7c2d1,
    sky: [
      [0, "#17355a"], [0.27, "#3d7198"], [0.44, "#8eb8cf"],
      [0.5, "#e4d5bb"], [0.57, "#abc4d0"], [0.73, "#819fab"], [1, "#607985"]
    ],
    atmosphere: {
      ...base.atmosphere,
      seed: 0x56455211,
      noise: 0.012,
      haze: 0.085,
      thinClouds: 18,
      cloudOpacity: 0.045,
      cloudBand: [0.38, 0.7],
      cloudTint: 0xe7f0f3
    },
    // The longest live escort geometry is about 26 km. The camera far plane
    // follows this value in the host, so the operation line remains drawable.
    fog: { color: 0xa7c2d1, near: 10500, far: 34000 },
    sun: {
      position: [-2700, 780, -1100], color: 0xffe2bd, radius: 74,
      glare: [
        { scale: 1350, color: 0xffd5a2, opacity: 0.34 },
        { scale: 340, color: 0xfff5df, opacity: 0.82 }
      ]
    },
    moon: null,
    stars: null,
    sunRoad: {
      color: 0xffdfb2, opacity: 0.17, width: 900, length: 6200,
      rotationY: Math.atan2(2700, 1100), position: [1600, 0.5, 650]
    },
    ocean: {
      ...base.ocean,
      base: "#153f58",
      bright: "155, 203, 220",
      dark: "9, 36, 52",
      repeat: 32,
      roughness: 0.34,
      metalness: 0.27,
      normalRepeat: 40,
      normalScale: [0.2, 0.28],
      normalSpeed: [0.004, 0.001],
      normalSeed: 0x56455212
    },
    terrain: {
      ...base.terrain,
      seed: 0x56455213,
      sand: 0x89a8b5,
      grass: 0xb9ccd3,
      rock: 0x748b98,
      peak: 0xd8e5e9,
      snow: 0xf0f5f4,
      fineRepeat: 17,
      macroRepeat: 3.3,
      normalRepeat: 24,
      normalStrength: 0.2,
      islandNormalStrength: 0.13,
      normalFade: [300, 2400],
      rockSlope: [0.2, 0.58],
      shoreHeight: 0.17,
      snowLine: 0.1,
      snowSoftness: 0.1
    },
    lights: {
      hemi: { sky: 0xd6edf5, ground: 0x334a55, intensity: 2.05 },
      key: { color: 0xffe2bd, intensity: 2.25, position: [-2700, 780, -1100] },
      fill: { color: 0x92c5e4, intensity: 0.72, position: [1500, 450, 2400] }
    },
    // Relief sits outside the combat route and never reaches the 4.8–5.4 km
    // escort corridor. At mission altitude it reads as a distant coast/ridge.
    mountains: {
      ...base.mountains,
      count: 12,
      radius: [700, 1500],
      height: [580, 1380],
      distance: [14500, 22500],
      snowyAbove: 0,
      snowLine: 0.18,
      roughness: 0.94,
      palette: {
        low: 0x607a87, mid: 0x8099a4, rock: 0x9db0b8,
        peak: 0xd5e2e7, snow: 0xeff5f6
      },
      corridor: null,
      plateau: null
    },
    islands: { count: 8, stone: 0x78929e, green: 0xd9e7ea },
    clouds: {
      ...base.clouds,
      scale: 1.08,
      hero: false,
      color: 0xeaf2f3,
      opacity: 0.56,
      cirrusColor: 0xe5edef,
      cirrusOpacity: 0.31,
      texture: { seed: 0x56455214, contrast: 0.9, underside: 0.38, softness: 1.12 }
    },
    decor: {
      ...base.decor,
      seed: 0x56455215,
      keepClear: [{ box: { x: 4200, z0: -9000, z1: 9000 } }],
      extraIslands: { count: 10, radius: [260, 760], height: [50, 220], distance: [8500, 15000] },
      shore: { sand: 0xdce9eb, shallow: 0x78aec0, opacity: 0.58, width: 1.24 },
      trees: null,
      floes: { count: 34, color: 0xdcebed, scale: [45, 150], along: { x: 12000, z: [9000, -9000] } },
      rocks: { count: 12, color: 0x6d8792, scale: [16, 48] },
      extraClouds: {
        towers: 0, towerSize: [70, 110], towerBase: 1600,
        stratus: 16, stratusSize: [300, 650], stratusBase: 2600,
        distance: [6500, 15000]
      }
    }
  });

  ctx.addWorldDecorator("verIceCoastWorks", {
    worlds: ["verIceCoast"],
    build({ THREE, addRoot, keepGeometry, keepMaterial }) {
      const root = new THREE.Group();
      root.name = "verIceCoastWorks";
      addRoot(root);

      const boxGeometry = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
      const cylinderGeometry = keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 12));
      const materials = new Map();
      const material = (color, options = {}) => {
        const key = `${color}:${options.emissive || 0}:${options.opacity ?? 1}:${options.metalness ?? 0.02}`;
        if (!materials.has(key)) {
          materials.set(key, keepMaterial(new THREE.MeshStandardMaterial({
            color,
            roughness: options.roughness ?? 0.9,
            metalness: options.metalness ?? 0.02,
            emissive: options.emissive || 0,
            emissiveIntensity: options.emissive ? (options.emissiveIntensity ?? 1) : 0,
            transparent: (options.opacity ?? 1) < 1,
            opacity: options.opacity ?? 1,
            depthWrite: (options.opacity ?? 1) >= 1
          })));
        }
        return materials.get(key);
      };
      const box = (name, x, y, z, sx, sy, sz, color, rotation = 0, options = {}) => {
        const mesh = new THREE.Mesh(boxGeometry, material(color, options));
        mesh.name = name;
        mesh.position.set(x, y, z);
        mesh.scale.set(sx, sy, sz);
        mesh.rotation.y = rotation;
        root.add(mesh);
        return mesh;
      };
      const cylinder = (name, x, y, z, radius, height, color, options = {}) => {
        const mesh = new THREE.Mesh(cylinderGeometry, material(color, options));
        mesh.name = name;
        mesh.position.set(x, y, z);
        mesh.scale.set(radius, height, radius);
        root.add(mesh);
        return mesh;
      };
      // The base has dozens of repeated berms, pads, roofs, service vehicles
      // and masts. Queue those transforms by shared geometry/material and emit
      // one InstancedMesh per batch; the older harbour/floe landmarks keep
      // their individually named meshes because they are few and some are
      // mutated after construction.
      const baseInstanceBatches = new Map();
      const queueBaseInstance = (geometry, instanceMaterial, name, position, scale, rotation) => {
        let byMaterial = baseInstanceBatches.get(geometry);
        if (!byMaterial) {
          byMaterial = new Map();
          baseInstanceBatches.set(geometry, byMaterial);
        }
        let batch = byMaterial.get(instanceMaterial);
        if (!batch) {
          batch = { geometry, material: instanceMaterial, instances: [] };
          byMaterial.set(instanceMaterial, batch);
        }
        batch.instances.push({ name, position, scale, rotation });
      };
      const baseBox = (name, x, y, z, sx, sy, sz, color, rotation = 0, options = {}) => {
        queueBaseInstance(
          boxGeometry, material(color, options), name,
          [x, y, z], [sx, sy, sz], [0, rotation, 0]
        );
      };
      const baseCylinder = (name, x, y, z, radius, height, color, options = {}) => {
        queueBaseInstance(
          cylinderGeometry, material(color, options), name,
          [x, y, z], [radius, height, radius], [0, 0, 0]
        );
      };
      const flushBaseInstances = () => {
        const position = new THREE.Vector3();
        const scale = new THREE.Vector3();
        const rotation = new THREE.Euler();
        const quaternion = new THREE.Quaternion();
        const matrix = new THREE.Matrix4();
        let batchIndex = 0;
        for (const byMaterial of baseInstanceBatches.values()) {
          for (const batch of byMaterial.values()) {
            const mesh = new THREE.InstancedMesh(
              batch.geometry, batch.material, batch.instances.length
            );
            batchIndex += 1;
            mesh.name = `verFrozenEyeBatch${batchIndex}`;
            mesh.userData.instanceNames = batch.instances.map((entry) => entry.name);
            batch.instances.forEach((entry, index) => {
              position.fromArray(entry.position);
              scale.fromArray(entry.scale);
              rotation.fromArray(entry.rotation);
              quaternion.setFromEuler(rotation);
              matrix.compose(position, quaternion, scale);
              mesh.setMatrixAt(index, matrix);
            });
            mesh.instanceMatrix.needsUpdate = true;
            root.add(mesh);
          }
        }
      };

      const flatPolygon = (name, points, y, color, options = {}) => {
        const shape = new THREE.Shape();
        points.forEach(([x, z], index) => {
          // ShapeGeometry is authored in XY and then laid into XZ. Invert its
          // second axis here so the named world-space Z anchors stay literal
          // after the -90 degree rotation below.
          if (index === 0) shape.moveTo(x, -z);
          else shape.lineTo(x, -z);
        });
        shape.closePath();
        const geometry = keepGeometry(new THREE.ShapeGeometry(shape, 12));
        const mesh = new THREE.Mesh(geometry, material(color, options));
        mesh.name = name;
        mesh.position.y = y;
        mesh.rotation.x = -Math.PI / 2;
        root.add(mesh);
        return mesh;
      };

      // One continuous, jagged shelf replaces a stack of rectangular plates.
      // The coastline points turn at 1–4 km intervals so the silhouette remains
      // irregular even from 5 km, while the far boundary stays beyond fog.
      flatPolygon("verIceShelfWest", [
        [-30000, -1000], [-27000, -400], [-24000, 350], [-21300, -650],
        [-18800, 800], [-16000, 250], [-13400, 1600], [-10800, 550],
        [-8200, 2250], [-5900, 1450], [-3700, 3100], [-1400, 2450],
        [900, 4100], [3200, 3300], [5500, 5200], [8100, 4250],
        [10800, 6100], [13900, 5400], [16800, 7300], [20100, 6500],
        [23200, 8500], [26500, 7800], [30000, 9800], [30000, 30000],
        [-30000, 30000]
      ], 1.35, 0xd7e7e9, { roughness: 0.93 });
      flatPolygon("verIceShelfEast", [
        [14200, -1800], [16400, -900], [18300, -1300], [20100, 100],
        [22200, -250], [24500, 1500], [26300, 1100], [28600, 3100],
        [30000, 2700], [30000, 7600], [26500, 6800], [23200, 6500],
        [20400, 5000], [17800, 4700], [15700, 2900], [13900, 1900]
      ], 1.3, 0xc9dde1, { roughness: 0.91 });

      // Wide jagged blue-grey leads break the shelf and show its scale. They
      // are visual water windows, not colliders or mission surfaces.
      flatPolygon("verIceLeadOne", [
        [-5900, 1350], [-5350, 1750], [-5100, 3150], [-4550, 3900],
        [-4350, 5550], [-3700, 6500], [-3550, 9100], [-4100, 11200],
        [-4750, 9000], [-4900, 6750], [-5550, 5800], [-5650, 3750],
        [-6200, 2850]
      ], 1.8, 0x17485f, { roughness: 0.4, metalness: 0.17 });
      flatPolygon("verIceLeadTwo", [
        [5400, 5050], [6100, 5400], [7100, 6600], [7800, 6800],
        [9000, 7900], [9700, 8100], [11100, 9600], [10600, 10500],
        [9300, 9100], [8450, 8900], [7350, 7600], [6700, 7400],
        [5750, 6200], [5000, 5900]
      ], 1.82, 0x214f63, { roughness: 0.42, metalness: 0.15 });

      // Authored floe field along the operation-line side of the coast.
      for (let i = 0; i < 42; i += 1) {
        const angle = i * 2.3999632297;
        const band = 2500 + (i % 9) * 690;
        const x = 2500 + Math.cos(angle) * band + (i % 4) * 520;
        const z = -3200 + Math.sin(angle) * band * 0.72;
        const radius = 70 + (i % 7) * 34;
        const floe = cylinder(`verAuthoredFloe${i + 1}`, x, 1.45, z, radius, 2.4, i % 3 ? 0xdcebed : 0xc8dce1);
        floe.scale.z *= 0.56 + (i % 5) * 0.11;
        floe.rotation.y = angle * 0.37;
      }

      // A compact fishing harbour gives the western shelf a recognizable
      // human scale cue without becoming a target or entering collision logic.
      box("verHarbourQuay", -3300, 8, 3300, 950, 13, 130, 0x596a70, 0.18);
      for (let i = 0; i < 9; i += 1) {
        const x = -3800 + (i % 5) * 250;
        const z = 3850 + Math.floor(i / 5) * 230;
        box(`verHarbourBuilding${i + 1}`, x, 27, z, 150, 50 + (i % 3) * 16, 120,
          i % 2 ? 0xb95a49 : 0xd4d9d5, (i % 3 - 1) * 0.08);
      }
      cylinder("verHarbourBeacon", -2770, 45, 3170, 10, 82, 0xe5e9e6);
      cylinder("verHarbourBeaconLamp", -2770, 89, 3170, 18, 7, 0x7ce8dc,
        { emissive: 0x62e6d7, emissiveIntensity: 2.1 });

      // FROZEN EYE base. Combat targets are spawned by M11; everything here is
      // visual-only infrastructure kept clear of those exact centres. A broad
      // dark road loop first makes the ten contacts read as one installation,
      // then hardened wings, portals and a logistics belt give it a plausible
      // reason to exist beyond being a row of target props.
      const baseX = frozenEyeBase[0];
      const baseZ = frozenEyeBase[1];
      const road = 0x4c575c;
      const apron = 0x707d80;
      const concrete = 0x99a5a5;
      const bunker = 0x657173;
      const roof = 0xaeb9b8;
      const utility = 0x586368;
      const snowWear = 0xc7d8da;
      const targetPads = [
        ["RadarWest", -680, 420, 105, 88], ["RadarEast", 670, 360, 105, 88],
        ["Control", 0, 0, 130, 118], ["Power", -360, -520, 110, 96],
        ["Fuel", 370, -560, 118, 102], ["SamWest", -1180, -180, 108, 108],
        ["SamNorth", 0, 1120, 108, 108], ["SamEast", 1180, -160, 108, 108],
        ["GunWest", -720, -850, 82, 82], ["GunEast", 720, -850, 82, 82]
      ];
      const revetment = (name, x, z, width, depth) => {
        baseBox(`verBase${name}Pad`, x, 1.62, z, width, 0.5, depth, apron);
        const gap = 22;
        const wall = 5;
        const sideWidth = Math.max(12, (width - gap) * 0.5);
        baseBox(`verBase${name}BermW`, x - width * 0.52, 4.4, z, wall, 5.2, depth + 12, snowWear);
        baseBox(`verBase${name}BermE`, x + width * 0.52, 4.4, z, wall, 5.2, depth + 12, snowWear);
        baseBox(`verBase${name}BermN1`, x - (width + gap) * 0.25, 4.4, z + depth * 0.52,
          (width - gap) * 0.5, 5.2, wall, snowWear);
        baseBox(`verBase${name}BermN2`, x + (width + gap) * 0.25, 4.4, z + depth * 0.52,
          (width - gap) * 0.5, 5.2, wall, snowWear);
        // South is the service entrance; short returns protect it without
        // enclosing the target model inside scenery collision geometry.
        baseBox(`verBase${name}BermS1`, x - width * 0.37, 4.4, z - depth * 0.52,
          sideWidth, 5.2, wall, snowWear);
        baseBox(`verBase${name}BermS2`, x + width * 0.37, 4.4, z - depth * 0.52,
          sideWidth, 5.2, wall, snowWear);
      };

      // The compound now sits on the continuous western mainland shelf. This
      // nearly flush polygon is only a wind-scoured grading layer under the
      // roads; it is not a separate island and never crosses the coastline.
      flatPolygon("verFrozenEyeInlandGrade", [
        [baseX - 1760, baseZ - 900], [baseX - 1510, baseZ - 1370],
        [baseX - 620, baseZ - 1510], [baseX + 410, baseZ - 1420],
        [baseX + 1490, baseZ - 1210], [baseX + 1760, baseZ - 540],
        [baseX + 1660, baseZ + 430], [baseX + 1430, baseZ + 1250],
        [baseX + 610, baseZ + 1460], [baseX - 570, baseZ + 1410],
        [baseX - 1510, baseZ + 1110], [baseX - 1780, baseZ + 260]
      ], 1.39, 0xd5e4e6, { roughness: 0.94 });

      // Perimeter service loop (2.8 x 2.4 km) and radial access roads.
      baseBox("verBaseRoadNorth", baseX, 1.48, baseZ + 1180, 2760, 0.28, 46, road);
      baseBox("verBaseRoadSouth", baseX, 1.48, baseZ - 1110, 2760, 0.28, 46, road);
      baseBox("verBaseRoadWest", baseX - 1380, 1.49, baseZ + 35, 46, 0.3, 2250, road);
      baseBox("verBaseRoadEast", baseX + 1380, 1.49, baseZ + 35, 46, 0.3, 2250, road);
      baseBox("verBaseRoadSpine", baseX, 1.5, baseZ, 42, 0.32, 2200, road);
      baseBox("verBaseRoadCross", baseX, 1.5, baseZ - 210, 2500, 0.32, 42, road);
      baseBox("verBaseRoadRadar", baseX, 1.51, baseZ + 430, 1550, 0.34, 34, road);
      baseBox("verBaseRoadLogistics", baseX, 1.51, baseZ - 650, 1800, 0.34, 34, road);

      // A real mainland base needs a supply route. Two restrained road legs
      // connect the south gate to the existing fishing harbour without reading
      // as a runway or cutting across open water.
      const accessRoad = (name, x0, z0, x1, z1) => {
        const dx = x1 - x0;
        const dz = z1 - z0;
        baseBox(
          name,
          (x0 + x1) * 0.5,
          1.47,
          (z0 + z1) * 0.5,
          30,
          0.24,
          Math.hypot(dx, dz),
          road,
          Math.atan2(dx, dz)
        );
      };
      accessRoad("verBaseAccessRoadUpper", baseX, baseZ - 1110, -1600, 4300);
      accessRoad("verBaseAccessRoadHarbour", -1600, 4300, -3050, 3460);

      // A weathered central apron remains low enough for the destructible
      // control-station model to sit cleanly above it.
      baseBox("verBaseCentralApron", baseX, 1.54, baseZ, 610, 0.4, 470, apron);
      for (const [name, ox, oz, width, depth] of targetPads) {
        revetment(name, baseX + ox, baseZ + oz, width, depth);
      }

      // Hardened operations wings flank rather than cover the red control TGT.
      for (const side of [-1, 1]) {
        const x = baseX + side * 205;
        baseBox(`verBaseOpsWing${side < 0 ? "West" : "East"}`, x, 19, baseZ + 5,
          210, 34, 118, bunker, side * 0.035);
        baseBox(`verBaseOpsRoof${side < 0 ? "West" : "East"}`, x, 37, baseZ + 5,
          190, 4, 102, roof, side * 0.035);
        baseBox(`verBaseOpsLink${side < 0 ? "West" : "East"}`, baseX + side * 91, 8, baseZ,
          54, 12, 28, utility);
      }

      // Logistics and maintenance belt. The gaps at x +/-360 preserve the
      // power-plant and fuel-farm target bodies and their gun hitboxes.
      baseBox("verBaseVehicleWorkshop", baseX, 17, baseZ - 650, 190, 30, 90, bunker);
      baseBox("verBaseVehicleWorkshopRoof", baseX, 33, baseZ - 650, 176, 3, 78, roof);
      baseBox("verBaseStoresWest", baseX - 650, 13, baseZ - 500, 150, 23, 72, utility, 0.04);
      baseBox("verBaseStoresEast", baseX + 660, 13, baseZ - 500, 150, 23, 72, utility, -0.04);
      baseBox("verBaseGeneratorAnnex", baseX - 360, 8, baseZ - 655, 94, 13, 45, bunker);
      baseBox("verBaseFuelPumpHouse", baseX + 370, 7, baseZ - 705, 82, 11, 42, bunker);

      // Two partly buried shelters imply underground command and missile
      // storage without introducing terrain deformation or colliders.
      for (const side of [-1, 1]) {
        const x = baseX + side * 1040;
        const z = baseZ + 620;
        baseBox(`verBasePortalApron${side < 0 ? "West" : "East"}`, x, 1.58, z - 95,
          180, 0.45, 210, apron);
        baseBox(`verBasePortalMass${side < 0 ? "West" : "East"}`, x, 15, z,
          230, 27, 120, snowWear);
        baseBox(`verBasePortalMouth${side < 0 ? "West" : "East"}`, x, 13, z - 63,
          116, 22, 9, 0x20272b);
        baseBox(`verBasePortalDoor${side < 0 ? "West" : "East"}`, x, 12, z - 69,
          94, 19, 4, utility);
      }

      // Small unarmed support vehicles: tractors, fuel bowsers, trailers and
      // cargo sleds. They are scenery only, deliberately absent from M11's
      // groundUnits and target-selection lists.
      const supportProps = [
        [-910, -690, 0.12, "Tractor"], [-800, -690, 0.12, "Truck"],
        [-160, -790, -0.04, "Trailer"], [-45, -790, -0.04, "Cargo"],
        [110, -790, 0.02, "Bowser"], [245, -790, 0.02, "Sled"],
        [825, -675, -0.12, "Truck"], [945, -675, -0.12, "Tractor"],
        [-1030, 875, Math.PI / 2, "Cart"], [1030, 860, Math.PI / 2, "Cart"],
        [-180, 690, 0, "Container"], [180, 690, 0, "Container"]
      ];
      supportProps.forEach(([ox, oz, heading, label], index) => {
        const long = label === "Trailer" || label === "Container";
        const bowser = label === "Bowser";
        baseBox(`verBaseSupport${index + 1}${label}`, baseX + ox, 4.1, baseZ + oz,
          long ? 26 : 18, 5.2, long ? 10 : 9, label === "Tractor" ? 0xd1b24b : utility, heading);
        if (bowser) {
          baseCylinder(`verBaseSupport${index + 1}Tank`, baseX + ox, 7.0, baseZ + oz,
            4.0, 11.5, 0xa7afb0);
        }
      });

      // Former weather instrumentation survives as base metrology and beacon
      // masts. They sit between combat pads, not on top of the radar targets.
      const mastSites = [
        [1, -940, -900], [2, 940, -900], [3, -900, 980], [4, 900, 980],
        [5, -250, 850], [6, 250, 850]
      ];
      for (const [index, ox, oz] of mastSites) {
        baseCylinder(`verWeatherMast${index}`, baseX + ox, 42, baseZ + oz, 3.5, 80, 0x6f7e83);
        baseCylinder(`verWeatherLamp${index}`, baseX + ox, 84, baseZ + oz, 8, 5, 0xff7c5b,
          { emissive: 0xff4f35, emissiveIntensity: 2.2 });
      }

      // Wind-scoured snow strips break up the perfectly paved shapes when seen
      // from high altitude, but stay a few centimetres above the road surface.
      for (let i = 0; i < 12; i += 1) {
        const x = baseX - 1130 + i * 205;
        const z = baseZ - 210 + ((i % 3) - 1) * 9;
        baseBox(`verBaseSnowWear${i + 1}`, x, 1.72, z, 105, 0.12, 4 + (i % 4) * 2,
          snowWear, (i % 2 ? 1 : -1) * 0.035, { opacity: 0.72 });
      }

      flushBaseInstances();

      root.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = false;
        node.receiveShadow = true;
      });
    }
  });
}
