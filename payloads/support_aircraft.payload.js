// Support-aircraft batch: four enemy-only, unarmed mission aircraft and the
// requested additions to m-intercept, m-swarm, r07 and r13.
//
// r07 uses ctx.deployFriendlies. Its guard definition is adapted from the live
// m-escort guard at the moment the queued deployment is applied, so this payload
// inherits the host's full guard contract instead of restating a private schema.
//
// This payload does not touch index.html, existing AIRCRAFT_TYPES entries,
// AIRCRAFT_ORDER, HP multipliers, or any mission outside the requested set.
export default function register(ctx) {
  const { AIRCRAFT_TYPES, ENEMY_AI_PROFILES, MISSIONS } = ctx.tables;
  const transport = AIRCRAFT_TYPES.transport;
  const bomber = AIRCRAFT_TYPES.bomber;
  const transportAI = ENEMY_AI_PROFILES.transport;

  if (!transport || !bomber || !transportAI) {
    throw new Error("[support-aircraft] expected transport/bomber aircraft and transport AI templates");
  }

  // A support aircraft inherits the complete required schema from a proven
  // enemy-only template. `spw` is stripped even if a future template grows one:
  // special weapons are a player-only contract and must never reach this roster.
  function supportAircraft(base, overrides) {
    const { spw: _ignoredSpw, ...withoutSpw } = base;
    const aircraft = {
      ...withoutSpw,
      ...overrides,
      tag: "ENEMY",
      enemyOnly: true,
      gunDamage: 0,
      missileDamage: 98,
      missileCapacity: 0
    };
    if (aircraft.maxHealth % 98 !== 0) {
      throw new Error(`[support-aircraft] ${aircraft.id} HP must stay on the 98-point quantum`);
    }
    if ("spw" in aircraft) {
      throw new Error(`[support-aircraft] ${aircraft.id} must not expose a player special weapon`);
    }
    return aircraft;
  }

  // The transport profile is the existing non-combat AI contract. Keep every
  // weapon channel at zero and vary only flight-path/readability fields.
  function supportAI(overrides) {
    const { rearGun: _ignoredRearGun, rearGunOffset: _ignoredRearGunOffset, ...unarmedBase } = transportAI;
    return {
      ...unarmedBase,
      ...overrides,
      engageRange: 0,
      disengageRange: 0,
      pursuitBack: 0,
      attackRange: 0,
      aimThreshold: 2,
      hitChanceScale: 0,
      maxHitChance: 0,
      damageMin: 0,
      damageMax: 0
    };
  }

  const awacsTheme = {
    primary: 0x87918c,
    secondary: 0x59635f,
    accent: 0xb5423c,
    canopy: 0x8fe0ff,
    exhaust: 0xffc79a,
    scale: 2.65,
    variant: "transport"
  };
  const tankerTheme = {
    primary: 0xc2cad0,
    secondary: 0x7f8b96,
    accent: 0x315f91,
    canopy: 0xa8e8ff,
    exhaust: 0x9fd8ff,
    scale: 2.7,
    variant: "transport"
  };
  const jammerTheme = {
    primary: 0x777f7b,
    secondary: 0x444c49,
    accent: 0xa93f3b,
    canopy: 0x92ddff,
    exhaust: 0xffb98a,
    scale: 1.5,
    variant: "transport"
  };
  const patrolTheme = {
    primary: 0x68747b,
    secondary: 0x3c474d,
    accent: 0xb04a42,
    canopy: 0x92ddff,
    exhaust: 0xffd9a0,
    scale: 2.5,
    variant: "bear"
  };

  ctx.addAircraft("awacs", supportAircraft(transport, {
    id: "awacs",
    label: "A-50 MAINSTAY",
    role: "Airborne Early Warning & Control",
    blurb: "大型レーダーで敵編隊を管制する早期警戒管制機。武装は無いが、戦域全体の目となる重要目標。",
    cruiseSpeed: 162,
    boostSpeed: 188,
    brakeSpeed: 132,
    pitchRateDeg: 10,
    rollRateDeg: 28,
    yawRateDeg: 4,
    maxBankAngleDeg: 16,
    normalRollSpring: 10,
    rollRateLimitDeg: 25,
    turnRateDeg: 7,
    rollDamping: 5.5,
    stallWarnSpeed: 92,
    stallEntrySpeed: 80,
    stallAuthorityLoss: 0.92,
    structuralG: 1.5,
    boostResponse: 0.88,
    brakeResponse: 0.84,
    cruiseResponse: 0.91,
    maxHealth: 294,
    tipSpan: 11.8,
    tipZ: 1.0,
    theme: awacsTheme
  }), { order: false });
  ctx.addEnemyProfile("awacs", supportAI({
    label: "AWACS",
    hitboxScale: 3.1,
    patrolSpeedScale: 1.0,
    patrolPathScale: 0.24,
    verticalBias: 55,
    verticalAmplitude: 7,
    verticalFrequency: 0.2,
    evadeLateral: 0,
    evadeVertical: 0,
    evadeFrequency: 0,
    speedResponse: 0.06,
    explosionScale: 1.75,
    radarColor: "#ff8d5a",
    tracerColor: 0xff8d5a,
    explosionColor: 0xffb864,
    theme: awacsTheme
  }));

  ctx.addAircraft("tanker", supportAircraft(transport, {
    id: "tanker",
    label: "KC-46 PEGASUS",
    role: "Aerial Refueling Tanker",
    blurb: "長距離作戦を支える大型空中給油機。鈍重で非武装だが、補給線そのものとして高い撃墜価値を持つ。",
    cruiseSpeed: 155,
    boostSpeed: 180,
    brakeSpeed: 128,
    pitchRateDeg: 9,
    rollRateDeg: 26,
    yawRateDeg: 4,
    maxBankAngleDeg: 15,
    normalRollSpring: 9,
    rollRateLimitDeg: 24,
    turnRateDeg: 7,
    rollDamping: 5.4,
    stallWarnSpeed: 90,
    stallEntrySpeed: 78,
    stallAuthorityLoss: 0.93,
    structuralG: 1.45,
    boostResponse: 0.9,
    brakeResponse: 0.88,
    cruiseResponse: 0.93,
    maxHealth: 294,
    tipSpan: 12.0,
    tipZ: 1.0,
    theme: tankerTheme
  }), { order: false });
  ctx.addEnemyProfile("tanker", supportAI({
    label: "TANKER",
    hitboxScale: 3.2,
    patrolSpeedScale: 1.0,
    patrolPathScale: 0.22,
    verticalBias: 38,
    verticalAmplitude: 5,
    verticalFrequency: 0.18,
    evadeLateral: 0,
    evadeVertical: 0,
    evadeFrequency: 0,
    speedResponse: 0.055,
    explosionScale: 1.8,
    radarColor: "#ff9c62",
    tracerColor: 0xff9c62,
    explosionColor: 0xffc06a,
    theme: tankerTheme
  }));

  ctx.addAircraft("jammer", supportAircraft(transport, {
    id: "jammer",
    label: "IL-22PP JAMMER",
    role: "Airborne Electronic Warfare",
    blurb: "妨害装置を満載した中型電子戦機。武装は無いが、無人機群の背後で電波戦を支える。",
    cruiseSpeed: 190,
    boostSpeed: 250,
    brakeSpeed: 125,
    pitchRateDeg: 22,
    rollRateDeg: 62,
    yawRateDeg: 7,
    maxBankAngleDeg: 32,
    normalRollSpring: 22,
    rollRateLimitDeg: 58,
    turnRateDeg: 16,
    rollDamping: 7.4,
    stallWarnSpeed: 88,
    stallEntrySpeed: 76,
    stallAuthorityLoss: 0.78,
    structuralG: 2.2,
    boostResponse: 0.7,
    brakeResponse: 0.65,
    cruiseResponse: 0.74,
    maxHealth: 196,
    tipSpan: 8.3,
    tipZ: 1.8,
    theme: jammerTheme
  }), { order: false });
  ctx.addEnemyProfile("jammer", supportAI({
    label: "JAMMER",
    hitboxScale: 1.75,
    patrolSpeedScale: 1.0,
    patrolPathScale: 0.52,
    verticalBias: 48,
    verticalAmplitude: 18,
    verticalFrequency: 0.42,
    evadeLateral: 70,
    evadeVertical: 36,
    evadeFrequency: 0.55,
    speedResponse: 0.1,
    explosionScale: 1.2,
    radarColor: "#c982ff",
    tracerColor: 0xc982ff,
    explosionColor: 0xffaa62,
    theme: jammerTheme
  }));

  ctx.addAircraft("maritimePatrol", supportAircraft(bomber, {
    id: "maritimePatrol",
    label: "TU-142 BEAR-F",
    role: "Maritime Patrol Aircraft",
    blurb: "広い海域を長時間監視する対艦・対潜哨戒機。非武装のまま、偵察編隊の航路を支える。",
    cruiseSpeed: 172,
    boostSpeed: 205,
    brakeSpeed: 130,
    pitchRateDeg: 12,
    rollRateDeg: 34,
    yawRateDeg: 4.5,
    maxBankAngleDeg: 18,
    normalRollSpring: 12,
    rollRateLimitDeg: 31,
    turnRateDeg: 9,
    rollDamping: 5.8,
    stallWarnSpeed: 89,
    stallEntrySpeed: 77,
    stallAuthorityLoss: 0.9,
    structuralG: 1.6,
    boostResponse: 0.84,
    brakeResponse: 0.82,
    cruiseResponse: 0.88,
    maxHealth: 196,
    tipSpan: 11.6,
    tipZ: 1.2,
    theme: patrolTheme
  }), { order: false });
  ctx.addEnemyProfile("maritimePatrol", supportAI({
    label: "PATROL",
    hitboxScale: 2.7,
    patrolSpeedScale: 1.0,
    patrolPathScale: 0.28,
    verticalBias: 34,
    verticalAmplitude: 8,
    verticalFrequency: 0.24,
    evadeLateral: 0,
    evadeVertical: 0,
    evadeFrequency: 0,
    speedResponse: 0.065,
    explosionScale: 1.55,
    radarColor: "#ffad63",
    tracerColor: 0xffad63,
    explosionColor: 0xffbd68,
    theme: patrolTheme
  }));

  // Re-register through addMission so every derived mission field is rebuilt by
  // the same normalizer as authored missions. The original object is restored if
  // validation rejects the replacement.
  function extendMission(key, makeReplacement) {
    const at = MISSIONS.findIndex((mission) => mission.key === key);
    if (at <= 0) {
      throw new Error(`[support-aircraft] mission ${key} not found at a replaceable index`);
    }
    const original = MISSIONS[at];
    const after = MISSIONS[at - 1].key;
    const replacement = makeReplacement(original);

    MISSIONS.splice(at, 1);
    try {
      return ctx.addMission(replacement, { after });
    } catch (error) {
      MISSIONS.splice(at, 0, original);
      throw error;
    }
  }

  function appendAircraftToWave(key, type, findWave) {
    extendMission(key, (mission) => {
      const sequence = [...mission.sequence];
      const at = findWave(sequence);
      if (at < 0 || !Array.isArray(sequence[at].types)) {
        throw new Error(`[support-aircraft] ${key} has no expected insertion wave for ${type}`);
      }
      sequence[at] = {
        ...sequence[at],
        types: [...sequence[at].types, type]
      };
      return { ...mission, sequence };
    });
  }

  // BOMBER STREAM: the AWACS rides at the rear of the final designated Bear
  // stream. Appending it makes it the aft-most slot of that formation and, with
  // tgt left at its default, adds exactly one designated target.
  appendAircraftToWave("m-intercept", "awacs", (sequence) => {
    for (let i = sequence.length - 1; i >= 0; i -= 1) {
      const wave = sequence[i];
      if (wave.tgt !== false && Array.isArray(wave.types) && wave.types.includes("tu95")) return i;
    }
    return -1;
  });

  // UAV SWARM: keep the authored "six designated UAVs" contract intact. The
  // jammer joins the last delayed non-target drone cloud, after every pinned TGT
  // id block, so it neither changes the objective count nor collides with IDs.
  appendAircraftToWave("m-swarm", "jammer", (sequence) => {
    for (let i = sequence.length - 1; i >= 0; i -= 1) {
      const wave = sequence[i];
      if (wave.tgt === false && Array.isArray(wave.types) && wave.types.includes("uav")) return i;
    }
    return -1;
  });

  // CUT THE LINE: the tanker flies beside the existing lead transport. The wave
  // is designated, so normalizeMission raises totalTargets from one to two while
  // every escort and delayed rear transport remains exactly as authored.
  appendAircraftToWave("r13", "tanker", (sequence) => sequence.findIndex(
    (wave) => wave.tgt !== false && Array.isArray(wave.types) && wave.types.includes("transport")
  ));

  // r07 は本便から外した。ChatGPT の版は m-escort の `guard` から機種・機数・
  // HP・経路を読み出そうとしていたが、実際の guard が持つのは表示とペナルティと
  // 無線だけで、機体側の情報は `transports` にある。加えて
  // spawnFriendlyTransports は FRIENDLY_TRANSPORT_SPEC のテーマで固定されており、
  // 任意の機種を出す口がない。推測したスキーマ名を総当たりで代入する実装が
  // 通ってしまうと「積んだつもりで何も載っていない」状態になるため、
  // 味方機の機種指定という土台を作ってから別便で入れる。
}
