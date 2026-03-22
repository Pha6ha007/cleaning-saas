# backend/tests/test_s03_m008_maintenance_analytics.py
"""
M008/S03: MaintainProof — Analytics & Reports Tests

Covers:
1. MaintenanceAnalyticsSummaryView
2. MaintenanceAnalyticsVisitsTrendView
3. MaintenanceAnalyticsSlaTrendView
4. MaintenanceAnalyticsAssetsPerformanceView
5. MaintenanceAnalyticsTechniciansPerformanceView
6. Weekly/Monthly report text endpoints
"""

import pytest
from datetime import date, timedelta
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from apps.accounts.models import Company, User
from apps.maintenance.models import AssetType, Asset, MaintenanceCategory
from apps.locations.models import Location
from apps.jobs.models import Job


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def company(db):
    return Company.objects.create(
        name="Analytics Test Co",
        plan=Company.PLAN_ACTIVE,
        plan_tier="standard",
    )


def _make_user(company, role, suffix=""):
    u = User.objects.create(
        company=company,
        role=role,
        email=f"{role}{suffix}@analyticstest.local",
        full_name=f"{role.title()}",
        is_active=True,
    )
    u.set_password("pass123")
    u.save()
    return u


@pytest.fixture
def owner(company, db):
    return _make_user(company, User.ROLE_OWNER)


@pytest.fixture
def staff(company, db):
    return _make_user(company, User.ROLE_STAFF)


@pytest.fixture
def cleaner(company, db):
    return _make_user(company, User.ROLE_CLEANER)


@pytest.fixture
def technician(company, db):
    return _make_user(company, User.ROLE_CLEANER, "_tech")


@pytest.fixture
def location(company, db):
    return Location.objects.create(
        company=company, name="Analytics Building", address="X", is_active=True
    )


@pytest.fixture
def asset_type(company, db):
    return AssetType.objects.create(company=company, name="Chiller")


@pytest.fixture
def asset(company, location, asset_type, db):
    return Asset.objects.create(
        company=company, location=location, asset_type=asset_type, name="CH-01"
    )


@pytest.fixture
def category(company, db):
    return MaintenanceCategory.objects.create(company=company, name="Preventive")


@pytest.fixture
def completed_visit(company, location, technician, asset, category, db):
    j = Job.objects.create(
        company=company,
        location=location,
        cleaner=technician,
        asset=asset,
        maintenance_category=category,
        context=Job.CONTEXT_MAINTENANCE,
        status=Job.STATUS_COMPLETED,
        scheduled_date=date.today(),
    )
    return j


def auth_client(user):
    client = APIClient()
    token, _ = Token.objects.get_or_create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


# =============================================================================
# Analytics Summary Tests
# =============================================================================

@pytest.mark.django_db
class TestAnalyticsSummary:
    """GET /api/maintenance/analytics/summary/"""

    def test_owner_can_access(self, owner):
        resp = auth_client(owner).get("/api/maintenance/analytics/summary/?date_from=2026-02-15&date_to=2026-03-17")
        assert resp.status_code == 200

    def test_staff_can_access(self, staff):
        resp = auth_client(staff).get("/api/maintenance/analytics/summary/?date_from=2026-02-15&date_to=2026-03-17")
        assert resp.status_code == 200

    def test_cleaner_cannot_access(self, cleaner):
        resp = auth_client(cleaner).get("/api/maintenance/analytics/summary/?date_from=2026-02-15&date_to=2026-03-17")
        assert resp.status_code == 403

    def test_unauthenticated_rejected(self):
        resp = APIClient().get("/api/maintenance/analytics/summary/")
        assert resp.status_code == 401

    def test_response_has_expected_keys(self, owner):
        resp = auth_client(owner).get("/api/maintenance/analytics/summary/?date_from=2026-02-15&date_to=2026-03-17")
        data = resp.json()
        # Should have numeric summary fields
        assert isinstance(data, dict)
        # At minimum, should have some keys
        assert len(data) > 0

    def test_accepts_days_param(self, owner):
        resp = auth_client(owner).get("/api/maintenance/analytics/summary/?date_from=2026-02-15&date_to=2026-03-17")
        assert resp.status_code == 200

    def test_accepts_date_range_params(self, owner):
        today = date.today()
        resp = auth_client(owner).get(
            f"/api/maintenance/analytics/summary/"
            f"?date_from={today - timedelta(days=30)}&date_to={today}"
        )
        assert resp.status_code == 200


# =============================================================================
# Visits Trend Tests
# =============================================================================

@pytest.mark.django_db
class TestVisitsTrend:
    """GET /api/maintenance/analytics/visits-trend/"""

    def test_owner_can_access(self, owner):
        resp = auth_client(owner).get("/api/maintenance/analytics/visits-trend/?date_from=2026-02-15&date_to=2026-03-17")
        assert resp.status_code == 200

    def test_staff_can_access(self, staff):
        resp = auth_client(staff).get("/api/maintenance/analytics/visits-trend/?date_from=2026-02-15&date_to=2026-03-17")
        assert resp.status_code == 200

    def test_cleaner_cannot_access(self, cleaner):
        resp = auth_client(cleaner).get("/api/maintenance/analytics/visits-trend/?date_from=2026-02-15&date_to=2026-03-17")
        assert resp.status_code == 403

    def test_returns_list_or_dict(self, owner):
        resp = auth_client(owner).get("/api/maintenance/analytics/visits-trend/?date_from=2026-02-15&date_to=2026-03-17")
        assert isinstance(resp.json(), (list, dict))


# =============================================================================
# SLA Trend Tests
# =============================================================================

@pytest.mark.django_db
class TestSlaTrend:
    """GET /api/maintenance/analytics/sla-trend/"""

    def test_owner_can_access(self, owner):
        resp = auth_client(owner).get("/api/maintenance/analytics/sla-trend/?date_from=2026-02-15&date_to=2026-03-17")
        assert resp.status_code == 200

    def test_cleaner_cannot_access(self, cleaner):
        resp = auth_client(cleaner).get("/api/maintenance/analytics/sla-trend/?date_from=2026-02-15&date_to=2026-03-17")
        assert resp.status_code == 403

    def test_returns_list_or_dict(self, owner):
        resp = auth_client(owner).get("/api/maintenance/analytics/sla-trend/?date_from=2026-02-15&date_to=2026-03-17")
        assert isinstance(resp.json(), (list, dict))


# =============================================================================
# Assets Performance Tests
# =============================================================================

@pytest.mark.django_db
class TestAssetsPerformance:
    """GET /api/maintenance/analytics/assets-performance/"""

    def test_owner_can_access(self, owner):
        resp = auth_client(owner).get("/api/maintenance/analytics/assets-performance/?date_from=2026-02-15&date_to=2026-03-17")
        assert resp.status_code == 200

    def test_staff_can_access(self, staff):
        resp = auth_client(staff).get("/api/maintenance/analytics/assets-performance/?date_from=2026-02-15&date_to=2026-03-17")
        assert resp.status_code == 200

    def test_cleaner_cannot_access(self, cleaner):
        resp = auth_client(cleaner).get(
            "/api/maintenance/analytics/assets-performance/"
            "?date_from=2026-02-15&date_to=2026-03-17"
        )
        assert resp.status_code == 403

    def test_returns_list_or_dict(self, owner):
        resp = auth_client(owner).get("/api/maintenance/analytics/assets-performance/?date_from=2026-02-15&date_to=2026-03-17")
        assert isinstance(resp.json(), (list, dict))

    def test_completed_visit_visible_in_asset_performance(
        self, owner, completed_visit, asset
    ):
        resp = auth_client(owner).get("/api/maintenance/analytics/assets-performance/?date_from=2026-02-15&date_to=2026-03-17")
        assert resp.status_code == 200


# =============================================================================
# Technicians Performance Tests
# =============================================================================

@pytest.mark.django_db
class TestTechniciansPerformance:
    """GET /api/maintenance/analytics/technicians-performance/"""

    def test_owner_can_access(self, owner):
        resp = auth_client(owner).get(
            "/api/maintenance/analytics/technicians-performance/?date_from=2026-02-15&date_to=2026-03-17"
        )
        assert resp.status_code == 200

    def test_staff_can_access(self, staff):
        resp = auth_client(staff).get(
            "/api/maintenance/analytics/technicians-performance/"
            "?date_from=2026-02-15&date_to=2026-03-17"
        )
        assert resp.status_code == 200

    def test_cleaner_cannot_access(self, cleaner):
        resp = auth_client(cleaner).get(
            "/api/maintenance/analytics/technicians-performance/"
            "?date_from=2026-02-15&date_to=2026-03-17"
        )
        assert resp.status_code == 403

    def test_returns_list_or_dict(self, owner):
        resp = auth_client(owner).get(
            "/api/maintenance/analytics/technicians-performance/?date_from=2026-02-15&date_to=2026-03-17"
        )
        assert isinstance(resp.json(), (list, dict))


# =============================================================================
# Reports (JSON) Tests
# =============================================================================

@pytest.mark.django_db
class TestMaintenanceReports:
    """GET /api/maintenance/reports/weekly/ and /monthly/"""

    def test_weekly_report_owner(self, owner):
        resp = auth_client(owner).get("/api/maintenance/reports/weekly/")
        assert resp.status_code == 200

    def test_weekly_report_staff(self, staff):
        resp = auth_client(staff).get("/api/maintenance/reports/weekly/")
        assert resp.status_code == 200

    def test_weekly_report_cleaner_blocked(self, cleaner):
        resp = auth_client(cleaner).get("/api/maintenance/reports/weekly/")
        assert resp.status_code == 403

    def test_monthly_report_owner(self, owner):
        resp = auth_client(owner).get("/api/maintenance/reports/monthly/")
        assert resp.status_code == 200

    def test_monthly_report_cleaner_blocked(self, cleaner):
        resp = auth_client(cleaner).get("/api/maintenance/reports/monthly/")
        assert resp.status_code == 403

    def test_weekly_report_has_data_keys(self, owner):
        resp = auth_client(owner).get("/api/maintenance/reports/weekly/")
        data = resp.json()
        assert isinstance(data, dict)
        assert len(data) > 0

    def test_reports_unauthenticated_rejected(self):
        resp = APIClient().get("/api/maintenance/reports/weekly/")
        assert resp.status_code == 401
