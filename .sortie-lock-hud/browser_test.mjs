import { chromium } from "playwright-core";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN,
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--enable-webgl",
    "--ignore-gpu-blocklist",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--autoplay-policy=no-user-gesture-required"
  ]
});

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const browserProblems = [];
page.on("console", (message) => {
  if (message.type() === "warning" || message.type() === "error") {
    browserProblems.push(`${message.type()}: ${message.text()}`);
  }
});
page.on("pageerror", (error) => browserProblems.push(`pageerror: ${error.message}`));

await page.addInitScript(() => {
  Math.random = () => 0.99;
});

try {
  await page.goto("http://127.0.0.1:4173/index.html", { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__game?.state === "ready");
  await page.click("#startBtn");
  await page.waitForFunction(
    () => window.__game?.state === "playing" && window.__game.enemies.length === 3
  );

  await page.waitForFunction(() => window.__game.lock.targetId === 2, null, { timeout: 5000 });
  await page.waitForFunction(() => {
    const hud = window.__game.hud;
    return hud && hud.visibleEnemyMarkers.length >= 2 &&
      document.querySelectorAll(".enemyMarker.active").length >= 2 &&
      getComputedStyle(document.getElementById("targetBox")).display !== "none";
  }, null, { timeout: 5000 });

  const initialHud = await page.evaluate(() => ({
    lockTargetId: window.__game.lock.targetId,
    markerIds: window.__game.hud.visibleEnemyMarkers.map((marker) => marker.id).sort(),
    activeMarkerCount: document.querySelectorAll(".enemyMarker.active").length,
    targetBoxVisible: getComputedStyle(document.getElementById("targetBox")).display !== "none"
  }));
  assert(initialHud.lockTargetId === 2, `unexpected initial lock target: ${JSON.stringify(initialHud)}`);
  assert(initialHud.activeMarkerCount >= 2, `missing non-lock enemy markers: ${JSON.stringify(initialHud)}`);
  assert(initialHud.targetBoxVisible, `lock target box is not visible: ${JSON.stringify(initialHud)}`);

  await page.keyboard.press("Tab");
  await page.waitForFunction(() => window.__game.selectedTargetId === 3);
  await page.waitForFunction(
    () => window.__game.lock.targetId !== null && window.__game.lock.targetId !== 3,
    null,
    { timeout: 3500 }
  );
  await page.waitForFunction(() => {
    const marker = document.querySelector('.enemyMarker[data-enemy-id="3"]');
    return marker?.classList.contains("active") && marker.classList.contains("selected");
  }, null, { timeout: 2500 });

  const fallbackLock = await page.evaluate(() => ({
    selectedTargetId: window.__game.selectedTargetId,
    lockTargetId: window.__game.lock.targetId,
    lockProgress: window.__game.lock.progress,
    selectedMarkerClass: document.querySelector('.enemyMarker[data-enemy-id="3"]')?.className || ""
  }));
  assert(fallbackLock.selectedTargetId === 3, `manual target selection changed: ${JSON.stringify(fallbackLock)}`);
  assert(fallbackLock.lockTargetId !== null && fallbackLock.lockTargetId !== 3,
    `off-reticle preferred target suppressed fallback locking: ${JSON.stringify(fallbackLock)}`);
  assert(fallbackLock.selectedMarkerClass.includes("selected"),
    `selected enemy marker is not distinguished: ${JSON.stringify(fallbackLock)}`);

  await page.keyboard.press("m");
  await page.waitForFunction(() => window.__game.controlMode === "expert");
  await page.keyboard.down("e");

  const snapshots = [];
  let arrowState = null;
  for (let i = 0; i < 28; i += 1) {
    await page.waitForTimeout(250);
    const snapshot = await page.evaluate(() => {
      const game = window.__game;
      const enemy = game.enemies.find((candidate) => candidate.id === 3);
      const marker = document.querySelector('.enemyMarker[data-enemy-id="3"]');
      return {
        t: performance.now(),
        state: game.state,
        health: game.health,
        selectedTargetId: game.selectedTargetId,
        lockTargetId: game.lock.targetId,
        cameraMode: game.cameraMode,
        controlMode: game.controlMode,
        player: {
          position: { ...game.player.position },
          forward: { ...game.player.forward },
          speed: game.player.speed
        },
        enemy: enemy ? { position: { ...enemy.position }, alive: enemy.alive } : null,
        arrow: { ...game.hud.targetArrow },
        markerClass: marker?.className || ""
      };
    });
    snapshots.push(snapshot);
    if (snapshot.arrow.active && snapshot.arrow.targetId === 3) {
      arrowState = await page.evaluate(() => {
        const arrow = window.__game.hud.targetArrow;
        const element = document.getElementById("targetDirectionArrow");
        return {
          ...arrow,
          selectedTargetId: window.__game.selectedTargetId,
          className: element.className,
          label: document.getElementById("targetDirectionLabel").textContent,
          width: window.innerWidth,
          height: window.innerHeight
        };
      });
      break;
    }
  }
  await page.keyboard.up("e");
  console.log(`TARGET_ARROW_SNAPSHOTS=${JSON.stringify(snapshots)}`);

  assert(arrowState, `off-screen selected target arrow missing; snapshots=${JSON.stringify(snapshots)}`);
  assert(arrowState.active && arrowState.targetId === 3,
    `off-screen selected target arrow missing: ${JSON.stringify(arrowState)}`);
  assert(arrowState.selectedTargetId === 3,
    `selected target changed while displaying arrow: ${JSON.stringify(arrowState)}`);
  assert(arrowState.label.includes("TGT 3"),
    `target direction label missing id: ${JSON.stringify(arrowState)}`);
  assert(arrowState.x >= 35 && arrowState.x <= arrowState.width - 35 &&
    arrowState.y >= 35 && arrowState.y <= arrowState.height - 35,
    `target arrow is outside the viewport: ${JSON.stringify(arrowState)}`);
  assert(
    arrowState.x < 110 || arrowState.x > arrowState.width - 110 ||
    arrowState.y < 110 || arrowState.y > arrowState.height - 110,
    `target arrow is not placed near a screen edge: ${JSON.stringify(arrowState)}`
  );

  await page.waitForTimeout(250);
  assert(browserProblems.length === 0, `browser problems: ${browserProblems.join(" | ")}`);
  assert(await page.evaluate(() => window.__game.state) === "playing",
    "mission unexpectedly ended during targeting regression");

  console.log(JSON.stringify({ initialHud, fallbackLock, arrowState }));
} finally {
  await page.keyboard.up("e").catch(() => {});
  await browser.close();
}
