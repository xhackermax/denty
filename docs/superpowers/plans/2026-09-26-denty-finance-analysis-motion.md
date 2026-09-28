# Denty Finance + Analysis Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Finance and Analysis numbers/charts reveal with sober, low-cost motion that communicates loading and hierarchy without continuous decoration.

**Architecture:** Add small shared motion primitives for compact number reveal and progress reveal, then apply them to Finance KPIs, doctor/treatment/monthly charts and Analysis progress bars. Keep semantic labels/values readable from first render and disable tweening under `prefers-reduced-motion`.

**Tech Stack:** React 19, Motion 13, Mantine, TypeScript, Vitest/RTL.

**Spec:** `docs/superpowers/specs/2026-09-26-denty-clinical-surgery-finance-ux-design.md`

## Global Constraints

- No continuous decorative animation or chart blur.
- Motion triggers once per component mount/period selection on meaningful viewport entry.
- Reduced motion renders final values immediately.
- Finance calculations/data projections remain unchanged.
- Node 24/Vercel constraints remain unchanged.

## Review Focus

- Empty data renders `Sin datos` without fake animation.
- Screen readers get the real value during tweening.
- Period changes retrigger only relevant Analysis content.
- Small values remain visually discoverable without changing semantic percentages.
- No mobile overflow/layout shift.

---

### Task 1: Add compact number and progress reveal primitives

**Files:**
- Create: `src/shared/motion/motion-number.tsx`
- Create: `src/shared/motion/animated-progress.tsx`
- Modify: `src/shared/motion/index.ts`
- Test: `src/shared/motion/motion-number.test.tsx`
- Test: `src/shared/motion/animated-progress.test.tsx`

**Interfaces:**
- `MotionNumber`: value, format, duration≈1s, decimals, ariaLabel, className.
- `AnimatedProgress`: value, duration≈0.6s, delay, forwarded Mantine props.

- [ ] **Step 1: Write failing tests** for semantic value, in-view start, one-shot behavior and reduced motion.
- [ ] **Step 2: Run RED**.
- [ ] **Step 3: Implement low-cost primitives**.
- [ ] **Step 4: Run GREEN**.
- [ ] **Step 5: Commit** `feat: add finance motion primitives`.

### Task 2: Animate the five Finance KPIs

**Files:**
- Modify: `src/features/parity/modules/finance-module.tsx`
- Create/Modify: `scripts/tests/finance-motion-regression.mjs`

**Interfaces:**
- Produced, Invoiced, Collected, Pending, Margin use `MotionNumber`.
- Preserve existing `formatEUR`; duration 0.8–1.2s.

- [ ] **Step 1: Write failing regression** requiring all five KPI cards to use the compact numeric primitive.
- [ ] **Step 2: Run RED**.
- [ ] **Step 3: Replace only static number spans**.
- [ ] **Step 4: Run GREEN**.
- [ ] **Step 5: Commit** `feat: animate finance kpis`.

### Task 3: Animate production charts

**Files:**
- Modify: `src/features/parity/modules/finance-charts.tsx`
- Modify: `src/shared/ui/parity.module.css`
- Test: `src/features/parity/modules/finance-charts.test.tsx`
- Modify: `scripts/tests/finance-motion-regression.mjs`

**Interfaces:**
- `DoctorBars`: 0→target reveal, 40–60ms row stagger, 500–700ms.
- `TreatmentDonut`: progressive reveal, legend may stagger subtly.
- `MonthlyTrend`: SVG draw start→end.

- [ ] **Step 1: Write failing component/source tests** for all three.
- [ ] **Step 2: Run RED**.
- [ ] **Step 3: Implement doctor-bar transform reveal**.
- [ ] **Step 4: Implement treatment reveal** without changing data semantics.
- [ ] **Step 5: Implement monthly line draw**.
- [ ] **Step 6: Run GREEN**.
- [ ] **Step 7: Commit** `feat: animate finance charts`.

### Task 4: Animate Analysis profitability and losses/opportunities

**Files:**
- Modify: `src/features/parity/modules/analysis-module.tsx`
- Modify: `scripts/tests/finance-motion-regression.mjs`

**Interfaces:**
- Replace all current static `Progress` bars with `AnimatedProgress`.

- [ ] **Step 1: Extend failing regression** for treatment rows + three loss/opportunity cards.
- [ ] **Step 2: Run RED**.
- [ ] **Step 3: Replace static progress components**.
- [ ] **Step 4: Run GREEN**.
- [ ] **Step 5: Commit** `feat: animate analysis progress`.

### Task 5: Finance motion release verification

- [ ] **Step 1: Run finance motion regression + shared motion tests + existing motion regression**.
- [ ] **Step 2: Verify reduced-motion and no continuous-loop/blur patterns**.
- [ ] **Step 3: Commit** `test: gate finance motion`.
