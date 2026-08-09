from __future__ import annotations

from pathlib import Path
import re
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def replace_section(text: str, start: str, end: str, new: str, label: str) -> str:
    starts = [m.start() for m in re.finditer(re.escape(start), text)]
    if len(starts) != 1:
        raise RuntimeError(f"{label}: expected one start marker, found {len(starts)}")
    begin = starts[0]
    finish = text.find(end, begin + len(start))
    if finish < 0:
        raise RuntimeError(f"{label}: end marker not found")
    return text[:begin] + new + text[finish:]


def check_module_source(source: str) -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        path = Path(temp_dir) / "index-module.mjs"
        path.write_text(source, encoding="utf-8", newline="\n")
        subprocess.run(["node", "--check", str(path)], check=True)


def main() -> None:
    original = INDEX.read_text(encoding="utf-8")
    text = original

    text = replace_section(
        text,
        "    function spawnFriendlyWingman() {",
        "\n    function spawnFriendlyCarrier(config) {",
        """    function spawnFriendlyWingman(config = null) {
      // A reboot mission may author more than one wingman, with its own
      // callsign, radio identity and formation slot. Stock deployments still
      // call this with no arguments and receive the historic campaign entry.
      const campaignEntry = WINGMAN_BY_CAMPAIGN[selectedCampaignId] || WINGMAN_BY_CAMPAIGN.usa;
      const type = config && config.type ? config.type : campaignEntry.type;
      const spec = AIRCRAFT_TYPES[type];
      if (!spec) throw new Error(`[friendly] unknown wingman aircraft \"${type}\"`);
      const authoredOffset = config && config.offset ? config.offset : {};
      const numberOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
      const wingOffset = Object.freeze({
        back: numberOr(authoredOffset.back, WINGMAN_OFFSET.back),
        side: numberOr(authoredOffset.side, WINGMAN_OFFSET.side),
        up: numberOr(authoredOffset.up, WINGMAN_OFFSET.up)
      });

      const group = new THREE.Group();
      const model = createAircraftModel(spec.theme);
      group.add(model.group);
      // Deliberately no hitbox mesh. Player weapons only inspect enemies[].
      scene.add(group);

      forwardOf(player, tmpV1);
      rightOf(player, tmpV3);
      group.position.copy(player.position)
        .addScaledVector(tmpV1, -wingOffset.back)
        .addScaledVector(tmpV3, wingOffset.side);
      group.position.y += wingOffset.up;
      group.quaternion.copy(player.quaternion);

      const friendly = {
        kind: \"wingman\",
        type,
        label: config && config.label ? config.label : campaignEntry.callsign,
        radioSpeaker: config && config.radioSpeaker ? config.radioSpeaker : \"wingman\",
        wingOffset,
        // Invulnerable by construction: no player or enemy damage path owns a
        // hitbox for this kind. `alive` is shared marker/radar state.
        alive: true,
        group,
        model,
        radarSymbol: \"air\",
        wingSpeed: playerSpeed,
        wingBank: 0,
        wingMode: \"form\",
        wingTargetId: null,
        wingModeTimer: WINGMAN_REJOIN_TIME,
        wingFireCooldown: 0,
        wingKillRadioTimer: 0,
        wingCruise: spec.cruiseSpeed,
        wingBoost: spec.boostSpeed,
        wingAim: group.position.clone(),
        wingStationError: 0,
        wingGunDamage: spec.gunDamage * WINGMAN_GUN_DAMAGE_SCALE
      };
      friendlies.push(friendly);
      return friendly;
    }
""",
        "configurable wingman spawner",
    )

    text = replace_section(
        text,
        "    function spawnMissionFriendlies(mission) {",
        "\n    // Turns whatever vulnerable friendlies the deployment put up into the",
        """    function missionFriendlyDeployment(mission) {
      if (!mission) return null;
      return mission.friendlies || FRIENDLY_DEPLOYMENTS[mission.key] || null;
    }

    function spawnMissionFriendlies(mission) {
      const deployment = missionFriendlyDeployment(mission);
      if (!deployment) return;
      // Only ever a second airfield when the mission does not already stand
      // one up itself.
      if (deployment.airbase && !mission.friendlyBase) spawnFriendlyBase(deployment.airbase);
      if (deployment.carrier) spawnFriendlyCarrier(deployment.carrier);
      if (deployment.ships) spawnFriendlyShips(deployment.ships);
      if (deployment.transports) spawnFriendlyTransports(deployment.transports);
      if (Array.isArray(deployment.wingmen)) {
        for (const wingman of deployment.wingmen) spawnFriendlyWingman(wingman);
      } else if (deployment.wingman) {
        spawnFriendlyWingman();
      }
      // After the spawns, so the objective is counted off what is actually on
      // the board rather than off what the table asked for.
      if (deployment.guard) armGuardObjective(deployment.guard);
    }
""",
        "mission-owned friendly roster",
    )

    text = replace_section(
        text,
        "    function applyFriendlyPlayerStart(mission) {",
        "\n    function updateFriendlies(dt) {",
        """    function applyFriendlyPlayerStart(mission) {
      const deployment = missionFriendlyDeployment(mission);
      if (!deployment || !deployment.playerStart) return;
      const start = deployment.playerStart;
      player.position.set(start.x, start.y, start.z);
      // A facing point is less error-prone than a duplicated heading convention:
      // the quaternion is derived from the same LOCAL_FORWARD used everywhere
      // else in the flight model.
      if (start.facing) {
        tmpV1.set(start.facing.x - start.x, 0, start.facing.z - start.z);
        if (tmpV1.lengthSq() > 0.001) {
          tmpV1.normalize();
          playerFlightFrame.setFromUnitVectors(LOCAL_FORWARD, tmpV1);
          playerBank = 0;
        }
      }
      syncPlayerOrientation();
    }
""",
        "mission-owned player start",
    )

    text = replace_once(
        text,
        """      } else {
        forwardOf(player, tmpV1);
        rightOf(player, tmpV3);
        tmpV4.copy(player.position)
          .addScaledVector(tmpV1, -WINGMAN_OFFSET.back)
          .addScaledVector(tmpV3, WINGMAN_OFFSET.side);
        tmpV4.y += WINGMAN_OFFSET.up;
      }
""",
        """      } else {
        const wingOffset = friendly.wingOffset || WINGMAN_OFFSET;
        forwardOf(player, tmpV1);
        rightOf(player, tmpV3);
        tmpV4.copy(player.position)
          .addScaledVector(tmpV1, -wingOffset.back)
          .addScaledVector(tmpV3, wingOffset.side);
        tmpV4.y += wingOffset.up;
      }
""",
        "per-wingman formation slot",
    )

    text = replace_once(
        text,
        """        const attacksMe = enemy.huntRef === friendly;
        if (!attacksMe && player.position.distanceTo(enemy.group.position) < WINGMAN_POACH_GUARD) continue;
""",
        """        const attacksMe = enemy.huntRef === friendly;
        const claimedByOther = friendlies.some(
          (other) => other !== friendly
            && other.kind === \"wingman\"
            && other.alive
            && other.wingTargetId === enemy.id
        );
        if (!attacksMe && claimedByOther) continue;
        if (!attacksMe && player.position.distanceTo(enemy.group.position) < WINGMAN_POACH_GUARD) continue;
""",
        "split wingman prey",
    )

    text = replace_once(
        text,
        """      triggerRadioLine(
        \"wingman\",
        \"こっちで1機落とした。数は減らしておく——本命は任せる。\",
""",
        """      triggerRadioLine(
        friendly.radioSpeaker || \"wingman\",
        \"こっちで1機落とした。数は減らしておく——本命は任せる。\",
""",
        "wingman-specific kill radio",
    )

    text = replace_once(
        text,
        """      // The one wingman, if it is flying this sortie - resolved once per
      // pass for the wingman-hater charge runs below.
      let wingmanRef = null;
      for (const friendly of friendlies) {
        if (friendly.kind === \"wingman\" && friendly.alive) { wingmanRef = friendly; break; }
      }
""",
        """      // All live wingmen, resolved once per pass. Hater flights are
      // distributed deterministically so CROWN and LARK both draw pressure.
      const wingmanRefs = friendlies.filter(
        (friendly) => friendly.kind === \"wingman\" && friendly.alive
      );
""",
        "collect all wingmen",
    )
    text = replace_once(
        text,
        """        if (!enemy.huntRef && enemy.wingmanHunter && wingmanRef && distanceToPlayer > WINGMAN_HATER_YIELD) {
          enemy.huntRef = wingmanRef;
        }
""",
        """        if (
          !enemy.huntRef
          && enemy.wingmanHunter
          && wingmanRefs.length > 0
          && distanceToPlayer > WINGMAN_HATER_YIELD
        ) {
          enemy.huntRef = wingmanRefs[Math.abs(enemy.serial || 0) % wingmanRefs.length];
        }
""",
        "distribute wingman hunters",
    )

    required = (
        "function missionFriendlyDeployment(mission)",
        "Array.isArray(deployment.wingmen)",
        "radioSpeaker:",
        "wingOffset,",
        "playerFlightFrame.setFromUnitVectors(LOCAL_FORWARD, tmpV1)",
        "const claimedByOther = friendlies.some(",
        "const wingmanRefs = friendlies.filter(",
    )
    for token in required:
        if token not in text:
            raise RuntimeError(f"patched index missing {token!r}")

    module = re.search(r'<script type="module">\n(?P<body>.*)\n  </script>', text, re.DOTALL)
    if not module:
        raise RuntimeError("could not extract index module")
    check_module_source(module.group("body"))
    if "\r" in text:
        raise RuntimeError("index.html must remain LF-only")
    if text == original:
        raise RuntimeError("ROOK host patch produced no changes")
    INDEX.write_text(text, encoding="utf-8", newline="\n")
    print("Sera M01 ROOK host patch applied and syntax checked")


if __name__ == "__main__":
    main()
