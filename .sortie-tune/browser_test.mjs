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
  // Keep gun hits deterministic and rare during this handling-only regression.
  Math.random = () => 0.99;
});

const setKey = async (code, pressed) => {
  await page.evaluate(({ code, pressed }) => {
    const keyByCode = {
      ControlLeft: "Control",
      KeyS: "s"
    };
    window.dispatchEvent(new KeyboardEvent(pressed ? "keydown" : "keyup", {
      bubbles: true,
      cancelable: true,
      code,
      key: keyByCode[code] || ""
    }));
  }, { code, pressed });
  await page.waitForTimeout(80);
};

try {
  await page.goto("http://127.0.0.1:4173/index.html", { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__game?.state === "ready");
  await page.click("#startBtn");
  await page.waitForFunction(() => window.__game?.state === "playing" && window.__game.enemies.length === 3);

  const initial = await page.evaluate(() => ({
    speed: window.__game.player.speed,
    missiles: window.__game.missiles,
    enemyTypes: window.__game.enemies.map((enemy) => enemy.type).sort()
  }));
  assert(initial.missiles === 10, `missile capacity regressed: ${initial.missiles}`);
  assert(JSON.stringify(initial.enemyTypes) === JSON.stringify(["bison", "lancer", "viper"]),
    `enemy variants regressed: ${initial.enemyTypes}`);

  // Straight full brake should settle around 128 without entering the warning or stall envelope.
  await setKey("ControlLeft", true);
  await page.waitForFunction(() => {
    const game = window.__game;
    return game.player.speed >= 123 && game.player.speed <= 133 &&
      game.flight.stalling === false && game.flight.stallSeverity < 0.08;
  }, null, { timeout: 5000 });
  await page.waitForTimeout(700);

  const brakeBand = await page.evaluate(() => ({
    speed: window.__game.player.speed,
    stalling: window.__game.flight.stalling,
    severity: window.__game.flight.stallSeverity,
    turnFactor: window.__game.flight.turnFactor,
    warningActive: document.getElementById("stallWarning").classList.contains("active"),
    warningText: document.getElementById("stallWarning").textContent
  }));
  assert(brakeBand.speed >= 123 && brakeBand.speed <= 133,
    `full brake did not hold the safe dogfight band: ${JSON.stringify(brakeBand)}`);
  assert(!brakeBand.stalling && brakeBand.severity < 0.08,
    `full brake alone caused a stall: ${JSON.stringify(brakeBand)}`);
  assert(!brakeBand.warningActive,
    `full brake alone raised a stall warning: ${JSON.stringify(brakeBand)}`);
  assert(brakeBand.turnFactor > 1.2,
    `safe low-speed turn advantage is too weak: ${JSON.stringify(brakeBand)}`);

  // A sustained maximum pull while braking adds induced drag and should still produce a recoverable stall.
  await setKey("KeyS", true);
  await page.waitForFunction(() => window.__game.flight.stalling === true, null, { timeout: 6500 });
  const highGStall = await page.evaluate(() => ({
    speed: window.__game.player.speed,
    stalling: window.__game.flight.stalling,
    severity: window.__game.flight.stallSeverity,
    warningActive: document.getElementById("stallWarning").classList.contains("active")
  }));
  assert(highGStall.stalling && highGStall.warningActive,
    `high-G brake pull did not enter the stall state: ${JSON.stringify(highGStall)}`);
  assert(highGStall.speed < 96,
    `high-G induced drag did not cross the warning band: ${JSON.stringify(highGStall)}`);

  // Releasing the pull while still holding brake should recover because the steady brake target is above recovery speed.
  await setKey("KeyS", false);
  await page.waitForFunction(() => {
    const game = window.__game;
    return game.player.speed > 116 && !game.flight.stalling && game.flight.stallSeverity < 0.12;
  }, null, { timeout: 6500 });
  const brakeRecovery = await page.evaluate(() => ({
    speed: window.__game.player.speed,
    stalling: window.__game.flight.stalling,
    severity: window.__game.flight.stallSeverity
  }));
  assert(brakeRecovery.speed < 135,
    `stall recovery while braking overshot the dogfight band: ${JSON.stringify(brakeRecovery)}`);

  // Releasing brake should return smoothly to cruise instead of snapping or remaining trapped at low speed.
  await setKey("ControlLeft", false);
  await page.waitForFunction(() => window.__game.player.speed > 160, null, { timeout: 5000 });
  const cruiseRecovery = await page.evaluate(() => ({
    speed: window.__game.player.speed,
    stalling: window.__game.flight.stalling,
    severity: window.__game.flight.stallSeverity,
    state: window.__game.state,
    health: window.__game.health
  }));
  assert(cruiseRecovery.speed < 180,
    `cruise recovery overshot unexpectedly: ${JSON.stringify(cruiseRecovery)}`);
  assert(cruiseRecovery.state === "playing" && cruiseRecovery.health > 0,
    `mission ended during handling regression: ${JSON.stringify(cruiseRecovery)}`);

  await page.waitForTimeout(250);
  assert(browserProblems.length === 0, `browser problems: ${browserProblems.join(" | ")}`);

  console.log(JSON.stringify({ initial, brakeBand, highGStall, brakeRecovery, cruiseRecovery }));
} finally {
  await setKey("KeyS", false).catch(() => {});
  await setKey("ControlLeft", false).catch(() => {});
  await browser.close();
}
