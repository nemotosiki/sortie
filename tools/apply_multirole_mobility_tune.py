#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
CHECK = ROOT / "tools" / "check_multirole_mobility_balance.mjs"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def aircraft_block(source: str, aircraft_id: str) -> tuple[int, int, str]:
    marker = f'      {aircraft_id}: Object.freeze({{\n        id: "{aircraft_id}",'
    start = source.find(marker)
    if start < 0:
        raise SystemExit(f"index: AIRCRAFT_TYPES.{aircraft_id} block not found")
    end = source.find("\n      }),", start)
    if end < 0:
        raise SystemExit(f"index: AIRCRAFT_TYPES.{aircraft_id} block end not found")
    end += len("\n      }),")
    return start, end, source[start:end]


def patch_aircraft(source: str, aircraft_id: str, replacements: list[tuple[str, str, str]]) -> str:
    start, end, block = aircraft_block(source, aircraft_id)
    for old, new, label in replacements:
        block = replace_once(block, old, new, f"{aircraft_id} {label}")
    return source[:start] + block + source[end:]


def patch_index() -> None:
    source = INDEX.read_text(encoding="utf-8")

    # The selectable-loadout multiroles trade a little raw pointing authority
    # for their ability to cover air, ground and ship missions from one airframe.
    # Stability/stall numbers stay intact: carrier handling should remain their
    # strength; this is only a mobility trim, not a low-speed-control nerf.
    source = patch_aircraft(source, "fa18", [
        (
            '        blurb: "空母運用を前提に鍛えられた複座の艦載機。出撃前に4AAM・4AGM・LASMを選び、制空・対地・対艦へ任務ごとに構成を変えられる。最高速度は上位機に譲るが、中速域の機動と姿勢の安定は随一。",',
            '        blurb: "空母運用を前提に鍛えられた複座の艦載機。出撃前に4AAM・4AGM・LASMを選び、制空・対地・対艦へ任務ごとに構成を変えられる。姿勢安定性に優れる一方、万能性との引き換えに純制空機ほどの旋回性能は持たない。",',
            "blurb",
        ),
        (
            '        pitchRateDeg: 47, rollRateDeg: 150, yawRateDeg: 13, maxBankAngleDeg: 57,',
            '        pitchRateDeg: 44, rollRateDeg: 145, yawRateDeg: 12, maxBankAngleDeg: 55,',
            "axis rates",
        ),
        (
            '        normalRollSpring: 42, rollRateLimitDeg: 145, turnRateDeg: 33,',
            '        normalRollSpring: 40, rollRateLimitDeg: 140, turnRateDeg: 31,',
            "turn response",
        ),
    ])

    source = patch_aircraft(source, "f35c", [
        (
            '        blurb: "艦載型の第5世代ステルス機。出撃前に4AAM・4AGM・LASMを選択し、制空・対地・対艦へ任務ごとに構成を変えられる。大型主翼による安定と堅牢な機体、低被探知性を活かし、あらゆる任務を高水準でこなす。",',
            '        blurb: "艦載型の第5世代ステルス機。出撃前に4AAM・4AGM・LASMを選択し、制空・対地・対艦へ任務ごとに構成を変えられる。低被探知性と高い姿勢安定性を持つ一方、純制空機ほどの瞬間機動性は持たない。",',
            "blurb",
        ),
        (
            '        pitchRateDeg: 46, rollRateDeg: 152, yawRateDeg: 13, maxBankAngleDeg: 58,',
            '        pitchRateDeg: 43, rollRateDeg: 145, yawRateDeg: 12, maxBankAngleDeg: 56,',
            "axis rates",
        ),
        (
            '        normalRollSpring: 44, rollRateLimitDeg: 146, turnRateDeg: 33,',
            '        normalRollSpring: 41, rollRateLimitDeg: 140, turnRateDeg: 31,',
            "turn response",
        ),
    ])

    old_comment = '''      // F/A-18F: the carrier jet. Deliberately not "F-16 but better" - it gives
      // up top speed to the land-based fighters and buys back pitch authority,
      // roll damping and a low stall entry, which is what flying an approach at
      // 140 kt onto a moving deck actually demands. Sits between the F-16 and
      // the F-15 on aggregate, but not on every axis: pitch beats the Eagle,
      // roll does not.'''
    new_comment = '''      // F/A-18F: the carrier jet. Deliberately not "F-16 but better" - it gives
      // up top speed and raw pointing authority to the dedicated fighters and
      // buys back roll damping and a low stall entry, which is what flying an
      // approach onto a moving deck actually demands. Its selectable rack is
      // the payoff: one stable airframe can cover air, ground or ship sorties.'''
    source = replace_once(source, old_comment, new_comment, "F/A-18F design comment")

    INDEX.write_text(source, encoding="utf-8")


def write_checker() -> None:
    CHECK.write_text(r'''#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[1], "../..");
const source = fs.readFileSync(path.join(root, "index.html"), "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`check_multirole_mobility_balance: FAIL - ${message}`);
    process.exit(1);
  }
}

function block(id, nextMarker) {
  const marker = `      ${id}: Object.freeze({\n        id: "${id}",`;
  const start = source.indexOf(marker);
  assert(start >= 0, `AIRCRAFT_TYPES.${id} missing`);
  const end = source.indexOf(nextMarker, start);
  assert(end > start, `could not bound AIRCRAFT_TYPES.${id}`);
  return source.slice(start, end);
}

const fa18 = block("fa18", "      // F-15C:");
assert(fa18.includes("pitchRateDeg: 44, rollRateDeg: 145, yawRateDeg: 12, maxBankAngleDeg: 55"), "F/A-18F axis-rate trim changed");
assert(fa18.includes("normalRollSpring: 40, rollRateLimitDeg: 140, turnRateDeg: 31"), "F/A-18F turn trim changed");
assert(fa18.includes("rollDamping: 11.8, stallWarnSpeed: 84, stallEntrySpeed: 72"), "F/A-18F carrier stability was unintentionally nerfed");
assert(fa18.includes("spwChoices: Object.freeze(["), "F/A-18F selectable loadout disappeared");

const f35 = block("f35c", "      rafale: Object.freeze({");
assert(f35.includes("pitchRateDeg: 43, rollRateDeg: 145, yawRateDeg: 12, maxBankAngleDeg: 56"), "F-35C axis-rate trim changed");
assert(f35.includes("normalRollSpring: 41, rollRateLimitDeg: 140, turnRateDeg: 31"), "F-35C turn trim changed");
assert(f35.includes("rollDamping: 12.0, stallWarnSpeed: 82, stallEntrySpeed: 70"), "F-35C carrier stability was unintentionally nerfed");
assert(f35.includes("spwChoices: Object.freeze(["), "F-35C selectable loadout disappeared");

const f15c = block("f15c", "      f15: Object.freeze({");
assert(f15c.includes("pitchRateDeg: 46, rollRateDeg: 170, yawRateDeg: 13, maxBankAngleDeg: 60"), "F-15C dedicated-fighter mobility changed");
assert(f15c.includes("turnRateDeg: 35"), "F-15C turn rate changed");

const f16 = block("f16", "      f4: Object.freeze({");
assert(f16.includes("pitchRateDeg: 40, rollRateDeg: 145, yawRateDeg: 11, maxBankAngleDeg: 52"), "starter F-16 mobility changed");
assert(f16.includes("turnRateDeg: 29"), "starter F-16 turn rate changed");

console.log("check_multirole_mobility_balance: PASS");
console.log("  fa18: pitch 44 / roll 145 / yaw 12 / turn 31");
console.log("  f35c: pitch 43 / roll 145 / yaw 12 / turn 31");
console.log("  carrier stability preserved; F-15C remains the sharper dedicated fighter");
''', encoding="utf-8")


patch_index()
write_checker()
print("apply_multirole_mobility_tune: trimmed F/A-18F and F-35C mobility without changing stability or loadouts")
