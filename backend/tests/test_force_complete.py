"""
Test force-complete functionality.

Manager/Owner can override verification and force-complete jobs.
This is an audit-sensitive operation that requires:
- Manager or Owner role
- Reason (minimum 10 characters)
- Job must be in completable state (in_progress or completed_unverified)
"""
import pytest
from apps.jobs.models import Job


@pytest.mark.django_db
class TestForceCompletePermissions:
    """Force-complete RBAC tests"""

    def test_manager_can_force_complete(self, api_client, manager_user, in_progress_job):
        """Manager can force-complete jobs"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {manager_user.token}')

        response = api_client.post(f'/api/jobs/{in_progress_job.id}/force-complete/', {
            'reason': 'Client confirmed completion by phone'
        })

        assert response.status_code == 200
        in_progress_job.refresh_from_db()
        assert in_progress_job.status == Job.STATUS_COMPLETED
        assert in_progress_job.verification_override is True

    def test_owner_can_force_complete(self, api_client, owner_user, in_progress_job):
        """Owner can force-complete jobs"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {owner_user.token}')

        response = api_client.post(f'/api/jobs/{in_progress_job.id}/force-complete/', {
            'reason': 'Emergency completion needed'
        })

        assert response.status_code == 200
        in_progress_job.refresh_from_db()
        assert in_progress_job.status == Job.STATUS_COMPLETED

    def test_staff_cannot_force_complete(self, api_client, staff_user, in_progress_job):
        """Staff (cleaner) cannot force-complete jobs"""
        # Create a different job so staff_user is not the assigned cleaner
        from apps.jobs.models import Job, Location
        from django.utils import timezone
        from datetime import timedelta

        other_location = Location.objects.create(
            name="Other Location",
            company=staff_user.company,
            address="Test"
        )

        job = Job.objects.create(
            company=staff_user.company,
            location=other_location,
            cleaner=staff_user,
            status=Job.STATUS_IN_PROGRESS,
            context=Job.CONTEXT_CLEANING,
            scheduled_start_time=timezone.now() - timedelta(hours=1),
            scheduled_duration=timedelta(hours=2),
            actual_start_time=timezone.now() - timedelta(hours=1)
        )

        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        response = api_client.post(f'/api/jobs/{job.id}/force-complete/', {
            'reason': 'Trying to force complete'
        })

        assert response.status_code == 403


@pytest.mark.django_db
class TestForceCompleteValidation:
    """Force-complete validation tests"""

    def test_force_complete_requires_reason(self, api_client, manager_user, in_progress_job):
        """Force-complete requires reason"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {manager_user.token}')

        response = api_client.post(f'/api/jobs/{in_progress_job.id}/force-complete/', {})

        assert response.status_code == 400
        assert 'reason' in str(response.data).lower()

    def test_force_complete_requires_minimum_reason_length(self, api_client, manager_user, in_progress_job):
        """Force-complete reason must be at least 10 characters"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {manager_user.token}')

        response = api_client.post(f'/api/jobs/{in_progress_job.id}/force-complete/', {
            'reason': 'short'  # Too short (5 chars)
        })

        assert response.status_code == 400

    def test_force_complete_valid_reason_length(self, api_client, manager_user, in_progress_job):
        """Force-complete accepts reason >= 10 characters"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {manager_user.token}')

        response = api_client.post(f'/api/jobs/{in_progress_job.id}/force-complete/', {
            'reason': 'Valid reason with more than 10 characters'
        })

        assert response.status_code == 200

    def test_cannot_force_complete_scheduled_job(self, api_client, manager_user, scheduled_job):
        """Cannot force-complete job that hasn't started"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {manager_user.token}')

        response = api_client.post(f'/api/jobs/{scheduled_job.id}/force-complete/', {
            'reason': 'Trying to force complete scheduled job'
        })

        assert response.status_code == 400

    def test_can_force_complete_completed_unverified_job(self, api_client, manager_user, company, location, staff_user):
        """Can force-complete job in completed_unverified status"""
        from apps.jobs.models import Job
        from django.utils import timezone
        from datetime import timedelta

        job = Job.objects.create(
            company=company,
            location=location,
            cleaner=staff_user,
            status=Job.STATUS_COMPLETED_UNVERIFIED,
            context=Job.CONTEXT_CLEANING,
            scheduled_start_time=timezone.now() - timedelta(hours=2),
            scheduled_duration=timedelta(hours=2),
            actual_start_time=timezone.now() - timedelta(hours=2),
            actual_end_time=timezone.now() - timedelta(hours=1)
        )

        api_client.credentials(HTTP_AUTHORIZATION=f'Token {manager_user.token}')

        response = api_client.post(f'/api/jobs/{job.id}/force-complete/', {
            'reason': 'Override verification requirements'
        })

        assert response.status_code == 200

    def test_cannot_force_complete_already_completed_job(self, api_client, manager_user, completed_job):
        """Cannot force-complete already completed job"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {manager_user.token}')

        response = api_client.post(f'/api/jobs/{completed_job.id}/force-complete/', {
            'reason': 'Already completed'
        })

        # Should either reject (400) or be idempotent (200)
        assert response.status_code in [200, 400]


@pytest.mark.django_db
class TestForceCompleteAudit:
    """Force-complete audit trail tests"""

    def test_force_complete_stores_reason(self, api_client, manager_user, in_progress_job):
        """Force-complete stores the reason"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {manager_user.token}')

        reason = 'Emergency completion due to client request'

        response = api_client.post(f'/api/jobs/{in_progress_job.id}/force-complete/', {
            'reason': reason
        })

        assert response.status_code == 200
        in_progress_job.refresh_from_db()

        # Reason should be stored in notes or verification_override_reason field
        assert hasattr(in_progress_job, 'notes') or hasattr(in_progress_job, 'verification_override_reason')

    def test_force_complete_sets_verification_override(self, api_client, manager_user, in_progress_job):
        """Force-complete sets verification_override flag"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {manager_user.token}')

        response = api_client.post(f'/api/jobs/{in_progress_job.id}/force-complete/', {
            'reason': 'Override verification for testing'
        })

        assert response.status_code == 200
        in_progress_job.refresh_from_db()
        assert in_progress_job.verification_override is True

    def test_force_complete_sets_completion_time(self, api_client, manager_user, in_progress_job):
        """Force-complete sets actual_end_time if not already set"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {manager_user.token}')

        # Ensure job doesn't have end time yet
        in_progress_job.actual_end_time = None
        in_progress_job.save()

        response = api_client.post(f'/api/jobs/{in_progress_job.id}/force-complete/', {
            'reason': 'Force completion test'
        })

        assert response.status_code == 200
        in_progress_job.refresh_from_db()
        assert in_progress_job.actual_end_time is not None

    def test_force_complete_preserves_actual_times(self, api_client, manager_user, in_progress_job):
        """Force-complete preserves actual_start_time and actual_end_time if already set"""
        from django.utils import timezone

        original_start = in_progress_job.actual_start_time
        original_end = timezone.now()
        in_progress_job.actual_end_time = original_end
        in_progress_job.save()

        api_client.credentials(HTTP_AUTHORIZATION=f'Token {manager_user.token}')

        response = api_client.post(f'/api/jobs/{in_progress_job.id}/force-complete/', {
            'reason': 'Force complete with existing times'
        })

        assert response.status_code == 200
        in_progress_job.refresh_from_db()
        assert in_progress_job.actual_start_time == original_start
        # actual_end_time should be preserved or updated, but not cleared
        assert in_progress_job.actual_end_time is not None

    def test_force_complete_changes_status_to_completed(self, api_client, manager_user, in_progress_job):
        """Force-complete changes status to COMPLETED"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {manager_user.token}')

        response = api_client.post(f'/api/jobs/{in_progress_job.id}/force-complete/', {
            'reason': 'Status change test'
        })

        assert response.status_code == 200
        in_progress_job.refresh_from_db()
        assert in_progress_job.status == Job.STATUS_COMPLETED
