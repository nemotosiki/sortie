// Sera M04 NARROW SEA — canonical mission-data staging payload.
//
// The generic mission host can already spawn the two combat phases and defend
// a vulnerable carrier. `m04FleetContract` records the remaining host work:
// moving red ships, the Aegis breach line, the delayed MISSION UPDATE and rank.
export default function register(ctx) {
  const {
    MISSIONS, WORLD_PRESETS, AIRCRAFT_TYPES, ENEMY_AI_PROFILES, SHIP_TYPES
  } = ctx.tables;

  if (!WORLD_PRESETS.naharStrait) {
    throw new Error("[sera-m04] naharStrait is not registered; load map_naharStrait first");
  }
  if (!MISSIONS.some((mission) => mission.key === "sera-m03" && mission.campaign === "sera")) {
    throw new Error("[sera-m04] stable sera-m03 predecessor is missing; finish M03 campaign isolation first");
  }
  for (const type of ["f2a", "f4", "f16", "mig21", "mig29", "su34"]) {
    if (!AIRCRAFT_TYPES[type]) throw new Error(`[sera-m04] required aircraft not registered: ${type}`);
  }
  for (const type of ["mig21", "mig29", "su34"]) {
    if (!ENEMY_AI_PROFILES[type]) throw new Error(`[sera-m04] required enemy profile not registered: ${type}`);
  }
  for (const type of ["cruiser", "aegis", "missileBoat", "carrier", "frigate"]) {
    if (!SHIP_TYPES[type]) throw new Error(`[sera-m04] required ship type not registered: ${type}`);
  }

  const m04FleetContract = Object.freeze({
    timeLimit: 1500,
    shipRoute: Object.freeze({
      start: Object.freeze([11500, 0]),
      bridge: Object.freeze([0, 0]),
      breachLineX: -6500,
      speed: 14,
      heading: "west"
    }),
    redFleet: Object.freeze({
      targetTypes: Object.freeze(["cruiser", "aegis", "aegis", "aegis"]),
      breachTypes: Object.freeze(["aegis"]),
      updateArmedAtDestroyed: 2,
      updateArmedAtSeconds: 360,
      failAtBreaches: 2,
      continueAtBreaches: 1,
      breachMark: "m04FleetBreach"
    }),
    missionUpdate: Object.freeze({
      afterRedFleetDestroyed: true,
      quietDelay: Object.freeze([12, 18]),
      banner: "PROTECT CVN EPOCH",
      strikeTypes: Object.freeze(["su34", "su34"]),
      escortTypes: Object.freeze([]),
      firstMissileNotBefore: 60
    }),
    epoch: Object.freeze({
      friendlyId: "epoch",
      label: "CVN EPOCH",
      position: Object.freeze([-9000, 0]),
      maxHp: 4200,
      failOnLoss: true
    }),
    rank: Object.freeze({
      sTime: 990,
      aTime: 1140,
      sMaxBreaches: 0,
      aMaxBreaches: 0,
      sEpochHpPercent: 70,
      bEpochHpPercent: 40,
      ignoreWhiteTargets: true
    }),
    loadoutHints: Object.freeze({
      f2a_lasm: "横腹へ射線を作れば届く。",
      f4_ugb: "艦を越えたら、すぐ上げろ。",
      f16: "防空艦から順番にいこう。",
      otherAntiShip: "その兵装の得意な距離でやろう。"
    })
  });

  const mission = {
    key: "sera-m04",
    campaign: "sera",
    campaignOrder: 4,
    world: "naharStrait",
    title: "NARROW SEA",
    jp: "ナハル海峡を西進するエレム水上打撃群を阻止し、その後の対艦航空攻撃からセラ艦隊を守れ。",
    act: 1,
    storyNo: 4,
    story: "WAR DAY 022。エレム水上打撃群がナハル海峡を西進している。\nROOKは海峡内で主力艦を止め、空母EPOCHの退路を維持する。",
    epilogue: [
      "ナハル海峡の水上打撃群は阻止された。",
      "直後の対艦航空攻撃も失敗し、EPOCHは航空運用を継続した。",
      "海峡に残った艦影は、夕陽の中で一隻ずつ消えていった。"
    ],

    friendlies: {
      playerStart: {
        x: -7200,
        y: 1800,
        z: -4200,
        facing: { x: 0, z: 0 }
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
      ],
      carrier: {
        x: -9000,
        z: 0,
        heading: -Math.PI * 0.5,
        label: "CVN EPOCH",
        vulnerable: true,
        hp: 4200
      },
      guard: {
        readout: "integrity",
        label: "EPOCH",
        lossPenalty: 0,
        hitPenalty: 400,
        lossBanner: "EPOCH LOST",
        failBanner: "EPOCH LOST",
        lossRadio: "",
        failRadio: "EPOCH沈没。艦隊防空任務を中止、ROOKは離脱せよ。",
        safeRadio: "",
        asmRadio: "対艦ミサイル発射を確認！ EPOCHへ向かっている！"
      }
    },

    // PHASE 1: four red capital targets, four white boats, MiG-29A x2 fleet
    // cover, and a delayed MiG-21 x2 shore-relief flight. MiG-29A makes its
    // first campaign appearance here as line/regular, never as early trash.
    // PHASE 2: two red strike aircraft hunt EPOCH without another fighter blob.
    sequence: [
      {
        kind: "naval",
        fleet: ["cruiser", "aegis", "aegis", "aegis"],
        band: 1,
        idBase: 0,
        label: "SURFACE STRIKE GROUP",
        at: [11500, 0],
        facing: [-6500, 0],
        radio: [
          {
            speaker: "meridian",
            priority: "CRITICAL",
            text: "敵艦隊を確認。防空巡洋艦一、イージス艦三をTGT指定。",
            id: "m04_contact_01"
          }
        ]
      },
      {
        kind: "naval",
        fleet: ["missileBoat", "missileBoat", "missileBoat", "missileBoat"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        band: 1,
        idBase: 10,
        label: "MISSILE BOAT",
        at: [10800, 0],
        facing: [-6500, 0]
      },
      {
        types: ["mig29", "mig29"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        band: 1,
        idBase: 20,
        label: "FLEET CAP",
        role: "line",
        skill: "regular",
        at: [8500, 7000],
        altitude: 1800,
        facing: [0, 0]
      },
      {
        types: ["mig21", "mig21"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        delay: 90,
        band: 1,
        idBase: 24,
        label: "SHORE RELIEF",
        role: "trash",
        skill: "rookie",
        at: [8500, 7000],
        altitude: 1900,
        facing: [0, 0]
      },
      {
        types: ["su34", "su34"],
        band: 2,
        idBase: 30,
        label: "ANTI-SHIP STRIKE",
        hunt: "ship",
        role: "line",
        skill: "regular",
        at: [9500, -7500],
        altitude: 1400,
        facing: [-9000, 0],
        radio: [
          {
            speaker: "meridian",
            priority: "CRITICAL",
            text: "ROOK、全機反転。EPOCHへ向かう対艦攻撃隊を迎撃せよ。",
            id: "m04_update_02"
          }
        ]
      }
    ],

    m04FleetContract,
    fixedRadio: [
      { id: "m04_intro_01", at: 3, speaker: "meridian", priority: "NORMAL", text: "ROOK、ナハル海峡西部へ進入。敵水上打撃群は東から西進中。" },
      { id: "m04_intro_02", at: 9, speaker: "epoch", priority: "NORMAL", text: "CVN EPOCH。護衛陣形を維持、ROOKへ目標情報を送る。" },
      { id: "m04_intro_03", at: 15, speaker: "lark", priority: "NORMAL", text: "中央橋を確認。艦隊はその東側。" },
      { id: "m04_intro_04", at: 20, speaker: "crown", priority: "NORMAL", text: "今日は相手が大きいな。撃った後の出口だけ決めとこう。" },
      { id: "m04_ship_01", event: "firstRedShipDestroyed", speaker: "lark", priority: "NORMAL", text: "赤艦一隻、沈没。残り三。" },
      { id: "m04_phase2_03", event: "firstRedShipCrossesBridge", speaker: "lark", priority: "URGENT", text: "イージス艦一隻、橋を越えた。突破線へ向かってる。" },
      { id: "m04_clear_01", event: "redFleetDestroyed", speaker: "meridian", priority: "NORMAL", text: "敵主力艦、全滅。海峡内の水上脅威なし。" },
      { id: "m04_update_01", event: "strikeInbound", speaker: "epoch", priority: "CRITICAL", text: "南東に高速接近。対艦攻撃機を確認！" },
      { id: "m04_missile_01", event: "antiShipMissileLaunch", speaker: "epoch", priority: "CRITICAL", text: "対艦ミサイル発射を確認！ 迎撃開始！" },
      { id: "m04_end_01", event: "redStrikeDestroyed", speaker: "meridian", priority: "NORMAL", text: "対艦攻撃隊、全滅。EPOCHの生存を確認。" }
    ],
    successRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "敵水上打撃群と対艦攻撃隊を排除。EPOCHの生存を確認。ROOK、帰投せよ。",
      id: "m04-success"
    },
    failureRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "EPOCH喪失、またはイージス艦二隻が突破。ナハル海峡阻止任務を中止する。",
      id: "m04-failure"
    },
    parTime: 990,
    hasOutro: false,
    map: { x: 0.54, y: 0.34 },
    battleCenter: { x: 0, z: 0 },
    battleRadius: 18000,
    briefing: "ナハル海峡を西進するエレム艦隊を阻止する。赤TGTは防空巡洋艦一、イージス艦三。\n白いミサイル艇とMiG-29A二機は護衛であり、全滅させる必要はない。MiG-29Aは艦隊CAP、遅れて来るMiG-21bisは沿岸増援だ。イージス艦二隻の西側突破でMISSION FAILED。\n赤艦全滅後はEPOCH防衛へ移行する。南東から来る赤Su-34二機を優先し、対艦ミサイルを発射させるな。"
  };

  ctx.addMission(mission);
}
