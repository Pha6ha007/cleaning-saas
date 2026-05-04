# backend/tests/test_s04_m006_api_keys.py
"""
M006/S04: Enterprise API Keys & Rate Limiting — Contract Tests

Proves:
1. EnterpriseApiKey.generate() returns (instance, raw_key)
2. raw_key starts with "pp_" prefix
3. EnterpriseApiKey.verify() returns key for valid raw_key
4. EnterpriseApiKey.verify() returns None for invalid key
5. EnterpriseApiKey.verify() returns None for inactive key
6. key_hash is not the raw_key
7. GET /api/enterprise/api-keys/ requires enterprise plan
8. GET /api/enterprise/api-keys/ returns empty list
9. POST /api/enterprise/api-keys/ creates a key (owner only)
10. POST /api/enterprise/api-keys/ response includes raw key once
11. POST /api/enterprise/api-keys/ returns 403 for non-enterprise plan
12. POST /api/enterprise/api-keys/ returns 403 for manager (not owner)
13. POST /api/enterprise/api-keys/ returns 400 for missing name
14. POST /api/enterprise/api-keys/ returns 400 for invalid scope
15. DELETE /api/enterprise/api-keys/<id>/ revokes key
16. DELETE returns 403 for manager
17. GET /api/enterprise/api-keys/usage/ returns stats
18. X-API-Key header authenticates request
19. Invalid X-API-Key returns 401
20. record_usage() increments request_count
21. throttles.py: CheckInThrottle has correct scope
22. throttles.py: ApiKeyRateThrottle has correct scope
"""

import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.security

# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def enterprise_company(db):
    from apps.accounts.models import Company
    return Company.objects.create(
        name="Enterprise Key Co", plan="active", plan_tier="enterprise"
    )


@pytest.fixture
def standard_company(db):
    from apps.accounts.models import Company
    return Company.objects.create(
        name="Standard Key Co", plan="active", plan_tier="standard"
    )


@pytest.fixture
def owner(enterprise_company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=enterprise_company, role=User.ROLE_OWNER,
        email="owner@apikey.com", full_name="Owner", is_active=True,
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def manager(enterprise_company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=enterprise_company, role=User.ROLE_MANAGER,
        email="mgr@apikey.com", full_name="Manager", is_active=True,
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def standard_owner(standard_company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=standard_company, role=User.ROLE_OWNER,
        email="standard@apikey.com", full_name="Standard Owner", is_active=True,
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def auth_owner(owner):
    c = APIClient()
    c.force_authenticate(user=owner)
    return c


@pytest.fixture
def auth_manager(manager):
    c = APIClient()
    c.force_authenticate(user=manager)
    return c


@pytest.fixture
def auth_standard(standard_owner):
    c = APIClient()
    c.force_authenticate(user=standard_owner)
    return c


# =============================================================================
# Model Tests
# =============================================================================

@pytest.mark.django_db
class TestEnterpriseApiKeyModel:
    def test_generate_returns_instance_and_raw_key(self, enterprise_company):
        from apps.api.models_api_keys import EnterpriseApiKey
        instance, raw = EnterpriseApiKey.generate(enterprise_company, "Test Key", ["webhooks"])
        assert instance.pk is not None
        assert isinstance(raw, str)
        assert len(raw) > 10

    def test_raw_key_has_prefix(self, enterprise_company):
        from apps.api.models_api_keys import EnterpriseApiKey
        _, raw = EnterpriseApiKey.generate(enterprise_company, "Test", [])
        assert raw.startswith("pp_")

    def test_verify_returns_key_for_valid_raw(self, enterprise_company):
        from apps.api.models_api_keys import EnterpriseApiKey
        instance, raw = EnterpriseApiKey.generate(enterprise_company, "Test", [])
        found = EnterpriseApiKey.verify(raw)
        assert found is not None
        assert found.pk == instance.pk

    def test_verify_returns_none_for_invalid_key(self):
        from apps.api.models_api_keys import EnterpriseApiKey
        assert EnterpriseApiKey.verify("pp_invalid123") is None

    def test_verify_returns_none_for_inactive_key(self, enterprise_company):
        from apps.api.models_api_keys import EnterpriseApiKey
        instance, raw = EnterpriseApiKey.generate(enterprise_company, "Test", [])
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        assert EnterpriseApiKey.verify(raw) is None

    def test_key_hash_differs_from_raw_key(self, enterprise_company):
        from apps.api.models_api_keys import EnterpriseApiKey
        instance, raw = EnterpriseApiKey.generate(enterprise_company, "Test", [])
        assert instance.key_hash != raw

    def test_record_usage_increments_count(self, enterprise_company):
        from apps.api.models_api_keys import EnterpriseApiKey
        instance, _ = EnterpriseApiKey.generate(enterprise_company, "Test", [])
        instance.record_usage()
        instance.refresh_from_db()
        assert instance.request_count == 1
        assert instance.last_used_at is not None

    def test_str_includes_name_and_company(self, enterprise_company):
        from apps.api.models_api_keys import EnterpriseApiKey
        instance, _ = EnterpriseApiKey.generate(enterprise_company, "My Key", [])
        assert "My Key" in str(instance)
        assert "Enterprise Key Co" in str(instance)


# =============================================================================
# API Tests — List / Create
# =============================================================================

@pytest.mark.django_db
class TestApiKeyListCreate:
    def test_requires_auth(self):
        resp = APIClient().get("/api/enterprise/api-keys/")
        assert resp.status_code == 401

    def test_enterprise_required_for_list(self, auth_standard):
        resp = auth_standard.get("/api/enterprise/api-keys/")
        assert resp.status_code == 403
        assert resp.json()["code"] == "ENTERPRISE_REQUIRED"

    def test_list_returns_empty(self, auth_owner):
        resp = auth_owner.get("/api/enterprise/api-keys/")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_returns_201(self, auth_owner):
        resp = auth_owner.post("/api/enterprise/api-keys/", {
            "name": "Zapier Integration",
            "scopes": ["webhooks", "analytics"],
        }, format="json")
        assert resp.status_code == 201

    def test_create_response_includes_raw_key(self, auth_owner):
        resp = auth_owner.post("/api/enterprise/api-keys/", {
            "name": "Test Key",
        }, format="json")
        data = resp.json()
        assert "key" in data
        assert data["key"].startswith("pp_")
        assert "key_warning" in data

    def test_create_enterprise_required(self, auth_standard):
        resp = auth_standard.post("/api/enterprise/api-keys/", {
            "name": "Key"
        }, format="json")
        assert resp.status_code == 403
        assert resp.json()["code"] == "ENTERPRISE_REQUIRED"

    def test_create_manager_forbidden(self, auth_manager):
        resp = auth_manager.post("/api/enterprise/api-keys/", {
            "name": "Key"
        }, format="json")
        assert resp.status_code == 403
        assert resp.json()["code"] == "OWNER_REQUIRED"

    def test_create_missing_name_returns_400(self, auth_owner):
        resp = auth_owner.post("/api/enterprise/api-keys/", {}, format="json")
        assert resp.status_code == 400
        assert resp.json()["code"] == "NAME_REQUIRED"

    def test_create_invalid_scope_returns_400(self, auth_owner):
        resp = auth_owner.post("/api/enterprise/api-keys/", {
            "name": "Key",
            "scopes": ["invalid_scope"],
        }, format="json")
        assert resp.status_code == 400
        assert resp.json()["code"] == "INVALID_SCOPES"

    def test_list_after_create(self, auth_owner):
        auth_owner.post("/api/enterprise/api-keys/", {"name": "K1"}, format="json")
        auth_owner.post("/api/enterprise/api-keys/", {"name": "K2"}, format="json")
        resp = auth_owner.get("/api/enterprise/api-keys/")
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_list_does_not_include_raw_key(self, auth_owner):
        auth_owner.post("/api/enterprise/api-keys/", {"name": "K"}, format="json")
        resp = auth_owner.get("/api/enterprise/api-keys/")
        for item in resp.json():
            assert "key" not in item


# =============================================================================
# API Tests — Delete
# =============================================================================

@pytest.mark.django_db
class TestApiKeyDelete:
    def test_delete_revokes_key(self, auth_owner, enterprise_company):
        from apps.api.models_api_keys import EnterpriseApiKey
        instance, _ = EnterpriseApiKey.generate(enterprise_company, "ToDelete", [])
        resp = auth_owner.delete(f"/api/enterprise/api-keys/{instance.id}/")
        assert resp.status_code == 204
        instance.refresh_from_db()
        assert instance.is_active is False

    def test_delete_manager_forbidden(self, auth_manager, enterprise_company):
        from apps.api.models_api_keys import EnterpriseApiKey
        instance, _ = EnterpriseApiKey.generate(enterprise_company, "ToDelete", [])
        resp = auth_manager.delete(f"/api/enterprise/api-keys/{instance.id}/")
        assert resp.status_code == 403

    def test_delete_not_found_returns_404(self, auth_owner):
        resp = auth_owner.delete("/api/enterprise/api-keys/999999/")
        assert resp.status_code == 404


# =============================================================================
# API Tests — Usage
# =============================================================================

@pytest.mark.django_db
class TestApiKeyUsage:
    def test_usage_returns_stats(self, auth_owner, enterprise_company):
        from apps.api.models_api_keys import EnterpriseApiKey
        EnterpriseApiKey.generate(enterprise_company, "K1", [])
        EnterpriseApiKey.generate(enterprise_company, "K2", [])
        resp = auth_owner.get("/api/enterprise/api-keys/usage/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_keys"] == 2
        assert data["active_keys"] == 2
        assert "keys" in data

    def test_usage_enterprise_required(self, auth_standard):
        resp = auth_standard.get("/api/enterprise/api-keys/usage/")
        assert resp.status_code == 403


# =============================================================================
# Authentication Tests
# =============================================================================

@pytest.mark.django_db
class TestApiKeyAuthentication:
    def test_valid_api_key_authenticates_request(self, enterprise_company, owner):
        from apps.api.models_api_keys import EnterpriseApiKey
        _, raw = EnterpriseApiKey.generate(enterprise_company, "Test", [])
        c = APIClient()
        c.credentials(HTTP_X_API_KEY=raw)
        resp = c.get("/api/enterprise/api-keys/")
        assert resp.status_code == 200

    def test_invalid_api_key_returns_401(self):
        c = APIClient()
        c.credentials(HTTP_X_API_KEY="pp_invalidkey123")
        resp = c.get("/api/enterprise/api-keys/")
        assert resp.status_code == 401


# =============================================================================
# Throttle Config Tests
# =============================================================================

@pytest.mark.django_db
class TestThrottleScopes:
    def test_check_in_throttle_scope(self):
        from apps.api.throttles import CheckInThrottle
        assert CheckInThrottle.scope == "check_in"

    def test_photo_upload_throttle_scope(self):
        from apps.api.throttles import PhotoUploadThrottle
        assert PhotoUploadThrottle.scope == "photo_upload"

    def test_api_key_throttle_scope(self):
        from apps.api.throttles import ApiKeyRateThrottle
        assert ApiKeyRateThrottle.scope == "api_key"
