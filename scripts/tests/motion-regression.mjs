import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

const shell = read("src/app/_components/shell/app-shell.tsx");
const voice = read("src/features/voice/voice-command-bar.tsx");
const patients = read("src/features/patients/patients-page.tsx");
const dashboard = read("src/features/dashboard/dashboard.tsx");
const analysis = read("src/features/parity/modules/analysis-module.tsx");
const tokens = read("src/shared/motion/motion-tokens.ts");
const parallax = read("src/shared/motion/motion-parallax.tsx");
const metric = read("src/shared/motion/speeding-metric.tsx");

assert.match(shell, /layoutId="denty-desktop-nav-indicator"/);
assert.match(shell, /layoutId="denty-mobile-nav-indicator"/);
assert.match(shell, /resolveRouteTransition/);
assert.match(shell, /transitionKind=\{routeTransition\.kind\}/);
assert.match(shell, /transitionDirection=\{routeTransition\.direction\}/);
assert.match(shell, /mode="popLayout"/);
assert.ok((shell.match(/animate=\{active \?/g) ?? []).length >= 2);
assert.match(voice, /voicePulse/);
assert.match(voice, /repeat: Infinity/);
assert.match(patients, /rotateY:/);
assert.match(patients, /patientCarouselAvatar/);
assert.match(dashboard, /MotionScrollReveal/);
assert.equal((dashboard.match(/<SpeedingMetric/g) ?? []).length, 0);
assert.match(dashboard, /MotionParallax/);
assert.match(metric, /useReducedMotion/);
assert.match(metric, /useInView/);
assert.match(metric, /hasScrolled/);
assert.match(metric, /addEventListener\("scroll"/);
assert.match(metric, /data-speeding-trail=/);

// Visible-motion contract: protagonist metrics belong on the always-visible analysis surface.
assert.match(analysis, /<SpeedingMetric/);
for (const label of ["Producción", "Margen", "Conversión", "No presentados"]) assert.match(analysis, new RegExp(label));
assert.match(analysis, /MotionScrollReveal/);
assert.match(analysis, /MotionParallax/);

// Motion must be perceptible rather than technically present but visually negligible.
assert.match(tokens, /page:\s*1[2-9]|page:\s*[2-9]\d/);
assert.match(parallax, /expressive" \? (?:[5-9]\d|1\d{2})/);
assert.match(patients, /scale:\s*active \? 1\.0[2-9]/);
assert.match(patients, /rotateY:\s*active \? 0 : -Math\.min\(distance, 2\) \* [3-9]/);

console.log("motion regression: ok");
