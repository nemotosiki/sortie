#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[1], "../..");
const source = fs.readFileSync(path.join(root, "index.html"), "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`check_fa18f_spw_select: FAIL - ${message}`);
    process.exit(1);
  }
}

function aircraftBlock(id, nextMarker) {
  const startMarker = `      ${id}: Object.freeze({\n        id: "${id}",`;
  const start = source.indexOf(startMarker);
  assert(start >= 0, `AIRCRAFT_TYPES.${id} missing`);
  const end = source.indexOf(nextMarker, start);
  assert(end > start, `could not bound AIRCRAFT_TYPES.${id}`);
  return source.slice(start, end);
}

const fa18 = aircraftBlock("fa18", "      // F-15C:");
assert(fa18.includes('label: "F/A-18F SUPER HORNET"'), "F/A-18F label missing");
assert(fa18.includes('spw: Object.freeze({ key: "aam4", capacity: 16 })'), "F/A-18F default must be 4AAM x16");
assert(fa18.includes('Object.freeze({ key: "aam4", capacity: 16 })'), "air-to-air choice missing");
assert(fa18.includes('Object.freeze({ key: "agm4", capacity: 12 })'), "air-to-ground choice missing");
assert(fa18.includes('Object.freeze({ key: "lasm", capacity: 12 })'), "anti-ship choice missing");
assert((source.match(/spwChoices:/g) || []).length === 1, "SP.W selection must remain exclusive to F/A-18F");

for (const id of [
  "spwLoadoutHeader", "spwLoadoutSelect", "spwLoadoutPrev",
  "spwLoadoutValue", "spwLoadoutNext", "hangarSpwHint"
]) {
  assert(source.includes(`id="${id}"`) || source.includes(`getElementById("${id}")`), `${id} UI missing`);
}

assert(source.includes("function aircraftSpwOptions(spec)"), "option resolver missing");
assert(source.includes("function resolveAircraftSpwLoadout(spec)"), "selected loadout resolver missing");
assert(source.includes("function selectAircraftSpw(key)"), "direct selector missing");
assert(source.includes("function cycleAircraftSpw(delta)"), "cycle selector missing");
assert(source.includes("const spwLoadout = resolveAircraftSpwLoadout(spec);"), "mission loadout does not resolve selection");
assert(source.includes("PLAYER_SPW_CAPACITY = spwSpec ? spwLoadout.capacity : 0;"), "selected capacity is not applied");
assert(source.includes("bars.ground = spwGroundRating(spwLoadout);"), "hangar ground bar does not follow the selected rack");
assert(source.includes("`${spwSpec.label} ×${spwLoadout.capacity}`"), "hangar ammo preview does not follow the selected rack");

assert(source.includes('else if (gameState === STATE_READY) cycleAircraftSpw(1);'), "keyboard X does not cycle the hangar rack");
assert(source.includes('else if (gameState === STATE_READY && weaponTogglePressed && !gamepadInput.previousWeaponToggle) cycleAircraftSpw(1);'), "gamepad loadout selection missing");
assert(source.includes('forceSelectAircraftSpw: (key) => selectAircraftSpw(key)'), "browser selection hook missing");
assert(source.includes("aircraftSpwProbe: () =>"), "browser loadout probe missing");

console.log("check_fa18f_spw_select: PASS");
console.log("  fa18: 4AAM x16 / 4AGM x12 / LASM x12, selectable before launch");
console.log("  every other aircraft: fixed SP.W contract unchanged");
