// Sera M08 NIGHT AUDIT — moonlit airfield strike with a two-route objective.
//
// Red military targets define the conventional fuel-denial route. The SHEM
// relay remains a white, rank-neutral contact: destroying it is a deliberate
// shortcut handled by the host's m08ChoiceContract, not a hidden red objective.
export default function register(ctx) {
  const {
    MISSIONS, WORLD_PRESETS, AIRCRAFT_TYPES, ENEMY_AI_PROFILES,
    GROUND_TYPES, ACE_PROFILES
  } = ctx.tables;

  if (!WORLD_PRESETS.ormBasinNight) {
    throw new Error("[sera-m08] ormBasinNight is not registered; load map_ormBasin first");
  }
  if (!MISSIONS.some((mission) => mission.key === "sera-m07" && mission.campaign === "sera")) {
    throw new Error("[sera-m08] Sera M07 predecessor is missing");
  }
  for (const type of ["fa18", "f111f", "mig29", "su24m"]) {
    if (!AIRCRAFT_TYPES[type]) throw new Error(`[sera-m08] required aircraft not registered: ${type}`);
  }
  for (const type of ["mig29", "su24m"]) {
    if (!ENEMY_AI_PROFILES[type]) throw new Error(`[sera-m08] required enemy profile not registered: ${type}`);
  }
  for (const type of ["samSite", "ewVehicle", "mobileCommand", "convoyTruck", "rootRelay"]) {
    if (!GROUND_TYPES[type]) throw new Error(`[sera-m08] required ground type not registered: ${type}`);
  }

  const aceTemplate = ACE_PROFILES.hati || ACE_PROFILES.fenrir || ACE_PROFILES.ironback;
  if (!aceTemplate || !aceTemplate.theme || !aceTemplate.radio) {
    throw new Error("[sera-m08] complete ace profile template is missing");
  }
  ctx.addAceProfile("vesper", {
    ...aceTemplate,
    callsign: "VESPER",
    role: "NIGHTJAR 1 / Basin Defence Lead",
    behavior: "evasive",
    evadeLateral: 72,
    evadeVertical: 34,
    evadeFrequency: 1.85,
    radarColor: "#b9c8ff",
    tracerColor: 0xaec2ff,
    theme: {
      ...aceTemplate.theme,
      primary: 0x171b26,
      secondary: 0x0b0e15,
      accent: 0x7f8fb6,
      canopy: 0x9ab8d8,
      exhaust: 0xffa45f,
      scale: 1.02
    },
    radio: {
      ...aceTemplate.radio,
      inbound: "NIGHTJAR 1、コールサインVESPER。オルム地下区画の防空隊長だ。",
      wingman: "MiG-29が一機、灯りのない山側を回ってる。あれがVESPER。",
      engage: "こちらVESPER。飛行場は捨てられる。地下の街は捨てない。",
      down: "VESPER被弾。NIGHTJAR、地下区画へ退避しろ。ここは私が閉じる。"
    }
  });

  const m08ChoiceContract = Object.freeze({
    timeLimit: 1200,
    relayMark: "m08Relay",
    fuelMark: "m08Fuel",
    militaryMark: "m08Military",
    settlementLightObject: "ormBasinSettlementLights",
    relayChoice: "relay",
    fuelChoice: "fuel",
    relayRank: Object.freeze({ sTime: 480, aTime: 660, minimum: "B" }),
    relayRecord: Object.freeze({
      choiceField: "m08Choice",
      blackoutField: "m08CivilianBlackout"
    }),
    retreat: Object.freeze({
      distance: 13000,
      altitude: 2400,
      banner: "SHEM RELAY OFFLINE · ENEMY IFF LOST"
    })
  });

  const mission = {
    key: "sera-m08",
    campaign: "sera",
    campaignOrder: 8,
    world: "ormBasinNight",
    title: "NIGHT AUDIT",
    jp: "オルム夜間飛行場へ低空侵入し、軍用燃料系統を破壊せよ。白いシェム決済中継所への攻撃は現地判断とする。",
    act: 2,
    storyNo: 8,
    story: "WAR DAY 008 02:10。ROOKは月明かりだけを使い、オルム盆地の夜間飛行場へ侵入する。\n燃料を断つか、戦場を動かす認証そのものを止めるか。選択は現地のRAVENへ委ねられた。",
    epilogue: [
      "オルム夜間飛行場の作戦能力は停止した。",
      "敵機の帰投灯は消え、盆地の空から反応が減っていった。",
      "翌朝、同じ停止表示が街の商店と配給所にも並ぶ可能性を、作戦記録は短く付記した。"
    ],

    friendlies: {
      playerStart: {
        x: -7600,
        y: 240,
        z: -2800,
        facing: { x: 0, z: -300 }
      },
      wingmen: [
        {
          type: "fa18",
          label: "ROOK 2 LARK",
          radioSpeaker: "lark",
          offset: { back: 115, side: 125, up: 12 }
        }
      ],
      // The existing transport-flight renderer is used as an unarmed visual
      // strike package. It preserves the F-111F silhouette and flies the route
      // without turning two invulnerable wingmen into extra dogfighters.
      transports: {
        aircraft: "f111f",
        count: 2,
        callsign: "SABER",
        start: { x: -7000, z: -3450 },
        exit: { x: 7600, z: 2800 },
        altitude: 190,
        spacing: 150,
        speed: 235,
        vulnerable: false
      }
    },

    groundUnits: [
      { id: 801, type: "samSite", label: "WEST SAM", x: -2600, z: 1500, mark: "m08Military" },
      { id: 802, type: "samSite", label: "NORTH SAM", x: 0, z: 2400, mark: "m08Military" },
      { id: 803, type: "samSite", label: "EAST SAM", x: 2600, z: 1300, mark: "m08Military" },
      { id: 804, type: "ewVehicle", label: "EW COMMAND", x: -320, z: 760, mark: "m08Military" },
      { id: 805, type: "mobileCommand", label: "AIRBASE COMMAND", x: 1120, z: 560, mark: "m08Military" },
      { id: 806, type: "mobileCommand", label: "FUEL CONTROL", x: 2240, z: -900, mark: "m08Military" },

      { id: 811, type: "convoyTruck", label: "MILITARY FUEL", x: 1300, z: -1260, mark: "m08Fuel" },
      { id: 812, type: "convoyTruck", label: "MILITARY FUEL", x: 1800, z: -1320, mark: "m08Fuel" },
      { id: 813, type: "convoyTruck", label: "MILITARY FUEL", x: 2320, z: -1260, mark: "m08Fuel" },

      { id: 821, type: "convoyTruck", label: "PAYMENT SERVICE", x: -1380, z: -710, tgt: false, rankNeutral: true, mark: "m08Payment" },
      { id: 822, type: "convoyTruck", label: "PAYMENT SERVICE", x: -1840, z: -1180, tgt: false, rankNeutral: true, mark: "m08Payment" },
      { id: 823, type: "convoyTruck", label: "PAYMENT SERVICE", x: -2150, z: -780, tgt: false, rankNeutral: true, mark: "m08Payment" },
      { id: 824, type: "rootRelay", label: "SHEM PAYMENT RELAY", x: -1650, z: -900, tgt: false, rankNeutral: true, mark: "m08Relay" }
    ],

    sequence: [
      {
        types: [],
        band: 1,
        idBase: 800,
        label: "PENETRATE ORM AIRBASE",
        gate: { mode: "groundMarkClear", mark: "m08Fuel" },
        radio: [
          {
            speaker: "meridian",
            priority: "CRITICAL",
            text: "赤TGTは防空三、指揮車三、軍用燃料車三。白い決済中継所への攻撃は現地判断。",
            id: "m08-targets"
          }
        ]
      },
      {
        types: ["mig29"],
        ace: "vesper",
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        band: 1,
        idBase: 840,
        label: "NIGHTJAR LEAD",
        at: [-800, 3400],
        altitude: 1150,
        facing: [-1650, -900]
      },
      {
        types: ["mig29"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        band: 1,
        idBase: 842,
        label: "BASE CAP",
        role: "line",
        skill: "regular",
        at: [2200, 3000],
        altitude: 1250,
        facing: [1450, 250]
      },
      {
        types: ["su24m", "su24m"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        delay: 32,
        band: 1,
        idBase: 850,
        label: "EVAC FLIGHT ONE",
        role: "trash",
        skill: "rookie",
        at: [3000, 400],
        altitude: 360,
        facing: [7200, 2800]
      },
      {
        types: ["mig29", "mig29"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        delay: 78,
        band: 2,
        idBase: 860,
        label: "NIGHTJAR QRA",
        role: "line",
        skill: "regular",
        at: [5200, 2500],
        altitude: 1450,
        facing: [0, 0],
        radio: [
          {
            speaker: "lark",
            priority: "URGENT",
            text: "東からMiG-29二機。燃料区を続けるなら、あれも残る。",
            id: "m08-qra"
          }
        ]
      },
      {
        types: ["su24m", "su24m"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        delay: 118,
        band: 2,
        idBase: 870,
        label: "EVAC FLIGHT TWO",
        role: "trash",
        skill: "rookie",
        at: [3300, -200],
        altitude: 420,
        facing: [7600, 2600]
      }
    ],

    m08ChoiceContract,
    fixedRadio: [
      { id: "m08_intro_01", at: 3, speaker: "meridian", priority: "NORMAL", text: "ROOK、オルム盆地西端。SABERの低空侵入を追え。" },
      { id: "m08_intro_02", at: 10, speaker: "lark", priority: "NORMAL", text: "ROOK 2、LARK。CROWNは後方にいる。山の影から出ないで。" },
      { id: "m08_intro_03", at: 18, speaker: "strike", priority: "NORMAL", text: "SABER 1。飛行場灯を視認。燃料区へ進む。" },
      { id: "m08_intro_04", at: 23, speaker: "meridian", priority: "NORMAL", text: "SHROUD電子戦機は盆地外で待機。妨害窓は二十分、それを過ぎれば防空網が戻る。" },
      { id: "m08_choice_01", at: 28, speaker: "meridian", priority: "URGENT", text: "シェム決済中継所は攻撃任意。破壊すれば敵の給与・IFF認証は停止する。民間決済も同じ回線だ。" },
      { id: "m08_choice_02", at: 38, speaker: "lark", priority: "NORMAL", text: "燃料だけなら街の灯りは残る。敵機も残る。どっちへ行く？" }
    ],
    successRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "オルム飛行場の作戦能力停止を確認。ROOK、低空のまま西へ離脱せよ。",
      id: "m08-success"
    },
    failureRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "オルム防空網の再編を確認。夜間侵入作戦を中止、ROOKは離脱せよ。",
      id: "m08-failure"
    },
    parTime: 720,
    hasOutro: false,
    map: { x: 0.68, y: 0.46 },
    battleCenter: { x: 0, z: 0 },
    battleRadius: 9800,
    briefing: "月夜のオルム盆地へ低空侵入し、夜間飛行場を停止させる。F-111F SABER二機が燃料区を攻撃し、SHROUD電子戦機一機が盆地外から二十分の妨害窓を作る。赤TGTはSAM三、EW指揮車一、移動指揮車二、軍用燃料車三。\nMiG-29A防空隊とSu-24M退避機は白表示で、全滅不要。NIGHTJAR 1 VESPERも撃墜必須ではない。\n白いSHEM PAYMENT RELAYを破壊すれば敵の給与・IFF認証が止まり、赤TGTが残っていても敵機は撤退する。ただし盆地の民間口座と食料認証、集落灯も同時に停止する。\n燃料区だけを破壊する場合、民間系統は残るが、敵防空隊との接近戦は最後まで続く。"
  };

  ctx.addMission(mission, { after: "sera-m07" });
}
