# Archived migration drafts

These three migrations were early, partial migration drafts created while the production schema was still being expanded. They cover only a subset of the current models and are **not deployable migration history**. For example, the archived `AuditEvent` draft predates the audit-chain `previousHash` and `eventHash` fields.

They are preserved here only for provenance. Before first production deployment, generate the canonical baseline from the complete current Prisma schema with the pinned Prisma CLI:

```bash
pnpm db:generate
pnpm --filter @denty/db db:baseline
pnpm db:migrations:check
```

Do not move these drafts back into `prisma/migrations`.
