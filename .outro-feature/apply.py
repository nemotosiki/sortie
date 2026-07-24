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


replace_once(
    """    .resultStat strong {
      display: block;
      margin-top: 5px;
      color: #fff;
      font-size: 34px;
    }

    #controlModeStatus {
""",
    """    .resultStat strong {
      display: block;
      margin-top: 5px;
      color: #fff;
      font-size: 34px;
    }

    .debriefIntel {
      max-width: 680px;
      margin: 24px auto 28px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 211, 95, 0.34);
      text-align: left;
    }

    .debriefIntelHeader {
      margin-bottom: 10px;
      color: rgba(255, 218, 126, 0.68);
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.22em;
    }

    #debriefIntelLines {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    #debriefIntelLines li {
      color: rgba(188, 255, 201, 0.78);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: clamp(10px, 1.05vw, 12px);
      line-height: 1.55;
      letter-spacing: 0.03em;
    }

    #debriefIntelLines li + li { margin-top: 7px; }
    #debriefIntelLines li::before { content: ">> "; color: #ffd35f; }

    #controlModeStatus {
""",
    "debrief CSS",
)

replace_once(
    """      <div class="resultStats">
        <div class="resultStat"><span>FINAL SCORE</span><strong id="finalScore">0</strong></div>
        <div class="resultStat"><span>KILLS</span><strong id="finalKills">0</strong></div>
        <div class="resultStat"><span>HIGH SCORE</span><strong id="finalHighscore">0</strong></div>
      </div>
      <button id="retryBtn" class="actionButton" type="button">Retry Mission</button>
""",
    """      <div class="resultStats">
        <div class="resultStat"><span>FINAL SCORE</span><strong id="finalScore">0</strong></div>
        <div class="resultStat"><span>KILLS</span><strong id="finalKills">0</strong></div>
        <div class="resultStat"><span>HIGH SCORE</span><strong id="finalHighscore">0</strong></div>
      </div>
      <div class="debriefIntel" id="debriefIntel">
        <div class="debriefIntelHeader">INTERCEPTED ENEMY COMMS · POST-ACTION</div>
        <ul id="debriefIntelLines"></ul>
      </div>
      <button id="retryBtn" class="actionButton" type="button">Retry Mission</button>
""",
    "debrief markup",
)

replace_once(
    """    const KILLCAM_FOV_TIGHTEN = 6;

    const ENEMY_TYPE_ORDER = Object.freeze([
""",
    """    const KILLCAM_FOV_TIGHTEN = 6;
    const OUTRO_COMPLETE_AT = 16.0;
    const OUTRO_RETREAT_BANNER_AT = 10.8;

    const ENEMY_TYPE_ORDER = Object.freeze([
""",
    "outro constants",
)

replace_once(
    """      finalScore: document.getElementById("finalScore"),
      finalKills: document.getElementById("finalKills"),
      finalHighscore: document.getElementById("finalHighscore")
""",
    """      finalScore: document.getElementById("finalScore"),
      finalKills: document.getElementById("finalKills"),
      finalHighscore: document.getElementById("finalHighscore"),
      debriefIntelLines: document.getElementById("debriefIntelLines")
""",
    "debrief UI reference",
)

replace_once(
    """    let cameraMode = CAMERA_MODES[0];
    let timeScale = 1;
    const killCam = {
      active: false,
      timer: 0,
      enemyId: null,
      focusPoint: new THREE.Vector3()
    };
    let preferredTargetId = null;
""",
    """    let cameraMode = CAMERA_MODES[0];
    let timeScale = 1;
    const killCam = {
      active: false,
      timer: 0,
      enemyId: null,
      focusPoint: new THREE.Vector3()
    };
    const outro = { active: false, elapsed: 0, retreatBannerFired: false };
    let aceDestroyed = false;
    let preferredTargetId = null;
""",
    "outro state",
)

replace_once(
    """      cameraFov: BASE_CAMERA_FOV,
      timeScale: 1,
      killCam: { active: false, timer: 0, enemyId: null },
      selectedTargetId: null,
""",
    """      cameraFov: BASE_CAMERA_FOV,
      timeScale: 1,
      killCam: { active: false, timer: 0, enemyId: null },
      outro: { active: false, elapsed: 0, retreatBannerFired: false },
      debrief: [],
      selectedTargetId: null,
""",
    "game hook outro literal",
)

replace_once(
    """        gunKills: 0,
        missileKills: 0,
        damageTaken: 0,
        forceDamageEnemy: (id, amount = 200) => {
          if (gameState !== STATE_PLAYING) return false;
          const enemy = enemies.find((candidate) => candidate.alive && candidate.id === id);
          if (!enemy) return false;
          damageEnemy(enemy, amount, false);
          return true;
        }
""",
    """        gunKills: 0,
        missileKills: 0,
        damageTaken: 0,
        aceDestroyed: false,
        forceDamageEnemy: (id, amount = 200) => {
          if (gameState !== STATE_PLAYING) return false;
          const enemy = enemies.find((candidate) => candidate.alive && candidate.id === id);
          if (!enemy) return false;
          damageEnemy(enemy, amount, false);
          return true;
        },
        forceStartOutro: () => {
          if (gameState !== STATE_PLAYING || outro.active) return false;
          for (const enemy of enemies) {
            if (!enemy.alive) continue;
            enemy.alive = false;
            enemy.deadTimer = 0.2;
            enemy.hitbox.visible = false;
            enemy.model.group.visible = false;
          }
          kills = TOTAL_ENEMIES;
          aceDestroyed = true;
          waveNumber = 2;
          resetLock();
          preferredTargetId = null;
          startOutro();
          return true;
        },
        skipOutro: () => {
          if (!outro.active) return false;
          outro.elapsed = OUTRO_COMPLETE_AT;
          return true;
        }
""",
    "outro debug hooks",
)

replace_once(
    """      killCam.active = false;
      killCam.timer = 0;
      killCam.enemyId = null;
      score = 0;
""",
    """      killCam.active = false;
      killCam.timer = 0;
      killCam.enemyId = null;
      outro.active = false;
      outro.elapsed = 0;
      outro.retreatBannerFired = false;
      aceDestroyed = false;
      window.__game.debrief = [];
      ui.debriefIntelLines.replaceChildren();
      score = 0;
""",
    "mission outro reset",
)

replace_once(
    """        spawnEnemy(position, number, i, waveTypes[i], number === 2 && i === 0);
""",
    """        spawnEnemy(position, number, i, waveTypes[i], number === 2 && i === 0);
""",
    "ace spawn call retained",
)

replace_once(
    """      if (enemy.isAce) {
        startAceKillCam(enemy);
""",
    """      if (enemy.isAce) {
        aceDestroyed = true;
        startAceKillCam(enemy);
""",
    "ace destroyed tracking",
)

replace_once(
    """    function updateMission(dt) {
      if (gameState !== STATE_PLAYING) return;
      const living = enemies.some((enemy) => enemy.alive);
""",
    """    function updateMission(dt) {
      if (gameState !== STATE_PLAYING) return;
      if (outro.active) {
        updateOutro(dt);
        return;
      }
      const living = enemies.some((enemy) => enemy.alive);
""",
    "outro early return",
)

replace_once(
    """      } else if (kills >= TOTAL_ENEMIES) {
        completeMission(true);
      }
    }

    function completeMission(success) {
""",
    """      } else if (kills >= TOTAL_ENEMIES) {
        startOutro();
      }
    }

    function startOutro() {
      outro.active = true;
      outro.elapsed = 0;
      outro.retreatBannerFired = false;
      resetRadio();
      showBanner("WARNING · MULTIPLE CONTACTS INBOUND", 2.6, "danger");
      playTone(46, 1.2, 0.18, "sawtooth");
      cameraShake = Math.min(1.8, cameraShake + 0.45);
      radioSay(
        "command",
        "New contacts! Large formation inbound — twelve plus. Stand by.",
        RADIO_PRIORITY.URGENT,
        "outro-scare"
      );
      radioSay(
        "wingman",
        "Twelve bandits?! {nickname}, we can't take another wave!",
        RADIO_PRIORITY.URGENT,
        "outro-dread"
      );
      radioSay(
        "enemy",
        "This is Bison Lead. Ironback is gone. All flights abort — get out, NOW!",
        RADIO_PRIORITY.URGENT,
        "outro-break"
      );
      radioSay(
        "command",
        "...contacts are turning. All of them. They're running from you, {nickname}.",
        RADIO_PRIORITY.URGENT,
        "outro-retreat"
      );
    }

    function updateOutro(dt) {
      outro.elapsed += dt;
      if (!outro.retreatBannerFired && outro.elapsed >= OUTRO_RETREAT_BANNER_AT) {
        outro.retreatBannerFired = true;
        showBanner("ENEMY FORCE RETREATING", 2.6, "success");
      }
      if (outro.elapsed >= OUTRO_COMPLETE_AT) completeMission(true);
    }

    function completeMission(success) {
""",
    "outro mechanism",
)

replace_once(
    """      resetRadio();
      triggerRadioLine(
        "command",
        success
          ? "All hostiles down. Good work out there — RTB."
          : "We've lost contact. Return to base if you can hear this.",
        RADIO_PRIORITY.CRITICAL,
        "mission-outcome"
      );
      setState(success ? STATE_COMPLETE : STATE_GAMEOVER);
""",
    """      resetRadio();
      if (success) {
        radioSay(
          "command",
          "Sky's clear. Full enemy withdrawal confirmed. Come home, {nickname}.",
          RADIO_PRIORITY.CRITICAL,
          "mission-outcome"
        );
      } else {
        triggerRadioLine(
          "command",
          "We've lost contact. Return to base if you can hear this.",
          RADIO_PRIORITY.CRITICAL,
          "mission-outcome"
        );
      }
      setState(success ? STATE_COMPLETE : STATE_GAMEOVER);
""",
    "mission outcome radio",
)

replace_once(
    """    function setState(nextState) {
""",
    """    function buildDebriefIntelLines(success) {
      const nickname = getPlayerNickname();
      const lines = [];
      if (success) {
        lines.push("Confirm IRONBACK is down. Repeat — IRONBACK is down.");
        lines.push(`${kills} aircraft lost to a single fighter. They call him '${nickname}'.`);
        lines.push(gunKills >= missileKills
          ? "Gun kills. Most of them were GUN kills. Recommend we never come back here."
          : "He never wasted a missile. Every launch, a coffin.");
      } else {
        lines.push("Splash one. The bandit is down. The sky is ours again.");
        lines.push(aceDestroyed
          ? "IRONBACK didn't make it home either. Some trade."
          : "IRONBACK is already asking who's next.");
        if (kills > 0) lines.push(`They lost ${kills} of ours before they took him down.`);
      }
      return lines;
    }

    function setState(nextState) {
""",
    "debrief builder",
)

replace_once(
    """      } else if (nextState === STATE_COMPLETE || nextState === STATE_GAMEOVER) {
        ui.resultTitle.textContent = nextState === STATE_COMPLETE ? "MISSION COMPLETE" : "MISSION FAILED";
        ui.resultMessage.textContent = nextState === STATE_COMPLETE
          ? "全ターゲットの撃墜を確認。制空任務完了。"
          : "機体損傷が限界に到達。再出撃せよ。";
        ui.finalScore.textContent = String(score);
        ui.finalKills.textContent = String(kills);
        ui.finalHighscore.textContent = String(highscore);
        queueMicrotask(() => ui.retryBtn.focus({ preventScroll: true }));
      }
""",
    """      } else if (nextState === STATE_COMPLETE || nextState === STATE_GAMEOVER) {
        const success = nextState === STATE_COMPLETE;
        ui.resultTitle.textContent = success ? "MISSION COMPLETE" : "MISSION FAILED";
        ui.resultMessage.textContent = success
          ? "敵増援は全機撤退。制空権確保。"
          : "機体損傷が限界に到達。再出撃せよ。";
        ui.finalScore.textContent = String(score);
        ui.finalKills.textContent = String(kills);
        ui.finalHighscore.textContent = String(highscore);
        const debriefLines = buildDebriefIntelLines(success);
        ui.debriefIntelLines.replaceChildren(...debriefLines.map((line) => {
          const item = document.createElement("li");
          item.textContent = line;
          return item;
        }));
        window.__game.debrief = debriefLines;
        queueMicrotask(() => ui.retryBtn.focus({ preventScroll: true }));
      }
""",
    "result debrief rendering",
)

replace_once(
    """      hook.killCam.active = killCam.active;
      hook.killCam.timer = killCam.timer;
      hook.killCam.enemyId = killCam.enemyId;
      hook.selectedTargetId = preferredTargetId ?? lock.targetId;
""",
    """      hook.killCam.active = killCam.active;
      hook.killCam.timer = killCam.timer;
      hook.killCam.enemyId = killCam.enemyId;
      hook.outro.active = outro.active;
      hook.outro.elapsed = outro.elapsed;
      hook.outro.retreatBannerFired = outro.retreatBannerFired;
      hook.selectedTargetId = preferredTargetId ?? lock.targetId;
""",
    "outro hook sync",
)

replace_once(
    """      hook.debug.missileKills = missileKills;
      hook.debug.damageTaken = damageTaken;
      hook.audio.lockBeeps = audioSystem.lockBeeps;
""",
    """      hook.debug.missileKills = missileKills;
      hook.debug.damageTaken = damageTaken;
      hook.debug.aceDestroyed = aceDestroyed;
      hook.audio.lockBeeps = audioSystem.lockBeeps;
""",
    "ace hook sync",
)

required_markers = [
    "const OUTRO_COMPLETE_AT = 16.0;",
    "const OUTRO_RETREAT_BANNER_AT = 10.8;",
    "const outro = { active: false, elapsed: 0, retreatBannerFired: false };",
    "let aceDestroyed = false;",
    "if (outro.active) {\n        updateOutro(dt);\n        return;\n      }",
    "function startOutro()",
    "function updateOutro(dt)",
    'showBanner("WARNING · MULTIPLE CONTACTS INBOUND", 2.6, "danger");',
    'showBanner("ENEMY FORCE RETREATING", 2.6, "success");',
    'playTone(46, 1.2, 0.18, "sawtooth");',
    '"outro-scare"',
    '"outro-dread"',
    '"outro-break"',
    '"outro-retreat"',
    "Sky's clear. Full enemy withdrawal confirmed. Come home, {nickname}.",
    "function buildDebriefIntelLines(success)",
    'id="debriefIntel"',
    'id="debriefIntelLines"',
    "INTERCEPTED ENEMY COMMS · POST-ACTION",
    "hook.outro.active = outro.active;",
    "hook.debug.aceDestroyed = aceDestroyed;",
    "forceStartOutro: () => {",
    "skipOutro: () => {",
    "window.__game.debrief = debriefLines;",
    "isAce: Boolean(enemy.isAce)",
]
for marker in required_markers:
    if marker not in text:
        raise SystemExit(f"missing outro marker: {marker}")

if text.count("function startOutro()") != 1 or text.count("function updateOutro(dt)") != 1:
    raise SystemExit("outro functions are missing or duplicated")
if text.count('radioSay(\n        "command",\n        "New contacts!') != 1:
    raise SystemExit("outro opening radio line is missing")

start_outro_block = text[text.index("    function startOutro()") : text.index("    function updateOutro(dt)")]
if start_outro_block.count("radioSay(") != 4:
    raise SystemExit("startOutro must queue exactly four radioSay lines")
if start_outro_block.count("RADIO_PRIORITY.URGENT") != 4:
    raise SystemExit("all outro lines must use URGENT priority")
if "RADIO_PRIORITY.CRITICAL" in start_outro_block:
    raise SystemExit("CRITICAL priority would reorder the outro FIFO")

mission_start = text.index("    function updateMission(dt)")
outro_guard = text.index("      if (outro.active)", mission_start)
living_check = text.index("      const living = enemies.some", mission_start)
if not (mission_start < outro_guard < living_check):
    raise SystemExit("outro early return is not before the living/wave-clear logic")

if "else if (kills >= TOTAL_ENEMIES) {\n        completeMission(true);" in text:
    raise SystemExit("direct mission completion remains instead of startOutro")
if text.count("aceDestroyed = true;") < 2:
    raise SystemExit("aceDestroyed is not set by ace death and the test hook")

for element_id in [
    "score", "highscore", "health", "missiles", "kills", "state", "startBtn", "retryBtn",
    "finalScore", "finalKills", "finalHighscore", "debriefIntel", "debriefIntelLines"
]:
    if text.count(f'id="{element_id}"') != 1:
        raise SystemExit(f"required DOM id {element_id!r} is missing or duplicated")

for stat_id in ["finalScore", "finalKills", "finalHighscore"]:
    if text.count(f'id="{stat_id}"') != 1:
        raise SystemExit(f"numeric result stat {stat_id!r} changed unexpectedly")

if "three@0.180.0" not in text or "@latest" in text:
    raise SystemExit("Three.js version pin changed")
if "console.warn(" in text or "console.error(" in text:
    raise SystemExit("console warning/error call added")

scripts = re.findall(r'<script type="module">(.*?)</script>', text, flags=re.S)
if len(scripts) != 1:
    raise SystemExit(f"expected exactly one module script, found {len(scripts)}")
Path("/tmp/sortie-game.mjs").write_text(scripts[0], encoding="utf-8")
path.write_text(text, encoding="utf-8")
