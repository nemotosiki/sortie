// Sera M17 THE LONG APPROACH — high-altitude bomber interception with red
// support TGTs and a separate, optional white HELIX pair.
export default function register(ctx) {
  const {
    MISSIONS, WORLD_PRESETS, AIRCRAFT_TYPES, ENEMY_AI_PROFILES,
    ENEMY_MISSILE_PROFILES, ACE_PROFILES
  } = ctx.tables;
  const world = WORLD_PRESETS.migalOuterHigh;
  if (!world) throw new Error("[sera-m17] migalOuterHigh is not registered");
  if (!MISSIONS.some((mission) => mission.key === "sera-m16" && mission.campaign === "sera")) {
    throw new Error("[sera-m17] sera-m16 predecessor is missing");
  }
  for (const type of ["fa18", "f22", "uav", "tu95", "tu22m3", "awacs", "jammer", "mig31", "f3", "su57"]) {
    if (!AIRCRAFT_TYPES[type]) throw new Error(`[sera-m17] required aircraft is missing: ${type}`);
  }
  for (const type of ["tu95", "tu22m3", "awacs", "jammer", "mig31", "f3", "su57"]) {
    if (!ENEMY_AI_PROFILES[type]) throw new Error(`[sera-m17] enemy profile is missing: ${type}`);
  }
  if (!ENEMY_MISSILE_PROFILES.f3) throw new Error("[sera-m17] hostile F-3 missile profile is missing");
  const aceBase = ACE_PROFILES.longbow || ACE_PROFILES.ironback;
  if (!aceBase) throw new Error("[sera-m17] ace profile template is missing");

  ctx.addAceProfile("helixForge", {
    ...aceBase,
    callsign: "FORGE",
    role: "HELIX 1 / ARCA Demonstrator Lead",
    behavior: "armored",
    evadeLateral: 58,
    evadeVertical: 32,
    evadeFrequency: 1.35,
    radarColor: "#f4f7fa",
    tracerColor: 0xcfe8f4,
    radio: {
      inbound: "ARCA F-3二機、HELIX 1 FORGEを確認。交戦は任意、爆撃隊を優先せよ。",
      wingman: "HELIXがこっちを向いた。でも任務は爆撃機を止めることだよ。",
      engage: "HELIX 1 FORGE。RAVEN、強い者ほど自分を止める理由を持つべきだ。",
      down: "FORGE被弾。SWIFT、追うな。赤主力の戦争に我々まで呑まれる。"
    }
  });
  ctx.addAceProfile("helixSwift", {
    ...aceBase,
    callsign: "SWIFT",
    role: "HELIX 2 / ARCA Demonstrator",
    behavior: "evasive",
    evadeLateral: 96,
    evadeVertical: 48,
    evadeFrequency: 2.35,
    radarColor: "#f4f7fa",
    tracerColor: 0xe6f5ff,
    radio: {
      inbound: "HELIX 2 SWIFT。F-3二番機はRAVENへ進路を向けた。",
      wingman: "挑発に乗るな、RAVEN。ミガルへ向かってる白い航跡は八本ある。",
      engage: "エース狩りなんだろ、RAVEN？ 追いつけるなら来て。",
      down: "SWIFT、機体を捨てる。……速さだけなら、まだ負けてない。"
    }
  });

  const anchors = world.missionAnchors;
  const m17ApproachContract = Object.freeze({
    bomberTag: "m17BomberMain",
    awacsTag: "m17RedAwacs",
    jammerTag: "m17RedJammer",
    helixTag: "arcaHelixM17",
    optionalTags: Object.freeze(["m17HighCover", "arcaHelixM17", "m17Prototype"]),
    lockMultiplierPerSupport: 0.55,
    cityFailAt: 3,
    outcomes: Object.freeze({
      cityHits: "migalOuterBombHits",
      awacsDestroyed: "m17AwacsDestroyed",
      jammerDestroyed: "m17JammerDestroyed",
      arcaKills: "arcaKillsThisMission",
      cumulativeArcaKills: "ravenArcaKills"
    })
  });

  const mission = {
    key: "sera-m17",
    campaign: "sera",
    campaignOrder: 17,
    world: "migalOuterHigh",
    title: "THE LONG APPROACH",
    jp: "ミガル北東高高度進入路で爆撃機八機と電子支援機を排除せよ。白いHELIXは任意目標。",
    act: 4,
    storyNo: 17,
    story: `WAR DAY 24。HOME FLEETと同時刻、八本の航跡がミガルへ伸びていた。
赤主力の外側から、ARCAの白いF-3二機がRAVENだけを選んで近づく。任務に必要なのは、強敵を狩ることではなく街へ届く航跡を消すことだ。`,
    epilogue: [
      "ミガル北東進入路から赤い爆撃反応が消えた。",
      "HELIXを追ったかどうかに関係なく、ARCAは戦場の外へ離脱した。",
      "RAVENの名声は命令権ではなく、必要な目標を選んだ判断として広がった。"
    ],
    friendlies: {
      playerStart: { x: anchors.playerStart[0], y: 7200, z: anchors.playerStart[1], facing: { x: anchors.battleCenter[0], z: anchors.battleCenter[1] } },
      wingmen: [
        { type: "fa18", label: "ROOK 2 LARK", radioSpeaker: "lark", spw: "4aam", offset: { back: 125, side: 150, up: -16 } }
      ],
      supportFlights: [
        { callsign: "MIGAL RAPTOR", aircraft: "f22", count: 2, vulnerable: false, enemyTargetable: true, combatSupport: true, combatTargetTypes: ["mig31", "su57", "f3"], start: { x: -1200, z: 8800 }, exit: { x: 0, z: -11800 }, altitude: 7600, speed: 330, spacing: 300, holdAtExit: true, radioSpeaker: "meridian" },
        { callsign: "OPHAN NODE", aircraft: "uav", count: 6, vulnerable: false, enemyTargetable: true, combatSupport: true, combatTargetTypes: ["tu95", "tu22m3", "mig31"], start: { x: 900, z: 7600 }, exit: { x: 0, z: -12200 }, altitude: 6900, speed: 245, spacing: 190, holdAtExit: true, radioSpeaker: "meridian" }
      ]
    },
    friendlyBase: { x: anchors.cityEdge[0], z: anchors.cityEdge[1], heading: 0, label: "MIGAL OUTER DISTRICT", style: "city", failRadius: 620 },
    bomberBreach: {
      failAt: 3,
      failBanner: "MIGAL OUTER DEFENCE COLLAPSED",
      hitRadio: { speaker: "meridian", priority: "CRITICAL", text: "爆撃がミガル外環へ着弾。三編隊を通せば防衛線は崩壊する。", id: "m17-city-hit" },
      farRadio: { speaker: "lark", priority: "URGENT", text: "爆撃隊が外環へ直進中！ HELIXじゃない、赤い大型機を優先！", id: "m17-city-far" },
      closeRadio: { speaker: "meridian", priority: "CRITICAL", text: "爆撃機、投弾線へ接近。ROOK 1、ただちに阻止せよ。", id: "m17-city-close" }
    },
    sequence: [
      {
        types: ["tu95", "tu95", "tu95", "tu95"], tgt: true, band: 1, idBase: 1710,
        label: "BEAR MAIN", missionTag: "m17BomberMain", role: "line", skill: "regular", purpose: "strike",
        at: [...anchors.bomberNorth], altitude: 6800, facing: [...anchors.cityEdge],
        radio: [{ speaker: "meridian", priority: "CRITICAL", text: "Tu-95四、Tu-22M3四。赤TGT八機、すべてミガル外環へ進行中。", id: "m17-main-contact" }]
      },
      {
        types: ["tu22m3", "tu22m3", "tu22m3", "tu22m3"], tgt: true, concurrent: true, delay: 2, band: 1, idBase: 1720,
        label: "BACKFIRE MAIN", missionTag: "m17BomberMain", role: "line", skill: "regular", purpose: "strike",
        at: [...anchors.bomberSouth], altitude: 6100, facing: [...anchors.cityEdge]
      },
      {
        types: ["awacs"], tgt: true, concurrent: true, delay: 0, band: 1, idBase: 1730,
        label: "RED AIR CONTROL", missionTag: "m17RedAwacs", role: "support", skill: "regular", purpose: "support",
        at: [...anchors.awacsStation], altitude: 7800, facing: [...anchors.cityEdge]
      },
      {
        types: ["jammer"], tgt: true, concurrent: true, delay: 0, band: 1, idBase: 1740,
        label: "RED JAMMER", missionTag: "m17RedJammer", role: "support", skill: "regular", purpose: "support",
        at: [...anchors.jammerStation], altitude: 7600, facing: [...anchors.cityEdge]
      },
      {
        types: ["mig31", "mig31"], tgt: false, concurrent: true, delay: 18, band: 1, idBase: 1750,
        label: "HIGH COVER", missionTag: "m17HighCover", role: "line", skill: "veteran", purpose: "escort", protectTag: "m17BomberMain", commitRange: 7200, leashRange: 12200, purposeAltitudeFloor: 7800,
        at: [...anchors.highCover], altitude: 9400, facing: [...anchors.battleCenter]
      },
      {
        types: ["f3"], ace: "helixForge", tgt: false, rankNeutral: true, concurrent: true, delay: 34, band: 2, idBase: 1760,
        label: "HELIX 1", missionTag: "arcaHelixM17", role: "evasive", skill: "ace", purpose: "intercept",
        at: [...anchors.helixEntry], altitude: 8200, facing: [...anchors.battleCenter]
      },
      {
        types: ["f3"], ace: "helixSwift", tgt: false, rankNeutral: true, concurrent: true, delay: 40, band: 2, idBase: 1770,
        label: "HELIX 2", missionTag: "arcaHelixM17", role: "evasive", skill: "ace", purpose: "intercept",
        at: [-9800, 800], altitude: 8500, facing: [...anchors.battleCenter]
      },
      {
        types: ["su57"], tgt: false, concurrent: true, delay: 112, band: 3, idBase: 1780,
        label: "PROTOTYPE COVER", missionTag: "m17Prototype", role: "evasive", skill: "ace", purpose: "interceptor",
        at: [...anchors.prototypeEntry], altitude: 7200, facing: [...anchors.battleCenter]
      }
    ],
    m17ApproachContract,
    fixedRadio: [
      { id: "m17_intro_01", at: 2, speaker: "meridian", priority: "NORMAL", text: "ROOK、ミガル北東進入路。高高度の航跡を敵爆撃隊と照合中。" },
      { id: "m17_intro_02", at: 7, speaker: "lark", priority: "NORMAL", text: "Ophan防衛ノードとRaptor隊が来てる。それでも爆撃機八機は私たちが止める。" },
      { id: "m17_jamming", at: 11, speaker: "meridian", priority: "URGENT", text: "敵AWACSとジャマーが照合を妨害。支援機が生きている間、ロック確定が遅れる。" },
      { id: "m17_support_one", event: "m17SupportOneDown", speaker: "meridian", priority: "NORMAL", text: "敵電子支援一機停止。爆撃隊の識別が安定し始めた。" },
      { id: "m17_support_clear", event: "m17SupportClear", speaker: "lark", priority: "NORMAL", text: "AWACSもジャマーも消えた！ 爆撃隊へのロックが戻った！" },
      { id: "m17_helix_warning", event: "m17HelixSpawn", speaker: "meridian", priority: "CRITICAL", text: "HELIXは任務目標ではない。自衛に限定し、爆撃隊を優先せよ。" }
    ],
    successRadio: { speaker: "meridian", priority: "CRITICAL", text: "赤爆撃隊と電子支援機、全機排除。ミガル北東進入路を確保した。", id: "m17-success" },
    failureRadio: { speaker: "meridian", priority: "CRITICAL", text: "爆撃隊がミガル外環へ侵入。北東防衛線崩壊、作戦中止。", id: "m17-failure" },
    parTime: 600,
    hasOutro: false,
    map: { x: 0.70, y: 0.13 },
    battleCenter: { x: anchors.battleCenter[0], z: anchors.battleCenter[1] },
    battleRadius: 21800,
    briefing: "ミガル北東高高度進入路でTu-95四・Tu-22M3四、敵AWACS一・ジャマー一を赤TGTとして排除せよ。爆撃を三回許すとMISSION FAILED。AWACSとジャマーは生存一機につき爆撃隊へのロック時間を55%延長する。\nMiG-31二、終盤のSu-57一は護衛の非TGT。Su-57を複数出して難易度を作らない。\nARCA HELIX 1 FORGE／HELIX 2 SWIFTは別編隊・白・NON-TGT・ランク中立。攻撃はしてくるが無視して赤TGTだけを落としても完全にクリアできる。撃墜した場合のみravenArcaKillsへ記録する。GIBORは異名であり、権限・指揮システム・兵器アクセスとして扱わない。"
  };
  ctx.addMission(mission, { after: "sera-m16" });
}
