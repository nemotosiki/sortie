#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.argv[1], "../..");
const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const guidanceSource = fs.readFileSync(path.join(root, "src/combat/missile-guidance.js"), "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`check_qaam_reattack: FAIL - ${message}`);
    process.exit(1);
  }
}

const qaam = indexSource.match(/qaam: Object\.freeze\(\{[\s\S]*?^      \}\),/m)?.[0] || "";
assert(indexSource.includes("const MAX_MISSILE_TURN_RATE_DEG = 75;"), "global missile turn-rate ceiling changed");
assert(
  indexSource.includes("const STANDARD_MISSILE_TURN_RATE_DEG = MAX_MISSILE_TURN_RATE_DEG;"),
  "standard missile must use the global 75 deg/s ceiling"
);
assert(indexSource.includes("const MISSILE_LIFE = 9.5;"), "player standard missile life is not 9.5 seconds");
assert(qaam.includes("turnRateDeg: STANDARD_MISSILE_TURN_RATE_DEG"), "QAAM must turn like normal MSL");
assert(qaam.includes("life: 14"), "QAAM must have the extended 14 second life");
assert(qaam.includes("maxPasses: 2"), "QAAM must have exactly two total pursuit passes");
assert(qaam.includes("reacquireDelay: 0.35"), "QAAM reacquisition coast changed");
assert(!qaam.includes("maxReattacks"), "legacy retry accounting remains in QAAM config");
assert(!qaam.includes("reattack: true"), "old unlimited seeker-loss exemption remains");
assert(
  indexSource.includes("steps > 1 && step === 0"),
  "terminal first-substep range-rate sample guard missing"
);
assert(
  indexSource.includes("missile-guidance.js?v=20260813-launch-phases-1"),
  "browser cache-buster for air PN guidance missing"
);
assert(indexSource.includes("const SHIP_SAM_CLEARANCE = 55;"), "ship-SAM clearance changed");
assert(indexSource.includes("const SHIP_SAM_TERMINAL_RANGE = 180;"), "ship-SAM terminal range changed");
assert(!indexSource.includes("LARGE_SHIP_SAM_MAX_PASSES"), "large-ship SAM still has a QAAM pass override");
assert(!indexSource.includes("LARGE_SHIP_SAM_REACQUIRE_DELAY"), "large-ship SAM still has a QAAM reacquisition delay");
assert(!indexSource.includes("LARGE_SHIP_SAM_LIFE"), "large-ship SAM still has a QAAM lifetime override");
const shipClearancePolicy = indexSource.match(/function usesShipSamClearance[\s\S]*?^    \}/m)?.[0] || "";
assert(shipClearancePolicy.includes('enemy.type === "aegis"'), "Aegis sea-clearance assist is missing");
assert(shipClearancePolicy.includes('enemy.type === "frigate"'), "frigate sea-clearance assist is missing");
assert(shipClearancePolicy.includes("enemy.surface && !enemy.ground"), "ship-SAM clearance must be limited to ships");
assert(indexSource.includes("maxPasses: 1,"), "enemy SAMs are not initialized with one pursuit pass");
assert(indexSource.includes("reacquireDelay: 0,"), "enemy SAMs still initialize a reacquisition coast");
assert(
  indexSource.includes("lifeLimit: shipSamClearance ? MISSILE_LIFE : profile.life"),
  "Aegis/frigate SAM life does not match the player's standard missile"
);
assert(
  indexSource.includes("shipSamClearance ? MISSILE_TURN_RATE : profile.turnRate"),
  "Aegis/frigate SAMs do not use the common 75 deg/s turn authority"
);
assert(
  indexSource.includes("turnRate: cappedMissileTurnRate("),
  "enemy missiles do not enforce the global turn-rate ceiling"
);
assert(
  indexSource.includes("turnRate: cappedMissileTurnRate(THREE.MathUtils.degToRad(PLAYER_SPW.turnRateDeg))"),
  "player SP.W missiles do not enforce the global turn-rate ceiling"
);
assert(
  guidanceSource.includes("Math.min(missile.turnRate ?? defaultTurnRate, maxTurnRate)"),
  "shared guidance kernel does not enforce the global turn-rate ceiling"
);
assert(
  indexSource.includes("sampleMissileOvershoot("),
  "enemy missiles do not use physical overshoot detection"
);
assert(
  indexSource.includes("canSteer = seekerState === SEEKER_STATE.TRACKING ||"),
  "enemy missiles do not resume steering after the one allowed reacquisition"
);
assert(!indexSource.includes("SEEKER_LOSS_TIME"), "legacy angular-overload loss timer remains");
assert(!indexSource.includes("missile.los.angleTo"), "LOS angular demand still causes lock loss");
assert(!indexSource.includes("const overloaded ="), "legacy turn-saturation loss calculation remains");
assert(!guidanceSource.includes("seekerLossTime"), "shared guidance still accepts the old overload timeout");
assert(
  indexSource.includes("const recoveryDrop = missile.speed * (1 - Math.cos(downwardAngle))"),
  "ship-SAM pull-up does not account for speed and turn radius"
);
assert(
  indexSource.includes("tmpV3.y = Math.max(0.35, tmpV3.y);"),
  "ship-SAM clearance recovery has no positive climb command"
);
assert(
  indexSource.includes("else if (!missile.lost && clearanceRecovery)"),
  "ship-SAM has no inertial clearance recovery"
);
assert(
  indexSource.includes('enemy && enemy.surface && (enemy.ground || enemy.type === "missileBoat")'),
  "ground weapons and missile boats must use direct launch attitude"
);
assert(
  indexSource.includes("const directSurfaceLaunch = usesDirectSurfaceMissileLaunch(enemy);"),
  "surface launch path does not apply the direct-launch policy"
);
assert(
  indexSource.includes("root.quaternion.setFromUnitVectors(LOCAL_FORWARD, tmpV10.normalize());"),
  "direct surface launch is not aimed at the actual target point"
);
assert(
  indexSource.includes('usesDirectSurfaceMissileLaunch(enemy)\n            ? "敵ミサイル艇から発射！'),
  "missile-boat radio still calls its launch vertical"
);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sortie-qaam-"));
const modulePath = path.join(tempDir, "missile-guidance.mjs");
try {
  fs.writeFileSync(modulePath, guidanceSource, "utf8");
  const {
    SEEKER_STATE,
    resetMissileOvershootTracking,
    sampleMissileOvershoot,
    updateSeekerState
  } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);

  function missileState(maxPasses, reacquireDelay = 0) {
    const missile = {
      lost: false,
      maxPasses,
      passesStarted: 1,
      reacquireTimer: 0,
      reacquireDelay
    };
    resetMissileOvershootTracking(missile);
    return missile;
  }

  function confirmOvershoot(missile, dt = 0.05) {
    assert(!sampleMissileOvershoot(missile, dt, 500, 1), "first range sample cannot be a miss");
    assert(!sampleMissileOvershoot(missile, dt, 300, 1), "closing range cannot be a miss");
    assert(!sampleMissileOvershoot(missile, dt, 100, 0.2), "closest approach cannot be a miss yet");
    assert(!sampleMissileOvershoot(missile, dt, 110, -0.5), "10m opening is below overshoot hysteresis");
    assert(!sampleMissileOvershoot(missile, dt, 130, -0.5), "overshoot geometry must persist for 0.1s");
    assert(sampleMissileOvershoot(missile, dt, 160, -0.5), "physical overshoot was not confirmed");
  }

  const normal = missileState(1);
  confirmOvershoot(normal);
  assert(
    updateSeekerState(normal, 0.05, true) === SEEKER_STATE.LOST_NOW,
    "normal MSL must end guidance after its first confirmed overshoot"
  );
  assert(normal.lost && normal.passesStarted === 1, "normal MSL unexpectedly gained another pass");

  const crossing = missileState(1);
  sampleMissileOvershoot(crossing, 0.05, 400, 1);
  sampleMissileOvershoot(crossing, 0.05, 200, 1);
  assert(
    !sampleMissileOvershoot(crossing, 0.05, 260, 0.8),
    "opening range while the target remains ahead must not count as an overshoot"
  );
  assert(
    updateSeekerState(crossing, 0.05, false) === SEEKER_STATE.TRACKING,
    "turn saturation/crossing geometry must keep seeker tracking"
  );

  const qaamState = missileState(2, 0.35);
  qaamState.guidanceAge = 1.25;
  qaamState.guidanceTargetRef = { id: "first-pass-target" };
  qaamState.commandedLateralG = 12;
  qaamState.achievedLateralG = 9;
  qaamState.terminalCommitted = true;
  qaamState.terminalCommittedPass = 1;
  confirmOvershoot(qaamState);
  assert(
    updateSeekerState(qaamState, 0.05, true) === SEEKER_STATE.RETRY_STARTED,
    "QAAM first confirmed overshoot must start its second pass"
  );
  assert(!qaamState.lost && qaamState.passesStarted === 2, "QAAM total-pass accounting is wrong");
  assert(
    qaamState.guidanceAge === 0 &&
      qaamState.guidanceTargetRef === null &&
      qaamState.commandedLateralG === 0 &&
      qaamState.achievedLateralG === 0 &&
      !qaamState.terminalCommitted &&
      qaamState.terminalCommittedPass === 0,
    "QAAM carried first-pass PN/autopilot state into reacquisition"
  );
  assert(
    updateSeekerState(qaamState, 0.20, false) === SEEKER_STATE.REACQUIRING,
    "QAAM must coast without target steering during reacquisition"
  );
  assert(
    updateSeekerState(qaamState, 0.15, false) === SEEKER_STATE.REACQUIRED,
    "QAAM must reacquire exactly once after the coast"
  );
  assert(
    qaamState.reacquireTimer === 0 &&
      qaamState.lastTargetDistance === Infinity &&
      qaamState.minTargetDistance === Infinity &&
      !qaamState.wasClosing,
    "second pass must start with fresh closest-approach history"
  );
  confirmOvershoot(qaamState);
  assert(
    updateSeekerState(qaamState, 0.05, true) === SEEKER_STATE.LOST_NOW,
    "QAAM second confirmed overshoot must permanently end guidance"
  );
  assert(qaamState.lost && qaamState.passesStarted === 2, "QAAM accidentally gained a third pass");
  assert(
    updateSeekerState(qaamState, 1, true) === SEEKER_STATE.LOST,
    "lost QAAM must remain lost"
  );

  for (const fps of [30, 60, 120]) {
    const dt = 1 / fps;
    const probe = missileState(1);
    sampleMissileOvershoot(probe, dt, 300, 1);
    sampleMissileOvershoot(probe, dt, 100, 0.2);
    let range = 100;
    let elapsed = 0;
    let confirmed = false;
    for (let frame = 0; frame < fps; frame += 1) {
      range += 300 * dt;
      elapsed += dt;
      if (sampleMissileOvershoot(probe, dt, range, -0.5)) {
        confirmed = true;
        break;
      }
    }
    assert(confirmed, `${fps}fps overshoot never confirmed`);
    assert(elapsed >= 0.1 && elapsed <= 0.2, `${fps}fps overshoot hysteresis drifted to ${elapsed}s`);
  }

  const skipped = missileState(1);
  skipped.wasClosing = true;
  skipped.lastTargetDistance = 100;
  skipped.minTargetDistance = 100;
  skipped.overshootTime = 0.05;
  assert(
    !sampleMissileOvershoot(skipped, 0.002, 140, -0.5, true),
    "skipped terminal sample changed guidance state"
  );
  assert(
    skipped.lastTargetDistance === 140 && skipped.overshootTime === 0.05,
    "skipped terminal sample did not preserve hysteresis while refreshing its baseline"
  );

  console.log("check_qaam_reattack: PASS");
  console.log("  turn ceiling=75deg/s; turn saturation alone never ends guidance");
  console.log("  normal MSL and all enemy SAMs=1 pass; player QAAM=2 total passes");
  console.log("  miss=closing then target behind + opening >=20m/s and >=20m for 0.1s");
  console.log("  overshoot timing checked at 30/60/120fps; no third QAAM pass");
  console.log("  Aegis/frigate match player MSL turn/life, with one pass and sea clearance");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
