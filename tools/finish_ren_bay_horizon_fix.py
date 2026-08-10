#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
MAP = ROOT / "payloads" / "map_renBay.payload.js"
CHECK = ROOT / "tools" / "check_map_ren_bay.mjs"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


PAYLOAD_HEADER_OLD = '''    label: "REN BAY",
    sceneryOrigin: [0, 4300],'''
PAYLOAD_HEADER_NEW = '''    label: "REN BAY",
    sceneryOrigin: [0, 4300],
    // The gameplay plateau is shifted inland to place its north/side edges
    // beyond fog, but previews must keep looking at the airport and city.
    previewFocus: [0, 4300],'''

INLINE_HEADER_OLD = '''          label: "REN BAY",
          sceneryOrigin: [0, 4300],'''
INLINE_HEADER_NEW = '''          label: "REN BAY",
          sceneryOrigin: [0, 4300],
          // The gameplay plateau is shifted inland to place its north/side edges
          // beyond fog, but previews must keep looking at the airport and city.
          previewFocus: [0, 4300],'''

PAYLOAD_PLATEAU_OLD = '''    plateau: { radius: [5600, 5600], height: [28, 28], topRadius: 0.92, at: [0, 4300], snowyAbove: 9999 }'''
PAYLOAD_PLATEAU_NEW = '''    // Wide coastal back-country. The old 5.6 km random ellipse ended inside
    // the 12.5 km fog range, exposing its polygon edge from normal M01 altitude.
    // Keep the south shoreline in the same place while moving every other edge
    // well past the visible horizon. Low edge noise and extra radial segments
    // remove the giant faceted silhouette without meaningful GPU cost.
    plateau: {
      radius: [16000, 16000], depth: 10500, height: [28, 28],
      topRadius: 0.92, at: [0, 9200], rotationY: 0,
      radialSegments: 48, edgeNoise: 0.18, snowyAbove: 9999
    }'''

INLINE_PLATEAU_OLD = '''          plateau: { radius: [5600, 5600], height: [28, 28], topRadius: 0.92, at: [0, 4300], snowyAbove: 9999 }'''
INLINE_PLATEAU_NEW = '''          // Wide coastal back-country. The old 5.6 km random ellipse ended inside
          // the 12.5 km fog range, exposing its polygon edge from normal M01 altitude.
          // Keep the south shoreline in the same place while moving every other edge
          // well past the visible horizon. Low edge noise and extra radial segments
          // remove the giant faceted silhouette without meaningful GPU cost.
          plateau: {
            radius: [16000, 16000], depth: 10500, height: [28, 28],
            topRadius: 0.92, at: [0, 9200], rotationY: 0,
            radialSegments: 48, edgeNoise: 0.18, snowyAbove: 9999
          }'''


def patch_map() -> None:
    payload = MAP.read_text(encoding="utf-8")
    payload = replace_once(payload, PAYLOAD_HEADER_OLD, PAYLOAD_HEADER_NEW, "payload preview focus")
    payload = replace_once(payload, PAYLOAD_PLATEAU_OLD, PAYLOAD_PLATEAU_NEW, "payload plateau")
    MAP.write_text(payload, encoding="utf-8", newline="\n")

    index = INDEX.read_text(encoding="utf-8")
    index = replace_once(index, INLINE_HEADER_OLD, INLINE_HEADER_NEW, "inline preview focus")
    index = replace_once(index, INLINE_PLATEAU_OLD, INLINE_PLATEAU_NEW, "inline plateau")
    INDEX.write_text(index, encoding="utf-8", newline="\n")


def patch_check() -> None:
    check = CHECK.read_text(encoding="utf-8")
    check = replace_once(
        check,
        '''const payloadPath = path.join(ROOT, "payloads", "map_renBay.payload.js");
const source = fs.readFileSync(payloadPath, "utf8");''',
        '''const payloadPath = path.join(ROOT, "payloads", "map_renBay.payload.js");
const indexPath = path.join(ROOT, "index.html");
const source = fs.readFileSync(payloadPath, "utf8");
const hostSource = fs.readFileSync(indexPath, "utf8");''',
        "host source setup",
    )
    check = replace_once(
        check,
        '''  must(preset.mountains?.plateau?.at?.[0] === city.at[0]
    && preset.mountains?.plateau?.at?.[1] === city.at[1],
  "city and plateau anchors must match exactly");''',
        '''  const plateau = preset.mountains?.plateau;
  must(plateau, "coastal plateau is missing");
  must(plateau.radius?.[0] === 16000 && plateau.radius?.[1] === 16000,
    "coastal plateau lateral range regressed");
  must(plateau.depth === 10500 && plateau.rotationY === 0,
    "coastal plateau depth/heading regressed");
  must(plateau.at?.[0] === 0 && plateau.at?.[1] === 9200,
    "coastal plateau inland shift regressed");
  must(plateau.topRadius === 0.92 && plateau.radialSegments === 48 && plateau.edgeNoise === 0.18,
    "coastal plateau silhouette controls regressed");
  must(preset.previewFocus?.[0] === city.at[0] && preset.previewFocus?.[1] === city.at[1],
    "preview focus must remain on the city/airport");

  // Even at the maximum authored edge contraction, the lateral land edge is
  // outside 12.5 km fog. The z shift preserves the southern coast at -1.3 km
  // while moving the rear edge to 19.7 km.
  const fogFar = preset.fog?.far;
  const lateralEdge = plateau.radius[0] * (1 - 0.48 * plateau.edgeNoise);
  const southEdge = plateau.at[1] - plateau.depth;
  const northEdge = plateau.at[1] + plateau.depth;
  must(lateralEdge > fogFar, `plateau side edge ${lateralEdge}m is still inside fog ${fogFar}m`);
  must(southEdge === -1300, `south shoreline moved to ${southEdge}m`);
  must(northEdge > fogFar + 6000, `north edge ${northEdge}m is still too close`);

  const cityRho = Math.hypot(
    (city.at[0] - plateau.at[0]) / plateau.radius[0],
    (city.at[1] - plateau.at[1]) / plateau.depth
  );
  must(cityRho < plateau.topRadius * 0.6, "city/airport no longer sits safely on the flat cap");

  for (const token of [
    "const radialSegments = Math.max(8, Math.round(shape.radialSegments || 16));",
    "const sampledDepth = radius * (0.75 + rng() * 0.35);",
    "Number.isFinite(plateau.depth)",
    "Number.isFinite(plateau.rotationY)",
    "const centre = preset.previewFocus || plateauAt || preset.sceneryOrigin || [0, 0];"
  ]) {
    must(hostSource.includes(token), `host lacks ${token}`);
  }
  must(hostSource.includes('radialSegments: 48, edgeNoise: 0.18'),
    "normal-start index does not contain the repaired Ren Bay footprint");''',
        "horizon contract",
    )
    check = replace_once(
        check,
        '''  console.log(`  districts=${city.districts.length} outer=${city.districts.at(-1).r[1]}m maxHeight=${city.maxHeight}m`);''',
        '''  console.log(`  districts=${city.districts.length} outer=${city.districts.at(-1).r[1]}m maxHeight=${city.maxHeight}m`);
  console.log(`  plateau=16000x10500m south=-1300m north=19700m fog=${preset.fog.far}m`);''',
        "check summary",
    )
    CHECK.write_text(check, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    patch_map()
    patch_check()
    print("finish_ren_bay_horizon_fix: map and horizon regression contract applied")
