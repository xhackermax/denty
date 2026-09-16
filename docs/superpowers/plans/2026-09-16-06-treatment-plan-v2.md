# Clinical Treatment Plan V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the recovered APK/V7 clinical plan logic into a typed server-backed graph with priorities, dependencies, alternatives, patient explanations and clinician-controlled editing.

**Architecture:** Treatment items are atomic clinical units. Dependencies form a DAG. Priority phase answers “what should be addressed first”; dependencies answer “what must precede this item”. Alternative groups remain proposals until a clinician validates the required context and approves one option.

**Spec:** `docs/superpowers/specs/2026-09-16-denty-production-platform-design.md`

## Phases

```text
1 acute/control of pain or infection
2 periodontal stabilization
3 disease control/sanitation
4 missing-tooth planning
5 definitive rehabilitation/orthodontics/prosthetics
```

These phases order recorded clinical needs; they do not autonomously diagnose.

---

### Task 1: Create plan domain model and graph

Add Prisma/domain entities:

```text
TreatmentPlan
ClinicalPlanItem
ClinicalDependency
ClinicalPlanStatusEvent
```

Item fields:

```text
patientId
procedureId?
toothCode?
title
clinicalCause?
phase
status
source
sourceRefId?
estimatedVisits?
estimatedDurationMinutes?
clinicianNote?
version
```

Dependency:

```text
predecessorItemId
successorItemId
reasonCode
explanationClinician
explanationPatient
```

- [ ] Port V7 dependency/order tests from `verify_clinical_plan_engine.mjs`.
- [ ] Implement cycle detection.
- [ ] Reject dependency that creates cycle.
- [ ] Commit.

### Task 2: Deterministic priority engine

Port the good behavior of `clinical-priority-core606` into `packages/domain/src/treatment-plan/priority.ts`.

Input is clinician-recorded item/cause, not raw diagnosis inference.

- [ ] Tests for acute, periodontal, caries/sanitation, missing tooth and rehab.
- [ ] Preserve explicit clinician override with `priorityOverrideReason`.
- [ ] Commit.

### Task 3: Canonical procedure dependency templates

Create configurable rule templates for common already-indicated sequences:

```text
endodontics -> core/reconstruction -> crown
extraction -> replacement planning
implant -> abutment/prosthetic restoration
periodontal stabilization -> elective definitive rehabilitation
```

Templates only apply when those procedures are already present/selected.

- [ ] Test crown on same tooth links to existing endodontic item without deleting either.
- [ ] Test clinician can remove/replace a dependency with a recorded reason.
- [ ] Commit.

### Task 4: Alternative treatment model

Add:

```text
ClinicalAlternativeGroup
ClinicalAlternativeOption
ClinicalAlternativeRequirement
ClinicalAlternativeStep
PatientAlternativePreference
ClinicalAlternativeApproval
```

General option fields:

```text
title
patientSummary
pros[]
cons[]
maintenance
invasiveness
stability
relativeTime
relativeCost
reversibility
limitations[]
```

Initial families:

- missing tooth: implant, fixed bridge, Maryland, removable, provisional,
- tooth prognosis discussion: preserve-path versus extraction-path only after clinician creates/validates the options,
- crown versus adhesive restoration where clinician indicates both are viable,
- endodontic-restorative path versus extraction-replacement path,
- multi-unit bridge configurations,
- removable prosthesis options,
- orthodontic plan alternatives.

- [ ] Port V7 preference != approval test.
- [ ] Test missing required context blocks approval.
- [ ] Commit.

### Task 5: Kennedy/removable planning support

Implement missing-tooth pattern helper that may propose a Kennedy classification from the current odontogram but requires clinician confirmation before it becomes plan metadata.

- [ ] Unit tests for canonical patterns.
- [ ] UI displays “clasificación sugerida” until confirmed.
- [ ] Commit.

### Task 6: Patient projection

Create:

```ts
projectPlanForPatient(plan): PatientTreatmentRoute
```

For each item produce:

- understandable title,
- phase label,
- status,
- `whyNow`,
- `whyAfterPrevious`,
- dependency explanation,
- date only when clinician/scheduled appointment provides it.

Never fabricate biological durations.

- [ ] Port “Ruta hasta terminar” no-fake-phase/no-fake-date tests.
- [ ] Commit.

### Task 7: Graph editor UI

Native `/app/patients/[id]/treatment` supports:

- phase columns or ordered list,
- dependency arrows,
- drag reorder within safe constraints,
- add/remove dependency,
- mark complete/reopen,
- alternative group cards,
- patient preference indicator,
- clinician approval action.

Dragging cannot override a dependency silently; show validation and require explicit dependency change.

- [ ] Component tests for cycle prevention/error.
- [ ] E2E endo → reconstruction → crown.
- [ ] Commit.

### Task 8: Link plan to budget and agenda

Plan item exposes stable IDs consumed by:

- budget lines,
- appointments,
- lab orders,
- patient portal.

Completing the final required appointment may complete a plan item only if the configured completion rule is satisfied; it never marks an invoice paid.

- [ ] Integration tests.
- [ ] Emit plan completion/rework events.
- [ ] Commit.

## Acceptance criteria

- Same plan IDs power clinician and patient views.
- Dependencies are explicit and cycle-free.
- Patient preference never equals clinician approval.
- Alternatives include pros/cons and missing-context requirements.
- No invented clinical timing.
- Budget/agenda/lab link to plan item IDs.
