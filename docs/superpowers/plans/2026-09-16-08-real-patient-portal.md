# Real Patient Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Denty Paciente from a same-browser preview into a secure remote patient account with invitations, recovery, scoped records, notifications, budget acceptance, remote signing and online payment hooks.

**Architecture:** Patient users authenticate through the same auth service but can access only patients granted through `PatientAccessGrant`. Portal DTOs are projections; raw staff/clinical notes are never returned. High-value actions create immutable acceptance/signature/payment records.

**Spec:** `docs/superpowers/specs/2026-09-16-denty-production-platform-design.md`

### Task 1: Patient invitation/claim

Add `PatientInvitation`:

```text
tokenHash
patientId
email/phone target
expiresAt
claimedAt
createdByUserId
```

Endpoints:

```text
POST /api/patients/:id/invitations
POST /api/patient-auth/claim
```

- [ ] Test one-time/expired token.
- [ ] Test claim creates `PatientAccessGrant`.
- [ ] Commit.

### Task 2: Password recovery

One-time hashed reset token with short expiry. Never reveal whether an email/phone exists.

- [ ] Tests for expiry/reuse.
- [ ] Commit.

### Task 3: Patient-scoped projection API

Endpoints:

```text
GET /api/patient/me
GET /api/patient/appointments
GET /api/patient/treatment
GET /api/patient/budgets
GET /api/patient/documents
GET /api/patient/payments
```

Projection explicitly excludes internal notes, staff-only alerts and unrestricted audit data.

- [ ] Scope tests for every endpoint.
- [ ] Commit.

### Task 4: Native patient route group

Create:

```text
/patient/home
/patient/appointments
/patient/treatment
/patient/budgets
/patient/documents
/patient/payments
```

Port V9 accordion treatment UX and V7 alternative pros/cons.

- [ ] Component parity tests.
- [ ] Commit.

### Task 5: Check-in

Patient “He llegado” calls the same appointment transition service as reception.

- [ ] Test it writes `arrivedAt` once and doctor receives event.
- [ ] Prevent check-in for another patient or cancelled appointment.
- [ ] Commit.

### Task 6: Budget acceptance

Add `BudgetAcceptance` immutable record:

```text
budgetId
patientId
acceptedAt
acceptedByUserId
termsVersion
ipHash
userAgentHash
```

Acceptance does not equal clinical consent or payment.

- [ ] Tests.
- [ ] Commit.

### Task 7: Remote document signing

Portal opens only documents addressed to that patient/access grant. Signature flow delegates to Plan 09.

- [ ] Authorization + signed-lock tests.
- [ ] Commit.

### Task 8: Notifications

Create `Notification` and provider interface:

```ts
send(notification): Promise<DeliveryResult>
```

Start with in-app + email adapter; SMS/WhatsApp remain provider adapters.

Events that may notify:

```text
appointment reminder/change
lab-related appointment change
new document to sign
budget ready
payment receipt
```

- [ ] Preference/unsubscribe tests for non-essential messages.
- [ ] Commit.

### Task 9: Online payment abstraction

Patient portal requests server-created payment intent:

```text
POST /api/patient/payments/intents
```

No card details pass through Denty server unless using a compliant payment provider integration designed for that.

- [ ] Provider contract tests.
- [ ] Commit.

### Task 10: Family/dependent access

`PatientAccessGrant.relationship`:

```text
SELF
GUARDIAN
AUTHORIZED
```

Staff must create/approve grants; users cannot add arbitrary patients by ID.

- [ ] Scope tests.
- [ ] Commit.

## Acceptance criteria

- Portal works from a different device/network.
- Patient cannot enumerate other patients.
- Same clinical plan IDs power staff and patient routes.
- Check-in updates doctor agenda in real time.
- Acceptance, signature and payment are distinct auditable actions.
