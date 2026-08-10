# Sera ACT I — 実装ステータス台帳

このファイルは「何を作るか」ではなく、**GitHub上に何が実在し、どの範囲まで自動検証済みか**を記録する。

**更新日:** 2026-08-10
**対象ブランチ:** `chatgpt/sera-act1-implementation`

## 現在地

- M01 `FIRST CONTACT`: **自動E2Eでテストプレイ可能**
- 人間による10〜12分の通しプレイ／難易度別バランス調整: **未完了**
- M02〜M05: **未実装**
- 開発起動URL:

```text
index.html?payloads=payloads/map_renBay.payload.js,payloads/mission_sera_m01.payload.js
```

## M01で実在・検証済み

- [x] Ren Bayマップを使用
- [x] キャンペーン選択→ミッション選択→ブリーフィング→機体選択→出撃の通常UI経路
- [x] ROOK 1 CROWNとROOK 3 LARKを別々の青い僚機として生成
- [x] 正史機体: CROWN=`f15c` / LARK=`f16`
- [x] MERIDIAN / CROWN / LARKの個別無線話者
- [x] 開幕の白いMiG-29×2と75秒clear-or-timeoutゲート
- [x] 赤TGTのTu-22M3×6
- [x] 白い非TGTのMiG-29×10（開幕2＋護衛8）
- [x] 白敵はランク母数外で、残存していてもクリア可能
- [x] 爆撃機0突破＝完全防衛
- [x] 爆撃機1突破＝任務続行、S不可
- [x] 爆撃機2突破＝MISSION FAILED
- [x] 失敗後のRetryで突破数・僚機編成をリセットし、保存済みチェックポイントから再開
- [x] クリーンクリア後、実ゲームの結果確定処理を通ってM02を選択・起動可能
- [x] pageerror 0 / console error 0
- [x] registry gate / 三色IFF / Ren Bay / M01 host契約がgreen

## 永続回帰ゲート

`.github/workflows/verify-sera-m01-e2e.yml` は今後、M01・Ren Bay・host・検証コードの変更時に次を再確認する。

1. 静的契約
2. registry消失検査
3. Chromium実機起動
4. 通常メニュー経路
5. 失敗→Retry（チェックポイント対応）
6. クリーンクリア→M02起動
7. CROWN F-15C / LARK F-16C

一時的なコード注入・自己削除・自動コミットは行わない、読み取り専用CIとする。

## M01を「完成」と呼ぶ前に残る作業

- [ ] 人間がNORMALを最初から最後まで飛び、標準10〜12分に収まるか確認
- [ ] EASY / HARD / ACEの敵圧とSランク可能性を確認
- [ ] 無線が実際の戦闘テンポに対して遅れないか耳で確認
- [ ] Ren Bayの視認性・敵進入方向・爆撃機の投弾線を実画面で確認
- [ ] BGM／効果音／音量の実耳確認
- [ ] payload運用のまま次ミッションを作るか、本体へinlineする時期を決定

## 次の実装

M01の人間プレイ調整と並行して、M02 `SHATTERED MORNING`へ進む。M01のhost拡張（複数僚機、個別話者、三色IFF、突破ルール）は再実装せず再利用する。

## 報告判定

- `GitHub保存済み`: commit SHA + branch HEAD + file refetch確認済み
- `静的check済み`: 構文・契約check green
- `E2E済み`: Chromiumで対象経路を実行し、pageerror 0
- `テストプレイ可能`: 通常UIから開始し、clear / fail / retry / 次ミッション起動が自動E2Eで通る
- `完成`: 上記に加え、人間の通しプレイと難易度／音／視認性の確認が終わった状態
