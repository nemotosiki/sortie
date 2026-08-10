from __future__ import annotations

from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"


def require_once(text: str, needle: str, label: str) -> None:
    count = text.count(needle)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")


def main() -> None:
    text = INDEX.read_text(encoding="utf-8")

    block_re = re.compile(
        r'      f15: Object\.freeze\(\{\n(?P<body>.*?)\n      \}\),\n      // F-14D:',
        re.DOTALL,
    )
    match = block_re.search(text)
    if not match:
        raise RuntimeError("could not find the player F-15 aircraft block")
    body = match.group("body")
    replacements = {
        '        label: "F-15 EAGLE",': '        label: "F-15E STRIKE EAGLE",',
        '        role: "Air Superiority Fighter",': '        role: "Strike Fighter",',
        '        tag: "ADVANCED",': '        tag: "STRIKE",',
        '        blurb: "大出力エンジンと堅牢な機体を持つ制空戦闘機。F-22に次ぐ高水準。",': '        blurb: "F-15を複座化し対地能力を大幅に強化した長距離打撃戦闘機。重量増で純粋な格闘性能はF-15Cに譲るが、航続・装甲・4目標同時の対地攻撃で前線を押し潰す。",',
        '        cruiseSpeed: 310, boostSpeed: 670, brakeSpeed: 128,': '        cruiseSpeed: 300, boostSpeed: 640, brakeSpeed: 130,',
        '        pitchRateDeg: 45, rollRateDeg: 165, yawRateDeg: 13, maxBankAngleDeg: 58,': '        pitchRateDeg: 42, rollRateDeg: 152, yawRateDeg: 12, maxBankAngleDeg: 55,',
        '        normalRollSpring: 43, rollRateLimitDeg: 157, turnRateDeg: 34,': '        normalRollSpring: 40, rollRateLimitDeg: 146, turnRateDeg: 31,',
        '        rollDamping: 11.4, stallWarnSpeed: 86, stallEntrySpeed: 74, stallAuthorityLoss: 0.55, structuralG: 3.1,': '        rollDamping: 11.0, stallWarnSpeed: 90, stallEntrySpeed: 78, stallAuthorityLoss: 0.60, structuralG: 3.1,',
        '        boostResponse: 0.82, brakeResponse: 0.48, cruiseResponse: 0.56,': '        boostResponse: 0.84, brakeResponse: 0.50, cruiseResponse: 0.58,',
        '        missileCapacity: 24, maxHealth: 150,': '        missileCapacity: 24, maxHealth: 170,',
        '        spw: Object.freeze({ key: "xlaa", capacity: 12 }),': '        spw: Object.freeze({ key: "agm4", capacity: 16 }),',
        'canopy: 0x8fe0ff, exhaust: 0x8cecff, scale: 1.04, variant: "lancer"': 'canopy: 0x8fe0ff, exhaust: 0x8cecff, scale: 1.05, variant: "strikeeagle"',
    }
    for old, new in replacements.items():
        if old not in body:
            raise RuntimeError(f"F-15E conversion missing expected text: {old}")
        body = body.replace(old, new, 1)

    new_block = '      f15: Object.freeze({\n' + body + '\n      }),\n      // F-14D:'
    text = text[:match.start()] + new_block + text[match.end():]

    marker = '      } else if (theme.variant === "lancer") {\n'
    require_once(text, marker, "lancer model branch")
    strike_branch = '''      } else if (theme.variant === "strikeeagle") {\n        // F-15E: same Eagle planform, but visibly heavier than the single-seat\n        // C model: tandem canopy, conformal fuel tanks and a fuller strike\n        // fuselage. The internal `f15` id is intentionally retained so old\n        // saves and legacy mission wave tables keep loading.\n        add(geometry.fuselage, primary, 0, 0.08, -0.35, 1.08, 0.84, 1.02);\n        add(geometry.nose, primary, 0, 0.10, -8.05, 0.82, 0.70, 1);\n        add(geometry.canopy, canopy, 0, 0.95, -2.85, 0.80, 0.58, 2.15);\n        add(geometry.panel, dark, 0, 1.02, -2.72, 0.54, 0.13, 0.18);\n        add(geometry.wingEagle, secondary, 0, 0.32, 0.72);\n        add(geometry.tailWing, primary, 0, -0.02, 6.15, 1.02, 1, 0.95);\n        add(geometry.fin, secondary, -1.3, 0.55, 4.95, 0.78, 1.05, 0.75);\n        add(geometry.fin, secondary, 1.3, 0.55, 4.95, 0.78, 1.05, 0.75);\n        add(geometry.rearBody, secondary, -0.85, -0.08, 6.3, 0.82, 0.82, 1.2);\n        add(geometry.rearBody, secondary, 0.85, -0.08, 6.3, 0.82, 0.82, 1.2);\n        // Conformal tanks make the E-model read heavier in profile without\n        // changing the Eagle wing or tail geometry.\n        add(geometry.panel, secondary, -1.12, -0.20, 0.55, 0.42, 0.34, 5.7);\n        add(geometry.panel, secondary, 1.12, -0.20, 0.55, 0.42, 0.34, 5.7);\n        add(geometry.intake, accent, -1.32, 0.02, -1.3, 0.62, 1.35, 1.2);\n        add(geometry.intake, accent, 1.32, 0.02, -1.3, 0.62, 1.35, 1.2);\n        add(geometry.nozzle, accent, -0.85, -0.08, 8.3);\n        add(geometry.nozzle, accent, 0.85, -0.08, 8.3);\n        addFlame(-0.85, -0.08, 9.7);\n        addFlame(0.85, -0.08, 9.7);\n        add(geometry.panel, dark, 0, 0.72, -4.5, 0.72, 0.08, 1.9);\n        add(geometry.canopy, navL, -8.35, 0.34, 2.7, 0.12, 0.12, 0.12);\n        add(geometry.canopy, navR, 8.35, 0.34, 2.7, 0.12, 0.12, 0.12);\n'''
    text = text.replace(marker, strike_branch + marker, 1)

    variants_old = '      "viper", "viperzero", "lancer", "bison", "hornet", "tomcat", "foxhound",\n'
    variants_new = '      "viper", "viperzero", "lancer", "strikeeagle", "bison", "hornet", "tomcat", "foxhound",\n'
    require_once(text, variants_old, "inline variant allow-list")
    text = text.replace(variants_old, variants_new, 1)

    silhouette_re = re.compile(r'(      lancer: (?P<path>"[^"]+"),  // F-15\n)')
    sm = silhouette_re.search(text)
    if not sm:
        raise RuntimeError("could not find F-15 silhouette")
    duplicate = sm.group(1) + f'      strikeeagle: {sm.group("path")},  // F-15E\n'
    text = text[:sm.start()] + duplicate + text[sm.end():]

    for required in (
        'label: "F-15E STRIKE EAGLE"',
        'variant: "strikeeagle"',
        'theme.variant === "strikeeagle"',
        'spw: Object.freeze({ key: "agm4", capacity: 16 })',
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
    print("F-15E identity and strike model applied")


if __name__ == "__main__":
    main()
