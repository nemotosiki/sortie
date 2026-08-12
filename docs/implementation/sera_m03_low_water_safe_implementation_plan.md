# Sera M03 `LOW WATER` — 保存・復旧優先の実装計画

**対象ブランチ:** `chatgpt/sera-act1-implementation`  
**計画作成日:** 2026-08-12  
**計画開始時HEAD:** `e8f0896777126afb785c87a363cf9912b351f4d3`  
**開始前退避ブランチ:** `backup/sera-act1-before-m03-20260812`  
**目的:** M01・M02で確立した「payloadで縦切り → host不足だけを別コミット → 静的check → E2E → 読み取り専用CI」の手順を踏襲し、M03を作業消失・巨大未保存差分・既存ミッション破壊なしで実装する。

---

## 0. 現在地と、この計画でまだ行わないこと

計画作成時点では次がGitHub上で確認済み。

- M01 `FIRST CONTACT`: 自動E2Eでテストプレイ可能
- M02 `SHATTERED MORNING`: 自動E2Eでテストプレイ可能
- 第3キャンペーン枠: 現在は既存キー `m-heli`
- M02クリア後: 第3枠を解禁する既存契約あり
- `payloads/map_sarkPort.payload.js`: 実装ブランチに存在
- `payloads/ground_heli_pack.payload.js`: Ka-52 / AH-64 / 武装輸送ヘリ / SPAAG等の登録payloadが存在
- M03専用mission payload / host契約 / check / E2E / workflow: 未実装

この計画コミットではゲームコードを変更しない。まず復旧点と作業順をGitHubへ固定し、その後は下記の順番を一段ずつ進める。

---

## 1. 仕様の正本と競合解消

### 1.1 読み取り元

ストーリー設計は次を読み取り専用で参照する。

- branch: `chatgpt/story-campaign-reboot`
- `docs/story_reboot/v0.16/03_m03_low_water.md`
  - 港の座標、導入、人物役割、無線、成功失敗、QAの基礎
- `docs/story_reboot/v0.16/00_enemy_force_doctrine_and_act1_compositions.md`
  - 敵機種、機数、戦術的役割の最新版

実装工程と保存規約は次を継承する。

- `docs/implementation/sera_act1_safe_implementation_plan.md`
- `docs/implementation/sera_act1_status.md`
- M01/M02のpayload、host check、E2E、GitHub Actions workflow

### 1.2 旧M03詳細設計と最新版ドクトリンが衝突する箇所

旧詳細設計の以下は採用しない。

- Ka-52全滅後に初めて輸送ヘリが出る完全直列構成
- MiG-29のTOP COVER / RELIEF
- 輸送ヘリ4機
- Su-25 4機
- 「着陸0だけがS」の単一路線

最新版として固定する敵編成は次。

| 区分 | 機数 | IFF / ランク | 役割 |
|---|---:|---|---|
| Ka-52 | 4 | 赤TGT | 港湾SPAAG、司令所、避難区画を攻撃 |
| 武装輸送ヘリ | 3 | 赤TGT | 運河経由でLZへ進入し、着陸後にAPCを展開 |
| Su-25 | 2 | 赤TGT | 前半の選択結果を増幅するCAS |
| MiG-21bis TOP COVER | 2 | 白・rankNeutral | 低空へ降りたRAVENを上から牽制 |
| MiG-21bis RELIEF | 2 | 白・rankNeutral | 長期戦だけ到着し、港/LZから離れない |
| MiG-23 / MiG-29 | 0 | — | M03では使用禁止 |

白敵戦闘機はクリア条件・S条件にしない。

### 1.3 M03の中心契約

M03は選択画面を出さない。RAVENがどちらへ機首を向けたかを選択とする。

```text
輸送ヘリ優先
  -> 上陸数を減らせる
  -> Ka-52が港湾防空を削りやすい
  -> Phase 3のSu-25が自由になりやすい

Ka-52優先
  -> SPAAG / 味方AH-64を残しやすい
  -> 輸送ヘリが着陸してAPC戦へ移行し得る
  -> Phase 3のSu-25が残存防空に妨害される
```

前半の赤TGTを全部処理するまで次を出さない方式は禁止する。Ka-52と輸送ヘリが時間的に重なり、優先順位が実際の盤面へ返ることを受入条件にする。

---

## 2. 作業消失を防ぐ絶対ルール

### R1. GitHubの確認が終わるまで「保存済み」と呼ばない

各write後に必ず次の3点を確認する。

1. write成功でcommit SHAを取得
2. `chatgpt/sera-act1-implementation` のHEADを再取得し、期待SHAへ進んだことを確認
3. 変更ファイルを同branchから再取得し、内容とblob SHAを確認

ローカルにファイルが残っているだけでは保存済みと判定しない。

### R2. 一つの論理単位を越えて未コミット作業を持たない

原則は **1契約 = 1コミット**。

- map checkとmission payloadを混ぜない
- host拡張とM03敵編成を混ぜない
- 固定無線と条件付き無線を大量に同時投入しない
- E2E本体とworkflowを別コミットにする
- status更新は全ゲートgreen後の独立コミットにする

編集が一つの関数・一つの契約を越えそうなら、まず構文が通り既存挙動が変わらないdefault-off scaffoldingとしてcheckpoint commitを作る。壊れた状態を通常ブランチへ保存するのではなく、「無効状態でもロードできる復旧可能な途中点」を保存する。

### R3. 大きなhost変更前に退避ブランチを作る

最低でも次を作る。

- `backup/sera-act1-before-m03-host-landing-20260812`
- `backup/sera-act1-before-m03-cas-20260812`
- `backup/sera-act1-m03-e2e-green-20260812`

各退避ブランチは、その工程開始直前の実装branch HEADを指す。force push、履歴改変、退避ブランチ削除は禁止。M03の人間テスト完了後に、ユーザー判断で整理する。

### R4. `index.html`を最初に触らない

M01/M02と同様、最初はdevelopment payload loaderで起動する。

```text
index.html?payloads=payloads/map_sarkPort.payload.js,payloads/mission_sera_m03.payload.js
```

必要な機体・ヘリ・地上種が既にinline済みかはpreflightで確認する。未登録なら、依存payloadを無条件に増やす前に「登録をどこへ置くか」を独立工程として決める。

### R5. host不足は実証後にだけ追加する

まず既存の以下を再利用できるか確認する。

- M01/M02の複数僚機
- 個別無線話者
- 三色IFF / `rankNeutral`
- M02の複数保護施設
- 遅延地上フェーズ
- 移動地上目標のroute / 到達失敗
- mission専用E2E hook

不足が実コードで確認できた機能だけを、M03 payloadとは別コミットで後方互換拡張する。

### R6. checkが赤いまま次工程へ進まない

```text
FAIL
  -> 同じ工程内で原因を特定
  -> 最小修正を別コミット
  -> 同じcheckを再実行
  -> branch HEAD / file refetch確認
  -> 次工程
```

別の機能へ逃げて未解決差分を積み上げない。

### R7. 並列作業で同じ合流点を書かない

`index.html`、同一mission payload、同一E2Eファイルへの並列writeは禁止。調査、座標検証、テスト設計は並列化してよいが、合流点へのwriteは一つずつ順番に行う。

---

## 3. 実装前に固定するM03ランタイム契約

### 3.1 輸送ヘリ着陸状態

最低限、各輸送ヘリは次の状態を持つ。

```text
APPROACH -> FINAL -> TOUCHDOWN -> UNLOAD -> DONE
                     \-> DESTROYED
```

境界を曖昧にしない。

- `UNLOAD`確定前に撃破: APCは出ない
- `UNLOAD`確定後に撃破: APCは既に出たものとして残る
- APC生成は輸送ヘリIDごとに一回限り
- Retry / restart / checkpoint復帰で二重生成しない
- 着陸完了した輸送ヘリをいつ消すかは、APC生成と同一トランザクションとして扱う

### 3.2 地上戦への変換

- 輸送ヘリ1機につきAPC×2
- 最大3機着陸ならAPC最大6両
- APCはLZ A/Bから港湾司令所へ移動
- 運河へ落ちない
- 橋・倉庫・クレーンへ食い込まない
- 司令所へ4両到達でMISSION FAILED
- 着陸自体は即失敗にしない

### 3.3 `sarkPort`高度の既知注意点

`map_sarkPort.payload.js`のplateau capは **Y=22**。既存コメントでは`surfaceHeightAt`が平坦面を約20.24として返す既知差がある。

したがってM03のLZ、APC、SPAAG、司令所は、samplerの返値をそのままY座標へ使わない。

- sampler: flat cap内かどうかの検査
- placement: map契約で固定したcap Yと各ユニットの接地offset

ここをmap contract checkで数値固定する。

### 3.4 前半選択を後半へ渡す状態

最低限、次をmission stateとして保持する。

```text
transportLandings
apcSpawnedByTransportId
apcArrivals
commandHp
portDefenseSurvivors
friendlyAh64Survivors
firstLandingAt
casStarted
conditionalRadioFired
```

将来M05へ渡す永続値は、生の事実を優先する。

```text
m03TransportLandings
m03PortDefenseSurvivors
m03CommandHp
```

M05向けの物語的解釈はM05側で行う。

---

## 4. 実装フェーズとコミット境界

## Phase 0 — 計画と復旧点

**このコミットで行うこと:**

- `backup/sera-act1-before-m03-20260812` を開始HEADから作成
- 本計画をGitHubへ保存
- branch HEADとファイルを再取得

**コミット:** `Add safe implementation plan for Sera M03`

ゲームコードは変更しない。

---

## Phase 1 — M03 preflight gate

新規:

```text
tools/check_sera_m03_preflight.mjs
```

確認項目:

- `sarkPort`が登録可能
- 第3キャンペーン枠`m-heli`が存在
- M02クリアが第3枠を解禁する
- Ka-52 / AH-64 / armedTransportHeli / SPAAG / Su-25 / MiG-21 / APC相当が利用可能
- M01/M02の複数僚機・無線・IFF・protected facilities契約が存在
- M01/M02の既存checkがgreen

**コミット:** `Add Sera M03 preflight gate`

ここが赤ならmission payloadを書かない。

---

## Phase 2 — Sark Portを変更せずmission map contract化

新規:

```text
tools/check_map_sark_port.mjs
```

確認項目:

- `worldPreview=sarkPort`でpageerror 0
- 港湾司令所、LZ A/B、クレーン列、運河、橋の候補座標
- plateau cap Y=22
- LZ A/BとAPC routeがflat cap上
- ヘリ進入路が建物・橋・クレーンへ衝突しない
- map切替後にdispose漏れなし

既存`payloads/map_sarkPort.payload.js`は原則変更しない。checkでマップ本体の実バグが出た場合だけ、M03実装と混ぜず次のような独立コミットにする。

```text
Fix Sark Port <specific defect>
```

**通常コミット:** `Add Sark Port mission map contract`

---

## Phase 3 — M03最小mission skeleton

新規:

```text
payloads/mission_sera_m03.payload.js
```

最初のpayloadに入れるもの:

- `world: "sarkPort"`
- `title: "LOW WATER"`
- briefing / storyNo / act
- RAVEN開始位置
- CROWN / LARK
- 港湾司令所
- 港湾SPAAG
- BASTION / ARCAのplaceholderではない正規friendly定義
- 最小の赤TGTを倒してclearできる縦切り

まだ入れないもの:

- 着陸FSM
- APC展開
- Su-25 CAS
- 条件付き無線一式
- M05永続化

第3枠はまず既存`m-heli`をpayload適用時だけin-place replacementする。これによりM02の解禁契約と既存セーブを壊さない。正式キー`m03`への移行が必要なら、進行・記録・選択UIを含む別工程にする。

**コミット:** `Add Sera M03 mission skeleton`

続けて新規:

```text
tools/check_sera_m03_payload.mjs
```

静的契約:

- map依存
- friendlies
- 赤/白IFF
- 機数
- MiG-23 / MiG-29不在
- 白敵がrankNeutral
- 第3枠in-place replacement

**別コミット:** `Add Sera M03 payload contract check`

---

## Phase 4 — 輸送ヘリ着陸host契約

開始前に:

```text
backup/sera-act1-before-m03-host-landing-20260812
```

を作る。

まずdefault-offのhost scaffoldingを入れ、M03契約を持たない既存ミッションの挙動を変えない。

候補契約:

```text
transportLandingContract
landingZones
landingRoute
unloadDelay
spawnOnUnload
```

新規check:

```text
tools/check_sera_m03_landing_host.mjs
```

受入条件:

- 既存ヘリミッションは無変更
- APPROACH / FINAL / TOUCHDOWN / UNLOAD / DONEが一方向
- 撃破境界が決定的
- unload一回につきAPC生成一回
- Retryで状態初期化
- pageerror 0
- M01/M02 E2E green

**コミット1:** `Add transport helicopter landing host contract`  
**コミット2:** `Add idempotent unload descendant spawning`

二つを一コミットにまとめない。

---

## Phase 5 — APC routeと港湾司令所防衛

M02の移動地上目標・到達失敗・protected facilityを再利用する。

実装内容:

- LZ A/Bから司令所までのroute
- APC×2 / 着陸ヘリ
- 最大6両
- 司令所HP
- APC到達数
- 4両到達失敗
- 司令所HP 0失敗
- ground descendantsを赤TGTへ追加
- APCを全滅させれば着陸を許してもclear可能

新規check:

```text
tools/check_sera_m03_ground_host.mjs
```

**コミット1:** `Add M03 landing-zone ground routes`  
**コミット2:** `Add M03 command-post defense contract`

地上routeと成功失敗を分けて保存する。

---

## Phase 6 — Ka-52 / 輸送ヘリの重複戦闘

mission payloadだけを更新する。

想定の出現構造:

1. Ka-52 RAID A ×2
2. MiG-21 TOP COVER ×2（白）
3. 輸送ヘリ第一列 ×2
4. Ka-52 RAID B ×2と輸送ヘリ最終機を重ねる
5. 長期戦時だけMiG-21 RELIEF ×2（白）

受入条件:

- Ka-52全滅を輸送ヘリ出現条件にしない
- 輸送ヘリ全滅をKa-52第二陣の出現条件にしない
- 白MiG-21を0機撃墜でclear / S可能
- TOP COVERは低空まで深追いしない
- RELIEFは港/LZから遠くへ追撃しない
- 最大同時敵数が性能予算内

**コミット:** `Stage the overlapping M03 helicopter raid`

---

## Phase 7 — 港湾防空と選択結果

BASTION 1 HEARTH / BASTION 2 WRENは、最新版のSu-25標的契約と整合する味方AH-64として実装する。ARCA PATROLは外周の白戦闘機を優先する。

役割:

- 港湾SPAAG: Ka-52 / Su-25を妨害
- 味方AH-64: 着陸したAPCを攻撃
- ARCA / ROOK NPC: 白MiG-21を引き受ける
- NPCは赤TGTを奪いすぎない

保存する結果:

- SPAAG生存数
- AH-64生存数
- 司令所HP
- 輸送ヘリ着陸数

**コミット:** `Add M03 port-defense choice state`

この工程後にM01/M02 E2Eを再実行する。

---

## Phase 8 — Su-25 CAS

開始前に:

```text
backup/sera-act1-before-m03-cas-20260812
```

を作る。

Su-25を遅い戦闘機として実装しない。標的優先は概ね次。

1. 生存している港湾SPAAG
2. 味方AH-64
3. 港湾司令所 / LZ周辺

前半にKa-52を優先して防空を残した場合、Su-25は妨害される。輸送阻止を優先してKa-52を放置した場合、Su-25が自由になりやすい。

hostにCAS標的選択が不足する場合:

- host contractだけを先にdefault-offで追加
- host checkを追加
- M01/M02回帰greenを確認
- その後mission payloadへSu-25×2を追加

**コミット1:** `Add mission-scoped CAS target selection`  
**コミット2:** `Stage the M03 Su-25 counterattack`

---

## Phase 9 — 無線

話者を一度に増やさない。

### 9A. 話者host契約

既存に無い場合だけ、次を後方互換追加する。

- HEARTH
- WREN
- ARCA PATROL
- PORT COMMAND

**コミット:** `Add M03 joint-defense radio identities`

### 9B. 固定無線

先に導入、PHASE UPDATE、着陸、Su-25、終了だけを入れる。

**コミット:** `Add M03 core radio sequence`

### 9C. 条件付き無線

別コミットで追加する。

- 低高度
- クレーン危険接近
- 白敵深追い
- 輸送ヘリLZ 2km
- 初着陸 / 2機目着陸
- APC司令所1km
- 司令所50% / 25%
- clean end / ground end排他

条件付き無線は一回限り。古くなったNORMALは戦況後に流さない。MERIDIANが正式指示、CROWNは短い助言、LARKは近距離状況、HEARTH/WRENは土地勘に限定する。

**コミット:** `Add M03 conditional radio cues`

---

## Phase 10 — 成功・失敗・ランク・M05向け記録

成功:

- 赤空中TGT全滅
- 生成された赤APC全滅
- 港湾司令所生存

失敗:

- 港湾司令所HP 0
- APC 4両が司令所へ到達
- RAVEN撃墜
- 21分経過

ランクは「着陸0だけが正解」にならないよう、二経路Sを許す。

- 上陸阻止を優先して港を守る経路
- Ka-52を優先し、着陸後のAPCも処理して防空を残す経路

白MiG-21撃墜数はS条件にしない。具体的なHP・時間閾値はE2E成立後のtuningコミットで固定する。

記録先は正式に`m03`とする。第3枠の実キーを当面`m-heli`に保つ必要がある場合は、任意の`recordKey: "m03"`契約を別hostコミットで追加し、旧セーブ互換をcheckする。

保存候補:

```text
sortieMissionRecords.m03.transportLandings
sortieMissionRecords.m03.portDefenseSurvivors
sortieMissionRecords.m03.commandHp
sortieMissionRecords.m03.apcArrivals
```

**コミット1:** `Add M03 result and rank contract`  
**コミット2:** `Persist M03 port-defense outcome`

---

## Phase 11 — M03 E2Eと読み取り専用CI

新規:

```text
tools/check_sera_m03_e2e.mjs
```

最低限の自動シナリオ:

1. 通常メニュー経路でM03開始
2. `sarkPort` / CROWN / LARK / BASTION / ARCA生成
3. Ka-52×4、輸送ヘリ×3、Su-25×2が赤TGT
4. MiG-21×4が白・rankNeutral
5. MiG-23 / MiG-29が0
6. 輸送ヘリ着陸0でclear
7. 1機着陸でAPC exactly 2
8. 最大3機着陸でAPC exactly 6
9. unload前撃破でAPC 0
10. unload後撃破でAPC exactly 2、二重生成なし
11. APC 4両到達でfail
12. 司令所HP 0でfail
13. fail後Retryで着陸数、APC、司令所HP、無線フラグがreset
14. 白敵残存でclear / S可能
15. 前半の防空生存数でSu-25圧が変化
16. 結果が`sortieMissionRecords.m03`へ保存
17. pageerror 0 / console error 0
18. registry gate green
19. M01フルE2E green
20. M02フルE2E green

**コミット:** `Add Sera M03 full E2E gate`

続けて新規:

```text
.github/workflows/verify-sera-m03-e2e.yml
```

workflowはM01/M02と同じく読み取り専用とし、自動修正・自動commit・自動pushを禁止する。

**別コミット:** `Add Sera M03 read-only CI gate`

全自動ゲートgreen後に:

```text
backup/sera-act1-m03-e2e-green-20260812
```

を作る。

---

## Phase 12 — status更新とtuning

自動E2Eがgreenになる前に`sera_act1_status.md`を「テストプレイ可能」へ更新しない。

順番:

1. statusへ実在機能と検証済み範囲だけを追記
2. 人間のNORMAL通しプレイ
3. EASY / HARD / ACE
4. 低空視認性、クレーン危険度、ヘリ速度、着陸猶予
5. Su-25 CAS圧
6. S/A/B閾値
7. 無線テンポ、BGM、効果音

**コミット1:** `Record verified Sera M03 implementation status`  
**コミット2:** `Tune Sera M03 LOW WATER vertical slice`

人間プレイ前は「自動E2Eでテストプレイ可能」。難易度・音・視認性まで確認後にだけ「完成」と呼ぶ。

---

## 5. 予定コミット台帳

以下を基本順序とし、一つの大コミットへ圧縮しない。

| 順 | 予定コミット | 主対象 |
|---:|---|---|
| 0 | `Add safe implementation plan for Sera M03` | docs |
| 1 | `Add Sera M03 preflight gate` | tools |
| 2 | `Add Sark Port mission map contract` | tools |
| 3 | `Add Sera M03 mission skeleton` | payload |
| 4 | `Add Sera M03 payload contract check` | tools |
| 5 | `Add transport helicopter landing host contract` | host |
| 6 | `Add idempotent unload descendant spawning` | host |
| 7 | `Add M03 landing-zone ground routes` | payload / data |
| 8 | `Add M03 command-post defense contract` | host |
| 9 | `Stage the overlapping M03 helicopter raid` | payload |
| 10 | `Add M03 port-defense choice state` | payload / host契約 |
| 11 | `Add mission-scoped CAS target selection` | host |
| 12 | `Stage the M03 Su-25 counterattack` | payload |
| 13 | `Add M03 joint-defense radio identities` | radio host |
| 14 | `Add M03 core radio sequence` | payload |
| 15 | `Add M03 conditional radio cues` | payload |
| 16 | `Add M03 result and rank contract` | host / payload |
| 17 | `Persist M03 port-defense outcome` | persistence |
| 18 | `Add Sera M03 full E2E gate` | tools |
| 19 | `Add Sera M03 read-only CI gate` | workflow |
| 20 | `Record verified Sera M03 implementation status` | docs |
| 21 | `Tune Sera M03 LOW WATER vertical slice` | tuning only |

実装中に追加修正が必要でも、既存行へ無理に混ぜず、原因を名指しした独立コミットを間へ挟む。

---

## 6. 各コミット前後の固定チェックリスト

### 書き込み前

- [ ] 対象branchを再取得
- [ ] HEAD SHAを作業メモへ記録
- [ ] 同じファイルを別作業が変更していない
- [ ] 大規模host変更なら退避branch作成済み
- [ ] 変更対象を一契約に限定

### 書き込み前の最低検証

- [ ] JS構文check
- [ ] 対象の静的contract check
- [ ] registry消失なし
- [ ] 既存M01/M02へ影響するhost変更なら両E2E

### 書き込み後

- [ ] commit SHA取得
- [ ] branch HEAD再取得
- [ ] HEADがcommit SHAと一致
- [ ] 変更ファイルをGitHubから再取得
- [ ] 想定外ファイルが変更されていない
- [ ] 次工程の開始SHAを記録

一つでも満たさなければ「コミット済み」「工程完了」と報告しない。

---

## 7. ロールバック方針

| 問題 | 戻り先 |
|---|---|
| M03計画後、着手前の問題 | `backup/sera-act1-before-m03-20260812` |
| 着陸hostで既存ミッション破壊 | `backup/sera-act1-before-m03-host-landing-20260812` |
| CAS AIで回帰 | `backup/sera-act1-before-m03-cas-20260812` |
| tuningで悪化 | `backup/sera-act1-m03-e2e-green-20260812` |

rollbackはforce pushで履歴を消すのではなく、原因コミットをrevertするか、安全branchから新しい修正branchを作る。失敗した作業自体も調査可能な履歴として残す。

---

## 8. 最終QA

### マップ / 接地

- [ ] `sarkPort`本体を不要に変更していない
- [ ] LZ A/Bがflat cap上
- [ ] 地上配置に誤った20.24m sampler値を使っていない
- [ ] ヘリが橋・倉庫・クレーンへ衝突しない
- [ ] APCが運河へ落ちない
- [ ] map dispose回帰なし

### 戦術

- [ ] Ka-52と輸送ヘリが実際に重なる
- [ ] どちらを優先しても勝ち筋がある
- [ ] 白MiG-21を無視してclear / S可能
- [ ] MiG-29 / MiG-23不在
- [ ] Su-25がCASとして行動し、旋回戦の主役にならない
- [ ] NPCが赤TGTを奪いすぎない

### 着陸 / Retry

- [ ] unload前撃破と後撃破の境界が一意
- [ ] APC二重spawnなし
- [ ] 0 / 1 / 2 / 3機着陸を検証
- [ ] Retryで全mission state reset
- [ ] checkpoint復帰でdescendant重複なし

### 回帰 / 保存

- [ ] M01 E2E green
- [ ] M02 E2E green
- [ ] M02クリア後にM03解禁
- [ ] M03記録がcanonical `m03`へ保存
- [ ] branch HEAD / file refetch確認済み
- [ ] 読み取り専用CI

---

## 9. 禁止事項

- `sarkPort`をM03都合で作り直す
- mission payload検証前にinlineする
- `index.html`とmission内容を一コミットで同時に変更する
- 着陸、APC、CAS、無線を一つの巨大差分で実装する
- 白MiG-21全滅をclear / S条件にする
- MiG-29をM03へ戻す
- Ka-52全滅後にだけ輸送ヘリを出す完全直列構成へ戻す
- 「着陸0だけがS」の単一正解に戻す
- CIに自動修正、自動commit、自動pushを持たせる
- 退避branchを検証前に削除する
- force pushで失敗履歴を消す

---

## 10. 完了判定

### GitHub保存済み

- commit SHA
- branch HEAD一致
- file refetch

の3点が揃った状態。

### 静的check済み

- map / payload / host / registryの対象checkがgreen。

### E2E済み

- clear / fail / Retry / 記録 / M01-M02回帰をChromiumで確認し、pageerror 0。

### テストプレイ可能

- M03の全主要経路を自動E2Eで通せる状態。

### 完成

- 上記に加え、人間による通しプレイ、難易度、音、無線テンポ、視認性、ランク調整が完了した状態。
