# backend/tests/test_login_rate_limiting.py
"""
TICKET-002: All login endpoints must enforce the `auth_login` scope (5/min).

Without per-scope throttling, attackers could brute-force passwords up to
10/min (the looser `anon` rate) — or, on the legacy /api/auth/login/, with
no rate limit at all.
"""
import pytest
from django.core.cache import cache

from apps.accounts.models import Company, User


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    """DRF throttles are cache-keyed by IP. Clear before AND after each test
    to keep cases independent of order and of sibling test files."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def manager_user(db):
    """A real owner user, matching tests/test_jwt_auth.py:owner pattern."""
    company = Company.objects.create(name="Test Company")
    user = User.objects.create(
        company=company,
        role=User.ROLE_OWNER,
        email="manager@example.com",
        full_name="Test Manager",
        is_active=True,
    )
    user.set_password("SecurePass123!")
    user.save()
    return user


@pytest.mark.django_db
class TestLoginRateLimits:
    """Each protected login endpoint must throttle at the `auth_login` rate (5/min)."""

    def test_legacy_login_rate_limited_after_5_attempts(self, client):
        endpoint = "/api/auth/login/"
        payload = {"email": "x@example.com", "password": "wrong"}

        # First 5 attempts: should reach the view (returns 401)
        for i in range(5):
            r = client.post(endpoint, data=payload, content_type="application/json")
            assert r.status_code == 401, f"Attempt {i+1}: status={r.status_code}"

        # 6th attempt: throttled
        r = client.post(endpoint, data=payload, content_type="application/json")
        assert r.status_code == 429, (
            f"6th attempt expected 429, got {r.status_code}. "
            f"auth_login throttle is not active on /api/auth/login/."
        )

    def test_jwt_manager_login_rate_limited_after_5_attempts(self, client):
        endpoint = "/api/manager/auth/jwt/login/"
        payload = {"email": "x@example.com", "password": "wrong"}

        for i in range(5):
            r = client.post(endpoint, data=payload, content_type="application/json")
            assert r.status_code == 401

        r = client.post(endpoint, data=payload, content_type="application/json")
        assert r.status_code == 429

    def test_jwt_cleaner_login_rate_limited_after_5_attempts(self, client):
        endpoint = "/api/auth/cleaner/jwt/login/"
        payload = {"email": "x@example.com", "password": "wrong"}

        for i in range(5):
            r = client.post(endpoint, data=payload, content_type="application/json")
            # Cleaner JWT login may return 400 or 401 depending on validation —
            # the point is it reaches the view, not that it succeeds.
            assert r.status_code != 429

        r = client.post(endpoint, data=payload, content_type="application/json")
        assert r.status_code == 429

    def test_manager_login_rate_limited_after_5_attempts(self, client):
        """The pre-existing ManagerLoginView — already correct, but we verify."""
        endpoint = "/api/manager/auth/login/"
        payload = {"email": "x@example.com", "password": "wrong"}

        for i in range(5):
            r = client.post(endpoint, data=payload, content_type="application/json")
            assert r.status_code != 429

        r = client.post(endpoint, data=payload, content_type="application/json")
        assert r.status_code == 429
