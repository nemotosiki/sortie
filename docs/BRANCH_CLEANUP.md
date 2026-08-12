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

## マップ統合

- Nahar Strait品質改善は`1f22693`として開発正本へ統合済み。
- 元の作業コミット`5d4e71b`と旧map枝は`archive/legacy-branches-20260812`へ保存済み。
- 確認画像3枚は`C:\Users\user01\Documents\AI\sortie-map-artifacts\2026-08-12-nahar-strait`へ退避済み。
- map作業用ローカル枝と旧`chatgpt/map-texture-*`リモート枝は削除済み。

## 今回の整理

- M04／M05、敵機進行、描画距離、最上位3機調整の8コミットを開発正本へfast-forward。
- 現行計画と計画書索引を開発正本へ統合。
- 正本から到達可能、またはCI起動マーカーだけだった57本を削除。
- 残る非マップ旧枝21本を単一アーカイブへ集約して個別枝を削除。
- 完成したマップ作業を開発正本へ統合し、map系11tipをアーカイブして個別枝を削除。

## 整理後のブランチ

```text
main
chatgpt/sera-act1-implementation
archive/legacy-branches-20260812
```

## 今後の規則

- 新しい計画書も実装も`chatgpt/sera-act1-implementation`から短期枝を切る。
- 短期枝は統合後に削除する。
- 復旧点が必要な場合は、重複する`backup/*`を複数作らず、日付付きタグか単一アーカイブを使う。
- `final`、`last`、`real`、`safe`など意味が重なる枝名を増やさない。
- CI再実行だけの枝は、実行終了後に削除する。
