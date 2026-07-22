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
  await page.waitForTimeout(650);
  await key("KeyQ", false);
  const normalYawAfter = await page.evaluate(() => structuredClone(window.__game.player.forward));
  assert(
    Math.abs(headingOf(normalYawAfter) - headingOf(normalYawBefore)) < 0.025,
    "normal mode accepted direct Q/E yaw"
  );

  const normalTurnBefore = await page.evaluate(() => structuredClone(window.__game.player.forward));
  await key("KeyA", true);
  await key("KeyS", true);
  await page.waitForTimeout(1050);
  await key("KeyA", false);
  await key("KeyS", false);
  const normalTurnAfter = await page.evaluate(() => structuredClone(window.__game.player.forward));
  assert(
    Math.abs(headingOf(normalTurnAfter) - headingOf(normalTurnBefore)) > 0.06,
    `normal coordinated turn did not change heading: ${JSON.stringify({ normalTurnBefore, normalTurnAfter })}`
  );
  assert(Math.abs(normalTurnAfter.y - normalTurnBefore.y) > 0.04, "normal pitch input was lost");

  const transitionBefore = await page.evaluate(() => structuredClone(window.__game.player.forward));
  await tapKey("KeyM");
  await page.waitForFunction(() => window.__game?.controlMode === "expert");
  await page.waitForTimeout(50);
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
  await page.waitForTimeout(700);
  await key("KeyQ", false);
  const keyboardYawAfter = await page.evaluate(() => structuredClone(window.__game.player.forward));
  assert(
    headingOf(keyboardYawAfter) < headingOf(keyboardYawBefore) - 0.15,
    `expert Q yaw did not turn left: ${JSON.stringify({ keyboardYawBefore, keyboardYawAfter })}`
  );
  assert(Math.abs(keyboardYawAfter.y) < 0.04, "level expert yaw unexpectedly added pitch");

  await loadReady();
  await tapKey("KeyM");
  await page.waitForFunction(() => window.__game?.controlMode === "expert");
  await start();
  const rollBefore = await page.evaluate(() => structuredClone(window.__game.player.forward));
  await key("KeyA", true);
  await page.waitForTimeout(900);
  await key("KeyA", false);
  const rollAfter = await page.evaluate(() => structuredClone(window.__game.player.forward));
  const bankAfterRoll = await bankDisplay();
  assert(
    Math.abs(headingOf(rollAfter) - headingOf(rollBefore)) < 0.025,
    `expert roll caused automatic yaw: ${JSON.stringify({ rollBefore, rollAfter })}`
  );
  assert(Math.abs(rollAfter.y - rollBefore.y) < 0.025, "expert roll caused automatic pitch");
  assert(bankAfterRoll > 0.55, `expert roll was not accumulated: ${bankAfterRoll}`);
  await page.waitForTimeout(650);
  const bankAfterRelease = await bankDisplay();
  assert(Math.abs(bankAfterRelease - bankAfterRoll) < 0.1, "expert roll auto-leveled after input release");

  const beforeReturnToNormal = await page.evaluate(() => structuredClone(window.__game.player.forward));
  await tapKey("KeyM");
  await page.waitForFunction(() => window.__game?.controlMode === "normal");
  await page.waitForTimeout(50);
  const afterReturnToNormal = await page.evaluate(() => structuredClone(window.__game.player.forward));
  assert(forwardDelta(beforeReturnToNormal, afterReturnToNormal) < 0.035, "expert-to-normal switch snapped flight direction");
  await page.waitForTimeout(900);
  const bankAfterAutoLevel = await bankDisplay();
  assert(bankAfterAutoLevel < bankAfterRelease - 0.15, "normal mode did not resume auto-leveling");

  await loadReady();
  await page.evaluate(() => {
    window.__testPad.buttons[3] = { pressed: true, touched: true, value: 1 };
    window.dispatchEvent(new Event("gamepadconnected"));
  });
  await page.waitForFunction(() => window.__game?.controlMode === "expert");
  await page.evaluate(() => {
    window.__testPad.buttons[3] = { pressed: false, touched: false, value: 0 };
  });
  await page.waitForTimeout(80);
  await start();
  const padYawBefore = await page.evaluate(() => structuredClone(window.__game.player.forward));
  await page.evaluate(() => { window.__testPad.axes[2] = -0.85; });
  await page.waitForTimeout(750);
  await page.evaluate(() => { window.__testPad.axes[2] = 0; });
  const padYawAfter = await page.evaluate(() => ({
    forward: structuredClone(window.__game.player.forward),
    gamepadOnline: document.getElementById("gamepadStatus").classList.contains("connected")
  }));
  assert(
    headingOf(padYawAfter.forward) < headingOf(padYawBefore) - 0.15,
    `expert right-stick yaw did not turn left: ${JSON.stringify({ padYawBefore, padYawAfter })}`
  );
  assert(padYawAfter.gamepadOnline, "gamepad HUD lost connected state");

  await page.waitForTimeout(2500);
  const finalState = await page.evaluate(() => structuredClone(window.__game));
  assert(finalState.state === "playing", `test mission ended unexpectedly: ${finalState.state}`);
  assert(finalState.health === 100, `health regressed during expert controls test: ${finalState.health}`);
  assert(browserProblems.length === 0, browserProblems.join("\n"));
} finally {
  await browser.close();
}
