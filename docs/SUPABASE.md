# Supabase Setup

## Project

- Organization: Denty
- Project: denty
- Project ref: owojtdzhlrixicguefjb
- Region: Central EU, Frankfurt
- Database: Supabase Postgres

## Current State

The Denty Prisma model was deployed to Supabase Postgres from a temporary Postgres-compatible Prisma schema. The repo's default Prisma schema still uses SQLite for local tests, so local development is not broken while the Supabase deployment path is finalized.

Verification on 2026-09-16:

- Public tables: 59
- Tables with Row Level Security enabled: 59
- Tables missing RLS: 0

## Security

RLS is required for Denty because the system handles patient, clinical, appointment, document, and financial data. New tables should not be exposed automatically through the Data API without explicit access policies.

Do not commit:

- Database passwords
- Supabase service role keys
- JWT secrets
- Real patient data

Use `.env.example` as a template and store real values in `.env.local` or the deployment secret manager.

## Next Steps

## Repeatable Workflow

Use these commands with `DATABASE_URL` set locally or in a deployment secret manager:

```bash
pnpm supabase:schema
pnpm supabase:deploy
pnpm supabase:rls:verify
```

`supabase:schema` creates a generated Postgres Prisma schema from the local SQLite-compatible schema. `supabase:deploy` validates that generated schema, pushes it to Supabase, and enables RLS on public tables. `supabase:rls:verify` fails if any public table is missing RLS.

## Next Steps

1. Define role-based RLS policies for admin, clinic staff, and patient portal access.
2. Move local preview data into controlled seed scripts for non-production environments.
3. Connect the API deployment to `DATABASE_URL` through environment secrets.
