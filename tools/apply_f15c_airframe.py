from __future__ import annotations

from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


def main() -> None:
    text = INDEX.read_text(encoding="utf-8")

    aircraft_marker = '      f15: Object.freeze({\n        id: "f15",\n        label: "F-15E STRIKE EAGLE",\n'
    if text.count(aircraft_marker) != 1:
        raise RuntimeError("could not find converted F-15E aircraft block")
    f15c = '''      // F-15C: CROWN's preferred pure fighter. It keeps the old Eagle\n      // silhouette and gives up the Strike Eagle's armour and 4AGM for better\n      // acceleration, roll and sustained turn plus the long-range XLAA.\n      f15c: Object.freeze({\n        id: "f15c",\n        label: "F-15C EAGLE",\n        role: "Air Superiority Fighter",\n        tag: "INTERCEPTOR",\n        blurb: "余計な対地装備を持たない単座の制空型イーグル。F-15Eより軽く、加速・ロール・持続旋回で上回る。長射程ミサイルで先手を取り、格闘戦でも押し切るCROWN好みの古典的な制空戦闘機。",\n        cruiseSpeed: 315, boostSpeed: 680, brakeSpeed: 126,\n        pitchRateDeg: 46, rollRateDeg: 170, yawRateDeg: 13, maxBankAngleDeg: 60,\n        normalRollSpring: 45, rollRateLimitDeg: 163, turnRateDeg: 35,\n        rollDamping: 11.5, stallWarnSpeed: 85, stallEntrySpeed: 73, stallAuthorityLoss: 0.53, structuralG: 3.2,\n        gunDamage: 22, missileDamage: 98,\n        boostResponse: 0.81, brakeResponse: 0.47, cruiseResponse: 0.55,\n        missileCapacity: 24, maxHealth: 145,\n        spw: Object.freeze({ key: "xlaa", capacity: 14 }),\n        tipSpan: 8.55, tipZ: 2.7,\n        theme: Object.freeze({\nprimary: 0xc8d2d9, secondary: 0x697783, accent: 0x324a60,\ncanopy: 0x8fe0ff, exhaust: 0x8cecff, scale: 1.03, variant: "lancer"\n        })\n      }),\n'''
    text = text.replace(aircraft_marker, f15c + aircraft_marker, 1)

    order_old = '      "f16", "gripen", "f2a", "fa18", "f15", "f14", "su37", "rafale", "typhoon", "f35c", "mig31", "f4", "a10", "f22",\n'
    order_new = '      "f16", "gripen", "f2a", "fa18", "f15c", "f15", "f14", "su37", "rafale", "typhoon", "f35c", "mig31", "f4", "a10", "f22",\n'
    text = replace_once(text, order_old, order_new, "hangar order")

    campaign_old = '          "f16", "gripen", "f2a", "fa18", "f15", "f14", "rafale", "typhoon", "f35c", "f4", "a10", "f22"\n'
    campaign_new = '          "f16", "gripen", "f2a", "fa18", "f15c", "f15", "f14", "rafale", "typhoon", "f35c", "f4", "a10", "f22"\n'
    text = replace_once(text, campaign_old, campaign_new, "USA campaign allow-list")

    ai_marker = '      f15: Object.freeze({\n        behavior: "formation",\n'
    if text.count(ai_marker) != 1:
        raise RuntimeError("could not find F-15 enemy AI profile")
    ai = '''      f15c: Object.freeze({\n        behavior: "formation",\n        hitboxScale: 0.96,\n        patrolSpeedScale: 1.04,\n        patrolPathScale: 1,\n        engageRange: 1020,\n        fireMin: 1.1, fireSpread: 1.2,\n        damageMin: 7, damageMax: 11,\n        attackRange: 860, aimThreshold: 0.46,\n        breakChance: 0.34, breakTime: 1.5, breakTurnScale: 1.22,\n        verticalJink: 0.24,\n        turnScale: 1.04\n      }),\n'''
    text = text.replace(ai_marker, ai + ai_marker, 1)

    missile_marker = '      f15: Object.freeze({\n        cooldownMin: 8.8,\n'
    if text.count(missile_marker) != 1:
        raise RuntimeError("could not find F-15 enemy missile profile")
    missile = '''      f15c: Object.freeze({\n        cooldownMin: 8.2,\n        cooldownSpread: 4.2,\n        range: 1420,\n        minRange: 210,\n        speed: 395,\n        turnRate: THREE.MathUtils.degToRad(66),\n        damage: 98,\n        life: 8.1,\n        launchDot: 0.21\n      }),\n'''
    text = text.replace(missile_marker, missile + missile_marker, 1)

    for required in (
        'id: "f15c"',
        'label: "F-15C EAGLE"',
        '"f15c", "f15"',
        'f15c: Object.freeze({\n        behavior: "formation"',
        'f15c: Object.freeze({\n        cooldownMin: 8.2',
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
    print("F-15C player/enemy airframe registered")


if __name__ == "__main__":
    main()
