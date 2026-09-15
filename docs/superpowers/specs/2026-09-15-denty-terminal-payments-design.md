# Denty Terminal Payments Design

## Goal
Turn Denty's manual payment registration into a real point-of-sale workflow that can initiate and track a physical card payment while keeping cash, transfer, financing and manual registration available.

## Architecture
The browser never talks to SumUp directly. `server.py` owns provider credentials and exposes a provider-neutral `/api/payments/*` surface. SumUp Solo Cloud API is the first provider. The browser stores only local business references and non-sensitive transaction metadata after the backend confirms the provider state.

A card payment moves through `pending -> sent_to_terminal -> awaiting_customer -> paid|failed|cancelled|error`. Only provider `successful` is converted into Denty `paid` and included in budget paid totals. Manual methods are recorded as paid immediately.

## Backend API
- `GET /api/payments/status`: public payment provider readiness, merchant code masked, mode and configured capability.
- `GET /api/payments/readers`: list paired readers and, where available, status.
- `POST /api/payments/readers/pair`: pair a reader with `pairing_code` and `name`.
- `POST /api/payments/checkout`: create a reader checkout from cents, currency, reader id, description and Denty transaction id.
- `GET /api/payments/checkout?reader_id=...&checkout_id=...`: retrieve checkout state.
- `POST /api/payments/terminate`: terminate current checkout on a reader.

The provider adapter supports `off`, `sumup` and `mock`. `mock` is a local deterministic sandbox for end-to-end Denty testing without a physical reader. `sumup` uses `SUMUP_API_KEY`, `SUMUP_MERCHANT_CODE`, `SUMUP_AFFILIATE_KEY`, and `SUMUP_APP_ID` only on the server.

## Frontend
`openPaymentModal()` becomes a two-path checkout. Card uses a paired reader and initiates a terminal transaction. Other methods remain manual. Card transactions are inserted locally in pending state before network initiation, updated with provider ids after acceptance, polled until terminal state, and only then become paid.

Settings gains `Pagos y datáfonos`, with provider status, default reader per site, reader list, status refresh, and pairing form. Credentials are never editable or displayed in the browser.

## Data Model
Payment fields: `id`, `patient_id`, `budget_id`, `amount`, `currency`, `method`, `concept`, `status`, `provider`, `reader_id`, `checkout_id`, `client_transaction_id`, `site_id`, `created_at`, `completed_at`, `failure_reason`.

Settings fields: `settings.payments = {provider, currency, default_reader_id, reader_by_site}`. The provider field is informational from the server; credentials remain environment-only.

## Safety and Error Handling
- Amount is converted to integer cents and validated positive.
- Duplicate local payments are prevented by a unique Denty transaction id.
- Budget paid calculations include only payments with status `paid` or legacy records with no status.
- Network/provider errors never mark a payment as paid.
- A failed/cancelled attempt remains in history for audit but does not reduce budget balance.
- Secrets and raw card data are never stored in Denty browser state.
