# Sera M07 BLACK CURRENT — implementation plan

**Branch:** `codex/sera-m07-black-current`

**Base:** `4202187` (`chatgpt/sera-act1-implementation`)

**Date:** 2026-08-12

## 1. Canonical sources

- Mission story and choice: `docs/story_reboot/11_sera_act2.md`
- Region/world key: `docs/story_reboot/v0.12/01_map_mission_matrix.md`
- RAVEN/LARK post-M06 identities: `docs/story_reboot/v0.14/01_character_route_implementation_plan.md`
- Aircraft availability and difficulty: `docs/story_reboot/v0.17/00_player_aircraft_unlock_schedule_and_mission_difficulty.md`

M06 is not implemented on the base branch. M07 is therefore inserted after the
latest implemented Sera sortie (`sera-m05`) while retaining canonical
`campaignOrder: 7`, `storyNo: 7`, and the post-M06 ROOK 1/ROOK 2 identities.
When M06 lands at `campaignOrder: 6`, campaign sorting and predecessor-based
unlocking will place it between M05 and M07 without rewriting M07.

## 2. Playable vertical slice

### Map

Create `damarSeaStorm`, not an alias of `stormOcean`.

- inherit the proven storm water, fog, ceiling, and lighting
- register `regionId: damar_sea`, west rescue-lane sector, storm-evening variant
- add the Damar navigation platform, shipping-lane lights, three survivor rafts,
  one black data capsule, and two visible SAR helicopters
- add wind-driven rain and intermittent lightning through a small generic
  decorator animation hook owned and disposed with the world

### Mission

- player: RAVEN as ROOK 1; LARK as ROOK 2 in an F/A-18F
- friendly support: SAR flying boat and maritime patrol aircraft
- initial threats: Su-33 fleet CAP and two missile boats
- rescue sites are visible in-world and on friendly HUD/radar markers
- pickup is a low pass within the authored radius and altitude ceiling

### Choice contract

The first recovered object locks the route for this sortie.

- **RESCUE FIRST:** the data capsule is lost; recover all three survivor sites
- **DATA FIRST:** the far survivor beacon is lost; recover the data and the two
  remaining survivor sites; MiG-31 reinforcements launch

Both routes are valid mission clears and persist distinct marks. CROWN survives
in both routes; rescue-first records early recovery, while data-first represents
the delayed-recovery branch required by the character canon.

### Completion and failure

- completion requires the chosen recovery route and all red TGT aircraft
- non-TGT escorts and missile boats never hold completion or rank denominator
- losing every guarded rescue aircraft fails the mission
- leaving the battle area and normal player death retain existing failure paths
- retry restarts the choice cleanly; this single-engagement mission has no
  mid-sortie checkpoint

## 3. Implementation order

1. Add `map_damarSeaStorm.payload.js` and its static/visual gate.
2. Add the generic world-decorator animation hook.
3. Add the M07 recovery runtime and focused debug probes.
4. Add `mission_sera_m07.payload.js` and its contract gate.
5. Inline the map and mission payloads, update the registry snapshot.
6. Run syntax, payload, map, campaign, IFF, registry, and existing Sera gates.
7. Run Chromium E2E for both choice routes, guard failure, retry, completion,
   persistent marks, and page/console errors.
8. Perform a real browser visual/play pass and save evidence.

## 4. Acceptance criteria

- normal campaign UI can select and launch `sera-m07`
- `damarSeaStorm` is visibly a Damar rescue lane, not a renamed stock map
- rain, lightning, beacon lights, rafts, capsule, and SAR silhouettes render
- rescue-first and data-first produce different live encounters and saved marks
- data-first adds the two MiG-31 TGTs and expires exactly one survivor beacon
- mission cannot clear before its recovery route is complete
- all rescue aircraft lost produces MISSION FAILED and Retry resets the route
- success records `m07Route`, survivor count, data state, and CROWN recovery state
- pageerror 0, console error 0, registry loss 0
- existing M01–M05 payload/static gates remain green

## 5. Completion labels

- **Static complete:** source, syntax, registry, and contract gates pass.
- **Test-playable:** both routes plus failure/retry pass in Chromium.
- **Complete:** test-playable plus a human-feel pass for visibility, pickup radius,
  threat pressure, radio cadence, and mission length.

## 6. Completion record — 2026-08-12

- **Static complete:** PASS. Syntax, M07 map/mission contracts, available
  M01–M05 static regressions, campaign shell/economy/records, IFF,
  registry-loss, and inline payload checks are green.
- **Test-playable:** PASS. Chromium launches M07 through the normal campaign
  UI and completes rescue-first, data-first, SAR-loss failure, and Retry with
  zero page or console errors.
- **Visual pass:** PASS. The Damar storm scene was inspected at gameplay
  resolution; the sun disc and arena-centred low cloud banks were removed so
  rain, sea state, SAR silhouettes, and rescue markers remain readable.
- **Implementation status:** COMPLETE. Subjective difficulty and mission-length
  tuning can continue as balance work without changing the route contract.
