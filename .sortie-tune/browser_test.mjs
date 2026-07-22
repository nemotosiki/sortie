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
  // Keep enemy hit rolls deterministic and unsuccessful during this handling-only regression.
  Math.random = () => 0.99;
});

const setKey = async (key, pressed) => {
  if (pressed) await page.keyboard.down(key);
  else await page.keyboard.up(key);
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

  // Straight full brake must settle in a safe dogfight band and remain there without a stall warning.
  await setKey("Control", true);
  await page.waitForFunction(() => {
    const game = window.__game;
    return game.player.speed >= 123 && game.player.speed <= 133 &&
      game.flight.stalling === false && game.flight.stallSeverity < 0.08;
  }, null, { timeout: 5000 });
  await page.waitForTimeout(2600);

  const brakeBand = await page.evaluate(() => ({
    speed: window.__game.player.speed,
    stalling: window.__game.flight.stalling,
    severity: window.__game.flight.stallSeverity,
    turnFactor: window.__game.flight.turnFactor,
    warningActive: document.getElementById("stallWarning").classList.contains("active"),
    warningText: document.getElementById("stallWarning").textContent,
    state: window.__game.state,
    health: window.__game.health
  }));
  assert(brakeBand.speed >= 123 && brakeBand.speed <= 133,
    `full brake did not hold the safe dogfight band: ${JSON.stringify(brakeBand)}`);
  assert(!brakeBand.stalling && brakeBand.severity < 0.08,
    `full brake alone caused a stall: ${JSON.stringify(brakeBand)}`);
  assert(!brakeBand.warningActive,
    `full brake alone raised a stall warning: ${JSON.stringify(brakeBand)}`);
  assert(brakeBand.turnFactor > 1.2,
    `safe low-speed turn advantage is too weak: ${JSON.stringify(brakeBand)}`);
  assert(brakeBand.state === "playing" && brakeBand.health > 0,
    `mission ended during the full-brake hold: ${JSON.stringify(brakeBand)}`);

  // Releasing brake should return smoothly to cruise instead of snapping or remaining trapped at low speed.
  await setKey("Control", false);
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
  assert(!cruiseRecovery.stalling && cruiseRecovery.severity < 0.08,
    `cruise recovery retained a stall state: ${JSON.stringify(cruiseRecovery)}`);
  assert(cruiseRecovery.state === "playing" && cruiseRecovery.health > 0,
    `mission ended during cruise recovery: ${JSON.stringify(cruiseRecovery)}`);

  await page.waitForTimeout(250);
  assert(browserProblems.length === 0, `browser problems: ${browserProblems.join(" | ")}`);

  console.log(JSON.stringify({ initial, brakeBand, cruiseRecovery }));
} finally {
  await setKey("Control", false).catch(() => {});
  await browser.close();
}
