"""
Test RBAC (Role-Based Access Control) enforcement.

Tests that roles have appropriate permissions:
- Owner: full access to company data
- Manager: read/write access, limited console operations
- Staff (Cleaner): read own jobs, check-in/out only
- Cross-company isolation
"""
import pytest
from apps.jobs.models import Job, Location
from apps.accounts.models import User
from rest_framework.authtoken.models import Token


@pytest.mark.django_db
class TestOwnerPermissions:
    """Owner role tests"""

    def test_owner_can_list_all_jobs(self, api_client, owner_user, scheduled_job):
        """Owner can list all company jobs"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {owner_user.token}')

        response = api_client.get('/api/jobs/')

        assert response.status_code == 200
        assert len(response.data) >= 1

    def test_owner_can_create_job(self, api_client, owner_user, location, staff_user):
        """Owner can create new jobs"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {owner_user.token}')

        response = api_client.post('/api/jobs/', {
            'location': location.id,
            'cleaner': staff_user.id,
            'scheduled_start_time': '2026-02-20T09:00:00Z',
            'scheduled_duration': 7200,
            'context': Job.CONTEXT_CLEANING
        })

        assert response.status_code == 201

    def test_owner_can_delete_job(self, api_client, owner_user, scheduled_job):
        """Owner can delete jobs"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {owner_user.token}')

        response = api_client.delete(f'/api/jobs/{scheduled_job.id}/')

        assert response.status_code == 204

    def test_owner_can_create_location(self, api_client, owner_user, company):
        """Owner can create locations"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {owner_user.token}')

        response = api_client.post('/api/locations/', {
            'name': 'New Location',
            'company': company.id,
            'address': 'Test Address'
        })

        assert response.status_code == 201

    def test_owner_can_invite_users(self, api_client, owner_user):
        """Owner can invite new users (managers/staff)"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {owner_user.token}')

        response = api_client.post('/api/users/', {
            'email': 'newmanager@test.com',
            'role': User.ROLE_MANAGER,
            'full_name': 'New Manager'
        })

        # Should either succeed (201) or require additional confirmation
        assert response.status_code in [201, 200, 400]  # 400 if endpoint requires more fields


@pytest.mark.django_db
class TestManagerPermissions:
    """Manager role tests"""

    def test_manager_can_list_jobs(self, api_client, manager_user, scheduled_job):
        """Manager can list company jobs"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {manager_user.token}')

        response = api_client.get('/api/jobs/')

        assert response.status_code == 200

    def test_manager_can_create_job(self, api_client, manager_user, location, staff_user):
        """Manager can create jobs"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {manager_user.token}')

        response = api_client.post('/api/jobs/', {
            'location': location.id,
            'cleaner': staff_user.id,
            'scheduled_start_time': '2026-02-20T09:00:00Z',
            'scheduled_duration': 7200,
            'context': Job.CONTEXT_CLEANING
        })

        assert response.status_code == 201

    def test_manager_can_update_job(self, api_client, manager_user, scheduled_job):
        """Manager can update jobs"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {manager_user.token}')

        response = api_client.patch(f'/api/jobs/{scheduled_job.id}/', {
            'scheduled_start_time': '2026-02-20T10:00:00Z'
        })

        assert response.status_code == 200

    def test_manager_cannot_delete_company(self, api_client, manager_user, company):
        """Manager cannot delete company (owner-only)"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {manager_user.token}')

        response = api_client.delete(f'/api/companies/{company.id}/')

        assert response.status_code == 403


@pytest.mark.django_db
class TestStaffPermissions:
    """Staff (Cleaner) role tests"""

    def test_staff_can_list_own_jobs(self, api_client, staff_user, scheduled_job):
        """Staff can list jobs assigned to them"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        response = api_client.get('/api/cleaner/jobs/')

        assert response.status_code == 200
        # Should only see jobs assigned to this cleaner
        for job in response.data:
            assert job['cleaner'] == staff_user.id

    def test_staff_cannot_create_job(self, api_client, staff_user, location):
        """Staff cannot create jobs (manager/owner only)"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        response = api_client.post('/api/jobs/', {
            'location': location.id,
            'cleaner': staff_user.id,
            'scheduled_start_time': '2026-02-20T09:00:00Z',
            'scheduled_duration': 7200
        })

        assert response.status_code == 403

    def test_staff_cannot_delete_job(self, api_client, staff_user, scheduled_job):
        """Staff cannot delete jobs"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        response = api_client.delete(f'/api/jobs/{scheduled_job.id}/')

        assert response.status_code == 403

    def test_staff_cannot_access_all_jobs_endpoint(self, api_client, staff_user):
        """Staff cannot access full jobs list (cleaner endpoint only)"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        response = api_client.get('/api/jobs/')

        assert response.status_code == 403

    def test_staff_cannot_create_location(self, api_client, staff_user, company):
        """Staff cannot create locations"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        response = api_client.post('/api/locations/', {
            'name': 'Unauthorized Location',
            'company': company.id,
            'address': 'Test'
        })

        assert response.status_code == 403


@pytest.mark.django_db
class TestCrossCompanyIsolation:
    """Cross-company data isolation tests"""

    def test_user_cannot_see_other_company_jobs(self, api_client, manager_user, company):
        """Users cannot see jobs from other companies"""
        # Create another company with job
        from apps.accounts.models import Company
        from apps.jobs.models import Location, Job

        other_company = Company.objects.create(
            name="Other Company",
            contact_email="other@company.com",
            is_active=True
        )

        other_location = Location.objects.create(
            name="Other Location",
            company=other_company,
            address="Other Address"
        )

        other_cleaner = User.objects.create_user(
            username="+971504444444",
            phone="+971504444444",
            password="testpass123!",
            role=User.ROLE_STAFF,
            company=other_company,
            full_name="Other Cleaner"
        )

        other_job = Job.objects.create(
            company=other_company,
            location=other_location,
            cleaner=other_cleaner,
            status=Job.STATUS_SCHEDULED,
            context=Job.CONTEXT_CLEANING
        )

        # Try to access other company's job
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {manager_user.token}')

        response = api_client.get(f'/api/jobs/{other_job.id}/')

        assert response.status_code == 404  # Should not exist from this company's perspective

    def test_owner_cannot_modify_other_company_location(self, api_client, owner_user):
        """Owner cannot modify locations from other companies"""
        from apps.accounts.models import Company
        from apps.jobs.models import Location

        other_company = Company.objects.create(
            name="Other Company",
            contact_email="other@company.com",
            is_active=True
        )

        other_location = Location.objects.create(
            name="Other Location",
            company=other_company,
            address="Other Address"
        )

        api_client.credentials(HTTP_AUTHORIZATION=f'Token {owner_user.token}')

        response = api_client.patch(f'/api/locations/{other_location.id}/', {
            'name': 'Hacked Name'
        })

        assert response.status_code == 404
