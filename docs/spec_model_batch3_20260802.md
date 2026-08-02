# モデルバッチ3: 固定翼支援機＋艦艇残り12種（2026-08-02 22:51 夜間自動運転）

**体制: メイン=Fable 5（この計画の実行者）、ビルダー=Workflow並列の Fable 5 サブエージェント×12。**
ユーザー指示により今夜は**全エージェントをFableで**回す（Opus委譲はしない。effortは指定しない＝
セッション既定を継承。**xhigh指定は絶対に書くな**＝thinking無効×xhighの400で全滅する既知の罠）。

正本の参照元: キャンペーン計画書 `origin/chatgpt/story-campaign-reboot:docs/story_reboot/v0.5/03_weapons_and_mission_remap.md`
（§2 有力・支援/§3 艦艇有力）。量産定石はbf9fad1（航空機8種）/0537377（艦艇6種）/989b963（地上8種）で確立済みのものを踏襲。

## 0. スコープ（厳守）

- **モデルのみ**。ストーリー/ミッション/バランス/AIRCRAFT_ORDER（ハンガー）は非接触。
  登録は enemy/support-only（`order: false`、YF-23ペイロードの方式）。
- **除外（絶対に触るな）**: ヘリ5種（ah64/ka52/v22/armedTransport/heavyLift）＋ケレン＋オファン
  ＝**並走セッションが制作中**（19:45-19:57にペイロード生成を確認済み）。超兵器ルア、SPAAG/MLRS/
  destroyer（index.htmlに既存）、駆逐艦、マップ/地形も対象外。
- 頼まれていない改善を足さない。ホスト側（index.html）の修正はinline_payloadの挿入以外ゼロ。

## 1. ロースター（12ユニット、1ユニット=1ペイロード=1エージェント）

登録キー / ファイル名 / モチーフと「サムネで生き残るべき形状アイデンティティ」（YF-23ヘッダーの流儀）:

| # | key | file | 正体 | 形状アイデンティティ（これが無いと不合格） | 実寸目安 | 陣営/色 |
|---|-----|------|------|------|------|------|
| 1 | b1b | payloads/aircraft_b1b.payload.js | B-1B級 超音速爆撃機 | ①可変後退翼（**addWingPivot使用**・0537377で駆動根治済み）②胴体と翼が滑らかに融合したブレンデッドボディ③胴体下に2基ペアのエンジンナセル×2 | 全長44.5m/翼幅41.8m(展開)〜24m(後退) | セラ/濃灰 |
| 2 | mig25 | payloads/aircraft_mig25.payload.js | MiG-25級 高速迎撃・偵察機 | ①巨大な箱型サイドインテーク（機体の半分がインテークに見える）②外傾しない大型双垂直尾翼③肩翼配置の薄い後退翼 | 全長19.8m/翼幅14.0m | エレム/銀灰 |
| 3 | ea18g | payloads/aircraft_ea18g.payload.js | EA-18G級 電子戦機 | ①LERX（機首から翼へ伸びるストレーキ）②外傾双垂直尾翼③**翼端ECMポッド+翼下ジャミングポッド**（ポッドだらけが本体） | 全長18.3m/翼幅13.6m | セラ/灰 |
| 4 | droneTanker | payloads/aircraft_droneTanker.payload.js | 大型無人給油機 | ①**キャノピーが無い**のっぺり機首②背面ドーサルインテーク③翼下ホース&ドローグポッド（後方に垂れるドローグ付き） | 全長25m/翼幅40m級の細長翼 | セラ/白灰 |
| 5 | sarFlyingBoat | payloads/aircraft_sarFlyingBoat.payload.js | 救難固定翼機（US-2風飛行艇） | ①ステップ付き艇体胴（船底が見える）②高翼+翼端フロート③4発ターボプロップ | 全長33m/翼幅33m | 中立/白+オレンジ帯 |
| 6 | hospitalTransport | payloads/aircraft_hospitalTransport.payload.js | 病院輸送機 | ①高翼太胴4発プロップ（C-130系シルエット）②純白+大きな赤十字（上面と両側面） | 全長30m/翼幅40m | 中立/白+赤十字 |
| 7 | powTransport | payloads/aircraft_powTransport.payload.js | 捕虜交換輸送機 | ①低翼旅客機シルエット（双発ナローボディ）②窓列テクスチャ③中立の白胴+青帯ライン | 全長40m/翼幅36m | 中立/白+青帯 |
| 8 | rootCourier | payloads/aircraft_rootCourier.payload.js | ROOT鍵輸送機 | ①**主翼上面に載るエンジンナセル**（An-72風STOL）②窓が一切ない装甲胴③警告ストライプ | 全長28m/翼幅32m | セラ/暗色+黄黒帯 |
| 9 | keyDistributor | payloads/aircraft_keyDistributor.payload.js | 個人鍵配布機 | ①箱型小型双発プロップ高翼機（Twin Otter/C-27風）②開いた後部ランプ+配布ポッドパレット③明るい民生色 | 全長23m/翼幅28m | 中立/白+緑 |
| 10 | replenishOiler | payloads/ship_replenishOiler.payload.js | 補給艦 | ①船体中央の補給ガントリー（キングポスト塔+横に張り出すホースアーム）が主役②甲板の燃料タンク列 | 全長200m級 | セラ/灰 |
| 11 | rescueVessel | payloads/ship_rescueVessel.payload.js | 救難船 | ①鮮オレンジ船体+白上構②船尾ヘリデッキ③大型クレーン | 全長110m級 | 中立/橙+白 |
| 12 | rootVaultShip | payloads/ship_rootVaultShip.payload.js | ROOT移動保管艦 | ①コンテナ船体型に**中央の要塞シタデルブロック**（発光スリット付き金庫棟）②前後のレドーム対 | 全長250m級 | セラ/暗灰 |

スケールの測り方: 既存機と同じく**実装済みモデルの実測から換算**（YF-23ヘッダーが手本。
艦は aegis 155m / carrier 330m の既存規約に整合させる）。

## 2. 手順（定石そのまま）

1. **プリフライト（メインが直列で）**: `git -C <sortie> status` で並走セッションの状態確認。
   **他人の未コミットファイル（ヘリ/keren/ophan、index.html/registry-snapshot.jsの他人分）には
   add/commit/checkout/stash一切禁止（stashは常時全面禁止）**。index.htmlのmtimeが30秒静止するまで
   マージ工程は開始しない。
2. **ビルダー12体を完全並列**（Workflow、`agent(prompt, {model:'fable'})`、effort指定なし）。
   各ビルダーの契約は§3。
3. **マージは1件ずつ直列**（メインまたは直列1体）: `node tools/inline_payload.mjs payloads/<file>` →
   `node tools/registry_gate.mjs` → エントリ数突き合わせ。
   **★payloads/のソースファイルは絶対に削除しない**（fc5a329の教訓＝前回マージ担当が誤削除した）。
4. **Fable検収**: 全12種の `?modelPreview=<key>` 4面図スクショを目視、registry_gate緑、pageerror 0。
5. **コミット**: 並走セッションの編集が残っている場合は部分コミット定石
   （自分のマーカー`@payload:<name>`でhunkをフィルタ→`git apply --cached`でindexのみ→commit。
   作業ツリーの他人分に無接触）。メッセージ末尾:
   `Model: Fable 5 / effort: high（実装: Fable 5並列×12）` + Co-Authored-By。
   push は通常pushのみ（force系禁止）。rejectされたらfetchして自分のコミットだけrebase、
   無理そうなら未pushのまま報告に残す。

## 3. ビルダー1体の契約（12体共通、keyだけ差し替え）

```
所有（書いてよい）: payloads/<file> 1つ + 自分専用scratchpadディレクトリのみ
参照（読むだけ）  : index.html、手本payload（航空機=aircraft_yf23.payload.js、艦=ship_arsenal.payload.js）、
                    docs/spec_payload_registry.md、docs/ref_unit_stats_20260728.md
禁止（触るな）    : index.htmlへの書き込み・他のpayload・git操作（読み取り以外）・
                    リポジトリへの一時ファイル生成・ファイル削除
```

- 手本payloadを**全文読んでから**同じ構造で書く（ヘッダーコメントに形状アイデンティティと
  実寸換算の根拠を書く流儀まで含めて）。数値バランスは既存類似機の継承+`BALANCE TODO`マーク。
- **自己検証ループ（必須）**: index.htmlを自分のscratchpadへコピー→自分のpayloadだけinline
  （`node tools/inline_payload.mjs`をコピー先に向けるか手動splice）→**ポート8911+自分の番号**で配信
  （他セッションが8811台を使う可能性があるため8911〜8923を使う）→
  `msedge --headless=new --virtual-time-budget=20000 --screenshot=<scratchpad>\shot.png "http://localhost:<port>/index.html?modelPreview=<key>"`
  →スクショをReadで目視→形状アイデンティティ3点が読み取れるまで修正ループ。pageerror/コンソールエラー0を確認。
- 新規ファイルはLF改行・UTF-8(BOMなし)。CR混入チェックはgrepでなく**nodeでバイト数**（git-bash grepはCRLFを食う）。
- 終了時: サーバーprocessをkill、scratchpad内の一時物は削除。**リポジトリには自分のpayload 1ファイル以外
  何も残すな・何も消すな**。報告は「完成/未完＋スクショパス＋自己検証結果」のテキストのみ。

## 4. 既知の罠（ビルダー委譲文に毎回同梱）

- `PYTHONIOENCODING=utf-8:backslashreplace`（Python起動時）
- 共有ブラウザMCPは使用禁止（msedge headlessで自前撮影）
- effort `xhigh` を書くな（400全滅）。model指定は `'fable'`
- ポートの多重LISTENに注意（自分の番号以外を使わない・終了時kill）
- ユーザーのプレイURL（8340）は別スナップショット配信＝今回の成果はリポジトリ更新のみでよい
  （8340への同期はユーザー判断。勝手にcpしない）

## 5. 予備ロースター R2（wave1が全部緑で、かつ深夜2時前なら着手可）

EX向け地上ユニット: 認証切れ自律SAM / ROOT送信窓地上中継車 / 戦後地雷除去車 / 移動病院車
（ground_*.payload.js、addGroundModelフック）。着手前に**index.htmlへの重複grepで未実装を再確認**
すること（移動指揮車は既存の可能性が高いので要確認）。civilRescue（evacBus/ambulance）と役割が
被る造形は避ける。

## 6. 完了報告に含めるもの

出荷ユニット数と各key / registry_gateの結果 / pageerror / コミットSHA（push成否）/
除外・積み残しとその理由 / 並走セッションと接触があったか（あれば何を待ったか）
