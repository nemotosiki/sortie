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
    // the focused launcher, so seed only M01's normal prerequisite record;
    // M02 itself must still write its own result before M03 can unlock.
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
E2E.write_text(source, encoding="utf-8")
print("fix_sera_m02_e2e_unlock_seed: seeded only the M01 prerequisite for M02-to-M03 unlock verification")
