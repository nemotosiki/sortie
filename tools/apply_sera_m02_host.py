#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
CHECK = ROOT / "tools" / "check_sera_m02_host.mjs"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


source = INDEX.read_text(encoding="utf-8")

# ---------------------------------------------------------------------------
# Per-sortie M02 state. Kept beside friendlyBase because all of it describes
# blue world objectives and is cleared with the same mission lifecycle.
# ---------------------------------------------------------------------------
source = replace_once(
    source,
    '''    let friendlyBase = null;
    const enemyMarkerElements = new Map();''',
    '''    let friendlyBase = null;
    // M02 can protect more than one blue installation. They are logical HUD
    // contacts anchored over the procedural structures drawn by Amal Plain;
    // only authored strike aircraft can damage them.
    const protectedFacilities = [];
    let protectedFacilityLosses = 0;
    // Ground units carrying `phase` stay out of enemies[] until a wave opens
    // that phase. This is how the TEL column remains undiscovered in M02.
    const pendingGroundUnits = [];
    let activeGroundPhaseId = null;
    let groundPhaseFailureFired = false;
    // Relay from deployWave to spawnEnemy, parallel to spawningTgt/hunt.
    let spawningFacilityIndex = null;
    const enemyMarkerElements = new Map();''',
    "M02 runtime state",
)

# ---------------------------------------------------------------------------
# Wave normalisation: preserve the two M02-only authored fields and add a gate
# whose owner is a ground mark instead of the aircraft that introduced it.
# ---------------------------------------------------------------------------
source = replace_once(
    source,
    '''        gate: entry.gate && entry.gate.mode === "clearOrTimeout"
          ? Object.freeze({
              mode: "clearOrTimeout",
              timeout: Math.max(0, Number(entry.gate.timeout) || 0)
            })
          : null,
        // Any wave may author an absolute [x, z] approach point and an [x, z]''',
    '''        gate: entry.gate && entry.gate.mode === "clearOrTimeout"
          ? Object.freeze({
              mode: "clearOrTimeout",
              timeout: Math.max(0, Number(entry.gate.timeout) || 0)
            })
          : (entry.gate && entry.gate.mode === "groundMarkClear" && entry.gate.mark
            ? Object.freeze({
                mode: "groundMarkClear",
                mark: String(entry.gate.mark)
              })
            : null),
        // A strike wave may name one of mission.protectedFacilities. Null on
        // every existing mission, which keeps the single-friendlyBase path
        // byte-for-byte equivalent.
        facilityIndex: Number.isInteger(entry.facilityIndex) ? entry.facilityIndex : null,
        // A principal wave can reveal a dormant ground phase at the same time
        // it arrives. The string is an authored phase id, never executable.
        activateGroundPhase: typeof entry.activateGroundPhase === "string"
          ? entry.activateGroundPhase
          : null,
        // Any wave may author an absolute [x, z] approach point and an [x, z]''',
    "M02 wave fields",
)

# ---------------------------------------------------------------------------
# Ground contacts need rank-neutral parity with aircraft and delayed spawning.
# ---------------------------------------------------------------------------
source = replace_once(
    source,
    '''    function spawnGroundUnit(typeKey, x, z, headingRad, id, tgt = true, drive = null, mark = null) {''',
    '''    function spawnGroundUnit(
      typeKey, x, z, headingRad, id, tgt = true, drive = null, mark = null, rankNeutral = false
    ) {''',
    "ground spawn signature",
)
source = replace_once(
    source,
    '''        behavior: "static",
        tgt,
        // The optional-objective tag, carried from the mission's groundUnits''',
    '''        behavior: "static",
        tgt,
        // Optional ground escorts obey the same score/rank contract as white
        // aircraft: visible bonus points, zero rank numerator/denominator.
        rankNeutral: Boolean(rankNeutral),
        // The optional-objective tag, carried from the mission's groundUnits''',
    "ground rank-neutral live field",
)

helpers = r'''
    // ---- Multi-facility strike / delayed ground phase contracts ----------
    function spawnProtectedFacilities(mission) {
      protectedFacilities.length = 0;
      const configs = Array.isArray(mission && mission.protectedFacilities)
        ? mission.protectedFacilities
        : [];
      for (let index = 0; index < configs.length; index += 1) {
        const config = configs[index];
        const x = Number(config.x) || 0;
        const z = Number(config.z) || 0;
        const y = surfaceTopAt(x, z) + 8;
        // Amal Plain draws the actual installation. This group owns the blue
        // marker and the damage point without duplicating its geometry.
        const group = new THREE.Group();
        group.position.set(x, y + 38, z);
        scene.add(group);
        const maxHp = Math.max(1, Number(config.maxHealth) || 100);
        const facility = {
          kind: "facility",
          type: "facility",
          label: config.label || `FACILITY ${index + 1}`,
          facilityId: config.id || `facility-${index + 1}`,
          facilityIndex: index,
          x,
          y,
          z,
          hitRadius: Math.max(20, Number(config.hitRadius) || 100),
          group,
          model: null,
          alive: true,
          retired: false,
          vulnerable: false,
          maxHp,
          hp: maxHp,
          hits: 0,
          damageSmokeTimer: 0
        };
        protectedFacilities.push(facility);
        friendlies.push(facility);
      }
    }

    function egressStrikeAircraft(enemy) {
      if (!enemy || !enemy.strikeTarget) return;
      tmpV9.copy(enemy.group.position).sub(enemy.strikeTarget);
      tmpV9.y = 0;
      if (tmpV9.lengthSq() < 1) tmpV9.set(0, 0, 1);
      tmpV9.normalize();
      enemy.strikeTarget.copy(enemy.group.position).addScaledVector(tmpV9, 9000);
    }

    function damageProtectedFacility(facility, forcedDamage = null) {
      if (!facility || !facility.alive) return false;
      const mission = MISSIONS[currentMissionIndex];
      const contract = mission.facilityContract || {};
      // Two aircraft are assigned per site. Even if an authored hitDamage is
      // conservative, two successful runs must be enough to put that site out.
      const damage = forcedDamage === null
        ? Math.max(Number(contract.hitDamage) || 0, facility.maxHp / 2)
        : Math.max(0, Number(forcedDamage) || 0);
      facility.hits += 1;
      facility.hp = Math.max(0, facility.hp - damage);
      baseDamagePenalty += BASE_BOMB_PENALTY;
      score = Math.max(0, score - BASE_BOMB_PENALTY);
      tmpV9.set(facility.x, facility.y + 12, facility.z);
      createExplosion(tmpV9, 0xffa04a, facility.hp <= 0 ? 3.2 : 1.8);
      showBanner(`${facility.label} HIT · -${BASE_BOMB_PENALTY} PTS`, 1.7, "danger");

      if (facility.hp > 0) return false;
      facility.alive = false;
      protectedFacilityLosses += 1;
      showBanner(`${facility.label} LOST`, 2.0, "danger");
      playAuthoredRadio(contract.lossRadio, RADIO_PRIORITY.URGENT);
      return true;
    }

    function updateProtectedFacilityThreat() {
      if (protectedFacilities.length === 0) return false;
      for (const enemy of enemies) {
        if (!enemy.alive || !enemy.strikeTarget || !enemy.strikeTargetRef || enemy.bombRunFired) continue;
        const facility = enemy.strikeTargetRef;
        if (!facility.alive) {
          enemy.bombRunFired = true;
          egressStrikeAircraft(enemy);
          continue;
        }
        const distance = Math.hypot(
          enemy.group.position.x - facility.x,
          enemy.group.position.z - facility.z
        );
        if (distance > facility.hitRadius) continue;
        enemy.bombRunFired = true;
        damageProtectedFacility(facility);
        egressStrikeAircraft(enemy);
      }
      // Losing either or both sites removes S but never fails this mission.
      return false;
    }

    function spawnMissionGroundUnit(unit) {
      const spec = GROUND_TYPES[unit.type];
      const drive = unit.path && spec && spec.mobile
        ? {
            route: groundRoute(unit.path),
            distance: unit.pathOffset || 0,
            speed: unit.speed || spec.mobile.speed
          }
        : null;
      return spawnGroundUnit(
        unit.type,
        unit.x,
        unit.z,
        unit.heading,
        unit.id,
        isTgtEntry(unit),
        drive,
        unit.mark || null,
        Boolean(unit.rankNeutral)
      );
    }

    function activateGroundPhase(phaseId) {
      if (!phaseId) return 0;
      activeGroundPhaseId = phaseId;
      let spawned = 0;
      for (let i = pendingGroundUnits.length - 1; i >= 0; i -= 1) {
        const unit = pendingGroundUnits[i];
        if (unit.phase !== phaseId) continue;
        pendingGroundUnits.splice(i, 1);
        if (spawnMissionGroundUnit(unit) !== null) spawned += 1;
      }
      return spawned;
    }

    function failEscapingGroundTarget(enemy) {
      const mission = MISSIONS[currentMissionIndex];
      const contract = mission.groundPhaseContract || null;
      if (
        groundPhaseFailureFired
        || !contract
        || !contract.failAtRouteEnd
        || !enemy
        || !enemy.alive
        || enemy.mark !== contract.failMark
      ) {
        return false;
      }
      groundPhaseFailureFired = true;
      enemy.speed = 0;
      missionFailureRadioOverride = contract.failureRadio || mission.failureRadio || null;
      if (contract.failBanner) showBanner(contract.failBanner, 2.0, "danger");
      completeMission(false);
      return true;
    }

'''
source = replace_once(
    source,
    '''    // Ground installations belong to the mission rather than to a wave: they
    // are already standing when the player arrives and count toward the same
    // target total, so the sortie only ends once the base is flat too.
    function spawnMissionGround(mission) {''',
    helpers + '''    // Ground installations belong to the mission rather than to a wave: they
    // are already standing when the player arrives and count toward the same
    // target total, so the sortie only ends once the base is flat too.
    function spawnMissionGround(mission) {''',
    "M02 host helpers",
)

source = replace_once(
    source,
    '''      if (mission.groundUnits) {
        for (const unit of mission.groundUnits) {
          const spec = GROUND_TYPES[unit.type];
          // A vehicle with a road gets its route baked here; a vehicle without
          // one, and every installation, spawns exactly the way it always did.
          const drive = unit.path && spec && spec.mobile
            ? {
                route: groundRoute(unit.path),
                distance: unit.pathOffset || 0,
                speed: unit.speed || spec.mobile.speed
              }
            : null;
          spawnGroundUnit(unit.type, unit.x, unit.z, unit.heading, unit.id, isTgtEntry(unit), drive, unit.mark || null);
        }
      }''',
    '''      pendingGroundUnits.length = 0;
      if (mission.groundUnits) {
        const contract = mission.groundPhaseContract || null;
        for (const unit of mission.groundUnits) {
          const dormant = Boolean(
            unit.phase
            && contract
            && unit.phase === contract.id
            && contract.activeInitially === false
          );
          if (dormant) pendingGroundUnits.push(unit);
          else spawnMissionGroundUnit(unit);
        }
        if (contract && contract.activeInitially !== false) activateGroundPhase(contract.id);
      }''',
    "delayed ground spawning",
)

# ---------------------------------------------------------------------------
# Wave deployment relays facility targeting and opens the authored ground phase.
# ---------------------------------------------------------------------------
source = replace_once(
    source,
    '''      spawningHunt = wave.hunt || null;
      // Presets keep their historic id block; an inline wave takes the next''',
    '''      spawningHunt = wave.hunt || null;
      spawningFacilityIndex = Number.isInteger(wave.facilityIndex) ? wave.facilityIndex : null;
      // Presets keep their historic id block; an inline wave takes the next''',
    "facility relay set",
)
source = replace_once(
    source,
    '''      if (!wave.concurrent) {
        activeWaveGate = wave.gate
          ? {
              ids: new Set(Array.from({ length: size }, (_, slot) => idBase + slot + 1)),
              elapsed: 0,
              timeout: wave.gate.timeout
            }
          : null;
      }
      // Designated targets only - the dev hooks below equate this with `kills`''',
    '''      if (!wave.concurrent) {
        activeWaveGate = wave.gate
          ? (wave.gate.mode === "groundMarkClear"
            ? {
                mode: "groundMarkClear",
                mark: wave.gate.mark,
                ids: new Set(),
                elapsed: 0,
                timeout: Infinity
              }
            : {
                mode: "clearOrTimeout",
                ids: new Set(Array.from({ length: size }, (_, slot) => idBase + slot + 1)),
                elapsed: 0,
                timeout: wave.gate.timeout
              })
          : null;
      }
      if (wave.activateGroundPhase) activateGroundPhase(wave.activateGroundPhase);
      // Designated targets only - the dev hooks below equate this with `kills`''',
    "ground mark gate activation",
)
source = replace_once(
    source,
    '''      spawningTgt = true;
      spawningRankNeutral = false;
      spawningHunt = null;
    }

    // Reinforcements on a clock.''',
    '''      spawningTgt = true;
      spawningRankNeutral = false;
      spawningHunt = null;
      spawningFacilityIndex = null;
    }

    // Reinforcements on a clock.''',
    "facility relay clear",
)

# Strike aircraft now resolve either the legacy single base or one protected
# facility. The separate reference lets the threat updater apply health/loss.
source = replace_once(
    source,
    '''        // Set below for bombers when the mission is defending an airfield.
        strikeTarget: null,
        bombRunFired: false,''',
    '''        // Set below for bombers when the mission is defending an airfield
        // or one of several protected facilities.
        strikeTarget: null,
        strikeTargetRef: null,
        bombRunFired: false,''',
    "strike target reference field",
)
source = replace_once(
    source,
    '''      if (STRIKE_AIR_TYPES.has(spec.key) && friendlyBase) {
        const bomber = enemies[enemies.length - 1];
        bomber.strikeTarget = new THREE.Vector3(
          friendlyBase.x + (slot - 0.5) * 120,
          friendlyBase.y,
          friendlyBase.z
        );
      }''',
    '''      const strikeObjective = Number.isInteger(spawningFacilityIndex)
        ? protectedFacilities[spawningFacilityIndex]
        : friendlyBase;
      if (STRIKE_AIR_TYPES.has(spec.key) && strikeObjective && strikeObjective.alive !== false) {
        const bomber = enemies[enemies.length - 1];
        bomber.strikeTargetRef = strikeObjective;
        bomber.strikeTarget = new THREE.Vector3(
          strikeObjective.x + (slot - 0.5) * 120,
          strikeObjective.y,
          strikeObjective.z
        );
      }''',
    "multi-facility strike target assignment",
)

# ---------------------------------------------------------------------------
# Mission lifecycle, checkpoint persistence and rank cap.
# ---------------------------------------------------------------------------
source = replace_once(
    source,
    '''      friendlyBaseWarnedFar: false,
      friendlyBaseWarnedClose: false,
      missionElapsed: 0,''',
    '''      friendlyBaseWarnedFar: false,
      friendlyBaseWarnedClose: false,
      protectedFacilityState: null,
      protectedFacilityLosses: 0,
      activeGroundPhaseId: null,
      missionElapsed: 0,''',
    "checkpoint facility fields",
)
source = replace_once(
    source,
    '''      activeWaveGate = null;
      missionFailureRadioOverride = null;
      // The hunter pattern is deterministic per sortie.''',
    '''      activeWaveGate = null;
      missionFailureRadioOverride = null;
      protectedFacilities.length = 0;
      protectedFacilityLosses = 0;
      pendingGroundUnits.length = 0;
      activeGroundPhaseId = null;
      groundPhaseFailureFired = false;
      spawningFacilityIndex = null;
      // The hunter pattern is deterministic per sortie.''',
    "M02 state reset",
)
source = replace_once(
    source,
    '''      checkpoint.friendlyBaseWarnedFar = Boolean(friendlyBase && friendlyBase.warnedFar);
      checkpoint.friendlyBaseWarnedClose = Boolean(friendlyBase && friendlyBase.warnedClose);
      checkpoint.missionElapsed = missionElapsed;''',
    '''      checkpoint.friendlyBaseWarnedFar = Boolean(friendlyBase && friendlyBase.warnedFar);
      checkpoint.friendlyBaseWarnedClose = Boolean(friendlyBase && friendlyBase.warnedClose);
      checkpoint.protectedFacilityState = protectedFacilities.map((facility) => ({
        hp: facility.hp,
        alive: facility.alive,
        hits: facility.hits
      }));
      checkpoint.protectedFacilityLosses = protectedFacilityLosses;
      checkpoint.activeGroundPhaseId = activeGroundPhaseId;
      checkpoint.missionElapsed = missionElapsed;''',
    "checkpoint facility save",
)
source = replace_once(
    source,
    '''      if (friendlyBase) {
        friendlyBase.hits = at.friendlyBaseHits || 0;
        friendlyBase.breached = Boolean(at.friendlyBaseBreached);
        friendlyBase.warnedFar = Boolean(at.friendlyBaseWarnedFar);
        friendlyBase.warnedClose = Boolean(at.friendlyBaseWarnedClose);
      }
      missionElapsed = at.missionElapsed;''',
    '''      if (friendlyBase) {
        friendlyBase.hits = at.friendlyBaseHits || 0;
        friendlyBase.breached = Boolean(at.friendlyBaseBreached);
        friendlyBase.warnedFar = Boolean(at.friendlyBaseWarnedFar);
        friendlyBase.warnedClose = Boolean(at.friendlyBaseWarnedClose);
      }
      if (Array.isArray(at.protectedFacilityState)) {
        for (let i = 0; i < protectedFacilities.length; i += 1) {
          const saved = at.protectedFacilityState[i];
          if (!saved) continue;
          protectedFacilities[i].hp = Math.max(0, Number(saved.hp) || 0);
          protectedFacilities[i].alive = Boolean(saved.alive);
          protectedFacilities[i].hits = Number(saved.hits) || 0;
        }
      }
      protectedFacilityLosses = Number(at.protectedFacilityLosses) || 0;
      if (at.activeGroundPhaseId) activateGroundPhase(at.activeGroundPhaseId);
      missionElapsed = at.missionElapsed;''',
    "checkpoint facility restore",
)
source = replace_once(
    source,
    '''      if (breachCapped && RANK_ORDER[rank] > RANK_ORDER.A) rank = "A";

      // A sortie that had to be restarted from a checkpoint is not a flawless''',
    '''      if (breachCapped && RANK_ORDER[rank] > RANK_ORDER.A) rank = "A";

      const facilityCap = mission.facilityContract && protectedFacilityLosses > 0
        ? mission.facilityContract.rankCapAfterLoss
        : null;
      if (facilityCap && RANK_ORDER[facilityCap] !== undefined
          && RANK_ORDER[rank] > RANK_ORDER[facilityCap]) {
        rank = facilityCap;
      }

      // A sortie that had to be restarted from a checkpoint is not a flawless''',
    "facility rank cap",
)

# Protected facilities must exist before the first strike wave is spawned.
source = replace_once(
    source,
    '''      // After the mission's own airfield, so a mission that stands one up
      // itself keeps it and the deployment table only ever adds.
      spawnMissionFriendlies(mission);
      if (mission.introRadio) {''',
    '''      // After the mission's own airfield, so a mission that stands one up
      // itself keeps it and the deployment table only ever adds.
      spawnMissionFriendlies(mission);
      spawnProtectedFacilities(mission);
      if (mission.introRadio) {''',
    "protected facility spawn order",
)

# Use the M02 facility threat path only when those facilities are present.
source = replace_once(
    source,
    '''    function updateStrikeThreat() {
      if (!friendlyBase) return false;

      const mission = MISSIONS[currentMissionIndex];''',
    '''    function updateStrikeThreat() {
      if (protectedFacilities.length > 0) return updateProtectedFacilityThreat();
      if (!friendlyBase) return false;

      const mission = MISSIONS[currentMissionIndex];''',
    "facility strike updater dispatch",
)

# The ground-mark gate has no timeout and watches the authored TEL mark.
source = replace_once(
    source,
    '''      if (activeWaveGate) {
        activeWaveGate.elapsed += dt;
        const gateContactAlive = enemies.some(
          (enemy) => enemy.alive && activeWaveGate.ids.has(enemy.id)
        );
        if (gateContactAlive && activeWaveGate.elapsed < activeWaveGate.timeout) {
          waveClearTimer = -1;
          return;
        }
        activeWaveGate = null;
      }''',
    '''      if (activeWaveGate) {
        activeWaveGate.elapsed += dt;
        const gateContactAlive = activeWaveGate.mode === "groundMarkClear"
          ? enemies.some((enemy) => enemy.alive && enemy.mark === activeWaveGate.mark)
          : enemies.some((enemy) => enemy.alive && activeWaveGate.ids.has(enemy.id));
        const gateOpen = activeWaveGate.mode === "groundMarkClear"
          ? gateContactAlive
          : (gateContactAlive && activeWaveGate.elapsed < activeWaveGate.timeout);
        if (gateOpen) {
          waveClearTimer = -1;
          return;
        }
        activeWaveGate = null;
      }''',
    "ground mark gate update",
)

# A marked TEL reaching the route end is an authored terminal objective, while
# every existing mobile ground unit still parks exactly as before.
source = replace_once(
    source,
    '''        } else if (enemy.speed !== 0) {
          // End of the road: v1 parks the vehicle there rather than letting it
          // leave the map, so nothing can escape the sortie unpunished.
          enemy.speed = 0;
        }
      }''',
    '''        } else if (enemy.speed !== 0) {
          if (failEscapingGroundTarget(enemy)) {
            enemy.speed = 0;
            continue;
          }
          // Existing missions still park their vehicles at the last point.
          enemy.speed = 0;
        }
      }''',
    "TEL route-end failure",
)

# ---------------------------------------------------------------------------
# Focused, mission-guarded browser hooks. They exercise production functions;
# none can mutate a stock sortie or a mission other than M02.
# ---------------------------------------------------------------------------
hooks = r'''      seraM02Probe: () => {
        const mission = MISSIONS[currentMissionIndex];
        return {
          state: gameState,
          missionKey: mission ? mission.key : null,
          worldKey: mission ? mission.world : null,
          waveNumber,
          missionWaveIndex,
          outcomePending: outcomePending.active,
          outcomeTimer: outcomePending.timer,
          facilityLosses: protectedFacilityLosses,
          facilities: protectedFacilities.map((facility) => ({
            label: facility.label,
            index: facility.facilityIndex,
            alive: facility.alive,
            hp: facility.hp,
            maxHp: facility.maxHp,
            hits: facility.hits,
            position: [facility.x, facility.y, facility.z]
          })),
          activeGroundPhaseId,
          pendingGroundUnits: pendingGroundUnits.map((unit) => ({
            id: unit.id,
            type: unit.type,
            mark: unit.mark || null,
            phase: unit.phase || null,
            tgt: isTgtEntry(unit),
            rankNeutral: Boolean(unit.rankNeutral)
          })),
          activeGate: activeWaveGate
            ? {
                mode: activeWaveGate.mode || "clearOrTimeout",
                mark: activeWaveGate.mark || null,
                elapsed: activeWaveGate.elapsed,
                timeout: activeWaveGate.timeout,
                ids: [...activeWaveGate.ids]
              }
            : null,
          friendlies: friendlies.map((friendly) => ({
            kind: friendly.kind,
            label: friendly.label,
            type: friendly.type || null,
            radioSpeaker: friendly.radioSpeaker || null,
            alive: friendly.alive,
            position: [friendly.group.position.x, friendly.group.position.y, friendly.group.position.z]
          })),
          enemies: enemies.filter((enemy) => enemy.alive).map((enemy) => ({
            id: enemy.id,
            type: enemy.type,
            tgt: isTgtEntry(enemy),
            rankNeutral: Boolean(enemy.rankNeutral),
            disposition: contactDisposition(enemy),
            ground: Boolean(enemy.ground),
            mark: enemy.mark || null,
            strike: Boolean(enemy.strikeTarget),
            facilityIndex: enemy.strikeTargetRef ? enemy.strikeTargetRef.facilityIndex : null,
            routeDistance: enemy.routeDistance || 0,
            routeEnd: enemy.route && enemy.route.length ? enemy.route[enemy.route.length - 1].d : null,
            position: [enemy.group.position.x, enemy.group.position.y, enemy.group.position.z]
          }))
        };
      },
      forceSeraM02AdvancePhase: () => {
        const mission = MISSIONS[currentMissionIndex];
        if (gameState !== STATE_PLAYING || !mission || mission.key !== "m02") return false;
        const targets = enemies.filter((enemy) => enemy.alive && isTgtEntry(enemy) && !enemy.ground);
        for (const target of targets) damageEnemy(target, target.hp + 1, true, false);
        if (activeWaveGate && activeWaveGate.mode === "clearOrTimeout") {
          activeWaveGate.elapsed = activeWaveGate.timeout;
        }
        updateMission(0.016, 3.0);
        return true;
      },
      forceSeraM02FacilityLoss: (index = 0) => {
        const mission = MISSIONS[currentMissionIndex];
        if (gameState !== STATE_PLAYING || !mission || mission.key !== "m02") return false;
        const facility = protectedFacilities[index];
        if (!facility) return false;
        while (facility.alive) damageProtectedFacility(facility);
        return protectedFacilityLosses > 0;
      },
      forceSeraM02ActivateGround: () => {
        const mission = MISSIONS[currentMissionIndex];
        if (gameState !== STATE_PLAYING || !mission || mission.key !== "m02") return false;
        const id = mission.groundPhaseContract && mission.groundPhaseContract.id;
        return activateGroundPhase(id) > 0 || activeGroundPhaseId === id;
      },
      forceSeraM02EscapeTel: () => {
        const mission = MISSIONS[currentMissionIndex];
        if (gameState !== STATE_PLAYING || !mission || mission.key !== "m02") return false;
        const id = mission.groundPhaseContract && mission.groundPhaseContract.id;
        activateGroundPhase(id);
        const tel = enemies.find((enemy) => enemy.alive && enemy.mark === mission.groundPhaseContract.failMark);
        if (!tel || !tel.route || tel.route.length < 2) return false;
        tel.routeDistance = tel.route[tel.route.length - 1].d;
        tel.speed = Math.max(1, tel.speed || 1);
        placeOnRoute(tel, true);
        return failEscapingGroundTarget(tel);
      },
      forceSeraM02DestroyTels: () => {
        const mission = MISSIONS[currentMissionIndex];
        if (gameState !== STATE_PLAYING || !mission || mission.key !== "m02") return false;
        const id = mission.groundPhaseContract && mission.groundPhaseContract.id;
        activateGroundPhase(id);
        const tels = enemies.filter((enemy) => enemy.alive && enemy.mark === mission.groundPhaseContract.failMark);
        for (const tel of tels) damageEnemy(tel, tel.hp + 1, true, false);
        updateMission(0.016, Math.max(5, Number(mission.groundPhaseContract.holdAfterClear) || 0));
        return outcomePending.active;
      },
      seraM02PerfectRankPreview: () => {
        const mission = MISSIONS[currentMissionIndex];
        if (!mission || mission.key !== "m02") return null;
        const oldKill = rankStats.playerKillValue;
        const oldElapsed = missionElapsed;
        rankStats.playerKillValue = rankStats.spawnedValue;
        missionElapsed = Math.min(missionElapsed, mission.parTime * 0.5);
        const rank = computeMissionRank().rank;
        rankStats.playerKillValue = oldKill;
        missionElapsed = oldElapsed;
        return rank;
      },
      forceSeraM02Complete: () => {
        const mission = MISSIONS[currentMissionIndex];
        if (gameState !== STATE_PLAYING || !mission || mission.key !== "m02") return false;
        for (let pass = 0; pass < 16 && gameState === STATE_PLAYING && !outcomePending.active; pass += 1) {
          if (activeWaveGate && activeWaveGate.mode === "clearOrTimeout") {
            activeWaveGate.elapsed = activeWaveGate.timeout;
          }
          const targets = enemies.filter((enemy) => enemy.alive && isTgtEntry(enemy));
          for (const target of targets) damageEnemy(target, target.hp + 1, true, false);
          updateMission(0.016, 5.0);
        }
        return outcomePending.active;
      },
      forceSeraM02ResolveOutcome: () => {
        const mission = MISSIONS[currentMissionIndex];
        if (!mission || mission.key !== "m02" || !outcomePending.active) return false;
        outcomePending.timer = 0;
        updateOutcomePending(99);
        return gameState === STATE_COMPLETE;
      },
'''
source = replace_once(
    source,
    '''    window.__game = {
      // Focused vertical-slice probes.''',
    '''    window.__game = {
''' + hooks + '''      // Focused vertical-slice probes.''',
    "M02 browser hooks",
)

CHECK.write_text(r'''#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const source = fs.readFileSync(path.join(root, "index.html"), "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`check_sera_m02_host: FAIL - ${message}`);
    process.exit(1);
  }
}

for (const contract of [
  'mode: "groundMarkClear"',
  'facilityIndex: Number.isInteger(entry.facilityIndex)',
  'activateGroundPhase: typeof entry.activateGroundPhase === "string"',
  'const protectedFacilities = [];',
  'function spawnProtectedFacilities(mission)',
  'function updateProtectedFacilityThreat()',
  'function activateGroundPhase(phaseId)',
  'function failEscapingGroundTarget(enemy)',
  'rankNeutral: Boolean(rankNeutral)',
  'if (protectedFacilities.length > 0) return updateProtectedFacilityThreat();',
  'if (wave.activateGroundPhase) activateGroundPhase(wave.activateGroundPhase);',
  'enemy.mark === activeWaveGate.mark',
  'seraM02Probe: () =>',
  'forceSeraM02EscapeTel: () =>',
  'forceSeraM02DestroyTels: () =>'
]) {
  assert(source.includes(contract), `missing host contract: ${contract}`);
}

assert(source.includes('mode: "clearOrTimeout"'), "M01 clear-or-timeout gate was removed");
assert(source.includes('if (protectedFacilities.length > 0) return updateProtectedFacilityThreat();\n      if (!friendlyBase) return false;'),
  "legacy friendlyBase strike path is no longer preserved");
assert(source.includes('const facilityCap = mission.facilityContract && protectedFacilityLosses > 0'),
  "facility-loss rank cap missing");
assert(source.includes('if (failEscapingGroundTarget(enemy))'), "route-end TEL failure is not wired");
assert((source.match(/window\.__game = \{/g) || []).length === 1, "window.__game assignment count changed");

console.log("check_sera_m02_host: PASS");
console.log("  multi-facility strike, delayed ground phase, ground-mark gate and TEL escape failure are wired");
console.log("  M01 clear-or-timeout and single-friendlyBase contracts remain present");
''', encoding="utf-8")

INDEX.write_text(source, encoding="utf-8")
print("apply_sera_m02_host: patched M02 multi-facility, delayed ground, gate, escape and debug contracts")
