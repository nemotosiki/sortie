// MIGAL CITY night defence variant for Sera M15.
// The established nightCity landmass remains the geographic base; this preset
// names the region and adds three readable districts required by the mission.
export default function register(ctx) {
  const { WORLD_PRESETS } = ctx.tables;
  const base = WORLD_PRESETS.nightCity;
  if (!base) throw new Error("[migalCityNight] nightCity base preset is missing");

  const missionAnchors = Object.freeze({
    playerStart: Object.freeze([0, 600]),
    battleCenter: Object.freeze([0, -7600]),
    militaryRoot: Object.freeze([0, -9000]),
    powerDistrict: Object.freeze([-920, -9380]),
    hospitalDistrict: Object.freeze([940, -8620]),
    northernLane: Object.freeze([0, 900]),
    westernLane: Object.freeze([-9800, -8000]),
    easternLane: Object.freeze([9800, -7800]),
    arcaEntry: Object.freeze([-5200, -4700]),
    arcaExit: Object.freeze([5200, -11800])
  });

  ctx.addWorldPreset("migalCityNight", {
    ...base,
    label: "MIGAL CITY — NIGHT OF NUMBERS",
    regionId: "migal_city",
    sectorIds: Object.freeze(["central_medical", "power_district", "military_root", "atoll_port"]),
    variant: "war_day_23_night_defence",
    missionAnchors,
    previewFocus: [0, -9000],
    fog: { ...base.fog, far: 7600 },
    atmosphere: { ...base.atmosphere, seed: 0x4d494731, haze: 0.052 },
    decor: {
      ...base.decor,
      seed: 0x4d494732,
      city: {
        ...base.decor.city,
        windows: { ...base.decor.city.windows, lit: 0.24 },
        grid: { ...base.decor.city.grid, max: 17000 }
      }
    }
  });

  ctx.addWorldDecorator("migalCityDistrictLandmarks", {
    worlds: ["migalCityNight"],
    build({ THREE, addRoot, keepGeometry, keepMaterial, surfaceHeightAt }) {
      const root = new THREE.Group();
      root.name = "migalCityDistrictLandmarks";
      addRoot(root);
      const boxGeo = keepGeometry(new THREE.BoxGeometry(1, 1, 1));
      const cylGeo = keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 18));
      const ringGeo = keepGeometry(new THREE.TorusGeometry(1, 0.1, 8, 32));
      const mat = (color, emissive = 0, intensity = 0) => keepMaterial(new THREE.MeshStandardMaterial({
        color, roughness: 0.64, metalness: 0.18,
        emissive, emissiveIntensity: intensity
      }));
      const concrete = mat(0x68717d);
      const dark = mat(0x1a202b);
      const rootGlow = mat(0x80d7ff, 0x42aeea, 2.2);
      const powerGlow = mat(0xffb347, 0xff7a24, 2.0);
      const medicalGlow = mat(0xeafcff, 0x7fffe2, 2.5);
      const red = mat(0xff6b5b, 0xff3b30, 2.0);
      const put = (geo, material, x, y, z, sx, sy, sz) => {
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.set(x, y, z);
        mesh.scale.set(sx, sy, sz);
        root.add(mesh);
        return mesh;
      };
      const ground = (x, z) => surfaceHeightAt(x, z);

      // Military ROOT: a narrow authenticated-data tower with three cyan rings.
      {
        const x = 0, z = -9000, y = ground(x, z);
        put(boxGeo, dark, x, y + 112, z, 54, 224, 54);
        put(boxGeo, concrete, x, y + 235, z, 34, 24, 34);
        for (const h of [58, 126, 194]) {
          const ring = put(ringGeo, rootGlow, x, y + h, z, 74, 74, 74);
          ring.rotation.x = Math.PI / 2;
        }
        put(boxGeo, rootGlow, x, y + 252, z, 7, 42, 7);
      }

      // Medical district: low white blocks, roof helipad and a luminous cross.
      {
        const x = 940, z = -8620, y = ground(x, z);
        put(boxGeo, concrete, x, y + 34, z, 210, 68, 150);
        put(boxGeo, medicalGlow, x, y + 71, z, 68, 5, 68);
        put(boxGeo, medicalGlow, x, y + 106, z, 12, 66, 8);
        put(boxGeo, medicalGlow, x, y + 106, z, 58, 12, 8);
      }

      // Power district: transformer rows and orange obstruction stacks.
      {
        const x = -920, z = -9380, y = ground(x, z);
        for (let row = -1; row <= 1; row += 1) {
          put(boxGeo, dark, x + row * 145, y + 24, z, 112, 48, 82);
          for (let col = -1; col <= 1; col += 1) {
            put(cylGeo, powerGlow, x + row * 145 + col * 28, y + 66, z, 5, 72, 5);
          }
        }
        for (const dx of [-230, 230]) {
          put(cylGeo, concrete, x + dx, y + 76, z - 70, 18, 152, 18);
          put(boxGeo, red, x + dx, y + 158, z - 70, 16, 8, 16);
        }
      }
    }
  });
}
