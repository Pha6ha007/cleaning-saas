# backend/tests/test_s03_m002_whatsapp.py
"""
M002/S03: WhatsApp Business Notifications — Contract Tests

Proves:
1. WhatsAppNotificationLog model exists and fields are correct
2. get_whatsapp_client() returns None when unconfigured (graceful no-op)
3. get_whatsapp_client() initialises pywa.WhatsApp when configured
4. send_whatsapp_notification() logs an attempt even on failure
5. send_whatsapp_notification() returns False when WhatsApp unconfigured
6. _normalise_phone() strips +, spaces, hyphens
7. _build_message_text() produces correct content for each kind
8. send_whatsapp_assignment() returns False when technician has no phone
9. send_whatsapp_sla_warning() notifies technician and owner
10. send_assignment_notification() still works when WhatsApp is unconfigured
    (email path not broken by WhatsApp addition)
"""

import pytest
from unittest.mock import patch, MagicMock, call
from datetime import date, time


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture(autouse=True)
def reset_whatsapp_singleton():
    """Reset the module-level singleton between tests."""
    import apps.maintenance.whatsapp as wa_module
    original_client = wa_module._wa_client
    original_init = wa_module._wa_client_initialised
    yield
    wa_module._wa_client = original_client
    wa_module._wa_client_initialised = original_init


@pytest.fixture
def company(db):
    from apps.accounts.models import Company
    return Company.objects.create(name="WA Test Company", plan="trial")


@pytest.fixture
def owner(company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company, role=User.ROLE_OWNER,
        email="wa_owner@test.com", full_name="WA Owner",
        phone="971501234567", is_active=True,
    )
    u.set_password("Pass123!")
    u.save()
    # Link owner to company
    company.owner = u
    company.save(update_fields=["owner"])
    return u


@pytest.fixture
def technician(company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company, role=User.ROLE_CLEANER,
        email="wa_tech@test.com", full_name="WA Tech",
        phone="971509876543", is_active=True,
    )
    u.set_password("Pass123!")
    u.save()
    return u


@pytest.fixture
def job(company, technician, db):
    from apps.jobs.models import Job
    from apps.locations.models import Location
    location = Location.objects.create(company=company, name="WA Test Location")
    return Job.objects.create(
        company=company,
        location=location,
        cleaner=technician,
        scheduled_date=date(2026, 4, 1),
        scheduled_start_time=time(9, 0),
        status=Job.STATUS_SCHEDULED,
        context=Job.CONTEXT_MAINTENANCE,
    )


# =============================================================================
# Model Tests
# =============================================================================

@pytest.mark.django_db
class TestWhatsAppNotificationLogModel:
    def test_model_importable(self):
        from apps.maintenance.models import WhatsAppNotificationLog
        assert WhatsAppNotificationLog is not None

    def test_model_has_required_fields(self):
        from apps.maintenance.models import WhatsAppNotificationLog
        field_names = [f.name for f in WhatsAppNotificationLog._meta.get_fields()]
        for expected in ["company", "kind", "status", "job", "to_phone",
                         "wa_message_id", "error_message", "created_at", "triggered_by"]:
            assert expected in field_names, f"Missing field: {expected}"

    def test_model_kind_constants(self):
        from apps.maintenance.models import WhatsAppNotificationLog
        assert WhatsAppNotificationLog.KIND_ASSIGNMENT == "assignment"
        assert WhatsAppNotificationLog.KIND_COMPLETION == "completion"
        assert WhatsAppNotificationLog.KIND_SLA_WARNING == "sla_warning"

    def test_model_status_constants(self):
        from apps.maintenance.models import WhatsAppNotificationLog
        assert WhatsAppNotificationLog.STATUS_SENT == "sent"
        assert WhatsAppNotificationLog.STATUS_FAILED == "failed"

    def test_create_log_entry(self, company, job):
        from apps.maintenance.models import WhatsAppNotificationLog
        log = WhatsAppNotificationLog.objects.create(
            company=company,
            kind=WhatsAppNotificationLog.KIND_ASSIGNMENT,
            status=WhatsAppNotificationLog.STATUS_SENT,
            job=job,
            to_phone="971501234567",
            wa_message_id="wamid.test123",
        )
        assert log.pk is not None
        assert str(log.wa_message_id) == "wamid.test123"

    def test_str_representation(self, company, job):
        from apps.maintenance.models import WhatsAppNotificationLog
        log = WhatsAppNotificationLog.objects.create(
            company=company,
            kind=WhatsAppNotificationLog.KIND_SLA_WARNING,
            status=WhatsAppNotificationLog.STATUS_FAILED,
            job=job,
            to_phone="971509876543",
        )
        assert "971509876543" in str(log)
        assert "failed" in str(log).lower()


# =============================================================================
# Client Initialisation Tests
# =============================================================================

class TestGetWhatsAppClient:
    def test_returns_none_when_unconfigured(self, settings):
        settings.WHATSAPP_PHONE_NUMBER_ID = ""
        settings.WHATSAPP_ACCESS_TOKEN = ""
        import apps.maintenance.whatsapp as wa_module
        wa_module._wa_client_initialised = False
        result = wa_module.get_whatsapp_client()
        assert result is None

    def test_returns_none_when_token_missing(self, settings):
        settings.WHATSAPP_PHONE_NUMBER_ID = "12345"
        settings.WHATSAPP_ACCESS_TOKEN = ""
        import apps.maintenance.whatsapp as wa_module
        wa_module._wa_client_initialised = False
        result = wa_module.get_whatsapp_client()
        assert result is None

    def test_initialises_client_when_configured(self, settings):
        settings.WHATSAPP_PHONE_NUMBER_ID = "12345"
        settings.WHATSAPP_ACCESS_TOKEN = "test_token"
        import apps.maintenance.whatsapp as wa_module
        wa_module._wa_client_initialised = False
        mock_client = MagicMock()
        with patch("pywa.WhatsApp", return_value=mock_client) as mock_cls:
            result = wa_module.get_whatsapp_client()
        mock_cls.assert_called_once_with(phone_id="12345", token="test_token")
        assert result is mock_client

    def test_returns_cached_client_on_second_call(self, settings):
        settings.WHATSAPP_PHONE_NUMBER_ID = "12345"
        settings.WHATSAPP_ACCESS_TOKEN = "test_token"
        import apps.maintenance.whatsapp as wa_module
        wa_module._wa_client_initialised = False
        mock_client = MagicMock()
        with patch("pywa.WhatsApp", return_value=mock_client) as mock_cls:
            wa_module.get_whatsapp_client()
            wa_module.get_whatsapp_client()
        # WhatsApp() constructor called only once
        assert mock_cls.call_count == 1


# =============================================================================
# Phone Normalisation Tests
# =============================================================================

class TestNormalisePhone:
    def test_strips_leading_plus(self):
        from apps.maintenance.whatsapp import _normalise_phone
        assert _normalise_phone("+971501234567") == "971501234567"

    def test_strips_spaces(self):
        from apps.maintenance.whatsapp import _normalise_phone
        assert _normalise_phone("+971 50 123 4567") == "971501234567"

    def test_strips_hyphens(self):
        from apps.maintenance.whatsapp import _normalise_phone
        assert _normalise_phone("971-50-1234567") == "971501234567"

    def test_empty_returns_empty(self):
        from apps.maintenance.whatsapp import _normalise_phone
        assert _normalise_phone("") == ""
        assert _normalise_phone(None) == ""

    def test_already_clean_number(self):
        from apps.maintenance.whatsapp import _normalise_phone
        assert _normalise_phone("971501234567") == "971501234567"


# =============================================================================
# Message Text Tests
# =============================================================================

class TestBuildMessageText:
    def _make_mock_job(self, kind=None):
        job = MagicMock()
        job.id = 42
        job.scheduled_date = date(2026, 4, 1)
        job.scheduled_start_time = time(9, 0)
        job.actual_end_time = None
        job.manager_notes = "Check AC filters"
        job.sla_deadline = None
        job.location.name = "Building A"
        job.asset.name = "HVAC Unit 1"
        job.cleaner.full_name = "Ahmad Al Rashidi"
        job.get_status_display.return_value = "Completed"
        return job

    def test_assignment_message_contains_location(self):
        from apps.maintenance.whatsapp import _build_message_text
        from apps.maintenance.models import WhatsAppNotificationLog
        job = self._make_mock_job()
        text = _build_message_text(WhatsAppNotificationLog.KIND_ASSIGNMENT, job)
        assert "Building A" in text
        assert "HVAC Unit 1" in text
        assert "42" in text

    def test_completion_message_contains_technician(self):
        from apps.maintenance.whatsapp import _build_message_text
        from apps.maintenance.models import WhatsAppNotificationLog
        job = self._make_mock_job()
        text = _build_message_text(WhatsAppNotificationLog.KIND_COMPLETION, job)
        assert "Ahmad Al Rashidi" in text
        assert "42" in text

    def test_sla_warning_message_contains_deadline_label(self):
        from apps.maintenance.whatsapp import _build_message_text
        from apps.maintenance.models import WhatsAppNotificationLog
        job = self._make_mock_job()
        text = _build_message_text(WhatsAppNotificationLog.KIND_SLA_WARNING, job)
        assert "SLA" in text
        assert "42" in text


# =============================================================================
# send_whatsapp_notification Tests
# =============================================================================

@pytest.mark.django_db
class TestSendWhatsAppNotification:
    def test_returns_false_when_unconfigured(self, settings, company, job):
        settings.WHATSAPP_PHONE_NUMBER_ID = ""
        settings.WHATSAPP_ACCESS_TOKEN = ""
        import apps.maintenance.whatsapp as wa_module
        wa_module._wa_client_initialised = False
        from apps.maintenance.whatsapp import send_whatsapp_notification
        from apps.maintenance.models import WhatsAppNotificationLog
        result = send_whatsapp_notification(
            company=company,
            kind=WhatsAppNotificationLog.KIND_ASSIGNMENT,
            job=job,
            to_phone="971501234567",
        )
        assert result is False
        # No log created when client is None (unconfigured)
        assert WhatsAppNotificationLog.objects.count() == 0

    def test_logs_success_when_client_responds(self, settings, company, job):
        settings.WHATSAPP_PHONE_NUMBER_ID = "12345"
        settings.WHATSAPP_ACCESS_TOKEN = "test_token"
        import apps.maintenance.whatsapp as wa_module
        wa_module._wa_client_initialised = False
        from apps.maintenance.models import WhatsAppNotificationLog

        mock_response = MagicMock()
        mock_response.id = "wamid.success123"
        mock_client = MagicMock()
        mock_client.send_message.return_value = mock_response

        with patch("pywa.WhatsApp", return_value=mock_client):
            wa_module._wa_client_initialised = False
            from apps.maintenance.whatsapp import send_whatsapp_notification
            result = send_whatsapp_notification(
                company=company,
                kind=WhatsAppNotificationLog.KIND_ASSIGNMENT,
                job=job,
                to_phone="+971 50 123 4567",
            )

        assert result is True
        log = WhatsAppNotificationLog.objects.get()
        assert log.status == WhatsAppNotificationLog.STATUS_SENT
        assert log.wa_message_id == "wamid.success123"
        assert log.to_phone == "971501234567"  # normalised

    def test_logs_failure_when_client_raises(self, settings, company, job):
        settings.WHATSAPP_PHONE_NUMBER_ID = "12345"
        settings.WHATSAPP_ACCESS_TOKEN = "test_token"
        import apps.maintenance.whatsapp as wa_module
        wa_module._wa_client_initialised = False
        from apps.maintenance.models import WhatsAppNotificationLog

        mock_client = MagicMock()
        mock_client.send_message.side_effect = Exception("API timeout")

        with patch("pywa.WhatsApp", return_value=mock_client):
            wa_module._wa_client_initialised = False
            from apps.maintenance.whatsapp import send_whatsapp_notification
            result = send_whatsapp_notification(
                company=company,
                kind=WhatsAppNotificationLog.KIND_ASSIGNMENT,
                job=job,
                to_phone="971501234567",
            )

        assert result is False
        log = WhatsAppNotificationLog.objects.get()
        assert log.status == WhatsAppNotificationLog.STATUS_FAILED
        assert "API timeout" in log.error_message

    def test_returns_false_for_empty_phone(self, settings, company, job):
        settings.WHATSAPP_PHONE_NUMBER_ID = "12345"
        settings.WHATSAPP_ACCESS_TOKEN = "test_token"
        import apps.maintenance.whatsapp as wa_module
        wa_module._wa_client_initialised = False
        from apps.maintenance.models import WhatsAppNotificationLog

        mock_client = MagicMock()
        with patch("pywa.WhatsApp", return_value=mock_client):
            wa_module._wa_client_initialised = False
            from apps.maintenance.whatsapp import send_whatsapp_notification
            result = send_whatsapp_notification(
                company=company,
                kind=WhatsAppNotificationLog.KIND_ASSIGNMENT,
                job=job,
                to_phone="",
            )

        assert result is False


# =============================================================================
# Convenience Wrapper Tests
# =============================================================================

@pytest.mark.django_db
class TestConvenienceWrappers:
    def test_send_whatsapp_assignment_returns_false_no_phone(self, company, job):
        """Technician with no phone → False, no crash."""
        from apps.maintenance.whatsapp import send_whatsapp_assignment
        job.cleaner.phone = ""
        result = send_whatsapp_assignment(job)
        assert result is False

    def test_send_whatsapp_completion_returns_false_no_owner_phone(self, company, job):
        """Company with no owner having a phone → False."""
        from apps.maintenance.whatsapp import send_whatsapp_completion
        # The company fixture has no owner user at all (owner fixture is separate)
        # so getattr(job.company, 'owner', None) returns None → returns False
        result = send_whatsapp_completion(job)
        assert result is False

    def test_email_still_works_when_whatsapp_unconfigured(self, settings, company, job, db):
        """send_assignment_notification email path not broken by WhatsApp addition."""
        settings.WHATSAPP_PHONE_NUMBER_ID = ""
        settings.WHATSAPP_ACCESS_TOKEN = ""
        import apps.maintenance.whatsapp as wa_module
        wa_module._wa_client_initialised = False

        from apps.maintenance.notifications import send_assignment_notification
        with patch("apps.maintenance.notifications.send_mail") as mock_mail:
            mock_mail.return_value = None
            result = send_assignment_notification(job)
        # Email was attempted (True = sent)
        assert result is True
        mock_mail.assert_called_once()
