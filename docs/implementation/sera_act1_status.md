# Sera ACT I — 実装ステータス台帳

このファイルは「何を作るか」ではなく、**どこまでGitHub上で実在・検証しているか**だけを記録する。

## 現在地

- branch: `chatgpt/sera-act1-implementation`
- design source: `chatgpt/story-campaign-reboot@81936bb48afe019f62a460ce25a071df09794cce`
- safe plan: `ae5a710164b1eca2405a33e77bfddf8d28bebb31`
- current test-playable Sera M01: **NO**

## GitHub上で実在確認済み

- [x] 三色IFF基盤
- [x] `payloads/map_renBay.payload.js`
- [x] `tools/check_map_ren_bay.mjs`
- [x] `docs/implementation/sera_act1_safe_implementation_plan.md`

## まだ未完了

- [ ] preflight gate
- [ ] Ren Bay `worldPreview` E2E
- [ ] 複数ROOK僚機 host extension
- [ ] MERIDIAN / CROWN / LARK radio speaker extension
- [ ] `payloads/mission_sera_m01.payload.js`
- [ ] M01 bomber breach 0/1/2 logic
- [ ] M01 radio script
- [ ] M01 10〜12分 tuning
- [ ] M01通しプレイ
- [ ] Amal Plain / M02
- [ ] Sark Port接続 / M03
- [ ] Nahar Strait / M04
- [ ] Sark Port Ash / M05

## 現在確認されているhost gap

1. `FRIENDLY_DEPLOYMENTS` は `wingman: true` -> `spawnFriendlyWingman()` 1回で、CROWN + LARKの2機編成をそのまま表現できない。
2. `src/ui/radio.js` の標準話者は `command / wingman / enemy` で、USA表示は `SKYEYE / HAMMER 2` 固定。M01の `MERIDIAN / CROWN / LARK` を識別表示する互換拡張が必要。

## コミット台帳

| SHA | 状態 | 内容 |
|---|---|---|
| `fea681e98af8576d17858968b456d67920d6c578` | verified | 三色IFF基準 |
| `9122cae18b265ca397ffff3a0d9ac7d0683495c3` | recovered | Ren Bay map draft回収 |
| `fab7bee53570cf31e3ee52a4ae885cee5ffe462b` | recovered | Ren Bay static check回収 |
| `ae5a710164b1eca2405a33e77bfddf8d28bebb31` | verified | 失敗回避実装計画 |

## 次の一手

**Phase 0: preflight gateを1コミットで追加する。**

preflightが緑になるまで、新M01本体・M02以降には進まない。

## 報告判定

- `GitHub保存済み`: commit SHA + HEAD + file refetch確認済み
- `静的check済み`: 上記に加え構文/static gate green
- `E2E済み`: 実ブラウザでpageerror 0、対象機能を実行済み
- `テストプレイ可能`: mission selectから開始し、clear/fail/restartまで通る

この区別を以後崩さない。
