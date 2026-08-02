export default function register(ctx) {
  const { GROUND_TYPES } = ctx.tables;
  const trainCar = GROUND_TYPES.trainCar;
  if (!trainCar) {
    throw new Error("[civilRescue] trainCar ground type is not registered");
  }

  // === 1. GROUND_TYPES 登録 ================================================
  //
  // 土台は trainCar。理由は GROUND_TYPES の中で「非武装(aa:null) かつ mobile を
  // 持つ」唯一のエントリだから。撃ってこないユニットは撃ってこないエントリから
  // 派生させるのが安全で、aa を null に上書きし忘れる事故が構造的に起きない。
  // （tank も aa:null だが mobile 15/28 の戦車。民間車の速度帯とは無関係。）
  //
  // 上書きするのは label / role / 寸法 / HP と、道路を走る速度だけ。
  // 残りの戦闘性能値（tracerColor / explosionColor / smokeHeight 等）は
  // spread のまま＝ BALANCE TODO: placeholder。

  ctx.addGroundType("ambulance", {
    ...trainCar,
    key: "ambulance",
    label: "AMBULANCE",
    role: "Civil Medical Vehicle",
    // BALANCE TODO: placeholder. 撃つ対象ではないので HP は
    // 「流れ弾一発で消えない」以上の意味を持たない。trainCar の 98
    // （＝標準ミサイル1発）は軍用貨車の値なので、非装甲の民間バン相当に
    // 落として 30 を仮置き。
    hp: 30,
    // --- 寸法: 全長6m --------------------------------------------------
    // モデルの実寸に一致させる。車体は z -3.0 .. +3.0、全幅 2.3m（ミラー含め
    // 2.5m）、屋根の天面 y=2.75、警光灯の頂点 y=2.95。
    hitRadius: 8,
    crash: Object.freeze({ halfLen: 3, halfBeam: 1.2, top: 2.8 }),
    hitBox: Object.freeze({ x: 2.5, y: 2.9, z: 6 }),
    // BALANCE TODO: placeholder. 煙柱の高さ。車高2.9mに合わせて trainCar の 5 から下げた。
    smokeHeight: 3,
    // 非武装。trainCar から引き継いだ aa:null をそのまま明示しておく
    // （spread 元が変わっても撃たない側に倒れるようにするための冗長記述）。
    aa: null,
    // BALANCE TODO: placeholder. 道路を流れる民間車。軍用車列(tank 15 / adTank 13)
    // よりやや速い程度で、追い越さない値に置いた。turnRate は trainCar の
    // 120deg/s（レール用の巨大値）だと交差点でコマのように回るので、
    // 道路車両の帯（tank 28 / mobileSam 26）に合わせる。
    mobile: Object.freeze({ speed: 18, turnRate: (Math.PI / 180) * 30 }),
    // レーダー上のブリップ色。軍用のオレンジ系(#ffc47a)の中で
    // 「白い点＝撃つな」が読めるようにする（hospitalShip と同じ規約）。
    radarColor: "#eaf4ff"
  });

  ctx.addGroundType("evacBus", {
    ...trainCar,
    key: "evacBus",
    label: "EVAC BUS",
    role: "Civil Evacuation Bus",
    // BALANCE TODO: placeholder. 救急車より大きいだけの非装甲車体。
    // 「うっかり一発では消えない」程度に 45 を仮置き。
    hp: 45,
    // --- 寸法: 全長12m -------------------------------------------------
    // 車体は z -6.0 .. +6.0、全幅 2.55m、屋根の天面 y=3.35、
    // 屋根の白布パネルの天面 y=3.45。
    hitRadius: 13,
    crash: Object.freeze({ halfLen: 6, halfBeam: 1.3, top: 3.4 }),
    hitBox: Object.freeze({ x: 2.6, y: 3.5, z: 12 }),
    // BALANCE TODO: placeholder. 車高3.5mに合わせた煙柱高さ。
    smokeHeight: 4,
    aa: null,
    // BALANCE TODO: placeholder. 満載の大型バス。救急車より遅い。
    mobile: Object.freeze({ speed: 14, turnRate: (Math.PI / 180) * 22 }),
    radarColor: "#eaf4ff"
  });

  // === 2. 救急車のジオメトリ ================================================
  ctx.addGroundModel("ambulance", {
    build(env) {
      const { THREE, geometry, add, makeAircraftMaterial, extraMaterials, dark, steel } = env;

      // 白い車体。既存の light(0xd6dde2, 0.3, 0.45) は金属寄りで、夜のマップだと
      // 灰色に沈む。metalness=0 の完全拡散にし、emissive を色の 0.30 倍まで
      // 持ち上げて自照させる（makeAircraftMaterial の既定は 0.045 倍）。
      // baseEmissive も一緒に直さないと、被弾フラッシュから戻るときに
      // updateAircraftFlash が既定値へ書き戻して暗くなる。
      const white = makeAircraftMaterial(0xfbfdfe, 0.0, 0.92);
      white.emissive.setHex(0xfbfdfe).multiplyScalar(0.3);
      white.userData.baseEmissive = white.emissive.clone();
      extraMaterials.push(white);
      // 赤十字は unlit。夜間でも必ず赤いまま出る＝識別要件そのもの。
      const red = new THREE.MeshBasicMaterial({ color: 0xd42a24 });
      extraMaterials.push(red);
      // 窓ガラス。白車体との明度差で「バンである」ことを作る唯一の要素なので
      // dark より少しだけ青寄りにして、白の中で帯として読ませる。
      const glass = makeAircraftMaterial(0x2a3b46, 0.55, 0.3);
      extraMaterials.push(glass);
      // 屋根の警光灯。赤十字と同じ unlit で、真上から見たときの点として効く。
      const beacon = new THREE.MeshBasicMaterial({ color: 0xff5a3c });
      extraMaterials.push(beacon);

      // --- 車体 (全長6m: 鼻 z=-3.0 .. 尻 z=+3.0) -------------------------
      // ボンネットのある短い鼻 + 背の高い箱型患者室、という「バン型救急車」の
      // 二段シルエット。真横から見たときの段差がそのまま識別点になる。
      // キャブ+箱: z -1.35 .. +3.0（中心 +0.825 / 長さ 4.35）、車高 y 0.85..2.75
      add(geometry.panel, white, 0, 1.8, 0.825, 2.3, 1.9, 4.35);
      // ボンネット: z -3.0 .. -1.3（中心 -2.15 / 長さ 1.7）、低く前へ突き出す。
      // 1周目は箱との間に隙間が空いて「白い煉瓦が前に浮いている」ように見えた
      // ので、後端を箱の前面 -1.35 に 0.05m 差し込んで必ず接触させる。
      add(geometry.panel, white, 0, 1.4, -2.15, 2.2, 1.1, 1.7);
      // 下回り（シャシ）。ここだけ暗くして車体が宙に浮かないようにする。
      // 1周目は z=+2.9 まで伸ばしていて後輪を半分飲み込んでいたので、
      // 前後の車輪の内側 (z -1.4..+1.3) に収める。
      add(geometry.panel, dark, 0, 0.72, -0.05, 2.15, 0.5, 2.7);

      // --- 窓 -------------------------------------------------------------
      // フロントガラス。ボンネット天面 (y=1.95) と屋根 (y=2.75) の間の
      // 高さ 0.8m の窓。2周目は 0.95 の高さを -0.28 傾けて貼ったせいで、
      // 屋根の上へ突き出し前へ庇のように張り出す「黒い鉤」になった。
      // 高さを段差ぴったりの 0.76 に落とし、傾きも -0.1 に抑えて面内へ収める。
      add(geometry.panel, glass, 0, 2.35, -1.39, 2.06, 0.76, 0.16, -0.1);
      // 運転席のサイドウィンドウ（左右）。フロントガラスの直後に接して置く
      // ので、キャブの窓が前面から側面へ回り込む一続きの帯として読める
      // （2周目は白を挟んで離れていて、側面に開いた穴に見えた）。
      // 患者室側には窓を入れない——側面は赤十字のための白い面として空ける。
      for (const side of [-1, 1]) {
        add(geometry.panel, glass, side * 1.17, 2.35, -0.87, 0.12, 0.76, 0.9);
      }

      // --- ★側面の赤十字（最重要） ---------------------------------------
      // 患者室の白い側面 (z -0.2..+3.0、y 0.85..2.75) の中央に、
      // 高さ1.6mの十字。車体側面 x=±1.15 の 0.06m 外へ出して z-fighting を回避。
      for (const side of [-1, 1]) {
        const x = side * 1.21;
        add(geometry.panel, red, x, 1.75, 1.4, 0.1, 1.6, 0.54);
        add(geometry.panel, red, x, 1.75, 1.4, 0.1, 0.54, 1.6);
      }
      // 後面（観音扉側 z=+3.0）にも1つ。後方から入っても識別できる。
      add(geometry.panel, red, 0, 1.75, 3.06, 1.4, 0.46, 0.1);
      add(geometry.panel, red, 0, 1.75, 3.06, 0.46, 1.4, 0.1);

      // --- ★屋根の赤十字 -------------------------------------------------
      // 上空からの識別はこれが担う。屋根天面 y=2.75 の直上 y=2.79 に薄板で置く。
      // 1周目は z=+0.9 に置いていて、真上から見ると十字が車体後半に寄り、
      // 前半が真っ白に空いていた。屋根 (z -1.35..+3.0) の中心 z=+0.85 に
      // 置きつつ十字を大きくして、屋根の面をきちんと占有させる。
      add(geometry.panel, red, 0, 2.79, 0.85, 0.78, 0.08, 2.9);
      add(geometry.panel, red, 0, 2.79, 0.85, 2.16, 0.08, 0.95);

      // --- 屋根の警光灯 ---------------------------------------------------
      // 屋根の最前端（フロントガラスの直上）に1本の細いバー。
      // 上からも横からも赤い点として出る。
      add(geometry.panel, beacon, 0, 2.86, -1.0, 1.6, 0.22, 0.4);

      // --- 車輪 (4輪) -----------------------------------------------------
      // shipCylinder を Z 軸回りに 90° 倒すと軸が X（車軸方向）になる。
      // 半径0.45 → 下端がちょうど y=0（接地）。前輪はボンネットの下、
      // 後輪は患者室の後端寄りに置いてホイールベースを 3.7m 取る。
      for (const side of [-1, 1]) {
        for (const z of [-1.9, 1.8]) {
          add(geometry.shipCylinder, dark, side * 1.08, 0.45, z,
            0.45, 0.34, 0.45, 0, 0, Math.PI / 2);
        }
      }
      // バンパー2本。鼻先と尻に付けて、真横のシルエットに前後の終端を作る。
      add(geometry.panel, steel, 0, 0.85, -3.02, 2.2, 0.42, 0.24);
      add(geometry.panel, steel, 0, 0.85, 3.02, 2.2, 0.42, 0.24);
      // 返り値なし＝ dish なし。この車に回るものは何もない。
    }
  });

  // === 3. 避難バスのジオメトリ ==============================================
  ctx.addGroundModel("evacBus", {
    build(env) {
      const { THREE, geometry, add, makeAircraftMaterial, extraMaterials, dark, steel } = env;

      // 明色の車体。救急車の純白とは変えて淡いクリーム（スクールバス/避難バスの
      // 色。真横に並べたとき2種が別車と分かる）。夜間でも沈まないよう
      // metalness=0 + emissive 底上げは同じ扱いにする。
      const cream = makeAircraftMaterial(0xf2e7c4, 0.0, 0.9);
      cream.emissive.setHex(0xf2e7c4).multiplyScalar(0.28);
      cream.userData.baseEmissive = cream.emissive.clone();
      extraMaterials.push(cream);
      // ★屋根の白布パネル（白旗の記号）。unlit の純白なので、上空から見たとき
      // クリームの車体の上で最も明るい面になる＝これが上からの識別点。
      const cloth = new THREE.MeshBasicMaterial({ color: 0xffffff });
      extraMaterials.push(cloth);
      // 窓。バスに見えるかどうかはほぼ窓列で決まるので、車体との明度差を
      // 大きく取る（軍用トラックの幌には連続窓が無い）。
      const glass = makeAircraftMaterial(0x2a3b46, 0.55, 0.3);
      extraMaterials.push(glass);

      // --- 車体 (全長12m: 鼻 z=-6.0 .. 尻 z=+6.0) ------------------------
      // 前面が切り立った箱型（キャブオーバー型の大型バス）。ボンネットは
      // 作らない——鼻から尻まで一本の直方体であること自体がバスの記号。
      // 車体 y 0.95..3.35、幅 2.55。
      add(geometry.panel, cream, 0, 2.15, 0, 2.55, 2.4, 12);
      // シャシ / スカート。暗い帯を床下に通して、車体が浮かないようにする。
      add(geometry.panel, dark, 0, 0.8, 0, 2.4, 0.6, 11.6);
      // 屋根の縁（雨樋）。クリーム＋白布の間に細い暗線を入れて、
      // 白布パネルが車体に溶けないようにする。1周目は y=3.3 に置いて高さ 0.2 も
      // あり、真横から見ると「黒い屋根ラインの上に白いものが乗っている」に
      // 見えて布が読めなかった。屋根天面 3.35 のすぐ下へ薄く下げる。
      for (const side of [-1, 1]) {
        add(geometry.panel, dark, side * 1.28, 3.24, 0, 0.08, 0.14, 11.8);
      }

      // --- ★窓列 ---------------------------------------------------------
      // 側面に長い連続窓を1本ずつ。上下位置は座席の目線高 y=2.55。
      // 前扉のぶん前端を少し空けて z -4.2 .. +5.4（中心 +0.6 / 長さ 9.6）。
      for (const side of [-1, 1]) {
        add(geometry.panel, glass, side * 1.29, 2.55, 0.6, 0.1, 1.1, 9.6);
        // 窓割りの柱。連続窓が「ただの黒い帯」に見えないよう、
        // 一定間隔でクリームの細柱を立てる（4本／片側）。
        // 2周目は柱 (x=±1.31) をガラス (x=±1.29) より内側に置いてしまい、
        // ガラスの陰に完全に隠れて窓が1本の黒帯にしか見えなかった。
        // 柱を確実にガラスより外へ出し、幅も太くして影で読ませる。
        for (let i = 0; i < 4; i += 1) {
          add(geometry.panel, cream, side * 1.35, 2.55, -3.0 + i * 2.4, 0.12, 1.18, 0.26);
        }
      }
      // フロントガラス（大型・ほぼ垂直）。バスの顔はこれ。
      add(geometry.panel, glass, 0, 2.5, -6.03, 2.35, 1.5, 0.12, 0.06);
      // 後面窓。
      add(geometry.panel, glass, 0, 2.6, 6.03, 2.1, 1.0, 0.12);
      // 前扉（右側面前寄り）。暗い縦長の板で、乗降口＝民間車の記号。
      add(geometry.panel, dark, 1.29, 2.0, -4.9, 0.1, 2.1, 1.1);

      // --- ★屋根の白布パネル（白旗の記号・最重要） -----------------------
      // 屋根天面 y=3.35 の直上に、大きな白布を2枚ロープで留めた形。
      // 上空から見て「クリームの長物の背に真っ白な2枚」が読めるサイズにする
      // （細かい布を何枚も並べると、2km上空からは屋根が白く塗り潰れただけに
      //  見えて "留めてある布" に読めない。大きく2枚が正解）。
      // 1周目は屋根に 0.14 厚で寝かせただけで、真横からは白が全く見えず
      // 「屋根が明るいバス」にしかならなかった。厚みを 0.34 に増やして
      // 屋根から明確に持ち上げ、幅も車体幅いっぱい (2.5) まで広げて
      // 側面からも白い帯として稜線に出るようにする。
      // 幅は 2.2（車体 2.55 に対し片側 0.17 のクリーム余白）。3周目に 2.5 まで
      // 広げたら真上から屋根がほぼ白一色になり「白く塗った屋根」に見えたので、
      // 縁のクリームを必ず残して「載せた布」に読ませる。
      for (const z of [-2.8, 2.8]) {
        add(geometry.panel, cloth, 0, 3.5, z, 2.2, 0.34, 4.4);
      }
      // 布を留めるロープ／押さえ桟。1周目は布の上に浮いた黒い棒に見えたので、
      // 布と同じ高さで布を「またぐ」位置に置き、さらに車体幅より外へ 0.1 出して
      // 側面へ垂れ下がる端を作る＝後から掛けて縛った布に読ませる。
      for (const z of [-4.7, -0.9, 0.9, 4.7]) {
        add(geometry.panel, dark, 0, 3.5, z, 2.66, 0.4, 0.16);
      }

      // --- 車輪 (6輪: 前1軸 + 後ダブルタイヤ1軸) ----------------------------
      // 大型バスの後輪はダブルタイヤ。1周目は z=3.2/4.5 と離しすぎて
      // 3軸のトラックに見えたので、隣接させて1つの太い後輪として読ませる。
      // 半径0.55 → 下端が y=0（接地）。
      for (const side of [-1, 1]) {
        for (const z of [-4.1, 3.55, 4.25]) {
          add(geometry.shipCylinder, dark, side * 1.18, 0.55, z,
            0.55, 0.3, 0.55, 0, 0, Math.PI / 2);
        }
      }
      // バンパー。
      add(geometry.panel, steel, 0, 1.0, -6.05, 2.5, 0.5, 0.28);
      add(geometry.panel, steel, 0, 1.0, 6.05, 2.5, 0.5, 0.28);
      // 返り値なし＝ dish なし。武装もレーダーも無い。
    }
  });
}
