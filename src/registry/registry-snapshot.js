// Structural snapshot consumed by tools/registry_gate.mjs. Values are omitted
// on purpose: the gate guards against lost entries and lost key paths while
// staying quiet about legitimate balance changes.
function keyPaths(value, prefix, sink, depth) {
  if (!value || typeof value !== "object" || depth > 3) return sink;
  if (Array.isArray(value)) {
    sink.push(`${prefix}[]`);
    // The gate exists for merge truncation, and truncation happens INSIDE
    // array literals too - a wave off a mission's sequence, a subsystem off a
    // ship. A snapshot that stopped at "[]" reported "no losses" for all of
    // it. Two additions close that:
    //  - monotonic length markers (length>=1..N): growing an array only ADDS
    //    paths (a gain, allowed), shrinking it removes the top one (a loss).
    //  - the UNION of the elements' own key paths, so a field that exists
    //    only on some elements still counts as structure.
    for (let n = 1; n <= value.length; n += 1) {
      sink.push(`${prefix}[].length>=${n}`);
    }
    const seen = new Set();
    for (const item of value) {
      for (const path of keyPaths(item, `${prefix}[]`, [], depth + 1)) {
        if (!seen.has(path)) {
          seen.add(path);
          sink.push(path);
        }
      }
    }
    return sink;
  }
  for (const field of Object.keys(value).sort()) {
    const at = prefix ? `${prefix}.${field}` : field;
    sink.push(at);
    // Read the DESCRIPTOR, never the value, when a field is an accessor. A
    // mission's spawn-time getters answer by asking the save file what the
    // player did last sortie, and the snapshot runs at boot - before that
    // state exists. Touching them once took the whole page down with a TDZ
    // error. The key path is the structure; what the getter would return is
    // not the gate's business.
    const descriptor = Object.getOwnPropertyDescriptor(value, field);
    if (descriptor && typeof descriptor.get === "function") continue;
    keyPaths(value[field], at, sink, depth + 1);
  }
  return sink;
}

export function shapeOf(table) {
  return Object.fromEntries(
    Object.keys(table).sort().map((key) => [key, keyPaths(table[key], "", [], 0)])
  );
}

export function createRegistrySnapshot({
  ENEMY_ROLES,
  SKILL_TIERS,
  ACE_PROFILES,
  AIRCRAFT_TYPES,
  ENEMY_AI_PROFILES,
  ENEMY_MISSILE_PROFILES,
  ENEMY_TYPES,
  SHIP_TYPES,
  GROUND_TYPES,
  HELI_TYPES,
  WORLD_PRESETS,
  AIRCRAFT_ORDER,
  WORLD_DECORATORS,
  AIRCRAFT_MODELS,
  SHIP_MODELS = {},
  GROUND_MODELS = {},
  HELI_MODELS = {},
  MISSIONS
}) {
  return {
    ENEMY_ROLES: shapeOf(ENEMY_ROLES),
    SKILL_TIERS: shapeOf(SKILL_TIERS),
    ACE_PROFILES: shapeOf(ACE_PROFILES),
    AIRCRAFT_TYPES: shapeOf(AIRCRAFT_TYPES),
    ENEMY_AI_PROFILES: shapeOf(ENEMY_AI_PROFILES),
    ENEMY_MISSILE_PROFILES: shapeOf(ENEMY_MISSILE_PROFILES),
    ENEMY_TYPES: shapeOf(ENEMY_TYPES),
    SHIP_TYPES: shapeOf(SHIP_TYPES),
    GROUND_TYPES: shapeOf(GROUND_TYPES),
    HELI_TYPES: shapeOf(HELI_TYPES),
    WORLD_PRESETS: shapeOf(WORLD_PRESETS),
    AIRCRAFT_ORDER: [...AIRCRAFT_ORDER],
    // Not a keyed table: the interesting structure is which existing worlds
    // each decorator claims. Preserve registration order and the old world sort.
    WORLD_DECORATORS: Object.fromEntries(
      WORLD_DECORATORS.map((entry) => [
        entry.id,
        [...entry.worlds].sort().map((key) => `world:${key}`)
      ])
    ),
    // Keyed by variant, but the values are functions, so keyPaths would only
    // ever say "build" and tell nobody anything. What can actually be lost here
    // is the airframe itself and its HUD outline, so those are what is written:
    // dropping a registration, or dropping the silhouette off one, both fail.
    AIRCRAFT_MODELS: Object.fromEntries(
      Object.keys(AIRCRAFT_MODELS).sort().map((variant) => [
        variant,
        AIRCRAFT_MODELS[variant] && AIRCRAFT_MODELS[variant].silhouette
          ? ["build", "silhouette"]
          : ["build"]
      ])
    ),
    // Same treatment, minus the silhouette line: a ship model is { kind, build }
    // and the only thing that can be lost is the registration itself.
    SHIP_MODELS: Object.fromEntries(
      Object.keys(SHIP_MODELS).sort().map((kind) => [kind, ["build"]])
    ),
    // And again for the ground units, which are { kind, build } like the ships.
    GROUND_MODELS: Object.fromEntries(
      Object.keys(GROUND_MODELS).sort().map((kind) => [kind, ["build"]])
    ),
    // And the gunships, same { kind, build } shape again.
    HELI_MODELS: Object.fromEntries(
      Object.keys(HELI_MODELS).sort().map((kind) => [kind, ["build"]])
    ),
    MISSIONS: Object.fromEntries(
      MISSIONS.map((mission) => [mission.key, keyPaths(mission, "", [], 0)])
    )
  };
}
