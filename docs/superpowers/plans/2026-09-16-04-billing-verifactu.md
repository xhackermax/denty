# Billing and VERI*FACTU Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real fiscal billing core with invoice series, immutable issued invoices, payments/allocations, rectifying invoices and a server-side VERI*FACTU adapter.

**Architecture:** Billing domain is independent from budgets. A budget may be accepted without being an invoice. Invoice issuance creates an immutable fiscal snapshot in one transaction. VERI*FACTU generation/submission is an adapter over that immutable invoice, never a UI concern.

**Current regulatory note (2026-09-16):** AEAT currently states mandatory adaptation dates of 1 January 2027 for Corporate Income Tax taxpayers and 1 July 2027 for the rest of affected taxpayers. Re-check AEAT immediately before production release because this is regulatory logic.

**Spec:** `docs/superpowers/specs/2026-09-16-denty-production-platform-design.md`

## Fiscal data principles

- Store amounts as integer cents.
- Issued invoice lines copy patient/tax/description values; they do not reference mutable tariff text for rendering.
- Never edit/delete an issued invoice.
- Correction creates a rectifying invoice or fiscal cancellation record according to the applicable case.
- Series numbering is transactionally sequential.
- VAT/exemption treatment is configurable per line and clinic; do not hard-code "dentistry is always exempt".

---

### Task 1: Create billing domain and schema

Add models:

```text
InvoiceSeries
Invoice
InvoiceLine
Payment
PaymentAllocation
FiscalRecord
FiscalSubmission
```

Invoice fields include:

```text
type: STANDARD | SIMPLIFIED | RECTIFYING
status: DRAFT | ISSUED | RECTIFIED
seriesId
number
issuedAt
customer snapshot
subtotalCents
taxCents
totalCents
originalInvoiceId?
version
```

- [ ] Write total calculation tests.
- [ ] Add schema and repositories.
- [ ] Verify cents arithmetic exactly.
- [ ] Commit.

### Task 2: Transactional numbering and issuance

**Interface:**

```ts
issueInvoice(input, actor): Promise<IssuedInvoice>
```

Within one transaction:

1. lock/read series counter through the repository strategy,
2. allocate next number,
3. calculate totals,
4. freeze line/customer snapshots,
5. create fiscal record,
6. audit,
7. outbox `invoice.issued`.

- [ ] Test concurrent issue requests cannot receive same number.
- [ ] Test issued invoice rejects patch/delete.
- [ ] Commit.

### Task 3: Build rectification flow

Endpoints:

```text
POST /api/invoices/:id/rectify
POST /api/invoices/:id/record-cancellation
```

Require reason and reference original invoice.

- [ ] Test original remains unchanged.
- [ ] Test rectifying totals and references.
- [ ] Commit.

### Task 4: Separate production, invoicing and collection

Budget/treatment completion must not imply payment.

Add allocation flow:

```text
POST /api/payments
POST /api/payments/:id/allocate
```

A payment may allocate across one or more invoices; an invoice may receive multiple payments.

Emit:

```text
payment.received
payment.allocated
invoice.paid
```

- [ ] Test partial payments.
- [ ] Test over-allocation is rejected.
- [ ] Commit.

### Task 5: Implement VERI*FACTU record generator

**Files:**
- Create: `packages/domain/src/billing/fiscal-record.ts`
- Create: `apps/api/src/modules/billing/verifactu/record-builder.ts`
- Add official-schema fixtures under `apps/api/src/modules/billing/verifactu/fixtures/`

Generator output contains the exact fields required by the AEAT technical specification in force, invoice identity, issuer identity, chained hash data and system identity.

- [ ] Create fixture tests against AEAT examples.
- [ ] Implement deterministic canonicalization/hash.
- [ ] Verify changing any fiscal field changes the hash.
- [ ] Commit.

### Task 6: QR rendering

Create QR payload from the fiscal record using the AEAT-defined URL/payload format in force.

- [ ] Snapshot-test QR payload string.
- [ ] Add QR to invoice PDF.
- [ ] Commit.

### Task 7: Submission adapter

**Interface:**

```ts
interface FiscalSubmissionProvider {
  submit(record: FiscalRecord): Promise<SubmissionResult>;
  query?(recordId: string): Promise<SubmissionResult>;
}
```

Implement `AeatVerifactuProvider` server-side. Store request digest, response code, response body reference, attempt number and timestamps. Secrets/certificates never reach the browser.

- [ ] Test provider with stub HTTP server.
- [ ] Test retry is idempotent and does not create a second invoice.
- [ ] Test rejected submission remains visible and auditable.
- [ ] Commit.

### Task 8: Billing UI

Native screens:

```text
/app/finance/invoices
/app/finance/invoices/[id]
/app/finance/payments
```

Actions:

- create draft from accepted budget,
- review tax/exemption codes,
- issue,
- print/download,
- record payment,
- rectify.

- [ ] Component tests for immutable issued state.
- [ ] End-to-end issue/partial payment/rectify flow.
- [ ] Commit.

### Task 9: Accounting export boundary

Provide CSV/structured export from issued invoices and payments. Keep provider-specific accounting integrations outside the billing domain.

- [ ] Export test with fixed fixture.
- [ ] Commit.

## Acceptance criteria

- Sequential numbering is concurrency-safe.
- Issued invoices cannot be edited or deleted.
- Budget, invoice and payment are distinct entities.
- Fiscal records are reproducible and auditable.
- QR is generated server-side.
- VERI*FACTU submission adapter is isolated and testable.
- Production release includes a documented AEAT specification re-validation gate.
