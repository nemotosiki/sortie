# キャンペーン分離計画 — Legacy USA/RUSとセラ編の完全分離

**作成日:** 2026-08-12  
**対象ブランチ:** `chatgpt/sera-act1-implementation`  
**状態:** 実装前の確定計画  
**コード変更:** この文書コミットでは行わない

## 0. 決定

セラ編を旧USAキャンペーンのミッション差し替えとして増築する方式を終了し、ゲーム内の第三キャンペーンとして独立させる。

```text
Legacy USA  campaign=usa   key=m01, m02, m-heli, ...
Legacy RUS  campaign=rus   key=r01, r02, ...
Sera        campaign=sera  key=sera-m01, sera-m02, sera-m03, ...
```

旧USA/RUSのキーは一括改名しない。既存セーブ、旧ストーリーイベント、テスト、因果マークへの影響を最小化するため、**新しいセラ編だけを名前空間化**する。

M04以降は、M01〜M03の分離とキャンペーン隔離E2Eがgreenになるまで実装しない。

## 1. 現在の問題

### 1.1 セラ編が旧ミッションを置換している

現在のセラM01、M02、M03は、次の旧ミッションを配列から外し、同じキーで再登録している。

```text
Sera M01 -> stock m01
Sera M02 -> stock m02
Sera M03 -> stock m-heli
```

さらに`campaign`は`usa`のままである。このため、ゲーム全体から見るとセラ編は独立キャンペーンではなく、旧USA編の中身を上書きした状態である。

### 1.2 ミッションキーが複数の責務を兼ねている

現在の`mission.key`は、少なくとも次に使われている。

- ミッション定義の検索
- クリア記録とランク
- 解禁連鎖
- スコア収益
- optional markと因果イベント
- ストーリーイベントの監視
- デバッグ起動
- E2Eフック
- 一部のチェックポイントとRetry判断

同じ`m02`を旧編とセラ編で共有すると、無線だけでなく、進行、因果イベント、記録、解禁も共有される。

### 1.3 グローバル配列インデックスへの依存

UIとゲーム進行は、単一の`MISSIONS`配列からキャンペーン別のグローバルインデックス一覧を作る。戦闘コードを一度に全面改修するのは高リスクだが、外部APIまでインデックスを持つ必要はない。

### 1.4 暗黙のUSAフォールバック

未登録キャンペーン、僚機、無線話者、機体所属の一部はUSAへフォールバックする。新しい`sera`を追加して設定が一つ欠けると、エラーではなくHAMMER 2、SKYEYE、USA財布などが混入し得る。

### 1.5 記録と購入状態がキャンペーン境界を持たない

`sortieMissionRecords`はミッションキーだけで保存される。機体購入も単一の機体ID配列で、同じF-16を複数キャンペーンが使う場合の所有者を表現できない。

M03は移行途中の互換策として、`m-heli`と正式記録`m03`の両方を書いている。分離後は`sera-m03`を唯一の正式記録にする必要がある。

## 2. 目標

1. 旧USA、旧RUS、セラの三キャンペーンが同じビルドに共存する。
2. `m01`と`sera-m01`、`m02`と`sera-m02`、`m-heli`と`sera-m03`が同時に登録される。
3. セラペイロードが旧ミッションを`splice`、削除、置換しない。
4. クリア記録、解禁、ランク、収益、購入、難易度をキャンペーン別にする。
5. 無線、僚機、ストーリーイベント、チェックポイントを現在のミッション文脈へ束ねる。
6. 旧M01〜M03とセラM01〜M03を独立してclear / fail / Retryできる。
7. M04を`sera-m04`として純粋に追加できる。

## 3. 非目標

- 旧USA/RUS全40ミッションのキーを一括改名しない。
- 飛行モデル、敵AI、描画、HUDを作り直さない。
- `MISSIONS`配列を即時廃止しない。
- 過去の文書やストーリーをこの移行で再編集しない。
- セラM01〜M03のゲーム内容、敵数、ランク条件を同時に調整しない。

構造移行とゲームバランス調整を同じコミットへ混ぜない。

## 4. 目標データモデル

### 4.1 キャンペーン定義

`CAMPAIGNS`を固定リテラルだけでなく登録可能なレジストリへする。

```js
ctx.addCampaign({
  id: "sera",
  name: "SERA CAMPAIGN",
  operation: "OPENING WAR",
  callsign: "RAVEN",
  aircraft: ["f16", "f4", "f15c"],
  starterAircraft: ["f16"],
  radioProfile: "rook",
  economyNamespace: "sera"
});
```

キャンペーン定義が所有するもの:

- 表示名、作戦名、陣営、プレイヤーコールサイン
- 使用可能機体と初期機体
- 無線プロファイル
- 経済・購入記録の名前空間
- 表示状態（通常、legacy、hidden）

未登録キャンペーンIDはUSAへ戻さず、登録時または起動時にエラーにする。

### 4.2 ミッション定義

```js
{
  key: "sera-m01",
  campaign: "sera",
  campaignOrder: 1,
  storyNo: 1,
  act: 1,
  title: "FIRST CONTACT",
  radioProfile: "rook"
}
```

- `key`: 全ゲームで一意な永続ID
- `campaign`: 所属キャンペーン
- `campaignOrder`: キャンペーン内の順序
- `storyNo`: 画面・物語上の番号

新規ペイロードでは`campaign`と`campaignOrder`を必須にする。旧インラインミッションに限り、未指定を`usa`として読む互換層を残す。

### 4.3 キー基準の検索

次を構築する。

```js
MISSION_BY_KEY.get("sera-m01")
CAMPAIGN_MISSION_KEYS.get("sera")
currentMissionKey
missionCursorKey
```

戦闘内部は当面`currentMissionIndex`を維持してよい。ただしUI、セーブ、イベント、デバッグAPIはキーを正本とし、戦闘開始直前にキーからグローバルインデックスを解決する。

### 4.4 実行文脈

出撃開始ごとに一つの文脈を作る。

```js
MissionRuntimeContext {
  campaignId: "sera",
  missionKey: "sera-m02",
  attemptId: 7,
  missionRevision: 1,
  radioProfile: "rook"
}
```

無線、ストーリーイベント、チェックポイント、Retry、結果保存はこの文脈を参照する。

### 4.5 永続記録V2

```json
{
  "schemaVersion": 2,
  "records": {
    "m01": { "cleared": true, "rank": "A" },
    "sera-m01": { "cleared": true, "rank": "S" }
  },
  "purchases": {
    "usa": ["f15c"],
    "rus": ["su37"],
    "sera": ["f16"]
  },
  "selectedMission": {
    "usa": "m05",
    "rus": "r03",
    "sera": "sera-m02"
  },
  "difficulty": {
    "usa": "hard",
    "rus": "normal",
    "sera": "normal"
  }
}
```

同じ機体IDでも購入はキャンペーン別とする。将来共有する場合は偶然の共有ではなく、明示的な`inventoryGroup`を導入する。

## 5. 互換・移行方針

### 5.1 必ずバックアップする

初回移行時に旧localStorageを別キーへそのまま保存する。

```text
sortieMissionRecords.backup.v1
sortieAircraftPurchases.backup.v1
```

移行済みフラグを付け、二度実行しない。JSON破損時は空データへ黙って上書きせず、バックアップを残して新規V2を作る。

### 5.2 M01/M02の曖昧な記録

現在の`m01`と`m02`は、旧キャンペーン時代の記録か、セラ置換後の記録かをデータだけで判別できない。

無損失を優先し、初回移行では既存記録を次の両方へ複製する。

```text
m01 -> m01 と sera-m01
m02 -> m02 と sera-m02
```

複製した記録には`ambiguousImport: true`を付ける。以後のプレイ結果はそれぞれ独立して更新する。

### 5.3 M03の二重記録

現在は`m-heli`の互換記録に加え、`recordSource: "m-heli"`付きの`m03`記録がある。

移行順:

1. `m03`が存在すれば、それを`sera-m03`の第一候補にする。
2. `m03`が無く`m-heli`が存在する場合は、`m-heli`を`sera-m03`へ複製する。
3. 旧`m-heli`記録はlegacy側へ残す。
4. 分離後は`m03`互換記録の新規書き込みを停止する。

### 5.4 機体購入

既存購入がどのキャンペーンで行われたか判別できないため、移行時は購入済み機体を、その機体を採用する全キャンペーンへ複製する。進行を失わせないことを優先し、新規購入から厳密に分離する。

## 6. 無線・イベント・僚機の分離

### 6.1 無線は役割を解決する

共通コードが直接`wingman`や`command`を固定話者として発話しない。

```js
radioSayRole("awacs", text)
radioSayRole("lead", text)
radioSayEntity(friendly.radioSpeaker, text)
```

セラ編:

```text
awacs -> MERIDIAN
lead -> CROWN
wingman -> LARK
```

旧USA:

```text
awacs -> SKYEYE
wingman -> HAMMER 2
```

実際に狙われた僚機が分かるイベントは、その個体の`radioSpeaker`を使う。

### 6.2 ストーリーイベントは正確なキーへ登録する

次のような生キー監視を廃止する。

```js
WATCHED_KEYS.has("m02")
```

目標:

```js
ctx.addMissionRuntime("m02", legacyM02Runtime)
ctx.addMissionRuntime("sera-m02", seraM02Runtime)
```

出撃開始時に対象ミッションのハンドラーだけを起動し、complete / fail / Retry / mission changeで必ず破棄する。

### 6.3 僚機の暗黙フォールバックを廃止する

セラM01〜M03はミッション自身がCROWN/LARKを所有する。必要な僚機設定が欠けた場合、USAのHAMMER 2を出すのではなく登録エラーにする。

## 7. チェックポイントとRetry

チェックポイントへ次を保存する。

```js
{
  campaignId,
  missionKey,
  attemptId,
  missionRevision,
  ...combatState
}
```

復帰条件:

```text
checkpoint.campaignId === runtime.campaignId
checkpoint.missionKey === runtime.missionKey
checkpoint.attemptId === runtime.attemptId
```

一致しないチェックポイントは使わない。別キャンペーンへ切り替えた後に、施設損失、爆撃機突破、TEL、APC状態が復帰することを防ぐ。

## 8. 実装フェーズ

### Phase 0 — M04を止め、混在箇所を監査する

コード挙動は変えない。

検索対象:

```text
mission.key ===
MISSIONS.findIndex
missionRecords[
marksTaken(
WATCHED_KEYS
currentMissionIndex
campaignMissionIndices
WINGMAN_BY_CAMPAIGN
CAMPAIGNS[0]
aircraftPurchases
aircraftCampaignId
forceStartMissionByKey
```

成果物は、各参照を`legacy専用`、`sera専用`、`共通`、`要分離`へ分類した一覧とする。

### Phase 1 — キャンペーン／ミッションID基盤

- `addCampaign()`を追加
- `MISSION_BY_KEY`と`CAMPAIGN_MISSION_KEYS`を追加
- `campaignOrder`を正規化・検証
- UIとデバッグAPIをキー基準へ変更
- 未登録キャンペーンをエラー化
- 戦闘コード向けのindex互換アダプターを追加

受入条件: 旧USA/RUSの内容、順序、解禁、ハンガーが変わらない。

### Phase 2 — 永続記録V2と経済分離

- V1バックアップ
- V2移行
- キャンペーン別記録、財布、購入、難易度、選択位置
- M01/M02曖昧記録の無損失複製
- M03二重記録の統合

受入条件: 既存セーブを読み、再読み込み後も同じ進行を保持する。

### Phase 3 — RuntimeContextとイベント分離

- `MissionRuntimeContext`導入
- ミッション別イベント登録API
- 無線ロール解決
- 僚機フォールバック廃止
- チェックポイント照合
- event handlerの開始・破棄ライフサイクル

受入条件: 旧M02のDAGGERイベントがセラ編で発火せず、旧編では維持される。

### Phase 4 — セラキャンペーン登録

`payloads/campaign_sera.payload.js`を作る。

- `id: "sera"`
- プレイヤー`RAVEN`
- AWACS`MERIDIAN`
- ROOK編隊
- 機体リストと初期機体
- 無線・経済名前空間
- キャンペーン選択画面の3件以上対応

最初はミッション0件でもよい。第三キャンペーンの表示、選択、空状態を先に検証する。

### Phase 5 — M01を独立登録する

```text
stock m01   -> そのまま保持
sera-m01    -> 新規追加
```

削除する構造:

```text
find stock m01
...original
splice stock m01
campaign: usa
```

旧M01とセラM01を同じセッションでそれぞれ起動し、記録が独立することを確認する。

### Phase 6 — M02を独立登録する

```text
stock m02   -> 旧DAGGERイベントを維持
sera-m02    -> MERIDIAN/CROWN/LARKのみ
```

施設損失、TEL逃走、Retry、クリア記録が旧M02と共有されないことを確認する。

### Phase 7 — M03を独立登録する

```text
stock m-heli -> 旧LOW GUARDIANを保持
sera-m03     -> LOW WATER
```

現在の着陸FSM、APC変換、司令所防衛、ランク契約を維持する。`m-heli`と`m03`への二重記録は停止し、`sera-m03`だけを正式記録にする。

### Phase 8 — 互換ブリッジを清掃する

- セラ置換用`splice`を削除
- セラ専用の`m01`、`m02`、`m-heli`条件を新キーへ変更
- V1への新規書き込みを停止
- 生キー監視を登録式へ移す
- `|| usa`、`CAMPAIGNS[0]`等の暗黙フォールバックを削除
- registry snapshotと文書を更新

### Phase 9 — M04を再開する

M04は最初から次で追加する。

```js
{
  key: "sera-m04",
  campaign: "sera",
  campaignOrder: 4
}
```

旧ミッションを置換しない。

## 9. 推奨コミット境界

1. `Audit campaign identity dependencies`
2. `Add campaign and mission identity registries`
3. `Add campaign-scoped persistence v2`
4. `Bind runtime events to canonical mission keys`
5. `Register the Sera campaign`
6. `Migrate Sera M01 to sera-m01`
7. `Migrate Sera M02 to sera-m02`
8. `Migrate Sera M03 to sera-m03`
9. `Remove Sera replacement compatibility paths`
10. `Add permanent campaign isolation regression gate`

一つのコミットに基盤、セーブ移行、三ミッション移行をまとめない。各段階で旧E2EとセラE2Eを通し、壊れた段階を特定できる粒度を維持する。

## 10. 必須回帰テスト

### 登録

- 全ミッションキーが一意
- 全キャンペーンIDが登録済み
- `campaignOrder`がキャンペーン内で重複しない
- `m01`と`sera-m01`が同時に存在
- `m02`と`sera-m02`が同時に存在
- `m-heli`と`sera-m03`が同時に存在
- セラペイロードが旧ミッション数を減らさない

### 進行・記録

- 旧M01クリアでセラM02が解禁されない
- セラM01クリアで旧M02が解禁されない
- ランク、スコア、タイム、optional markが独立
- ACE解禁がキャンペーン別
- 財布と購入機体がキャンペーン別
- ページ再読み込み後も独立状態を保持

### 無線・イベント

セラM01〜M03で次が一度でも出たらFAIL:

```text
SKYEYE
HAMMER 1
HAMMER 2
DAGGER 1
NORTHSTAR
SICKLE 2
```

旧USA/RUSで次が出たらFAIL:

```text
MERIDIAN
CROWN
LARK
RAVEN
```

### Retry・チェックポイント

- 失敗したミッション自身へ復帰
- 別キャンペーンのチェックポイントを読まない
- M01の突破数、M02の施設/TEL、M03の着陸/APCが別ミッションへ残らない
- event handlerが二重起動しない
- campaign switch後に古いradio queueを再生しない

### 既存機能

- 旧USA/RUSの既存回帰がgreen
- セラM01/M02/M03の既存E2Eがgreen
- M03のゼロ着陸S、四到達fail、Retryが維持
- pageerror 0 / console error 0
- registry gate green

## 11. ロールバック

各Phase開始時のcommit SHAを記録する。失敗時はそのPhaseだけを戻せるよう、次を守る。

- スキーマ追加とデータ移行を別コミットにしない。ただし旧データ削除は後続コミットまで行わない。
- V1バックアップは移行完了後も当面残す。
- 新キー移行中も旧ミッションを削除しない。
- セラM01〜M03は一つずつ移行し、三本同時切替をしない。
- 互換ブリッジ削除は全E2E green後に行う。

## 12. 完了条件

次の全項目が揃った時だけ「キャンペーン分離完了」とする。

1. 三キャンペーンが同じビルドに独立登録される。
2. 旧ミッションとセラM01〜M03が同時に存在する。
3. セラペイロードが旧ミッションを削除・置換しない。
4. 記録、解禁、経済、難易度が独立する。
5. 無線、僚機、ストーリーイベントが相互に混入しない。
6. Retryとチェックポイントが`campaignId + missionKey + attemptId`を照合する。
7. 旧E2EとセラM01〜M03 E2Eがすべてgreen。
8. セーブV1からV2への移行が冪等で、バックアップから復元可能。
9. `sera-m04`を旧ミッションに触れず追加できる。
10. 未登録キャンペーンがUSAへ黙ってフォールバックしない。

## 13. 次の作業

最初の実装作業はM04ではなく、**Phase 0の依存監査とキャンペーン隔離テストの骨格作成**とする。監査結果を基にPhase 1へ進み、M01、M02、M03を順番に独立させる。
