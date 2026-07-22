from pathlib import Path
import re

path = Path('index.html')
text = path.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one anchor, found {count}')
    text = text.replace(old, new, 1)


def replace_regex(pattern: str, replacement: str, label: str, flags: int = 0) -> None:
    global text
    text, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one regex match, found {count}')


replace_once(
    '<div id="controlModeStatus">FLIGHT CONTROL · NORMAL · M / Y TOGGLE</div>',
    '<div id="controlModeStatus">FLIGHT CONTROL · NORMAL · M / SHARE TOGGLE</div>',
    'initial mode HUD text',
)
replace_once(
    '<div class="controlItem"><strong>M / GAMEPAD Y</strong><span>NORMALとEXPERTをいつでも切替。</span></div>',
    '<div class="controlItem"><strong>M / SHARE</strong><span>NORMALとEXPERTをいつでも切替。</span></div>',
    'mode control help',
)
replace_once(
    '<div class="controlItem"><strong>GAMEPAD</strong><span>左スティックでロール/ピッチ。EXPERTは右スティック左右でヨー。</span></div>',
    '<div class="controlItem"><strong>GAMEPAD · TYPE A</strong><span>× 機銃、○ ミサイル、△ ターゲット、□ カメラ。R2/L2で加減速。</span></div>',
    'gamepad control help',
)

replace_once(
    '    const GAMEPAD_DEADZONE = 0.18;',
    '''    const GAMEPAD_DEADZONE = 0.18;
    const CAMERA_MODES = ["chase", "close", "cockpit"];
    const CAMERA_PROFILES = Object.freeze({
      chase: Object.freeze({ back: 38, height: 13.5, look: 76, lookHeight: 3.2, rollFollow: 0.38 }),
      close: Object.freeze({ back: 22, height: 8.4, look: 70, lookHeight: 2.4, rollFollow: 0.5 }),
      cockpit: Object.freeze({ back: -4.8, height: 1.9, look: 96, lookHeight: 0.9, rollFollow: 0.9 })
    });''',
    'camera constants',
)

replace_once(
    '    let playerBank = 0;\n    let controlMode = CONTROL_NORMAL;',
    '    let playerBank = 0;\n    let controlMode = CONTROL_NORMAL;\n    let cameraMode = CAMERA_MODES[0];\n    let preferredTargetId = null;',
    'camera and target state',
)

replace_once(
    '''      missile: false,
      previousMissile: false,
      previousStart: false,
      previousModeToggle: false''',
    '''      missile: false,
      previousMissile: false,
      previousStart: false,
      previousModeToggle: false,
      previousTarget: false,
      previousCamera: false''',
    'gamepad edge state',
)

replace_once(
    '''      kills,
      controlMode,
      player: {''',
    '''      kills,
      controlMode,
      cameraMode,
      selectedTargetId: null,
      player: {''',
    'game hook camera and target fields',
)

replace_once(
    '''      if (event.code === "KeyM" && !event.repeat) {
        toggleControlMode();
        return;
      }

      if (event.code === "Enter" && !event.repeat) {''',
    '''      if (event.code === "KeyM" && !event.repeat) {
        toggleControlMode();
        return;
      }

      if (event.code === "Tab" && !event.repeat) {
        if (gameState === STATE_PLAYING) cycleTarget();
        return;
      }

      if (event.code === "KeyC" && !event.repeat) {
        cycleCamera();
        return;
      }

      if (event.code === "Enter" && !event.repeat) {''',
    'keyboard target and camera controls',
)

replace_once(
    '''        code === "KeyQ" || code === "KeyE" || code === "KeyM" ||
        code === "Space" || code === "Enter";''',
    '''        code === "KeyQ" || code === "KeyE" || code === "KeyM" || code === "KeyC" || code === "Tab" ||
        code === "Space" || code === "Enter";''',
    'keyboard control key list',
)

replace_once(
    '''      gamepadInput.previousMissile = false;
      gamepadInput.previousStart = false;
      gamepadInput.previousModeToggle = false;''',
    '''      gamepadInput.previousMissile = false;
      gamepadInput.previousStart = false;
      gamepadInput.previousModeToggle = false;
      gamepadInput.previousTarget = false;
      gamepadInput.previousCamera = false;''',
    'clear gamepad edges',
)

replace_once(
    '''      gamepadInput.gun = gamepadButtonPressed(selected, 5);

      const missilePressed = gamepadButtonPressed(selected, 0) || gamepadButtonPressed(selected, 4);
      const startPressed = gamepadButtonPressed(selected, 9) || missilePressed;
      const modePressed = gamepadButtonPressed(selected, 3);
      const wasPlaying = gameState === STATE_PLAYING;

      if (modePressed && !gamepadInput.previousModeToggle) toggleControlMode();
      if (!wasPlaying && startPressed && !gamepadInput.previousStart) startMission();
      if (wasPlaying && missilePressed && !gamepadInput.previousMissile) launchMissile();

      gamepadInput.missile = missilePressed;
      gamepadInput.previousMissile = missilePressed;
      gamepadInput.previousStart = startPressed;
      gamepadInput.previousModeToggle = modePressed;''',
    '''      // Standard Gamepad mapping / Ace Combat 7 Type A:
      // 0 = Cross/A (gun), 1 = Circle/B (missile), 2 = Square/X (camera),
      // 3 = Triangle/Y (target), 6/7 = L2/R2, 8 = Share/View.
      gamepadInput.gun = gamepadButtonPressed(selected, 0);

      const missilePressed = gamepadButtonPressed(selected, 1);
      const cameraPressed = gamepadButtonPressed(selected, 2);
      const targetPressed = gamepadButtonPressed(selected, 3);
      const startPressed = gamepadButtonPressed(selected, 9) || missilePressed;
      const modePressed = gamepadButtonPressed(selected, 8);
      const wasPlaying = gameState === STATE_PLAYING;

      if (modePressed && !gamepadInput.previousModeToggle) toggleControlMode();
      if (!wasPlaying && startPressed && !gamepadInput.previousStart) startMission();
      if (cameraPressed && !gamepadInput.previousCamera) cycleCamera();
      if (wasPlaying && targetPressed && !gamepadInput.previousTarget) cycleTarget();
      if (wasPlaying && missilePressed && !gamepadInput.previousMissile) launchMissile();

      gamepadInput.missile = missilePressed;
      gamepadInput.previousMissile = missilePressed;
      gamepadInput.previousStart = startPressed;
      gamepadInput.previousModeToggle = modePressed;
      gamepadInput.previousTarget = targetPressed;
      gamepadInput.previousCamera = cameraPressed;''',
    'Ace Combat Type A gamepad mapping',
)

replace_once(
    '''    function toggleControlMode() {
      setControlMode(controlMode === CONTROL_NORMAL ? CONTROL_EXPERT : CONTROL_NORMAL);
    }

    function damping(k, dt) {''',
    '''    function toggleControlMode() {
      setControlMode(controlMode === CONTROL_NORMAL ? CONTROL_EXPERT : CONTROL_NORMAL);
    }

    function cycleTarget() {
      if (gameState !== STATE_PLAYING) return;
      const living = enemies.filter((enemy) => enemy.alive).sort((a, b) => a.id - b.id);
      if (living.length === 0) return;

      const currentId = preferredTargetId ?? lock.targetId;
      const currentIndex = living.findIndex((enemy) => enemy.id === currentId);
      const next = living[(currentIndex + 1 + living.length) % living.length];
      preferredTargetId = next.id;
      lock.targetId = next.id;
      lock.progress = 0;
      lock.locked = false;
      showBanner(`TARGET SELECT · ${next.id}`, 0.75);
    }

    function cycleCamera() {
      const currentIndex = Math.max(0, CAMERA_MODES.indexOf(cameraMode));
      cameraMode = CAMERA_MODES[(currentIndex + 1) % CAMERA_MODES.length];
      showBanner(`CAMERA · ${cameraMode.toUpperCase()}`, 0.75);
    }

    function damping(k, dt) {''',
    'target and camera cycle functions',
)

replace_once(
    '      playerHitCooldown = 0;\n      setState(STATE_PLAYING);',
    '      playerHitCooldown = 0;\n      preferredTargetId = null;\n      setState(STATE_PLAYING);',
    'mission target reset',
)

replace_regex(
    r'''    function updateLock\(dt\) \{.*?\n    \}\n\n    function resetLock\(\) \{''',
    '''    function updateLock(dt) {
      forwardOf(player, tmpV1);
      let candidate = null;
      let bestScore = -Infinity;

      const preferred = enemies.find((enemy) => enemy.id === preferredTargetId && enemy.alive);
      if (preferredTargetId !== null && !preferred) preferredTargetId = null;

      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        if (preferred && enemy.id !== preferred.id) continue;
        tmpV2.copy(enemy.group.position).sub(player.position);
        const distance = tmpV2.length();
        if (distance > LOCK_RANGE || distance < 1) continue;
        tmpV2.multiplyScalar(1 / distance);
        const dot = tmpV1.dot(tmpV2);
        if (dot < LOCK_DOT) continue;
        const selectionScore = dot * 4 - distance / LOCK_RANGE;
        if (selectionScore > bestScore) {
          bestScore = selectionScore;
          candidate = enemy;
        }
      }

      if (!candidate) {
        resetLock();
        return;
      }

      if (lock.targetId !== candidate.id) {
        lock.targetId = candidate.id;
        lock.progress = 0;
        lock.locked = false;
      } else if (!lock.locked) {
        lock.progress = Math.min(1, lock.progress + dt / LOCK_TIME);
        lock.locked = lock.progress >= 1;
        if (lock.locked) showBanner(`MISSILE LOCK · TARGET ${candidate.id}`, 0.9, "danger");
      }
    }

    function resetLock() {''',
    'preferred target lock logic',
    flags=re.S,
)

replace_regex(
    r'''    function updateCamera\(dt\) \{.*?\n    \}\n\n    function snapCamera\(\) \{.*?\n    \}\n\n    function updateVisualStatus''',
    '''    function updateCamera(dt) {
      forwardOf(player, tmpV1);
      upOf(player, tmpV2);
      const profile = CAMERA_PROFILES[cameraMode] || CAMERA_PROFILES.chase;

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

      camera.position.lerp(desiredPosition, damping(0.0017, dt));
      cameraLook.lerp(desiredLook, damping(0.0005, dt));
      cameraUp.lerp(tmpV3, damping(0.003, dt)).normalize();
      tmpM1.lookAt(camera.position, cameraLook, cameraUp);
      tmpQ1.setFromRotationMatrix(tmpM1);
      camera.quaternion.slerp(tmpQ1, damping(0.0007, dt));
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
    'camera modes',
    flags=re.S,
)

replace_once(
    '''      ui.controlModeStatus.textContent = expertMode
        ? "FLIGHT CONTROL · EXPERT · Q/E + R-STICK YAW · M/Y TOGGLE"
        : "FLIGHT CONTROL · NORMAL · COORDINATED TURN · M/Y TOGGLE";''',
    '''      ui.controlModeStatus.textContent = expertMode
        ? "FLIGHT CONTROL · EXPERT · Q/E + R-STICK YAW · M/SHARE TOGGLE"
        : "FLIGHT CONTROL · NORMAL · COORDINATED TURN · M/SHARE TOGGLE";''',
    'runtime mode HUD text',
)

replace_once(
    '''      hook.kills = Math.round(kills);
      hook.controlMode = controlMode;
      hook.player.position.x = player.position.x;''',
    '''      hook.kills = Math.round(kills);
      hook.controlMode = controlMode;
      hook.cameraMode = cameraMode;
      hook.selectedTargetId = preferredTargetId ?? lock.targetId;
      hook.player.position.x = player.position.x;''',
    'runtime game hook camera and target',
)

# Guard the exact standard mapping requested by the user.
required = [
    'gamepadInput.gun = gamepadButtonPressed(selected, 0);',
    'const missilePressed = gamepadButtonPressed(selected, 1);',
    'const cameraPressed = gamepadButtonPressed(selected, 2);',
    'const targetPressed = gamepadButtonPressed(selected, 3);',
    'const modePressed = gamepadButtonPressed(selected, 8);',
    'event.code === "Tab"',
    'event.code === "KeyC"',
    'function cycleTarget()',
    'function cycleCamera()',
]
for token in required:
    if token not in text:
        raise SystemExit(f'missing required token: {token}')

for forbidden in [
    'gamepadInput.gun = gamepadButtonPressed(selected, 5);',
    'gamepadButtonPressed(selected, 0) || gamepadButtonPressed(selected, 4)',
    'const modePressed = gamepadButtonPressed(selected, 3);',
    'M/Y TOGGLE',
]:
    if forbidden in text:
        raise SystemExit(f'legacy mapping remains: {forbidden}')

if text.count('id="state"') != 1 or text.count('id="health"') != 1:
    raise SystemExit('required automation hooks changed unexpectedly')
if text.count('id="startBtn"') != 1 or text.count('id="retryBtn"') != 1:
    raise SystemExit('required start/retry controls changed unexpectedly')

path.write_text(text, encoding='utf-8')
module = text.rsplit('<script type="module">', 1)[1].split('</script>', 1)[0]
Path('/tmp/sortie-game.mjs').write_text(module, encoding='utf-8')
