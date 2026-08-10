from pathlib import Path

root = Path(__file__).resolve().parents[1]
index_path = root / "index.html"
check_path = root / "tools" / "check_legacy_airframe_variants.mjs"

source = index_path.read_text(encoding="utf-8")
check = check_path.read_text(encoding="utf-8")


def replace_in_aircraft_block(text, aircraft_id, next_marker, replacements):
    start_marker = f'      {aircraft_id}: Object.freeze({{\n        id: "{aircraft_id}",'
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f"AIRCRAFT_TYPES.{aircraft_id} block not found")
    end = text.find(next_marker, start)
    if end <= start:
        raise SystemExit(f"could not bound AIRCRAFT_TYPES.{aircraft_id}")
    block = text[start:end]
    for old, new in replacements:
        count = block.count(old)
        if count != 1:
            raise SystemExit(
                f"expected one {aircraft_id} replacement, found {count}: {old[:80]}"
            )
        block = block.replace(old, new, 1)
    return text[:start] + block + text[end:]


source = replace_in_aircraft_block(
    source,
    "f15c",
    '      f15: Object.freeze({\n        id: "f15",',
    [
        (
            'blurb: "余計な対地装備を持たない単座の制空型イーグル。F-15Eより軽く、加速・ロール・持続旋回で上回る。長射程ミサイルで先手を取り、格闘戦でも押し切るCROWN好みの古典的な制空戦闘機。",',
            'blurb: "余計な対地装備を持たない単座の制空型イーグル。F-15Eより軽く、加速・ロール・持続旋回で上回る。4AAMで複数の敵を同時に捉え、格闘戦でも押し切るCROWN好みの古典的な制空戦闘機。",'
        ),
        (
            'spw: Object.freeze({ key: "xlaa", capacity: 14 }),',
            'spw: Object.freeze({ key: "aam4", capacity: 14 }),'
        ),
    ],
)

source = replace_in_aircraft_block(
    source,
    "f15",
    "      // F-14D:",
    [
        (
            'blurb: "F-15を複座化し対地能力を大幅に強化した長距離打撃戦闘機。重量増で純粋な格闘性能はF-15Cに譲るが、航続・装甲・4目標同時の対地攻撃で前線を押し潰す。",',
            'blurb: "F-15を複座化し長距離任務へ対応した打撃戦闘機。重量増で純粋な格闘性能はF-15Cに譲るが、航続・装甲に優れ、4AAMで複数の空中目標へ同時攻撃できる。",'
        ),
        (
            'spw: Object.freeze({ key: "agm4", capacity: 16 }),',
            'spw: Object.freeze({ key: "aam4", capacity: 16 }),'
        ),
    ],
)

check_replacements = [
    (
        'assert(f15c.includes(\'spw: Object.freeze({ key: "xlaa", capacity: 14 })\'), "f15c must carry XLAA");',
        'assert(f15c.includes(\'spw: Object.freeze({ key: "aam4", capacity: 14 })\'), "f15c must carry 4AAM");'
    ),
    (
        'assert(f15e.includes(\'spw: Object.freeze({ key: "agm4", capacity: 16 })\'), "F-15E must carry 4AGM");',
        'assert(f15e.includes(\'spw: Object.freeze({ key: "aam4", capacity: 16 })\'), "F-15E must carry 4AAM");'
    ),
]

for old, new in check_replacements:
    count = check.count(old)
    if count != 1:
        raise SystemExit(f"expected exactly one checker replacement, found {count}: {old[:80]}")
    check = check.replace(old, new, 1)

index_path.write_text(source, encoding="utf-8")
check_path.write_text(check, encoding="utf-8")
print("apply_f15_4aam: patched F-15C and F-15E to 4AAM")
