from __future__ import annotations

from pathlib import Path
import re
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def check_module_source(source: str) -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        path = Path(temp_dir) / "index-module.mjs"
        path.write_text(source, encoding="utf-8", newline="\n")
        subprocess.run(["node", "--check", str(path)], check=True)


def main() -> None:
    original = INDEX.read_text(encoding="utf-8")
    text = original

    text = replace_once(
        text,
        """        delay: Math.max(0, Number(entry.delay) || 0),
        // Naval only. `at` pins the formation's centre to a world [x, z]
        // instead of taking the default \"2.4km off the player's nose, clamped
        // into the inner sea\", and `facing` is the [x, z] the hulls point at.
        // Both exist for BEACHHEAD: a landing force is defined by the line it
        // is steaming down, and a fleet placed relative to wherever the player
        // happens to be looking has no such line. Omitted on every wave
        // written before this, so the default placement is untouched.
        at: kind === \"naval\" && Array.isArray(entry.at)
""",
        """        delay: Math.max(0, Number(entry.delay) || 0),
        // A non-TGT principal may still be a real phase. `clearOrTimeout`
        // holds progression while one of the contacts it spawned is alive,
        // but releases the phase once its authored clock expires. Existing
        // waves omit this and retain the designated-target-only contract.
        gate: entry.gate && entry.gate.mode === \"clearOrTimeout\"
          ? Object.freeze({
              mode: \"clearOrTimeout\",
              timeout: Math.max(0, Number(entry.gate.timeout) || 0)
            })
          : null,
        // Any wave may author an absolute [x, z] approach point and an [x, z]
        // point to face. Naval formations keep their existing use; air waves
        // gain the same deterministic geography for story missions. Omitted
        // entries still use the historic mission-ring placement.
        at: Array.isArray(entry.at)
""",
        "wave gate and authored origin header",
    )
    text = replace_once(
        text,
        """        facing: kind === \"naval\" && Array.isArray(entry.facing)
          ? Object.freeze([Number(entry.facing[0]) || 0, Number(entry.facing[1]) || 0])
          : null,
        // ENEMY_ROLES key for every aircraft in the wave. Omitted = line, i.e.
""",
        """        facing: Array.isArray(entry.facing)
          ? Object.freeze([Number(entry.facing[0]) || 0, Number(entry.facing[1]) || 0])
          : null,
        // Air only. An authored approach altitude accompanies `at`; naval
        // waves stay at sea level and ignore it.
        altitude: kind === \"air\" && Number.isFinite(Number(entry.altitude))
          ? Number(entry.altitude)
          : null,
        // ENEMY_ROLES key for every aircraft in the wave. Omitted = line, i.e.
""",
        "generic facing and air altitude",
    )

    text = replace_once(
        text,
        """    const pendingWaves = [];
    // Next free HUD target id block, and how many wave targets the sortie has
""",
        """    const pendingWaves = [];
    // Optional gate owned by the active principal wave. Its ids are the exact
    // contacts that phase spawned; escorts and later waves cannot accidentally
    // hold it open.
    let activeWaveGate = null;
    // Next free HUD target id block, and how many wave targets the sortie has
""",
        "active wave gate state",
    )
    text = replace_once(
        text,
        """      missionWaveIndex = 0;
      waveIdCursor = 0;
""",
        """      missionWaveIndex = 0;
      waveIdCursor = 0;
      activeWaveGate = null;
""",
        "wave gate reset",
    )

    text = replace_once(
        text,
        """      const explicitOrigin = Boolean(wave && wave.at);
""",
        """      const explicitOrigin = Boolean(wave && wave.at);
""",
        "authored origin already integrated",
    ) if "      const explicitOrigin = Boolean(wave && wave.at);\n" in text else text

    old_spawn = """      const opening = !((wave && wave.hunt)) && missionElapsed < OPENING_SPAWN_TIME;
      const radius = wave && wave.hunt
        ? HUNT_WAVE_RING_RADIUS
        : (opening ? Math.max(WAVE_RING_RADIUS[ringBand], OPENING_SPAWN_RADIUS) : WAVE_RING_RADIUS[ringBand]);
      const anchor = waveAnchorFor(wave, new THREE.Vector3());
      const origin = opening
        ? resolveWaveSpawnPoint(anchor, waveIndex, radius, new THREE.Vector3(), OPENING_SPAWN_MIN_RANGE, OPENING_SPAWN_MAX_RANGE)
        : resolveWaveSpawnPoint(anchor, waveIndex, radius, new THREE.Vector3());
"""
    new_spawn = """      const explicitOrigin = Boolean(wave && wave.at);
      const opening = !explicitOrigin && !((wave && wave.hunt)) && missionElapsed < OPENING_SPAWN_TIME;
      const radius = wave && wave.hunt
        ? HUNT_WAVE_RING_RADIUS
        : (opening ? Math.max(WAVE_RING_RADIUS[ringBand], OPENING_SPAWN_RADIUS) : WAVE_RING_RADIUS[ringBand]);
      const anchor = wave && wave.facing
        ? new THREE.Vector3(wave.facing[0], 0, wave.facing[1])
        : waveAnchorFor(wave, new THREE.Vector3());
      const authoredAltitude = Number.isFinite(wave && wave.altitude)
        ? wave.altitude
        : player.position.y;
      const origin = explicitOrigin
        ? new THREE.Vector3(
            wave.at[0],
            Math.max(WAVE_SPAWN_MIN_ALTITUDE, authoredAltitude),
            wave.at[1]
          )
        : (opening
          ? resolveWaveSpawnPoint(anchor, waveIndex, radius, new THREE.Vector3(), OPENING_SPAWN_MIN_RANGE, OPENING_SPAWN_MAX_RANGE)
          : resolveWaveSpawnPoint(anchor, waveIndex, radius, new THREE.Vector3()));
"""
    if old_spawn in text:
        text = replace_once(text, old_spawn, new_spawn, "authored air-wave spawn")
    elif new_spawn not in text:
        raise RuntimeError("authored air-wave spawn: neither old nor new block found")

    text = replace_once(
        text,
        """      const idBase = wave.idBase === null || wave.idBase === undefined ? waveIdCursor : wave.idBase;
      waveIdCursor = Math.max(waveIdCursor, idBase + size);
      // Designated targets only - the dev hooks below equate this with `kills`
""",
        """      const idBase = wave.idBase === null || wave.idBase === undefined ? waveIdCursor : wave.idBase;
      waveIdCursor = Math.max(waveIdCursor, idBase + size);
      if (!wave.concurrent) {
        activeWaveGate = wave.gate
          ? {
              ids: new Set(Array.from({ length: size }, (_, slot) => idBase + slot + 1)),
              elapsed: 0,
              timeout: wave.gate.timeout
            }
          : null;
      }
      // Designated targets only - the dev hooks below equate this with `kills`
""",
        "activate principal wave gate",
    )

    text = replace_once(
        text,
        """      updatePendingWaves(dt);
      updateStrikeThreat();
      updateLandingThreat();
      // Only designated targets hold the mission open. A surviving escort or
""",
        """      updatePendingWaves(dt);
      updateStrikeThreat();
      updateLandingThreat();
      if (activeWaveGate) {
        activeWaveGate.elapsed += dt;
        const gateContactAlive = enemies.some(
          (enemy) => enemy.alive && activeWaveGate.ids.has(enemy.id)
        );
        if (gateContactAlive && activeWaveGate.elapsed < activeWaveGate.timeout) {
          waveClearTimer = -1;
          return;
        }
        activeWaveGate = null;
      }
      // Only designated targets hold the mission open. A surviving escort or
""",
        "enforce active wave gate",
    )

    required = (
        'mode: "clearOrTimeout"',
        "let activeWaveGate = null;",
        "const explicitOrigin = Boolean(wave && wave.at);",
        "activeWaveGate.ids.has(enemy.id)",
        "altitude: kind === \"air\"",
    )
    for token in required:
        if token not in text:
            raise RuntimeError(f"patched index missing {token!r}")

    module = re.search(r'<script type="module">\n(?P<body>.*)\n  </script>', text, re.DOTALL)
    if not module:
        raise RuntimeError("could not extract index module")
    check_module_source(module.group("body"))
    if "\r" in text:
        raise RuntimeError("index.html must remain LF-only")
    if text == original:
        raise RuntimeError("wave host patch produced no changes")
    INDEX.write_text(text, encoding="utf-8", newline="\n")
    print("Sera M01 wave host patch applied and syntax checked")


if __name__ == "__main__":
    main()
