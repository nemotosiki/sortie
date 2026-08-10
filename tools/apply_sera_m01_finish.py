#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAYLOAD = ROOT / "payloads" / "mission_sera_m01.payload.js"
STATIC = ROOT / "tools" / "check_sera_m01_payload.mjs"
E2E = ROOT / "tools" / "check_sera_m01_e2e.mjs"
STATUS = ROOT / "docs" / "implementation" / "sera_act1_status.md"
PERMANENT_WORKFLOW = ROOT / ".github" / "workflows" / "verify-sera-m01-e2e.yml"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def write_text(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")
    if "\r" in content:
        raise SystemExit(f"{path}: CR characters are not allowed")


payload = PAYLOAD.read_text(encoding="utf-8")
payload = replace_once(
    payload,
    "//   - fields ROOK 1 CROWN and ROOK 3 LARK as two distinct blue wingmen",
    "//   - fields CROWN in an F-15C and LARK in an F-16C as distinct blue wingmen",
    "payload wingman contract",
)
payload = replace_once(
    payload,
    '  for (const type of ["tu22m3", "mig29", "f16"]) {',
    '  for (const type of ["tu22m3", "mig29", "f16", "f15c"]) {',
    "payload required aircraft",
)
payload = replace_once(
    payload,
    '''        {
          type: "f16",
          label: "ROOK 1 CROWN",''',
    '''        {
          type: "f15c",
          label: "ROOK 1 CROWN",''',
    "payload CROWN airframe",
)
payload = replace_once(
    payload,
    "ROOK 1 CROWNとROOK 3 LARKが同行する。",
    "ROOK 1 CROWNはF-15C、ROOK 3 LARKはF-16Cで同行する。",
    "payload briefing aircraft",
)
write_text(PAYLOAD, payload)

static_check = r'''#!/usr/bin/env node
// Runtime-contract check for payloads/mission_sera_m01.payload.js.
//
// This imports a temporary .mjs copy of the payload, supplies the smallest
// compatible registry context, and proves that the stock first mission is
// replaced in place with the canonical M01 encounter.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const PAYLOAD = path.join(ROOT, "payloads", "mission_sera_m01.payload.js");

function fail(message) {
  console.error(`check_sera_m01_payload: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

if (!fs.existsSync(PAYLOAD)) fail(`missing ${path.relative(ROOT, PAYLOAD)}`);
const source = fs.readFileSync(PAYLOAD, "utf8");
assert(!source.includes("\r"), "payload must be LF-only");
assert(source.includes('world: "renBay"'), "mission does not select renBay");
assert(source.includes("friendlyBase:"), "mission has no bomber strike destination");
assert(source.includes("bomberBreach:"), "mission has no breach contract");
assert(source.includes("wingmen:"), "mission has no two-wingman roster");
assert(source.includes('"f15c"'), "canonical CROWN F-15C dependency is missing");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sera-m01-check-"));
const tempModule = path.join(tempDir, "mission_sera_m01.mjs");
fs.writeFileSync(tempModule, source, "utf8");

try {
  const moduleUrl = `${pathToFileURL(tempModule).href}?v=${Date.now()}`;
  const { default: register } = await import(moduleUrl);
  assert(typeof register === "function", "default export is not register(ctx)");

  const stockMission = {
    key: "m01",
    campaign: "usa",
    world: "archipelagoDay",
    title: "OLD FIRST CONTACT",
    sequence: [{ types: ["tu95", "tu95"] }],
    map: { x: 0.2, y: 0.2 },
    parTime: 180
  };

  const MISSIONS = [stockMission];
  const ctx = {
    tables: {
      MISSIONS,
      WORLD_PRESETS: { renBay: {} },
      AIRCRAFT_TYPES: { tu22m3: {}, mig29: {}, f16: {}, f15c: {} },
      ENEMY_AI_PROFILES: { tu22m3: {}, mig29: {} }
    },
    addMission(def) {
      for (const required of ["key", "title", "sequence", "map"]) {
        assert(def[required] !== undefined, `replacement missing ${required}`);
      }
      assert(!MISSIONS.some((mission) => mission.key === def.key), `duplicate mission key ${def.key}`);
      const normalized = Object.freeze({
        ...def,
        waves: def.sequence,
        waveCount: def.sequence.filter((wave) => !wave.concurrent).length
      });
      MISSIONS.push(normalized);
      return normalized;
    }
  };

  register(ctx);

  assert(MISSIONS.length === 1, `expected one mission after replacement, got ${MISSIONS.length}`);
  const mission = MISSIONS[0];
  assert(mission.key === "m01", `first mission key changed to ${mission.key}`);
  assert(mission.title === "FIRST CONTACT", `unexpected title ${mission.title}`);
  assert(mission.world === "renBay", `unexpected world ${mission.world}`);
  assert(mission.parTime === 660, `unexpected parTime ${mission.parTime}`);
  assert(mission.sequence.length === 7, `expected 7 sequence entries, got ${mission.sequence.length}`);
  assert(mission.waveCount === 4, `expected 4 principal phases, got ${mission.waveCount}`);

  const tgtWaves = mission.sequence.filter((wave) => wave.tgt !== false);
  const optionalWaves = mission.sequence.filter((wave) => wave.tgt === false);
  const tgt = tgtWaves.reduce((sum, wave) => sum + wave.types.length, 0);
  const optional = optionalWaves.reduce((sum, wave) => sum + wave.types.length, 0);
  const bombers = mission.sequence.flatMap((wave) => wave.types).filter((type) => type === "tu22m3").length;
  const escorts = mission.sequence.flatMap((wave) => wave.types).filter((type) => type === "mig29").length;

  assert(tgt === 6, `expected 6 red TGT contacts, got ${tgt}`);
  assert(optional === 10, `expected 10 white optional contacts, got ${optional}`);
  assert(bombers === 6, `expected 6 Tu-22M3 bombers, got ${bombers}`);
  assert(escorts === 10, `expected 10 MiG-29 contacts, got ${escorts}`);
  assert(optionalWaves.every((wave) => wave.rankNeutral === true), "white M01 contacts must be rank-neutral");

  const tutorial = mission.sequence[0];
  assert(tutorial.tgt === false, "tutorial contacts must be white/non-TGT");
  assert(tutorial.gate?.mode === "clearOrTimeout", "tutorial phase gate is missing");
  assert(tutorial.gate?.timeout === 75, `unexpected tutorial timeout ${tutorial.gate?.timeout}`);
  assert(Array.isArray(tutorial.at) && tutorial.at.length === 2, "tutorial has no authored approach point");

  assert(mission.friendlies?.wingmen?.length === 2, "expected CROWN and LARK wingmen");
  const crown = mission.friendlies.wingmen.find((wingman) => wingman.label === "ROOK 1 CROWN");
  const lark = mission.friendlies.wingmen.find((wingman) => wingman.label === "ROOK 3 LARK");
  assert(crown, "CROWN wingman missing");
  assert(lark, "LARK wingman missing");
  assert(crown.type === "f15c", `CROWN must fly f15c in M01, got ${crown.type}`);
  assert(lark.type === "f16", `LARK must fly f16 in M01, got ${lark.type}`);
  assert(crown.radioSpeaker === "crown", "CROWN radio identity missing");
  assert(lark.radioSpeaker === "lark", "LARK radio identity missing");
  assert(mission.friendlies.playerStart?.facing, "player start has no authored facing point");

  assert(mission.bomberBreach?.sCapAt === 1, "one-breach S cap missing");
  assert(mission.bomberBreach?.failAt === 2, "two-breach failure threshold missing");
  assert(mission.successRadio?.speaker === "meridian", "success is not owned by MERIDIAN");
  assert(mission.failureRadio?.speaker === "meridian", "failure is not owned by MERIDIAN");
  assert(mission.friendlyBase?.label === "REN BAY AIRPORT", "friendlyBase contract missing");
  assert(mission.battleRadius === 15000, `unexpected battleRadius ${mission.battleRadius}`);

  const speakerIds = new Set([
    ...mission.introRadio.map((line) => line.speaker),
    ...mission.sequence.flatMap((wave) => wave.radio || []).map((line) => line.speaker)
  ]);
  for (const speaker of ["meridian", "crown", "lark"]) {
    assert(speakerIds.has(speaker), `${speaker} has no authored M01 line`);
  }

  console.log("check_sera_m01_payload: PASS");
  console.log(`  mission=${mission.key} world=${mission.world} TGT=${tgt} WHITE=${optional} phases=${mission.waveCount}`);
  console.log(`  wingmen=CROWN:${crown.type} / LARK:${lark.type} breach=${mission.bomberBreach.sCapAt}/${mission.bomberBreach.failAt}`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
'''
write_text(STATIC, static_check)

e2e = r'''#!/usr/bin/env node
import { chromium } from "playwright";

const baseUrl = process.env.SORTIE_BASE_URL || "http://127.0.0.1:8000";
const missionUrl = `${baseUrl}/index.html?payloads=payloads/map_renBay.payload.js,payloads/mission_sera_m01.payload.js`;

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details === null ? "" : `\n${JSON.stringify(details, null, 2)}`;
  throw new Error(`check_sera_m01_e2e: ${message}${suffix}`);
}

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=swiftshader", "--disable-gpu-sandbox", "--disable-dev-shm-usage"]
});

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(() => { navigator.getGamepads = () => []; });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  async function waitForState(expected, timeout = 30_000) {
    await page.waitForFunction(
      (state) => document.body.dataset.gameState === state,
      expected,
      { timeout }
    );
  }

  async function waitForRadioLine(fragments, timeout = 15_000) {
    const expected = Array.isArray(fragments) ? fragments : [fragments];
    await page.waitForFunction(
      (needles) => {
        const fullText = window.__game?.debug?.radioProbe?.()?.fullText || "";
        return needles.some((needle) => fullText.includes(needle));
      },
      expected,
      { timeout }
    );
  }

  async function advanceBriefingToHangar() {
    await waitForState("briefing");
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const state = await page.evaluate(() => document.body.dataset.gameState);
      if (state === "ready") return;
      await page.click("#briefingNextBtn");
      await page.waitForTimeout(120);
    }
    await waitForState("ready");
  }

  async function startCurrentSortie() {
    const selected = await page.evaluate(() => window.__game.debug.forceSelectAircraft("f16"));
    assert(selected, "F-16C could not be selected in the hangar");
    await page.click("#startBtn");
    await waitForState("playing");
    await page.waitForTimeout(300);
  }

  async function retryCurrentMission() {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const state = await page.evaluate(() => document.body.dataset.gameState);
      if (state === "playing") return;
      await page.click("#retryBtn");
      await page.waitForTimeout(180);
    }
    await waitForState("playing", 10_000);
  }

  await page.goto(missionUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(
    () => Boolean(
      window.__game
      && window.__game.debug?.forceCampaignCursor
      && window.__game.seraM01Probe
    ),
    null,
    { timeout: 120_000 }
  );

  const payloads = await page.evaluate(() => window.__APPLIED_PAYLOADS__ || []);
  const hasPayload = (inlineId, filePath) => payloads.includes(inlineId) || payloads.includes(filePath);
  assert(hasPayload("map_renBay", "payloads/map_renBay.payload.js"),
    "Ren Bay payload did not load", payloads);
  assert(hasPayload("mission_sera_m01", "payloads/mission_sera_m01.payload.js"),
    "M01 payload did not load", payloads);

  // Exercise the real campaign -> mission -> briefing -> hangar -> launch flow,
  // rather than jumping directly into startMission().
  const routed = await page.evaluate(() => {
    const debug = window.__game.debug;
    const campaignSelected = debug.forceCampaignCursor("usa");
    const campaignConfirmed = campaignSelected && debug.forceConfirmCampaign();
    const m01Index = debug.missionIndexOf("m01");
    const missionSelected = campaignConfirmed && m01Index >= 0 && debug.forceMissionCursor(m01Index);
    const missionConfirmed = missionSelected && debug.forceConfirmMission();
    return {
      campaignSelected,
      campaignConfirmed,
      m01Index,
      missionSelected,
      missionConfirmed,
      state: document.body.dataset.gameState
    };
  });
  assert(routed.campaignSelected && routed.campaignConfirmed, "USA campaign could not be opened", routed);
  assert(routed.m01Index >= 0 && routed.missionSelected && routed.missionConfirmed,
    "M01 could not be selected through the mission screen", routed);

  await advanceBriefingToHangar();
  await startCurrentSortie();

  let probe = await page.evaluate(() => window.__game.seraM01Probe());
  assert(probe.missionKey === "m01", "wrong mission booted", probe);
  assert(probe.worldKey === "renBay", "M01 did not use Ren Bay", probe);

  const wingmen = probe.friendlies.filter((friendly) => friendly.kind === "wingman");
  assert(wingmen.length === 2, "M01 did not field two ROOK wingmen", wingmen);
  const crown = wingmen.find((wingman) => wingman.label === "ROOK 1 CROWN");
  const lark = wingmen.find((wingman) => wingman.label === "ROOK 3 LARK");
  assert(crown?.radioSpeaker === "crown", "CROWN was not fielded with his own radio identity", wingmen);
  assert(lark?.radioSpeaker === "lark", "LARK was not fielded with her own radio identity", wingmen);
  assert(crown?.type === "f15c", "M01 CROWN did not spawn in the canonical F-15C", wingmen);
  assert(lark?.type === "f16", "M01 LARK did not spawn in the canonical F-16C", wingmen);
  const separation = Math.hypot(
    wingmen[0].position[0] - wingmen[1].position[0],
    wingmen[0].position[1] - wingmen[1].position[1],
    wingmen[0].position[2] - wingmen[1].position[2]
  );
  assert(separation > 120, "CROWN and LARK spawned in the same formation slot", { separation, wingmen });

  assert(probe.activeGate?.timeout === 75, "opening clear-or-timeout gate is not active", probe.activeGate);
  assert(probe.enemies.length === 2, "opening phase did not contain exactly two contacts", probe.enemies);
  assert(probe.enemies.every((enemy) => enemy.type === "mig29"), "opening contacts were not MiG-29s", probe.enemies);
  assert(probe.enemies.every((enemy) => enemy.tgt === false && enemy.disposition === "HOSTILE_OPTIONAL"),
    "opening contacts were not white optional hostiles", probe.enemies);
  assert(probe.enemies.every((enemy) => Math.abs(enemy.position[0] - 8200) < 1800),
    "opening contacts ignored the authored east-southeast approach", probe.enemies);

  let perfect = await page.evaluate(() => window.__game.seraM01PerfectRankPreview());
  assert(perfect === "S", "a clean M01 was not S-capable", perfect);

  const advanced = await page.evaluate(() => window.__game.forceSeraM01AdvancePhase());
  assert(advanced, "opening phase could not advance on timeout");
  await page.waitForTimeout(300);
  probe = await page.evaluate(() => window.__game.seraM01Probe());
  const firstBombers = probe.enemies.filter((enemy) => enemy.type === "tu22m3" && enemy.tgt);
  assert(firstBombers.length === 2, "first red bomber pair did not spawn", probe.enemies);
  assert(firstBombers.every((enemy) => enemy.disposition === "TGT" && enemy.strike),
    "first bomber pair was not red TGT strike traffic", firstBombers);
  assert(probe.enemies.filter((enemy) => !enemy.tgt).length === 4,
    "tutorial survivors plus first escorts did not remain white", probe.enemies);
  perfect = await page.evaluate(() => window.__game.seraM01PerfectRankPreview());
  assert(perfect === "S", "clean defence lost S after the first bomber group", perfect);

  const terminalOnFirst = await page.evaluate(() => window.__game.forceSeraM01Breach());
  assert(terminalOnFirst === false, "one bomber breach ended M01");
  await page.waitForTimeout(250);
  probe = await page.evaluate(() => window.__game.seraM01Probe());
  assert(probe.state === "playing" && probe.base?.hits === 1,
    "one breach did not continue with one recorded hit", probe);
  perfect = await page.evaluate(() => window.__game.seraM01PerfectRankPreview());
  assert(perfect !== "S", "one breach did not remove S eligibility", perfect);

  const terminalOnSecond = await page.evaluate(() => window.__game.forceSeraM01Breach());
  assert(terminalOnSecond === true, "two bomber breaches did not end M01");
  await waitForState("gameover", 10_000);
  await waitForRadioLine(["爆撃機2機", "防空任務を中止"]);
  probe = await page.evaluate(() => window.__game.seraM01Probe());
  const failureRadio = await page.evaluate(() => window.__game.debug.radioProbe());
  assert(probe.base?.hits === 2, "second breach was not recorded", probe);
  assert(probe.radio.speaker === "MERIDIAN", "breach failure was not called by MERIDIAN", probe.radio);
  assert(
    failureRadio.fullText.includes("爆撃機2機") || failureRadio.fullText.includes("防空任務を中止"),
    "M01 breach failure line did not activate",
    failureRadio
  );

  // Retry through the real result button. If an epilogue layer owns the first
  // click, the helper finishes it and clicks once more.
  await retryCurrentMission();
  await page.waitForTimeout(300);
  probe = await page.evaluate(() => window.__game.seraM01Probe());
  assert(probe.missionKey === "m01" && probe.state === "playing", "retry did not restart M01", probe);
  assert(probe.base?.hits === 0, "retry did not reset bomber breaches", probe.base);
  assert(probe.activeGate?.timeout === 75, "retry did not restore the opening gate", probe.activeGate);
  assert(probe.enemies.length === 2 && probe.enemies.every((enemy) => enemy.type === "mig29"),
    "retry did not restore the opening contact pair", probe.enemies);
  const retryWingmen = probe.friendlies.filter((friendly) => friendly.kind === "wingman");
  assert(retryWingmen.some((wingman) => wingman.label === "ROOK 1 CROWN" && wingman.type === "f15c"),
    "retry lost CROWN's F-15C", retryWingmen);
  assert(retryWingmen.some((wingman) => wingman.label === "ROOK 3 LARK" && wingman.type === "f16"),
    "retry lost LARK's F-16C", retryWingmen);

  // Red TGTs alone are enough to clear: white contacts may survive, MERIDIAN
  // owns the return call, and the result screen must unlock the next sortie.
  const completed = await page.evaluate(() => window.__game.forceSeraM01Complete());
  assert(completed, "forced clean clear did not reach the accomplished hold");
  await waitForRadioLine(["レン湾上空クリア", "帰投せよ"]);
  probe = await page.evaluate(() => window.__game.seraM01Probe());
  const successRadio = await page.evaluate(() => window.__game.debug.radioProbe());
  assert(probe.outcomePending === true, "clean clear did not enter the accomplished hold", probe);
  assert(probe.enemies.some((enemy) => enemy.tgt === false),
    "clean clear incorrectly required every white hostile to be destroyed", probe.enemies);
  assert(probe.radio.speaker === "MERIDIAN", "success was not called by MERIDIAN", probe.radio);
  assert(
    successRadio.fullText.includes("レン湾上空クリア") || successRadio.fullText.includes("帰投せよ"),
    "M01 success line did not activate",
    successRadio
  );
  await waitForState("missionComplete", 10_000);

  await page.click("#changeMissionBtn");
  await waitForState("missionSelect", 10_000);
  const nextMission = await page.evaluate(() => {
    const debug = window.__game.debug;
    const m02Index = debug.missionIndexOf("m02");
    const selected = m02Index >= 0 && debug.forceMissionCursor(m02Index);
    const confirmed = selected && debug.forceConfirmMission();
    return {
      m02Index,
      selected,
      confirmed,
      state: document.body.dataset.gameState
    };
  });
  assert(nextMission.m02Index >= 0 && nextMission.selected,
    "clearing M01 did not unlock/select M02", nextMission);
  assert(nextMission.confirmed, "M02 could not enter its briefing", nextMission);

  await advanceBriefingToHangar();
  await startCurrentSortie();
  probe = await page.evaluate(() => window.__game.seraM01Probe());
  assert(probe.missionKey === "m02" && probe.state === "playing",
    "the stock mission after M01 no longer boots", probe);

  assert(pageErrors.length === 0, "pageerror occurred", pageErrors);
  assert(consoleErrors.length === 0, "console error occurred", consoleErrors);
  console.log("check_sera_m01_e2e: PASS");
  console.log("  real menu flow -> Ren Bay M01 -> fail -> retry -> clean clear -> M02 boot");
  console.log("  CROWN=f15c / LARK=f16 / white tutorial / red bomber phases");
  console.log("  one breach removes S / two breaches=FAILED / white survivors allowed on clear");
} finally {
  await browser.close();
}
'''
write_text(E2E, e2e)

status = r'''# Sera ACT I — 実装ステータス台帳

このファイルは「何を作るか」ではなく、**GitHub上に何が実在し、どの範囲まで自動検証済みか**を記録する。

**更新日:** 2026-08-10
**対象ブランチ:** `chatgpt/sera-act1-implementation`

## 現在地

- M01 `FIRST CONTACT`: **自動E2Eでテストプレイ可能**
- 人間による10〜12分の通しプレイ／難易度別バランス調整: **未完了**
- M02〜M05: **未実装**
- 開発起動URL:

```text
index.html?payloads=payloads/map_renBay.payload.js,payloads/mission_sera_m01.payload.js
```

## M01で実在・検証済み

- [x] Ren Bayマップを使用
- [x] キャンペーン選択→ミッション選択→ブリーフィング→機体選択→出撃の通常UI経路
- [x] ROOK 1 CROWNとROOK 3 LARKを別々の青い僚機として生成
- [x] 正史機体: CROWN=`f15c` / LARK=`f16`
- [x] MERIDIAN / CROWN / LARKの個別無線話者
- [x] 開幕の白いMiG-29×2と75秒clear-or-timeoutゲート
- [x] 赤TGTのTu-22M3×6
- [x] 白い非TGTのMiG-29×10（開幕2＋護衛8）
- [x] 白敵はランク母数外で、残存していてもクリア可能
- [x] 爆撃機0突破＝完全防衛
- [x] 爆撃機1突破＝任務続行、S不可
- [x] 爆撃機2突破＝MISSION FAILED
- [x] 失敗後のRetryで突破数・初期ウェーブ・僚機編成がリセット
- [x] クリーンクリア後にM02を選択して起動可能
- [x] pageerror 0 / console error 0
- [x] registry gate / 三色IFF / Ren Bay / M01 host契約がgreen

## 永続回帰ゲート

`.github/workflows/verify-sera-m01-e2e.yml` は今後、M01・Ren Bay・host・検証コードの変更時に次を再確認する。

1. 静的契約
2. registry消失検査
3. Chromium実機起動
4. 通常メニュー経路
5. 失敗→Retry
6. クリーンクリア→M02起動
7. CROWN F-15C / LARK F-16C

一時的なコード注入・自己削除・自動コミットは行わない、読み取り専用CIとする。

## M01を「完成」と呼ぶ前に残る作業

- [ ] 人間がNORMALを最初から最後まで飛び、標準10〜12分に収まるか確認
- [ ] EASY / HARD / ACEの敵圧とSランク可能性を確認
- [ ] 無線が実際の戦闘テンポに対して遅れないか耳で確認
- [ ] Ren Bayの視認性・敵進入方向・爆撃機の投弾線を実画面で確認
- [ ] BGM／効果音／音量の実耳確認
- [ ] payload運用のまま次ミッションを作るか、本体へinlineする時期を決定

## 次の実装

M01の人間プレイ調整と並行して、M02 `SHATTERED MORNING`へ進む。M01のhost拡張（複数僚機、個別話者、三色IFF、突破ルール）は再実装せず再利用する。

## 報告判定

- `GitHub保存済み`: commit SHA + branch HEAD + file refetch確認済み
- `静的check済み`: 構文・契約check green
- `E2E済み`: Chromiumで対象経路を実行し、pageerror 0
- `テストプレイ可能`: 通常UIから開始し、clear / fail / retry / 次ミッション起動が自動E2Eで通る
- `完成`: 上記に加え、人間の通しプレイと難易度／音／視認性の確認が終わった状態
'''
write_text(STATUS, status)

workflow = r'''name: Verify Sera M01 in Chromium

on:
  workflow_dispatch:
  push:
    branches:
      - chatgpt/sera-act1-implementation
    paths:
      - index.html
      - payloads/map_renBay.payload.js
      - payloads/mission_sera_m01.payload.js
      - tools/check_air_iff_foundation.mjs
      - tools/check_map_ren_bay.mjs
      - tools/check_sera_m01_*.mjs
      - tools/check_legacy_airframe_variants.mjs
      - tools/check_multirole_mobility_balance.mjs
      - .github/workflows/verify-sera-m01-e2e.yml

permissions:
  contents: read

concurrency:
  group: verify-sera-m01-e2e
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          ref: chatgpt/sera-act1-implementation

      - name: Run static contracts
        run: |
          node tools/check_air_iff_foundation.mjs
          node tools/check_map_ren_bay.mjs
          node tools/check_sera_m01_payload.mjs
          node tools/check_sera_m01_wave_host.mjs
          node tools/check_sera_m01_rook_host.mjs
          node tools/check_sera_m01_breach_host.mjs
          node tools/check_sera_m01_tu22_strike.mjs
          node tools/check_legacy_airframe_variants.mjs
          node tools/check_multirole_mobility_balance.mjs

      - name: Install Chromium harness
        run: |
          npm install --no-save playwright@1.54.2
          npx playwright install --with-deps chromium

      - name: Run registry gate
        shell: bash
        run: |
          chrome_path=$(node -e "process.stdout.write(require('playwright').chromium.executablePath())")
          SORTIE_PLAYWRIGHT=playwright SORTIE_CHROME="$chrome_path" node tools/registry_gate.mjs

      - name: Run M01 browser E2E
        shell: bash
        run: |
          python -m http.server 8000 --bind 127.0.0.1 > /tmp/sortie-http.log 2>&1 &
          server_pid=$!
          trap 'kill $server_pid || true' EXIT
          for attempt in {1..30}; do
            if curl -fsS http://127.0.0.1:8000/index.html > /dev/null; then break; fi
            sleep 1
          done
          node tools/check_sera_m01_e2e.mjs
'''
write_text(PERMANENT_WORKFLOW, workflow)

print("apply_sera_m01_finish: patched canonical wingmen, E2E flow, status, and permanent CI")
