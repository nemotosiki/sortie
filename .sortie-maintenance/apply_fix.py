from pathlib import Path
import re

path = Path("index.html")
text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one anchor, found {count}")
    text = text.replace(old, new, 1)


replace_once(
    "    @keyframes targetSpin { to { transform: rotate(360deg); } }",
    """    #gamepadStatus {
      position: absolute;
      right: clamp(12px, 2vw, 28px);
      bottom: calc(clamp(160px, 18vw, 210px) + clamp(30px, 4vw, 48px));
      padding: 6px 10px;
      border: 1px solid rgba(157, 247, 255, 0.28);
      background: rgba(3, 15, 25, 0.5);
      color: rgba(181, 241, 248, 0.48);
      font-size: 9px;
      letter-spacing: 0.14em;
      white-space: nowrap;
      transition: color 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
    }

    #gamepadStatus::before {
      content: "";
      display: inline-block;
      width: 6px;
      height: 6px;
      margin-right: 7px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 6px currentColor;
      vertical-align: 1px;
    }

    #gamepadStatus.connected {
      color: #a7ffb1;
      border-color: rgba(167, 255, 177, 0.5);
      box-shadow: inset 0 0 14px rgba(91, 255, 136, 0.08), 0 0 10px rgba(91, 255, 136, 0.08);
    }

    @keyframes targetSpin { to { transform: rotate(360deg); } }""",
    "gamepad status CSS",
)

replace_once(
    '    <div id="boostIndicator">AFTERBURNER</div>\n  </div>',
    '    <div id="boostIndicator">AFTERBURNER</div>\n    <div id="gamepadStatus">GAMEPAD OFFLINE</div>\n  </div>',
    "gamepad status HUD",
)

replace_once(
    '        <div class="controlItem"><strong>OBJECTIVE</strong><span>HPを保ち、全ターゲットを撃墜せよ。</span></div>',
    '        <div class="controlItem"><strong>GAMEPAD</strong><span>左スティック/D-Padで操縦、RT/LTで加減速、RBで機銃、A/LBでミサイル。</span></div>\n        <div class="controlItem"><strong>OBJECTIVE</strong><span>HPを保ち、全ターゲットを撃墜せよ。</span></div>',
    "gamepad help",
)

replace_once(
    "    const RADAR_RANGE = 1400;",
    """    const RADAR_RANGE = 1400;
    const MISSION_GRACE_TIME = 3.0;
    const PLAYER_HIT_COOLDOWN = 0.55;
    const GAMEPAD_DEADZONE = 0.18;""",
    "gameplay constants",
)

replace_once(
    '      boostIndicator: document.getElementById("boostIndicator"),\n      damageFlash: document.getElementById("damageFlash"),',
    '      boostIndicator: document.getElementById("boostIndicator"),\n      gamepadStatus: document.getElementById("gamepadStatus"),\n      damageFlash: document.getElementById("damageFlash"),',
    "gamepad UI reference",
)

replace_once(
    "    let lastRadarForward = new THREE.Vector3(0, 0, -1);",
    """    let lastRadarForward = new THREE.Vector3(0, 0, -1);
    let missionElapsed = 0;
    let playerHitCooldown = 0;

    const gamepadInput = {
      connected: false,
      id: "",
      index: null,
      pitch: 0,
      roll: 0,
      boost: false,
      brake: false,
      gun: false,
      missile: false,
      previousMissile: false,
      previousStart: false
    };""",
    "runtime state",
)

replace_once(
    '    window.addEventListener("resize", resize);',
    '    window.addEventListener("resize", resize);\n    window.addEventListener("gamepadconnected", updateGamepadInput);\n    window.addEventListener("gamepaddisconnected", updateGamepadInput);',
    "gamepad listeners",
)

replace_once(
    """      updateEffects(dt);

      if (gameState === STATE_PLAYING) {
        updatePlayer(dt);""",
    """      updateEffects(dt);
      updateGamepadInput();

      if (gameState === STATE_PLAYING) {
        missionElapsed += dt;
        playerHitCooldown = Math.max(0, playerHitCooldown - dt);
        updatePlayer(dt);""",
    "animation input update",
)

replace_once(
    "    function damping(k, dt) {",
    """    function applyDeadzone(value) {
      const magnitude = Math.abs(Number.isFinite(value) ? value : 0);
      if (magnitude <= GAMEPAD_DEADZONE) return 0;
      return Math.sign(value) * THREE.MathUtils.clamp(
        (magnitude - GAMEPAD_DEADZONE) / (1 - GAMEPAD_DEADZONE),
        0,
        1
      );
    }

    function gamepadButtonValue(gamepad, index) {
      const button = gamepad?.buttons?.[index];
      if (typeof button === "number") return THREE.MathUtils.clamp(button, 0, 1);
      if (!button) return 0;
      const value = Number.isFinite(button.value) ? button.value : (button.pressed ? 1 : 0);
      return THREE.MathUtils.clamp(value, 0, 1);
    }

    function gamepadButtonPressed(gamepad, index, threshold = 0.5) {
      const button = gamepad?.buttons?.[index];
      return Boolean(button?.pressed) || gamepadButtonValue(gamepad, index) >= threshold;
    }

    function setGamepadStatus(connected, id = "") {
      if (gamepadInput.connected === connected && gamepadInput.id === id) return;
      gamepadInput.connected = connected;
      gamepadInput.id = id;
      ui.gamepadStatus.classList.toggle("connected", connected);
      ui.gamepadStatus.textContent = connected ? "GAMEPAD ONLINE" : "GAMEPAD OFFLINE";
      ui.gamepadStatus.title = connected ? id : "No standard gamepad detected";
    }

    function clearGamepadInput() {
      gamepadInput.index = null;
      gamepadInput.pitch = 0;
      gamepadInput.roll = 0;
      gamepadInput.boost = false;
      gamepadInput.brake = false;
      gamepadInput.gun = false;
      gamepadInput.missile = false;
      gamepadInput.previousMissile = false;
      gamepadInput.previousStart = false;
      setGamepadStatus(false, "");
    }

    function updateGamepadInput() {
      let pads = [];
      try {
        pads = typeof navigator.getGamepads === "function" ? (navigator.getGamepads() || []) : [];
      } catch {
        pads = [];
      }

      let selected = null;
      for (const pad of pads) {
        if (pad && pad.connected !== false && pad.mapping === "standard") {
          selected = pad;
          break;
        }
      }
      if (!selected) {
        for (const pad of pads) {
          if (pad && pad.connected !== false) {
            selected = pad;
            break;
          }
        }
      }

      if (!selected) {
        clearGamepadInput();
        return;
      }

      setGamepadStatus(true, selected.id || "Standard Gamepad");
      gamepadInput.index = selected.index;

      const axisX = applyDeadzone(Number(selected.axes?.[0] || 0));
      const axisY = applyDeadzone(Number(selected.axes?.[1] || 0));
      const dpadPitch = (gamepadButtonPressed(selected, 13) ? 1 : 0) -
        (gamepadButtonPressed(selected, 12) ? 1 : 0);
      const dpadRoll = (gamepadButtonPressed(selected, 14) ? 1 : 0) -
        (gamepadButtonPressed(selected, 15) ? 1 : 0);

      gamepadInput.pitch = THREE.MathUtils.clamp(axisY + dpadPitch, -1, 1);
      gamepadInput.roll = THREE.MathUtils.clamp(-axisX + dpadRoll, -1, 1);
      gamepadInput.boost = gamepadButtonValue(selected, 7) > 0.22;
      gamepadInput.brake = gamepadButtonValue(selected, 6) > 0.22;
      gamepadInput.gun = gamepadButtonPressed(selected, 5);

      const missilePressed = gamepadButtonPressed(selected, 0) || gamepadButtonPressed(selected, 4);
      const startPressed = gamepadButtonPressed(selected, 9) || missilePressed;
      const wasPlaying = gameState === STATE_PLAYING;

      if (!wasPlaying && startPressed && !gamepadInput.previousStart) startMission();
      if (wasPlaying && missilePressed && !gamepadInput.previousMissile) launchMissile();

      gamepadInput.missile = missilePressed;
      gamepadInput.previousMissile = missilePressed;
      gamepadInput.previousStart = startPressed;
    }

    function damping(k, dt) {""",
    "gamepad functions",
)

replace_once(
    """      damageFlash = 0;
      cameraShake = 0;
      missileSide = 1;""",
    """      damageFlash = 0;
      cameraShake = 0;
      missileSide = 1;
      missionElapsed = 0;
      playerHitCooldown = 0;""",
    "mission timers reset",
)

replace_once(
    """      const pitchInput = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) -
        (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
      const rollInput = (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) -
        (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0);""",
    """      const keyboardPitch = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) -
        (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
      const keyboardRoll = (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) -
        (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0);
      const pitchInput = THREE.MathUtils.clamp(keyboardPitch + gamepadInput.pitch, -1, 1);
      const rollInput = THREE.MathUtils.clamp(keyboardRoll + gamepadInput.roll, -1, 1);""",
    "combined pitch and roll input",
)

replace_once(
    """      const boost = keys.has("ShiftLeft") || keys.has("ShiftRight");
      const brake = keys.has("ControlLeft") || keys.has("ControlRight");""",
    """      const boost = keys.has("ShiftLeft") || keys.has("ShiftRight") || gamepadInput.boost;
      const brake = keys.has("ControlLeft") || keys.has("ControlRight") || gamepadInput.brake;""",
    "combined throttle input",
)

replace_once(
    '      if (keys.has("Space") && gunCooldown <= 0) {',
    '      if ((keys.has("Space") || gamepadInput.gun) && gunCooldown <= 0) {',
    "combined gun input",
)

replace_once(
    "        applyPlayerDamage(100);",
    "        applyPlayerDamage(100, true);",
    "ground collision damage",
)

replace_once(
    "          attemptEnemyAttack(enemy, distanceToPlayer, tmpV4, tmpV5);",
    "          attemptEnemyAttack(enemy);",
    "enemy attack invocation",
)

replace_once(
    """    function attemptEnemyAttack(enemy, distanceToPlayer, enemyForward, playerForward) {
      if (distanceToPlayer > 520 || distanceToPlayer < 25) return;

      tmpV1.copy(enemy.group.position).sub(player.position).normalize();
      const behindPlayer = tmpV1.dot(playerForward) < -0.22;
      tmpV2.copy(player.position).sub(enemy.group.position).normalize();
      const aimAlignment = enemyForward.dot(tmpV2);
      if (!behindPlayer || aimAlignment < 0.91) return;

      const hitChance = THREE.MathUtils.clamp((1 - distanceToPlayer / 620) * 0.62 * aimAlignment, 0.08, 0.52);
      const hit = Math.random() < hitChance;
      const start = enemy.group.position.clone().addScaledVector(enemyForward, 7);
      const end = player.position.clone();

      if (!hit) {
        end.add(new THREE.Vector3(
          (Math.random() - 0.5) * 34,
          (Math.random() - 0.5) * 24,
          (Math.random() - 0.5) * 34
        ));
      }

      createTracer(start, end, 0xff694f, 0.18, 0.72);
      createMuzzleFlash(start, 0xff794d);
      if (hit) applyPlayerDamage(9 + Math.floor(Math.random() * 5));
    }""",
    """    function attemptEnemyAttack(enemy) {
      if (missionElapsed < MISSION_GRACE_TIME || playerHitCooldown > 0) return;

      const enemyForward = forwardOf(enemy.group, new THREE.Vector3());
      const playerForward = forwardOf(player, new THREE.Vector3());
      const playerToEnemy = enemy.group.position.clone().sub(player.position);
      const distanceToPlayer = playerToEnemy.length();
      if (!Number.isFinite(distanceToPlayer) || distanceToPlayer > 520 || distanceToPlayer < 25) return;

      const behindPlayer = playerToEnemy.multiplyScalar(1 / distanceToPlayer).dot(playerForward) < -0.28;
      const enemyToPlayer = player.position.clone().sub(enemy.group.position).normalize();
      const aimAlignment = enemyForward.dot(enemyToPlayer);
      if (!behindPlayer || aimAlignment < 0.92) return;

      const hitChance = THREE.MathUtils.clamp(
        (1 - distanceToPlayer / 620) * 0.52 * aimAlignment,
        0.04,
        0.38
      );
      const hit = Math.random() < hitChance;
      const start = enemy.group.position.clone().addScaledVector(enemyForward, 7);
      const end = player.position.clone();

      if (!hit) {
        end.add(new THREE.Vector3(
          (Math.random() - 0.5) * 34,
          (Math.random() - 0.5) * 24,
          (Math.random() - 0.5) * 34
        ));
      }

      createTracer(start, end, 0xff694f, 0.18, 0.72);
      createMuzzleFlash(start, 0xff794d);
      if (hit) applyPlayerDamage(9 + Math.floor(Math.random() * 5));
    }""",
    "stable enemy attack calculation",
)

replace_once(
    """    function applyPlayerDamage(amount) {
      if (gameState !== STATE_PLAYING) return;
      health = Math.max(0, health - amount);
      damageFlash = Math.min(1, damageFlash + 0.72);
      cameraShake = Math.min(1, cameraShake + 0.5);
      updateAircraftFlash(playerModel, 0.14);
      createImpactBurst(player.position, 0xff654f, 0.9);

      if (health <= 0) {
        createExplosion(player.position, 0xffad45, 1.45);
        playerModel.group.visible = false;
        completeMission(false);
      } else if (health <= 30) {
        showBanner("WARNING · CRITICAL DAMAGE", 1.1, "danger");
      }
    }""",
    """    function applyPlayerDamage(amount, bypassCooldown = false) {
      if (gameState !== STATE_PLAYING) return false;
      if (!bypassCooldown && (missionElapsed < MISSION_GRACE_TIME || playerHitCooldown > 0)) return false;

      const safeAmount = Number.isFinite(amount)
        ? THREE.MathUtils.clamp(Math.round(amount), 1, 100)
        : 0;
      if (safeAmount <= 0) return false;

      const previousHealth = health;
      health = Math.max(0, previousHealth - safeAmount);
      if (health >= previousHealth) return false;
      if (!bypassCooldown) playerHitCooldown = PLAYER_HIT_COOLDOWN;

      damageFlash = Math.min(1, damageFlash + 0.72);
      cameraShake = Math.min(1, cameraShake + 0.5);
      updateAircraftFlash(playerModel, 0.14);
      createImpactBurst(player.position, 0xff654f, 0.9);

      if (health <= 0) {
        createExplosion(player.position, 0xffad45, 1.45);
        playerModel.group.visible = false;
        completeMission(false);
      } else if (health <= 30) {
        showBanner("WARNING · CRITICAL DAMAGE", 1.1, "danger");
      }
      return true;
    }""",
    "damage guard",
)

path.write_text(text, encoding="utf-8")

required_ids = [
    "score", "highscore", "health", "missiles", "kills", "state",
    "startBtn", "retryBtn", "gamepadStatus",
]
for item in required_ids:
    count = len(re.findall(rf'id=["\']{re.escape(item)}["\']', text))
    if count != 1:
        raise SystemExit(f"id={item}: expected once, found {count}")

assertions = {
    "fixed Three.js version": 'three@0.180.0/build/three.module.js' in text,
    "fixed addons version": 'three@0.180.0/examples/jsm/' in text,
    "no latest tag": '@latest' not in text,
    "Gamepad API polling": 'navigator.getGamepads()' in text,
    "gamepad axes": 'selected.axes?.[0]' in text and 'selected.axes?.[1]' in text,
    "damage cooldown": 'PLAYER_HIT_COOLDOWN' in text and 'playerHitCooldown > 0' in text,
    "mission grace": 'MISSION_GRACE_TIME' in text,
    "stable attack vectors": 'const playerToEnemy = enemy.group.position.clone()' in text,
    "required states": all(state in text for state in ['"ready"', '"playing"', '"missionComplete"', '"gameover"']),
    "no console warning calls": 'console.warn(' not in text,
    "no console error calls": 'console.error(' not in text,
}
failed = [name for name, ok in assertions.items() if not ok]
if failed:
    raise SystemExit("Static assertions failed: " + ", ".join(failed))

scripts = re.findall(r'<script type="module">\s*(.*?)\s*</script>', text, re.S)
if len(scripts) != 1:
    raise SystemExit(f"Expected one module script, found {len(scripts)}")
Path("/tmp/sortie-game.mjs").write_text(scripts[0], encoding="utf-8")
