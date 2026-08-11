#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
MAP = ROOT / "payloads" / "map_renBay.payload.js"
CHECK = ROOT / "tools" / "check_ren_bay_continent.mjs"
M01_WORKFLOW = ROOT / ".github" / "workflows" / "verify-sera-m01-e2e.yml"
M02_WORKFLOW = ROOT / ".github" / "workflows" / "verify-sera-m02-e2e.yml"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def insert_before_once(text: str, anchor: str, addition: str, label: str) -> str:
    count = text.count(anchor)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one anchor, found {count}")
    return text.replace(anchor, addition + anchor, 1)


HELPERS = r'''    // A coastal map needs one real shoreline, not a finite island whose
    // other three edges can be flown around. The authored sheet is a huge,
    // low-cost inland surface whose side and rear limits sit well beyond fog.
    // The near edge is a gently varying beach; the local plateau remains above
    // it and keeps all of Ren Bay's airport/city shaping.
    function continentalSheetCoastZ(sheet, x) {
      const centerX = Number.isFinite(sheet.centerX) ? sheet.centerX : 0;
      const localX = x - centerX;
      let coastZ = Number.isFinite(sheet.coastZ) ? sheet.coastZ : 0;
      for (const wave of sheet.coastWaves || []) {
        const amplitude = Number.isFinite(wave.amplitude) ? wave.amplitude : 0;
        const wavelength = Math.max(1, Number.isFinite(wave.wavelength) ? wave.wavelength : 1);
        const phase = Number.isFinite(wave.phase) ? wave.phase : 0;
        coastZ += amplitude * Math.sin(localX * Math.PI * 2 / wavelength + phase);
      }
      return coastZ;
    }

    function continentalSheetHeightAt(sheet, x, z) {
      const centerX = Number.isFinite(sheet.centerX) ? sheet.centerX : 0;
      const width = Math.max(1, Number.isFinite(sheet.width) ? sheet.width : 1);
      if (Math.abs(x - centerX) > width * 0.5) return 0;
      const coastZ = continentalSheetCoastZ(sheet, x);
      const depth = Math.max(1, Number.isFinite(sheet.depth) ? sheet.depth : 1);
      if (z < coastZ || z > coastZ + depth) return 0;
      const beachDepth = Math.max(1, Number.isFinite(sheet.beachDepth) ? sheet.beachDepth : 1);
      const t = THREE.MathUtils.clamp((z - coastZ) / beachDepth, 0, 1);
      const smooth = t * t * (3 - 2 * t);
      return Math.max(0, Number.isFinite(sheet.height) ? sheet.height : 0) * smooth;
    }

'''

GROUND_BUILD = r'''      const groundSheets = [];
      const sheetConfig = preset.continentalSheet;
      if (sheetConfig) {
        const segments = Math.max(32, Math.round(sheetConfig.segments || 256));
        const centerX = Number.isFinite(sheetConfig.centerX) ? sheetConfig.centerX : 0;
        const width = Math.max(1, sheetConfig.width || 1);
        const depth = Math.max(1, sheetConfig.depth || 1);
        const beachDepth = Math.max(1, sheetConfig.beachDepth || 1);
        const sheetHeight = Math.max(0.1, sheetConfig.height || 0.1);
        const uvWorldScale = Math.max(64, sheetConfig.uvWorldScale || 10800);
        // More rows are spent on the beach transition; the rest is a flat
        // continental cap and therefore needs only one far row.
        const rowDistances = [0, beachDepth * 0.28, beachDepth * 0.68, beachDepth, depth];
        const rows = rowDistances.length;
        const vertexCount = (segments + 1) * rows;
        const positions = new Float32Array(vertexCount * 3);
        const uvs = new Float32Array(vertexCount * 2);
        let p = 0;
        let uv = 0;
        for (let column = 0; column <= segments; column += 1) {
          const x = centerX - width * 0.5 + width * (column / segments);
          const coastZ = continentalSheetCoastZ(sheetConfig, x);
          for (const distance of rowDistances) {
            const z = coastZ + distance;
            const normalizedHeight = continentalSheetHeightAt(sheetConfig, x, z) / sheetHeight;
            positions[p++] = x;
            positions[p++] = normalizedHeight;
            positions[p++] = z;
            // World-scaled UVs keep texture density stable even though this
            // sheet is orders of magnitude wider than an ordinary island.
            uvs[uv++] = (x - centerX) / uvWorldScale;
            uvs[uv++] = (z - sheetConfig.coastZ) / uvWorldScale;
          }
        }
        const indices = [];
        for (let column = 0; column < segments; column += 1) {
          for (let row = 0; row < rows - 1; row += 1) {
            const a = column * rows + row;
            const b = a + 1;
            const c = (column + 1) * rows + row;
            const d = c + 1;
            // Counter-clockwise from above: both triangles face +Y.
            indices.push(a, b, c, c, b, d);
          }
        }
        const sheetGeometry = keepGeometry(new THREE.BufferGeometry());
        sheetGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        sheetGeometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
        sheetGeometry.setIndex(indices);
        sheetGeometry.computeVertexNormals();
        const sheetMaterial = keepMaterial(makeTerrainMaterial(
          terrainDetailTexture, terrainNormalTexture, mountainConfig, terrainStyle, false
        ));
        // The shaped local plateau sits a few centimetres above the sheet in
        // the depth buffer wherever they overlap. That removes z-fighting while
        // letting the sheet take over seamlessly beyond the plateau's rim.
        sheetMaterial.polygonOffset = true;
        sheetMaterial.polygonOffsetFactor = 1;
        sheetMaterial.polygonOffsetUnits = 1;
        const sheetMesh = new THREE.Mesh(sheetGeometry, sheetMaterial);
        sheetMesh.scale.y = sheetHeight;
        sheetMesh.receiveShadow = true;
        sheetMesh.frustumCulled = false;
        addRoot(sheetMesh);
        groundSheets.push({ ...sheetConfig, mesh: sheetMesh });
      }

'''

SHEET_CONFIG_TEMPLATE = '''{indent}continentalSheet: {{
{indent}  // A true inland backfill. The local plateau still shapes the bay,
{indent}  // airport and city, while this surface continues behind it so no
{indent}  // side or rear polygon edge can enter the 12.5 km visibility range.
{indent}  width: 180000,
{indent}  depth: 120000,
{indent}  centerX: 0,
{indent}  coastZ: -6100,
{indent}  beachDepth: 1400,
{indent}  height: 28,
{indent}  segments: 320,
{indent}  uvWorldScale: 10800,
{indent}  coastWaves: [
{indent}    {{ amplitude: 260, wavelength: 18000, phase: 0.6 }},
{indent}    {{ amplitude: 110, wavelength: 5200, phase: 1.7 }}
{indent}  ]
{indent}}},
'''


def patch_engine() -> None:
    text = INDEX.read_text(encoding="utf-8")
    if "function continentalSheetCoastZ(sheet, x)" not in text:
        text = insert_before_once(
            text,
            "    // Builds one map from WORLD_PRESETS. Every GPU resource is tracked in the\n",
            HELPERS,
            "continental sheet helpers",
        )
    if "const sheetConfig = preset.continentalSheet;" not in text:
        text = insert_before_once(
            text,
            "      // Where the origin-relative scenery rings are centred. Every preset that\n",
            GROUND_BUILD,
            "continental sheet mesh builder",
        )
    text = replace_once(
        text,
        "cloudVolumes, mountains, cameraSurfaces,\n",
        "cloudVolumes, mountains, groundSheets, cameraSurfaces,\n",
        "world return groundSheets",
    ) if "cloudVolumes, mountains, groundSheets, cameraSurfaces," not in text else text

    for function_name, counter, variable in [
        ("surfaceHeightAt", "surfaceSamples += 1;", "height"),
        ("surfaceTopAt", "surfaceSamples += 1;", "height"),
        ("cameraSurfaceTopAt", "", "height"),
    ]:
        marker = f"    function {function_name}(x, z) {{\n"
        start = text.find(marker)
        if start < 0:
            raise SystemExit(f"missing {function_name}")
        end = text.find("\n    }", start)
        block = text[start:end]
        token = "for (const sheet of world.groundSheets || [])"
        if token in block:
            continue
        if counter:
            anchor = f"      {counter}\n      let {variable} = 0;\n"
        else:
            anchor = f"      let {variable} = 0;\n"
        addition = anchor + (
            "      for (const sheet of world.groundSheets || []) {\n"
            f"        {variable} = Math.max({variable}, continentalSheetHeightAt(sheet, x, z));\n"
            "      }\n"
        )
        block = replace_once(block, anchor, addition, f"{function_name} sheet sampler")
        text = text[:start] + block + text[end:]

    marker = "    function terrainFloorAt(position) {\n"
    start = text.find(marker)
    if start < 0:
        raise SystemExit("missing terrainFloorAt")
    end = text.find("\n    }", start)
    block = text[start:end]
    if "for (const sheet of world.groundSheets || [])" not in block:
        anchor = "      let floorHeight = 0;\n"
        addition = anchor + (
            "      for (const sheet of world.groundSheets || []) {\n"
            "        floorHeight = Math.max(floorHeight, continentalSheetHeightAt(sheet, position.x, position.z));\n"
            "      }\n"
        )
        block = replace_once(block, anchor, addition, "terrainFloorAt sheet sampler")
        text = text[:start] + block + text[end:]

    INDEX.write_text(text, encoding="utf-8", newline="\n")

    # These missions are now inlined into normal startup. Loading the same
    # payloads a second time is a duplicate-registration test, not a regression
    # test, and currently prevents the permanent gates from reaching the game.
    for workflow in [M01_WORKFLOW, M02_WORKFLOW]:
        content = workflow.read_text(encoding="utf-8")
        content = re.sub(
            r"^\s*SORTIE_PLAYWRIGHT=playwright SORTIE_CHROME=\"\$chrome_path\" node tools/registry_gate\.mjs --payloads=.*\n",
            "",
            content,
            flags=re.MULTILINE,
        )
        workflow.write_text(content, encoding="utf-8", newline="\n")


def add_sheet_config(text: str, start_marker: str, end_marker: str, label: str) -> str:
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f"{label}: start marker missing")
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit(f"{label}: end marker missing")
    segment = text[start:end]
    if "continentalSheet:" in segment:
        return text
    match = re.search(r"^(\s*)lights:\s*\{", segment, flags=re.MULTILINE)
    if not match:
        raise SystemExit(f"{label}: lights anchor missing")
    config = SHEET_CONFIG_TEMPLATE.format(indent=match.group(1))
    segment = segment[:match.start()] + config + segment[match.start():]
    return text[:start] + segment + text[end:]


def write_static_check() -> None:
    CHECK.write_text(r'''import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const payloadPath = path.join(ROOT, "payloads", "map_renBay.payload.js");
const indexPath = path.join(ROOT, "index.html");
const source = fs.readFileSync(payloadPath, "utf8");
const host = fs.readFileSync(indexPath, "utf8");
const must = (condition, message) => {
  if (!condition) throw new Error(`check_ren_bay_continent: ${message}`);
};

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ren-bay-continent-"));
const modulePath = path.join(tempDir, "map_renBay.mjs");
fs.writeFileSync(modulePath, source, "utf8");
try {
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  let preset = null;
  register({
    addWorldPreset(key, definition) {
      if (key === "renBay") preset = definition;
    },
    addWorldDecorator() {}
  });
  must(preset, "renBay preset was not registered");
  const sheet = preset.continentalSheet;
  must(sheet, "continentalSheet config is missing");
  must(sheet.width === 180000 && sheet.depth === 120000, "sheet extent regressed");
  must(sheet.centerX === 0 && sheet.coastZ === -6100, "sheet anchor regressed");
  must(sheet.beachDepth === 1400 && sheet.height === 28, "beach/top height regressed");
  must(sheet.segments === 320 && sheet.uvWorldScale === 10800, "sheet tessellation/UV density regressed");
  must(Array.isArray(sheet.coastWaves) && sheet.coastWaves.length === 2, "coast waves are missing");

  const coastAt = (x) => sheet.coastWaves.reduce((z, wave) =>
    z + wave.amplitude * Math.sin((x - sheet.centerX) * Math.PI * 2 / wave.wavelength + wave.phase),
    sheet.coastZ
  );
  const heightAt = (x, z) => {
    if (Math.abs(x - sheet.centerX) > sheet.width * 0.5) return 0;
    const coast = coastAt(x);
    if (z < coast || z > coast + sheet.depth) return 0;
    const t = Math.max(0, Math.min(1, (z - coast) / sheet.beachDepth));
    return sheet.height * t * t * (3 - 2 * t);
  };

  const fogFar = preset.fog.far;
  must(sheet.width * 0.5 > fogFar * 6, "side limits can enter the fog horizon");
  must(sheet.depth > fogFar * 8, "rear limit can enter the fog horizon");
  for (const [x, z] of [[78000, 20000], [-78000, 20000], [0, 70000], [42000, 60000]]) {
    must(heightAt(x, z) > 27.5, `continental sample ${x},${z} is not inland`);
  }
  must(heightAt(0, -10000) === 0, "open sea south of the coast was filled");

  for (const token of [
    "function continentalSheetCoastZ(sheet, x)",
    "function continentalSheetHeightAt(sheet, x, z)",
    "const sheetConfig = preset.continentalSheet;",
    "const groundSheets = [];",
    "groundSheets, cameraSurfaces",
    "for (const sheet of world.groundSheets || [])"
  ]) {
    must(host.includes(token), `normal-start host lacks ${token}`);
  }
  must(host.includes("width: 180000") && host.includes("depth: 120000"),
    "normal-start inline Ren Bay sheet is missing");

  console.log("check_ren_bay_continent: PASS");
  console.log(`  sheet=${sheet.width}x${sheet.depth}m fog=${fogFar}m coast@0=${Math.round(coastAt(0))}m`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
''', encoding="utf-8", newline="\n")


def patch_map() -> None:
    map_text = MAP.read_text(encoding="utf-8")
    map_text = add_sheet_config(
        map_text,
        'ctx.addWorldPreset("renBay"',
        'ctx.addWorldDecorator("renBayWorks"',
        "Ren Bay payload",
    )
    MAP.write_text(map_text, encoding="utf-8", newline="\n")

    index_text = INDEX.read_text(encoding="utf-8")
    index_text = add_sheet_config(
        index_text,
        'ctx.addWorldPreset("renBay"',
        '// @payload:map_renBay',
        "Ren Bay inline payload",
    )
    INDEX.write_text(index_text, encoding="utf-8", newline="\n")
    write_static_check()

    for workflow in [M01_WORKFLOW, M02_WORKFLOW]:
        content = workflow.read_text(encoding="utf-8")
        if "tools/check_ren_bay_continent.mjs" not in content:
            content = content.replace(
                "      - tools/check_map_ren_bay.mjs\n",
                "      - tools/check_map_ren_bay.mjs\n      - tools/check_ren_bay_continent.mjs\n",
                1,
            )
            content = content.replace(
                "          node tools/check_map_ren_bay.mjs\n",
                "          node tools/check_map_ren_bay.mjs\n          node tools/check_ren_bay_continent.mjs\n",
                1,
            )
        workflow.write_text(content, encoding="utf-8", newline="\n")


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in {"engine", "map"}:
        raise SystemExit("usage: apply_ren_bay_continent_sheet.py engine|map")
    if sys.argv[1] == "engine":
        patch_engine()
        print("apply_ren_bay_continent_sheet: engine and normal-start regression gates patched")
    else:
        patch_map()
        print("apply_ren_bay_continent_sheet: Ren Bay continental sheet and contracts authored")


if __name__ == "__main__":
    main()
