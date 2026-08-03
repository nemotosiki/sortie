// Story events batch 1: the R06 -> A15 causal pair.
//
// R06 gains three optional power-grid relays.  Their destruction is recorded
// under one mark because A15 only asks how much of the grid the player chose to
// take down, not which missile hit which cabinet.  A15 then spends that count
// one district at a time as its three two-bomber streams are destroyed.
//
// This payload intentionally does not touch index.html, AIRCRAFT_TYPES, any HP
// multiplier, or any mission outside r06 and m-city.
export default function register(ctx) {
  const { GROUND_TYPES, MISSIONS } = ctx.tables;

  const relayBase = GROUND_TYPES.bunker;
  if (!relayBase) {
    throw new Error("[story-events-1] expected the stock bunker ground type");
  }

  // A compact switching/transformer house.  Unknown ground-model keys use the
  // hardened-building silhouette, which is a better read for a substation than
  // a gun or radar dish; no new renderer branch is needed.
  ctx.addGroundType("gridRelay", {
    ...relayBase,
    key: "gridRelay",
    label: "GRID RELAY",
    role: "Power Grid Relay",
    hp: 54,
    hitRadius: 19,
    aa: null,
    smokeHeight: 6,
    explosionColor: 0x8ec8ff,
    radarColor: "#7dd9ff"
  });

  // Re-register an existing mission through addMission so totalTargets,
  // totalContacts, waves and waveCount are all recalculated by the normal path.
  function extendMission(key, makeReplacement) {
    const at = MISSIONS.findIndex((mission) => mission.key === key);
    if (at <= 0) {
      throw new Error(`[story-events-1] mission ${key} not found at a replaceable index`);
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

  // These are the next deterministic corridor ridges beyond the four military
  // installations already placed by enemy_variety_1.  x = +/-405 puts each
  // relay on the OUTER face of a known ridge (ridge centres are +/-350), so it
  // cannot be taken cleanly from the centreline: the player has to continue
  // beyond the defended ladder and go around a wall to get a shot.
  const relayUnits = [
    { id: 51, type: "gridRelay", x: -405, z: -3200, heading: -1.57, tgt: false, mark: "gridRelay" },
    { id: 52, type: "gridRelay", x: 405, z: -5000, heading: 1.57, tgt: false, mark: "gridRelay" },
    { id: 53, type: "gridRelay", x: -405, z: -5600, heading: -1.57, tgt: false, mark: "gridRelay" }
  ];

  extendMission("r06", (mission) => ({
    ...mission,
    groundUnits: [
      ...(mission.groundUnits || []),
      ...relayUnits
    ]
  }));

  function relayCountNow() {
    const value = Number(ctx.marksTaken("r06", "gridRelay")) || 0;
    return Math.max(0, Math.min(3, Math.trunc(value)));
  }

  // A15's powered route has three district batteries.  All three objects are
  // always present, which keeps totalContacts honest.  At spawn time each
  // getter asks for the LATEST R06 record: a mission table is registered at
  // boot, but the player may fly R06 and then A15 without reloading the page.
  // Destroyed relays replace their battery with an inert GRID RELAY cabinet;
  // untouched relays leave the corresponding SAM/CIWS live.
  function districtDefense(id, activeType, disabledAt, x, z, heading) {
    const unit = { id, x, z, heading, tgt: false };
    Object.defineProperty(unit, "type", {
      enumerable: true,
      configurable: false,
      get() {
        return relayCountNow() >= disabledAt ? "gridRelay" : activeType;
      }
    });
    return unit;
  }

  extendMission("m-city", (mission) => ({
    ...mission,
    groundUnits: [
      ...(mission.groundUnits || []),
      // Outside the 1450 m building ring but on the city's flat 1900 m
      // plateau, so the batteries neither overlap a tower nor stand in water.
      districtDefense(61, "samSite", 1, -1550, -9000, -1.57), // GRID-C
      districtDefense(62, "ciws", 2, 0, -7450, 0),            // GRID-B
      districtDefense(63, "samSite", 3, 1550, -9000, 1.57)   // GRID-A
    ]
  }));

  // -------------------------------------------------------------------------
  // Runtime story cues
  // -------------------------------------------------------------------------
  // In the production splice, this function is lifted into index.html's module
  // and can call the existing radio queue directly.  The development loader
  // imports payloads as separate ES modules, so its lexical scope cannot see
  // triggerRadioLine/resetRadio.  Prefer an exposed ctx bridge if the host ever
  // provides one; otherwise use the core queue when inlined and a tiny visual
  // preview only for ?payloads= development mode.  No global schema is added.
  const PRIORITY_CRITICAL = 3;
  const districtLines = [
    "CITY GRID: GRID-C、電力喪失",
    "CITY GRID: GRID-B、医療回線停止",
    "CITY GRID: GRID-A、応答なし"
  ];
  const relayLines = [
    "NFF CONTROL: GRID-C relay offline",
    "NFF CONTROL: GRID-B relay offline",
    "NFF CONTROL: GRID-A relay offline"
  ];

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

  // Query-mode preview for the dev loader.  It deliberately reuses the game's
  // existing radio DOM/CSS by cloning the already-cached panel; production
  // never enters this path because triggerRadioLine is lexically available
  // after tools/inline_payload.mjs performs the splice.
  function createFallbackRadio() {
    const original = document.getElementById("radioPanel");
    const panel = original ? original.cloneNode(true) : document.createElement("div");
    if (!original) {
      panel.id = "radioPanel";
      panel.innerHTML = '<span id="radioSpeaker"></span><span id="radioText"></span>';
      document.body.appendChild(panel);
    } else {
      panel.dataset.storyEventsPreview = "1";
      panel.style.zIndex = "36";
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
      if (line.text.startsWith("CITY GRID:")) return "CITY GRID";
      if (line.text.startsWith("NFF CONTROL:")) return "NFF CONTROL";
      if (line.speaker === "command") return "COMMAND";
      if (line.speaker === "wingman") return "WINGMAN";
      return "ENEMY";
    }

    function syncProbe() {
      const hook = window.__game;
      if (!hook || !hook.radio || hook.radio.__storyEventsProxy) return;
      const target = hook.radio;
      const proxy = new Proxy(target, {
        get(base, prop) {
          if (prop === "__storyEventsProxy") return true;
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
      hook.radio = proxy;
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

  const runtime = {
    key: null,
    playing: false,
    r06Marks: 0,
    r06HintSent: false,
    cityRelayCount: 0,
    cityThresholds: [],
    cityNext: 0,
    cityLightsLineSent: false,
    cityStartedAt: 0
  };

  function isPlaying(hook) {
    const bodyState = document.body.dataset.gameState;
    return bodyState ? bodyState === "playing" : Boolean(hook && hook.state === "playing");
  }

  function currentSortieMarks(hook) {
    const probe = hook && hook.debug && typeof hook.debug.markProbe === "function"
      ? hook.debug.markProbe()
      : null;
    const value = probe && probe.sortie ? Number(probe.sortie.gridRelay) || 0 : 0;
    return Math.max(0, Math.min(3, Math.trunc(value)));
  }

  function enterMission(key, hook) {
    runtime.key = key;
    runtime.playing = true;
    runtime.r06Marks = key === "r06" ? currentSortieMarks(hook) : 0;
    runtime.r06HintSent = runtime.r06Marks > 0;
    runtime.cityRelayCount = key === "m-city" ? relayCountNow() : 0;
    runtime.cityNext = 0;
    runtime.cityLightsLineSent = false;
    runtime.cityStartedAt = performance.now();

    // Three districts against three existing bomber streams.  If only one or
    // two relays were taken, the affected districts are assigned to the LAST
    // one or two streams; therefore the final affected district still falls at
    // the same instant as the final bomber, while untouched districts stay lit.
    const firstAffectedStream = 3 - runtime.cityRelayCount;
    runtime.cityThresholds = Array.from(
      { length: runtime.cityRelayCount },
      (_, index) => (firstAffectedStream + index + 1) * 2
    );
  }

  function leaveMission() {
    runtime.key = null;
    runtime.playing = false;
    runtime.cityThresholds = [];
    runtime.cityNext = 0;
  }

  function updateR06(hook) {
    const marks = currentSortieMarks(hook);
    if (marks <= runtime.r06Marks) return;

    const lines = [];
    for (let count = runtime.r06Marks + 1; count <= marks; count += 1) {
      lines.push({
        speaker: "command",
        text: relayLines[count - 1],
        id: `story-r06-grid-${count}`
      });
      if (!runtime.r06HintSent) {
        lines.push({
          speaker: "wingman",
          text: "……了解。",
          id: "story-r06-not-military"
        });
        runtime.r06HintSent = true;
      }
    }
    runtime.r06Marks = marks;
    storyBurst(lines, true);
  }

  function cityFinalBurst(finalDistrictIndex) {
    const cityText = runtime.cityRelayCount === 3
      ? `${districtLines[finalDistrictIndex]}。市内全区画、消灯`
      : districtLines[finalDistrictIndex];
    storyBurst([
      { speaker: "command", text: "敵航空戦力、全滅", id: "story-city-air-clear" },
      { speaker: "wingman", text: cityText, id: `story-city-grid-${finalDistrictIndex + 1}` },
      { speaker: "command", text: "防衛任務成功", id: "story-city-success" }
    ], true);
  }

  function updateCity(hook) {
    // The no-relay route must not be silence: the lights are alive, and so are
    // the three district batteries placed above.  Let the stock intro lines get
    // out first so this does not overflow the four-line core queue.
    if (runtime.cityRelayCount === 0 && !runtime.cityLightsLineSent
        && performance.now() - runtime.cityStartedAt >= 4200) {
      runtime.cityLightsLineSent = true;
      storyBurst([
        {
          speaker: "command",
          text: "CITY GRID: GRID-A / GRID-B / GRID-C、全区画オンライン",
          id: "story-city-grid-live"
        },
        {
          speaker: "wingman",
          text: "街の明かりが見える。……防空網も生きてるぞ。",
          id: "story-city-defense-live"
        }
      ], false);
    }

    if (runtime.cityRelayCount <= 0) return;
    const kills = Math.max(0, Math.trunc(Number(hook.kills) || 0));
    if (runtime.cityNext >= runtime.cityThresholds.length) return;

    const due = [];
    while (runtime.cityNext < runtime.cityThresholds.length
        && kills >= runtime.cityThresholds[runtime.cityNext]) {
      due.push(runtime.cityNext);
      runtime.cityNext += 1;
    }
    if (!due.length) return;

    const finalIndex = runtime.cityRelayCount - 1;
    if (due.includes(finalIndex)) {
      // The sixth bomber has already run completeMission(), which resets the
      // stock queue and speaks its generic outcome.  Interrupt once here so the
      // authored three-line ending lands in the required order and within the
      // same beat as the kill.
      cityFinalBurst(finalIndex);
      return;
    }

    storyBurst(due.map((index) => ({
      speaker: "command",
      text: districtLines[index],
      id: `story-city-grid-${index + 1}`
    })), true);
  }

  function tickStoryEvents() {
    const hook = window.__game;
    const key = hook && hook.mission ? hook.mission.key : null;
    const playing = isPlaying(hook);

    if (!playing || (key !== "r06" && key !== "m-city")) {
      if (runtime.playing) leaveMission();
      return;
    }
    if (!runtime.playing || runtime.key !== key) enterMission(key, hook);

    if (key === "r06") updateR06(hook);
    else updateCity(hook);
  }

  window.setInterval(tickStoryEvents, 100);
}
