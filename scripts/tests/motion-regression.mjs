import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

const shell = read("src/app/_components/shell/app-shell.tsx");
const voice = read("src/features/voice/voice-command-bar.tsx");
const patients = read("src/features/patients/patients-page.tsx");
const dashboard = read("src/features/dashboard/dashboard.tsx");
const analysis = read("src/features/parity/modules/analysis-module.tsx");
const tokens = read("src/shared/motion/motion-tokens.ts");
const metric = read("src/shared/motion/speeding-metric.tsx");
const motionPage = read("src/shared/motion/motion-page.tsx");
const motionPageStyles = read("src/shared/motion/motion-page.module.css");

assert.match(shell, /layoutId="denty-desktop-nav-indicator"/);
assert.match(shell, /layoutId="denty-mobile-nav-indicator"/);
// Section switches are frequent: a quick fade on the new page, no slide and no exit animation.
assert.match(shell, /<MotionPage key=\{pathname\}>/);
assert.doesNotMatch(shell, /mode="popLayout"|resolveRouteTransition/);
assert.match(
  motionPage,
  /PAGE_ENTER = \{ initial: \{ opacity: 0 \}, duration: 0\.(?:0[5-9]|1\d?|2) \}/,
);
assert.match(motionPage, /useReducedMotion/);
assert.doesNotMatch(motionPage, /rotateY|blur\(/);
assert.doesNotMatch(motionPageStyles, /cube|flip|filter/);
assert.ok((shell.match(/animate=\{active \?/g) ?? []).length >= 2);
assert.match(voice, /voicePulse/);
assert.match(voice, /repeat: Infinity/);
assert.match(patients, /animate=\{\{ opacity: 1, y: 0 \}\}/);
assert.match(patients, /carouselControls/);
assert.match(dashboard, /MotionScrollReveal/);
assert.equal((dashboard.match(/<SpeedingMetric/g) ?? []).length, 0);
assert.match(metric, /useReducedMotion/);
assert.match(metric, /useInView/);
assert.match(metric, /hasScrolled/);
assert.match(metric, /addEventListener\("scroll"/);
assert.match(metric, /data-speeding-trail=/);

// Visible-motion contract: protagonist metrics belong on the always-visible analysis surface.
assert.match(analysis, /<SpeedingMetric/);
for (const label of ["Producción", "Margen", "Conversión", "No presentados"])
  assert.match(analysis, new RegExp(label));
assert.match(analysis, /MotionScrollReveal/);

// Motion must be perceptible rather than technically present but visually negligible.
assert.match(tokens, /page:\s*1[2-9]|page:\s*[2-9]\d/);
assert.match(patients, /AnimatePresence/);
assert.match(patients, /animate=\{\{ opacity: 1, x: 0 \}\}/);

console.log("motion regression: ok");
