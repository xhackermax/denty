# Authentication and Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace account-selector preview identities with real server sessions, secure credentials and role/scope enforcement for administrator, reception/secretary, dentist and patient.

**Architecture:** Users authenticate to Fastify. Staff and patient identities share a `User` table but receive different scoped memberships. Credentials are hashed with Argon2id. Browser sessions use opaque random tokens stored only as hashed values server-side and delivered in HttpOnly cookies. Permissions are evaluated server-side from `ActorContext`.

**Tech Stack:** Fastify, `@fastify/cookie`, `@fastify/rate-limit`, `argon2`, Zod, Prisma, Next.js.

**Spec:** `docs/superpowers/specs/2026-09-16-denty-production-platform-design.md`

## Role model

Canonical roles:

```ts
type Role =
  | "ADMIN"
  | "RECEPTION"
  | "DENTIST"
  | "ASSISTANT"
  | "PATIENT";
```

Legacy aliases `secretary` and `secretaria` migrate to `RECEPTION`.

Permissions are granular strings, including:

```text
patients.read
patients.write_demographics
clinical.read
clinical.write
agenda.read.all
agenda.read.own
agenda.write
finance.read
finance.write
documents.read
documents.write
lab.read
lab.write
settings.manage
users.manage
audit.read
analysis.read
patient.self
```

Dentists receive `agenda.read.own`; administrator and reception receive `agenda.read.all`.

---

### Task 1: Extend database identity schema

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Test: `packages/db/src/auth/auth-schema.test.ts`

Add:

```text
User
StaffProfile.userId?
PatientAccessGrant
UserCredential
Session
PasswordResetToken
LoginAttempt
```

`UserCredential` stores `passwordHash` or `pinHash`, never plaintext. `Session` stores only a SHA-256 hash of the opaque session token.

- [ ] Write a failing schema/repository test.
- [ ] Add models and migration.
- [ ] Verify a patient user may have access to one or more patient records through `PatientAccessGrant`.
- [ ] Commit.

---

### Task 2: Move roles/permissions into `packages/domain`

**Files:**
- Replace relevant portions of: `packages/domain/src/index.ts`
- Create: `packages/domain/src/permissions/types.ts`
- Create: `packages/domain/src/permissions/policy.ts`
- Test: `packages/domain/src/permissions/policy.test.ts`

**Interface:**

```ts
export function permissionsForRole(role: Role): Permission[];
export function can(actor: ActorContext, permission: Permission): boolean;
export function canAccessAppointment(actor: ActorContext, appointment: { staffId: string }): boolean;
```

Rules:

- `ADMIN`: all clinic permissions.
- `RECEPTION`: all agenda, demographics, payment collection, permitted administrative documents; no clinical-plan approval.
- `DENTIST`: clinical write, documents, finance read/write as configured, own agenda only by default.
- `ASSISTANT`: configurable restricted clinical/agenda operations.
- `PATIENT`: only resources reachable through active `PatientAccessGrant`.

- [ ] Write failing policy matrix tests.
- [ ] Implement.
- [ ] Remove the old `admin | operational` type after all compile errors are updated in the same task.
- [ ] Commit.

---

### Task 3: Implement password/PIN credential service

**Files:**
- Create: `apps/api/src/auth/credentials.ts`
- Test: `apps/api/src/auth/credentials.test.ts`

**Interface:**

```ts
hashPassword(secret: string): Promise<string>
verifyPassword(hash: string, secret: string): Promise<boolean>
```

Use Argon2id with library defaults reviewed at implementation time; enforce minimum password length of 10 for remote accounts. Staff PIN is allowed only for clinic-local staff login and must be at least 6 digits in production mode.

- [ ] Test that plaintext never persists.
- [ ] Test correct/incorrect verification.
- [ ] Test malformed hash fails closed.
- [ ] Commit.

---

### Task 4: Implement opaque session service

**Files:**
- Create: `apps/api/src/auth/sessions.ts`
- Create: `apps/api/src/auth/cookies.ts`
- Test: `apps/api/src/auth/sessions.test.ts`

Generate 32 random bytes. Send base64url token in cookie:

```text
denty_session
HttpOnly
Secure in production
SameSite=Lax
Path=/
```

Persist only `sha256(token)`.

Session fields include:

```text
userId
clinicId
expiresAt
lastSeenAt
revokedAt?
deviceLabel?
ipHash?
userAgentHash?
```

- [ ] Test session creation, lookup, expiry and revocation.
- [ ] Test DB leak does not expose usable raw tokens.
- [ ] Commit.

---

### Task 5: Implement login/logout/session endpoints

**Files:**
- Create: `apps/api/src/auth/routes.ts`
- Modify: `apps/api/src/server.ts`
- Create: `packages/contracts/src/auth.ts`
- Test: `apps/api/src/auth/routes.test.ts`

Endpoints:

```text
POST /api/auth/login
POST /api/auth/pin-login
POST /api/auth/logout
GET  /api/auth/session
POST /api/auth/change-password
```

All login failures return a generic invalid-credentials response. Add rate limiting by user identifier + IP bucket.

- [ ] Write failing route tests.
- [ ] Implement.
- [ ] Verify logout revokes session and clears cookie.
- [ ] Verify disabled user cannot login.
- [ ] Commit.

---

### Task 6: Add authentication/authorization Fastify hooks

**Files:**
- Create: `apps/api/src/auth/actor.ts`
- Create: `apps/api/src/auth/require-permission.ts`
- Modify: patient and appointment API modules
- Test: `apps/api/src/auth/authorization.test.ts`

**Interfaces:**

```ts
getActor(request): Promise<ActorContext>
requirePermission(permission: Permission)
requirePatientScope(patientIdParam: string)
```

- [ ] Test unauthenticated → 401.
- [ ] Test receptionist can read all agenda.
- [ ] Test dentist can read only own agenda unless explicitly granted all-agenda permission.
- [ ] Test patient cannot query another patient's ID.
- [ ] Test admin-only user management.
- [ ] Commit.

---

### Task 7: Build native login UI

**Files:**
- Create: `apps/web/src/app/login/page.tsx`
- Create: `apps/web/src/features/auth/LoginForm.tsx`
- Create: `apps/web/src/features/auth/session.ts`
- Create: `apps/web/src/features/auth/use-session.ts`
- Test: `apps/web/src/features/auth/LoginForm.test.tsx`

UI supports:

- staff email/username + password,
- optional local staff PIN mode,
- clear error without revealing account existence,
- logout menu action.

Remove the V11 gateway from the production route after native shell cutover; keep it only under `/legacy`.

- [ ] Write failing UI tests.
- [ ] Implement API client and session query.
- [ ] Verify redirects by role.
- [ ] Commit.

---

### Task 8: User administration and staff linking

**Files:**
- Create: `apps/api/src/modules/users/routes.ts`
- Create: `apps/web/src/features/users/*`
- Test: API and component tests

Administrator can:

- create user,
- assign canonical role,
- link dentist account to `StaffProfile`,
- disable/re-enable account,
- force credential reset,
- revoke sessions.

This replaces `employee_id` stored in preview users with a real relational link.

- [ ] Test dentist cannot be saved without a staff link when own-agenda scoping is enabled.
- [ ] Test disabled account sessions are revoked.
- [ ] Commit.

---

## Acceptance criteria

- No production login uses the preview `admin_pin_hash`.
- Password/PIN hashes are server-side only.
- Doctor sees only his/her own agenda by default.
- Reception and admin can see all agendas.
- Patient data scope is enforced by API, not client filtering.
- Logout and session revocation work across devices.
- All auth-sensitive mutations create audit events.
