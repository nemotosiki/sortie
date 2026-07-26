// rus_act4.payload.js - Russian campaign r16-r20 (ACT 3 tail + ACT 4).
//
// docs/story_bible.md §4 puts r16-r17 in ACT 3 ("焼く側に立つ／火") and r18-r20
// in ACT 4 ("失う／終末"). This is the climax of OPERATION DELUGE: the sorties
// where IRONBACK stops taking ground and starts losing people.
//
// Every mission here is the underside of a mission the player has already flown
// from the other seat, so the map, the hour and the weather are pinned to the
// American original rather than chosen:
//
//   r16 <- m-carrier  sunsetOcean     the carrier the AEF defended
//   r17 <- m-intercept archipelagoDay the bomber stream the AEF broke up
//   r18 <- m-squadron glacierCanyon   the melee, with the squadrons swapped
//   r19 <- m04        archipelagoDay  the duel, from the other cockpit
//   r20 <- m05        archipelagoDay  the finale, as a withdrawal
//
// The enemy is the AEF, so the airframes are western - Raptor, Typhoon, Rafale,
// Eagle - and by this point in the campaign they are flown at `expert`, not at
// the rookie/regular tiers ACT 1 opened with. Speakers are NORTHSTAR (command),
// SICKLE 2 (wingman) and AEF pilots (enemy).
//
// ★ MERGE NOTE for whoever lands this: the lines below are written as NORTHSTAR
// and SICKLE 2, but RADIO_SPEAKERS (index.html) hard-codes the printed labels as
// "SKYEYE" and "HAMMER 2". That table is not one a payload can register into, so
// until it is made campaign-aware these lines will render under the American
// callsigns. Every other Russian payload has the same dependency; it is one
// table and one lookup, and it belongs to whoever owns index.html.
//
// ★ SECOND MERGE NOTE, r19 specifically: buildDebriefIntelLines() prints
// "<ace>撃墜を確認" on any successful sortie that fielded a named pilot, under
// the header INTERCEPTED ENEMY COMMS. On r19 that is the AEF reporting NIMROD
// dead, one line above an epilogue that says he was not - and the whole point of
// the mission is that he was not. It is not reachable from a payload (the
// function is inline and reads only `missionAcePilot`), and the fix is one
// condition: a mission that wants to field an ace it does not designate should
// not get the kill-confirmed line. Flagged rather than worked around, because
// the alternative from in here was to drop `ace: "hangman"` and fly him as an
// anonymous grey Raptor, which costs the paint, the radio and the ace music -
// i.e. everything that makes the mirror land.
//
// Two of these five are settled history the player cannot rewrite (r16: the
// carrier does not sink; r19: NIMROD does not fall). Per docs/spec_rus_campaign.md
// §2, the fix is to separate the game's win condition from the story's: the
// designated targets are things the player really can kill, ACCOMPLISHED is
// really earned, and the epilogue is where the war says it was not enough.
export default function register(ctx) {
  // ---- The Atlas flight -----------------------------------------------------
  // Story bible §2: the AEF's own ace squadron, and the mirror of Jormungandr.
  // Where the NFF took its callsigns from the Norse end of the world, the AEF
  // takes its from the Greek side of the split - the builders. ATLAS holds the
  // sky up, PROMETHEUS hands the fire over, DAEDALUS builds the wings, and
  // ICARUS is what happens to the man who wears them.
  //
  // Written the way ACE_PROFILES is written everywhere else: a profile owns a
  // callsign, a paint and a radio, and never an airframe. No `variant` here, so
  // the model comes from the wave - which is what lets the four read apart in
  // a melee as Raptor / Eagle / Typhoon / Rafale. `scale` is the one geometry
  // field pinned, a notch over the base each wave flies.
  //
  // The radio is written from the AEF side: they call the player NIMROD's
  // opposite number, IRONBACK, because that is the name their side gave him.
  ctx.addAceProfile("atlas", {
    callsign: "ATLAS",
    role: "Atlas Lead",
    behavior: "evasive",
    evadeLateral: 84,
    evadeVertical: 34,
    evadeFrequency: 2.1,
    radarColor: "#8fd6ff",
    tracerColor: 0x8fd6ff,
    theme: {
      primary: 0x39424d,
      secondary: 0x1e242c,
      accent: 0x8fd6ff,
      canopy: 0xd7c07a,
      exhaust: 0xa8e6ff,
      scale: 0.90
    },
    radio: {
      inbound: "敵編隊にネームド——『ATLAS』。西側のエース隊、隊長機だ。",
      wingman: "アトラス隊……こっちのヨルムンガンドと同じ格の連中だ。数で来ないぞ、腕で来る。",
      engage: "こちらATLAS。IRONBACK——この空は我々が支えている。降りてもらう。",
      down: "こちらATLAS…被弾…支えきれん…あとは任せた…"
    }
  });
  ctx.addAceProfile("prometheus", {
    callsign: "PROMETHEUS",
    role: "Element Lead",
    behavior: "evasive",
    evadeLateral: 78,
    evadeVertical: 30,
    evadeFrequency: 2.3,
    radarColor: "#ffb46a",
    tracerColor: 0xffb46a,
    theme: {
      primary: 0x4a3a2a,
      secondary: 0x271d15,
      accent: 0xffb46a,
      canopy: 0xffe0a8,
      exhaust: 0xffc27a,
      scale: 1.10
    },
    radio: {
      inbound: "2機目もネームドだ——『PROMETHEUS』。アトラスの僚機、離れない。",
      wingman: "プロメテウス……火を配って回った奴の名前だな。趣味が悪い。",
      engage: "こちらPROMETHEUS。火を渡したのは我々だ。返してもらうぞ。",
      down: "こちらPROMETHEUS…火が…回った…"
    }
  });
  ctx.addAceProfile("daedalus", {
    callsign: "DAEDALUS",
    role: "Flight Leader",
    behavior: "evasive",
    evadeLateral: 90,
    evadeVertical: 36,
    evadeFrequency: 2.4,
    radarColor: "#c6b0ff",
    tracerColor: 0xc6b0ff,
    theme: {
      primary: 0x3a3550,
      secondary: 0x1f1c2e,
      accent: 0xc6b0ff,
      canopy: 0xdfd0ff,
      exhaust: 0xbba8ff,
      scale: 1.06
    },
    radio: {
      inbound: "第2波にもネームド——『DAEDALUS』。設計者の名だ。",
      wingman: "ダイダロス。翼を作った男だ。……作った本人は落ちてない、覚えとけ。",
      engage: "こちらDAEDALUS。翼は私が作った。飛び方も私が決める。",
      down: "こちらDAEDALUS…イカロス…お前は先に行くな…"
    }
  });
  // The one the mission is named for. Story bible §2 says outright that ICARUS
  // falls here, so the profile is written to be the flight's weak point and to
  // read as one: the loosest evasion of the four, the youngest voice, and a
  // wingman line that says so before the player has fired.
  ctx.addAceProfile("icarus", {
    callsign: "ICARUS",
    role: "Wingman",
    behavior: "evasive",
    evadeLateral: 64,
    evadeVertical: 24,
    evadeFrequency: 1.8,
    radarColor: "#ffe066",
    tracerColor: 0xffe066,
    theme: {
      primary: 0x50462a,
      secondary: 0x2c2716,
      accent: 0xffe066,
      canopy: 0xfff0b0,
      exhaust: 0xffe89a,
      scale: 1.04
    },
    radio: {
      inbound: "最後の1機——『ICARUS』。ダイダロスの僚機、若い。",
      wingman: "イカロス……名前で運命が決まる気がしてくるな。高く飛びすぎるなよ、坊主。",
      engage: "こちらICARUS！ ダイダロス、離れません——僕もやれます！",
      down: "こちらICARUS…高すぎた…父さん…"
    }
  });
  // ---- NIMROD --------------------------------------------------------------
  // The player, seen from the other side. Story bible §0: the antagonist of each
  // campaign is the protagonist of the other, and this is the implementation of
  // it - HAMMER 1 has no radio in his own campaign, so every line here is a
  // voice the American player never heard themselves use.
  //
  // Deliberately built as IRONBACK's twin: the same `evasive` behaviour and
  // near-identical evasion numbers as ACE_PROFILES.ironback (58/24/1.6 there,
  // 60/26/1.7 here), because "我は汝、汝は我" has to be true in the flight model
  // and not only in the text. The paint is IRONBACK's inverted - the Russian ace
  // is black with gold, so the American one is bone-white with the same gold.
  //
  // `down` exists because the table requires it, but no mission ever plays it:
  // r19 is written so NIMROD cannot be killed (see the mission itself).
  ctx.addAceProfile("hangman", {
    callsign: "NIMROD",
    role: "Squadron Leader",
    behavior: "evasive",
    evadeLateral: 60,
    evadeVertical: 26,
    evadeFrequency: 1.7,
    radarColor: "#e6ecf2",
    tracerColor: 0xe8eef5,
    theme: {
      primary: 0xd8dce2,
      secondary: 0x9aa3ad,
      accent: 0xffd35f,
      canopy: 0xffe9a8,
      exhaust: 0xdfe9f4,
      scale: 0.88
    },
    radio: {
      inbound: "エース指定機——西側が『NIMROD』と呼ばせている機体だ。奴だ。",
      wingman: "ハングマン……絞首人か。こっちが付けた名前だぞ、あれ。……来た。",
      engage: "",
      down: "……墜ちない。あれは墜ちない。"
    }
  });

  // ---- r16 ------------------------------------------------------------------
  ctx.addMission({
    key: "r16",
    campaign: "rus",
    world: "sunsetOcean",
    title: "HOME PLATE DENIED",
    jp: "西側空母打撃群への攻撃隊を掩護する。艦載機を排除し、対艦攻撃隊の突入路を開け。",
    act: 3,
    storyNo: 16,
    story: "米空母CV-71 INDEPENDENCE。奴らの帰る場所だ。\n今日、我々はそこを沈めに行く。",
    epilogue: [
      "艦載航空隊を撃破。対艦攻撃隊の突入路は開いた。",
      "だが第一波は防空網の手前で全滅し、第二波は発艦しなかった。INDEPENDENCEは沈まなかった。",
      "ミハイル老整備長が給油の手を止めずに言った——「船は浮くさ。人が乗ってるうちはな」"
    ],
    // Campaign 16, the underside of m-carrier. That sortie was the AEF player
    // keeping six attackers off a 4200 HP hull; this is the same afternoon from
    // inside the strike, and it is the first of the two sorties in this payload
    // whose outcome the player cannot change (spec_rus_campaign §2).
    //
    // The carrier is NOT on the board. That is the whole design of the mission:
    // a killable INDEPENDENCE would let the player sink a ship the other
    // campaign shows afloat, and an unkillable one parked in the middle of the
    // arena reads as a bug. So the objective is moved one step out - the sortie
    // is the fighter sweep that has to happen BEFORE the strike goes in, and
    // what the player is actually sent to do is take the carrier air wing off
    // the sky. That is a job the player really can finish, so ACCOMPLISHED is
    // really earned; the epilogue is where the strike behind them fails.
    //
    // The escort screen IS on the board, non-designated, anchored between the
    // player and the horizon: three warships that make the mission LOOK like an
    // anti-shipping sortie and mark the direction the carrier is in, without
    // ever being reachable objectives. Anchored with `at`/`facing` (BEACHHEAD's
    // mechanism) so the screen is a line steaming across the approach rather
    // than a wall parked on the player's nose.
    //
    // Six designated against eleven undesignated (three hulls + eight fighters)
    // is 1:1.83, the default shape - and the same 6:11 m-carrier itself flies,
    // which is the point.
    sequence: [
      // The CAP already up. Hornets: the carrier's own, and the first western
      // airframe the player meets flown at its published numbers.
      {
        types: ["fa18", "fa18"], band: 1, idBase: 0, label: "CVW CAP",
        skill: "expert",
        radio: [
          { speaker: "command", text: "NORTHSTARより。空母打撃群の艦載機が上がった——F/A-18が2。攻撃隊が入る前に排除しろ。", id: "r16-cap-1" }
        ]
      },
      // The screen. Not designated and never will be: an Aegis is a reason to
      // stay high, and the reason the strike behind the player is going to die.
      {
        kind: "naval", fleet: ["aegis", "frigate", "frigate"],
        tgt: false, band: 3, label: "ESCORT SCREEN", concurrent: true,
        at: [-1250, -2600], facing: [1400, -2600],
        radio: [
          { speaker: "wingman", text: "水上に護衛艦3——イージスが混ざってる。あの傘の下に母艦がいる。", id: "r16-screen" }
        ]
      },
      {
        types: ["f16", "f16"], tgt: false, band: 2, label: "LAND CAP",
        concurrent: true, role: "trash", idBase: 10,
        radio: [
          { speaker: "wingman", text: "陸上機も上がってきた！ そっちは相手にするな、艦載機だ——艦載機を落とせ！", id: "r16-land-cap" }
        ]
      },
      // Second element: Lightnings. Deck-launched into a fight already running.
      {
        types: ["f35c", "f35c"], band: 2, idBase: 2, label: "DECK LAUNCH",
        skill: "expert",
        radio: [
          { speaker: "command", text: "第2波、甲板から2機発艦——F-35C。艦隊防空の本命だ。", id: "r16-cap-2" }
        ]
      },
      {
        types: ["f16", "f16", "gripen"], tgt: false, band: 1, label: "LAND CAP",
        concurrent: true, role: "trash", idBase: 12
      },
      // Last element: Tomcats, the heaviest hulls in the sortie, holding the
      // outer picket the strike has to fly through.
      {
        types: ["f14", "f14"], band: 1, idBase: 4, label: "OUTER PICKET",
        skill: "expert",
        radio: [
          { speaker: "command", text: "最終波、F-14が2——外周の哨戒線だ。ここを抜けば攻撃隊の道が開く。", id: "r16-cap-3" }
        ]
      },
      {
        types: ["f16", "gripen", "f16"], tgt: false, band: 2, label: "RELIEF",
        concurrent: true, role: "trash", delay: 45,
        radio: [
          { speaker: "wingman", text: "増援だ！ ……ハンガーの数が違いすぎる。こっちは補充が来ないぞ。", id: "r16-relief" }
        ]
      }
    ],
    // Six expert-tier hulls (two Hornets, two Lightnings, two Tomcats) flown
    // over a live SAM screen. Slightly under m-carrier's 340 because there is
    // no ship the player has to keep the fight near - the arena is wide and the
    // player may take the merge wherever they like.
    parTime: 330,
    hasOutro: false,
    map: { x: 0.86, y: 0.66 },
    // Laid over the approach: the screen is anchored at z -2600 and the player
    // spawns at the origin, so the arena covers the whole run out and back.
    battleCenter: { x: 0, z: -2200 },
    battleRadius: 9000,
    briefing: "米空母CV-71 INDEPENDENCE。西側艦隊の中枢であり、この戦争で我々の頭上に居続けた甲板だ。\n本日、対艦攻撃隊が突入する。君の任務は攻撃隊ではない——その前を掃除することだ。\n指定目標は艦載機6機。F/A-18が2、F-35Cが2、F-14が2。全機、練度は最上位だ。\n護衛艦艇3隻が水上にいる。イージスのSAMは垂直発射だ——目標ではないが、低く飛べば撃たれる。\n陸上基地からの機体8機も上がってくるが、これも目標ではない。数に付き合うな。\n艦載航空隊さえ落ちれば、攻撃隊は通る。通した後のことは、我々の仕事ではない。",
    introRadio: [
      { speaker: "command", text: "NORTHSTARより全機。目標空域到達——本日の目標は敵空母打撃群。艦載航空隊を排除せよ。", id: "r16-brief" },
      { speaker: "wingman", text: "あの甲板を沈めれば、奴らは海に降りるしかなくなる。……行きましょう、IRONBACK。", id: "r16-brief-wing" }
    ]
  }, { after: "r15" });

  // ---- r17 ------------------------------------------------------------------
  ctx.addMission({
    key: "r17",
    campaign: "rus",
    world: "archipelagoDay",
    title: "TOWER STREAM",
    jp: "BABELへ向かう大規模爆撃編隊を護衛する。編隊へ取り付く迎撃機を排除せよ。",
    act: 3,
    storyNo: 17,
    story: "統合管制塔BABEL。あれが建てば、この海の空は永久に一つの旗の下に入る。\n今日、我々の爆撃隊が塔へ向かう。",
    epilogue: [
      "迎撃機を排除。爆撃編隊は投弾線まで到達した。",
      "塔は立っている。基部に破片ひとつ落ちなかったと、偵察は言っている。",
      "その夜、NORTHSTARは作戦命令書の署名欄を長いこと見ていた。塔の建設を承認した委員会と、塔の破壊を要求した我々への命令書。署名の形が同じだった。"
    ],
    // Campaign 17, the underside of m-intercept. Same map, same hour: the AEF
    // player spent that sortie killing six Bears, and this is the escort that
    // failed to keep them off.
    //
    // The bombers are not entities. A payload can register missions and
    // registry entries; FRIENDLY_DEPLOYMENTS is inline and keyed by mission, so
    // there is no way from here to put a friendly bomber stream on the board -
    // and a `hunt: "air"` wave with nothing to hunt would just fall back to
    // chasing the player, which is worse than not claiming it at all. So the
    // stream lives in the radio and the briefing, and what the player flies is
    // the fighter sweep ahead of it: the interceptors ARE the objective, which
    // is exactly what an escort's job is anyway.
    //
    // Six designated against twelve undesignated is 1:2.0, the top of the band
    // and the same ratio m-intercept itself flies. It is the top of the band on
    // purpose - this is the last sortie of ACT 3, and the player is meant to
    // come out of it having been outnumbered.
    sequence: [
      // The forward interceptors: Eagles, the AEF's standing alert pair.
      {
        types: ["f15", "f15"], band: 1, idBase: 0, label: "INTERCEPTOR",
        skill: "expert",
        radio: [
          { speaker: "command", text: "NORTHSTARより。前程に迎撃機——F-15が2。爆撃隊に取り付かせるな。", id: "r17-int-1" }
        ]
      },
      {
        types: ["f16", "f16", "f2a"], tgt: false, band: 1, label: "SCREEN",
        concurrent: true, role: "trash", idBase: 10,
        radio: [
          { speaker: "wingman", text: "護衛機が3！ 足止め役だ——付き合うな、迎撃機を落とせ！", id: "r17-screen-1" }
        ]
      },
      // Second element: Typhoons out of the island fields.
      {
        types: ["typhoon", "typhoon"], band: 2, idBase: 2, label: "INTERCEPTOR",
        skill: "expert",
        radio: [
          { speaker: "command", text: "第2波、タイフーンが2——長射程だ。距離を取られる前に潰せ。", id: "r17-int-2" }
        ]
      },
      {
        types: ["f16", "f16"], tgt: false, band: 2, label: "SCREEN",
        concurrent: true, role: "trash", idBase: 13
      },
      {
        types: ["gripen", "f2a", "f16"], tgt: false, band: 1, label: "REINFORCEMENT",
        concurrent: true, role: "trash", delay: 50,
        radio: [
          { speaker: "wingman", text: "また上がってきた。塔を守るためなら何機でも出す気だな、あいつら。", id: "r17-screen-2" }
        ]
      },
      // Last element: Rafales, and the heaviest screen of the sortie behind
      // them - four aircraft on the board with the pair from the first second,
      // so the stream has to be worked through a wall.
      {
        types: ["rafale", "rafale"], band: 2, idBase: 4, label: "INTERCEPTOR",
        skill: "expert",
        radio: [
          { speaker: "command", text: "最終波、ラファールが2。爆撃隊はもう投弾線に近い——あと少し保たせろ。", id: "r17-int-3" }
        ]
      },
      {
        types: ["f16", "f16", "gripen", "f2a"], tgt: false, band: 2, label: "TOP COVER",
        concurrent: true, role: "trash", idBase: 15,
        radio: [
          { speaker: "wingman", text: "最終波の護衛が厚い、4機だ！ 抜けろ——迎撃機だけ数えろ！", id: "r17-top-cover" }
        ]
      }
    ],
    // Six expert hulls through twelve the player owes nothing. Just over
    // m-intercept's 410 in difficulty terms but shorter in par, because the
    // objectives here are fighters rather than 294 HP bombers - the time goes
    // into reaching them, not into grinding them down.
    parTime: 380,
    hasOutro: false,
    map: { x: 0.34, y: 0.16 },
    battleCenter: { x: 0, z: -1600 },
    battleRadius: 9500,
    briefing: "統合管制塔BABEL——セント・ヴェルダ市街の中心に建設中の構造物だ。\n完成すれば全海域の管制・通信・防空が一元化される。この海の空は、握った者のものになる。\n本日、我が方の重爆撃編隊が塔へ向かう。君の任務はその護衛だ。\n指定目標は編隊へ取り付く迎撃機6機。F-15が2、タイフーンが2、ラファールが2。全て最上位練度だ。\n護衛の12機は目標ではない。落とす義務は無いが、張り付かれれば迎撃機に手が届かなくなる。\n爆撃隊は自力では守れない。君が抜けば、彼らは落ちる。",
    introRadio: [
      { speaker: "command", text: "NORTHSTARより。爆撃編隊、進入開始。目標はBABEL——SICKLE隊、上空掩護に就け。", id: "r17-brief" },
      { speaker: "wingman", text: "あの塔さえ倒れれば終わるんですよね。……終わりますよね、IRONBACK。", id: "r17-brief-wing" }
    ]
  }, { after: "r16" });

  // ---- r18 ------------------------------------------------------------------
  ctx.addMission({
    key: "r18",
    campaign: "rus",
    world: "glacierCanyon",
    title: "ATLAS FALLING",
    jp: "氷河峡谷にAEFのエース飛行隊が展開。ヨルムンガンド隊と共に迎え撃つ。ネームド4機を撃墜せよ。",
    act: 4,
    storyNo: 18,
    story: "氷の下の神殿の上に、四つの名前が待っている。\n今日は我々が待たれている側だ。",
    epilogue: [
      "アトラス隊、全機撃墜。西側の精鋭飛行隊がひとつ、地図から消えた。",
      "最後に墜ちたのはICARUS。回収された記録では、まだ二十三歳だった。名前が運命を言っていた、と誰かが言った。",
      "ヨルムンガンド隊は3機が帰投。SICKLE 2は自分の機体から降りず、しばらくキャノピーを開けなかった。"
    ],
    // Campaign 18, the mirror of m-squadron. That sortie was the AEF player
    // cutting through Jormungandr; this is the same ice from the other side,
    // with the player's OWN squadron alive around them and the AEF's four
    // builders coming up the canyon.
    //
    // Structural mirror of m-squadron, deliberately: four named pilots, one per
    // wave entry because a wave carries exactly one `aceSlot`, each on a
    // DIFFERENT airframe so the melee reads as four silhouettes - Raptor,
    // Eagle, Typhoon, Rafale. Two on the board from the first second (ATLAS
    // leading, PROMETHEUS concurrent), then DAEDALUS and ICARUS as wave 2 once
    // the first pair is down: two engagements of two, not one of four, which is
    // what keeps four ace-role hulls survivable.
    //
    // ICARUS is last on purpose. Story bible §2 says he falls here, so he is
    // the final designated kill of the sortie and the epilogue is about him.
    //
    // Ids 0-3 for the named pilots so TGT REMAIN counts the callsigns in
    // arrival order; interference sits at 10+ and never renumbers one.
    //
    // Four designated against seven undesignated is 1:1.75, m-squadron's own
    // ratio. The trash is what makes it a melee rather than four duels.
    sequence: [
      { types: ["f22"], ace: "atlas", band: 2, idBase: 0, label: "ATLAS FLIGHT" },
      {
        // Concurrent with no delay: the pair is on the board together or it is
        // not a squadron fight. Custom radio rather than the ace fallback,
        // which would queue four lines deep and bury the escort call.
        types: ["f15"], ace: "prometheus", band: 1, concurrent: true, idBase: 1,
        radio: [
          { speaker: "command", text: "2機目にもコールサイン——『PROMETHEUS』。F-15だ、正面からの一撃に気をつけろ。", id: "r18-prometheus" }
        ]
      },
      {
        types: ["f16", "f16", "f2a"], tgt: false, band: 1, label: "ATLAS ESCORT",
        concurrent: true, role: "trash", idBase: 10,
        radio: [
          { speaker: "wingman", text: "エースの僚機が3機！ こっちも数はいる——名前持ちだけ数えてください、IRONBACK！", id: "r18-escort-1" }
        ]
      },
      // Wave 2: the builder and the boy. Non-concurrent, so they arrive only
      // once ATLAS and PROMETHEUS are gone.
      { types: ["typhoon"], ace: "daedalus", band: 1, idBase: 2, label: "ATLAS FLIGHT" },
      {
        types: ["rafale"], ace: "icarus", band: 2, concurrent: true, idBase: 3,
        radio: [
          { speaker: "wingman", text: "最後の1機、『ICARUS』——若いな。……あの高度で、あの入り方は無いだろう。", id: "r18-icarus" }
        ]
      },
      {
        types: ["f16", "f16"], tgt: false, band: 1, label: "ATLAS RELIEF",
        concurrent: true, role: "trash", idBase: 13, delay: 45
      },
      {
        // Never spawns at all if the second pair goes down inside 100s - the
        // reward for finishing them fast, exactly as in m-squadron.
        types: ["gripen", "f16"], tgt: false, band: 2, label: "INTERFERENCE",
        concurrent: true, role: "trash", idBase: 15, delay: 100,
        radio: [
          { speaker: "wingman", text: "まだ来る！ ……こっちの残弾はもう数えられます。早く終わらせてください！", id: "r18-interference" }
        ]
      }
    ],
    // Four ace-role hulls (200 + 175 + 165 + 155 HP class) at 1.2x turn, through
    // seven fighters the player owes nothing. Sits at m-squadron's 330 because
    // it is the same fight: same map, same shape, same count.
    parTime: 330,
    hasOutro: false,
    map: { x: 0.22, y: 0.16 },
    battleCenter: { x: 0, z: -1200 },
    battleRadius: 8500,
    briefing: "氷河回廊上空に西側同盟軍のエース飛行隊が展開した。連中は『アトラス隊』と名乗っている。\n指定目標は4機、全員がネームドだ。ATLAS、PROMETHEUS、DAEDALUS、ICARUS。\n機体はバラバラだ——F-22、F-15、タイフーン、ラファール。見分けはつく、見分けろ。\n先に上がるのはATLASとPROMETHEUSの2機。落とせば残る2機が上がってくる。\n今日はヨルムンガンド隊が付いている。君は一人ではない。\n僚機が7機いるが、落とす必要はない。名前を持つ4機だけを数えろ。",
    introRadio: [
      { speaker: "command", text: "NORTHSTARより。氷河回廊上空に敵エース編隊——4機、全機がネームド。アトラス隊よ。", id: "r18-brief" },
      { speaker: "wingman", text: "4対1じゃない。今日は4対4だ。……行きましょう、IRONBACK。後ろは俺が見ます。", id: "r18-brief-wing" }
    ]
  }, { after: "r17" });

  // ---- r19 ------------------------------------------------------------------
  ctx.addMission({
    key: "r19",
    campaign: "rus",
    world: "archipelagoDay",
    title: "NIMROD",
    jp: "西側のエース『NIMROD』が空域に侵入。同じ空域、同じ時刻、同じ雲——決着をつけろ。",
    act: 4,
    storyNo: 19,
    story: "宿敵との決着だ。同じ空域、同じ時刻、同じ雲。\nこの戦争で一度も届かなかった、ただ一つの機影。",
    epilogue: [
      "NIMROD機との交戦。決着はつかなかった。被弾した機体を雲に入れ、そのまま離脱した。",
      "NORTHSTARは記録にこう残した——「……墜ちてない。どちらも墜ちていない」",
      "西側同盟軍の通信は、その夜だけ一度も彼の名を呼ばなかった。こちらも同じだった。"
    ],
    // Campaign 19, and the core of story bible §5. This is m04 from the other
    // cockpit: SAME MAP (archipelagoDay), same hour, same weather, same shape -
    // one designated ace and six trash-role wingmen arriving on a clock to
    // spoil every gun solution - because §5 puts the two mission records side
    // by side at the end and they have to describe one afternoon.
    //
    // The constraint (spec_rus_campaign §2): NIMROD does not fall, and neither
    // does the player. Both campaigns say "奴は墜ちなかった".
    //
    // How that is made true without a scripted invulnerability the player can
    // feel: the sortie's designated target is NIMROD's WINGMAN ELEMENT, not
    // NIMROD. The player is sent to strip the escort off him - a job they can
    // actually finish - and NIMROD himself rides the wave as `tgt: false`.
    // He is on the board the whole time, he is the hardest thing in it, the
    // player can shoot at him all they like; he is simply not what ends the
    // sortie. So the moment the last escort dies the fight breaks off with him
    // still flying, which is precisely what both epilogues already say happened,
    // and nothing had to lie to the player about damage.
    //
    // He flies the Raptor: the airframe m04's briefing implies the AEF player
    // was flying, and the only western jet that reads as a match for the Felon.
    // `idBase: 3` mirrors m04's, so NIMROD prints on the same HUD slot number
    // IRONBACK does in the American campaign - a detail nobody will notice and
    // the one place it would have been wrong to get lazy.
    //
    // 1 designated : 6 undesignated. m04's exact ratio, and for m04's exact
    // reason: the interference has to be interference, never a second fight.
    sequence: [
      // NIMROD and the two aircraft the player is actually sent to kill.
      { types: ["f22"], ace: "hangman", tgt: false, band: 2, idBase: 3, label: "NIMROD" },
      {
        types: ["f15", "f15"], band: 2, idBase: 0, label: "NIMROD ELEMENT",
        skill: "expert", concurrent: true,
        radio: [
          { speaker: "command", text: "NORTHSTARより。NIMRODに僚機が2——F-15。指定目標はその2機だ。本人ではない。", id: "r19-element" }
        ]
      },
      {
        types: ["f16", "f16"], tgt: false, band: 1, label: "INTERFERENCE",
        concurrent: true, role: "trash", delay: 45,
        radio: [
          { speaker: "wingman", text: "邪魔が入った！ 2機——気にしないで、IRONBACK。あなたと奴の間には入らせません。", id: "r19-interference-1" }
        ]
      },
      {
        types: ["gripen", "f16"], tgt: false, band: 2, label: "INTERFERENCE",
        concurrent: true, role: "trash", delay: 105,
        radio: [
          { speaker: "wingman", text: "また湧いてきた！ ……決着をつけてください。僚機さえ剥がせば、あとは一対一だ！", id: "r19-interference-2" }
        ]
      }
    ],
    // m04's 165 exactly. Same map, same clock, same two kills' worth of work -
    // the two campaigns' nineteenth sortie has to be the same length of
    // afternoon, because §5 prints them next to each other.
    parTime: 165,
    hasOutro: false,
    map: { x: 0.42, y: 0.65 },
    battleCenter: { x: 0, z: -1000 },
    battleRadius: 9000,
    briefing: "西側同盟軍のエース。我々の側では『NIMROD』——絞首人と呼ばれている機体だ。\n名を付けたのはこちらだ。向こうは自分がそう呼ばれていることを知らないだろう。\n奴は今まで我が方の12機を墜としている。次を君にするな。\n指定目標はNIMROD機の僚機2機だ。本人ではない。\n本人は落とせない——落とせるだけの弾も、燃料も、今日の我々には無い。\n僚機を剥がして、こちらの損害を止める。それが今日の勝ちだ。撃てる時は撃て。だが深追いはするな。",
    introRadio: [
      { speaker: "command", text: "NORTHSTARより全機。……来たわ。NIMROD、同じ空域、同じ時刻。あなたが一度も届かなかった機影よ。", id: "r19-brief" },
      { speaker: "wingman", text: "とうとうですね。……IRONBACK、聞こえてます？ 生きて帰ってください。それだけです。", id: "r19-brief-wing" }
    ]
  }, { after: "r18" });

  // ---- r20 ------------------------------------------------------------------
  ctx.addMission({
    key: "r20",
    campaign: "rus",
    world: "archipelagoDay",
    title: "LAST TO LEAVE",
    jp: "全戦線で撤退が始まった。殿として、追撃してくる西側航空戦力を食い止めろ。",
    act: 4,
    storyNo: 20,
    story: "全戦線で撤退が始まった。塔は、まだ立っている。\n殿は君だ。最後に空を出る。",
    epilogue: [
      "追撃部隊を撃退。撤退部隊は空域を離脱した。塔は倒せなかった。部隊は半減した。",
      "帰投針路の眼下に、セント・ヴェルダの市街が見えた。爆撃を三度受けた街に、まだ灯りが点いていた。一区画ずつ、確かに点いていた。",
      "ミハイル老整備長は、帰ってきた機体の数を数えてから一言だけ言った——「塔は倒れる。人は残る」"
    ],
    // Campaign 20, the underside of m05. That sortie was the AEF player's total
    // engagement, the one that ends with the NFF withdrawing; this is the
    // withdrawal, flown by the man covering it.
    //
    // The shape is inverted on purpose. m05 escalates - vanguard, then the ace,
    // then a fleet, then the hardest pair in the game - because it is an
    // offensive that has to end in a crescendo. A rearguard cannot escalate:
    // what it does is get thinner. So this runs the other way. The first waves
    // are the heaviest (the pursuit's leading edge, hunting a column that has
    // not cleared the area yet), and the last designated element is a single
    // pair of Raptors - the ones that stayed with it longest.
    //
    // NIMROD is not here. He was not killable in r19 and putting him on the
    // board again as a kill would undo it; the American campaign has him flying
    // at the end of m05 too. What closes the campaign instead is his squadron
    // without him, which is also what the withdrawal actually looked like.
    //
    // Eight designated against fifteen undesignated is 1:1.88, inside the band,
    // and 23 contacts is the biggest sortie in the payload - "総力戦" from the
    // side that is losing it.
    sequence: [
      // The leading edge of the pursuit. Two designated leaders, a flight of
      // trash behind them - and they are the heaviest designated element in the
      // sortie, which is the inversion.
      {
        types: ["f22", "f15"], band: 1, idBase: 0, label: "PURSUIT LEAD",
        skill: "expert",
        radio: [
          { speaker: "command", text: "NORTHSTARより。追撃部隊、接触——先頭にF-22。撤退部隊に追いつかせるな。", id: "r20-lead" }
        ]
      },
      {
        types: ["f16", "f16", "f16"], tgt: false, band: 1, label: "PURSUIT",
        concurrent: true, role: "trash", idBase: 10,
        radio: [
          { speaker: "wingman", text: "後ろから群れで来る！ ……こっちは10機で出て、今は6機です。数えないでください。", id: "r20-pursuit-1" }
        ]
      },
      // Second element: the multiroles, coming in low along the column's track.
      {
        types: ["typhoon", "rafale"], band: 2, idBase: 2, label: "PURSUIT",
        skill: "expert",
        radio: [
          { speaker: "command", text: "第2波、タイフーンとラファール。撤退針路に沿って低く入ってきている。", id: "r20-second" }
        ]
      },
      {
        types: ["f16", "gripen", "f2a"], tgt: false, band: 2, label: "PURSUIT",
        concurrent: true, role: "trash", idBase: 13
      },
      {
        types: ["f16", "f16"], tgt: false, band: 1, label: "SECOND FLIGHT",
        concurrent: true, role: "trash", delay: 55, idBase: 16,
        radio: [
          { speaker: "wingman", text: "SICKLE 4被弾——離脱します！ ……すみません、また減りました。", id: "r20-loss" }
        ]
      },
      // Third element: Hornets and a Lightning off the carrier the player could
      // not sink in r16. The mission remembers.
      {
        types: ["fa18", "f35c"], band: 1, idBase: 4, label: "CVW PURSUIT",
        skill: "expert",
        radio: [
          { speaker: "command", text: "第3波は艦載機——F/A-18とF-35C。INDEPENDENCEからよ。……あの船、まだ浮いている。", id: "r20-cvw" }
        ]
      },
      {
        types: ["f16", "f2a", "gripen"], tgt: false, band: 2, label: "CVW ESCORT",
        concurrent: true, role: "trash", idBase: 18
      },
      // The last designated element, and the last thing the campaign puts in
      // front of the player: a pair of Raptors, the AEF's best, at expert -
      // the ones that stayed with the retreat longest. Two hulls, not four, and
      // no ace, because a rearguard does not end in a duel. It ends when the
      // last aircraft that was chasing you turns for home.
      {
        types: ["f22", "f22"], band: 2, idBase: 6, label: "LAST PURSUIT",
        skill: "expert",
        radio: [
          { speaker: "command", text: "最後の追撃——F-22が2。これを凌げば全部隊が空域を出る。IRONBACK、あと少しよ。", id: "r20-last" }
        ]
      },
      {
        types: ["f16", "f16", "gripen"], tgt: false, band: 2, label: "LAST PURSUIT",
        concurrent: true, role: "trash", idBase: 20
      },
      {
        types: ["f16", "f16"], tgt: false, band: 1, label: "STRAGGLERS",
        concurrent: true, role: "trash", delay: 45, idBase: 23,
        radio: [
          { speaker: "wingman", text: "まだいる……！ 撤退部隊、空域離脱まであと少しです。保たせてください、IRONBACK！", id: "r20-stragglers" }
        ]
      }
    ],
    // Eight expert hulls - two Raptor pairs among them - through fifteen the
    // player owes nothing. Under m05's 620 because there is no fleet to sink
    // and no ace duel in the middle: this is one long air battle, not four
    // sorties stapled together.
    parTime: 520,
    // `hasOutro: false`, unlike m05 which this mirrors. The outro sequence is
    // written into startOutro() as fixed lines - "アイアンバックがやられた。全機
    // 作戦中止" and "敵編隊、反転していく。奴らは君から逃げている" - i.e. the AEF
    // watching the NFF break. Playing it here would have the player's own side
    // announce its ace dead and then congratulate the player on routing an enemy
    // that is in fact chasing them home. The withdrawal ends the way a
    // withdrawal ends: the last target turns for home and the debrief comes up.
    hasOutro: false,
    map: { x: 0.8, y: 0.34 },
    battleCenter: { x: 0, z: -1400 },
    battleRadius: 10500,
    briefing: "全戦線で撤退命令が出た。グレフ大佐の署名だ。\n君の任務は殿だ。撤退する部隊の後ろに残り、追撃してくる敵航空戦力を食い止める。\n指定目標は8機。追撃部隊の先導機、第2波、艦載機、そして最後に上がってくるF-22が2機。\n残り15機は目標ではない。だが今日は数が効く——こちらの機数はもう補充されない。\n塔は倒せなかった。それは君のせいではない。ここで一機でも多く帰す、それが今日の任務だ。\n最後に空を出るのは君だ。撤退部隊が空域を抜けるまで、そこにいろ。",
    introRadio: [
      { speaker: "command", text: "NORTHSTARより全機。撤退が始まったわ。SICKLE 1、あなたが殿。……最後に出てきて。", id: "r20-brief" },
      { speaker: "wingman", text: "塔は倒せませんでしたね。……いいんです。俺は、あなたが帰るところまで見ます。行きましょう。", id: "r20-brief-wing" }
    ]
  }, { after: "r19" });
}
