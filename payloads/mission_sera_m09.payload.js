// Sera M09 IRON HARVEST — canonical mission-data payload.
//
// The mission deliberately puts red armour and blue civilian vehicles on the
// same road network. `m09Contract` is interpreted by the host for three pieces
// of authored gameplay: MLRS pressure on Kedem armour, command-loss dispersal,
// and civilian-loss scoring/failure. Everything else uses the normal mission,
// ground-unit, IFF and wave contracts.
export default function register(ctx) {
  const {
    MISSIONS, WORLD_PRESETS, AIRCRAFT_TYPES, ENEMY_AI_PROFILES,
    HELI_TYPES, GROUND_TYPES
  } = ctx.tables;

  if (!WORLD_PRESETS.karanPlain) {
    throw new Error("[sera-m09] karanPlain is not registered; load map_karanPlain first");
  }
  if (!MISSIONS.some((mission) => mission.key === "sera-m08" && mission.campaign === "sera")) {
    throw new Error("[sera-m09] sera-m08 predecessor is missing");
  }
  for (const type of ["fa18", "su25", "mig29"]) {
    if (!AIRCRAFT_TYPES[type]) throw new Error(`[sera-m09] required aircraft not registered: ${type}`);
  }
  for (const type of ["su25", "mig29"]) {
    if (!ENEMY_AI_PROFILES[type]) throw new Error(`[sera-m09] required enemy profile not registered: ${type}`);
  }
  if (!HELI_TYPES.ka52) throw new Error("[sera-m09] Ka-52 helicopter type is missing");
  for (const type of ["tank", "spaag", "mlrs", "mobileCommand", "evacBus", "ambulance"]) {
    if (!GROUND_TYPES[type]) throw new Error(`[sera-m09] required ground type not registered: ${type}`);
  }

  const militaryRoad = Object.freeze([
    Object.freeze([-420, -3400]),
    Object.freeze([-420, -1900]),
    Object.freeze([-420, -300]),
    Object.freeze([-420, 900]),
    Object.freeze([-420, 1600]),
    Object.freeze([-420, 3300]),
    Object.freeze([-420, 5900])
  ]);
  const evacuationRoad = Object.freeze([
    Object.freeze([420, -1700]),
    Object.freeze([420, -300]),
    Object.freeze([420, 900]),
    Object.freeze([420, 1600]),
    Object.freeze([420, 3600]),
    Object.freeze([420, 6500])
  ]);
  const friendlyAdvanceRoad = Object.freeze([
    Object.freeze([-2850, -6100]),
    Object.freeze([-2850, -4300]),
    Object.freeze([-2450, -3550]),
    Object.freeze([-1250, -3550]),
    Object.freeze([-760, -3100]),
    Object.freeze([-760, -1500])
  ]);

  const m09Contract = Object.freeze({
    timeLimit: 1320,
    roles: Object.freeze({
      enemyArmor: "enemyArmor",
      mlrs: "mlrs",
      command: "command",
      civilian: "civilian",
      friendlyArmor: "friendlyArmor"
    }),
    mlrs: Object.freeze({
      firstVolleyDelay: 38,
      volleyInterval: 32,
      intervalAfterCommandLoss: 48,
      failWhenFriendlyArmorLost: 4,
      warningAt: 10
    }),
    command: Object.freeze({
      firepowerDelay: 16,
      disperseSpeed: 17,
      civilianLaneX: 420,
      banner: "ENEMY ARMOUR DISPERSING",
      event: "commandDestroyed"
    }),
    civilians: Object.freeze({
      total: 5,
      failAtLosses: 3,
      lossPenalty: 1200,
      firstLossRankCap: "A",
      secondLossRankCap: "B",
      lossMark: "m09CivilianLoss"
    }),
    rank: Object.freeze({
      sTime: 840,
      aTime: 1020,
      sFriendlyArmorAlive: 4,
      aFriendlyArmorAlive: 3,
      sCivilianLosses: 0,
      ignoreWhiteTargets: true
    })
  });

  const enemyTank = (id, pathOffset, disperseZ) => ({
    id,
    type: "tank",
    label: "T-72",
    x: -420,
    z: -3400 + pathOffset,
    heading: Math.PI,
    path: militaryRoad,
    pathOffset,
    speed: 11,
    mark: "m09EnemyArmor",
    missionRole: "enemyArmor",
    dispersePath: [[420, disperseZ], [420, disperseZ + 1400], [420, 6500]]
  });
  const civilian = (id, type, pathOffset) => ({
    id,
    type,
    x: 420,
    z: -1700 + pathOffset,
    heading: Math.PI,
    path: evacuationRoad,
    pathOffset,
    speed: type === "ambulance" ? 17 : 13,
    tgt: false,
    rankNeutral: true,
    friendly: true,
    protected: true,
    lossPenalty: m09Contract.civilians.lossPenalty,
    mark: "m09Civilian",
    missionRole: "civilian"
  });
  const friendlyTank = (id, pathOffset) => ({
    id,
    type: "tank",
    label: `KEDEM ${id - 109}`,
    x: -2850,
    z: -6100 + pathOffset,
    heading: Math.PI,
    path: friendlyAdvanceRoad,
    pathOffset,
    speed: 10,
    tgt: false,
    rankNeutral: true,
    friendly: true,
    protected: true,
    lossPenalty: 900,
    mark: "m09FriendlyArmor",
    missionRole: "friendlyArmor"
  });

  const mission = {
    key: "sera-m09",
    campaign: "sera",
    campaignOrder: 9,
    world: "karanPlain",
    title: "IRON HARVEST",
    jp: "カラン平原を北上するエレム機甲部隊を阻止し、同じ道路を走る避難車列とケデム地上軍を守れ。",
    act: 2,
    storyNo: 9,
    story: "WAR DAY 102。収穫前のカラン南部へ、兵士と家族が同じ道路を北上している。\nROOKは上空から車列を識別し、ケデム地上軍の進撃路を開く。",
    epilogue: [
      "カラン南部の機甲反撃は止まり、ケデム地上軍は河川線へ到達した。",
      "穀倉道路には軍用車両の黒い残骸と、北へ走り続ける避難車列が残った。",
      "LARKは撃破数ではなく、帰れた車両の数だけを報告した。"
    ],
    friendlies: {
      playerStart: {
        x: 0,
        y: 1350,
        z: -7600,
        facing: { x: 0, z: 800 }
      },
      wingmen: [
        {
          type: "fa18",
          label: "ROOK 2 LARK",
          radioSpeaker: "lark",
          spw: "agm4",
          offset: { back: 105, side: 125, up: -10 }
        }
      ]
    },

    groundUnits: [
      enemyTank(1, 0, -700),
      enemyTank(2, 220, -420),
      enemyTank(3, 440, -140),
      enemyTank(4, 660, 220),
      enemyTank(5, 880, 520),
      enemyTank(6, 1100, 1850),
      enemyTank(7, 1320, 2200),
      enemyTank(8, 1540, 2550),

      { id: 10, type: "spaag", x: -980, z: -1850, heading: Math.PI, mark: "m09AirDefense" },
      { id: 11, type: "spaag", x: 1050, z: -250, heading: Math.PI, mark: "m09AirDefense" },
      { id: 12, type: "spaag", x: -1050, z: 2450, heading: Math.PI, mark: "m09AirDefense" },
      { id: 13, type: "spaag", x: 980, z: 4300, heading: Math.PI, mark: "m09AirDefense" },

      { id: 20, type: "mlrs", x: -1850, z: 3500, heading: Math.PI, mark: "m09Mlrs", missionRole: "mlrs" },
      { id: 21, type: "mlrs", x: -2450, z: 4050, heading: Math.PI, mark: "m09Mlrs", missionRole: "mlrs" },
      { id: 22, type: "mlrs", x: -3050, z: 4550, heading: Math.PI, mark: "m09Mlrs", missionRole: "mlrs" },
      {
        id: 30,
        type: "mobileCommand",
        label: "MOBILE COMMAND",
        x: -420,
        z: 4750,
        heading: Math.PI,
        path: militaryRoad,
        pathOffset: 8150,
        speed: 8,
        mark: "m09Command",
        missionRole: "command"
      },

      civilian(100, "evacBus", 0),
      civilian(101, "evacBus", 210),
      civilian(102, "evacBus", 420),
      civilian(103, "evacBus", 630),
      civilian(104, "ambulance", 850),

      friendlyTank(110, 0),
      friendlyTank(111, 180),
      friendlyTank(112, 360),
      friendlyTank(113, 540)
    ],

    sequence: [
      {
        types: ["ka52", "ka52"],
        band: 1,
        idBase: 200,
        label: "ALLIGATOR",
        role: "line",
        skill: "regular",
        purpose: "cas",
        at: [3800, 2500],
        altitude: 360,
        facing: [0, -600],
        radio: [
          {
            speaker: "meridian",
            priority: "CRITICAL",
            text: "攻撃ヘリ二、ケデム戦車隊へ低空進入。赤TGT指定。",
            id: "m09-ka52-contact"
          }
        ]
      },
      {
        types: ["su25", "su25", "su25", "su25"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        band: 2,
        idBase: 210,
        label: "FROGFOOT",
        role: "line",
        skill: "regular",
        purpose: "cas",
        at: [5600, 5200],
        altitude: 900,
        facing: [0, 600]
      },
      {
        types: ["mig29", "mig29"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        delay: 52,
        band: 2,
        idBase: 220,
        label: "FRONTLINE CAP",
        role: "line",
        skill: "regular",
        purpose: "intercept",
        at: [-6200, 5600],
        altitude: 1700,
        facing: [0, 1400],
        radio: [
          {
            speaker: "meridian",
            priority: "URGENT",
            text: "北西からMiG-29A二。正規前線隊だ。だが主目標は地上車列、深追いするな。",
            id: "m09-mig29-cap"
          }
        ]
      }
    ],

    m09Contract,
    fixedRadio: [
      { id: "m09_intro_01", at: 2, speaker: "meridian", priority: "NORMAL", text: "ROOK、カラン南部へ進入。ケデム戦車四、南から前進中。" },
      { id: "m09_intro_02", at: 7, speaker: "lark", priority: "NORMAL", text: "道路が二本。左が装甲、右は避難車列。上からだと速度まで同じに見える。" },
      { id: "m09_intro_03", at: 13, speaker: "meridian", priority: "CRITICAL", text: "敵戦車八、SPAAG四、MLRS三、移動指揮車一。友軍と避難車列への射撃を禁ずる。" },
      { id: "m09_mlrs_warning", event: "mlrsWarning", speaker: "lark", priority: "URGENT", text: "MLRSが味方座標を取ってる。次の斉射まで時間がない！" },
      { id: "m09_mlrs_hit", event: "mlrsVolley", speaker: "lark", priority: "URGENT", text: "ケデム戦車が一両やられた。MLRSを止めないと前線が消える！" },
      { id: "m09_command_down", event: "commandDestroyed", speaker: "meridian", priority: "CRITICAL", text: "敵指揮車沈黙。火力統制は低下——残存戦車が避難道路へ散開している。" },
      { id: "m09_civilian_loss", event: "civilianLoss", speaker: "lark", priority: "CRITICAL", text: "避難車両だ！ 射撃を止めて！" },
      { id: "m09_mlrs_clear", event: "mlrsClear", speaker: "meridian", priority: "NORMAL", text: "敵MLRS全滅。ケデム地上軍への長距離砲撃、停止。" },
      { id: "m09_end_01", event: "allRedDestroyed", speaker: "lark", priority: "NORMAL", text: "ケデム戦車隊の残存を確認。避難車列も北へ抜けてる。" }
    ],
    successRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "赤TGT全滅。カラン南部の機甲反撃を阻止した。ROOK、避難車列上空を離脱せよ。",
      id: "m09-success"
    },
    failureRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "ケデム戦車隊全滅、または避難車両に重大損害。近接航空支援を中止する。",
      id: "m09-failure"
    },
    parTime: 840,
    hasOutro: false,
    map: { x: 0.56, y: 0.48 },
    battleCenter: { x: 0, z: 900 },
    battleRadius: 11200,
    briefing: "カラン南部の機甲反撃を止め、ケデム戦車隊と避難車列を守れ。赤TGTは戦車八、SPAAG四、MLRS三、移動指揮車一、Ka-52二。\nMLRSを放置すると味方戦車が砲撃される。指揮車を早く破壊すれば敵火力は低下するが、撤退命令を失った戦車が青い避難車列へ散開する。\nSu-25四とMiG-29A二は白の任意交戦。敵機に引かれず、青いバスと救急車を識別して地上TGTを処理せよ。"
  };

  ctx.addMission(mission, { after: "sera-m08" });
}
