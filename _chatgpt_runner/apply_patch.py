#!/usr/bin/env python3
from __future__ import annotations

import pathlib
import re
import sys


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one literal match, found {count}")
    return text.replace(old, new, 1)


def replace_regex(text: str, pattern: str, replacement: str, label: str) -> str:
    result, count = re.subn(pattern, lambda _match: replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one regex match, found {count}")
    return result


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: apply_patch.py path/to/index.html")
    path = pathlib.Path(sys.argv[1])
    raw = path.read_bytes()
    if b"\r\n" in raw:
        raise RuntimeError("input index.html contains CRLF; refusing to normalize silently")
    text = raw.decode("utf-8")

    # Preset tuning: lower normal strengths and reduce the sky's high-contrast,
    # stripe-prone veil density. Geometry, placement, fog and gameplay values are
    # deliberately untouched.
    preset_replacements = {
        '        atmosphere: { seed: 0x1d4a11, noise: 0.026, haze: 0.12, thinClouds: 18, cloudOpacity: 0.07, cloudBand: [0.48, 0.72], cloudTint: 0xe7f4f8 },':
        '        atmosphere: { seed: 0x1d4a11, noise: 0.012, haze: 0.12, thinClouds: 10, cloudOpacity: 0.034, cloudBand: [0.42, 0.68], cloudTint: 0xe7f4f8 },',
        '          normalRepeat: 42, normalScale: [0.42, 0.68], normalSpeed: [0.011, 0.004], normalSeed: 0x1d4a12':
        '          normalRepeat: 42, normalScale: [0.22, 0.22], normalSpeed: [0.011, 0.004], normalSeed: 0x1d4a12',
        '          normalRepeat: 22, normalStrength: 0.48, islandNormalStrength: 0.27,':
        '          normalRepeat: 22, normalStrength: 0.24, islandNormalStrength: 0.14,',
        '        atmosphere: { seed: 0x2c6f21, noise: 0.034, haze: 0.18, thinClouds: 24, cloudOpacity: 0.105, cloudBand: [0.34, 0.62], cloudTint: 0xffb083 },':
        '        atmosphere: { seed: 0x2c6f21, noise: 0.016, haze: 0.18, thinClouds: 12, cloudOpacity: 0.05, cloudBand: [0.32, 0.58], cloudTint: 0xffb083 },',
        '          normalRepeat: 36, normalScale: [0.48, 0.82], normalSpeed: [0.013, 0.003], normalSeed: 0x2c6f22':
        '          normalRepeat: 36, normalScale: [0.24, 0.24], normalSpeed: [0.013, 0.003], normalSeed: 0x2c6f22',
        '          normalRepeat: 20, normalStrength: 0.4, islandNormalStrength: 0.23,':
        '          normalRepeat: 20, normalStrength: 0.2, islandNormalStrength: 0.12,',
        '        atmosphere: { seed: 0x3a8c31, noise: 0.017, haze: 0.2, thinClouds: 30, cloudOpacity: 0.09, cloudBand: [0.4, 0.75], cloudTint: 0xe7f3f8 },':
        '        atmosphere: { seed: 0x3a8c31, noise: 0.009, haze: 0.2, thinClouds: 14, cloudOpacity: 0.038, cloudBand: [0.38, 0.7], cloudTint: 0xe7f3f8 },',
        '          normalRepeat: 30, normalScale: [0.24, 0.38], normalSpeed: [0.006, 0.0015], normalSeed: 0x3a8c32':
        '          normalRepeat: 30, normalScale: [0.14, 0.14], normalSpeed: [0.006, 0.0015], normalSeed: 0x3a8c32',
        '          normalRepeat: 18, normalStrength: 0.32, islandNormalStrength: 0.18,':
        '          normalRepeat: 18, normalStrength: 0.16, islandNormalStrength: 0.1,',
        '        atmosphere: { seed: 0x4b2d41, noise: 0.04, haze: 0.035, thinClouds: 9, cloudOpacity: 0.032, cloudBand: [0.4, 0.68], cloudTint: 0x7586ad },':
        '        atmosphere: { seed: 0x4b2d41, noise: 0.012, haze: 0.035, thinClouds: 5, cloudOpacity: 0.017, cloudBand: [0.39, 0.65], cloudTint: 0x7586ad },',
        '          normalRepeat: 46, normalScale: [0.3, 0.52], normalSpeed: [0.008, 0.002], normalSeed: 0x4b2d42':
        '          normalRepeat: 46, normalScale: [0.16, 0.16], normalSpeed: [0.008, 0.002], normalSeed: 0x4b2d42',
        '          normalRepeat: 24, normalStrength: 0.5, islandNormalStrength: 0.25,':
        '          normalRepeat: 24, normalStrength: 0.18, islandNormalStrength: 0.11,',
    }
    for old, new in preset_replacements.items():
        text = replace_once(text, old, new, f"preset tuning {old[:50]}")

    noise_and_terrain = r'''    // Small deterministic, periodic value-noise kernel shared by the generated
    // terrain, ocean and sky textures. Integer torus transforms rotate the
    // sampling lattice without breaking tileability, so no one axis becomes a
    // persistent grain direction.
    function hashNoise2D(x, y, seed) {
      let h = Math.imul((x | 0) ^ (seed | 0), 0x27d4eb2d);
      h = Math.imul(h ^ (y | 0), 0x85ebca6b);
      h ^= h >>> 15;
      h = Math.imul(h, 0xc2b2ae35);
      h ^= h >>> 16;
      return (h >>> 0) / 4294967295;
    }

    function tileableValueNoise(u, v, cells, seed) {
      const x = u * cells;
      const y = v * cells;
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const tx0 = x - x0;
      const ty0 = y - y0;
      const tx = tx0 * tx0 * (3 - 2 * tx0);
      const ty = ty0 * ty0 * (3 - 2 * ty0);
      const wrap = (value) => ((value % cells) + cells) % cells;
      const a = hashNoise2D(wrap(x0), wrap(y0), seed);
      const b = hashNoise2D(wrap(x0 + 1), wrap(y0), seed);
      const c = hashNoise2D(wrap(x0), wrap(y0 + 1), seed);
      const d = hashNoise2D(wrap(x0 + 1), wrap(y0 + 1), seed);
      const ab = a + (b - a) * tx;
      const cd = c + (d - c) * tx;
      return ab + (cd - ab) * ty;
    }

    function fract01(value) {
      return value - Math.floor(value);
    }

    function isotropicTileNoise(u, v, seed) {
      const n0 = tileableValueNoise(u, v, 5, seed ^ 0x51f15e);
      const n1 = tileableValueNoise(fract01(u + v), fract01(v - u), 11, seed ^ 0x8b31a7);
      const n2 = tileableValueNoise(fract01(2 * u + v), fract01(2 * v - u), 23, seed ^ 0xc9713d);
      const n3 = tileableValueNoise(fract01(3 * u + 2 * v), fract01(3 * v - 2 * u), 47, seed ^ 0x2f6e2b);
      return n0 * 0.45 + n1 * 0.29 + n2 * 0.18 + n3 * 0.08;
    }

    // Compact, tileable material data for the terrain. The RGBA channels carry
    // independent sand/grass/rock/snow micro-patterns; the shader chooses among
    // them from normalized height and slope, then samples the same texture at a
    // rotated macro scale to hide repetition. Everything is authored here, so
    // the single-file/no-external-assets contract remains intact.
    function makeTerrainTextureSet(seed, size = 256) {
      const detailCanvas = document.createElement("canvas");
      detailCanvas.width = size;
      detailCanvas.height = size;
      const detailCtx = detailCanvas.getContext("2d");
      const detailImage = detailCtx.createImageData(size, size);
      const heightField = new Float32Array(size * size);
      const clamp01 = (value) => Math.min(1, Math.max(0, value));

      for (let y = 0; y < size; y += 1) {
        const v = y / size;
        for (let x = 0; x < size; x += 1) {
          const u = x / size;
          const broad = isotropicTileNoise(u, v, seed);
          const grain = tileableValueNoise(fract01(2 * u + v), fract01(2 * v - u), 53, seed ^ 0x1e35a7);
          const ridgeNoise = tileableValueNoise(fract01(u + 2 * v), fract01(v - 2 * u), 17, seed ^ 0x72b41d);
          const ridges = 1 - Math.abs(ridgeNoise * 2 - 1);
          const crackNoise = tileableValueNoise(fract01(3 * u + v), fract01(3 * v - u), 29, seed ^ 0xa521ef);
          const cracks = Math.pow(1 - Math.abs(crackNoise * 2 - 1), 9);
          const sand = clamp01(0.68 + (broad - 0.5) * 0.32 + (grain - 0.5) * 0.12);
          const grass = clamp01(0.55 + (broad - 0.5) * 0.48 + (grain - 0.5) * 0.2 - ridges * 0.05);
          const rock = clamp01(0.48 + ridges * 0.28 + (grain - 0.5) * 0.22 - cracks * 0.16);
          const snow = clamp01(0.82 + (broad - 0.5) * 0.18 + (grain - 0.5) * 0.08 - ridges * 0.035);
          const index = y * size + x;
          const offset = index * 4;
          detailImage.data[offset] = Math.round(sand * 255);
          detailImage.data[offset + 1] = Math.round(grass * 255);
          detailImage.data[offset + 2] = Math.round(rock * 255);
          detailImage.data[offset + 3] = Math.round(snow * 255);
          heightField[index] = broad * 0.62 + ridges * 0.23 + grain * 0.15 - cracks * 0.075;
        }
      }
      detailCtx.putImageData(detailImage, 0, 0);

      const normalCanvas = document.createElement("canvas");
      normalCanvas.width = size;
      normalCanvas.height = size;
      const normalCtx = normalCanvas.getContext("2d");
      const normalImage = normalCtx.createImageData(size, size);
      const wrapped = (value) => (value + size) % size;
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const left = heightField[y * size + wrapped(x - 1)];
          const right = heightField[y * size + wrapped(x + 1)];
          const down = heightField[wrapped(y - 1) * size + x];
          const up = heightField[wrapped(y + 1) * size + x];
          // Tangent-space normal maps are neutral blue: X and Y are the two UV
          // slopes, Z points out of the surface. The previous green-up encoding
          // made light react as if every texel were tilted sideways.
          let nx = (left - right) * 3.0;
          let ny = (down - up) * 3.0;
          let nz = 1;
          const inv = 1 / Math.hypot(nx, ny, nz);
          nx *= inv;
          ny *= inv;
          nz *= inv;
          const offset = (y * size + x) * 4;
          normalImage.data[offset] = Math.round((nx * 0.5 + 0.5) * 255);
          normalImage.data[offset + 1] = Math.round((ny * 0.5 + 0.5) * 255);
          normalImage.data[offset + 2] = Math.round((nz * 0.5 + 0.5) * 255);
          normalImage.data[offset + 3] = 255;
        }
      }
      normalCtx.putImageData(normalImage, 0, 0);

      const configureGeneratedTexture = (texture, colorSpace) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.colorSpace = colorSpace;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        return texture;
      };
      const detail = configureGeneratedTexture(new THREE.CanvasTexture(detailCanvas), THREE.NoColorSpace);
      const normal = configureGeneratedTexture(new THREE.CanvasTexture(normalCanvas), THREE.NoColorSpace);
      return { detail, normal };
    }

    function makeTerrainMaterial(detailTexture, normalTexture, mountainConfig, style, snowEnabled) {
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: detailTexture,
        normalMap: normalTexture,
        normalScale: new THREE.Vector2(style.normalStrength, style.normalStrength),
        roughness: mountainConfig.roughness,
        metalness: 0
      });
      material.onBeforeCompile = (shader) => {
        shader.uniforms.terrainSandColor = { value: new THREE.Color(style.sand) };
        shader.uniforms.terrainGrassColor = { value: new THREE.Color(style.grass) };
        shader.uniforms.terrainRockColor = { value: new THREE.Color(style.rock) };
        shader.uniforms.terrainPeakColor = { value: new THREE.Color(style.peak) };
        shader.uniforms.terrainSnowColor = { value: new THREE.Color(style.snow) };
        shader.uniforms.terrainFineRepeat = { value: style.fineRepeat };
        shader.uniforms.terrainMacroRepeat = { value: style.macroRepeat };
        shader.uniforms.terrainShoreHeight = { value: style.shoreHeight };
        shader.uniforms.terrainSnowLine = { value: style.snowLine };
        shader.uniforms.terrainSnowSoftness = { value: style.snowSoftness };
        shader.uniforms.terrainSnowEnabled = { value: snowEnabled ? 1 : 0 };
        shader.uniforms.terrainRockSlope = { value: new THREE.Vector2(style.rockSlope[0], style.rockSlope[1]) };
        shader.uniforms.terrainNormalFade = { value: new THREE.Vector2(style.normalFade[0], style.normalFade[1]) };
        shader.vertexShader = shader.vertexShader
          .replace(
            "void main() {",
            `varying float vTerrainHeight;
varying float vTerrainSlope;
void main() {`
          )
          .replace(
            "#include <beginnormal_vertex>",
            `#include <beginnormal_vertex>
  vTerrainHeight = clamp(position.y, 0.0, 1.0);
  vTerrainSlope = 1.0 - clamp(normal.y, 0.0, 1.0);`
          );
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#define STANDARD",
            `#define STANDARD
uniform vec3 terrainSandColor;
uniform vec3 terrainGrassColor;
uniform vec3 terrainRockColor;
uniform vec3 terrainPeakColor;
uniform vec3 terrainSnowColor;
uniform float terrainFineRepeat;
uniform float terrainMacroRepeat;
uniform float terrainShoreHeight;
uniform float terrainSnowLine;
uniform float terrainSnowSoftness;
uniform float terrainSnowEnabled;
uniform vec2 terrainRockSlope;
uniform vec2 terrainNormalFade;
varying float vTerrainHeight;
varying float vTerrainSlope;`
          )
          .replace(
            "#include <map_fragment>",
            `vec2 terrainFineUv = vMapUv * terrainFineRepeat;
mat2 terrainTurn = mat2(0.8, -0.6, 0.6, 0.8);
vec2 terrainMacroUv = terrainTurn * (vMapUv - 0.5) * terrainMacroRepeat + vec2(0.37, 0.61);
vec4 terrainFine = texture2D(map, terrainFineUv);
vec4 terrainMacro = texture2D(map, terrainMacroUv);
vec4 terrainDetail = mix(terrainMacro, terrainFine, 0.68);
float terrainHeight = clamp(vTerrainHeight, 0.0, 1.0);
float terrainSlope = smoothstep(terrainRockSlope.x, terrainRockSlope.y, vTerrainSlope);
float terrainSandWeight = (1.0 - smoothstep(terrainShoreHeight * 0.42, terrainShoreHeight, terrainHeight)) * (1.0 - terrainSlope * 0.55);
float terrainGrassWeight = smoothstep(terrainShoreHeight * 0.62, terrainShoreHeight * 1.45, terrainHeight) *
  (1.0 - smoothstep(0.52, 0.78, terrainHeight)) * (1.0 - terrainSlope * 0.84);
float terrainSnowWeight = terrainSnowEnabled *
  smoothstep(terrainSnowLine - terrainSnowSoftness, terrainSnowLine + terrainSnowSoftness, terrainHeight) *
  (1.0 - terrainSlope * 0.48);
float terrainRockWeight = 0.18 + terrainSlope * 1.55 + smoothstep(0.42, 0.82, terrainHeight) * 0.34;
vec4 terrainWeights = max(vec4(terrainSandWeight, terrainGrassWeight, terrainRockWeight, terrainSnowWeight), vec4(0.0));
terrainWeights /= max(dot(terrainWeights, vec4(1.0)), 0.0001);
vec3 terrainHighRock = mix(terrainRockColor, terrainPeakColor, smoothstep(0.58, 0.96, terrainHeight));
vec3 terrainBase = terrainSandColor * terrainWeights.r + terrainGrassColor * terrainWeights.g +
  terrainHighRock * terrainWeights.b + terrainSnowColor * terrainWeights.a;
float terrainMicro = dot(terrainWeights, terrainDetail);
float terrainShade = mix(0.78, 1.16, terrainMicro);
terrainShade *= mix(1.0, 0.88 + terrainDetail.b * 0.14, terrainSlope);
diffuseColor.rgb = terrainBase * terrainShade;`
          )
          .replace(
            "#include <normal_fragment_maps>",
            `#ifdef USE_NORMALMAP_OBJECTSPACE
  normal = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;
  #ifdef FLIP_SIDED
    normal = -normal;
  #endif
  #ifdef DOUBLE_SIDED
    normal = normal * faceDirection;
  #endif
  normal = normalize(normalMatrix * normal);
#elif defined(USE_NORMALMAP_TANGENTSPACE)
  vec3 mapN = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;
  float terrainNormalDistance = length(vViewPosition);
  float terrainNormalAmount = 1.0 - smoothstep(terrainNormalFade.x, terrainNormalFade.y, terrainNormalDistance);
  mapN.xy *= normalScale * terrainNormalAmount;
  mapN = normalize(vec3(mapN.xy, max(mapN.z, 0.2)));
  normal = normalize(tbn * mapN);
#endif`
          );
        material.userData.shader = shader;
      };
      material.customProgramCacheKey = () => `sortie-terrain-v3-${snowEnabled ? "snow" : "bare"}`;
      return material;
    }
'''

    text = replace_regex(
        text,
        r'    // Compact, tileable material data for the terrain\..*?\n    function makeTerrainTextureSet\(seed, size = 256\) \{.*?\n    \}\n\n    function makeTerrainMaterial\(detailTexture, normalTexture, mountainConfig, style, snowEnabled\) \{.*?\n    \}\n\n    // Tileable crossing-wave normal map\..*?\n    function makeOceanNormalTexture',
        noise_and_terrain + '\n\n    function makeOceanNormalTexture',
        'terrain/noise function block',
    )

    ocean_and_sky = r'''    // Isotropic, tileable ocean normal data. The material samples this same map
    // at three scales and rotations; keeping one source texture limits memory and
    // lets mip filtering work consistently across all octaves.
    function makeOceanNormalTexture(seed, size = 256) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      const image = ctx.createImageData(size, size);
      const heightField = new Float32Array(size * size);
      for (let y = 0; y < size; y += 1) {
        const v = y / size;
        for (let x = 0; x < size; x += 1) {
          const u = x / size;
          const broad = isotropicTileNoise(u, v, seed);
          const mid = tileableValueNoise(fract01(u + 2 * v), fract01(v - 2 * u), 19, seed ^ 0x37b91d);
          const fine = tileableValueNoise(fract01(3 * u + v), fract01(3 * v - u), 41, seed ^ 0x9a13ef);
          heightField[y * size + x] = broad * 0.58 + mid * 0.29 + fine * 0.13;
        }
      }
      const wrapped = (value) => (value + size) % size;
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const left = heightField[y * size + wrapped(x - 1)];
          const right = heightField[y * size + wrapped(x + 1)];
          const down = heightField[wrapped(y - 1) * size + x];
          const up = heightField[wrapped(y + 1) * size + x];
          let nx = (left - right) * 2.8;
          let ny = (down - up) * 2.8;
          let nz = 1;
          const inv = 1 / Math.hypot(nx, ny, nz);
          nx *= inv;
          ny *= inv;
          nz *= inv;
          const offset = (y * size + x) * 4;
          image.data[offset] = Math.round((nx * 0.5 + 0.5) * 255);
          image.data[offset + 1] = Math.round((ny * 0.5 + 0.5) * 255);
          image.data[offset + 2] = Math.round((nz * 0.5 + 0.5) * 255);
          image.data[offset + 3] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = THREE.NoColorSpace;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
      return texture;
    }

    function makeSkyTexture(stops, atmosphere = {}) {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      for (const [offset, color] of stops) gradient.addColorStop(offset, color);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const seed = atmosphere.seed ?? 0x5a17;
      const noiseAmount = atmosphere.noise ?? 0.012;
      const hazeAmount = atmosphere.haze ?? 0.08;
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < canvas.height; y += 1) {
        const fy = y / (canvas.height - 1);
        const horizon = Math.exp(-Math.pow((fy - 0.5) / 0.105, 2));
        const awayFromHorizon = Math.min(1, Math.abs(fy - 0.5) / 0.5);
        const zenithEnvelope = 0.22 + awayFromHorizon * awayFromHorizon * 0.78;
        const poleFade = 1 - Math.pow(Math.max(0, (awayFromHorizon - 0.78) / 0.22), 2);
        for (let x = 0; x < canvas.width; x += 1) {
          const fx = x / canvas.width;
          const cloudNoise = isotropicTileNoise(fx, fy, seed ^ 0x6de41b);
          const fineNoise = tileableValueNoise(fract01(fx + fy), fract01(fy - fx), 37, seed ^ 0xb13a57);
          const centered = (cloudNoise - 0.5) * 0.72 + (fineNoise - 0.5) * 0.28;
          const lift = centered * noiseAmount * zenithEnvelope * poleFade * 255 + horizon * hazeAmount * 18;
          const offset = (y * canvas.width + x) * 4;
          image.data[offset] = Math.max(0, Math.min(255, image.data[offset] + lift));
          image.data[offset + 1] = Math.max(0, Math.min(255, image.data[offset + 1] + lift));
          image.data[offset + 2] = Math.max(0, Math.min(255, image.data[offset + 2] + lift));
        }
      }
      ctx.putImageData(image, 0, 0);

      const rng = mulberry32(seed ^ 0x72a9);
      const cloudCount = atmosphere.thinClouds ?? 10;
      const cloudOpacity = atmosphere.cloudOpacity ?? 0.035;
      const band = atmosphere.cloudBand || [0.42, 0.68];
      const tint = new THREE.Color(atmosphere.cloudTint ?? 0xffffff);
      const tr = Math.round(tint.r * 255);
      const tg = Math.round(tint.g * 255);
      const tb = Math.round(tint.b * 255);
      const drawWrappedVeil = (x, y, width, height, alpha) => {
        const lobes = 3 + Math.floor(rng() * 3);
        for (const wrap of [-canvas.width, 0, canvas.width]) {
          for (let lobe = 0; lobe < lobes; lobe += 1) {
            const lx = x + wrap + (rng() - 0.5) * width * 0.62;
            const ly = y + (rng() - 0.5) * height * 0.75;
            const lw = width * (0.28 + rng() * 0.28);
            const lh = height * (0.58 + rng() * 0.48);
            ctx.save();
            ctx.translate(lx, ly);
            ctx.scale(lw, lh);
            const veil = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 1);
            veil.addColorStop(0, `rgba(${tr},${tg},${tb},${alpha * (0.68 + rng() * 0.24)})`);
            veil.addColorStop(0.5, `rgba(${tr},${tg},${tb},${alpha * 0.34})`);
            veil.addColorStop(1, `rgba(${tr},${tg},${tb},0)`);
            ctx.fillStyle = veil;
            ctx.beginPath();
            ctx.arc(0, 0, 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      };
      ctx.globalCompositeOperation = "screen";
      for (let i = 0; i < cloudCount; i += 1) {
        const fy = band[0] + rng() * (band[1] - band[0]);
        const y = fy * canvas.height;
        const x = rng() * canvas.width;
        const horizonDistance = Math.abs(fy - 0.5);
        const distribution = Math.min(1, Math.max(0.18, horizonDistance / 0.2));
        const width = 24 + rng() * 50;
        const height = 6 + rng() * 12;
        drawWrappedVeil(x, y, width, height, cloudOpacity * distribution * (0.55 + rng() * 0.45));
      }
      ctx.globalCompositeOperation = "source-over";

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      texture.needsUpdate = true;
      return texture;
    }
'''

    text = replace_regex(
        text,
        r'    function makeOceanNormalTexture\(seed, size = 256\) \{.*?\n    \}\n\n    function makeSkyTexture\(stops, atmosphere = \{\}\) \{.*?\n    \}\n\n    function makeCloudTexture',
        ocean_and_sky + '\n    function makeCloudTexture',
        'ocean/sky function block',
    )

    update_world = r'''    let oceanDriftU = 0;
    let oceanDriftV = 0;
    let oceanNormalDriftU = 0;
    let oceanNormalDriftV = 0;
    let oceanNormalDriftU1 = 0;
    let oceanNormalDriftV1 = 0;
    let oceanNormalDriftU2 = 0;
    let oceanNormalDriftV2 = 0;
    function updateWorld(dt) {
      // Slow colour drift. Normal octaves move independently, with different
      // directions and rates, so the same crest cannot line up into a fabric-like
      // repeat. All offsets remain absolute (drift + camera compensation).
      oceanDriftU += dt * 0.0045;
      oceanDriftV += dt * 0.0018;
      const oceanNormalSpeeds = world.oceanNormalSpeeds || [[0.0105, 0.0035], [-0.004, 0.007], [0.002, -0.01]];
      oceanNormalDriftU += dt * oceanNormalSpeeds[0][0];
      oceanNormalDriftV += dt * oceanNormalSpeeds[0][1];
      oceanNormalDriftU1 += dt * oceanNormalSpeeds[1][0];
      oceanNormalDriftV1 += dt * oceanNormalSpeeds[1][1];
      oceanNormalDriftU2 += dt * oceanNormalSpeeds[2][0];
      oceanNormalDriftV2 += dt * oceanNormalSpeeds[2][1];

      // The ocean plane is finite (OCEAN_PLANE_SIZE), so left alone its rim
      // shows up as "the world ends" after ~18s of boost. Snap it under the
      // camera every frame and cancel the snap in UV space: the mesh follows,
      // the wave pattern stays pinned to the world, so the player still reads
      // motion across the water.
      const camX = camera.position.x;
      const camZ = camera.position.z;
      const ocean = world.ocean;
      if (ocean) {
        ocean.position.x = camX;
        ocean.position.z = camZ;
        const tile = world.oceanTileSize || 1;
        world.oceanTexture.offset.set(
          oceanDriftU + camX / tile,
          oceanDriftV - camZ / tile
        );
        if (world.oceanNormalTexture) {
          const normalTiles = world.oceanNormalTiles || [world.oceanNormalTileSize || tile];
          const normalTile = normalTiles[0] || tile;
          world.oceanNormalTexture.offset.set(
            oceanNormalDriftU + camX / normalTile,
            oceanNormalDriftV - camZ / normalTile
          );
          const offsets = world.oceanWaveOffsets;
          if (offsets && offsets.length >= 3) {
            offsets[0].copy(world.oceanNormalTexture.offset);
            offsets[1].set(
              oceanNormalDriftU1 + camX / normalTiles[1],
              oceanNormalDriftV1 - camZ / normalTiles[1]
            );
            offsets[2].set(
              oceanNormalDriftU2 + camX / normalTiles[2],
              oceanNormalDriftV2 - camZ / normalTiles[2]
            );
          }
        }
      } else {
        world.oceanTexture.offset.set(oceanDriftU, oceanDriftV);
        if (world.oceanNormalTexture) {
          world.oceanNormalTexture.offset.set(oceanNormalDriftU, oceanNormalDriftV);
          const offsets = world.oceanWaveOffsets;
          if (offsets && offsets.length >= 3) {
            offsets[0].copy(world.oceanNormalTexture.offset);
            offsets[1].set(oceanNormalDriftU1, oceanNormalDriftV1);
            offsets[2].set(oceanNormalDriftU2, oceanNormalDriftV2);
          }
        }
      }
'''

    text = replace_regex(
        text,
        r'    let oceanDriftU = 0;\n    let oceanDriftV = 0;\n    let oceanNormalDriftU = 0;\n    let oceanNormalDriftV = 0;\n    function updateWorld\(dt\) \{.*?\n      \}\n\n      // The sun glint',
        update_world + '\n      // The sun glint',
        'updateWorld ocean block',
    )

    ocean_creation = r'''      // Ocean colour is low-contrast, isotropic tile noise. Directional 1-2px
      // rectangles were readable as woven cloth once the normal map sharpened
      // them, so the colour field now has no preferred axis either.
      const oceanCanvas = document.createElement("canvas");
      oceanCanvas.width = 256;
      oceanCanvas.height = 256;
      const oceanCtx = oceanCanvas.getContext("2d");
      const oceanImage = oceanCtx.createImageData(256, 256);
      const parseRgb = (value) => value.split(",").map((part) => Number(part.trim()));
      const baseHex = preset.ocean.base.replace("#", "");
      const baseRgb = [
        parseInt(baseHex.slice(0, 2), 16),
        parseInt(baseHex.slice(2, 4), 16),
        parseInt(baseHex.slice(4, 6), 16)
      ];
      const brightRgb = parseRgb(preset.ocean.bright);
      const darkRgb = parseRgb(preset.ocean.dark);
      const oceanSeed = preset.ocean.normalSeed ?? 0x0cea12;
      for (let y = 0; y < 256; y += 1) {
        const v = y / 256;
        for (let x = 0; x < 256; x += 1) {
          const u = x / 256;
          const broad = isotropicTileNoise(u, v, oceanSeed ^ 0x5a31f7);
          const fine = tileableValueNoise(fract01(u + 2 * v), fract01(v - 2 * u), 43, oceanSeed ^ 0xe17b49);
          const signed = (broad - 0.5) * 0.72 + (fine - 0.5) * 0.28;
          const target = signed >= 0 ? brightRgb : darkRgb;
          const amount = Math.min(0.18, Math.abs(signed) * 0.3);
          const offset = (y * 256 + x) * 4;
          oceanImage.data[offset] = Math.round(baseRgb[0] + (target[0] - baseRgb[0]) * amount);
          oceanImage.data[offset + 1] = Math.round(baseRgb[1] + (target[1] - baseRgb[1]) * amount);
          oceanImage.data[offset + 2] = Math.round(baseRgb[2] + (target[2] - baseRgb[2]) * amount);
          oceanImage.data[offset + 3] = 255;
        }
      }
      oceanCtx.putImageData(oceanImage, 0, 0);
      const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
      const oceanTexture = keepTexture(new THREE.CanvasTexture(oceanCanvas), "oceanColor", estimateWorldTextureBytes(256, 256));
      oceanTexture.wrapS = THREE.RepeatWrapping;
      oceanTexture.wrapT = THREE.RepeatWrapping;
      oceanTexture.repeat.set(preset.ocean.repeat, preset.ocean.repeat);
      oceanTexture.colorSpace = THREE.SRGBColorSpace;
      oceanTexture.generateMipmaps = true;
      oceanTexture.minFilter = THREE.LinearMipmapLinearFilter;
      oceanTexture.magFilter = THREE.LinearFilter;
      oceanTexture.anisotropy = maxAnisotropy;
      oceanTexture.needsUpdate = true;

      const oceanNormalRepeat = preset.ocean.normalRepeat || preset.ocean.repeat * 1.62;
      const oceanNormalRepeats = [oceanNormalRepeat, oceanNormalRepeat * 2.35, oceanNormalRepeat * 5.6];
      const oceanNormalTiles = oceanNormalRepeats.map((repeat) => OCEAN_PLANE_SIZE / repeat);
      const oceanNormalTexture = keepTexture(makeOceanNormalTexture(oceanSeed), "oceanNormal", estimateWorldTextureBytes(256, 256));
      oceanNormalTexture.repeat.set(oceanNormalRepeats[0], oceanNormalRepeats[0]);
      oceanNormalTexture.anisotropy = maxAnisotropy;
      const oceanNormalScale = preset.ocean.normalScale || [0.2, 0.2];
      const baseNormalSpeed = preset.ocean.normalSpeed || [0.0105, 0.0035];
      const oceanNormalSpeeds = [
        [baseNormalSpeed[0], baseNormalSpeed[1]],
        [-baseNormalSpeed[1] * 1.3, baseNormalSpeed[0] * 0.72],
        [baseNormalSpeed[1] * 0.62, -baseNormalSpeed[0] * 1.08]
      ];
      const oceanWaveOffsets = [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()];
      const oceanWaveAngles = preset.ocean.normalAngles || [0.24, -0.71, 1.13];
      const oceanWaveDirections = oceanWaveAngles.map((angle) => new THREE.Vector2(Math.cos(angle), Math.sin(angle)));
      const oceanWaveWeights = new THREE.Vector3(0.58, 0.29, 0.13);
      const oceanWaveFades = [
        new THREE.Vector2(900, Math.min(3600, preset.fog.far * 0.92)),
        new THREE.Vector2(420, Math.min(2300, preset.fog.far * 0.62)),
        new THREE.Vector2(160, Math.min(1250, preset.fog.far * 0.36))
      ];
      const oceanGeometry = keepGeometry(new THREE.PlaneGeometry(OCEAN_PLANE_SIZE, OCEAN_PLANE_SIZE, 1, 1));
      oceanGeometry.rotateX(-Math.PI / 2);
      const oceanMaterial = keepMaterial(new THREE.MeshStandardMaterial({
        map: oceanTexture,
        normalMap: oceanNormalTexture,
        normalScale: new THREE.Vector2(1, 1),
        roughness: preset.ocean.roughness,
        metalness: preset.ocean.metalness
      }));
      oceanMaterial.onBeforeCompile = (shader) => {
        shader.uniforms.oceanWaveRepeat = { value: new THREE.Vector3(oceanNormalRepeats[0], oceanNormalRepeats[1], oceanNormalRepeats[2]) };
        shader.uniforms.oceanWaveOffset0 = { value: oceanWaveOffsets[0] };
        shader.uniforms.oceanWaveOffset1 = { value: oceanWaveOffsets[1] };
        shader.uniforms.oceanWaveOffset2 = { value: oceanWaveOffsets[2] };
        shader.uniforms.oceanWaveDirection0 = { value: oceanWaveDirections[0] };
        shader.uniforms.oceanWaveDirection1 = { value: oceanWaveDirections[1] };
        shader.uniforms.oceanWaveDirection2 = { value: oceanWaveDirections[2] };
        shader.uniforms.oceanWaveWeights = { value: oceanWaveWeights };
        shader.uniforms.oceanWaveFade0 = { value: oceanWaveFades[0] };
        shader.uniforms.oceanWaveFade1 = { value: oceanWaveFades[1] };
        shader.uniforms.oceanWaveFade2 = { value: oceanWaveFades[2] };
        shader.uniforms.oceanNormalStrength = { value: new THREE.Vector2(oceanNormalScale[0], oceanNormalScale[1]) };
        shader.vertexShader = shader.vertexShader
          .replace("void main() {", `varying vec2 vOceanUv;\nvoid main() {`)
          .replace("#include <uv_vertex>", `#include <uv_vertex>\n  vOceanUv = uv;`);
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#define STANDARD",
            `#define STANDARD
uniform vec3 oceanWaveRepeat;
uniform vec2 oceanWaveOffset0;
uniform vec2 oceanWaveOffset1;
uniform vec2 oceanWaveOffset2;
uniform vec2 oceanWaveDirection0;
uniform vec2 oceanWaveDirection1;
uniform vec2 oceanWaveDirection2;
uniform vec3 oceanWaveWeights;
uniform vec2 oceanWaveFade0;
uniform vec2 oceanWaveFade1;
uniform vec2 oceanWaveFade2;
uniform vec2 oceanNormalStrength;
varying vec2 vOceanUv;`
          )
          .replace(
            "#include <normal_fragment_maps>",
            `#ifdef USE_NORMALMAP_OBJECTSPACE
  normal = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;
  #ifdef FLIP_SIDED
    normal = -normal;
  #endif
  #ifdef DOUBLE_SIDED
    normal = normal * faceDirection;
  #endif
  normal = normalize(normalMatrix * normal);
#elif defined(USE_NORMALMAP_TANGENTSPACE)
  vec2 base0 = vOceanUv * oceanWaveRepeat.x + oceanWaveOffset0;
  vec2 base1 = vOceanUv * oceanWaveRepeat.y + oceanWaveOffset1;
  vec2 base2 = vOceanUv * oceanWaveRepeat.z + oceanWaveOffset2;
  vec2 uv0 = vec2(oceanWaveDirection0.x * base0.x - oceanWaveDirection0.y * base0.y,
                  oceanWaveDirection0.y * base0.x + oceanWaveDirection0.x * base0.y);
  vec2 uv1 = vec2(oceanWaveDirection1.x * base1.x - oceanWaveDirection1.y * base1.y,
                  oceanWaveDirection1.y * base1.x + oceanWaveDirection1.x * base1.y);
  vec2 uv2 = vec2(oceanWaveDirection2.x * base2.x - oceanWaveDirection2.y * base2.y,
                  oceanWaveDirection2.y * base2.x + oceanWaveDirection2.x * base2.y);
  vec2 n0 = texture2D(normalMap, uv0).xy * 2.0 - 1.0;
  vec2 n1 = texture2D(normalMap, uv1).xy * 2.0 - 1.0;
  vec2 n2 = texture2D(normalMap, uv2).xy * 2.0 - 1.0;
  n0 = vec2(oceanWaveDirection0.x * n0.x + oceanWaveDirection0.y * n0.y,
            -oceanWaveDirection0.y * n0.x + oceanWaveDirection0.x * n0.y);
  n1 = vec2(oceanWaveDirection1.x * n1.x + oceanWaveDirection1.y * n1.y,
            -oceanWaveDirection1.y * n1.x + oceanWaveDirection1.x * n1.y);
  n2 = vec2(oceanWaveDirection2.x * n2.x + oceanWaveDirection2.y * n2.y,
            -oceanWaveDirection2.y * n2.x + oceanWaveDirection2.x * n2.y);
  float oceanDistance = length(vViewPosition);
  float fade0 = 1.0 - smoothstep(oceanWaveFade0.x, oceanWaveFade0.y, oceanDistance);
  float fade1 = 1.0 - smoothstep(oceanWaveFade1.x, oceanWaveFade1.y, oceanDistance);
  float fade2 = 1.0 - smoothstep(oceanWaveFade2.x, oceanWaveFade2.y, oceanDistance);
  vec2 oceanSlope = n0 * oceanWaveWeights.x * fade0 +
                    n1 * oceanWaveWeights.y * fade1 +
                    n2 * oceanWaveWeights.z * fade2;
  oceanSlope *= oceanNormalStrength;
  vec3 mapN = normalize(vec3(oceanSlope, 1.0));
  normal = normalize(tbn * mapN);
#endif`
          );
        oceanMaterial.userData.shader = shader;
      };
      oceanMaterial.customProgramCacheKey = () => "sortie-ocean-v3";
      const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
      ocean.position.y = 0;
      // The plane rides with the camera (see updateWorld), so its own extent is
      // never the horizon - fog far is. Frustum culling has to go: the bounding
      // sphere is computed from the un-snapped geometry origin.
      ocean.frustumCulled = false;
      addRoot(ocean);

      // World units covered by one texture tile. The first normal octave retains
      // the established probe contract; the other two use the same camera-lock
      // equation at independent scales.
      const oceanTileSize = OCEAN_PLANE_SIZE / preset.ocean.repeat;
      const oceanNormalTileSize = oceanNormalTiles[0];
'''

    text = replace_regex(
        text,
        r'      // Ocean with a scrolling wave-noise texture.*?\n      const oceanCanvas = document.createElement\("canvas"\);.*?\n      const oceanNormalTileSize = OCEAN_PLANE_SIZE / oceanNormalRepeat;\n',
        ocean_creation,
        'createWorld ocean block',
    )

    # Default terrain fade and max anisotropy (the user explicitly requested the
    # renderer limit, not an arbitrary cap of four).
    text = replace_once(
        text,
        '        normalStrength: 0.46,\n        islandNormalStrength: 0.24,\n        rockSlope: [0.22, 0.68],',
        '        normalStrength: 0.22,\n        islandNormalStrength: 0.12,\n        normalFade: [320, 2200],\n        rockSlope: [0.22, 0.68],',
        'terrain style defaults',
    )
    text = replace_once(
        text,
        '      const terrainAnisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());',
        '      const terrainAnisotropy = renderer.capabilities.getMaxAnisotropy();',
        'terrain anisotropy cap',
    )

    # Return all octave data for updateWorld while retaining the original first-
    # octave names used by existing probes and tests.
    text = replace_once(
        text,
        '        preset: key, label: preset.label, skyGroup, oceanTexture, oceanNormalTexture, cloudVolumes, mountains,\n        ocean, oceanTileSize, oceanNormalTileSize, oceanNormalSpeed, sunRoad,',
        '        preset: key, label: preset.label, skyGroup, oceanTexture, oceanNormalTexture, cloudVolumes, mountains,\n        ocean, oceanTileSize, oceanNormalTileSize, oceanNormalTiles, oceanNormalSpeeds, oceanWaveOffsets, sunRoad,',
        'world return ocean fields',
    )

    # Reset all three normal octaves on a preset swap.
    text = replace_once(
        text,
        '      oceanNormalDriftU = 0;\n      oceanNormalDriftV = 0;\n      return true;',
        '      oceanNormalDriftU = 0;\n      oceanNormalDriftV = 0;\n      oceanNormalDriftU1 = 0;\n      oceanNormalDriftV1 = 0;\n      oceanNormalDriftU2 = 0;\n      oceanNormalDriftV2 = 0;\n      return true;',
        'preset drift reset',
    )

    # Add octave diagnostics without changing existing fields consumed by tests.
    text = replace_once(
        text,
        '          normalDriftU: oceanNormalDriftU,\n          normalDriftV: oceanNormalDriftV,\n          sunRoadX:',
        '          normalDriftU: oceanNormalDriftU,\n          normalDriftV: oceanNormalDriftV,\n          normalOctaves: world.oceanWaveOffsets ? world.oceanWaveOffsets.map((offset, index) => ({\n            tile: world.oceanNormalTiles[index], offsetU: offset.x, offsetV: offset.y,\n            driftU: [oceanNormalDriftU, oceanNormalDriftU1, oceanNormalDriftU2][index],\n            driftV: [oceanNormalDriftV, oceanNormalDriftV1, oceanNormalDriftV2][index]\n          })) : [],\n          sunRoadX:',
        'ocean probe octave diagnostics',
    )


    text = replace_once(
        text,
        '      const skyTexture = keepTexture(makeSkyTexture(preset.sky, preset.atmosphere || {}), "sky", estimateWorldTextureBytes(256, 512, false));',
        '      const skyTexture = keepTexture(makeSkyTexture(preset.sky, preset.atmosphere || {}), "sky", estimateWorldTextureBytes(256, 512));',
        'sky mip estimate',
    )

    # Guardrails: exact surface/placement routines and the disposer must remain
    # present, generated textures must be tracked, and only LF may be written.
    required = [
        'function surfaceHeightAt(',
        'function disposeWorld(target)',
        'for (const item of target.textures) item.dispose();',
        'ocean.position.x = camX;',
        'ocean.position.z = camZ;',
        'THREE.LinearMipmapLinearFilter',
        'renderer.capabilities.getMaxAnisotropy()',
        'sortie-ocean-v3',
        'sortie-terrain-v3',
    ]
    for needle in required:
        if needle not in text:
            raise RuntimeError(f"required guardrail missing after patch: {needle}")
    if '\r' in text:
        raise RuntimeError("patch introduced CR characters")

    path.write_text(text, encoding="utf-8", newline="\n")
    print(f"patched {path}: {len(raw)} -> {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
