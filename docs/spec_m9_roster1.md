# SPEC M9 — バリエーション拡充 第1弾 ロスター (2026-07-25, Fable設計)

M9「実機・敵バリエーションをひたすら増やす」の第1弾。自機2機（F/A-18F / A-10C）+ 敵3種
（爆撃機 / 戦車・対空戦車 / フリゲート）を、**性能表とミッション組込をセットで**設計する。

調査は全てWEB裏取り済み（末尾に出典URL）。**AC7には公開された数値ステータスが存在しない**（バーグラフ画像のみ）
ため、以下の数値は「AC7のカテゴリ・機内解説文・実機スペック」から**Sortieの既存数値体系へ翻訳したもの**であり、
「AC7の数値」ではない。この区別は本書全体で厳守する。

---

## 0. 前提の訂正（着手前に必ず読むこと）

実装前に既存コードを実測した結果、依頼時の前提に誤りが3件あった。**以下が正**。

### 0-1. 既存4機のHPと序列
| | F-22 | F-15 | F-4 | F-16 |
|---|---|---|---|---|
| `maxHealth`（実測） | 200 | 150 | **125** | **100** |

**DEFENSE序列は F-22 > F-15 > F-4 > F-16。** F-4はF-16より硬い。
したがって「全5項目で F-22 > F-15 > F-16 > F-4」という前提は成立していない。
F-4のblurb「全性能で他機に劣る」は**現行ビルドで既に嘘**（DEFENSE 40% > F-16 20%）。
本件とは独立に文言修正を推奨する。

速度 460/425/375/320 と弾数 14/12/10/8 は前提どおりで正しい。

### 0-2. M6特殊兵装は未実装
`QAAM` / `XLAA` / `8AAM` / `spw` / `AIR-TO-GROUND` はコード内に**1件も存在しない**。
SPECバーは5本（SPEED/MOBILITY/STABILITY/AIR-TO-AIR/DEFENSE）のまま。
本書のSP.W欄は全て**M6実装後に有効化される予約**であり、M9単体では発火しない。
→ これは §5 のバッチ順に直接影響する（A-10Cの扱い）。

### 0-3. HPは98ダメージで量子化されている
通常ミサイル1発 = 98固定（全機共通 `missileDamage: 98`）。したがって**HPは
98 / 196 / 294 / 392 の境界でしか意味を持たない**。

| 必要ミサイル数 | HP帯 | 既存ユニット |
|---|---|---|
| 1発 | 1–98 | aaGun 60 / fuelTank 50 / radarSite 70 / samSite 90 |
| 2発 | 99–196 | bunker 120 |
| 3発 | 197–294 | aegis 250 |
| 6発 | 491–588 | carrier 520 |

**HP 70 と HP 90 は同じ強さ**（どちらも1発）。新ユニットのHPを決めるときは
「何発で落としたいか」を先に決め、その帯の中央値を置く。本書は全てこの規則で数値を決めている。

---

## 1. 自機追加2機

### 1-1. AC7での位置づけ（裏取り結果）

| | F/A-18F Super Hornet | A-10C Thunderbolt II |
|---|---|---|
| AC7カテゴリ | **Multirole** | **Attacker** |
| 取得コスト | 285,000 MRP（F-14D購入が前提） | 120,000 MRP |
| SP.W（AC7実装） | **QAAM ×10 / LASM ×16 / EML ×22** | **UGB ×40 / RKT ×40 / 4AGM ×44** |
| 機銃弾数 | 2,400 | **4,800（全機中最多）** |
| 機内解説 | 高速戦闘機より**中速域の機動性に優れ、安定性はほぼ完璧** | 低速・重装甲の対地攻撃機 |

**依頼時のSP.W想定（F/A-18=LAAM/HCAA、A-10=GPB）は両方とも誤り**だった。上表が正。

実機スペック（形状差別化の根拠）:
- **F/A-18F**: 全長18.5m / 全幅13.68m / 複座タンデム / 双発F414 / 最大M1.8 /
  外傾双垂直尾翼 / 大型化されたLERX（高AoA時に自動開口するベントつき）/ 艦載（フック・折畳翼）
- **A-10C**: 直線翼（無後退）/ 双発TF34を**胴体後上部にポッド懸架** / 双垂直尾翼 /
  GAU-8 30×173mm・**3,900発/分**・機首左寄せ搭載（発射位置の砲身が機体中心線に一致）/
  チタン装甲「バスタブ」540kg / **アフターバーナー無し**

### 1-2. 性能表（既存4機と同一の全フィールド）

```
fa18: {
  id: "fa18", label: "F/A-18F SUPER HORNET", role: "Carrier Multirole", tag: "NAVY",
  cruiseSpeed: 200, boostSpeed: 390, brakeSpeed: 126,
  pitchRateDeg: 47, rollRateDeg: 150, yawRateDeg: 13, maxBankAngleDeg: 57,
  normalRollSpring: 42, rollRateLimitDeg: 145, turnRateDeg: 33,
  rollDamping: 11.8, stallWarnSpeed: 84, stallEntrySpeed: 72,
  stallAuthorityLoss: 0.50, structuralG: 3.15,
  gunDamage: 20, missileDamage: 98,
  boostResponse: 0.52, brakeResponse: 0.50, cruiseResponse: 0.58,
  missileCapacity: 12, maxHealth: 135,
  tipSpan: 7.9, tipZ: 2.9,
  theme: { primary: 0xb9c2ca, secondary: 0x707a85, accent: 0x2f4f75,
           canopy: 0x8fe0ff, exhaust: 0x8cecff, scale: 1.02, variant: "hornet" }
}

a10: {
  id: "a10", label: "A-10C THUNDERBOLT II", role: "Ground Attack", tag: "ATTACKER",
  cruiseSpeed: 150, boostSpeed: 265, brakeSpeed: 116,
  pitchRateDeg: 26, rollRateDeg: 92, yawRateDeg: 9, maxBankAngleDeg: 38,
  normalRollSpring: 24, rollRateLimitDeg: 88, turnRateDeg: 20,
  rollDamping: 12.6, stallWarnSpeed: 76, stallEntrySpeed: 64,
  stallAuthorityLoss: 0.50, structuralG: 2.4,
  gunDamage: 19, missileDamage: 98, gunGroundBonus: 3.2,
  boostResponse: 0.82, brakeResponse: 0.70, cruiseResponse: 0.80,
  missileCapacity: 6, maxHealth: 240,
  tipSpan: 9.6, tipZ: 1.6,
  theme: { primary: 0x5d6660, secondary: 0x3f4642, accent: 0x2a2f2c,
           canopy: 0x9fd8e8, exhaust: 0xbfd9d0, scale: 1.06, variant: "hog" }
}
```

`AIRCRAFT_ORDER` は `["f16", "fa18", "f15", "f4", "a10", "f22"]`（弱→強の既存並びを維持しつつ挿入）。

### 1-3. 数値の根拠

**F/A-18F = 「集計ではF-16とF-15の間、ただし全軸で間ではない」**
- `boostSpeed 390`: 実機M1.8はF-16(M2.05)/F-15(M2.5)より遅い。依頼の「F-16とF-15の間」を
  満たしつつ、序列を壊さない最大値として390。
- `pitchRateDeg 47` は**F-15(45)より上**、`rollRateDeg 150` は**F-15(165)より下**。
  「中速域の機動性に優れる」というAC7機内解説と、艦載機の重い横運動を両立させる非対称配分。
- `rollDamping 11.8` / `stallAuthorityLoss 0.50` はF-15より良い＝STABILITYでF-15を上回る。
  「安定性はほぼ完璧」の解説と、空母着艦機の低速安定を反映。
- `maxHealth 135`: 双発艦載機としてF-4(125)より上、F-15(150)より下。**2発帯（99-196）**に収まる。

**A-10C = 「最低速・最低機動・最高DEFENSE」**
- `boostSpeed 265` / `cruiseSpeed 150`: 実機最大約700km/h級で、他機（M1.8-2.5）とは桁が違う。
  ゲームの圧縮された速度帯（320-460）の**下に新しい床を作る**位置。
- `maxHealth 240`: **F-22(200)を明確に超える**。チタン装甲バスタブと、AC7で最も打たれ強い
  機体という位置づけの直接的な表現。→ §1-5 のF-22 blurb修正が必須になる。
- `missileCapacity 6`: 全機中最少。対空は捨てる。
- `gunDamage 19` + **新フィールド `gunGroundBonus: 3.2`**: §1-4 参照。

### 1-4. ★GAU-8をどう表現するか（AIR-TO-AIRバーとの衝突）

素直に「機銃強化」として `gunDamage` を上げると**バーの計算式に衝突する**。

`firepowerScore = missileDamage*0.35 + gunDamage*5 + missileCapacity*3`

`gunDamage` の係数が5と支配的なため、GAU-8相当の `gunDamage: 40` を与えると
A-10のAIR-TO-AIRバーが **F-22を超えて全機中1位** になる。対空最弱の機体としては明確に誤り。

**採用案**: `gunDamage` は対空値（19 = 低め）に留め、**`gunGroundBonus: 3.2` を新設**して
ガンレイキャストのヒット先が `surface: true`（艦・地上目標）のときだけ乗算する。
- 対地実効値 = 19 × 3.2 = **60.8/発**（F-22の対空26に対し2.3倍）
- AIR-TO-AIRバーは39%（F-4の20%に次ぐ下から2番目）に収まり、序列が正しく読める
- 変更は `damageEnemy` 呼び出し前の1箇所のみ。既存4機は `gunGroundBonus` 未定義＝1.0扱い

これは**M6未実装でもA-10に固有の強みを与えられる**唯一の手段でもある（§5参照）。

### 1-5. ★SPECバーへの影響（実測）

バーは `AIRCRAFT_ORDER` 内の min/max で正規化されるため、**新機体が新しい最小/最大を作ると
既存機のバーが動く**。`computeAircraftSpecBars()` を複製して実測した：

**F/A-18F単独追加 → 既存4機の全20バーが変化ゼロ。**
どの軸でも新しいmin/maxにならないため、完全な無害追加。

**A-10C追加 → 既存4機が動く:**

| | SPEED | MOBILITY | STABILITY | A2A | DEFENSE |
|---|---|---|---|---|---|
| F-16 | +16 | +4 | 0 | 0 | 0 |
| F-15 | +7 | +2 | 0 | 0 | **-11** |
| F-4 | **+26** | +7 | 0 | 0 | -6 |
| F-22 | 0 | 0 | 0 | 0 | **-23** |

6機体制での最終バー:

| | SPEED | MOBILITY | STABILITY | A2A | DEFENSE |
|---|---|---|---|---|---|
| F-16 | 69 | 61 | 50 | 47 | 20 |
| **F/A-18F** | 75 | 77 | 81 | 63 | 40 |
| F-15 | 87 | 80 | 75 | 73 | 49 |
| F-4 | 46 | 27 | 20 | 20 | 34 |
| **A-10C** | 20 | 20 | 92 | 39 | 100 |
| F-22 | 100 | 100 | 100 | 100 | 77 |

**必須の付随修正**: F-22のblurb「速度・旋回・火力・装甲すべて最高」は
DEFENSE 77%になった時点で嘘になる。**「装甲」を外し「速度・旋回・火力すべて最高」へ**修正する。
（データ変更が文言修正を強制する例。実装時に忘れやすい）

なお、この再正規化は**AC7と同じ挙動**（バーはハンガー内の相対値）なので仕様として正しい。
固定したい場合は min/max を定数にピン留めする案もあるが、非推奨。

### 1-6. ★失速の隠れ不変条件（発見）

`brakeTargetSpeed = BRAKE_SPEED - 52 * highGBrakeLoad`（フルブレーキ＋フルピッチで52落ちる）。
既存4機は全て **`brakeSpeed - 52 >= stallEntrySpeed`** を満たす（F-16 +4 / F-15 +2 / F-4 +8 / F-22 ちょうど0）。
＝**ブレーキ操作だけでは自機を失速させられない**という設計上の保証。

A-10の初稿（brakeSpeed 96 / stallEntry 64）は**これを20も割り**、
ハードブレーキ旋回のたびに深失速する事故機になっていた。上表の
`brakeSpeed 116` / `stallEntrySpeed 64` はこの不変条件をちょうど満たす値。

さらに `stallEntrySpeed > STALL_DEEP_SPEED(62)` も必須。下回ると
`lowSpeedRatio` の分母が `Math.max(1, ...)` の1に潰れ、失速の勾配が壊れる。
**新機体を足すたびにこの2条件を検算すること。**

### 1-7. SP.W予約（M6実装後に有効化）

| 機体 | SP.W | 弾数 | 理由 |
|---|---|---|---|
| F/A-18F | **LASM**（長距離対艦ミサイル） | 14 | AC7実装の3種のうち、Sortieに既に対艦戦（m03）と
新規フリゲートがあり最も活きる。QAAMはM6でF-16に既取り、EMLはレールガンで世界観外 |
| A-10C | **4AGM**（4目標同時対地ミサイル） | 16 | AC7実装。§4の車列ミッションと直結（1斉射で4両）。
UGBはM6でF-4に既取りのため回避し、機構的な差別化を確保。代案はRKT |

A2Gバー（M6で追加予定）の6機分: A-10 **1.0** / F-4 0.95 / F/A-18 0.60 / F-22 0.30 / F-16 0.25 / F-15 0.25

### 1-8. モデル（`createAircraftModel` の variant 追加）

既存は `viper`/`lancer`/`bison`/`else=raptor` のif-elseチェーン。末尾のelse手前に2分岐を足す。

**`hornet`**: 双発・肩翼台形翼。識別要素は
①**外傾双垂直尾翼**（`fin` を ±rz で外に倒す。F-22の内向きcantと逆向きにするのが肝）
②**LERX**（`panel` を機首側面から主翼付根へ薄く伸ばす。F-16のストレーキより幅広）
③**複座タンデムキャノピー**（`canopy` の z スケールを長く。F-4の 2.25 に近い 2.1）
④胴体下の**着艦フック**（`panel` を細く後下方へ）。翼端はAIM-9レール
翼planformは `wingEagle` を流用可（台形肩翼で近い）。専用に起こすなら半スパン7.9。

**`hog`**: 識別要素は
①**直線翼**（新規 `wingHog`: 後退角ゼロ、半スパン9.6の細長い矩形。既存4種は全て後退翼なので
シルエットが一発で判別できる）
②**胴体後上部の双発ポッド**（`rearBody` を左右に離して**高い位置**へ。既存機は全て胴体内蔵なので差が出る）
③**双垂直尾翼**（`fin` ×2を尾端の外側へ、垂直のまま）
④**機首下のGAU-8**（`missileBody` を太く短く、わずかに左オフセット）
⑤主脚ポッド（`nozzle` を翼下前方に2基）
**アフターバーナー無し**を反映し `addFlame` のスケールを他機の半分以下、`theme.exhaust` も
青白ではなく淡い灰緑（0xbfd9d0）にする。ブーストしても炎が伸びないのがA-10らしさ。

---

## 2. 敵爆撃機 BOMBER

### 2-1. 裏取り結果（重要な発見つき）

- AC7の迎撃対象の爆撃機は **Tu-95（1,000pt）/ Tu-160（1,200pt）**。B-52HはAC7では
  **地上駐機のまま離陸しない**（M14 Cape Rainy）。B-1B/B-2Aは**味方**。
- 耐久はティア化: **Tu-95 = 通常ミサイル1〜2発 / Tu-160 = 3発**（一般戦闘機は1発、戦車は2発）。
  スコアも Tu-95 1,000pt に対し MiG-21bis 220pt。＝**遅い・硬い・高得点**という設計。
- ★**防御銃座は実在する**（2系統一致）: Acepedia「Tu-95は尾部に機銃を持ち、後方に近づいた機に撃つ」+
  Steam攻略ガイド「**1.5km以内に入るとほぼ確実に被弾する**」。
  依頼の「防御銃座＝後方限定AA」はAC7に前例がある。
- ★**意外な事実**: AC WikiはAC6のB-52尾部砲を「実機には無い＝史実誤り」と注記しているが、
  **これはWikiの誤り**。B-52G/HはM61バルカン20mm（4,000発/分・1,242発）の遠隔尾部銃座を
  実際に搭載しており、1991年の湾岸戦争での誤射事件と冷戦終結後の予算削減を受けて撤去、
  同年9月16日に尾部銃手職が廃止された。**尾部銃座は史実**。

### 2-2. 実装の要（新AI不要の抜け道）

`ENEMY_TYPES` は **`ENEMY_AI_PROFILES` の全キー**について `AIRCRAFT_TYPES[id]` を引いて合成される。
一方ハンガーとバー正規化は **`AIRCRAFT_ORDER`** だけを回す。

→ **`AIRCRAFT_TYPES` に足し、`AIRCRAFT_ORDER` には足さない**エントリは
**敵専用機体**になり、ハンガーには一切現れない。既存の「敵は自機と同じ性能表を使う」原則を
壊さずに敵専用機を追加できる。**リファクタ不要。**

また `behavior: "armored"` は実質デフォルト分岐（炎スケール0.82にしか効かない）で、
回避挙動は `evadeLateral/evadeVertical/evadeFrequency` の**数値**が決めている。
→ 回避しない爆撃機は**新しいbehavior文字列を作らなくても**数値ゼロで表現できる。

**注意**: `selectAircraft()` は `if (!AIRCRAFT_TYPES[id])` でしか検証していないため、
デバッグAPI経由で敵専用機を選択できてしまう。`AIRCRAFT_ORDER.includes(id)` へ**要修正**。

### 2-3. 性能表

```
// AIRCRAFT_TYPES に追加（AIRCRAFT_ORDER には追加しない＝敵専用）
bomber: {
  id: "bomber", label: "B-52H STRATOFORTRESS", role: "Strategic Bomber", tag: "ENEMY",
  cruiseSpeed: 120, boostSpeed: 165, brakeSpeed: 110,
  pitchRateDeg: 12, rollRateDeg: 34, yawRateDeg: 4, maxBankAngleDeg: 18,
  normalRollSpring: 12, rollRateLimitDeg: 30, turnRateDeg: 7,
  rollDamping: 6.0, stallWarnSpeed: 100, stallEntrySpeed: 88,
  stallAuthorityLoss: 0.90, structuralG: 1.6,
  gunDamage: 12, missileDamage: 98,
  boostResponse: 0.90, brakeResponse: 0.85, cruiseResponse: 0.92,
  missileCapacity: 0, maxHealth: 290,
  tipSpan: 12.5, tipZ: 1.2,
  theme: { primary: 0x4c5550, secondary: 0x333b38, accent: 0x20262a,
           canopy: 0x8fe0ff, exhaust: 0x9fb0b8, scale: 1.9, variant: "bomber" }
}

// ENEMY_AI_PROFILES に追加
bomber: {
  behavior: "armored",
  hitboxScale: 2.6,
  patrolSpeedScale: 1.0, patrolPathScale: 0.30,
  engageRange: 0, disengageRange: 0,        // ★プレイヤーを追わない
  pursuitBack: 0, verticalBias: 30, verticalAmplitude: 6, verticalFrequency: 0.3,
  evadeLateral: 0, evadeVertical: 0, evadeFrequency: 0,   // ★回避しない
  speedResponse: 0.06,
  rearGun: true,                            // ★新フィールド（§2-4）
  fireMin: 1.4, fireSpread: 0.9,
  attackRange: 620, aimThreshold: 0.80,
  hitChanceScale: 0.46, maxHitChance: 0.30,
  damageMin: 5, damageMax: 5,
  radarColor: "#ff7a4f", tracerColor: 0xffa04a, explosionColor: 0xffb648,
  theme: { ...上記theme, scale: 1.9 }
}
```

**`maxHealth: 290` の根拠（依頼の400から下方修正）**:
- 290は**3発帯（197-294）の上端**。AC7で最も硬い爆撃機Tu-160がちょうど通常3発であり、canon一致。
- 400にすると**5発**必要になる。自機の搭載数は6〜14発で、**空戦ウェーブ中は補給が無い**
  （補給は `spawnNavalWave` のみ）。爆撃機3機×5発＝15発で、F-22(14発)でも**弾切れで詰む**。
- 290なら3機×3発＝9発。機銃（12発/秒 × 19〜26ダメージ）で削る選択肢も残り、
  「爆撃機には機銃で寄る→尾部銃座に撃たれる」という緊張が生まれる。

### 2-4. 後方限定AA（`rearGun`）

`attemptEnemyAttack()` は現在**2つの条件が尾部銃と正反対**:
1. `behindPlayer`（敵が自機の後方にいる）を要求
2. `aimAlignment = enemyForward · enemyToPlayer`（敵の**前方**が自機を向いている）を要求

尾部銃はこの鏡像。`spec.rearGun` が真のとき:
- `enemyForward` を **`-enemyForward`** に差し替える
- `behindPlayer` ゲートを「**自機が爆撃機の後方にいる**」判定に置き換える
  （= `enemyToPlayer · enemyForward < -0.28`）
- 曳光弾の発射原点 `start` を `+forward*7` から `-forward*(機体長)` へ

既存のヒット確率・曳光弾・ダメージ経路はそのまま流用できる。`attackRange 620` は
出典の「1.5km以内で被弾」をSortieのスケール（`GUN_RANGE 750`、戦闘機の `attackRange` 500-560）へ翻訳した値。
`damageMin/Max: 5`（戦闘機は7）＝継続的な削りだが即死級ではない。

### 2-5. モデル（variant `bomber`）

`theme.scale 1.9` で他機の約2倍。識別要素:
- **高アスペクト後退翼**（新規 `wingBomber`: 半スパン12.5、翼弦は細い。既存のどの翼より細長い）
- **4基のエンジンポッドを翼下に吊る**（`rearBody` を小さくして翼下前方へ4つ。
  胴体内蔵の戦闘機と決定的に違うシルエットになる）
- 長い円筒胴体（`fuselage` を z 方向に大きく引き伸ばす）
- 単一の**背の高い垂直尾翼**
- **尾端の銃座**（`panel` の小さな箱 + `missileBody` を細く2本後ろ向きに）
  → `rearGun` の発射原点と視覚が一致する

**依頼の「直線翼4発」は訂正**: この階級の実在戦略爆撃機に直線翼は無い（B-52もTu-95も約35°後退翼）。
「4発」はTu-95の発動機数、B-52は4ポッド8発。上記は**細長い後退翼＋4ポッド**とし、
戦闘機との差別化は後退角ではなく**アスペクト比と翼下ポッド**で取る。

### 2-6. 迎撃ミッション案

```
{ key: "m-intercept", world: "sunsetOcean", title: "BOMBER INTERCEPT",
  jp: "敵の重爆撃編隊が本土へ向かっている。護衛を排除し、到達前に全機撃墜せよ。",
  sequence: ["bomber1"], parTime: 265, hasOutro: false, map: { x: 0.34, y: 0.16 } }
```
- 編成: **爆撃機3 + 護衛戦闘機3**（護衛は `f16`/`f15` を流用）= 6目標
- 時間圧力は**parTime（ランク評価）で表現し、失敗条件は作らない**。
  これはAC7 M06「Long Day」が制限時間ではなく**スコアアタック**である事実に倣った設計。
  「基地到達で失敗」は爆撃機に目的地追従AIが要る（§2-7）ので v2 送り。
- 無線: command「高高度に大型機の反応、6。重爆だ——市街地に落とされる前に叩き落とせ。」(id `intercept-brief`)
  wingman「護衛が張り付いてる。先に蹴散らさないと爆撃機に取り付けないぞ！」(id `intercept-brief-wing`)
  爆撃機初撃墜時 command「1機撃墜を確認。残りを頼む、時間が無い。」
- 見せ場: 巨大な機影に対する機銃パス。近づくと尾部銃座に削られるので、
  「ミサイルで遠くから削る」か「被弾覚悟で機銃で寄る」かの択が生まれる。
- 夕焼け海上（`sunsetOcean`）を選んだのは、大型機のシルエットが最も映えるため。

### 2-7. v2（任意・後回し）
`behavior: "ingress"` を新設し、ミッション定義の目的地座標へ直進、到達で
`missionFailed` を立てる。これで初めて「到達前に」が機構として成立する。
AC7 M05「444」（爆撃機が基地を破壊しきると失敗）が該当する構造。

---

## 3. 地上ユニット TANK / AD TANK

### 3-1. 裏取り結果

- AC7のゲーム内ラベルは **AAGUN / SAM / TANK / AD TANK / APC / TRUCK / radar vehicle**。
  実例（M13 Bunker Buster）: AAGUN×24, SAM×5, TANK×2, **AD TANK×3**, APC×2, TRUCK×2。
- ★**戦車の主砲は対空兵器としてモデル化されていない**。AC専門のSEAD解析記事が挙げる
  「対空指定ユニット」は **AA Gun / SAM / XSAM・VLS / CIWS / AD Tank / 敵機**で、
  **MBTとAPCは含まれない**。機銃による低脅威の削りはあるが、主砲での撃墜は確認できず。
  → 依頼の「戦車の主砲は対空無効」は**裏取り済みで正しい**。
- **AD Tank（対空戦車）はAC正式のユニット種別**で、2K22ツングースカがモデル。
  「CIWSとSAMを戦車の耐久で束ねたもの」で、**プレイヤーのミサイルを迎撃する**。撃破に2発。
  → 依頼の「aaTruck」は独自命名だが、**AC canonの `AD TANK` に改名**したほうが世界観に合う。

### 3-2. GROUND_TYPES 拡張案

```
tank: {
  key: "tank", surface: true, ground: true,
  label: "TANK", role: "Main Battle Tank",
  hp: 110,                          // 2発帯（99-196）
  hitRadius: 18,
  crash: { halfLen: 6, halfBeam: 3.4, top: 3.2 },
  hitBox: { x: 8, y: 6, z: 13 },
  smokeHeight: 3,
  aa: null,                         // ★主砲は対空無効（裏取り済み）
  mobile: { speed: 15, turnRate: deg(28) },   // ★新（§3-3）
  radarColor: "#ffc47a", tracerColor: 0xffb04a, explosionColor: 0xffa348
}

adTank: {
  key: "adTank", surface: true, ground: true,
  label: "AD TANK", role: "Air Defense Tank",
  hp: 90,                           // 1発帯。SAMサイト(90)と同格＝優先排除の価値
  hitRadius: 20,
  crash: { halfLen: 6, halfBeam: 3.6, top: 4.0 },
  hitBox: { x: 9, y: 7, z: 13 },
  smokeHeight: 4,
  aaMounts: [-2.8, 2.8], aaHeight: 4.6,
  aa: { range: 600, cooldownMin: 0.65, cooldownSpread: 0.5,
        damage: 7, maxHitChance: 0.15, tracers: 2 },   // 固定aaGun(560/0.7/0.14)より強い
  mobile: { speed: 13, turnRate: deg(26) },
  radarColor: "#ffc47a", tracerColor: 0xffb04a, explosionColor: 0xffa348
}
```

**HPの判断**:
- `tank: 110` は2発。AC7の「戦車＝2発」と完全一致。
- `adTank: 90` は**1発**。AC7canonでは戦車と同じ2発だが、**Sortieの `samSite` が90＝1発**であり、
  「脅威度は高いが脆く、優先的に潰す価値がある」という既存の防空ユニットの設計思想に揃えるほうが
  一貫する。依頼の70も同じ1発帯なので、実質的な強さは依頼指定と同一（§0-3）。
- AC7のAD Tankはミサイル迎撃もするが、**v1では非採用**（自機ミサイルの迎撃は
  M8のブレイクターンより大きな新機構になる）。対空機銃のみで実装する。

### 3-3. ★移動のための新機構（最大の実装コスト）

現状の地上ユニットは**完全に静止**（`speed: 0` / `mode: "static"` / `behavior: "static"`、
`updateGroundUnit` に移動処理なし）。車列には新しい移動経路が要る。

**地形高さの罠**: `surfaceHeightAt()` は**射程内の山ごとにレイキャスト**し、
`mesh.updateMatrixWorld()` まで呼ぶ。これを毎フレーム×車両数で回すと重い
（M4で「円錐近似では埋没する」と判明して実メッシュ化した経緯があり、軽くはできない）。

**採用案**: ミッション定義で経路を与え、**スポーン時に各ウェイポイントのyを1回だけ焼く**。
走行中はウェイポイント間を線形補間するだけ＝**毎フレームのレイキャストはゼロ**。

```js
groundUnits: [
  { id: 41, type: "tank", path: [[x,z], [x,z], ...], speed: 15, loop: false },
  ...
]
```
- 進行方向から `rotation.y` を毎フレーム更新（車両が向きを変えるだけで「生きている」画になる）
- 終端に達したら停止（v1）。「離脱＝失敗」はv2（§3-5）
- 既存の静止ユニットは `path` 無し＝現行どおり。**後方互換**

### 3-4. 車列ミッション案

```
{ key: "m-convoy", world: "glacierCanyon", title: "CANYON CONVOY",
  jp: "氷河回廊を敵の機甲部隊が南下中。谷を抜けられる前に車列を殲滅せよ。",
  sequence: ["air1"], parTime: 275, hasOutro: false, map: { x: 0.24, y: 0.32 } }
```
- **`glacierCanyon` を再利用**。既存の回廊（600m間隔の壁山ラダー）が
  そのまま「谷底の一本道」になり、新規マップ不要。
  AC6「Weapons of Mass Destruction」（渓谷を低空侵入し車列を殲滅、離脱前に破壊必須）に相当する構造。
- 編成: **tank×4 + adTank×2**（回廊軸に沿って縦列、200m間隔で南下）+ **samSite×1**（壁山に静止）
  + 護衛CAP3機 = **10目標**
- 谷底を走る車列に対し、**adTankの対空機銃が谷の両側から刺さる**ので、
  「高度を取れば安全だが狙いにくい／低く入れば当てやすいが撃たれる」という択になる
- 時間圧力は **parTime 275** で表現。AC7 M06がスコアアタックである事実に倣い、
  **「逃したら減点」という新しい失敗機構は作らない**（既存のランク評価で十分機能する）
- 無線: command「氷河回廊に敵機甲部隊。谷を抜けられたら前線が崩れる——急げ。」(id `convoy-brief`)
  wingman「対空戦車が混ざってる！ 先に潰さないと低空に入れないぞ！」(id `convoy-brief-wing`)

### 3-5. v2（任意）
車列が経路終端（＝戦闘空域の出口）に到達したら撃破扱いにせず**離脱**させ、
リザルトに「取り逃がし n両」を出す。AC6の「離脱＝失敗」まで行くかは要判断。

---

## 4. 艦船 FRIGATE

### 4-1. 裏取り結果

AC7 M11「Fleet Destruction」のユニット表が**艦種の階層をポイントで明示**している:

| ユニット | pt |
|---|---|
| FRIGATE | **200** |
| DESTROYER | 300 |
| CRUISER | 400 |
| **AEGIS** | **700** |
| **AIRCRAFT CARRIER** | **1,000** |

- ★**Aegisは船体サイズの階級ではなくシステム種別**。AC7のAegisはタイコンデロガ級巡洋艦・
  アーレイバーク級駆逐艦・こんごう型・**アドミラル・ゴルシコフ級フリゲート**の4クラスがモデル。
  つまり「Aegisのハルにフリゲートも含まれる」。
- ★**Aegisと他艦の決定的な差は「SAMランチャーを2基持つこと」**（AC Wiki明記）。
  → 非Aegis艦のSAMは**それより弱い**というのが、シリーズ内で一貫した差別化軸。
- **CIWSは明確に実装されている**。「CIWSはプレイヤー機にダメージを与えるが、
  **対空機銃と同程度のダメージ**」。→ **Sortieの既存 `aa` ブロックが既にCIWSそのもの**。
  新機構は不要で、値を弱くするだけでよい。
- 実機の裏取り: **オリヴァー・ハザード・ペリー級フリゲート = 全長136-138m、
  SAMは単腕Mk 13ランチャー**（VLSではなくレール式）**1基 + ファランクスCIWS 1基**。
  → 「SAM弱体版（cooldown長め）+ CIWS」という依頼の設計は、AC canonと実機の両方から裏付く。

### 4-2. ★Sortieのスケールは 1ユニット ≒ 1m（発見）

| | Sortie `hitBox.z` | 実艦 |
|---|---|---|
| carrier | 340 | ニミッツ級 **332.8m** |
| aegis | 162 | アーレイバーク級 154m / タイコンデロガ級 173m |
| **frigate（提案）** | **135** | アドミラル・ゴルシコフ級 **135m** |

既存2隻が実艦の全長とほぼ一致しており、**艦の寸法は実測値をそのまま入れてよい**。
フリゲート135はAegis(162)の0.83倍で、調査で得た実艦比0.78-0.87倍にも収まる。

### 4-3. SHIP_TYPES 拡張案

```
frigate: {
  key: "frigate", surface: true,
  label: "FRIGATE", role: "Guided Missile Frigate",
  hp: 180,                                   // 2発帯（99-196）
  cruiseSpeed: 15,                           // 最速（aegis 13 / carrier 10）
  turnRate: deg(4),
  hitRadius: 62,
  crash: { halfLen: 66, halfBeam: 11, top: 17 },
  hitBox: { x: 20, y: 26, z: 135 },
  sinkDepth: 24, blastSpread: 26,
  smokeOffset: 10, smokeHeight: 14,
  sternOffset: 63, bowOffset: 61,
  aaMounts: [26],                            // ★CIWS 1基（ペリー級=ファランクス1基）
  aaHeight: 11,
  aa: { range: 520, cooldownMin: 0.80, cooldownSpread: 0.70,
        damage: 7, maxHitChance: 0.13, tracers: 1 },
  radarColor: "#ffcf8a", tracerColor: 0xffb04a, explosionColor: 0xffa348
}

// ENEMY_MISSILE_PROFILES に追加（単腕レール式＝VLSより遅い）
frigate: {
  cooldownMin: 12.0, cooldownSpread: 5.0,    // aegis 7.0/3.2 の約1.7倍
  range: 1250, minRange: 240,                // aegis 1700
  speed: 175, maxSpeed: 470,
  turnRate: deg(46),                         // aegis 58
  damage: 98, life: 8.5, launchDot: -1
}
```

**イージスとの差別化まとめ**（全て裏取りに基づく）:

| | AEGIS | FRIGATE |
|---|---|---|
| HP | 250（3発） | **180（2発）** |
| SAMランチャー | 2基相当（cooldown 7.0s） | **1基相当（cooldown 12.0s）** |
| SAM射程 | 1700 | **1250** |
| CIWS | 2基・range 640・命中0.16 | **1基・range 520・命中0.13** |
| 全長 | 162 | **135** |
| 速度 | 13 | 15（最速） |

「数は多いが1隻ずつは軽い護衛」として艦隊に厚みを出す役。

### 4-4. モデル
`createShipModel` は現在 `kind === "carrier"` の三項でデッキ色を分けるだけ。
frigateは**aegis分岐を0.83倍**にし、以下を差し替える:
- VLSセル群（前後）→ **単腕レールランチャー1基**（`shipCylinder` を斜めに立てた旋回台）
- SPYレーダーの八角板（`shipOctPlate`）は**省く**（Aegisの識別記号なので付けてはいけない）
- 代わりに格子マストを1本高く（`shipCylinder` 細長）
- CIWSドームを**艦尾側に1基だけ**（`shipOctPlate` を小さく、白）
→ 遠目で「Aegisより小さく、板レーダーが無い」ことが判れば成功。

### 4-5. ミッションへの組込

**m03 FLEET DESTRUCTION に2隻追加**を推奨（新ミッションより費用対効果が高い）。
編成: 空母1 + イージス2 + **フリゲート2** = 5隻。AC7 M11の
「フリゲート/駆逐艦/巡洋艦/Aegis×2/空母×1」という重層構成に一歩近づく。

**ただし配線の変更が3箇所必要**（§4-6）。

### 4-6. ★「1ウェーブ＝3体」ハードコードの解除（必須）

新編成を入れる前に、3箇所の決め打ちを解く必要がある。

1. **`totalTargets = mission.sequence.length * 3 + groundUnits.length`**
   → ウェーブ種別ごとの体数表を引くよう変更。
   例: `WAVE_SIZES = { air1: 3, air2: 3, air2plain: 3, naval: 3, bomber1: 6 }`、
   navalは `mission.fleet.length` を優先。
2. **`spawnNavalWave()`** が3隻の座標・種別を直書き
   → `mission.fleet = ["carrier","aegis","aegis","frigate","frigate"]` を読み、
   隻数に応じて左右へ配置を展開する。
3. **`spawnEnemy()` の `id = (wave-1)*3 + slot + 1`**
   → 3体前提。**ミッション定義の `groundUnits` が id 21以降を使っている**ため、
   1ウェーブ6体などにすると将来的に衝突する。ウェーブ開始時の連番払い出しへ変更する。

これは爆撃機ウェーブ（6体）でも同じ修正が要る。**§5のバッチ2で先に済ませておけば、
バッチ3のフリゲートはデータ追加だけで済む。**

---

## 5. 実装バッチ順（推奨）

依頼の叩き台は「1=自機2機 → 2=爆撃機+迎撃 → 3=フリゲート → 4=戦車コンボイ」。
調査と実測を踏まえ、**自機2機を分割し、A-10CをM6の後ろへ動かす**ことを推奨する。

| バッチ | 内容 | 新機構 | 理由 |
|---|---|---|---|
| **1** | **F/A-18F** | なし | 既存バーへの影響が**実測ゼロ**。データ追加とモデル1分岐のみ。最小リスクで機体選択に幅が出る |
| **2** | **BOMBER + 迎撃ミッション**<br>+ ウェーブ体数の配線解除 | `rearGun` / ウェーブ体数表 | 敵専用機の抜け道（§2-2）で**新AI不要**。ここで§4-6の配線を直しておくと以降が楽 |
| **3** | **FRIGATE + m03増強** | なし（配線はバッチ2で済） | 既存の艦システムをほぼ流用。データ追加中心 |
| **4** | **A-10C**（★M6出荷後） | `gunGroundBonus` | §5-1 参照 |
| **5** | **TANK / AD TANK + 車列** | 地上ユニットの移動系 | 最大の新規実装。単独で1バッチ使う価値がある |

### 5-1. なぜA-10CをM6の後ろへ動かすのか

A-10Cの存在意義は**対地火力**だが、M6が未出荷の現在:
- `AIR-TO-GROUND` バーが**無い**（SPECバーは5本）→ ハンガーで強みが1つも表示されない
- `UGB`/`4AGM` が**無い** → 対地兵装を1つも持てない
- 残るのは「最遅・最低機動・弾数最少」＝**画面上ではただの弱い機体**

つまりM6前にA-10Cを出すと、**5本のバーのうち4本が最下位に近く、DEFENSEだけが100%**という
「使う理由が無い機体」になる。さらにF-22のDEFENSEを77%へ引き下げる副作用（§1-5）まで払う。
**対価に見合わない。**

**どうしても1バッチで2機出す場合**は、`gunGroundBonus`（§1-4）を必ず同時に入れること。
GAU-8の対地60.8ダメージだけがM6前のA-10Cに与えられる唯一の存在意義になる。

### 5-2. バッチ共通の検証項目
- SPECバー6機分のスクショ（§1-5の実測値と一致するか）
- §1-6の2条件（`brakeSpeed - 52 >= stallEntrySpeed`、`stallEntrySpeed > 62`）の検算
- 新機体でのフルブレーキ＋フルピッチ旋回で深失速しないこと
- 爆撃機: 後方1.5km相当で被弾すること／前方・側方からは撃たれないこと
- フリゲート: 2発で沈むこと、SAM間隔がイージスの約1.7倍であること
- 車列: 走行中に地形へ埋没/浮遊しないこと、**毎フレームのレイキャストがゼロ**であること
- 全ミッションのfps（60割れは即削る）、エラー0、既存7ミッションのリグレッション

---

## 6. 出典

**F/A-18F（AC7・SP.W・コスト）**
- https://acecombat.fandom.com/wiki/F/A-18F_Super_Hornet — Multirole、285,000 MRP、F-14D前提、QAAM×10/LASM×16/EML×22
- https://www.nexusmods.com/acecombat7skiesunknown/mods/2907?tab=description — 既定ロードアウトの裏付け
- https://store.playstation.com/en-us/product/UP0700-CUSA05636_00-ACE7GEAIRCRAFT14 — Block III DLC（LACM/8AGM/4AAM）＝基本機とは別枠であることの確認

**A-10C（AC7・SP.W）**
- https://acecombat.fandom.com/wiki/A-10C_Thunderbolt_II — Attacker、UGB×40/RKT×40/4AGM×44、機銃4,800発
- https://acecombat.wiki.gg/wiki/A-10C_Thunderbolt_II — 同上（※wiki.ggはfandomのフォークのため独立ソースではない）
- https://acecombat.wiki.gg/wiki/Ace_Combat_7:_Skies_Unknown/Aircraft — AC7機体一覧・カテゴリ

**実機スペック（形状差別化）**
- https://en.wikipedia.org/wiki/Fairchild_Republic_A-10_Thunderbolt_II — 直線翼、双発ポッド、GAU-8 30×173mm/3,900rpm/左オフセット、チタン装甲540kg
- https://www.navair.navy.mil/product/FA-18EF-Super-Hornet — F/A-18E/F 公式
- https://en.wikipedia.org/wiki/Leading-edge_extension — LERX、Super Hornetで拡大、高AoAベント
- https://aerospaceweb.org/question/planes/q0157.shtml — 外傾双垂直尾翼の目的

**爆撃機**
- https://acecombat.wiki.gg/wiki/B-52H_Stratofortress — 全9作登場、AC7ではCape Rainyで地上駐機、「AC6では尾部砲」
- https://acecombat.fandom.com/wiki/Tu-95_Bear — ★尾部機銃で後方接近機を撃つ
- https://steamcommunity.com/sharedfiles/filedetails/?id=2255699949 — ★「爆撃機に機銃タレット／1.5km以内でほぼ確実に被弾」、Tu-95=特殊1発/Tu-160=2発
- https://steamcommunity.com/app/502500/discussions/0/1846946102866580737/ — Tu-95は通常1〜2発、Tu-160は3発、到達前迎撃の定石
- https://acecombat.wiki.gg/wiki/444 — AC7 M05：Tu-95×11+Tu-160×3、護衛、基地破壊で失敗、8分
- https://acecombat.wiki.gg/wiki/Charge_Assault — AC7 M01：5ウェーブ構成
- https://www.imfdb.org/wiki/Ace_Combat_7:_Skies_Unknown — Tu-95MSのAM-23、※モデル化された砲の多くは非機能という但し書き

**B-52尾部銃座の史実（Wikiの誤記訂正）**
- https://theaviationgeekclub.com/friendly-fire-incident-caused-deactivation-buff-tail-gun/ — 湾岸戦争の誤射で尾部砲停止
- https://www.twz.com/10237/the-u-s-air-forces-last-tail-gunner-has-retired — 1991年9月16日に尾部銃手職を廃止
- https://www.wearethemighty.com/intel/why-the-b-52-bomber-no-longer-activates-its-tail-guns/ — M61バルカン20mm・4,000発/分・1,242発

**地上ユニット**
- https://acecombat.wiki.gg/wiki/Air_defense_tank — AD Tank＝CIWS+SAM+戦車の耐久、2K22ツングースカ、2発
- https://acecombat.fandom.com/wiki/Tank — 「一部の作品では接近すると撃つ」（AC7名指しではない）
- https://www.skywardfm.com/post/hardpoint-suppression-of-enemy-air-defenses-in-ace-combat — ★対空指定ユニットはAA/SAM/XSAM・VLS/CIWS/AD Tank/敵機。**MBT・APCは含まれない**
- https://acecombat.wiki.gg/wiki/Bunker_Buster — M13ユニット表（AAGUN×24, SAM×5, TANK×2, AD TANK×3, APC×2, TRUCK×2）
- https://www.gamepressure.com/ace-combat-7/attacking-ground-targets/zabccb — 地上目標は逃げない前提、SAM/AAAへの注意

**車列**
- https://acecombat.wiki.gg/wiki/Long_Day — ★AC7 M06：15分・**スコアアタック**・逃走トラック車列・渓谷内SAM密集
- https://gamefaqs.gamespot.com/ps4/184015-ace-combat-7-skies-unknown/faqs/76903/mission-6 — 逃走トラック4両、その先に第2車列
- https://acecombat.wiki.gg/wiki/Pipeline_Destruction_(AC7) — M08：タンクローリー20両を10分
- https://acecombat.wiki.gg/wiki/Weapons_of_Mass_Destruction — AC6：渓谷低空侵入、離脱前に車列撃破必須
- https://acecombat.wiki.gg/wiki/Two-pronged_Strategy — ★AC7 M03は**空中戦のみ**（車列ミッションではない＝依頼時の推測の否定）

**艦船**
- https://acecombat.wiki.gg/wiki/Fleet_Destruction — ★M11ユニット表：FRIGATE 200 / DESTROYER 300 / CRUISER 400 / AEGIS 700 / CARRIER 1,000、サブパーツ（SAM/CIWS/SHIP GUN/VLS）
- https://acecombat.wiki.gg/wiki/Aegis — ★「Aegisと他艦の主たる違いはSAMランチャー2基」、モデル元4クラス（ゴルシコフ級フリゲート含む）
- https://acecombat.wiki.gg/wiki/CIWS — CIWSはミサイルを迎撃しプレイヤーにもダメージ、「対空機銃と同程度」、M11/SP02/M15
- https://acecombat.wiki.gg/wiki/Gunboat — 砲艦は低空飛行に発砲（Shaldag級）
- https://en.wikipedia.org/wiki/Oliver_Hazard_Perry-class_frigate — ★全長136-138m、**単腕Mk 13 SAM 1基 + ファランクスCIWS 1基**
- https://en.wikipedia.org/wiki/Admiral_Gorshkov-class_frigate — 135m / 16m
- https://en.wikipedia.org/wiki/Arleigh_Burke-class_destroyer — 154-155.3m
- https://en.wikipedia.org/wiki/Nimitz-class_aircraft_carrier — 332.8m

**注記**: `acecombat.wiki.gg` は `acecombat.fandom.com` のフォークで本文を共有するため、
両者の一致は独立した2ソースにはならない。本書で「2系統で確認」としたものは全て
**Wiki系 + プレイヤー攻略系（Steam / GameFAQs / gamepressure / skywardfm / IMFDB）**の組み合わせである。
