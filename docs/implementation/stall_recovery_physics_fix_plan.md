# Stall Recovery Physics Fix Plan

Date: 2026-08-28  
Scope: shared player/enemy fixed-wing stall translation, with F-35C at Sera M11 as the primary reproduction case.

## Reported failure

- Sera M11 starts the player at 9,144 m.
- F-35C starts below the shared high-altitude minimum controlled speed.
- Once the world-space stall path activates, holding boost does not rebuild
  actual HUD/kinematic speed and recovery is practically impossible.
- The bug must not be hidden by restoring nose-led arcade translation or by an
  aircraft-specific F-35C exception.

## Measured baseline

At 9,144 m the current shared envelope gives F-35C:

| Quantity | Value |
|---|---:|
| authored cruise / boost | 270 / 540 m/s |
| altitude-adjusted cruise / boost | 213.3 / 426.6 m/s |
| minimum controlled speed | 327.6 m/s |
| recovery threshold | 399.5 m/s |
| high-altitude thrust factor | 0.8845 |

The current pure stall kernel was seeded at the actual mission-launch scalar
of 270 m/s, held at severity 1, commanded to 426.6 m/s, and run for 20 seconds.
It decelerated to 130.9 m/s with a level nose, 138.1 m/s at 20 degrees
nose-down, and 141.9 m/s at 35 degrees nose-down. It never approached the
327.6 m/s control threshold.

The cause is a positive feedback loop:

1. Low actual speed keeps stall severity at one.
2. Severity is reused as separated-flow drag even after AOA is reduced.
3. Severity also cuts engine acceleration from 18 to 3.24 m/s2.
4. Linear drag at 270 m/s removes about 21.6 m/s2 before gravity.
5. Actual speed can therefore never cross the recovery threshold which would
   release severity.

## Aerodynamic contract

The implementation follows these shared rules rather than aircraft IDs:

1. A stall is recovered first by reducing angle of attack (AOA), not by merely
   raising an engine-command speed scalar.
2. High AOA / separated flow raises drag and reduces aerodynamic control.
3. The engine continues to create body-axis thrust while the wing is stalled.
   High altitude reduces available thrust, but the low-speed stall flag itself
   must not disable the engine.
4. Near the high-altitude ceiling, recovery trades altitude for airspeed. A
   level or nose-high aircraft must not regain level flight for free.
5. World gravity and persistent world-space inertia remain authoritative.

Primary references:

- FAA AC 120-109A Change 1, Appendix 1 and high-altitude scenario.
- FAA China Airlines 140 lessons learned, stall recovery technique changes.
- NASA F-18 HARV high-angle-of-attack flight research.
- NASA Glenn inclination effects on drag.

## Implementation design

- Keep `pathLoss = max(lowSpeedSeverity, aoaLoss)` for lift loss, gravity and
  path persistence.
- Add a distinct separated-flow load for drag. Its dominant input is AOA; only
  a small residual comes from lift-loss severity so a low-AOA dive can rebuild
  energy.
- Make engine authority depend on AOA separation, not the low-speed severity
  latch. Pass the shared high-altitude thrust factor into the kernel.
- Preserve the rule that a high-AOA/nose-high deep stall cannot climb under
  power. Once the nose is unloaded into the flight path, body-axis thrust and
  gravity can rebuild speed.
- Initialize an airborne mission at a trim-safe speed when the selected
  aircraft has enough high-altitude margin. Cap that launch speed below the
  aircraft's altitude-adjusted maximum; above its sustainable ceiling no safe
  initialization is fabricated.

## Acceptance gates / TODO

- [x] Read relevant stall/high-altitude Git history and current mission setup.
- [x] Reproduce and measure the current mathematical deadlock.
- [x] Confirm recovery requirements against FAA/NASA primary sources.
- [x] Pure simulation: nose-down + boost crosses the F-35C M11 recovery speed.
- [x] Pure simulation: nose-up deep stall still falls in world gravity.
- [x] Pure simulation: 30/60/120 fps results remain within tolerance.
- [x] Browser: M11/F-35C starts at a sustainable trimmed speed.
- [x] Browser: forced deep stall recovers with nose-down + boost in a bounded
      time and loses altitude while doing so.
- [x] Browser: level/no-boost control does not receive a free recovery.
- [x] Shared regression: existing player and enemy flight-envelope checks pass.
- [x] Record before/after measurements and final tuned constants below.

## Final measurements

### Pure kernel, fixed high-altitude severity

The same F-35C M11 condition used for the baseline was rerun at 30/60/120 fps
with 20 degrees nose-down and the 0.8845 altitude thrust factor.

| Result | Before | After |
|---|---:|---:|
| actual speed after 20 s | 138.1 m/s | 428.1 m/s |
| crossed 399.5 m/s recovery threshold | no | yes |
| 30/60/120 fps final-speed spread | not gated | below 1 m/s |

The fixed-severity test is intentionally harsher than the live game: it never
releases lift loss after crossing the threshold. It proves that the kernel no
longer contains a mathematical energy deadlock.

### Production Chrome, M11/F-35C

| Probe | Measured result |
|---|---:|
| trimmed launch speed | 347.3 m/s |
| minimum controlled speed at launch | 327.6 m/s |
| level/no-boost after 3 s | 255.3 m/s, severity 1.00 |
| nose-down + boost recovery | 6 s |
| speed at completed recovery | 348.6 m/s |
| altitude exchanged for recovery | 357 m |
| HUD versus kinematic speed | exact integer-km/h parity |

The no-power control remains stalled, while the recovery input trades altitude
for speed and fully releases the world-space stall path. This is the intended
behavioral distinction.

### Final shared constants

- world gravity: 9.80665 m/s2
- stall drag rate: 0.08 /s
- low-speed lift-loss share of drag: 0.18
- high-AOA separated-flow share of drag: 0.82
- body-axis engine acceleration cap: 18 m/s2
- engine authority at full AOA separation: 0.18
- mission-launch control margin: 1.06 x minimum controlled speed

### Regression evidence

- `check_stall_translation.mjs`
- `check_high_altitude_envelope.mjs`
- `check_attitude_lift.mjs`
- `check_enemy_flight_envelope.mjs`
- `check_stall_recovery_e2e.mjs`
- `check_sera_m11_preflight.mjs`
- `check_sera_m11_payload.mjs`
- `check_sera_m11_e2e.mjs`
- `check_attitude_lift_e2e.mjs`
- `check_enemy_flight_envelope_e2e.mjs`
