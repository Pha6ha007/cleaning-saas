"""
Test check-in/check-out flow for cleaning jobs.

Critical path tests for job lifecycle:
- scheduled → in_progress (check-in)
- in_progress → completed_unverified (check-out)
- Location validation (500m radius)
- RBAC enforcement (only assigned cleaner)
"""
import pytest
from django.utils import timezone
from datetime import timedelta
from apps.jobs.models import Job, JobCheckEvent


@pytest.mark.django_db
class TestCheckIn:
    """Check-in flow tests"""

    def test_cleaner_can_check_in_to_assigned_job(self, api_client, scheduled_job, staff_user):
        """Cleaner can check in to their assigned scheduled job"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        response = api_client.post(f'/api/cleaner/jobs/{scheduled_job.id}/check-in/', {
            'latitude': 25.0808,
            'longitude': 55.1408
        })

        assert response.status_code == 200
        scheduled_job.refresh_from_db()
        assert scheduled_job.status == Job.STATUS_IN_PROGRESS
        assert scheduled_job.actual_start_time is not None

    def test_check_in_creates_check_event(self, api_client, scheduled_job, staff_user):
        """Check-in creates JobCheckEvent record"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        response = api_client.post(f'/api/cleaner/jobs/{scheduled_job.id}/check-in/', {
            'latitude': 25.0808,
            'longitude': 55.1408
        })

        assert response.status_code == 200
        assert JobCheckEvent.objects.filter(
            job=scheduled_job,
            event_type=JobCheckEvent.EVENT_CHECK_IN
        ).exists()

    def test_cannot_check_in_to_non_assigned_job(self, api_client, scheduled_job, company):
        """Cleaner cannot check in to job not assigned to them"""
        from apps.accounts.models import User
        from rest_framework.authtoken.models import Token

        other_cleaner = User.objects.create_user(
            username="+971502222222",
            phone="+971502222222",
            password="testpass123!",
            role=User.ROLE_STAFF,
            company=company,
            full_name="Other Cleaner"
        )
        token = Token.objects.create(user=other_cleaner)

        api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        response = api_client.post(f'/api/cleaner/jobs/{scheduled_job.id}/check-in/', {
            'latitude': 25.0808,
            'longitude': 55.1408
        })

        assert response.status_code == 403

    def test_cannot_check_in_to_already_in_progress_job(self, api_client, in_progress_job, staff_user):
        """Cannot check in to job already in progress"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        response = api_client.post(f'/api/cleaner/jobs/{in_progress_job.id}/check-in/', {
            'latitude': 25.0808,
            'longitude': 55.1408
        })

        assert response.status_code == 400

    def test_cannot_check_in_to_completed_job(self, api_client, completed_job, staff_user):
        """Cannot check in to completed job"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        response = api_client.post(f'/api/cleaner/jobs/{completed_job.id}/check-in/', {
            'latitude': 25.0808,
            'longitude': 55.1408
        })

        assert response.status_code == 400

    def test_check_in_outside_500m_radius_fails(self, api_client, scheduled_job, staff_user):
        """Check-in fails if outside 500m radius from location"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        # Coordinates far from Dubai Marina (Downtown Dubai)
        response = api_client.post(f'/api/cleaner/jobs/{scheduled_job.id}/check-in/', {
            'latitude': 25.1972,
            'longitude': 55.2744
        })

        assert response.status_code == 400
        assert 'location' in response.data or 'distance' in str(response.data).lower()

    def test_manager_cannot_check_in(self, api_client, scheduled_job, manager_user):
        """Manager cannot check in to jobs (cleaner-only endpoint)"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {manager_user.token}')

        response = api_client.post(f'/api/cleaner/jobs/{scheduled_job.id}/check-in/', {
            'latitude': 25.0808,
            'longitude': 55.1408
        })

        assert response.status_code == 403

    def test_owner_cannot_check_in(self, api_client, scheduled_job, owner_user):
        """Owner cannot check in to jobs (cleaner-only endpoint)"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {owner_user.token}')

        response = api_client.post(f'/api/cleaner/jobs/{scheduled_job.id}/check-in/', {
            'latitude': 25.0808,
            'longitude': 55.1408
        })

        assert response.status_code == 403


@pytest.mark.django_db
class TestCheckOut:
    """Check-out flow tests"""

    def test_cleaner_can_check_out_of_in_progress_job(self, api_client, in_progress_job, staff_user):
        """Cleaner can check out of their in-progress job"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        response = api_client.post(f'/api/cleaner/jobs/{in_progress_job.id}/check-out/', {
            'latitude': 25.0808,
            'longitude': 55.1408
        })

        assert response.status_code == 200
        in_progress_job.refresh_from_db()
        assert in_progress_job.status in [Job.STATUS_COMPLETED_UNVERIFIED, Job.STATUS_COMPLETED]
        assert in_progress_job.actual_end_time is not None

    def test_check_out_creates_check_event(self, api_client, in_progress_job, staff_user):
        """Check-out creates JobCheckEvent record"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        response = api_client.post(f'/api/cleaner/jobs/{in_progress_job.id}/check-out/', {
            'latitude': 25.0808,
            'longitude': 55.1408
        })

        assert response.status_code == 200
        assert JobCheckEvent.objects.filter(
            job=in_progress_job,
            event_type=JobCheckEvent.EVENT_CHECK_OUT
        ).exists()

    def test_cannot_check_out_of_scheduled_job(self, api_client, scheduled_job, staff_user):
        """Cannot check out of job that hasn't been checked in"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        response = api_client.post(f'/api/cleaner/jobs/{scheduled_job.id}/check-out/', {
            'latitude': 25.0808,
            'longitude': 55.1408
        })

        assert response.status_code == 400

    def test_cannot_check_out_of_already_completed_job(self, api_client, completed_job, staff_user):
        """Cannot check out of already completed job"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        response = api_client.post(f'/api/cleaner/jobs/{completed_job.id}/check-out/', {
            'latitude': 25.0808,
            'longitude': 55.1408
        })

        assert response.status_code == 400

    def test_check_out_outside_500m_radius_fails(self, api_client, in_progress_job, staff_user):
        """Check-out fails if outside 500m radius from location"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        # Coordinates far from location
        response = api_client.post(f'/api/cleaner/jobs/{in_progress_job.id}/check-out/', {
            'latitude': 25.1972,
            'longitude': 55.2744
        })

        assert response.status_code == 400

    def test_check_in_check_out_full_flow(self, api_client, scheduled_job, staff_user):
        """Full flow: scheduled → check-in → in_progress → check-out → completed"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        # Check in
        response = api_client.post(f'/api/cleaner/jobs/{scheduled_job.id}/check-in/', {
            'latitude': 25.0808,
            'longitude': 55.1408
        })
        assert response.status_code == 200
        scheduled_job.refresh_from_db()
        assert scheduled_job.status == Job.STATUS_IN_PROGRESS

        # Check out
        response = api_client.post(f'/api/cleaner/jobs/{scheduled_job.id}/check-out/', {
            'latitude': 25.0808,
            'longitude': 55.1408
        })
        assert response.status_code == 200
        scheduled_job.refresh_from_db()
        assert scheduled_job.status in [Job.STATUS_COMPLETED_UNVERIFIED, Job.STATUS_COMPLETED]

    def test_check_events_track_location(self, api_client, scheduled_job, staff_user):
        """Check events store GPS coordinates"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        lat, lng = 25.0808, 55.1408

        # Check in
        api_client.post(f'/api/cleaner/jobs/{scheduled_job.id}/check-in/', {
            'latitude': lat,
            'longitude': lng
        })

        # Check out
        scheduled_job.refresh_from_db()
        api_client.post(f'/api/cleaner/jobs/{scheduled_job.id}/check-out/', {
            'latitude': lat,
            'longitude': lng
        })

        check_in_event = JobCheckEvent.objects.filter(
            job=scheduled_job,
            event_type=JobCheckEvent.EVENT_CHECK_IN
        ).first()

        assert check_in_event is not None
        assert check_in_event.latitude == lat
        assert check_in_event.longitude == lng

    def test_check_out_of_non_assigned_job_fails(self, api_client, in_progress_job, company):
        """Cleaner cannot check out of job not assigned to them"""
        from apps.accounts.models import User
        from rest_framework.authtoken.models import Token

        other_cleaner = User.objects.create_user(
            username="+971503333333",
            phone="+971503333333",
            password="testpass123!",
            role=User.ROLE_STAFF,
            company=company,
            full_name="Other Cleaner"
        )
        token = Token.objects.create(user=other_cleaner)

        api_client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

        response = api_client.post(f'/api/cleaner/jobs/{in_progress_job.id}/check-out/', {
            'latitude': 25.0808,
            'longitude': 55.1408
        })

        assert response.status_code == 403

    def test_manager_cannot_check_out(self, api_client, in_progress_job, manager_user):
        """Manager cannot check out (cleaner-only endpoint)"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {manager_user.token}')

        response = api_client.post(f'/api/cleaner/jobs/{in_progress_job.id}/check-out/', {
            'latitude': 25.0808,
            'longitude': 55.1408
        })

        assert response.status_code == 403
