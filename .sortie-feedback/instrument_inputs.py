from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one anchor, found {count}")
    text = text.replace(old, new, 1)


replace_once(
    '''        particleCapacity: MAX_SPARK_PARTICLES + MAX_DEBRIS_PARTICLES + MAX_SMOKE_PARTICLES,
        lowHealthSmokeActive: false
      },''',
    '''        particleCapacity: MAX_SPARK_PARTICLES + MAX_DEBRIS_PARTICLES + MAX_SMOKE_PARTICLES,
        lowHealthSmokeActive: false,
        keyboardTargetHeld: false,
        keyboardTargetFocus: false,
        keyboardHeldTargetId: null,
        gamepadTargetHeld: false,
        gamepadTargetFocus: false,
        gamepadHeldTargetId: null
      },''',
    "debug input state initialization",
)

replace_once(
    '''      hook.debug.activeEffects = effects.length;
      hook.debug.lowHealthSmokeActive = health < 55 && smokeParticlePool.activeCount > 0;
      hook.audio.lockBeeps = audioSystem.lockBeeps;''',
    '''      hook.debug.activeEffects = effects.length;
      hook.debug.lowHealthSmokeActive = health < 55 && smokeParticlePool.activeCount > 0;
      hook.debug.keyboardTargetHeld = cameraKeyHold.pressed;
      hook.debug.keyboardTargetFocus = cameraKeyHold.focus;
      hook.debug.keyboardHeldTargetId = cameraKeyHold.targetId;
      hook.debug.gamepadTargetHeld = gamepadInput.previousTarget;
      hook.debug.gamepadTargetFocus = gamepadInput.targetFocus;
      hook.debug.gamepadHeldTargetId = gamepadInput.targetId;
      hook.audio.lockBeeps = audioSystem.lockBeeps;''',
    "debug input state synchronization",
)

path.write_text(text, encoding="utf-8")
print("instrumented held-target input state")
