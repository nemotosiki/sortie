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


def replace_regex(pattern: str, replacement: str, label: str, flags: int = 0) -> None:
    global text
    text, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one regex match, found {count}")


# HUD styling for stall, missile threat, and target-focus indications.
replace_once(
'''    #boostIndicator.active {
      opacity: 0.9;
      color: #ffe78b;
      text-shadow: 0 0 9px rgba(255, 205, 75, 0.95);
    }

    #damageFlash {''',
'''    #boostIndicator.active {
      opacity: 0.9;
      color: #ffe78b;
      text-shadow: 0 0 9px rgba(255, 205, 75, 0.95);
    }

    #stallWarning,
    #missileWarning,
    #cameraFocusStatus {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      padding: 7px 15px;
      border: 1px solid transparent;
      background: rgba(5, 11, 18, 0.66);
      opacity: 0;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.2em;
      white-space: nowrap;
      transition: opacity 120ms ease, transform 120ms ease, border-color 120ms ease;
    }

    #stallWarning {
      bottom: 19%;
      color: #ff4d58;
      text-shadow: 0 0 11px rgba(255, 38, 54, 0.95);
    }

    #stallWarning.active {
      opacity: 1;
      transform: translateX(-50%) scale(1.03);
      border-color: rgba(255, 72, 82, 0.7);
      animation: alertPulse 0.42s ease-in-out infinite alternate;
    }

    #stallWarning.caution {
      color: #ffd45a;
      border-color: rgba(255, 212, 90, 0.55);
      text-shadow: 0 0 10px rgba(255, 190, 56, 0.85);
      animation-duration: 0.85s;
    }

    #missileWarning {
      top: 18%;
      color: #ff4a55;
      text-shadow: 0 0 12px rgba(255, 42, 58, 0.95);
    }

    #missileWarning.active {
      opacity: 1;
      border-color: rgba(255, 69, 82, 0.75);
      animation: alertPulse 0.34s ease-in-out infinite alternate;
    }

    #cameraFocusStatus {
      top: 91px;
      color: #ffe97b;
      text-shadow: 0 0 9px rgba(255, 218, 71, 0.85);
    }

    #cameraFocusStatus.active {
      opacity: 0.92;
      border-color: rgba(255, 226, 105, 0.55);
    }

    @keyframes alertPulse {
      from { transform: translateX(-50%) scale(0.98); }
      to { transform: translateX(-50%) scale(1.04); }
    }

    #damageFlash {''',
"warning HUD CSS",
)

replace_once(
'''    <div id="missionBanner"></div>
    <div id="boostIndicator">AFTERBURNER</div>
    <div id="controlModeStatus">FLIGHT CONTROL · NORMAL · M / SHARE TOGGLE</div>''',
'''    <div id="missionBanner"></div>
    <div id="boostIndicator">AFTERBURNER</div>
    <div id="stallWarning">STALL · ACCELERATE / LOWER NOSE</div>
    <div id="missileWarning">MISSILE ALERT</div>
    <div id="cameraFocusStatus">TARGET VIEW</div>
    <div id="controlModeStatus">FLIGHT CONTROL · NORMAL · M / SHARE TOGGLE</div>''',
"warning HUD DOM",
)

replace_once(
'<strong id="missiles">6</strong>',
'<strong id="missiles">10</strong>',
"initial missile count",
)
replace_once(
'<div class="controlItem"><strong>ENTER</strong><span>ロック完了時にミサイル発射。全6発。</span></div>',
'<div class="controlItem"><strong>ENTER</strong><span>ロック完了時にミサイル発射。全10発。</span></div>',
"missile help count",
)
replace_once(
'<div class="controlItem"><strong>SHIFT / CTRL</strong><span>ブースト / 減速。機体は常に前進。</span></div>',
'<div class="controlItem"><strong>SHIFT / CTRL</strong><span>広い速度域で加速 / 減速。低速は小回りが利くが、落としすぎると失速。</span></div>',
"speed help",
)
replace_once(
'<div class="controlItem"><strong>GAMEPAD · TYPE A</strong><span>× 機銃、○ ミサイル、△ ターゲット、□ カメラ。R2/L2で加減速。</span></div>',
'<div class="controlItem"><strong>GAMEPAD · TYPE A</strong><span>× 機銃、○ ミサイル、△短押しでターゲット・長押しで注視、□カメラ。R2/L2で加減速。</span></div>',
"gamepad hold help",
)
replace_once(
'<div class="controlItem"><strong>OBJECTIVE</strong><span>HPを保ち、全ターゲットを撃墜せよ。</span></div>',
'<div class="controlItem"><strong>C KEY</strong><span>短押しでカメラ切替、長押し中はロック対象を注視。HPを保ち全機撃墜せよ。</span></div>',
"keyboard camera help",
)

# Wider speed envelope, stall model, roll inertia, and focus constants.
replace_once(
'''    const CRUISE_SPEED = 168;
    const BOOST_SPEED = 266;
    const BRAKE_SPEED = 92;
    const PITCH_RATE = THREE.MathUtils.degToRad(58);
    const EXPERT_ROLL_RATE = THREE.MathUtils.degToRad(98);
    const EXPERT_YAW_RATE = THREE.MathUtils.degToRad(48);
    const MAX_BANK_ANGLE = THREE.MathUtils.degToRad(68);
    const COORDINATED_TURN_RATE = THREE.MathUtils.degToRad(42);
    const BANK_RESPONSE_K = 0.006;''',
'''    const PLAYER_MISSILE_CAPACITY = 10;
    const CRUISE_SPEED = 170;
    const BOOST_SPEED = 340;
    const BRAKE_SPEED = 52;
    const STALL_WARNING_SPEED = 94;
    const STALL_ENTRY_SPEED = 82;
    const STALL_DEEP_SPEED = 58;
    const STALL_RECOVERY_SPEED = 112;
    const STALL_NOSE_DROP_RATE = THREE.MathUtils.degToRad(36);
    const STALL_SINK_RATE = 44;
    const PITCH_RATE = THREE.MathUtils.degToRad(58);
    const EXPERT_ROLL_RATE = THREE.MathUtils.degToRad(102);
    const EXPERT_YAW_RATE = THREE.MathUtils.degToRad(48);
    const EXPERT_ROLL_RESPONSE_K = 0.055;
    const MAX_BANK_ANGLE = THREE.MathUtils.degToRad(68);
    const NORMAL_ROLL_SPRING = 22;
    const NORMAL_ROLL_DAMPING = 6.2;
    const NORMAL_ROLL_RATE_LIMIT = THREE.MathUtils.degToRad(125);
    const COORDINATED_TURN_RATE = THREE.MathUtils.degToRad(42);
    const TARGET_FOCUS_HOLD_MS = 360;''',
"flight constants",
)

# Enemy missile performance stays deliberately weaker than the player's weapon.
replace_regex(
r'''(    const ENEMY_TYPES = Object\.freeze\(\{.*?\n    \}\);\n)\n    const ui = \{''',
r'''\1
    const ENEMY_MISSILE_PROFILES = Object.freeze({
      viper: Object.freeze({
        cooldownMin: 8.2,
        cooldownSpread: 4.6,
        range: 900,
        minRange: 210,
        speed: 235,
        maxSpeed: 285,
        turnRate: THREE.MathUtils.degToRad(72),
        damage: 16,
        life: 7.5,
        launchDot: 0.66
      }),
      bison: Object.freeze({
        cooldownMin: 10.8,
        cooldownSpread: 5.2,
        range: 980,
        minRange: 240,
        speed: 205,
        maxSpeed: 250,
        turnRate: THREE.MathUtils.degToRad(46),
        damage: 24,
        life: 8.6,
        launchDot: 0.62
      }),
      lancer: Object.freeze({
        cooldownMin: 9.1,
        cooldownSpread: 4.8,
        range: 930,
        minRange: 220,
        speed: 220,
        maxSpeed: 270,
        turnRate: THREE.MathUtils.degToRad(58),
        damage: 19,
        life: 8.0,
        launchDot: 0.64
      })
    });

    const ui = {''',
"enemy missile profile table",
flags=re.S,
)

replace_once(
'''      missionBanner: document.getElementById("missionBanner"),
      boostIndicator: document.getElementById("boostIndicator"),
      gamepadStatus: document.getElementById("gamepadStatus"),''',
'''      missionBanner: document.getElementById("missionBanner"),
      boostIndicator: document.getElementById("boostIndicator"),
      stallWarning: document.getElementById("stallWarning"),
      missileWarning: document.getElementById("missileWarning"),
      cameraFocusStatus: document.getElementById("cameraFocusStatus"),
      gamepadStatus: document.getElementById("gamepadStatus"),''',
"warning UI references",
)

replace_once(
'''    const tmpV6 = new THREE.Vector3();
    const tmpV7 = new THREE.Vector3();
    const tmpV8 = new THREE.Vector3();
    const tmpQ1 = new THREE.Quaternion();''',
'''    const tmpV6 = new THREE.Vector3();
    const tmpV7 = new THREE.Vector3();
    const tmpV8 = new THREE.Vector3();
    const tmpV9 = new THREE.Vector3();
    const tmpV10 = new THREE.Vector3();
    const tmpQ1 = new THREE.Quaternion();''',
"extra temporary vectors",
)

replace_once(
'''    const enemies = [];
    const missilesInFlight = [];
    const effects = [];''',
'''    const enemies = [];
    const missilesInFlight = [];
    const enemyMissiles = [];
    const effects = [];''',
"enemy missile collection",
)

replace_once(
'''    let health = 100;
    let missileCount = 6;
    let kills = 0;''',
'''    let health = 100;
    let missileCount = PLAYER_MISSILE_CAPACITY;
    let kills = 0;''',
"missile state capacity",
)

replace_once(
'''    let gunShots = 0;
    let missilesLaunched = 0;
    let enemySerial = 0;''',
'''    let gunShots = 0;
    let missilesLaunched = 0;
    let enemyMissilesLaunched = 0;
    let enemyMissileSerial = 0;
    let enemySerial = 0;''',
"weapon counters",
)

replace_once(
'''    let playerBank = 0;
    let controlMode = CONTROL_NORMAL;
    let cameraMode = CAMERA_MODES[0];
    let preferredTargetId = null;''',
'''    let playerBank = 0;
    let rollRate = 0;
    let expertRollRate = 0;
    let stallTimer = 0;
    let stallSeverity = 0;
    let stalling = false;
    let playerTurnFactor = 1;
    let playerControlAuthority = 1;
    let controlMode = CONTROL_NORMAL;
    let cameraMode = CAMERA_MODES[0];
    let preferredTargetId = null;
    let cameraFocusActive = false;
    let cameraFocusTargetId = null;
    let cameraFocusSource = null;
    let nearestMissileThreat = null;''',
"flight and focus state",
)

replace_once(
'''      previousModeToggle: false,
      previousTarget: false,
      previousCamera: false
    };

    const lock = {''',
'''      previousModeToggle: false,
      previousTarget: false,
      previousCamera: false,
      targetPressedAt: 0,
      targetLong: false,
      targetFocus: false
    };

    const cameraKeyHold = {
      pressed: false,
      pressedAt: 0,
      focus: false
    };

    const audioSystem = {
      context: null,
      master: null,
      lockTimer: 0,
      threatTimer: 0,
      lastLocked: false,
      lockBeeps: 0,
      lockCompleteCues: 0,
      threatBeeps: 0
    };

    const lock = {''',
"input hold and audio state",
)

replace_once(
'''      cameraMode,
      selectedTargetId: null,
      weapons: { gunShots: 0, missilesLaunched: 0 },
      enemyCatalog: Object.keys(ENEMY_TYPES),''',
'''      cameraMode,
      selectedTargetId: null,
      weapons: {
        gunShots: 0,
        missilesLaunched: 0,
        enemyMissilesLaunched: 0
      },
      flight: {
        stalling: false,
        stallSeverity: 0,
        rollRate: 0,
        turnFactor: 1,
        controlAuthority: 1
      },
      cameraFocus: { active: false, targetId: null, source: null },
      audio: { lockBeeps: 0, lockCompleteCues: 0, threatBeeps: 0 },
      threats: { incomingMissiles: [], nearest: null },
      enemyCatalog: Object.keys(ENEMY_TYPES),''',
"expanded game hook",
)

# Input handling: Square/C short camera, Triangle short target, Triangle/C long focus.
replace_regex(
r'''    ui\.startBtn\.addEventListener\("click", startMission\);.*?    window\.addEventListener\("gamepaddisconnected", updateGamepadInput\);\n''',
'''    ui.startBtn.addEventListener("click", () => {
      ensureAudio();
      startMission();
    });
    ui.retryBtn.addEventListener("click", () => {
      ensureAudio();
      startMission();
    });
    window.addEventListener("pointerdown", ensureAudio, { passive: true });

    window.addEventListener("keydown", (event) => {
      if (isControlKey(event.code)) event.preventDefault();
      ensureAudio();

      if (event.code === "KeyM" && !event.repeat) {
        toggleControlMode();
        return;
      }

      if (event.code === "Tab" && !event.repeat) {
        if (gameState === STATE_PLAYING) cycleTarget();
        return;
      }

      if (event.code === "KeyC") {
        if (!event.repeat && !cameraKeyHold.pressed) {
          cameraKeyHold.pressed = true;
          cameraKeyHold.pressedAt = performance.now();
          cameraKeyHold.focus = false;
        }
        return;
      }

      if (event.code === "Enter" && !event.repeat) {
        if (gameState === STATE_READY || gameState === STATE_COMPLETE || gameState === STATE_GAMEOVER) {
          startMission();
          return;
        }
        if (gameState === STATE_PLAYING) launchMissile();
      }

      keys.add(event.code);
    });

    window.addEventListener("keyup", (event) => {
      if (isControlKey(event.code)) event.preventDefault();

      if (event.code === "KeyC") {
        if (cameraKeyHold.pressed) {
          const heldLong = cameraKeyHold.focus ||
            performance.now() - cameraKeyHold.pressedAt >= TARGET_FOCUS_HOLD_MS;
          cameraKeyHold.pressed = false;
          cameraKeyHold.focus = false;
          cameraKeyHold.pressedAt = 0;
          if (!heldLong) cycleCamera();
        }
        return;
      }

      keys.delete(event.code);
    });

    const clearTransientInputs = () => {
      keys.clear();
      cameraKeyHold.pressed = false;
      cameraKeyHold.focus = false;
      cameraKeyHold.pressedAt = 0;
      gamepadInput.targetFocus = false;
      gamepadInput.targetLong = false;
      cameraFocusActive = false;
      cameraFocusTargetId = null;
      cameraFocusSource = null;
    };

    window.addEventListener("blur", clearTransientInputs);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clearTransientInputs();
    });
    window.addEventListener("resize", resize);
    window.addEventListener("gamepadconnected", updateGamepadInput);
    window.addEventListener("gamepaddisconnected", updateGamepadInput);
''',
"event handlers",
flags=re.S,
)

replace_regex(
r'''    function animate\(\) \{.*?\n    \}\n\n    function isControlKey''',
'''    function animate() {
      requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);

      updateEffects(dt);
      updateGamepadInput();
      updateHoldInputs();

      if (gameState === STATE_PLAYING) {
        missionElapsed += dt;
        playerHitCooldown = Math.max(0, playerHitCooldown - dt);
        updatePlayer(dt);
        if (gameState === STATE_PLAYING) updateEnemies(dt);
        if (gameState === STATE_PLAYING) {
          updateLock(dt);
          updateMissiles(dt);
          updateEnemyMissiles(dt);
          updateMission(dt);
        }
      } else {
        animateIdle(dt);
      }

      updateAudioCues(dt);
      updateCamera(dt);
      updateVisualStatus(dt);
      updateHud();
      drawRadar();
      syncGameHook();
      renderer.render(scene, camera);
    }

    function isControlKey''',
"animation loop",
flags=re.S,
)

replace_regex(
r'''    function clearGamepadInput\(\) \{.*?\n    \}\n\n    function adoptNormalFlightFrame''',
'''    function clearGamepadInput() {
      gamepadInput.index = null;
      gamepadInput.pitch = 0;
      gamepadInput.roll = 0;
      gamepadInput.yaw = 0;
      gamepadInput.boost = false;
      gamepadInput.brake = false;
      gamepadInput.gun = false;
      gamepadInput.missile = false;
      gamepadInput.previousMissile = false;
      gamepadInput.previousStart = false;
      gamepadInput.previousModeToggle = false;
      gamepadInput.previousTarget = false;
      gamepadInput.previousCamera = false;
      gamepadInput.targetPressedAt = 0;
      gamepadInput.targetLong = false;
      gamepadInput.targetFocus = false;
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
      const rightAxisX = applyDeadzone(Number(selected.axes?.[2] || 0));
      const dpadPitch = (gamepadButtonPressed(selected, 13) ? 1 : 0) -
        (gamepadButtonPressed(selected, 12) ? 1 : 0);
      const dpadRoll = (gamepadButtonPressed(selected, 14) ? 1 : 0) -
        (gamepadButtonPressed(selected, 15) ? 1 : 0);

      gamepadInput.pitch = THREE.MathUtils.clamp(axisY + dpadPitch, -1, 1);
      gamepadInput.roll = THREE.MathUtils.clamp(-axisX + dpadRoll, -1, 1);
      gamepadInput.yaw = -rightAxisX;
      gamepadInput.boost = gamepadButtonValue(selected, 7) > 0.22;
      gamepadInput.brake = gamepadButtonValue(selected, 6) > 0.22;

      // Standard Gamepad mapping / Ace Combat 7 Type A:
      // 0 = Cross/A (gun), 1 = Circle/B (missile), 2 = Square/X (camera),
      // 3 = Triangle/Y (short target cycle, long target view), 6/7 = L2/R2,
      // 8 = Share/View (NORMAL/EXPERT).
      gamepadInput.gun = gamepadButtonPressed(selected, 0);

      const missilePressed = gamepadButtonPressed(selected, 1);
      const cameraPressed = gamepadButtonPressed(selected, 2);
      const targetPressed = gamepadButtonPressed(selected, 3);
      const startPressed = gamepadButtonPressed(selected, 9) || missilePressed;
      const modePressed = gamepadButtonPressed(selected, 8);
      const wasPlaying = gameState === STATE_PLAYING;
      const now = performance.now();

      if (modePressed && !gamepadInput.previousModeToggle) toggleControlMode();
      if (!wasPlaying && startPressed && !gamepadInput.previousStart) startMission();
      if (cameraPressed && !gamepadInput.previousCamera) cycleCamera();
      if (wasPlaying && missilePressed && !gamepadInput.previousMissile) launchMissile();

      if (targetPressed && !gamepadInput.previousTarget) {
        gamepadInput.targetPressedAt = now;
        gamepadInput.targetLong = false;
        gamepadInput.targetFocus = false;
      }
      if (targetPressed && !gamepadInput.targetLong &&
          now - gamepadInput.targetPressedAt >= TARGET_FOCUS_HOLD_MS) {
        gamepadInput.targetLong = true;
        gamepadInput.targetFocus = true;
      }
      if (!targetPressed && gamepadInput.previousTarget) {
        if (!gamepadInput.targetLong && wasPlaying) cycleTarget();
        gamepadInput.targetPressedAt = 0;
        gamepadInput.targetLong = false;
        gamepadInput.targetFocus = false;
      }

      gamepadInput.missile = missilePressed;
      gamepadInput.previousMissile = missilePressed;
      gamepadInput.previousStart = startPressed;
      gamepadInput.previousModeToggle = modePressed;
      gamepadInput.previousTarget = targetPressed;
      gamepadInput.previousCamera = cameraPressed;
    }

    function adoptNormalFlightFrame''',
"gamepad hold handling",
flags=re.S,
)

replace_regex(
r'''    function setControlMode\(nextMode, announce = true\) \{.*?\n    \}\n\n    function toggleControlMode''',
'''    function setControlMode(nextMode, announce = true) {
      if (nextMode !== CONTROL_NORMAL && nextMode !== CONTROL_EXPERT) return;
      if (nextMode === controlMode) return;

      if (nextMode === CONTROL_EXPERT) {
        playerFlightFrame.copy(player.quaternion).normalize();
        playerBank = 0;
        expertRollRate = rollRate;
      } else {
        adoptNormalFlightFrame();
        rollRate = expertRollRate * 0.35;
      }

      controlMode = nextMode;
      if (announce) {
        showBanner(
          nextMode === CONTROL_EXPERT ? "FLIGHT CONTROL · EXPERT" : "FLIGHT CONTROL · NORMAL",
          1.2,
          nextMode === CONTROL_EXPERT ? "danger" : "success"
        );
      }
    }

    function toggleControlMode''',
"mode transition inertia",
flags=re.S,
)

# Focus helpers and procedural Web Audio cues.
replace_once(
'''    function cycleCamera() {
      const currentIndex = Math.max(0, CAMERA_MODES.indexOf(cameraMode));
      cameraMode = CAMERA_MODES[(currentIndex + 1) % CAMERA_MODES.length];
      showBanner(`CAMERA · ${cameraMode.toUpperCase()}`, 0.75);
    }

    function damping(k, dt) {''',
'''    function cycleCamera() {
      const currentIndex = Math.max(0, CAMERA_MODES.indexOf(cameraMode));
      cameraMode = CAMERA_MODES[(currentIndex + 1) % CAMERA_MODES.length];
      showBanner(`CAMERA · ${cameraMode.toUpperCase()}`, 0.75);
    }

    function updateHoldInputs() {
      if (cameraKeyHold.pressed && !cameraKeyHold.focus &&
          performance.now() - cameraKeyHold.pressedAt >= TARGET_FOCUS_HOLD_MS) {
        cameraKeyHold.focus = true;
      }
    }

    function resolveCameraFocusTarget() {
      const source = gamepadInput.targetFocus ? "gamepad" : (cameraKeyHold.focus ? "keyboard" : null);
      if (!source || gameState !== STATE_PLAYING) {
        cameraFocusActive = false;
        cameraFocusTargetId = null;
        cameraFocusSource = null;
        return null;
      }

      const requestedId = lock.targetId ?? preferredTargetId ?? cameraFocusTargetId;
      const target = enemies.find((enemy) => enemy.alive && enemy.id === requestedId);
      if (!target) {
        cameraFocusActive = false;
        cameraFocusTargetId = null;
        cameraFocusSource = source;
        return null;
      }

      cameraFocusActive = true;
      cameraFocusTargetId = target.id;
      cameraFocusSource = source;
      return target;
    }

    function ensureAudio() {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      if (!audioSystem.context) {
        try {
          audioSystem.context = new AudioCtor();
          audioSystem.master = audioSystem.context.createGain();
          audioSystem.master.gain.value = 0.2;
          audioSystem.master.connect(audioSystem.context.destination);
        } catch {
          audioSystem.context = null;
          audioSystem.master = null;
          return;
        }
      }
      if (audioSystem.context.state === "suspended") {
        void audioSystem.context.resume().catch(() => {});
      }
    }

    function playTone(frequency, duration, volume = 0.12, type = "sine", delay = 0) {
      const context = audioSystem.context;
      const master = audioSystem.master;
      if (!context || !master || context.state !== "running") return;

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + Math.max(0, delay);
      const end = start + Math.max(0.02, duration);
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start(start);
      oscillator.stop(end + 0.02);
      oscillator.addEventListener("ended", () => {
        oscillator.disconnect();
        gain.disconnect();
      }, { once: true });
    }

    function updateAudioCues(dt) {
      nearestMissileThreat = gameState === STATE_PLAYING ? getNearestEnemyMissileThreat() : null;

      if (gameState !== STATE_PLAYING) {
        audioSystem.lockTimer = 0;
        audioSystem.threatTimer = 0;
        audioSystem.lastLocked = false;
        return;
      }

      if (lock.locked && !audioSystem.lastLocked) {
        audioSystem.lockCompleteCues += 1;
        playTone(880, 0.11, 0.12, "square");
        playTone(1180, 0.16, 0.09, "sine", 0.08);
      }

      if (!lock.locked && lock.progress > 0) {
        audioSystem.lockTimer -= dt;
        if (audioSystem.lockTimer <= 0) {
          audioSystem.lockBeeps += 1;
          playTone(470 + lock.progress * 420, 0.065, 0.075, "square");
          audioSystem.lockTimer = THREE.MathUtils.lerp(0.34, 0.11, lock.progress);
        }
      } else {
        audioSystem.lockTimer = 0;
      }
      audioSystem.lastLocked = lock.locked;

      if (nearestMissileThreat) {
        audioSystem.threatTimer -= dt;
        if (audioSystem.threatTimer <= 0) {
          audioSystem.threatBeeps += 1;
          const urgency = THREE.MathUtils.clamp(1 - nearestMissileThreat.distance / 900, 0, 1);
          playTone(250 + urgency * 220, 0.085, 0.09, "sawtooth");
          audioSystem.threatTimer = THREE.MathUtils.lerp(0.5, 0.14, urgency);
        }
      } else {
        audioSystem.threatTimer = 0;
      }
    }

    function damping(k, dt) {''',
"focus and audio helpers",
)

replace_once(
'''      health = 100;
      missileCount = 6;
      kills = 0;''',
'''      health = 100;
      missileCount = PLAYER_MISSILE_CAPACITY;
      kills = 0;''',
"mission missile reset",
)

replace_once(
'''      gunShots = 0;
      missilesLaunched = 0;
      waveClearTimer = -1;''',
'''      gunShots = 0;
      missilesLaunched = 0;
      enemyMissilesLaunched = 0;
      waveClearTimer = -1;''',
"mission weapon counter reset",
)

replace_once(
'''      missionElapsed = 0;
      playerHitCooldown = 0;
      preferredTargetId = null;
      setState(STATE_PLAYING);''',
'''      missionElapsed = 0;
      playerHitCooldown = 0;
      preferredTargetId = null;
      rollRate = 0;
      expertRollRate = 0;
      stallTimer = 0;
      stallSeverity = 0;
      stalling = false;
      playerTurnFactor = 1;
      playerControlAuthority = 1;
      cameraFocusActive = false;
      cameraFocusTargetId = null;
      cameraFocusSource = null;
      nearestMissileThreat = null;
      cameraKeyHold.pressed = false;
      cameraKeyHold.focus = false;
      gamepadInput.targetFocus = false;
      gamepadInput.targetLong = false;
      audioSystem.lockTimer = 0;
      audioSystem.threatTimer = 0;
      audioSystem.lastLocked = false;
      setState(STATE_PLAYING);''',
"mission flight reset",
)

replace_once(
'''    function resetPlayerTransform() {
      player.position.set(0, 260, 620);
      playerFlightFrame.identity();
      playerBank = 0;
      syncPlayerOrientation();
    }''',
'''    function resetPlayerTransform() {
      player.position.set(0, 260, 620);
      playerFlightFrame.identity();
      playerBank = 0;
      rollRate = 0;
      expertRollRate = 0;
      stallTimer = 0;
      stallSeverity = 0;
      stalling = false;
      syncPlayerOrientation();
    }''',
"player reset inertia",
)

replace_regex(
r'''    function updatePlayer\(dt\) \{.*?\n    \}\n\n    function animateIdle''',
'''    function updatePlayer(dt) {
      const keyboardPitch = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) -
        (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
      const keyboardRoll = (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) -
        (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0);
      const keyboardYaw = (keys.has("KeyQ") ? 1 : 0) - (keys.has("KeyE") ? 1 : 0);
      const pitchInput = THREE.MathUtils.clamp(keyboardPitch + gamepadInput.pitch, -1, 1);
      const rollInput = THREE.MathUtils.clamp(keyboardRoll + gamepadInput.roll, -1, 1);
      const yawInput = THREE.MathUtils.clamp(keyboardYaw + gamepadInput.yaw, -1, 1);

      const boost = keys.has("ShiftLeft") || keys.has("ShiftRight") || gamepadInput.boost;
      const brake = keys.has("ControlLeft") || keys.has("ControlRight") || gamepadInput.brake;
      const targetSpeed = boost ? BOOST_SPEED : (brake ? BRAKE_SPEED : CRUISE_SPEED);
      const speedResponse = boost ? 0.004 : (brake ? 0.008 : 0.012);
      playerSpeed = THREE.MathUtils.lerp(playerSpeed, targetSpeed, damping(speedResponse, dt));

      forwardOf(player, tmpV9);
      const lowSpeedRatio = THREE.MathUtils.clamp(
        (STALL_ENTRY_SPEED - playerSpeed) / Math.max(1, STALL_ENTRY_SPEED - STALL_DEEP_SPEED),
        0,
        1
      );
      const pitchDemand = Math.abs(pitchInput);
      const noseHighDemand = Math.max(0, tmpV9.y - 0.18);
      if (playerSpeed < STALL_ENTRY_SPEED) {
        const buildRate = 0.28 + lowSpeedRatio * 1.35 + pitchDemand * 0.42 + noseHighDemand * 0.32;
        stallTimer += dt * buildRate;
      } else {
        const recoveryRate = playerSpeed > STALL_RECOVERY_SPEED ? 1.9 : 0.78;
        stallTimer -= dt * recoveryRate;
      }
      stallTimer = THREE.MathUtils.clamp(stallTimer, 0, 1);
      const targetSeverity = THREE.MathUtils.smoothstep(stallTimer, 0.18, 0.88);
      stallSeverity = THREE.MathUtils.lerp(stallSeverity, targetSeverity, damping(0.025, dt));
      if (playerSpeed > STALL_RECOVERY_SPEED && stallTimer <= 0.02) stallSeverity = Math.max(0, stallSeverity - dt * 1.4);
      stallSeverity = THREE.MathUtils.clamp(stallSeverity, 0, 1);
      stalling = stallSeverity > 0.24;

      playerControlAuthority = THREE.MathUtils.clamp(1 - stallSeverity * 0.82, 0.18, 1);
      const rawTurnFactor = THREE.MathUtils.clamp(
        Math.pow(CRUISE_SPEED / Math.max(playerSpeed, STALL_DEEP_SPEED), 1.18),
        0.58,
        1.92
      );
      playerTurnFactor = rawTurnFactor * (1 - stallSeverity * 0.78);
      const pitchManeuverFactor = THREE.MathUtils.clamp(
        Math.pow(CRUISE_SPEED / Math.max(playerSpeed, STALL_ENTRY_SPEED * 0.9), 0.62),
        0.72,
        1.46
      );

      if (controlMode === CONTROL_NORMAL) {
        const targetBank = rollInput * MAX_BANK_ANGLE;
        const bankError = targetBank - playerBank;
        const rollAcceleration = bankError * NORMAL_ROLL_SPRING * playerControlAuthority -
          rollRate * NORMAL_ROLL_DAMPING;
        rollRate += rollAcceleration * dt;
        rollRate = THREE.MathUtils.clamp(
          rollRate,
          -NORMAL_ROLL_RATE_LIMIT * playerControlAuthority,
          NORMAL_ROLL_RATE_LIMIT * playerControlAuthority
        );
        playerBank += rollRate * dt;
        playerBank = THREE.MathUtils.clamp(playerBank, -MAX_BANK_ANGLE * 1.12, MAX_BANK_ANGLE * 1.12);

        const turnRate = Math.sin(playerBank) * COORDINATED_TURN_RATE * playerTurnFactor;
        if (Math.abs(turnRate) > 0.00001) {
          tmpQ1.setFromAxisAngle(WORLD_UP, turnRate * dt);
          playerFlightFrame.premultiply(tmpQ1).normalize();
        }

        if (Math.abs(pitchInput) > 0.00001) {
          tmpQ1.setFromAxisAngle(
            LOCAL_RIGHT,
            pitchInput * PITCH_RATE * pitchManeuverFactor * playerControlAuthority * dt
          );
          playerFlightFrame.multiply(tmpQ1).normalize();
        }

        if (stallSeverity > 0.005) {
          tmpQ1.setFromAxisAngle(LOCAL_RIGHT, -STALL_NOSE_DROP_RATE * stallSeverity * dt);
          playerFlightFrame.multiply(tmpQ1).normalize();
        }
        syncPlayerOrientation();
      } else {
        const targetRollRate = rollInput * EXPERT_ROLL_RATE * playerControlAuthority;
        expertRollRate = THREE.MathUtils.lerp(
          expertRollRate,
          targetRollRate,
          damping(EXPERT_ROLL_RESPONSE_K, dt)
        );
        rollRate = expertRollRate;

        if (Math.abs(pitchInput) > 0.00001) {
          player.rotateX(pitchInput * PITCH_RATE * pitchManeuverFactor * playerControlAuthority * dt);
        }
        if (Math.abs(yawInput) > 0.00001) {
          player.rotateY(yawInput * EXPERT_YAW_RATE * playerTurnFactor * playerControlAuthority * dt);
        }
        if (Math.abs(expertRollRate) > 0.00001) player.rotateZ(expertRollRate * dt);
        if (stallSeverity > 0.005) player.rotateX(-STALL_NOSE_DROP_RATE * stallSeverity * dt);
        player.quaternion.normalize();
        playerFlightFrame.copy(player.quaternion);
        playerBank = 0;
      }

      forwardOf(player, tmpV1);
      player.position.addScaledVector(tmpV1, playerSpeed * dt);
      if (stallSeverity > 0.005) player.position.y -= STALL_SINK_RATE * stallSeverity * dt;

      if (player.position.y <= 4) {
        player.position.y = 4;
        applyPlayerDamage(100, true);
      }

      gunCooldown = Math.max(0, gunCooldown - dt);
      if ((keys.has("Space") || gamepadInput.gun) && gunCooldown <= 0) {
        fireGun();
        gunCooldown += 1 / GUN_RATE;
      }

      const flameScale = boost ? 2.4 : (brake ? 0.48 : 1.15);
      const stallFlameFactor = 1 - stallSeverity * 0.42;
      for (const flame of playerModel.flames) {
        flame.scale.z = THREE.MathUtils.lerp(
          flame.scale.z,
          flameScale * stallFlameFactor,
          damping(0.001, dt)
        );
      }
      ui.boostIndicator.classList.toggle("active", boost);
    }

    function animateIdle''',
"flight model",
flags=re.S,
)

# Enemy missiles, threat data, and weak homing.
replace_once(
'''    function removeMissile(index) {
      const missile = missilesInFlight[index];
      scene.remove(missile.mesh);
      missilesInFlight.splice(index, 1);
    }

    function updateLock(dt) {''',
'''    function removeMissile(index) {
      const missile = missilesInFlight[index];
      scene.remove(missile.mesh);
      missilesInFlight.splice(index, 1);
    }

    function attemptEnemyMissile(enemy) {
      if (gameState !== STATE_PLAYING || missionElapsed < MISSION_GRACE_TIME + 1.2) return false;
      const profile = ENEMY_MISSILE_PROFILES[enemy.type];
      if (!profile) return false;

      tmpV1.copy(player.position).sub(enemy.group.position);
      const distance = tmpV1.length();
      if (!Number.isFinite(distance) || distance < profile.minRange || distance > profile.range) return false;
      tmpV1.multiplyScalar(1 / distance);
      forwardOf(enemy.group, tmpV2);
      if (tmpV2.dot(tmpV1) < profile.launchDot) return false;

      rightOf(enemy.group, tmpV3);
      upOf(enemy.group, tmpV4);
      const root = createMissileModel(true);
      root.position.copy(enemy.group.position)
        .addScaledVector(tmpV2, 7.2)
        .addScaledVector(tmpV3, enemy.id % 2 === 0 ? 2.6 : -2.6)
        .addScaledVector(tmpV4, -0.7);
      root.quaternion.copy(enemy.group.quaternion);
      scene.add(root);

      enemyMissileSerial += 1;
      enemyMissilesLaunched += 1;
      enemyMissiles.push({
        id: enemyMissileSerial,
        mesh: root,
        ownerId: enemy.id,
        ownerType: enemy.type,
        speed: profile.speed,
        maxSpeed: profile.maxSpeed,
        turnRate: profile.turnRate,
        damage: profile.damage,
        lifeLimit: profile.life,
        life: 0,
        trailTimer: 0
      });
      createMuzzleFlash(root.position, enemy.spec.tracerColor);
      return true;
    }

    function updateEnemyMissiles(dt) {
      for (let i = enemyMissiles.length - 1; i >= 0; i -= 1) {
        const missile = enemyMissiles[i];
        missile.life += dt;
        missile.trailTimer -= dt;

        tmpV1.copy(player.position).sub(missile.mesh.position);
        const distance = tmpV1.length();
        if (distance < 13) {
          createExplosion(missile.mesh.position, 0xff4d45, 0.72);
          applyPlayerDamage(missile.damage);
          removeEnemyMissile(i);
          continue;
        }

        if (distance > 0.001) {
          tmpV1.multiplyScalar(1 / distance);
          tmpQ1.setFromUnitVectors(LOCAL_FORWARD, tmpV1);
          missile.mesh.quaternion.rotateTowards(tmpQ1, missile.turnRate * dt);
          missile.mesh.quaternion.normalize();
        }

        missile.speed = THREE.MathUtils.lerp(missile.speed, missile.maxSpeed, damping(0.022, dt));
        forwardOf(missile.mesh, tmpV2);
        missile.mesh.position.addScaledVector(tmpV2, missile.speed * dt);

        if (missile.trailTimer <= 0) {
          tmpV3.copy(missile.mesh.position).addScaledVector(tmpV2, -2.1);
          createSmokePuff(tmpV3, 0.27);
          missile.trailTimer += 0.075;
        }

        if (missile.life > missile.lifeLimit || missile.mesh.position.y < 0 ||
            missile.mesh.position.distanceToSquared(player.position) > 1800 * 1800 ||
            gameState !== STATE_PLAYING) {
          createImpactBurst(missile.mesh.position, 0xff684e, 0.48);
          removeEnemyMissile(i);
        }
      }
    }

    function removeEnemyMissile(index) {
      const missile = enemyMissiles[index];
      if (!missile) return;
      scene.remove(missile.mesh);
      enemyMissiles.splice(index, 1);
    }

    function describeMissileDirection(relative) {
      const distance = relative.length();
      if (distance < 0.001) return "IMPACT";
      relative.multiplyScalar(1 / distance);
      forwardOf(player, tmpV6);
      rightOf(player, tmpV7);
      upOf(player, tmpV8);
      const forwardDot = relative.dot(tmpV6);
      const rightDot = relative.dot(tmpV7);
      const upDot = relative.dot(tmpV8);
      const horizontalMagnitude = Math.max(Math.abs(forwardDot), Math.abs(rightDot));
      if (Math.abs(upDot) > horizontalMagnitude * 1.15) return upDot > 0 ? "ABOVE" : "BELOW";
      if (Math.abs(rightDot) > Math.abs(forwardDot)) return rightDot > 0 ? "RIGHT" : "LEFT";
      return forwardDot > 0 ? "FRONT" : "REAR";
    }

    function getNearestEnemyMissileThreat() {
      let nearest = null;
      let bestDistance = Infinity;
      for (const missile of enemyMissiles) {
        tmpV10.copy(missile.mesh.position).sub(player.position);
        const distance = tmpV10.length();
        if (distance < bestDistance) {
          bestDistance = distance;
          nearest = {
            id: missile.id,
            ownerId: missile.ownerId,
            ownerType: missile.ownerType,
            distance,
            direction: describeMissileDirection(tmpV10.clone())
          };
        }
      }
      return nearest;
    }

    function updateLock(dt) {''',
"enemy missile functions",
)

replace_once(
'''        fireCooldown: spec.fireMin + Math.random() * spec.fireSpread,
        deadTimer: 0,''',
'''        fireCooldown: spec.fireMin + Math.random() * spec.fireSpread,
        missileCooldown: 5.4 + slot * 1.65 + Math.random() * 1.5,
        deadTimer: 0,''',
"enemy missile cooldown state",
)

replace_regex(
r'''    function updateEnemies\(dt\) \{.*?\n    \}\n\n    function attemptEnemyAttack''',
'''    function updateEnemies(dt) {
      const time = performance.now() * 0.001;
      forwardOf(player, tmpV5);
      rightOf(player, tmpV6);
      upOf(player, tmpV7);

      for (let i = enemies.length - 1; i >= 0; i -= 1) {
        const enemy = enemies[i];
        if (!enemy.alive) {
          enemy.deadTimer -= dt;
          if (enemy.deadTimer <= 0) {
            scene.remove(enemy.group);
            disposeAircraftMaterials(enemy.model);
            enemies.splice(i, 1);
          }
          continue;
        }

        const spec = enemy.spec;
        enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
        updateAircraftFlash(enemy.model, enemy.hitFlash);
        enemy.formationActive = false;

        tmpV1.copy(player.position).sub(enemy.group.position);
        const distanceToPlayer = tmpV1.length();

        if (enemy.mode === "patrol" && distanceToPlayer < spec.engageRange) enemy.mode = "pursuit";
        if (enemy.mode === "pursuit" && distanceToPlayer > spec.disengageRange) enemy.mode = "patrol";

        const leader = spec.behavior === "formation"
          ? enemies.find((candidate) => candidate.alive && candidate.wave === enemy.wave && candidate.id !== enemy.id && candidate.id === enemy.formationLeaderId)
            || enemies.find((candidate) => candidate.alive && candidate.wave === enemy.wave && candidate.id !== enemy.id)
          : null;

        let targetPoint;
        if (enemy.mode === "pursuit") {
          targetPoint = enemy.targetPoint.copy(player.position)
            .addScaledVector(tmpV5, -spec.pursuitBack)
            .addScaledVector(WORLD_UP, spec.verticalBias + Math.sin(time * spec.verticalFrequency + enemy.seed) * spec.verticalAmplitude);

          if (spec.behavior === "evasive") {
            const phase = time * spec.evadeFrequency + enemy.seed;
            targetPoint
              .addScaledVector(tmpV6, Math.sin(phase) * spec.evadeLateral)
              .addScaledVector(tmpV7, Math.cos(phase * 0.77) * spec.evadeVertical);
          } else if (spec.behavior === "formation" && leader) {
            forwardOf(leader.group, tmpV8);
            rightOf(leader.group, tmpV3);
            enemy.formationPoint.copy(leader.group.position)
              .addScaledVector(tmpV8, -44)
              .addScaledVector(tmpV3, enemy.formationSide * 82)
              .addScaledVector(WORLD_UP, 18);
            targetPoint.lerp(enemy.formationPoint, spec.formationWeight);
            enemy.formationActive = true;
          }

          enemy.targetSpeed = Math.min(spec.maxSpeed + (enemy.wave - 1) * 4, playerSpeed + spec.pursuitBonus);
        } else if (spec.behavior === "formation" && leader) {
          forwardOf(leader.group, tmpV8);
          rightOf(leader.group, tmpV3);
          targetPoint = enemy.formationPoint.copy(leader.group.position)
            .addScaledVector(tmpV8, -38)
            .addScaledVector(tmpV3, enemy.formationSide * 88)
            .addScaledVector(WORLD_UP, 14);
          enemy.targetSpeed = Math.min(spec.maxSpeed, leader.speed + 3);
          enemy.formationActive = true;
        } else {
          targetPoint = enemy.waypoints[enemy.waypointIndex];
          if (enemy.group.position.distanceToSquared(targetPoint) < 85 * 85) {
            enemy.waypointIndex = (enemy.waypointIndex + 1) % enemy.waypoints.length;
            targetPoint = enemy.waypoints[enemy.waypointIndex];
          }
          enemy.targetSpeed = spec.patrolSpeed + (enemy.wave - 1) * 7;
        }

        if (enemy.group.position.y < 70) {
          targetPoint = enemy.safeTarget.copy(targetPoint);
          targetPoint.y = 150;
        }

        tmpV4.copy(targetPoint).sub(enemy.group.position);
        if (tmpV4.lengthSq() > 0.00001) {
          tmpV4.normalize();
          tmpQ1.setFromUnitVectors(LOCAL_FORWARD, tmpV4);
          const turnRate = enemy.mode === "pursuit" ? spec.pursuitTurn : spec.patrolTurn;
          enemy.group.quaternion.rotateTowards(tmpQ1, turnRate * dt);
          enemy.group.quaternion.normalize();
        }

        enemy.speed = THREE.MathUtils.lerp(enemy.speed, enemy.targetSpeed, damping(spec.speedResponse, dt));
        forwardOf(enemy.group, tmpV4);
        enemy.group.position.addScaledVector(tmpV4, enemy.speed * dt);

        const baseFlame = spec.behavior === "evasive" ? 1.18 : (spec.behavior === "armored" ? 0.82 : 1.0);
        const flamePulse = baseFlame + Math.sin(time * 12 + enemy.seed) * 0.16;
        for (const flame of enemy.model.flames) flame.scale.z = flamePulse;

        enemy.fireCooldown -= dt;
        if (enemy.fireCooldown <= 0) {
          attemptEnemyAttack(enemy);
          enemy.fireCooldown = spec.fireMin + Math.random() * spec.fireSpread;
        }

        enemy.missileCooldown -= dt;
        if (enemy.missileCooldown <= 0) {
          const profile = ENEMY_MISSILE_PROFILES[enemy.type];
          const launched = attemptEnemyMissile(enemy);
          enemy.missileCooldown = launched && profile
            ? profile.cooldownMin + Math.random() * profile.cooldownSpread
            : 1.15 + Math.random() * 0.85;
        }
      }
    }

    function attemptEnemyAttack''',
"enemy AI with missiles",
flags=re.S,
)

replace_once(
'''      keys.clear();
      resetLock();
      ui.boostIndicator.classList.remove("active");''',
'''      keys.clear();
      resetLock();
      cameraFocusActive = false;
      cameraFocusTargetId = null;
      cameraFocusSource = null;
      nearestMissileThreat = null;
      for (let i = enemyMissiles.length - 1; i >= 0; i -= 1) removeEnemyMissile(i);
      ui.boostIndicator.classList.remove("active");''',
"mission completion cleanup",
)

replace_regex(
r'''    function updateCamera\(dt\) \{.*?\n    \}\n\n    function snapCamera\(\) \{.*?\n    \}\n\n    function updateVisualStatus''',
'''    function updateCamera(dt) {
      forwardOf(player, tmpV1);
      upOf(player, tmpV2);
      const profile = CAMERA_PROFILES[cameraMode] || CAMERA_PROFILES.chase;
      const focusTarget = resolveCameraFocusTarget();

      tmpV3.copy(WORLD_UP)
        .multiplyScalar(1 - profile.rollFollow)
        .addScaledVector(tmpV2, profile.rollFollow)
        .normalize();
      const desiredPosition = tmpV4.copy(player.position)
        .addScaledVector(tmpV1, -profile.back)
        .addScaledVector(tmpV3, profile.height);

      cameraShake = Math.max(0, cameraShake - dt * 1.9);
      if (cameraShake > 0) {
        desiredPosition.x += (Math.random() - 0.5) * cameraShake * 2.6;
        desiredPosition.y += (Math.random() - 0.5) * cameraShake * 2.2;
        desiredPosition.z += (Math.random() - 0.5) * cameraShake * 2.6;
      }

      const desiredLook = tmpV5.copy(player.position)
        .addScaledVector(tmpV1, profile.look)
        .addScaledVector(tmpV3, profile.lookHeight);
      if (focusTarget) {
        desiredLook.copy(focusTarget.group.position).addScaledVector(WORLD_UP, 1.8);
      }

      camera.position.lerp(desiredPosition, damping(0.0017, dt));
      cameraLook.lerp(desiredLook, damping(focusTarget ? 0.00008 : 0.0005, dt));
      cameraUp.lerp(tmpV3, damping(0.003, dt)).normalize();
      tmpM1.lookAt(camera.position, cameraLook, cameraUp);
      tmpQ1.setFromRotationMatrix(tmpM1);
      camera.quaternion.slerp(tmpQ1, damping(focusTarget ? 0.00012 : 0.0007, dt));
      camera.quaternion.normalize();

      world.skyGroup.position.copy(camera.position);
    }

    function snapCamera() {
      forwardOf(player, tmpV1);
      upOf(player, tmpV2);
      const profile = CAMERA_PROFILES[cameraMode] || CAMERA_PROFILES.chase;
      cameraUp.copy(WORLD_UP)
        .multiplyScalar(1 - profile.rollFollow)
        .addScaledVector(tmpV2, profile.rollFollow)
        .normalize();
      camera.position.copy(player.position)
        .addScaledVector(tmpV1, -profile.back)
        .addScaledVector(cameraUp, profile.height);
      cameraLook.copy(player.position)
        .addScaledVector(tmpV1, profile.look)
        .addScaledVector(cameraUp, profile.lookHeight);
      tmpM1.lookAt(camera.position, cameraLook, cameraUp);
      camera.quaternion.setFromRotationMatrix(tmpM1);
      world.skyGroup.position.copy(camera.position);
    }

    function updateVisualStatus''',
"target focus camera",
flags=re.S,
)

replace_regex(
r'''    function updateHud\(\) \{.*?\n    \}\n\n    function syncGameHook''',
'''    function updateHud() {
      ui.state.textContent = gameState;
      ui.score.textContent = String(Math.round(score));
      ui.highscore.textContent = String(Math.round(highscore));
      ui.health.textContent = String(Math.round(health));
      ui.missiles.textContent = String(Math.round(missileCount));
      ui.kills.textContent = String(Math.round(kills));
      ui.speed.textContent = String(Math.round(playerSpeed * 3.6));
      ui.altitude.textContent = String(Math.max(0, Math.round(player.position.y)));
      ui.wave.textContent = `WAVE ${waveNumber} / 2`;
      const expertMode = controlMode === CONTROL_EXPERT;
      ui.controlModeStatus.textContent = expertMode
        ? "FLIGHT CONTROL · EXPERT · Q/E + R-STICK YAW · M/SHARE TOGGLE"
        : "FLIGHT CONTROL · NORMAL · COORDINATED TURN · M/SHARE TOGGLE";
      ui.controlModeStatus.classList.toggle("expert", expertMode);
      ui.healthBar.style.transform = `scaleX(${THREE.MathUtils.clamp(health / 100, 0, 1)})`;
      ui.statusPanel.classList.toggle("healthLow", health <= 30);

      const lowSpeed = gameState === STATE_PLAYING && playerSpeed < STALL_WARNING_SPEED;
      ui.stallWarning.classList.toggle("active", lowSpeed || stalling);
      ui.stallWarning.classList.toggle("caution", lowSpeed && !stalling);
      ui.stallWarning.textContent = stalling
        ? "STALL · ACCELERATE / LOWER NOSE"
        : "LOW SPEED · STALL RISK";

      ui.cameraFocusStatus.classList.toggle("active", cameraFocusActive);
      ui.cameraFocusStatus.textContent = cameraFocusActive
        ? `TARGET VIEW · ${cameraFocusTargetId}`
        : "TARGET VIEW";

      const threat = nearestMissileThreat;
      ui.missileWarning.classList.toggle("active", Boolean(threat));
      ui.missileWarning.textContent = threat
        ? `MISSILE ALERT · ${threat.direction} · ${Math.round(threat.distance)}M`
        : "MISSILE ALERT";

      if (ui.missilePips.childElementCount !== PLAYER_MISSILE_CAPACITY) {
        ui.missilePips.replaceChildren(...Array.from({ length: PLAYER_MISSILE_CAPACITY }, () => {
          const pip = document.createElement("span");
          pip.className = "missilePip";
          return pip;
        }));
      }
      Array.from(ui.missilePips.children).forEach((pip, index) => {
        pip.classList.toggle("empty", index >= missileCount);
      });

      forwardOf(player, tmpV1);
      rightOf(player, tmpV2);
      upOf(player, tmpV3);
      const pitch = Math.asin(THREE.MathUtils.clamp(tmpV1.y, -1, 1));
      const bank = Math.atan2(tmpV2.y, tmpV3.y);
      ui.pitchLadder.style.transform = `translate(-50%, calc(-50% + ${pitch * 178}px)) rotate(${-bank * 0.7}rad)`;
    }

    function syncGameHook''',
"HUD warnings and missile capacity",
flags=re.S,
)

replace_regex(
r'''    function syncGameHook\(\) \{.*?\n    \}\n\n    function drawRadar''',
'''    function syncGameHook() {
      const hook = window.__game;
      forwardOf(player, tmpV1);
      hook.state = gameState;
      hook.score = Math.round(score);
      hook.highscore = Math.round(highscore);
      hook.health = Math.round(health);
      hook.missiles = Math.round(missileCount);
      hook.kills = Math.round(kills);
      hook.controlMode = controlMode;
      hook.cameraMode = cameraMode;
      hook.selectedTargetId = preferredTargetId ?? lock.targetId;
      hook.weapons.gunShots = gunShots;
      hook.weapons.missilesLaunched = missilesLaunched;
      hook.weapons.enemyMissilesLaunched = enemyMissilesLaunched;
      hook.flight.stalling = stalling;
      hook.flight.stallSeverity = stallSeverity;
      hook.flight.rollRate = rollRate;
      hook.flight.turnFactor = playerTurnFactor;
      hook.flight.controlAuthority = playerControlAuthority;
      hook.cameraFocus.active = cameraFocusActive;
      hook.cameraFocus.targetId = cameraFocusTargetId;
      hook.cameraFocus.source = cameraFocusSource;
      hook.audio.lockBeeps = audioSystem.lockBeeps;
      hook.audio.lockCompleteCues = audioSystem.lockCompleteCues;
      hook.audio.threatBeeps = audioSystem.threatBeeps;
      hook.player.position.x = player.position.x;
      hook.player.position.y = player.position.y;
      hook.player.position.z = player.position.z;
      hook.player.forward.x = tmpV1.x;
      hook.player.forward.y = tmpV1.y;
      hook.player.forward.z = tmpV1.z;
      hook.player.speed = playerSpeed;
      hook.enemies = enemies.map((enemy) => ({
        id: enemy.id,
        position: {
          x: enemy.group.position.x,
          y: enemy.group.position.y,
          z: enemy.group.position.z
        },
        alive: enemy.alive,
        isLocked: enemy.alive && lock.locked && lock.targetId === enemy.id,
        type: enemy.type,
        label: enemy.label,
        role: enemy.role,
        behavior: enemy.behavior,
        hp: Math.max(0, Math.round(enemy.hp)),
        maxHp: enemy.maxHp,
        speed: enemy.speed,
        mode: enemy.mode,
        formationLeaderId: enemy.formationLeaderId,
        formationActive: enemy.formationActive,
        missileReadyIn: Math.max(0, enemy.missileCooldown)
      }));
      hook.threats.incomingMissiles = enemyMissiles.map((missile) => ({
        id: missile.id,
        ownerId: missile.ownerId,
        ownerType: missile.ownerType,
        position: {
          x: missile.mesh.position.x,
          y: missile.mesh.position.y,
          z: missile.mesh.position.z
        },
        distance: missile.mesh.position.distanceTo(player.position)
      }));
      hook.threats.nearest = nearestMissileThreat ? { ...nearestMissileThreat } : null;
      hook.lock.targetId = lock.targetId;
      hook.lock.progress = lock.progress;
      hook.lock.locked = lock.locked;
    }

    function drawRadar''',
"expanded runtime hook",
flags=re.S,
)

replace_once(
'''      ctx.fillStyle = "#aaf8ff";
      ctx.shadowColor = "#72eaff";''',
'''      for (const missile of enemyMissiles) {
        tmpV3.copy(missile.mesh.position).sub(player.position);
        const rightDistance = tmpV3.dot(tmpV2);
        const forwardDistance = tmpV3.dot(lastRadarForward);
        const planarDistance = Math.hypot(rightDistance, forwardDistance);
        const scale = Math.min(1, planarDistance / RADAR_RANGE);
        const angle = Math.atan2(rightDistance, forwardDistance);
        const px = center + Math.sin(angle) * radius * scale;
        const py = center - Math.cos(angle) * radius * scale;
        ctx.fillStyle = "#ffd84f";
        ctx.shadowColor = "#ff7b32";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(px, py - 4);
        ctx.lineTo(px - 3.5, py + 3);
        ctx.lineTo(px + 3.5, py + 3);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = "#aaf8ff";
      ctx.shadowColor = "#72eaff";''',
"enemy missile radar marks",
)

replace_once(
'''      for (const missile of missilesInFlight) scene.remove(missile.mesh);
      missilesInFlight.length = 0;

      for (const effect of effects) {''',
'''      for (const missile of missilesInFlight) scene.remove(missile.mesh);
      missilesInFlight.length = 0;

      for (const missile of enemyMissiles) scene.remove(missile.mesh);
      enemyMissiles.length = 0;
      nearestMissileThreat = null;

      for (const effect of effects) {''',
"enemy missile cleanup",
)

replace_once(
'''    function createMissileModel() {
      const root = new THREE.Group();
      const body = new THREE.Mesh(geometry.missileBody, shared.missileBody);
      const nose = new THREE.Mesh(geometry.missileNose, shared.missileNose);
      const fins = new THREE.Mesh(geometry.missileFins, shared.missileFin);
      const glow = new THREE.Mesh(geometry.missileGlow, shared.missileGlow);
      nose.position.z = -2.35;
      fins.position.z = 1.25;
      glow.position.z = 2.45;
      root.add(body, nose, fins, glow);
      return root;
    }''',
'''    function createMissileModel(enemyOwned = false) {
      const root = new THREE.Group();
      const body = new THREE.Mesh(
        geometry.missileBody,
        enemyOwned ? shared.enemyMissileBody : shared.missileBody
      );
      const nose = new THREE.Mesh(
        geometry.missileNose,
        enemyOwned ? shared.enemyMissileNose : shared.missileNose
      );
      const fins = new THREE.Mesh(
        geometry.missileFins,
        enemyOwned ? shared.enemyMissileFin : shared.missileFin
      );
      const glow = new THREE.Mesh(
        geometry.missileGlow,
        enemyOwned ? shared.enemyMissileGlow : shared.missileGlow
      );
      nose.position.z = -2.35;
      fins.position.z = 1.25;
      glow.position.z = 2.45;
      if (enemyOwned) root.scale.setScalar(0.88);
      root.add(body, nose, fins, glow);
      return root;
    }''',
"missile model ownership palette",
)

replace_regex(
r'''    function createSharedMaterials\(\) \{.*?\n    \}\n\n    function createAircraftModel''',
'''    function createSharedMaterials() {
      return {
        hitbox: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
        missileBody: new THREE.MeshStandardMaterial({ color: 0xe8eef1, metalness: 0.65, roughness: 0.35 }),
        missileNose: new THREE.MeshStandardMaterial({ color: 0xc22d3b, metalness: 0.35, roughness: 0.45 }),
        missileFin: new THREE.MeshStandardMaterial({ color: 0x29313a, metalness: 0.55, roughness: 0.4 }),
        missileGlow: new THREE.MeshBasicMaterial({
          color: 0xffcf69,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        }),
        enemyMissileBody: new THREE.MeshStandardMaterial({ color: 0x692025, metalness: 0.5, roughness: 0.42 }),
        enemyMissileNose: new THREE.MeshStandardMaterial({ color: 0xff4c42, emissive: 0x64110d, emissiveIntensity: 1.2, roughness: 0.34 }),
        enemyMissileFin: new THREE.MeshStandardMaterial({ color: 0x241518, metalness: 0.4, roughness: 0.48 }),
        enemyMissileGlow: new THREE.MeshBasicMaterial({
          color: 0xff3b25,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      };
    }

    function createAircraftModel''',
"enemy missile materials",
flags=re.S,
)

# Static invariants and syntax-check extraction.
required = [
    'const PLAYER_MISSILE_CAPACITY = 10;',
    'const ENEMY_MISSILE_PROFILES = Object.freeze({',
    'function updateEnemyMissiles(dt)',
    'function updateAudioCues(dt)',
    'TARGET_FOCUS_HOLD_MS',
    'gamepadInput.gun = gamepadButtonPressed(selected, 0);',
    'const missilePressed = gamepadButtonPressed(selected, 1);',
    'const cameraPressed = gamepadButtonPressed(selected, 2);',
    'const targetPressed = gamepadButtonPressed(selected, 3);',
    'type: enemy.type',
    'label: enemy.label',
    'VIPER',
    'BISON',
    'LANCER',
]
for needle in required:
    if needle not in text:
        raise SystemExit(f"missing required invariant: {needle}")

if text.count('id="score"') != 1 or text.count('id="highscore"') != 1:
    raise SystemExit("required score DOM IDs are not unique")
for dom_id in ("health", "missiles", "kills", "state", "startBtn", "retryBtn",
               "stallWarning", "missileWarning", "cameraFocusStatus"):
    if text.count(f'id="{dom_id}"') != 1:
        raise SystemExit(f"required DOM id {dom_id} is missing or duplicated")

if "@latest" in text:
    raise SystemExit("floating Three.js version detected")
if "three@0.180.0" not in text:
    raise SystemExit("pinned Three.js version missing")

path.write_text(text, encoding="utf-8")

module_match = re.search(r'<script type="module">\s*(.*?)\s*</script>', text, flags=re.S)
if not module_match:
    raise SystemExit("module script not found")
Path("/tmp/sortie-game.mjs").write_text(module_match.group(1) + "\n", encoding="utf-8")
print("patched index.html")
