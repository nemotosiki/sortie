// Sera M19 TRUST FALL — ceasefire escort and intentional ARCA pursuit check.
export default function register(ctx) {
  const {
    MISSIONS, WORLD_PRESETS, AIRCRAFT_TYPES, ENEMY_AI_PROFILES,
    ENEMY_MISSILE_PROFILES
  } = ctx.tables;
  const world = WORLD_PRESETS.migalOuterSunset;
  if (!world) throw new Error("[sera-m19] migalOuterSunset is not registered");
  if (!MISSIONS.some((mission) => mission.key === "sera-m18" && mission.campaign === "sera")) {
    throw new Error("[sera-m19] sera-m18 predecessor is missing");
  }
  for (const type of ["f15c", "f15", "c17", "uav", "mig29", "su35", "s70", "su57", "jammer", "f3"]) {
    if (!AIRCRAFT_TYPES[type]) throw new Error(`[sera-m19] required aircraft is missing: ${type}`);
  }
  for (const type of ["mig29", "su35", "s70", "su57", "jammer", "f3"]) {
    if (!ENEMY_AI_PROFILES[type]) throw new Error(`[sera-m19] enemy profile is missing: ${type}`);
  }
  if (!ENEMY_MISSILE_PROFILES.f3) throw new Error("[sera-m19] hostile F-3 missile profile is missing");

  const anchors = world.missionAnchors;
  const m19TrustContract = Object.freeze({
    totalEscorts: 4,
    requiredDrones: 1,
    transportPrefix: "CEASEFIRE DELEGATION",
    dronePrefix: "ROOT DISTRIBUTION",
    attackerTag: "m19Attackers",
    arcaTag: "m19ArcaRetreat",
    escortRadius: 2600,
    pursuitKillsRequired: 2,
    cumulativeThreshold: 8,
    decisionHold: 12,
    arcaExit: Object.freeze([...anchors.arcaExit]),
    outcomes: Object.freeze({
      transportSafe: "ceasefireTransportSafe",
      dronesSaved: "rootDistributionDronesSaved",
      escortIntegrity: "m19EscortIntegrity",
      arcaKills: "arcaKillsThisMission",
      cumulativeArcaKills: "ravenArcaKills",
      finalPursuit: "ravenFinalPursuit",
      finalRoute: "seraFinalRoute"
    })
  });

  const mission = {
    key: "sera-m19",
    campaign: "sera",
    campaignOrder: 19,
    world: "migalOuterSunset",
    title: "TRUST FALL",
    jp: "停戦・復旧団の輸送機とROOT分散作業ドローンをミガル外環ノードまで護衛せよ。",
    act: 4,
    storyNo: 19,
    story: `WAR DAY 30。停戦は署名では終わらない。復旧団の人員と、政治側が管理する分散作業用ドローンを四評議会ノードへ運ぶ必要がある。
CROWNは新型機にも特別な復帰演出にも乗らず、古いF-15Cで青い編隊へ戻った。白いARCAは戦場を去ろうとしている。追う理由があるかを決めるのは命令ではなく、護衛半径から離れるRAVEN自身の航跡だ。`,
    epilogue: [
      "停戦輸送はミガル外環の分散ノードへ到達した。",
      "白いARCAを追った距離と撃墜数は、護衛戦果とは別の記録へ残された。",
      "RAVENは世界システムを操作していない。ただ政治側の作業が空で撃ち落とされないよう守った。"
    ],
    friendlies: {
      playerStart: { x: anchors.playerStart[0], y: 2600, z: anchors.playerStart[1], facing: { x: anchors.battleCenter[0], z: anchors.battleCenter[1] } },
      wingmen: [
        { type: "f15c", label: "CROWN", radioSpeaker: "crown", spw: "4aam", offset: { back: 135, side: -165, up: -10 } },
        { type: "f15", label: "ROOK 2 LARK", radioSpeaker: "lark", spw: "4aam", offset: { back: 120, side: 155, up: -14 } }
      ],
      transportGroups: [
        {
          aircraft: "c17", callsign: "CEASEFIRE DELEGATION", count: 1,
          vulnerable: true, hp: 660, speed: 108, altitude: 1850,
          start: { x: anchors.convoyStart[0], z: anchors.convoyStart[1] },
          exit: { x: anchors.convoyExit[0], z: anchors.convoyExit[1] }
        },
        {
          aircraft: "uav", callsign: "ROOT DISTRIBUTION", count: 3,
          vulnerable: true, hp: 260, speed: 108, altitude: 1770, spacing: 190,
          start: { x: anchors.convoyStart[0] + 280, z: anchors.convoyStart[1] + 260 },
          exit: { x: anchors.convoyExit[0] + 280, z: anchors.convoyExit[1] + 260 }
        }
      ],
      guard: {
        readout: "integrity", label: "TRUST CONVOY", lossPenalty: 1700, hitPenalty: 90,
        lossBanner: "RECOVERY AIRCRAFT LOST", failBanner: "CEASEFIRE FLIGHT LOST",
        lossRadio: "復旧団編隊に損失。残存機を護衛しろ、RAVEN。",
        failRadio: "停戦輸送を維持できない。TRUST FALL失敗、全機離脱。",
        safeRadio: "停戦輸送と分散作業機、外環ノードへ到達。護衛空域を閉じる。"
      }
    },
    sequence: [
      { types: ["jammer"], tgt: true, band: 1, idBase: 1930, label: "CEASEFIRE JAMMER", missionTag: "m19Attackers", role: "support", skill: "regular", purpose: "support", at: [...anchors.northIntercept], altitude: 5600, facing: [...anchors.convoyStart] },
      { types: ["mig29", "mig29", "mig29", "mig29"], tgt: true, concurrent: true, delay: 2, band: 1, idBase: 1940, label: "FULCRUM RAID 1", missionTag: "m19Attackers", role: "line", skill: "regular", hunt: "air", purpose: "hunt", at: [...anchors.westIntercept], altitude: 2300, facing: [...anchors.convoyStart] },
      { types: ["s70", "s70", "s70", "s70"], tgt: true, concurrent: true, delay: 28, band: 1, idBase: 1950, label: "HUNTER UCAV", missionTag: "m19Attackers", role: "evasive", skill: "regular", hunt: "air", purpose: "hunt", at: [...anchors.eastIntercept], altitude: 2800, facing: [...anchors.convoyStart] },
      { types: ["su35", "su35"], tgt: true, concurrent: true, delay: 58, band: 2, idBase: 1960, label: "FLANKER RAID 1", missionTag: "m19Attackers", role: "line", skill: "veteran", hunt: "air", purpose: "hunt", at: [9000, -2500], altitude: 3300, facing: [...anchors.battleCenter] },
      { types: ["mig29", "mig29"], tgt: true, concurrent: true, delay: 84, band: 2, idBase: 1970, label: "FULCRUM RAID 2", missionTag: "m19Attackers", role: "line", skill: "veteran", hunt: "air", purpose: "hunt", at: [...anchors.lowIntercept], altitude: 1900, facing: [...anchors.battleCenter] },
      { types: ["su35", "su35"], tgt: true, concurrent: true, delay: 112, band: 2, idBase: 1980, label: "FLANKER RAID 2", missionTag: "m19Attackers", role: "evasive", skill: "veteran", hunt: "air", purpose: "hunt", at: [-9200, -5600], altitude: 3600, facing: [...anchors.battleCenter] },
      { types: ["su57"], tgt: true, concurrent: true, delay: 142, band: 3, idBase: 1990, label: "CEASEFIRE BREAKER", missionTag: "m19Attackers", role: "evasive", skill: "ace", hunt: "air", purpose: "hunt", at: [0, -14600], altitude: 4300, facing: [...anchors.battleCenter] },
      { types: ["f3", "f3", "f3", "f3"], tgt: false, rankNeutral: true, concurrent: true, delay: 168, band: 3, idBase: 2000, label: "ARCA WITHDRAWAL", missionTag: "m19ArcaRetreat", role: "evasive", skill: "veteran", purpose: "withdraw", at: [...anchors.arcaEntry], altitude: 4100, facing: [...anchors.arcaExit] }
    ],
    m19TrustContract,
    fixedRadio: [
      { id: "m19_intro_01", at: 2, speaker: "meridian", priority: "NORMAL", text: "停戦・復旧団、ミガル外環回廊へ進入。護衛対象は輸送機一、作業ドローン三。" },
      { id: "m19_crown_return", at: 6, speaker: "crown", priority: "NORMAL", text: "CROWN、編隊へ復帰する。挨拶は着陸してからだ。輸送の右を受け持つ。" },
      { id: "m19_lark", at: 10, speaker: "lark", priority: "NORMAL", text: "久しぶりに三機だね。私は左、CROWNは右。RAVENは輸送の前へ。" },
      { id: "m19_arca", event: "m19ArcaWithdrawal", speaker: "meridian", priority: "URGENT", text: "撤退中のARCA四機が回廊を横断。交戦不要、停戦輸送から離れるな。" },
      { id: "m19_pursuit_warning", event: "m19PursuitWarning", speaker: "crown", priority: "CRITICAL", text: "RAVEN、護衛半径を外れている。白は去る。戻れ——今ならまだ護衛だ。" },
      { id: "m19_final_pursuit", event: "m19FinalPursuit", speaker: "meridian", priority: "CRITICAL", text: "白ARCA二機撃墜。RAVENは護衛半径外で追撃を継続している。" },
      { id: "m19_corridor_clear", event: "m19CorridorClear", speaker: "lark", priority: "NORMAL", text: "赤い迎撃隊は消えた。輸送は進んでる——白を追わず、このまま回廊を閉じよう。" }
    ],
    successRadio: { speaker: "meridian", priority: "CRITICAL", text: "停戦・復旧団の外環航路を確保。全機、ミガル中枢へ進め。", id: "m19-success" },
    failureRadio: { speaker: "meridian", priority: "CRITICAL", text: "停戦輸送機を喪失。復旧団の外環移送を中止、ROOKは離脱せよ。", id: "m19-failure" },
    parTime: 570,
    hasOutro: false,
    map: { x: 0.78, y: 0.12 },
    battleCenter: { x: anchors.battleCenter[0], z: anchors.battleCenter[1] },
    battleRadius: 21800,
    briefing: "停戦・復旧団のC-17一機と、政治側が管理するROOT分散作業ドローン三機をミガル外環ノードまで護衛せよ。右上に四機合算HPを表示する。これはRAVENが世界ROOTを所有・操作・返還する任務ではなく、政治側の分散作業を空から守る任務である。\n赤TGTはジャマー一、MiG-29A六、S-70四、Su-35四、重要なSu-57一。終盤に白いARCA F-3四が撤退航路を横断するがNON-TGT・ランク中立で、無視して完全クリアできる。\n白ARCA撃墜はravenArcaKillsへ加算する。ただし護衛半径2600mを離れて二機以上を撃墜した時だけravenFinalPursuitが成立する。累計八機以上かつ最終追撃成立でM20 GIBOR、それ以外はONE SHEM。選択ゲージやYES/NO表示は出さず、実際の飛行と攻撃で判定する。"
  };

  ctx.addMission(mission, { after: "sera-m18" });
}
