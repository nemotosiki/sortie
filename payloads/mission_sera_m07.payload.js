// Sera M07 BLACK CURRENT — rescue escort and recovery-choice mission.
//
// M06 is the preceding sortie in the integrated Sera campaign.
export default function register(ctx) {
  const {
    MISSIONS, WORLD_PRESETS, AIRCRAFT_TYPES, ENEMY_AI_PROFILES, SHIP_TYPES
  } = ctx.tables;

  const world = WORLD_PRESETS.damarSeaStorm;
  if (!world) throw new Error("[sera-m07] damarSeaStorm is not registered; load map_damarSeaStorm first");
  if (!MISSIONS.some((mission) => mission.key === "sera-m06" && mission.campaign === "sera")) {
    throw new Error("[sera-m07] latest implemented Sera predecessor sera-m06 is missing");
  }
  for (const type of ["fa18", "e2d", "sarFlyingBoat", "su33", "mig31"]) {
    if (!AIRCRAFT_TYPES[type]) throw new Error(`[sera-m07] required aircraft not registered: ${type}`);
  }
  for (const type of ["su33", "mig31"]) {
    if (!ENEMY_AI_PROFILES[type]) throw new Error(`[sera-m07] required enemy profile not registered: ${type}`);
  }
  if (!SHIP_TYPES.missileBoat) throw new Error("[sera-m07] missileBoat ship type is missing");

  const sites = Object.freeze(world.missionAnchors.rescueSites.map((site) => Object.freeze({
    id: site.id,
    kind: site.kind,
    label: site.label,
    at: Object.freeze([...site.at])
  })));
  const m07RecoveryContract = Object.freeze({
    pickupRadius: 650,
    minimumAltitude: 18,
    maximumAltitude: 460,
    maximumSpeed: 430,
    sites,
    rescueFirst: Object.freeze({
      route: "rescue",
      requiredSurvivors: 3,
      expireSite: "data",
      banner: "RESCUE PRIORITY · DATA LOST"
    }),
    dataFirst: Object.freeze({
      route: "intel",
      requiredSurvivors: 2,
      expireSite: "crew-c",
      banner: "DATA SECURED · ONE BEACON LOST",
      reinforcement: Object.freeze({
        types: Object.freeze(["mig31", "mig31"]),
        label: "FOXHOUND INTERCEPT",
        at: Object.freeze([4300, 3400]),
        facing: Object.freeze([0, 0]),
        altitude: 2100,
        role: "line",
        skill: "veteran",
        idBase: 700
      })
    }),
    marks: Object.freeze({
      route: "m07Route",
      survivors: "m07SurvivorsRecovered",
      data: "damarDataRecovered",
      lostBeacon: "m07LostBeacon",
      crownEarly: "crown1Recovered"
    }),
    score: Object.freeze({ survivor: 900, data: 1200 }),
    rank: Object.freeze({
      sTime: 720,
      aTime: 900,
      sGuardLosses: 0,
      ignoreWhiteTargets: true
    }),
    epilogueByRoute: Object.freeze({
      rescue: Object.freeze([
        "三つの救難信号はすべて回収された。黒い記録球は嵐の底へ消えた。",
        "CROWNは早期に救助され、後方の病院へ移送された。",
        "次の空襲で使える敵配置図はない。それでも、帰投する席は一つ多かった。"
      ]),
      intel: Object.freeze([
        "敵無人機の記録球を回収し、次の攻撃に必要な航路データを確保した。",
        "一つの救難信号は消えた。CROWNを含む残る乗員は救助された。",
        "嵐の外では、失った一人より救える人数の計算がもう始まっていた。"
      ])
    })
  });

  const anchors = world.missionAnchors;
  const mission = {
    key: "sera-m07",
    campaign: "sera",
    campaignOrder: 7,
    world: "damarSeaStorm",
    title: "BLACK CURRENT",
    jp: "暴風雨のダマル西救難航路へ進出し、救難航空隊を守りながら人命または敵作戦データを回収せよ。",
    act: 2,
    storyNo: 7,
    story: "WAR DAY 068。RAVENは初めてROOK 1として、黒いダマル海へ入る。\n三つの救難光と一つの記録球。その全てを嵐から拾い上げる時間はない。",
    // The runtime substitutes route-specific lines from the recovery contract.
    epilogue: [
      "ダマル海の救難航路は確保された。",
      "回収したものと失ったものは、別々の報告書へ記録された。",
      "嵐は作戦終了後も、何事もなかったように海面を叩き続けた。"
    ],

    friendlies: {
      playerStart: {
        x: anchors.playerStart[0],
        y: 720,
        z: anchors.playerStart[1],
        facing: { x: 0, z: 0 }
      },
      wingmen: [
        {
          type: "fa18",
          label: "ROOK 2 LARK",
          radioSpeaker: "lark",
          offset: { back: 95, side: 110, up: -12 }
        }
      ],
      transportGroups: [
        {
          aircraft: "sarFlyingBoat",
          callsign: "SEALIGHT",
          count: 1,
          vulnerable: true,
          hp: 980,
          speed: 74,
          altitude: 260,
          start: { x: anchors.sarFlyingBoatStart[0], z: anchors.sarFlyingBoatStart[1] },
          exit: { x: anchors.sarFlyingBoatExit[0], z: anchors.sarFlyingBoatExit[1] }
        },
        {
          aircraft: "e2d",
          callsign: "MERIDIAN",
          count: 1,
          vulnerable: false,
          hp: 1200,
          speed: 112,
          altitude: 1550,
          start: { x: anchors.patrolStart[0], z: anchors.patrolStart[1] },
          exit: { x: anchors.patrolExit[0], z: anchors.patrolExit[1] }
        }
      ],
      guard: {
        readout: "count",
        label: "SAR",
        lossPenalty: 0,
        hitPenalty: 0,
        lossBanner: "RESCUE AIRCRAFT LOST",
        failBanner: "RESCUE OPERATION LOST",
        lossRadio: "SEALIGHT被撃墜！ 救難作業を続けられない！",
        failRadio: "救難航空隊を喪失。BLACK CURRENTを中止、ROOKは離脱せよ。",
        safeRadio: "SEALIGHT、救難航路を離脱。回収地点はROOKへ引き継ぐ。"
      }
    },

    sequence: [
      {
        types: ["su33", "su33", "su33", "su33"],
        band: 2,
        idBase: 0,
        label: "FLEET CAP",
        role: "line",
        skill: "regular",
        at: [...anchors.enemyCapEntry],
        altitude: 1450,
        facing: [0, 0],
        radio: [
          {
            speaker: "meridian",
            priority: "CRITICAL",
            text: "Su-33四機、救難航路へ接近。全機TGT指定。SEALIGHTを守れ。",
            id: "m07_contact_cap"
          }
        ]
      },
      {
        kind: "naval",
        fleet: ["missileBoat", "missileBoat"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        band: 1,
        idBase: 40,
        label: "MISSILE BOAT",
        at: [...anchors.missileBoats],
        facing: [0, 0],
        radio: [
          {
            speaker: "lark",
            priority: "NORMAL",
            text: "海面にミサイル艇二。白表示だ、回収を止める必要はない。",
            id: "m07_contact_boats"
          }
        ]
      }
    ],

    m07RecoveryContract,
    fixedRadio: [
      { id: "m07_intro_meridian", at: 2, speaker: "meridian", priority: "NORMAL", text: "ROOK、ダマル西救難航路へ進入。視程二千九百、雲底六百。" },
      { id: "m07_intro_lark", at: 8, speaker: "lark", priority: "NORMAL", text: "救難光が三つ。黒い記録球も海面に出てる。" },
      { id: "m07_choice_meridian", at: 14, speaker: "meridian", priority: "URGENT", text: "最初に接近した回収物を優先する。低空四百六十以下、半径六百五十へ入れ。" },
      { id: "m07_crown", event: "crownRecovered", speaker: "crown", priority: "URGENT", text: "……CROWN。聞こえる。RAVEN、今度はお前が先に帰れ。" },
      { id: "m07_data", event: "dataRecovered", speaker: "meridian", priority: "URGENT", text: "記録球を確保。敵配置データを受信——高速反応二、こちらへ向かう。" },
      { id: "m07_route_rescue", event: "rescueRouteLocked", speaker: "lark", priority: "URGENT", text: "人を先に拾う。記録球は捨てる——残りの光へ行こう。" },
      { id: "m07_route_intel", event: "intelRouteLocked", speaker: "lark", priority: "URGENT", text: "データを取った。……一つ消えた。残り二つは絶対に拾う。" },
      { id: "m07_recovery_complete", event: "recoveryComplete", speaker: "meridian", priority: "CRITICAL", text: "必要回収を完了。赤TGTを排除し、救難航空隊と離脱せよ。" }
    ],
    successRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "BLACK CURRENT完了。生存者と回収物を確認。ROOK、救難航空隊を伴い帰投せよ。",
      id: "m07-success"
    },
    failureRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "救難航空隊を喪失、またはROOKが作戦続行不能。BLACK CURRENTを中止する。",
      id: "m07-failure"
    },
    parTime: 720,
    hasOutro: false,
    map: { x: 0.63, y: 0.21 },
    battleCenter: { x: 0, z: 0 },
    battleRadius: 7600,
    briefing: "暴風雨のダマル西救難航路でSEALIGHT救難飛行艇を守り、海面の回収地点へ低空進入する。\n黄色のSOS三地点と青いDATA CAPSULE一地点。高度460以下・半径650以内の最初の通過が作戦方針を固定する。\nSOSを先に取れば三地点すべてを救助できるが、DATAは失われる。DATAを先に取れば一つのSOSが消え、MiG-31二機が増援される。\n赤TGTはSu-33四機。白いミサイル艇は妨害戦力であり、撃破は任意。選択した回収と赤TGT排除の両方で作戦完了。"
  };

  ctx.addMission(mission, { after: "sera-m06" });
}
