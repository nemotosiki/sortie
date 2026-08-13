// Sera M02 SHATTERED MORNING — combined air/ground mission definition.
//
// Development load order:
//   index.html?payloads=payloads/map_amalPlain.payload.js,payloads/mission_sera_m02.payload.js
//
// Contract:
//   - adds an independent `sera-m02` mission and leaves legacy USA `m02` untouched
// Host contracts authored here and implemented by the M02 completion pass:
//   - two damageable blue radar facilities; losing one caps S but does not fail
//   - air phases first, then the ground column and its white air cover activate
//   - any surviving TEL reaching the western end of the road fails the sortie
//   - clearing all four TELs ends the mission after a short hold, white contacts optional
export default function register(ctx) {
  const {
    MISSIONS, WORLD_PRESETS, AIRCRAFT_TYPES, ENEMY_AI_PROFILES, GROUND_TYPES
  } = ctx.tables;

  if (!WORLD_PRESETS.amalPlain) {
    throw new Error("[sera-m02] amalPlain is not registered; load map_amalPlain first");
  }
  for (const type of ["f4", "f16", "mig21", "mig23", "su24m"]) {
    if (!AIRCRAFT_TYPES[type]) throw new Error(`[sera-m02] required aircraft not registered: ${type}`);
  }
  for (const type of ["mig21", "mig23", "su24m"]) {
    if (!ENEMY_AI_PROFILES[type]) throw new Error(`[sera-m02] required enemy profile not registered: ${type}`);
  }
  for (const type of ["tel", "aaGun", "adTank", "tank"]) {
    if (!GROUND_TYPES[type]) throw new Error(`[sera-m02] required ground unit not registered: ${type}`);
  }

  const original = MISSIONS.find((mission) => mission.key === "m02");
  if (!original) throw new Error("[sera-m02] stock m02 template was not found");

  // The visible military highway on Amal Plain runs east -> west. Positive
  // route distance therefore carries the TELs toward the escape boundary.
  const convoyRoad = [
    [2250, 180], [1450, 170], [500, 190], [-600, 175],
    [-1750, 190], [-3000, 170], [-4300, 185], [-5550, 170], [-6900, 180]
  ];

  const mission = {
    ...original,
    key: "sera-m02",
    campaign: "sera",
    campaignOrder: 2,
    world: "amalPlain",
    title: "SHATTERED MORNING",
    jp: "前夜の残存航空戦力を掃討し、アマル平原を西へ逃走する移動式弾道ミサイル部隊を阻止せよ。",
    act: 1,
    storyNo: 2,
    story: "WAR DAY 002。レン湾襲撃の翌朝。ROOK隊はアマル平原へ進出し、残存航空隊と移動中のミサイル部隊を捜索する。",
    epilogue: [
      "アマル平原の残存航空隊は排除された。",
      "逃走を図った移動式ミサイル部隊も道路上で停止した。",
      "CROWNは短い時間だけ、戦場の順番をRAVENへ任せた。"
    ],

    friendlies: {
      playerStart: {
        x: -2500,
        y: 2350,
        z: 5200,
        facing: { x: 400, z: 400 }
      },
      wingmen: [
        {
          type: "f4",
          label: "ROOK 1 CROWN",
          radioSpeaker: "crown",
          offset: { back: -135, side: -105, up: 24 }
        },
        {
          type: "f16",
          label: "ROOK 3 LARK",
          radioSpeaker: "lark",
          offset: { back: 105, side: 115, up: -10 }
        }
      ]
    },

    // M02 uses two blue installations rather than M01's single friendlyBase.
    // Su-24M waves name the facility they attack through facilityIndex.
    protectedFacilities: [
      {
        id: "amal-radar-south",
        label: "AMAL RADAR SOUTH",
        x: 2450,
        z: -1280,
        heading: 0.08,
        maxHealth: 100,
        hitRadius: 115
      },
      {
        id: "amal-relay-north",
        label: "AMAL RELAY NORTH",
        x: 3350,
        z: 2080,
        heading: -0.06,
        maxHealth: 100,
        hitRadius: 115
      }
    ],
    facilityContract: {
      rankCapAfterLoss: "A",
      failWhenAllLost: false,
      hitDamage: 34,
      lossRadio: {
        speaker: "lark",
        priority: "URGENT",
        text: "通信施設が一つ落ちた。任務は続けられる、残る攻撃機を止めよう。",
        id: "sera-m02-facility-lost"
      }
    },

    sequence: [
      // Phase 1: the first clear step above M01. These MiG-23s are optional
      // high interceptors, not MiG-29A pressed into early-game trash duty.
      {
        types: ["mig23", "mig23"],
        tgt: false,
        rankNeutral: true,
        // Preserve the stock mission sequence schema. A zero delay keeps the
        // opening immediate while retaining sequence[].delay for registry QA.
        delay: 0,
        band: 1,
        idBase: 0,
        label: "HIGH INTERCEPT",
        role: "line",
        skill: "regular",
        gate: { mode: "clearOrTimeout", timeout: 60 },
        at: [2400, -5200],
        altitude: 2600,
        facing: [0, 500],
        radio: [
          {
            speaker: "meridian",
            priority: "NORMAL",
            text: "ROOK、平原南東上空に白2。MiG-23、高速迎撃隊だ。主任務から離れすぎるな。",
            id: "sera-m02-sweep-meridian"
          },
          {
            speaker: "crown",
            priority: "NORMAL",
            text: "RAVEN、MiG-21より速い。旋回戦に付き合わず、次の攻撃隊へ備えろ。",
            id: "sera-m02-sweep-crown"
          }
        ]
      },

      // Phase 2A: first strike pair attacks the southern radar site.
      {
        types: ["su24m", "su24m"],
        band: 2,
        idBase: 4,
        label: "FENCER",
        facilityIndex: 0,
        at: [9300, -2600],
        altitude: 1550,
        facing: [2450, -1280],
        radio: [
          {
            speaker: "meridian",
            priority: "URGENT",
            text: "東から攻撃機2。赤TGT、アマル南レーダーへ低空進入中。",
            id: "sera-m02-strike-a-meridian"
          },
          {
            speaker: "crown",
            priority: "NORMAL",
            text: "ここから先はお前が決めろ、RAVEN。攻撃機、護衛、対空網――先に危険だと思うものを落とせ。",
            id: "sera-m02-command-transfer-crown"
          }
        ]
      },
      {
        types: ["mig21", "mig21"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        band: 2,
        idBase: 24,
        label: "ESCORT",
        role: "trash",
        skill: "rookie",
        at: [8800, -2200],
        altitude: 2150,
        facing: [2450, -1280]
      },

      // Phase 2B: the second pair bends north toward the communications relay.
      {
        types: ["su24m", "su24m"],
        band: 2,
        idBase: 6,
        label: "FENCER",
        facilityIndex: 1,
        at: [9800, 3600],
        altitude: 1750,
        facing: [3350, 2080],
        radio: [
          {
            speaker: "lark",
            priority: "URGENT",
            text: "北東にも攻撃機2。二つ目の通信施設へ向かってる。残存TGT、こちらで数える。",
            id: "sera-m02-strike-b-lark"
          }
        ]
      },
      {
        types: ["mig21", "mig21"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        band: 2,
        idBase: 26,
        label: "ESCORT",
        role: "trash",
        skill: "rookie",
        at: [9300, 3200],
        altitude: 2350,
        facing: [3350, 2080]
      },

      // Phase 3: the ground-clear principal activates the TEL column. No new
      // fighter wave appears here; the four MiG-21 escorts are the whole local
      // defence allocation and MiG-29A remains absent from M02.
      {
        types: [],
        tgt: false,
        rankNeutral: true,
        band: 3,
        idBase: 28,
        label: "TEL COLUMN",
        at: [-800, -3900],
        altitude: 2450,
        facing: [-3600, 180],
        gate: { mode: "groundMarkClear", mark: "m02Tel" },
        activateGroundPhase: "m02-tel-column",
        radio: [
          {
            speaker: "meridian",
            priority: "CRITICAL",
            text: "西へ移動する車列を捕捉。赤TGTはTEL4。戦域を離脱する前に全車破壊せよ。",
            id: "sera-m02-tel-reveal-meridian"
          },
          {
            speaker: "lark",
            priority: "URGENT",
            text: "対空車両6。逃がせないのは赤いTELだけだよ。",
            id: "sera-m02-tel-reveal-lark"
          }
        ]
      }
    ],

    convoyRoad,
    convoySpeed: 12,
    groundUnits: [
      // The entire column remains dormant until the final principal wave.
      { id: 41, type: "tel", label: "9K720 TEL", mark: "m02Tel", phase: "m02-tel-column", pathOffset: 30 },
      { id: 42, type: "tel", label: "9K720 TEL", mark: "m02Tel", phase: "m02-tel-column", pathOffset: 125 },
      { id: 43, type: "tel", label: "9K720 TEL", mark: "m02Tel", phase: "m02-tel-column", pathOffset: 220 },
      { id: 44, type: "tel", label: "9K720 TEL", mark: "m02Tel", phase: "m02-tel-column", pathOffset: 315 },
      { id: 45, type: "aaGun", label: "ZSU-23-4 SHILKA", tgt: false, rankNeutral: true, phase: "m02-tel-column", pathOffset: 410 },
      { id: 46, type: "adTank", label: "SA-13 GOPHER", tgt: false, rankNeutral: true, phase: "m02-tel-column", pathOffset: 505 },
      { id: 47, type: "tank", label: "T-72", tgt: false, rankNeutral: true, phase: "m02-tel-column", pathOffset: 600 },
      { id: 48, type: "aaGun", label: "ZSU-23-4 SHILKA", tgt: false, rankNeutral: true, phase: "m02-tel-column", pathOffset: 695 },
      { id: 49, type: "adTank", label: "SA-13 GOPHER", tgt: false, rankNeutral: true, phase: "m02-tel-column", pathOffset: 790 },
      { id: 50, type: "tank", label: "T-72", tgt: false, rankNeutral: true, phase: "m02-tel-column", pathOffset: 885 }
    ],
    groundPhaseContract: {
      id: "m02-tel-column",
      activeInitially: false,
      failMark: "m02Tel",
      failAtRouteEnd: true,
      failBanner: "MISSILE COLUMN ESCAPED",
      holdAfterClear: 4,
      failureRadio: {
        speaker: "meridian",
        priority: "CRITICAL",
        text: "TELが西部戦域を離脱。ミサイル部隊の追跡を中止、ROOKは帰投せよ。",
        id: "sera-m02-tel-escaped"
      }
    },

    successRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "TEL全車停止。アマル平原の脅威は排除された。ROOK、帰投せよ。",
      id: "sera-m02-success"
    },
    failureRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "移動式ミサイル部隊を阻止できなかった。作戦を中止する。",
      id: "sera-m02-failure"
    },

    parTime: 720,
    hasOutro: false,
    map: { x: 0.31, y: 0.34 },
    battleCenter: { x: 0, z: 200 },
    battleRadius: 10800,
    briefing: "レン湾襲撃の翌朝、アマル平原に敵残存部隊を確認。\n開幕の白いMiG-23は高速迎撃隊。交戦可能だが撃墜必須ではなく、MiG-29Aはまだ戦線に現れない。\n続いて東方からSu-24M攻撃機が二つのレーダー／通信施設へ侵入する。各隊の白いMiG-21bis二機は護衛だ。施設喪失だけでは任務失敗にならないが、完全防衛評価は失われる。\n最終目標は西へ逃走する9K720 TEL 4両。対空車両と戦車が随伴する。\nTELを1両でも戦域外へ逃がすとMISSION FAILED。赤TGTを優先せよ。\nROOK 1 CROWNはF-4E、ROOK 3 LARKはF-16Cで同行する。",
    introRadio: [
      {
        speaker: "meridian",
        priority: "NORMAL",
        text: "ROOK、こちらMERIDIAN。アマル平原へ進入、残存航空戦力を捜索せよ。",
        id: "sera-m02-intro-meridian"
      },
      {
        speaker: "crown",
        priority: "NORMAL",
        text: "昨日の続きだが、同じ戦い方はするな。平原全体を見ておけ、RAVEN。",
        id: "sera-m02-intro-crown"
      },
      {
        speaker: "lark",
        priority: "NORMAL",
        text: "東にレーダー施設が二つ。道路は西へ一直線……何か逃がすには都合がいいね。",
        id: "sera-m02-intro-lark"
      }
    ]
  };

  // Add-only registration keeps the legacy A02 story runtime attached to
  // `m02`; Sera receives its own persistent key and never triggers DAGGER/HAMMER.
  ctx.addMission(mission);
}
