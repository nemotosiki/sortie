import fs from 'node:fs';

const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const must = (value, message) => { if (!value) throw new Error(`[air-iff] ${message}`); };
const includes = (text, message) => must(source.includes(text), message);

includes('const CONTACT_DISPOSITION = Object.freeze({', 'missing disposition enum');
includes('HOSTILE_OPTIONAL: \"HOSTILE_OPTIONAL\"', 'missing optional-hostile disposition');
includes('function contactDisposition(entry, source = \"enemy\")', 'missing central classifier');
includes('const blipColor = CONTACT_COLORS[disposition];', 'radar bypasses central palette');
includes('\"hostileOptional\"', 'HUD marker lacks optional-hostile class');
includes('.enemyMarker.tgt {', 'TGT marker colour class missing');
includes('.friendlyMarker,\n    .friendlyMarker.active {', 'friendly marker blue override missing');
includes('.enemyMarker.selected {', 'selection geometry missing');
includes('function contactRankValue(enemy)', 'rank-neutral value function missing');
includes('rankNeutral: Boolean(entry.rankNeutral)', 'wave normalization drops rankNeutral');
includes('let spawningRankNeutral = false;', 'spawn relay missing');
includes('checkpoint.spawningRankNeutral = spawningRankNeutral;', 'checkpoint save missing');
includes('spawningRankNeutral = Boolean(at.spawningRankNeutral);', 'checkpoint restore missing');
includes('rankStats.playerKillValue += contactRankValue(enemy);', 'rank numerator is not neutral-aware');
must((source.match(/rankNeutral: spawningRankNeutral,/g) || []).length === 3, 'expected air/heli/ship rank-neutral propagation');
must(!/\\.enemyMarker\\.locked,[\\s\\S]{0,220}color:\\s*#ff5968/.test(source), 'lock still overwrites IFF colour');
console.log('check_air_iff_foundation: OK');
