#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
CHECK = ROOT / "tools" / "check_ocean_horizon_coverage.mjs"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def sub_once(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.MULTILINE)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one regex match, found {count}")
    return updated


text = INDEX.read_text(encoding="utf-8")

text = sub_once(
    text,
    r'''    // The ocean is a finite plane that rides with the camera, so this only has\n    // to out-reach the fog \(far 2600-3350 by preset\) with margin for the\n    // horizon at altitude - not cover the playable area\.\n    const OCEAN_PLANE_SIZE = 12000;''',
    '''    // Reference/minimum size for the camera-following ocean. createWorld\n    // expands it per preset so the nearest rim stays beyond fog far. Texture\n    // repeat counts scale with the mesh, preserving the established physical\n    // wave size instead of stretching the sea on long-visibility maps.\n    const OCEAN_PLANE_SIZE = 12000;\n    const OCEAN_FOG_MARGIN = 2.8;''',
    "ocean size comment and margin",
)

if "const oceanPlaneSize = Math.ceil(" not in text:
    text = replace_once(
        text,
        "      const preset = WORLD_PRESETS[key];\n",
        "      const preset = WORLD_PRESETS[key];\n"
        "      const oceanPlaneSize = Math.ceil(\n"
        "        Math.max(OCEAN_PLANE_SIZE, preset.fog.far * OCEAN_FOG_MARGIN) / 1000\n"
        "      ) * 1000;\n"
        "      const oceanRepeatScale = oceanPlaneSize / OCEAN_PLANE_SIZE;\n",
        "per-preset ocean size",
    )

text = replace_once(
    text,
    "      oceanTexture.repeat.set(preset.ocean.repeat, preset.ocean.repeat);\n",
    "      const oceanColorRepeat = preset.ocean.repeat * oceanRepeatScale;\n"
    "      oceanTexture.repeat.set(oceanColorRepeat, oceanColorRepeat);\n",
    "ocean color repeat scaling",
)
text = replace_once(
    text,
    "      const oceanNormalRepeat = preset.ocean.normalRepeat || preset.ocean.repeat * 1.62;\n",
    "      const oceanNormalRepeat = (preset.ocean.normalRepeat || preset.ocean.repeat * 1.62) * oceanRepeatScale;\n",
    "ocean normal repeat scaling",
)
text = replace_once(
    text,
    "      const oceanNormalTiles = oceanNormalRepeats.map((repeat) => OCEAN_PLANE_SIZE / repeat);\n",
    "      const oceanNormalTiles = oceanNormalRepeats.map((repeat) => oceanPlaneSize / repeat);\n",
    "ocean normal tile physical scale",
)
text = replace_once(
    text,
    "      const oceanGeometry = keepGeometry(new THREE.PlaneGeometry(OCEAN_PLANE_SIZE, OCEAN_PLANE_SIZE, 1, 1));\n",
    "      const oceanGeometry = keepGeometry(new THREE.PlaneGeometry(oceanPlaneSize, oceanPlaneSize, 1, 1));\n",
    "fog-aware ocean geometry",
)
text = replace_once(
    text,
    "      const oceanTileSize = OCEAN_PLANE_SIZE / preset.ocean.repeat;\n",
    "      const oceanTileSize = oceanPlaneSize / oceanColorRepeat;\n",
    "ocean color tile physical scale",
)
text = replace_once(
    text,
    "        ocean, oceanTileSize, oceanColorSpeed, oceanNormalTileSize, oceanNormalTiles, oceanNormalSpeeds, oceanWaveOffsets, sunRoad,\n",
    "        ocean, oceanPlaneSize, oceanTileSize, oceanColorSpeed, oceanNormalTileSize, oceanNormalTiles, oceanNormalSpeeds, oceanWaveOffsets, sunRoad,\n",
    "world ocean size export",
)
text = replace_once(
    text,
    "          planeZ: world.ocean ? world.ocean.position.z : null,\n          camX: camera.position.x,\n",
    "          planeZ: world.ocean ? world.ocean.position.z : null,\n"
    "          size: world.oceanPlaneSize || null,\n"
    "          camX: camera.position.x,\n",
    "ocean probe size",
)
text = sub_once(
    text,
    r'''      // The ocean plane is finite \(OCEAN_PLANE_SIZE\), so left alone its rim\n      // shows up as "the world ends" after ~18s of boost\. Snap it under the\n      // camera every frame and cancel the snap in UV space: the mesh follows,\n      // the wave pattern stays pinned to the world, so the player still reads\n      // motion across the water\.''',
    '''      // The ocean plane is finite, but createWorld sizes it from this map's\n      // fog range so its rim is already fully hidden. It still snaps under the\n      // camera every frame; the UV cancellation keeps the wave field pinned to\n      // world space while the geometry follows the player.''',
    "ocean follow comment",
)

INDEX.write_text(text, encoding="utf-8", newline="\n")

CHECK.write_text(r'''import fs from "node:fs";
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
''', encoding="utf-8", newline="\n")

print("apply_ocean_horizon_fix: fog-aware ocean geometry and regression contract applied")
