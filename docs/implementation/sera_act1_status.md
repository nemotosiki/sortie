# Sera ACT I — 実装ステータス台帳

このファイルは「何を作るか」ではなく、**GitHub上に何が実在し、どの範囲まで自動検証済みか**を記録する。

**更新日:** 2026-08-12  
**対象ブランチ:** `chatgpt/sera-act1-implementation`

## 現在地

- M01 `FIRST CONTACT`: **自動E2Eでテストプレイ可能**
- M02 `SHATTERED MORNING`: **自動E2Eでテストプレイ可能**
- M03 `LOW WATER`: **自動E2Eでテストプレイ可能**
- 人間による通しプレイ、難易度別バランス、音、視認性の調整: **未完了**
- M04〜M05: **未実装**
- 旧USA/RUSとセラ編の構造分離: **計画確定、未実装**

通常起動:

```text
http://127.0.0.1:8000/index.html
```

M01〜M03の必要ペイロードは通常起動へ統合済み。開発時の個別ペイロード起動は、重複適用を避けて使用する。

## 重大な構造的負債

現在のセラ編は独立キャンペーンではなく、旧USA側のミッション枠を同じキーで差し替えている。

```text
M01 FIRST CONTACT      key=m01     campaign=usa
M02 SHATTERED MORNING  key=m02     campaign=usa
M03 LOW WATER          key=m-heli  campaign=usa
```

そのため、旧ストーリーイベント、無線話者、進行記録、解禁、経済、チェックポイントが混ざる余地がある。M03では移行途中の互換策として`m-heli`と正式記録`m03`を二重保存している。

M04着手前に、[キャンペーン分離計画](../architecture/campaign_isolation_plan.md)に従ってM01〜M03を`sera-m01`〜`sera-m03`へ移行する。

## M01で実在・検証済み

### マップと編成

- [x] Ren Bayマップ
- [x] 通常UI経路: キャンペーン選択 → ミッション選択 → ブリーフィング → 機体選択 → 出撃
- [x] ROOK 1 CROWNとROOK 3 LARKを別々の青僚機として生成
- [x] CROWN=`f15c` / LARK=`f16`
- [x] MERIDIAN / CROWN / LARKの個別話者

### 戦闘と結果

- [x] 開幕の白MiG-21bis×2と75秒clear-or-timeout
- [x] 赤TGT Tu-22M3×6
- [x] 白・非TGT MiG-21bis×4（開幕2＋45秒遅延増援2）
- [x] M01のMiG-29Aは0
- [x] 白敵はランク母数外で、残存していてもクリア可能
- [x] 爆撃機0突破＝完全防衛
- [x] 爆撃機1突破＝続行、S不可
- [x] 爆撃機2突破＝MISSION FAILED
- [x] Retryで突破数・僚機編成を初期化
- [x] クリーンクリア後に次のミッション枠を起動可能
- [x] pageerror 0 / console error 0

## M02で実在・検証済み

### マップと編成

- [x] Amal Plainマップ
- [x] 農地、集落、道路、南レーダー、北通信中継施設
- [x] CROWN=`f4` / LARK=`f16`
- [x] RAVENの機体は自由選択
- [x] MERIDIAN / CROWN / LARKの個別話者

### Phase 1 — 高速迎撃隊

- [x] 白・ランク中立 MiG-23×2（line / regular）
- [x] 60秒clear-or-timeoutで主任務へ進行
- [x] M02のMiG-29Aは0
- [x] 白敵を全滅させず進行可能

### Phase 2 — 二方向の攻撃機

- [x] 南施設へSu-24M×2
- [x] 北施設へSu-24M×2
- [x] 各攻撃隊に白・ランク中立MiG-21bis×2（計4機）
- [x] 施設ごとのHP、被弾、喪失
- [x] 施設を一つ失っても任務続行
- [x] 施設喪失時は最高評価A

### Phase 3 — TEL車列

- [x] 最終Phaseまで車列を生成しない
- [x] 赤TGT TEL×4
- [x] 白・ランク中立地上護衛×6
- [x] TEL段階では新たな戦闘機増援を出さない
- [x] TELだけが最終クリア条件
- [x] 白敵が残っていてもクリア
- [x] TELが1両でも西端へ到達するとMISSION FAILED
- [x] Retryで施設、車列、結果待ち状態を初期化
- [x] pageerror 0 / console error 0

## M03で実在・検証済み

### 通常起動と編成

- [x] `ground_heli_pack`、`map_sarkPort`、`mission_sera_m03`を通常起動へ統合
- [x] Sark Portマップ
- [x] CROWN=`f4` / LARK=`f16`
- [x] 港湾司令所と防空陣地2か所を保護施設として生成
- [x] 開幕の赤Ka-52×2
- [x] 白・ランク中立MiG-21上空援護
- [x] 遅延して進入する武装輸送ヘリ×3

### 着陸・地上戦

- [x] 輸送ヘリのAPPROACH → LANDING → UNLOAD状態遷移
- [x] 輸送ヘリ1機の着陸で赤APC TGT×2へ変換
- [x] APCが道路を移動して港湾司令所へ進入
- [x] APC到達ごとに司令所へ設定ダメージ
- [x] 司令所健全度と防空陣地生存によるS/A評価分岐
- [x] APC4両到達で司令所の物理破壊前にMISSION FAILED
- [x] Retryで着陸数、APC生成数、到達数、保護施設を初期化

### クリアと記録

- [x] ゼロ着陸ルートでSクリア可能
- [x] 白MiG-21が残存していてもクリア可能
- [x] `m-heli`互換記録を保存
- [x] `recordSource: "m-heli"`付きの正式`m03`記録を保存
- [x] pageerror 0 / console error 0

この二重記録は現行枠との互換措置であり、キャンペーン分離後は`sera-m03`へ統合する。

## 永続回帰ゲート

### M01

`.github/workflows/verify-sera-m01-e2e.yml`

- 静的契約
- registry消失検査
- 通常メニュー経路
- fail → Retry
- clean clear → 次枠起動
- CROWN F-15C / LARK F-16C

### M02

`.github/workflows/verify-sera-m02-e2e.yml`

- Amal Plain / M02 / host契約
- 二施設へのSu-24M進入
- 施設喪失時のA上限制御
- TEL遅延生成
- TEL全滅clear / 白敵残存許可
- TEL逃走fail → Retry
- M01フルE2E再実行

### M03

`.github/workflows/verify-sera-m03-e2e.yml`

- M03静的契約、Sark Port、registry gate
- 通常起動で必要ペイロードが適用済みであること
- Ka-52 / 輸送ヘリ / 白上空援護の重複戦闘
- 輸送ヘリ着陸とAPC変換
- 司令所健全度によるランク分岐
- APC4両到達fail → Retry
- ゼロ着陸S clear / 白敵残存許可
- `m-heli`と`m03`記録
- M02 / M01フルE2E再実行

すべて読み取り専用CIであり、自動修正や自動コミットを行わない。

## 人間確認が残る項目

### 共通

- [ ] NORMALを最初から最後まで飛び、目標尺に収まるか
- [ ] EASY / HARD / ACEで理論上クリア可能か
- [ ] 無線テンポと重要台詞の聞き取りやすさ
- [ ] BGM、効果音、警報、無線の音量バランス
- [ ] HUD、赤/白/青IFF、地上目標の視認性

### M01

- [ ] 標準10〜12分か
- [ ] 爆撃機の投弾線と迎撃猶予
- [ ] Ren Bayの空港・湾奥の認識性

### M02

- [ ] Su-24Mの進入速度
- [ ] TEL速度、道路長、発見距離、逃走猶予
- [ ] 白敵無視と脅威排除の両攻略

### M03

- [ ] 低高度でのクレーン・建物・水面の視認性
- [ ] 輸送ヘリの着陸猶予
- [ ] APCの発見距離と再攻撃時間
- [ ] 司令所、防空陣地、LZの位置関係
- [ ] ゼロ着陸Sと防空維持Sの難度差

## 次の実装

次はM04ではない。

1. キャンペーン／ミッションID依存の監査
2. キャンペーン隔離E2Eの骨格
3. `sera`キャンペーン登録基盤
4. 永続記録V2
5. M01を`sera-m01`へ移行
6. M02を`sera-m02`へ移行
7. M03を`sera-m03`へ移行
8. 旧置換コードと二重記録を清掃
9. 全回帰green後にM04着手

詳細は[キャンペーン分離計画](../architecture/campaign_isolation_plan.md)を参照。

## 文書の正本

- リポジトリ案内: [README.md](../../README.md)
- 文書索引: [docs/README.md](../README.md)
- 現在地: 本ファイル
- 構造移行: [campaign_isolation_plan.md](../architecture/campaign_isolation_plan.md)
- セラACT I安全実装: [sera_act1_safe_implementation_plan.md](sera_act1_safe_implementation_plan.md)
- ストーリー正本: `chatgpt/sera-act1-implementation`ブランチの`docs/story_reboot/CURRENT_PLAN.md`

## 報告判定

- `GitHub保存済み`: commit SHA、branch HEAD、file refetchを確認済み
- `静的check済み`: 構文・契約check green
- `E2E済み`: Chromiumで対象経路を実行し、pageerror 0
- `テストプレイ可能`: clear / fail / Retry / 次枠解禁が自動E2Eで通る
- `完成`: 上記に加え、人間の通しプレイと難易度、音、視認性の確認が完了
