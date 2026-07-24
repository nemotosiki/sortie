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
    '''    const RADIO_PRIORITY = { NORMAL: 1, URGENT: 2, CRITICAL: 3 };

    const RADIO_QUEUE_MAX = 4;
''',
    '''    const RADIO_PRIORITY = { NORMAL: 1, URGENT: 2, CRITICAL: 3 };

    const KILL_CALLOUTS = [
      "Splash one! Nice shot!",
      "Splash! Good kill!",
      "He's going down!",
      "Another one off the board!",
      "That's a kill! Keep it rolling!"
    ];

    const RADIO_FEAR_STAGES = [
      {
        minKills: 1,
        entry: {
          speaker: "enemy",
          priority: RADIO_PRIORITY.NORMAL,
          text: "Viper Two is down. Hold formation — it's one bandit."
        },
        support: null,
        pool: [
          "Stay on the plan. He got lucky.",
          "All units, tighten up. Check your six.",
          "One loss changes nothing. Press the attack."
        ]
      },
      {
        minKills: 2,
        entry: {
          speaker: "enemy",
          priority: RADIO_PRIORITY.NORMAL,
          text: "That's two of ours gone! Who IS this guy?"
        },
        support: null,
        pool: [
          "Bison Lead, he's not on my scope — where is he?!",
          "We're getting picked apart out here!",
          "Do NOT engage alone. Pair up, now!"
        ]
      },
      {
        minKills: 4,
        entry: {
          speaker: "enemy",
          priority: RADIO_PRIORITY.URGENT,
          text: "He's cutting us to pieces! Break! Break!"
        },
        support: {
          speaker: "wingman",
          priority: RADIO_PRIORITY.NORMAL,
          text: "They're panicking out there. Keep the pressure on!"
        },
        pool: [
          "I can't shake him! I can't shake him!",
          "Mayday! Mayday! Lancer Two going down!",
          "That has to be {nickname}... nobody else flies like that!",
          "Where is our support?! We need support NOW!"
        ]
      },
      {
        minKills: 6,
        entry: {
          speaker: "enemy",
          priority: RADIO_PRIORITY.URGENT,
          text: "All units, disengage! {nickname} owns this sky!"
        },
        support: {
          speaker: "command",
          priority: RADIO_PRIORITY.NORMAL,
          text: "Enemy comms are collapsing. They have a name for you now: {nickname}."
        },
        pool: [
          "I'm not dying out here. I'm pulling out!",
          "Stay away from me... stay AWAY!",
          "You can't outfly {nickname}. Nobody outflies {nickname}."
        ]
      }
    ];

    const RADIO_QUEUE_MAX = 4;
''',
    "fear content tables",
)

replace_once(
    '''    let damageSmokeTimer = 0;
    let currentCameraFov = BASE_CAMERA_FOV;

    const radioQueue = [];
''',
    '''    let damageSmokeTimer = 0;
    let currentCameraFov = BASE_CAMERA_FOV;
    let fearStageReached = 0;
    let gunKills = 0;
    let missileKills = 0;
    let damageTaken = 0;
    let playerNickname = null;

    const radioQueue = [];
''',
    "fear tracking state",
)

replace_once(
    '''        activeEffects: 0,
        particleCapacity: MAX_SPARK_PARTICLES + MAX_DEBRIS_PARTICLES + MAX_SMOKE_PARTICLES,
        lowHealthSmokeActive: false
''',
    '''        activeEffects: 0,
        particleCapacity: MAX_SPARK_PARTICLES + MAX_DEBRIS_PARTICLES + MAX_SMOKE_PARTICLES,
        lowHealthSmokeActive: false,
        fearStageReached: 0,
        nickname: null,
        gunKills: 0,
        missileKills: 0,
        damageTaken: 0
''',
    "debug hook literal",
)

replace_once(
    '''      missileCount = PLAYER_MISSILE_CAPACITY;
      kills = 0;
      waveNumber = 0;
''',
    '''      missileCount = PLAYER_MISSILE_CAPACITY;
      kills = 0;
      fearStageReached = 0;
      gunKills = 0;
      missileKills = 0;
      damageTaken = 0;
      playerNickname = null;
      waveNumber = 0;
''',
    "mission tracking reset",
)

replace_once(
    '''      kills += 1;
      score = kills * KILL_SCORE;
''',
    '''      kills += 1;
      if (missileHit) missileKills += 1;
      else gunKills += 1;
      score = kills * KILL_SCORE;
''',
    "kill weapon tracking",
)

replace_once(
    '''      triggerRadioLine("wingman", "Splash one! Nice shot!", RADIO_PRIORITY.NORMAL, "kill-callout");
''',
    '''      onKillRadio(kills);
''',
    "kill radio dispatch",
)

replace_once(
    '''      health = Math.max(0, previousHealth - safeAmount);
      if (health >= previousHealth) return false;
      if (!bypassCooldown) playerHitCooldown = PLAYER_HIT_COOLDOWN;
''',
    '''      health = Math.max(0, previousHealth - safeAmount);
      if (health >= previousHealth) return false;
      damageTaken += safeAmount;
      if (!bypassCooldown) playerHitCooldown = PLAYER_HIT_COOLDOWN;
''',
    "damage tracking",
)

replace_once(
    r'''    function getOrCreateEnemyMarker(enemy) {
''',
    r'''    function radioSay(speaker, text, priority, id) {
      if (typeof text !== "string") return false;
      const resolvedText = text.replace(/\{nickname\}/g, () => getPlayerNickname());
      return triggerRadioLine(speaker, resolvedText, priority, id);
    }

    function fearStageFor(kills) {
      let stage = 0;
      for (let i = 0; i < RADIO_FEAR_STAGES.length; i += 1) {
        if (kills >= RADIO_FEAR_STAGES[i].minKills) stage = i + 1;
      }
      return stage;
    }

    function radioIsIdle() {
      return !radioState.active && radioQueue.length === 0;
    }

    function getPlayerNickname() {
      if (playerNickname !== null) return playerNickname;

      if (gunKills >= 3 && gunKills >= missileKills) playerNickname = "Gunfighter";
      else if (damageTaken <= 10) playerNickname = "Ghost";
      else if (missionElapsed <= 100) playerNickname = "Reaper";
      else if (damageTaken >= 60) playerNickname = "Butcher";
      else playerNickname = "Demon";

      return playerNickname;
    }

    function onKillRadio(kills) {
      const stage = fearStageFor(kills);
      if (stage > fearStageReached) {
        fearStageReached = stage;
        if (stage === 1) {
          radioSay("wingman", KILL_CALLOUTS[0], RADIO_PRIORITY.NORMAL, "kill-callout-1");
        }
        const stageContent = RADIO_FEAR_STAGES[stage - 1];
        radioSay(
          stageContent.entry.speaker,
          stageContent.entry.text,
          stageContent.entry.priority,
          `fear-stage-${stage}`
        );
        if (stageContent.support) {
          radioSay(
            stageContent.support.speaker,
            stageContent.support.text,
            stageContent.support.priority,
            `fear-stage-${stage}-support`
          );
        }
        return;
      }

      if (!radioIsIdle()) return;
      const stageContent = RADIO_FEAR_STAGES[Math.max(0, stage - 1)];
      if (!stageContent) return;

      if (kills % 2 === 0) {
        const index = Math.floor(kills / 2) % stageContent.pool.length;
        radioSay(
          "enemy",
          stageContent.pool[index],
          RADIO_PRIORITY.NORMAL,
          `fear-s${stage}-p${index}`
        );
      } else {
        const index = (kills - 1) % KILL_CALLOUTS.length;
        radioSay(
          "wingman",
          KILL_CALLOUTS[index],
          RADIO_PRIORITY.NORMAL,
          `kill-callout-${kills}`
        );
      }
    }

    function getOrCreateEnemyMarker(enemy) {
''',
    "fear radio helpers",
)

replace_once(
    '''      hook.debug.activeEffects = effects.length;
      hook.debug.lowHealthSmokeActive = health < 55 && smokeParticlePool.activeCount > 0;
      hook.audio.lockBeeps = audioSystem.lockBeeps;
''',
    '''      hook.debug.activeEffects = effects.length;
      hook.debug.lowHealthSmokeActive = health < 55 && smokeParticlePool.activeCount > 0;
      hook.debug.fearStageReached = fearStageReached;
      hook.debug.nickname = playerNickname;
      hook.debug.gunKills = gunKills;
      hook.debug.missileKills = missileKills;
      hook.debug.damageTaken = damageTaken;
      hook.audio.lockBeeps = audioSystem.lockBeeps;
''',
    "fear debug hook sync",
)

required_markers = [
    "const KILL_CALLOUTS = [",
    "const RADIO_FEAR_STAGES = [",
    "minKills: 1",
    "minKills: 2",
    "minKills: 4",
    "minKills: 6",
    "function radioSay(speaker, text, priority, id)",
    "function fearStageFor(kills)",
    "function radioIsIdle()",
    "function getPlayerNickname()",
    "function onKillRadio(kills)",
    'playerNickname = "Gunfighter"',
    'playerNickname = "Ghost"',
    'playerNickname = "Reaper"',
    'playerNickname = "Butcher"',
    'playerNickname = "Demon"',
    "if (missileHit) missileKills += 1;",
    "else gunKills += 1;",
    "damageTaken += safeAmount;",
    "onKillRadio(kills);",
    "`fear-stage-${stage}`",
    "`fear-stage-${stage}-support`",
    "`fear-s${stage}-p${index}`",
    "`kill-callout-${kills}`",
    "hook.debug.fearStageReached = fearStageReached;",
    "hook.debug.nickname = playerNickname;",
    "hook.debug.gunKills = gunKills;",
    "hook.debug.missileKills = missileKills;",
    "hook.debug.damageTaken = damageTaken;",
    "const TOTAL_ENEMIES = 6;",
]
for marker in required_markers:
    if marker not in text:
        raise SystemExit(f"missing radio content marker: {marker}")

obsolete = 'triggerRadioLine("wingman", "Splash one! Nice shot!", RADIO_PRIORITY.NORMAL, "kill-callout");'
if obsolete in text:
    raise SystemExit("obsolete fixed kill radio call remains")

if text.count("function onKillRadio(kills)") != 1:
    raise SystemExit("onKillRadio definition is missing or duplicated")
if text.count("onKillRadio(kills);") != 1:
    raise SystemExit("onKillRadio call site is missing or duplicated")

reset_match = re.search(r"    function resetRadio\(\) \{(.*?)\n    \}", text, flags=re.S)
if not reset_match or "radioLineReadyAt = {};" not in reset_match.group(1):
    raise SystemExit("resetRadio does not clear the per-line cooldown map")

start_match = re.search(r"    function startMission\(\) \{(.*?)\n    \}", text, flags=re.S)
if not start_match:
    raise SystemExit("startMission not found")
for marker in [
    "fearStageReached = 0;",
    "gunKills = 0;",
    "missileKills = 0;",
    "damageTaken = 0;",
    "playerNickname = null;",
]:
    if marker not in start_match.group(1):
        raise SystemExit(f"startMission does not reset {marker}")

scripts = re.findall(r'<script type="module">(.*?)</script>', text, flags=re.S)
if len(scripts) != 1:
    raise SystemExit(f"expected one module script, found {len(scripts)}")

required_ids = [
    "score", "highscore", "health", "missiles", "kills", "state",
    "startBtn", "retryBtn", "radioPanel", "radioSpeaker", "radioText",
]
for element_id in required_ids:
    if text.count(f'id="{element_id}"') != 1:
        raise SystemExit(f"required DOM id {element_id!r} is missing or duplicated")

if "@latest" in text:
    raise SystemExit("@latest must not be used")
if "console.warn(" in text or "console.error(" in text:
    raise SystemExit("console warning/error call present")

Path("/tmp/sortie-game.mjs").write_text(scripts[0], encoding="utf-8")
path.write_text(text, encoding="utf-8")
