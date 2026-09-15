# Denty Terminal Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real terminal payment orchestration to Denty with SumUp Solo, a local mock sandbox, payment lifecycle tracking, and admin configuration.

**Architecture:** `server.py` becomes the credential-holding payment gateway and exposes provider-neutral endpoints. The browser initiates card checkouts through that gateway, polls provider state, and records a payment as paid only after confirmed success. Existing manual payment methods remain local and immediate.

**Tech Stack:** Vanilla JavaScript ES modules, Python 3 standard library HTTP server, SQLite state server, SumUp REST Cloud API.

**Spec:** `docs/superpowers/specs/2026-09-15-denty-terminal-payments-design.md`

## Global Constraints
- Never expose SumUp API or affiliate keys to browser JavaScript.
- Never store PAN, CVV or raw card details.
- Only a provider-confirmed successful checkout counts as paid.
- Preserve all 1.5 data through migration.
- Maintain manual cash, transfer and financing flows.

---

### Task 1: Payment state model
**Files:** `logic.js`, `verify_payments_model.mjs`
**Interfaces:** produces migrated payment lifecycle fields and paid-total filtering.
- [ ] Write tests for migration defaults and success-only budget totals.
- [ ] Run tests and verify RED.
- [ ] Add `settings.payments`, normalize legacy payments, and export a helper that identifies settled payments.
- [ ] Run tests and verify GREEN.

### Task 2: Server payment gateway
**Files:** `server.py`, `verify_payment_server.py`
**Interfaces:** produces `/api/payments/status`, `/readers`, `/readers/pair`, `/checkout`, `/terminate` and checkout lookup.
- [ ] Write fake-opener tests for SumUp request paths, auth headers, payload cents, and state mapping; write mock-provider tests.
- [ ] Run tests and verify RED.
- [ ] Implement provider configuration, SumUp adapter and mock adapter using Python stdlib only.
- [ ] Run tests and verify GREEN.

### Task 3: Terminal checkout UI
**Files:** `app.js`, `styles.css`, `verify_terminal_payment_ui.mjs`
**Interfaces:** card method starts checkout and polls status; manual methods stay local.
- [ ] Write static/behavior contract tests for terminal UI and status-aware paid calculations.
- [ ] Run tests and verify RED.
- [ ] Replace manual-only card submit with asynchronous terminal workflow and visible payment state.
- [ ] Run tests and verify GREEN.

### Task 4: Datáfono settings
**Files:** `app.js`, `styles.css`, `verify_terminal_settings.mjs`
**Interfaces:** settings panel `payments`, reader pairing, refresh and site reader defaults.
- [ ] Write contract tests for settings navigation, pairing inputs and reader assignment controls.
- [ ] Run tests and verify RED.
- [ ] Implement Pagos y datáfonos administration.
- [ ] Run tests and verify GREEN.

### Task 5: Documentation and regression
**Files:** `README.md`, all verification scripts.
**Interfaces:** documents environment variables, sandbox and Solo prerequisites.
- [ ] Add SumUp and mock setup documentation.
- [ ] Run payment tests, modern regression tests, JS syntax checks and Python compilation.
- [ ] Package ZIP, extract it to a clean folder, rerun payment-critical tests against packaged content.
