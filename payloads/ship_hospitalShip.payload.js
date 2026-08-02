// 病院船（マーシー級風、全長270m）— kind: "hospitalShip"
//
// 用途は「撃ってはいけない船」。M14/M36 の人道船団パッケージの中核で、
// 撃破順・識別の倫理を可視化するための非目標。だから設計の重心は
// 戦闘性能ではなく **一目で軍艦でないと分かること** に置いてある:
//
//   * 真っ白な船体（既存5艦は全部グレー）。夜間でも識別できるよう
//     roughness を落として明るく返す白を専用に作る。
//   * 舷側の巨大な赤十字が最重要。左右両舷に、船体の高さいっぱいの
//     十字を貼る（MeshBasic なので陰に沈まない＝夜でも赤い）。
//   * 舷側を一周する緑の帯（ジュネーブ条約の病院船標識に倣った塗り分け）。
//   * 客船型の高い白い上部構造。軍艦のような低くて長い甲板室ではなく、
//     箱を3段積んだ客船のブリッジ塊。
//   * 煙突1本（イージス2本／空母0本に対する識別点）。
//   * 艦尾ヘリ甲板にも赤十字。上から見たときの識別はこれが担う。
//   * 武装ゼロ。砲塔・VLS・CIWS のいずれも描かない。
//
// 既存艦のイディオムに合わせている点:
//   - 艏が -Z、y は喫水面から上、寸法は実寸メートル（carrier 330m / aegis 155m）
//   - 部品は geometry の共有キャッシュ + add() のみ。新規ジオメトリを作らない
//   - friendly フラグで塗り分けを分岐（既存艦と同じ規約）。ただし病院船は
//     どちらの陣営から見ても白いのが識別の要なので、船体白は共通で、
//     赤十字の赤・緑帯の緑だけを僅かに寄せる
//   - 独自マテリアルは全て extraMaterials.push（未登録＝リーク）
export default function register(ctx) {
  const { SHIP_TYPES } = ctx.tables;
  const carrier = SHIP_TYPES.carrier;
  if (!carrier) {
    throw new Error("[hospitalShip] carrier ship type is not registered");
  }

  // --- 1. SHIP_TYPES 登録 -------------------------------------------------
  //
  // 土台は carrier。理由は「戦闘しない大型船」という点で最も近いから
  // （landingShip は 165m でスケールが遠く、上陸判定 landing:true も付いてくる）。
  // 上書きするのは label / role / 寸法 / HP / 武装無効化 / subsystems だけ。
  ctx.addShipType("hospitalShip", {
    ...carrier,
    key: "hospitalShip",
    surface: true,
    label: "HOSPITAL",
    role: "Hospital Ship",
    // BALANCE TODO: placeholder. 撃つ対象ではないので HP は「うっかり
    // 一発では沈まない」以上の意味を持たない。carrier の 1040 は過大、
    // 98の倍数規約に乗せて 588（= 標準ミサイル6発）を仮置き。
    hp: 588,
    // BALANCE TODO: placeholder。病院船は逃げも隠れもしないので carrier 相当。
    cruiseSpeed: 10,
    turnRate: carrier.turnRate,

    // --- 寸法: 全長270m ---------------------------------------------------
    // モデルの実寸に一致させる。船体は z -135(艏の先端) .. +136(艦尾)、
    // 最大幅 32m(船体) / 33m(救命艇の張り出し)、船体天面 y=20、
    // 上部構造頂部 y=53、マスト頂点 y=68。
    hitRadius: 124,
    crash: Object.freeze({ halfLen: 136, halfBeam: 17, top: 26 }),
    hitBox: Object.freeze({ x: 34, y: 44, z: 272 }),
    sinkDepth: 36,
    blastSpread: 52,
    smokeOffset: 46,   // 煙突の z 位置（下の add と一致）
    smokeHeight: 24,
    sternOffset: 132,
    bowOffset: 134,

    // --- 武装無効化 -------------------------------------------------------
    // 病院船は撃たない。aaFiringPoints() は subsystems に kind:"aa" が
    // 1つも無いとき aaMounts の旧経路へ落ちるので、そこを二重に殺す:
    //   tracers 0 → 発射点ゼロ → shipAaBurst が mounts.length===0 で即 return
    //   range   0 → その手前の距離判定で必ず早期 return
    // ENEMY_MISSILE_PROFILES に hospitalShip の項が無いので SAM も撃たない。
    aaMounts: Object.freeze([0]),
    aaHeight: 0,
    aa: Object.freeze({ range: 0, cooldownMin: 99, cooldownSpread: 0, damage: 0, maxHitChance: 0, tracers: 0 }),

    // --- subsystems: 空 ---------------------------------------------------
    // 非武装なので NEXT 巡回に乗る部位は存在しない。空配列は
    // spawnShipSubsystems がゼロ回ループするだけで、艦体そのものだけが
    // ロック候補になる（＝「この船をロックしてしまった」が player に
    // はっきり見える）。
    subsystems: Object.freeze([]),

    // レーダー/曳光/爆発色。曳光は撃たないので使われないが、必須キーの
    // 形は崩さない。レーダー色だけは白寄りにして、軍艦のオレンジ系ブリップ
    // の中で「白い点＝撃つな」が読めるようにする。
    radarColor: "#eaf4ff",
    tracerColor: 0xffffff,
    explosionColor: 0xffd8c0
  });

  // --- 2. 船体ジオメトリ ---------------------------------------------------
  ctx.addShipModel("hospitalShip", {
    build(env) {
      const {
        geometry, add, friendly,
        // hull/deck/house/olive2 は使わない。この船は白が識別要件なので
        // 灰色の標準3材質を一切当てない（暗部の dark と白物の light、
        // 白ペイントの markings だけ既存艦と共有する）。
        dark, light, markings,
        THREE, makeAircraftMaterial, extraMaterials
      } = env;

      // 病院船の識別色は3つとも標準7材質に無いので専用に作る。
      // 全て extraMaterials に入れる（＝モデル破棄時に一緒に dispose される）。
      //
      // 白船体: metalness=0 / roughness=0.95 の完全拡散。既存艦の light
      // (0xd6dde2, 0.3, 0.45) は金属寄りで、環境光の弱い夜のマップだと
      // 灰色に沈む。病院船は「夜でも白い」が識別要件なので、金属成分を
      // 抜いて拡散反射だけで返す方向に振る。makeAircraftMaterial は色の
      // 0.045 を emissive に回すので、白は自動的に最も明るい底上げを得る。
      const white = makeAircraftMaterial(0xfbfdfe, 0.0, 0.95);
      // makeAircraftMaterial 既定の emissive は色の 0.045 倍で、既存の灰色艦
      // が周囲に溶けない程度の底上げしかしない。病院船は「夜でも白い」が
      // 識別要件なので、ここだけ 0.30 倍まで持ち上げて自照させる。
      // baseEmissive/baseIntensity も更新しないと、被弾フラッシュが戻るとき
      // updateAircraftFlash が既定値へ書き戻して暗くなるので必ず一緒に直す。
      white.emissive.setHex(0xfbfdfe).multiplyScalar(0.3);
      white.userData.baseEmissive = white.emissive.clone();
      extraMaterials.push(white);
      // 上部構造の白は船体よりごく僅かに暗く、段差が影だけに頼らず読めるように。
      const houseWhite = makeAircraftMaterial(0xe9eff2, 0.0, 0.9);
      houseWhite.emissive.setHex(0xe9eff2).multiplyScalar(0.24);
      houseWhite.userData.baseEmissive = houseWhite.emissive.clone();
      extraMaterials.push(houseWhite);
      // 赤十字と緑帯は MeshBasic。陰の影響を受けないので、夜のミッションでも
      // 舷側のマークが必ず赤いまま出る＝識別の要件そのもの。
      const red = new THREE.MeshBasicMaterial({ color: friendly ? 0xe03a34 : 0xd42a24 });
      extraMaterials.push(red);
      const green = new THREE.MeshBasicMaterial({ color: friendly ? 0x3fbf6a : 0x35a95e });
      extraMaterials.push(green);

      // === 船体 (270m: 艏の先端 z=-135 .. 艦尾 z=+135) =====================
      // 主船体ボックス: z -110..+122 (中心 +6 / 長さ 232)。艏の楔はこの
      // 前端 -110 にぴったり接して 25m 伸び、先端がちょうど -135 になる
      // （= 全長 270m）。carrier の hull(-145..155)+bow(tip -175) と同じ
      // 「箱の前端に楔を継ぐ」組み方。
      add(geometry.panel, white, 0, 9, 6, 32, 22, 232);
      // 艏の楔: ConeGeometry(1,1,4) を -X 軸回りに -90° 倒すと、高さ(sy)が
      // -Z 方向へ伸びる。底面(半径 sx)を箱の前端 -110 に合わせるので
      // 中心 z = -110 - 25/2 = -122.5、sy=25、半径 16 = 箱の半幅と一致。
      add(geometry.shipBow, white, 0, 9, -122.5, 16, 25, 11, -Math.PI / 2);
      // 喫水下の暗い帯（既存全艦が持つ「船底ライン」。ここだけ白くない）。
      add(geometry.panel, dark, 0, 1.6, 6, 32.6, 3.2, 233);
      // 艦尾の切り落とし（トランサム）。
      add(geometry.panel, white, 0, 9, 126, 30, 22, 20);

      // === 緑帯（舷側を一周） =============================================
      // 白船体の上端すぐ下に細い緑帯。病院船標識の緑帯に相当。
      // 船体の舷側 x=±16 の外へ 0.15m 出して z-fighting を避け、
      // 前端は箱の前端 -110 で止める（楔の上には乗せない）。
      add(geometry.panel, green, -16.15, 17.2, 6, 0.3, 2.4, 232);
      add(geometry.panel, green, 16.15, 17.2, 6, 0.3, 2.4, 232);
      add(geometry.panel, green, 0, 17.2, 136.2, 30, 2.4, 0.3);
      // 艏の楔の上には帯を回さない。1〜2周目で斜め板を試したが、四角錐の
      // 斜面に平板を沿わせると必ずどこかが面から飛び出し、真上・前方から
      // 「船首から緑の棘が生えている」ように見えた。帯は箱の側面だけで
      // 十分に一周して読める。

      // === 舷側の大赤十字（★最重要） =====================================
      // 左右両舷、船体側面の高さいっぱい（縦16m）の十字。船体の白い側面は
      // y 約 -2..20 なので、中心 y=9 に縦16mを置くと上下に余白1.5mずつ残る。
      // 緑帯(x=±16.15)より更に外の x=±16.35 に出して確実に手前へ。
      // 270m は長いので前後2箇所（上部構造の真下 z=-20 と、艏寄り z=-84）。
      for (const side of [-1, 1]) {
        const x = side * 16.35;
        // 主マーク: 縦棒 高さ16m×奥行5.4m / 横棒 長さ16m×高さ5.4m
        add(geometry.panel, red, x, 9, -20, 0.3, 16, 5.4);
        add(geometry.panel, red, x, 9, -20, 0.3, 5.4, 16);
        // 艏寄りの副マーク（一回り小さい 12m）
        add(geometry.panel, red, x, 9, -84, 0.3, 12, 4.1);
        add(geometry.panel, red, x, 9, -84, 0.3, 4.1, 12);
        // 艦尾寄りの副マーク。後方から入っても必ず1つは視界に入る。
        add(geometry.panel, red, x, 9, 76, 0.3, 12, 4.1);
        add(geometry.panel, red, x, 9, 76, 0.3, 4.1, 12);
      }

      // === 上部構造（客船型：白い箱を4段の階段状） ========================
      // 船体天面 y=20。ここから上へ積む。軍艦の「低くて長い甲板室」とは逆に、
      // 客船は船体高さと同じくらいの塊が船の前半に乗る＝これが遠距離での
      // 最大の識別点なので、高さを惜しまない（最上部 y=52）。
      //
      // 露天甲板（歩ける面）。既存艦は暗い deck 材を敷くが、この船だけは
      // 真上から見たとき甲板が黒く見えてはいけない（2周目で実際にそう
      // なった＝赤十字が黒地に乗って軍艦に見える）。船体白よりごく僅かに
      // 暗い houseWhite を敷いて、明度差だけ付ける。
      add(geometry.panel, houseWhite, 0, 20.4, 6, 31, 0.9, 230);
      // 1段目: 船体幅いっぱいの長い船室ブロック (y 21..32、z -88..+62)。
      // 後端を +62 まで伸ばして煙突(z 36..56)の土台にする。
      add(geometry.panel, houseWhite, 0, 26.5, -13, 29, 11, 150);
      // 2段目 (y 32..41)。
      add(geometry.panel, houseWhite, 0, 36.5, -32, 24, 9, 104);
      // 3段目 (y 41..48)。
      add(geometry.panel, houseWhite, 0, 44.5, -44, 18, 7, 70);
      // 4段目＝ブリッジ (y 48..53)。前端を最も艏側へ張り出させて階段状に。
      add(geometry.panel, houseWhite, 0, 50.5, -62, 14, 5, 30);
      // ブリッジ前面の窓（斜めに寝かせた暗い板）。
      add(geometry.panel, dark, 0, 51, -76.6, 13, 4, 0.6, -0.3);
      // 各段の屋根に暗い「縁だけ」の手すりを入れて、白＋白の段差が影に
      // 頼らず読めるようにする。ここは板を屋根いっぱいに敷いてはいけない
      // ——真上から見たとき屋根が黒く塗り潰され、白い船に赤十字という
      // 識別像が消える（1周目で実際にそうなった）。左右2本ずつの細い帯のみ。
      const railings = [
        { y: 32.2, z: -13, halfBeam: 14.5, len: 150.6 },
        { y: 41.2, z: -32, halfBeam: 12.0, len: 104.6 },
        { y: 48.2, z: -44, halfBeam: 9.0, len: 70.6 },
        { y: 53.2, z: -62, halfBeam: 7.0, len: 30.6 }
      ];
      for (const rail of railings) {
        for (const side of [-1, 1]) {
          add(geometry.panel, dark, side * rail.halfBeam, rail.y, rail.z, 0.7, 0.9, rail.len);
        }
      }
      // 窓列: 各段の側面に暗い水平帯を通す。客船に見えるかどうかはほぼ
      // これで決まる（軍艦の甲板室には連続窓が無い）。
      for (const side of [-1, 1]) {
        add(geometry.panel, dark, side * 14.6, 28.5, -13, 0.4, 2.8, 148);
        add(geometry.panel, dark, side * 12.1, 37.5, -32, 0.4, 2.6, 102);
        add(geometry.panel, dark, side * 9.1, 45.5, -44, 0.4, 2.4, 68);
      }

      // === 煙突1本 ========================================================
      // z=+46（spec.smokeOffset と一致）。客船型に倣って太く短い1本を
      // 1段目屋根の上に立てる。軍艦の細いマスト状煙突との識別点。
      add(geometry.panel, houseWhite, 0, 40, 46, 13, 16, 20);
      add(geometry.panel, dark, 0, 48.5, 46, 13.6, 1.8, 20.6);
      // 煙突の左右にも赤十字（側面図でここが一番目に入る高さ）。
      for (const side of [-1, 1]) {
        add(geometry.panel, red, side * 6.65, 40, 46, 0.3, 10, 3.4);
        add(geometry.panel, red, side * 6.65, 40, 46, 0.3, 3.4, 10);
      }

      // === マスト（武装なし・航海灯と航海レーダーのみ） ====================
      add(geometry.shipCylinder, light, 0, 62, -62, 0.6, 18, 0.6);
      add(geometry.shipOctPlate, light, 0, 67.2, -62, 3.4, 0.5, 3.4);
      add(geometry.panel, light, 0, 64, -62, 8, 0.5, 0.5);

      // === 救命艇（客船の識別記号。舷側にずらりと並ぶ） ====================
      // 2段目デッキの外側に片舷5艇ずつ。軍艦にはこの列が無い。
      for (const side of [-1, 1]) {
        for (let i = 0; i < 5; i += 1) {
          const pz = -66 + i * 28;
          add(geometry.shipCylinder, light, side * 13.4, 34.5, pz, 1.7, 9, 1.7, Math.PI / 2);
          add(geometry.panel, dark, side * 13.4, 37.6, pz, 1.2, 1.4, 9.4);
        }
      }

      // === 艦尾ヘリ甲板 + 赤十字 ==========================================
      // 上部構造(1段目の後端 z=+62)より後ろ、z=+100 を中心にした平らな甲板
      // (z 66..134)。艦尾の露天甲板をまるごと使う。ここも白。
      add(geometry.panel, houseWhite, 0, 21.6, 100, 28, 1.4, 68);
      // 着艦円（既存艦と同じ shockRing の使い方）。ただし既存艦が使う
      // markings(白ペイント)では白甲板の上で完全に消えるので、この船だけ
      // dark を当てて「白地に黒い円」にする。3周目で白のまま出して
      // 一切見えなかったのを直したもの。十字(22m)が内側に収まる半径14。
      add(geometry.shockRing, dark, 0, 22.5, 100, 14, 14, 1, -Math.PI / 2);
      // 甲板上の赤十字。真上から見たときの識別はこれが担う。
      // 甲板天面 y=22.3 の直上 y=22.6 に薄板で置く。
      add(geometry.panel, red, 0, 22.6, 100, 6.6, 0.3, 22);
      add(geometry.panel, red, 0, 22.6, 100, 22, 0.3, 6.6);
      // 甲板の縁の暗いコーミング。甲板が宙に浮いて見えないように。
      for (const side of [-1, 1]) {
        add(geometry.panel, dark, side * 14.2, 20.9, 100, 0.5, 1.6, 68);
      }

      // === 上部構造の屋根にも赤十字 ========================================
      // 真上から見て「白い長物の中央に赤十字」が読めるようにする。
      // 屋根は段ごとに前寄りへ短くなるので、上の段に隠れない露天部だけに置く:
      //   1段目 z -88..+44、2段目が z -84..+20 を覆う → 露天は z +20..+44
      //   2段目 z -84..+20、3段目が z -79..-9 を覆う → 露天は z -9..+20
      // 1段目屋根の露天部のうち、煙突(z 36..56)より艏側 (中心 z=28)
      add(geometry.panel, red, 0, 32.8, 28, 4.6, 0.3, 15);
      add(geometry.panel, red, 0, 32.8, 28, 15, 0.3, 4.6);
      // 2段目屋根の露天部 (中心 z=5、長さ22に収める)
      add(geometry.panel, red, 0, 41.8, 5, 5.4, 0.3, 18);
      add(geometry.panel, red, 0, 41.8, 5, 18, 0.3, 5.4);
      // 艏の露天甲板 (上部構造の前端 z=-88 より前、z -110..-88) にもう一つ。
      // 真上から見て船の前後どちらの端にも赤十字がある状態にして、
      // 進入方向によらず1周目の視認で識別できるようにする。
      add(geometry.panel, red, 0, 21.1, -99, 5.4, 0.3, 18);
      add(geometry.panel, red, 0, 21.1, -99, 18, 0.3, 5.4);
    }
  });
}
