# Sera M07 BLACK CURRENT — implementation plan

**Branch:** `chatgpt/sera-act1-implementation`

**Revision:** 2026-08-13 escort-rescue redesign

## 1. Sources and approved override

- Story baseline: `docs/story_reboot/11_sera_act2.md`
- Region/world key: `docs/story_reboot/v0.12/01_map_mission_matrix.md`
- RAVEN/LARK identity: `docs/story_reboot/v0.14/01_character_route_implementation_plan.md`
- Aircraft timing/difficulty: `docs/story_reboot/v0.17/00_player_aircraft_unlock_schedule_and_mission_difficulty.md`

The earlier player-operated low-pass pickup and rescue/data choice are retired by
the approved playability redesign. M07 is now a pure escort/interception sortie:
the rescue unit performs every pickup while RAVEN protects the operation.

## 2. Final mission contract

### Rescue operation

- SEALIGHT 1 automatically flies to CROWN, CREW B, and CREW C in order.
- At each site it holds for ten seconds and performs the rescue without player
  proximity, altitude, speed, or input checks.
- Survivor sites do not appear as player-facing HUD/radar search markers.
- MERIDIAN reports rescue start and progress at 1/3, 2/3, and 3/3 over radio.
- After 3/3, SEALIGHT leaves by its authored egress route.

### FRIENDS panel

- One green SAR flying-boat silhouette represents SEALIGHT.
- The green bar and numeric value show SEALIGHT HP, not rescue progress.
- Rescue progress is deliberately kept in radio traffic rather than a second
  progress bar.

### Enemy roles

- **Red TGT:** Su-33 x6. They arrive as three flights of two at 0, 30, and 60
  seconds. Every pair uses the rescue-asset hunt path and directly attacks
  SEALIGHT. Their red status means they are the mission-priority kills.
- The Su-33 entry point is 1.5x farther from the battle centre than the original
  map anchor (`[5400, -4800]` instead of `[3600, -3200]`), giving RAVEN time to
  intercept each pair before it reaches the rescue aircraft.
- **White recurring interference:** regular MiG-29A x2 every 34 seconds, capped
  at four live aircraft. They pursue RAVEN and never select SEALIGHT or LARK.
- **White mid-mission reinforcement:** veteran MiG-29A x2, spawned once after
  the first rescue. They also pursue RAVEN.
- **White surface interference:** missile boats x2; optional and rank-neutral.
- All white reinforcement spawning stops after rescue reaches 3/3.

### Completion and failure

- Success requires all three rescues and all six red Su-33s destroyed.
- White contacts never hold completion or enter the required-kill denominator.
- SEALIGHT HP reaching zero produces immediate MISSION FAILED.
- Clearing red TGTs early keeps the sortie running and explicitly orders RAVEN
  to continue the escort.
- Retry resets SEALIGHT to full HP, rescue 0/3, the first destination, and all
  reinforcement timers.

## 3. Acceptance criteria

- campaign UI can select and launch `sera-m07`
- no player pickup/search marker contract remains
- SEALIGHT moves and rescues while the player is elsewhere
- FRIENDS bar reads `SEALIGHT HP` and follows actual damage
- red Su-33s target SEALIGHT in distant 2 + 2 + 2 staggered flights
- recurring and veteran MiG-29As target RAVEN
- radio events report 1/3, 2/3, and 3/3
- mission waits when red TGTs are cleared before rescue completion
- rescue completion stops recurring reinforcements
- SEALIGHT loss fails; Retry restores a clean attempt
- pageerror 0, console error 0, inline payload synchronized

## 4. Verification

- `node tools/check_sera_m07_payload.mjs`
- `node tools/check_sera_m07_e2e.mjs`
- `node tools/sync_inlined_payload.mjs payloads/mission_sera_m07.payload.js --check`
- browser visual pass of the green HP panel, rescue radio cadence, and enemy
  pressure
