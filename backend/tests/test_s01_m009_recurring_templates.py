# backend/tests/test_s01_m009_recurring_templates.py
"""
M009/S01: MaintainProof — Recurring Templates & Generate Tests

Covers:
1. RecurringTemplateListCreateView — list, create, RBAC
2. RecurringTemplateDetailView — get, patch, delete
3. RecurringTemplateGenerateView — generate visits, idempotency, date logic
"""

import pytest
from datetime import date, timedelta
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from apps.accounts.models import Company, User
from apps.maintenance.models import (
    AssetType, Asset, MaintenanceCategory,
    RecurringVisitTemplate, GeneratedVisitLog,
)
from apps.locations.models import Location
from apps.jobs.models import Job


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def company(db):
    return Company.objects.create(
        name="Recurring Test Co",
        plan=Company.PLAN_ACTIVE,
        plan_tier="standard",
    )


@pytest.fixture
def other_company(db):
    return Company.objects.create(
        name="Other Recurring Co",
        plan=Company.PLAN_ACTIVE,
        plan_tier="standard",
    )


def _make_user(company, role, suffix=""):
    u = User.objects.create(
        company=company,
        role=role,
        email=f"{role}{suffix}@recurtest.local",
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
        company=company, name="Recurring Building", address="X", is_active=True
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
def template(company, location, db):
    return RecurringVisitTemplate.objects.create(
        company=company,
        location=location,
        name="Monthly HVAC Check",
        frequency="monthly",
        interval_days=30,
        start_date=date.today(),
        is_active=True,
        created_by=None,
    )


def auth_client(user):
    client = APIClient()
    token, _ = Token.objects.get_or_create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


# =============================================================================
# List & Create
# =============================================================================

@pytest.mark.django_db
class TestRecurringTemplateList:
    """GET /api/maintenance/recurring-templates/"""

    def test_owner_can_list(self, owner):
        resp = auth_client(owner).get("/api/maintenance/recurring-templates/")
        assert resp.status_code == 200

    def test_staff_can_list(self, staff):
        resp = auth_client(staff).get("/api/maintenance/recurring-templates/")
        assert resp.status_code == 200

    def test_cleaner_cannot_list(self, cleaner):
        resp = auth_client(cleaner).get("/api/maintenance/recurring-templates/")
        assert resp.status_code == 403

    def test_unauthenticated_rejected(self):
        resp = APIClient().get("/api/maintenance/recurring-templates/")
        assert resp.status_code == 401

    def test_scoped_to_company(self, owner, other_company, db):
        other_loc = Location.objects.create(
            company=other_company, name="OL", address="X", is_active=True
        )
        other_user = _make_user(other_company, User.ROLE_OWNER, "_o2")
        RecurringVisitTemplate.objects.create(
            company=other_company,
            location=other_loc,
            name="Other Template",
            frequency="monthly",
            interval_days=30,
            start_date=date.today(),
            is_active=True,
        )
        resp = auth_client(owner).get("/api/maintenance/recurring-templates/")
        names = [t["name"] for t in resp.json()]
        assert "Other Template" not in names

    def test_template_appears_in_list(self, owner, template):
        resp = auth_client(owner).get("/api/maintenance/recurring-templates/")
        names = [t["name"] for t in resp.json()]
        assert template.name in names


@pytest.mark.django_db
class TestRecurringTemplateCreate:
    """POST /api/maintenance/recurring-templates/"""

    def test_owner_can_create(self, owner, location):
        resp = auth_client(owner).post("/api/maintenance/recurring-templates/", {
            "name": "Quarterly Pump Service",
            "location_id": location.id,
            "frequency": "quarterly",
            "start_date": str(date.today()),
        })
        assert resp.status_code == 201
        assert resp.json()["name"] == "Quarterly Pump Service"

    def test_staff_cannot_create(self, staff, location):
        resp = auth_client(staff).post("/api/maintenance/recurring-templates/", {
            "name": "Staff Template",
            "location_id": location.id,
            "frequency": "monthly",
            "start_date": str(date.today()),
        })
        assert resp.status_code == 403

    def test_create_requires_name(self, owner, location):
        resp = auth_client(owner).post("/api/maintenance/recurring-templates/", {
            "location_id": location.id,
            "frequency": "monthly",
            "start_date": str(date.today()),
        })
        assert resp.status_code == 400

    def test_create_requires_location(self, owner):
        resp = auth_client(owner).post("/api/maintenance/recurring-templates/", {
            "name": "No Location Template",
            "frequency": "monthly",
            "start_date": str(date.today()),
        })
        assert resp.status_code == 400

    def test_create_requires_start_date(self, owner, location):
        resp = auth_client(owner).post("/api/maintenance/recurring-templates/", {
            "name": "No Date Template",
            "location_id": location.id,
            "frequency": "monthly",
        })
        assert resp.status_code == 400

    def test_create_with_asset(self, owner, location, asset):
        resp = auth_client(owner).post("/api/maintenance/recurring-templates/", {
            "name": "Asset-bound Template",
            "location_id": location.id,
            "asset_id": asset.id,
            "frequency": "monthly",
            "start_date": str(date.today()),
        })
        assert resp.status_code == 201
        assert resp.json()["asset"]["id"] == asset.id

    def test_create_with_technician(self, owner, location, technician):
        resp = auth_client(owner).post("/api/maintenance/recurring-templates/", {
            "name": "Tech Template",
            "location_id": location.id,
            "frequency": "monthly",
            "start_date": str(date.today()),
            "assigned_technician_id": technician.id,
        })
        assert resp.status_code == 201

    def test_invalid_date_format_rejected(self, owner, location):
        resp = auth_client(owner).post("/api/maintenance/recurring-templates/", {
            "name": "Bad Date",
            "location_id": location.id,
            "frequency": "monthly",
            "start_date": "not-a-date",
        })
        assert resp.status_code == 400

    def test_other_company_location_rejected(self, owner, other_company, db):
        other_loc = Location.objects.create(
            company=other_company, name="OL2", address="X", is_active=True
        )
        resp = auth_client(owner).post("/api/maintenance/recurring-templates/", {
            "name": "Cross-company Template",
            "location_id": other_loc.id,
            "frequency": "monthly",
            "start_date": str(date.today()),
        })
        assert resp.status_code == 400


# =============================================================================
# Detail (Get, Patch, Delete)
# =============================================================================

@pytest.mark.django_db
class TestRecurringTemplateDetail:
    """GET/PATCH/DELETE /api/maintenance/recurring-templates/<id>/"""

    def test_owner_can_get(self, owner, template):
        resp = auth_client(owner).get(
            f"/api/maintenance/recurring-templates/{template.id}/"
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == template.name

    def test_staff_can_get(self, staff, template):
        resp = auth_client(staff).get(
            f"/api/maintenance/recurring-templates/{template.id}/"
        )
        assert resp.status_code == 200

    def test_cleaner_cannot_get(self, cleaner, template):
        resp = auth_client(cleaner).get(
            f"/api/maintenance/recurring-templates/{template.id}/"
        )
        assert resp.status_code == 403

    def test_other_company_template_returns_404(self, owner, other_company, db):
        other_loc = Location.objects.create(
            company=other_company, name="OL3", address="X", is_active=True
        )
        other_tmpl = RecurringVisitTemplate.objects.create(
            company=other_company,
            location=other_loc,
            name="Other",
            frequency="monthly",
            interval_days=30,
            start_date=date.today(),
            is_active=True,
        )
        resp = auth_client(owner).get(
            f"/api/maintenance/recurring-templates/{other_tmpl.id}/"
        )
        assert resp.status_code == 404

    def test_owner_can_patch(self, owner, template):
        resp = auth_client(owner).patch(
            f"/api/maintenance/recurring-templates/{template.id}/",
            {"name": "Updated Name"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Name"

    def test_staff_cannot_patch(self, staff, template):
        resp = auth_client(staff).patch(
            f"/api/maintenance/recurring-templates/{template.id}/",
            {"name": "Staff Patch"},
        )
        assert resp.status_code == 403

    def test_owner_can_delete(self, owner, template):
        resp = auth_client(owner).delete(
            f"/api/maintenance/recurring-templates/{template.id}/"
        )
        assert resp.status_code in (200, 204)
        assert not RecurringVisitTemplate.objects.filter(pk=template.id).exists()


# =============================================================================
# Generate Visits
# =============================================================================

@pytest.mark.django_db
class TestRecurringTemplateGenerate:
    """POST /api/maintenance/recurring-templates/<id>/generate/"""

    def _generate_url(self, template_id):
        return f"/api/maintenance/recurring-templates/{template_id}/generate/"

    def test_owner_can_generate(self, owner, template, technician):
        template.assigned_technician = technician
        template.save()

        date_to = date.today() + timedelta(days=60)
        resp = auth_client(owner).post(
            self._generate_url(template.id),
            {"date_to": str(date_to)},
        )
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert "generated_count" in data
        assert "visits" in data
        assert isinstance(data["visits"], list)

    def test_staff_cannot_generate(self, staff, template):
        resp = auth_client(staff).post(
            self._generate_url(template.id),
            {"date_to": str(date.today() + timedelta(days=30))},
        )
        assert resp.status_code == 403

    def test_generate_creates_jobs(self, owner, template, technician):
        template.assigned_technician = technician
        template.save()

        date_to = date.today() + timedelta(days=65)
        resp = auth_client(owner).post(
            self._generate_url(template.id),
            {"date_to": str(date_to)},
        )
        assert resp.status_code in (200, 201)
        count = resp.json()["generated_count"]
        assert count >= 1
        # Jobs should exist with context=MAINTENANCE
        jobs = Job.objects.filter(
            company=template.company,
            context=Job.CONTEXT_MAINTENANCE,
        )
        assert jobs.count() >= count

    def test_generate_idempotent(self, owner, template, technician):
        template.assigned_technician = technician
        template.save()

        date_to = date.today() + timedelta(days=60)
        resp1 = auth_client(owner).post(
            self._generate_url(template.id),
            {"date_to": str(date_to)},
        )
        count1 = resp1.json()["generated_count"]

        # Second call — same date range should generate 0 new visits
        resp2 = auth_client(owner).post(
            self._generate_url(template.id),
            {"date_to": str(date_to)},
        )
        assert resp2.status_code == 200
        assert resp2.json()["generated_count"] == 0

    def test_generate_requires_date_to(self, owner, template):
        resp = auth_client(owner).post(
            self._generate_url(template.id), {}
        )
        assert resp.status_code == 400
        assert resp.json()["code"] == "VALIDATION_ERROR"

    def test_generate_invalid_date_format(self, owner, template):
        resp = auth_client(owner).post(
            self._generate_url(template.id),
            {"date_to": "not-a-date"},
        )
        assert resp.status_code == 400

    def test_generate_date_to_before_start_date_rejected(self, owner, company, location, db):
        # Template starts in the future
        future_tmpl = RecurringVisitTemplate.objects.create(
            company=company,
            location=location,
            name="Future Template",
            frequency="monthly",
            interval_days=30,
            start_date=date.today() + timedelta(days=90),
            is_active=True,
        )
        resp = auth_client(owner).post(
            self._generate_url(future_tmpl.id),
            {"date_to": str(date.today())},  # before start_date
        )
        assert resp.status_code == 400

    def test_generate_inactive_template_rejected(self, owner, company, location, db):
        inactive_tmpl = RecurringVisitTemplate.objects.create(
            company=company,
            location=location,
            name="Inactive",
            frequency="monthly",
            interval_days=30,
            start_date=date.today(),
            is_active=False,
        )
        resp = auth_client(owner).post(
            self._generate_url(inactive_tmpl.id),
            {"date_to": str(date.today() + timedelta(days=30))},
        )
        assert resp.status_code == 400
        assert resp.json()["code"] == "INVALID_STATE"

    def test_generate_respects_end_date(self, owner, company, location, technician, db):
        # Template ends in 15 days, ask for 60 days
        end_tmpl = RecurringVisitTemplate.objects.create(
            company=company,
            location=location,
            name="Ending Template",
            frequency="custom",
            interval_days=5,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=15),
            is_active=True,
            assigned_technician=technician,
        )
        resp = auth_client(owner).post(
            self._generate_url(end_tmpl.id),
            {"date_to": str(date.today() + timedelta(days=60))},
        )
        assert resp.status_code in (200, 201)
        # Should not generate beyond end_date
        for visit in resp.json()["visits"]:
            vdate = date.fromisoformat(visit["scheduled_date"])
            assert vdate <= end_tmpl.end_date
