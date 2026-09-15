# Denty Paciente V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Expand the current Denty Paciente preview into a functional patient treatment companion with treatment status, route-to-finish, intelligent rescheduling, payment simulation, waiting room, preparation, documents and support.

**Architecture:** Keep the current legacy-preview runtime as the active implementation layer, add pure/testable patient-portal helpers to `logic.js`, and keep browser-side interaction state in a backward-compatible `db.patientPortal` store. UI rendering and event bindings remain in `app.js`; styling stays in the patient-portal section of `styles.css`; the generated bundle/public copies are rebuilt from source after tests pass.

**Tech Stack:** Vanilla ES modules, existing Denty legacy runtime, Node assert-based verification scripts, CSS.

**Spec:** `docs/superpowers/specs/2026-09-15-denty-paciente-v2-design.md`

## Global Constraints
- Do not invent Smilecloud, ArchForm or YouTube URLs.
- Do not create recurring charges from the payment simulator.
- Separate clinical delay impact from any cancellation-fee policy.
- Keep existing clinic-side appointments, documents, budgets and treatment plans as source data.
- Preserve backward compatibility with existing browser databases.

---

### Task 1: Patient portal domain helpers

**Files:**
- Modify: `apps/legacy-preview/logic.js`
- Test: `tests/verify_patient_portal_v2.mjs`

**Interfaces:**
- Produces: `ensurePatientPortalState(db, patientId)`, `patientPortalDelayDays(changes)`, `patientPortalProjectedDate(baseDate, changes)`, `patientPortalPaymentPlan(amount, months)`, `patientPortalHealth(input)`, `patientPortalRescheduleCandidates(db, appointment, options)`, `patientPortalWaitingRoom(db, patientId, date)`.

- [x] Write assertions for the new exported helpers and run `node tests/verify_patient_portal_v2.mjs`; expect failure because exports do not exist.
- [x] Implement the minimum helper functions in `logic.js`.
- [x] Re-run `node tests/verify_patient_portal_v2.mjs`; expect all helper assertions to pass.

### Task 2: Portal views and patient actions

**Files:**
- Modify: `apps/legacy-preview/app.js`
- Test: `tests/verify_patient_portal_v2.mjs`

**Interfaces:**
- Consumes: all Task 1 helper exports.
- Produces: patient portal tabs, treatment-status banner, route-to-finish, dynamic delay display, payment-plan selection, preparation checklist, waiting-room check-in, waiting-list toggle, structured support request and intelligent reschedule dialog.

- [x] Add static UI assertions for the six portal tabs, route-to-finish, waiting room, preparation, waiting list, history, support and configured media links; run the test and confirm the UI assertions fail.
- [x] Implement render functions and bindings in `app.js`, keeping secure/external integrations explicitly labelled when not configured.
- [x] Re-run `node tests/verify_patient_portal_v2.mjs`; expect pass.

### Task 3: Responsive patient portal design

**Files:**
- Modify: `apps/legacy-preview/styles/styles.css`
- Test: `tests/verify_patient_portal_v2.mjs`

**Interfaces:**
- Produces: mobile-first portal navigation, status cards, responsive grids, timeline, waiting-room and finance presentation.

- [x] Add CSS assertions for portal nav/status/responsive rules and run the test; expect failure.
- [x] Implement the patient portal styles and breakpoints.
- [x] Re-run the patient portal verification.

### Task 4: Keep generated web output in sync

**Files:**
- Modify generated: `apps/legacy-preview/denty-app.bundle.js`
- Modify generated/public: `apps/web/public/denty-app.bundle.js`, `apps/web/public/styles/styles.css`, related synced legacy public assets as produced by existing scripts.
- Modify: `package.json`

**Interfaces:**
- Produces: static Next/Vercel preview containing the same patient portal source and a root legacy test command that includes both patient portal verification scripts.

- [x] Run `node apps/legacy-preview/build-static-bundle.mjs`.
- [x] Run `node apps/web/scripts/sync-legacy-assets.mjs`.
- [x] Add `verify_patient_portal.mjs` and `verify_patient_portal_v2.mjs` to `legacy:test`.

### Task 5: Verification and documentation consistency

**Files:**
- Modify: `docs/DOCUMENTACION-DENTY.md`
- Verify: all `tests/*.mjs`

**Interfaces:**
- Produces: documentation that no longer says the patient portal is pending and a recorded verification result.

- [x] Update the patient-account documentation to describe the portal as a local preview and list backend-only limitations.
- [x] Run every Node verification script under `tests/*.mjs`.
- [x] Run `node tests/verify_static_page.mjs` and the bundle sync verification again after generated output is updated.
- [x] Record any pre-existing unrelated failures separately from changes introduced by this plan.

## Verification note

Patient-portal, gateway, modal, static-page, payment, odontogram and server verification scripts pass. The repository still has one pre-existing unrelated Node verification failure in `verify_voice_settings.mjs`: README lacks the expected Ollama / `DENTY_AI_PROVIDER` and `DENTY_MCP_URL` documentation. This failure was present before the Denty Paciente V2 changes and was not changed as part of this scope.
