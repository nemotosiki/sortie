from __future__ import annotations

from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[0]
if not (ROOT / "index.html").exists():
    ROOT = Path.cwd()
INDEX = ROOT / "index.html"


def require_once(text: str, needle: str, label: str) -> int:
    count = text.count(needle)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.index(needle)


def replace_between(text: str, start_marker: str, end_marker: str, replacement: str, label: str) -> str:
    start = require_once(text, start_marker, f"{label} start")
    end = require_once(text, end_marker, f"{label} end")
    if end <= start:
        raise RuntimeError(f"{label}: end marker appeared before start")
    return text[:start] + replacement + text[end:]


def function_span(text: str, name: str) -> tuple[int, int]:
    pattern = re.compile(rf"^\s*(?:async\s+)?function\s+{re.escape(name)}\s*\(", re.MULTILINE)
    matches = list(pattern.finditer(text))
    if len(matches) != 1:
        raise RuntimeError(f"function {name}: expected one declaration, found {len(matches)}")
    start = matches[0].start()
    line_start = text.rfind("\n", 0, start) + 1
    depth = 0
    seen = False
    cursor = line_start
    while cursor < len(text):
        line_end = text.find("\n", cursor)
        if line_end < 0:
            line_end = len(text)
        line = text[cursor:line_end]
        depth += line.count("{") - line.count("}")
        seen = seen or "{" in line
        if seen and depth == 0:
            end = line_end + (1 if line_end < len(text) else 0)
            return line_start, end
        cursor = line_end + 1
    raise RuntimeError(f"function {name}: closing brace not found")


def replace_function(text: str, name: str, replacement: str) -> str:
    start, end = function_span(text, name)
    return text[:start] + replacement + text[end:]


def object_declaration_span(text: str, name: str) -> tuple[int, int]:
    marker = f"    const {name} = {{\n"
    start = require_once(text, marker, f"const {name}")
    brace = text.index("{", start)
    depth = 0
    for i in range(brace, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                if text[end:end + 1] == ";":
                    end += 1
                while end < len(text) and text[end] in " \t":
                    end += 1
                if text[end:end + 1] == "\n":
                    end += 1
                return start, end
    raise RuntimeError(f"const {name}: closing brace not found")


def main() -> None:
    original = INDEX.read_text(encoding="utf-8")
    text = original

    import_anchor = '    } from "./src/ui/radio.js";\n'
    require_once(text, import_anchor, "radio import anchor")
    combat_imports = import_anchor + '''    import {
      DEFAULT_GUN_DAMAGE,
      DEFAULT_GUN_GROUND_BONUS,
      GUN_GIMBAL_DEG,
      GUN_GIMBAL_STRENGTH,
      GUN_MUZZLE_SPEED,
      GUN_RANGE,
      GUN_RATE,
      createPlayerGunController
    } from "./src/combat/player-gun.js";
    import { createMissileGuidance } from "./src/combat/missile-guidance.js";
'''
    text = text.replace(import_anchor, combat_imports, 1)

    text = text.replace("    let GUN_DAMAGE = 16;\n", "    let GUN_DAMAGE = DEFAULT_GUN_DAMAGE;\n", 1)
    text = text.replace("    let GUN_GROUND_BONUS = 1;\n", "    let GUN_GROUND_BONUS = DEFAULT_GUN_GROUND_BONUS;\n", 1)

    gun_block = '''    // Fixed-wing aircraft share one spherical fallback collider. The geometry
    // builder and the gun controller read the same number, so the visible hitbox
    // and analytic gun test cannot drift apart.
    const ENEMY_HITBOX_RADIUS = 10.5;

    const playerGun = createPlayerGunController({
      THREE,
      getPlayer: () => player,
      getPlayerSpeed: () => playerSpeed,
      getEnemies: () => enemies,
      getPreferredTargetId: () => preferredTargetId,
      getLockTargetId: () => lock.targetId,
      getCamera: () => camera,
      getUi: () => ui,
      getDamage: () => GUN_DAMAGE,
      getGroundBonus: () => GUN_GROUND_BONUS,
      getEnemyHitboxRadius: () => ENEMY_HITBOX_RADIUS,
      forwardOf: (object, out) => forwardOf(object, out),
      upOf: (object, out) => upOf(object, out),
      rightOf: (object, out) => rightOf(object, out),
      isHudProjectionVisible: (...args) => isHudProjectionVisible(...args),
      playSfx: (...args) => playSfx(...args),
      damageEnemy: (...args) => damageEnemy(...args),
      createImpactBurst: (...args) => createImpactBurst(...args),
      createTracer: (...args) => createTracer(...args),
      createMuzzleFlash: (...args) => createMuzzleFlash(...args),
      onShot: () => { gunShots += 1; }
    });
    const gunAssist = playerGun.assistState;
    const lastGimbal = playerGun.lastGimbal;
    const gunsightState = playerGun.gunsightState;

    function gunMuzzleOrigin(out) {
      return playerGun.muzzleOrigin(out);
    }

    function gunLeadPoint(from, enemy, out) {
      return playerGun.leadPoint(from, enemy, out);
    }

    function enemyHitSphereRadius(enemy) {
      return playerGun.enemyHitSphereRadius(enemy);
    }

    function gunAimForgiveness(range) {
      return playerGun.aimForgiveness(range);
    }

    function gimbalDecision(angleRad, distance) {
      return playerGun.gimbalDecision(angleRad, distance);
    }

    function gunAssistCap(range) {
      return playerGun.assistCap(range);
    }

    function gunAssistStep(state, targetId, angleRad, range, dt) {
      return playerGun.assistStep(state, targetId, angleRad, range, dt);
    }
'''
    text = replace_between(
        text,
        "    const GUN_RANGE = 750;\n",
        "    const LOCK_RANGE = 1200;\n",
        gun_block,
        "player gun early block"
    )

    start, end = object_declaration_span(text, "gunsightState")
    text = text[:start] + text[end:]

    missile_controller = '''    // The array lifecycle, damage, effects and score stay in this module. Only
    // the seeker / steering / swept-fuse calculation is owned by combat.
    const missileGuidance = createMissileGuidance({
      THREE,
      localForward: LOCAL_FORWARD,
      forwardOf: (object, out) => forwardOf(object, out),
      damping: (k, dt) => damping(k, dt),
      defaultTurnRate: MISSILE_TURN_RATE,
      defaultMaxSpeed: MISSILE_MAX_SPEED,
      defaultFuse: MISSILE_FUSE,
      terminalRange: MISSILE_TERMINAL_RANGE,
      terminalSubsteps: MISSILE_TERMINAL_SUBSTEPS,
      seekerLossTime: SEEKER_LOSS_TIME
    });
'''
    text = replace_between(
        text,
        "    // Sea-skimming profile for the surface rounds.\n",
        "    let loadedMissiles = MISSILE_TUBE_COUNT;\n",
        missile_controller,
        "missile guidance construction"
    )

    text = text.replace("    // Owned by the missile swept-fuse test.\n    const tmpSwept = new THREE.Vector3();\n", "", 1)

    text = replace_function(text, "fireGun", '''    function fireGun() {
      playerGun.fire();
    }
''')

    text = replace_function(text, "updateGunsight", '''    function updateGunsight(dt = 0) {
      playerGun.updateGunsight(dt);
    }
''')

    update_missiles = '''    function updateMissiles(dt) {
      for (let i = missilesInFlight.length - 1; i >= 0; i -= 1) {
        const missile = missilesInFlight[i];
        missile.life += dt;
        missile.trailTimer -= dt;

        // Point defence gets its roll before the round moves, so a drum that
        // is about to be flown past still gets the shot it earned.
        if (ciwsIntercept(missile, dt)) {
          removeMissile(i);
          continue;
        }

        const target = enemies.find((enemy) => enemy.id === missile.targetId && enemy.alive);
        const steps = missileGuidance.stepsFor(missile, target);
        const slice = dt / steps;
        let struck = false;

        for (let step = 0; step < steps; step += 1) {
          const guided = missileGuidance.step(missile, target, slice);

          if (guided.seekerLostNow) {
            // A puff as the motor keeps burning on a dead seeker.
            for (let puff = 0; puff < 3; puff += 1) {
              tmpV3.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
              smokeParticlePool.spawn(missile.mesh.position, tmpV3, 0.5, 0xb9c2c9, -0.1, 0.5);
            }
          }

          if (guided.hit) {
            damageEnemy(target, missile.damage ?? MISSILE_DAMAGE, true);
            if (missile.spw) spwHits += 1;
            else missileHits += 1;
            createExplosion(missile.mesh.position, 0xffc24f, 0.68);
            removeMissile(i);
            struck = true;
            break;
          }

          missile.mesh.position.addScaledVector(guided.direction, guided.travel);
        }
        if (struck) continue;

        if (missile.trailTimer <= 0) {
          forwardOf(missile.mesh, tmpV2);
          tmpV3.copy(missile.mesh.position).addScaledVector(tmpV2, -2.4);
          createMissileTrailPuff(tmpV3);
          missile.trailTimer += 0.03;
        }

        if (missile.life > (missile.lifeLimit ?? MISSILE_LIFE) || missile.mesh.position.y < 0) {
          createImpactBurst(missile.mesh.position, 0xffca70, 0.5);
          removeMissile(i);
        }
      }
    }
'''
    text = replace_function(text, "updateMissiles", update_missiles)

    text = replace_function(text, "sweptMissDistance", '''    function sweptMissDistance(from, dir, length, point) {
      return missileGuidance.sweptMissDistance(from, dir, length, point);
    }
''')
    text = replace_function(text, "proximityFuseFor", '''    function proximityFuseFor(target) {
      return missileGuidance.proximityFuseFor(target);
    }
''')

    required = [
        'from "./src/combat/player-gun.js";',
        'from "./src/combat/missile-guidance.js";',
        'const playerGun = createPlayerGunController({',
        'const missileGuidance = createMissileGuidance({',
        'return playerGun.leadPoint(from, enemy, out);',
        'const guided = missileGuidance.step(missile, target, slice);'
    ]
    for fragment in required:
        if text.count(fragment) != 1:
            raise RuntimeError(f"integration fragment has unexpected count: {fragment!r}")

    forbidden = [
        "    const GUN_RANGE = 750;\n",
        "    const GUN_RATE = 6;\n",
        "    const POPUP_DIVE_RATIO = 1.2;\n",
        "    const POPUP_MIN_DROP = 60;\n",
        "    const tmpSwept = new THREE.Vector3();\n",
        "    const gunsightState = {\n",
        "      // Gun gimbal: a slight pull towards the aiming solution, not an auto-aim\n",
        "              // Cruise leg of the sea-skimming profile: steer at the target's\n"
    ]
    for fragment in forbidden:
        if fragment in text:
            raise RuntimeError(f"inline implementation was not removed: {fragment!r}")

    if text == original:
        raise RuntimeError("patch produced no change")

    INDEX.write_text(text, encoding="utf-8", newline="\n")

    match = re.search(r'<script type="module">\n(?P<body>.*)\n  </script>', text, re.DOTALL)
    if not match:
        raise RuntimeError("could not extract module script")
    with tempfile.TemporaryDirectory() as temp_dir:
        module_path = Path(temp_dir) / "index-module.mjs"
        module_path.write_text(match.group("body"), encoding="utf-8", newline="\n")
        subprocess.run(["node", "--check", str(module_path)], check=True)

    for module in (
        ROOT / "src/combat/player-gun.js",
        ROOT / "src/combat/missile-guidance.js"
    ):
        subprocess.run(["node", "--check", str(module)], check=True)

    print("split-combat patch applied and syntax checked")


if __name__ == "__main__":
    main()
