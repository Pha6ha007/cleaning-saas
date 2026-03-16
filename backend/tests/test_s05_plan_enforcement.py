# backend/tests/test_s05_plan_enforcement.py
"""
S05: Trial Enforcement & Upgrade Flow — Contract Tests

Proves:
1. ActivePlanPermission — blocks write methods for expired/blocked companies
2. ActivePlanPermission — always allows safe methods (GET/HEAD/OPTIONS)
3. ActivePlanPermission — allows writes for active companies
4. ActivePlanPermission — allows writes for active trial companies
5. Maintenance _check_write_access — blocks writes and returns correct code/detail
"""

import pytest
from datetime import timedelta
from django.utils import timezone
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

from apps.accounts.models import Company, User


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture(autouse=True)
def _disable_throttling(settings):
    settings.REST_FRAMEWORK = {
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_RATES": {"anon": "1000/minute", "user": "1000/minute"},
    }
    from django.core.cache import cache
    cache.clear()


@pytest.fixture
def active_company(db):
    return Company.objects.create(name="S05 Active Company", plan=Company.PLAN_ACTIVE)


@pytest.fixture
def trial_company(db):
    """Company in active trial (not yet expired)."""
    company = Company.objects.create(name="S05 Trial Company", plan=Company.PLAN_TRIAL)
    company.trial_started_at = timezone.now() - timedelta(days=1)
    company.trial_expires_at = timezone.now() + timedelta(days=6)
    company.save(update_fields=["trial_started_at", "trial_expires_at"])
    return company


@pytest.fixture
def expired_trial_company(db):
    """Company with expired trial."""
    company = Company.objects.create(name="S05 Expired Trial Company", plan=Company.PLAN_TRIAL)
    company.trial_started_at = timezone.now() - timedelta(days=10)
    company.trial_expires_at = timezone.now() - timedelta(days=3)
    company.save(update_fields=["trial_started_at", "trial_expires_at"])
    return company


@pytest.fixture
def blocked_company(db):
    """Company explicitly blocked."""
    return Company.objects.create(name="S05 Blocked Company", plan=Company.PLAN_BLOCKED)


def _make_owner(company, email_suffix=""):
    user = User.objects.create(
        company=company,
        role=User.ROLE_OWNER,
        email=f"s05_owner{email_suffix}@test.com",
        full_name="S05 Owner",
        is_active=True,
    )
    user.set_password("SecurePass123!")
    user.save()
    return user


@pytest.fixture
def active_owner(active_company):
    return _make_owner(active_company, "_active")


@pytest.fixture
def trial_owner(trial_company):
    return _make_owner(trial_company, "_trial")


@pytest.fixture
def expired_trial_owner(expired_trial_company):
    return _make_owner(expired_trial_company, "_expired")


@pytest.fixture
def blocked_owner(blocked_company):
    return _make_owner(blocked_company, "_blocked")


@pytest.fixture
def api_client():
    return APIClient()


def _auth(client, user):
    token, _ = Token.objects.get_or_create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")


# =============================================================================
# ActivePlanPermission Tests
# =============================================================================


@pytest.mark.django_db
class TestActivePlanPermission:
    """
    Tests for ActivePlanPermission via maintenance endpoint (AssetTypeListCreateView).
    Using /api/maintenance/asset-types/ which uses MaintenancePermissionMixin._check_write_access.
    """

    def _post_asset_type(self, client) -> int:
        """POST to asset-types create endpoint, return status code."""
        return client.post(
            reverse("manager-asset-types"),
            {"name": "Test Type S05", "description": "test"},
            format="json",
        ).status_code

    def _get_asset_types(self, client) -> int:
        """GET asset-types list, return status code."""
        return client.get(reverse("manager-asset-types")).status_code

    def test_active_company_write_allowed(self, api_client, active_owner):
        """Active company: POST allowed."""
        _auth(api_client, active_owner)
        status_code = self._post_asset_type(api_client)
        assert status_code in (200, 201), f"Expected 200/201, got {status_code}"

    def test_active_trial_company_write_allowed(self, api_client, trial_owner):
        """Trial-active company: POST allowed (trial not yet expired)."""
        _auth(api_client, trial_owner)
        status_code = self._post_asset_type(api_client)
        assert status_code in (200, 201), f"Expected 200/201, got {status_code}"

    def test_expired_trial_blocks_write(self, api_client, expired_trial_owner):
        """Trial-expired company: POST blocked with trial_expired code."""
        _auth(api_client, expired_trial_owner)
        resp = api_client.post(
            reverse("manager-asset-types"),
            {"name": "Should Fail", "description": "test"},
            format="json",
        )
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        data = resp.json()
        assert data.get("code") == "trial_expired", (
            f"Expected code='trial_expired', got: {data}"
        )

    def test_blocked_company_blocks_write(self, api_client, blocked_owner):
        """Blocked company: POST blocked with company_blocked code."""
        _auth(api_client, blocked_owner)
        resp = api_client.post(
            reverse("manager-asset-types"),
            {"name": "Should Fail", "description": "test"},
            format="json",
        )
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        data = resp.json()
        assert data.get("code") == "company_blocked", (
            f"Expected code='company_blocked', got: {data}"
        )

    def test_expired_trial_get_allowed(self, api_client, expired_trial_owner):
        """Trial-expired company: GET always allowed (read-only preserved)."""
        _auth(api_client, expired_trial_owner)
        status_code = self._get_asset_types(api_client)
        assert status_code == 200, f"Expected 200, got {status_code}"

    def test_blocked_company_get_allowed(self, api_client, blocked_owner):
        """Blocked company: GET always allowed (read-only preserved)."""
        _auth(api_client, blocked_owner)
        status_code = self._get_asset_types(api_client)
        assert status_code == 200, f"Expected 200, got {status_code}"

    def test_unauthenticated_rejected(self, api_client):
        """Unauthenticated request rejected (auth permission)."""
        status_code = self._post_asset_type(api_client)
        assert status_code in (401, 403)


# =============================================================================
# ActivePlanPermission Class Tests (unit)
# =============================================================================


@pytest.mark.django_db
class TestActivePlanPermissionUnit:
    """Unit tests for the ActivePlanPermission class directly."""

    def test_permission_class_exists(self):
        """ActivePlanPermission can be imported and instantiated."""
        from apps.api.permissions import ActivePlanPermission
        perm = ActivePlanPermission()
        assert perm is not None

    def test_message_is_dict_on_denial(self, expired_trial_owner):
        """Permission sets dict message with 'code' key when denying."""
        from apps.api.permissions import ActivePlanPermission
        from unittest.mock import MagicMock
        perm = ActivePlanPermission()
        request = MagicMock()
        request.method = "POST"
        request.user = expired_trial_owner
        result = perm.has_permission(request, None)
        assert result is False
        assert isinstance(perm.message, dict)
        assert perm.message.get("code") == "trial_expired"

    def test_safe_method_always_returns_true(self, expired_trial_owner):
        """GET method returns True even for blocked company."""
        from apps.api.permissions import ActivePlanPermission
        from unittest.mock import MagicMock
        perm = ActivePlanPermission()
        request = MagicMock()
        request.method = "GET"
        request.user = expired_trial_owner
        result = perm.has_permission(request, None)
        assert result is True
