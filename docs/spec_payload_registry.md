# SPEC ペイロード登録方式 — 単一ファイルのまま並列実装を衝突ゼロにする (2026-07-26)

## 0. なぜ作るか

`index.html` 1ファイル（925KB / スクリプトブロック約83万文字 / 約16,600行）に全てが入っており、
実装を並列化すると**必ず同じファイルの同じ領域**（登録テーブル）を複数班が触る。

2026-07-26 の実績: 手動マージ7件のうち衝突が 1 / 2 / 43件。さらに**切り落とし事故が3回**。
隣接挿入の衝突hunkは末尾の閉じ括弧を共有しているため、素直にunionすると直前のエントリが黙って消える
（実害: 敵機のミサイルプロファイルから `damage` / `life` / `launchDot` が消失）。
**構文エラーにならないので目視では検出できない。**

`CLAUDE.md` の規約「単一資源への並列書き込みは禁止」「合流点ファイルは並列エージェントに書かせず、
メインループが報告を集めて最後に1回だけ書く」に適合させる必要もある。

## 1. 結論（architect/Fable の推奨、WEB裏取り済み）

**エージェントは `index.html` に一切触らない。** 成果物は新規ファイル
`payloads/<topic>.payload.js` 1個（`export default function register(ctx) { ... }`）。
メインループがアンカーマーカー間へ機械的にスプライスして `index.html` に1回だけ書く。

- 各班の成果物が毎回「新規ファイル1個」になるので、**git上で同一ファイルを触る班が存在しなくなる**
  ＝衝突が構造的にゼロ
- アンカーコメントへの機械挿入は [Hygen の inject（`after:` アンカー + `skip_if` 二重挿入ガード）]
  (https://unpkg.com/browse/hygen@6.1.0/README.md) として確立された手法
- **ビルド工程（Vite化）は今は導入しない。** 教科書解は
  [import.meta.glob で登録テーブル自動生成](https://vite.dev/guide/features) +
  [vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile) だが、
  83万文字のクロージャ共有スクリプトをESモジュールへ解体する移行は数日規模・高リスクで、
  「single-file がソースの正本」というChatGPT協業契約も壊れる。
  payload方式は支配的な変更クラス（登録テーブル追加）に限れば同じ衝突ゼロ性を約1日で得られ、
  payload は ctx を受けるESモジュールなので**将来Vite化する場合もほぼ無変更で転用できる**
- **union マージドライバは採用しない**。
  [git公式が「追加行の順序がランダムになり得る。含意を理解せずに使うな」と明記]
  (https://git-scm.com/docs/gitattributes)しており、行ベース故に閉じ括弧共有hunkの切り落としも防げない

## 2. 実測済みのアンカー情報（**2026-07-27 `378814a` で再測定**）

> **行番号は実装のたびにズレる。** 下表は 378814a 時点の実測値であり、着手時は必ず
> シンボル名（`const MISSIONS` / `let currentMissionIndex` 等）で再検索して位置を取り直すこと。
> 行番号を信用して機械挿入してはいけない。

> **★実装時の訂正（2026-07-27）**: 外す `Object.freeze` は各テーブルの**外側1個だけ**でよい。
> エントリ毎の内側 `Object.freeze({...})` はそのまま残す（payload は新しいトップレベルキーを
> 足すだけで既存エントリを書き換えないため干渉しない）。内側まで外すと差分が数百行に膨らむ。
> 実際の Phase 0 の freeze 剥がしは **11テーブル22行**で済んだ。

### 登録テーブルの位置（12個すべて `Object.freeze` 済みを実測確認）
| テーブル | 行 | 備考 |
|---|---|---|
| `ENEMY_ROLES` | 2507 | 役割倍率 |
| `SKILL_TIERS` | 2551 | AIの賢さ |
| `ACE_PROFILES` | 2623 | ネームド機の塗装 |
| `AIRCRAFT_ORDER` | 2856 | ★**手書きリテラル。派生ではない**（後述の訂正参照） |
| `AIRCRAFT_TYPES` | 3073 | 機体性能表（自機・敵で共有） |
| `ENEMY_AI_PROFILES` | 4012 | 敵AI。**`ENEMY_TYPES` (5149) がここから派生** |
| `ENEMY_MISSILE_PROFILES` | 5188 | 無い機種＝機銃のみ |
| `SHIP_TYPES` | 5649 | subsystems を持つ |
| `GROUND_TYPES` | 5856 | |
| `WORLD_PRESETS` | 6177 | マップ定義（8プリセット） |
| `MISSIONS` | 7182〜**8975** | 20ミッション |

### ★訂正: `AIRCRAFT_ORDER` は派生ではない（旧版の記述は誤り）
実体は 14個のIDを並べた**手書き配列リテラル**で、`AIRCRAFT_TYPES` から生成していない。
かつ `AIRCRAFT_TYPES`(3073) より**前**(2856)に置かれている。
→ **`finalizeRegistries()` で作り直す必要があるのは `ENEMY_TYPES` だけ。**
機体を payload で足す場合は `AIRCRAFT_ORDER` へ**明示的に push** する
（ハンガーの表示順は作者が決める意図的な並びなので、自動生成に変えないこと）。

### ★ MISSIONS は「素の配列リテラル」ではない
`const MISSIONS = Object.freeze([...authored...].map((mission) => { ...正規化... return Object.freeze({...}) }))`
という**正規化mapを通している**（`totalTargets` / `waveCount` / `totalContacts` の算出、
`battleCenter`/`floodlights`/`introRadio`/`map` の凍結など）。

→ **`ctx.addMission(def)` は同じ正規化を通さなければならない。**
実装時は正規化関数を `normalizeMission(mission)` として抽出し、既存の `.map()` と `addMission` の
両方から呼ぶこと。**ここを手抜きすると payload 経由のミッションだけ `totalTargets` が undefined になり、
ACCOMPLISHED 判定が壊れる。**

### ★ テーブルを参照するトップレベル派生state（payloadブロックの位置を決める制約）
| 行 | 内容 | 影響 |
|---|---|---|
| 5149 | `ENEMY_TYPES`（`ENEMY_AI_PROFILES`×`AIRCRAFT_TYPES` から派生） | 敵種を足すなら**再構築が要る** |
| 8995 | `ACT_OPENER_KEYS`（MISSIONSから派生） | **旧版の見落とし。アンカーより前に確定するので再構築が要る** |
| **9039** | `campaignMissionIndices`（MISSIONSから派生） | ★訂正: 再構築**不要**（下記） |
| **9943** | `window.__game.missionTable`（MISSIONSをmapで固める） | ★訂正: 再構築**不要**（下記） |

#### ★訂正（2026-07-27 実装時に実測）
- **`ACT_OPENER_KEYS`(8995) が旧版の表に抜けていた。** MISSIONS由来の `const` で、アンカー
  (`let currentMissionIndex`) より**前**に確定する。payloadで `act`/`storyNo` 付きミッションを
  足すとACTバナーが古いままになるため、`buildActOpenerKeys()` を抽出して `let` 化し、
  `finalizeRegistries()` から呼び直す。
- **`campaignMissionIndices` と `window.__game.missionTable` は再構築してはいけない。**
  どちらも**アンカーより後**（9039 / 9943）で初期化されるので、payload適用後のMISSIONSを
  最初から見る。むしろ `finalizeRegistries()` から `rebuildCampaignMissionIndices()` を
  呼ぶと `let campaignMissionIndices` が**TDZ**で `ReferenceError` になる。

**payloadブロックの設置位置＝ MISSIONS文の閉じ（8975行 `}));`）の直後、
`let currentMissionIndex`（9011行）より前。** 途中に `ACTS` / `missionActBanner()` の定義があるので、
**アンカーは `let currentMissionIndex` の直前**に置くのが確実（この1点だけが、
12テーブル全てが定義済みかつ MISSIONS 由来の派生stateが未構築という条件を満たす）。
`ENEMY_TYPES` はこの位置より前で確定するので `finalizeRegistries()` の中で作り直すこと。

## 3. 実装手順

### Phase 0 — `index.html` への一度きりの改修（メインループが実施。並列班には絶対に触らせない）
1. 12テーブルの定義から `Object.freeze` を外し、代わりに `finalizeRegistries()` で deep freeze する。
   **12個すべてfreezeされているのを実測確認済み。これをやらないと payload の追加が例外になる**
2. `let currentMissionIndex` の直前に合流点ブロックを設置:
   ```js
   // ==== @PAYLOADS:BEGIN ====
   // ==== @PAYLOADS:END ====
   finalizeRegistries();
   ```
3. `applyPayload(fn)` と `ctx` を実装（~60行）。ctx が持つもの:
   - `addMission(def, { after: "m13" })` — 挿入位置は after 指定（MISSIONSの並び＝キャンペーン順のため）
   - `addWorldPreset(key, def)` / `addAircraft(id, def)` / `addEnemyProfile(id, def)` /
     `addShipType` / `addGroundType` / `addAceProfile` / `addEnemyMissileProfile`
   - **登録時に必須キーのスキーマ検査と重複key検査を行う**（`damage`/`life`/`launchDot` 欠落クラスを
     ロード時に即死させる＝切り落とし事故の再発防止）
4. `finalizeRegistries()`: `ENEMY_TYPES` を作り直し、`rebuildCampaignMissionIndices()` を呼び、
   `window.__game.missionTable` を作り直してから全テーブルを deep freeze
   （`AIRCRAFT_ORDER` は手書きリテラルなので再構築不要＝上の訂正参照）
5. devローダー（~30行）: `?payloads=a.js,b.js` があれば finalize 前に各URLを動的 `import` して
   `mod.default(ctx)` を実行。あわせて `window.__REGISTRY_SNAPSHOT__`
   （各テーブルの key一覧 + エントリ毎のキーパス集合）を返す devフックを追加

### Phase 1 — ツール2本（`tools/`）
6. **`tools/inline_payload.mjs`（~100行）**: payload の関数ソースを**テキストのまま**抽出し、
   `applyPayload(function register(ctx){...}); // @payload:<name>` として `@PAYLOADS:END` の直前に挿入。
   同名マーカーが既存なら拒否（Hygen の `skip_if` 相当）。
   **テキスト挿入なので、ミッション定義に書かれた長文の設計コメントがそのまま保存される**。
   挿入後にスクリプトブロックを構文パース
7. **`tools/registry_gate.mjs`（~80行）**: Playwright headless で index.html をロードして
   `__REGISTRY_SNAPSHOT__` を取得し、コミット済み `tools/registry_snapshot.json` と差分比較。
   **ルール＝「追加のみ許可。既存 id / 既存キーパスの消失は無条件FAIL」**。
   意図的な削除だけ `--update` で正本を更新。
   切り落としは「キーの消失」なので、値ではなくキー構造のスナップショット差分が最小かつ十分。
   **git経由でないパッチ（ChatGPT成果物・手編集）にも効く**のが利点。
   これでエントリ数の手作業突き合わせは廃止

### Phase 2 — 運用切替
8. エージェント指示テンプレを変更:
   > 所有（書いてよい）: `payloads/<topic>.payload.js`
   > 参照（読むだけ）: `index.html`, `docs/`
   > 禁止（触るな）: `index.html` への書き込み
   >
   > 検証は `index.html?payloads=payloads/<topic>.payload.js` を開いて Playwright で実プレイ
9. **ChatGPT への依頼も同じ payload 契約にする**（衝突43件クラスの3-wayマージが消滅する）
10. マージ後は payload ファイルを削除（正本は `index.html`、履歴はgitに残る）

## 4. 適用範囲と限界

- **エンジン本体を触るタスクは payload に乗らない**（新メカニクス・HUD改修・飛行モデル等）。
  これは別クラスとして**直列化**するか、担当領域の排他で回す
- 今後の主戦場（ミッション追加・機体追加・地上ユニット追加＝ロシア陣営編20本を含む）は
  登録テーブル支配なので大半はカバーされる
- 既存20ミッションの作り直しは**不要**。インラインのまま置き、payload化するのは今後の追加分だけ

## 5. 移行コスト

Phase 0+1 で Opus 1セッション（実装 + registry_gate の初回スナップショット生成 +
既存20ミッションでのゲート緑確認）。既存資産の書き直しゼロ。

**着手タイミング: 米国編20本の合流・順序確定が完了した `378814a` 以降＝いま。**
ロシア陣営編20本の実装より前に必ず入れる。

## 6. 検収ゲート（Phase 0+1 完了の判定条件）

1. `node --check` 相当の構文パースが通る（`<script type="module">` を抽出して検査）
2. **既存20ミッションの挙動が不変**: 全20本が正しいキーで起動し pageerror 0、
   各ミッションの `totalTargets` / `totalContacts` が変更前と**完全一致**
   （変更前の値は本specの末尾表を参照）
3. **ダミーpayloadのE2E**: ミッション1本を足す payload を書き、
   `index.html?payloads=...` で読み込み→ `normalizeMission` を通って `totalTargets` が
   数値になり、実際に出撃して ACCOMPLISHED 判定が成立することを確認してから、ダミーを除去
4. `registry_gate.mjs` が既存スナップショットに対して緑

## 7. `ctx.addWorldDecorator` — 既存マップへの人工物追加（2026-07-28 追加）

### 7.1 なぜ別APIなのか

`ctx.addWorldPreset(key, def)` は**マップを丸ごと1枚新規追加する**口しかない。
「いまある `desertBasin` の上に道路・滑走路・橋・建物群・港湾クレーンを置いて密度を出す」は
新規プリセットではないので、この口では到達できない。

かつ `createWorld()` は資源追跡関数 `keepGeometry` / `keepMaterial` / `keepTexture` / `addRoot` を
**すべて関数内のローカル変数**として持っており、外からは届かない。
ペイロードが勝手に `scene.add()` すると `disposeWorld()` の解放対象
（`world.roots / geometries / materials / textures`）に入らないので、
**マップ切替のたびに丸ごとリークする。しかも無言で。**

→ **既存ワールドの生成後に処理を差し込む2本目の入口**が `addWorldDecorator`。

### 7.2 使い方

```js
ctx.addWorldDecorator("map-density", {
  worlds: ["desertBasin", "nightCity", "coastalPlain", "glacierCanyon"],
  build(env) {
    // ここで InstancedMesh / 結合BufferGeometry を組む
  }
});
```

| フィールド | 必須 | 内容 |
|---|---|---|
| 第1引数 `id` | ✔ | デコレータID。空文字不可・重複不可 |
| `worlds` | ✔ | 適用先プリセットキーの配列。空配列不可。**存在しないキーは登録時に即例外** |
| `build(env)` | ✔ | 関数であること。対象ワールドの生成直後に呼ばれる |

`build` は**登録順**に、`worlds` に自分が入っているワールドが作られるたびに呼ばれる。

### 7.3 `env` の中身（これが全部。`scene` と資源配列そのものは渡らない）

```js
{
  THREE,            // Three.js 名前空間
  worldKey,         // 生成中のワールドのキー（"desertBasin" 等）
  preset,           // そのワールドの WORLD_PRESETS 定義（読み取り用）
  addRoot,          // (node) => node   scene へ追加し world.roots にも登録
  keepGeometry,     // (geo) => geo     world.geometries へ登録
  keepMaterial,     // (mat) => mat     world.materials へ登録
  keepTexture,      // (tex, label = "decorator", bytes = 0) => tex
  surfaceHeightAt   // (x, z) => 地表高さ
}
```

`keepTexture` の `label` / `bytes` は `debug.worldTextureReport()` の内訳に出る。
省略してもよいが、その場合はテクスチャ使用量の集計に載らない。

### 7.4 破棄の契約 — デコレータ側に `dispose()` は無い

**作った資源を必ず上の4つのヘルパへ通すこと。** それだけでよい。

通した資源はワールドレコードの所有物になり、マップ切替時に既存の `disposeWorld()` が
そのまま回収する。**デコレータ独自の破棄処理は存在しないし、書いてはいけない。**
これは「個別ペイロードが破棄を書き忘れる」失敗を構造的に起こせなくするための設計。

ヘルパを通さずに作ったもの（直接 `scene.add()` した / `keepGeometry` に渡し忘れた
`BufferGeometry`）は**誰にも解放されない**。ここだけが唯一のリーク経路。

### 7.5 呼び出しタイミング — 順序が本質

```js
disposeWorld(world);
world = createWorld(key);
applyWorldDecorators(world);   // ← 必ず world への代入の「後」
```

**`createWorld` の内部からは呼べない。** `surfaceHeightAt()` はモジュールスコープの
グローバル `world` を読むので、`createWorld` 実行中はまだ**旧マップ**を指している。
そこで呼ぶと地表高さを旧マップから読み、人工物が宙に浮くか地面に埋まる。
（`createWorld` 内の nightCity のブロックが、まさに同じ理由で
`surfaceTopAt()` を使わずローカルの `mountains` を引いている。）

ワールドを作る経路は2つで、**両方**この順序になっている:
- `applyWorldPreset(presetKey)` — ミッション開始時・`debug.forceWorld()` 時のマップ切替
- 初期化時の `let world = createWorld(DEFAULT_WORLD_PRESET);` の直後
  （`world` は `let` なので、初期化式の中から呼ぶと TDZ に当たる。必ず次の行）

### 7.6 禁止事項

- **`world.mountains` を変更する入口は公開していない。** このリストが地形の当たり判定そのもので、
  `surfaceHeightAt` / `surfaceTopAt` がレイキャストする対象。地上ユニットの接地・ヘリ高度・
  爆弾の着弾判定が全部ここを読む。
  → **人工物は視覚装飾専用。** これらの契約は動かせない＝動かない
- したがって「置いた建物の上に地上ユニットを立たせる」「橋の上を走らせる」は**このAPIではできない**。
  必要なら地形側（`WORLD_PRESETS` の `mountains`）の話になる
- `scene` は渡らない。`addRoot` を使うこと
- `build` 内の例外は握り潰されず `console.error` に出るが、**ページは落とさない**
  （1本の失敗でマップごと失うほうが損害が大きいため）。部分的に作られた資源も
  追跡済みなので次の切替で解放される

### 7.7 検査（登録時に即例外＝ロード時に落ちる）

- `id` が空文字/非文字列
- `id` の重複
- `def` がオブジェクトでない
- `build` が関数でない
- `worlds` が配列でない/空配列
- `worlds` に存在しないプリセットキーが含まれる

`WORLD_DECORATORS` は `finalizeRegistries()` で freeze されるので、以降の登録は不可能。

### 7.8 ゲート

`registrySnapshot()` は `WORLD_DECORATORS` を
`{ "<id>": ["world:<key>", ...] }` の形で出す（テーブル数は13→14）。
`tools/registry_gate.mjs` の「消失は無条件FAIL」ルールがそのまま効くので、
**デコレータが消える/適用先ワールドが1つ減る**とゲートが落ちる。

### 7.9 デバッグフック

```js
window.__game.debug.worldDecorators()
// => { registered: [{id, worlds}], activeOn, applies: [id],
//      roots, geometries, materials, textures }
```
`roots`/`geometries` 等は**ワールド全体の合計**（デコレータの取り分ではない）。
用途はリーク検査＝マップを往復させて、デコレータ無しの数値に戻ることの確認。

### 変更前の基準値（378814a 実測・上の条件2で使う）
| # | key | TGT | contacts | # | key | TGT | contacts |
|---|---|---|---|---|---|---|---|
| 1 | m01 | 2 | 5 | 11 | m-desert | 12 | 31 |
| 2 | m02 | 4 | 11 | 12 | m-swarm | 6 | 15 |
| 3 | m-heli | 5 | 14 | 13 | m-escort | 6 | 17 |
| 4 | m03 | 5 | 13 | 14 | m-landing | 5 | 15 |
| 5 | m-boats | 6 | 15 | 15 | m-city | 6 | 17 |
| 6 | m-glacier | 6 | 16 | 16 | m-carrier | 6 | 17 |
| 7 | m-storm | 4 | 11 | 17 | m-intercept | 6 | 18 |
| 8 | m-night | 11 | 21 | 18 | m-squadron | 4 | 11 |
| 9 | m-convoy | 8 | 16 | 19 | m04 | 1 | 7 |
| 10 | m-train | 6 | 17 | 20 | m05 | 10 | 29 |
