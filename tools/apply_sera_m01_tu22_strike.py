from __future__ import annotations

from pathlib import Path
import re
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"


def main() -> None:
    original = INDEX.read_text(encoding="utf-8")
    old = '    const STRIKE_AIR_TYPES = Object.freeze(new Set(["bomber", "tu95"]));\n'
    new = (
        '    // Tu-22M3 carries the reboot M01 strike contract. Keeping this in the\n'
        '    // shared set means spawn, AI steering, first-kill radio and breach\n'
        '    // detection all agree that the Backfire is a bomber, not a fighter.\n'
        '    const STRIKE_AIR_TYPES = Object.freeze(new Set(["bomber", "tu95", "tu22m3"]));\n'
    )
    count = original.count(old)
    if count != 1:
        raise RuntimeError(f"strike-air set: expected one match, found {count}")
    text = original.replace(old, new, 1)

    for required in (
        'new Set(["bomber", "tu95", "tu22m3"])',
        "if (STRIKE_AIR_TYPES.has(spec.key) && friendlyBase)",
        "if (STRIKE_AIR_TYPES.has(enemy.type) && !bomberFirstKillFired)",
    ):
        if required not in text:
            raise RuntimeError(f"patched index missing {required!r}")

    module = re.search(r'<script type="module">\n(?P<body>.*)\n  </script>', text, re.DOTALL)
    if not module:
        raise RuntimeError("could not extract index module")
    with tempfile.TemporaryDirectory() as temp_dir:
        path = Path(temp_dir) / "index-module.mjs"
        path.write_text(module.group("body"), encoding="utf-8", newline="\n")
        subprocess.run(["node", "--check", str(path)], check=True)

    if "\r" in text:
        raise RuntimeError("index.html must remain LF-only")
    INDEX.write_text(text, encoding="utf-8", newline="\n")
    print("Tu-22M3 strike classification applied and syntax checked")


if __name__ == "__main__":
    main()
