# キャラクター登場・通常／闇ルート・30分便実装計画 v0.14

> [キャラクター正本へ戻る](./00_character_bible.md)  
> [総合実装計画へ戻る](../v0.12/00_master_30min_implementation_plan.md)

**状態:** キャラクターを正式ミッションへ接続する実装計画  
**更新日:** 2026-08-10  
**単位:** 1便＝約30分、原則1コミット  
**方針:** 会話選択画面を増やさず、飛行・護衛・追撃・進路で人物と分岐を表す

---

# 1. 大きな分岐は二つだけ

## 1.1 RAVEN → GIBOR

内部値:

```text
ravenArcaKills
ravenFinalPursuit
```

- M15以降の敵対ARCAは白い非TGT敵。
- ARCA撃墜は表示スコアを与えるが、ランク母数・分子には入れない。
- 自衛撃墜まで即座に闇扱いしないよう、仮の適格値は8機以上とする。
- 最終確定はM19で、護衛・帰投経路を離れ、撤退中ARCAを警告後に2機以上撃墜した場合。
- ゲージ、警告文、YES/NO選択は表示しない。
- 数値は実機検証後に調整するが、「M19で意図的に追う」条件は残す。

通常ルート:

```text
白敵を必要以上に追わない
→ M19の護衛を続ける
→ M20で停戦空域を守る
→ 着陸
→ ONE SHEM
```

闇ルート:

```text
白ARCAを積極的に狩る
→ M19で撤退編隊を追撃
→ GIBOR確定
→ M20で武装解除命令を拒絶
→ 敵のいない空へ残る
```

## 1.2 POLKA → RELEASE

内部値:

```text
polkaFollowedSunflowerRoute
```

- それ以前のSUNFLOWER関連行動は人物理解と無線差分に使う。
- 大きな分岐はM39の一回だけ。
- 正規帰投航路と、PILGRIMが送る別航路を実際の空間に置く。
- 別航路へ一定距離入ったらRELEASEを確定。
- YES/NO選択、思想ゲージ、複数ポイント制は作らない。

通常ルート:

```text
正規航路
→ RUA阻止
→ ONE EMET
```

闇ルート:

```text
SUNFLOWER航路
→ RUA投下・誘導
→ RELEASE
```

---

# 2. セラ編の人物登場表

> **搭乗機正本:** [v0.15 CROWN / LARK 正史搭乗機・特殊兵装運用計画](../v0.15/03_crown_lark_aircraft_canon.md)  
> CROWN / LARKのNPC機体、M19復帰時期、M20最終戦機体は上記v0.15を優先する。

## 2.0 ROOK搭乗機正史（2026-08-10確定）

| M | CROWN | LARK |
|---|---|---|
| M01 | F-15C | F-16C |
| M02 | F-4E | F-16C |
| M03 | F-4E | F-16C |
| M04 | F-14D | F-2A |
| M05 | F-4E | F-16C |
| M06 | F-15C | F-16C |
| M07 | 前線離脱 | F/A-18F + 4AAM |
| M08 | 前線離脱 | F/A-18F + 4AAM |
| M09 | 前線離脱 | F/A-18F + 4AGM |
| M10 | 前線離脱 | F/A-18F + 4AGM |
| M11 | 前線離脱 | F/A-18F + 4AAM |
| M12 | 前線離脱 | F/A-18F + 4AAM |
| M13 | 前線離脱 | F/A-18F + 4AAM |
| M14 | 前線離脱 | F/A-18F + LASM |
| M15 | 前線離脱 | F/A-18F + 4AAM |
| M16 | 前線離脱 | F/A-18F + 4AAM |
| M17 | 前線離脱 | F-15E |
| M18 | 無線のみ | F-15E |
| M19 | F-15Cで限定復帰 | F-15E |
| M20 | F-15C | F-15E |

CROWNは通常・制空・護衛でF-15C、対地でF-4E、対艦でF-14Dを使い、F-16Cには乗らない。LARKはF-16CからF/A-18F、終盤F-15Eへ更新する。F/A-18Fは任務前に4AAM / 4AGM / LASMを選択する。F-35Cも同じ選択式マルチロール契約を持つが、現行M01〜M20のLARK固定表では使用しない。

## ACT I — RAVENはROOK 2

### M01 FIRST CONTACT

**正本:** セラ側は高高度攻撃機の護衛。エレム側M21が迎撃。

登場:

- ROOK 1 CROWN
- ROOK 2 RAVEN
- ROOK 3 LARK
- MERIDIAN
- 高高度攻撃機3機

ゲーム:

1. 攻撃機編隊へ合流。
2. 第一迎撃波を撃退。
3. 攻撃機から離れず第二波を処理。
4. 一定数の攻撃機が投下線へ到達すると終了。

分岐なし。北・南の二択を置かない。

人物:

- CROWNは追撃より護衛を優先させる。
- LARKが左翼、RAVENが右翼。
- RAVENは誰かの目的を守る二番機として始まる。

### M02 SHATTERED MORNING

- 同じ三機。
- 前日の攻撃後に残った敵航空隊を排除。
- RAVENが初めて短時間だけ編隊判断を任される。
- 成功しても「RAVENなら全部任せられる」とはまだ言わせない。

### M03 LOW WATER

- sarkPortを使用。
- CROWN、RAVEN、LARK。
- BASTION 1 HEARTH、BASTION 2 WRENがケデム側の共同戦闘者。
- ARCAは青い準友軍。
- 輸送ヘリを取り逃がすと地上敵が追加されるだけ。人物分岐は作らない。

### M04 NARROW SEA

- ROOK三機。
- HEARTHは海峡上空のケデム防空を担当。
- LANCER 1 SPEARはセラ側精鋭として短時間共闘。
- RAVENは自分より完成されたエースが存在することを知る。

### M05 PORT OF ASH

- 戦災版サルク港。
- CROWNの「全部を落とす必要はない」を初めて実地で示す。
- 白い一般敵は存在しても、ARCAはまだ青。
- ケデム強硬派ASH 1 CINDERを赤TGTにできる。
- HEARTHとケデム国民を同一視しない。

## ACT II — ROOK 1の継承

### M06 WHITE PASS

登場:

- CROWN
- RAVEN
- LARK
- MERIDIAN
- WARDEN 1 GRANITEは敵側の高高度援護または遠景

ゲーム:

1. 低空で谷へ侵入。
2. レーダー／SAMを破壊。
3. 帰路の迎撃戦。
4. CROWN被弾イベント。

CROWNは生存。任務後:

```text
ROOK 2 RAVEN → ROOK 1 RAVEN
ROOK 3 LARK  → ROOK 2 LARK
```

番号継承をデブリーフと次回ブリーフィングで明示する。

### M07 BLACK CURRENT

- RAVENが初めてROOK 1として出撃。
- LARKは帰還人数と救難信号を読む。
- CROWNは後方から短い助言だけ。
- 黒幕や権限の話はしない。

### M08 NIGHT AUDIT

- NIGHTJAR 1 VESPER初登場。
- 夜間基地の守備エースとして戦う。
- VESPERは悪役ではなく地下都市を守る。
- RAVENはエースを狩るためではなく、任務上必要な相手として交戦。

### M09 IRON HARVEST

- RAVENとLARKの隊長・僚機関係を定着。
- LARKが地上部隊の損失を具体的に報告。
- 名前付きエースは出さず、人物密度を下げる回。

### M10 LAST TRAIN

- RAVENの判断が橋・列車・後続物流へ影響。
- 「RAVENへ任せれば早い」という味方の評価を初めて明確にする。
- まだ称号GIBORは使わない。

## ACT III — 名声の形成

### M11 FROZEN EYE

- WARDEN 1 GRANITEと本格交戦。
- MiG-31の速度・高高度迎撃を見せる。
- GRANITEはRAVENを侮辱せず、境界を守る正規軍人として描く。

### M12 GLASS SWARM

- UAV中継機を優先すれば戦況が急速に改善。
- RAVENの判断力が味方を救う成功体験。
- 若い友軍がRAVENの名を頼る無線を入れる。

### M13 LIFELINE

- 輸送機護衛。
- LARKを中心に、撃墜数より帰還数を語る。
- RAVENの通常人格を十分に描くための回。

### M14 BREAKWATER

- 時間制限対艦戦。
- SPEARが別戦域で活躍し、RAVENと並ぶセラのエースとして報道される。
- 競争心は出しても敵対させない。

### M15 NIGHT OF NUMBERS

**ARCA関係転換。**

- 青ARCAは前半で撤退。
- 後半に別オブジェクトとして白ARCAが出現。
- 同じ機体を飛行中に青から白へ変えない。
- 赤TGTを倒せばクリア。
- 白ARCAは攻撃してくるが必須ではない。
- `ravenArcaKills`計測開始。
- MERIDIANは非TGT優先警告を一度だけ行う。

## ACT IV — 王と呼ばれても降りられるか

### M16 HOME FLEET

- 空母護衛。
- RAVENの判断で被害を減らす。
- 報道または味方兵が初めて`GIBOR`という異名を使う。
- 制度・権限・システム名として表示しない。

### M17 THE LONG APPROACH

- HELIX 1 FORGE、HELIX 2 SWIFT登場。
- HELIXは白。
- 赤TGTは別の敵主力編隊。
- SWIFTはRAVENを挑発。
- 通常ルートでは無視可能。
- 白敵撃墜はランクへ影響させない。

### M18 HORN OF HEAVEN

- KERENの部位破壊。
- RAVENは世界権限を得ない。
- 戦果と名声が頂点へ達し、味方が判断を全面的に信頼する。
- CROWNは「任務が終わった時に降りられるか」を短く問う。

### M19 TRUST FALL

- CROWNはF-15Cで限定復帰し、RAVEN／LARKと同一空域へ戻る。
- 復帰を大げさなムービーにせず、通常の味方編成として扱う。

主目的:

- 停戦・復旧団の輸送機またはROOT分割ドローンを護衛。
- これはRAVENが世界ROOTを所有していたから返す任務ではない。
- 政治側の分散作業を、パイロットとして守る任務。

後半:

- 撤退中ARCAが白で通過。
- MERIDIANとCROWNが追撃不要を伝える。
- RAVENが護衛半径を離れ、白ARCAを2機以上撃墜すると`ravenFinalPursuit=true`。
- `ravenArcaKills`が仮閾値8以上ならGIBOR確定。
- 条件未達なら通常ルート。

### M20 THE GUARANTOR

固定編成はCROWN = F-15C、LARK = F-15E。GIBORで赤TGT化しても機種は変えない。

#### ONE SHEM

- 停戦空域または会談輸送を防衛。
- 政治的に一つのシェム秩序は残る。
- RAVENは世界権限を返すのではなく、最後の航空任務を完了して着陸する。
- 整備員が普通に機体へ近づく。
- GIBORという異名から降りる。

#### GIBOR

- 停戦は成立済み。
- RAVENは最後のHELIX／ARCA編隊を追う。
- 武装解除・帰投命令を拒否。
- LARK、SPEAR、またはセラ武装解除編隊が停止を試みる。
- 彼らは世界の敵ではなくRAVENを帰すために来る。
- 最終クリアは世界征服ではなく、追跡圏を振り切る／止めに来たエースを退けること。
- 最後に`NO HOSTILE CONTACTS`。
- 敵のいない空を飛び続ける。

HOUND 1 STAGを使う場合は、このルート内の短い鏡としてだけ配置する。

---

# 3. エレム編の人物登場表

## ACT V — POLKAは最初からREEM 1

### M21 CLEAR PATH

**正本:** M01と同じ戦略事件の反対側。エレム側は高高度攻撃機の迎撃。

登場:

- REEM 1 POLKA
- REEM 2 SABLE
- POLARIS
- セラ高高度攻撃機
- 護衛ROOK隊は世界線に応じたNPC

ゲーム:

1. 迎撃空域へ上昇。
2. 護衛戦闘機を突破。
3. 高高度攻撃機を撃墜。
4. 残存機が離脱すると終了。

複数の支援機を選ぶ複雑な分岐は置かない。POLKAは最初から何を先に落とすか判断する隊長。

### M22 BLIND HORIZON

- POLKAとSABLEのみを常設友軍機にする。
- WARDEN 1 GRANITEは別空域の情報・援護。
- SABLEは命令を復唱し、POLKAへ逆らわない。

### M23 OPEN GATE

- whitePass東支脈。
- 輸送ヘリ護衛。
- BASTION 1 HEARTHは敵として登場可能。
- POLKAが「悪くない敵」と初めて接触する。
- HEARTHを悪の政権の象徴にしない。

### M24 NARROW SEA

- M04の反対側。
- POLKA／SABLEの二機だけがプレイヤー側常設戦闘機。
- 艦隊を守る王道護衛。
- RAVENは遠景・無線・敵エースとして示しても、破滅ルートは固定しない。

### M25 BLACK ROAD

- 車列護衛。
- SABLEの過去を短い無線で出す。
- POLKAの善良な隊長像を十分に作る。

## ACT VI — 正しい命令違反

### M26 SNOW WALL

- GRANITEがMiG-31運用を指導。
- クリア時にMiG-31自動支給。
- SUNFLOWERはまだ主役にしない。

### M27 EYE OF STORM

- PILGRIMが命令を破って民間救難へ向かう。
- プレイヤーの主目的は一本道。
- 任務後、PILGRIMの違反で人が救われたと分かる。
- POLKAに「命令違反＝悪ではない」という正しい学びを与える。

### M28 WAKE AT NIGHT

- PILGRIMが禁止目標を独断攻撃。
- 後で翌日の市街砲撃を防いだと判明。
- POLKAはSUNFLOWERを逮捕・討伐しない。

### M29 RED HARVEST

- POLKAとSABLEだけの関係を描く王道戦。
- SABLEの忠誠が、現時点では安心として機能する。

### M30 STEEL BLOOD

- SUNFLOWERが自軍兵器工場を攻撃。
- POLKAへ攻撃選択をさせず、別空域の出来事として進行。
- PILGRIMの思想を明確化。
- ASTERは同行、MERCURYは動揺。

## ACT VII — 本当の裏切り

### M31 THE VEIL

- ヴェイル回収。
- PILGRIMは「国家・名前・肉体を衣」と読む。
- 文書の思想をゲームの正解として提示しない。

### M32 MERCY MACHINE

- MIRAGE 1 WEAVERと電子戦・デコイ戦。
- PILGRIMは人間と機械の忠誠を比較する。
- POLKAの救済思想へ、効率の誘惑を重ねる。

### M33 CUT THE LINE

- SUNFLOWERが作戦情報を漏らす。
- 味方損害は本物。
- 同時に避難民が救われたことも示す。
- PILGRIMは敵国へ加入しない。
- ASTERは初めて明確に疑問を持つ。

### M34 OPEN SHORE

- 上陸支援の王道ミッション。
- POLKAが英雄・救済者として称賛される。
- 世界権限や特別ROOTを与えない。

### M35 NIGHT OF NUMBERS

- SUNFLOWERは白い独立勢力。
- 赤TGTだけでクリア可能。
- PILGRIMはPOLKAへ問いだけ残す。
- ASTERは離脱準備、MERCURYは軍へ戻ろうとする。

## ACT VIII — 正しさを手放せるか

### M36 SINK THE SUN

- セラ空母戦。
- POLKAの判断が大成功。
- SABLEと軍がPOLKAをさらに信頼する。
- 救済者としての名声が誘惑になる。

### M37 FOUR HORNS

旧題`CROWN BREAKER`は廃止。CROWNがROOK 1のTACネームであるため混同を避ける。

- セラ精鋭四機とのエース戦。
- LANCER 1 SPEARを中心に構成。
- 4機撃墜の単純なボス戦。
- POLKAが「自分が決めると勝てる」成功体験を得る。

### M38 THIRTEENTH KEY

- MiG-31でSR-71級偵察機を迎撃。
- 第十三鍵は政治的王権ではなく、RUA作戦の識別・照準情報。
- POLKAはパイロットとして決定的な兵器を使える位置へ近づく。
- GRANITEは境界の警告を行うが、REEM隊へ命令しない。

### M39 MIRROR SKY

- PILGRIMとの最終交戦。
- ASTERは既に離脱。
- PILGRIM撃墜後、正規航路とSUNFLOWER別航路を空間に置く。
- SABLEはどちらへもPOLKAについていく。
- 別航路へ入れば`polkaFollowedSunflowerRoute=true`。

### M40 LAST LIGHT

#### ONE EMET

- POLKAはRUAの投下・誘導を拒否または阻止。
- 戦争を終わらせる通常航空作戦を完遂。
- SABLEと帰投。
- 一つのエメト盟約は政治側に残るが、POLKA自身が王になるわけではない。

#### RELEASE

- POLKAはSUNFLOWER航路からRUAを投下・誘導・護衛。
- SABLEは反逆せず同行。
- 戦争は本当に早く終わる。
- 大量の生命と本人の意思が奪われる。
- POLKAは「これで救えた」と受け取る。
- 旧家、ROOT、世界権限の説明はしない。

---

# 4. EX章

## EX01 AFTERLIGHT

- RAVENとPOLKAが初共闘。
- CROWN、LARK、SABLEは各回線から登場。
- 患者輸送護衛＋UNKNOWN識別。
- 二人の主人公は喋らない。

## EX02 MIRROR WARRANT

- IFFマーカーを完全反転させず、一時消失・不明化する。
- 誰が誰を攻撃しているかで判断。
- CROWNのM01の教えがゲーム上で戻る。

## EX03 TWELVE ROADS

- 12輸送機を3機×4ウェーブで護衛。
- RAVEN、POLKA、LARK、SABLE、HEARTH／WRENが各地域を支援。
- 全機生存で真ルート条件。

## EX04 ALL NAMES

- 外部ノード→中央環→最終防衛機。
- 主人公二人は中央の王にならない。
- 複数の地域、通貨、信用、価値を残す。
- 旧家の存在・退場は説明しない。

---

# 5. 30分便の実装順

この番号はv0.12の第1〜340便を振り直さない。キャラクター実装の内部サブ便`C01〜C14`として、正式ミッション制作前に消化する。

## C01 — キャラクターレジストリ

- faction
- division
- squadron
- slot
- tacName
- legalName
- protagonist
- mythMotifInternal
- firstMission
- lastMission

完了条件:

- 主人公のlegalNameがnull
- REEM 3が存在しない
- CROWNがROOK 1として登録

## C02 — 無線話者と字幕名

- `ROOK 1 · CROWN`
- `ROOK 2 · RAVEN`
- `REEM 1 · POLKA`
- `REEM 2 · SABLE`
- AWACS、SUNFLOWER、HELIX

機番変更後の表示を自動化。

## C03 — ROOK番号継承

- M06前後でRAVEN/LARKの番号変更
- セーブ・チェックポイント・デブリーフ
- CROWNの固定生存

## C04 — REEM二機固定

- REEM 1／2だけを生成
- 補充や護衛追加は別部隊ID
- SABLEの追従、再出撃、チェックポイント

## C05 — SUNFLOWER人物データ

- PILGRIM／ASTER／MERCURY
- ひまわり紋章
- 味方、独自行動、白勢力の三状態
- 敵国所属にはしない

## C06 — ARCA HELIX人物データ

- FORGE／SWIFT
- F-3
- セラ序盤には出さない
- セラ中盤以降・エレム全編で白敵
- ARCA赤TGT禁止

## C07 — Named Ace共通AI

- SPEAR: 支援依存
- VESPER: 夜間・電波沈黙
- WEAVER: デコイ・電子戦
- STAG: GIBOR限定
- 名前付きだからHPを不自然に増やさない

## C08 — GIBOR名声演出

- 報道・敵無線・味方無線
- 制度名として使わない
- 通常ルートでも称号は出る
- ハンガーや性能ボーナスなし

## C09 — RAVEN闇判定

- M15以降のARCA撃墜数
- M19最終追撃
- ランク中立維持
- UIゲージなし

## C10 — POLKA／SUNFLOWER分岐

- M39二航路
- SABLEが両方へ追従
- 進路だけで確定
- 会話選択なし

## C11 — ONE SHEM／GIBOR

- 通常着陸
- 闇の武装解除命令
- `NO HOSTILE CONTACTS`
- 世界権限UIを作らない

## C12 — ONE EMET／RELEASE

- RUA阻止／使用
- POLKAはパイロットとして実行
- SABLE反逆なし
- 政治権限UIを作らない

## C13 — EX共闘

- 主人公同時存在
- 味方番号衝突回避
- 旧世界線フラグ非共有
- ALL NAMES条件

## C14 — キャラクター総監査

- 44ミッション登場スイープ
- 部隊番号
- TACネーム
- 死亡／生存
- 通常／闇の台詞差
- 神話説明台詞0
- GIBOR権限記述0
- REEM 3登録0

---

# 6. 最低限のデバッグ値

```text
debug.characters()
debug.activeSpeakers()
debug.rookSuccession()
debug.reemRoster()
debug.ravenRoute()
debug.polkaRoute()
debug.namedAces()
```

期待値:

```text
pre-M06:
ROOK 1 CROWN
ROOK 2 RAVEN
ROOK 3 LARK

post-M06:
ROOK 1 RAVEN
ROOK 2 LARK

REEM:
REEM 1 POLKA
REEM 2 SABLE

GIBOR:
isAuthority = false
isTitle = true
```

---

# 7. 脚本QA

- M01が二択防衛ではなく高高度攻撃機護衛になっているか。
- M21が同じ攻撃機の迎撃になっているか。
- RAVENの正規物語が「狂ったエース狩り」になっていないか。
- CROWNの負傷前にRAVENが1番機になっていないか。
- LARKが消えていないか。
- REEM隊が二機を超えていないか。
- SABLEがPOLKAへ逆らっていないか。
- SUNFLOWERの裏切りが単純な敵国への寝返りになっていないか。
- GIBORが法的・世界的な権限になっていないか。
- ONE SHEMでRAVENが世界システムを操作していないか。
- RELEASEでPOLKAが政治家になっていないか。
- ARCAの白敵が赤TGT化していないか。
- 大きな分岐がRAVENとPOLKAの二つだけに保たれているか。
