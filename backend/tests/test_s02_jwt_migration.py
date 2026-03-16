# backend/tests/test_s02_jwt_migration.py
"""
S02: Manager Portal JWT Migration — Contract Tests

Proves:
1. JWT Bearer tokens are accepted on manager views (after S02 view-level update)
2. Token auth still works on the same views (coexistence guaranteed)
3. Cleaner-only views reject JWT (remain Token-only)
4. Unauthenticated requests are rejected on all manager views
"""

import pytest
from django.urls import reverse
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from apps.accounts.models import Company, User


@pytest.fixture(autouse=True)
def _disable_throttling(settings):
    """High throttle rate + clear cache for all tests in this module."""
    settings.REST_FRAMEWORK = {
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_RATES": {"anon": "1000/minute", "user": "1000/minute"},
    }
    from django.core.cache import cache
    cache.clear()


@pytest.fixture
def company(db):
    return Company.objects.create(name="S02 Test Company")


@pytest.fixture
def owner(company):
    user = User.objects.create(
        company=company,
        role=User.ROLE_OWNER,
        email="s02_owner@test.com",
        full_name="S02 Owner",
        is_active=True,
    )
    user.set_password("SecurePass123!")
    user.save()
    return user


@pytest.fixture
def manager(company):
    user = User.objects.create(
        company=company,
        role=User.ROLE_MANAGER,
        email="s02_manager@test.com",
        full_name="S02 Manager",
        is_active=True,
    )
    user.set_password("SecurePass123!")
    user.save()
    return user


@pytest.fixture
def cleaner(company):
    user = User.objects.create(
        company=company,
        role=User.ROLE_CLEANER,
        email="s02_cleaner@test.com",
        phone="0501234568",
        full_name="S02 Cleaner",
        is_active=True,
    )
    user.set_password("SecurePass123!")
    user.save()
    return user


@pytest.fixture
def api_client():
    return APIClient()


def _get_jwt_access(api_client, email, password="SecurePass123!"):
    """Helper: login via JWT endpoint, return access token."""
    resp = api_client.post(
        reverse("api-jwt-login"),
        {"email": email, "password": password},
        format="json",
    )
    assert resp.status_code == 200, f"JWT login failed: {resp.json()}"
    return resp.json()["access"]


def _get_token(user):
    """Helper: get or create DRF Token for user."""
    token, _ = Token.objects.get_or_create(user=user)
    return token.key


# ---------------------------------------------------------------------------
# Manager Jobs — JWT Bearer accepted
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestJWTOnManagerJobsViews:
    """views_manager_jobs.py — JWT Bearer should now work."""

    def test_jwt_bearer_on_manager_jobs_today(self, api_client, manager):
        access = _get_jwt_access(api_client, "s02_manager@test.com")
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = api_client.get(reverse("manager-jobs-today"))
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.content}"

    def test_jwt_bearer_on_manager_jobs_active(self, api_client, manager):
        access = _get_jwt_access(api_client, "s02_manager@test.com")
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = api_client.get(reverse("manager-jobs-active"))
        assert resp.status_code == 200

    def test_token_still_works_on_manager_jobs_today(self, api_client, manager):
        """Token auth must remain functional — mobile coexistence."""
        token_key = _get_token(manager)
        api_client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")
        resp = api_client.get(reverse("manager-jobs-today"))
        assert resp.status_code == 200

    def test_token_still_works_on_manager_jobs_active(self, api_client, manager):
        token_key = _get_token(manager)
        api_client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")
        resp = api_client.get(reverse("manager-jobs-active"))
        assert resp.status_code == 200

    def test_unauthenticated_rejected_on_manager_jobs(self, api_client):
        api_client.credentials()
        resp = api_client.get(reverse("manager-jobs-today"))
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Manager Company — JWT Bearer accepted
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestJWTOnManagerCompanyViews:
    """views_manager_company.py — JWT Bearer should now work."""

    def test_jwt_bearer_on_manager_company(self, api_client, manager):
        access = _get_jwt_access(api_client, "s02_manager@test.com")
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = api_client.get(reverse("manager-company"))
        assert resp.status_code == 200

    def test_token_still_works_on_manager_company(self, api_client, manager):
        token_key = _get_token(manager)
        api_client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")
        resp = api_client.get(reverse("manager-company"))
        assert resp.status_code == 200

    def test_unauthenticated_rejected_on_manager_company(self, api_client):
        api_client.credentials()
        resp = api_client.get(reverse("manager-company"))
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Reports — JWT Bearer accepted
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestJWTOnReportsViews:
    """views_reports.py — JWT Bearer should now work."""

    def test_jwt_bearer_on_weekly_report(self, api_client, owner):
        access = _get_jwt_access(api_client, "s02_owner@test.com")
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = api_client.get(reverse("manager-reports-weekly"))
        assert resp.status_code == 200

    def test_jwt_bearer_on_monthly_report(self, api_client, owner):
        access = _get_jwt_access(api_client, "s02_owner@test.com")
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = api_client.get(reverse("manager-reports-monthly"))
        assert resp.status_code == 200

    def test_token_still_works_on_weekly_report(self, api_client, owner):
        token_key = _get_token(owner)
        api_client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")
        resp = api_client.get(reverse("manager-reports-weekly"))
        assert resp.status_code == 200

    def test_unauthenticated_rejected_on_reports(self, api_client):
        api_client.credentials()
        resp = api_client.get(reverse("manager-reports-weekly"))
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Maintenance Views — JWT Bearer accepted
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestJWTOnMaintenanceViews:
    """views_maintenance.py — JWT Bearer should now work."""

    def test_jwt_bearer_on_service_visits(self, api_client, manager):
        access = _get_jwt_access(api_client, "s02_manager@test.com")
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = api_client.get(reverse("manager-service-visits"))
        assert resp.status_code == 200

    def test_token_still_works_on_service_visits(self, api_client, manager):
        token_key = _get_token(manager)
        api_client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")
        resp = api_client.get(reverse("manager-service-visits"))
        assert resp.status_code == 200

    def test_unauthenticated_rejected_on_maintenance(self, api_client):
        api_client.credentials()
        resp = api_client.get(reverse("manager-service-visits"))
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Company Views — JWT Bearer accepted
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestJWTOnCompanyViews:
    """views_company.py — JWT Bearer should now work."""

    def test_jwt_bearer_on_company_profile(self, api_client, manager):
        access = _get_jwt_access(api_client, "s02_manager@test.com")
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = api_client.get(reverse("company-profile"))
        assert resp.status_code == 200

    def test_token_still_works_on_company_profile(self, api_client, manager):
        token_key = _get_token(manager)
        api_client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")
        resp = api_client.get(reverse("company-profile"))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Cleaner Views — must remain Token-only (JWT rejected)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCleanerViewsRemainTokenOnly:
    """
    views_cleaner.py was NOT updated — cleaner endpoints should reject JWT.

    The cleaner app (mobile) uses Token auth only.
    JWT should not be accepted on these views — they explicitly use [TokenAuthentication].
    """

    def test_cleaner_checkin_rejects_jwt(self, api_client, cleaner):
        """A JWT Bearer token should not authenticate on cleaner-only endpoints."""
        # First get a JWT for the cleaner user via the general login
        # (Note: cleaner cannot use JWT manager login, so we create a token manually)
        from rest_framework_simplejwt.tokens import AccessToken

        # Manually create an access token for the cleaner (bypassing manager-only login check)
        token = AccessToken.for_user(cleaner)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token)}")

        # The cleaner job list is a cleaner-only endpoint
        resp = api_client.get(reverse("jobs-today"))
        # Should be 401 because the view only accepts TokenAuthentication
        assert resp.status_code == 401, (
            f"Cleaner view accepted JWT — it should only accept Token auth. "
            f"Got {resp.status_code}: {resp.content}"
        )

    def test_cleaner_checkin_accepts_token(self, api_client, cleaner):
        """Token auth still works on cleaner endpoints."""
        token_key = _get_token(cleaner)
        api_client.credentials(HTTP_AUTHORIZATION=f"Token {token_key}")
        resp = api_client.get(reverse("jobs-today"))
        assert resp.status_code == 200
