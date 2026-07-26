// rus_act2a - ロシア陣営編「OPERATION DELUGE」ACT 2 前半 (r06 - r10)
//
// docs/story_bible.md §4 の ACT 2 は「押し返される／モチーフ: 嵐」。米編 ACT 2 が
// 「秩序を敷く」＝攻め上がる5本なのに対し、この5本は同じ5つの戦闘を守勢側から飛ぶ。
// マップ・時刻・天候は対応する米編ミッションと共通（同じ戦闘の裏側なので）:
//
//   r06 GLACIER SHIELD  = m-glacier の裏 (glacierCanyon)  氷河回廊のレーダー網を「守る」
//   r07 EYE OF THE STORM= m-storm   の裏 (stormOcean)     荒天を突く強行偵察・攻撃
//   r08 SCRAMBLE        = m-night   の裏 (nightBase)      夜襲を受けた基地から緊急発進
//   r09 IRON UMBRELLA   = m-convoy  の裏 (coastalPlain)   上陸機甲部隊の上空援護
//   r10 THE LAST TRAIN  = m-train   の裏 (desertBasin)    補給列車を守る（★守れない）
//
// ★この5本に地上ユニットを1つも置いていないのは意図的な設計判断である。
// spawnMissionGround() は mission.groundUnits の全要素を spawnGroundUnit() 経由で
// enemies[] に入れる。tgt: false を付けても「撃たれない目標」になるだけで、
// SAMサイトも対空車も**プレイヤーを撃つ**（m-train の脇の aaGun 2門がまさにそれ）。
// つまり「自軍のレーダー網」「自軍の基地」「自軍の車列」「自軍の列車」を画面に出す
// 手段が現状のエンジンには無い——出せば自分の守るべき物に撃たれる。
// friendlies[] は FRIENDLY_DEPLOYMENTS（index.html、ミッションキー引き）が持っており
// payload ctx からは触れないので、守る対象は briefing / story / epilogue と無線で
// 存在させ、盤面は純粋な航空戦にしてある。ACT 2 露編が全部「迎撃」の形になるのは
// 物語上も正しい: 押し返される側は、常に相手が来た場所へ上がっていく。
//
// 敵＝西側同盟軍 AEF 機。ACT 2 は中盤なので f15 / f14 / f35c / fa18 が中心、
// 練度は regular（＝ENEMY_ROLES.line の既定）と veteran（elite）。
// f16 は数を埋める trash 役に残し、露編 ACT 3 以降に f22 を取っておく。
//
// 話者: command → NORTHSTAR、wingman → SICKLE 2、enemy → AEF機。
// ※ index.html の RADIO_SPEAKERS は現状キャンペーン非対応（label が SKYEYE /
//   HAMMER 2 固定）なので、露編を開けるときにメインループ側で出し分けが要る。
//   payload からは触れないため、ここでは台詞の中身だけを露編の声にしてある。
//
// 編成比は spec_wave_variety §4 の既定形 TGT : 非TGT = 1:1.5〜2 に全本収めた:
//   r06 5:9 (1:1.80) / r07 4:7 (1:1.75) / r08 6:10 (1:1.67) /
//   r09 5:9 (1:1.80) / r10 6:10 (1:1.67)
// 各波は2〜9機、無限湧きなし。1波目以外の非TGT波は必ず `concurrent`:
// 非TGT波は「指定目標が全滅したら次へ」の進行に乗らないので、concurrent でなければ
// 永久に湧かない（米編 m-storm / m-night / m-convoy / m-train が全て同じ制約の下にある）。
export default function register(ctx) {
  ctx.addMission({
    key: "r06",
    campaign: "rus",
    world: "glacierCanyon",
    title: "GLACIER SHIELD",
    jp: "氷河回廊のレーダー網に敵攻撃隊が接近中。谷へ降りる前に、指定の攻撃機を叩き落とせ。",
    act: 2,
    storyNo: 6,
    // ★物語フック（依頼の必須項目）: 氷下神殿の上空を飛ぶ。ミハイル老整備長の
    // 回想を story 側に置いた。epilogue ではなく story なのは、この一言を
    // 「飛ぶ前に聞いた言葉」として、氷の上を飛んでいる間じゅう効かせたいから。
    story: "氷河回廊のレーダー網は、我々の目だ。あれが潰れれば北の空は見えなくなる。\n出撃前、ミハイル老整備長が氷の下を指して言った——「あれが我々の元の形だ」。",
    epilogue: [
      "攻撃隊は回廊の入口で頓挫。レーダー網は生きたまま朝を迎えた。",
      "低空へ降りたとき、氷の下の巨石が一瞬だけ見えた。環状に並び、削った痕は無い。",
      "文字が無いのに、あれは何かを言っている。ミハイルの言葉だけが残った——「あれが我々の元の形だ」"
    ],
    // 米編 m-glacier の完全な裏。あちらは「壁のレーダーサイト4基とSu-25が2機」を
    // 指定目標にした対地侵攻で、ここではその4基がこちらの持ち物になる。
    // 指定目標は「回廊を潰しに来た攻撃隊」5機:
    //   B-52 2機 = 回廊の飽和爆撃を担当する本命。290HPの3発機体で、鈍重ゆえに
    //     谷底へ降りたら逃げ場が無い——m-glacier の Su-25 と同じ役どころを、
    //     同じ谷で、逆側から演じさせている
    //   F/A-18F 3機 = 先行して壁のSAMを叩くストライク隊。135HPで旋回33。
    //     爆撃機より先に来るので、プレイヤーは「重い方から潰すか、速い方から潰すか」を
    //     谷の中で決めることになる
    // 非TGT 9機は F-15 と F-16 の護衛。全部 trash なので付き合う必要は無い。
    // 5 : 9 = 1:1.80。
    sequence: [
      // 先行するストライク隊。谷の高さ（band 1）から入ってくるので、
      // プレイヤーは最初から壁の間へ降りることになる。
      { types: ["fa18", "fa18", "fa18"], band: 1, label: "STRIKE" },
      {
        types: ["f16", "f16", "f15"], tgt: false, band: 2, label: "TOP COVER",
        concurrent: true, role: "trash",
        radio: [
          { speaker: "wingman", text: "上に護衛が3機！ 相手にするな——回廊に降りてくる方を落とせ！", id: "r06-cover-inbound" }
        ]
      },
      // 本命。band 2 で上から入り、回廊へ降りてくる。
      { types: ["bomber", "bomber"], band: 2, label: "HEAVY" },
      {
        types: ["f16", "f16", "f16"], tgt: false, band: 1, label: "ESCORT",
        concurrent: true, role: "trash", delay: 55,
        radio: [
          { speaker: "command", text: "こちらNORTHSTAR。谷底に敵護衛3機。回廊の設備を撃たせるな——爆撃機だ、爆撃機を止めろ。", id: "r06-escort-inbound" }
        ]
      },
      {
        types: ["f15", "f16", "f16"], tgt: false, band: 2, label: "RELIEF",
        concurrent: true, role: "trash", delay: 120
      }
    ],
    // 290HPの重爆2機（各3発）と135HPのホーネット3機、加えて谷底の視界と壁。
    // 米編 m-glacier の 335 と m-storm の 345 の間に置いた——同じ谷、同じ規模の
    // 出撃で、対地4基が空中5機に置き換わっただけなので、時間の桁も同じでいい。
    parTime: 340,
    hasOutro: false,
    map: { x: 0.18, y: 0.22 },
    // 米編 m-glacier のレーダー網は z -800 〜 -2600 の梯子状に敷かれている。
    // 守る側はその上に蓋をするので、戦域の中心をその帯の真ん中に置いた。
    // 半径は m-storm と同じ 9500 相当まで詰めてある: 回廊の外へ出た時点で
    // 守るべき物から離れているのだから、警告リングは早いほうが正しい。
    battleCenter: { x: 0, z: -1700 },
    battleRadius: 9500,
    briefing: "氷河回廊のレーダー網に、敵の攻撃隊が向かっている。あれは我々の目だ。潰されれば北の空が見えなくなる。\n指定目標は5機——先行するF/A-18Fが3機と、後から回廊へ降りてくるB-52Hが2機。\nB-52Hは装甲が厚い。1機につきミサイル3発を見込め。尾部に銃座がある、真後ろに居座るな。\n護衛のF-15とF-16が9機付いているが、こいつらは目標ではない。谷の中で数を追えば、その間に爆弾が落ちる。\n谷底を這え。壁が君の側にある——向こうは高いところから降りてこなければ、あの設備を撃てない。",
    introRadio: [
      { speaker: "command", text: "こちらNORTHSTAR。氷河回廊に敵攻撃隊。設備を撃たれる前に落とせ。", id: "r06-brief" },
      { speaker: "wingman", text: "壁の間を抜けてくるぞ！ こっちの谷だ、こっちの高さで待ち構えろ！", id: "r06-brief-wing" }
    ]
  }, { after: "r05" });

  ctx.addMission({
    key: "r07",
    campaign: "rus",
    world: "stormOcean",
    title: "EYE OF THE STORM",
    jp: "嵐を隠れ蓑に強行偵察を通す。護衛のTu-95を守り抜き、上がってきた敵迎撃機を排除せよ。",
    act: 2,
    storyNo: 7,
    story: "雲底600、視程2キロ。この嵐は我々のために来た。\nこの下を、誰にも見られずに抜ける。",
    epilogue: [
      "強行偵察は成功。前線の向こう側の写真が、はじめてこちらの手に入った。",
      "帰投の途中、雲の切れ目で一瞬だけ敵の単機とすれ違った。撃たなかった。向こうも撃たなかった。",
      "NORTHSTARの記録にはこうある——「接触1。交戦なし。……以上」"
    ],
    // 米編 m-storm の裏。あちらは「気象偵察のTu-95 2機と攻撃機Su-25 2機」を
    // 指定目標にした迎撃で、ここではその Tu-95 と Su-25 がこちらの隊になる。
    // ただし友軍機を盤面に出す手段が payload には無い（冒頭の注記）ので、
    // 「守る対象」は briefing と無線に置き、指定目標は**上がってきたAEFの迎撃機**にした。
    // 物語の目的（偵察を通す）とゲームの目標（迎撃機を落とす）が一致する形なので、
    // r10 のような分離は要らない。
    //
    // ★この盤面の難易度は天候そのものである。米編 m-storm の設計注記と同じ理由で、
    // 相手を強くしていない: 視程2150m、雲底620m、海はほぼ黒。同じ機体でも
    // 見つけるのに時間がかかり、マージ後の再捕捉に時間がかかり、霧から前触れ無く出てくる。
    // その上に強い相手を積むと、出撃が「天候の話」ではなく「格闘戦の話」になる。
    //
    // 指定目標は4機——嵐を抜けて上がってきた F-14D 2機と F/A-18F 2機。
    // F-14D は 150HP / 旋回32 で、この視界では「レーダーで捉えて、見えたときにはもう近い」
    // という一番いやな距離感を作る。非TGT 7機は F-16 の CAP。4 : 7 = 1:1.75。
    sequence: [
      // 最初に上がってくるのは艦隊防空の側。band 1 なので同高度から来る。
      { types: ["f14", "f14"], band: 1, label: "TOMCAT" },
      {
        types: ["f16", "f16"], tgt: false, band: 1, label: "STORM CAP",
        concurrent: true, role: "trash",
        radio: [
          { speaker: "wingman", text: "霧の中に2機！ 目視が効かん——指定目標だけ追え！", id: "r07-cap-inbound" }
        ]
      },
      // 第二陣は別の方位（band 2）から。雲の下から上がってくる。
      { types: ["fa18", "fa18"], band: 2, label: "HORNET" },
      {
        types: ["f16", "f16", "f16"], tgt: false, band: 2, label: "SECOND CAP",
        concurrent: true, role: "trash", delay: 60,
        radio: [
          { speaker: "command", text: "こちらNORTHSTAR。新手3機、雲底の下だ。偵察機の針路を空けろ——数は無視していい。", id: "r07-second-cap" }
        ]
      },
      {
        types: ["f16", "f16"], tgt: false, band: 1, label: "RELIEF",
        concurrent: true, role: "trash", delay: 130
      }
    ],
    // 4機とも戦闘機なので撃墜そのものは速いが、この視程では「探す時間」が
    // 撃つ時間より長い。米編 m-storm の 345 から、目標が3発機体2つぶん軽くなった分を
    // 引いて 320。同じ嵐、同じ探索、軽い相手。
    parTime: 320,
    hasOutro: false,
    map: { x: 0.24, y: 0.61 },
    // 米編 m-storm と同じ場所、同じ大きさ。同じ空だからである。
    // 偵察機は -Z へ抜けていくので、戦域は発進点より少し下流に置いてある。
    battleCenter: { x: 0, z: -1400 },
    battleRadius: 9500,
    briefing: "前線が空域を飲み込んだ。雲底600、視程2キロ以下——この嵐は我々のために来た。\n気象偵察のTu-95が2機、攻撃機Su-25が2機。この下を抜けて、前線の向こう側を撮ってくる。\n君の仕事は、その4機の頭上に蓋をすることだ。\n指定目標は上がってくる敵迎撃機4機——F-14Dが2機、遅れてF/A-18Fが2機。\nCAPのF-16が7機付いてくるが、1機も落とさなくていい。この視界で数を追えば、それだけで時間が尽きる。\nレーダーだけが頼りだ。目で探すな、計器で探せ。",
    introRadio: [
      { speaker: "command", text: "こちらNORTHSTAR。嵐の下を偵察隊が抜ける。上がってくる迎撃機を排除しろ。", id: "r07-brief" },
      { speaker: "wingman", text: "この天気は味方だ。向こうも見えてない——先に見つけた方が勝つぞ！", id: "r07-brief-wing" }
    ]
  }, { after: "r06" });

  ctx.addMission({
    key: "r08",
    campaign: "rus",
    world: "nightBase",
    title: "SCRAMBLE",
    jp: "前線基地が夜襲を受けている。滑走路が生きているうちに上がり、基地上空の敵を排除せよ。",
    act: 2,
    storyNo: 8,
    story: "深夜。基地の警報が鳴った。滑走路の端がもう燃えている。\n上がれる機体から上がれ、という命令だけが来た。",
    epilogue: [
      "基地上空の敵は排除。だが滑走路も燃料庫も、朝を待たずに使えなくなっていた。",
      "格納庫の壁の紋章——世界を囲む蛇——だけが焼け残っていた。塗料はまだ新しい。",
      "我々はここにいた。もう居られない。"
    ],
    // 米編 m-night の完全な裏。あちらは地上11目標が全てで、上がってくる迎撃機は
    // 1機も指定目標ではなかった。こちらはその「上がってくる迎撃機」の側を飛ぶ。
    //
    // ★緊急発進の表現を編成でやっている: 1波目の指定目標が2機しかないのは、
    // 夜襲された基地から最初に上がれるのがそれだけだからではなく、逆に
    // **相手の先鋒が2機しか来ていない**からである。時間が経つほど敵が増える形にした
    // （delay 40 / 95 / 165 の3段）ので、盤面は「上がるのが遅れるほど不利になる」
    // 夜間のスクランブルそのものの形をしている。
    //
    // 指定目標は6機——基地を叩きに来た F-35C 2機（165HP、この編で最初に出す
    // 低視認機。夜間マップで塗装が背景に沈むので、レーダーを見る出撃になる）と
    // F/A-18F 4機。非TGT 10機は F-16 と F-15 の制圧隊。6 : 10 = 1:1.67。
    //
    // 練度: F-35C の波だけ role を上げず SKILL_TIERS の veteran を明示した。
    // 夜襲の先鋒に一番腕の立つ組を置くのは相手側の合理でもある。
    sequence: [
      // 先鋒。低視認機2機が、燃えている滑走路の上に居る。
      { types: ["f35c", "f35c"], band: 2, label: "LIGHTNING", skill: "veteran" },
      {
        types: ["f16", "f16"], tgt: false, band: 1, label: "SUPPRESSION",
        concurrent: true, role: "trash",
        radio: [
          { speaker: "wingman", text: "滑走路の上に敵だ！ こっちは上がるだけで手一杯だぞ——先に頭を押さえろ！", id: "r08-suppression" }
        ]
      },
      // 第二陣。基地を実際に焼きに来る4機。
      { types: ["fa18", "fa18", "fa18", "fa18"], band: 1, label: "RAIDER" },
      {
        types: ["f16", "f16", "f15"], tgt: false, band: 2, label: "SECOND WAVE",
        concurrent: true, role: "trash", delay: 40,
        radio: [
          { speaker: "command", text: "こちらNORTHSTAR。増援3機。……SICKLE 2、基地の消火は諦めろ。上を守れ。", id: "r08-second-wave" }
        ]
      },
      {
        types: ["f16", "f16", "f16"], tgt: false, band: 1, label: "THIRD WAVE",
        concurrent: true, role: "trash", delay: 95
      },
      {
        types: ["f15", "f16"], tgt: false, band: 2, label: "LAST WAVE",
        concurrent: true, role: "trash", delay: 165
      }
    ],
    // 165HPが2機と135HPが4機、夜間の視認性と、時間で増える非TGT 10機。
    // 米編 m-night の 330 とほぼ同じ——同じ基地の、同じ一晩だからである。
    parTime: 335,
    hasOutro: false,
    map: { x: 0.60, y: 0.74 },
    // 米編 m-night の基地は台地の (900, -1200) に敷かれている。守る側の戦闘は
    // その真上で起きるので、戦域の中心を基地そのものに置いた。半径は、
    // 基地を離れた時点で守っていないので短くしてある。
    battleCenter: { x: 900, z: -1200 },
    battleRadius: 8000,
    briefing: "深夜、前線基地が夜襲を受けた。滑走路の端はもう燃えている。\n上がれる機体から上がれ——命令はそれだけだ。\n指定目標は6機。先に居るのがF-35Cで2機、遅れて焼きに来るF/A-18Fが4機だ。\nF-35Cは見つけにくい。夜だ、目で探すな。レーダーとロック警報だけを信じろ。\n制圧のF-16とF-15が10機付いてくるが、目標ではない。数を追えば基地が焼ける。\n時間が経つほど向こうは増える。早く上がった分だけ、こちらが有利だ。",
    introRadio: [
      { speaker: "command", text: "こちらNORTHSTAR。基地が夜襲を受けている。上がれる機体から上がれ——上を空けるな。", id: "r08-brief" },
      { speaker: "wingman", text: "滑走路が燃えてる！ 帰る場所を守れ——ここを失ったら次が無いぞ！", id: "r08-brief-wing" }
    ]
  }, { after: "r07" });

  ctx.addMission({
    key: "r09",
    campaign: "rus",
    world: "coastalPlain",
    title: "IRON UMBRELLA",
    jp: "上陸した友軍機甲部隊が海岸平野を縦断中。車列を叩きに来る敵攻撃隊を排除せよ。",
    act: 2,
    storyNo: 9,
    story: "上陸した機甲部隊が、海岸平野を南岸へ向かっている。\n空が空いた瞬間に、あの車列は消える。空けるな。",
    epilogue: [
      "攻撃隊は排除。車列は南岸へ抜けた。損害は2両。",
      "焼けた戦車から、この島の漁村の地図が出てきた。書き込みは我々の補給路のものだった。",
      "SICKLE 2は何も言わなかった。着陸してからも、しばらく黙っていた。"
    ],
    // 米編 m-convoy の裏。あちらは「車列7両とSAMサイト1基」が指定目標で、
    // 上空のCAPは1機も指定目標ではなかった。こちらはその CAP の側を飛ぶ。
    // ——ただし守るべき車列を画面に出す手段が無い（冒頭の注記）。
    // 車列は briefing と無線とエピローグの中にだけ存在し、盤面は上空の防空戦になる。
    //
    // ★この盤面の設計は「低いところに降りてくる相手を、低いところで捕まえる」である。
    // 指定目標5機のうち3機（A-10の代わりの F/A-18F ストライク隊）は band 1 で、
    // 車列の高度に張り付いてくる。残る2機の F-14D は band 2 の掩護。
    // 米編 m-convoy が「上空のCAPに付き合わず低空へ降りろ」という出撃だったのに対し、
    // こちらは「低空へ降りていく相手を追え」——同じ高度差を、逆向きに使っている。
    //
    // 非TGT 9機は F-16 の護衛。5 : 9 = 1:1.80。
    sequence: [
      // 車列を直接叩きに来るストライク隊。低い。
      { types: ["fa18", "fa18", "fa18"], band: 1, label: "STRIKE" },
      {
        types: ["f16", "f16", "f16"], tgt: false, band: 2, label: "ESCORT",
        concurrent: true, role: "trash",
        radio: [
          { speaker: "wingman", text: "護衛が3機、上に居る！ 付き合うな——低い方だ、低い方が車列を狙ってる！", id: "r09-escort-inbound" }
        ]
      },
      // 掩護のトムキャット。上から蓋をしに来る。
      { types: ["f14", "f14"], band: 2, label: "COVER", skill: "veteran" },
      {
        types: ["f16", "f16", "f16", "f16"], tgt: false, band: 1, label: "SECOND ESCORT",
        concurrent: true, role: "trash", delay: 70,
        radio: [
          { speaker: "command", text: "こちらNORTHSTAR。増援4機、低空に入ってくる。車列の頭上を空けるな。", id: "r09-second-escort" }
        ]
      },
      {
        types: ["f16", "f16"], tgt: false, band: 2, label: "RELIEF",
        concurrent: true, role: "trash", delay: 145
      }
    ],
    // 全部が戦闘機なので撃墜自体は m-convoy の8両より速いが、低空へ降りていく
    // 相手を追う分の時間が乗る。米編 m-convoy の 300 と同じ桁に置いた。
    parTime: 305,
    hasOutro: false,
    map: { x: 0.14, y: 0.44 },
    // 米編 m-convoy の道は (10,-1420) から (370,-3880) までの2.7km。
    // 守る側の空はその上にあるので、戦域の中心を道の中ほどに合わせた。
    // 半径も米編と同じ 9000——同じ平野の、同じ空である。
    battleCenter: { x: -100, z: -2650 },
    battleRadius: 9000,
    briefing: "上陸した友軍機甲部隊が、海岸平野を北端から南岸へ縦断中だ。戦車5、対空戦車2の計7両。\n速度は遅い。止まらない。そして空から丸見えだ。\n敵はそれを知っている。指定目標は5機——車列の高度まで降りてくるF/A-18Fが3機と、上で蓋をするF-14Dが2機。\n低い方から潰せ。上のF-14Dは君を狙うが、下のF/A-18Fは車列を狙う。\n護衛のF-16が9機付いてくるが、目標ではない。数に釣られた分だけ、下で戦車が燃える。\n車列の対空戦車2両は撃ち返す。射程600——味方だ、その線に入るな。",
    introRadio: [
      { speaker: "command", text: "こちらNORTHSTAR。車列の頭上に敵攻撃隊。空を空けるな——低い方から落とせ。", id: "r09-brief" },
      { speaker: "wingman", text: "下に降りていく奴らが本命だ！ 上の護衛は放っておけ——車列を焼かせるな！", id: "r09-brief-wing" }
    ]
  }, { after: "r08" });

  ctx.addMission({
    key: "r10",
    campaign: "rus",
    world: "desertBasin",
    title: "THE LAST TRAIN",
    jp: "盆地の補給列車に敵攻撃隊。列車を襲う指定目標6機を全て撃墜し、線路上空を掃討せよ。",
    act: 2,
    storyNo: 10,
    // ★露編 ACT 2 の折り返し点であり、この5本で唯一「勝敗が分離する」ミッション。
    // 設計は docs/spec_rus_campaign.md §2 の指示どおり:
    //   ゲームの目標 = 「列車を襲う敵攻撃機6機の撃墜」→ 達成可能。ACCOMPLISHED は成立する
    //   物語の結末   = 列車は失われる（米編 m-train で装甲列車は破壊される）
    // ミッションの目標を「列車の護衛」にしてしまうと、プレイヤーが何をしても
    // 結果が変わらない盤面になる。目標を撃墜数に置き換えることで、腕は結果に効く
    // ——効かないのは物語の方だけ、という形にしてある。
    //
    // だから story と briefing では絶対に「守れない」と言わない。言ってしまうと
    // プレイヤーが最初から諦めた状態で飛ぶことになり、エピローグの落差が消える。
    // 落差は epilogue が全部背負う。
    story: "盆地を横切る単線一本。前線の物資は全部あそこを通る。\n六両編成。今日はこちらが、あの列車の傘だ。",
    epilogue: [
      "線路上空の敵は掃討。指定目標は全機撃墜——空戦としては、非の打ちどころが無い。",
      "だが列車は失われた。君が最後の1機を落とした頃には、六両とも燃えていた。",
      "後で積荷の記録が回ってきた。全車、軍需物資。捕虜は乗っていなかった。\nだから正しかった。正しかったのに、何も晴れない。"
    ],
    // 米編 m-train の裏。あちらは装甲列車6両が指定目標で、線路脇の対空砲2門と
    // 上空のCAP9機は目標ではなかった。こちらはその「CAP」の側を飛ぶ。
    //
    // ★勝敗の分離をどう盤面で成立させたか:
    // 指定目標は「列車を襲う敵攻撃隊6機」であり、列車そのものは盤面に無い
    // （守る対象を出せば、それはこちらを撃つ enemy になる——冒頭の注記）。
    // 6機を全部落とせば ACCOMPLISHED。腕がそのまま結果になる。
    // そして epilogue が、その結果と関係なく列車を失わせる。
    // プレイヤーの操作が効く層と、効かない層を、別々の場所に置いてある。
    //
    // 内訳は B-52H 2機（290HP・3発機体。線路に沿って落としていく本命で、
    // 鈍重だから必ず追いつける——「間に合わなかった」ではなく「間に合ったのに」
    // にするために、逃げ切る敵は1機も置いていない）と F/A-18F 4機。
    // 非TGT 10機は F-15 と F-16 の護衛。6 : 10 = 1:1.67。
    //
    // ★最後の非TGT波を delay 190 と遅くしてあるのは意図的である。
    // 指定目標を全部落とした後にまだ敵が上がってくる——「終わったのに終わらない」
    // 空を数十秒だけ作るためで、ここが epilogue への渡りになる。
    sequence: [
      // 先に来るのは速い方。線路の対空車を潰しに降りてくる。
      { types: ["fa18", "fa18", "fa18", "fa18"], band: 1, label: "STRIKE" },
      {
        types: ["f15", "f16", "f16"], tgt: false, band: 2, label: "ESCORT",
        concurrent: true, role: "trash",
        radio: [
          { speaker: "wingman", text: "護衛が3機！ 相手にするな——線路に降りてる方だ！", id: "r10-escort-inbound" }
        ]
      },
      // 本命の重爆。線路の長さぶんを焼きに来る。
      {
        types: ["bomber", "bomber"], band: 2, label: "HEAVY",
        radio: [
          { speaker: "command", text: "こちらNORTHSTAR。B-52が2機、線路の東端から入ってくる。……SICKLE 2、急げ。", id: "r10-heavy-inbound" }
        ]
      },
      {
        types: ["f16", "f16", "f16"], tgt: false, band: 1, label: "SECOND ESCORT",
        concurrent: true, role: "trash", delay: 65,
        radio: [
          { speaker: "wingman", text: "増援だ、3機！ 数が減らない——爆撃機だけでいい、爆撃機を落とせ！", id: "r10-second-escort" }
        ]
      },
      {
        types: ["f15", "f16"], tgt: false, band: 2, label: "RELIEF",
        concurrent: true, role: "trash", delay: 125
      },
      // 指定目標が消えた後にも上がってくる、最後の2機。
      {
        types: ["f16", "f16"], tgt: false, band: 1, label: "LAST FLIGHT",
        concurrent: true, role: "trash", delay: 190
      }
    ],
    // 290HPが2機（各3発）と135HPが4機、砂塵の視程と、時間で増える非TGT 10機。
    // 米編 m-train の 300 より長いのは、あちらの6両が止まった的だったのに対し
    // こちらの6機は動いて撃ち返すから。r06 の 340 と同じ重さの出撃である。
    parTime: 340,
    hasOutro: false,
    map: { x: 0.31, y: 0.86 },
    // 米編 m-train の線路は (-1300,-1150) から (1330,-1850) へ東西に敷かれている。
    // 守る側の空はその上なので、戦域の中心を線の中ほどに置いた。半径は米編と同じ
    // 7000——同じ盆地の、同じ午後である。
    battleCenter: { x: 0, z: -1500 },
    battleRadius: 7000,
    briefing: "盆地を横切る単線一本。前線の物資は全部あそこを通っている。今日はこちらが、あの列車の傘だ。\n六両編成——機関車1、対空車2、有蓋車3。対空車の射程は620、あれだけが列車自身の防空だ。\n指定目標は6機。先に降りてくるF/A-18Fが4機と、後から線路の東端に入るB-52Hが2機。\nB-52Hは装甲が厚い。1機につきミサイル3発を見込め。あれが本命だ。\n護衛のF-15とF-16が10機付いてくるが、目標ではない。数を追った時間が、そのまま線路の上に落ちる。\n落とせる相手だ。全部落とせ。",
    introRadio: [
      { speaker: "command", text: "こちらNORTHSTAR。補給線に敵攻撃隊——列車を襲う6機を落とせ。以上だ。", id: "r10-brief" },
      { speaker: "wingman", text: "あの列車が止まったら前線が干上がる！ 傘になれ——一発も落とさせるな！", id: "r10-brief-wing" }
    ]
  }, { after: "r09" });
}
