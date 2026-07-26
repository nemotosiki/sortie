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

## 2. 実測済みのアンカー情報（実装者はここを信用してよい・2026-07-26 6528f87 時点）

### 登録テーブルの位置（全て `Object.freeze` されている）
| テーブル | 行 | 備考 |
|---|---|---|
| `ENEMY_ROLES` | 2407 | 役割倍率 |
| `SKILL_TIERS` | 2451 | AIの賢さ |
| `ACE_PROFILES` | 2522 | ネームド機の塗装 |
| `AIRCRAFT_ORDER` | 2635 | **`AIRCRAFT_TYPES` から派生する順序配列**（ハンガー表示順） |
| `AIRCRAFT_TYPES` | 2852 | 機体性能表（自機・敵で共有） |
| `ENEMY_AI_PROFILES` | 3766 | 敵AI。**`ENEMY_TYPES` (4903) がここから派生** |
| `ENEMY_MISSILE_PROFILES` | 4942 | 無い機種＝機銃のみ |
| `SHIP_TYPES` | 5327 | subsystems を持つ |
| `GROUND_TYPES` | 5440 | |
| `WORLD_PRESETS` | 5601 | マップ定義 |
| `MISSIONS` | 6594〜**7579** | |

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
| 2635 | `AIRCRAFT_ORDER`（AIRCRAFT_TYPESから派生） | 機体を足すなら再構築が要る |
| 4903 | `ENEMY_TYPES`（ENEMY_AI_PROFILESから派生） | 敵種を足すなら再構築が要る |
| **7606** | `campaignMissionIndices`（MISSIONSから派生） | 既に `rebuildCampaignMissionIndices()` がある |
| **8445** | `window.__game.missionTable`（MISSIONSをmapで固める） | 再構築が要る |

**payloadブロックの設置位置＝ 7579行（MISSIONS の閉じ）の直後、7581行の `let currentMissionIndex` の前。**
この位置なら全10テーブルが定義済みで、MISSIONS由来の派生stateはまだ作られていない。
`AIRCRAFT_ORDER` と `ENEMY_TYPES` は**この位置より前で確定してしまう**ので、
`finalizeRegistries()` の中で**この2つを作り直す**こと。

## 3. 実装手順

### Phase 0 — `index.html` への一度きりの改修（メインループが実施。並列班には絶対に触らせない）
1. 10テーブルの定義から `Object.freeze` を外し、代わりに `finalizeRegistries()` で deep freeze する。
   **現状freezeされているので、これをやらないと payload の追加が例外になる**
2. 7579行の直後に合流点ブロックを設置:
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
4. `finalizeRegistries()`: `AIRCRAFT_ORDER` と `ENEMY_TYPES` を作り直してから全テーブルを deep freeze
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
- 既存13ミッションの作り直しは**不要**。インラインのまま置き、payload化するのは今後の追加分だけ

## 5. 移行コスト

Phase 0+1 で Opus 1セッション（実装 + registry_gate の初回スナップショット生成 +
既存13ミッションでのゲート緑確認）。既存資産の書き直しゼロ。

**着手タイミング: 走行中の7ミッション班の合流が終わってから。**
Phase 0 は index.html の登録テーブル全てを触るので、走行中worktreeとの衝突を避ける。
ロシア陣営編20本の実装より前に必ず入れる。
