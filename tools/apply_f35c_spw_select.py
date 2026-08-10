#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
STATIC = ROOT / "tools" / "check_fa18f_spw_select.mjs"
BROWSER = ROOT / "tools" / "check_fa18f_spw_select_browser.mjs"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def patch_index() -> None:
    source = INDEX.read_text(encoding="utf-8")
    start_marker = '      f35c: Object.freeze({\n        id: "f35c",'
    start = source.find(start_marker)
    if start < 0:
        raise SystemExit("index: AIRCRAFT_TYPES.f35c block not found")
    end = source.find("\n      }),", start)
    if end < 0:
        raise SystemExit("index: AIRCRAFT_TYPES.f35c block end not found")
    end += len("\n      }),")
    block = source[start:end]

    old_blurb = '        blurb: "艦載型の第5世代ステルス機。突出した最高値は持たないが弱点も無く、大型主翼による安定と堅牢な機体で、あらゆる任務を水準以上にこなす。対艦ミサイルの静かな運び手として、艦隊の懐へ忍び寄る。",'
    new_blurb = '        blurb: "艦載型の第5世代ステルス機。出撃前に4AAM・4AGM・LASMを選択し、制空・対地・対艦へ任務ごとに構成を変えられる。大型主翼による安定と堅牢な機体、低被探知性を活かし、あらゆる任務を高水準でこなす。",'
    block = replace_once(block, old_blurb, new_blurb, "index f35c blurb")

    old_spw = '        spw: Object.freeze({ key: "lasm", capacity: 14 }),' 
    new_spw = '''        spw: Object.freeze({ key: "aam4", capacity: 16 }),
        spwChoices: Object.freeze([
          Object.freeze({ key: "aam4", capacity: 16 }),
          Object.freeze({ key: "agm4", capacity: 12 }),
          Object.freeze({ key: "lasm", capacity: 14 })
        ]),'''
    block = replace_once(block, old_spw, new_spw, "index f35c loadout")
    source = source[:start] + block + source[end:]
    INDEX.write_text(source, encoding="utf-8")


def patch_static() -> None:
    source = STATIC.read_text(encoding="utf-8")
    anchor = '''assert(fa18.includes('Object.freeze({ key: "lasm", capacity: 12 })'), "anti-ship choice missing");
assert((source.match(/spwChoices:/g) || []).length === 1, "SP.W selection must remain exclusive to F/A-18F");'''
    replacement = '''assert(fa18.includes('Object.freeze({ key: "lasm", capacity: 12 })'), "anti-ship choice missing");

const f35Match = source.match(/      f35c: Object\\.freeze\\(\\{\\n        id: "f35c",[\\s\\S]*?\\n      \\}\\),/);
assert(f35Match, "AIRCRAFT_TYPES.f35c missing");
const f35c = f35Match[0];
assert(f35c.includes('label: "F-35C LIGHTNING II"'), "F-35C label missing");
assert(f35c.includes('spw: Object.freeze({ key: "aam4", capacity: 16 })'), "F-35C default must be 4AAM x16");
assert(f35c.includes('Object.freeze({ key: "aam4", capacity: 16 })'), "F-35C air-to-air choice missing");
assert(f35c.includes('Object.freeze({ key: "agm4", capacity: 12 })'), "F-35C air-to-ground choice missing");
assert(f35c.includes('Object.freeze({ key: "lasm", capacity: 14 })'), "F-35C anti-ship choice missing");
assert((source.match(/spwChoices:/g) || []).length === 2, "SP.W selection must remain exclusive to F/A-18F and F-35C");'''
    source = replace_once(source, anchor, replacement, "static F-35C contract")
    source = replace_once(
        source,
        'console.log("  every other aircraft: fixed SP.W contract unchanged");',
        'console.log("  f35c: 4AAM x16 / 4AGM x12 / LASM x14, selectable before launch");\nconsole.log("  every other aircraft: fixed SP.W contract unchanged");',
        "static summary"
    )
    STATIC.write_text(source, encoding="utf-8")


def patch_browser() -> None:
    source = BROWSER.read_text(encoding="utf-8")
    state_anchor = '''    states.selectAir = hook.forceSelectAircraftSpw("aam4");
    states.loadAir = hook.forceLoadout("fa18");
    states.airApplied = { probe: hook.aircraftSpwProbe(), ui: readUi() };

    states.selectedF16 = hook.forceSelectAircraft("f16");'''
    state_replacement = '''    states.selectAir = hook.forceSelectAircraftSpw("aam4");
    states.loadAir = hook.forceLoadout("fa18");
    states.airApplied = { probe: hook.aircraftSpwProbe(), ui: readUi() };

    states.selectedF35 = hook.forceSelectAircraft("f35c");
    states.f35Default = { probe: hook.aircraftSpwProbe(), ui: readUi() };
    states.f35SelectGround = hook.forceSelectAircraftSpw("agm4");
    states.f35LoadGround = hook.forceLoadout("f35c");
    states.f35GroundApplied = { probe: hook.aircraftSpwProbe(), ui: readUi() };
    states.f35SelectShip = hook.forceSelectAircraftSpw("lasm");
    states.f35LoadShip = hook.forceLoadout("f35c");
    states.f35ShipApplied = { probe: hook.aircraftSpwProbe(), ui: readUi() };
    states.f35SelectAir = hook.forceSelectAircraftSpw("aam4");
    states.f35LoadAir = hook.forceLoadout("f35c");
    states.f35AirApplied = { probe: hook.aircraftSpwProbe(), ui: readUi() };

    states.selectedF16 = hook.forceSelectAircraft("f16");'''
    source = replace_once(source, state_anchor, state_replacement, "browser state probe")

    assert_anchor = '''  assert(result.selectAir === true && result.loadAir === true, "4AAM re-selection/apply failed");
  assert(result.airApplied.probe.activeKey === "aam4" && result.airApplied.probe.activeCapacity === 16, "4AAM was not reapplied");

  assert(result.selectedF16 === true && result.loadF16 === true, "fixed-loadout aircraft test setup failed");'''
    assert_replacement = '''  assert(result.selectAir === true && result.loadAir === true, "4AAM re-selection/apply failed");
  assert(result.airApplied.probe.activeKey === "aam4" && result.airApplied.probe.activeCapacity === 16, "4AAM was not reapplied");

  assert(result.selectedF35 === true, "could not select F-35C");
  assert(JSON.stringify(result.f35Default.probe.options) === JSON.stringify([
    { key: "aam4", capacity: 16 },
    { key: "agm4", capacity: 12 },
    { key: "lasm", capacity: 14 }
  ]), "F-35C option order or capacities are wrong");
  assert(result.f35Default.probe.selectedKey === "aam4", "F-35C 4AAM is not the default");
  assert(result.f35Default.ui.hidden === false && result.f35Default.ui.hintHidden === false, "selector is hidden for F-35C");
  assert(result.f35SelectGround === true && result.f35LoadGround === true, "F-35C 4AGM selection/apply failed");
  assert(result.f35GroundApplied.probe.activeKey === "agm4" && result.f35GroundApplied.probe.activeCapacity === 12, "F-35C 4AGM was not applied");
  assert(result.f35SelectShip === true && result.f35LoadShip === true, "F-35C LASM selection/apply failed");
  assert(result.f35ShipApplied.probe.activeKey === "lasm" && result.f35ShipApplied.probe.activeCapacity === 14, "F-35C LASM was not applied");
  assert(result.f35ShipApplied.ui.value.includes("LASM") && result.f35ShipApplied.ui.value.includes("SHIP"), "F-35C LASM preview label is wrong");
  assert(result.f35SelectAir === true && result.f35LoadAir === true, "F-35C 4AAM re-selection/apply failed");
  assert(result.f35AirApplied.probe.activeKey === "aam4" && result.f35AirApplied.probe.activeCapacity === 16, "F-35C 4AAM was not reapplied");

  assert(result.selectedF16 === true && result.loadF16 === true, "fixed-loadout aircraft test setup failed");'''
    source = replace_once(source, assert_anchor, assert_replacement, "browser F-35C assertions")
    source = replace_once(
        source,
        '  console.log("  4AAM, 4AGM and LASM all preview and apply before mission start");',
        '  console.log("  F/A-18F and F-35C both preview and apply 4AAM / 4AGM / LASM before mission start");',
        "browser summary"
    )
    BROWSER.write_text(source, encoding="utf-8")


patch_index()
patch_static()
patch_browser()
print("apply_f35c_spw_select: patched F-35C pre-sortie 4AAM/4AGM/LASM selection")
