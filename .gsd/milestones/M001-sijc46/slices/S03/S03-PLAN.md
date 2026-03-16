# S03: Paddle Billing Backend

**Goal:** Webhook endpoint receives Paddle subscription lifecycle events with signature verification, syncs subscription state to Company model, persists raw payloads for audit, and processes idempotently with ordering protection. A billing subscription API endpoint exposes current subscription data for S04.

**Demo:** POST to `/api/paddle/webhook/` with a simulated Paddle `subscription.activated` payload → Company plan transitions to `active` → `PaddleWebhookEvent` record persisted with full JSON → POST the same payload again → returns 200, no double-processing, `PaddleWebhookEvent` shows status `skipped`/`processed` with no duplicate. GET `/api/billing/subscription/` returns real subscription data.

## Must-Haves

- `PaddleSubscription` model tracks current subscription state per company
- `PaddleWebhookEvent` model persists every received event (raw JSON, status, occurred_at)
- Webhook endpoint verifies Paddle signature — rejects invalid signatures with 403
- Webhook processing is idempotent: duplicate `event_id` returns 200, no re-processing
- Out-of-order events (older `occurred_at` than current state) are skipped, not applied
- Company plan transitions: `subscription.activated/resumed` → `PLAN_ACTIVE`; `subscription.canceled/past_due/paused` → `PLAN_BLOCKED`
- Always returns 200 for recognized events (prevents Paddle retry storms)
- All Paddle config from env vars only (`PADDLE_WEBHOOK_SECRET`, etc.)
- `GET /api/billing/subscription/` returns current subscription data (authenticated, JWT or Token)
- Passing tests covering all above behaviors

## Proof Level

- This slice proves: contract
- Real runtime required: yes (Django tests against real DB, mocked HMAC signature)
- Human/UAT required: no (sandbox webhook delivery tested manually in S06 UAT)

## Verification

```bash
cd backend && source venv/bin/activate && \
  DJANGO_SETTINGS_MODULE=config.settings PYTHONPATH=. \
  pytest tests/test_s03_paddle_webhook.py tests/test_jwt_auth.py tests/test_s02_jwt_migration.py -v
```

S03 test file: `backend/tests/test_s03_paddle_webhook.py`

Passing conditions:
- `test_webhook_valid_signature_accepted` — valid HMAC signature, event processed
- `test_webhook_invalid_signature_rejected` — bad signature → 403
- `test_subscription_activated_upgrades_company` — Company.plan becomes `active`
- `test_subscription_canceled_blocks_company` — Company.plan becomes `blocked`
- `test_subscription_past_due_blocks_company` — same as canceled
- `test_webhook_idempotent_duplicate` — second POST same event_id → 200, status stays `processed`
- `test_webhook_out_of_order_skipped` — older occurred_at than current sub state → status `skipped`
- `test_raw_payload_persisted` — PaddleWebhookEvent.payload matches posted JSON
- `test_billing_subscription_api_authenticated` — GET /api/billing/subscription/ returns 200 with plan data
- `test_billing_subscription_api_unauthenticated` — 401 for no credentials
- All 38 prior tests still pass (no regressions)

## Observability / Diagnostics

- Runtime signals: `PaddleWebhookEvent.status` field — `processed`/`skipped`/`failed` on every event
- Inspection surfaces: Django admin for `PaddleWebhookEvent` (raw payload visible); `GET /api/billing/subscription/` shows current state
- Failure visibility: `PaddleWebhookEvent.status = 'failed'` + `error_message` field captures exception text
- Redaction constraints: Never log Paddle webhook secret; `PADDLE_WEBHOOK_SECRET` stays in env only

## Integration Closure

- Upstream surfaces consumed: `Company.upgrade_to_active()`, `Company.plan = PLAN_BLOCKED` (existing)
- New wiring: `POST /api/paddle/webhook/` (Paddle → backend), `GET /api/billing/subscription/` (frontend → backend, consumed by S04)
- What remains before usable end-to-end: S04 (Paddle.js checkout overlay, billing dashboard reads `/api/billing/subscription/`)

---

## Tasks

- [x] **T01: Install paddle-python-sdk, add env var config to settings.py** `est:15m`
  - Why: Nothing else in S03 can proceed without the SDK installed and Paddle config available.
  - Files: `backend/requirements.txt`, `backend/config/settings.py`, `backend/.env`
  - Do:
    - Install: `pip install paddle-python-sdk` in venv, verify import works
    - Add to `requirements.txt` under a `# Paddle Billing` section
    - Add to `settings.py` after the JWT config block:
      ```python
      # =============================================================================
      # Paddle Billing Configuration (M001-sijc46: Launch-Ready Billing & Auth)
      # All IDs from environment — no hardcoded Paddle identifiers (D005)
      # =============================================================================
      PADDLE_ENVIRONMENT = os.getenv("PADDLE_ENVIRONMENT", "sandbox")  # "sandbox" | "production"
      PADDLE_API_KEY = os.getenv("PADDLE_API_KEY", "")
      PADDLE_CLIENT_TOKEN = os.getenv("PADDLE_CLIENT_TOKEN", "")
      PADDLE_WEBHOOK_SECRET = os.getenv("PADDLE_WEBHOOK_SECRET", "")
      # Price IDs per tier — set in .env for each environment
      PADDLE_PRICE_ID_STANDARD = os.getenv("PADDLE_PRICE_ID_STANDARD", "")
      PADDLE_PRICE_ID_PRO = os.getenv("PADDLE_PRICE_ID_PRO", "")
      PADDLE_PRICE_ID_ENTERPRISE = os.getenv("PADDLE_PRICE_ID_ENTERPRISE", "")
      ```
    - Add placeholder entries to `backend/.env` (empty values, documented):
      ```
      # Paddle Billing (M001-sijc46) — fill with sandbox values from Paddle dashboard
      PADDLE_ENVIRONMENT=sandbox
      PADDLE_API_KEY=
      PADDLE_CLIENT_TOKEN=
      PADDLE_WEBHOOK_SECRET=
      PADDLE_PRICE_ID_STANDARD=
      PADDLE_PRICE_ID_PRO=
      PADDLE_PRICE_ID_ENTERPRISE=
      ```
  - Verify: `source venv/bin/activate && python -c "from paddle import Paddle; print('ok')"` — no ImportError
  - Done when: SDK imports cleanly, settings reads env vars

- [x] **T02: Add PaddleSubscription and PaddleWebhookEvent models + migration** `est:25m`
  - Why: All webhook processing and billing state storage depends on these tables.
  - Files: `backend/apps/accounts/models.py`, `backend/apps/accounts/migrations/0009_paddle_models.py`
  - Do:
    - Add to `models.py` after the `User` class (new classes, never modifying Company or User):
      ```python
      class PaddleSubscription(models.Model):
          """One per company. Tracks current Paddle subscription state."""
          STATUS_ACTIVE = "active"
          STATUS_CANCELED = "canceled"
          STATUS_PAST_DUE = "past_due"
          STATUS_PAUSED = "paused"
          STATUS_TRIALING = "trialing"

          company = models.OneToOneField(
              Company, on_delete=models.CASCADE, related_name="paddle_subscription"
          )
          paddle_subscription_id = models.CharField(max_length=100, unique=True, db_index=True)
          paddle_customer_id = models.CharField(max_length=100, blank=True)
          status = models.CharField(max_length=20)
          plan_tier = models.CharField(max_length=20, blank=True)
          current_period_start = models.DateTimeField(null=True, blank=True)
          current_period_end = models.DateTimeField(null=True, blank=True)
          paddle_update_url = models.URLField(blank=True)
          created_at = models.DateTimeField(auto_now_add=True)
          updated_at = models.DateTimeField(auto_now=True)

          class Meta:
              db_table = "paddle_subscriptions"

      class PaddleWebhookEvent(models.Model):
          """Audit log of every Paddle webhook event received."""
          STATUS_PENDING = "pending"
          STATUS_PROCESSED = "processed"
          STATUS_SKIPPED = "skipped"
          STATUS_FAILED = "failed"

          event_id = models.CharField(max_length=100, unique=True, db_index=True)
          event_type = models.CharField(max_length=100)
          payload = models.JSONField()
          occurred_at = models.DateTimeField()
          received_at = models.DateTimeField(auto_now_add=True)
          processed_at = models.DateTimeField(null=True, blank=True)
          status = models.CharField(max_length=20, default=STATUS_PENDING)
          error_message = models.TextField(blank=True)

          class Meta:
              db_table = "paddle_webhook_events"
              indexes = [
                  models.Index(fields=["event_type", "status"]),
                  models.Index(fields=["occurred_at"]),
              ]
      ```
    - Generate migration: `python manage.py makemigrations accounts --name paddle_models`
    - Apply: `python manage.py migrate`
  - Verify: `python manage.py migrate --check` exits 0; `python -c "from apps.accounts.models import PaddleSubscription, PaddleWebhookEvent; print('ok')"`
  - Done when: Migration applied, models importable

- [x] **T03: Webhook view — signature verification, idempotency, event dispatch** `est:45m`
  - Why: Core of the slice. Handles all Paddle webhook processing.
  - Files: `backend/apps/api/views_paddle.py` (new file)
  - Do:
    - Create `views_paddle.py`:
      ```python
      # views_paddle.py
      """
      Paddle webhook processing for Proof Platform.

      POST /api/paddle/webhook/ — unauthenticated, Paddle signature required
      GET  /api/billing/subscription/ — authenticated, returns current subscription state
      """
      ```
    - **Signature verification:** Use `paddle-python-sdk`. Example pattern:
      ```python
      from paddle.webhook.verifier import Verifier
      from paddle.webhook.secret import Secret
      from django.conf import settings

      def _verify_signature(request) -> bool:
          secret = settings.PADDLE_WEBHOOK_SECRET
          if not secret:
              return False  # Fail closed — no secret means no webhook processing
          try:
              Verifier().verify(request, Secret(secret))
              return True
          except Exception:
              return False
      ```
      If SDK import path differs, adapt (check with `python -c "import paddle; print(paddle.__file__)"` to discover module structure).
    - **Price-to-tier helper:**
      ```python
      def _price_id_to_tier(price_id: str) -> str:
          mapping = {
              settings.PADDLE_PRICE_ID_STANDARD: "standard",
              settings.PADDLE_PRICE_ID_PRO: "pro",
              settings.PADDLE_PRICE_ID_ENTERPRISE: "enterprise",
          }
          return mapping.get(price_id, "standard")
      ```
    - **`PaddleWebhookView`:**
      - Parse JSON body manually (not `request.data` — need raw bytes for SDK)
      - Extract `event_id`, `event_type`, `occurred_at` from parsed JSON
      - Idempotency check: `PaddleWebhookEvent.objects.filter(event_id=event_id).exists()` → return 200 immediately
      - Create `PaddleWebhookEvent(status='pending')`
      - Dispatch to handler based on `event_type`
      - On success: set `status='processed'`, set `processed_at=now()`
      - On `skipped` (ordering): set `status='skipped'`
      - On exception: set `status='failed'`, `error_message=str(e)`, still return 200
    - **Subscription handlers** — `_handle_subscription_activated`, `_handle_subscription_canceled`, etc.:
      - All follow the pattern: get/create `PaddleSubscription`, check ordering, apply state change, save
      - Ordering guard: if `sub.updated_at` >= `occurred_at`, mark skipped and return
      - `subscription.activated` + `subscription.resumed`: call `company.upgrade_to_active(tier)`
      - `subscription.canceled` + `subscription.past_due` + `subscription.paused`: set `company.plan = Company.PLAN_BLOCKED`, `company.save(update_fields=['plan'])`
      - `subscription.updated`: update tier if changed
      - `subscription.trialing`: no-op on company plan (trial managed internally)
    - **`BillingSubscriptionView`** (authenticated):
      ```python
      class BillingSubscriptionView(APIView):
          authentication_classes = [JWTAuthentication, TokenAuthentication]
          permission_classes = [IsAuthenticated]

          def get(self, request):
              company = request.user.company
              sub = getattr(company, 'paddle_subscription', None)
              if not sub:
                  return Response({
                      "has_subscription": False,
                      "plan": company.plan,
                      "plan_tier": company.plan_tier,
                      "status": None,
                      ...
                  })
              return Response({
                  "has_subscription": True,
                  "plan": company.plan,
                  "plan_tier": company.plan_tier,
                  "status": sub.status,
                  "current_period_end": sub.current_period_end,
                  "paddle_update_url": sub.paddle_update_url,
                  ...
              })
      ```
  - Verify: `python -c "from apps.api.views_paddle import PaddleWebhookView, BillingSubscriptionView; print('ok')"`
  - Done when: File imports cleanly, all handler functions present

- [x] **T04: Wire URL routes** `est:10m`
  - Why: Views are unreachable without URL routing.
  - Files: `backend/config/urls.py`
  - Do:
    - Import `PaddleWebhookView` and `BillingSubscriptionView` from `apps.api.views_paddle`
    - Add to `urlpatterns`:
      ```python
      path("api/paddle/webhook/", PaddleWebhookView.as_view(), name="paddle-webhook"),
      path("api/billing/subscription/", BillingSubscriptionView.as_view(), name="billing-subscription"),
      ```
    - Add before the generic `api/` include so the explicit paths take precedence
  - Verify: `python manage.py check` exits 0; `python manage.py show_urls 2>/dev/null | grep paddle` (if django-extensions installed) or just check no reverse errors
  - Done when: `python manage.py check` passes

- [x] **T05: Write S03 contract tests** `est:40m`
  - Why: Prove idempotency, ordering, signature check, and plan transitions all work correctly.
  - Files: `backend/tests/test_s03_paddle_webhook.py` (new file)
  - Do:
    - **Signature helper:** In tests, generate a valid `Paddle-Signature` header manually using HMAC-SHA256:
      ```python
      import hashlib, hmac, time, json

      TEST_WEBHOOK_SECRET = "test_webhook_secret_key"

      def _make_paddle_signature(payload_bytes: bytes, secret: str) -> str:
          ts = str(int(time.time()))
          h = hmac.new(secret.encode(), digestmod=hashlib.sha256)
          h.update(f"{ts}:{payload_bytes.decode()}".encode())
          return f"ts={ts};h1={h.hexdigest()}"
      ```
      Patch `settings.PADDLE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET` in the test fixture.
      
      Alternatively: mock `_verify_signature` to always return True for unit-level dispatch tests, and have one dedicated signature test that exercises the real verifier.
    - **Payload factory:** Helper that builds a minimal Paddle `subscription.*` event JSON:
      ```python
      def _make_subscription_event(event_type, subscription_id, customer_id, 
                                   status, occurred_at, price_id=None):
          return {
              "event_id": f"evt_{subscription_id}_{event_type}",
              "event_type": event_type,
              "occurred_at": occurred_at.isoformat(),
              "data": {
                  "id": subscription_id,
                  "customer_id": customer_id,
                  "status": status,
                  "current_billing_period": {
                      "starts_at": occurred_at.isoformat(),
                      "ends_at": (occurred_at + timedelta(days=30)).isoformat(),
                  },
                  "items": [{"price": {"id": price_id or ""}}],
                  "management_urls": {"update_payment_method": "https://paddle.com/update"},
              }
          }
      ```
    - **Tests to write:**
      - `test_webhook_invalid_signature_rejected` — POST with bad signature → 403
      - `test_webhook_missing_signature_rejected` — POST with no header → 403 (if WEBHOOK_SECRET set)
      - `test_subscription_activated_upgrades_company` — company.plan becomes `active`, `PaddleSubscription` created
      - `test_subscription_canceled_blocks_company` — company.plan becomes `blocked`
      - `test_subscription_past_due_blocks_company` — company.plan becomes `blocked`
      - `test_subscription_resumed_reactivates_company` — after cancel, resume → `active`
      - `test_webhook_idempotent_duplicate` — POST same `event_id` twice → both 200, single `PaddleWebhookEvent` with status `processed`
      - `test_webhook_out_of_order_skipped` — post newer event first, then older → older has status `skipped`, company state reflects newer
      - `test_raw_payload_persisted` — `PaddleWebhookEvent.payload` contains full posted JSON
      - `test_billing_subscription_api_returns_data` — authenticated GET → 200 with plan data
      - `test_billing_subscription_api_unauthenticated` — no credentials → 401
      - `test_billing_subscription_no_subscription` — company has no PaddleSubscription → `has_subscription: false`
  - Verify: `DJANGO_SETTINGS_MODULE=config.settings PYTHONPATH=. pytest tests/test_s03_paddle_webhook.py -v` — all pass
  - Done when: All S03 tests pass, no regressions in S01/S02 tests

- [x] **T06: Full verification** `est:10m`
  - Why: Confirm all 3 test suites pass together, Django check passes, no regressions.
  - Files: none (verification only)
  - Do:
    - `python manage.py check` — no system check errors
    - `python manage.py migrate --check` — no pending migrations
    - `DJANGO_SETTINGS_MODULE=config.settings PYTHONPATH=. pytest tests/ -v` — all tests pass
    - Confirm total test count: 38 (S01+S02) + S03 tests = ~50+ passing
  - Verify: All commands exit 0
  - Done when: Full suite green, no regressions

## Files Likely Touched

- `backend/requirements.txt`
- `backend/config/settings.py`
- `backend/.env`
- `backend/apps/accounts/models.py` (new model classes appended, existing untouched)
- `backend/apps/accounts/migrations/0009_paddle_models.py` (generated)
- `backend/apps/api/views_paddle.py` (new file)
- `backend/config/urls.py`
- `backend/tests/test_s03_paddle_webhook.py` (new file)
