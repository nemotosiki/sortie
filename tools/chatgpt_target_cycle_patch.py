from __future__ import annotations

from pathlib import Path
import re
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

OLD = """    function cycleTarget() {
      if (gameState !== STATE_PLAYING) return;
      const living = enemies.filter((enemy) => enemy.alive)
        .sort((a, b) => targetCycleKey(a) - targetCycleKey(b));
      if (living.length === 0) return;

      const currentId = preferredTargetId ?? lock.targetId;
      const currentIndex = living.findIndex((enemy) => enemy.id === currentId);
      const next = living[(currentIndex + 1 + living.length) % living.length];
"""

NEW = """    function visibleTargetCycleEntry(enemy) {
      // Manual target selection should follow what the pilot can actually see.
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

      return {
        enemy,
        centerDistSq:
          projected.ndcX * projected.ndcX + projected.ndcY * projected.ndcY,
      };
    }

    function cycleTarget() {
      if (gameState !== STATE_PLAYING) return;
      const alive = enemies.filter((enemy) => enemy.alive);
      if (alive.length === 0) return;

      const visible = alive
        .map(visibleTargetCycleEntry)
        .filter(Boolean)
        .sort((a, b) => {
          const centerDelta = a.centerDistSq - b.centerDistSq;
          if (Math.abs(centerDelta) > 1e-9) return centerDelta;
          return targetCycleKey(a.enemy) - targetCycleKey(b.enemy);
        });

      // Ace Combat-style priority: while any contact is visible, Triangle/Tab
      // stays on visible contacts and steps from the centre of the view outward.
      // If the sky in front is empty, retain the legacy all-contact fallback so
      // radar-guided searching still works instead of making the key a no-op.
      const candidates = visible.length > 0
        ? visible.map((entry) => entry.enemy)
        : alive.slice().sort((a, b) => targetCycleKey(a) - targetCycleKey(b));

      const currentId = preferredTargetId ?? lock.targetId;
      const currentIndex = candidates.findIndex((enemy) => enemy.id === currentId);
      const next = candidates[(currentIndex + 1 + candidates.length) % candidates.length];
"""


def check_module_source(source: str) -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        path = Path(temp_dir) / "index-module.mjs"
        path.write_text(source, encoding="utf-8", newline="\n")
        subprocess.run(["node", "--check", str(path)], check=True)


def main() -> None:
    original = INDEX.read_text(encoding="utf-8")
    count = original.count(OLD)
    if count != 1:
        raise RuntimeError(f"cycleTarget prefix: expected exactly one match, found {count}")
    if "function visibleTargetCycleEntry(" in original:
        raise RuntimeError("visibleTargetCycleEntry already exists")

    text = original.replace(OLD, NEW, 1)

    for required in (
        "function visibleTargetCycleEntry(enemy)",
        "Math.abs(projected.ndcX) <= 1.08",
        "Math.abs(projected.ndcY) <= 1.08",
        "centerDistSq",
        "visible.length > 0",
        "alive.slice().sort((a, b) => targetCycleKey(a) - targetCycleKey(b))",
        "const currentIndex = candidates.findIndex",
    ):
        if required not in text:
            raise RuntimeError(f"patched source missing {required!r}")

    # The old all-alive cycle must be gone from the manual target path.
    if OLD in text:
        raise RuntimeError("legacy cycleTarget prefix still present after patch")

    module = re.search(
        r'<script type="module">\n(?P<body>.*)\n  </script>',
        text,
        re.DOTALL,
    )
    if not module:
        raise RuntimeError("could not extract index module")
    check_module_source(module.group("body"))

    INDEX.write_text(text, encoding="utf-8", newline="\n")
    print("target-cycle patch applied and index module syntax checked")


if __name__ == "__main__":
    main()
