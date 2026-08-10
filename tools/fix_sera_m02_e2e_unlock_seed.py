#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
E2E = ROOT / "tools" / "check_sera_m02_e2e.mjs"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


source = E2E.read_text(encoding="utf-8")
source = replace_once(
    source,
    '''  await context.addInitScript(() => { navigator.getGamepads = () => []; });''',
    '''  await context.addInitScript(() => {
    navigator.getGamepads = () => [];
    // M02 is the second campaign sortie. The test enters it directly through
    // the focused launcher, so seed only M01's normal prerequisite record.
    // M02 itself must still write its own result before slot 3 can unlock.
    const records = JSON.parse(localStorage.getItem("sortieMissionRecords") || "{}");
    records.m01 = records.m01 || {
      cleared: true,
      rank: "A",
      scores: [0],
      times: [0]
    };
    localStorage.setItem("sortieMissionRecords", JSON.stringify(records));
  });''',
    "M02 prerequisite record seed",
)
source = replace_once(
    source,
    '''  // Clearing M02 should unlock the next stock sortie and its normal briefing.
  await page.evaluate(() => document.getElementById("changeMissionBtn")?.click());
  await waitForState(page, "missionSelect", 10_000);
  const nextMission = await page.evaluate(() => {
    const debug = window.__game.debug;
    const m03Index = debug.missionIndexOf("m03");
    const selected = m03Index >= 0 && debug.forceMissionCursor(m03Index);
    const confirmed = selected && debug.forceConfirmMission();
    return { m03Index, selected, confirmed, state: document.body.dataset.gameState };
  });
  assert(nextMission.m03Index >= 0 && nextMission.selected && nextMission.confirmed,
    "clearing M02 did not allow M03 briefing selection", nextMission);''',
    '''  // The reboot has implemented only the first two mission slots so far.
  // The current third USA slot is still the stock `m-heli` placeholder; a
  // future M03 payload will replace that slot. M02 must unlock the slot itself,
  // not skip over it to the old stock key named `m03` in slot four.
  await page.evaluate(() => document.getElementById("changeMissionBtn")?.click());
  await waitForState(page, "missionSelect", 10_000);
  const nextMission = await page.evaluate(() => {
    const debug = window.__game.debug;
    const nextSlotKey = "m-heli";
    const nextSlotIndex = debug.missionIndexOf(nextSlotKey);
    const selected = nextSlotIndex >= 0 && debug.forceMissionCursor(nextSlotIndex);
    const confirmed = selected && debug.forceConfirmMission();
    return {
      nextSlotKey,
      nextSlotIndex,
      selected,
      confirmed,
      state: document.body.dataset.gameState,
      records: JSON.parse(localStorage.getItem("sortieMissionRecords") || "{}")
    };
  });
  assert(nextMission.nextSlotIndex >= 0 && nextMission.selected && nextMission.confirmed,
    "clearing M02 did not unlock the current third campaign slot", nextMission);''',
    "M02 next-slot unlock assertion",
)
E2E.write_text(source, encoding="utf-8")
print("fix_sera_m02_e2e_unlock_seed: seeded M01 and targeted the current third campaign slot")
