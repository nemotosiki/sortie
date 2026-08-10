# Sera ACT I — 実装ステータス台帳

このファイルは「何を作るか」ではなく、**GitHub上に何が実在し、どの範囲まで自動検証済みか**だけを記録する。

**更新日:** 2026-08-10  
**対象ブランチ:** `chatgpt/sera-act1-implementation`

## 現在地

- M01 `FIRST CONTACT`: **自動E2Eでテストプレイ可能**
- M02 `SHATTERED MORNING`: **自動E2Eでテストプレイ可能**
- 人間による通しプレイ／難易度別バランス／音／視認性の調整: **未完了**
- M03〜M05: **未実装**

開発起動URL:

```text
M01:
index.html?payloads=payloads/map_renBay.payload.js,payloads/mission_sera_m01.payload.js

M02:
index.html?payloads=payloads/map_amalPlain.payload.js,payloads/mission_sera_m02.payload.js
```

`TEL`は現在の機体・地上兵器レジストリへ既に統合済みなので、M02起動時に旧`ground_tel.payload.js`を重ねて読み込まない。

---

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
- [x] 失敗後のRetryで突破数・僚機編成をリセット
- [x] クリーンクリア後、実ゲームの結果確定処理を通ってM02を選択・起動可能
- [x] pageerror 0 / console error 0
- [x] registry gate / 三色IFF / Ren Bay / M01 host契約がgreen

## M02で実在・検証済み

### マップと編成

- [x] 新規`amalPlain`マップ
- [x] 夜明けの乾燥平原、農地、集落、東西軍用道路、南北連絡路
- [x] 南レーダー施設と北通信中継施設を地形上へ配置
- [x] ROOK 1 CROWN=`f4`（F-4E）
- [x] ROOK 3 LARK=`f16`（F-16C）
- [x] RAVENのプレイヤー機は自由選択
- [x] MERIDIAN / CROWN / LARKの個別無線

### Phase 1 — 残存航空隊

- [x] 赤TGT MiG-29×4
- [x] 白・ランク中立 MiG-29×4
- [x] 白敵を全滅させなくても次段階へ進行可能

### Phase 2 — 二方向の攻撃機

- [x] 南施設へSu-24M×2
- [x] 北施設へSu-24M×2
- [x] 各攻撃隊に白・ランク中立MiG-29×2
- [x] Su-24Mが指定された施設へ進入する複数施設対応
- [x] 施設ごとのHP・被弾・喪失状態
- [x] 施設を一つ失ってもMISSION FAILEDにしない
- [x] 施設喪失時は最高評価をAへ制限
- [x] CROWNが指揮官のまま、攻撃順だけをRAVENへ任せる無線

### Phase 3 — TEL車列

- [x] Phase 3まで車列を生成しない遅延地上フェーズ
- [x] 赤TGT TEL×4
- [x] 白・ランク中立地上護衛×6
  - Shilka×2
  - SA-13×2
  - T-72×2
- [x] 白・ランク中立の上空援護MiG-29×4
- [x] `groundMarkClear`ゲートでTELだけが最終クリア条件
- [x] 白敵が残っていてもTEL全滅でクリア
- [x] TELが1両でも西端へ到達するとMISSION FAILED
- [x] 失敗後のRetryで施設・車列・結果待ち状態を初期化

### 結果・回帰

- [x] M02クリア記録を`sortieMissionRecords.m02`へ保存
- [x] 現在の第3キャンペーン枠（将来M03で置換予定の`m-heli`）を解禁
- [x] pageerror 0 / console error 0
- [x] registry gate / 三色IFF / Amal Plain / M02 host契約がgreen
- [x] M02実装後もM01のclear / fail / retry / 次任務起動E2Eがgreen

---

## 永続回帰ゲート

### M01

`.github/workflows/verify-sera-m01-e2e.yml`

1. 静的契約
2. registry消失検査
3. Chromium実機起動
4. 通常メニュー経路
5. 失敗→Retry
6. クリーンクリア→M02起動
7. CROWN F-15C / LARK F-16C

### M02

`.github/workflows/verify-sera-m02-e2e.yml`

1. Amal Plain / M02 / host静的契約
2. ベースとpayload適用後のregistry消失検査
3. Chromium実機起動
4. CROWN F-4E / LARK F-16C
5. 二施設へのSu-24M進入
6. 施設喪失時のA上限制御
7. TELフェーズの遅延生成
8. TEL全滅クリア／白敵残存許可
9. TEL逃走失敗→Retry
10. M02結果保存→第3キャンペーン枠解禁
11. M01フルE2E再実行

どちらも一時的なコード注入、自動修正、自動コミットを行わない**読み取り専用CI**とする。

---

## 「完成」と呼ぶ前に残る作業

### M01

- [ ] NORMALを人間が最初から最後まで飛び、標準10〜12分に収まるか確認
- [ ] EASY / HARD / ACEの敵圧とSランク可能性を確認
- [ ] 無線テンポ、Ren Bayの視認性、投弾線、BGM／効果音／音量を実機確認

### M02

- [ ] NORMALを人間が最初から最後まで飛び、目標尺へ収まるか確認
- [ ] Su-24Mの実時間進入速度と迎撃猶予を調整
- [ ] TEL速度、道路長、初見での発見距離、逃走猶予を調整
- [ ] EASY / HARD / ACEで施設防衛とTEL阻止が理論上可能か確認
- [ ] 白敵を無視する攻略と、脅威排除を優先する攻略の両方を実機確認
- [ ] CROWNの委任無線が戦闘に埋もれないか確認
- [ ] Amal Plainの道路・施設・赤TGTの視認性を実画面で確認
- [ ] BGM／効果音／音量を実耳確認

---

## 次の実装

M01/M02の人間プレイ調整と並行して、現在の第3USA枠`m-heli`を正式なM03 `LOW WATER`へ置換する。M01/M02で作った以下の基盤は再実装せず再利用する。

- 複数ROOK僚機
- 個別無線話者
- 三色IFFとランク中立
- 複数保護施設
- 遅延地上フェーズ
- 移動目標の逃走失敗
- ミッション専用E2Eフック

---

## 報告判定

- `GitHub保存済み`: commit SHA + branch HEAD + file refetch確認済み
- `静的check済み`: 構文・契約check green
- `E2E済み`: Chromiumで対象経路を実行し、pageerror 0
- `テストプレイ可能`: clear / fail / retry / 次枠解禁が自動E2Eで通る
- `完成`: 上記に加え、人間の通しプレイと難易度／音／視認性の確認が終わった状態
