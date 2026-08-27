#!/usr/bin/env node
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`check_sera_m09_host: ${message}`);
};

function moduleBody(source) {
  const open = source.indexOf('<script type="module">');
  const start = source.indexOf(">", open) + 1;
  const end = source.indexOf("</script>", start);
  assert(open >= 0 && start > open && end > start, "module script not found");
  return source.slice(start, end);
}

for (const token of [
  "const m09State = {",
  "function updateM09MissionThreat(dt)",
  "function fireM09MlrsVolley()",
  "function disperseM09EnemyArmor()",
  "function m09RankCap(mission)",
  "handleM09GroundDestroyed(enemy, byWingman)",
  "resetM09State(MISSIONS[currentMissionIndex])",
  "if (updateM09MissionThreat(dt)) return;",
  "spawned.friendly = Boolean(unit.friendly);",
  "enemy.friendly === true && !manuallySelectedFriendly",
  '"friendlyContact"',
  "seraM09Probe: () =>",
  "forceSeraM09MlrsVolley: () =>",
  "forceSeraM09DeployPending: () =>",
  "forceSeraM09DestroyCommand: () =>",
  "forceSeraM09CivilianLoss: (count = 1) =>",
  "forceSeraM09Complete: () =>"
]) {
  assert(html.includes(token), `missing host contract ${token}`);
}
assert(html.includes("score = Math.max(0, score - penalty);"), "protected-loss score penalty missing");
assert(html.includes("protectedGroundOutcome && protectedGroundOutcome.failBanner")
    && html.includes("else failM09Mission(protectedGroundOutcome.failBanner)"),
  "protected-loss failure gate missing");

new vm.SourceTextModule(moduleBody(html));
console.log("check_sera_m09_host: PASS");
console.log("  protected IFF / manual-only friendly lock / MLRS pressure / command dispersal / rank cap wired");
