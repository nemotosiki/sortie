// Sera M01 FIRST CONTACT — playable vertical-slice mission definition.
//
// Development load order:
//   index.html?payloads=payloads/map_renBay.payload.js,payloads/mission_sera_m01.payload.js
//
// Contract:
//   - adds an independent `sera-m01` mission and leaves legacy USA `m01` untouched
//   - uses the recovered `renBay` world
//   - teaches the three-colour IFF contract: red TGT / white hostile / blue ally
//   - fields CROWN in an F-15C and LARK in an F-16C as distinct blue wingmen
//   - opens with two white fighters, advancing on clear or after 75 seconds
//   - follows with three Tu-22M3 groups: 6 red bombers and 8 white escorts
//   - 0 bomber breaches = full defence; 1 = continue with S capped; 2 = failure
export default function register(ctx) {
  const { MISSIONS, WORLD_PRESETS, AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;

  if (!WORLD_PRESETS.renBay) {
    throw new Error("[sera-m01] renBay is not registered; load map_renBay first");
  }
  for (const type of ["tu22m3", "mig29", "f16", "f15c"]) {
    if (!AIRCRAFT_TYPES[type]) {
      throw new Error(`[sera-m01] required aircraft not registered: ${type}`);
    }
  }
  for (const type of ["tu22m3", "mig29"]) {
    if (!ENEMY_AI_PROFILES[type]) {
      throw new Error(`[sera-m01] required enemy profile not registered: ${type}`);
    }
  }

  const original = MISSIONS.find((mission) => mission.key === "m01");
  if (!original) throw new Error("[sera-m01] stock m01 template was not found");

  const mission = {
    ...original,
    key: "sera-m01",
    campaign: "sera",
    campaignOrder: 1,
    world: "renBay",
    title: "FIRST CONTACT",
    jp: "レン湾へ侵入するエレム爆撃隊を迎撃せよ。赤TGTの爆撃機を優先し、湾北岸への投弾を阻止する。",
    act: 1,
    storyNo: 1,
    story: "WAR DAY 001。ROOK隊の初出撃。RAVENはCROWNとLARKとともに、レン湾へ接近する爆撃隊を迎撃する。",
    epilogue: [
      "レン湾への爆撃隊は撃退された。",
      "ROOK隊は三機で帰投した。",
      "RAVENの最初の任務は、まだ始まりにすぎない。"
    ],

    // Mission-owned friendly roster. The host falls back to the legacy
    // FRIENDLY_DEPLOYMENTS table when this field is absent, so stock missions
    // still field their original single campaign wingman.
    friendlies: {
      playerStart: {
        x: -6200,
        y: 2600,
        z: -7600,
        facing: { x: 0, z: 4300 }
      },
      wingmen: [
        {
          type: "f15c",
          label: "ROOK 1 CROWN",
          radioSpeaker: "crown",
          // CROWN starts slightly ahead and left as the element lead.
          offset: { back: -125, side: -95, up: 28 }
        },
        {
          type: "f16",
          label: "ROOK 3 LARK",
          radioSpeaker: "lark",
          offset: { back: 95, side: 110, up: -12 }
        }
      ]
    },

    // The opening pair is white and rank-neutral. It is a tutorial phase, not
    // part of ACCOMPLISHED: clear both, or survive 75 seconds, and MERIDIAN
    // brings up the first bomber group. The remaining white contacts are the
    // bomber escorts. 2 + 2 + 2 + 4 = 10 white hostiles in total.
    sequence: [
      {
        types: ["mig29", "mig29"],
        tgt: false,
        rankNeutral: true,
        band: 1,
        idBase: 6,
        label: "SCOUT",
        role: "trash",
        gate: { mode: "clearOrTimeout", timeout: 75 },
        at: [8200, -2600],
        altitude: 2500,
        facing: [0, 2000],
        radio: [
          {
            speaker: "meridian",
            priority: "NORMAL",
            text: "ROOK、東南東に未確認機2。白表示は敵性だが非TGT。まず迎撃し、識別規則を確認せよ。",
            id: "sera-m01-contact-meridian"
          },
          {
            speaker: "crown",
            priority: "NORMAL",
            text: "RAVEN、白は撃っていい。赤が本命だ——今はこの2機で手を慣らそう。",
            id: "sera-m01-contact-crown"
          }
        ]
      },
      {
        types: ["tu22m3", "tu22m3"],
        band: 1,
        idBase: 0,
        label: "BACKFIRE",
        at: [-1200, -11000],
        altitude: 3200,
        facing: [-2450, 5000],
        radio: [
          {
            speaker: "meridian",
            priority: "URGENT",
            text: "南方に爆撃機2。赤TGTへ更新。レン湾空港へ到達する前に撃墜せよ。",
            id: "sera-m01-wave-1-meridian"
          }
        ]
      },
      {
        types: ["mig29", "mig29"],
        tgt: false,
        rankNeutral: true,
        band: 1,
        idBase: 8,
        label: "ESCORT",
        concurrent: true,
        role: "trash",
        at: [-900, -10600],
        altitude: 3500,
        facing: [-2450, 5000],
        radio: [
          {
            speaker: "crown",
            priority: "NORMAL",
            text: "護衛はこっちで見る。RAVEN、赤い爆撃機を頼む。",
            id: "sera-m01-wave-1-crown"
          }
        ]
      },
      {
        types: ["tu22m3", "tu22m3"],
        band: 2,
        idBase: 2,
        label: "BACKFIRE",
        at: [12000, 700],
        altitude: 2800,
        facing: [-2450, 5000],
        radio: [
          {
            speaker: "meridian",
            priority: "URGENT",
            text: "東方に第2爆撃隊。新たに2機を赤TGT指定。大きく右へ旋回せよ。",
            id: "sera-m01-wave-2-meridian"
          },
          {
            speaker: "lark",
            priority: "NORMAL",
            text: "RAVEN、東側はこっちからも見えてる。湾奥までまだ距離はあるよ。",
            id: "sera-m01-wave-2-lark"
          }
        ]
      },
      {
        types: ["mig29", "mig29"],
        tgt: false,
        rankNeutral: true,
        band: 2,
        idBase: 10,
        label: "ESCORT",
        concurrent: true,
        role: "trash",
        at: [11600, 1000],
        altitude: 3300,
        facing: [-2450, 5000]
      },
      {
        types: ["tu22m3", "tu22m3"],
        band: 2,
        idBase: 4,
        label: "BACKFIRE",
        at: [9000, -9000],
        altitude: 3500,
        facing: [-2450, 5000],
        radio: [
          {
            speaker: "meridian",
            priority: "CRITICAL",
            text: "南東、大型編隊。最後の爆撃機2を赤TGT指定。護衛4、突破を許すな。",
            id: "sera-m01-wave-3-meridian"
          }
        ]
      },
      {
        types: ["mig29", "mig29", "mig29", "mig29"],
        tgt: false,
        rankNeutral: true,
        band: 2,
        idBase: 12,
        label: "ESCORT",
        concurrent: true,
        role: "trash",
        at: [8500, -8500],
        altitude: 3900,
        facing: [-2450, 5000],
        radio: [
          {
            speaker: "crown",
            priority: "NORMAL",
            text: "護衛が増えたな。焦らなくていい、赤い方だけ見ていろ。",
            id: "sera-m01-wave-3-crown"
          }
        ]
      }
    ],

    // Existing strike AI increments friendlyBase.hits when a bomber reaches
    // the release line. The host interprets this small mission contract:
    // one breach caps the rank at A, two end the sortie immediately.
    bomberBreach: {
      sCapAt: 1,
      failAt: 2,
      failBanner: "REN BAY DEFENCE FAILED",
      farRadio: {
        speaker: "meridian",
        priority: "NORMAL",
        text: "爆撃隊はレン湾北岸へ直進中。赤TGTを優先せよ。",
        id: "sera-m01-bomber-far"
      },
      closeRadio: {
        speaker: "lark",
        priority: "URGENT",
        text: "爆撃機、投弾線まで近い！ RAVEN、今すぐ赤を止めて！",
        id: "sera-m01-bomber-close"
      },
      hitRadio: {
        speaker: "meridian",
        priority: "URGENT",
        text: "爆撃機1機が投弾。任務は続行するが完全防衛は失われた。残る赤TGTを撃墜せよ。",
        id: "sera-m01-bomber-breach-one"
      }
    },
    bomberFirstKillRadio: {
      speaker: "lark",
      priority: "NORMAL",
      text: "爆撃機1機撃墜！ そのまま赤を追って、RAVEN。",
      id: "sera-m01-bomber-first-down"
    },
    successRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "レン湾上空クリア。ROOK全機、帰投せよ。",
      id: "sera-m01-success"
    },
    failureRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "爆撃機2機が投弾線を突破。レン湾防空任務を中止、ROOKは離脱せよ。",
      id: "sera-m01-failure"
    },

    // Eleven minutes is the first tuning target. It is intentionally kept in
    // mission data so later playtest adjustment does not touch the host.
    parTime: 660,
    hasOutro: false,
    map: { x: 0.19, y: 0.28 },

    friendlyBase: {
      x: -2450,
      z: 5000,
      heading: 0,
      label: "REN BAY AIRPORT",
      failRadius: 520
    },
    battleCenter: { x: 0, z: 0 },
    battleRadius: 15000,

    briefing: "レン湾南方からエレム航空隊が接近中。\n最初の白いMiG-29は敵性だが非TGT。2機撃墜、または75秒の交戦で次段階へ移る。\n主目標は赤表示のTu-22M3が6機。3個編隊に分かれて空港へ侵入する。\n護衛のMiG-29は白表示だ。攻撃してくるが、全滅させる必要はない。\n赤い爆撃機を優先し、湾北西の軍民共用空港へ到達させるな。\n1機の投弾は任務続行、2機の投弾でMISSION FAILED。\nROOK 1 CROWNはF-15C、ROOK 3 LARKはF-16Cで同行する。",
    introRadio: [
      {
        speaker: "meridian",
        priority: "NORMAL",
        text: "ROOK、こちらMERIDIAN。レン湾へ進入、識別情報を送る。",
        id: "sera-m01-intro-meridian"
      },
      {
        speaker: "crown",
        priority: "NORMAL",
        text: "RAVEN、初日は俺たちの近くにいれば十分だ。手柄は赤い方に取っておけ。",
        id: "sera-m01-intro-crown"
      },
      {
        speaker: "lark",
        priority: "NORMAL",
        text: "湾の北に滑走路が見える。あそこまで爆撃機を通さなければいい。",
        id: "sera-m01-intro-lark"
      }
    ]
  };

  // Add-only registration is the isolation boundary: the legacy USA mission
  // remains addressable as `m01`, while Sera owns a distinct persistent key.
  ctx.addMission(mission);
}
