# Denty Motion System 1.0 — Implementation Plan 01

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first visible Denty Motion slice: reusable motion primitives, spatial shell navigation, animated Oye Denty state, upgraded patient carousel/parallax, and dashboard scroll/data motion.

**Architecture:** Keep `motion@13.4.0` as the only animation runtime. Add Denty-native primitives in `src/shared/motion`, then consume them from existing shell, voice, Patients and Dashboard components without replacing Mantine or CSS Modules.

**Tech Stack:** Next.js 16, React 19, Mantine 9, CSS Modules, `motion/react`, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-26-denty-motion-system-design.md`

## Global Constraints

- No new animation framework or WebGL dependency.
- Respect `prefers-reduced-motion` and render deterministic final states.
- Clinical motion remains subtle; expressive motion is limited to dashboard/analysis surfaces.
- Prefer transform/opacity and one-time viewport activation.
- Speeding text is reserved for protagonist analytical metrics.

## Review Focus

- Reduced-motion users must receive the final readable state immediately.
- Route changes must keep links accessible and preserve `aria-current`.
- Patient carousel keyboard access and current selection must remain intact.
- Speeding metrics must preserve EUR formatting and never end on an intermediate value.
- Scroll/parallax effects must not block pointer, keyboard or touch interactions.

---

### Task 1: Motion foundation

**Files:**
- Create: `src/shared/motion/motion-tokens.ts`
- Create: `src/shared/motion/motion-page.tsx`
- Create: `src/shared/motion/motion-pressable.tsx`
- Create: `src/shared/motion/motion-scroll-reveal.tsx`
- Create: `src/shared/motion/motion-parallax.tsx`
- Create: `src/shared/motion/speeding-metric.tsx`
- Create: `src/shared/motion/index.ts`
- Test: `src/shared/motion/motion.test.tsx`

**Interfaces:**
- Produces: `MotionPage`, `MotionPressable`, `MotionScrollReveal`, `MotionParallax`, `SpeedingMetric`, `motionTokens`.

- [ ] Write tests for final rendering, metric formatting and reduced-motion-safe semantics.
- [ ] Run tests and verify RED because the motion module does not exist.
- [ ] Implement the primitives with `motion/react` and semantic intensity defaults.
- [ ] Run component tests, typecheck and verify GREEN.

### Task 2: Shell navigation and Oye Denty

**Files:**
- Modify: `src/app/_components/shell/app-shell.tsx`
- Modify: `src/app/_components/shell/app-shell.module.css`
- Modify: `src/features/voice/voice-command-bar.tsx`
- Create: `src/features/voice/voice-command-bar.module.css`
- Test: `src/shared/motion/motion.test.tsx`

**Interfaces:**
- Consumes: `MotionPage`, `MotionPressable`, motion tokens.
- Produces: shared-layout route indicators and visible listening/processing feedback.

- [ ] Extend the motion regression test with shell-facing contracts.
- [ ] Verify RED.
- [ ] Add desktop/mobile `layoutId` active indicators and page-entry motion.
- [ ] Add microphone ripple/breathing/executing states without changing command semantics.
- [ ] Run tests and typecheck.

### Task 3: Patients carousel + parallax depth

**Files:**
- Modify: `src/features/patients/patients-page.tsx`
- Modify: `src/shared/ui/parity.module.css`
- Test: `src/shared/motion/motion.test.tsx`

**Interfaces:**
- Consumes: motion tokens and `MotionParallax` where appropriate.
- Produces: stronger center emphasis, spatial depth and motion-reduced fallback.

- [ ] Add a regression assertion for the carousel motion contract.
- [ ] Verify RED.
- [ ] Upgrade cards with restrained perspective/depth and parallax on approved visual sublayers.
- [ ] Preserve existing loop, keyboard and scroll behavior.
- [ ] Run tests and typecheck.

### Task 4: Dashboard scroll + Speeding Text

**Files:**
- Modify: `src/features/dashboard/dashboard.tsx`
- Modify: `src/shared/ui/parity.module.css`
- Test: `src/shared/motion/motion.test.tsx`

**Interfaces:**
- Consumes: `MotionScrollReveal`, `MotionParallax`, `SpeedingMetric`, `MotionPressable`.
- Produces: one-time section reveals, subtle icon parallax, tactile quick actions and major KPI speeding values.

- [ ] Add tests for protagonist metric formatting and final-value semantics.
- [ ] Verify RED.
- [ ] Wrap dashboard sections in one-time reveal primitives.
- [ ] Replace the three major finance values with `SpeedingMetric`.
- [ ] Add subtle parallax to dashboard visual accents and press feedback to quick actions.
- [ ] Run targeted tests, full tests, lint/typecheck and production build.
