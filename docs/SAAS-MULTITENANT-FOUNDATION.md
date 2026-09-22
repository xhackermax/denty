# Denty SaaS multi-tenant foundation

Denty V3 is prepared to evolve from an internal clinic application into a SaaS product for independent dental organizations.

## Isolation model

Every persistent clinical or administrative record in the future backend must be scoped by `organization_id`; records that belong to a particular location additionally use `clinic_id`. This applies to patients, appointments, odontograms, plans, budgets, invoices, payments, documents, prescriptions, laboratory cases, audit records, staff and tasks.

The frontend domain now exposes `TenantScope`, organization memberships, subscription plans and feature entitlements under `src/domain/tenancy`. These definitions are deliberately backend-agnostic so Supabase/Postgres RLS can enforce the same boundaries later.

## Product model

One codebase supports multiple organizations through entitlements / feature flags rather than forks. The initial plans are `BASIC`, `PROFESSIONAL` and `MULTICLINIC`.

## Deployment rule

Vercel deployment and full quality CI are separate concerns. `vercel-build` runs structural regression checks, architecture checks and the production Next build. `npm run ci` remains the strict quality suite and includes formatting, ESLint, Stylelint, TypeScript, Vitest/coverage and package verification. Vercel never auto-formats source.

## Remaining lockfile constraint

Until a real Node 24 registry-resolved `package-lock.json` is committed at repository root, `vercel-install` retains the documented temporary lock bootstrap. Once the lock is captured, switch `vercel.json` to `installCommand: "npm ci"` and remove the bootstrap/capture stages.
