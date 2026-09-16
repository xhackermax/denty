# Security, Backup and Audit Production Hardening Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the server deployable in a real clinic with protected secrets, durable backups, tested restore, tamper-evident audit, device/session control and a safe privacy-request workflow.

**Architecture:** Security is layered: authenticated server API, encrypted transport, least privilege, append-only/tamper-evident audit, encrypted backups, restore verification and controlled data export/restriction. Do not promise absolute tamper-proofing; detect unauthorized modification and retain evidence.

**Spec:** `docs/superpowers/specs/2026-09-16-denty-production-platform-design.md`

### Task 1: Secrets and configuration

Create typed environment config. Secrets never appear in API responses/logs.

Required production secrets include:

```text
SESSION_SECRET
AUDIT_HMAC_KEY
BACKUP_MASTER_KEY
payment/provider secrets
AEAT credentials when configured
AI provider credentials
```

- [ ] Config validation tests.
- [ ] Fail startup if required production secret missing.
- [ ] Commit.

### Task 2: Security HTTP baseline

Add:

- secure headers,
- cookie flags,
- request size limits,
- auth rate limits,
- explicit allowed origins for remote deployment,
- correlation IDs,
- log redaction for authorization/cookies/clinical payloads.

- [ ] Injection tests.
- [ ] Commit.

### Task 3: Tamper-evident audit chain

Extend `AuditEvent`:

```text
sequence
previousHash
eventHash
```

`eventHash = HMAC(serverKey, canonicalEvent + previousHash)`.

Provide verification command:

```bash
pnpm audit:verify
```

- [ ] Test deleting/modifying middle event makes verification fail.
- [ ] Commit.

### Task 4: Encrypted automatic backups

For SQLite milestone:

1. create consistent DB snapshot using a tested SQLite-safe snapshot method,
2. package manifest + DB + attachment index,
3. encrypt archive using AES-256-GCM with key derived from `BACKUP_MASTER_KEY`,
4. write to configured backup destination,
5. record `BackupRun`.

Schedule daily backup and keep configurable retention generations.

- [ ] Backup/restore integration test with sample clinic.
- [ ] Verify wrong key cannot restore.
- [ ] Commit.

### Task 5: Restore command and drill

Command:

```bash
pnpm backup:restore --file <backup> --target <empty-data-dir>
```

Restore never overwrites live DB in place. It restores to a target, runs migration/health checks and prints a cutover instruction.

- [ ] Automated monthly restore-verification job in local server scheduler.
- [ ] Commit.

### Task 6: Device/session management

Admin screen shows active sessions:

```text
user
device label
last seen
created
expires
```

Actions:

- revoke one,
- revoke all user sessions,
- mark trusted clinic device if policy uses PIN login.

- [ ] Tests.
- [ ] Commit.

### Task 7: Attachment security

Validate MIME/signature, size and extension. Generate opaque storage names. Never serve arbitrary filesystem paths. Downloads require authorization and use `Content-Disposition`.

- [ ] Path traversal tests.
- [ ] Commit.

### Task 8: Privacy/data-rights workflow

Add `PrivacyRequest`:

```text
type: ACCESS | EXPORT | RECTIFICATION | RESTRICTION | ERASURE_REQUEST
status
requester
patientId
receivedAt
resolvedAt
resolution
legalHoldReason?
```

No generic hard-delete button for clinical history. Resolution may export data, correct demographics through audited edits, restrict access, or retain records where legal retention applies.

- [ ] Tests proving erasure request does not cascade-delete signed docs/clinical records automatically.
- [ ] Commit.

### Task 9: Export package

Authorized export produces:

- patient demographics,
- clinical history,
- appointments,
- documents,
- financial records within authorized scope,
- file manifest.

Package generation is audited.

- [ ] Export fixture test.
- [ ] Commit.

### Task 10: Production readiness gate

Create `docs/qa/PRODUCTION-READINESS.md` requiring evidence for:

```text
backup successful
restore successful
audit verification successful
session revocation tested
role matrix tested
TLS deployment documented
database permissions documented
incident contact/runbook documented
```

- [ ] Add `pnpm production:check`.
- [ ] Commit.

## Acceptance criteria

- Daily encrypted backup can be restored and health-checked.
- Audit chain verification detects modified history.
- Sessions can be revoked immediately.
- Logs redact credentials and sensitive payloads.
- Privacy requests are controlled workflows, not destructive shortcuts.
