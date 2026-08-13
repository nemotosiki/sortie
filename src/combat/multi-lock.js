// Concurrent multi-target seeker state for 4/6/8AAM and 4AGM.
//
// This module owns only target-id dwell and latch accounting. Range, cone and
// weapon-kind filtering stay in the composition root, while launch/tube/ammo
// accounting stays in the launcher. Keeping the state machine geometry-free
// makes the important AC-style contract directly testable: N contacts held in
// the cone for one lock period become N locks together, not a queue N periods
// long.

export function createConcurrentMultiLockState() {
  return { ids: [], timers: new Map(), grace: 0 };
}

export function clearConcurrentMultiLock(state) {
  state.ids.length = 0;
  state.timers.clear();
  state.grace = 0;
}

export function updateConcurrentMultiLock(
  state,
  dt,
  candidateIds,
  maxLocks,
  lockTime,
  graceTime
) {
  const elapsed = Math.max(0, Number(dt) || 0);
  const limit = Math.max(0, Math.floor(Number(maxLocks) || 0));
  const required = Math.max(0.001, Number(lockTime) || 0.001);
  const graceLimit = Math.max(0, Number(graceTime) || 0);
  const candidates = [...new Set(Array.isArray(candidateIds) ? candidateIds : [])];

  if (limit === 0) {
    clearConcurrentMultiLock(state);
    return state;
  }

  // A momentary empty frame can be one bank across a formation. Preserve both
  // completed and partial locks briefly; a real loss of picture clears both.
  if (candidates.length === 0) {
    state.grace += elapsed;
    if (state.grace >= graceLimit) clearConcurrentMultiLock(state);
    return state;
  }
  state.grace = 0;

  const eligible = new Set(candidates);
  for (let i = state.ids.length - 1; i >= 0; i -= 1) {
    if (!eligible.has(state.ids[i])) state.ids.splice(i, 1);
  }
  if (state.ids.length > limit) state.ids.length = limit;

  const locked = new Set(state.ids);
  const openSlots = Math.max(0, limit - state.ids.length);
  // candidateIds arrive nearest-first. Existing valid latches keep their slots;
  // the closest remaining contacts acquire every free slot concurrently.
  const acquiring = candidates.filter((id) => !locked.has(id)).slice(0, openSlots);
  const acquiringSet = new Set(acquiring);
  for (const id of state.timers.keys()) {
    if (!acquiringSet.has(id)) state.timers.delete(id);
  }

  for (const id of acquiring) {
    const next = (state.timers.get(id) || 0) + elapsed;
    if (next >= required) {
      state.ids.push(id);
      state.timers.delete(id);
    } else {
      state.timers.set(id, next);
    }
  }
  return state;
}
