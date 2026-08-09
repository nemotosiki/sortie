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


def replace_section(text: str, start: str, end: str, new: str, label: str) -> str:
    starts = [m.start() for m in re.finditer(re.escape(start), text)]
    if len(starts) != 1:
        raise RuntimeError(f"{label}: expected one start marker, found {len(starts)}")
    begin = starts[0]
    finish = text.find(end, begin + len(start))
    if finish < 0:
        raise RuntimeError(f"{label}: end marker not found")
    return text[:begin] + new + text[finish:]


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
        """    let activeWaveGate = null;
    // Next free HUD target id block, and how many wave targets the sortie has
""",
        """    let activeWaveGate = null;
    // Set only when a mission-specific world objective ends the sortie. A
    // normal player crash still uses the legacy failure line.
    let missionFailureRadioOverride = null;
    // Next free HUD target id block, and how many wave targets the sortie has
""",
        "mission failure radio state",
    )
    text = replace_once(
        text,
        """      waveIdCursor = 0;
      activeWaveGate = null;
      // The hunter pattern is deterministic per sortie. Leaving the counter at
""",
        """      waveIdCursor = 0;
      activeWaveGate = null;
      missionFailureRadioOverride = null;
      // The hunter pattern is deterministic per sortie. Leaving the counter at
""",
        "reset mission failure radio",
    )

    text = replace_once(
        text,
        """      playerKillValue: 0,
      baseDamagePenalty: 0,
      missionElapsed: 0,
""",
        """      playerKillValue: 0,
      baseDamagePenalty: 0,
      friendlyBaseHits: 0,
      friendlyBaseBreached: false,
      friendlyBaseWarnedFar: false,
      friendlyBaseWarnedClose: false,
      missionElapsed: 0,
""",
        "checkpoint base defaults",
    )
    text = replace_once(
        text,
        """      checkpoint.playerKillValue = rankStats.playerKillValue;
      checkpoint.baseDamagePenalty = baseDamagePenalty;
      checkpoint.missionElapsed = missionElapsed;
""",
        """      checkpoint.playerKillValue = rankStats.playerKillValue;
      checkpoint.baseDamagePenalty = baseDamagePenalty;
      checkpoint.friendlyBaseHits = friendlyBase ? friendlyBase.hits : 0;
      checkpoint.friendlyBaseBreached = Boolean(friendlyBase && friendlyBase.breached);
      checkpoint.friendlyBaseWarnedFar = Boolean(friendlyBase && friendlyBase.warnedFar);
      checkpoint.friendlyBaseWarnedClose = Boolean(friendlyBase && friendlyBase.warnedClose);
      checkpoint.missionElapsed = missionElapsed;
""",
        "save base state",
    )
    text = replace_once(
        text,
        """      rankStats.playerKillValue = at.playerKillValue;
      baseDamagePenalty = at.baseDamagePenalty;
      missionElapsed = at.missionElapsed;
""",
        """      rankStats.playerKillValue = at.playerKillValue;
      baseDamagePenalty = at.baseDamagePenalty;
      if (friendlyBase) {
        friendlyBase.hits = at.friendlyBaseHits || 0;
        friendlyBase.breached = Boolean(at.friendlyBaseBreached);
        friendlyBase.warnedFar = Boolean(at.friendlyBaseWarnedFar);
        friendlyBase.warnedClose = Boolean(at.friendlyBaseWarnedClose);
      }
      missionElapsed = at.missionElapsed;
""",
        "restore base state",
    )

    helper_marker = "    // Ground installations belong to the mission rather than to a wave: they\n"
    helpers = """    function authoredRadioPriority(line, fallback = RADIO_PRIORITY.NORMAL) {
      if (!line) return fallback;
      if (Number.isFinite(line.priority)) return Math.trunc(line.priority);
      if (line.priority === \"CRITICAL\") return RADIO_PRIORITY.CRITICAL;
      if (line.priority === \"URGENT\") return RADIO_PRIORITY.URGENT;
      if (line.priority === \"NORMAL\") return RADIO_PRIORITY.NORMAL;
      return fallback;
    }

    function playAuthoredRadio(line, fallback = RADIO_PRIORITY.NORMAL) {
      if (!line || !line.speaker || !line.text) return false;
      return triggerRadioLine(
        line.speaker,
        line.text,
        authoredRadioPriority(line, fallback),
        line.id || null
      );
    }

"""
    if helper_marker not in text:
        raise RuntimeError("authored radio helper insertion marker missing")
    text = text.replace(helper_marker, helpers + helper_marker, 1)

    text = replace_once(
        text,
        """      if (mission.introRadio) {
        for (const line of mission.introRadio) radioSay(line.speaker, line.text, RADIO_PRIORITY.NORMAL, line.id);
      }
""",
        """      if (mission.introRadio) {
        for (const line of mission.introRadio) playAuthoredRadio(line);
      }
""",
        "intro radio priority",
    )
    wave_radio_old = "for (const line of wave.radio) triggerRadioLine(line.speaker, line.text, RADIO_PRIORITY.NORMAL, line.id);"
    wave_radio_new = "for (const line of wave.radio) playAuthoredRadio(line);"
    if text.count(wave_radio_old) != 2:
        raise RuntimeError(f"wave radio priority: expected two loops, found {text.count(wave_radio_old)}")
    text = text.replace(wave_radio_old, wave_radio_new)

    text = replace_once(
        text,
        """      if (STRIKE_AIR_TYPES.has(enemy.type) && !bomberFirstKillFired) {
        bomberFirstKillFired = true;
        triggerRadioLine(
          \"command\",
          \"1機撃墜を確認。残りを頼む、時間が無い。\",
          RADIO_PRIORITY.NORMAL,
          \"bomber-first-down\"
        );
      }
""",
        """      if (STRIKE_AIR_TYPES.has(enemy.type) && !bomberFirstKillFired) {
        bomberFirstKillFired = true;
        const authored = MISSIONS[currentMissionIndex].bomberFirstKillRadio;
        if (!playAuthoredRadio(authored)) {
          triggerRadioLine(
            \"command\",
            \"1機撃墜を確認。残りを頼む、時間が無い。\",
            RADIO_PRIORITY.NORMAL,
            \"bomber-first-down\"
          );
        }
      }
""",
        "authored first bomber kill radio",
    )

    text = replace_section(
        text,
        "    function updateStrikeThreat() {",
        "\n    // BEACHHEAD's counterpart to updateStrikeThreat",
        """    function updateStrikeThreat() {
      if (!friendlyBase) return false;

      const mission = MISSIONS[currentMissionIndex];
      const breachRule = mission.bomberBreach || null;
      let closest = -1;
      for (const enemy of enemies) {
        if (!enemy.alive || !enemy.strikeTarget || enemy.bombRunFired) continue;
        const distance = Math.hypot(
          enemy.group.position.x - friendlyBase.x,
          enemy.group.position.z - friendlyBase.z
        );
        if (closest < 0 || distance < closest) closest = distance;
        if (distance > friendlyBase.failRadius) continue;

        // Release point. The bomber drops, the field takes damage, and the
        // bomber turns for home - still a designated target, now a fleeing one.
        enemy.bombRunFired = true;
        friendlyBase.breached = true;
        friendlyBase.hits += 1;
        baseDamagePenalty += BASE_BOMB_PENALTY;
        score = Math.max(0, score - BASE_BOMB_PENALTY);
        for (let i = 0; i < 5; i += 1) {
          tmpV9.set(
            friendlyBase.x + (Math.random() - 0.5) * 260,
            friendlyBase.y + 6,
            friendlyBase.z + (Math.random() - 0.5) * 620
          );
          createExplosion(tmpV9, 0xffb648, 1.6 + Math.random() * 0.7);
        }
        playSfx(\"explosion\", 0.95, 0.68);
        playTone(52, 1.1, 0.2, \"sawtooth\");
        cameraShake = Math.min(1.8, cameraShake + 0.9);
        const struckLabel = friendlyBase.style === \"city\" ? \"CITY\" : \"BASE\";
        const struckRadio = friendlyBase.style === \"city\"
          ? \"市街に着弾！ 投弾を許した——だが作戦は続行だ。爆撃機を全機墜とせ！\"
          : \"基地被弾！ 投弾を許した——だが作戦は続行だ。爆撃機を全機墜とせ！\";
        showBanner(`${struckLabel} DAMAGED · -${BASE_BOMB_PENALTY} PTS`, 2.0, \"danger\");

        const failAt = Number(breachRule && breachRule.failAt);
        if (Number.isFinite(failAt) && friendlyBase.hits >= failAt) {
          missionFailureRadioOverride = mission.failureRadio || breachRule.failureRadio || null;
          if (breachRule.failBanner) showBanner(breachRule.failBanner, 2.0, \"danger\");
          completeMission(false);
          return true;
        }

        if (!playAuthoredRadio(breachRule && breachRule.hitRadio, RADIO_PRIORITY.URGENT)) {
          radioSay(
            \"command\",
            struckRadio,
            RADIO_PRIORITY.URGENT,
            `base-hit-${friendlyBase.hits}`
          );
        }

        // Egress: hold the run heading and keep going, away from the field.
        tmpV9.copy(enemy.group.position).sub(enemy.strikeTarget);
        tmpV9.y = 0;
        if (tmpV9.lengthSq() < 1) tmpV9.set(0, 0, 1);
        tmpV9.normalize();
        enemy.strikeTarget.copy(enemy.group.position).addScaledVector(tmpV9, 9000);
        enemy.strikeTarget.y = enemy.group.position.y;
      }

      // Two warnings on the way in, each fired once. Missions may replace only
      // the wording and speaker; the distance contract stays shared.
      if (closest >= 0) {
        if (closest < 1100 && !friendlyBase.warnedClose) {
          friendlyBase.warnedClose = true;
          showBanner(
            friendlyBase.style === \"city\"
              ? \"WARNING · BOMBERS NEARING THE CITY\"
              : \"WARNING · BOMBERS NEARING AIRBASE\",
            1.8,
            \"danger\"
          );
          if (!playAuthoredRadio(breachRule && breachRule.closeRadio, RADIO_PRIORITY.URGENT)) {
            radioSay(
              \"command\",
              \"爆撃機が基地に迫っている！ 投弾される前に落とせ！\",
              RADIO_PRIORITY.URGENT,
              \"base-warn-close\"
            );
          }
        } else if (closest < 2600 && !friendlyBase.warnedFar) {
          friendlyBase.warnedFar = true;
          if (!playAuthoredRadio(breachRule && breachRule.farRadio)) {
            radioSay(
              \"command\",
              \"敵爆撃編隊、本基地へ直行中。進路上に何もない——君だけだ。\",
              RADIO_PRIORITY.NORMAL,
              \"base-warn-far\"
            );
          }
        }
      }
      return false;
    }
""",
        "mission breach-aware strike threat",
    )

    text = replace_once(
        text,
        """      updatePendingWaves(dt);
      updateStrikeThreat();
      updateLandingThreat();
""",
        """      updatePendingWaves(dt);
      if (updateStrikeThreat()) return;
      updateLandingThreat();
""",
        "stop mission loop on breach failure",
    )

    text = replace_once(
        text,
        """    function computeMissionRank() {
      const par = MISSIONS[currentMissionIndex].parTime;
""",
        """    function computeMissionRank() {
      const mission = MISSIONS[currentMissionIndex];
      const par = mission.parTime;
""",
        "rank mission reference",
    )
    text = replace_once(
        text,
        """      if (guardWiped && RANK_ORDER[rank] > RANK_ORDER.B) rank = \"B\";

      // A sortie that had to be restarted from a checkpoint is not a flawless
""",
        """      if (guardWiped && RANK_ORDER[rank] > RANK_ORDER.B) rank = \"B\";

      const breachCapAt = Number(mission.bomberBreach && mission.bomberBreach.sCapAt);
      const breachCapped = Number.isFinite(breachCapAt)
        && Boolean(friendlyBase)
        && friendlyBase.hits >= breachCapAt;
      if (breachCapped && RANK_ORDER[rank] > RANK_ORDER.A) rank = \"A\";

      // A sortie that had to be restarted from a checkpoint is not a flawless
""",
        "rank cap after bomber breach",
    )
    text = replace_once(
        text,
        """      const capped = (!guardPerfect && rank === \"A\") || (guardWiped && rank === \"B\")
        || (checkpoint.used && rank === \"A\");
""",
        """      const capped = (!guardPerfect && rank === \"A\") || (guardWiped && rank === \"B\")
        || (breachCapped && rank === \"A\")
        || (checkpoint.used && rank === \"A\");
""",
        "rank delta knows breach cap",
    )

    text = replace_once(
        text,
        """        resetRadio();
        radioSay(
          \"command\",
          \"空域クリア。敵全機の撤退を確認。帰投せよ、{nickname}。\",
          RADIO_PRIORITY.CRITICAL,
          \"mission-outcome\"
        );
""",
        """        resetRadio();
        const successLine = MISSIONS[currentMissionIndex].successRadio;
        if (!playAuthoredRadio(successLine, RADIO_PRIORITY.CRITICAL)) {
          radioSay(
            \"command\",
            \"空域クリア。敵全機の撤退を確認。帰投せよ、{nickname}。\",
            RADIO_PRIORITY.CRITICAL,
            \"mission-outcome\"
          );
        }
""",
        "mission-specific success radio",
    )
    text = replace_once(
        text,
        """      resetRadio();
      triggerRadioLine(
        \"command\",
        \"応答が途絶えた…聞こえていたら帰投せよ。\",
        RADIO_PRIORITY.CRITICAL,
        \"mission-outcome\"
      );
""",
        """      resetRadio();
      const failureLine = missionFailureRadioOverride;
      missionFailureRadioOverride = null;
      if (!playAuthoredRadio(failureLine, RADIO_PRIORITY.CRITICAL)) {
        triggerRadioLine(
          \"command\",
          \"応答が途絶えた…聞こえていたら帰投せよ。\",
          RADIO_PRIORITY.CRITICAL,
          \"mission-outcome\"
        );
      }
""",
        "mission-specific failure radio",
    )

    required = (
        "let missionFailureRadioOverride = null;",
        "function playAuthoredRadio(line",
        "checkpoint.friendlyBaseHits",
        "mission.bomberBreach || null",
        "if (updateStrikeThreat()) return;",
        "const breachCapped =",
        "const successLine = MISSIONS[currentMissionIndex].successRadio;",
        "const failureLine = missionFailureRadioOverride;",
        "const authored = MISSIONS[currentMissionIndex].bomberFirstKillRadio;",
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
        raise RuntimeError("breach host patch produced no changes")
    INDEX.write_text(text, encoding="utf-8", newline="\n")
    print("Sera M01 breach host patch applied and syntax checked")


if __name__ == "__main__":
    main()
