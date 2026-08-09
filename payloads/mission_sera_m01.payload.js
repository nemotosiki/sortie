// Sera M01 FIRST CONTACT — implementation checkpoint.
//
// This file intentionally lands before the host-side CROWN/LARK and radio-label
// extensions. It preserves the complete playable mission table replacement in
// GitHub first, so later work can be made in small verified commits.
//
// Development load order:
//   index.html?payloads=payloads/map_renBay.payload.js,payloads/mission_sera_m01.payload.js
//
// Current checkpoint contract:
//   - replaces the existing USA m01 in place
//   - uses the recovered `renBay` world
//   - 6 designated Tu-22M3 bombers (red TGT)
//   - 10 undesignated MiG-29 escorts (white hostile)
//   - reuses the existing bomber -> friendlyBase strike mechanic
//   - keeps the existing single friendly wingman until the next host commit
//   - keeps current command/wingman speaker channels until the radio-label commit
export default function register(ctx) {
  const { MISSIONS, WORLD_PRESETS, AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;

  if (!WORLD_PRESETS.renBay) {
    throw new Error("[sera-m01] renBay is not registered; load map_renBay first");
  }
  for (const type of ["tu22m3", "mig29"]) {
    if (!AIRCRAFT_TYPES[type] || !ENEMY_AI_PROFILES[type]) {
      throw new Error(`[sera-m01] required aircraft/profile not registered: ${type}`);
    }
  }

  const at = MISSIONS.findIndex((mission) => mission.key === "m01");
  if (at < 0) throw new Error("[sera-m01] stock m01 was not found");
  const original = MISSIONS[at];

  const replacement = {
    ...original,
    key: "m01",
    campaign: original.campaign || "usa",
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

    // TGT waves are sequential. Their escorts spawn concurrently and never
    // gate ACCOMPLISHED. 2+2+2 bombers and 4+2+4 escorts = 16 contacts total.
    sequence: [
      {
        types: ["tu22m3", "tu22m3"],
        band: 1,
        idBase: 0,
        label: "BACKFIRE",
        radio: [
          {
            speaker: "command",
            text: "ROOK、南方に爆撃機2。爆撃機をTGT指定。レン湾到達前に迎撃せよ。",
            id: "sera-m01-wave-1-command"
          }
        ]
      },
      {
        types: ["mig29", "mig29", "mig29", "mig29"],
        tgt: false,
        band: 1,
        idBase: 6,
        label: "ESCORT",
        concurrent: true,
        role: "trash",
        radio: [
          {
            speaker: "wingman",
            text: "護衛はこっちで見る。RAVEN、爆撃機よろしく。",
            id: "sera-m01-wave-1-crown"
          }
        ]
      },
      {
        types: ["tu22m3", "tu22m3"],
        band: 2,
        idBase: 2,
        label: "BACKFIRE",
        radio: [
          {
            speaker: "command",
            text: "東方に第2爆撃隊。新たに2機をTGT指定。",
            id: "sera-m01-wave-2-command"
          }
        ]
      },
      {
        types: ["mig29", "mig29"],
        tgt: false,
        band: 2,
        idBase: 10,
        label: "ESCORT",
        concurrent: true,
        role: "trash"
      },
      {
        types: ["tu22m3", "tu22m3"],
        band: 1,
        idBase: 4,
        label: "BACKFIRE",
        radio: [
          {
            speaker: "command",
            text: "南東、大型編隊。最後の爆撃機2、TGT指定。",
            id: "sera-m01-wave-3-command"
          }
        ]
      },
      {
        types: ["mig29", "mig29", "mig29", "mig29"],
        tgt: false,
        band: 1,
        idBase: 12,
        label: "ESCORT",
        concurrent: true,
        role: "trash",
        radio: [
          {
            speaker: "wingman",
            text: "護衛が増えたな。焦らなくていい、赤い方を見よう。",
            id: "sera-m01-wave-3-crown"
          }
        ]
      }
    ],

    // 11 minutes is the initial S-rank pace. This is intentionally provisional
    // until a human first-clear time is measured.
    parTime: 660,
    hasOutro: false,
    map: { x: 0.19, y: 0.28 },

    // The runway area on the north-west side of Ren Bay. Existing strike AI
    // flies designated bombers at this point and increments baseDamagePenalty
    // when a bomber reaches failRadius.
    friendlyBase: {
      x: -2450,
      z: 5000,
      heading: 0,
      label: "REN BAY AIRPORT",
      failRadius: 520
    },
    battleCenter: { x: 0, z: 0 },
    battleRadius: 15000,

    briefing: "レン湾南方からエレム爆撃隊が接近中。\n指定目標はTu-22M3が6機、3個編隊に分かれて侵入する。\n護衛のMiG-29は白表示の非TGTだ。攻撃してくるが、全滅させる必要はない。\n赤い爆撃機を優先し、湾北西の軍民共用空港へ到達させるな。\nROOK 1 CROWNとROOK 3 LARKが同行する。",
    introRadio: [
      {
        speaker: "command",
        text: "ROOK、こちらMERIDIAN。レン湾へ向かう複数編隊を捕捉した。識別を急ぐ。",
        id: "sera-m01-intro-meridian"
      },
      {
        speaker: "wingman",
        text: "RAVEN、初日は俺たちの近くにいれば十分だ。",
        id: "sera-m01-intro-crown"
      }
    ]
  };

  // addMission appends when `after` is omitted. Remove the stock entry, pass
  // the replacement through the normal normalizer, then move the normalized
  // result back to the original index so campaign order does not change.
  MISSIONS.splice(at, 1);
  try {
    const normalized = ctx.addMission(replacement);
    const appendedAt = MISSIONS.indexOf(normalized);
    if (appendedAt < 0) throw new Error("[sera-m01] normalized mission was not inserted");
    MISSIONS.splice(appendedAt, 1);
    MISSIONS.splice(at, 0, normalized);
  } catch (error) {
    MISSIONS.splice(at, 0, original);
    throw error;
  }
}
