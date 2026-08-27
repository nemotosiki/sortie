// Sera M18 HORN OF HEAVEN — KEREN subsystem boss and strategic-fire routes.
export default function register(ctx) {
  const {
    MISSIONS, WORLD_PRESETS, AIRCRAFT_TYPES, ENEMY_AI_PROFILES,
    HELI_TYPES, GROUND_TYPES
  } = ctx.tables;
  const world = WORLD_PRESETS.aradMountainsArchive;
  if (!world) throw new Error("[sera-m18] aradMountainsArchive is not registered");
  if (!MISSIONS.some((mission) => mission.key === "sera-m17" && mission.campaign === "sera")) {
    throw new Error("[sera-m18] sera-m17 predecessor is missing");
  }
  for (const type of ["f15", "ea18g", "b2", "a10", "mig29", "su57"]) {
    if (!AIRCRAFT_TYPES[type]) throw new Error(`[sera-m18] required aircraft is missing: ${type}`);
  }
  for (const type of ["mig29", "su57"]) {
    if (!ENEMY_AI_PROFILES[type]) throw new Error(`[sera-m18] enemy profile is missing: ${type}`);
  }
  if (!HELI_TYPES.ka52) throw new Error("[sera-m18] Ka-52 helicopter type is missing");
  for (const type of [
    "kerenGun", "kerenPylon", "kerenCooler", "kerenRadar", "kerenCore",
    "longRangeSam", "spaag"
  ]) {
    if (!GROUND_TYPES[type]) throw new Error(`[sera-m18] required ground type is missing: ${type}`);
  }

  const anchors = world.missionAnchors;
  const m18KerenContract = Object.freeze({
    routeMarks: Object.freeze({ radar: "m18Radar", power: "m18Power", direct: "m18Gun" }),
    routeRequired: Object.freeze({ radar: 2, power: 3, direct: 6 }),
    coolerMark: "m18Cooler",
    coreMark: "m18Core",
    corePhase: "m18CoreExposure",
    coreId: 1890,
    fire: Object.freeze({ initialDelay: 34, baseInterval: 48, failAt: 3 }),
    priorMission: Object.freeze({ key: "sera-m10", powerEscaped: "powerCarsEscaped", materialEscaped: "materialCarsEscaped" }),
    outcomes: Object.freeze({
      route: "kerenRoute",
      strategicHits: "kerenStrategicHits",
      civilianOutage: "aradCivilianBlackout",
      componentsDestroyed: "kerenComponentsDestroyed",
      coreDurability: "kerenCoreDurability",
      fleetDamage: "m20FleetDamageFromKeren"
    })
  });

  const gunPositions = [
    [-190, -2660], [190, -2660], [-190, -3370],
    [190, -3370], [-190, -4080], [190, -4080]
  ];
  const groundUnits = [
    ...gunPositions.map(([x, z], i) => ({
      id: 1810 + i, type: "kerenGun", label: `KEREN BARREL ${i + 1}`,
      x, z, heading: i % 2 ? -0.06 : 0.06, tgt: true,
      mark: "m18Gun", missionRole: "kerenGun"
    })),
    { id: 1820, type: "kerenPylon", label: "POWER PYLON NORTH", x: anchors.powerNorth[0], z: anchors.powerNorth[1], heading: 0, tgt: true, mark: "m18Power", missionRole: "kerenPower" },
    { id: 1821, type: "kerenPylon", label: "POWER PYLON MID", x: anchors.powerMid[0], z: anchors.powerMid[1], heading: 0, tgt: true, mark: "m18Power", missionRole: "kerenPower" },
    { id: 1822, type: "kerenPylon", label: "POWER PYLON SOUTH", x: anchors.powerSouth[0], z: anchors.powerSouth[1], heading: 0, tgt: true, mark: "m18Power", missionRole: "kerenPower" },
    { id: 1830, type: "kerenCooler", label: "CRYO COOLER WEST", x: anchors.coolerWest[0], z: anchors.coolerWest[1], heading: 0.1, tgt: true, mark: "m18Cooler", missionRole: "kerenCooler" },
    { id: 1831, type: "kerenCooler", label: "CRYO COOLER EAST", x: anchors.coolerEast[0], z: anchors.coolerEast[1], heading: -0.1, tgt: true, mark: "m18Cooler", missionRole: "kerenCooler" },
    { id: 1840, type: "kerenRadar", label: "TARGETING RADAR WEST", x: anchors.radarWest[0], z: anchors.radarWest[1], heading: 0.35, tgt: true, mark: "m18Radar", missionRole: "kerenRadar" },
    { id: 1841, type: "kerenRadar", label: "TARGETING RADAR EAST", x: anchors.radarEast[0], z: anchors.radarEast[1], heading: -0.35, tgt: true, mark: "m18Radar", missionRole: "kerenRadar" },
    { id: 1890, type: "kerenCore", label: "KEREN COMMAND CORE", x: anchors.commandCore[0], z: anchors.commandCore[1], heading: Math.PI, tgt: true, mark: "m18Core", missionRole: "kerenCore", phase: "m18CoreExposure" },

    // Air-defence contacts are dangerous but not part of the valid subsystem
    // route. A player may suppress them without being forced to clear the map.
    { id: 1850, type: "longRangeSam", label: "VALLEY SAM 1", x: -430, z: 850, heading: 0, tgt: false, rankNeutral: true, mark: "m18Defence", missionRole: "airDefence" },
    { id: 1851, type: "longRangeSam", label: "VALLEY SAM 2", x: 430, z: -450, heading: Math.PI, tgt: false, rankNeutral: true, mark: "m18Defence", missionRole: "airDefence" },
    { id: 1852, type: "longRangeSam", label: "VALLEY SAM 3", x: -430, z: -5050, heading: 0, tgt: false, rankNeutral: true, mark: "m18Defence", missionRole: "airDefence" },
    { id: 1853, type: "longRangeSam", label: "VALLEY SAM 4", x: 430, z: -5750, heading: Math.PI, tgt: false, rankNeutral: true, mark: "m18Defence", missionRole: "airDefence" },
    ...[-900, -200, 650, 1500, 2250, 3100].map((z, i) => ({
      id: 1860 + i, type: "spaag", label: `VALLEY SPAAG ${i + 1}`,
      x: i % 2 ? 360 : -360, z: -z, heading: i % 2 ? Math.PI : 0,
      tgt: false, rankNeutral: true, mark: "m18Defence", missionRole: "airDefence"
    }))
  ];

  const mission = {
    key: "sera-m18",
    campaign: "sera",
    campaignOrder: 18,
    world: "aradMountainsArchive",
    title: "HORN OF HEAVEN",
    jp: "アラド砲台峡谷へ侵入し、KERENの部位を無力化して山腹の指揮中枢を破壊せよ。",
    act: 4,
    storyNo: 18,
    story: `WAR DAY 27。小惑星迎撃用だった六門の電磁投射砲が、ミガルとセラ艦隊へ照準を向けた。
最初に落とした系統を味方はRAVENの攻略判断として採用する。速い停電か、照準の剥奪か、砲身への危険な直撃か。名声は命令権ではなく、他の操縦者がその判断へ機体を預ける理由になった。`,
    epilogue: [
      "KERENの指揮中枢は山腹から露出し、最後の照準信号とともに沈黙した。",
      "部位を落とした順番は、戦略砲の被害とアラド山岳都市の灯りへ別々に残った。",
      "CROWNは祝福せず、任務が終わった時にRAVENが地上へ戻れるかだけを訊いた。"
    ],
    friendlies: {
      playerStart: { x: anchors.playerStart[0], y: 920, z: anchors.playerStart[1], facing: { x: anchors.battleCenter[0], z: anchors.battleCenter[1] } },
      wingmen: [
        { type: "f15", label: "ROOK 2 LARK", radioSpeaker: "lark", spw: "agm4", offset: { back: 120, side: 138, up: -14 } }
      ],
      supportFlights: [
        { callsign: "HALO EW", aircraft: "ea18g", count: 1, vulnerable: false, enemyTargetable: true, combatSupport: false, start: { x: -2600, z: 4200 }, exit: { x: -1800, z: -6500 }, altitude: 4700, speed: 245, spacing: 220, holdAtExit: true, radioSpeaker: "meridian" },
        { callsign: "VEIL", aircraft: "b2", count: 2, vulnerable: false, enemyTargetable: false, combatSupport: false, start: { x: 2100, z: 5100 }, exit: { x: 1500, z: -7200 }, altitude: 5200, speed: 250, spacing: 310, holdAtExit: true, radioSpeaker: "meridian" },
        { callsign: "CHISEL", aircraft: "a10", count: 2, vulnerable: false, enemyTargetable: true, combatSupport: false, start: { x: -1000, z: 3500 }, exit: { x: 800, z: -5100 }, altitude: 720, speed: 155, spacing: 170, holdAtExit: true, radioSpeaker: "lark" }
      ]
    },
    groundPhaseContracts: [
      { id: "m18CoreExposure", activeInitially: false }
    ],
    groundUnits,
    sequence: [
      { types: ["ka52", "ka52"], tgt: false, rankNeutral: true, band: 1, idBase: 1870, label: "ALLIGATOR CANYON 1", missionTag: "m18AirDefence", role: "line", skill: "regular", purpose: "intercept", at: [...anchors.airNorth], altitude: 620, facing: [...anchors.battleCenter] },
      { types: ["mig29", "mig29"], tgt: false, rankNeutral: true, concurrent: true, delay: 18, band: 1, idBase: 1880, label: "FULCRUM VALLEY 1", missionTag: "m18AirDefence", role: "line", skill: "veteran", purpose: "cap", commitRange: 5200, leashRange: 9000, at: [...anchors.airSouth], altitude: 1800, facing: [...anchors.battleCenter] },
      { types: ["ka52", "ka52"], tgt: false, rankNeutral: true, concurrent: true, delay: 54, band: 2, idBase: 1900, label: "ALLIGATOR CANYON 2", missionTag: "m18AirDefence", role: "line", skill: "veteran", purpose: "intercept", at: [4500, -5000], altitude: 680, facing: [...anchors.battleCenter] },
      { types: ["mig29", "mig29"], tgt: false, rankNeutral: true, concurrent: true, delay: 84, band: 2, idBase: 1910, label: "FULCRUM VALLEY 2", missionTag: "m18AirDefence", role: "line", skill: "veteran", purpose: "cap", commitRange: 5600, leashRange: 9400, at: [-5200, -5600], altitude: 2200, facing: [...anchors.battleCenter] },
      { types: ["su57"], tgt: false, rankNeutral: true, concurrent: true, delay: 126, band: 3, idBase: 1920, label: "KEREN PROTOTYPE GUARD", missionTag: "m18Prototype", role: "evasive", skill: "ace", purpose: "interceptor", at: [...anchors.prototype], altitude: 3100, facing: [...anchors.battleCenter] }
    ],
    m18KerenContract,
    fixedRadio: [
      { id: "m18_intro_01", at: 2, speaker: "meridian", priority: "CRITICAL", text: "KEREN六砲身、電力塔三、冷却機二、照準レーダー二を確認。中枢は山腹内、現時点で攻撃不能。" },
      { id: "m18_intro_02", at: 8, speaker: "lark", priority: "NORMAL", text: "最初に壊した系統へ攻撃隊を合わせる。レーダー、電力、砲身——RAVENが進路を選んで。" },
      { id: "m18_route_radar", event: "m18RouteRadar", speaker: "meridian", priority: "URGENT", text: "照準系統を優先する。レーダー二基を破壊すれば中枢露出、KERENの命中率も低下する。" },
      { id: "m18_route_power", event: "m18RoutePower", speaker: "lark", priority: "URGENT", text: "電力塔へ進入する。三塔を止めれば充電は遅れる——ただし山岳都市と同じ送電線だ。" },
      { id: "m18_route_direct", event: "m18RouteDirect", speaker: "meridian", priority: "URGENT", text: "砲身へ直接進入。六門を破壊すれば、都市電力を残したまま中枢を露出できる。" },
      { id: "m18_first_fire", event: "m18FirstFire", speaker: "meridian", priority: "CRITICAL", text: "KEREN発射。着弾地点はミガル外環。あと二射は防衛線が持たない。" },
      { id: "m18_core_exposed", event: "m18CoreExposed", speaker: "lark", priority: "CRITICAL", text: "山腹開口、COMMAND COREを確認！ 中枢を破壊して！" },
      { id: "m18_crown", event: "m18CrownQuestion", speaker: "crown", priority: "NORMAL", text: "RAVEN、砲台は止まった。出口は南だ。帰ってこい。" }
    ],
    successRadio: { speaker: "meridian", priority: "CRITICAL", text: "KEREN COMMAND CORE消失。戦略砲、全照準を停止。HORN OF HEAVEN完了。", id: "m18-success" },
    failureRadio: { speaker: "meridian", priority: "CRITICAL", text: "KEREN戦略弾、第三着弾。ミガル外環と艦隊防衛線が崩壊、作戦中止。", id: "m18-failure" },
    parTime: 720,
    hasOutro: false,
    map: { x: 0.82, y: 0.20 },
    battleCenter: { x: anchors.battleCenter[0], z: anchors.battleCenter[1] },
    battleRadius: 11800,
    briefing: "アラド山地のKERENを部位破壊せよ。最初に破壊した系統で攻略方針が固定される。照準レーダー二基なら砲撃命中率低下、電力塔三基なら充電間隔延長と民間停電、砲身六門なら最も危険だが都市電力を維持する。条件達成後に山腹から露出するCOMMAND COREが最終赤TGT。\n冷却機二基は中枢耐久と発射間隔を下げる補助TGT。長距離SAM四、SPAAG六、Ka-52四、MiG-29A四は任意の防空戦力。Su-57は重要な護衛一機だけで、複数エリート機による水増しはしない。\nM10で逃したKEREN電力貨車は砲撃間隔、資材貨車は中枢耐久へ反映される。GIBORは異名にすぎず、RAVENへ世界権限は与えられない。"
  };

  ctx.addMission(mission, { after: "sera-m17" });
}
