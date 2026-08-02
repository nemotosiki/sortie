

===== CHUNK 1-2572 (agent ac971c44f3943f4b9) =====
[S2実害] index.html:2505 `#startScreen` の初期markup（`class="screen menuScreen hangarScreen"`)
  欠陥: 全画面セクション中この1つだけ初期 `hidden` クラスが無く、`<body>` も `data-game-state` 属性を持たないまま出荷される。
  発火条件: ページ読み込み → ESMモジュール(`three` をCDNから import)が解決してブート `setState(STATE_CAMPAIGN_SELECT)` に到達するまでの間、ハンガー画面(z-index 30)が全画面に出る。同時に body に `data-game-state` が無いので 70-79行のブラックアウト規則が1つもマッチせず、HUD(#hud)と #radioPanel が初期値のまま裏で描かれる。CDN遅延・低速回線ほど露出が長い。
  確信度: certain（`.screen.hidden`=1536行が唯一の display 制御、2505行に hidden 無し、`document.body.dataset.gameState` の初回書き込みは 25385行=setState 内のみ）
  最小修正案: 2505行に `hidden` を足して他4画面と揃え、`<body data-game-state="campaignSelect">` を静的に書いておく。

[S2実害] index.html:33295 `updateWorld` / `#cloudVeil`(2410行、`#hud` 外・z-index 5)
  欠陥: 雲ホワイトアウトのオーバーレイがメニュー状態のブラックアウト対象外で、かつ `ready` 状態ではワールド `camera` が一切更新されないため、雲の中で終わった値が画面に貼り付いたまま残る。
  発火条件: 雲塊の中にいる状態でミッション終了(撃墜/クリア) → デブリーフ→[CHANGE AIRCRAFT]で `STATE_READY` へ。`updateHangarView` は `hangarView.camera` しか動かさず(32844-32856行)、`updateWorld(rawDt)` は 23819行で全状態無条件に走るので `camera.position` は雲の中に据え置き → `target` が高いままlerpが収束せず、ハンガーの機体が白いベールで覆われる。`cloudVeilLevel` はリセット箇所がゼロ(grepで宣言+lerp+読み出しの3箇所のみ)。
  確信度: likely（数値経路は確定、実際に雲内で終わる頻度は要実機確認）
  最小修正案: 33295行のlerpを `const target = gameState === STATE_PLAYING ? clamp(...) : 0;` に変え、併せてミッションリセット(25026行付近の `damageFlash = 0` と同じ場所)で `cloudVeilLevel = 0` を入れる。

[S3軽微] index.html:453 / index.html:479 `#statusPanel .hudVal` の二重定義
  欠陥: 同一詳細度(0,1,1)のセレクタが27行差で重複し、後勝ちで前者の `min-width: 52px` / `text-align: right` が完全に死んでいる。
  発火条件: 常時。453-456行が意図した「値カラムを右揃えで52px確保して桁を揃える」レイアウトは一度も適用されず、479-483行の `min-width:0; text-align:left` が効く。446-451行の `.hudName` に幅62pxがあるので列自体は崩れないが、`10`→`9` のように桁が減ると値が左詰めのまま幅が縮み、MSL/SP.W/FLR の数字が行ごとに揺れる。
  確信度: certain
  最小修正案: 453-456行のブロックを削除するか、意図が右揃えなら479-483行側に `min-width:52px; text-align:right` を統合して1ブロックにする。

[S3軽微] index.html:591 `#radarLabelOld`
  欠陥: 参照先の要素が存在しない死にセレクタ。
  発火条件: 常時（無害）。HTML中の id は `radarLabel`(2323行)のみで、`radarLabelOld` は index.html 全体・src/ 配下ともに定義もJS参照もゼロ。旧レイアウトのリネーム時に取り残された残骸で、隣の 587行 `#radarLabel { display:none }` が実際の非表示を担っている。
  確信度: certain
  最小修正案: 591-598行を削除。ついでに 2323行の `#radarLabel` 要素自体も常時 display:none なので撤去できる。

範囲外: 23819行 `updateWorld(rawDt)` が `STATE_READY` でも無条件に走り、海面UVドリフト・sunRoad追従・雲判定をハンガー表示中も回し続けている（レンダリング先は `hangarView.scene` なので描画には出ないが、毎フレーム分の計算は捨てられている）。


===== CHUNK 2573-4424 (agent a7d4aab16d2e8eb90) =====
`updateBoresight` always re-shows it each frame, so the swap self-heals. Not a bug.

I have completed my analysis of the assigned range.

[S2実害] index.html:3653 AIRCRAFT_TYPES.f2a（およびsu47:4235）
  欠陥: 「ブレーキだけでは絶対に失速しない」というsu37コメント(3866-3870行)が明記する不変条件を、プレイ可能機2機が破っている。判定式は `BRAKE_SPEED - BRAKE_HIGH_G_SPEED_DROP(52) >= stallEntrySpeed`。
  発火条件: F-2A(brake134/entry84 → 82、余裕-2)またはSu-47(brake104/entry64 → 52、余裕-12)で Ctrl押しっぱなし＋ピッチ入力|pitchInput|>0.55。25526行 `brakeTargetSpeed` が失速進入速度を下回り、操作ミス無しに stallTimer が積み上がって失速→STALL_SINK_RATE 44m/s で沈下。Su-47は12m/s下回るので確実に深失速に入る。
  確信度: certain（表全21機を機械照合。他はマージン0以上）
  最小修正案: f2aを `brakeSpeed: 136`、su47を `brakeSpeed: 116` に引き上げる（あるいはBRAKE_HIGH_G_SPEED_DROPを機体別化する）。

[S2実害] index.html:4289 AIRCRAFT_TYPES.su25
  欠陥: `stallEntrySpeed: 60` が `STALL_DEEP_SPEED = 62`(2667行)を下回り、25539行の `lowSpeedRatio` 分母が負になる。
  発火条件: Su-25（rusキャンペーンの購入可能機）で飛ぶと常時。`(60 - playerSpeed) / max(1, 60-62)` の分母が `Math.max(1, -2)` = 1 に潰れるため、本来 (entry-deep) で正規化されるべき低速比が2倍以上の勾配になり、60m/s直下で即座に lowSpeedRatio=1 に飽和。25547行 buildRate が最大値に張り付き、失速の立ち上がりが他機の設計より数倍速い。
  確信度: certain（`Math.max(1, ...)` がクラッシュは防ぐが、正規化契約は破れている）
  最小修正案: su25の `stallEntrySpeed` を 64 以上にする（su37/a10と同値）。または STALL_DEEP_SPEED を機体別化して常に entry より下に置く。

[S2実害] index.html:37939 applyAircraftLoadout（STABILITY_MIN/SPAN の定義は 2657-2658）
  欠陥: `STABILITY_MIN=8.0 / STABILITY_SPAN=4.6` は「spec.rollDamping は 8.2〜12.6 に収まる」というコメント(2655-2656行)を前提にしているが、プレイ可能機6機がその外にあり clamp で潰れて区別が消える。
  発火条件: F-22(13.2)/Su-57(13.2)/Typhoon(12.8) は stability=1.0 に飽和、F-4(7.5)/Su-47(6.8)/Su-25(7.0) は 0.0 に飽和。結果 PITCH_RESPONSE_K・YAW_RESPONSE_K が同値になり、「安定性1数値で3軸すべてが機体ごとに変わる」設計意図(37933-37938行)が上下端の6機で機能しない。特にF-22とTyphoonがピッチ/ヨー応答で完全同一になる。
  確信度: certain（全26エントリを機械照合）
  最小修正案: `STABILITY_MIN = 6.8`、`STABILITY_SPAN = 6.4` に広げて実測レンジ(6.8〜13.2)を覆う。

[S3軽微] index.html:25706 updatePlayer（currentGLoad）
  欠陥: EXPERTモードでは 25654行が `playerBank = 0` を無条件代入するため、G荷重式の `Math.abs(Math.sin(playerBank))` 項が構造的に常にゼロになる。
  発火条件: EXPERTで水平旋回（ロール＋ピッチ）を打つと、同じ操作のNORMALより currentGLoad が最大 1.0 相当低く出る。33055行の風ストリーク/トンネルFX閾値(0.95)と 33065行のGストレイン閾値(1.12)がEXPERTでは高速時にしか越えず、Gエフェクトが体感より薄い。上限は 0.8*turnFactor*speedFactor。
  確信度: likely（EXPERTでも高速では 1.86 まで届くので完全な死にではないが、モード間で同一操作のG表現が非対称）
  最小修正案: EXPERT分岐で `playerBank` を機体ロールから導出する（`Math.atan2` で world-up 基準のバンク角を算出）か、G式のバンク項を EXPERT では `Math.abs(rollInput)` 系に差し替える。

[S3軽微] index.html:22087-22088 window.__game.gunHitTest
  欠陥: 検証プローブが機体別の `profile.range` ではなくモジュール既定定数 `GUN_RANGE`(750) で射程判定している。半径・許容量は `gunAimForgiveness`（profile.range 基準）を正しく使っているので、同一プローブ内で2つの射程が混在する。
  発火条件: A-10(650)/Su-25(675)/MiG-21(700) では実際に撃っても当たらない 700m の目標を `inRange: true / wouldHit: true` と報告し、F-22/MiG-31/Su-57(900) では実弾が届く 800m を `false` と報告する。ハーネスが「銃が当たらない」を誤検出/見逃す。
  確信度: certain
  最小修正案: 両行の `GUN_RANGE` を `playerGun.getProfile().range` に置き換える。

[S3軽微] index.html:33545 BORESIGHT_DISTANCE
  欠陥: ボアサイト描画距離を `GUN_RANGE`(750) 定数で固定しており、機体別の実射程を反映しない。
  発火条件: MiG-31/F-22/Su-57(射程900)やA-10(650)で、ノーズ記号が投影される距離が実際の弾着限界と一致しない。チェイスカメラでは視差があるため、ノーズ方向の表示位置が射程端の実位置から外れる。
  確信度: likely（表示上の誤差であり実弾道は正しい。GUN_RANGEが「代表値」の意図なら仕様内）
  最小修正案: `updateBoresight()` 内で `playerGun.getProfile().range` を読む（const を関数内 let 参照に変更）。

範囲外: index.html:24120 `setControlMode` の EXPERT→NORMAL 復帰で `rollRate = expertRollRate * 0.35` を代入するが `playerBank` は `adoptNormalFlightFrame()` が算出した実バンク角のままなので、25605行のバネ式が既存ロールレートと不整合な初期値から始まり、モード切替直後に一瞬バンクが跳ねる可能性がある（needs-runtime-check）。


===== CHUNK 4425-6910 (agent ad202f91030155b12) =====
Confirmed: hitboxScale is a direct multiplier on a fixed-radius sphere, and the model scale is independent. So a Su-33 drawn at scale 1.08 (vs a Western enemy's ~0.8) wears a hitbox sized for a much smaller aircraft — visible geometry extends outside the hitbox. Let me quantify.


===== CHUNK 6911-9799 (agent aaf7acb4cf6d02aea) =====
Confirmed at line 30000: `spec.mobile ? surfaceTopAt : surfaceHeightAt`. So m-night's 11 static installations on a 92m plateau are all buried 7.36m. Let me check GROUND_TYPES heights to confirm severity.


===== CHUNK 9800-12800 (agent ae7721c1f701e4375) =====
Now let me check `registrySnapshot` for the `subsystems: undefined` case. `keyPaths` iterates `Object.keys(value)` — `subsystems` IS a key with value undefined, so it pushes `subsystems`, then `keyPaths(undefined,...)` returns immediately. So snapshot has `SHIP_TYPES.cargoShip: [..., "subsystems", ...]`. Fine.

Now a critical gate blindspot: **the gate never runs the dev payload loader path**, and more importantly `registry_gate.mjs` `diffLosses` only iterates tables present in `before`. But the more actionable one: `registry_snapshot.json` is written with `--update` which **accepts all losses silently**, printing them as a count. Let me re-read lines 192-196: on `--update` it writes and reports `-${losses.length} losses accepted` but doesn't list them. Combined with `inline_payload.mjs`'s final line instructing "now run `node tools/registry_gate.mjs --update`", a routine splice-then-update workflow will silently bless any truncation that happened in the same edit. That's a real hole in the exact workflow the tools prescribe.

Let me verify the ENEMY_TYPES / AIRCRAFT_TYPES coupling crash more concretely and check `buildEnemyTypes` guard.


===== CHUNK 12801-20570 (agent a6230b2811d017c78) =====
`extraMaterials` textures are handled correctly. Here are my findings.

```
[S2実害] index.html:15675 payloads/aircraft_a100 build()
  欠陥: build() 内で new THREE.CylinderGeometry を2本(rotodome/rotodomeRim)生成するが、ジオメトリを回収する経路がホスト側に存在しない(disposeAircraftMaterials はマテリアルのみdispose、createAircraftModel の戻り値に geometries 相当のフィールドが無い)。撃墜のたびにGPUバッファが残る。
  発火条件: A-100を含むミッションで撃墜→リスポーン/リトライを繰り返す → 1機あたりCylinder×2のVBOが解放されずGPUメモリが単調増加。長時間セッションでフレーム落ち/コンテキストロスト。
  確信度: certain (インラインの機体分岐 36077-37145 は new THREE.*Geometry / extrudedSurface を1件も呼ばず、共有 geometry キャッシュのみ使用。ペイロード機だけが per-instance でジオメトリを作る非対称)
  最小修正案: createAircraftModel が `geometries` 配列と `keepGeometry` を env に渡し、返り値に載せて disposeAircraftMaterials で `geo.dispose()` する。あるいは registeredModel 単位でジオメトリをモジュールスコープにメモ化し、全インスタンスで共有する(後者が本筋 — テーマ非依存の形状なので共有可能)。

[S2実害] index.html:16374 payloads/aircraft_e2d build()
  欠陥: 同じジオメトリ解放漏れが最も重い機体。wingHawkeye / stabHawkeye / finHawkeye / rotodome / domeRim の5本を毎スポーン生成する(担当範囲内で最多)。rotodome/domeRim は16角形×2でExtrudeGeometryなので頂点数も大きい。
  発火条件: E-2Dが複数機出るミッションを撃墜込みで反復 → 1機あたりExtrudeGeometry×5が永久に残留。tu22m3/su24m/su34=3本、a100=4本、s70/f111f=1本も同種。
  確信度: certain
  最小修正案: 上と同一。ジオメトリ共有メモ化なら全8機種が一度に直る。

[S2実害] index.html:16886 payloads/ship_cruiser subsystems vls-fore/vls-aft
  欠陥: VLSサブシステムのロック箱 y=15 と、モデルが実際に描くハッチ面の高さが食い違う。build() は plinth 天面を 13.4+3.0/2=14.9、hatch を y15.4、coaming を y15.2 に置くが、同ファイル16950-16951行の対応コメントは `{ x 0, y 12, z -58 }` と書いており、仕様値(15)ともモデル(15.2-15.4)とも一致しない三者不一致。
  発火条件: 巡洋艦のVLSをNEXTでロック → ロック箱の中心がハッチ面から数m下(甲板 y12.0-12.8 付近)にずれ、当たり判定/HUDマーカーが描かれた格子ではなく甲板の高さを指す。
  確信度: likely (y15 と実描画15.2-15.4 の差は0.2-0.4mで許容内。実害はコメントが主張する y12 を正とみなして後続が修正した場合。ブリーフの「コメントの主張とコードの実態の乖離は最優先バグ候補」に該当)
  最小修正案: 16950-16951行のコメントの `y 12` を `y 15` に直す(仕様値側が正しい)。逆にコメントを正として仕様を12に落とすとロック箱が甲板に沈むので不可。

[S3軽微] index.html:17438 payloads/ship_arsenal build()
  欠陥: コメントが `ciws subsystem { x -15, y 13.4, z 78 } == the PORT tub + drum below` と書くが、17209行の実際の subsystems エントリは `x: -18`。直下17439-17441行の描画も x -18。コメントだけが -15。
  発火条件: 誤動作はしない(仕様と描画は一致)。後続の編集者がコメントを正としてサブシステムを x -15 に「直す」と、ロック箱がタブから3mずれる。
  確信度: certain
  最小修正案: コメントの `x -15` を `x -18` に訂正。

[S3軽微] index.html:18056 payloads/ship_hospitalShip build()
  欠陥: 自作マテリアル white/houseWhite の emissive を持ち上げ `userData.baseEmissive` は更新するが `userData.baseIntensity` は更新しない。またコメント(18054-18055行)が「updateAircraftFlash が既定値へ書き戻して暗くなるので必ず一緒に直す」と主張しているが、updateAircraftFlash(37868行)は `model.standardMaterials` のみを走査し、これらが入る `extraMaterials` は一切見ない。コメントの因果が事実と食い違う。
  発火条件: 病院船が被弾しても white/houseWhite は白フラッシュせず、書き戻しも起きない。つまりコメントが警戒する事象自体が発生しない = 実害なしだが、記述が誤り。同型が19832行(ambulance の white)、19925行(evacBus の cream)にも複製されている。
  確信度: certain
  最小修正案: 3箇所のコメントから updateAircraftFlash の言及を削り「extraMaterials はフラッシュ対象外なので baseEmissive は保険」に書き換える。baseIntensity 未設定は makeAircraftMaterial が既に 0.68 を入れているので実害なし。

範囲外: 37880行 disposeAircraftMaterials / 37455行 createShipModel / 37533行 createGroundModel のいずれも返り値にジオメトリ配列を持たず、ホスト側にジオメトリ解放の口が存在しない(上記S2の真因はここ。ペイロード側だけを直しても根治しない)。
```


===== CHUNK 20571-23864 (agent a457d6c1753a81a69) =====
`launchSpWeapon` guards on `!PLAYER_SPW`. So no crash — but the player is stuck: the missile trigger routes to `launchSpWeapon` which always returns false, and `toggleWeapon()` at 27045 returns early on `!PLAYER_SPW`, so `selectedWeapon` can never get back to `"msl"` until the next `startMission()`. That's a soft-lock of the missile trigger. Real S2 for a debug hook wrecking production state.

I have enough findings. Let me do one final verification on the `guardIntegrity` restart issue by checking `armGuardObjective` runs on restart (via `spawnMissionGround`/`spawnMissionFriendlies` in `startMission`).

Yes — `startMission` calls `resetGuardState()` then `spawnMissionGround(...)` which re-arms, resetting `integrity = 1` with fresh full-HP friendlies. Then `restartFromCheckpoint` restores `lost`/`hits` but recomputes `integrity` from the fresh convoy = 1.0.

[S2実害] index.html:23103 window.__game.debug.forceSpawnAirWave
  欠陥: 盤面クリアループが `enemy.model.group.visible = false` を null ガード無しで叩くが、艦のサブシステム(砲塔マウント)は `model: null`(27885行)で生成される。同型ループの他3箇所(23063 / 23151 / 22518)は全て `if (enemy.model)` で守っている。
  発火条件: 艦を含むミッション(naval波が生きている状態)で `__game.debug.forceSpawnAirWave(["su27"])` を `keep` 無しで呼ぶ → 最初のマウントで `TypeError: Cannot read properties of null (reading 'group')` を送出。ループが途中で止まり、盤面は半分だけ殺された状態で `spawnMissionWave` に到達しない。fpsプローブ/ロスターウォークが全滅する。
  確信度: certain
  最小修正案: 23103行を `if (enemy.model) enemy.model.group.visible = false;` に変える(他3箇所と同形にする)。

[S2実害] index.html:31894-31900 damageEnemy / restartFromCheckpoint
  欠陥: `sortieMarks` がチェックポイントに退避も復元もされていないため、コメントの契約「Counted here rather than at mission end so it survives a sortie that is failed and resumed」に反して、チェックポイント復帰で全消滅する。
  発火条件: 中継局(mark付きユニット)を波1で破壊 → 波2でチェックポイント保存 → 波3で撃墜 → RETRY(restartFromCheckpoint) → `startMission()` の 24989行 `sortieMarks = {}` で消え、`saveCheckpoint`/`restartFromCheckpoint` のどちらも復元しない。クリア時 `entry.marks` が空で記録され(20598行)、他キャンペーンの後続ミッションが `marksTaken()` で 0 を読む=ストーリー分岐が黙って不発。
  確信度: certain
  最小修正案: `saveCheckpoint` に `checkpoint.sortieMarks = { ...sortieMarks };` を追加し、`restartFromCheckpoint` のスコアリング復元ブロックで `sortieMarks = { ...at.sortieMarks };` を戻す。

[S2実害] index.html:25214 restartFromCheckpoint
  欠陥: `guardState.integrity` を「再スポーンして満タンに戻った護衛対象」から再計算するため、チェックポイント前に負ったintegrity損害が完全に免責される。コメント(25206行)の「What survives is the RECORD, so the rank cap still knows」は `lost` にしか当てはまらない。
  発火条件: 空母護衛(readout="integrity", total=1)で空母を被弾させ integrity 0.5 まで削られる → その状態で撃墜されチェックポイント復帰 → `spawnMissionFriendlies` が空母を満HPで再配置 → 25214行が `guardIntegrity()`=1.0 を代入。以後クリアすると `computeMissionRank` の `guardPerfect = lost===0 && guardIntegrity()>0.75`(20519-20520行)が真になり、S制限が外れる。`hits` は復元されるのに整合性判定に一切効かない。
  確信度: certain
  最小修正案: `saveCheckpoint` に `checkpoint.guardIntegrity = guardIntegrity();` を足し、25214行を `guardState.integrity = Math.min(guardIntegrity(), at.guardIntegrity);` にして、ランク判定側も `guardState.integrity` を読むようにする(現状 `computeMissionRank` は生の `guardIntegrity()` を呼ぶので、そこも `guardState.integrity` に寄せる)。

[S2実害] index.html:21894-21900 window.__game.debug.forceFireSpw
  欠陥: `selectedWeapon = "spw"` を生代入し `toggleWeapon()` を経由しないため、(a)前の武器で取ったロックの種別検証(27053-27057行)を丸ごと飛ばし、(b)`PLAYER_SPW` が null の機体でも "spw" に固定してしまう。すぐ隣の `forceSelectWeapon`(21873行)は正しく `toggleWeapon()` を通しており、明確な実装乖離。
  発火条件: SP.Wを持たない機体で `__game.debug.forceFireSpw()` を1回呼ぶ → `selectedWeapon === "spw"` のまま。以後ミサイルトリガーは `fireWeapon`→`launchSpWeapon` に流れ 26003行で常に false、`toggleWeapon()` も 27045行の `!PLAYER_SPW` で即 return するため "msl" に戻せない。次の `startMission()` までミサイルが撃てないソフトロック。/ 別経路: 戦闘機にロック中にこれを呼ぶと LASM が航空機ロックのまま発射され、`toggleWeapon` が防いでいるはずのケースが通る。
  確信度: certain
  最小修正案: `forceFireSpw` の先頭を `if (!PLAYER_SPW) return { fired: 0, reason: "no spw" }; if (selectedWeapon !== "spw") toggleWeapon();` に置き換え、生代入をやめる。

[S2実害] index.html:22770-22774 window.__game.debug.clearMissionRecords
  欠陥: 財布の収入源(`missionRecords[*].scores[0]`)だけを全消去し、支出側の `aircraftPurchases` を残すため、ウォレット残高が恒久的にマイナスになる。
  発火条件: 機体を1機購入(例 20,000CR)→ `__game.debug.clearMissionRecords()` → `walletFor()` = `campaignEarnings`(=0) − `campaignSpending`(=20,000) = −20,000(38050行)。以降どのミッションをクリアしても差額を埋めるまで一切購入不可、ハンガーの残高表示も負値。テストプロファイルのリセットが本番セーブを壊す典型。
  確信度: certain
  最小修正案: `clearMissionRecords` に `aircraftPurchases.clear(); saveAircraftPurchases();` を追加する(記録と購入は同一の経済系なので必ず対にする)。ついでに `sortieDifficulty === "ace"` の場合の `updateDifficultySelector()` 呼び出しも入れると解禁解除と整合する。

[S2実害] index.html:25211 restartFromCheckpoint / 29391 retireFriendly
  欠陥: `guardState.saved` をバンクから復元する一方、`spawnMissionFriendlies` は護衛対象を全機 `retired = false` で再配置するため、同じ機体が二度 `retireFriendly` を通り `saved` が二重加算される。
  発火条件: 輸送機3機の護衛で2機が離脱完了(saved=2)→ その直後に撃墜 → RETRY → 3機とも再配置されて再度離脱 → `saved` = 2+3 = 5。29401行のバナーが `CONVOY CLEAR · 5/3 SAVED` と表示され、`guardProbe().saved` も total を超える。
  確信度: certain
  最小修正案: 25211行の `guardState.saved = at.guardSaved;` を削除する(`lost`/`hits`/`penalty` と違い `saved` は再スポーンした機体が改めて稼ぐ値なので、復元してはいけない)。

[S3軽微] index.html:22688-22697 window.__game.debug.forceSelectMission
  欠陥: `gameState !== STATE_PLAYING` しか見ないため STATE_BRIEFING / STATE_READY 中にも通り、`currentMissionIndex` と(内部の `applyCampaign` 経由で)`selectedAircraftId` を差し替えるのに、開いているブリーフィング画面もハンガーも再描画されない。
  発火条件: ブリーフィング表示中に `forceSelectMission("beachhead")` → 画面は旧ミッションの表題・目標・マップを出したまま。Enter で `advanceBriefing()`→STATE_READY→`startMission()` が新しい `currentMissionIndex` で出撃するので、ブリーフィングと実際に飛ぶミッションが食い違う。`applyCampaign` が `buildHangarUI()` を呼ぶため、キャンペーンを跨いだ場合は選択機体まで黙って変わる。
  確信度: likely
  最小修正案: ガードを `if (gameState !== STATE_MISSION_SELECT && gameState !== STATE_CAMPAIGN_SELECT) return false;` に絞るか、成功時に `missionCursor = index;` と現ステートに応じた再描画(`startBriefing()` / `updateHangarScreen()`)を呼ぶ。

[S3軽微] index.html:21817-21824 window.__game.debug.forceRetireGuarded
  欠陥: 返り値 `retiring` が「exit を持つ機体数」ではなく「生存中の全護衛機数」を返す。ループ内で `if (!friendly.exit) continue;` により exit の無い個体(空母)は実際には何もされないのに数に含まれる。
  発火条件: 空母護衛ミッションで `forceRetireGuarded()` → `{ retiring: 1, saved: 0 }` が返るが、空母は退避しようがないので永遠に retire しない。プローブが `retiring > 0` を「離脱を早送りした」と解釈して待ち合わせに入り、タイムアウトするまで進まない。
  確信度: certain
  最小修正案: `exit` を持つものだけを先に絞る(`const flying = guardedFriendlies().filter((f) => f.alive && !f.retired && f.exit);`)。

範囲外: 32347-32353 `completeMission` で ACCOMPLISHED 保留中に `success=false` が来た場合、`outcomePending` は畳むが `showBigBanner` で上がっている MISSION ACCOMPLISHED バンドを `hideBigBanner()` していないため、直後の MISSION FAILED バンド(32404行)が既存バンドを上書きするだけで、`success` クラスが `showBigBanner` 側でリセットされない限りトーンが混ざる可能性がある(要 `showBigBanner` 実装確認)。


===== CHUNK 23865-25800 (agent a0c136b489dcd7b92) =====
I now have all the confirmations I need.

[S2実害] index.html:23879 clearGamepadInput
  欠陥: パッド切断/未検出のたびに全エッジ状態を毎フレームfalseへ戻すため、再接続直後にボタン押しっぱなしが「新規押下」として1回誤爆する。
  発火条件: STATE_COMPLETEでボタン1(ミサイル/START兼用)を押したままUSBが一瞬瞬断→再列挙 → previousStart=falseに戻っており、次フレームで押されたままのbutton1がstartPressedのエッジと判定されflyAgain()が意図せず走る(camera/modeも同様)。
  確信度: likely
  最小修正案: clearGamepadInputでprevious*系を「その時点の押下状態を保持」または再接続後1フレームだけ入力を捨てるarmingフラグ(menuStickArmedと同じ形)を立て、切断でエッジ履歴を消さない。

[S2実害] index.html:23987 updateGamepadInput
  欠陥: `startPressed`がbutton 9(Start)とbutton 1(Circle/ミサイル)のORなので、飛行中に押していたミサイルボタンを離す前にゲームオーバーへ遷移するとメニュー確定が誤爆する。
  発火条件: STATE_PLAYINGでCircleを押しっぱなしのまま被弾死→setState(STATE_GAMEOVER)。gameStateが変わってもボタンは押されたままだが、`previousStart`はtrueなのでこのフレームは通らない。ただしミサイル連射中に「押す→離す→押す」の離しがGAMEOVER遷移フレームと重なると、遷移直後の再押下がそのままflyAgain()となり、デブリーフを見る前に即リスタートする。エピローグのタイプアウトも読めない。
  確信度: needs-runtime-check
  最小修正案: 状態が非PLAYINGへ遷移した瞬間にstart系のarm解除フラグを立て、一度全ボタンが離れるまでstartPressedのエッジを無視する(遷移時に`gamepadInput.previousStart = true`を強制する)。

[S2実害] index.html:24054 updateGamepadInput (targetホールド)
  欠陥: Triangle(button 3)の長押し解除がパッド切断時にリークし、`cameraFocusActive`が押していないのに立ち続ける経路がある。
  発火条件: 飛行中にTriangleを長押し(targetLong=true, targetFocus=true)したまま`clearGamepadInput()`が走る(パッドが1フレームでもgetGamepads()から消える)→ clearGamepadInputはtargetFocus/targetLongをリセットするが`previousTarget`もfalseにする。次フレームで押しっぱなしのまま復帰すると「新規押下」として再度targetPressedAt=nowが打たれ、ホールド計測が最初からやり直しになる。連続で瞬断すると長押しが永久に成立しない。
  確信度: likely
  最小修正案: 上記S2(23879)と同じarming方式を採用し、再接続後は全ボタンが一旦離れるまでエッジ生成を止める。

[S2実害] index.html:24036 updateGamepadInput (メニュースティック)
  欠陥: メニュー移動用スティック読みだけデッドゾーンを通していない生の`axes[1]`を使っており、ドリフトの大きいパッドではMENU_STICK_FIRE=0.55を超えた瞬間に発火する一方、MENU_STICK_RELEASE=0.3を下回らずarmが戻らず、以後スティックでのメニュー移動が完全に死ぬ。
  発火条件: 静止時の|axes[1]|が0.3〜0.55の間でドリフトするパッド → 一度でも0.55を超えるとmenuStickArmed=falseのまま二度と復帰せず、D-padしか効かなくなる(コメントが謳う「スティックでも動く」契約が破れる)。
  確信度: likely
  最小修正案: `const menuStickY = applyDeadzone(Number(selected.axes?.[1]) || 0);` にして、ドリフトが常に0へ潰れるようにする。

[S2実害] index.html:24583 playMusicSting
  欠陥: `music.desired = null`を書くがgameStateはまだSTATE_PLAYINGでoutcomePending.active=trueなので、次フレームのdesiredMusicSlot()も同じくnullを返して差分なし。しかしSTATE_COMPLETE遷移時にdesired="debrief"へ移ると`music.delayTimer = MUSIC_DEBRIEF_DELAY`が立ち、その間にリトライでSTATE_PLAYINGへ抜けると遅延分岐が先に評価されず問題ないものの、`music.delayTimer`はstartMissionでリセットされない。
  発火条件: MISSION ACCOMPLISHED→デブリーフ表示の0.6秒待ち中にEnter/パッドで即リトライ → startMissionはresetMusicCombatState()しか呼ばず`music.delayTimer`を触らないため、combatへの切替が最大0.6秒遅れる(desiredが変わるので実際にはsetMusicTrackが走り遅延は上書きされるが、`desired`が既にcombatと一致するケース=STATE_PLAYING→STATE_COMPLETE→即STATE_PLAYINGでaceActiveが同値だと`desired !== music.desired`が偽になり、delayTimer>0の分岐に落ちて0.6秒無音が残る)。
  確信度: needs-runtime-check
  最小修正案: startMission()内(resetMusicCombatState付近)で`audioSystem.music.delayTimer = 0;`も併せてゼロクリアする。

[S2実害] index.html:24561 setMusicTrack
  欠陥: 同一スロットのレイヤーを探すループが`fadingOut`かどうかを見ずに最初の一致を採るが、探索順が`layers`の挿入順なので、フェードアウト中の古いレイヤーと復活済みの新レイヤーが両方存在する状態では古い方を掴んで復活させ、新しい方は`layer === next`に該当せず0へ落とされる。結果、同一スロットの2ソースが交互に上げ下げされ得る。
  発火条件: combat→ace→combat→ace…をACE_MUSIC_HOLD_TIME(3.0s)より速く往復させる状況(デバッグ`forceMusic`で高速切替、またはリトライ連打でSTATE_PLAYING/STATE_GAMEOVERを跨ぐ)。retireMusicLayersは`fadingOut && now>=stopAt`でしか回収しないため、復活したレイヤーはfadingOut=falseに戻り永久に残る。同一スロットが二重に鳴って音量が倍になる。
  確信度: likely
  最小修正案: 一致探索を「同一スロットのうちfadingOutでないものを優先し、無ければfadingOut中のものを再利用する」に変え、再利用時は必ず1つだけになるよう他の同一スロットレイヤーは即stopMusicLayer+splice する。

[S3軽微] index.html:24548 retireMusicLayers
  欠陥: 回収条件が`now >= layer.stopAt`のみで、AudioContextがsuspendedになった間はcurrentTimeが進まないため、タブを裏に回してフェードアウトを跨ぐとレイヤーが回収されずに溜まる。
  発火条件: フェードアウト開始直後にタブを非アクティブ化→AudioContext自動suspend→currentTime停止。復帰後に別スロットへ切り替えるたびにレイヤーが1つずつ増え、`syncMusicHook`の`probe.sources`が単調増加する(毎フレーム生成ゼロ契約ではないが、リソースは解放されない)。
  確信度: needs-runtime-check
  最小修正案: `updateMusic`のcontext.state!=="running"時に、fadingOut中のレイヤーを問答無用でstopMusicLayer+spliceして掃除する。

[S2実害] index.html:24413 stopActiveAudioSources
  欠陥: 音楽レイヤーとstingは「activeSourcesに入れない」契約だが、この関数はstopMusicSting()だけ呼び`music.layers`を一切触らないため、ミッション切替時に前のミッションのbedが鳴り続けたままになる経路がある。
  発火条件: STATE_PLAYING中にstartMission()(=リトライ)を呼ぶとclearMissionObjects→stopActiveAudioSources。gameStateはまだPLAYINGなのでdesiredMusicSlot()はcombat/aceのまま、music.desiredも同値 → setMusicTrackが呼ばれずレイヤーは維持される(これは意図通り)。しかしstopMusicSting()がここで走るため、MISSION ACCOMPLISHEDのstingを再生中にリトライすると勝利stingが途中でぶつ切りになり、bedはduck済み(setMusicTrack(null))のままdesired=nullで残り、combatへの復帰は`desired !== music.desired`の判定に依存する。
  確信度: needs-runtime-check
  最小修正案: startMission()内で明示的に`setMusicTrack(desiredMusicSlot(), MUSIC_CROSSFADE_TIME)`相当の再同期、または`music.desired = undefined`にして次フレーム必ず差分が立つようにする。

[S2実害] index.html:25299 finishEpilogue
  欠陥: `window.__game.epilogue`がnullや別オブジェクトに差し替わっている場合を考慮せずプロパティへ書くが、それ以上に`epilogueState.nodes`が`lines`と長さ不一致でも添字アクセスするため、startEpilogueを通らずに呼ばれるとundefined参照でクラッシュする。
  発火条件: startEpilogue()が早期returnした(epilogueなしミッション)後、`lines`は[]なので先頭ガードで抜ける。しかし一度epilogue有りのデブリーフを見た後にstartEpilogueが早期returnするミッションへ行くと、`epilogueState.lines`は[]にリセットされるので安全。実害は`epilogueState.nodes`だけ残る経路がない点で回避されている——ただしEnterでfinishEpilogue→そのままEnterでflyAgain→次のデブリーフでstartEpilogueが早期return時に`window.__game.epilogue`を新オブジェクトへ差し替えるため、外部プローブが保持していた参照が古いまま黙って乖離する。
  確信度: needs-runtime-check
  最小修正案: `window.__game.epilogue`は差し替えず、既存オブジェクトのプロパティを書き換える形(`Object.assign`)に統一する。

[S3軽微] index.html:25311 updateEpilogue
  欠陥: `gapTimer`のデクリメントが余剰分を`charTimer`へ繰り越さないため、フレームレートが低い(dt大)ほど行間が実測でEPILOGUE_LINE_GAPより長くなる。
  発火条件: dt=0.1s級のフレーム落ち中にデブリーフ表示 → 各行の間で最大1フレーム分の余剰が捨てられ、3行で最大0.3秒ずれる。演出のみで実害は小。
  確信度: certain
  最小修正案: `epilogueState.gapTimer -= dt;` の後、`if (gapTimer <= 0) { charTimer -= -gapTimer; gapTimer = 0; }` のように余剰を繰り越す(charTimerと同じwhile方式に揃える)。

[S3軽微] index.html:24852 readHighscore
  欠陥: `Number.parseInt`はNaNのとき`Number.isFinite(NaN)`がfalseなので0を返すが、localStorageに`"1e9"`のような値が入ると1を読む(parseIntが指数を切る)。保存側は`String(highscore)`で常に整数なので自己書き込みでは起きないが、他タブ/手動編集で壊れた値が入ると黙って低いハイスコアになる。
  発火条件: `sortieHighscore`に非整数文字列(旧バージョン由来の`"12345.6"`等)が残っている → 12345として読まれ、以後の比較が食い違う。実害は表示のみ。
  確信度: certain
  最小修正案: `Number(...)`+`Math.floor`で読み、非有限なら0にする。

範囲外: index.html:23798 `updateOutcomePending(rawDt)`はgameState===STATE_PLAYINGガードの内側にあるが、`outcomePending.active`中にupdateMission等が先に走るため、勝利ホールド中も敵AI・被弾判定が生き続ける(コメントの「live skyで読ませる」意図と一致するが、ホールド中に撃墜されるとcompleteMission(false)がoutcomePending.activeを解除せずSTATE_GAMEOVERへ行き、次フレームのupdateOutcomePendingはgameStateガードで止まるものの`outcomePending.active`がtrueのまま残る → 次のstartMissionまでdesiredMusicSlot()に影響しないが状態としては汚染。


===== CHUNK 25801-28106 (agent a2066a145deb7d765) =====
Ground units have `surface: true, ground: true` — but **no `crash` field check**: line 25681-25693 iterates `enemy.surface` (which includes ground units) and reads `enemy.spec.crash.halfLen`. Do all GROUND_TYPES have `crash`? Line 6821 showed one has it. Let me check.


===== CHUNK 28107-29955 (agent a1f50212aa463d762) =====
I have enough. Let me do one final verification on the highest-severity finding — confirm nothing else resets `guardState.lost` after `restartFromCheckpoint` writes it, and that `armGuardObjective` really runs before line 25208.

Order in `restartFromCheckpoint`: `startMission()` (25161) → inside, `resetGuardState()` (25007) → `spawnMissionGround` → `spawnMissionFriendlies` → `armGuardObjective` sets `lost = 0`, `total = 3`. Then back at 25208, `guardState.active` is true → `guardState.lost = at.guardLost` (e.g. 2). All 3 transports respawned alive. Confirmed S1.

Let me also verify `guardState.failed = at.guardFailed` — if the first attempt failed the guard (all 3 lost) then `completeMission(false)` ran, so `checkpoint.guardFailed` is true only if a checkpoint was banked *after* the failure, which can't happen (saveCheckpoint is gated by updateMission returning early on non-PLAYING). So `guardFailed` restores false. Fine.

[S1致命] index.html:25208 restartFromCheckpoint
  欠陥: 護衛対象を全機生存で復活させておきながら guardState.lost だけチェックポイント値に巻き戻すため、destroyFriendly の `remaining = total - lost` が実際の生存数と乖離する。
  発火条件: m-escort(total=3)で輸送機を2機失う→ウェーブ突破でsaveCheckpoint→撃墜されSTATE_GAMEOVER→RETRY。3機とも生存で再開するが lost=2 が復元される。復帰後に最初の1機が落ちた瞬間 lost=3、remaining=0 となり failGuardObjective() が発火、まだ2機健在なのに「CONVOY DESTROYED」で即ミッション失敗。r07(count:1)では復帰直後の1機目喪失で必ず同じ経路。
  確信度: certain（34148-34151のHUDコメントが「チェックポイント復帰で両者は正当に食い違う」と明記し readout 側だけ生存数カウントに回避済み。失敗判定側は未対応）
  最小修正案: destroyFriendly の残数判定を `guardState.total - guardState.lost` ではなく `guardedFriendlies().some((f) => f.alive && !f.retired)` に置き換える（HUDと同じ「盤面にあるもの」基準に統一）。

[S2実害] index.html:29344 destroyFriendly
  欠陥: 最後の1機を失ったときだけ lossPenalty が課金されない。remaining>0 の分岐内にしか減点処理が無く、remaining===0 は failGuardObjective() へ直行して素通りする。
  発火条件: r07(count:1, lossPenalty:2200)でPATROLを失う→減点0。m-escort(3機, 1500)で3機目を失う→2機ぶん3000しか引かれず、guardState.penalty も債務表示も1500ぶん過少。逆に「最後の1機を守り切れなかった」ほど安く済むという符号が反転した挙動になる。
  確信度: certain
  最小修正案: lossPenalty の加算(29346-29349)を remaining 判定より前へ引き上げ、バナー文言だけを remaining で分岐させる。

[S2実害] index.html:25211 restartFromCheckpoint
  欠陥: guardState.saved を復元する一方で全護衛対象が retired=false で再生成されるため、saved が二重計上され CONVOY CLEAR バナーが total を超える。
  発火条件: m-escort で1機目を離脱させた(saved=1)後にチェックポイント→撃墜→RETRY。saved=1 が復元された盤面で3機とも改めて離脱すると saved=4、`CONVOY CLEAR · 4/3 SAVED` と表示される。
  確信度: certain
  最小修正案: 25211 の saved 復元を削除する（lost/penalty と違い saved は「今の盤面で助けた数」であってランク用の記録ではない）。

[S3軽微] index.html:29443 updateFriendlies
  欠陥: retired の friendly を hitFlash 減衰より前に continue で飛ばすため、被弾直後(hitFlash>0)に retire した個体の白熱エミッシブが永久に解除されない。
  発火条件: r14 の RUSALKA が着岸直前(残り430m以内)に敵機の機銃を被弾 → damageFriendly が hitFlash=0.12 をセット → 同フレーム〜次フレームで beachFriendlyShip→retireFriendly。艦は retired でも描画され続ける契約(29202-29204)なので、真っ白に光ったまま砂浜に残り続ける。
  確信度: likely（0.12秒窓なので再現には被弾タイミングが要る。needs-runtime-check寄り）
  最小修正案: `if (friendly.retired) continue;` を hitFlash 減衰ブロックの後ろへ移す。

[S3軽微] index.html:28113 pathPointAt
  欠陥: distance が中間ウェイポイント上ちょうどのとき、`travelled + leg >= distance` が先行レグを t=1 で採用するため、コーナーで進入方向の heading を返す。placeOnRoute は while で後続レグへ進むので進出方向を採る。
  発火条件: unit.pathOffset がレグ長の累積とちょうど一致する mission（例: 直角コーナーの折れ点に車両を配置）→ スポーン1フレーム目の車体が曲がり角の手前向きで置かれ、次フレームに placeOnRoute が別の向きへスナップする。28118-28122のコメントは「placeOnRoute と同じ convention」= 一致すると主張しており、実装がそれと食い違う。
  確信度: likely
  最小修正案: 条件を `travelled + leg > distance || i === path.length - 1` に変える（境界を後続レグ側へ寄せ、placeOnRoute の `<=` 前進と揃える）。

[S3軽微] index.html:29283 damageFriendly
  欠陥: guardState.active を確認せずに guardState.hits / guardState.integrity を書き換える。guard ブロックの無い deployment が vulnerable な友軍を出した場合、armGuardObjective が呼ばれず active=false のまま guardState が汚れる。
  発火条件: payload が `ctx.deployFriendlies("mXX", { transports: { vulnerable: true, ... } })` を guard 無しで登録 → その機が被弾するたび hits が加算され、25134 で checkpoint.guardHits に混入、22242 付近のデバッグフックにも実在しない護衛目標の数値が出る。
  確信度: certain（実害は現行テーブルには無く、payload add-only 設計上の将来の穴）
  最小修正案: 29283-29284 の2行を `if (guardState.active)` の中へ入れる。

[S3軽微] index.html:28036 cameraSurfaceTopAt
  欠陥: 装飾島のブロードフェーズが `dx*dx + dz*dz > surface.r * surface.r` と余裕ゼロで、shape 3(twin peaks) の実フットプリントがこの r をわずかに超える。
  発火条件: shape===3 の島は lobe が `x = ±radius*0.45` にあり lobeR = radius*0.68、CylinderGeometry の底面半径係数 1.18 が乗るので外縁は radius*1.2524。一方 r は shape!==1 のとき radius*1.25。差 0.0024r の帯（半径40mの島で約10cm）でレイキャストがスキップされ、カメラがメッシュの片面ポリゴンを貫通して島の内側が見える。山の側は同じ判定に 1.8r(3.24) の余裕を取っており(28025)、島だけ余裕が無い。
  確信度: needs-runtime-check（帯が細く、カメラがその環に入る必要がある）
  最小修正案: 39992 の r を shape 3 でも 1.35 以上に上げるか、28036 の比較に山と同じ余裕係数を掛ける。

範囲外: index.html:26526 spawnEnemyMissile — 護衛対象が艦でない場合の対艦/対空警告フォールバックが "LIFELINE" をハードコードしており、asmRadio は shipCharge のときしか読まれない。r07 payload(14259)が3つ目の護衛対象 PATROL(哨戒機)を追加したため、PATROL が撃たれると「敵機がLIFELINEにミサイルを撃った！ 輸送機は回避できない」と別コールサインで放送される。26514-26518のコメントが「2つしか無い間だけ成り立つ」と自ら明記した前提が破れている。


===== CHUNK 29956-32858 (agent a7c287e8e3f9c6398) =====
A single-point path (`path.length === 1`) yields `points.length === 1` → `placeOnRoute` reads `route[1]` = undefined → `to.d` throws. Latent (no shipped mission authors a 1-point path), payload-reachable.

Let me verify the ENEMY_MISSILE_PROFILES lookup for ground units at 31698 vs `ENEMY_MISSILE_PROFILES[enemy.type]` re-read — it's read twice but consistent. Fine.

I now have a solid finding set. Let me do a final check on the `enemy.mark` byWingman and one on `spawnMissionGround` ordering vs `friendlyBase`.

At 29959: `if (mission.railLine) spawnRailLine(mission.railLine);` — but `mission.convoyRoad` missions don't get rails. Fine per comment.

One last: line 29980 `if (mission.friendlyBase) spawnFriendlyBase(mission.friendlyBase);` runs **after** `mission.groundUnits`, but the comment at 29978 says "Must precede the first wave" — it does. However `spawnMissionGround` spawns ground units BEFORE `friendlyBase`, and `updateLandingThreat`/`updateStrikeThreat` read `friendlyBase`. Fine.

```
[S2実害] index.html:25189 restartFromCheckpoint
  欠陥: startMission()内のspawnMissionGroundが地上ユニット分を積んだ直後に rankStats.spawnedValue = at.spawnedValue で丸ごと上書きするため、地上TGTの得点母数が永久に消える。
  発火条件: m-glacier(TGT地上4基)等でwave1クリア→チェックポイント保存→撃墜→リトライ。地上4基は生きて再出現するのにspawnedValueにはその分が入らず、再撃破でplayerKillValueだけ二重に増える → computeMissionRankのratio=total/maxが実力以上に膨らみ、B相当の飛行がAで出る(checkpoint.usedのA上限に救われているだけ)。
  確信度: certain
  最小修正案: at.spawnedValue/at.playerKillValue を代入ではなく「startMission後の現在値 + 差分」で扱う。最小には rankStats.spawnedValue = at.spawnedValue + (地上分) にするか、地上ユニットの再spawn前に退避した値を足し戻す。

[S2実害] index.html:25187 restartFromCheckpoint
  欠陥: kills を復元する一方で地上TGTユニットは生き返らせるので、kills と「盤上に残るTGT数」が食い違い、TGT REMAINが0のまま作戦が終わらない状態になる。
  発火条件: m-glacier/m-night/m-convoy等でSAM/レーダー4基を全滅→wave2クリア→チェックポイント保存→wave3で撃墜→リトライ。地上4基が復活するがkillsはそれらを既撃破として保持 → HUDのtgtRemainが 0(cleared表示)なのに updateMission の living が true で作戦が続く。最終的に kills は totalTargets を4超過する。
  確信度: certain
  最小修正案: 25222のループで ground を残す代わりに地上ユニットも消して spawnMissionGround を再実行しない、または復元kills から「再出現させる地上TGT数」を差し引く。

[S2実害] index.html:30336 deployWave
  欠陥: concurrent かつ tgt:true のウェーブに対しても無条件で「ESCORT · NON-TARGET」バナーを出すため、指定目標のエースが非目標だと表示される。
  発火条件: m-squadron(9478 SURTR / 9495 SKOLL)および payload の r18(12194 PROMETHEUS / 12210 ICARUS)。この4エントリは concurrent:true だが tgt:false を持たない指定目標。labelも無いので画面には literally 「ESCORT · NON-TARGET」と出るが、実際はTGT REMAINに数えられ撃墜必須。
  確信度: certain
  最小修正案: 30336を `if (wave.concurrent && !isTgtEntry(wave))` に変え、concurrent かつTGTの場合は `${wave.label || acePilot?.callsign || "CONTACT"} · TARGET` 側へ落とす。

[S2実害] index.html:32284 updateMission
  欠陥: concurrentエントリを読み飛ばすループに「TGTなら止まる」条件が無く、missionWaveIndex が waves.length を超えると spawnMissionWave(undefined) → deployWave(undefined) → waveSizeOf(undefined) で TypeError。
  発火条件: tgtRemaining の根拠が「concurrentなTGTエントリ」だけになる並び(例: 非concurrentのTGTを全て消化した後に delay付きconcurrent-TGT が残る sequence)。ctx.addMission で入るpayloadミッションが `{tgt省略, concurrent:true, delay:N}` を書けば即座に成立し、ウェーブクリア直後のフレームで例外がupdateMission→animateを止める。
  確信度: likely
  最小修正案: 32284のwhile条件に `&& !isTgtEntry(mission.waves[missionWaveIndex])` を足し、直後に `if (missionWaveIndex >= mission.waves.length) return;` を置く。

[S2実害] index.html:32016 damageEnemy
  欠陥: startAceKillCam が発動条件の重複チェックなしで呼ばれ、既走行中のキルカムのタイマーと焦点を無条件に上書きするため、複数撃破が重なるとスローモが延々と延長される。
  発火条件: 艦隊ウェーブで空母を撃沈(32016)した1.6秒以内にエースを撃墜(32028)、または detonateGroundChain(32041)の誘爆連鎖の各犠牲者が個別に条件を満たす場合。killCam.timer が毎回 KILLCAM_DURATION に戻り、focusPoint も新しい死体へ飛ぶので、カメラが跳ねながらスローモが継続する。
  確信度: certain
  最小修正案: startAceKillCam の先頭に `if (killCam.active) return;`(または残りtimerが新規より長ければ据え置き)を入れる。

[S3軽微] index.html:32016 damageEnemy
  欠陥: byWingman の契約(「プレイヤーのスコアカードとそれを読み返すフィードバックは全て飛ばす」)に反し、キルカム起動・sortieMarks加算・bomberFirstKillFired・aceDestroyed が byWingman ガードの外にある。
  発火条件: 僚機のガンキルで STRIKE_AIR_TYPES の機体が落ちると bomber-first-down 無線がプレイヤーの撃墜として流れる(wingmanPreyForは surface/isAce/TGT を除外するので艦・エースは現状到達不能、STRIKE_AIR_TYPESの非TGT機は到達する)。
  確信度: likely
  最小修正案: 32016/32017/32026/31900 のブロックを既存の `if (!byWingman)` 側へ移す。

[S3軽微] index.html:31958 damageEnemy
  欠陥: 親艦の撃沈時に生存マウントを `deadTimer = 0` で落とすため、updateEnemies が次フレームで即 splice する。SUBSYSTEM_WRECK_TIME の残骸演出が一切再生されず、しかも1フレームだけ updateSubsystemWreck が走って煙パーティクルを1回吐く。
  発火条件: CIWS/AA/VLSを残したままイージス艦を撃沈する。マウントは爆発も残骸も無く消え、艦だけが11秒沈む。
  確信度: certain
  最小修正案: 31962を `sub.deadTimer = SUBSYSTEM_WRECK_TIME;` にする(艦の沈降と同時に残骸が焼ける)。または smokeTimer も 0 に初期化して意図通り即消しなら updateSubsystemWreck 呼び出しの前に弾く。

[S3軽微] index.html:30098 placeOnRoute
  欠陥: route が1点しか無い場合 `route[enemy.routeIndex + 1]` が undefined になり `to.d` で TypeError。長さ検査が無い。
  発火条件: ミッションの convoyRoad/railLine が1点だけ、あるいは全waypointが同一座標で groundRoute の push が1件しか積まれないとき。spawnGroundUnit の 30085 で spawn 直後に throw し、spawnMissionGround ごと落ちて sortie が起動しない(コメント30051が語る「m-glacier等が起動不能だった」のと同じ壊れ方)。payload の addMission 経由で到達可能。
  確信度: likely
  最小修正案: placeOnRoute 冒頭に `if (!route || route.length < 2) return;` を追加。

[S3軽微] index.html:30246 spawnMissionWave
  欠陥: 遅延concurrentエントリを pendingWaves に積むとき、そのエントリが指定目標(TGT)でも waveTargetsSpawned に加算されない一方、deployWave 側では発火時に加算されるため、両者の意味がタイミングで揺れる。
  発火条件: TGTかつ delay>0 の concurrent エントリ。dev hook forceNavalWave の `kills = waveTargetsSpawned`(23065)が、まだ湧いていない遅延TGTを勘定に入れないまま kills を書き換えるので、その後遅延分が湧くと ACCOMPLISHED が届かなくなる。現行キャンペーンには該当エントリが無く潜在。
  確信度: needs-runtime-check
  最小修正案: 30246 で pendingWaves に積む時点でも `if (isTgtEntry(next)) waveTargetsSpawned += waveSizeOf(next);` を行い、deployWave 側では pending 由来を二重加算しない印を持たせる。

範囲外: index.html:23065 forceNavalWave が `kills = waveTargetsSpawned` を書くが、waveTargetsSpawned は mission.groundUnits のTGTを一切数えないため、地上TGTを持つミッションでこのフックを叩くと kills が totalTargets に永久に届かない。
範囲外: index.html:9695 normalizeMission の totalTargets は「遅延concurrentで結局湧かなかったウェーブ」を含めないが、含める条件(tgt省略のconcurrent+delay)が payload 経由で成立すると totalTargets が到達不能値になる。
```


===== CHUNK 32859-35880 (agent a6991bef736b8fe04) =====
Confirmed. `wave.radio` lines flow through `triggerRadioLine`, which skips nickname substitution entirely.

I have enough. Final report.

[S1致命] index.html:33144 updateBattleArea
  欠陥: 方位を `Math.atan2(dx, dz)` で計算しており、ファイル全体の規約 `atan2(x, -z)`(北=-Z)に対しZ成分の符号が反転している。
  発火条件: 戦域中心の真北(-Z側)に離脱 → レーダー帰投シェブロンが機首方向(0°)を指す。正しくは真後ろ(180°)。真南でも同様に反転。東西成分だけは偶然一致するため見逃されてきた。唯一の消費者は34844のシェブロン描画なので、警告中のプレイヤーは常に逆方向へ誘導され、BATTLE_FAIL_TIMEで撃墜扱いになる。
  確信度: certain
  最小修正案: `battleArea.bearing = Math.atan2(dx, -dz);` に変更する(34842のコメント「centre -> player」と34844の反転処理はそのままで整合する)。

[S2実害] index.html:30297,30340 spawnMissionWave / index.html:31934 (radio.js:291 say の迂回)
  欠陥: `wave.radio` とシップ撃沈通知が `radioSay` ではなく `triggerRadioLine` を呼ぶため、`{nickname}` 置換(radio.js の `say()` のみが行う)が走らない。
  発火条件: 9510/9525/9584 の wave.radio 行、および 31937 の空母撃沈行が発火 → HUD無線に生の `{nickname}` が literal 表示される(例:「本体を先に切れ、{nickname}！」)。空母撃沈は艦隊ミッションで確実に通る経路。
  確信度: certain
  最小修正案: これら4箇所を `radioSay(...)` に差し替える。あるいは置換を `triggerLine` 側へ移し `say()` を薄いエイリアスにする。

[S2実害] index.html:34106 updateHud
  欠陥: 方位表示が `String(Math.round(headingDeg)).padStart(3,"0")` で、359.5°以上のとき "360" になる。3桁計器は 000-359 が値域。
  発火条件: 機首が北をわずかに西回りで通過(headingDeg ∈ [359.5, 360)) → HEADING が一瞬 "360" を表示し、次フレームで "000" に飛ぶ。低速旋回では複数フレーム保持される。
  確信度: certain
  最小修正案: `String(Math.round(headingDeg) % 360).padStart(3,"0")`。

[S2実害] index.html:34120 updateTape
  欠陥: `const visible = rowValue >= 0;` を算出しているのにラベル抑止(34121)にしか使わず、行自体を隠していない。負値行のティックマーク(.tapeRow::before)はそのまま描画される。
  発火条件: 高度 < 400m または速度 < 400km/h(常時、離着陸・低空侵攻の全域) → 高度テープの下半分に -100/-200/-300/-400 に相当する裸ティックが4本並び、目盛が地面より下へ続いているように読める。ゼロ端が読めない。
  確信度: certain
  最小修正案: `row.classList.toggle("hidden", !visible)` を追加し、CSSに `.tapeRow.hidden { display: none; }` を足す(.pitchMark.hidden と同型)。

[S2実害] index.html:34957 createTracer(+34982 createMuzzleFlash)
  欠陥: トレーサー1発ごとに BufferGeometry + LineBasicMaterial + Line を new して scene に追加し、0.12-0.18秒後に dispose する。「毎フレーム生成ゼロ」のプール契約(34038-34040で明示)から唯一外れた常時発火経路。
  発火条件: 艦隊戦で複数CIWS/AAが射程内 → 31553の `ciws.tracers` ループ×マウント数×バースト間隔で毎秒数十回の VBO 確保/破棄とマテリアル生成が走り、GCスパイクとシェーダプログラム参照のチャーンでフレーム落ちする。
  確信度: likely
  最小修正案: 固定長のLineSegmentsプール(1本のBufferGeometryに全トレーサーの端点を書き込む)へ移行し、`createTracer` はスロット確保と端点書き込みだけにする。muzzleFlashも共有マテリアル+プール化する。

[S3軽微] src/ui/radio.js:195-219 triggerLine
  欠陥: キュー満杯時の最下位追い出し(201行 splice)を、アクティブ行プリエンプト判定(215行)より先に実行している。プリエンプトする要求はキューに入らないのに、キューの1件が無駄に破棄される。
  発火条件: キューが RADIO_QUEUE_MAX=4 で埋まっている状態で CRITICAL が到着(例: guard-failed が撃墜警告4件の後ろに来る) → 新行は即時再生されるが、待機中の最下位NORMAL/URGENTが理由なく消える。キューに空きがあれば残っていたはずの行。
  確信度: certain
  最小修正案: プリエンプト判定(215-219)をキュー満杯処理(195-202)より前に移動する。

[S3軽微] index.html:32988-32993 updateCamera
  欠陥: ブースト時のカメラ揺れを `keepCameraAboveSurface()`(32960)より後に加算しているため、地表クリアランスのクランプを事後に破る。
  発火条件: 低空(CAMERA_SURFACE_CLEARANCE 付近)でブースト保持 → カメラY座標が最大 0.21m 地形面より下に沈み、山肌/艦体のポリゴン内側が1フレーム見える。cameraShake側(32897-32899)は desiredPosition に対する加算なのでクランプ前で正しく、ブースト側だけが順序を外している。
  確信度: likely
  最小修正案: ブーストジッタのブロックを 32960 の `keepCameraAboveSurface()` の直前へ移すか、ジッタ加算直後にもう一度 `keepCameraAboveSurface()` を呼ぶ。

範囲外: index.html:34263 syncGameHook が毎フレーム無条件に enemies/friendlies/enemyMissiles を `.map()` して数十〜数百のオブジェクトを新規生成している(テストフック専用なのに本番ループで常時実行)。


===== CHUNK 35884-39021 (agent a953bc45364eff2dc) =====
No payload *aircraft* builder calls it yet (18050/19617 etc. are ship/ground payloads which do have extraMaterials). So the aircraft `extraMaterials` gap is latent, and geometry is the live one. I'll report geometry as the primary finding and fold the extraMaterials asymmetry in as a related note.

Let me do one last check on `updateAircraftFlash` being called with a heli's `dish`/`rotors`... no. And check `updateGroundUnit` reading `model.dish` when the model came from `createHeliModel` — helis are separate. Fine.

I'm ready to report.

```
[S2実害] index.html:37880 disposeAircraftMaterials
  欠陥: マテリアルしか破棄せず、ペイロード機体が build() 内で新規生成した ExtrudeGeometry を一切破棄しないため、モデル生成/破棄のたびに GPU バッファが永久リークする。
  発火条件: AIRCRAFT_MODELS 登録機（tu22m3 / su24m / su34 / a100 / s70 / f111f / e2d / yf23）が敵として湧く → 撃墜 → 25227/30507/34920 の dispose 経路。yf23 の build は wingYf23・vtailYf23・forebodyYf23 の3本を毎インスタンス new する（16669/16694/16718）。1機ごとに 2〜6 個の BufferGeometry が解放されずに積み上がり、長時間プレイでVRAMが単調増加する。インライン機体は共有プール(geometry.*)なので無傷、ペイロード機体だけが漏れる。
  確信度: certain（リーク自体）／ needs-runtime-check（現行ミッションにこの8機を出すwaveがまだ無いため、実害は次の出撃テーブル追加時か ?modelPreview= 時）
  最小修正案: createAircraftModel の返り値に `ownedGeometries: []` を足し、build env に push 用の配列（または extrudedSurface のラッパ）を渡して、disposeAircraftMaterials で `for (const g of model.ownedGeometries || []) g.dispose()` を回す。

[S2実害] index.html:37922 applyAircraftLoadout
  欠陥: `SPW_TYPES[spec.spw.key]` / `spec.spw.capacity` を無防備に読むため、spw を持たない機体を渡すと TypeError で関数の途中で死ぬ。
  発火条件: `window.__game.forceLoadout("bomber")`（21931は `AIRCRAFT_TYPES[id]` の存在しか見ない）。bomber/uav/transport と全ペイロード敵機は 4080/3996 のコメント通り spw を持たない → 37922 で throw。すでに CRUISE_SPEED〜PLAYER_MAX_HEALTH までは書き換わった後なので、飛行モデルだけ爆撃機に化けた半端な状態で残り、以後の startMission が壊れた定数で走る。
  確信度: certain
  最小修正案: 37922-37923 を `const spwSpec = SPW_TYPES[spec.spw && spec.spw.key] || null; PLAYER_SPW = spwSpec; PLAYER_SPW_CAPACITY = spwSpec ? spec.spw.capacity : 0;` に（38163・38253 の既存ガードと同じ書き方）。

[S3軽微] index.html:4343 readAircraftPurchases
  欠陥: コメントは「hangar order で濾す」と書いてあるのに実装は `AIRCRAFT_TYPES[id]`（敵専用機を含む全テーブル）で濾しており、AIRCRAFT_ORDER 外の id が購入リストに残る。
  発火条件: localStorage の sortieHangarPurchases に "bomber"/"transport"/"yf23" 等が入っている（旧ビルド残骸・手編集）→ フィルタを通過 → aircraftCampaignId("bomber") はどのロスターにも無いので selectedCampaignId を返す（37999のフォールバック）→ campaignSpending がアクティブ側の財布から引く。aircraftPower は aircraftSpecBarCache に無いので 0 → 価格 = PRICE_CAP*0.10 ≒ 4,200CR。しかも campaign を切り替えると同じ幽霊機の請求が反対側の財布へ移る（両方の財布が同時に減るわけではないが、どちらの財布でも減る）。
  確信度: certain（コメントとコードの乖離・二重帰属ロジック）／ needs-runtime-check（到達は汚染された localStorage 前提）
  最小修正案: `raw.filter((id) => AIRCRAFT_ORDER.includes(id))` に変える（AIRCRAFT_ORDER は 3295、この関数より前に宣言済み）。

[S3軽微] index.html:38575 applyCampaign
  欠陥: buildHangarUI()（→updateHangarScreen）を currentMissionIndex の更新より前に呼ぶため、ハンガーのミッションタグが直前のキャンペーンのミッションを指した状態で描かれる。
  発火条件: キャンペーン切替（38571-38583）。38575 時点の currentMissionIndex はまだ旧キャンペーンの global index なので、38259 の `missionNumberLabel(currentMissionIndex)` は campaignSlotOf が -1 を返してグローバル添字にフォールバックし、タイトルも他陣営のミッション名になる。STATE_READY 遷移時に 25409 の updateHangarScreen が上書きするので画面に出る前に自己修復するが、その間に window.__game 等がタグを読むとズレたまま。
  確信度: likely
  最小修正案: applyCampaign 内の buildHangarUI() 呼び出しを currentMissionIndex/missionCursor の代入（38581-38582）より後ろに移す。

[S3軽微] index.html:38676 moveMissionCursor
  欠陥: `slot < 0 ? 0 : slot + delta` により、カーソルが現キャンペーン外のミッションを指しているとき delta の符号が無視され、左右どちらを押しても slot 0 に飛ぶ。
  発火条件: デバッグフックで他陣営のミッションを選択した直後（campaignSlotOf が -1）に ← を押す → 期待は末尾へラップだが 01 へ。cycleAircraft(38098) は同じ状況を `delta > 0 ? -1 : 0` で正しく扱っているので、片方だけ規約が揃っていない。
  確信度: certain
  最小修正案: 38676 を `const from = slot < 0 ? (delta > 0 ? -1 : 0) : slot; const next = ((from + delta) % count + count) % count;` に（cycleAircraft と同じ形）。

[S3軽微] index.html:36047 createAircraftModel（ペイロード分岐）
  欠陥: createShipModel(37241) / createGroundModel(37509) が build env に渡している `extraMaterials` が createAircraftModel の env には存在せず、返り値にも無いため、ペイロード機体が自前のマテリアルを作った場合に登録先が一つも無い。
  発火条件: ペイロード機体の build が env の makeAircraftMaterial（36056で渡している）で独自マテリアルを作る → disposeAircraftMaterials は standardMaterials（36072固定8本）と flameMaterial しか見ないので破棄されない。36042-36044 のコメントは「それが必要なフィールドを漏れなく持って下流に届く。書かないから忘れようがない」と主張しているが、船/地上と違ってこの穴だけ塞がれていない。現行8機はまだ makeAircraftMaterial を呼んでいないので潜在。
  確信度: certain（非対称性）／ needs-runtime-check（現時点で呼ぶペイロードは無い）
  最小修正案: createAircraftModel にも `const extraMaterials = [];` を作って build env と両方の return（36067-36074 / 37137-37144）に載せる。disposeAircraftMaterials は 37883 で既に extraMaterials を読むので改修不要。
```

範囲外: index.html:8218 付近の m-boats wave と 9629 の `{ kind: "naval", band: 3, label: "FLEET" }` は fleet 未指定で normalizeWaveEntry の既定艦隊(carrier/aegis×2/frigate×2)に落ちるため、ラベル "FLEET" が実艦隊と一致しているかは要確認（担当外のミッションテーブル側）。


===== CHUNK 39022-40927 (agent a3755c4d07b826d05) =====
Now let me check the shore ring squash bug: `shallow.scale.set(shallowR, 1, shallowR * anchor.squash)` but for shape 1, the bar's Z scale is `radius*squash*1.15`.

Let me also verify `estimateWorldTextureBytes` mipmaps default for skyTexture and check the terrain normal texture repeat shared with island materials.
