# backend/tests/test_s04_m009_parts_checklists.py
"""
M009/S04: MaintainProof — Parts History, Visit Parts & Checklists Tests

Covers:
1. PartStockHistoryView — list stock adjustments
2. VisitPartsListCreateView — list and add parts to a visit
3. VisitPartDeleteView — remove part from visit
4. MaintenanceChecklistTemplatesView — list and create checklist templates
5. MaintenanceChecklistTemplateDetailView — get, patch, delete
"""

import pytest
from datetime import date
from decimal import Decimal
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from apps.accounts.models import Company, User
from apps.maintenance.models import AssetType, Asset, Part
from apps.locations.models import Location, ChecklistTemplate, ChecklistTemplateItem
from apps.jobs.models import Job


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def company(db):
    return Company.objects.create(
        name="Checklist Test Co",
        plan=Company.PLAN_ACTIVE,
        plan_tier="standard",
    )


def _make_user(company, role, suffix=""):
    u = User.objects.create(
        company=company,
        role=role,
        email=f"{role}{suffix}@checktest.local",
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
        company=company, name="Check Building", address="X", is_active=True
    )


@pytest.fixture
def part(company, db):
    return Part.objects.create(
        company=company,
        name="Filter",
        sku="F-001",
        unit="pcs",
        stock_quantity=Decimal("10"),
        reorder_point=Decimal("2"),
    )


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


def auth_client(user):
    client = APIClient()
    client.default_format = "json"
    token, _ = Token.objects.get_or_create(user=user)
    client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return client


# =============================================================================
# Part Stock History
# =============================================================================

@pytest.mark.django_db
class TestPartStockHistory:
    """GET /api/maintenance/parts/<id>/stock-history/"""

    def test_owner_can_access(self, owner, part):
        resp = auth_client(owner).get(
            f"/api/maintenance/parts/{part.id}/stock-history/"
        )
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_staff_can_access(self, staff, part):
        resp = auth_client(staff).get(
            f"/api/maintenance/parts/{part.id}/stock-history/"
        )
        assert resp.status_code == 200

    def test_cleaner_cannot_access(self, cleaner, part):
        resp = auth_client(cleaner).get(
            f"/api/maintenance/parts/{part.id}/stock-history/"
        )
        assert resp.status_code == 403

    def test_history_shows_adjustments(self, owner, part):
        # Create an adjustment first
        auth_client(owner).post(
            f"/api/maintenance/parts/{part.id}/adjust-stock/",
            {"adjustment_type": "in", "quantity": 5, "reason": "test"},
        )
        resp = auth_client(owner).get(
            f"/api/maintenance/parts/{part.id}/stock-history/"
        )
        assert resp.status_code == 200
        assert len(resp.json()) >= 1
        entry = resp.json()[0]
        assert "adjustment_type" in entry
        assert "quantity" in entry

    def test_nonexistent_part_returns_404(self, owner):
        resp = auth_client(owner).get("/api/maintenance/parts/999999/stock-history/")
        assert resp.status_code == 404


# =============================================================================
# Visit Parts — List & Create
# =============================================================================

@pytest.mark.django_db
class TestVisitPartsList:
    """GET /api/maintenance/visits/<id>/parts/"""

    def test_owner_can_list(self, owner, visit):
        resp = auth_client(owner).get(f"/api/maintenance/visits/{visit.id}/parts/")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_staff_can_list(self, staff, visit):
        resp = auth_client(staff).get(f"/api/maintenance/visits/{visit.id}/parts/")
        assert resp.status_code == 200

    def test_cleaner_cannot_list(self, cleaner, visit):
        resp = auth_client(cleaner).get(f"/api/maintenance/visits/{visit.id}/parts/")
        assert resp.status_code == 403


@pytest.mark.django_db
class TestVisitPartsCreate:
    """POST /api/maintenance/visits/<id>/parts/"""

    def test_owner_can_add_part(self, owner, visit, part):
        resp = auth_client(owner).post(
            f"/api/maintenance/visits/{visit.id}/parts/",
            {"part_id": part.id, "quantity": 2},
        )
        assert resp.status_code == 201
        assert resp.json()["part"]["id"] == part.id

    def test_staff_cannot_add_part(self, staff, visit, part):
        resp = auth_client(staff).post(
            f"/api/maintenance/visits/{visit.id}/parts/",
            {"part_id": part.id, "quantity": 1},
        )
        assert resp.status_code == 403

    def test_missing_part_id_rejected(self, owner, visit):
        resp = auth_client(owner).post(
            f"/api/maintenance/visits/{visit.id}/parts/",
            {"quantity": 1},
        )
        assert resp.status_code == 400

    def test_invalid_quantity_rejected(self, owner, visit, part):
        resp = auth_client(owner).post(
            f"/api/maintenance/visits/{visit.id}/parts/",
            {"part_id": part.id, "quantity": -1},
        )
        assert resp.status_code == 400

    def test_nonexistent_part_returns_404(self, owner, visit):
        resp = auth_client(owner).post(
            f"/api/maintenance/visits/{visit.id}/parts/",
            {"part_id": 999999, "quantity": 1},
        )
        assert resp.status_code == 404

    def test_inactive_part_rejected(self, owner, visit, company, db):
        inactive_part = Part.objects.create(
            company=company,
            name="Inactive Part",
            unit="pcs",
            is_active=False,
        )
        resp = auth_client(owner).post(
            f"/api/maintenance/visits/{visit.id}/parts/",
            {"part_id": inactive_part.id, "quantity": 1},
        )
        assert resp.status_code == 400
        assert resp.json()["code"] == "PART_INACTIVE"


# =============================================================================
# Visit Part Delete
# =============================================================================

@pytest.mark.django_db
class TestVisitPartDelete:
    """DELETE /api/maintenance/visits/<visit_id>/parts/<part_id>/"""

    def test_owner_can_delete_visit_part(self, owner, visit, part):
        # First add a part
        add_resp = auth_client(owner).post(
            f"/api/maintenance/visits/{visit.id}/parts/",
            {"part_id": part.id, "quantity": 1},
        )
        assert add_resp.status_code == 201
        visit_part_id = add_resp.json()["id"]

        # Now delete it
        resp = auth_client(owner).delete(
            f"/api/maintenance/visits/{visit.id}/parts/{visit_part_id}/"
        )
        assert resp.status_code == 200
        assert resp.json()["deleted"] is True

    def test_staff_cannot_delete_visit_part(self, owner, staff, visit, part):
        add_resp = auth_client(owner).post(
            f"/api/maintenance/visits/{visit.id}/parts/",
            {"part_id": part.id, "quantity": 1},
        )
        visit_part_id = add_resp.json()["id"]

        resp = auth_client(staff).delete(
            f"/api/maintenance/visits/{visit.id}/parts/{visit_part_id}/"
        )
        assert resp.status_code == 403


# =============================================================================
# Maintenance Checklist Templates
# =============================================================================

@pytest.mark.django_db
class TestMaintenanceChecklistList:
    """GET /api/maintenance/checklists/"""

    def test_owner_can_list(self, owner):
        resp = auth_client(owner).get("/api/maintenance/checklists/")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_staff_can_list(self, staff):
        resp = auth_client(staff).get("/api/maintenance/checklists/")
        assert resp.status_code == 200

    def test_cleaner_cannot_list(self, cleaner):
        resp = auth_client(cleaner).get("/api/maintenance/checklists/")
        assert resp.status_code == 403

    def test_unauthenticated_rejected(self):
        resp = APIClient().get("/api/maintenance/checklists/")
        assert resp.status_code == 401


@pytest.mark.django_db
class TestMaintenanceChecklistCreate:
    """POST /api/maintenance/checklists/"""

    def test_owner_can_create(self, owner):
        resp = auth_client(owner).post("/api/maintenance/checklists/", {
            "name": "HVAC Checklist",
            "description": "Monthly HVAC inspection",
            "items": [
                {"text": "Check filters", "is_required": True},
                {"text": "Inspect belts", "is_required": False},
            ],
        })
        assert resp.status_code == 201
        assert resp.json()["name"] == "HVAC Checklist"
        assert len(resp.json()["items"]) == 2

    def test_staff_cannot_create(self, staff):
        resp = auth_client(staff).post("/api/maintenance/checklists/", {
            "name": "Staff Checklist",
        })
        assert resp.status_code == 403

    def test_missing_name_rejected(self, owner):
        resp = auth_client(owner).post("/api/maintenance/checklists/", {
            "description": "No name",
        })
        assert resp.status_code == 400

    def test_duplicate_name_rejected(self, owner):
        auth_client(owner).post("/api/maintenance/checklists/", {"name": "Dupe"})
        resp = auth_client(owner).post("/api/maintenance/checklists/", {"name": "Dupe"})
        assert resp.status_code == 400


@pytest.mark.django_db
class TestMaintenanceChecklistDetail:
    """GET/PATCH/DELETE /api/maintenance/checklists/<id>/"""

    def _create_checklist(self, owner):
        resp = auth_client(owner).post("/api/maintenance/checklists/", {
            "name": "Detail Checklist",
            "items": [{"text": "Step 1"}],
        })
        assert resp.status_code == 201
        return resp.json()["id"]

    def test_owner_can_get(self, owner):
        cid = self._create_checklist(owner)
        resp = auth_client(owner).get(f"/api/maintenance/checklists/{cid}/")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Detail Checklist"

    def test_staff_can_get(self, owner, staff):
        cid = self._create_checklist(owner)
        resp = auth_client(staff).get(f"/api/maintenance/checklists/{cid}/")
        assert resp.status_code == 200

    def test_cleaner_cannot_get(self, owner, cleaner):
        cid = self._create_checklist(owner)
        resp = auth_client(cleaner).get(f"/api/maintenance/checklists/{cid}/")
        assert resp.status_code == 403

    def test_owner_can_patch(self, owner):
        cid = self._create_checklist(owner)
        resp = auth_client(owner).put(
            f"/api/maintenance/checklists/{cid}/",
            {"name": "Updated Checklist"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Checklist"

    def test_owner_can_delete(self, owner):
        cid = self._create_checklist(owner)
        resp = auth_client(owner).delete(f"/api/maintenance/checklists/{cid}/")
        assert resp.status_code in (200, 204)
        assert not ChecklistTemplate.objects.filter(pk=cid).exists()

    def test_nonexistent_checklist_returns_404(self, owner):
        resp = auth_client(owner).get("/api/maintenance/checklists/999999/")
        assert resp.status_code == 404
