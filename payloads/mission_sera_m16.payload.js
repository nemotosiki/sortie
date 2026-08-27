// Sera M16 HOME FLEET — aggregate fleet defence, surfaced SSGN windows and
// eight independently interceptable sea-skimming anti-ship weapons.
export default function register(ctx) {
  const { MISSIONS, WORLD_PRESETS, AIRCRAFT_TYPES, ENEMY_AI_PROFILES, SHIP_TYPES } = ctx.tables;
  const world = WORLD_PRESETS.hadorDeepSea;
  if (!world) throw new Error("[sera-m16] hadorDeepSea is not registered");
  if (!MISSIONS.some((mission) => mission.key === "sera-m15" && mission.campaign === "sera")) {
    throw new Error("[sera-m16] sera-m15 predecessor is missing");
  }
  for (const type of ["fa18", "tu22m3", "su33", "awacs", "cruiseWeapon"]) {
    if (!AIRCRAFT_TYPES[type]) throw new Error(`[sera-m16] required aircraft is missing: ${type}`);
  }
  for (const type of ["tu22m3", "su33", "awacs", "cruiseWeapon"]) {
    if (!ENEMY_AI_PROFILES[type]) throw new Error(`[sera-m16] enemy profile is missing: ${type}`);
  }
  for (const type of ["carrier", "cruiser", "frigate", "ssgn"]) {
    if (!SHIP_TYPES[type]) throw new Error(`[sera-m16] required hull is missing: ${type}`);
  }
  const anchors = world.missionAnchors;
  const m16FleetContract = Object.freeze({
    fleetLabel: "HOME FLEET",
    epochLabel: "CVN EPOCH",
    ssgnType: "ssgn",
    ssgnIds: Object.freeze([1601, 1602]),
    ssgnTag: "m16Ssgn",
    ssgnAnchors: Object.freeze([anchors.westSsgn, anchors.eastSsgn]),
    ssgnWindowSeconds: 18,
    firstSurfaceAt: 7,
    reconFastInterval: 28,
    reconSlowInterval: 46,
    permanentSurfaceAfter: 3,
    reconTag: "m16Recon",
    bomberTag: "m16Bomber",
    fighterTag: "m16SeaFlanker",
    weaponTag: "m16AntiShipWeapon",
    weaponType: "cruiseWeapon",
    weaponIdBase: 1680,
    weaponTotal: 8,
    weaponSpeed: 245,
    weaponDamage: 480,
    bomberReleaseRadius: 5200,
    outcomes: Object.freeze({
      fleetIntegrity: "homeFleetIntegrity",
      fleetSurvived: "homeFleetShipsSurvived",
      epochSurvived: "epochSurvived",
      missilesLaunched: "antiShipWeaponsLaunched",
      missilesIntercepted: "antiShipWeaponsIntercepted",
      missileImpacts: "antiShipWeaponImpacts",
      ssgnDestroyed: "ssgnDestroyed",
      reconDestroyed: "reconDestroyed",
      supportStrength: "m20FleetSupportStrength"
    })
  });

  const mission = {
    key: "sera-m16",
    campaign: "sera",
    campaignOrder: 16,
    world: "hadorDeepSea",
    title: "HOME FLEET",
    jp: "CVN EPOCHと護衛艦隊を対艦ミサイル攻撃から守り、浮上するSSGNと低空爆撃隊を排除せよ。",
    act: 4,
    storyNo: 16,
    story: `WAR DAY 24。EPOCHはハドール西方の深海泊地で補給中。
ミガルへ向かう爆撃隊を追えば、この甲板は無防備になる。RAVENは帰る場所の上空へ残る。`,
    epilogue: [
      "EPOCHは艦首を風上へ向けたまま、最後の対艦警報を解除した。",
      "生き残った護衛艦と甲板要員は、その戦果を権限ではなく一人のパイロットの異名で呼んだ。",
      "HOME FLEETの残存戦力は、ミガル最終防衛へ回される。"
    ],
    friendlies: {
      playerStart: { x: anchors.playerStart[0], y: 1450, z: anchors.playerStart[1], facing: { x: anchors.battleCenter[0], z: anchors.battleCenter[1] } },
      wingmen: [
        { type: "fa18", label: "ROOK 2 LARK", radioSpeaker: "lark", spw: "4aam", offset: { back: 120, side: 145, up: -14 } }
      ],
      carrier: { x: anchors.fleetCenter[0], z: anchors.fleetCenter[1], heading: 0, label: "CVN EPOCH", vulnerable: true, hp: 4200 },
      shipGroups: [
        { callsign: "EPOCH CRUISER", hull: "cruiser", count: 1, vulnerable: true, hp: 1280, start: { x: -650, z: -1250 }, exit: { x: -650, z: -9300 }, spacing: 360 },
        { callsign: "EPOCH FRIGATE", hull: "frigate", count: 2, vulnerable: true, hp: 880, start: { x: 700, z: -1150 }, exit: { x: 700, z: -9200 }, spacing: 760 }
      ],
      supportFlights: [
        { callsign: "EPOCH CAP", aircraft: "fa18", count: 4, vulnerable: false, enemyTargetable: true, combatSupport: true, combatTargetTypes: ["su33", "cruiseWeapon"], start: { x: -900, z: -2300 }, exit: { x: 0, z: -7600 }, altitude: 1800, speed: 260, spacing: 240, holdAtExit: true, radioSpeaker: "epoch" }
      ],
      guard: {
        readout: "integrity", label: "HOME FLEET", lossPenalty: 500, hitPenalty: 80,
        lossBanner: "HOME FLEET SHIP LOST", failBanner: "EPOCH LOST",
        lossRadio: "護衛艦喪失。残存艦をEPOCHの防空圏へ寄せる！",
        failRadio: "EPOCH沈没。HOME FLEET防衛任務を中止する。",
        asmRadio: "対艦ミサイル接近！ HOME FLEETへ向かっている——海面上の小型反応を迎撃せよ！"
      }
    },
    sequence: [
      {
        types: ["tu22m3", "tu22m3", "tu22m3", "tu22m3"], tgt: true, band: 1, idBase: 1610,
        label: "BACKFIRE SEA STRIKE", missionTag: "m16Bomber", hunt: "ship", purpose: "hunt", role: "line", skill: "regular",
        at: [...anchors.bomberEntry], altitude: 680, facing: [...anchors.fleetCenter],
        radio: [{ speaker: "meridian", priority: "CRITICAL", text: "低空にTu-22M3四。SSGNと挟撃する対艦打撃隊だ。HOME FLEETへ到達させるな。", id: "m16-bomber-contact" }]
      },
      {
        types: ["awacs"], tgt: false, concurrent: true, delay: 0, rankNeutral: false, band: 1, idBase: 1630,
        label: "OCEAN EYE", missionTag: "m16Recon", role: "support", skill: "regular", purpose: "support",
        at: [...anchors.reconStation], altitude: 5200, facing: [...anchors.fleetCenter]
      },
      {
        types: ["su33", "su33"], tgt: false, concurrent: true, delay: 18, band: 1, idBase: 1640,
        label: "SEA FLANKER 1", missionTag: "m16SeaFlanker", role: "line", skill: "regular", purpose: "screen", protectTag: "m16Bomber", commitRange: 6000, leashRange: 10400,
        at: [...anchors.northCap], altitude: 2300, facing: [...anchors.fleetCenter]
      },
      {
        types: ["su33", "su33"], tgt: false, concurrent: true, delay: 48, band: 2, idBase: 1650,
        label: "SEA FLANKER 2", missionTag: "m16SeaFlanker", role: "line", skill: "regular", purpose: "screen", protectTag: "m16Bomber", commitRange: 6000, leashRange: 10400,
        at: [...anchors.southCap], altitude: 2500, facing: [...anchors.fleetCenter]
      },
      {
        types: ["su33", "su33"], tgt: false, concurrent: true, delay: 86, band: 3, idBase: 1660,
        label: "SEA FLANKER 3", missionTag: "m16SeaFlanker", role: "line", skill: "veteran", purpose: "screen", protectTag: "m16Bomber", commitRange: 6400, leashRange: 11000,
        at: [-9800, -7600], altitude: 2800, facing: [...anchors.fleetCenter]
      }
    ],
    m16FleetContract,
    fixedRadio: [
      { id: "m16_intro_01", at: 2, speaker: "epoch", priority: "NORMAL", text: "CVN EPOCH。RAVEN、よく戻った。HOME FLEET全艦の損傷情報をデータリンクへ送る。" },
      { id: "m16_intro_02", at: 6, speaker: "meridian", priority: "CRITICAL", text: "潜水艦発射警報。SSGNは発射時だけ浮上する。水上反応が出た短い間に叩け。" },
      { id: "m16_surface", event: "m16SsgnSurface", speaker: "lark", priority: "URGENT", text: "SSGN浮上、発射筒開放！ 潜る前に叩いて！" },
      { id: "m16_recon_down", event: "m16ReconDown", speaker: "meridian", priority: "NORMAL", text: "敵偵察機撃墜。次の潜水艦発射解を遅らせた。" },
      { id: "m16_weapon_launch", event: "m16WeaponLaunch", speaker: "epoch", priority: "CRITICAL", text: "対艦巡航兵器を探知。海面上の小型反応、接触前に撃ち落とせ！" },
      { id: "m16_first_intercept", event: "m16FirstIntercept", speaker: "lark", priority: "NORMAL", text: "巡航兵器一発破壊！ 同じ高度に残りが来る！" },
      { id: "m16_gibor", event: "m16GiborPraise", speaker: "epoch", priority: "NORMAL", text: "甲板からRAVENへ。こちらでは今、君を“GIBOR”と呼び始めた。聞こえるか、この歓声が。" },
      { id: "m16_ssgn_clear", event: "m16SsgnClear", speaker: "meridian", priority: "CRITICAL", text: "SSGN二隻撃沈。残る脅威は低空対艦打撃隊。" }
    ],
    successRadio: { speaker: "meridian", priority: "CRITICAL", text: "SSGNと対艦打撃隊を排除。EPOCH生存、HOME FLEET防衛成功。", id: "m16-success" },
    failureRadio: { speaker: "meridian", priority: "CRITICAL", text: "CVN EPOCH喪失。HOME FLEET防衛任務失敗。", id: "m16-failure" },
    parTime: 540,
    hasOutro: false,
    map: { x: 0.64, y: 0.17 },
    battleCenter: { x: anchors.battleCenter[0], z: anchors.battleCenter[1] },
    battleRadius: 19000,
    briefing: "CVN EPOCH、防空巡洋艦一、フリゲート二を対艦攻撃から防衛せよ。四隻の合計耐久力をHOME FLEETゲージへ表示する。EPOCH喪失で即時MISSION FAILED。\nSSGN二隻は巡航兵器発射時だけ浮上し、その間だけ赤TGTとして攻撃可能。敵偵察機OCEAN EYEを撃墜すれば次の発射解が遅れる。潜水艦とTu-22M3から最大八発の海面追随巡航兵器が発射される。巡航兵器は爆撃機・潜水艦撃破後も独立した白い小型航空反応として残り、通常ミサイルで迎撃可能。\nSu-33六は護衛戦力で非TGT。全SSGNとTu-22M3四を排除し、EPOCHを生存させれば任務達成。艦隊残存戦力はM20の補給・増援へ反映される。"
  };
  ctx.addMission(mission, { after: "sera-m15" });
}
