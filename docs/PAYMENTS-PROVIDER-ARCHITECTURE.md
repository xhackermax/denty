# Denty — Payment Provider Architecture

Denty supports three in-person payment modes without coupling the clinical app to a bank:

1. `manual`: the clinic keeps its existing bank terminal. Staff enters the amount on the bank terminal and then records the result in Denty.
2. `sumup`: Denty starts a transaction on a configured SumUp reader and polls/receives the final result.
3. `stripe`: Denty creates a Stripe Terminal PaymentIntent and hands it to a configured Stripe reader.

## Product rule

The payment domain only knows `provider`, `status`, `provider_transaction_id`, `clinic_id`, `patient_id` and `amount_cents`. It must not know the acquiring bank.

## Per-clinic configuration

`clinic_payment_settings` controls which providers appear for a clinic. Non-secret identifiers can be stored there:

- SumUp merchant code + reader ID
- Stripe connected account ID
- default provider
- enabled providers

API keys/secrets remain server-side (`SUMUP_API_KEY`, `STRIPE_SECRET_KEY`) or should be moved to a secret manager before multi-tenant production.

## Routes

- `POST /api/denty/payments/manual`
- `POST /api/denty/payments/sumup/checkout`
- `POST /api/denty/payments/stripe/terminal`
- `GET /api/denty/payments/stripe/status?paymentIntentId=...`

The UI should call the provider-specific route through a single adapter and then persist the normalized payment result into `payments`.

## Stripe Terminal

The Stripe implementation uses a PaymentIntent with `card_present` and hands it to a Terminal Reader. The final status must be checked before marking a payment as completed. Stripe documents `process_payment_intent` as the server-side handoff to a reader.

## SumUp

The implementation uses SumUp's Cloud API for paired readers. SumUp documents reader checkout as asynchronous, so the initial response means the checkout was accepted, not that the payment succeeded. The final state must be retrieved or received through the configured callback.
