# Sortie 本体分割計画

基準コミット: `75dc31b468b320d9d6a2e4a2bfa67bbf87a9e94e`

## 1. 結論

推奨構成は、**開発時はビルドレスの native ES modules、配布時だけ単一 HTML へ束ねる二層構成**とする。

- 開発・検証: `python -m http.server` から `index.html` を開き、ブラウザが `src/` を直接 `import` する。
- 既存の Three.js import map は維持する。
- Playwright は従来どおり実ページを開く。新しい開発サーバーやフレームワークは導入しない。
- 単一 HTML はソース正本ではなく、後段で作る配布成果物とする。
- 第1段階ではビルド工程を追加しない。まず native ESM で分割境界が正しいことを証明する。
- モジュール数が増え、`src/main.js` が composition root になった段階で、release-only の bundle/inlining を追加する。

native ESM は、相対 URL の module specifier と import map をブラウザ自身が解決できる。import map は module script より先に宣言する必要があり、現在の HTML は既にその順序を満たしている。

参考:

- MDN, JavaScript modules: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
- MDN, `<script type="importmap">`: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap
- MDN, dynamic `import()`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import

## 2. なぜ開発ビルドを増やさないか

現行の実行経路は単純である。

```text
python http.server
  -> index.html
  -> import map
  -> browser native ESM
  -> Playwright
```

ここへ Vite 等の常駐開発サーバーを入れると、次が新しい故障点になる。

- Python サーバーと別の起動手順
- Node/package manager のバージョン差
- 開発時と検収時で異なる URL・変換結果
- `?payloads=` の動的 import と bundle 時の経路差

第1段階の目的はコードの移動であり、変換工程の導入ではない。ブラウザが既に必要な module graph を実行できるため、開発ビルドには見合う利益がまだない。

一方、最終配布の単一 HTML には bundle が必要になる。十分な範囲が `src/` へ移った後、esbuild の JavaScript API を release-only で使用し、次の形にする。

```text
src/main.js + feature modules
  -> esbuild bundle (format: esm, `three` は external)
  -> import map を残した index template へ JS/CSS を inline
  -> dist/index.html
```

esbuild は entry point から静的 import を再帰的に bundle でき、ESM 出力にも対応する。

参考:

- esbuild, Build API / Bundling: https://esbuild.github.io/api/#bundle
- esbuild, Output format: https://esbuild.github.io/api/#format

`three` は既存 import map の bare specifier を維持するため external とし、ゲーム側の module graph だけを束ねる。これにより開発時と配布時で Three.js の版・URLが分岐しない。

## 3. 推奨ファイル構成

最終形は機械的な行数分割ではなく、依頼単位と所有単位が一致する feature-oriented 構成にする。

```text
index.html                         HTML shell / import map / src/main.js の読込
src/
  main.js                          composition root。初期化順と依存注入だけ
  core/
    constants.js                   複数領域で共有する不変値
    math.js                        純粋な幾何・補間・乱数
    lifecycle.js                   start/reset/dispose の共通契約
  registry/
    payload-loader.js              ?payloads= の外部モジュール読込
    registry-snapshot.js           registry_gate 用の構造スナップショット
    payload-registry.js            add* API / finalize / freeze
  ui/
    radio.js                       無線キュー、優先度、表示状態
    hud.js                         HUD DOM 更新とレーダー描画
    menus.js                       campaign / mission / briefing / hangar
  combat/
    player-gun.js                  機銃、照準解、ガンバル、命中
    player-weapons.js              通常弾・SP.W の発射管理
    missile-guidance.js            誘導、信管、LASM/4AGM
    enemy-ai.js                    固定翼AI、break、post-stall
  world/
    create-world.js                createWorld / disposeWorld / apply preset
    surface.js                     山判定、surfaceHeightAt / surfaceTopAt
    decorators.js                  WORLD_DECORATORS の適用
  entities/
    aircraft.js                    機体モデルと固定翼spawn
    helicopters.js                 ヘリモデル・spawn・update
    ground.js                      地上目標・車列・列車
    ships.js                       艦・subsystem・対艦攻撃
    friendlies.js                  wingman / transport / guard
  missions/
    runtime.js                     wave進行、完了、checkpoint、rank
    briefing.js                    briefing marker / story / debrief
  data/
    aircraft.js                    AIRCRAFT_TYPES / order / campaign許可
    enemies.js                     AI/role/skill/ace/missile tables
    surface-units.js               ship/ground/heli tables
    worlds.js                      WORLD_PRESETS
    missions-usa.js                米編定義
    missions-rus.js                露編定義
styles/
  base.css                         shell / typography / shared panel
  hud.css                          flight HUD
  radio.css                        radio panel
  menus.css                        menu / briefing / result
payloads/                          既存のadd-onlyコンテンツ登録
```

これは最終的な方向であり、一度に移動しない。

## 4. 依存の向き

依存方向は次の一方向とする。

```text
data
  ↓
core (pure functions / contracts)
  ↓
feature modules (ui, combat, world, entities, missions, registry)
  ↓
main.js (composition root)
```

厳守事項:

1. `main.js` だけが feature module 同士を接続する。
2. `ui/radio.js` が `combat/` や `world/` を import しない。必要な通知は callback で受ける。
3. `combat/` が DOM を直接探さない。UI node / renderer callback を初期化時に受け取る。
4. `world/` が mission table を import しない。preset と配置要求を引数で受け取る。
5. `data/` は runtime module を import しない。
6. Three.js を必要としない純粋ロジックは `THREE` へ依存させない。
7. mutable state の所有者は一つにする。別 module が同じ配列や状態機械を直接更新しない。

この向きなら「無線を変更」は `src/ui/radio.js`、「機銃を変更」は `src/combat/player-gun.js`、「山の判定を変更」は `src/world/surface.js` の所有だけで完結する。

## 5. 段階的な移行

### Stage 1 — 本便

低リスクで実績の多い payload registry の境界を証明する。

実装対象:

- `src/registry/payload-loader.js`
- `src/registry/registry-snapshot.js`
- `index.html` の import と、対応する小さな inline 実装だけ

選定理由:

- 8便以上の外部payload納品で実際に変更要求が来ている領域。
- ゲームループ、ミッション、Three.js scene、DOM描画へ依存しない。
- 失敗時はゲーム開始前に明確に落ちるため、無言の挙動差になりにくい。
- `?payloads=` と `registry_gate` が、native ESM 分割後も同じ結果を返すことを最初に証明できる。

### Stage 2 — radio

- `src/ui/radio.js`
- `styles/radio.css`

無線のpriority queue、hold、speaker label、DOM表示を一つのcontrollerへまとめる。第14便のような無線依頼をこの所有範囲だけで処理できるようにする。

### Stage 3 — player gun / missile guidance

- `src/combat/player-gun.js`
- `src/combat/missile-guidance.js`

照準リングと実弾が同じ解を読む契約、guidanceとfuseが同じtarget volumeを読む契約をmodule APIにする。

### Stage 4 — world / surface

- `src/world/create-world.js`
- `src/world/surface.js`
- `src/world/decorators.js`

GPU資源の所有をworld moduleへ閉じ込める。`keepGeometry` / `keepMaterial` / `keepTexture` / `addRoot` を外へ漏らさず、decoratorには制限されたenvだけを渡す。

### Stage 5 — entities / mission runtime

spawn/update/damage系をentity種別ごとに分離し、最後にmission runtimeを抜く。ここは共有mutable stateが多いため、先に行わない。

### Stage 6 — data

runtimeの参照方向が固定した後で巨大テーブルをdata moduleへ移す。データを先に移すと、未整理のruntimeが多数のmutable tableを直接importし、循環依存を固定化するため最後にする。

## 6. 並列作業のファイル所有権

各便の開始時に、次の形式でwrite setを宣言する。

```text
WRITE:
  src/ui/radio.js
  styles/radio.css
  index.html の import/初期化ブロックのみ

READ ONLY:
  src/combat/**
  src/world/**
  src/data/**
  payloads/**
```

運用規則:

- 一つの便で複数feature directoryを所有しない。
- `src/main.js` と `index.html` は合流点とし、同時に一人だけが所有する。
- feature branchは自分のmoduleを完成させ、composition rootの結線は統合担当が一度だけ行う。
- data table変更とruntime変更を同じ便で混ぜない。
- 共有型・イベント名を変える便は、先に小さなcontract commitを置き、その後に利用側を分ける。
- 自動生成物をsource branchへコミットしない。

GitHubのCODEOWNERSは、pathごとにownerを指定し、pull request時にreviewを自動要求できる。またbranch protectionと組み合わせてowner reviewを必須にできる。

参考:

- GitHub Docs, About code owners: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners

ただし現時点では実在するteam/loginが仕様にないため、`CODEOWNERS` を推測で追加しない。担当者が決まった時点で、上記directory境界をそのままCODEOWNERSへ写す。

## 7. ペイロード機構の扱い

payloadは廃止しない。

- **content registration**: 新機体、新ミッション、新ユニット、新world decoratorには引き続き最適。
- **runtime implementation**: CSS、物理、描画、AI、武器誘導はfeature moduleを直接変更する。

分割後、payloadの役割は「到達不能な本体を無理に拡張する仕組み」ではなく、「add-onlyデータを衝突なく納品する仕組み」に限定される。

`?payloads=` の開発経路とinline経路はStage 1で維持する。将来単一HTML packagerを導入した後は、release bundleへpayloadを静的登録し、開発時だけdynamic importを残す。

## 8. 挙動一致の判定

構造変更の一致は、見た目だけでなく次の不変条件で判定する。

### Stage 1固有

- query無しで `__APPLIED_PAYLOADS__` が分割前と同一。
- `?payloads=` のtrim、空要素除外、順次import、default export検査、エラー文、登録順が同一。
- `__REGISTRY_SNAPSHOT__` のJSON構造が分割前とdeep-equal。
- `registry_gate` が既存snapshotに対して緑。

### 全体

- mission key 40本と順序が同一。
- 各missionの `totalTargets` / `totalContacts` / `waveCount` が同一。
- AIRCRAFT_TYPES、役割、HP、兵装、mission definitionに値差分がない。
- 40本が起動しpageerror/console error 0。
- Playwrightの既存URL、query、debug hookがそのまま使える。
- 同じworld、mission、seedでsnapshot/probe値が一致。
- fps 60。

## 9. 本便の所有範囲

```text
WRITE:
  index.html
  src/registry/payload-loader.js
  src/registry/registry-snapshot.js
  docs/repo_structure_plan.md

READ ONLY:
  tools/inline_payload.mjs
  tools/registry_gate.mjs
  tools/registry_snapshot.json
  payloads/**
  AIRCRAFT_TYPES
  MISSIONS
  ゲームバランス値と全runtimeロジック
```

既存toolsは、Stage 1の外部module読込で実際に壊れた場合だけ最小修正する。先回りでは変更しない。
