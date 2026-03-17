# backend/tests/test_s03_m005_sla_policies.py
"""
M005/S03: Advanced SLA Configuration — Contract Tests

Proves:
1. SLAPolicy model exists with correct fields
2. SLAPolicy __str__ includes name and company
3. Default GPS radius is 100m
4. Only one policy per company can be is_default=True
5. GET /api/sla-policies/ requires auth
6. GET /api/sla-policies/ returns empty list
7. POST /api/sla-policies/ creates policy
8. POST /api/sla-policies/ returns 400 for missing name
9. POST /api/sla-policies/ returns 400 for gps_radius_m < 10
10. POST /api/sla-policies/ returns 400 for gps_radius_m > 10000
11. POST /api/sla-policies/ returns 400 for invalid check_in_window_minutes
12. GET /api/sla-policies/<id>/ returns detail
13. GET /api/sla-policies/<id>/ returns 404 for other company
14. PATCH /api/sla-policies/<id>/ updates gps_radius_m
15. PATCH /api/sla-policies/<id>/ updates required_proof fields
16. PATCH sets is_default, clears other defaults
17. DELETE /api/sla-policies/<id>/ removes policy
18. DELETE returns 400 when locations reference the policy
19. DELETE returns 403 for non-owner
20. get_effective_sla_policy returns job override when set
21. get_effective_sla_policy falls through to location policy
22. get_effective_sla_policy falls through to company default
23. get_effective_sla_policy returns synthetic fallback when no default
24. Location.effective_gps_radius_m returns policy radius
25. Location.effective_gps_radius_m returns 100 when no policy
26. GET /api/jobs/<id>/effective-sla-policy/ returns correct source
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
    return Company.objects.create(name="SLA Test Co", plan="active")


@pytest.fixture
def other_company(db):
    from apps.accounts.models import Company
    return Company.objects.create(name="Other SLA Co", plan="active")


@pytest.fixture
def owner(company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company, role=User.ROLE_OWNER,
        email="owner@slatest.com", full_name="Owner", is_active=True,
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def manager(company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company, role=User.ROLE_MANAGER,
        email="mgr@slatest.com", full_name="Manager", is_active=True,
    )
    u.set_password("pass")
    u.save()
    return u


@pytest.fixture
def cleaner(company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company, role=User.ROLE_CLEANER,
        email="cleaner@slatest.com", full_name="Cleaner", is_active=True,
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
def location(company, db):
    from apps.locations.models import Location
    return Location.objects.create(company=company, name="SLA Location")


@pytest.fixture
def policy(company, db):
    from apps.jobs.models import SLAPolicy
    return SLAPolicy.objects.create(
        company=company,
        name="Standard SLA",
        gps_radius_m=150,
        is_default=True,
    )


@pytest.fixture
def job(company, location, cleaner, db):
    from apps.jobs.models import Job
    return Job.objects.create(
        company=company, location=location, cleaner=cleaner,
        status=Job.STATUS_SCHEDULED, context=Job.CONTEXT_CLEANING,
        scheduled_date=date.today(),
    )


# =============================================================================
# Model Tests
# =============================================================================

@pytest.mark.django_db
class TestSLAPolicyModel:
    def test_importable(self):
        from apps.jobs.models import SLAPolicy
        assert SLAPolicy is not None

    def test_str_includes_name_and_company(self, policy):
        s = str(policy)
        assert "Standard SLA" in s
        assert "SLA Test Co" in s

    def test_default_gps_radius_is_100(self, company, db):
        from apps.jobs.models import SLAPolicy
        p = SLAPolicy.objects.create(company=company, name="Default Test")
        assert p.gps_radius_m == 100

    def test_only_one_default_per_company(self, company, db):
        from apps.jobs.models import SLAPolicy
        p1 = SLAPolicy.objects.create(company=company, name="P1", is_default=True)
        p2 = SLAPolicy.objects.create(company=company, name="P2", is_default=True)
        p1.refresh_from_db()
        assert p1.is_default is False
        assert p2.is_default is True

    def test_setting_default_does_not_affect_other_companies(self, company, other_company, db):
        from apps.jobs.models import SLAPolicy
        p1 = SLAPolicy.objects.create(company=company, name="P1", is_default=True)
        p2 = SLAPolicy.objects.create(company=other_company, name="P2", is_default=True)
        p1.refresh_from_db()
        assert p1.is_default is True  # unaffected by other company's policy


# =============================================================================
# Auth Tests
# =============================================================================

@pytest.mark.django_db
class TestSLAPolicyAuth:
    def test_unauthenticated_returns_401(self):
        resp = APIClient().get("/api/sla-policies/")
        assert resp.status_code == 401


# =============================================================================
# CRUD Tests
# =============================================================================

@pytest.mark.django_db
class TestSLAPolicyCRUD:
    URL = "/api/sla-policies/"

    def test_list_empty(self, auth_owner):
        resp = auth_owner.get(self.URL)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_policy(self, auth_owner):
        resp = auth_owner.post(self.URL, {
            "name": "Strict SLA",
            "gps_radius_m": 75,
            "required_proof_photo": True,
            "required_proof_checklist": True,
        }, format="json")
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Strict SLA"
        assert data["gps_radius_m"] == 75
        assert data["required_proof_checklist"] is True

    def test_create_missing_name_returns_400(self, auth_owner):
        resp = auth_owner.post(self.URL, {"gps_radius_m": 100}, format="json")
        assert resp.status_code == 400
        assert "name" in resp.json()["fields"]

    def test_create_gps_radius_too_small_returns_400(self, auth_owner):
        resp = auth_owner.post(self.URL, {"name": "X", "gps_radius_m": 5}, format="json")
        assert resp.status_code == 400
        assert "gps_radius_m" in resp.json()["fields"]

    def test_create_gps_radius_too_large_returns_400(self, auth_owner):
        resp = auth_owner.post(self.URL, {"name": "X", "gps_radius_m": 99999}, format="json")
        assert resp.status_code == 400
        assert "gps_radius_m" in resp.json()["fields"]

    def test_create_invalid_window_returns_400(self, auth_owner):
        resp = auth_owner.post(self.URL, {
            "name": "X", "check_in_window_minutes": 999
        }, format="json")
        assert resp.status_code == 400
        assert "check_in_window_minutes" in resp.json()["fields"]

    def test_get_detail(self, auth_owner, policy):
        resp = auth_owner.get(f"{self.URL}{policy.id}/")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Standard SLA"

    def test_get_other_company_returns_404(self, auth_owner, other_company, db):
        from apps.jobs.models import SLAPolicy
        other_p = SLAPolicy.objects.create(company=other_company, name="Foreign")
        resp = auth_owner.get(f"{self.URL}{other_p.id}/")
        assert resp.status_code == 404

    def test_patch_gps_radius(self, auth_owner, policy):
        resp = auth_owner.patch(f"{self.URL}{policy.id}/", {"gps_radius_m": 200}, format="json")
        assert resp.status_code == 200
        assert resp.json()["gps_radius_m"] == 200

    def test_patch_required_proof_fields(self, auth_owner, policy):
        resp = auth_owner.patch(f"{self.URL}{policy.id}/", {
            "required_proof_checklist": True,
            "required_proof_signature": True,
        }, format="json")
        assert resp.status_code == 200
        data = resp.json()
        assert data["required_proof_checklist"] is True
        assert data["required_proof_signature"] is True

    def test_patch_set_default_clears_others(self, auth_owner, company, policy, db):
        from apps.jobs.models import SLAPolicy
        policy2 = SLAPolicy.objects.create(company=company, name="P2", is_default=False)
        resp = auth_owner.patch(f"{self.URL}{policy2.id}/", {"is_default": True}, format="json")
        assert resp.status_code == 200
        assert resp.json()["is_default"] is True
        policy.refresh_from_db()
        assert policy.is_default is False

    def test_delete_removes_policy(self, auth_owner, policy):
        resp = auth_owner.delete(f"{self.URL}{policy.id}/")
        assert resp.status_code == 204

    def test_delete_with_locations_returns_400(self, auth_owner, policy, location, db):
        location.sla_policy = policy
        location.save(update_fields=["sla_policy"])
        resp = auth_owner.delete(f"{self.URL}{policy.id}/")
        assert resp.status_code == 400
        assert resp.json()["code"] == "POLICY_IN_USE"

    def test_delete_requires_owner(self, auth_manager, policy):
        resp = auth_manager.delete(f"{self.URL}{policy.id}/")
        assert resp.status_code == 403

    def test_response_has_location_count(self, auth_owner, policy):
        resp = auth_owner.get(f"{self.URL}{policy.id}/")
        assert "location_count" in resp.json()


# =============================================================================
# Policy Inheritance Tests
# =============================================================================

@pytest.mark.django_db
class TestEffectiveSLAPolicy:
    def test_job_override_takes_precedence(self, job, company, db):
        from apps.jobs.models import SLAPolicy, get_effective_sla_policy
        override = SLAPolicy.objects.create(company=company, name="Override", gps_radius_m=50)
        job.sla_policy_override = override
        job.save(update_fields=["sla_policy_override"])
        effective = get_effective_sla_policy(job)
        assert effective.pk == override.pk
        assert effective.gps_radius_m == 50

    def test_location_policy_used_without_override(self, job, location, company, db):
        from apps.jobs.models import SLAPolicy, get_effective_sla_policy
        loc_policy = SLAPolicy.objects.create(company=company, name="Location SLA", gps_radius_m=75)
        location.sla_policy = loc_policy
        location.save(update_fields=["sla_policy"])
        job.location = location
        job.save(update_fields=["location"])
        effective = get_effective_sla_policy(job)
        assert effective.pk == loc_policy.pk

    def test_company_default_used_as_fallback(self, job, company, db):
        from apps.jobs.models import SLAPolicy, get_effective_sla_policy
        default = SLAPolicy.objects.create(company=company, name="Company Default",
                                           gps_radius_m=120, is_default=True)
        effective = get_effective_sla_policy(job)
        assert effective.pk == default.pk
        assert effective.gps_radius_m == 120

    def test_synthetic_fallback_when_no_policy(self, job, db):
        from apps.jobs.models import SLAPolicy, get_effective_sla_policy
        effective = get_effective_sla_policy(job)
        assert effective.pk is None  # synthetic — not saved
        assert effective.gps_radius_m == SLAPolicy.DEFAULT_GPS_RADIUS_M

    def test_location_effective_gps_radius_with_policy(self, location, company, db):
        from apps.jobs.models import SLAPolicy
        p = SLAPolicy.objects.create(company=company, name="Loc Policy", gps_radius_m=200)
        location.sla_policy = p
        location.save(update_fields=["sla_policy"])
        location.refresh_from_db()
        # Refresh sla_policy relation
        from apps.locations.models import Location
        loc = Location.objects.select_related("sla_policy").get(pk=location.pk)
        assert loc.effective_gps_radius_m == 200

    def test_location_effective_gps_radius_without_policy(self, location, db):
        from apps.jobs.models import SLAPolicy
        assert location.effective_gps_radius_m == SLAPolicy.DEFAULT_GPS_RADIUS_M


# =============================================================================
# Effective SLA Policy Endpoint Tests
# =============================================================================

@pytest.mark.django_db
class TestEffectiveSLAPolicyEndpoint:
    def test_returns_200_for_valid_job(self, auth_owner, job):
        resp = auth_owner.get(f"/api/jobs/{job.id}/effective-sla-policy/")
        assert resp.status_code == 200

    def test_returns_source_field(self, auth_owner, job):
        resp = auth_owner.get(f"/api/jobs/{job.id}/effective-sla-policy/")
        assert "source" in resp.json()

    def test_returns_404_for_other_company_job(self, auth_owner, other_company, db):
        from apps.accounts.models import User
        from apps.locations.models import Location
        from apps.jobs.models import Job
        other_cleaner = User.objects.create(
            company=other_company, role=User.ROLE_CLEANER,
            email="oc@slatest.com", full_name="OC", is_active=True,
        )
        other_loc = Location.objects.create(company=other_company, name="Other Loc")
        other_job = Job.objects.create(
            company=other_company, location=other_loc, cleaner=other_cleaner,
            status=Job.STATUS_SCHEDULED, context=Job.CONTEXT_CLEANING,
            scheduled_date=date.today(),
        )
        resp = auth_owner.get(f"/api/jobs/{other_job.id}/effective-sla-policy/")
        assert resp.status_code == 404

    def test_source_is_job_override(self, auth_owner, job, company, db):
        from apps.jobs.models import SLAPolicy
        override = SLAPolicy.objects.create(company=company, name="Override")
        job.sla_policy_override = override
        job.save(update_fields=["sla_policy_override"])
        resp = auth_owner.get(f"/api/jobs/{job.id}/effective-sla-policy/")
        assert resp.json()["source"] == "job_override"

    def test_source_is_platform_default_when_no_policy(self, auth_owner, job):
        resp = auth_owner.get(f"/api/jobs/{job.id}/effective-sla-policy/")
        assert resp.json()["source"] == "platform_default"
