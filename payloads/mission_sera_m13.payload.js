// Sera M13 LIFELINE — four-aircraft aggregate escort and AWACS trade-off.
export default function register(ctx) {
  const {
    MISSIONS, WORLD_PRESETS, AIRCRAFT_TYPES, ENEMY_AI_PROFILES, SHIP_TYPES
  } = ctx.tables;
  const world = WORLD_PRESETS.hadorIslands;
  if (!world) throw new Error("[sera-m13] hadorIslands is not registered; load map_hadorIslands first");
  if (!MISSIONS.some((mission) => mission.key === "sera-m12" && mission.campaign === "sera")) {
    throw new Error("[sera-m13] sera-m12 predecessor is missing");
  }
  for (const type of ["c17", "tanker", "fa18", "mig29", "mig31", "a100"]) {
    if (!AIRCRAFT_TYPES[type]) throw new Error(`[sera-m13] required aircraft not registered: ${type}`);
  }
  for (const type of ["mig29", "mig31", "a100"]) {
    if (!ENEMY_AI_PROFILES[type]) throw new Error(`[sera-m13] required enemy profile not registered: ${type}`);
  }
  if (!SHIP_TYPES.missileBoat) throw new Error("[sera-m13] missileBoat ship type is missing");
  const anchors = world.missionAnchors;
  const m13EscortContract = Object.freeze({
    callsign: "LIFELINE",
    total: 4,
    requiredSaved: 1,
    awacs: Object.freeze({ missionTag: "m13Awacs", reinforcementDelay: 45 }),
    reinforcementTag: "m13Reinforcement",
    outcomes: Object.freeze({
      saved: "lifelineAircraftSaved",
      lost: "lifelineAircraftLost",
      allSafe: "allLifelineAircraftSafe",
      awacsDestroyed: "enemyAwacsDestroyed",
      reinforcementsDelayed: "reinforcementsDelayed"
    })
  });

  const mission = {
    key: "sera-m13",
    campaign: "sera",
    campaignOrder: 13,
    world: "hadorIslands",
    title: "LIFELINE",
    jp: "ハドール北航路を通過する輸送機三機と給油機一機を護衛せよ。",
    act: 3,
    storyNo: 13,
    story: "WAR DAY 20。弾薬、医薬品、航空燃料を積んだ四機がハドール北航路へ入る。\n敵AWACSを落とせば後続迎撃は遅れる。だが、そのレーダー機は輸送隊の進路から遠く離れている。",
    epilogue: [
      "LIFELINEはハドール北航路を抜け、前線へ積荷を渡した。",
      "守れた機体の数だけ、翌朝に飛べる戦闘機と開ける手術室が増える。",
      "MERIDIANは敵AWACSの撃破より先に、帰還した輸送機の機番号を読み上げた。"
    ],
    friendlies: {
      playerStart: {
        x: anchors.playerStart[0], y: 1450, z: anchors.playerStart[1],
        facing: { x: anchors.battleCenter[0], z: anchors.battleCenter[1] }
      },
      wingmen: [
        { type: "fa18", label: "ROOK 2 LARK", radioSpeaker: "lark", spw: "aam4", offset: { back: 110, side: 135, up: -14 } }
      ],
      transportGroups: [
        {
          aircraft: "c17", callsign: "LIFELINE", count: 3, vulnerable: true,
          hp: 520, speed: 104, altitude: 980, spacing: 230,
          start: { x: anchors.convoyStart[0], z: anchors.convoyStart[1] },
          exit: { x: anchors.convoyExit[0], z: anchors.convoyExit[1] }
        },
        {
          aircraft: "tanker", callsign: "LIFELINE TANKER", count: 1, vulnerable: true,
          hp: 620, speed: 104, altitude: 1060,
          start: { x: anchors.convoyStart[0] + 360, z: anchors.convoyStart[1] + 280 },
          exit: { x: anchors.convoyExit[0] + 360, z: anchors.convoyExit[1] + 280 }
        }
      ],
      guard: {
        readout: "integrity",
        label: "LIFELINE",
        lossPenalty: 1500,
        hitPenalty: 90,
        lossBanner: "LIFELINE AIRCRAFT LOST",
        failBanner: "LIFELINE DESTROYED",
        lossRadio: "LIFELINE被撃墜。残存機を守れ、RAVEN！",
        failRadio: "輸送隊全機喪失。LIFELINE作戦失敗、ROOKは離脱せよ。",
        safeRadio: "LIFELINE全機、南航路へ離脱。積荷は前線へ届く。"
      }
    },
    sequence: [
      {
        types: ["mig29", "mig29"], band: 1, idBase: 1320, label: "FULCRUM HUNTER 1",
        role: "line", skill: "regular", hunt: "air", missionTag: "m13Interceptor",
        at: [...anchors.eastIntercept], altitude: 1900, facing: [...anchors.convoyStart],
        radio: [{ speaker: "meridian", priority: "CRITICAL", text: "MiG-29A二、LIFELINEへ直進。赤TGT指定、輸送隊へ到達する前に落とせ。", id: "m13-first-hunters" }]
      },
      {
        types: ["a100"], tgt: false, rankNeutral: true, concurrent: true,
        missionTag: "m13Awacs", delay: 0, band: 3, idBase: 1330, label: "MAINSTAY",
        role: "trash", skill: "regular", at: [...anchors.awacsStation], altitude: 7200,
        facing: [11800, -2600],
        radio: [{ speaker: "meridian", priority: "URGENT", text: "東九千、敵A-100。白の任意目標だ。撃墜すれば増援管制を遅らせられるが、輸送隊から離れる。", id: "m13-awacs-choice" }]
      },
      {
        types: ["mig29", "mig29"], tgt: true, concurrent: true, missionTag: "m13Reinforcement",
        delay: 48, band: 2, idBase: 1340, label: "FULCRUM HUNTER 2", role: "line",
        skill: "regular", hunt: "air", at: [...anchors.westIntercept], altitude: 2100,
        facing: [0, -1000]
      },
      {
        kind: "naval", fleet: ["missileBoat", "missileBoat"], tgt: true, concurrent: true,
        missionTag: "m13ChannelBoats", delay: 74, idBase: 1350, label: "CHANNEL MISSILE BOATS",
        at: [...anchors.eastMissileBoats], facing: [...anchors.westMissileBoats], spacing: 420,
        radio: [{ speaker: "lark", priority: "URGENT", text: "航路上にミサイル艇二！ 輸送隊が横切る前に沈める！", id: "m13-boats" }]
      },
      {
        types: ["mig29", "mig29"], tgt: true, concurrent: true, missionTag: "m13Reinforcement",
        delay: 96, band: 2, idBase: 1360, label: "FULCRUM HUNTER 3", role: "line",
        skill: "veteran", hunt: "air", at: [...anchors.northIntercept], altitude: 2400,
        facing: [0, -3200]
      },
      {
        types: ["mig31", "mig31"], tgt: true, concurrent: true, missionTag: "m13Reinforcement",
        delay: 132, band: 3, idBase: 1370, label: "FOXHOUND LONG SHOT", role: "line",
        skill: "veteran", hunt: "air", at: [...anchors.southIntercept], altitude: 8600,
        facing: [0, -5400],
        radio: [{ speaker: "meridian", priority: "CRITICAL", text: "高高度MiG-31二、長距離攻撃態勢。輸送隊を射程へ入れるな。", id: "m13-foxhound" }]
      },
      {
        types: ["mig29", "mig29"], tgt: true, concurrent: true, missionTag: "m13Reinforcement",
        delay: 168, band: 3, idBase: 1380, label: "FULCRUM HUNTER 4", role: "line",
        skill: "veteran", hunt: "air", at: [7600, -11000], altitude: 2300,
        facing: [...anchors.convoyExit]
      }
    ],
    m13EscortContract,
    fixedRadio: [
      { id: "m13_intro_01", at: 2, speaker: "meridian", priority: "NORMAL", text: "LIFELINE四機、ハドール北航路へ進入。編隊の損傷情報をデータリンクする。" },
      { id: "m13_intro_02", at: 8, speaker: "lark", priority: "NORMAL", text: "一番遅い輸送機から離れすぎないで。四機まとめて通すよ。" },
      { id: "m13_awacs_down", event: "m13AwacsDown", speaker: "meridian", priority: "CRITICAL", text: "敵AWACS撃墜。増援管制に混乱を確認、後続の到着が遅れる。" },
      { id: "m13_one_lost", event: "m13OneLost", speaker: "lark", priority: "URGENT", text: "LIFELINE一機喪失……まだ積荷は残ってる。残りを絶対に通す！" }
    ],
    successRadio: { speaker: "meridian", priority: "CRITICAL", text: "敵迎撃戦力を排除。LIFELINEは南航路へ離脱、護衛成功。", id: "m13-success" },
    failureRadio: { speaker: "meridian", priority: "CRITICAL", text: "LIFELINE全機喪失。補給作戦を中止、ROOKは帰投せよ。", id: "m13-failure" },
    parTime: 390,
    hasOutro: false,
    map: { x: 0.7, y: 0.22 },
    battleCenter: { x: anchors.battleCenter[0], z: anchors.battleCenter[1] },
    battleRadius: 15100,
    briefing: "医薬品・弾薬・航空燃料を積んだC-17三機とKC-46一機、コールサインLIFELINEをハドール北航路で護衛せよ。四機の合算HPを右上に表示する。一機を失っても任務は継続するがSランクは失い、全機喪失で失敗となる。\n赤TGTはMiG-29A八、MiG-31二、航路上のミサイル艇二。航空TGTはRAVENよりLIFELINEを優先して狙う。MiG-31は高高度から長距離攻撃を行う。\n東方遠距離のA-100は白い任意目標。撃墜すれば未到着の増援四波を45秒遅らせられるが、追撃中は低速の輸送隊から離れる。近接護衛を続けるか、増援管制を断つかを選べ。"
  };

  ctx.addMission(mission, { after: "sera-m12" });
}
