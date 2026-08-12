# Sortie ブランチ運用

**更新日:** 2026-08-12
**状態:** 統合作業完了

## 正本

| ブランチ | 役割 |
|---|---|
| `main` | 安定版 |
| `chatgpt/sera-act1-implementation` | 新キャンペーンの計画書と実装をまとめた開発正本 |

計画書専用だった`chatgpt/story-campaign-reboot`は開発正本へ統合し、今後は分離しない。

## アーカイブ

`archive/legacy-branches-20260812`は、2026-08-12以前の旧実装枝、一回限りの適用workflow、旧payloadを履歴として保持する。通常開発ではcheckout、merge、rebaseの対象にしない。

## マップ作業の保護

- ローカル`codex/sera-m04-m05-prep`は別Codexが編集中。checkout、merge、rebase、clean、stash、worktree削除を行わない。
- `payloads/map_naharStrait.payload.js`、関連検査スクリプト、`artifacts/`の未コミット差分を、ほかの整理コミットへ含めない。
- 既存の`chatgpt/map-texture-*`リモート枝は、マップ担当の作業が完了するまで整理対象外とする。

## 今回の整理

- M04／M05、敵機進行、描画距離、最上位3機調整の8コミットを開発正本へfast-forward。
- 現行計画と計画書索引を開発正本へ統合。
- 正本から到達可能、またはCI起動マーカーだけだった57本を削除。
- 残る非マップ旧枝21本を単一アーカイブへ集約して個別枝を削除。
- マップ系4本とマップ編集中のローカル枝は維持。

## 今後の規則

- 新しい計画書も実装も`chatgpt/sera-act1-implementation`から短期枝を切る。
- 短期枝は統合後に削除する。
- 復旧点が必要な場合は、重複する`backup/*`を複数作らず、日付付きタグか単一アーカイブを使う。
- `final`、`last`、`real`、`safe`など意味が重なる枝名を増やさない。
- CI再実行だけの枝は、実行終了後に削除する。
