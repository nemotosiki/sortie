# Sortie ブランチ整理方針

**更新日:** 2026-08-12
**状態:** 棚卸し済み。リモート削除は未実施。

## 正式に残すブランチ

| ブランチ | 役割 |
|---|---|
| `main` | 安定版 |
| `chatgpt/story-campaign-reboot` | ストーリー・計画書の正本 |
| `chatgpt/sera-act1-implementation` | セラキャンペーン実装 |

一時作業ブランチは、上記いずれかへ取り込んだ後に削除する。恒久的な復旧点が必要な場合は、同じコミットを指す複数の`backup/*`ではなく、説明付きタグを1個だけ作る。

## 保護中のローカル作業

- `codex/sera-m04-m05-prep`は別Codexがマップを編集中のため、checkout、merge、rebase、clean、stash、削除を行わない。
- `codex/story-plan-cleanup`は計画書整理専用で、マップpayloadやマップ検証ツールを変更しない。

## 削除候補A — 正式ブランチから完全に到達可能なbackup

次の21本は、リモート上の正式3ブランチから全コミットへ到達できる。内容を失わず削除できる候補だが、この整理ではまだ削除しない。

```text
backup/sera-act1-before-airframe-variants-20260810
backup/sera-act1-before-airframe-variants-20260810-2
backup/sera-act1-before-airframe-variants-20260810-final
backup/sera-act1-before-airframe-variants-20260810-last
backup/sera-act1-before-airframe-variants-20260810-real
backup/sera-act1-before-airframe-variants-20260810-safe
backup/sera-act1-before-f35c-spw-select-20260810
backup/sera-act1-before-fa18f-spw-select-20260810
backup/sera-act1-before-hud-restore-20260811
backup/sera-act1-before-inline-m01-m02-20260811
backup/sera-act1-before-m01-20260810
backup/sera-act1-before-m01-finish-20260810
backup/sera-act1-before-m03-20260812
backup/sera-act1-before-m03-host-landing-20260812
backup/sera-act1-before-multirole-mobility-20260810
backup/sera-act1-before-ocean-horizon-20260811
backup/sera-act1-before-ren-bay-continent-20260811
backup/sera-act1-before-ren-bay-horizon-20260811
backup/sera-act1-before-ren-bay-horizon-20260811-2
backup/sera-act1-m02-verified-before-cleanup-20260810
backup/story-before-crown-lark-aircraft-20260810
```

先頭6本はすべて同じ`219b229`を指しており、重複が確定している。

## 削除候補B — 正式ブランチへ取り込み済みの旧chatgptブランチ

```text
chatgpt/ace-combat-polish
chatgpt/fighter-roster-expansion
chatgpt/gun-identity
chatgpt/gun-identity-impl
chatgpt/reboot-air-iff-foundation
chatgpt/repo-structure
chatgpt/split-radio
chatgpt/texture-new-maps
```

いずれも正式3ブランチから全コミットへ到達可能。`ace-combat-polish`と`fighter-roster-expansion`は`main`と同じ`ea4fa97`を指す。

## 削除候補C — 取り込み済みのagentブランチ

```text
agent/merge-trigger-aircraft-selection
```

この1本は正式3ブランチから全コミットへ到達可能。ほかの`agent/*`は固有コミットの分類が終わるまで保留する。

## 削除候補D — CI再実行マーカーしか持たないagentブランチ

次の27本が正式3ブランチにないのは、`ready`などのCI起動マーカーだけで、ゲームコードや計画書は含まない。

```text
agent/coordinated-turn-trigger
agent/execute-low-speed-stall-tuning
agent/publish-combat-feedback-static
agent/restore-square-enemy-markers
agent/retrigger-ac7-type-a-gamepad
agent/retrigger-low-speed-stall-tuning
agent/run-aircraft-selection-artifact
agent/run-aircraft-selection-diagnostics
agent/run-aircraft-selection-indent-fix
agent/run-aircraft-selection-pr-check
agent/run-aircraft-selection-target
agent/run-aircraft-selection-tmp-artifact
agent/run-aircraft-selection-validation
agent/run-aircraft-selection-validation-v2
agent/run-combat-feedback-regression
agent/run-enemy-missile-terminal-hit-fix
agent/run-ironback-ace-validation
agent/run-lock-hud-targeting-regression
agent/run-lock-hud-view-validation
agent/run-low-speed-stall-regression
agent/run-missile-performance-tuning
agent/run-radar-restyle-publish
agent/run-radar-restyle-validation
agent/run-radio-system-foundation
agent/run-retreat-outro-validation
agent/run-target-arrow-hold-regression
agent/run-yaw-controls-validation
```

ワークフローの再実行履歴はGitHub Actions側に残るため、ブランチを恒久保存する必要はない。

## 保留 — 固有コミットを持つブランチ

- `backup/main-force-pushed-20260725`: 固有1コミット
- `backup/sera-act1-before-m02-20260810`: 固有2コミット
- 次の`agent/*` 7本はworkflow、適用スクリプト、payload、または`index.html`を含むため個別確認する:
  - `agent/expert-flight-controls`
  - `agent/fix-ac7-type-a-gamepad`
  - `agent/fix-lock-hud-targeting`
  - `agent/flight-combat-systems-v2`
  - `agent/restore-enemy-variants`
  - `agent/run-aircraft-selection-publish`
  - `agent/tune-low-speed-stall-envelope`
- その他の`chatgpt/*`: 16本が正式3ブランチにない固有コミットを持つ

これらは、固有差分が成果物か、CI起動専用コミットか、完全に破棄可能かを分類するまで削除しない。

## 現在の集計

```text
リモートブランチ総数（originポインタを除く） 85
正式に残す                                  3
削除候補                                   57
個別確認が必要                             25
```

## 今後の命名規則

- 正本: `main`、`chatgpt/story-campaign-reboot`、`chatgpt/sera-act1-implementation`
- 短期実装: `codex/<topic>`または`chatgpt/<topic>`
- 復旧点: `archive/<topic>-YYYYMMDD`タグを1個
- `backup/*-final-last-real-safe`のような意味の重なる枝は作らない
- CI再実行だけの枝は、完了後にその場で削除する
