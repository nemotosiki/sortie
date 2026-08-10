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


def patch_engine() -> None:
    source = INDEX.read_text(encoding="utf-8")

    source = replace_once(
        source,
        '''    function buildMountainGeometry(rng, snowy, shape) {
      const geo = new THREE.CylinderGeometry(shape.topRadius, 1, 1, 16, 5, false);''',
        '''    function buildMountainGeometry(rng, snowy, shape) {
      const radialSegments = Math.max(8, Math.round(shape.radialSegments || 16));
      const geo = new THREE.CylinderGeometry(shape.topRadius, 1, 1, radialSegments, 5, false);''',
        "mountain radial segment support",
    )

    source = replace_once(
        source,
        '''          const displaced = 1 + amp1 * Math.sin(3 * theta + phase1) +
            amp2 * Math.sin(7 * theta + phase2) +
            0.05 * Math.sin(11 * theta + y * 9);''',
        '''          const edgeNoise = Number.isFinite(shape.edgeNoise) ? shape.edgeNoise : 1;
          const displaced = 1 + edgeNoise * (
            amp1 * Math.sin(3 * theta + phase1) +
            amp2 * Math.sin(7 * theta + phase2) +
            0.05 * Math.sin(11 * theta + y * 9)
          );''',
        "mountain edge noise support",
    )

    source = replace_once(
        source,
        '''          palette: mountainConfig.palette,
          snowLine: mountainConfig.snowLine,
          topRadius: plateau ? plateau.topRadius : 0.08
        })), snowy ? mountainMaterials.snow : mountainMaterials.bare);
        const depth = radius * (0.75 + rng() * 0.35);
        mountain.scale.set(radius, height, depth);
        mountain.rotation.y = rng() * Math.PI * 2;''',
        '''          palette: mountainConfig.palette,
          snowLine: mountainConfig.snowLine,
          topRadius: plateau ? plateau.topRadius : 0.08,
          radialSegments: plateau?.radialSegments,
          edgeNoise: plateau?.edgeNoise
        })), snowy ? mountainMaterials.snow : mountainMaterials.bare);
        // The random draws are still consumed when a plateau authors an exact
        // footprint. That keeps every later mountain, island and cloud in the
        // same deterministic place on all existing maps.
        const sampledDepth = radius * (0.75 + rng() * 0.35);
        const depth = plateau && Number.isFinite(plateau.depth)
          ? plateau.depth
          : sampledDepth;
        mountain.scale.set(radius, height, depth);
        const sampledRotationY = rng() * Math.PI * 2;
        mountain.rotation.y = plateau && Number.isFinite(plateau.rotationY)
          ? plateau.rotationY
          : sampledRotationY;''',
        "authored plateau footprint support",
    )

    source = replace_once(
        source,
        '''      // "The middle of the land". A plateau IS the land on every map that has
      // one (there is no heightfield), so its centre is the only defensible
      // aim point; failing that, sceneryOrigin is where a map that moved its
      // subject off the origin says the subject went. Origin last.
      const plateauAt = preset.mountains && preset.mountains.plateau
        ? preset.mountains.plateau.at
        : null;
      const centre = plateauAt || preset.sceneryOrigin || [0, 0];''',
        '''      // A long coastal plateau may be shifted inland so its far edge stays
      // beyond the flight horizon. `previewFocus` lets that map keep the camera
      // aimed at the authored city/airfield rather than at empty back-country.
      // Existing presets omit it and retain the old plateau/scenery fallback.
      const plateauAt = preset.mountains && preset.mountains.plateau
        ? preset.mountains.plateau.at
        : null;
      const centre = preset.previewFocus || plateauAt || preset.sceneryOrigin || [0, 0];''',
        "world preview focus support",
    )

    INDEX.write_text(source, encoding="utf-8", newline="\n")


def patch_map_and_check() -> None:
    old_header = '''  label: "REN BAY",
  sceneryOrigin: [0, 4300],'''
    new_header = '''  label: "REN BAY",
  sceneryOrigin: [0, 4300],
  // The gameplay plateau is shifted inland to place its north/side edges
  // beyond fog, but previews must keep looking at the airport and city.
  previewFocus: [0, 4300],'''

    old_plateau = '''    plateau: { radius: [5600, 5600], height: [28, 28], topRadius: 0.92, at: [0, 4300], snowyAbove: 9999 }'''
    new_plateau = '''    // Wide coastal back-country. The old 5.6 km random ellipse ended inside
    // the 12.5 km fog range, exposing its polygon edge from normal M01 altitude.
    // Keep the south shoreline in the same place while moving every other edge
    // well past the visible horizon. Low edge noise and extra radial segments
    // remove the giant faceted silhouette without adding meaningful GPU cost.
    plateau: {
      radius: [16000, 16000], depth: 10500, height: [28, 28],
      topRadius: 0.92, at: [0, 9200], rotationY: 0,
      radialSegments: 48, edgeNoise: 0.18, snowyAbove: 9999
    }'''

    payload = MAP.read_text(encoding="utf-8")
    payload = replace_once(payload, old_header, new_header, "Ren Bay preview focus")
    payload = replace_once(payload, old_plateau, new_plateau, "Ren Bay plateau footprint")
    MAP.write_text(payload, encoding="utf-8", newline="\n")

    index = INDEX.read_text(encoding="utf-8")
    index = replace_once(
        index,
        old_header.replace("\n  ", "\n        ").replace("  label", "        label"),
        new_header.replace("\n  ", "\n        ").replace("  label", "        label"),
        "inlined Ren Bay preview focus",
    )
    index = replace_once(
        index,
        old_plateau.replace("    plateau", "          plateau"),
        new_plateau.replace("\n    ", "\n          ").replace("    //", "          //").replace("    plateau", "          plateau"),
        "inlined Ren Bay plateau footprint",
    )
    INDEX.write_text(index, encoding="utf-8", newline="\n")

    check = CHECK.read_text(encoding="utf-8")
    check = replace_once(
        check,
        '''const payloadPath = path.join(ROOT, "payloads", "map_renBay.payload.js");
const source = fs.readFileSync(payloadPath, "utf8");''',
        '''const payloadPath = path.join(ROOT, "payloads", "map_renBay.payload.js");
const indexPath = path.join(ROOT, "index.html");
const source = fs.readFileSync(payloadPath, "utf8");
const hostSource = fs.readFileSync(indexPath, "utf8");''',
        "Ren Bay host source check",
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

  // The authored x edge must remain beyond the 12.5 km fog limit. Along z,
  // shifting the 10.5 km depth inland preserves the southern shoreline at
  // -1.3 km while pushing the north edge to 19.7 km.
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
        "Ren Bay horizon contract",
    )
    check = replace_once(
        check,
        '''  console.log(`  districts=${city.districts.length} outer=${city.districts.at(-1).r[1]}m maxHeight=${city.maxHeight}m`);''',
        '''  console.log(`  districts=${city.districts.length} outer=${city.districts.at(-1).r[1]}m maxHeight=${city.maxHeight}m`);
  console.log(`  plateau=16000x10500m south=-1300m north=19700m fog=${preset.fog.far}m`);''',
        "Ren Bay check summary",
    )
    CHECK.write_text(check, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    import sys
    phase = sys.argv[1] if len(sys.argv) > 1 else "all"
    if phase in {"engine", "all"}:
        patch_engine()
        print("apply_ren_bay_horizon_fix: engine footprint controls applied")
    if phase in {"map", "all"}:
        patch_map_and_check()
        print("apply_ren_bay_horizon_fix: Ren Bay horizon footprint applied")
