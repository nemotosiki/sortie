

===== first-run =====
[S2致命寄り] index.html:44619 updateStrikeThreat / 32432 computeMissionRank / 32544 recordMissionResult
  欠陥: 基地被弾ペナルティ(`baseDamagePenalty`)が表示用の`score`しか減らさず、ランクにも記録スコアにも財布にも一切効かない。m01のブリーフィング(8031行「基地の被害は君の評価に響く」)と 44598 行の自己コメント「costs the player a rank」の両方がコードと矛盾している。
  発火条件: m01で初見プレイヤーがTu-95に投弾を許す → 「BASE DAMAGED · -1000」バナーとデブリーフの「BASE DAMAGED -1000」は出るのに、RANKは`(kill+timeBonus)/spawnedValue`だけで決まるのでSのまま取れ、`entry.scores`に積まれるのも`result.total*scoreMult`なので報酬も満額。基地を全損させた出撃と完璧な出撃が記録上まったく同じになる。
  確信度: certain
  最小修正案: `computeMissionRank()`の`total`から`baseDamagePenalty`を引く(ratio・記録スコア・財布が同時に追従する)。それを避けるならブリーフィング文と44598行のコメントを「スコアのみ減点」に直す。

[S2実害] index.html:2532 hangarScreen メニュー凡例 / 37841-37844 updatePlayer
  欠陥: 操縦桿(ピッチ=W/S・↑↓、ロール=A/D・←→)とターゲット切替(Tab、35375行)がゲーム中のどこにも表示されない。唯一の操作凡例はハンガー画面の1行で、そこには機銃/ミサイル/兵装切替/フレア/カメラ/操作モード/ヨー/加減速だけが並び、肝心の「曲がり方」が抜けている。
  発火条件: 新規プロファイル → キャンペーン選択 → m01 → LAUNCH。飛び始めた瞬間、プレイヤーは加速とヨーは知っているがピッチもロールも知らない。爆撃機は約60°オフボアサイトに湧く(下記)ので、旋回できないと何も起きないまま海面に落ちる。チュートリアル機構はコード全体に存在しない(`grep -i tutorial` は m01 のコメント1件のみ)。
  確信度: certain
  最小修正案: 2532行の凡例に `W/S・↑↓ ピッチ`・`A/D・←→ ロール`・`TAB 目標切替` を追加する(既存の凡例と同じ`legendKey`で1行に収まる)。

[S2実害] index.html:2493-2497 briefingDifficultyRow / 37202 cycleDifficulty
  欠陥: 難易度の変更手段がキーボードの←→ただ一つしかない。`difficultyArrow`の「◀ ▶」はクリックハンドラを持たず(全ファイルで`difficultyArrow`はCSSとHTMLにしか出現しない)、ゲームパッドもBRIEFINGではD-padが意図的に無効化されている(36287-36289)。`cycleDifficulty`の呼び出し元は35433/35438の2箇所=keydownのみ。
  発火条件: 他のメニュー(キャンペーンカード・ミッション一覧・機体一覧)は全てクリック可能なので、マウスで進んできた初見プレイヤーはブリーフィングの◀ NORMAL ▶をクリックする → 無反応。パッド専用プレイヤーも同様。m01で何度も落とされてもEASYに落とす方法に到達できない。
  確信度: certain
  最小修正案: `briefingDifficultyRow`の2つの`.difficultyArrow`に`cycleDifficulty(∓1)`のクリックリスナを付け、36287のBRIEFING分岐でD-pad左右を`cycleDifficulty`に配線する。

[S2実害] index.html:37710 setState / 2569 retryBtn / 44798 updateMission
  欠陥: ミッションクリア後に「次のミッションへ」経路が存在しない。フォーカスされる主ボタンは常に文言固定の「Retry Mission」で、Enter(35478)も`flyAgain()`→`startMission()`で同じミッションを再出撃する。`currentMissionIndex`を進める処理はboot(35309)と`applyCampaign`(51234)にしかなく、クリア直後には走らない。さらに`setState(STATE_MISSION_SELECT)`が`missionCursor = currentMissionIndex`(37728)を代入するので「CHANGE MISSION」を押してもカーソルはクリア済みのm01に戻る。解禁を知らせるバナー・無線も無い。
  発火条件: 初見がm01をクリア → デブリーフ → いつも通りEnter → m01をもう一度飛ばされる。ゲームを再起動して初めてbootの`nextUp`がm02を選ぶ。
  確信度: certain
  最小修正案: `updateOutcomePending`で記録保存後に、同キャンペーンの次の未クリア解禁ミッションへ`currentMissionIndex`を進め、STATE_COMPLETE時のみ`retryBtn`の文言を「NEXT MISSION」に切り替える(失敗時は現行のまま)。

[S2実害] index.html:42779 deployWave
  欠陥: 波が自前の`radio`を持つと方位コール(`waveBearingCall`)が丸ごと抑止される(`if (spawnPoint && !wave.radio)`)。一方で開幕波の湧き窓は`OPENING_SPAWN_MIN/MAX_RANGE = 2300〜3200m`(4692-4693)で、`RADAR_RANGE = 1400`(2843)の外。つまり「レーダーにも映らず、画面にも入っていない敵」に対する唯一の位置情報が、無線を書いたミッションでは消える。第1波エントリに`radio`を持つミッションは46本中22本。
  発火条件: 露編の初出撃 r01 (10467-10472) は第1波SCRAMBLEに`radio`があるため方位コールが出ない。初見が露編カードを選ぶと、開幕は空のレーダー・空の画面・「飛行場からF-16が2機」という位置情報ゼロの無線だけになる(湧き角は`resolveWaveSpawnPoint`のオフセットクランプで機首から約47〜68°、既定FOVの外)。
  確信度: certain(コード)/ needs-runtime-check(実際に画面外である割合)
  最小修正案: 方位コールを`wave.radio`と排他にせず、`wave.radio`の各行を流した後に必ず1本追加する(idが`wave-bearing-*`で別なのでクールダウン衝突はしない)。

[S3軽微〜S2] index.html:37990 updatePlayer
  欠陥: 対地・対水面の近接警報が一切存在しない。`player.position.y <= 4`でいきなり`applyPlayerDamage(PLAYER_MAX_HEALTH, true)`。失速警告(`stallWarning`)も戦域離脱警告(`battleAreaWarning`)も専用UIを持つのに、初見が最も多く死ぬ高度だけ無警告。
  発火条件: m01は海上の尾追い。HUDと爆撃機を見ている初見が緩降下したまま海面に接触 → 予告なく即死 → MISSION FAILED。EASYでは`incomingDamage 0.6`が乗るので1フレーム目は生き残り、y=4にクランプされたまま次フレームで死ぬ(墜落が「即死」ではなく難易度スケール減算になっているのも意図と食い違う)。
  確信度: certain
  最小修正案: `updatePlayer`で`surfaceTopAt`との差が閾値(例: 60m)を切ったら`showBanner("WARNING · PULL UP", …, "danger")`+警告音を1回だけ出す。併せて墜落は`applyPlayerDamage`を通さず`health = 0`直代入にして難易度スケールを迂回する。

[S3軽微] index.html:45912 showBanner / 42792 deployWave
  欠陥: `pendingBanner`が1枠しかないため、開幕のビッグバナー中(m01はACT 1の2.2s + MISSION STARTの2.4s)に呼ばれた小バナーは最後の1本しか残らない。
  発火条件: m01開幕でまず「WAVE 1 · ENGAGE」が積まれ、同フレームの concurrent 護衛波が「ESCORT · NON-TARGET」で上書きする。さらに t<3.0s の間にプレイヤーがEnterを押せば「FOX TWO · UNGUIDED」がそれを上書きする。結果、7979行が「TGTが出撃の主題で他は天候」と教えるために置いた唯一のバナーが、引き金を早く引いた初見にだけ出ない。
  確信度: certain(コード経路)/ likely(実プレイでの発生)
  最小修正案: `pendingBanner`を1要素の変数から短いキュー(配列)にし、`updateVisualStatus`で1本ずつ`SMALL_BANNER_DELAY`間隔で流す。

[S3軽微] index.html:33014 selectedAircraftId / 2803,2842,32487,37149 (保存キー一覧)
  欠陥: 永続化されるのは difficulty / purchases / missionRecords / highscore の4キーだけで、選択中の機体もキャンペーンも保存されない。`selectedAircraftId`は毎回`DEFAULT_AIRCRAFT_ID`("f16")から始まり、`ensureAircraftInCampaign`(50753)は「今の機体がロスターに無いとき」しか選び直さないので、F-16は常にUSAロスターに含まれる=買った機体には二度と自動で戻らない。
  発火条件: m01〜m02をクリアして最初の1機(最安4,000 CR)を購入 → ブラウザを閉じる → 再起動すると所持機はOWNEDのままだがハンガーはF-16を選択した状態で開き、そのままLAUNCHするとF-16で出撃する。
  確信度: certain
  最小修正案: `selectAircraft`/`applyCampaign`で`sortieSelectedAircraft`・`sortieCampaign`をlocalStorageへ書き、boot時に読んでロスター内なら採用する(不正値はロスター検査で落とす)。

[S3軽微] index.html:7972 MISSIONS m01.story / 7975 epilogue
  欠陥: 初出撃の物語文が「DAGGER 1の後ろに付け」と指示するが、m01の`FRIENDLY_DEPLOYMENTS`は`{ wingman: true }`のみ(40905)で、盤上に出る唯一の友軍機はHAMMER 2。DAGGER 1はpayload側のACE_PROFILEで、13698行のコメント通り「loss-side aircraft stays off-screen」=描画されない。
  発火条件: 初見がブリーフィングの指示通りDAGGER 1を探す → 存在しない。エピローグでも「DAGGER 1のラング少佐」が語られるが、プレイヤーは一度も見ていない。
  確信度: certain
  最小修正案: m01の`story`を「HAMMER 2の後ろに付け」等、実際に盤上に居る僚機を指す文に直す(あるいはDAGGER 1を演出用フレンドリーとして`FRIENDLY_DEPLOYMENTS.m01`に追加する)。

範囲外: `buildDebriefIntelLines`(37695)はミサイル撃墜が多いと「ミサイルを1発も無駄にしなかった」を出すが、m01のTu-95は294HP÷98=3発必須で最短でも6発消費するため、初回クリア時にほぼ確実に事実と食い違う。


===== long-session =====
[S2実害] index.html:44395 damageEnemy → 44195 updateGroundWreck
  欠陥: 破壊された地上設備は `deadTimer = GROUND_WRECK_FOREVER (9999)` で出撃終了まで残り、updateGroundWreck が距離・時間の減衰なしに 0.06秒毎の煙+火花と約2秒毎の explosion SFX / createImpactBurst を永久に出し続ける。
  発火条件: 地上目標が8〜12基あるミッション(index.html:8490 / 8858 等)を進めるほど残骸が累積 → 残骸1基あたり煙約58粒が常駐し、5〜6基で MAX_SMOKE_PARTICLES=320 を食い潰す。以後、ミサイル排煙・自機被弾煙・艦の損傷煙がプールのラウンドロビンに押し出されて出なくなり、同時に毎秒6発前後の爆発音が(12km先でも同音量で)鳴り続ける。
  確信度: certain(算術)／視覚影響は needs-runtime-check
  最小修正案: `GROUND_WRECK_FOREVER` はオブジェクト寿命として残しつつ、updateGroundWreck の煙・火花・sinkBoom を経過時間(例: 破壊後20秒)で打ち切り、以降は静的な残骸メッシュだけにする。併せて sinkBoom の playSfx にプレイヤー距離のゲートを付ける。

[S2実害] index.html:32355 / 40067 spawnEnemy
  欠陥: `wingmanHunterTicker` はセッション中どこでもリセットされない(宣言と `(wingmanHunterTicker += 1) % 3 === 0` の1箇所のみ)。startMission も restartFromCheckpoint も触らない。
  発火条件: 同一ミッションをリトライ／別ミッションを挟むたびに位相がずれ、同じ波が「僚機を狙う敵0機」の回と「2機」の回に分かれる。30分プレイ中に何度も再挑戦するほど、同じ編成なのに僚機への圧力が回ごとに変わり、チェックポイント再開の再現性も崩れる。
  確信度: certain
  最小修正案: startMission の各種カウンタ初期化群(index.html:37290付近の waveNumber/waveIdCursor と同じ場所)に `wingmanHunterTicker = 0;` を追加する。

[S3軽微] index.html:42253 updateFriendlies(僚機のバンク計算)
  欠陥: `-(yawDelta / dt) * WINGMAN_BANK_PER_RATE` が dt=0 を防いでいない。同じ計算をする他の2箇所(index.html:39145 の `dt > 0 &&`、missile-guidance.js:236 の `slice > 0 &&`)は明示的にガードしており、ここだけ抜けている。
  発火条件: clock.getDelta() が 0 を返すフレーム(タブ復帰直後など)に 0/0 → NaN。NaN は clamp を素通りし `friendly.wingBank` に lerp で焼き付くと二度と有限値に戻らず、僚機の quaternion が NaN になって機体が消える(以後の出撃までそのまま)。
  確信度: needs-runtime-check
  最小修正案: `dt > 1e-6` のときだけ bankWanted を更新し、それ以外は前フレームの wingBank を保持する。

[S3軽微] index.html:32984 / 40372 / 40398 surfaceHeightAt 系サンプラ
  欠陥: `surfaceSamples` は単調増加のみで、出撃開始でも世界切替でもリセットされない。コメント(index.html:32982)は「毎フレーム raycast していないことを debug.surfaceSamples() で証明する」と主張しているが、値がセッション累計なので1出撃分の増分を読めない。
  発火条件: 30分プレイ後に debug.surfaceSamples() を読むと数十万の累計値になり、「この出撃で何回サンプリングしたか」の判定に使えない(コメントの契約と実装の乖離)。
  確信度: certain
  最小修正案: startMission と applyWorldPreset で `surfaceSamples = 0;` にする(または `debug.surfaceSamples()` を出撃開始時のスナップショットとの差分で返す)。

[S3軽微] index.html:35279 cockpitRigidBlend
  欠陥: コックピット視点の剛体ブレンド量が startMission / snapCamera のどちらでもリセットされない。startMission は currentCameraFov・cameraShake・damageFlash など同種の視覚状態を全て0に戻しているのに、これだけ前回出撃の値を持ち越す。
  発火条件: 前回出撃を高G中のコックピット視点で終える → 次の出撃の開始数十フレームが前回のブレンド量で描かれ、MISSION START の瞬間だけ視点の揺れ方が違う(damping(0.002) なので収束に1秒前後)。
  確信度: likely
  最小修正案: startMission の `currentCameraFov = BASE_CAMERA_FOV;` の隣に `cockpitRigidBlend = 0;` を足す。

範囲外: index.html:40250 `SUBSYSTEM_ID_BASE + parent.id * 10 + i` は艦1隻あたり subsystem 9基までしか衝突しない前提が暗黙(現行の最大は6基)。payload が10基以上のマウントを持つ艦型を足すと隣の艦のマウントIDと衝突するため、ホスト側で `i < 10` を assert するかブロック幅を spec 由来にすると安全。


===== failure-paths =====
[S2] index.html:41697 damageFriendly / 44299 attemptEnemyGunOnFriendly
  欠陥: applyPlayerDamage には `outcomePending.active` ガードがあるのに damageFriendly には無く、勝利確定後の ACCOMPLISHED バンド中(2.8s)と outro 中(最大16s)に護衛対象が殺されうる。
  発火条件: 護衛ミッションで指定目標を全滅→completeMission(true)→outcomePending。生き残った非TGTの護衛機/CAP(updateMission:44752「A surviving escort or CAP keeps fighting」)が updateEnemies 経由で最後の輸送機を機銃掃射 → destroyFriendly → failGuardObjective → completeMission(false) が outcomePending を破棄し、勝ちが MISSION FAILED になり記録も書かれない。44885 で消されるのは既発射の敵ミサイルだけで、バンド中の新規発射・機銃は止まらない。
  確信度: certain（コードのガード非対称は確定。実際に護衛機が残る配置かはミッション表依存）
  最小修正案: damageFriendly の先頭に `if (outcomePending.active) return;` を追加（applyPlayerDamage:44558 と同じ理由）。outro 中も止めるなら `|| outro.active` も併せる。

[S2] index.html:32457 computeMissionRank
  欠陥: `guardWiped = guardState.lost >= guardState.total` が、チェックポイント復帰で積み上がった `lost`（台帳値）と復帰後に再スポーンした満数の `total`（盤面値）を比較しており、全滅していないのにBキャップがかかる。
  発火条件: 護衛3機のミッションで2機失って撃墜される→復帰(lost=2 のまま、盤面は3機生存)→さらに1機失う→lost=3 >= total=3。2機は無事に離脱し HUD は 2/3 と表示しているのに、ランクが（checkpoint.used の A キャップに加えて）Bまで落ちる。
  確信度: certain
  最小修正案: destroyFriendly:41782 と同じく盤面基準にする（`guardedFriendlies().every(f => !f.alive)`）か、`lost` を `Math.min(lost, total)` で読む。

[S2] index.html:37462 restartFromCheckpoint
  欠陥: 1ソーティ限りのワンショットフラグ `aceDestroyed` / `fearStageReached` / `bomberFirstKillFired` が checkpoint に積まれず、startMission が false/0 に戻したまま復元されない。
  発火条件: エースが第1波にいるミッション（例: 9505 fenrir/surtr → 9526 hati/skoll のスコードロン戦）でエースを撃墜し波クリア→saveCheckpoint→次波で撃墜される→復帰。第1波は再スポーンされない（restartFromCheckpoint は banked wave しか出さない）ので aceDestroyed=false のままクリア → 37692「{ace}は撃墜できていない。あれは雲に入って…」という事実と逆の戦果報告が出る（hook.debug.aceDestroyed も嘘になる）。fearStageReached=0 は復元された高い kills で次の1キル時に上位ステージ台詞を再発火させる。
  確信度: certain
  最小修正案: saveCheckpoint/restartFromCheckpoint にこの3フラグ（少なくとも aceDestroyed と fearStageReached）を追加する。

[S3] index.html:37570 restartFromCheckpoint
  欠陥: startMission が使い捨てで撒く第1波の無線が queue に残ったままチェックポイント復帰するため、盤面から消した波のブリーフィングが再生される。
  発火条件: 復帰時 startMission→spawnMissionWave(waves[0]) が deployWave で「新たな反応——方位XXX」や海戦なら「敵艦隊だ——空母1、イージス艦2…」を triggerRadioLine で積む。その後 37535 で第1波の機体は全部消されるが resetRadio は呼ばれず、続く banked wave の台詞と同 priority で FIFO 順のため第1波の台詞が先に流れる（RADIO_QUEUE_MAX=4 なので押し出されもしない）。
  確信度: certain
  最小修正案: 37570 の hideBigBanner() の直前に `resetRadio();` を入れる（バナー側は既に hideBigBanner で同じ理由の掃除をしている）。

[S3] index.html:41806 failGuardObjective
  欠陥: 護衛全滅時に queue した `config.failRadio` が、直後の completeMission(false) の resetRadio() に必ず消される＝作り込んだ失敗台詞が一度も鳴らない。
  発火条件: failGuardObjective が resetRadio()→radioSay(failRadio, CRITICAL, "guard-failed") で queue に push（state.active=false なので即開始はしない）→ completeMission(false):44927 の resetRadio() が queue.length=0 で破棄→「応答が途絶えた…」だけが残る。radio.js:274 reset() は queue とアクティブ行の両方を消すので取りこぼしはない。
  確信度: certain
  最小修正案: failGuardObjective は showBanner だけにして failRadio の送出を completeMission(false) の resetRadio() より後へ移す（または completeMission に「既に失敗理由の台詞が queue 済みか」を渡す）。

[S3] index.html:44935 completeMission
  欠陥: 失敗時に小バナー（pendingBanner）は潰しているのに `pendingBigBanner` を潰していないため、MISSION FAILED の後ろから「MISSION START」がワイプインする。
  発火条件: ACTオープナー付きミッション（37375-37381 が showBigBanner(ACT…) + queueBigBanner("MISSION START")）で、ACT帯の 2.2s 以内に地形/海面に接触して死ぬ。衝突は applyPlayerDamage(…, true) の bypass 経路なので MISSION_GRACE_TIME(3.0s) を素通りする。MISSION FAILED の 1.8s が切れると updateBanners:45869 が queued を昇格させ、デブリーフ画面（HUDは出したまま）に MISSION START が出る。
  確信度: certain（restartFromCheckpoint:37570 が同じ罠を hideBigBanner で回避しているのが傍証）
  最小修正案: completeMission の pendingBanner クリア箇所（44877）に `pendingBigBanner = null;` を追加する。

[S3] index.html:37749 setState / 37698 buildDebriefIntelLines
  欠陥: 失敗の理由が撃墜に固定されており、戦域離脱・護衛喪失で落ちたソーティにも「撃墜された」という記録が出る。
  発火条件: updateBattleArea:45740 か failGuardObjective:41810 で失敗すると、resultMessage が「機体損傷が限界に到達。再出撃せよ。」、デブリーフ1行目が「撃墜1。敵機は墜ちた。空はまた我々のものだ。」、無線が「応答が途絶えた…」になる。機体は無傷で健在なのに三重に別の事実を主張する。
  確信度: certain
  最小修正案: completeMission(false) に失敗理由（shotDown / outOfArea / guardLost）を渡して保持し、resultMessage と buildDebriefIntelLines の失敗分岐で分ける。

[S3] index.html:44558 applyPlayerDamage（復帰側は 37499 restartFromCheckpoint）
  欠陥: スポーン保護 `missionElapsed < MISSION_GRACE_TIME` が missionElapsed に依存しているため、missionElapsed を積算値のまま復元するチェックポイント復帰では保護が一切効かない。
  発火条件: 300秒地点でバンクした波に復帰 → missionElapsed=300 で再スポーン。初回は原点付近スポーンに3秒の猶予があったが、復帰時は生存している地上SAM/AAの射程内に無防備で湧く可能性がある。playerHitCooldown も0で入る。
  確信度: needs-runtime-check（ロジック非対称は certain、実害はミッションの地上配置と初期位置しだい）
  最小修正案: 別カウンタ（sortieAliveTime）を用意して grace をそれで測るか、restartFromCheckpoint で `playerHitCooldown = MISSION_GRACE_TIME` を入れて復帰直後の被弾だけ抑える。

[S3] index.html:40067 spawnEnemy（wingmanHunterTicker、宣言は 32355）
  欠陥: 「a ratio, not a dice roll, so it holds in every wave」と明記されたウィングマン狩り3機に1機の位相カウンタが startMission でリセットされず、前ソーティの余りから続く。
  発火条件: 同一ミッションをリトライ／チェックポイント復帰すると、前回と同じ波・同じ機数を撒いても hunter になる機体が前回とずれる。RNGを絡めない決定性を狙った設計意図（コメント）とコードが食い違う。
  確信度: certain
  最小修正案: startMission のリセット群に `wingmanHunterTicker = 0;` を追加する。

範囲外: `resetGuardState()` は `worstIntegrity` を戻さない（現状は guardState.active ガードで実害なし、将来 active 外で読むと前ミッションの値が漏れる）。


===== difficulty =====
[S2実害] index.html:44565-44567 `applyPlayerDamage` ← 37992 / 38004 / 38023（墜落判定3経路）
  欠陥: 「即死」であるべき衝突ダメージ `applyPlayerDamage(PLAYER_MAX_HEALTH, true)` にも `incomingDamage` が掛かるため、EASY(0.6) では海面・地形・艦船ハルへの接触が1発で致命にならない。上方向は `clamp(..., 1, PLAYER_MAX_HEALTH)` で潰れるので HARD/ACE では完全な無効果＝倍率が下方向にしか効かない非対称。
  発火条件: EASY で山の裾/艦のクラッシュボックスの角を1フレームだけかすめて即引き起こす → 満タンなら 60 ダメージで生還（NORMAL 以上は確実に死ぬ）。海面は y=4 にクランプされ翌フレームに再度判定されるので死ぬが、その過程で被弾エフェクト・hit SFX が2回鳴り `damageTaken` が 120 積まれる（デブリーフの DAMAGE% が実質2重計上）。44556 のコメント「A crash still counts」が主張する契約と実態が食い違う。
  確信度: certain（算術）/ likely（1フレーム離脱の再現）
  最小修正案: 墜落3箇所を `applyPlayerDamage` 経由ではなく専用の即死パス（`health = 0` → `completeMission(false)`）にするか、第3引数 `ignoreDifficulty` を足して倍率を通さない。

[S2実害] index.html:32543-32545 `recordMissionResult` / 50675-50682 `campaignEarnings` / 50698 `walletFor`
  欠陥: `scoreMult` の接触点は「記録される総合点だけ」と 2790-2795 のコントラクトが宣言しているが、その記録 `entry.scores[0]` はそのままハンガー経済の**収入**である。難易度倍率が価格系に黙って二重伝播している。
  発火条件: HARD(×1.2) で全ミッションを S クリア → `campaignEarnings` が 205,020 ではなく約 246,000 になり、2820-2824 が明記する「ハンガー全部でSランク一掃収入の 1/1.2、最後の機体が campaign 終盤に届く」という較正が崩れる（ACE なら ×1.5）。逆に EASY(0.8) では収入が全機体の総額に届かず、同じプレイ内容でもハンガーを買い切れない。さらに `scores` は降順 top3 なので、一度 HARD で飛ぶと以後の NORMAL 走は**永久にベスト更新＝収入増にならない**（「自己ベストを更新した時だけ稼げる」という 50670-50674 の設計が難易度でロックされる）。
  確信度: certain
  最小修正案: 収入は倍率前の素点で持つ（`entry.scores` とは別に `entry.rawBest` を積む、または `campaignEarnings` 側で `scoreMult` を割り戻す）か、コントラクトのコメントに経済への接触を明記した上で PRICE_CAP の較正基準を決め直す。

[S3軽微] index.html:32515-32520 `recordMissionResult` / 51299 `updateMissionScreen`
  欠陥: 難易度別ベストランク `entry.ranks` は書き込まれるだけで**読み手がリポジトリ内に1件も存在しない**（`grep '\.ranks'` の結果は書き込み2行のみ）。UI が出すのは難易度をまたいだ最大値 `entry.rank` で、どの画面にも「どのティアで取ったか」の表示がない。
  発火条件: EASY で S を取る → ミッション選択の [ HIGHEST RANK ACHIEVED ] は S、[ HIGH SCORE ] には ×0.8 された点数が並ぶ → ACE で同じ S を取ると点数だけ ×1.5 で上書きされ、同一リストに 0.8/1.0/1.2/1.5 倍の値が混在する。プレイヤーには記録がどの難易度のものか判別する手段が一切ない（デブリーフにも難易度表示なし）。
  確信度: certain
  最小修正案: `entry.ranks` を読んでランク横にティア表記を出す（例 `S (ACE)`）。表示する気がないなら書き込みごと落とす（第2ラウンドの `ranks` 配列破損バグも同時に消える）。

[S3軽微] index.html:3033-3035 `SKILL_TIER_ORDER` / 39909-39912 `spawnEnemy`
  欠陥: 難易度が敵に触れる唯一の経路が `SKILL_TIER_ORDER.indexOf(baseSkillId)` に依存しているのに、この配列は `SKILL_TIERS` と手書きで二重管理されており、両者の一致を保証するアサーションが存在しない（`STARTER_AIRCRAFT`/`DEFAULT_AIRCRAFT_ID` には boot アサーションがあるのに、ここだけ無い）。`baseSkillIndex < 0` は**無言でシフトを捨てる**。
  発火条件: `SKILL_TIERS` に第5ティアを足して `SKILL_TIER_ORDER` を更新し忘れる、あるいはペイロードが 10339-10342 の `tables.SKILL_TIERS`（`finalizeRegistries` の freeze は 10388 なので登録時点では書き込み可能）に独自ティアを生やし、波が `skill: "<新ティア>"` を指定する → その敵だけ EASY/HARD/ACE が完全に無効になり、エラーもログも出ない。
  確信度: certain（コード事実）/ needs-runtime-check（発火する追加ティアは未出荷）
  最小修正案: boot 時に `Object.keys(SKILL_TIERS)` と `SKILL_TIER_ORDER` の集合一致を assert する（`finalizeRegistries` 内が最適位置）。

[S3軽微] index.html:39897-39904 `spawnEnemy`
  欠陥: 名前付きパイロットは role を強制的に `"ace"` に上書きするのに、skill は上書きしない。`baseSkillId = SKILL_TIERS[skillId] ? skillId : role.skill` の優先順位により、波が `skill` を書いていると**エースだけ role の expert を失って波の練度を着る**。39895 のコメント「a callsign can never end up flying as line or trash by omission」が主張する不変条件が skill 軸だけ守られていない。
  発火条件: `{ types: [...], ace: "ironback", role: "trash", skill: "rookie" }` のような護衛混成波を1本書く → IRONBACK が `breakChance 0` / `aimScatterScale 2.60` の rookie として飛ぶ（turnScale だけ 1.20）。現行の出荷済み波は `skill: "expert"` しか指定していないため潜在だが、フックは生きている。難易度と重なると EASY では明示 expert すら veteran へ落ちる。
  確信度: certain（コード事実）/ needs-runtime-check（発火する波は未出荷）
  最小修正案: `const baseSkillId = isAce ? (SKILL_TIERS[skillId] ? skillId : role.skill) : ...` ではなく、`isAce` のときは role.skill を skillId より優先する（role の上書きと対称にする）。

[S3軽微] index.html:33515-33520 / 46864-46866 `syncGameHook` / 34476 `forceSpawnRoleWave` / 34513 `roleProbe`
  欠陥: 難易度は3つの実効経路すべてで `DIFFICULTY_TUNING[sortieDifficulty] || DIFFICULTY_TUNING.normal` とフォールバックするのに、デバッグフックの `difficulty.tuning` だけフォールバックが無く、不正な保存値では `undefined` を返す（＝実効は normal なのに読み出しは undefined）。加えて役割/練度計測専用に用意された `forceSpawnRoleWave` / `roleProbe` に対して**難易度を設定・中立化する手段がフックに存在しない**（read-only の `difficulty.selected` のみ）。
  発火条件: localStorage に HARD が残ったプロファイルで `forceSpawnRoleWave(["mig21"], {role:"line"})` を回す → `roleProbe()[0].skillId` が "regular" ではなく "veteran"、被弾計測も 1.35 倍。34459-34463 が「役割比較のためにある」と宣言している計測が、環境依存で静かにズレる。
  確信度: certain
  最小修正案: `hook.difficulty.tuning` に他3箇所と同じフォールバックを付け、`debug.forceDifficulty(id)`（`STATE_PLAYING` 中は拒否）を追加して計測前に normal へ固定できるようにする。

範囲外: `updateDifficultySelector`(37214) は不正な `sortieDifficulty` を "ace" の場合しか修復しないため、壊れた保存値は表示だけ NORMAL に見えたまま localStorage に残り続ける（第2ラウンドの hasOwnProperty 修正を入れるならこの修復も対にすべき）。


===== unlock-records =====
[S2] index.html:50773 computeAircraftSpecBars / 50685 campaignSpending
  欠陥: 購入は「機体idの配列」だけを保存し、支出は読み出し時に `aircraftPrice()` を再計算して求めるが、その価格の元になるスペックバーは `statPercent(v, min(fleet), max(fleet))` で**ハンガー全機に対する相対値**なので、機体が1機増減するだけで既購入機の値段が遡って変わる。
  発火条件: payload が `addAircraft(id, def)` を `{order:false}` なしで登録 → AIRCRAFT_ORDER に1機加わる → 全機の bars が再正規化 → 既に買った機体の `aircraftPrice()` が変動 → `walletFor() = earnings - spending` が跳ねる。弱い機体が入って min が下がると全機の価格が上がり、**ウォレットが負値のまま固定**（`purchaseAircraft` は `wallet < price` で `NEED -x MORE` を出し続け、下限クランプもリセット手段もない）。
  確信度: certain（価格が保存されず読み出し時計算である点、bars がフリート相対である点は 50662/50838-50844 で確定。発火は新規機体登録が条件）
  最小修正案: `aircraftPurchases` を `id` 配列から `{id, paid}` に変え、支出は購入時に確定した `paid` を合算する（表示価格だけ再計算にする）。最低限 `walletFor()` を `Math.max(0, ...)` でクランプする。

[S2] index.html:4347 readAircraftPurchases（実行は 4360）
  欠陥: 購入リストの妥当性フィルタ `raw.filter((id) => AIRCRAFT_ORDER.includes(id))` が、**payload ブロック（10436〜）より前の行 4360 で実行される**ため、payload が `addAircraft` で AIRCRAFT_ORDER に足したハンガー機体は「存在しないid」と誤判定される。
  発火条件: payload 登録のハンガー機体を購入 → localStorage には正しく入る → 次回リロード時、4360 の時点で AIRCRAFT_ORDER にまだその id が無い → 所持から静かに消える。以後どれか1機でも買うと `saveAircraftPurchases()` が切り詰めた配列を書き戻し、**損失が確定**する。
  確信度: certain（行順＝実行順、`addAircraft` の splice/push は 10035-10039、現行 payload は全て `{order:false}` なので今日は潜伏）
  最小修正案: `const aircraftPurchases` の初期化を payload 適用後（`finalizeRegistries()` 以降）へ遅らせるか、`readAircraftPurchases()` の AIRCRAFT_ORDER フィルタを外して「未知idは支出計算からだけ除外・保存はそのまま」に変える。

[S2] index.html:37214 updateDifficultySelector
  欠陥: ACE解禁は `selectedCampaignId` スコープ（37184）なのに難易度の保存先は単一グローバルキー `sortieDifficulty` で、未解禁と判定した瞬間 `saveDifficulty()` まで呼んで**降格を永続化**する。片方向で、元の選択は復元されない。
  発火条件: ロシア編を全クリアして ACE を選択 → リロード。ブート時 `selectedCampaignId` は既定の `usa`（32369）で `updateDifficultySelector()`（35304）が走り、usa 未クリアなので `sortieDifficulty="normal"` を保存 → キャンペーン選択画面に着く前に ACE 設定が消滅。米編クリア済み側でも「露編を覗く/露編のブリーフィングに入る」だけで同じ破壊が起きる。
  確信度: certain
  最小修正案: 保存キーをキャンペーン別（`sortieDifficulty:<campaignId>`）にする。単一キーのままなら、表示・出撃時のみ実効値を normal に落とし `saveDifficulty()` は呼ばない。

[S2] index.html:32555 isMissionUnlocked ＋ 10003 addMission
  欠陥: 解禁判定が「MISSIONS 上の直前スロットが cleared か」だけで、**そのミッション自身の `cleared` 記録を一切見ない**。一方 `addMission` は `{after}` で列の途中に splice できる（10026）。
  発火条件: 既に m-heli までクリア済みのプレイヤーに対し、payload が `addMission(newMission, { after: "m02" })` で m02 と m-heli の間に1本挿す → 次回起動で `isMissionUnlocked(m-heli)` が新ミッションの cleared（false）を見る → **クリア済みの m-heli が LOCKED / タイトル "?????" に戻り**、それ以降も連鎖で閉じる。ランク記録はキー保持で残るのに遊べない、という不整合になる。
  確信度: certain（現行 payload は全て末尾追加なので今日は潜伏）
  最小修正案: `if (missionRecords[MISSIONS[index].key]?.cleared) return true;` を関数冒頭に足す（一度解禁されたものは戻さない）。

[S3] index.html:32485 readMissionRecords
  欠陥: 同じ「保存読み出し」ファミリの中でこれだけ型検証が無い（`readHighscore` は Number+有限判定、`readDifficulty` はキー存在判定、`readAircraftPurchases` は `Array.isArray`）。`JSON.parse(...) || {}` は null/""/0 しか弾かず、配列・数値・文字列をそのまま通す。
  発火条件: 旧ビルドや手書きテストプロファイルが `sortieMissionRecords` に `"[]"` を残す → `missionRecords` が配列になり、`missionRecords[key] = entry`（32547）は通るが `JSON.stringify` が文字列キーを落とすので**記録が永久に保存されない**（解禁チェーンが一切進まない）。`"5"` なら module=strict のためプリミティブへの代入が TypeError となり、`recordMissionResult` が完走ミッションごと落とす。
  確信度: likely（strict 判定のみ needs-runtime-check）
  最小修正案: `const v = JSON.parse(...); return v && typeof v === "object" && !Array.isArray(v) ? v : {};`

[S3] index.html:51224 applyCampaign / 50753 ensureAircraftInCampaign
  欠陥: `pendingPurchaseId`（33020、コメント上は「選択が変わるたびにクリアされる」契約）は `selectAircraft()` でしかクリアされないが、`ensureAircraftInCampaign()` は `selectedAircraftId` を直接代入して `selectAircraft()` を通らない。キャンペーン往復や画面遷移でも消えない。
  発火条件: ハンガーで未所持機に LAUNCH を1回押して「PURCHASE (x)?」を武装 → ESC でミッション選択/キャンペーン選択へ戻り、同じ機体のまま STATE_READY に再入 → **次の LAUNCH 1回押しで確認なしに購入が確定**する（二段階確認は「うっかり支払い」防止のためだけに存在する、と 50940-50942 が明言）。
  確信度: certain
  最小修正案: `applyCampaign()` と `ensureAircraftInCampaign()` の冒頭、および `setState(STATE_READY)` の入口で `pendingPurchaseId = null` にする。

[S3] index.html:32515 recordMissionResult
  欠陥: `entry.ranks[sortieDifficulty]`（難易度別ベストランク）を計算して localStorage まで書いているが、**読む側がコード中に一箇所も無い**（`.ranks` の参照は 32515/32520 の書き込みのみ）。ミッション選択画面は `entry.rank`（総合ベスト）しか表示しない（51299）。
  発火条件: 常時。ACE でクリアしても NORMAL でクリアしても画面上の差は出ず、保存容量だけ増える。コメントが謳う「per-difficulty best」はUIに存在しない。
  確信度: certain
  最小修正案: `updateMissionScreen()` でランク行を難易度別に出すか、書き込み自体を削除する。

[S3] index.html:32527 recordMissionResult
  欠陥: `entry.noDamage` も書き込み専用。デブリーフの NO DAMAGE エンブレムは記録ではなくその場の `damageTaken`/`checkpoint.used` を見ている（37800）ので、コメントが主張する「一度取れば後の雑な出撃で失われない sticky な称号」は実体が無い。
  発火条件: 無傷クリア → 次に同ミッションを被弾クリア → 記録側は `noDamage:true` のままだがどこにも表示されない。
  確信度: certain
  最小修正案: `updateMissionScreen()` のミッション行に `record?.noDamage` のバッジを出すか、書き込みを削除する。

[S3] index.html:34726 forceCampaign / 51234 applyCampaign
  欠陥: `forceCampaign` は `isCampaignPlayable()` を通さないため、ミッションを1本も持たないキャンペーンに切り替えられる。その場合 `campaignMissionIndices` が空になり、`currentMissionIndex = nextUp !== undefined ? nextUp : (campaignMissionIndices[0] ?? 0)` の `?? 0` が**他キャンペーンのミッション0番**を指す。
  発火条件: 空キャンペーンを `forceCampaign` で選択 → `campaignAircraft()` も空→全機フォールバック（50618）で他陣営の機体が飛べる状態になり、そのまま出撃すると結果が m01 のキーに記録される一方、`campaignEarnings(空キャンペーン)` は 0 のまま。ウォレットとランク記録が別キャンペーンに分岐する。
  確信度: likely（現状 CAMPAIGNS は両方ともミッションを持つので到達には payload 追加かデバッグフック経由が要る）
  最小修正案: `forceCampaign` に `if (!isCampaignPlayable(campaignById(id))) return false;` を足し、`applyCampaign` のフォールバックを `campaignMissionIndices[0] ?? currentMissionIndex` にする。

[S3] index.html:34741 clearMissionRecords
  欠陥: 記録と購入は両方消す（ウォレット負債は解消済み）が、**その結果に依存している選択状態を再同期しない** — `selectedAircraftId` / `currentMissionIndex` / ハンガーのバッジ / ミッション一覧のロック表示がすべて消去前のまま残る。
  発火条件: 非スターター機を所持・選択した状態で `clearMissionRecords()` → バッジは OWNED のまま、`ui.hangarWallet` も旧額のまま、LAUNCH だけが `notifyHangarLocked` で無言に拒否される。`currentMissionIndex` も未解禁ミッションを指したままになる。
  確信度: certain
  最小修正案: 末尾で `ensureAircraftInCampaign(); buildHangarUI(); buildMissionList();` を呼ぶ（＝`applyCampaign(selectedCampaignId)` を1回流す）。

範囲外: index.html:51147-51150 の `isCampaignPlayable` コメント（「ロシア編は locked かつ空」）は現行データと逆で、CAMPAIGNS[1] は `locked:false` かつ r01-r20 の20本を持つ。同様に index.html:3309 の「deliberately locked until its missions exist」も失効している。


===== presentation =====
[S2] index.html:44778 / 44853 updateMission・updateOutro
  欠陥: ウェーブクリア待ち(`waveClearTimer -= dt`)とアウトロ進行(`updateOutro(dt)`)がシム時間なのに、それらが出すバナー(bannerTimerはrawDt)と無線(updateRadioはrawDt)は壁時計。updateOutcomePendingだけがrawDtに直されていて同型の欠陥が2箇所残っている。
  発火条件: エースを最後のTGTとして撃墜 → startAceKillCamで1.6秒間timeScale=0.18。その間シム時間は約0.29秒しか進まないので「ALL TARGETS DESTROYED」(1.35秒・壁時計)が消えてから約1.3秒の無音の空白のあと次ウェーブ/アウトロが始まる。CHECKPOINTの`pendingBannerTimer=1.4`が「次ウェーブのバナーへ引き継ぐ」設計(44770のコメント)も同じ1.3秒ぶん破れる。アウトロ中にLONGBOW(艦隊CAPのエース、tgt:false)を墜とすと16秒のシナリオ全体が1.3秒伸び、先に流し終えた無線と撤退バナー/完了がずれる。
  確信度: certain(コード) / likely(体感差)
  最小修正案: animateからrawDtをupdateMissionへ渡し、`waveClearTimer`とupdateOutroの積算をrawDtにする(updateOutcomePendingと同じ契約に揃える)。

[S2] index.html:45684 updateBattleArea
  欠陥: 戦域境界はACCOMPLISHEDホールド中(`outcomePending.active`)は停止するのに、16秒のアウトロ中は生きたまま。しかも警告の無線だけがアウトロの満杯キューに弾かれて消える。
  発火条件: hasOutroミッション(m20)のアウトロ開始。敵は全滅しているので旋回して漫然と飛ぶ → 90%で「RETURN TO THE BATTLE AREA」+ビープ+カウントダウンが走る。同時にURGENTの`battle-area`行はstartOutroが積んだURGENT×4(RADIO_QUEUE_MAX=4)に対し`resolvedPriority <= queue[worst].priority`で**破棄**される(radio.js:223)。演出上は「敵は逃げていく」と喋りながら赤バナーだけが出て、そのまま演出中にMISSION FAILEDに落ちうる。
  確信度: certain
  最小修正案: updateBattleAreaの早期returnを`|| outro.active`まで広げる(ACCOMPLISHEDホールドと同じ扱い)。

[S2] index.html:41699 damageFriendly / 41810 failGuardObjective
  欠陥: applyPlayerDamage(44558)は`outcomePending.active`で明示的に無効化されているのに、護衛対象へのダメージ経路には同じガードが無く、勝利バンド表示中の被弾で勝ちが負けに反転する。
  発火条件: 護衛ミッションで最後のTGTを撃墜 → MISSION ACCOMPLISHED(2.8秒)+勝利スティング再生。この間もupdateEnemies/updateFriendliesは回るので、生き残りの非TGT機の機銃(44330)が最後の輸送機を墜とす → failGuardObjective → completeMission(false)がoutcomePendingを捨ててSTATE_GAMEOVERへ。ACCOMPLISHEDのバンドがMISSION FAILEDに上書きされ、鳴り終わったスティングだけが残る。
  確信度: likely(到達には勝利ホールド中の対友軍射撃が必要)
  最小修正案: damageFriendly冒頭を`if (gameState !== STATE_PLAYING || outcomePending.active) return;`にする。

[S2] index.html:41808 failGuardObjective
  欠陥: ミッション個別に書かれた`config.failRadio`(CRITICAL)をキューに積んだ直後に`completeMission(false)`が同フレームで`resetRadio()`を呼ぶため、その行は一度も再生されない。
  発火条件: 護衛対象を全滅させて任務失敗。41806でresetRadio→41808でfailRadioを積む→41810のcompleteMission(false)が44927で再度resetRadio()してキューを空にし、汎用の「応答が途絶えた…」だけを流す。triggerLineはキューに入れるだけでその場で発話しないので、常に確定で消える。
  確信度: certain
  最小修正案: failRadioの投入をcompleteMission(false)の**後**へ移す(またはcompleteMissionのresetRadio前に既存CRITICALがあれば温存する)。

[S2] index.html:42792 deployWave(concurrent分岐)
  欠陥: spawnMissionWaveは本隊とconcurrent随伴を同一フレームで連続deployするため、本隊の`WAVE n · INBOUND`が随伴の`ESCORT · NON-TARGET`に即上書きされ、一度も描画されない(小バナーの表示枠も待機枠もそれぞれ1つしかない)。
  発火条件: concurrent随伴を持つウェーブ全部。決戦(9642〜)は全ウェーブが随伴付きなので、プレイヤーは「WAVE 1 · ENGAGE」「WAVE 3 · INBOUND」を一度も見られず、代わりに雑魚の名札だけが出る。ウェーブ1ではMISSION STARTのバンド待ちでpendingBannerが2回書かれ、やはり後着が勝つ。
  確信度: certain
  最小修正案: 随伴のバナーは`pendingBanner`側へ回す(本隊バナー継続 → SMALL_BANNER_DELAY後に随伴)か、随伴が既に表示中の本隊バナーを上書きしないようshowBannerに「表示中を潰さない」経路を足す。

[S3] index.html:37051 updateAudioCues / 46828 updateHud
  欠陥: ACCOMPLISHEDホールド中もgameStateはSTATE_PLAYINGのままなので、戦闘中のHUD/警報生成が全部生き続け、勝利演出に重なる。ガードが入っているのはapplyPlayerDamage・updateBattleArea・updateMissionの3箇所だけ。
  発火条件: 最後のTGT撃墜後の2.8秒間。生き残り機が新たにミサイルを撃つ → 画面全体が赤くなる`missileAlert`+ミサイル警報が勝利スティングに重なる(当たってもダメージは入らない)。狙われているだけでもRWRチャープが鳴り続ける。プレイヤーがこの間に発砲すれば`FOX TWO · TARGET…`のバナーがpendingBanner経由でMISSION ACCOMPLISHEDのバンドに0.8秒後に重なり、#hudが隠されないSTATE_COMPLETEのデブリーフ画面にまで残る。
  確信度: certain
  最小修正案: updateAudioCuesの早期returnとupdateHudのmissileAlertトグル条件に`&& !outcomePending.active`を足す。

[S3] index.html:44823 startOutro
  欠陥: アウトロ開始時の`resetRadio()`が、アウトロを引き起こしたその撃墜が積んだエースの断末魔(`ace-down-<callsign>`)を巻き添えで消す。
  発火条件: 最終TGT=エース。撃墜時にURGENTで`ace-down-vulture`が積まれるが、直前4.5秒以内に別の`enemy`話者の行が流れていると`speakerReadyAt.enemy`ゲート(radio.js:266)で待たされて発話開始できない。アウトロは1.35秒(キルカム込みで実測2.6秒程度)後に始まりresetRadioでキューごと破棄 → 「こちらヴァルチャー…機首が…上がらない…！」が一度も出ないまま「新たな反応！」に切り替わる。発話済みでも残りホールドを切られて途中で消える。
  確信度: likely
  最小修正案: startOutroのresetRadioを「NORMAL以下のみ破棄」にするか、`radioIsIdle()`になるまでアウトロ開始を遅延させる。

[S3] index.html:37744 setState(STATE_COMPLETE / STATE_GAMEOVER分岐)
  欠陥: 決着側の分岐だけ`hideBigBanner()`を呼ばないため、`pendingBigBanner`が残っていると勝敗バンドの直後に予約済みの「MISSION START」がデブリーフ画面へ湧いて出る。
  発火条件: ACT開幕ミッション(startMission:37377-37378でACTバンド2.2秒+MISSION STARTを予約)で、そのACT_BANNER_TIME中にソーティが決着する(墜落はbypassCooldownでMISSION_GRACE_TIMEを無視する / デバッグフックのforceStartOutro)。MISSION FAILEDの1.8秒が切れた瞬間、updateVisualStatus:45869がpendingBigBannerを拾って「MISSION START」をワイプインさせる。
  確信度: needs-runtime-check(到達条件が狭い)
  最小修正案: COMPLETE/GAMEOVER分岐の先頭で`pendingBigBanner = null`(またはhideBigBannerせずに予約だけ破棄)。

[S3] index.html:36262 updateGamepadInput
  欠陥: パッドのSTART(または□以外の決定)がデブリーフで`flyAgain()`を直接呼び、キーボード側にある「1回目はエピローグを完走させる」段(35470)が無い。
  発火条件: STATE_COMPLETEでエピローグがタイプ中にSTART押下 → 即startMission。35467のコメントが宣言している「first press skips, second press acts」契約がパッドだけ成立せず、キャンペーンログ(AFTER ACTION)が読めないまま消える。マウスの`retryBtn`クリック(35330)も同様。
  確信度: certain
  最小修正案: 36262の`else`を`else if ((gameState === STATE_COMPLETE || gameState === STATE_GAMEOVER) && epilogueState.active) finishEpilogue(); else flyAgain();` に分岐させる(retryBtnハンドラも同様)。

[S3] index.html:36872 playMusicSting / 37721-37739 setState(メニュー系分岐)
  欠陥: 勝利スティングを止めるのは`clearMissionObjects()`経由(startMission)と、ホールド中に負けた場合(44872)だけ。メニューへ戻る経路では止まらず、メニューBGMの上に鳴り続ける。
  発火条件: MISSION ACCOMPLISHEDから2.8秒でデブリーフ → 即ESC / 「◀ CHANGE MISSION」/「◀ CHANGE AIRCRAFT」。desiredMusicSlotが"menu"に切り替わりクロスフェードでメニューベッドが立ち上がる一方、musicバス直結のstingSourceは最後まで再生される(スティング長 > 2.8秒なら必ず重なる)。
  確信度: needs-runtime-check(スティング素材長に依存)
  最小修正案: setStateのCAMPAIGN_SELECT/MISSION_SELECT/BRIEFING/READY分岐(既に`hideBigBanner()`を呼んでいる場所)で`stopMusicSting()`も呼ぶ。

範囲外: `spawnMissionWave`が`missionWaveIndex`を進めた後の`deployWave`内で`waveClearTimer = -1`を書くため、キルカム中に到着した随伴の分だけウェーブクリア判定が再度1.35秒待たされる(演出ではなく進行の話)。
