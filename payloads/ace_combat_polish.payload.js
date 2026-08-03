// Ace-combat polish: make r07's authored interceptors actually threaten the
// patrol aircraft the mission asks the player to protect.
//
// The optional seven-aircraft CAP remains optional and still flies at the
// player. Only TOMCAT and HORNET — the four designated targets that must be
// destroyed to clear the sortie — receive `hunt: "air"`. Counts, order, timing,
// par time, title and briefing text are unchanged.
export default function register(ctx) {
  const { MISSIONS } = ctx.tables;

  function extendMission(key, makeReplacement) {
    const at = MISSIONS.findIndex((mission) => mission.key === key);
    if (at <= 0) {
      throw new Error(`[ace-combat-polish] mission ${key} not found at a replaceable index`);
    }
    const original = MISSIONS[at];
    const after = MISSIONS[at - 1].key;
    const replacement = makeReplacement(original);

    MISSIONS.splice(at, 1);
    try {
      return ctx.addMission(replacement, { after });
    } catch (error) {
      MISSIONS.splice(at, 0, original);
      throw error;
    }
  }

  extendMission("r07", (mission) => {
    const designatedHunters = new Set(["TOMCAT", "HORNET"]);
    let changed = 0;
    const sequence = mission.sequence.map((wave) => {
      if (!wave || !designatedHunters.has(wave.label)) return wave;
      if (wave.tgt === false) {
        throw new Error(`[ace-combat-polish] ${wave.label} unexpectedly became optional`);
      }
      if (wave.hunt && wave.hunt !== "air") {
        throw new Error(`[ace-combat-polish] ${wave.label} already hunts ${wave.hunt}`);
      }
      changed += 1;
      return { ...wave, hunt: "air" };
    });

    if (changed !== designatedHunters.size) {
      throw new Error(
        `[ace-combat-polish] r07 expected TOMCAT and HORNET, changed ${changed}`
      );
    }
    return { ...mission, sequence };
  });
}
