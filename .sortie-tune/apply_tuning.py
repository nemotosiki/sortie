from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one anchor, found {count}")
    text = text.replace(old, new, 1)


replace_once(
    '''    const CRUISE_SPEED = 170;
    const BOOST_SPEED = 340;
    const BRAKE_SPEED = 52;
    const STALL_WARNING_SPEED = 94;
    const STALL_ENTRY_SPEED = 82;
    const STALL_DEEP_SPEED = 58;
    const STALL_RECOVERY_SPEED = 112;''',
    '''    const CRUISE_SPEED = 170;
    const BOOST_SPEED = 340;
    // Full brake now settles in a controllable dogfight band instead of forcing a stall.
    // A sustained high-G pull while braking adds induced drag and can still cross the stall threshold.
    const BRAKE_SPEED = 128;
    const BRAKE_HIGH_G_SPEED_DROP = 52;
    const BOOST_SPEED_RESPONSE_K = 0.006;
    const BRAKE_SPEED_RESPONSE_K = 0.018;
    const CRUISE_SPEED_RESPONSE_K = 0.055;
    const STALL_WARNING_SPEED = 96;
    const STALL_ENTRY_SPEED = 84;
    const STALL_DEEP_SPEED = 62;
    const STALL_RECOVERY_SPEED = 114;''',
    "speed and stall constants",
)

replace_once(
    '<div class="controlItem"><strong>SHIFT / CTRL</strong><span>広い速度域で加速 / 減速。低速は小回りが利くが、落としすぎると失速。</span></div>',
    '<div class="controlItem"><strong>SHIFT / CTRL</strong><span>全開減速は安全な格闘戦速度を維持。強く引き起こし続けると誘導抗力で失速。</span></div>',
    "speed help text",
)

replace_once(
    '''      const boost = keys.has("ShiftLeft") || keys.has("ShiftRight") || gamepadInput.boost;
      const brake = keys.has("ControlLeft") || keys.has("ControlRight") || gamepadInput.brake;
      const targetSpeed = boost ? BOOST_SPEED : (brake ? BRAKE_SPEED : CRUISE_SPEED);
      const speedResponse = boost ? 0.004 : (brake ? 0.008 : 0.012);
      playerSpeed = THREE.MathUtils.lerp(playerSpeed, targetSpeed, damping(speedResponse, dt));''',
    '''      const boost = keys.has("ShiftLeft") || keys.has("ShiftRight") || gamepadInput.boost;
      const brake = keys.has("ControlLeft") || keys.has("ControlRight") || gamepadInput.brake;
      const highGBrakeLoad = brake
        ? THREE.MathUtils.smoothstep(Math.abs(pitchInput), 0.55, 1)
        : 0;
      const brakeTargetSpeed = BRAKE_SPEED - BRAKE_HIGH_G_SPEED_DROP * highGBrakeLoad;
      const targetSpeed = boost ? BOOST_SPEED : (brake ? brakeTargetSpeed : CRUISE_SPEED);
      const speedResponse = boost
        ? BOOST_SPEED_RESPONSE_K
        : (brake ? BRAKE_SPEED_RESPONSE_K : CRUISE_SPEED_RESPONSE_K);
      playerSpeed = THREE.MathUtils.lerp(playerSpeed, targetSpeed, damping(speedResponse, dt));''',
    "speed target and response logic",
)

path.write_text(text, encoding="utf-8")

# Guard the intended envelope. Straight full-brake flight must be recoverable and stall-free,
# while a full high-G pull must still be capable of driving the aircraft below stall entry speed.
BRAKE_SPEED = 128
BRAKE_HIGH_G_SPEED_DROP = 52
STALL_WARNING_SPEED = 96
STALL_ENTRY_SPEED = 84
STALL_DEEP_SPEED = 62
STALL_RECOVERY_SPEED = 114

assert BRAKE_SPEED > STALL_RECOVERY_SPEED > STALL_WARNING_SPEED > STALL_ENTRY_SPEED > STALL_DEEP_SPEED
assert BRAKE_SPEED - BRAKE_HIGH_G_SPEED_DROP < STALL_ENTRY_SPEED
print("patched index.html with safe brake band and high-G induced-drag stall")
