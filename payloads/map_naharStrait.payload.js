// NAHAR STRAIT (`naharStrait`) — Sera M04's sunset fleet-interdiction map.
//
// This payload is deliberately independent of the M03 campaign-key migration.
// It adds a new world and decorator only; no mission table or persistence state
// is touched. Mission code can consume `missionAnchors` once `sera-m03` is the
// stable predecessor on the main Sera branch.
export default function register(ctx) {
  const { WORLD_PRESETS } = ctx.tables;
  const base = WORLD_PRESETS.sunsetOcean;
  if (!base) throw new Error("[naharStrait] sunsetOcean base preset is missing");

  const missionAnchors = Object.freeze({
    alliedFleet: Object.freeze([-9000, 0]),
    playerStart: Object.freeze([-7200, -4200]),
    centralBridge: Object.freeze([0, 0]),
    elemFleetEntry: Object.freeze([11500, 0]),
    landingBreachLineX: -6500,
    northEastCapEntry: Object.freeze([8500, 7000]),
    southEastStrikeEntry: Object.freeze([9500, -7500])
  });
  // One source of truth for rendering, collision and waterfront placement.
  // The narrow 800 m half-channel at x=0 is intentional: M04's fleet route
  // remains beneath the bridge, while the outer strait opens to 5.2 km.
  const northCoastProfile = Object.freeze([
    Object.freeze([-16000, 2600]), Object.freeze([-6500, 2500]),
    Object.freeze([-3200, 2200]), Object.freeze([-1500, 1500]),
    Object.freeze([-600, 940]), Object.freeze([0, 800]),
    Object.freeze([600, 940]), Object.freeze([1500, 1500]),
    Object.freeze([3200, 2200]), Object.freeze([6500, 2500]),
    Object.freeze([16000, 2600])
  ]);
  const southCoastProfile = Object.freeze(
    northCoastProfile.map(([x, z]) => Object.freeze([x, -z]))
  );

  ctx.addWorldPreset("naharStrait", {
    ...base,
    label: "NAHAR STRAIT",
    sceneryOrigin: [0, 0],
    previewFocus: [0, 0],
    previewSheets: Object.freeze({
      infrastructure: Object.freeze([
        Object.freeze({ label: "ROAD NETWORK", position: [0, 6800, 5400], target: [0, 34, 4700] }),
        Object.freeze({ label: "BRIDGE JOIN", position: [-1900, 720, 3000], target: [0, 54, 1500] }),
        Object.freeze({ label: "PORT ACCESS", position: [-11900, 620, 4400], target: [-10500, 34, 2700] }),
        Object.freeze({ label: "PREFAB BLOCK", position: [4700, 430, 5000], target: [5700, 75, 4050] })
      ])
    }),
    regionId: "nahar_strait",
    sectorIds: Object.freeze(["west_interdiction", "east_breakthrough"]),
    variant: "sunset_clear",
    missionAnchors,
    clearColor: 0x9d7059,
    sky: [
      [0, "#101b3a"],
      [0.25, "#29345c"],
      [0.43, "#98504d"],
      [0.5, "#ffc17a"],
      [0.6, "#b85e52"],
      [1, "#33233d"]
    ],
    atmosphere: {
      ...base.atmosphere,
      seed: 0x4e414801,
      noise: 0.012,
      haze: 0.11,
      thinClouds: 9,
      cloudOpacity: 0.04,
      cloudBand: [0.34, 0.6],
      cloudTint: 0xffc09a
    },
    // The whole 32 km strait must remain readable. M04 opens with the player
    // about 19.2km from the landing group: 5.2/20.5km left those hulls only 9%
    // visible even after the old 7km clip plane was removed. A 12/40km band
    // keeps sunset depth while leaving that first contact roughly 74% visible.
    fog: { color: 0x9d7059, near: 12000, far: 40000 },
    // West is -X on this authored map. Looking east silhouettes the incoming
    // Elem ships against the last warm light without putting glare over HUD.
    sun: {
      position: [-7800, 1450, -850],
      color: 0xffb46d,
      radius: 132,
      glare: [
        { scale: 2200, color: 0xff9b54, opacity: 0.62 },
        { scale: 660, color: 0xffdfb2, opacity: 0.9 }
      ]
    },
    sunRoad: {
      color: 0xff9f55,
      opacity: 0.46,
      width: 1100,
      length: 8800,
      rotationY: Math.PI * 0.5,
      position: [-4200, 0.4, 0]
    },
    ocean: {
      ...base.ocean,
      base: "#123b49",
      bright: "245, 166, 110",
      dark: "5, 28, 39",
      repeat: 22,
      roughness: 0.39,
      normalRepeat: 30,
      normalScale: [0.2, 0.27],
      normalSpeed: [0.011, 0.0025],
      normalSeed: 0x4e414802
    },
    terrain: {
      ...base.terrain,
      seed: 0x4e414803,
      sand: 0xa18461,
      grass: 0x4b593d,
      rock: 0x5e594f,
      peak: 0x716958,
      snow: 0xd9c6b2,
      textureProfile: "grassland",
      fineRepeat: 22,
      macroRepeat: 3.1,
      normalRepeat: 25,
      normalStrength: 0.24,
      normalFade: [260, 2200],
      rockSlope: [0.42, 0.82],
      shoreHeight: 0.1
    },
    // Both banks are real gameplay terrain. The older decorator capes looked
    // solid but were invisible to aircraft, AI and ground-placement sampling.
    // Broad relief starts behind all mission anchors and city infrastructure,
    // giving the horizon depth without perturbing the fleet corridor.
    continentalSheets: Object.freeze([
      Object.freeze({
        width: 96000,
        depth: 60000,
        centerX: 0,
        coastZ: 2600,
        coastPoints: northCoastProfile,
        inlandSign: 1,
        beachDepth: 300,
        height: 34,
        terrainHeightScale: 190,
        segments: 384,
        inlandSegments: 32,
        uvWorldScale: 7600,
        relief: Object.freeze({
          height: 96, start: 10200, fade: 2400,
          waveX: 11200, waveZ: 8600, diagonal: 17400,
          phaseX: 0.4, phaseZ: 1.2
        })
      }),
      Object.freeze({
        width: 96000,
        depth: 60000,
        centerX: 0,
        coastZ: -2600,
        coastPoints: southCoastProfile,
        inlandSign: -1,
        beachDepth: 300,
        height: 34,
        terrainHeightScale: 210,
        segments: 384,
        inlandSegments: 32,
        uvWorldScale: 7600,
        relief: Object.freeze({
          height: 112, start: 10200, fade: 2600,
          waveX: 12600, waveZ: 9400, diagonal: 16600,
          phaseX: 1.7, phaseZ: 0.25
        })
      })
    ]),
    lights: {
      hemi: { sky: 0xf1b386, ground: 0x252432, intensity: 1.62 },
      key: { color: 0xffad66, intensity: 2.5, position: [-3200, 980, -350] },
      fill: { color: 0x6f78a8, intensity: 0.55, position: [2400, 300, 1100] }
    },
    // Random terrain stays disabled; the signed continental sheets above own
    // the exact 4–5 km channel and 1.6 km bridge throat deterministically.
    mountains: {
      ...base.mountains,
      count: 0,
      corridor: null,
      plateau: null
    },
    islands: { count: 0, stone: 0x585248, green: 0x4c563d },
    clouds: {
      ...base.clouds,
      scale: 1.1,
      hero: false,
      opacity: 0.58,
      texture: { seed: 0x4e414804, contrast: 1.04, underside: 0.44, softness: 1.05 }
    },
    decor: {
      ...base.decor,
      seed: 0x4e414805,
      keepClear: [{ x: 0, z: 0, r: 17000 }],
      extraIslands: { count: 0, radius: [0, 0], height: [0, 0], distance: [0, 0] },
      shore: null,
      trees: null,
      harbour: null,
      rocks: null,
      extraClouds: {
        towers: 2,
        towerSize: [80, 130],
        towerBase: 1200,
        stratus: 7,
        stratusSize: [240, 400],
        stratusBase: 1900,
        distance: [4200, 11000]
      }
    }
  });

  ctx.addWorldDecorator("naharStraitWorks", {
    worlds: ["naharStrait"],
    build({ THREE, addRoot, keepGeometry, keepMaterial, keepTexture, surfaceHeightAt }) {
      const root = new THREE.Group();
      root.name = "naharStraitWorks";
      addRoot(root);

      const boxGeometry = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
      const cylinderGeometry = keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 14));
      const materials = new Map();
      const material = (color, options = {}) => {
        const key = `${color}:${options.emissive || 0}:${options.opacity ?? 1}`;
        if (!materials.has(key)) {
          materials.set(key, keepMaterial(new THREE.MeshStandardMaterial({
            color,
            roughness: options.roughness ?? 0.84,
            metalness: options.metalness ?? 0.03,
            emissive: options.emissive || 0,
            emissiveIntensity: options.emissive ? 1.25 : 0,
            transparent: (options.opacity ?? 1) < 1,
            opacity: options.opacity ?? 1,
            depthWrite: (options.opacity ?? 1) >= 1
          })));
        }
        return materials.get(key);
      };
      const box = (x, y, z, sx, sy, sz, color, rotation = [0, 0, 0], options) => {
        const mesh = new THREE.Mesh(boxGeometry, material(color, options));
        mesh.position.set(x, y, z);
        mesh.scale.set(sx, sy, sz);
        mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
        root.add(mesh);
        return mesh;
      };
      const cylinder = (x, y, z, radius, height, color, options) => {
        const mesh = new THREE.Mesh(cylinderGeometry, material(color, options));
        mesh.position.set(x, y, z);
        mesh.scale.set(radius, height, radius);
        root.add(mesh);
        return mesh;
      };
      const beam = (from, to, thickness, color, options) => {
        const a = new THREE.Vector3(...from);
        const b = new THREE.Vector3(...to);
        const direction = b.clone().sub(a);
        const length = direction.length();
        const mesh = box(0, 0, 0, thickness, thickness, length, color, [0, 0, 0], options);
        mesh.position.copy(a).add(b).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.normalize());
        return mesh;
      };

      // The capes cover more than 400 square kilometres. A few individual
      // boxes read as debris at that scale, so the inhabited landscape is
      // built in batches: one draw call for roughly 1,100 buildings, one for
      // fields, one for roads, and a handful for port furniture. Canvas-made
      // wall/roof textures give the low pass real surface detail without an
      // external asset or a request at runtime.
      let citySeed = 0x4e414806 >>> 0;
      const rand = () => {
        citySeed = (citySeed + 0x6d2b79f5) >>> 0;
        let value = Math.imul(citySeed ^ (citySeed >>> 15), citySeed | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
      };
      const canvasTexture = (label, size, paint) => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        paint(context, size);
        const texture = keepTexture(new THREE.CanvasTexture(canvas), label, size * size * 4);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = 4;
        if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
      };
      const makeBuildingTextures = () => {
        let textureSeed = 0x4e414807 >>> 0;
        const textureRand = () => {
          textureSeed = Math.imul(textureSeed ^ (textureSeed >>> 15), 2246822519) >>> 0;
          textureSeed = Math.imul(textureSeed ^ (textureSeed >>> 13), 3266489917) >>> 0;
          return ((textureSeed ^= textureSeed >>> 16) >>> 0) / 4294967296;
        };
        const litWindows = [];
        const wall = canvasTexture("naharBuildingWalls", 128, (context, size) => {
          const gradient = context.createLinearGradient(0, 0, size, 0);
          gradient.addColorStop(0, "#747c79");
          gradient.addColorStop(0.48, "#a49b88");
          gradient.addColorStop(1, "#6b7372");
          context.fillStyle = gradient;
          context.fillRect(0, 0, size, size);
          for (let i = 0; i < 340; i += 1) {
            const tone = 82 + Math.floor(textureRand() * 44);
            context.fillStyle = `rgba(${tone},${tone + 2},${tone},${0.08 + textureRand() * 0.1})`;
            context.fillRect(textureRand() * size, textureRand() * size, 1 + textureRand() * 3, 1 + textureRand() * 8);
          }
          for (let row = 0; row < 10; row += 1) {
            for (let col = 0; col < 7; col += 1) {
              const x = 6 + col * 18;
              const y = 6 + row * 12;
              const lit = textureRand() > 0.54;
              context.fillStyle = lit ? (textureRand() > 0.32 ? "#f0b56d" : "#b7d3d5") : "#202a2c";
              context.fillRect(x, y, 9, 5);
              context.fillStyle = "rgba(255,255,255,0.13)";
              context.fillRect(x + 1, y + 1, 7, 1);
              if (lit) litWindows.push([x, y]);
            }
          }
        });
        const emissive = canvasTexture("naharBuildingWindows", 128, (context, size) => {
          context.fillStyle = "#000000";
          context.fillRect(0, 0, size, size);
          for (const [x, y] of litWindows) {
            context.fillStyle = "#ffb55c";
            context.fillRect(x, y, 9, 5);
          }
        });
        const roof = canvasTexture("naharBuildingRoofs", 128, (context, size) => {
          context.fillStyle = "#5c6260";
          context.fillRect(0, 0, size, size);
          for (let y = 0; y < size; y += 16) {
            context.fillStyle = y % 32 ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.08)";
            context.fillRect(0, y, size, 2);
          }
          for (let i = 0; i < 42; i += 1) {
            const shade = 68 + Math.floor(textureRand() * 38);
            context.fillStyle = `rgb(${shade},${shade + 3},${shade + 2})`;
            context.fillRect(textureRand() * size, textureRand() * size, 4 + textureRand() * 11, 3 + textureRand() * 8);
          }
        });
        return { wall, emissive, roof };
      };
      const makeOfficeTextures = () => {
        let officeSeed = 0x4e414809 >>> 0;
        const officeRand = () => {
          officeSeed = Math.imul(officeSeed ^ (officeSeed >>> 15), 2246822519) >>> 0;
          officeSeed = Math.imul(officeSeed ^ (officeSeed >>> 13), 3266489917) >>> 0;
          return ((officeSeed ^= officeSeed >>> 16) >>> 0) / 4294967296;
        };
        const lit = [];
        const wall = canvasTexture("naharOfficeWalls", 128, (context, size) => {
          context.fillStyle = "#687377";
          context.fillRect(0, 0, size, size);
          for (let row = 0; row < 24; row += 1) {
            context.fillStyle = row % 4 === 0 ? "rgba(24,29,31,0.52)" : "rgba(13,18,21,0.25)";
            context.fillRect(0, row * 5 + 3, size, 1);
            for (let col = 0; col < 14; col += 1) {
              const x = 3 + col * 9;
              const y = 1 + row * 5;
              const glowing = officeRand() > 0.6;
              context.fillStyle = glowing ? "#dca76b" : (col % 3 ? "#263238" : "#31434a");
              context.fillRect(x, y, 6, 3);
              if (glowing) lit.push([x, y]);
            }
          }
          const sheen = context.createLinearGradient(0, 0, size, 0);
          sheen.addColorStop(0, "rgba(255,255,255,0)");
          sheen.addColorStop(0.62, "rgba(255,197,142,0.16)");
          sheen.addColorStop(1, "rgba(255,255,255,0)");
          context.fillStyle = sheen;
          context.fillRect(0, 0, size, size);
        });
        const emissive = canvasTexture("naharOfficeWindows", 128, (context, size) => {
          context.fillStyle = "#000";
          context.fillRect(0, 0, size, size);
          context.fillStyle = "#ffb569";
          for (const [x, y] of lit) context.fillRect(x, y, 6, 3);
        });
        return { wall, emissive };
      };
      const addInstancedBoxes = (name, entries, batchMaterial, geometry = boxGeometry) => {
        if (!entries.length) return null;
        const instances = new THREE.InstancedMesh(geometry, batchMaterial, entries.length);
        instances.name = name;
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        const euler = new THREE.Euler();
        const tint = new THREE.Color();
        entries.forEach((entry, index) => {
          euler.set(0, entry.yaw || 0, 0);
          quaternion.setFromEuler(euler);
          position.set(entry.x, entry.y, entry.z);
          scale.set(entry.sx, entry.sy, entry.sz);
          instances.setMatrixAt(index, matrix.compose(position, quaternion, scale));
          if (entry.color !== undefined) {
            tint.setHex(entry.color);
            instances.setColorAt(index, tint);
          }
        });
        instances.instanceMatrix.needsUpdate = true;
        if (instances.instanceColor) instances.instanceColor.needsUpdate = true;
        instances.castShadow = false;
        instances.receiveShadow = true;
        instances.userData.instanceCount = entries.length;
        root.add(instances);
        return instances;
      };

      // High cloud sheets use a small procedural FBM shader instead of the
      // old hard-edged sphere silhouette. The existing volumetric puffs remain
      // for fly-through depth; these translucent layers supply ragged anvils,
      // soft holes and slow wind drift across the sunset.
      const cloudGeometry = keepGeometry(new THREE.PlaneGeometry(1, 1));
      const cloudVertex = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `;
      const cloudFragment = `
        precision highp float;
        varying vec2 vUv;
        uniform float uTime;
        uniform float uSeed;
        uniform float uOpacity;
        float hash21(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed) * 43758.5453);
        }
        float noise21(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
            mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0)), f.x), f.y);
        }
        float fbm21(vec2 p) {
          float value = 0.0;
          float amp = 0.55;
          for (int i = 0; i < 5; i++) {
            value += amp * noise21(p);
            p = p * 2.07 + vec2(13.1, 7.9);
            amp *= 0.47;
          }
          return value;
        }
        void main() {
          vec2 centred = vUv * 2.0 - 1.0;
          vec2 drift = vec2(uTime * 0.010, uTime * 0.0025);
          float body = fbm21(vUv * vec2(4.2, 7.0) + drift + uSeed);
          float detail = fbm21(vUv * vec2(11.0, 8.0) - drift * 0.7 + uSeed * 2.0);
          float edge = smoothstep(1.0, 0.54, length(centred * vec2(0.78, 1.22)));
          float density = smoothstep(0.48, 0.72, body * 0.77 + detail * 0.23) * edge;
          if (density < 0.012) discard;
          vec3 shade = mix(vec3(0.47, 0.39, 0.43), vec3(1.0, 0.73, 0.57),
            smoothstep(0.45, 0.9, body + vUv.y * 0.16));
          gl_FragColor = vec4(shade, density * uOpacity);
        }
      `;
      const cloudSheets = [
        [-10300, 2450, -5200, 5200, 1850, 0.31, 1.0],
        [-4600, 2850, 6100, 4300, 1500, -0.18, 2.7],
        [1800, 2550, -6900, 5000, 1700, 0.12, 4.3],
        [7200, 3050, 5200, 5700, 1750, -0.28, 6.1],
        [11400, 2350, -3800, 3900, 1350, 0.22, 8.4]
      ];
      for (const [x, y, z, width, depth, yaw, seed] of cloudSheets) {
        const uniforms = {
          uTime: { value: 0 },
          uSeed: { value: seed },
          uOpacity: { value: 0.48 }
        };
        const cloudMaterial = keepMaterial(new THREE.ShaderMaterial({
          uniforms,
          vertexShader: cloudVertex,
          fragmentShader: cloudFragment,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide
        }));
        const sheet = new THREE.Mesh(cloudGeometry, cloudMaterial);
        sheet.name = "naharShaderCloud";
        sheet.position.set(x, y, z);
        sheet.scale.set(width, depth, 1);
        // Oblique rather than perfectly horizontal: at combat altitude a flat
        // sheet collapses to a one-pixel line on the horizon. This angle keeps
        // its long windward footprint while exposing a soft, deep cloud face.
        sheet.rotation.set(-1.22, yaw, 0);
        sheet.renderOrder = 2;
        sheet.onBeforeRender = () => { uniforms.uTime.value = performance.now() * 0.001; };
        root.add(sheet);
      }

      // Road geometry is authored as one connected graph. Each segment keeps
      // its endpoints in userData for the browser continuity audit below; the
      // visual boxes overlap by two metres at intersections so cracks cannot
      // appear from floating-point or raster precision.
      const road = 0x3f4140;
      const streetLots = [];
      const roadSegments = [];
      const addRoadSegment = (name, x1, z1, x2, z2, width = 24) => {
        const dx = x2 - x1;
        const dz = z2 - z1;
        if (Math.abs(dx) > 0.001 && Math.abs(dz) > 0.001) {
          throw new Error(`[naharStrait] road ${name} must be axis-aligned`);
        }
        const x = (x1 + x2) * 0.5;
        const z = (z1 + z2) * 0.5;
        streetLots.push({
          x,
          y: surfaceHeightAt(x, z) + 1.8,
          z,
          sx: Math.abs(dx) + (Math.abs(dx) > 0.001 ? 2 : width),
          sy: 1.4,
          sz: Math.abs(dz) + (Math.abs(dz) > 0.001 ? 2 : width)
        });
        roadSegments.push({ name, x1, z1, x2, z2, width });
      };
      for (const side of [-1, 1]) {
        addRoadSegment(`coast-${side}`, -15800, side * 2850, 15800, side * 2850, 32);
      }

      // High central bridge: 105 m deck, 1.6 km water crossing and sloped
      // approaches. The straight fleet route at z=0 passes beneath it.
      const bridgeDeck = 0x54575a;
      box(0, 105, 0, 34, 5, 1700, bridgeDeck);
      beam([0, 34, -1700], [0, 105, -850], 28, bridgeDeck);
      beam([0, 105, 850], [0, 34, 1700], 28, bridgeDeck);
      roadSegments.push({ name: "bridge-link", x1: 0, z1: -1700, x2: 0, z2: 1700, width: 34 });
      for (const z of [-560, 560]) {
        box(-14, 105, z, 12, 168, 12, 0xd7d5cd);
        box(14, 105, z, 12, 168, 12, 0xd7d5cd);
        box(0, 190, z, 54, 8, 16, 0xd7d5cd);
        for (const deckZ of [z < 0 ? -820 : 820, z < 0 ? -280 : 280]) {
          beam([-14, 178, z], [-14, 108, deckZ], 2.2, 0xe1ddd1);
          beam([14, 178, z], [14, 108, deckZ], 2.2, 0xe1ddd1);
        }
      }
      // Continuous suspension profiles, hangers, rails and lane paint turn
      // the bridge from a few disconnected blocks into the map's focal object.
      for (const cableX of [-14, 14]) {
        const cableNodes = [];
        for (let z = -850; z <= 850; z += 85) {
          let y;
          if (z < -560) y = THREE.MathUtils.lerp(108, 178, (z + 850) / 290);
          else if (z > 560) y = THREE.MathUtils.lerp(178, 108, (z - 560) / 290);
          else y = 121 + 57 * Math.pow(Math.abs(z) / 560, 2);
          cableNodes.push([cableX, y, z]);
          if (z > -560 && z < 560 && z % 170 === 0) {
            beam([cableX, 109, z], [cableX, y, z], 1.25, 0xd8d6cf);
          }
        }
        for (let i = 1; i < cableNodes.length; i += 1) {
          beam(cableNodes[i - 1], cableNodes[i], 2.4, 0xd8d6cf);
        }
      }
      for (const railX of [-16, 16]) box(railX, 111, 0, 1.6, 7, 1690, 0xc9cbc6);
      for (let z = -800; z <= 800; z += 120) {
        box(0, 108.2, z, 1.4, 0.7, 54, 0xe6d6a1);
      }
      for (const z of [-790, -400, 0, 400, 790]) {
        cylinder(0, 49, z, 13, 98, 0x696b68);
      }

      // Civil navigation buoys make the east-west shipping lane readable at
      // low altitude without occupying either fleet's route.
      for (let x = -12000; x <= 12000; x += 1200) {
        for (const z of [-620, 620]) {
          const red = z < 0;
          cylinder(x, 5, z, 8, 10, red ? 0xc74b3b : 0x3c9b66);
          cylinder(x, 13, z, 3, 11, 0xe7e0cf);
          cylinder(x, 20, z, 4, 3, red ? 0xff5b45 : 0x62ff9c, {
            emissive: red ? 0xff3b28 : 0x3cff7f
          });
        }
      }

      // Cape landmarks: lighthouse and coastal radar.
      const lighthouseAt = [-1250, 1580];
      const lighthouseGround = surfaceHeightAt(lighthouseAt[0], lighthouseAt[1]);
      cylinder(lighthouseAt[0], lighthouseGround + 43, lighthouseAt[1], 14, 86, 0xe8e2d5);
      cylinder(lighthouseAt[0], lighthouseGround + 92, lighthouseAt[1], 10, 12, 0xc94b39);
      cylinder(lighthouseAt[0], lighthouseGround + 101, lighthouseAt[1], 5, 5, 0xffd788, { emissive: 0xffa13f });
      const radarAt = [1300, -1580];
      const radarGround = surfaceHeightAt(radarAt[0], radarAt[1]);
      cylinder(radarAt[0], radarGround + 41, radarAt[1], 10, 82, 0x777a76);
      box(radarAt[0], radarGround + 91, radarAt[1], 88, 8, 24, 0xb8bbb5, [0, 0.3, 0]);

      // Interpolate the authored coastline instead of approximating it with a
      // straight line. Waterfront industry then stays visibly on land at the
      // 800 m bridge throat as well as on the 2.6 km outer capes.
      const coastProfile = northCoastProfile;
      const coastAt = (x) => {
        if (x <= coastProfile[0][0]) return coastProfile[0][1];
        if (x >= coastProfile[coastProfile.length - 1][0]) return coastProfile[coastProfile.length - 1][1];
        for (let i = 1; i < coastProfile.length; i += 1) {
          const a = coastProfile[i - 1];
          const b = coastProfile[i];
          if (x > b[0]) continue;
          const t = (x - a[0]) / (b[0] - a[0]);
          return a[1] + (b[1] - a[1]) * t;
        }
        return 2600;
      };

      // A layered coast replaces the old vertical brown extrusion: teal
      // shallows sit outside the waterline, pale wet sand follows the actual
      // terrain slope, and a narrow foam edge survives low-altitude passes.
      const makeCoastBand = (name, side, distances, bandMaterial, yOffset) => {
        const step = 200;
        const columns = Math.round(36000 / step) + 1;
        const rows = distances.length;
        const positions = new Float32Array(columns * rows * 3);
        const uvs = new Float32Array(columns * rows * 2);
        let p = 0;
        let uv = 0;
        for (let column = 0; column < columns; column += 1) {
          const x = -18000 + column * step;
          const coast = coastAt(x);
          for (let row = 0; row < rows; row += 1) {
            const distance = distances[row];
            const z = side * (coast + distance);
            positions[p++] = x;
            positions[p++] = Math.max(0, surfaceHeightAt(x, z)) + yOffset;
            positions[p++] = z;
            uvs[uv++] = column / 12;
            uvs[uv++] = row / Math.max(1, rows - 1);
          }
        }
        const indices = [];
        for (let column = 0; column < columns - 1; column += 1) {
          for (let row = 0; row < rows - 1; row += 1) {
            const a = column * rows + row;
            const b = a + 1;
            const c = (column + 1) * rows + row;
            const d = c + 1;
            if (side > 0) indices.push(a, b, c, c, b, d);
            else indices.push(a, c, b, c, d, b);
          }
        }
        const geometry = keepGeometry(new THREE.BufferGeometry());
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        const band = new THREE.Mesh(geometry, bandMaterial);
        band.name = `${name}${side > 0 ? "North" : "South"}`;
        band.receiveShadow = true;
        root.add(band);
      };
      const shallowMaterial = keepMaterial(new THREE.MeshStandardMaterial({
        color: 0x4a8990,
        roughness: 0.44,
        metalness: 0.06,
        transparent: true,
        opacity: 0.28,
        depthWrite: false
      }));
      const beachMaterial = keepMaterial(new THREE.MeshStandardMaterial({
        color: 0xb49a72,
        roughness: 0.98,
        metalness: 0
      }));
      const foamMaterial = keepMaterial(new THREE.MeshBasicMaterial({
        color: 0xffe5c4,
        transparent: true,
        opacity: 0.46,
        depthWrite: false,
        side: THREE.DoubleSide
      }));
      for (const side of [-1, 1]) {
        makeCoastBand("naharShallows", side, [-150, -62, -8], shallowMaterial, 0.28);
        makeCoastBand("naharBeach", side, [8, 42, 105, 180], beachMaterial, 0.14);
        makeCoastBand("naharFoamLine", side, [-7, 0, 8], foamMaterial, 0.42);
      }

      // ---------------------------------------------------------------------
      // TOWNS — dense, textured prefab families with shared GPU batches.
      // ---------------------------------------------------------------------
      const buildingTextures = makeBuildingTextures();
      const officeTextures = makeOfficeTextures();
      const buildingGeometry = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
      for (const group of buildingGeometry.groups) group.materialIndex = 0;
      buildingGeometry.groups[2].materialIndex = 1;
      buildingGeometry.groups[3].materialIndex = 1;
      const buildingWallMaterial = keepMaterial(new THREE.MeshStandardMaterial({
        color: 0xe4d8c3,
        map: buildingTextures.wall,
        emissive: 0xffb35e,
        emissiveMap: buildingTextures.emissive,
        emissiveIntensity: 0.62,
        roughness: 0.81,
        metalness: 0.04,
        vertexColors: true
      }));
      const buildingRoofMaterial = keepMaterial(new THREE.MeshStandardMaterial({
        color: 0xaaa49a,
        map: buildingTextures.roof,
        roughness: 0.93,
        metalness: 0.03,
        vertexColors: true
      }));
      const officeWallMaterial = keepMaterial(new THREE.MeshStandardMaterial({
        color: 0xc5cdd0,
        map: officeTextures.wall,
        emissive: 0xffad66,
        emissiveMap: officeTextures.emissive,
        emissiveIntensity: 0.52,
        roughness: 0.58,
        metalness: 0.18,
        vertexColors: true
      }));
      const stabilizeFacadeAtDistance = (facadeMaterial, cacheKey) => {
        facadeMaterial.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <emissivemap_fragment>",
            `#include <emissivemap_fragment>
            // Individual window texels become unstable sub-pixel sparks at
            // combat distance. Keep the building silhouette and albedo, but
            // fade only its emissive contribution into the district glow.
            totalEmissiveRadiance *= 1.0 - smoothstep(3400.0, 9800.0, length(vViewPosition));`
          );
          facadeMaterial.userData.shader = shader;
        };
        facadeMaterial.customProgramCacheKey = () => `nahar-facade-${cacheKey}-v1`;
      };
      stabilizeFacadeAtDistance(buildingWallMaterial, "masonry");
      stabilizeFacadeAtDistance(officeWallMaterial, "office");
      const townLots = [];
      const townTints = [0xe1d2bb, 0xd1d2c8, 0xd7c4ae, 0xbecac4, 0xd9ccb3, 0xc8c5ba];
      for (const side of [-1, 1]) {
        for (let x = -14800; x <= 14800; x += 260) {
          if (Math.abs(x) < 1180) continue;
          const centreLift = Math.max(
            Math.exp(-Math.pow((x + 6800) / 2300, 2)),
            Math.exp(-Math.pow((x - 5700) / 2100, 2))
          );
          const blockRows = [3780, 4200, 4980, 5400, 6180, 6600, 7440];
          for (let row = 0; row < blockRows.length; row += 1) {
            const fill = 0.78 - row * 0.045;
            const homesPerCell = row >= 5 ? 2 : 1;
            for (let lot = 0; lot < homesPerCell; lot += 1) {
              if (rand() > fill - lot * 0.08) continue;
              const residential = row >= 5;
              const jx = (rand() - 0.5) * 54 + (residential ? (lot ? 64 : -64) : 0);
              const jz = (rand() - 0.5) * 48;
              const zAbs = blockRows[row] + jz;
              const width = residential ? 42 + rand() * 42 : 88 + rand() * 76;
              const depth = residential ? 46 + rand() * 48 : 76 + rand() * 78;
              const lowRise = residential ? 13 + rand() * 25 : 22 + rand() * 42;
              const skyline = centreLift * (18 + rand() * 92) * Math.max(0.32, 1 - row * 0.09);
              const height = Math.min(148, lowRise + skyline);
              const worldZ = side * zAbs;
              const baseY = surfaceHeightAt(x + jx, worldZ);
              townLots.push({
                x: x + jx,
                y: baseY + height * 0.5,
                z: worldZ,
                sx: width,
                sy: height,
                sz: depth,
                archetype: residential ? "residential" : (height > 94 ? "office" : "apartment"),
                color: townTints[Math.floor(rand() * townTints.length)]
              });
            }
          }
        }
      }
      // The bridge throat is the part the player actually flies over. A second
      // waterfront band fills the old 2.4 km blank between the shoreline and
      // the inland town, while leaving the bridge centreline and both landmark
      // compounds open. It is denser and lower than the inland skyline: ferry
      // offices, apartments, workshops and hotels rather than another CBD.
      const heroTowerCaps = [];
      for (const side of [-1, 1]) {
        for (let x = -4700; x <= 4700; x += 230) {
          if (Math.abs(x) < 1050) continue;
          const shore = coastAt(x);
          for (let row = 0; row < 4; row += 1) {
            if (rand() > 0.82 - row * 0.06) continue;
            const jx = (rand() - 0.5) * 58;
            const jz = (rand() - 0.5) * 44;
            const zAbs = shore + 230 + row * 245 + jz;
            const landmarkX = side > 0 ? -1250 : 1300;
            const landmarkZ = 1580;
            if (Math.hypot(x + jx - landmarkX, zAbs - landmarkZ) < 260) continue;
            const height = 24 + rand() * (row < 2 ? 62 : 48);
            const worldZ = side * zAbs;
            const baseY = surfaceHeightAt(x + jx, worldZ);
            townLots.push({
              x: x + jx,
              y: baseY + height * 0.5,
              z: worldZ,
              sx: 84 + rand() * 78,
              sy: height,
              sz: 72 + rand() * 74,
              archetype: row < 2 && height > 58 ? "hotel" : "apartment",
              color: townTints[Math.floor(rand() * townTints.length)]
            });
          }
        }
      }
      // Two recognisable urban centres on each bank. Their stepped crowns and
      // 160–235 m height break the otherwise low-rise silhouette, letting the
      // player judge which part of the 32 km shore they are approaching.
      for (const side of [-1, 1]) {
        for (const centre of [-6800, 5700]) {
          for (let ix = -2; ix <= 2; ix += 1) {
            for (let iz = 0; iz < 2; iz += 1) {
              if (rand() > 0.83) continue;
              const x = centre + ix * 230 + (rand() - 0.5) * 42;
              const zAbs = 3860 + iz * 300 + (rand() - 0.5) * 30;
              const height = 154 + rand() * 82 - Math.abs(ix) * 11;
              const width = 92 + rand() * 54;
              const depth = 86 + rand() * 48;
              const worldZ = side * zAbs;
              const baseY = surfaceHeightAt(x, worldZ);
              townLots.push({
                x,
                y: baseY + height * 0.5,
                z: worldZ,
                sx: width,
                sy: height,
                sz: depth,
                archetype: "office",
                hero: true,
                color: townTints[(ix + iz + 8) % townTints.length]
              });
              heroTowerCaps.push({
                x,
                y: baseY + height + 6,
                z: worldZ,
                sx: width * 0.52,
                sy: 12,
                sz: depth * 0.48
              });
            }
          }
        }
      }
      const plannedRoads = [
        ...[-1, 1].flatMap((side) => [2850, 3500, 4700, 5900, 7100]
          .map((zAbs) => ({ minX: -15020, maxX: 15020, minZ: side * zAbs - 26, maxZ: side * zAbs + 26 }))),
        ...[-1, 1].map((side) => ({ minX: -35, maxX: 35, minZ: Math.min(side * 1700, side * 7900), maxZ: Math.max(side * 1700, side * 7900) })),
        ...[-1, 1].flatMap((side) => {
          const segments = [];
          for (let roadX = -14600; roadX <= 14600; roadX += 1040) {
            if (Math.abs(roadX) < 1300) continue;
            segments.push({ minX: roadX - 24, maxX: roadX + 24, minZ: Math.min(side * 2850, side * 7900), maxZ: Math.max(side * 2850, side * 7900) });
          }
          for (const portX of [-10500, 9200]) {
            segments.push({ minX: portX - 28, maxX: portX + 28, minZ: Math.min(side * 2780, side * 3500), maxZ: Math.max(side * 2780, side * 3500) });
          }
          return segments;
        })
      ];
      const buildingHitsRoad = (building) => {
        const clearance = 12;
        const minX = building.x - building.sx * 0.5 - clearance;
        const maxX = building.x + building.sx * 0.5 + clearance;
        const minZ = building.z - building.sz * 0.5 - clearance;
        const maxZ = building.z + building.sz * 0.5 + clearance;
        return plannedRoads.some((roadBounds) => minX <= roadBounds.maxX && maxX >= roadBounds.minX
          && minZ <= roadBounds.maxZ && maxZ >= roadBounds.minZ);
      };
      const roadSafeTownLots = townLots
        .filter((building) => !buildingHitsRoad(building))
        .sort((a, b) => Number(Boolean(b.hero)) - Number(Boolean(a.hero)));
      const nonOverlappingTownLots = [];
      const buildingsOverlap = (a, b, gap = 8) => (
        Math.abs(a.x - b.x) < (a.sx + b.sx) * 0.5 + gap
        && Math.abs(a.z - b.z) < (a.sz + b.sz) * 0.5 + gap
      );
      for (const candidate of roadSafeTownLots) {
        if (nonOverlappingTownLots.some((placed) => buildingsOverlap(candidate, placed))) continue;
        nonOverlappingTownLots.push(candidate);
      }
      townLots.length = 0;
      townLots.push(...nonOverlappingTownLots);
      const safeCaps = heroTowerCaps.filter((cap) => townLots.some((building) =>
        Math.abs(building.x - cap.x) < 1 && Math.abs(building.z - cap.z) < 1));
      heroTowerCaps.length = 0;
      heroTowerCaps.push(...safeCaps);
      root.userData.prefabLots = townLots.map((building) => ({
        x: building.x,
        z: building.z,
        sx: building.sx,
        sz: building.sz,
        baseY: building.y - building.sy * 0.5,
        archetype: building.archetype
      }));
      // A small prefab catalogue. Each finished type is composed from shared
      // body/detail geometries below, then every occurrence is GPU-instanced.
      // That gives repeated assets consistent construction detail without the
      // cost and visual sameness of cloning one naked box a thousand times.
      const residentialLots = townLots.filter((building) => building.archetype === "residential");
      const urbanLots = townLots.filter((building) => ["apartment", "hotel"].includes(building.archetype));
      const officeLots = townLots.filter((building) => building.archetype === "office");
      const town = addInstancedBoxes(
        "naharTownBuildings",
        residentialLots,
        [buildingWallMaterial, buildingRoofMaterial],
        buildingGeometry
      );
      const apartments = addInstancedBoxes(
        "naharApartmentPrefabs",
        urbanLots,
        [buildingWallMaterial, buildingRoofMaterial],
        buildingGeometry
      );
      const offices = addInstancedBoxes(
        "naharOfficePrefabs",
        officeLots,
        [officeWallMaterial, buildingRoofMaterial],
        buildingGeometry
      );
      for (const batch of [town, apartments, offices]) {
        if (batch) batch.userData.textureSet = "procedural-prefab-facades-roofs";
      }
      addInstancedBoxes("naharTowerCrowns", heroTowerCaps, keepMaterial(new THREE.MeshStandardMaterial({
        color: 0xc2c5bf,
        roughness: 0.66,
        metalness: 0.28
      })));
      const buildingFootings = townLots.map((building) => ({
        x: building.x,
        y: building.y - building.sy * 0.5 + 0.35,
        z: building.z,
        sx: building.sx * 1.08,
        sy: 0.7,
        sz: building.sz * 1.08,
        yaw: building.yaw || 0
      }));
      addInstancedBoxes("naharBuildingFootings", buildingFootings, keepMaterial(new THREE.MeshStandardMaterial({
        color: 0x393d3a,
        roughness: 1,
        metalness: 0
      })));
      const residentialRoofs = [];
      const residentialChimneys = [];
      const cornices = [];
      const balconySlabs = [];
      const officeSetbacks = [];
      const hotelAwnings = [];
      const storefrontBands = [];
      const roofEquipment = [];
      const roofAntennas = [];
      townLots.forEach((building, index) => {
        const top = building.y + building.sy * 0.5;
        if (building.archetype === "residential") {
          residentialRoofs.push({
            x: building.x,
            y: top + 5,
            z: building.z,
            sx: building.sx * 1.08,
            sy: 10,
            sz: building.sz * 1.1,
            color: index % 3 === 0 ? 0x76554a : (index % 3 === 1 ? 0x5f6663 : 0x8a7257)
          });
          if (index % 3 === 0) {
            residentialChimneys.push({
              x: building.x + building.sx * 0.24,
              y: top + 11,
              z: building.z,
              sx: 3.8,
              sy: 13,
              sz: 3.8
            });
          }
        } else if (building.archetype === "apartment" || building.archetype === "hotel") {
          cornices.push({
            x: building.x,
            y: top - 1.2,
            z: building.z,
            sx: building.sx * 1.07,
            sy: 2.4,
            sz: building.sz * 1.07
          });
          for (const fraction of [0.28, 0.52, 0.76]) {
            balconySlabs.push({
              x: building.x,
              y: building.y - building.sy * 0.5 + building.sy * fraction,
              z: building.z,
              sx: building.sx * 1.035,
              sy: 1.15,
              sz: building.sz * 1.035
            });
          }
          if (building.archetype === "hotel") {
            hotelAwnings.push({
              x: building.x,
              y: building.y - building.sy * 0.5 + 5.5,
              z: building.z - Math.sign(building.z) * (building.sz * 0.5 + 7),
              sx: building.sx * 0.42,
              sy: 2.4,
              sz: 14,
              color: index % 2 ? 0x5e756e : 0x8b5947
            });
          }
          storefrontBands.push({
            x: building.x,
            y: building.y - building.sy * 0.5 + 4.5,
            z: building.z - Math.sign(building.z) * (building.sz * 0.5 + 1.2),
            sx: building.sx * 0.82,
            sy: 6.5,
            sz: 2.4,
            color: building.archetype === "hotel" ? 0xd89a5f : 0x74a1a4
          });
        } else if (building.archetype === "office" && building.sy > 110) {
          officeSetbacks.push({
            x: building.x,
            y: top + 10,
            z: building.z,
            sx: building.sx * 0.68,
            sy: 20,
            sz: building.sz * 0.68,
            color: building.color
          });
        }
        if (index % 7 === 0) {
          roofEquipment.push({
            x: building.x + building.sx * 0.18,
            y: top + (building.archetype === "residential" ? 11.5 : 3.5),
            z: building.z - building.sz * 0.16,
            sx: Math.max(14, building.sx * 0.2),
            sy: 7,
            sz: Math.max(12, building.sz * 0.2),
            color: index % 3 ? 0x737a78 : 0x9b907e
          });
        }
        if (building.sy > 128 && index % 3 === 0) {
          roofAntennas.push({
            x: building.x,
            y: building.y + building.sy * 0.5 + 18,
            z: building.z,
            sx: 1.8,
            sy: 36,
            sz: 1.8
          });
        }
      });
      const residentialRoofGeometry = keepGeometry(new THREE.BufferGeometry());
      residentialRoofGeometry.setAttribute("position", new THREE.Float32BufferAttribute([
        -0.5, 0, -0.5, 0.5, 0, -0.5, 0, 0.5, -0.5,
        -0.5, 0, 0.5, 0.5, 0, 0.5, 0, 0.5, 0.5
      ], 3));
      residentialRoofGeometry.setAttribute("uv", new THREE.Float32BufferAttribute([
        0, 0, 1, 0, 0.5, 1,
        0, 0, 1, 0, 0.5, 1
      ], 2));
      residentialRoofGeometry.setIndex([
        0, 1, 2, 3, 5, 4,
        0, 2, 5, 0, 5, 3,
        1, 4, 5, 1, 5, 2
      ]);
      residentialRoofGeometry.computeVertexNormals();
      addInstancedBoxes("naharResidentialPrefabRoofs", residentialRoofs, keepMaterial(new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.9,
        metalness: 0.02,
        vertexColors: true
      })), residentialRoofGeometry);
      addInstancedBoxes("naharResidentialChimneys", residentialChimneys, keepMaterial(new THREE.MeshStandardMaterial({
        color: 0x695448,
        roughness: 0.92,
        metalness: 0.01
      })));
      addInstancedBoxes("naharApartmentCornices", cornices, keepMaterial(new THREE.MeshStandardMaterial({
        color: 0xb8b4a9,
        roughness: 0.76,
        metalness: 0.06
      })));
      addInstancedBoxes("naharApartmentBalconies", balconySlabs, keepMaterial(new THREE.MeshStandardMaterial({
        color: 0x696f6d,
        roughness: 0.7,
        metalness: 0.14
      })));
      addInstancedBoxes("naharOfficeSetbacks", officeSetbacks, [officeWallMaterial, buildingRoofMaterial], buildingGeometry);
      addInstancedBoxes("naharHotelAwnings", hotelAwnings, keepMaterial(new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.84,
        metalness: 0.03,
        vertexColors: true
      })));
      addInstancedBoxes("naharStorefrontBands", storefrontBands, keepMaterial(new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x7d5b3e,
        emissiveIntensity: 0.45,
        roughness: 0.4,
        metalness: 0.28,
        vertexColors: true
      })));
      addInstancedBoxes("naharRoofEquipment", roofEquipment, keepMaterial(new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.72,
        metalness: 0.3,
        vertexColors: true
      })));
      addInstancedBoxes("naharRoofAntennas", roofAntennas, keepMaterial(new THREE.MeshStandardMaterial({
        color: 0xa9aaa4,
        roughness: 0.5,
        metalness: 0.58
      })), cylinderGeometry);

      // Farmland gives the huge inland capes a readable land-use scale. The
      // cape shader supplies fine grain; these broad, slightly rotated parcels
      // provide the kilometre-scale colour blocks visible from combat height.
      const fieldLots = [];
      const fieldColors = [0x667246, 0x7d7442, 0x52623e, 0x8a6940, 0x716f4a, 0x59683f];
      for (const side of [-1, 1]) {
        for (let x = -15200; x <= 15200; x += 620) {
          if (Math.abs(x) < 1550) continue;
          for (let row = 0; row < 4; row += 1) {
            if (rand() > 0.86) continue;
            const zAbs = 6450 + row * 780 + (rand() - 0.5) * 170;
            const fieldX = x + (rand() - 0.5) * 180;
            const fieldZ = side * zAbs;
            fieldLots.push({
              x: fieldX,
              y: surfaceHeightAt(fieldX, fieldZ) + 0.7,
              z: fieldZ,
              sx: 470 + rand() * 150,
              sy: 1.2,
              sz: 560 + rand() * 170,
              yaw: (rand() - 0.5) * 0.08,
              color: fieldColors[Math.floor(rand() * fieldColors.length)]
            });
          }
        }
      }
      addInstancedBoxes("naharLandUseFields", fieldLots, keepMaterial(new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 1,
        metalness: 0,
        vertexColors: true
      })));

      // Tree belts separate built-up districts from the field sheet. Kept to
      // two instanced draws (trunks + canopies); their irregular edge is what
      // stops the town from looking stamped onto a rectangular board.
      const treeTrunks = [];
      const treeCanopies = [];
      const treeColors = [0x263c29, 0x30492d, 0x3a5131, 0x294331];
      for (const side of [-1, 1]) {
        for (let i = 0; i < 520; i += 1) {
          const x = -15400 + rand() * 30800;
          if (Math.abs(x) < 1500) continue;
          const zAbs = 6100 + rand() * 3400;
          // Leave the strongest road axes open so the green belts read as
          // planned districts rather than trees growing through tarmac.
          if (Math.abs(((x + 14600) % 1040) - 520) > 440) continue;
          const trunkHeight = 12 + rand() * 10;
          const crownHeight = 22 + rand() * 20;
          const crownRadius = 9 + rand() * 12;
          const treeZ = side * zAbs;
          const treeGround = surfaceHeightAt(x, treeZ);
          treeTrunks.push({
            x,
            y: treeGround + trunkHeight * 0.5,
            z: treeZ,
            sx: 2.8,
            sy: trunkHeight,
            sz: 2.8
          });
          treeCanopies.push({
            x,
            y: treeGround + trunkHeight + crownHeight * 0.46,
            z: treeZ,
            sx: crownRadius,
            sy: crownHeight,
            sz: crownRadius,
            yaw: rand() * Math.PI,
            color: treeColors[Math.floor(rand() * treeColors.length)]
          });
        }
      }
      addInstancedBoxes("naharTreeTrunks", treeTrunks, keepMaterial(new THREE.MeshStandardMaterial({
        color: 0x463425,
        roughness: 1,
        metalness: 0
      })), cylinderGeometry);
      const treeGeometry = keepGeometry(new THREE.ConeGeometry(1, 1, 7));
      addInstancedBoxes("naharTreeBelts", treeCanopies, keepMaterial(new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.96,
        metalness: 0,
        vertexColors: true
      })), treeGeometry);

      // A full street hierarchy: shore highway, parallel town avenues and
      // cross streets. Dark ribbons survive the warm sunset lighting and make
      // the city density legible even before individual buildings resolve.
      for (const side of [-1, 1]) {
        for (const zAbs of [3500, 4700, 5900, 7100]) {
          addRoadSegment(`avenue-${side}-${zAbs}`, -15000, side * zAbs, 15000, side * zAbs, zAbs === 3500 ? 30 : 24);
        }
        for (let x = -14600; x <= 14600; x += 1040) {
          if (Math.abs(x) < 1300) continue;
          // Starts on the coastal highway. The previous coast+340 start left a
          // visible 300 m gap between almost every cross street and the road it
          // was supposed to feed.
          addRoadSegment(`cross-${side}-${x}`, x, side * 2850, x, side * 7900, 20);
        }
        // This is the missing bridge connection: deck approach -> coast road
        // -> every inland avenue. Its endpoint overlaps the 1.7 km approach.
        addRoadSegment(`central-boulevard-${side}`, 0, side * 1700, 0, side * 7900, 38);
        // Port gates join the harbour apron to the coast highway and first
        // avenue; cranes and warehouses now belong to the same road network.
        for (const portX of [-10500, 9200]) {
          addRoadSegment(
            `port-access-${side}-${portX}`,
            portX,
            side * (coastAt(portX) + 200),
            portX,
            side * 3500,
            26
          );
        }
      }
      const streetGrid = addInstancedBoxes("naharStreetGrid", streetLots, keepMaterial(new THREE.MeshStandardMaterial({
        color: 0x2e3333,
        roughness: 0.96,
        metalness: 0.01
      })));
      streetGrid.userData.segments = roadSegments;
      const roadJunctions = [];
      const junctionKeys = new Set();
      for (let i = 0; i < roadSegments.length; i += 1) {
        const a = roadSegments[i];
        const aHorizontal = Math.abs(a.z2 - a.z1) < 0.001;
        for (let j = i + 1; j < roadSegments.length; j += 1) {
          const b = roadSegments[j];
          const bHorizontal = Math.abs(b.z2 - b.z1) < 0.001;
          if (aHorizontal === bHorizontal) continue;
          const horizontal = aHorizontal ? a : b;
          const vertical = aHorizontal ? b : a;
          const x = vertical.x1;
          const z = horizontal.z1;
          if (x < Math.min(horizontal.x1, horizontal.x2) || x > Math.max(horizontal.x1, horizontal.x2)
            || z < Math.min(vertical.z1, vertical.z2) || z > Math.max(vertical.z1, vertical.z2)) continue;
          const key = `${Math.round(x)}:${Math.round(z)}`;
          if (junctionKeys.has(key)) continue;
          junctionKeys.add(key);
          const size = Math.max(horizontal.width, vertical.width) + 5;
          roadJunctions.push({
            x,
            y: surfaceHeightAt(x, z) + 2.05,
            z,
            sx: size,
            sy: 1.65,
            sz: size
          });
        }
      }
      const junctionBatch = addInstancedBoxes("naharRoadJunctions", roadJunctions, keepMaterial(new THREE.MeshStandardMaterial({
        color: 0x303534,
        roughness: 0.97,
        metalness: 0.01
      })));
      junctionBatch.userData.junctionCount = roadJunctions.length;

      const roadMarks = [];
      for (const side of [-1, 1]) {
        for (const zAbs of [2850, 3500, 4700, 5900]) {
          for (let x = -14600; x <= 14600; x += 360) {
            roadMarks.push({ x, y: 37.1, z: side * zAbs, sx: 68, sy: 0.45, sz: 2.3 });
          }
        }
        for (let zAbs = 1900; zAbs <= 7700; zAbs += 240) {
          roadMarks.push({ x: 0, y: 36.9, z: side * zAbs, sx: 2.3, sy: 0.45, sz: 72 });
        }
      }
      addInstancedBoxes("naharRoadMarkings", roadMarks, keepMaterial(new THREE.MeshBasicMaterial({ color: 0xd6c993 })));

      // ---------------------------------------------------------------------
      // PORTS — containers, warehouses, tanks and gantry cranes on both banks.
      // ---------------------------------------------------------------------
      const containerLots = [];
      const containerColors = [0x9d3f34, 0x28586c, 0xc08435, 0x466a55, 0x6b7074, 0x783c46];
      const portCentres = [-10500, 9200];
      // Reclaimed concrete quays give the cranes and containers a convincing
      // load-bearing edge instead of leaving them hovering above beach slope.
      // Finger piers project toward the channel but stop well outside its lane.
      for (const side of [-1, 1]) {
        for (const centre of portCentres) {
          const coast = coastAt(centre);
          box(centre, 17, side * (coast + 165), 3500, 34, 690, 0x5c5f5c);
          box(centre, 34.8, side * (coast + 165), 3470, 1.5, 660, 0x777b76);
          for (const offset of [-1120, -380, 380, 1120]) {
            box(centre + offset, 15, side * (coast - 235), 86, 30, 540, 0x666a68);
            cylinder(centre + offset, 33, side * (coast - 480), 10, 22, 0xd5cbb8);
          }
          // A low breakwater frames each harbour mouth without creating a new
          // obstacle on M04's central east-west ship route.
          box(centre + 1840, 9, side * (coast - 180), 520, 18, 54, 0x4e5351, [0, 0.1 * side, 0]);
          box(centre - 1840, 9, side * (coast - 180), 520, 18, 54, 0x4e5351, [0, -0.1 * side, 0]);
        }
      }
      for (const side of [-1, 1]) {
        for (const centre of portCentres) {
          for (let ix = -8; ix <= 8; ix += 1) {
            for (let iz = 0; iz < 5; iz += 1) {
              if (rand() > 0.84) continue;
              const x = centre + ix * 92;
              const baseZ = coastAt(x) + 250 + iz * 58;
              const stack = rand() > 0.58 ? 2 : 1;
              for (let level = 0; level < stack; level += 1) {
                containerLots.push({
                  x,
                  y: 34 + 8 + level * 16,
                  z: side * baseZ,
                  sx: 72,
                  sy: 15,
                  sz: 24,
                  yaw: centre < 0 ? 0.03 : -0.025,
                  color: containerColors[Math.floor(rand() * containerColors.length)]
                });
              }
            }
          }
        }
      }
      addInstancedBoxes("naharHarbourContainers", containerLots, keepMaterial(new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.7,
        metalness: 0.32,
        vertexColors: true
      })));

      const warehouseLots = [];
      const warehouseColors = [0x85827a, 0x6f7777, 0x9a866e, 0x74716b];
      for (const side of [-1, 1]) {
        for (const centre of portCentres) {
          for (let i = -3; i <= 3; i += 1) {
            const x = centre + i * 360;
            const zAbs = coastAt(x) + 820 + (i & 1) * 120;
            const height = 34 + (i % 3 + 2) * 7;
            warehouseLots.push({
              x,
              y: 34 + height * 0.5,
              z: side * zAbs,
              sx: 270,
              sy: height,
              sz: 155,
              color: warehouseColors[(i + 8) % warehouseColors.length]
            });
          }
        }
      }
      addInstancedBoxes("naharHarbourWarehouses", warehouseLots, keepMaterial(new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: buildingTextures.roof,
        roughness: 0.82,
        metalness: 0.17,
        vertexColors: true
      })));

      const craneSteel = [];
      const craneCabins = [];
      for (const side of [-1, 1]) {
        for (const centre of portCentres) {
          for (let i = -2; i <= 2; i += 1) {
            const x = centre + i * 530;
            const z = side * (coastAt(x) + 115);
            craneSteel.push({ x, y: 102, z, sx: 12, sy: 136, sz: 12 });
            craneSteel.push({ x: x + side * 0, y: 164, z: z - side * 58, sx: 12, sy: 10, sz: 130 });
            craneSteel.push({ x, y: 93, z: z + side * 32, sx: 58, sy: 9, sz: 10 });
            craneCabins.push({ x: x + 25, y: 132, z, sx: 26, sy: 22, sz: 24 });
          }
        }
      }
      addInstancedBoxes("naharPortCranes", craneSteel, keepMaterial(new THREE.MeshStandardMaterial({
        color: 0xb56b35,
        roughness: 0.53,
        metalness: 0.58
      })));
      addInstancedBoxes("naharPortCraneCabins", craneCabins, keepMaterial(new THREE.MeshStandardMaterial({
        color: 0xe0b05e,
        roughness: 0.46,
        metalness: 0.26
      })));

      const tankEntries = [];
      for (const side of [-1, 1]) {
        for (let i = 0; i < 28; i += 1) {
          const x = -4800 + (i % 14) * 260 + (rand() - 0.5) * 45;
          const zAbs = 3850 + Math.floor(i / 14) * 330 + (rand() - 0.5) * 55;
          tankEntries.push({ x, y: 57, z: side * zAbs, r: 44 + rand() * 18, h: 46, color: i % 3 ? 0xb6b0a2 : 0x8b928f });
        }
      }
      const tankGeometry = cylinderGeometry;
      const tankMaterial = keepMaterial(new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.6,
        metalness: 0.36,
        vertexColors: true
      }));
      const tankBatch = new THREE.InstancedMesh(tankGeometry, tankMaterial, tankEntries.length);
      tankBatch.name = "naharTankFarms";
      {
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        const tint = new THREE.Color();
        tankEntries.forEach((entry, index) => {
          position.set(entry.x, entry.y, entry.z);
          scale.set(entry.r, entry.h, entry.r);
          tankBatch.setMatrixAt(index, matrix.compose(position, quaternion, scale));
          tankBatch.setColorAt(index, tint.setHex(entry.color));
        });
        tankBatch.instanceMatrix.needsUpdate = true;
        tankBatch.instanceColor.needsUpdate = true;
      }
      tankBatch.castShadow = false;
      tankBatch.receiveShadow = true;
      tankBatch.userData.instanceCount = tankEntries.length;
      root.add(tankBatch);

      // One point cloud carries the inhabited coast at dusk: lamps follow the
      // road hierarchy and no real PointLights are added, so illumination and
      // mission performance remain unchanged.
      const lampTexture = canvasTexture("naharStreetLampSprite", 32, (context, size) => {
        const glow = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        glow.addColorStop(0, "rgba(255,242,188,1)");
        glow.addColorStop(0.22, "rgba(255,186,92,0.92)");
        glow.addColorStop(1, "rgba(255,124,42,0)");
        context.fillStyle = glow;
        context.fillRect(0, 0, size, size);
      });
      const lampPositions = [];
      for (const side of [-1, 1]) {
        for (const zAbs of [2850, 3500, 4700, 5900]) {
          for (let x = -14800; x <= 14800; x += 230) {
            if (Math.abs(x) < 1500 && zAbs === 2850) continue;
            lampPositions.push(x, 46, side * zAbs);
          }
        }
      }
      const lampGeometry = keepGeometry(new THREE.BufferGeometry());
      lampGeometry.setAttribute("position", new THREE.Float32BufferAttribute(lampPositions, 3));
      const lamps = new THREE.Points(lampGeometry, keepMaterial(new THREE.PointsMaterial({
        color: 0xffc06d,
        map: lampTexture,
        size: 18,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.86,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })));
      lamps.name = "naharStreetLights";
      lamps.renderOrder = 3;
      lamps.userData.pointCount = lampPositions.length / 3;
      root.add(lamps);

      root.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = false;
        node.receiveShadow = true;
      });
    }
  });
}
