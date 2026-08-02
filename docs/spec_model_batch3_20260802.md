# モデルバッチ3: Fable総力戦 27ユニット4波（2026-08-02 22:51 夜間自動運転・完全版）

**目的**: まだ実装されていない兵器・戦闘機・爆撃機・輸送機などの3Dモデルを、**Fableのみの並列**で
一晩で大量出荷する（ユーザー指示: 短期・並列・大規模）。モデルのみ＝バランス/ミッション/ハンガー非接触。

**体制**: メイン=Fable 5（本書の実行者・検収者・マージ担当）。ビルダー=Workflow並列の
**Fable 5サブエージェント（`agent(prompt,{model:'fable'})`、effort指定なし）**。
**effort xhighはどこにも書かない**（thinking無効×xhighの400で全滅する実証済みの罠）。

**★体制変更（ユーザー指示8/2 23:15頃・確定）**: 「トークン消費が速いのでFableは止めておいて。
続きはOpusにちゃんと引き継ぐ」→ **ビルダーは全波 Opus 5 に切替**（Workflowのargsに
`"model":"opus"` → スクリプトが `{model:'opus', effort:'high'}` で起動。highが定石・xhighは400）。
Fable版W1は停止済み、途中ドラフト6/9機はOpusビルダーが引き継ぎ条項（プロンプト内「引き継ぎ:」節＝
前任ドラフトは読んで活かすか書き直し・検証は必ず自分でやり直し・前任サーバーはkillしてから立て直し）
で回収する。メインループ（判断・マージ・検収）はFableのまま。

**定石の出自**: bf9fad1（航空機8種）/0537377（艦艇6種）/989b963（地上8種）で確立した
「1ユニット=1ペイロード=1エージェント完全並列 → マージだけ直列 → 4面図検収」を4波に拡張。

---

## 1. 現況スナップショット（8/2 20:10 実測済み。22:51に再確認して差分だけ更新せよ）

- 実装済みモデル登録（index.html実測）:
  - AIRCRAFT_MODELS: tu22m3 su24m su34 a100 s70 f111f e2d yf23（+ophanNode=並走分）
  - SHIP_MODELS: corvette cruiser arsenal lhd ssgn hospitalShip cargoShip
  - GROUND_MODELS: mobileSam tel laserTruck othRadar ewVehicle bridgeLayer dataVault ambulance evacBus substation（+keren3部位=並走分）
  - HELI_MODELS: ka52 ah64 armedTransport v22 heavyLift（全て並走分）
- プレイアブル14機（F-4/F-16/F-15/F-22/F/A-18F/A-10C/F-14D/F-2A/MiG-31B/Su-37/F-35C/Rafale M/Typhoon/Gripen E）と
  ロシア敵機群・汎用bomber/transport/UAV/艦・地上ユニットは旧方式で存在
- **並走セッションがヘリ5種+ケレン+オファンを制作中**（19:45-19:57にペイロード生成、
  index.htmlへインライン済み・未コミット。index.html/src/registry/registry-snapshot.jsのM状態は彼らのもの）
- `node tools/registry_gate.mjs` → 現在 `OK - 18 tables, no losses (+0 entries, +0 fields)`
- modelPreviewの引数形式（index.html L26434-26437）:
  `?modelPreview=<AIRCRAFT_TYPESのid>` / `ship:<SHIP_TYPESキー>` / `ground:<GROUND_TYPESキー>` / `heli:<HELI_TYPESキー>`
- inline_payload.mjs はindex.htmlの `// ==== @PAYLOADS:END ====` 直前に
  `applyPayload(function register(ctx){...}, "<name>"); // @payload:<name>` を挿入する（同名再挿入は拒否）
- 0537377のコミット構成（=マージ完了形の手本）: index.html + payloads/*.payload.js +
  src/registry/registry-snapshot.js + tools/registry_snapshot.json

## 2. スコープ境界（厳守）

- **やる**: 下記27ユニットのモデル+最小限のTYPE登録（enemy/support-only、`order:false`、
  数値は既存類似機を継承し`BALANCE TODO`マーク）。プレビューで確認できる形まで。
- **やらない**: AIRCRAFT_ORDER（ハンガー）追加・SPECバー調整・ミッション組込・ストーリー・
  バランス設計・マップ・ホスト側改修（inline挿入以外のindex.html変更ゼロ）。
- **触るな（並走セッション所有）**: payloads/heli_ah64・heli_ka52・heli_v22・heli_armedTransport・
  heli_heavyLift・ground_keren・aircraft_ophanNode の各payload、index.html/registry-snapshot.jsの
  彼らの未コミットhunk。**超兵器ルアも対象外**（ストーリー設計と不可分）。
  **git stashは全面禁止。他人のファイルへのadd/commit/checkoutも禁止。**
- 既存確認済みで対象外: SPAAG/MLRS/destroyer/frigate/aegis/missileBoat/汎用bomber/汎用transport
  （index.htmlに実在）。

## 3. ロースター27ユニット・4波

各行=「登録キー / ファイル / 正体 / **サムネで生き残るべき形状アイデンティティ**（未達なら不合格）/ 実寸 / 陣営色」。
スケールは既存実装の実測換算（YF-23ヘッダーの流儀。艦はaegis 155m/carrier 330m規約に整合）。
previewキー: 航空機=`<key>`、艦=`ship:<key>`、地上=`ground:<key>`。

### W1 固定翼・支援/爆撃/輸送 9機（キャンペーン計画書v0.5 §2の残り全部）

| # | key | file | 正体 | 形状アイデンティティ | 実寸 | 陣営/色 |
|---|-----|------|------|------|------|------|
| 1 | b1b | aircraft_b1b.payload.js | B-1B級超音速爆撃機 | ①可変後退翼(**addWingPivot使用**・0537377で駆動根治済み) ②胴体と翼が融合したブレンデッドボディ ③胴体下2基ペア×2のナセル | L44.5m/翼幅41.8→24m | セラ/濃灰 |
| 2 | mig25 | aircraft_mig25.payload.js | MiG-25級高速迎撃・偵察機 | ①機体の半分に見える巨大箱型サイドインテーク ②大型双垂直尾翼 ③肩翼配置の薄い後退翼 | L19.8m/幅14.0m | エレム/銀灰 |
| 3 | ea18g | aircraft_ea18g.payload.js | EA-18G級電子戦機 | ①機首から翼へ伸びるLERXストレーキ ②外傾双垂直尾翼 ③翼端ECMポッド+翼下ジャミングポッド | L18.3m/幅13.6m | セラ/灰 |
| 4 | droneTanker | aircraft_droneTanker.payload.js | 大型無人給油機 | ①**キャノピー無し**の、のっぺり機首 ②背面ドーサルインテーク ③翼下ホース&ドローグポッド(後方に垂れるドローグ) | L25m/幅40m級細長翼 | セラ/白灰 |
| 5 | sarFlyingBoat | aircraft_sarFlyingBoat.payload.js | 救難飛行艇(US-2風) | ①ステップ付き艇体胴(船底) ②高翼+翼端フロート ③4発ターボプロップ | L33m/幅33m | 中立/白+橙帯 |
| 6 | hospitalTransport | aircraft_hospitalTransport.payload.js | 病院輸送機 | ①高翼太胴4発プロップ(C-130系) ②純白+上面と両側面の大きな赤十字 | L30m/幅40m | 中立/白+赤十字 |
| 7 | powTransport | aircraft_powTransport.payload.js | 捕虜交換輸送機 | ①低翼双発ナローボディ旅客機 ②窓列テクスチャ ③白胴+青帯 | L40m/幅36m | 中立/白+青帯 |
| 8 | rootCourier | aircraft_rootCourier.payload.js | ROOT鍵輸送機 | ①**主翼上面に載る**エンジンナセル(An-72風STOL) ②窓の無い装甲胴 ③黄黒警告ストライプ | L28m/幅32m | セラ/暗色 |
| 9 | keyDistributor | aircraft_keyDistributor.payload.js | 個人鍵配布機 | ①箱型小型双発プロップ高翼機 ②開いた後部ランプ+配布ポッドパレット ③明るい民生色 | L23m/幅28m | 中立/白+緑 |

### W2 艦艇3+地上EX 5 = 8ユニット（計画書§3有力+§4 EX向け）

| # | key | file | 正体 | 形状アイデンティティ | 実寸 | 陣営/色 |
|---|-----|------|------|------|------|------|
| 10 | replenishOiler | ship_replenishOiler.payload.js | 補給艦 | ①船体中央の補給ガントリー(キングポスト塔+横張り出しホースアーム)が主役 ②甲板の燃料タンク列 | 200m級 | セラ/灰 |
| 11 | rescueVessel | ship_rescueVessel.payload.js | 救難船 | ①鮮オレンジ船体+白上構 ②船尾ヘリデッキ ③大型クレーン | 110m級 | 中立/橙白 |
| 12 | rootVaultShip | ship_rootVaultShip.payload.js | ROOT移動保管艦 | ①コンテナ船体型+中央の**要塞シタデルブロック**(発光スリット付き金庫棟) ②前後レドーム対 | 250m級 | セラ/暗灰 |
| 13 | commandVehicle | ground_commandVehicle.payload.js | 移動指揮車 | ①8輪トラック+箱型シェルター ②立ち上がったアンテナマスト群+皿アンテナ | 車長10m | エレム/迷彩 |
| 14 | autonomousSam | ground_autonomousSam.payload.js | 認証切れ自律SAM | ①装軌車体+傾斜4連ミサイルキャニスター ②回る首振りセンサーヘッド ③赤い警告灯(無人の不気味さ) | 車長9m | 無所属/錆灰 |
| 15 | rootRelay | ground_rootRelay.payload.js | ROOT送信窓地上中継車 | ①車体に対し過大な展開ディッシュ ②接地アウトリガー4本 | 車長11m | セラ/灰 |
| 16 | mineClearer | ground_mineClearer.payload.js | 戦後地雷除去車 | ①前面のフレイルドラム(鎖打ち) ②装甲キャブ ③作業灯 | 車長8m | 中立/黄+縞 |
| 17 | mobileHospital | ground_mobileHospital.payload.js | 移動病院車 | ①大型白バス/トラック+赤十字 ②展開式サイドテント | 車長12m | 中立/白+赤十字 |

**W13の注意**: commandVehicleは着手前に `grep -iE "command(Post|Vehicle|Truck)|mobileCommand" index.html` で
未実装を再確認。既存なら本ユニットをスキップし報告に記す（無言の重複実装をしない）。

### W3 著名機の大物 8機（M9常設「実機バリエーションをひたすら増やす」枠。enemy/support-only）

| # | key | file | 正体 | 形状アイデンティティ | 実寸 | 陣営/色 |
|---|-----|------|------|------|------|------|
| 18 | b52 | aircraft_b52.payload.js | B-52級戦略爆撃機 | ①2発ペア×4=8発の吊り下げポッド ②細長い高翼(わずかに垂れる) ③背の高い一枚垂直尾翼 | L48.5m/幅56.4m | セラ/暗灰 |
| 19 | b2 | aircraft_b2.payload.js | B-2級全翼ステルス爆撃機 | ①純粋な全翼(胴体・尾翼なし) ②後縁のW字鋸歯 ③中央の低いコックピット膨らみ | L21m/幅52.4m | セラ/黒 |
| 20 | f117 | aircraft_f117.payload.js | F-117級ステルス攻撃機 | ①全面ファセット(多面体)の矢じり形 ②内傾V字尾翼 ③真っ黒 | L20.1m/幅13.2m | セラ/黒 |
| 21 | sr71 | aircraft_sr71.payload.js | SR-71級高高度偵察機 | ①チャイン(側面エッジ)が機首まで走る細長胴 ②翼中間の巨大双発ナセル+ショックコーン ③内傾双尾翼 | L32.7m/幅16.9m | セラ/黒 |
| 22 | ac130 | aircraft_ac130.payload.js | AC-130級ガンシップ | ①C-130系高翼4発プロップ ②**左舷側面の砲門列**(突き出す砲身2-3本) ③センサー球 | L29.8m/幅40.4m | セラ/暗灰 |
| 23 | c17 | aircraft_c17.payload.js | C-17級戦略輸送機 | ①高翼4発ターボファン ②T字尾翼 ③跳ね上がった後部胴+ウィングレット | L53m/幅51.7m | セラ/灰 |
| 24 | an124 | aircraft_an124.payload.js | An-124級超大型輸送機 | ①C-17より一回り巨大な高翼4発 ②低い通常尾翼(T字でない) ③上開きノーズバイザー表現 | L69m/幅73m | エレム/白+灰 |
| 25 | il76 | aircraft_il76.payload.js | Il-76級輸送機 | ①高翼4発ポッド ②T字尾翼 ③機首下面のガラス張りチン(観測窓) | L46.6m/幅50.5m | エレム/白+青帯 |

**W3の識別リスク**: c17/an124/il76は同系シルエットなので「T尾翼の有無」「ノーズバイザー」「チン窓」を
必ず造形で分けろ。ac130とhospitalTransport(W1)は同じC-130系→**色(暗灰vs純白)と砲門/赤十字**で分ける。

### W4 ヘリ残り2機（条件付き。§8の再確認をパスした場合のみ）

| # | key | file | 正体 | 形状アイデンティティ | 実寸 | 陣営/色 |
|---|-----|------|------|------|------|------|
| 26 | rescueHeli | heli_rescueHeli.payload.js | 救難ヘリ | ①橙白塗装 ②側面ホイストアーム+ワイヤー ③サーチライト | L20m | 中立/橙白 |
| 27 | navalPatrolHeli | heli_navalPatrolHeli.payload.js | 艦載哨戒ヘリ | ①機首下のレーダードーム ②側面魚雷パイロン ③折りたたみ表現の主ローター基部 | L16m | セラ/海灰 |

**W4着手条件**: 並走セッションのヘリバッチがコミット済み or 19:57以降ヘリ系ペイロードの新規追加なし、
かつ同キーが未登場。片方でも崩れたらW4は丸ごと中止して報告へ（衝突回避が完成数より優先）。

## 4. 実行アーキテクチャ（波のオーバーラップで壁時計を圧縮）

```
22:51 プリフライト(§5) ≤15分
23:05 W1ビルダー9体をWorkflow起動(バックグラウンド)
　　　→W1完了通知 → 即W2起動 → W2ビルド中にメインがW1をマージ+検収+波コミット
　　　→W2完了 → 即W3起動 → W2マージ...
　　　→W3完了 → §8再確認をパスすればW4起動 → W3マージ...
　　　→W4マージ → 総仕上げ検収(§7) → 最終報告
目安: ビルダー1体20-45分×同時実行〜10枠 → 1波40-70分。27ユニットで03:00-04:30完走見込み。
```

- ビルダーは**リポジトリのindex.htmlに一切書かない**（自分のscratchpadコピーで自己検証）
  → 波のビルドとメインのマージが同時に走っても衝突しない（所有集合が非重複）。
- マージ（index.html書き込み）はメインだけが直列で行う。開始前に**index.htmlのmtime30秒静止**を
  確認（並走セッションの書き込み中を避ける）。静止しないときは待つ（`Identifier already declared`系の
  一時エラーは相手の書き込み途中を読んだだけ＝慌てて直しに行かない）。

### Workflowスクリプト（1波分。argsに波のユニット配列を渡して4回呼ぶ）

```js
export const meta = {
  name: 'sortie-model-wave',
  description: 'Sortieモデル量産1波: Fableビルダー並列、1ユニット=1ペイロード',
  phases: [{ title: 'Build', detail: '1ユニット=1エージェント、失敗は1回だけ再試行' }],
}
// args = { wave:'W1', scratch:'<このセッションのscratchpad絶対パス>', units:[{key,file,kind,template,port,previewKey,brief}] }
const REPO = 'C:\\Users\\user01\\Documents\\AI\\sortie'
const SCHEMA = { type:'object',
  required:['key','status','payloadPath','screenshotPath','summary'],
  properties:{ key:{type:'string'}, status:{enum:['done','failed']},
    payloadPath:{type:'string'}, screenshotPath:{type:'string'},
    pageerrorZero:{type:'boolean'}, identityConfirmed:{type:'boolean'},
    crClean:{type:'boolean'}, summary:{type:'string'} } }
function prompt(u, feedback){ return `Sortieの3Dモデル1ユニットを実装せよ。正本仕様: ${REPO}\\docs\\spec_model_batch3_20260802.md の§3(自分の行=${u.key})と§6。
所有(書いてよい): ${REPO}\\payloads\\${u.file} と 自分専用дир ${args.scratch}\\model_batch3\\${u.key}\\ のみ。
参照(読むだけ): index.html、手本=${REPO}\\payloads\\${u.template}(全文読め)、docs/spec_payload_registry.md。
禁止: index.htmlへの書き込み・他payload・git操作(読み取り以外)・リポジトリへの一時ファイル・ファイル削除・stash。
ユニット概要: ${u.brief}
手順: 手本payloadと同じ構造(ヘッダーコメントに形状根拠と実寸換算、TYPE登録はenemy/support-only order:false、数値は類似機継承+BALANCE TODO)で書け→自己検証: 自分のдирへ index.html/tools/inline_payload.mjs/src/styles をコピー→自payloadだけinline→port ${u.port} で配信(このポート以外使用禁止)→msedge --headless=new --disable-gpu --window-size=1600,1000 --virtual-time-budget=20000 --screenshot で http://localhost:${u.port}/index.html?modelPreview=${u.previewKey} を撮影→Readで目視→形状アイデンティティ3点が読み取れるまで修正ループ(最低2周)。
検査: node --check で構文、nodeでCRバイト検査(grep禁止)、スクショに4面図が出ていてエラーテキストが無いこと。
罠: PYTHONIOENCODING=utf-8:backslashreplace / 共有ブラウザMCP禁止(headless自前撮影) / effort xhigh禁止 / 終了時サーバーkill+scratchpad掃除(自分のpayload 1ファイル以外リポジトリに何も残すな消すな)。
${feedback ? '前回の失敗フィードバック: '+feedback : ''}
返答はStructuredOutputで。summaryは5行以内。`}
const done = [], seen = new Set()
let pending = args.units.map(u => ({...u, feedback:''}))
for (let round = 0; round < 2 && pending.length; round++) {
  const res = await parallel(pending.map(u => () =>
    agent(prompt(u, u.feedback), {label:`build:${u.key}${round?'/R':''}`, phase:'Build', model:'fable', schema:SCHEMA})))
  const next = []
  res.forEach((r, i) => { const u = pending[i]
    if (r && r.status==='done' && r.pageerrorZero!==false && r.crClean!==false) done.push(r)
    else next.push({...u, feedback: r ? r.summary : 'エージェント消失。最初からやり直し。'}) })
  pending = next
  log(`${args.wave} round${round}: done=${done.length} retry=${pending.length}`)
}
return { wave: args.wave, done, dropped: pending.map(u => u.key) }
```

- template指定: 航空機=`aircraft_yf23.payload.js`、艦=`ship_arsenal.payload.js`、
  地上=`ground_tel.payload.js`、ヘリ=`heli_ka52.payload.js`（未コミットだが読むだけなら可。
  読む前に自分のдирへコピーしてスナップショット化）。
- port割当: グローバル通番で**8911+ユニット番号(#1→8912, #27→8938)**。8811台は並走セッションと
  衝突しうるので使わない。
- previewKey: 航空機=`<key>`、艦=`ship:<key>`、地上=`ground:<key>`、ヘリ=`heli:<key>`。
- ドロップは沈黙させない: 各波の`dropped`は必ず最終報告に列挙（no silent caps）。

## 5. プリフライト（22:51、メインが直列で。全部で15分以内）

1. `git -C <sortie> status --porcelain` + `git log --oneline -5` — 並走バッチのコミット状況を把握。
   19:57時点との差分（新規ペイロード・新規コミット）をメモ。
2. 重複ガード: 27キー全部を `grep -cE "'(b1b|mig25|ea18g|droneTanker|sarFlyingBoat|hospitalTransport|powTransport|rootCourier|keyDistributor|replenishOiler|rescueVessel|rootVaultShip|commandVehicle|autonomousSam|rootRelay|mineClearer|mobileHospital|b52|b2|f117|sr71|ac130|c17|an124|il76|rescueHeli|navalPatrolHeli)'" index.html`
   で確認。ヒットしたキーはその場でロースターから外し報告に記す。
3. `node tools/registry_gate.mjs` — 開始時ベースラインを記録。
4. `head -60 tools/registry_gate.mjs` — スナップショット再ベースラインの正規手段（--update系フラグの有無）を
   確認しておく（§6で使う）。
5. `?modelPreview=cruiser` 相当を1枚撮って撮影パイプが生きていることを確認
   （リポジトリдирをport 8990のno-cacheサーバーで配信。msedgeのフルパスは
   `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` が既定）。
6. scratchpadに `model_batch3\` дирを作成。

## 6. マージ手順（メイン直列。1件ずつ、波単位で回す）

1. index.html mtime 30秒静止を確認（静止しなければ待つ）。
2. `node tools/inline_payload.mjs payloads/<file>` — 1件ずつ。エラーが出たらそのユニットは
   スキップして先へ（原因はビルダーのStructuredOutputと突き合わせ、リトライは波内で完結済み。
   ここでは滞留させない）。
3. 各件後 `node tools/registry_gate.mjs` — **「no losses」であること**（+N entriesの増加は正常）。
   lossesが出たら直前の1件をrevert（挿入ブロックを`@payload:<name>`マーカーで除去）して切り分け。
4. **payloads/のソースは絶対に削除しない**（fc5a329: 前回マージ担当が誤削除→復元の実害）。
5. 波の全件インライン後: port 8990配信で当該波の全previewをheadless撮影→メインがReadで検収
   （形状アイデンティティ表と突き合わせ。不合格は挿入ブロック除去+報告へ）。
6. スナップショット再ベースライン(tools/registry_snapshot.json): **並走セッションの変更が
   コミット済みならば**正規手段で更新して波コミットに含める（0537377の構成に倣う）。
   **未コミットのままなら更新しない**（彼らの未コミット追加が混入したjsonを先にコミットすると、
   素のcheckoutでgateが偽のlossesを出すため）。この場合gateの+Nドリフトは残ってよい。報告に明記。

## 7. 波コミット+総仕上げ

- **波ごとにコミット**（メガコミット禁止）。並走の編集が残る場合は部分コミット定石:
  自分のマーカー`@payload:<name>`でindex.htmlのhunkをフィルタ→`git apply --cached`でindexのみ→
  `git add payloads/<自分の波のファイル>`→commit。**作業ツリーの他人分に無接触**。
- メッセージ様式: `モデルバッチ3 W<n>: <ユニット列挙>` + 末尾
  `Model: Fable 5 / effort: high（実装: Fable 5並列×<体数>）` + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- pushは通常pushのみ（force系禁止）。rejectされたら`git fetch`→自分のコミットだけrebase→再push。
  他人の未コミットが絡んで危険と判断したら未pushのまま報告に残す。
- 総仕上げ: 全27(-ドロップ)のpreviewコンタクトシートを撮り直し、gate最終値・pageerror 0・
  `git log`で波コミット一覧を確認。**8340(ユーザーのプレイ配信)への同期は勝手にしない**（別スナップ
  ショット配信。ユーザー判断）。

## 8. W4着手前の再確認（衝突回避が完成数より優先）

`ls payloads/heli_*.payload.js` を19:57時点の5ファイルと比較+`git log`にヘリ系コミットがあるか確認。
新規ヘリペイロードが増えていた場合、並走セッションがヘリ拡張を続けている＝**W4中止**。
rescueHeli/navalPatrolHeliのキーが既に登場していた場合も中止。

## 9. 失敗時ハンドリング

- ビルダー失敗: Workflow内で1回だけ自動リトライ（フィードバック付き）。2連敗はドロップして続行。
- **同じ問題で2周して進展がなければ3周目に入らない**（ユーザー起床後に申告する事項として報告へ）。
- Workflow自体が起動失敗/異常終了: journal.jsonlを読んでから、`resumeFromRunId`で再開
  （キャッシュされた完了分は再実行されない）。
- 並走セッションと同一ファイルで接触した場合: こちらが引く（待つ/スキップ）。実力行使での
  上書き・revert・stashは絶対にしない。
- ゲートでlossesが消えない・gateが壊れた場合: マージ全停止。完成ペイロード群はpayloads/に
  置いたまま（add-onlyなので無害）、状況を報告に書いて終了。

## 10. 完了報告様式（バッチ3完了時点で必ず全部書く）

出荷数/27と波別内訳・各キー / ドロップとスキップ（理由付き） / gate最終出力 /
波コミットSHA一覧とpush成否 / スナップショットjsonを更新したか / 並走セッションとの接触記録 /
ユーザー向け次アクション（8340同期の要否、W4中止時の残件、プレイアブル昇格候補の提案）

## 11. 夜間自律継続（バッチ3完了後〜ユーザー起床まで。8/2晩ユーザー指示「自分で課題を見つけて無限に動く」）

**ループ機構**: 夜間は**ターンを終える前に必ず ScheduleWakeup を仕込む**（これを忘れるとループが
死ぬ。作業の谷間=60〜300秒、バックグラウンド作業待ち中=1200秒以上のフォールバック。promptは
「【Sortie夜間自律継続】spec_model_batch3_20260802.md §11の規則で次の課題を1つ選んで実行し、
夜間ログへ追記。ターン終了前に必ず次のScheduleWakeupを仕込む」を毎回同文で）。
**ユーザーの発言が来たらループ即停止**（以降は通常対話）。

**保険ハートビート（毎時51分の定期cron、ユーザー指示）**: ScheduleWakeupの鎖が切れた場合の
復活装置として毎時51分に発火する。**二重起動の判定規則**: 発火したらまず夜間ログの最終エントリ
時刻を見る。①40分以内に活動あり=ループ健在→**何も起動せずログに「HB確認」1行だけ追記して終了**
（ScheduleWakeupも仕込まない。二重ループ禁止） ②40分以上停滞=鎖が切れた→§11ループをそこから再開
（次の課題を選んで実行+ScheduleWakeup再装填）。③バッチ3自体が未開始（22:51の起動が失敗していた）
なら本書の頭から開始。朝ユーザーが活動を再開したらハートビートcronをCronDeleteで削除する。

**夜間ログ**: `docs/night_ops_log_20260803.md` に1サイクル1エントリで追記
（時刻/課題/結果/コミットSHA/積み残し）。朝ユーザーがこれだけ読めば全部わかる状態を保つ。

**サイクル規則**: 1サイクル=1課題。実装系は必ずゲート+スクショ検収してからコミット（様式は§7と同じ）。
**同じ課題で2周停滞したら3周目に入らず「朝の申告リスト」へ積んで次の課題へ**。

**バックログ（上から順に。完了/不能なら次へ）**:
1. バッチ3の残処理 — ドロップ/スキップ済みユニットの再挑戦（各1回まで）、W4中止だった場合の再判定
2. 前バッチ既知残課題 — S-70の平面形修正（実機は幅19m>長14mなのに縦長）/
   registry_gate「+4 fields」ドリフトの原因特定（まず読み取り調査、安全確実なら修正）
3. スナップショットjson再ベースライン（並走セッションのコミットを確認できた場合のみ。§6-6の規則）
4. 品質パス — 全モデルのpreviewコンタクトシート生成→形状レビュー→造形の軽微改善を1ユニットずつ
   （形状アイデンティティ表と§7検収に従う）
5. QAスモーク — 全ミッション起動プローブ（localStorage解禁注入+forceMissionCursor+`__game.mission.key`
   突き合わせ+pageerror収集。m01しか起動しない罠に注意）、fps計測（ウィンドウ隠れのrAF
   スロットリング=偽退行に注意）
6. ドキュメント — PLAN.md M9出荷ログへの今夜分追記、モデルカタログdoc生成（キー/previewキー/寸法/陣営の一覧表）
7. 設計書のみ作成（実装しない）— プレイアブル昇格候補のspec_m9様式ドラフト（HP98量子・バー再正規化
   実測などroster規約準拠）、超兵器ルアの部位設計ドラフト（story_reboot文書参照）
8. 小粒モデル拡張 — 敵エース用塗装バリアント等を1体ずつ（§3と同じ検収水準で）

**夜間も不変の禁止事項**: バランス/ミッション/ストーリー/ハンガー(AIRCRAFT_ORDER)の変更・
他人の未コミットへの接触・stash・force push・8340同期・Sortie外のリポジトリへの越境・
ChatGPT等外部サービスへの委譲・ユーザーの耳/目の好みに依存する大改変（→朝の提案リストへ）。
迷ったら実行せず提案リストへ積む（自律の停止条件=計画外の不可逆だけ、はこの夜も同じ）。
