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
const displayedBank = async () => page.evaluate(() => {
  const transform = document.getElementById("pitchLadder").style.transform;
  const match = transform.match(/rotate\(([-+0-9.eE]+)rad\)/);
  return match ? Math.abs(Number(match[1])) : 0;
});

const collectSimulationDistance = async (targetDistance, timeoutMs = 20000) => page.evaluate(
  ({ targetDistance, timeoutMs }) => new Promise((resolve, reject) => {
    const samples = [];
    let lastPosition = { ...window.__game.player.position };
    let traveled = 0;
    const started = performance.now();

    const step = () => {
      const position = { ...window.__game.player.position };
      const forward = { ...window.__game.player.forward };
      traveled += Math.hypot(
        position.x - lastPosition.x,
        position.y - lastPosition.y,
        position.z - lastPosition.z
      );
      lastPosition = position;
      samples.push({ position, forward, traveled });

      if (traveled >= targetDistance) {
        resolve(samples);
        return;
      }
      if (performance.now() - started >= timeoutMs) {
        reject(new Error(`simulation advanced only ${traveled}m before timeout`));
        return;
      }
      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }),
  { targetDistance, timeoutMs }
);

const startFreshMission = async () => {
  await page.waitForFunction(() => window.__game?.state === "ready");
  await page.click("#startBtn");
  await page.waitForFunction(() => window.__game?.state === "playing");
  await page.waitForFunction(() => {
    const position = window.__game?.player?.position;
    if (!position) return false;
    return Math.hypot(position.x, position.y - 260, position.z - 620) < 40;
  });
};

try {
  await page.goto("http://127.0.0.1:4173/index.html", { waitUntil: "networkidle" });
  await startFreshMission();

  const initial = await page.evaluate(() => structuredClone(window.__game));
  assert(initial.health === 100, `initial health was ${initial.health}`);
  await page.waitForTimeout(2500);
  const idle = await page.evaluate(() => structuredClone(window.__game));
  assert(idle.state === "playing", `idle state became ${idle.state}`);
  assert(idle.health === 100, `idle health dropped to ${idle.health}`);

  await page.evaluate(() => {
    window.__testPad.axes[0] = 0.78;
    window.__testPad.axes[1] = 0.34;
    window.dispatchEvent(new Event("gamepadconnected"));
  });

  const turnSamples = await collectSimulationDistance(220);
  const headings = turnSamples.map((sample) => headingOf(sample.forward));
  for (let i = 1; i < headings.length; i += 1) {
    while (headings[i] - headings[i - 1] > Math.PI) headings[i] -= Math.PI * 2;
    while (headings[i] - headings[i - 1] < -Math.PI) headings[i] += Math.PI * 2;
  }
  const headingChange = headings.at(-1) - headings[0];
  const worstBacktrack = Math.min(...headings.slice(1).map((value, index) => value - headings[index]));
  const finalForward = turnSamples.at(-1).forward;
  const bankDuringTurn = await displayedBank();
  const padStatus = await page.evaluate(() => document.getElementById("gamepadStatus").textContent);

  assert(padStatus.includes("ONLINE"), `unexpected gamepad status: ${padStatus}`);
  assert(headingChange > 0.28, `diagonal gamepad input did not create a sustained right turn: ${headingChange}`);
  assert(worstBacktrack > -0.025, `heading reversed during continuous bank input: ${worstBacktrack}`);
  assert(finalForward.y > 0.08, `diagonal gamepad pitch did not raise the nose: ${finalForward.y}`);
  assert(bankDuringTurn > 0.24, `aircraft did not visibly bank during turn: ${bankDuringTurn}`);

  await page.evaluate(() => {
    window.__testPad.axes[0] = 0;
    window.__testPad.axes[1] = 0;
  });
  await collectSimulationDistance(180);
  const bankAfterRelease = await displayedBank();
  assert(bankAfterRelease < 0.08, `auto-level did not settle after releasing roll: ${bankAfterRelease}`);

  await page.reload({ waitUntil: "networkidle" });
  await startFreshMission();
  await page.evaluate(() => {
    document.body.tabIndex = -1;
    document.body.focus();
  });
  await page.keyboard.down("a");
  await page.keyboard.down("s");
  const keyboardSamples = await collectSimulationDistance(160);
  const keyboardBank = await displayedBank();
  await page.keyboard.up("s");
  await page.keyboard.up("a");
  const keyboardForward = keyboardSamples.at(-1).forward;
  const keyboardHeading = headingOf(keyboardForward);
  assert(
    keyboardHeading < -0.24,
    `diagonal keyboard input did not create a left turn: ${JSON.stringify({ keyboardHeading, keyboardForward, keyboardBank })}`
  );
  assert(keyboardForward.y > 0.12, `keyboard pitch did not raise the nose: ${keyboardForward.y}`);
  assert(keyboardBank > 0.24, `keyboard roll did not create a visible bank: ${keyboardBank}`);

  assert(browserProblems.length === 0, browserProblems.join("\n"));
} finally {
  await browser.close();
}
