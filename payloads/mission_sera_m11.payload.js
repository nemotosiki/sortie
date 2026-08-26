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
    GROUND_TYPES
  } = ctx.tables;

  const world = WORLD_PRESETS.verIceCoast;
  if (!world) throw new Error("[sera-m11] verIceCoast is not registered; load map_verIceCoast first");
  if (!MISSIONS.some((mission) => mission.key === "sera-m10" && mission.campaign === "sera")) {
    throw new Error("[sera-m11] sera-m10 predecessor is missing");
  }
  for (const type of ["fa18", "jammer", "mig31"]) {
    if (!AIRCRAFT_TYPES[type]) throw new Error(`[sera-m11] required aircraft not registered: ${type}`);
  }
  if (!ENEMY_AI_PROFILES.mig31) {
    throw new Error("[sera-m11] required enemy profile not registered: mig31");
  }
  for (const type of ["radarSite", "bunker", "fuelTank", "samSite", "aaGun"]) {
    if (!GROUND_TYPES[type]) throw new Error(`[sera-m11] required ground type not registered: ${type}`);
  }

  const anchors = world.missionAnchors;
  for (const key of [
    "playerStart", "strikeStart", "strikeExit", "battleCenter",
    "northIntercept", "southIntercept", "weatherStation"
  ]) {
    if (!Array.isArray(anchors?.[key]) || anchors[key].length !== 2) {
      throw new Error(`[sera-m11] Ver Ice Coast mission anchor is missing: ${key}`);
    }
  }

  const baseMark = "m11BaseNode";
  const hunterTag = "m11HaloHunter";
  // RAVEN enters at the authored 30,000 ft combat band. HALO remains much
  // closer to the soft ceiling, so the MiG-31s hunting it have a visible
  // reason to stay high instead of diving down into an ordinary dogfight.
  const playerStartAltitude = 9144;
  const operationAltitude = 10500;
  const safeAltitude = 9000;
  const interceptorAltitude = 10650;
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
      jamDuration: 100,
      radarOnlineDuration: 18,
      warningLead: 35,
      safeAltitude,
      enhancedRange: 12000,
      enhancedLockTime: 0.28,
      enhancedFireDelayMin: 0.16,
      enhancedFireDelayMax: 0.28,
      enhancedMaxSpeed: 700,
      enhancedAcceleration: 240,
      enhancedTurnRateDeg: 75,
      enhancedNavigationRatio: 5,
      enhancedLife: 14
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
    story: "WAR DAY 121。氷海岸上空、高度一万五百メートル。HALO電子支援隊は敵基地の射撃管制レーダーへ周期妨害を開始した。\nROOKはその下、高度三万フィートから侵入する。妨害の切れ目には基地SAMの誘導網が復活する。白い海岸へ降り、次の切れ目までにFROZEN EYEを潰せ。",
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
      { id: 21, type: "radarSite", label: "FIRE CONTROL RADAR WEST", x: baseX - 680, z: baseZ + 420, heading: 0.45, tgt: true, mark: baseMark, missionRole: "fireControlRadar" },
      { id: 22, type: "radarSite", label: "FIRE CONTROL RADAR EAST", x: baseX + 670, z: baseZ + 360, heading: -0.5, tgt: true, mark: baseMark, missionRole: "fireControlRadar" },
      { id: 23, type: "bunker", label: "BASE CONTROL STATION", x: baseX, z: baseZ, heading: Math.PI, tgt: true, mark: baseMark, missionRole: "baseStation" },
      { id: 24, type: "fuelTank", label: "POWER PLANT NORTH", x: baseX - 360, z: baseZ - 520, heading: 0, tgt: true, mark: baseMark, missionRole: "basePower" },
      { id: 25, type: "fuelTank", label: "MISSILE FUEL FARM", x: baseX + 370, z: baseZ - 560, heading: 0, tgt: true, mark: baseMark, missionRole: "basePower" },
      { id: 26, type: "samSite", label: "LONG RANGE SAM WEST", x: baseX - 1180, z: baseZ - 180, heading: 1.2, tgt: true, mark: baseMark, missionRole: "baseSam" },
      { id: 27, type: "samSite", label: "LONG RANGE SAM NORTH", x: baseX, z: baseZ + 1120, heading: Math.PI, tgt: true, mark: baseMark, missionRole: "baseSam" },
      { id: 28, type: "samSite", label: "LONG RANGE SAM EAST", x: baseX + 1180, z: baseZ - 160, heading: -1.2, tgt: true, mark: baseMark, missionRole: "baseSam" },
      { id: 29, type: "aaGun", label: "BASE DEFENCE GUN WEST", x: baseX - 720, z: baseZ - 850, heading: 0.25, tgt: true, mark: baseMark, missionRole: "baseDefence" },
      { id: 30, type: "aaGun", label: "BASE DEFENCE GUN EAST", x: baseX + 720, z: baseZ - 850, heading: -0.25, tgt: true, mark: baseMark, missionRole: "baseDefence" }
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
        types: ["mig31", "mig31"], tgt: false, rankNeutral: true,
        concurrent: true, delay: 92, missionTag: hunterTag, band: 3, idBase: 420,
        label: "FOXHOUND HIGH 2", role: "line", skill: "veteran", hunt: "air",
        huntAltitudeFloor: interceptorAltitude,
        at: [...anchors.southIntercept], altitude: interceptorAltitude,
        facing: [...anchors.battleCenter],
        radio: [{ speaker: "lark", priority: "URGENT", text: "南東、高高度にもう二機。4AAMなら届く、でも赤い基地TGTを残すな！", id: "m11-foxhound-two" }]
      }
    ],
    m11EscortContract,
    fixedRadio: [
      { id: "m11-intro-1", at: 2, speaker: "meridian", priority: "NORMAL", text: "ROOK、上空一万五百のHALO電子支援隊と合流。敵基地の射撃管制レーダーを周期妨害中。" },
      { id: "m11-intro-2", at: 8, speaker: "lark", priority: "NORMAL", text: "緑表示中に降りて基地を叩く。妨害停止前に高度九千へ戻る、HUDを見て！" },
      { id: "m11-intro-3", at: 14, speaker: "meridian", priority: "URGENT", text: "赤TGTはレーダー、ベースステーション、SAM、基地設備。MiG-31は白の二次目標だ。" },
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
    briefing: "VER ICE COAST上空。HALO電子支援隊は高度10,500m、RAVENとLARKは9,144mから侵入し、敵基地を無力化する。赤TGTは射撃管制レーダー二基、ベースステーション、電源・燃料設備、SAM三基、対空砲二基の計十目標。全赤TGT破壊で任務達成。白表示のMiG-31四機はHALOを狙って10,650m帯に張り付く残存航空戦力で、撃墜は二次目標となる。通常ミサイルでは高度差が大きい。迎撃するなら上昇し、4AAMの射程を使え。\nHALOの妨害は100秒継続した後、18秒だけ再同期のため停止する。停止35秒前からHUDに上昇指示が出る。射撃管制レーダーが生きている停止中は基地SAMの射程・ロック・誘導性能が飛躍的に上がるため、高度9,000m以上へ退避して誘導圏外へ出ろ。妨害再開後に再降下するか、レーダー二基を先に破壊して強化を永久に止めろ。\nHALO三機の合算HPと妨害状態は右上、現在の攻撃・退避指示は中央上部に表示される。HALOを二機失うと任務失敗。一機損失またはMiG-31未掃討ではSランクを得られない。"
  };

  ctx.addMission(mission, { after: "sera-m10" });
}
