# Native React/Next Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `LegacyDentyShell` as the production UI with modular Next.js/React features while retaining `/legacy` as a temporary behavior reference.

**Architecture:** Create a native authenticated clinic shell using App Router. TanStack Query owns API state, Zustand owns only ephemeral UI state. Migrate feature-by-feature; never copy large blocks of `app.js` into React. Extract reusable business rules to `packages/domain`.

**Spec:** `docs/superpowers/specs/2026-09-16-denty-production-platform-design.md`

## Target route structure

```text
/app/today
/app/agenda
/app/patients
/app/patients/[patientId]
/app/patients/[patientId]/odontogram
/app/patients/[patientId]/treatment
/app/patients/[patientId]/budgets
/app/patients/[patientId]/documents
/app/lab
/app/finance
/app/settings
/legacy
/patient/*
```

---

### Task 1: Introduce native app shell and API client

**Files:**
- Create: `apps/web/src/app/app/layout.tsx`
- Create: `apps/web/src/app/app/today/page.tsx`
- Create: `apps/web/src/shared/api/client.ts`
- Create: `apps/web/src/shared/query/QueryProvider.tsx`
- Create: `apps/web/src/shared/layout/ClinicShell.tsx`
- Modify: `apps/web/src/app/layout.tsx`
- Test: shell/component tests

- [ ] Write failing render/navigation test.
- [ ] Implement query provider and authenticated shell.
- [ ] Use semantic navigation generated from domain permissions.
- [ ] Commit.

### Task 2: Move legacy preview to `/legacy`

**Files:**
- Create: `apps/web/src/app/legacy/page.tsx`
- Modify: `apps/web/src/components/LegacyDentyShell.tsx`
- Modify: script loading so legacy bundle is loaded only by legacy route/layout.

- [ ] Test native pages do not load `denty-app.bundle.js`.
- [ ] Test `/legacy` still renders and retained regression suite remains green.
- [ ] Commit.

### Task 3: Build native patient list and patient profile

**Files:**
- Create: `apps/web/src/features/patients/api.ts`
- Create: `apps/web/src/features/patients/PatientList.tsx`
- Create: `apps/web/src/features/patients/PatientHeader.tsx`
- Create routes under `/app/patients`
- Test component + Playwright flow

Behaviors to preserve from legacy:

- search,
- create patient,
- open profile,
- archived flag,
- quick access to agenda/odontogram/treatment/documents.

- [ ] Port behavior via API, not localStorage.
- [ ] Add loading/error/409 handling.
- [ ] Commit.

### Task 4: Establish feature module pattern

Each native feature uses:

```text
features/<name>/
  api.ts
  queries.ts
  components/
  forms/
  types.ts
  __tests__/
```

No feature imports from `apps/legacy-preview`.

- [ ] Add architecture test that fails on imports from `apps/legacy-preview` inside `apps/web/src/features`.
- [ ] Document pattern in `docs/architecture/NATIVE-FEATURES.md`.
- [ ] Commit.

### Task 5: Add real-time query invalidation

**Files:**
- Create: `apps/web/src/shared/realtime/EventStreamProvider.tsx`
- Test: event invalidation tests

Map server events to query keys, e.g.:

```text
appointment.* -> ["appointments", date]
patient.* -> ["patients"] and ["patient", id]
```

- [ ] Test reconnect and invalidation.
- [ ] Commit.

### Task 6: Feature parity harness

**Files:**
- Create: `docs/qa/FEATURE-PARITY.md`
- Create: `apps/web/e2e/parity/*`

For each migrated module, list legacy behavior and native test evidence. Do not switch the production navigation link until the parity row is complete.

- [ ] Add Patients parity rows first.
- [ ] Add CI command for Playwright.
- [ ] Commit.

### Task 7: Cut over root after core readiness

Only after Auth + Patients + Agenda native flows are green:

- root `/` redirects authenticated staff to `/app/today`,
- unauthenticated users to `/login`,
- legacy remains `/legacy`.

- [ ] Add redirect tests.
- [ ] Verify no main route loads legacy bundle.
- [ ] Commit.

## Acceptance criteria

- Production staff navigation no longer relies on `dangerouslySetInnerHTML`.
- `app.js`/`logic.js` are not imported by native features.
- Patients and Agenda can run with legacy page closed.
- API state refreshes in real time.
- `/legacy` remains available until the last module is migrated.
