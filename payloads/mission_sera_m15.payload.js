// Sera M15 NIGHT OF NUMBERS — three-lane capital air defence.
// Bombers launch real, independently targetable cruise weapons. ARCA's blue
// opening flight leaves before a separate white F-3 pair enters the battle.
export default function register(ctx) {
  const { MISSIONS, WORLD_PRESETS, AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;
  const world = WORLD_PRESETS.migalCityNight;
  if (!world) throw new Error("[sera-m15] migalCityNight is not registered");
  if (!MISSIONS.some((mission) => mission.key === "sera-m14" && mission.campaign === "sera")) {
    throw new Error("[sera-m15] sera-m14 predecessor is missing");
  }
  for (const type of ["tu22m3", "su35", "jammer", "typhoon", "cruiseWeapon", "fa18", "f15c", "uav"]) {
    if (!AIRCRAFT_TYPES[type]) throw new Error(`[sera-m15] required aircraft missing: ${type}`);
  }
  for (const type of ["tu22m3", "su35", "jammer", "typhoon", "cruiseWeapon"]) {
    if (!ENEMY_AI_PROFILES[type]) throw new Error(`[sera-m15] required enemy profile missing: ${type}`);
  }

  const anchors = world.missionAnchors;
  const district = (id, label, at) => ({
    id, label, x: at[0], z: at[1], maxHealth: 100, hitRadius: 150
  });
  const wave = (types, options = {}) => ({
    types,
    tgt: options.tgt ?? true,
    rankNeutral: options.rankNeutral ?? false,
    concurrent: options.concurrent ?? true,
    delay: options.delay || 0,
    band: options.band || 2,
    idBase: options.idBase,
    label: options.label,
    missionTag: options.missionTag || "m15RedPackage",
    role: options.role || "line",
    skill: options.skill || "regular",
    facilityIndex: Number.isInteger(options.facilityIndex) ? options.facilityIndex : undefined,
    at: options.at,
    altitude: options.altitude,
    facing: options.facing,
    radio: options.radio,
    purpose: options.purpose,
    protectTag: options.protectTag,
    commitRange: options.commitRange,
    leashRange: options.leashRange,
    purposeAltitudeFloor: options.purposeAltitudeFloor
  });

  const m15CityContract = Object.freeze({
    jammerTag: "m15Jammer",
    redTag: "m15RedPackage",
    cruiseTag: "m15CruiseWeapon",
    cruiseType: "cruiseWeapon",
    whiteArcaTag: "arcaWhiteM15",
    whiteArcaDelay: 56,
    releaseRadius: 3300,
    cruiseSpeed: 210,
    cruiseDamage: 50,
    cruiseIdBase: 1590,
    cruiseEligibleIds: Object.freeze([1511, 1531, 1551, 1552]),
    districtIds: Object.freeze(["migal-military-root", "migal-power-district", "migal-hospital-district"]),
    jammer: Object.freeze({ falseContacts: 7 }),
    outcomes: Object.freeze({
      districtsSaved: "migalDistrictsSaved",
      militaryRootSafe: "migalMilitaryRootSafe",
      powerDistrictSafe: "migalPowerDistrictSafe",
      hospitalDistrictSafe: "migalHospitalDistrictSafe",
      cruiseLaunched: "cruiseWeaponsLaunched",
      cruiseIntercepted: "cruiseWeaponsIntercepted",
      cruiseImpacts: "cruiseWeaponImpacts",
      arcaKills: "arcaKillsThisMission",
      cumulativeArcaKills: "ravenArcaKills"
    })
  });

  const mission = {
    key: "sera-m15",
    campaign: "sera",
    campaignOrder: 15,
    world: "migalCityNight",
    title: "NIGHT OF NUMBERS",
    jp: "ミガル市街へ侵入する妨害機と三方向の爆撃編隊を迎撃し、軍事ROOT・発電区・中央医療区を防衛せよ。",
    act: 3,
    storyNo: 15,
    story: "WAR DAY 23。海面に映るミガルの灯を、三つの爆撃航路が同時に横切る。\n軍事ROOTは防空を、発電区は避難路を、病院区は今も続く手術を支えている。数字だけなら優先順位は簡単だった。",
    epilogue: [
      "ミガル上空の爆撃編隊は消え、残った灯が夜の海面へ戻った。",
      "MERIDIANは撃墜数より先に、軍事ROOT、発電区、病院区の生存を読み上げた。",
      "ARCAはもう青い同伴者ではなかった。だが白い機体を追うことは、まだ任務ではなかった。"
    ],
    friendlies: {
      playerStart: {
        x: anchors.playerStart[0], y: 1850, z: anchors.playerStart[1],
        facing: { x: anchors.battleCenter[0], z: anchors.battleCenter[1] }
      },
      wingmen: [
        { type: "fa18", label: "ROOK 2 LARK", radioSpeaker: "lark", spw: "aam4", offset: { back: 125, side: 150, up: -18 } }
      ],
      supportFlights: [
        {
          aircraft: "typhoon", callsign: "ARCA CIVIC WATCH", count: 2,
          vulnerable: false, enemyTargetable: false, combatSupport: true,
          combatTargetTypes: ["jammer", "tu22m3"], radioSpeaker: "pax",
          speed: 330, altitude: 3500, spacing: 360, holdAtExit: false,
          start: { x: anchors.arcaEntry[0], z: anchors.arcaEntry[1] },
          exit: { x: anchors.arcaExit[0], z: anchors.arcaExit[1] }
        },
        {
          aircraft: "f15c", callsign: "MIGAL SHIELD", count: 4,
          vulnerable: false, enemyTargetable: false, combatSupport: true,
          combatTargetTypes: ["tu22m3", "su35", "cruiseWeapon"],
          speed: 285, altitude: 2600, spacing: 300, holdAtExit: true,
          start: { x: -2600, z: -4700 }, exit: { x: 0, z: -9000 }
        },
        {
          aircraft: "uav", callsign: "OPHAN DEFENCE", count: 4,
          vulnerable: false, enemyTargetable: false, combatSupport: true,
          combatTargetTypes: ["cruiseWeapon"],
          speed: 190, altitude: 1500, spacing: 230, holdAtExit: true,
          start: { x: 2500, z: -5600 }, exit: { x: 0, z: -9000 }
        }
      ]
    },
    protectedFacilities: [
      district("migal-military-root", "MILITARY ROOT", anchors.militaryRoot),
      district("migal-power-district", "POWER DISTRICT", anchors.powerDistrict),
      district("migal-hospital-district", "CENTRAL HOSPITAL", anchors.hospitalDistrict)
    ],
    facilityContract: {
      rankCapAfterLoss: "A",
      failWhenAllLost: true,
      hitDamage: 50,
      lossRadio: { speaker: "lark", priority: "URGENT", text: "区画が一つ落ちた。残る灯を守る、次の巡航弾を探せ！", id: "m15-district-lost" }
    },
    sequence: [
      wave(["jammer"], {
        concurrent: false, band: 1, idBase: 1500, label: "BLACK COUNT",
        missionTag: "m15Jammer", at: [0, -4300], altitude: 4100, facing: [0, -9000],
        purpose: "support",
        radio: [
          { speaker: "meridian", priority: "CRITICAL", text: "妨害中継機を赤TGT指定。表示の分裂を止めてから爆撃航路を読む。", id: "m15-jammer-contact" }
        ]
      }),
      wave(["tu22m3", "tu22m3"], {
        concurrent: false, idBase: 1510, label: "ROOT LANE", facilityIndex: 0,
        purpose: "strike",
        at: anchors.northernLane, altitude: 2600, facing: anchors.militaryRoot,
        radio: [{ speaker: "meridian", priority: "CRITICAL", text: "三航路を確認。中央二機は軍事ROOT、西は発電区、東は中央病院へ向かう。", id: "m15-three-lanes" }]
      }),
      wave(["su35", "su35"], { tgt: false, rankNeutral: false, idBase: 1520, label: "ROOT ESCORT", purpose: "escort", protectTag: "m15RedPackage", commitRange: 5800, leashRange: 9400, at: [1600, -900], altitude: 3000, facing: anchors.militaryRoot }),
      wave(["tu22m3", "tu22m3"], { delay: 5, idBase: 1530, label: "POWER LANE", purpose: "strike", facilityIndex: 1, at: anchors.westernLane, altitude: 2300, facing: anchors.powerDistrict }),
      wave(["su35", "su35"], { tgt: false, rankNeutral: false, delay: 5, idBase: 1540, label: "POWER ESCORT", purpose: "escort", protectTag: "m15RedPackage", commitRange: 5800, leashRange: 9400, at: [-9400, -6600], altitude: 2850, facing: anchors.powerDistrict }),
      wave(["tu22m3", "tu22m3"], { delay: 10, idBase: 1550, label: "HOSPITAL LANE", purpose: "strike", facilityIndex: 2, at: anchors.easternLane, altitude: 2250, facing: anchors.hospitalDistrict }),
      wave(["su35", "su35"], { tgt: false, rankNeutral: false, delay: 10, idBase: 1560, label: "HOSPITAL ESCORT", purpose: "escort", protectTag: "m15RedPackage", commitRange: 5800, leashRange: 9400, at: [9500, -6100], altitude: 2850, facing: anchors.hospitalDistrict }),
      // Held by the M15 runtime until every blue ARCA object has retired.
      wave(["typhoon", "typhoon"], {
        tgt: false, rankNeutral: true, delay: 999, idBase: 1570,
        label: "ARCA ENFORCEMENT", missionTag: "arcaWhiteM15",
        purpose: "intercept",
        at: [-7200, -11100], altitude: 3600, facing: [0, -9000], skill: "expert",
        radio: [
          { speaker: "pax", priority: "URGENT", text: "ARCA執行機よりROOK。国際管理空域への武装進入を警告する。離脱しない場合は交戦する。", id: "m15-arca-white" },
          { speaker: "meridian", priority: "CRITICAL", text: "ROOK 1、ARCAとの交戦は任務外だ。爆撃主力を優先、追撃するな。", id: "m15-arca-priority" }
        ]
      })
    ],
    m15CityContract,
    fixedRadio: [
      { id: "m15-intro", at: 2, speaker: "meridian", priority: "NORMAL", text: "ROOK、ミガル市街防空へ移行。軍事ROOT、発電区、中央医療区を同時防衛する。" },
      { id: "m15-arca-blue", at: 8, speaker: "pax", priority: "NORMAL", text: "ARCA CIVIC WATCH、避難航空路の監視を終了する。国際協定に従い作戦空域を離脱する。" },
      { id: "m15-jammer-down", event: "m15JammerDown", speaker: "lark", priority: "CRITICAL", text: "妨害が消えた！ 三本の進路を確認、病院へ向かう編隊がいる！" },
      { id: "m15-cruise-launch", event: "m15CruiseLaunch", speaker: "meridian", priority: "URGENT", text: "巡航弾分離！ 低空の小型反応を迎撃せよ。母機撃墜だけでは止まらない。" },
      { id: "m15-first-intercept", event: "m15FirstCruiseIntercept", speaker: "lark", priority: "NORMAL", text: "巡航弾を一発落とした！ 爆撃機だけ見てたら街へ抜けるぞ！" }
    ],
    successRadio: { speaker: "meridian", priority: "CRITICAL", text: "敵打撃隊の反応消失。ミガル市街防空を達成、生存区画を確認して帰投せよ。", id: "m15-success" },
    failureRadio: { speaker: "meridian", priority: "CRITICAL", text: "三防衛区画すべて喪失。ミガル市街防空を中止する。", id: "m15-failure" },
    parTime: 520,
    hasOutro: false,
    map: { x: 0.52, y: 0.32 },
    battleCenter: { x: anchors.battleCenter[0], z: anchors.battleCenter[1] },
    battleRadius: 14200,
    briefing: "夜間のミガル市街へ侵入する妨害機一、Tu-22M3六、Su-35護衛六を迎撃せよ。最初に妨害中継機を破壊し、軍事ROOT・発電区・中央病院へ分かれる三航路を識別する。\n四機の爆撃機は市街手前で迎撃可能な巡航弾を分離する。発射後に母機を落としても巡航弾は消えず、HUD上の小型白色航空目標として区画へ飛び続ける。三区画全滅で任務失敗。\n序盤の青ARCA CIVIC WATCHは作戦空域から撤退する。後半の白ARCA Typhoon二機は別に出現する攻撃可能なNON-TGTで、任務達成にもランクにも不要。M15からRAVENのARCA撃墜数を作戦記録へ保存する。"
  };

  ctx.addMission(mission, { after: "sera-m14" });
}
