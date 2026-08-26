# Documentation Index

このディレクトリには、現在有効な設計、実装状況、過去の仕様書、調査記録が同居しています。既存リンクや自動処理を壊さないため、今回の整理では大規模なファイル移動を行わず、**正本と履歴を索引で区別**します。

## 最初に読む文書

1. [リポジトリREADME](../README.md) — 起動方法、構成、現在地
2. [セラキャンペーン実装状況](implementation/sera_act1_status.md) — M01〜M10の実在範囲と検証状態
3. [ストーリー正本入口](story_reboot/CURRENT_PLAN.md) — 現行の物語、マップ、戦力、機体解禁文書
4. [M10 LAST TRAIN実装計画](implementation/sera_m10_last_train_implementation_plan.md) — 最新ミッションの契約と完了状況
5. [キャンペーン分離計画](architecture/campaign_isolation_plan.md) — 完了済み構造移行の設計根拠
6. [セラACT I安全実装計画](implementation/sera_act1_safe_implementation_plan.md) — M01〜M05で確立した実装原則

## 文書の優先順位

同じ内容が複数文書で食い違う場合は、次の順に優先します。

1. **現在のコードと永続CI**
2. **`implementation/*_status.md`**
3. **`architecture/*_plan.md`または決定文書**
4. **ストーリー正本** — このcheckoutの`docs/story_reboot/CURRENT_PLAN.md`から参照する非versioned文書
5. **個別の実装計画**
6. **`spec_*.md`、`request_*.md`、`roadmap_*.md`**
7. **調査・バグハント・作業ログ**

計画書のチェックボックスより、実際のコードとE2E結果を優先します。

## ディレクトリとファイル群

### `architecture/`

今後の構造変更と移行計画を置きます。

- [campaign_isolation_plan.md](architecture/campaign_isolation_plan.md) — 完了済みのキャンペーン、記録、無線、経済分離の設計根拠

### `implementation/`

現在の実装状況、実装順、機能ごとの安全計画を置きます。

- [sera_act1_status.md](implementation/sera_act1_status.md) — 現在地の正本
- [sera_act1_safe_implementation_plan.md](implementation/sera_act1_safe_implementation_plan.md) — ACT I全体の安全実装方針
- [sera_m03_low_water_safe_implementation_plan.md](implementation/sera_m03_low_water_safe_implementation_plan.md) — M03個別計画
- [sera_m08_night_audit_implementation_plan.md](implementation/sera_m08_night_audit_implementation_plan.md) — M08個別計画
- [sera_m08_night_audit_report.md](implementation/sera_m08_night_audit_report.md) — M08完成報告と検証結果
- [sera_m09_iron_harvest_implementation_plan.md](implementation/sera_m09_iron_harvest_implementation_plan.md) — M09個別計画
- [sera_m10_last_train_implementation_plan.md](implementation/sera_m10_last_train_implementation_plan.md) — M10個別計画と完了チェックポイント
- [air_iff_foundation.md](implementation/air_iff_foundation.md) — 三色IFF基盤

### `spec_*.md`

特定機能を実装した時点の仕様です。現在のコードと異なる場合があります。新しい設計判断を追記する場所ではなく、実装時の根拠・履歴として扱います。

### `request_*.md`

過去の実装依頼です。完了後も、要求の原文と制約を確認するために残します。

### `findings_*` / `night_ops_*` / `closure_*`

バグハント、夜間検証、修正報告などの作業記録です。設計の正本ではありませんが、再発調査の証拠として保持します。

### `PLAN.md`と`roadmap_*.md`

ルートの`PLAN.md`と各種ロードマップは、プロジェクト初期からの進化を示す履歴です。現在のセラ編実装順は、`implementation/sera_act1_status.md`と`story_reboot/CURRENT_PLAN.md`で判断します。

## 今後の命名規約

新しい文書は、役割が分かる名前にします。

```text
*_status.md    GitHub上の現在地と検証済み範囲
*_plan.md      未実装の手順、順序、受入条件
*_decision.md  採用した設計と不採用案
*_report.md    実行済み調査・検証結果
```

日付は本文メタデータに書き、同名の履歴を複数残す必要がある調査バッチだけファイル名へ付けます。

## 整理方針

- 既存文書は、参照元を確認するまで移動・削除しない。
- 新しい正本は`architecture/`または`implementation/`へ置く。
- 古い文書の内容を黙って書き換えず、索引から現在の正本へ誘導する。
- 自動検証とコードが文書より先に進んだ場合は、まず`*_status.md`を更新する。
