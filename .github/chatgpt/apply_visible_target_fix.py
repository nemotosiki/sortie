from pathlib import Path
import re
import subprocess
import tempfile


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


path = Path("index.html")
text = path.read_text(encoding="utf-8")

text = replace_once(
    text,
    """      // Manual target selection should follow what the pilot can actually see.
      // Reuse the HUD contact projection and its small edge tolerance so a
      // contact whose marker is visible is also selectable with Triangle/Tab.
      const point = enemyAimPoint(enemy, tmpHudWorld);
      const projected = projectWorldToScreen(point);
      const inFront = projected.ndcZ > -1 && projected.ndcZ < 1;
      const onScreen =
        inFront &&
        Math.abs(projected.ndcX) <= 1.08 &&
        Math.abs(projected.ndcY) <= 1.08;
      if (!onScreen) return null;
""",
    """      // Triangle/Tab uses the actual camera viewport, not the HUD's loose
      // draw margin. A strict 1.0 NDC limit excludes contacts outside the image.
      const point = enemyAimPoint(enemy, tmpHudWorld);
      tmpV6.copy(point).applyMatrix4(camera.matrixWorldInverse);
      tmpV7.copy(point).project(camera);
      if (!isHudProjectionVisible(tmpV7, tmpV6, 1.0)) return null;
""",
    "viewport test",
)
text = replace_once(
    text,
    """        centerDistSq:
          projected.ndcX * projected.ndcX + projected.ndcY * projected.ndcY,
""",
    """        centerDistSq: tmpV7.x * tmpV7.x + tmpV7.y * tmpV7.y,
""",
    "viewport centre score",
)
text = replace_once(
    text,
    """      // Ship turrets/VLS remain HUD contacts and destructible records, but
      // Triangle/Tab treats each vessel as one target: its hull record.
      const alive = enemies.filter((enemy) => enemy.alive && !enemy.subsystem);
      if (alive.length === 0) return;

      const visible = alive
""",
    """      // Every live HUD contact inside the camera image is eligible,
      // including ship turrets, VLS and CIWS subsystem records.
      const visible = enemies
        .filter((enemy) => enemy.alive)
""",
    "visible candidate source",
)
text = replace_once(
    text,
    """      // Ace Combat-style priority: while any contact is visible, Triangle/Tab
      // stays on visible contacts and steps from the centre of the view outward.
      // If the sky in front is empty, retain the legacy all-contact fallback so
      // radar-guided searching still works instead of making the key a no-op.
      const candidates = visible.length > 0
        ? visible.map((entry) => entry.enemy)
        : alive.slice().sort((a, b) => targetCycleKey(a) - targetCycleKey(b));
""",
    """      // Never fall back to radar/off-screen contacts. If nothing is inside
      // the viewport, Triangle/Tab deliberately leaves the selection unchanged.
      const candidates = visible.map((entry) => entry.enemy);
      if (candidates.length === 0) return;
""",
    "off-screen fallback",
)
text = replace_once(
    text,
    """    function canLock(enemy, lockKind) {
      // Subsystems stay visible/destructible, but seekers acquire the vessel
      // hull only. This also keeps single- and multi-lock weapons consistent.
      if (!enemy || enemy.subsystem) return false;
""",
    """    function canLock(enemy, lockKind) {
      if (!enemy) return false;
""",
    "subsystem lock predicate",
)
text = replace_once(
    text,
    """        if (!enemy.alive) continue;
        if (!canLock(enemy, lockKind)) continue;
        tmpV2.copy(enemy.group.position).sub(player.position);
""",
    """        if (!enemy.alive) continue;
        if (!canLock(enemy, lockKind)) continue;
        // Mounts are manual targets only: cycling can nominate one, but the
        // seeker never auto-picks an unselected mount from the scene.
        const manuallySelectedSubsystem = Boolean(
          enemy.subsystem && preferred && enemy.id === preferred.id
        );
        if (enemy.subsystem && !manuallySelectedSubsystem) continue;
        tmpV2.copy(enemy.group.position).sub(player.position);
""",
    "manual subsystem acquisition",
)
text = replace_once(
    text,
    """        // AC-style surface target frame: land units and ship hulls are hexagons.
        // Ship subsystems stay square display-only contacts, as requested.
        marker.classList.toggle(
          "ground",
          Boolean(enemy.ground || (enemy.surface && !enemy.subsystem))
        );
""",
    """        // Every surface contact is hexagonal: land targets, ship hulls,
        // turrets, VLS and CIWS subsystem records.
        marker.classList.toggle(
          "ground",
          Boolean(enemy.ground || enemy.surface)
        );
""",
    "surface marker class",
)

cycle = re.search(
    r"    function cycleTarget\(\) \{(?P<body>.*?)\n    \}\n\n    function cycleCamera",
    text,
    re.DOTALL,
)
if not cycle:
    raise RuntimeError("cycleTarget not found after patch")
for forbidden in (
    "alive.slice()",
    "visible.length > 0",
    "enemy.alive && !enemy.subsystem",
    "1.08",
):
    if forbidden in cycle.group("body"):
        raise RuntimeError(f"forbidden cycle fallback remains: {forbidden}")
for required in (
    "isHudProjectionVisible(tmpV7, tmpV6, 1.0)",
    "if (candidates.length === 0) return;",
    "Boolean(enemy.ground || enemy.surface)",
    "manuallySelectedSubsystem",
):
    if required not in text:
        raise RuntimeError(f"missing patched source: {required}")

module = re.search(r'<script type="module">\n(?P<body>.*)\n  </script>', text, re.DOTALL)
if not module:
    raise RuntimeError("module script not found")
with tempfile.TemporaryDirectory() as temp:
    module_path = Path(temp) / "index-module.mjs"
    module_path.write_text(module.group("body"), encoding="utf-8", newline="\n")
    subprocess.run(["node", "--check", str(module_path)], check=True)
path.write_text(text, encoding="utf-8", newline="\n")

css_path = Path("styles/hud-polish.css")
css = css_path.read_text(encoding="utf-8")
css = replace_once(
    css,
    """/* The HUD uses this same marker node for normal, selected and locked
   contacts, so the hexagon persists through every state. JS applies this class
   to land targets and ship hulls; ship subsystems deliberately remain square. */""",
    """/* Land targets, ship hulls and ship subsystems share this marker class.
   The HUD reuses one node for normal, selected and locked states, so the
   hexagonal frame persists through every state. */""",
    "surface marker CSS comment",
)
css_path.write_text(css, encoding="utf-8", newline="\n")

print("strict visible cycling and surface hex markers applied")
