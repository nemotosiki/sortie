// Interceptable air-launched cruise weapon used by city and fleet defence
// missions. It is registered as a tiny enemy-only air contact so the shared
// HUD, lock, missile and gun paths can destroy it after its bomber has died.
// Its actual straight-line strike flight is owned by the mission runtime.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES } = ctx.tables;
  const uav = AIRCRAFT_TYPES.uav;
  const transportAI = ENEMY_AI_PROFILES.transport;
  if (!uav || !transportAI) {
    throw new Error("[cruiseWeapon] expected uav and transport templates");
  }

  const theme = {
    primary: 0xd7d9d5,
    secondary: 0x777b80,
    accent: 0xd75a3f,
    canopy: 0x777b80,
    exhaust: 0xffa04a,
    scale: 0.78,
    variant: "cruiseWeapon"
  };

  ctx.addAircraft("cruiseWeapon", {
    ...uav,
    id: "cruiseWeapon",
    label: "CRUISE MISSILE",
    role: "Air-Launched Cruise Weapon",
    tag: "MISSILE",
    enemyOnly: true,
    blurb: "爆撃機から切り離された低空巡航弾。母機を失っても指定区画へ飛び続ける。",
    cruiseSpeed: 210,
    boostSpeed: 210,
    brakeSpeed: 210,
    maxHealth: 34,
    missileCapacity: 0,
    tipSpan: 2.9,
    tipZ: 0.6,
    theme
  }, { order: false });

  ctx.addEnemyProfile("cruiseWeapon", {
    ...transportAI,
    label: "CRUISE MISSILE",
    hitboxScale: 0.52,
    explosionScale: 0.58,
    attackRange: 0,
    fireMin: 999,
    fireSpread: 0,
    radarColor: "#ffffff",
    tracerColor: 0xffffff,
    explosionColor: 0xff9b52,
    theme
  });

  ctx.addAircraftModel("cruiseWeapon", {
    silhouette: "M20 2 L23 8 L23 23 L29 29 L29 32 L23 30 L23 38 L26 42 L14 42 L17 38 L17 30 L11 32 L11 29 L17 23 L17 8 Z",
    build({ geometry, primary, secondary, accent, dark, add, addFlame }) {
      add(geometry.missileBody, primary, 0, 0, 0.2, 1.65, 1.65, 2.8);
      add(geometry.missileNose, secondary, 0, 0, -7.4, 1.55, 1.55, 1.5);
      add(geometry.missileFins, accent, 0, 0, 4.4, 2.35, 2.35, 1.5);
      add(geometry.panel, dark, 0, 0.08, 0.6, 6.2, 0.18, 1.4);
      addFlame(0, 0, 7.8, 0.72, 0.72);
    }
  });
}
