# Sortie 新キャンペーン 現行計画

**更新日:** 2026-08-27
**役割:** 計画書を読むときの唯一の入口
**全体規模:** 本編40ミッション＋EX4ミッション

この文書は詳細仕様を複製しない。各分野の正本、上書き関係、継続中・破棄済みの計画だけを管理する。実装状況は古い計画書のチェック欄ではなく、対象実装ブランチの履歴で確認する。

## 分野別の正本

| 分野 | 現在の正本 | 補足 |
|---|---|---|
| 実装済み範囲 | [Sera実装ステータス](../implementation/sera_act1_status.md) | M01〜M10の実在・検証状態。計画書より優先 |
| M01〜M05 | [v0.16 開戦章](./v0.16/README.md) | 各ミッションの地理、フェーズ、敵編成、無線、ランク条件 |
| M06〜M10 / M12〜M20 | [Sera Act II](./11_sera_act2.md) | M11の旧`FROZEN EYE`草案だけはv0.15で上書き済み |
| M11 | [FROZEN EYE 高高度基地攻撃・妨害周期実装計画](../implementation/sera_m11_high_altitude_strike_rework_plan.md) | 2026-08-27のユーザー指定による最新版。v0.15の高高度攻撃機護衛案を上書き |
| M07 | [BLACK CURRENT 実装計画](../implementation/sera_m07_black_current_implementation_plan.md) | Damar Sea救難護衛、SEALIGHT HP、増援、実装・検証記録 |
| M08 | [NIGHT AUDIT 実装計画](../implementation/sera_m08_night_audit_implementation_plan.md) | 夜間基地、燃料／決済経路、VESPER |
| M09 | [IRON HARVEST 実装計画](../implementation/sera_m09_iron_harvest_implementation_plan.md) | Karan Plain、三色IFF、Kedem護衛 |
| M10 | [LAST TRAIN 実装計画](../implementation/sera_m10_last_train_implementation_plan.md) | Nor Industrial、橋／精密攻撃の二経路 |
| プレイヤー機体解禁・難度 | [v0.17 解禁表](./v0.17/00_player_aircraft_unlock_schedule_and_mission_difficulty.md) | 同じ分野ではv0.7より優先 |
| F-15C / F-15E / F-35C | [v0.17 中盤機訂正](./v0.17/02_f15_mid_tier_f35_unlock_correction.md) | 解禁表の該当箇所を上書き |
| RETURN LINE・再武装 | [v0.17 帰還ライン](./v0.17/03_f35_multirole_return_line_doctrine.md) | F-35Cと長時間任務の運用契約 |
| 敵航空戦力・Act I編成 | [v0.16 敵戦力ドクトリン](./v0.16/00_enemy_force_doctrine_and_act1_compositions.md) | 序盤MiG-29A禁止を含む |
| キャラクター・部隊番号 | [v0.14 キャラクター正本](./v0.14/README.md) | 旧ROOK／CROWN／REEM番号を上書き |
| GIBOR最終戦・CROWN/LARK | [v0.15](./v0.15/README.md) | 最終戦、戦闘契約、任務訂正、搭乗機 |
| ARCA・三色IFF・実装順 | [v0.12 総合計画](./v0.12/00_master_30min_implementation_plan.md) | v0.10、v0.11を上書き |
| 地域・マップ接続 | [v0.12 接続台帳](./v0.12/01_map_mission_matrix.md) | `regionId / worldKey / sector / variant`の正本 |
| 非公開バックボーン | [v0.13](./v0.13/00_hidden_backbone_and_protagonist_routes.md) | 作者・実装者のみ。ゲーム本文で直接説明しない |
| 最上位3機 | [v0.8](./v0.8/00_top_tier_aircraft_profiles.md) | F-22、Su-57、F-3 |
| 暦・WAR DAY | [v0.6](./v0.6/01_main_calendar_rebased.md) | WAR DAY 333／666を含む |
| 本編40＋EX4構造 | [v0.5](./v0.5/00_40_plus_4_structure.md) | 旧M41表記は使わずEX04とする |
| 世界・全体ストーリー草案 | [基礎文書](./00_overview_world.md) | より新しい分野別正本がある箇所はそちらを優先 |

## 現在も継続する計画

### 統合済みの開戦章基盤

- M01〜M05のmission payload、M04対艦フロー、M05地上共同奪還フローを通常起動へ統合済み。
- Nahar Straitの地形、道路、港湾、建物、雲、遠景地形を品質改善済み。
- USA/RUS/Seraのキャンペーン、記録、購入状態、解禁鎖を分離済み。

### 開戦章（M01〜M05）

- セラM01〜M05をSeraキャンペーンとして接続済み。
- M04は対艦任務、M05は地上共同奪還任務として扱う。
- 序盤の敵戦闘機はMiG-21系を中心とし、MiG-29Aを早期の常用敵にしない。

### Act II（M06〜M10）

- M06 `WHITE PASS`からM10 `LAST TRAIN`まで正規順序で通常起動へ接続済み。
- M07 `BLACK CURRENT`はプレイヤー捜索ではなく、SEALIGHT救助隊へ救助を任せる護衛・迎撃任務として確定。護衛HPゲージとSu-33の2+2+2増援を実装済み。
- M08 `NIGHT AUDIT`、M09 `IRON HARVEST`、M10 `LAST TRAIN`の分岐結果とRetryを実装済み。
- M09クリア後にM10が解禁される10ミッション鎖を通常UIで検証済み。

### 次の縦切り

- M01〜M20は通常起動へ接続済み。赤TGT／白敵／青味方、編隊purpose、戦闘密度、無線、Retryの第一横断監査を完了した。
- 敵航空AIは`docs/implementation/enemy_air_ai_sensor_and_tactics_rework_plan_20260827.md`を現行基準とする。索敵8.5〜16km、purpose別コミット／leash、接触記憶、目標分担、INTERCEPTOR再進入を実装・全20ミッションで検証済み。
- M11はHALO電子支援機の周期妨害下でFROZEN EYE基地を攻撃する現行実装を基準とする。旧高高度攻撃機護衛案へ戻さない。

### システム

- セラ編のミッション進行による購入許可は実装済み。F-111FをM07後の低空侵攻機として正式編入した。セラ用CR価格表の最終バランスは継続する。
- F-22はセラM01〜M20全Sで価格0の直接支給として実装済み。Su-57の全S報酬とMiG-31の自動支給はエレム編実装時に接続する。
- ARCAの関係resolverと、青／白の陣営運用を完成させる。
- SR-71をMiG-31に僅差で劣る非武装高速偵察機として正式化する。
- F-3をARCA専用の非プレイアブル機として正式統合する。
- Su-27をエレム中盤の旧式制空機として追加する。
- RETURN LINEでの着陸・着艦、補給、再武装、再出撃を実装する。

### 長期制作

- セラM11〜M20は初期実装済み。継続的なプレイ品質監査を行いながら、エレムM21〜M40、EX01〜EX04を順次制作する。
- 17基礎地域と必要なvariantを、ミッション接続台帳に従って制作する。

## 破棄した計画

2026-08-12の決定により、次の機体は実装しない。

- Tornado F.3
- J-10
- J-15
- J-20

性能登録、AI、モデル、HUDシルエット、`modelPreview`、payload、ミッション配置を新規作成しない。将来再検討する場合は、旧計画の再開ではなく新しい決定として追加する。

## 旧版の扱い

| 文書 | 扱い |
|---|---|
| v0.3〜v0.4 | 構造検討の履歴。現在の実装判断には使わない |
| v0.5〜v0.8 | 上表で指定した分野だけ継続 |
| v0.10 | ARCA初期案。v0.12により上書き済み |
| v0.11 | 30分便の旧計画。v0.12により上書き済み |
| `32_production_plan.md` | 旧制作順。v0.12により上書き済み |
| `v0.7/01_f3_mobility_profile.md` | F-3機動性特化案。v0.8により破棄済み |

旧版は経緯確認のため残すが、TODOの集計元にはしない。

## 矛盾が見つかった場合

1. この文書の「破棄した計画」を最優先する。
2. 同じ分野では、上表で指定した正本を使う。
3. 同じ版では、対象が狭いミッション別・機体別文書を優先する。
4. 解決できない場合は推測で実装せず、この文書へ未決事項として追加する。
