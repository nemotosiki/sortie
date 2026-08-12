// Infantry Fighting Vehicle required by Sera M05 PORT OF ASH.
// Registration only: the mission decides routes, allegiance and target colour.
export default function register(ctx) {
  const { GROUND_TYPES } = ctx.tables;
  const tank = GROUND_TYPES.tank;
  if (!tank) throw new Error("[ground-ifv] expected GROUND_TYPES.tank as the template");

  ctx.addGroundType("ifv", {
    ...tank,
    key: "ifv",
    label: "IFV",
    role: "Infantry Fighting Vehicle",
    hp: 82,
    hitRadius: 15,
    crash: Object.freeze({ halfLen: 4.2, halfBeam: 2.1, top: 3.1 }),
    hitBox: Object.freeze({ x: 5, y: 5, z: 9 }),
    smokeHeight: 3.4,
    aa: null,
    mobile: Object.freeze({
      speed: 19,
      turnRate: tank.mobile.turnRate * 1.12
    }),
    radarColor: "#ffbb70",
    tracerColor: 0xffad62,
    explosionColor: 0xff984f
  });

  ctx.addGroundModel("ifv", {
    build({ geometry, steel, olive, dark, light, add }) {
      // Compact tracked chassis, authored nose-along -Z like the inline tank.
      add(geometry.panel, dark, -2.05, 0.72, 0, 0.9, 1.35, 8.2);
      add(geometry.panel, dark, 2.05, 0.72, 0, 0.9, 1.35, 8.2);
      add(geometry.panel, steel, -2.05, 0.42, 0, 1.05, 0.42, 7.6);
      add(geometry.panel, steel, 2.05, 0.42, 0, 1.05, 0.42, 7.6);
      add(geometry.panel, olive, 0, 1.45, 0.25, 4.1, 1.7, 7.7);
      add(geometry.panel, olive, 0, 1.7, -3.6, 3.9, 1.8, 1.5, -0.5);

      // Low troop compartment and rear access ramp distinguish it from an MBT.
      add(geometry.panel, olive, 0, 2.45, 1.7, 3.9, 1.1, 3.8);
      add(geometry.panel, dark, 0, 2.15, 4.05, 2.5, 1.7, 0.3);
      add(geometry.panel, light, -1.3, 3.1, 2.9, 0.28, 0.28, 0.28);
      add(geometry.panel, light, 1.3, 3.1, 2.9, 0.28, 0.28, 0.28);

      // Small autocannon turret: much lighter than the tank turret and with a
      // thin barrel. It is visual identity only; M05 does not give it AA fire.
      add(geometry.shipCylinder, steel, 0, 2.75, -0.65, 1.05, 0.45, 1.05);
      add(geometry.panel, olive, 0, 3.15, -0.75, 2.0, 0.72, 2.2);
      add(geometry.panel, dark, 0.15, 3.18, -2.65, 0.22, 0.22, 3.8, -0.04);
      add(geometry.panel, light, -0.72, 3.42, -1.05, 0.28, 0.34, 0.5);
    }
  });
}
