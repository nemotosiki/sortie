#!/usr/bin/env node

// Deterministic timing sanity check for the authored sensor doctrine. This is
// intentionally independent from Three.js: it answers whether the chosen
// ranges create a readable warning/approach interval before commitment, while
// the browser E2E proves that the runtime uses those ranges.

const scenarios = [
  { purpose: "legacy", sensor: 8500, commit: 8500, leash: 11000 },
  { purpose: "screen", sensor: 12000, commit: 4500, leash: 7200 },
  { purpose: "escort", sensor: 12000, commit: 4200, leash: 6800 },
  { purpose: "cap", sensor: 11000, commit: 4800, leash: 7600 },
  { purpose: "top-cover", sensor: 14500, commit: 6500, leash: 9500 }
];
const startRange = 18000;
const closingSpeeds = [220, 300, 420];

const rows = [];
for (const scenario of scenarios) {
  if (!(scenario.sensor >= scenario.commit && scenario.leash > scenario.commit)) {
    throw new Error(`invalid envelope for ${scenario.purpose}`);
  }
  for (const closingSpeed of closingSpeeds) {
    const detectAt = Math.max(0, (startRange - scenario.sensor) / closingSpeed);
    const commitAt = Math.max(0, (startRange - scenario.commit) / closingSpeed);
    const trackWindow = commitAt - detectAt;
    if (scenario.purpose !== "legacy" && trackWindow < 10) {
      throw new Error(`${scenario.purpose} track window too short at ${closingSpeed}m/s: ${trackWindow}s`);
    }
    rows.push({
      purpose: scenario.purpose,
      closingSpeed,
      detectAt: Number(detectAt.toFixed(1)),
      commitAt: Number(commitAt.toFixed(1)),
      trackWindow: Number(trackWindow.toFixed(1)),
      pursuitDepth: scenario.leash - scenario.commit
    });
  }
}

// A 300m/s interceptor extending for the minimum 3.5s opens roughly 1.05km;
// if that is not yet the 1.5km reattack separation, the 6.5s hard ceiling opens
// roughly 1.95km and guarantees the second pass can begin.
const interceptor = {
  speed: 300,
  minimumTime: 3.5,
  maximumTime: 6.5,
  minimumSeparation: 1500
};
const minExtension = interceptor.speed * interceptor.minimumTime;
const maxExtension = interceptor.speed * interceptor.maximumTime;
if (!(minExtension < interceptor.minimumSeparation && maxExtension > interceptor.minimumSeparation)) {
  throw new Error("interceptor egress timing cannot cross the reattack separation");
}

console.log("simulate_enemy_air_ai_engagement: PASS");
console.table(rows);
console.log({
  interceptorMinExtension: minExtension,
  interceptorMaxExtension: maxExtension,
  reattackSeparation: interceptor.minimumSeparation
});
