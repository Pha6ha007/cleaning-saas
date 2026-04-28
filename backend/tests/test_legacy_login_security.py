# backend/tests/test_legacy_login_security.py
"""
TICKET-001: legacy /api/auth/login/ must not leak whether an email is registered.

Both "unknown email" and "wrong password" must return an identical response
(status + body) so an attacker can't enumerate accounts.
"""
import pytest
from django.core.cache import cache

from apps.accounts.models import Company, User


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    """
    DRF throttles use the cache backend keyed by IP. Tests in this class run
    enough requests close enough together to potentially trip AnonRateThrottle
    (10/min). Clearing cache before AND after each test keeps tests independent
    of execution order and of any state left by sibling test files.
    """
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def real_user(db):
    """
    Create a real, active manager user with a known password.

    Uses the same pattern as tests/test_jwt_auth.py: Company.objects.create()
    + User.objects.create() directly (NOT create_user, which routes through
    UserManager._create_user and demands phone for cleaners).
    """
    company = Company.objects.create(name="Test Company")
    user = User.objects.create(
        company=company,
        role=User.ROLE_OWNER,
        email="real@example.com",
        full_name="Real User",
        is_active=True,
    )
    user.set_password("correct-password")
    user.save()
    return user


@pytest.mark.django_db
class TestLegacyLoginSecurity:
    """TICKET-001: legacy /api/auth/login/ must not leak user existence."""

    def test_unknown_email_returns_401_invalid_credentials(self, client):
        response = client.post(
            "/api/auth/login/",
            data={"email": "nonexistent@example.com", "password": "anything"},
            content_type="application/json",
        )
        assert response.status_code == 401
        assert response.json() == {"detail": "Invalid credentials."}

    def test_known_email_wrong_password_returns_same_response(self, client, real_user):
        response = client.post(
            "/api/auth/login/",
            data={"email": "real@example.com", "password": "wrong-password"},
            content_type="application/json",
        )
        assert response.status_code == 401
        assert response.json() == {"detail": "Invalid credentials."}

    def test_responses_are_indistinguishable(self, client, real_user):
        """The two responses must be byte-identical (status + body)."""
        unknown = client.post(
            "/api/auth/login/",
            data={"email": "fake@example.com", "password": "x"},
            content_type="application/json",
        )
        wrong_pw = client.post(
            "/api/auth/login/",
            data={"email": "real@example.com", "password": "wrong"},
            content_type="application/json",
        )
        assert unknown.status_code == wrong_pw.status_code
        assert unknown.json() == wrong_pw.json()
