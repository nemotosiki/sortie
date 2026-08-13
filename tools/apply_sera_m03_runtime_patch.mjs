#!/usr/bin/env node
import fs from "node:fs";

const targetUrl = new URL("../index.html", import.meta.url);
let source = fs.readFileSync(targetUrl, "utf8");

function fail(message) {
  throw new Error(`[sera-m03-runtime-patch] ${message}`);
}

function replaceOnce(haystack, needle, replacement, label) {
  const first = haystack.indexOf(needle);
  if (first < 0) fail(`missing ${label}`);
  if (haystack.indexOf(needle, first + needle.length) >= 0) fail(`ambiguous ${label}`);
  return haystack.slice(0, first) + replacement + haystack.slice(first + needle.length);
}

function functionBounds(text, name) {
  const marker = `function ${name}(`;
  const start = text.indexOf(marker);
  if (start < 0) fail(`function not found: ${name}`);
  const open = text.indexOf("{", start + marker.length);
  if (open < 0) fail(`opening brace not found: ${name}`);

  let depth = 0;
  let mode = "code";
  let quote = "";
  let escaped = false;
  let templateExpressionDepth = 0;

  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (mode === "lineComment") {
      if (ch === "\n") mode = "code";
      continue;
    }
    if (mode === "blockComment") {
      if (ch === "*" && next === "/") {
        mode = "code";
        i += 1;
      }
      continue;
    }
    if (mode === "string") {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === quote) {
        mode = "code";
        quote = "";
      }
      continue;
    }
    if (mode === "template") {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === "`" && templateExpressionDepth === 0) {
        mode = "code";
        continue;
      }
      if (ch === "$" && next === "{") {
        templateExpressionDepth += 1;
        i += 1;
        continue;
      }
      if (templateExpressionDepth > 0) {
        if (ch === "{") templateExpressionDepth += 1;
        else if (ch === "}") templateExpressionDepth -= 1;
      }
      continue;
    }

    if (ch === "/" && next === "/") {
      mode = "lineComment";
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      mode = "blockComment";
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"') {
      mode = "string";
      quote = ch;
      continue;
    }
    if (ch === "`") {
      mode = "template";
      templateExpressionDepth = 0;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return { start, end: i + 1 };
    }
  }
  fail(`unterminated function: ${name}`);
}

function patchFunction(name, transform) {
  const bounds = functionBounds(source, name);
  const before = source.slice(bounds.start, bounds.end);
  const after = transform(before);
  if (after === before) fail(`no change made in ${name}`);
  source = source.slice(0, bounds.start) + after + source.slice(bounds.end);
}

const runtimeMarker = "// SERA M03 RUNTIME CONTRACT";
if (source.includes(runtimeMarker)) {
  console.log("[sera-m03-runtime-patch] runtime already installed");
  process.exit(0);
}

const runtimeHelpers = String.raw`
    // SERA M03 RUNTIME CONTRACT
    // Mission definitions opt into this path by supplying landingContract.
    // Every pre-existing mission leaves it null and runs the exact legacy AI.
    const m03State = {
      active: false,
      transportSpawned: 0,
      transportLandings: 0,
      apcSpawned: 0,
      apcDestroyed: 0,
      apcArrivals: 0,
      nextApcId: 6000,
      convertedTransportIds: new Set(),
      firstLandingAt: null,
      landingRadioFired: false,
      arrivalRadioFired: false,
      failed: false
    };

    function m03Mission() {
      const mission = MISSIONS[currentMissionIndex];
      return mission && mission.landingContract ? mission : null;
    }

    function resetM03State(mission) {
      m03State.active = Boolean(mission && mission.landingContract);
      m03State.transportSpawned = 0;
      m03State.transportLandings = 0;
      m03State.apcSpawned = 0;
      m03State.apcDestroyed = 0;
      m03State.apcArrivals = 0;
      m03State.nextApcId = 6000;
      m03State.convertedTransportIds = new Set();
      m03State.firstLandingAt = null;
      m03State.landingRadioFired = false;
      m03State.arrivalRadioFired = false;
      m03State.failed = false;
    }

    function snapshotM03State() {
      if (!m03State.active) return null;
      return {
        active: true,
        transportSpawned: m03State.transportSpawned,
        transportLandings: m03State.transportLandings,
        apcSpawned: m03State.apcSpawned,
        apcDestroyed: m03State.apcDestroyed,
        apcArrivals: m03State.apcArrivals,
        nextApcId: m03State.nextApcId,
        convertedTransportIds: [...m03State.convertedTransportIds],
        firstLandingAt: m03State.firstLandingAt,
        landingRadioFired: m03State.landingRadioFired,
        arrivalRadioFired: m03State.arrivalRadioFired,
        failed: m03State.failed
      };
    }

    function restoreM03State(saved) {
      if (!saved || !m03Mission()) return;
      m03State.active = true;
      m03State.transportSpawned = Math.max(0, Number(saved.transportSpawned) || 0);
      m03State.transportLandings = Math.max(0, Number(saved.transportLandings) || 0);
      m03State.apcSpawned = Math.max(0, Number(saved.apcSpawned) || 0);
      m03State.apcDestroyed = Math.max(0, Number(saved.apcDestroyed) || 0);
      m03State.apcArrivals = Math.max(0, Number(saved.apcArrivals) || 0);
      m03State.nextApcId = Math.max(6000, Number(saved.nextApcId) || 6000);
      m03State.convertedTransportIds = new Set(saved.convertedTransportIds || []);
      m03State.firstLandingAt = Number.isFinite(saved.firstLandingAt) ? saved.firstLandingAt : null;
      m03State.landingRadioFired = Boolean(saved.landingRadioFired);
      m03State.arrivalRadioFired = Boolean(saved.arrivalRadioFired);
      m03State.failed = Boolean(saved.failed);
    }

    function m03CommandFacility(mission = m03Mission()) {
      if (!mission) return null;
      const id = mission.landingContract.commandFacilityId;
      return protectedFacilities.find((facility) => facility.facilityId === id) || null;
    }

    function m03DefenseFacilities(mission = m03Mission()) {
      if (!mission || !mission.m03RankContract) return [];
      const ids = new Set(mission.m03RankContract.defenseFacilityIds || []);
      return protectedFacilities.filter((facility) => ids.has(facility.facilityId));
    }

    function createM03LandingState(enemy) {
      const mission = m03Mission();
      if (!mission || !m03State.active || enemy.type !== mission.landingContract.transportType) return null;
      const contract = mission.landingContract;
      const lzs = Array.isArray(contract.lzs) ? contract.lzs : [];
      if (lzs.length === 0) return null;
      const lzIndex = m03State.transportSpawned % lzs.length;
      const lz = lzs[lzIndex];
      m03State.transportSpawned += 1;
      const route = (Array.isArray(lz.route) ? lz.route : []).map((point) => ({
        x: Number(point[0]) || 0,
        z: Number(point[1]) || 0,
        y: Number.isFinite(Number(point[2])) ? Number(point[2]) : Number(contract.touchdownY) || 34
      }));
      if (route.length === 0) {
        route.push({
          x: Number(lz.x) || enemy.group.position.x,
          z: Number(lz.z) || enemy.group.position.z,
          y: Number(contract.touchdownY) || 34
        });
      }
      return {
        state: "APPROACH",
        lzIndex,
        lzId: lz.id || String(lzIndex + 1),
        route,
        routeIndex: 0,
        timer: 0,
        unloaded: false
      };
    }

    function rotateM03TransportToward(enemy, target, dt) {
      const dx = target.x - enemy.group.position.x;
      const dz = target.z - enemy.group.position.z;
      if (Math.abs(dx) + Math.abs(dz) < 0.01) return;
      const desired = Math.atan2(-dx, -dz);
      let delta = desired - enemy.baseHeading;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      const step = enemy.spec.turnRate * enemy.roleTurnScale * dt;
      enemy.baseHeading += THREE.MathUtils.clamp(delta, -step, step);
      enemy.group.rotation.y = enemy.baseHeading;
    }

    function spinM03TransportRotors(enemy, dt, speedFraction = 0) {
      const rotors = enemy.model && enemy.model.rotors;
      if (!rotors) return;
      const rate = enemy.spec.rotorSpin * (1 + speedFraction * 0.12);
      for (let i = 0; i < rotors.length; i += 1) rotors[i].rotation.y += rate * dt;
    }

    function spawnM03Apc(lz, slot, contract) {
      const path = Array.isArray(lz.apcPath) ? lz.apcPath : [];
      if (path.length < 2) return null;
      const route = groundRoute(path);
      const id = m03State.nextApcId;
      m03State.nextApcId += 1;
      const speed = Math.max(1, Number(contract.apcSpeed) || 18) + slot * 1.25;
      const spawnedId = spawnGroundUnit(
        contract.apcType,
        Number(lz.x) || path[0][0],
        Number(lz.z) || path[0][1],
        0,
        id,
        true,
        { route, distance: slot * 14, speed },
        contract.apcMark || "m03Apc",
        false
      );
      if (spawnedId === null) return null;
      const apc = enemies.find((enemy) => enemy.id === spawnedId);
      if (!apc) return null;
      apc.label = contract.apcLabel || apc.label;
      apc.shortName = contract.apcLabel || apc.shortName;
      apc.m03Apc = true;
      apc.m03LzId = lz.id || null;
      apc.m03Arrived = false;
      m03State.apcSpawned += 1;
      return apc;
    }

    function completeM03Unload(enemy) {
      const mission = m03Mission();
      const landing = enemy && enemy.m03Landing;
      if (!mission || !landing || landing.unloaded || !enemy.alive) return false;
      if (m03State.convertedTransportIds.has(enemy.id)) return false;
      const contract = mission.landingContract;
      const lz = contract.lzs[landing.lzIndex];
      if (!lz) return false;

      landing.unloaded = true;
      landing.state = "DONE";
      m03State.convertedTransportIds.add(enemy.id);
      m03State.transportLandings += 1;
      if (m03State.firstLandingAt === null) m03State.firstLandingAt = missionElapsed;

      // The air target was not destroyed, but it was resolved. Remove its rank
      // denominator before the replacement ground targets register themselves.
      rankStats.spawnedValue = Math.max(0, rankStats.spawnedValue - contactRankValue(enemy));
      if (isTgtEntry(enemy)) kills += 1;

      enemy.alive = false;
      enemy.hitbox.visible = false;
      enemy.group.visible = false;
      enemy.deadTimer = 0;
      enemy.speed = 0;

      const count = Math.max(1, Number(contract.apcPerTransport) || 2);
      for (let slot = 0; slot < count; slot += 1) spawnM03Apc(lz, slot, contract);

      showBanner("LANDING COMPLETE · GROUND TGT x" + count, 1.8, "danger");
      if (!m03State.landingRadioFired) {
        m03State.landingRadioFired = true;
        playAuthoredRadio(contract.landingRadio, RADIO_PRIORITY.URGENT);
      }
      return true;
    }

    function updateM03TransportLanding(enemy, dt) {
      const mission = m03Mission();
      const landing = enemy.m03Landing;
      if (!mission || !landing || !m03State.active) return false;
      const contract = mission.landingContract;
      enemy.mode = "landing-" + landing.state.toLowerCase();

      if (landing.state === "UNLOAD") {
        landing.timer += dt;
        enemy.speed = 0;
        enemy.group.rotation.x = THREE.MathUtils.lerp(enemy.group.rotation.x, 0, damping(0.18, dt));
        enemy.group.rotation.z = THREE.MathUtils.lerp(enemy.group.rotation.z, 0, damping(0.18, dt));
        spinM03TransportRotors(enemy, dt, 0);
        if (landing.timer >= Math.max(0, Number(contract.unloadDelay) || 0)) completeM03Unload(enemy);
        return true;
      }

      if (landing.state === "TOUCHDOWN") {
        landing.timer += dt;
        enemy.speed = 0;
        const touchdown = landing.route[landing.route.length - 1];
        enemy.group.position.y += THREE.MathUtils.clamp(
          touchdown.y - enemy.group.position.y,
          -enemy.spec.climbRate * dt,
          enemy.spec.climbRate * dt
        );
        enemy.group.rotation.x = THREE.MathUtils.lerp(enemy.group.rotation.x, 0, damping(0.16, dt));
        enemy.group.rotation.z = THREE.MathUtils.lerp(enemy.group.rotation.z, 0, damping(0.16, dt));
        spinM03TransportRotors(enemy, dt, 0);
        if (landing.timer >= 0.65) {
          landing.state = "UNLOAD";
          landing.timer = 0;
        }
        return true;
      }

      const target = landing.route[Math.min(landing.routeIndex, landing.route.length - 1)];
      rotateM03TransportToward(enemy, target, dt);
      tmpV1.set(target.x, target.y, target.z).sub(enemy.group.position);
      const distance = tmpV1.length();
      const wanted = Math.max(35, Number(contract.approachSpeed) || enemy.spec.dashSpeed * 0.82);
      enemy.targetSpeed = Math.min(enemy.spec.dashSpeed, wanted);
      enemy.speed = THREE.MathUtils.clamp(
        enemy.speed + THREE.MathUtils.clamp(
          enemy.targetSpeed - enemy.speed,
          -enemy.spec.accel * dt,
          enemy.spec.accel * dt
        ),
        0,
        enemy.spec.dashSpeed
      );
      const step = Math.min(distance, Math.max(12, enemy.speed) * dt);
      if (distance > 0.001) enemy.group.position.addScaledVector(tmpV1.multiplyScalar(1 / distance), step);
      const speedFraction = enemy.spec.dashSpeed > 0 ? enemy.speed / enemy.spec.dashSpeed : 0;
      enemy.group.rotation.x = THREE.MathUtils.lerp(enemy.group.rotation.x, -0.08 * speedFraction, damping(0.2, dt));
      enemy.group.rotation.z = THREE.MathUtils.lerp(enemy.group.rotation.z, 0, damping(0.2, dt));
      spinM03TransportRotors(enemy, dt, speedFraction);

      if (distance <= Math.max(14, enemy.speed * dt * 1.2)) {
        enemy.group.position.set(target.x, target.y, target.z);
        landing.routeIndex += 1;
        if (landing.routeIndex >= landing.route.length) {
          landing.routeIndex = landing.route.length - 1;
          landing.state = "TOUCHDOWN";
          landing.timer = 0;
        }
      }
      return true;
    }

    function failM03Mission(radio, banner) {
      if (!m03State.active || m03State.failed || gameState !== STATE_PLAYING) return false;
      m03State.failed = true;
      missionFailureRadioOverride = radio || (m03Mission() && m03Mission().failureRadio) || null;
      if (banner) showBanner(banner, 2.0, "danger");
      completeMission(false);
      return true;
    }

    function arriveM03Apc(enemy) {
      const mission = m03Mission();
      if (!mission || !enemy || !enemy.alive || !enemy.m03Apc || enemy.m03Arrived) return false;
      const contract = mission.landingContract;
      enemy.m03Arrived = true;
      enemy.alive = false;
      enemy.hitbox.visible = false;
      enemy.group.visible = false;
      enemy.deadTimer = 0;
      enemy.speed = 0;
      m03State.apcArrivals += 1;

      const command = m03CommandFacility(mission);
      if (command && command.alive) {
        damageProtectedFacility(command, Math.max(1, Number(contract.commandDamagePerArrival) || 35));
      }
      if (!m03State.arrivalRadioFired && gameState === STATE_PLAYING) {
        m03State.arrivalRadioFired = true;
        playAuthoredRadio(contract.arrivalWarningRadio, RADIO_PRIORITY.URGENT);
      }
      if (gameState === STATE_PLAYING && m03State.apcArrivals >= Math.max(1, Number(contract.failArrivals) || 4)) {
        failM03Mission(contract.failureRadio, "PORT COMMAND OVERRUN");
      }
      return true;
    }

    function updateM03MissionThreat() {
      const mission = m03Mission();
      if (!mission || !m03State.active || m03State.failed) return false;
      const contract = mission.landingContract;
      const command = m03CommandFacility(mission);
      if (command && !command.alive) {
        return failM03Mission(contract.failureRadio, "PORT COMMAND LOST");
      }
      const limit = Number(contract.timeLimit);
      if (Number.isFinite(limit) && limit > 0 && missionElapsed >= limit) {
        return failM03Mission(contract.timeoutRadio || contract.failureRadio, "PORT DEFENSE TIMED OUT");
      }
      return false;
    }

    function m03RankShouldCapS(mission) {
      const contract = mission && mission.m03RankContract;
      if (!contract || !m03State.active) return false;
      const command = m03CommandFacility(mission);
      const commandPct = command && command.maxHp > 0 ? (command.hp / command.maxHp) * 100 : 0;
      const defensesAlive = m03DefenseFacilities(mission).filter((facility) => facility.alive).length;
      const landingDenied = Boolean(contract.zeroLandingAlternative) && m03State.transportLandings === 0;
      const defensePreserved = commandPct >= (Number(contract.commandHpForS) || 70)
        && defensesAlive >= (Number(contract.defenseSurvivorsForS) || 2);
      return !(landingDenied || defensePreserved);
    }

    function m03ResultSnapshot(mission = m03Mission()) {
      if (!mission || !m03State.active) return null;
      const command = m03CommandFacility(mission);
      return {
        transportLandings: m03State.transportLandings,
        apcSpawned: m03State.apcSpawned,
        apcDestroyed: m03State.apcDestroyed,
        apcArrivals: m03State.apcArrivals,
        commandHp: command ? Math.max(0, command.hp) : 0,
        commandMaxHp: command ? command.maxHp : 0,
        portDefenseSurvivors: m03DefenseFacilities(mission).filter((facility) => facility.alive).length
      };
    }

`;

source = replaceOnce(
  source,
  "    function spawnHeli(position, band, slot, typeKey, idBase = 0, roleId = null) {",
  runtimeHelpers + "    function spawnHeli(position, band, slot, typeKey, idBase = 0, roleId = null) {",
  "spawnHeli insertion point"
);

patchFunction("spawnHeli", (body) => replaceOnce(
  body,
  "      registerSpawnedValue(enemies[enemies.length - 1]);\n      return id;",
  "      const spawned = enemies[enemies.length - 1];\n      spawned.m03Landing = createM03LandingState(spawned);\n      registerSpawnedValue(spawned);\n      return id;",
  "spawnHeli registration tail"
));

patchFunction("updateHeli", (body) => replaceOnce(
  body,
  "      const spec = enemy.spec;\n      const position = enemy.group.position;",
  "      const spec = enemy.spec;\n      const position = enemy.group.position;\n      if (enemy.m03Landing && updateM03TransportLanding(enemy, dt)) return;",
  "updateHeli mission branch"
));

patchFunction("updateGroundUnit", (body) => replaceOnce(
  body,
  "          failEscapingGroundTarget(enemy);\n          enemy.speed = 0;",
  "          if (enemy.m03Apc) arriveM03Apc(enemy);\n          else failEscapingGroundTarget(enemy);\n          enemy.speed = 0;",
  "ground route-end branch"
));

patchFunction("damageProtectedFacility", (body) => replaceOnce(
  body,
  "      playAuthoredRadio(contract.lossRadio, RADIO_PRIORITY.URGENT);\n      return true;",
  "      playAuthoredRadio(contract.lossRadio, RADIO_PRIORITY.URGENT);\n      const landing = mission.landingContract;\n      if (landing && facility.facilityId === landing.commandFacilityId) {\n        failM03Mission(landing.failureRadio || mission.failureRadio, \"PORT COMMAND LOST\");\n      }\n      return true;",
  "facility terminal consequence"
));

patchFunction("updateMission", (body) => {
  let next = replaceOnce(
    body,
    "      updateLandingThreat();\n      if (activeWaveGate) {",
    "      updateLandingThreat();\n      if (updateM03MissionThreat()) return;\n      if (activeWaveGate) {",
    "mission M03 threat update"
  );
  next = replaceOnce(
    next,
    "      // Only designated targets hold the mission open. A surviving escort or\n      // CAP keeps fighting - and keeps being worth bonus points - but it can\n      // never stall the next wave or deny the player the mission.\n      const living = enemies.some((enemy) => enemy.alive && isTgtEntry(enemy));",
    "      // Delayed designated flights still belong to the current engagement.\n      // Without this hold a fast clear cancels M03's transport flight before\n      // its authored delay expires and awards a mission that never happened.\n      if (pendingWaves.some((entry) => entry.wave && isTgtEntry(entry.wave))) {\n        waveClearTimer = -1;\n        return;\n      }\n      // Only designated targets hold the mission open. A surviving escort or\n      // CAP keeps fighting - and keeps being worth bonus points - but it can\n      // never stall the next wave or deny the player the mission.\n      const living = enemies.some((enemy) => enemy.alive && isTgtEntry(enemy));",
    "pending designated-wave hold"
  );
  return next;
});

patchFunction("startMission", (body) => replaceOnce(
  body,
  "      spawningFacilityIndex = null;\n      // The hunter pattern is deterministic per sortie.",
  "      spawningFacilityIndex = null;\n      resetM03State(MISSIONS[currentMissionIndex]);\n      // The hunter pattern is deterministic per sortie.",
  "M03 start reset"
));

patchFunction("damageEnemy", (body) => replaceOnce(
  body,
  "      enemy.alive = false;\n      enemy.hitbox.visible = false;",
  "      enemy.alive = false;\n      enemy.hitbox.visible = false;\n      if (enemy.m03Landing) enemy.m03Landing.state = \"DESTROYED\";\n      if (enemy.m03Apc && !enemy.m03Arrived) m03State.apcDestroyed += 1;",
  "M03 destruction accounting"
));

patchFunction("saveCheckpoint", (body) => replaceOnce(
  body,
  "      checkpoint.activeGroundPhaseId = activeGroundPhaseId;\n      checkpoint.missionElapsed = missionElapsed;",
  "      checkpoint.activeGroundPhaseId = activeGroundPhaseId;\n      checkpoint.m03State = snapshotM03State();\n      checkpoint.missionElapsed = missionElapsed;",
  "M03 checkpoint snapshot"
));

patchFunction("restartFromCheckpoint", (body) => replaceOnce(
  body,
  "      if (at.activeGroundPhaseId) activateGroundPhase(at.activeGroundPhaseId);\n      missionElapsed = at.missionElapsed;",
  "      if (at.activeGroundPhaseId) activateGroundPhase(at.activeGroundPhaseId);\n      restoreM03State(at.m03State);\n      missionElapsed = at.missionElapsed;",
  "M03 checkpoint restore"
));

patchFunction("computeMissionRank", (body) => {
  let next = replaceOnce(
    body,
    "      if (facilityCap && RANK_ORDER[facilityCap] !== undefined\n          && RANK_ORDER[rank] > RANK_ORDER[facilityCap]) {\n        rank = facilityCap;\n      }\n\n      // A sortie that had to be restarted from a checkpoint",
    "      if (facilityCap && RANK_ORDER[facilityCap] !== undefined\n          && RANK_ORDER[rank] > RANK_ORDER[facilityCap]) {\n        rank = facilityCap;\n      }\n\n      const m03RankCapped = m03RankShouldCapS(mission);\n      if (m03RankCapped && RANK_ORDER[rank] > RANK_ORDER.A) rank = \"A\";\n\n      // A sortie that had to be restarted from a checkpoint",
    "M03 rank alternative"
  );
  next = replaceOnce(
    next,
    "      const capped = (!guardPerfect && rank === \"A\") || (guardWiped && rank === \"B\")\n        || (breachCapped && rank === \"A\")\n        || (checkpoint.used && rank === \"A\");",
    "      const capped = (!guardPerfect && rank === \"A\") || (guardWiped && rank === \"B\")\n        || (breachCapped && rank === \"A\")\n        || (m03RankCapped && rank === \"A\")\n        || (checkpoint.used && rank === \"A\");",
    "M03 next-rank cap"
  );
  return next;
});

patchFunction("recordMissionResult", (body) => {
  let next = replaceOnce(
    body,
    "      const rank = result.rank;\n      const key = MISSIONS[currentMissionIndex].key;",
    "      const rank = result.rank;\n      const mission = MISSIONS[currentMissionIndex];\n      const key = mission.key;",
    "mission result binding"
  );
  next = replaceOnce(
    next,
    "      missionRecords[key] = entry;\n      saveMissionRecords();",
    "      const m03Result = m03ResultSnapshot(mission);\n      if (m03Result) Object.assign(entry, m03Result);\n      missionRecords[key] = entry;\n      if (m03Result) {\n        missionRecords.m03 = {\n          ...entry,\n          ...m03Result,\n          ranks: { ...(entry.ranks || {}) },\n          scores: [...entry.scores],\n          times: [...entry.times],\n          marks: { ...(entry.marks || {}) },\n          recordSource: key\n        };\n      }\n      saveMissionRecords();",
    "formal M03 result record"
  );
  return next;
});

const debugHooks = String.raw`      seraM03Probe: () => {
        const mission = MISSIONS[currentMissionIndex];
        const command = m03CommandFacility(mission);
        return {
          state: gameState,
          missionKey: mission ? mission.key : null,
          title: mission ? mission.title : null,
          worldKey: mission ? mission.world : null,
          active: m03State.active,
          transportSpawned: m03State.transportSpawned,
          transportLandings: m03State.transportLandings,
          apcSpawned: m03State.apcSpawned,
          apcDestroyed: m03State.apcDestroyed,
          apcArrivals: m03State.apcArrivals,
          failed: m03State.failed,
          command: command ? {
            alive: command.alive,
            hp: command.hp,
            maxHp: command.maxHp,
            id: command.facilityId
          } : null,
          facilities: protectedFacilities.map((facility) => ({
            id: facility.facilityId,
            alive: facility.alive,
            hp: facility.hp,
            maxHp: facility.maxHp
          })),
          pendingTargetWaves: pendingWaves.filter((entry) => entry.wave && isTgtEntry(entry.wave)).length,
          enemies: enemies.map((enemy) => ({
            id: enemy.id,
            type: enemy.type,
            alive: enemy.alive,
            tgt: isTgtEntry(enemy),
            ground: Boolean(enemy.ground),
            heli: Boolean(enemy.heli),
            rankNeutral: Boolean(enemy.rankNeutral),
            mark: enemy.mark || null,
            m03Apc: Boolean(enemy.m03Apc),
            arrived: Boolean(enemy.m03Arrived),
            landingState: enemy.m03Landing ? enemy.m03Landing.state : null,
            lz: enemy.m03Landing ? enemy.m03Landing.lzId : (enemy.m03LzId || null),
            routeDistance: Number(enemy.routeDistance) || 0,
            routeEnd: enemy.route && enemy.route.length ? enemy.route[enemy.route.length - 1].d : null
          })),
          outcomePending: outcomePending.active,
          rankSpawnedValue: rankStats.spawnedValue,
          rankKillValue: rankStats.playerKillValue
        };
      },
      forceSeraM03DeployPending: () => {
        const mission = m03Mission();
        if (gameState !== STATE_PLAYING || !mission) return false;
        for (const queued of pendingWaves) queued.timer = 0;
        updatePendingWaves(999);
        return true;
      },
      forceSeraM03LandTransport: (id = null) => {
        const mission = m03Mission();
        if (gameState !== STATE_PLAYING || !mission) return false;
        const transport = enemies.find((enemy) => enemy.alive && enemy.m03Landing
          && (id === null || enemy.id === id));
        if (!transport) return false;
        transport.m03Landing.state = "UNLOAD";
        transport.m03Landing.timer = Math.max(0, Number(mission.landingContract.unloadDelay) || 0);
        return completeM03Unload(transport);
      },
      forceSeraM03ApcArrival: (count = 1) => {
        if (gameState !== STATE_PLAYING || !m03Mission()) return 0;
        let arrived = 0;
        const targets = enemies.filter((enemy) => enemy.alive && enemy.m03Apc).slice(0, Math.max(0, count));
        for (const apc of targets) {
          if (arriveM03Apc(apc)) arrived += 1;
        }
        return arrived;
      },
      forceSeraM03CommandLoss: () => {
        const mission = m03Mission();
        const command = m03CommandFacility(mission);
        if (gameState !== STATE_PLAYING || !mission || !command) return false;
        damageProtectedFacility(command, command.hp + 1);
        return !command.alive;
      },
      seraM03PerfectRankPreview: () => {
        const mission = m03Mission();
        if (!mission) return null;
        const oldKill = rankStats.playerKillValue;
        const oldElapsed = missionElapsed;
        rankStats.playerKillValue = rankStats.spawnedValue;
        missionElapsed = 0;
        const preview = computeMissionRank().rank;
        rankStats.playerKillValue = oldKill;
        missionElapsed = oldElapsed;
        return preview;
      },
      forceSeraM03Complete: () => {
        const mission = m03Mission();
        if (gameState !== STATE_PLAYING || !mission) return false;
        for (let pass = 0; pass < 32 && gameState === STATE_PLAYING && !outcomePending.active; pass += 1) {
          for (const queued of pendingWaves) queued.timer = 0;
          updatePendingWaves(999);
          if (activeWaveGate && activeWaveGate.mode === "clearOrTimeout") {
            activeWaveGate.elapsed = activeWaveGate.timeout;
          }
          const targets = enemies.filter((enemy) => enemy.alive && isTgtEntry(enemy));
          for (const target of targets) damageEnemy(target, target.hp + 1, true, false);
          updateMission(0.016, 5.0);
        }
        return outcomePending.active;
      },
      forceSeraM03ResolveOutcome: () => {
        const mission = m03Mission();
        if (!mission || !outcomePending.active) return false;
        updateOutcomePending(OUTCOME_PENDING_TIME + 0.1);
        return gameState === STATE_COMPLETE;
      },
`;

source = replaceOnce(
  source,
  "    window.__game = {\n      seraM02Probe:",
  "    window.__game = {\n" + debugHooks + "      seraM02Probe:",
  "M03 debug hook insertion"
);

fs.writeFileSync(targetUrl, source, "utf8");
console.log("[sera-m03-runtime-patch] installed runtime contract");
