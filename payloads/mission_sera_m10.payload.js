// Sera M10 LAST TRAIN — canonical dual-route mission payload.
//
// Three red cars make up the precision objective. The remaining train cars,
// bridge target, and bridge defences remain selectable white contacts. The
// host interprets `m10Contract` to resolve bridge destruction, escapes, radio,
// and the persistent result without making white contacts completion targets.
export default function register(ctx) {
  const {
    MISSIONS, WORLD_PRESETS, AIRCRAFT_TYPES, ENEMY_AI_PROFILES, GROUND_TYPES
  } = ctx.tables;

  const world = WORLD_PRESETS.norIndustrialDusk;
  if (!world) {
    throw new Error("[sera-m10] norIndustrialDusk is not registered; load map_norIndustrial first");
  }
  if (!MISSIONS.some((mission) => mission.key === "sera-m09" && mission.campaign === "sera")) {
    throw new Error("[sera-m10] sera-m09 predecessor is missing");
  }
  for (const type of ["fa18", "su34", "mig29"]) {
    if (!AIRCRAFT_TYPES[type]) throw new Error(`[sera-m10] required aircraft not registered: ${type}`);
  }
  for (const type of ["su34", "mig29"]) {
    if (!ENEMY_AI_PROFILES[type]) throw new Error(`[sera-m10] required enemy profile not registered: ${type}`);
  }
  for (const type of ["trainLoco", "trainFlak", "trainCar", "spaag"]) {
    if (!GROUND_TYPES[type]) throw new Error(`[sera-m10] required ground type not registered: ${type}`);
  }

  const railRoute = world.missionAnchors?.railRoute;
  if (!Array.isArray(railRoute) || railRoute.length < 4) {
    throw new Error("[sera-m10] Nor Industrial rail route is missing");
  }

  ctx.addGroundType("trainPower", {
    ...GROUND_TYPES.trainCar,
    key: "trainPower",
    label: "POWER CAR",
    role: "KEREN Mobile Power Car",
    hp: 118,
    radarColor: "#edf7ff"
  });

  ctx.addGroundModel("trainPower", {
    build(env) {
      const { geometry, add, dark, steel, light } = env;
      // Rail chassis and armoured equipment box.
      add(geometry.panel, dark, 0, 1.05, 0, 6.2, 1.0, 17.2);
      add(geometry.panel, steel, 0, 2.55, 0, 5.8, 2.2, 15.4);
      add(geometry.panel, light, 0, 4.05, 0, 5.4, 0.65, 14.8);
      // Twin transformer banks are the readable identity from above.
      for (const z of [-4.3, 4.3]) {
        add(geometry.panel, dark, 0, 4.65, z, 4.5, 1.1, 4.4);
        for (const x of [-1.55, -0.52, 0.52, 1.55]) {
          add(geometry.shipCylinder, steel, x, 5.55, z, 0.32, 1.05, 0.32);
        }
      }
      // Couplers and wheel bogies keep the custom body aligned with stock cars.
      for (const z of [-8.9, 8.9]) add(geometry.panel, dark, 0, 0.9, z, 1.0, 0.65, 1.2);
      for (const z of [-5.8, 5.8]) {
        add(geometry.panel, dark, -2.6, 0.65, z, 0.7, 1.3, 3.2);
        add(geometry.panel, dark, 2.6, 0.65, z, 0.7, 1.3, 3.2);
      }
    }
  });

  ctx.addGroundType("railBridgeControl", {
    ...GROUND_TYPES.trainCar,
    key: "railBridgeControl",
    label: "RAIL BRIDGE",
    role: "Strategic Rail Bridge Control Pier",
    hp: 196,
    hitRadius: 24,
    crash: Object.freeze({ halfLen: 8, halfBeam: 7, top: 8 }),
    hitBox: Object.freeze({ x: 15, y: 12, z: 17 }),
    smokeHeight: 9,
    mobile: null,
    radarColor: "#edf7ff"
  });

  ctx.addGroundModel("railBridgeControl", {
    build(env) {
      const { geometry, add, dark, steel, light } = env;
      // A reinforced control pier beside the decorator's bridge deck. Its
      // broad concrete base gives bombs and guns an honest physical target.
      add(geometry.panel, dark, 0, 1.4, 0, 14.5, 2.8, 16.0);
      add(geometry.panel, steel, 0, 4.5, 0, 11.8, 3.6, 12.4);
      add(geometry.panel, light, 0, 6.8, 0, 10.5, 1.0, 11.2);
      for (const x of [-4.6, 4.6]) {
        add(geometry.panel, dark, x, 8.1, 0, 1.2, 3.6, 10.0);
      }
      add(geometry.panel, steel, 0, 9.7, 0, 11.0, 0.8, 10.4);
    }
  });

  const m10Contract = Object.freeze({
    routes: Object.freeze({ bridge: "bridge", precision: "precision" }),
    precision: Object.freeze({
      mark: "m10Precision",
      targetIds: Object.freeze([201, 202, 205]),
      required: 3
    }),
    bridge: Object.freeze({
      mark: "m10Bridge",
      targetId: 290,
      decoratorNames: Object.freeze([
        "nor-rail-bridge-deck", "nor-rail-bridge-rails"
      ])
    }),
    cargo: Object.freeze({
      powerMark: "m10Power",
      powerIds: Object.freeze([203, 206]),
      materialMark: "m10Material",
      materialIds: Object.freeze([204, 207, 208])
    }),
    escape: Object.freeze({
      distanceTolerance: 18,
      criticalMark: "m10Precision",
      failEvent: "trainCriticalEscaped"
    }),
    outcomes: Object.freeze({
      route: "route",
      bridgeDestroyed: "bridgeDestroyed",
      powerCarsEscaped: "powerCarsEscaped",
      materialCarsEscaped: "materialCarsEscaped",
      trainCarsDestroyed: "trainCarsDestroyed",
      precisionTargetsDestroyed: "precisionTargetsDestroyed",
      civilianRailDisruption: "civilianRailDisruption"
    }),
    rank: Object.freeze({
      sTime: 620,
      aTime: 760,
      ignoreWhiteTargets: true,
      bridgeRouteCap: "A"
    })
  });

  const trainUnit = (id, type, pathOffset, mark, label, tgt) => ({
    id,
    type,
    label,
    path: railRoute,
    pathOffset,
    speed: 18,
    mark,
    missionRole: mark,
    tgt,
    rankNeutral: tgt === false
  });

  const mission = {
    key: "sera-m10",
    campaign: "sera",
    campaignOrder: 10,
    world: "norIndustrialDusk",
    title: "LAST TRAIN",
    jp: "ノル工業地帯を抜ける装甲列車を、アラド連絡線へ到達する前に停止させよ。",
    act: 2,
    storyNo: 10,
    story: "WAR DAY 108。KERENの電力設備と軍需資材を積んだ最後の列車が、ノル工業地帯を北東へ走る。\n橋を落とせば確実に止まる。橋を残すなら、機関車と高射車だけを動く列車から切り取らなければならない。",
    epilogue: [
      "装甲列車はアラド連絡線の手前で停止した。",
      "残った橋と貨車の数は、次の戦場でKERENが使える電力と、ノルの住民が渡れる道の数になる。",
      "MERIDIANは撃破数ではなく、選ばれた停止方法を作戦記録へ残した。"
    ],
    friendlies: {
      playerStart: {
        x: -6100,
        y: 1450,
        z: -5600,
        facing: { x: -4300, z: -3400 }
      },
      wingmen: [
        {
          type: "fa18",
          label: "ROOK 2 LARK",
          radioSpeaker: "lark",
          spw: "agm4",
          offset: { back: 115, side: 135, up: -12 }
        }
      ]
    },
    railLine: railRoute,
    railSpeed: 18,
    groundUnits: [
      trainUnit(201, "trainLoco", 220, "m10Precision", "ARMOURED LOCOMOTIVE", true),
      trainUnit(202, "trainFlak", 194, "m10Precision", "FLAK CAR 1", true),
      trainUnit(203, "trainPower", 168, "m10Power", "KEREN POWER 1", false),
      trainUnit(204, "trainCar", 142, "m10Material", "MATERIAL CAR 1", false),
      trainUnit(205, "trainFlak", 116, "m10Precision", "FLAK CAR 2", true),
      trainUnit(206, "trainPower", 90, "m10Power", "KEREN POWER 2", false),
      trainUnit(207, "trainCar", 64, "m10Material", "MATERIAL CAR 2", false),
      trainUnit(208, "trainCar", 38, "m10Material", "MATERIAL CAR 3", false),
      {
        id: 290,
        type: "railBridgeControl",
        label: "RAIL BRIDGE",
        x: 1210,
        z: 1660,
        heading: 2.46,
        tgt: false,
        rankNeutral: true,
        mark: "m10Bridge",
        missionRole: "bridge"
      },
      {
        id: 291,
        type: "spaag",
        label: "BRIDGE SPAAG 1",
        x: 760,
        z: 2110,
        heading: -0.72,
        tgt: false,
        rankNeutral: true,
        mark: "m10BridgeDefence"
      },
      {
        id: 292,
        type: "spaag",
        label: "BRIDGE SPAAG 2",
        x: 1670,
        z: 1190,
        heading: 2.42,
        tgt: false,
        rankNeutral: true,
        mark: "m10BridgeDefence"
      }
    ],
    sequence: [
      {
        types: ["su34", "su34"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        band: 2,
        idBase: 300,
        label: "FULLBACK STRIKE 1",
        role: "line",
        skill: "regular",
        at: [8600, -6200],
        altitude: 1500,
        facing: [2300, -1000],
        radio: [
          {
            speaker: "meridian",
            priority: "URGENT",
            text: "南東よりSu-34二。列車防空の増援だ。赤TGTへの攻撃を継続せよ。",
            id: "m10-su34-first"
          }
        ]
      },
      {
        types: ["su34", "su34"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        delay: 65,
        band: 2,
        idBase: 310,
        label: "FULLBACK STRIKE 2",
        role: "line",
        skill: "regular",
        at: [-7600, 7800],
        altitude: 1650,
        facing: [-900, 2400]
      },
      {
        types: ["mig29", "mig29"],
        tgt: false,
        rankNeutral: true,
        concurrent: true,
        delay: 135,
        band: 2,
        idBase: 320,
        label: "NOR CAP",
        role: "line",
        skill: "veteran",
        at: [8100, 7200],
        altitude: 2100,
        facing: [1800, 1800],
        radio: [
          {
            speaker: "lark",
            priority: "URGENT",
            text: "北東、MiG-29A二！ 列車が連絡線へ近づいてる、空戦に引き込まれるな！",
            id: "m10-mig29-cap"
          }
        ]
      }
    ],
    m10Contract,
    fixedRadio: [
      { id: "m10_intro_01", at: 2, speaker: "meridian", priority: "NORMAL", text: "ROOK、ノル工業地帯へ進入。装甲列車は北東のアラド連絡線へ移動中。" },
      { id: "m10_intro_02", at: 8, speaker: "lark", priority: "NORMAL", text: "赤は機関車と高射車二。白い貨車はKERENの電力設備と軍需資材だ。" },
      { id: "m10_intro_03", at: 14, speaker: "meridian", priority: "CRITICAL", text: "停止方法は二つ。赤TGT三両を精密破壊、または白表示の鉄道橋を破壊せよ。" },
      { id: "m10_bridge_warning", at: 21, speaker: "lark", priority: "NORMAL", text: "橋を落とせば早い。でもノルの輸送路も、戦後の復旧も一緒に失う。" },
      { id: "m10_bridge_down", event: "bridgeDestroyed", speaker: "meridian", priority: "CRITICAL", text: "鉄道橋崩落。列車停止を確認。周辺の民間鉄道は長期運休となる。" },
      { id: "m10_precision_clear", event: "precisionRoute", speaker: "lark", priority: "CRITICAL", text: "機関車と高射車、全て停止！ 橋は残った。白い貨車は追わなくていい。" },
      { id: "m10_power_escape", event: "trainPowerEscaped", speaker: "meridian", priority: "NORMAL", text: "KEREN電力車がアラド連絡線へ通過。後方電力への影響を記録する。" },
      { id: "m10_material_escape", event: "trainMaterialEscaped", speaker: "meridian", priority: "NORMAL", text: "軍需資材車が連絡線へ通過。残存物資として記録。" },
      { id: "m10_critical_escape", event: "trainCriticalEscaped", speaker: "meridian", priority: "CRITICAL", text: "装甲列車の中核車両がアラド連絡線を突破。阻止任務失敗。" }
    ],
    successRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "装甲列車停止。ROOK、ノル工業地帯から離脱せよ。選択結果を作戦記録へ送る。",
      id: "m10-success"
    },
    failureRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "列車はアラド連絡線を突破した。追撃を中止し、ノル上空から離脱せよ。",
      id: "m10-failure"
    },
    parTime: 620,
    hasOutro: false,
    map: { x: 0.63, y: 0.42 },
    battleCenter: { x: -150, z: 350 },
    battleRadius: 10800,
    briefing: "ノル工業地帯を北東へ走る八両編成の装甲列車を、アラド連絡線の手前で止めろ。\n赤TGTは機関車一、高射車二。三両を精密破壊すれば橋を残して任務完了となる。白い電力車二・資材車三は任意交戦で、撃破も逃走も任務達成を妨げない。\nもう一つの選択は、河川上の白い鉄道橋を破壊して列車を即時停止させること。ただし民間輸送と復旧へ長期の損害が残る。\nSu-34は二機ずつ二波、MiG-29A二機が後着する。全て白の任意交戦。橋周辺のSPAAG二両も任意交戦だ。"
  };

  ctx.addMission(mission, { after: "sera-m09" });
}
