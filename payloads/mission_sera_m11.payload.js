// Sera M11 FROZEN EYE — corrected high-altitude attack-formation escort.
//
// This replaces the superseded radar/SAM draft. HALO 1–3 fly the operation
// line while six designated interceptors hunt them. Two optional MiG-29As try
// to pull RAVEN away from the formation. The host reads m11EscortContract for
// the 2-of-3 arrival objective, impossible-survival failure, radio, and result.
export default function register(ctx) {
  const { MISSIONS, WORLD_PRESETS, AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;

  const world = WORLD_PRESETS.verIceCoast;
  if (!world) throw new Error("[sera-m11] verIceCoast is not registered; load map_verIceCoast first");
  if (!MISSIONS.some((mission) => mission.key === "sera-m10" && mission.campaign === "sera")) {
    throw new Error("[sera-m11] sera-m10 predecessor is missing");
  }
  for (const type of ["fa18", "b1b", "mig29", "mig31"]) {
    if (!AIRCRAFT_TYPES[type]) throw new Error(`[sera-m11] required aircraft not registered: ${type}`);
  }
  for (const type of ["mig29", "mig31"]) {
    if (!ENEMY_AI_PROFILES[type]) throw new Error(`[sera-m11] required enemy profile not registered: ${type}`);
  }

  const anchors = world.missionAnchors;
  for (const key of [
    "playerStart", "strikeStart", "strikeExit", "operationLine", "battleCenter",
    "firstIntercept", "northIntercept", "southIntercept", "diversionEntry"
  ]) {
    if (!Array.isArray(anchors?.[key]) || anchors[key].length !== 2) {
      throw new Error(`[sera-m11] Ver Ice Coast mission anchor is missing: ${key}`);
    }
  }

  const m11EscortContract = Object.freeze({
    callsign: "HALO",
    aircraft: "b1b",
    total: 3,
    requiredSaved: 2,
    timeLimit: 330,
    missionTag: "m11HaloHunter",
    operationAltitude: 5100,
    route: Object.freeze({
      start: Object.freeze([...anchors.strikeStart]),
      exit: Object.freeze([...anchors.strikeExit])
    }),
    proximity: Object.freeze({
      warningDistance: 4300,
      clearDistance: 3000,
      repeatDelay: 34,
      banner: "RETURN TO HALO FORMATION"
    }),
    outcomes: Object.freeze({
      saved: "attackAircraftSaved",
      lost: "attackAircraftLost",
      allSafe: "allAttackAircraftSafe"
    }),
    rank: Object.freeze({
      sTime: 230,
      aTime: 285,
      sGuardLosses: 0,
      ignoreWhiteTargets: true
    })
  });

  const mission = {
    key: "sera-m11",
    campaign: "sera",
    campaignOrder: 11,
    world: "verIceCoast",
    title: "FROZEN EYE",
    jp: "セラ高高度攻撃隊HALOと合流し、高速迎撃機から作戦線到達まで護衛せよ。",
    act: 2,
    storyNo: 11,
    story: "WAR DAY 121。氷海岸上空、高度五千百。CROWNのいないROOKは、セラ高高度攻撃隊HALOの進路を開く。\n速度差の大きい迎撃機が白い海岸線を横切り、短い攻撃機会を狙って編隊へ突入する。",
    epilogue: [
      "HALO攻撃隊は必要戦力を保ったまま、氷海岸の作戦線を通過した。",
      "LARKはCROWNの空席を見ず、RAVENの反対側で編隊を支え続けた。",
      "MERIDIANは生還した攻撃機の数を、次の攻勢に使える戦力として記録した。"
    ],
    friendlies: {
      playerStart: {
        x: anchors.playerStart[0],
        y: 5100,
        z: anchors.playerStart[1],
        facing: { x: anchors.strikeExit[0], z: anchors.strikeExit[1] }
      },
      wingmen: [
        {
          type: "fa18",
          label: "ROOK 2 LARK",
          radioSpeaker: "lark",
          spw: "aam4",
          offset: { back: 125, side: 150, up: -18 }
        }
      ],
      transportGroups: [
        {
          aircraft: "b1b",
          callsign: "HALO",
          count: 3,
          vulnerable: true,
          hp: 520,
          speed: 128,
          altitude: 5100,
          spacing: 310,
          start: { x: anchors.strikeStart[0], z: anchors.strikeStart[1] },
          exit: { x: anchors.strikeExit[0], z: anchors.strikeExit[1] }
        }
      ],
      guard: {
        readout: "count",
        label: "HALO",
        lossPenalty: 550,
        hitPenalty: 0,
        lossBanner: "HALO AIRCRAFT LOST",
        failBanner: "STRIKE FORMATION LOST",
        lossRadio: "HALOが一機落ちた！ 残存機を作戦線まで通せ！",
        failRadio: "HALOの必要戦力を喪失。FROZEN EYEを中止する。",
        safeRadio: "HALO編隊、作戦線を通過。攻撃隊は任務空域へ進む。"
      }
    },
    sequence: [
      {
        types: ["mig29", "mig29"],
        tgt: true,
        rankNeutral: false,
        missionTag: "m11HaloHunter",
        band: 2,
        idBase: 400,
        label: "FULCRUM INTERCEPT",
        role: "line",
        skill: "regular",
        hunt: "air",
        at: [...anchors.firstIntercept],
        altitude: 5250,
        facing: [...anchors.strikeStart],
        radio: [
          {
            speaker: "meridian",
            priority: "CRITICAL",
            text: "前方MiG-29A二。HALOへの進路を取っている。TGT指定、最初の迎撃波を排除せよ。",
            id: "m11-first-intercept"
          }
        ]
      },
      {
        types: ["mig31", "mig31"],
        tgt: true,
        rankNeutral: false,
        concurrent: true,
        delay: 45,
        missionTag: "m11HaloHunter",
        band: 3,
        idBase: 410,
        label: "FOXHOUND HIGH 1",
        role: "line",
        skill: "veteran",
        hunt: "air",
        at: [...anchors.northIntercept],
        altitude: 5900,
        facing: [...anchors.battleCenter],
        radio: [
          {
            speaker: "meridian",
            priority: "URGENT",
            text: "北方、高速反応二。MiG-31がHALOの側面へ回る。速度を合わせるな、攻撃進路を切れ。",
            id: "m11-foxhound-one"
          }
        ]
      },
      {
        types: ["mig29", "mig29"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        delay: 82,
        missionTag: "m11Diversion",
        band: 2,
        idBase: 420,
        label: "FULCRUM DIVERSION",
        role: "line",
        skill: "veteran",
        at: [...anchors.diversionEntry],
        altitude: 4750,
        facing: [...anchors.battleCenter],
        radio: [
          {
            speaker: "lark",
            priority: "NORMAL",
            text: "下方MiG-29A二、こっちを誘ってる。白表示だ。HALOから離されるな！",
            id: "m11-diversion"
          }
        ]
      },
      {
        types: ["mig31", "mig31"],
        tgt: true,
        rankNeutral: false,
        concurrent: true,
        delay: 128,
        missionTag: "m11HaloHunter",
        band: 3,
        idBase: 430,
        label: "FOXHOUND HIGH 2",
        role: "line",
        skill: "veteran",
        hunt: "air",
        at: [...anchors.southIntercept],
        altitude: 5650,
        facing: [...anchors.operationLine],
        radio: [
          {
            speaker: "meridian",
            priority: "CRITICAL",
            text: "南東からMiG-31二、最終迎撃波。HALOは作戦線まで残り六十秒、TGTを近づけるな。",
            id: "m11-foxhound-two"
          }
        ]
      }
    ],
    m11EscortContract,
    fixedRadio: [
      { id: "m11-intro-1", at: 2, speaker: "meridian", priority: "NORMAL", text: "ROOK、VER ICE COASTへ進入。高度五千百、HALO攻撃隊と合流せよ。" },
      { id: "m11-intro-2", at: 8, speaker: "lark", priority: "NORMAL", text: "HALO三機を確認。CROWNの分まで、左右は私たちで埋める。" },
      { id: "m11-intro-3", at: 14, speaker: "meridian", priority: "URGENT", text: "作戦線到達には二機が必要だ。赤TGTはHALOを狙う。白い陽動に釣られるな。" },
      { id: "m11-one-lost", event: "haloOneLost", speaker: "meridian", priority: "CRITICAL", text: "HALO一機喪失。残る二機のどちらも失えない。編隊防護を最優先。" },
      { id: "m11-halfway", event: "haloHalfway", speaker: "meridian", priority: "NORMAL", text: "HALO、航程の半分を通過。作戦線まで護衛を維持せよ。" },
      { id: "m11-near-line", event: "haloNearLine", speaker: "lark", priority: "URGENT", text: "作戦線が見えた。あと少し、HALOの後ろを空けないで！" },
      { id: "m11-required-safe", event: "haloRequiredSafe", speaker: "meridian", priority: "CRITICAL", text: "HALO二機以上、作戦線通過を確認。FROZEN EYE達成。" }
    ],
    successRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "HALO必要戦力が作戦線へ到達。ROOK、護衛完了。残敵から離脱せよ。",
      id: "m11-success"
    },
    failureRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "HALOの必要戦力を失った。高高度攻撃は中止、ROOKは帰投せよ。",
      id: "m11-failure"
    },
    parTime: 230,
    hasOutro: false,
    map: { x: 0.65, y: 0.18 },
    battleCenter: { x: anchors.battleCenter[0], z: anchors.battleCenter[1] },
    battleRadius: 18500,
    briefing: "VER ICE COAST上空、高度約5,100mでセラ高高度攻撃隊HALO 1–3を護衛する。HALO三機のうち二機以上が作戦線へ到達すれば任務達成。一機までは失っても続行できるが、Sランクには全機生還が必要だ。\n赤TGTはHALOを直接狙うMiG-29A二機とMiG-31四機。MiG-31は二機ずつ時間差で高速進入する。白表示のMiG-29A二機はRAVENを狙う陽動で、撃破は必須ではない。\n右上のHALO表示で残存数を確認し、編隊から大きく離れた場合はMERIDIANの警告に従え。酸素・エンジン管理などの追加操作はない。"
  };

  ctx.addMission(mission, { after: "sera-m10" });
}
