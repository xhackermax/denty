# Supabase: runtime corrections, 2026-10-01

Project: `awdqomgbxygtflkwggqb` (Denty).

## Changes applied

- Eight business RPCs used SQLSTATE `40001` for stale versions. PostgREST 14.5 retried these indefinitely, generating over 4.4 million errors in 24 hours. The migration replaces only that SQLSTATE with `PT409`, preserving function bodies, authorization, signatures and grants.
- Patient SELECT RLS previously executed a correlated permission function once per patient. Two private helpers now calculate the current JWT user's staff clinic IDs and owned patient IDs once per query. Ownership still requires an active account and matching patient/clinic pair.
- Added covering indexes for `clinic_contacts.created_by` and `payment_terminals.site_id`.
- Validated 17 existing public constraints after confirming zero violating rows. No patient or business records were changed.
- Replaced the old contacts SQL test: it lacked a valid clinic membership and committed unscoped cleanup deletes. The replacement raises on failures, uses authenticated RPCs and always rolls back.

## Verification

- Reproduced the task regression before the correction: expected `PT409`, received `40001`.
- Live SQL tests passed for stale task versions, unauthorized task changes, contact CRUD, contact stale versions and outsider reads.
- Live RLS tests passed for staff, another clinic, an unrelated identity, patient ownership and inactive patient accounts. All test fixtures rolled back.
- The same authenticated patient scan returned 5,761 rows: 1,079 ms before versus 70 ms after; staff membership checks fell from 5,761 to one.
- Zero stuck task backends and zero remaining business `40001` functions after the correction.
- Post-fix logs checked from 09:55 UTC: no `40001` or `57014` entries observed in the available window.
- All 84 public tables still have RLS; no public SECURITY DEFINER function is executable by `anon`.
- All 37 local migration versions match the applied remote history.
- Application checks passed: 994 tests in 118 files, TypeScript, ESLint, production build and stages 1–13.

The SQL regression files require a seeded Denty database. Run them through Supabase SQL/MCP or `psql` with `ON_ERROR_STOP=1`; they end in `ROLLBACK`.

## Remaining notices and limitations

- Leaked-password protection remains disabled. The connected tools cannot update Auth configuration and the CLI has no Management API credential. Enable it in Supabase Auth settings using an authorized dashboard/management connection.
- 78 authenticated SECURITY DEFINER notices remain. These RPCs deliberately write through privileged functions and enforce clinic/permission checks; the two delegating wrappers call guarded RPCs. Revoking them or changing all to INVOKER would break the application. No anonymous execution grant was found.
- `legacy_identity_map` has RLS and no policies, with no grants for `anon` or `authenticated`; its denial is intentional.
- Unused-index notices are informational and do not justify dropping protective/foreign-key indexes based on this short usage window.
- After explicit user approval, migration `20261001100659` consolidated 49 policies across 23 tables into one policy per operation. All 26 multiple-permissive-policy warnings disappeared. The migration aborts if the existing policies differ from the reviewed snapshot. Before/after SELECT checks matched for 138 actor/table combinations; live regression tests also compared INSERT/UPDATE/DELETE predicates with the original policies for six actor profiles. All fixture changes rolled back.
- Auth's historical token HTTP 400 is not evidence of an outage; no successful interactive login was tested without account credentials.
