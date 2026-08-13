import fs from 'node:fs';

const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const must = (value, message) => { if (!value) throw new Error(`[air-iff] ${message}`); };
const includes = (text, message) => must(source.includes(text), message);

// Sera gameplay classification stays intact; only the HUD renderer is reverted.
includes('const CONTACT_DISPOSITION = Object.freeze({', 'missing disposition enum');
includes('HOSTILE_OPTIONAL: "HOSTILE_OPTIONAL"', 'missing optional-hostile disposition');
includes('function contactDisposition(entry, source = "enemy")', 'missing central classifier');
includes('"hostileOptional"', 'HUD marker loses optional-hostile disposition metadata');
includes('function contactRankValue(enemy)', 'rank-neutral value function missing');
includes('rankNeutral: Boolean(entry.rankNeutral)', 'wave normalization drops rankNeutral');
includes('let spawningRankNeutral = false;', 'spawn relay missing');
includes('checkpoint.spawningRankNeutral = spawningRankNeutral;', 'checkpoint save missing');
includes('spawningRankNeutral = Boolean(at.spawningRankNeutral);', 'checkpoint restore missing');
includes('rankStats.playerKillValue += contactRankValue(enemy);', 'rank numerator is not neutral-aware');
must((source.match(/rankNeutral: spawningRankNeutral,/g) || []).length === 3, 'expected air/heli/ship rank-neutral propagation');

// Exact HUD contract from ae212b6983d1c48de9a0e4fadfc714c11998075e.
includes('border: 1px solid rgba(112, 255, 151, 0.92);\n      color: #78ff9d;', 'legacy green enemy frame missing');
includes('filter: drop-shadow(0 0 5px rgba(65, 255, 126, 0.68));', 'legacy green enemy glow missing');
includes('.enemyMarker.locked,\n    .enemyMarker.multiLocked {\n      color: #ff5968;\n      border-color: currentColor;\n    }', 'legacy red lock state missing');
must(!source.includes('.enemyMarker.selected {\n      outline: 1px solid currentColor;'), 'post-legacy selection outline returned');
must(!source.includes('.enemyMarker.hostileOptional {\n      color: #f4f7fa;'), 'post-legacy white contact-frame override returned');
must(!source.includes('.enemyMarker.tgt {\n      color: #ff5968;'), 'post-legacy red TGT contact-frame override returned');
must(!source.includes('IFF contract: every friendly/support contact is blue.'), 'post-legacy friendly marker override returned');
includes('const isTgt = isTgtEntry(enemy);\n        const blipColor = isTgt ? "#ff5968" : "#f4f7fa";', 'legacy radar contact colour path missing');
includes('ctx.fillStyle = FRIENDLY_RADAR_COLOR;\n        ctx.shadowColor = FRIENDLY_RADAR_COLOR;', 'legacy friendly radar path missing');

console.log('check_air_iff_foundation: OK');
