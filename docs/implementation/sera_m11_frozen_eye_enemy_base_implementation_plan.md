# Sera M11 `FROZEN EYE` — enemy base implementation plan

**Created:** 2026-08-27
**Status:** APPROVED — implementation started
**Branch:** `codex/sera-m11-high-altitude-strike-rework`
**Baseline:** `ad599d670feceb98caeb81206f61ed5eff1ff943`

## Source precedence

1. The user's current instructions to build a visible enemy base, increase
   undesignated defenders, and author later combat waves after planning.
2. The verified M11 cyclic-jamming base-strike implementation on this branch.
3. `sera_m11_high_altitude_strike_rework_plan.md`.
4. `v0.14/01_character_route_implementation_plan.md` for WARDEN 1 `GRANITE`
   and the M15 ARCA relationship transition.
5. `v0.7/00_gameplay_progression_arca.md` and
   `v0.10/00_arca_campaign_relationships.md` for ARCA faction/IFF rules.
6. The older Ver Ice Coast story/map documents, used only for visual motifs such
   as the polar early-warning station, weather towers, ice road, and underground
   storage.

The current mission structure is not reopened by this work. M11 remains a
high-altitude electronic-support strike with ten red ground TGTs. This plan adds
the installation those objectives belong to, a finite layer of optional base
defenders, a staged air response, WARDEN 1's intended M11 appearance, and an
ARCA monitoring beat that does not move ARCA's hostile transition earlier.

## Goal

Turn the weather-station landmark at `(4300, -2500)` into a coherent polar
early-warning and long-range air-defence base that reads at all M11 attack
distances:

- from 9,000–10,600 m, the player can identify the whole base by its road loop,
  dark hardstands, radial defence layout, and large facility blocks;
- during the descent, the command, radar, power, fuel, SAM, and gun zones become
  individually readable;
- at low altitude, the installation has believable access roads, blast walls,
  service buildings, antenna hardware, power distribution, and snow wear;
- every red marker still corresponds to one clear, destroyable piece of the
  base rather than floating over unrelated scenery;
- the player encounters a defended installation rather than ten isolated TGTs
  and only four distant aircraft;
- the battle develops through three finite phases instead of placing every
  reinforcement on the board at mission start.

The base must look like an EWR/SAM installation, not a full airfield. It gets a
service/helipad hardstand, but no runway and no combat-aircraft hangars.

## Current baseline and problems

The current `verIceCoastWorks` decorator has only one `410 x 48 x 250` weather
operations block and four instrument masts near the M11 base anchor. The ten
mission targets are spread across roughly `2.36 km x 1.97 km`, but there are no
roads, defensive pads, perimeter, power network, support buildings, or other
shapes connecting them into one facility.

There are also two integration problems to correct:

1. `BASE CONTROL STATION` is at the exact centre of the existing large weather
   block, so the generic bunker target can be visually buried inside scenery.
2. `POWER PLANT NORTH` and `MISSILE FUEL FARM` both use the generic `fuelTank`
   model. Their labels describe different facilities, but their models do not.

The combat baseline is also too sparse for the authored large-mission density.
It has ten red ground TGTs and two high-altitude MiG-31 pairs, but no optional
ground defenders, no local MiG-29A CAP/QRA, and no named WARDEN response. Most
of the base therefore does not shoot back while HALO jamming is active, and the
second pair is only a delayed copy of the first.

The world-decorator API is visual-only by construction. It cannot write into
`world.mountains`, which owns terrain and aircraft collision. The first base
implementation therefore will not pretend that decorative walls and buildings
are solid flight obstacles. Large target facilities remain weapon-collidable
through their measured ground-unit hitboxes; a general static-building
collision system would be a separate engine change and is outside this pass.

## Mission contract that must remain unchanged

- Ten red TGTs, IDs `21` through `30`.
- Two fire-control radars, one base station, two infrastructure nodes, three
  long-range SAM batteries, and two base-defence guns.
- Existing `m11BaseNode` marks and `missionRole` values.
- Existing target coordinates unless a measured visual overlap is found during
  integration and reviewed as an explicit coordinate correction.
- 60-second jamming phase, 18-second radar-online phase, 35-second warning,
  and 9,000 m sanctuary.
- Radar-online M11 SAM maximum speed of 4,000 km/h and its mission-only guidance
  contract.
- HALO aggregate HP, HALO altitude/orbit, LARK, success/failure, Retry, result
  persistence, and the four-MiG-31 high-altitude secondary condition.
- The first MiG-31 pair remains a HALO-hunting high-altitude threat. The second
  pair may be re-authored as WARDEN 1 `GRANITE` plus one WARDEN wingman without
  increasing the total MiG-31 count.
- Base scenery is not selectable, lockable, score-bearing, or counted in
  `TGT REMAIN`.

The extra Elem defenders are white non-TGT enemies. They are lockable,
damageable, and combat-capable, but never block `ACCOMPLISHED`. Their density may
require par/rank threshold recalibration from simulation; it must not alter the
ten-red-TGT clear condition.

## Layout contract

All positions below are offsets from the existing `weatherStation` anchor.
The installation uses a roughly `2.8 km x 2.6 km` outer footprint. Existing
target positions define the layout; scenery is fitted around them rather than
moving targets to fit a drawing.

| Zone | Approximate offset/footprint | Functional TGTs | Visual treatment |
|---|---|---|---|
| Command/EWR core | centre, about `650 x 620 m` | 23 | hardened control station, buried operations entrance, weather instruments, communications yard, service court |
| North sensor belt | `z +300` to `z +650` | 21, 22 | two separated fire-control radar pads, cable trenches, blast berms, calibration masts |
| South logistics belt | `z -350` to `z -750` | 24, 25 | distinct generator/transformer plant and bunded missile-fuel farm, maintenance sheds, pipe/cable route |
| Outer air-defence ring | radius about `1.1–1.25 km` | 26, 27, 28 | three radial SAM revetments connected to the ring road |
| South close-defence line | `z -750` to `z -950` | 29, 30 | two low AA pits covering the main access side |
| Perimeter/support | outer ring | none | ice access road, checkpoint, snow berm/fence rhythm, two underground-storage portals, service hardstand/helipad |

### Existing target seating

| ID | Current target | Offset | Planned seat |
|---:|---|---:|---|
| 21 | FIRE CONTROL RADAR WEST | `(-680, +420)` | west radar hardstand with open north/east firing and visibility arc |
| 22 | FIRE CONTROL RADAR EAST | `(+670, +360)` | east radar hardstand with open north/west visibility arc |
| 23 | BASE CONTROL STATION | `(0, 0)` | central hardened target; surrounding operations wings stop outside its hit volume |
| 24 | POWER PLANT NORTH | `(-360, -520)` | generator/transformer yard with its own target model |
| 25 | MISSILE FUEL FARM | `(+370, -560)` | bunded tank group with its own target model |
| 26 | LONG RANGE SAM WEST | `(-1180, -180)` | west revetment and radial service spur |
| 27 | LONG RANGE SAM NORTH | `(0, +1120)` | north revetment, visually closing the triangular SAM ring |
| 28 | LONG RANGE SAM EAST | `(+1180, -160)` | east revetment and radial service spur |
| 29 | BASE DEFENCE GUN WEST | `(-720, -850)` | low west AA pit, clear of support sheds |
| 30 | BASE DEFENCE GUN EAST | `(+720, -850)` | low east AA pit, clear of fuel-farm scenery |

Every target seat gets a measured exclusion volume. Decorative geometry must
remain outside the target's weapon hitbox and wreck footprint, with an added
clearance margin, so guns, MSSL, 4AGM, explosions, and target-cycle selection
reach the intended unit without an unrelated mesh visually masking it.

## Enemy-density contract

M11 is treated as a large mission under the campaign density plan. The intended
finite contact count is 26 hostile units, plus two blue ARCA observers:

| Layer | Red TGT | White Elem enemy | Blue ARCA | Total |
|---|---:|---:|---:|---:|
| Existing base objectives | 10 | 0 | 0 | 10 |
| Added perimeter defenders | 0 | 6 | 0 | 6 |
| Staged air response | 0 | 10 | 0 | 10 |
| Third-faction monitoring | 0 | 0 | 2 | 2 |
| **Mission contact total** | **10** | **16** | **2** | **28** |

Only the ten red targets count toward mission completion. The 16 Elem contacts
make attacking and retreating through each jamming window dangerous. The two
ARCA aircraft are not enemies at this point in the campaign.

### Optional perimeter ground defenders

Add six white, undesignated contacts around the red air-defence ring. Proposed
IDs are `31` through `36`; exact coordinates are measured against the final road
and revetment layout before implementation.

| Count | Type/role | Planned region | Behaviour contract |
|---:|---|---|---|
| 2 | `adTank` / mobile SHORAD | outer west and east approaches, about 1.4 km from core | ordinary short-range missiles only; never receive the M11 enhanced-radar profile |
| 4 | `aaGun` / perimeter AAA | two northern and two southern gaps between the red sites | ordinary gun envelope; attack low strike runs but do not become red TGTs |

These units receive a separate `m11PerimeterContact` identity for debug and
radio counting. They do not use `m11BaseNode` or the `baseSam` role, so the
radar-online 4,000 km/h missile override cannot leak to them. Destroying them
awards ordinary combat score but is not required for clear. Rank thresholds are
re-simulated so S does not silently require a full white-ground sweep.

The base also gets approximately 10–14 unarmed visual support props—snow
tractors, utility trucks, radar trailers, generator carts, fuel bowsers, and
cargo containers. These are scenery, not enemies: no HUD marker, hitbox, score,
or target-cycle entry.

## Three-phase air plan

All waves are finite. No enemy respawn loop is added. A fast base kill cancels
any delayed wave that has not yet entered, while a normal attack produces the
full three-phase battle.

### Phase 1 — defended ingress

**Time:** mission start to approximately 70 seconds.

- retain the existing first MiG-31 pair at approximately 10,650 m;
- they continue hunting HALO and force the player to choose between the base
  strike and a difficult 4AAM climb;
- add one local MiG-29A CAP pair at approximately 5,500–6,500 m;
- CAP spawns 7–9 km from the base/player attack line, with a completed patrol
  heading rather than an immediate firing solution;
- CAP prioritises RAVEN/LARK and does not hunt HALO.

The result is four airborne enemies at the opening, split into a high escort
threat and a medium-altitude player screen.

### Phase 2 — base QRA second wave

**Nominal arrival:** approximately 75 seconds, during or just after the first
radar-online cycle.

- MiG-29A x4, all white non-TGT, `line / regular`;
- arrive as two pairs, with the second pair delayed 8–12 seconds;
- first pair enters from the coastward side, second from the inland side;
- spawn distance is 8–10 km from the base and outside both weapon range and a
  finished nose-on firing solution;
- all four prioritise RAVEN, then LARK; they do not attack HALO;
- MERIDIAN warns before the first pair enters, and LARK calls the opposite-side
  second pair so the player is not surprised by a rear spawn.

The second wave is ordinary Elem QRA, not an ace wave and not ARCA. It exists to
make the second descent harder without adding another nearly unavoidable
high-altitude missile source.

### Phase 3 — WARDEN boundary response

**Nominal arrival:** approximately 140–155 seconds or the second jamming pause,
whichever integration method proves deterministic without a global host change.

- replace the current second generic MiG-31 pair with WARDEN 1 `GRANITE` and one
  MiG-31 wingman;
- register a dedicated `granite` ace key; do not reuse the already occupied
  cross-campaign `warden` registry key;
- keep the pair near 10,650 m and preserve the existing total of four MiG-31s;
- the wingman continues to pressure HALO;
- GRANITE prioritises RAVEN when RAVEN climbs into the high-altitude engagement
  band, otherwise screens the HALO attack lane without descending into an
  ordinary low-altitude dogfight;
- GRANITE is a white optional enemy and part of the existing four-MiG-31 S-rank
  secondary condition, never a red TGT;
- his radio treats the polar boundary as a military duty and does not insult or
  dehumanise RAVEN.

The theoretical airborne maximum is ten if the player destroys nothing. The
expected active count is 6–8 because the pairs are separated by more than one
engagement cycle. The lowest guaranteed aircraft at M11 remains able to clear
the ten ground TGTs without destroying optional air contacts.

## ARCA third-faction beat

The reread confirms that ARCA is the planned third faction, but M11 is too early
for hostile ARCA:

- current M11 is `WAR DAY 121`;
- ARCA's explicit blue-to-white relationship transition is M15;
- F-3 is reserved for `WAR DAY 200+` and later HELIX appearances;
- therefore M11 must not spawn a white hostile ARCA flight or any F-3.

M11 instead uses a small blue `ARCA POLAR WATCH` flight to continue the existing
third-faction story without breaking its chronology:

- Typhoon x2, because the ARCA roster defines it as the high-altitude monitoring
  and fast-intervention aircraft;
- approximately 9,600–10,000 m, outside the base core and clear of HALO's
  formation slot;
- `ARCA / SUPPORT`, not lockable by the player, not mission-critical, and not
  persisted;
- PAX states that ARCA is monitoring the polar rescue/weather frequency and
  orders both sides not to interfere with the civilian channel;
- the flight does not attack red base TGTs, HALO hunters, or mission-critical
  units and cannot steal completion;
- when the first radar-online phase begins, PAX withdraws POLAR WATCH rather
  than joining the strike, foreshadowing that ARCA's neutrality has limits.

This is a story/presence beat, not two extra combat allies. Before implementation
the friendly support-flight path must be proven to carry two fighter models on
a deterministic fly-through. If it cannot, the plan falls back to a noncombat
radio/remote-contact presentation rather than spawning them as fake enemies.

## Visual construction

### High-altitude macro layer

Tiny buildings cannot establish a base from 10 km altitude. The first visual
layer therefore uses large, high-contrast ground shapes:

- one broken/octagonal dark service-road loop around the core;
- radial roads to all three SAM sites and the two AA positions;
- concrete or compacted-ice pads beneath every target zone;
- broad snow berms/revetments that draw the triangular air-defence geometry;
- a dark logistics block and a lighter command/sensor block;
- restrained warning stripes and pad markings built from geometry, not text.

These shapes must remain readable through Ver Ice Coast fog without becoming a
solid black rectangle on the snow.

### Mid-distance facility layer

- rebuild the current weather-station block as two low operations wings around
  the central destroyable command target instead of one mesh through it;
- retain weather instrumentation, but visually separate it from the two red
  fire-control radar sites;
- add two service/maintenance sheds, utility buildings, a checkpoint, and a
  communications yard;
- add six measured perimeter seats for the white SHORAD/AAA contacts, visually
  distinct from the larger red long-range sites;
- add generator blocks, transformers, cable trenches, fuel bund walls, pipes,
  and small pump housings in the logistics zone;
- add two low underground-storage portals to satisfy the Ver Ice Coast landmark
  canon without implying a full underground combat level;
- add low perimeter fence/berm sections and sparse polar obstruction lights;
- place the unarmed support vehicle/utility-prop batches in service yards and
  keep them visually distinct from HUD-bearing combat units;
- add snow drift and plough-wear accents around roads and pads.

### Low-distance target layer

Add M11-specific ground types/models where the current generic unit does not
match the objective. Target IDs, roles, balance, and counts remain stable.

| Planned type | Replaces | Model purpose | Balance rule |
|---|---|---|---|
| `m11FireControlRadar` | `radarSite` for IDs 21–22 | fixed radar equipment and support cabin sized to its pad | start from existing radar HP/weapon behaviour; geometry-measured hitbox and wreck |
| `m11ControlStation` | `bunker` for ID 23 | hardened command block that is visibly the base core | preserve bunker HP tier; geometry-measured hitbox and wreck |
| `m11PowerPlant` | `fuelTank` for ID 24 | generator and transformer target, not a fuel cylinder | preserve current mission durability unless play evidence demands a separately reviewed balance change |
| `m11FuelFarm` | `fuelTank` for ID 25 | compact grouped tanks inside a bund | preserve the existing fuel-target durability/chain-damage intent |

The three existing SAMs and two AA guns already describe their function and
remain on their current types. Their pads and revetments are scenery; the
weapon units themselves remain the only red selectable objects in those pads.

## Destruction presentation

- Destruction continues through ground-unit death, explosion, smoke, and wreck
  paths; the surrounding hardstand and road remain as inert infrastructure.
- Each new M11-specific target model gets a wreck footprint measured from its
  visible geometry instead of reusing an unrelated generic crash box.
- No decorative active-state light or rotating radar is allowed to imply that a
  destroyed target is still operating unless a mission-aware update path is
  first proven safe.
- Dynamic destruction of non-target scenery is not part of this pass. It would
  require a new mission-to-decorator state contract and must not be improvised
  inside the static map builder.

## Rendering and ownership budget

The implementation stays inside the existing decorator ownership contract:

- one tracked base root under `verIceCoastWorks`;
- all geometry/material/texture resources registered through `keep*` helpers;
- no direct `scene.add`, custom `dispose`, or mutation of `world.mountains`;
- repeated fences, berm markers, lights, tanks, and utility props use
  `InstancedMesh` or shared/batched geometry;
- prefer zero new textures; allow at most one small generated detail texture if
  geometry alone cannot keep road/pad wear legible;
- target budget: no more than 16 added retained geometries, 12 materials, and
  24 additional base-scenery draw calls in the standard M11 approach view;
- deterministic placement only—no unseeded `Math.random()`.

The performance gate is a maximum 5% median frame-time regression against the
same M11 camera path on the baseline commit. If the base exceeds the budget,
small props are reduced before the high-altitude silhouette is compromised.

## Files expected to change during implementation

- `payloads/map_verIceCoast.payload.js`
  - replace the minimal weather-station cluster with the authored base scenery;
  - retain the fishing harbour, ice shelf, leads, and floe field.
- `payloads/mission_sera_m11.payload.js`
  - register M11-specific ground types/models;
  - change only the four mismatched target type keys listed above;
  - add six white perimeter ground contacts and the finite three-phase air order;
  - register `granite` without colliding with the existing `warden` ace key;
  - add the blue ARCA POLAR WATCH fly-through only after the friendly path is
    proven safe.
- `index.html`
  - synchronise the inlined map/mission payload copies after payload checks pass;
  - no unrelated host refactor.
- `tools/check_map_ver_ice_coast.mjs`
  - add named-layout, resource-ownership, deterministic-placement, and target
    exclusion assertions.
- `tools/check_map_ver_ice_coast_browser.mjs`
  - extend visual and resource-swap coverage.
- M11 static/browser checks
  - assert IDs, roles, positions, red/white/blue counts, wave timing, target
    model registration, hitability, Retry, and unchanged mission state.

## Verification matrix

### Static and geometry gates

- Node syntax and `git diff --check` pass.
- The map and mission payloads register without duplicate keys.
- All ten IDs and their `missionRole` values remain unchanged.
- Perimeter contacts use IDs `31`–`36`, remain white/non-TGT, and never carry
  `m11BaseNode` or `baseSam`.
- The finite air order contains MiG-29A x6 and MiG-31 x4; only the latter four
  participate in the existing high-altitude secondary condition.
- No M11 wave contains F-3 or hostile/white ARCA.
- Target-to-pad exclusion checks pass for hitbox and wreck extents.
- No decoration is accidentally marked enemy, TGT, lockable, or damageable.
- Named base assets are deterministic and remain within the authored footprint.

### Visual gates

Capture and manually inspect at least these mission views, including approach
from more than one compass direction:

1. high: approximately 10,500 m altitude / 10–14 km slant range;
2. attack setup: approximately 9,100 m altitude / 7–9 km slant range;
3. medium: approximately 2,000–3,000 m altitude / 3–5 km slant range;
4. low pass: approximately 250–500 m altitude / under 1.5 km slant range.

Acceptance criteria:

- the base reads as one installation at high altitude;
- each functional zone reads separately during descent;
- red HUD markers sit on their corresponding visible equipment;
- no target is hidden by a decorative wall/building;
- no z-fighting, snow-white washout, hard draw-distance pop, duplicate weather
  station, or visually floating road/pad appears;
- the base remains distinguishable from the western fishing harbour.

### Gameplay regression gates

- MSSL, 4AGM, and gunfire can damage the intended ground targets at appropriate
  geometry/range; focused hits do not appear to pass through the model.
- Target cycling and locking see ten red base nodes plus the authored white Elem
  defenders, but never a visual scenery prop.
- Destroying every red target clears M11; no white ground unit, MiG-29A, ARCA
  observer, or pending cancelled wave blocks completion.
- The second wave arrives as two fair MiG-29A pairs from the authored standoff,
  with warning and no immediate firing solution.
- GRANITE and the fourth MiG-31 preserve the existing optional high-altitude
  secondary count and do not become red.
- ARCA POLAR WATCH is blue/support only, never attacks or steals a red TGT, and
  withdraws without changing success, rank, or persistence.
- Jamming active, warning, radar-online, radar-first shutdown, 9,000 m safety,
  HALO one-loss clear, HALO two-loss failure, rank cap, and Retry remain valid.
- Simulate full, partial, and zero optional kills with F-16 and F/A-18F loadouts;
  all can finish the ten required ground targets without ammunition farming.
- Recalculate par time and rank thresholds from measured 7–11 minute runs rather
  than retaining the current 235-second value by assumption.
- Retry does not duplicate base roots, target models, lights, or resource counts.
- Page errors and unexpected console errors remain zero.

### Resource/performance gates

- Compare renderer geometry, texture, program, draw-call, and median frame-time
  readings on the same baseline/new camera path.
- Swap away from and back to Ver Ice Coast at least four times; retained GPU
  resource counts must return to the same settled values after each cycle.
- The persistent local server remains the single port-8340 instance only after
  the implementation checkpoint is verified.

## TODO and commit boundaries

### Checkpoint 0 — review gate

- [x] Audit the current M11 target layout and Ver Ice Coast scenery.
- [x] Confirm the decorator collision/resource contract.
- [x] Record the base layout, target-preservation rules, and acceptance gates.
- [x] Re-read ARCA chronology, M11 GRANITE placement, and mission-density canon.
- [x] Obtain approval for this plan before changing game code or map geometry.
- [ ] Commit/push the approved plan checkpoint if requested.

### Checkpoint 1 — target identity

- [ ] Add and validate the four M11-specific ground type/model registrations.
- [ ] Measure each model's visible dimensions, hitbox, wreck, HP, and placement
  height from one source of truth.
- [ ] Switch IDs 21–25 only where listed; preserve IDs, roles, labels, marks,
  target count, and mission balance.
- [ ] Run focused target spawn/hit/destruction checks.
- [ ] Commit/push the independently playable target-model checkpoint.

### Checkpoint 2 — high-altitude base silhouette

- [ ] Author the outer road loop, radial roads, hardstands, and revetment macro
  shapes around the current target coordinates.
- [ ] Split/rebuild the central weather-station block around ID 23.
- [ ] Verify readability at 9,100–10,600 m before adding small detail.
- [ ] Keep resource ownership and draw calls inside budget.
- [ ] Commit/push the independently playable macro-layout checkpoint.

### Checkpoint 3 — facility detail

- [ ] Build the sensor, command, logistics, storage, checkpoint, support, and
  perimeter layers with shared/instanced resources.
- [ ] Add snow wear and restrained polar lighting without masking HUD targets.
- [ ] Verify every target exclusion volume and attack lane again.
- [ ] Commit/push the independently playable detail checkpoint.

### Checkpoint 4 — perimeter combat density

- [ ] Add the two white SHORAD and four white AAA contacts at measured seats.
- [ ] Prove that none receives the enhanced M11 radar-online missile profile.
- [ ] Add/batch the unarmed support props without adding HUD contacts.
- [ ] Verify clear, score, rank, target cycling, and Retry with all six alive and
  all six destroyed.
- [ ] Commit/push the independently playable perimeter-density checkpoint.

### Checkpoint 5 — staged air and third-faction story

- [ ] Add the opening MiG-29A CAP pair and the two-pair QRA second wave.
- [ ] Add `granite` and replace the second generic MiG-31 pair with WARDEN.
- [ ] Add advance warning, opposite-side callout, GRANITE dialogue, and finite
  delayed-wave cancellation after base clear.
- [ ] Prototype ARCA POLAR WATCH on the friendly support path and verify the
  blue/noncombat/no-persistence contract; use the radio-only fallback if unsafe.
- [ ] Verify maximum simultaneous aircraft, spawn-to-threat time, HALO targeting,
  no hostile ARCA, and no F-3.
- [ ] Commit/push the independently playable air/story checkpoint.

### Checkpoint 6 — integration and visual QA

- [ ] Extend map and mission static checks.
- [ ] Synchronise payloads into `index.html` only after focused checks pass.
- [ ] Run all four distance/altitude visual gates from multiple directions.
- [ ] Run M11 mission-state, weapons, Retry, page/console, and resource-swap
  regressions.
- [ ] Run 0/partial/full optional-kill routes and measured 7–11 minute rank/time
  simulations with the lowest guaranteed aircraft and F/A-18F.
- [ ] Compare frame time/draw calls against baseline and simplify only the
  least important small props if over budget.
- [ ] Commit/push the verified base checkpoint and confirm local/remote SHA.

## Guardrails

- Do not change the M11 jamming cycle, high-altitude flight envelope, enhanced
  missile balance, HALO logic, ten-target objective, or result fields.
- Keep the total MiG-31 count at four; only the second pair's WARDEN identity and
  player/HALO priority may change under the authored Phase 3 contract.
- Do not add infinite/repeating enemies or spawn a new wave after base clear.
- Do not spawn hostile ARCA before M15 and do not use F-3 in M11.
- Do not count blue ARCA toward enemy density, score, rank, success, or failure.
- Do not make every optional defender mandatory for S; par/rank changes require
  measured simulation and preserve the existing four-MiG-31 secondary meaning.
- Do not convert M11 into an airfield assault or add a runway.
- Do not add generic destructible clutter that bloats `TGT REMAIN`.
- Do not make decorative structures selectable or lockable.
- Do not hide a target inside a scenery building merely to make the base dense.
- Do not add an unproven global building-collision system in this map task.
- Do not import external 3D assets or add a new runtime dependency.
- Do not disturb other Ver Ice Coast landmarks or unrelated mission/map work.
- Do not implement any item in this plan until the review gate is approved.
