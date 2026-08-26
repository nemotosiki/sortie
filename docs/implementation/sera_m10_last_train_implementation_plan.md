# Sera M10 `LAST TRAIN` — implementation plan

**Created:** 2026-08-27  
**Branch:** `codex/sera-m10-last-train`  
**Base:** `fc206875bf6ab7d4e416d4b1415ae99dcfca0d4c`  
**Canonical story:** `docs/story_reboot/11_sera_act2.md` M10  
**Map ledger:** `nor_industrial` / `norIndustrialDusk`

## Goal

Build the tenth playable Sera mission and connect it after `sera-m09` without
changing the authored choice:

- destroy the railway bridge for the quickest stop, at the cost of civilian
  transport and later reconstruction;
- preserve the bridge and disable the moving armoured train precisely, while
  accepting that surviving KEREN power/material cars may escape.

M10 is complete only when both routes can clear, failure and Retry reset all
mission state, the result is persisted, M01-M09 remain registered, and a fresh
profile can reach M10 through the normal Sera campaign shell.

## Existing assets to reuse

- `GROUND_TYPES.trainLoco`, `trainFlak`, `trainCar`
- convoy/rail route normalisation through `railLine`, `pathOffset`, and
  `spawnRailLine`
- `AIRCRAFT_TYPES.su34`, its enemy AI/model/missile profile
- the old `m-train` mission as a mechanics reference only
- payload registration, world decorators, ground-model extensions, fixed radio,
  result snapshots, debug probes, and Playwright mission gates

The old `m-train` story, desert map, force composition, campaign identity, and
six-car all-red target contract must not be copied into Sera M10.

## Authored mission contract

### World

- key: `norIndustrialDusk`
- region: `nor_industrial`
- dusk industrial haze, river, long railway corridor, freight yard, factories,
  workers' housing, chimneys, power substation, and one major railway bridge
- battle route remains inside the authored flat/collision-safe corridor
- map assets use tracked decorator resources and have deterministic QA cameras

### Train

Eight independently damageable cars use one baked route and equal speed:

1. armoured locomotive — red TGT
2. anti-air car — red TGT
3. KEREN power car — white strategic contact
4. material car — white strategic contact
5. anti-air car — red TGT
6. KEREN power car — white strategic contact
7. material car — white strategic contact
8. material car — white strategic contact

The three red cars are the precision route. Destroying them clears M10 while
leaving the bridge intact. White cars are inspectable and destructible but do
not block completion and do not count toward rank.

### Bridge route

- the bridge control/pier is a white strategic contact, not a normal red TGT
- destroying it immediately stops the train and completes the mission
- the bridge route sets a persistent infrastructure-loss mark
- the bridge must stay selectable/lockable as a ground target
- the physical bridge receives a visible destroyed-state change

### Air and ground pressure

- Su-34 x4 arrive as two delayed pairs; they are strike-cover pressure, not the
  primary objective
- MiG-29A x2 arrive as one later pair
- bridge SPAAG x2 are white/rank-neutral contacts
- no Su-35 or Su-57 appears in M10
- delayed flights spawn far enough away to avoid an unfair immediate attack

### Outcomes

Persist facts rather than prose:

- `route`: `bridge` or `precision`
- `bridgeDestroyed`
- `powerCarsEscaped`
- `materialCarsEscaped`
- `trainCarsDestroyed`
- `precisionTargetsDestroyed`
- `civilianRailDisruption`

These facts are intended for M18 KEREN durability/material state and later
civilian reconstruction dialogue.

### Failure and Retry

- leaving the battle area and ordinary player destruction use existing failure
  paths
- if any surviving precision target crosses the Arad transfer line intact, the
  train's critical section has broken through and M10 fails
- Retry must restore the bridge, train, timers, escape counters, fixed radio,
  and result snapshot

## Implementation sequence

### Checkpoint 1 — plan and preflight

- [x] Read the canonical M10 story and map ledger
- [x] Audit train, Su-34, payload, route, result, and E2E host contracts
- [x] Add a read-only M10 preflight gate

### Checkpoint 2 — map

- [x] Add `payloads/map_norIndustrial.payload.js`
- [x] Add deterministic map contract test
- [x] Verify decorator ownership and surface corridor
- [x] Commit map independently

### Checkpoint 3 — mission payload

- [x] Add any M10-specific train/bridge ground types and models through payload
- [x] Add `payloads/mission_sera_m10.payload.js`
- [x] Insert after `sera-m09` with `campaignOrder: 10`
- [x] Add static payload contract test
- [x] Commit payload independently

### Checkpoint 4 — runtime choice

- [x] Add mission-scoped bridge/precision state machine
- [x] Stop/resolve the train when the bridge route is chosen
- [x] Track car escapes and deterministic success/failure
- [x] Add result snapshot and fixed-radio events
- [x] Add host contract test
- [x] Commit runtime independently

### Checkpoint 5 — E2E and integration

- [x] Cover bridge clear, precision clear, escape failure, and Retry
- [x] Verify page errors and console errors are zero
- [x] Inline map and mission payloads for normal startup
- [ ] Verify ten-mission campaign order and M10 unlock
- [ ] Re-run M01-M09 payload and campaign gates
- [ ] Update current-plan/status documents from implementation evidence
- [ ] Commit and push the verified checkpoint

## Guardrails

- Do not modify or delete `artifacts/sera-m07-escort-final/` in the main worktree.
- Do not merge the legacy archive branch.
- Do not make bridge destruction the only viable route.
- Do not require white power/material cars for ACCOMPLISHED.
- Do not award rank for white contacts.
- Do not introduce Tornado F.3, J-10, J-15, or J-20.
- Do not add Su-35/Su-57 as generic M10 pressure.
- Keep every commit independently parseable and its focused check green.
