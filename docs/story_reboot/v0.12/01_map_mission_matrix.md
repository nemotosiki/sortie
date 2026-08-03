# 17地域・マップ・ミッション接続台帳 v0.12

> [総合実装計画へ戻る](./00_master_30min_implementation_plan.md)  
> [設計書インデックスへ戻る](../README.md)

**状態:** マップ制作と正式ミッション接続の正本  
**更新日:** 2026-08-04

本書では、地理そのもの、見た目のプリセット、同一地域内の戦闘区画を分離する。

```text
regionId    地理と主権を固定するID
worldKey    空・海・地形・人工物・時刻を表すプリセット
sectorId   同一地域内の進入方向・谷・海域・市街区
variant    時刻・天候・損傷・世界線差分
```

同じ地形を別の国として使うことは禁止する。同じ地域の再訪は、regionIdを維持したままsector／variantだけを変える。

---

# 1. 現在の実装状況

| regionId | 日本語名 | mainのworldKey | 状態 | 正式ミッション接続 |
|---|---|---|---|---|
| `sark_port` | サルク港 | `sarkPort` | 完成 | 未接続 |
| `white_pass` | ホワイトパス | `whitePass` | 完成 | 未接続 |

完成の意味:

- `ctx.addWorldPreset`登録済み
- `ctx.addWorldDecorator`登録済み
- `?worldPreview=<key>`で4面確認可能
- 必須人工物を実装済み
- mainへ取り込み済み

未接続の意味:

- 現行ミッションの`world`はまだ当該keyを使っていない
- mission sector anchor、開始位置、敵味方配置、経路、Sランクは未調整

---

# 2. 17基礎地域

| # | regionId | 地域 | 主権 | base worldKey | 主な任務 | 状態 |
|---:|---|---|---|---|---|---|
| 1 | `ren_bay` | レン湾 | セラ | `renBay` | M01、EX04遠隔区 | 未実装 |
| 2 | `amal_plain` | アマル平原 | セラ | `amalPlain` | M02、EX04遠隔回線 | 未実装 |
| 3 | `sark_port` | サルク港 | ケデム | `sarkPort` | M03、M05 | **完成・未接続** |
| 4 | `nahar_strait` | ナハル海峡 | ケデム | `naharStrait` | M04、M24 | 未実装 |
| 5 | `white_pass` | ホワイトパス | ケデム | `whitePass` | M06、M23、EX01 | **完成・未接続** |
| 6 | `damar_sea` | ダマル海 | 国際海域 | `damarSea` | M07、M27 | 未実装 |
| 7 | `orm_basin` | オルム盆地 | エレム | `ormBasin` | M08、M25 | 未実装 |
| 8 | `karan_plain` | カラン平原 | エレム | `karanPlain` | M09、M29 | 未実装 |
| 9 | `nor_industrial` | ノル工業帯 | エレム | `norIndustrial` | M10、M12、M28、M30 | 未実装 |
| 10 | `ver_ice_coast` | ヴェル氷岸 | エレム | `verIceCoast` | M11、M26 | 未実装 |
| 11 | `arad_mountains` | アラド山地 | エレム | `aradMountains` | M18、M21、M31、EX04遠隔区 | 未実装 |
| 12 | `hador_islands` | ハドール諸島 | セラ | `hadorIslands` | M13、M33 | 未実装 |
| 13 | `hador_deep_sea` | ハドール深海 | セラ海域 | `hadorDeepSea` | M16、M36、EX02 | 未実装 |
| 14 | `lumen_ridge` | ルメン稜線 | セラ | `lumenRidge` | M38 | 未実装 |
| 15 | `migal_city` | ミガル市街 | 国際管理地 | `migalCity` | M15、M35 | 未実装 |
| 16 | `migal_outer` | ミガル外環 | 国際管理地 | `migalOuter` | M17、M19、M37、M39、EX03 | 未実装 |
| 17 | `migal_core` | ミガル中枢 | 国際管理地 | `migalCore` | M20、M40、EX04 | 未実装 |

---

# 3. 物語依存順のマップ制作キュー

`docs/spec_map_batch1_20260803.md`の造形仕様と検収方法は維持する。ただし制作順は次へ変更する。

## 3.1 開戦章に必須

| 順 | worldKey | 理由 |
|---:|---|---|
| 完了 | `sarkPort` | M03の港湾戦 |
| 完了 | `whitePass` | M06／M23の峡谷戦 |
| 1 | `renBay` | セラM01の開戦地。キャンペーン入口 |
| 2 | `amalPlain` | M02。M01結果を最初に返す土地 |
| 3 | `naharStrait` | M04／M24の表裏艦隊戦 |
| 4 | `aradMountains` | エレムM21の開戦地 |
| 5 | `damarSea` | M07／M22／M27の支援航路・救難海域 |
| 6 | `ormBasin` | M08／M25。夜間基地と補給道路 |

## 3.2 中盤

1. `karanPlain`
2. `norIndustrial`
3. `verIceCoast`
4. `hadorIslands`
5. `hadorDeepSea`

## 3.3 終盤

1. `migalCity`
2. `migalOuter`
3. `migalCore`
4. `lumenRidge`

---

# 4. regionごとのvariant計画

## 4.1 レン湾

### `renBay`

- M01
- 夜明け05:40
- 軍民共用空港
- 平行滑走路2本
- 民間ターミナル
- 病院・医療管制塔
- 沿岸道路

### `renBayAfterlight`

- EX04の遠隔防衛区
- 戦後復旧中
- 一部滑走路と病院は復旧、軍用区画は損傷を残す
- 新しい別都市として作らず、同じ湾の後日版にする

## 4.2 アマル平原

### `amalPlain`

- M02
- 農地格子
- 発電所
- 送電線
- 予備飛行場
- 河川と低空巡航弾経路

EX04では完全な新プリセットを作らず、遠隔回線の景観・通信表示として再利用する候補。

## 4.3 サルク港

### `sarkPort`

- M03
- 現在完成済み
- 平時寄りの午後
- コンテナ港、クレーン、運河、市街

### `sarkPortAsh`

- M05
- M03後の戦災版
- 焼けた倉庫、倒れたクレーン、封鎖された橋、沈没船
- M03結果によって壊れる対象を変える
- 地形と運河位置は絶対に変えない

## 4.4 ナハル海峡

### `naharStrait`

- M04とM24で共有
- 夕暮れ16:20
- 狭水道、中央橋、二つの岬、民間航路
- 同じ時刻、同じ艦隊戦を世界線の表裏として使用

別プリセットを作らず、mission sectorと進入方向を反転する。

```text
M04 sector: west_attack
M24 sector: east_defense
```

## 4.5 ホワイトパス

### `whitePass`

- M06
- 現在完成済み
- 西峡谷
- 快晴
- SEAD、REEM 1通過

### `whitePassMist`

- M23
- 東支脈
- 山霧
- 三つのヘリ進入路
- 避難民道路

### `whitePassAfterlight`

- EX01
- 戦後の旧休戦区
- 崩落橋、地雷原、患者移送地点
- 大規模戦闘ではなく人道輸送に必要な視認性へ調整

## 4.6 ダマル海

### `damarSea`

- 国際海域の基礎
- 救難航路、給油回廊、海上プラットフォーム

### `damarSeaStorm`

- M07
- 暴風雨、救難ビーコン
- 既存`stormOcean`を単なる名前替えで使わず、ダマル固有の航路・プラットフォームを追加

### `damarSeaHighCloud`

- M22
- 高高度給油回廊
- 白い雲海と長い航跡

### `damarSeaNorth`

- M27
- 同じ海の別海域
- 世界線の結果に応じた残骸・救難設備差分

## 4.7 オルム盆地

### `ormBasinNight`

- M08
- 月夜
- 夜間飛行場、石油設備、決済中継所

### `ormBasinDawn`

- M25
- 砂嵐前の早朝
- 西部補給道路
- 同じ油田と飛行場が遠景で位置関係を維持

## 4.8 カラン平原

### `karanPlain`

- M09、M29
- 農地格子、河川、戦車道、農村、高架橋
- 世界線別に避難車列と軍用車列の向きを変える

## 4.9 ノル工業帯

### `norIndustrialDusk`

- M10
- 装甲列車、橋梁、貨物駅

### `norIndustrialBlackout`

- M12／M28
- 停電、非常灯、煙突、変電所

### `norIndustrialEvacuation`

- M30
- 住宅区と工場区の避難・戦災差分

鉄道、河川、住宅区、工場区の位置は全variantで固定する。

## 4.10 ヴェル氷岸

### `verIceCoast`

- M11、M26
- 氷上道路、北極海、レーダー、地下庫、気象塔
- 既存`glacierCanyon`の名前替えは禁止

## 4.11 アラド山地

### `aradMountainsPredawn`

- M21
- 開戦前04:10
- 高高度迎撃回廊、山岳レーダー、給油機退避路

### `aradMountainsArchive`

- M18／M31
- 地下基地、文書庫、山岳飛行路

### `aradMountainsAfterlight`

- EX04遠隔防衛
- 戦後の地域ノード配布回線

## 4.12 ハドール諸島・深海

### `hadorIslands`

- M13／M33
- 空母泊地、島嶼基地、海底ケーブル

### `hadorDeepSea`

- M16／M36
- 外洋、潜水艦、空母戦

### `hadorDeepSeaRootFleet`

- EX02
- 移動ROOT保管艦隊
- 病院船と保管艦

## 4.13 ミガル

### `migalCity`

- M15／M35
- 高層区、病院、決済センター、地下鉄換気塔、環礁港

### `migalOuter`

- M17／M19／M37／M39
- 高高度進入路、オファン防衛環

### `migalOuterTwelveRoads`

- EX03
- 十二送信窓
- 12輸送機が識別可能な方位構成

### `migalCore`

- M20／M40
- 中央ROOT、環礁港、超兵器中枢

### `migalCoreAllNames`

- EX04
- 中央環と十二鍵
- 本編で壊れた／残った構造をEX世界線用に再構成

## 4.14 ルメン稜線

### `lumenRidge`

- M38
- セラ首都防衛線
- エース基地
- 高高度迎撃・稜線越え

---

# 5. 開戦10ミッション接続表

| 任務 | regionId | worldKey / variant | sectorId | マップ側の必須準備 |
|---|---|---|---|---|
| M01 | `ren_bay` | `renBay` | `east_air_control` | 爆撃隊2航路、軍用滑走路、医療塔 |
| M02 | `amal_plain` | `amalPlain` | `power_airfield_split` | 発電所と予備飛行場、巡航弾河川経路 |
| M03 | `sark_port` | `sarkPort` | `east_canal` | ヘリ着陸点、倉庫上空、港湾SPAAG点 |
| M04 | `nahar_strait` | `naharStrait` | `west_attack` | 敵艦進行線、味方艦隊位置、民間航路 |
| M05 | `sark_port` | `sarkPortAsh` | `burning_terminal` | M03結果別損傷、地上増援点 |
| M21 | `arad_mountains` | `aradMountainsPredawn` | `west_intercept_corridor` | F-15、AWACS、給油機の別退避路 |
| M22 | `damar_sea` | `damarSeaHighCloud` | `north_refuel_lane` | 高高度支援機防御円、救難機識別 |
| M23 | `white_pass` | `whitePassMist` | `east_three_valleys` | 北・中央・南の3ヘリ経路 |
| M24 | `nahar_strait` | `naharStrait` | `east_defense` | M04と同じ海峡、逆進入・護衛線 |
| M25 | `orm_basin` | `ormBasinDawn` | `west_supply_road` | 補給道路、砂嵐前視程、車列経路 |

この10本の接続を終えるまで、「新ストーリーを実装済み」とは数えない。

---

# 6. マップとミッションの接続ゲート

## 6.1 起動前検証

- `regionId`が地域台帳に存在する
- `worldKey`が登録済み
- worldKeyがregionIdの許可一覧に入っている
- sectorIdが当該worldKeyに存在する
- 主権とキャンペーン側の進攻方向が矛盾しない
- 同一世界線の過去損傷を無視していない

## 6.2 実戦検証

- 開始位置が地形内部・水面下・山中でない
- TGTが人工物に埋まらない
- 敵が護衛対象の射程内へ直接出ない
- 進入方向から地理的ランドマークが読める
- プレイヤーが戦闘範囲外へ追い出されない
- ARCAを全機無視してもS可能
- 最低所有機でクリア可能
- 58fps以上、pageerror 0

## 6.3 再訪検証

再訪時は最低三つを変える。

1. 戦闘損傷
2. 実効支配・配備
3. 生活状態
4. 時刻・天候
5. 進入方向

ただし地理的ランドマークの相対位置は維持する。

---

# 7. EX章のマップ契約

| EX | 主worldKey | 補助worldKey | 必要機構 |
|---|---|---|---|
| EX01 | `whitePassAfterlight` | なし | UNKNOWN識別、患者移送、崩落橋 |
| EX02 | `hadorDeepSeaRootFleet` | なし | 偽IFF、保管艦隊、病院船 |
| EX03 | `migalOuterTwelveRoads` | なし | 12送信窓、12輸送機、多方面護衛 |
| EX04 | `migalCoreAllNames` | `renBayAfterlight`、`aradMountainsAfterlight` | ミッション内戦域遷移 |

EX04を一枚の巨大マップへ押し込まない。

```text
フェーズ1A レン湾遠隔防衛
フェーズ1B アラド遠隔防衛
フェーズ2  ミガル中枢
```

の三戦域を、同じミッション結果と弾薬・耐久の契約を維持しながら順に切り替える。

---

# 8. 完成判定

## マップ完成

- world preset
- decorator
- sector anchors
- 4面プレビュー
- registry gate
- 58fps
- pageerror 0
- GPU資源解放

## ストーリー接続完成

- 正式ミッションがworldKeyを参照
- その土地固有の戦闘経路を使用
- 人工物が戦術または物語に使われる
- Sランクとスポーン猶予を実測
- 再訪時に損傷・配備・生活状態が返る

単に背景へ新マップを指定しただけでは、接続完成とは数えない。
