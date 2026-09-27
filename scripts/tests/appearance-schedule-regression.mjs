import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const provider = read("src/app/_components/shell/time-color-scheme-provider.tsx");
const preferences = read("src/app/_components/shell/shell-preferences.tsx");
const layout = read("src/app/layout.tsx");
const schedule = read("src/domain/appearance-schedule.ts");

assert.match(schedule, /denty-appearance/);
assert.match(provider, /nextSchemeBoundary/);
assert.match(provider, /addEventListener\("focus"/);
assert.match(provider, /visibilitychange/);
assert.doesNotMatch(provider, /setInterval/);
assert.match(preferences, /Automático por hora|time/);
assert.doesNotMatch(preferences, /setColorScheme\("auto"\)/);
assert.match(layout, /denty-appearance/);

console.log("appearance schedule regression: OK");
