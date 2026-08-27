// Sera M14 BREAKWATER — amphibious interception with per-LST beach spawns.
export default function register(ctx) {
  const {
    MISSIONS, WORLD_PRESETS, AIRCRAFT_TYPES, ENEMY_AI_PROFILES, HELI_TYPES, SHIP_TYPES, GROUND_TYPES
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
  for (const type of ["lhd", "landingShip", "missileBoat", "hospitalShip"]) {
    if (!SHIP_TYPES[type]) throw new Error(`[sera-m14] required ship type is missing: ${type}`);
  }
  for (const type of ["tank", "spaag"]) {
    if (!GROUND_TYPES[type]) throw new Error(`[sera-m14] required ground type is missing: ${type}`);
  }
  const anchors = world.missionAnchors;
  const m14LandingContract = Object.freeze({
    landingShipIds: Object.freeze([1412, 1413, 1414, 1415]),
    landingTag: "m14LandingFleet",
    airTag: "m14CarrierAir",
    groundMark: "m14LandedArmor",
    groundIdBase: 1490,
    outcomes: Object.freeze({
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
    jp: "ナハル西岸へ接近する上陸群を海上で阻止し、接岸した装甲部隊を排除せよ。",
    act: 3,
    storyNo: 14,
    story: "WAR DAY 20。同じ時刻、ハドールへ物資が向かう裏で、ナハル西岸へ上陸群が入る。\n白い病院船が同じ水路を横切る。赤TGTだけを見て撃てばよい——それでも対艦ミサイルの爆煙は白い船体を隠す。",
    epilogue: [
      "ナハル西岸の上陸群は無力化され、干潟の防衛線は残った。",
      "接岸を許した艦の数だけ、海ではなく砂浜に残骸が増えた。",
      "病院船は戦闘空域を抜け、救難灯を消さずに航海を続けた。"
    ],
    friendlies: {
      playerStart: {
        x: anchors.playerStart[0], y: 1250, z: anchors.playerStart[1],
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
    friendlyBase: {
      x: anchors.beachhead[0], z: anchors.beachhead[1], heading: 0,
      label: "NAHAR WEST DEFENCE LINE", style: "beach", failRadius: 470
    },
    sequence: [
      {
        kind: "naval",
        fleet: ["lhd", "landingShip", "landingShip", "landingShip", "landingShip", "missileBoat", "missileBoat", "missileBoat", "missileBoat"],
        tgt: true, idBase: 1410, band: 1, label: "ELEM ASSAULT GROUP",
        missionTag: "m14LandingFleet", at: [...anchors.assaultEntry], facing: [...anchors.beachhead], spacing: 520,
        radio: [
          { speaker: "meridian", priority: "CRITICAL", text: "強襲揚陸艦一、LST四、ミサイル艇四。全艦赤TGT、接岸前に数を減らせ。", id: "m14-assault-group" }
        ]
      },
      {
        types: ["su33", "su33"], tgt: true, concurrent: true, missionTag: "m14CarrierAir",
        delay: 22, band: 1, idBase: 1430, label: "SEA FLANKER 1", role: "line", skill: "regular",
        purpose: "cap", protectTag: "m14LandingFleet", commitRange: 5800, leashRange: 9800,
        at: [...anchors.northCapEntry], altitude: 2100, facing: [...anchors.battleCenter]
      },
      {
        types: ["ka52", "ka52"], tgt: true, concurrent: true, missionTag: "m14CarrierAir",
        delay: 54, band: 2, idBase: 1440, label: "ALLIGATOR 1", role: "line", skill: "regular",
        purpose: "intercept",
        at: [2200, -3800], altitude: 420, facing: [...anchors.beachhead]
      },
      {
        types: ["su33", "su33"], tgt: true, concurrent: true, missionTag: "m14CarrierAir",
        delay: 78, band: 2, idBase: 1450, label: "SEA FLANKER 2", role: "line", skill: "veteran",
        purpose: "cap", protectTag: "m14LandingFleet", commitRange: 6000, leashRange: 10200,
        at: [...anchors.southCapEntry], altitude: 2400, facing: [...anchors.battleCenter]
      },
      {
        types: ["ka52", "ka52"], tgt: true, concurrent: true, missionTag: "m14CarrierAir",
        delay: 112, band: 2, idBase: 1460, label: "ALLIGATOR 2", role: "line", skill: "veteran",
        purpose: "intercept",
        at: [-1200, 3600], altitude: 460, facing: [...anchors.beachhead]
      },
      {
        types: ["su33", "su33"], tgt: true, concurrent: true, missionTag: "m14CarrierAir",
        delay: 138, band: 3, idBase: 1470, label: "SEA FLANKER 3", role: "line", skill: "veteran",
        purpose: "relief",
        at: [9800, 500], altitude: 2600, facing: [...anchors.battleCenter],
        radio: [{ speaker: "lark", priority: "URGENT", text: "Su-33最終隊！ 艦載機を片付けて、砂浜へ上がった装甲を潰す！", id: "m14-final-cap" }]
      }
    ],
    m14LandingContract,
    fixedRadio: [
      { id: "m14_intro_01", at: 2, speaker: "meridian", priority: "NORMAL", text: "ROOK、ナハル西岸へ到着。上陸群は干潟水路を西進中。" },
      { id: "m14_intro_02", at: 8, speaker: "lark", priority: "CRITICAL", text: "病院船MERCYが航路を横断中。青い船体を射線に入れないで。" },
      { id: "m14_first_beach", event: "m14FirstBeach", speaker: "meridian", priority: "URGENT", text: "LST接岸、ランプ開放。戦車とSPAAGを赤TGTへ追加、海上群への攻撃も継続せよ。" },
      { id: "m14_all_afloat_stopped", event: "m14AfloatStopped", speaker: "lark", priority: "CRITICAL", text: "海上の上陸艦は止めた！ 残る赤TGTは砂浜と艦載機だけだ。" }
    ],
    successRadio: { speaker: "meridian", priority: "CRITICAL", text: "上陸群、艦載隊、接岸装甲を排除。ナハル西岸を確保した。ROOK、帰投せよ。", id: "m14-success" },
    parTime: 480,
    hasOutro: false,
    map: { x: 0.73, y: 0.28 },
    battleCenter: { x: anchors.battleCenter[0], z: anchors.battleCenter[1] },
    battleRadius: 16400,
    briefing: "ナハル西岸へ接近する強襲揚陸艦一、LST四、ミサイル艇四を海上で阻止せよ。LSTは接岸すると停止し、戦車六・SPAAG二を順次砂浜へ展開する。接岸前に沈めた艦から地上部隊は出ない。\nSu-33六は上陸群の艦載航空隊、Ka-52四は海岸制圧隊で、すべて赤TGT。海上・航空・接岸地上の全赤TGT排除で任務達成。\n病院船MERCYは青い友軍扱いで、ターゲット選択・ロック・攻撃候補に一切入らない。白い軍艦として出すのではなく、最初から最後まで保護対象の航行船として識別せよ。M14クリア後、F-35Cの購入が解禁される。"
  };

  ctx.addMission(mission, { after: "sera-m13" });
}
