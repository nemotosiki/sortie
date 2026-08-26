# Sera M11 `FROZEN EYE` — high-altitude strike rework plan

**Created:** 2026-08-27  
**Branch:** `codex/sera-m11-high-altitude-strike-rework`  
**Base:** `7cd15c90390c8d81ef0e004fe773f8c339ff4836`

## Source precedence

This plan supersedes `sera_m11_high_altitude_escort_implementation_plan.md` at
the user's direct request. The retained canon is the title, Ver Ice Coast, and
ROOK 2 LARK in an F/A-18F with 4AAM. HALO 1–3 are now dedicated high-altitude
electronic-support aircraft, represented by the registered IL-22PP jammer. The
mission objective is replaced: M11 is a cyclic-jamming anti-ground strike under
an electronic-support-loss clock, not a destroy-the-interceptor escort sortie.

## Aerodynamic basis and game ceiling

Primary references:

- NASA Glenn, Earth Atmosphere Equation:
  <https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/earth-atmosphere-equation-english/>
- NASA Glenn, Lift Equation:
  <https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/lift-equation/>
- FAA AC 120-109A, high-altitude stall considerations:
  <https://www.faa.gov/sites/faa.gov/files/2022-11/AC-120-109A%2C%20CHG-1%2C%20Stall%20Prevention%20and%20Recovery%20Training%2C%20January%204%2C%202017.pdf>
- FAA AC 90-89B, service ceiling test definition:
  <https://www.faa.gov/documentlibrary/media/advisory_circular/ac_90-89b.pdf>

NASA's standard-atmosphere table gives density at 30,000 ft as 0.000889
slug/ft3 against 0.002377 at sea level, a density ratio of about 0.374. Since
lift is proportional to density times speed squared, equal lift requires about
`1 / sqrt(0.374) = 1.635` times the true airspeed. FAA guidance also identifies
reduced stall margin, reduced thrust available, and longer recovery at high
altitude. The host HUD reports metres and km/h, so mission altitude remains
authored in metres.

Real combat aircraft can operate above 30,000 ft. Therefore this number is
explicitly a compressed arcade combat envelope, not a claim that 30,000 ft is
their real absolute ceiling:

| Boundary | Altitude | Game meaning |
|---|---:|---|
| thin-air onset | 6,500 m / 21,325 ft | penalties begin smoothly; existing low/medium missions remain unchanged |
| combat/service ceiling | 9,144 m / 30,000 ft | M11 player ingress/retreat band; full density-derived stall-speed penalty, materially reduced manoeuvre/thrust margin |
| soft absolute ceiling | 11,000 m / 36,089 ft | positive climb authority reaches zero and ceiling sink prevents sustained climb; no invisible wall |

At and above the onset, the shared player/enemy fixed-wing envelope must apply:

- ISA troposphere density ratio;
- density-derived true stall-speed multiplier, blended in from 6,500 m and
  fully active by 9,144 m;
- reduced turn/control authority;
- reduced throttle response and attainable speed;
- progressively reduced positive climb authority;
- a soft sink term between 9,144 m and 11,000 m;
- no penalty to descent and no hard altitude clamp.

## Mission contract

- HALO 1–3 fly IL-22PP electronic-support aircraft at 10,500 m, close to the
  11,000 m soft ceiling. RAVEN and LARK enter below them at 9,144 m. HALO's
  altitude is what keeps its MiG-31 attackers in the difficult high-altitude
  band instead of bringing the fight down to the player. Their story and
  gameplay purpose is to jam the enemy base's missile fire-control radars.
- The top-right escort panel displays one green bar for the sum of all three
  aircraft's current HP over their combined maximum HP. Destroyed aircraft
  contribute zero. A three-aircraft formation silhouette makes the aggregate
  meaning explicit.
- The ordinary compact guard row may show percentage integrity; it must not be
  the only indication of HALO health.
- The same panel reports the current electronic-warfare phase and countdown.
- HALO jams for 100 seconds, pauses for an 18-second resynchronisation window,
  then resumes automatically. A 35-second warning gives a low player enough
  time to climb rather than receiving an untelegraphed lethal shot.
- While jamming is active, the base SAM batteries retain their ordinary local
  envelope and ordinary missile. While jamming is paused and a fire-control
  radar survives, those batteries receive a mission-only long-range track,
  quicker fire-control sequence, 75 deg/s turn ceiling, higher PN gain, speed,
  acceleration, and life. This does not alter any other mission or bypass the
  global 75 deg/s missile-turn ceiling.
- The radar-restored threat may engage below 9,000 m. At or above 9,000 m the
  player is outside its mission envelope and an enhanced round loses guidance.
  The resulting loop is: descend and strike while HALO jams, climb before the
  pause, hold above 9,000 m, then descend when jamming resumes.
- Destroying every fire-control radar permanently removes the enhanced phase,
  so target order can replace repeated altitude cycles with an early radar kill.
- The player starts at the 30,000 ft band, below HALO's 10,500 m orbit.
- Four MiG-31s attack HALO in two delayed pairs from approximately 10,650 m.
- MiG-31s are white optional contacts, because destroying them is not the
  mission objective. They retain a high-altitude attack floor and long-range
  missile pressure.
- The vertical separation is greater than the standard missile's 1,200 m lock
  range but within 4AAM's 2,000 m lock range at favourable horizontal geometry.
  A player may force a climb and engage them, but doing so costs speed,
  manoeuvrability, and strike time.
- Red TGTs are the enemy base around the Ver Ice Coast weather-station complex:
  missile fire-control radars, command/base station, communications, power/fuel,
  and SAM nodes. Destroying every red base node completes the mission.
- The remaining MiG-31 air force is a white NON-TGT secondary objective. Those
  kills award bonus score and contribute to the top result, but do not prevent
  base neutralisation from completing the mission.
- HALO does not need to reach a route endpoint. It remains in the battle as the
  mission clock: if two of the three aircraft are lost before the base is
  destroyed, the strike fails.
- A single HALO loss permits completion but caps rank below S. All three safe is
  the S-rank escort condition.

## TODO

### Checkpoint 1 — ceiling model

- [x] Audit current metre/km/h units, speed envelope, stall host, enemy envelope,
  and 4AAM/standard lock ranges.
- [x] Fix the game combat ceiling at 9,144 m and soft absolute ceiling at
  11,000 m.
- [x] Add a pure high-altitude envelope module and deterministic simulation.
- [x] Apply it to both player and enemy fixed-wing flight.
- [x] Expose a browser/debug probe and high-altitude HUD caution.
- [x] Verify no behaviour change at or below 6,500 m.

### Checkpoint 2 — aggregate HALO HP

- [x] Generalise the M07 objective panel without changing M07.
- [x] Draw a three-jammer formation silhouette for M11.
- [x] Sum all three current/max HP values into one green bar and numeric value.
- [x] Verify individual damage, one loss, Retry, and complete/fail transitions.

### Checkpoint 3 — base strike

- [x] Replace red air TGTs with the Ver Ice Coast control-base ground TGTs.
- [x] Make both MiG-31 pairs optional HALO hunters at the high-altitude floor.
- [x] Add the 100 s jam / 18 s radar-online cycle, 35 s warning, 9,000 m safe
  altitude, and radar-first permanent counterplay.
- [x] Apply the radar-online missile boost only to tagged M11 base SAMs and
  preserve the global 75 deg/s ceiling.
- [x] Complete on base destruction; fail when fewer than two HALO aircraft remain.
- [x] Rewrite briefing, radio, epilogue, outcome fields, and rank contract.
- [x] Keep LARK's F/A-18F + 4AAM canon and exclude CROWN.

### Checkpoint 4 — verification and delivery

- [x] Static payload/runtime/plan checks.
- [x] Node syntax and high-altitude simulation checks.
- [x] Browser E2E: unlock, launch, altitude envelope, aggregate HP, base clear,
  one-loss clear, two-loss fail, Retry, and timeout.
- [x] Synchronise the inlined map/mission payloads into `index.html`.
- [x] Inspect Chrome console/page errors and gameplay screenshot.
- [x] Commit/push verified checkpoints and confirm local/remote SHA.
- [x] Keep the single persistent play server on port 8340 pointed at this worktree.
