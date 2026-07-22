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
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 }));
  window.__testPad = {
    id: "Virtual Standard Gamepad",
    index: 0,
    connected: true,
    mapping: "standard",
    timestamp: 0,
    axes: [0, 0, 0, 0],
    buttons,
    vibrationActuator: null,
    hapticActuators: []
  };
  Object.defineProperty(navigator, "getGamepads", {
    configurable: true,
    value: () => window.__testPad.connected ? [window.__testPad] : []
  });
});

const setButton = async (index, pressed) => {
  await page.evaluate(({ index, pressed }) => {
    const button = window.__testPad.buttons[index];
    button.pressed = pressed;
    button.touched = pressed;
    button.value = pressed ? 1 : 0;
    window.__testPad.timestamp += 1;
  }, { index, pressed });
  await page.waitForTimeout(80);
};

try {
  await page.goto("http://127.0.0.1:4173/index.html", { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__game?.state === "ready");
  await page.click("#startBtn");
  await page.waitForFunction(
    () => window.__game?.state === "playing" && window.__game.enemies.length === 3
  );
  await page.waitForFunction(() => window.__game.lock.targetId !== null, null, { timeout: 5000 });

  const initial = await page.evaluate(() => ({
    speed: window.__game.player.speed,
    fov: window.__game.cameraFov,
    debug: { ...window.__game.debug },
    targetId: window.__game.lock.targetId
  }));
  assert(Math.abs(initial.speed - 170) < 2, `unexpected initial speed: ${JSON.stringify(initial)}`);
  assert(Math.abs(initial.fov - 64) < 0.8, `unexpected initial FOV: ${JSON.stringify(initial)}`);
  assert(initial.debug.particleCapacity === 680, `particle cap mismatch: ${JSON.stringify(initial.debug)}`);

  // C must keep the arrow visible before and after long-hold camera focus activates.
  await page.keyboard.down("c");
  await page.waitForTimeout(300);
  const cEarly = await page.evaluate(() => ({
    arrow: { ...window.__game.hud.targetArrow },
    focus: { ...window.__game.cameraFocus }
  }));
  assert(cEarly.arrow.active, `C hold did not show arrow early: ${JSON.stringify(cEarly)}`);

  await page.waitForFunction(
    () => window.__game.cameraFocus.active === true && window.__game.cameraFocus.source === "keyboard",
    null,
    { timeout: 2500 }
  );
  await page.waitForTimeout(650);
  const cLong = await page.evaluate(() => ({
    arrow: { ...window.__game.hud.targetArrow },
    focus: { ...window.__game.cameraFocus }
  }));
  assert(cLong.focus.active, `C long-hold focus dropped: ${JSON.stringify(cLong)}`);
  assert(cLong.arrow.active, `C arrow disappeared after focus activation: ${JSON.stringify(cLong)}`);
  assert(["onscreen", "edge"].includes(cLong.arrow.mode),
    `C arrow mode invalid: ${JSON.stringify(cLong)}`);
  await page.keyboard.up("c");
  await page.waitForFunction(
    () => window.__game.hud.targetArrow.active === false && window.__game.cameraFocus.active === false
  );

  // Triangle/Y must have the same persistent momentary behavior.
  await setButton(3, true);
  await page.waitForTimeout(300);
  const yEarly = await page.evaluate(() => ({
    arrow: { ...window.__game.hud.targetArrow },
    focus: { ...window.__game.cameraFocus }
  }));
  assert(yEarly.arrow.active, `Triangle/Y hold did not show arrow early: ${JSON.stringify(yEarly)}`);

  await page.waitForFunction(
    () => window.__game.cameraFocus.active === true && window.__game.cameraFocus.source === "gamepad",
    null,
    { timeout: 2500 }
  );
  await page.waitForTimeout(650);
  const yLong = await page.evaluate(() => ({
    arrow: { ...window.__game.hud.targetArrow },
    focus: { ...window.__game.cameraFocus }
  }));
  assert(yLong.focus.active, `Triangle/Y long-hold focus dropped: ${JSON.stringify(yLong)}`);
  assert(yLong.arrow.active, `Triangle/Y arrow disappeared after focus activation: ${JSON.stringify(yLong)}`);
  await setButton(3, false);
  await page.waitForFunction(
    () => window.__game.hud.targetArrow.active === false && window.__game.cameraFocus.active === false
  );

  // Destroy the initial center target with a locked missile and verify pooled feedback.
  await page.waitForFunction(() => window.__game.lock.locked === true, null, { timeout: 6000 });
  await page.keyboard.press("Enter");
  await page.waitForFunction(
    () => window.__game.kills >= 1 &&
      window.__game.debug.activeParticles > 0 &&
      window.__game.debug.activeCombatPopups > 0,
    null,
    { timeout: 9000 }
  );
  const feedback = await page.evaluate(() => ({
    kills: window.__game.kills,
    debug: { ...window.__game.debug },
    popupText: document.querySelector(".combatPopup")?.textContent || ""
  }));
  assert(feedback.debug.destroyedEnemies === feedback.kills,
    `destroyed count debug mismatch: ${JSON.stringify(feedback)}`);
  assert(feedback.debug.activeParticles <= feedback.debug.particleCapacity,
    `particle cap exceeded: ${JSON.stringify(feedback)}`);
  assert(feedback.debug.activeSparkParticles > 0 && feedback.debug.activeDebrisParticles > 0,
    `explosion pools did not activate: ${JSON.stringify(feedback)}`);
  assert(feedback.popupText.includes("DESTROYED") && feedback.popupText.includes("+1000"),
    `destroyed popup missing: ${JSON.stringify(feedback)}`);
  assert(Number.isFinite(feedback.debug.activeAudioSources),
    `active audio source count missing: ${JSON.stringify(feedback)}`);

  // Acceleration should build progressively, with FOV widening rather than snapping.
  const speedBeforeBoost = await page.evaluate(() => window.__game.player.speed);
  await page.keyboard.down("Shift");
  await page.waitForTimeout(450);
  const boostEarly = await page.evaluate(() => ({
    speed: window.__game.player.speed,
    fov: window.__game.cameraFov
  }));
  assert(boostEarly.speed > speedBeforeBoost + 35 && boostEarly.speed < 290,
    `boost response is still too abrupt or too weak: ${JSON.stringify({ speedBeforeBoost, boostEarly })}`);
  assert(boostEarly.fov > 64.3 && boostEarly.fov < 70,
    `early boost FOV response invalid: ${JSON.stringify(boostEarly)}`);

  await page.waitForTimeout(2400);
  const boostLate = await page.evaluate(() => ({
    speed: window.__game.player.speed,
    fov: window.__game.cameraFov
  }));
  assert(boostLate.speed > 320 && boostLate.speed < 341,
    `boost did not build toward top speed: ${JSON.stringify(boostLate)}`);
  assert(boostLate.fov > 69.5 && boostLate.fov <= 73,
    `high-speed FOV bonus missing: ${JSON.stringify(boostLate)}`);

  await page.keyboard.up("Shift");
  await page.waitForTimeout(450);
  const coastEarly = await page.evaluate(() => ({
    speed: window.__game.player.speed,
    fov: window.__game.cameraFov
  }));
  assert(coastEarly.speed > 230,
    `speed snapped back to cruise: ${JSON.stringify(coastEarly)}`);
  assert(coastEarly.fov > 66,
    `FOV snapped back too quickly: ${JSON.stringify(coastEarly)}`);

  await page.waitForFunction(
    () => window.__game.player.speed < 178 && window.__game.cameraFov < 66,
    null,
    { timeout: 6500 }
  );
  const recovered = await page.evaluate(() => ({
    speed: window.__game.player.speed,
    fov: window.__game.cameraFov,
    state: window.__game.state,
    health: window.__game.health,
    debug: { ...window.__game.debug }
  }));
  assert(recovered.state === "playing" && recovered.health > 0,
    `mission ended during regression: ${JSON.stringify(recovered)}`);
  assert(recovered.debug.activeParticles <= recovered.debug.particleCapacity,
    `particle cap exceeded after recovery: ${JSON.stringify(recovered)}`);

  await page.waitForTimeout(250);
  assert(browserProblems.length === 0, `browser problems: ${browserProblems.join(" | ")}`);

  console.log(JSON.stringify({
    initial,
    cEarly,
    cLong,
    yEarly,
    yLong,
    feedback,
    boostEarly,
    boostLate,
    coastEarly,
    recovered
  }));
} finally {
  await page.keyboard.up("c").catch(() => {});
  await page.keyboard.up("Shift").catch(() => {});
  await setButton(3, false).catch(() => {});
  await browser.close();
}
