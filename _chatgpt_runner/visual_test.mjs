import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const baseUrl = process.env.SORTIE_BASE_URL || 'http://127.0.0.1:4173';
const outputDir = process.env.SORTIE_ARTIFACT_DIR || path.resolve('artifacts');
const beforeUrl = `${baseUrl}/index.before.html`;
const afterUrl = `${baseUrl}/index.html`;
const presets = ['archipelagoDay', 'sunsetOcean', 'nightBase', 'glacierCanyon'];
const views = [
  { name: 'low', y: 120, pitch: -5 },
  { name: 'mid', y: 680, pitch: -15 },
  { name: 'high', y: 1800, pitch: -34 },
];
const viewOrigins = {
  archipelagoDay: { x: 0, z: 720, yaw: 0 },
  sunsetOcean: { x: 0, z: 720, yaw: 0 },
  glacierCanyon: { x: 0, z: 900, yaw: 0 },
  nightBase: { x: 0, z: 420, yaw: 32 },
};

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  browser: {},
  invariants: {},
  fps: {},
  oceanProbes: {},
  memory: {},
  textureReports: {},
  console: { before: [], after: [] },
  pageErrors: { before: [], after: [] },
  screenshots: [],
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function finiteNumber(value, label) {
  assert(Number.isFinite(value), `${label} is not finite: ${value}`);
  return value;
}

function nearlyEqual(a, b, tolerance = 1e-5) {
  return Math.abs(a - b) <= tolerance;
}

async function ensureDir(directory) {
  await fs.mkdir(directory, { recursive: true });
}

function attachDiagnostics(page, label) {
  page.on('console', (message) => {
    if (message.type() === 'error') {
      report.console[label].push({ type: message.type(), text: message.text() });
    }
  });
  page.on('pageerror', (error) => {
    report.pageErrors[label].push(String(error?.stack || error));
  });
}

async function newGamePage(browser, url, label) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  await context.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_) {
      // Static test origin should allow storage, but storage is not a visual gate.
    }
  });
  const page = await context.newPage();
  attachDiagnostics(page, label);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForFunction(() => Boolean(window.__game?.debug?.forceWorld), null, { timeout: 120_000 });
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.dataset.visualGate = 'true';
    style.textContent = `
      #audioHint, #missionBanner, #bigBanner, #radioPanel, #shootCue,
      #cloudVeil, #damageFlash { display: none !important; }
    `;
    document.head.appendChild(style);
  });
  await page.waitForTimeout(250);
  return { context, page };
}

async function waitFrames(page, count = 3) {
  await page.evaluate((frames) => new Promise((resolve) => {
    let remaining = frames;
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), count);
}

async function forceWorld(page, preset) {
  const result = await page.evaluate((key) => window.__game.debug.forceWorld(key), preset);
  assert(result === true, `forceWorld(${preset}) failed`);
  await waitFrames(page, 4);
  const active = await page.evaluate(() => window.__game.debug.worldTextureReport().preset);
  assert(active === preset, `expected world ${preset}, got ${active}`);
}

async function worldSignature(page, preset) {
  await forceWorld(page, preset);
  return page.evaluate(() => {
    const debug = window.__game.debug;
    const mountains = debug.worldMountains();
    const points = [
      [0, 0], [900, -1200], [-700, -900], [0, 900], [120, -19800],
    ];
    for (const mountain of mountains) {
      points.push([mountain.x, mountain.z]);
      points.push([mountain.x + mountain.r * 0.18, mountain.z]);
      points.push([mountain.x, mountain.z - mountain.r * 0.18]);
    }
    return {
      mountains,
      heights: points.map(([x, z]) => ({ x, z, y: debug.surfaceHeightAt(x, z) })),
      texture: debug.worldTextureReport(),
    };
  });
}

function compareSignatures(before, after, preset) {
  assert(before.mountains.length === after.mountains.length,
    `${preset}: mountain count changed (${before.mountains.length} -> ${after.mountains.length})`);
  assert(before.heights.length === after.heights.length,
    `${preset}: surface sample count changed`);
  for (let i = 0; i < before.mountains.length; i += 1) {
    for (const key of ['x', 'z', 'r', 'h']) {
      assert(nearlyEqual(before.mountains[i][key], after.mountains[i][key], 1e-6),
        `${preset}: mountain ${i}.${key} changed (${before.mountains[i][key]} -> ${after.mountains[i][key]})`);
    }
  }
  for (let i = 0; i < before.heights.length; i += 1) {
    const a = before.heights[i];
    const b = after.heights[i];
    assert(nearlyEqual(a.x, b.x, 1e-6) && nearlyEqual(a.z, b.z, 1e-6),
      `${preset}: sample point ${i} changed`);
    assert(nearlyEqual(a.y, b.y, 1e-5),
      `${preset}: surfaceHeightAt changed at (${a.x}, ${a.z}): ${a.y} -> ${b.y}`);
  }
}

async function startMissionForWorld(page, preset) {
  await forceWorld(page, preset);
  const selected = await page.evaluate(() => {
    const debug = window.__game.debug;
    const index = debug.missionIndexOf('m01');
    return { index, moved: debug.forceMissionCursor(index), state: window.__game.state };
  });
  assert(selected.index >= 0 && selected.moved, `could not select m01 for ${preset}`);

  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__game.state === 'briefing', null, { timeout: 15_000 });
  // First press reveals all text; second enters the hangar; third launches.
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__game.state === 'ready', null, { timeout: 15_000 });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__game.state === 'playing', null, { timeout: 30_000 });
  await page.waitForTimeout(3200);
}

async function setView(page, preset, view) {
  const origin = viewOrigins[preset];
  const result = await page.evaluate(({ origin, view }) => {
    const debug = window.__game.debug;
    const aimed = debug.forceAim(origin.yaw, view.pitch);
    const teleported = debug.forceTeleport(origin.x, view.y, origin.z);
    return { aimed, teleported, state: window.__game.state };
  }, { origin, view });
  assert(result.aimed && result.teleported && result.state === 'playing',
    `${preset}/${view.name}: failed to set view`);
  await waitFrames(page, 10);
}

async function measureFps(page, frames = 240) {
  return page.evaluate((sampleFrames) => new Promise((resolve) => {
    const stamps = [];
    const step = (now) => {
      stamps.push(now);
      if (stamps.length >= sampleFrames + 1) {
        const deltas = [];
        for (let i = 1; i < stamps.length; i += 1) deltas.push(stamps[i] - stamps[i - 1]);
        const sorted = [...deltas].sort((a, b) => a - b);
        const trim = Math.floor(sorted.length * 0.05);
        const trimmed = sorted.slice(trim, sorted.length - trim);
        const meanMs = trimmed.reduce((sum, value) => sum + value, 0) / trimmed.length;
        const p95Ms = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
        resolve({
          frames: deltas.length,
          averageFps: 1000 / meanMs,
          meanFrameMs: meanMs,
          p95FrameMs: p95Ms,
          p95Fps: 1000 / p95Ms,
        });
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), frames);
}

function validateOceanProbe(probe, preset) {
  finiteNumber(probe.planeX, `${preset}.planeX`);
  finiteNumber(probe.planeZ, `${preset}.planeZ`);
  assert(nearlyEqual(probe.planeX, probe.camX, 1e-4), `${preset}: ocean plane X does not follow camera`);
  assert(nearlyEqual(probe.planeZ, probe.camZ, 1e-4), `${preset}: ocean plane Z does not follow camera`);
  assert(nearlyEqual(probe.offsetU, probe.driftU + probe.camX / probe.tile, 2e-4),
    `${preset}: ocean colour U is not world-fixed`);
  assert(nearlyEqual(probe.offsetV, probe.driftV - probe.camZ / probe.tile, 2e-4),
    `${preset}: ocean colour V is not world-fixed`);
  assert(nearlyEqual(probe.normalOffsetU, probe.normalDriftU + probe.camX / probe.normalTile, 2e-4),
    `${preset}: base normal U is not world-fixed`);
  assert(nearlyEqual(probe.normalOffsetV, probe.normalDriftV - probe.camZ / probe.normalTile, 2e-4),
    `${preset}: base normal V is not world-fixed`);
  assert(Array.isArray(probe.normalOctaves) && probe.normalOctaves.length === 3,
    `${preset}: expected three ocean normal octaves`);
  for (let i = 0; i < probe.normalOctaves.length; i += 1) {
    const octave = probe.normalOctaves[i];
    assert(nearlyEqual(octave.offsetU, octave.driftU + probe.camX / octave.tile, 2e-4),
      `${preset}: octave ${i} U is not world-fixed`);
    assert(nearlyEqual(octave.offsetV, octave.driftV - probe.camZ / octave.tile, 2e-4),
      `${preset}: octave ${i} V is not world-fixed`);
  }
}

async function captureVisualSet(browser, url, label) {
  const labelDir = path.join(outputDir, label);
  await ensureDir(labelDir);
  for (const preset of presets) {
    // A fresh page per preset keeps mission state and pooled combat objects from
    // bleeding into the next visual sample. The dedicated memory test below is
    // the place where repeated in-page world swaps are exercised.
    const { context, page } = await newGamePage(browser, url, label);
    try {
      await startMissionForWorld(page, preset);
      for (const view of views) {
        await setView(page, preset, view);
        const fileName = `${preset}-${view.name}.png`;
        const filePath = path.join(labelDir, fileName);
        await page.screenshot({ path: filePath, fullPage: false });
        report.screenshots.push({ label, preset, height: view.name, path: `${label}/${fileName}` });
      }
      // Mid-altitude is representative of the normal map's largest on-screen area.
      await setView(page, preset, views[1]);
      const fps = await measureFps(page);
      if (!report.fps[label]) report.fps[label] = {};
      report.fps[label][preset] = fps;
      if (label === 'after') {
        assert(fps.averageFps >= 55,
          `${preset}: average FPS ${fps.averageFps.toFixed(2)} is below 55`);
        const probe = await page.evaluate(() => window.__game.debug.oceanProbe());
        validateOceanProbe(probe, preset);
        report.oceanProbes[preset] = probe;
      }
    } finally {
      await context.close();
    }
  }
}

async function memoryLeakCheck(browser) {
  const { context, page } = await newGamePage(browser, afterUrl, 'after');
  try {
    const laps = [];
    for (let lap = 0; lap < 3; lap += 1) {
      for (const preset of presets) {
        await forceWorld(page, preset);
      }
      await forceWorld(page, presets[0]);
      await waitFrames(page, 8);
      laps.push(await page.evaluate(() => ({
        gpu: window.__game.debug.gpuMemory(),
        textures: window.__game.debug.worldTextureReport(),
      })));
    }
    // The first lap compiles all shader variants. Texture and geometry counts must
    // be stable after that; program count may remain cached but must not grow.
    for (let i = 2; i < laps.length; i += 1) {
      const previous = laps[i - 1].gpu;
      const current = laps[i].gpu;
      assert(current.textures === previous.textures,
        `disposeWorld texture count grew: ${previous.textures} -> ${current.textures}`);
      assert(current.geometries === previous.geometries,
        `disposeWorld geometry count grew: ${previous.geometries} -> ${current.geometries}`);
      assert(current.programs <= previous.programs,
        `shader program count grew after warmup: ${previous.programs} -> ${current.programs}`);
    }
    report.memory = { laps };
  } finally {
    await context.close();
  }
}

async function main() {
  await ensureDir(outputDir);
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
    ],
  });
  report.browser = { version: browser.version() };
  try {
    const baseline = {};
    const candidate = {};

    {
      const { context, page } = await newGamePage(browser, beforeUrl, 'before');
      try {
        for (const preset of presets) baseline[preset] = await worldSignature(page, preset);
      } finally {
        await context.close();
      }
    }
    {
      const { context, page } = await newGamePage(browser, afterUrl, 'after');
      try {
        for (const preset of presets) candidate[preset] = await worldSignature(page, preset);
      } finally {
        await context.close();
      }
    }

    for (const preset of presets) compareSignatures(baseline[preset], candidate[preset], preset);
    report.invariants = {
      surfaceHeightAndMountainPlacement: 'unchanged',
      presets: Object.fromEntries(presets.map((preset) => [preset, {
        mountainCount: candidate[preset].mountains.length,
        sampleCount: candidate[preset].heights.length,
      }])),
    };
    report.textureReports = Object.fromEntries(presets.map((preset) => [preset, candidate[preset].texture]));

    await captureVisualSet(browser, beforeUrl, 'before');
    await captureVisualSet(browser, afterUrl, 'after');
    await memoryLeakCheck(browser);

    assert(report.console.after.length === 0,
      `candidate emitted console errors: ${JSON.stringify(report.console.after)}`);
    assert(report.pageErrors.after.length === 0,
      `candidate emitted page errors: ${JSON.stringify(report.pageErrors.after)}`);

    report.status = 'passed';
  } catch (error) {
    report.status = 'failed';
    report.failure = String(error?.stack || error);
    throw error;
  } finally {
    await fs.writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
