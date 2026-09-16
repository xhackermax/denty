# Backend and Multi-user Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace browser-owned clinical state with an authoritative Fastify + Prisma database that safely supports simultaneous clinic users.

**Architecture:** Keep SQLite as the first clinic-server database, accessed only through Fastify. Introduce normalized core tables, repositories, application services, optimistic concurrency, audit/outbox events, a real-time event stream, and an idempotent importer from the V11 legacy JSON shape. Keep persistence behind repository interfaces so PostgreSQL can replace SQLite later without rewriting domain logic.

**Tech Stack:** Fastify 5, Prisma, SQLite WAL, Zod, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-16-denty-production-platform-design.md`

## Global Constraints

- API process is the only writer to the database file.
- New entity IDs are opaque strings; legacy numeric IDs are import metadata only.
- Mutable records carry `version`.
- Clinical/financial stale writes return HTTP 409.
- Business mutation + audit + outbox occur in one DB transaction.
- Money uses integer cents.

---

### Task 1: Make `packages/db` an actual Prisma package

**Files:**
- Modify: `packages/db/package.json`
- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/db/src/client.ts`
- Modify: `packages/db/src/index.ts`
- Test: `packages/db/src/client.test.ts`

**Interfaces:**
- Produces: `prisma`, `disconnectDatabase()`, and generated Prisma types.

- [ ] **Step 1: Write the failing test**

Test that importing `@denty/db` exposes a Prisma client and can create/read a `Clinic`.

- [ ] **Step 2: Run the test and verify it fails**

```bash
pnpm --filter @denty/db test
```

Expected: failure because no Prisma client is generated/exported.

- [ ] **Step 3: Add Prisma dependencies and client**

Add `@prisma/client` dependency and `prisma` dev dependency. Implement a single cached client in `src/client.ts` and export it from `src/index.ts`.

- [ ] **Step 4: Introduce core schema**

Add these models first:

```prisma
model Clinic {
  id        String   @id @default(cuid())
  name      String
  legalName String?
  taxId     String?
  phone     String?
  email     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  sites     Site[]
  patients  Patient[]
}

model Site {
  id        String   @id @default(cuid())
  clinicId  String
  name      String
  address   String?
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  clinic    Clinic   @relation(fields: [clinicId], references: [id], onDelete: Restrict)
  cabinets  Cabinet[]
  @@index([clinicId])
}

model Cabinet {
  id        String   @id @default(cuid())
  clinicId  String
  siteId    String
  name      String
  active    Boolean  @default(true)
  version   Int      @default(1)
  site      Site     @relation(fields: [siteId], references: [id], onDelete: Restrict)
  @@index([clinicId, siteId])
}

model Patient {
  id          String   @id @default(cuid())
  clinicId    String
  legacyId    Int?
  recordNumber String?
  firstName   String
  lastName    String
  dni         String?
  phone       String?
  email       String?
  birthDate   DateTime?
  archivedAt  DateTime?
  version     Int      @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  clinic      Clinic   @relation(fields: [clinicId], references: [id], onDelete: Restrict)
  @@unique([clinicId, legacyId])
  @@index([clinicId, lastName, firstName])
}
```

- [ ] **Step 5: Generate and migrate**

```bash
pnpm --filter @denty/db exec prisma generate
pnpm --filter @denty/db exec prisma migrate dev --name core_clinic_patient
pnpm --filter @denty/db test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/db
git commit -m "feat(db): add authoritative prisma client and clinic core"
```

---

### Task 2: Add staff, schedule and appointment persistence

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/domain/src/agenda/types.ts`
- Create: `packages/db/src/repositories/appointment-repository.ts`
- Test: `packages/db/src/repositories/appointment-repository.test.ts`

**Interfaces:**
- Produces:
  - `AppointmentRepository.listForDay(clinicId, date)`
  - `AppointmentRepository.create(input)`
  - `AppointmentRepository.update(id, expectedVersion, patch)`

Add normalized models:

- `StaffProfile`
- `StaffSite`
- `Shift`
- `Absence`
- `Appointment`

`Appointment` must persist:

```text
patientId
staffId
siteId
cabinetId?
startsAt
endsAt
status
title
reason?
confirmedAt?
arrivedAt?
chairAt?
absentAt?
completedAt?
version
createdAt
updatedAt
```

Status enum:

```text
PLANNED
CONFIRMED
ARRIVED
IN_CHAIR
COMPLETED
NO_SHOW
CANCELLED
```

- [ ] **Step 1:** Write repository tests for create, day listing, status timestamps and version conflict.
- [ ] **Step 2:** Verify tests fail.
- [ ] **Step 3:** Add Prisma models and repository implementation.
- [ ] **Step 4:** Make update use a transaction with `where: { id, version: expectedVersion }`; if update count is zero, fetch current row and raise `VersionConflictError`.
- [ ] **Step 5:** Run repository tests.
- [ ] **Step 6:** Commit.

---

### Task 3: Add audit log and domain outbox

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/domain/src/events/index.ts`
- Create: `packages/db/src/audit/write-audit.ts`
- Create: `packages/db/src/outbox/write-domain-event.ts`
- Test: `packages/db/src/audit/audit-outbox.test.ts`

**Interfaces:**

```ts
export interface AuditInput {
  clinicId: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId: string;
  correlationId: string;
  before?: unknown;
  after?: unknown;
}

export interface DomainEventInput<T> {
  clinicId: string;
  type: string;
  entityType: string;
  entityId: string;
  correlationId: string;
  actorUserId?: string;
  payload: T;
}
```

Schema:

```text
AuditEvent
DomainEventOutbox
```

`AuditEvent` stores canonical JSON digests and structured metadata; it is append-only at application level.

`DomainEventOutbox` fields:

```text
id
clinicId
type
entityType
entityId
payloadJson
correlationId
actorUserId?
occurredAt
publishedAt?
```

- [ ] Write a failing transaction test proving a business update cannot commit without its audit/outbox rows when using the application service helper.
- [ ] Implement `runBusinessTransaction()` helper receiving Prisma transaction client.
- [ ] Verify rollback when an audit insert throws.
- [ ] Verify event payload contains the authoritative entity version.
- [ ] Commit.

---

### Task 4: Build shared API contracts

**Files:**
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/src/common.ts`
- Create: `packages/contracts/src/patients.ts`
- Create: `packages/contracts/src/appointments.ts`
- Create: `packages/contracts/src/index.ts`
- Modify: root workspace package references if needed
- Test: `packages/contracts/src/contracts.test.ts`

**Interfaces:**

Use Zod schemas for:

- `PatientDto`
- `CreatePatientRequest`
- `UpdatePatientRequest`
- `AppointmentDto`
- `CreateAppointmentRequest`
- `UpdateAppointmentRequest`
- `ApiError`
- `Page<T>`

Updates carry:

```ts
expectedVersion: z.number().int().positive()
```

No route may accept unvalidated raw JSON.

- [ ] Write failing parse tests for valid/invalid requests.
- [ ] Implement schemas.
- [ ] Export inferred TS types.
- [ ] Run tests and typecheck.
- [ ] Commit.

---

### Task 5: Modularize Fastify and expose patient/agenda API

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/server.ts`
- Create: `apps/api/src/plugins/db.ts`
- Create: `apps/api/src/plugins/correlation.ts`
- Create: `apps/api/src/modules/patients/routes.ts`
- Create: `apps/api/src/modules/patients/service.ts`
- Create: `apps/api/src/modules/appointments/routes.ts`
- Create: `apps/api/src/modules/appointments/service.ts`
- Test: `apps/api/src/modules/patients/routes.test.ts`
- Test: `apps/api/src/modules/appointments/routes.test.ts`

**Endpoints:**

```text
GET    /api/patients
POST   /api/patients
GET    /api/patients/:id
PATCH  /api/patients/:id

GET    /api/appointments?date=YYYY-MM-DD
POST   /api/appointments
PATCH  /api/appointments/:id
POST   /api/appointments/:id/arrive
POST   /api/appointments/:id/chair
POST   /api/appointments/:id/no-show
POST   /api/appointments/:id/complete
```

Auth is stubbed with a test actor only until Plan 02, but route handlers must already call an injected `getActor()` rather than reading a global user.

- [ ] Write injection tests with `server.inject`.
- [ ] Implement request validation using `@denty/contracts`.
- [ ] Implement service transactions with audit/outbox.
- [ ] Verify stale `expectedVersion` returns 409.
- [ ] Verify appointment arrival preserves `arrivedAt`, chair transition preserves `chairAt`, and no-show cannot silently overwrite completed.
- [ ] Commit.

---

### Task 6: Implement real-time server event stream

**Files:**
- Create: `apps/api/src/realtime/event-bus.ts`
- Create: `apps/api/src/realtime/routes.ts`
- Create: `apps/api/src/realtime/outbox-publisher.ts`
- Test: `apps/api/src/realtime/realtime.test.ts`

**Endpoint:**

```text
GET /api/events
Content-Type: text/event-stream
```

For the SQLite single-server milestone, the publisher polls unpublished outbox rows, publishes them to connected clinic clients, then marks `publishedAt`.

SSE message:

```json
{
  "eventId": "...",
  "entityType": "appointment",
  "entityId": "...",
  "operation": "appointment.arrived",
  "version": 4,
  "occurredAt": "..."
}
```

- [ ] Write a failing test that opens an SSE connection for clinic A, mutates an appointment in clinic A, and receives the event.
- [ ] Write a second test proving clinic B does not receive it.
- [ ] Implement bounded polling with shutdown cleanup.
- [ ] Verify reconnect accepts `Last-Event-ID` and sends missed events from the outbox.
- [ ] Commit.

---

### Task 7: Add idempotent legacy JSON importer

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/db/src/import/legacy-v11-schema.ts`
- Create: `packages/db/src/import/import-legacy-v11.ts`
- Create: `packages/db/src/import/cli.ts`
- Test: `packages/db/src/import/import-legacy-v11.test.ts`

**Models:**

```text
LegacyImportBatch
LegacyIdMap
```

Initial importer covers:

- clinic profile
- sites
- cabinets
- employees/staff
- patients
- shifts
- absences
- appointments

Later plans extend the same importer for clinical, financial, document and laboratory entities.

Command:

```bash
pnpm --filter @denty/db import:legacy --file ./exports/denty-v11.json
```

Rules:

- parse with Zod,
- create one `LegacyImportBatch`,
- map numeric IDs to opaque IDs,
- re-running same source checksum is a no-op,
- do not import `currentUser`, browser session identity or plaintext preview PIN.

- [ ] Write a fixture-based failing import test.
- [ ] Implement import transaction.
- [ ] Run twice and verify row counts do not increase on second run.
- [ ] Commit.

---

### Task 8: Add database health and operational scripts

**Files:**
- Modify: root `package.json`
- Modify: `packages/db/package.json`
- Create: `packages/db/src/health/check.ts`
- Test: `packages/db/src/health/check.test.ts`

Add scripts:

```text
db:generate
db:migrate
db:health
db:import-legacy
```

Health verifies:

- database opens,
- foreign keys enabled,
- WAL mode active for SQLite,
- migrations table accessible,
- write transaction succeeds and rolls back.

- [ ] Write failing health test.
- [ ] Implement health check.
- [ ] Add `/health/db` API endpoint returning no secrets/paths.
- [ ] Verify process restart preserves records.
- [ ] Commit.

---

## Acceptance criteria

- Two independent browser/API clients can update different records without browser shared storage.
- If two clients edit the same appointment version, exactly one succeeds and the other receives 409.
- Reception status changes produce real-time events usable by the dentist agenda.
- Database restart preserves all data.
- Every patient/appointment mutation creates audit and outbox rows.
- Legacy import is idempotent.
- `apps/api/src/server.ts` is only composition/bootstrap, not domain logic.
