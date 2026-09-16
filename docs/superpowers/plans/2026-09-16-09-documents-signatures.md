# Documents and Electronic Signature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build versioned document templates, immutable rendered documents, evidence-bearing signatures, PDF archiving and controlled delivery to patients.

**Architecture:** Templates are editable and versioned. Creating a patient document snapshots the exact template version and merge data. Signing freezes a rendered PDF, content hash and signature evidence. Signed documents are never edited in place.

**Spec:** `docs/superpowers/specs/2026-09-16-denty-production-platform-design.md`

### Task 1: Normalize templates and documents

Add:

```text
DocumentTemplate
DocumentTemplateVersion
ClinicalDocument
DocumentRevision
DocumentFile
SignatureRecord
DocumentDelivery
```

Document types:

```text
INFORMED_CONSENT
ATTENDANCE_CERTIFICATE
POSTOP_INSTRUCTIONS
CLINICAL_REPORT
REFERRAL
LETTER
PRESCRIPTION
```

Prescription rendering must remain disabled for production until clinic/legal requirements are validated.

- [ ] Schema/repository tests.
- [ ] Commit.

### Task 2: Template merge engine

Allow explicit merge tokens only:

```text
patient.fullName
patient.dni
clinic.name
site.name
site.address
clinician.name
appointment.date
appointment.startTime
treatment.summary
```

Unknown tokens fail rendering rather than leaking arbitrary object properties.

- [ ] Merge tests.
- [ ] Commit.

### Task 3: Attendance certificate migration

Port V9 behavior:

- only attended/completed appointment,
- default wording reveals only attendance,
- concrete procedure is opt-in,
- issue date/location/center data captured in snapshot.

- [ ] Port `verify_attendance_certificate.mjs` to native domain/API tests.
- [ ] Commit.

### Task 4: Server PDF rendering

Use a server PDF renderer (`@react-pdf/renderer` or equivalent selected in the implementation commit) with versioned templates.

Output:

```text
storageKey
sha256
mimeType
size
renderedAt
```

Do not regenerate a signed PDF from current mutable patient data.

- [ ] Golden/snapshot PDF metadata test.
- [ ] Commit.

### Task 5: Signature ceremony

Required evidence:

```text
documentRevisionId
signerUserId/patientId
signedAt
signature image/vector reference
accepted checkbox
contentSha256
ipHash
userAgentHash
sessionId
```

After signing:

- document status `SIGNED`,
- signed revision locked,
- final PDF hash stored,
- audit/outbox event `document.signed`.

- [ ] Test second signature/edit attempt fails.
- [ ] Commit.

### Task 6: Template editor/versioning

Admin can create new template version; old signed documents remain linked to old version.

- [ ] Test changing template v4 does not alter document created from v3.
- [ ] Commit.

### Task 7: Delivery/archive

Allow portal delivery and download. Store delivery attempts; avoid email attachments containing sensitive data by default, preferring authenticated portal links.

- [ ] Delivery tests.
- [ ] Commit.

### Task 8: Native staff document UI

Patient document tab supports:

- create from template,
- preview,
- sign in clinic,
- send to portal,
- download final PDF,
- view immutable history.

- [ ] E2E consent creation/sign/download.
- [ ] Commit.

## Acceptance criteria

- Signed content is immutable and hash-verifiable.
- Template changes never rewrite prior documents.
- Attendance certificate privacy default is preserved.
- Portal accesses only documents belonging to patient scope.
- UI does not market built-in signature as a qualified electronic signature.
