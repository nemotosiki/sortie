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
  must(plateau.radius?.[0] === 60000 && plateau.radius?.[1] === 60000,
    "continental plateau lateral range regressed");
  must(plateau.depth === 24000 && plateau.rotationY === 0,
    "continental plateau depth/heading regressed");
  must(plateau.at?.[0] === 0 && plateau.at?.[1] === 18000,
    "continental plateau inland shift regressed");
  must(plateau.topRadius === 0.96 && plateau.radialSegments === 96 && plateau.edgeNoise === 0.04,
    "continental plateau silhouette controls regressed");
  must(preset.previewFocus?.[0] === city.at[0] && preset.previewFocus?.[1] === city.at[1],
    "preview focus must remain on the city/airport");

  const fogFar = preset.fog?.far;
  must(Number.isFinite(fogFar), "fog far distance is missing");

  // buildMountainGeometry can contract an edge by at most
  // edgeNoise * (0.27 + 0.16 + 0.05). Test the ellipse where the player
  // actually sees it, not only at its widest centre. The previous test checked
  // the centre span and missed the narrow southern cross-section visible in the
  // user screenshot.
  const worstEdgeScale = 1 - 0.48 * plateau.edgeNoise;
  const halfWidthAt = (z) => {
    const zn = (z - plateau.at[1]) / plateau.depth;
    const squared = worstEdgeScale ** 2 - zn ** 2;
    return squared > 0 ? plateau.radius[0] * Math.sqrt(squared) : 0;
  };
  const approachSamples = [
    { label: "coastline pass", x: -6200, z: -4000 },
    { label: "18-second M01 approach", x: -4200, z: -3200 },
    { label: "bay crossing", x: -2500, z: 0 },
    { label: "airport/city", x: 0, z: city.at[1] }
  ];
  for (const sample of approachSamples) {
    const halfWidth = halfWidthAt(sample.z);
    const sideClearance = halfWidth - Math.abs(sample.x);
    must(sideClearance > fogFar + 1000,
      `${sample.label}: side edge clearance ${sideClearance.toFixed(1)}m is inside fog ${fogFar}m`);
  }

  const nominalSouthEdge = plateau.at[1] - plateau.depth;
  const flatSouthEdge = plateau.at[1] - plateau.depth * plateau.topRadius;
  const northEdge = plateau.at[1] + plateau.depth;
  must(nominalSouthEdge === -6000, `south coast moved to ${nominalSouthEdge}m`);
  must(flatSouthEdge - nominalSouthEdge <= 1200,
    `coastal slope became too deep: ${flatSouthEdge - nominalSouthEdge}m`);
  must(northEdge > fogFar + 25000, `north edge ${northEdge}m is still too close`);

  const cityRho = Math.hypot(
    (city.at[0] - plateau.at[0]) / plateau.radius[0],
    (city.at[1] - plateau.at[1]) / plateau.depth
  );
  must(cityRho < plateau.topRadius * 0.7, "city/airport no longer sits safely on the flat cap");

  for (const token of [
    "const radialSegments = Math.max(8, Math.round(shape.radialSegments || 16));",
    "const sampledDepth = radius * (0.75 + rng() * 0.35);",
    "Number.isFinite(plateau.depth)",
    "Number.isFinite(plateau.rotationY)",
    "const centre = preset.previewFocus || plateauAt || preset.sceneryOrigin || [0, 0];"
  ]) {
    must(hostSource.includes(token), `host lacks ${token}`);
  }
  must(hostSource.includes('radius: [60000, 60000], depth: 24000, height: [28, 28]'),
    "normal-start index does not contain the continental Ren Bay footprint");
  must(hostSource.includes('radialSegments: 96, edgeNoise: 0.04'),
    "normal-start index does not contain the repaired Ren Bay silhouette controls");
  must(Array.isArray(decorator.worlds) && decorator.worlds.includes("renBay"),
    "decorator is not scoped to Ren Bay");
  must(typeof decorator.build === "function", "decorator build is missing");

  console.log("check_map_ren_bay: PASS");
  console.log(`  districts=${city.districts.length} outer=${city.districts.at(-1).r[1]}m maxHeight=${city.maxHeight}m`);
  console.log(`  plateau=60000x24000m south=-6000m north=42000m fog=${fogFar}m`);
  console.log(`  approach side clearances=${approachSamples.map((sample) => Math.round(halfWidthAt(sample.z) - Math.abs(sample.x))).join("/")}m`);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
