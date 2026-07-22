from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one anchor, found {count}")
    text = text.replace(old, new, 1)


replace_once(
    '        <div class="controlItem"><strong>W / S · ↑ / ↓</strong><span>ダイブ / プル。ロール中にプルすると旋回。</span></div>\n'
    '        <div class="controlItem"><strong>A / D · ← / →</strong><span>左ロール / 右ロール。</span></div>',
    '        <div class="controlItem"><strong>W / S · ↑ / ↓</strong><span>ダイブ / プル。バンク中も機首の上下を維持。</span></div>\n'
    '        <div class="controlItem"><strong>A / D · ← / →</strong><span>左バンク / 右バンク。入力を離すと自動水平復帰。</span></div>',
    "keyboard flight help",
)

replace_once(
    '        <div class="controlItem"><strong>GAMEPAD</strong><span>左スティック/D-Padで操縦、RT/LTで加減速、RBで機銃、A/LBでミサイル。</span></div>',
    '        <div class="controlItem"><strong>GAMEPAD</strong><span>左スティック/D-Padでバンクとピッチ、RT/LTで加減速、RBで機銃、A/LBでミサイル。</span></div>',
    "gamepad flight help",
)

replace_once(
    '    const PITCH_RATE = THREE.MathUtils.degToRad(58);\n'
    '    const ROLL_RATE = THREE.MathUtils.degToRad(98);',
    '    const PITCH_RATE = THREE.MathUtils.degToRad(58);\n'
    '    const MAX_BANK_ANGLE = THREE.MathUtils.degToRad(68);\n'
    '    const COORDINATED_TURN_RATE = THREE.MathUtils.degToRad(42);\n'
    '    const BANK_RESPONSE_K = 0.006;',
    "coordinated turn constants",
)

replace_once(
    '    let missionElapsed = 0;\n    let playerHitCooldown = 0;',
    '    let missionElapsed = 0;\n    let playerHitCooldown = 0;\n    let playerBank = 0;',
    "player bank state",
)

replace_once(
    '    scene.add(player);\n\n    const cameraLook = new THREE.Vector3();',
    '    scene.add(player);\n    const playerFlightFrame = new THREE.Quaternion();\n\n    const cameraLook = new THREE.Vector3();',
    "unbanked flight frame",
)

replace_once(
    '    function resetPlayerTransform() {\n'
    '      player.position.set(0, 260, 620);\n'
    '      player.quaternion.identity();\n'
    '      player.quaternion.normalize();\n'
    '    }',
    '    function resetPlayerTransform() {\n'
    '      player.position.set(0, 260, 620);\n'
    '      playerFlightFrame.identity();\n'
    '      playerBank = 0;\n'
    '      syncPlayerOrientation();\n'
    '    }',
    "player transform reset",
)

replace_once(
    '    function updatePlayer(dt) {',
    '    function syncPlayerOrientation() {\n'
    '      tmpQ1.setFromAxisAngle(LOCAL_FORWARD, -playerBank);\n'
    '      player.quaternion.copy(playerFlightFrame).multiply(tmpQ1).normalize();\n'
    '    }\n\n'
    '    function updatePlayer(dt) {',
    "player orientation helper",
)

replace_once(
    '      const pitchInput = THREE.MathUtils.clamp(keyboardPitch + gamepadInput.pitch, -1, 1);\n'
    '      const rollInput = THREE.MathUtils.clamp(keyboardRoll + gamepadInput.roll, -1, 1);\n\n'
    '      if (pitchInput !== 0) player.rotateX(pitchInput * PITCH_RATE * dt);\n'
    '      if (rollInput !== 0) player.rotateZ(rollInput * ROLL_RATE * dt);\n'
    '      player.quaternion.normalize();',
    '      const pitchInput = THREE.MathUtils.clamp(keyboardPitch + gamepadInput.pitch, -1, 1);\n'
    '      const rollInput = THREE.MathUtils.clamp(keyboardRoll + gamepadInput.roll, -1, 1);\n\n'
    '      const targetBank = rollInput * MAX_BANK_ANGLE;\n'
    '      playerBank = THREE.MathUtils.lerp(playerBank, targetBank, damping(BANK_RESPONSE_K, dt));\n\n'
    '      const turnSpeedFactor = THREE.MathUtils.clamp(\n'
    '        CRUISE_SPEED / Math.max(playerSpeed, 1),\n'
    '        0.72,\n'
    '        1.28\n'
    '      );\n'
    '      const turnRate = Math.sin(playerBank) * COORDINATED_TURN_RATE * turnSpeedFactor;\n'
    '      if (Math.abs(turnRate) > 0.00001) {\n'
    '        tmpQ1.setFromAxisAngle(WORLD_UP, turnRate * dt);\n'
    '        playerFlightFrame.premultiply(tmpQ1).normalize();\n'
    '      }\n\n'
    '      if (Math.abs(pitchInput) > 0.00001) {\n'
    '        tmpQ1.setFromAxisAngle(LOCAL_RIGHT, pitchInput * PITCH_RATE * dt);\n'
    '        playerFlightFrame.multiply(tmpQ1).normalize();\n'
    '      }\n'
    '      syncPlayerOrientation();',
    "coordinated player rotation",
)

path.write_text(text, encoding="utf-8")

required = [
    "MAX_BANK_ANGLE",
    "COORDINATED_TURN_RATE",
    "BANK_RESPONSE_K",
    "playerFlightFrame.premultiply",
    "syncPlayerOrientation",
]
for token in required:
    if token not in text:
        raise SystemExit(f"missing required coordinated-turn token: {token}")
if "player.rotateZ(rollInput" in text or "ROLL_RATE" in text:
    raise SystemExit("legacy continuously accumulated roll logic remains")
if text.count('id="gamepadStatus"') != 1:
    raise SystemExit("gamepad HUD hook changed unexpectedly")
if text.count('id="state"') != 1 or text.count('id="health"') != 1:
    raise SystemExit("required automation hooks changed unexpectedly")

module = text.rsplit('<script type="module">', 1)[1].split("</script>", 1)[0]
Path("/tmp/sortie-game.mjs").write_text(module, encoding="utf-8")
