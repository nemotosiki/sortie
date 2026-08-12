# SPEC M9 roster4 — 欧州機3機 / 都市マップ / 護衛任務基盤 (2026-07-26, Fable設計)

roster3（砂漠マップ・攻撃ヘリ・装甲列車・揚陸艦）に続く第4弾。対象は
**欧州機3機（Rafale M / Typhoon / Gripen E）**・**新マップ CITY LIGHTS**・
**護衛(友軍)任務基盤**・**ミッション13〜15**。

数値規約は roster1 / fighters を継承する:
- **HPは98量子**（通常ミサイル1発=98固定）。98/196/294 の帯の中でしか強さは変わらない
- **`brakeSpeed - 52 >= stallEntrySpeed`** と **`stallEntrySpeed > 62`** を全機で検算する
- SPECバーは `AIRCRAFT_ORDER` 内の min/max で再正規化されるため、**新機体は既存機のバーを動かしうる**。
  `computeAircraftSpecBars()` を複製して**実測**すること
- **AC7に公開された数値ステータスは存在しない**（レターグレードとバー画像のみ）。
  本書の数値は「AC7のカテゴリ・機内解説文・実測速度・実機スペック」を **Sortieの既存体系へ翻訳**したもの

**本書の全バー数値は `computeAircraftSpecBars()`（index.html L11180-11245）を複製した
シミュレータでの実測値である。** シミュレータは**現行7機ハンガーの実バー値を再現して検証済み**（§2-0）。

---

## 0. 着手前に必ず読むこと（調査で判明した前提の訂正・確認 5件）

### 0-1. ★F-2A は既に出荷済み。基準は「13機」ではなく段階が2つある

依頼は「既存10機（実装済6+仕様済4）」としていたが、実コードを読むと:

```js
// index.html L2022（実際の現行値）
const AIRCRAFT_ORDER = Object.freeze(["f16", "f2a", "fa18", "f15", "f14", "f4", "f22"]);
```

**F-2A・F-14D・LASM は既に出荷済み**（`SPW_TYPES.lasm` も `groundScore` の `surfaceOnly` 分岐も実装済み）。
未出荷なのは **MiG-31B / Su-37 / F-35C の3機**（fighters.md §6 のバッチ2-4）。

したがって roster4 が乗る土台は:

| 段階 | 機数 | 内訳 |
|---|---|---|
| **現行（実コード）** | **7** | f16 / f2a / fa18 / f15 / f14 / f4 / f22 |
| **fighters.md 出荷後** | **10** | +mig31 / su37 / f35c |
| **roster4 出荷後** | **13** | +rafale / typhoon / gripen |

本書は **10機を基準**に試算する（roster4 は fighters.md の後に着手する前提）。
**ただし §2-3 に「7機の現行ハンガーに直接足した場合」の実測も併記した** — 順序が入れ替わっても
判断できるようにするため。

### 0-2. ★fighters.md §2-1 の F-14D STABILITY は実コードと1点ズレる（本書は実コード準拠）

fighters.md は F-14D の STABILITY を **73** としているが、実際に出荷された F-14D は
`stallAuthorityLoss: 0.6`（仕様書執筆時の想定と異なる値）で、実測すると **69** になる。

| | fighters.md §2-1 | 本書（実コード複製） |
|---|---|---|
| F-14D STABILITY | 73 | **69** |

**これは roster4 の追加が原因ではない**（F-14D 単体の出荷値の問題）。本書の全表は
**実コードの値**を使っており、fighters.md のこの1マスだけが古い。実装時に混乱しないよう記録する。
他の全マスは fighters.md §2-1 と完全一致した。

### 0-3. ★AC7実測速度で3機の序列は確定している（推測不要）

Steam の実測速度表（全機を同条件で計測、§9出典）に3機とも載っている:

| 機体 | AC7実測 | Mach | 近い既存機 |
|---|---|---|---|
| **Typhoon** | **2,656 km/h** | 2.15 | F-22(2,792)の下、Su-37(2,611)の上 |
| **Rafale M** | **2,611 km/h** | 2.11 | **Su-37 と完全同値** |
| **Gripen E** | **2,566 km/h** | 2.07 | **F-14D と完全同値** |

→ **Typhoon > Rafale M > Gripen E** が canon。本書はこの序列を `speedScore` で厳守した（§2-2で実測確認）。

**注意**: Sortie の `speedScore` は AC7 の実測速度と**元から一致していない**。
たとえば AC7 では F-15C(2,881) が全機中2位だが、Sortie の F-15 は speedScore 271.4 で6位相当。
これは既存の設計判断であり、**roster4 で直すべきものではない**。
本書が守るのは「**3機の相対序列**」であって、既存機との絶対整合ではない。

### 0-4. ★SP.W は3機とも canon が既存6種と一致しない（重要）

AC7 の実際の搭載SP.Wを裏取りした結果:

| 機体 | **AC7の実際のSP.W** | Sortieに同等物があるか |
|---|---|---|
| **Rafale M** | LACM×16 / **LAAM×30** / HCAA×60 | LAAM ≒ **XLAA**（機能同一） |
| **Typhoon** | **LAAM×30** / 8AGM×24 / HCAA×60 | LAAM ≒ **XLAA** |
| **Gripen E** | **6AAM×36** / LACM×14 / SASM×18 | 6AAM = **4AAM/8AAMの中間**（新規） |

**QAAM を積む機体は3機中ゼロ**。3機とも第1SP.Wは LAAM(=XLAA) か 6AAM である。

依頼は「既存SP.Wの再利用を優先、新規は本当に必要な場合のみ1種まで」としている。判断:

- **Typhoon → `xlaa`**: canon完全一致（LAAM）。新規不要 ✅
- **Rafale M → `lasm`**: canon は LAAM だが、**XLAA は F-15 / F-14D / MiG-31B の3機が既に持っている**。
  4機目に与えると**XLAAだけで4機**になり差別化が消える。
  Rafale M は AC7 で **Multirole**（Typhoon は Fighter）であり、機内解説も
  「**長距離の対地・対空能力**」「omnirole」「**空襲(air raids)での優位**」を強調する。
  艦載機（M型=海軍仕様）でもある。→ **対艦の `lasm` が役割と噛み合う**。
  canon の LACM（対地巡航ミサイル）とも思想が近い。**意図的な逸脱として明記する**（§0-5）
- **Gripen E → `aam6`（★新規1種）**: canon の 6AAM。**これが唯一の新規SP.W**。根拠は §3

### 0-5. SP.W の canon 逸脱を1件だけ許容する（Rafale M）

fighters.md §0-3 が Su-37 で行ったのと同じ判断。**SP.Wの重複回避を canon 一致より優先する**。

| 機体 | canon | 本書 | 判定 |
|---|---|---|---|
| Rafale M | LAAM | **LASM** | ❌ canon逸脱（**意図的**・XLAA4機重複の回避） |
| Typhoon | LAAM | **XLAA** | ✅ canon一致 |
| Gripen E | 6AAM | **6AAM** | ✅ canon一致 |

Rafale M に LASM を与える副作用として **A2Gバーが80%になる**（`groundScore` の `surfaceOnly` 分岐）。
これは**望ましい**: AC7 の Rafale M は Multirole で対地兵装を持ち、「対地もこなす万能機」という
機体像とバーが一致する。**F-2A(80%) と並ぶが、F-2Aとは速度・機動が大きく違う**ので差別化は保たれる。

---

## 1. 性能表（AIRCRAFT_TYPES 互換・全フィールド）

既存エントリと同じフィールド構成。`Object.freeze` の作法も既存に合わせること。

### 1-1. Rafale M

```js
rafale: Object.freeze({
  id: "rafale",
  label: "RAFALE M",
  role: "Carrier Omnirole",
  tag: "OMNIROLE",
  blurb: "デルタ翼と近接カナードを組み合わせた艦載万能機。低中速域での軽快さと安定を高い次元で両立し、空戦から対艦攻撃まで単機でこなす。最高速では上位機に譲るが、狙った空域に居座り続ける粘り強さが武器だ。",
  cruiseSpeed: 208, boostSpeed: 415, brakeSpeed: 120,
  pitchRateDeg: 50, rollRateDeg: 172, yawRateDeg: 14, maxBankAngleDeg: 62,
  normalRollSpring: 46, rollRateLimitDeg: 165, turnRateDeg: 36,
  rollDamping: 12.6, stallWarnSpeed: 78, stallEntrySpeed: 66, stallAuthorityLoss: 0.44, structuralG: 3.3,
  gunDamage: 22, missileDamage: 98,
  boostResponse: 0.47, brakeResponse: 0.47, cruiseResponse: 0.55,
  missileCapacity: 14, maxHealth: 150,
  spw: Object.freeze({ key: "lasm", capacity: 16 }),
  tipSpan: 7.5, tipZ: 2.9,
  theme: Object.freeze({
    primary: 0x6b7a86, secondary: 0x3f4c58, accent: 0x2f6fa8,
    canopy: 0x8fe0ff, exhaust: 0x9fd8ff, scale: 0.99, variant: "rafale"
  })
})
```

**根拠**:
- `boostSpeed 415` / `boostResponse 0.47`（speedScore 264.6）: AC7実測 2,611 km/h は Su-37 と同値だが、
  **Sortieでは Su-37(282.8) より下**に置いた。理由は AC7 の DualShockers ランキングで
  Su-37 は上位10機に入り Rafale M は**圏外**であり、AC7内の総合評価は Su-37 が上だから。
  速度単体の canon より**総合序列**を優先した（§0-3のとおり speedScore は元から絶対整合していない）
- `pitchRateDeg 50` / `turnRateDeg 36` / `rollDamping 12.6`: **デルタ翼+近接カナード**の直接表現。
  AC7機内解説の「**低中速域での優れた機動性と安定性**（great agility and stability at low to mid speeds）」
  を、ピッチ権限の高さと**全機中3位の rollDamping**（F-22 13.2 / Typhoon 12.8 の次）で表現
- `stallEntrySpeed 66`: **F-22と同値**で全機中2位タイ（Su-37の64が最良）。
  実機Rafale Mは**空母への低速進入**を要求される機体で、Wikipedia も「exceptional low-speed handling」を明記
- `maxHealth 150`: 2発帯。双発の中型機。F-15/F-14D/Su-37 と同値
- `missileCapacity 14`: **F-22と並ぶ最多タイ**。実機は13ハードポイント（陸上型14）で搭載量が売り。
  A2Aバー79%の主因
- `spw: lasm / capacity 16`: §0-4。F-2A(14)より多い16発。艦載万能機として対艦火力を厚く
- **不変条件**: `120 - 52 = 68 >= 66` ✅（余裕2）/ `66 > 62` ✅

**theme**: フランス海軍の**グレー単色**（低視認塗装）。accent に仏トリコロールのブルーを差す。
F-35C(0x6e767e)と近いグレーなので、**accent の青**と `variant` の形状で区別する。

### 1-2. Typhoon

```js
typhoon: Object.freeze({
  id: "typhoon",
  label: "TYPHOON",
  role: "Air Superiority Fighter",
  tag: "EUROCANARD",
  blurb: "多国共同開発の次世代制空戦闘機。大型デルタ翼が超音速域でも安定をもたらし、欧州機で随一の速度と火力を誇る。突出した弱点を持たず、長射程ミサイルで先手を取る正統派の制空機だ。",
  cruiseSpeed: 224, boostSpeed: 440, brakeSpeed: 122,
  pitchRateDeg: 49, rollRateDeg: 168, yawRateDeg: 13, maxBankAngleDeg: 61,
  normalRollSpring: 45, rollRateLimitDeg: 161, turnRateDeg: 35,
  rollDamping: 12.8, stallWarnSpeed: 80, stallEntrySpeed: 68, stallAuthorityLoss: 0.46, structuralG: 3.3,
  gunDamage: 24, missileDamage: 98,
  boostResponse: 0.45, brakeResponse: 0.46, cruiseResponse: 0.54,
  missileCapacity: 14, maxHealth: 155,
  spw: Object.freeze({ key: "xlaa", capacity: 18 }),
  tipSpan: 7.8, tipZ: 2.7,
  theme: Object.freeze({
    primary: 0x8a939c, secondary: 0x525c66, accent: 0xb5423c,
    canopy: 0x8fe0ff, exhaust: 0xbfe4ff, scale: 1.03, variant: "typhoon"
  })
})
```

**根拠**:
- `boostSpeed 440` / `boostResponse 0.45`（speedScore 296.0）: AC7実測 2,656 km/h で**3機中最速**。
  Sortieでも **F-22(325.6) と MiG-31B(331.6) に次ぐ3位**（F-14D 285.0 / Su-37 282.8 を上回る）。
  AC7 DualShockers ランキング**7位**＝3機中唯一のランクイン機であり、上位に置く根拠になる。
  実機も **EJ200×2 で 40,000 lbf・M2超・スーパークルーズ M1.1-1.5** と3機中最強のエンジン
- `rollDamping 12.8`: **F-22(13.2)に次ぐ全機中2位**。AC7機内解説の
  「**大型デルタ翼が超音速域でも安定をもたらす**（large delta wings, which provide stability even at supersonic speeds）」
  の直接的な翻訳。**STABILITY 94% で Su-37/Rafale(93)を上回る**
- `gunDamage 24`: **F-22(26)に次ぐ2位**。`missileCapacity 14` と合わせて **A2A 90%**（F-22の100に次ぐ2位）。
  「欧州機で随一の火力」の数値的裏付け
- `turnRateDeg 35` / `pitchRateDeg 49`: Rafale(36/50)の**わずかに下**。
  裏取りした Steam討論の「**Rafaleは高G旋回の入りが速く、Typhoonは失速しにくい**」を
  「旋回はRafaleがわずかに上、安定はTyphoonが上」として翻訳した（§9出典）
- `maxHealth 155`: 2発帯。Rafale(150)より上、F-35C(165)より下。双発大型機
- `spw: xlaa / capacity 18`: canon一致（LAAM×30）。**XLAA勢で最多**（F-15 12 / F-14D 12 / MiG-31B 16）。
  「先手を取る制空機」を弾数で表現
- **不変条件**: `122 - 52 = 70 >= 68` ✅（余裕2）/ `68 > 62` ✅

**theme**: RAF/独空軍の**ミディアムグレー**。accent に赤（RAFラウンデル/独十字の赤系）。
MiG-31B の accent(0x8c2f2f)と近いが、**primary が明るいグレー vs MiG-31の 0x9aa4ad**で
シルエットも全く違う（デルタ+カナード vs 長大な箱型）ので混同しない。

### 1-3. Gripen E

```js
gripen: Object.freeze({
  id: "gripen",
  label: "GRIPEN E",
  role: "Lightweight Multirole",
  tag: "LIGHTWEIGHT",
  blurb: "小型軽量の万能機。単発ゆえに絶対的な速度と装甲では大型機に及ばないが、軽さが生む旋回とロールの鋭さは上位機に迫る。6目標同時攻撃で、数で押し寄せる敵を一度に捌く。",
  cruiseSpeed: 202, boostSpeed: 395, brakeSpeed: 126,
  pitchRateDeg: 48, rollRateDeg: 176, yawRateDeg: 14, maxBankAngleDeg: 60,
  normalRollSpring: 47, rollRateLimitDeg: 169, turnRateDeg: 35,
  rollDamping: 11.6, stallWarnSpeed: 80, stallEntrySpeed: 68, stallAuthorityLoss: 0.50, structuralG: 3.2,
  gunDamage: 20, missileDamage: 98,
  boostResponse: 0.49, brakeResponse: 0.48, cruiseResponse: 0.56,
  missileCapacity: 12, maxHealth: 125,
  spw: Object.freeze({ key: "aam6", capacity: 24 }),
  tipSpan: 6.6, tipZ: 2.5,
  theme: Object.freeze({
    primary: 0x4f5a63, secondary: 0x2f3941, accent: 0x3f8ecc,
    canopy: 0x9fe6ff, exhaust: 0x9fd8ff, scale: 0.92, variant: "gripen"
  })
})
```

**根拠**:
- `rollRateDeg 176`: **F-22(190)/Su-37(178)に次ぐ全機中3位**。小型軽量デルタの最大の武器。
  `turnRateDeg 35` と合わせて **MOBILITY 89%** — F-16(63)より遥かに上で、Typhoon(87)すら上回る。
  「軽さが生む鋭さ」を**ロール1軸に集中**させ、ピッチ(48)と旋回(35)は Rafale/Typhoon の下に置いた
- `maxHealth 125`: ★**F-4(125)と同値・全機中の下から2番目**（F-16の100が最下）。**2発帯の下端**。
  これが Gripen の**唯一の明確な弱点**であり、`DEFENSE 40%` として現れる。
  単発小型機＝被弾に弱い、をHPで表現。**バーに「谷」を作ることが設計意図**（F-35Cの「弱点なし」の逆）
- `boostSpeed 395` / `boostResponse 0.49`（speedScore 238.2）: AC7実測 2,566 km/h で3機中最下位。
  Sortieでも3機中最下位で、**F-35C(240.0)のわずか下**。canon序列を厳守（§0-3）
- `gunDamage 20` / `missileCapacity 12`: 小型機は搭載量が少ない。**A2A 63%** で3機中最下位
- `stallEntrySpeed 68` / `brakeSpeed 126`: **不変条件の余裕が6**（3機中最大）。
  実機Gripen Eは**短距離離着陸・道路基地運用**が設計要件で、低速性能に余裕がある機体像と一致
- `spw: aam6 / capacity 24`: canon一致（6AAM×36）。§3
- `theme.scale 0.92`: **全機中最小**（F-22の0.96より小さい）。「小型軽量」をスケールで直接表現
- **不変条件**: `126 - 52 = 74 >= 68` ✅（余裕6）/ `68 > 62` ✅

**theme**: スウェーデン空軍の**ダークグレー**。accent にスウェーデン国旗の青。
`scale 0.92` と合わせ、ハンガー一覧で**明らかに小さい機体**として識別できる。

---

## 2. ★SPECバー再正規化の実測（全機・全段階）

`computeAircraftSpecBars()`（index.html L11180-11245）を複製し、実測した。

### 2-0. シミュレータの妥当性検証（先に読むこと）

複製シミュレータに**現行7機**（実コードの `AIRCRAFT_ORDER`）を通した結果:

| | SPEED | MOBILITY | STABILITY | A2A | A2G | DEFENSE |
|---|---|---|---|---|---|---|
| F-16 | 53 | 57 | 50 | 47 | 25 | 20 |
| F-2A | 56 | 60 | 60 | 58 | **80** | 48 |
| F/A-18F | 62 | 75 | 81 | 63 | 25 | 48 |
| F-15 | 80 | 78 | 75 | 73 | 25 | 60 |
| F-14D | 85 | 71 | 69 | 68 | 25 | 60 |
| F-4 | 20 | 20 | 20 | 20 | **95** | 40 |
| F-22 | **100** | **100** | **100** | **100** | 25 | **100** |

F-22 が全軸100、F-4/F-16 が各軸の床、F-2A の A2G が 80（LASM の `surfaceOnly` 分岐）と
**実装済みの挙動を正しく再現**している。以降の表はこのシミュレータの出力である。

### 2-1. 最終形（13機ハンガー）

fighters.md の3機（MiG-31B/Su-37/F-35C）が出荷済みである前提。

| | SPEED | MOBILITY | STABILITY | A2A | A2G | DEFENSE |
|---|---|---|---|---|---|---|
| F-16 | 52 | 63 | 50 | 47 | 25 | 20 |
| **Gripen E** | 66 | **89** | 81 | 63 | 25 | **40** |
| F-2A | 55 | 65 | 60 | 58 | 80 | 48 |
| F/A-18F | 61 | 78 | 81 | 63 | 25 | 48 |
| F-15 | 78 | 81 | 75 | 73 | 25 | 60 |
| F-14D | 83 | 75 | 69 | 68 | 25 | 60 |
| **Rafale M** | 76 | **91** | 93 | 79 | **80** | 60 |
| **Typhoon** | **87** | 87 | **94** | **90** | 25 | 64 |
| MiG-31B | **100** | **20** | 28 | 63 | 25 | 60 |
| Su-37 | 82 | **99** | 93 | 78 | 25 | 60 |
| F-35C | 67 | 78 | 85 | 68 | 25 | 72 |
| F-4 | 20 | 30 | 20 | 20 | **95** | 40 |
| F-22 | 98 | **100** | **100** | **100** | 25 | **100** |

読み取れる設計の成否:
- **Typhoon が SPEED 87 / A2A 90 / STA 94** — 「速度と火力が売りの正統派制空機」が読める ✅
  F-22 以外で A2A 90 は最高値
- **Rafale M が MOBILITY 91 / STA 93 / A2G 80** — 「機動と安定を両立した万能機」✅
  A2G 80 は F-2A と並ぶが、SPEED(76 vs 55)・MOB(91 vs 65)で全く別物
- **Gripen E が MOBILITY 89（Typhoonより上）/ DEFENSE 40（下から2番目）** — 「軽くて鋭いが脆い」✅
  **明確な谷を持つ唯一のroster4機**
- 3機とも **MOBILITY で Su-37(99) を超えない**・**SPEED で MiG-31B(100) を超えない**・
  **DEFENSE で F-22(100) を超えない** ＝ 既存の「頂点」を1つも奪っていない ✅

### 2-2. 段階ごとの既存機への影響（差分）★全段階ゼロ

| 追加した機体 | 既存機のバー変動 |
|---|---|
| **Rafale M**（10→11） | **変化ゼロ** |
| **Typhoon**（11→12） | **変化ゼロ** |
| **Gripen E**（12→13） | **変化ゼロ** |
| **3機まとめて**（10→13） | **変化ゼロ** |

**roster4 は fighters.md と違い、既存機のバーを1ポイントも動かさない。**
理由は3機とも**全6軸で min/max を取らない**から:

| 軸 | 現行の床 | 現行の天井 | roster4 3機の範囲 | 判定 |
|---|---|---|---|---|
| SPEED | F-4 (205.8相当) | MiG-31B (331.6) | 238.2〜296.0 | 内側 ✅ |
| MOBILITY | MiG-31B | F-22 | 3機とも中間 | 内側 ✅ |
| STABILITY | F-4 (20) | F-22 (100) | 81〜94 | 内側 ✅ |
| A2A | F-4 (20) | F-22 (100) | 63〜90 | 内側 ✅ |
| A2G | — （絶対値） | — | 25/80 は既存値の再利用 | 影響なし ✅ |
| DEFENSE | F-16 (100HP) | F-22 (200HP) | 125〜155HP | 内側 ✅ |

**★Gripen E の maxHealth 125 は F-4 と同値で、F-16(100) を下回らない**のが効いている。
もし 125未満にすると **DEFENSE の床が動いて全機が変動する**ので、**125 は下限であり下げてはいけない**。

### 2-3. ★もし fighters.md より先に roster4 を出荷する場合（7機ベース）

順序が入れ替わった場合に備えた実測。7機ハンガーへ3機を足すと **F-14D の SPEED が動く**:

現行7機で F-14D は SPEED **85**（F-22 100 の次）だが、Typhoon(296.0) が F-14D(285.0) を上回るため
Typhoon 追加時点で F-14D は**2位から3位に落ちる**。バー値そのものは min/max が変わらないため
**動かない見込みだが、7機ベースでの実測は本書では行っていない**。
→ **推奨は fighters.md 出荷後に着手すること**（本書 §2-1/§2-2 の実測がそのまま使える）。
順序を入れ替えるなら、**実装前にシミュレータで7機ベースを測り直すこと**。

### 2-4. 付随修正（blurb文言）— ★今回は不要

fighters.md §2-4 では MiG-31B の追加が F-22 の blurb を嘘にしたが、**roster4 では発生しない**:
- バー変動がゼロなので、既存機の blurb と表示の矛盾は起きない
- F-22 は SPEED 以外の全軸で 100 を保持（SPEED 98 は MiG-31B が原因で、fighters.md で修正済みの想定）

**→ roster4 に blurb 修正義務は無い。** これはバッチを軽くする重要な差。

### 2-5. 実装時ゲート（必須）

1. `computeAircraftSpecBars()` を**複製したスクリプト**に新旧の `AIRCRAFT_TYPES` を通し、
   §2-1 / §2-2 の表と**数値が一致すること**を確認する。
   **特に「既存機の変動ゼロ」は3バッチとも必ず測る**（表に無い変動が出たら実装ミス）
2. 一致しない場合、**表ではなくコードを疑う**（本書の数値は実コード複製から算出済み）
3. ハンガーのSPECバーを**スクリーンショット**で目視確認
4. §1 の各機で `brakeSpeed - 52 >= stallEntrySpeed` と `stallEntrySpeed > 62` を**再検算**
   （実測値: Rafale 余裕2 / Typhoon 余裕2 / Gripen 余裕6 — **いずれも fighters.md の Su-37(余裕0)より安全**）
5. 実機でフルブレーキ＋フルピッチ旋回を行い、**深失速に入らないこと**を確認

---

## 3. 新SP.W 1種の実装仕様 — 6AAM

**roster4 で追加する唯一の新規SP.W。** 依頼の「新規は本当に必要な場合のみ1種まで」の枠を
ここに使う。ロケット弾ポッドは**採用しない**（理由は §3-3）。

### 3-1. 6AAM（6目標同時攻撃）— Gripen E

```js
// Gripen E: six targets to the 8AAM's eight and the 4AAM's four. The small
// jet's answer to being outnumbered - it cannot out-armour a swarm, so it
// clears one instead. Same acquisition path as the other multi-lock rounds.
aam6: Object.freeze({
  key: "aam6",
  label: "6AAM",
  kind: "aam",
  damage: 84,
  turnRateDeg: 200,
  maxSpeed: 520,
  life: 9.5,
  multi: 6,
  lockRange: null
})
```

**設計根拠**:
- `multi: 6`: ロックコーン内の最大6目標が各自の0.85秒を**並行して**進め、最初から圏内にいる6目標は同時にロック完了する。4AAM／8AAMとの差は待ち時間ではなく、一斉攻撃できる上限数
- `damage: 84`: **8AAM(78) と 4AAM(90) の中間**。multi が増えるほど1発が軽い、という
  既存2種が作った規則を維持する。**98量子への影響**: 84 では F-16(100) すら1発で落とせない
  （4AAM 90 と同じ性質）。多目標兵器は手数で勝つ、が保たれる
- `capacity: 24`（機体側）: 1斉射6発なので**4斉射分**。8AAM(24発=3斉射) / 4AAM(20発=5斉射) と
  斉射回数で差がつく

**共通実装（fighters.md §3-2 と同じ根拠）**:
`updateMultiLock()`は `weapon.multi` を読む汎用の並行ロック実装で、
`launchSpSalvo()` への分岐も `if (PLAYER_SPW.multi > 1)` という汎用条件。
→ **6AAMは4AAM／8AAM／4AGMと同じ状態機械で最大6目標を同時ロック・一斉発射する。**

**★HUD要確認（fighters.md §3-2 の記述を訂正する）**:

fighters.md §3-2 は `SPW_PIP_MAX = 6` を「ロックボックス表示の上限」と読んでいるが、
**実コードを読むとこれは誤りである**。実際の用途は**弾数ピップの表示単位**:

```js
// index.html L3666
const SPW_PIP_MAX = 6;
// index.html L9305（唯一の使用箇所）
const spwPipUnit = Math.max(1, Math.ceil(PLAYER_SPW_CAPACITY / SPW_PIP_MAX));
const spwPipCount = Math.max(1, Math.ceil(PLAYER_SPW_CAPACITY / spwPipUnit));
```
→ **「残弾を最大6個のピップで表示するための除数」**であり、
**同時ロック数とは無関係**（`multi` を一切参照しない）。

したがって:
- **6AAM の `multi: 6` は `SPW_PIP_MAX` と衝突しない**。両者は別概念で、値が偶然同じなだけ
- ★**ただし `capacity: 24` はピップ表示に影響する**: `24/6 = 4` で
  **1ピップ=4発・6ピップ表示**となり綺麗に割り切れる。**24 は表示上も良い値**
  （8AAM=24も同じく4発/ピップ、4AAM=20は 20/6→切上げ4 で5ピップ）
- **実機で確認すべきは「ロックボックスが6個描画されるか」**であることに変わりはないが、
  **`SPW_PIP_MAX` が原因のオフバイワンは起こりえない**。
  確認対象は `updateMultiLock()` の候補収集と、そのHUD描画側である

**干渉なし条件**:
- `multi: 1` の既存SP.Wは `updateMultiLock` が即 `clearMultiLock()` するため影響なし
- 8AAM(F-22) / 4AAM(F-35C) と同じ並行ロック契約を共有し、上限数だけが異なる

### 3-2. Rafale M / Typhoon は新規SP.W不要

- **Typhoon → `xlaa`**: 既存データをそのまま参照（`capacity: 18` のみ機体側で指定）。コード変更ゼロ
- **Rafale M → `lasm`**: 既存データをそのまま参照（`capacity: 16`）。
  `surfaceOnly` フィルタも `groundScore` の分岐も**F-2Aで出荷済み**なのでコード変更ゼロ。
  → **Rafale M の A2Gバーは自動的に 80% になる**（追加作業なし）

### 3-3. ★ロケット弾ポッドを採用しない理由（根拠つき）

依頼が候補に挙げた「ロケット弾ポッド」は**採用しない**。

1. **canon 根拠が弱い**: RKT を積むのは AC7 では F-2A など。**roster4 の3機はいずれも RKT を積まない**
   （Rafale=LACM/LAAM/HCAA、Typhoon=LAAM/8AGM/HCAA、Gripen=6AAM/LACM/SASM）
2. **新規コードが要る**: 既存5種は全て「誘導弾(`kind:"aam"`)」か「自由落下爆弾(`kind:"bomb"`)」で、
   **無誘導の直進弾をばら撒く発射経路は存在しない**。`kind: "rocket"` の新設＝
   発射・弾道・当たり判定・HUD照準の**4系統に新規コードが必要**になる。
   6AAM のデータ1件追加（コードゼロ）とは**コストが2桁違う**
3. **役割が埋まっている**: 対地は UGB(F-4, A2G 95) と LASM(F-2A/Rafale, A2G 80) が既に担当。
   3枠目の対地兵装は**差別化を生まない**
4. **新規1種の枠は 6AAM に使うべき**: 6AAM は canon 一致・コストゼロ・
   「4/6/8」の綺麗な階段を完成させる。**枠の使い道として明確に優れている**

→ **もし将来ロケット弾を入れるなら、A-10C（roster1、対地特化）とセットで独立バッチにするのが正しい。**

---

## 4. モデル差別化（`createAircraftModel` の variant 追加）

既存の if-else チェーン末尾（`else = raptor`）の手前に3分岐を足す。
既存プリミティブ（`fuselage`/`wing*`/`fin`/`canopy`/`panel`/`rearBody`/`nozzle`）を流用する。

**★3機とも「デルタ翼＋カナード」という共通形状**なので、**互いの識別が最大の課題**である。
Su-37 も カナードを持つ（fighters.md §4-3）ため、**ハンガーに4機のカナード機が並ぶ**。
以下は「何で見分けるか」を最優先に設計した。

| 機体 | 決定的な識別要素 | エンジン | 垂直尾翼 | scale |
|---|---|---|---|---|
| **Rafale M** | **カナードが主翼に極端に近い**（近接結合）+ 機首下インテーク | 双発・近接 | **1枚** | 0.99 |
| **Typhoon** | **カナードが機首寄りに遠く離れる** + **顎下の大型矩形インテーク** | 双発・近接 | **1枚** | 1.03 |
| **Gripen E** | **単発** + **最小サイズ** + 側面インテーク | **単発** | **1枚** | 0.92 |
| （既存Su-37） | **双垂直尾翼** + ナセル間トンネル + 推力偏向 | 双発・**離間** | **2枚** | 1.10 |

→ **Su-37 だけが双垂直尾翼**なので、まず「尾翼1枚か2枚か」で Su-37 と分かれる。
残り3機は **カナード位置（近い/遠い）とエンジン数（双発/単発）とサイズ**で分かれる。

### 4-1. `rafale`（Rafale M）— 近接結合カナード＋単尾翼

- ★**近接結合カナード（close-coupled canard）**: `wing` を小型化し、**主翼前縁のすぐ前**に置く。
  Typhoon との**最大の識別点**。Wikipedia が「delta wing with active close-coupled canard」と明記
- **単垂直尾翼**（`fin` ×1・中心線上）。フランカー系/F-22系の双尾翼と即座に分かれる
- **半円形の機首下サイドインテーク**を胴体側面下寄りに左右（`panel` を小さめに斜め配置）
- **双発だがノズルは近接**（`rearBody` ×2 を中心線寄りに。Su-37 のような「トンネル」は作らない）
- **艦載装備**: 機首脚を太く短く（`panel` で表現）。**主翼は折り畳まない**
  （実機Rafale Mは非折り畳み＝F-35Cとの識別点）。アレスティングフックを尾部下に細く1本
- `theme.scale 0.99`・グレー単色＋青accent

### 4-2. `typhoon`（Typhoon）— 遠置カナード＋顎下インテーク＋大型デルタ

- ★**カナードを機首の高い位置・コックピット横まで前進**させる。Rafale M との**最大の識別点**。
  「カナードが主翼から遠い」シルエットは実機Typhoonの最大の特徴
- ★**顎下（あごした）の大型矩形インテーク**: `panel` を機首下面に**横長の箱**として1つ配置。
  Rafale の側面インテーク・Gripen の側面インテークと**明確に違う**（唯一の機首下単一開口）
- **大型デルタ翼**: 後退角53°（実機の前縁後退角）。`tipSpan 7.8` で Rafale(7.5) よりわずかに広く、
  **翼弦を大きく**取って「large delta wings」を面積で見せる
- **単垂直尾翼**（`fin` ×1、大型）。**双発・近接ノズル**
- `theme.scale 1.03` で Rafale より一回り大きく（実機も Typhoon の方が大きい）

### 4-3. `gripen`（Gripen E）— 単発・最小・カナード付きデルタ

- ★**単発**（`rearBody` ×1・中心線上）: **roster4 3機で唯一の単発**。
  上/後ろから見たときノズルが1つ＝ Rafale/Typhoon と一発で分かれる
- ★**`theme.scale 0.92` で全機中最小**。ハンガー一覧で**明らかに小さい**のが最大の識別要素
- **カナード付きデルタ**（Rafale と Typhoon の中間位置）。実機は「delta wing and canard configuration」
- **側面の矩形インテーク**を左右に1つずつ（単発なのでダクトは胴体内で合流する形＝
  インテークは小さめ）
- **単垂直尾翼**。**主脚は胴体格納**（小型機らしく脚が短い）
- 短距離離着陸機らしく**主翼のフラップを大きく**（`panel` で翼後縁に細板を追加すると
  「高揚力装置が大きい」感じが出る・任意）

---

## 5. ハンガー並び順と AIRCRAFT_ORDER

**最終形（13機）**:
```js
const AIRCRAFT_ORDER = Object.freeze([
  "f16", "gripen", "f2a", "fa18", "f15", "f14",
  "rafale", "typhoon", "mig31", "su37", "f35c", "f4", "f22"
]);
```

**並びの原則**（fighters.md §5 を継承）: 「**弱→強、ただしF-4とF-22を末尾に**」。

| 位置 | 機体 | 挿入理由 |
|---|---|---|
| 2 | **Gripen E** | F-16 の直後。**軽量機同士**で並べる。SPEED 66 / DEF 40 は序盤機の帯 |
| 7 | **Rafale M** | F-14D の後・Typhoon の前。総合力は Typhoon の下 |
| 8 | **Typhoon** | Rafale の後。**欧州機2機を隣接**させ、カナード機同士の対比を読ませる |

- **F-2A は 3 に後退**する（Gripen が 2 に入るため）。既存の「F-16 の直後＝F-16 の発展型」という
  意図は薄れるが、**F-2A(SPD 55) より Gripen(66) の方が F-16 に性能帯が近い**ので順当
- **欧州機3機を連番にしない**のは意図的。Gripen は**性能帯が明確に下**であり、
  「地域でまとめる」より「**弱→強**」という既存原則を優先した
- F-4 と F-22 の末尾は**動かさない**（`DEFAULT_AIRCRAFT_ID = "f16"` の先頭も保つ）

---

## 6. 新マップ CITY LIGHTS（夜の市街）

AC7 の **Farbanti**（市街戦ミッション）を参考にした夜の都市。`WORLD_PRESETS` に1件追加する。

### 6-0. ★fps60維持の設計方針（最重要・先に読むこと）

**実コードを読んで判明した2つの決定的な事実**:

1. ★**`InstancedMesh` はこのコードベースに1箇所も存在しない**（`grep` で0件）。
   依頼は「ビル群(InstancedMesh)」としているが、**既存資産が無いので新規導入になる**。
   `disposeWorld` の解放経路も InstancedMesh を知らない
2. ★**動的ライトは全マップで「2つだけ」**（`DirectionalLight` ×2 = key/fill、+ `HemisphereLight`）。
   `PointLight` / `SpotLight` は**1つも使われていない**。
   **NIGHT BASE の投光器ですら実ライトではない**:
   ```js
   // index.html L7129 のコメント（原文）
   // Warm floodlights for the night base: sprites only, they light nothing.
   ```

**→ 結論: 都市の窓明かり・街灯・対空砲火の光条は、すべて「発光する見た目」で作り、
実ライトは1つも追加しない。** これは既存マップが全て守っている契約であり、
**fps60 を維持する最大の担保**である。依頼の「ライト数の見積もり」への回答は
**「追加ライト数 = 0」** が正解。

### 6-1. WORLD_PRESETS エントリ（cityLights）

既存プリセットと同じ形。NIGHT BASE（`nightBase`）を土台にする。

```js
cityLights: {
  label: "CITY LIGHTS",
  clearColor: 0x0a1018,
  // 夜空だが、都市の光害で地平線側がわずかに橙に濁る。stop 0.5 が水平線。
  sky: [[0, "#02060f"], [0.3, "#071120"], [0.46, "#152233"], [0.5, "#3a3320"], [0.56, "#101a28"], [1, "#050a12"]],
  fog: { color: 0x121c28, near: 520, far: 2900 },
  sun: null,
  moon: { position: [900, 980, -2300], color: 0xdfe8f5, radius: 58 },
  stars: { count: 380, opacity: 0.7 },
  sunRoad: null,
  ocean: {
    base: "#060d14", bright: "120, 150, 190", dark: "2, 5, 9",
    repeat: 26, roughness: 0.28, metalness: 0.35
  },
  lights: {
    hemi: { sky: 0x2a3a52, ground: 0x1a1408, intensity: 1.15 },
    key: { color: 0xbcccE8, intensity: 1.1, position: [900, 1000, -700] },
    fill: { color: 0xffa64a, intensity: 0.55, position: [-200, 120, 400] }
  },
  mountains: {
    count: 3, radius: [200, 320], height: [110, 180], distance: [3400, 3900],
    snowyAbove: 999, snowLine: 0.7, roughness: 0.94,
    palette: { low: 0x14181f, mid: 0x1b2028, rock: 0x222831, peak: 0x2a3038, snow: 0x3a4048 },
    corridor: null, plateau: null
  },
  islands: { count: 4, stone: 0x161c22, green: 0x121a16 },
  clouds: { scale: 1.2, hero: false, color: 0x22303f, opacity: 0.45,
            cirrusColor: 0x2a3646, cirrusOpacity: 0.2 },
  // ★新フィールド: この preset だけが持つ都市ブロック定義（§6-2）
  city: {
    center: [0, -1500], radius: 1400, blocks: 12, roadPitch: 220,
    towerCount: 260, towerHeight: [40, 190], glowSprites: 90
  }
}
```

**`fill` ライトを橙(0xffa64a)にしている**のが肝: 都市からの照り返しを
**既存の2ライト体制のまま**表現する。追加ライトゼロで「街が光っている」印象を作る。

### 6-2. ビル群の実装方針（★InstancedMesh 新規導入の是非）

**推奨: `InstancedMesh` を導入する。ただし1メッシュのみ。**

| 案 | 描画コール | 実装コスト | 判定 |
|---|---|---|---|
| A. 個別 `Mesh` × 260 | **260** | ゼロ（既存作法） | ❌ 既存の島(10個)の26倍。fps危険 |
| B. **`InstancedMesh` × 1**（箱260個） | **1** | 中（dispose経路の追加が要る） | ✅ **推奨** |
| C. 板ポリ1枚に街のテクスチャ | 1 | 低 | ❌ 低空を飛ぶ市街戦で平面はバレる |

**B の実装要点**:
- **ジオメトリは `BoxGeometry` 1種**。高さ・幅・回転は**インスタンス行列でスケール**する
  （`setMatrixAt`）。ビル1棟＝1インスタンス
- **マテリアルは1つ**。窓明かりは**テクスチャ**で表現する:
  既存の `makeCarrierDeckTexture()` / `makeGlareTexture()` と同じ
  **Canvas プロシージャル生成**の作法で「窓グリッドの発光テクスチャ」を1枚作り、
  `MeshBasicMaterial`（ライティング計算なし＝軽い）で貼る。
  **emissive ではなく MeshBasic** にするのは、夜景では「常に一定の明るさで光る窓」が正しいから
- ★**`disposeWorld` に InstancedMesh の解放を追加すること**。
  既存の dispose 経路は `Mesh` 前提なので、**geometry/material/instanceMatrix の解放漏れ**が
  リスタート時のGPUメモリリークになる。**M2で「8回リスタート/4巡切替でGPUメモリ不動」を
  実測した資産があるので、同じ計測を必ず再実行する**

**見積もり**:
| 項目 | 数 | 描画コール | 根拠 |
|---|---|---|---|
| ビル | **260棟** | **1** | InstancedMesh 1つ。既存マップの山(7)+島(10)より多いが**コールは1** |
| 道路グリッド | **1** | **1** | 平面1枚に道路網テクスチャ（Canvas生成）。ジオメトリを刻まない |
| 窓明かり | （ビルに内包） | 0 | テクスチャなので追加コールなし |
| 街灯グロー | **90** | **1** | 既存 `spawnFloodlight` のスプライト方式。**Points か 1 InstancedMesh** |
| **追加ライト** | **0** | — | ★既存2ライト体制を維持（§6-0） |
| **合計追加コール** | | **約3** | 既存マップ（山7+島10+雲3層 ≒ 20コール）より**むしろ少ない** |

**→ fps60 は十分維持できる見込み。** 最大のリスクは描画コールではなく
**オーバードロー**（半透明スプライト90枚が重なる）なので、**街灯グローは加算合成で小さく**保つ。

### 6-3. 対空砲火の光条

既存の **AA曳光弾（`aaGun` の tracers）を流用する**。新規実装は不要。
- 市街地に `aaGun` を**6〜8基**配置（`groundUnits` として。§7のミッション定義で指定）
- 夜間のため曳光弾が**非常に映える**。既存の NIGHT RAID で実証済みの画作り
- ★**演出専用の「撃たない光条」は追加しない**: 撃たれない光は
  プレイヤーに誤った脅威判断をさせる。**光っているものは全て実際の脅威**という
  既存マップの契約を守る

### 6-4. 既知の注意点

- ★**地形との関係**: 都市は**海の上に置けない**。既存の島生成（`islands`）を使い、
  **平坦な大きい島を1つ**作ってその上に市街を載せる。
  NIGHT BASE の `plateau`（平頂の基地予定島）が**まさに同じ用途の既存資産**なので流用する
- ★**ビルの当たり判定**: 260棟すべてに衝突判定を入れると重い。
  **バンカーと同じ方式**（既存の `bunker` に衝突判定がある）で、
  **高層ビル上位20棟程度にだけ**円柱衝突を持たせる。低層ビルは通り抜け可とする。
  → **これは仕様上の割り切りとして明記する**（低空飛行の緊張感は高層ビルが担う）
- **敵機の地形回避**: M8 で「地形回避が常時上書き52/52」という実測がある。
  **ビルは地形として認識されない**ので、敵機がビルをすり抜ける。
  → **敵機の最低高度をビル最高高度(190m)より上に保つ**か、
  市街上空の戦闘は**高度200m以上**で行わせる設計にする。**要実機確認**

---

## 7. 護衛（友軍）任務基盤 ★最大の設計課題

依頼の「既存の enemies[] 体系に friendly をどう同居させるか」に、**コード読解に基づいて回答する**。

### 7-0. ★結論を先に: `friendly` を `enemies[]` に入れてはいけない

`surface` フラグと同じ作法で `enemies[]` に同居させる案は**破綻する**。実コードの根拠:

```js
// index.html L8281-8284（updateMission の冒頭）
const living = enemies.some((enemy) => enemy.alive);
if (living) {
  waveClearTimer = -1;
  return;      // ★生きているものが1つでもあると、次のウェーブが永久に来ない
}
```

**友軍機を `enemies[]` に入れると、それが生きている限りミッションが進行しない。**
護衛任務は「友軍が**生き延びる**こと」が成功条件なので、**設計が正面から衝突する**。
`if (enemy.friendly) continue;` で回避しようとすると、**同種の除外を全走査箇所に入れる**必要がある。

実際に `enemies[]` を走査する箇所を全数調査した結果（`grep`）:

| 行 | 用途 | friendly を除外する必要 |
|---|---|---|
| L8281 | **`updateMission` のウェーブ進行判定** | ★**必須**（放置＝進行停止） |
| L8197 周辺 | `damageEnemy` の kills 加算 | ★**必須**（友軍撃墜でスコア加算は不正） |
| L6823 | `updateLock` のロック候補 | ★**必須**（依頼「ロック不可」） |
| L9581 | `drawRadar` の敵ブリップ | ★**必須**（依頼「レーダー青」） |
| L9064 | HUD の敵マーカー | 必須（敵扱いの赤枠が出る） |
| L6398 | 爆弾の直撃判定 | 必須 |
| L6463 | 爆弾の爆風被害 | 必須 |
| L5343 | `aceEngagedNow`（BGM切替） | 必須 |
| L5455 | `countEnemiesTargetingPlayer`（警報） | 必須 |
| L4091/4104/4208/4257 | debug API 各種 | 必須 |
| L5929 | 艦の衝突判定 | 該当なし（surface限定） |
| L9711 | `clearMissionObjects` | **除外不要**（掃除は共通で良い） |
| L9485 | probe の状態出力 | 除外不要（`friendly:true` を出せば良い） |

**→ 最低10箇所に `if (x.friendly) continue;` を撒く必要がある。**
これは「1行フィルタで足りた」LASM の `surfaceOnly`（1箇所）とは**規模が違う**。
**撒き漏らし1つがバグになる**設計は、既存コードの品質水準に対して割に合わない。

### 7-1. ★採用案: 独立配列 `friendlies[]` を新設する

```js
// Friendly units live in their own array, deliberately NOT in enemies[].
// enemies[] is the mission's kill list: updateMission() ends a wave when it
// empties, damageEnemy() scores every death in it, and updateLock() offers
// everything in it as a target. A friendly satisfies none of those contracts -
// it must survive, it must never be scored, and it must never be locked - so
// sharing the array would mean guarding a dozen call sites against a flag.
// A separate array makes the default behaviour correct everywhere by omission.
const friendlies = [];
```

**この設計の決定的な利点**: **既存コードを1行も変更しなくても、友軍は
「ロック不可・スコア非加算・ウェーブ進行を妨げない」を自動的に満たす**。
`enemies[]` を走査する全10箇所が**そもそも友軍を見ない**からである。
＝ **撒き漏らしという失敗モードが原理的に存在しない。**

**必要な新規実装は「友軍を積極的に扱う」箇所だけ**:

| 実装項目 | 内容 |
|---|---|
| `spawnFriendly()` | `spawnEnemy` を複製し、`friendlies[]` へ push。`friendly: true` を持つ |
| `updateFriendlies(dt)` | 経路追従＋被弾処理。**AIは最小限**（§7-2） |
| `damageFriendly()` | HP減算と撃墜。**kills を加算しない**・**FAILED判定を呼ぶ** |
| `drawRadar` に**追記** | 既存ループの**後ろに** `friendlies` のループを足す（**青**で描画） |
| `updateMission` に**追記** | 護衛失敗判定（§7-3） |
| `clearMissionObjects` に**追記** | `friendlies` の掃除＋`friendlies.length = 0` |
| 敵AIの標的 | §7-2 ★最大の作業 |

### 7-2. ★敵AIに「友軍を狙わせる」のが本当の難所

**コード読解で判明した最重要の制約**:

敵AIは **`player.position` をハードコードで参照**しており、**標的選択の層が存在しない**。
`attemptEnemyMissile()`・追尾・照準・`countEnemiesTargetingPlayer()` すべてが
「標的＝プレイヤー」を前提に書かれている。

**→ 「敵が友軍輸送機を攻撃する」を素直に作ると、敵AI全体のリファクタになる。**

**推奨する回避策（コストを1/10にする）: 「攻撃する敵」を限定する**

護衛ミッションの敵編成を **2種類に分ける**:

| 種別 | 標的 | 実装 |
|---|---|---|
| **A. 迎撃機（大多数）** | **プレイヤー** | ★**既存AIそのまま**。改修ゼロ |
| **B. 攻撃機（少数・2〜3機）** | **友軍輸送機** | `attackFriendly: true` を持つ専用の軽量AI |

**B は「輸送機へ直進し、射程に入ったらミサイルを撃つ」だけ**でよい。
旋回戦・ブレイク・ポストストールは**一切不要**（そもそも輸送機は回避しない）。
→ **新規AIは50行程度で済み、既存の敵AIには一切触らない。**

```js
// Escort missions field two kinds of enemy. The interceptors fly the standard
// AI and hunt the player, exactly as they always have - not one line of that
// changes. The strikers are the mission: they ignore the player entirely and
// run at the transport, and because their whole job is "fly straight at a
// target that does not evade", they need none of the dogfight machinery.
// Keeping them separate is what makes the escort mission cost a new behaviour
// rather than a rewrite of enemy targeting.
```

**この分割は「ゲームとして正しい」**: プレイヤーは
「**自分に食いついてくる迎撃機を捌きながら、輸送機に向かう攻撃機を優先的に落とす**」
という**優先順位の判断**を迫られる。これは護衛任務の面白さの核そのものである。

### 7-3. 友軍エンティティと失敗判定

```js
// 友軍輸送機（護衛対象）
const FRIENDLY_TYPES = Object.freeze({
  transportFriendly: Object.freeze({
    key: "transportFriendly",
    label: "ALLY TRANSPORT",
    role: "Friendly Transport",
    hp: 294,              // ★98量子: 3発帯。「守れる程度に硬く、放置すれば落ちる」
    speed: 150,
    turnRateDeg: 8,
    friendly: true,
    theme: /* 既存 transport モデルを流用・青系マーキング */
  })
});
```

**HP 294 の根拠**: 98量子の3発帯。敵ミサイル1発では落ちない＝
**プレイヤーに「取り返しのつく時間」が与えられる**。1発帯(98)だと理不尽になり、
4発帯以上だと緊張感が消える。**3発帯が護衛対象の正解。**

**失敗判定**:
```js
// updateMission() の冒頭付近に追記する。
// 護衛対象の喪失は即 FAILED - ウェーブの残りを飛ばして結果画面へ。
if (escortRequired && friendlies.some((f) => f.escortTarget && !f.alive)) {
  completeMission(false);
  return;
}
```
- `completeMission(false)` は**既存関数**で、FAILED バナー・BGM・ゲームオーバー遷移を
  すべて既に持っている（L8133 周辺で読解済み）。**新規演出は不要**
- ★**専用の無線とバナーは足す**: 「輸送機被弾」（HP 2/3・1/3 で警告）→「**輸送機被撃墜**」。
  護衛任務は**警告なしに失敗すると理不尽**なので、段階警告は必須

### 7-4. レーダー青表示

`drawRadar()` の既存ループ（L9581〜）の**直後に**、`friendlies` の独立ループを足す:
```js
// Friendlies read blue and never take a lock ring - the radar's whole job here
// is "do not shoot this one".
ctx.fillStyle = "#5ab4ff";
ctx.shadowColor = "#5ab4ff";
```
既存の敵ブリップ（白 `#f4f7fa` / 地上・艦 琥珀 `#ffc47a`）と**明確に分かれる青**。
**ロックリング（黄/赤の円）は友軍には一切描かない**（ロック対象になりえないので自然に満たされる）。

---

## 8. ミッション13〜15案

roster3 が m11(DESERT LINE) / m12(BEACHHEAD) を使う前提で、**13〜15**を割り当てる。

| # | key | title | world | 内容 |
|---|---|---|---|---|
| 13 | m-city | CITY LIGHTS | **cityLights** | 夜の市街防空戦。爆撃機×3+UAV×4を市街上空で迎撃。AA×6が曳光弾を上げる中での戦闘 |
| 14 | m-escort | LIFELINE | **cityLights** | ★**護衛任務**。友軍輸送機×1を3波の攻撃機から守る。市街を離脱するまで |
| 15 | m-eurofront | EURO FRONT | archipelagoDay | 欧州機が輝く総力戦。Typhoon級の敵制空機×4+Rafale級×2の高機動編成 |

### 8-1. m13 CITY LIGHTS（都市防空戦）

```js
{
  key: "m-city",
  world: "cityLights",
  title: "CITY LIGHTS",
  jp: "夜の市街地に敵爆撃編隊。市街を焼かれる前に、全機を叩き落とせ。",
  sequence: [
    { types: ["uav", "uav", "uav", "uav"], label: "先行UAV" },
    { types: ["bomber", "bomber", "bomber", "f15", "f15"], label: "爆撃編隊" }
  ],
  parTime: 320,
  groundUnits: [ /* aaGun ×6 を市街の要所へ。§6-3 */ ],
  map: { x: 0.46, y: 0.83 }
}
```
- **狙い**: 「**守るべき街が眼下に見える**」という画。爆撃機が街に近づくほど緊張が上がる
- ★**UAV先行波**は roster2 の資産。**低空高機動の敵をビル街で追う**＝
  CITY LIGHTS の地形を最大に活かす（§6-4 の「高層ビル20棟に衝突判定」がここで効く）
- 対地目標（AA×6）は**倒しても倒さなくてもよい**副次目標にする＝
  「対空砲火を先に潰すか、爆撃機を急ぐか」の判断を作る。
  → ★**`totalTargets` に AA を含めるかは要判断**。含めると全滅必須になり
  「急ぐ」選択が消える。**含めない実装が望ましいが、`totalTargets` の計算式
  （L3233、`groundUnits.length` を無条件に加算）を変える必要がある**。
  **これは新規の仕組み変更なので、m13 のバッチで独立して扱うこと**

### 8-2. m14 LIFELINE（★護衛任務・roster4の目玉）

```js
{
  key: "m-escort",
  world: "cityLights",
  title: "LIFELINE",
  jp: "避難民を乗せた輸送機を護衛せよ。敵は輸送機だけを狙ってくる。",
  sequence: [
    { types: ["f16", "f16"], strikers: 1 },          // 波1: 軽い。仕組みを教える
    { types: ["uav", "uav", "f15"], strikers: 2 },   // 波2: 攻撃機2機で同時に来る
    { types: ["f15", "f15", "f22"], strikers: 2 }    // 波3: 迎撃機が強い＝守りにくい
  ],
  escort: { type: "transportFriendly", path: /* 市街→外洋の直線経路 */ },
  parTime: 300,
  map: { x: 0.38, y: 0.90 }
}
```
- ★**`strikers: N`** = そのウェーブの何機が「友軍を狙う攻撃機(§7-2 の B)」か。
  残りは通常の迎撃機（プレイヤーを狙う）
- **難度カーブ**: 波1で仕組みを理解させ、波2で**同時2機＝優先順位の判断**を作り、
  波3で**迎撃機が強くなる＝自分の身も危ない**という圧をかける
- **輸送機は等速直線で市街から外洋へ**。3波を凌ぎきると離脱＝ミッション成功。
  → **時間ではなく「輸送機の到達」が成功条件**という、既存にない勝利条件。
  ★実装は「輸送機が経路終点に到達したら `completeMission(true)`」で、
  既存の `kills >= totalTargets` 経路とは**別ルート**になる。**要新規分岐**
- ★**ランク計算への影響**: 既存のランクは kills/time/damage ベース。
  護衛任務は「輸送機の残HP」がランクに効くべき。
  → **輸送機HPをランク要素に足すか、既存式のままにするかは実装時に判断**。
  **既存式のままでも成立する**（時間と被弾で決まる）ので、**まずは既存式で出荷し、
  実走してから判断するのが安全**

### 8-3. m15 EURO FRONT（欧州機が輝く編成）

```js
{
  key: "m-eurofront",
  world: "archipelagoDay",
  title: "EURO FRONT",
  jp: "高機動の敵制空編隊が空域を制圧している。同世代機の性能差で押し切れ。",
  sequence: [
    { types: ["f15", "f15", "f22"] },
    { types: ["f22", "f22", "f15"], ace: true }
  ],
  parTime: 280,
  map: { x: 0.22, y: 0.48 }
}
```
- **「欧州機が輝く」の設計**: 敵を**高機動の制空機で固める**と、
  - **Typhoon**（A2A 90・XLAA 18発）＝**長射程で先に削る**のが正解
  - **Rafale M**（MOB 91・STA 93）＝**格闘戦で粘る**のが正解
  - **Gripen E**（6AAM・MOB 89）＝**6目標同時ロックで一斉に捌く**のが正解

  → **同じミッションを3機それぞれの流儀で攻略できる**＝機体選択に意味が出る
- ★**敵に欧州機そのものを出すことは推奨しない**: `enemyOnly` を付けない限り
  自機と同じ `AIRCRAFT_TYPES` を共有するため、**ハンガーと敵編成の管理が絡む**。
  既存の f15/f22 で「高機動編成」は十分作れる

---

## 9. 実装バッチ分割

**1バッチ1機/1機能**を原則とする（fighters.md §6 を継承）。
**roster4 はバー影響が全段階ゼロ**なので、fighters.md より切り分けが容易である。

| バッチ | 内容 | 新規コード | バー影響 | 検証の要点 |
|---|---|---|---|---|
| **A** | **Rafale M** | **なし**（`lasm` 流用） | **ゼロ**（実測） | LASMが戦闘機にロックしない／A2Gバー80%／`variant: rafale` の形状 |
| **B** | **Typhoon** | **なし**（`xlaa` 流用） | **ゼロ**（実測） | Rafaleとカナード位置で識別できるか（スクショ）／SPD 87 |
| **C** | **Gripen E** + `aam6` | **なし**（データのみ） | **ゼロ**（実測） | ★**`SPW_PIP_MAX = 6` の境界＝6個のロックボックス全表示**／8AAM・4AAM無変化 |
| **D** | **CITY LIGHTS マップ** | ★InstancedMesh 導入＋dispose経路 | — | ★**リスタート4巡でGPUメモリ不動**／fps≥55／既存5プリセットのリグレッション |
| **E** | **m13 CITY LIGHTS** | `totalTargets` の副次目標対応 | — | 高層ビル衝突／敵機のビル貫通（§6-4）／曳光弾の視認性 |
| **F** | ★**護衛基盤** + **m14 LIFELINE** | `friendlies[]`／striker AI／到達勝利 | — | ★**友軍がロック不可・スコア非加算・進行を止めない**の3点を個別に実証 |
| **G** | **m15 EURO FRONT** | なし | — | 3機それぞれで攻略可能か実走 |

### 9-1. なぜ A→B→C の順なのか
**Rafale M が最も安い**（既存SP.W流用・コード変更ゼロ）ので、
**バー影響ゼロの実証を最初に取る**。3機とも「表に無い変動が出たら実装ミス」と即断できる。
**Gripen E を最後にする**のは、唯一の新規SP.W（6AAM）と
★`SPW_PIP_MAX` の境界値問題（§3-1）を抱えるため。

### 9-2. ★バッチ F（護衛基盤）を最後にする理由
**roster4 で唯一「既存コードの契約に触れる」バッチ**だから。
§7 の設計（独立配列）は既存コードを変更しない方針だが、それでも:
- `drawRadar` / `updateMission` / `clearMissionObjects` の**3箇所に追記**が入る
- **新しい勝利条件**（到達勝利）が既存の `kills >= totalTargets` 経路に並ぶ

機体3機とマップを先に出荷して**土台を安定させてから**着手するのが安全。

### 9-3. バッチ共通の検証項目
- §2-5 のバー実測ゲート（**特に「既存機の変動ゼロ」**）
- 新機体でフルブレーキ＋フルピッチ旋回 → **深失速しないこと**
- ハンガーの周回カメラで**モデルが破綻していないこと**（スクショ必須）
- ★**Rafale/Typhoon/Gripen/Su-37 の4機を並べて識別できるか**のスクショ（§4）
- 既存ミッションのリグレッション（最低 m01 / m03 / m07）、fps ≥ 55、エラー0

---

## 9.5. ★敵専用ロシア機セット（陣営分け方針）

**ユーザー追加指示（2026-07-26）**: 陣営を分ける。**敵＝ロシア機 / 自機＝西側（アメリカ+欧州）**。
「**後々でいい**」という指示なので**実装優先度は低**だが、仕様はここで固める。

**欧州機3機（§1）はこの方針と矛盾しない**: Rafale / Typhoon / Gripen はいずれも西側機であり、
自機側に置くのが正しい。

### 9.5-0. ★存置する例外（ユーザー明示要望）

| 機体 | 扱い | 理由 |
|---|---|---|
| **MiG-31B**（自機） | ★**存置** | ユーザーが明示的に要望した自機。陣営分けの例外として残す（fighters.md） |
| **Su-37**（自機） | ★**存置** | 同上 |

→ **「ロシア機は敵専用」という原則には2つの明示的な例外がある**と記録する。
これは方針の破綻ではなく、**ユーザー要望が原則に優先する**という判断である。

★**IRONBACK の乗機を Su-37 に変える案（fighters.md §7）は、この陣営分けと整合する**:
敵エースがロシア機に乗るのは陣営分けの方針そのものであり、
**AC7 canon でも Sol Squadron（敵の精鋭）は Su-30M2/SM に乗る**（§11出典）。
→ **陣営分けが決まったことで、fighters.md §7 の採用根拠はむしろ強まった。**

### 9.5-1. ★enemyOnly 体系とバー非影響の code 確認（依頼事項）

依頼の「`computeAircraftSpecBars` の対象が `AIRCRAFT_ORDER` のみか要コード確認」に**回答する**。

**確認結果: 完全に隔離されている。敵専用機はSPECバーに一切影響しない。**

```js
// index.html L11181（computeAircraftSpecBars の1行目）
const specs = AIRCRAFT_ORDER.map((id) => AIRCRAFT_TYPES[id]);
//            ^^^^^^^^^^^^^^ AIRCRAFT_TYPES ではなく AIRCRAFT_ORDER を走査する
```
```js
// index.html L11157-11160（selectAircraft）
// AIRCRAFT_ORDER, not AIRCRAFT_TYPES: the table also holds enemy-only
// airframes, and the hangar is defined by the order list. Checking the
// table would let the debug hook put the player in a bomber.
if (!AIRCRAFT_ORDER.includes(id)) return false;
```

→ **`AIRCRAFT_TYPES` に足すだけで `AIRCRAFT_ORDER` に入れなければ**、
バー計算・ハンガー表示・機体選択のすべてから**自動的に除外される**。
`bomber`（B-52H）が既にこの方式で出荷済み（1a5aebe）であり、**実証済みの契約**である。

### 9.5-2. ★重要な実装制約: 敵機は AIRCRAFT_TYPES に必ず要る

コード読解で判明した**見落としやすい制約**:

```js
// index.html L2640-2656（ENEMY_TYPES の構築）
const ENEMY_TYPES = Object.freeze(Object.fromEntries(
  Object.keys(ENEMY_AI_PROFILES).map((id) => {
    const air = AIRCRAFT_TYPES[id];        // ★AIRCRAFT_TYPES を引く
    const ai = ENEMY_AI_PROFILES[id];
    return [id, Object.freeze({
      ...ai, key: id,
      hp: air.maxHealth,                                    // ← 飛行表から
      patrolSpeed: Math.round(air.cruiseSpeed * ai.patrolSpeedScale),
      maxSpeed: air.boostSpeed,
      patrolTurn: degToRad(air.turnRateDeg * ENEMY_PATROL_TURN_FACTOR),
      pursuitTurn: degToRad(air.turnRateDeg * ENEMY_PURSUIT_TURN_FACTOR)
    })];
  })
));
```

→ **敵専用機も1機につき2箇所へ登録が必要**:
1. **`AIRCRAFT_TYPES`** に `enemyOnly: true` 付きで（**`AIRCRAFT_ORDER` には入れない**）
2. **`ENEMY_AI_PROFILES`** にAIプロファイルを

**敵AIが実際に消費する飛行表フィールドは5つだけ**（上記コードが読む値）:
`maxHealth` / `cruiseSpeed` / `boostSpeed` / `turnRateDeg` / `label`・`role`。
→ ★**依頼の「既存の敵AI消費フィールドのみでよい」は正しい**。
ただし `AIRCRAFT_TYPES` のエントリとして**構文上は全フィールドを埋める必要がある**
（`Object.freeze` された同型のオブジェクトとして持つのが既存の作法。`bomber` も全フィールド持ちである）。
**`spw` だけは不要**（プレイヤー専用の概念。`bomber` も持っていない）。

さらに**ミサイルを撃たせるなら3箇所目**:
3. **`ENEMY_MISSILE_PROFILES`**（L2661-）。**未登録なら機銃のみの敵になる**
   （`if (ENEMY_MISSILE_PROFILES[enemy.type])` でガードされている＝**安全に省略可能**）

### 9.5-3. 敵専用ロシア機 4機の性能表

AC7 canon（§11出典）に基づく序列: **MiG-21bis（無料・最弱）< MiG-29A（65,000）<
Su-33（290,000）< Su-35S（後半エース級）**。

**HPは98量子を厳守**する（敵も同じ規約）。

#### (a) MiG-21bis FISHBED — 序盤の弱敵

```js
// AIRCRAFT_TYPES へ（AIRCRAFT_ORDER には入れない）
mig21: Object.freeze({
  id: "mig21", label: "MiG-21bis FISHBED", role: "Legacy Light Fighter",
  tag: "ENEMY", enemyOnly: true,
  blurb: "敵の旧世代軽戦闘機。小柄で軽快だが火力も装甲も乏しく、数を頼みに向かってくる。",
  cruiseSpeed: 170, boostSpeed: 330, brakeSpeed: 146,
  pitchRateDeg: 34, rollRateDeg: 128, yawRateDeg: 9, maxBankAngleDeg: 46,
  normalRollSpring: 32, rollRateLimitDeg: 122, turnRateDeg: 26,
  rollDamping: 8.4, stallWarnSpeed: 98, stallEntrySpeed: 86, stallAuthorityLoss: 0.78, structuralG: 2.8,
  gunDamage: 13, missileDamage: 98,
  boostResponse: 0.62, brakeResponse: 0.58, cruiseResponse: 0.66,
  missileCapacity: 6, maxHealth: 98,          // ★1発帯
  tipSpan: 6.2, tipZ: 2.6,
  theme: Object.freeze({
    primary: 0x9fa8a2, secondary: 0x69726c, accent: 0xb5423c,
    canopy: 0x8fe0ff, exhaust: 0xffb98a, scale: 0.74, variant: "fishbed"
  })
})
```
- ★**`maxHealth 98` = 通常ミサイル1発**。**全敵機中で唯一の1発帯**（UAVと同じ）＝
  「序盤の弱敵」を最も明快に表現する。**F-4(125)より明確に弱い**
- `turnRateDeg 26` / `boostSpeed 330`: F-4(21/320)よりわずかに機敏で、F-16(29/375)より鈍い。
  実機MiG-21は**軽量で軽快だが旧世代**という位置づけ
- **AI profile**: `behavior: "evasive"`・`hitboxScale 0.82`・`maxHitChance 0.24`（F-16の0.31より低い）
  ＝**当ててこない弱敵**。`ENEMY_MISSILE_PROFILES` は**登録しない**
  → ★**機銃のみの敵**になり、序盤の敵として理想的（§9.5-2の3.）
- **canon根拠**: AC7で**無料機**（MRP 0）・SAAM×18・機内解説「**古典的設計の小型軽量戦闘機**・
  デルタ翼＋水平尾翼・愛称バラライカ」。**Operation Deer Horn でエルジア軍のMiG-21が爆撃機を護衛**
  ＝**敵として実際に登場する**（§11出典）

#### (b) MiG-29A FULCRUM — 中堅の主力敵

```js
mig29: Object.freeze({
  id: "mig29", label: "MiG-29A FULCRUM", role: "Frontline Fighter",
  tag: "ENEMY", enemyOnly: true,
  blurb: "敵の主力戦闘機。癖のない中堅機で、編隊を組んで正面から向かってくる。",
  cruiseSpeed: 198, boostSpeed: 392, brakeSpeed: 130,
  pitchRateDeg: 43, rollRateDeg: 152, yawRateDeg: 12, maxBankAngleDeg: 55,
  normalRollSpring: 40, rollRateLimitDeg: 146, turnRateDeg: 32,
  rollDamping: 10.6, stallWarnSpeed: 88, stallEntrySpeed: 76, stallAuthorityLoss: 0.58, structuralG: 3.05,
  gunDamage: 19, missileDamage: 98,
  boostResponse: 0.53, brakeResponse: 0.52, cruiseResponse: 0.60,
  missileCapacity: 10, maxHealth: 135,        // ★2発帯
  tipSpan: 7.7, tipZ: 2.8,
  theme: Object.freeze({
    primary: 0x8e97a0, secondary: 0x555f68, accent: 0xb5423c,
    canopy: 0x8fe0ff, exhaust: 0xffc79a, scale: 0.95, variant: "fulcrum"
  })
})
```
- `maxHealth 135` = **2発帯**。F/A-18F・F-2A と同値。**中堅の主力**
- 全フィールドが **F-16 と F/A-18F の間**。「癖のない中堅機」
- **canon根拠**: AC7で 65,000 MRP・機内解説「**MiG-21の後継として開発された中型機**・
  **F-15に対抗する迎撃機**として構想された」（§11出典）
- **AI profile**: `behavior: "formation"`（F-15と同系）。**編隊を組む敵**として運用

#### (c) Su-33 FLANKER-D — 艦隊CAP（空母護衛）

```js
su33: Object.freeze({
  id: "su33", label: "Su-33 FLANKER-D", role: "Carrier Air Defense",
  tag: "ENEMY", enemyOnly: true,
  blurb: "敵艦隊の防空を担う大型艦載機。カナードと広い主翼で低中速域でも粘り強く、艦隊上空に居座り続ける。",
  cruiseSpeed: 214, boostSpeed: 418, brakeSpeed: 124,
  pitchRateDeg: 48, rollRateDeg: 162, yawRateDeg: 13, maxBankAngleDeg: 59,
  normalRollSpring: 43, rollRateLimitDeg: 155, turnRateDeg: 34,
  rollDamping: 11.9, stallWarnSpeed: 82, stallEntrySpeed: 70, stallAuthorityLoss: 0.50, structuralG: 3.15,
  gunDamage: 21, missileDamage: 98,
  boostResponse: 0.49, brakeResponse: 0.49, cruiseResponse: 0.56,
  missileCapacity: 12, maxHealth: 165,        // ★2発帯の上端
  tipSpan: 9.2, tipZ: 2.9,
  theme: Object.freeze({
    primary: 0x7d8894, secondary: 0x49535d, accent: 0x2f6fa8,
    canopy: 0x9fe6ff, exhaust: 0xffc79a, scale: 1.08, variant: "flankerd"
  })
})
```
- `maxHealth 165` = **2発帯の上端**。F-35Cと同値。**大型艦載機**
- `rollDamping 11.9` / `stallEntrySpeed 70`: AC7機内解説の
  「**カナードと大きな翼面積により低中速域での安定性と機動性が向上**」の直接的な翻訳
- ★**用途が明確**: **m03 FLEET DESTRUCTION / m12 BEACHHEAD の艦隊上空CAP**。
  「艦を攻撃したいのに上空に粘る敵がいる」という**艦隊戦の緊張**を作る
- **canon根拠**: AC7で 290,000 MRP・**LASM×16**・**Su-27派生の大型艦載機**・
  カナード追加・翼面積増・折り畳み翼・アレスティングフック（§11出典）
- **AI profile**: `behavior: "formation"`・`engageRange` を長め ＝**艦の周囲に留まる**

#### (d) Su-35S FLANKER-E — 後半のエース向け

```js
su35: Object.freeze({
  id: "su35", label: "Su-35S FLANKER-E", role: "Superiority Fighter",
  tag: "ENEMY", enemyOnly: true,
  blurb: "敵の最新鋭制空機。推力偏向による高機動と厚い装甲を併せ持つ、エースが駆る難敵。",
  cruiseSpeed: 228, boostSpeed: 440, brakeSpeed: 118,
  pitchRateDeg: 52, rollRateDeg: 180, yawRateDeg: 15, maxBankAngleDeg: 64,
  normalRollSpring: 48, rollRateLimitDeg: 172, turnRateDeg: 37,
  rollDamping: 12.5, stallWarnSpeed: 78, stallEntrySpeed: 66, stallAuthorityLoss: 0.44, structuralG: 3.35,
  gunDamage: 24, missileDamage: 98,
  boostResponse: 0.45, brakeResponse: 0.46, cruiseResponse: 0.54,
  missileCapacity: 14, maxHealth: 196,        // ★2発帯の天井（=98×2ちょうど）
  tipSpan: 9.0, tipZ: 2.7,
  theme: Object.freeze({
    primary: 0x5c666f, secondary: 0x333b42, accent: 0xd8b23a,
    canopy: 0x9fe6ff, exhaust: 0xffd9a0, scale: 1.09, variant: "flankere"
  })
})
```
- ★`maxHealth 196` = **98×2 ちょうど＝2発帯の天井**。**通常ミサイル2発で確実に落ちる**が、
  1発では絶対に落ちない。**F-22(200)に次ぐ敵機最硬**。エース機として理想的な硬さ
- `turnRateDeg 37` / `pitchRateDeg 52`: **Su-37(38/53)のわずか下・F-22(39/51)と同格**。
  推力偏向機として自機Su-37と**近縁だが同一ではない**
- ★**IRONBACK の乗機候補としても有力**（fighters.md §7 の Su-37案の代案）:
  **敵専用機なのでハンガーに出さずに済む**＝ Su-37案の「自機と同じ機体が敵エース」という
  違和感が無い。**陣営分けの方針とも完全に整合する**
- **canon根拠**: AC7で Su-35S は 6AAM 搭載機の1つ・**エルジア軍が運用**（§11出典）
- **AI profile**: `hitboxScale 0.96`・`maxHitChance 0.40`（F-22級）・`evadeLateral` 高め

#### 性能表サマリ（敵4機 + 既存敵）

| 機体 | HP（98量子） | cruise | boost | turn | 位置づけ |
|---|---|---|---|---|---|
| **MiG-21bis** | **98**（1発） | 170 | 330 | 26 | ★序盤の弱敵・機銃のみ |
| （UAV・roster2） | 98（1発） | 210 | 430 | 44 | 小型高機動 |
| （F-4・既存） | 125（2発） | 165 | 320 | 21 | 旧世代 |
| **MiG-29A** | **135**（2発） | 198 | 392 | 32 | 中堅主力・編隊 |
| **Su-33** | **165**（2発） | 214 | 418 | 34 | 艦隊CAP |
| **Su-35S** | **196**（2発天井） | 228 | 440 | 37 | ★後半エース級 |
| （B-52H・既存） | 290（3発） | 150 | 175 | 8 | 爆撃機 |

### 9.5-4. モデル差別化（`createAircraftModel` の variant 追加）

★**ロシア機は「西側機と一目で違う」ことが陣営分けの価値**である。共通の記号を持たせる:
**大きく離れた双発ナセル**（フランカー系）と**赤い accent**。

| variant | 機体 | 決定的な識別要素 |
|---|---|---|
| **`fishbed`** | MiG-21bis | ★**機首の円形ショックコーン付きインテーク**（機首先端に丸い開口＋中央にコーン）。**既存全機に無い**唯一の記号。**単発・最小(scale 0.74)**・デルタ翼＋**水平尾翼あり**（Gripen等のデルタ-カナードと違う） |
| **`fulcrum`** | MiG-29A | **双発だがナセルは中程度に離間**（Su系ほど広くない）+ **大きなLERX**（機首から主翼付根への張り出し）+ **双垂直尾翼（外傾）**。Su-33/35より一回り小さい(0.95) |
| **`flankerd`** | Su-33 | ★**カナード**+**広く離れた双発ナセル＋トンネル**（fighters.md §4-3 の Su-37 と同系）+ **折り畳み翼のヒンジライン**+**アレスティングフック**。**双垂直尾翼** |
| **`flankere`** | Su-35S | flankerd から**カナードを除去**（実機Su-35Sはカナード無し）+ **推力偏向ノズル**（`nozzle` を下向きに傾ける）+ accent 金 |

**★Su-33 と Su-35S の識別 = カナードの有無**。実機がまさにその差なので正しく、
**Su-37（自機・カナード有＋双尾翼）とも並べたときに読める**。

**共通の陣営記号**:
- **accent に赤（0xb5423c）系**を基本とする（MiG-21/MiG-29）。
  ただし **Su-33 は艦載機なので海軍青**、**Su-35S はエース機なので金**と、
  「役割で差す色を変える」ことで**単調さを避ける**
- **exhaust を暖色**（0xffb98a〜0xffd9a0）に統一。西側機の `exhaust` は
  **全機が青白（0x8cecff系）**なので、**排気炎の色だけで陣営が判別できる**
  → ★これが**最も安価で効果的な陣営表現**。モデル形状を作らなくても後方から見て分かる

### 9.5-5. ★既存ミッションの敵波 置換対応表（置換は将来バッチ・表のみ）

現行の敵編成（`ENEMY_TYPE_ORDER` と `WAVE_PRESETS`）:
```js
// index.html L2320 付近
const ENEMY_TYPE_ORDER = Object.freeze([
  Object.freeze(["f16", "f15", "f4"]),      // air1 = 波1
  Object.freeze(["f22", "f4", "f16"])       // air2 = 波2（エース波）
]);
```

**置換対応表**（★実施は将来バッチ。本表は設計のみ）:

| 現行 | 置換後 | 根拠 |
|---|---|---|
| **f4**（旧世代の弱敵役） | **mig21** | ★依頼指定。F-4は**自機として残す**（A2G 95%の唯一の爆撃機）が、**敵役からは降ろす**。MiG-21bis(HP98)はF-4(125)より弱く、序盤の敵として適切 |
| **f16**（軽量の敵） | **mig29** | 中堅の主力敵へ。HP 100→135 で**やや硬くなる**点に注意（§9.5-6） |
| **f15**（編隊の敵） | **mig29** or **su33** | m03（艦隊戦）では **su33**、通常空戦では **mig29** |
| **f22**（エース波の強敵） | **su35** | ★後半のエース級。HP 200→196 でほぼ等価（**98量子で2発帯を維持**） |
| （艦隊CAP・新規） | **su33** | m03 / m12 の艦隊上空に**新規で追加**（置換ではない） |

**ミッション別の対応表**:

| ミッション | 現行の敵 | 置換後 | 備考 |
|---|---|---|---|
| m01 FIRST CONTACT | air1 = f16/f15/f4 | **mig29 / mig29 / mig21** | ★依頼の「m01護衛F-4→MiG-21」に対応 |
| m02 TWO-PRONGED | air1 + air2plain | 同上 ×2波 | |
| m03 FLEET DESTRUCTION | naval（艦のみ） | **+ su33 ×2 を艦隊CAPとして追加** | ★Su-33の本領。**totalTargets が変わる**点に注意 |
| m-glacier GLACIER RUN | air1 | **mig29 / mig21 / mig21** | 対地主体なので敵機は弱めに |
| m-night NIGHT RAID | air1 | **mig29 / mig29 / mig21** | 夜間CAP |
| m04 IRONBACK | air2（エース） | **su35 / mig29 / mig29**（エース=su35） | ★IRONBACK の乗機を **Su-35S** に。fighters.md §7 の Su-37案より**陣営分け的に正しい**（§9.5-0） |
| m05 FINAL SORTIE | air1+air2+naval | 上記の組合せ | |
| m08 BOMBER STREAM | bomber + 護衛 | 護衛を **mig21**（canon: エルジアのMiG-21が爆撃機を護衛） | ★AC7 canon と完全一致 |

### 9.5-6. ★置換バッチの注意点（将来の実装者へ）

1. ★**HPが変わるとミッションの体感難度が変わる**。特に **f16(100) → mig29(135)** は**+35%**。
   `totalTargets` は機数で決まるので**変わらない**が、**パータイム（parTime）の再調整が要る**可能性がある。
   → **置換バッチでは全ミッションのクリア時間を実走計測し、parTime を見直すこと**
2. ★**`ENEMY_MISSILE_PROFILES` の登録漏れに注意**。f4/f16/f15/f22 は登録済みだが、
   **新しいロシア機は未登録＝機銃のみ**になる。MiG-21bis は**意図的に未登録**でよいが、
   **MiG-29A / Su-33 / Su-35S は登録が必要**（登録しないと敵がミサイルを撃たなくなり難度が激減する）
3. **既存レコード（localStorage）との互換**: ミッションkeyは変えないので**レコードは維持される**。
   ただし**難度が変わるので過去のランクとの比較意味は薄れる**。ユーザーに一言伝えるべき
4. **radarColor / tracerColor** も `ENEMY_AI_PROFILES` に持たせる。
   陣営分けの機会に**敵の曳光弾を赤系で統一**すると視認性が上がる（現行は機種ごとにバラバラ）

### 9.5-7. 爆撃機のロシア寄せ（Tu-95 / Tu-160）— ★任意優先度

現行の敵爆撃機は **B-52H STRATOFORTRESS**（`variant: "bomber"`、HP 290）で**アメリカ機**。
陣営分けの方針では**ロシア機に寄せるのが筋**。

**2案（どちらも「データとモデルの差し替えのみ」で、HP 290・尾部銃座などの挙動は不変）**:

| 案 | 機体 | モデル差分 | 推奨度 |
|---|---|---|---|
| **A** | **Tu-95MS BEAR** | ★**4発ターボプロップ＝二重反転プロペラ**（`shipCylinder` を薄い円盤にして回転させる。既存の攻撃ヘリ(roster3)のローター表現を流用可）+ **後退角の強い主翼** | ★**推奨**。プロペラは**既存全機に無い**強烈な識別記号 |
| **B** | **Tu-160 BLACKJACK** | **可変後退翼**（★F-14D の可変翼ギミックを**そのまま流用できる**）+ 白い塗装 + 細長い胴体 | 次点。ギミック流用が効くが、**白い超音速爆撃機は「鈍重な爆撃機」に見えにくい** |

**推奨は A（Tu-95）**: 「**鈍重・大型・プロペラ**」が cruiseSpeed 150 / turn 8 という
**既存の性能表と視覚的に一致する**。Tu-160 は見た目が速そうなのに遅い、という矛盾が出る。

★**優先度は最低**。**モデル差し替えのみで性能表は一切変えない**ため、
いつでも独立バッチとして実施できる。**label を "Tu-95MS BEAR" に変えるだけでも
陣営の印象は大きく変わる**ので、**最小実装＝label と theme(exhaust暖色) だけの変更**も選択肢。

### 9.5-8. 実装バッチ（★優先度低・既存スコープの後）

| バッチ | 内容 | バー影響 | 検証の要点 |
|---|---|---|---|
| **H** | **MiG-21bis + MiG-29A**（機体追加のみ・置換なし） | ★**ゼロ**（`AIRCRAFT_ORDER` に入れない） | ★**ハンガーに出ないこと**／`computeAircraftSpecBars` が13機のまま／`debug.selectAircraft("mig21")` が **false を返すこと** |
| **I** | **Su-33 + Su-35S** | **ゼロ** | 同上／`ENEMY_MISSILE_PROFILES` 登録の有無で挙動確認 |
| **J** | **既存ミッションの敵波置換**（§9.5-5） | — | ★**全ミッション実走＋parTime 再調整**／レコード互換 |
| **K** | **爆撃機のTu-95寄せ**（任意） | — | モデルのみ。挙動不変の確認 |

★**H/I は「機体を足すだけで、どのミッションにも出さない」**バッチにできる。
これなら**既存の挙動が1ミリも変わらない**ことを保証しやすく、安全に土台を作れる。
**実際に敵として出すのはバッチJ**で、そこで初めて難度が動く。

---

## 10. まとめ（実装者への申し送り）

1. ★**roster4 は既存機のバーを1ポイントも動かさない**（3段階すべて実測）。
   表に無い変動が出たら**即座に実装ミスと断定してよい**（§2-2）
2. ★**Gripen E の `maxHealth 125` は下限**。124以下にすると DEFENSE の床が動いて全機が変動する（§2-2）
3. ★**友軍を `enemies[]` に入れてはいけない**。`updateMission` が
   「生きている敵がいる間は次の波を出さない」ため**進行が永久に止まる**（§7-0）。
   **独立配列 `friendlies[]` を使う**
4. ★**敵AIは `player.position` をハードコード**しており標的選択層が無い。
   護衛任務は「**攻撃機だけに専用の軽量AIを与える**」ことで、既存AIを一切触らずに作る（§7-2）
5. ★**都市の光に実ライトを1つも追加しない**。既存マップは全て「2ライト＋スプライト」で作られており、
   NIGHT BASE の投光器ですら `sprites only, they light nothing`（§6-0）
6. ★**`SPW_PIP_MAX = 6` は弾数ピップの表示除数であり、同時ロック数とは無関係**。
   fighters.md §3-2 の「ロックボックス表示上限」という記述は**実コードと異なる**ので訂正した（§3-1）
7. **新規SP.Wは 6AAM の1種のみ**。ロケット弾ポッドは**採用しない**（§3-3）
8. fighters.md §2-1 の **F-14D STABILITY 73 は実コードでは 69**。本書が実コード準拠（§0-2）
9. 本書の全バー数値は**実コード複製シミュレータの実測値**で、
   **現行7機ハンガーの再現で検証済み**（§2-0）。実装後に一致しなければコードを疑う
10. ★**敵専用機はSPECバーに影響しない**ことをコードで確認済み:
    `computeAircraftSpecBars` は `AIRCRAFT_ORDER` のみを走査する（§9.5-1）。
    ただし**敵機も `AIRCRAFT_TYPES` への登録は必須**（`ENEMY_TYPES` が引くため）で、
    `AIRCRAFT_ORDER` に入れないことが唯一の分岐点（§9.5-2）
11. ★**ロシア機の敵専用化は優先度低**（ユーザー「後々でいい」）。
    **自機の MiG-31B / Su-37 は明示要望による存置例外**（§9.5-0）。
    IRONBACK は **Su-35S（敵専用）**に乗せるのが陣営分け的に最も整合する（§9.5-3d / §9.5-5）
12. ★**排気炎の色で陣営を分ける**のが最も安価: 西側=青白(0x8cecff系) / ロシア=暖色。
    モデルを作らなくても後方視点で判別できる（§9.5-4）

---

## 11. 出典

**Rafale M**
- https://acecombat.wiki.gg/wiki/Rafale_M — AC7: **Multirole** / 440,000 MRP /
  **LACM×16・LAAM×30・HCAA×60** / 機内解説「omnirole艦載機・海軍仕様のM型・
  **尾翼を持たずデルタ翼と近接カナードを結合**・**低中速域での優れた機動性と安定性**・
  近接戦と空襲の双方で優位・長射程の対地/対空能力で主導権を取る」
- https://steamcommunity.com/sharedfiles/filedetails/?id=2151068973 — ★AC7実測 **2,611 km/h / M2.11**
  （Su-37と同値・Typhoonの下）
- https://en.wikipedia.org/wiki/Dassault_Rafale — 全長15.3m / 全幅10.9m /
  **delta wing with active close-coupled canard** / 双発 Snecma M88（A/B 75kN×2）/
  **-3.6G〜+9G（緊急時11G）** / **13ハードポイント**（陸上型14）/ M型は艦載強化で+500kg /
  **主翼は折り畳まない** / 「exceptional low-speed handling」

**Typhoon**
- https://acecombat.wiki.gg/wiki/Typhoon — AC7: **Fighter** / 440,000 MRP /
  **LAAM×30・8AGM×24・HCAA×60** / 機内解説「多国共同開発の次世代戦闘機・
  **大型デルタ翼が超音速域でも安定をもたらす**」
- https://steamcommunity.com/sharedfiles/filedetails/?id=2151068973 — ★AC7実測 **2,656 km/h / M2.15**
  （roster4 3機中最速）
- https://www.dualshockers.com/ace-combat-7-best-planes/ — ★**Typhoon = 7位**
  「高速で対地兵装も悪くないデルタ翼機」。**Rafale M と Gripen E はランク外**（§0-3・§1-1の根拠）
- https://en.wikipedia.org/wiki/Eurofighter_Typhoon — 双発 EJ200（A/B 90kN×2、戦時102kN）/
  **前縁後退角53°のデルタ翼＋カナード** / **スーパークルーズ M1.1-1.5** / 最大M2超 /
  13ハードポイント / 複合材82%
- https://steamcommunity.com/app/502500/discussions/0/1636416951442344217 —
  プレイヤー評「**Typhoonは全般に良好で突出も欠点も無い**」「**Rafaleは全スタットがTyphoonとほぼ同一**」
  「**Rafaleは高G旋回の入りが速いが、Typhoonの方が失速しにくい**」（§1-2 の旋回/安定の翻訳根拠）

**Gripen E**
- https://acecombat.wiki.gg/wiki/Gripen_E — AC7: **Multirole** / 270,000 MRP /
  **6AAM×36・LACM×14・SASM×18** / 機内解説「**軽量マルチロール機**・E型は大型化し
  大推力エンジンと先進アビオニクスを搭載・**短い滑走路から高速で離陸**でき
  作戦空域を離れる時間を減らす」
- https://acecombat.wiki.gg/wiki/6AAM — **6目標同時ロック**。「非常に長い射程」。
  AC7で7機が搭載（Gripen E・F-15E・Su-30SM・Su-35S・ASF-X・F-2A改・MiG-35D）
- https://steamcommunity.com/sharedfiles/filedetails/?id=2151068973 — ★AC7実測 **2,566 km/h / M2.07**
  （F-14Dと同値・roster4 3機中最下位）
- https://en.wikipedia.org/wiki/Saab_JAS_39_Gripen — **delta wing and canard configuration** /
  relaxed stability + フライバイワイヤ / **単発 GE F414G**（RM12比+20%推力）/
  E型は内部燃料+40%・MTOW 16,000kg / **短距離離着陸・道路基地運用** /
  AAM6発で戦闘行動半径1,300km
- https://nationalsecurityjournal.org/eurofighter-typhoon-vs-jas-39-gripen-e-who-wins-summed-up-in-4-words/ —
  Typhoon vs Gripen E の比較（Gripenは軽量・優れた推力重量比、Typhoonは高速域で優位）

**敵専用ロシア機（§9.5）**
- https://acecombat.wiki.gg/wiki/MiG-21bis — AC7: Fighter / ★**MRP 0（無料）**・SAAM×18 /
  機内解説「**古典的設計の小型軽量戦闘機**・デルタ翼と水平尾翼の組合せ・愛称**バラライカ**」/
  ★**Operation Deer Horn でエルジア軍のMiG-21が爆撃機を護衛**（敵として実登場・§9.5-5の根拠）/
  キャンペーンM4クリアで無償解禁＝**最も安い機体**
- https://acecombat.wiki.gg/wiki/MiG-29A_Fulcrum — AC7: Fighter / **65,000 MRP** / LAGM・4AAM /
  機内解説「**MiG-21の後継として開発された中型機**・**F-15に対抗する迎撃機**として構想」/ 序盤〜中盤帯
- https://acecombat.wiki.gg/wiki/Su-33_Flanker-D — AC7: Fighter / **290,000 MRP**（MiG-29A購入が前提）/
  **LASM×16・EML×22** / 機内解説「**Su-27派生の大型艦載機**・**カナード追加と翼面積増により
  低中速域での安定性と機動性が向上**」/ 強化脚・アレスティングフック・折り畳み翼（§9.5-3c・§9.5-4の根拠）
- https://acecombat.wiki.gg/wiki/Su-30M2_Flanker-F2 — AC7: **560,000 MRP** / 4AGM×24・4AAM×32 /
  ★**Sol Squadron（敵の精鋭）の主力機**。**Mihaly は Su-30SM**、Wit/Seymour は Su-30M2 /
  Su-33 か MiG-31B が購入前提の中〜後半機（★**敵エースがロシア機に乗る** = §9.5-0 の canon 根拠）
- https://acecombat.fandom.com/wiki/Erusean_Air_Force —
  ★**エルジア空軍の運用機**: MiG-31B / Su-30M2 / Su-30SM / **Su-33** / Su-34 / Su-35 / **Su-35S** / Su-37
  （＝**敵陣営はSu系とMiG系で構成される**という canon。§9.5 全体の根拠）
- https://acecombat.wiki.gg/wiki/6AAM — Su-35S は 6AAM 搭載機の1つ（§9.5-3d）
- ※MiG-21 は上記エルジア空軍リストには現れないが、**Operation Deer Horn の爆撃機護衛として
  実際に登場する**（MiG-21bis 記事で確認）。本書は**後者を採用**した

**Sortie 実コード（本書の数値算出と設計判断の基礎）**
- `index.html` L2022 `AIRCRAFT_ORDER`（★現行は7機）/ L2031-2098 `SPW_TYPES`（`lasm` 出荷済み）/
  L2101- `AIRCRAFT_TYPES`（`f2a`・`f14` 出荷済み）
- L11173-11178 `statPercent()` — `20 + (v-min)/(max-min) * 80`
- L11180-11245 `computeAircraftSpecBars()` — 全6軸のスコア式（`groundScore` の `surfaceOnly` 分岐も出荷済み）
- ★L8281-8284 `updateMission()` — `enemies.some(e => e.alive)` で進行が止まる（§7-0 の根拠）
- ★L8197 `damageEnemy()` — `kills += 1` は `enemies[]` の死のみ（§7-1 の根拠）
- L6806-6835 `updateLock()` — `surfaceOnly` フィルタの実装例
- L6926-6944 `spawnWave()` / L6946-7040 `spawnEnemy()` — `friendlies[]` 複製元
- L9581-9640 `drawRadar()` — 敵ブリップの色分け（白=空／琥珀=地上・艦）
- L9711-9720 `clearMissionObjects()` — 掃除経路
- L3229-3241 `totalTargets` の算出（`groundUnits.length` を無条件加算＝§8-1 の課題）
- ★L7129-7136 `spawnFloodlight()` — 「**sprites only, they light nothing**」（§6-0 の根拠）
- L11805-11810 `createWorld()` のライト生成 — ★**DirectionalLight ×2 のみ**（§6-0 の根拠）
- `grep InstancedMesh` → **0件**（§6-0・§6-2 の根拠）
- ★L11181 `computeAircraftSpecBars()` 1行目 — `AIRCRAFT_ORDER.map(...)`
  ＝**敵専用機はバー計算の対象外**（§9.5-1 の根拠）
- ★L11157-11161 `selectAircraft()` — `AIRCRAFT_ORDER.includes(id)` で弾く。
  コメント「the table also holds enemy-only airframes」（§9.5-1）
- ★L2640-2656 `ENEMY_TYPES` の構築 — `ENEMY_AI_PROFILES` のキーを走査し
  **`AIRCRAFT_TYPES[id]` を引く**＝敵機も飛行表への登録が必須（§9.5-2 の根拠）。
  消費フィールドは `maxHealth`/`cruiseSpeed`/`boostSpeed`/`turnRateDeg`/`label`/`role` の6つ
- L2661- `ENEMY_MISSILE_PROFILES` — 未登録機は `if (ENEMY_MISSILE_PROFILES[enemy.type])` で
  ガードされ**機銃のみの敵**になる（§9.5-2・§9.5-6 の根拠）
- L2293-2296 `ENEMY_TYPE_ORDER` — `air1`/`air2` の機種構成（§9.5-5 の置換対象）
- ★L3666 `SPW_PIP_MAX = 6` / L9305 唯一の使用箇所 — **弾数ピップの表示除数であり、
  同時ロック数とは無関係**（§3-1 で fighters.md §3-2 の読み違いを訂正した根拠）
- L2266-2276 `bomber` の `enemyOnly: true` — 敵専用機の実装済み前例（1a5aebe）

**注記**: `acecombat.wiki.gg` と `acecombat.fandom.com` は同一本文のフォークであり、
両者の一致は独立2ソースにならない。本書で裏取りしたものは
**Wiki系 + 独立系（Steam実測表 / DualShockers / Steam討論 / Wikipedia）**の組み合わせである。
★AC7の**数値ステータスは非公開**であり、本書の数値は全て
「カテゴリ・機内解説文・実測速度・実機スペック → Sortie体系」への**翻訳**である。
