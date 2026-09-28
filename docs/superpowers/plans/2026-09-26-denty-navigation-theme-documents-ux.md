# Denty Navigation + Time Theme + Documents UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace laggy cube/flip transitions with sober semantic motion, switch Denty automatic appearance to a Madrid time schedule, and open newly created documents immediately for signing/preview.

**Architecture:** Replace transition kinds with `glide | lift | settle` and animate only transform/opacity. Add a pure Europe/Madrid schedule resolver plus a client provider storing `time | light | dark`, scheduling the next boundary and refreshing on focus. Refactor document creation so the newly created object directly drives signing/preview, avoiding React state races.

**Tech Stack:** Next.js 16.3.5, React 19, Mantine, Motion, next-intl timezone `Europe/Madrid`, Vitest/RTL.

**Spec:** `docs/superpowers/specs/2026-09-26-denty-clinical-surgery-finance-ux-design.md`

## Global Constraints

- No large `rotateY` or blur in default route transitions.
- Transition family is deterministic, never random.
- Automatic theme: dark 21:00–07:00; light 07:00–21:00 in Europe/Madrid.
- Manual light/dark overrides persist until automatic-by-time is selected.
- Schedule boundary/focus refresh, no continuous polling.
- Consent creation opens exact new consent for signing; other documents open exact new preview.
- Node 24/Vercel remains unchanged.

## Review Focus

- Minimize wrong-theme hydration flash.
- Correct after device sleep across 07:00/21:00.
- Internal back navigation must not look like forward navigation.
- Route presence must not collapse page height.
- Document auto-open must not depend on reading just-updated React state.

---

### Task 1: Replace cube/flip with glide/lift/settle

**Files:**
- Modify: `src/shared/motion/route-transition.ts`
- Modify: `src/shared/motion/motion-page.tsx`
- Modify: `src/shared/motion/motion-page.module.css`
- Modify: `src/app/_components/shell/app-shell.tsx`
- Test: `src/shared/motion/route-transition.test.ts`
- Modify: `scripts/tests/motion-regression.mjs`

**Interfaces:**
- `RouteTransitionKind = "glide" | "lift" | "settle"`.
- top-level module→module = glide, direction by module order.
- same-root deeper = lift.
- back/sibling/unknown utility = settle.
- 220–320ms, x/y+opacity+tiny optional scale only.

- [ ] **Step 1: Write failing resolver tests** for forward/back top-level, deeper internal, back internal, unknown utility.
- [ ] **Step 2: Add failing source regression** rejecting `rotateY` and `blur(` in default frames.
- [ ] **Step 3: Run RED**.
- [ ] **Step 4: Implement resolver**.
- [ ] **Step 5: Implement low-cost frames/presence**.
- [ ] **Step 6: Run GREEN**.
- [ ] **Step 7: Commit** `feat: smooth route transitions`.

### Task 2: Implement time-based appearance

**Files:**
- Create: `src/domain/appearance-schedule.ts`
- Create: `src/app/_components/shell/time-color-scheme-provider.tsx`
- Modify: `src/app/providers.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/_components/shell/shell-preferences.tsx`
- Modify: `messages/es.json`
- Test: `src/domain/__tests__/appearance-schedule.test.ts`
- Test: `src/app/_components/shell/time-color-scheme-provider.test.tsx`
- Create: `scripts/tests/appearance-schedule-regression.mjs`

**Interfaces:**
- `DentyAppearancePreference = "time" | "light" | "dark"`.
- `scheduledSchemeAt(input, "Europe/Madrid")`.
- `nextSchemeBoundary(input, "Europe/Madrid")`.
- local key `denty-appearance`, default `time`.

- [ ] **Step 1: Write failing boundary tests**: 06:59 dark; 07:00 light; 20:59 light; 21:00 dark; manual override wins.
- [ ] **Step 2: Write failing provider tests** for focus/visibility refresh and scheduled boundary.
- [ ] **Step 3: Run RED**.
- [ ] **Step 4: Implement timezone-safe resolver with `Intl.DateTimeFormat` parts**.
- [ ] **Step 5: Implement provider + preference UI** with “Automático por hora / Claro / Oscuro”.
- [ ] **Step 6: Adjust initial color-scheme script/attributes** to reduce flash without OS-auto semantics.
- [ ] **Step 7: Run GREEN**.
- [ ] **Step 8: Commit** `feat: add time based appearance`.

### Task 3: Open newly created documents immediately

**Files:**
- Modify: `src/features/parity/modules/documents-module.tsx`
- Create: `src/features/parity/modules/documents-create-flow.ts`
- Test: `src/features/parity/modules/documents-create-flow.test.ts`
- Create: `scripts/tests/documents-auto-open-regression.mjs`

**Interfaces:**
- `createDocumentRow(input): DocumentRow`.
- `DocumentPostCreateAction = { kind: "sign"; documentId: string } | { kind: "preview"; documentId: string }`.
- `postCreateAction(document)` returns sign for `CONSENT`, preview otherwise.

- [ ] **Step 1: Write failing pure tests** for exact new ID and preserved patient/doctor/site/template/title.
- [ ] **Step 2: Run RED**.
- [ ] **Step 3: Refactor create flow** to build one object, insert, close create modal, then use that same object directly.
- [ ] **Step 4: Consent calls existing `openSigning(document)`**.
- [ ] **Step 5: Non-consent opens existing preview/detail state**.
- [ ] **Step 6: Run GREEN**.
- [ ] **Step 7: Commit** `fix: open documents after creation`.

### Task 4: UX release verification

- [ ] **Step 1: Run route/motion tests** and verify no heavy default transition remains.
- [ ] **Step 2: Run appearance schedule/provider tests**.
- [ ] **Step 3: Run document auto-open tests**.
- [ ] **Step 4: Run existing history/pipeline/architecture regressions**.
- [ ] **Step 5: Commit** `test: gate navigation theme documents ux`.
