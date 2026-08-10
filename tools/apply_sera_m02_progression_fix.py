#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
CHECK = ROOT / "tools" / "check_sera_m02_host.mjs"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


source = INDEX.read_text(encoding="utf-8")

source = replace_once(
    source,
    '    const STRIKE_AIR_TYPES = Object.freeze(new Set(["bomber", "tu95", "tu22m3"]));',
    '    const STRIKE_AIR_TYPES = Object.freeze(new Set(["bomber", "tu95", "tu22m3", "su24m"]));',
    "Su-24M strike-air registration",
)

source = replace_once(
    source,
    '''      const strikeSpawn = STRIKE_AIR_TYPES.has(spec.key) && friendlyBase;
      if (strikeSpawn) tmpV1.set(friendlyBase.x, position.y, friendlyBase.z).sub(position).normalize();
      else if (spawningForward) tmpV1.copy(spawningForward);''',
    '''      const strikeSpawnObjective = Number.isInteger(spawningFacilityIndex)
        ? protectedFacilities[spawningFacilityIndex]
        : friendlyBase;
      const strikeSpawn = STRIKE_AIR_TYPES.has(spec.key) && strikeSpawnObjective;
      if (strikeSpawn) {
        tmpV1.set(
          strikeSpawnObjective.x,
          position.y,
          strikeSpawnObjective.z
        ).sub(position).normalize();
      } else if (spawningForward) tmpV1.copy(spawningForward);''',
    "multi-facility strike spawn heading",
)

source = replace_once(
    source,
    '''      // A trailing run of non-TGT entries is not a wave the player must wait
      // for, so "last" means "no designated targets left to spawn".
      const tgtRemaining = mission.waves.slice(missionWaveIndex).some(isTgtEntry);''',
    '''      // A trailing non-TGT air wave is normally optional. M02's last white
      // cover wave is different: spawning it reveals the red TEL ground phase,
      // so its activation contract must keep the mission progression alive.
      const tgtRemaining = mission.waves.slice(missionWaveIndex).some(
        (wave) => isTgtEntry(wave) || Boolean(wave.activateGroundPhase)
      );''',
    "objective-activating trailing wave progression",
)

INDEX.write_text(source, encoding="utf-8")

check = CHECK.read_text(encoding="utf-8")
anchor = '''  'function failEscapingGroundTarget(enemy)',
  'rankNeutral: Boolean(rankNeutral)',
  'if (protectedFacilities.length > 0) return updateProtectedFacilityThreat();','''
replacement = '''  'function failEscapingGroundTarget(enemy)',
  'rankNeutral: Boolean(rankNeutral)',
  'new Set(["bomber", "tu95", "tu22m3", "su24m"])',
  'const strikeSpawnObjective = Number.isInteger(spawningFacilityIndex)',
  '(wave) => isTgtEntry(wave) || Boolean(wave.activateGroundPhase)',
  'if (protectedFacilities.length > 0) return updateProtectedFacilityThreat();','''
check = replace_once(check, anchor, replacement, "M02 progression host checks")
CHECK.write_text(check, encoding="utf-8")

print("apply_sera_m02_progression_fix: Su-24M strike routing and trailing TEL reveal progression fixed")
