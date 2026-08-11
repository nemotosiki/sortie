import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const index = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const payloadSource = fs.readFileSync(path.join(ROOT, "payloads", "map_renBay.payload.js"), "utf8");
const must = (condition, message) => {
  if (!condition) throw new Error(`check_ocean_horizon_coverage: ${message}`);
};

for (const token of [
  "const OCEAN_PLANE_SIZE = 12000;",
  "const OCEAN_FOG_MARGIN = 2.8;",
  "const oceanPlaneSize = Math.ceil(",
  "preset.fog.far * OCEAN_FOG_MARGIN",
  "const oceanRepeatScale = oceanPlaneSize / OCEAN_PLANE_SIZE;",
  "const oceanColorRepeat = preset.ocean.repeat * oceanRepeatScale;",
  "new THREE.PlaneGeometry(oceanPlaneSize, oceanPlaneSize, 1, 1)",
  "const oceanTileSize = oceanPlaneSize / oceanColorRepeat;",
  "ocean, oceanPlaneSize, oceanTileSize",
  "size: world.oceanPlaneSize || null"
]) {
  must(index.includes(token), `missing ${token}`);
}
must(!index.includes("new THREE.PlaneGeometry(OCEAN_PLANE_SIZE, OCEAN_PLANE_SIZE, 1, 1)"),
  "ocean geometry still uses the fixed 12km plane");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ren-bay-ocean-"));
const modulePath = path.join(tempDir, "map_renBay.mjs");
fs.writeFileSync(modulePath, payloadSource, "utf8");
try {
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  let preset = null;
  register({
    addWorldPreset(key, definition) {
      if (key === "renBay") preset = definition;
    },
    addWorldDecorator() {}
  });
  must(preset, "Ren Bay preset did not register");
  const minimum = 12000;
  const margin = 2.8;
  const size = Math.ceil(Math.max(minimum, preset.fog.far * margin) / 1000) * 1000;
  const repeatScale = size / minimum;
  const colorRepeat = preset.ocean.repeat * repeatScale;
  const colorTile = size / colorRepeat;
  const normalRepeat = preset.ocean.normalRepeat * repeatScale;
  const normalTile = size / normalRepeat;

  must(size === 35000, `Ren Bay ocean should be 35000m, got ${size}`);
  must(size * 0.5 > preset.fog.far + 4500,
    `nearest ocean rim ${size * 0.5}m is too close to fog far ${preset.fog.far}m`);
  must(Math.abs(colorTile - 500) < 1e-9, `color wave tile stretched to ${colorTile}`);
  must(Math.abs(normalTile - (12000 / 34)) < 1e-9, `normal wave tile stretched to ${normalTile}`);

  console.log("check_ocean_horizon_coverage: PASS");
  console.log(`  Ren Bay ocean=${size}m half=${size / 2}m fog=${preset.fog.far}m colorTile=${colorTile.toFixed(1)}m normalTile=${normalTile.toFixed(1)}m`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
