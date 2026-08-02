

===== state-matrix =====
[S2] index.html:14334 tickStoryEvents2 (payload `story_events_2`)
  欠陥: デブリーフ(missionComplete)からのリトライでは `enterMission` が再実行されず、前回出撃の `runtime.flags` / `pendingResult` / `sawPositive` が残ったまま新しい出撃が走る。
  発火条件: m02/r02/m-escort/m05/r20 をクリア → 結果画面で RETRY(Enter/○/ボタン) → 状態は missionComplete→playing と直に飛ぶ。`activeState` は両方 true、`runtime.key === key` なので enterMission をスキップ → `once("dagger-a02"...)` 等が全て既フラグで、DAGGER 最期の通信・ARCHITECT署名などの書き下ろし演出が再プレイ時に一切鳴らない(撃墜経由の再挑戦は gameover で leaveMission が走るので正常。この非対称が本件の証拠)。
  確信度: certain
  最小修正案: `state === "missionComplete"` を観測したら `runtime.sortieEnded = true` を立て、`state === "playing"` かつ `sortieEnded` なら `leaveMission()` してから enterMission に落とす(story_events_1 の `if (runtime.playing) leaveMission()` と同じ形に揃える)。

[S2] index.html:44469 completeMission / 42609 updateEnemies
  欠陥: ACCOMPLISHED保留(outcomePending)中も敵の機銃・艦AA・CIWSが撃ち続け、勝ったはずの出撃が FAILED に化けて記録も残らない。
  発火条件: 非TGTの護衛/CAP/艦が生き残るミッション(totalContacts > totalTargets)で最後のTGTを撃墜 → MISSION ACCOMPLISHED の2.8秒間、`updateEnemies` は無ゲートで走り `applyPlayerDamage`(43651 AA / 43695 CIWS / 43931 機銃)が通る → completeMission(false) へ落ち、`recordMissionResult` は呼ばれずクリア扱いが消滅。同じ2.8秒について updateBattleArea(45271)は `outcomePending` で明示的に無効化され、飛行中の敵ミサイルも completeMission が全消去している = 「バンド中は自機のクラッシュ以外で負けない」が設計意図。新規発射だけ穴。
  確信度: likely
  最小修正案: `attemptEnemyMissile`(38496)と敵ガン/AA/CIWSの攻撃判定に `|| outcomePending.active` を足して、バンド中は新規の対プレイヤー攻撃を止める。

[S2] index.html:46069 updateEnemyHudMarkers / 46146 updateGunsight
  欠陥: `gameState !== STATE_PLAYING` の早期returnが `updateGunsight(dt)` の手前にあるため、飛行終了時にガンサイトリングを消す経路が存在しない。
  発火条件: ガン射程内に敵を捉えた状態(#gunsight から hidden が外れている)で撃墜される、またはミッション完了 → 次フレームで早期returnし #gunsight は最後の座標に貼り付いたまま。#gunsight は #hud 内(2348)で、missionComplete/gameover では #hud が表示されるのでデブリーフ画面に残る。同時に `updateBoresight` は毎フレーム走って boresight を再表示するので、「リングと機影シンボルは排他」というコメント(45688)の契約が破れて2つ同時に描かれる。`gunsightState.active` も true のままで gunsightProbe が誤報。
  確信度: certain
  最小修正案: 46069 の早期returnブロック内で `playerGun.updateGunsight(0)` を呼ぶか、`ui.gunsight.classList.add("hidden")` + `gunsightState.active=false/targetId=null` を `clearTargetDirectionArrow()` の隣に追加する。

[S3] index.html:36587 playMusicSting / 36609 stopMusicSting
  欠陥: 勝利スティングを止めるのは completeMission(false) だけで、デブリーフから離脱するどの遷移も止めない。
  発火条件: ミッション成功 → スティング再生開始の2.8秒後に結果画面 → 即 RETRY / Esc(→missionSelect) / CHANGE AIRCRAFT。`setMusicTrack` はレイヤーgainしか触らずスティングは music バスに直結なので、残りの数秒が MISSION START や menu ベッドの上に重なって鳴り続ける。startMission の `resetMusicCombatState`(37071)もスティングには触らない。
  確信度: certain
  最小修正案: `startMission()` と `setState()` の COMPLETE/GAMEOVER 以外の分岐(あるいは setState 先頭で `nextState !== STATE_COMPLETE` のとき)に `stopMusicSting()` を追加。

[S3] index.html:44395 updateMission / 45467 updateVisualStatus
  欠陥: ウェーブクリア時に予約される "CHECKPOINT" 小バナー(`pendingBanner`/`pendingBannerTimer=1.4`)が、遷移時にキャンセルされない。
  発火条件: ウェーブをクリアした直後1.4秒以内に撃墜される → completeMission は pendingBanner を触らず、`updateVisualStatus` は状態非依存でタイマーを消化するので、MISSION FAILED のデブリーフ上に success トーンの "CHECKPOINT" が湧く(#missionBanner は #hud 内で gameover では表示される)。クリアしたのはウェーブなので文字は嘘ではないが、失敗画面に成功バナーが後追いで出る。
  確信度: certain
  最小修正案: `completeMission()` の冒頭(keys.clear() の並び)で `pendingBanner = null; pendingBannerTimer = 0;` を実行する。

[S3] index.html:46357 updateHud
  欠陥: `ui.stallWarning.classList.toggle("active", lowSpeed || stalling)` で `lowSpeed` だけが STATE_PLAYING でゲートされ、`stalling` は素通り。
  発火条件: 失速状態(stallSeverity > 0.24)のまま撃墜される/ミッション完了 → `updatePlayer` が止まるので `stalling` は永久に true、STALL 警告がデブリーフ画面に点灯し続ける(次の startMission の resetPlayerTransform まで)。
  確信度: certain
  最小修正案: `const inFlight = gameState === STATE_PLAYING;` を作り `toggle("active", inFlight && (lowSpeed || stalling))` / `textContent` も同条件にする。

[S3] index.html:37758 updatePlayer / 44469 completeMission
  欠陥: completeMission が消した AFTERBURNER 表示を、ACCOMPLISHED保留中の updatePlayer が復活させ、STATE_COMPLETE 遷移では誰も消さない。
  発火条件: Shift(またはL2)を押したままミッションクリア → completeMission が `boostIndicator` の active を外す → その後2.8秒 gameState は PLAYING のままなので updatePlayer が毎フレーム再点灯 → setState(STATE_COMPLETE) は触らない → デブリーフに AFTERBURNER が点きっぱなし(次出撃の updatePlayer まで)。
  確信度: likely
  最小修正案: `setState()` の COMPLETE/GAMEOVER 分岐で `ui.boostIndicator.classList.remove("active")` を実行する(completeMission 側の1回だけの除去を状態遷移側へ移す)。

[S3] index.html:36655 desiredMusicSlot
  欠陥: 状態→トラックの対応表に STATE_CAMPAIGN_SELECT が無く、末尾の `return null` に落ちる。
  発火条件: 起動直後(boot は必ず campaignSelect)は無音。missionSelect/ready で menu ベッドが鳴った後に Esc で戦役フォークへ戻ると、`MUSIC_GAMEOVER_FADE_TIME` ではない通常クロスフェードで音楽が落ちる。missionSelect / ready / briefing / missionComplete は全て割り当て済みで、意図的な無音(gameover)にはコメントがあるのに campaignSelect には何も無い = 画面追加時の反映漏れ。
  確信度: likely
  最小修正案: `if (gameState === STATE_MISSION_SELECT || gameState === STATE_READY)` の条件に `STATE_CAMPAIGN_SELECT` を加えて "menu" を返す。

範囲外: 行番号は 2026-08-03 04:13 時点のスナップショット基準(別セッションが index.html を編集中で、調査中にも +13行ずれた)。関数名で参照されたい。
範囲外: updateMission(44395付近) — `waveClearTimer` が負のまま抜ける2経路(`missionWaveIndex >= waves.length` の return、および `tgtRemaining=false && kills < totalTargets`)では、次フレームも `waveClearTimer < 0` が真になり "WAVE n CLEAR"/"ALL TARGETS DESTROYED" バナーとCHECKPOINT予約が一定間隔で無限に再発火し、ミッションが終わらない(不正なwave表/totalTargets不一致時のソフトロック)。


===== boundary-values =====
[S2実害] index.html:45379-45396 updateWorld
  欠陥: `normalTiles[0]` だけ `|| tile` で守られ、`normalTiles[1]` / `normalTiles[2]` は無防備。要素が足りないと `camX / undefined` = NaN がそのまま生きたシェーダユニフォーム `oceanWaveOffset1/2`(=`world.oceanWaveOffsets`の実体、51833-51835)に入る。
  発火条件: `ocean.normalMultipliers` の要素数が3未満のワールドプリセット(`ctx.addWorldPreset` は要素数を検査しない)→ `oceanNormalTiles` が長さ1〜2(51797-51799)→ 海面法線ブレンドが NaN → その海マップの水面が以後ずっと真っ黒/破綻。ガードの `if (offsets && offsets.length >= 3)` は **offsets 側の長さ** を見ており、実際に添字される tiles 側を見ていない(検査対象の取り違え)。
  確信度: certain(NaN到達は式から確定。発火はpayload製プリセット依存)
  最小修正案: `const nt = (i) => normalTiles[i] || normalTile;` を用意して `[1]`/`[2]` を置き換えるか、ゲートを `normalTiles.length >= 3 && offsets.length >= 3` にする。

[S3軽微] index.html:51813-51821, 51836-51842 createWorld(ocean uniforms)
  欠陥: `oceanWaveAngles` / `normalWeights` / `normalFades` / `normalMultipliers` を長さ3前提で `[0][1][2]` 直接添字。短い配列だと `new THREE.Vector3(w0, w1, undefined)` で z=NaN、`oceanWaveDirections[2]` / `oceanWaveFades[2]` が undefined のままユニフォームに入る。
  発火条件: 上と同じくpayloadプリセットが `ocean.normalWeights: [0.6, 0.4]` のように2要素で渡す → `oceanWaveWeights.z = NaN` → 51911 の `oceanSlope += n2 * oceanWaveWeights.z * fade2` が全画素NaN。
  確信度: certain(コード上確定)／発火は payload 依存
  最小修正案: 4つとも `既定配列を展開してから上書き`(`[...DEFAULT].map((d,i)=>cfg[i] ?? d)`)に統一するか、`addWorldPreset` で ocean 系配列の長さ3を検証して throw する。

[S3軽微] index.html:45018-45024 updateCamera
  欠陥: `tmpV3 = WORLD_UP*(1-rollFollow) + playerUp*rollFollow` は `rollFollow === 0.5` かつ背面飛行(ロール180°)でちょうど零ベクトルになる。three.js の `normalize()` は `divideScalar(length() || 1)` なので零ベクトルのまま返り、`addScaledVector(tmpV3, profile.height)` の高さオフセットが消える。
  発火条件: CAMERA_PROFILES.close は `rollFollow: 0.5` ちょうど(2871行)。CLOSEカメラで背面飛行に入る → 180°付近で tmpV3 が「ほぼ真横」の単位ベクトルになり(170°で右95%・190°で左95%)、カメラの8.4mオフセットがロール通過時に左右へ180°振れる。真裏では高さ0で機体と同一平面。chase(0.38)/cockpit(0.9)では発生しない。
  確信度: certain(数式)／見え方は likely
  最小修正案: `normalize()` 前に `if (tmpV3.lengthSq() < 1e-6) tmpV3.copy(tmpV2)`(機体upへフォールバック)を入れる。同型のコードが snapCamera(45136-45143)にもあり、そちらは零 up で `tmpM1.lookAt()` が退化基底を作るので同時に直す。

[S3軽微] index.html:43640-43644, 43686-43690, 43910-43914 shipAaBurst / ciwsBurst / attemptEnemyAttack
  欠陥: `THREE.MathUtils.clamp(v, 0.02, aa.maxHitChance)` は `Math.max(min, Math.min(max, v))` なので、上限が下限を下回ると **下限が勝つ**。`maxHitChance: 0`(=撃っても当たらない宣言)の spec が命中率0.02〜0.025に押し上げられる。
  発火条件: 現状は `range: 0` / `tracers: 0` / `attackRange: 0` という二重ガードで到達しないだけ(index.html:18127, 21668, 5389, payloads/heli_heavyLift.payload.js:54 等)。ガード側を1つでも実値にした瞬間、非武装を宣言した機体が player に被弾を与える。実際 `attemptEnemyGunOnFriendly`(43957)だけが `spec.maxHitChance <= 0` を明示チェックしており、他3経路との非対称が意図の証拠。
  確信度: certain(clampの挙動)／現行データでは潜在
  最小修正案: 3箇所とも `const cap = spec.maxHitChance; if (!(cap > 0)) return;` を先頭に置くか、`Math.min(cap, Math.max(floor, v))` の順に書き換える。

[S3軽微] index.html:32472, 32532 readMissionRecords / recordMissionResult
  欠陥: `JSON.parse(...) || {}` はプリミティブを弾かない。保存値が `5` や `"x"` や `true` だと `missionRecords` が非オブジェクトのまま通り、モジュール(=strictモード)で `missionRecords[key] = entry` が TypeError。
  発火条件: localStorage の `sortieMissionRecords` が旧ビルド/手動シードでオブジェクト以外 → ミッション達成の瞬間に completeMission 経路が例外で落ち、飛んだソーティの記録もランクも消える。配列は `Array.isArray(entry.scores)`(32516-32517)で守っているのに最上位の型だけ未検査。
  確信度: likely
  最小修正案: `const v = JSON.parse(...); return v && typeof v === "object" && !Array.isArray(v) ? v : {};`

[S3軽微] index.html:40178, 40218 groundRoute / pathPointAt
  欠陥: どちらも `path[0][0]` を無条件で読む。`path` が空配列だと TypeError。
  発火条件: mission/payload が `groundUnits` に空の `path`(または空 `convoyRoad`/`railLine`)を渡す → `spawnMissionGround` がミッションロード中に例外 → 盤面構築が途中で止まり、そのソーティが起動不能。placeOnRoute(42229-42230)は「1点ルートで route[i+1] が投げてミッションロードごと落ちた」と実害を明記して1点ケースを守っているが、0点ケースは上流の groundRoute/pathPointAt に残っている。
  確信度: certain(コード上)／到達は authoring 依存
  最小修正案: 両関数の冒頭に `if (!Array.isArray(path) || path.length === 0) return [] / return { x: 0, z: 0, heading: 0 };` を追加し、`spawnMissionGround` 側で空ルートなら drive を null にする。

範囲外: index.html:35710 `renderModelPreview` の `window.addEventListener("resize", drawPreview)` は解除経路が無く、`distance = (radius * 1.22) / Math.tan(...)` は radius 0 の退化モデルでカメラが原点に張り付く(開発用プレビュー限定)。


===== cross-file =====
[S2実害] index.html:12968 と 13987（インライン story_events_1/2 の `sendStoryLine`）／`src/ui/radio.js` の `RADIO_PRIORITY`
  欠陥: ペイロード側が `const PRIORITY_CRITICAL = 2` と自前定義しているが、モジュールの正本は `CRITICAL: 3`／`URGENT: 2`。ストーリー台詞は全て「CRITICAL のつもりで URGENT」として投入されている。
  発火条件: アウトロ発生ミッション(m05/r20)。`startOutro()` が URGENT 2本(outro-scare/outro-dread)を積んだ直後に `finalSignature()` が 2本を interrupt=false で積む → `triggerLine` の満杯時退去は `resolvedPriority <= queue[worstIdx].priority` で**同値を弾く**ため、キュー4本が全て優先度2だと署名台詞が黙って捨てられる。さらに `completeMission` の CRITICAL(3) "mission-outcome" が表示中の署名台詞をプリエンプトして破棄する — ペイロードのコメント「A critical two-line signature survives that reset」が主張している挙動と正反対。
  確信度: certain（定数値の食い違いは確定。落ちる頻度は needs-runtime-check）
  最小修正案: 4箇所の `PRIORITY_CRITICAL = 2` を `3` にする。恒久的には `ctx.radioPriorities()`（既に `window.__game` に露出済み）をペイロードcontextにも渡し、定数の複製をやめる。

[S2実害] index.html:46069 `updateEnemyHudMarkers`（早期return）／46146 `updateGunsight(dt)` の呼び出し位置
  欠陥: `playerGun.updateGunsight()` は `updateEnemyHudMarkers` の**最終行**からしか呼ばれず、その関数は `gameState !== STATE_PLAYING` で先に return する。`#gunsight` を隠すコードはモジュール内の `updateGunsight` にしか存在しないため、STATE_PLAYING を抜けた瞬間にガンサイトリングが最後の座標で凍結したまま残る。
  発火条件: 敵を射程内(profile.range)・20°コーン内に収めた状態で撃墜される → `completeMission(false)` → `STATE_GAMEOVER`。CSS の状態別 `display:none` は campaignSelect/missionSelect/briefing/ready のみで、missionComplete/gameover は「デブリーフの背後にHUDを見せる」ため意図的に除外されている(index.html:68-79)。結果、デブリーフ画面に緑のリングが1個貼り付いたまま残る。同フレームで `updateBoresight()` は状態非依存で動き続けるので、隠されていたボアサイトが復帰し**リングと機体シンボルが同時に出る**。
  確信度: likely（コードパスは certain、見え方は needs-runtime-check）
  最小修正案: `updateGunsight(dt)` を `updateEnemyHudMarkers` の外（`updateVisualStatus` 内、`updateBoresight()` の直後）へ移し、モジュール側の先頭で `gameState !== STATE_PLAYING` 相当のゲッタ（または `getEnemies()` 空判定ではなく明示フラグ）で hidden にして return させる。

[S3軽微] src/combat/player-gun.js:updateGunsight ／ index.html:45690付近 `updateBoresight`
  欠陥: ボアサイトは `killCam.active` で明示的に隠されるが、ガンサイトリングには同じ条件が無い。killCam中も `gameState === STATE_PLAYING` なので `updateGunsight` は走り続け、キルカメラ視点でリングだけが投影され続ける。
  発火条件: エース/艦艇撃墜で `startAceKillCam()` → スローモ中、射程内に別の敵が居るとリングがキルカム画面上を漂う。「カメラが鼻先を見ていないフレームに機首シンボルの居場所は無い」というコメントの理屈がリングに適用されていない。
  確信度: certain（コード上）／見た目の目立ち方は needs-runtime-check
  最小修正案: コンポジションルートに `isCameraDiverted: () => cameraFocusActive || killCam.active` を追加し、`updateGunsight` 冒頭で真なら hidden にして return。

[S3軽微] index.html:33822 `gimbalProbe`
  欠陥: `strength: GUN_GIMBAL_STRENGTH`（0.75固定）を返しているが、実際のアシスト上限は機体プロファイル×目標クラス×距離で決まる `assistCap()` に移った。`lastGimbal.k` は実値なのに、同じオブジェクトに並ぶ `strength` だけが旧世界の定数。
  発火条件: A-10(ATTACK: surface near 0.82)で地上目標に撃つ → `k` は 0.82 まで上がるのに probe は `strength: 0.75` を報告。ハーネスが「k は strength を超えない」と検算すると偽陽性の失敗になる。
  確信度: certain
  最小修正案: `strength` を `playerGun.assistCap(lastGimbal.rangeM, ...)` 由来の実効上限に置き換えるか、フィールド名を `legacyDefaultStrength` にして誤読を断つ。

[S3軽微] index.html:33900 `gunAssistSim`
  欠陥: 「production step, not a copy of it」と謳いながら `gunAssistStep(s, targetId, angle, range, dt)` を第6引数 `target` 無しで呼んでいる。モジュール側 `assistCap` は `targetClass(undefined)` → 常に `"air"` を返すため、このシムは**どの機体でも空戦側の上限しか測れない**。
  発火条件: A-10/Su-25 の対地アシスト(ATTACK surface 0.82/0.34)を検証しようとすると、air の 0.30/0.10 の収束曲線が返る。地上アシストの回帰テストが恒久的に無効。
  確信度: certain
  最小修正案: `events` に `surface: true` を受け、`gunAssistStep(..., e.surface ? { surface: true } : null)` を渡す。

[S3軽微] src/combat/player-gun.js:194 `enemyHitSphereRadius` × 201 `aimForgiveness` × 291 `fire`
  欠陥: `hitBox` を持つ目標は「最大辺×0.5」の球で近似され、そこへ**航空機用の近距離許容 `GUN_CLOSE_FORGIVENESS = 2.2`** がクラス無差別に乗算される。空母(hitBox.z = 340)は半径170mの球、100m まで寄ると許容係数 2.06 で**実効半径 ≈ 350m**。
  発火条件: 空母/揚陸艦の横 300m を機首を向けて通過しながら機銃を撃つ → 明らかに海面へ外れたバーストが hull ヒットとして damageEnemy を呼ぶ（`hitConfirm` も点灯）。船体の細長さ(82×46×340)が球近似で消えるうえに、寛容係数が二重に効く。
  確信度: certain（算術）／実プレイでの目立ち方は needs-runtime-check
  最小修正案: `aimForgiveness` を `targetClass(target) === "air"` のときだけ適用する（`fire()` 内で `radius = baseRadius * (targetClass(enemy)==="air" ? aimForgiveness(range) : 1)`）。数値そのものは触らない。

[S3軽微] src/combat/player-gun.js:126 `assistState` ／ 388 `setAircraft` ／ index.html `startMission`
  欠陥: `setAircraft()` は `muzzleIndex` だけを 0 に戻し、`assistState`(targetId, k) と `gunsightState` は前ソーティのまま残る。index.html 側にもこれを初期化する経路が無い（`startMission` は resetRadio/resetLock は呼ぶがガン系は呼ばない）。
  発火条件: ミッションAで敵ID 3 にアシストが乗った状態(k≈0.7)で終了 → ミッションBの1フレーム目、`updateGunsight` はHUD更新段(`updateVisualStatus`)で走るのに `fire()` は先行する `updatePlayer` で走る。ID は毎ミッション 1..N で振り直されるので、`enemies.find(id === 3 && alive)` が別人にヒットし、開幕最初のバーストが無関係な機体へ曲げられる。次フレームで自己修復するため1バーストのみ。
  確信度: likely（needs-runtime-check: 開幕フレームで Space が押されているかに依存）
  最小修正案: モジュールに `resetAim()`（assistState.k/targetId と gunsightState を初期化し `ui.gunsight` を hidden）を追加し、`setAircraft` 内と `startMission` から呼ぶ。

範囲外: index.html:32865-32866 の `raycaster`(near/far のみ設定)はどこからも使われておらず、`GUN_RANGE` インポートの片方の消費者が死んでいる。


===== dt-vs-rawdt =====
[S2致命/実害] index.html:38814 (および38809) updateEnemyMissiles
  欠陥: 敵ミサイルの信管が「フレーム末端の点距離テスト」だけで、掃引(swept)も終端サブステップも無い。自機ミサイル側は missile-guidance.step() の sweptMissDistance と stepsFor() で両方持っており、コメントも「break専用11m信管は量子化の回避策で、サブステップが原因を直した」と明記している。敵側だけがその修正前の形のまま。
  発火条件: BOOST_SPEED 833 の機体 (su57/f22系) で正面から接近する SAM (maxSpeed 400〜545) → 接近速度 ~1378 m/s。60fps でも 1フレーム 23 m 進むのに信管半径は 13 m。真芯を外した(miss distance 5〜10m の)命中コースの弾はサンプル点がどれも 13 m 圏外に落ち、機体を貫通してそのまま飛び去り lifeLimit で消える。dt が 0.05 にクランプされる低fps時は 1ステップ 69 m で、敵ミサイルがほぼ全弾すり抜ける。デコイ判定 (`distance < 15`) と対友軍航空機の 22 m 判定も同じ形で、低fps時はフレアが効かない/輸送機に当たらない。
  確信度: certain (幾何は決定的。実害の頻度のみ needs-runtime-check)
  最小修正案: 移動前に `missileGuidance.sweptMissDistance(pos, forward, speed*dt, aimPoint)` で判定するか、`stepsFor` 相当の終端サブステップを敵側にも通す。3箇所(プレイヤー13m/デコイ15m/友軍22m,60m)を同じ掃引関数に寄せる。

[S2実害] index.html:45182 updateFlightEffects (呼び出しは index.html:35825)
  欠陥: `updateFlightEffects(rawDt)` だが、中身は camera/audio/radio/visualStatus のどれでもなく、シム量 (`currentGLoad`, `playerSpeed`) を実時間で積分している。animate() 内の近隣呼び出しは全て「なぜ rawDt か」のコメントを持つのに、この行だけ根拠コメントが無い(位置でまとめられた形跡)。
  発火条件: 強い旋回中(currentGLoad > 1.12)にエースを撃墜 → killCam で timeScale=0.18。gStrain は `+= rawDt*0.75` なので 1.6 秒の実時間スローモ中に +1.2 蓄積して飽和し、機体は 0.29 秒ぶんしか G を引いていないのにグレーアウト暈が最大(opacity 0.72)になる。同じ関数の風ストリークは `streak.z += (40 + playerSpeed*0.85) * rawDt` で、世界が 0.18 倍で這っている画面を秒18回のペースで流れ続ける。updateWingSweep も実時間で動く。
  確信度: certain (コード上の振り分け) / 見え方は likely
  最小修正案: `updateFlightEffects(dt)` に変更する。UI フェード相当のものだけ残したいなら updateVisualStatus と同じく `(rawDt, dt)` の2引数にし、gStrain/ウィンドストリーク/ウイングスイープを simDt 側へ移す。

[S3軽微] index.html:44401 updateMission / 44397 pendingBannerTimer
  欠陥: 1つの演出シーケンスの中で時計が混ざっている。`waveClearTimer` はシム dt で減るが、同じ場所で仕込む `bannerTimer`(1.35)と `pendingBannerTimer`(1.4) は updateVisualStatus 内で rawDt で減る。コメントは「CHECKPOINT は次の波のバナーに引き継ぐタイミングに合わせてある」と主張しており、コードはその関係を保てない。
  発火条件: 波の最終 TGT がエースまたは空母 (damageEnemy の startAceKillCam は正にこの2種) → 撃墜と同時に killCam。waveClearTimer 2.15 は killCam の 1.6 秒実時間で 0.35 しか進まず、次の波は約 3.4 秒後になるのに CHECKPOINT バナーは 1.4 秒後に出る。ミッション最終目標がエースの場合も同様に MISSION ACCOMPLISHED が約 1.25 秒遅れ、先に "ALL TARGETS DESTROYED" が消える。
  確信度: likely
  最小修正案: `waveClearTimer -= dt` を rawDt にする(バナー系と同じ時計に揃える)か、逆に updateVisualStatus のバナー3種を simDt に寄せる。混在をやめること自体が修正。

[S3軽微] index.html:37717 / 37735 updatePlayer
  欠陥: 自機の地形衝突と艦船クラッシュボックス判定がフレーム末端の1点サンプルのみ。同じファイル内でミサイルの地形判定には「1フレーム約14m進むので端点だけだと1ステップより細い尾根を跨いでしまう」というコメント付きの中点掃引が入っており、自機はその3倍動くのに掃引が無い。
  発火条件: BOOST_SPEED 833 の機体で dt がクランプ上限 0.05 に張り付く低fps(20fps相当) → 1フレーム 41.65 m。駆逐艦系の crash ボックスは halfBeam 11〜16(幅 22〜32 m)なので、艦を真横に横切ると当たり判定を丸ごと跨いで艦体を通り抜ける。氷河ステージの細い尖塔も同様に貫通しうる。60fps(13.9 m)では発生しない。
  確信度: likely (低fps再現が要る → needs-runtime-check)
  最小修正案: 移動前位置 (tmpMissileFrom 相当) を保持し、地形は中点も `surfaceTopAt` でサンプル、艦ボックスは移動前後の2点(または中点)で判定する。

[S3軽微] index.html:38348 updateBombs
  欠陥: このファイルで唯一 `damping()` を通していないスムージング。`bomb.mesh.quaternion.slerp(tmpQ1, Math.min(1, dt * 6))` はフレームレート依存で、同じ落下でも fps によって機首の倒れ方が変わる。加えて同関数の対航空機直撃判定 (`enemy.group.position.distanceTo(tmpV1) <= directRadius`) も端点サンプルのみで、地表判定だけが14回の二分探索で正確という非対称になっている。
  発火条件: 30fps と 144fps で同じ投弾をすると爆弾の姿勢追従速度が変わる(dt*6 は dt=0.05 で 0.3、dt=0.007 で 0.042)。直撃判定は落下中の爆弾が敵機の directRadius を1フレームで跨ぐと素通り。
  確信度: certain (dt 依存) / 直撃素通りは likely
  最小修正案: `slerp(tmpQ1, damping(k, dt))` に置換。直撃判定は `previousT` 側の位置との線分-点距離にする。

[S3軽微] index.html:42614 updateEnemies (および 41543 updateFriendlies)
  欠陥: 敵AIの照準オフセット位相が `time = performance.now()*0.001`(実時間)なのに、機体の運動と旋回は dt(シム時間)。回避挙動 `sin(time*spec.evadeFrequency)`、縦バイアス `sin(time*spec.verticalFrequency)`、ブレイク時のジンク `sin(time*ENEMY_BREAK_JINK_RATE)` が全てこれ。
  発火条件: killCam 中 (timeScale=0.18)、機体は 0.18 倍で動くのに狙点だけが実時間で 1〜2 Hz で振れ続ける → 敵は追従できず、狙点との差が常に開いた状態で「ふらつきながら置いていかれる」動きになる。スローモ演出の最中に見える位置(撃墜した機の近傍)なので目に入る。
  確信度: likely
  最小修正案: 各機に `enemy.animTime += dt` を持たせて `time` の代わりに使う(または updateEnemies に渡す `time` をシム累積時計にする)。updateShip の船体ボブなど純粋な背景演出は現状の実時間のままでよい。


===== lifecycle-leak =====
[S3軽微] index.html:44837 attachLandingGear / index.html:44941 hangarDisplayFor
  欠陥: 脚とブロブ影の GPU 資源が、どの解放リストにも属していない。`collectOwnedGeometries(root)` は createAircraftModel の return 時点で確定済みで、`attachLandingGear` はその**後**に CylinderGeometry×11（ノーズ脚=支柱1+タイヤ2+ハブ2、主脚2本=各3）と MeshLambertMaterial×3（strutMat/tireMat/hubMat）を model.group に足す。hangarDisplayFor はさらに PlaneGeometry+MeshBasicMaterial（shadow）を足す。`disposeAircraftMaterials` は standardMaterials / flameMaterial / extraMaterials / ownedGeometries しか見ないので、これら15個は解放手段が存在しない。
  発火条件: 今は脚付きモデルが `hangarView.cache`（セッション永続）にしか入らないので実害は出ない。コメントが宣言している「planned takeoff/landing missions」で脚を実機（player/enemy）に付けた瞬間、rebuildPlayerModel／敵撃墜のたびにジオメトリ11+マテリアル3が毎回GPUに残る。
  確信度: certain（コードの構造上、ownedGeometries に入り得ない）
  最小修正案: `attachLandingGear` の末尾で `model.ownedGeometries.push(...)`（各 CylinderGeometry）と `model.extraMaterials.push(strutMat, tireMat, hubMat)` を行い、hangarDisplayFor の shadow も同様に model へ寄せる。

[S3軽微] index.html:13020 / index.html:14025 createFallbackRadio（payloads/story_events_1.payload.js:167, story_events_2.payload.js:378 の同一コード）
  欠陥: 生成しかない。`#radioPanel` の cloneNode を `original.parentNode` へ永久に append し、自己再帰する `window.requestAnimationFrame(tick)` を回し始めるが、キャンセルする経路が存在しない。返り値の `reset()` は queue と表示を消すだけで rAF ループもDOMも残す。
  発火条件: devローダーが payload を単体で読む（＝`triggerRadioLine` が語彙的に見えない）経路。story_events_1 と _2 の両方が発火すると、複製パネル2枚＋毎フレームの tick ループ2本がページ終了まで残る。プロダクションの inline_payload 版は `typeof triggerRadioLine === "function"` が真になるため到達しない。
  確信度: certain（cancelAnimationFrame も panel.remove() もファイル内に存在しない）
  最小修正案: `tick` の rAF ハンドルを保持し、`reset()`（または生成側に stop()）で `cancelAnimationFrame` + `panel.remove()` を行う。

[S3軽微] index.html:13298 / index.html:14361 tickStoryEvents / tickStoryEvents2
  欠陥: `window.setInterval(..., 100)` の戻り値を捨てており、`clearInterval` が全ファイル中に1つも無い。停止手段が構造的に無い。
  発火条件: ページ生存中ずっと。メニュー／ブリーフィング／デブリーフ中も 10Hz×2本が `window.__game` を読み続ける（`leaveMission()` は自前状態を畳むだけでタイマーは止めない）。
  確信度: certain
  最小修正案: ハンドルを payload スコープに保持し、`ctx` 側に stop を1本生やす（または動作契約として「ページ寿命で正」とコメントに明記して意図を固定する）。

[S3軽微] index.html:35710 renderModelPreview
  欠陥: `window.addEventListener("resize", drawPreview)` に対応する removeEventListener が無く、`labelLayer`（document.body 直付け）、`previewScene`＋ライト4灯、プレビュー用モデルのジオメトリ／マテリアルも一切 dispose されない。`window.__MODEL_PREVIEW__.redraw` として外に出しているので参照も切れない。
  発火条件: `?modelPreview=` はブート時1回しか呼ばれない設計（`if (MODEL_PREVIEW_ID) renderModelPreview(...) else animate()`）なので現状は無害。ハーネスが被写体を切り替えるために2回目を呼んだ時点で、リスナとシーンが被写体の数だけ積み上がる。
  確信度: certain（解放コードが存在しない）／再入の有無は needs-runtime-check
  最小修正案: 関数先頭で前回の `__MODEL_PREVIEW__` があれば resize リスナ解除・labelLayer 除去・前シーンの dispose を行う（再入しない前提なら「1回きり」をコメントで契約化する）。

[S3軽微] index.html:44597 buildHangarScene / 44812 shadowTexture / 44957 hangarView.cache
  欠陥: ハンガー側は `disposeWorld` に相当する解放関数が無い。床/壁/天井/什器のジオメトリ・マテリアル、`floorTexture`・`wallTexture`（＋壁ごとの `wallTexture.clone()` 6枚＝別GPUテクスチャ）、`shadowTexture`、そして `hangarView.cache` に溜まる完成機体モデル（AIRCRAFT_TYPES 全数まで）が、生成のみで破棄されない。
  発火条件: 機体セレクトでカーソルを全機種なめると、その分の完全な航空機モデル（マテリアル8＋固有ジオメトリ＋脚15）がセッション終了まで常駐する。キャッシュ方針自体はコメントで意図が宣言されているが、上限も解放も無いのは world 側の契約（`renderer.info.memory` がベースラインに戻る）と非対称。
  確信度: certain（解放経路が存在しない）／実害の大きさは needs-runtime-check
  最小修正案: `hangarView` に world と同じ roots/geometries/materials/textures 台帳を持たせ、`disposeHangar()` を1本用意して STATE_READY を離れる時か機体購入/キャンペーン切替時に呼べるようにする。

[S3軽微] index.html:36295 playTone / stopActiveAudioSources
  欠陥: 遅延付きで `oscillator.start(start)` した音源に対し、`stopActiveAudioSources()` は `start` 到来前でも `source.stop()` を呼ぶ。Web Audio 仕様上これは InvalidStateError を投げ、空 catch に飲まれるため停止に失敗する（＝作った音が壊せない）。
  発火条件: `deployFlare` 等の `playTone(..., delay=0.02)` 発火から20ms以内に startMission/clearMissionObjects が走ると、ミッション破棄後にそのトーンが鳴る。activeSources からは clear 済みなのでリークではなく、迷子の一発。
  確信度: likely（仕様上 start 前 stop は throw。実測は needs-runtime-check）
  最小修正案: `playTone` が生成時刻を持ち、`stopActiveAudioSources` は `gain.gain.cancelScheduledValues(now)` + `setValueAtTime(0, now)` で黙らせてから stop を試みる。

範囲外: `restartFromCheckpoint` は startMission 経由で全掃除が走るため二重解放も取りこぼしも無し（確認済み）。scene.add 43箇所／scene.remove 18箇所の対応、effects 4種の dispose、payload の extraMaterials 登録、createWorld の keepGeometry/keepMaterial/keepTexture 網羅、DOM リストの replaceChildren 化はいずれも欠落なし。


===== enemy-ai =====
[S2実害] index.html:38607 attemptEnemyMissile
  欠陥: 護衛ミッション専用のURGENT無線(「敵機がLIFELINEにミサイルを撃った！ 輸送機は回避できない」)が、`charge` が真なら無条件に鳴る。wingmanHunter機が僚機に撃った場合も同じ経路を通る。
  発火条件: updateEnemies:42712 で `enemy.wingmanHunter && wingmanRef && distanceToPlayer > 150` → huntRef=僚機 → updateEnemyOrdnance が `attemptEnemyMissile(enemy, 僚機)` を呼ぶ。wingmanHunter は非TGT/非hunt/非strike/非HEAVYの3機に1機なので全ミッションに湧く → 輸送機もLIFELINEも存在しない出撃で、存在しない被護衛目標の緊急無線が繰り返し発話され、本来の無線をプリエンプトする。
  確信度: certain
  最小修正案: `if (charge)` を `if (charge && charge.vulnerable)`（または `guardState.active && charge.vulnerable`）に絞り、僚機狙いの発射は無線なし（もしくは既存の "enemy-missile-${id}" 側）に落とす。

[S2実害] index.html:43342 updateShip
  欠陥: 内海へ戻す「海のフェンス」の方位がX軸で鏡像。ファイル自身が明記する規約は「方向 d へ舳先を向ける = atan2(-d.x, -d.z)」（landing枝43337、updateFriendlyShip、placeOnRoute の★注記が全て同形）。原点へ戻る d=(-x,-z) なら `atan2(x, z)` が正で、コードは `atan2(-x, z)`。
  発火条件: 艦の原点距離が1900を超えた瞬間から、forward が (x/r, -z/r) すなわちX方向に外向き。例: BEACHHEAD の錨泊船団(at:[-500,-1000] → facing:[1650,-1000]) の護衛艦は東進中にx≈1600で閾値を越え、以後さらに東へ加速して戻らない。x軸上の艦なら誤差はちょうど180°。Z成分だけ正しいので、艦は原点を回り込まず外周へ螺旋する＝艦隊が戦域外／山嶺へ流出。
  確信度: certain
  最小修正案: `Math.atan2(enemy.group.position.x, enemy.group.position.z)`（先頭の負号を除去）。

[S2実害] index.html:43349 updateShip
  欠陥: 山の足元を避ける枝も同じX鏡像。回避方向 d=(dx,dz)（山からの外向き）に対し正は `atan2(-dx, -dz)`、コードは `atan2(dx, -dz)`。
  発火条件: 原点1900m以内で山の `r*2.0+160` 圏に入った艦。山の東西側にいる艦（dx≠0）は回避方位が反転し、山の中心へ向かって舵を切る → 座礁／地形にめり込んだまま巡航。dz方向成分だけ正しいので南北側からの接近だけ偶然正しく見える（placeOnRoute の★注記が警告している罠そのもの）。
  確信度: certain
  最小修正案: `Math.atan2(-dx, -dz)`。

[S2実害] index.html:42021 updateFriendlyCarrier
  欠陥: 空母の「外洋に出たら中央へ戻す」方位も同じX鏡像（`atan2(-x, z)`）。
  発火条件: 友軍空母が原点から3200mを超えた時点で、X方向に外向きの針路を取る。護衛対象がINDEPENDENCEの護衛ミッションでは、艦が守るべき海域から出続け、hunt機の突入経路とプレイヤーの防御位置が延々ずれる。
  確信度: certain
  最小修正案: `Math.atan2(friendly.group.position.x, friendly.group.position.z)`。

[S3軽微] index.html:42785 updateEnemies
  欠陥: 編隊リーダー機自身が pursuit 枝で自分の僚機を「リーダー」として解決してしまう。42785のフォールバック `enemies.find(同wave && id!==自分)` はリーダー機に対しては僚機を返し、ロイター枝(42876)にだけ `enemy.id !== enemy.formationLeaderId` のガードがあるのに、pursuit枝(42840)には無い。
  発火条件: behavior:"formation" のwave（su27/mig23等、formationWeight 0.5〜0.6）がpursuitに入ると、リーダーは僚機の44m後方スロットへ、僚機はリーダーの44m後方スロットへ、互いに55%重みで引かれる。両機の照準点がプレイヤー六時から相互の尾部へ引き剥がされ、ペアが互いの後方を取り合って旋回する＝コメントが「最後の『何もない所を旋回する』バグ」と称して潰したはずの閉ループが追撃時だけ残存。
  確信度: likely（幾何は certain、体感度合いは要実測）
  最小修正案: 42840の条件に `&& enemy.id !== enemy.formationLeaderId` を足す（ロイター枝と同じガード）。

[S3軽微] index.html:43465 updateHeli
  欠陥: ヘリの地表高 `groundHeight` が0.35s間隔サンプル（HELI_TERRAIN_INTERVAL）なのに、下限クランプ(43509 `if (position.y < floor) position.y = floor`)もその古い値を使うため、斜面横断中は地形に埋まり、再サンプルの瞬間に一段跳ね上がる。
  発火条件: dash 68m/s × 0.35s = 23.8m進む間、真下の地形は更新されない。山（r 130〜380 / h 30〜430、傾斜1.0超もある）を横切ると真の地表は30m前後上がるので、最大0.35秒ぶん山肌に埋没 → 次サンプルで数十mワープ。加えて climbRate 22m/s は 68m/s×傾斜1.25 = 85m/s の要求上昇率に届かないので、上昇ではなくクランプが毎フレーム持ち上げる。固定翼側は terrainFloorAt を連続コーンに書き換えてこの「ワープ」を潰した経緯がコメントに残っているが、ヘリだけ対策が入っていない。
  確信度: needs-runtime-check（機構は certain、視認性は山のある任務で要確認）
  最小修正案: クランプ直前に `enemy.groundHeight = Math.max(enemy.groundHeight, surfaceHeightAt(position.x, position.z))` を進行方向のみ毎フレーム評価するか、地表の変化率が大きい間だけ HELI_TERRAIN_INTERVAL を短縮する。

[S3軽微] index.html:42662 updateEnemies
  欠陥: 「Mounts follow the hull the instant it has moved, **alive or wrecked**」とコメントが宣言しているが、`positionSubsystem` を回すのは生存艦の枝だけ。撃沈後は `updateShipSinking` が船体を前進＋沈降させる一方、砲塔群の group は静止したまま。
  発火条件: subsystems 持ちの艦（イージス/空母）を撃沈 → SUBSYSTEM_WRECK_TIME=4.5秒ぶん、`updateSubsystemWreck` が旧デッキ座標に黒煙と火花を吐き続け、船体は沈みながら数十m先へ離れる → 沈没船から切り離された煙柱が海面に浮く。
  確信度: certain
  最小修正案: `!enemy.alive` 枝の `updateShipSinking(enemy, dt)` 直後に、同じ `for (…) positionSubsystem(enemy.subsystems[s])` を追加する。

範囲外: `attemptEnemyAttack`(43886) は `playerHitCooldown > 0` の間トレーサーを一切描かずに帰るのに `enemy.fireCooldown` は呼び出し側で必ずリセットされるため、被弾直後0.55秒の射撃機会が丸ごと消える（艦のAAは同条件でも撃つので挙動が非対称）。


===== save-compat =====
[S1] index.html:36909 `readDifficulty` / 39627 `spawnEnemy`
  欠陥: `DIFFICULTY_TUNING[value] ? value : "normal"` が own-property 検査ではないため、`sortieDifficulty` に `Object.prototype` のキー（`toString`/`constructor`/`valueOf`/`hasOwnProperty`）がそのまま通る。
  発火条件: `localStorage.sortieDifficulty = "toString"`（手打ちミス/別ツールの書き込み/旧キー残骸）→ 起動時 `readDifficulty()` が "toString" を返す → `DIFFICULTY_TUNING["toString"]` は関数で truthy なのでフォールバックが効かず、`spawnEnemy` の `skillShift` が undefined → `clamp(index + undefined)` = NaN → `SKILL_TIER_ORDER[NaN]` → `SKILL_TIERS[undefined]` = undefined → 39672 `skill.engageScale` で TypeError。**全ミッションが出撃した瞬間にクラッシュ**し、値は保存済みなのでリロードしても再発（`updateDifficultySelector` は "ace" しか救済しない）。同経路で `applyPlayerDamage` の `incomingDamage` も undefined → `health = Math.max(0, prev - NaN)` = NaN（無敵化・数値破綻）。
  確信度: certain
  最小修正案: `Object.prototype.hasOwnProperty.call(DIFFICULTY_TUNING, value)` に変える（第1ラウンドで `normalizeWaveEntry` に入れたのと同じ対策が、ここだけ残っている）。

[S1] index.html:32490 `readMissionRecords` / 32515 `recordMissionResult`
  欠陥: `JSON.parse(...) || {}` は falsy しか弾かないので、配列・数値・文字列がそのまま `missionRecords` になる。`readAircraftPurchases` にある `Array.isArray` 相当のオブジェクト検査が対になっていない。
  発火条件: (a) 保存値が `"[]"`（旧形式/手で壊された）→ セッション中は `missionRecords["m01"]=…` が expando として動くので解禁もランクも正常に見えるが、`saveMissionRecords` の `JSON.stringify(配列)` が **文字列キーを全部落とす** → 次回起動で全記録消滅（永久に貯まらない、無言）。(b) 保存値が `"5"` や `'"S"'` → module＝strict mode なのでプリミティブへの `entry.cleared = true` が TypeError → `updateOutcomePending` から throw → 直後の `setState(STATE_COMPLETE)` に到達せず、**全目標撃破後にデブリーフが出ないままハング**（rAF はループ先頭なので画面は動き続ける）。毎回のミッション完了で再発。
  確信度: certain
  最小修正案: `const raw = JSON.parse(...); return (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw : {};`。

[S2] index.html:32490/32500 `readMissionRecords`+`saveMissionRecords`、4353/4368 `readAircraftPurchases`+`saveAircraftPurchases`
  欠陥: 4キーとも「起動時に1回読む→丸ごと上書き保存」で、`storage` イベント購読も書き込み前の再読み込みもマージもない（リポジトリ全体で `addEventListener("storage")` は0件）。
  発火条件: 同一ブラウザで2タブ開く（ゲームを再読み込みせず別タブで開き直す運用は普通に起きる）→ タブAで m02 をクリア（保存）→ タブB（起動時の古いスナップショットを保持）で m03 をクリア → タブBが m02 を含まない記録で上書き → **解禁済みミッションが LOCKED に戻り、ハンガーの収入も消える**。購入も同様で、タブAで買った機体がタブBの購入で消え、支払い済みの機体だけが失われる。
  確信度: certain
  最小修正案: 保存を read-modify-write にする（`saveMissionRecords` 内で最新をパースして自分の変更だけマージ）か、最低限 `window.addEventListener("storage", …)` で他タブ更新時に in-memory を再読込する。

[S2] index.html:4353 `readAircraftPurchases`（実行位置）と 10041 付近 `addAircraftType`
  欠陥: 購入リストの濾過 `AIRCRAFT_ORDER.includes(id)` が **payload 登録より前**（4353 対 applyPayload ~10367、`Object.freeze(AIRCRAFT_ORDER)` は ~10401）で走るため、payload が `AIRCRAFT_ORDER` に push する機体は濾過時点で存在しない。
  発火条件: payload が `addAircraftType(id, {...})` を `order: false` **なし**（既定＝ハンガーに載せる）で登録 → プレイヤーがその機体を購入・保存 → 次回起動で `readAircraftPurchases` がその id を知らないまま捨てる → **買った機体が毎回消える**（財布は返金扱いになるので買い直せるが、起動のたびに同じ損失）。現行 payload は全て `order: false` なので潜在だが、フックは生きている。
  確信度: certain（順序）/ needs-runtime-check（発火する payload は未出荷）
  最小修正案: 濾過を読み取り時にやめ、`ownsAircraft` 側で `AIRCRAFT_ORDER.includes(id)` を見る（＝レジストリ確定後に評価される）か、`readAircraftPurchases()` の呼び出しを payload 適用後へ移す。

[S2] index.html:35298 boot の `updateDifficultySelector()`（判定は 36959 付近、`isAceUnlocked` 36929）
  欠陥: ACE 解禁判定が `selectedCampaignId` 依存なのに、boot ではプレイヤーがまだキャンペーンを選んでおらず `selectedCampaignId` は既定の `"usa"` 固定。しかも降格時に `saveDifficulty()` で **永続化**する。
  発火条件: 露編20ミッションを全クリアして ACE を解禁・選択 → 終了 → 次回起動 → boot の `updateDifficultySelector()` が usa 基準で `isAceUnlocked()===false` と判定 → `sortieDifficulty` を "normal" に落として localStorage へ書き込み → **ACE の選択が起動のたびに永久に失われる**（露編を選び直しても保存値は normal のまま）。
  確信度: certain
  最小修正案: boot 時の降格では保存しない（表示だけ normal にフォールバック）か、ACE 判定を「いずれかのキャンペーンを全クリア」に広げる。

[S3] index.html:50349 `purchaseAircraft` / 32500 `saveMissionRecords` / 36903 `saveHighscore`
  欠陥: setItem の失敗（QuotaExceededError、Safari プライベート、file:// の SecurityError、ストレージ無効化）を catch で握り潰したまま、呼び出し元は成功として扱う。
  発火条件: 容量超過やストレージ不許可の環境で機体購入 → `aircraftPurchases.add(id)` は済んでいるので `{ ok: true }` を返し「OWNED」と表示 → リロードで所有が消え、購入前の財布に戻る。ミッションクリアも同様に「解禁された」と見えて次回起動で LOCKED に戻る。プレイヤーには何の手掛かりも出ない。
  確信度: certain
  最小修正案: save 系を boolean 返しにし、失敗時は購入をロールバックするか HUD に「進行が保存できない」旨を一度出す。

[S3] index.html:32520 `recordMissionResult`
  欠陥: `entry.ranks` の検査が `typeof === "object"` だけで配列を弾かない。
  発火条件: 旧ビルド/手で壊されたレコードで `ranks` が配列（あるいは `ranks` を配列で seed した QA プロファイル）→ `priorRanks[sortieDifficulty] = rank` が配列の expando になり、`JSON.stringify` で落ちる → **難易度別ベストランクが永久に保存されない**（毎回「初クリア」扱い）。
  確信度: certain
  最小修正案: `entry.ranks && typeof entry.ranks === "object" && !Array.isArray(entry.ranks)`。

[S3] index.html:50338 `walletFor` / 50315 `campaignEarnings` / 50325 `campaignSpending`
  欠陥: 収入キー（`sortieMissionRecords`）と支出キー（`sortieHangarPurchases`）に整合の担保がなく、財布は差分そのままでクランプもない。第1ラウンドで `clearMissionRecords` フックだけは対消去されたが、手動・外部経路は無防備。
  発火条件: docs（roadmap_chatgpt_20260727.md:342、spec_model_batch3:277）が指示する QA 手順どおり `sortieMissionRecords` だけを seed/上書き（あるいは DevTools で1キーだけ削除）→ 収入0・支出42,000 → `walletFor()` が -42,000 → ハンガーが「-42,000 CR」を表示し、`short: price - wallet` が実価格の倍以上の「NEED 84,000 MORE」を出す。再飛行で回復はするが、記録を消した回数だけ余計に稼がされる。
  確信度: certain
  最小修正案: 起動時に「支出＞収入」を検出したら購入リストを収入の範囲まで巻き戻す（または `walletFor` を 0 下限にし、支出側を所有済みとして償却扱いにする）。

範囲外: `readMissionRecords` が壊れた値を検出しても localStorage から除去しないため、初回クリアまで毎起動同じ破損値を読み続ける（実害は上記1件目に含む）。


===== hud-readout =====
[S2実害] index.html:46152 updateTargetBox / index.html:38979 updateLock
  欠陥: #targetBox は `lock.targetId` を読むが、updateLock:38986 のコメントは「TGT box は preferredTargetId を読むので爆撃時もレンジ表示は残る」と主張しており、実装がその主張を満たしていない。
  発火条件: UGB等 `kind:"bomb"` の SP.W を選択 → currentLockKind()==="none" で毎フレーム resetLock() → lock.targetId が常に null → #targetBox は永久に display:none。手動選択(preferredTargetId)をしていなければ enemyMarker の `named` も付かず、爆撃中は画面上のどの敵にも機種名・距離が一切出ない。
  確信度: certain
  最小修正案: updateTargetBox の対象を `preferredTargetId ?? lock.targetId` で引き、`locked` クラスだけを `lock.locked && lock.targetId === target.id` に限定する。

[S2実害] index.html:46876 drawRadar
  欠陥: レーダー描画は `scale = Math.min(1, planarDistance / RADAR_RANGE)` だけで距離カリングを一切せず、スコープ表記「TACTICAL RADAR · 1400M」を超える接触も全部リムに貼り付けて描く。
  発火条件: 地上施設・艦艇・hunt波(HUNT_WAVE_RING_RADIUS=3600)など 1400m 超の接触が常在するミッション → 6km 先の目標とリング上(1400m)の目標がスコープ上で同じ位置に見える。同じ投影を使う自前プローブ(33805 `onScope: planarDistance < RADAR_RANGE`)はそれらを「スコープ外」と判定しており、描画と内部判定が食い違う。敵ミサイル(46977)・友軍(46946)も同様。
  確信度: likely
  最小修正案: 3ループとも `if (planarDistance > RADAR_RANGE) continue;` を入れる(方位だけ出したいならリム記号を別扱いにする)。

[S2実害] index.html:37506 setState(debrief) / index.html:32529 recordMissionResult
  欠陥: デブリーフの TOTAL は `result.total` を素で出すが、記録・スコアリスト・ウォレットに入るのは `Math.round(result.total * scoreMult)`。表示された数値と保存される数値が難易度倍率ぶん食い違う。
  発火条件: HARD(×1.2)/ACE(×1.5)/EASY(×0.8) でクリア → デブリーフ「TOTAL 42000」→ ミッション選択画面のベストスコアには 50400 が載る。プレイヤーは表示された総合点がどこにも残らない。
  確信度: certain
  最小修正案: breakdownTotal に `Math.round(result.total * scoreMult)` を出すか、DIFFICULTY 行を1本足して倍率適用後の値を明示する。

[S3軽微] index.html:46348 updateHud / index.html:37784 launchMissile
  欠陥: SHOOT キューは `lock.locked` だけで点灯し、MSL 残数表示は総弾数 `missileCount` を出すが、トリガーが実際に見るのは `loadedMissiles`(発射管)。
  発火条件: 4発を連射して発射管が空 → HUD は「MSL 6」と SHOOT 点灯のまま、トリガーは 37784 で拒否音だけ返す。ラック(#rackLeft/Right)は発射管状態を示すがシルエット側にあり、SHOOT キューと数値は両方とも「撃てる」と表示し続ける。
  確信度: certain
  最小修正案: shootCue の条件に `loadedMissiles > 0`(SP.W選択時は `spwLoaded > 0`)を加える。

[S3軽微] index.html:46977 drawRadar / index.html:38912 getNearestEnemyMissileThreat
  欠陥: スコープの黄色ミサイル記号は enemyMissiles を無条件に全部描くが、MISSILE ALERT 側は decoy 済み・lost・targetFriendly を脅威から除外している。同じ「脅威」を2箇所が別定義で表示。
  発火条件: フレアでブレイク成功 → MISSILE ALERT は消える(「アラートが消えることでブレイク成功が分かる」という 38932 のコメント通り)が、無力化済みの弾はスコープ上に追尾記号として残り続ける。対艦ミサイルも同様にプレイヤー脅威として描かれる。46387 のコメントは「方位と距離はスコープ側にある(弾はそこに描かれている)」と、スコープを脅威表示の正本だと宣言している。
  確信度: certain
  最小修正案: 描画ループでも `if (missile.decoy || missile.lost || missile.targetFriendly) continue;`(または別色・別記号)にする。

[S3軽微] index.html:46149 updateEnemyHudMarkers / index.html:45876 updateGunsight
  欠陥: updateGunsight は updateEnemyHudMarkers の最終行にしかなく、その関数は 46072 で `gameState !== STATE_PLAYING` のとき早期 return するため、出撃終了後にガンサイトリングを隠す経路が存在しない。
  発火条件: 敵を射程内に捉えたまま撃墜される/クリアする → #gunsight は死亡時の座標に貼り付いたまま可視。#hud のブラックアウト規則(CSS 70-77)は campaignSelect/missionSelect/briefing/ready の4状態だけで missionComplete/gameover を含まないため、半透明のリザルト画面越しに残る。同じ症状はボアサイト側では「94px ずれる」として明示的に修正済み(45496 のコメント)。
  確信度: certain
  最小修正案: updateEnemyHudMarkers の早期 return の前に `updateGunsight(0)` を呼ぶ(assistState もそこで 0 に落ちる)。

[S3軽微] index.html:46080 updateEnemyHudMarkers / index.html:46152 updateTargetBox
  欠陥: 「選択中の接触」の定義が2種類ある。レーダーの点滅・方向矢印・マーカーの selected は `preferredTargetId ?? lock.targetId`、#targetBox は `lock.targetId` 単体。
  発火条件: 手動でターゲットを選んだあと機首を振ってその機がロックコーンから外れる → updateLock:39037 の preferredCandidate が立たず lock.targetId は別の自動候補に移る → レーダーは A 機を点滅させ矢印も A を指すのに、画面中央の TGT ボックスは B 機の名前と距離を出す。
  確信度: certain
  最小修正案: どちらか一方に寄せる(TGT ボックスも `preferredTargetId ?? lock.targetId` を表示し、locked 枠だけ lock.targetId に限定するのが最小)。

[S3軽微] index.html:45275 updateBattleArea / index.html:46375 updateHud
  欠陥: updateBattleArea は `outcomePending.active` のとき先頭で return するため battleArea.warning / outside / timer が凍結するが、HUD は gameState が STATE_PLAYING のままなので警告を出し続ける。
  発火条件: 戦域外でカウントダウン中に最終目標が落ちて ACCOMPLISHED 保留に入る → 「RETURN TO THE BATTLE AREA · 4」が 4 のまま赤く点灯し続け、実際には失敗タイマーは止まっている(表示は迫っている、実挙動は止まっている)。
  確信度: likely
  最小修正案: outcomePending 突入時に battleArea.warning/outside を false にクリアするか、updateHud 側で `!outcomePending.active` を条件に加える。

範囲外: getNearestEnemyMissileThreat (index.html:38930) は毎フレーム `tmpV10.clone()` を新規確保しており、「毎フレーム生成ゼロ」契約に反する(脅威が居る間ずっと1個/フレーム)。
範囲外: #targetRange (index.html:2404) は CSS で `display:none` 固定・どこからも書かれない死んだノード。
