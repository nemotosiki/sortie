# Sera M12-M20 campaign completion plan

**Prepared:** 2026-08-27  
**Branch:** `codex/sera-m11-high-altitude-strike-rework`  
**Status:** implementation queue

## Source-of-truth merge

Use these documents in this order:

1. `docs/story_reboot/CURRENT_PLAN.md`
2. `docs/story_reboot/v0.14/README.md` for characters, ROOK numbering and ARCA
3. `docs/story_reboot/v0.15/README.md` for the M20 GIBOR finale
4. `docs/story_reboot/v0.17/02_f15_mid_tier_f35_unlock_correction.md`
5. `docs/story_reboot/11_sera_act2.md`, `12_sera_act3.md` and
   `13_sera_act4.md` only where the newer character/finale documents do not
   replace them
6. `docs/story_reboot/v0.12/01_map_mission_matrix.md` for geography

The implemented M11 base-strike contract is already newer than the abandoned
high-altitude escort text. M12 starts from the result of that implemented
mission, not from the superseded M11 outline.

## Global contracts

- Mission keys are `sera-m12` through `sera-m20`, inserted in strict numerical
  order after M11.
- Every mission must launch from the normal Sera campaign screen, unlock from
  its predecessor, survive Retry, and write a Sera-namespaced result.
- A mission is not complete merely because a payload object exists. It needs a
  playable objective loop, authored radio/HUD direction, a real result path and
  a browser smoke test.
- Revisited geography keeps the same land, coast, rail, road and facility
  relationships. Variants may change time, weather, damage and force layout.
- White ARCA contacts are optional hostile contacts. They are never red TGT,
  never required for completion and never part of rank numerator/denominator.
- Do not turn the internal hidden-backbone document into dialogue or a visible
  conspiracy. Missions remain understandable as a war between Sera, Erem,
  Kedem and armed-neutral ARCA.
- `GIBOR` is RAVEN's battlefield nickname, not a ROOT permission, rank, weapon
  access or supernatural control system.
- F-35C becomes purchasable after M14 and is first available for M15. F-22 is
  not available during the first campaign clear.
- Su-57 remains rare: one important aircraft in M17/M18/M19, at most two in
  M20. Difficulty comes from mission pressure and combined arms, not elite-jet
  spam.

## Mission queue

### M12 GLASS SWARM

- Geography: `nor_industrial` / `norIndustrialBlackout`, preserving M10's rail,
  river, residential blocks and factory district.
- Loop: destroy the airborne jammer/relay, then defeat the designated UCAV/UAV
  swarm. Two optional power substations feed finite reinforcement waves.
- Choice: destroy both substations to stop later drone replenishment at the
  cost of the shared heating grid, or leave them intact and fight every wave.
- Air opposition: MiG-29A main force, only two Su-35 elite contacts.
- Required systems: blackout map variant, tagged replenishment cancellation,
  jammer HUD false-contact pressure, route result (`gridCut`).

### M13 LIFELINE

- Geography: `hador_islands` / `hadorIslands`.
- Loop: protect three C-17-class transports and a tanker along a long island
  route while designated interceptors attack the formation.
- Choice: enemy AWACS is optional and distant. Chasing it delays reinforcements
  but abandons the transports.
- Show one aggregate four-aircraft HP gauge. Losing one aircraft permits clear
  but caps rank; losing the transport group fails the mission.
- MiG-29A is the main force; MiG-31 is a two-aircraft high/long-range element,
  not a dogfight swarm.

### M14 BREAKWATER

- Geography: `nahar_strait` west-coast mudflat sector; reuse the actual Nahar
  coastline instead of inventing a second coast.
- Loop: stop landing ships at sea, then destroy armor that reached shore.
- Keep the hospital ship blue/neutral and never lock it as TGT.
- The later phase contains Su-33s from the assault group's carrier aviation;
  this is their first proper fleet-origin combat role.
- Completion unlocks F-35C for M15.

### M15 NIGHT OF NUMBERS

- Geography: `migal_city` / `migalCityNight`.
- Loop: break jammer support, then prioritize three bomber lanes aimed at the
  military ROOT, power district and hospital district. Launched cruise weapons
  remain interceptable after bomber destruction.
- ARCA transition: the opening blue ARCA flight retires. A separately spawned
  white ARCA group may attack RAVEN but is optional and rank-neutral. Never
  recolor a live blue object.
- Start the persistent `ravenArcaKills` ledger.

### M16 HOME FLEET

- Geography: `hador_deep_sea` / `hadorDeepSea`.
- Loop: defend CVN EPOCH and escorts, intercept anti-ship missiles, catch two
  SSGNs only during short surfaced firing windows, then stop a low bomber run.
- Aggregate fleet HP is visible. Fleet survival affects later support.
- Su-33 is the regular carrier-air threat here; Su-35/Su-57 spam is forbidden.
- First in-story use of `GIBOR` is praise/nickname only.

### M17 THE LONG APPROACH

- Geography: `migal_outer` / `migalOuterHigh`.
- Loop: large bomber intercept under AWACS/jammer support.
- Red TGTs are the bomber/support main force. HELIX 1 FORGE and HELIX 2 SWIFT
  are white ARCA contacts and may be ignored for a full clear.
- One late elite prototype is allowed. Do not field a four-aircraft Su-57 wave.
- White kills remain rank-neutral and add to `ravenArcaKills`.

### M18 HORN OF HEAVEN

- Geography: `arad_mountains` / `aradMountainsArchive`.
- Loop: canyon ingress, then KEREN component destruction under timed strategic
  fire. Radar, power and gun-barrel attack orders produce different pressure.
- KEREN is a subsystem boss: six barrels, three power towers, two coolers, two
  radars and one command core. The core exposes only after a valid route.
- RAVEN receives no world authority. The story beat is that allies increasingly
  defer to an ace whose reputation has peaked.

### M19 TRUST FALL

- Geography: `migal_outer` sunset variant.
- CROWN returns in an F-15C as an ordinary blue ally beside RAVEN and LARK.
- Main objective: escort the ceasefire/recovery transport and ROOT-distribution
  drones. RAVEN is protecting civilian political work, not operating ROOT.
- Retreating ARCA crosses as white optional contacts. Leaving the escort radius
  and destroying at least two arms `ravenFinalPursuit`; the cumulative threshold
  selects the GIBOR route.

### M20 THE GUARANTOR

- Geography: `migal_core` / `migalCoreDawn`.
- Phase 1 is a conventional final defence fought by blue RAVEN/CROWN/LARK.
- ONE SHEM: complete the final air mission and land; CROWN and LARK remain blue.
- GIBOR: after the normal TGTs are destroyed, show a false
  `MISSION ACCOMPLISHED`, hold silence, then change CROWN F-15C and LARK F-15E
  simultaneously from blue friendlies to red TGTs. No explanatory radio is
  allowed. Only those two aircraft are present in the final duel.
- True completion occurs after both are neutralized, followed by
  `NO HOSTILE CONTACTS` and a short free-flight hold.

## Implementation order and checkpoints

- [x] Shared campaign-state/result helpers needed by M12-M20
- [x] M12 map, mission, route logic, checks, browser clear, commit
- [x] M13 map, escort loop, HP gauge, checks, browser clear, commit
- [x] M14 coastal landing phases, hospital ship safety, F-35 gate, commit
- [x] M15 city defence, persistent white-ARCA ledger, commit
- [x] M16 fleet/SSGN/anti-ship defence, commit
- [ ] M17 long approach and HELIX optional encounter, commit
- [ ] M18 KEREN subsystem boss and route outcomes, commit
- [ ] M19 escort-radius pursuit decision and CROWN return, commit
- [ ] M20 normal/GIBOR routes and CROWN/LARK final contract, commit
- [ ] Full M01-M20 unlock-chain and campaign-select browser regression
- [ ] Inline every new payload and leave the local 8340 server playable

## Per-checkpoint gate

1. `node --check` for every new tool and payload.
2. Dedicated static mission contract check.
3. Headless Chromium start, objective progression, result, Retry and zero
   `pageerror`/console errors.
4. `sync_inlined_payload.mjs ... --check` for each payload block.
5. `git diff --check` and a local commit. Push is not authorized by this task.
