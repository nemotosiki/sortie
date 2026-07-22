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


replace_once(
    '''    #missionBanner {''',
    '''    #enemyMarkers {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
    }

    .enemyMarker {
      position: absolute;
      width: 36px;
      height: 36px;
      transform: translate(-50%, -50%);
      border: 1px solid rgba(112, 255, 151, 0.92);
      color: #78ff9d;
      opacity: 0;
      visibility: hidden;
      filter: drop-shadow(0 0 5px rgba(65, 255, 126, 0.68));
      transition: opacity 90ms ease, width 90ms ease, height 90ms ease, color 90ms ease;
      will-change: left, top;
    }

    .enemyMarker::before {
      content: "";
      position: absolute;
      inset: 5px;
      border: 1px solid currentColor;
      opacity: 0.28;
    }

    .enemyMarker.active {
      opacity: 0.88;
      visibility: visible;
    }

    .enemyMarker.selected {
      width: 43px;
      height: 43px;
      color: #ffe66f;
      border-color: currentColor;
      filter: drop-shadow(0 0 7px rgba(255, 224, 88, 0.82));
    }

    .enemyMarker.locked {
      color: #ff5968;
      border-color: currentColor;
    }

    .enemyMarkerLabel {
      position: absolute;
      left: 50%;
      top: calc(100% + 5px);
      transform: translateX(-50%);
      color: currentColor;
      white-space: nowrap;
      font-size: 8px;
      font-weight: 800;
      letter-spacing: 0.1em;
    }

    #targetDirectionArrow {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 1px;
      height: 1px;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity 90ms ease;
      will-change: left, top;
    }

    #targetDirectionArrow.active {
      opacity: 0.96;
      visibility: visible;
    }

    #targetDirectionGlyph {
      position: absolute;
      left: -11px;
      top: -15px;
      width: 22px;
      height: 30px;
      background: #ffe66f;
      clip-path: polygon(50% 0, 100% 100%, 50% 76%, 0 100%);
      filter: drop-shadow(0 0 7px rgba(255, 218, 70, 0.92));
      transform-origin: 50% 50%;
    }

    #targetDirectionArrow.locked #targetDirectionGlyph {
      background: #ff5968;
      filter: drop-shadow(0 0 8px rgba(255, 54, 77, 0.95));
    }

    #targetDirectionLabel {
      position: absolute;
      left: 0;
      top: 20px;
      transform: translateX(-50%);
      padding: 2px 5px;
      background: rgba(3, 15, 25, 0.68);
      color: #ffe66f;
      white-space: nowrap;
      font-size: 8px;
      font-weight: 900;
      letter-spacing: 0.1em;
      text-shadow: 0 0 6px rgba(255, 218, 70, 0.9);
    }

    #targetDirectionArrow.locked #targetDirectionLabel {
      color: #ff6a76;
      text-shadow: 0 0 7px rgba(255, 54, 77, 0.95);
    }

    #missionBanner {''',
    "enemy marker and target arrow CSS",
)

replace_once(
    '''    <div id="targetBox">
      <span id="targetRange">0M</span>
      <span id="lockLabel">LOCK 0%</span>
      <span id="lockMeter"><span id="lockMeterFill"></span></span>
    </div>

    <div id="missionBanner"></div>''',
    '''    <div id="enemyMarkers"></div>

    <div id="targetBox">
      <span id="targetRange">0M</span>
      <span id="lockLabel">LOCK 0%</span>
      <span id="lockMeter"><span id="lockMeterFill"></span></span>
    </div>

    <div id="targetDirectionArrow">
      <span id="targetDirectionGlyph"></span>
      <span id="targetDirectionLabel">TGT</span>
    </div>

    <div id="missionBanner"></div>''',
    "enemy marker and arrow DOM",
)

replace_once(
    '''      wave: document.getElementById("waveReadout"),
      targetBox: document.getElementById("targetBox"),
      targetRange: document.getElementById("targetRange"),
      lockLabel: document.getElementById("lockLabel"),
      lockMeterFill: document.getElementById("lockMeterFill"),
      pitchLadder: document.getElementById("pitchLadder"),''',
    '''      wave: document.getElementById("waveReadout"),
      enemyMarkers: document.getElementById("enemyMarkers"),
      targetBox: document.getElementById("targetBox"),
      targetRange: document.getElementById("targetRange"),
      lockLabel: document.getElementById("lockLabel"),
      lockMeterFill: document.getElementById("lockMeterFill"),
      targetDirectionArrow: document.getElementById("targetDirectionArrow"),
      targetDirectionGlyph: document.getElementById("targetDirectionGlyph"),
      targetDirectionLabel: document.getElementById("targetDirectionLabel"),
      pitchLadder: document.getElementById("pitchLadder"),''',
    "HUD element references",
)

replace_once(
    '''    const enemyMissiles = [];
    const effects = [];''',
    '''    const enemyMissiles = [];
    const effects = [];
    const enemyMarkerElements = new Map();
    const enemyMarkerScreenState = [];
    const targetArrowState = {
      active: false,
      targetId: null,
      x: 0,
      y: 0,
      angle: 0
    };''',
    "HUD marker state",
)

replace_once(
    '''      audio: { lockBeeps: 0, lockCompleteCues: 0, threatBeeps: 0 },
      threats: { incomingMissiles: [], nearest: null },
      enemyCatalog: Object.keys(ENEMY_TYPES),''',
    '''      audio: { lockBeeps: 0, lockCompleteCues: 0, threatBeeps: 0 },
      threats: { incomingMissiles: [], nearest: null },
      hud: {
        visibleEnemyMarkers: [],
        targetArrow: { active: false, targetId: null, x: 0, y: 0, angle: 0 }
      },
      enemyCatalog: Object.keys(ENEMY_TYPES),''',
    "HUD game hook",
)

replace_regex(
    r'''    function updateLock\(dt\) \{.*?\n    \}\n\n    function resetLock\(\) \{''',
    '''    function updateLock(dt) {
      forwardOf(player, tmpV1);
      let candidate = null;
      let preferredCandidate = null;
      let bestScore = -Infinity;

      const preferred = enemies.find((enemy) => enemy.id === preferredTargetId && enemy.alive);
      if (preferredTargetId !== null && !preferred) preferredTargetId = null;

      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        tmpV2.copy(enemy.group.position).sub(player.position);
        const distance = tmpV2.length();
        if (distance > LOCK_RANGE || distance < 1) continue;
        tmpV2.multiplyScalar(1 / distance);
        const dot = tmpV1.dot(tmpV2);
        if (dot < LOCK_DOT) continue;

        const selectionScore = dot * 4 - distance / LOCK_RANGE;
        if (preferred && enemy.id === preferred.id) preferredCandidate = enemy;
        if (selectionScore > bestScore) {
          bestScore = selectionScore;
          candidate = enemy;
        }
      }

      // A manually selected target wins only while it is actually inside the lock cone.
      // Otherwise the best visible candidate remains available instead of producing no lock.
      candidate = preferredCandidate || candidate;

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
    "lock candidate fallback",
    flags=re.S,
)

replace_once(
    '''      updateTargetBox();''',
    '''      camera.updateMatrixWorld();
      updateEnemyHudMarkers();
      updateTargetBox();''',
    "HUD projection update",
)

replace_once(
    '''    function updateTargetBox() {''',
    '''    function getOrCreateEnemyMarker(enemy) {
      let marker = enemyMarkerElements.get(enemy.id);
      if (marker) return marker;

      marker = document.createElement("div");
      marker.className = "enemyMarker";
      marker.dataset.enemyId = String(enemy.id);
      const label = document.createElement("span");
      label.className = "enemyMarkerLabel";
      marker.appendChild(label);
      ui.enemyMarkers.appendChild(marker);
      enemyMarkerElements.set(enemy.id, marker);
      return marker;
    }

    function isHudProjectionVisible(projected, cameraSpace, limit = 1.04) {
      return cameraSpace.z < -0.1 &&
        projected.z > -1 && projected.z < 1 &&
        Math.abs(projected.x) < limit &&
        Math.abs(projected.y) < limit;
    }

    function clearTargetDirectionArrow() {
      ui.targetDirectionArrow.classList.remove("active", "locked");
      targetArrowState.active = false;
      targetArrowState.targetId = null;
      targetArrowState.x = 0;
      targetArrowState.y = 0;
      targetArrowState.angle = 0;
    }

    function updateTargetDirectionArrow() {
      const targetId = preferredTargetId ?? lock.targetId;
      const target = enemies.find((enemy) => enemy.alive && enemy.id === targetId);
      if (!target || gameState !== STATE_PLAYING) {
        clearTargetDirectionArrow();
        return;
      }

      tmpV6.copy(target.group.position).applyMatrix4(camera.matrixWorldInverse);
      tmpV7.copy(target.group.position).project(camera);
      if (isHudProjectionVisible(tmpV7, tmpV6, 1.12)) {
        clearTargetDirectionArrow();
        return;
      }

      tmpV8.copy(target.group.position).sub(camera.position);
      tmpQ1.copy(camera.quaternion).invert();
      tmpV8.applyQuaternion(tmpQ1);

      let directionX = tmpV8.x;
      let directionY = -tmpV8.y;
      if (tmpV8.z > 0) {
        directionX *= -1;
        directionY *= -1;
      }

      let directionLength = Math.hypot(directionX, directionY);
      if (directionLength < 0.001) {
        directionX = 0;
        directionY = 1;
        directionLength = 1;
      }
      directionX /= directionLength;
      directionY /= directionLength;

      const width = Math.max(1, window.innerWidth);
      const height = Math.max(1, window.innerHeight);
      const margin = Math.max(48, Math.min(76, Math.min(width, height) * 0.085));
      const halfWidth = Math.max(1, width * 0.5 - margin);
      const halfHeight = Math.max(1, height * 0.5 - margin);
      const scaleX = Math.abs(directionX) > 0.0001 ? halfWidth / Math.abs(directionX) : Infinity;
      const scaleY = Math.abs(directionY) > 0.0001 ? halfHeight / Math.abs(directionY) : Infinity;
      const edgeScale = Math.min(scaleX, scaleY);
      const x = width * 0.5 + directionX * edgeScale;
      const y = height * 0.5 + directionY * edgeScale;
      const angle = Math.atan2(directionY, directionX) + Math.PI * 0.5;
      const locked = lock.locked && lock.targetId === target.id;
      const distance = Math.round(player.position.distanceTo(target.group.position));

      ui.targetDirectionArrow.style.left = `${x}px`;
      ui.targetDirectionArrow.style.top = `${y}px`;
      ui.targetDirectionGlyph.style.transform = `rotate(${angle}rad)`;
      ui.targetDirectionLabel.textContent = `TGT ${target.id} · ${distance}M`;
      ui.targetDirectionArrow.classList.add("active");
      ui.targetDirectionArrow.classList.toggle("locked", locked);

      targetArrowState.active = true;
      targetArrowState.targetId = target.id;
      targetArrowState.x = x;
      targetArrowState.y = y;
      targetArrowState.angle = angle;
    }

    function updateEnemyHudMarkers() {
      enemyMarkerScreenState.length = 0;

      if (gameState !== STATE_PLAYING) {
        for (const marker of enemyMarkerElements.values()) marker.remove();
        enemyMarkerElements.clear();
        clearTargetDirectionArrow();
        return;
      }

      const aliveIds = new Set();
      const selectedId = preferredTargetId ?? lock.targetId;

      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        aliveIds.add(enemy.id);

        const marker = getOrCreateEnemyMarker(enemy);
        const label = marker.firstElementChild;
        tmpV6.copy(enemy.group.position).applyMatrix4(camera.matrixWorldInverse);
        tmpV7.copy(enemy.group.position).project(camera);
        const onScreen = isHudProjectionVisible(tmpV7, tmpV6, 1.04);
        const coveredByLockBox = onScreen && lock.targetId === enemy.id;
        const active = onScreen && !coveredByLockBox;
        const selected = selectedId === enemy.id;
        const locked = lock.locked && lock.targetId === enemy.id;

        marker.classList.toggle("active", active);
        marker.classList.toggle("selected", selected);
        marker.classList.toggle("locked", locked);
        label.textContent = `TGT ${enemy.id} · ${enemy.label}`;

        if (active) {
          const x = (tmpV7.x * 0.5 + 0.5) * window.innerWidth;
          const y = (-tmpV7.y * 0.5 + 0.5) * window.innerHeight;
          marker.style.left = `${x}px`;
          marker.style.top = `${y}px`;
          enemyMarkerScreenState.push({ id: enemy.id, x, y, selected, locked });
        }
      }

      for (const [id, marker] of enemyMarkerElements) {
        if (aliveIds.has(id)) continue;
        marker.remove();
        enemyMarkerElements.delete(id);
      }

      updateTargetDirectionArrow();
    }

    function updateTargetBox() {''',
    "enemy marker update functions",
)

replace_once(
    '''      tmpV1.copy(target.group.position).project(camera);
      const visible = tmpV1.z > -1 && tmpV1.z < 1 && Math.abs(tmpV1.x) < 1.12 && Math.abs(tmpV1.y) < 1.12;''',
    '''      tmpV2.copy(target.group.position).applyMatrix4(camera.matrixWorldInverse);
      tmpV1.copy(target.group.position).project(camera);
      const visible = isHudProjectionVisible(tmpV1, tmpV2, 1.12);''',
    "target box camera-facing visibility",
)

replace_once(
    '''      hook.cameraFocus.source = cameraFocusSource;
      hook.audio.lockBeeps = audioSystem.lockBeeps;''',
    '''      hook.cameraFocus.source = cameraFocusSource;
      hook.hud.visibleEnemyMarkers = enemyMarkerScreenState.map((marker) => ({ ...marker }));
      hook.hud.targetArrow.active = targetArrowState.active;
      hook.hud.targetArrow.targetId = targetArrowState.targetId;
      hook.hud.targetArrow.x = targetArrowState.x;
      hook.hud.targetArrow.y = targetArrowState.y;
      hook.hud.targetArrow.angle = targetArrowState.angle;
      hook.audio.lockBeeps = audioSystem.lockBeeps;''',
    "HUD game hook synchronization",
)

replace_once(
    '''      effects.length = 0;
      resetLock();''',
    '''      effects.length = 0;

      for (const marker of enemyMarkerElements.values()) marker.remove();
      enemyMarkerElements.clear();
      enemyMarkerScreenState.length = 0;
      clearTargetDirectionArrow();
      resetLock();''',
    "HUD cleanup",
)

path.write_text(text, encoding="utf-8")

required = [
    'candidate = preferredCandidate || candidate;',
    'const enemyMarkerElements = new Map();',
    'function updateEnemyHudMarkers()',
    'function updateTargetDirectionArrow()',
    'id="enemyMarkers"',
    'id="targetDirectionArrow"',
    'hud: {',
]
for marker in required:
    if marker not in text:
        raise SystemExit(f"missing required marker after patch: {marker}")
if 'if (preferred && enemy.id !== preferred.id) continue;' in text:
    raise SystemExit("exclusive preferred-target lock filter remains")
print("patched lock selection and enemy HUD targeting")
