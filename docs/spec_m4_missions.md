# SPEC M4 — ミッション7本化 (2026-07-25, Fable設計)

M3(地上目標)出荷後に着手。MISSIONS を7本へ拡張し、M2の未接続マップ2種と M3の地上目標を本編に組み込む。

## ミッション構成（新番号順）

| # | key | title | world | 内容 | par |
|---|-----|-------|-------|------|-----|
| 01 | m01 | FIRST CONTACT | archipelagoDay | air1 | 95 |
| 02 | m02 | TWO-PRONGED | archipelagoDay | air1 → air2plain | 210 |
| 03 | m03 | FLEET DESTRUCTION | sunsetOcean | naval | 200 |
| 04 | m-glacier | GLACIER RUN | glacierCanyon | ground(4) + air1 | 240 |
| 05 | m-night | NIGHT RAID | nightBase | ground(11) + air1 | 300 |
| 06 | m04 | IRONBACK | archipelagoDay | air2 | 135 |
| 07 | m05 | FINAL SORTIE | archipelagoDay | air1 → air2 → naval + outro | 430 |

- 既存keyは変更しない（レコードはkey参照なので旧記録が生きる）。**表示番号は配列index+1**で自動的に付け直る
- 解禁はindex連鎖のまま（新04を開けるには03クリア、以降同様）
- マップドット座標: m-glacier {x:0.18, y:0.22}（北西の氷海）、m-night {x:0.60, y:0.74}（南の島）

## スキーマ拡張

```js
// MISSIONS entry に追加（省略可）:
groundUnits: [
  { id: 21, type: "samSite", x: ..., z: ..., heading: 0.8 },
  ...
]
// totalTargets = sequence.length * 3 + (groundUnits?.length || 0)
```
- `startMission()` で `mission.groundUnits` を全部 `spawnGroundUnit` する（ウェーブとは独立に最初から存在）
- 完了判定は既存の `living`（ground の alive=false=残骸 でクリア扱いになることを確認済みの前提）

## 山肌への設置高さ（M3の近似の改良）

M3の「フットプリント内なら mountain.h」は中心付近専用。M4で山腹に置くために:
```js
function surfaceHeightAt(x, z) {
  let best = 0;
  for (const m of world.mountains) {
    const d = Math.hypot(x - m.x, z - m.z);
    if (d < m.r) best = Math.max(best, m.h * (1 - d / m.r) * 0.92); // 円錐近似
  }
  return best;
}
```
設置後スクショで浮き/めり込みを目視確認し、ズレる個体は座標を手調整（±10%までは仕様内）。

## 04 GLACIER RUN（回廊侵攻）

- **地上**: 回廊の壁山の山腹に radarSite×2 + samSite×2（左右交互、回廊入口から800/1600/2400/3200の奥行きに分散。
  座標は壁山の footprint 中心から回廊側へ 0.4r 寄せた点、surfaceHeightAt で設置）
- **航空**: air1（既存の3機が回廊上空をCAP）
- 狙い: 低空で回廊を駆け抜けながらSAM警報とフレア管理をする Cape Rainy 風
- 無線: 開始 command「氷河回廊に敵レーダー網。低空で懐に潜り込み、SAMごと黙らせろ。」
  wingman「壁の上にSAMサイトだ！ 谷底を這えば射線が切れるぞ！」(id "glacier-brief")
- クリア条件: 地上4 + 航空3 = 7目標

## 05 NIGHT RAID（夜間基地掃討）

- **地上**(台地中心 cx,cz は nightBase 島の中心、半径140内に配置):
  - samSite×2（台地の対角）
  - aaGun×3（外周を三角に）
  - fuelTank×3（**隣接クラスタ**、相互90以内=誘爆チェーン設計）
  - radarSite×1（中央高台）
  - bunker×2
- **航空**: air1（夜間CAP 3機）
- 無線: 開始 command「夜間強襲だ。月明かりを背に、敵前線基地を機能停止させろ。」
  wingman「対空砲火に気をつけろ。燃料庫に火が入れば連鎖するはずだ！」(id "night-brief")
- クリア条件: 地上11 + 航空3 = 14目標
- 見せ場: fuelTank連鎖誘爆で基地が夜に燃え上がる画

## その他

- ステージセレクトのマップ/リスト/レコードは MISSIONS 配列駆動なので自動追従（要確認のみ）
- FINAL SORTIE のアウトロ・IRONBACKセリフ群は無変更
- **検証**: 新2ミッションのE2E（出撃→全目標→ランク記録→解禁連鎖が旧03→新04→新05→新06と繋がる）、
  旧レコード互換（既存localStorageのm01-m05が新しい並びでも正しい行に出る）、
  山腹設置の目視スクショ、fps、エラー0
