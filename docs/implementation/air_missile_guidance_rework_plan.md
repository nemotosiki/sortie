# 空対空ミサイル誘導再設計 — 実装計画

**作成日:** 2026-08-13
**対象ブランチ:** `chatgpt/sera-act1-implementation`
**基準HEAD:** `88b74dd` (`feat: refine missile guidance and combat targeting`)
**状態:** 調査・計画のみ。本文作成時点では誘導コードの実装、テスト変更、commit、pushを行わない。

## 1. 目的

空対空ミサイルの誘導を、毎frameの予測迎撃点へ直接機首を向ける方式から、誘導則と機体応答を分離した滑らかな方式へ変更する。

目指す挙動:

- ミサイルは発射母機の姿勢と速度方向を連続的に受け継ぐ。
- 発射直後から横へ最短距離で切り込まず、最初は母機の飛行方向を保つ。
- 目標とのLOS（line of sight）回転を徐々に打ち消し、自然な曲率で迎撃コースへ収束する。
- 一定速度の単純旋回には高い確率で命中する。
- 命中直前に旋回と加減速を適切に組み合わせると、有限の誘導・操舵応答を利用して回避できる。
- 回避成否に乱数、強制無敵、恣意的な当たり判定縮小を使わない。
- 通常ミサイルは1航程、QAAMだけが一度再捕捉して最大2航程を持つ。

## 2. ユーザー図の解釈

- 黒い矢印は戦闘機の軌道と進行方向。
- 赤い矢印は発射されたミサイルの軌道と進行方向。
- 問題の左図は、ミサイルが発射直後から未来迎撃点へ直接向きを変え、母機の接線方向を捨てて横へ切り込む軌道。
- 目標の右図は、発射時の進行方向をまず保ち、横加速度が立ち上がるにつれて滑らかに迎撃コースへ入る軌道。

「先回りをしない」のではない。迎撃に必要な先回りは残しつつ、誘導命令が瞬時に実現されない機体応答を導入する。

## 3. 現状と履歴

### 関連履歴

- `9c71f0c` — ミサイル誘導を`src/combat/missile-guidance.js`へ分離。
- `dfa6ab8` — 旋回上限到達ではなく、実オーバーシュートで追尾終了する方式へ変更。
- `54d5cb1` — 艦船戦闘とミサイルバランスを整理。
- `88b74dd` — ミサイル誘導、ロック、戦闘ターゲットを追加調整。

### 現在の作業ツリーで進行中の前提

HEAD後の未コミット作業として以下が存在する。実装時は削除せず、現在の作業ツリーを基準に差分を積む。

- 発射母機速度をミサイル初速として継承。
- 最高速度へ`180 m/s^2`で単調加速し、最高速度`556 m/s`で止まる推進モデル。
- 目標の現在速度から定速迎撃時刻を毎誘導sliceで再計算する予測誘導。
- 移動するミサイルと移動する目標のrelative swept collision。
- 全誘導弾の絶対旋回上限`75 deg/s`。
- 通常ミサイルと全敵SAMは1航程、プレイヤーQAAMのみ最大2航程。

### 現行アルゴリズムの問題

`predictiveAimFor()`は、現在の目標位置と速度から未来迎撃点を算出し、その点への単位方向ベクトルを返す。呼び出し側は`Quaternion.rotateTowards()`で、その方向へ許容角度分だけミサイル本体を直接回す。

この構造には次の問題がある。

1. 誘導則、オートパイロット、アクチュエータ、機体応答が一つの角度変更へ潰されている。
2. 発射直後でも最大旋回速度を即座に使用でき、横加速度の立ち上がり時間がない。
3. 迎撃点がframeごとに変わると、旋回命令も瞬時に正負反転できる。
4. ミサイル速度が上がっても、角速度上限だけなら必要横加速度が過大になる。
5. 目標加減速を次のsliceで完全に取り込み、加減速による回避窓を消している。
6. プレイヤー弾、対プレイヤー敵弾、対護衛対象敵弾で予測誘導の呼び出し経路が分かれている。

## 4. 調査結果

### 4.1 比例航法（PN）

比例航法は「未来位置へ機首を直接向ける」方式ではなく、ミサイルから目標へのLOS回転率をゼロへ近づけるよう、LOS回転率と接近速度に比例した法線加速度を命令する。

基本形:

```text
LOS angular rate = cross(relativePosition, relativeVelocity) / range^2
closingSpeed      = max(0, -dot(relativePosition, relativeVelocity) / range)
commandedAccel    = N * closingSpeed * cross(LOS angular rate, missileForward)
```

- 初期航法定数は`N = 3`。
- 加速度命令はミサイル進行方向に垂直な成分だけを使う。
- 推進加速度は従来の長手方向加速として別計算する。
- PNは一定方位の衝突コースへ収束させるため、毎frame「最短の点」へ機首を直結する必要がない。

[JHU/APLのBasic Principles of Homing Guidance](https://secwww.jhuapl.edu/techdigest/Content/techdigest/pdf/V29-N01/29-01-Palumbo_Principles_Rev2018.pdf)は、PNをLOS rateとclosing velocityに基づく法線加速度命令として説明し、航法定数3を基本例として扱っている。また、初期heading errorを終末誘導開始時の外乱として明示している。

### 4.2 誘導則と機体応答は別物

実ミサイルでは、誘導則が加速度命令を出し、オートパイロット、アクチュエータ、機体が有限時間でその命令へ追従する。命令方向へQuaternionを直接回すわけではない。

[JHU/APLのOverview of Missile Flight Control Systems](https://secwww.jhuapl.edu/techdigest/content/techdigest/pdf/V29-N01/29-01-Jackson.pdf)では、LOS推定、guidance law、autopilot、actuator、airframe dynamicsを分離している。同資料の設計例では、加速度命令に対するオートパイロット時定数は約`0.18秒`で、瞬時応答ではない。

本ゲームでは完全な6DOF空力モデルを作らず、3DOF point-massモデルに次を追加する。

- PNが作る法線加速度命令。
- その命令へ追従する一次遅れのオートパイロット状態。
- 50Gと75deg/sの二重上限。
- 発射直後のguidance authority ramp。

[JHU/APLの6DOF simulation解説](https://secwww.jhuapl.edu/techdigest/Content/techdigest/pdf/V29-N01/29-01-Hawley.pdf)も、空力詳細が不明な一般性能モデルではautopilotとPNを組み合わせた3DOFモデルが使用されるとしている。

### 4.3 発射直後の軌道

発射時には既存どおり母機の姿勢と速度を受け継ぐ。そのうえで、誘導横加速度を0から全権限へ滑らかに立ち上げる。

初期候補:

```text
GUIDANCE_RAMP_START = 0.04 s
GUIDANCE_RAMP_END   = 0.24 s
AUTOPILOT_TAU       = 0.18 s
```

- `0〜0.04秒`: 発射方向を維持し、分離直後の不自然な折れを防ぐ。
- `0.04〜0.24秒`: smoothstepで誘導権限を0から1へ上げる。
- `0.24秒以降`: PNの全命令を使えるが、オートパイロット時定数とG上限は残る。

この値は最終仕様ではなく、軌道比較用の初期値である。

### 4.4 純粋追尾と完全予測を採用しない理由

純粋追尾は常に目標現在位置へ向くため、後方へ回り込みやすく、長いtail chaseと終末の大旋回を生みやすい。完全予測迎撃は効率的だが、現在実装のように角度命令へ直結すると左図の横切り込みになる。

採用案はその中間ではなく、LOS回転率を使うPNを主誘導とし、初期heading errorを解消できない場合だけ限定的なcapture補助を追加する。

[NASA NTRSのPaths of Target Seeking Missiles in Two Dimensions](https://ntrs.nasa.gov/citations/20090033671)は、normal pursuit、constant、proportional、line-of-sight navigationの軌道を比較し、target seekerを持つミサイルにはproportional navigationが最も適すると結論している。

### 4.5 初期heading error

PNは、発射時点で既に概ね衝突コースへ乗っているほど自然に働く。大きなoff-boresight lockでは、母機方向を保つだけだとPNが初期誤差を処理し切れない場合がある。

その場合も、完全予測方向へ直接回さない。次の順で対処する。

1. まずPNのみでロック可能範囲全体をシミュレーションする。
2. 不足する場合だけ、LOS off-boresightに比例する小さなcapture加速度を追加する。
3. capture成分は発射後`0.6〜1.0秒`でゼロへ減衰させる。
4. PN成分と合算後に50G/75deg/s上限を適用する。
5. capture補助が左図の横切り込みを再発させる場合は不採用にする。

## 5. 採用候補アルゴリズム

### 5.1 状態

空対空誘導弾ごとに最低限、次を保持する。

```text
guidanceAge                 発射後の誘導経過時間
achievedLateralAcceleration オートパイロット追従後の法線加速度Vector3
guidanceTargetKey           状態が属する目標
previousGuidanceTargetKey   目標変更検出用
```

QAAM再捕捉、フレア、目標変更時にはオートパイロット状態を安全に再初期化する。新しい目標へ前の横加速度命令を持ち越さない。

### 5.2 1 sliceの処理順

1. substep時点の目標位置と速度を復元する。
2. ミサイルforwardと現在速度ベクトルを求める。
3. relative position、relative velocity、LOS angular rate、closing speedを求める。
4. `N=3`のPN法線加速度命令を作る。
5. 必要な場合だけ、上限付きcapture補助を加える。
6. launch guidance rampを掛ける。
7. 50Gで加速度命令を制限する。
8. 一次遅れ`tau=0.18秒`でachieved accelerationを更新する。
9. achieved accelerationを現在forwardへ直交投影する。
10. `turnRate = |aNormal| / speed`へ変換し、さらに`75 deg/s`で制限する。
11. そのslice分だけQuaternion/forwardを回す。
12. 推進加速度`180 m/s^2`を長手方向へ適用する。
13. relative swept collision、近接信管、地形、CIWS、寿命を従来どおり評価する。

### 5.3 数値安全性

- range、speed、closing speedがほぼ0のときはPN命令を0にする。
- 離隔が開いているときに負のclosing speedで逆向き加速度を作らない。
- NaN/InfinityをQuaternionへ渡さない。
- world-space achieved accelerationは毎slice、現在forwardへ再投影する。
- terminal substepで同じframeの目標移動を重複適用しない。
- 30/60/120fpsで同じ時間積分形を使う。

## 6. 加減速回避との関係

望むゲーム性は「ミサイル全体を低性能にする」ことではなく、「一定運動は読めるが、終末で旋回半径とLOS rateを変えると有限応答が遅れる」ことで作る。

段階方針:

1. PN + 50G + 0.18秒autopilotだけで再シミュレーションする。
2. 一定旋回命中率と加減速回避可能条件を測る。
3. 自然なPNだけで十分なら、固定迎撃点コミットは実装しない。
4. 回避窓が不足する場合だけ、以前の`time-to-go = 0.44秒`終末コミットを比較候補にする。
5. 終末コミットを採用する場合もhard switchではなく、PN命令から固定迎撃点命令へ短時間で滑らかに遷移できるか比較する。
6. 固定点通過後に古い点へUターンさせず、慣性飛行と既存オーバーシュート判定へ渡す。

終末コミットは現時点の確定仕様ではない。自然な軌道よりゲーム上の回避窓を優先する必要がある場合の第2段階候補とする。

## 7. 適用範囲

適用する:

- プレイヤー通常ミサイル → 敵航空機。
- QAAM、4AAM、6AAM、8AAM、XLAA等 → 敵航空機。
- 敵戦闘機、地上SAM、艦船SAM → プレイヤー。
- 敵ミサイル → 航空護衛対象。

適用しない:

- LASM、4AGM、対地/対艦ミサイルのloft、sea-skimming、terrain clearanceには、空対空PNそのものを適用しない。これらは専用の発射・巡航・終末フェーズを持つ。
- 爆弾、機銃、CIWS。
- ロック時間、発射後ロック保持、複数同時ロック数。
- ミサイル寿命、ダメージ、弾数、リロード時間。
- プレイヤー機のcorner-speed、失速、ブレーキ、加速性能。

地上SAMや艦船SAMでも、追跡対象が航空機なら、発射フェーズ終了後は新しい空対空PNを使う。homing lawは追跡対象の種類で決めるが、発射フェーズだけは発射母体と発射姿勢で決める。正面を向いた地上SAM/ミサイル艇と、90度off-boresightの艦艇VLSを同じ初期状態として扱わない。

## 8. 共通化方針

現状の予測誘導は三経路に存在する。

1. `missileGuidance.step()` — プレイヤー通常ミサイル/空対空SP.W。
2. `updateEnemyMissiles()` — 敵ミサイル→プレイヤー/フレア。
3. `updateEnemyMissiles()` — 敵ミサイル→航空護衛対象。

`src/combat/missile-guidance.js`へ次を集約する。

```js
computeLosRate(...)
computePnAcceleration(...)
updateMissileAutopilot(...)
effectiveAirTurnRate(...)
resetAirGuidanceState(...)
airGuidanceStep(...)
```

実際の命名は実装時に既存APIと合わせる。`index.html`側でPN数式、50G、autopilot時定数を再実装しない。

Aegis/frigateのsea-clearanceは、共通空対空誘導が出した方向へ地形安全補正を重ねる現在の責務として残す。sea-clearanceがPN状態やQAAM航程数を書き換えないようにする。

### 8.1 特殊軌道の発射フェーズ

`tools/simulate_missile_launch_phases.mjs`で、30/60/120fps、距離、高度、目標進行方向を固定した決定論的比較を先に行った。出力は`artifacts/missile-launch-phase-sim-20260813/`に保存する。

発射クラスは次のように分離する。

- 通常MSL、QAAM、4/6/8AAM、XLAA: 機体速度と姿勢を継承し、既存の短いguidance-authority rampからPNへ入る。特殊な軌道フェーズを追加しない。
- QAAM再攻撃: 発射フェーズではなくseekerの第2航程として扱う。
- 地上SAM、小型ミサイル艇: 目標方向を向いた射出なので、静止射出速度からPNへ入る。VLS captureを使わない。
- Aegis/frigate VLS: `eject -> capture -> blend -> PN homing`。
- LASM: `safe separation -> sea-skimming cruise -> terminal latch`。
- 4AGM: `safe separation -> terrain-aware loft -> terminal dive`。
- UGB: 機体速度を継承する弾道投下であり、guided launch-phase stateへ入れない。

2026-08-13シミュレーション結果:

- VLS垂直発射から純PNへ直結: `12/108`命中、海面接触`8`、平均最高高度`2673m`。不採用。
- VLS候補（0.18秒射出保持、目標bearingへcapture、25度以内かつclosing 40m/s以上で移行、0.50秒blend）: `84/108`命中、海面接触`0`、平均最高高度`535m`。
- VLS候補の内訳: outbound `36/36`、crossing `30/36`、inbound `18/36`。近距離inboundの上空通過と高度40mのhard crossingは有限旋回・一航程の物理的なmissとして残る。
- 正面を向いた静止ランチャーPN: `99/108`。通常空中発射PN: `99/108`。したがってcaptureはVLSだけに限定し、全ミサイルへ足さない。
- LASM/4AGMのsafe-separationは`0.08〜0.25秒`で命中/失敗の判定差が0件。暫定`0.12秒`は260m/s発射で約32.5mの直進分離となる。
- LASMは平坦海面`36/36`、220m級の島を航路中央へ置く極端条件`18/36`。0.12秒分離の有無で結果は変わらず、島への直進はsea-skimming航路計画側の別課題。
- 4AGMは平地`27/27`、260m級ridge条件`24/27`。失敗3件は距離800m・発射高度120mの同一条件で、発射フェーズではなくloft可能距離の限界。
- 同じ入力を2回実行したreportのSHA-256は一致し、乱数に依存しない。

上記候補をゲーム本体へ適用した。発射フェーズを明示的なstateとして実装し、phase transition時に無関係なautopilot状態を混ぜず、VLS captureからPNだけは0.50秒で連続的にblendする。sea-clearanceも距離420mから180mまでsmoothstepで抜き、一frame切り替えを避けた。

実ブラウザではSera M04のイージス艦を本番のlock dwellとfire delay経由で発射させ、`vls-eject -> vls-capture -> vls-blend -> homing`を順番どおり採取した。最初の各phaseは高度`12.5m -> 20.7m -> 97.9m -> 194.1m`、capture angleは`58.7deg -> 57.8deg -> 22.9deg -> 3.7deg`で、全sampleのsea clearanceは正だった。pageerror/console errorは0件。

## 9. フレア、撃破済み目標、QAAM

### フレア

- フレアが敵ミサイルを奪った瞬間に、プレイヤー向けPN/autopilot状態を破棄する。
- デコイ中は既存どおりフレアを追い、プレイヤーを再捕捉しない。
- フレア消滅後に古いプレイヤー誘導状態へ戻らない。
- 航空護衛対象向けミサイルへプレイヤーのフレアが影響しない。

### 撃破済み目標

- プレイヤー弾の目標が撃破済みでも、同じtarget IDのオブジェクトが残る間は既存wreck-fuseを維持する。
- 斉射の後続弾は残骸/火球へ到達して消滅し、別の生存目標へ古い誘導状態を転用しない。
- 航空護衛対象がretire/消滅した敵ミサイルは、既存どおり除去し、プレイヤーへフォールバックしない。

### QAAM

- QAAMのPN、50G、75deg/s、autopilot時定数は通常ミサイルと同じ。
- 第1航程のオーバーシュート時にPN/autopilot/capture状態を破棄する。
- 再捕捉後は現在の目標状態から第2航程を開始する。
- 第2航程失敗後に第3航程へ入らない。

## 10. TODO

### A. 作業開始前

- [ ] `git status --short --branch`を保存し、既存未コミット差分と今回差分を区別する。
- [ ] `git log --oneline --decorate -n 35`と`git log --follow -- src/combat/missile-guidance.js`を再確認する。
- [ ] `src/combat/missile-guidance.js`、`index.html`、関連checkの作業前diffを保存する。
- [ ] 未追跡`artifacts/`と他作業者の文書差分へ触れない。

### B. 軌道シミュレーター

- [ ] `tools/simulate_air_missile_guidance.mjs`を新設する。
- [ ] 現行予測誘導、純粋追尾、PN、PN+autopilotを同一初期条件で比較できるようにする。
- [ ] ユーザー図相当の「母機と目標が同方向へ旋回する追撃条件」を追加する。
- [ ] position、heading、turn rate、commanded/achieved G、LOS rate、time-to-goをCSV/JSONへ記録する。
- [ ] 現行と候補の2D軌道をSVGまたはCanvasで重ねて確認できるようにする。
- [ ] 発射速度`128/170/300/430m/s`、距離`100〜2000m`、アスペクト、旋回率、30/60/120fpsを網羅する。
- [ ] 一定旋回、ブレーキ旋回、加速旋回、ブレーキ後加速を別シナリオにする。

### C. PN数学カーネル

- [ ] 3D relative position/velocityからLOS angular rateを計算する純関数を追加する。
- [ ] `N=3`の法線加速度命令を計算する純関数を追加する。
- [ ] 法線成分だけを使用し、長手方向推進加速度と混同しない。
- [ ] range/speedが0付近、離隔中、非有限値のguardを追加する。
- [ ] 左右/上下/斜め方向でcross productの符号をテストする。

### D. 発射直後とオートパイロット

- [ ] ミサイル生成時に`guidanceAge`と`achievedLateralAcceleration`を初期化する。
- [ ] `0.04〜0.24秒`のguidance authority rampを実装する。
- [ ] `tau=0.18秒`のframe-rate independentな一次遅れを実装する。
- [ ] achieved accelerationを現在forwardへ毎slice直交投影する。
- [ ] 目標変更時に古い横加速度を持ち越さない。
- [ ] 発射直後の位置、速度、姿勢が連続し、軌道に折れ目がないことを確認する。

### E. 旋回権限

- [ ] 空中目標向け50G横加速度上限を共通カーネルへ追加する。
- [ ] 既存の75deg/s絶対上限を維持する。
- [ ] 実効角速度を`min(authored rate, 75deg/s, achievedAccel/speed)`で求める。
- [ ] 低速/静止発射でゼロ除算せず、発射方向を保つ。
- [ ] 対地/対艦profileへ50G追加制限を適用しない。

### F. 初期capture補助

- [ ] まずPNのみでlock cone内の初期heading errorをテストする。
- [ ] PNのみで必要命中率を満たす場合、capture補助を実装しない。
- [ ] 不足時だけLOS off-boresight比例のcapture加速度を試作する。
- [ ] capture成分に個別上限と`0.6〜1.0秒`の減衰を付ける。
- [ ] captureがユーザー図左の横切り込みを再発させた場合は破棄する。

### G. 三つの誘導経路統一

- [ ] プレイヤー通常ミサイル/空対空SP.Wを新air guidanceへ移す。
- [ ] 敵ミサイル→プレイヤーを同じair guidanceへ移す。
- [ ] 敵ミサイル→航空護衛対象を同じair guidanceへ移す。
- [ ] 地上SAM、艦船SAM、敵戦闘機で同じPN/50G/autopilot契約を使う。
- [ ] 艦船護衛対象を空対空PN変更の対象外にする。
- [x] Aegis/frigate sea-clearanceを維持する。

#### G-1. 特殊軌道の発射フェーズ

- [x] `tools/simulate_missile_launch_phases.mjs`を追加する。
- [x] VLS純PN、VLS phased、正面静止発射、通常空中発射を108条件で比較する。
- [x] LASM/4AGMのsafe-separationを`0〜0.25秒`で比較する。
- [x] 30/60/120fpsで同一マトリクスを実行し、reportが決定論的であることを確認する。
- [x] Aegis/frigateへ`vls-eject -> vls-capture -> vls-blend -> homing`を実装する。
- [x] `vls-eject`中は0.18秒だけ発射姿勢を保持し、推進と移動は止めない。
- [x] `vls-capture`は未来迎撃点へ最短で切り込まず、現在のtarget bearingへ有限加速度で姿勢を作る。
- [x] 25度以内かつclosing 40m/s以上を0.50秒blend開始条件とし、条件を1frameで往復させない。
- [x] VLS captureを通常MSL、QAAM、AAM salvos、地上SAM、小型ミサイル艇へ適用しない。
- [x] LASM/4AGMに0.12秒のsafe-separation stateを追加し、その後は既存profileへ渡す。
- [x] UGBをguided launch-phase stateへ入れない。
- [x] phase変更時に無関係な旧command/achieved accelerationを持ち越さず、VLS captureからPNだけを明示的にblendする。
- [x] `missileProbe`へlaunch phase、phase age、capture angle、closing speedを追加する。
- [x] LASMの島への直進と、近距離低高度4AGMのridge衝突はlaunch-phase変更から分離して別評価する。

### H. QAAM・フレア・対象変更

- [ ] QAAM第1航程終了時にPN/autopilot/capture状態を破棄する。
- [ ] QAAM第2航程で状態を新規初期化する。
- [ ] QAAM第3航程が発生しないことを確認する。
- [ ] フレア取得時にプレイヤー向け誘導状態を破棄する。
- [ ] フレア消滅後にプレイヤーを再捕捉しない。
- [ ] 同じtarget IDの撃破済み敵にはwreck-fuseを維持する。
- [ ] target ID変更時に前目標の状態を転用しない。
- [ ] 航空護衛対象retire時にプレイヤーへフォールバックしない。

### I. 終末加減速回避

- [ ] PN+autopilotだけで一定旋回と加減速回避を再シミュレーションする。
- [ ] 一定旋回命中率`>= 98%`を先に満たす。
- [ ] 直進ブレーキだけが万能回避にならないことを確認する。
- [ ] 旋回と250/350/500mでの加減速を組み合わせ、一部条件に再現可能な回避窓があるか測る。
- [ ] 回避窓が十分なら`0.44秒`終末コミットを実装しない。
- [ ] 不足時だけ`0.42/0.44/0.46秒`コミットを候補比較する。
- [ ] コミット候補は軌道の滑らかさ、一定旋回命中、加減速回避の三条件で判定する。
- [ ] 固定点通過後に古い点へUターンしない方式をテストする。

### J. 自動テスト

- [ ] `tools/check_air_missile_pn_guidance.mjs`を新設する。
- [ ] LOS rate符号とPN加速度方向を単体確認する。
- [ ] guidance rampとautopilot時定数が30/60/120fpsで一致することを確認する。
- [ ] 発射直後0.1秒のheading変化と横変位が現行より小さいことを確認する。
- [ ] turn rate/acceleration commandがframe間で不連続に正負反転しないことを確認する。
- [ ] 現実的な一定旋回条件で命中率`>= 98%`を確認する。
- [ ] 100〜200mの物理的に不可能な横切りは強制命中させない。
- [ ] `tools/check_predictive_missile_guidance.mjs`を、現行方式固定のテストから新契約の回帰テストへ改名または分割する。
- [ ] `tools/check_missile_turn_cap.mjs`へ50G/75deg/s二重上限を追加する。
- [ ] `tools/check_qaam_reattack.mjs`へPN状態の第1/第2航程初期化を追加する。
- [ ] `tools/check_missile_acceleration.mjs`を実行し、180m/s^2推進を確認する。
- [ ] `tools/check_lock_persistence.mjs`を実行する。
- [ ] `tools/check_multi_lock_salvo.mjs`を実行する。

### K. 回帰テスト

- [ ] QAAMが通常ミサイルより高いPN gain、G上限、autopilot応答を得ていないことを確認する。
- [ ] 通常ミサイルと全敵SAMが1航程のままであることを確認する。
- [ ] LASM sea-skimming、4AGM loft、terrain clearanceを確認する。
- [x] Aegis/frigate SAMの海面落下防止をsimulation 108条件とM04実ブラウザで確認する。
- [ ] carrier/missileBoatへ大型艦再捕捉が復活していないことを確認する。
- [ ] フレア搭載数、敵ロック警告、MISSILE ALERT、白四角ミサイルHUDを確認する。
- [ ] ロック保持、4/6/8AAM同時ロック/同時発射を確認する。

### L. ブラウザ実機検証

- [x] ローカルHTTPサーバーを一つだけ起動する。
- [x] プレイ可能なSera M04 payloadで出撃する。
- [ ] ユーザー図相当の追撃条件で、発射直後に横へ折れず右図に近い軌道になることを確認する。
- [ ] ミサイルtrailを動画または連続スクリーンショットで記録する。
- [ ] 一定旋回する敵機へ通常命中することを確認する。
- [ ] 敵弾に対し、旋回だけでは被弾し、適切な加減速併用で一部回避できることを確認する。
- [ ] QAAM再捕捉、フレア、航空護衛対象、艦船護衛対象を確認する。
- [ ] debug snapshotへguidance age、commanded/achieved G、LOS rate、navigation phaseを追加する。
- [x] VLS発射フェーズの実ブラウザ確認でpageerror 0、console error 0を確認する。

### M. 仕上げ

- [x] `node --check src/combat/missile-guidance.js`を実行する。
- [x] 変更した発射フェーズ関連`tools/check_*.mjs`へ`node --check`を実行する。
- [x] 発射フェーズと既存ミサイル仕様の関連checkを実行する。
- [x] `git diff --check`を実行する。
- [x] `index.html`のES module cache-busterを更新する。
- [x] 最終採用値とシミュレーション結果を本計画書へ追記する。
- [ ] `docs/README.md`またはstatus文書から最終仕様へリンクする。
- [ ] commit/pushはユーザーの明示指示後にのみ行う。

## 11. 受入条件

- 発射時の位置、速度、向きが連続し、発射直後の軌道に折れ目がない。
- ユーザー図相当の条件で、現行より母機進行方向を長く保ち、滑らかに迎撃へ入る。
- 誘導はLOS rateに基づき、未来迎撃点へQuaternionを直接向け続ける方式ではない。
- 横加速度は50G、角速度は75deg/sを超えない。
- 現実的な一定旋回条件で`>= 98%`命中する。
- 直進ブレーキだけは万能回避にならない。
- 適切な旋回と加減速に再現可能な回避窓がある。
- 同一入力・同一初期条件で結果が決まり、誘導ノイズ/命中乱数を使わない。
- 通常ミサイル1航程、QAAM最大2航程を維持する。
- プレイヤー弾、敵対プレイヤー弾、敵対航空護衛対象弾が同じ空対空誘導契約を使う。
- フレア、wreck-fuse、sea-clearance、loft、CIWS、ロックUI、複数同時ロックを壊さない。
- 30/60/120fpsで軌道、命中、オーバーシュート結果が安定する。
- ブラウザでpageerror 0、console error 0である。

## 12. 今回行わないこと

- 完全な6DOF空力、翼面、ロール、質量変化、推力曲線の実装。
- ミサイル最高速度`556 m/s`、推進加速度`180 m/s^2`、寿命、ダメージの再調整。
- プレイヤー機のflight model再調整。
- 近距離で物理的に不可能な横切りへの強制命中。
- 乱数誘導、ランダムmiss、強制回避率。
- QAAMへ通常ミサイルより高い旋回性能や完全予測を戻すこと。
- 対地/対艦誘導の再設計。
- ロックオン、警告HUD、マルチロック仕様の変更。

## 13. 実装順

1. 軌道シミュレーターと現行baseline保存。
2. PN数学カーネル単体実装。
3. guidance rampと0.18秒autopilot。
4. 50G/75deg/s二重上限。
5. プレイヤー弾のみに仮接続して軌道比較。
6. 初期heading error評価。必要な場合だけcapture補助。
7. 敵対プレイヤー弾と航空護衛対象弾を共通化。
8. QAAM、フレア、wreck-fuse、sea-clearance回帰。
9. 一定旋回と加減速回避評価。
10. 必要な場合だけ0.44秒終末コミット比較。
11. ブラウザ実プレイ、最終値確定、文書更新。

一度に複数のgainを動かさない。まず`N=3 / tau=0.18s / ramp end=0.24s / 50G / 75deg/s`を固定し、軌道と命中を測ってから一項目ずつ変更する。
