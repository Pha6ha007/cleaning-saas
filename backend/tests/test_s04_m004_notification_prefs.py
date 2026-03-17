# backend/tests/test_s04_m004_notification_prefs.py
"""
M004/S04: Notification Preferences — Contract Tests

Proves:
1. GET /api/user/notification-preferences/ requires authentication
2. GET returns full preferences dict with defaults
3. PATCH updates individual fields and returns updated prefs
4. PATCH with invalid boolean type returns 400
5. PATCH with invalid frequency returns 400
6. PATCH with invalid time format returns 400
7. PATCH with empty body returns 400
8. quiet_hours: is_in_quiet_hours returns False when disabled
9. quiet_hours: is_in_quiet_hours returns True during quiet hours (mocked time)
10. quiet_hours: overnight range handled correctly (22:00-07:00)
11. send_maintenance_notification skips when email_enabled=False
12. send_maintenance_notification skips when in quiet hours
13. Preferences are user-scoped (different users have different prefs)
14. PATCH is a partial update (unset keys retain defaults)
"""

import pytest
from unittest.mock import patch, MagicMock
from rest_framework.test import APIClient


URL = "/api/user/notification-preferences/"


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def company(db):
    from apps.accounts.models import Company
    return Company.objects.create(name="Prefs Test Co", plan="active")


@pytest.fixture
def manager(company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company, role=User.ROLE_OWNER,
        email="prefs_mgr@test.com", full_name="Prefs Manager", is_active=True,
        notification_preferences={},
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def manager2(company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company, role=User.ROLE_MANAGER,
        email="prefs_mgr2@test.com", full_name="Prefs Manager 2", is_active=True,
        notification_preferences={},
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def auth_client(manager):
    client = APIClient()
    client.force_authenticate(user=manager)
    return client


@pytest.fixture
def auth_client2(manager2):
    client = APIClient()
    client.force_authenticate(user=manager2)
    return client


# =============================================================================
# Auth Tests
# =============================================================================

@pytest.mark.django_db
class TestNotificationPrefsAuth:
    def test_unauthenticated_get_returns_401(self):
        resp = APIClient().get(URL)
        assert resp.status_code == 401

    def test_unauthenticated_patch_returns_401(self):
        resp = APIClient().patch(URL, {}, format="json")
        assert resp.status_code == 401


# =============================================================================
# GET Tests
# =============================================================================

@pytest.mark.django_db
class TestNotificationPrefsGet:
    def test_returns_200(self, auth_client):
        resp = auth_client.get(URL)
        assert resp.status_code == 200

    def test_returns_all_default_keys(self, auth_client):
        resp = auth_client.get(URL)
        data = resp.json()
        assert "email_enabled" in data
        assert "whatsapp_enabled" in data
        assert "job_assignment" in data
        assert "sla_warning" in data
        assert "completion" in data
        assert "frequency" in data
        assert "quiet_hours_enabled" in data
        assert "quiet_hours_start" in data
        assert "quiet_hours_end" in data
        assert "weekly_summary" in data

    def test_email_enabled_default_is_true(self, auth_client):
        resp = auth_client.get(URL)
        assert resp.json()["email_enabled"] is True

    def test_whatsapp_enabled_default_is_false(self, auth_client):
        resp = auth_client.get(URL)
        assert resp.json()["whatsapp_enabled"] is False

    def test_quiet_hours_disabled_by_default(self, auth_client):
        resp = auth_client.get(URL)
        assert resp.json()["quiet_hours_enabled"] is False

    def test_default_quiet_hours_start_is_2200(self, auth_client):
        resp = auth_client.get(URL)
        assert resp.json()["quiet_hours_start"] == "22:00"

    def test_default_quiet_hours_end_is_0700(self, auth_client):
        resp = auth_client.get(URL)
        assert resp.json()["quiet_hours_end"] == "07:00"


# =============================================================================
# PATCH Tests
# =============================================================================

@pytest.mark.django_db
class TestNotificationPrefsPatch:
    def test_patch_returns_200(self, auth_client):
        resp = auth_client.patch(URL, {"email_enabled": False}, format="json")
        assert resp.status_code == 200

    def test_patch_updates_email_enabled(self, auth_client):
        auth_client.patch(URL, {"email_enabled": False}, format="json")
        resp = auth_client.get(URL)
        assert resp.json()["email_enabled"] is False

    def test_patch_updates_whatsapp_enabled(self, auth_client):
        auth_client.patch(URL, {"whatsapp_enabled": True}, format="json")
        resp = auth_client.get(URL)
        assert resp.json()["whatsapp_enabled"] is True

    def test_patch_updates_frequency(self, auth_client):
        auth_client.patch(URL, {"frequency": "daily_digest"}, format="json")
        resp = auth_client.get(URL)
        assert resp.json()["frequency"] == "daily_digest"

    def test_patch_updates_quiet_hours_enabled(self, auth_client):
        auth_client.patch(URL, {"quiet_hours_enabled": True}, format="json")
        resp = auth_client.get(URL)
        assert resp.json()["quiet_hours_enabled"] is True

    def test_patch_updates_quiet_hours_times(self, auth_client):
        auth_client.patch(URL, {
            "quiet_hours_start": "23:30",
            "quiet_hours_end": "06:00",
        }, format="json")
        resp = auth_client.get(URL)
        assert resp.json()["quiet_hours_start"] == "23:30"
        assert resp.json()["quiet_hours_end"] == "06:00"

    def test_patch_is_partial_update(self, auth_client):
        """Unset keys retain their defaults after partial PATCH."""
        auth_client.patch(URL, {"email_enabled": False}, format="json")
        resp = auth_client.get(URL)
        data = resp.json()
        # Other keys still at defaults
        assert data["whatsapp_enabled"] is False
        assert data["frequency"] == "immediate"
        assert data["quiet_hours_enabled"] is False

    def test_patch_invalid_boolean_returns_400(self, auth_client):
        resp = auth_client.patch(URL, {"email_enabled": "yes"}, format="json")
        assert resp.status_code == 400
        assert resp.json()["code"] == "VALIDATION_ERROR"

    def test_patch_invalid_frequency_returns_400(self, auth_client):
        resp = auth_client.patch(URL, {"frequency": "hourly"}, format="json")
        assert resp.status_code == 400
        assert resp.json()["code"] == "VALIDATION_ERROR"

    def test_patch_invalid_time_format_returns_400(self, auth_client):
        resp = auth_client.patch(URL, {"quiet_hours_start": "25:99"}, format="json")
        assert resp.status_code == 400
        assert resp.json()["code"] == "VALIDATION_ERROR"

    def test_patch_empty_body_returns_400(self, auth_client):
        resp = auth_client.patch(URL, {}, format="json")
        assert resp.status_code == 400
        assert resp.json()["code"] == "EMPTY_BODY"


# =============================================================================
# Quiet Hours Logic Tests
# =============================================================================

@pytest.mark.django_db
class TestQuietHoursLogic:
    def test_quiet_hours_disabled_returns_false(self, manager):
        from apps.api.views_user_prefs import is_in_quiet_hours
        manager.notification_preferences = {"quiet_hours_enabled": False}
        manager.save()
        assert is_in_quiet_hours(manager) is False

    def test_quiet_hours_enabled_during_quiet_period(self, manager):
        """Mock time to 23:00 Dubai — inside 22:00-07:00 quiet range."""
        from apps.api.views_user_prefs import is_in_quiet_hours
        from datetime import datetime, timezone as dt_tz
        from zoneinfo import ZoneInfo
        manager.notification_preferences = {
            "quiet_hours_enabled": True,
            "quiet_hours_start": "22:00",
            "quiet_hours_end": "07:00",
        }
        manager.save()
        dubai_tz = ZoneInfo("Asia/Dubai")
        fake_now_local = datetime(2026, 1, 15, 23, 0, 0, tzinfo=dubai_tz)
        with patch("apps.api.views_user_prefs.timezone") as mock_tz:
            mock_tz.now.return_value = fake_now_local
            result = is_in_quiet_hours(manager)
        assert result is True

    def test_quiet_hours_enabled_outside_quiet_period(self, manager):
        """Mock time to 14:00 Dubai — outside 22:00-07:00 quiet range."""
        from apps.api.views_user_prefs import is_in_quiet_hours
        from datetime import datetime
        from zoneinfo import ZoneInfo
        manager.notification_preferences = {
            "quiet_hours_enabled": True,
            "quiet_hours_start": "22:00",
            "quiet_hours_end": "07:00",
        }
        manager.save()
        dubai_tz = ZoneInfo("Asia/Dubai")
        fake_now_local = datetime(2026, 1, 15, 14, 0, 0, tzinfo=dubai_tz)
        with patch("apps.api.views_user_prefs.timezone") as mock_tz:
            mock_tz.now.return_value = fake_now_local
            result = is_in_quiet_hours(manager)
        assert result is False

    def test_quiet_hours_early_morning_inside_range(self, manager):
        """Mock time to 06:00 Dubai — inside overnight 22:00-07:00 range."""
        from apps.api.views_user_prefs import is_in_quiet_hours
        from datetime import datetime
        from zoneinfo import ZoneInfo
        manager.notification_preferences = {
            "quiet_hours_enabled": True,
            "quiet_hours_start": "22:00",
            "quiet_hours_end": "07:00",
        }
        manager.save()
        dubai_tz = ZoneInfo("Asia/Dubai")
        fake_now_local = datetime(2026, 1, 16, 6, 0, 0, tzinfo=dubai_tz)
        with patch("apps.api.views_user_prefs.timezone") as mock_tz:
            mock_tz.now.return_value = fake_now_local
            result = is_in_quiet_hours(manager)
        assert result is True


# =============================================================================
# Integration: notifications respect preferences
# =============================================================================

@pytest.mark.django_db
class TestNotificationPrefsIntegration:
    def test_email_disabled_skips_send(self, manager, company):
        """send_maintenance_notification returns False when email_enabled=False."""
        from apps.maintenance.notifications import send_maintenance_notification
        from apps.maintenance.models import MaintenanceNotificationLog
        manager.notification_preferences = {"email_enabled": False}
        manager.save()

        with patch("apps.maintenance.notifications.send_mail") as mock_send:
            result = send_maintenance_notification(
                company=company,
                kind=MaintenanceNotificationLog.KIND_ASSIGNMENT,
                job=MagicMock(
                    id=1, location=MagicMock(name="L"),
                    scheduled_date=None, actual_end_time=None,
                ),
                to_email=manager.email,
                recipient_user=manager,
            )
        assert result is False
        mock_send.assert_not_called()

    def test_quiet_hours_skips_send(self, manager, company):
        """send_maintenance_notification returns False during quiet hours."""
        from apps.maintenance.notifications import send_maintenance_notification
        from apps.maintenance.models import MaintenanceNotificationLog
        manager.notification_preferences = {
            "email_enabled": True,
            "quiet_hours_enabled": True,
            "quiet_hours_start": "22:00",
            "quiet_hours_end": "07:00",
        }
        manager.save()

        with patch("apps.api.views_user_prefs.is_in_quiet_hours", return_value=True):
            with patch("apps.maintenance.notifications.send_mail") as mock_send:
                result = send_maintenance_notification(
                    company=company,
                    kind=MaintenanceNotificationLog.KIND_ASSIGNMENT,
                    job=MagicMock(
                        id=1, location=MagicMock(name="L"),
                        scheduled_date=None, actual_end_time=None,
                    ),
                    to_email=manager.email,
                    recipient_user=manager,
                )
        assert result is False
        mock_send.assert_not_called()


# =============================================================================
# User Isolation Tests
# =============================================================================

@pytest.mark.django_db
class TestNotificationPrefsIsolation:
    def test_user1_changes_dont_affect_user2(self, auth_client, auth_client2):
        auth_client.patch(URL, {"email_enabled": False}, format="json")
        resp = auth_client2.get(URL)
        assert resp.json()["email_enabled"] is True  # user2 still at default

    def test_each_user_has_independent_preferences(self, auth_client, auth_client2):
        auth_client.patch(URL, {"frequency": "daily_digest"}, format="json")
        auth_client2.patch(URL, {"frequency": "immediate"}, format="json")
        resp1 = auth_client.get(URL)
        resp2 = auth_client2.get(URL)
        assert resp1.json()["frequency"] == "daily_digest"
        assert resp2.json()["frequency"] == "immediate"
