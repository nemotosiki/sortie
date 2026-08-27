// Sera M20 THE GUARANTOR — final defence and the silent GIBOR coda.
export default function register(ctx) {
  const {
    MISSIONS, WORLD_PRESETS, AIRCRAFT_TYPES, ENEMY_AI_PROFILES, ACE_PROFILES
  } = ctx.tables;
  const world = WORLD_PRESETS.migalCoreDawn;
  if (!world) throw new Error("[sera-m20] migalCoreDawn is not registered");
  if (!MISSIONS.some((mission) => mission.key === "sera-m19" && mission.campaign === "sera")) {
    throw new Error("[sera-m20] sera-m19 predecessor is missing");
  }
  const required = ["f15c", "f15", "tu22m3", "jammer", "mig29", "su35", "s70", "su57"];
  for (const type of required) {
    if (!AIRCRAFT_TYPES[type]) throw new Error(`[sera-m20] required aircraft is missing: ${type}`);
    if (!["f15c", "f15"].includes(type) && !ENEMY_AI_PROFILES[type]) {
      throw new Error(`[sera-m20] enemy profile is missing: ${type}`);
    }
  }
  if (!ENEMY_AI_PROFILES.f15c || !ENEMY_AI_PROFILES.f15) {
    throw new Error("[sera-m20] hostile CROWN/LARK profiles are missing");
  }
  const aceBase = ACE_PROFILES.longbow || ACE_PROFILES.ironback;
  if (!aceBase) throw new Error("[sera-m20] ace profile template is missing");

  // Both profiles inherit ordinary F-15 durability at spawn. Their only
  // advantage is pilot behaviour: CROWN holds pressure, LARK brackets wide.
  // Radio fields exist for the registry schema but M20 suppresses every radio
  // path before these dynamically spawned profiles can engage or die.
  ctx.addAceProfile("m20Crown", {
    ...aceBase,
    callsign: "CROWN",
    role: "ROOK veteran / pressure lead",
    behavior: "evasive",
    evadeLateral: 52,
    evadeVertical: 24,
    evadeFrequency: 1.45,
    radarColor: "#ff4f5e",
    tracerColor: 0xff6f64,
    radio: { inbound: "", wingman: "", engage: "", down: "" }
  });
  ctx.addAceProfile("m20Lark", {
    ...aceBase,
    callsign: "LARK",
    role: "ROOK 2 / wide flanker",
    behavior: "evasive",
    evadeLateral: 104,
    evadeVertical: 44,
    evadeFrequency: 2.15,
    radarColor: "#ff4f5e",
    tracerColor: 0xff7d68,
    radio: { inbound: "", wingman: "", engage: "", down: "" }
  });

  const anchors = world.missionAnchors;
  const m20FinalContract = Object.freeze({
    sourceMission: "sera-m19",
    routeField: "seraFinalRoute",
    pursuitField: "ravenFinalPursuit",
    cumulativeField: "ravenArcaKills",
    cumulativeThreshold: 8,
    phaseOneTag: "m20FinalDefence",
    bossTag: "m20RookFinal",
    silenceDuration: 3,
    freeFlightDuration: 4,
    crown: Object.freeze({ id: 20901, friendlyLabel: "CROWN", type: "f15c", ace: "m20Crown" }),
    lark: Object.freeze({ id: 20902, friendlyLabel: "ROOK 2 LARK", type: "f15", ace: "m20Lark" }),
    outcomes: Object.freeze({
      route: "seraFinalRoute",
      fakeAccomplished: "m20FakeAccomplished",
      bossDuel: "m20BossDuel",
      crownNeutralized: "m20CrownNeutralized",
      larkNeutralized: "m20LarkNeutralized",
      noHostileHold: "m20NoHostileHold",
      ending: "seraCampaignEnding"
    })
  });

  const mission = {
    key: "sera-m20",
    campaign: "sera",
    campaignOrder: 20,
    world: "migalCoreDawn",
    title: "THE GUARANTOR",
    jp: "ミガル中枢上空へ侵入した最後の攻撃隊を排除し、停戦発効を保証せよ。",
    act: 4,
    storyNo: 20,
    story: `WAR DAY 31。停戦発効まで残りわずか。エレム・ケデム混成の最終攻撃隊は、四評議会とOPHAN中枢を一度の空襲で折るためミガルへ向かった。
ROOKはRAVEN、CROWN、LARKの三機で最後の防空線へ上がる。ここで守るのはROOTの所有権ではない。翌朝を戦争の続きにしないための、ただ一つの空域だ。`,
    epilogue: [
      "ミガル中枢への最終攻撃隊は消滅し、停戦発効の時刻を迎えた。",
      "OPHANは一人の権限ではなく、四評議会と分散された政治責任の下に残った。",
      "RAVENが保証したのは世界の所有ではない。戦争を終わらせるための空だった。"
    ],
    friendlies: {
      playerStart: { x: anchors.playerStart[0], y: 3200, z: anchors.playerStart[1], facing: { x: anchors.battleCenter[0], z: anchors.battleCenter[1] } },
      wingmen: [
        { type: "f15c", label: "CROWN", radioSpeaker: "crown", spw: "4aam", offset: { back: 138, side: -170, up: -8 } },
        { type: "f15", label: "ROOK 2 LARK", radioSpeaker: "lark", spw: "4aam", offset: { back: 122, side: 165, up: -12 } }
      ]
    },
    sequence: [
      { types: ["jammer", "jammer"], tgt: true, band: 1, idBase: 2010, label: "FINAL EW SCREEN", missionTag: "m20FinalDefence", role: "support", skill: "veteran", at: [...anchors.northLane], altitude: 6100, facing: [...anchors.battleCenter] },
      { types: ["tu22m3", "tu22m3", "tu22m3", "tu22m3"], tgt: true, concurrent: true, delay: 3, band: 2, idBase: 2020, label: "CAPITAL STRIKE", missionTag: "m20FinalDefence", role: "line", skill: "veteran", at: [0, 16400], altitude: 5200, facing: [...anchors.councilRing] },
      { types: ["mig29", "mig29", "mig29", "mig29", "mig29", "mig29"], tgt: true, concurrent: true, delay: 18, band: 1, idBase: 2030, label: "FULCRUM WALL", missionTag: "m20FinalDefence", role: "line", skill: "veteran", at: [...anchors.westLane], altitude: 3300, facing: [...anchors.battleCenter] },
      { types: ["su35", "su35", "su35", "su35", "su35", "su35"], tgt: true, concurrent: true, delay: 44, band: 2, idBase: 2040, label: "FLANKER PINCER", missionTag: "m20FinalDefence", role: "evasive", skill: "veteran", at: [...anchors.eastLane], altitude: 4100, facing: [...anchors.battleCenter] },
      { types: ["s70", "s70", "s70", "s70"], tgt: true, concurrent: true, delay: 72, band: 1, idBase: 2050, label: "HUNTER SCREEN", missionTag: "m20FinalDefence", role: "evasive", skill: "veteran", at: [...anchors.southLane], altitude: 2900, facing: [...anchors.councilRing] },
      { types: ["su57", "su57"], tgt: true, concurrent: true, delay: 104, band: 2, idBase: 2060, label: "LAST GUARANTORS", missionTag: "m20FinalDefence", role: "evasive", skill: "ace", at: [...anchors.highLane], altitude: 5600, facing: [...anchors.battleCenter] }
    ],
    m20FinalContract,
    fixedRadio: [
      { id: "m20_intro", at: 2, speaker: "meridian", priority: "URGENT", text: "停戦発効まで、この一波を通すな。ミガル中枢へ向かう侵入機をすべて阻止せよ。" },
      { id: "m20_crown", at: 6, speaker: "crown", priority: "NORMAL", text: "CROWN、左を取る。RAVENは中央、LARKは右を頼む。" },
      { id: "m20_lark", at: 10, speaker: "lark", priority: "NORMAL", text: "了解。爆撃機から切る。後方は見るよ。" },
      { id: "m20_bombers", at: 20, speaker: "meridian", priority: "CRITICAL", text: "Tu-22M3四、OPHAN中枢へ進入。ジャマーを落とし、爆撃線を崩せ。" },
      { id: "m20_felon", at: 106, speaker: "crown", priority: "URGENT", text: "高空にSu-57二機。散開する、RAVENは先頭を。" }
    ],
    successRadio: { speaker: "meridian", priority: "CRITICAL", text: "ミガル中枢空域クリア。停戦発効を確認。ROOK、帰投せよ。", id: "m20-success" },
    failureRadio: { speaker: "meridian", priority: "CRITICAL", text: "ミガル中枢防空線が崩壊。停戦保証不能、残存機は離脱せよ。", id: "m20-failure" },
    parTime: 690,
    hasOutro: false,
    map: { x: 0.82, y: 0.08 },
    battleCenter: { x: anchors.battleCenter[0], z: anchors.battleCenter[1] },
    battleRadius: 22800,
    briefing: "ミガル中枢へ侵入する最終攻撃隊を全滅させ、停戦発効を保証せよ。CROWNはF-15C、LARKはF-15Eで青編隊に参加する。赤TGTはジャマー二、Tu-22M3四、MiG-29A六、Su-35六、S-70四、Su-57二の計24機。Su-57は二機を上限とし、物量は通常機と複合任務圧力で作る。\nM19で成立した航跡だけが終幕を分ける。ONE SHEMでは通常戦闘の完了後に三機とも帰投する。GIBORでは同じ通常目標を排除した後に一度MISSION ACCOMPLISHEDが表示されるが、デブリーフへは移らない。以降の変化に説明無線・選択画面・強制カメラはない。"
  };

  ctx.addMission(mission, { after: "sera-m19" });
}
