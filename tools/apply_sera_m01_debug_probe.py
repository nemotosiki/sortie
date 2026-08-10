from __future__ import annotations

from pathlib import Path
import re
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"


def check_module_source(source: str) -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        path = Path(temp_dir) / "index-module.mjs"
        path.write_text(source, encoding="utf-8", newline="\n")
        subprocess.run(["node", "--check", str(path)], check=True)


def main() -> None:
    original = INDEX.read_text(encoding="utf-8")
    marker = "    window.__game = {\n"
    if original.count(marker) != 1:
        raise RuntimeError(f"debug object marker count={original.count(marker)}")

    methods = """    window.__game = {
      // Focused vertical-slice probes. They are intentionally generic enough
      // to remain useful while M01 is tuned, but refuse every other mission so
      // a debug action cannot alter a stock sortie by accident.
      forceStartMissionByKey: (key, aircraftId = \"f16\") => {
        if (gameState === STATE_PLAYING) return false;
        const index = MISSIONS.findIndex((mission) => mission.key === key);
        if (index < 0 || !AIRCRAFT_TYPES[aircraftId]) return false;
        currentMissionIndex = index;
        selectedCampaignId = missionCampaignId(MISSIONS[index]);
        rebuildCampaignMissionIndices();
        selectedAircraftId = aircraftId;
        applyAircraftLoadout(aircraftId);
        startMission();
        return gameState === STATE_PLAYING;
      },
      seraM01Probe: () => {
        const mission = MISSIONS[currentMissionIndex];
        return {
          state: gameState,
          missionKey: mission ? mission.key : null,
          worldKey: mission ? mission.world : null,
          waveNumber,
          missionWaveIndex,
          outcomePending: outcomePending.active,
          outcomeTimer: outcomePending.timer,
          activeGate: activeWaveGate
            ? {
                elapsed: activeWaveGate.elapsed,
                timeout: activeWaveGate.timeout,
                ids: [...activeWaveGate.ids]
              }
            : null,
          friendlies: friendlies.map((friendly) => ({
            kind: friendly.kind,
            label: friendly.label,
            type: friendly.type || null,
            radioSpeaker: friendly.radioSpeaker || null,
            position: [friendly.group.position.x, friendly.group.position.y, friendly.group.position.z]
          })),
          enemies: enemies.filter((enemy) => enemy.alive).map((enemy) => ({
            id: enemy.id,
            type: enemy.type,
            tgt: isTgtEntry(enemy),
            disposition: contactDisposition(enemy),
            strike: Boolean(enemy.strikeTarget),
            position: [enemy.group.position.x, enemy.group.position.y, enemy.group.position.z]
          })),
          base: friendlyBase
            ? {
                hits: friendlyBase.hits,
                breached: Boolean(friendlyBase.breached),
                warnedFar: Boolean(friendlyBase.warnedFar),
                warnedClose: Boolean(friendlyBase.warnedClose)
              }
            : null,
          radio: {
            speaker: ui.radioSpeaker ? ui.radioSpeaker.textContent : \"\",
            text: ui.radioText ? ui.radioText.textContent : \"\"
          }
        };
      },
      forceSeraM01AdvancePhase: () => {
        const mission = MISSIONS[currentMissionIndex];
        if (gameState !== STATE_PLAYING || !mission || mission.key !== \"m01\") return false;
        if (activeWaveGate) activeWaveGate.elapsed = activeWaveGate.timeout;
        updateMission(0.016, 3.0);
        return true;
      },
      forceSeraM01Breach: () => {
        const mission = MISSIONS[currentMissionIndex];
        if (gameState !== STATE_PLAYING || !mission || mission.key !== \"m01\" || !friendlyBase) {
          return false;
        }
        const bomber = enemies.find(
          (enemy) => enemy.alive && enemy.strikeTarget && !enemy.bombRunFired
        );
        if (!bomber) return false;
        bomber.group.position.x = friendlyBase.x;
        bomber.group.position.z = friendlyBase.z;
        return updateStrikeThreat();
      },
      seraM01PerfectRankPreview: () => {
        const mission = MISSIONS[currentMissionIndex];
        if (!mission || mission.key !== \"m01\") return null;
        const oldKill = rankStats.playerKillValue;
        const oldElapsed = missionElapsed;
        rankStats.playerKillValue = rankStats.spawnedValue;
        missionElapsed = 0;
        const rank = computeMissionRank().rank;
        rankStats.playerKillValue = oldKill;
        missionElapsed = oldElapsed;
        return rank;
      },
      forceSeraM01Complete: () => {
        const mission = MISSIONS[currentMissionIndex];
        if (gameState !== STATE_PLAYING || !mission || mission.key !== \"m01\") return false;
        for (let pass = 0; pass < 12 && gameState === STATE_PLAYING && !outcomePending.active; pass += 1) {
          if (activeWaveGate) activeWaveGate.elapsed = activeWaveGate.timeout;
          const targets = enemies.filter((enemy) => enemy.alive && isTgtEntry(enemy));
          for (const target of targets) damageEnemy(target, target.hp + 1, true, false);
          updateMission(0.016, 3.0);
        }
        return outcomePending.active;
      },
      forceSeraM01ResolveOutcome: () => {
        const mission = MISSIONS[currentMissionIndex];
        if (gameState !== STATE_PLAYING
            || !mission
            || mission.key !== \"m01\"
            || !outcomePending.active) {
          return false;
        }
        // Use the production transition function, but advance its wall-clock
        // hold deterministically. Headless Chromium can throttle requestAnimationFrame
        // to 1 Hz and the game clamps frame delta, making a real 2.8 s band take
        // nearly a minute in CI even though it is correct in a foreground tab.
        updateOutcomePending(OUTCOME_PENDING_TIME + 0.1);
        return gameState === STATE_COMPLETE;
      },
"""
    text = original.replace(marker, methods, 1)

    required = (
        "forceStartMissionByKey:",
        "seraM01Probe:",
        "forceSeraM01AdvancePhase:",
        "forceSeraM01Breach:",
        "seraM01PerfectRankPreview:",
        "forceSeraM01Complete:",
        "forceSeraM01ResolveOutcome:",
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
    INDEX.write_text(text, encoding="utf-8", newline="\n")
    print("Sera M01 debug probes applied and syntax checked")


if __name__ == "__main__":
    main()
