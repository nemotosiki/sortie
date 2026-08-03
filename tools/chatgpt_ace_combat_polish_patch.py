from __future__ import annotations

from pathlib import Path
import re
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
GUN = ROOT / "src" / "combat" / "player-gun.js"
HUD_CSS = ROOT / "styles" / "hud-polish.css"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def check_module_source(source: str, suffix: str) -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        path = Path(temp_dir) / f"check{suffix}"
        path.write_text(source, encoding="utf-8", newline="\n")
        subprocess.run(["node", "--check", str(path)], check=True)


def patch_player_gun() -> None:
    original = GUN.read_text(encoding="utf-8")
    text = original

    # Enemy IDs start at zero. Truthiness silently disabled the assist only for
    # the first spawned contact while every later numeric ID worked.
    text = replace_once(
        text,
        "    if (gimbalTargetId) {\n",
        "    if (gimbalTargetId != null) {\n",
        "numeric target id zero",
    )

    # Close-range forgiveness exists to make a fighter-sized object readable at
    # knife range. Applying the same 2.2x multiplier to a carrier's already-real
    # hull radius creates a several-hundred-metre invisible hit bubble.
    text = replace_once(
        text,
        "  function aimForgiveness(range) {\n"
        "    const t = THREE.MathUtils.clamp(range / profile.range, 0, 1);\n"
        "    return THREE.MathUtils.lerp(GUN_CLOSE_FORGIVENESS, 1, t);\n"
        "  }\n",
        "  function aimForgiveness(range, target = null) {\n"
        "    // Ships and their mounted subsystems already expose their physical\n"
        "    // hull radius. Fighter-scale close-range forgiveness must not turn a\n"
        "    // carrier into a several-hundred-metre invisible sphere. Ground units\n"
        "    // retain the original help because their hit volumes are small.\n"
        "    if (target && target.surface && !target.ground) return 1;\n"
        "    const t = THREE.MathUtils.clamp(range / profile.range, 0, 1);\n"
        "    return THREE.MathUtils.lerp(GUN_CLOSE_FORGIVENESS, 1, t);\n"
        "  }\n",
        "surface target forgiveness",
    )
    text = replace_once(
        text,
        "      const radius = baseRadius * aimForgiveness(range);\n",
        "      const radius = baseRadius * aimForgiveness(range, enemy);\n",
        "hit test target-aware forgiveness",
    )
    text = replace_once(
        text,
        "    gunsightState.forgiveness = aimForgiveness(bestRange);\n",
        "    gunsightState.forgiveness = aimForgiveness(bestRange, best);\n",
        "gunsight target-aware forgiveness",
    )

    # A controller survives menu/sortie transitions. Loading a new sortie reset
    # only the barrel index, leaving the previous target ID and partially-grown
    # correction alive for the first frames of the next flight.
    text = replace_once(
        text,
        "  function setAircraft(aircraftId) {\n"
        "    profile = playerGunProfileFor(aircraftId);\n"
        "    muzzleIndex = 0;\n"
        "    return profile;\n"
        "  }\n",
        "  function setAircraft(aircraftId) {\n"
        "    profile = playerGunProfileFor(aircraftId);\n"
        "    muzzleIndex = 0;\n"
        "    assistState.k = 0;\n"
        "    assistState.targetId = null;\n"
        "    lastGimbal.applied = false;\n"
        "    lastGimbal.angleDeg = null;\n"
        "    lastGimbal.rangeM = null;\n"
        "    lastGimbal.k = null;\n"
        "    gunsightState.active = false;\n"
        "    gunsightState.targetId = null;\n"
        "    gunsightState.assistK = 0;\n"
        "    gunsightState.hot = false;\n"
        "    return profile;\n"
        "  }\n",
        "sortie gun state reset",
    )

    if text == original:
        raise RuntimeError("player-gun patch produced no changes")
    for required in (
        "if (gimbalTargetId != null)",
        "aimForgiveness(range, enemy)",
        "aimForgiveness(bestRange, best)",
        "assistState.targetId = null;",
    ):
        if required not in text:
            raise RuntimeError(f"player-gun result missing {required!r}")

    check_module_source(text, ".mjs")
    GUN.write_text(text, encoding="utf-8", newline="\n")


def patch_index() -> None:
    original = INDEX.read_text(encoding="utf-8")
    text = original
    href = "./styles/hud-polish.css"
    if href not in text:
        pattern = re.compile(
            r'(?m)^(?P<indent>[ \t]*)<link rel="stylesheet" href="\./styles/radio\.css">[ \t]*$'
        )
        matches = list(pattern.finditer(text))
        if len(matches) != 1:
            raise RuntimeError(
                f"radio stylesheet link: expected exactly one match, found {len(matches)}"
            )
        match = matches[0]
        insertion = match.group(0) + f'\n{match.group("indent")}<link rel="stylesheet" href="{href}">'
        text = text[:match.start()] + insertion + text[match.end():]

    if text.count(href) != 1:
        raise RuntimeError(f"HUD stylesheet link count is {text.count(href)}, expected one")
    if not HUD_CSS.exists():
        raise RuntimeError(f"missing {HUD_CSS}")

    module = re.search(
        r'<script type="module">\n(?P<body>.*)\n  </script>',
        text,
        re.DOTALL,
    )
    if not module:
        raise RuntimeError("could not extract the index module")
    check_module_source(module.group("body"), ".mjs")
    INDEX.write_text(text, encoding="utf-8", newline="\n")


def main() -> None:
    for path in (INDEX, GUN, HUD_CSS):
        if not path.exists():
            raise RuntimeError(f"missing {path}")
    patch_player_gun()
    patch_index()
    print("ace-combat polish patch applied and syntax checked")


if __name__ == "__main__":
    main()
