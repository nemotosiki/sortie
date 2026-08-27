// Sera M11 FROZEN EYE — high-altitude cyclic-jamming base strike.
//
// HALO 1–3 are electronic-support aircraft suppressing the Ver Ice Coast
// base's missile fire-control radars. RAVEN descends to destroy every red base
// node while the jamming window is open, then climbs above 9,000 m during each
// short radar-online interval. High MiG-31s are white secondary contacts.
export default function register(ctx) {
  const {
    MISSIONS,
    WORLD_PRESETS,
    AIRCRAFT_TYPES,
    ENEMY_AI_PROFILES,
    ENEMY_MISSILE_PROFILES,
    ACE_PROFILES,
    GROUND_TYPES
  } = ctx.tables;

  const world = WORLD_PRESETS.verIceCoast;
  if (!world) throw new Error("[sera-m11] verIceCoast is not registered; load map_verIceCoast first");
  if (!MISSIONS.some((mission) => mission.key === "sera-m10" && mission.campaign === "sera")) {
    throw new Error("[sera-m11] sera-m10 predecessor is missing");
  }
  for (const type of ["fa18", "jammer", "mig29", "mig31", "typhoon"]) {
    if (!AIRCRAFT_TYPES[type]) throw new Error(`[sera-m11] required aircraft not registered: ${type}`);
  }
  for (const type of ["mig29", "mig31"]) {
    if (!ENEMY_AI_PROFILES[type]) {
      throw new Error(`[sera-m11] required enemy profile not registered: ${type}`);
    }
  }
  if (!ACE_PROFILES.longbow) throw new Error("[sera-m11] LONG BOW ace template is missing");
  for (const type of ["radarSite", "bunker", "fuelTank", "samSite", "aaGun", "mobileSam"]) {
    if (!GROUND_TYPES[type]) throw new Error(`[sera-m11] required ground type not registered: ${type}`);
  }
  if (!ENEMY_MISSILE_PROFILES.mobileSam) {
    throw new Error("[sera-m11] required mobileSam missile profile is missing");
  }

  const anchors = world.missionAnchors;
  for (const key of [
    "playerStart", "strikeStart", "strikeExit", "battleCenter",
    "northIntercept", "southIntercept", "baseCapEntry", "coastQraEntry",
    "inlandQraEntry", "arcaWatchStart", "arcaWatchExit", "weatherStation"
  ]) {
    if (!Array.isArray(anchors?.[key]) || anchors[key].length !== 2) {
      throw new Error(`[sera-m11] Ver Ice Coast mission anchor is missing: ${key}`);
    }
  }

  // M11's red board is a functioning installation rather than ten stock props
  // scattered over snow. Each custom kind keeps the combat role and durability
  // of the stock object it replaces, while giving guns, missiles and the HUD a
  // distinct physical silhouette to read from above.
  ctx.addGroundType("m11FireControlRadar", {
    ...GROUND_TYPES.radarSite,
    key: "m11FireControlRadar",
    label: "FIRE CONTROL RADAR",
    role: "Frozen Eye Phased-Array Fire-Control Radar",
    hp: 70,
    hitRadius: 31,
    crash: Object.freeze({ halfLen: 14, halfBeam: 11, top: 14 }),
    hitBox: Object.freeze({ x: 24, y: 16, z: 27 }),
    smokeHeight: 10,
    dishSpin: 0.42
  });

  ctx.addGroundModel("m11FireControlRadar", {
    build(env) {
      const { THREE, geometry, add, addRoot, dark, steel, olive, light } = env;
      add(geometry.panel, olive, 0, 0.65, 0, 25, 1.3, 22);
      add(geometry.panel, steel, 0, 3.3, 3.2, 16, 4.8, 11);
      add(geometry.panel, dark, 0, 6.4, 3.2, 13.5, 1.4, 9.5);
      add(geometry.panel, steel, 0, 8.2, -2.8, 2.2, 6.8, 2.2);
      add(geometry.panel, dark, -8.8, 2.0, 4.7, 4.2, 2.6, 5.4);
      add(geometry.panel, dark, 8.8, 2.0, 4.7, 4.2, 2.6, 5.4);
      const pivot = new THREE.Group();
      pivot.position.set(0, 12.2, -2.8);
      const array = new THREE.Mesh(geometry.shipOctPlate, light);
      array.scale.set(7.4, 0.75, 6.4);
      array.rotation.x = -0.28;
      pivot.add(array);
      const rear = new THREE.Mesh(geometry.panel, dark);
      rear.position.set(0, -0.8, 1.3);
      rear.scale.set(1.2, 1.2, 3.8);
      pivot.add(rear);
      addRoot(pivot);
      return { dish: pivot };
    }
  });

  ctx.addGroundType("m11ControlStation", {
    ...GROUND_TYPES.bunker,
    key: "m11ControlStation",
    label: "BASE CONTROL STATION",
    role: "Frozen Eye Hardened Operations Centre",
    hp: 120,
    hitRadius: 36,
    crash: Object.freeze({ halfLen: 17, halfBeam: 15, top: 12 }),
    hitBox: Object.freeze({ x: 29, y: 13, z: 33 }),
    smokeHeight: 10
  });

  ctx.addGroundModel("m11ControlStation", {
    build({ geometry, add, dark, steel, olive, light }) {
      add(geometry.panel, dark, 0, 1.0, 0, 31, 2.0, 35);
      add(geometry.panel, olive, 0, 4.2, 0, 25, 5.0, 29);
      add(geometry.panel, steel, 0, 7.2, 1.5, 21, 1.2, 24);
      add(geometry.panel, light, 0, 8.3, -2.5, 13, 1.0, 12);
      add(geometry.panel, dark, 0, 4.0, -15.0, 8.0, 4.0, 3.0);
      for (const x of [-9, 9]) {
        add(geometry.shipCylinder, steel, x, 9.3, 4.5, 0.7, 4.0, 0.7);
        add(geometry.panel, light, x, 11.7, 4.5, 2.6, 0.5, 2.6);
      }
    }
  });

  ctx.addGroundType("m11PowerPlant", {
    ...GROUND_TYPES.fuelTank,
    key: "m11PowerPlant",
    label: "POWER PLANT",
    role: "Frozen Eye Diesel Generator Plant",
    hp: 58,
    hitRadius: 29,
    crash: Object.freeze({ halfLen: 15, halfBeam: 12, top: 10 }),
    hitBox: Object.freeze({ x: 27, y: 11, z: 24 }),
    smokeHeight: 9,
    chain: null
  });

  ctx.addGroundModel("m11PowerPlant", {
    build({ geometry, add, dark, steel, olive, light }) {
      add(geometry.panel, olive, 0, 0.65, 0, 29, 1.3, 25);
      for (const x of [-8.5, 0, 8.5]) {
        add(geometry.panel, steel, x, 3.0, 0, 6.5, 4.2, 16);
        add(geometry.panel, dark, x, 5.4, 1.0, 5.6, 0.8, 13.5);
        add(geometry.shipCylinder, dark, x + 1.8, 7.8, 4.5, 0.65, 5.5, 0.65);
      }
      add(geometry.panel, light, 0, 2.0, -10.5, 23, 2.2, 2.5);
    }
  });

  ctx.addGroundType("m11FuelFarm", {
    ...GROUND_TYPES.fuelTank,
    key: "m11FuelFarm",
    label: "MISSILE FUEL FARM",
    role: "Frozen Eye Missile Fuel Farm",
    hp: 54,
    hitRadius: 31,
    crash: Object.freeze({ halfLen: 15, halfBeam: 13, top: 13 }),
    hitBox: Object.freeze({ x: 29, y: 14, z: 26 }),
    smokeHeight: 11
  });

  ctx.addGroundModel("m11FuelFarm", {
    build({ geometry, add, dark, steel, olive, light }) {
      add(geometry.panel, olive, 0, 0.65, 0, 30, 1.3, 27);
      for (const [x, z] of [[-8, -6], [8, -6], [-8, 7], [8, 7]]) {
        add(geometry.shipCylinder, steel, x, 4.6, z, 4.3, 8.0, 4.3);
        add(geometry.shipCylinder, light, x, 8.8, z, 3.8, 0.7, 3.8);
      }
      add(geometry.panel, dark, 0, 1.9, -12.0, 24, 2.0, 1.6);
      add(geometry.panel, dark, 0, 1.9, 13.0, 24, 2.0, 1.6);
    }
  });

  // The stock AD TANK is an autocannon vehicle only. M11's two outer pickets
  // are genuine SHORAD launchers, so they receive the ordinary short-range
  // mobile-SAM round under their own type key. Their perimeterDefence role is
  // intentionally not baseSam; radar-online enhancement cannot match them.
  ctx.addGroundType("m11Shorad", {
    ...GROUND_TYPES.mobileSam,
    key: "m11Shorad",
    label: "PERIMETER SHORAD",
    role: "Frozen Eye Short-Range Mobile SAM",
    hp: 76,
    hitRadius: 20,
    crash: Object.freeze({ halfLen: 6.5, halfBeam: 4, top: 5.2 }),
    hitBox: Object.freeze({ x: 10, y: 8, z: 14 }),
    smokeHeight: 5,
    dishSpin: 0.82
  });
  ctx.addEnemyMissileProfile("m11Shorad", {
    ...ENEMY_MISSILE_PROFILES.mobileSam
  });
  ctx.addGroundModel("m11Shorad", {
    build(env) {
      const { THREE, geometry, add, addRoot, dark, steel, olive, light } = env;
      // Tracked chassis, compact turret and two twin canister packs.
      add(geometry.panel, dark, -3.4, 1.0, 0, 1.7, 2.0, 12.5);
      add(geometry.panel, dark, 3.4, 1.0, 0, 1.7, 2.0, 12.5);
      add(geometry.panel, olive, 0, 2.0, 0, 7.4, 2.2, 12.0);
      add(geometry.panel, steel, 0, 4.0, 0.8, 6.2, 2.0, 5.8);
      for (const side of [-1, 1]) {
        for (const level of [0, 1]) {
          add(geometry.panel, level ? steel : dark,
            side * 2.0, 5.1 + level * 1.15, -1.8,
            1.45, 0.95, 6.8, -0.22);
        }
      }
      const pivot = new THREE.Group();
      pivot.position.set(0, 6.0, 3.0);
      const plate = new THREE.Mesh(geometry.shipOctPlate, light);
      plate.scale.set(2.2, 0.3, 2.2);
      plate.rotation.x = -0.7;
      pivot.add(plate);
      addRoot(pivot);
      return { dish: pivot };
    }
  });

  ctx.addAceProfile("granite", {
    ...ACE_PROFILES.longbow,
    callsign: "GRANITE",
    role: "WARDEN 1 / Air Defence Lead",
    behavior: "armored",
    evadeLateral: 34,
    evadeVertical: 18,
    evadeFrequency: 1.25,
    radarColor: "#e9edf2",
    tracerColor: 0xe9edf2,
    theme: {
      ...ACE_PROFILES.longbow.theme,
      primary: 0x5a6168,
      secondary: 0x252b31,
      accent: 0xe7edf0,
      canopy: 0xa7d8eb,
      exhaust: 0xb9dbea,
      scale: 1.08
    },
    radio: {
      inbound: "高高度にネームド反応。WARDEN 1、TACネーム『GRANITE』。基地防空隊の指揮機だ。",
      wingman: "MiG-31で格闘する気はない。HALOとこっちの退路を切るつもりだ。",
      engage: "こちらGRANITE。FROZEN EYEが沈黙するまで、空域を封鎖する。",
      down: "GRANITE、被弾。WARDEN編隊、基地防空任務を継続せよ。"
    }
  });

  const baseMark = "m11BaseNode";
  const hunterTag = "m11HaloHunter";
  // RAVEN enters at the authored 30,000 ft combat band. HALO is a latest-model
  // stratospheric EW platform exempt from the fighter envelope and holds
  // 12.5 km. The MiG-31's engine-specific +2 km margin lets it fight near its
  // 12 km aerodynamic ceiling; an ordinary fighter at roughly 10 km has only
  // a narrow horizontal margin inside a 4AAM's 2 km slant range.
  const playerStartAltitude = 9144;
  const operationAltitude = 12500;
  const safeAltitude = 9000;
  const interceptorAltitude = 11900;
  // Restored fire-control turns the tagged base SAMs into the mission's hard
  // altitude gate. Keep the authored requirement readable in km/h even though
  // the combat simulation stores velocity in metres per second.
  const radarOnlineMissileMaxSpeed = 4000 / 3.6;
  const baseX = anchors.weatherStation[0];
  const baseZ = anchors.weatherStation[1];

  const m11EscortContract = Object.freeze({
    callsign: "HALO",
    aircraft: "jammer",
    total: 3,
    requiredSaved: 2,
    timeLimit: 330,
    missionTag: hunterTag,
    operationAltitude,
    safeAltitude,
    interceptorAltitude,
    base: Object.freeze({
      mark: baseMark,
      total: 10,
      fireControlRole: "fireControlRadar",
      samRole: "baseSam"
    }),
    electronicWarfare: Object.freeze({
      jamDuration: 60,
      radarOnlineDuration: 18,
      warningLead: 35,
      safeAltitude,
      enhancedRange: 12000,
      enhancedLockTime: 0.28,
      enhancedFireDelayMin: 0.16,
      enhancedFireDelayMax: 0.28,
      enhancedMaxSpeed: radarOnlineMissileMaxSpeed,
      enhancedAcceleration: 240,
      enhancedTurnRateDeg: 75,
      // N=8 deliberately saturates the mission round's available steering.
      // 150G is just enough to retain the global 75 deg/s turn ceiling at
      // 4,000 km/h; it does not raise that ceiling or affect ordinary rounds.
      enhancedNavigationRatio: 8,
      enhancedMaxLateralG: 150,
      enhancedLife: 18
    }),
    outcomes: Object.freeze({
      saved: "electronicSupportAircraftSaved",
      lost: "electronicSupportAircraftLost",
      allSafe: "allElectronicSupportAircraftSafe",
      secondaryKills: "secondaryAircraftDestroyed"
    }),
    rank: Object.freeze({
      sTime: 235,
      aTime: 290,
      sGuardLosses: 0,
      secondaryKillsForS: 4,
      ignoreWhiteTargets: true
    })
  });

  const mission = {
    key: "sera-m11",
    campaign: "sera",
    campaignOrder: 11,
    world: "verIceCoast",
    title: "FROZEN EYE",
    jp: "HALO電子支援隊の妨害窓を使い、敵基地の射撃管制網と全施設を無力化せよ。",
    act: 2,
    storyNo: 11,
    story: "WAR DAY 121。氷海岸上空、成層圏下端の高度一万二千五百メートル。最新鋭電子戦機HALOは敵基地の射撃管制レーダーへ周期妨害を開始した。\nROOKはその下、高度三万フィートから侵入する。妨害の切れ目には基地SAMの誘導網が復活する。白い海岸へ降り、次の切れ目までにFROZEN EYEを潰せ。",
    epilogue: [
      "射撃管制レーダーとベースステーションは沈黙し、氷海岸のミサイル網は目を失った。",
      "HALOの妨害記録には、基地が最後に空を見た十八秒が残されていた。",
      "LARKは残存航空戦力の数を読み上げ、RAVENと再び三万フィートへ上がった。"
    ],
    friendlies: {
      playerStart: {
        x: anchors.playerStart[0],
        y: playerStartAltitude,
        z: anchors.playerStart[1],
        facing: { x: baseX, z: baseZ }
      },
      wingmen: [
        {
          type: "fa18",
          label: "ROOK 2 LARK",
          radioSpeaker: "lark",
          spw: "aam4",
          offset: { back: 125, side: 150, up: -18 }
        }
      ],
      transportGroups: [
        {
          aircraft: "jammer",
          callsign: "HALO",
          count: 3,
          vulnerable: true,
          hp: 392,
          speed: 180,
          altitude: operationAltitude,
          holdAtExit: true,
          spacing: 290,
          start: { x: anchors.strikeStart[0], z: anchors.strikeStart[1] },
          exit: { x: anchors.strikeExit[0], z: anchors.strikeExit[1] }
        }
      ],
      // ARCA is still politically outside the operation on WAR DAY 121, but it
      // will defend its northern observation corridor when the base CAP turns
      // on it. POLAR WATCH fights MiG-29A only; it is not part of HALO's guard
      // ledger and the MiG-31 force never diverts from the jammer formation.
      supportFlights: [
        {
          aircraft: "typhoon",
          callsign: "ARCA POLAR WATCH",
          count: 2,
          vulnerable: false,
          enemyTargetable: true,
          combatSupport: true,
          combatTargetTypes: ["mig29"],
          hp: 340,
          radioSpeaker: "pax",
          killRadio: "POLAR WATCH、MiG-29Aを一機排除。HALOへの高高度迎撃はROOKに任せる。",
          speed: 280,
          altitude: 9800,
          spacing: 320,
          holdAtExit: true,
          start: { x: anchors.arcaWatchStart[0], z: anchors.arcaWatchStart[1] },
          exit: { x: anchors.arcaWatchExit[0], z: anchors.arcaWatchExit[1] }
        }
      ],
      guard: {
        readout: "integrity",
        label: "HALO EW",
        lossPenalty: 550,
        hitPenalty: 0,
        lossBanner: "HALO JAMMER LOST",
        failBanner: "JAMMING NETWORK COLLAPSED",
        lossRadio: "HALOが一機落ちた！ 妨害網を残る二機で維持する。基地を急げ！",
        failRadio: "HALO二機喪失。射撃管制網の抑圧は不可能、FROZEN EYEを中止する。",
        safeRadio: "HALO電子支援隊、作戦空域を離脱。基地射撃管制網は沈黙した。"
      }
    },
    groundUnits: [
      { id: 21, type: "m11FireControlRadar", label: "FIRE CONTROL RADAR WEST", x: baseX - 680, z: baseZ + 420, heading: 0.45, tgt: true, mark: baseMark, missionRole: "fireControlRadar" },
      { id: 22, type: "m11FireControlRadar", label: "FIRE CONTROL RADAR EAST", x: baseX + 670, z: baseZ + 360, heading: -0.5, tgt: true, mark: baseMark, missionRole: "fireControlRadar" },
      { id: 23, type: "m11ControlStation", label: "BASE CONTROL STATION", x: baseX, z: baseZ, heading: Math.PI, tgt: true, mark: baseMark, missionRole: "baseStation" },
      { id: 24, type: "m11PowerPlant", label: "POWER PLANT NORTH", x: baseX - 360, z: baseZ - 520, heading: 0, tgt: true, mark: baseMark, missionRole: "basePower" },
      { id: 25, type: "m11FuelFarm", label: "MISSILE FUEL FARM", x: baseX + 370, z: baseZ - 560, heading: 0, tgt: true, mark: baseMark, missionRole: "basePower" },
      { id: 26, type: "samSite", label: "LONG RANGE SAM WEST", x: baseX - 1180, z: baseZ - 180, heading: 1.2, tgt: true, mark: baseMark, missionRole: "baseSam" },
      { id: 27, type: "samSite", label: "LONG RANGE SAM NORTH", x: baseX, z: baseZ + 1120, heading: Math.PI, tgt: true, mark: baseMark, missionRole: "baseSam" },
      { id: 28, type: "samSite", label: "LONG RANGE SAM EAST", x: baseX + 1180, z: baseZ - 160, heading: -1.2, tgt: true, mark: baseMark, missionRole: "baseSam" },
      { id: 29, type: "aaGun", label: "BASE DEFENCE GUN WEST", x: baseX - 720, z: baseZ - 850, heading: 0.25, tgt: true, mark: baseMark, missionRole: "baseDefence" },
      { id: 30, type: "aaGun", label: "BASE DEFENCE GUN EAST", x: baseX + 720, z: baseZ - 850, heading: -0.25, tgt: true, mark: baseMark, missionRole: "baseDefence" },
      // Perimeter contacts remain white and optional. The AD tanks use their
      // ordinary SHORAD profile and never inherit the tagged base-SAM boost.
      { id: 31, type: "m11Shorad", label: "PERIMETER SHORAD WEST", x: baseX - 1450, z: baseZ + 560, heading: 1.0, tgt: false, rankNeutral: true, mark: "m11PerimeterContact", missionRole: "perimeterDefence" },
      { id: 32, type: "m11Shorad", label: "PERIMETER SHORAD EAST", x: baseX + 1450, z: baseZ + 520, heading: -1.0, tgt: false, rankNeutral: true, mark: "m11PerimeterContact", missionRole: "perimeterDefence" },
      { id: 33, type: "aaGun", label: "PERIMETER AAA SOUTHWEST", x: baseX - 1200, z: baseZ - 900, heading: 0.45, tgt: false, rankNeutral: true, mark: "m11PerimeterContact", missionRole: "perimeterDefence" },
      { id: 34, type: "aaGun", label: "PERIMETER AAA SOUTHEAST", x: baseX + 1200, z: baseZ - 900, heading: -0.45, tgt: false, rankNeutral: true, mark: "m11PerimeterContact", missionRole: "perimeterDefence" },
      { id: 35, type: "aaGun", label: "PERIMETER AAA NORTHWEST", x: baseX - 520, z: baseZ + 1370, heading: 2.7, tgt: false, rankNeutral: true, mark: "m11PerimeterContact", missionRole: "perimeterDefence" },
      { id: 36, type: "aaGun", label: "PERIMETER AAA NORTHEAST", x: baseX + 520, z: baseZ + 1340, heading: -2.7, tgt: false, rankNeutral: true, mark: "m11PerimeterContact", missionRole: "perimeterDefence" }
    ],
    sequence: [
      {
        types: ["mig31", "mig31"], tgt: false, rankNeutral: true,
        missionTag: hunterTag, band: 3, idBase: 410,
        label: "FOXHOUND HIGH 1", role: "line", skill: "veteran", hunt: "air",
        huntAltitudeFloor: interceptorAltitude,
        at: [...anchors.northIntercept], altitude: interceptorAltitude,
        facing: [...anchors.strikeStart],
        radio: [{ speaker: "meridian", priority: "URGENT", text: "高高度にMiG-31二機。HALOを狙う残存迎撃戦力、白表示だ。基地設備を優先せよ。", id: "m11-foxhound-one" }]
      },
      {
        types: ["mig29", "mig29"], tgt: false, rankNeutral: true,
        concurrent: true, delay: 18, missionTag: "m11BaseAirDefence", band: 2, idBase: 430,
        label: "FROZEN CAP", role: "line", skill: "standard",
        assignedTargets: ["player", "wingman"],
        at: [...anchors.baseCapEntry], altitude: 6200,
        facing: [...anchors.weatherStation],
        radio: [{ speaker: "meridian", priority: "NORMAL", text: "基地西側にMiG-29A二機。低高度CAPだ。HALOではなくROOKを迎撃する。", id: "m11-cap-local" }]
      },
      {
        types: ["mig29", "mig29"], tgt: false, rankNeutral: true,
        concurrent: true, delay: 75, missionTag: "m11BaseAirDefence", band: 2, idBase: 440,
        label: "COAST QRA", role: "line", skill: "veteran",
        assignedTargets: ["arca", "player"],
        at: [...anchors.coastQraEntry], altitude: 5900,
        facing: [...anchors.battleCenter],
        radio: [{ speaker: "lark", priority: "URGENT", text: "海岸側からQRA二機！ 妨害の切れ目に合わせて挟む気だ。", id: "m11-qra-coast" }]
      },
      {
        types: ["mig29", "mig29"], tgt: false, rankNeutral: true,
        concurrent: true, delay: 87, missionTag: "m11BaseAirDefence", band: 2, idBase: 450,
        label: "INLAND QRA", role: "line", skill: "veteran",
        assignedTargets: ["wingman", "arca"],
        at: [...anchors.inlandQraEntry], altitude: 5700,
        facing: [...anchors.weatherStation],
        radio: [{ speaker: "meridian", priority: "URGENT", text: "第二組、内陸側から二機。敵航空戦力は合計六、基地攻撃中も後方を見ろ。", id: "m11-qra-inland" }]
      },
      {
        types: ["mig31"], tgt: false, rankNeutral: true,
        concurrent: true, delay: 145, missionTag: hunterTag, band: 3, idBase: 420,
        label: "WARDEN 1", role: "elite", skill: "expert", ace: "granite",
        hunt: "air", huntAltitudeFloor: interceptorAltitude,
        at: [...anchors.southIntercept], altitude: interceptorAltitude,
        facing: [...anchors.battleCenter],
        radio: [{ speaker: "meridian", priority: "CRITICAL", text: "第二のレーダー復活に同期してWARDEN 1進入。GRANITEもHALOへ向かっている！", id: "m11-granite-inbound" }]
      },
      {
        types: ["mig31"], tgt: false, rankNeutral: true,
        concurrent: true, delay: 149, missionTag: hunterTag, band: 3, idBase: 421,
        label: "WARDEN 2", role: "line", skill: "veteran", hunt: "air",
        huntAltitudeFloor: interceptorAltitude,
        at: [...anchors.southIntercept], altitude: interceptorAltitude,
        facing: [...anchors.battleCenter],
        radio: [{ speaker: "lark", priority: "URGENT", text: "GRANITEの僚機はHALOへ向かった。4AAMなら届く、でも赤TGTを残すな！", id: "m11-warden-wing" }]
      }
    ],
    m11EscortContract,
    fixedRadio: [
      { id: "m11-intro-1", at: 2, speaker: "meridian", priority: "NORMAL", text: "ROOK、成層圏下端、一万二千五百の最新鋭HALO電子支援隊と合流。敵射撃管制を周期妨害中。" },
      { id: "m11-intro-2", at: 8, speaker: "lark", priority: "NORMAL", text: "緑表示中に降りて基地を叩く。妨害停止前に高度九千へ戻る、HUDを見て！" },
      { id: "m11-intro-3", at: 14, speaker: "meridian", priority: "URGENT", text: "赤TGTはレーダー、ベースステーション、SAM、基地設備。MiG-31は白の二次目標だ。" },
      { id: "m11-arca-watch", at: 24, speaker: "pax", priority: "NORMAL", text: "POLAR WATCHよりROOK。民間周波数の監視を継続。接近するMiG-29Aにはこちらで対処する。" },
      { id: "m11-arca-withdraw", at: 52, speaker: "pax", priority: "URGENT", text: "POLAR WATCH、基地CAPと交戦。MiG-31はHALOへ直進中——高高度迎撃はROOKが止めろ。" },
      { id: "m11-jam-warning", event: "haloJammingWarning", speaker: "meridian", priority: "URGENT", text: "HALO妨害停止まで三十五秒。攻撃を切り上げ、高度九千以上へ上がれ。" },
      { id: "m11-jam-pause", event: "haloJammingPause", speaker: "halo", priority: "CRITICAL", text: "HALO、再同期開始。敵射撃管制レーダー復活——低高度機は直ちに退避。" },
      { id: "m11-jam-resume", event: "haloJammingResume", speaker: "halo", priority: "CRITICAL", text: "妨害を再開。敵ミサイル誘導性能低下、攻撃窓を再設定する。" },
      { id: "m11-radar-down", event: "m11FireControlDown", speaker: "meridian", priority: "CRITICAL", text: "射撃管制レーダー全基沈黙。妨害停止中も長射程誘導はできない、残る基地設備を潰せ。" },
      { id: "m11-base-half", event: "m11BaseHalfClear", speaker: "lark", priority: "NORMAL", text: "基地機能は半分まで落ちた。ベースステーションと残存設備を仕留めよう。" },
      { id: "m11-one-lost", event: "haloOneLost", speaker: "meridian", priority: "CRITICAL", text: "HALO一機喪失。妨害網は残る二機で維持、これ以上は失えない。" },
      { id: "m11-base-clear", event: "m11BaseNeutralized", speaker: "meridian", priority: "CRITICAL", text: "敵基地の全設備沈黙。FROZEN EYE無力化を確認。" }
    ],
    successRadio: { speaker: "meridian", priority: "CRITICAL", text: "FROZEN EYE無力化。HALOは妨害を終了、ROOKは高高度へ離脱せよ。", id: "m11-success" },
    failureRadio: { speaker: "meridian", priority: "CRITICAL", text: "HALO妨害網を喪失。敵基地の長射程誘導が復活した、ROOKは帰投せよ。", id: "m11-failure" },
    parTime: 235,
    hasOutro: false,
    map: { x: 0.65, y: 0.18 },
    battleCenter: { x: anchors.battleCenter[0], z: anchors.battleCenter[1] },
    battleRadius: 19000,
    briefing: "VER ICE COAST上空。最新鋭HALO電子支援隊は通常戦闘機の飛行限界外となる成層圏下端の高度12,500m、RAVENとLARKは9,144mから侵入し、大陸上のFROZEN EYE基地を無力化する。赤TGTは射撃管制レーダー二基、ベースステーション、電源・燃料設備、SAM三基、対空砲二基の計十目標。全赤TGT破壊で任務達成。基地外周には白表示のSHORAD二両と対空砲四基がいる。\n敵航空戦力はMiG-29A六機とMiG-31四機。MiG-29Aは基地CAPと二組のQRAとして時間差でRAVEN、LARK、ARCA POLAR WATCHを分担して迎撃する。ARCA二機はMiG-29Aに限り自衛交戦する。強力なエンジンで通常機より高い上限を持つMiG-31四機は11,900m帯からHALOだけを狙い、ネームドGRANITEも任務を変えない。通常戦闘機は高度10,000m付近、MiG-31は12,000m付近で推力余裕を失い、上昇や旋回による速度低下から失速しやすくなる。4AAMのロック距離2,000mへ入れる余裕は小さく、迎撃するなら通常機の限界近くまで上昇せよ。\nHALOの妨害は60秒継続した後、18秒だけ再同期のため停止する。停止35秒前からHUDに上昇指示が出る。射撃管制レーダーが生きている停止中は基地SAMの射程・ロック・誘導性能が飛躍的に上がるため、高度9,000m以上へ退避して誘導圏外へ出ろ。妨害再開後に再降下するか、レーダー二基を先に破壊して強化を永久に止めろ。\n青表示のARCA POLAR WATCH二機は民間救難・気象周波数を監視しつつ基地北側を保持する。ARCAの損失は任務失敗条件ではなく、HALO三機だけが護衛HPの対象。HALOの合算HPと妨害状態は右上、現在の攻撃・退避指示は中央上部に表示される。HALOを二機失うと任務失敗。一機損失またはMiG-31未掃討ではSランクを得られない。"
  };

  ctx.addMission(mission, { after: "sera-m10" });
}
