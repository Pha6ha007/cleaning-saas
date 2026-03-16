# S03: Paddle Billing Backend — Research

**Date:** 2026-03-17
**Requirements:** R003 (webhook receiver), R004 (subscription sync), R009 (idempotency), R010 (out-of-order ordering), R011 (raw payload persistence)

---

## Summary

S03 builds the Paddle billing backend: a webhook endpoint that receives Paddle subscription lifecycle events, verifies their signature, persists the raw payload, and syncs subscription state to the Company model — idempotently, with ordering protection. No Paddle account exists yet; everything is config-driven via env vars and must work with sandbox credentials.

The codebase has no Paddle code at all. Company model already has `plan`, `plan_tier`, `upgrade_to_active()`, and `is_blocked()` — the subscriber/subscription models extend this. The existing `BillingSummaryView` returns `next_billing_date: None` with a `# TODO` comment; S03 provides the data that S04 will plug in.

The Paddle Python SDK (`paddle-python-sdk`) handles signature verification natively — pass the Django `request` and a secret key object. Do not hand-roll HMAC verification.

S03 is the highest-risk slice in the milestone because webhook reliability (idempotency + ordering) is where billing data corruption happens. The research risk is fully understood; the implementation risk is in getting the dedup/ordering logic right.

## Recommendation

**Two models in `apps/accounts/models.py`:**
- `PaddleSubscription` — one per company, tracks current subscription state. Fields: `company` (OneToOne), `paddle_subscription_id`, `paddle_customer_id`, `status`, `plan_tier`, `current_period_start`, `current_period_end`, `paddle_update_url`, `created_at`, `updated_at`.
- `PaddleWebhookEvent` — audit log of every received event. Fields: `event_id` (unique), `event_type`, `payload` (JSONField), `occurred_at`, `received_at`, `processed_at`, `status` (`pending`/`processed`/`failed`/`skipped`).

**One view in `backend/apps/api/views_paddle.py`:**
- `PaddleWebhookView` — unauthenticated POST endpoint. Verifies signature using `paddle-python-sdk`, parses event, deduplicates by `event_id`, dispatches to handler, updates Company plan state. Responds 200 for all recognized events (including duplicates) to prevent Paddle retry storms.

**Signature verification:** Use `paddle-python-sdk`. The SDK's `Verifier().verify(request, Secret(WEBHOOK_SECRET))` handles the `Paddle-Signature` header parsing and HMAC-SHA256 check. The raw request body must not be read before the verifier — Django's request body is lazy and can only be read once; the SDK reads it internally.

**Idempotency:** Check `PaddleWebhookEvent.objects.filter(event_id=...).exists()` before processing. Return 200 immediately for duplicates. No partial processing.

**Ordering:** Each handler checks `PaddleSubscription.updated_at` (or `current_period_start`) against the event's `occurred_at`. Only apply if the event is newer than the current subscription state. Stale out-of-order events get status `skipped`.

**Billing summary API endpoint:** `GET /api/billing/subscription/` — returns current subscription data for the authenticated user's company (consumed by S04 billing dashboard). This replaces the `# TODO` in `BillingSummaryView`.

## Implementation Landscape

### Key Files

**New files:**
- `backend/apps/accounts/models.py` — Add `PaddleSubscription` and `PaddleWebhookEvent` models (extend existing file; Company model stays unchanged except Paddle FK is on `PaddleSubscription`)
- `backend/apps/accounts/migrations/0009_paddle_models.py` — migration for new models
- `backend/apps/api/views_paddle.py` — `PaddleWebhookView`, `BillingSubscriptionView`
- `backend/tests/test_s03_paddle_webhook.py` — contract tests

**Modified files:**
- `backend/requirements.txt` — add `paddle-python-sdk`
- `backend/config/settings.py` — add `PADDLE_WEBHOOK_SECRET`, `PADDLE_API_KEY`, `PADDLE_CLIENT_TOKEN`, `PADDLE_ENVIRONMENT` env var reads
- `backend/config/urls.py` — wire `POST /api/paddle/webhook/` and `GET /api/billing/subscription/`

**Untouched:**
- `backend/apps/accounts/api/views_settings.py` — `BillingSummaryView` stays as-is for S03. S04 will update it to read from `PaddleSubscription`.
- Everything in CleanProof locked zone — no changes.

### Paddle Event → Company State Mapping

| Paddle event | `Company.plan` action | `PaddleSubscription.status` |
|---|---|---|
| `subscription.activated` | `upgrade_to_active(tier)` | `active` |
| `subscription.updated` | update tier if changed | `active` |
| `subscription.canceled` | `company.plan = PLAN_BLOCKED` | `canceled` |
| `subscription.past_due` | `company.plan = PLAN_BLOCKED` | `past_due` |
| `subscription.paused` | `company.plan = PLAN_BLOCKED` | `paused` |
| `subscription.resumed` | `upgrade_to_active(tier)` | `active` |
| `subscription.trialing` | no-op (managed internally) | `trialing` |

Tier mapping from Paddle price IDs: `PADDLE_PRICE_ID_STANDARD`, `PADDLE_PRICE_ID_PRO`, `PADDLE_PRICE_ID_ENTERPRISE` → `standard`/`pro`/`enterprise`. Falls back to `standard` if price ID not recognized (safe default).

### Webhook Handler Architecture

```python
# views_paddle.py skeleton
class PaddleWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        # 1. Verify signature
        # 2. Parse event_id, event_type, occurred_at from body
        # 3. Persist PaddleWebhookEvent (status=pending) — idempotency check first
        # 4. Dispatch to handler based on event_type
        # 5. Update PaddleWebhookEvent.status = processed/skipped/failed
        # 6. Always return 200 (prevents Paddle retries for recognized events)
```

The handler must wrap business logic in a `try/except` and mark status `failed` on exception — then still return 200. Paddle will retry on non-200, which would violate idempotency.

### Ordering guard in subscription handler

```python
sub = PaddleSubscription.objects.filter(company=company).first()
if sub and sub.updated_at and event_occurred_at <= sub.updated_at:
    # Stale event — skip
    webhook_event.status = 'skipped'
    webhook_event.save()
    return
```

### Build Order

1. **Models + migration first** — `PaddleSubscription` and `PaddleWebhookEvent`. No code can run until the tables exist.
2. **Settings env vars** — `PADDLE_WEBHOOK_SECRET` and friends. Webhook view can't verify without this.
3. **Webhook view + URL** — the core processing logic. Write tests alongside.
4. **Billing subscription API endpoint** — `GET /api/billing/subscription/`. Consumed by S04.
5. **Tests** — simulate Paddle payloads, prove idempotency and ordering.

### Verification Approach

```bash
cd backend && source venv/bin/activate && \
  DJANGO_SETTINGS_MODULE=config.settings PYTHONPATH=. \
  pytest tests/test_s03_paddle_webhook.py -v
```

Tests must cover:
- `test_webhook_signature_invalid` — bad signature returns 403
- `test_subscription_activated_upgrades_company` — event sets `Company.plan = active`
- `test_subscription_canceled_blocks_company` — event sets `Company.plan = blocked`
- `test_webhook_idempotent_duplicate` — second POST with same `event_id` returns 200, no double-processing
- `test_webhook_out_of_order_skipped` — older `occurred_at` than current subscription state is skipped
- `test_raw_payload_persisted` — `PaddleWebhookEvent` record exists with full JSON payload
- `test_billing_subscription_api` — `GET /api/billing/subscription/` returns correct subscription data

For signature tests: bypass real HMAC by mocking the verifier (unit test style), OR generate a real HMAC-SHA256 signature in the test fixture using the test secret key.

---

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Paddle webhook signature verification | `paddle-python-sdk` (`Verifier().verify()`) | Handles `Paddle-Signature` header format, timestamp replay protection, HMAC-SHA256 — correct and maintained |
| Company plan state machine | `Company.upgrade_to_active()`, `Company.plan = PLAN_BLOCKED` | Already tested, idempotent, correct |

## Constraints

- `apps/accounts/models.py` is **not** in the locked file list — safe to add new model classes. Do not touch the existing `Company` or `User` class internals.
- `backend/config/urls.py` is **not** locked — safe to add new URL patterns.
- `backend/config/settings.py` is **not** locked — safe to add new env var reads.
- All Paddle IDs (webhook secret, API key, price IDs) come from env vars only — never hardcoded. Missing env vars should produce safe fallbacks (signature verification fails closed, not open).
- Webhook endpoint must be unauthenticated — Paddle cannot send JWT/Token headers.
- Must return HTTP 200 for all recognized events including duplicates and skipped (ordering) events. Non-200 triggers Paddle retries.
- `paddle-python-sdk` needs to be installed in venv and added to `requirements.txt`.

## Common Pitfalls

- **Reading request.body before SDK** — Django's `request.body` can only be read once. If any middleware or logging reads it first, the SDK verifier will see an empty body and fail. Use `APIView` with no body-consuming middleware. In tests, pass raw bytes as body.
- **HMAC over processed JSON** — verify over the raw bytes as received, not re-serialized JSON. The SDK handles this, but if hand-rolling, re-serializing will break the signature.
- **Return 200 on exception** — if the handler crashes after `PaddleWebhookEvent` is created, mark it `failed` and return 200. Otherwise Paddle retries the same event repeatedly, potentially re-processing on retry if the dedup check didn't persist correctly.
- **`occurred_at` parsing** — Paddle sends `occurred_at` as ISO 8601 with timezone (`2024-01-15T12:00:00.000000Z`). Use `datetime.fromisoformat()` or `dateutil.parser.parse()`. Don't truncate to date — keep full datetime for ordering precision.
- **Price ID to tier mapping** — price IDs are env vars, not hardcoded. The mapping function must handle unknown price IDs gracefully (default to `standard`).

## Open Risks

- **`paddle-python-sdk` on Python 3.14** — the SDK may have compatibility issues with Python 3.14 (Django is running 3.14.3). Need to verify install succeeds and basic import works.
- **Sandbox webhook delivery** — testing the real webhook flow requires a tool like `ngrok` to expose localhost. Unit tests with mocked signatures cover the logic; end-to-end webhook delivery is a manual UAT step, not automated.
