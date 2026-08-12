#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requestedPort = Number(process.env.SORTIE_NAHAR_PORT || 0);
const externalBaseUrl = String(process.env.SORTIE_BASE_URL || "").replace(/\/$/, "");
const screenshotPath = path.resolve(
  process.env.SORTIE_NAHAR_SCREENSHOT || path.join(root, "artifacts", "nahar-strait-quality.png")
);
const missionScreenshotPath = path.resolve(
  process.env.SORTIE_NAHAR_MISSION_SCREENSHOT || path.join(root, "artifacts", "nahar-strait-m04-gameplay.png")
);
const infrastructureScreenshotPath = path.resolve(
  process.env.SORTIE_NAHAR_INFRASTRUCTURE_SCREENSHOT
    || path.join(root, "artifacts", "nahar-strait-infrastructure.png")
);

const playwrightCandidates = [
  process.env.SORTIE_PLAYWRIGHT,
  "playwright",
  "C:/Users/user01/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright"
].filter(Boolean);

function loadPlaywright() {
  for (const candidate of playwrightCandidates) {
    try { return require(candidate); } catch { /* try the next installation */ }
  }
  throw new Error("playwright not found; set SORTIE_PLAYWRIGHT or install playwright");
}

const chromePath = process.env.SORTIE_CHROME
  || "C:/Program Files/Google/Chrome/Application/chrome.exe";

const mime = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".css": "text/css", ".png": "image/png",
  ".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg"
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function serve() {
  const server = http.createServer((request, response) => {
    const requestPath = decodeURIComponent(request.url.split("?")[0]);
    const file = path.join(root, requestPath === "/" ? "index.html" : requestPath);
    if (!path.resolve(file).startsWith(root)) {
      response.writeHead(403); response.end(); return;
    }
    fs.readFile(file, (error, data) => {
      if (error) { response.writeHead(404); response.end("not found"); return; }
      response.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
      response.end(data);
    });
  });
  await new Promise((resolve) => server.listen(requestedPort, "127.0.0.1", resolve));
  return { server, port: server.address().port };
}

const { chromium } = loadPlaywright();
const served = externalBaseUrl ? { server: null, port: null } : await serve();
const baseUrl = externalBaseUrl || `http://127.0.0.1:${served.port}`;
const browser = await chromium.launch({
  executablePath: chromePath,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
});

try {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  await context.addInitScript(() => { navigator.getGamepads = () => []; });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const url = `${baseUrl}/index.html?payloads=payloads/map_naharStrait.payload.js&worldPreview=naharStrait`;
  await page.goto(url, { waitUntil: "load", timeout: 45000 });
  await page.waitForFunction(
    () => window.__game?.debug?.worldDecorators?.().activeOn === "naharStrait",
    null,
    { timeout: 45000 }
  );
  await page.waitForTimeout(2500);

  const probe = await page.evaluate(async () => {
    const decorators = window.__game.debug.worldDecorators();
    const meshIntegrity = window.__game.debug.worldMeshIntegrity();
    const roadSegments = window.__game.debug.worldRoadSegments();
    const roadJunctionCount = window.__game.debug.worldRoadJunctionCount();
    const prefabLots = window.__game.debug.worldPrefabLots();
    const surfaceAudit = {
      shipChannel: [-16000, -6500, -3200, 0, 3200, 6500, 16000]
        .map((x) => ({ x, height: window.__game.debug.surfaceHeightAt(x, 0) })),
      northBeach: [800, 950, 1100].map((z) => ({ z, height: window.__game.debug.surfaceHeightAt(0, z) })),
      southBeach: [-800, -950, -1100].map((z) => ({ z, height: window.__game.debug.surfaceHeightAt(0, z) })),
      cityNorth: window.__game.debug.surfaceHeightAt(5700, 4050),
      citySouth: window.__game.debug.surfaceHeightAt(-6800, -4050),
      backCountryNorth: window.__game.debug.surfaceHeightAt(0, 14000),
      backCountrySouth: window.__game.debug.surfaceHeightAt(0, -14000)
    };
    const requiredRoads = [
      "coast-1", "coast--1",
      "central-boulevard-1", "central-boulevard--1",
      "port-access-1--10500", "port-access--1-9200"
    ];
    const roadBounds = roadSegments.map((segment) => ({
      name: segment.name,
      minX: Math.min(segment.x1, segment.x2) - segment.width * 0.5,
      maxX: Math.max(segment.x1, segment.x2) + segment.width * 0.5,
      minZ: Math.min(segment.z1, segment.z2) - segment.width * 0.5,
      maxZ: Math.max(segment.z1, segment.z2) + segment.width * 0.5
    }));
    const connected = new Set();
    const pending = [];
    const seed = roadBounds.findIndex((bounds) => bounds.name === "central-boulevard-1");
    if (seed >= 0) { connected.add(seed); pending.push(seed); }
    while (pending.length) {
      const current = roadBounds[pending.shift()];
      roadBounds.forEach((candidate, index) => {
        if (connected.has(index)) return;
        const overlaps = current.minX <= candidate.maxX && current.maxX >= candidate.minX
          && current.minZ <= candidate.maxZ && current.maxZ >= candidate.minZ;
        if (overlaps) { connected.add(index); pending.push(index); }
      });
    }
    const roadAudit = {
      count: roadSegments.length,
      missing: requiredRoads.filter((name) => !roadSegments.some((segment) => segment.name === name)),
      invalid: roadSegments.filter((segment) => ![
        segment.x1, segment.z1, segment.x2, segment.z2, segment.width
      ].every(Number.isFinite) || segment.width <= 0),
      disconnected: roadSegments.filter((segment, index) => !connected.has(index)).map((segment) => segment.name),
      bridgeConnections: roadSegments.filter((segment) => segment.name.startsWith("central-boulevard"))
        .map((segment) => ({ name: segment.name, from: [segment.x1, segment.z1], to: [segment.x2, segment.z2] }))
    };
    const prefabCounts = prefabLots.reduce((counts, lot) => {
      counts[lot.archetype] = (counts[lot.archetype] || 0) + 1;
      return counts;
    }, {});
    const prefabRoadOverlaps = [];
    const prefabOverlaps = [];
    const prefabCells = new Map();
    const checkedPairs = new Set();
    prefabLots.forEach((lot, lotIndex) => {
      const lotBounds = {
        minX: lot.x - lot.sx * 0.5,
        maxX: lot.x + lot.sx * 0.5,
        minZ: lot.z - lot.sz * 0.5,
        maxZ: lot.z + lot.sz * 0.5
      };
      roadBounds.forEach((road) => {
        if (lotBounds.minX <= road.maxX && lotBounds.maxX >= road.minX
          && lotBounds.minZ <= road.maxZ && lotBounds.maxZ >= road.minZ) {
          prefabRoadOverlaps.push({ lotIndex, archetype: lot.archetype, road: road.name });
        }
      });
      const cellSize = 260;
      const minCellX = Math.floor(lotBounds.minX / cellSize);
      const maxCellX = Math.floor(lotBounds.maxX / cellSize);
      const minCellZ = Math.floor(lotBounds.minZ / cellSize);
      const maxCellZ = Math.floor(lotBounds.maxZ / cellSize);
      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
          const key = `${cellX}:${cellZ}`;
          const occupants = prefabCells.get(key) || [];
          for (const otherIndex of occupants) {
            const pairKey = otherIndex < lotIndex ? `${otherIndex}:${lotIndex}` : `${lotIndex}:${otherIndex}`;
            if (checkedPairs.has(pairKey)) continue;
            checkedPairs.add(pairKey);
            const other = prefabLots[otherIndex];
            const overlapX = Math.min(lot.x + lot.sx * 0.5, other.x + other.sx * 0.5)
              - Math.max(lot.x - lot.sx * 0.5, other.x - other.sx * 0.5);
            const overlapZ = Math.min(lot.z + lot.sz * 0.5, other.z + other.sz * 0.5)
              - Math.max(lot.z - lot.sz * 0.5, other.z - other.sz * 0.5);
            if (overlapX > 1 && overlapZ > 1) {
              prefabOverlaps.push({ a: otherIndex, b: lotIndex, overlapX, overlapZ });
            }
          }
          occupants.push(lotIndex);
          prefabCells.set(key, occupants);
        }
      }
    });
    const prefabAudit = {
      count: prefabLots.length,
      counts: prefabCounts,
      invalid: prefabLots.filter((lot) => ![lot.x, lot.z, lot.sx, lot.sz, lot.baseY].every(Number.isFinite)
        || lot.sx <= 0 || lot.sz <= 0),
      roadOverlaps: prefabRoadOverlaps,
      buildingOverlaps: prefabOverlaps,
      maxGroundError: prefabLots.reduce((error, lot) => Math.max(
        error,
        Math.abs(lot.baseY - window.__game.debug.surfaceHeightAt(lot.x, lot.z))
      ), 0)
    };
    const caption = [...document.querySelectorAll("div")]
      .map((element) => element.textContent || "")
      .find((text) => text.includes("NAHAR STRAIT") && text.includes("DECOR")) || "";
    const frameTimes = [];
    let previous = performance.now();
    await new Promise((resolve) => {
      let frames = 0;
      const tick = (now) => {
        if (frames > 6) frameTimes.push(now - previous);
        previous = now;
        frames += 1;
        if (frames >= 126) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const averageMs = frameTimes.reduce((sum, value) => sum + value, 0) / Math.max(1, frameTimes.length);
    const sorted = [...frameTimes].sort((a, b) => a - b);
    const p95Ms = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] || 0;
    return {
      decorators,
      meshIntegrity,
      roadAudit,
      roadJunctionCount,
      prefabAudit,
      surfaceAudit,
      caption,
      averageFps: Number((1000 / averageMs).toFixed(1)),
      p95FrameMs: Number(p95Ms.toFixed(2)),
      canvasCount: document.querySelectorAll("canvas").length
    };
  });

  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath, type: "png" });

  assert(pageErrors.length === 0, `page errors: ${pageErrors.join(" | ")}`);
  assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join(" | ")}`);
  assert(probe.decorators.applies.includes("naharStraitWorks"), "Nahar decorator did not apply");
  assert(probe.meshIntegrity.issues.length === 0,
    `mesh integrity failed: ${probe.meshIntegrity.issues.join(" | ")}`);
  assert(probe.meshIntegrity.degenerateTriangles === 0,
    `mesh integrity found ${probe.meshIntegrity.degenerateTriangles} degenerate triangles`);
  assert(probe.roadAudit.missing.length === 0,
    `required connected roads are missing: ${probe.roadAudit.missing.join(", ")}`);
  assert(probe.roadAudit.invalid.length === 0, "road graph contains invalid segments");
  assert(probe.roadAudit.disconnected.length === 0,
    `road segments are disconnected from the bridge network: ${probe.roadAudit.disconnected.join(", ")}`);
  assert(probe.roadAudit.bridgeConnections.length === 2
    && probe.roadAudit.bridgeConnections.every((segment) => Math.abs(segment.from[1]) === 1700),
  "bridge approaches are not connected to both central boulevards");
  assert(probe.roadJunctionCount > 200,
    `road junction patches are incomplete: ${probe.roadJunctionCount}`);
  assert(probe.prefabAudit.invalid.length === 0, "building prefab catalogue contains invalid lots");
  assert(probe.prefabAudit.roadOverlaps.length === 0,
    `building prefabs overlap roads: ${JSON.stringify(probe.prefabAudit.roadOverlaps.slice(0, 8))}`);
  assert(probe.prefabAudit.buildingOverlaps.length === 0,
    `building prefab footprints overlap: ${JSON.stringify(probe.prefabAudit.buildingOverlaps.slice(0, 8))}`);
  assert(probe.prefabAudit.maxGroundError < 0.01,
    `building prefab bases do not follow terrain: max error ${probe.prefabAudit.maxGroundError}`);
  for (const archetype of ["residential", "apartment", "hotel", "office"]) {
    assert(probe.prefabAudit.counts[archetype] > 0, `building prefab archetype ${archetype} is absent`);
  }
  assert(probe.surfaceAudit.shipChannel.every((sample) => Math.abs(sample.height) < 0.001),
    `fleet channel is obstructed: ${JSON.stringify(probe.surfaceAudit.shipChannel)}`);
  assert(Math.abs(probe.surfaceAudit.northBeach[0].height) < 0.001
    && probe.surfaceAudit.northBeach[1].height > 15 && probe.surfaceAudit.northBeach[1].height < 19
    && Math.abs(probe.surfaceAudit.northBeach[2].height - 34) < 0.01,
  `north beach slope is discontinuous: ${JSON.stringify(probe.surfaceAudit.northBeach)}`);
  assert(Math.abs(probe.surfaceAudit.southBeach[0].height) < 0.001
    && probe.surfaceAudit.southBeach[1].height > 15 && probe.surfaceAudit.southBeach[1].height < 19
    && Math.abs(probe.surfaceAudit.southBeach[2].height - 34) < 0.01,
  `south beach slope is discontinuous: ${JSON.stringify(probe.surfaceAudit.southBeach)}`);
  assert(Math.abs(probe.surfaceAudit.cityNorth - 34) < 0.01
    && Math.abs(probe.surfaceAudit.citySouth - 34) < 0.01,
  "city infrastructure is not on the flat coastal shelf");
  assert(probe.surfaceAudit.backCountryNorth > 34 && probe.surfaceAudit.backCountrySouth > 34,
    "back-country relief is missing");
  assert(probe.decorators.textures >= 10, `expected generated scenery textures, got ${probe.decorators.textures}`);
  assert(probe.caption.includes("PAYLOAD PRESET"),
    `preview caption does not identify the payload world: ${JSON.stringify(probe.caption)}`);
  assert(probe.canvasCount >= 2, `preview grid did not initialise (${probe.canvasCount} canvas)`);

  const infrastructureUrl = `${url}&worldPreviewDetail=infrastructure`;
  await page.goto(infrastructureUrl, { waitUntil: "load", timeout: 45000 });
  await page.waitForFunction(
    () => window.__WORLD_PREVIEW__?.sheet === "infrastructure",
    null,
    { timeout: 45000 }
  );
  await page.waitForTimeout(1800);
  await page.screenshot({ path: infrastructureScreenshotPath, type: "png" });
  assert(pageErrors.length === 0, `infrastructure page errors: ${pageErrors.join(" | ")}`);
  assert(consoleErrors.length === 0, `infrastructure console errors: ${consoleErrors.join(" | ")}`);

  const missionPage = await context.newPage();
  missionPage.on("pageerror", (error) => pageErrors.push(String(error)));
  missionPage.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  const missionUrl = `${baseUrl}/index.html?payloads=payloads/map_naharStrait.payload.js,payloads/mission_sera_m04.payload.js`;
  await missionPage.goto(missionUrl, { waitUntil: "load", timeout: 45000 });
  await missionPage.waitForFunction(
    () => window.__game?.debug?.missionKeys?.().includes("sera-m04"),
    null,
    { timeout: 45000 }
  );
  const swapProbe = await missionPage.evaluate(() => {
    const samples = [];
    for (let cycle = 0; cycle < 4; cycle += 1) {
      window.__game.debug.forceWorld("naharStrait");
      {
        const state = window.__game.debug.worldDecorators();
        samples.push({ cycle, world: "naharStrait", roots: state.roots, geometries: state.geometries,
          materials: state.materials, textures: state.textures });
      }
      window.__game.debug.forceWorld("archipelagoDay");
      {
        const state = window.__game.debug.worldDecorators();
        samples.push({ cycle, world: "archipelagoDay", roots: state.roots, geometries: state.geometries,
          materials: state.materials, textures: state.textures });
      }
    }
    window.__game.debug.forceWorld(null);
    return samples;
  });
  for (const worldName of ["naharStrait", "archipelagoDay"]) {
    const samples = swapProbe.filter((entry) => entry.world === worldName);
    const signature = (entry) => `${entry.roots}:${entry.geometries}:${entry.materials}:${entry.textures}`;
    assert(new Set(samples.map(signature)).size === 1,
      `${worldName} resources grew across map swaps: ${samples.map(signature).join(", ")}`);
  }
  const started = await missionPage.evaluate(() => {
    const result = window.__game.forceStartMissionByKey("sera-m04", "f16");
    return { result, state: window.__game.state, mission: window.__game.mission, campaign: window.__game.campaign };
  });
  assert(started.result, `Sera M04 could not start through the production launcher: ${JSON.stringify(started)}`);
  await missionPage.waitForFunction(
    () => window.__game?.mission?.key === "sera-m04" && window.__game?.world?.preset === "naharStrait",
    null,
    { timeout: 45000 }
  );
  await missionPage.waitForTimeout(3200);
  const missionProbe = await missionPage.evaluate(() => {
    const mission = window.__game.mission;
    return {
      mission: {
        key: mission.key,
        title: mission.title,
        wave: mission.wave,
        pendingWaves: mission.pendingWaves,
        totalTargets: mission.totalTargets,
        totalContacts: mission.totalContacts,
        campaign: mission.campaign,
        campaignKeys: mission.campaignKeys
      },
      decorators: window.__game.debug.worldDecorators(),
      m04: window.__game.seraM04Probe()
    };
  });
  await missionPage.screenshot({ path: missionScreenshotPath, type: "png" });
  assert(missionProbe.decorators.applies.includes("naharStraitWorks"), "Nahar decorator is absent in gameplay");
  assert(missionProbe.mission.key === "sera-m04", "M04 gameplay probe is not active");
  assert(missionProbe.m04.liveFleet.length >= 1, "M04 landing fleet did not spawn");
  assert(pageErrors.length === 0, `page errors: ${pageErrors.join(" | ")}`);
  assert(consoleErrors.length === 0, `console errors: ${consoleErrors.join(" | ")}`);

  console.log("check_map_nahar_visual_browser: PASS");
  console.log(JSON.stringify({
    ...probe,
    screenshotPath,
    infrastructureScreenshotPath,
    missionScreenshotPath,
    swapProbe,
    missionProbe
  }, null, 2));
} finally {
  await browser.close();
  if (served.server) await new Promise((resolve) => served.server.close(resolve));
}
