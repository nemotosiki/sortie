# Sera ACT I — 失敗回避つき実装計画

**対象ブランチ:** `chatgpt/sera-act1-implementation`  
**作成日:** 2026-08-09  
**目的:** M01〜M05を、作業消失・未push・既存ゲーム破壊を起こさず、途中成果を必ずGitHubに残しながら実装する。

## 0. 検証済みの現在地

この計画を書き始める時点の、ゲーム実装側の確認済み基準点は次の通り。

- 実装ブランチ: `chatgpt/sera-act1-implementation`
- 回収前の三色IFF基準: `fea681e98af8576d17858968b456d67920d6c578`
- 回収済みRen Bay本体: `9122cae18b265ca397ffff3a0d9ac7d0683495c3`
- 回収済みRen Bay静的check: `fab7bee53570cf31e3ee52a4ae885cee5ffe462b`
- `payloads/map_renBay.payload.js` はGitHubから再取得済み
- `tools/check_map_ren_bay.mjs` はGitHubへ保存済み

ストーリー・ミッション設計の正本は実装ブランチへ丸ごとmergeしない。読み取り専用の正本として次を使う。

- source branch at planning time: `chatgpt/story-campaign-reboot`（現在は`chatgpt/sera-act1-implementation`へ統合済み）
- source commit: `81936bb48afe019f62a460ce25a071df09794cce`
- `docs/story_reboot/v0.16/README.md`
- `docs/story_reboot/v0.16/01_m01_first_contact.md` 〜 `05_m05_port_of_ash.md`

v0.16が古いACT I草案より優先する。

## 1. 今回の失敗から固定する絶対ルール

### R1. GitHubを保存先の正本にする

ローカル作業ディレクトリは一時領域とみなす。成果物の存在判定はローカルではなくGitHubで行う。

**完了条件:**

1. GitHubへのwriteが成功してcommit SHAを得る
2. ブランチHEADを再取得し、そのSHAへ進んでいることを確認する
3. 変更ファイルをGitHubから再取得できることを確認する

この3点が揃うまで「コミット済み」「完了」と報告しない。

### R2. 10〜15分以上を未保存で作業しない

- 原則「1機能 = 1コミット」
- 大きい機能は途中でも安全な境界でWIP/checkpoint commitを作る
- 1時間後に初めてpush、は禁止
- 1つのコミットにマップ・ミッション・無線・本体改造を混ぜない

### R3. 未確認の作業ディレクトリへ `cd` しない

ローカルツールが必要な場合は最初に必ず、

- ディレクトリ作成成功
- 対象repoであること
- 現在branch
- HEAD SHA
- remote URL

を確認する。1つでも取れなければ作業を開始しない。

可能な新規payload・docs・checkはGitHub Contents APIへ直接保存し、ローカルgitへの依存を減らす。

### R4. `index.html`を最初から変更しない

新マップ・新ミッションはまずdevelopment payload loaderで検証する。

例:

```text
index.html?worldPreview=renBay&payloads=payloads/map_renBay.payload.js
```

M01縦切り:

```text
index.html?payloads=payloads/map_renBay.payload.js,payloads/mission_sera_m01.payload.js
```

ここで通らないものを本体へinlineしない。

### R5. 本体拡張は不足が実証された時だけ

payloadで実現できないことをコード実体で確認してから、最小のhost extensionだけを別コミットにする。

本体変更コミットでは新ミッション内容を同時に入れない。

### R6. check失敗後に次工程へ進まない

失敗した工程を放置して別のマップやミッションを作らない。

```text
FAIL -> 原因修正 -> 同じcheckを再実行 -> GitHub確認 -> 次工程
```

### R7. 既存ゲームを常にrollback可能にする

各工程の開始SHAを記録し、問題が起きた場合はそのSHAまで戻せる粒度にする。

## 2. 事前監査で既に分かったホスト側の不足

M01 v0.16をそのまま実現するには、現在のhostに2点不足がある。

### 2.1 味方僚機が1機前提

現在の `FRIENDLY_DEPLOYMENTS` は `wingman: true` で `spawnFriendlyWingman()` を1回呼ぶ構造。

M01は

```text
ROOK 1 CROWN
ROOK 2 RAVEN (PLAYER)
ROOK 3 LARK
```

なので、CROWNとLARKの2機を同時に出すための後方互換拡張が必要。

方針:

- 旧 `wingman: true` は一切壊さない
- 新しく複数僚機を表現できる設定を追加する
- 既存USA/RUSミッションの僚機数・callsign・挙動が変わらないことを回帰checkする

### 2.2 無線話者が旧3種固定

現在の `src/ui/radio.js` は基本話者が

```text
command -> SKYEYE
wingman -> HAMMER 2
enemy   -> HOSTILE
```

で、USA側の表示名も固定されている。

M01では少なくとも表示上、

```text
MERIDIAN
CROWN
LARK
HOSTILE
```

を区別したい。

方針:

- 旧 `command / wingman / enemy` を残す
- 新話者IDを追加しても旧ミッションの表示・cooldown・priorityが変わらない設計にする
- この拡張をM01 scriptとは別コミットにする

## 3. M01を完成させる順序

M01を先に一本通し、その仕組みをM02〜M05へ再利用する。

### Phase 0 — 保存・検証ハーネス

**成果物:** この計画、実装status、preflight check。

チェック項目:

- branch HEADを取得できる
- `map_renBay.payload.js` をGitHubから取得できる
- payload APIに `addWorldPreset`, `addWorldDecorator`, `addMission`, `deployFriendlies` が存在する
- `registry_gate` と三色IFF checkが存在する

**コミット例:** `Add Sera Act I preflight gate`

ここが赤ならM01を書かない。

### Phase 1 — Ren Bay単体を緑にする

対象は `payloads/map_renBay.payload.js` だけ。

1. 構文check
2. `tools/check_map_ren_bay.mjs`
3. `worldPreview=renBay` でpageerror 0
4. 4方向から景観確認
5. 滑走路2本、terminal、hospital、heliport、city、breakwaterが視認できる
6. map切替後にdisposeリークがない

視覚修正が必要なら、このphase内でRen Bayだけを修正してコミットする。

**完了コミット例:** `Validate Ren Bay world preview`

### Phase 2 — 複数ROOK僚機のhost extension

CROWN/LARKを出せる最小拡張だけを行う。

受入条件:

- M01で青僚機2機を出せる
- CROWN / LARKを別個体として識別できる
- 旧 `wingman: true` ミッションは従来通り1機
- 既存escort/guardロジックを壊さない
- checkpoint復帰時に僚機が重複spawnしない

**コミット例:** `Support multiple mission wingmen`

この時点ではM01敵編成を変更しない。

### Phase 3 — MERIDIAN / CROWN / LARK無線話者

radio controllerへ後方互換の話者追加をする。

受入条件:

- 旧USA: SKYEYE / HAMMER 2のまま
- 旧RUS: NORTHSTAR / SICKLE 2のまま
- 新M01ではMERIDIAN / CROWN / LARKを表示可能
- priority、pre-emption、speaker cooldownが壊れない
- queue最大4の既存仕様を維持

**コミット例:** `Add ROOK radio speaker identities`

### Phase 4 — 新M01をpayloadで旧m01へ差し替える

新規:

```text
payloads/mission_sera_m01.payload.js
```

既存 `m01` は削除せず、payload適用時だけ安全にsplice -> `ctx.addMission()` で再正規化して差し替える。`story_events_1.payload.js` の既存replacement patternを踏襲する。

最初は最小構成でよい。

- world = `renBay`
- FIRST CONTACT briefing
- player start / battle center
- RED爆撃機6
- WHITE護衛10
- BLUE CROWN/LARK
- 三色IFF
- MISSION ACCOMPLISHEDまで到達

**このコミットでは条件付き無線を全部入れない。**

**コミット例:** `Wire Sera M01 FIRST CONTACT`

### Phase 5 — 爆撃機突破ルール

v0.16正本:

```text
0突破 = 完全防衛
1突破 = 継続、S不可
2突破 = MISSION FAILED
```

まず既存 `friendlyBase / bomber run / bombsDropped` がどこまで再利用できるかを実コードで確認する。再利用できるなら新メカニクスを作らない。

受入条件:

- 0突破で通常clear
- 1突破で続行
- 1突破時S不可
- 2突破でfail
- restart/checkpointでbreach countが正しくreset

**コミット例:** `Add M01 bomber breach rules`

### Phase 6 — M01無線script

v0.16の台詞を実装する。

役割分担:

- MERIDIAN = 正式指示
- CROWN = 短い助言、軽口、気遣い
- LARK = 近距離状況報告
- RAVEN = 無言

固定無線と条件付き無線を分離する。

一度に大量投入せず、最低限の固定線 -> 条件付き線の順に入れる。

受入条件:

- 同じidが連打されない
- NORMALが古くなって戦況後に喋らない
- CRITICALが必要時にpre-emptする
- CROWNが説教・人生訓を言わない
- MERIDIAN以外が正式MISSION UPDATEを奪わない

**コミット例:** `Add M01 ROOK radio script`

### Phase 7 — M01通しテストと調整

目標プレイ時間:

- 標準: 10〜12分
- 初見: 13〜15分
- hard cap: 16分

ここで初めて、

- spawn距離
- delay
- 敵数の微調整
- parTime
- S-rank
- radio間隔

を調整する。

HPを増やして時間を延ばさない。

**完了ゲート:**

- mission selectからM01を開始できる
- Ren Bayが表示される
- CROWN/LARKが青で存在
- 爆撃機が赤、護衛が白
- 6爆撃機を倒してclear可能
- 2機突破でfail
- pageerror 0
- registry gate green
- 三色IFF gate green
- restart可能
- 次の既存ミッションも起動可能

**コミット例:** `Tune Sera M01 vertical slice`

ここまで到達して初めて「新M01はテストプレイ可能」と報告する。

## 4. M02〜M05の反復手順

M01で基盤を完成させた後は、毎回次の順序を守る。

```text
MAP -> GitHub commit -> map preview gate
MISSION CORE -> GitHub commit -> clear/fail gate
RADIO -> GitHub commit -> radio gate
TUNING -> GitHub commit -> playtest gate
```

### M02 SHATTERED MORNING

1. `map_amalPlain.payload.js`
2. M02 mission core
3. air-to-air -> air-to-ground MISSION UPDATE
4. TEL + WHITE fighter interference
5. radio
6. tuning

### M03 LOW WATER

既存 `sarkPort` を作り直さない。

1. existing map connection
2. helicopter / transport landing logic
3. landing -> APC追加
4. BASTION / friendly presence
5. radio
6. tuning

### M04 NARROW SEA

1. `map_naharStrait.payload.js`
2. fleet mission core
3. RED cruiser/LHD + WHITE boats/fighters
4. MISSION UPDATE -> EPOCH defence
5. radio
6. tuning

### M05 PORT OF ASH

1. `sarkPortAsh` damage variant
2. geography equality check against `sarkPort`
3. ground advance
4. mobile command vehicle escape
5. M03/M04の小さな結果引継ぎ
6. radio
7. tuning

## 5. 各コミット後の必須確認

コミットごとに以下を実施する。

### GitHub persistence gate

- write結果のcommit SHAを記録
- branch HEADを再取得
- HEADが返されたSHAになっている
- 変更ファイルをそのbranch/commitから再取得

### JS/static gate

対象に応じて:

```text
node --check
専用check_*.mjs
registry_gate.mjs
check_air_iff_foundation.mjs
```

### E2E gate

mapなら `worldPreview`。missionならdevelopment payload queryで実際に起動する。

E2E未実施なら「実装済み」ではなく「静的check済み」と報告する。

## 6. 作業停止条件

次の場合、その場で止めて原因解決を優先する。

- GitHub commit SHAを取得できない
- branch HEADが想定SHAへ進まない
- GitHubから変更ファイルを再取得できない
- pageerror発生
- registry gate失敗
- 既存三色IFF回帰
- 既存missionが起動不能
- local working directoryが消えた / repoでない

**失敗したまま「余力があればM02も」のように横へ広げない。**

## 7. 報告ルール

ユーザーへは各大きなphase終了時に、推測ではなくGitHub実物で次を報告する。

```text
branch
commit SHA
変更ファイル
通ったcheck
未実施のcheck
現在テストプレイ可能か YES / NO
次のrollback point
```

「作った」「pushした」「テスト可能」は、それぞれ別の状態として扱う。

## 8. 最終的な安全ライン

最優先はM01〜M05を一気に大量実装することではない。

**最優先は、どの時点で作業が止まっても直前10〜15分以上の成果を失わず、GitHub上のSHAから必ず再開できる状態を保つこと。**

M01一本をこの方法で完成させてから、同じ型でM02〜M05へ進む。
