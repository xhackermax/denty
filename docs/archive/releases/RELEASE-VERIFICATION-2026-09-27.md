# Denty release verification — 2026-09-27

## Implemented in this package

- Node production target remains `24.x` across package.json, `.nvmrc` and `.node-version`.
- Added a dependency-free Node 24 release configuration gate.
- Added Supabase P0 schema for Auth-linked profiles, clinic memberships, role/staff type, permissions and patient accounts.
- Added reception/attendance timestamps, appointment status events and appointment replacement relationships.
- Added patient notifications foundation for no-show/rescheduling flows.
- Extended the document model for storage metadata, checksum and version chains; added export audit records.
- Added patient payment history foundation with paid timestamp, method, provider and transaction reference.
- Added clinic/patient isolation helpers and RLS policies for new P0 tables.
- Embedded the current Denty Master Spec under `docs/specs/`.

## Fresh verification executed in the assembly environment

PASS:

- `node scripts/verify-node24-release.mjs`
- `node scripts/verify-p0-schema.mjs`
- `node scripts/verify-deployable-package.mjs`
- `node scripts/verify-vercel-regression-matrix.mjs` (0 warnings)
- `node scripts/verify-history-regressions.mjs`
- `node scripts/pipeline/self-check.mjs`

NOT EXECUTABLE IN THIS ASSEMBLY ENVIRONMENT:

- `npm ci`, Vitest, typecheck, lint, Next production build and domain smoke requiring npm dependencies.
- Reason: the sandbox runtime is Node 22.16.0 and has no installed `node_modules`; external Node/npm downloads are unavailable here.

## Mandatory promotion gate

Before production promotion, run under Node 24:

```bash
node -v
npm ci
npm run node24:check
npm run p0:schema
npm run ci
node scripts/pipeline/run.mjs vercel-build
```

Do not treat the release as production-certified unless those commands exit successfully under Node 24.

## Stripe SDK

Stripe Terminal is implemented through the official `stripe` Node SDK (`22.6.2`), encapsulated in `src/server/payments/stripe-client.ts`. The application-facing payment-provider layer does not depend directly on Stripe internals.
