export default function register(ctx) {
const { GROUND_TYPES, ACE_PROFILES, MISSIONS } = ctx.tables;
const DAGGER_LAST_WORDS = "こちらDAGGER 1。HAMMER 1、お前が前に出ろ。";
const WARDEN_LAST_WORDS = "こちらWARDEN 1。IRONBACK、前へ出ろ。隊を止めるな。";
const daggerBase = ACE_PROFILES.atlas || ACE_PROFILES.longbow;
const wardenBase = ACE_PROFILES.fenrir || ACE_PROFILES.ironback;
const hatiBase = ACE_PROFILES.hati;
const daedalusBase = ACE_PROFILES.daedalus;
const beaconBase = GROUND_TYPES.ciws || GROUND_TYPES.radarSite || GROUND_TYPES.bunker;
if (!daggerBase || !wardenBase || !hatiBase || !daedalusBase || !beaconBase) {
throw new Error("[story-events-2] expected the existing ace and ground-type templates");
}
function aceFrom(base, overrides) {
return {
...base,
...overrides,
theme: { ...base.theme, ...(overrides.theme || {}) },
radio: { ...base.radio, ...(overrides.radio || {}) }
};
}
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
inbound: "敵編隊先頭、識別DAGGER 1。NIMROD隊の旧隊長機だ。",
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
wingman: "DAEDALUSがATLASを継いだ。隊長ではなく、役職を落としている。",
engage: "こちらDAEDALUS。ATLASの指定を継承する。",
down: daedalusBase.radio.down
}
}));
ctx.addGroundType("routeBeacon", {
...beaconBase,
key: "routeBeacon",
label: "ROUTE-08 BEACON",
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
function secondDesignatedIndex(sequence) {
let seen = 0;
for (let i = 0; i < sequence.length; i += 1) {
const wave = sequence[i];
if (wave.tgt === false || wave.concurrent) continue;
seen += 1;
if (seen === 2) return i;
}
return -1;
}
function withRadio(wave, lines) {
return { ...wave, radio: [...(wave.radio || []), ...lines] };
}
extendMission("m02", (mission) => {
const sequence = [...mission.sequence];
const at = secondDesignatedIndex(sequence);
if (at < 0) throw new Error("[story-events-2] m02 has no second designated engagement");
sequence.splice(at + 1, 0, {
types: ["su35"],
tgt: false,
concurrent: true,
role: "elite",
skill: "veteran",
band: 2,
delay: 1,
label: "NORTH CONTACT",
radio: [
{ speaker: "wingman", text: DAGGER_LAST_WORDS, id: "story-a02-dagger-last" },
{ speaker: "command", text: "DAGGER 1、応答なし。HAMMER 1、先頭へ。", id: "story-a02-inherit" }
]
});
return { ...mission, sequence };
});
extendMission("r19", (mission) => {
const sequence = [...mission.sequence];
const at = sequence.findIndex((wave) =>
wave.tgt !== false && Array.isArray(wave.types) && wave.types.includes("f15")
&& (wave.label === "NIMROD ELEMENT" || wave.types.length === 2)
);
if (at < 0) throw new Error("[story-events-2] r19 NIMROD element not found");
sequence[at] = withRadio({ ...sequence[at], ace: "dagger" }, [
{ speaker: "command", text: "先頭のF-15、識別DAGGER 1。NIMRODの旧隊長機だ。", id: "story-r19-dagger-id" }
]);
return { ...mission, sequence };
});
extendMission("r02", (mission) => {
const sequence = [...mission.sequence];
const at = secondDesignatedIndex(sequence);
if (at < 0) throw new Error("[story-events-2] r02 has no second designated engagement");
sequence.splice(at + 1, 0, {
types: ["f15"],
tgt: false,
concurrent: true,
role: "elite",
skill: "veteran",
band: 1,
delay: 1,
label: "EAST CONTACT",
radio: [
{ speaker: "wingman", text: WARDEN_LAST_WORDS, id: "story-r02-warden-last" },
{ speaker: "command", text: "WARDEN 1、応答なし。IRONBACK、攻勢を継続。", id: "story-r02-inherit" }
]
});
return { ...mission, sequence };
});
extendMission("m04", (mission) => ({
...mission,
sequence: [
...mission.sequence,
{
types: ["su33"],
ace: "warden",
band: 1,
skill: "expert",
label: "WARDEN",
radio: [
{ speaker: "command", text: "新たなネームド、WARDEN 1。IRONBACK隊の指揮機だ。", id: "story-a19-warden-id" }
]
}
]
}));
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
extendMission("m-train", (mission) => ({
...mission,
sequence: [
...mission.sequence,
{
types: ["mig21", "mig29", "su33", "su35"],
role: "trash",
skill: "rookie",
band: 1,
label: "PATTERN 4",
radio: [
{ speaker: "enemy", text: "BABEL: 4 patterns acquired", id: "story-a10-pattern-4" }
]
},
{
types: ["su47", "su57"],
role: "line",
skill: "regular",
band: 2,
label: "PATTERN 2",
radio: [
{ speaker: "enemy", text: "BABEL: 撃墜を確認。パターンを保存 / 2 composites", id: "story-a10-pattern-2" }
]
},
{
types: ["su37"],
ace: "vulture",
band: 1,
label: "PATTERN 1",
radio: [
{ speaker: "enemy", text: "BABEL: Integration complete / 1 pattern", id: "story-a10-pattern-1" }
]
}
]
}));
extendMission("r11", (mission) => ({
...mission,
sequence: [
...mission.sequence,
{
types: ["f35c"],
role: "line",
skill: "veteran",
band: 1,
label: "ROUTE 1",
radio: [
{ speaker: "enemy", text: "SYSTEM: Route origin / 1 instance", id: "story-r11-route-1" }
]
},
{
types: ["f15", "f15"],
role: "line",
skill: "regular",
band: 2,
label: "ROUTE 2",
radio: [
{ speaker: "enemy", text: "SYSTEM: Route migrated / 2 instances", id: "story-r11-route-2" }
]
},
{
types: ["f16", "f16", "f16", "f16"],
role: "trash",
skill: "rookie",
band: 1,
label: "ROUTE 4",
radio: [
{ speaker: "enemy", text: "SYSTEM: Route migrated / 4 instances", id: "story-r11-route-4" }
]
}
]
}));
extendMission("m-squadron", (mission) => {
const sequence = [...mission.sequence];
const at = sequence.findIndex((wave) => wave.ace === "hati");
if (at < 0) throw new Error("[story-events-2] HATI wave not found in m-squadron");
sequence[at] = withRadio({ ...sequence[at], ace: "fenrirSuccessor" }, [
{ speaker: "command", text: "FENRIR撃墜確認", id: "story-fenrir-down" },
{ speaker: "enemy", text: "違う。落ちたのは機体だけだ。", id: "story-fenrir-heir" },
{ speaker: "command", text: "SYSTEM: FENRIR designation transferred", id: "story-fenrir-transfer" }
]);
return { ...mission, sequence };
});
extendMission("r18", (mission) => {
const sequence = [...mission.sequence];
const at = sequence.findIndex((wave) => wave.ace === "daedalus");
if (at < 0) throw new Error("[story-events-2] DAEDALUS wave not found in r18");
sequence[at] = withRadio({ ...sequence[at], ace: "atlasSuccessor" }, [
{ speaker: "command", text: "ATLAS撃墜確認", id: "story-atlas-down" },
{ speaker: "enemy", text: "違う。落ちたのは機体だけだ。", id: "story-atlas-heir" },
{ speaker: "command", text: "SYSTEM: ATLAS designation transferred", id: "story-atlas-transfer" }
]);
return { ...mission, sequence };
});
extendMission("m05", (mission) => ({
...mission,
sequence: [
...mission.sequence,
{
types: ["mig21", "mig21", "mig21", "mig21"],
role: "trash",
skill: "rookie",
band: 1,
label: "DISTRIBUTED ROOT",
radio: [
{ speaker: "command", text: "SYSTEM: BABEL authority distributed / 4 nodes", id: "story-a20-distributed" },
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
role: "elite",
skill: "expert",
band: 2,
label: "UNIFIED ROOT",
radio: [
{ speaker: "command", text: "SYSTEM: DELUGE routes merged / 1 root", id: "story-r20-unified" },
{ speaker: "wingman", text: "塔は倒れた。形を変えただけだ。", id: "story-r20-tower" }
]
}
]
}));
const PRIORITY_CRITICAL = 2;
const WATCHED_KEYS = new Set(["r08", "m-escort", "m05", "r20"]);
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
let active = null;
let revealed = 0;
let phaseAt = 0;
function speakerLabel(line) {
if (line.text.startsWith("SYSTEM:")) return "SYSTEM";
if (line.text.startsWith("BABEL:")) return "BABEL";
if (line.text.startsWith("MULE 2")) return "MULE 2";
if (line.speaker === "command") return "COMMAND";
if (line.speaker === "wingman") return "WINGMAN";
return "ENEMY";
}
function begin(line, now) {
active = line;
revealed = 0;
phaseAt = now;
panel.className = line.speaker;
void panel.offsetWidth;
panel.classList.add("visible");
if (speakerNode) speakerNode.textContent = speakerLabel(line);
if (textNode) textNode.textContent = "";
}
function finish() {
active = null;
panel.classList.remove("visible");
if (textNode) textNode.textContent = "";
}
function tick(now) {
if (!active && queue.length) begin(queue.shift(), now);
if (active) {
const targetChars = Math.min(active.text.length, Math.floor((now - phaseAt) / 30));
if (targetChars > revealed) {
revealed = targetChars;
if (textNode) textNode.textContent = active.text.slice(0, revealed);
}
if (revealed >= active.text.length) {
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
enteredAt: 0,
ready: false,
sawPositive: false,
routeMarks: 0,
routeTaken: false,
flags: new Set()
};
function enterMission(key, hook) {
const mission = missionFor(key);
runtime.active = true;
runtime.key = key;
runtime.total = mission ? mission.totalTargets : 0;
runtime.enteredAt = performance.now();
runtime.ready = false;
runtime.sawPositive = false;
runtime.routeMarks = key === "r08" ? currentSortieMark(hook, "routeBeacon") : 0;
runtime.routeTaken = key === "m-escort"
? Number(ctx.marksTaken("r08", "routeBeacon")) > 0
: false;
runtime.flags = new Set();
}
function leaveMission() {
runtime.active = false;
runtime.key = null;
runtime.flags = new Set();
}
function once(name, condition, action) {
if (!condition || runtime.flags.has(name)) return;
runtime.flags.add(name);
action();
}
function finalSignature(callsign, id) {
storyBurst([
{ speaker: "command", text: "SYSTEM: ROOT SIGNATURE MATCH", id: `${id}-root` },
{ speaker: "command", text: "SYSTEM: ARK-00", id: `${id}-ark` },
{ speaker: "command", text: `SYSTEM: CURRENT AIRCRAFT: ${callsign} / ONE SEAT AVAILABLE`, id: `${id}-seat` }
], true);
}
function updateRuntime(hook) {
if (runtime.key === "r08") {
const marks = currentSortieMark(hook, "routeBeacon");
once("route-open", marks > runtime.routeMarks, () => {
runtime.routeMarks = marks;
storyBurst([
{ speaker: "command", text: "NORTHSTAR: ROUTE-08 beacon offline", id: "story-r08-route-offline" },
{ speaker: "wingman", text: "航路が開いた。輸送機を通せます。", id: "story-r08-route-open" }
], true);
});
return;
}
const remain = currentTgtRemaining(runtime.total);
if (remain === null) return;
if (!runtime.ready) {
if (remain === runtime.total || performance.now() - runtime.enteredAt >= 800) {
runtime.ready = true;
} else {
return;
}
}
if (remain > 0) runtime.sawPositive = true;
const tgtKills = Math.max(0, runtime.total - remain);
if (runtime.key === "m-escort") {
once("mule-result", runtime.total > 0 && tgtKills >= Math.min(4, runtime.total), () => {
if (runtime.routeTaken) {
storyBurst([
{ speaker: "command", text: "MULE 2、ROUTE-08で被弾。高度低下。", id: "story-a13-mule-hit" },
{ speaker: "wingman", text: "MULE 2！ 応答しろ！", id: "story-a13-mule-call" },
{ speaker: "command", text: "MULE 2、信号消失。", id: "story-a13-mule-lost" }
], true);
} else {
storyBurst([
{ speaker: "command", text: "MULE 2、ROUTE-08閉鎖を確認。迂回航路へ。", id: "story-a13-mule-divert" },
{ speaker: "wingman", text: "MULE 2、編隊へ復帰。", id: "story-a13-mule-safe" }
], true);
}
});
return;
}
if (runtime.key === "m05") {
once("architect-a20", runtime.sawPositive && remain === 0, () => finalSignature("NIMROD", "story-a20"));
return;
}
if (runtime.key === "r20") {
once("architect-r20", runtime.sawPositive && remain === 0, () => finalSignature("IRONBACK", "story-r20"));
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
if (!runtime.active) {
if (state !== "playing") return;
enterMission(key, hook);
} else if (runtime.key !== key) {
if (state !== "playing") return;
enterMission(key, hook);
}
updateRuntime(hook);
}
window.setInterval(tickStoryEvents2, 100);
}
