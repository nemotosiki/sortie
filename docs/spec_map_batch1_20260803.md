# SPEC マップ制作バッチ1 — 1枚ずつ丁寧に (2026-08-03, Fable設計)

ユーザー指示(8/3朝): 「マップの作成を依頼できますか？1つ1つ丁寧に。」
モデルバッチ3の**総力戦・並列**とは正反対の作り方をする。**1マップ = 1エージェント = 1コミット**、
**同時に走らせるのは常に1枚だけ**。前の1枚が検収を通るまで次に進まない。

正本の上流: `docs/story_reboot/02_maps_units_style.md`（ChatGPT作、17マップ構成・制作優先順位・
人工物密度規格・再訪差分の最低要件）。本書はそれを**現行実装に接続する**ための実装仕様。

---

## 0. 前提（調査で確定した事実。ここを間違えると全部やり直しになる）

### 0-1. マップはペイロードで足せる（index.htmlを触らない）

`ctx.addWorldPreset(key, def)` と `ctx.addWorldDecorator(id, {worlds, build})` が
**実装済みかつ未使用**（現在ペイロード製プリセットは0件）。したがって:

- **新マップ1枚 = `payloads/map_<key>.payload.js` 1ファイル**で完結する
- index.html への書き込みは**Step 0のプレビュー機構だけ**。以降のマップ制作では一切触らない
- → 並走セッション（index.htmlを常時編集中）と**構造的に衝突しない**

`addWorldDecorator` には意図的に `scene` も破棄フックも渡されていない。`env` の
`keep*/addRoot` 経由でしか物を作れないので、**装飾はリークしようがない**（`disposeWorld` が
無改修で回収する）。この設計を破る書き方（scene直add、独自dispose）は禁止。

### 0-2. 地形の作り方（heightfieldは未実装）

`docs/design_terrain_heightfield_20260728.md` の格子地形は**設計のみで未実装**。
現行で「陸」を作る手段は次の3つしかない:

| 手段 | 実体 | 既存の使用例 |
|---|---|---|
| `mountains.plateau` | 平頂の巨大コーン1個。これが**陸地そのもの** | coastalPlain(r1500/h34)、nightCity(r1900/h24)、desertBasin |
| `mountains.corridor` | 壁を2列に並べて谷を作る | glacierCanyon（唯一の峡谷） |
| `mountains.count/radius/height/distance` | 背景の山リング | 全マップ |

**`surfaceHeightAt` はこの `world.mountains` をレイキャストする**＝地上ユニットの設置と
ヘリの高度維持がこれに依存する。**装飾（decor / decorator）は `mountains` に入らない＝当たり判定なし**。
したがって:

- **地上目標を置きたい場所は必ず plateau の天面に来るよう設計する**
- 建物・クレーン・煙突・橋は装飾なので、**そこに地上ユニットを置いても意味がない**（すり抜ける）
- plateau は円形。四角い港も長い谷も、**円の上に装飾で描く**のが現行の限界。これを前提に構図を作る

### 0-3. 既存8プリセットが持つ武器

`archipelagoDay / sunsetOcean / glacierCanyon / nightBase / nightCity / coastalPlain /
desertBasin / stormOcean`。プリセットのデータだけで出せるもの:

sky(5段グラデ) / atmosphere / fog / sun+glare / moon / stars / sunRoad / ocean(色・法線・波3層) /
terrain(砂・草・岩・峰・雪・スロープ閾値) / lights(hemi/key/fill) / mountains(+corridor +plateau) /
islands / clouds / decor{ keepClear, extraIslands, shore, trees, rocks, floes, city, cityLights,
extraClouds } / sceneryOrigin

**`decor.city` が特に強い**: 街区格子(cell/street)・同心円ディストリクト(高さ・充填率)・
InstancedMeshの建物群1ドローコール・窓のエミッシブ・street points・障害灯。
**港/工業帯/市街はこれを土台に、足りない固有物を decorator で足す**のが最短かつ最軽量。

### 0-4. 足りないもの＝decoratorで作るもの

ChatGPT §7.2「人工物密度」表が要求していて**現行に無い**もの:

滑走路 / 管制塔 / 病院 / 民間ターミナル / コンテナヤード / ガントリークレーン / 運河 / 倉庫 /
橋 / 峠道 / トンネル / 河川 / 鉄道網 / 工場 / 煙突 / 貨物駅 / 変電所 / 送電線 / 高速道路 /
農地格子 / パイプライン / 石油施設 / 高架橋

これらは**decorator の build(env) で手組みする**。1マップにつき1 decorator（`<key>Works`）に
まとめてよい。

### 0-5. decorator の `env` 契約（実測。既存例はゼロなので、これが唯一の資料）

`applyWorldDecorators`（index.html 53410行）が `build(env)` に渡すのは**この8つだけ**:

```
{ THREE, worldKey, preset, addRoot, keepGeometry, keepMaterial, keepTexture, surfaceHeightAt }
```

- `addRoot(node)` = `scene.add` ＋ world記録への登録。**これ以外にsceneへ物を足す手段は無い**
- `keepGeometry / keepMaterial / keepTexture` を通したものは `disposeWorld` が自動回収する。
  **独自の dispose を書くな**（書けないのが正しい設計）
- `surfaceHeightAt(x, z)` はこの時点で安全（`world` 代入済み）。plateau天面のY座標はこれで取る
- 呼ばれる順序は `disposeWorld → world = createWorld → applyWorldDecorators`。
  createWorld の内側からは呼ばれない（`surfaceHeightAt` が古い world を見てしまうため）
- 呼び出し箇所は 35233行（起動時）と `applyWorldPreset` 内（マップ切替時）の2つ。
  つまり `?worldPreview=` でも装飾は出る

### 0-6. 実装で踏んだ罠（1枚作るごとに追記する）

**マップ1（サルク港）で判明:**

1. **`decor.city.at` は `mountains.plateau.at` と1m以内で一致必須**。ズレると街が y=0（海面）へ沈む
2. **山の乱数は全プリセット共有の固定シード `0x50a71e`**。したがって `mountains.count` を変えると
   **plateauの平頂形状まで変わる**（同じ乱数列を消費するため）。plateau上に物を置く設計をしてから
   `count` を触るな。触ったら実測し直し
3. **昼光は中間アルベドを約1.8倍に持ち上げる**。地面・建物の色は**狙いより暗く書く**こと。
   nightCity の値をそのまま昼に持ってくると白飛びする
4. **プレビューでは天球を手でピン留めする必要があった**（`world.skyGroup.position.copy(camera.position)`）。
   実戦では `updateCamera`/`snapCamera` が留めており `updateWorld` は留めない。Step 0で対処済み
5. **水と屋根は同じ「平たい長方形」になりやすい**。運河・水面は海の色に寄せて値を下げ、
   縁石を全周に回す。屋根は逆に値を上げる。これをやらないと4面図で判別できない

---

## 1. スコープ境界

**やる**: プリセット1枚（気候・地形・海・空）＋その土地の人工物（decorator）。
**やらない**:

- ミッションの追加・既存ミッションのマップ差し替え（キャンペーン設計であって地形制作ではない）
- `AIRCRAFT_TYPES` / 敵編成 / バランス数値
- index.html への書き込み（Step 0 を除く）
- 既存8プリセットの改変（`spec_m9_map_polish.md` の担当。今回は**新規追加のみ**）

新マップは**登録されるだけで誰も使わない**状態で着地する。それが正しい。実戦投入は
ミッション設計の判断であり、朝の相談事項として分離する。

---

## 2. 制作順（ChatGPT §7「新規マップ制作の優先順位」に従う）

1枚ずつ。前の1枚が§4のゲートを全部通ってコミットされるまで、次を起動しない。

| # | 名称 | preset key | 地形の骨格 | 難所 |
|---|---|---|---|---|
| 1 | サルク港 | `sarkPort` | plateau(港湾都市) + 海 | 運河=陸に切れ込む水。plateau円形との折り合い |
| 2 | ホワイトパス | `whitePass` | corridor(峡谷) + plateau(峠) | 飛べる谷幅。glacierCanyonの数値が唯一の実績 |
| 3 | ノル工業帯 | `norIndustrial` | plateau(内陸) | 鉄道網の線形。煙突の煙 |
| 4 | カラン平原 | `karanPlain` | plateau(大平原) | 農地格子を安く出す。単調にしない |
| 5 | レン湾 | `renBay` | plateau(海岸) + 海 | 滑走路2本と民間空港。M01の舞台 |

6枚目以降（ミガル市街/中枢、アラド山地、ハドール深海、オルム盆地、ルメン稜線）は
バッチ1の実績を見てから別書で。

---

## 3. 1枚あたりの成果物規格

### ファイル

`payloads/map_<key>.payload.js` 1本のみ。ES module、`export default function register(ctx)`。
手本は既存ペイロードの流儀（`payloads/aircraft_yf23.payload.js` のヘッダーコメント密度）。

### 中身

```
ctx.addWorldPreset("<key>", { ... })        // 必須。全必須フィールドを持つこと
ctx.addWorldDecorator("<key>Works", {        // 必須。その土地の人工物
  worlds: ["<key>"],
  build(env) { ... }
})
```

- **必須フィールド**は既存8プリセット全部が持つフィールドの積集合（`requiredKeysOf`）。
  登録時に検証され、欠けると**そのペイロードだけ**が弾かれる。既存プリセットの構造を
  そのままなぞれば通る
- **`decor.seed` / `terrain.seed` / `atmosphere.seed` / `ocean.normalSeed` / `clouds.texture.seed`
  は必ずマップ固有の値**にする。他マップと同じ種を使うと同じ島・同じ雲になる
- 数値には**根拠をコメントで書く**（「なぜこの霧距離か」「なぜこのplateau半径か」）。
  既存プリセットのコメント密度が基準

### ヘッダーコメントに必ず書くこと

1. **地理アイデンティティ**: ChatGPT設定の主権・地形・使用ミッション（M番号）
2. **一目で言い当てられる3点**: このマップを他と区別する視覚的特徴3つ
3. **実寸換算**: plateau半径・街区寸法がゲーム内メートルで何kmに当たるか
4. **plateau天面の高さ**: 地上ユニットを置くならどの高さに乗るか

---

## 4. 検証ゲート（全部通らないと次のマップへ進まない）

1. **4面コンタクトシート**: `?worldPreview=<key>`（Step 0で作る）で
   ①高空俯瞰 ②中空進入 ③低空(高度80m) ④地平線 の4カット。ヘッダー行に
   `LABEL · key=… · MOUNTAINS n · DECOR n · PAYLOAD PRESET` が出ること
2. **人工物の読み取り**: ChatGPT §7.2の当該マップ「必須人工物」が**4カットのどれかで
   実際に見えている**こと。見えないものは作っていないのと同じ
3. **registry gate**: `node tools/registry_gate.mjs` が losses ゼロ
4. **fps ≥ 58**: プレビューで実測（`spec_m9_map_polish.md` のゲートを踏襲）
5. **エラー0**: pageerror ゼロ
6. **既存マップ不変**: 新規追加のみなので、既存8プリセットのスナップショットが動かないこと
7. **CRバイト無し**: `fs.readFileSync(...).includes(13) === false`（grep禁止）

### 検証の材料は必ず `git archive HEAD` 由来にする

並走セッションが index.html と src/ を編集中。**作業ツリーをコピーして検証すると
相手の未コミット状態を掴んで誤診する**（8/2晩に6エージェントが揃って誤報告した実害）。
検証用の隔離ディレクトリは `git archive HEAD` で作ること。

---

## 5. Step 0: マップ用プレビュー機構（index.htmlへの唯一の書き込み）

モデルに `?modelPreview=` があるのに、**マップには見る手段が無い**。10枚作るなら先に作る。

### 仕様

`?worldPreview=<presetKey>` で起動 → 通常ブートを止め、そのマップを1枚だけ見せる。

- 既存の `MODEL_PREVIEW_ID`（index.html 35289行）と**同じ流儀**で1回だけ読む
- ゲートは `if (!MODEL_PREVIEW_ID)`（35291行）を `if (!MODEL_PREVIEW_ID && !WORLD_PREVIEW_KEY)` に
- 描画は `renderModelPreview`（35554行）と同じく**ゲーム本体のrendererとscene**を使う。
  モデルと違い、マップは**空・霧・光がマップそのもの**なので、専用の三点照明は作らない
- 世界の切替は既存の `applyWorldPreset(key)`（53215行）をそのまま呼ぶ。
  `world` は 35227行で既に生成済みなので、追加の初期化は要らない
- カメラは4点固定:

  | セル | 位置 | 向き | 目的 |
  |---|---|---|---|
  | OVERVIEW | 高度2400m・水平距離4200m | 地形中心 | 全体構図・島/山の配置 |
  | APPROACH | 高度800m・距離2600m | 地形中心 | 実際の進入高度での見え方 |
  | LOW PASS | 高度80m・距離900m | 地形中心 | 低空での密度・スケール感 |
  | HORIZON | 高度300m・地形中心に立って外を向く | 水平 | 空・霧・海の端 |

  「地形中心」= `mountains.plateau.at` があればそこ、無ければ `sceneryOrigin`、無ければ原点
- 4分割は `renderModelPreview` と同じ scissor+viewport。ラベルも同じDOM流儀
- ヘッダー行: `<LABEL> · key=<key> · MOUNTAINS <n> · DECOR <n>` ＋ ペイロード製なら `PAYLOAD PRESET`
- **未知キーはモデル側と同じ様式でエラー表示**（既知キー一覧を出す）
- 通常ブート・`?modelPreview=` の挙動は**1バイトも変えない**

### 実装上の制約

- index.html の**追記は2箇所だけ**（定数+ゲート条件 / `renderWorldPreview` 関数本体）。
  それ以外の行に触れない。並走セッションの未コミット変更を**絶対にstash・revert・commitしない**
- git操作は読み取りのみ。コミットはメインループが行う

---

## 6. 命名規則

- preset key: 英字camelCase（`sarkPort`）。既存8枚と同じ流儀
- `label`: 全角なしの英大文字（`SARK PORT`）。HUD/デバッグ表示に出る
- decorator id: `<key>Works`
- ファイル: `payloads/map_<key>.payload.js`
- コミット: `マップ<番号>: <和名>(<key>) を追加` ＋ CLAUDE.md規定のモデル/effort行

---

## 7. 各マップの要求定義

ChatGPT §7.2「必須人工物」を**そのまま満たすこと**が合格条件。以下は各マップの造形方針。

### 7-1. サルク港 `sarkPort`（ケデム主権・M03/M05）

必須人工物: コンテナヤード、クレーン、運河、倉庫、市街、橋。

- **骨格**: plateau（r≈1700 / h≈22 / topRadius 0.92）を海に置く。nightCityの構成に近いが**昼**
- **一目で言い当てる3点**: ①岸に並ぶガントリークレーンの列 ②色のついたコンテナの格子
  ③陸に切れ込む運河とそれを跨ぐ橋
- **運河**: plateau天面に水色の細長い板（装飾）を敷いて「水」に見せる。地形は掘れないので
  **岸壁の縁取りと橋で運河だと読ませる**のが正解。掘ろうとしないこと
- **市街**: `decor.city` を使うが、nightCityより**低く広く**（港町であって首都ではない）。
  ディストリクトは2段で十分
- **時刻**: 昼〜午後。M05「PORT OF ASH」の再訪差分は後日、別プリセットで作る（今回は平時の港）

### 7-2. ホワイトパス `whitePass`（ケデム・M06/M23）

必須人工物: 峠道、トンネル、山上SAM、谷底河川、救難地点。

- **骨格**: `corridor`（glacierCanyonの実績値が唯一の設計根拠。主経路12〜18kmは
  現行スケールでは長すぎるので、**まず谷を1本通す**ことを優先し、実測してから伸ばす）
- **一目で言い当てる3点**: ①谷底を蛇行する河川 ②斜面をつづら折りに登る峠道 ③山腹のトンネル坑口
- 岩肌の緑〜灰の針葉樹帯。glacierCanyonの氷ではない
- **SAM陣地は装飾で「陣地に見える平場」を作るだけ**にする（実ユニット配置はミッション設計の領分）

### 7-3. ノル工業帯 `norIndustrial`（エレム・M10/M12/M28/M30）

必須人工物: 鉄道網、工場、住宅区、煙突、貨物駅、変電所。

- **骨格**: 内陸plateau（r≈1800）。海は遠景にしか見えない位置まで押す
- **一目で言い当てる3点**: ①煙を上げる煙突の列 ②直線で伸びる複線の鉄道と貨物駅の側線
  ③工場棟（大屋根）と住宅区（小さい箱）の対比
- 空気は汚す（`atmosphere.haze` 高め、fogは煤けた灰褐色）。M10「LAST TRAIN」の舞台
- 鉄道は**装飾の直線**でよい。装甲列車ミッションの実際の経路とは別物（当たり判定は無い）

### 7-4. カラン平原 `karanPlain`（エレム・M09/M29）

必須人工物: 戦車道、農村、避難車列、高架橋、河川。

- **骨格**: 巨大plateau（r≈2200 / 低い）。coastalPlainの拡張形
- **一目で言い当てる3点**: ①耕作地の格子（色違いの区画） ②平原を横切る河川と高架橋
  ③点在する農村（小集落）
- 単調になるのが最大の敵。**区画の色を変える**（作物ごとに緑〜黄土〜刈り跡）ことで
  平地に情報量を与える。木は防風林として列に置く（面に散らさない）

### 7-5. レン湾 `renBay`（セラ・M01）

必須人工物: 滑走路2、民間ターミナル、病院、管制塔、沿岸道路。

- **骨格**: 海岸plateau。archipelagoDayが既にM01用のplateau(r900/h26 at [120,-19800])を
  持っているが、**それとは別に**「軍民共用空港のある海岸都市」として作る
- **一目で言い当てる3点**: ①平行する2本の滑走路と誘導路 ②管制塔＋ターミナルの建物群
  ③赤十字の屋上マークがある病院
- 朝焼け。ChatGPT §9「ACT1: 朝焼け、海、救難灯」の色。キャンペーン最初の絵になる

---

## 8. 進め方

1. **Step 0**（プレビュー機構）を実装 → コミット。ここだけindex.htmlに触る
2. マップ1（サルク港）を実装 → §4の7ゲート → 私が4カットを目視 → コミット
3. 以降 2 を1枚ずつ繰り返す。**同時に2枚は走らせない**
4. 1枚終わるごとに、ここまでで分かった罠を本書§0へ追記する（次の1枚が楽になる）
