// Sera M14 BREAKWATER — open-ocean amphibious-capacity interdiction.
export default function register(ctx) {
  const {
    MISSIONS, WORLD_PRESETS, AIRCRAFT_TYPES, ENEMY_AI_PROFILES, HELI_TYPES, SHIP_TYPES
  } = ctx.tables;
  const world = WORLD_PRESETS.naharMudflats;
  if (!world) throw new Error("[sera-m14] naharMudflats is not registered");
  if (!MISSIONS.some((mission) => mission.key === "sera-m13" && mission.campaign === "sera")) {
    throw new Error("[sera-m14] sera-m13 predecessor is missing");
  }
  if (!AIRCRAFT_TYPES.fa18) throw new Error("[sera-m14] F/A-18F wingman type is missing");
  if (!AIRCRAFT_TYPES.su33 || !ENEMY_AI_PROFILES.su33) {
    throw new Error("[sera-m14] Su-33 air contact is missing");
  }
  if (!HELI_TYPES.ka52) throw new Error("[sera-m14] Ka-52 helicopter type is missing");
  for (const type of ["lhd", "landingShip", "aegis", "frigate", "missileBoat", "hospitalShip"]) {
    if (!SHIP_TYPES[type]) throw new Error(`[sera-m14] required ship type is missing: ${type}`);
  }
  const anchors = world.missionAnchors;
  const m14LandingContract = Object.freeze({
    objectiveShipIds: Object.freeze([1411, 1412, 1413, 1414, 1415]),
    landingShipIds: Object.freeze([1412, 1413, 1414, 1415]),
    assaultTag: "m14AssaultCapacity",
    screenTag: "m14EscortScreen",
    airTag: "m14CarrierAir",
    routeSpeed: 16,
    escapeFailAt: 2,
    rankCapAfterEscape: "A",
    outcomes: Object.freeze({
      assaultShipsStopped: "assaultShipsStopped",
      landingShipsEscaped: "landingShipsEscaped",
      landingShipsBeached: "landingShipsBeached",
      landedArmorSpawned: "landedArmorSpawned",
      hospitalShipSafe: "hospitalShipSafe"
    })
  });

  const mission = {
    key: "sera-m14",
    campaign: "sera",
    campaignOrder: 14,
    world: "naharMudflats",
    title: "BREAKWATER",
    jp: "ナハル西方外洋で上陸能力を持つ艦を識別し、移送線へ到達する前に阻止せよ。",
    act: 3,
    storyNo: 14,
    story: "WAR DAY 20。ハドールへ医療物資が向かう同じ時刻、エレム上陸群はナハル西方外洋を二縦隊で進む。\n白い病院船MERCYも戦域を横切る。互いの司令部が見ているのは同じ海だが、ROOKに必要なのは意図の断定ではない。上陸能力を示す赤TGTだけを、沖合移送線の手前で止めることだ。",
    epilogue: [
      "上陸群は海岸線を見る前に継続能力を失い、ナハル西側の防衛線は時間を得た。",
      "護衛艦と艦載機はなお海上に残る。それでも、岸へ運ぶ艦がなければ橋頭堡は作れない。",
      "病院船MERCYは両軍の航跡を横切り、どちらの説明にも回収されない白い船影を残した。"
    ],
    friendlies: {
      playerStart: {
        x: anchors.playerStart[0], y: 1450, z: anchors.playerStart[1],
        facing: { x: anchors.battleCenter[0], z: anchors.battleCenter[1] }
      },
      wingmen: [
        { type: "fa18", label: "ROOK 2 LARK", radioSpeaker: "lark", spw: "asm", offset: { back: 120, side: 145, up: -14 } }
      ],
      ships: {
        callsign: "MERCY",
        hull: "hospitalShip",
        count: 1,
        vulnerable: false,
        hp: 588,
        start: { x: anchors.hospitalStart[0], z: anchors.hospitalStart[1] },
        exit: { x: anchors.hospitalExit[0], z: anchors.hospitalExit[1] },
        spacing: 320
      }
    },
    // This is an offshore transfer boundary, not a drawable airfield or beach.
    // Landing-capacity hulls steer toward it; crossing it resolves that hull as
    // escaped. The HUD directive owns the warning, so no blue base marker is drawn.
    friendlyBase: {
      x: anchors.transferLine[0], z: anchors.transferLine[1], heading: 0,
      label: "AMPHIBIOUS TRANSFER LINE", style: "interdiction", failRadius: 440,
      hidden: true, hudHidden: true
    },
    sequence: [
      {
        kind: "naval",
        fleet: ["lhd", "landingShip", "landingShip"],
        tgt: true, idBase: 1410, band: 1, label: "ELEM ASSAULT NORTH",
        missionTag: "m14AssaultCapacity",
        at: [...anchors.assaultNorthEntry], facing: [...anchors.transferLine], spacing: 430,
        radio: [
          { speaker: "meridian", priority: "CRITICAL", text: "北縦隊、LHD一・LST二を赤TGT指定。護衛艦は白だ。移送線へ届く前に上陸能力を止めろ。", id: "m14-assault-north" }
        ]
      },
      {
        kind: "naval",
        fleet: ["aegis", "frigate", "missileBoat", "missileBoat"],
        tgt: false, rankNeutral: true, concurrent: true, delay: 2,
        idBase: 1420, band: 1, label: "ELEM NORTH SCREEN",
        missionTag: "m14EscortScreen",
        at: [5000, 2650], facing: [...anchors.transferLine], spacing: 560
      },
      {
        kind: "naval",
        fleet: ["landingShip", "landingShip"],
        tgt: true, concurrent: true, delay: 48,
        idBase: 1413, band: 2, label: "ELEM ASSAULT SOUTH",
        missionTag: "m14AssaultCapacity",
        at: [...anchors.assaultSouthEntry], facing: [...anchors.transferLine], spacing: 460,
        radio: [
          { speaker: "lark", priority: "URGENT", text: "南にもLST二！ 一列じゃない、挟むように入ってくる。赤TGTを分担しよう。", id: "m14-assault-south" }
        ]
      },
      {
        kind: "naval",
        fleet: ["frigate", "missileBoat", "missileBoat"],
        tgt: false, rankNeutral: true, concurrent: true, delay: 50,
        idBase: 1424, band: 2, label: "ELEM SOUTH SCREEN",
        missionTag: "m14EscortScreen",
        at: [6500, -2550], facing: [...anchors.transferLine], spacing: 540
      },
      {
        types: ["su33", "su33"], tgt: false, rankNeutral: true, concurrent: true,
        missionTag: "m14CarrierAir", delay: 24, band: 1, idBase: 1430,
        label: "SEA FLANKER 1", role: "line", skill: "regular",
        purpose: "cap", protectTag: "m14AssaultCapacity", commitRange: 7000, leashRange: 12800,
        at: [...anchors.northCapEntry], altitude: 2400, facing: [...anchors.battleCenter]
      },
      {
        types: ["ka52", "ka52"], tgt: false, rankNeutral: true, concurrent: true,
        missionTag: "m14CarrierAir", delay: 62, band: 2, idBase: 1440,
        label: "ALLIGATOR 1", role: "line", skill: "regular",
        purpose: "intercept",
        at: [2500, -4300], altitude: 480, facing: [...anchors.battleCenter]
      },
      {
        types: ["su33", "su33"], tgt: false, rankNeutral: true, concurrent: true,
        missionTag: "m14CarrierAir", delay: 86, band: 2, idBase: 1450,
        label: "SEA FLANKER 2", role: "line", skill: "veteran",
        purpose: "cap", protectTag: "m14AssaultCapacity", commitRange: 7400, leashRange: 13200,
        at: [...anchors.southCapEntry], altitude: 2700, facing: [...anchors.battleCenter]
      },
      {
        types: ["ka52", "ka52"], tgt: false, rankNeutral: true, concurrent: true,
        missionTag: "m14CarrierAir", delay: 118, band: 2, idBase: 1460,
        label: "ALLIGATOR 2", role: "line", skill: "veteran",
        purpose: "intercept",
        at: [-600, 3900], altitude: 520, facing: [...anchors.battleCenter]
      },
      {
        types: ["su33", "su33"], tgt: false, rankNeutral: true, concurrent: true,
        missionTag: "m14CarrierAir", delay: 146, band: 3, idBase: 1470,
        label: "SEA FLANKER 3", role: "line", skill: "veteran",
        purpose: "relief",
        at: [10400, 400], altitude: 2900, facing: [...anchors.battleCenter],
        radio: [{ speaker: "lark", priority: "URGENT", text: "Su-33増援。白だが放置すればこちらを押さえに来る——赤TGTへの進路だけは渡さないで。", id: "m14-final-cap" }]
      }
    ],
    m14LandingContract,
    fixedRadio: [
      { id: "m14_intro_01", at: 2, speaker: "meridian", priority: "NORMAL", text: "ROOK、ナハル西方アプローチへ進入。海岸はまだ水平線の向こうだ。" },
      { id: "m14_intro_02", at: 8, speaker: "meridian", priority: "CRITICAL", text: "赤TGTはLHDとLSTのみ。白の護衛は脅威だが、撃破必須ではない。上陸能力を優先せよ。" },
      { id: "m14_intro_03", at: 15, speaker: "lark", priority: "NORMAL", text: "病院船MERCYが南北に横断中。敵が寄せたのか偶然かは分からない。青い船影は射線から外す。" },
      { id: "m14_first_escape", event: "m14FirstEscape", speaker: "meridian", priority: "URGENT", text: "上陸艦一隻が移送線を突破。任務は続行するが完全阻止評価は失われた。次は通すな。" },
      { id: "m14_capacity_stopped", event: "m14CapacityStopped", speaker: "lark", priority: "CRITICAL", text: "上陸能力を止めた！ 護衛は残っていても橋頭堡は作れない。離脱しよう。" }
    ],
    failureRadio: { speaker: "meridian", priority: "CRITICAL", text: "上陸艦二隻が移送線を突破。ナハル沿岸への投入を止められない。作戦失敗、離脱せよ。", id: "m14-failure" },
    successRadio: { speaker: "meridian", priority: "CRITICAL", text: "上陸群の継続能力を無力化。ナハル西側は防衛準備時間を確保した。ROOK、帰投せよ。", id: "m14-success" },
    parTime: 520,
    hasOutro: false,
    map: { x: 0.73, y: 0.28 },
    battleCenter: { x: anchors.battleCenter[0], z: anchors.battleCenter[1] },
    battleRadius: 19600,
    briefing: "ナハル西方外洋を進む二つの上陸縦隊を迎撃し、LHD一・LST四の赤TGTを沖合移送線の手前で阻止せよ。1隻の突破では任務を続行するが評価はA以下、2隻突破で作戦失敗となる。\nイージス艦・フリゲート・ミサイル艇、Su-33六、Ka-52四は白の護衛脅威であり撃破必須ではない。Ka-52は上陸目標ではなく、プレイヤーを妨害する低優先度接触として扱う。\n病院船MERCYは青い非戦闘船で、選択・ロック・攻撃候補に入らない。上陸能力の阻止で任務達成し、クリア後にF-35Cの購入が解禁される。"
  };

  ctx.addMission(mission, { after: "sera-m13" });
}
