# Sortie ブランチ運用

**更新日:** 2026-08-13
**状態:** `main`への正本統合完了

## 正本

| ブランチ | 役割 |
|---|---|
| `main` | 安定版かつ新規開発の正本 |

計画書、新キャンペーン、M01～M09、戦闘・飛行調整はすべて`main`へ統合し、今後は別の長期開発正本を置かない。

## アーカイブ

`archive/legacy-branches-20260812`は、2026-08-12以前の旧実装枝、一回限りの適用workflow、旧payloadを履歴として保持する。通常開発ではcheckout、merge、rebaseの対象にしない。

## マップ統合

- Nahar Strait品質改善は`1f22693`として開発正本へ統合済み。
- 元の作業コミット`5d4e71b`と旧map枝は`archive/legacy-branches-20260812`へ保存済み。
- 確認画像3枚は`C:\Users\user01\Documents\AI\sortie-map-artifacts\2026-08-12-nahar-strait`へ退避済み。
- map作業用ローカル枝と旧`chatgpt/map-texture-*`リモート枝は削除済み。

## 今回の整理

- `chatgpt/sera-act1-implementation`の全履歴を`main`へ統合。
- M07、M08、M09の短期実装枝を`main`から到達可能な履歴として統合。
- `agent/target-cycle-screen-priority`のHUD／ターゲット修正は、`main`側の後続修正と競合解消結果を正本とし、履歴上も統合済みとして整理。
- 統合済みの短期リモート枝は削除し、旧実装の復旧点だけを単一アーカイブに残す。

## 整理後のブランチ

```text
main
archive/legacy-branches-20260812
```

## 今後の規則

- 新しい計画書も実装も`main`から短期枝を切る。
- 短期枝は統合後に削除する。
- 復旧点が必要な場合は、重複する`backup/*`を複数作らず、日付付きタグか単一アーカイブを使う。
- `final`、`last`、`real`、`safe`など意味が重なる枝名を増やさない。
- CI再実行だけの枝は、実行終了後に削除する。
