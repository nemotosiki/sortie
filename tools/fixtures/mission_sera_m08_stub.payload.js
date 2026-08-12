// Browser-test-only predecessor for the independent M09 feature branch.
// Production integration must supply the real sera-m08 mission instead.
export default function register(ctx) {
  if (ctx.tables.MISSIONS.some((mission) => mission.key === "sera-m08")) return;
  ctx.addMission({
    key: "sera-m08",
    campaign: "sera",
    campaignOrder: 8,
    world: "desertBasin",
    title: "NIGHT AUDIT TEST PREDECESSOR",
    jp: "M09独立ブランチのE2E前提。通常起動へ統合しない。",
    sequence: [],
    parTime: 1,
    hasOutro: false,
    map: { x: 0.5, y: 0.5 }
  });
}
