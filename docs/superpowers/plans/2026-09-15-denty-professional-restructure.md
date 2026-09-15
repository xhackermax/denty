# Denty Professional Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize Denty from a static preview-style repository into a professional TypeScript monorepo with a new React/Vite app, API workspace, domain packages, and the existing preview preserved as legacy.

**Architecture:** Keep the current working preview intact under `apps/legacy-preview` while creating a new production-grade workspace at `apps/web`, `apps/api`, and `packages/*`. The new app consumes typed domain data from packages and the old preview remains available for regression and comparison.

**Tech Stack:** pnpm workspaces, TypeScript, React, Vite, Vitest, Fastify, Prisma-ready package layout, CSS modules-style app CSS.

**Spec:** `docs/architecture/DENTY-REORGANIZACION.md`

## Global Constraints

- Preserve the current preview as legacy; do not delete functional behavior.
- Root must be clean and professional: workspace config, docs, apps, packages, tests, assets only.
- No secrets in frontend code.
- New product code must be TypeScript.
- Domain logic must live outside UI.
- Tests must live under `tests/` or package-local test folders.
- The first implementation cut must be buildable after installing dependencies.

---

### Task 1: Workspace Shell

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Modify: `README.md`
- Modify: `vercel.json`

**Interfaces:**
- Produces workspace scripts: `dev`, `build`, `test`, `typecheck`, `legacy:build`, `legacy:test`.
- Produces path aliases: `@denty/domain`, `@denty/ui`, `@denty/voice`, `@denty/fixtures`.

- [x] Create workspace manifests.
- [x] Add root scripts for app, packages, and legacy preview.
- [x] Point Vercel to `apps/web`.
- [x] Update README to describe the monorepo.

### Task 2: Preserve Legacy Preview

**Files:**
- Move root preview files into `apps/legacy-preview`.
- Keep docs in root `docs/`.
- Keep root `tests/` for legacy regressions.
- Modify test paths so existing legacy tests still run.

**Interfaces:**
- Produces `apps/legacy-preview/index.html`.
- Produces `apps/legacy-preview/build-static-bundle.mjs`.
- Root legacy tests read from `apps/legacy-preview`.

- [x] Move preview assets and sources.
- [x] Update legacy test helper paths.
- [x] Keep old preview runnable with `pnpm legacy:build`.

### Task 3: Domain Packages

**Files:**
- Create: `packages/domain`
- Create: `packages/fixtures`
- Create: `packages/voice`
- Create: `packages/ui`

**Interfaces:**
- `@denty/domain` exports typed patients, appointments, permissions, documents, and finance summaries.
- `@denty/fixtures` exports `createDemoClinic()`.
- `@denty/voice` exports command intent types and a small local parser contract.
- `@denty/ui` exports basic shell components.

- [x] Add package manifests.
- [x] Add TypeScript source files.
- [x] Add minimal Vitest coverage.

### Task 4: New Web App

**Files:**
- Create: `apps/web`

**Interfaces:**
- React app imports demo data from `@denty/fixtures`.
- App renders operational dashboard, sidebar, patient list, agenda, lab, finance, and consent panels.
- App is a professional first screen, not a landing page.

- [x] Add Vite React app.
- [x] Add routes/layout components.
- [x] Add professional clinical UI.
- [x] Add typecheck/build scripts.

### Task 5: API Workspace

**Files:**
- Create: `apps/api`
- Create: `packages/db`

**Interfaces:**
- API exposes `/health`, `/api/session`, and `/api/clinic-summary`.
- DB package defines Prisma-ready schema location and database client boundary.

- [x] Add Fastify API shell.
- [x] Add package manifests.
- [x] Add health route test boundary.

### Task 6: Verification and Publish

**Files:**
- Modify docs and tests where paths changed.

**Interfaces:**
- Root scripts can run after dependency install.
- Existing legacy static checks still pass where meaningful.

- [x] Validate JSON/package manifests.
- [x] Run available path/static tests without installing dependencies.
- [x] Commit and push.
