// r07 EYE OF THE STORM に、守るべき実体を置く。
//
// このミッションは元々「守る対象は briefing と無線にしかない」設計だった
// （ミッション定義の注記にそう書いてある）。理由は当時 payload から味方機を
// 出す手段が無かったこと。ホスト側に aircraft 指定を通したので、その穴が
// 埋まった。
//
// 出すのは TU-142 BEAR-F（maritimePatrol）1機。第3便で敵専用機として
// 登録済みの機体をそのまま味方として飛ばす — 露編にとってこれは自軍機であり、
// 塗装は spawnFriendlyTransports が味方色へ寄せる。
//
// 護衛契約は m-escort と同じ一行ルール（守っている機体が全滅したら失敗）に
// 乗るだけで、こちらは1機なので「落とされたら即失敗」になる。
export default function register(ctx) {
  const { AIRCRAFT_TYPES } = ctx.tables;
  const patrol = AIRCRAFT_TYPES.maritimePatrol;
  if (!patrol) {
    throw new Error("[r07] maritimePatrol aircraft is not registered");
  }

  ctx.deployFriendlies("r07", {
    // 嵐の中を北西へ抜ける偵察航路。r07 の敵は band 1（同高度）から上がって
    // くるので、偵察機はその下——雲底620mのすぐ下を這わせる。プレイヤーは
    // 「上の迎撃機を潰しながら、下の1機を生かす」という二層の盤面になる。
    transports: {
      callsign: "PATROL",
      aircraft: "maritimePatrol",
      count: 1,
      vulnerable: true,
      // 機体側の maxHealth をそのまま護衛対象のHPに使う。98の倍数という
      // 既存規約はこの機体の登録時に検証済み。
      hp: patrol.maxHealth,
      // 大型哨戒機なので輸送隊より遅い。嵐の中を這うので急がない。
      speed: 78,
      altitude: 540,
      start: { x: -900, z: 2100 },
      exit: { x: 1400, z: -9800 }
    },
    guard: {
      readout: "count",
      label: "PATROL",
      // 1機しかいないので、失えば作戦そのものが消える。輸送隊1機ぶんより
      // 重く取る（LIFELINE は3機で1500）。
      lossPenalty: 2200,
      hitPenalty: 0,
      lossBanner: "PATROL DOWN",
      failBanner: "RECON LOST",
      lossRadio: "",
      failRadio: "PATROL被撃墜——偵察機を失った。……この嵐を抜けた意味が無くなったぞ。撤収だ。",
      safeRadio: "PATROL、雲を抜けた。写真は持ち帰る。よくやった、IRONBACK。"
    }
  });
}
