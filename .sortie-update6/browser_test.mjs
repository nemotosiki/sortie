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
  Math.random = () => 0.5;
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

const tapButton = async (index, hold = 160, settle = 220) => {
  await setButton(index, true);
  await page.waitForTimeout(hold);
  await setButton(index, false);
  await page.waitForTimeout(settle);
};

const setAxis = async (index, value) => page.evaluate(({ index, value }) => {
  window.__testPad.axes[index] = value;
  window.__testPad.timestamp += 1;
}, { index, value });

await page.goto("http://127.0.0.1:4173/index.html", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__game?.state === "ready");
assert(await page.locator("#gamepadStatus").innerText() === "GAMEPAD ONLINE", "virtual gamepad not detected");

await page.click("#startBtn");
await page.waitForFunction(() => window.__game?.state === "playing" && window.__game.enemies.length === 3);
await page.waitForTimeout(300);

const initial = await page.evaluate(() => ({
  missiles: window.__game.missiles,
  pips: document.querySelectorAll("#missilePips .missilePip").length,
  types: window.__game.enemies.map((enemy) => enemy.type).sort(),
  cameraMode: window.__game.cameraMode,
  health: window.__game.health
}));
assert(initial.missiles === 10, `expected 10 missiles, got ${initial.missiles}`);
assert(initial.pips === 10, `expected 10 missile pips, got ${initial.pips}`);
assert(JSON.stringify(initial.types) === JSON.stringify(["bison", "lancer", "viper"]), `mixed enemy types missing: ${initial.types}`);
assert(initial.health === 100, `initial health changed: ${initial.health}`);

// Square/X remains the camera-cycle button.
await tapButton(2);
const squareCamera = await page.evaluate(() => window.__game.cameraMode);
assert(squareCamera !== initial.cameraMode, "Square/X did not cycle camera");

// Triangle/Y short press cycles target on release.
const beforeTarget = await page.evaluate(() => window.__game.selectedTargetId);
await tapButton(3, 150, 250);
const afterTarget = await page.evaluate(() => window.__game.selectedTargetId);
assert(afterTarget !== null, "Triangle/Y short press did not select a target");
assert(afterTarget !== beforeTarget || beforeTarget === null, "Triangle/Y short press did not cycle target");

// Triangle/Y long hold enters target-view and must not cycle on release.
const targetBeforeLong = afterTarget;
await setButton(3, true);
await page.waitForFunction(() => window.__game.cameraFocus.active === true, null, { timeout: 2500 });
const focusGamepad = await page.evaluate(() => ({ ...window.__game.cameraFocus }));
assert(focusGamepad.source === "gamepad", `unexpected focus source: ${focusGamepad.source}`);
assert(focusGamepad.targetId !== null, "gamepad target view has no target");
await setButton(3, false);
await page.waitForFunction(() => window.__game.cameraFocus.active === false);
await page.waitForTimeout(220);
assert(await page.evaluate(() => window.__game.selectedTargetId) === targetBeforeLong,
  "Triangle/Y long hold incorrectly cycled target on release");

// C short press cycles camera, C long press focuses target without cycling.
const cameraBeforeC = await page.evaluate(() => window.__game.cameraMode);
await page.keyboard.press("KeyC");
await page.waitForTimeout(250);
const cameraAfterC = await page.evaluate(() => window.__game.cameraMode);
assert(cameraAfterC !== cameraBeforeC, "C short press did not cycle camera");

await page.keyboard.down("KeyC");
await page.waitForFunction(() => window.__game.cameraFocus.active === true, null, { timeout: 2500 });
const focusKeyboard = await page.evaluate(() => ({ ...window.__game.cameraFocus }));
assert(focusKeyboard.source === "keyboard", `unexpected keyboard focus source: ${focusKeyboard.source}`);
const cameraDuringCLong = await page.evaluate(() => window.__game.cameraMode);
await page.keyboard.up("KeyC");
await page.waitForFunction(() => window.__game.cameraFocus.active === false);
await page.waitForTimeout(220);
assert(await page.evaluate(() => window.__game.cameraMode) === cameraDuringCLong,
  "C long hold incorrectly cycled camera on release");

// Cross/A still fires the gun continuously.
const shotsBefore = await page.evaluate(() => window.__game.weapons.gunShots);
await setButton(0, true);
await page.waitForTimeout(420);
await setButton(0, false);
await page.waitForTimeout(150);
const shotsAfter = await page.evaluate(() => window.__game.weapons.gunShots);
assert(shotsAfter > shotsBefore, "Cross/A did not fire gun");

// Roll inertia: release stick and verify angular velocity does not snap instantly to zero.
await setAxis(0, -1);
await page.waitForTimeout(620);
await setAxis(0, 0);
await page.waitForTimeout(40);
const rollRateAfterRelease = Math.abs(await page.evaluate(() => window.__game.flight.rollRate));
assert(rollRateAfterRelease > 0.05, `roll inertia missing: ${rollRateAfterRelease}`);

// L2 braking should give a strong low-speed turn advantage before deep stall.
await setButton(6, true);
await page.waitForFunction(() => window.__game.player.speed < 105, null, { timeout: 7000 });
const lowSpeedHandling = await page.evaluate(() => ({
  speed: window.__game.player.speed,
  turnFactor: window.__game.flight.turnFactor
}));
assert(lowSpeedHandling.turnFactor > 1.35,
  `low-speed turn advantage too weak: ${JSON.stringify(lowSpeedHandling)}`);

// Continue braking until stall, with HUD warning.
await page.waitForFunction(() => window.__game.flight.stalling === true, null, { timeout: 7000 });
assert(await page.locator("#stallWarning").evaluate((node) => node.classList.contains("active")),
  "STALL HUD warning not active");
await setButton(6, false);

// R2 acceleration must recover the aircraft from stall.
await setButton(7, true);
await page.waitForFunction(
  () => window.__game.player.speed > 125 && window.__game.flight.stalling === false,
  null,
  { timeout: 8000 }
);
await setButton(7, false);

// Lock-on cues are generated procedurally while lock progress is active.
await page.waitForFunction(() => window.__game.audio.lockBeeps > 0, null, { timeout: 6000 });

// Enemy missile logic should naturally produce an incoming threat during the engagement.
await page.waitForFunction(() => window.__game.weapons.enemyMissilesLaunched > 0, null, { timeout: 16000 });
await page.waitForFunction(() => window.__game.threats.incomingMissiles.length > 0, null, { timeout: 5000 });
const threat = await page.evaluate(() => ({
  launched: window.__game.weapons.enemyMissilesLaunched,
  nearest: window.__game.threats.nearest,
  warning: document.getElementById("missileWarning").textContent,
  active: document.getElementById("missileWarning").classList.contains("active")
}));
assert(threat.launched > 0, "enemy missile launch counter did not increment");
assert(threat.nearest && threat.nearest.distance > 0, "nearest enemy missile threat missing");
assert(threat.active && threat.warning.includes("MISSILE ALERT"), `missile HUD warning missing: ${JSON.stringify(threat)}`);

// Circle/B must not accidentally trigger gun/camera/target.
const beforeCircle = await page.evaluate(() => ({
  shots: window.__game.weapons.gunShots,
  camera: window.__game.cameraMode,
  target: window.__game.selectedTargetId
}));
await tapButton(1);
const afterCircle = await page.evaluate(() => ({
  shots: window.__game.weapons.gunShots,
  camera: window.__game.cameraMode,
  target: window.__game.selectedTargetId
}));
assert(afterCircle.shots === beforeCircle.shots, "Circle/B incorrectly fired gun");
assert(afterCircle.camera === beforeCircle.camera, "Circle/B incorrectly changed camera");
assert(afterCircle.target === beforeCircle.target, "Circle/B incorrectly changed target");

await page.waitForTimeout(250);
assert(browserProblems.length === 0, `browser problems: ${browserProblems.join(" | ")}`);
assert(await page.evaluate(() => window.__game.state) === "playing", "mission unexpectedly ended during regression");

console.log(JSON.stringify({
  initial,
  squareCamera,
  afterTarget,
  focusGamepad,
  focusKeyboard,
  rollRateAfterRelease,
  lowSpeedHandling,
  threat,
  health: await page.evaluate(() => window.__game.health),
  browserProblems
}, null, 2));

await browser.close();
