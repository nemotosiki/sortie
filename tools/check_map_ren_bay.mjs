import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const payloadPath = path.join(ROOT, "payloads", "map_renBay.payload.js");
const source = fs.readFileSync(payloadPath, "utf8");
const must = (condition, message) => {
  if (!condition) throw new Error(`check_map_ren_bay: ${message}`);
};

must(!source.includes("\r"), "payload must be LF-only");
for (const token of [
  'ctx.addWorldPreset("renBay"',
  'ctx.addWorldDecorator("renBayWorks"',
  'worlds: ["renBay"]',
  'Medical aviation district',
  'Airport: two parallel runways'
]) {
  must(source.includes(token), `missing ${token}`);
}
must(!/\bscene\.add\s*\(/.test(source), "decorator must not use scene.add");
must(!/\bdispose\s*\(/.test(source), "decorator must not own disposal");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ren-bay-check-"));
const tempModule = path.join(tempDir, "map_renBay.mjs");
fs.writeFileSync(tempModule, source, "utf8");

try {
  const { default: register } = await import(`${pathToFileURL(tempModule).href}?v=${Date.now()}`);
  let preset = null;
  let decorator = null;
  register({
    addWorldPreset(key, def) {
      must(key === "renBay", `unexpected preset key ${key}`);
      preset = def;
    },
    addWorldDecorator(id, def) {
      must(id === "renBayWorks", `unexpected decorator id ${id}`);
      decorator = def;
    }
  });

  must(preset && decorator, "preset or decorator was not registered");
  const city = preset.decor?.city;
  must(city, "city config is missing");
  must(Array.isArray(city.at) && city.at.length === 2, "city anchor is malformed");
  must(Array.isArray(city.districts) && city.districts.length >= 2, "city districts are missing");
  for (const [index, district] of city.districts.entries()) {
    must(Array.isArray(district.r) && district.r.length === 2,
      `district ${index} must use the createWorld r:[inner,outer] schema`);
    must(Array.isArray(district.height) && district.height.length === 2,
      `district ${index} must use the createWorld height:[min,max] schema`);
    must(Number.isFinite(district.fill), `district ${index} fill is missing`);
  }
  must(Number.isFinite(city.maxHeight), "city.maxHeight is missing");
  must(Number.isFinite(city.wall) && Number.isFinite(city.roof), "city materials are missing");
  must(city.windows && Number.isFinite(city.windows.lit), "city window sheet is missing");
  must(city.districts.at(-1).r[1] <= 2200, "city extends past the intended low-rise bay district");
  must(preset.mountains?.plateau?.at?.[0] === city.at[0]
    && preset.mountains?.plateau?.at?.[1] === city.at[1],
  "city and plateau anchors must match exactly");
  must(Array.isArray(decorator.worlds) && decorator.worlds.includes("renBay"),
    "decorator is not scoped to Ren Bay");
  must(typeof decorator.build === "function", "decorator build is missing");

  console.log("check_map_ren_bay: PASS");
  console.log(`  districts=${city.districts.length} outer=${city.districts.at(-1).r[1]}m maxHeight=${city.maxHeight}m`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
