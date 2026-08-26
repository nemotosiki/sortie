#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.argv[1], "../..");
const guidanceSource = fs.readFileSync(
  path.join(root, "src/combat/missile-guidance.js"),
  "utf8"
);

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details === null ? "" : `\n${JSON.stringify(details, null, 2)}`;
  throw new Error(`check_predictive_missile_guidance: ${message}${suffix}`);
}

class Vector3 {
  constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
  get isVector3() { return true; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { return this.set(v.x, v.y, v.z); }
  clone() { return new Vector3(this.x, this.y, this.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  lerp(v, t) {
    this.x += (v.x - this.x) * t;
    this.y += (v.y - this.y) * t;
    this.z += (v.z - this.z) * t;
    return this;
  }
  crossVectors(a, b) {
    return this.set(
      a.y * b.z - a.z * b.y,
      a.z * b.x - a.x * b.z,
      a.x * b.y - a.y * b.x
    );
  }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  lengthSq() { return this.dot(this); }
  length() { return Math.sqrt(this.lengthSq()); }
  normalize() { const length = this.length(); return length > 0 ? this.multiplyScalar(1 / length) : this; }
  setLength(value) { return this.normalize().multiplyScalar(value); }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
  applyQuaternion(q) {
    const x = this.x, y = this.y, z = this.z;
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    const ix = qw * x + qy * z - qz * y;
    const iy = qw * y + qz * x - qx * z;
    const iz = qw * z + qx * y - qy * x;
    const iw = -qx * x - qy * y - qz * z;
    this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    return this;
  }
}

class Quaternion {
  constructor(x = 0, y = 0, z = 0, w = 1) { this.set(x, y, z, w); }
  set(x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; return this; }
  copy(q) { return this.set(q.x, q.y, q.z, q.w); }
  normalize() {
    const length = Math.hypot(this.x, this.y, this.z, this.w);
    return length > 0
      ? this.set(this.x / length, this.y / length, this.z / length, this.w / length)
      : this.set(0, 0, 0, 1);
  }
  dot(q) { return this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w; }
  angleTo(q) { return 2 * Math.acos(Math.min(1, Math.abs(this.dot(q)))); }
  setFromUnitVectors(from, to) {
    let r = from.dot(to) + 1;
    if (r < Number.EPSILON) {
      r = 0;
      if (Math.abs(from.x) > Math.abs(from.z)) this.set(-from.y, from.x, 0, r);
      else this.set(0, -from.z, from.y, r);
    } else {
      this.set(
        from.y * to.z - from.z * to.y,
        from.z * to.x - from.x * to.z,
        from.x * to.y - from.y * to.x,
        r
      );
    }
    return this.normalize();
  }
  slerp(q, t) {
    if (t <= 0) return this;
    if (t >= 1) return this.copy(q);
    let cos = this.dot(q);
    let qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    if (cos < 0) { cos = -cos; qx = -qx; qy = -qy; qz = -qz; qw = -qw; }
    if (cos > 0.9995) {
      return this.set(
        this.x + t * (qx - this.x),
        this.y + t * (qy - this.y),
        this.z + t * (qz - this.z),
        this.w + t * (qw - this.w)
      ).normalize();
    }
    const theta = Math.acos(cos);
    const sinTheta = Math.sin(theta);
    const a = Math.sin((1 - t) * theta) / sinTheta;
    const b = Math.sin(t * theta) / sinTheta;
    return this.set(
      this.x * a + qx * b,
      this.y * a + qy * b,
      this.z * a + qz * b,
      this.w * a + qw * b
    );
  }
  rotateTowards(q, step) {
    const angle = this.angleTo(q);
    if (angle === 0) return this;
    return this.slerp(q, Math.min(1, step / angle));
  }
}

class Group {
  constructor() { this.position = new Vector3(); this.quaternion = new Quaternion(); }
}

const THREE = {
  Vector3,
  Quaternion,
  Group,
  MathUtils: {
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    lerp: (a, b, t) => a + (b - a) * t,
    smoothstep: (value, min, max) => {
      const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
      return t * t * (3 - 2 * t);
    },
    degToRad: (degrees) => degrees * Math.PI / 180,
    radToDeg: (radians) => radians * 180 / Math.PI
  }
};

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sortie-predictive-guidance-"));
const modulePath = path.join(tempDir, "missile-guidance.mjs");
try {
  fs.writeFileSync(modulePath, guidanceSource, "utf8");
  const guidanceModule = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  const localForward = new Vector3(0, 0, -1);
  const forwardOf = (object, out) => out.copy(localForward)
    .applyQuaternion(object.quaternion)
    .normalize();

  // The missile crosses x=10 at t=0.5 while the target crosses y=0 at the
  // same instant. Testing only the target endpoint would report 10m; relative
  // continuous collision must report the actual zero-distance crossing.
  const collisionProbe = guidanceModule.createMissileGuidance({
    THREE,
    localForward,
    forwardOf,
    damping: () => 1,
    defaultTurnRate: THREE.MathUtils.degToRad(75),
    maxTurnRate: THREE.MathUtils.degToRad(75),
    defaultMaxSpeed: 556,
    defaultFuse: 16,
    terminalRange: 150,
    terminalSubsteps: 8
  });
  const crossingDistance = collisionProbe.movingTargetMissDistance(
    new Vector3(0, 0, 0),
    new Vector3(1, 0, 0),
    20,
    new Vector3(10, -10, 0),
    new Vector3(0, -20, 0),
    1
  );
  assert(crossingDistance < 1e-9, "relative swept collision missed a crossing", crossingDistance);
  const pnCommand = collisionProbe.proportionalNavigationAccelerationFor(
    new Vector3(1000, 0, 0),
    new Vector3(-300, 0, 250),
    new Vector3(1, 0, 0),
    3,
    new Vector3()
  );
  assert(
    pnCommand.z > 0 && Math.abs(pnCommand.x) < 1e-9 && Math.abs(pnCommand.y) < 1e-9,
    "PN acceleration did not point into positive target cross-motion",
    pnCommand
  );
  assert(collisionProbe.guidanceAuthorityAt(0.04) === 0, "launch ramp starts with authority");
  assert(collisionProbe.guidanceAuthorityAt(0.24) === 1, "launch ramp does not reach full authority");
  const fastMissile = { speed: 556, turnRate: THREE.MathUtils.degToRad(75) };
  const fastRateDeg = collisionProbe.effectiveAirTurnRateFor(fastMissile) / Math.PI * 180;
  assert(
    fastRateDeg > 50 && fastRateDeg < 51,
    "50G did not limit a 556m/s round to about 50.5deg/s",
    fastRateDeg
  );
  const radarOnlineMissile = {
    speed: 4000 / 3.6,
    turnRate: THREE.MathUtils.degToRad(75),
    maxLateralAcceleration: 150 * guidanceModule.STANDARD_GRAVITY
  };
  const radarOnlineRateDeg = collisionProbe.effectiveAirTurnRateFor(radarOnlineMissile)
    / Math.PI * 180;
  assert(
    Math.abs(radarOnlineRateDeg - 75) < 1e-9,
    "M11 150G authority did not retain the 75deg/s ceiling at 4,000km/h",
    radarOnlineRateDeg
  );

  const groundAimProbe = guidanceModule.createMissileGuidance({
    THREE,
    localForward,
    forwardOf,
    defaultTurnRate: THREE.MathUtils.degToRad(75),
    maxTurnRate: THREE.MathUtils.degToRad(75),
    defaultMaxSpeed: 556,
    defaultFuse: 16,
    terminalRange: 150,
    terminalSubsteps: 8,
    targetPositionOf: (target, out) => {
      out.copy(target.group.position);
      out.y += 8;
      return out;
    }
  });
  const groundTarget = {
    group: new Group(),
    surface: true,
    ground: true,
    spec: { hitRadius: 18 }
  };
  groundTarget.group.position.set(100, 0, 0);
  const groundMissile = {
    mesh: new Group(),
    speed: 260,
    maxSpeed: 556,
    turnRate: THREE.MathUtils.degToRad(75),
    diving: true,
    lost: false,
    lastTargetDistance: Infinity
  };
  groundMissile.mesh.quaternion.setFromUnitVectors(localForward, new Vector3(1, 0, 0));
  const groundGuided = groundAimProbe.step(groundMissile, groundTarget, 0.1);
  assert(
    groundGuided.direction.y > 0.05,
    "ground guidance ignored the above-terrain hitbox centre",
    groundGuided.direction
  );

  function run(range, targetTurnDeg, fps, launchSpeed) {
    const target = {
      group: new Group(),
      surface: false,
      spec: { hitRadius: 10 },
      // Tail-chase baseline: the target begins on the launcher's boresight and
      // follows a sustained turn.  This is the ordinary player shot that must
      // remain reliable; 60deg/s crossing-orbit stress cases belong in the
      // simulator, not in the acceptance gate.
      velocity: new Vector3(250, 0, 0)
    };
    target.group.position.set(range, 0, 0);
    const missile = {
      mesh: new Group(),
      speed: launchSpeed,
      maxSpeed: 556,
      turnRate: THREE.MathUtils.degToRad(75),
      lost: false,
      maxPasses: 1,
      passesStarted: 1,
      reacquireDelay: 0,
      reacquireTimer: 0,
      closing: false,
      wasClosing: false,
      lastTargetDistance: Infinity,
      minTargetDistance: Infinity,
      openingSpeed: 0,
      targetForwardDot: 1,
      overshootTime: 0
    };
    missile.mesh.quaternion.setFromUnitVectors(localForward, new Vector3(1, 0, 0));
    const launchQuaternion = new Quaternion().copy(missile.mesh.quaternion);
    let headingChangeAtPointOne = null;
    const guidance = guidanceModule.createMissileGuidance({
      THREE,
      localForward,
      forwardOf,
      damping: (k, dt) => 1 - Math.pow(k, dt),
      defaultTurnRate: THREE.MathUtils.degToRad(75),
      maxTurnRate: THREE.MathUtils.degToRad(75),
      defaultMaxSpeed: 556,
      defaultFuse: 16,
      terminalRange: 150,
      terminalSubsteps: 8,
      targetVelocityOf: (value, out) => out.copy(value.velocity)
    });
    const dt = 1 / fps;
    const targetTurn = THREE.MathUtils.degToRad(targetTurnDeg) * dt;
    for (let frame = 0; frame < Math.ceil(9.5 * fps); frame += 1) {
      const cos = Math.cos(targetTurn);
      const sin = Math.sin(targetTurn);
      const x = target.velocity.x;
      const z = target.velocity.z;
      target.velocity.x = x * cos + z * sin;
      target.velocity.z = z * cos - x * sin;
      target.group.position.addScaledVector(target.velocity, dt);
      const steps = guidance.stepsFor(missile, target);
      const slice = dt / steps;
      for (let step = 0; step < steps; step += 1) {
        const guided = guidance.step(
          missile,
          target,
          slice,
          steps > 1 && step === 0,
          (steps - step - 1) * slice
        );
        if (guided.hit) {
          return {
            hit: true,
            time: frame * dt,
            terminalCommitted: Boolean(missile.terminalCommitted),
            headingChangeAtPointOne: headingChangeAtPointOne ??
              missile.mesh.quaternion.angleTo(launchQuaternion) / Math.PI * 180
          };
        }
        missile.mesh.position.addScaledVector(guided.direction, guided.travel);
      }
      if (headingChangeAtPointOne === null && frame * dt >= 0.1) {
        headingChangeAtPointOne = missile.mesh.quaternion.angleTo(launchQuaternion) / Math.PI * 180;
      }
    }
    return {
      hit: false,
      time: 9.5,
      terminalCommitted: Boolean(missile.terminalCommitted),
      headingChangeAtPointOne
    };
  }

  const cases = [];
  for (const fps of [30, 60, 120]) {
    for (const range of [600, 900, 1200]) {
      for (const turn of [-24, -12, 0, 12, 24]) {
        for (const launchSpeed of [128, 170, 300, 430]) {
          cases.push({
            fps,
            range,
            turn,
            launchSpeed,
            ...run(range, turn, fps, launchSpeed)
          });
        }
      }
    }
  }
  const misses = cases.filter((entry) => !entry.hit);
  assert(misses.length === 0, "PN guidance missed ordinary sustained-turn cases", misses);
  assert(
    cases.every((entry) => entry.terminalCommitted),
    "air guidance never entered its terminal collision-point phase",
    cases.filter((entry) => !entry.terminalCommitted)
  );
  const abruptLaunches = cases.filter(
    (entry) => entry.headingChangeAtPointOne !== null && entry.headingChangeAtPointOne > 1
  );
  assert(
    abruptLaunches.length === 0,
    "launch ramp allowed an abrupt heading break inside 0.1s",
    abruptLaunches
  );
  const crossingTime = guidanceModule.solveInterceptTime(
    new Vector3(1000, 0, 0),
    new Vector3(0, 0, 250),
    556
  );
  assert(
    crossingTime > 1.9 && crossingTime < 2.1,
    "intercept solver did not lead a crossing target",
    crossingTime
  );

  const safeSeparation = {
    launchProfile: "safe-separation",
    launchPhase: "safe-separation",
    launchPhaseAge: 0
  };
  for (let frame = 0; frame < 8; frame += 1) {
    assert(
      collisionProbe.holdSafeSeparation(safeSeparation, 1 / 60),
      "special surface profile stopped holding before its separation leg ended",
      safeSeparation
    );
  }
  assert(
    safeSeparation.launchPhase === "profile" &&
      !collisionProbe.holdSafeSeparation(safeSeparation, 1 / 60),
    "special surface profile did not hand control to its authored trajectory",
    safeSeparation
  );

  function runVls(fps) {
    const guidance = guidanceModule.createMissileGuidance({
      THREE,
      localForward,
      forwardOf,
      defaultTurnRate: THREE.MathUtils.degToRad(75),
      maxTurnRate: THREE.MathUtils.degToRad(75),
      defaultMaxSpeed: 556,
      defaultFuse: 16,
      terminalRange: 150,
      terminalSubsteps: 8
    });
    const missile = {
      mesh: new Group(),
      speed: 100 / 3.6,
      maxSpeed: 556,
      acceleration: 180,
      turnRate: THREE.MathUtils.degToRad(75),
      launchProfile: "vls",
      launchPhase: "vls-eject",
      launchPhaseAge: 0,
      guidanceAge: 0,
      guidanceTargetRef: null,
      achievedLateralAcceleration: new Vector3(),
      terminalCommitPoint: new Vector3(),
      terminalCommitted: false,
      passesStarted: 1,
      lost: false
    };
    missile.mesh.position.set(0, 13, 0);
    missile.mesh.quaternion.setFromUnitVectors(localForward, new Vector3(0, 1, 0));
    const launchQuaternion = new Quaternion().copy(missile.mesh.quaternion);
    const target = { group: new Group() };
    target.group.position.set(1000, 300, 0);
    const targetVelocity = new Vector3(0, 0, 260);
    const phases = new Set([missile.launchPhase]);
    let ejectHeadingChange = 0;
    const dt = 1 / fps;
    for (let frame = 0; frame < Math.ceil(9.5 * fps); frame += 1) {
      target.group.position.addScaledVector(targetVelocity, dt);
      missile.speed = guidanceModule.accelerateMissileSpeed(
        missile.speed,
        missile.maxSpeed,
        missile.acceleration,
        dt
      );
      const from = missile.mesh.position.clone();
      const direction = guidance.guideAirMissile(
        missile,
        target,
        target.group.position,
        targetVelocity,
        dt
      ).clone();
      phases.add(missile.launchPhase);
      if (frame * dt <= 0.15) {
        ejectHeadingChange = Math.max(
          ejectHeadingChange,
          missile.mesh.quaternion.angleTo(launchQuaternion) / Math.PI * 180
        );
      }
      const travel = missile.speed * dt;
      const missDistance = guidance.movingTargetMissDistance(
        from,
        direction,
        travel,
        target.group.position,
        targetVelocity,
        dt
      );
      missile.mesh.position.addScaledVector(direction, travel);
      if (missDistance < 16) {
        return { hit: true, phases: [...phases], ejectHeadingChange };
      }
    }
    return {
      hit: false,
      phases: [...phases],
      ejectHeadingChange,
      finalPosition: missile.mesh.position
    };
  }

  const vlsCases = [30, 60, 120].map((fps) => ({ fps, ...runVls(fps) }));
  assert(vlsCases.every((entry) => entry.hit), "VLS phased guidance missed its crossing control case", vlsCases);
  assert(
    vlsCases.every((entry) =>
      ["vls-eject", "vls-capture", "vls-blend", "homing"].every(
        (phase) => entry.phases.includes(phase)
      )
    ),
    "VLS guidance skipped a required launch phase",
    vlsCases
  );
  assert(
    vlsCases.every((entry) => entry.ejectHeadingChange < 1e-4),
    "VLS round bent before the 0.18s eject hold completed",
    vlsCases
  );
  console.log("check_predictive_missile_guidance: PASS");
  console.log("  180/180 sustained-turn air intercepts with PN + autopilot response");
  console.log("  launch speeds=128/170/300/430m/s; ranges=600/900/1200m");
  console.log("  target turns=-24..24deg/s; fps=30/60/120");
  console.log("  moving-target relative sweep catches between-frame crossings");
  console.log("  VLS eject/capture/blend/PN phases hit at 30/60/120fps");
  console.log("  LASM/4AGM safe-separation hands off after 0.12s");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
