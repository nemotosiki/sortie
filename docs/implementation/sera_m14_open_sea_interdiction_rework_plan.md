# Sera M14 BREAKWATER — Open-sea interdiction rework

Status: implementation checkpoint  
Mission: sera-m14 / BREAKWATER  
Map key: naharMudflats (legacy registry key retained; visual map is no longer a mudflat)

## 1. Source-of-truth decisions

The reboot plan remains authoritative about the war, factions, chronology and
strategic result. The old implementation plan was not authoritative about a
shoreline combat loop once play showed that M14 had become a weaker copy of
M04.

Preserve:

- War Day 20 and the Nahar western approach.
- The western/Sera-side objective: prevent an Erem amphibious lodgement.
- A blue, non-lockable hospital ship crossing the combat area.
- LARK in an F/A-18F with anti-ship weapons.
- Completion unlocks F-35C for M15.
- M14 and M34 occupy the same strategic war stage: defend a coast versus
  support a landing.

Revise:

- The battle takes place over pure open ocean before the coast is visible.
- Remove the copied M04 coastline, mudflat settlement and post-beaching armor
  cleanup.
- Mission completion is based on amphibious capacity, not clearing every
  fighter, helicopter and escort.
- Do not state that either side deliberately used the hospital ship as a shield.
  RAVEN knows only that the tracks cross.

## 2. Relation to the eastern campaign

Sera and Erem follow corresponding versions of the same war, but they are
separate campaign worldlines. M14 and M34 therefore share strategic grammar,
not an identical battlefield:

- M14: Sera prevents a landing on the Nahar western approaches.
- M34: Erem supports a landing on another coast.
- The two missions should echo each other in briefing language and strategic
  consequence, while using different geography, force roles and player verbs.
- M14 must not claim moral certainty that the eastern campaign cannot support.

## 3. Objective and IFF contract

Red TGT:

- One LHD: amphibious command and air-assault capacity.
- Four LSTs: heavy landing capacity.
- Total required targets: LHD + four LSTs.

White optional threats:

- One Aegis destroyer, two frigates and four missile boats.
- Six Su-33 fleet-cover aircraft.
- Four Ka-52 nuisance/intercept helicopters.
- All white contacts remain hostile and dangerous, but are rank-neutral and do
  not block mission completion.
- Helicopters are never TGT merely because they are helicopters. A future
  transport helicopter may be TGT only when its physical arrival advances the
  landing objective.

Blue:

- Hospital ship MERCY. It is invulnerable and excluded from enemy/target/lock
  collections.

## 4. Battle flow

1. Northern assault column enters with LHD and two LSTs under a heavy escort.
2. A southern pair of LSTs arrives on a delayed route, forcing target
   prioritisation rather than a single furball.
3. Su-33 CAP protects assault-capacity ships. Ka-52 flights pressure RAVEN at
   low altitude but remain optional.
4. A transparent HUD directive shows unresolved capacity and estimated time for
   the nearest live assault ship to reach the offshore transfer line.
5. Destroying or stopping all five capacity hulls completes the mission even if
   white screens remain.

Consequence:

- Zero crossings: normal rank calculation; S remains possible.
- One crossing caps rank at A and the mission continues.
- A second crossing fails the mission.
- A crossing retires the hull without awarding a kill; it is not a destroyed
  target.

## 5. Compatibility

- Keep world key naharMudflats so mission registry and saved references do not
  break.
- Keep result aliases landingShipsBeached and landedArmorSpawned; write the
  escaped count to the former and zero to the latter.
- Add canonical result fields assaultShipsStopped and landingShipsEscaped.
- Keep the old debug hook name as an alias while adding
  forceSeraM14CrossAssaultShip.

## 6. TODO / verification

- [x] Payload and map structural gate.
- [x] Inline payload synchronization check.
- [x] Browser E2E: zero-cross clear.
- [x] Browser E2E: one-cross clear and A cap.
- [x] Browser E2E: second crossing fails.
- [x] Browser E2E: optional white contacts remain without blocking clear.
- [x] Browser E2E: MERCY stays blue/non-lockable and F-35C unlock remains.
- [x] Visual check: no coast or copied M04 settlement; open-ocean scale reads.
- [x] Campaign/registry regression gates.
