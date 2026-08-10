import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const payloadPath = path.join(ROOT, "payloads", "map_renBay.payload.js");
const indexPath = path.join(ROOT, "index.html");
const source = fs.readFileSync(payloadPath, "utf8");
const hostSource = fs.readFileSync(indexPath, "utf8");
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
  const plateau = preset.mountains?.plateau;
  must(plateau, "coastal plateau is missing");
  must(plateau.radius?.[0] === 16000 && plateau.radius?.[1] === 16000,
    "coastal plateau lateral range regressed");
  must(plateau.depth === 10500 && plateau.rotationY === 0,
    "coastal plateau depth/heading regressed");
  must(plateau.at?.[0] === 0 && plateau.at?.[1] === 9200,
    "coastal plateau inland shift regressed");
  must(plateau.topRadius === 0.92 && plateau.radialSegments === 48 && plateau.edgeNoise === 0.18,
    "coastal plateau silhouette controls regressed");
  must(preset.previewFocus?.[0] === city.at[0] && preset.previewFocus?.[1] === city.at[1],
    "preview focus must remain on the city/airport");

  // Even at the maximum authored edge contraction, the lateral land edge is
  // outside 12.5 km fog. The z shift preserves the southern coast at -1.3 km
  // while moving the rear edge to 19.7 km.
  const fogFar = preset.fog?.far;
  const lateralEdge = plateau.radius[0] * (1 - 0.48 * plateau.edgeNoise);
  const southEdge = plateau.at[1] - plateau.depth;
  const northEdge = plateau.at[1] + plateau.depth;
  must(lateralEdge > fogFar, `plateau side edge ${lateralEdge}m is still inside fog ${fogFar}m`);
  must(southEdge === -1300, `south shoreline moved to ${southEdge}m`);
  must(northEdge > fogFar + 6000, `north edge ${northEdge}m is still too close`);

  const cityRho = Math.hypot(
    (city.at[0] - plateau.at[0]) / plateau.radius[0],
    (city.at[1] - plateau.at[1]) / plateau.depth
  );
  must(cityRho < plateau.topRadius * 0.6, "city/airport no longer sits safely on the flat cap");

  for (const token of [
    "const radialSegments = Math.max(8, Math.round(shape.radialSegments || 16));",
    "const sampledDepth = radius * (0.75 + rng() * 0.35);",
    "Number.isFinite(plateau.depth)",
    "Number.isFinite(plateau.rotationY)",
    "const centre = preset.previewFocus || plateauAt || preset.sceneryOrigin || [0, 0];"
  ]) {
    must(hostSource.includes(token), `host lacks ${token}`);
  }
  must(hostSource.includes('radialSegments: 48, edgeNoise: 0.18'),
    "normal-start index does not contain the repaired Ren Bay footprint");
  must(Array.isArray(decorator.worlds) && decorator.worlds.includes("renBay"),
    "decorator is not scoped to Ren Bay");
  must(typeof decorator.build === "function", "decorator build is missing");

  console.log("check_map_ren_bay: PASS");
  console.log(`  districts=${city.districts.length} outer=${city.districts.at(-1).r[1]}m maxHeight=${city.maxHeight}m`);
  console.log(`  plateau=16000x10500m south=-1300m north=19700m fog=${preset.fog.far}m`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
