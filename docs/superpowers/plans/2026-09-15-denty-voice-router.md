# Denty Voice Router and Quick Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a validated voice command router spanning Denty daily workflows and convert Tareas into a functional quick-action launcher.

**Architecture:** A new `voice-router.js` owns parsing, command validation, and deterministic execution against the existing Denty database model. `app.js` handles UI/context/persistence and optional AI fallback; `server.py` provides provider adapters for local Ollama, OpenAI-compatible endpoints, and MCP HTTP interpretation without exposing secrets to the browser.

**Tech Stack:** Vanilla ES modules, browser Web Speech API, Python stdlib HTTP server/urllib, SQLite, Node verification scripts.

**Spec:** `docs/superpowers/specs/2026-09-15-denty-voice-router-design.md`

## Global Constraints
- Preserve `DB_KEY = denty_web_vercel_preview_1_3_3_settings_panels` so existing browser data remains readable.
- Local deterministic parsing runs before every external AI fallback.
- External AI may return structured commands only; it never writes Denty data itself.
- Do not place API keys in browser code or localStorage.
- Existing modern verification suites must remain green.

---

### Task 1: Voice Router Core
**Files:**
- Create: `voice-router.js`
- Create: `verify_voice_router.mjs`
- Modify: `logic.js`

**Interfaces:**
- Produces `parseVoiceCommand(text, context)`, `validateStructuredCommand(command)`, `executeVoiceCommand(db, command, context)`.
- Uses existing odontogram, patient, catalog, appointment and database helpers from `logic.js`.

- [ ] Write failing tests covering patient selection/creation, odontogram performed-vs-indicated-vs-repeat states, periodontal update, appointment parsing, comments/alerts, budget, payment, lab receive, and navigation.
- [ ] Run `node verify_voice_router.mjs` and verify failures are due to missing router behavior.
- [ ] Implement deterministic parser, schema validation, date/time helpers, and executor.
- [ ] Run `node verify_voice_router.mjs` and verify all router tests pass.

### Task 2: App Voice Integration
**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Create: `verify_voice_ui.mjs`

**Interfaces:**
- Consumes router functions from Task 1.
- Produces async `runCommand`, AI fallback, command readback, and a persistent/floating voice entry point.

- [ ] Write failing UI/source tests for router imports, microphone integration, AI fallback, and voice settings/status.
- [ ] Run `node verify_voice_ui.mjs` and confirm failure.
- [ ] Replace broken `applyDentalCommand` call path with Voice Router and add graceful external fallback.
- [ ] Upgrade assistant UI with active-patient context, examples, provider status, and voice readback controls.
- [ ] Run `node verify_voice_ui.mjs` and existing modern UI verifications.

### Task 3: Quick Tasks and Dead Button Repair
**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`
- Create: `verify_quick_tasks.mjs`

**Interfaces:**
- Produces `openQuickTaskModal`, `renderTasks`, globally usable payment/work modals, and task completion handlers.

- [ ] Write failing tests proving `[data-open-task]` is bound and the four requested quick actions exist.
- [ ] Run `node verify_quick_tasks.mjs` and confirm failure.
- [ ] Add `quickTaskModal` and bind the home Tarea button.
- [ ] Implement the Tareas page and action launcher.
- [ ] Make payment and laboratory dialogs support global patient selection.
- [ ] Run quick-task tests and modern verification suites.

### Task 4: Local/Online LLM and MCP Server Adapters
**Files:**
- Modify: `server.py`
- Create: `verify_ai_server.py`

**Interfaces:**
- Produces `GET /api/ai/status`, `POST /api/ai/interpret`, `POST /api/mcp/interpret`.
- Uses environment variables `DENTY_AI_PROVIDER`, `DENTY_AI_URL`, `DENTY_AI_MODEL`, `DENTY_AI_API_KEY`, `DENTY_MCP_URL`, `DENTY_MCP_TOKEN`.

- [ ] Write failing Python unit tests for provider config, JSON extraction/schema filtering, disabled-provider behavior, and adapter request construction.
- [ ] Run `python -m unittest verify_ai_server.py` and confirm failure.
- [ ] Implement stdlib provider helpers with timeouts and strict allowed-intent validation.
- [ ] Expose endpoints while preserving sync endpoints.
- [ ] Run server tests.

### Task 5: Settings, Regression Verification, and Packaging
**Files:**
- Modify: `logic.js`
- Modify: `app.js`
- Modify: `README.md`

**Interfaces:**
- Adds migrated `db.settings.voice` defaults without changing storage key.

- [ ] Write/extend tests for migration preserving old data while adding voice defaults.
- [ ] Implement settings panel controls and documentation for local server/Ollama/OpenAI-compatible/MCP environment configuration.
- [ ] Run `verify_voice_router.mjs`, `verify_voice_ui.mjs`, `verify_quick_tasks.mjs`, `verify_ai_server.py`, and all modern baseline suites.
- [ ] Run a static scan for literal buttons/IDs that have no binding and repair relevant dead controls found in touched workflows.
- [ ] Package the completed project as `/mnt/data/Denty-Web-Vercel-Preview-1.4-voice.zip`.
