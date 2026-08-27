// Sera M06 — WHITE PASS
//
// The first Act II sortie uses the completed White Pass valley as a real low-
// altitude SEAD corridor.  It also resolves the opening ROOK formation: CROWN
// survives a forced ejection, RAVEN inherits ROOK 1, and LARK inherits ROOK 2.
// REEM 1 / POLKA is a passing, non-TGT ace.  The player may climb out after
// POLKA or stay in the valley and clear the SAM belt, but POLKA cannot be shot
// down in this encounter.

export default function register(ctx) {
  const {
    ACE_PROFILES,
    AIRCRAFT_TYPES,
    ENEMY_AI_PROFILES,
    GROUND_TYPES,
    MISSIONS,
    WORLD_PRESETS
  } = ctx.tables;

  if (!WORLD_PRESETS.whitePass) {
    throw new Error("[sera-m06] whitePass is not registered; load map_whitePass first");
  }
  if (!MISSIONS.some((mission) => mission.key === "sera-m05" && mission.campaign === "sera")) {
    throw new Error("[sera-m06] sera-m05 predecessor is missing");
  }
  for (const type of ["f15c", "f16", "ea18g", "f4", "mig23", "mig29", "mig31", "su35"]) {
    if (!AIRCRAFT_TYPES[type]) throw new Error(`[sera-m06] required aircraft not registered: ${type}`);
  }
  for (const type of ["mig23", "mig29", "mig31", "su35"]) {
    if (!ENEMY_AI_PROFILES[type]) throw new Error(`[sera-m06] required enemy profile not registered: ${type}`);
  }
  for (const type of ["longRangeSam", "earlyWarningRadar", "spaag"]) {
    if (!GROUND_TYPES[type]) throw new Error(`[sera-m06] required ground type not registered: ${type}`);
  }

  const aceBase = ACE_PROFILES.ironback;
  if (!aceBase) throw new Error("[sera-m06] an ace profile template is missing");
  ctx.addAceProfile("polka", {
    ...aceBase,
    callsign: "POLKA",
    role: "REEM 1",
    behavior: "evasive",
    evadeLateral: 84,
    evadeVertical: 38,
    evadeFrequency: 2.1,
    radarColor: "#d9e5ef",
    tracerColor: 0xd9e5ef,
    theme: {
      ...aceBase.theme,
      primary: 0x303944,
      secondary: 0x161d26,
      accent: 0xe4edf4,
      canopy: 0xbfe8ff,
      exhaust: 0x9fd5ff,
      scale: 1.12
    },
    radio: {
      inbound: "高高度に単機。識別REEM 1、TACネームPOLKA。こちらへ進路を取る。",
      wingman: "あれが海峡を抜いた側の一番機……谷からこっちを見てる。",
      engage: "こちらREEM 1。進路を開けろ。ここで決着をつける気はない。",
      down: "こちらREEM 1。交戦を離脱する。"
    }
  });

  const m06WhitePassContract = Object.freeze({
    id: "m06-white-pass",
    radarMark: "m06Radar",
    samMark: "m06Sam",
    reemTag: "m06-reem",
    returnTag: "m06-return",
    chaseDistance: 1250,
    reemRetireAfter: 58,
    reemPressureHits: 2,
    crownHitDelay: 18,
    crownEjectDelay: 3.2,
    successionDelay: 7.2,
    marks: Object.freeze({
      chasedReem: "m06ChasedReem",
      protectedStrike: "m06ProtectedStrike",
      crownSurvived: "m06CrownSurvived",
      crownWounded: "m06CrownWounded",
      rookSuccession: "m06RookSuccession"
    })
  });

  const mission = {
    key: "sera-m06",
    campaign: "sera",
    campaignOrder: 6,
    world: "whitePass",
    title: "WHITE PASS",
    jp: "ホワイトパス西峡谷。谷底の防空網を破壊して反攻路を開き、帰路の迎撃隊を排除する。",
    act: 2,
    storyNo: 6,
    story: "白い峡谷には二つの空がある。谷底の防空網と、その上で待つ一機。\nCROWNは上を見ず、まだ生きているSAM表示を指した。",
    epilogue: [
      "ホワイトパス西峡谷の防空網は沈黙し、ケデム反攻路が開通した。",
      "CROWNは峡谷北端で被弾し脱出。救難信号は継続しており、生存が確認された。",
      "第22飛行隊は再編される。ROOK 2 RAVENはROOK 1を、ROOK 3 LARKはROOK 2を継承する。"
    ],

    friendlies: {
      playerStart: {
        x: 0,
        y: 250,
        z: -4350,
        facing: { x: 0, z: 500 }
      },
      wingmen: [
        {
          type: "f15c",
          label: "ROOK 1 CROWN",
          radioSpeaker: "crown",
          offset: { back: 95, side: -120, up: 16 }
        },
        {
          type: "f16",
          label: "ROOK 3 LARK",
          radioSpeaker: "lark",
          offset: { back: 115, side: 125, up: -10 }
        }
      ],
      supportFlights: [
        {
          aircraft: "ea18g",
          callsign: "VEIL",
          count: 1,
          vulnerable: false,
          start: { x: -420, z: -3900 },
          exit: { x: -420, z: 3150 },
          altitude: 1180,
          speed: 108
        },
        {
          aircraft: "f4",
          callsign: "MALLET",
          count: 2,
          vulnerable: false,
          start: { x: 230, z: -4100 },
          exit: { x: 230, z: 2850 },
          altitude: 360,
          speed: 122,
          spacing: 180
        }
      ]
    },

    groundUnits: [
      { id: 1, type: "earlyWarningRadar", label: "EWR SOUTH", x: -360, z: -1900, mark: "m06Radar" },
      { id: 2, type: "earlyWarningRadar", label: "EWR NORTH", x: 410, z: 850, mark: "m06Radar" },
      { id: 10, type: "longRangeSam", label: "LONG RANGE SAM", x: -500, z: -850, mark: "m06Sam" },
      { id: 11, type: "longRangeSam", label: "LONG RANGE SAM", x: 470, z: -50, mark: "m06Sam" },
      { id: 12, type: "longRangeSam", label: "LONG RANGE SAM", x: -430, z: 1320, mark: "m06Sam" },
      { id: 20, type: "spaag", x: -260, z: -2450, tgt: false, rankNeutral: true },
      { id: 21, type: "spaag", x: 320, z: -1500, tgt: false, rankNeutral: true },
      { id: 22, type: "spaag", x: -300, z: 350, tgt: false, rankNeutral: true },
      { id: 23, type: "spaag", x: 260, z: 1600, tgt: false, rankNeutral: true }
    ],

    sequence: [
      {
        types: [],
        band: 1,
        label: "BREAK THE EYES",
        gate: { mode: "groundMarkClear", mark: "m06Radar" },
        radio: [
          {
            speaker: "meridian",
            priority: "CRITICAL",
            text: "谷底のEWR二基をTGT指定。VEIL支援中に破壊し、低空を維持せよ。",
            id: "m06-phase1"
          }
        ]
      },
      {
        types: ["mig23", "mig23"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        delay: 18,
        band: 1,
        idBase: 60,
        label: "VALLEY CAP",
        role: "line",
        skill: "regular",
        purpose: "cap",
        commitRange: 2300,
        leashRange: 3500,
        at: [0, 2550],
        altitude: 1450,
        facing: [0, -900]
      },
      {
        types: [],
        band: 2,
        label: "OPEN THE PASS",
        gate: { mode: "groundMarkClear", mark: "m06Sam" },
        radio: [
          {
            speaker: "meridian",
            priority: "CRITICAL",
            text: "EWR沈黙。長射程SAM三基をTGT指定。MALLETの進攻路を開け。",
            id: "m06-phase2"
          }
        ]
      },
      {
        types: ["su35"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        delay: 0,
        band: 2,
        idBase: 80,
        label: "REEM 1",
        ace: "polka",
        purpose: "interceptor",
        purposeAltitudeFloor: 2200,
        missionTag: "m06-reem",
        at: [0, 3600],
        altitude: 2650,
        facing: [0, -250]
      },
      {
        types: ["mig31", "mig31"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        delay: 16,
        band: 2,
        idBase: 90,
        label: "WARDEN HIGH COVER",
        role: "elite",
        skill: "veteran",
        purpose: "top-cover",
        purposeAltitudeFloor: 2800,
        commitRange: 4000,
        leashRange: 5400,
        missionTag: "m06-high-cover",
        at: [900, 4300],
        altitude: 3400,
        facing: [0, 0],
        radio: [
          {
            speaker: "meridian",
            priority: "URGENT",
            text: "さらに高高度二、MiG-31。WARDENの援護だ。谷底なら長射程弾の射線を切れる。",
            id: "m06-warden-cover"
          }
        ]
      },
      {
        types: ["mig29", "mig29"],
        band: 3,
        idBase: 100,
        label: "RETURN INTERCEPT",
        role: "line",
        skill: "regular",
        purpose: "intercept",
        missionTag: "m06-return",
        at: [0, 3300],
        altitude: 1850,
        facing: [0, 300],
        radio: [
          {
            speaker: "meridian",
            priority: "CRITICAL",
            text: "MISSION UPDATE。北口からMiG-29二、帰路を遮断。ROOK、迎撃せよ。",
            id: "m06-return-intercept"
          }
        ]
      },
      {
        types: ["mig23", "mig23"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        delay: 12,
        band: 3,
        idBase: 110,
        label: "REAR GUARD",
        role: "trash",
        skill: "rookie",
        purpose: "screen",
        commitRange: 2500,
        leashRange: 3800,
        at: [-900, 2850],
        altitude: 1250,
        facing: [0, 0]
      }
    ],

    m06WhitePassContract,
    fixedRadio: [
      { id: "m06-intro-meridian", at: 3, speaker: "meridian", priority: "NORMAL", text: "ROOK、ホワイトパス南口。谷底を北上し、ケデム反攻路を開け。" },
      { id: "m06-intro-crown", at: 8, speaker: "crown", priority: "NORMAL", text: "岩壁を追うな。SAM表示だけ見て、谷底を走れ。" },
      { id: "m06-radars-clear", event: "m06RadarsClear", speaker: "lark", priority: "NORMAL", text: "二基とも止まった。MALLETが谷へ入るよ。" },
      { id: "m06-reem-inbound", event: "m06ReemInbound", speaker: "meridian", priority: "URGENT", text: "高高度に単機、REEM 1 POLKA。交戦不要、SAM網を優先せよ。" },
      { id: "m06-chase", event: "m06ChaseCommitted", speaker: "crown", priority: "URGENT", text: "RAVEN、上へ行くなら戻る燃料を残せ。谷の仕事は消えない。" },
      { id: "m06-sead", event: "m06SeadCommitted", speaker: "crown", priority: "NORMAL", text: "そのまま谷を開けろ。俺を守るな、後ろの攻撃隊を守れ。" },
      { id: "m06-reem-retreat", event: "m06ReemRetreat", speaker: "meridian", priority: "NORMAL", text: "REEM 1、北へ離脱。追撃不要。残存TGTへ戻れ。" },
      { id: "m06-crown-hit", event: "m06CrownHit", speaker: "crown", priority: "CRITICAL", text: "被弾した。右系統喪失……RAVEN、編隊を引き継げ。" },
      { id: "m06-crown-eject", event: "m06CrownEject", speaker: "lark", priority: "CRITICAL", text: "CROWN、射出！ ビーコン確認、生きてる。RAVEN、今は残りを止めよう。" },
      { id: "m06-succession", event: "m06Succession", speaker: "meridian", priority: "CRITICAL", text: "ROOK指揮をRAVENへ移管。ROOK 1 RAVEN、ROOK 2 LARK。帰路を確保せよ。" }
    ],
    successRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "帰路迎撃隊を排除。CROWNの救難信号は継続中。ROOK 1 RAVEN、全機帰投せよ。",
      id: "m06-success"
    },
    failureRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "ホワイトパス進攻路を確保できない。ROOK、作戦中止。南口へ離脱せよ。",
      id: "m06-failure"
    },
    parTime: 720,
    hasOutro: false,
    map: { x: 0.48, y: 0.38 },
    battleCenter: { x: 0, z: -500 },
    battleRadius: 7200,
    briefing: "ホワイトパス西峡谷へ低空侵入し、赤TGTのEWR二基と長射程SAM三基を破壊してケデム反攻路を開け。白いSPAAGと谷上空の迎撃機はNON-TGTだが、低高度でも脅威になる。\nEWR破壊後、REEM 1 POLKAが高高度を通過する。追えば交戦できるが撃墜はできず、SAM網と味方攻撃隊を残すことになる。\n防空網沈黙後は北口から来る赤MiG-29A二機を迎撃し、ROOK隊の帰路を確保せよ。"
  };

  ctx.addMission(mission, { after: "sera-m05" });
}
