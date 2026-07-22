from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")

replacements = {
    "        range: 900,\n        minRange: 210,": "        range: 1280,\n        minRange: 190,",
    "        launchDot: 0.66": "        launchDot: 0.22",
    "        range: 980,\n        minRange: 240,": "        range: 1380,\n        minRange: 220,",
    "        launchDot: 0.62": "        launchDot: 0.16",
    "        range: 930,\n        minRange: 220,": "        range: 1320,\n        minRange: 200,",
    "        launchDot: 0.64": "        launchDot: 0.2",
    "      if (gameState !== STATE_PLAYING || missionElapsed < MISSION_GRACE_TIME + 1.2) return false;":
        "      if (gameState !== STATE_PLAYING || missionElapsed < MISSION_GRACE_TIME) return false;",
    "        missileCooldown: 5.4 + slot * 1.65 + Math.random() * 1.5,":
        "        missileCooldown: 1.4 + slot * 0.9 + Math.random() * 0.4,",
}

for old, new in replacements.items():
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"enemy missile tuning anchor mismatch ({count}): {old}")
    text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")
print("tuned enemy missile encounter timing")
