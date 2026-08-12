// Sera M05 PORT OF ASH — canonical mission-data staging payload.
//
// Enemy waves are registry-valid now. `m05GroundBattleContract` holds the
// friendly advance, phase gates, escape route and M03/M04 carry-over that need
// dedicated host support after M03 campaign isolation is merged.
export default function register(ctx) {
  const {
    MISSIONS, WORLD_PRESETS, AIRCRAFT_TYPES, ENEMY_AI_PROFILES,
    HELI_TYPES, GROUND_TYPES
  } = ctx.tables;

  if (!WORLD_PRESETS.sarkPortAsh) {
    throw new Error("[sera-m05] sarkPortAsh is not registered; load map_sarkPortAsh first");
  }
  if (!MISSIONS.some((mission) => mission.key === "sera-m04" && mission.campaign === "sera")) {
    throw new Error("[sera-m05] sera-m04 predecessor is missing");
  }
  for (const type of ["f4", "f16", "mig29"]) {
    if (!AIRCRAFT_TYPES[type]) throw new Error(`[sera-m05] required aircraft not registered: ${type}`);
  }
  if (!ENEMY_AI_PROFILES.mig29) throw new Error("[sera-m05] MiG-29 enemy profile is missing");
  if (!HELI_TYPES.ka52) throw new Error("[sera-m05] Ka-52 helicopter type is missing");
  for (const type of ["autonomousSam", "spaag", "tank", "ifv", "aaGun", "mobileCommand"]) {
    if (!GROUND_TYPES[type]) throw new Error(`[sera-m05] required ground type not registered: ${type}`);
  }

  const origin = Object.freeze([0, -3000]);
  const m05GroundBattleContract = Object.freeze({
    origin,
    timeLimit: 1440,
    groundClearance: 0.7,
    friendlyGround: Object.freeze({
      tanks: 4,
      ifvs: 2,
      failWhenTanksLost: 4,
      holdUntilPhase1Clear: true,
      route: Object.freeze([
        Object.freeze([900, 900]),
        Object.freeze([620, 620]),
        Object.freeze([250, 300]),
        Object.freeze([-120, 80]),
        Object.freeze([-80, -700]),
        Object.freeze([-80, -1280]),
        Object.freeze([-700, -1050]),
        Object.freeze([-1350, -250])
      ]),
      travelBetweenPhases: Object.freeze([30, 45])
    }),
    phase1: Object.freeze({
      label: "OPEN AIR CORRIDOR",
      targets: Object.freeze([
        Object.freeze({ type: "autonomousSam", label: "MOBILE SAM", at: Object.freeze([-700, 600]) }),
        Object.freeze({ type: "autonomousSam", label: "MOBILE SAM", at: Object.freeze([-1350, -250]) }),
        Object.freeze({ type: "spaag", at: Object.freeze([-150, 50]) }),
        Object.freeze({ type: "spaag", at: Object.freeze([420, -1060]) }),
        Object.freeze({ type: "spaag", at: Object.freeze([-80, -720]) })
      ]),
      advanceWhenAllDestroyed: true
    }),
    phase2: Object.freeze({
      label: "SUPPORT GROUND ADVANCE",
      baseTanks: 6,
      baseIfvs: 3,
      updateAtRedRemaining: 3,
      fixedWhiteGuns: 3
    }),
    phase3: Object.freeze({
      label: "DESTROY COMMAND VEHICLE",
      commandType: "mobileCommand",
      commandStart: Object.freeze([300, -900]),
      escapeLineX: 2100,
      minimumEscapeTime: 150,
      commandRoute: Object.freeze([
        Object.freeze([300, -900]),
        Object.freeze([480, -1080]),
        Object.freeze([650, -1200]),
        Object.freeze([980, -1280]),
        Object.freeze([1450, -1280]),
        Object.freeze([2100, -1280])
      ]),
      redHelicopters: Object.freeze(["ka52", "ka52"]),
      whiteFighters: Object.freeze(["mig29", "mig29", "mig29", "mig29"])
    }),
    carryover: Object.freeze({
      m03: Object.freeze({
        missionKey: "sera-m03",
        landingMark: "m03TransportLanding",
        zeroLandingsIfvDelta: -1,
        multipleLandingsThreshold: 2,
        multipleLandingsIfvDelta: 1,
        multipleLandingsDamageVariant: "southWarehouseHeavy"
      }),
      m04: Object.freeze({
        missionKey: "sera-m04",
        breachMark: "m04LhdBreach",
        oneBreachTankDelta: 1
      })
    }),
    rank: Object.freeze({
      sTime: 930,
      aTime: 1080,
      sFriendlyTanksAlive: 3,
      aFriendlyTanksAlive: 2,
      sCommandBeforeRepairBridge: true,
      ignoreWhiteTargets: true
    })
  });

  const mission = {
    key: "sera-m05",
    campaign: "sera",
    campaignOrder: 5,
    world: "sarkPortAsh",
    title: "PORT OF ASH",
    jp: "占領されたサルク港へケデム地上軍を通し、敵防空・装甲部隊・移動指揮車を排除せよ。",
    act: 1,
    storyNo: 5,
    story: "WAR DAY 034。ROOKは、煙に覆われたサルク港へ戻る。\nケデム地上軍の進路を開き、港を占領する敵部隊の指揮系統を断つ。",
    epilogue: [
      "ケデム地上軍は西クレーン地区へ到達し、港湾道路を封鎖した。",
      "移動指揮車は港外へ出る前に破壊された。",
      "サルク港のクレーンは、煙の向こうでまだ何基か立っていた。"
    ],

    friendlies: {
      playerStart: {
        // Canonical local [-4200,-2000] translated by Sark origin [0,-3000].
        x: -4200,
        y: 650,
        z: -5000,
        facing: { x: 0, z: -3000 }
      },
      wingmen: [
        {
          type: "f4",
          label: "ROOK 1 CROWN",
          radioSpeaker: "crown",
          offset: { back: -145, side: -115, up: 28 }
        },
        {
          type: "f16",
          label: "ROOK 3 LARK",
          radioSpeaker: "lark",
          offset: { back: 110, side: 120, up: -12 }
        }
      ]
    },

    sequence: [
      {
        types: ["autonomousSam", "autonomousSam", "spaag", "spaag", "spaag"],
        band: 1,
        idBase: 0,
        label: "AIR DEFENCE",
        at: [-700, -2400],
        radio: [
          {
            speaker: "meridian",
            priority: "CRITICAL",
            text: "移動SAM二、SPAAG三をTGT指定。全滅後、地上軍を前進させる。",
            id: "m05_p1_01"
          }
        ]
      },
      {
        types: ["tank", "tank"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        band: 1,
        idBase: 10,
        label: "ARMOR PICKET",
        at: [-250, -2950]
      },
      {
        types: ["tank", "tank", "tank", "tank", "tank", "tank", "ifv", "ifv", "ifv"],
        band: 2,
        idBase: 20,
        label: "OCCUPATION ARMOR",
        at: [-150, -2950],
        radio: [
          {
            speaker: "meridian",
            priority: "CRITICAL",
            text: "中央市街と西岸に装甲目標。戦車六、IFV三をTGT指定。",
            id: "m05_p2_01"
          }
        ]
      },
      {
        types: ["aaGun", "aaGun", "aaGun"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        band: 2,
        idBase: 35,
        label: "FIXED GUN",
        at: [-850, -3150]
      },
      {
        types: ["mobileCommand"],
        band: 3,
        idBase: 40,
        label: "MOBILE COMMAND",
        at: [300, -3900],
        radio: [
          {
            speaker: "meridian",
            priority: "CRITICAL",
            text: "移動指揮車と識別。TGT更新。東脱出線までに破壊せよ。",
            id: "m05_update_02"
          }
        ]
      },
      {
        types: ["ka52", "ka52"],
        concurrent: true,
        band: 3,
        idBase: 50,
        label: "ALLIGATOR",
        role: "trash",
        skill: "regular",
        at: [4500, -5500],
        altitude: 320,
        facing: [0, -3000],
        radio: [
          {
            speaker: "meridian",
            priority: "CRITICAL",
            text: "南東から攻撃ヘリ二、戦闘機四。攻撃ヘリをTGT指定。",
            id: "m05_update_04"
          }
        ]
      },
      {
        types: ["mig29", "mig29", "mig29", "mig29"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        band: 3,
        idBase: 60,
        label: "AIR COVER",
        role: "trash",
        skill: "regular",
        at: [4500, -5500],
        altitude: 1450,
        facing: [0, -3000]
      }
    ],

    m05GroundBattleContract,
    fixedRadio: [
      { id: "m05_intro_01", at: 3, speaker: "meridian", priority: "NORMAL", text: "ROOK、サルク港西岸へ進入。ケデム地上軍は北東市街で待機中。" },
      { id: "m05_intro_02", event: "portVisible", speaker: "lark", priority: "NORMAL", text: "クレーンが二基止まってる。中央橋も落ちてるね。" },
      { id: "m05_intro_03", event: "afterPortVisible", speaker: "hearth", priority: "NORMAL", text: "使えるのは北側の橋だけだ。地上隊はそこを通す。" },
      { id: "m05_ground_01", event: "phase1Clear", speaker: "meridian", priority: "NORMAL", text: "防空回廊を確認。ケデム地上軍、前進を開始。" },
      { id: "m05_p2_02", event: "friendlyAtCentral", speaker: "lark", priority: "NORMAL", text: "味方戦車、中央交差点。敵はその西側。" },
      { id: "m05_update_01", event: "commandEscapeStarts", speaker: "lark", priority: "URGENT", text: "南倉庫から車両一、運河沿いを東へ走ってる。" },
      { id: "m05_chase_01", event: "commandAtCanalSouth", speaker: "lark", priority: "URGENT", text: "指揮車、運河南岸。補修橋へ向かってる。" },
      { id: "m05_chase_02", event: "commandRepairBridge1500", speaker: "meridian", priority: "CRITICAL", text: "TGT、補修橋まで一・五キロ。" },
      { id: "m05_end_01", event: "allRedDestroyed", speaker: "meridian", priority: "NORMAL", text: "赤TGT全滅。ケデム地上軍、西クレーン地区へ進入。" },
      { id: "m05_end_03", event: "friendlyAtWestCrane", speaker: "lark", priority: "NORMAL", text: "三番クレーンは残ってた。前と同じ場所に立ってる。" }
    ],
    successRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "赤TGT全滅。ケデム地上軍は西クレーン地区を確保。ROOK、帰投せよ。",
      id: "m05-success"
    },
    failureRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "ケデム戦車隊全滅、または敵指揮車が港外へ離脱。サルク奪還作戦を中止する。",
      id: "m05-failure"
    },
    parTime: 930,
    hasOutro: false,
    map: { x: 0.61, y: 0.27 },
    battleCenter: { x: 0, z: -3000 },
    battleRadius: 10500,
    briefing: "戦災下のサルク港へケデム地上軍を通す。PHASE 1は赤い移動SAM二、SPAAG三を全滅させ、防空回廊を開け。\nPHASE 2では味方地上軍前方の赤戦車六、IFV三を排除する。白い固定砲は全滅不要。\nMISSION UPDATE後は南岸を逃走する移動指揮車と赤Ka-52二機を破壊する。白いMiG-29を追って港から離れるな。"
  };

  ctx.addMission(mission);
}
