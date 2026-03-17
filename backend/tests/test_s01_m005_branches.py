# backend/tests/test_s01_m005_branches.py
"""
M005/S01: Multi-Branch Hierarchy — Contract Tests

Proves:
1. Branch model exists with correct fields
2. Branch name is unique per company
3. GET /api/branches/ requires authentication
4. GET /api/branches/ returns empty list for company with no branches
5. POST /api/branches/ creates a branch (owner)
6. POST /api/branches/ returns 403 for non-enterprise company on second branch
7. POST /api/branches/ allows unlimited branches for enterprise companies
8. POST /api/branches/ returns 400 for duplicate name
9. POST /api/branches/ returns 400 for missing name
10. GET /api/branches/<id>/ returns branch detail
11. GET /api/branches/<id>/ returns 404 for other company's branch
12. PATCH /api/branches/<id>/ updates name, description, is_active
13. PATCH /api/branches/<id>/ returns 400 on name conflict
14. DELETE /api/branches/<id>/ removes branch with no active locations
15. DELETE /api/branches/<id>/ returns 400 when active locations exist
16. DELETE /api/branches/<id>/ returns 403 for non-owner
17. POST /api/branches/ assigns manager_id
18. PATCH /api/branches/<id>/ clears manager (manager_id: null)
19. GET /api/branches/<id>/analytics/ returns KPI rollup
20. GET /api/branches/<id>/analytics/ returns zeros for empty branch
21. Location.branch FK works correctly
22. User.branch FK works correctly
"""

import pytest
from rest_framework.test import APIClient
from datetime import date


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def company(db):
    from apps.accounts.models import Company
    return Company.objects.create(name="Branch Test Co", plan="active", plan_tier="standard")


@pytest.fixture
def enterprise_company(db):
    from apps.accounts.models import Company
    return Company.objects.create(name="Enterprise Co", plan="active", plan_tier="enterprise")


@pytest.fixture
def owner(company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company, role=User.ROLE_OWNER,
        email="owner@branchtest.com", full_name="Owner", is_active=True,
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def manager(company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company, role=User.ROLE_MANAGER,
        email="mgr@branchtest.com", full_name="Manager", is_active=True,
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def enterprise_owner(enterprise_company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=enterprise_company, role=User.ROLE_OWNER,
        email="ent_owner@branchtest.com", full_name="Ent Owner", is_active=True,
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def other_company(db):
    from apps.accounts.models import Company
    return Company.objects.create(name="Other Co", plan="active")


@pytest.fixture
def other_owner(other_company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=other_company, role=User.ROLE_OWNER,
        email="other@branchtest.com", full_name="Other Owner", is_active=True,
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def cleaner(company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company, role=User.ROLE_CLEANER,
        email="cleaner@branchtest.com", full_name="Cleaner", is_active=True,
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def auth_owner(owner):
    c = APIClient()
    c.force_authenticate(user=owner)
    return c


@pytest.fixture
def auth_manager(manager):
    c = APIClient()
    c.force_authenticate(user=manager)
    return c


@pytest.fixture
def auth_ent_owner(enterprise_owner):
    c = APIClient()
    c.force_authenticate(user=enterprise_owner)
    return c


@pytest.fixture
def branch(company, db):
    from apps.accounts.models import Branch
    return Branch.objects.create(company=company, name="Downtown")


@pytest.fixture
def location(company, db):
    from apps.locations.models import Location
    return Location.objects.create(company=company, name="HQ")


# =============================================================================
# Model Tests
# =============================================================================

@pytest.mark.django_db
class TestBranchModel:
    def test_branch_importable(self):
        from apps.accounts.models import Branch
        assert Branch is not None

    def test_branch_str(self, branch):
        assert "Downtown" in str(branch)
        assert "Branch Test Co" in str(branch)

    def test_unique_name_per_company(self, company, db):
        from apps.accounts.models import Branch
        from django.db import IntegrityError
        Branch.objects.create(company=company, name="North")
        with pytest.raises(IntegrityError):
            Branch.objects.create(company=company, name="North")

    def test_same_name_different_company_ok(self, company, other_company, db):
        from apps.accounts.models import Branch
        Branch.objects.create(company=company, name="East")
        b2 = Branch.objects.create(company=other_company, name="East")
        assert b2.pk is not None

    def test_location_branch_fk(self, location, branch, db):
        location.branch = branch
        location.save(update_fields=["branch"])
        location.refresh_from_db()
        assert location.branch_id == branch.id

    def test_user_branch_fk(self, manager, branch, db):
        manager.branch = branch
        manager.save(update_fields=["branch"])
        manager.refresh_from_db()
        assert manager.branch_id == branch.id


# =============================================================================
# Auth Tests
# =============================================================================

@pytest.mark.django_db
class TestBranchAuth:
    def test_unauthenticated_list_returns_401(self):
        resp = APIClient().get("/api/branches/")
        assert resp.status_code == 401

    def test_unauthenticated_create_returns_401(self):
        resp = APIClient().post("/api/branches/", {"name": "X"}, format="json")
        assert resp.status_code == 401

    def test_cleaner_list_returns_403(self, cleaner):
        c = APIClient()
        c.force_authenticate(user=cleaner)
        resp = c.get("/api/branches/")
        assert resp.status_code == 403


# =============================================================================
# CRUD Tests
# =============================================================================

@pytest.mark.django_db
class TestBranchCRUD:
    def test_list_empty(self, auth_owner):
        resp = auth_owner.get("/api/branches/")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_branch(self, auth_owner):
        resp = auth_owner.post("/api/branches/", {"name": "North"}, format="json")
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "North"
        assert data["id"] > 0

    def test_create_returns_location_count(self, auth_owner):
        resp = auth_owner.post("/api/branches/", {"name": "South"}, format="json")
        assert "location_count" in resp.json()
        assert resp.json()["location_count"] == 0

    def test_create_missing_name_returns_400(self, auth_owner):
        resp = auth_owner.post("/api/branches/", {}, format="json")
        assert resp.status_code == 400
        assert resp.json()["code"] == "NAME_REQUIRED"

    def test_create_duplicate_name_returns_400(self, auth_owner, branch):
        resp = auth_owner.post("/api/branches/", {"name": "Downtown"}, format="json")
        assert resp.status_code == 400
        assert resp.json()["code"] == "NAME_CONFLICT"

    def test_get_branch_detail(self, auth_owner, branch):
        resp = auth_owner.get(f"/api/branches/{branch.id}/")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Downtown"

    def test_get_other_company_branch_returns_404(self, auth_owner, other_company, db):
        from apps.accounts.models import Branch
        other_branch = Branch.objects.create(company=other_company, name="Remote")
        resp = auth_owner.get(f"/api/branches/{other_branch.id}/")
        assert resp.status_code == 404

    def test_patch_name(self, auth_owner, branch):
        resp = auth_owner.patch(f"/api/branches/{branch.id}/", {"name": "Updated"}, format="json")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated"

    def test_patch_is_active(self, auth_owner, branch):
        resp = auth_owner.patch(f"/api/branches/{branch.id}/", {"is_active": False}, format="json")
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False

    def test_patch_name_conflict_returns_400(self, auth_owner, company, branch, db):
        from apps.accounts.models import Branch
        Branch.objects.create(company=company, name="Uptown")
        resp = auth_owner.patch(f"/api/branches/{branch.id}/", {"name": "Uptown"}, format="json")
        assert resp.status_code == 400
        assert resp.json()["code"] == "NAME_CONFLICT"

    def test_delete_empty_branch(self, auth_owner, branch):
        resp = auth_owner.delete(f"/api/branches/{branch.id}/")
        assert resp.status_code == 204

    def test_delete_branch_with_active_locations_returns_400(self, auth_owner, branch, location, db):
        location.branch = branch
        location.save(update_fields=["branch"])
        resp = auth_owner.delete(f"/api/branches/{branch.id}/")
        assert resp.status_code == 400
        assert resp.json()["code"] == "BRANCH_HAS_LOCATIONS"

    def test_delete_requires_owner(self, auth_manager, branch):
        resp = auth_manager.delete(f"/api/branches/{branch.id}/")
        assert resp.status_code == 403

    def test_assign_manager_on_create(self, auth_owner, manager):
        resp = auth_owner.post("/api/branches/", {
            "name": "Managed",
            "manager_id": manager.id,
        }, format="json")
        assert resp.status_code == 201
        assert resp.json()["manager"]["id"] == manager.id

    def test_clear_manager_via_patch(self, auth_owner, branch, manager, db):
        branch.manager = manager
        branch.save(update_fields=["manager"])
        resp = auth_owner.patch(f"/api/branches/{branch.id}/", {"manager_id": None}, format="json")
        assert resp.status_code == 200
        assert resp.json()["manager"] is None


# =============================================================================
# Enterprise Gate Tests
# =============================================================================

@pytest.mark.django_db
class TestBranchEnterpriseGate:
    def test_standard_company_can_create_first_branch(self, auth_owner):
        resp = auth_owner.post("/api/branches/", {"name": "First"}, format="json")
        assert resp.status_code == 201

    def test_standard_company_cannot_create_second_branch(self, auth_owner, branch):
        resp = auth_owner.post("/api/branches/", {"name": "Second"}, format="json")
        assert resp.status_code == 403
        data = resp.json()
        assert data["code"] == "BRANCH_LIMIT_REACHED"
        assert data["upgrade_required"] is True

    def test_enterprise_company_can_create_multiple_branches(self, auth_ent_owner):
        for i in range(5):
            resp = auth_ent_owner.post("/api/branches/", {"name": f"Branch {i}"}, format="json")
            assert resp.status_code == 201


# =============================================================================
# Analytics Tests
# =============================================================================

@pytest.mark.django_db
class TestBranchAnalytics:
    def test_analytics_returns_200(self, auth_owner, branch):
        resp = auth_owner.get(f"/api/branches/{branch.id}/analytics/")
        assert resp.status_code == 200

    def test_analytics_empty_branch_returns_zeros(self, auth_owner, branch):
        resp = auth_owner.get(f"/api/branches/{branch.id}/analytics/")
        data = resp.json()
        assert data["total_jobs"] == 0
        assert data["completed_jobs"] == 0
        assert data["completion_rate"] == 0.0
        assert data["sla_breaches"] == 0
        assert data["location_count"] == 0

    def test_analytics_has_required_fields(self, auth_owner, branch):
        resp = auth_owner.get(f"/api/branches/{branch.id}/analytics/")
        data = resp.json()
        for field in ["branch_id", "branch_name", "period_days", "location_count",
                      "total_jobs", "completed_jobs", "completion_rate",
                      "sla_breaches", "sla_breach_rate", "locations"]:
            assert field in data, f"Missing field: {field}"

    def test_analytics_default_period_is_30_days(self, auth_owner, branch):
        resp = auth_owner.get(f"/api/branches/{branch.id}/analytics/")
        assert resp.json()["period_days"] == 30

    def test_analytics_custom_period(self, auth_owner, branch):
        resp = auth_owner.get(f"/api/branches/{branch.id}/analytics/?days=7")
        assert resp.json()["period_days"] == 7

    def test_analytics_other_company_returns_404(self, auth_owner, other_company, db):
        from apps.accounts.models import Branch
        other_branch = Branch.objects.create(company=other_company, name="Foreign")
        resp = auth_owner.get(f"/api/branches/{other_branch.id}/analytics/")
        assert resp.status_code == 404

    def test_analytics_counts_branch_jobs(self, auth_owner, branch, company, cleaner, db):
        from apps.locations.models import Location
        from apps.jobs.models import Job
        from django.utils import timezone
        loc = Location.objects.create(company=company, name="BranchLoc", branch=branch)
        Job.objects.create(
            company=company, location=loc, cleaner=cleaner,
            status=Job.STATUS_COMPLETED, context=Job.CONTEXT_CLEANING,
            scheduled_date=date.today(), actual_end_time=timezone.now(),
        )
        resp = auth_owner.get(f"/api/branches/{branch.id}/analytics/")
        assert resp.json()["completed_jobs"] == 1
        assert resp.json()["total_jobs"] == 1
