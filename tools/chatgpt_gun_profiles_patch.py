from __future__ import annotations

from pathlib import Path
import re
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
GUN_MODULE = ROOT / "src" / "combat" / "player-gun.js"


def require_once(text: str, needle: str, label: str) -> None:
    count = text.count(needle)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    require_once(text, old, label)
    return text.replace(old, new, 1)


def main() -> None:
    if not INDEX.exists():
        raise RuntimeError(f"missing {INDEX}")
    if not GUN_MODULE.exists():
        raise RuntimeError(f"missing {GUN_MODULE}")

    gun_source = GUN_MODULE.read_text(encoding="utf-8")
    for required in (
        "export const PLAYER_GUN_PROFILES",
        "function setAircraft(aircraftId)",
        "function profileProbe()",
        "muzzleIndex = (muzzleIndex + 1) % activeProfile.muzzles.length;",
    ):
        if required not in gun_source:
            raise RuntimeError(f"player-gun.js is missing the profile contract: {required}")

    original = INDEX.read_text(encoding="utf-8")
    text = original

    # Resolve the profile once when the airframe loadout is applied. The exact
    # parameter name is captured from the host instead of guessed, so the patch
    # survives harmless renames of `id` to `aircraftId`.
    loadout_pattern = re.compile(
        r"(?m)^(?P<header>    function applyAircraftLoadout\((?P<arg>[A-Za-z_$][A-Za-z0-9_$]*)\) \{\n)"
    )
    loadout_matches = list(loadout_pattern.finditer(text))
    if len(loadout_matches) != 1:
        raise RuntimeError(
            f"applyAircraftLoadout declaration: expected exactly one match, found {len(loadout_matches)}"
        )
    loadout_match = loadout_matches[0]
    loadout_insert = (
        loadout_match.group("header")
        + f"      playerGun.setAircraft({loadout_match.group('arg')});\n"
    )
    text = text[:loadout_match.start()] + loadout_insert + text[loadout_match.end():]

    # Fire cadence is now a property of the active player-gun profile. Damage is
    # still read from AIRCRAFT_TYPES through the existing GUN_DAMAGE variable.
    text = replace_once(
        text,
        "        gunCooldown += 1 / GUN_RATE;",
        "        gunCooldown += 1 / playerGun.getRate();",
        "profile fire cadence",
    )

    # The boresight is the gun line at the active cannon's own range. Keeping the
    # old 750m constant here would make a 650m A-10 sight and a 900m F-22 shot
    # disagree before a target was even selected.
    text = replace_once(
        text,
        "    const BORESIGHT_DISTANCE = GUN_RANGE;\n",
        "    function currentGunRange() {\n"
        "      return playerGun.getRange();\n"
        "    }\n",
        "dynamic boresight range declaration",
    )
    text = replace_once(
        text,
        "      gunMuzzleOrigin(tmpV8).addScaledVector(tmpV9, BORESIGHT_DISTANCE);",
        "      gunMuzzleOrigin(tmpV8).addScaledVector(tmpV9, currentGunRange());",
        "dynamic boresight range use",
    )

    # Insert one read-only probe beside the existing gun probes. No host state is
    # mutated; the controller returns the resolved rate/range/assist and the next
    # local/world muzzle used by both the ring and the following shot.
    probe_pattern = re.compile(r"(?m)^(?P<line>        gunAssistCapAt:\s*.*)$")
    probe_matches = list(probe_pattern.finditer(text))
    if len(probe_matches) != 1:
        raise RuntimeError(
            f"gunAssistCapAt debug hook: expected exactly one match, found {len(probe_matches)}"
        )
    probe_match = probe_matches[0]
    probe_insert = (
        "        gunProfileProbe: () => playerGun.profileProbe(),\n"
        + probe_match.group("line")
    )
    text = text[:probe_match.start()] + probe_insert + text[probe_match.end():]

    required_fragments = (
        "playerGun.setAircraft(",
        "gunCooldown += 1 / playerGun.getRate();",
        "function currentGunRange()",
        "addScaledVector(tmpV9, currentGunRange());",
        "gunProfileProbe: () => playerGun.profileProbe(),",
    )
    for fragment in required_fragments:
        if text.count(fragment) != 1:
            raise RuntimeError(f"required fragment has unexpected count: {fragment!r}")

    # Scope guards: this delivery only wires the player-gun profile controller.
    # These declarations remain exactly where and how the host owns them.
    for fragment, label in (
        ("const AIRCRAFT_TYPES =", "AIRCRAFT_TYPES"),
        ("const SPW_TYPES =", "SPW_TYPES"),
        ("function updateMissiles(dt)", "updateMissiles"),
        ("function surfaceHeightAt(x, z)", "surfaceHeightAt"),
    ):
        count = text.count(fragment)
        if count != 1:
            raise RuntimeError(f"{label}: expected one declaration after patch, found {count}")

    if text == original:
        raise RuntimeError("patch produced no changes")

    module = re.search(
        r'<script type="module">\n(?P<body>.*)\n  </script>',
        text,
        re.DOTALL,
    )
    if not module:
        raise RuntimeError("could not extract index module for syntax check")

    # Check both production modules and the transformed host before replacing the
    # repository file. A bad marker or syntax error leaves index.html untouched.
    with tempfile.TemporaryDirectory() as temp_dir:
        module_path = Path(temp_dir) / "index-module.mjs"
        module_path.write_text(module.group("body"), encoding="utf-8", newline="\n")
        subprocess.run(["node", "--check", str(module_path)], check=True)
    subprocess.run(["node", "--check", str(GUN_MODULE)], check=True)

    INDEX.write_text(text, encoding="utf-8", newline="\n")
    print("gun-profiles patch applied and syntax checked")


if __name__ == "__main__":
    main()
