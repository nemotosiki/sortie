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

try {
  await page.goto("http://127.0.0.1:4173/index.html", { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__game?.state === "ready");
  await page.click("#startBtn");
  await page.waitForFunction(() => window.__game?.state === "playing");

  const initial = await page.evaluate(() => structuredClone(window.__game));
  assert(initial.health === 100, `initial health was ${initial.health}`);
  await page.waitForTimeout(2500);
  const idle = await page.evaluate(() => structuredClone(window.__game));
  assert(idle.state === "playing", `idle state became ${idle.state}`);
  assert(idle.health === 100, `idle health dropped to ${idle.health}`);

  const beforePad = await page.evaluate(() => structuredClone(window.__game));
  await page.evaluate(() => {
    window.__testPad.axes[0] = 0.82;
    window.__testPad.axes[1] = -0.72;
    window.__testPad.buttons[7] = { pressed: true, touched: true, value: 1 };
    window.__testPad.buttons[5] = { pressed: true, touched: true, value: 1 };
    window.dispatchEvent(new Event("gamepadconnected"));
  });
  await page.waitForTimeout(700);
  const afterPad = await page.evaluate(() => ({
    game: structuredClone(window.__game),
    status: document.getElementById("gamepadStatus").textContent,
    connected: document.getElementById("gamepadStatus").classList.contains("connected"),
    axes: [...window.__testPad.axes]
  }));
  const forwardDelta = Math.abs(afterPad.game.player.forward.x - beforePad.player.forward.x) +
    Math.abs(afterPad.game.player.forward.y - beforePad.player.forward.y) +
    Math.abs(afterPad.game.player.forward.z - beforePad.player.forward.z);
  assert(afterPad.connected, "gamepad HUD did not show connected state");
  assert(afterPad.status.includes("ONLINE"), `unexpected gamepad status: ${afterPad.status}`);
  assert(afterPad.game.player.speed > beforePad.player.speed + 8, "right trigger did not boost speed");
  assert(
    forwardDelta > 0.02,
    `left stick did not change aircraft orientation: ${JSON.stringify({
      before: beforePad.player.forward,
      after: afterPad.game.player.forward,
      axes: afterPad.axes,
      state: afterPad.game.state,
      health: afterPad.game.health,
      forwardDelta
    })}`
  );

  await page.evaluate(() => {
    window.__testPad.axes[0] = 0;
    window.__testPad.axes[1] = 0;
    window.__testPad.buttons[7] = { pressed: false, touched: false, value: 0 };
    window.__testPad.buttons[5] = { pressed: false, touched: false, value: 0 };
  });
  const speedBeforeKeyboard = await page.evaluate(() => window.__game.player.speed);
  await page.keyboard.down("Control");
  await page.waitForTimeout(650);
  await page.keyboard.up("Control");
  const speedAfterKeyboard = await page.evaluate(() => window.__game.player.speed);
  assert(speedAfterKeyboard < speedBeforeKeyboard - 8, "keyboard brake stopped working with a gamepad connected");

  assert(browserProblems.length === 0, browserProblems.join("\n"));
} finally {
  await browser.close();
}
