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

const headingOf = (forward) => Math.atan2(forward.x, -forward.z);
const forwardDelta = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);

const key = async (code, down) => page.evaluate(({ code, down }) => {
  window.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", {
    code,
    bubbles: true,
    cancelable: true
  }));
}, { code, down });

const tapKey = async (code) => {
  await key(code, true);
  await key(code, false);
};

const travel = async (targetDistance, timeoutMs = 30000) => page.evaluate(
  ({ targetDistance, timeoutMs }) => new Promise((resolve, reject) => {
    let previous = { ...window.__game.player.position };
    let distance = 0;
    const started = performance.now();
    const step = () => {
      if (window.__game.state !== "playing") {
        reject(new Error(`game left playing state: ${window.__game.state}`));
        return;
      }
      const current = { ...window.__game.player.position };
      distance += Math.hypot(
        current.x - previous.x,
        current.y - previous.y,
        current.z - previous.z
      );
      previous = current;
      if (distance >= targetDistance) {
        resolve(structuredClone(window.__game));
        return;
      }
      if (performance.now() - started > timeoutMs) {
        reject(new Error(`simulation travel timed out at ${distance}`));
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }),
  { targetDistance, timeoutMs }
);

const bankDisplay = async () => page.evaluate(() => {
  const transform = document.getElementById("pitchLadder").style.transform;
  const match = transform.match(/rotate\(([-+0-9.eE]+)rad\)/);
  return match ? Math.abs(Number(match[1])) : 0;
});

const loadReady = async () => {
  await page.goto("http://127.0.0.1:4173/index.html", { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__game?.state === "ready");
};

const start = async () => {
  await page.click("#startBtn");
  await page.waitForFunction(() => window.__game?.state === "playing");
};

try {
  await loadReady();
  let snapshot = await page.evaluate(() => ({
    game: structuredClone(window.__game),
    text: document.getElementById("controlModeStatus").textContent,
    expertClass: document.getElementById("controlModeStatus").classList.contains("expert")
  }));
  assert(snapshot.game.controlMode === "normal", `default mode was ${snapshot.game.controlMode}`);
  assert(snapshot.text.includes("NORMAL"), `default HUD was ${snapshot.text}`);
  assert(!snapshot.expertClass, "default HUD incorrectly used expert styling");

  await start();
  const normalYawBefore = await page.evaluate(() => structuredClone(window.__game.player.forward));
  await key("KeyQ", true);
  const normalYawState = await travel(90);
  await key("KeyQ", false);
  assert(
    Math.abs(headingOf(normalYawState.player.forward) - headingOf(normalYawBefore)) < 0.01,
    "normal mode accepted direct Q/E yaw"
  );

  const normalTurnBefore = await page.evaluate(() => structuredClone(window.__game.player.forward));
  await key("KeyA", true);
  await key("KeyS", true);
  const normalTurnState = await travel(180);
  await key("KeyA", false);
  await key("KeyS", false);
  assert(
    Math.abs(headingOf(normalTurnState.player.forward) - headingOf(normalTurnBefore)) > 0.05,
    `normal coordinated turn did not change heading: ${JSON.stringify({ normalTurnBefore, after: normalTurnState.player.forward })}`
  );
  assert(Math.abs(normalTurnState.player.forward.y - normalTurnBefore.y) > 0.08, "normal pitch input was lost");

  const transitionBefore = await page.evaluate(() => structuredClone(window.__game.player.forward));
  await tapKey("KeyM");
  await page.waitForFunction(() => window.__game?.controlMode === "expert");
  const transitionAfter = await page.evaluate(() => ({
    forward: structuredClone(window.__game.player.forward),
    text: document.getElementById("controlModeStatus").textContent,
    expertClass: document.getElementById("controlModeStatus").classList.contains("expert")
  }));
  assert(forwardDelta(transitionBefore, transitionAfter.forward) < 0.035, "normal-to-expert switch snapped flight direction");
  assert(transitionAfter.text.includes("EXPERT") && transitionAfter.expertClass, "expert HUD did not update");

  await loadReady();
  await tapKey("KeyM");
  await page.waitForFunction(() => window.__game?.controlMode === "expert");
  await start();
  const keyboardYawBefore = await page.evaluate(() => structuredClone(window.__game.player.forward));
  await key("KeyQ", true);
  const keyboardYawState = await travel(150);
  await key("KeyQ", false);
  assert(
    headingOf(keyboardYawState.player.forward) < headingOf(keyboardYawBefore) - 0.18,
    `expert Q yaw did not turn left: ${JSON.stringify({ keyboardYawBefore, after: keyboardYawState.player.forward })}`
  );
  assert(Math.abs(keyboardYawState.player.forward.y) < 0.04, "level expert yaw unexpectedly added pitch");

  await loadReady();
  await tapKey("KeyM");
  await page.waitForFunction(() => window.__game?.controlMode === "expert");
  await start();
  const rollBefore = await page.evaluate(() => structuredClone(window.__game.player.forward));
  await key("KeyA", true);
  const rollState = await travel(130);
  await key("KeyA", false);
  const bankAfterRoll = await bankDisplay();
  assert(
    Math.abs(headingOf(rollState.player.forward) - headingOf(rollBefore)) < 0.015,
    `expert roll caused automatic yaw: ${JSON.stringify({ rollBefore, after: rollState.player.forward })}`
  );
  assert(Math.abs(rollState.player.forward.y - rollBefore.y) < 0.015, "expert roll caused automatic pitch");
  assert(bankAfterRoll > 0.45, `expert roll was not accumulated: ${bankAfterRoll}`);
  await travel(100);
  const bankAfterRelease = await bankDisplay();
  assert(Math.abs(bankAfterRelease - bankAfterRoll) < 0.08, "expert roll auto-leveled after input release");

  const beforeReturnToNormal = await page.evaluate(() => structuredClone(window.__game.player.forward));
  await tapKey("KeyM");
  await page.waitForFunction(() => window.__game?.controlMode === "normal");
  const afterReturnToNormal = await page.evaluate(() => structuredClone(window.__game.player.forward));
  assert(forwardDelta(beforeReturnToNormal, afterReturnToNormal) < 0.035, "expert-to-normal switch snapped flight direction");
  await travel(170);
  const bankAfterAutoLevel = await bankDisplay();
  assert(bankAfterAutoLevel < bankAfterRelease - 0.12, "normal mode did not resume auto-leveling");

  await loadReady();
  await page.evaluate(() => {
    window.__testPad.buttons[3] = { pressed: true, touched: true, value: 1 };
    window.dispatchEvent(new Event("gamepadconnected"));
  });
  await page.waitForFunction(() => window.__game?.controlMode === "expert");
  await page.evaluate(() => {
    window.__testPad.buttons[3] = { pressed: false, touched: false, value: 0 };
  });
  await start();
  const padYawBefore = await page.evaluate(() => structuredClone(window.__game.player.forward));
  await page.evaluate(() => { window.__testPad.axes[2] = -0.85; });
  const padYawState = await travel(150);
  await page.evaluate(() => { window.__testPad.axes[2] = 0; });
  assert(
    headingOf(padYawState.player.forward) < headingOf(padYawBefore) - 0.18,
    `expert right-stick yaw did not turn left: ${JSON.stringify({ padYawBefore, after: padYawState.player.forward })}`
  );
  const padHud = await page.evaluate(() => document.getElementById("gamepadStatus").classList.contains("connected"));
  assert(padHud, "gamepad HUD lost connected state");

  await loadReady();
  await tapKey("KeyM");
  await page.waitForFunction(() => window.__game?.controlMode === "expert");
  await start();
  const diagonalBefore = await page.evaluate(() => structuredClone(window.__game.player.forward));
  await page.evaluate(() => { window.__testPad.axes = [-0.62, 0.5, -0.58, 0]; });
  const diagonalState = await travel(140);
  await page.evaluate(() => { window.__testPad.axes = [0, 0, 0, 0]; });
  const diagonalBank = await bankDisplay();
  assert(Math.abs(headingOf(diagonalState.player.forward) - headingOf(diagonalBefore)) > 0.08, "expert diagonal input lacked yaw");
  assert(Math.abs(diagonalState.player.forward.y - diagonalBefore.y) > 0.08, "expert diagonal input lacked pitch");
  assert(diagonalBank > 0.18, "expert diagonal input lacked roll");

  const finalState = await page.evaluate(() => structuredClone(window.__game));
  assert(finalState.state === "playing", `test mission ended unexpectedly: ${finalState.state}`);
  assert(finalState.health === 100, `health regressed during expert controls test: ${finalState.health}`);
  assert(browserProblems.length === 0, browserProblems.join("\n"));
} finally {
  await browser.close();
}
