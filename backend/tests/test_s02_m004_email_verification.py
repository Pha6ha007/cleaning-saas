# backend/tests/test_s02_m004_email_verification.py
"""
M004/S02: Self-Registration + Email Verification — Contract Tests

Proves:
1. EmailVerificationToken model exists with correct fields
2. Token is auto-generated as UUID on creation
3. is_expired property returns False for fresh tokens
4. is_expired property returns True for old tokens (> 24h)
5. verify() activates user and starts 7-day trial
6. verify() deletes token after use (single-use)
7. verify() returns False for expired tokens
8. /api/auth/signup/ creates user in inactive state + returns verification_pending
9. /api/auth/verify-email/?token=<uuid> verifies and activates user
10. /api/auth/verify-email/ returns 400 for missing token
11. /api/auth/verify-email/ returns 400 for invalid UUID
12. /api/auth/verify-email/ returns 400 for expired token
13. Duplicate email on signup returns 400
"""

import pytest
import uuid
from unittest.mock import patch
from datetime import timedelta
from rest_framework.test import APIClient


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def company(db):
    from apps.accounts.models import Company
    return Company.objects.create(name="Verify Test Co", plan="active")


@pytest.fixture
def inactive_user(company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company,
        role=User.ROLE_OWNER,
        email="verify_user@test.com",
        full_name="Verify User",
        is_active=False,
    )
    u.set_password("StrongPass99!")
    u.save()
    return u


# =============================================================================
# Model Tests
# =============================================================================

@pytest.mark.django_db
class TestEmailVerificationTokenModel:
    def test_model_importable(self):
        from apps.accounts.models import EmailVerificationToken
        assert EmailVerificationToken is not None

    def test_token_created_with_uuid(self, inactive_user):
        from apps.accounts.models import EmailVerificationToken
        vt = EmailVerificationToken.objects.create(user=inactive_user)
        assert vt.token is not None
        assert isinstance(vt.token, uuid.UUID)

    def test_two_tokens_have_different_uuids(self, company, db):
        from apps.accounts.models import User, EmailVerificationToken
        u1 = User.objects.create(
            company=company, role=User.ROLE_OWNER,
            email="vt1@test.com", full_name="VT1", is_active=False,
        )
        u2 = User.objects.create(
            company=company, role=User.ROLE_OWNER,
            email="vt2@test.com", full_name="VT2", is_active=False,
        )
        vt1 = EmailVerificationToken.objects.create(user=u1)
        vt2 = EmailVerificationToken.objects.create(user=u2)
        assert vt1.token != vt2.token

    def test_is_expired_false_for_fresh_token(self, inactive_user):
        from apps.accounts.models import EmailVerificationToken
        vt = EmailVerificationToken.objects.create(user=inactive_user)
        assert vt.is_expired is False

    def test_is_expired_true_for_old_token(self, inactive_user):
        from apps.accounts.models import EmailVerificationToken
        from django.utils import timezone
        vt = EmailVerificationToken.objects.create(user=inactive_user)
        # Backdate created_at by 25 hours
        vt.created_at = timezone.now() - timedelta(hours=25)
        vt.save(update_fields=["created_at"])
        assert vt.is_expired is True

    def test_str_representation(self, inactive_user):
        from apps.accounts.models import EmailVerificationToken
        vt = EmailVerificationToken.objects.create(user=inactive_user)
        assert "verify_user@test.com" in str(vt)


# =============================================================================
# verify() method tests
# =============================================================================

@pytest.mark.django_db
class TestVerifyMethod:
    def test_verify_activates_user(self, inactive_user):
        from apps.accounts.models import EmailVerificationToken
        vt = EmailVerificationToken.objects.create(user=inactive_user)
        result = vt.verify()
        assert result is True
        inactive_user.refresh_from_db()
        assert inactive_user.is_active is True

    def test_verify_starts_trial(self, inactive_user):
        from apps.accounts.models import EmailVerificationToken
        vt = EmailVerificationToken.objects.create(user=inactive_user)
        vt.verify()
        inactive_user.company.refresh_from_db()
        company = inactive_user.company
        assert company.plan == "trial"
        assert company.trial_started_at is not None
        assert company.trial_expires_at is not None

    def test_verify_trial_lasts_7_days(self, inactive_user):
        from apps.accounts.models import EmailVerificationToken
        from django.utils import timezone
        vt = EmailVerificationToken.objects.create(user=inactive_user)
        before = timezone.now()
        vt.verify()
        inactive_user.company.refresh_from_db()
        delta = inactive_user.company.trial_expires_at - inactive_user.company.trial_started_at
        assert 6 <= delta.days <= 7

    def test_verify_deletes_token(self, inactive_user):
        from apps.accounts.models import EmailVerificationToken
        vt = EmailVerificationToken.objects.create(user=inactive_user)
        token_id = vt.id
        vt.verify()
        assert not EmailVerificationToken.objects.filter(id=token_id).exists()

    def test_verify_returns_false_for_expired_token(self, inactive_user):
        from apps.accounts.models import EmailVerificationToken
        from django.utils import timezone
        vt = EmailVerificationToken.objects.create(user=inactive_user)
        vt.created_at = timezone.now() - timedelta(hours=25)
        vt.save(update_fields=["created_at"])
        result = vt.verify()
        assert result is False
        inactive_user.refresh_from_db()
        assert inactive_user.is_active is False


# =============================================================================
# Signup Endpoint Tests
# =============================================================================

@pytest.mark.django_db
class TestSignupEndpoint:
    URL = "/api/auth/signup/"

    def test_signup_creates_inactive_user(self):
        client = APIClient()
        with patch("apps.api.views_auth._send_verification_email"):
            resp = client.post(self.URL, {
                "company_name": "New Co",
                "full_name": "Test Owner",
                "email": "newowner@test.com",
                "password": "StrongPass99!",
            }, format="json")
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "verification_pending"

        from apps.accounts.models import User
        user = User.objects.get(email="newowner@test.com")
        assert user.is_active is False

    def test_signup_creates_verification_token(self):
        client = APIClient()
        with patch("apps.api.views_auth._send_verification_email"):
            resp = client.post(self.URL, {
                "company_name": "Token Co",
                "full_name": "Token Owner",
                "email": "tokenowner@test.com",
                "password": "StrongPass99!",
            }, format="json")
        assert resp.status_code == 201

        from apps.accounts.models import User, EmailVerificationToken
        user = User.objects.get(email="tokenowner@test.com")
        assert EmailVerificationToken.objects.filter(user=user).exists()

    def test_signup_duplicate_email_returns_400(self, company, db):
        from apps.accounts.models import User
        User.objects.create(
            company=company, role=User.ROLE_OWNER,
            email="existing@test.com", full_name="Existing", is_active=True,
        )
        client = APIClient()
        resp = client.post(self.URL, {
            "company_name": "Dup Co",
            "full_name": "Dup Owner",
            "email": "existing@test.com",
            "password": "StrongPass99!",
        }, format="json")
        assert resp.status_code == 400

    def test_signup_missing_fields_returns_400(self):
        client = APIClient()
        resp = client.post(self.URL, {"email": "only@test.com"}, format="json")
        assert resp.status_code == 400


# =============================================================================
# Email Verification Endpoint Tests
# =============================================================================

@pytest.mark.django_db
class TestEmailVerifyEndpoint:
    URL = "/api/auth/verify-email/"

    def test_valid_token_verifies_and_activates(self, inactive_user):
        from apps.accounts.models import EmailVerificationToken
        vt = EmailVerificationToken.objects.create(user=inactive_user)
        client = APIClient()
        resp = client.get(self.URL, {"token": str(vt.token)})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "verified"
        inactive_user.refresh_from_db()
        assert inactive_user.is_active is True

    def test_missing_token_returns_400(self):
        client = APIClient()
        resp = client.get(self.URL)
        assert resp.status_code == 400
        assert resp.json()["code"] == "TOKEN_MISSING"

    def test_invalid_uuid_returns_400(self):
        client = APIClient()
        resp = client.get(self.URL, {"token": "not-a-uuid"})
        assert resp.status_code == 400
        assert resp.json()["code"] == "TOKEN_INVALID"

    def test_nonexistent_token_returns_400(self):
        client = APIClient()
        resp = client.get(self.URL, {"token": str(uuid.uuid4())})
        assert resp.status_code == 400
        assert resp.json()["code"] == "TOKEN_INVALID"

    def test_expired_token_returns_400(self, inactive_user):
        from apps.accounts.models import EmailVerificationToken
        from django.utils import timezone
        vt = EmailVerificationToken.objects.create(user=inactive_user)
        vt.created_at = timezone.now() - timedelta(hours=25)
        vt.save(update_fields=["created_at"])
        client = APIClient()
        resp = client.get(self.URL, {"token": str(vt.token)})
        assert resp.status_code == 400
        assert resp.json()["code"] == "TOKEN_EXPIRED"

    def test_response_contains_trial_info(self, inactive_user):
        from apps.accounts.models import EmailVerificationToken
        vt = EmailVerificationToken.objects.create(user=inactive_user)
        client = APIClient()
        resp = client.get(self.URL, {"token": str(vt.token)})
        assert resp.status_code == 200
        data = resp.json()
        assert "trial_days" in data["company"]
        assert data["company"]["plan"] == "trial"
