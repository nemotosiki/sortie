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

  ctx.addWorldPreset("naharStrait", {
    ...base,
    label: "NAHAR STRAIT",
    sceneryOrigin: [0, 0],
    previewFocus: [0, 0],
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
    // The whole 32 km strait must remain readable. The original sunset map's
    // 4.6 km fog works for one carrier group, not for an east-west fleet race.
    fog: { color: 0x9d7059, near: 5200, far: 20500 },
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
      sand: 0x8d7358,
      grass: 0x4c563d,
      rock: 0x585248,
      peak: 0x655e4e,
      snow: 0xd9c6b2,
      textureProfile: "grassland"
    },
    lights: {
      hemi: { sky: 0xf1b386, ground: 0x252432, intensity: 1.62 },
      key: { color: 0xffad66, intensity: 2.5, position: [-3200, 980, -350] },
      fill: { color: 0x6f78a8, intensity: 0.55, position: [2400, 300, 1100] }
    },
    // The two capes are authored by the decorator so the exact 4–5 km channel
    // and 1.6 km bridge throat remain deterministic. Random terrain is disabled.
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
    build({ THREE, addRoot, keepGeometry, keepMaterial }) {
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
      const capeMaterials = new Map();
      const capeMaterial = (color) => {
        if (capeMaterials.has(color)) return capeMaterials.get(color);
        const mat = keepMaterial(new THREE.MeshStandardMaterial({
          color,
          roughness: 0.94,
          metalness: 0.01
        }));
        // MeshStandardMaterial keeps the engine's lighting and fog, while this
        // GLSL injection breaks the capes' single flat colour into kilometre-
        // scale geology, scrub and fine soil variation. It costs no texture
        // download and remains deterministic across reloads.
        mat.onBeforeCompile = (shader) => {
          shader.vertexShader = shader.vertexShader
            .replace("#include <common>", `#include <common>
              varying vec3 vNaharWorld;`)
            .replace("#include <begin_vertex>", `#include <begin_vertex>
              vNaharWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
          shader.fragmentShader = shader.fragmentShader
            .replace("#include <common>", `#include <common>
              varying vec3 vNaharWorld;
              float naharHash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
              }
              float naharNoise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(mix(naharHash(i), naharHash(i + vec2(1.0, 0.0)), f.x),
                  mix(naharHash(i + vec2(0.0, 1.0)), naharHash(i + vec2(1.0)), f.x), f.y);
              }
              float naharFbm(vec2 p) {
                float value = 0.0;
                float amp = 0.55;
                for (int i = 0; i < 4; i++) {
                  value += amp * naharNoise(p);
                  p = p * 2.03 + vec2(17.2, 9.7);
                  amp *= 0.48;
                }
                return value;
              }`)
            .replace("#include <color_fragment>", `#include <color_fragment>
              float broad = naharFbm(vNaharWorld.xz * 0.00042);
              float scrub = naharNoise(vNaharWorld.xz * 0.0045);
              float strata = 0.5 + 0.5 * sin(vNaharWorld.x * 0.0022 + broad * 5.0);
              vec3 earth = mix(vec3(0.69, 0.60, 0.47), vec3(0.34, 0.43, 0.31), broad);
              earth *= mix(0.86, 1.13, scrub) * mix(0.94, 1.06, strata);
              diffuseColor.rgb *= earth * 1.62;`);
        };
        mat.customProgramCacheKey = () => `nahar-cape-${color}-v1`;
        capeMaterials.set(color, mat);
        return mat;
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

      const makeCape = (name, points, color) => {
        const shape = new THREE.Shape();
        points.forEach(([x, z], index) => {
          if (index === 0) shape.moveTo(x, z);
          else shape.lineTo(x, z);
        });
        shape.closePath();
        const geometry = keepGeometry(new THREE.ExtrudeGeometry(shape, {
          depth: 34,
          bevelEnabled: true,
          bevelSegments: 2,
          bevelSize: 18,
          bevelThickness: 8,
          curveSegments: 1
        }));
        geometry.rotateX(Math.PI * 0.5);
        const mesh = new THREE.Mesh(geometry, capeMaterial(color));
        mesh.name = name;
        mesh.position.y = 34;
        root.add(mesh);
      };

      // General width is 4–5 km; the two tips pinch to a 1.6 km bridge throat.
      const northCoast = [
        [-16000, 2600], [-6500, 2500], [-3200, 2200], [-1500, 1500],
        [-600, 940], [0, 800], [600, 940], [1500, 1500], [3200, 2200],
        [6500, 2500], [16000, 2600], [16000, 10000], [-16000, 10000]
      ];
      const southCoast = northCoast.map(([x, z]) => [x, -z]).reverse();
      makeCape("naharNorthCape", northCoast, 0x59604a);
      makeCape("naharSouthCape", southCoast, 0x514c42);

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

      // Coastal roads follow the shoreline but stop outside the ship lane.
      const road = 0x3f4140;
      for (const side of [-1, 1]) {
        const z = side * 2850;
        box(-8500, 36, z, 9800, 1.1, 28, road, [0, 0.03 * side, 0]);
        box(8500, 36, z, 9800, 1.1, 28, road, [0, -0.03 * side, 0]);
      }

      // High central bridge: 105 m deck, 1.6 km water crossing and sloped
      // approaches. The straight fleet route at z=0 passes beneath it.
      const bridgeDeck = 0x54575a;
      box(0, 105, 0, 34, 5, 1700, bridgeDeck);
      beam([0, 34, -1700], [0, 105, -850], 28, bridgeDeck);
      beam([0, 105, 850], [0, 34, 1700], 28, bridgeDeck);
      for (const z of [-560, 560]) {
        box(-14, 105, z, 12, 168, 12, 0xd7d5cd);
        box(14, 105, z, 12, 168, 12, 0xd7d5cd);
        box(0, 190, z, 54, 8, 16, 0xd7d5cd);
        for (const deckZ of [z < 0 ? -820 : 820, z < 0 ? -280 : 280]) {
          beam([-14, 178, z], [-14, 108, deckZ], 2.2, 0xe1ddd1);
          beam([14, 178, z], [14, 108, deckZ], 2.2, 0xe1ddd1);
        }
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

      // Cape landmarks: lighthouse, coastal radar and sparse distant town.
      cylinder(-1250, 77, 1380, 14, 86, 0xe8e2d5);
      cylinder(-1250, 126, 1380, 10, 12, 0xc94b39);
      cylinder(-1250, 135, 1380, 5, 5, 0xffd788, { emissive: 0xffa13f });
      cylinder(1300, 76, -1380, 10, 82, 0x777a76);
      box(1300, 125, -1380, 88, 8, 24, 0xb8bbb5, [0, 0.3, 0]);

      for (const side of [-1, 1]) {
        for (let i = 0; i < 18; i += 1) {
          const x = -11800 + i * 620;
          const z = side * (4050 + (i % 3) * 150);
          const height = 18 + (i % 5) * 7;
          box(x, 34 + height / 2, z, 85, height, 70, i % 2 ? 0x787369 : 0x676c68);
        }
      }

      root.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = false;
        node.receiveShadow = true;
      });
    }
  });
}
