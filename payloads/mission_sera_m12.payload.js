// Sera M12 GLASS SWARM — blackout drone-war route mission.
//
// Every combat flight is authored as a concurrent finite wave. This lets the
// host cancel only the tagged replenishments that have not launched when both
// shared-grid substations are destroyed, while drones already in the air remain
// real contacts that must still be defeated.
export default function register(ctx) {
  const {
    MISSIONS, WORLD_PRESETS, AIRCRAFT_TYPES, ENEMY_AI_PROFILES, GROUND_TYPES
  } = ctx.tables;

  if (!WORLD_PRESETS.norIndustrialBlackout) {
    throw new Error("[sera-m12] norIndustrialBlackout is not registered; load map_norIndustrial first");
  }
  if (!MISSIONS.some((mission) => mission.key === "sera-m11" && mission.campaign === "sera")) {
    throw new Error("[sera-m12] sera-m11 predecessor is missing");
  }
  for (const type of ["jammer", "s70", "uav", "mig29", "su35", "fa18"]) {
    if (!AIRCRAFT_TYPES[type]) throw new Error(`[sera-m12] required aircraft not registered: ${type}`);
  }
  for (const type of ["jammer", "s70", "uav", "mig29", "su35"]) {
    if (!ENEMY_AI_PROFILES[type]) throw new Error(`[sera-m12] required enemy profile not registered: ${type}`);
  }
  if (!GROUND_TYPES.substation) {
    throw new Error("[sera-m12] required ground type not registered: substation");
  }

  const m12SwarmContract = Object.freeze({
    designatedTag: "m12Swarm",
    replenishmentTag: "m12Replenishment",
    power: Object.freeze({ mark: "m12Power", required: 2 }),
    jammer: Object.freeze({ missionRole: "m12Jammer", falseContacts: 6 }),
    outcomes: Object.freeze({
      gridCut: "gridCut",
      civilianHeatingInterrupted: "civilianHeatingInterrupted",
      reinforcementAircraftCancelled: "reinforcementAircraftCancelled",
      powerSubstationsDestroyed: "powerSubstationsDestroyed",
      jammerDestroyed: "jammerDestroyed"
    })
  });

  const wave = (types, options = {}) => ({
    types,
    tgt: options.tgt ?? true,
    rankNeutral: options.rankNeutral ?? false,
    concurrent: options.concurrent ?? true,
    missionTag: options.missionTag || m12SwarmContract.designatedTag,
    band: options.band || 1,
    idBase: options.idBase,
    label: options.label,
    role: options.role || "line",
    skill: options.skill || "regular",
    delay: options.delay || 0,
    at: options.at,
    altitude: options.altitude,
    facing: options.facing,
    radio: options.radio,
    missionRole: options.missionRole,
    purpose: options.purpose,
    protectTag: options.protectTag,
    commitRange: options.commitRange,
    leashRange: options.leashRange,
    purposeAltitudeFloor: options.purposeAltitudeFloor
  });

  const mission = {
    key: "sera-m12",
    campaign: "sera",
    campaignOrder: 12,
    world: "norIndustrialBlackout",
    title: "GLASS SWARM",
    jp: "ノル無人工業区へ侵入し、電子妨害中継機と無人戦闘群を排除せよ。",
    act: 2,
    storyNo: 12,
    story: "WAR DAY 17。停電したノルの工場街から、座席のない戦闘機だけが途切れず離陸している。\n無人機を一機ずつ落とせば住宅の暖房網は残る。白表示の送電所を二つ落とせば補充は止まるが、街の窓も同時に消える。",
    epilogue: [
      "ノル上空の無人戦闘群は沈黙した。通信に悲鳴も降伏も残らなかった。",
      "MERIDIANは撃墜数の横に、共有送電網が生きているかどうかを記録した。",
      "戦場から人を除いても、命令の結果まで無人になるわけではなかった。"
    ],
    friendlies: {
      playerStart: {
        x: -6100,
        y: 1850,
        z: -5600,
        facing: { x: -900, z: -620 }
      },
      wingmen: [
        {
          type: "fa18",
          label: "ROOK 2 LARK",
          radioSpeaker: "lark",
          spw: "aam4",
          offset: { back: 130, side: 145, up: -16 }
        }
      ]
    },
    groundUnits: [
      {
        id: 1201,
        type: "substation",
        label: "HEATING GRID WEST",
        x: 1680,
        z: 320,
        heading: 0.08,
        tgt: false,
        rankNeutral: true,
        mark: "m12Power",
        missionRole: "sharedHeatingGrid"
      },
      {
        id: 1202,
        type: "substation",
        label: "HEATING GRID NORTH",
        x: 3420,
        z: 2820,
        heading: -0.12,
        tgt: false,
        rankNeutral: true,
        mark: "m12Power",
        missionRole: "sharedHeatingGrid"
      }
    ],
    sequence: [
      wave(["jammer"], {
        concurrent: false,
        idBase: 1210,
        label: "GLASS RELAY",
        missionRole: "m12Jammer",
        purpose: "support",
        at: [6200, 5200],
        altitude: 4100,
        facing: [-900, -620],
        radio: [
          { speaker: "meridian", priority: "CRITICAL", text: "妨害中継機を赤TGTに指定。偽反応は追うな、発信源を落とせ。", id: "m12-jammer-contact" }
        ]
      }),
      wave(["s70", "s70"], {
        delay: 10, idBase: 1220, label: "GLASS HEAVY 1", band: 1,
        purpose: "intercept",
        at: [7100, -4800], altitude: 2500, facing: [-700, -300]
      }),
      wave(["uav", "uav", "uav", "uav"], {
        delay: 18, idBase: 1230, label: "GLASS LIGHT 1", band: 1,
        purpose: "intercept",
        at: [-5600, 7200], altitude: 2100, facing: [-300, 200]
      }),
      wave(["mig29", "mig29"], {
        tgt: false, rankNeutral: true, missionTag: "m12CrewedCover", delay: 36,
        idBase: 1240, label: "NOR CAP 1", band: 2, skill: "regular",
        purpose: "intercept",
        at: [8400, 6800], altitude: 2800, facing: [800, 600],
        radio: [
          { speaker: "lark", priority: "URGENT", text: "有人機も来る、MiG-29A二！ 相手をしても補充は止まらない、無人機を優先して！", id: "m12-mig29-first" }
        ]
      }),
      wave(["s70", "s70"], {
        delay: 58, idBase: 1250, label: "GLASS HEAVY 2", band: 2,
        purpose: "intercept",
        at: [-7600, -5000], altitude: 2700, facing: [-500, -400]
      }),
      wave(["uav", "uav", "uav"], {
        delay: 72, idBase: 1260, label: "GLASS LIGHT 2", band: 2,
        purpose: "intercept",
        at: [7600, -1200], altitude: 2300, facing: [200, 100]
      }),
      wave(["mig29", "mig29"], {
        tgt: false, rankNeutral: true, missionTag: "m12CrewedCover", delay: 82,
        idBase: 1270, label: "NOR CAP 2", band: 2, skill: "veteran",
        purpose: "intercept",
        at: [-8200, 3000], altitude: 3000, facing: [-200, 400]
      }),
      wave(["s70", "s70"], {
        missionTag: "m12Replenishment", delay: 118, idBase: 1280,
        label: "GLASS REPLENISH HEAVY", band: 3,
        purpose: "relief",
        at: [8800, 500], altitude: 2900, facing: [400, 400],
        radio: [
          { speaker: "meridian", priority: "URGENT", text: "工場から重UCAVの補充。送電所が生きている限り、予定された増援は上がる。", id: "m12-replenishment-heavy" }
        ]
      }),
      wave(["uav", "uav", "uav"], {
        missionTag: "m12Replenishment", delay: 140, idBase: 1290,
        label: "GLASS REPLENISH LIGHT", band: 3,
        purpose: "relief",
        at: [-6400, 8200], altitude: 2400, facing: [0, 500]
      }),
      wave(["mig29", "mig29"], {
        tgt: false, rankNeutral: true, missionTag: "m12CrewedCover", delay: 126,
        idBase: 1300, label: "NOR CAP 3", band: 3, skill: "veteran",
        purpose: "intercept",
        at: [5200, 8600], altitude: 3200, facing: [600, 1000]
      }),
      wave(["su35", "su35"], {
        tgt: false, rankNeutral: true, missionTag: "m12EliteCover", delay: 168,
        idBase: 1310, label: "FLANKER E", band: 3, skill: "ace",
        purpose: "interceptor",
        at: [-9000, -1200], altitude: 3500, facing: [-800, -200],
        radio: [
          { speaker: "meridian", priority: "URGENT", text: "北西からSu-35二。有人援護だ。交戦は任意、無人戦闘群の掃討を継続せよ。", id: "m12-su35-optional" }
        ]
      })
    ],
    m12SwarmContract,
    fixedRadio: [
      { id: "m12_intro_01", at: 2, speaker: "meridian", priority: "NORMAL", text: "ROOK、ノル無人工業区へ進入。レーダー像に妨害を確認。" },
      { id: "m12_intro_02", at: 7, speaker: "lark", priority: "URGENT", text: "同じ動きの反応が増えてる……偽物だ。まず中継機を落とそう。" },
      { id: "m12_power_choice", at: 24, speaker: "meridian", priority: "CRITICAL", text: "送電所二基は無人機工場と住宅暖房の共有網だ。破壊すれば未発進の補充を停止できる。" },
      { id: "m12_jammer_down", event: "m12JammerDown", speaker: "lark", priority: "CRITICAL", text: "中継機撃墜、偽反応が消えた！ 無人戦闘群を続けて！" },
      { id: "m12_one_power", event: "m12OnePowerDown", speaker: "meridian", priority: "NORMAL", text: "送電所一基停止。補充線は冗長化されている、もう一基が生きている。" },
      { id: "m12_grid_cut", event: "m12GridCut", speaker: "meridian", priority: "CRITICAL", text: "共有送電網停止。未発進機の起動反応も消失……住宅区も停電した。" }
    ],
    successRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "無人戦闘群の反応消失。ノル南部上空を確保。ROOK、帰投せよ。",
      id: "m12-success"
    },
    parTime: 440,
    hasOutro: false,
    map: { x: 0.66, y: 0.35 },
    battleCenter: { x: -150, z: 350 },
    battleRadius: 11800,
    briefing: "夜間のノル無人工業区へ侵入し、妨害中継機と無人戦闘群を排除せよ。中継機が生きている間、HUDにはロック不能の偽目標が混入する。\n赤TGTは中継機、S-70六、MQ-99十。MiG-29A六とSu-35二は有人の白表示援護で、任務達成には不要だ。\n白表示の送電所二基は工場と住宅暖房の共有網である。両方を破壊すると、すでに発進した機体は残るが、未到着のS-70二・MQ-99三の補充波を停止できる。送電網を残して全波と戦うことも可能だ。"
  };

  ctx.addMission(mission, { after: "sera-m11" });
}
