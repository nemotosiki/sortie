// DAMAR SEA / WEST RESCUE LANE — Sera M07 BLACK CURRENT.
//
// The stock stormOcean owns the proven foul-weather rendering balance. This
// preset inherits that balance, then adds Damar-specific geography and mission
// landmarks: an offshore navigation platform, a lit rescue corridor, three
// survivor rafts, the black data capsule, SAR helicopters, rain and lightning.
export default function register(ctx) {
  const { WORLD_PRESETS } = ctx.tables;
  const base = WORLD_PRESETS.stormOcean;
  if (!base) throw new Error("[damarSeaStorm] stormOcean base preset is missing");

  const missionAnchors = Object.freeze({
    playerStart: Object.freeze([-3900, -2500]),
    battleCenter: Object.freeze([0, 0]),
    sarFlyingBoatStart: Object.freeze([-3400, 1800]),
    sarFlyingBoatExit: Object.freeze([3000, -2100]),
    patrolStart: Object.freeze([-4500, -3600]),
    patrolExit: Object.freeze([4300, 3500]),
    enemyCapEntry: Object.freeze([3600, -3200]),
    missileBoats: Object.freeze([2300, 600]),
    navigationPlatform: Object.freeze([2450, 2350]),
    rescueSites: Object.freeze([
      Object.freeze({ id: "crown", kind: "survivor", label: "SOS CROWN", at: Object.freeze([-1450, -250]) }),
      Object.freeze({ id: "crew-b", kind: "survivor", label: "SOS CREW B", at: Object.freeze([250, 1350]) }),
      Object.freeze({ id: "crew-c", kind: "survivor", label: "SOS CREW C", at: Object.freeze([1650, -650]) }),
      Object.freeze({ id: "data", kind: "data", label: "DATA CAPSULE", at: Object.freeze([300, -1700]) })
    ])
  });

  ctx.addWorldPreset("damarSeaStorm", {
    ...base,
    label: "DAMAR SEA · BLACK CURRENT",
    sceneryOrigin: Object.freeze([0, 0]),
    previewFocus: Object.freeze([0, 0]),
    previewSheets: Object.freeze({
      rescue: Object.freeze([
        Object.freeze({ label: "CROWN RAFT", position: [-1450, 14, -178], target: [-1450, 1.5, -250] }),
        Object.freeze({ label: "DATA CAPSULE", position: [300, 14, -1628], target: [300, 1.5, -1700] }),
        Object.freeze({ label: "NAV PLATFORM", position: [2450, 72, 2460], target: [2450, 42, 2350] }),
        Object.freeze({ label: "SAR HELICOPTER", position: [-920, 155, 165], target: [-920, 145, 40] })
      ])
    }),
    regionId: "damar_sea",
    sectorIds: Object.freeze(["west_rescue_lane"]),
    variant: "storm_evening_rescue",
    missionAnchors,
    clearColor: 0x343f4e,
    sky: Object.freeze([
      Object.freeze([0, "#0a0f17"]),
      Object.freeze([0.28, "#17202c"]),
      Object.freeze([0.46, "#303b49"]),
      Object.freeze([0.54, "#596777"]),
      Object.freeze([0.7, "#27323e"]),
      Object.freeze([1, "#0b1119"])
    ]),
    atmosphere: {
      ...base.atmosphere,
      seed: 0x44414d07,
      noise: 0.061,
      haze: 0.34,
      thinClouds: 54,
      cloudOpacity: 0.19,
      cloudTint: 0x8797aa
    },
    // Rescue lamps must be findable, but only once the player reaches their
    // sector. This is still the second-tightest visibility band in the game.
    fog: { color: 0x343f4e, near: 520, far: 2900 },
    // No visible disc. The stock storm's dim sun still read as a white ball at
    // rescue altitude; Damar gets its illumination from the overcast and the
    // intermittent lightning instead.
    sun: {
      position: [-1800, 410, -3400],
      color: 0x566578,
      radius: 0.1,
      glare: [
        { scale: 1, color: 0x566578, opacity: 0 },
        { scale: 1, color: 0x566578, opacity: 0 }
      ]
    },
    sunRoad: {
      color: 0x8295aa,
      opacity: 0,
      width: 1,
      length: 1,
      rotationY: -0.48,
      position: [-900, 0.4, -1700]
    },
    ocean: {
      ...base.ocean,
      base: "#07111a",
      bright: "185, 204, 221",
      dark: "1, 5, 10",
      colorContrast: 0.34,
      crestStrength: 0.76,
      roughness: 0.76,
      normalScale: [1.04, 1.28],
      normalSpeed: [0.031, 0.014],
      normalSeed: 0x44414d08
    },
    lights: {
      hemi: { sky: 0x96aac1, ground: 0x070b12, intensity: 1.22 },
      key: { color: 0xa8bdd2, intensity: 0.82, position: [-900, 760, -1500] },
      fill: { color: 0x41566d, intensity: 0.36, position: [700, 260, 900] }
    },
    mountains: {
      ...base.mountains,
      count: 0,
      corridor: null,
      plateau: null
    },
    islands: { count: 0, stone: 0x262e36, green: 0x242e2b },
    clouds: {
      ...base.clouds,
      // Recovery is flown below 460 m. Keep the authored lane readable by
      // dropping the stock arena-centred hero banks and using only a sparse
      // set of procedural low/mid clusters. The high overcast, fog, rain and
      // outer stratus still carry the storm silhouette.
      scale: 0.26,
      hero: false,
      opacity: 0.62,
      texture: { seed: 0x44414d09, contrast: 1.3, underside: 0.78, softness: 1.08 }
    },
    decor: {
      ...base.decor,
      seed: 0x44414d0a,
      keepClear: Object.freeze([{ x: 0, z: 0, r: 7200 }]),
      extraIslands: { count: 0, radius: [0, 0], height: [0, 0], distance: [0, 0] },
      shore: null,
      trees: null,
      rocks: null,
      extraClouds: {
        // Keep the working rescue lane below the ceiling. The first pass put
        // 34 large puff volumes directly over the four sites; at 200–700 m they
        // read as opaque boulders and hid the rafts. Fog, rain and the high deck
        // carry the storm while these stay sparse and mostly outside the lane.
        towers: 3,
        towerSize: [90, 145],
        towerBase: 920,
        stratus: 11,
        stratusSize: [180, 300],
        stratusBase: 1120,
        distance: [2500, 4800]
      }
    }
  });

  ctx.addWorldDecorator("damarSeaRescueLane", {
    worlds: ["damarSeaStorm"],
    build({ THREE, addRoot, keepGeometry, keepMaterial }) {
      const root = new THREE.Group();
      root.name = "damarSeaRescueLane";
      addRoot(root);

      const boxGeometry = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
      const cylinderGeometry = keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 14));
      const sphereGeometry = keepGeometry(new THREE.SphereGeometry(1, 12, 8));
      const torusGeometry = keepGeometry(new THREE.TorusGeometry(1, 0.22, 8, 20));
      const materials = new Map();
      const material = (color, emissive = 0, opacity = 1) => {
        const key = `${color}:${emissive}:${opacity}`;
        if (!materials.has(key)) {
          materials.set(key, keepMaterial(new THREE.MeshStandardMaterial({
            color,
            roughness: 0.76,
            metalness: 0.15,
            emissive,
            emissiveIntensity: emissive ? 1.35 : 0,
            transparent: opacity < 1,
            opacity,
            depthWrite: opacity >= 1
          })));
        }
        return materials.get(key);
      };
      const basic = (color, opacity = 1) => keepMaterial(new THREE.MeshBasicMaterial({
        color,
        transparent: opacity < 1,
        opacity,
        depthWrite: opacity >= 1,
        side: THREE.DoubleSide
      }));
      const put = (parent, geometry, mat, x, y, z, sx, sy, sz, rotation = null) => {
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.position.set(x, y, z);
        mesh.scale.set(sx, sy, sz);
        if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
        parent.add(mesh);
        return mesh;
      };

      // Damar navigation platform: a small fixed point in an otherwise empty
      // black sea, readable by silhouette and by its alternating lane lights.
      const platform = new THREE.Group();
      platform.name = "damarNavigationPlatform";
      platform.position.set(2450, 0, 2350);
      root.add(platform);
      const wetSteel = material(0x45515c);
      const darkSteel = material(0x202a33);
      const safety = material(0xd28b28, 0x5a2a08);
      const deck = material(0x58656d);
      for (const x of [-18, 18]) {
        for (const z of [-18, 18]) put(platform, cylinderGeometry, wetSteel, x, 21, z, 2.8, 22, 2.8);
      }
      put(platform, boxGeometry, deck, 0, 43, 0, 52, 4, 52);
      put(platform, boxGeometry, darkSteel, 0, 49, 2, 24, 9, 20);
      // Leave a real air gap above the equipment room. The old lower face was
      // exactly coplanar with the room roof and shimmered while banking.
      put(platform, boxGeometry, safety, 0, 55.3, 2, 18, 3, 15);
      // Mast starts at the roof and remains continuous through its crossbar.
      put(platform, cylinderGeometry, wetSteel, 0, 78.2, 2, 1.6, 28.2, 1.6);
      put(platform, boxGeometry, wetSteel, 0, 76, 2, 24, 0.8, 0.8);
      const platformLamp = put(platform, sphereGeometry, basic(0xffd477), 0, 107, 2, 2.8, 2.8, 2.8);
      const platformLight = new THREE.PointLight(0xffc15a, 0, 720, 1.7);
      platformLight.position.set(0, 107, 2);
      platform.add(platformLight);
      // Windows and perimeter rails give the otherwise simple silhouette a
      // believable working scale without laying coplanar decals on the walls.
      const windowMaterial = material(0x82c9df, 0x123c4b);
      for (const x of [-8, 0, 8]) put(platform, boxGeometry, windowMaterial, x, 49, -8.3, 2.3, 2.1, 0.34);
      for (const z of [-21, 21]) {
        put(platform, boxGeometry, wetSteel, -25, 48, z, 0.55, 6, 0.55);
        put(platform, boxGeometry, wetSteel, 25, 48, z, 0.55, 6, 0.55);
        put(platform, boxGeometry, wetSteel, 0, 51, z, 50, 0.42, 0.42);
      }

      // Shipping-lane lights give the player an east/west axis even when the
      // horizon and compass reference disappear inside the cloud deck.
      const laneLights = [];
      const laneMarkers = [];
      for (let i = -4; i <= 4; i += 1) {
        const lane = new THREE.Group();
        lane.position.set(i * 780, 0, 3000 + Math.sin(i * 0.9) * 150);
        lane.userData.baseY = 0;
        lane.userData.phase = i * 0.61;
        root.add(lane);
        // The buoy body now meets the water instead of floating two metres
        // above it. Lamp and body remain separated, so no two faces coincide.
        put(lane, cylinderGeometry, material(0x2b343b), 0, 1.7, 0, 2.2, 3.4, 2.2);
        put(lane, sphereGeometry, basic(i % 2 ? 0x6dffb2 : 0xff7a5e), 0, 6.2, 0, 1.55, 1.55, 1.55);
        const lamp = new THREE.PointLight(i % 2 ? 0x58ffac : 0xff6a52, 0, 280, 2);
        lamp.position.y = 6.2;
        lane.add(lamp);
        laneLights.push(lamp);
        laneMarkers.push(lane);
      }

      const siteLights = [];
      const animatedSites = [];
      const rescueSite = ({ id, kind, at }, index) => {
        const site = new THREE.Group();
        site.name = `m07-site-${id}`;
        site.position.set(at[0], 0.12, at[1]);
        site.userData.baseY = 0.12;
        site.userData.phase = index * 0.87;
        root.add(site);
        const isData = kind === "data";
        if (isData) {
          // A low, half-submerged recorder canister. The previous 7.6 m
          // diameter cylinder floated above the surface and intersected a
          // long box along almost the same faces, producing obvious shimmer.
          put(site, cylinderGeometry, material(0x080a0d, 0x010203), 0, 1.1, 0, 1.8, 5.6, 1.8, [Math.PI / 2, 0, 0.34]);
          put(site, torusGeometry, material(0x315365, 0x0b2733), 0, 1.12, 0, 2.05, 2.05, 0.75, [Math.PI / 2, 0, 0.34]);
          put(site, boxGeometry, material(0x26313a), 0, 2.85, 0, 1.2, 0.42, 1.2, [0, 0.34, 0]);
        } else {
          put(site, torusGeometry, material(0xee6b2b, 0x6a1804), 0, 0.72, 0, 6.4, 6.4, 1.6, [Math.PI / 2, 0, 0]);
          put(site, boxGeometry, material(0xb73524), 0, 0.86, 0, 5.8, 0.56, 2.5);
          for (const side of [-1, 1]) put(site, sphereGeometry, material(0xf19a49), side * 1.9, 1.55, 0, 0.7, 0.7, 0.7);
        }
        put(site, cylinderGeometry, darkSteel, 0, 4.1, 0, 0.42, 6.4, 0.42);
        const lampColor = isData ? 0x68dfff : 0xffde72;
        put(site, sphereGeometry, basic(lampColor), 0, 7.5, 0, 1.55, 1.55, 1.55);
        const lamp = new THREE.PointLight(lampColor, 0, isData ? 620 : 520, 1.5);
        lamp.position.y = 7.5;
        site.add(lamp);
        siteLights.push({ lamp, site, phase: index * 0.73, isData });
        animatedSites.push(site);
      };
      missionAnchors.rescueSites.forEach(rescueSite);

      // Two hovering SAR helicopters make the rescue operation visible before
      // the player reaches a pickup sphere. They are scenery here; the moving,
      // vulnerable rescue aircraft are mission friendlies owned by the host.
      const rotors = [];
      const helicopters = [];
      const addSarHelicopter = (name, x, y, z, yaw) => {
        const heli = new THREE.Group();
        heli.name = name;
        heli.position.set(x, y, z);
        heli.rotation.y = yaw;
        heli.userData.baseY = y;
        heli.userData.phase = helicopters.length * 1.7;
        root.add(heli);
        const white = material(0xdfe8eb);
        const orange = material(0xe85c27, 0x541302);
        // Opaque glass and a solid two-blade rotor avoid transparent-surface
        // sorting flashes. The old paper-thin translucent rotor disc was the
        // most visible flicker when the player crossed beneath a helicopter.
        const glass = material(0x18303c, 0x07151c);
        put(heli, sphereGeometry, white, 0, 0, 0, 4.2, 2.2, 6.3);
        put(heli, sphereGeometry, glass, 0, 0.55, -4.4, 3.05, 1.4, 2.05);
        put(heli, boxGeometry, orange, 0, -2.02, -0.2, 5.8, 0.3, 3.1);
        put(heli, boxGeometry, white, 0, -0.1, 7.2, 1.8, 1.5, 9.2);
        put(heli, boxGeometry, orange, 0, 0.45, 11.2, 0.65, 4.2, 2.4);
        put(heli, cylinderGeometry, darkSteel, 0, 3.05, 0, 0.48, 1.7, 0.48);
        for (const side of [-1, 1]) {
          put(heli, boxGeometry, darkSteel, side * 3.35, -2.65, -0.2, 0.32, 0.32, 7.8);
          put(heli, boxGeometry, darkSteel, side * 3.35, -1.75, -2.1, 0.22, 1.9, 0.22, [0, 0, side * 0.32]);
          put(heli, boxGeometry, darkSteel, side * 3.35, -1.75, 2.0, 0.22, 1.9, 0.22, [0, 0, side * 0.32]);
        }
        put(heli, boxGeometry, material(0xc6d4db), 0, 0.45, 12.48, 0.16, 6.2, 0.54);
        put(heli, boxGeometry, material(0xc6d4db), 0, 0.45, 12.48, 3.6, 0.16, 0.54);
        const rotor = new THREE.Group();
        rotor.position.y = 4.05;
        heli.add(rotor);
        put(rotor, boxGeometry, material(0xb8c8d2), 0, 0, 0, 22, 0.12, 0.58);
        put(rotor, sphereGeometry, darkSteel, 0, 0.2, 0, 0.72, 0.42, 0.72);
        rotors.push(rotor);
        const searchLight = new THREE.SpotLight(0xdaf2ff, 4.2, 900, 0.22, 0.7, 1.2);
        searchLight.position.set(0, -1.2, -3);
        searchLight.target.position.set(0, -170, -40);
        heli.add(searchLight, searchLight.target);
        helicopters.push(heli);
      };
      addSarHelicopter("damarSarHelicopter1", -920, 145, 40, -0.6);
      addSarHelicopter("damarSarHelicopter2", 900, 175, 770, 2.2);

      // Wind-driven rain. Geometry belongs to the world and the tiny host hook
      // calls root.userData.worldTick; no global scene resource survives a swap.
      let rainSeed = 0x44414d0b >>> 0;
      const rand = () => {
        rainSeed = Math.imul(rainSeed ^ (rainSeed >>> 15), 2246822519) >>> 0;
        rainSeed = Math.imul(rainSeed ^ (rainSeed >>> 13), 3266489917) >>> 0;
        return ((rainSeed ^= rainSeed >>> 16) >>> 0) / 4294967296;
      };
      const rainCount = 760;
      const rainPositions = new Float32Array(rainCount * 6);
      for (let i = 0; i < rainCount; i += 1) {
        const x = (rand() - 0.5) * 2800;
        const y = (rand() - 0.5) * 1300;
        const z = (rand() - 0.5) * 2800;
        const at = i * 6;
        rainPositions[at] = x;
        rainPositions[at + 1] = y;
        rainPositions[at + 2] = z;
        rainPositions[at + 3] = x - 18;
        rainPositions[at + 4] = y - 54;
        rainPositions[at + 5] = z + 8;
      }
      const rainGeometry = keepGeometry(new THREE.BufferGeometry());
      rainGeometry.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
      const rainMaterial = keepMaterial(new THREE.LineBasicMaterial({
        color: 0xb8d1e3,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        fog: true
      }));
      const rain = new THREE.LineSegments(rainGeometry, rainMaterial);
      rain.name = "damarStormRain";
      rain.frustumCulled = false;
      root.add(rain);

      const lightningGeometry = keepGeometry(new THREE.BufferGeometry());
      lightningGeometry.setAttribute("position", new THREE.Float32BufferAttribute([
        0, 1250, 0, 70, 1000, 35,
        70, 1000, 35, 10, 790, 80,
        10, 790, 80, 115, 560, 135,
        115, 560, 135, 70, 360, 180
      ], 3));
      const lightningMaterial = keepMaterial(new THREE.LineBasicMaterial({
        color: 0xeaf6ff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: true
      }));
      const lightning = new THREE.LineSegments(lightningGeometry, lightningMaterial);
      lightning.name = "damarLightningBolt";
      lightning.position.set(-900, 0, -1450);
      root.add(lightning);
      const lightningLight = new THREE.PointLight(0xd8ecff, 0, 5200, 1.1);
      lightningLight.position.set(-900, 680, -1450);
      root.add(lightningLight);

      root.userData.worldTick = ({ camera, dt, time }) => {
        rain.position.x = camera.position.x;
        rain.position.y = camera.position.y;
        rain.position.z = camera.position.z;
        const attr = rainGeometry.getAttribute("position");
        const values = attr.array;
        const fall = Math.min(80, dt * 620);
        const drift = Math.min(24, dt * 115);
        for (let i = 0; i < values.length; i += 6) {
          values[i] -= drift;
          values[i + 1] -= fall;
          values[i + 3] -= drift;
          values[i + 4] -= fall;
          if (values[i + 1] < -650) {
            values[i + 1] += 1300;
            values[i + 4] += 1300;
          }
          if (values[i] < -1400) {
            values[i] += 2800;
            values[i + 3] += 2800;
          }
        }
        attr.needsUpdate = true;

        for (const rotor of rotors) rotor.rotation.y = (rotor.rotation.y + dt * 22) % (Math.PI * 2);
        for (const lane of laneMarkers) {
          lane.position.y = lane.userData.baseY + Math.sin(time * 0.72 + lane.userData.phase) * 0.18;
          lane.rotation.z = Math.sin(time * 0.55 + lane.userData.phase) * 0.018;
        }
        for (const site of animatedSites) {
          site.position.y = site.userData.baseY + Math.sin(time * 0.8 + site.userData.phase) * 0.14;
          site.rotation.z = Math.sin(time * 0.61 + site.userData.phase) * 0.012;
        }
        for (const heli of helicopters) {
          heli.position.y = heli.userData.baseY + Math.sin(time * 0.74 + heli.userData.phase) * 2.2;
          heli.rotation.z = Math.sin(time * 0.53 + heli.userData.phase) * 0.014;
        }
        const lanePulse = 0.55 + Math.max(0, Math.sin(time * 2.1)) * 1.7;
        laneLights.forEach((lamp, index) => { lamp.intensity = lanePulse * (index % 2 ? 0.8 : 1); });
        const platformPulse = 0.25 + Math.max(0, Math.sin(time * 3.4)) * 2.2;
        platformLight.intensity = platformPulse;
        platformLamp.scale.setScalar(0.82 + platformPulse * 0.08);
        for (const item of siteLights) {
          if (!item.site.visible) continue;
          const pulse = Math.max(0, Math.sin(time * (item.isData ? 4.8 : 3.2) + item.phase));
          item.lamp.intensity = 0.45 + pulse * (item.isData ? 5.4 : 4.2);
        }

        // A deterministic 13-second cell: two sharp flashes, then darkness.
        const phase = time % 13;
        const flash = phase < 0.08 ? 1 : (phase > 0.19 && phase < 0.28 ? 0.62 : 0);
        lightningMaterial.opacity = flash * 0.92;
        lightningLight.intensity = flash * 10;
        lightning.position.x = camera.position.x - 900;
        lightning.position.z = camera.position.z - 1450;
        lightningLight.position.x = lightning.position.x;
        lightningLight.position.z = lightning.position.z;
      };
    }
  });
}
