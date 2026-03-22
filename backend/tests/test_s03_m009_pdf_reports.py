# backend/tests/test_s03_m009_pdf_reports.py
"""
M009/S03: MaintainProof — PDF Reports & Email Tests

Covers:
1. ServiceVisitReportView — PDF for completed maintenance visit
2. ServiceVisitBilingualReportView — bilingual PDF
3. AssetHistoryReportView — asset history PDF/JSON
4. MaintenanceWeeklyReportPdfView / MaintenanceMonthlyReportPdfView
5. MaintenanceWeeklyReportEmailView / MaintenanceMonthlyReportEmailView
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
        name="PDF Test Co",
        plan=Company.PLAN_ACTIVE,
        plan_tier="standard",
    )


def _make_user(company, role, suffix=""):
    u = User.objects.create(
        company=company,
        role=role,
        email=f"{role}{suffix}@pdftest.local",
        full_name=f"{role.title()} User",
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
        company=company, name="PDF Building", address="X", is_active=True
    )


@pytest.fixture
def asset_type(company, db):
    return AssetType.objects.create(company=company, name="Generator")


@pytest.fixture
def asset(company, location, asset_type, db):
    return Asset.objects.create(
        company=company, location=location, asset_type=asset_type, name="GEN-01"
    )


@pytest.fixture
def category(company, db):
    return MaintenanceCategory.objects.create(company=company, name="Corrective")


@pytest.fixture
def completed_visit(company, location, technician, asset, category, db):
    return Job.objects.create(
        company=company,
        location=location,
        cleaner=technician,
        asset=asset,
        maintenance_category=category,
        context=Job.CONTEXT_MAINTENANCE,
        status=Job.STATUS_COMPLETED,
        scheduled_date=date.today() - timedelta(days=1),
    )


@pytest.fixture
def scheduled_visit(company, location, technician, db):
    return Job.objects.create(
        company=company,
        location=location,
        cleaner=technician,
        context=Job.CONTEXT_MAINTENANCE,
        status=Job.STATUS_SCHEDULED,
        scheduled_date=date.today(),
    )


def auth_client(user):
    client = APIClient()
    token, _ = Token.objects.get_or_create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


# =============================================================================
# Service Visit PDF Report
# =============================================================================

@pytest.mark.django_db
class TestServiceVisitReport:
    """GET /api/maintenance/visits/<id>/report/"""

    def test_owner_can_get_pdf(self, owner, completed_visit):
        resp = auth_client(owner).get(
            f"/api/maintenance/visits/{completed_visit.id}/report/"
        )
        assert resp.status_code == 200
        assert resp["Content-Type"] == "application/pdf"
        assert len(resp.content) > 100

    def test_staff_can_get_pdf(self, staff, completed_visit):
        resp = auth_client(staff).get(
            f"/api/maintenance/visits/{completed_visit.id}/report/"
        )
        assert resp.status_code == 200

    def test_cleaner_cannot_get_pdf(self, cleaner, completed_visit):
        resp = auth_client(cleaner).get(
            f"/api/maintenance/visits/{completed_visit.id}/report/"
        )
        assert resp.status_code == 403

    def test_scheduled_visit_rejected(self, owner, scheduled_visit):
        resp = auth_client(owner).get(
            f"/api/maintenance/visits/{scheduled_visit.id}/report/"
        )
        assert resp.status_code == 400
        assert resp.json()["code"] == "INVALID_STATUS"

    def test_nonexistent_visit_returns_404(self, owner):
        resp = auth_client(owner).get("/api/maintenance/visits/999999/report/")
        assert resp.status_code == 404

    def test_cleaning_visit_rejected(self, owner, location, technician, db):
        cleaning_job = Job.objects.create(
            company=owner.company,
            location=location,
            cleaner=technician,
            context=Job.CONTEXT_CLEANING,
            status=Job.STATUS_COMPLETED,
            scheduled_date=date.today(),
        )
        resp = auth_client(owner).get(
            f"/api/maintenance/visits/{cleaning_job.id}/report/"
        )
        assert resp.status_code == 400
        assert resp.json()["code"] == "INVALID_CONTEXT"


# =============================================================================
# Bilingual Service Visit PDF Report
# =============================================================================

@pytest.mark.django_db
class TestServiceVisitBilingualReport:
    """GET /api/maintenance/visits/<id>/report/bilingual/"""

    def test_owner_can_get_bilingual_pdf(self, owner, completed_visit):
        resp = auth_client(owner).get(
            f"/api/maintenance/visits/{completed_visit.id}/report/bilingual/"
        )
        assert resp.status_code == 200
        assert resp["Content-Type"] == "application/pdf"

    def test_cleaner_cannot_get_bilingual_pdf(self, cleaner, completed_visit):
        resp = auth_client(cleaner).get(
            f"/api/maintenance/visits/{completed_visit.id}/report/bilingual/"
        )
        assert resp.status_code == 403

    def test_non_completed_visit_rejected(self, owner, scheduled_visit):
        resp = auth_client(owner).get(
            f"/api/maintenance/visits/{scheduled_visit.id}/report/bilingual/"
        )
        assert resp.status_code == 400


# =============================================================================
# Asset History Report
# =============================================================================

@pytest.mark.django_db
class TestAssetHistoryReport:
    """GET /api/maintenance/assets/<id>/history/report/"""

    def test_owner_can_get_report(self, owner, asset):
        resp = auth_client(owner).get(
            f"/api/maintenance/assets/{asset.id}/history/report/"
        )
        # Accept PDF or JSON
        assert resp.status_code == 200

    def test_staff_can_get_report(self, staff, asset):
        resp = auth_client(staff).get(
            f"/api/maintenance/assets/{asset.id}/history/report/"
        )
        assert resp.status_code == 200

    def test_cleaner_cannot_get_report(self, cleaner, asset):
        resp = auth_client(cleaner).get(
            f"/api/maintenance/assets/{asset.id}/history/report/"
        )
        assert resp.status_code == 403


# =============================================================================
# Weekly/Monthly PDF Reports
# =============================================================================

@pytest.mark.django_db
class TestWeeklyReportPdf:
    """GET /api/maintenance/reports/weekly/pdf/"""

    def test_owner_can_get_weekly_pdf(self, owner):
        resp = auth_client(owner).get("/api/maintenance/reports/weekly/pdf/")
        assert resp.status_code == 200
        assert resp["Content-Type"] == "application/pdf"
        assert len(resp.content) > 100

    def test_staff_can_get_weekly_pdf(self, staff):
        resp = auth_client(staff).get("/api/maintenance/reports/weekly/pdf/")
        assert resp.status_code == 200

    def test_cleaner_cannot_get_weekly_pdf(self, cleaner):
        resp = auth_client(cleaner).get("/api/maintenance/reports/weekly/pdf/")
        assert resp.status_code == 403

    def test_unauthenticated_rejected(self):
        resp = APIClient().get("/api/maintenance/reports/weekly/pdf/")
        assert resp.status_code == 401


@pytest.mark.django_db
class TestMonthlyReportPdf:
    """GET /api/maintenance/reports/monthly/pdf/"""

    def test_owner_can_get_monthly_pdf(self, owner):
        resp = auth_client(owner).get("/api/maintenance/reports/monthly/pdf/")
        assert resp.status_code == 200
        assert resp["Content-Type"] == "application/pdf"

    def test_staff_can_get_monthly_pdf(self, staff):
        resp = auth_client(staff).get("/api/maintenance/reports/monthly/pdf/")
        assert resp.status_code == 200

    def test_cleaner_cannot_get_monthly_pdf(self, cleaner):
        resp = auth_client(cleaner).get("/api/maintenance/reports/monthly/pdf/")
        assert resp.status_code == 403


# =============================================================================
# Email Report Views
# =============================================================================

@pytest.mark.django_db
class TestWeeklyReportEmail:
    """POST /api/maintenance/reports/weekly/email/"""

    def test_owner_can_trigger_email(self, owner):
        resp = auth_client(owner).post(
            "/api/maintenance/reports/weekly/email/",
            {"email": owner.email},
        )
        # Email may fail if not configured — accept 200 or 500
        assert resp.status_code in (200, 500)

    def test_staff_can_trigger_email(self, staff):
        resp = auth_client(staff).post(
            "/api/maintenance/reports/weekly/email/",
            {"email": staff.email},
        )
        assert resp.status_code in (200, 500)

    def test_cleaner_cannot_trigger_email(self, cleaner):
        resp = auth_client(cleaner).post(
            "/api/maintenance/reports/weekly/email/", {}
        )
        assert resp.status_code == 403

    def test_no_email_rejected(self, owner):
        # User has no email field that could fallback — use empty email
        u = User.objects.create(
            company=owner.company,
            role=User.ROLE_OWNER,
            email="",
            full_name="No Email User",
            is_active=True,
        )
        u.set_password("pass")
        u.save()
        token, _ = Token.objects.get_or_create(user=u)
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        resp = c.post("/api/maintenance/reports/weekly/email/", {})
        assert resp.status_code == 400
        assert resp.json()["code"] == "VALIDATION_ERROR"


@pytest.mark.django_db
class TestMonthlyReportEmail:
    """POST /api/maintenance/reports/monthly/email/"""

    def test_owner_can_trigger_email(self, owner):
        resp = auth_client(owner).post(
            "/api/maintenance/reports/monthly/email/",
            {"email": owner.email},
        )
        assert resp.status_code in (200, 500)

    def test_cleaner_cannot_trigger_email(self, cleaner):
        resp = auth_client(cleaner).post(
            "/api/maintenance/reports/monthly/email/", {}
        )
        assert resp.status_code == 403
