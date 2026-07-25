# SPEC M9 fighters — 自機バリエーション拡充 4機 (2026-07-26, Fable設計)

roster1（F/A-18F ほか）・roster2（F-14D ほか）に続く**自機4機**の完全仕様。
対象は **F-2A / MiG-31B / Su-37 / F-35C**。

数値規約は roster1 を継承する:
- **HPは98量子**（通常ミサイル1発=98固定）。98/196/294 の帯の中でしか強さは変わらない
- **`brakeSpeed - 52 >= stallEntrySpeed`**（ブレーキだけでは失速しない保証）と
  **`stallEntrySpeed > 62`**（`STALL_DEEP_SPEED`）を全機で検算する
- SPECバーは `AIRCRAFT_ORDER` 内の min/max で再正規化されるため、**新機体は既存機のバーを動かす**。
  `computeAircraftSpecBars()` を複製して**実測**すること
- **AC7に公開された数値ステータスは存在しない**（レターグレードとバー画像のみ）。
  本書の数値は「AC7のカテゴリ・機内解説文・実機スペック」を **Sortieの既存体系へ翻訳**したものであり、
  「AC7の数値」ではない。この区別は本書全体で厳守する

本書の数値は全て **`computeAircraftSpecBars()` の実コード（index.html L10937-10995）を複製した
シミュレータで実測済み**。§2 の表は理論値ではなく計算結果である。

---

## 0. 着手前に必ず読むこと（調査で判明した前提の訂正 4件）

WEB裏取り（§9）の結果、依頼時の前提に**4件の誤り**があった。以下が正。

### 0-1. ★MiG-31は boost 490 では SPEED バーを取れない（最重要）

依頼は「MiG-31BのSPEEDでF-22(460)を超える初の機体（boost 490程度）」としていたが、
**SPEEDバーは `boostSpeed` の生値では決まらない**。実コードは:

```js
const speedScore = (spec) => spec.boostSpeed - spec.boostResponse * 320;
```

`boostResponse` は**小さいほど加速が速い**時定数で、320倍という支配的な係数で効く。
MiG-31を「鈍重な迎撃機」として素直に `boostResponse: 0.62` にすると:

| | boostSpeed | boostResponse | speedScore |
|---|---|---|---|
| F-22 | 460 | 0.42 | **325.6** |
| MiG-31B（boost 490案） | 490 | 0.62 | **291.6** ← F-22に届かない |

→ **boost 490 では SPEEDバーは 87%止まり**（F-22が100%のまま）。
「最速機なのにSPEEDバーが2位」という**ハンガー表示とblurbが矛盾する**状態になる。

boost 490 で SPEED を取るには `boostResponse <= 0.50` が必要だが、これは
「46トンの迎撃機がF-14D並みに素早く加速する」意味になり、機体像と衝突する。

**採用案（変種B）: `boostSpeed: 530` / `boostResponse: 0.62`。**
speedScore 331.6 > F-22 325.6 で、**鈍重さを保ったままSPEED 100%を取る**。
実測した影響は §2-2（他機は最大-2ポイントのみ）。

### 0-2. Su-37は「F-22に迫る」機体ではない（AC7の実態）

依頼は「機動でF-22に迫る（超えない）」としていたが、AC7の実態は逆方向:
- DualShockers の「10 Best Planes, Ranked」で **F-22A=2位、F-35C=5位、Su-37はランク外**
- Steam討論でも「Su-57を使ったらSu-37は全ての面で見劣りする」という評価が主流
- Su-37は 550,000 MRP の**中堅機**で、エンドゲーム帯ではない

ただし**機動性そのものは高い**（wiki のスタットで Mobility 91）。
実機も**カナード＋推力偏向でクルビットを実演**した機体であり、
「**旋回では強いが、総合ではF-22の下**」という位置づけが正しい翻訳。
→ 本書は Su-37 の MOBILITY を **99%（F-22の100%に肉薄するが超えない）** とした。依頼の意図は満たす。

### 0-3. SP.W の canon 不一致（意図的な乖離として記録する）

依頼のSP.W割り当てと、AC7の実際の搭載SP.Wは以下のようにズレる:

| 機体 | 依頼の指定 | **AC7の実際のSP.W** | 判定 |
|---|---|---|---|
| F-2A | LASM | **LASM ×14** / HVAA / RKT | ✅ canon一致 |
| MiG-31B | XLAA系 | **LAAM ×26** / SAAM / PLSL | △ 名称違い・思想は一致 |
| Su-37 | QAAM | **4AAM ×32** / TLS / MSL | ❌ canon不一致 |
| F-35C | 4AAM | **4AAM ×36** / 8AGM / SOD | ✅ canon一致 |

- **MiG-31B**: AC7では `LAAM`（長距離AAM）。Sortieの `XLAA`（lockRange 2000・turnRate 90）は
  **LAAMと機能的に同一物**なので、**既存の `xlaa` を流用する**のが正しい。新規SP.Wを作る必要はない。
  実機のR-33（射程120km・Zaslonレーダーで4目標同時誘導）とも思想が一致する。
- **Su-37**: AC7では4AAMを積む。しかし本書では**依頼どおりQAAMを採用する**。理由:
  F-35Cにも4AAMを与えるため、両機を4AAMにすると**SP.Wが完全に重複し差別化が消える**
  （この重複はAC7側にも実在する）。
  「推力偏向で敵の背後に貼り付く機体」には、**旋回性能を活かせるQAAM（turnRate 300）**のほうが
  機体像と噛み合う。**canonからの意図的な逸脱**として明記する。

### 0-4. F-35Cは「中庸」ではない

依頼は「ステルス中庸マルチロール」としたが、DualShockersは F-35C を**5位**にランクし
「**マルチロール機の中で最強**、エンドゲームの制空戦闘機に匹敵するスタット」と評している。
→ 「器用貧乏」ではなく「**弱点が無い優等生**」として設計する。
本書では DEFENSE 72%（F-22に次ぐ2位）と STABILITY 85% を与え、
**尖った最高値は無いが最低値も無い**形にした（§2-1）。

---

## 1. 性能表（AIRCRAFT_TYPES 互換・全フィールド）

既存エントリと同じフィールド構成。`Object.freeze` の作法も既存に合わせること。

### 1-1. F-2A

```js
f2a: Object.freeze({
  id: "f2a",
  label: "F-2A VIPER ZERO",
  role: "Anti-Ship Multirole",
  tag: "STRIKE",
  blurb: "F-16を拡大再設計した対艦攻撃の専門機。空戦性能は堅実な水準に留まるが、大型主翼が生む安定した射爆軸と長射程の対艦ミサイルで、海上の目標を遠距離から仕留める。",
  cruiseSpeed: 195, boostSpeed: 385, brakeSpeed: 132,
  pitchRateDeg: 41, rollRateDeg: 140, yawRateDeg: 12, maxBankAngleDeg: 54,
  normalRollSpring: 39, rollRateLimitDeg: 134, turnRateDeg: 30,
  rollDamping: 10.2, stallWarnSpeed: 90, stallEntrySpeed: 78, stallAuthorityLoss: 0.62, structuralG: 3.05,
  gunDamage: 19, missileDamage: 98,
  boostResponse: 0.56, brakeResponse: 0.54, cruiseResponse: 0.62,
  missileCapacity: 12, maxHealth: 135,
  spw: Object.freeze({ key: "lasm", capacity: 14 }),
  tipSpan: 8.1, tipZ: 3.1,
  theme: Object.freeze({
    primary: 0x2f5f96, secondary: 0x1d3f68, accent: 0x8fb8dd,
    canopy: 0x69dfff, exhaust: 0x8cecff, scale: 1.02, variant: "viperzero"
  })
})
```

**根拠**:
- `boostSpeed 385`: 実機は最大M2.0で、F-16(M2.05)とほぼ同等。AC7でも Speed High。F-16(375)の**わずかに上**、
  F/A-18F(390)の**わずかに下**に置き、「F-16の派生だが同一ではない」を数値で示す
- `rollRateDeg 140`（F-16の145より**低い**）/ `rollDamping 10.2`（F-16の9.6より**高い**）:
  **主翼面積が25%大きい**（34.84m² vs 27.87m²）ことの直接的な表現。
  大きな翼は**ロールが鈍く、代わりに安定する**。「拡大版＝全部強化」にしない差別化の要
- `maxHealth 135`: 2発帯（99-196）。F/A-18Fと同値。単発機だがF-16(100)より大型で構造に余裕がある
- `missileCapacity 12`: 実機は4発のASM搭載＝ペイロードに余裕がある機体
- `stallEntrySpeed 78`: 大型翼＝低速で落ちにくい。F-16(82)より良く、F/A-18F(72)には及ばない
- **不変条件**: `132 - 52 = 80 >= 78` ✅ / `78 > 62` ✅

**theme**: JASDF の**洋上迷彩**（two-tone blue）。primary をミディアムブルー(FS35109相当)、
secondary をダークブルー(FS35045相当)にする。**ハンガーで唯一の青系機体**になり、一覧での識別性が高い。

### 1-2. MiG-31B

```js
mig31: Object.freeze({
  id: "mig31",
  label: "MiG-31B FOXHOUND",
  role: "High-Speed Interceptor",
  tag: "INTERCEPTOR",
  blurb: "全機中最速の大型迎撃機。ひとたび加速しきれば誰にも追いつかれないが、加速は緩慢で旋回半径は絶望的に大きい。格闘戦を捨て、長射程ミサイルで遠距離から仕留める機体だ。",
  cruiseSpeed: 250, boostSpeed: 530, brakeSpeed: 150,
  pitchRateDeg: 26, rollRateDeg: 98, yawRateDeg: 7, maxBankAngleDeg: 42,
  normalRollSpring: 26, rollRateLimitDeg: 94, turnRateDeg: 18,
  rollDamping: 8.2, stallWarnSpeed: 108, stallEntrySpeed: 96, stallAuthorityLoss: 0.80, structuralG: 2.5,
  gunDamage: 20, missileDamage: 98,
  boostResponse: 0.62, brakeResponse: 0.60, cruiseResponse: 0.66,
  missileCapacity: 12, maxHealth: 150,
  spw: Object.freeze({ key: "xlaa", capacity: 16 }),
  tipSpan: 9.4, tipZ: 2.2,
  theme: Object.freeze({
    primary: 0x9aa4ad, secondary: 0x646d76, accent: 0x8c2f2f,
    canopy: 0x8fe0ff, exhaust: 0xbfd4ff, scale: 1.16, variant: "foxhound"
  })
})
```

**根拠**:
- `boostSpeed 530`: §0-1 の変種B。**SPEEDバー100%を取るための最小限の値**（speedScore 331.6 > F-22 325.6）。
  実機M2.83はF-22のM2.25比で**約26%速い**という裏取り結果とも比率が整合する
  （530/460 = 1.15。ゲームの圧縮された速度帯では26%をそのまま入れると壊れるので圧縮している）
- `boostResponse 0.62`（全機中**最も鈍い部類**、F-4の0.66に次ぐ）: 46トンの機体が最高速に達するまでの遅さ。
  **「最高速は最強だが、そこに到達するまでが遅い」**という迎撃機の本質を1フィールドで表現している
- `turnRateDeg 18` / `pitchRateDeg 26` / `structuralG 2.5`: **全機中最低**。
  実機の**超音速G制限5G**（戦闘機の9Gに対し）と、AC7のスタット **Mobility D+ / Stability D** の翻訳。
  → これが **MOBILITYバーの新しい床**になる（§2-2）
- `stallEntrySpeed 96`: F-4(92)を超えて**全機中最悪**。大型機は低速で維持できない
- `maxHealth 150`: 2発帯。大型機だが装甲機ではない。F-15/F-14Dと同値
- `spw: xlaa / capacity 16`: §0-3。AC7のLAAM×26に対応。F-15(12)より多い16発とし、
  「長射程ミサイルを撃ち続ける機体」という役割を弾数でも表現する
- **不変条件**: `150 - 52 = 98 >= 96` ✅（余裕2）/ `96 > 62` ✅

**★注意**: `cruiseSpeed 250` は全機中最速（F-22の240を超える）。巡航でも速い機体という表現だが、
**マップ端到達やミッション時間の前提を変える可能性がある**ので、実装時にm01/m03で挙動確認すること。

### 1-3. Su-37

```js
su37: Object.freeze({
  id: "su37",
  label: "Su-37 TERMINATOR",
  role: "Super-Maneuverable Fighter",
  tag: "ACE",
  blurb: "カナードと推力偏向ノズルを備えた超機動戦闘機。低速域でも機首は思いのままに向き、旋回性能では最強のステルス機にすら肉薄する。最高速と装甲では一歩譲る、格闘戦の専門家。",
  cruiseSpeed: 225, boostSpeed: 430, brakeSpeed: 116,
  pitchRateDeg: 53, rollRateDeg: 178, yawRateDeg: 15, maxBankAngleDeg: 64,
  normalRollSpring: 48, rollRateLimitDeg: 170, turnRateDeg: 38,
  rollDamping: 12.4, stallWarnSpeed: 76, stallEntrySpeed: 64, stallAuthorityLoss: 0.40, structuralG: 3.35,
  gunDamage: 23, missileDamage: 98,
  boostResponse: 0.46, brakeResponse: 0.46, cruiseResponse: 0.54,
  missileCapacity: 12, maxHealth: 150,
  spw: Object.freeze({ key: "qaam", capacity: 14 }),
  tipSpan: 8.9, tipZ: 2.6,
  theme: Object.freeze({
    primary: 0x8d9aa6, secondary: 0x4a5a67, accent: 0xd8b23a,
    canopy: 0x9fe6ff, exhaust: 0xffd9a0, scale: 1.10, variant: "terminator"
  })
})
```

**根拠**:
- `pitchRateDeg 53`: **F-22(51)を超える全機中最高値**。推力偏向＋カナードの直接表現。
  クルビットのような「機首を機速と無関係に振る」挙動の источник
- `turnRateDeg 38` / `rollRateDeg 178`: F-22(39/190)の**わずかに下**。
  §0-2 のとおり「旋回では肉薄するが超えない」。結果 MOBILITY 99% vs F-22 100%（§2-1）
- `stallAuthorityLoss 0.40` / `stallEntrySpeed 64`: **全機中最良**。
  AC7機内解説の「**失速前の低速域でも驚異的な機動性**」の直接的な翻訳
- `boostSpeed 430`: F-15(425)のわずか上、F-14D(445)/F-22(460)の下。
  「機動特化・速度は中の上」。実機Su-37もM2.35級で突出はしていない
- `maxHealth 150`: 2発帯。大型双発機だがF-22(200)の装甲には及ばない
- `spw: qaam / capacity 14`: §0-3 の意図的乖離。F-16(12)より多い14発
- **不変条件**: `116 - 52 = 64 >= 64` ✅（**ちょうど0＝F-22/F-14Dと同じ限界値**）/ `64 > 62` ✅（余裕2）
  → **この2条件はどちらもギリギリ**。`brakeSpeed` を下げる調整は**禁止**。実装時に必ず再検算すること

**theme**: accent にゴールド(0xd8b23a)を置いたのは、シリーズ最有名のエース
**Yellow 13（AC04・イエロー中隊）の乗機**であるというロア（裏取り済み）への目配せ。
既定塗装は灰青のフランカー配色に留め、黄色は差し色のみ。

### 1-4. F-35C

```js
f35c: Object.freeze({
  id: "f35c",
  label: "F-35C LIGHTNING II",
  role: "Stealth Multirole",
  tag: "MULTIROLE",
  blurb: "艦載型の第5世代ステルス機。突出した最高値は持たないが弱点も無く、大型主翼による安定と堅牢な機体で、あらゆる任務を水準以上にこなす。4目標同時攻撃が空戦の主役だ。",
  cruiseSpeed: 210, boostSpeed: 400, brakeSpeed: 124,
  pitchRateDeg: 46, rollRateDeg: 152, yawRateDeg: 13, maxBankAngleDeg: 58,
  normalRollSpring: 44, rollRateLimitDeg: 146, turnRateDeg: 33,
  rollDamping: 12.0, stallWarnSpeed: 82, stallEntrySpeed: 70, stallAuthorityLoss: 0.48, structuralG: 3.1,
  gunDamage: 21, missileDamage: 98,
  boostResponse: 0.50, brakeResponse: 0.50, cruiseResponse: 0.56,
  missileCapacity: 12, maxHealth: 165,
  spw: Object.freeze({ key: "aam4", capacity: 20 }),
  tipSpan: 7.6, tipZ: 2.8,
  theme: Object.freeze({
    primary: 0x6e767e, secondary: 0x40474e, accent: 0x2d8fa8,
    canopy: 0xc8b47a, exhaust: 0xa8d8ff, scale: 1.0, variant: "lightning"
  })
})
```

**根拠**:
- 全フィールドが**中庸だが下位ではない**。§0-4 のとおり「マルチロール最強」の翻訳として、
  **最高値ゼロ・最低値ゼロ**の分布にした。バーは SPD 67 / MOB 78 / STA 85 / A2A 68 / DEF 72（§2-1）
- `maxHealth 165`: **2発帯（99-196）の上端付近**。F-15(150)を超え、F-22(200)に次ぐ**全機中2位**。
  ステルス＝「そもそも撃たれない」をHPで表現。DEFENSE 72%
- `rollDamping 12.0` / `stallEntrySpeed 70`: **艦載機**として F/A-18F(11.8/72)と同格の低速安定。
  実機F-35Cは A型比で**主翼面積45%増**（668 vs 460 sq ft）＋折り畳み翼端で、
  空母への進入速度145ktを満たすための翼。**大きい翼＝安定**という F-2A と同じ論理
- `boostSpeed 400`: ステルス機だがF-22(460)より明確に遅い。実機もM1.6でF-22のM2.25に劣る
- `spw: aam4 / capacity 20`: AC7 canon一致（4AAM×36）。§3-2
- **不変条件**: `124 - 52 = 72 >= 70` ✅ / `70 > 62` ✅

---

## 2. ★SPECバー再正規化の実測（全機・全段階）

`computeAircraftSpecBars()` を複製し、**F-14D → F-2A → MiG-31B → Su-37 → F-35C** の順に
1機ずつ足して既存機のバー変動を測定した。以下は**実測値**である。

### 2-1. 最終形（10機ハンガー）

MiG-31Bは §0-1 の**変種B（boost 530）**を採用した場合。

| | SPEED | MOBILITY | STABILITY | A2A | A2G | DEFENSE |
|---|---|---|---|---|---|---|
| F-16 | 52 | 63 | 50 | 47 | 25 | 20 |
| **F-2A** | 55 | 65 | 60 | 58 | 25 | 48 |
| F/A-18F | 61 | 78 | 81 | 63 | 25 | 48 |
| F-15 | 78 | 81 | 75 | 73 | 25 | 60 |
| F-14D | 83 | 75 | 73 | 73 | 25 | 60 |
| **MiG-31B** | **100** | **20** | 28 | 63 | 25 | 60 |
| **Su-37** | 82 | **99** | 93 | 78 | 25 | 60 |
| **F-35C** | 67 | 78 | 85 | 68 | 25 | 72 |
| F-4 | 20 | 30 | 20 | 20 | **95** | 40 |
| F-22 | **98** | **100** | **100** | **100** | 25 | **100** |

読み取れる設計の成否:
- MiG-31B が SPEED 100 / MOBILITY 20 と**両極**に振れ、「最速だが曲がらない」が一目で判る ✅
- Su-37 が MOBILITY 99 で F-22(100) に**肉薄するが超えない** ✅（§0-2 の意図どおり）
- F-35C は**全項目60台〜80台**で最高値も最低値も無い ✅（§0-4）
- F-2A は F-16 の**わずかに上**に全項目が並ぶ（55/65/60/58/48）＝「F-16の拡大発展型」が読める ✅

### 2-2. 段階ごとの既存機への影響（差分）

| 追加した機体 | 既存機のバー変動 |
|---|---|
| **F-14D** | **変化ゼロ**（どの軸でも新min/maxにならない）。roster2 §1 の見込みは実測で裏付いた |
| **F-2A** | **変化ゼロ**。完全な無害追加 |
| **MiG-31B** | ★**MOBILITYの新しい床**になり6機が動く（下表） |
| **Su-37** | F-4 の MOBILITY のみ **-1**（Su-37が平均を押し上げた二次効果） |
| **F-35C** | **変化ゼロ** |

**MiG-31B 追加による MOBILITY 変動（実測）**:

| | F-16 | F-2A | F/A-18F | F-15 | F-14D | F-4 |
|---|---|---|---|---|---|---|
| MOBILITY | +6 | +5 | +3 | +3 | +4 | **+11** |

MiG-31B(`turnRate 18 / pitch 26 / roll 98 / yaw 7`)が **F-4 を下回る**ため、
F-4 が「最も曲がらない機体」の座を明け渡し、**MOBILITY 20 → 30 へ +11 上昇**する。
他の5機も min が下がった分だけ押し上げられる。**STABILITY / A2A / DEFENSE / SPEED は不変**
（MiG-31の `stallEntry 96` は F-4 の 92 より悪いが、stabilityScore では `rollDamping 8.2` が
F-4 の 7.5 を上回るため最小値にならない）。

### 2-3. 変種A（boost 490）を選んだ場合の差分

参考として、依頼どおり boost 490 にした場合との比較（実測）:

| | F-16 | F-2A | F/A-18F | F-15 | F-14D | MiG-31B | Su-37 | F-35C | F-4 | F-22 |
|---|---|---|---|---|---|---|---|---|---|---|
| 変種A(490) SPEED | 53 | 56 | 62 | 80 | 85 | **87** | 84 | 68 | 20 | **100** |
| 変種B(530) SPEED | 52 | 55 | 61 | 78 | 83 | **100** | 82 | 67 | 20 | **98** |

**変種Bの代償は「他機がSPEEDを1〜2ポイント失う」だけ**で、得られるものは
「最速機がSPEED 100%を持つ」という**表示の正しさ**。→ **変種Bを推奨**する。

### 2-4. ★必須の付随修正（blurb文言）

データ変更が**文言修正を強制する**。実装時に忘れやすいので必ずセットで行うこと。

| 機体 | 現行blurb | 問題 | 修正案 |
|---|---|---|---|
| **F-22** | 「全性能で他を圧倒する最強のステルス戦闘機。**速度・旋回・火力・装甲すべて最高**。」 | ★**SPEEDが98%になりMiG-31Bに負ける**ため「速度…最高」が**嘘になる** | 「全性能で他を圧倒する最強のステルス戦闘機。**旋回・火力・装甲は全機中最高**で、速度も最速機に次ぐ。」 |
| **F-4** | 「1960年代の旧世代機。**速度も旋回も現代機には遠く及ばない**が…」 | MOBILITYが20→30になり、**MiG-31B(20)より上**になる。「旋回が最下位」は嘘になる | 「1960年代の旧世代機。速度は現代機に遠く及ばず旋回も鈍いが、無骨な機体は軽量機より打たれ強く、対地攻撃では全機中最良だ。」（「最下位」を含意する表現を避ける） |

- **F-22のみ、MiG-31Bと同一バッチでの修正が必須**（バッチ3）。放置すると1バッチ分だけ嘘が出荷される
- F-4は緊急度が低い（「遠く及ばない」は程度問題として読めなくもない）が、同時に直すのが誠実
- roster1 §1-5 で予告された「A-10C投入時のF-22 DEFENSE 77%問題」は**A-10Cが未出荷のため未発生**。
  本書の4機はいずれも DEFENSE で F-22 を脅かさない（最高はF-35Cの72%）

### 2-5. 実装時ゲート（必須）

roster1 の手法を踏襲する:
1. `computeAircraftSpecBars()` を**複製したスクリプト**に新旧の `AIRCRAFT_TYPES` を通し、
   §2-1 / §2-2 の表と**数値が一致すること**を確認する
2. 一致しない場合、**表ではなくコードを疑う**（本書の数値は実コード複製から算出済み）
3. ハンガーのSPECバーを**スクリーンショット**で目視確認（バーが振り切れ/ゼロ幅になっていないか）
4. §1 の各機で `brakeSpeed - 52 >= stallEntrySpeed` と `stallEntrySpeed > 62` を**再検算**
5. 実機でフルブレーキ＋フルピッチ旋回を行い、**深失速に入らないこと**を確認
   （特に **Su-37 は余裕0**。最優先で確認する）

---

## 3. 新SP.W 2種の実装仕様

現行 `SPW_TYPES`（index.html L2020-2072）に2エントリを追加する。

### 3-1. LASM（長距離対艦ミサイル）— F-2A

```js
// F-2A: the anti-ship round. Locks only what floats or sits on the ground -
// pointing it at a fighter gets you nothing - and reaches far past the standard
// seeker to keep the launch aircraft outside a fleet's air defence envelope.
lasm: Object.freeze({
  key: "lasm",
  label: "LASM",
  kind: "aam",
  damage: 190,
  turnRateDeg: 55,
  maxSpeed: 430,
  life: 14,
  multi: 1,
  lockRange: 1600,
  surfaceOnly: true
})
```

**設計根拠**:
- `damage: 190`: **98量子の観点で意味を持つ値**。艦のHP（frigate 180 / aegis 250 / carrier 520）に対し
  190は「**frigateを1発**（180<190）、**aegisを2発**（250<380）」となる。
  通常ミサイル(98)ならfrigate 2発・aegis 3発なので、**対艦効率がちょうど1発ずつ改善する**
- `turnRateDeg: 55`: QAAM(300)/8AAM(200)より**大幅に低い**。動かない・鈍い目標にしか当たらない鈍重な弾。
  XLAA(90)よりさらに低くし、「対艦専用」を運動性能でも表現する
- `lockRange: 1600`: 標準 `LOCK_RANGE`(1200) と XLAA(2000) の中間。
  艦のSAM射程（aegis 1700 / frigate 1250）との関係が肝で、
  **frigateのSAM(1250)より外から撃てるが、aegisのSAM(1700)には届かれる**という緊張を作る
- `life: 14`: 射程1600を `maxSpeed 430` で飛ぶには最低3.7秒。低速旋回で回り込む余裕を含め14

**★`surfaceOnly` の実装（新フラグ）**:

`updateLock()`（L6717-6750）は `enemies` 配列を走査するが、**艦・地上目標も `enemies[]` に入っている**
（L2716 のコメントが明示: 「M3 ground installations. They live in enemies[] exactly like the ships」）。
`enemy.surface` は既に**12箇所で使われている確立したフラグ**。
したがって実装は**ロックループ内の1行フィルタで足りる**:

```js
for (const enemy of enemies) {
  if (!enemy.alive) continue;
  // LASM only ever looks at surface targets.
  if (PLAYER_SPW && PLAYER_SPW.surfaceOnly && selectedWeapon === "spw" && !enemy.surface) continue;
  ...
}
```

**干渉なし条件**:
- `surfaceOnly` を持たない既存4種（qaam/xlaa/aam8/ugb）は `undefined` = falsy で**従来どおり**
- 条件に `selectedWeapon === "spw"` を含めるため、**通常ミサイル選択中のロックは一切変わらない**
- UGB(`kind: "bomb"`)はそもそもロックを使わない（CCIP）ので無関係

**★A2Gバーの扱い（注意）**:
`groundScore()` は現在 **`weapon.kind === "bomb"` のみ 0.95**、他は一律 0.25。
LASMは `kind: "aam"` なので、**このままではF-2AのA2Gバーが25%**になり、
「対艦番長」なのに対地評価が最低という**表示矛盾**が起きる。修正案:

```js
const groundScore = (spec) => {
  const weapon = SPW_TYPES[spec.spw && spec.spw.key];
  if (!weapon) return 0.25;
  if (weapon.kind === "bomb") return 0.95;
  if (weapon.surfaceOnly) return 0.80;   // guided anti-ship round
  return 0.25;
};
```
`groundScore` は**絶対値（fleet相対ではない）**なので、**この変更は既存機のA2Gバーを一切動かさない**
（F-4は0.95のまま、他は0.25のまま）。F-2Aだけが80%になる。**バッチ2で必須**。

### 3-2. 4AAM（4目標同時攻撃）— F-35C

```js
// F-35C: the eight-target salvo cut down to four. Same acquisition path as the
// 8AAM, half the target list, and a heavier warhead per round.
aam4: Object.freeze({
  key: "aam4",
  label: "4AAM",
  kind: "aam",
  damage: 90,
  turnRateDeg: 200,
  maxSpeed: 520,
  life: 9.5,
  multi: 4,
  multiLockTime: 0.45,
  lockRange: null
})
```

**設計根拠**:
- `multi: 4` / `multiLockTime: 0.45`: 8AAMと同じ機構。**4目標で0.45秒刻み＝満載まで1.8秒**
  （8AAMは3.6秒）。「**8AAMの半分の手数だが、半分の時間で撃てる**」という差別化
- `damage: 90`: 8AAM(78)より高く、通常ミサイル(98)より**わずかに低い**。
  依頼指定は90でありcanonとも矛盾しない。**98量子への影響**: 戦闘機のHPは100〜200なので、
  90では **F-16(100)すら1発で落ちない**。これは意図どおり（多目標兵器は手数で勝つ）
- `capacity: 20`（機体側）: 8AAM(24)より少ない。1斉射4発なので**5斉射分**

**★実装コストはゼロに近い（重要な発見）**:
`updateMultiLock()`（L6782-6797）は **`weapon.multi` と `weapon.multiLockTime` を読む完全に汎用な実装**で、
8AAM専用のハードコードは無い:
```js
const count = Math.min(weapon.multi, candidates.length, Math.floor(multiLock.timer / step));
```
`launchSpSalvo()` への分岐も `if (PLAYER_SPW.multi > 1)`（L6119）という汎用条件。
→ **4AAMは `SPW_TYPES` にデータを1件足すだけで動く。新規コードは不要。**

**干渉なし条件**:
- `multi: 1` の既存3種は `updateMultiLock` が即 `clearMultiLock()` するため**影響なし**
- 8AAM(F-22)とはデータが独立しており、**F-22の挙動は1ミリも変わらない**
- ★**HUD要確認**: `SPW_PIP_MAX = 6`（L3581）という定数があり、
  4目標は6以下なので問題ないが、**ロックボックス表示が4個で正しく出るか**を実機確認すること

---

## 4. モデル差別化（`createAircraftModel` の variant 追加）

既存は `viper`/`hornet`/`lancer`/`bison`/`else=raptor` のif-elseチェーン。末尾のelse手前に4分岐を足す。
既存プリミティブ（`fuselage`/`wing*`/`fin`/`canopy`/`panel`/`rearBody`/`nozzle`/`missileBody`）を流用する。

### 4-1. `viperzero`（F-2A）— F-16流用＋拡大翼

**最小工数の分岐**。`viper` の構成をそのまま使い、以下だけ差し替える:
- **主翼を拡大**: `tipSpan 8.1`（F-16は7.3）。翼弦も約1.15倍に広げる。
  実機の**主翼面積25%増**（34.84 vs 27.87 m²）の表現。これが唯一にして最大の識別要素
- **機首をわずかに延長・太く**（`fuselage` 前端 +5%）: 実機は全長15.52m（F-16は15.06m）で
  大型AESAレーダーを収める太いレドーム
- **水平尾翼も拡大**（実機は面積増）
- **theme が青系**（§1-1）＝ハンガー一覧で**色だけで即判別できる**
- 単発（F-16と同じ）・単座。エンジン配置は変更不要

→ **形状の新規モデリングはほぼ不要。スケール調整と色で差別化が成立する**、4機中最も安いモデル。

### 4-2. `foxhound`（MiG-31B）— 長大な直線的胴体＋角型インテーク

**シルエットで最も差がつく機体**（全長22.62m＝F-2Aの1.46倍）:
- **長い箱型胴体**: `fuselage` を z 方向に大きく引き伸ばし、**断面を角張らせる**（実機は平板を溶接した
  スラブサイド）。既存機はどれも紡錘形なので、**角ばった長い胴体**だけで一発判別できる
- ★**角型（矩形）インテーク**: `panel` を使い、**胴体側面に大きな箱型ダクトを左右**に。
  MiG-25譲りの斜めカット。既存機は全て小さい/丸いインテークなので決定的な差になる
- **双発**（`rearBody` ×2 を近接配置）+ **双垂直尾翼**（`fin` ×2、やや外傾）
- **タンデム複座**: `canopy` を z 方向に長く（F-4の 2.25 相当）。前後席の間に框を1枚
- **高翼配置の肩翼**（実機は shoulder wing）。後退角は中程度、翼面積は胴体比では小さい
- `theme.scale 1.16` で他機より一回り大きく。灰色＋赤星の accent(0x8c2f2f)

### 4-3. `terminator`（Su-37）— カナード＋双発広胴＋トンネル

- ★**カナード**: `wing` を小型化したものを**主翼の前方・コックピット直後の左右**に配置。
  **既存全機に無い部品**で、これ単体で識別記号になる（AC7機内解説も「カナード装備」を明記）
- ★**широ（広い）胴体とトンネル**: `rearBody` を**左右に大きく離して**配置し、
  その間に**平らな胴体下面**（`panel` を幅広で薄く）を渡す。
  実機フランカーの最大の識別点である「**2つのナセルの間の空隙＝トンネル**」を表現する。
  F-14と同じ構造で、上/下から見たときに**胴体中央に穴が空いて見える**のが正解
- **LERX**（`panel` を機首側面から主翼付根へ）+ **ブレンデッドウィングボディ**
- **双垂直尾翼**（外傾）。**推力偏向ノズル**は `nozzle` をやや大きく、**下向きに10°傾ける**と
  「偏向している」感じが出る（可動にはしない＝静的な傾きで十分）
- **翼端はミサイルレール**（クロップドチップ）。`theme.scale 1.10`

### 4-4. `lightning`（F-35C）— 単発太胴＋傾斜双尾翼＋大型主翼

- **単発**（`rearBody` ×1・中心線上）+ **太い胴体**: 実機は内部兵装庫とリフトファン系のために
  **極端に太い**。既存の単発機（F-16/F-2A）より明確に太くする
- ★**傾斜双垂直尾翼**（`fin` ×2 を**内側に傾ける**）: ステルス機の識別記号。
  F-22(raptor)と同じ内傾方向だが、F-35は**より外側寄りに配置**して区別する
- ★**大型主翼**（艦載型）: `tipSpan 7.6`。A型比**面積45%増**（668 vs 460 sq ft）の表現。
  ただしMiG-31(9.4)/F-2A(8.1)より小さいのは、実機の全幅13.1mが
  F-2の11.1mより広い一方で**Sortieのtipspanは翼端位置**であり、
  F-35Cは短い胴体に対する相対比で見せるため。**翼弦を広く取る**ことで面積感を出す
- **折り畳み翼端のヒンジライン**を `panel` の細線で入れると艦載型らしさが増す（任意）
- **ファセット（多面体）成形**: 角を丸めず平面で構成する。`theme.canopy` を金色寄り(0xc8b47a)にして
  F-22と同じステルス系の系譜に見せる

---

## 5. ハンガー並び順と AIRCRAFT_ORDER

現行: `["f16", "fa18", "f15", "f4", "f22"]`
（roster2 の F-14D 出荷後は `["f16", "fa18", "f15", "f14", "f4", "f22"]`）

**最終形（10機）**:
```js
const AIRCRAFT_ORDER = Object.freeze([
  "f16", "f2a", "fa18", "f15", "f14", "mig31", "su37", "f35c", "f4", "f22"
]);
```

**並びの原則**: 既存は「**弱→強、ただしF-4（ネタ機）とF-22（最強）を末尾に**」という配置。
これを維持し、新機を性能帯順に挿入する:

| 位置 | 機体 | 挿入理由 |
|---|---|---|
| 2 | **F-2A** | F-16の直後。「F-16の拡大発展型」であることを並びで示す。バーもF-16のわずか上 |
| 5 | F-14D | roster2 で確定済み（F-15の後） |
| 6 | **MiG-31B** | F-14Dの後。SPEED最高だがMOBILITY最低の**特化機**なので、汎用機の後ろに置く |
| 7 | **Su-37** | MiG-31Bの後。同じく特化機（機動特化）。MiG-31Bと**対になる位置**に置くと対比が読める |
| 8 | **F-35C** | 特化機2機の後、F-4の前。総合力ではF-22に次ぐが、末尾2枠は既存の指定席 |

F-4 と F-22 の末尾は**動かさない**（既存プレイヤーの記憶と `DEFAULT_AIRCRAFT_ID = "f16"` の先頭を保つ）。

---

## 6. 実装バッチ分割

**1バッチ1機**を原則とする。理由は §2-2 のとおり**バー影響が機体ごとに独立**しており、
問題が出たときに原因機体が即座に特定できるため。

| バッチ | 内容 | 新規コード | バー影響 | 検証の要点 |
|---|---|---|---|---|
| **6** | **F-14D**（roster2、本書の前提） | 可変翼ギミック | **ゼロ**（実測） | roster2 §1 に準拠 |
| **1** | **F-2A** + `lasm` + `groundScore` 修正 | `surfaceOnly` フィルタ1行 / `groundScore` 3行 | **ゼロ**（実測） | LASMが**戦闘機にロックしないこと**／艦にはロックすること／A2Gバー80% |
| **2** | **MiG-31B**（★単独） | なし（`xlaa` 流用） | ★**6機のMOBILITYが動く** | §2-2 の差分表と**実測一致**／**F-22 blurb修正を同バッチで**／`cruiseSpeed 250` の副作用 |
| **3** | **Su-37** | なし（`qaam` 流用） | F-4 の MOBILITY -1 | ★**失速不変条件が余裕0**＝フルブレーキ旋回の実機確認を最優先 |
| **4** | **F-35C** + `aam4` | **なし**（データのみ） | **ゼロ**（実測） | 4目標ロックのHUD表示／8AAM(F-22)が無変化であること |

### 6-1. なぜ MiG-31B を単独バッチにするのか

**この4機で唯一、既存機のバーを動かす機体だから**（§2-2）。同時に:
- **6機のMOBILITYバーが変化**する（F-4は+11）
- **F-22のblurb修正が必須**になる（§2-4）＝データ以外の変更を伴う
- SPEEDバーの天井が入れ替わる（F-22 100→98）

他の機体と混ぜると、**バーが動いた原因がどちらの機体か切り分けられなくなる**。
逆に F-2A / Su-37 / F-35C は「バー影響ゼロ or -1」なので、
**万一表に無い変動が出たら実装ミス**と即断できる。この切り分け能力が単独バッチの価値。

### 6-2. なぜ F-2A を先頭にするのか
新SP.W（LASM）と `groundScore` 修正という**仕組みの変更**を含むため、
バー影響がゼロの機体で**先に仕組みだけ通す**のが安全。
F-35C（4AAM）も仕組みを含むが、§3-2 のとおり**データ追加のみで動く**ので最後でよい。

### 6-3. バッチ共通の検証項目
- §2-5 のバー実測ゲート（5項目）
- 新機体でフルブレーキ＋フルピッチ旋回 → **深失速しないこと**
- ハンガーの周回カメラで**モデルが破綻していないこと**（スクショ必須）
- 既存ミッションのリグレッション（最低 m01 / m03 / m07）、fps ≥ 55、エラー0
- SP.W 追加バッチでは、**既存4種のSP.Wが無変化であること**を実機で確認

---

## 7. IRONBACK の乗機を Su-37 に変える案（★採否はユーザー判断）

**AC的正統性では強く支持される**。Su-37 はシリーズ最有名のエース **Yellow 13（AC04・イエロー中隊）**の
乗機であり（裏取り済み）、ACZeroのGelb隊も同機。「**強敵エースが乗る機体**」という記号性は
シリーズ全体で確立しており、ライバル機を Su-37 にするのはシリーズの語彙として最も自然。
機動特化（MOBILITY 99）という性能も「追いつけない敵エース」の演出に噛み合う。
**一方で代償がある**: IRONBACK は現行 `f22` ベースで実装・検証済みの資産があり、
機体を差し替えると **AIプロファイル・被弾ボックス（`hitboxScale`）・撃墜演出・
既存ミッションのバランス**を再検証する必要が生じる。Su-37 は F-22 より旋回が速く（`turnRate 38` は
AI追従の挙動を変える）、**「強すぎて倒せない」or「モデル差で当たり判定がズレる」リスク**を新たに負う。
また §0-2 のとおり AC7 の実態では Su-37 は F-22 の**下位**であり、
「最強のライバル」という位置づけとは厳密には整合しない。
**推奨**: 本書の4機を出荷し **Su-37 の飛行特性が実機で確認できた後**に、
独立した1バッチとして判断するのが安全。今回のバッチ群には含めない。

---

## 8. まとめ（実装者への申し送り）

1. **MiG-31B の `boostSpeed` は 530**（490ではない）。490だとSPEEDバーを取れない（§0-1）
2. **MiG-31B は単独バッチ**。F-22のblurb修正を**同じバッチで**行う（§2-4 / §6-1）
3. **Su-37 の失速不変条件は余裕0**。`brakeSpeed 116` を下げてはいけない（§1-3）
4. **4AAM は新規コード不要**、`SPW_TYPES` へのデータ追加だけで動く（§3-2）
5. **LASM は `groundScore` の修正とセット**。忘れるとA2Gバーが25%になる（§3-1）
6. 本書の全バー数値は**実コード複製シミュレータの実測値**。実装後に一致しなければコードを疑う

---

## 9. 出典

**F-2A**
- https://acecombat.wiki.gg/wiki/F-2A — AC7: Multirole / 105,000 MRP / **LASM×14・HVAA×20・RKT×20** / 機銃2,400発 / 機内解説文
- https://segmentnext.com/ace-combat-7-aircrafts/ — 上記コスト・SP.Wの独立裏取り（wiki系のフォークではない）
- https://steamcommunity.com/sharedfiles/filedetails/?id=2151068973 — AC7実測速度表（F-2A = 2,431km/h / M1.96）
- https://en.wikipedia.org/wiki/Mitsubishi_F-2 — 全長15.52m / 全幅11.125m / **主翼面積34.84m²（F-16比約25%増）** / 単発F110-IHI-129 / M2.0 / ASM-1・ASM-2×4
- https://fighterjetsworld.com/air/f-16-fighting-falcon-vs-mitsubishi-f-2/1327/ — F-16との形状差（レドーム・3分割キャノピー・水平尾翼拡大）
- https://www.slashgear.com/1712781/what-is-mitsubishi-f-2-related-to-f-16-fighter-jet/ — F-16派生としての位置づけ
- https://www.f-16.net/forum/viewtopic.php?f=15&t=813 — 洋上迷彩（two-tone blue）の塗装
- ※洋上迷彩のFS番号（FS35109 / FS35045）は模型系ソース由来で、公式一次資料ではない

**MiG-31B**
- https://acecombat.wiki.gg/wiki/MiG-31B_Foxhound — AC7: Fighter / 280,000 MRP / **LAAM×26・SAAM×24・PLSL×450** / スタット **Speed A・Mobility D+・Stability D** / 機内解説「大きな旋回半径が近接戦で不利」
- https://segmentnext.com/ace-combat-7-aircrafts/ — 上記の独立裏取り
- https://steamcommunity.com/sharedfiles/filedetails/?id=2151068973 — ★**AC7全機中最速**（3,107km/h / M2.51、パーツ込み最大3,896km/h）
- https://en.wikipedia.org/wiki/Mikoyan_MiG-31 — 全長22.62m / 全幅13.456m / M2.83（高高度）・M1.23（低高度）/ 双発D-30F6 / **矩形インテーク** / タンデム複座 / **超音速時5G制限** / 現役戦闘機で最速
- https://www.fighter-planes.com/info/mig31_foxhound.htm — 上記スペックの独立裏取り
- https://www.militaryfactory.com/aircraft/detail.php?aircraft_id=65 — 同上
- https://en.wikipedia.org/wiki/Vympel_R-33 — R-33: 射程120km / **4発搭載・Zaslonで4目標同時誘導**
- https://www.milavia.net/aircraft/f-22/f-22_specs.htm — F-22 M2.25（MiG-31との比較根拠）
- ※Steam討論（https://steamcommunity.com/app/502500/discussions/0/3342162929521820971）には
  「AC7のMiG-31Bは実際には見た目より機動性が高い」というプレイヤー評価があるが、
  **本書はゲーム内スタット（Mobility D+）と機内解説文＝公式の位置づけを採用**した

**Su-37**
- https://acecombat.wiki.gg/wiki/Su-37_Terminator — AC7: Fighter / 550,000 MRP / **4AAM×32・TLS×20・MSL** / Mobility 91 / 機内解説「カナード＋推力偏向、失速前の低速域でも驚異的機動、クルビット」
- https://segmentnext.com/ace-combat-7-aircrafts/ — コスト・カテゴリ・SP.Wの独立裏取り
- https://www.dualshockers.com/ace-combat-7-best-planes/ — ★**F-22A=2位・F-35C=5位・Su-37はランク外**（§0-2 の根拠）
- https://www.giantbomb.com/yellow-13/3005-1821/ — ★Yellow 13（AC04）の乗機がSu-37（§7の根拠）
- https://en.wikipedia.org/wiki/Sukhoi_Su-37 — **試作1機のみ**（T10M-11）/ カナード有 / 推力偏向±15° / 双発AL-37FU / 全長21.935m / 全幅14.698m
- https://en.wikipedia.org/wiki/Sukhoi_Su-27 — フランカー系の識別点（LERX・ブレンデッドボディ・**ナセル間トンネル**・双垂直尾翼）
- ※垂直尾翼の**外傾角**は一次ソースで確認できず。モデリング時は実機写真を参照すること

**F-35C**
- https://acecombat.wiki.gg/wiki/F-35C_Lightning_II — AC7: Multirole / 840,000 MRP / ★**4AAM×36**・8AGM×32・SOD×24 / 機内解説「艦載型のステルスマルチロール」
- https://segmentnext.com/ace-combat-7-aircrafts/ — コスト・カテゴリ・4AAMの独立裏取り
- https://acecombat.wiki.gg/wiki/4AAM — 4AAM＝**4目標同時ロック**。AC7で14機が搭載（F-35C・Su-37を含む）
- https://www.dualshockers.com/ace-combat-7-best-planes/ — ★F-35C=5位「**マルチロール機中最強**」（§0-4 の根拠）
- https://en.wikipedia.org/wiki/Lockheed_Martin_F-35_Lightning_II — C型: 全幅13.1m / **主翼面積668 sq ft（A型460比 約45%増）** / **折り畳み翼端はC型のみ** / 単発F135 / 傾斜双垂直尾翼 / 内部兵装庫にAAM4発
- https://www.usna.edu/NavalAviation/FixedWingAircraft/F35C_Lightning_II.php — 米海軍兵学校によるC型諸元
- https://www.wionews.com/photos/f-35c-fighter-jets-what-makes-them-different-from-any-other-f-35-version-1770278950687 — A型との差（大型翼・追加エルロン・進入速度145kt）
- https://www.twz.com/adapter-for-f-35-internal-carriage-of-six-aim-120-missiles-is-progressing — 内部搭載数（Block 4で6発）

**Sortie 実コード（本書の数値算出の基礎）**
- `index.html` L2012 `AIRCRAFT_ORDER` / L2020-2072 `SPW_TYPES` / L2074-2180 `AIRCRAFT_TYPES`
- L10937-10995 `computeAircraftSpecBars()` — SPEED/MOBILITY/STABILITY/A2A/A2G/DEFENSE の全スコア式
- L6717-6750 `updateLock()` — ロック候補の収集（`enemies[]` を走査、`enemy.surface` が艦・地上目標）
- L6782-6797 `updateMultiLock()` — `weapon.multi` 汎用実装（4AAMが無改修で動く根拠）
- L2716 — 「ground installations live in enemies[] exactly like the ships」（LASMのフィルタ実装根拠）

**注記**: `acecombat.wiki.gg` と `acecombat.fandom.com` は同一本文のフォークであり、
両者の一致は独立2ソースにならない。本書で「2系統で確認」としたものは全て
**Wiki系 + 独立系（segmentnext / DualShockers / Steam / Wikipedia / 実機公式）**の組み合わせである。
