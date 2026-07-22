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
    "--enable-unsafe-swiftshader"
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

const setButton = async (index, pressed) => page.evaluate(({ index, pressed }) => {
  const button = window.__testPad.buttons[index];
  button.pressed = pressed;
  button.touched = pressed;
  button.value = pressed ? 1 : 0;
  window.__testPad.timestamp += 1;
}, { index, pressed });

const tapButton = async (index, hold = 100) => {
  await setButton(index, true);
  await page.waitForTimeout(hold);
  await setButton(index, false);
  await page.waitForTimeout(130);
};

await page.goto("http://127.0.0.1:4173/index.html", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__game?.state === "ready");
assert(await page.locator("#gamepadStatus").innerText() === "GAMEPAD ONLINE", "virtual standard gamepad was not detected");

await page.click("#startBtn");
await page.waitForFunction(() => window.__game?.state === "playing" && window.__game.enemies.length === 3);
await page.waitForTimeout(250);

const before = await page.evaluate(() => ({
  mode: window.__game.controlMode,
  camera: window.__game.cameraMode,
  selected: window.__game.selectedTargetId,
  health: window.__game.health
}));
assert(before.mode === "normal", `unexpected initial control mode: ${before.mode}`);
assert(before.camera === "chase", `unexpected initial camera: ${before.camera}`);

// Triangle/Y (standard index 3) must select the next target, not change camera or control mode.
await tapButton(3);
const afterTriangle = await page.evaluate(() => ({
  mode: window.__game.controlMode,
  camera: window.__game.cameraMode,
  selected: window.__game.selectedTargetId
}));
assert(afterTriangle.selected !== null, "Triangle did not select a target");
assert(afterTriangle.camera === before.camera, "Triangle incorrectly changed camera");
assert(afterTriangle.mode === before.mode, "Triangle incorrectly changed control mode");

// Square/X (standard index 2) must change camera, not target.
await tapButton(2);
const afterSquare = await page.evaluate(() => ({
  mode: window.__game.controlMode,
  camera: window.__game.cameraMode,
  selected: window.__game.selectedTargetId
}));
assert(afterSquare.camera !== afterTriangle.camera, "Square did not change camera");
assert(afterSquare.selected === afterTriangle.selected, "Square incorrectly changed target");
assert(afterSquare.mode === afterTriangle.mode, "Square incorrectly changed control mode");

// Share/View (standard index 8) retains the NORMAL/EXPERT toggle after freeing Triangle.
await tapButton(8);
await page.waitForFunction(() => window.__game?.controlMode === "expert");

// Cross/A (0) is held as the gun input. The runtime should remain healthy while firing.
await setButton(0, true);
await page.waitForTimeout(300);
await setButton(0, false);
await page.waitForTimeout(100);
assert(await page.evaluate(() => window.__game.state === "playing"), "Cross gun input disrupted gameplay");

// Circle/B (1) is the missile edge. Without a lock it must not alter the target/camera or throw.
const beforeCircle = await page.evaluate(() => ({
  missiles: window.__game.missiles,
  camera: window.__game.cameraMode,
  selected: window.__game.selectedTargetId
}));
await tapButton(1);
const afterCircle = await page.evaluate(() => ({
  missiles: window.__game.missiles,
  camera: window.__game.cameraMode,
  selected: window.__game.selectedTargetId
}));
assert(afterCircle.missiles === beforeCircle.missiles, "unlocked Circle missile unexpectedly consumed ammunition");
assert(afterCircle.camera === beforeCircle.camera, "Circle incorrectly changed camera");
assert(afterCircle.selected === beforeCircle.selected, "Circle incorrectly changed target");

// Keyboard bindings remain unchanged.
await page.keyboard.press("c");
await page.waitForFunction((previous) => window.__game.cameraMode !== previous, afterCircle.camera);
const keyboardCamera = await page.evaluate(() => window.__game.cameraMode);
await page.keyboard.press("Tab");
await page.waitForTimeout(150);
assert(await page.evaluate(() => window.__game.selectedTargetId !== null), "Tab target selection stopped working");
await page.keyboard.press("m");
await page.waitForFunction(() => window.__game.controlMode === "normal");
assert(keyboardCamera !== afterCircle.camera, "C camera binding stopped working");

await page.waitForTimeout(2200);
const finalState = await page.evaluate(() => ({ state: window.__game.state, health: window.__game.health }));
assert(finalState.state === "playing", `game unexpectedly left playing state: ${JSON.stringify(finalState)}`);
assert(finalState.health === 100, `idle health regression: ${JSON.stringify(finalState)}`);
assert(browserProblems.length === 0, `browser problems: ${browserProblems.join(" | ")}`);

await browser.close();
