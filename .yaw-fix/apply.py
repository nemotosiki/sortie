from pathlib import Path
import re

path = Path("index.html")
text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one occurrence, found {count}")
    text = text.replace(old, new, 1)


replace_once(
    "const EXPERT_YAW_RATE = THREE.MathUtils.degToRad(48);",
    "const YAW_RATE = THREE.MathUtils.degToRad(16);",
    "yaw rate constant",
)

replace_once(
    '<div class="controlItem"><strong>Q / E</strong><span>EXPERT時のみ、機体ローカル軸で左 / 右ヨー。</span></div>',
    '<div class="controlItem"><strong>Q / E · L1 / R1</strong><span>NORMAL / EXPERTの両モードで左 / 右ヨー。</span></div>',
    "yaw controls help",
)

replace_once(
    '<div class="controlItem"><strong>GAMEPAD · TYPE A</strong><span>× 機銃、○ ミサイル、△短押しでターゲット・長押しで注視、□カメラ。R2/L2で加減速。</span></div>',
    '<div class="controlItem"><strong>GAMEPAD · TYPE A</strong><span>× 機銃、○ ミサイル、△短押しでターゲット・長押しで注視、□カメラ。L1/R1でヨー、L2加速、R2減速。</span></div>',
    "gamepad controls help",
)

replace_once(
    "      const rightAxisX = applyDeadzone(Number(selected.axes?.[2] || 0));\n",
    "",
    "right stick yaw source",
)

dpad_anchor = """      const dpadRoll = (gamepadButtonPressed(selected, 14) ? 1 : 0) -
        (gamepadButtonPressed(selected, 15) ? 1 : 0);
"""
replace_once(
    dpad_anchor,
    dpad_anchor
    + """      const yawRight = gamepadButtonPressed(selected, 5) ? 1 : 0;
      const yawLeft = gamepadButtonPressed(selected, 4) ? 1 : 0;
""",
    "shoulder yaw inputs",
)

replace_once(
    "      gamepadInput.yaw = -rightAxisX;",
    "      gamepadInput.yaw = yawRight - yawLeft;",
    "gamepad yaw assignment",
)
replace_once(
    "      gamepadInput.boost = gamepadButtonValue(selected, 7) > 0.22;",
    "      gamepadInput.boost = gamepadButtonValue(selected, 6) > 0.22;",
    "L2 boost mapping",
)
replace_once(
    "      gamepadInput.brake = gamepadButtonValue(selected, 6) > 0.22;",
    "      gamepadInput.brake = gamepadButtonValue(selected, 7) > 0.22;",
    "R2 brake mapping",
)

replace_once(
    """      // 3 = Triangle/Y (short target cycle, long target view), 6/7 = L2/R2,
      // 8 = Share/View (NORMAL/EXPERT).""",
    """      // 3 = Triangle/Y (short target cycle, long target view), 4/5 = L1/R1 yaw,
      // 6 = L2 boost, 7 = R2 brake, 8 = Share/View (NORMAL/EXPERT).""",
    "gamepad mapping comment",
)

turn_block = """        if (Math.abs(turnRate) > 0.00001) {
          tmpQ1.setFromAxisAngle(WORLD_UP, turnRate * dt);
          playerFlightFrame.premultiply(tmpQ1).normalize();
        }
"""
replace_once(
    turn_block,
    turn_block
    + """
        if (Math.abs(yawInput) > 0.00001) {
          tmpQ1.setFromAxisAngle(WORLD_UP, yawInput * YAW_RATE * playerTurnFactor * dt);
          playerFlightFrame.premultiply(tmpQ1).normalize();
        }
""",
    "normal mode direct yaw",
)

replace_once(
    "player.rotateY(yawInput * EXPERT_YAW_RATE * playerTurnFactor * playerControlAuthority * dt);",
    "player.rotateY(yawInput * YAW_RATE * playerTurnFactor * playerControlAuthority * dt);",
    "expert mode yaw constant",
)

replace_once(
    "Q/E + R-STICK YAW",
    "Q/E + L1/R1 YAW",
    "expert HUD control text",
)
replace_once(
    "COORDINATED TURN · M/SHARE TOGGLE",
    "COORDINATED TURN + L1/R1 YAW · M/SHARE TOGGLE",
    "normal HUD control text",
)

required = [
    "const YAW_RATE = THREE.MathUtils.degToRad(16);",
    "const yawRight = gamepadButtonPressed(selected, 5) ? 1 : 0;",
    "const yawLeft = gamepadButtonPressed(selected, 4) ? 1 : 0;",
    "gamepadInput.yaw = yawRight - yawLeft;",
    "gamepadInput.boost = gamepadButtonValue(selected, 6) > 0.22;",
    "gamepadInput.brake = gamepadButtonValue(selected, 7) > 0.22;",
    "tmpQ1.setFromAxisAngle(WORLD_UP, yawInput * YAW_RATE * playerTurnFactor * dt);",
    "player.rotateY(yawInput * YAW_RATE * playerTurnFactor * playerControlAuthority * dt);",
    "4/5 = L1/R1 yaw",
    "6 = L2 boost, 7 = R2 brake",
    "Q/E + L1/R1 YAW",
    "COORDINATED TURN + L1/R1 YAW",
]
for marker in required:
    if marker not in text:
        raise SystemExit(f"missing required marker: {marker}")

obsolete = [
    "EXPERT_YAW_RATE",
    "rightAxisX",
    "gamepadInput.yaw = -rightAxisX;",
    "gamepadInput.boost = gamepadButtonValue(selected, 7) > 0.22;",
    "gamepadInput.brake = gamepadButtonValue(selected, 6) > 0.22;",
    "R-STICK YAW",
    "EXPERT時のみ、機体ローカル軸で左 / 右ヨー。",
]
for marker in obsolete:
    if marker in text:
        raise SystemExit(f"obsolete implementation remains: {marker}")

if text.count("YAW_RATE") != 3:
    raise SystemExit(
        f"expected YAW_RATE definition plus two uses, found {text.count('YAW_RATE')}"
    )
if text.count("if (Math.abs(yawInput) > 0.00001)") != 2:
    raise SystemExit("NORMAL and EXPERT yaw branches are not both present")

scripts = re.findall(r'<script type="module">(.*?)</script>', text, flags=re.S)
if len(scripts) != 1:
    raise SystemExit(f"expected one module script, found {len(scripts)}")
Path("/tmp/sortie-game.mjs").write_text(scripts[0], encoding="utf-8")

for element_id in [
    "score",
    "highscore",
    "health",
    "missiles",
    "kills",
    "state",
    "startBtn",
    "retryBtn",
]:
    if text.count(f'id="{element_id}"') != 1:
        raise SystemExit(f"required DOM id {element_id!r} is missing or duplicated")

if "three@0.180.0" not in text or "@latest" in text:
    raise SystemExit("Three.js version pin changed")
if "console.warn(" in text or "console.error(" in text:
    raise SystemExit("console warning/error call added")

path.write_text(text, encoding="utf-8")
