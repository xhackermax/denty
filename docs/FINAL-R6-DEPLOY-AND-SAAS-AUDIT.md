# Denty V3 R6 - deploy and SaaS audit

## Deployment

The Vercel deploy path is intentionally separated from the full quality CI suite.

`vercel-build` now runs:

1. historical regression gate
2. pipeline self-check
3. Denty Games byte integrity
4. flat deployable package validation
5. API parity
6. BFF policy
7. Vercel regression matrix
8. domain smoke
9. architecture boundary check
10. `next build`

## Supabase link

The Vercel project must define these environment variables:

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` for server-only checks, or `NEXT_PUBLIC_SUPABASE_ANON_KEY` for a read-only connectivity check
- `DENTY_API_URL` when the external Denty API backend is available
- `NEXT_PUBLIC_DEMO_MODE=false`
- `NEXT_PUBLIC_DENTY_REALTIME=false` until realtime subscriptions are enabled

The server-only endpoint `/api/health/supabase` validates the Supabase REST gateway without caching and never returns configured keys.

Formatting, ESLint, Stylelint, TypeScript, Vitest, coverage and Playwright remain part of `npm run ci`. Vercel does not auto-format or auto-fix source.

## SaaS foundation

`src/domain/tenancy` introduces organization / clinic scope, organization memberships, subscription plans and feature entitlements. Persistent backend records must eventually carry `organization_id` and, when location-specific, `clinic_id`, with database RLS enforcing tenant isolation.

## Lockfile status

The deploy branch includes a root `package-lock.json` generated with Node 24/npm. Vercel install now uses plain `npm ci`; the previous temporary lock bootstrap is no longer needed for this branch.
