// rus_act2b.payload.js - Russian campaign, missions 11-15.
//
// The turn of the whole campaign. r11-r12 close out ACT 2 ("押し返される／嵐"):
// the NFF is on the back foot and fighting over its own ground. r13-r15 open
// ACT 3 ("焼く側に立つ／火"), where the player stops defending anything and
// starts taking things away from people - a relief convoy, a beach, a city.
//
// Every one of these five is the reverse angle of an American sortie that
// already ships, so map / time of day / weather are not choices here: they are
// fixed by the mission on the other side of the same afternoon.
//
//   r11 <- m-desert (desertBasin)   r14 <- m-landing (sunsetOcean)
//   r12 <- m-swarm  (nightBase)     r15 <- m-city    (nightCity)
//   r13 <- m-escort (archipelagoDay)
//
// Two structural notes that apply to all five and are not repeated below:
//
// * FRIENDLY_DEPLOYMENTS is an inline keyed table that a payload cannot reach
//   through ctx, so none of these five gets a wingman entity, a friendly
//   carrier or a guard objective from it. SICKLE 2 exists on the radio only,
//   which is how every mission before the guard sorties worked. `friendlyBase`
//   IS a mission field and is read straight off the mission (spawnMissionGround),
//   so a base the player is standing over still works - that is r11.
//
// * The enemy is western, and it is good. These are missions 11-15 of 20, so
//   the airframes are F-15 / F-22 / Typhoon / Rafale and the roles run
//   line/elite rather than the trash screens of the early campaign. Where a
//   flight IS a screen it stays `trash`, because "ignore them and press on"
//   has to remain a real decision - but there is at least one element per
//   sortie flown at the full airframe.

export default function register(ctx) {
  // =====================================================================
  // r11 SAND WALL - the reverse of m-desert (SANDSTORM).
  // =====================================================================
  //
  // m-desert is the player levelling a desert airbase at noon: twelve ground
  // installations designated, nineteen interceptors that are not. Flip the
  // camera and the twelve installations become the thing the player is
  // standing on, and the nineteen interceptors become SICKLE flight.
  //
  // So the designated list here is the AEF strike package. The base itself is
  // `friendlyBase` - defended scenery with a failRadius, exactly the mechanic
  // m01 and m-city use - and its coordinates are lifted from m-desert's own
  // layout note: the flight line sits at z -2440 on the sand pan centred at
  // (0, -1500), and the pan's flat top only extends ~0.62r on the worst
  // bearing, which is why every unit in that mission stays inside 1500m of the
  // centre. Standing the field at the flight line puts it where the enemy in
  // the mirror mission was actually attacking.
  //
  // There is no way for a fighter to "bomb" the field - STRIKE_AIR_TYPES is
  // only bomber and tu95 - so the strike package is aircraft that fly at the
  // player and the base is what the player must not drift away from. That is
  // honest for a defensive CAP over your own runway: nothing forces you home
  // except knowing what is behind you.
  //
  // 6 TGT (the strike package) against 11 non-TGT (escort + a late sweep) is
  // 1:1.83, the default shape from spec_wave_variety §4. Deliberately NOT the
  // 12:19 of the mirror mission - that ratio belongs to a ground-target list,
  // and m-desert's own comment says so.
  ctx.addMission({
    key: "r11",
    campaign: "rus",
    world: "desertBasin",
    title: "SAND WALL",
    jp: "内陸の砂漠航空基地に敵の攻撃隊が向かっている。基地上空で迎え撃て。指定目標は攻撃隊6機。",
    act: 2,
    storyNo: 11,
    story: "内陸の砂漠に、我々の航空基地がある。遮る物は何も無い。\n奴らも隠れられないが、こちらも隠れられない。",
    epilogue: [
      "攻撃隊は撃退。滑走路は使える。SAM網は半分が沈黙した。",
      "掩体壕の壁に、誰かが書いた一文が残っている——「塔は倒れる。人は残る」",
      "ミハイル老整備長は否定も肯定もしなかった。ただ、消せとも言わなかった。"
    ],
    sequence: [
      // Already inbound when the player rolls out. An Eagle pair at `line`
      // is the opening statement of the back half of the campaign: nothing
      // here is a rookie, and the first two contacts are flown at the
      // published airframe.
      {
        types: ["f15", "f15"], band: 1, idBase: 0, label: "STRIKE",
        role: "line",
        radio: [
          { speaker: "command", text: "NORTHSTARより。西から攻撃隊——F-15が2機、基地へ直進中だ。上げろ、SICKLE。", id: "r11-strike-1" }
        ]
      },
      // The escort. Trash-role Vipers whose whole job is to be between the
      // player and the strike package, i.e. the same function SICKLE's own
      // Fishbeds performed in the mirror mission.
      {
        types: ["f16", "f16", "f16"], tgt: false, band: 1, label: "ESCORT",
        concurrent: true, role: "trash", idBase: 10,
        radio: [
          { speaker: "wingman", text: "護衛が3機! 足止め役だ——付き合うな、攻撃隊を通すな!", id: "r11-escort-1" }
        ]
      },
      // Second element of the package, on a clock rather than on the first
      // pair's death. Hornets: the strike aircraft of the pair, and the wave
      // that usually arrives while the escort from wave 1 is still alive.
      {
        types: ["fa18", "fa18"], band: 2, idBase: 2, label: "STRIKE",
        role: "line", delay: 0,
        radio: [
          { speaker: "command", text: "第2梯団、F/A-18が2機。低い——SAMの射線より下を這ってきている。", id: "r11-strike-2" }
        ]
      },
      {
        types: ["f16", "f16"], tgt: false, band: 2, label: "ESCORT",
        concurrent: true, role: "trash", delay: 40, idBase: 13
      },
      // The one element flown at more than the airframe. A Typhoon pair at
      // `elite` arrives around the time the player has committed to the
      // second strike element and is lowest and slowest - the same job the
      // Su-33 relief flight did to the player in m-desert.
      {
        types: ["typhoon", "typhoon"], tgt: false, band: 1, label: "TOP COVER",
        concurrent: true, role: "elite", delay: 95, idBase: 15,
        radio: [
          { speaker: "wingman", text: "上に新手だ、タイフーン2機! こいつらは本気で来る——高度を捨てるな!", id: "r11-topcover" }
        ]
      },
      // Third and last strike element. Eagles again, so the sortie closes on
      // the silhouette it opened with, and the heaviest screen of the mission
      // arrives with them.
      {
        types: ["f15", "f15"], band: 1, idBase: 4, label: "STRIKE",
        role: "line",
        radio: [
          { speaker: "command", text: "最終梯団だ。あと2機——ここを抜かれたら滑走路が焼ける。", id: "r11-strike-3" }
        ]
      },
      {
        types: ["f16", "f16", "gripen", "gripen"], tgt: false, band: 2, label: "SWEEP",
        concurrent: true, role: "trash", delay: 30, idBase: 17,
        radio: [
          { speaker: "wingman", text: "掃討隊4機! 数で押してくる——SICKLE 2、まだ飛べる!", id: "r11-sweep" }
        ]
      }
    ],
    // Six fighter hulls at two missiles each, flown without ever being able to
    // drift far from a fixed point on the ground. Between m-escort's 320 (the
    // same "stay near the thing" constraint, lighter enemies) and m-desert's
    // 360 (the same map, twelve ground kills at ground-attack pace).
    parTime: 330,
    hasOutro: false,
    map: { x: 0.24, y: 0.82 },
    // The field, at the flight line of the base m-desert designates. Placed
    // inside 1500m of the sand pan's centre (0, -1500) for the reason that
    // mission's layout note spells out: the plateau's flat top ends between
    // ~0.62r and ~0.96r of the nominal 3000m radius depending on bearing, and
    // authoring against the nominal radius is how you get a runway on water.
    // failRadius 400 is the standard airfield value m01 and m02 use.
    friendlyBase: {
      x: 0, z: -2440, heading: 0,
      label: "SICKLE FIELD", failRadius: 400
    },
    // Centred between the spawn (z +620) and the field, so the whole defensive
    // box sits inside the 90% warning ring. Tighter than m-desert's 7500,
    // because this sortie has no reason to send the player deep - the fight
    // comes to the runway.
    battleCenter: { x: 0, z: -1100 },
    battleRadius: 6800,
    briefing: "砂漠の我が航空基地に、敵の攻撃隊が向かっている。真昼だ——隠れる場所は双方に無い。\n指定目標は攻撃隊6機。F-15が4、F/A-18が2。3梯団に分かれて時間差で入ってくる。\n護衛と掃討隊が11機。落とす義務は無いが、張り付かれれば攻撃隊に手が届かなくなる。\n基地の頭上から離れるな。追いかけて空けた穴に、次の梯団が入る。\n上位掩護にタイフーンが混じる。あれは雑魚ではない——本気で来る。\nここを守れなければ、内陸から上がれる機体はもう無い。",
    introRadio: [
      { speaker: "command", text: "NORTHSTARより全機。敵攻撃隊が基地へ向かっている——上空で止めろ。", id: "r11-brief" },
      { speaker: "wingman", text: "遮蔽物ゼロ、砂塵で足元も見えん。だが背中に滑走路がある。……行きましょう、IRONBACK。", id: "r11-brief-wing" }
    ]
  }, { after: "r10" });

  // =====================================================================
  // r12 NO ONE DIES - the reverse of m-swarm (UAV SWARM).
  // =====================================================================
  //
  // The story hook is the whole reason this mission exists in the Russian
  // campaign. In m-swarm, HAMMER 2 says "墜としても誰も死なない。それが妙に
  // 気持ち悪い" - the man being shot at is unsettled that nobody is dying.
  // Here the player is on the side that BUILT the things nobody dies in, and
  // the discomfort has to be the same discomfort seen from the other end:
  // SICKLE 2 is not troubled that the drones die, he is troubled that they
  // do not care, and NORTHSTAR is counting them like ammunition because that
  // is what they are on her board.
  //
  // Mechanically that means the drones are FRIENDLY-flavoured but they are not
  // friendly entities - a payload cannot reach FRIENDLY_DEPLOYMENTS, and more
  // to the point, drones the player has to protect would turn this into a
  // second escort mission three sorties before the real one. So the drones are
  // simply absent from the board as objects and present in the fiction: the
  // sortie is "fly WITH the swarm", and the swarm's own losses are reported on
  // the radio while the player fights the interceptors sent to kill it.
  //
  // 6 TGT (the interceptors that came for the swarm) against 10 non-TGT is
  // 1:1.67, mid-band. Night, nightBase, same airspace as the mirror mission.
  ctx.addMission({
    key: "r12",
    campaign: "rus",
    world: "nightBase",
    title: "NO ONE DIES",
    jp: "無人機部隊に随伴し、迎撃に上がった敵戦闘機を排除せよ。指定目標は迎撃機6機。",
    act: 2,
    storyNo: 12,
    story: "新型の無人機部隊に随伴する。中に人は乗っていない。\n墜とされても葬式は無い。……こちら側から見ても、それは同じだ。",
    epilogue: [
      "迎撃機は排除。無人機は14機のうち9機を失った。",
      "報告書では損害の欄が空欄になっている。機材の消耗は別紙だ。",
      "SICKLE 2が言った——「あれは味方なんですか、それとも弾ですか」。答えなかった。"
    ],
    sequence: [
      // The interceptors that came up for the swarm. Raptors first, and at
      // `line`: this is the first time in the Russian campaign the player
      // meets an F-22 flown as an F-22, and it is deliberately the aircraft
      // that arrives to kill unmanned machines.
      {
        types: ["f22", "f22"], band: 1, idBase: 0, label: "INTERCEPTOR",
        role: "line",
        radio: [
          { speaker: "command", text: "NORTHSTARより。迎撃機が上がった——F-22が2。無人機群に向かっている。", id: "r12-hunter-1" }
        ]
      },
      // The screen: Vipers keeping the player off the interceptors while the
      // drones are eaten. Trash-role, and numbered clear of the objective
      // block so the six interceptors keep TGT 1-6.
      {
        types: ["f16", "f16", "f16"], tgt: false, band: 1, label: "SCREEN",
        concurrent: true, role: "trash", idBase: 10,
        radio: [
          { speaker: "wingman", text: "護衛が3機! こっちを足止めする気だ——無人機に手が回らなくなる!", id: "r12-screen-1" }
        ]
      },
      // Second pair of interceptors, on a clock. Eagles: heavier, slower to
      // kill, and they arrive while the first screen is still alive.
      {
        types: ["f15", "f15"], band: 2, idBase: 2, label: "INTERCEPTOR",
        role: "line",
        radio: [
          { speaker: "command", text: "第2波、F-15が2機。……無人機の損失、これで6機目。数えるのをやめていいか、と聞かれている。", id: "r12-hunter-2" }
        ]
      },
      {
        types: ["f16", "f16"], tgt: false, band: 2, label: "SCREEN",
        concurrent: true, role: "trash", delay: 35, idBase: 13
      },
      // The Rafale pair at elite is the sortie's real threat, arriving in the
      // middle of the fight the way m-city's top cover does.
      {
        types: ["rafale", "rafale"], tgt: false, band: 1, label: "TOP COVER",
        concurrent: true, role: "elite", delay: 70, idBase: 15,
        radio: [
          { speaker: "wingman", text: "上にラファール2機! 無人機は放っておいても文句を言わない——先にこっちを片付けます!", id: "r12-topcover" }
        ]
      },
      // Last pair. Hornets, and the wave that closes the mission on the line
      // the whole sortie is built around.
      {
        types: ["fa18", "fa18"], band: 2, idBase: 4, label: "INTERCEPTOR",
        role: "line",
        radio: [
          { speaker: "wingman", text: "最終波、2機! ……NORTHSTAR、無人機はまだ何機残ってます? ……了解、聞かなかったことにします。", id: "r12-hunter-3" }
        ]
      },
      {
        types: ["f16", "f16", "gripen"], tgt: false, band: 1, label: "SCREEN",
        concurrent: true, role: "trash", idBase: 17
      }
    ],
    // Six fighter hulls at night, ten more on the board that never have to be
    // touched. Above m-swarm's 250 because these are crewed airframes that do
    // not die to one missile, and below r11's 330 because nothing on the
    // ground pins the player to a spot.
    parTime: 300,
    hasOutro: false,
    map: { x: 0.57, y: 0.72 },
    battleCenter: { x: 0, z: -1400 },
    battleRadius: 7200,
    briefing: "夜間、無人機部隊に随伴する。14機。うち何機が還るかは、作戦の成否には数えられない。\n指定目標は無人機群を狩りに上がった敵迎撃機6機。F-22が2、F-15が2、F/A-18が2。\n護衛と上位掩護が10機。落とす義務は無い。\nラファールの一組だけは別だ——あれは無人機ではなく、こちらを見ている。\n無人機は君の指示を待たない。守る対象でもない。ただ前を飛んでいる。\n迎撃機を落とせ。それだけが、この空で数えられる仕事だ。",
    introRadio: [
      { speaker: "command", text: "NORTHSTARより。無人機群、進入。随伴せよ——迎撃が上がったら、それが君の目標だ。", id: "r12-brief" },
      { speaker: "wingman", text: "……あれ、こっちを見ないんですね。撃たれても、悲鳴のひとつも上げない。", id: "r12-brief-wing" }
    ]
  }, { after: "r11" });

  // =====================================================================
  // r13 CUT THE LINE - the reverse of m-escort (LIFELINE). ★ the hinge.
  // =====================================================================
  //
  // The one mission in this block whose outcome is CONTRACTED by the other
  // campaign. m-escort ships with "1機は失うが残りは守り切る" written into its
  // rules: losing one transport is a score penalty, losing all three is a
  // fail. spec_rus_campaign §2 therefore fixes this side as "1機は落とすが
  // 取り逃がす", and spec_campaign_story §3 says the same. Both sides have to
  // be able to tell the truth about the same afternoon.
  //
  // How that is built, and it is the whole design of the mission:
  //
  //   * THREE transports are on the board. Exactly ONE of them is designated.
  //     That single hull is the entire TGT list of the sortie, so the mission
  //     can be ACCOMPLISHED - the player really does kill a transport, which
  //     is the one thing m-escort's epilogue admits happened.
  //   * The other two are `tgt: false`. They are killable - refusing to let
  //     the player shoot at something they can see would be worse than the
  //     contradiction it avoids - but nothing about ACCOMPLISHED reads them,
  //     and the epilogue states flatly that they got away. That is the split
  //     spec_rus_campaign §2 asks for in as many words: "ゲームの勝敗と物語の
  //     勝敗を分離する".
  //   * The two undesignated transports arrive LATE and at the far end of the
  //     board, behind an escort wave, so in ordinary play the sortie is over
  //     before they are reachable. The fiction and the likely play match
  //     without the rules having to lie.
  //
  // The escort is the difficulty, and it is heavy: this is the mission where
  // the AEF knows exactly what is coming. 1 TGT against 16 non-TGT is far
  // outside the 1:1.5-2 band, and that band does not apply here for the same
  // reason m-desert's note gives - the band is written for sorties whose TGT
  // list is a stack of fighters. A single unarmed hull IS the objective, and
  // what makes it hard is everything standing in front of it.
  ctx.addMission({
    key: "r13",
    campaign: "rus",
    world: "archipelagoDay",
    title: "CUT THE LINE",
    jp: "敵の輸送隊が島嶼線を横断中。指定目標は輸送機1機。護衛は厚い——1機で十分だ、抜けろ。",
    act: 3,
    storyNo: 13,
    story: "敵の輸送機が島嶼線を横断する。積荷は補給品——そう聞かされている。\n護衛は1機だけ付いている。それが何を意味するかは、飛べば分かる。",
    epilogue: [
      "輸送機1機を撃墜。残りの2機は島嶼線を抜けた。取り逃がした。",
      "後日、あの輸送隊が運んでいたものの一部が判明した。医薬品と、それから、人。",
      "NORTHSTARは報告のあと十秒黙り、それから次の任務を読み上げた。"
    ],
    sequence: [
      // The objective. One hull, alone at the head of the convoy, and the
      // only designated contact in the sortie. Unarmed - transport has
      // gunDamage 0 on both sides of the table - so nothing about killing it
      // is a fight. Reaching it is.
      {
        types: ["transport"], band: 1, idBase: 0, label: "TRANSPORT",
        radio: [
          { speaker: "command", text: "NORTHSTARより。輸送隊を捕捉——先頭の1機が指定目標だ。他は追うな。", id: "r13-target" }
        ]
      },
      // The close escort, on the board from the first second. Eagles at
      // `line`: this is not a screen the player can wave off, it is two
      // aircraft standing directly between them and an unarmed target.
      {
        types: ["f15", "f15"], tgt: false, band: 1, label: "CLOSE ESCORT",
        concurrent: true, role: "line", idBase: 10,
        radio: [
          { speaker: "wingman", text: "直掩が2機、F-15! 輸送機に張り付いてます——正面からじゃ届かない!", id: "r13-close-escort" }
        ]
      },
      // The outer screen. Trash-role Vipers, numerous, and their entire job
      // is to make the run-in expensive in time rather than in hull.
      {
        types: ["f16", "f16", "f16"], tgt: false, band: 2, label: "SCREEN",
        concurrent: true, role: "trash", delay: 25, idBase: 12,
        radio: [
          { speaker: "wingman", text: "外周に3機! 数で遅らせる気だ——付き合ったら輸送機は抜けます!", id: "r13-screen-1" }
        ]
      },
      // The pair with teeth. A Raptor at `elite` and a Typhoon with it,
      // arriving while the player is working the close escort - i.e. exactly
      // when breaking off costs the objective.
      {
        types: ["f22", "typhoon"], tgt: false, band: 1, label: "COMBAT AIR PATROL",
        concurrent: true, role: "elite", delay: 60, idBase: 15,
        radio: [
          { speaker: "command", text: "警告——F-22が1機、上位掩護に入った。深追いするな、目標は輸送機だ。", id: "r13-cap" }
        ]
      },
      // ★ The two that get away.
      //
      // Undesignated on purpose and stated as such in the briefing. They come
      // in late (delay 110), behind their own escort, at the tail of a convoy
      // that is already leaving the area - so the sortie is normally
      // ACCOMPLISHED before they are in reach. A player who ignores the
      // objective and chases them can shoot at them, and should be able to;
      // what they cannot do is make the mission count it, and the debrief
      // says the convoy got through either way.
      {
        types: ["transport", "transport"], tgt: false, band: 2, label: "TRANSPORT",
        concurrent: true, role: "trash", delay: 110, idBase: 17,
        radio: [
          { speaker: "wingman", text: "後続が2機! ……無指定目標です。指定は1機だけ——命令は1機だけです、IRONBACK。", id: "r13-others" }
        ]
      },
      {
        types: ["f16", "f16", "fa18", "fa18"], tgt: false, band: 2, label: "REAR ESCORT",
        concurrent: true, role: "trash", delay: 120, idBase: 19,
        radio: [
          { speaker: "command", text: "後続には別の護衛が付いている。……追うな。指定目標を仕留めたら離脱しろ。", id: "r13-rear-escort" }
        ]
      }
    ],
    // One unarmed hull at two missiles, reached through two Eagles flown at
    // the full airframe and a Raptor that arrives in the middle of it. Short
    // - the sortie is a single successful approach, not an attrition fight -
    // and well under m-escort's 320, because the player is not tied to a
    // convoy crossing the map at 92 m/s.
    parTime: 230,
    hasOutro: false,
    map: { x: 0.66, y: 0.20 },
    // Laid over the crossing the mirror mission flies: m-escort's convoy runs
    // from z +1900 to z -15800, so the arena has to cover the corridor rather
    // than sit on the origin. Same centre and radius as that mission, because
    // it is the same airspace on the same afternoon.
    battleCenter: { x: 0, z: -6800 },
    battleRadius: 11200,
    briefing: "敵の輸送隊が島嶼線を横断している。3機。包囲された守備隊への補給だ。\n指定目標は先頭の1機のみ。他の2機には手を出すな——命令はそうなっている。\n直掩はF-15が2機。奴らは輸送機から離れない。正面から入れば必ず捕まる。\n外周と後衛にさらに7機、上位掩護にF-22が1機とタイフーンが1機。全て無指定目標だ。\n輸送機は撃ってこない。丸腰だ。近づく前に、護衛を1機ぶんだけ引き剥がせ。\n1機で十分だと言われている。……1機で十分なら、なぜ3機来るのかは聞くな。",
    introRadio: [
      { speaker: "command", text: "NORTHSTARより。輸送隊、島嶼線に進入。指定目標は先頭の1機——それだけだ。", id: "r13-brief" },
      { speaker: "wingman", text: "……丸腰の相手ですよ。これも解放のうちですか。……いえ、続けます。行きましょう。", id: "r13-brief-wing" }
    ]
  }, { after: "r12" });

  // =====================================================================
  // r14 THE RAMP - the reverse of m-landing (BEACHHEAD).
  // =====================================================================
  //
  // m-landing is the player sinking five landing ships 1.7km short of a beach
  // they will reach in about three minutes. The reverse is the cover flight
  // over those same five hulls, and the clock is identical because it is the
  // same clock: the group is going to touch the sand at the same moment on
  // both sides of the mirror, and on this side that is the good outcome.
  //
  // The landing ships themselves are NOT on this board. They cannot be - the
  // only friendly hulls the engine knows about come from FRIENDLY_DEPLOYMENTS,
  // which a payload cannot reach, and putting them in `sequence` would make
  // them enemies the player is asked to escort by not shooting. So the group
  // is in the fiction (briefing, radio, epilogue) and the board is the air
  // battle over it, which is what a cover flight actually is.
  //
  // 6 TGT against 11 non-TGT is 1:1.83, the same shape m-landing's mirror uses
  // for the same reason: the interference IS the difficulty. What makes this
  // one distinct from r11 - also a defensive 6:11 - is the direction of the
  // pressure. In r11 the player holds a point. Here the point is moving, at
  // 9 m/s, toward the enemy, and it cannot be told to wait.
  ctx.addMission({
    key: "r14",
    campaign: "rus",
    world: "sunsetOcean",
    title: "THE RAMP",
    jp: "揚陸艦団が海岸へ向かう。上陸するまでの十数分、上空を掩護せよ。指定目標は対艦攻撃機6機。",
    act: 3,
    storyNo: 14,
    story: "揚陸艦団が海岸へ向かっている。着いてしまえば、そこから先は空の戦争ではなくなる。\n夕日は敵の背にある。こちらからは逆光だ。",
    epilogue: [
      "揚陸艦団は着岸。5隻すべてがランプを下ろした。上陸は成立した。",
      "砂浜から先で何が起きたかは、空にいた者には見えない。報告書にも無い。",
      "SICKLE 2はこの日、着陸してからずっと海の方を見ていた。"
    ],
    sequence: [
      // The anti-ship element, already committed when the player arrives.
      // Hornets at `line`, because that is what actually flies an anti-ship
      // profile - and because the player has to feel the airframes get
      // serious in ACT 3.
      {
        types: ["fa18", "fa18"], band: 1, idBase: 0, label: "STRIKE",
        role: "line",
        radio: [
          { speaker: "command", text: "NORTHSTARより。対艦攻撃機を探知——F/A-18が2、揚陸艦団に向かっている。落とせ。", id: "r14-strike-1" }
        ]
      },
      // The strike escort. Trash Vipers whose job is to be in the way while
      // the ships are ten minutes from the sand.
      {
        types: ["f16", "f16", "f16"], tgt: false, band: 1, label: "ESCORT",
        concurrent: true, role: "trash", idBase: 10,
        radio: [
          { speaker: "wingman", text: "護衛3機! 相手をしてる時間はありません——ランプが下りるまで艦を守れ!", id: "r14-escort-1" }
        ]
      },
      // Second run-in. Tomcats: the long-ranged pair, and they arrive on a
      // clock rather than on the first pair's death, so the player can be
      // made to choose which run-in to break up.
      {
        types: ["f14", "f14"], band: 2, idBase: 2, label: "STRIKE",
        role: "line",
        radio: [
          { speaker: "command", text: "第2波、F-14が2機。遠距離から撃ってくる——射点に入られる前に潰せ。", id: "r14-strike-2" }
        ]
      },
      {
        types: ["f16", "f2a"], tgt: false, band: 2, label: "ESCORT",
        concurrent: true, role: "trash", delay: 45, idBase: 12
      },
      // The heavy cover, and the one element at more than the published
      // airframe. Timed to land while the first hulls are nearing the sand,
      // i.e. when leaving the ships costs the most.
      {
        types: ["f15", "f15"], tgt: false, band: 1, label: "TOP COVER",
        concurrent: true, role: "elite", delay: 100, idBase: 14,
        radio: [
          { speaker: "wingman", text: "上位掩護、F-15が2機! こいつらは雑魚じゃない——艦から離れすぎないで!", id: "r14-topcover" }
        ]
      },
      // Last run-in, the heaviest. Hornets again with a Growler-weight
      // screen behind them: the final push at the beach, when the ramps are
      // already coming down.
      {
        types: ["fa18", "fa18"], band: 2, idBase: 4, label: "STRIKE",
        role: "line",
        radio: [
          { speaker: "command", text: "最終波だ。1隻でも沈められたら、あの砂浜は取れない——止めろ、IRONBACK。", id: "r14-strike-3" }
        ]
      },
      {
        types: ["f16", "f16", "gripen", "gripen"], tgt: false, band: 2, label: "LATE ESCORT",
        concurrent: true, role: "trash", delay: 40, idBase: 17
      }
    ],
    // Six fighter hulls flown while never straying far from a formation that
    // is crossing 1.7km of water at 9 m/s. Longer than m-landing's 240 - that
    // mission's par is pinned to how fast five thin-skinned hulls sink, this
    // one's is pinned to six crewed airframes at two missiles each - and
    // under r11's 330 because the sortie ends when the ramps drop.
    parTime: 300,
    hasOutro: false,
    map: { x: 0.78, y: 0.48 },
    // Laid over the run the mirror mission is fought on: the group steams from
    // x -500 to the beach at x +1650 while the player spawns at z +620, so the
    // arena has to cover the whole width of the approach. Same numbers as
    // m-landing, because it is the same water.
    battleCenter: { x: 600, z: -700 },
    battleRadius: 6500,
    briefing: "揚陸艦団が海岸へ向かっている。5隻。着岸まで、およそ3分。\nこの3分だけが君の任務だ。ランプが下りれば、そこから先は歩兵の戦争になる。\n指定目標は対艦攻撃機6機。F/A-18が4、F-14が2。3波に分かれて来る。\n護衛が11機。落とす義務は無いが、上位掩護のF-15だけは本気で来る。\n艦は避けられない。速力は遅く、針路も変えられない。守れるのは君だけだ。\n夕日は敵の背にある。逆光だ——見えない方角から来ると思って飛べ。",
    introRadio: [
      { speaker: "command", text: "NORTHSTARより。揚陸艦団、着岸まで3分。対艦攻撃隊が来る——1隻も沈めさせるな。", id: "r14-brief" },
      { speaker: "wingman", text: "あの艦、全部で何人乗ってるんでしょうね。……数えないほうがいいか。行きます。", id: "r14-brief-wing" }
    ]
  }, { after: "r13" });

  // =====================================================================
  // r15 CITY LIGHTS - the reverse of m-city. ★ the campaign's turning point.
  // =====================================================================
  //
  // Story bible §4 ACT 3: "自分が爆撃隊を護衛する。グレフ大佐の命令。NORTHSTAR
  // の復唱が硬い。眼下で街の灯が一区画ずつ消えていく。プレイヤーは、街を焼く
  // 側を飛ぶ。露編最大の分岐点."
  //
  // Everything in this entry is subordinate to that. Two rules the bible sets
  // (§6) decide how it is written: the player never speaks, and neither side
  // is written as evil. So the weight cannot come from the player refusing,
  // and it cannot come from anyone calling the mission a crime. It comes from
  // three places instead, all of them things the game already does:
  //
  //   1. THE RADIO GETS SHORTER AS THE MISSION GOES ON. NORTHSTAR opens
  //      reading an order aloud in full - the formal repeat-back that §2 of
  //      the bible says makes her voice go hard - and by the third stream she
  //      is down to four words. Nobody says anything about it. The shrinking
  //      is the performance.
  //   2. SICKLE 2 STOPS BELIEVING, ON THE AIR, IN ONE SORTIE. He is the man
  //      who has said "これは解放だ" since mission 01. Here he says it once
  //      more, early, and then he does not say it again; his last line is a
  //      question he does not finish. He is not converted and he does not
  //      mutiny - he just runs out of the sentence.
  //   3. THE OBJECTIVE IS THE BOMBERS' SURVIVAL, NOT THE CITY'S DESTRUCTION.
  //      The designated list is the six AEF interceptors trying to break up
  //      the raid. The player is never asked to attack the city; they are
  //      asked to keep other pilots away from the aircraft that will. That is
  //      exactly how escorting works and it is the most damning version of it,
  //      because at no point does the player do anything but fly well.
  //
  // The mirror is exact: m-city puts six Tu-95s over Saint Verda in three
  // streams with eleven escorts. Here those same six Bears are the flight the
  // player is inside - undesignated contacts on the board, so they can be seen
  // and are not objectives - and the eleven-strong escort is SICKLE flight,
  // i.e. the player. The interceptors are the AEF's answer to them.
  //
  // On the ratio, which needs stating because this mission has two kinds of
  // non-TGT contact on the board and only one of them is interference:
  // 6 TGT against 10 screening fighters is 1:1.67, inside the 1:1.5-2 band.
  // The six bombers are also undesignated contacts (total 20), but they are
  // the thing being escorted rather than something standing in the player's
  // way, so counting them into the band would overstate the opposition. The
  // mirror mission's own note counts the same way from the other side.
  ctx.addMission({
    key: "r15",
    campaign: "rus",
    world: "nightCity",
    title: "CITY LIGHTS",
    jp: "セント・ヴェルダ市街への夜間爆撃。爆撃隊3波を護衛せよ。指定目標は迎撃機6機。",
    act: 3,
    storyNo: 15,
    story: "セント・ヴェルダ——連合の首都。市街の中心に、建設中のBABELが立っている。\n今夜そこに爆弾を落とすのは、我々だ。",
    epilogue: [
      "爆撃隊は目標上空に到達。6機のうち5機が投弾し、帰投した。",
      "離脱の空から市街を見た。灯りは、いくつかの区画で戻らなかった。",
      "グレフ大佐は「塔の足元を叩いた」と言った。眼下に見えていたのは、塔ではなかった。"
    ],
    sequence: [
      // The bombers. Undesignated - they are what the player is escorting,
      // not what the player is killing - and on the board from the first
      // second so the opening frame of the mission is a bomber stream over a
      // lit city, seen from inside the stream.
      //
      // `bomber` rather than tu95 for the lead element: it is the heaviest
      // airframe in the table and the silhouette reads as strategic from the
      // cockpit. Trash role so they never turn the sortie into a dogfight of
      // their own - they are scenery with a purpose, which is the correct
      // shape for an aircraft the player is not allowed to influence.
      // ★ The wave PRINCIPAL is the interceptor pair, not the bombers. That
      // ordering is load-bearing and was a bug on the first draft: the wave
      // machine only advances when the non-concurrent entry is dead, so a
      // sortie that opens on two undesignated bombers is a sortie that cannot
      // progress until the player shoots the aircraft they are escorting.
      // Every bomber element in this mission is therefore a `concurrent`
      // rider on an interception, which is also the honest reading - the
      // streams are a clock the player does not control.
      //
      // Raptors at `line`: the city's own alert flight, and the aircraft the
      // player has learned to respect by now.
      {
        types: ["f22", "f22"], band: 1, idBase: 0, label: "INTERCEPTOR",
        role: "line",
        radio: [
          { speaker: "command", text: "NORTHSTARより全機。作戦命令を復唱する——「セント・ヴェルダ市街、産業区および港湾区。爆撃隊3波。護衛は全機、投弾完了まで離脱を許可しない」。以上、グレフ大佐名義。", id: "r15-order" }
        ]
      },
      // The bombers, riding in with the first interception so the opening
      // frame of the mission is a bomber stream over a lit city, seen from
      // inside the stream.
      //
      // `bomber` rather than tu95 for the lead element: it is the heaviest
      // airframe in the table and the silhouette reads as strategic from the
      // cockpit. Trash role so they never turn the sortie into a dogfight of
      // their own - they are scenery with a purpose, which is the correct
      // shape for an aircraft the player is not allowed to influence.
      {
        types: ["bomber", "bomber"], tgt: false, band: 1, label: "HAMMER FLIGHT",
        concurrent: true, role: "trash", idBase: 10,
        radio: [
          { speaker: "wingman", text: "迎撃機、F-22が2機! 爆撃隊に向かってます——これは解放だ、通しましょう!", id: "r15-hunter-1" }
        ]
      },
      // The city's screening fighters. Trash, and they are here to keep the
      // player from being everywhere at once - the same function the player's
      // own side performed in the mirror mission.
      {
        types: ["f16", "f16", "f16"], tgt: false, band: 1, label: "SCREEN",
        concurrent: true, role: "trash", idBase: 20
      },
      // Second stream, on a clock. Two more bombers arriving while the player
      // is still working the first interception, which is the whole reason
      // the mission is hard: being in front of one stream means not being in
      // front of another.
      {
        types: ["tu95", "tu95"], tgt: false, band: 2, label: "HAMMER FLIGHT",
        concurrent: true, role: "trash", delay: 45, idBase: 12,
        radio: [
          { speaker: "command", text: "第2波、投弾コースに入る。……港湾区の灯が落ちた。", id: "r15-second-stream" }
        ]
      },
      // Second interception. Eagles.
      {
        types: ["f15", "f15"], band: 2, idBase: 2, label: "INTERCEPTOR",
        role: "line",
        radio: [
          { speaker: "wingman", text: "第2波の迎撃です、F-15が2機! ……NORTHSTAR、下の街、まだ人がいるんですよね。", id: "r15-hunter-2" }
        ]
      },
      // The one element flown above the airframe. A Typhoon pair at `elite`,
      // arriving in the middle - and the reason the third stream has to be
      // taken through a screen.
      {
        types: ["typhoon", "typhoon"], tgt: false, band: 1, label: "TOP COVER",
        concurrent: true, role: "elite", delay: 80, idBase: 22,
        radio: [
          { speaker: "command", text: "上位掩護にタイフーン2機。……離脱は許可されていない。続けろ。", id: "r15-top-cover" }
        ]
      },
      // Third stream. Rides on the SECOND interception rather than the first,
      // so a player who clears wave 1 quickly does not skip it - a delayed
      // rider whose principal is already dead is never spawned, and a bomber
      // stream the mission promised in the briefing must not be refusable
      // that way. 110s after wave 2 opens puts it late in that wave without
      // depending on the player being slow.
      {
        types: ["tu95", "tu95"], tgt: false, band: 2, label: "HAMMER FLIGHT",
        concurrent: true, role: "trash", delay: 110, idBase: 14,
        radio: [
          { speaker: "command", text: "第3波、進入。", id: "r15-third-stream" }
        ]
      },
      // Last interception. The final pair, and SICKLE 2's last line in the
      // sortie - a sentence he does not finish. He is not refusing; he simply
      // has nothing left to call this.
      {
        types: ["rafale", "rafale"], band: 1, idBase: 4, label: "INTERCEPTOR",
        role: "line",
        radio: [
          { speaker: "wingman", text: "……最終波の迎撃、2機。行きます。……IRONBACK、これは", id: "r15-hunter-3" }
        ]
      },
      {
        types: ["f16", "f16", "fa18", "f2a", "f2a"], tgt: false, band: 2, label: "LATE SCREEN",
        concurrent: true, role: "trash", delay: 30, idBase: 24,
        radio: [
          { speaker: "command", text: "投弾完了まであと少しだ。……あと少しだ。", id: "r15-late-screen" }
        ]
      }
    ],
    // Six crewed hulls at two missiles each, flown over a city at night while
    // never being able to leave the stream. Matched to m-city's 390: it is
    // the same raid, the same three streams and the same clock, and a player
    // who flies it at par on either side is watching the same districts go
    // dark at the same moments.
    parTime: 390,
    hasOutro: false,
    map: { x: 0.44, y: 0.60 },
    // ★ NO `friendlyBase` HERE, deliberately, and it is the most important
    // omission in the file.
    //
    // m-city stands Saint Verda up as `friendlyBase` with style "city": that
    // is what gives the mirror mission its blue HUD diamond, its approach
    // warnings, its breach penalty and its district-by-district failure. All
    // of that machinery exists to let the player TRY to save the city and
    // partly fail.
    //
    // On this side the player is not trying. Handing them the same diamond
    // would put a defended-objective marker on a city they are helping to
    // burn, and the two approach warnings would be firing on their own side's
    // bombers. The absence is the statement: there is nothing on this HUD to
    // protect. What is under the aircraft is just terrain now.
    //
    // Same arena as m-city, because it is the same night over the same city:
    // spawn at z +620, the district at z -9000, centred midway down the
    // corridor so the whole run and an overshoot past the far waterfront sit
    // inside the 90% warning ring.
    battleCenter: { x: 0, z: -4200 },
    battleRadius: 8600,
    briefing: "セント・ヴェルダ。連合の首都だ。市街の中心に、建設中のBABELが立っている。\n今夜、そこに爆弾を落とす。落とすのは我々の爆撃隊で、護衛は君だ。\n指定目標は迎撃に上がる敵戦闘機6機。F-22が2、F-15が2、ラファールが2。\n爆撃隊は6機、3波。彼らは君の指示を待たない。投弾まで守り切れ。\n街の灯が一区画ずつ消えていくのを、君は上空から見ることになる。\nグレフ大佐名義の命令だ。投弾完了まで、離脱は許可されていない。",
    introRadio: [
      { speaker: "command", text: "NORTHSTARより全機。爆撃隊、セント・ヴェルダ市街へ進入する。護衛につけ。", id: "r15-brief" },
      { speaker: "wingman", text: "……眼下は街ですよ。塔だけじゃない。……いえ、命令は聞こえてます。SICKLE 2、続きます。", id: "r15-brief-wing" }
    ]
  }, { after: "r14" });
}
