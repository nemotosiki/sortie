#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHAR_PLAN = ROOT / "docs/story_reboot/v0.14/01_character_route_implementation_plan.md"
FINALE = ROOT / "docs/story_reboot/v0.15/00_gibor_crown_lark_finale.md"
PROGRESSION = ROOT / "docs/story_reboot/v0.7/00_gameplay_progression_arca.md"
CANON = ROOT / "docs/story_reboot/v0.15/03_crown_lark_aircraft_canon.md"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


canon = r'''# CROWN / LARK 正史搭乗機・特殊兵装運用計画 v0.15

> [v0.14 キャラクター実装計画](../v0.14/01_character_route_implementation_plan.md)  
> [v0.15 GIBOR最終戦](./00_gibor_crown_lark_finale.md)  
> [v0.7 機体進行](../v0.7/00_gameplay_progression_arca.md)

**状態:** セラ編ROOK隊の正史搭乗機を確定  
**更新日:** 2026-08-10  
**適用:** CROWN / LARK のNPC機体、M01〜M20の編成、M20 GIBOR最終戦  
**優先:** CROWN / LARK の搭乗機とCROWNの復帰時期については本書を最優先する。v0.14以前の曖昧な機体指定、およびv0.15/00の「CROWNはM20だけ復帰」という記述は本書で上書きする。

---

# 1. キャラクター別の固定思想

## CROWN

CROWNは新型機へ乗り換える人物ではない。性能の新しさではなく、古い機体を知り尽くした熟練で強さを見せる。

```text
通常・制空・護衛 = F-15C EAGLE
対地・打撃         = F-4E PHANTOM II
対艦・艦隊戦       = F-14D SUPER TOMCAT
```

絶対規約:

- CROWNはF-16Cに乗らない。
- CROWNはF-15Eを正史機にしない。
- CROWNはF-35Cを正史機にしない。
- M06で負傷し前線離脱する。
- M19でF-15Cにより限定復帰し、M20まで継続出撃する。
- M20のGIBORルートでも機体はF-15Cのまま。ボス化のためだけに新型機へ換装しない。

## LARK

LARKはCROWNより新しい機体・新しい任務適応を受け入れる。機体更新そのものを人物の成長として見せる。

```text
序盤通常      = F-16C
序盤対艦      = F-2A
中盤          = F/A-18F SUPER HORNET
終盤通常      = F-15E STRIKE EAGLE
```

F/A-18Fは中盤の選択式マルチロール機とし、出撃前に任務へ合わせて特殊兵装を変更する。

```text
対空 = 4AAM
対地 = 4AGM
対艦 = LASM
```

F-35Cも同じく4AAM / 4AGM / LASMを選択できる終盤マルチロール機としてプレイヤーロスターに置く。ただし**現行M01〜M20のLARK正史搭乗表ではM17〜M20をF-15Eで固定する**。後からF-35Cへ黙って差し替えない。終盤ミッション自体を専用のステルス／対艦作戦へ改稿する場合だけ、本書を明示的に改訂してからLARKへ割り当てる。

---

# 2. M01〜M20 正史搭乗表

| M | ミッション | CROWN | LARK |
|---|---|---|---|
| M01 | FIRST CONTACT | **F-15C** | **F-16C** |
| M02 | SHATTERED MORNING | **F-4E** | **F-16C** |
| M03 | LOW WATER | **F-4E** | **F-16C** |
| M04 | NARROW SEA | **F-14D** | **F-2A** |
| M05 | PORT OF ASH | **F-4E** | **F-16C** |
| M06 | WHITE PASS | **F-15C** | **F-16C** |
| M07 | BLACK CURRENT | 前線離脱 | **F/A-18F + 4AAM** |
| M08 | NIGHT AUDIT | 前線離脱 | **F/A-18F + 4AAM** |
| M09 | IRON HARVEST | 前線離脱 | **F/A-18F + 4AGM** |
| M10 | LAST TRAIN | 前線離脱 | **F/A-18F + 4AGM** |
| M11 | FROZEN EYE | 前線離脱 | **F/A-18F + 4AAM** |
| M12 | GLASS SWARM | 前線離脱 | **F/A-18F + 4AAM** |
| M13 | LIFELINE | 前線離脱 | **F/A-18F + 4AAM** |
| M14 | BREAKWATER | 前線離脱 | **F/A-18F + LASM** |
| M15 | NIGHT OF NUMBERS | 前線離脱 | **F/A-18F + 4AAM** |
| M16 | HOME FLEET | 前線離脱 | **F/A-18F + 4AAM** |
| M17 | THE LONG APPROACH | 前線離脱 | **F-15E** |
| M18 | HORN OF HEAVEN | 無線のみ | **F-15E** |
| M19 | TRUST FALL | **F-15Cで限定復帰** | **F-15E** |
| M20 | THE GUARANTOR | **F-15C** | **F-15E** |

RAVENのプレイヤー機は自由選択のまま維持し、この表を強制しない。

---

# 3. ミッション別の意図

## ACT I / M01〜M05

- M01のCROWN F-15Cで、最初から「師匠＝古典的制空戦闘機」を見せる。
- M02/M03/M05は地上・打撃要素が強いためCROWNはF-4Eへ換装する。
- M04だけは艦隊戦なのでCROWN F-14D、LARK F-2A。二人の対艦思想を同時に見せる。
- LARKはM04以外F-16Cを維持し、序盤で無意味に機種を頻繁に変えない。

## ACT II / M06〜M10

- M06はCROWN最後の通常前線出撃。F-15Cで帰路迎撃まで担当し被弾する。
- M07以降CROWNは飛ばず、LARKがF/A-18Fへ更新する。
- M09/M10は地上目標比重が高いため4AGMを選択する。
- 機体そのものを変えるのではなく、F/A-18Fの兵装変更で任務適応を見せる。

## ACT III / M11〜M15

- M11〜M13は4AAM。
- M14 `BREAKWATER`は時間制限対艦戦のためLASM。
- M15は4AAM。ARCAとの関係転換を兵装の特殊性で散らさない。

## ACT IV / M16〜M20

- M16 `HOME FLEET`は艦隊**護衛**であり、艦艇攻撃任務ではないためF/A-18F + 4AAM。
- M17からLARKはF-15Eへ移行。中盤の柔軟なF/A-18Fから、終盤の重い打撃戦闘機へ成長を見せる。
- M18のCROWNは飛ばず、無線のみ。
- M19でCROWNがF-15Cへ限定復帰する。復帰専用の新型機を与えない。
- M20はCROWN F-15C / LARK F-15Eで固定する。開戦時の師弟関係と世代差を同時に見せる。

---

# 4. M20 GIBOR最終戦の固定機体

通常ルートでもGIBORルートでも、M20開始時は次の編成。

```text
ROOK 1 RAVEN   = PLAYER / free aircraft
CROWN           = F-15C EAGLE
ROOK 2 LARK     = F-15E STRIKE EAGLE
```

GIBORルートでCROWN/LARKが赤TGTへ変化しても**機体は変更しない**。

```text
BLUE CROWN / F-15C -> RED TGT CROWN / F-15C
BLUE LARK  / F-15E -> RED TGT LARK  / F-15E
```

ボス戦の難度は機体の突然の強化やHP増量ではなく、AI技能・挟撃・位置取りで作る。

CROWNが旧型F-15Cを使い、LARKがより新しいF-15Eを使うことで、最後の2対1に二世代のROOK隊が同時に存在する絵を作る。

---

# 5. 選択式マルチロールの性能契約

F/A-18FとF-35Cは、特殊兵装を一機で三系統から選べること自体が強みである。

そのため純制空機と同等の機動性まで与えない。

- F/A-18F: 中盤の安定した選択式マルチロール。
- F-35C: 終盤のステルス選択式マルチロール。
- 4AAM / 4AGM / LASMの選択はミッション開始前に行う。
- 兵装切替によって機体そのものの機動性は変化させない。
- F-15Cなどの純制空機は、マルチロール機より生の旋回・ロール性能で優位を残す。

実装済み搭載数の基準:

| 機体 | 4AAM | 4AGM | LASM |
|---|---:|---:|---:|
| F/A-18F | 16 | 12 | 12 |
| F-35C | 16 | 12 | 14 |

---

# 6. 実装ID

```text
F-16C  = f16
F-2A   = f2a
F/A-18F = fa18
F-15C  = f15c
F-15E  = f15
F-14D  = f14
F-4E   = f4
F-35C  = f35c
```

既存の`f15`は互換性維持のためF-15Eを指す。CROWNのF-15Cは必ず`f15c`を使う。

---

# 7. QA

- CROWNがF-16Cへ戻っていないか。
- CROWNの通常制空がF-15C、対地がF-4E、対艦がF-14Dになっているか。
- M06後にCROWNがM18まで前線飛行していないか。
- M19でCROWNがF-15Cにより限定復帰しているか。
- M20 CROWNがF-15Cのままか。
- LARK M01〜M06がM04以外F-16Cか。
- LARK M04がF-2Aか。
- LARK M07〜M16がF/A-18Fか。
- M09/M10が4AGM、M14がLASM、それ以外のM07〜M16が4AAMか。
- LARK M17〜M20がF-15Eか。
- F/A-18F / F-35Cの選択式兵装契約が維持されているか。
- M20 GIBORでTGT化した瞬間にCROWN/LARKの機種が変わっていないか。
- RAVENのプレイヤー機選択を強制していないか。
'''

# Write new canon first.
CANON.parent.mkdir(parents=True, exist_ok=True)
CANON.write_text(canon, encoding="utf-8")

# v0.14 character plan: add authoritative table and late return notes.
text = CHAR_PLAN.read_text(encoding="utf-8")
text = replace_once(text, "**更新日:** 2026-08-08", "**更新日:** 2026-08-10", "v0.14 update date")
anchor = "# 2. セラ編の人物登場表\n\n"
insert = '''# 2. セラ編の人物登場表\n\n> **搭乗機正本:** [v0.15 CROWN / LARK 正史搭乗機・特殊兵装運用計画](../v0.15/03_crown_lark_aircraft_canon.md)  \n> CROWN / LARKのNPC機体、M19復帰時期、M20最終戦機体は上記v0.15を優先する。\n\n## 2.0 ROOK搭乗機正史（2026-08-10確定）\n\n| M | CROWN | LARK |\n|---|---|---|\n| M01 | F-15C | F-16C |\n| M02 | F-4E | F-16C |\n| M03 | F-4E | F-16C |\n| M04 | F-14D | F-2A |\n| M05 | F-4E | F-16C |\n| M06 | F-15C | F-16C |\n| M07 | 前線離脱 | F/A-18F + 4AAM |\n| M08 | 前線離脱 | F/A-18F + 4AAM |\n| M09 | 前線離脱 | F/A-18F + 4AGM |\n| M10 | 前線離脱 | F/A-18F + 4AGM |\n| M11 | 前線離脱 | F/A-18F + 4AAM |\n| M12 | 前線離脱 | F/A-18F + 4AAM |\n| M13 | 前線離脱 | F/A-18F + 4AAM |\n| M14 | 前線離脱 | F/A-18F + LASM |\n| M15 | 前線離脱 | F/A-18F + 4AAM |\n| M16 | 前線離脱 | F/A-18F + 4AAM |\n| M17 | 前線離脱 | F-15E |\n| M18 | 無線のみ | F-15E |\n| M19 | F-15Cで限定復帰 | F-15E |\n| M20 | F-15C | F-15E |\n\nCROWNは通常・制空・護衛でF-15C、対地でF-4E、対艦でF-14Dを使い、F-16Cには乗らない。LARKはF-16CからF/A-18F、終盤F-15Eへ更新する。F/A-18Fは任務前に4AAM / 4AGM / LASMを選択する。F-35Cも同じ選択式マルチロール契約を持つが、現行M01〜M20のLARK固定表では使用しない。\n\n'''
text = replace_once(text, anchor, insert, "v0.14 aircraft canon insert")
text = replace_once(
    text,
    "### M19 TRUST FALL\n\n主目的:",
    "### M19 TRUST FALL\n\n- CROWNはF-15Cで限定復帰し、RAVEN／LARKと同一空域へ戻る。\n- 復帰を大げさなムービーにせず、通常の味方編成として扱う。\n\n主目的:",
    "v0.14 M19 CROWN return",
)
text = replace_once(
    text,
    "### M20 THE GUARANTOR\n\n#### ONE SHEM",
    "### M20 THE GUARANTOR\n\n固定編成はCROWN = F-15C、LARK = F-15E。GIBORで赤TGT化しても機種は変えない。\n\n#### ONE SHEM",
    "v0.14 M20 aircraft",
)
CHAR_PLAN.write_text(text, encoding="utf-8")

# v0.15 finale: synchronize return timing and M20 airframes.
text = FINALE.read_text(encoding="utf-8")
text = replace_once(text, "**更新日:** 2026-08-08", "**更新日:** 2026-08-10", "v0.15 update date")
text = replace_once(
    text,
    "> [v0.14 キャラクター実装計画](../v0.14/01_character_route_implementation_plan.md)\n",
    "> [v0.14 キャラクター実装計画](../v0.14/01_character_route_implementation_plan.md)  \n> [CROWN / LARK 正史搭乗機](./03_crown_lark_aircraft_canon.md)\n",
    "v0.15 aircraft link",
)
text = replace_once(
    text,
    'ROOK 1 "RAVEN"   PLAYER\n"CROWN"           BLUE FRIENDLY\nROOK 2 "LARK"     BLUE FRIENDLY',
    'ROOK 1 "RAVEN"   PLAYER / FREE AIRCRAFT\n"CROWN"           BLUE FRIENDLY / F-15C EAGLE\nROOK 2 "LARK"     BLUE FRIENDLY / F-15E STRIKE EAGLE',
    "v0.15 M20 roster aircraft",
)
text = replace_once(
    text,
    "CROWNはM06で重傷を負い前線を退いているが、M20だけは長期療養後の**一回限りの限定復帰**とする。",
    "CROWNはM06で重傷を負い前線を退く。M19でF-15Cにより**限定復帰**し、M20まで継続出撃する。復帰後も新型機へ換装しない。",
    "v0.15 CROWN return timing",
)
text = replace_once(
    text,
    "通常ルートでは、この3機はそのまま味方として戦闘を終え、帰投する。",
    "通常ルートでは、この3機はそのまま味方として戦闘を終え、帰投する。CROWNはF-15C、LARKはF-15Eのまま最後まで飛ぶ。",
    "v0.15 normal route aircraft",
)
FINALE.write_text(text, encoding="utf-8")

# v0.7 progression: sync roster terminology and multirole contract.
text = PROGRESSION.read_text(encoding="utf-8")
text = replace_once(
    text,
    "**優先関係:** 機体ロスター、購入許可、F-22／Su-57報酬、SR-71迎撃、アルカの扱い、ミッション密度、護衛任務の公平性については本書を最優先する。",
    "**優先関係:** 機体ロスター、購入許可、F-22／Su-57報酬、SR-71迎撃、アルカの扱い、ミッション密度、護衛任務の公平性については本書を最優先する。CROWN / LARKの正史搭乗機だけはv0.15/03を優先する。\n\n**2026-08-10追補:** F-15C / F-15Eを分離し、F/A-18FとF-35Cは4AAM / 4AGM / LASMを出撃前に選択できるマルチロール機として扱う。選択式マルチロールは万能性との交換で、純制空機より生の機動性を少し低く保つ。",
    "v0.7 priority supplement",
)
text = replace_once(text, "| 前半 | F/A-18F | 艦隊・多用途 |", "| 前半 | F/A-18F | 4AAM / 4AGM / LASM選択式マルチロール |", "v0.7 fa18 role")
text = replace_once(text, "| 中盤 | F-15 | 制空・長距離ミサイル |", "| 中盤 | F-15C | 純制空・4AAM・高機動 |\n| 後半前 | F-15E | 打撃戦闘・長距離任務 |", "v0.7 F-15 split")
text = replace_once(text, "| 後半 | F-35C | ステルス多用途 |", "| 後半 | F-35C | 4AAM / 4AGM / LASM選択式ステルスマルチロール |", "v0.7 f35 role")
text = replace_once(
    text,
    "Typhoon、Rafale M、Gripen Eはセラのプレイアブルから外す。",
    "F/A-18FとF-35Cは、特殊兵装選択による任務適応を強みにするため、F-15Cのような純制空機より旋回・ロールの生性能を少し低くする。\n\nTyphoon、Rafale M、Gripen Eはセラのプレイアブルから外す。",
    "v0.7 multirole tradeoff",
)
PROGRESSION.write_text(text, encoding="utf-8")

# Cross-document verification.
for path in (CHAR_PLAN, FINALE, PROGRESSION, CANON):
    data = path.read_text(encoding="utf-8")
    if "F-15C" not in data:
        raise SystemExit(f"verification: F-15C missing from {path}")

canon_text = CANON.read_text(encoding="utf-8")
for needle in (
    "M19 | TRUST FALL | **F-15Cで限定復帰** | **F-15E**",
    "M20 | THE GUARANTOR | **F-15C** | **F-15E**",
    "M14 | BREAKWATER | 前線離脱 | **F/A-18F + LASM**",
    "F/A-18F | 16 | 12 | 12",
    "F-35C | 16 | 12 | 14",
):
    if needle not in canon_text:
        raise SystemExit(f"verification: missing canon contract: {needle}")

print("apply_crown_lark_aircraft_canon: updated character plan, finale, progression, and wrote v0.15 aircraft canon")
