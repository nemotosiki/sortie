# Sera M01-M20 mission-quality and enemy-purpose audit

**Audited:** 2026-08-27  
**Branch:** `codex/sera-m11-high-altitude-strike-rework`  
**Scope:** mission purpose, red/white/blue IFF, ARCA, enemy intent, combat
density and phase volume. Map geometry is outside this pass.

## Source precedence used by this audit

1. `docs/story_reboot/CURRENT_PLAN.md`, including its discarded-plan list.
2. M01-M05: the narrowest v0.16 mission document. In particular,
   `01_m04_mig29_cap_correction.md` overrides the older Su-33 wording.
3. M06: `11_sera_act2.md`; M07-M10: their dedicated implementation plans.
4. M11: `sera_m11_high_altitude_strike_rework_plan.md`, which records the
   user's direct replacement of the old escort outline.
5. M12-M20: `sera_m12_m20_campaign_completion_plan.md` with v0.14 character
   and v0.15 finale rules taking precedence.
6. ARCA and three-colour IFF: v0.12 master plan and v0.14 character bible.

The old checklist state is not treated as implementation evidence. Payloads,
the host and Git history are the implementation evidence.

## Non-negotiable contracts

- Red `TGT` is the mission's required military objective.
- White is an attackable hostile contact that is not required for
  `MISSION ACCOMPLISHED`. A white contact marked `rankNeutral` may award visible
  bonus score but cannot change the rank numerator or denominator.
- Blue is friendly or quasi-friendly. Target selection never recolours it.
- Sera's early ARCA is blue support. Mid/late ARCA is white, hostile-capable,
  optional and rank-neutral. ARCA is never a red TGT.
- `role` and `skill` describe pilot quality. They do not tell the AI why the
  flight is present. The separate authored field is `purpose`.
- A normal interceptor must seek RAVEN or an explicitly assigned friendly.
  It may not orbit indefinitely because RAVEN is more than one kilometre away.
- SCREEN, ESCORT, CAP and TOP COVER may remain near the asset or location they
  protect. They engage a threat entering that area and return when the threat
  leaves; they do not abandon their charge for an arena-wide chase.
- Strike and hunt units continue toward their operational objective. They do
  not switch to RAVEN merely because RAVEN passes nearby.
- Enemy quantity is added in two-aircraft elements with readable delays and
  purposes. Elite-aircraft spam is not a substitute for mission pressure.

## Host-level findings

### Q1 - purpose is missing from the runtime

The v0.16 doctrine specifies SCREEN, CLOSE ESCORT, TOP COVER, CAP, QRA,
RELIEF, PINNING PAIR and INTERCEPTOR. The current wave normalizer retains none
of them. Labels such as `FLEET CAP` are presentation only.

### Q2 - ordinary fighters wait for a one-kilometre merge

The common fixed-wing AI begins pursuit only inside each airframe's
`engageRange` (roughly 0.9-1.1 km) and returns to patrol around 1.4-1.8 km.
Late missions use 10-22 km battle areas, so a fighter can be visible for a long
time without trying to achieve anything.

### Q3 - implicit escorting is not authored escorting

While idle, every light fighter searches the entire live enemy list for the
nearest striker/hunter, otherwise the nearest ship. This can make an unrelated
flight escort whichever package happens to be closest. It has no protected
tag, commit radius or return leash.

### Q4 - white IFF randomly changes target choice

One in three eligible non-TGT aircraft is currently assigned to attack a
wingman by a global ticker. IFF and spawn order are not tactical intent. Flights
that should split between RAVEN, LARK or ARCA already have the mission-authored
`assignedTargets` mechanism; all other target assignment must be purposeful.

### Q5 - CAS labels do not create CAS behaviour

M03 Su-25 and M09 Su-25/Ka-52 are described as attacking port defence or
friendly armour. The current fixed-wing/rotary AI instead orbits or attacks the
player. A mission-object target channel is still required for true air-to-ground
CAS. This is a second checkpoint after the air-purpose rework.

## Mission-by-mission result

| Mission | Plan/data status | Quality gap to fix |
|---|---|---|
| M01 FIRST CONTACT | Correct six-bomber一本道 and four MiG-21 doctrine | SCOUT/RELIEF labels have no screen/relief behaviour |
| M02 SHATTERED MORNING | Correct MiG-23 first step, two Fencer axes, MiG-21 escorts and TEL phase | High interceptor and close escorts use the same generic range switch |
| M03 LOW WATER | Correct helicopter/landing/CAS phases and four MiG-21 | TOP COVER has no altitude leash; Su-25 is not CAS |
| M04 NARROW SEA | Correct later MiG-29A correction, MiG-21 relief, fleet and EPOCH counterstrike | MiG-29A does not own a fleet-CAP radius/return contract |
| M05 PORT OF ASH | Correct MiG-21, two-aircraft MiG-29A QRA and ground phases | QRA/local defence purposes are only labels; Ka-52 does not attack the advance |
| M06 WHITE PASS | Correct SEAD, REEM choice and return intercept | CAP/high cover/rear guard do not have altitude or valley leashes |
| M07 BLACK CURRENT | Strong match: SEALIGHT HP, 2+2+2 Su-33 hunters and recurring player interference | Preserve; express recurring MiG-29 explicitly as INTERCEPT |
| M08 NIGHT AUDIT | Choice, withdrawal and finite reinforcements implemented | CAP/QRA/evac intentions are not represented in common AI |
| M09 IRON HARVEST | Ground command/MLRS/civilian relationship is implemented | Air support does not prosecute its authored ground objective |
| M10 LAST TRAIN | Bridge/precision choice and six-aircraft cover correction implemented | Cover should be explicit INTERCEPT/PINNING rather than generic flight |
| M11 FROZEN EYE | Current user-authored base strike, HALO cycle and target splits implemented | FROZEN CAP/QRA need explicit assignments; `standard` is not a skill key |
| M12 GLASS SWARM | Good finite 27-aircraft escalation and optional grid choice | Drone attack and crewed cover wait for generic merge range |
| M13 LIFELINE | Strong hunt contract, staggered groups and aggregate HP | AWACS must remain SUPPORT; channel boats need an explicit operational role |
| M14 BREAKWATER | Open-ocean capacity interdiction and staged carrier aviation implemented | Red is limited to LHD/LST capacity; white screens must actively protect or intercept |
| M15 NIGHT OF NUMBERS | Three strike lanes, cruise weapons and blue-to-white ARCA transition implemented | Su-35 escort and white ARCA engagement are range-accidental |
| M16 HOME FLEET | Fleet HP, SSGN windows, ASM interception and bomber ship-hunt implemented | Su-33 screen and AWACS support intentions are only labels |
| M17 THE LONG APPROACH | Bomber/support TGTs, rare prototype and white HELIX pair match plan | High cover and HELIX may loiter rather than pressure their intended target |
| M18 HORN OF HEAVEN | KEREN subsystem boss and timed strategic pressure implemented | Optional defenders lack CAP/intercept intent |
| M19 TRUST FALL | Escort hunt, aggregate HP and physical ARCA withdrawal decision implemented | Preserve; explicitly mark withdrawal/support purpose |
| M20 THE GUARANTOR | Force composition, rarity limits and silent GIBOR duel match plan | Capital-strike bombers have no defended city object and therefore no strike run |

## Implementation checkpoints / TODO

### A. Common purpose runtime

- [x] Normalize and retain `purpose`, protected tag, commit radius, return leash
  and optional altitude floor on air waves.
- [x] Default unannotated legacy missions to the old behaviour; require Sera
  payloads to state their intent.
- [x] Make INTERCEPT/QRA/RELIEF/PINNING flights acquire their assigned target
  across the battle area.
- [x] Make SCREEN/ESCORT/CAP/TOP COVER engage around their protected point and
  return when dragged outside the leash.
- [x] Remove spawn-order-based wingman hunting. Use `assignedTargets` only.
- [x] Expose live purpose and protected-point state through a debug probe.

### B. Mission data pass

- [x] Author a purpose for every Sera air wave and dynamic reinforcement.
- [x] Preserve ARCA blue/white transitions and prohibit ARCA TGT.
- [x] Add an actual M20 defended capital point and bomber breach pressure.
- [x] Correct invalid skill names and explicitly mark support/withdrawal assets.

### C. CAS and combined-arms pass

- [x] Add a bounded air-to-ground mission-object target channel.
- [x] Connect M03 Su-25 and Ka-52 to surviving port facilities.
- [x] Connect M05 Ka-52 and M09 Su-25/Ka-52 to the authored ground battle.
- [x] Make aircraft return to their air task when no valid ground objective
  remains rather than orbiting a dead reference.

M05's `friendlyGround` contract had no host consumer. The mission now spawns
the planned four tanks and two IFVs, holds them until the phase-one air-defence
mark is clear, records losses, caps rank from surviving tanks and fails when
all four tanks are lost. This adds combined-arms volume without adding another
hostile fighter wave.

### D. Density and phase pass

- [x] Measure contact composition and effective pressure in M01-M20 after the
  purpose change. The payload gates show no underfilled phase that needs an
  unplanned hostile wave; the previous quietness came from range-gated AI.
- [x] Keep the planned finite relief/QRA elements and elite-aircraft limits.
  No extra Su-57/Su-35 spam was added. M05 instead gains six planned blue
  ground objects and real CAS pressure.
- [x] Review M14's red-air requirement after the landing/CAP behaviour is
  playable. The open-sea rework supersedes the old all-red shoreline contract:
  only the LHD/LST hulls physically advance the landing objective.

M14's Su-33/Ka-52 package is now white, hostile and rank-neutral. Su-33s defend
the assault-capacity tag and Ka-52s intercept RAVEN, so the contacts remain
meaningful without becoming arbitrary clear requirements. Aegis, frigate and
missile-boat screens follow the same rule. Destroying a screen is a tactical
choice that buys access to the red hulls; it is not the mission's strategic end.

### E. Verification

- [x] Static plan/payload gate for purpose, ARCA and white-rank contracts.
- [x] Browser probes for intercept acquisition, escort attachment, CAP
  attachment, capital strike, CAS damage and removal of random wingman hunting.
- [x] Browser manoeuvre probes for CAP perimeter commit, leash return and
  support loiter over 120 forced simulation frames.
- [x] All available mission-specific E2E gates passed after this change set:
  M01-M03 and M07-M20. M04/M06 have payload gates; M04 fleet CAP and M05 joint
  advance/CAS are additionally covered by the new live purpose probe. All
  runs reported zero page/console errors.
- [ ] Manual Chrome play of at least one air defence, one escort, one CAS and
  one ARCA mission on the port-8340 server.
