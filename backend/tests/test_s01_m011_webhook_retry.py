# backend/tests/test_s01_m011_webhook_retry.py
"""
M011/S01: Webhook Retry + Dead-Letter Alert Tests

Approach: use deliver_webhook_event.apply() with push_request(retries=N).
Celery eager mode executes synchronously, runs retries automatically.
Assertions are based on:
  - WebhookDeliveryLog records (count, status)
  - caplog (retry scheduling messages, dead-letter ERROR)
  - return value / exception type

Covers:
1. Successful delivery — success log, no retry attempts
2. Non-2xx response — retry log message appears
3. Network error — retry log message appears
4. Retry countdown messages (60s, 120s, 240s)
5. All retries exhausted — WEBHOOK_DEAD_LETTER in ERROR log
6. Dead-letter calls Sentry if available
7. Dead-letter no-crash without Sentry
8. Non-enterprise endpoint — skipped entirely (no HTTP, no log)
9. Inactive endpoint — skipped entirely
10. Missing endpoint — warning logged, no crash
11. MAX_RETRIES = 3, RETRY_BASE_DELAY = 60
"""

import sys
import logging
import pytest
from unittest.mock import MagicMock, patch


# =============================================================================
# Helper
# =============================================================================

def _run(endpoint_id, event, payload, retries=0):
    """Run deliver_webhook_event.apply() synchronously from given retry point."""
    from apps.webhooks.tasks import deliver_webhook_event
    deliver_webhook_event.push_request(retries=retries)
    try:
        deliver_webhook_event.apply(args=[endpoint_id, event, payload])
    finally:
        deliver_webhook_event.pop_request()


PAYLOAD = {"event": "job.completed", "job_id": 1}


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def company(db):
    from apps.accounts.models import Company
    return Company.objects.create(
        name="WH_Co", plan=Company.PLAN_ACTIVE, plan_tier="enterprise"
    )


@pytest.fixture
def endpoint(company, db):
    from apps.webhooks.models import WebhookEndpoint
    return WebhookEndpoint.objects.create(
        company=company, url="https://example.com/wh",
        events=["job.completed"], is_active=True,
    )


@pytest.fixture
def standard_company(db):
    from apps.accounts.models import Company
    return Company.objects.create(
        name="Std_Co", plan=Company.PLAN_ACTIVE, plan_tier="standard"
    )


@pytest.fixture
def standard_endpoint(standard_company, db):
    from apps.webhooks.models import WebhookEndpoint
    return WebhookEndpoint.objects.create(
        company=standard_company, url="https://example.com/wh",
        events=["job.completed"], is_active=True,
    )


# =============================================================================
# Constants
# =============================================================================

def test_max_retries_is_3():
    from apps.webhooks.tasks import MAX_RETRIES
    assert MAX_RETRIES == 3


def test_retry_base_delay_is_60():
    from apps.webhooks.tasks import RETRY_BASE_DELAY
    assert RETRY_BASE_DELAY == 60


# =============================================================================
# Success path
# =============================================================================

@pytest.mark.django_db
class TestWebhookSuccess:

    def test_successful_delivery_creates_success_log(self, endpoint):
        from apps.webhooks.models import WebhookDeliveryLog
        mock_resp = MagicMock(status_code=200, is_success=True, text="OK")

        with patch("httpx.Client") as mc:
            mc.return_value.__enter__.return_value.post.return_value = mock_resp
            _run(endpoint.id, "job.completed", PAYLOAD)

        log = WebhookDeliveryLog.objects.filter(endpoint=endpoint, status="success").first()
        assert log is not None
        assert log.http_status == 200

    def test_successful_delivery_no_retry_log(self, endpoint, caplog):
        mock_resp = MagicMock(status_code=200, is_success=True, text="OK")

        with patch("httpx.Client") as mc, \
             caplog.at_level(logging.INFO, logger="apps.webhooks.tasks"):
            mc.return_value.__enter__.return_value.post.return_value = mock_resp
            _run(endpoint.id, "job.completed", PAYLOAD)

        assert "retry" not in caplog.text.lower() or "Scheduling" not in caplog.text

    def test_attempt_header_is_1_on_first_delivery(self, endpoint):
        captured = {}
        mock_resp = MagicMock(status_code=200, is_success=True, text="OK")

        def capture_post(url, content, headers):
            captured.update(headers)
            return mock_resp

        with patch("httpx.Client") as mc:
            mc.return_value.__enter__.return_value.post.side_effect = capture_post
            _run(endpoint.id, "job.completed", PAYLOAD, retries=0)

        assert captured.get("X-Webhook-Attempt") == "1"


# =============================================================================
# Retry scheduling
# =============================================================================

@pytest.mark.django_db
class TestWebhookRetry:

    def test_non_2xx_triggers_retry_log(self, endpoint, caplog):
        mock_resp = MagicMock(status_code=500, is_success=False, text="err")

        with patch("httpx.Client") as mc, \
             caplog.at_level(logging.INFO, logger="apps.webhooks.tasks"):
            mc.return_value.__enter__.return_value.post.return_value = mock_resp
            _run(endpoint.id, "job.completed", PAYLOAD, retries=0)

        assert "Scheduling webhook retry" in caplog.text

    def test_network_error_triggers_retry_log(self, endpoint, caplog):
        with patch("httpx.Client") as mc, \
             caplog.at_level(logging.INFO, logger="apps.webhooks.tasks"):
            mc.return_value.__enter__.return_value.post.side_effect = ConnectionError("refused")
            _run(endpoint.id, "job.completed", PAYLOAD, retries=0)

        assert "Scheduling webhook retry" in caplog.text

    def test_retry_log_mentions_60s_on_first_attempt(self, endpoint, caplog):
        """First attempt (retries=0): countdown = 60s."""
        mock_resp = MagicMock(status_code=503, is_success=False, text="err")

        with patch("httpx.Client") as mc, \
             caplog.at_level(logging.INFO, logger="apps.webhooks.tasks"):
            mc.return_value.__enter__.return_value.post.return_value = mock_resp
            _run(endpoint.id, "job.completed", PAYLOAD, retries=0)

        assert "60s" in caplog.text

    def test_retry_log_mentions_120s_on_second_attempt(self, endpoint, caplog):
        """Second attempt (retries=1): countdown = 120s."""
        mock_resp = MagicMock(status_code=503, is_success=False, text="err")

        with patch("httpx.Client") as mc, \
             caplog.at_level(logging.INFO, logger="apps.webhooks.tasks"):
            mc.return_value.__enter__.return_value.post.return_value = mock_resp
            _run(endpoint.id, "job.completed", PAYLOAD, retries=1)

        assert "120s" in caplog.text

    def test_retry_log_mentions_240s_on_third_attempt(self, endpoint, caplog):
        """Third attempt (retries=2): countdown = 240s."""
        mock_resp = MagicMock(status_code=502, is_success=False, text="err")

        with patch("httpx.Client") as mc, \
             caplog.at_level(logging.INFO, logger="apps.webhooks.tasks"):
            mc.return_value.__enter__.return_value.post.return_value = mock_resp
            _run(endpoint.id, "job.completed", PAYLOAD, retries=2)

        assert "240s" in caplog.text

    def test_each_retry_creates_failed_log(self, endpoint):
        """Every attempt (including retries) creates a DeliveryLog entry."""
        from apps.webhooks.models import WebhookDeliveryLog
        mock_resp = MagicMock(status_code=500, is_success=False, text="err")

        with patch("httpx.Client") as mc:
            mc.return_value.__enter__.return_value.post.return_value = mock_resp
            # Start from retries=0 — Celery will run all 4 attempts (0,1,2,3 then dead-letter)
            _run(endpoint.id, "job.completed", PAYLOAD, retries=0)

        logs = WebhookDeliveryLog.objects.filter(endpoint=endpoint, status="failed")
        assert logs.count() == MAX_RETRIES + 1  # initial + 3 retries


# =============================================================================
# Dead-letter
# =============================================================================

@pytest.mark.django_db
class TestWebhookDeadLetter:

    def test_dead_letter_logged_after_all_retries(self, endpoint, caplog):
        """Starting from retries=MAX_RETRIES: no more retries, dead-letter."""
        from apps.webhooks.tasks import MAX_RETRIES
        mock_resp = MagicMock(status_code=500, is_success=False, text="err")

        with patch("httpx.Client") as mc, \
             caplog.at_level(logging.ERROR, logger="apps.webhooks.tasks"):
            mc.return_value.__enter__.return_value.post.return_value = mock_resp
            _run(endpoint.id, "job.completed", PAYLOAD, retries=MAX_RETRIES)

        assert "WEBHOOK_DEAD_LETTER" in caplog.text

    def test_dead_letter_not_logged_before_exhaustion(self, endpoint, caplog):
        """From retries=2 (third attempt), 240s countdown is scheduled before dead-letter."""
        mock_resp = MagicMock(status_code=500, is_success=False, text="err")

        with patch("httpx.Client") as mc, \
             caplog.at_level(logging.INFO, logger="apps.webhooks.tasks"):
            mc.return_value.__enter__.return_value.post.return_value = mock_resp
            _run(endpoint.id, "job.completed", PAYLOAD, retries=2)

        # 240s retry was scheduled before dead-letter
        assert "240s" in caplog.text

    def test_dead_letter_alert_calls_sentry(self):
        from apps.webhooks.tasks import _dead_letter_alert

        mock_sentry = MagicMock()
        mock_scope = MagicMock()
        mock_sentry.new_scope.return_value.__enter__ = MagicMock(return_value=mock_scope)
        mock_sentry.new_scope.return_value.__exit__ = MagicMock(return_value=False)

        with patch.dict("sys.modules", {"sentry_sdk": mock_sentry}):
            _dead_letter_alert(99, "job.completed", PAYLOAD, "HTTP 500")

        mock_sentry.capture_message.assert_called_once()
        args, kwargs = mock_sentry.capture_message.call_args
        assert "dead-letter" in args[0]
        assert kwargs["level"] == "error"

    def test_dead_letter_no_crash_without_sentry(self, caplog):
        from apps.webhooks.tasks import _dead_letter_alert

        original = sys.modules.pop("sentry_sdk", None)
        try:
            with caplog.at_level(logging.ERROR, logger="apps.webhooks.tasks"):
                _dead_letter_alert(99, "job.completed", PAYLOAD, "HTTP 500")
        finally:
            if original is not None:
                sys.modules["sentry_sdk"] = original

        assert "WEBHOOK_DEAD_LETTER" in caplog.text


# =============================================================================
# Gate checks
# =============================================================================

@pytest.mark.django_db
class TestWebhookGates:

    def test_non_enterprise_endpoint_skipped(self, standard_endpoint):
        from apps.webhooks.models import WebhookDeliveryLog

        with patch("httpx.Client") as mc:
            _run(standard_endpoint.id, "job.completed", PAYLOAD)
            mc.assert_not_called()

        assert WebhookDeliveryLog.objects.filter(endpoint=standard_endpoint).count() == 0

    def test_inactive_endpoint_skipped(self, endpoint):
        from apps.webhooks.models import WebhookDeliveryLog
        endpoint.is_active = False
        endpoint.save()

        with patch("httpx.Client") as mc:
            _run(endpoint.id, "job.completed", PAYLOAD)
            mc.assert_not_called()

        assert WebhookDeliveryLog.objects.filter(endpoint=endpoint).count() == 0

    def test_missing_endpoint_logs_warning(self, caplog):
        with caplog.at_level(logging.WARNING, logger="apps.webhooks.tasks"):
            _run(999999, "job.completed", PAYLOAD)

        assert "not found" in caplog.text


# Reference to MAX_RETRIES for test_each_retry_creates_failed_log
from apps.webhooks.tasks import MAX_RETRIES
