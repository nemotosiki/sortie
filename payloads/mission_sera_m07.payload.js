// Sera M07 BLACK CURRENT — rescue-aircraft escort mission.
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
  for (const type of ["fa18", "e2d", "sarFlyingBoat", "su33", "mig29"]) {
    if (!AIRCRAFT_TYPES[type]) throw new Error(`[sera-m07] required aircraft not registered: ${type}`);
  }
  for (const type of ["su33", "mig29"]) {
    if (!ENEMY_AI_PROFILES[type]) throw new Error(`[sera-m07] required enemy profile not registered: ${type}`);
  }
  if (!SHIP_TYPES.missileBoat) throw new Error("[sera-m07] missileBoat ship type is missing");

  const sites = Object.freeze(world.missionAnchors.rescueSites
    .filter((site) => site.kind === "survivor")
    .map((site) => Object.freeze({
      id: site.id,
      kind: site.kind,
      label: site.label,
      at: Object.freeze([...site.at])
    })));
  const m07RecoveryContract = Object.freeze({
    sites,
    requiredSurvivors: 3,
    timeLimit: 900,
    autoRecovery: Object.freeze({
      callsign: "SEALIGHT 1",
      arriveRadius: 540,
      pickupTime: 10
    }),
    interference: Object.freeze({
      initialDelay: 20,
      interval: 34,
      retryDelay: 8,
      liveCap: 4,
      types: Object.freeze(["mig29", "mig29"]),
      label: "FULCRUM INTERCEPT",
      role: "line",
      skill: "regular",
      band: 1,
      missionTag: "m07-interference"
    }),
    midInterference: Object.freeze({
      triggerRecovered: 1,
      types: Object.freeze(["mig29", "mig29"]),
      label: "FULCRUM HIGH COVER",
      role: "line",
      skill: "veteran",
      band: 2,
      at: Object.freeze([4300, 3400]),
      facing: Object.freeze([0, 0]),
      altitude: 2100,
      missionTag: "m07-mid-interference"
    }),
    marks: Object.freeze({
      route: "m07Route",
      survivors: "m07SurvivorsRecovered",
      crownEarly: "crown1Recovered"
    }),
    score: Object.freeze({ survivor: 900 }),
    rank: Object.freeze({
      sTime: 720,
      aTime: 900,
      sGuardLosses: 0,
      ignoreWhiteTargets: true
    }),
    epilogueByRoute: Object.freeze({
      rescue: Object.freeze([
        "SEALIGHTは三つの救難信号を順に回収し、全乗員を嵐から連れ出した。",
        "CROWNは後方の病院へ移送された。RAVENは救難機の翼を最後まで守った。",
        "沿岸迎撃隊は救助が終わるまで押し寄せたが、救難航路を閉じることはできなかった。"
      ])
    })
  });

  const anchors = world.missionAnchors;
  // Keep the rescue hunters outside immediate firing range. The authored map
  // anchor was too close once six TGTs were staggered into the same corridor;
  // 1.5x from the battle centre preserves the bearing while buying intercept
  // time before each pair reaches SEALIGHT.
  const redCapEntry = Object.freeze([
    Math.round(Number(anchors.enemyCapEntry[0]) * 1.5),
    Math.round(Number(anchors.enemyCapEntry[1]) * 1.5)
  ]);
  const mission = {
    key: "sera-m07",
    campaign: "sera",
    campaignOrder: 7,
    world: "damarSeaStorm",
    title: "BLACK CURRENT",
    jp: "暴風雨のダマル西救難航路へ進出し、自動救助を行うSEALIGHTを敵航空隊から守れ。",
    act: 2,
    storyNo: 7,
    story: "WAR DAY 068。RAVENは初めてROOK 1として、黒いダマル海へ入る。\n三つの救難光へ向かうSEALIGHT。その遅い翼を、ROOKが敵から守り抜く。",
    // The runtime substitutes route-specific lines from the recovery contract.
    epilogue: [
      "ダマル海の救難航路は確保された。",
      "三地点の生存者はSEALIGHTによって後方へ運ばれた。",
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
        readout: "integrity",
        label: "SEALIGHT",
        lossPenalty: 0,
        hitPenalty: 0,
        lossBanner: "RESCUE AIRCRAFT LOST",
        failBanner: "RESCUE OPERATION LOST",
        lossRadio: "SEALIGHT被撃墜！ 救難作業を続けられない！",
        failRadio: "救難航空隊を喪失。BLACK CURRENTを中止、ROOKは離脱せよ。",
        safeRadio: "SEALIGHT、全救助を完了。救難航路から離脱する。"
      }
    },

    sequence: [
      {
        types: ["su33", "su33"],
        band: 2,
        idBase: 0,
        label: "FLEET CAP LEAD",
        role: "line",
        skill: "regular",
        hunt: "air",
        at: [...redCapEntry],
        altitude: 1450,
        facing: [0, 0],
        radio: [
          {
            speaker: "meridian",
            priority: "CRITICAL",
            text: "Su-33二機、救難航路へ接近。後続反応あり。全機TGT指定、SEALIGHTを守れ。",
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
      },
      {
        types: ["su33", "su33"],
        band: 2,
        idBase: 2,
        label: "FLEET CAP SECOND",
        role: "line",
        skill: "regular",
        hunt: "air",
        concurrent: true,
        delay: 30,
        at: [...redCapEntry],
        altitude: 1450,
        facing: [0, 0],
        radio: [
          {
            speaker: "meridian",
            priority: "URGENT",
            text: "Su-33第2編隊、二機接近。TGT追加、SEALIGHTへの攻撃を阻止せよ。",
            id: "m07_contact_cap_second"
          }
        ]
      },
      {
        types: ["su33", "su33"],
        band: 2,
        idBase: 4,
        label: "FLEET CAP FINAL",
        role: "line",
        skill: "regular",
        hunt: "air",
        concurrent: true,
        delay: 60,
        at: [...redCapEntry],
        altitude: 1450,
        facing: [0, 0],
        radio: [
          {
            speaker: "meridian",
            priority: "CRITICAL",
            text: "Su-33最終編隊、二機。これで六機すべてだ。救助対象へ近づけるな。",
            id: "m07_contact_cap_final"
          }
        ]
      }
    ],

    m07RecoveryContract,
    fixedRadio: [
      { id: "m07_intro_meridian", at: 2, speaker: "meridian", priority: "NORMAL", text: "ROOK、ダマル西救難航路へ進入。視程二千九百、雲底六百。" },
      { id: "m07_intro_lark", at: 8, speaker: "lark", priority: "NORMAL", text: "SEALIGHTが第1救難地点へ向かってる。こっちは上を守ればいい。" },
      { id: "m07_escort_meridian", at: 14, speaker: "meridian", priority: "URGENT", text: "救助と航法はSEALIGHTが行う。ROOKは損傷状況を監視し、接近する敵を排除せよ。" },
      { id: "m07_rescue_start_1", event: "rescueSite1Start", speaker: "meridian", priority: "URGENT", text: "SEALIGHT、第1救難地点へ進入。救助開始。ROOKは上空警戒を続けろ。" },
      { id: "m07_rescue_progress_1", event: "rescueProgress1", speaker: "meridian", priority: "NORMAL", text: "第1地点の生存者を収容。SEALIGHTは次のビーコンへ移動する。" },
      { id: "m07_rescue_start_2", event: "rescueSite2Start", speaker: "meridian", priority: "URGENT", text: "SEALIGHT、第2救難地点で救助開始。ROOKは上空警戒を維持。" },
      { id: "m07_rescue_progress_2", event: "rescueProgress2", speaker: "meridian", priority: "NORMAL", text: "第2地点の生存者を収容。残る救難信号は一つ。" },
      { id: "m07_rescue_start_3", event: "rescueSite3Start", speaker: "meridian", priority: "URGENT", text: "SEALIGHT、最終救難地点へ進入。救助完了まで護衛を維持せよ。" },
      { id: "m07_crown", event: "crownRecovered", speaker: "crown", priority: "URGENT", text: "……CROWNだ。聞こえる。RAVEN、SEALIGHTを守れ。" },
      { id: "m07_interference", event: "interferenceInbound", speaker: "meridian", priority: "URGENT", text: "ダマル沿岸からMiG-29A二機。RAVENを狙っている。救助完了まで増援が続く。" },
      { id: "m07_mid_interference", event: "midInterferenceInbound", speaker: "meridian", priority: "CRITICAL", text: "第1救助完了を確認。北東からMiG-29A二機、追加接近。RAVENを狙っている。" },
      { id: "m07_red_board_clear", event: "redBoardClear", speaker: "meridian", priority: "URGENT", text: "救難航路上の敵機を排除。SEALIGHTの救助完了まで上空援護を継続せよ。" },
      { id: "m07_recovery_complete", event: "recoveryComplete", speaker: "meridian", priority: "CRITICAL", text: "全三地点の救助完了。残存する攻撃隊を排除し、SEALIGHTと離脱せよ。" }
    ],
    successRadio: {
      speaker: "meridian",
      priority: "CRITICAL",
      text: "BLACK CURRENT完了。全生存者を収容した。ROOK、SEALIGHTを伴い帰投せよ。",
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
    briefing: "暴風雨のダマル西救難航路でSEALIGHT救難飛行艇を護衛する。救助と航法は味方救出部隊が自動で行うため、RAVENが救難地点を探す必要はない。\n右上の緑色FRIENDSゲージはSEALIGHTの機体HPを示す。救助進捗はMERIDIANが無線で1/3、2/3、3/3と報告する。\n赤TGTのSu-33は合計六機。二機ずつ三編隊が30秒間隔で到着し、SEALIGHTを直接攻撃する。白いMiG-29A増援は救助完了までRAVENを狙って繰り返し出現し、第1救助後には練度の高いMiG-29A二機も一度だけ追加される。\n白いミサイル艇を含む妨害戦力は撃破必須ではない。SEALIGHTを失えばMISSION FAILED。三地点の救助完了と赤TGT全機撃破の両方で作戦完了。"
  };

  ctx.addMission(mission, { after: "sera-m06" });
}
