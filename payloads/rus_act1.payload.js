// rus_act1 - ロシア陣営編「OPERATION NORTHERN STAR」ACT 1 (r01-r05).
//
// docs/story_bible.md §4 ACT1「攻める／モチーフ: 言葉を乱す」の5本。米編01-05
// (m01 / m02 / m-heli / m03 / m-boats) と**同じ5回の戦闘を裏から**飛ぶ。
// マップ・時刻・天候はすべて対応する米編ミッションと同一 (world を一致させてある):
//
//   r01 -> m01  archipelagoDay   Tu-95編隊を迎撃する / **その編隊を護衛して基地を叩く**
//   r02 -> m02  archipelagoDay   二正面攻勢を凌ぐ   / **その二正面攻勢を仕掛ける側**
//   r03 -> m-heli coastalPlain   浸透ヘリを掃討する / **そのヘリ部隊を掩護する低空戦**
//   r04 -> m03  sunsetOcean      敵機動部隊を撃滅する / **自軍艦隊の防空**
//   r05 -> m-boats archipelagoDay 浅瀬の艇群を掃討する / **その艇団を掩護し敵艦を狙う**
//
// 設計上の三つの縛り:
//
// 1) **敵は西側機のみ。** ENEMY_AI_PROFILES に f16/f15/f22/f14/f4/fa18/f2a/gripen/
//    rafale/typhoon/f35c/bomber が揃っている。ACT1 は序盤なので f16 / f4 / fa18 を
//    中心に据え、role は trash / line、skill は rookie / regular に留める。f15 は
//    r04 の第一線だけ、f14 は r05 の艦隊 CAP だけ。f22 は ACT4 まで出さない。
//
// 2) **編成比は TGT少数 : 非TGT雑魚 = 1:1.5〜2、総数は2〜9機、無限湧きなし。**
//    米編と同じ読み方（TGTがソート、それ以外は天候）を露編でも通す。非TGT波は必ず
//    `concurrent: true` を付ける — 非concurrentの非TGT波はTGTが全滅するまで
//    spawn されないので、実際には一度も出てこない（m-storm のコメントと同じ罠）。
//
// 3) **物語の負けとゲームの負けを分ける（r04）。** 露編04は物語上「艦隊を守り切れず
//    撤退」だが、プレイヤーの操作で結果が変わらないミッションは悪い。よって目標は
//    「艦隊に取り付いた攻撃隊を規定数撃墜する」に置き、ACCOMPLISHED は普通に成立
//    させる。艦隊が退いたことは epilogue でだけ語る。
//
// ★既知の未解決点（メインループへの申し送り。この payload では直せない）:
//   RADIO_SPEAKERS は index.html 側で command="SKYEYE" / wingman="HAMMER 2" と
//   ラベルが固定されており、payload の ctx からは触れない。よって下の無線は中身を
//   NORTHSTAR / SICKLE 2 として書いてあるが、画面に出る話者名は米編のままになる。
//   キャンペーン別のラベル出し分けは index.html 側の1箇所の改修が要る。
//   同様に FRIENDLY_DEPLOYMENTS（僚機・味方空母・guard/hunt の護衛対象）も
//   ミッションキー引きの inline テーブルで ctx に無いため、露編の5本は僚機なし・
//   `hunt` なしで成立するよう設計してある（護衛対象は無線と briefing で語る）。
export default function register(ctx) {
  ctx.addMission({
    key: "r01",
    campaign: "rus",
    world: "archipelagoDay",
    title: "OPENING SALVO",
    jp: "Tu-95編隊を掩護し、敵前線飛行場への投弾を成立させる。上がってくる迎撃機を排除せよ。",
    act: 1,
    storyNo: 1,
    story: "灯台事件から11日。開戦の第一撃は我々が出す。\n爆撃隊が飛行場へ向かう。君の仕事は、あれを通すことだ。",
    epilogue: [
      "爆撃隊は投弾に成功。敵前線飛行場は滑走路を半分失った。第一撃は通った。",
      "ミハイル老整備長は着陸した機体を見上げてこう言った——「塔は倒れる。人は残る」",
      "セント・ヴェルダでは今日も、統合管制塔BABELの建設が続いている。"
    ],
    // 米編 m01 の完全な裏。あちらは「Tu-95を落とす」、こちらは「Tu-95を通す」。
    // 同じ空、同じ時刻、同じ編隊を、逆の側から見る。
    //
    // ただし**護衛対象そのものはボードに出さない**。友軍ユニットは
    // FRIENDLY_DEPLOYMENTS（ミッションキー引きのinlineテーブル）でしか置けず、
    // payload からは登録できないため、爆撃隊は briefing と無線が語る「上空に居る
    // もの」に留める。プレイヤーが実際に相手をするのは、飛行場からスクランブルする
    // 迎撃機だけ——これは m01 の「爆撃機を落とせ」を鏡像にした
    // 「爆撃機に触らせるな」であり、機構としては素直な制空戦になる。
    //
    // TGT は2、非TGTは3で 1:1.5。露編の初出撃なので、米編 m01 と同じく比の
    // 一番軽い端に置く。TGTのF-16すら regular 止まりで、周りのF-4は trash+rookie:
    // 「無視して爆撃隊の傘に居ろ」を文字通りに受け取っても生き残れる密度にしてある。
    sequence: [
      // 飛行場から真っ先に上がってくる一組。これを落とすまでが仕事。
      {
        types: ["f16", "f16"], band: 1, label: "SCRAMBLE", idBase: 0,
        radio: [
          { speaker: "command", text: "NORTHSTARより。飛行場からF-16が2機——爆撃隊に取り付かせるな。", id: "r01-scramble" }
        ]
      },
      // 旧式のファントム。数だけの妨害で、爆撃隊には届かない位置から上がってくる。
      {
        types: ["f4", "f4", "f4"], tgt: false, band: 2, label: "ALERT FLIGHT",
        concurrent: true, role: "trash", skill: "rookie", delay: 35,
        radio: [
          { speaker: "wingman", text: "F-4が3機、遅れて上がってきた！ 旧式だ——放っておけ、指定目標を先に潰せ！", id: "r01-alert" }
        ]
      }
    ],
    // 2機の98HP機 = 2ラウンド、それに上昇してくる相手を捕まえるまでの時間。
    // 米編 m01 の180と同格の入門ミッションだが、あちらの尾追いと違って
    // こちらは相手が上がってくるのを待つ形なので、わずかに長い。
    parTime: 190,
    hasOutro: false,
    map: { x: 0.27, y: 0.4 },
    // m01 と同じ空域。ただし m01 のような19.8km先の目標が無い（爆撃隊は演出で、
    // ボード上の実体ではない）ので、アリーナは素直に交戦点まわりに置く。
    battleCenter: { x: 0, z: -1200 },
    battleRadius: 10000,
    briefing: "作戦開始だ。Tu-95が2機、敵前線飛行場へ向かっている。君はその傘だ。\n指定目標は飛行場から上がってくるF-16が2機。あれが爆撃隊に届く前に落とせ。\n遅れてF-4が3機上がるが、旧式だ。指定目標ではない——数に付き合うな。\n投弾まで約3分。それまで爆撃隊の上空を空けるな。\n奴らは我々を侵略者と呼ぶだろう。それでいい。塔が建てば、この海の空は永久に一つの旗の下に入る。",
    introRadio: [
      { speaker: "command", text: "NORTHSTARより。爆撃隊は針路変更しない——君が空けろ。指定目標はF-16が2機。", id: "r01-brief" },
      { speaker: "wingman", text: "初陣だな。難しく考えるな——上がってきた奴を、上がりきる前に落とすだけだ。", id: "r01-brief-wing" }
    ]
  }, { after: "m05" });

  ctx.addMission({
    key: "r02",
    campaign: "rus",
    world: "archipelagoDay",
    title: "TWO SPEARS",
    jp: "二正面攻勢を仕掛ける。二つの槍の一方を君が持て。迎撃に上がる敵編隊を排除せよ。",
    act: 1,
    storyNo: 2,
    story: "二正面。片方を追えば、もう片方が抜ける——そういう攻め方を、今日は我々がする。\nNORTHSTARの説明は明快だ。片方が囮で、片方も囮だ。",
    epilogue: [
      "第2槍は突破。二正面攻勢は成立した——ただし押し込めたのは半日ぶんだ。",
      "敵の隊長機が1機、最後まで撤退命令を無視して残っていた。撃墜記録には残っていない。",
      "SICKLE 2「隊長、あれ勝ったんですよね？ ……勝ったってことにしときます」"
    ],
    // 米編 m02 の裏。あちらは「二正面を凌ぐ」、こちらは「二正面を仕掛ける」。
    // 同じ盤面を逆から見るとどう変わるか——凌ぐ側は「片方を追えばもう片方が抜ける」
    // 引き算の戦いだが、仕掛ける側は「上がってきた迎撃機を順に剥がす」足し算になる。
    // よって波の構造は m02 と同じ「2波 + 遅延増援」だが、TGT が各波の先導機である
    // 点まで含めて意図的に鏡像にしてある。
    //
    // TGT 4（F-16が2、F/A-18が2）に対し非TGT 7 で 1:1.75、米編の既定比。
    // 露編で最初に「相手が二段階で強くなる」ミッションで、F-4 -> F/A-18 の
    // 段差がそれを担う。F/A-18 は2発機で、trash の F-4 とは殴り合いの質が違う。
    sequence: [
      { types: ["f16", "f16"], band: 1, idBase: 0, label: "FIRST INTERCEPT" },
      {
        types: ["f4", "f4", "f4"], tgt: false, band: 1, label: "WEST SCREEN",
        concurrent: true, role: "trash", skill: "rookie"
      },
      // 第2の槍に上がってきた迎撃。ホーネットは2発機なので、ここで初めて
      // 「まともな相手」が出る。role は line = 機体の公称値そのまま。
      {
        types: ["fa18", "fa18"], band: 2, label: "SECOND INTERCEPT",
        radio: [
          { speaker: "command", text: "NORTHSTARより。第2槍にF/A-18が2機。さっきまでとは腕が違う——丁寧に行け。", id: "r02-second" }
        ]
      },
      {
        types: ["f4", "f4"], tgt: false, band: 2, label: "EAST SCREEN",
        concurrent: true, role: "trash", skill: "rookie"
      },
      // 削り切る前に来る一組。米編 m02 の REINFORCEMENT と同じ役割で、
      // 速く片付ければ会わずに済む——それが速さの報酬。
      {
        types: ["f16", "f4"], tgt: false, band: 1, label: "RELIEF",
        concurrent: true, role: "trash", delay: 45,
        radio: [
          { speaker: "wingman", text: "レーダーに新手が2！ 数だけです——指定目標から目を離さないで！", id: "r02-relief" }
        ]
      }
    ],
    parTime: 265,
    hasOutro: false,
    map: { x: 0.5, y: 0.27 },
    // 米編 m02 は arena を書かず既定（原点・半径12000）を使っている。同じ空域の
    // 同じ戦闘なので、露編もそこへ明示的に合わせる（値を書き下すのは、既定が
    // 将来変わっても表裏でズレないようにするため）。
    battleCenter: { x: 0, z: 0 },
    battleRadius: 12000,
    briefing: "二正面攻勢だ。西と東、同時に槍を入れる。君が持つのは西の槍だ。\n指定目標は各正面の迎撃先導機——F-16が2、F/A-18が2の計4機。\n周りのF-4は数を撃ってくるが、腕は素人だ。落とす義務は無い。\nF/A-18は違う。あれは2発機で、こちらの機動をきちんと読む。正面から入るな。\n補給は無い。弾を数えながら、両正面を順に潰せ。",
    introRadio: [
      { speaker: "command", text: "NORTHSTARより。両正面、同時に進入する。西は君だ——迎撃先導機を優先。", id: "r02-brief" },
      { speaker: "wingman", text: "凌ぐ側から仕掛ける側になった気分はどうです？ ……俺は悪くないと思ってますよ、隊長。", id: "r02-brief-wing" }
    ]
  }, { after: "r01" });

  ctx.addMission({
    key: "r03",
    campaign: "rus",
    world: "coastalPlain",
    title: "LOW SHIELD",
    jp: "Mi-24部隊が海岸平野を低空浸透中。上から降りてくる敵機を、降りて叩け。",
    act: 1,
    storyNo: 3,
    story: "海岸平野の低空を、我々のヘリ部隊がレーダーの下を這って入る。\n奴らは必ず上から降りてくる。降りてきた所を叩くのが君の仕事だ。",
    epilogue: [
      "ヘリ部隊は浸透に成功。海岸平野の一帯は、この日から我々の側の空になった。",
      "回収された敵機の一つに整備票が挟まっていた。日付は開戦の三日前。",
      "SICKLE 2「三日前……向こうも、撃たれる前から飛ぶ準備してたってことですね」"
    ],
    // 米編 m-heli の裏。あちらは「ヘリを叩け」、こちらは「ヘリに触らせるな」。
    // 教える内容は同じ「高度を捨てろ」だが、理由が逆になる: 米編は目標が低いから
    // 降りる。露編は**降りてこないと守れないから**降りる——上に居れば楽に戦えるが、
    // 上に居るあいだ掩護対象は裸になる、という緊張が本体。
    //
    // 実装として掩護対象そのものはボードに置けない（friendlies は payload の
    // 対象外）ので、緊張は**指定目標の高度**で作る。TGTは低空へ降りてくる
    // 攻撃機と、その直掩。ボードで一番高い所に居る F-15 の CAP は非TGTで、
    // 上がった瞬間に相手をさせられる位置に置いてある。
    //
    // TGT 4 に対し非TGT 7 で 1:1.75。米編 m-heli の 1:1.8 とほぼ同格。
    sequence: [
      // ヘリ狩りに降りてくる攻撃隊。ヴァイパー・ゼロは対地・対艦装備の機体で、
      // 低空に居る理由が最初からある。ここが低く始まるのが m-heli との相似形。
      {
        types: ["f2a", "f2a"], band: 1, label: "STRIKE", idBase: 0,
        radio: [
          { speaker: "command", text: "NORTHSTARより。F-2Aが2機、低空へ降下中——ヘリ隊を狙っている。落とせ。", id: "r03-strike" }
        ]
      },
      // 上空のCAP。降りている限り触れてこない。米編 m-heli の TOP COVER の鏡像。
      {
        types: ["f15", "f16", "f16"], tgt: false, band: 2, label: "TOP COVER",
        concurrent: true, role: "trash", skill: "rookie",
        radio: [
          { speaker: "wingman", text: "上空にCAPが3！ 上がったら付き合わされます——下に居てください、隊長！", id: "r03-cover" }
        ]
      },
      // 第2撃。第1波が片付いてから来るので、ここで一息つける。
      { types: ["f2a", "f16"], band: 2, label: "SECOND STRIKE" },
      {
        types: ["f4", "f4", "f16", "f4"], tgt: false, band: 1, label: "CAP RELIEF",
        concurrent: true, role: "trash", skill: "rookie", delay: 40,
        radio: [
          { speaker: "wingman", text: "増援のCAP、4機！ 数だけです——低空を維持していれば向こうが不利だ！", id: "r03-relief" }
        ]
      }
    ],
    // 4機の指定目標のうち3機は低空に張り付いており、地面すれすれでの追尾と
    // 立て直しに時間が食われる。米編 m-heli の260と同格。
    parTime: 265,
    hasOutro: false,
    map: { x: 0.22, y: 0.5 },
    // m-heli と同じ既定アリーナ（原点・12000）。低空戦なので水平方向に
    // 広く取る必要は無く、むしろ端まで引っ張られない方が掩護の緊張が残る。
    battleCenter: { x: 0, z: 0 },
    battleRadius: 12000,
    briefing: "海岸平野の北、レーダーの死角を這って我々のMi-24部隊が入っている。高度60。\n敵はそれに気づいた。上から降りてきて、ヘリを狩るつもりだ。\n指定目標は降下してくる攻撃隊4機——F-2Aが3、F-16が1。\n上空のCAPは7機。指定目標ではない。高度を取れば必ず絡まれるぞ——上がるな。\n君が上に居る間、ヘリ隊は裸だ。降りたまま戦え。それがこの任務の全部だ。",
    introRadio: [
      { speaker: "command", text: "NORTHSTARより。ヘリ隊、浸透続行中——君は上を空けるな。降りて掩護しろ。", id: "r03-brief" },
      { speaker: "wingman", text: "地面すれすれは苦手なんですよ。……でも、上に逃げたらあの人たち死にますからね。", id: "r03-brief-wing" }
    ]
  }, { after: "r02" });

  ctx.addMission({
    key: "r04",
    campaign: "rus",
    world: "sunsetOcean",
    title: "LAST LIGHT",
    jp: "我が機動部隊が夕日の海で捕捉された。取り付いた敵攻撃隊を排除し、艦隊を掩護せよ。",
    act: 1,
    storyNo: 4,
    story: "反攻の第一手は向こうが出した。我が機動部隊が、日没の海で捕捉されている。\n君が上がる。それしかできることが無い。",
    epilogue: [
      "敵攻撃隊は排除。撃墜数はこの日の全戦域で最多だった。君は仕事をした。",
      "それでも艦隊は退いた。空母は舵を切り、日没とともに北へ針路を取っている。",
      "NORTHSTAR「……君のせいではない。数が違った。それだけだ」"
    ],
    // ★露編ACT1の要。物語上の結末は「守り切れず艦隊は撤退」だが、
    // **プレイヤーの操作で結果が変わらないミッションは作らない**（spec_rus_campaign §2）。
    //
    // そこで目標を「艦隊を守り切る」ではなく「艦隊に取り付いた攻撃隊を撃墜する」に
    // 置く。5機の指定目標を落とせば ACCOMPLISHED は普通に成立し、S ランクも取れる。
    // 艦隊が退いたことは epilogue でだけ語る——ゲームの勝敗と物語の勝敗を分ける。
    // 掩護対象の艦隊をボードに出さないのは他の4本と同じ理由（friendlies は
    // payload の対象外）だが、ここではむしろ都合が良い: 沈む艦を見せてしまうと
    // 「守れたはずだ」という誤読が生まれる。艦隊は最後まで水平線の向こうに居る。
    //
    // TGT 5（F/A-18が2、F-14が2、F-16が1）に対し非TGT 8 で 1:1.6。
    // ACT1で最も重いボードだが、練度は上げない: F-14 と F/A-18 が line、
    // 残りは trash。ここで rookie を外して regular を混ぜるのは第2波の護衛だけで、
    // 「数が違った」という epilogue の理屈を、腕ではなく機数で作る。
    sequence: [
      // 艦隊に取り付いた最初の一組。夕日を背負って低く入ってくる。
      {
        types: ["fa18", "fa18"], band: 1, label: "STRIKE", idBase: 0,
        radio: [
          { speaker: "command", text: "NORTHSTARより。F/A-18が2機、艦隊へ突入コース——最優先で排除しろ。", id: "r04-strike-1" }
        ]
      },
      {
        types: ["f16", "f16", "f4"], tgt: false, band: 1, label: "ESCORT",
        concurrent: true, role: "trash", skill: "rookie",
        radio: [
          { speaker: "wingman", text: "護衛が3機！ 攻撃隊が先です、隊長——艦隊に届く前に落とさないと！", id: "r04-escort-1" }
        ]
      },
      // 第2撃。トムキャットは長い腕を持つ機体で、外側から入ってくる。
      {
        types: ["f14", "f14"], band: 2, label: "SECOND STRIKE",
        radio: [
          { speaker: "command", text: "第2波、F-14が2機。外から回り込んでくる——追え、届く前にだ。", id: "r04-strike-2" }
        ]
      },
      {
        types: ["f16", "f4", "f4"], tgt: false, band: 2, label: "ESCORT",
        concurrent: true, role: "trash", skill: "regular", delay: 40
      },
      // 最後の一機。ここまで来ると、艦隊はもう舵を切っている。
      {
        types: ["f16"], band: 1, label: "LAST RUN",
        radio: [
          { speaker: "wingman", text: "まだ1機残ってます！ ……もう艦隊は針路を変えてる。それでも落としましょう、隊長。", id: "r04-last" }
        ]
      },
      {
        types: ["f4", "f4"], tgt: false, band: 1, label: "TOP COVER",
        concurrent: true, role: "trash", skill: "rookie", delay: 95
      }
    ],
    // 5機の指定目標のうち4機は2発機。逆光の中で外側から回り込む相手を
    // 捕まえ直す時間がかさむので、米編 m03 の285より少し長い。
    parTime: 300,
    hasOutro: false,
    map: { x: 0.71, y: 0.56 },
    // m03 と同じ既定アリーナ（原点・12000）。F-14が外へ回り込むので、
    // 追いかけて端に当たる余地は残しつつ、広げはしない——引っ張られるのが
    // このミッションのコストだから。
    battleCenter: { x: 0, z: 0 },
    battleRadius: 12000,
    briefing: "我が機動部隊が捕捉された。空母1、護衛4——日没の逆光の中を、敵の攻撃隊が突いてくる。\n指定目標は艦隊に取り付いた攻撃機5機。F/A-18が2、F-14が2、F-16が1だ。\n護衛は8機。落とす義務は無い。だが君を攻撃隊から引き剥がしにかかる。\nF-14は外から回り込んでくる。追いかけて空域の端まで引っ張られるな。\n……正直に言う。艦隊は保たないかもしれん。それでも、上がれるのは君だけだ。",
    introRadio: [
      { speaker: "command", text: "NORTHSTARより。艦隊上空、敵攻撃隊——数はこちらの倍だ。行けるか。", id: "r04-brief" },
      { speaker: "wingman", text: "倍でも三倍でも同じですよ。下にいるの、うちの連中でしょう。……行きましょう。", id: "r04-brief-wing" }
    ]
  }, { after: "r03" });

  ctx.addMission({
    key: "r05",
    campaign: "rus",
    world: "archipelagoDay",
    title: "SHALLOW SPEAR",
    jp: "浅瀬のミサイル艇団を掩護しつつ、敵水上部隊を叩く。指定目標は敵艦4隻。",
    act: 1,
    storyNo: 5,
    story: "島嶼の浅瀬にミサイル艇団を入れた。あれが今日の槍だ。\nその同じ浅瀬に、漁村がある。",
    epilogue: [
      "敵水上部隊は撃沈。島嶼線の航路はこちらのものになった。ACT1はここで閉じる。",
      "掃討海域の内側に漁村が三つあった。うち二つは、前の週から無人だったと記録にある。",
      "SICKLE 2「これ、解放ですよね。……そう言われて飛んできたんですけど、隊長」"
    ],
    // 米編 m-boats の裏。あちらは「浅瀬の艇を掃討する」、こちらは
    // 「その艇団を掩護し、代わりに敵の水上部隊を沈める」。同じ浅瀬で、
    // 同じ日に、双方が相手の小舟を探している——という絵になる。
    //
    // ★米編との噛み合わせ: m-boats で沈められるのは**我々のミサイル艇**なので、
    // 露編で艇団を守り切らせてはいけない。だがこれも r04 と同じ扱いで、
    // 目標は「敵艦を沈める」に置く。艇団がどうなったかは epilogue が引き取る
    // （ここでは「艇団は槍として機能した」までしか言わない。米編 m-boats で
    // 掃討されるのは、この日の後——という読みが両編で成立する）。
    //
    // TGT はイージス1・フリゲート2・ミサイル艇1の4隻に対し、非TGT 7機で 1:1.75。
    // 米編 m-boats は「小さくて速い的を当てる」問題だったが、こちらは逆に
    // 「SAMの傘の中で大きな的を仕留める」問題に戻る——同じ浅瀬で、
    // 対艦攻撃の難所が入れ替わるのが表裏の面白みになるはず。
    sequence: [
      // 敵水上部隊。イージスのSAM圏がそのまま難易度。ミサイル艇1隻を混ぜて
      // あるのは、m-boats で自分たちが狩っていた側の的が、こちらの側にも
      // 居ることを見せるため。
      {
        kind: "naval", fleet: ["aegis", "frigate", "frigate", "missileBoat"],
        band: 3, label: "SURFACE GROUP", idBase: 6,
        radio: [
          { speaker: "command", text: "NORTHSTARより。水上反応4——イージス1、フリゲート2、小型1。全て指定目標だ。", id: "r05-group" }
        ]
      },
      {
        types: ["f14", "f16", "f16"], tgt: false, band: 1, label: "CAP",
        concurrent: true, role: "trash", skill: "rookie",
        radio: [
          { speaker: "wingman", text: "上空にCAPが3！ 相手をしないで——艇団の傘が要ります、低く速く！", id: "r05-cap-1" }
        ]
      },
      {
        types: ["f4", "f4", "f16"], tgt: false, band: 2, label: "CAP RELIEF",
        concurrent: true, role: "trash", skill: "rookie", delay: 70,
        radio: [
          { speaker: "wingman", text: "交代のCAPです！ 高度を取ると付き合う羽目になりますよ！", id: "r05-cap-2" }
        ]
      },
      {
        types: ["fa18"], tgt: false, band: 1, label: "SECOND FLIGHT",
        concurrent: true, role: "trash", delay: 150
      }
    ],
    // イージス1隻とフリゲート2隻はミサイル向きの的で、SAM圏の出入りが時間を食う。
    // 米編 m-boats の240（当てる問題）より重く、m03 の285より軽い。
    parTime: 265,
    hasOutro: false,
    map: { x: 0.3, y: 0.68 },
    // m-boats と同じ既定アリーナ（原点・12000）。艦隊は spawnNavalWave が
    // プレイヤーの機首方向2.4km・原点まわり1500mの円へ落とすので、
    // 既定半径で十分に収まる。
    battleCenter: { x: 0, z: 0 },
    battleRadius: 12000,
    briefing: "群島の浅瀬に、我が方のミサイル艇団を入れてある。あれが今日の槍だ。\n君の仕事は槍を通すこと——つまり、敵の水上部隊を先に沈めることだ。\n指定目標は4隻。イージス1、フリゲート2、そして小型艇が1。\nイージスのSAMは垂直発射だ。発射煙を見たら即座に回避しろ。\nフリゲートは単装で発射間隔が長い。後回しでいい。\n上空のCAPは7機、三度に分けて上がってくる。全て無指定目標だ——高度を取るな。",
    introRadio: [
      { speaker: "command", text: "NORTHSTARより。敵水上部隊、島影に4隻。艇団が撃たれる前に、こちらから沈めろ。", id: "r05-brief" },
      { speaker: "wingman", text: "浅瀬に漁村がありますよ、隊長。……いや、報告しただけです。指示は要りません。", id: "r05-brief-wing" }
    ]
  }, { after: "r04" });
}
