import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const metric = readFileSync(new URL("../../src/shared/motion/speeding-metric.tsx", import.meta.url), "utf8");
const analysis = readFileSync(new URL("../../src/features/parity/modules/analysis-module.tsx", import.meta.url), "utf8");

// Analysis' headline metrics must use the dedicated Speeding Text component.
assert.match(analysis, /<SpeedingMetric/, "Expected protagonist metrics to render with SpeedingMetric");

// Motion 1.4 contract: Speeding Text is armed by user scroll and only starts
// once the metric is actually visible. Opening Analysis alone must not consume it.
assert.match(metric, /useInView/);
assert.match(metric, /scroll/);
assert.match(metric, /hasScrolled/);
assert.match(metric, /useState\(value\)/, "Expected the real metric value before scroll starts");
assert.match(metric, /duration\s*=\s*2\.2/);
assert.match(metric, /travel\s*=\s*90/);
assert.match(metric, /maxBlur\s*=\s*14/);
assert.match(metric, /data-speeding-trail=/);
assert.match(metric, /skewX/);
assert.match(metric, /translateX|\bx:/);

const { shouldStartSpeedingMetric } = await import(
  new URL("../../src/shared/motion/speeding-metric-trigger.ts", import.meta.url)
);

assert.equal(shouldStartSpeedingMetric({ hasScrolled: false, inView: true, reducedMotion: false, hasPlayed: false }), false);
assert.equal(shouldStartSpeedingMetric({ hasScrolled: true, inView: false, reducedMotion: false, hasPlayed: false }), false);
assert.equal(shouldStartSpeedingMetric({ hasScrolled: true, inView: true, reducedMotion: false, hasPlayed: false }), true);
assert.equal(shouldStartSpeedingMetric({ hasScrolled: true, inView: true, reducedMotion: true, hasPlayed: false }), false);
assert.equal(shouldStartSpeedingMetric({ hasScrolled: true, inView: true, reducedMotion: false, hasPlayed: true }), false);

console.log("speeding text scroll-trigger regression: OK");
