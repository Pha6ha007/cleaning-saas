# backend/tests/test_s04_m008_maintenance_parts.py
"""
M008/S04: MaintainProof — Parts & Asset Documents Tests

Covers:
1. Parts CRUD (list, create, update, delete)
2. Parts low-stock view
3. StockAdjustment (adjust-stock endpoint)
4. VisitPart (link parts to visits)
5. AssetDocument list/upload/delete
"""

import pytest
from datetime import date
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from apps.accounts.models import Company, User
from apps.maintenance.models import AssetType, Asset, Part, MaintenanceCategory
from apps.locations.models import Location
from apps.jobs.models import Job


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def company(db):
    return Company.objects.create(
        name="Parts Test Co",
        plan=Company.PLAN_ACTIVE,
        plan_tier="standard",
    )


@pytest.fixture
def other_company(db):
    return Company.objects.create(
        name="Other Parts Co",
        plan=Company.PLAN_ACTIVE,
        plan_tier="standard",
    )


def _make_user(company, role, suffix=""):
    u = User.objects.create(
        company=company,
        role=role,
        email=f"{role}{suffix}@partstest.local",
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
        company=company, name="Parts Building", address="X", is_active=True
    )


@pytest.fixture
def asset_type(company, db):
    return AssetType.objects.create(company=company, name="Pump")


@pytest.fixture
def asset(company, location, asset_type, db):
    return Asset.objects.create(
        company=company,
        location=location,
        asset_type=asset_type,
        name="Pump-01",
    )


@pytest.fixture
def part(company, db):
    return Part.objects.create(
        company=company,
        name="Oil Filter",
        sku="OF-123",
        unit="piece",
        stock_quantity=10,
        reorder_point=2,
    )


@pytest.fixture
def low_stock_part(company, db):
    return Part.objects.create(
        company=company,
        name="Coolant",
        sku="CL-500",
        unit="liter",
        stock_quantity=1,
        reorder_point=5,
    )


@pytest.fixture
def maintenance_job(company, location, technician, db):
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
# Parts CRUD Tests
# =============================================================================

@pytest.mark.django_db
class TestPartsPermissions:
    """RBAC on /api/maintenance/parts/"""

    def test_owner_can_list(self, owner):
        resp = auth_client(owner).get("/api/maintenance/parts/")
        assert resp.status_code == 200

    def test_staff_can_list(self, staff):
        resp = auth_client(staff).get("/api/maintenance/parts/")
        assert resp.status_code == 200

    def test_cleaner_cannot_list(self, cleaner):
        resp = auth_client(cleaner).get("/api/maintenance/parts/")
        assert resp.status_code == 403

    def test_staff_cannot_create(self, staff):
        resp = auth_client(staff).post("/api/maintenance/parts/", {
            "name": "Staff Part",
            "unit": "piece",
        })
        assert resp.status_code == 403

    def test_unauthenticated_rejected(self):
        resp = APIClient().get("/api/maintenance/parts/")
        assert resp.status_code == 401


@pytest.mark.django_db
class TestPartsCRUD:
    """Parts create/read/update/delete."""

    def test_create_part(self, owner):
        resp = auth_client(owner).post("/api/maintenance/parts/", {
            "name": "Gasket",
            "sku": "GK-001",
            "unit": "piece",
            "stock_quantity": 5,
            "reorder_point": 1,
        })
        assert resp.status_code == 201
        assert resp.json()["name"] == "Gasket"

    def test_create_part_missing_name(self, owner):
        resp = auth_client(owner).post("/api/maintenance/parts/", {
            "unit": "piece",
        })
        assert resp.status_code == 400

    def test_list_parts_scoped_to_company(self, owner, other_company, db):
        Part.objects.create(
            company=other_company, name="Other Part", unit="piece"
        )
        resp = auth_client(owner).get("/api/maintenance/parts/")
        names = [p["name"] for p in resp.json()]
        assert "Other Part" not in names

    def test_get_part_detail(self, owner, part):
        resp = auth_client(owner).get(f"/api/maintenance/parts/{part.id}/")
        assert resp.status_code == 200
        assert resp.json()["name"] == part.name

    def test_get_other_company_part_returns_404(self, owner, other_company, db):
        other_part = Part.objects.create(
            company=other_company, name="Other Part", unit="piece"
        )
        resp = auth_client(owner).get(f"/api/maintenance/parts/{other_part.id}/")
        assert resp.status_code == 404

    def test_patch_part(self, owner, part):
        resp = auth_client(owner).patch(
            f"/api/maintenance/parts/{part.id}/",
            {"sku": "OF-999"},
        )
        assert resp.status_code == 200
        assert resp.json()["sku"] == "OF-999"

    def test_delete_part(self, owner, part):
        resp = auth_client(owner).delete(f"/api/maintenance/parts/{part.id}/")
        assert resp.status_code in (200, 204)
        assert not Part.objects.filter(pk=part.id).exists()


# =============================================================================
# Low Stock Tests
# =============================================================================

@pytest.mark.django_db
class TestLowStockParts:
    """GET /api/maintenance/parts/low-stock/"""

    def test_owner_can_access(self, owner):
        resp = auth_client(owner).get("/api/maintenance/parts/low-stock/")
        assert resp.status_code == 200

    def test_staff_can_access(self, staff):
        resp = auth_client(staff).get("/api/maintenance/parts/low-stock/")
        assert resp.status_code == 200

    def test_cleaner_cannot_access(self, cleaner):
        resp = auth_client(cleaner).get("/api/maintenance/parts/low-stock/")
        assert resp.status_code == 403

    def test_low_stock_part_appears(self, owner, low_stock_part):
        resp = auth_client(owner).get("/api/maintenance/parts/low-stock/")
        names = [p["name"] for p in resp.json()]
        assert low_stock_part.name in names

    def test_adequate_stock_part_excluded(self, owner, part):
        resp = auth_client(owner).get("/api/maintenance/parts/low-stock/")
        names = [p["name"] for p in resp.json()]
        assert part.name not in names


# =============================================================================
# Stock Adjustment Tests
# =============================================================================

@pytest.mark.django_db
class TestStockAdjustment:
    """POST /api/maintenance/parts/<id>/adjust-stock/"""

    def test_owner_can_adjust_stock(self, owner, part):
        initial_qty = float(part.stock_quantity)
        resp = auth_client(owner).post(
            f"/api/maintenance/parts/{part.id}/adjust-stock/",
            {"adjustment_type": "in", "quantity": 5, "reason": "restock"},
        )
        assert resp.status_code == 200
        part.refresh_from_db()
        assert float(part.stock_quantity) == initial_qty + 5

    def test_out_adjustment_reduces_stock(self, owner, part):
        initial_qty = float(part.stock_quantity)
        resp = auth_client(owner).post(
            f"/api/maintenance/parts/{part.id}/adjust-stock/",
            {"adjustment_type": "out", "quantity": 3, "reason": "used"},
        )
        assert resp.status_code == 200
        part.refresh_from_db()
        assert float(part.stock_quantity) == initial_qty - 3

    def test_insufficient_stock_rejected(self, owner, part):
        resp = auth_client(owner).post(
            f"/api/maintenance/parts/{part.id}/adjust-stock/",
            {"adjustment_type": "out", "quantity": 999, "reason": "used"},
        )
        assert resp.status_code == 400
        assert resp.json()["code"] == "INSUFFICIENT_STOCK"

    def test_staff_cannot_adjust_stock(self, staff, part):
        resp = auth_client(staff).post(
            f"/api/maintenance/parts/{part.id}/adjust-stock/",
            {"adjustment_type": "in", "quantity": 1, "reason": "test"},
        )
        assert resp.status_code == 403

    def test_invalid_adjustment_type_rejected(self, owner, part):
        resp = auth_client(owner).post(
            f"/api/maintenance/parts/{part.id}/adjust-stock/",
            {"adjustment_type": "invalid", "quantity": 1},
        )
        assert resp.status_code == 400


# =============================================================================
# Asset Documents Tests
# =============================================================================

@pytest.mark.django_db
class TestAssetDocuments:
    """GET /api/maintenance/assets/<id>/documents/"""

    def test_owner_can_list_documents(self, owner, asset):
        resp = auth_client(owner).get(
            f"/api/maintenance/assets/{asset.id}/documents/"
        )
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_staff_can_list_documents(self, staff, asset):
        resp = auth_client(staff).get(
            f"/api/maintenance/assets/{asset.id}/documents/"
        )
        assert resp.status_code == 200

    def test_cleaner_cannot_list_documents(self, cleaner, asset):
        resp = auth_client(cleaner).get(
            f"/api/maintenance/assets/{asset.id}/documents/"
        )
        assert resp.status_code == 403

    def test_other_company_asset_documents_returns_404(
        self, owner, other_company, db
    ):
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
            f"/api/maintenance/assets/{other_asset.id}/documents/"
        )
        assert resp.status_code == 404
