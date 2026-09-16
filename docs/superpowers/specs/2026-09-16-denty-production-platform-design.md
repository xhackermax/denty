# Denty Production Platform Design

**Date:** 2026-09-16  
**Source baseline:** Denty V11 (`denty-agenda-capa-estados-v11`)  
**Purpose:** Convert the current browser-first preview into a multi-user, auditable dental-clinic platform without discarding the clinical and UX behavior already validated in V5-V11.

## 1. Current baseline

The V11 repository is a pnpm monorepo:

- `apps/web`: Next.js 15 + React 19. The current root page still renders `LegacyDentyShell`.
- `apps/api`: Fastify 5.2.1. It currently exposes `/health` and `/api/clinic/demo`.
- `packages/db`: Prisma schema with SQLite and only `Patient`.
- `packages/domain`: small shared domain with `admin | operational`.
- `packages/voice`: minimal local parser.
- `apps/legacy-preview`: ~4,000 lines across `app.js`, `logic.js`, and `voice-router.js`, plus mature regression tests.
- `server.py`: optional local server for AI, payments and whole-state synchronization.
- Browser `localStorage` remains the primary clinical data source in the preview.

The legacy preview is the behavioral reference, not the target architecture.

## 2. Non-negotiable architecture

1. **Server is authoritative.** Clinical, financial, identity and document records must not use browser storage as the source of truth.
2. **API owns authorization.** UI hiding is UX only. Every protected API operation checks actor, clinic, scope and permission.
3. **Domain rules are framework-independent.** Clinical ordering, odontogram semantics, appointment availability, finance calculations and permission rules live outside React and Fastify route handlers.
4. **All meaningful mutations are auditable.** The server records actor, entity, operation, timestamp, correlation id and before/after digest or structured change.
5. **Mutable records use optimistic concurrency.** API updates require `expectedVersion`; stale writes return HTTP 409 and the current server record.
6. **No silent clinical conflict merging.** Clinical/financial conflicts are surfaced to the user. Automatic merge is reserved for explicitly safe fields.
7. **Issued financial documents and signed clinical documents are immutable.** Corrections create new records.
8. **React migration is incremental.** Keep `/legacy` as comparison/reference until native replacements pass feature parity tests.
9. **TanStack Query owns server state.** Zustand is limited to ephemeral UI state.
10. **Voice never writes directly.** Speech/LLM output must become typed actions, pass permissions and validation, produce a dry-run preview when needed, then execute through the same application services as clicks.
11. **Clinical decision support does not prescribe autonomously.** Denty may order clinician-recorded needs, expose configured alternatives, and explain dependencies. It must not silently choose a patient-specific treatment alternative.
12. **Analytics-ready from day one.** Domain mutations emit structured domain events through an outbox so the future administrator-only `Análisis` module has traceable data.

## 3. Runtime topology

### Clinic staff

Browser/tablet
→ Next.js web
→ Fastify API
→ authoritative database

For the first production milestone, a clinic may run a single Fastify server with SQLite in WAL mode. Multiple clinic devices access the API; no device opens the SQLite file directly.

### Future hosted deployment

Next.js
→ Fastify
→ PostgreSQL

Repository interfaces must isolate persistence so moving from SQLite to PostgreSQL does not change domain services.

### Patient access

Patient mobile browser
→ Next.js patient route group
→ same Fastify authorization boundary
→ patient-scoped data only

## 4. Shared packages

Add:

- `packages/contracts`: Zod request/response schemas and typed API DTOs.
- `packages/domain/src/events`: domain event types.
- `packages/domain/src/permissions`: roles, scopes and permission evaluation.
- `packages/db/src/repositories`: persistence implementations.

Do not put HTTP status codes, React components or Prisma models inside `packages/domain`.

## 5. IDs and migration

New server entities use opaque string IDs (`cuid`/UUID style). Legacy numeric IDs are retained only in import metadata:

- `legacyId`
- `legacySource`
- `legacyImportBatchId`

Legacy import is idempotent. Re-running the same batch must not duplicate patients, appointments, documents or financial records.

## 6. Shared record conventions

Mutable records include:

- `id`
- `clinicId`
- `version`
- `createdAt`
- `updatedAt`
- optional `archivedAt`

Clinical and financial records additionally keep author/source metadata.

Money is stored as integer cents. Percentages/tax rates use integer basis points when arithmetic is required. Never use JavaScript floating point as the persisted source for money.

## 7. Real-time update model

Writes use REST application endpoints. Real-time synchronization uses a server event stream:

`GET /api/events`

Events contain:

- `eventId`
- `clinicId`
- `entityType`
- `entityId`
- `operation`
- `version`
- `occurredAt`

The web app invalidates the corresponding TanStack Query keys. Reception marking a patient as arrived therefore updates the dentist's agenda without polling the whole database.

## 8. Audit + outbox

Every transaction that changes business state writes:

1. business row(s),
2. `AuditEvent`,
3. `DomainEventOutbox`

in the same transaction.

The outbox powers real-time invalidation and later analytics. Example event names:

- `patient.created`
- `appointment.arrived`
- `appointment.no_show`
- `appointment.completed`
- `clinical_plan.item_completed`
- `treatment.rework_recorded`
- `budget.accepted`
- `payment.received`
- `invoice.issued`
- `lab.cost_recorded`
- `document.signed`

## 9. Error contract

All API errors use:

```json
{
  "error": {
    "code": "APPOINTMENT_VERSION_CONFLICT",
    "message": "La cita ha cambiado en otro dispositivo.",
    "correlationId": "..."
  }
}
```

Validation errors include field paths. Authorization errors never leak existence of records outside the actor's scope.

## 10. Migration cut-over

- Keep current root on legacy while foundation work is developed under native routes.
- Expose native routes under `/app/*` and patient routes under `/patient/*`.
- After Patients + Agenda + Auth are server-backed and stable, switch the post-login staff landing route to `/app/today`.
- Preserve `/legacy` until all modules listed in the master roadmap have native replacements.
- Do not add new production-only business logic to `apps/legacy-preview` after native migration of that feature begins.

## 11. Regulatory boundaries

### VERI*FACTU

Build fiscal logic behind a dedicated adapter. Issued invoice records are immutable; corrections use rectifying/cancellation records. QR, hash chain, generation records and AEAT submission evidence must be generated server-side.

The regulatory implementation must be re-validated against the current AEAT technical specification before production certification.

### Electronic signature

Denty's built-in signature is an evidence-bearing simple electronic signature workflow unless a qualified/trusted third-party provider is integrated. UI and legal copy must not describe it as a qualified signature.

### Data-subject rights

Do not implement destructive deletion of clinical records as a generic "GDPR delete" button. Implement a controlled request workflow that can export, restrict, anonymize where lawful, or retain records under an applicable legal-retention rule.

## 12. Global quality gates

A subsystem is not "migrated" until:

- its native React flow passes component/integration tests,
- API authorization tests pass,
- persistence survives process restart,
- two simulated users can observe each other's changes,
- stale concurrent writes return 409 instead of overwriting,
- audit rows exist for mutations,
- the matching legacy regression behavior is covered by native tests,
- legacy implementation for that feature is no longer required by the main app.
