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
      scale: 0.72,
      hero: false,
      opacity: 0.76,
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
      const rotorGeometry = keepGeometry(new THREE.CylinderGeometry(1, 1, 0.035, 28));
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
      const wetSteel = material(0x303942);
      const darkSteel = material(0x111820);
      const safety = material(0xd28b28, 0x5a2a08);
      const deck = material(0x3e4b54);
      for (const x of [-18, 18]) {
        for (const z of [-18, 18]) put(platform, cylinderGeometry, wetSteel, x, 21, z, 2.8, 22, 2.8);
      }
      put(platform, boxGeometry, deck, 0, 43, 0, 52, 4, 52);
      put(platform, boxGeometry, darkSteel, 0, 49, 2, 24, 9, 20);
      put(platform, boxGeometry, safety, 0, 55, 2, 18, 3, 15);
      put(platform, cylinderGeometry, wetSteel, 0, 78, 2, 1.6, 25, 1.6);
      put(platform, boxGeometry, wetSteel, 0, 72, 2, 24, 0.8, 0.8);
      const platformLamp = put(platform, sphereGeometry, basic(0xffd477), 0, 104, 2, 2.8, 2.8, 2.8);
      const platformLight = new THREE.PointLight(0xffc15a, 0, 720, 1.7);
      platformLight.position.set(0, 104, 2);
      platform.add(platformLight);

      // Shipping-lane lights give the player an east/west axis even when the
      // horizon and compass reference disappear inside the cloud deck.
      const laneLights = [];
      for (let i = -4; i <= 4; i += 1) {
        const lane = new THREE.Group();
        lane.position.set(i * 780, 0, 3000 + Math.sin(i * 0.9) * 150);
        root.add(lane);
        put(lane, cylinderGeometry, material(0x2b343b), 0, 3.8, 0, 2.2, 3.8, 2.2);
        put(lane, sphereGeometry, basic(i % 2 ? 0x6dffb2 : 0xff7a5e), 0, 9.5, 0, 2.1, 2.1, 2.1);
        const lamp = new THREE.PointLight(i % 2 ? 0x58ffac : 0xff6a52, 0, 280, 2);
        lamp.position.y = 10;
        lane.add(lamp);
        laneLights.push(lamp);
      }

      const siteLights = [];
      const rescueSite = ({ id, kind, at }, index) => {
        const site = new THREE.Group();
        site.name = `m07-site-${id}`;
        site.position.set(at[0], 0.9, at[1]);
        root.add(site);
        const isData = kind === "data";
        if (isData) {
          put(site, cylinderGeometry, material(0x07090c), 0, 2.2, 0, 3.8, 8.5, 3.8, [Math.PI / 2, 0, 0.34]);
          put(site, boxGeometry, material(0x1d252d), 0, 2.4, 0, 8.8, 1.1, 1.1, [0, 0.34, 0]);
        } else {
          put(site, torusGeometry, material(0xee6b2b, 0x6a1804), 0, 1.8, 0, 7.2, 7.2, 2.2, [Math.PI / 2, 0, 0]);
          put(site, boxGeometry, material(0xb73524), 0, 2.2, 0, 7.2, 0.8, 3.0);
          for (const side of [-1, 1]) put(site, sphereGeometry, material(0xf19a49), side * 2.2, 3, 0, 0.75, 0.75, 0.75);
        }
        put(site, cylinderGeometry, darkSteel, 0, 8.5, 0, 0.42, 7.5, 0.42);
        const lampColor = isData ? 0x68dfff : 0xffde72;
        put(site, sphereGeometry, basic(lampColor), 0, 16.5, 0, 1.8, 1.8, 1.8);
        const lamp = new THREE.PointLight(lampColor, 0, isData ? 620 : 520, 1.5);
        lamp.position.y = 17;
        site.add(lamp);
        siteLights.push({ lamp, site, phase: index * 0.73, isData });
      };
      missionAnchors.rescueSites.forEach(rescueSite);

      // Two hovering SAR helicopters make the rescue operation visible before
      // the player reaches a pickup sphere. They are scenery here; the moving,
      // vulnerable rescue aircraft are mission friendlies owned by the host.
      const rotors = [];
      const addSarHelicopter = (name, x, y, z, yaw) => {
        const heli = new THREE.Group();
        heli.name = name;
        heli.position.set(x, y, z);
        heli.rotation.y = yaw;
        root.add(heli);
        const white = material(0xdfe8eb);
        const orange = material(0xe85c27, 0x541302);
        const glass = material(0x18303c, 0x07151c, 0.86);
        put(heli, sphereGeometry, white, 0, 0, 0, 4.5, 2.5, 7.2);
        put(heli, sphereGeometry, glass, 0, 0.7, -4.9, 3.4, 1.7, 2.5);
        put(heli, boxGeometry, orange, 0, -0.3, 4.5, 2.2, 2.2, 10);
        put(heli, boxGeometry, white, 0, 0, 9.4, 0.7, 4.4, 3.2);
        put(heli, boxGeometry, orange, 0, -0.5, -0.5, 13, 0.7, 3.4);
        const rotor = put(heli, rotorGeometry, basic(0xc7d6df, 0.18), 0, 4.3, 0, 11.5, 0.5, 11.5);
        rotors.push(rotor);
        const searchLight = new THREE.SpotLight(0xdaf2ff, 4.2, 900, 0.22, 0.7, 1.2);
        searchLight.position.set(0, -1.2, -3);
        searchLight.target.position.set(0, -170, -40);
        heli.add(searchLight, searchLight.target);
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

        for (const rotor of rotors) rotor.rotation.y += dt * 22;
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
