# Denty UX Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a prioritized, evidence-based set of small UX improvements for Denty's dashboard, agenda, patient record, and mobile shell.

**Architecture:** This is a read-only discovery pass across four existing workflows, followed by one findings report for user review. It does not change application behavior; each approved implementation slice will receive its own scoped design and plan after findings are reviewed.

**Tech Stack:** Next.js 16, React, Mantine, CSS Modules, Vitest, Playwright, existing fake-Supabase browser harness.

**Spec:** `docs/UX-IMPROVEMENTS-SPEC.md`

## Global Constraints

- Audit first; implement only problems supported by a reproducible observation, an accessibility issue, or a clear usability regression.
- Work incrementally across the dashboard, agenda, patient record, and mobile shell.
- Preserve the current Denty design system, Next.js/Mantine stack, role and tenant boundaries, and canonical API/Supabase data flow.
- Do not add product features, duplicate business logic, or decorative motion without a separately agreed need.
- Preserve existing local edits and skill files; stage only product changes explicitly authorized after the findings review.
- Do not create a production UI toggle for test-only data.
- Treat browser emulation as insufficient proof of device-specific iOS/Android behavior.

## Review Focus

- Long patient names and unbroken email addresses must not widen the patient record or odontogram.
- Long appointment descriptions and dense overlapping schedules must remain legible and operable at phone width.
- Empty, single-item, and unavailable/error states must be distinct and must not display invented data.
- Large monetary values and long treatment descriptions must remain readable without wrapping amounts mid-value.
- Touch, keyboard, dark appearance, and reduced-motion behavior must remain usable across audited workflows.

---

### Task 1: Audit dashboard and app shell

**Files:**
- Inspect: `src/features/dashboard/dashboard.tsx`
- Inspect: `src/features/dashboard/dashboard-calendar.tsx`
- Inspect: `src/features/dashboard/dashboard-layout.module.css`
- Inspect: `src/app/_components/shell/app-shell.tsx`
- Inspect: `src/app/_components/shell/app-shell.module.css`
- Inspect: `src/features/navigation/catalog.ts`
- Inspect: related dashboard and navigation tests under `src/features/dashboard` and `src/features/navigation`

**Interfaces:**
- Consumes: Existing Dashboard, navigation catalogue, fake-Supabase fixtures, and installed `emil-design-eng`, `mobile-native`, and `review-animations` guidance.
- Produces: Evidence-backed dashboard/shell findings for Task 4; no application-code changes.

- [x] **Step 1: Map the dashboard's visible values and actions** — trace their query/API sources, permission guards, loading/error/empty states, and links to the next workflow.
- [x] **Step 2: Inspect layout and interactions** — assess the existing 360 px, tablet, and desktop layouts; light/dark appearance; keyboard reachability; active/press states; and reduced-motion behavior. Record observed behavior separately from CSS-only inference.
- [x] **Step 3: Run existing dashboard tests** — run `node_modules/.bin/vitest.cmd run src/features/dashboard/__tests__ src/features/navigation`; record exact results without changing fixtures or components.
- [x] **Step 4: Record only reproducible findings** — note the route, exact state/viewport, reproduction, impact/frequency, smallest plausible fix, and proposed regression test.

**Check:** Dashboard/navigation tests pass or their pre-existing failure is recorded. No UI source files change.

### Task 2: Audit agenda and appointment workflows

**Files:**
- Inspect: `src/features/agenda/agenda-page.tsx`
- Inspect: `src/features/agenda/agenda.module.css`
- Inspect: `src/features/agenda/agenda-appointment-card.tsx`
- Inspect: `src/features/agenda/agenda-quick-view.tsx`
- Inspect: `src/features/agenda/next-slot-finder.tsx`
- Inspect: existing tests under `src/features/agenda/__tests__` and related Playwright tests under `e2e`

**Interfaces:**
- Consumes: Existing appointment queries/mutations, fake-Supabase fixtures, and the approved UX spec.
- Produces: Evidence-backed agenda findings for Task 4; no application-code changes.

- [x] **Step 1: Trace the current appointment paths** — inspect creating, finding, viewing, moving, and advancing appointment status across the existing day, multi-day, week, reception, and list views.
- [x] **Step 2: Exercise representative responsive states** — inspect 360 px phone, tablet, and desktop layouts, including appointment conflicts, long patient/reason labels, empty schedules, and existing touch/keyboard paths.
- [x] **Step 3: Run existing agenda tests** — run `node_modules/.bin/vitest.cmd run src/features/agenda/__tests__`; record exact results.
- [x] **Step 4: Record only reproducible findings** — include the exact view and interaction, impact/frequency, smallest plausible fix, and proposed regression test.

**Check:** Agenda tests pass or their pre-existing failure is recorded. No UI source files change.

### Task 3: Audit patient record and clinical entry points

**Files:**
- Inspect: `src/app/(staff)/app/patients/[id]/page.tsx`
- Inspect: `src/app/(staff)/app/patients/[id]/odontogram/page.tsx`
- Inspect: `src/features/patients/patient-profile.tsx`
- Inspect: `src/features/patients/patient-clinical-summary.tsx`
- Inspect: existing patient and odontogram tests under `src/features/patients` and `src/features/odontogram`
- Inspect: `e2e/worst-case-data.spec.ts`

**Interfaces:**
- Consumes: Existing patient/clinical API projections, the fake-Supabase browser harness, and the approved UX spec.
- Produces: Evidence-backed patient-workflow findings for Task 4; no application-code changes.

- [x] **Step 1: Map common clinical entry points** — identify how users reach the odontogram, treatment flow, documents, and patient actions, including permission-gated actions and current selected-patient context.
- [x] **Step 2: Review adversarial data coverage** — inspect existing long-name, unbroken-email, long-treatment, huge-amount, and empty/single states; note actual validation/schema limits before proposing new values.
- [x] **Step 3: Run existing worst-case browser tests** — build using the fake-only values `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54399` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=e2e-publishable`, then run `node_modules/.bin/playwright.cmd test --project=desktop-chromium --grep 'worst-case-data'` with `PLAYWRIGHT_CHROMIUM_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`.
- [x] **Step 4: Record only reproducible findings** — distinguish visible defects from code-review concerns and state any device-only checks still needed.

**Check:** Existing worst-case browser tests pass or their pre-existing failure is recorded. Tests use fake Supabase only; no real project credentials are introduced.

### Task 4: Synthesize and review findings

**Files:**
- Create: `docs/UX-FINDINGS.md`
- Reference: `docs/UX-IMPROVEMENTS-SPEC.md`

**Interfaces:**
- Consumes: Findings from Tasks 1–3.
- Produces: A concise, prioritized report for user review; each entry includes evidence/reproduction, impact and frequency, a minimal proposed fix, regression coverage, and verification limits.

- [x] **Step 1: Rank findings** — order by user impact and frequency, then confidence; keep separate items separate where their owners or tests differ.
- [x] **Step 2: Write the report** — include verified findings, inferred risks clearly labeled as such, and important areas where the audit found no issue. Do not include speculative redesign ideas as findings.
- [x] **Step 3: Review scope with the user** — the findings and proposed slice order were reviewed; the user then authorized implementing all findings and publishing the product changes.

**Check:** Every proposed implementation traces to a specific observation and has an identifiable owner and regression test. No UI source, product dependency, backend, or schema changes are made in this audit plan.
