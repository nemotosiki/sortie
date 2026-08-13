// Sera M03 LOW WATER — Sark Port helicopter/landing defence.
//
// Development load order:
//   index.html?payloads=payloads/map_sarkPort.payload.js,payloads/mission_sera_m03.payload.js
//
// Contract:
//   - adds independent `sera-m03` and leaves legacy USA `m-heli` untouched
// Host contracts authored here:
//   - armedTransportHeli follows landingContract routes instead of player-orbit AI
//   - each completed unload replaces one transport TGT with two moving APC TGTs
//   - four APC arrivals or loss of the port command post fails the sortie
//   - m03RankContract permits either landing denial or port-defence preservation
export default function register(ctx) {
  const {
    MISSIONS, WORLD_PRESETS, AIRCRAFT_TYPES, ENEMY_AI_PROFILES,
    HELI_TYPES, GROUND_TYPES
  } = ctx.tables;

  if (!WORLD_PRESETS.sarkPort) {
    throw new Error("[sera-m03] sarkPort is not registered; load map_sarkPort first");
  }
  for (const type of ["f4", "f16", "mig21", "su25"]) {
    if (!AIRCRAFT_TYPES[type]) throw new Error(`[sera-m03] required aircraft not registered: ${type}`);
  }
  for (const type of ["mig21", "su25"]) {
    if (!ENEMY_AI_PROFILES[type]) throw new Error(`[sera-m03] required enemy profile not registered: ${type}`);
  }
  for (const type of ["ka52", "armedTransportHeli"]) {
    if (!HELI_TYPES[type]) throw new Error(`[sera-m03] required helicopter not registered: ${type}`);
  }
  for (const type of ["tank", "spaag"]) {
    if (!GROUND_TYPES[type]) throw new Error(`[sera-m03] required ground type not registered: ${type}`);
  }

  const original = MISSIONS.find((mission) => mission.key === "m-heli");
  if (!original) throw new Error("[sera-m03] stock m-heli template was not found");

  const landingContract = {
    transportType: "armedTransportHeli",
    capY: 22,
    touchdownY: 34,
    unloadDelay: 2.8,
    approachSpeed: 72,
    apcSpeed: 18,
    commandDamagePerArrival: 35,
    timeLimit: 1260,
    apcType: "tank",
    apcLabel: "BTR-80 APC",
    apcMark: "m03Apc",
    apcPerTransport: 2,
    failArrivals: 4,
    commandFacilityId: "sark-command",
    lzs: [
      {
        id: "A",
        x: -300,
        z: -4250,
        route: [
          [5000, -3800, 180],
          [2600, -3900, 145],
          [900, -4070, 90],
          [-300, -4250, 34]
        ],
        apcPath: [
          [-300, -4250],
          [-350, -3900],
          [-500, -3350],
          [-650, -2650]
        ]
      },
      {
        id: "B",
        x: 500,
        z: -4100,
        route: [
          [5200, -3500, 180],
          [3000, -3650, 145],
          [1500, -3900, 90],
          [500, -4100, 34]
        ],
        apcPath: [
          [500, -4100],
          [250, -3700],
          [-100, -3250],
          [-650, -2650]
        ]
      }
    ],
    landingRadio: {
      speaker: "lark",
      priority: "URGENT",
      text: "輸送ヘリが着陸、装甲車を展開してる。赤TGTが地上へ移った！",
      id: "sera-m03-landing"
    },
    arrivalWarningRadio: {
      speaker: "crown",
      priority: "URGENT",
      text: "装甲車が司令所へ到達した。あとを通すな、RAVEN。",
      id: "sera-m03-apc-arrival"
    },
    failureRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "敵地上部隊が港湾司令所を制圧。共同防空作戦を中止する。",
      id: "sera-m03-command-overrun"
    }
  };

  const mission = {
    ...original,
    key: "sera-m03",
    campaign: "sera",
    campaignOrder: 3,
    world: "sarkPort",
    title: "LOW WATER",
    jp: "サルク港へ低空侵入する攻撃ヘリと武装輸送ヘリを阻止し、港湾司令所を防衛せよ。",
    act: 1,
    storyNo: 3,
    story: "WAR DAY 011。戦火は中立港サルクへ波及した。\nROOKは共同防空隊と合流し、運河へ侵入する敵ヘリボーン部隊を迎撃する。",
    epilogue: [
      "サルク港の共同防空圏は維持された。",
      "撃墜された輸送ヘリには兵員とともに、水と医療物資が積まれていた。",
      "侵攻と救援は、同じ機体の中で分けられなかった。"
    ],

    friendlies: {
      playerStart: {
        x: -4300,
        y: 900,
        z: -6300,
        facing: { x: -300, z: -3000 }
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

    protectedFacilities: [
      {
        id: "sark-command",
        label: "SARK PORT COMMAND",
        x: -650,
        z: -2650,
        heading: 0.05,
        maxHealth: 180,
        hitRadius: 125
      },
      {
        id: "sark-spaag-west",
        label: "PORT DEFENSE WEST",
        x: -1250,
        z: -3300,
        heading: -0.15,
        maxHealth: 80,
        hitRadius: 85
      },
      {
        id: "sark-spaag-east",
        label: "PORT DEFENSE EAST",
        x: 350,
        z: -3600,
        heading: 0.2,
        maxHealth: 80,
        hitRadius: 85
      }
    ],
    facilityContract: {
      failWhenAllLost: false,
      hitDamage: 34,
      lossRadio: {
        speaker: "lark",
        priority: "URGENT",
        text: "港の防空陣地が一つ落ちた。攻撃機が通りやすくなる、残りを守ろう。",
        id: "sera-m03-port-defense-lost"
      }
    },

    // One engagement, deliberately overlapped. Nothing asks the player to
    // choose in a menu: flying toward the transports or the Ka-52s is the choice.
    sequence: [
      {
        types: ["ka52", "ka52"],
        delay: 0,
        band: 1,
        idBase: 0,
        label: "ALLIGATOR",
        role: "trash",
        skill: "rookie",
        at: [4200, -200],
        altitude: 360,
        facing: [-850, -2400],
        radio: [
          {
            speaker: "meridian",
            priority: "URGENT",
            text: "北東低空に赤TGT、Ka-52二機。港湾防空陣地へ進入中。",
            id: "sera-m03-ka52-meridian"
          },
          {
            speaker: "crown",
            priority: "NORMAL",
            text: "クレーンより低い。旋回戦にせず、一度抜けて戻れ。",
            id: "sera-m03-ka52-crown"
          }
        ]
      },
      {
        types: ["mig21", "mig21"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        band: 1,
        idBase: 20,
        label: "TOP COVER",
        role: "trash",
        skill: "rookie",
        at: [3200, -400],
        altitude: 1500,
        facing: [0, -3000]
      },
      {
        types: ["armedTransportHeli", "armedTransportHeli"],
        concurrent: true,
        delay: 8,
        band: 1,
        idBase: 30,
        label: "LANDING FLIGHT",
        role: "trash",
        skill: "rookie",
        at: [5000, -3800],
        altitude: 180,
        facing: [-300, -4250],
        radio: [
          {
            speaker: "meridian",
            priority: "CRITICAL",
            text: "東の運河入口に武装輸送ヘリ二機。赤TGT、南部着陸区へ向かう。",
            id: "sera-m03-transport-main"
          }
        ]
      },
      {
        types: ["ka52", "ka52"],
        concurrent: true,
        delay: 13,
        band: 1,
        idBase: 2,
        label: "ALLIGATOR",
        role: "trash",
        skill: "rookie",
        at: [4600, -650],
        altitude: 320,
        facing: [-650, -2650]
      },
      {
        types: ["armedTransportHeli"],
        concurrent: true,
        delay: 24,
        band: 1,
        idBase: 32,
        label: "LANDING FLIGHT",
        role: "trash",
        skill: "rookie",
        at: [5200, -3500],
        altitude: 180,
        facing: [500, -4100],
        radio: [
          {
            speaker: "lark",
            priority: "URGENT",
            text: "もう一機、運河の南側。攻撃ヘリもまだいる――どちらを先に止める？",
            id: "sera-m03-transport-third"
          }
        ]
      },

      // Phase 2: the result amplifier. These aircraft attack surviving port
      // defences; losing those sites earlier therefore changes this fight.
      {
        types: ["su25"],
        band: 2,
        idBase: 40,
        label: "FROGFOOT",
        facilityIndex: 1,
        at: [4700, -500],
        altitude: 950,
        facing: [-1250, -3300],
        radio: [
          {
            speaker: "meridian",
            priority: "CRITICAL",
            text: "北東からSu-25二機。残存する港湾防空と司令所を狙っている。",
            id: "sera-m03-cas-meridian"
          }
        ]
      },
      {
        types: ["su25"],
        concurrent: true,
        delay: 7,
        band: 2,
        idBase: 41,
        label: "FROGFOOT",
        facilityIndex: 2,
        at: [5000, 250],
        altitude: 1050,
        facing: [350, -3600]
      },
      {
        types: ["mig21", "mig21"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        delay: 45,
        band: 2,
        idBase: 22,
        label: "RELIEF",
        role: "trash",
        skill: "rookie",
        at: [3800, -800],
        altitude: 1350,
        facing: [0, -3000],
        radio: [
          {
            speaker: "crown",
            priority: "NORMAL",
            text: "白いMiG-21が二機追加。港を捨てて追うな、指定目標を続けろ。",
            id: "sera-m03-relief-crown"
          }
        ]
      }
    ],

    landingContract,
    m03RankContract: {
      commandFacilityId: "sark-command",
      defenseFacilityIds: ["sark-spaag-west", "sark-spaag-east"],
      commandHpForS: 70,
      defenseSurvivorsForS: 2,
      zeroLandingAlternative: true
    },

    successRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "敵上陸部隊と航空支援を排除。サルク港共同防空圏を維持した。ROOK、帰投せよ。",
      id: "sera-m03-success"
    },
    failureRadio: landingContract.failureRadio,

    parTime: 810,
    hasOutro: false,
    map: { x: 0.41, y: 0.31 },
    battleCenter: { x: 0, z: -3000 },
    battleRadius: 9800,
    briefing: "ケデム共和国の中立港サルクへ敵ヘリボーン部隊が侵入中。\n赤TGTはKa-52攻撃ヘリ4、武装輸送ヘリ3、後続Su-25攻撃機2。\n白表示のMiG-21は上空援護であり、撃墜必須ではない。\n輸送ヘリを着陸させると1機につき装甲車2両が展開し、赤TGTは地上戦へ移る。着陸そのものは失敗ではない。\n装甲車4両の司令所到達、港湾司令所喪失、またはRAVEN撃墜でMISSION FAILED。\n輸送ヘリを止めるか、Ka-52から港湾防空を守るか。優先順位はRAVENが決める。",
    introRadio: [
      {
        speaker: "meridian",
        priority: "NORMAL",
        text: "ROOK、サルク港共同防空圏へ進入。青識別を更新する。",
        id: "sera-m03-intro-meridian"
      },
      {
        speaker: "crown",
        priority: "NORMAL",
        text: "港は狭い。運河とクレーンの間で追い回すな、RAVEN。",
        id: "sera-m03-intro-crown"
      },
      {
        speaker: "lark",
        priority: "NORMAL",
        text: "司令所は港の中央西寄り。南の着陸区へ抜けるヘリも見ておく。",
        id: "sera-m03-intro-lark"
      }
    ]
  };

  // Add-only registration preserves the legacy third USA slot. LOW WATER owns
  // one persistent key and no longer needs a compatibility result mirror.
  ctx.addMission(mission);
}
