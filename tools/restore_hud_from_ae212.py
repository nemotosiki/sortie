#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
IFF_CHECK = ROOT / "tools" / "check_air_iff_foundation.mjs"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def remove_at_most_once(text: str, old: str, label: str) -> str:
    count = text.count(old)
    if count > 1:
        raise RuntimeError(f"{label}: expected at most one match, found {count}")
    return text.replace(old, "", 1) if count == 1 else text


def restore_index() -> None:
    source = INDEX.read_text(encoding="utf-8")

    # Exact visual baseline: ae212b6983d1c48de9a0e4fadfc714c11998075e,
    # immediately before 087e50ed recoloured the contact HUD. Replace the whole
    # marker header so the white glow used by the later hostileOptional rule can
    # never be mistaken for the base marker glow.
    source = replace_once(
        source,
        '''    .enemyMarker {
      position: absolute;
      width: 24px;
      height: 24px;
      transform: translate(-50%, -50%);
      border: 1px solid currentColor;
      color: #f4f7fa;
      opacity: 0;
      visibility: hidden;
      filter: drop-shadow(0 0 5px rgba(244, 247, 250, 0.55));
''',
        '''    .enemyMarker {
      position: absolute;
      width: 24px;
      height: 24px;
      transform: translate(-50%, -50%);
      border: 1px solid rgba(112, 255, 151, 0.92);
      color: #78ff9d;
      opacity: 0;
      visibility: hidden;
      filter: drop-shadow(0 0 5px rgba(65, 255, 126, 0.68));
''',
        "legacy enemy marker block",
    )

    source = replace_once(
        source,
        '''    .enemyMarker.hostileOptional {
      color: #f4f7fa;
      filter: drop-shadow(0 0 5px rgba(244, 247, 250, 0.55));
    }

    .enemyMarker.tgt {
      color: #ff5968;
      filter: drop-shadow(0 0 6px rgba(255, 89, 104, 0.72));
    }

''',
        "",
        "remove three-colour contact-frame overrides",
    )
    source = replace_once(
        source,
        "       white frame, plus TGT if the mission designated it. */",
        "       green frame, plus TGT if the mission designated it. */",
        "legacy marker comment",
    )

    # f099d941 changed selection/lock geometry to preserve the three-colour
    # palette. Restore its parent code verbatim: selection does not add a frame;
    # seeker lock makes the existing green contact red.
    source = replace_once(
        source,
        '''    /* Contact colour is immutable IFF. Selection and lock are geometry:
       an outer frame, a thicker border and the existing inner diamond. */
    .enemyMarker.selected {
      outline: 1px solid currentColor;
      outline-offset: 3px;
    }

    .enemyMarker.locked,
    .enemyMarker.multiLocked {
      border-width: 2px;
      border-color: currentColor;
    }

    .enemyMarker.locked::before,
    .enemyMarker.multiLocked::before {
      animation: contactLockPulse 620ms ease-in-out infinite;
    }

    @keyframes contactLockPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.42; }
    }
''',
        '''    /* Selection is shown by the caption, not by the frame: the box stays the
       same green box every other contact has. */

    .enemyMarker.locked,
    .enemyMarker.multiLocked {
      color: #ff5968;
      border-color: currentColor;
    }
''',
        "legacy selection/lock rendering",
    )

    # This entire late override was introduced by 087e50ed. Removing it reveals
    # the friendly marker rules already present in ae212 instead of synthesising
    # a replacement style.
    source = replace_once(
        source,
        '''    /* IFF contract: every friendly/support contact is blue. This late rule
       deliberately overrides the historical green friendly marker without
       changing its diamond geometry or lock exclusion. */
    .friendlyMarker,
    .friendlyMarker.active {
      color: #68beff;
      border-color: #68beff;
      filter: drop-shadow(0 0 5px rgba(104, 190, 255, 0.68));
    }

    .friendlyMarker::before,
    .friendlyMarkerLabel {
      color: #68beff;
      border-color: currentColor;
    }

''',
        "",
        "remove late friendly IFF override",
    )

    # Radar rendering is also restored to the exact pre-087e code. The internal
    # contactDisposition classifier remains available to Sera mission logic and
    # debug probes; it simply no longer owns HUD colours.
    source = replace_once(
        source,
        '''        const disposition = contactDisposition(enemy);
        const isTgt = disposition === CONTACT_DISPOSITION.TGT;
        const blipColor = CONTACT_COLORS[disposition];''',
        '''        const isTgt = isTgtEntry(enemy);
        const blipColor = isTgt ? "#ff5968" : "#f4f7fa";''',
        "legacy enemy radar colours",
    )
    source = replace_once(
        source,
        '''        const friendlyBlipColor = CONTACT_COLORS[CONTACT_DISPOSITION.FRIENDLY];
        ctx.fillStyle = friendlyBlipColor;
        ctx.shadowColor = friendlyBlipColor;''',
        '''        ctx.fillStyle = FRIENDLY_RADAR_COLOR;
        ctx.shadowColor = FRIENDLY_RADAR_COLOR;''',
        "legacy friendly radar colour path",
    )

    source = remove_at_most_once(
        source,
        "      hook.hud.selectionUsesColour = false;\n      hook.hud.hasIndependentOffscreenTargetArrow = false;\n",
        "remove post-legacy HUD debug flags",
    )

    INDEX.write_text(source, encoding="utf-8", newline="\n")


def rewrite_iff_check() -> None:
    IFF_CHECK.write_text(
        '''import fs from 'node:fs';

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
includes('border: 1px solid rgba(112, 255, 151, 0.92);\\n      color: #78ff9d;', 'legacy green enemy frame missing');
includes('filter: drop-shadow(0 0 5px rgba(65, 255, 126, 0.68));', 'legacy green enemy glow missing');
includes('.enemyMarker.locked,\\n    .enemyMarker.multiLocked {\\n      color: #ff5968;\\n      border-color: currentColor;\\n    }', 'legacy red lock state missing');
must(!source.includes('.enemyMarker.selected {\\n      outline: 1px solid currentColor;'), 'post-legacy selection outline returned');
must(!source.includes('.enemyMarker.hostileOptional {\\n      color: #f4f7fa;'), 'post-legacy white contact-frame override returned');
must(!source.includes('.enemyMarker.tgt {\\n      color: #ff5968;'), 'post-legacy red TGT contact-frame override returned');
must(!source.includes('IFF contract: every friendly/support contact is blue.'), 'post-legacy friendly marker override returned');
includes('const isTgt = isTgtEntry(enemy);\\n        const blipColor = isTgt ? "#ff5968" : "#f4f7fa";', 'legacy radar contact colour path missing');
includes('ctx.fillStyle = FRIENDLY_RADAR_COLOR;\\n        ctx.shadowColor = FRIENDLY_RADAR_COLOR;', 'legacy friendly radar path missing');

console.log('check_air_iff_foundation: OK');
''',
        encoding="utf-8",
        newline="\n",
    )


def main() -> None:
    restore_index()
    rewrite_iff_check()
    print("restore_hud_from_ae212: restored historical HUD rendering")


if __name__ == "__main__":
    main()
