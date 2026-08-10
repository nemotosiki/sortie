#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAYLOAD = ROOT / "payloads" / "mission_sera_m02.payload.js"
CHECK = ROOT / "tools" / "check_sera_m02_payload.mjs"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


source = PAYLOAD.read_text(encoding="utf-8")
source = replace_once(
    source,
    "//   index.html?payloads=payloads/ground_tel.payload.js,payloads/map_amalPlain.payload.js,payloads/mission_sera_m02.payload.js",
    "//   index.html?payloads=payloads/map_amalPlain.payload.js,payloads/mission_sera_m02.payload.js",
    "M02 development URL",
)
source = replace_once(
    source,
    '''        types: ["mig29", "mig29", "mig29", "mig29"],
        band: 1,
        idBase: 0,''',
    '''        types: ["mig29", "mig29", "mig29", "mig29"],
        // Preserve the stock mission sequence schema. A zero delay keeps the
        // opening immediate while retaining sequence[].delay for registry QA.
        delay: 0,
        band: 1,
        idBase: 0,''',
    "M02 sequence delay schema",
)
PAYLOAD.write_text(source, encoding="utf-8")

check = CHECK.read_text(encoding="utf-8")
anchor = '''assert(source.includes('world: "amalPlain"'), "M02 does not select Amal Plain");'''
replacement = '''assert(source.includes('world: "amalPlain"'), "M02 does not select Amal Plain");
assert(source.includes('delay: 0,'), "stock sequence[].delay schema was not preserved");'''
check = replace_once(check, anchor, replacement, "M02 delay schema check")
CHECK.write_text(check, encoding="utf-8")

print("apply_sera_m02_payload_schema: preserved sequence[].delay and corrected the development URL")
