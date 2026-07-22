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
};

try {
  await page.goto("http://127.0.0.1:4173/index.html", { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__game?.state === "ready");
  await page.click("#startBtn");
  await page.waitForFunction(
    () => window.__game?.state === "playing" && window.__game.enemies.length === 3
  );
  await page.waitForFunction(() => window.__game.lock.targetId === 2, null, { timeout: 5000 });

  // Select the right-side BISON, then narrow the viewport so it is reliably off-screen.
  await page.keyboard.press("Tab");
  await page.waitForFunction(() => window.__game.selectedTargetId === 3);
  await page.setViewportSize({ width: 190, height: 800 });
  await page.waitForTimeout(500);
  await page.waitForFunction(() => {
    const visibleIds = window.__game.hud?.visibleEnemyMarkers?.map((marker) => marker.id) || [];
    return !visibleIds.includes(3);
  }, null, { timeout: 3000 });

  const idleState = await page.evaluate(() => ({
    selectedTargetId: window.__game.selectedTargetId,
    arrow: { ...window.__game.hud.targetArrow },
    className: document.getElementById("targetDirectionArrow").className
  }));
  assert(idleState.selectedTargetId === 3, `unexpected selected target: ${JSON.stringify(idleState)}`);
  assert(!idleState.arrow.active && !idleState.className.includes("active"),
    `off-screen arrow appeared without hold input: ${JSON.stringify(idleState)}`);

  // C exposes the arrow immediately while held, before the long-press focus threshold.
  await page.keyboard.down("c");
  await page.waitForFunction(
    () => window.__game.hud.targetArrow.active && window.__game.hud.targetArrow.targetId === 3,
    null,
    { timeout: 1800 }
  );
  const keyboardHeld = await page.evaluate(() => ({
    arrow: { ...window.__game.hud.targetArrow },
    focus: { ...window.__game.cameraFocus },
    className: document.getElementById("targetDirectionArrow").className
  }));
  assert(keyboardHeld.arrow.active && keyboardHeld.className.includes("active"),
    `C hold did not expose arrow: ${JSON.stringify(keyboardHeld)}`);
  await page.keyboard.up("c");
  await page.waitForFunction(() => window.__game.hud.targetArrow.active === false);

  // Triangle/Y uses the same momentary behavior and disappears on release.
  await setButton(3, true);
  await page.waitForFunction(() => window.__game.hud.targetArrow.active === true, null, { timeout: 1800 });
  const gamepadHeld = await page.evaluate(() => ({
    arrow: { ...window.__game.hud.targetArrow },
    className: document.getElementById("targetDirectionArrow").className
  }));
  assert(gamepadHeld.arrow.active && gamepadHeld.className.includes("active"),
    `Triangle/Y hold did not expose arrow: ${JSON.stringify(gamepadHeld)}`);
  await setButton(3, false);
  await page.waitForFunction(() => window.__game.hud.targetArrow.active === false);

  // Existing long-hold camera focus remains intact; release clears both transient aids.
  await page.keyboard.down("c");
  await page.waitForFunction(() => window.__game.cameraFocus.active === true, null, { timeout: 2500 });
  const longHold = await page.evaluate(() => ({ ...window.__game.cameraFocus }));
  assert(longHold.source === "keyboard" && longHold.targetId !== null,
    `C long-hold target view regressed: ${JSON.stringify(longHold)}`);
  await page.keyboard.up("c");
  await page.waitForFunction(
    () => window.__game.cameraFocus.active === false && window.__game.hud.targetArrow.active === false
  );

  await page.waitForTimeout(250);
  assert(browserProblems.length === 0, `browser problems: ${browserProblems.join(" | ")}`);
  assert(await page.evaluate(() => window.__game.state) === "playing",
    "mission unexpectedly ended during target-arrow regression");

  console.log(JSON.stringify({ idleState, keyboardHeld, gamepadHeld, longHold }));
} finally {
  await page.keyboard.up("c").catch(() => {});
  await setButton(3, false).catch(() => {});
  await browser.close();
}
