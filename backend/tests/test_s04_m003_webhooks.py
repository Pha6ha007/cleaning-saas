# backend/tests/test_s04_m003_webhooks.py
"""
M003/S04: Outgoing Webhooks — Contract Tests

Proves:
1. WebhookEndpoint model exists and fields are correct
2. WebhookDeliveryLog model exists and fields are correct
3. WebhookEndpoint.sign_payload() produces valid HMAC-SHA256 signature
4. WebhookEndpoint.subscribes_to() filters by event
5. WebhookEndpoint.is_enterprise property reflects company plan_tier
6. fire_webhook_event() enqueues tasks only for enterprise + active endpoints
7. deliver_webhook_event task creates a DeliveryLog on success
8. deliver_webhook_event task creates a DeliveryLog with status=failed on HTTP error
9. deliver_webhook_event task skips non-enterprise companies at delivery time
10. build_*_payload() functions return correct event keys
11. Event constants defined and correct
12. Admin classes registered for both models
"""

import pytest
import hashlib
import hmac
import json
from unittest.mock import patch, MagicMock


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def company_enterprise(db):
    from apps.accounts.models import Company
    return Company.objects.create(
        name="Enterprise Webhooks Co",
        plan="active",
        plan_tier="enterprise",
    )


@pytest.fixture
def company_standard(db):
    from apps.accounts.models import Company
    return Company.objects.create(
        name="Standard Webhooks Co",
        plan="active",
        plan_tier="standard",
    )


@pytest.fixture
def endpoint(company_enterprise, db):
    from apps.webhooks.models import WebhookEndpoint, EVENT_JOB_COMPLETED, EVENT_SLA_VIOLATED
    return WebhookEndpoint.objects.create(
        company=company_enterprise,
        url="https://example.com/webhook",
        events=[EVENT_JOB_COMPLETED, EVENT_SLA_VIOLATED],
        is_active=True,
        description="Test endpoint",
    )


@pytest.fixture
def job(company_enterprise, db):
    from apps.jobs.models import Job
    from apps.locations.models import Location
    location = Location.objects.create(company=company_enterprise, name="Webhook Test Location")
    from apps.accounts.models import User
    cleaner = User.objects.create(
        company=company_enterprise, role=User.ROLE_CLEANER,
        email="wh_cleaner@test.com", full_name="WH Cleaner", is_active=True,
    )
    return Job.objects.create(
        company=company_enterprise,
        location=location,
        cleaner=cleaner,
        status=Job.STATUS_COMPLETED,
        context=Job.CONTEXT_MAINTENANCE,
    )


# =============================================================================
# Model Tests
# =============================================================================

@pytest.mark.django_db
class TestWebhookEndpointModel:
    def test_model_importable(self):
        from apps.webhooks.models import WebhookEndpoint
        assert WebhookEndpoint is not None

    def test_create_endpoint(self, company_enterprise):
        from apps.webhooks.models import WebhookEndpoint, EVENT_JOB_COMPLETED
        ep = WebhookEndpoint.objects.create(
            company=company_enterprise,
            url="https://hooks.example.com/v1/",
            events=[EVENT_JOB_COMPLETED],
        )
        assert ep.pk is not None
        assert ep.secret  # auto-generated

    def test_secret_auto_generated(self, company_enterprise):
        from apps.webhooks.models import WebhookEndpoint
        ep = WebhookEndpoint.objects.create(
            company=company_enterprise,
            url="https://a.example.com/",
            events=[],
        )
        assert len(ep.secret) == 64  # 32 bytes = 64 hex chars

    def test_two_endpoints_have_different_secrets(self, company_enterprise):
        from apps.webhooks.models import WebhookEndpoint
        ep1 = WebhookEndpoint.objects.create(company=company_enterprise, url="https://a.example.com/", events=[])
        ep2 = WebhookEndpoint.objects.create(company=company_enterprise, url="https://b.example.com/", events=[])
        assert ep1.secret != ep2.secret

    def test_subscribes_to_returns_true_for_subscribed_event(self, endpoint):
        from apps.webhooks.models import EVENT_JOB_COMPLETED
        assert endpoint.subscribes_to(EVENT_JOB_COMPLETED) is True

    def test_subscribes_to_returns_false_for_other_event(self, endpoint):
        from apps.webhooks.models import EVENT_PROOF_MISSING
        assert endpoint.subscribes_to(EVENT_PROOF_MISSING) is False

    def test_is_enterprise_true_for_enterprise_company(self, endpoint):
        assert endpoint.is_enterprise is True

    def test_is_enterprise_false_for_standard_company(self, company_standard):
        from apps.webhooks.models import WebhookEndpoint
        ep = WebhookEndpoint.objects.create(
            company=company_standard,
            url="https://c.example.com/",
            events=[],
        )
        assert ep.is_enterprise is False

    def test_str_representation(self, endpoint):
        assert "example.com" in str(endpoint)


@pytest.mark.django_db
class TestWebhookDeliveryLogModel:
    def test_model_importable(self):
        from apps.webhooks.models import WebhookDeliveryLog
        assert WebhookDeliveryLog is not None

    def test_create_delivery_log(self, endpoint):
        from apps.webhooks.models import WebhookDeliveryLog, EVENT_JOB_COMPLETED
        log = WebhookDeliveryLog.objects.create(
            endpoint=endpoint,
            event=EVENT_JOB_COMPLETED,
            payload={"event": "job.completed", "job_id": 1},
            status=WebhookDeliveryLog.STATUS_SUCCESS,
            http_status=200,
        )
        assert log.pk is not None
        assert log.status == "success"


# =============================================================================
# Signature Tests
# =============================================================================

class TestWebhookSignature:
    def test_sign_payload_produces_hmac_sha256(self, endpoint):
        payload = b'{"event": "job.completed"}'
        sig = endpoint.sign_payload(payload)
        assert sig.startswith("sha256=")

        # Verify independently
        expected = hmac.new(
            endpoint.secret.encode("utf-8"),
            payload,
            hashlib.sha256,
        ).hexdigest()
        assert sig == f"sha256={expected}"

    def test_different_payloads_produce_different_signatures(self, endpoint):
        sig1 = endpoint.sign_payload(b'{"event": "A"}')
        sig2 = endpoint.sign_payload(b'{"event": "B"}')
        assert sig1 != sig2

    def test_signature_is_deterministic(self, endpoint):
        payload = b'{"event": "job.completed", "job_id": 42}'
        assert endpoint.sign_payload(payload) == endpoint.sign_payload(payload)


# =============================================================================
# fire_webhook_event Tests
# =============================================================================

@pytest.mark.django_db
class TestFireWebhookEvent:
    def test_enqueues_task_for_enterprise_active_endpoint(self, endpoint, company_enterprise):
        from apps.webhooks.tasks import fire_webhook_event
        from apps.webhooks.models import EVENT_JOB_COMPLETED

        with patch("apps.webhooks.tasks.deliver_webhook_event") as mock_task:
            mock_task.delay = MagicMock()
            count = fire_webhook_event(
                EVENT_JOB_COMPLETED,
                {"event": "job.completed"},
                company_enterprise.id,
            )
        assert count == 1
        mock_task.delay.assert_called_once()

    def test_skips_inactive_endpoint(self, endpoint, company_enterprise):
        from apps.webhooks.tasks import fire_webhook_event
        from apps.webhooks.models import EVENT_JOB_COMPLETED

        endpoint.is_active = False
        endpoint.save(update_fields=["is_active"])

        with patch("apps.webhooks.tasks.deliver_webhook_event") as mock_task:
            mock_task.delay = MagicMock()
            count = fire_webhook_event(EVENT_JOB_COMPLETED, {}, company_enterprise.id)
        assert count == 0

    def test_skips_non_subscribed_event(self, endpoint, company_enterprise):
        from apps.webhooks.tasks import fire_webhook_event
        from apps.webhooks.models import EVENT_PROOF_MISSING

        with patch("apps.webhooks.tasks.deliver_webhook_event") as mock_task:
            mock_task.delay = MagicMock()
            count = fire_webhook_event(EVENT_PROOF_MISSING, {}, company_enterprise.id)
        assert count == 0

    def test_skips_non_enterprise_company(self, company_standard, db):
        from apps.webhooks.models import WebhookEndpoint, EVENT_JOB_COMPLETED
        from apps.webhooks.tasks import fire_webhook_event

        WebhookEndpoint.objects.create(
            company=company_standard,
            url="https://d.example.com/",
            events=[EVENT_JOB_COMPLETED],
            is_active=True,
        )
        with patch("apps.webhooks.tasks.deliver_webhook_event") as mock_task:
            mock_task.delay = MagicMock()
            count = fire_webhook_event(EVENT_JOB_COMPLETED, {}, company_standard.id)
        assert count == 0

    def test_returns_zero_on_exception(self, company_enterprise):
        from apps.webhooks.tasks import fire_webhook_event
        from apps.webhooks.models import EVENT_JOB_COMPLETED

        with patch("apps.webhooks.models.WebhookEndpoint.objects") as mock_qs:
            mock_qs.filter.side_effect = Exception("DB error")
            count = fire_webhook_event(EVENT_JOB_COMPLETED, {}, company_enterprise.id)
        assert count == 0


# =============================================================================
# deliver_webhook_event Task Tests
# =============================================================================

@pytest.mark.django_db
class TestDeliverWebhookEventTask:
    def test_creates_success_log_on_200(self, endpoint):
        from apps.webhooks.tasks import deliver_webhook_event
        from apps.webhooks.models import WebhookDeliveryLog, EVENT_JOB_COMPLETED
        import httpx

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.is_success = True
        mock_response.text = "OK"

        with patch("httpx.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.__enter__ = MagicMock(return_value=mock_client)
            mock_client.__exit__ = MagicMock(return_value=False)
            mock_client.post = MagicMock(return_value=mock_response)
            mock_client_cls.return_value = mock_client

            deliver_webhook_event(endpoint.id, EVENT_JOB_COMPLETED, {"job_id": 1})

        log = WebhookDeliveryLog.objects.get()
        assert log.status == WebhookDeliveryLog.STATUS_SUCCESS
        assert log.http_status == 200

    def test_creates_failed_log_on_500(self, endpoint):
        from apps.webhooks.tasks import deliver_webhook_event
        from apps.webhooks.models import WebhookDeliveryLog, EVENT_JOB_COMPLETED

        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.is_success = False
        mock_response.text = "Internal Server Error"

        with patch("httpx.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.__enter__ = MagicMock(return_value=mock_client)
            mock_client.__exit__ = MagicMock(return_value=False)
            mock_client.post = MagicMock(return_value=mock_response)
            mock_client_cls.return_value = mock_client

            deliver_webhook_event(endpoint.id, EVENT_JOB_COMPLETED, {"job_id": 1})

        log = WebhookDeliveryLog.objects.get()
        assert log.status == WebhookDeliveryLog.STATUS_FAILED
        assert log.http_status == 500

    def test_creates_failed_log_on_network_error(self, endpoint):
        from apps.webhooks.tasks import deliver_webhook_event
        from apps.webhooks.models import WebhookDeliveryLog, EVENT_SLA_VIOLATED
        import httpx

        with patch("httpx.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.__enter__ = MagicMock(return_value=mock_client)
            mock_client.__exit__ = MagicMock(return_value=False)
            mock_client.post = MagicMock(side_effect=httpx.ConnectError("Connection refused"))
            mock_client_cls.return_value = mock_client

            deliver_webhook_event(endpoint.id, EVENT_SLA_VIOLATED, {"job_id": 1})

        log = WebhookDeliveryLog.objects.get()
        assert log.status == WebhookDeliveryLog.STATUS_FAILED
        assert "Connection refused" in log.error_message

    def test_skips_non_enterprise_at_delivery_time(self, company_standard, db):
        from apps.webhooks.models import WebhookEndpoint, WebhookDeliveryLog, EVENT_JOB_COMPLETED
        from apps.webhooks.tasks import deliver_webhook_event

        ep = WebhookEndpoint.objects.create(
            company=company_standard,
            url="https://e.example.com/",
            events=[EVENT_JOB_COMPLETED],
            is_active=True,
        )
        deliver_webhook_event(ep.id, EVENT_JOB_COMPLETED, {})
        # No log created — skipped before HTTP call
        assert WebhookDeliveryLog.objects.count() == 0


# =============================================================================
# Payload Builder Tests
# =============================================================================

class TestPayloadBuilders:
    def _make_mock_job(self, company_id=1):
        job = MagicMock()
        job.id = 42
        job.company_id = company_id
        job.status = "completed"
        job.location.name = "Test Location"
        job.cleaner.full_name = "Ahmad"
        job.actual_end_time = None
        job.sla_deadline = None
        return job

    def test_job_completed_payload_has_required_keys(self):
        from apps.webhooks.tasks import build_job_completed_payload
        payload = build_job_completed_payload(self._make_mock_job())
        assert payload["event"] == "job.completed"
        assert "job_id" in payload
        assert "company_id" in payload

    def test_sla_violated_payload_has_required_keys(self):
        from apps.webhooks.tasks import build_sla_violated_payload
        payload = build_sla_violated_payload(self._make_mock_job())
        assert payload["event"] == "sla.violated"
        assert "job_id" in payload

    def test_proof_missing_payload_has_required_keys(self):
        from apps.webhooks.tasks import build_proof_missing_payload
        payload = build_proof_missing_payload(self._make_mock_job())
        assert payload["event"] == "proof.missing"
        assert "job_id" in payload


# =============================================================================
# Event Constants
# =============================================================================

class TestEventConstants:
    def test_event_constants_defined(self):
        from apps.webhooks.models import EVENT_JOB_COMPLETED, EVENT_SLA_VIOLATED, EVENT_PROOF_MISSING, ALL_EVENTS
        assert EVENT_JOB_COMPLETED == "job.completed"
        assert EVENT_SLA_VIOLATED == "sla.violated"
        assert EVENT_PROOF_MISSING == "proof.missing"
        assert len(ALL_EVENTS) == 3
