# Sera M09 IRON HARVEST 実装計画

**作成日:** 2026-08-12
**実装ブランチ:** `codex/sera-m09-iron-harvest`
**基点:** `4202187` (`chatgpt/sera-act1-implementation`)
**状態:** 実装完了（独立ブランチ検証済み）

## 1. 正本と境界

この計画は新しい物語仕様を作らず、次の正本を実装単位へ落とす。

- `docs/story_reboot/11_sera_act2.md` の M09 `IRON HARVEST`
- `docs/story_reboot/v0.12/01_map_mission_matrix.md` の `karanPlain`
- `docs/spec_map_batch1_20260803.md` のカラン平原要件
- `docs/story_reboot/v0.14/01_character_route_implementation_plan.md` の人物配置
- `docs/story_reboot/v0.15/03_crown_lark_aircraft_canon.md` の LARK `F/A-18F + 4AGM`
- `docs/story_reboot/v0.17/00_player_aircraft_unlock_schedule_and_mission_difficulty.md` の難度・A-10C主役設計
- `docs/story_reboot/v0.17/02_f15_mid_tier_f35_unlock_correction.md` の敵航空戦力制限

旧 `PLAN.md` の「M9 バリエーション拡充」は開発マイルストーン名であり、本ミッション番号 M09 とは別扱いにする。

## 2. プレイ契約

### 2.1 戦場

- 新規ワールド `karanPlain` を作る。
- 高度から読める耕作地区画、南北道路、河川、高架橋、農村、防風林を置く。
- 軍用車列と避難車列が同じ道路網を使うことを、上空から視覚的に判別できる配置にする。

### 2.2 敵・非目標・味方

- 赤TGT: 戦車8、SPAAG4、MLRS3、移動指揮車1、Ka-52級2。
- 白の任意交戦: Su-25級4、MiG-29A正規隊2。航空戦力で難度を水増ししない。
- 青の保護対象: ケデム戦車4、避難バス4、救急車1。
- LARKは `F/A-18F` で参加し、対地任務の台詞と判断補助を担う。CROWNは前線へ出さない。

### 2.3 優先順位のトレードオフ

- MLRSが生存中は味方戦車へ継続砲撃し、全滅で任務失敗とする。
- 移動指揮車を先に破壊するとMLRSの射撃間隔は延びるが、残存敵戦車が避難車列側へ散開する。
- MLRSを先に破壊すると味方地上軍を守りやすい。敵戦車を先に減らせば、指揮車破壊後の民間車混在を抑えられる。
- 民間車は青IFF・手動選択可能・自動ロック対象外とする。誤射はスコア減点とランク上限へ反映し、3両喪失で任務失敗とする。

## 3. 実装単位

1. `payloads/map_karanPlain.payload.js`
2. `payloads/mission_sera_m09.payload.js`
3. 汎用ground contactへ `friendly / protected / lossPenalty / missionRole / dispersePath` を安全に引き渡す薄いホスト拡張
4. M09専用のMLRS砲撃、指揮車撃破後の散開、民間損失、ランク上限、debug probe
5. payload単体検証、ホスト契約検証、Playwright実動作検証

## 4. ブランチ統合順

このブランチはM06〜M08と同じ基点から独立している。通常起動へのinlineは、先行ミッションのブランチが統合され `sera-m08` が登録された後に行う。

それまでは `?payloads=` の開発経路と `forceStartMissionByKey("sera-m09")` で実プレイ検証する。ミッションpayload自体は `sera-m08` を正規前提として検査し、E2Eだけがテスト用の最小 predecessor fixture を先に読み込む。

## 5. 完了条件

- [x] `karanPlain` の必須景観がワールドプレビューで視認できる。
- [x] M09の全24敵接触、5保護車両、4味方戦車が実体としてspawnする。
- [x] MLRS放置で味方損失、全滅でFAILEDになる。
- [x] 指揮車先行撃破で残存敵戦車が避難車列側へ散開する。
- [x] 民間車が青表示になり、自動ロックされず、手動選択はできる。
- [x] 民間誤射の減点、ランク上限、3両喪失FAILEDが機能する。
- [x] 全赤TGT撃破でACCOMPLISHEDになる。
- [x] payload検証、ホスト検証、ブラウザE2Eで例外・console errorがない。

## 6. 完了記録

2026-08-12 に次を確認した。

- `node tools/check_map_karan_plain.mjs`
- `node tools/check_sera_m09_payload.mjs`
- `node --experimental-vm-modules tools/check_sera_m09_host.mjs`
- `node tools/check_sera_m09_e2e.mjs`
- `node tools/inline_payload.mjs payloads/map_karanPlain.payload.js payloads/mission_sera_m09.payload.js --dry-run`
- `git diff --check`

E2EではA-10Cで出撃し、33接触（赤18、白6、青9）の生成、LARKのF/A-18F + 4AGM、MLRS砲撃、指揮車破壊後の戦車散開、民間損失3段階、地上軍全滅、全TGT撃破の各経路を実ブラウザで通した。

`tools/registry_gate.mjs` は、本ブランチが触れていない既存M01/M02の配列長フィールド14件について基点時点のsnapshot不一致を報告する。このブランチではsnapshotを更新せず、統合時に既存側の不一致を解消してから通常起動へinlineする。
