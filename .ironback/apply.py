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


already_applied = 'const ACE_CALLSIGN = "IRONBACK";' in text

if not already_applied:
    replace_once(
        '''    const ENEMY_TYPE_ORDER = Object.freeze([
''',
        '''    const ACE_CALLSIGN = "IRONBACK";
    const ACE_SPEC_OVERRIDES = Object.freeze({
      label: ACE_CALLSIGN,
      role: "Squadron Leader",
      behavior: "evasive",
      hp: 140,
      maxSpeed: 225,
      pursuitBonus: 16,
      pursuitTurn: THREE.MathUtils.degToRad(58),
      evadeLateral: 40,
      evadeVertical: 18,
      evadeFrequency: 1.1,
      radarColor: "#ffe066",
      tracerColor: 0xffd35f,
      theme: Object.freeze({
        primary: 0x23262e,
        secondary: 0x101218,
        accent: 0xffd35f,
        canopy: 0xffe9a8,
        exhaust: 0xffd35f,
        scale: 0.88,
        variant: "bison"
      })
    });
    const KILLCAM_DURATION = 1.6;
    const KILLCAM_SCALE = 0.18;
    const KILLCAM_RAMP = 0.35;
    const KILLCAM_FOV_TIGHTEN = 6;

    const ENEMY_TYPE_ORDER = Object.freeze([
''',
        "ace and kill-cam constants",
    )

    replace_once(
        '''    let controlMode = CONTROL_NORMAL;
    let cameraMode = CAMERA_MODES[0];
    let preferredTargetId = null;
''',
        '''    let controlMode = CONTROL_NORMAL;
    let cameraMode = CAMERA_MODES[0];
    let timeScale = 1;
    const killCam = {
      active: false,
      timer: 0,
      enemyId: null,
      focusPoint: new THREE.Vector3()
    };
    let preferredTargetId = null;
''',
        "kill-cam state",
    )

    replace_once(
        '''      controlMode,
      cameraMode,
      cameraFov: BASE_CAMERA_FOV,
      selectedTargetId: null,
''',
        '''      controlMode,
      cameraMode,
      cameraFov: BASE_CAMERA_FOV,
      timeScale: 1,
      killCam: { active: false, timer: 0, enemyId: null },
      selectedTargetId: null,
''',
        "game hook kill-cam literal",
    )

    replace_once(
        '''        gunKills: 0,
        missileKills: 0,
        damageTaken: 0
''',
        '''        gunKills: 0,
        missileKills: 0,
        damageTaken: 0,
        forceDamageEnemy: (id, amount = 200) => {
          if (gameState !== STATE_PLAYING) return false;
          const enemy = enemies.find((candidate) => candidate.alive && candidate.id === id);
          if (!enemy) return false;
          damageEnemy(enemy, amount, false);
          return true;
        }
''',
        "debug damage helper",
    )

    replace_once(
        '''    requestAnimationFrame(animate);

    function animate() {
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

      updatePlayerDamageSmoke(dt);
      updateParticlePools(dt);
      updateAudioCues(dt);
      updateCamera(dt);
      updateVisualStatus(dt);
      updateRadio(dt);
      updateHud();
      drawRadar();
      syncGameHook();
      renderer.render(scene, camera);
    }
''',
        '''    requestAnimationFrame(animate);

    function startAceKillCam(enemy) {
      killCam.active = true;
      killCam.timer = KILLCAM_DURATION;
      killCam.enemyId = enemy.id;
      killCam.focusPoint.copy(enemy.group.position);
      cameraShake = Math.min(1.8, cameraShake + 0.4);
    }

    function updateKillCam(rawDt) {
      if (!killCam.active) {
        timeScale = 1;
        return;
      }
      if (gameState !== STATE_PLAYING) {
        killCam.active = false;
        timeScale = 1;
        return;
      }
      killCam.timer -= rawDt;
      if (killCam.timer <= 0) {
        killCam.active = false;
        timeScale = 1;
        return;
      }
      timeScale = killCam.timer > KILLCAM_RAMP
        ? KILLCAM_SCALE
        : THREE.MathUtils.lerp(1, KILLCAM_SCALE, killCam.timer / KILLCAM_RAMP);
    }

    function animate() {
      requestAnimationFrame(animate);
      const rawDt = Math.min(clock.getDelta(), 0.05);
      updateKillCam(rawDt);
      const dt = rawDt * timeScale;

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

      updatePlayerDamageSmoke(dt);
      updateParticlePools(dt);
      updateAudioCues(rawDt);
      updateCamera(rawDt);
      updateVisualStatus(rawDt);
      updateRadio(rawDt);
      updateHud();
      drawRadar();
      syncGameHook();
      renderer.render(scene, camera);
    }
''',
        "kill-cam timing split",
    )

    replace_once(
        '''        spawnEnemy(position, number, i, waveTypes[i]);
''',
        '''        spawnEnemy(position, number, i, waveTypes[i], number === 2 && i === 0);
''',
        "ace spawn selection",
    )

    replace_once(
        '''    function spawnEnemy(position, wave, slot, typeKey) {
      enemySerial += 1;
      const id = (wave - 1) * 3 + slot + 1;
      const spec = ENEMY_TYPES[typeKey] || ENEMY_TYPES.lancer;
''',
        '''    function spawnEnemy(position, wave, slot, typeKey, isAce = false) {
      enemySerial += 1;
      const id = (wave - 1) * 3 + slot + 1;
      const baseSpec = ENEMY_TYPES[typeKey] || ENEMY_TYPES.lancer;
      const spec = isAce ? Object.freeze({ ...baseSpec, ...ACE_SPEC_OVERRIDES }) : baseSpec;
''',
        "ace spec overlay",
    )

    replace_once(
        '''        role: spec.role,
        behavior: spec.behavior,
        spec,
''',
        '''        role: spec.role,
        behavior: spec.behavior,
        isAce,
        aceEngageLineFired: false,
        aceHalfLineFired: false,
        spec,
''',
        "ace enemy flags",
    )

    replace_once(
        '''        if (enemy.mode === "patrol" && distanceToPlayer < spec.engageRange) enemy.mode = "pursuit";
        if (enemy.mode === "pursuit" && distanceToPlayer > spec.disengageRange) enemy.mode = "patrol";
''',
        '''        if (enemy.mode === "patrol" && distanceToPlayer < spec.engageRange) {
          enemy.mode = "pursuit";
          if (enemy.isAce && !enemy.aceEngageLineFired) {
            enemy.aceEngageLineFired = true;
            triggerRadioLine(
              "enemy",
              "This is Ironback. All units fall back — the bandit is mine.",
              RADIO_PRIORITY.NORMAL,
              "ace-engage"
            );
          }
        }
        if (enemy.mode === "pursuit" && distanceToPlayer > spec.disengageRange) enemy.mode = "patrol";
''',
        "ace engagement callout",
    )

    replace_once(
        '''      enemy.hp -= amount;
      enemy.hitFlash = 0.12;
      if (enemy.hp > 0) return;

      enemy.alive = false;
''',
        '''      enemy.hp -= amount;
      enemy.hitFlash = 0.12;
      if (enemy.hp > 0) {
        if (enemy.isAce && !enemy.aceHalfLineFired && enemy.hp <= enemy.maxHp * 0.5) {
          enemy.aceHalfLineFired = true;
          triggerRadioLine(
            "enemy",
            "Not bad. You'll need more than that to bring ME down.",
            RADIO_PRIORITY.NORMAL,
            "ace-half"
          );
        }
        return;
      }

      enemy.alive = false;
''',
        "ace half-health callout",
    )

    replace_once(
        '''      showBanner(`TARGET ${enemy.id} · ${enemy.label} DESTROYED`, 1.1, "success");
      onKillRadio(kills);
''',
        '''      showBanner(`TARGET ${enemy.id} · ${enemy.label} DESTROYED`, 1.1, "success");
      if (enemy.isAce) {
        startAceKillCam(enemy);
        triggerRadioLine(
          "enemy",
          "This is Ironback... I'm hit... going down.",
          RADIO_PRIORITY.URGENT,
          "ace-down"
        );
      }
      onKillRadio(kills);
''',
        "ace death sequence",
    )

    replace_once(
        '''        triggerRadioLine("command", "Multiple bandits inbound, wave two. Stay sharp.", RADIO_PRIORITY.NORMAL, "wave2-inbound");
''',
        '''        triggerRadioLine(
          "command",
          "Second wave inbound. Lead contact is flagged: ace craft, callsign IRONBACK. Stay sharp.",
          RADIO_PRIORITY.NORMAL,
          "wave2-inbound"
        );
        triggerRadioLine(
          "wingman",
          "Ironback?! I've heard the stories. Do not let him get behind you.",
          RADIO_PRIORITY.NORMAL,
          "ace-foreshadow-wingman"
        );
''',
        "ace foreshadow radio",
    )

    replace_once(
        '''      resetRadio();
      resetPlayerTransform();
      playerModel.group.visible = cameraMode !== "cockpit";
      score = 0;
''',
        '''      resetRadio();
      resetPlayerTransform();
      playerModel.group.visible = cameraMode !== "cockpit";
      timeScale = 1;
      killCam.active = false;
      killCam.timer = 0;
      killCam.enemyId = null;
      score = 0;
''',
        "kill-cam mission reset",
    )

    replace_once(
        '''      const targetFov = BASE_CAMERA_FOV +
        HIGH_SPEED_FOV_BONUS * highSpeedBlend -
        LOW_SPEED_FOV_REDUCTION * lowSpeedBlend +
        cameraShake * 1.25;
''',
        '''      const targetFov = BASE_CAMERA_FOV +
        HIGH_SPEED_FOV_BONUS * highSpeedBlend -
        LOW_SPEED_FOV_REDUCTION * lowSpeedBlend +
        cameraShake * 1.25 -
        (killCam.active ? KILLCAM_FOV_TIGHTEN : 0);
''',
        "kill-cam FOV",
    )

    replace_once(
        '''      if (focusTarget) {
        desiredLook.copy(focusTarget.group.position).addScaledVector(WORLD_UP, 1.8);
      }
      if (cameraShake > 0) {
''',
        '''      if (focusTarget) {
        desiredLook.copy(focusTarget.group.position).addScaledVector(WORLD_UP, 1.8);
      }
      if (killCam.active) desiredLook.copy(killCam.focusPoint);
      if (cameraShake > 0) {
''',
        "kill-cam camera focus",
    )

    replace_once(
        '''      cameraLook.lerp(desiredLook, damping(focusTarget ? 0.00008 : 0.0005, dt));
''',
        '''      cameraLook.lerp(
        desiredLook,
        damping((focusTarget || killCam.active) ? 0.00008 : 0.0005, dt)
      );
''',
        "kill-cam look damping",
    )

    replace_once(
        '''      camera.quaternion.slerp(tmpQ1, damping(focusTarget ? 0.00012 : 0.0007, dt));
''',
        '''      camera.quaternion.slerp(
        tmpQ1,
        damping((focusTarget || killCam.active) ? 0.00012 : 0.0007, dt)
      );
''',
        "kill-cam quaternion damping",
    )

    replace_once(
        '''      hook.cameraMode = cameraMode;
      hook.cameraFov = currentCameraFov;
      hook.selectedTargetId = preferredTargetId ?? lock.targetId;
''',
        '''      hook.cameraMode = cameraMode;
      hook.cameraFov = currentCameraFov;
      hook.timeScale = timeScale;
      hook.killCam.active = killCam.active;
      hook.killCam.timer = killCam.timer;
      hook.killCam.enemyId = killCam.enemyId;
      hook.selectedTargetId = preferredTargetId ?? lock.targetId;
''',
        "kill-cam hook sync",
    )

    replace_once(
        '''        alive: enemy.alive,
        isLocked: enemy.alive && lock.locked && lock.targetId === enemy.id,
        type: enemy.type,
''',
        '''        alive: enemy.alive,
        isLocked: enemy.alive && lock.locked && lock.targetId === enemy.id,
        isAce: Boolean(enemy.isAce),
        type: enemy.type,
''',
        "ace hook flag",
    )

required_markers = [
    'const ACE_CALLSIGN = "IRONBACK";',
    "const ACE_SPEC_OVERRIDES = Object.freeze({",
    "hp: 140,",
    "maxSpeed: 225,",
    "pursuitBonus: 16,",
    "pursuitTurn: THREE.MathUtils.degToRad(58),",
    "evadeLateral: 40,",
    "evadeVertical: 18,",
    "evadeFrequency: 1.1,",
    "const KILLCAM_DURATION = 1.6;",
    "const KILLCAM_SCALE = 0.18;",
    "const KILLCAM_RAMP = 0.35;",
    "const KILLCAM_FOV_TIGHTEN = 6;",
    "let timeScale = 1;",
    "const killCam = {",
    "function startAceKillCam(enemy)",
    "function updateKillCam(rawDt)",
    "const rawDt = Math.min(clock.getDelta(), 0.05);",
    "const dt = rawDt * timeScale;",
    "updateAudioCues(rawDt);",
    "updateCamera(rawDt);",
    "updateVisualStatus(rawDt);",
    "updateRadio(rawDt);",
    "function spawnEnemy(position, wave, slot, typeKey, isAce = false)",
    "number === 2 && i === 0",
    "const spec = isAce ? Object.freeze({ ...baseSpec, ...ACE_SPEC_OVERRIDES }) : baseSpec;",
    "aceEngageLineFired: false",
    "aceHalfLineFired: false",
    '"ace-foreshadow-wingman"',
    '"ace-engage"',
    '"ace-half"',
    '"ace-down"',
    "startAceKillCam(enemy);",
    "(killCam.active ? KILLCAM_FOV_TIGHTEN : 0)",
    "if (killCam.active) desiredLook.copy(killCam.focusPoint);",
    "timeScale: 1,",
    "killCam: { active: false, timer: 0, enemyId: null },",
    "forceDamageEnemy: (id, amount = 200) => {",
    "hook.timeScale = timeScale;",
    "hook.killCam.active = killCam.active;",
    "isAce: Boolean(enemy.isAce),",
]
for marker in required_markers:
    if marker not in text:
        raise SystemExit(f"missing Ironback marker: {marker}")

ace_block_match = re.search(
    r'const ACE_SPEC_OVERRIDES = Object\.freeze\(\{(.*?)\n    \}\);\n    const KILLCAM_DURATION',
    text,
    flags=re.S,
)
if not ace_block_match:
    raise SystemExit("could not isolate ACE_SPEC_OVERRIDES")
ace_block = ace_block_match.group(1)
for forbidden in ["damageMin", "damageMax", "hitChanceScale", "maxHitChance", "fireMin"]:
    if forbidden in ace_block:
        raise SystemExit(f"ace override unexpectedly changes offensive stat: {forbidden}")

if text.count("number === 2 && i === 0") != 1:
    raise SystemExit("ace spawn selector is missing or duplicated")
if text.count("isAce: Boolean(enemy.isAce)") != 1:
    raise SystemExit("ace test-hook flag is missing or duplicated")
if text.count("function startAceKillCam(enemy)") != 1:
    raise SystemExit("startAceKillCam is missing or duplicated")
if text.count("function updateKillCam(rawDt)") != 1:
    raise SystemExit("updateKillCam is missing or duplicated")
if text.count("updateKillCam(rawDt);") != 1:
    raise SystemExit("kill-cam update call is missing or duplicated")
if text.count('"ace-down"') != 1:
    raise SystemExit("ace-down radio id is missing or duplicated")

obsolete = [
    "function spawnEnemy(position, wave, slot, typeKey) {",
    'triggerRadioLine("command", "Multiple bandits inbound, wave two. Stay sharp.", RADIO_PRIORITY.NORMAL, "wave2-inbound");',
    "const dt = Math.min(clock.getDelta(), 0.05);",
]
for marker in obsolete:
    if marker in text:
        raise SystemExit(f"obsolete implementation remains: {marker}")

scripts = re.findall(r'<script type="module">(.*?)</script>', text, flags=re.S)
if len(scripts) != 1:
    raise SystemExit(f"expected one module script, found {len(scripts)}")

for element_id in ["score", "highscore", "health", "missiles", "kills", "state", "startBtn", "retryBtn"]:
    if text.count(f'id="{element_id}"') != 1:
        raise SystemExit(f"required DOM id {element_id!r} is missing or duplicated")

if "three@0.180.0" not in text or "@latest" in text:
    raise SystemExit("Three.js version pin changed")
if "console.warn(" in text or "console.error(" in text:
    raise SystemExit("console warning/error call added")

Path("/tmp/sortie-game.mjs").write_text(scripts[0], encoding="utf-8")
path.write_text(text, encoding="utf-8")
