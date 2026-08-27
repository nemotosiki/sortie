#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  RADIO_SPEAKER_IDS,
  createRadioController
} from "../src/ui/radio.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const payloadDir = path.join(root, "payloads");
const payloadFiles = fs.readdirSync(payloadDir)
  .filter((name) => /^mission_sera_m\d\d\.payload\.js$/.test(name))
  .sort();
const assert = (condition, message, details = null) => {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : "";
  throw new Error(`check_sera_radio_canon: ${message}${suffix}`);
};

const radioFields = new Set([
  "text", "inbound", "wingman", "engage", "down",
  "lossRadio", "failRadio", "safeRadio", "asmRadio", "killRadio"
]);
const texts = [];
const speakerIds = new Set();
for (const file of payloadFiles) {
  const source = fs.readFileSync(path.join(payloadDir, file), "utf8");
  for (const match of source.matchAll(/\bspeaker:\s*"([^"]+)"/g)) speakerIds.add(match[1]);
  for (const match of source.matchAll(/\b([A-Za-z]+):\s*"((?:[^"\\]|\\.)*)"/g)) {
    if (!radioFields.has(match[1])) continue;
    texts.push({ file, field: match[1], text: match[2] });
  }
}

const registered = new Set(RADIO_SPEAKER_IDS);
const missingSpeakers = [...speakerIds].filter((speaker) => !registered.has(speaker));
assert(missingSpeakers.length === 0,
  "authored Sera radio uses unregistered speakers", missingSpeakers);
for (const speaker of ["meridian", "crown", "lark", "halo", "pax", "epoch", "hearth", "strike"]) {
  assert(registered.has(speaker), `required Sera speaker is missing: ${speaker}`);
}

// These phrases are implementation notes or UI descriptions, not things a
// pilot/controller says over the radio. TGT itself remains allowed because
// MERIDIAN uses it as an in-world target designation throughout the campaign.
const forbidden = [
  /HP/, /ゲージ/, /HUD/, /白い四角/, /青い三角/, /2\.1倍/, /評価母数/,
  /選択もロック/, /ロック不能/, /王でも権限/, /進捗\d/, /作戦記録/,
  /最後まで古い/, /最後の盾/
];
const metaLines = texts.filter((entry) => forbidden.some((pattern) => pattern.test(entry.text)));
assert(metaLines.length === 0,
  "radio still contains UI/debug/design-note language", metaLines);

const m16 = fs.readFileSync(path.join(payloadDir, "mission_sera_m16.payload.js"), "utf8");
assert(/speaker: "epoch"[^\n]+GIBOR/.test(m16),
  "M16 no longer introduces GIBOR through EPOCH praise");
assert(!/GIBOR[^\n]+(?:権限|王でも)/.test(m16),
  "M16 explains the internal GIBOR design over radio");

const m20 = fs.readFileSync(path.join(payloadDir, "mission_sera_m20.payload.js"), "utf8");
assert(!/最後まで古い|最後の盾|朝まで空を残そう/.test(m20),
  "M20 restored forbidden finale/death-flag dialogue");

const classList = { add() {}, remove() {} };
const panel = { className: "", classList, offsetWidth: 0 };
const speakerNode = { textContent: "" };
const textNode = { textContent: "" };
const controller = createRadioController({
  panel,
  speakerNode,
  textNode,
  getCampaignId: () => "sera",
  resolveSpeakerLabel: (speaker) => speaker === "wingman" ? "LARK" : null,
  playTone() {},
  getPlayerNickname: () => "RAVEN"
});
assert(controller.triggerLine("wingman", "TEST", 1, "wingman-test"),
  "dynamic Sera wingman line was rejected");
controller.update(0.1);
assert(speakerNode.textContent === "LARK",
  "dynamic post-M06 wingman label did not resolve to LARK", speakerNode.textContent);

for (const speaker of ["epoch", "hearth", "strike"]) {
  controller.reset();
  assert(controller.triggerLine(speaker, "TEST", 1, `${speaker}-test`),
    `${speaker} line was rejected`);
  controller.update(0.1);
  assert(speakerNode.textContent.length > 0,
    `${speaker} did not render a speaker label`);
}

console.log("check_sera_radio_canon: PASS");
console.log(`  ${payloadFiles.length} missions / ${texts.length} radio strings / ${speakerIds.size} authored speakers`);
