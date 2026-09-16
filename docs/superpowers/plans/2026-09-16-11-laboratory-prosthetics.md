# Laboratory and Prosthetic Work Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect lab work directly to treatment plans, appointments, files, ETA, incidents and real costs.

**Architecture:** A `LabOrder` is a first-class workflow linked to patient + plan item/prosthetic structure. Stage changes are append-only events. ETA and costs are server data. Appointment safety checks read lab readiness instead of duplicating status in agenda.

**Spec:** `docs/superpowers/specs/2026-09-16-denty-production-platform-design.md`

### Task 1: Normalize lab schema

Add:

```text
Lab
LabOrder
LabOrderItem
LabStageEvent
LabAttachment
LabIssue
LabCost
```

Core statuses:

```text
PLANNED
CAPTURED
SENT
IN_PRODUCTION
TRIAL_READY
TRIAL_DONE
RECEIVED
PLACED
CANCELLED
```

Workflow templates may skip irrelevant stages.

- [ ] State transition tests.
- [ ] Commit.

### Task 2: Link to clinical plan/prosthetic structure

`LabOrder` may reference:

```text
clinicalPlanItemId
prostheticStructureId
appointmentId?
```

Creating a lab-requiring plan item can create a draft lab order when its procedure configuration has `requiresLab=true`.

- [ ] Integration test for crown/bridge/ferula.
- [ ] Commit.

### Task 3: Digital files

Attachments support:

```text
STL
PLY
OBJ
DICOM_REFERENCE
PHOTO
PDF
OTHER
```

Store metadata + object storage key; do not keep large files in database blobs.

- [ ] Authorization and metadata tests.
- [ ] Commit.

### Task 4: ETA and agenda warning

If a linked trial/placement appointment occurs before `expectedAt`, agenda receives a warning event/projection.

Do not auto-reschedule unless clinic policy explicitly enables it; default is proposal.

- [ ] Tests.
- [ ] Commit.

### Task 5: Incidents/rework

`LabIssue` records:

```text
reason
responsibility: CLINIC | LAB | PATIENT | UNKNOWN
requiresRemake
notes
```

If remake, link new order to original and emit `treatment.rework_recorded`/`lab.rework_recorded`.

- [ ] Test original history preserved.
- [ ] Commit.

### Task 6: Real costs

`LabCost` stores integer cents, supplier invoice reference and category.

Emit `lab.cost_recorded` for future profitability analysis.

- [ ] Cost aggregation tests by treatment/doctor/site.
- [ ] Commit.

### Task 7: Native lab UI

Views:

```text
Kanban by stage
Order detail/timeline
ETA warnings
Issues/remakes
Files
Cost
```

Patient-sensitive data shown according to staff permissions.

- [ ] E2E send → receive → place.
- [ ] Commit.

## Acceptance criteria

- Every lab job has a traceable stage timeline.
- Lab ETA can warn agenda.
- Remakes do not overwrite originals.
- Lab costs link back to plan/procedure for future `Análisis`.
- Attachments are stored outside relational DB blobs.
