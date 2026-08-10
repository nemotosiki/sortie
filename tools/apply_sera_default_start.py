#!/usr/bin/env python3
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]

subprocess.run([
    "node", str(ROOT / "tools" / "inline_payload.mjs"),
    str(ROOT / "payloads" / "map_renBay.payload.js"),
    str(ROOT / "payloads" / "mission_sera_m01.payload.js"),
    str(ROOT / "payloads" / "map_amalPlain.payload.js"),
    str(ROOT / "payloads" / "mission_sera_m02.payload.js"),
], cwd=ROOT, check=True)

replacements = {
    ROOT / "tools" / "check_sera_m01_e2e.mjs": (
        'const missionUrl = `${baseUrl}/index.html?payloads=payloads/map_renBay.payload.js,payloads/mission_sera_m01.payload.js`;',
        'const missionUrl = `${baseUrl}/index.html`;'
    ),
    ROOT / "tools" / "check_sera_m02_e2e.mjs": (
        'const missionUrl = `${baseUrl}/index.html?payloads=payloads/map_amalPlain.payload.js,payloads/mission_sera_m02.payload.js`;',
        'const missionUrl = `${baseUrl}/index.html`;'
    ),
}

for path, (old, new) in replacements.items():
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path.name}: expected one development missionUrl, found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8", newline="\n")

index = (ROOT / "index.html").read_text(encoding="utf-8")
for marker in (
    "@payload:map_renBay",
    "@payload:mission_sera_m01",
    "@payload:map_amalPlain",
    "@payload:mission_sera_m02",
):
    if marker not in index:
        raise SystemExit(f"missing inline marker: {marker}")

print("apply_sera_default_start: M01/M02 are now present in normal index.html startup")
