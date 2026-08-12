#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const payloadSource = fs.readFileSync(path.join(root, "payloads", "map_naharStrait.payload.js"), "utf8");
const fail = (message) => { throw new Error(`check_render_distance_contract: ${message}`); };
const assert = (condition, message) => { if (!condition) fail(message); };

for (const token of [
  "const CAMERA_BASE_FAR = 7000;",
  "const CAMERA_FOG_FAR_MARGIN = 1.2;",
  "preset.fog.far * CAMERA_FOG_FAR_MARGIN",
  "camera.far = cameraFar;",
  "camera.updateProjectionMatrix();",
  "renderDistanceProbe: () =>",
  "insideCameraFar: distance < camera.far",
  "fogVisibility: Number("
]) assert(index.includes(token), `missing ${token}`);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sortie-render-distance-"));
const modulePath = path.join(tempDir, "map_naharStrait.mjs");
fs.writeFileSync(modulePath, payloadSource, "utf8");
try {
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  const WORLD_PRESETS = {
    sunsetOcean: {
      atmosphere: {}, ocean: {}, terrain: {}, mountains: {}, clouds: {}, decor: {}
    }
  };
  let preset = null;
  register({
    tables: { WORLD_PRESETS },
    addWorldPreset(key, definition) {
      WORLD_PRESETS[key] = definition;
      if (key === "naharStrait") preset = definition;
    },
    addWorldDecorator() {}
  });
  assert(preset, "Nahar Strait preset did not register");

  const cameraFar = Math.ceil(Math.max(7000, preset.fog.far * 1.2) / 1000) * 1000;
  const oceanSize = Math.ceil(Math.max(12000, preset.fog.far * 2.8) / 1000) * 1000;
  const openingDistance = Math.hypot(11500 - (-7200), 0 - (-4200));
  const openingVisibility = Math.max(0, Math.min(1,
    (preset.fog.far - openingDistance) / (preset.fog.far - preset.fog.near)
  ));

  assert(preset.fog.near === 12000 && preset.fog.far === 40000,
    `unexpected Nahar fog ${preset.fog.near}/${preset.fog.far}`);
  assert(cameraFar === 48000, `Nahar camera far should be 48000m, got ${cameraFar}`);
  assert(cameraFar > openingDistance, "opening fleet is outside the camera far plane");
  assert(openingVisibility >= 0.7,
    `opening fleet visibility ${(openingVisibility * 100).toFixed(1)}% is still too low`);
  assert(oceanSize * 0.5 > cameraFar,
    `ocean rim ${oceanSize * 0.5}m can enter the ${cameraFar}m camera frustum`);

  console.log("check_render_distance_contract: PASS");
  console.log(
    `  Nahar opening=${openingDistance.toFixed(1)}m visibility=${(openingVisibility * 100).toFixed(1)}% `
    + `fog=${preset.fog.near}/${preset.fog.far} cameraFar=${cameraFar} ocean=${oceanSize}`
  );
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
