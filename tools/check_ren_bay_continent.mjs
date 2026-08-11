import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const payloadPath = path.join(ROOT, "payloads", "map_renBay.payload.js");
const indexPath = path.join(ROOT, "index.html");
const source = fs.readFileSync(payloadPath, "utf8");
const host = fs.readFileSync(indexPath, "utf8");
const must = (condition, message) => {
  if (!condition) throw new Error(`check_ren_bay_continent: ${message}`);
};

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ren-bay-continent-"));
const modulePath = path.join(tempDir, "map_renBay.mjs");
fs.writeFileSync(modulePath, source, "utf8");
try {
  const { default: register } = await import(`${pathToFileURL(modulePath).href}?v=${Date.now()}`);
  let preset = null;
  register({
    addWorldPreset(key, definition) {
      if (key === "renBay") preset = definition;
    },
    addWorldDecorator() {}
  });
  must(preset, "renBay preset was not registered");
  const sheet = preset.continentalSheet;
  must(sheet, "continentalSheet config is missing");
  must(sheet.width === 180000 && sheet.depth === 120000, "sheet extent regressed");
  must(sheet.centerX === 0 && sheet.coastZ === -6100, "sheet anchor regressed");
  must(sheet.beachDepth === 1400 && sheet.height === 28, "beach/top height regressed");
  must(sheet.segments === 320 && sheet.uvWorldScale === 10800, "sheet tessellation/UV density regressed");
  must(Array.isArray(sheet.coastWaves) && sheet.coastWaves.length === 2, "coast waves are missing");

  const coastAt = (x) => sheet.coastWaves.reduce((z, wave) =>
    z + wave.amplitude * Math.sin((x - sheet.centerX) * Math.PI * 2 / wave.wavelength + wave.phase),
    sheet.coastZ
  );
  const heightAt = (x, z) => {
    if (Math.abs(x - sheet.centerX) > sheet.width * 0.5) return 0;
    const coast = coastAt(x);
    if (z < coast || z > coast + sheet.depth) return 0;
    const t = Math.max(0, Math.min(1, (z - coast) / sheet.beachDepth));
    return sheet.height * t * t * (3 - 2 * t);
  };

  const fogFar = preset.fog.far;
  must(sheet.width * 0.5 > fogFar * 6, "side limits can enter the fog horizon");
  must(sheet.depth > fogFar * 8, "rear limit can enter the fog horizon");
  for (const [x, z] of [[78000, 20000], [-78000, 20000], [0, 70000], [42000, 60000]]) {
    must(heightAt(x, z) > 27.5, `continental sample ${x},${z} is not inland`);
  }
  must(heightAt(0, -10000) === 0, "open sea south of the coast was filled");

  for (const token of [
    "function continentalSheetCoastZ(sheet, x)",
    "function continentalSheetHeightAt(sheet, x, z)",
    "const sheetConfig = preset.continentalSheet;",
    "const groundSheets = [];",
    "groundSheets, cameraSurfaces",
    "for (const sheet of world.groundSheets || [])"
  ]) {
    must(host.includes(token), `normal-start host lacks ${token}`);
  }
  must(host.includes("width: 180000") && host.includes("depth: 120000"),
    "normal-start inline Ren Bay sheet is missing");

  console.log("check_ren_bay_continent: PASS");
  console.log(`  sheet=${sheet.width}x${sheet.depth}m fog=${fogFar}m coast@0=${Math.round(coastAt(0))}m`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
