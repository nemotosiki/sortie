# Sera M08 `NIGHT AUDIT` — 実装計画

**作成日:** 2026-08-12

**対象ブランチ:** `codex/sera-m08-night-audit`
**目的:** M08を、M06/M07未実装の現状でも個別payload起動で最後まで遊べる縦切りとして追加する。

## 1. 正本と上書き関係

- 物語と基本選択: `docs/story_reboot/11_sera_act2.md` のM08
- 地域・worldKey: `docs/story_reboot/v0.12/01_map_mission_matrix.md`
- VESPERとROOKの人物配置: `docs/story_reboot/v0.14/01_character_route_implementation_plan.md`
- 機体解禁と難度: `docs/story_reboot/v0.17/00_player_aircraft_unlock_schedule_and_mission_difficulty.md`

旧M08草案のSu-35×4は使わない。v0.17を優先し、通常戦力はMiG-29A、ネームドはMiG-29Aに搭乗するNIGHTJAR 1 `VESPER`とする。Su-35級の本格投入はM12まで温存する。

## 2. 今回の完成範囲

### マップ

- `regionId=orm_basin`
- `worldKey=ormBasinNight`
- 月夜の砂漠盆地
- 夜間飛行場、滑走路灯、格納庫、SAM陣地
- 軍用燃料区、油田フレア、決済中継所
- 中継所破壊時に消灯する民間集落

### ミッション

- `key=sera-m08`, `campaign=sera`, `campaignOrder=8`
- CROWNは前線離脱中。LARKはF/A-18FでROOK 2として同行
- F-111F低空攻撃機2機と電子戦機1機は作戦パッケージとしてブリーフィングと無線に登場
- 敵航空戦力はMiG-29A中心。VESPERは撃墜必須にせず、後続任務へ生存可能
- Su-24Mは基地から退避する攻撃隊として白・ランク中立で配置

## 3. 二つの攻略ルート

### A. `FUEL DENIAL`

赤TGTの防空・指揮系統・軍用燃料車を通常どおり破壊する。決済中継所は残るため、敵機のIFFと給与認証は維持され、VESPERを含む防空隊は戦闘を続ける。

完了条件:

- 赤TGT全滅
- 白敵と白い決済中継所は残存していてよい
- 後続記録へ`m08Choice=fuel`を保存できる結果スナップショットを持つ

### B. `RELAY BLACKOUT`

白表示のシェム決済中継所を破壊する。赤TGTが残っていても、敵機の給与・IFF認証停止を受けて全機撤退し、任務を完了する。民間集落の灯りも同時に消える。

完了条件:

- 中継所破壊を一度だけ検知
- 集落灯を消灯
- 敵航空機を武装停止・撤退状態へ移す
- 赤TGT残存中でもMISSION ACCOMPLISHED
- 後続記録へ`m08Choice=relay`と`m08CivilianBlackout=true`を保存できる結果スナップショットを持つ

## 4. フェーズと編成

### 開幕 — 低空侵入

- 赤SAMサイト×3
- 赤EW指揮車×1
- 赤移動指揮車×2
- 赤軍用燃料車×3
- 白決済車×3
- 白決済中継所×1
- MiG-29A `VESPER`×1、基地CAP MiG-29A×1

### 長期戦圧力

- 遅延QRA MiG-29A×2
- 退避中Su-24M×4
- 全航空機は白・ランク中立。地上の赤TGTからプレイヤーを引き離す役割に限定

## 5. ホスト拡張

payloadだけでは「白目標の破壊で赤TGTを残したまま勝利」「生きた敵機の撤退」「集落消灯」「分岐結果保存」を表現できない。`index.html`へM08専用の最小拡張を直列で加える。

- `m08ChoiceContract`を持つミッションだけで状態機械を有効化
- `sortieMarks`のrelay markを監視
- 既存航空AIへ`m08Retreating`分岐を一つ追加
- `recordMissionResult`へM08結果スナップショットを追記
- debug probe/force hookを追加し、ブラウザE2Eで分岐を再現可能にする

既存ミッション、通常AI、三色IFF、汎用ground phaseの意味は変更しない。

## 6. 実装順

1. `map_ormBasin.payload.js`と静的check
2. `mission_sera_m08.payload.js`と静的check
3. M08専用host extension
4. `seraDev=1`付きpayload URLでキャンペーン選択から通常出撃
5. fuel route clear
6. relay route clear・集落消灯・撤退
7. Retryで状態・照明・marksが初期化
8. registry gateと既存Sera回帰

## 7. 受入条件

- map/mission payloadが構文checkを通る
- `ormBasinNight`に飛行場、燃料区、中継所、集落、低空侵入用の盆地地形が存在
- `sera-m08`の赤TGT数、白接触数、VESPER、MiG-29/Su-24M編成が静的契約と一致
- `seraDev=1`付き開発URLでは通常メニュー経路からbriefing、hangar、出撃へ進める
- fuel routeとrelay routeの両方でclear可能
- relay routeでは赤TGTが残ったままclearし、航空機が撤退し、集落が消灯する
- fail後Retryで分岐状態が未選択へ戻る
- pageerror 0 / console error 0
- `registry_gate`で既存キー消失0
- 既存Sera M01〜M05の静的checkを壊さない

## 8. 今回は行わないこと

- M06/M07の代作
- M08を通常起動へinlineする作業、および通常起動時のSera移行ロック解除
- M06/M07未実装のまま恒久的な解禁順を確定すること
- 新しい汎用ルート分岐エンジンへの拡張
- Su-35の早期投入
- 人間による全難易度・音量・長時間バランス検収

開発中はM05の直後にM08を追加し、個別payload起動で検証する。M06/M07が追加された時点で、同じ`campaignOrder=8`のまま並びと解禁鎖を正規化する。
