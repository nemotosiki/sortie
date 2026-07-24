from pathlib import Path
import re

path = Path("index.html")
text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    if new in text:
        if text.count(new) != 1:
            raise SystemExit(f"{label}: new form duplicated")
        print(f"{label}: already applied")
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one old form, found {count}")
    text = text.replace(old, new, 1)
    print(f"{label}: applied")


replace_once(
    "    const LOCK_TIME = 1.2;",
    "    const LOCK_TIME = 0.85;",
    "lock time",
)
replace_once(
    "    const LOCK_DOT = Math.cos(THREE.MathUtils.degToRad(9));",
    "    const LOCK_DOT = Math.cos(THREE.MathUtils.degToRad(16));\n"
    "    const LOCK_GRACE_TIME = 0.4;\n"
    "    const LOCK_HYSTERESIS_BONUS = 0.15;",
    "lock cone and support constants",
)
replace_once(
    "    let preferredTargetId = null;",
    "    let preferredTargetId = null;\n    let lockGraceTimer = 0;",
    "lock grace state",
)
replace_once(
    "      cameraMode = CAMERA_MODES[(currentIndex + 1) % CAMERA_MODES.length];",
    "      cameraMode = CAMERA_MODES[(currentIndex + 1) % CAMERA_MODES.length];\n"
    "      if (gameState === STATE_PLAYING) playerModel.group.visible = cameraMode !== \"cockpit\";",
    "camera model visibility",
)
replace_once(
    "      playerModel.group.visible = true;",
    "      playerModel.group.visible = cameraMode !== \"cockpit\";",
    "mission camera visibility",
)
replace_once(
    "        const selectionScore = dot * 4 - distance / LOCK_RANGE;",
    "        let selectionScore = dot * 4 - distance / LOCK_RANGE;\n"
    "        if (enemy.id === lock.targetId) selectionScore += LOCK_HYSTERESIS_BONUS;",
    "lock hysteresis scoring",
)
replace_once(
    """      if (!candidate) {
        resetLock();
        return;
      }

      if (lock.targetId !== candidate.id) {
""",
    """      if (!candidate) {
        lockGraceTimer += dt;
        if (lockGraceTimer >= LOCK_GRACE_TIME) resetLock();
        return;
      }
      lockGraceTimer = 0;

      if (lock.targetId !== candidate.id) {
""",
    "lock grace handling",
)
replace_once(
    """    function resetLock() {
      lock.targetId = null;
      lock.progress = 0;
      lock.locked = false;
    }
""",
    """    function resetLock() {
      lock.targetId = null;
      lock.progress = 0;
      lock.locked = false;
      lockGraceTimer = 0;
    }
""",
    "lock reset state",
)

required_counts = {
    "const LOCK_TIME = 0.85;": 1,
    "const LOCK_DOT = Math.cos(THREE.MathUtils.degToRad(16));": 1,
    "const LOCK_GRACE_TIME = 0.4;": 1,
    "const LOCK_HYSTERESIS_BONUS = 0.15;": 1,
    "let lockGraceTimer = 0;": 1,
    "let selectionScore = dot * 4 - distance / LOCK_RANGE;": 1,
    "if (enemy.id === lock.targetId) selectionScore += LOCK_HYSTERESIS_BONUS;": 1,
    "lockGraceTimer += dt;": 1,
    "if (lockGraceTimer >= LOCK_GRACE_TIME) resetLock();": 1,
    'playerModel.group.visible = cameraMode !== "cockpit";': 2,
}
for marker, expected in required_counts.items():
    actual = text.count(marker)
    if actual != expected:
        raise SystemExit(f"marker count mismatch for {marker!r}: {actual} != {expected}")

for marker in [
    "const LOCK_TIME = 1.2;",
    "const LOCK_DOT = Math.cos(THREE.MathUtils.degToRad(9));",
    "const selectionScore = dot * 4 - distance / LOCK_RANGE;",
]:
    if marker in text:
        raise SystemExit(f"obsolete implementation remains: {marker}")

if text.count("function updateLock(dt)") != 1 or text.count("function resetLock()") != 1:
    raise SystemExit("lock functions are missing or duplicated")
if 'const CAMERA_MODES = ["chase", "close", "cockpit"];' not in text:
    raise SystemExit("camera mode registry changed")
if "three@0.180.0" not in text or "@latest" in text:
    raise SystemExit("Three.js version pin changed")
if "console.warn(" in text or "console.error(" in text:
    raise SystemExit("console warning/error call added")

scripts = re.findall(r'<script type="module">(.*?)</script>', text, flags=re.S)
if len(scripts) != 1:
    raise SystemExit(f"expected one module script, found {len(scripts)}")
for element_id in ["score", "highscore", "health", "missiles", "kills", "state", "startBtn", "retryBtn"]:
    if text.count(f'id="{element_id}"') != 1:
        raise SystemExit(f"required DOM id {element_id!r} is missing or duplicated")

Path("/tmp/sortie-game.mjs").write_text(scripts[0], encoding="utf-8")
path.write_text(text, encoding="utf-8")
print("static patch validation: success")
