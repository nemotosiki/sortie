from pathlib import Path

path = Path('index.html')
text = path.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one anchor, found {count}')
    text = text.replace(old, new, 1)


replace_once(
    '    #gamepadStatus {',
    '''    #controlModeStatus {
      position: absolute;
      left: 50%;
      top: 58px;
      transform: translateX(-50%);
      min-width: 250px;
      padding: 6px 12px;
      border: 1px solid rgba(157, 247, 255, 0.34);
      background: rgba(3, 15, 25, 0.58);
      color: rgba(178, 247, 255, 0.84);
      text-align: center;
      font-size: 9px;
      letter-spacing: 0.14em;
      white-space: nowrap;
      transition: color 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
    }

    #controlModeStatus.expert {
      color: #ffd45a;
      border-color: rgba(255, 212, 90, 0.58);
      box-shadow: inset 0 0 14px rgba(255, 196, 65, 0.08), 0 0 10px rgba(255, 196, 65, 0.1);
    }

    #gamepadStatus {''',
    'control mode HUD CSS',
)

replace_once(
    '      #stateStrip { top: 108px; min-width: 70vw; }',
    '      #stateStrip { top: 108px; min-width: 70vw; }\n      #controlModeStatus { top: 146px; }',
    'mobile control mode position',
)

replace_once(
    '    <div id="boostIndicator">AFTERBURNER</div>\n    <div id="gamepadStatus">GAMEPAD OFFLINE</div>',
    '    <div id="boostIndicator">AFTERBURNER</div>\n    <div id="controlModeStatus">FLIGHT CONTROL · NORMAL · M / Y TOGGLE</div>\n    <div id="gamepadStatus">GAMEPAD OFFLINE</div>',
    'control mode HUD element',
)

replace_once(
    '''        <div class="controlItem"><strong>W / S · ↑ / ↓</strong><span>ダイブ / プル。バンク中も機首の上下を維持。</span></div>
        <div class="controlItem"><strong>A / D · ← / →</strong><span>左バンク / 右バンク。入力を離すと自動水平復帰。</span></div>
        <div class="controlItem"><strong>SHIFT / CTRL</strong><span>ブースト / 減速。機体は常に前進。</span></div>
        <div class="controlItem"><strong>SPACE</strong><span>機銃。弾数無制限、押しっぱなしで連射。</span></div>
        <div class="controlItem"><strong>ENTER</strong><span>ロック完了時にミサイル発射。全6発。</span></div>
        <div class="controlItem"><strong>GAMEPAD</strong><span>左スティック/D-Padでバンクとピッチ、RT/LTで加減速、RBで機銃、A/LBでミサイル。</span></div>
        <div class="controlItem"><strong>OBJECTIVE</strong><span>HPを保ち、全ターゲットを撃墜せよ。</span></div>''',
    '''        <div class="controlItem"><strong>W / S · ↑ / ↓</strong><span>ピッチ。NORMAL / EXPERTの両モードで機首を上下。</span></div>
        <div class="controlItem"><strong>A / D · ← / →</strong><span>NORMALは目標バンク、EXPERTは直接ロール。</span></div>
        <div class="controlItem"><strong>Q / E</strong><span>EXPERT時のみ、機体ローカル軸で左 / 右ヨー。</span></div>
        <div class="controlItem"><strong>M / GAMEPAD Y</strong><span>NORMALとEXPERTをいつでも切替。</span></div>
        <div class="controlItem"><strong>SHIFT / CTRL</strong><span>ブースト / 減速。機体は常に前進。</span></div>
        <div class="controlItem"><strong>SPACE</strong><span>機銃。弾数無制限、押しっぱなしで連射。</span></div>
        <div class="controlItem"><strong>ENTER</strong><span>ロック完了時にミサイル発射。全6発。</span></div>
        <div class="controlItem"><strong>GAMEPAD</strong><span>左スティックでロール/ピッチ。EXPERTは右スティック左右でヨー。</span></div>
        <div class="controlItem"><strong>OBJECTIVE</strong><span>HPを保ち、全ターゲットを撃墜せよ。</span></div>''',
    'control help',
)

replace_once(
    '    const STATE_GAMEOVER = "gameover";',
    '    const STATE_GAMEOVER = "gameover";\n    const CONTROL_NORMAL = "normal";\n    const CONTROL_EXPERT = "expert";',
    'control mode constants',
)

replace_once(
    '''    const PITCH_RATE = THREE.MathUtils.degToRad(58);
    const MAX_BANK_ANGLE = THREE.MathUtils.degToRad(68);''',
    '''    const PITCH_RATE = THREE.MathUtils.degToRad(58);
    const EXPERT_ROLL_RATE = THREE.MathUtils.degToRad(98);
    const EXPERT_YAW_RATE = THREE.MathUtils.degToRad(48);
    const MAX_BANK_ANGLE = THREE.MathUtils.degToRad(68);''',
    'expert rotation rates',
)

replace_once(
    '      gamepadStatus: document.getElementById("gamepadStatus"),',
    '      gamepadStatus: document.getElementById("gamepadStatus"),\n      controlModeStatus: document.getElementById("controlModeStatus"),',
    'control mode UI reference',
)

replace_once(
    '    let playerHitCooldown = 0;\n    let playerBank = 0;',
    '    let playerHitCooldown = 0;\n    let playerBank = 0;\n    let controlMode = CONTROL_NORMAL;',
    'control mode state',
)

replace_once(
    '''      pitch: 0,
      roll: 0,
      boost: false,''',
    '''      pitch: 0,
      roll: 0,
      yaw: 0,
      boost: false,''',
    'gamepad yaw state',
)

replace_once(
    '''      missile: false,
      previousMissile: false,
      previousStart: false''',
    '''      missile: false,
      previousMissile: false,
      previousStart: false,
      previousModeToggle: false''',
    'gamepad mode edge state',
)

replace_once(
    '''      health,
      missiles: missileCount,
      kills,''',
    '''      health,
      missiles: missileCount,
      kills,
      controlMode,''',
    'game hook control mode',
)

replace_once(
    '''      if (event.code === "Enter" && !event.repeat) {''',
    '''      if (event.code === "KeyM" && !event.repeat) {
        toggleControlMode();
        return;
      }

      if (event.code === "Enter" && !event.repeat) {''',
    'keyboard mode toggle',
)

replace_once(
    '''        code === "ShiftLeft" || code === "ShiftRight" || code === "ControlLeft" || code === "ControlRight" ||
        code === "Space" || code === "Enter";''',
    '''        code === "ShiftLeft" || code === "ShiftRight" || code === "ControlLeft" || code === "ControlRight" ||
        code === "KeyQ" || code === "KeyE" || code === "KeyM" ||
        code === "Space" || code === "Enter";''',
    'control key list',
)

replace_once(
    '''      gamepadInput.pitch = 0;
      gamepadInput.roll = 0;
      gamepadInput.boost = false;''',
    '''      gamepadInput.pitch = 0;
      gamepadInput.roll = 0;
      gamepadInput.yaw = 0;
      gamepadInput.boost = false;''',
    'clear gamepad yaw',
)

replace_once(
    '''      gamepadInput.previousMissile = false;
      gamepadInput.previousStart = false;''',
    '''      gamepadInput.previousMissile = false;
      gamepadInput.previousStart = false;
      gamepadInput.previousModeToggle = false;''',
    'clear gamepad mode edge',
)

replace_once(
    '''      const axisX = applyDeadzone(Number(selected.axes?.[0] || 0));
      const axisY = applyDeadzone(Number(selected.axes?.[1] || 0));''',
    '''      const axisX = applyDeadzone(Number(selected.axes?.[0] || 0));
      const axisY = applyDeadzone(Number(selected.axes?.[1] || 0));
      const rightAxisX = applyDeadzone(Number(selected.axes?.[2] || 0));''',
    'right stick yaw axis',
)

replace_once(
    '''      gamepadInput.pitch = THREE.MathUtils.clamp(axisY + dpadPitch, -1, 1);
      gamepadInput.roll = THREE.MathUtils.clamp(-axisX + dpadRoll, -1, 1);
      gamepadInput.boost = gamepadButtonValue(selected, 7) > 0.22;''',
    '''      gamepadInput.pitch = THREE.MathUtils.clamp(axisY + dpadPitch, -1, 1);
      gamepadInput.roll = THREE.MathUtils.clamp(-axisX + dpadRoll, -1, 1);
      gamepadInput.yaw = -rightAxisX;
      gamepadInput.boost = gamepadButtonValue(selected, 7) > 0.22;''',
    'gamepad yaw input',
)

replace_once(
    '''      const missilePressed = gamepadButtonPressed(selected, 0) || gamepadButtonPressed(selected, 4);
      const startPressed = gamepadButtonPressed(selected, 9) || missilePressed;
      const wasPlaying = gameState === STATE_PLAYING;

      if (!wasPlaying && startPressed && !gamepadInput.previousStart) startMission();
      if (wasPlaying && missilePressed && !gamepadInput.previousMissile) launchMissile();

      gamepadInput.missile = missilePressed;
      gamepadInput.previousMissile = missilePressed;
      gamepadInput.previousStart = startPressed;''',
    '''      const missilePressed = gamepadButtonPressed(selected, 0) || gamepadButtonPressed(selected, 4);
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
    'gamepad mode toggle',
)

replace_once(
    '    function damping(k, dt) {',
    '''    function adoptNormalFlightFrame() {
      forwardOf(player, tmpV1);
      rightOf(player, tmpV2);
      tmpV3.copy(WORLD_UP);

      if (Math.abs(tmpV1.dot(tmpV3)) > 0.96) {
        upOf(player, tmpV3);
        tmpV3.addScaledVector(tmpV1, -tmpV3.dot(tmpV1));
        if (tmpV3.lengthSq() < 0.00001) tmpV3.set(0, 0, 1);
        tmpV3.normalize();
      }

      tmpV4.set(0, 0, 0);
      tmpV5.copy(tmpV1);
      tmpM1.lookAt(tmpV4, tmpV5, tmpV3);
      playerFlightFrame.setFromRotationMatrix(tmpM1).normalize();

      tmpV3.copy(LOCAL_RIGHT).applyQuaternion(playerFlightFrame).normalize();
      tmpV4.copy(LOCAL_UP).applyQuaternion(playerFlightFrame).normalize();
      playerBank = Math.atan2(tmpV2.dot(tmpV4), tmpV2.dot(tmpV3));
      syncPlayerOrientation();
    }

    function setControlMode(nextMode, announce = true) {
      if (nextMode !== CONTROL_NORMAL && nextMode !== CONTROL_EXPERT) return;
      if (nextMode === controlMode) return;

      if (nextMode === CONTROL_EXPERT) {
        playerFlightFrame.copy(player.quaternion).normalize();
        playerBank = 0;
      } else {
        adoptNormalFlightFrame();
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

    function toggleControlMode() {
      setControlMode(controlMode === CONTROL_NORMAL ? CONTROL_EXPERT : CONTROL_NORMAL);
    }

    function damping(k, dt) {''',
    'control mode transition functions',
)

replace_once(
    '''      const keyboardRoll = (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) -
        (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0);
      const pitchInput = THREE.MathUtils.clamp(keyboardPitch + gamepadInput.pitch, -1, 1);
      const rollInput = THREE.MathUtils.clamp(keyboardRoll + gamepadInput.roll, -1, 1);

      const targetBank = rollInput * MAX_BANK_ANGLE;
      playerBank = THREE.MathUtils.lerp(playerBank, targetBank, damping(BANK_RESPONSE_K, dt));

      const turnSpeedFactor = THREE.MathUtils.clamp(
        CRUISE_SPEED / Math.max(playerSpeed, 1),
        0.72,
        1.28
      );
      const turnRate = Math.sin(playerBank) * COORDINATED_TURN_RATE * turnSpeedFactor;
      if (Math.abs(turnRate) > 0.00001) {
        tmpQ1.setFromAxisAngle(WORLD_UP, turnRate * dt);
        playerFlightFrame.premultiply(tmpQ1).normalize();
      }

      if (Math.abs(pitchInput) > 0.00001) {
        tmpQ1.setFromAxisAngle(LOCAL_RIGHT, pitchInput * PITCH_RATE * dt);
        playerFlightFrame.multiply(tmpQ1).normalize();
      }
      syncPlayerOrientation();''',
    '''      const keyboardRoll = (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) -
        (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0);
      const keyboardYaw = (keys.has("KeyQ") ? 1 : 0) - (keys.has("KeyE") ? 1 : 0);
      const pitchInput = THREE.MathUtils.clamp(keyboardPitch + gamepadInput.pitch, -1, 1);
      const rollInput = THREE.MathUtils.clamp(keyboardRoll + gamepadInput.roll, -1, 1);
      const yawInput = THREE.MathUtils.clamp(keyboardYaw + gamepadInput.yaw, -1, 1);

      if (controlMode === CONTROL_NORMAL) {
        const targetBank = rollInput * MAX_BANK_ANGLE;
        playerBank = THREE.MathUtils.lerp(playerBank, targetBank, damping(BANK_RESPONSE_K, dt));

        const turnSpeedFactor = THREE.MathUtils.clamp(
          CRUISE_SPEED / Math.max(playerSpeed, 1),
          0.72,
          1.28
        );
        const turnRate = Math.sin(playerBank) * COORDINATED_TURN_RATE * turnSpeedFactor;
        if (Math.abs(turnRate) > 0.00001) {
          tmpQ1.setFromAxisAngle(WORLD_UP, turnRate * dt);
          playerFlightFrame.premultiply(tmpQ1).normalize();
        }

        if (Math.abs(pitchInput) > 0.00001) {
          tmpQ1.setFromAxisAngle(LOCAL_RIGHT, pitchInput * PITCH_RATE * dt);
          playerFlightFrame.multiply(tmpQ1).normalize();
        }
        syncPlayerOrientation();
      } else {
        if (Math.abs(pitchInput) > 0.00001) player.rotateX(pitchInput * PITCH_RATE * dt);
        if (Math.abs(yawInput) > 0.00001) player.rotateY(yawInput * EXPERT_YAW_RATE * dt);
        if (Math.abs(rollInput) > 0.00001) player.rotateZ(rollInput * EXPERT_ROLL_RATE * dt);
        player.quaternion.normalize();
        playerFlightFrame.copy(player.quaternion);
        playerBank = 0;
      }''',
    'normal and expert flight controls',
)

replace_once(
    '      ui.wave.textContent = `WAVE ${waveNumber} / 2`;',
    '''      ui.wave.textContent = `WAVE ${waveNumber} / 2`;
      const expertMode = controlMode === CONTROL_EXPERT;
      ui.controlModeStatus.textContent = expertMode
        ? "FLIGHT CONTROL · EXPERT · Q/E + R-STICK YAW · M/Y TOGGLE"
        : "FLIGHT CONTROL · NORMAL · COORDINATED TURN · M/Y TOGGLE";
      ui.controlModeStatus.classList.toggle("expert", expertMode);''',
    'control mode HUD update',
)

replace_once(
    '      hook.kills = Math.round(kills);',
    '      hook.kills = Math.round(kills);\n      hook.controlMode = controlMode;',
    'control mode hook sync',
)

path.write_text(text, encoding='utf-8')

required = [
    'CONTROL_NORMAL',
    'CONTROL_EXPERT',
    'EXPERT_ROLL_RATE',
    'EXPERT_YAW_RATE',
    'controlModeStatus',
    'gamepadInput.yaw',
    'player.rotateY(yawInput',
    'hook.controlMode = controlMode',
]
for token in required:
    if token not in text:
        raise SystemExit(f'missing expert control token: {token}')
if text.count('id="controlModeStatus"') != 1:
    raise SystemExit('control mode HUD element count is invalid')
if text.count('id="state"') != 1 or text.count('id="health"') != 1:
    raise SystemExit('required automation hooks changed unexpectedly')
if 'three@0.180.0' not in text or '@latest' in text:
    raise SystemExit('Three.js pinning changed unexpectedly')

module = text.rsplit('<script type="module">', 1)[1].split('</script>', 1)[0]
Path('/tmp/sortie-game.mjs').write_text(module, encoding='utf-8')
