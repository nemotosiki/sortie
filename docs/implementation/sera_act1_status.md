# Sera campaign — 実装ステータス台帳

このファイルは「今後何を作るか」ではなく、現在の通常起動に何が実在し、
どこまで自動検証済みかを記録する正本である。ファイル名は既存リンクを
壊さないため `sera_act1_status.md` のまま維持する。

**更新日:** 2026-08-27

**確認ブランチ:** `codex/sera-m10-last-train`

**確認HEAD:** M10完成チェックポイント（本status更新コミットの親まで）

## 現在地

- SeraはUSA/RUSと分離された第三キャンペーンとして通常起動から選択可能。
- `sera-m01`〜`sera-m10`が `campaignOrder: 1..10` で通常起動へ統合済み。
- M09クリア前はM10がロックされ、M09クリア後にM10が通常UIから解禁される。
- M01〜M03、M07〜M10はclear / fail / Retryを専用Chromium E2Eで確認済み。
- M04〜M06は通常起動・payload契約・host hookまで統合済みだが、専用の全経路E2Eが未整備。
- 人間による全難易度の通しプレイ、音量、視認性、最終バランス調整は未完了。

通常起動:

```text
http://127.0.0.1:8000/index.html
```

開発中に全Seraミッションを直接選ぶ場合:

```text
http://127.0.0.1:8000/index.html?seraDev=1
```

## キャンペーン基盤

- [x] USA / RUS / Seraのミッション一覧、財布、購入機体、進行記録を分離
- [x] Sera固有キー `sera-m01`〜`sera-m10`
- [x] 旧 `m01` / `m02` / `m-heli` とSera版の同居
- [x] 旧記録のバックアップ付き移行と既存Sera記録の保護
- [x] MERIDIAN / CROWN / LARKのSera無線解決
- [x] キャンペーン内だけでつながる順次解禁
- [x] 通常起動で10ミッションを登録
- [x] registry gateで既存entry/field消失0

## ミッション台帳

| No. | キー / タイトル | マップ | 実装済み主契約 | 自動検証 |
|---|---|---|---|---|
| M01 | `sera-m01` FIRST CONTACT | Ren Bay | 白MiG-21bis導入戦、赤Tu-22M3迎撃、基地突破失敗、CROWN/LARK | 専用E2E |
| M02 | `sera-m02` SHATTERED MORNING | Amal Plain | 二施設防衛、Su-24M、TEL車列、施設損失ランク分岐 | 専用E2E |
| M03 | `sera-m03` LOW WATER | Sark Port | 武装輸送ヘリ着陸、APC変換、港湾司令所防衛 | 専用E2E |
| M04 | `sera-m04` NARROW SEA | Nahar Strait | 巡洋艦・イージス艦隊、EPOCH防衛、突破失敗 | payload / map browser gate |
| M05 | `sera-m05` PORT OF ASH | Sark Port Ash | 防空・装甲・指揮車・Ka-52、攻略経路と結果引継ぎ | payload gate |
| M06 | `sera-m06` WHITE PASS | White Pass | EWR/SAM/SPAAG、POLKA通過、SEAD/追撃選択、CROWN生存 | payload gate |
| M07 | `sera-m07` BLACK CURRENT | Damar Sea Storm | SEALIGHT自動救助、護衛HPゲージ、MiG-29A、Su-33の2+2+2増援 | 専用E2E |
| M08 | `sera-m08` NIGHT AUDIT | Orm Basin Night | 支払中継器/燃料施設の二経路、停電、VESPER、撤退 | 専用E2E |
| M09 | `sera-m09` IRON HARVEST | Karan Plain | 三色IFF、Kedem護衛、MLRS圧力、民間損失と指揮車分岐 | 専用E2E |
| M10 | `sera-m10` LAST TRAIN | Nor Industrial Dusk | 8両装甲列車、橋破壊/精密攻撃、貨車逃走、結果永続化 | 専用E2E |

## 現在の回帰ゲート

### 全体

- `tools/check_campaign_shell.mjs`: Sera 10ミッション、strict campaign lookup、UI
- `tools/check_campaign_records.mjs` / `_e2e.mjs`: 旧記録移行とSera記録保護
- `tools/check_campaign_economy.mjs` / `_e2e.mjs`: 購入状態のキャンペーン分離
- `tools/registry_gate.mjs`: 19 registry tableのentry/field欠損検査
- `tools/check_target_cycle_e2e.mjs`: 三角/Tab連打時の例外と停止の回帰

### ミッション

- M01〜M10: `tools/check_sera_mNN_payload.mjs`
- M01〜M03: namespacing/isolation、host、専用E2E
- M07: 救助進行、護衛HP、増援、Retryの専用E2E
- M08: 通常UI起動、二経路、失敗、Retryの専用E2E
- M09: 33接触、三色IFF、護衛/民間分岐の専用E2E
- M10: 10ミッション順序、M09解禁、橋/精密/逃走/Retryの専用E2E

既存GitHub ActionsはM01〜M03の永続ゲートを保持している。M07〜M10の
ブラウザ検査は現時点ではローカルtoolとして実在し、CI workflow化は未完了。

## 人間確認が残る項目

- [ ] NORMALでM01〜M10を最初から順に通しプレイ
- [ ] EASY / HARD / ACEで各ミッションが理論上クリア可能か
- [ ] 無線テンポ、BGM、警報、効果音の音量バランス
- [ ] 遠距離描画、赤/白/青IFF、夜間・悪天候時の視認性
- [ ] M04〜M06の難易度、失敗条件、Retryを実プレイで重点確認
- [ ] M10の橋ルートと精密ルートの所要時間・評価差

## 次の実装境界

1. M04〜M06へ専用のclear / fail / Retry E2Eを追加する。
2. canonical storyのM11を監査し、専用計画とread-only preflightを作る。
3. M11を専用branch/worktreeで縦切り実装する。
4. M07〜M10のローカルE2EをCI workflowへ整理する。

M10以降の物語内容は `docs/story_reboot/`、実装時の具体的な受入条件は
各 `docs/implementation/sera_mNN_*_implementation_plan.md` を参照する。

## 報告判定

- `静的check済み`: 構文・payload・host契約checkがgreen
- `E2E済み`: Chromiumで対象経路を実行し、pageerror / console errorが0
- `テストプレイ可能`: clear / fail / Retry / 解禁を専用E2Eで確認
- `完成`: 上記に加え、人間の通しプレイと難易度・音・視認性を確認
