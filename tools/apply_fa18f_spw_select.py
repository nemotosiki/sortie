from pathlib import Path

root = Path(__file__).resolve().parents[1]
index_path = root / "index.html"
source = index_path.read_text(encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def replace_in_block(
    text: str,
    start_marker: str,
    end_marker: str,
    replacements: list[tuple[str, str, str]],
) -> str:
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f"block start not found: {start_marker[:80]}")
    end = text.find(end_marker, start)
    if end <= start:
        raise SystemExit(f"block end not found: {end_marker[:80]}")
    block = text[start:end]
    for old, new, label in replacements:
        block = replace_once(block, old, new, label)
    return text[:start] + block + text[end:]


# F/A-18F is the only aircraft with a pre-sortie SP.W choice. Its default is
# the air-to-air rack; the player may switch to ground or ship attack in the
# hangar. Capacities keep dedicated specialists relevant: the Super Hornet is
# flexible, not automatically the deepest magazine in every role.
source = replace_in_block(
    source,
    '      fa18: Object.freeze({\n        id: "fa18",',
    '      // F-15C:',
    [
        (
            '        blurb: "空母運用を前提に鍛えられた複座の艦載機。最高速度は上位機に譲るが、中速域の機動と姿勢の安定は随一で、狙った位置に留まり続ける。",',
            '        blurb: "空母運用を前提に鍛えられた複座の艦載機。出撃前に4AAM・4AGM・LASMを選び、制空・対地・対艦へ任務ごとに構成を変えられる。最高速度は上位機に譲るが、中速域の機動と姿勢の安定は随一。",',
            "F/A-18F blurb",
        ),
        (
            '        spw: Object.freeze({ key: "qaam", capacity: 4 }),',
            '        spw: Object.freeze({ key: "aam4", capacity: 16 }),\n'
            '        spwChoices: Object.freeze([\n'
            '          Object.freeze({ key: "aam4", capacity: 16 }),\n'
            '          Object.freeze({ key: "agm4", capacity: 12 }),\n'
            '          Object.freeze({ key: "lasm", capacity: 12 })\n'
            '        ]),',
            "F/A-18F SP.W choices",
        ),
    ],
)

# Hangar selector. Reuse the briefing difficulty selector's visual language so
# it works with mouse, keyboard focus and the existing menu styling.
source = replace_once(
    source,
    '          <div class="menuRecordHeader">[ AIRCRAFT SPECIFICATIONS ]</div>\n'
    '          <p class="menuBlurb hangarPurchaseLine hidden" id="hangarPurchaseLine">—</p>\n'
    '          <div id="specBars"></div>\n'
    '          <div class="menuRecordHeader">[ WEAPONS AMMO ]</div>',
    '          <div class="menuRecordHeader">[ AIRCRAFT SPECIFICATIONS ]</div>\n'
    '          <p class="menuBlurb hangarPurchaseLine hidden" id="hangarPurchaseLine">—</p>\n'
    '          <div id="specBars"></div>\n'
    '          <div class="menuRecordHeader hidden" id="spwLoadoutHeader">[ SPECIAL WEAPON SELECT ]</div>\n'
    '          <div class="difficultySelector hidden" id="spwLoadoutSelect" aria-label="Select F/A-18F special weapon">\n'
    '            <span class="difficultyArrow" id="spwLoadoutPrev" role="button" tabindex="0" aria-label="Previous special weapon">◀</span>\n'
    '            <span class="difficultyValue" id="spwLoadoutValue">4AAM / AIR</span>\n'
    '            <span class="difficultyArrow" id="spwLoadoutNext" role="button" tabindex="0" aria-label="Next special weapon">▶</span>\n'
    '          </div>\n'
    '          <div class="menuRecordHeader">[ WEAPONS AMMO ]</div>',
    "hangar SP.W selector markup",
)

source = replace_once(
    source,
    '        <span><span class="legendKey">↑↓ / D-PAD</span> 機体</span>\n'
    '        <span><span class="legendKey">ENTER / ○</span> 出撃</span>\n'
    '        <span><span class="legendKey">ESC / □</span> ミッション選択</span>',
    '        <span><span class="legendKey">↑↓ / D-PAD</span> 機体</span>\n'
    '        <span id="hangarSpwHint" class="hidden"><span class="legendKey">X / L3</span> 特殊兵装</span>\n'
    '        <span><span class="legendKey">ENTER / ○</span> 出撃</span>\n'
    '        <span><span class="legendKey">ESC / □</span> ミッション選択</span>',
    "hangar SP.W control hint",
)

# DOM references.
source = replace_once(
    source,
    '      hangarPurchaseLine: document.getElementById("hangarPurchaseLine"),\n'
    '      score: document.getElementById("score"),',
    '      hangarPurchaseLine: document.getElementById("hangarPurchaseLine"),\n'
    '      spwLoadoutHeader: document.getElementById("spwLoadoutHeader"),\n'
    '      spwLoadoutSelect: document.getElementById("spwLoadoutSelect"),\n'
    '      spwLoadoutPrev: document.getElementById("spwLoadoutPrev"),\n'
    '      spwLoadoutValue: document.getElementById("spwLoadoutValue"),\n'
    '      spwLoadoutNext: document.getElementById("spwLoadoutNext"),\n'
    '      hangarSpwHint: document.getElementById("hangarSpwHint"),\n'
    '      score: document.getElementById("score"),',
    "SP.W selector DOM references",
)

# One remembered choice per selectable airframe, in-memory for the current
# play session. Only fa18 currently has more than one option.
source = replace_once(
    source,
    '    let selectedAircraftId = DEFAULT_AIRCRAFT_ID;\n'
    '    let aircraftSpecBarCache = null;',
    '    let selectedAircraftId = DEFAULT_AIRCRAFT_ID;\n'
    '    const aircraftSpwSelection = new Map();\n'
    '    let aircraftSpecBarCache = null;',
    "SP.W selection state",
)

helpers = '''    function aircraftSpwOptions(spec) {
      if (!spec) return [];
      if (Array.isArray(spec.spwChoices) && spec.spwChoices.length > 0) return spec.spwChoices;
      return spec.spw ? [spec.spw] : [];
    }

    function resolveAircraftSpwLoadout(spec) {
      const options = aircraftSpwOptions(spec);
      if (options.length === 0) return null;
      const stored = aircraftSpwSelection.get(spec.id);
      const index = Number.isInteger(stored) && stored >= 0 && stored < options.length ? stored : 0;
      if (stored !== index) aircraftSpwSelection.set(spec.id, index);
      return options[index];
    }

    function aircraftSpwRoleLabel(key) {
      if (key === "aam4") return "AIR";
      if (key === "agm4") return "GROUND";
      if (key === "lasm") return "SHIP";
      return "SPECIAL";
    }

    function spwGroundRating(loadout) {
      const weapon = loadout ? SPW_TYPES[loadout.key] : null;
      if (!weapon) return 0.25;
      if ((weapon.lockKind === "surface" || weapon.lockKind === "ground") && weapon.multi > 1) return 1.0;
      if (weapon.kind === "bomb") return 0.95;
      if (weapon.lockKind === "surface" || weapon.lockKind === "ship" || weapon.lockKind === "ground") return 0.8;
      return 0.25;
    }

    function selectAircraftSpw(key) {
      if (gameState === STATE_PLAYING) return false;
      const spec = AIRCRAFT_TYPES[selectedAircraftId];
      const options = aircraftSpwOptions(spec);
      const index = options.findIndex((entry) => entry.key === key);
      if (index < 0) return false;
      aircraftSpwSelection.set(spec.id, index);
      updateHangarScreen();
      return true;
    }

    function cycleAircraftSpw(delta) {
      if (gameState !== STATE_READY) return false;
      const spec = AIRCRAFT_TYPES[selectedAircraftId];
      const options = aircraftSpwOptions(spec);
      if (options.length <= 1) return false;
      const current = aircraftSpwSelection.get(spec.id) || 0;
      const next = (current + delta + options.length) % options.length;
      aircraftSpwSelection.set(spec.id, next);
      updateHangarScreen();
      return true;
    }

'''
source = replace_once(
    source,
    '    function applyAircraftLoadout(id) {',
    helpers + '    function applyAircraftLoadout(id) {',
    "SP.W selection helpers",
)

# Apply the loadout selected in the hangar instead of the aircraft's fixed
# default. Every non-F/A-18F aircraft still resolves to its single `spw` entry.
source = replace_once(
    source,
    '      // SP.W is part of the airframe, so picking a jet picks the special weapon\n'
    '      // with it - and always hands the pilot the standard missile first.\n'
    '      // Guarded like the two selector paths already are: enemy-only airframes\n'
    '      // (bomber, transports, every payload jet) carry no `spw`, and the raw\n'
    '      // read crashed forceLoadout halfway - flight constants swapped, weapons\n'
    '      // not - leaving the loadout in a half-applied state.\n'
    '      const spwSpec = spec.spw ? SPW_TYPES[spec.spw.key] || null : null;\n'
    '      PLAYER_SPW = spwSpec;\n'
    '      PLAYER_SPW_CAPACITY = spwSpec ? spec.spw.capacity : 0;',
    '      // Most aircraft keep one fixed SP.W. F/A-18F alone resolves the choice\n'
    '      // made in the hangar, then applies it through the same generic launcher.\n'
    '      // Enemy-only airframes have no loadout and safely resolve to null.\n'
    '      const spwLoadout = resolveAircraftSpwLoadout(spec);\n'
    '      const spwSpec = spwLoadout ? SPW_TYPES[spwLoadout.key] || null : null;\n'
    '      PLAYER_SPW = spwSpec;\n'
    '      PLAYER_SPW_CAPACITY = spwSpec ? spwLoadout.capacity : 0;',
    "apply selected SP.W loadout",
)

# Hangar presentation and ammo preview follow the selected rack. AIR-TO-GROUND
# is the only specification bar affected because that bar already represents
# the fixed SP.W on every other aircraft.
source = replace_once(
    source,
    '    function updateHangarScreen() {\n'
    '      const spec = AIRCRAFT_TYPES[selectedAircraftId];\n'
    '      if (!spec) return;',
    '    function updateHangarScreen() {\n'
    '      const spec = AIRCRAFT_TYPES[selectedAircraftId];\n'
    '      if (!spec) return;\n'
    '      const spwOptions = aircraftSpwOptions(spec);\n'
    '      const spwLoadout = resolveAircraftSpwLoadout(spec);\n'
    '      const spwSpec = spwLoadout ? SPW_TYPES[spwLoadout.key] || null : null;',
    "hangar selected SP.W setup",
)

source = replace_once(
    source,
    '      ui.specRole.textContent = spec.role.toUpperCase();\n'
    '      ui.specName.textContent = spec.label;\n'
    '      const bars = (aircraftSpecBarCache || {})[spec.id] || {};',
    '      ui.specRole.textContent = spec.role.toUpperCase();\n'
    '      ui.specName.textContent = spec.label;\n'
    '      const selectableSpw = spwOptions.length > 1;\n'
    '      for (const node of [ui.spwLoadoutHeader, ui.spwLoadoutSelect, ui.hangarSpwHint]) {\n'
    '        if (node) node.classList.toggle("hidden", !selectableSpw);\n'
    '      }\n'
    '      if (ui.spwLoadoutValue) {\n'
    '        ui.spwLoadoutValue.textContent = spwSpec\n'
    '          ? `${spwSpec.label} / ${aircraftSpwRoleLabel(spwSpec.key)}`\n'
    '          : "---";\n'
    '      }\n'
    '      const bars = { ...((aircraftSpecBarCache || {})[spec.id] || {}) };\n'
    '      bars.ground = spwGroundRating(spwLoadout);',
    "hangar selector visibility and dynamic bar",
)

source = replace_once(
    source,
    '      const spwSpec = SPW_TYPES[spec.spw && spec.spw.key];\n'
    '      ui.ammoGrid.innerHTML =\n'
    '        `<dt>GUN</dt><dd>---</dd><dt>MSL</dt><dd>${String(spec.missileCapacity)}</dd>` +\n'
    '        `<dt>SP.W</dt><dd>${spwSpec ? `${spwSpec.label} ×${spec.spw.capacity}` : "---"}</dd>` +',
    '      ui.ammoGrid.innerHTML =\n'
    '        `<dt>GUN</dt><dd>---</dd><dt>MSL</dt><dd>${String(spec.missileCapacity)}</dd>` +\n'
    '        `<dt>SP.W</dt><dd>${spwSpec ? `${spwSpec.label} ×${spwLoadout.capacity}` : "---"}</dd>` +',
    "hangar selected SP.W ammo",
)

# Mouse/keyboard accessible arrows in the hangar.
source = replace_once(
    source,
    '    window.addEventListener("pointerdown", ensureAudio, { passive: true });',
    '    for (const [id, delta] of [["spwLoadoutPrev", -1], ["spwLoadoutNext", 1]]) {\n'
    '      const arrow = document.getElementById(id);\n'
    '      if (!arrow) continue;\n'
    '      arrow.addEventListener("click", () => {\n'
    '        ensureAudio();\n'
    '        cycleAircraftSpw(delta);\n'
    '      });\n'
    '      arrow.addEventListener("keydown", (event) => {\n'
    '        if (event.code !== "Enter" && event.code !== "Space") return;\n'
    '        event.preventDefault();\n'
    '        ensureAudio();\n'
    '        cycleAircraftSpw(delta);\n'
    '      });\n'
    '    }\n'
    '    window.addEventListener("pointerdown", ensureAudio, { passive: true });',
    "SP.W selector arrow listeners",
)

# X keeps its in-flight weapon-switch meaning and becomes the pre-sortie rack
# selector while the hangar is open.
source = replace_once(
    source,
    '      if (event.code === "KeyX" && !event.repeat) {\n'
    '        if (gameState === STATE_PLAYING) toggleWeapon();\n'
    '        return;\n'
    '      }',
    '      if (event.code === "KeyX" && !event.repeat) {\n'
    '        if (gameState === STATE_PLAYING) toggleWeapon();\n'
    '        else if (gameState === STATE_READY) cycleAircraftSpw(1);\n'
    '        return;\n'
    '      }',
    "keyboard SP.W selection",
)

# The same physical gamepad control (button 10 / L3) switches weapons in flight
# and cycles the pre-sortie selection in the hangar.
source = replace_once(
    source,
    '      if (wasPlaying && weaponTogglePressed && !gamepadInput.previousWeaponToggle) toggleWeapon();',
    '      if (wasPlaying && weaponTogglePressed && !gamepadInput.previousWeaponToggle) toggleWeapon();\n'
    '      else if (gameState === STATE_READY && weaponTogglePressed && !gamepadInput.previousWeaponToggle) cycleAircraftSpw(1);',
    "gamepad SP.W selection",
)

# Deterministic hooks for browser regression tests and future mission tooling.
source = replace_once(
    source,
    '        forceSelectAircraft: (id) => selectAircraft(id),\n'
    '        forceSelectWeapon: (key) => {',
    '        forceSelectAircraft: (id) => selectAircraft(id),\n'
    '        forceSelectAircraftSpw: (key) => selectAircraftSpw(key),\n'
    '        aircraftSpwProbe: () => {\n'
    '          const spec = AIRCRAFT_TYPES[selectedAircraftId];\n'
    '          const options = aircraftSpwOptions(spec);\n'
    '          const selected = resolveAircraftSpwLoadout(spec);\n'
    '          return {\n'
    '            aircraftId: spec ? spec.id : null,\n'
    '            options: options.map((entry) => ({ key: entry.key, capacity: entry.capacity })),\n'
    '            selectedKey: selected ? selected.key : null,\n'
    '            selectedCapacity: selected ? selected.capacity : 0,\n'
    '            activeKey: PLAYER_SPW ? PLAYER_SPW.key : null,\n'
    '            activeCapacity: PLAYER_SPW_CAPACITY,\n'
    '            selectorVisible: Boolean(ui.spwLoadoutSelect && !ui.spwLoadoutSelect.classList.contains("hidden"))\n'
    '          };\n'
    '        },\n'
    '        forceSelectWeapon: (key) => {',
    "SP.W debug hooks",
)

index_path.write_text(source, encoding="utf-8")
print("apply_fa18f_spw_select: patched F/A-18F pre-sortie 4AAM/4AGM/LASM selection")
