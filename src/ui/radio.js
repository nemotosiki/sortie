// Radio presentation and queue ownership.
//
// This module owns only radio state, scheduling and DOM presentation. Combat,
// mission and campaign state stay in index.html and enter through callbacks, so
// the dependency direction remains main -> radio rather than radio -> game.

const RADIO_SPEAKERS = {
  command: { label: "SKYEYE", toneFreq: 620, toneType: "square" },
  wingman: { label: "HAMMER 2", toneFreq: 460, toneType: "sine" },
  enemy: { label: "HOSTILE", toneFreq: 340, toneType: "sawtooth" },
  // Reboot missions use explicit identities instead of overloading the legacy
  // command/wingman channels. The old ids remain untouched for all forty stock
  // missions; only a mission that authors one of these ids sees the new label.
  meridian: { label: "MERIDIAN", toneFreq: 620, toneType: "square" },
  crown: { label: "CROWN", toneFreq: 460, toneType: "sine" },
  lark: { label: "LARK", toneFreq: 520, toneType: "triangle" }
};

// Per-campaign overrides. `enemy` is deliberately absent: "HOSTILE" is what
// the other side is called from either cockpit. Explicit reboot identities do
// not need overrides because their label is already mission-specific.
const RADIO_SPEAKER_LABELS = {
  usa: { command: "SKYEYE", wingman: "HAMMER 2" },
  rus: { command: "NORTHSTAR", wingman: "SICKLE 2" }
};

export const RADIO_PRIORITY = { NORMAL: 1, URGENT: 2, CRITICAL: 3 };

export const KILL_CALLOUTS = [
  "撃墜確認！ ナイスショット！",
  "命中！ いい腕だ！",
  "落ちるぞ！",
  "また1機減らしたな！",
  "撃墜だ！ その調子で行け！"
];

export const RADIO_FEAR_STAGES = [
  {
    minKills: 1,
    entry: {
      speaker: "enemy",
      priority: RADIO_PRIORITY.NORMAL,
      text: "2番機が撃墜された。隊形を維持しろ——敵は1機だけだ。"
    },
    support: null,
    pool: [
      "作戦通りに行け。まぐれだ。",
      "全機、隊形を締めろ。後方を確認しろ。",
      "1機やられた程度で何も変わらん。攻撃を続けろ。"
    ]
  },
  {
    minKills: 2,
    entry: {
      speaker: "enemy",
      priority: RADIO_PRIORITY.NORMAL,
      text: "2機目だと！？ 何なんだこいつは！"
    },
    support: null,
    pool: [
      "隊長、スコープに映らない…どこにいる！？",
      "こっちは各個撃破されてるぞ！",
      "単機で仕掛けるな！ 今すぐ2機1組になれ！"
    ]
  },
  {
    minKills: 4,
    entry: {
      speaker: "enemy",
      priority: RADIO_PRIORITY.URGENT,
      text: "こっちが切り刻まれてる！ ブレイク！ ブレイク！"
    },
    support: {
      speaker: "wingman",
      priority: RADIO_PRIORITY.NORMAL,
      text: "敵が浮足立ってるぞ。そのまま押し続けろ！"
    },
    pool: [
      "振り切れない！ 振り切れないんだ！",
      "メーデー！ メーデー！ 2番機、墜ちる！",
      "あれは{nickname}だ…あんな飛び方をする奴が他にいるものか！",
      "増援はどうした！？ 今すぐ増援を回せ！"
    ]
  },
  {
    minKills: 6,
    entry: {
      speaker: "enemy",
      priority: RADIO_PRIORITY.URGENT,
      text: "全機、戦闘を中止しろ！ この空は{nickname}のものだ！"
    },
    support: {
      speaker: "command",
      priority: RADIO_PRIORITY.NORMAL,
      text: "敵の通信が崩壊している。奴らは君をこう呼んでいる——{nickname}、と。"
    },
    pool: [
      "こんな所で死んでたまるか。俺は離脱する！",
      "来るな…来るなァ！",
      "{nickname}には勝てない。誰も{nickname}には勝てないんだ。"
    ]
  }
];

const RADIO_QUEUE_MAX = 4;
const RADIO_CHAR_INTERVAL = 0.03;
const RADIO_HOLD_BASE = 1.8;
const RADIO_HOLD_PER_CHAR = 0.024;
const RADIO_HOLD_MAX = 6.4;
// Lines hold ~2x longer now, so a NORMAL can no longer be allowed to block a
// CRITICAL for its whole hold: higher priority pre-empts the active line.
// Pre-empted lines are dropped, not requeued - replaying a situation report
// seconds after the situation moved on reads worse than losing it.
const RADIO_NORMAL_MAX_QUEUE_AGE = 8.0;
const RADIO_MIN_GAP = 0.3;
const RADIO_SPEAKER_COOLDOWN = 4.5;
const RADIO_LINE_COOLDOWN = 25;

export function createRadioController({
  panel,
  speakerNode,
  textNode,
  getCampaignId,
  playTone,
  getPlayerNickname
}) {
  const queue = [];
  // Derived from the registry so adding a speaker cannot create an undefined
  // cooldown slot. Legacy and reboot speakers all obey the same scheduler.
  const speakerReadyAt = Object.fromEntries(
    Object.keys(RADIO_SPEAKERS).map((speakerId) => [speakerId, 0])
  );
  let lineReadyAt = {};
  let gapUntil = 0;
  // The radio runs on its own clock rather than missionElapsed: the mission
  // timer stops the moment the sortie is decided (and never runs in menus),
  // which would otherwise wedge every gap/cooldown gate shut and swallow the
  // debrief-side lines.
  let clock = 0;

  const state = {
    active: false,
    speakerId: null,
    lineId: null,
    priority: 0,
    fullText: "",
    revealedChars: 0,
    charTimer: 0,
    holdTimer: 0
  };

  function speakerLabel(speakerId) {
    const perCampaign = RADIO_SPEAKER_LABELS[getCampaignId()];
    const override = perCampaign && perCampaign[speakerId];
    if (override) return override;
    const speaker = RADIO_SPEAKERS[speakerId];
    return speaker ? speaker.label : "";
  }

  function clearActiveLine() {
    state.active = false;
    state.speakerId = null;
    state.lineId = null;
    state.priority = 0;
    state.fullText = "";
    state.revealedChars = 0;
    state.charTimer = 0;
    state.holdTimer = 0;
    textNode.textContent = "";
    panel.classList.remove("visible");
  }

  function startLine(request) {
    const speaker = RADIO_SPEAKERS[request.speakerId];
    speakerReadyAt[request.speakerId] = clock + RADIO_SPEAKER_COOLDOWN;
    lineReadyAt[request.id] = clock + RADIO_LINE_COOLDOWN;

    state.active = true;
    state.speakerId = request.speakerId;
    state.lineId = request.id;
    state.priority = request.priority;
    state.fullText = request.text;
    state.revealedChars = 0;
    state.charTimer = RADIO_CHAR_INTERVAL;
    state.holdTimer = Math.min(
      RADIO_HOLD_MAX,
      RADIO_HOLD_BASE + request.text.length * RADIO_HOLD_PER_CHAR
    );

    playTone(speaker.toneFreq, 0.1, 0.09, speaker.toneType);

    speakerNode.textContent = speakerLabel(request.speakerId);
    panel.className = request.speakerId;
    void panel.offsetWidth;
    panel.classList.add("visible");
    textNode.textContent = "";
  }

  function triggerLine(speakerId, text, priority = RADIO_PRIORITY.NORMAL, id = null) {
    if (!RADIO_SPEAKERS[speakerId] || typeof text !== "string" || text.length === 0) return false;
    // Substituted here, at the single entrance every caller shares. When only
    // say() substituted, the mission tables' authored lines (which reach
    // triggerLine directly) shipped a literal "{nickname}" to the panel.
    const resolvedText = text.replace(/\{nickname\}/g, () => getPlayerNickname());
    const resolvedPriority = Number.isFinite(priority) ? Math.trunc(priority) : RADIO_PRIORITY.NORMAL;
    const resolvedId = id ? String(id) : `${speakerId}:${resolvedText.slice(0, 24)}`;
    if ((lineReadyAt[resolvedId] || 0) > clock) return false;
    if (queue.some((request) => request.id === resolvedId)) return false;

    const request = {
      id: resolvedId,
      speakerId,
      text: resolvedText,
      priority: resolvedPriority,
      queuedAt: clock
    };

    // A line that outranks what is on screen starts immediately rather than
    // waiting out the (now much longer) hold. Strictly greater-than, so equal
    // priorities never pre-empt each other and FIFO order is preserved.
    // Checked BEFORE the capacity eviction below: a pre-empting line never
    // enters the queue, so it must not cost the queue its lowest waiter.
    if (state.active && resolvedPriority > state.priority) {
      clearActiveLine();
      startLine(request);
      return true;
    }

    if (queue.length >= RADIO_QUEUE_MAX) {
      let worstIdx = 0;
      for (let i = 1; i < queue.length; i += 1) {
        if (queue[i].priority < queue[worstIdx].priority) worstIdx = i;
      }
      if (resolvedPriority <= queue[worstIdx].priority) return false;
      queue.splice(worstIdx, 1);
    }

    queue.push(request);
    queue.sort((a, b) => b.priority - a.priority || a.queuedAt - b.queuedAt);
    return true;
  }

  function update(dt) {
    clock += dt;
    if (state.active) {
      if (state.revealedChars < state.fullText.length) {
        state.charTimer -= dt;
        while (state.charTimer <= 0 && state.revealedChars < state.fullText.length) {
          state.revealedChars += 1;
          state.charTimer += RADIO_CHAR_INTERVAL;
        }
        textNode.textContent = state.fullText.slice(0, state.revealedChars);
      } else {
        state.holdTimer -= dt;
        if (state.holdTimer <= 0) {
          gapUntil = clock + RADIO_MIN_GAP;
          clearActiveLine();
        }
      }
      return;
    }

    if (clock < gapUntil || queue.length === 0) return;

    // Stale NORMALs are dropped at pickup: a situation report that has been
    // waiting 8s describes a fight that has already moved on. URGENT and
    // CRITICAL always play, however long they waited.
    for (let i = queue.length - 1; i >= 0; i -= 1) {
      const queued = queue[i];
      if (
        queued.priority <= RADIO_PRIORITY.NORMAL &&
        clock - queued.queuedAt > RADIO_NORMAL_MAX_QUEUE_AGE
      ) queue.splice(i, 1);
    }
    if (queue.length === 0) return;

    const idx = queue.findIndex(
      (request) => (speakerReadyAt[request.speakerId] || 0) <= clock
    );
    if (idx === -1) return;

    startLine(queue.splice(idx, 1)[0]);
  }

  function reset() {
    queue.length = 0;
    state.active = false;
    state.speakerId = null;
    state.lineId = null;
    state.priority = 0;
    state.fullText = "";
    state.revealedChars = 0;
    state.charTimer = 0;
    state.holdTimer = 0;
    for (const speakerId of Object.keys(speakerReadyAt)) speakerReadyAt[speakerId] = 0;
    lineReadyAt = {};
    gapUntil = 0;
    clock = 0;
    speakerNode.textContent = "";
    textNode.textContent = "";
    panel.classList.remove("visible");
  }

  function say(speaker, text, priority, id) {
    // Substitution lives in triggerLine now (the shared entrance), so this is
    // a plain alias kept for its established call sites.
    return triggerLine(speaker, text, priority, id);
  }

  function isIdle() {
    return !state.active && queue.length === 0;
  }

  return {
    state,
    queue,
    get clock() { return clock; },
    triggerLine,
    update,
    reset,
    say,
    isIdle
  };
}
