// Story events batch 2: the five remaining cross-campaign causal pairs and
// callsign inheritance for the two named ace squadrons.
//
// The payload keeps index.html, AIRCRAFT_TYPES, HP scaling, authored titles,
// briefings and par times untouched. Existing contacts stay in place except for
// the explicitly requested HATI/DAEDALUS designation hand-off; every other
// change is an added profile, target, optional ground unit, wave or runtime cue.
export default function register(ctx) {
  const { ACE_PROFILES, GROUND_TYPES, MISSIONS } = ctx.tables;

  const DAGGER_LAST_WORDS = "こちらDAGGER 1。HAMMER 1、お前が前に出ろ。";
  const WARDEN_LAST_WORDS = "こちらWARDEN 1。IRONBACK、前へ出ろ。隊を止めるな。";

  const daggerBase = ACE_PROFILES.atlas || ACE_PROFILES.longbow;
  const wardenBase = ACE_PROFILES.fenrir || ACE_PROFILES.ironback;
  const hatiBase = ACE_PROFILES.hati;
  const daedalusBase = ACE_PROFILES.daedalus;
  const beaconBase = GROUND_TYPES.ciws || GROUND_TYPES.radarSite || GROUND_TYPES.bunker;
  if (!daggerBase || !wardenBase || !hatiBase || !daedalusBase || !beaconBase) {
    throw new Error("[story-events-2] expected the existing ace and ground templates");
  }

  function aceFrom(base, overrides) {
    return {
      ...base,
      ...overrides,
      theme: { ...base.theme, ...(overrides.theme || {}) },
      radio: { ...base.radio, ...(overrides.radio || {}) }
    };
  }

  // Cause-side pilots. Their down calls are the same constants used on the
  // result-side missions, so A19 repeats R02 byte-for-byte and R19 does the same
  // for A02. The loss-side aircraft stays off-screen to avoid a dead voice while
  // a supposedly destroyed friendly model keeps flying.
  ctx.addAceProfile("dagger", aceFrom(daggerBase, {
    callsign: "DAGGER 1",
    role: "AEF Flight Commander",
    radarColor: "#9fd8ff",
    tracerColor: 0x9fd8ff,
    theme: {
      primary: 0x65727e,
      secondary: 0x34414d,
      accent: 0x9fd8ff,
      canopy: 0xcfeeff,
      exhaust: 0x9fd8ff,
      scale: 1.02
    },
    radio: {
      inbound: "敵編隊にネームド、DAGGER 1。NIMROD隊の旧隊長機だ。",
      wingman: "DAGGER 1……あの人が、向こうの先頭だったのか。",
      engage: "こちらDAGGER 1。NIMRODの前には出させない。",
      down: DAGGER_LAST_WORDS
    }
  }));
  ctx.addAceProfile("warden", aceFrom(wardenBase, {
    callsign: "WARDEN 1",
    role: "NFF Flight Commander",
    radarColor: "#ffb06a",
    tracerColor: 0xffb06a,
    theme: {
      primary: 0x4a4038,
      secondary: 0x29231f,
      accent: 0xffb06a,
      canopy: 0xffd9a8,
      exhaust: 0xffc79a,
      scale: 1.08
    },
    radio: {
      inbound: "新たなネームド、WARDEN 1。IRONBACK隊の指揮機だ。",
      wingman: "あれが北方側の隊長機だ。IRONBACKを前へ出した男だ。",
      engage: "こちらWARDEN 1。空は空席を嫌う。次を前へ出す。",
      down: WARDEN_LAST_WORDS
    }
  }));

  // A name is a role, not a body. HATI/DAEDALUS keep their own paint, voice and
  // flight style, while the HUD callsign on their later wave is the fallen
  // leader's designation. Their radio states who is actually wearing the name.
  ctx.addAceProfile("fenrirSuccessor", aceFrom(hatiBase, {
    callsign: "FENRIR",
    role: "HATI / Jormungandr Successor",
    radio: {
      inbound: "SYSTEM: FENRIR designation transferred",
      wingman: "HATIがFENRIRを名乗った。名前を落としても終わらないぞ。",
      engage: "こちらHATI。FENRIRの指定を継承する。",
      down: hatiBase.radio.down
    }
  }));
  ctx.addAceProfile("atlasSuccessor", aceFrom(daedalusBase, {
    callsign: "ATLAS",
    role: "DAEDALUS / Atlas Successor",
    radio: {
      inbound: "SYSTEM: ATLAS designation transferred",
      wingman: "DAEDALUSがATLASを継いだ。落ちたのは機体だけだ。",
      engage: "こちらDAEDALUS。ATLASの指定を継承する。",
      down: daedalusBase.radio.down
    }
  }));

  // R08's optional route beacon is also a weak air-defence relay when the CIWS
  // template exists. Shooting it helps this sortie immediately, but records the
  // route that MULE 2 will later take. `mark` is authored on a ground unit because
  // that is the only spawn path that currently propagates it.
  ctx.addGroundType("routeBeacon", {
    ...beaconBase,
    key: "routeBeacon",
    label: "ROUTE-13 BEACON",
    role: "Navigation Beacon / Air Defense Relay",
    hp: 62,
    hitRadius: 19,
    aa: beaconBase.aa ? {
      ...beaconBase.aa,
      range: Math.min(390, beaconBase.aa.range || 390),
      damage: Math.min(6, beaconBase.aa.damage || 6),
      maxHitChance: Math.min(0.14, beaconBase.aa.maxHitChance || 0.14)
    } : null,
    dishSpin: beaconBase.dishSpin ?? 0.45,
    smokeHeight: 5,
    explosionColor: 0x86c8ff,
    radarColor: "#78d2ff"
  });

  function extendMission(key, makeReplacement) {
    const at = MISSIONS.findIndex((mission) => mission.key === key);
    if (at <= 0) {
      throw new Error(`[story-events-2] mission ${key} not found at a replaceable index`);
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

  // A02 <-> R19: A02 is the succession; R19 is the player's own shot that made
  // it necessary. DAGGER is an added final target, leaving NIMROD and his existing
  // two-aircraft element exactly as authored.
  extendMission("r19", (mission) => ({
    ...mission,
    sequence: [
      ...mission.sequence,
      {
        types: ["f15"],
        ace: "dagger",
        band: 1,
        skill: "expert",
        label: "DAGGER 1"
      }
    ]
  }));

  // R02 <-> A19: WARDEN is likewise an added coda after the existing IRONBACK
  // engagement. His down call is exactly the line heard earlier in R02.
  extendMission("m04", (mission) => ({
    ...mission,
    sequence: [
      ...mission.sequence,
      {
        types: ["su33"],
        ace: "warden",
        band: 1,
        skill: "expert",
        label: "WARDEN 1"
      }
    ]
  }));

  // R08 -> A13. The measured night-base cap is centred near (900,-1200); this
  // point is outside the six-unit perimeter cluster but remains on that proven
  // plateau. It is a detour during the scramble, not a separate excursion.
  extendMission("r08", (mission) => ({
    ...mission,
    groundUnits: [
      ...(mission.groundUnits || []),
      {
        id: 58,
        type: "routeBeacon",
        x: 1420,
        z: -1680,
        heading: 1.57,
        tgt: false,
        mark: "routeBeacon"
      }
    ]
  }));

  // A10: 4 -> 2 -> 1. These are three added designated engagements after the
  // armoured train. The same one-missile drone airframe is flown progressively
  // better, so the count — not a hidden stat jump or a lore speech — carries the
  // integration: four fragments, two composites, one completed pattern.
  // `uav` here is the neutral BABEL route instance seen from both campaigns,
  // not a claim that either side has changed its national fighter roster.
  extendMission("m-train", (mission) => ({
    ...mission,
    sequence: [
      ...mission.sequence,
      {
        types: ["uav", "uav", "uav", "uav"],
        role: "trash",
        skill: "rookie",
        band: 1,
        label: "PATTERN 4",
        radio: [
          { speaker: "enemy", text: "BABEL: PATTERN ARCHIVED / 4 SOURCES", id: "story-a10-pattern-4" }
        ]
      },
      {
        types: ["uav", "uav"],
        role: "line",
        skill: "veteran",
        band: 2,
        label: "PATTERN 2",
        radio: [
          { speaker: "enemy", text: "BABEL: INTEGRATION / 2 COMPOSITES", id: "story-a10-pattern-2" }
        ]
      },
      {
        types: ["uav"],
        role: "ace",
        skill: "expert",
        band: 1,
        label: "PATTERN 1",
        radio: [
          { speaker: "enemy", text: "BABEL: INTEGRATION COMPLETE / 1 PATTERN", id: "story-a10-pattern-1" }
        ]
      }
    ]
  }));

  // R11: 1 -> 2 -> 4. The same one-missile system instances split in reverse:
  // one expert root, two regular copies, four rookie fragments. All three are
  // designated engagements, so the player cannot finish before the migration is
  // visible; the count itself carries the idea, not a lore monologue.
  extendMission("r11", (mission) => ({
    ...mission,
    sequence: [
      ...mission.sequence,
      {
        types: ["uav"],
        role: "ace",
        skill: "expert",
        band: 1,
        label: "ROUTE 1",
        radio: [
          { speaker: "enemy", text: "SYSTEM: ROUTE ORIGIN / 1 INSTANCE", id: "story-r11-route-1" }
        ]
      },
      {
        types: ["uav", "uav"],
        role: "line",
        skill: "regular",
        band: 2,
        label: "ROUTE 2",
        radio: [
          { speaker: "enemy", text: "SYSTEM: ROUTE MIGRATED / 2 INSTANCES", id: "story-r11-route-2" }
        ]
      },
      {
        types: ["uav", "uav", "uav", "uav"],
        role: "trash",
        skill: "rookie",
        band: 1,
        label: "ROUTE 4",
        radio: [
          { speaker: "enemy", text: "SYSTEM: ROUTE MIGRATED / 4 INSTANCES", id: "story-r11-route-4" }
        ]
      }
    ]
  }));

  function transferAceDesignation(mission, fromAce, toAce) {
    let replaced = false;
    const sequence = mission.sequence.map((wave) => {
      if (!wave || wave.ace !== fromAce) return wave;
      replaced = true;
      return { ...wave, ace: toAce };
    });
    if (!replaced) {
      throw new Error(`[story-events-2] ${mission.key} has no ${fromAce} successor wave`);
    }
    return { ...mission, sequence };
  }

  // The successor enters only after the lead pair is gone. The model/voice stays
  // HATI or DAEDALUS, but the actual HUD designation is now FENRIR or ATLAS.
  extendMission("m-squadron", (mission) =>
    transferAceDesignation(mission, "hati", "fenrirSuccessor"));
  extendMission("r18", (mission) =>
    transferAceDesignation(mission, "daedalus", "atlasSuccessor"));

  // A20/R20 end on a new designated wave, so the appointment cannot be skipped.
  // AEF defeats four distributed nodes then accepts NFF-style distribution;
  // NFF defeats one integrated root then accepts AEF-style integration.
  extendMission("m05", (mission) => ({
    ...mission,
    sequence: [
      ...mission.sequence,
      {
        types: ["uav", "uav", "uav", "uav"],
        band: 2,
        role: "trash",
        skill: "rookie",
        label: "DISTRIBUTED ROOT",
        radio: [
          { speaker: "enemy", text: "BABEL: AUTHORITY DISTRIBUTED / 4 NODES", id: "story-a20-distributed" },
          { speaker: "wingman", text: "塔は倒れた。形を変えただけだ。", id: "story-a20-tower" }
        ]
      }
    ]
  }));
  extendMission("r20", (mission) => ({
    ...mission,
    sequence: [
      ...mission.sequence,
      {
        types: ["f35c"],
        band: 2,
        role: "elite",
        skill: "expert",
        label: "INTEGRATED ROOT",
        radio: [
          { speaker: "enemy", text: "AEF SYSTEM: ALL ROUTES / 1 CONTROL ROOT", id: "story-r20-unified" },
          { speaker: "wingman", text: "塔は倒れた。形を変えただけだ。", id: "story-r20-tower" }
        ]
      }
    ]
  }));

  // -------------------------------------------------------------------------
  // Runtime cues
  // -------------------------------------------------------------------------
  // Production source-inlines this function and can reach the core radio queue.
  // The query loader imports it as a separate module, so a small fallback clones
  // the existing panel for development without adding a host-side schema.
  const PRIORITY_CRITICAL = 3;
  const WATCHED_KEYS = new Set(["m02", "r02", "r08", "m-escort", "m05", "r20"]);
  let fallbackRadio = null;

  function resetStoryRadio() {
    if (typeof ctx.resetRadio === "function") {
      ctx.resetRadio();
      return;
    }
    if (typeof resetRadio === "function") {
      resetRadio();
      return;
    }
    if (fallbackRadio) fallbackRadio.reset();
  }

  function sendStoryLine(speaker, text, id) {
    if (typeof ctx.triggerRadioLine === "function") {
      return ctx.triggerRadioLine(speaker, text, PRIORITY_CRITICAL, id);
    }
    if (typeof triggerRadioLine === "function") {
      return triggerRadioLine(speaker, text, PRIORITY_CRITICAL, id);
    }
    if (typeof window === "undefined" || typeof document === "undefined") return false;
    if (!fallbackRadio) fallbackRadio = createFallbackRadio();
    fallbackRadio.enqueue(speaker, text, id);
    return true;
  }

  function storyBurst(lines, interrupt = true) {
    if (!lines.length) return;
    if (interrupt) resetStoryRadio();
    for (const line of lines) sendStoryLine(line.speaker, line.text, line.id);
  }

  function createFallbackRadio() {
    const original = document.getElementById("radioPanel");
    const panel = original ? original.cloneNode(true) : document.createElement("div");
    if (!original) {
      panel.id = "radioPanel";
      panel.innerHTML = '<span id="radioSpeaker"></span><span id="radioText"></span>';
      document.body.appendChild(panel);
    } else {
      panel.dataset.storyEvents2Preview = "1";
      panel.style.zIndex = "37";
      original.parentNode.appendChild(panel);
    }
    const speakerNode = panel.querySelector("#radioSpeaker");
    const textNode = panel.querySelector("#radioText");
    const queue = [];
    const storyState = {
      active: false,
      speakerId: null,
      lineId: null,
      text: "",
      revealedChars: 0,
      totalChars: 0,
      complete: false,
      queueLength: 0
    };
    let active = null;
    let revealed = 0;
    let phaseAt = 0;

    function displaySpeaker(line) {
      if (line.text.startsWith("SYSTEM:")) return "SYSTEM";
      if (line.text.startsWith("BABEL:")) return "BABEL";
      if (line.text.startsWith("NFF CONTROL:")) return "NFF CONTROL";
      if (line.text.startsWith("DAGGER 1")) return "DAGGER 1";
      if (line.text.startsWith("WARDEN 1")) return "WARDEN 1";
      if (line.text.startsWith("MULE 2")) return "MULE 2";
      if (line.speaker === "command") return "COMMAND";
      if (line.speaker === "wingman") return "WINGMAN";
      return "ENEMY";
    }

    function syncProbe() {
      const hook = window.__game;
      if (!hook || !hook.radio || hook.radio.__storyEvents2Proxy) return;
      const target = hook.radio;
      hook.radio = new Proxy(target, {
        get(base, prop) {
          if (prop === "__storyEvents2Proxy") return true;
          if (storyState.active && Object.prototype.hasOwnProperty.call(storyState, prop)) {
            return storyState[prop];
          }
          return base[prop];
        },
        set(base, prop, value) {
          base[prop] = value;
          return true;
        }
      });
    }

    function begin(line, now) {
      active = line;
      revealed = 0;
      phaseAt = now;
      panel.className = line.speaker;
      void panel.offsetWidth;
      panel.classList.add("visible");
      if (speakerNode) speakerNode.textContent = displaySpeaker(line);
      if (textNode) textNode.textContent = "";
      storyState.active = true;
      storyState.speakerId = line.speaker;
      storyState.lineId = line.id;
      storyState.text = line.text;
      storyState.revealedChars = 0;
      storyState.totalChars = line.text.length;
      storyState.complete = false;
    }

    function finish() {
      active = null;
      panel.classList.remove("visible");
      if (textNode) textNode.textContent = "";
      storyState.active = false;
      storyState.speakerId = null;
      storyState.lineId = null;
      storyState.text = "";
      storyState.revealedChars = 0;
      storyState.totalChars = 0;
      storyState.complete = false;
    }

    function tick(now) {
      syncProbe();
      storyState.queueLength = queue.length;
      if (!active && queue.length) begin(queue.shift(), now);
      if (active) {
        const targetChars = Math.min(active.text.length, Math.floor((now - phaseAt) / 30));
        if (targetChars > revealed) {
          revealed = targetChars;
          if (textNode) textNode.textContent = active.text.slice(0, revealed);
          storyState.revealedChars = revealed;
        }
        if (revealed >= active.text.length) {
          storyState.complete = true;
          const hold = Math.min(3200, 900 + active.text.length * 12);
          if (now - phaseAt >= active.text.length * 30 + hold) finish();
        }
      }
      window.requestAnimationFrame(tick);
    }

    window.requestAnimationFrame(tick);
    return {
      enqueue(speaker, text, id) {
        if (active && active.id === id) return;
        if (queue.some((line) => line.id === id)) return;
        queue.push({ speaker, text, id });
        storyState.queueLength = queue.length;
      },
      reset() {
        queue.length = 0;
        finish();
      }
    };
  }

  if (typeof window === "undefined" || typeof document === "undefined") return;

  function missionFor(key) {
    return MISSIONS.find((mission) => mission.key === key) || null;
  }

  function waveSize(wave) {
    if (!wave) return 0;
    if (wave.kind === "naval") return Array.isArray(wave.fleet) ? wave.fleet.length : 0;
    return Array.isArray(wave.types) ? wave.types.length : 0;
  }

  function firstDesignatedWaveSize(key) {
    const mission = missionFor(key);
    if (!mission || !Array.isArray(mission.waves)) return 1;
    const wave = mission.waves.find((entry) => entry.tgt !== false && !entry.concurrent);
    return Math.max(1, waveSize(wave));
  }

  function currentTgtRemaining(total) {
    const node = document.getElementById("tgtRemain");
    if (!node) return null;
    const value = Number.parseInt(node.textContent, 10);
    if (!Number.isFinite(value) || value < 0 || value > total) return null;
    return value;
  }

  function currentSortieMark(hook, mark) {
    const probe = hook && hook.debug && typeof hook.debug.markProbe === "function"
      ? hook.debug.markProbe()
      : null;
    const value = probe && probe.sortie ? Number(probe.sortie[mark]) || 0 : 0;
    return Math.max(0, Math.trunc(value));
  }

  const runtime = {
    active: false,
    key: null,
    total: 0,
    firstWaveSize: 1,
    enteredAt: 0,
    ready: false,
    sawPositive: false,
    routeMarks: 0,
    routeTaken: false,
    pendingResult: null,
    pendingAt: 0,
    flags: new Set()
  };

  function enterMission(key, hook) {
    const mission = missionFor(key);
    runtime.active = true;
    runtime.key = key;
    runtime.total = mission ? mission.totalTargets : 0;
    runtime.firstWaveSize = firstDesignatedWaveSize(key);
    runtime.enteredAt = performance.now();
    runtime.ready = false;
    runtime.sawPositive = false;
    runtime.routeMarks = key === "r08" ? currentSortieMark(hook, "routeBeacon") : 0;
    runtime.routeTaken = key === "m-escort"
      ? Number(ctx.marksTaken("r08", "routeBeacon")) > 0
      : false;
    runtime.pendingResult = null;
    runtime.pendingAt = 0;
    runtime.flags = new Set();
  }

  function leaveMission() {
    runtime.active = false;
    runtime.key = null;
    runtime.pendingResult = null;
    runtime.pendingAt = 0;
    runtime.flags = new Set();
  }

  function once(name, condition, action) {
    if (!condition || runtime.flags.has(name)) return;
    runtime.flags.add(name);
    action();
  }

  function hostRadioResetPassed(hook, expectedLineId) {
    if (hook && hook.radio && hook.radio.lineId === expectedLineId) return true;
    // Query-mode fallback and a guard against a future probe rename. The host's
    // fixed wave-clear beat is 1.35s, so 1.6s is safely on the far side of it.
    return runtime.pendingAt > 0 && performance.now() - runtime.pendingAt >= 1600;
  }

  function finalSignature(callsign, principleLine, principleSpeaker, id) {
    // Queued behind the host's fixed mission/outro reset rather than sent on the
    // kill frame: completeMission/startOutro clears the radio 1.35s later. A
    // critical two-line signature survives that reset and fits beside the stock
    // outro without deleting it.
    storyBurst([
      { speaker: "command", text: `SYSTEM: ROOT SIGNATURE MATCH / ARK-00 / ONE SEAT / ${callsign}`, id: `${id}-root` },
      { speaker: principleSpeaker, text: `${principleLine} / THE ARCHITECT TRANSFERRED`, id: `${id}-transfer` }
    ], false);
  }

  function updateRuntime(hook) {
    if (runtime.key === "r08") {
      const marks = currentSortieMark(hook, "routeBeacon");
      once("route-open", marks > runtime.routeMarks, () => {
        runtime.routeMarks = marks;
        storyBurst([
          { speaker: "command", text: "NFF CONTROL: ROUTE-13 beacon offline", id: "story-r08-route-offline" },
          { speaker: "wingman", text: "旧航路、ROUTE-13が開きました。……輸送機が通れます。", id: "story-r08-route-open" }
        ], true);
      });
      return;
    }

    const remain = currentTgtRemaining(runtime.total);
    if (remain === null) return;
    if (!runtime.ready) {
      if (remain === runtime.total || performance.now() - runtime.enteredAt >= 1000) {
        runtime.ready = true;
      } else {
        return;
      }
    }
    if (remain > 0) runtime.sawPositive = true;
    const tgtKills = Math.max(0, runtime.total - remain);

    if (runtime.key === "m02") {
      once("dagger-a02", runtime.sawPositive && tgtKills >= runtime.firstWaveSize, () => storyBurst([
        { speaker: "wingman", text: DAGGER_LAST_WORDS, id: "story-a02-dagger-last" },
        { speaker: "command", text: "DAGGER 1、応答なし。HAMMER 1、先頭へ。", id: "story-a02-inherit" }
      ], true));
      return;
    }

    if (runtime.key === "r02") {
      once("warden-r02", runtime.sawPositive && tgtKills >= runtime.firstWaveSize, () => storyBurst([
        { speaker: "wingman", text: WARDEN_LAST_WORDS, id: "story-r02-warden-last" },
        { speaker: "command", text: "WARDEN 1、応答なし。IRONBACK、攻勢を継続。", id: "story-r02-inherit" }
      ], true));
      return;
    }

    if (runtime.key === "m-escort") {
      once("mule-pending", runtime.sawPositive && remain === 0, () => {
        runtime.pendingResult = runtime.routeTaken ? "mule-lost" : "mule-safe";
        runtime.pendingAt = performance.now();
      });
      once("mule-result", Boolean(runtime.pendingResult)
        && hostRadioResetPassed(hook, "mission-outcome"), () => {
        if (runtime.pendingResult === "mule-lost") {
          storyBurst([
            { speaker: "wingman", text: "MULE 2: ROUTE-13進入。誘導が――", id: "story-a13-mule-last" },
            { speaker: "command", text: "SYSTEM: MULE 2 LOST / ROUTE-13", id: "story-a13-mule-lost" }
          ], false);
        } else {
          storyBurst([
            { speaker: "command", text: "ROUTE-13閉鎖。MULE 2、迂回。", id: "story-a13-route-closed" },
            { speaker: "wingman", text: "MULE 2: 了解。編隊へ復帰する。", id: "story-a13-mule-safe" }
          ], false);
        }
      });
      return;
    }

    if (runtime.key === "m05") {
      once("architect-a20-pending", runtime.sawPositive && remain === 0, () => {
        runtime.pendingResult = "architect-a20";
        runtime.pendingAt = performance.now();
      });
      once("architect-a20", runtime.pendingResult === "architect-a20"
        && hostRadioResetPassed(hook, "outro-scare"), () => finalSignature(
        "NIMROD",
        "BABEL: NON OMNIS MORIAR / DISTRIBUTED CONTROL ACCEPTED",
        "enemy",
        "story-a20"
      ));
      return;
    }

    if (runtime.key === "r20") {
      once("architect-r20-pending", runtime.sawPositive && remain === 0, () => {
        runtime.pendingResult = "architect-r20";
        runtime.pendingAt = performance.now();
      });
      once("architect-r20", runtime.pendingResult === "architect-r20"
        && hostRadioResetPassed(hook, "mission-outcome"), () => finalSignature(
        "IRONBACK",
        "NORTHSTAR: ORDO AB CHAO / INTEGRATED CONTROL ACCEPTED",
        "command",
        "story-r20"
      ));
    }
  }

  function tickStoryEvents2() {
    const hook = window.__game;
    const state = document.body.dataset.gameState || (hook && hook.state) || "";
    const key = (hook && hook.mission && hook.mission.key) || runtime.key;
    const activeState = state === "playing" || (runtime.active && state === "missionComplete");

    if (!activeState || !WATCHED_KEYS.has(key)) {
      if (runtime.active) leaveMission();
      return;
    }
    if (!runtime.active || runtime.key !== key) {
      if (state !== "playing") return;
      enterMission(key, hook);
    }
    updateRuntime(hook);
  }

  window.setInterval(tickStoryEvents2, 100);
}
