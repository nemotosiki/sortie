# 第14便 `chatgpt/gun-identity` — 本体改修設計

基準コミット: `a3c208560f279df9b78f03461a6e36bed31a39a7`

## 0. 結論

現行のペイロードAPIで、主題A〜Gの既存挙動を安全に変更できるものはありません。

| 主題 | 現行payloadで到達 | 判定理由 | この成果物 |
|---|---|---|---|
| A 機銃の機体別化 | 不可 | 発射間隔・射程・補正・発射口は本体の実行経路。既存 `AIRCRAFT_TYPES` の書換えは禁止 | add-onlyの別レジストリ設計＋全22機の値 |
| B LASM / 4AGM軌道分離 | 不可 | 誘導・終末移行・近接信管はミサイル更新ループ内 | 兵装別誘導レジストリ設計＋2軌道の仕様 |
| C 無線色分け | 不可 | `<style>` 内のCSS | 直接適用できるCSS差分案 |
| D 無線表示時間 | 不可 | 本体定数・アクティブ無線・優先度キュー | 定数差分＋割込み・滞留防止案 |
| E 自機機銃色 | 不可 | `fireGun` 内の色引数がハードコード | 直接差分案。Aの色プロファイルへ統合可能 |
| F 山の判定 | 不可 | `world.mountains` と、その全利用箇所は非公開 | 回転楕円の共有判定関数と置換手順 |
| G 砂浜ちらつき | 不可 | 既存shoreメッシュ／マテリアルは `createWorld` 内部 | 原因判定と `polygonOffset` 差分案 |

`ctx.addWorldDecorator` は、生成済みワールドに**新しい**装飾を足し、追加資源を既存の破棄契約へ載せるAPIである。既存のshoreマテリアル、既存mountainの衝突データ、武器更新、CSS、無線状態を差し替える入口ではない。そのため、このブランチには「読み込めるが何も変えない」偽payloadを置かず、本体側へそのまま移せる設計だけを置く。

主題C・D・E・F・G・A-0は一度きりの本体修正とする。主題Aの機体別値と主題Bの兵装別誘導値だけは、既存テーブルを書き換えないadd-onlyレジストリにする価値がある。

---

## 1. 実装順序

依存関係と検証の切り分けを考えると、次の順が安全である。

1. **C / D / E / A-0** — CSS・定数・色だけを先に変更し、それぞれ単独で回帰確認する。
2. **G** — shoreマテリアルだけを変更。地形・衝突とは独立。
3. **F** — mountainの水平判定を一つの共有関数へ集約し、全利用箇所を置換。
4. **A基盤** — `PLAYER_GUN_PROFILES` と `ctx.addPlayerGunProfile` を追加し、照準と実弾を同じ解へ通す。
5. **Aデータ** — 22機ぶんの射程・連射・補正・発射口・色を登録。
6. **B基盤** — `SPW_GUIDANCE_PROFILES` と `ctx.addSpwGuidanceProfile` を追加。
7. **Bデータ** — LASMをlegacy同値で登録し、4AGMだけロフト／トップアタックへ変更。
8. 各主題の個別試験後に、全40ミッション・8ワールド・全プレイアブル機の統合試験を行う。

---

# 主題C — 無線の味方／敵の色分け

## 判定

payloadからCSSへ到達するAPIはない。ここは汎用APIを増やさず、本体のCSSを直接直すべきである。

## 変更案

現行の「command / wingman / enemyを一括で赤にするセレクタ」と、括弧を赤固定にする宣言を、パネル単位のCSS変数へ置き換える。

```diff
-#radioPanel.command #radioSpeaker,
-#radioPanel.wingman #radioSpeaker,
-#radioPanel.enemy #radioSpeaker { color: #ff4a52; }
+#radioPanel { --radio-accent: #ff4a52; }
+
+/* 既存の友軍／護衛HUDに使われている青。新色を増やさない。 */
+#radioPanel.command,
+#radioPanel.wingman { --radio-accent: #78beff; }
+
+#radioPanel.enemy { --radio-accent: #ff4a52; }
+
+#radioPanel #radioSpeaker { color: var(--radio-accent); }
```

括弧も同じ変数を読む。

```diff
 #radioText::before,
 #radioText::after {
-  color: #ff4a52;
+  color: var(--radio-accent);
 }
```

司令部と僚機は同じ青でよい。話者ラベルと `《 》` が必ず同色になるため、「ラベルだけ青・括弧は赤」という不整合が構造的に起きない。

## 検証

- `command`: 話者＋括弧が `#78beff`
- `wingman`: 話者＋括弧が `#78beff`
- `enemy`: 話者＋括弧が従来どおり `#ff4a52`
- 本文色、タイプライター、優先度、表示時間はこの変更では不変

---

# 主題D — 無線の表示時間を約2倍にする

## 判定

payloadから無線定数・アクティブ行・優先度キューへ到達できない。直接の本体変更とする。

## 定数差分

現在の関数形を完全に保ったまま、3値を正確に2倍にする。

```diff
-const RADIO_HOLD_BASE = 0.9;
-const RADIO_HOLD_PER_CHAR = 0.012;
-const RADIO_HOLD_MAX = 3.2;
+const RADIO_HOLD_BASE = 1.8;
+const RADIO_HOLD_PER_CHAR = 0.024;
+const RADIO_HOLD_MAX = 6.4;
```

これなら短文・中程度・上限到達後の長文まで、相対関係を変えず約2倍になる。タイプライターの `RADIO_CHAR_INTERVAL`、話者／行クールダウン、最小ギャップは変更しない。

## 優先度割込み

表示を長くする以上、キューで順位を上げるだけでは不十分である。アクティブなNORMALが6.4秒残っている間にCRITICALが来た場合、CRITICALは現在行を待たずに開始する必要がある。

`triggerRadioLine` またはキュー投入関数で、行を作成した直後に次を行う。

```js
function shouldPreemptRadio(active, incoming) {
  return Boolean(active && incoming.priority > active.priority);
}

function enqueueRadioLine(incoming) {
  if (shouldPreemptRadio(radioState.activeLine, incoming)) {
    // 古い状況通信を後から再表示しない。割り込まれた行は破棄する。
    stopActiveRadioLine({ requeue: false });
    startRadioLine(incoming);
    return true;
  }

  insertRadioQueueStableByPriority(incoming);
  trimRadioQueueToLimit();
  return true;
}
```

条件は厳密に `incoming.priority > active.priority` とする。

- CRITICALはURGENT/NORMALへ割り込む
- URGENTはNORMALへ割り込む
- 同順位は割り込まず、既存のFIFO順を維持
- 低順位は高順位へ割り込まない

割り込まれたNORMALをキュー末尾へ戻すと、数秒前の状況が後で再生されるため、**再キューしない**。

## 滞留防止

長いNORMALが連続するケースだけ、キューから取り出す時点で古いNORMALを捨てる。URGENTとCRITICALは捨てない。

```js
const RADIO_NORMAL_MAX_QUEUE_AGE = 8.0;

function takeNextRadioLine(now) {
  while (radioQueue.length) {
    const next = radioQueue.shift();
    if (
      next.priority === RADIO_PRIORITY.NORMAL &&
      now - next.queuedAt > RADIO_NORMAL_MAX_QUEUE_AGE
    ) continue;
    return next;
  }
  return null;
}
```

`queuedAt` は既存の `missionElapsed` 系の時計を使用し、`performance.now()` と混在させない。ミッション終了・リトライ・チェックポイント復帰時の既存 `resetRadio()` は、従来どおりキューとアクティブ行を全消去する。

## 検証

1. 190文字以上のNORMALが6.4秒保持される。
2. NORMAL表示中にURGENTを入れると、次のupdate以内にURGENTへ切り替わる。
3. URGENT表示中にCRITICALを入れると同様に切り替わる。
4. 同順位の2行は順序を変えない。
5. 8秒以上待ったNORMALは後から再生されない。
6. ミッション終了後、前ミッションの行が次の出撃へ残らない。

---

# 主題E — プレイヤー機銃を黄橙色へ

## 判定

現行の色引数は `fireGun` 内にハードコードされておりpayloadから届かない。Aのプロファイル導入前でも単独で直せる。

## 最小差分

既存コード中の3色を、既存敵曳光弾系で使われている黄橙の範囲へ揃える。

```diff
-createImpactBurst(end, 0x9df8ff, 0.7);
-createTracer(start, end, 0x9ef6ff, 0.11, 0.9);
-createMuzzleFlash(start, 0xa7fbff);
+createImpactBurst(end, 0xffb04a, 0.7);
+createTracer(start, end, 0xffd35f, 0.11, 0.9);
+createMuzzleFlash(start, 0xffe39a);
```

- tracer: 黄寄りで最も読みやすい `0xffd35f`
- muzzle: 中心が白く見える明るい黄橙 `0xffe39a`
- impact: 地表・機体上で区別しやすい少し赤寄りの橙 `0xffb04a`

Aを実装する際は、この3値を `DEFAULT_PLAYER_GUN_PROFILE.colors` へ移し、呼び出し側はプロファイルから読む。

```js
const colors = activePlayerGunProfile.colors;
createImpactBurst(end, colors.impact, 0.7);
createTracer(start, end, colors.tracer, 0.11, 0.9);
createMuzzleFlash(start, colors.muzzle);
```

## 検証

- tracer／muzzle／impactの3つがすべて黄橙系
- 敵側 `tracerColor` は一切変更されない
- additive blending、寿命、太さ、透明度は不変

---

# 主題G — 砂浜と海面のちらつき

## 原因判定

`renderOrder` はtransparentオブジェクト同士の順番を固定するが、深度値そのものの分解能は改善しない。shore板は海面と平行で、海面 `y=0`、浅瀬 `y=0.25`、砂浜 `y=0.5`。遠距離かつ浅い視線角では、この0.25〜0.5m差が深度バッファ上で同じ値へ量子化される。

`depthWrite:false` により浅瀬・砂浜は互いの深度を書かず、どちらも海面が書いた深度との比較になる。`renderOrder` は混色順を決めても、海面との深度競合を解決しない。したがって主因はtransparent sortのランダム性ではなく、**ほぼ共面な板と海面の深度精度**である。

高さを数m離すと「水深による色変化」ではなく板が浮いて見えるため、位置は維持し、fragment depthだけをわずかに手前へ寄せる。

## 変更案

shoreの共有マテリアルに `polygonOffset` を追加する。砂浜を浅瀬より一段強く手前へ寄せる。

```diff
 const shallowMaterial = keepMaterial(new THREE.MeshBasicMaterial({
   color: decor.shore.shallow,
   transparent: true,
   opacity: decor.shore.opacity,
   depthWrite: false,
+  depthTest: true,
+  polygonOffset: true,
+  polygonOffsetFactor: -1,
+  polygonOffsetUnits: -1,
   side: THREE.DoubleSide
 }));

 const sandMaterial = keepMaterial(new THREE.MeshBasicMaterial({
   color: decor.shore.sand,
   transparent: true,
   opacity: decor.shore.opacity,
   depthWrite: false,
+  depthTest: true,
+  polygonOffset: true,
+  polygonOffsetFactor: -2,
+  polygonOffsetUnits: -2,
   side: THREE.DoubleSide
 }));
```

位置と描画順は変えない。

```js
shallow.position.set(anchor.x, 0.25, anchor.z);
shallow.renderOrder = 1;
sand.position.set(anchor.x, 0.5, anchor.z);
sand.renderOrder = 2;
```

負のoffsetはカメラ側へ寄せる。浅瀬 `-1/-1`、砂浜 `-2/-2` とすることで、海面 < 浅瀬 < 砂浜の視覚順を保つ。マテリアルは引き続き `keepMaterial` を通るため、`disposeWorld` の資源追跡契約は変わらない。

## 適用範囲

個別プリセットではなく、`if (decor.shore)` の共通builderを一度直す。これにより、現在および将来の `decor.shore` を持つ全プリセットへ同じ修正が入る。

## 検証

- `WORLD_PRESETS` から `decor.shore` を持つキーを列挙して全件確認
- 高度10〜200m、俯角1〜5度で停止／低速パンし、shore境界が点滅しない
- 色・opacity・shore幅・高さは変更前と一致
- 8ワールドを8往復してgeometries/texturesが基準へ戻る
- `surfaceHeightAt` はshoreを地形へ加えないため全点一致

---

# 主題F — 山の当たり判定を描画楕円へ合わせる

## 原因

描画メッシュはローカルX/Z方向へ `radius × depth` でスケールされ、さらにY回転を持つ。一方、水平判定は `Math.max(radius, depth) * 0.85` の円である。短軸側では円が楕円より外へ出るため、見えている山肌の外側に衝突領域が残る。

単に `r` を短軸へ合わせると長軸側で山をすり抜ける。必要なのは、回転を考慮した楕円の共通判定である。

## mountain記録

既存 `r` は広域の早期棄却用として残す。物理判定には半軸と回転を明示する。

```diff
 const yaw = mountain.rotation.y;
 const collisionScale = 0.85;
 mountains.push({
   x: mountain.position.x,
   z: mountain.position.z,
-  r: Math.max(radius, depth) * 0.85,
+  r: Math.max(radius, depth) * collisionScale, // broad phase only
   h: height * 0.92,
   rx: radius,
   rz: depth,
+  collisionRx: radius * collisionScale,
+  collisionRz: depth * collisionScale,
+  yaw,
   mesh: mountain
 });
```

`h: height * 0.92` は変更しない。

## 共有関数

```js
function mountainLocalXZ(mountain, x, z, out) {
  const dx = x - mountain.x;
  const dz = z - mountain.z;
  const c = Math.cos(mountain.yaw || 0);
  const s = Math.sin(mountain.yaw || 0);

  // worldをmountain localへ逆回転
  out.x = dx * c + dz * s;
  out.z = -dx * s + dz * c;
  return out;
}

function mountainEllipseMetric(mountain, x, z, padding = 0) {
  const local = mountainLocalXZ(mountain, x, z, tmpMountainXZ);
  const rx = Math.max(0.001, mountain.collisionRx + padding);
  const rz = Math.max(0.001, mountain.collisionRz + padding);
  return (local.x * local.x) / (rx * rx) +
    (local.z * local.z) / (rz * rz);
}

function mountainContainsXZ(mountain, x, z, padding = 0) {
  const broad = mountain.r + padding;
  const dx = x - mountain.x;
  const dz = z - mountain.z;
  if (dx * dx + dz * dz > broad * broad) return false;
  return mountainEllipseMetric(mountain, x, z, padding) <= 1;
}

function mountainNormalizedRadius(mountain, x, z) {
  return Math.sqrt(mountainEllipseMetric(mountain, x, z, 0));
}
```

`padding` は機体・艦・スポーン安全半径を両軸へ加える。円の半径を引き続き最終判定へ使わない。

## `r` 利用箇所の置換方針

本体側では `mountain.r` を全文検索し、最低でも次の分類で確認する。

| 利用目的 | 変更 |
|---|---|
| プレイヤー衝突 | `mountainContainsXZ(m,x,z,playerRadius)` を最終判定にする |
| 敵AIの地形回避 | 予測位置を同じ関数へ通す。回避開始余白は `padding` |
| `surfaceHeightAt` の山高さ | 円距離 `distance / r` を `mountainNormalizedRadius` へ置換。既存の高さカーブと `h` は不変 |
| 地上ユニット接地 | 直接判定があれば楕円化。`surfaceHeightAt` 経由なら自動的に一致 |
| ヘリclearance | 直接判定があれば楕円化。地表問い合わせ経由なら自動的に一致 |
| 艦隊／敵ウェーブの山回避 | `mountainContainsXZ` に対象半径をpaddingとして渡す |
| 装飾の `blocked()` | 円をbroad phaseに残し、最終判定を楕円へ変更 |
| debug/worldMountains | `r` に加えて `rx/rz/yaw/collisionRx/collisionRz` を返す |

円を消さずbroad phaseに残すことで、毎フレーム全山にsin/cosを行う範囲を絞る。さらに `cosYaw/sinYaw` を生成時に保存すれば、ホットループで三角関数を呼ばずに済む。

```js
cosYaw: Math.cos(yaw),
sinYaw: Math.sin(yaw)
```

## 高さ契約

楕円化で変えるのは水平の正規化距離だけである。

```diff
-const radial = Math.hypot(x - m.x, z - m.z) / m.r;
+const radial = mountainNormalizedRadius(m, x, z);
 if (radial >= 1) continue;
 const candidate = existingHeightCurve(radial, m.h);
```

`m.h = height * 0.92` と既存の高さカーブをそのまま使う。したがって「ユニットが立つ面より8%低く取る」という縦方向の余裕は維持される。

## すり抜け防止

- 半軸は `collisionRx/Rz = rawAxis * 0.85` とし、長軸側の旧境界は変えない。
- 短軸だけを同じ比率まで縮めるため、修正は「旧円の誤った余白を除く」方向に限定される。
- 高速移動は、現在位置だけでなく前フレーム→次フレームの線分を楕円のローカル空間へ変換し、segment-vs-unit-circleで判定する。点判定だけだと、修正とは別に高速すり抜けが残る。

## 検証

1. 各山の長軸／短軸／斜め45度で、境界内側は衝突、外側は非衝突。
2. 山のY回転を変えても同じ結果。
3. 前フレームと次フレームが山を跨ぐ高速ケースで衝突する。
4. `surfaceHeightAt` を修正前後で、長軸上は一致、短軸の旧偽陽性だけ0へ戻る。
5. 既存地上ユニットの接地誤差0.0000。
6. 敵AIが短軸側で不要に回避せず、長軸側で山へ入らない。

---

# 主題A-0 — 全体の連射速度を下げる

## 判定

payloadからグローバル `GUN_RATE` へ届かない。Aのレジストリ導入前でも、直接変更できる。

```diff
-const GUN_RATE = 12;
+const GUN_RATE = 6;
```

Aの実装後は、この6を `DEFAULT_PLAYER_GUN_PROFILE.rate` へ移す。

1発威力 `AIRCRAFT_TYPES.*.gunDamage` は変更しない。連射を半分にして威力を倍にすると、ばら撒けなくする目的が消えるためである。既存の18〜22という機体差はそのまま残し、実測で極端に弱くなった場合も、まず命中時間・弾数・キル所要時間を測定してから別判断にする。

---

# 主題A — 機体別のプレイヤー機銃

## 設計原則

既存 `AIRCRAFT_TYPES` は敵と自機で共有され、書換え禁止である。機銃のプレイヤー側挙動は別のadd-onlyテーブルにする。

```js
const PLAYER_GUN_PROFILES = {};

ctx.addPlayerGunProfile(aircraftId, definition);
```

このテーブルにHP・`gunDamage`・`gunGroundBonus` は持たせない。威力は今後も `AIRCRAFT_TYPES` が正本である。

## API

```ts
ctx.addPlayerGunProfile(
  aircraftId: string,
  definition: {
    rate: number,
    range: number,
    assist: {
      air: { near: number, far: number },
      surface: { near: number, far: number }
    },
    muzzles: Array<{
      forward: number,
      right: number,
      up: number
    }>,
    colors?: {
      tracer: number,
      muzzle: number,
      impact: number
    }
  }
): Readonly<PlayerGunProfile>
```

### 検証

- `aircraftId` が `AIRCRAFT_TYPES` に存在する
- 同じIDの二重登録はエラー
- `rate`: 1〜30
- `range`: 300〜1500
- assist各値: 0〜1、かつ `near >= far`
- muzzles: 1〜4個、全offsetが有限値
- colors: 24bit整数
- finalize時に各profileとテーブルをfreezeし、registry snapshotへ追加

任意のcallbackは受け取らない。数値データだけに限定する。

## 既定プロファイル

プロファイルが無い機体は、A-0とE以外を出荷前と同じにする。

```js
const DEFAULT_PLAYER_GUN_PROFILE = Object.freeze({
  rate: 6,             // A-0の意図的変更。旧値は12
  range: 750,          // 旧GUN_RANGE
  assist: {
    air: { near: 0.75, far: 0.30 },
    surface: { near: 0.75, far: 0.30 }
  },
  // 現行の左右±2.8m交互発射と、現在のforward/upをそのまま移す。
  muzzles: [
    { forward: CURRENT_FORWARD, right: -2.8, up: CURRENT_UP },
    { forward: CURRENT_FORWARD, right:  2.8, up: CURRENT_UP }
  ],
  colors: {
    tracer: 0xffd35f,
    muzzle: 0xffe39a,
    impact: 0xffb04a
  }
});
```

`CURRENT_FORWARD` と `CURRENT_UP` は現行 `gunMuzzleOrigin` のリテラルをそのまま移し、数値を作り直さない。これにより未登録機の発射点はA-3導入前と一致する。

## 適用タイミング

`applyAircraftLoadout(id)` で一度だけ解決し、飛行中のホットループはテーブルを毎フレーム引かない。

```js
activePlayerGunProfile =
  PLAYER_GUN_PROFILES[id] || DEFAULT_PLAYER_GUN_PROFILE;

PLAYER_GUN_RATE = activePlayerGunProfile.rate;
PLAYER_GUN_RANGE = activePlayerGunProfile.range;
```

発射クールダウンは `1 / PLAYER_GUN_RATE`、射程・照準リング・ガンバル・命中判定はすべて `PLAYER_GUN_RANGE` を読む。

## A-1 対空／対地補正

既存の分類をそのまま使う。

```js
function gunTargetClass(target) {
  return target.ground || target.surface ? "surface" : "air";
}
```

- 艦: `surface` → surface
- 地上: `ground` → surface
- ヘリ: `ground=false`, `surface=false` → air
- 航空機: air

新分類は作らない。

距離減衰の式、補正立上がり0.55秒、解除0.18秒は変更しない。現在の `gunAssistCap(range)` を、同じ補間式へnear/farを渡す関数にする。

```js
function gunAssistCap(range, target, profile) {
  const kind = gunTargetClass(target);
  const limits = profile.assist[kind];
  const t = THREE.MathUtils.clamp(range / profile.range, 0, 1);
  return THREE.MathUtils.lerp(limits.near, limits.far, t);
}
```

## 照準リングと実弾の共有

照準と命中で別計算を持たない。次の一つの関数が、補正後方向・lead point・range・muzzle originを返す。

```js
function solvePlayerGunShot(target, profile, muzzleIndex, assistState, out) {
  const muzzle = playerGunMuzzleWorld(profile, muzzleIndex, out.origin);
  const range = gunLeadPoint(muzzle, target, out.lead);
  const cap = gunAssistCap(range, target, profile);

  updateExistingGunAssistState(assistState, cap); // 0.55 / 0.18は既存値
  computeExistingAssistedDirection(
    muzzle,
    out.lead,
    assistState.amount,
    out.direction
  );

  out.range = range;
  return out;
}
```

- gunsightは「次に撃つmuzzleIndex」でこの解を描く
- `fireGun` も同じmuzzleIndex・同じ関数を使う
- 発射が成立した後だけmuzzleIndexを進める
- `gunHitTest` も同じ関数を使う

これにより「リングへ重ねた解」と「実際に飛ぶ弾」の一致を維持する。

## A-3 発射口

offsetは機体ローカル軸ではなく、既存の `forwardOf/rightOf/upOf` に対する意味を固定する。

```js
function playerGunMuzzleWorld(profile, index, out) {
  const muzzle = profile.muzzles[index % profile.muzzles.length];
  forwardOf(player, tmpForward);
  rightOf(player, tmpRight);
  upOf(player, tmpUp);

  return out.copy(player.position)
    .addScaledVector(tmpForward, muzzle.forward)
    .addScaledVector(tmpRight, muzzle.right)
    .addScaledVector(tmpUp, muzzle.up);
}
```

単砲は配列1個なので左右交互発射が消える。複数発射口は配列順に巡回する。

## 22機の初期値

値は実機寸法の断定ではなく、現行の手続きモデル上で「機首中央／左根元／右根元／機首下」と読める初期値である。`gunProfileProbe()` で銃口位置を可視化して最終調整する。

補正カテゴリ:

- `AIR`: 対空 0.75→0.30、対地 0.22→0.08
- `INTERCEPT`: 対空 0.72→0.28、対地 0.18→0.06
- `MULTI`: 対空 0.62→0.24、対地 0.52→0.20
- `CARRIER`: 対空 0.64→0.25、対地 0.66→0.26
- `ATTACK`: 対空 0.30→0.10、対地 0.82→0.34
- `LEGACY`: 対空 0.55→0.20、対地 0.42→0.15

| aircraft | rate | range | assist | muzzles `{forward,right,up}` |
|---|---:|---:|---|---|
| `a10` | 5.0 | 650 | ATTACK | `{8.6,0,-0.65}` |
| `su25` | 5.0 | 675 | ATTACK | `{7.3,-0.22,-0.45}`, `{7.3,0.22,-0.45}` |
| `mig21` | 5.5 | 700 | LEGACY | `{6.6,0,-0.40}` |
| `f4` | 5.5 | 725 | LEGACY | `{8.1,0,-0.45}` |
| `mig23` | 6.0 | 775 | INTERCEPT | `{7.5,0,-0.45}` |
| `f16` | 6.5 | 800 | MULTI | `{7.2,-1.05,-0.05}` |
| `gripen` | 6.5 | 800 | MULTI | `{7.0,-0.85,0}` |
| `f2a` | 6.5 | 800 | MULTI | `{7.2,-1.05,-0.05}` |
| `fa18` | 6.5 | 775 | CARRIER | `{7.8,0,-0.15}` |
| `f14` | 6.0 | 825 | CARRIER | `{8.4,-0.95,0.05}` |
| `f15` | 6.5 | 850 | AIR | `{8.0,1.15,0}` |
| `f22` | 7.0 | 900 | AIR | `{8.0,0.95,0.05}` |
| `f35c` | 6.5 | 850 | CARRIER | `{7.7,-0.90,0.18}` |
| `rafale` | 7.0 | 850 | CARRIER | `{7.2,0.85,0}` |
| `typhoon` | 7.0 | 850 | AIR | `{7.4,0.90,0}` |
| `mig31` | 5.5 | 900 | INTERCEPT | `{9.0,0.80,-0.10}` |
| `mig29` | 6.5 | 800 | MULTI | `{7.2,-0.85,0}` |
| `su33` | 6.5 | 825 | CARRIER | `{8.0,0.85,0}` |
| `su35` | 7.0 | 850 | AIR | `{8.1,0.90,0}` |
| `su37` | 7.0 | 850 | AIR | `{8.1,0.90,0}` |
| `su47` | 7.0 | 850 | AIR | `{7.8,0.85,0}` |
| `su57` | 7.0 | 900 | AIR | `{8.2,0.95,0}` |

既存 `gunDamage` と `gunGroundBonus` は一切変更しない。

## debug

```js
debug.gunProfileProbe = () => ({
  aircraft: selectedAircraftId,
  rate: PLAYER_GUN_RATE,
  range: PLAYER_GUN_RANGE,
  assist: structuredClone(activePlayerGunProfile.assist),
  muzzleIndex: playerGunMuzzleIndex,
  nextMuzzle: playerGunMuzzleWorld(
    activePlayerGunProfile,
    playerGunMuzzleIndex,
    new THREE.Vector3()
  ),
  colors: { ...activePlayerGunProfile.colors }
});
```

## 検証

- 未登録のダミー機体は、rate6／range750／旧assist／旧左右2口になる
- 単砲機は連続10発で同一発射口
- 2口機はABAB順
- surface targetとair targetで同距離でもcapが切り替わる
- F-22対空は旧0.75→0.30と一致
- 立上がり0.55秒・解除0.18秒は不変
- gunsight解と`gunHitTest`が同じmuzzleで一致
- 22機すべてで銃口が機体外の不自然な位置へ出ない

---

# 主題B — LASMと4AGMの軌道分離

## 原則

既存 `SPW_TYPES` を書き換えず、誘導だけを別のadd-onlyレジストリにする。

```js
const SPW_GUIDANCE_PROFILES = {};
ctx.addSpwGuidanceProfile(weaponKey, definition);
```

プロファイルが無い兵装は、現在の `popup:true` のロジックをそのまま通る。既定挙動を変えない。

## API

```ts
ctx.addSpwGuidanceProfile(
  weaponKey: string,
  definition:
    | {
        mode: "seaSkimPopup",
        diveRatio: number,
        minDrop: number,
        latch: true
      }
    | {
        mode: "loftTopAttack",
        loftAboveLaunch: number,
        loftAboveTarget: number,
        terrainClearance: number,
        terminalAngleDeg: number,
        terminalRange: [number, number],
        latch: true
      }
): Readonly<SpwGuidanceProfile>
```

### 検証

- `weaponKey` が既存SP.Wに存在する
- surface lock可能な誘導兵装である
- modeはallowlistのみ
- 全数値が有限かつ安全範囲
- 二重登録拒否
- callback禁止
- finalizeでfreeze、snapshotへ追加

ミサイル発射時にprofileを解決し、ミサイル実体へ参照を保存する。飛行中にテーブルを再参照しない。

```js
missile.guidance = SPW_GUIDANCE_PROFILES[weapon.key] || LEGACY_POPUP_GUIDANCE;
missile.guidancePhase = "cruise";
missile.guidanceLatched = false;
```

## LASM

現行見た目を変えない。

```js
ctx.addSpwGuidanceProfile("lasm", {
  mode: "seaSkimPopup",
  diveRatio: 1.2,
  minDrop: 60,
  latch: true
});
```

現在の `popup:true` 分岐を関数へ抽出し、数値・順序・ラッチ条件をそのまま移す。LASMの回帰比較は、同じ発射条件で位置サンプルをフレームごとに比較し、許容誤差を浮動小数点丸めだけにする。

## 4AGM — ロフト／トップアタック

対地弾は発射直後に上昇し、目標上空から明確に角度を付けて降下する。

```js
ctx.addSpwGuidanceProfile("4agm", {
  mode: "loftTopAttack",
  loftAboveLaunch: 120,
  loftAboveTarget: 180,
  terrainClearance: 75,
  terminalAngleDeg: 55,
  terminalRange: [280, 560],
  latch: true
});
```

### 発射時に固定する値

地形問い合わせを毎フレーム多重に行わない。発射時に、発射点から目標までを5点サンプルし、経路上の最大地表高を取る。

```js
const pathTerrainMax = sampleSurfaceHeightAlongSegment(
  launchPosition,
  target.position,
  5
);

missile.loftApexY = Math.max(
  launchPosition.y + profile.loftAboveLaunch,
  targetAimY + profile.loftAboveTarget,
  pathTerrainMax + profile.terrainClearance
);
```

### 目標点

既存の種別を使う。

```js
function surfaceTargetAimPoint(target, out) {
  out.copy(target.group.position);
  const box = target.spec.hitBox;
  if (box) out.y += box.y * 0.35;
  else if (target.spec.hitRadius) out.y += target.spec.hitRadius * 0.35;
  return out;
}
```

地上・艦とも実体中心付近を狙い、海面や地形そのものを狙わない。

### 3フェーズ

1. `loft`: 水平には目標へ進みつつ、`loftApexY` を狙う。
2. `cruise`: apex付近を短く維持し、目標上空へ詰める。
3. `terminal`: 目標実体へ直接向け、一度入ったら戻らない。

終末開始距離:

```js
const drop = Math.max(0, missile.position.y - targetAimY);
const angle = THREE.MathUtils.degToRad(profile.terminalAngleDeg);
const geometric = drop / Math.tan(angle);
const terminalStart = THREE.MathUtils.clamp(
  geometric,
  profile.terminalRange[0],
  profile.terminalRange[1]
);

if (horizontalDistance <= terminalStart) {
  missile.guidancePhase = "terminal";
  missile.guidanceLatched = true;
}
```

4AGMでは `POPUP_MIN_DROP` を読まない。低い地上目標に対して高度差60m条件が早期成立し、遠方で降下を始める経路を断つ。

### 視覚上の差

- LASM: 発射高度を保って水平に接近し、最後だけ浅く降下
- 4AGM: 発射後に上昇し、頂点を作り、55度前後で急降下

追加メッシュ・追加テクスチャは不要。軌道だけで区別できる。

## 近接信管と高速すり抜け

誘導が正しくても、1フレームで地上目標のhitBoxを飛び越すと外れる。地上／艦は、前位置→次位置の線分と実体hit volumeを交差判定する。

```js
function guidedMissileHitsTarget(missile, target, nextPosition) {
  if (target.ground || target.surface) {
    if (target.spec.hitBox) {
      return segmentIntersectsTargetBox(
        missile.previousPosition,
        nextPosition,
        target,
        missile.fusePadding
      );
    }
    return segmentDistanceToPoint(
      missile.previousPosition,
      nextPosition,
      target.group.position
    ) <= (target.spec.hitRadius || 0) + missile.fusePadding;
  }

  // 航空機・ヘリは既存の空中近接信管をそのまま使う。
  return existingAirProximityFuse(missile, target, nextPosition);
}
```

`segmentIntersectsTargetBox` はtargetのworld matrixを逆変換し、ローカルAABBへ線分を入れる。headingを持つ地上車両や艦にも一致する。

地形衝突は別判定のままにする。地面へ当たっただけで対象撃破にせず、対象hit volumeと交差した場合だけ命中を記録する。

`proximityFuseFor` は少なくとも次を明示する。

- `ground || surface` → `hitBox`／`hitRadius`由来
- ヘリ／航空機 → 既存air sphere
- 4AGMの終末誘導とfuseが同じ `surfaceTargetAimPoint` を共有

## debug

```js
debug.guidanceProbe = () => playerMissiles.map((missile) => ({
  id: missile.id,
  weapon: missile.weaponKey,
  mode: missile.guidance.mode,
  phase: missile.guidancePhase,
  targetId: missile.targetId,
  targetKind: missile.target?.ground ? "ground" :
    missile.target?.surface ? "surface" : "air",
  horizontalDistance: missile.horizontalDistance,
  altitude: missile.mesh.position.y,
  aimY: missile.currentAimPoint.y,
  fuseSource: missile.fuseSource
}));
```

## 検証

1. LASMのフレーム別位置が変更前と一致。
2. 4AGMは発射後に明確な上昇量を持ち、terminalへ一度だけ遷移。
3. 海面近く、平地、台地、山腹に置いた地上目標へ命中。
4. 4発同時発射で全弾が別目標を追ってもfps60。
5. 地面へ落ちた弾が、離れた地上目標を誤爆扱いしない。
6. 高速でhitBoxを跨ぐ1フレームでもswept testが命中を拾う。
7. 艦へのLASM命中率と見た目が回帰しない。

---

# まとめ — 本体側に追加するもの

## 一度きりの直接修正

- C: CSS変数で味方青／敵赤
- D: hold値2倍、上位priorityの即時割込み、古いNORMALの破棄
- E: 自機銃の黄橙色
- F: mountainの回転楕円共有判定
- G: shoreマテリアルのpolygon offset
- A-0: 12発/秒 → 6発/秒

これらにpayload APIを作らない。

## add-only API

```js
ctx.addPlayerGunProfile(aircraftId, def);
ctx.addSpwGuidanceProfile(weaponKey, def);
```

追加する読み取り専用テーブル:

```js
ctx.tables.PLAYER_GUN_PROFILES
ctx.tables.SPW_GUIDANCE_PROFILES
```

両方ともschema検証、duplicate拒否、registry snapshot、finalize freezeへ載せる。

## 既存契約を守る条件

- `AIRCRAFT_TYPES` と `SPW_TYPES` の既存エントリは書き換えない
- HPと敵role倍率へ触らない
- `gunDamage` / `gunGroundBonus` は既存正本のまま
- 未登録機のA-0/E以外はlegacy挙動
- 未登録兵装は完全にlegacy誘導
- ヘリ／航空機／地上／艦は既存flagsで分類
- gunsightと実弾は同じ解を共有
- guidanceとfuseは同じtarget aim/hit volumeを共有
- F/Gの追加・変更資源は既存 `keep*` / `addRoot` 契約を通す
- 8回world切替でGPUメモリが基準へ戻る

この設計を本体へ入れた後、22機のgun profileとLASM／4AGM guidance profileは、別payloadとして登録可能になる。