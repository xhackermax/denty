# Denty Patient Shared Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate clinic and patient sessions while making both interfaces read and write the same persistent clinical dataset so changes made by staff are immediately visible to the selected patient.

**Architecture:** Keep the existing browser database as the shared preview repository, but move account identity and selected patient into session-scoped state. Add cross-tab invalidation through `storage`/`BroadcastChannel`, a patient picker in the access gateway, a patient-only shell, and a patient-friendly oral-health projection derived from the professional odontogram. The repository boundary remains replaceable by the future local-server API.

**Tech Stack:** Vanilla JavaScript legacy runtime, browser Storage API, BroadcastChannel, Next.js legacy shell bridge, Node assertion tests.

**Spec:** Approved in chat on 2026-09-15: separate Admin/Patient shells, one shared dataset, switchable identities, simultaneous tabs, and immediate propagation of clinical/agenda/financial changes.

## Global Constraints

- Do not persist the active account role as shared clinical state.
- A patient session may only render the selected patient record.
- Clinic and patient tabs must receive shared-data changes without reloading the browser manually.
- Patient UI must not expose the clinic drawer, clinic bottom navigation, or clinic action bar.
- Existing legacy data remains compatible and the future server can replace the browser repository without redesigning the UI.

---

### Task 1: Shared-session regression tests

**Files:**
- Create: `tests/verify_patient_shared_session.mjs`

- [ ] Assert a patient can be explicitly selected at the gateway.
- [ ] Assert account/session keys are session-scoped and not the shared database identity.
- [ ] Assert the runtime listens for shared database updates across tabs.
- [ ] Assert patient mode hides the clinic chrome.
- [ ] Assert odontogram findings can be projected into patient-friendly findings.

### Task 2: Session and cross-tab state boundary

**Files:**
- Modify: `apps/legacy-preview/app.js`

- [ ] Add session-scoped account/user/patient context.
- [ ] Preserve session identity when shared DB is reloaded.
- [ ] Broadcast writes and reload external writes.
- [ ] Add admin account switch action and patient identity selection.

### Task 3: Patient projection of clinic data

**Files:**
- Modify: `apps/legacy-preview/logic.js`
- Modify: `apps/legacy-preview/app.js`

- [ ] Derive patient-friendly dental findings from the professional odontogram.
- [ ] Render these findings in Denty Paciente so an admin caries update becomes visible in the patient view.

### Task 4: Shell separation and sync

**Files:**
- Modify: `apps/legacy-preview/index.html`
- Modify: `apps/legacy-preview/styles/styles.css`
- Modify: `apps/web/scripts/sync-legacy-assets.mjs`
- Regenerate: `apps/web/src/lib/legacy-shell.ts`

- [ ] Add patient selector and account switch control.
- [ ] Hide all clinic chrome in patient mode and render a patient-owned header.
- [ ] Generate the Next legacy shell from the legacy HTML during sync to prevent markup drift.

### Task 5: Build and verification

**Files:**
- Regenerate: `apps/legacy-preview/denty-app.bundle.js`
- Sync: `apps/web/public/**`

- [ ] Run the new regression test and patient portal tests.
- [ ] Run `legacy:test`.
- [ ] Run the broader JavaScript verification suite and record any unrelated pre-existing failures.
- [ ] Run web typecheck/build if the local dependency environment allows it.
