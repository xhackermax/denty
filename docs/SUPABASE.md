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

1. Add a permanent Postgres/Supabase migration workflow.
2. Define role-based RLS policies for admin, clinic staff, and patient portal access.
3. Move local preview data into controlled seed scripts for non-production environments.
4. Connect the API deployment to `DATABASE_URL` through environment secrets.

