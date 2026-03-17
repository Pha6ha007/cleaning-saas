# backend/tests/test_s03_m004_live_analytics.py
"""
M004/S03: Live Analytics Polling — Contract Tests

Proves:
1. GET /api/analytics/live/ requires authentication
2. Returns 200 with expected KPI fields for authenticated manager
3. Returns correct counts for jobs_scheduled, jobs_in_progress, jobs_completed
4. Response includes cache_ttl_seconds field
5. Response includes computed_at timestamp
6. X-Cache header is MISS on first request, HIT on second
7. Last-Updated header is present
8. Non-manager users (cleaners) are rejected with 403
9. Managers from different companies see different data (tenant isolation)
10. Cache is keyed per-company (different companies don't share cache)
"""

import pytest
from django.utils import timezone
from datetime import date
from rest_framework.test import APIClient
from django.core.cache import cache


URL = "/api/analytics/live/"


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def company_a(db):
    from apps.accounts.models import Company
    return Company.objects.create(name="Live Analytics Co A", plan="active")


@pytest.fixture
def company_b(db):
    from apps.accounts.models import Company
    return Company.objects.create(name="Live Analytics Co B", plan="active")


@pytest.fixture
def manager_a(company_a, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company_a, role=User.ROLE_OWNER,
        email="manager_a@livetest.com", full_name="Manager A", is_active=True,
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def manager_b(company_b, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company_b, role=User.ROLE_OWNER,
        email="manager_b@livetest.com", full_name="Manager B", is_active=True,
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def cleaner_a(company_a, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company_a, role=User.ROLE_CLEANER,
        email="cleaner_a@livetest.com", full_name="Cleaner A", is_active=True,
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def cleaner_b(company_b, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company_b, role=User.ROLE_CLEANER,
        email="cleaner_b@livetest.com", full_name="Cleaner B", is_active=True,
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def cleaner(company_a, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company_a, role=User.ROLE_CLEANER,
        email="cleaner@livetest.com", full_name="Test Cleaner", is_active=True,
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def auth_client_a(manager_a):
    client = APIClient()
    client.force_authenticate(user=manager_a)
    return client


@pytest.fixture
def auth_client_b(manager_b):
    client = APIClient()
    client.force_authenticate(user=manager_b)
    return client


@pytest.fixture
def location_a(company_a, db):
    from apps.locations.models import Location
    return Location.objects.create(company=company_a, name="Test Location A")


@pytest.fixture
def location_b(company_b, db):
    from apps.locations.models import Location
    return Location.objects.create(company=company_b, name="Test Location B")


def _make_job(company, location, cleaner, status, scheduled_date=None, context=None, **kwargs):
    from apps.jobs.models import Job
    return Job.objects.create(
        company=company,
        location=location,
        cleaner=cleaner,
        status=status,
        context=context or Job.CONTEXT_CLEANING,
        scheduled_date=scheduled_date or date.today(),
        **kwargs,
    )


# =============================================================================
# Auth & Permission Tests
# =============================================================================

@pytest.mark.django_db
class TestLiveAnalyticsAuth:
    def test_unauthenticated_returns_401(self):
        resp = APIClient().get(URL)
        assert resp.status_code == 401

    def test_cleaner_returns_403(self, cleaner):
        client = APIClient()
        client.force_authenticate(user=cleaner)
        resp = client.get(URL)
        assert resp.status_code == 403

    def test_manager_returns_200(self, auth_client_a):
        resp = auth_client_a.get(URL)
        assert resp.status_code == 200


# =============================================================================
# Response Shape Tests
# =============================================================================

@pytest.mark.django_db
class TestLiveAnalyticsShape:
    def test_response_has_jobs_scheduled(self, auth_client_a):
        resp = auth_client_a.get(URL)
        assert "jobs_scheduled" in resp.json()

    def test_response_has_jobs_in_progress(self, auth_client_a):
        resp = auth_client_a.get(URL)
        assert "jobs_in_progress" in resp.json()

    def test_response_has_jobs_completed(self, auth_client_a):
        resp = auth_client_a.get(URL)
        assert "jobs_completed" in resp.json()

    def test_response_has_sla_breaches_today(self, auth_client_a):
        resp = auth_client_a.get(URL)
        assert "sla_breaches_today" in resp.json()

    def test_response_has_active_cleaners(self, auth_client_a):
        resp = auth_client_a.get(URL)
        assert "active_cleaners" in resp.json()

    def test_response_has_computed_at(self, auth_client_a):
        resp = auth_client_a.get(URL)
        assert "computed_at" in resp.json()

    def test_response_has_cache_ttl(self, auth_client_a):
        resp = auth_client_a.get(URL)
        assert "cache_ttl_seconds" in resp.json()
        assert resp.json()["cache_ttl_seconds"] == 30

    def test_last_updated_header_present(self, auth_client_a):
        resp = auth_client_a.get(URL)
        assert "Last-Updated" in resp

    def test_x_cache_miss_on_first_request(self, auth_client_a):
        resp = auth_client_a.get(URL)
        assert resp["X-Cache"] == "MISS"

    def test_x_cache_hit_on_second_request(self, auth_client_a):
        auth_client_a.get(URL)  # prime cache
        resp = auth_client_a.get(URL)
        assert resp["X-Cache"] == "HIT"


# =============================================================================
# KPI Accuracy Tests
# =============================================================================

@pytest.mark.django_db
class TestLiveAnalyticsKPIs:
    def test_counts_scheduled_jobs(self, auth_client_a, company_a, location_a, cleaner_a):
        from apps.jobs.models import Job
        _make_job(company_a, location_a, cleaner_a, Job.STATUS_SCHEDULED)
        _make_job(company_a, location_a, cleaner_a, Job.STATUS_SCHEDULED)
        cache.clear()
        resp = auth_client_a.get(URL)
        assert resp.json()["jobs_scheduled"] == 2

    def test_counts_in_progress_jobs(self, auth_client_a, company_a, location_a, cleaner_a):
        from apps.jobs.models import Job
        _make_job(company_a, location_a, cleaner_a, Job.STATUS_IN_PROGRESS)
        cache.clear()
        resp = auth_client_a.get(URL)
        assert resp.json()["jobs_in_progress"] == 1

    def test_counts_completed_jobs_today(self, auth_client_a, company_a, location_a, cleaner_a):
        from apps.jobs.models import Job
        _make_job(company_a, location_a, cleaner_a, Job.STATUS_COMPLETED,
                  actual_end_time=timezone.now())
        cache.clear()
        resp = auth_client_a.get(URL)
        assert resp.json()["jobs_completed"] == 1

    def test_empty_company_returns_zeros(self, auth_client_b):
        resp = auth_client_b.get(URL)
        data = resp.json()
        assert data["jobs_scheduled"] == 0
        assert data["jobs_in_progress"] == 0
        assert data["jobs_completed"] == 0
        assert data["sla_breaches_today"] == 0
        assert data["active_cleaners"] == 0


# =============================================================================
# Tenant Isolation Tests
# =============================================================================

@pytest.mark.django_db
class TestLiveAnalyticsTenantIsolation:
    def test_company_a_does_not_see_company_b_jobs(
        self, auth_client_a, auth_client_b, company_a, company_b,
        location_a, location_b, cleaner_a, cleaner_b
    ):
        from apps.jobs.models import Job
        _make_job(company_b, location_b, cleaner_b, Job.STATUS_IN_PROGRESS)
        resp_a = auth_client_a.get(URL)
        assert resp_a.json()["jobs_in_progress"] == 0

    def test_company_b_does_not_see_company_a_jobs(
        self, auth_client_a, auth_client_b, company_a, company_b,
        location_a, location_b, cleaner_a, cleaner_b
    ):
        from apps.jobs.models import Job
        _make_job(company_a, location_a, cleaner_a, Job.STATUS_IN_PROGRESS)
        resp_b = auth_client_b.get(URL)
        assert resp_b.json()["jobs_in_progress"] == 0

    def test_caches_are_per_company(
        self, auth_client_a, auth_client_b, company_a, company_b,
        location_a, location_b, cleaner_a, cleaner_b
    ):
        from apps.jobs.models import Job
        _make_job(company_a, location_a, cleaner_a, Job.STATUS_IN_PROGRESS)
        # Company A primes its cache
        resp_a = auth_client_a.get(URL)
        assert resp_a["X-Cache"] == "MISS"
        assert resp_a.json()["jobs_in_progress"] == 1
        # Company B still gets its own MISS (no shared cache)
        resp_b = auth_client_b.get(URL)
        assert resp_b["X-Cache"] == "MISS"
        assert resp_b.json()["jobs_in_progress"] == 0
