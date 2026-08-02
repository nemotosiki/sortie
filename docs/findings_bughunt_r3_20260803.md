

===== perf-hotpath =====
[S2実害] index.html:46525 syncGameHook (呼び出し=35866, 毎フレーム無条件)
  欠陥: プローブ用の全状態シリアライズを毎フレーム実行しており、その中に O(M²) のミッション解放判定が入っている。
  発火条件: 常時（メニュー含む全state）。46768 `unlocked: MISSIONS.map(i => isMissionUnlocked(i))` は、実行時 MISSIONS≈40（基本20＋インラインpayloadの rus 20、10444〜12462）。米編プレイ中は約20件が `campaignSlotOf < 0` に落ち、その各件が 32566 で長さ40の `.map()`+`.filter()` を新規確保し missionCampaignId を40回呼ぶ → 1フレームあたり配列約40本／反復約1,600回、60fpsで約2,400配列・96,000反復/秒。加えて 46831 `hook.enemies = enemies.map(...)`（敵1体につき外側+position+fwd の3オブジェクト＝敵40体で120個）、46751 `enemies.filter().map()`、46619 friendlies.map、46874 enemyMissiles.map、46613/46614 marker配列のスプレッド複製、46780 `CAMPAIGNS.map` 内の campaignMissionCount/campaignClearedCount（各 MISSIONS.reduce＝40反復×2×2キャンペーン）、campaignAircraft() の Set+filter×3、46679 closestStrike の全敵走査。合計で毎フレーム約300オブジェクト＋50配列＝約18,000オブジェクト/秒のGC圧。
  確信度: certain
  最小修正案: syncGameHook 全体をデバッグフラグ（例 `window.__probe` の有無）でゲートするか、少なくとも `mission.unlocked` / `campaign` / `mission.enemies` のような静的・低頻度な枝を数フレームに1回・または変更時のみ更新に落とす。isMissionUnlocked の兄弟インデックスはキャンペーン切替時に1回だけ組んでキャッシュする。

[S2実害] index.html:46220 updateEnemyHudMarkers / 46136 updateFriendlyHudMarkers
  欠陥: マーカーループ内で「style.left/top を書く → 次の反復で window.innerWidth/innerHeight を読む」を交互に繰り返しており、レイアウト強制フラッシュのパターンになっている（かつ同じ2値を毎反復読み直す冗長）。
  発火条件: STATE_PLAYING で画面内コンタクトが増えるほど線形に増加。1フレームの読み取り回数＝boresight 2(45793)＋targetArrow 2〜4(45998/46040)＋baseMarker 2(46087)＋friendly 2×可視数(46136)＋enemy 2×active数(46220)＋targetBox 2(46269)＋ccip 2(38528)＋pitchLadder 1。艦隊戦で画面内12コンタクトなら約35回/フレーム＝2,100回/秒、そのすべてが直前の absolute 要素へのスタイル書き込みの後に来る。HUD配下は敵1体につき5ノード（45724〜45741）なので敵40体で200ノード超のレイアウトツリーを毎回同期させうる。
  確信度: likely（レイアウト強制の有無はエンジン依存、needs-runtime-check。読み取りの冗長性自体は certain）
  最小修正案: resize() で `viewportW/viewportH` をキャッシュし（47160の resize が既に同じ値を読んでいる）、HUD側は全部そのローカルを参照する。

[S2実害] index.html:42981 updateEnemies（loiter枝の `for (const mate of enemies)`）
  欠陥: 巡回（loiter）中の航空機ごとに enemies 全体を線形走査して護衛/艦CAPの station を選び直しており、完全な O(n²)。
  発火条件: pursuit/hunt/strike/formation のいずれにも入っていない航空機が対象。enemies[] には艦・地上・ヘリ・サブシステム（マウント）も同居するので分母が膨らむ。総力戦級（艦5隻＋マウント十数基＋航空波）で enemies≈50、loiter機20とすると 20×50=1,000 回の distanceToSquared/フレーム＝60,000回/秒。しかも結果（最寄りの striker / 最寄りの艦）はフレーム間でほぼ不変。
  確信度: certain
  最小修正案: 護衛先・艦CAP先の候補解決を全機共通で1フレーム1回だけ行うか、`enemy.stationRefTimer` を持たせて 0.5s 間隔で再解決し、間はキャッシュした参照を使う。

[S2実害] index.html:38514 updateCcip → 38288 predictImpact / 38303 refineImpact
  欠陥: 爆弾系SP.W を選んでいる間、着弾点予測を毎フレーム完全再計算しており、その中で地形メッシュへのレイキャストを最大24回撃つ。
  発火条件: `PLAYER_SPW.kind === "bomb"`（3538）を選択したまま飛んでいる全フレーム。predictImpact は BOMB_PREDICT_STEP=0.1／BOMB_MAX_FLIGHT=14（33138付近）なので最大140ステップ、各ステップで reliefCeilingAt が world.mountains 全件（プリセットにより7〜20件＋corridor＋plateau）を走査。続く refineImpact は 8＋16＝最大24回の surfaceHeightAt(40110) を呼び、footprint 内では毎回 `mountain.mesh.updateMatrixWorld()` ＋ `Raycaster.intersectObject()`（結果配列を都度確保）を実行。夜間都市のプラトー上の爆撃行程では軌道全域が footprint 内なので24回すべてが実レイキャストになる（山メッシュは CylinderGeometry(16,5)≒192三角形＝約4,600三角形テスト/フレーム）。
  確信度: certain
  最小修正案: updateCcip を 2〜3フレームに1回（または機体姿勢・速度・高度の変化が閾値以下ならスキップ）に間引き、前回結果を保持して表示する。refineImpact の粗探索段は reliefCeilingAt（レイ不要）で済ませ、実レイキャストは最終の数回だけに絞る。

[S3軽微] index.html:35864-35865 animate（updateHud / drawRadar が state 無条件）
  欠陥: `body[data-game-state]` が campaignSelect / missionSelect / briefing / ready のとき #hud は `display:none !important`（index.html:70-79）なのに、計器のDOM書き換えとレーダーの全面再描画を毎フレーム続けている。
  発火条件: 上記4stateに滞在している全フレーム。updateHud は compassTick 25本（COMPASS_TICK_COUNT=25, 33390）へ transform 文字列＋toFixed(1)＋classList、tape 2本×9行（TAPE_ROW_COUNT=9, 33394）、さらにスコア/速度/高度など約30個の textContent 書き込み → 約80要素分の文字列生成＋スタイル書き込み/フレーム。drawRadar は canvas を clearRect して枠・グリッド・2円・視野コーン・N/E/S/W の fillText 4回・自機矢印（shadowBlur 7）まで毎フレーム描き直す。すべて不可視。
  確信度: certain
  最小修正案: animate 内で `if (gameState === STATE_PLAYING || gameState === STATE_COMPLETE || gameState === STATE_GAMEOVER)` を updateHud/drawRadar に付ける（CSSのゲート条件と同じ4stateを除外するだけで足りる）。

[S3軽微] index.html:42837 updateEnemies（formation枝の `enemies.find` 2連）
  欠陥: formation 行動の機体ごとに `enemies.find()` でリーダーを毎フレーム線形探索し、外れると同じ配列をもう一度全走査する。
  発火条件: `spec.behavior === "formation"` の波が出ている間。enemies≈50・編隊機4機なら 4×50=200 回/フレーム、リーダー死亡でフォールバックに落ちると 400 回/フレーム＝24,000回/秒。formationLeaderId は波の生成時に決まっており、フレーム間で変わるのは「そのIDが生きているか」だけ。
  確信度: certain
  最小修正案: `enemy.formationLeaderRef` を波の生成時に持たせ、`ref.alive` が false になったときだけ再解決する。

[S3軽微] index.html:37750 updatePlayer / 41916,41936,41937,42023 updateFriendlyWingman
  欠陥: 「ミッション実行中は地形レイを撃たない」というコード自身の契約（40193-40202 の CONVOY_BAKE_STEP 前文「convoy routes are baked at spawn precisely so this stops climbing once the mission is running / debug.surfaceSamples() is the gate on it」）に反し、毎フレーム surfaceTopAt/surfaceHeightAt を呼んでいる。
  発火条件: STATE_PLAYING の全フレーム。内訳＝自機の地形衝突1回＋僚機4回（station床・前方1.8s床・現在床・最終床）＋自機ミサイル1〜2回/発＋爆弾。surfaceSamples（32988）は関数入口で無条件に加算される（40111/40137）ので、山の footprint 外でもカウンタは 60fps×5以上＝300/秒で伸び続け、`debug.surfaceSamples()` ゲートは常に赤になる。footprint 内（プラトー上・山岳回廊）では実レイキャスト＋updateMatrixWorld＋結果配列確保が同数走る。
  確信度: certain
  最小修正案: 僚機の床サンプルをヘリと同じ間隔ゲート（HELI_TERRAIN_INTERVAL, 43516の方式）に載せ、自機の衝突判定は `reliefCeilingAt` で山の footprint 内に居るときだけ実レイに落とす。カウンタ契約を維持できないなら、コメント側を実態に合わせて訂正する。

[S3軽微] index.html:46199-46224 updateEnemyHudMarkers
  欠陥: 画面外・後方のコンタクトや艦のマウントを含む全生存敵に対して、毎フレーム DOM マーカーを維持し、文字列生成と7回の classList.toggle を実行している（`active` が false の敵にも同じ処理が走る）。
  発火条件: 艦隊戦で enemies≈40（うちマウント十数基は 46979 でレーダーからは除外されているのにマーカーは作られる）。1体につき classList.toggle 7回（46199-46209）＋`enemyDisplayName()` の文字列連結（46212, 4570）＋`String(distance)`（46216）＝毎フレーム 280回のtoggle＋80本の文字列、60fpsで16,800回＋4,800本/秒。うち画面内に描かれるのは通常数体だけ。
  確信度: certain
  最小修正案: `isHudProjectionVisible` の判定を先に取り、off-screen の敵は `classList.toggle("active", false)` だけで早期 continue する（表示名・距離文字列・残り6つのtoggleは on-screen のときだけ計算する）。

[S3軽微] index.html:46969 drawRadar / 47011,47031
  欠陥: スコープのブリップ描画が1体ごとに canvas の shadowBlur を使っており（TGT機はリング描画でもう1回）、コンタクト数に比例して最も高コストな描画パスが増える。加えて 46969 で方位ラベル用のネスト配列リテラル `[["N",0],["E",90],["S",180],["W",270]]` を毎フレーム5本確保している。
  発火条件: 生存する非サブシステム敵の数に比例。TGT主体の25コンタクトなら shadowBlur を伴う描画が 25（ブリップ, 47011）＋25（TGTリング, 47031）＝50回/フレーム＝3,000回/秒。canvas の影付き描画は塗りごとに別パスのブラーを走らせる。
  確信度: needs-runtime-check（配列リテラルの毎フレーム確保は certain）
  最小修正案: 方位ラベルの配列をモジュールスコープの定数に上げる。ブリップの発光は shadowBlur ではなく事前に作った小さなグロー画像の drawImage、あるいは選択中/TGT のみ shadowBlur を許可する形に絞る。

[S3軽微] src/ui/radio.js:241 createRadioController.update
  欠陥: タイプライター表示中、`revealedChars` が進まなかったフレームでも毎回 `fullText.slice()` を作って textContent に代入している。
  発火条件: 無線再生中の全フレーム。RADIO_CHAR_INTERVAL=0.03（99行）に対して 60fps＝0.0167s なので、約4割のフレームは前フレームと同一の文字列を再生成して DOM に書き戻す。長台詞（RADIO_HOLD_MAX 前提で最大200字級）では毎回200字の部分文字列確保＋テキストノード置換＝そのたびに無線パネルの再レイアウト。
  確信度: certain
  最小修正案: while ループで実際に `revealedChars` が増えたときだけ textContent を書く（進捗フラグを立てて分岐する）。

範囲外: index.html:39041 updateLock は、選択武器が多目標SP.Wでなくても毎フレーム `inCone` 配列とコンタクトごとの `{id, distance, enemy}` を確保しており、39119 の updateMultiLock は非多目標時に即 return してそれを丸ごと捨てている（先に `weapon.multi > 1` を判定すれば確保自体が不要）。
範囲外: index.html:50637 sizeMenuCanvas は `canvas.clientWidth/clientHeight`（＝確実にレイアウトを強制する読み取り）を行い、STATE_MISSION_SELECT では renderMissionScreenFrame から毎フレーム2回呼ばれる。


===== ai-degenerate =====
[S2実害] index.html:43401 updateShip
  欠陥: 山回避の目標方位が X 軸で鏡像。`Math.atan2(dx, -dz)` は placeOnRoute の★注記（42284行）が「これを使うな」と名指ししている誤形で、正しくは `Math.atan2(-dx, -dz)`。
  発火条件: 艦が山の footprint（r*2.0+160）内に入る → 例: 山の +X 側 300m にいる艦は「離れる」つもりで forward=(-1,0) を向き、山へ真っ直ぐ突っ込む。脱出条件が無いので島に埋まるまで舵を切り続ける。Z 軸上に山がある時だけ正しく見えるので隠れていた。
  確信度: certain
  最小修正案: `desiredHeading = Math.atan2(-dx, -dz)` に直す。

[S2実害] index.html:43394 updateShip
  欠陥: 海域フェンス（原点方向へ戻す舵）の方位も X 鏡像。`Math.atan2(-x, z)` は原点方向 (-x,-z) を向く式ではなく、正しくは `Math.atan2(x, z)`。
  発火条件: `originDistance > 1900` の艦。spawnNavalWave は center を 1500 に丸めるだけで、僚艦は beam 430×rank+stagger だけ外側に置かれる（5隻編成で最大 ~2360）ので、外側の護衛艦は**スポーン直後からフェンス圏内**。以後 X が単調増加、Z だけ 0 付近で振動しながら盤外へ航行し続ける（コメントの「fleet never beaches」契約が成立しない）。
  確信度: certain
  最小修正案: `Math.atan2(enemy.group.position.x, enemy.group.position.z)`。

[S2実害] index.html:38652 attemptEnemyMissile
  欠陥: charge が僚機（wingmanHunter 経路の huntRef）でも「艦 or 輸送機」の二択にしか分岐せず、非艦フォールバックの LIFELINE 台詞を URGENT で流す。
  発火条件: `wingmanHunter`（spawnEnemy 39804 で 3機に1機・全ミッション）が僚機にミサイルを撃った瞬間。FRIENDLY_DEPLOYMENTS は「wingman: true が全40エントリ」なので、輸送隊の存在しない m01/m-heli/r01… でも COMMAND が「敵機がLIFELINEにミサイルを撃った！ 輸送機は回避できない」と叫び、URGENT で無線キューを割り込む。
  確信度: certain
  最小修正案: `if (charge === wingmanRef相当 / charge.kind === "wingman") ` を先に分岐して無線を出さない（または僚機用の台詞にする）。

[S2実害] index.html:43542 updateHeli
  欠陥: ステーション点の周回速度が機体の最大速度を超えているため、「近づいたら緩める／到達したらホバリング」の分岐が構造的に到達不能。`spec.orbitRate * spec.standoff` = 0.16 × 620 = 99.2 m/s に対し `dashSpeed` は 68 m/s。
  発火条件: ヘリがスポーンした瞬間から常時。stationRange が 260 を下回れないので永久に dash 固定、`speedFraction` は常に 1、バンク/機首下げも最大に張り付き、ホバリング状態（コメントが機体アイデンティティと明記）は一度も出ない。プレイヤーが止まっても解消しない。
  確信度: certain（算術）／ likely（見え方）
  最小修正案: `orbitRate` を `dashSpeed / standoff` の 0.5 倍程度（≒0.05）まで落とすか、station をリング上の**現在位置に最も近い点**から一定角だけ先に置く方式へ変える。

[S2実害] index.html:44104 damageEnemy / 43899 updateGroundWreck
  欠陥: 地上目標の残骸は `deadTimer = GROUND_WRECK_FOREVER(9999)` で出撃終了まで生き続け、その間ずっと 0.06 秒ごとに煙、1.5〜2.5 秒ごとに `createImpactBurst` + `playSfx("explosion")` を出す。コメントの「the odd secondary」と実態が乖離。
  発火条件: 地上ミッション（1面あたり 16 基級）で目標を潰していくほど累積。16 基全壊で煙は約 267 spawn/s ＝ `MAX_SMOKE_PARTICLES` 320（寿命 2.8〜4.2s）を 3 倍近く超過し、プールが残骸煙で埋まってミサイル軌跡・被弾煙・航跡が消える。爆発 SE も約 8 回/秒で鳴り続ける。
  確信度: certain（レート計算）／ likely（体感）
  最小修正案: 残骸の煙/二次爆発に減衰時間（例 20〜30 秒で `smokeTimer` 間隔を伸ばして停止）と、プレイヤー距離によるカリングを入れる。

[S2実害] index.html:42073 updateFriendlyCarrier
  欠陥: 「海の真ん中へ戻す」舵が updateShip と同じ X 鏡像（`Math.atan2(-x, z)`）。
  発火条件: 友軍空母が原点から 3200 を超えた時。コメントの「turned back toward the middle of the sea if it ever wanders out」に反し、X 方向へ離れ続ける。m03/m-carrier で長時間の出撃をすると護衛対象が盤外へ航行する。
  確信度: certain
  最小修正案: `Math.atan2(friendly.group.position.x, friendly.group.position.z)`。

[S3軽微] index.html:42716 updateEnemies
  欠陥: `positionSubsystem` は生存中の艦の分岐でしか呼ばれない。直前のコメントは「Mounts follow the hull the instant it has moved, **alive or wrecked**」と主張しているが、死亡した艦は 42672 の `!enemy.alive` 分岐で `continue` するため一度も呼ばれない。
  発火条件: 砲座付きの艦（cruiser/arsenal/lhd/aegis 等）を撃沈 → damageEnemy 44150 が全マウントを `deadTimer = SUBSYSTEM_WRECK_TIME` で残骸化 → updateShipSinking が船体を前進させつつ `-sinkDepth` まで沈める間、マウントは死亡フレームの座標で固定され、`updateSubsystemWreck` の煙と火花が沈んだ船体の上空に浮いたまま出続ける。
  確信度: certain
  最小修正案: `!enemy.alive` 分岐の `updateShipSinking` 呼び出し直後にも `for (s) positionSubsystem(enemy.subsystems[s])` を回す。

[S3軽微] index.html:41234 spawnFriendlyTransports
  欠陥: 編隊オフセットをワールド軸で加算している（`lateral` を x、`trail` を z）。同じ役割の spawnFriendlyShips（41300 付近）は `course`/`across` の進行方向フレームで正しく組んでいるので、片方だけ規約違反。
  発火条件: 東西寄りの回廊を持つ deployment（FRIENDLY_DEPLOYMENTS はペイロードから登録可能）。start/exit を結ぶ線が X 軸寄りだと `lateral` が進行方向に効いて機体が同一線上に縦列（先頭〜最後尾が spacing ぶん前後に並ぶ）になり、`trail` が横間隔になる。既存の m-escort が南北回廊なので露見していないだけ。
  確信度: certain
  最小修正案: `course`/`across` を先に求め、`lateral` は across、`trail` は -course 方向に加算する。

[S3軽微] index.html:42376 spawnNavalWave
  欠陥: 山からの押し出しが「山リストを1周するだけ」の単一パスで、後段の山で押し戻された結果が前段の山の中に入っても再検査しない。
  発火条件: 山が2つ近接した海域に艦のスロットが落ちた場合、最後に評価した山からは離れるが別の山の footprint 内に着地する。そこから更に 43401 の鏡像バグが働くと、その艦は山へ舵を切り続ける（2件の複合で地形に埋まる）。
  確信度: likely
  最小修正案: 押し出しループを収束するまで（上限 3〜4 回）繰り返すか、全山の押し出しベクトルを合成して 1 回で解く。

[S3軽微] index.html:41560 retireFriendly
  欠陥: `guardState.saved += 1` と続く CONVOY CLEAR バナー処理が `guardState.active` を確認していない。
  発火条件: guard ブロックを持たない（または vulnerable な機体がゼロで armGuardObjective が空振りした）deployment が transports/ships を出し、1機でも exit に到達した時。`guardedFriendlies()` が空なので `outstanding` が即 false になり、護衛目標が存在しないミッションで「CONVOY CLEAR · 1/0 SAVED」バナーが出る。
  確信度: likely
  最小修正案: 関数冒頭の `retired = true` の直後に `if (!guardState.active) return;` を置く。


===== audio-system =====
[S2実害] index.html:35519 visibilitychange ハンドラ（対応: 36388 updateEngineAudio / 36415 updateLockDroneAudio）
  欠陥: タブ非表示でrAFが止まると音の更新も止まるが、AudioContextは走り続けるため、ループ音（engineSource, loop=true）とロックドローン（lockOsc）が最後のゲインのまま鳴り続ける。既存ハンドラは clearTransientInputs（入力だけ）で、音には一切触れていない。
  発火条件: STATE_PLAYING中にAlt+Tab／別タブへ切替 → animate() 停止 → updateEngineAudio/updateLockDroneAudio が呼ばれない → エンジン轟音とロック音が無限に鳴り続ける（戻るまで止まらない）。ロック中に切り替えるとサウ音も残る。
  確信度: certain（コード上）/ 可聴性 likely
  最小修正案: visibilitychange の `document.hidden` 分岐で `audioSystem.context?.suspend()`（またはstopEngineLoop()+ドローン停止）、復帰時に `ensureAudio()` で resume する。

[S2実害] index.html:43889 updateGroundWreck（44094 `deadTimer = GROUND_WRECK_FOREVER`）
  欠陥: 破壊された地上設置物は `GROUND_WRECK_FOREVER = 9999` でソーティ終了まで残り、その間 `sinkBoomTimer` が 1.5〜2.5秒ごとに `playSfx("explosion")` を無制限・無減衰・距離無関係で鳴らし続ける。生存中のスモークと違い上限も減衰もない。
  発火条件: 地上目標の多いミッションで設置物を10基破壊 → 以後ミッション終了まで平均 5回/秒 の爆発SEが、プレイヤーが20km離れていても同音量で鳴り続ける。破壊数が増えるほど累積し、爆発音の絨毯になる。
  確信度: certain
  最小修正案: sinkBoomTimer のクックオフに寿命（例: 死亡後20秒で打ち止め）と距離ゲート（player.position との距離で音量減衰／一定距離超で無音）を入れる。

[S2実害] index.html:36373 stopEngineLoop
  欠陥: エンジンループを `source.stop()` で即時停止しており、フェードアウトが無い。停止時のゲインは ENGINE_GAIN_IDLE〜BOOST（0.10〜0.30）で、波形が非ゼロのまま切れるため不連続＝プチッというクリックが出る。同ファイルの setMusicVolume:36530 は「a step on a running bed clicks」と明記しており、コードベース自身がこの現象を認識している。
  発火条件: ミッション終了（撃墜/クリア/戦域離脱）・リトライ・clearMissionObjects のたびに、gameState≠PLAYING の最初のフレームで stopEngineLoop → ブースト中に死ぬと最大ゲイン0.30から即断でクリック。毎ソーティ必ず1回以上発生。
  確信度: certain（フェード不在）/ 可聴性 likely
  最小修正案: stopEngineLoop で `gain.gain.setTargetAtTime(0, now, 0.05)` → `source.stop(now + 0.2)` に変え、参照だけ即座にnullにする。

[S3軽微] index.html:36415 updateLockDroneAudio（36421-36431 teardown）
  欠陥: 同じくロックドローンの停止が即時 `osc.stop()` のみで、`lockGain` は `LOCK_DRONE_GAIN*(0.35+progress*0.65)` の非ゼロ値のまま切れる。立ち上がりは setTargetAtTime でランプするのに、落ちだけ段差。
  発火条件: ロック対象が死ぬ/射界から外れて LOCK_GRACE_TIME 経過/武装をUGBに切替（updateLock:39021 で resetLock）/ターゲット切替 → lock.targetId が null になった最初のフレームで発音中のサウ波が断ち切られ、そのたびクリック。乱戦では数秒おきに発生。
  確信度: certain（フェード不在）
  最小修正案: teardown 側も `lockGain.gain.setTargetAtTime(0, now, 0.04)` してから `osc.stop(now + 0.15)`、参照は即null。

[S3軽微] index.html:36692 desiredMusicSlot
  欠陥: 分岐に `STATE_CAMPAIGN_SELECT` のケースが無く、末尾の `return null` に落ちる。MISSION_SELECT/READY だけが "menu" を返すため、キャンペーン選択画面だけ無音になる。
  発火条件: 起動直後は setState(STATE_CAMPAIGN_SELECT)（35311）＝最初に見る画面が無音。さらに MISSION_SELECT で ESC（35446）→ campaignSelect に戻ると desired=null で menu ベッドが MUSIC_CROSSFADE_TIME かけて完全にフェードアウトし、Enterで戻るとまたフェードイン。同じメニュー階層内の往復で音楽が切れる。
  確信度: certain
  最小修正案: 36695 の条件に `gameState === STATE_CAMPAIGN_SELECT` を足して "menu" を返す。

[S3軽微] index.html:43928 detonateGroundChain →44179 damageEnemy
  欠陥: 誘爆チェーンが同一フレーム内で victims 全員に damageEnemy を呼び、各々が同じ explosion バッファを volume 0.75 で同時刻に start する。完全に位相の揃った同一波形のN重ねなので振幅はそのままN倍（√N倍ではない）。
  発火条件: 燃料庫の列（chain.radius 内に6〜8基）を1発で誘爆 → 0.75×8 = 6.0 が master 0.2 を通って 1.2 → destination で確実にクリップ。しかも damageEnemy 内から detonateGroundChain が再帰するので二次・三次誘爆が同フレームに乗る。
  確信度: likely
  最小修正案: playSfx に「同一フレーム・同一サンプルは1回だけ」の重複除去（直近の context.currentTime と name を記憶して同時刻なら音量だけ加算・上限クリップ）を入れる。

[S3軽微] index.html:45389 updateBattleArea
  欠陥: 戦域警告ビープの `battleArea.toneTimer` がシム時間 `dt` で減算されている。animate:35827 は `updateBattleArea(dt)`（timeScale 適用済み）で呼んでおり、「camera/audio/radio/visualStatus は rawDt駆動が契約」に反する。
  発火条件: 戦域外でカウントダウン中にエース/空母を撃墜してキルカムが入る（timeScale≈0.25）→ 0.5秒間隔のはずのビープが約2秒間隔に間延びし、危機感を伝える手掛かりが鈍る。
  確信度: certain（dt vs rawDt）
  最小修正案: toneTimer 用に rawDt を渡す（updateBattleArea に第2引数で rawDt を追加し、toneTimer だけそちらで減算）。

範囲外: index.html:50597 requestLaunch の条件 `gameState !== STATE_READY || ownsAircraft(...)` は「READY以外なら無条件に startMission()」を意味し、READY以外から到達した場合に未所有機での出撃を許す（現状はUI側で到達不能だが、ガードとして反転している）。


===== input-edge =====
[S1致命] index.html:37599 updatePlayer / isControlKey(35876) / keydown(35354)
  欠陥: エアブレーキがCtrlに割り当てられているが、Ctrl+W と Ctrl+Tab はブラウザ予約ショートカットで `preventDefault()` では取り消せない。
  発火条件: 空戦中に「減速しながら機首上げ」= ControlLeft+KeyW → タブが閉じてゲームごと消失。「減速しながらTabでターゲット切替」= Ctrl+Tab → 別タブへ切り替わり、その間 keyup が失われる（blurで救済されるがセッションは中断）。Ctrl+S/Ctrl+D等はpreventDefaultが効くのでCtrl+W/Ctrl+Tabだけが抜ける。
  確信度: certain
  最小修正案: ブレーキ／ブーストを修飾キー以外の別名（例 KeyZ / KeyShift単独＋KeyZ）にも割り当て、凡例(2536行)に併記する。Ctrl単独運用をやめるのが根治。

[S2実害] index.html:35504 clearTransientInputs / 37102 startMission / 36106 updateGamepadInput
  欠陥: リセット系が `gamepadInput.targetLong/targetFocus` は消すのに押下ラッチ `previousTarget` を消さないため、長押しが「離した瞬間に短押し扱い」へ化ける。キーボード側は `cameraKeyHold.pressed` を消して離しを無効化しており、扱いが非対称。
  発火条件: ①ゲームオーバー画面でY(button3)を長押ししたまま○で再出撃 → startMissionが targetLong=false にする → 出撃直後にYを離すと `!targetPressed && previousTarget` が成立し、押していないターゲット切替 `cycleTarget()` が走る。②飛行中Y長押しのままAlt+Tab（blur）→ 非フォーカス中に離す → 復帰時の初回ポーリングで同じく cycleTarget()。
  確信度: certain
  最小修正案: `clearTransientInputs()` と startMission のリセット群に `gamepadInput.previousTarget = false;`（および targetPressedAt=0）を追加する。

[S2実害] index.html:35917 clearGamepadInput / 36024-36037 updateGamepadInput
  欠陥: パッドが一瞬でも `navigator.getGamepads()` から消えると `clearGamepadInput()` が `previous*` エッジフラグを全部falseに戻すため、押しっぱなしのボタンが次のポーリングで「新規押下」として再検出される。
  発火条件: 無線パッドの瞬断／`gamepaddisconnected`→再接続／ページ非フォーカス中に列挙が空になるブラウザ挙動。メニュー中に○(button1)やStart(9)を握ったまま復帰すると `startPressed && !previousStart` が成立して confirmCampaign/confirmMission/advanceBriefing/flyAgain が勝手に発火、□(2)なら画面が1段戻り、Share(8)ならNORMAL/EXPERTが勝手に切り替わる。
  確信度: needs-runtime-check
  最小修正案: 切断時は `previous*` を false に戻さず「現在の物理状態」で再初期化する（再接続後の最初のポーリングを edge 検出から除外する `resyncPending` フラグを1枚挟む）。

[S2実害] index.html:35482 keydown（35390-35437のメニュー分岐）
  欠陥: メニュー用のW/A/S/D・矢印分岐は全て `!event.repeat` ガード付きで `return` するが、オートリピートのkeydown（repeat=true）は全分岐をすり抜けて末尾の `keys.add(event.code)` に落ちる。メニューキーが飛行入力セットに漏れる。
  発火条件: 機体選択(READY)やミッション選択でKeyD/KeyWを押し続ける（カーソルはリピートしないので押し続けが起きやすい）→ `keys` に "KeyD" が溜まる → そのままEnterで出撃。`startMission()` の `keys.clear()`(36987) は約30msで来る次のリピートに即上書きされるため、ミッション開始2フレーム目から機体が勝手にロール／ピッチする。
  確信度: certain
  最小修正案: メニュー分岐の条件から `!event.repeat` を外す代わりに各分岐末尾で必ず `return` させる（＝コードにマッチしたら repeat でも keys.add に到達させない）。

[S3軽微] index.html:36987 startMission / 44538 completeMission
  欠陥: `keys.clear()` は「操作を切る」意図だが、WASD/Space はOSのオートリピートで約30ms後に自動復帰する一方、ShiftLeft/ShiftRight/ControlLeft/ControlRight はリピートしないため恒久的に落ちる。同じ1行が入力種別によって真逆の結果になる。
  発火条件: ブースト(Shift)を握ったままミッション達成 → gameStateは勝利バンドの2.8秒間PLAYINGのままなので `updatePlayer` は動き続け、方向キーと機銃だけ生き返りブーストだけ死ぬ。Shiftを離して押し直すまで復帰不能。出撃時にCtrl（減速）を握っていた場合も同様にブレーキが効かない。
  確信度: certain
  最小修正案: 出撃/決着時は `keys.clear()` ではなく「飛行入力を無視するフラグ」で一律に止めるか、逆に clear をやめて明示的に対象キーだけ delete する。

[S3軽微] index.html:35583 renderModelPreview（コメント）/ 35353 keydown / 33013 gameState初期値
  欠陥: 「setState never runs in this mode」というコントラクト宣言が実態と食い違う。keydownリスナは `if (!MODEL_PREVIEW_ID)` ブロックの外(35353)で登録され、`gameState` の初期値は STATE_READY のままなので、キー入力からゲーム状態遷移に入れる。
  発火条件: `?modelPreview=...` を開いた状態でEnterを押す → `requestLaunch()` → `startMission()` が走り、buildInstrumentNodes/buildMissionList/updateHud が一度も実行されていない＝ノードプール未構築・`animate()` 未起動のページでミッション生成が始まる。矢印キーでも `cycleAircraft()` が走りライブシーン側の playerModel が作り直される。
  確信度: likely
  最小修正案: keydown/keyupリスナの先頭で `if (MODEL_PREVIEW_ID) return;` する（またはリスナ登録自体を `!MODEL_PREVIEW_ID` ブロック内へ移す）。

[S3軽微] index.html:2497 briefingDifficultyRow / 35428-35437 keydown / 36055-36057 updateGamepadInput
  欠陥: 難易度選択がキーボード専用。`◀ NORMAL ▶` の矢印はクリックハンドラを持たず（addEventListenerが一つも無い）、ブリーフィングのゲームパッド分岐は意図的に不活性のため、パッドのみ／マウスのみの操作系では難易度を一度も変更できない＝ACEティアに到達不能。
  発火条件: パッドだけでプレイ、またはマウスで矢印をクリック → 何も起きない。矢印グリフは押せる見た目なので「押しているのに入らない」に見える。
  確信度: certain
  最小修正案: `#briefingDifficultyRow` の2つの `.difficultyArrow` に click→`cycleDifficulty(∓1)` を付け、ブリーフィング分岐でD-padの左右だけ `cycleDifficulty` に通す（上下は従来どおり不活性のまま）。

[S3軽微] index.html:35377 keydown KeyC / 36212 updateHoldInputs
  欠陥: Cキーの長押しラッチは gameState を問わず立ち、`updateHoldInputs()` も状態に関係なく `focus=true` へ昇格させるため、ターゲットビューが存在しないメニュー画面で「長押し＝無反応／短押し＝カメラ切替」という二重挙動になる。
  発火条件: ハンガーや戦績画面でCを0.35秒以上押して離す → keyupの `heldLong` が真になり `cycleCamera()` が呼ばれない。素早く叩いた時だけ cameraMode が変わる（HUDは非表示なのでフィードバックも無く、次の出撃のカメラ初期値だけが静かに変わる）。
  確信度: certain
  最小修正案: keydownのKeyC分岐と `updateHoldInputs()` を `gameState === STATE_PLAYING` でガードする。


===== text-content =====
[S2実害] index.html:37482 setState (STATE_GAMEOVER 分岐)
  欠陥: 失敗デブリーフの本文が「機体損傷が限界に到達。再出撃せよ。」で固定だが、失敗経路は3つあり2つは被弾と無関係。
  発火条件: m-escort でLIFELINE 3機全喪失、m-carrier でINDEPENDENCE撃沈、または戦域外滞在で BATTLE_FAIL_TIME 経過 → 自機HP満タンのまま「機体損傷が限界に到達」と表示（同時に debrief intel も "撃墜1。敵機は墜ちた"）。completeMission(false) の呼び元は 41535/44275/45399 の3箇所。
  確信度: certain
  最小修正案: 失敗理由（damage / guard / out-of-area）を completeMission に渡し、resultMessage と intel 1行目を理由別に出し分ける。

[S2実害] index.html:8334, 8339 MISSIONS "m-glacier" briefing / introRadio
  欠陥: 「谷底を低空で駆け抜ければSAMの射線は切れる」「谷底を這えば射線が切れるぞ」と地形遮蔽を明言しているが、ゲームに視線遮蔽判定は一切存在しない。
  発火条件: GLACIER RUN で谷底を這って進入 → 壁上の samSite(x±300) は attemptEnemyMissile(38539〜) の距離+正面dot判定だけで発射する。lineOfSight / 遮蔽チェックはコード全体に無し（grep 0件）。低空を這うほど水平距離が縮み、むしろ被弾しやすい。
  確信度: certain
  最小修正案: 文面を「谷底なら被発見が遅れる／稜線を盾にしろ」等、実装のある効果に書き換える（または SAM に仰角/最低高度制限を入れる）。

[S2実害] index.html:44114 damageEnemy（艦艇撃沈コール）
  欠陥: 空母・ミサイル艇以外の全艦種が「イージス艦、沈黙！ 対空砲火が薄くなったぞ！」になる。艦種の取り違え。
  発火条件: BEACHHEAD で指定目標の揚陸艦(landingShip)を沈める → 5隻すべてで「イージス艦、沈黙」。m03/m-landing のフリゲート、payload製の lhd/cruiser/ssgn 等も同文（ホスト側APIの穴）。
  確信度: certain
  最小修正案: `enemy.spec.label`（LST / FRIGATE / AEGIS…）を差し込むか、SHIP_TYPES 側に撃沈コール文を1フィールド持たせる。

[S2実害] index.html:44319, 44320, 44337 updateStrikeThreat
  欠陥: 防衛対象が都市の CITY LIGHTS でも文言が「基地」固定。HUDマーカーは friendlyBase.label の "SAINT VERDA" を出しているのに、バナーは "BASE DAMAGED"、無線は「基地被弾！」、接近警告は "WARNING · BOMBERS NEARING AIRBASE"。
  発火条件: m-city で Tu-95 が failRadius 620 に到達 → 市街地爆撃なのに「基地被弾」。ブリーフィングは「街の灯が一区画ずつ消えていく」と説明済みで矛盾。
  確信度: certain
  最小修正案: friendlyBase.label / style を文面に流し込む（style==="city" なら「市街被弾」「CITY STRUCK」等）。

[S2実害] index.html:9688 MISSIONS "m05" briefing
  欠陥: 「最後にSu-57が上がってくる。データ上、旋回でこちらのF-22を上回る唯一の機体だ」が二重に事実と違う。
  発火条件: FINAL SORTIE のブリーフィング表示時。su57.turnRateDeg = 39 は f22 の 39 と同値で「上回る」は偽（4183付近のコメントは古い 40 を前提のまま）。かつ su47=47、su37=41 も F-22 を上回るので「唯一」でもない（直後の文自身が「僚機のSu-47はさらに曲がる」と否定している）。
  確信度: certain
  最小修正案: 「F-22と同等の旋回」に書き換えるか、su57.turnRateDeg を 40 に戻して「唯一」を削る。

[S3軽微] index.html:3969 / 3875 AIRCRAFT_TYPES f22 / su37 blurb
  欠陥: F-22 の「旋回・火力は全機中最高」が MOBILITY バーと食い違う。Su-37 の「最強のステルス機にすら肉薄する」も実際は上回っている。
  発火条件: ハンガー画面。specBars は AIRCRAFT_ORDER 全22機で正規化される（50506付近に明記）ので F-22 の MOBILITY は約84（su47=100、su37≈86）。ブラーブのすぐ上のバーが満タンでないまま「全機中最高」と読ませる。turn は f22 39 < su37 41 < su47 47。
  確信度: certain
  最小修正案: F-22 は「戦闘機中で最高」に限定（装甲の文言を直したのと同じ処置）、Su-37 は「肉薄する」→「上回る」。

[S3軽微] index.html:44207 damageEnemy → onKillRadio / src/ui/radio.js:36,73
  欠陥: 恐怖段階の敵無線が「撃墜された航空機」を前提にしているが、地上・艦艇の指定目標撃破でも同じカウンタで発火する。
  発火条件: NIGHT RAID / SANDSTORM は指定目標が地上設備のみ（航空機の指定目標ゼロ）。SAMサイトを1基潰した瞬間に敵が「2番機が撃墜された。隊形を維持しろ——敵は1機だけだ」、4基目で「メーデー！ メーデー！ 2番機、墜ちる！」。僚機も「撃墜確認！」「また1機減らしたな！」を燃料タンクに対して言う。
  確信度: certain
  最小修正案: onKillRadio に撃破対象の種別を渡し、ground/surface キルでは段階台詞をスキップするか地上向けプールを使う。

[S3軽微] index.html:37427 buildDebriefIntelLines
  欠陥: 「たった1機に${kills}機やられた」が、航空機の助数詞「機」で地上構造物・艦艇を数える。
  発火条件: SANDSTORM 成功時 kills=12（SAM4/レーダー2/対空砲3/掩体壕2/燃料庫1）→「たった1機に12機やられた」。IRON COLUMN は戦車とSAMサイト、BEACHHEAD は揚陸艦5隻で同様。
  確信度: certain
  最小修正案: 指定目標の主種別（air/ground/naval）で助数詞を切り替える（機／基・両／隻）。

[S3軽微] index.html:37430 buildDebriefIntelLines
  欠陥: 「ミサイルを1発も無駄にしなかった」の条件が命中率ではなく `gunKills >= missileKills` の否定でしかない。
  発火条件: ミサイルを外し続けても、機銃キルよりミサイルキルが1つ多いだけでこの行が出る（例: 24発撃って6機撃墜、機銃0）。デブリーフには命中率の表示が無いため、プレイヤーには誤情報だけが残る。
  確信度: certain
  最小修正案: `missileHits / missilesFired` を条件に加えるか、文面を「仕留めたのはほとんどミサイルだ」に変える。

[S3軽微] index.html:38645 attemptEnemyMissile
  欠陥: 地上発射のSAM警告が「基地から上がってきたぞ」固定で、基地の無いミッションでも基地と言う。
  発火条件: GLACIER RUN の氷河谷の壁上SAM（基地は無い）、IRON COLUMN の西稜線 samSite（海岸平野の車列護衛）で発射されるたびに「地対空ミサイル！ 基地から上がってきたぞ」。
  確信度: certain
  最小修正案: 「地対空ミサイル！ 地上から来たぞ——回避しろ！」等、発射源を限定しない文へ。

範囲外: index.html:3609-3618 のコメントが gripen を「125 HP / F-16 の 100 が DEFENSE 下限」と主張しているが実値は gripen 115・f2a 95 で、DEFENSE バーの正規化下限は既に f2a に移っている（コメントとデータの乖離、プレイヤー可視文言ではない）。


===== physics-integration =====
[S2致命寄り] index.html:43384 updateShip（同型: index.html:42063 updateFriendlyCarrier）
  欠陥: 「内海へ戻す」舵の方位が X 軸で鏡像になっている（`Math.atan2(-x, z)`。-Z 鼻先の正しい形は `atan2(x, z)`）。placeOnRoute:42282 の★注記が「これは禁止形」と名指ししている式そのもの。
  発火条件: 艦が原点から 1900m（空母は 3200m）を超えて、位置が X 優勢のとき。例: (2000, 0) → desiredHeading=-π/2 → forward=(+1,0) で外へ全速。z 優勢だと正しく見えるので南北航路の艦では露見しない。以後この舵は永久に外向きを指し続け、艦隊が戦域外へ逃げる。
  確信度: certain（forwardOf=(-sinθ,-cosθ) と updateFriendlyShip:41734 / updateHeli:43559 の正しい形で相互検証済み）
  最小修正案: `Math.atan2(enemy.group.position.x, enemy.group.position.z)`（空母も同様）に直す。

[S2実害] index.html:43391 updateShip
  欠陥: 山を避ける舵が `Math.atan2(dx, -dz)` ＝ placeOnRoute が「atan2(-dx,-dz) であって atan2(dx,-dz) ではない」と明記した禁止形そのもの。X 方向に外れている艦は山へ向けて舵を切る。
  発火条件: 艦が mountain.r*2.0+160 の輪に入り、かつ山との相対が X 優勢のとき。「so the fleet never beaches」というコメントと逆に、乗り上げる方向へ転舵する（Z 優勢のときだけ偶然正しい）。
  確信度: certain
  最小修正案: `Math.atan2(-dx, -dz)`。

[S2実害] index.html:37769 updatePlayer（軍艦クラッシュ箱）
  欠陥: 「Warships are solid too」と宣言している当たり判定が、フレーム終端 1 点の内外判定だけで掃引が無い。自機の移動は `position.addScaledVector(tmpV1, playerSpeed*dt)` の 1 ステップ。
  発火条件: F-22/Su-57 級（boostSpeed 833）でミサイル艇（crash.halfBeam 5 ＝幅 10m）やフリゲート（halfBeam 11）の舷側を横切る。60fps でも 1 フレーム 13.9m、dt 上限 0.05 では 41.6m 進むので箱を跨いで通過し、無傷ですり抜ける。
  確信度: certain
  最小修正案: 前フレーム位置→現在位置の線分を艦のローカル座標で掃引（along/side を両端で評価し符号反転も衝突とみなす）。

[S2実害] index.html:43074 updateEnemies（hardFloor）
  欠陥: `floorHeight = terrainFloorAt(...)` を移動**前**の位置で取り（43039）、クランプは移動**後**の位置に適用する。地形高さのサンプルが 1 フレームぶん古い。
  発火条件: 敵機の maxSpeed は airframe の boostSpeed（=最大 833、index.html:5917）。山の斜面へ向かって 833m/s で飛ぶと 1 フレームで最大 41m 水平移動し、実際の錐面はその間に数十 m 上がるので、機体は真の床より深く潜ってから次フレームで同じだけ跳ね上がる。「the clamp only ever nudges by metres」というコメント（43130-43133）が破れ、修正済みのはずの "warp" が高速時に再現する。
  確信度: likely（順序は certain、振幅は山の r/h 依存）
  最小修正案: 移動後にもう一度 `terrainFloorAt` を取ってからクランプする（または移動前後の max を使う）。

[S2実害] index.html:38801 updateEnemyMissiles（護衛対象への信管）
  欠陥: プレイヤー狙いの分岐は 38850 で明示的に掃引信管（`sweptMissDistance`）に直されているのに、`targetFriendly` 分岐だけ移動前の点距離 `guardedDistance < hitRadius` のまま。
  発火条件: 航空機チャージ（LIFELINE 輸送機）に対する hitRadius は 22。AAM プロファイルの maxSpeed は 445〜540。dt 上限 0.05 では 22.3〜27m 進むので半径 22 を跨ぎ、命中すべき弾が輸送機を貫通して lifeLimit まで飛ぶ。低 fps ほど護衛ミッションが簡単になる。
  確信度: certain
  最小修正案: プレイヤー側と同じく `Math.min(distance, sweptMissDistance(pos, forward, speed*dt, guarded.group.position))` で判定する。

[S3軽微] src/combat/missile-guidance.js:236 step()
  欠陥: シーカーロスト判定 `los.angleTo(toTarget)/slice > seekerRate` の分母がサブステップ時間 `dt/8` なのに、分子には「敵が 1 フレームぶん動いた分」が丸ごと入る（敵は updateEnemies で毎フレーム 1 回しか動かず、updateMissiles はその後）。ターミナル各フレームの先頭サブステップだけ見かけの LOS レートが約 8 倍に膨らむ。
  発火条件: 空中目標に対し 150m（MISSILE_TERMINAL_RANGE）以内に入った瞬間から。例: 距離 100m・横速度 200m/s・60fps で見かけ 916°/s、実 190°/s の MISSILE_TURN_RATE を必ず超えるため、先頭サブステップでは `lostTime` のリセット節（242-244）が構造的に一度も実行できなくなる。
  確信度: likely（算術の不整合は certain、実際の失探率は要実測）
  最小修正案: LOS レートは「そのサブステップで実際に経過した時間」ではなくフレーム境界を跨がない量で測る（前サブステップの los のみと比較する、またはフレーム先頭は判定をスキップする）。

[S3軽微] index.html:42672 updateEnemies（死んだ船体の砲塔）
  欠陥: subsystem の位置追従 `positionSubsystem`（42706）は生存分岐にしかなく、`!enemy.alive` 分岐は 42688 で `continue` する。42704 のコメント「Mounts follow the hull the instant it has moved, **alive or wrecked**」がコードと食い違う。
  発火条件: 船体を撃沈した瞬間から。船体は updateShipSinking で前進しつつ沈む（sinkDepth まで 11 秒）が、砲塔/VLS は spawnShipSubsystems:39991 で scene 直付けなので死亡時の座標に固定される。SUBSYSTEM_WRECK_TIME=4.5 秒のあいだ、残骸の煙と HUD/ロック用ヒットボックスが甲板から離れて空中に取り残される。
  確信度: certain
  最小修正案: 死亡分岐の `updateShipSinking` 直後に `for (...) positionSubsystem(enemy.subsystems[s])` を回す。

[S3軽微] index.html:37691 updatePlayer（playerBank のクランプ順）
  欠陥: `playerBank` は毎フレーム無条件に ±MAX_BANK_ANGLE*1.12（既定 76°）へクランプされるが、adoptNormalFlightFrame:36147 は `atan2` の結果をそのまま代入するので最大 ±π を書き込める。クランプは代入者を知らない。
  発火条件: EXPERT で背面（バンク約 180°）のまま NORMAL へ切り替える（setControlMode:36160）。次の updatePlayer で機体ロールが 1 フレームで 180°→76° に瞬間移動し、同時に `Math.sin(playerBank)` を使う協調旋回（37693）の符号・大きさが飛ぶ。
  確信度: certain
  最小修正案: adoptNormalFlightFrame 側でバンクを同じ範囲にクランプするか、|bank| がリミット超のときは EXPERT→NORMAL 遷移を機首方位ごと水平化してから入る。

[S3軽微] index.html:38919 updateEnemyMissiles（地形判定の欠落）
  欠陥: 敵ミサイルの終了条件は life / `y < 0` / 距離だけで、地形との判定が一切ない。自機側は 37954-37964 で掃引つき `surfaceHeightAt` 判定を持ち、「without it the round passes through the hill」と理由まで書かれている。
  発火条件: 島・山を挟んだ位置から艦や地上 SAM が発射する、または自機が尾根の陰に降りる。弾は山体を貫通して追尾を続け、岩の内側から信管が作動して被弾する（遮蔽が機能しない）。
  確信度: certain
  最小修正案: 自機弾と同じ `surfaceHeightAt` の始点/中点掃引を 38919 の終了条件へ追加する。

[S3軽微] index.html:38368 updateBombs（対空直撃判定）
  欠陥: 爆弾の航空機ヒットが `enemy.group.position.distanceTo(tmpV1) <= directRadius` のフレーム終端 1 点サンプル。軌道は解析式なので中間時刻を取れるのに使っていない（地表判定 38391 はちゃんと二分探索している）。
  発火条件: directRadius は 14。投下速度は `playerSpeed`（bombReleaseState:38258）なので、ブースト中に投下すると 1 フレーム 21〜29m 進み、敵機の 14m 球を跨いで通過する。
  確信度: certain
  最小修正案: previousT→life 区間を数点サンプルするか、`ballisticPoint` の線分と敵位置の最近接距離で判定する。

範囲外: index.html:45357 updateBattleArea のハードリミットは updatePlayer の地形/艦衝突判定より後に x/z を書き換えるため、押し戻し先が山や艦の内部でも当該フレームは無傷で通り、翌フレームに「飛び込んでいない衝突」で墜落しうる。


===== render-order =====
[S2] index.html:51783-51790 createWorld（stars）
  欠陥: 星は `transparent:true` + `depthTest:false` なので透明パス（不透明パスの後）で深度テストなしに描かれ、コメントの「still behind anything opaque (ocean, terrain, the moon)」と正反対に全ての不透明物の上に乗る。`renderOrder=-99` は透明キュー内の並びしか決めない。
  発火条件: 夜マップ(nightStrike/nightCoast)。月ディスク(不透明・カメラ相対 y+900)、自機より高い位置の敵機、カメラ高度より高い山稜 — いずれも星が透過して手前に点る。星は up=0.04〜1.0 の上半球のみなので「地平線より上にある不透明物」が全部該当する。
  確信度: certain（機構）/ 見た目の顕著さは needs-runtime-check
  最小修正案: `depthTest: false` を外す。スカイスフィアは `depthWrite:false` なので星を遮る物は無く、絵は変わらずに不透明物との前後だけ正しくなる。

[S2] index.html:52497 / 52505 createWorld（decor.shore の波打ち際リング）
  欠陥: `renderOrder = 1 / 2` は「ocean < shallow < sand」を固定する目的で付けられているが、シーンの他の透明物（雲・爆発・トレーサー・排気炎・sunRoad・グレア）は全て renderOrder 0 なので、リングが**それら全部より後**に描かれる。リングは深度を書かない物の手前判定ができないため、実際は奥にあっても上塗りする。
  発火条件: 低空の雲(y300〜680)が島の汀線とカメラの間に入る構図 → 雲の上に砂/浅瀬の帯が透ける。dayIsles では sand の実効不透明度が 0.9×0.72=0.648 でかなり濃い。島への対地攻撃の火球も同様にリングに上塗りされる。
  確信度: certain
  最小修正案: 相対順だけ要るので海面付近専用の低い帯に移す（例: shallow=-2, sand=-1）。0未満なら他の透明エフェクトより先に描かれ、海面との順序も保たれる。

[S2] index.html:47677 updatePlayerDamageSmoke
  欠陥: 「自機が死んで非表示なら煙を出さない」意図の判定に `!playerModel.group.visible` を使っているが、このフラグはコックピット視点でも false になる（cycleCamera / startMission / rebuildPlayerModel が `cameraMode !== "cockpit"` を代入している）。描画可視フラグを生存フラグの代用にしている。
  発火条件: コックピット視点で HP < 55%。損傷煙が一切出ない。プレイ中に C でチェイスへ切り替えた瞬間に煙が湧き、戻すと消える（旋回中は自分の煙が視界を横切るので観測できる）。
  確信度: certain
  最小修正案: 条件を `health <= 0` もしくは gameState 判定に置き換える（可視フラグは見ない）。

[S3] index.html:51814-51818 createWorld / addCelestial（太陽・月のグレア）
  欠陥: グレアのスプライトが `depthTest:false` + 加算。スカイスフィアは `depthWrite:false` なのでグレアを遮る物は元々無く、depthTest を切る必要が無いのに切っているため、halo が手前の不透明物（山・島・敵機）の上に加算される。
  発火条件: dayIsles の内側レイヤは scale 430・opacity 0.95・ほぼ白で、距離約3100 → 画面上 約8°。太陽方向にいる敵機や500m先の山の稜線がその範囲で白く塗り潰される。fog:false なので霞んでもいない。
  確信度: certain（機構）/ 許容範囲かは needs-runtime-check
  最小修正案: 2箇所の `depthTest: false` を削除（`depthWrite:false` はそのまま）。

[S3] index.html:52049-52061 createWorld（sunRoad）
  欠陥: sunRoad は海面から 0.4m 上の巨大平面（幅380〜820 × 長さ3000〜3800、カメラ追従・frustumCulled=false）だが、shore リングに入れた classic-depth 用の polygonOffset 緩和が入っていない。海面Zファイト対策が2つの海面直上デカールのうち片方にしか適用されていない。
  発火条件: EXT_clip_control が無く `capabilities.reversedDepthBuffer` が false になる環境（= shore リング側が polygonOffset にフォールバックする条件そのもの）。sunRoad の遠端は 1500〜1900m 先にあり、shore リングの 0.25/0.5m より条件が悪い 0.4m 差 → 光の道が遠方で斑にドロップアウトして明滅する。
  確信度: likely（reversed-Z 有効な環境では出ない）
  最小修正案: shore と同じ `polygonOffset: classicDepth, polygonOffsetFactor/Units: -1` を sunRoad のマテリアルにも付ける。

[S3] index.html:47508 createParticlePool
  欠陥: `renderOrder = additive ? 8 : 4` により、非加算プール（smoke/debris/contrail）が renderOrder 0 の爆発・雲より**常に後**に描かれ、深度に関係なく上塗りする。加えて3つの非加算プールは全て renderOrder 4 かつ Points オブジェクトの原点が (0,0,0) で同一なので、相互の順序はソート上未定義。
  発火条件: 爆発の火球の手前を煙が横切らなくても、火球より奥の煙が火球の上に合成される（撃墜時に必ず発生）。雲の手前にある雲と煙の関係も同様に逆転する。
  確信度: certain
  最小修正案: 非加算プールを 1〜2 に下げて雲/爆発より先に描く、または爆発エフェクト側に同じ帯の renderOrder を明示して意図した梯子にする。

[S3] index.html:48090 createSharedMaterials（hitbox）
  欠陥: 当たり判定メッシュのマテリアルが `transparent:true, opacity:0, depthWrite:false, colorWrite:false` — 色も深度も一切書かない完全な no-op なのに `visible` は true のまま。透明キューに入って毎フレーム敵数ぶんソート＋ドローコールを消費する。`userData.enemyId` はファイル中どこからも読まれず、Raycaster による判定にも使われていない（銃は解析的判定）。
  発火条件: 敵が多い波（forceSpawnAirWave は最大16機、艦の subsystem も各自 hitbox を持つ）で無意味な透明ドローが積み上がる。撃墜時に `hitbox.visible = false` を実行しているコード自体が「可視である必要がない」ことを示している。
  確信度: certain
  最小修正案: 生成直後に `hitbox.visible = false`（レイキャストは three の Raycaster が visible を見ないので影響なし）。あるいは Mesh を作らずスペックの数値だけ持つ。

[S3] index.html:44798-44805 buildHangarScene（door veil）
  欠陥: 開口部のブルーム用 additive パネルが 46×15.4 で、実際のドア開口（x[-21,21], y[0,15]）より左右に各2m・上に0.3m はみ出している。z=-HD+0.5 と壁面より手前にあり depthTest では弾かれないため、ブルームがドア枠の内壁にそのまま加算される。
  発火条件: STATE_READY のハンガー画面。開口の縁に沿って幅2mの明るい矩形の縁取りが壁パネル上に出る（開口の形と一致しない）。
  確信度: certain（機構）/ 目視での目立ち具合は needs-runtime-check
  最小修正案: veil のサイズを開口内に収める（42×15 以下、中心 y=7.5）。

注: 対象リポジトリは別セッションが編集中で、上記行番号は取得時点のもの（数十行の前後ずれあり）。関数名で特定可能。


===== mission-flow =====
[S1致命] index.html:44439-44472 updateMission
  欠陥: 「生存TGTゼロ・未消化TGT波ゼロ・kills < totalTargets」の三点が同時に成立すると、waveClearTimer が毎フレーム負→再アームされ、ミッションは完了も失敗もしないまま "ALL TARGETS DESTROYED" を 1.35 秒ごとに永久再表示する。
  発火条件: 指定目標が1体でも「盤面に出ないまま」または「kills に計上されないまま」消えた瞬間（下記 S1/S2 の各トリガ）→ 空の空域でバナーが無限ループ。STATE_PLAYING では Escape が無効(35426 付近)なので、脱出手段は戦域離脱による自滅だけ。
  確信度: certain（44452 `waveClearTimer -= dt` の後どちらの分岐も実行されず、44439 の `< 0` が翌フレーム必ず真）
  最小修正案: 44439 のガードを `if (waveClearTimer < 0 && !waveClearAnnounced)` 相当の一度きりフラグに変え、`tgtRemaining===false && kills < totalTargets` を検出したら completeMission(true) にフォールバック（またはコンソール警告＋強制完了）する。

[S1致命] index.html:42419 deployWave / 4470 normalizeWaveEntry
  欠陥: `concurrent` かつ `delay` 付きのエントリは次の非concurrent波の deployWave で `pendingWaves.length = 0` により無条件破棄されるのに、totalTargets(9717) は delay の有無に関係なく全 TGT エントリを数えている。
  発火条件: ミッションが `{ concurrent:true, delay:N }` を tgt 省略（=TGT）で書き、プレイヤーが principal 波を N 秒以内に片付ける → その目標は一生湧かないまま totalTargets に残り、最終波クリア後に上記 S1 の永久ループへ。4470 のコメント「A delayed entry that never comes due is simply never spawned, which is the design」が totalTargets の数え方と正面から矛盾。
  確信度: certain（コード上確定。現行40本は遅延エントリを全て tgt:false にしているため未発火だが、ホストAPIとしては素通し）
  最小修正案: normalizeMission の totalTargets 集計から `concurrent && delay>0` の TGT エントリを除くか、逆に pendingWaves の破棄時に TGT エントリだけ即時 deploy する。

[S2実害] index.html:42147 spawnGroundUnit / 9717 normalizeMission
  欠陥: 未登録の GROUND_TYPES キーを持つ groundUnit は `if (!spec) return null` で黙って生成されないが、totalTargets には `groundUnits.filter(isTgtEntry).length` として既に加算済み。
  発火条件: ペイロードが addGroundType より前に addMission する／型キーをタイプミスする → 盤面に存在しない指定目標が1体残り、そのミッションは永久にクリア不能（S1のループへ）。エラーもログも出ない。
  確信度: certain
  最小修正案: spawnGroundUnit が null を返したら totalTargets 相当を減らす（実効目標数を実spawn数から導出する）か、normalizeMission で GROUND_TYPES 未登録キーを throw する。

[S2実害] index.html:39902 spawnShip
  欠陥: spawnShip は `SHIP_TYPES[typeKey]` を検証せずに `spec.hitBox` を読むため、fleet に未登録キーがあると例外を投げる。spawnHeli(39526)/spawnGroundUnit(42147)/spawnEnemy(ENEMY_TYPES.f16 フォールバック) だけがガードされていて、艦だけ穴。
  発火条件: naval 波の fleet に typo または未登録の艦種 → updateMission→spawnMissionWave→spawnNavalWave→spawnShip で throw。animate() は先頭で rAF を再登録済みなので、以降フレームごとに同じ例外→描画が回らず実質フリーズ（S1のループが毎フレーム再spawnを試みるため復帰しない）。
  確信度: certain
  最小修正案: spawnShip 冒頭に `const spec = SHIP_TYPES[typeKey]; if (!spec) return null;` を足し、あわせて deployWave 側で欠落分を totalTargets から差し引く。

[S2実害] index.html:12809-12861 (enemy_variety_1 の extendMission)
  欠陥: r06/r08/r11 に追加した groundUnits 計17基に `tgt: false` が無いため、ホスト既定(isTgtEntry=true)で全部が指定目標に昇格している。
  発火条件: r06 を出撃 → ブリーフィングは「指定目標は5機」だが TGT REMAIN は9。さらに `living`(44429) は地上設置物も見るので、空中の第1波を全滅させても SAM/レーダー/指揮所を全部潰すまで WAVE CLEAR もチェックポイントも次波も来ない（r08 は6基、r11 は7基で同じ）。地上目標を意図する m-glacier / m-nightbase は同じ既定を意図的に使っているので、既定値がそのまま牙になる形。
  確信度: certain（コードとデータの突き合わせで確定。実機で TGT REMAIN の数値を見れば一発）
  最小修正案: 追加した17エントリに `tgt: false` を付ける。恒久対策としては addMission 側で「totalTargets が briefing 記載と乖離した場合に警告」ゲートを足す。

[S3軽微] index.html:44465 updateMission
  欠陥: 「cursor が末尾を越えたのに tgtRemaining が真」のケースで return するだけなので、waveClearTimer が負のまま次フレームに入り、`WAVE n CLEAR` バナーと CHECKPOINT の予約バナーを 2.15 秒ごとに永久再発火する（saveCheckpoint より手前で return するのでチェックポイントも進まない）。
  発火条件: 44462 のコメントが言う「trailing concurrent エントリを書いたペイロードミッション」。ただし spawnMissionWave(42401 付近) が既に連続 concurrent を全て walk 済みなので、現状この while と return は到達不能な防御コード。かつては「クラッシュ」だったものが「永久ループ」に置き換わっただけ。
  確信度: likely（到達不能である点は certain、到達した場合の挙動は certain）
  最小修正案: `return` ではなく `completeMission(true)` へ倒すか、少なくとも waveClearTimer をリセットしてバナー再発火を止める。

[S3軽微] index.html:44328 updateStrikeThreat / 43013 updateEnemies の arena clamp
  欠陥: 投弾後に strikeTarget を「投弾点から9000m外向き」へ書き換えるのに、戦域復帰クランプは `!enemy.strikeTarget` で恒久免除されている。43008 のコメント「Authored strike and hunt routes ... their targets are inside by construction」は、この書き換え後には成立しない。
  発火条件: 投弾点＋9000m が battleRadius の外に落ちるジオメトリのミッションで、TGT 爆撃機が戦域外へ出て戻らない。プレイヤーは radius+600(BATTLE_HARD_LIMIT_MARGIN) でハードクランプされるため物理的に追撃不能 → S1 の永久ループ。現行 m01/m-city は往路が戦域を縦断する配置なので離脱先が偶然内側へ戻るだけで、この不変条件はデータ側に依存している。
  確信度: likely（現行データでは未発火、friendlyBase を追加する新ミッションで即発火）
  最小修正案: 離脱先を `battleArea.centerX/Z` 方向へ寄せるか、bombRunFired 後は strikeTarget を null にして通常の arena clamp 配下へ戻す。

[S3軽微] index.html:9253 (m-city 第3 BEAR) / 11255 (r11 STRIKE)
  欠陥: `delay` は spawnMissionWave の連鎖ループ内でしか読まれない（=concurrent 専用）のに、この2エントリは非concurrent で `delay` を書いている。値は黙って捨てられる。
  発火条件: 常時。両方ともコメントは「on a clock rather than on the first stream's death」と主張しているが、実際は前の波の全滅でしか湧かない。m-city の「削り切る前に次が来る」という設計意図が第3波だけ機能していない。
  確信度: certain
  最小修正案: 両エントリに `concurrent: true` を付ける（意図通り）か、normalizeWaveEntry で非concurrent の delay を throw/警告する。

[S3軽微] index.html:37220 restartFromCheckpoint
  欠陥: 復元した pendingWaves は直後の `spawnMissionWave(waves[missionWaveIndex])` → deployWave(非concurrent) の `pendingWaves.length = 0`(42419) で必ず全消去されるため、bank した遅延増援は一度も使われない完全なデッドコード。
  発火条件: 常時。コメントは「復元は respawn の前でなければならない」と順序の重要性を主張しているが、実効はゼロ（初回と同じ盤面になるのは spawnMissionWave が自前で積み直すため）。checkpoint.pendingWaves の保存コスト(37160 付近の map)も無駄。
  確信度: certain
  最小修正案: 復元と保存の両方を削除するか、復元を spawnMissionWave の後に移して「その波固有の follower は重複させない」形に直す。

[S3軽微] index.html:41545 retireFriendly
  欠陥: `guardState.saved += 1` と続く safeAnnounced／CONVOY CLEAR バナー分岐が `guardState.active` を確認せずに走る。armGuardObjective(41372 付近) は `guarded.length === 0` で active を立てずに return するため、guard 未武装の状態でカウンタとバナーだけが動く。
  発火条件: guard 設定を持つデプロイで対象機が0体になった（あるいは guard 無しで exit を持つ友軍を置いた）ミッション → 存在しない護衛任務の「CONVOY CLEAR · 1/0 SAVED」が出る。
  確信度: likely
  最小修正案: retireFriendly の先頭で `if (!guardState.active) { friendly.retired = true; ...; return; }` と分岐する。

範囲外: `moveMissionCursor`(50968 付近) は `slot < 0` のとき delta を無視して常に campaign の先頭へ飛ぶ（cursor が別キャンペーンを指した直後の上下入力が片方向にしか効かない）。
