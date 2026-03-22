# backend/tests/test_s02_m008_maintenance_visits.py
"""
M008/S02: MaintainProof — Service Visits, Contracts & Technicians Tests

Covers:
1. ServiceVisitsListView — list/filter maintenance jobs
2. Service visit creation via manager/jobs API with maintenance context
3. ServiceContract CRUD
4. Technicians list
5. Asset visit history
"""

import pytest
from datetime import date, timedelta
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from apps.accounts.models import Company, User
from apps.maintenance.models import (
    AssetType, Asset, MaintenanceCategory, ServiceContract
)
from apps.locations.models import Location
from apps.jobs.models import Job


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def company(db):
    return Company.objects.create(
        name="MaintainProof Visits Co",
        plan=Company.PLAN_ACTIVE,
        plan_tier="standard",
    )


@pytest.fixture
def other_company(db):
    return Company.objects.create(
        name="Other Co",
        plan=Company.PLAN_ACTIVE,
        plan_tier="standard",
    )


def _make_user(company, role, suffix=""):
    u = User.objects.create(
        company=company,
        role=role,
        email=f"{role}{suffix}@visitstest.local",
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
def manager(company, db):
    return _make_user(company, User.ROLE_MANAGER)


@pytest.fixture
def staff(company, db):
    return _make_user(company, User.ROLE_STAFF)


@pytest.fixture
def cleaner(company, db):
    return _make_user(company, User.ROLE_CLEANER)


@pytest.fixture
def technician(company, db):
    """A cleaner used as a maintenance technician."""
    return _make_user(company, User.ROLE_CLEANER, "_tech")


@pytest.fixture
def location(company, db):
    return Location.objects.create(
        company=company,
        name="Main Building",
        address="123 Main St",
        is_active=True,
    )


@pytest.fixture
def asset_type(company, db):
    return AssetType.objects.create(company=company, name="HVAC")


@pytest.fixture
def asset(company, location, asset_type, db):
    return Asset.objects.create(
        company=company,
        location=location,
        asset_type=asset_type,
        name="AHU-01",
    )


@pytest.fixture
def category(company, db):
    return MaintenanceCategory.objects.create(
        company=company,
        name="Preventive",
    )


@pytest.fixture
def maintenance_job(company, location, technician, asset, category, db):
    """A maintenance service visit (Job with CONTEXT_MAINTENANCE)."""
    return Job.objects.create(
        company=company,
        location=location,
        cleaner=technician,
        asset=asset,
        maintenance_category=category,
        context=Job.CONTEXT_MAINTENANCE,
        status=Job.STATUS_SCHEDULED,
        scheduled_date=date.today(),
    )


@pytest.fixture
def cleaning_job(company, location, technician, db):
    """A cleaning job (CONTEXT_CLEANING) — should NOT appear in service visits."""
    return Job.objects.create(
        company=company,
        location=location,
        cleaner=technician,
        context=Job.CONTEXT_CLEANING,
        status=Job.STATUS_SCHEDULED,
        scheduled_date=date.today(),
    )


def auth_client(user):
    client = APIClient()
    token, _ = Token.objects.get_or_create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


# =============================================================================
# Service Visits List Tests
# =============================================================================

@pytest.mark.django_db
class TestServiceVisitsList:
    """GET /api/manager/service-visits/"""

    def test_owner_can_list_visits(self, owner):
        resp = auth_client(owner).get("/api/manager/service-visits/")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_staff_can_list_visits(self, staff):
        resp = auth_client(staff).get("/api/manager/service-visits/")
        assert resp.status_code == 200

    def test_cleaner_cannot_list_visits(self, cleaner):
        resp = auth_client(cleaner).get("/api/manager/service-visits/")
        assert resp.status_code == 403

    def test_returns_only_maintenance_context_jobs(
        self, owner, maintenance_job, cleaning_job
    ):
        resp = auth_client(owner).get("/api/manager/service-visits/")
        ids = [v["id"] for v in resp.json()]
        assert maintenance_job.id in ids
        assert cleaning_job.id not in ids

    def test_returns_only_own_company_visits(self, owner, other_company, db):
        other_loc = Location.objects.create(
            company=other_company, name="Other Loc", address="X", is_active=True
        )
        other_tech = _make_user(other_company, User.ROLE_CLEANER, "_oth")
        other_job = Job.objects.create(
            company=other_company,
            location=other_loc,
            cleaner=other_tech,
            context=Job.CONTEXT_MAINTENANCE,
            status=Job.STATUS_SCHEDULED,
            scheduled_date=date.today(),
        )
        resp = auth_client(owner).get("/api/manager/service-visits/")
        ids = [v["id"] for v in resp.json()]
        assert other_job.id not in ids

    def test_filter_by_status(self, owner, maintenance_job):
        resp = auth_client(owner).get(
            "/api/manager/service-visits/?status=scheduled"
        )
        assert resp.status_code == 200
        for v in resp.json():
            assert v["status"] == "scheduled"

    def test_filter_by_asset_id(self, owner, maintenance_job, asset):
        resp = auth_client(owner).get(
            f"/api/manager/service-visits/?asset_id={asset.id}"
        )
        assert resp.status_code == 200
        ids = [v["id"] for v in resp.json()]
        assert maintenance_job.id in ids

    def test_filter_by_date_range(self, owner, maintenance_job):
        today = date.today()
        resp = auth_client(owner).get(
            f"/api/manager/service-visits/?date_from={today}&date_to={today}"
        )
        assert resp.status_code == 200
        ids = [v["id"] for v in resp.json()]
        assert maintenance_job.id in ids

    def test_filter_excludes_out_of_range(self, owner, maintenance_job):
        future = date.today() + timedelta(days=10)
        resp = auth_client(owner).get(
            f"/api/manager/service-visits/?date_from={future}"
        )
        ids = [v["id"] for v in resp.json()]
        assert maintenance_job.id not in ids

    def test_filter_by_technician_id(self, owner, maintenance_job, technician):
        resp = auth_client(owner).get(
            f"/api/manager/service-visits/?technician_id={technician.id}"
        )
        ids = [v["id"] for v in resp.json()]
        assert maintenance_job.id in ids

    def test_unauthenticated_rejected(self):
        resp = APIClient().get("/api/manager/service-visits/")
        assert resp.status_code == 401


# =============================================================================
# Service Contract Tests
# =============================================================================

@pytest.mark.django_db
class TestServiceContractPermissions:
    """RBAC on /api/maintenance/contracts/"""

    def test_owner_can_list_contracts(self, owner):
        resp = auth_client(owner).get("/api/maintenance/contracts/")
        assert resp.status_code == 200

    def test_staff_can_list_contracts(self, staff):
        resp = auth_client(staff).get("/api/maintenance/contracts/")
        assert resp.status_code == 200

    def test_cleaner_cannot_list_contracts(self, cleaner):
        resp = auth_client(cleaner).get("/api/maintenance/contracts/")
        assert resp.status_code == 403

    def test_staff_cannot_create_contract(self, staff, location):
        resp = auth_client(staff).post("/api/maintenance/contracts/", {
            "name": "Staff Contract",
            "location_id": location.id,
            "start_date": str(date.today()),
        })
        assert resp.status_code == 403


@pytest.mark.django_db
class TestServiceContractCRUD:
    """ServiceContract create/read/update/delete."""

    def test_create_contract(self, owner, company, location):
        resp = auth_client(owner).post("/api/maintenance/contracts/", {
            "name": "Annual Maintenance",
            "location_id": location.id,
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=365)),
            "value": "50000.00",
        })
        assert resp.status_code == 201
        assert resp.json()["name"] == "Annual Maintenance"

    def test_create_contract_missing_name(self, owner, location):
        resp = auth_client(owner).post("/api/maintenance/contracts/", {
            "location_id": location.id,
            "start_date": str(date.today()),
        })
        assert resp.status_code == 400

    def test_list_contracts_scoped_to_company(self, owner, other_company, db):
        other_loc = Location.objects.create(
            company=other_company, name="OL", address="X", is_active=True
        )
        ServiceContract.objects.create(
            company=other_company,
            location=other_loc,
            name="Other Contract",
            start_date=date.today(),
        )
        resp = auth_client(owner).get("/api/maintenance/contracts/")
        titles = [c["name"] for c in resp.json()]
        assert "Other Contract" not in titles

    def test_get_contract_detail(self, owner, company, location):
        contract = ServiceContract.objects.create(
            company=company,
            location=location,
            name="Detail Contract",
            start_date=date.today(),
        )
        resp = auth_client(owner).get(f"/api/maintenance/contracts/{contract.id}/")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Detail Contract"

    def test_get_other_company_contract_returns_404(self, owner, other_company, db):
        other_loc = Location.objects.create(
            company=other_company, name="OL", address="X", is_active=True
        )
        other_contract = ServiceContract.objects.create(
            company=other_company,
            location=other_loc,
            name="Other Co Contract",
            start_date=date.today(),
        )
        resp = auth_client(owner).get(
            f"/api/maintenance/contracts/{other_contract.id}/"
        )
        assert resp.status_code == 404

    def test_patch_contract(self, owner, company, location):
        contract = ServiceContract.objects.create(
            company=company,
            location=location,
            name="Patch Me",
            start_date=date.today(),
        )
        resp = auth_client(owner).patch(
            f"/api/maintenance/contracts/{contract.id}/",
            {"name": "Patched Title"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Patched Title"

    def test_delete_contract(self, owner, company, location):
        contract = ServiceContract.objects.create(
            company=company,
            location=location,
            name="Delete Me",
            start_date=date.today(),
        )
        resp = auth_client(owner).delete(
            f"/api/maintenance/contracts/{contract.id}/"
        )
        assert resp.status_code in (200, 204)
        assert not ServiceContract.objects.filter(pk=contract.id).exists()


# =============================================================================
# Technicians List Tests
# =============================================================================

@pytest.mark.django_db
class TestTechniciansList:
    """GET /api/maintenance/technicians/"""

    def test_owner_can_list_technicians(self, owner):
        resp = auth_client(owner).get("/api/maintenance/technicians/")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_staff_can_list_technicians(self, staff):
        resp = auth_client(staff).get("/api/maintenance/technicians/")
        assert resp.status_code == 200

    def test_cleaner_cannot_list_technicians(self, cleaner):
        resp = auth_client(cleaner).get("/api/maintenance/technicians/")
        assert resp.status_code == 403

    def test_returns_only_own_company_technicians(self, owner, technician, other_company, db):
        other_tech = _make_user(other_company, User.ROLE_CLEANER, "_other")
        resp = auth_client(owner).get("/api/maintenance/technicians/")
        ids = [t["id"] for t in resp.json()]
        assert technician.id in ids
        assert other_tech.id not in ids


# =============================================================================
# Asset Visit History Tests
# =============================================================================

@pytest.mark.django_db
class TestAssetVisitHistory:
    """GET /api/manager/assets/<id>/visits/"""

    def test_owner_can_list_asset_visits(self, owner, asset):
        resp = auth_client(owner).get(f"/api/manager/assets/{asset.id}/visits/")
        assert resp.status_code == 200
        assert "visits" in resp.json()
        assert "asset" in resp.json()

    def test_staff_can_list_asset_visits(self, staff, asset):
        resp = auth_client(staff).get(f"/api/manager/assets/{asset.id}/visits/")
        assert resp.status_code == 200

    def test_visit_history_includes_maintenance_job(
        self, owner, asset, maintenance_job
    ):
        resp = auth_client(owner).get(f"/api/manager/assets/{asset.id}/visits/")
        ids = [v["id"] for v in resp.json()["visits"]]
        assert maintenance_job.id in ids

    def test_visit_history_excludes_other_assets(
        self, owner, company, location, asset_type, technician, maintenance_job, db
    ):
        other_asset = Asset.objects.create(
            company=company,
            location=location,
            asset_type=asset_type,
            name="Other AHU",
        )
        resp = auth_client(owner).get(f"/api/manager/assets/{other_asset.id}/visits/")
        ids = [v["id"] for v in resp.json()["visits"]]
        assert maintenance_job.id not in ids

    def test_other_company_asset_history_returns_404(self, owner, other_company, db):
        other_loc = Location.objects.create(
            company=other_company, name="OL", address="X", is_active=True
        )
        other_at = AssetType.objects.create(company=other_company, name="OAT")
        other_asset = Asset.objects.create(
            company=other_company,
            location=other_loc,
            asset_type=other_at,
            name="Other Asset",
        )
        resp = auth_client(owner).get(
            f"/api/manager/assets/{other_asset.id}/visits/"
        )
        assert resp.status_code == 404
