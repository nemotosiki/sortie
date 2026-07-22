from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")

old = '''    function updateTargetDirectionArrow() {
      const targetId = preferredTargetId ?? lock.targetId;'''
new = '''    function updateTargetDirectionArrow() {
      // The off-screen cue is a momentary situational-awareness aid, matching
      // the existing Triangle/Y and C hold controls. A short press can show it
      // briefly; a long press keeps it available while target-view engages.
      const directionHeld = cameraKeyHold.pressed || gamepadInput.previousTarget;
      if (!directionHeld) {
        clearTargetDirectionArrow();
        return;
      }

      const targetId = preferredTargetId ?? lock.targetId;'''

count = text.count(old)
if count != 1:
    raise SystemExit(f"target-arrow anchor: expected exactly one match, found {count}")

text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8")

required = [
    "const directionHeld = cameraKeyHold.pressed || gamepadInput.previousTarget;",
    "if (!directionHeld) {",
    "clearTargetDirectionArrow();",
]
for marker in required:
    if marker not in text:
        raise SystemExit(f"missing hold-gated arrow marker: {marker}")

print("gated the off-screen target arrow behind Triangle/Y or C hold input")
