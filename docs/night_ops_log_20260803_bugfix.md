# 夜間自律運転ログ(バグ修正班) 2026-08-02深夜〜08-03朝

モデルバッチ3班(night_ops_log_20260803.md)と**同一リポジトリで並走中**。衝突回避のための所有権宣言:

```
所有(書いてよい): index.htmlのランタイム関数内の局所修正hunk(下記ログの各修正)・src/ui/radio.js・
                 styles/*.css・docs/night_ops_log_20260803_bugfix.md
参照(読むだけ)  : payloads/** ・tools/** ・docs/spec_model_batch3_20260802.md
禁止(触らない)  : payloadテーブル/レジストリ領域・AIRCRAFT_MODELS等のモデル登録・
                 tools/registry_snapshot.json(--updateはバッチ班の専権)
```

- index.htmlへの書込みは**mtime静止30秒確認後**に限定、1修正=1コミット(自分のhunkだけstage)。stash不使用。
- 出典: 14チャンク全コード精読バグハント(Opus×14)の所見+Fable裏取り。正本=scratchpadのfindings_raw.md。

## 修正ログ(1修正1行、コミットSHA付き)

### Batch 1 — S1×2+ゲームプレイ実害群(23:0x適用、スモーク緑)
- [S1] 戦域帰投シェブロン南北反転: `battleArea.bearing`をatan2(dx,-dz)へ(ファイル規約準拠)
- [S1] チェックポイント復帰後の護衛誤全滅: destroyFriendlyの残数を台帳(total-lost)→盤面(alive数)基準へ
- [S2] 最終喪失だけlossPenalty非課金→常時課金へ(スモークで3×1500=4500実証)
- [S2] guardState.saved復元による二重計上("4/3 SAVED")→復元廃止
- [S2] チェックポイント復帰でintegrity損害が免責→worstIntegrity(最悪値の記録)を新設しランクはそれを読む
- [S2] sortieMarksがチェックポイントで消滅→銀行+復元を追加
- [S2] 復帰時に撃破済み地上TGTが復活しkills/盤面が乖離→destroyedGroundIds銀行+盤面から静かに再除去
- [S2] killCam多重発動でスローモ無限延長→再入ガード
- [S2] wave表末尾のconcurrent連鎖でspawnMissionWave(undefined)クラッシュ→境界ガード
- [S2] concurrent+TGT波が「NON-TARGET」表示→isTgtEntry分岐(× naval/air 2箇所)
- [S2] wave.radio直行経路で{nickname}が生表示→置換をradio.js triggerLine(単一入口)へ移設(実機で置換実証)
- [S2] HEADING表示が"360"を出す→%360
- [S2] 高度/速度テープの負値ティック露出→.tapeRow.hidden(visibility)
- [S3] 無線キュー満杯時、プリエンプト行が待機行を1件無駄に追い出す→順序入替
- [S3] damageFriendlyがguard非activeでも台帳を汚す→activeガード
- スモーク: m01/m-escort起動+pageerror0+置換+ペナルティ実証(scratchpad/smoke_batch1.py)。
  bearingはプローブ未露出のためコード検証(headingRad規約と消費側の両照合)

### Batch 3 — UI/起動+DESTROYED除去(ユーザー指示、23:2x適用、スモーク緑)
- [指示] キル時の「DESTROYED」表記を全廃: ポップアップは「+点数 · 機体名」のみ(span 12px化)、
  キル毎の「TARGET n · ○○ DESTROYED」バナーも廃止(進行系のALL TARGETS DESTROYED等は温存)。
  実機で popup="+1000 · Tu-95"・バナー無し・error 0 を確認
- [S2] 起動時のハンガー画面フラッシュ: startScreenに初期hidden+bodyへdata-game-state静的スタンプ
- [S2] 雲の中でミッション終了→ハンガーが白ベールで覆われたまま: 非playing時はveil目標0で減衰
- [S3] #statusPanel .hudVal同一詳細度の死に定義(min-width:52px側)を削除(見た目不変)
- [S3] #radarLabelOld死にセレクタ削除

### Batch 2 — デバッグフック破壊系+小粒S3(23:4x適用、スモーク緑)
- [S2] forceSpawnAirWave: 艦マウント(model:null)でTypeError→nullガード(艦ボード上で実証)
- [S2] forceFireSpw: 生代入でSP.W無し機がソフトロック→PLAYER_SPWガード+toggleWeapon経由(発射実証)
- [S2] clearMissionRecords: 収入だけ消して支出(購入)が残り財布が恒久マイナス→purchases対消去
- [S2] applyAircraftLoadout: spw無し機でTypeError半端適用→spwSpecガード(既存2セレクタと同型)
- [S2] メニュースティックがドリフトで永久武装解除→applyDeadzone適用
- [S3] gunHitTest射程がGUN_RANGE固定(機体別射程と乖離)→playerGun.getProfile().range
- [S3] forceRetireGuarded: exit無し艦を退避数に数えプローブが永久待ち→filter(f.exit)
- [S3] readAircraftPurchases: コメ(hangar order濾過)とコード(全テーブル濾過)の乖離→AIRCRAFT_ORDER
- [S3] readHighscore: parseIntが"1e9"を1に切る→Number+floor
- [S3] 艦沈没時の生存マウントが無演出で即消滅(1フレーム孤児煙)→WRECK_TIME付与で甲板上炎上
- [S3] resetMusicCombatStateにdelayTimer=0(デブリーフ遅延の持ち越しでcombat曲0.6s無音)
  ★適用時にTDZリグレッション(const musicの手前に挿入)を自スモークが捕捉→即修正、コミット前に根治
- [S3] pathPointAt頂点ちょうどで進入方向を返す(placeOnRouteと不整合)→厳密不等号
- [S3] placeOnRoute: 1点ルートでスポーン時throw(payload到達可)→route.length<2ガード
- [S3] ブースト時カメラジッタが地表クランプ後に加算され0.21m地下→再クランプ
- 見送り(理由付き): forceSelectMissionの状態ガード強化=並走モデルバッチ班のプローブAPI互換を
  夜間中に変えない。STABILITY_MIN/SPAN拡幅+brakeSpeed/stallEntry表修正=飛行感が変わる
  バランス隣接のためユーザー判断待ち(所見はfindings_raw.mdに保存)

### Batch 5 — データ/配置正確性(23:3x適用、スモーク緑)
- [S2] 設置物の埋まり根治: spawnGroundUnitの設置物経路+spawnFriendlyBase+投光器を
  surfaceTopAt(無クランプ)へ。**m-night実測: 全11基 y=84.64(旧)→92.00(天面ぴったり)**。
  m-convoy SAM 2.72m/m01滑走路3.58m/m-city市民塔3.42mも同根治
- [S2] hitboxScaleの直線則乖離3機を是正: mig29 0.95→1.06 / su33 1.05→1.27 / su35 0.96→1.26
  (su35はsu57からのコピペ痕16/21値。可視翼の外を弾が素通りしていた)
- [S2] イージスsubsystem座標: aa-aftを実射点(0,13,50)へ、ciwsを描画ドラム(0,19.5,51)へ
  (旧: ドラムに"AA GUN"ラベル+生きたCIWSは空甲板z=64の不可視箱)
- [S2] Hindの偽警告帯200m: attackRange 1500→1300(ミサイル実射程と一致)
- [S3] forceConfirmMissionの戻り値契約が古い(briefing遷移追加後もSTATE_READYのみ)→成功を
  Falseと誤報告。★露編スイープ「全部m01起動」の真相=プローブのforceCampaign誤用+この誤報告の
  合わせ技(ゲーム本体の露編は無罪)。プローブをforceCampaignCursor経由に修正し露編20本再走中
- [S3] m-cityのTOP COVER無線/コメント「Su-27」→実スポーンのSu-35へ
- [S3] normalizeWaveEntryのプリセット解決にhasOwnProperty(prototypeキー事故防止)
- [S3] コメント正誤2件: 対艦ミサイル「4200/8発」→実1040/2発、露ロースター「All five are
  enemyOnly」→実態(tu95のみ)
- m-convoyの旧スイープcerr=2はSwiftShader環境警告と判明(ゲームバグではない)
