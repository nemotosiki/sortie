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
  // Keep enemy gun hit rolls deterministic and unsuccessful during the HUD regression.
  Math.random = () => 0.99;
});

try {
  await page.goto("http://127.0.0.1:4173/index.html", { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__game?.state === "ready");
  await page.click("#startBtn");
  await page.waitForFunction(
    () => window.__game?.state === "playing" && window.__game.enemies.length === 3
  );

  // The center aircraft starts inside the reticle; the two flankers receive green HUD boxes.
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

  // Select the right-side BISON. It is outside the narrow lock cone, so the center LANCER
  // must remain available as the active lock candidate instead of the lock being cleared.
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

  // Turn away in EXPERT mode. The selected target should leave the viewport and produce
  // a screen-edge direction arrow while retaining the selected target id.
  await page.keyboard.press("m");
  await page.keyboard.down("e");
  await page.waitForTimeout(1900);
  await page.keyboard.up("e");

  await page.waitForFunction(() => {
    const arrow = window.__game.hud?.targetArrow;
    return arrow?.active && arrow.targetId === 3;
  }, null, { timeout: 4500 });

  const arrowState = await page.evaluate(() => {
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
