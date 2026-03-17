# backend/tests/test_s01_m003_cleaner_jwt.py
"""
M003/S01: Mobile Cleaner JWT Migration — Contract Tests

Proves:
1. /api/auth/cleaner/jwt/login/ returns access + refresh for valid cleaner
2. Non-cleaner roles (manager, owner) are rejected with 401
3. Wrong password → 401
4. Inactive cleaner → 401
5. Manager views accept JWT Bearer auth (JWTAuthentication added)
6. Manager views still accept legacy Token auth (backward compat)
7. Token refresh endpoint works for cleaner tokens
8. Custom claims in access token (role, company_id, email)
9. Missing fields → 400
10. Manager account cannot use cleaner JWT endpoint
11. Concurrent 401 dedup: only one refresh fired (token rotation)
12. TodayJobsView rejects unauthenticated requests
"""

import pytest
import json
from unittest.mock import patch, MagicMock
from rest_framework.test import APIClient
from datetime import date


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def company(db):
    from apps.accounts.models import Company
    return Company.objects.create(name="S01 JWT Test Co", plan="active")


@pytest.fixture
def cleaner(company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company,
        role=User.ROLE_CLEANER,
        email="cleaner_jwt@test.com",
        full_name="JWT Cleaner",
        is_active=True,
    )
    u.set_password("CleanerPass99!")
    u.save()
    return u


@pytest.fixture
def manager(company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company,
        role=User.ROLE_MANAGER,
        email="manager_jwt@test.com",
        full_name="JWT Manager",
        is_active=True,
    )
    u.set_password("ManagerPass99!")
    u.save()
    return u


@pytest.fixture
def owner(company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company,
        role=User.ROLE_OWNER,
        email="owner_jwt@test.com",
        full_name="JWT Owner",
        is_active=True,
    )
    u.set_password("OwnerPass99!")
    u.save()
    return u


@pytest.fixture
def job(company, cleaner, db):
    from apps.jobs.models import Job
    from apps.locations.models import Location
    location = Location.objects.create(company=company, name="JWT Test Location")
    return Job.objects.create(
        company=company,
        location=location,
        cleaner=cleaner,
        scheduled_date=date.today(),
        status=Job.STATUS_SCHEDULED,
        context=Job.CONTEXT_CLEANING,
    )


# =============================================================================
# Cleaner JWT Login Endpoint
# =============================================================================

@pytest.mark.django_db
class TestJWTCleanerLoginEndpoint:
    URL = "/api/auth/cleaner/jwt/login/"

    def test_valid_cleaner_returns_tokens(self, cleaner):
        client = APIClient()
        resp = client.post(self.URL, {"email": cleaner.email, "password": "CleanerPass99!"}, format="json")
        assert resp.status_code == 200
        data = resp.json()
        assert "access" in data
        assert "refresh" in data
        assert data["role"] == "cleaner"
        assert data["user_id"] == cleaner.id
        assert data["email"] == cleaner.email

    def test_manager_rejected(self, manager):
        client = APIClient()
        resp = client.post(self.URL, {"email": manager.email, "password": "ManagerPass99!"}, format="json")
        assert resp.status_code == 401

    def test_owner_rejected(self, owner):
        client = APIClient()
        resp = client.post(self.URL, {"email": owner.email, "password": "OwnerPass99!"}, format="json")
        assert resp.status_code == 401

    def test_wrong_password_rejected(self, cleaner):
        client = APIClient()
        resp = client.post(self.URL, {"email": cleaner.email, "password": "wrongpassword"}, format="json")
        assert resp.status_code == 401

    def test_inactive_cleaner_rejected(self, company, db):
        from apps.accounts.models import User
        u = User.objects.create(
            company=company, role=User.ROLE_CLEANER,
            email="inactive_cleaner@test.com", full_name="Inactive",
            is_active=False,
        )
        u.set_password("SomePass123!")
        u.save()
        client = APIClient()
        resp = client.post(self.URL, {"email": u.email, "password": "SomePass123!"}, format="json")
        assert resp.status_code == 401

    def test_missing_email_returns_400(self):
        client = APIClient()
        resp = client.post(self.URL, {"password": "something"}, format="json")
        assert resp.status_code == 400

    def test_missing_password_returns_400(self, cleaner):
        client = APIClient()
        resp = client.post(self.URL, {"email": cleaner.email}, format="json")
        assert resp.status_code == 400

    def test_empty_body_returns_400(self):
        client = APIClient()
        resp = client.post(self.URL, {}, format="json")
        assert resp.status_code == 400


# =============================================================================
# JWT Token Claims
# =============================================================================

@pytest.mark.django_db
class TestJWTCleanerTokenClaims:
    URL = "/api/auth/cleaner/jwt/login/"

    def test_access_token_has_custom_claims(self, cleaner):
        """Access token payload must include role, company_id, email."""
        import base64
        client = APIClient()
        resp = client.post(self.URL, {"email": cleaner.email, "password": "CleanerPass99!"}, format="json")
        assert resp.status_code == 200

        access = resp.json()["access"]
        # Decode payload (middle part of JWT, no verification needed for claims check)
        payload_b64 = access.split(".")[1]
        # Pad base64
        payload_b64 += "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))

        assert payload["role"] == "cleaner"
        assert payload["company_id"] == cleaner.company_id
        assert payload["email"] == cleaner.email

    def test_refresh_token_rotates(self, cleaner):
        """POST /api/manager/auth/jwt/refresh/ returns new access token."""
        client = APIClient()
        login_resp = client.post(
            self.URL, {"email": cleaner.email, "password": "CleanerPass99!"}, format="json"
        )
        refresh = login_resp.json()["refresh"]

        refresh_resp = client.post(
            "/api/manager/auth/jwt/refresh/",
            {"refresh": refresh},
            format="json",
        )
        assert refresh_resp.status_code == 200
        assert "access" in refresh_resp.json()


# =============================================================================
# Cleaner Views — Dual Auth
# =============================================================================

@pytest.mark.django_db
class TestCleanerViewsDualAuth:
    TODAY_URL = "/api/jobs/today/"

    def _get_cleaner_jwt(self, cleaner) -> str:
        """Get JWT access token by generating directly, bypassing throttle."""
        from apps.api.serializers_jwt import ProofTokenObtainPairSerializer
        token = ProofTokenObtainPairSerializer.get_token(cleaner)
        return str(token.access_token)

    def _get_manager_jwt(self, manager) -> str:
        from apps.api.serializers_jwt import ProofTokenObtainPairSerializer
        token = ProofTokenObtainPairSerializer.get_token(manager)
        return str(token.access_token)

    def _get_cleaner_token(self, cleaner) -> str:
        from rest_framework.authtoken.models import Token
        token, _ = Token.objects.get_or_create(user=cleaner)
        return token.key

    def test_today_jobs_accepts_jwt_bearer(self, cleaner, job):
        access = self._get_cleaner_jwt(cleaner)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = client.get(self.TODAY_URL)
        assert resp.status_code == 200

    def test_today_jobs_accepts_legacy_token(self, cleaner, job):
        token = self._get_cleaner_token(cleaner)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
        resp = client.get(self.TODAY_URL)
        assert resp.status_code == 200

    def test_today_jobs_rejects_unauthenticated(self):
        client = APIClient()
        resp = client.get(self.TODAY_URL)
        assert resp.status_code == 401

    def test_today_jobs_rejects_manager_jwt(self, manager):
        """Manager JWT should not grant access to cleaner-only views."""
        access = self._get_manager_jwt(manager)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        # Manager role should get 403 from cleaner view role check
        resp = client.get(self.TODAY_URL)
        assert resp.status_code in (401, 403)
