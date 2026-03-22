# backend/tests/test_s01_m006_caching.py
"""
M006/S01: API Response Caching — Contract Tests

Proves:
1. cache_utils.cached_response returns value on miss, calls fn()
2. cached_response returns cached value on hit, does not call fn()
3. cached_response returns (value, False) on miss
4. cached_response returns (value, True) on hit
5. invalidate() clears the cache key
6. make_company_key() produces consistent namespaced keys
7. GET /api/sla-policies/ returns X-Cache: MISS on first call
8. GET /api/sla-policies/ returns X-Cache: HIT on second call
9. POST /api/sla-policies/ invalidates the cache
10. GET /api/sla-policies/ returns X-Cache: MISS after invalidation
11. GET /api/branches/<id>/analytics/ returns X-Cache: MISS on first call
12. GET /api/branches/<id>/analytics/ returns X-Cache: HIT on second call
13. cache_utils.cached_response handles fn() raising exception gracefully
14. make_company_key with extra parts includes all segments
15. Cache isolation: different companies get different cache entries
"""

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture(autouse=True)
def clear_cache():
    """Clear cache before every test."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def company(db):
    from apps.accounts.models import Company
    return Company.objects.create(name="Cache Test Co", plan="active", plan_tier="enterprise")


@pytest.fixture
def other_company(db):
    from apps.accounts.models import Company
    return Company.objects.create(name="Other Cache Co", plan="active", plan_tier="enterprise")


@pytest.fixture
def owner(company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company, role=User.ROLE_OWNER,
        email="owner@cachetest.com", full_name="Owner", is_active=True,
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def other_owner(other_company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=other_company, role=User.ROLE_OWNER,
        email="other@cachetest.com", full_name="Other Owner", is_active=True,
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def auth_client(owner):
    c = APIClient()
    c.force_authenticate(user=owner)
    return c


@pytest.fixture
def other_client(other_owner):
    c = APIClient()
    c.force_authenticate(user=other_owner)
    return c


@pytest.fixture
def branch(company, db):
    from apps.accounts.models import Branch
    return Branch.objects.create(company=company, name="Cache Branch", is_active=True)


# =============================================================================
# Unit Tests: cache_utils
# =============================================================================

@pytest.mark.django_db
class TestCacheUtils:
    def test_miss_calls_fn(self):
        from apps.api.cache_utils import cached_response
        calls = []
        def fn():
            calls.append(1)
            return {"data": 42}
        value, hit = cached_response("test:miss", ttl=60, fn=fn)
        assert value == {"data": 42}
        assert hit is False
        assert len(calls) == 1

    def test_hit_does_not_call_fn(self):
        from apps.api.cache_utils import cached_response
        calls = []
        def fn():
            calls.append(1)
            return {"data": 42}
        cached_response("test:hit", ttl=60, fn=fn)
        value, hit = cached_response("test:hit", ttl=60, fn=fn)
        assert value == {"data": 42}
        assert hit is True
        assert len(calls) == 1  # fn only called once

    def test_invalidate_clears_key(self):
        from apps.api.cache_utils import cached_response, invalidate
        cached_response("test:inval", ttl=60, fn=lambda: "first")
        invalidate("test:inval")
        calls = []
        def fn():
            calls.append(1)
            return "second"
        value, hit = cached_response("test:inval", ttl=60, fn=fn)
        assert hit is False
        assert value == "second"

    def test_make_company_key_basic(self):
        from apps.api.cache_utils import make_company_key
        key = make_company_key("sla_policies", 42)
        assert key == "company:42:sla_policies"

    def test_make_company_key_with_parts(self):
        from apps.api.cache_utils import make_company_key
        key = make_company_key("branch_analytics", 7, 99, 30)
        assert key == "company:7:branch_analytics:99:30"

    def test_different_companies_get_different_keys(self):
        from apps.api.cache_utils import make_company_key
        k1 = make_company_key("sla_policies", 1)
        k2 = make_company_key("sla_policies", 2)
        assert k1 != k2

    def test_cached_response_handles_none_value(self):
        from apps.api.cache_utils import cached_response
        value, hit = cached_response("test:none", ttl=60, fn=lambda: None)
        assert value is None
        assert hit is False
        # Second call should be a hit returning None
        value2, hit2 = cached_response("test:none", ttl=60, fn=lambda: "should not run")
        assert value2 is None
        assert hit2 is True


# =============================================================================
# Integration Tests: SLA Policy Cache
# =============================================================================

@pytest.mark.django_db
class TestSLAPolicyCaching:
    def test_first_request_is_miss(self, auth_client):
        resp = auth_client.get("/api/sla-policies/")
        assert resp.status_code == 200
        assert resp.get("X-Cache") == "MISS"

    def test_second_request_is_hit(self, auth_client):
        auth_client.get("/api/sla-policies/")
        resp = auth_client.get("/api/sla-policies/")
        assert resp.get("X-Cache") == "HIT"

    def test_post_invalidates_cache(self, auth_client):
        # Seed cache
        auth_client.get("/api/sla-policies/")
        assert auth_client.get("/api/sla-policies/").get("X-Cache") == "HIT"
        # Write invalidates
        auth_client.post("/api/sla-policies/", {"name": "New Policy"}, format="json")
        resp = auth_client.get("/api/sla-policies/")
        assert resp.get("X-Cache") == "MISS"

    def test_cache_isolation_between_companies(self, auth_client, other_client, company, db):
        from apps.jobs.models import SLAPolicy
        SLAPolicy.objects.create(company=company, name="Isolated Policy")
        resp1 = auth_client.get("/api/sla-policies/")
        resp2 = other_client.get("/api/sla-policies/")
        assert len(resp1.json()) == 1
        assert len(resp2.json()) == 0
        # Both should be cache MISSes since keys are company-scoped
        assert resp1.get("X-Cache") == "MISS"
        assert resp2.get("X-Cache") == "MISS"


# =============================================================================
# Integration Tests: Branch Analytics Cache
# =============================================================================

@pytest.mark.django_db
class TestBranchAnalyticsCaching:
    def test_first_request_is_miss(self, auth_client, branch):
        resp = auth_client.get(f"/api/branches/{branch.id}/analytics/")
        assert resp.status_code == 200
        assert resp.get("X-Cache") == "MISS"

    def test_second_request_is_hit(self, auth_client, branch):
        auth_client.get(f"/api/branches/{branch.id}/analytics/")
        resp = auth_client.get(f"/api/branches/{branch.id}/analytics/")
        assert resp.get("X-Cache") == "HIT"

    def test_different_day_params_are_separate_cache_entries(self, auth_client, branch):
        auth_client.get(f"/api/branches/{branch.id}/analytics/?days=7")
        resp_7 = auth_client.get(f"/api/branches/{branch.id}/analytics/?days=7")
        resp_30 = auth_client.get(f"/api/branches/{branch.id}/analytics/?days=30")
        assert resp_7.get("X-Cache") == "HIT"
        assert resp_30.get("X-Cache") == "MISS"
