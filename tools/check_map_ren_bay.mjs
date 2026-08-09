// RECOVERED from the previous execution record; NOT YET RUN AGAINST THE REPO.
import fs from 'node:fs';
const p = 'payloads/map_renBay.payload.js';
const s = fs.readFileSync(p, 'utf8');
const must = [
  'ctx.addWorldPreset("renBay"',
  'ctx.addWorldDecorator("renBayWorks"',
  'worlds: ["renBay"]',
  'Medical aviation district',
  'Airport: two parallel runways'
];
for (const token of must) {
  if (!s.includes(token)) throw new Error(`renBay missing ${token}`);
}
if (/\bscene\.add\s*\(/.test(s)) throw new Error('renBay decorator must not use scene.add');
if (/\bdispose\s*\(/.test(s)) throw new Error('renBay decorator must not own disposal');
console.log('renBay payload contract ok');
