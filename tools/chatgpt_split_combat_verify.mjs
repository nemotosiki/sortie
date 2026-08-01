import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import * as THREE from 'three';
import { chromium } from 'playwright';
import { createMissileGuidance } from '../src/combat/missile-guidance.js';

const ROOT = process.cwd();
const BASE_SHA = process.env.BASE_SHA || '079bde72bb3bf877c06faa879f3ae3fad9b4a5d0';
const BASE_ROOT = '/tmp/sortie-combat-base';
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.css': 'text/css', '.png': 'image/png',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg'
};

function stable(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Number(value.toFixed(8));
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

async function serve(root) {
  const resolvedRoot = path.resolve(root);
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(resolvedRoot, url === '/' ? 'index.html' : url);
    if (!path.resolve(file).startsWith(resolvedRoot)) {
      res.writeHead(403); res.end(); return;
    }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, port: server.address().port };
}

async function enterMission(page, key) {
  const navigation = await page.evaluate((missionKey) => {
    const d = window.__game.debug;
    d.clearMissionRecords();
    const campaign = d.campaignOf(missionKey);
    return {
      campaign,
      forceCampaign: d.forceCampaign(campaign),
      confirmCampaign: d.forceConfirmCampaign(),
      selectMission: d.forceSelectMission(missionKey),
      confirmMission: d.forceConfirmMission(),
      state: window.__game.state
    };
  }, key);
  if (!navigation.forceCampaign || !navigation.confirmCampaign || !navigation.selectMission || !navigation.confirmMission) {
    throw new Error(`mission navigation failed: ${JSON.stringify(navigation)}`);
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (await page.evaluate(() => window.__game.state === 'playing')) break;
    await page.keyboard.press('Enter');
    await page.waitForTimeout(120);
  }
  await page.waitForFunction(() => window.__game?.state === 'playing', null, { timeout: 10000 });
  return navigation;
}

async function pageProbe(browser, root) {
  const { server, port } = await serve(root);
  const context = await browser.newContext();
  await context.addInitScript(() => {
    navigator.getGamepads = () => [];
    let seed = 0x5eed1234;
    Math.random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  try {
    await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__game?.debug?.gimbalEval, null, { timeout: 45000 });

    const pure = await page.evaluate(() => {
      const d = window.__game.debug;
      return {
        missions: d.missionKeys(),
        gimbal: [
          d.gimbalEval(0, 400),
          d.gimbalEval(4.5, 400),
          d.gimbalEval(4.51, 400),
          d.gimbalEval(4.5, 750),
          d.gimbalEval(4.5, 751)
        ],
        cap: [0, 125, 375, 750].map((range) => d.gunAssistCapAt(range)),
        forgiveness: [0, 125, 375, 750].map((range) => d.gunForgivenessAt(range)),
        assist: d.gunAssistSim([
          { targetId: 1, angleDeg: 2, range: 120, dt: 1 / 60 },
          { targetId: 1, angleDeg: 2, range: 120, dt: 1 / 60 },
          { targetId: 1, angleDeg: 4.5, range: 750, dt: 0.25 },
          { targetId: 1, angleDeg: 4.51, range: 750, dt: 0.25 },
          { targetId: 2, angleDeg: 1, range: 300, dt: 0.1 },
          { targetId: null, angleDeg: 0, range: 0, dt: 0.1 }
        ]),
        initialGimbal: d.gimbalProbe(),
        initialAssist: d.gunAssistProbe(),
        initialSight: d.gunsightProbe(),
        missileProbe: d.missileProbe(),
        hookNames: [
          'gimbalEval', 'gimbalProbe', 'gunAssistProbe', 'gunAssistCapAt',
          'gunAssistSim', 'gunForgivenessAt', 'gunHitTest', 'gunLeadProbe',
          'gunsightProbe', 'boresightProbe', 'missileProbe'
        ].map((name) => [name, typeof d[name]])
      };
    });

    await enterMission(page, 'm01');
    const live = await page.evaluate(async () => {
      const d = window.__game.debug;
      const ids = d.forceSpawnTypes(['mig21']);
      const id = ids[ids.length - 1];
      d.forceEnemySpeed(id, 0);
      d.forceAimAt(id);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const beforeShot = {
        lead: d.gunLeadProbe(id),
        hit: d.gunHitTest(id),
        radius: d.hitRadiusProbe().find((entry) => entry.id === id),
        sight: d.gunsightProbe(),
        boresight: d.boresightProbe(),
        assist: d.gunAssistProbe()
      };
      d.forceGunFire();
      const afterShot = {
        gimbal: d.gimbalProbe(),
        weapons: { ...window.__game.weapons }
      };
      return { id, beforeShot, afterShot };
    });

    if (errors.length) throw new Error(errors.join('\n'));
    return stable({ pure, live });
  } finally {
    await context.close();
    server.close();
  }
}

function compareJson(before, after, label) {
  const a = JSON.stringify(before);
  const b = JSON.stringify(after);
  if (a !== b) {
    fs.writeFileSync(`/tmp/${label}-before.json`, `${JSON.stringify(before, null, 2)}\n`);
    fs.writeFileSync(`/tmp/${label}-after.json`, `${JSON.stringify(after, null, 2)}\n`);
    throw new Error(`${label} changed; see /tmp/${label}-{before,after}.json`);
  }
}

function verifyMissileKernel() {
  const LOCAL_FORWARD = new THREE.Vector3(0, 0, -1);
  const damping = (k, dt) => 1 - Math.pow(k, dt);
  const forwardOf = (object, out) => out.copy(LOCAL_FORWARD).applyQuaternion(object.quaternion).normalize();
  const config = {
    defaultTurnRate: THREE.MathUtils.degToRad(190),
    defaultMaxSpeed: 520,
    defaultFuse: 16,
    terminalRange: 150,
    terminalSubsteps: 8,
    seekerLossTime: 0.08
  };
  const extracted = createMissileGuidance({ THREE, localForward: LOCAL_FORWARD, forwardOf, damping, ...config });

  function oldKernel() {
    const tmpV1 = new THREE.Vector3();
    const tmpV2 = new THREE.Vector3();
    const tmpV5 = new THREE.Vector3();
    const tmpQ1 = new THREE.Quaternion();
    const tmpSwept = new THREE.Vector3();
    const POPUP_DIVE_RATIO = 1.2;
    const POPUP_MIN_DROP = 60;
    const proximityFuseFor = (target) => {
      if (target.subsystem) return target.spec.hitRadius;
      if (target.surface) return target.spec.hitRadius * 0.35;
      return config.defaultFuse;
    };
    const sweptMissDistance = (from, dir, length, point) => {
      tmpSwept.copy(point).sub(from);
      const along = THREE.MathUtils.clamp(tmpSwept.dot(dir), 0, length);
      return tmpSwept.addScaledVector(dir, -along).length();
    };
    return {
      proximityFuseFor,
      sweptMissDistance,
      stepsFor(missile, target) {
        let steps = 1;
        if (target) {
          if (missile.mesh.position.distanceTo(target.group.position) < config.terminalRange) steps = config.terminalSubsteps;
        } else {
          missile.closing = false;
        }
        return steps;
      },
      step(missile, target, slice) {
        let seekerLostNow = false;
        if (target) {
          tmpV1.copy(target.group.position).sub(missile.mesh.position);
          const distance = tmpV1.length();
          missile.closing = distance < missile.lastTargetDistance;
          missile.lastTargetDistance = distance;
          tmpV1.normalize();
          const seekerRate = missile.turnRate ?? config.defaultTurnRate;
          if (!missile.lost) {
            if (!missile.reattack) {
              if (missile.losValid && slice > 0 && missile.los.angleTo(tmpV1) / slice > seekerRate) {
                missile.lostTime += slice;
                if (missile.lostTime >= config.seekerLossTime) {
                  missile.lost = true;
                  seekerLostNow = true;
                }
              } else {
                missile.lostTime = 0;
              }
            }
            missile.los.copy(tmpV1);
            missile.losValid = true;
            let aim = tmpV1;
            if (missile.popup && !missile.diving) {
              const drop = missile.mesh.position.y - target.group.position.y;
              tmpV5.set(
                target.group.position.x - missile.mesh.position.x,
                0,
                target.group.position.z - missile.mesh.position.z
              );
              const pushover = drop * POPUP_DIVE_RATIO;
              if (drop <= POPUP_MIN_DROP || tmpV5.lengthSq() <= pushover * pushover) missile.diving = true;
              else aim = tmpV5.normalize();
            }
            tmpQ1.setFromUnitVectors(LOCAL_FORWARD, aim);
            missile.mesh.quaternion.rotateTowards(tmpQ1, seekerRate * slice);
          }
        }
        missile.speed = THREE.MathUtils.lerp(
          missile.speed,
          missile.maxSpeed ?? config.defaultMaxSpeed,
          damping(0.012, slice)
        );
        forwardOf(missile.mesh, tmpV2);
        const travel = missile.speed * slice;
        const hit = Boolean(target && sweptMissDistance(
          missile.mesh.position, tmpV2, travel, target.group.position
        ) < proximityFuseFor(target));
        return { direction: tmpV2.clone(), travel, hit, seekerLostNow };
      }
    };
  }

  const reference = oldKernel();
  const targets = [
    { group: { position: new THREE.Vector3(0, 0, -2100) }, spec: { hitRadius: 40 }, surface: true, subsystem: false },
    { group: { position: new THREE.Vector3(15, 80, -900) }, spec: { hitRadius: 12 }, surface: false, subsystem: false }
  ];
  const seed = {
    mesh: { position: new THREE.Vector3(180, 320, 0), quaternion: new THREE.Quaternion() },
    speed: 300, maxSpeed: undefined, turnRate: undefined,
    closing: false, lastTargetDistance: Infinity,
    los: new THREE.Vector3(), losValid: false,
    lostTime: 0, lost: false, reattack: false, popup: true, diving: false
  };
  const clone = (source) => ({
    ...source,
    mesh: { position: source.mesh.position.clone(), quaternion: source.mesh.quaternion.clone() },
    los: source.los.clone()
  });
  const close = (x, y, label) => {
    if (Math.abs(x - y) > 1e-11) throw new Error(`${label}: ${x} != ${y}`);
  };

  for (const [targetIndex, target] of targets.entries()) {
    const a = clone({ ...seed, popup: targetIndex === 0 });
    const b = clone({ ...seed, popup: targetIndex === 0 });
    for (let frame = 0; frame < 420; frame += 1) {
      const sa = reference.stepsFor(a, target);
      const sb = extracted.stepsFor(b, target);
      if (sa !== sb) throw new Error(`substeps mismatch target ${targetIndex} frame ${frame}`);
      const slice = (1 / 60) / sa;
      let stop = false;
      for (let sub = 0; sub < sa; sub += 1) {
        const ra = reference.step(a, target, slice);
        const rb = extracted.step(b, target, slice);
        if (ra.hit !== rb.hit || ra.seekerLostNow !== rb.seekerLostNow) {
          throw new Error(`result mismatch target ${targetIndex} frame ${frame}/${sub}`);
        }
        close(ra.travel, rb.travel, `travel ${targetIndex}/${frame}/${sub}`);
        for (const axis of ['x', 'y', 'z']) close(ra.direction[axis], rb.direction[axis], `dir.${axis} ${targetIndex}/${frame}/${sub}`);
        if (ra.hit) { stop = true; break; }
        a.mesh.position.addScaledVector(ra.direction, ra.travel);
        b.mesh.position.addScaledVector(rb.direction, rb.travel);
        for (const axis of ['x', 'y', 'z']) close(a.mesh.position[axis], b.mesh.position[axis], `pos.${axis}`);
        for (const axis of ['x', 'y', 'z', 'w']) close(a.mesh.quaternion[axis], b.mesh.quaternion[axis], `quat.${axis}`);
        close(a.speed, b.speed, 'speed');
        if (a.diving !== b.diving || a.lost !== b.lost || a.closing !== b.closing) throw new Error('missile state mismatch');
      }
      if (stop) break;
    }
  }

  const air = { spec: { hitRadius: 10 }, surface: false, subsystem: false };
  const ship = { spec: { hitRadius: 40 }, surface: true, subsystem: false };
  const mount = { spec: { hitRadius: 7 }, surface: true, subsystem: true };
  for (const target of [air, ship, mount]) {
    close(reference.proximityFuseFor(target), extracted.proximityFuseFor(target), 'fuse');
  }
  const from = new THREE.Vector3(0, 0, 0);
  const dir = new THREE.Vector3(0, 0, -1);
  const point = new THREE.Vector3(3, 4, -12);
  close(reference.sweptMissDistance(from, dir, 20, point), extracted.sweptMissDistance(from, dir, 20, point), 'swept distance');
}

execFileSync('git', ['worktree', 'add', '--detach', BASE_ROOT, BASE_SHA], { stdio: 'inherit' });
verifyMissileKernel();
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
try {
  const before = await pageProbe(browser, BASE_ROOT);
  const after = await pageProbe(browser, ROOT);
  compareJson(before, after, 'split-combat');
  if (after.pure.missions.length !== 40) throw new Error(`expected 40 missions, found ${after.pure.missions.length}`);
  if (!after.live.beforeShot.hit?.wouldHit) throw new Error('shared lead/hit solution no longer connects');
  for (const [name, type] of after.pure.hookNames) {
    if (type !== 'function') throw new Error(`debug hook ${name} changed type to ${type}`);
  }
  console.log('split-combat: gun/debug contract and missile equations are identical');
} finally {
  await browser.close();
}
