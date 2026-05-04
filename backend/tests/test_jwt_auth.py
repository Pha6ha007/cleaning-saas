# backend/tests/test_jwt_auth.py
"""
JWT Authentication Tests for Proof Platform.

Tests cover:
- JWT login (manager/owner/staff success, cleaner rejected, wrong password)
- JWT refresh (token rotation, blacklisting of old refresh)
- JWT logout (blacklist refresh token)
- Custom claims in access token (role, company_id, email)
- Token auth coexistence (Token auth still works on protected endpoints)
- must_change_password enforcement
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.models import Company, User

pytestmark = pytest.mark.security


@pytest.fixture(autouse=True)
def _disable_throttling(settings):
    """Set high throttle rate and clear cache for all tests in this module."""
    settings.REST_FRAMEWORK = {
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_RATES": {"anon": "1000/minute", "user": "1000/minute"},
    }
    # Clear throttle cache between tests
    from django.core.cache import cache
    cache.clear()


@pytest.fixture
def company(db):
    return Company.objects.create(name="Test Company")


@pytest.fixture
def owner(company):
    user = User.objects.create(
        company=company,
        role=User.ROLE_OWNER,
        email="owner@test.com",
        full_name="Test Owner",
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
        email="manager@test.com",
        full_name="Test Manager",
        is_active=True,
    )
    user.set_password("SecurePass123!")
    user.save()
    return user


@pytest.fixture
def staff_user(company):
    user = User.objects.create(
        company=company,
        role=User.ROLE_STAFF,
        email="staff@test.com",
        full_name="Test Staff",
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
        email="cleaner@test.com",
        phone="0501234567",
        full_name="Test Cleaner",
        is_active=True,
    )
    user.set_password("SecurePass123!")
    user.save()
    return user


@pytest.fixture
def api_client():
    return APIClient()


# ---------------------------------------------------------------------------
# JWT Login Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestJWTLogin:
    url = reverse("api-jwt-login")

    def test_manager_login_success(self, api_client, manager):
        resp = api_client.post(
            self.url,
            {"email": "manager@test.com", "password": "SecurePass123!"},
            format="json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access" in data
        assert "refresh" in data
        assert data["user_id"] == manager.id
        assert data["email"] == "manager@test.com"
        assert data["full_name"] == "Test Manager"
        assert data["role"] == "manager"

    def test_owner_login_success(self, api_client, owner):
        resp = api_client.post(
            self.url,
            {"email": "owner@test.com", "password": "SecurePass123!"},
            format="json",
        )
        assert resp.status_code == 200
        assert "access" in resp.json()

    def test_staff_login_success(self, api_client, staff_user):
        resp = api_client.post(
            self.url,
            {"email": "staff@test.com", "password": "SecurePass123!"},
            format="json",
        )
        assert resp.status_code == 200
        assert "access" in resp.json()

    def test_cleaner_login_rejected(self, api_client, cleaner):
        """Cleaner role should not be able to use the manager JWT login."""
        resp = api_client.post(
            self.url,
            {"email": "cleaner@test.com", "password": "SecurePass123!"},
            format="json",
        )
        assert resp.status_code == 401

    def test_wrong_password(self, api_client, manager):
        resp = api_client.post(
            self.url,
            {"email": "manager@test.com", "password": "WrongPass!"},
            format="json",
        )
        assert resp.status_code == 401

    def test_nonexistent_user(self, api_client, company):
        resp = api_client.post(
            self.url,
            {"email": "nobody@test.com", "password": "SecurePass123!"},
            format="json",
        )
        assert resp.status_code == 401

    def test_inactive_user(self, api_client, company):
        user = User.objects.create(
            company=company,
            role=User.ROLE_MANAGER,
            email="inactive@test.com",
            full_name="Inactive User",
            is_active=False,
        )
        user.set_password("SecurePass123!")
        user.save()

        resp = api_client.post(
            self.url,
            {"email": "inactive@test.com", "password": "SecurePass123!"},
            format="json",
        )
        assert resp.status_code == 401

    def test_must_change_password(self, api_client, company):
        user = User.objects.create(
            company=company,
            role=User.ROLE_MANAGER,
            email="mustchange@test.com",
            full_name="Must Change",
            is_active=True,
            must_change_password=True,
        )
        user.set_password("SecurePass123!")
        user.save()

        resp = api_client.post(
            self.url,
            {"email": "mustchange@test.com", "password": "SecurePass123!"},
            format="json",
        )
        assert resp.status_code == 403
        assert resp.json()["code"] == "PASSWORD_CHANGE_REQUIRED"

    def test_missing_email(self, api_client):
        resp = api_client.post(
            self.url,
            {"password": "SecurePass123!"},
            format="json",
        )
        assert resp.status_code == 400

    def test_missing_password(self, api_client):
        resp = api_client.post(
            self.url,
            {"email": "manager@test.com"},
            format="json",
        )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# JWT Custom Claims Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestJWTCustomClaims:

    def test_access_token_has_custom_claims(self, api_client, owner):
        resp = api_client.post(
            reverse("api-jwt-login"),
            {"email": "owner@test.com", "password": "SecurePass123!"},
            format="json",
        )
        assert resp.status_code == 200
        access_token = resp.json()["access"]

        # Decode the access token and check custom claims
        decoded = AccessToken(access_token)
        assert decoded["role"] == "owner"
        assert int(decoded["company_id"]) == owner.company_id
        assert decoded["email"] == "owner@test.com"
        assert int(decoded["user_id"]) == owner.id


# ---------------------------------------------------------------------------
# JWT Refresh Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestJWTRefresh:
    login_url = reverse("api-jwt-login")
    refresh_url = reverse("api-jwt-refresh")

    def test_refresh_returns_new_tokens(self, api_client, manager):
        # Login first
        login_resp = api_client.post(
            self.login_url,
            {"email": "manager@test.com", "password": "SecurePass123!"},
            format="json",
        )
        refresh_token = login_resp.json()["refresh"]

        # Refresh
        resp = api_client.post(
            self.refresh_url,
            {"refresh": refresh_token},
            format="json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access" in data
        # With ROTATE_REFRESH_TOKENS=True, a new refresh token is returned
        assert "refresh" in data
        # New tokens should be different
        assert data["refresh"] != refresh_token

    def test_old_refresh_blacklisted_after_rotation(self, api_client, manager):
        # Login
        login_resp = api_client.post(
            self.login_url,
            {"email": "manager@test.com", "password": "SecurePass123!"},
            format="json",
        )
        old_refresh = login_resp.json()["refresh"]

        # First refresh — should work and rotate
        resp1 = api_client.post(
            self.refresh_url,
            {"refresh": old_refresh},
            format="json",
        )
        assert resp1.status_code == 200

        # Second refresh with the OLD token — should fail (blacklisted)
        resp2 = api_client.post(
            self.refresh_url,
            {"refresh": old_refresh},
            format="json",
        )
        assert resp2.status_code == 401


# ---------------------------------------------------------------------------
# JWT Logout Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestJWTLogout:
    login_url = reverse("api-jwt-login")
    refresh_url = reverse("api-jwt-refresh")
    logout_url = reverse("api-jwt-logout")

    def test_logout_blacklists_refresh(self, api_client, manager):
        # Login
        login_resp = api_client.post(
            self.login_url,
            {"email": "manager@test.com", "password": "SecurePass123!"},
            format="json",
        )
        data = login_resp.json()
        access_token = data["access"]
        refresh_token = data["refresh"]

        # Logout (requires authentication)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        resp = api_client.post(
            self.logout_url,
            {"refresh": refresh_token},
            format="json",
        )
        assert resp.status_code == 200

        # Try to refresh with the blacklisted token
        api_client.credentials()  # Clear auth
        resp2 = api_client.post(
            self.refresh_url,
            {"refresh": refresh_token},
            format="json",
        )
        assert resp2.status_code == 401

    def test_logout_without_refresh_token(self, api_client, manager):
        # Login
        login_resp = api_client.post(
            self.login_url,
            {"email": "manager@test.com", "password": "SecurePass123!"},
            format="json",
        )
        access_token = login_resp.json()["access"]

        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        resp = api_client.post(self.logout_url, {}, format="json")
        assert resp.status_code == 400

    def test_logout_unauthenticated(self, api_client):
        resp = api_client.post(
            self.logout_url,
            {"refresh": "fake-token"},
            format="json",
        )
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Token Auth Coexistence Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestTokenCoexistence:
    """Verify that Token auth (for mobile) still works alongside JWT."""

    def test_token_auth_on_protected_endpoint(self, api_client, manager):
        """Token auth should still work on existing endpoints."""
        from rest_framework.authtoken.models import Token

        token, _ = Token.objects.get_or_create(user=manager)

        api_client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        # Use a known protected endpoint (explicitly uses TokenAuthentication)
        resp = api_client.get(reverse("manager-company"))
        assert resp.status_code == 200

    def test_jwt_auth_works_programmatically(self, api_client, manager):
        """JWT Bearer token authenticates a user correctly.

        Note: Most existing views explicitly set authentication_classes=[TokenAuthentication],
        overriding the global DRF setting. JWT works at the settings level and will be
        enabled per-view during the S02 frontend migration. This test verifies the JWT
        authentication backend itself works correctly.
        """
        # Get JWT tokens
        login_resp = api_client.post(
            reverse("api-jwt-login"),
            {"email": "manager@test.com", "password": "SecurePass123!"},
            format="json",
        )
        assert login_resp.status_code == 200
        access_token = login_resp.json()["access"]

        # Verify JWT authentication backend resolves the user
        from rest_framework_simplejwt.authentication import JWTAuthentication
        from rest_framework_simplejwt.tokens import AccessToken

        validated_token = AccessToken(access_token)
        jwt_auth = JWTAuthentication()
        user = jwt_auth.get_user(validated_token)
        assert user.id == manager.id
        assert user.email == manager.email

    def test_no_auth_rejected(self, api_client):
        """Unauthenticated request to protected endpoint should fail."""
        resp = api_client.get(reverse("manager-company"))
        assert resp.status_code in (401, 403)
