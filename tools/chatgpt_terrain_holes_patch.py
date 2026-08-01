from __future__ import annotations

from pathlib import Path
import re
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"


def require_once(text: str, needle: str, label: str) -> None:
    count = text.count(needle)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    require_once(text, old, label)
    return text.replace(old, new, 1)


def main() -> None:
    original = INDEX.read_text(encoding="utf-8")
    text = original

    # The authored battle radius remains the warning/failure boundary. A second,
    # small outer margin is only a physical stop: the player still has the same
    # ten seconds to turn around, but can no longer fly into unbounded coordinates.
    constants_old = '''    const BATTLE_RADIUS = 12000;
    const BATTLE_WARN_FRACTION = 0.9;
    const BATTLE_FAIL_TIME = 10;
'''
    constants_new = '''    const BATTLE_RADIUS = 12000;
    const BATTLE_WARN_FRACTION = 0.9;
    const BATTLE_FAIL_TIME = 10;
    // A physical backstop outside the authored boundary. The warning and the
    // ten-second failure timer still begin at `battleArea.radius`; this margin
    // only removes the unbounded dark world beyond it and leaves room to turn.
    const BATTLE_HARD_LIMIT_MARGIN = 600;
    // The chase camera can sit behind a nose-high aircraft by more than its
    // height offset, which used to put the camera below the one-sided sea/land
    // surface while the aircraft itself was still safely above it.
    const CAMERA_SURFACE_CLEARANCE = 2.5;
'''
    text = replace_once(text, constants_old, constants_new, "boundary constants")

    # surfaceHeightAt/surfaceTopAt are a measured gameplay contract: convoy and
    # ground-unit probes count every call. Camera collision therefore gets its own
    # uncounted ray and never changes `surfaceSamples` or ground placement values.
    surface_top_old = '''    function surfaceTopAt(x, z) {
      surfaceSamples += 1;
      let height = 0;
      for (const mountain of world.mountains) {
        const dx = x - mountain.x;
        const dz = z - mountain.z;
        if (dx * dx + dz * dz > mountain.r * mountain.r * 3.24) continue;
        mountain.mesh.updateMatrixWorld();
        surfaceRayOrigin.set(x, mountain.h * 1.2 + 20, z);
        surfaceRay.set(surfaceRayOrigin, SURFACE_RAY_DOWN);
        const hit = surfaceRay.intersectObject(mountain.mesh, false)[0];
        if (hit) height = Math.max(height, hit.point.y);
      }
      return height;
    }
'''
    surface_top_new = surface_top_old + '''
    // Camera-only surface sampler. It deliberately does not increment
    // `surfaceSamples`: that counter belongs to gameplay placement and must stay
    // at zero once a convoy has baked its route. Mountains use the same exact
    // mesh ray as surfaceTopAt. Decorative islands are not gameplay terrain, but
    // they are still visible solids, so createWorld records them separately for
    // this presentation-only collision.
    const cameraSurfaceRay = new THREE.Raycaster();
    const cameraSurfaceRayOrigin = new THREE.Vector3();
    function cameraSurfaceTopAt(x, z) {
      let height = 0;
      for (const mountain of world.mountains) {
        const dx = x - mountain.x;
        const dz = z - mountain.z;
        if (dx * dx + dz * dz > mountain.r * mountain.r * 3.24) continue;
        mountain.mesh.updateMatrixWorld();
        const top = mountain.capHeight || mountain.h;
        cameraSurfaceRayOrigin.set(x, top * 1.2 + 20, z);
        cameraSurfaceRay.set(cameraSurfaceRayOrigin, SURFACE_RAY_DOWN);
        const hit = cameraSurfaceRay.intersectObject(mountain.mesh, false)[0];
        if (hit) height = Math.max(height, hit.point.y);
      }
      for (const surface of world.cameraSurfaces || []) {
        const dx = x - surface.x;
        const dz = z - surface.z;
        if (dx * dx + dz * dz > surface.r * surface.r) continue;
        surface.mesh.updateMatrixWorld();
        cameraSurfaceRayOrigin.set(x, surface.maxHeight + 20, z);
        cameraSurfaceRay.set(cameraSurfaceRayOrigin, SURFACE_RAY_DOWN);
        const hit = cameraSurfaceRay.intersectObject(surface.mesh, true)[0];
        if (hit) height = Math.max(height, hit.point.y);
      }
      return height;
    }

    function keepCameraAboveSurface() {
      const floor = cameraSurfaceTopAt(camera.position.x, camera.position.z);
      const minimumY = floor + CAMERA_SURFACE_CLEARANCE;
      if (camera.position.y < minimumY) camera.position.y = minimumY;
      return floor;
    }
'''
    text = replace_once(text, surface_top_old, surface_top_new, "camera surface sampler")

    # Every world owns the presentation-only island collision records and clears
    # them with its other CPU-side arrays. No geometry/material/texture is created
    # here; the records point at meshes createWorld already owns and disposes.
    mountains_old = '''      const mountains = [];
      const mountainTotal = corridorSlots.length + mountainConfig.count + (mountainConfig.plateau ? 1 : 0);
'''
    mountains_new = '''      const mountains = [];
      const cameraSurfaces = [];
      const mountainTotal = corridorSlots.length + mountainConfig.count + (mountainConfig.plateau ? 1 : 0);
'''
    text = replace_once(text, mountains_old, mountains_new, "camera surface world array")

    island_old = '''        island.position.set(x, 0, z);
        addRoot(island);
        // Handed to the decoration pass so shore rings and props can find the
'''
    island_new = '''        island.position.set(x, 0, z);
        addRoot(island);
        // Decorative islands are intentionally absent from gameplay terrain and
        // collision, but the camera must not cross their one-sided meshes. The
        // proxy is only a cheap broad phase; the final height is raycast from the
        // real child meshes. Shape 1's sand spit is the widest at about 1.65r.
        cameraSurfaces.push({
          x, z,
          r: radius * (shape === 1 ? 1.75 : 1.25),
          maxHeight: height * 1.3,
          mesh: island
        });
        // Handed to the decoration pass so shore rings and props can find the
'''
    text = replace_once(text, island_old, island_new, "decorative island camera proxy")

    world_return_old = '''        preset: key, label: preset.label, skyGroup, oceanTexture, oceanNormalTexture, cloudVolumes, mountains,
        ocean, oceanTileSize, oceanColorSpeed, oceanNormalTileSize, oceanNormalTiles, oceanNormalSpeeds, oceanWaveOffsets, sunRoad,
'''
    world_return_new = '''        preset: key, label: preset.label, skyGroup, oceanTexture, oceanNormalTexture, cloudVolumes, mountains, cameraSurfaces,
        ocean, oceanTileSize, oceanColorSpeed, oceanNormalTileSize, oceanNormalTiles, oceanNormalSpeeds, oceanWaveOffsets, sunRoad,
'''
    text = replace_once(text, world_return_old, world_return_new, "world camera surfaces return")

    dispose_old = '''      if (target.textureStats) target.textureStats.length = 0;
      target.mountains.length = 0;
      target.cloudVolumes.length = 0;
'''
    dispose_new = '''      if (target.textureStats) target.textureStats.length = 0;
      target.mountains.length = 0;
      if (target.cameraSurfaces) target.cameraSurfaces.length = 0;
      target.cloudVolumes.length = 0;
'''
    text = replace_once(text, dispose_old, dispose_new, "world camera surfaces disposal")

    # Clamp before the look quaternion is derived. If it ran afterwards, the
    # camera would be moved but would still look from its former underground
    # position for one frame. snapCamera needs the same rule for mission starts,
    # teleports and camera-mode snaps.
    camera_lerp_old = '''      camera.position.lerp(desiredPosition,
        THREE.MathUtils.lerp(damping(0.0017, dt), 1, rigidW));

      const desiredLook = tmpV5.copy(camera.position).addScaledVector(tmpV1, profile.look);
'''
    camera_lerp_new = '''      camera.position.lerp(desiredPosition,
        THREE.MathUtils.lerp(damping(0.0017, dt), 1, rigidW));
      keepCameraAboveSurface();

      const desiredLook = tmpV5.copy(camera.position).addScaledVector(tmpV1, profile.look);
'''
    text = replace_once(text, camera_lerp_old, camera_lerp_new, "smoothed camera surface clamp")

    snap_old = '''      camera.position.copy(player.position)
        .addScaledVector(tmpV1, -profile.back)
        .addScaledVector(cameraUp, profile.height);
      // Parallel to the nose, exactly as updateCamera does it - a snap that
'''
    snap_new = '''      camera.position.copy(player.position)
        .addScaledVector(tmpV1, -profile.back)
        .addScaledVector(cameraUp, profile.height);
      keepCameraAboveSurface();
      // Parallel to the nose, exactly as updateCamera does it - a snap that
'''
    text = replace_once(text, snap_old, snap_new, "snapped camera surface clamp")

    # The existing warning/failure semantics stay intact. Only positions beyond
    # radius+600m are projected back to that outer ring. Distance remains outside
    # the authored radius, so the same ten-second timer continues to run.
    battle_distance_old = '''      const dx = player.position.x - battleArea.centerX;
      const dz = player.position.z - battleArea.centerZ;
      const distance = Math.hypot(dx, dz);
      battleArea.distance = distance;
      battleArea.bearing = Math.atan2(dx, dz);

      const outside = distance > battleArea.radius;
'''
    battle_distance_new = '''      const dx = player.position.x - battleArea.centerX;
      const dz = player.position.z - battleArea.centerZ;
      let distance = Math.hypot(dx, dz);
      battleArea.bearing = Math.atan2(dx, dz);

      const hardLimit = battleArea.radius + BATTLE_HARD_LIMIT_MARGIN;
      if (distance > hardLimit && distance > 0) {
        const scale = hardLimit / distance;
        player.position.x = battleArea.centerX + dx * scale;
        player.position.z = battleArea.centerZ + dz * scale;
        distance = hardLimit;
      }
      battleArea.distance = distance;

      const outside = distance > battleArea.radius;
'''
    text = replace_once(text, battle_distance_old, battle_distance_new, "battle-area hard limit")

    # A player could previously pull a designated fighter outside the arena, turn
    # back before the failure timer expired and leave the objective patrolling an
    # unreachable dark exterior. Only player-driven pursuit/break modes are
    # leashed; authored strike runs, friendly-hunt runs and ordinary patrol routes
    # are untouched. Inside the radius this branch is a complete no-op.
    terrain_avoidance_marker = '''        // Terrain avoidance. Project the altitude ~1.8s ahead along the
'''
    enemy_leash = '''        // A player-driven chase may not strand a live objective outside the
        // mission arena. Once a pursuing/breaking fighter crosses the authored
        // radius, its temporary aim point becomes the arena centre until it is
        // back inside. Authored patrol, strike and hunt routes retain their exact
        // old behaviour.
        const arenaDx = enemy.group.position.x - battleArea.centerX;
        const arenaDz = enemy.group.position.z - battleArea.centerZ;
        if (
          !enemy.huntRef && !enemy.strikeTarget &&
          (enemy.mode === "pursuit" || enemy.mode === "break") &&
          arenaDx * arenaDx + arenaDz * arenaDz > battleArea.radius * battleArea.radius
        ) {
          targetPoint = enemy.targetPoint.set(
            battleArea.centerX,
            Math.max(enemy.group.position.y, 260),
            battleArea.centerZ
          );
          enemy.targetSpeed = Math.min(
            spec.maxSpeed + (enemy.wave - 1) * 4,
            Math.max(spec.patrolSpeed, enemy.targetSpeed || 0)
          );
        }

'''
    require_once(text, terrain_avoidance_marker, "fixed-wing terrain avoidance marker")
    text = text.replace(terrain_avoidance_marker, enemy_leash + terrain_avoidance_marker, 1)

    # A small read-only hook lets the local Playwright harness prove that the
    # rendered camera never crosses the sampled surface. It does not mutate world
    # state and does not touch the gameplay surface-sample counter.
    debug_old = '''        surfaceHeightAt: (x, z) => surfaceHeightAt(x, z),
        surfaceTopAt: (x, z) => surfaceTopAt(x, z),
        // Running total of terrain rays cast. A convoy bakes its road at spawn
'''
    debug_new = '''        surfaceHeightAt: (x, z) => surfaceHeightAt(x, z),
        surfaceTopAt: (x, z) => surfaceTopAt(x, z),
        cameraSurfaceProbe: () => {
          const floor = cameraSurfaceTopAt(camera.position.x, camera.position.z);
          return {
            cameraY: Number(camera.position.y.toFixed(4)),
            floor: Number(floor.toFixed(4)),
            clearance: Number((camera.position.y - floor).toFixed(4)),
            minimum: CAMERA_SURFACE_CLEARANCE
          };
        },
        // Running total of terrain rays cast. A convoy bakes its road at spawn
'''
    text = replace_once(text, debug_old, debug_new, "camera surface debug probe")

    required_fragments = [
        "const BATTLE_HARD_LIMIT_MARGIN = 600;",
        "const CAMERA_SURFACE_CLEARANCE = 2.5;",
        "function cameraSurfaceTopAt(x, z)",
        "function keepCameraAboveSurface()",
        "const cameraSurfaces = [];",
        "cameraSurfaces.push({",
        "cloudVolumes, mountains, cameraSurfaces,",
        "if (target.cameraSurfaces) target.cameraSurfaces.length = 0;",
        "const hardLimit = battleArea.radius + BATTLE_HARD_LIMIT_MARGIN;",
        "A player-driven chase may not strand a live objective outside",
        "cameraSurfaceProbe: () =>"
    ]
    for fragment in required_fragments:
        if text.count(fragment) != 1:
            raise RuntimeError(f"required fragment has unexpected count: {fragment!r}")

    # Ground placement and mission content are intentionally untouched. These
    # anchors must remain exactly once after the transform.
    for fragment, label in [
        ("function surfaceHeightAt(x, z)", "surfaceHeightAt"),
        ("function surfaceTopAt(x, z)", "surfaceTopAt"),
        ("function resetBattleArea(mission)", "resetBattleArea"),
        ("function updateBattleArea(dt)", "updateBattleArea"),
        ("const WORLD_PRESETS =", "WORLD_PRESETS"),
        ("const AIRCRAFT_TYPES =", "AIRCRAFT_TYPES")
    ]:
        count = text.count(fragment)
        if count != 1:
            raise RuntimeError(f"{label}: expected one declaration after patch, found {count}")

    if text == original:
        raise RuntimeError("patch produced no changes")

    INDEX.write_text(text, encoding="utf-8", newline="\n")

    module = re.search(r'<script type="module">\n(?P<body>.*)\n  </script>', text, re.DOTALL)
    if not module:
        raise RuntimeError("could not extract index module for syntax check")
    with tempfile.TemporaryDirectory() as temp_dir:
        module_path = Path(temp_dir) / "index-module.mjs"
        module_path.write_text(module.group("body"), encoding="utf-8", newline="\n")
        subprocess.run(["node", "--check", str(module_path)], check=True)

    print("terrain-holes patch applied and syntax checked")


if __name__ == "__main__":
    main()
