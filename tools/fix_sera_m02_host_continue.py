#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
CHECK = ROOT / "tools" / "check_sera_m02_host.mjs"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


source = INDEX.read_text(encoding="utf-8")
source = replace_once(
    source,
    '''        } else if (enemy.speed !== 0) {
          if (failEscapingGroundTarget(enemy)) {
            enemy.speed = 0;
            continue;
          }
          // Existing missions still park their vehicles at the last point.
          enemy.speed = 0;
        }
''',
    '''        } else if (enemy.speed !== 0) {
          // The authored M02 TEL contract may fail the sortie here. Every
          // pre-existing mobile unit still follows the legacy park-at-end path.
          failEscapingGroundTarget(enemy);
          enemy.speed = 0;
        }
''',
    "route-end control flow",
)
INDEX.write_text(source, encoding="utf-8")

check = CHECK.read_text(encoding="utf-8")
check = replace_once(
    check,
    '''assert(source.includes('if (failEscapingGroundTarget(enemy))'), "route-end TEL failure is not wired");''',
    '''assert(source.includes('failEscapingGroundTarget(enemy);'), "route-end TEL failure is not wired");''',
    "host checker route-end assertion",
)
CHECK.write_text(check, encoding="utf-8")

print("fix_sera_m02_host_continue: removed illegal continue from generated host code")
