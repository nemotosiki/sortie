#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const must = (condition, message) => {
  if (!condition) throw new Error(`[sera-m01-wave-host] ${message}`);
};
const includes = (token, message) => must(source.includes(token), message);

includes('mode: "clearOrTimeout"', "wave gate was not normalized");
includes('let activeWaveGate = null;', "active wave gate state is missing");
includes('activeWaveGate.ids.has(enemy.id)', "phase progression does not inspect gate contacts");
includes('const explicitOrigin = Boolean(wave && wave.at);', "air waves cannot use authored positions");
includes('altitude: kind === "air"', "authored air-wave altitude is missing");
includes('new Set(Array.from({ length: size }', "gate contact ids are not captured at spawn");
must((source.match(/activeWaveGate = null;/g) || []).length >= 3, "wave gate is not reset on launch and release");

console.log("check_sera_m01_wave_host: PASS");
