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

    aircraft_marker = '      fa18: Object.freeze({\n        id: "fa18",\n        label: "F/A-18F SUPER HORNET",\n'
    if text.count(aircraft_marker) != 1:
        raise RuntimeError("could not find F/A-18F player aircraft block")
    fa18a = '''      // F/A-18A: CROWN's older carrier fighter. Smaller and lighter than\n      // the Super Hornet, single-seat, with less fuel and armour but crisp\n      // low-speed handling. LASM gives it the anti-ship job CROWN uses it for.\n      fa18a: Object.freeze({\n        id: "fa18a",\n        label: "F/A-18A HORNET",\n        role: "Legacy Carrier Multirole",\n        tag: "LEGACY NAVY",\n        blurb: "初期型の単座ホーネット。F/A-18Fより小さく軽く、航続・装甲・搭載量では劣るが、低中速の反応は鋭い。古い艦載機を知り尽くしたCROWNなら、対艦任務でもまだ第一線で使える。",\n        cruiseSpeed: 250, boostSpeed: 520, brakeSpeed: 124,\n        pitchRateDeg: 46, rollRateDeg: 156, yawRateDeg: 13, maxBankAngleDeg: 56,\n        normalRollSpring: 43, rollRateLimitDeg: 150, turnRateDeg: 34,\n        rollDamping: 11.4, stallWarnSpeed: 82, stallEntrySpeed: 70, stallAuthorityLoss: 0.49, structuralG: 3.05,\n        gunDamage: 20, missileDamage: 98,\n        boostResponse: 0.90, brakeResponse: 0.48, cruiseResponse: 0.57,\n        missileCapacity: 20, maxHealth: 120,\n        spw: Object.freeze({ key: "lasm", capacity: 10 }),\n        tipSpan: 7.2, tipZ: 2.6,\n        theme: Object.freeze({\nprimary: 0xb8c0c7, secondary: 0x66717a, accent: 0x33475c,\ncanopy: 0x8fe0ff, exhaust: 0x8cecff, scale: 0.94, variant: "legacyhornet"\n        })\n      }),\n'''
    text = text.replace(aircraft_marker, fa18a + aircraft_marker, 1)

    order_old = '      "f16", "gripen", "f2a", "fa18", "f15c", "f15", "f14", "su37", "rafale", "typhoon", "f35c", "mig31", "f4", "a10", "f22",\n'
    order_new = '      "f16", "gripen", "f2a", "fa18a", "fa18", "f15c", "f15", "f14", "su37", "rafale", "typhoon", "f35c", "mig31", "f4", "a10", "f22",\n'
    text = replace_once(text, order_old, order_new, "hangar order")

    campaign_old = '          "f16", "gripen", "f2a", "fa18", "f15c", "f15", "f14", "rafale", "typhoon", "f35c", "f4", "a10", "f22"\n'
    campaign_new = '          "f16", "gripen", "f2a", "fa18a", "fa18", "f15c", "f15", "f14", "rafale", "typhoon", "f35c", "f4", "a10", "f22"\n'
    text = replace_once(text, campaign_old, campaign_new, "USA campaign allow-list")

    ai_marker = '      fa18: Object.freeze({\n        behavior: "formation",\n'
    if text.count(ai_marker) != 1:
        raise RuntimeError("could not find F/A-18F enemy AI profile")
    ai = '''      fa18a: Object.freeze({\n        behavior: "formation",\n        hitboxScale: 0.92,\n        patrolSpeedScale: 0.98,\n        patrolPathScale: 1.06,\n        engageRange: 900,\n        fireMin: 1.3, fireSpread: 1.5,\n        damageMin: 6, damageMax: 10,\n        attackRange: 800, aimThreshold: 0.43,\n        breakChance: 0.31, breakTime: 1.45, breakTurnScale: 1.18,\n        verticalJink: 0.22,\n        turnScale: 1.02\n      }),\n'''
    text = text.replace(ai_marker, ai + ai_marker, 1)

    missile_marker = '      fa18: Object.freeze({\n        cooldownMin: 9.0,\n'
    if text.count(missile_marker) != 1:
        raise RuntimeError("could not find F/A-18F enemy missile profile")
    missile = '''      fa18a: Object.freeze({\n        cooldownMin: 9.5,\n        cooldownSpread: 4.8,\n        range: 1260,\n        minRange: 190,\n        speed: 368,\n        turnRate: THREE.MathUtils.degToRad(62),\n        damage: 98,\n        life: 7.6,\n        launchDot: 0.18\n      }),\n'''
    text = text.replace(missile_marker, missile + missile_marker, 1)

    model_marker = '      } else if (theme.variant === "hornet") {\n'
    if text.count(model_marker) != 1:
        raise RuntimeError("could not find Super Hornet model branch")
    legacy_model = '''      } else if (theme.variant === "legacyhornet") {\n        // F/A-18A: visibly smaller first-generation Hornet. The single-seat\n        // canopy, narrower LERX and closer twin tails distinguish it from the\n        // F-model Super Hornet while retaining the same family planform.\n        add(geometry.fuselage, primary, 0, 0.02, -0.35, 0.96, 0.72, 0.92);\n        add(geometry.nose, primary, 0, 0.01, -7.55, 0.70, 0.62, 0.92);\n        add(geometry.canopy, canopy, 0, 0.88, -3.0, 0.66, 0.54, 1.55);\n        add(geometry.wingHornet, secondary, 0, 0.16, 0.65, 0.90, 1, 0.92);\n        add(geometry.panel, secondary, -1.42, 0.12, -4.15, 0.80, 0.09, 3.25);\n        add(geometry.panel, secondary, 1.42, 0.12, -4.15, 0.80, 0.09, 3.25);\n        add(geometry.tailWing, primary, 0, -0.04, 5.75, 0.86, 1, 0.84);\n        add(geometry.fin, secondary, -1.62, 0.46, 4.15, 0.72, 0.94, 0.76, 0.31);\n        add(geometry.fin, secondary, 1.62, 0.46, 4.15, 0.72, 0.94, 0.76, -0.31);\n        add(geometry.rearBody, secondary, -0.72, -0.05, 5.9, 0.72, 0.74, 1.05);\n        add(geometry.rearBody, secondary, 0.72, -0.05, 5.9, 0.72, 0.74, 1.05);\n        add(geometry.intake, accent, -1.30, -0.14, -1.45, 0.62, 0.86, 1.05);\n        add(geometry.intake, accent, 1.30, -0.14, -1.45, 0.62, 0.86, 1.05);\n        add(geometry.nozzle, accent, -0.72, -0.05, 7.65, 0.92, 0.92, 0.92);\n        add(geometry.nozzle, accent, 0.72, -0.05, 7.65, 0.92, 0.92, 0.92);\n        addFlame(-0.72, -0.05, 8.95);\n        addFlame(0.72, -0.05, 8.95);\n        // Wingtip rails and arrestor hook are the carrier identity.\n        add(geometry.missileBody, light, -7.05, -0.18, 2.45, 0.84, 0.84, 0.92);\n        add(geometry.missileBody, light, 7.05, -0.18, 2.45, 0.84, 0.84, 0.92);\n        add(geometry.panel, dark, 0, -0.74, 6.5, 0.10, 0.10, 2.0);\n        add(geometry.canopy, navL, -7.15, 0.28, 2.5, 0.12, 0.12, 0.12);\n        add(geometry.canopy, navR, 7.15, 0.28, 2.5, 0.12, 0.12, 0.12);\n'''
    text = text.replace(model_marker, legacy_model + model_marker, 1)

    variants_old = '      "viper", "viperzero", "lancer", "strikeeagle", "bison", "hornet", "tomcat", "foxhound",\n'
    variants_new = '      "viper", "viperzero", "lancer", "strikeeagle", "bison", "legacyhornet", "hornet", "tomcat", "foxhound",\n'
    text = replace_once(text, variants_old, variants_new, "inline variant allow-list")

    silhouette_re = re.compile(r'(      hornet: (?P<path>"[^"]+"),  // F/A-18F\n)')
    sm = silhouette_re.search(text)
    if not sm:
        raise RuntimeError("could not find F/A-18F silhouette")
    duplicate = f'      legacyhornet: {sm.group("path")},  // F/A-18A\n' + sm.group(1)
    text = text[:sm.start()] + duplicate + text[sm.end():]

    for required in (
        'id: "fa18a"',
        'label: "F/A-18A HORNET"',
        'variant: "legacyhornet"',
        'theme.variant === "legacyhornet"',
        '"fa18a", "fa18"',
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
    print("F/A-18A player/enemy airframe and legacy model registered")


if __name__ == "__main__":
    main()
