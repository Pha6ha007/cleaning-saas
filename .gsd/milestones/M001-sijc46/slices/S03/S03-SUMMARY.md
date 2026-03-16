---
id: S03
milestone: M001-sijc46
provides:
  - PaddleSubscription model (one per company, tracks subscription state)
  - PaddleWebhookEvent model (audit log, idempotency key store, raw payload)
  - POST /api/paddle/webhook/ — unauthenticated, signature-verified, idempotent
  - GET /api/billing/subscription/ — authenticated, returns current subscription data
  - Subscription state transitions: activated/resumed → PLAN_ACTIVE; canceled/past_due/paused → PLAN_BLOCKED
  - Idempotent: duplicate event_id returns 200 immediately, no re-processing
  - Ordering-safe: stale events (older occurred_at) are skipped, not applied
  - Raw payload persistence on every event
  - paddle-python-sdk 1.13.0 installed, PADDLE_* env vars in settings.py
  - 18 S03 tests + 38 prior tests = 56 total passing
requires:
  - slice: S01
    provides: Auth pipeline
  - slice: S02
    provides: JWT-aware API client (frontend consuming billing endpoint in S04)
affects: [S04, S05]
key_files:
  - backend/apps/accounts/models.py (PaddleSubscription, PaddleWebhookEvent added)
  - backend/apps/accounts/migrations/0009_paddle_models.py
  - backend/apps/api/views_paddle.py (PaddleWebhookView, BillingSubscriptionView)
  - backend/config/urls.py (paddle-webhook, billing-subscription routes)
  - backend/config/settings.py (PADDLE_* env vars)
  - backend/requirements.txt (paddle-python-sdk==1.13.0)
  - backend/tests/test_s03_paddle_webhook.py (18 tests)
key_decisions:
  - "paddle-python-sdk Verifier.verify() returns bool, not raises — must check return value"
  - "Bad-sig test uses current ts with wrong HMAC (not ancient ts) — avoids time-drift short-circuit"
  - "Ordering guard: sub.updated_at vs occurred_at — auto_now=True on updated_at provides accurate last-write time"
  - "New subscriptions without a matching company → skipped (MVP: no customer email matching yet)"
patterns_established:
  - "Webhook always returns 200 for recognized events; 403 only for bad signatures"
  - "PaddleWebhookEvent persisted before handler runs — audit trail even for failures"
  - "Status lifecycle: pending → processed | skipped | failed"
  - "_find_company_for_subscription() — company lookup via PaddleSubscription.paddle_subscription_id"
drill_down_paths:
  - .gsd/milestones/M001-sijc46/slices/S03/S03-PLAN.md
  - backend/tests/test_s03_paddle_webhook.py
  - backend/apps/api/views_paddle.py
duration: ~60min
verification_result: pass
completed_at: 2026-03-17T01:15:00Z
---

# S03: Paddle Billing Backend

**Paddle webhook processing operational — signature verification, idempotency, ordering, plan state sync, raw payload persistence. 56/56 tests passing.**

## What Happened

**Models:** Added `PaddleSubscription` (OneToOne with Company, tracks subscription state) and `PaddleWebhookEvent` (audit log, idempotency key store) to `apps/accounts/models.py`. Migration applied cleanly.

**Webhook view:** `PaddleWebhookView` at `POST /api/paddle/webhook/`:
- Verifies `Paddle-Signature` header via `paddle-python-sdk` `Verifier().verify()` — returns False on failure, throws on error; both handled
- Deduplicates by `event_id` before any processing
- Persists `PaddleWebhookEvent` before running handler (audit trail for failures too)
- Dispatches to typed handlers: `_handle_subscription_activated`, `_handle_subscription_canceled`, `_handle_subscription_updated`
- Each handler checks ordering: if `occurred_at <= sub.updated_at`, marks event `skipped`
- Always returns 200 for recognized events; 403 only for invalid signatures

**Billing API:** `BillingSubscriptionView` at `GET /api/billing/subscription/` — accepts JWT + Token, returns subscription state for the user's company. Powers S04 billing dashboard.

**SDK gotcha:** `Verifier().verify()` returns `bool`, it doesn't raise on failure. Original code checked only for exceptions — fixed to check the return value. Test for invalid signature needed a current timestamp (not ancient) to bypass the time-drift guard before HMAC check.

## Forward Intelligence for S04/S05

- **S04 billing dashboard** consumes `GET /api/billing/subscription/`. Response shape is fixed: `has_subscription`, `plan`, `plan_tier`, `status`, `current_period_end`, `paddle_update_url`.
- **S04 checkout flow** — when a new customer completes Paddle checkout, Paddle sends `subscription.activated`. But `_find_company_for_subscription` currently looks up by `paddle_subscription_id` only, which won't exist for *new* subscriptions. S04 must handle the company-linking step: either pass company metadata through Paddle `custom_data`, or look up by `paddle_customer_id` after checkout. This is the main integration gap to solve in S04.
- **S05 plan enforcement** — uses `Company.plan == PLAN_BLOCKED` and `Company.is_blocked()`, which are now correctly driven by Paddle webhook state.
- **Sandbox testing** — `POST /api/paddle/webhook/` with real Paddle sandbox events requires `PADDLE_WEBHOOK_SECRET` to be set in `.env`. The test suite uses HMAC-generated signatures and doesn't need a real Paddle account.

## Verification

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Valid signature accepted | ✓ PASS | test_valid_signature_accepted |
| 2 | Invalid signature rejected (403) | ✓ PASS | test_invalid_signature_rejected |
| 3 | Empty webhook secret rejects all | ✓ PASS | test_missing_webhook_secret_rejects_all |
| 4 | subscription.activated → PLAN_ACTIVE | ✓ PASS | test_subscription_activated_upgrades_company |
| 5 | subscription.canceled → PLAN_BLOCKED | ✓ PASS | test_subscription_canceled_blocks_company |
| 6 | subscription.past_due → PLAN_BLOCKED | ✓ PASS | test_subscription_past_due_blocks_company |
| 7 | subscription.paused → PLAN_BLOCKED | ✓ PASS | test_subscription_paused_blocks_company |
| 8 | subscription.resumed → PLAN_ACTIVE | ✓ PASS | test_subscription_resumed_reactivates_company |
| 9 | Price ID → tier mapping | ✓ PASS | test_subscription_activated_sets_tier_from_price_id |
| 10 | Idempotent duplicate → 200, no reprocess | ✓ PASS | test_duplicate_event_returns_200_no_double_processing |
| 11 | Out-of-order stale event skipped | ✓ PASS | test_out_of_order_event_skipped |
| 12 | Raw payload persisted | ✓ PASS | test_raw_payload_persisted |
| 13 | Billing API unauthenticated → 401 | ✓ PASS | test_unauthenticated_rejected |
| 14 | Billing API authenticated returns data | ✓ PASS | test_authenticated_with_subscription |
| 15 | Billing API JWT auth works | ✓ PASS | test_jwt_auth_works_on_subscription_api |
| 16 | All 38 S01+S02 tests still pass | ✓ PASS | 56/56 total |
