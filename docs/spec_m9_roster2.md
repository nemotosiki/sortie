# SPEC M9 roster2 — バリエーション第2弾 (2026-07-25, Fable設計)

roster1（F/A-18F/爆撃機/フリゲート/A-10C/戦車、docs/spec_m9_roster1.md）の5バッチ出荷後に着手。
数値規約はroster1と同じ: **HPは98量子（98/196/294）**、`brakeSpeed - 52 >= stallEntrySpeed` 不変条件、
バー再正規化は既存機に影響しない範囲を実測確認、AC7に数値ステータスは存在しないので
「実機+カテゴリ→Sortie体系への翻訳」であることを明記。

## 追加コンテンツ

### 1. 自機: F-14D SUPER TOMCAT（バッチ6）
- 位置づけ: F-15とF-22の間の艦隊防空。速度F-15超え・機動F-15未満・XLAA系の長射程が持ち味
- 目安: cruise 220 / boost 445 / brake 124、turn 32、roll 150、pitch 46、yaw 12、HP 150、
  弾数 12、SP.W = **XLAA**（F-15と同枠。差別化は素の速度と安定性）
- **可変翼ギミック**: モデルの主翼ピボットを速度で後退（cruise以下=展開20°、boost=後退68°、
  lerp追従）。ハンガーの周回カメラでも動くと映える（menuは展開状態）
- バー再正規化: boost 445はF-22(460)未満・F-15(425)超で新min/maxを作らない見込み→実装時に実測

### 2. 敵UAV: MQ-99風ドローン（バッチ7）
- enemy専用エアフレーム（ハンガーに出さない `enemyOnly: true` をAIRCRAFT_TYPESに導入）
- 小型(scale 0.45)・無尾翼デルタ+背面インテーク、HP **98**(1発)、turn 44（高機動）、
  speed cruise 210/boost 430、機銃のみ(damage 5)・ミサイルなし
- 挙動: evasive強め（evadeLateral 95/頻度3.0）。数で押すタイプ

### 3. 敵輸送機: C-17風 TRANSPORT（バッチ7と同時）
- enemy専用・大型(scale 2.6)・高翼4発・低速(cruise 150/boost 170)・turn 8・HP **196**(2発)
- 非武装。護衛付き迎撃ミッションの主目標（逃す=減点の時間圧力に使う）

### 4. 敵ミサイル艇: MISSILE BOAT（バッチ8）
- SHIP_TYPES追加: 全長40m・HP **98**(1発)・速度25(艦としては高速)・ジグザグ航行
  （baseHeadingへ周期±35°のスラローム）
- 兵装: 弱SAM（cooldown 14-20s・speed 420・turn 40°/s・フレア囮可）+ 軽AA（tracers 1・maxHit 0.08）
- 3〜4隻の群れで運用。CIWSなし＝接近機銃掃射が正解になる設計

### 5. 新マップ: STORM FRONT（嵐の外洋、バッチ8と同時）
- WORLD_PRESETS追加: 暗鉄色の空グラデ・雲量2倍/低高度・濃霧(0x5a6570, 380-2200)・暗い荒海
  （スペックル強め+スクロール1.6倍）・太陽なし
- **雷**: 4〜9秒間隔でランダム方位に閃光（directional光を80ms 3.2倍+空フラッシュsprite+
  0.4s遅れでゴロ音=既存playToneの低周波バースト）。ゲームプレイへの実影響なし（演出のみ）
- **雨**: ウィンドストリーク流用の下向き短線パーティクル（プール200、カメラ周辺）。fps60維持が条件

### 6. ミッション8〜10（バッチ8〜9）
| # | key | title | world | 内容 |
|---|-----|-------|-------|------|
| 08 | m-convoy | CONVOY BREAK | sunsetOcean | 輸送船団(passive船×3 HP196)+ミサイル艇×3護衛を殲滅。roster1の輸送船モデル流用可 |
| 09 | m-swarm | UAV SWARM | nightBase上空 | UAV×6を2波(3+3)で迎撃。QAAM/8AAMが輝く。地上目標なし |
| 10 | m-storm | STORM INTERCEPT | stormFront | **混成ウェーブ**: transport×2+f15護衛×2を雷雨の中で迎撃 |

### 7. 基盤拡張（バッチ7で実施）
- **ウェーブの自由編成**: sequence entryを `"air1"|"air2"|"air2plain"|"naval"` に加えて
  `{ types: ["uav","uav","uav","transport"], label?: "..." }` 形式に対応（spawnWaveを型リスト受けに一般化、
  既存文字列エントリは従来テーブルへの別名として維持）。1ウェーブ3体固定の解除はroster1バッチ2で済んでいる前提
- ステージセレクトのリスト・マップ・解禁はMISSIONS配列駆動で自動追従（ドット座標: m-convoy {0.62,0.44}/
  m-swarm {0.57,0.72}/m-storm {0.12,0.68}）

## 実装バッチ順（roster1の続き）
6. F-14D（可変翼）
7. UAV+輸送機+ウェーブ自由編成+ m-swarm
8. ミサイル艇+STORM FRONTマップ+ m-convoy / m-storm
9. （以降roster3へ: Su-27系自機・攻撃ヘリ・列車・揚陸艦・砂漠マップ等）

## 検証方針
各バッチで: 新ユニットのE2E（スポーン/挙動/撃破/レーダー/ロック）、新ミッションのE2E+ランク記録+解禁、
既存7ミッションのリグレッション（少なくともm01/m03/m07）、バー再正規化の実測、fps≥55、エラー0。
STORM FRONTは雷閃光中のfpsと、暗環境でのHUD/敵マーカー視認性スクショを必須ゲートに。
