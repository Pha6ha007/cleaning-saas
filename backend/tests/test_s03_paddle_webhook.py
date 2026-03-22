# backend/tests/test_s03_paddle_webhook.py
"""
S03: Paddle Billing Backend — Contract Tests

Proves:
1. Webhook signature verification (valid accepted, invalid rejected)
2. Subscription event → Company plan state transitions
3. Idempotency: duplicate event_id returns 200, no double-processing
4. Ordering: out-of-order (stale) events are skipped
5. Raw payload persistence in PaddleWebhookEvent
6. Billing subscription API endpoint
"""

import hashlib
import hmac
import json
import time
from datetime import datetime, timedelta, timezone as dt_timezone
from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import Company, PaddleSubscription, PaddleWebhookEvent, User


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture(autouse=True)
def _disable_throttling(monkeypatch):
    """Disable DRF throttling and clear cache before each test."""
    from django.conf import settings as django_settings
    original = dict(django_settings.REST_FRAMEWORK)
    patched = {
        **original,
        "DEFAULT_THROTTLE_RATES": {"anon": "1000/minute", "user": "1000/minute"},
    }
    monkeypatch.setattr("django.conf.settings.REST_FRAMEWORK", patched)
    from django.core.cache import cache
    cache.clear()


TEST_WEBHOOK_SECRET = "test_webhook_secret_s03"


@pytest.fixture(autouse=True)
def _set_paddle_settings():
    """Configure Paddle env vars for all S03 tests via override_settings (safe, no fixture interaction)."""
    from django.test import override_settings
    with override_settings(
        PADDLE_WEBHOOK_SECRET=TEST_WEBHOOK_SECRET,
        PADDLE_PRICE_ID_STANDARD="pri_standard_test",
        PADDLE_PRICE_ID_PRO="pri_pro_test",
        PADDLE_PRICE_ID_ENTERPRISE="pri_enterprise_test",
    ):
        yield


@pytest.fixture
def company(db):
    return Company.objects.create(name="S03 Test Company", plan=Company.PLAN_TRIAL)


@pytest.fixture
def owner(company):
    user = User.objects.create(
        company=company,
        role=User.ROLE_OWNER,
        email="s03_owner@test.com",
        full_name="S03 Owner",
        is_active=True,
    )
    user.set_password("SecurePass123!")
    user.save()
    return user


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def paddle_sub(company):
    """Pre-existing PaddleSubscription for a company."""
    return PaddleSubscription.objects.create(
        company=company,
        paddle_subscription_id="sub_test_001",
        paddle_customer_id="ctm_test_001",
        status=PaddleSubscription.STATUS_ACTIVE,
        plan_tier=Company.TIER_STANDARD,
    )


# =============================================================================
# Signature helpers
# =============================================================================


def _make_paddle_signature(payload_bytes: bytes, secret: str, ts: int | None = None) -> str:
    """Generate a valid Paddle-Signature header value for testing."""
    if ts is None:
        ts = int(time.time())
    msg = f"{ts}:{payload_bytes.decode('utf-8')}"
    h = hmac.new(secret.encode("utf-8"), msg.encode("utf-8"), hashlib.sha256)
    return f"ts={ts};h1={h.hexdigest()}"


def _make_event_payload(
    event_type: str,
    subscription_id: str = "sub_test_001",
    customer_id: str = "ctm_test_001",
    paddle_status: str = "active",
    occurred_at: datetime | None = None,
    price_id: str = "pri_standard_test",
    event_id: str | None = None,
) -> dict:
    """Build a minimal Paddle subscription event payload."""
    if occurred_at is None:
        occurred_at = datetime.now(dt_timezone.utc)
    if event_id is None:
        event_id = f"evt_{subscription_id}_{event_type}_{int(occurred_at.timestamp())}"

    return {
        "event_id": event_id,
        "event_type": event_type,
        "occurred_at": occurred_at.isoformat().replace("+00:00", "Z"),
        "data": {
            "id": subscription_id,
            "customer_id": customer_id,
            "status": paddle_status,
            "current_billing_period": {
                "starts_at": occurred_at.isoformat().replace("+00:00", "Z"),
                "ends_at": (occurred_at + timedelta(days=30)).isoformat().replace("+00:00", "Z"),
            },
            "items": [{"price": {"id": price_id}}],
            "management_urls": {
                "update_payment_method": "https://sandbox-buyer-portal.paddle.com/update"
            },
        },
    }


def _post_webhook(api_client, payload: dict, secret: str = TEST_WEBHOOK_SECRET, bad_sig: bool = False):
    """POST a webhook event with proper (or bad) signature."""
    body = json.dumps(payload).encode("utf-8")
    if bad_sig:
        # Use current timestamp so time-drift check passes, but wrong HMAC so signature check fails
        ts = int(time.time())
        sig_header = f"ts={ts};h1=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"
    else:
        sig_header = _make_paddle_signature(body, secret)

    return api_client.post(
        reverse("paddle-webhook"),
        data=body,
        content_type="application/json",
        HTTP_PADDLE_SIGNATURE=sig_header,
    )


# =============================================================================
# Signature Verification Tests
# =============================================================================


@pytest.mark.django_db
class TestWebhookSignatureVerification:

    def test_valid_signature_accepted(self, api_client, paddle_sub):
        payload = _make_event_payload("subscription.updated")
        resp = _post_webhook(api_client, payload)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.content}"

    def test_invalid_signature_rejected(self, api_client):
        payload = _make_event_payload("subscription.activated")
        resp = _post_webhook(api_client, payload, bad_sig=True)
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"

    def test_missing_webhook_secret_rejects_all(self, api_client):
        """If PADDLE_WEBHOOK_SECRET is empty, all webhooks are rejected."""
        from django.test import override_settings
        with override_settings(PADDLE_WEBHOOK_SECRET=""):
            payload = _make_event_payload("subscription.activated")
            resp = _post_webhook(api_client, payload)
        assert resp.status_code == 403


# =============================================================================
# Subscription State Transition Tests
# =============================================================================


@pytest.mark.django_db
class TestSubscriptionStateTransitions:

    def test_subscription_activated_upgrades_company(self, api_client, company, paddle_sub):
        """subscription.activated → Company.plan = active."""
        assert company.plan == Company.PLAN_TRIAL

        payload = _make_event_payload(
            "subscription.activated",
            subscription_id=paddle_sub.paddle_subscription_id,
        )
        resp = _post_webhook(api_client, payload)
        assert resp.status_code == 200

        company.refresh_from_db()
        assert company.plan == Company.PLAN_ACTIVE

        event = PaddleWebhookEvent.objects.get(event_id=payload["event_id"])
        assert event.status == PaddleWebhookEvent.STATUS_PROCESSED

    def test_subscription_resumed_reactivates_company(self, api_client, company, paddle_sub):
        """subscription.resumed → Company.plan = active (same as activated)."""
        company.plan = Company.PLAN_BLOCKED
        company.save()

        payload = _make_event_payload(
            "subscription.resumed",
            subscription_id=paddle_sub.paddle_subscription_id,
        )
        resp = _post_webhook(api_client, payload)
        assert resp.status_code == 200

        company.refresh_from_db()
        assert company.plan == Company.PLAN_ACTIVE

    def test_subscription_canceled_blocks_company(self, api_client, company, paddle_sub):
        """subscription.canceled → Company.plan = blocked."""
        company.plan = Company.PLAN_ACTIVE
        company.save()

        payload = _make_event_payload(
            "subscription.canceled",
            subscription_id=paddle_sub.paddle_subscription_id,
            paddle_status="canceled",
        )
        resp = _post_webhook(api_client, payload)
        assert resp.status_code == 200

        company.refresh_from_db()
        assert company.plan == Company.PLAN_BLOCKED

        paddle_sub.refresh_from_db()
        assert paddle_sub.status == PaddleSubscription.STATUS_CANCELED

    def test_subscription_past_due_blocks_company(self, api_client, company, paddle_sub):
        """subscription.past_due → Company.plan = blocked."""
        company.plan = Company.PLAN_ACTIVE
        company.save()

        payload = _make_event_payload(
            "subscription.past_due",
            subscription_id=paddle_sub.paddle_subscription_id,
            paddle_status="past_due",
        )
        resp = _post_webhook(api_client, payload)
        assert resp.status_code == 200

        company.refresh_from_db()
        assert company.plan == Company.PLAN_BLOCKED

    def test_subscription_paused_blocks_company(self, api_client, company, paddle_sub):
        """subscription.paused → Company.plan = blocked."""
        company.plan = Company.PLAN_ACTIVE
        company.save()

        payload = _make_event_payload(
            "subscription.paused",
            subscription_id=paddle_sub.paddle_subscription_id,
            paddle_status="paused",
        )
        resp = _post_webhook(api_client, payload)
        assert resp.status_code == 200

        company.refresh_from_db()
        assert company.plan == Company.PLAN_BLOCKED

    def test_subscription_activated_sets_tier_from_price_id(self, api_client, company, paddle_sub):
        """Price ID maps to correct plan tier."""
        payload = _make_event_payload(
            "subscription.activated",
            subscription_id=paddle_sub.paddle_subscription_id,
            price_id="pri_pro_test",
        )
        resp = _post_webhook(api_client, payload)
        assert resp.status_code == 200

        company.refresh_from_db()
        assert company.plan_tier == Company.TIER_PRO

    def test_unknown_event_type_acknowledged_skipped(self, api_client):
        """Unknown event types return 200 but are skipped."""
        payload = {
            "event_id": "evt_unknown_001",
            "event_type": "transaction.completed",
            "occurred_at": datetime.now(dt_timezone.utc).isoformat(),
            "data": {},
        }
        resp = _post_webhook(api_client, payload)
        assert resp.status_code == 200

        event = PaddleWebhookEvent.objects.get(event_id="evt_unknown_001")
        assert event.status == PaddleWebhookEvent.STATUS_SKIPPED


# =============================================================================
# Idempotency Tests
# =============================================================================


@pytest.mark.django_db
class TestWebhookIdempotency:

    def test_duplicate_event_returns_200_no_double_processing(self, api_client, company, paddle_sub):
        """Posting the same event_id twice: second POST returns 200, single event record."""
        payload = _make_event_payload(
            "subscription.activated",
            subscription_id=paddle_sub.paddle_subscription_id,
            event_id="evt_idempotent_001",
        )

        # First POST
        resp1 = _post_webhook(api_client, payload)
        assert resp1.status_code == 200

        company.refresh_from_db()
        assert company.plan == Company.PLAN_ACTIVE

        # Second POST — same event_id
        # Reset company to trial to verify it does NOT get processed again
        company.plan = Company.PLAN_TRIAL
        company.save()

        resp2 = _post_webhook(api_client, payload)
        assert resp2.status_code == 200

        # Company should still be trial — second event was not applied
        company.refresh_from_db()
        assert company.plan == Company.PLAN_TRIAL, (
            "Second event with same event_id should not re-process"
        )

        # Only one PaddleWebhookEvent should exist
        assert PaddleWebhookEvent.objects.filter(event_id="evt_idempotent_001").count() == 1


# =============================================================================
# Ordering (Out-of-Order) Tests
# =============================================================================


@pytest.mark.django_db
class TestWebhookOrdering:

    def test_out_of_order_event_skipped(self, api_client, company, paddle_sub):
        """Older occurred_at than current subscription state is skipped."""
        now = datetime.now(dt_timezone.utc)

        # Post a newer event first — activates company
        newer_payload = _make_event_payload(
            "subscription.activated",
            subscription_id=paddle_sub.paddle_subscription_id,
            occurred_at=now,
            event_id="evt_newer_001",
        )
        resp1 = _post_webhook(api_client, newer_payload)
        assert resp1.status_code == 200
        company.refresh_from_db()
        assert company.plan == Company.PLAN_ACTIVE

        # Now post an older event — should be skipped
        older_time = now - timedelta(hours=2)
        older_payload = _make_event_payload(
            "subscription.canceled",
            subscription_id=paddle_sub.paddle_subscription_id,
            paddle_status="canceled",
            occurred_at=older_time,
            event_id="evt_older_001",
        )
        resp2 = _post_webhook(api_client, older_payload)
        assert resp2.status_code == 200

        # Company should still be active — older event was skipped
        company.refresh_from_db()
        assert company.plan == Company.PLAN_ACTIVE, (
            "Older out-of-order event should not override newer state"
        )

        # Older event should have status 'skipped'
        older_event = PaddleWebhookEvent.objects.get(event_id="evt_older_001")
        assert older_event.status == PaddleWebhookEvent.STATUS_SKIPPED


# =============================================================================
# Payload Persistence Tests
# =============================================================================


@pytest.mark.django_db
class TestRawPayloadPersistence:

    def test_raw_payload_persisted(self, api_client, paddle_sub):
        """PaddleWebhookEvent.payload contains the full posted JSON."""
        payload = _make_event_payload(
            "subscription.updated",
            subscription_id=paddle_sub.paddle_subscription_id,
            event_id="evt_payload_test_001",
        )
        resp = _post_webhook(api_client, payload)
        assert resp.status_code == 200

        event = PaddleWebhookEvent.objects.get(event_id="evt_payload_test_001")
        assert event.payload["event_id"] == "evt_payload_test_001"
        assert event.payload["event_type"] == "subscription.updated"
        assert "data" in event.payload

    def test_webhook_event_has_occurred_at(self, api_client, paddle_sub):
        """PaddleWebhookEvent.occurred_at is parsed from the payload."""
        occurred_at = datetime(2026, 3, 15, 12, 0, 0, tzinfo=dt_timezone.utc)
        payload = _make_event_payload(
            "subscription.updated",
            subscription_id=paddle_sub.paddle_subscription_id,
            occurred_at=occurred_at,
            event_id="evt_time_test_001",
        )
        resp = _post_webhook(api_client, payload)
        assert resp.status_code == 200

        event = PaddleWebhookEvent.objects.get(event_id="evt_time_test_001")
        assert event.occurred_at.date() == occurred_at.date()


# =============================================================================
# Billing Subscription API Tests
# =============================================================================


@pytest.mark.django_db
class TestBillingSubscriptionAPI:
    url = reverse("billing-subscription")

    def test_unauthenticated_rejected(self, api_client):
        resp = api_client.get(self.url)
        assert resp.status_code in (401, 403)

    def test_authenticated_no_subscription(self, api_client, owner):
        """Company with no PaddleSubscription returns has_subscription=false."""
        token, _ = Token.objects.get_or_create(user=owner)
        api_client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        resp = api_client.get(self.url)
        assert resp.status_code == 200
        data = resp.json()
        assert data["has_subscription"] is False
        assert "plan" in data
        assert "plan_tier" in data

    def test_authenticated_with_subscription(self, api_client, owner, paddle_sub):
        """Company with PaddleSubscription returns full subscription data."""
        token, _ = Token.objects.get_or_create(user=owner)
        api_client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        resp = api_client.get(self.url)
        assert resp.status_code == 200
        data = resp.json()
        assert data["has_subscription"] is True
        assert data["status"] == paddle_sub.status
        assert data["paddle_subscription_id"] == paddle_sub.paddle_subscription_id

    def test_jwt_auth_works_on_subscription_api(self, api_client, owner):
        """JWT Bearer token is accepted on billing subscription endpoint."""
        login_resp = api_client.post(
            reverse("api-jwt-login"),
            {"email": "s03_owner@test.com", "password": "SecurePass123!"},
            format="json",
        )
        assert login_resp.status_code == 200
        access_token = login_resp.json()["access"]

        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        resp = api_client.get(self.url)
        assert resp.status_code == 200


# =============================================================================
# S04: custom_data Company Linking Tests
# =============================================================================


@pytest.mark.django_db
class TestCustomDataCompanyLinking:
    """
    Tests for company linking via Paddle custom_data.company_id (S04 checkout flow).
    When a new subscription arrives from Paddle checkout, custom_data.company_id
    must be used to find and link the company.
    """

    def test_new_subscription_linked_via_custom_data(self, api_client, company):
        """
        subscription.activated with custom_data.company_id links new subscription
        to correct company and activates plan.
        """
        assert company.plan == Company.PLAN_TRIAL

        new_sub_id = "sub_brand_new_001"
        payload = _make_event_payload(
            "subscription.activated",
            subscription_id=new_sub_id,
            event_id="evt_custom_data_001",
        )
        # Inject custom_data at top-level payload (Paddle sends it in data.custom_data)
        payload["data"]["custom_data"] = {"company_id": str(company.id)}

        resp = _post_webhook(api_client, payload)
        assert resp.status_code == 200

        company.refresh_from_db()
        assert company.plan == Company.PLAN_ACTIVE, (
            "Company should be activated after subscription.activated with custom_data"
        )

        # PaddleSubscription should have been created
        sub = PaddleSubscription.objects.filter(
            company=company,
            paddle_subscription_id=new_sub_id,
        ).first()
        assert sub is not None, "PaddleSubscription should be created for new company link"
        assert sub.status == PaddleSubscription.STATUS_ACTIVE

    def test_invalid_company_id_in_custom_data_skipped(self, api_client):
        """
        subscription.activated with invalid company_id in custom_data → skipped, no crash.
        """
        payload = _make_event_payload(
            "subscription.activated",
            subscription_id="sub_invalid_company_001",
            event_id="evt_invalid_company_001",
        )
        payload["data"]["custom_data"] = {"company_id": "999999"}  # non-existent

        resp = _post_webhook(api_client, payload)
        assert resp.status_code == 200  # Always 200, never retry

        event = PaddleWebhookEvent.objects.get(event_id="evt_invalid_company_001")
        assert event.status == PaddleWebhookEvent.STATUS_SKIPPED

    def test_missing_custom_data_skipped(self, api_client):
        """
        subscription.activated with no existing sub and no custom_data → skipped.
        """
        payload = _make_event_payload(
            "subscription.activated",
            subscription_id="sub_no_custom_data_001",
            event_id="evt_no_custom_data_001",
        )
        # Ensure no custom_data in payload
        payload["data"].pop("custom_data", None)

        resp = _post_webhook(api_client, payload)
        assert resp.status_code == 200

        event = PaddleWebhookEvent.objects.get(event_id="evt_no_custom_data_001")
        assert event.status == PaddleWebhookEvent.STATUS_SKIPPED

    def test_custom_data_tier_from_price_id(self, api_client, company):
        """
        custom_data linking respects price ID → tier mapping.
        """
        payload = _make_event_payload(
            "subscription.activated",
            subscription_id="sub_custom_tier_001",
            event_id="evt_custom_tier_001",
            price_id="pri_pro_test",
        )
        payload["data"]["custom_data"] = {"company_id": str(company.id)}

        resp = _post_webhook(api_client, payload)
        assert resp.status_code == 200

        company.refresh_from_db()
        assert company.plan == Company.PLAN_ACTIVE
        assert company.plan_tier == Company.TIER_PRO

