"""
RBAC and Cross-Company Isolation Tests for PR6

Tests comprehensive role-based access control and ensures users cannot:
- Access data from other companies
- Perform unauthorized actions based on role
- Bypass permission checks through API manipulation

Critical for multi-tenant SaaS security.
"""

import pytest
from django.contrib.auth.hashers import make_password
from rest_framework.test import APIClient

from apps.accounts.models import Company, Location, User
from apps.jobs.models import Job, JobPhoto
from apps.maintenance.models import (
    Asset,
    MaintenanceJob,
    MaintenancePhoto,
    MaintenanceSchedule,
)


@pytest.fixture
def company_a(db):
    """First company - legitimate user's company"""
    return Company.objects.create(
        name="Company A",
        contact_email="company-a@example.com",
    )


@pytest.fixture
def company_b(db):
    """Second company - should be inaccessible to Company A users"""
    return Company.objects.create(
        name="Company B",
        contact_email="company-b@example.com",
    )


@pytest.fixture
def location_a(company_a):
    """Location belonging to Company A"""
    return Location.objects.create(
        company=company_a,
        name="Location A",
        address="123 Main St",
    )


@pytest.fixture
def location_b(company_b):
    """Location belonging to Company B"""
    return Location.objects.create(
        company=company_b,
        name="Location B",
        address="456 Oak Ave",
    )


@pytest.fixture
def owner_a(company_a):
    """Owner user for Company A"""
    user = User.objects.create(
        company=company_a,
        email="owner-a@example.com",
        full_name="Owner A",
        role=User.ROLE_OWNER,
        is_active=True,
    )
    user.set_password("testpass123!")
    user.save()
    return user


@pytest.fixture
def manager_a(company_a):
    """Manager user for Company A"""
    user = User.objects.create(
        company=company_a,
        email="manager-a@example.com",
        full_name="Manager A",
        role=User.ROLE_MANAGER,
        is_active=True,
    )
    user.set_password("testpass123!")
    user.save()
    return user


@pytest.fixture
def cleaner_a(company_a):
    """Cleaner user for Company A"""
    user = User.objects.create(
        company=company_a,
        email="cleaner-a@example.com",
        full_name="Cleaner A",
        phone="+1234567890",
        role=User.ROLE_CLEANER,
        is_active=True,
        pin_hash=make_password("1234"),
    )
    user.set_password("testpass123!")
    user.save()
    return user


@pytest.fixture
def owner_b(company_b):
    """Owner user for Company B (attacker)"""
    user = User.objects.create(
        company=company_b,
        email="owner-b@example.com",
        full_name="Owner B",
        role=User.ROLE_OWNER,
        is_active=True,
    )
    user.set_password("testpass123!")
    user.save()
    return user


@pytest.fixture
def manager_b(company_b):
    """Manager user for Company B (attacker)"""
    user = User.objects.create(
        company=company_b,
        email="manager-b@example.com",
        full_name="Manager B",
        role=User.ROLE_MANAGER,
        is_active=True,
    )
    user.set_password("testpass123!")
    user.save()
    return user


@pytest.fixture
def job_a(company_a, location_a, cleaner_a):
    """Job belonging to Company A"""
    return Job.objects.create(
        company=company_a,
        location=location_a,
        cleaner=cleaner_a,
        scheduled_date="2026-02-20",
        status=Job.STATUS_SCHEDULED,
    )


@pytest.fixture
def job_b(company_b, location_b):
    """Job belonging to Company B (should be inaccessible to Company A)"""
    return Job.objects.create(
        company=company_b,
        location=location_b,
        scheduled_date="2026-02-20",
        status=Job.STATUS_SCHEDULED,
    )


# =============================================================================
# CLEANING CONTEXT - Cross-Company Isolation Tests
# =============================================================================


@pytest.mark.django_db
class TestCleaningJobIsolation:
    """Test that users cannot access jobs from other companies"""

    def test_manager_cannot_list_other_company_jobs(self, manager_a, job_a, job_b):
        """Manager from Company A should only see Company A jobs"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {manager_a.token}")

        response = client.get("/api/manager/jobs/")

        assert response.status_code == 200
        job_ids = [job["id"] for job in response.data]
        assert job_a.id in job_ids
        assert job_b.id not in job_ids  # Critical: Company B job must be hidden

    def test_manager_cannot_view_other_company_job_detail(self, manager_a, job_b):
        """Manager from Company A cannot view Company B job details"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {manager_a.token}")

        response = client.get(f"/api/manager/jobs/{job_b.id}/")

        # Should return 404 (not 403, to avoid leaking existence)
        assert response.status_code == 404

    def test_manager_cannot_update_other_company_job(self, manager_a, job_b):
        """Manager from Company A cannot update Company B jobs"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {manager_a.token}")

        response = client.patch(
            f"/api/manager/jobs/{job_b.id}/",
            {"status": Job.STATUS_COMPLETED},
            format="json",
        )

        assert response.status_code == 404
        # Verify job was not modified
        job_b.refresh_from_db()
        assert job_b.status == Job.STATUS_SCHEDULED

    def test_manager_cannot_delete_other_company_job(self, manager_a, job_b):
        """Manager from Company A cannot delete Company B jobs"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {manager_a.token}")

        response = client.delete(f"/api/manager/jobs/{job_b.id}/")

        assert response.status_code == 404
        # Verify job still exists
        assert Job.objects.filter(id=job_b.id).exists()

    def test_cleaner_cannot_access_other_company_jobs(
        self, cleaner_a, job_a, job_b
    ):
        """Cleaner from Company A should only see their assigned jobs"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {cleaner_a.token}")

        # List jobs
        response = client.get("/api/jobs/")
        assert response.status_code == 200
        job_ids = [job["id"] for job in response.data]
        assert job_a.id in job_ids
        assert job_b.id not in job_ids

        # Try to access Company B job directly
        response = client.get(f"/api/jobs/{job_b.id}/")
        assert response.status_code == 404


@pytest.mark.django_db
class TestCleaningLocationIsolation:
    """Test that users cannot access locations from other companies"""

    def test_manager_cannot_list_other_company_locations(
        self, manager_a, location_a, location_b
    ):
        """Manager should only see their company's locations"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {manager_a.token}")

        response = client.get("/api/manager/locations/")

        assert response.status_code == 200
        location_ids = [loc["id"] for loc in response.data]
        assert location_a.id in location_ids
        assert location_b.id not in location_ids

    def test_manager_cannot_create_location_for_other_company(
        self, manager_a, company_b
    ):
        """Manager cannot create locations for another company"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {manager_a.token}")

        response = client.post(
            "/api/manager/locations/",
            {
                "company": company_b.id,  # Try to create for Company B
                "name": "Malicious Location",
                "address": "123 Hack St",
            },
            format="json",
        )

        # Should fail validation or permission check
        assert response.status_code in [400, 403, 404]

        # Verify location was not created for Company B
        assert not Location.objects.filter(
            company=company_b, name="Malicious Location"
        ).exists()


@pytest.mark.django_db
class TestCleaningUserIsolation:
    """Test that users cannot access or modify users from other companies"""

    def test_manager_cannot_list_other_company_users(
        self, manager_a, cleaner_a, owner_b
    ):
        """Manager should only see users from their company"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {manager_a.token}")

        response = client.get("/api/manager/users/")

        assert response.status_code == 200
        user_ids = [user["id"] for user in response.data]
        assert cleaner_a.id in user_ids
        assert owner_b.id not in user_ids

    def test_manager_cannot_view_other_company_user(self, manager_a, owner_b):
        """Manager cannot view details of users from other companies"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {manager_a.token}")

        response = client.get(f"/api/manager/users/{owner_b.id}/")

        assert response.status_code == 404

    def test_manager_cannot_update_other_company_user(self, manager_a, owner_b):
        """Manager cannot modify users from other companies"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {manager_a.token}")

        response = client.patch(
            f"/api/manager/users/{owner_b.id}/",
            {"full_name": "Hacked Name"},
            format="json",
        )

        assert response.status_code == 404
        owner_b.refresh_from_db()
        assert owner_b.full_name == "Owner B"


# =============================================================================
# MAINTENANCE CONTEXT - Cross-Company Isolation Tests
# =============================================================================


@pytest.fixture
def asset_a(company_a, location_a):
    """Asset belonging to Company A"""
    return Asset.objects.create(
        company=company_a,
        location=location_a,
        name="Asset A",
        asset_type="HVAC",
        status="operational",
    )


@pytest.fixture
def asset_b(company_b, location_b):
    """Asset belonging to Company B"""
    return Asset.objects.create(
        company=company_b,
        location=location_b,
        name="Asset B",
        asset_type="Plumbing",
        status="operational",
    )


@pytest.fixture
def maintenance_job_a(company_a, location_a, asset_a):
    """Maintenance job for Company A"""
    return MaintenanceJob.objects.create(
        company=company_a,
        location=location_a,
        asset=asset_a,
        job_type="preventive",
        priority="medium",
        scheduled_date="2026-03-01",
        status="scheduled",
    )


@pytest.fixture
def maintenance_job_b(company_b, location_b, asset_b):
    """Maintenance job for Company B"""
    return MaintenanceJob.objects.create(
        company=company_b,
        location=location_b,
        asset=asset_b,
        job_type="repair",
        priority="high",
        scheduled_date="2026-03-01",
        status="scheduled",
    )


@pytest.mark.django_db
class TestMaintenanceAssetIsolation:
    """Test that users cannot access assets from other companies"""

    def test_manager_cannot_list_other_company_assets(
        self, manager_a, asset_a, asset_b
    ):
        """Manager should only see their company's assets"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {manager_a.token}")

        response = client.get("/api/maintenance/assets/")

        assert response.status_code == 200
        asset_ids = [asset["id"] for asset in response.data]
        assert asset_a.id in asset_ids
        assert asset_b.id not in asset_ids

    def test_manager_cannot_view_other_company_asset(self, manager_a, asset_b):
        """Manager cannot view asset details from other companies"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {manager_a.token}")

        response = client.get(f"/api/maintenance/assets/{asset_b.id}/")

        assert response.status_code == 404

    def test_manager_cannot_update_other_company_asset(self, manager_a, asset_b):
        """Manager cannot modify assets from other companies"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {manager_a.token}")

        response = client.patch(
            f"/api/maintenance/assets/{asset_b.id}/",
            {"name": "Hacked Asset"},
            format="json",
        )

        assert response.status_code == 404
        asset_b.refresh_from_db()
        assert asset_b.name == "Asset B"

    def test_manager_cannot_delete_other_company_asset(self, manager_a, asset_b):
        """Manager cannot delete assets from other companies"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {manager_a.token}")

        response = client.delete(f"/api/maintenance/assets/{asset_b.id}/")

        assert response.status_code == 404
        assert Asset.objects.filter(id=asset_b.id).exists()


@pytest.mark.django_db
class TestMaintenanceJobIsolation:
    """Test that users cannot access maintenance jobs from other companies"""

    def test_manager_cannot_list_other_company_maintenance_jobs(
        self, manager_a, maintenance_job_a, maintenance_job_b
    ):
        """Manager should only see their company's maintenance jobs"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {manager_a.token}")

        response = client.get("/api/maintenance/jobs/")

        assert response.status_code == 200
        job_ids = [job["id"] for job in response.data]
        assert maintenance_job_a.id in job_ids
        assert maintenance_job_b.id not in job_ids

    def test_manager_cannot_view_other_company_maintenance_job(
        self, manager_a, maintenance_job_b
    ):
        """Manager cannot view maintenance job details from other companies"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {manager_a.token}")

        response = client.get(f"/api/maintenance/jobs/{maintenance_job_b.id}/")

        assert response.status_code == 404

    def test_manager_cannot_update_other_company_maintenance_job(
        self, manager_a, maintenance_job_b
    ):
        """Manager cannot modify maintenance jobs from other companies"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {manager_a.token}")

        response = client.patch(
            f"/api/maintenance/jobs/{maintenance_job_b.id}/",
            {"status": "completed"},
            format="json",
        )

        assert response.status_code == 404
        maintenance_job_b.refresh_from_db()
        assert maintenance_job_b.status == "scheduled"


# =============================================================================
# ROLE-BASED ACCESS CONTROL (RBAC) Tests
# =============================================================================


@pytest.mark.django_db
class TestRoleBasedPermissions:
    """Test that users can only perform actions allowed by their role"""

    def test_cleaner_cannot_access_manager_endpoints(self, cleaner_a):
        """Cleaners should not access manager-only endpoints"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {cleaner_a.token}")

        # Try manager endpoints
        manager_endpoints = [
            "/api/manager/users/",
            "/api/manager/locations/",
            "/api/manager/jobs/",
            "/api/manager/analytics/performance/",
        ]

        for endpoint in manager_endpoints:
            response = client.get(endpoint)
            assert response.status_code in [
                403,
                404,
            ], f"Cleaner accessed manager endpoint: {endpoint}"

    def test_manager_cannot_access_owner_endpoints(self, manager_a):
        """Managers should not access owner-only endpoints"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {manager_a.token}")

        # Try owner endpoints (billing, company settings)
        owner_endpoints = [
            "/api/company/billing/",
            "/api/company/subscription/",
        ]

        for endpoint in owner_endpoints:
            response = client.get(endpoint)
            # May return 404 if endpoint doesn't exist yet, or 403 if protected
            assert response.status_code in [403, 404]

    def test_cleaner_cannot_create_users(self, cleaner_a, company_a):
        """Cleaners cannot create new users"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {cleaner_a.token}")

        response = client.post(
            "/api/manager/users/",
            {
                "company": company_a.id,
                "email": "malicious@example.com",
                "full_name": "Malicious User",
                "role": User.ROLE_MANAGER,
            },
            format="json",
        )

        assert response.status_code in [403, 404, 405]
        assert not User.objects.filter(email="malicious@example.com").exists()

    def test_cleaner_cannot_delete_jobs(self, cleaner_a, job_a):
        """Cleaners cannot delete jobs (manager-only)"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {cleaner_a.token}")

        response = client.delete(f"/api/jobs/{job_a.id}/")

        # Cleaners should not have delete permission
        assert response.status_code in [403, 405]
        assert Job.objects.filter(id=job_a.id).exists()


# =============================================================================
# IDOR (Insecure Direct Object Reference) Tests
# =============================================================================


@pytest.mark.django_db
class TestIDORProtection:
    """Test protection against IDOR attacks"""

    def test_cannot_access_job_by_guessing_id(self, manager_b, job_a):
        """User from Company B cannot access Company A job by guessing ID"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {manager_b.token}")

        # Try sequential IDs (common IDOR attack)
        for job_id in range(1, 100):
            response = client.get(f"/api/manager/jobs/{job_id}/")
            if job_id == job_a.id:
                # Should return 404, not job data
                assert response.status_code == 404

    def test_cannot_manipulate_company_id_in_request(
        self, manager_a, company_b, location_a
    ):
        """User cannot create resources for other companies via body manipulation"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {manager_a.token}")

        # Try to create job for Company B by manipulating company field
        response = client.post(
            "/api/manager/jobs/",
            {
                "company": company_b.id,  # Malicious: different company
                "location": location_a.id,
                "scheduled_date": "2026-03-01",
            },
            format="json",
        )

        # Should either reject or auto-set to user's company
        if response.status_code == 201:
            created_job = Job.objects.get(id=response.data["id"])
            # Must belong to manager's company, not the manipulated one
            assert created_job.company_id != company_b.id


# =============================================================================
# SUMMARY TESTS - Critical Security Assertions
# =============================================================================


@pytest.mark.django_db
class TestCriticalSecurityAssertions:
    """High-level security tests - all must pass"""

    def test_no_cross_company_data_leaks_in_list_endpoints(
        self, manager_a, job_a, job_b, asset_a, asset_b, location_a, location_b
    ):
        """Verify NO cross-company data in ANY list endpoint"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {manager_a.token}")

        endpoints_and_fields = [
            ("/api/manager/jobs/", "id", job_a.id, job_b.id),
            ("/api/manager/locations/", "id", location_a.id, location_b.id),
            ("/api/maintenance/assets/", "id", asset_a.id, asset_b.id),
        ]

        for endpoint, field, own_id, other_id in endpoints_and_fields:
            response = client.get(endpoint)
            if response.status_code == 200:
                ids = [item[field] for item in response.data]
                assert own_id in ids, f"Missing own data in {endpoint}"
                assert (
                    other_id not in ids
                ), f"CRITICAL: Cross-company leak in {endpoint}"

    def test_authentication_required_on_all_api_endpoints(self):
        """Verify all API endpoints require authentication"""
        client = APIClient()
        # No credentials

        endpoints = [
            "/api/jobs/",
            "/api/manager/jobs/",
            "/api/manager/users/",
            "/api/manager/locations/",
            "/api/maintenance/assets/",
            "/api/maintenance/jobs/",
        ]

        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code in [
                401,
                403,
            ], f"Unauthenticated access to {endpoint}"

    def test_sql_injection_protection_in_filters(self, manager_a):
        """Verify SQL injection attempts are blocked"""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Token {manager_a.token}")

        # SQL injection payloads
        malicious_payloads = [
            "1' OR '1'='1",
            "1; DROP TABLE jobs--",
            "1' UNION SELECT * FROM users--",
        ]

        for payload in malicious_payloads:
            response = client.get(f"/api/manager/jobs/?id={payload}")
            # Should not crash or leak data
            assert response.status_code in [200, 400, 404]
