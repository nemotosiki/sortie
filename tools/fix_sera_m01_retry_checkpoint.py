#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
E2E = ROOT / "tools" / "check_sera_m01_e2e.mjs"
STATUS = ROOT / "docs" / "implementation" / "sera_act1_status.md"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


e2e = E2E.read_text(encoding="utf-8")
old = '''  const terminalOnSecond = await page.evaluate(() => window.__game.forceSeraM01Breach());
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

'''
new = '''  const checkpointBeforeFailure = await page.evaluate(() => window.__game.debug.checkpointProbe());
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

  // Retry through the real result button. A mission with a banked checkpoint
  // resumes there; a mission without one restarts at the opening pair. Both
  // paths must clear the breach count and preserve the canonical ROOK aircraft.
  await retryCurrentMission();
  await page.waitForFunction(
    () => {
      const state = window.__game?.seraM01Probe?.();
      return Boolean(state && (state.activeGate || state.enemies.length > 0));
    },
    null,
    { timeout: 10_000 }
  );
  probe = await page.evaluate(() => window.__game.seraM01Probe());
  const checkpointAfterRetry = await page.evaluate(() => window.__game.debug.checkpointProbe());
  assert(probe.missionKey === "m01" && probe.state === "playing", "retry did not restart M01", probe);
  assert(probe.base?.hits === 0, "retry did not reset bomber breaches", probe.base);
  const openingRestart = probe.activeGate?.timeout === 75
    && probe.enemies.length === 2
    && probe.enemies.every((enemy) => enemy.type === "mig29");
  const checkpointResume = checkpointBeforeFailure.active
    && checkpointAfterRetry.used
    && probe.missionWaveIndex >= checkpointBeforeFailure.waveIndex
    && probe.enemies.length > 0;
  assert(openingRestart || checkpointResume,
    "retry restored neither the opening state nor the banked checkpoint",
    { probe, checkpointBeforeFailure, checkpointAfterRetry });
  const retryWingmen = probe.friendlies.filter((friendly) => friendly.kind === "wingman");
  assert(retryWingmen.some((wingman) => wingman.label === "ROOK 1 CROWN" && wingman.type === "f15c"),
    "retry lost CROWN's F-15C", retryWingmen);
  assert(retryWingmen.some((wingman) => wingman.label === "ROOK 3 LARK" && wingman.type === "f16"),
    "retry lost LARK's F-16C", retryWingmen);

'''
e2e = replace_once(e2e, old, new, "checkpoint-aware retry E2E")
e2e = replace_once(
    e2e,
    '  console.log("  real menu flow -> Ren Bay M01 -> fail -> retry -> clean clear -> M02 boot");',
    '  console.log("  real menu flow -> Ren Bay M01 -> fail -> checkpoint-safe retry -> clean clear -> M02 boot");',
    "E2E summary",
)
E2E.write_text(e2e, encoding="utf-8")

status = STATUS.read_text(encoding="utf-8")
status = replace_once(
    status,
    "- [x] 失敗後のRetryで突破数・初期ウェーブ・僚機編成がリセット",
    "- [x] 失敗後のRetryで突破数・僚機編成をリセットし、保存済みチェックポイントから再開",
    "status retry wording",
)
status = replace_once(
    status,
    "5. 失敗→Retry\n",
    "5. 失敗→Retry（チェックポイント対応）\n",
    "status CI wording",
)
STATUS.write_text(status, encoding="utf-8")

print("fix_sera_m01_retry_checkpoint: aligned E2E with the game's checkpoint retry contract")
