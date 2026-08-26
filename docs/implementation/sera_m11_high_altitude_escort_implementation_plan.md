# Sera M11 `FROZEN EYE` — high-altitude escort implementation plan

**Created:** 2026-08-27  
**Branch:** `codex/sera-m11-high-altitude-escort`  
**Base:** `bb8465d685a80a93773d84a4acab3dd13dae223d`

## Source precedence

1. `docs/story_reboot/v0.15/02_m01_m11_m21_mission_correction.md`
2. `docs/story_reboot/v0.15/03_crown_lark_aircraft_canon.md`
3. `docs/story_reboot/v0.17/00_player_aircraft_unlock_schedule_and_mission_difficulty.md`
4. `docs/story_reboot/v0.17/02_f15_mid_tier_f35_unlock_correction.md`
5. `docs/story_reboot/v0.12/01_map_mission_matrix.md`

The old M11 radar/SAM suppression body in `docs/story_reboot/11_sera_act2.md`
is superseded. Its title and map remain usable because the later v0.15 aircraft
canon still names M11 `FROZEN EYE`, and the map ledger still assigns M11 to
`verIceCoast`. No old radar target, shared civilian-radar choice, or M18 radar
consequence is carried into this implementation.

## Goal

Build the eleventh playable Sera mission as the corrected high-altitude attack
formation escort:

1. RAVEN and LARK rendezvous with the Sera strike formation.
2. They defeat the first interceptor pair.
3. They protect the formation from staggered high-speed interceptors.
4. The sortie clears when at least two attack aircraft cross the operation line.

The mission must feel high-altitude through altitude, speed, visibility, and
long interception geometry. It must not add oxygen, engine-management, or
special high-altitude survival UI.

## Authored contract

### World

- region/world: `ver_ice_coast` / `verIceCoast`
- polar morning over a frozen coast, ice shelf, dark leads, fishing harbour,
  weather towers, and distant ice ridges
- radar/weather structures are scenery only, never objectives
- long visibility must use the preset-driven camera/fog distance system so the
  high-altitude horizon does not hard-clip
- no terrain feature may intrude into the 4,800–5,400 m escort corridor

### Friendly formation

- ROOK 1 RAVEN: player-selected aircraft
- ROOK 2 LARK: F/A-18F with 4AAM identity
- HALO 1–3: three Sera B-1B high-altitude attack aircraft
- cruise altitude: approximately 5,100 m
- straight operation-line crossing of roughly 23 km at approximately 128 m/s
- individual HP and enemy-only damage remain owned by the existing guard host
- at least two HALO aircraft must reach the operation line
- losing all aircraft, or making two survivors impossible, fails immediately

The B-1B is selected because its registered description explicitly identifies
it as a Sera bomber and its model is already integrated. Friendly deployment
overrides speed, HP, route, and livery; the enemy balance placeholder is not
silently treated as mission balance.

### Enemy air order

- first contact: MiG-29A x2, red TGT, hunting the attack formation
- high-speed interception 1: MiG-31 x2, red TGT, delayed and staggered
- diversion: MiG-29A x2, white contact, targeting RAVEN rather than HALO
- high-speed interception 2: MiG-31 x2, red TGT, delayed and staggered
- all hunt waves spawn behind or abeam of the formation with enough standoff
  for the player to react
- no Su-35, Su-47, or Su-57 appears

The red/white split expresses mission priority: red interceptors threaten HALO;
the white diversion exists to pull the player away from the escort line.

### Proximity and HUD

- the stock guard row displays the live HALO count
- enemy `hunt: "air"` makes distance from the formation matter naturally
- MERIDIAN warns when RAVEN strays far from every active HALO aircraft
- distance alone does not fail the sortie and does not introduce a new meter
- mission completion is formation progress, not destruction of every red TGT

### Success, failure, result, and rank

- success: `guardState.saved >= 2`
- failure: `saved + still-capable active aircraft < 2`, or the operation window
  expires
- one loss may still clear, but caps the normal guard rank below S
- S requires all three surviving plus normal score/time performance
- persist attack aircraft saved/lost and whether all three crossed the line
- Retry rebuilds all three aircraft, timers, waves, HUD, and map state

## Implementation sequence

### Checkpoint 1 — plan and preflight

- [x] Resolve the old M11 story conflict using v0.15/v0.17 precedence
- [x] Audit friendly transport, guard, hunt-air, payload, and unlock hosts
- [x] Choose the retained title/map and a registered Sera bomber airframe
- [x] Add and pass a read-only M11 preflight gate
- [ ] Commit and push the plan checkpoint

### Checkpoint 2 — Ver Ice Coast

- [ ] Add `payloads/map_verIceCoast.payload.js`
- [ ] Register `verIceCoast`, anchors, preview cameras, and tracked decorator resources
- [ ] Add static and browser map gates, including far-distance/mesh integrity
- [ ] Commit and push the map independently

### Checkpoint 3 — mission payload

- [ ] Add `payloads/mission_sera_m11.payload.js`
- [ ] Deploy HALO 1–3 and LARK through the payload-friendly host
- [ ] Insert after `sera-m10` with `campaignOrder: 11`
- [ ] Add the 6 red / 2 white staggered air order and authored radio
- [ ] Add and pass a static payload gate
- [ ] Commit and push the payload independently

### Checkpoint 4 — escort runtime

- [ ] Add mission-scoped progress, proximity warning, success, and failure logic
- [ ] Persist the M11 escort result
- [ ] Add deterministic debug probes without changing production behaviour
- [ ] Hold generic ACCOMPLISHED until the formation contract resolves
- [ ] Commit and push the runtime independently

### Checkpoint 5 — integration and play

- [ ] Inline both payloads and verify zero page/console errors
- [ ] Cover all-safe success, one-loss success, impossible-survival failure, and Retry
- [ ] Verify M10 clear unlocks M11 in the normal campaign shell
- [ ] Re-run M01–M10 and registry gates
- [ ] Point the single port-8340 server at the verified build
- [ ] Commit and push the completed M11 checkpoint

## Guardrails

- Do not restore the superseded radar suppression mission.
- Do not add oxygen, engine-management, or altitude-survival systems.
- Do not field CROWN after M06.
- Do not replace LARK's F/A-18F + 4AAM identity.
- Do not use Su-35/Su-47/Su-57 as ordinary M11 pressure.
- Do not alter or delete `artifacts/sera-m07-escort-final/` in the main worktree.
- Keep M10's train-choice and mandatory air-cover correction intact.
