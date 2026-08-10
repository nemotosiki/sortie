#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MAP = ROOT / "payloads" / "map_renBay.payload.js"
INDEX = ROOT / "index.html"
CHECK = ROOT / "tools" / "check_map_ren_bay.mjs"
PAYLOAD_NAME = "map_renBay"

OLD_PLATEAU = re.compile(
    r"(?ms)^      // Wide coastal back-country\. The old 5\.6 km random ellipse ended inside\n"
    r"^    // the 12\.5 km fog range, exposing its polygon edge from normal M01 altitude\.\n"
    r"^    // Keep the south shoreline in the same place while moving every other edge\n"
    r"^    // well past the visible horizon\. Low edge noise and extra radial segments\n"
    r"^    // remove the giant faceted silhouette without meaningful GPU cost\.\n"
    r"^    plateau: \{\n"
    r"^      radius: \[16000, 16000\], depth: 10500, height: \[28, 28\],\n"
    r"^      topRadius: 0\.92, at: \[0, 9200\], rotationY: 0,\n"
    r"^      radialSegments: 48, edgeNoise: 0\.18, snowyAbove: 9999\n"
    r"^    \}\n"
)

NEW_PLATEAU = """      // Continental back-country, not a finite island. The earlier 16 km
      // ellipse was wide only at its centre; near the southern approach it
      // tapered to a narrow point, so both side edges were visible in the M01
      // opening shot. Keep a real coast just ahead of the spawn, then move the
      // side and rear boundaries far beyond the 12.5 km fog horizon.
      plateau: {
        radius: [60000, 60000], depth: 24000, height: [28, 28],
        topRadius: 0.96, at: [0, 18000], rotationY: 0,
        radialSegments: 96, edgeNoise: 0.04, snowyAbove: 9999
      }
"""

CHECK_SOURCE = r'''import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const payloadPath = path.join(ROOT, "payloads", "map_renBay.payload.js");
const indexPath = path.join(ROOT, "index.html");
const source = fs.readFileSync(payloadPath, "utf8");
const hostSource = fs.readFileSync(indexPath, "utf8");
const must = (condition, message) => {
  if (!condition) throw new Error(`check_map_ren_bay: ${message}`);
};

must(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'ctx.addWorldPreset("renBay"',
  'ctx.addWorldDecorator("renBayWorks"',
  'worlds: ["renBay"]',
  'Medical aviation district',
  'Airport: two parallel runways'
]) {
  must(source.includes(token), `missing ${token}`);
}
must(!/\bscene\.add\s*\(/.test(source), "decorator must not use scene.add");
must(!/\bdispose\s*\(/.test(source), "decorator must not own disposal");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ren-bay-check-"));
const tempModule = path.join(tempDir, "map_renBay.mjs");
fs.writeFileSync(tempModule, source, "utf8");

try {
  const { default: register } = await import(`${pathToFileURL(tempModule).href}?v=${Date.now()}`);
  let preset = null;
  let decorator = null;
  register({
    addWorldPreset(key, def) {
      must(key === "renBay", `unexpected preset key ${key}`);
      preset = def;
    },
    addWorldDecorator(id, def) {
      must(id === "renBayWorks", `unexpected decorator id ${id}`);
      decorator = def;
    }
  });

  must(preset && decorator, "preset or decorator was not registered");
  const city = preset.decor?.city;
  must(city, "city config is missing");
  must(Array.isArray(city.at) && city.at.length === 2, "city anchor is malformed");
  must(Array.isArray(city.districts) && city.districts.length >= 2, "city districts are missing");
  for (const [index, district] of city.districts.entries()) {
    must(Array.isArray(district.r) && district.r.length === 2,
      `district ${index} must use the createWorld r:[inner,outer] schema`);
    must(Array.isArray(district.height) && district.height.length === 2,
      `district ${index} must use the createWorld height:[min,max] schema`);
    must(Number.isFinite(district.fill), `district ${index} fill is missing`);
  }
  must(Number.isFinite(city.maxHeight), "city.maxHeight is missing");
  must(Number.isFinite(city.wall) && Number.isFinite(city.roof), "city materials are missing");
  must(city.windows && Number.isFinite(city.windows.lit), "city window sheet is missing");
  must(city.districts.at(-1).r[1] <= 2200, "city extends past the intended low-rise bay district");

  const plateau = preset.mountains?.plateau;
  must(plateau, "coastal plateau is missing");
  must(plateau.radius?.[0] === 60000 && plateau.radius?.[1] === 60000,
    "continental plateau lateral range regressed");
  must(plateau.depth === 24000 && plateau.rotationY === 0,
    "continental plateau depth/heading regressed");
  must(plateau.at?.[0] === 0 && plateau.at?.[1] === 18000,
    "continental plateau inland shift regressed");
  must(plateau.topRadius === 0.96 && plateau.radialSegments === 96 && plateau.edgeNoise === 0.04,
    "continental plateau silhouette controls regressed");
  must(preset.previewFocus?.[0] === city.at[0] && preset.previewFocus?.[1] === city.at[1],
    "preview focus must remain on the city/airport");

  const fogFar = preset.fog?.far;
  must(Number.isFinite(fogFar), "fog far distance is missing");

  // buildMountainGeometry can contract an edge by at most
  // edgeNoise * (0.27 + 0.16 + 0.05). Test the ellipse where the player
  // actually sees it, not only at its widest centre. The previous test checked
  // the centre span and missed the narrow southern cross-section visible in the
  // user screenshot.
  const worstEdgeScale = 1 - 0.48 * plateau.edgeNoise;
  const halfWidthAt = (z) => {
    const zn = (z - plateau.at[1]) / plateau.depth;
    const squared = worstEdgeScale ** 2 - zn ** 2;
    return squared > 0 ? plateau.radius[0] * Math.sqrt(squared) : 0;
  };
  const approachSamples = [
    { label: "coastline pass", x: -6200, z: -4000 },
    { label: "18-second M01 approach", x: -4200, z: -3200 },
    { label: "bay crossing", x: -2500, z: 0 },
    { label: "airport/city", x: 0, z: city.at[1] }
  ];
  for (const sample of approachSamples) {
    const halfWidth = halfWidthAt(sample.z);
    const sideClearance = halfWidth - Math.abs(sample.x);
    must(sideClearance > fogFar + 1000,
      `${sample.label}: side edge clearance ${sideClearance.toFixed(1)}m is inside fog ${fogFar}m`);
  }

  const nominalSouthEdge = plateau.at[1] - plateau.depth;
  const flatSouthEdge = plateau.at[1] - plateau.depth * plateau.topRadius;
  const northEdge = plateau.at[1] + plateau.depth;
  must(nominalSouthEdge === -6000, `south coast moved to ${nominalSouthEdge}m`);
  must(flatSouthEdge - nominalSouthEdge <= 1200,
    `coastal slope became too deep: ${flatSouthEdge - nominalSouthEdge}m`);
  must(northEdge > fogFar + 25000, `north edge ${northEdge}m is still too close`);

  const cityRho = Math.hypot(
    (city.at[0] - plateau.at[0]) / plateau.radius[0],
    (city.at[1] - plateau.at[1]) / plateau.depth
  );
  must(cityRho < plateau.topRadius * 0.7, "city/airport no longer sits safely on the flat cap");

  for (const token of [
    "const radialSegments = Math.max(8, Math.round(shape.radialSegments || 16));",
    "const sampledDepth = radius * (0.75 + rng() * 0.35);",
    "Number.isFinite(plateau.depth)",
    "Number.isFinite(plateau.rotationY)",
    "const centre = preset.previewFocus || plateauAt || preset.sceneryOrigin || [0, 0];"
  ]) {
    must(hostSource.includes(token), `host lacks ${token}`);
  }
  must(hostSource.includes('radius: [60000, 60000], depth: 24000, height: [28, 28]'),
    "normal-start index does not contain the continental Ren Bay footprint");
  must(hostSource.includes('radialSegments: 96, edgeNoise: 0.04'),
    "normal-start index does not contain the repaired Ren Bay silhouette controls");
  must(Array.isArray(decorator.worlds) && decorator.worlds.includes("renBay"),
    "decorator is not scoped to Ren Bay");
  must(typeof decorator.build === "function", "decorator build is missing");

  console.log("check_map_ren_bay: PASS");
  console.log(`  districts=${city.districts.length} outer=${city.districts.at(-1).r[1]}m maxHeight=${city.maxHeight}m`);
  console.log(`  plateau=60000x24000m south=-6000m north=42000m fog=${fogFar}m`);
  console.log(`  approach side clearances=${approachSamples.map((sample) => Math.round(halfWidthAt(sample.z) - Math.abs(sample.x))).join("/")}m`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
'''


def replace_plateau(source: str) -> str:
    updated, count = OLD_PLATEAU.subn(NEW_PLATEAU, source, count=1)
    if count != 1:
        raise RuntimeError(f"Ren Bay plateau block: expected 1 match, found {count}")
    return updated


def inline_register_source(module_source: str) -> str:
    marker = "export default "
    at = module_source.find(marker)
    if at < 0:
        raise RuntimeError("map_renBay payload has no export default")
    register = module_source[at + len(marker):].strip()
    if register.endswith(";"):
        register = register[:-1].rstrip()
    if not register.startswith("function register(ctx)"):
        raise RuntimeError("map_renBay default export has an unexpected shape")
    block = "\n".join((f"      {line}" if line.strip() else "") for line in register.splitlines())
    return (
        "    applyPayload(\n"
        f"{block},\n"
        f"      \"{PAYLOAD_NAME}\"\n"
        f"    ); // @payload:{PAYLOAD_NAME}\n"
    )


def sync_inline_payload(index_source: str, module_source: str) -> str:
    marker = f"); // @payload:{PAYLOAD_NAME}"
    marker_at = index_source.find(marker)
    if marker_at < 0:
        raise RuntimeError(f"inline marker not found: {marker}")
    if index_source.find(marker, marker_at + 1) >= 0:
        raise RuntimeError(f"inline marker duplicated: {marker}")
    start = index_source.rfind("    applyPayload(\n", 0, marker_at)
    if start < 0:
        raise RuntimeError("could not find start of inline map_renBay block")
    end = index_source.find("\n", marker_at)
    if end < 0:
        end = len(index_source)
    else:
        end += 1
    return index_source[:start] + inline_register_source(module_source) + index_source[end:]


def main() -> None:
    map_source = MAP.read_text(encoding="utf-8")
    map_source = replace_plateau(map_source)
    MAP.write_text(map_source, encoding="utf-8", newline="\n")

    CHECK.write_text(CHECK_SOURCE, encoding="utf-8", newline="\n")

    index_source = INDEX.read_text(encoding="utf-8")
    index_source = sync_inline_payload(index_source, map_source)
    INDEX.write_text(index_source, encoding="utf-8", newline="\n")

    print("apply_ren_bay_horizon_fix: expanded continental footprint and synced normal startup")


if __name__ == "__main__":
    main()
