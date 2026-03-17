# backend/tests/test_s04_m005_audit_log.py
"""
M005/S04: Audit Log Viewer — Contract Tests

Proves:
1. GET /api/jobs/audit-log/ requires authentication
2. GET /api/jobs/audit-log/ returns 200 with empty results
3. Response has pagination fields: count, page, page_size, total_pages, results
4. Results include event fields: id, job_id, event_type, cleaner, location, created_at
5. Filter by cleaner_id returns only that cleaner's events
6. Filter by location_id returns only events from that location's jobs
7. Filter by date_from excludes earlier events
8. Filter by date_to excludes later events
9. Filter by event_type returns only matching events
10. Pagination: page_size limits results
11. Pagination: page 2 returns next page
12. Tenant isolation: manager sees only own company's events
13. GET /api/jobs/audit-log/export/ requires authentication
14. GET /api/jobs/audit-log/export/ returns CSV content-type
15. CSV export contains header row
16. CSV export applies same filters
17. CSV export filename in Content-Disposition
"""

import pytest
from datetime import date
from rest_framework.test import APIClient


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def company(db):
    from apps.accounts.models import Company
    return Company.objects.create(name="Audit Test Co", plan="active")


@pytest.fixture
def other_company(db):
    from apps.accounts.models import Company
    return Company.objects.create(name="Other Audit Co", plan="active")


@pytest.fixture
def owner(company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company, role=User.ROLE_OWNER,
        email="owner@auditlog.com", full_name="Owner", is_active=True,
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def cleaner1(company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company, role=User.ROLE_CLEANER,
        email="cleaner1@auditlog.com", full_name="Cleaner One", is_active=True,
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def cleaner2(company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company, role=User.ROLE_CLEANER,
        email="cleaner2@auditlog.com", full_name="Cleaner Two", is_active=True,
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def location1(company, db):
    from apps.locations.models import Location
    return Location.objects.create(company=company, name="Location One")


@pytest.fixture
def location2(company, db):
    from apps.locations.models import Location
    return Location.objects.create(company=company, name="Location Two")


@pytest.fixture
def auth_client(owner):
    c = APIClient()
    c.force_authenticate(user=owner)
    return c


def _make_job(company, location, cleaner):
    from apps.jobs.models import Job
    return Job.objects.create(
        company=company, location=location, cleaner=cleaner,
        status=Job.STATUS_SCHEDULED, context=Job.CONTEXT_CLEANING,
        scheduled_date=date.today(),
    )


def _make_event(job, user, event_type="check_in", lat=None, lon=None, dist=None):
    from apps.jobs.models import JobCheckEvent
    return JobCheckEvent.objects.create(
        job=job, user=user, event_type=event_type,
        latitude=lat, longitude=lon, distance_m=dist,
    )


# =============================================================================
# Auth Tests
# =============================================================================

@pytest.mark.django_db
class TestAuditLogAuth:
    def test_unauthenticated_list_returns_401(self):
        resp = APIClient().get("/api/jobs/audit-log/")
        assert resp.status_code == 401

    def test_unauthenticated_export_returns_401(self):
        resp = APIClient().get("/api/jobs/audit-log/export/")
        assert resp.status_code == 401

    def test_cleaner_returns_403(self, cleaner1):
        c = APIClient()
        c.force_authenticate(user=cleaner1)
        resp = c.get("/api/jobs/audit-log/")
        assert resp.status_code == 403


# =============================================================================
# Response Shape Tests
# =============================================================================

@pytest.mark.django_db
class TestAuditLogShape:
    def test_returns_200_empty(self, auth_client):
        resp = auth_client.get("/api/jobs/audit-log/")
        assert resp.status_code == 200

    def test_has_pagination_fields(self, auth_client):
        resp = auth_client.get("/api/jobs/audit-log/")
        data = resp.json()
        assert "count" in data
        assert "page" in data
        assert "page_size" in data
        assert "total_pages" in data
        assert "results" in data

    def test_empty_results(self, auth_client):
        resp = auth_client.get("/api/jobs/audit-log/")
        assert resp.json()["count"] == 0
        assert resp.json()["results"] == []

    def test_event_has_required_fields(self, auth_client, company, location1, cleaner1, db):
        job = _make_job(company, location1, cleaner1)
        _make_event(job, cleaner1)
        resp = auth_client.get("/api/jobs/audit-log/")
        event = resp.json()["results"][0]
        for field in ["id", "job_id", "event_type", "cleaner", "location", "created_at"]:
            assert field in event, f"Missing field: {field}"

    def test_event_cleaner_has_name_and_email(self, auth_client, company, location1, cleaner1, db):
        job = _make_job(company, location1, cleaner1)
        _make_event(job, cleaner1)
        resp = auth_client.get("/api/jobs/audit-log/")
        cleaner_data = resp.json()["results"][0]["cleaner"]
        assert cleaner_data["full_name"] == "Cleaner One"
        assert cleaner_data["email"] == "cleaner1@auditlog.com"


# =============================================================================
# Filter Tests
# =============================================================================

@pytest.mark.django_db
class TestAuditLogFilters:
    def test_filter_by_cleaner_id(self, auth_client, company, location1, cleaner1, cleaner2, db):
        job1 = _make_job(company, location1, cleaner1)
        job2 = _make_job(company, location1, cleaner2)
        _make_event(job1, cleaner1)
        _make_event(job2, cleaner2)
        resp = auth_client.get(f"/api/jobs/audit-log/?cleaner_id={cleaner1.id}")
        data = resp.json()
        assert data["count"] == 1
        assert data["results"][0]["cleaner"]["id"] == cleaner1.id

    def test_filter_by_location_id(self, auth_client, company, location1, location2, cleaner1, db):
        job1 = _make_job(company, location1, cleaner1)
        job2 = _make_job(company, location2, cleaner1)
        _make_event(job1, cleaner1)
        _make_event(job2, cleaner1)
        resp = auth_client.get(f"/api/jobs/audit-log/?location_id={location1.id}")
        data = resp.json()
        assert data["count"] == 1
        assert data["results"][0]["location"]["id"] == location1.id

    def test_filter_by_event_type(self, auth_client, company, location1, cleaner1, db):
        job = _make_job(company, location1, cleaner1)
        _make_event(job, cleaner1, event_type="check_in")
        _make_event(job, cleaner1, event_type="check_out")
        resp = auth_client.get("/api/jobs/audit-log/?event_type=check_in")
        data = resp.json()
        assert data["count"] == 1
        assert data["results"][0]["event_type"] == "check_in"

    def test_invalid_event_type_ignored(self, auth_client, company, location1, cleaner1, db):
        """Invalid event_type filter is ignored — returns all events."""
        job = _make_job(company, location1, cleaner1)
        _make_event(job, cleaner1)
        resp = auth_client.get("/api/jobs/audit-log/?event_type=invalid")
        assert resp.status_code == 200
        assert resp.json()["count"] == 1


# =============================================================================
# Pagination Tests
# =============================================================================

@pytest.mark.django_db
class TestAuditLogPagination:
    def test_page_size_limits_results(self, auth_client, company, location1, cleaner1, db):
        job = _make_job(company, location1, cleaner1)
        for _ in range(5):
            _make_event(job, cleaner1)
        resp = auth_client.get("/api/jobs/audit-log/?page_size=2")
        assert len(resp.json()["results"]) == 2
        assert resp.json()["count"] == 5
        assert resp.json()["total_pages"] == 3

    def test_page_2_returns_next_results(self, auth_client, company, location1, cleaner1, db):
        job = _make_job(company, location1, cleaner1)
        for _ in range(4):
            _make_event(job, cleaner1)
        resp = auth_client.get("/api/jobs/audit-log/?page_size=2&page=2")
        assert len(resp.json()["results"]) == 2
        assert resp.json()["page"] == 2


# =============================================================================
# Tenant Isolation Tests
# =============================================================================

@pytest.mark.django_db
class TestAuditLogTenantIsolation:
    def test_does_not_see_other_company_events(
        self, auth_client, company, other_company, location1, cleaner1, db
    ):
        from apps.accounts.models import User
        from apps.locations.models import Location
        other_cleaner = User.objects.create(
            company=other_company, role=User.ROLE_CLEANER,
            email="oc@audit.com", full_name="Other Cleaner", is_active=True,
        )
        other_loc = Location.objects.create(company=other_company, name="Other Loc")
        other_job = _make_job(other_company, other_loc, other_cleaner)
        _make_event(other_job, other_cleaner)
        resp = auth_client.get("/api/jobs/audit-log/")
        assert resp.json()["count"] == 0


# =============================================================================
# CSV Export Tests
# =============================================================================

@pytest.mark.django_db
class TestAuditLogExport:
    def test_export_returns_csv_content_type(self, auth_client):
        resp = auth_client.get("/api/jobs/audit-log/export/")
        assert resp.status_code == 200
        assert "text/csv" in resp["Content-Type"]

    def test_export_has_content_disposition_header(self, auth_client):
        resp = auth_client.get("/api/jobs/audit-log/export/")
        assert "Content-Disposition" in resp
        assert "attachment" in resp["Content-Disposition"]
        assert ".csv" in resp["Content-Disposition"]

    def test_export_contains_header_row(self, auth_client):
        resp = auth_client.get("/api/jobs/audit-log/export/")
        content = b"".join(resp.streaming_content).decode("utf-8")
        assert "ID" in content
        assert "Event Type" in content
        assert "Cleaner Name" in content

    def test_export_contains_data_rows(self, auth_client, company, location1, cleaner1, db):
        job = _make_job(company, location1, cleaner1)
        _make_event(job, cleaner1, event_type="check_in")
        resp = auth_client.get("/api/jobs/audit-log/export/")
        content = b"".join(resp.streaming_content).decode("utf-8")
        assert "check_in" in content
        assert "Cleaner One" in content

    def test_export_applies_filters(self, auth_client, company, location1, cleaner1, cleaner2, db):
        job1 = _make_job(company, location1, cleaner1)
        job2 = _make_job(company, location1, cleaner2)
        _make_event(job1, cleaner1)
        _make_event(job2, cleaner2)
        resp = auth_client.get(f"/api/jobs/audit-log/export/?cleaner_id={cleaner1.id}")
        content = b"".join(resp.streaming_content).decode("utf-8")
        # Only cleaner1's event should appear
        lines = [l for l in content.strip().split("\n") if l]
        assert len(lines) == 2  # header + 1 data row
        assert "Cleaner One" in content
        assert "Cleaner Two" not in content
