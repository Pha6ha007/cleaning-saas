# backend/tests/test_s01_m010_customer_portal.py
"""
M010/S01: Customer Portal — Read Endpoints Tests

Covers:
1. CustomerDashboardView
2. CustomerLocationsView
3. CustomerAssetsView + CustomerAssetDetailView
4. CustomerVisitsView + CustomerVisitDetailView
5. CustomerContractsView + CustomerContractDetailView
6. CustomerProfileView

RBAC: all require role=customer + at least one location assigned.
"""

import pytest
from datetime import date
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from apps.accounts.models import Company, User
from apps.locations.models import Location
from apps.maintenance.models import Asset, AssetType, ServiceContract, MaintenanceCategory
from apps.jobs.models import Job


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def company(db):
    return Company.objects.create(
        name="Portal Co",
        plan=Company.PLAN_ACTIVE,
        plan_tier="standard",
    )


def _make_user(company, role, suffix="", extra=None):
    kwargs = dict(
        company=company,
        role=role,
        email=f"{role}{suffix}@portal.local",
        full_name=f"{role.title()} User",
        is_active=True,
    )
    if extra:
        kwargs.update(extra)
    u = User(**kwargs)
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
def location(company, db):
    return Location.objects.create(
        company=company, name="Portal Building", address="1 Test St", is_active=True
    )


@pytest.fixture
def location2(company, db):
    return Location.objects.create(
        company=company, name="Portal Annex", address="2 Test St", is_active=True
    )


@pytest.fixture
def customer(company, location, db):
    u = _make_user(company, User.ROLE_CUSTOMER)
    u.customer_locations.add(location)
    return u


@pytest.fixture
def customer_no_locations(company, db):
    return _make_user(company, User.ROLE_CUSTOMER, suffix="_noloc")


@pytest.fixture
def asset_type(company, db):
    return AssetType.objects.create(company=company, name="HVAC")


@pytest.fixture
def asset(company, location, asset_type, db):
    return Asset.objects.create(
        company=company,
        location=location,
        asset_type=asset_type,
        name="HVAC-001",
        serial_number="SN-001",
        is_active=True,
    )


@pytest.fixture
def technician(company, db):
    return _make_user(company, User.ROLE_CLEANER, suffix="_tech")


@pytest.fixture
def visit(company, location, technician, db):
    return Job.objects.create(
        company=company,
        location=location,
        cleaner=technician,
        context=Job.CONTEXT_MAINTENANCE,
        status=Job.STATUS_SCHEDULED,
        scheduled_date=date.today(),
    )


@pytest.fixture
def contract(company, location, db):
    return ServiceContract.objects.create(
        company=company,
        location=location,
        name="Annual HVAC Contract",
        contract_type="preventive",
        status="active",
        start_date=date(2024, 1, 1),
        end_date=date(2026, 12, 31),
    )


def auth_client(user):
    client = APIClient()
    token, _ = Token.objects.get_or_create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


# =============================================================================
# CustomerDashboardView
# =============================================================================

@pytest.mark.django_db
class TestCustomerDashboard:
    """GET /api/customer/dashboard/"""

    def test_customer_can_access_dashboard(self, customer):
        resp = auth_client(customer).get("/api/customer/dashboard/")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_assets" in data
        assert "upcoming_visits" in data
        assert "recent_completions" in data
        assert "active_contracts" in data
        assert "locations_count" in data

    def test_dashboard_counts_assets(self, customer, asset):
        resp = auth_client(customer).get("/api/customer/dashboard/")
        assert resp.status_code == 200
        assert resp.json()["total_assets"] == 1

    def test_dashboard_counts_scheduled_visits(self, customer, visit):
        resp = auth_client(customer).get("/api/customer/dashboard/")
        assert resp.status_code == 200
        assert resp.json()["upcoming_visits"] == 1

    def test_dashboard_counts_active_contracts(self, customer, contract):
        resp = auth_client(customer).get("/api/customer/dashboard/")
        assert resp.status_code == 200
        assert resp.json()["active_contracts"] == 1

    def test_owner_blocked(self, owner):
        resp = auth_client(owner).get("/api/customer/dashboard/")
        assert resp.status_code == 403

    def test_manager_blocked(self, manager):
        resp = auth_client(manager).get("/api/customer/dashboard/")
        assert resp.status_code == 403

    def test_customer_no_locations_blocked(self, customer_no_locations):
        resp = auth_client(customer_no_locations).get("/api/customer/dashboard/")
        assert resp.status_code == 403
        assert resp.json()["code"] == "NO_ACCESS"

    def test_unauthenticated_rejected(self):
        resp = APIClient().get("/api/customer/dashboard/")
        assert resp.status_code == 401


# =============================================================================
# CustomerLocationsView
# =============================================================================

@pytest.mark.django_db
class TestCustomerLocations:
    """GET /api/customer/locations/"""

    def test_customer_can_list_locations(self, customer, location):
        resp = auth_client(customer).get("/api/customer/locations/")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert any(loc["id"] == location.id for loc in data)

    def test_location_has_required_fields(self, customer, location):
        resp = auth_client(customer).get("/api/customer/locations/")
        assert resp.status_code == 200
        loc = resp.json()[0]
        assert "id" in loc
        assert "name" in loc
        assert "address" in loc

    def test_customer_sees_only_assigned_locations(self, customer, location, location2):
        # location2 not assigned to customer
        resp = auth_client(customer).get("/api/customer/locations/")
        assert resp.status_code == 200
        ids = [l["id"] for l in resp.json()]
        assert location.id in ids
        assert location2.id not in ids

    def test_owner_blocked(self, owner):
        resp = auth_client(owner).get("/api/customer/locations/")
        assert resp.status_code == 403

    def test_unauthenticated_rejected(self):
        resp = APIClient().get("/api/customer/locations/")
        assert resp.status_code == 401


# =============================================================================
# CustomerAssetsView
# =============================================================================

@pytest.mark.django_db
class TestCustomerAssets:
    """GET /api/customer/assets/ and GET /api/customer/assets/{id}/"""

    def test_customer_can_list_assets(self, customer, asset):
        resp = auth_client(customer).get("/api/customer/assets/")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert any(a["id"] == asset.id for a in data)

    def test_asset_has_required_fields(self, customer, asset):
        resp = auth_client(customer).get("/api/customer/assets/")
        assert resp.status_code == 200
        a = resp.json()[0]
        assert "id" in a
        assert "name" in a
        assert "location" in a
        assert "warranty_status" in a

    def test_filter_by_location_id(self, customer, location, asset):
        resp = auth_client(customer).get(f"/api/customer/assets/?location_id={location.id}")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_filter_by_foreign_location_blocked(self, customer, location2):
        # location2 not assigned to customer
        resp = auth_client(customer).get(f"/api/customer/assets/?location_id={location2.id}")
        assert resp.status_code == 403
        assert resp.json()["code"] == "FORBIDDEN"

    def test_customer_can_get_asset_detail(self, customer, asset):
        resp = auth_client(customer).get(f"/api/customer/assets/{asset.id}/")
        assert resp.status_code == 200
        assert resp.json()["id"] == asset.id
        assert resp.json()["serial_number"] == "SN-001"

    def test_asset_detail_not_found_for_foreign_location(self, customer, company, db):
        # Asset at location2 (not assigned to customer)
        loc2 = Location.objects.create(company=company, name="Other", address="X", is_active=True)
        asset_type = AssetType.objects.create(company=company, name="T")
        foreign_asset = Asset.objects.create(
            company=company, location=loc2, asset_type=asset_type, name="X", is_active=True
        )
        resp = auth_client(customer).get(f"/api/customer/assets/{foreign_asset.id}/")
        assert resp.status_code == 404

    def test_owner_blocked(self, owner):
        resp = auth_client(owner).get("/api/customer/assets/")
        assert resp.status_code == 403

    def test_unauthenticated_rejected(self):
        resp = APIClient().get("/api/customer/assets/")
        assert resp.status_code == 401


# =============================================================================
# CustomerVisitsView
# =============================================================================

@pytest.mark.django_db
class TestCustomerVisits:
    """GET /api/customer/visits/"""

    def test_customer_can_list_visits(self, customer, visit):
        resp = auth_client(customer).get("/api/customer/visits/")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert any(v["id"] == visit.id for v in data)

    def test_visit_has_required_fields(self, customer, visit):
        resp = auth_client(customer).get("/api/customer/visits/")
        assert resp.status_code == 200
        v = resp.json()[0]
        assert "id" in v
        assert "status" in v
        assert "scheduled_date" in v
        assert "location" in v

    def test_filter_by_status(self, customer, visit):
        resp = auth_client(customer).get("/api/customer/visits/?status=scheduled")
        assert resp.status_code == 200
        assert all(v["status"] == "scheduled" for v in resp.json())

    def test_filter_by_status_excludes_others(self, customer, visit):
        resp = auth_client(customer).get("/api/customer/visits/?status=completed")
        assert resp.status_code == 200
        # visit is scheduled, should not appear
        assert not any(v["id"] == visit.id for v in resp.json())

    def test_only_maintenance_visits_returned(self, customer, company, location, technician, db):
        # Create a cleaning job (context=cleaning)
        cleaning_job = Job.objects.create(
            company=company,
            location=location,
            cleaner=technician,
            context=Job.CONTEXT_CLEANING,
            status=Job.STATUS_SCHEDULED,
            scheduled_date=date.today(),
        )
        resp = auth_client(customer).get("/api/customer/visits/")
        assert resp.status_code == 200
        ids = [v["id"] for v in resp.json()]
        assert cleaning_job.id not in ids

    def test_owner_blocked(self, owner):
        resp = auth_client(owner).get("/api/customer/visits/")
        assert resp.status_code == 403

    def test_unauthenticated_rejected(self):
        resp = APIClient().get("/api/customer/visits/")
        assert resp.status_code == 401


# =============================================================================
# CustomerVisitDetailView
# =============================================================================

@pytest.mark.django_db
class TestCustomerVisitDetail:
    """GET /api/customer/visits/{id}/"""

    def test_customer_can_get_visit_detail(self, customer, visit):
        resp = auth_client(customer).get(f"/api/customer/visits/{visit.id}/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == visit.id
        assert "checklist" in data
        assert "checklist_progress" in data

    def test_visit_detail_not_found_for_foreign_location(self, customer, company, db):
        loc2 = Location.objects.create(company=company, name="Other", address="X", is_active=True)
        u = _make_user(company, User.ROLE_CLEANER, "_x")
        foreign_visit = Job.objects.create(
            company=company,
            location=loc2,
            cleaner=u,
            context=Job.CONTEXT_MAINTENANCE,
            status=Job.STATUS_SCHEDULED,
            scheduled_date=date.today(),
        )
        resp = auth_client(customer).get(f"/api/customer/visits/{foreign_visit.id}/")
        assert resp.status_code == 404

    def test_manager_notes_hidden(self, customer, visit):
        # Internal notes should not leak to customer
        visit.manager_notes = "Internal: customer is difficult"
        visit.save()
        resp = auth_client(customer).get(f"/api/customer/visits/{visit.id}/")
        assert resp.status_code == 200
        assert resp.json().get("manager_notes", "") == ""

    def test_owner_blocked(self, owner, visit):
        resp = auth_client(owner).get(f"/api/customer/visits/{visit.id}/")
        assert resp.status_code == 403

    def test_unauthenticated_rejected(self, visit):
        resp = APIClient().get(f"/api/customer/visits/{visit.id}/")
        assert resp.status_code == 401


# =============================================================================
# CustomerContractsView
# =============================================================================

@pytest.mark.django_db
class TestCustomerContracts:
    """GET /api/customer/contracts/ and GET /api/customer/contracts/{id}/"""

    def test_customer_can_list_contracts(self, customer, contract):
        resp = auth_client(customer).get("/api/customer/contracts/")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert any(c["id"] == contract.id for c in data)

    def test_contract_has_required_fields(self, customer, contract):
        resp = auth_client(customer).get("/api/customer/contracts/")
        assert resp.status_code == 200
        c = resp.json()[0]
        assert "id" in c
        assert "name" in c
        assert "status" in c
        assert "location" in c

    def test_customer_can_get_contract_detail(self, customer, contract):
        resp = auth_client(customer).get(f"/api/customer/contracts/{contract.id}/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == contract.id
        assert data["name"] == "Annual HVAC Contract"

    def test_contract_detail_not_found_for_foreign_location(self, customer, company, db):
        loc2 = Location.objects.create(company=company, name="Other", address="X", is_active=True)
        foreign_contract = ServiceContract.objects.create(
            company=company,
            location=loc2,
            name="Foreign Contract",
            contract_type="preventive",
            status="active",
            start_date=date(2024, 1, 1),
            end_date=date(2026, 12, 31),
        )
        resp = auth_client(customer).get(f"/api/customer/contracts/{foreign_contract.id}/")
        assert resp.status_code == 404

    def test_owner_blocked(self, owner):
        resp = auth_client(owner).get("/api/customer/contracts/")
        assert resp.status_code == 403

    def test_unauthenticated_rejected(self):
        resp = APIClient().get("/api/customer/contracts/")
        assert resp.status_code == 401


# =============================================================================
# CustomerProfileView
# =============================================================================

@pytest.mark.django_db
class TestCustomerProfile:
    """GET /api/customer/profile/"""

    def test_customer_can_get_profile(self, customer, location):
        resp = auth_client(customer).get("/api/customer/profile/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == customer.email
        assert data["full_name"] == customer.full_name
        assert "company" in data
        assert "locations" in data

    def test_profile_includes_assigned_locations(self, customer, location):
        resp = auth_client(customer).get("/api/customer/profile/")
        assert resp.status_code == 200
        loc_ids = [l["id"] for l in resp.json()["locations"]]
        assert location.id in loc_ids

    def test_owner_blocked(self, owner):
        resp = auth_client(owner).get("/api/customer/profile/")
        assert resp.status_code == 403

    def test_unauthenticated_rejected(self):
        resp = APIClient().get("/api/customer/profile/")
        assert resp.status_code == 401
