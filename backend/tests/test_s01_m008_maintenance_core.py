# backend/tests/test_s01_m008_maintenance_core.py
"""
M008/S01: MaintainProof Core — Models & Permissions Tests

Covers:
1. MaintenancePermissionMixin — RBAC gates (owner/manager write, staff read-only, cleaner blocked)
2. AssetType CRUD (list, create, update, delete, uniqueness, plan enforcement)
3. Asset CRUD (list, create, update, delete, cross-company isolation)
4. MaintenanceCategory CRUD
5. Plan gate — blocked companies cannot write
"""

import pytest
from rest_framework.test import APIClient
from apps.accounts.models import Company, User
from apps.maintenance.models import AssetType, Asset, MaintenanceCategory
from apps.locations.models import Location


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def company(db):
    return Company.objects.create(
        name="MaintainProof Test Co",
        plan=Company.PLAN_ACTIVE,
        plan_tier="standard",
    )


@pytest.fixture
def other_company(db):
    return Company.objects.create(
        name="Other Company",
        plan=Company.PLAN_ACTIVE,
        plan_tier="standard",
    )


def _make_user(company, role, email_suffix=""):
    u = User.objects.create(
        company=company,
        role=role,
        email=f"{role}{email_suffix}@maintaintest.local",
        full_name=f"Test {role.title()}",
        is_active=True,
    )
    u.set_password("testpass123")
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
def other_owner(other_company, db):
    return _make_user(other_company, User.ROLE_OWNER, "_other")


@pytest.fixture
def asset_type(company, db):
    return AssetType.objects.create(
        company=company,
        name="HVAC Unit",
        description="Air handling unit",
        is_active=True,
    )


@pytest.fixture
def asset(company, asset_type, db):
    loc = Location.objects.create(
        company=company,
        name="Test Building",
        address="123 Main St",
        is_active=True,
    )
    return Asset.objects.create(
        company=company,
        location=loc,
        asset_type=asset_type,
        name="AHU-01",
        serial_number="SN123",
    )


@pytest.fixture
def category(company, db):
    return MaintenanceCategory.objects.create(
        company=company,
        name="Preventive",
    )


def auth_client(user):
    from rest_framework.authtoken.models import Token
    client = APIClient()
    token, _ = Token.objects.get_or_create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


# =============================================================================
# AssetType Tests
# =============================================================================

@pytest.mark.django_db
class TestAssetTypePermissions:
    """RBAC enforcement on /api/manager/asset-types/"""

    def test_owner_can_list_asset_types(self, owner):
        resp = auth_client(owner).get("/api/manager/asset-types/")
        assert resp.status_code == 200

    def test_manager_can_list_asset_types(self, manager):
        resp = auth_client(manager).get("/api/manager/asset-types/")
        assert resp.status_code == 200

    def test_staff_can_list_asset_types(self, staff):
        resp = auth_client(staff).get("/api/manager/asset-types/")
        assert resp.status_code == 200

    def test_cleaner_cannot_list_asset_types(self, cleaner):
        resp = auth_client(cleaner).get("/api/manager/asset-types/")
        assert resp.status_code == 403

    def test_unauthenticated_cannot_list_asset_types(self):
        resp = APIClient().get("/api/manager/asset-types/")
        assert resp.status_code == 401

    def test_owner_can_create_asset_type(self, owner):
        resp = auth_client(owner).post(
            "/api/manager/asset-types/",
            {"name": "Elevator"},
        )
        assert resp.status_code == 201

    def test_manager_can_create_asset_type(self, manager):
        resp = auth_client(manager).post(
            "/api/manager/asset-types/",
            {"name": "Generator"},
        )
        assert resp.status_code == 201

    def test_staff_cannot_create_asset_type(self, staff):
        resp = auth_client(staff).post(
            "/api/manager/asset-types/",
            {"name": "Fire Pump"},
        )
        assert resp.status_code == 403

    def test_cleaner_cannot_create_asset_type(self, cleaner):
        resp = auth_client(cleaner).post(
            "/api/manager/asset-types/",
            {"name": "Chiller"},
        )
        assert resp.status_code == 403


@pytest.mark.django_db
class TestAssetTypeCRUD:
    """AssetType create/read/update/delete logic."""

    def test_create_asset_type_success(self, owner):
        resp = auth_client(owner).post(
            "/api/manager/asset-types/",
            {"name": "Boiler", "description": "Hot water boiler"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Boiler"
        assert data["description"] == "Hot water boiler"
        assert data["is_active"] is True

    def test_create_asset_type_missing_name(self, owner):
        resp = auth_client(owner).post(
            "/api/manager/asset-types/",
            {"description": "No name"},
        )
        assert resp.status_code == 400
        assert resp.json()["code"] == "VALIDATION_ERROR"

    def test_create_asset_type_duplicate_name(self, owner, asset_type):
        resp = auth_client(owner).post(
            "/api/manager/asset-types/",
            {"name": asset_type.name},
        )
        assert resp.status_code == 400
        assert resp.json()["code"] == "VALIDATION_ERROR"

    def test_create_asset_type_duplicate_case_insensitive(self, owner, asset_type):
        resp = auth_client(owner).post(
            "/api/manager/asset-types/",
            {"name": asset_type.name.upper()},
        )
        assert resp.status_code == 400

    def test_list_returns_own_company_only(self, owner, other_owner):
        # Create asset type for other company
        AssetType.objects.create(
            company=other_owner.company, name="Other Co HVAC"
        )
        resp = auth_client(owner).get("/api/manager/asset-types/")
        names = [item["name"] for item in resp.json()]
        assert "Other Co HVAC" not in names

    def test_get_asset_type_detail(self, owner, asset_type):
        resp = auth_client(owner).get(f"/api/manager/asset-types/{asset_type.id}/")
        assert resp.status_code == 200
        assert resp.json()["id"] == asset_type.id
        assert resp.json()["name"] == asset_type.name

    def test_get_other_company_asset_type_returns_404(self, owner, other_owner):
        other_at = AssetType.objects.create(
            company=other_owner.company, name="Other HVAC"
        )
        resp = auth_client(owner).get(f"/api/manager/asset-types/{other_at.id}/")
        assert resp.status_code == 404

    def test_patch_asset_type(self, owner, asset_type):
        resp = auth_client(owner).patch(
            f"/api/manager/asset-types/{asset_type.id}/",
            {"description": "Updated description"},
        )
        assert resp.status_code == 200
        assert resp.json()["description"] == "Updated description"

    def test_delete_asset_type(self, owner, asset_type):
        resp = auth_client(owner).delete(f"/api/manager/asset-types/{asset_type.id}/")
        assert resp.status_code == 204
        assert not AssetType.objects.filter(pk=asset_type.id).exists()

    def test_staff_cannot_delete_asset_type(self, staff, asset_type):
        resp = auth_client(staff).delete(f"/api/manager/asset-types/{asset_type.id}/")
        assert resp.status_code == 403
        assert AssetType.objects.filter(pk=asset_type.id).exists()


@pytest.mark.django_db
class TestAssetTypePlanGate:
    """Blocked companies cannot write."""

    def test_blocked_company_cannot_create_asset_type(self, owner, company):
        company.plan = Company.PLAN_BLOCKED
        company.save()
        resp = auth_client(owner).post(
            "/api/manager/asset-types/",
            {"name": "Blocked Create"},
        )
        assert resp.status_code == 403

    def test_trial_expired_cannot_create(self, owner, company):
        from django.utils import timezone
        from datetime import timedelta
        company.plan = Company.PLAN_TRIAL
        company.trial_expires_at = timezone.now() - timedelta(days=1)
        company.save()
        resp = auth_client(owner).post(
            "/api/manager/asset-types/",
            {"name": "Expired Create"},
        )
        assert resp.status_code == 403
        assert "trial" in resp.json().get("code", "").lower() or \
               "trial" in resp.json().get("detail", "").lower()

    def test_blocked_company_can_still_read(self, owner, company, asset_type):
        company.plan = Company.PLAN_BLOCKED
        company.save()
        resp = auth_client(owner).get("/api/manager/asset-types/")
        assert resp.status_code == 200


# =============================================================================
# Asset Tests
# =============================================================================

@pytest.mark.django_db
class TestAssetPermissions:
    """RBAC on /api/manager/assets/"""

    def test_owner_can_list_assets(self, owner):
        resp = auth_client(owner).get("/api/manager/assets/")
        assert resp.status_code == 200

    def test_staff_can_list_assets(self, staff):
        resp = auth_client(staff).get("/api/manager/assets/")
        assert resp.status_code == 200

    def test_cleaner_cannot_list_assets(self, cleaner):
        resp = auth_client(cleaner).get("/api/manager/assets/")
        assert resp.status_code == 403

    def test_staff_cannot_create_asset(self, staff, asset_type):
        loc = Location.objects.create(
            company=staff.company, name="Staff Loc", address="X", is_active=True
        )
        resp = auth_client(staff).post("/api/manager/assets/", {
            "name": "New Asset",
            "asset_type_id": asset_type.id,
            "location_id": loc.id,
        })
        assert resp.status_code == 403


@pytest.mark.django_db
class TestAssetCRUD:
    """Asset create/read/update/delete."""

    def test_create_asset_success(self, owner, company, asset_type):
        loc = Location.objects.create(
            company=company, name="New Building", address="456 St", is_active=True
        )
        resp = auth_client(owner).post("/api/manager/assets/", {
            "name": "Chiller-01",
            "asset_type_id": asset_type.id,
            "location_id": loc.id,
            "serial_number": "CH001",
        })
        assert resp.status_code == 201
        assert resp.json()["name"] == "Chiller-01"

    def test_create_asset_missing_name(self, owner, company, asset_type):
        loc = Location.objects.create(
            company=company, name="Loc", address="X", is_active=True
        )
        resp = auth_client(owner).post("/api/manager/assets/", {
            "asset_type_id": asset_type.id,
            "location_id": loc.id,
        })
        assert resp.status_code == 400

    def test_list_assets_returns_own_company_only(self, owner, other_owner, asset_type):
        other_loc = Location.objects.create(
            company=other_owner.company, name="Other Loc", address="X", is_active=True
        )
        other_at = AssetType.objects.create(company=other_owner.company, name="Other AT")
        Asset.objects.create(
            company=other_owner.company,
            location=other_loc,
            asset_type=other_at,
            name="Other Asset",
        )
        resp = auth_client(owner).get("/api/manager/assets/")
        assert resp.status_code == 200
        names = [a["name"] for a in resp.json()]
        assert "Other Asset" not in names

    def test_get_asset_detail(self, owner, asset):
        resp = auth_client(owner).get(f"/api/manager/assets/{asset.id}/")
        assert resp.status_code == 200
        assert resp.json()["id"] == asset.id

    def test_get_other_company_asset_returns_404(self, owner, other_owner):
        other_loc = Location.objects.create(
            company=other_owner.company, name="OL", address="X", is_active=True
        )
        other_at = AssetType.objects.create(company=other_owner.company, name="OAT")
        other_asset = Asset.objects.create(
            company=other_owner.company,
            location=other_loc,
            asset_type=other_at,
            name="Cross-Company Asset",
        )
        resp = auth_client(owner).get(f"/api/manager/assets/{other_asset.id}/")
        assert resp.status_code == 404

    def test_patch_asset(self, owner, asset):
        resp = auth_client(owner).patch(
            f"/api/manager/assets/{asset.id}/",
            {"name": "AHU-01-Updated"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "AHU-01-Updated"

    def test_delete_asset(self, owner, asset):
        resp = auth_client(owner).delete(f"/api/manager/assets/{asset.id}/")
        assert resp.status_code in (200, 204)
        assert not Asset.objects.filter(pk=asset.id).exists()


# =============================================================================
# MaintenanceCategory Tests
# =============================================================================

@pytest.mark.django_db
class TestMaintenanceCategoryPermissions:
    """RBAC on /api/manager/maintenance-categories/"""

    def test_owner_can_list(self, owner):
        resp = auth_client(owner).get("/api/manager/maintenance-categories/")
        assert resp.status_code == 200

    def test_staff_can_list(self, staff):
        resp = auth_client(staff).get("/api/manager/maintenance-categories/")
        assert resp.status_code == 200

    def test_cleaner_cannot_list(self, cleaner):
        resp = auth_client(cleaner).get("/api/manager/maintenance-categories/")
        assert resp.status_code == 403

    def test_staff_cannot_create(self, staff):
        resp = auth_client(staff).post(
            "/api/manager/maintenance-categories/",
            {"name": "Electrical"},
        )
        assert resp.status_code == 403


@pytest.mark.django_db
class TestMaintenanceCategoryCRUD:
    """MaintenanceCategory create/read/update/delete."""

    def test_create_category(self, owner):
        resp = auth_client(owner).post(
            "/api/manager/maintenance-categories/",
            {"name": "Electrical"},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Electrical"

    def test_create_category_missing_name(self, owner):
        resp = auth_client(owner).post(
            "/api/manager/maintenance-categories/",
            {},
        )
        assert resp.status_code == 400

    def test_list_categories_scoped_to_company(self, owner, other_owner):
        MaintenanceCategory.objects.create(
            company=other_owner.company, name="Other Category"
        )
        resp = auth_client(owner).get("/api/manager/maintenance-categories/")
        names = [c["name"] for c in resp.json()]
        assert "Other Category" not in names

    def test_patch_category(self, owner, category):
        resp = auth_client(owner).patch(
            f"/api/manager/maintenance-categories/{category.id}/",
            {"description": "Updated description"},
        )
        assert resp.status_code == 200

    def test_delete_category(self, owner, category):
        resp = auth_client(owner).delete(
            f"/api/manager/maintenance-categories/{category.id}/"
        )
        assert resp.status_code in (200, 204)
        assert not MaintenanceCategory.objects.filter(pk=category.id).exists()

    def test_get_other_company_category_returns_404(self, owner, other_owner):
        other_cat = MaintenanceCategory.objects.create(
            company=other_owner.company, name="Other Cat"
        )
        resp = auth_client(owner).get(
            f"/api/manager/maintenance-categories/{other_cat.id}/"
        )
        assert resp.status_code == 404
