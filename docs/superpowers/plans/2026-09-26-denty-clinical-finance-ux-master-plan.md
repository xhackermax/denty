# Denty Clinical Surgery + Finance + UX Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved Denty 2026-09-26 clinical/UX release as three independently testable workstreams and one final Node 24/Vercel release gate.

**Architecture:** Execute the clinical foundation first because surgery, consents and budgets depend on it. Finance motion and shell/document UX are independent and follow once the clinical branch is stable. Merge only after each plan's own regressions pass, then run the immutable Vercel-equivalent pipeline and package the verified ZIP.

**Tech Stack:** Node 24.x, Next.js 16.3.5, React 19, TypeScript, Mantine, Motion, Vitest, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-26-denty-clinical-surgery-finance-ux-design.md`

## Global Constraints

- Baseline: `DENTY-VERCEL-NODE24-TYPE-FIX-2026-09-26.zip`.
- Do not relax TypeScript strictness or `exactOptionalPropertyTypes`.
- Preserve existing history, games, API parity, BFF, Supabase and Vercel gates.
- No source-mutating build bootstrap.
- Final artifact must be flat-root Vercel ZIP and use Node 24.x.

## Review Focus

- Cross-plan changes to `src/shared/motion/index.ts`, `scripts/tests/motion-regression.mjs` and release gates must be reconciled, not overwritten.
- The clinical plan must land before any UI relies on Surgery treatment codes/BOM.
- Theme/client hydration changes must not alter server API behavior.
- New motion must not regress reduced-motion behavior.
- Final build evidence must come from Node 24/Vercel-equivalent execution, not static/source gates alone.

---

### Task 1: Execute Clinical Surgery plan

**Plan:** `docs/superpowers/plans/2026-09-26-denty-surgery-odontogram-clinical-rules.md`

- [ ] Complete every task in the clinical plan with RED→GREEN evidence.
- [ ] Run the clinical plan's release gates.
- [ ] Review shared-state/history behavior before moving on.

### Task 2: Execute Finance/Analysis motion plan

**Plan:** `docs/superpowers/plans/2026-09-26-denty-finance-analysis-motion.md`

- [ ] Complete every task with RED→GREEN evidence.
- [ ] Run finance motion + existing motion regressions.
- [ ] Verify reduced-motion path.

### Task 3: Execute Navigation/Theme/Documents UX plan

**Plan:** `docs/superpowers/plans/2026-09-26-denty-navigation-theme-documents-ux.md`

- [ ] Complete every task with RED→GREEN evidence.
- [ ] Run route, appearance and documents regressions.
- [ ] Reconcile shared motion regression changes with Task 2.

### Task 4: Run full release matrix under Node 24

**Files:**
- No production changes unless a failing gate identifies a root cause.
- Final package: `/mnt/data/DENTY-CLINICAL-SURGERY-FINANCE-UX-NODE24-2026-09-26.zip`

- [ ] **Step 1: Clean install under Node 24**
  - `npm ci`
  - Expected: zero install errors and no engine mismatch.
- [ ] **Step 2: Run unit/component regressions**
  - all new clinical, surgery, implant/BOM, finance motion, route motion, appearance and documents tests.
- [ ] **Step 3: Run existing Denty gates**
  - history regression;
  - pipeline self-check;
  - games integrity;
  - deployable package;
  - API parity;
  - BFF policy;
  - Supabase link;
  - Vercel regression matrix;
  - domain smoke;
  - architecture.
- [ ] **Step 4: Run production pipeline**
  - `node scripts/pipeline/run.mjs vercel-build`
  - Expected: `vercel-build-final` exits `0`.
- [ ] **Step 5: Package flat-root ZIP and verify from a fresh unzip**
  - Re-run deployable package + key new regressions against the unpacked ZIP.
  - Record SHA-256.
- [ ] **Step 6: Commit**
  - `git commit -m "release: surgery finance ux node24"`
