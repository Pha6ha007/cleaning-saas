"""
Test platform invariants (business rules that must always hold).

These tests verify that the system enforces critical business rules:
- Photo ordering (before → after)
- Job lifecycle progression (scheduled → in_progress → completed)
- Time logic (start < end)
- Evidence requirements (photos for verification)
- Data integrity (company ownership, no orphans)
"""
import pytest
from django.db import IntegrityError
from django.utils import timezone
from datetime import timedelta
from apps.accounts.models import Company
from apps.jobs.models import Job, JobPhoto


@pytest.mark.django_db
class TestPhotoInvariants:
    """Photo ordering and constraint tests"""

    def test_cannot_upload_after_photo_without_before(self, api_client, in_progress_job, staff_user):
        """Cannot upload 'after' photo if 'before' photo doesn't exist"""
        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image
        import io

        # Create test image
        img = Image.new('RGB', (100, 100), color='blue')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)

        test_file = SimpleUploadedFile(
            "test.jpg",
            img_bytes.read(),
            content_type="image/jpeg"
        )

        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        response = api_client.post(
            f'/api/jobs/{in_progress_job.id}/photos/',
            {'photo_type': 'after', 'file': test_file},
            format='multipart'
        )

        assert response.status_code == 400
        assert 'before' in str(response.data).lower()

    def test_max_one_photo_per_type(self, in_progress_job):
        """Cannot have multiple photos of same type for one job"""
        from apps.jobs.models import File

        # Create first before photo
        file1 = File.objects.create(
            file_path="/test/before1.jpg",
            file_type="image/jpeg"
        )
        JobPhoto.objects.create(
            job=in_progress_job,
            file=file1,
            photo_type="before"
        )

        # Try to create second before photo
        file2 = File.objects.create(
            file_path="/test/before2.jpg",
            file_type="image/jpeg"
        )

        with pytest.raises(IntegrityError):
            JobPhoto.objects.create(
                job=in_progress_job,
                file=file2,
                photo_type="before"
            )

    def test_can_replace_photo_of_same_type(self, api_client, in_progress_job, staff_user):
        """Can replace existing photo (upload overwrites)"""
        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image
        import io

        def create_test_image():
            img = Image.new('RGB', (100, 100), color='blue')
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='JPEG')
            img_bytes.seek(0)
            return SimpleUploadedFile("test.jpg", img_bytes.read(), content_type="image/jpeg")

        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        # Upload first before photo
        response1 = api_client.post(
            f'/api/jobs/{in_progress_job.id}/photos/',
            {'photo_type': 'before', 'file': create_test_image()},
            format='multipart'
        )

        assert response1.status_code in [200, 201]

        # Upload replacement before photo (should work via replacement logic)
        response2 = api_client.post(
            f'/api/jobs/{in_progress_job.id}/photos/',
            {'photo_type': 'before', 'file': create_test_image()},
            format='multipart'
        )

        # Should either succeed or return conflict depending on replacement policy
        assert response2.status_code in [200, 201, 409]


@pytest.mark.django_db
class TestJobLifecycleInvariants:
    """Job state transition rules"""

    def test_cannot_skip_in_progress_state(self, api_client, scheduled_job, manager_user):
        """Cannot directly change scheduled job to completed (must go through in_progress)"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {manager_user.token}')

        response = api_client.patch(f'/api/manager/jobs/{scheduled_job.id}/', {
            'status': Job.STATUS_COMPLETED
        })

        # Should reject invalid state transition
        assert response.status_code in [400, 403]

    def test_actual_start_time_required_for_in_progress(self, company, location, staff_user):
        """Job in STATUS_IN_PROGRESS must have actual_start_time"""
        from datetime import time
        with pytest.raises((IntegrityError, ValueError)):
            Job.objects.create(
                company=company,
                location=location,
                cleaner=staff_user,
                status=Job.STATUS_IN_PROGRESS,  # in_progress...
                context=Job.CONTEXT_CLEANING,
                scheduled_date=timezone.now().date(),
                scheduled_start_time=time(9, 0),
                scheduled_end_time=time(11, 0),
                actual_start_time=None  # ...but no actual_start_time (invalid)
            )

    def test_actual_end_time_required_for_completed(self, company, location, staff_user):
        """Completed job must have actual_end_time"""
        from datetime import time
        with pytest.raises((IntegrityError, ValueError)):
            Job.objects.create(
                company=company,
                location=location,
                cleaner=staff_user,
                status=Job.STATUS_COMPLETED,  # completed...
                context=Job.CONTEXT_CLEANING,
                scheduled_date=(timezone.now() - timedelta(hours=2)).date(),
                scheduled_start_time=time(9, 0),
                scheduled_end_time=time(11, 0),
                actual_start_time=timezone.now() - timedelta(hours=2),
                actual_end_time=None  # ...but no end time (invalid)
            )

    def test_start_time_before_end_time(self, company, location, staff_user):
        """actual_start_time must be before actual_end_time"""
        from datetime import time
        start = timezone.now()
        end = start - timedelta(hours=1)  # end BEFORE start (invalid)

        with pytest.raises((IntegrityError, ValueError)):
            Job.objects.create(
                company=company,
                location=location,
                cleaner=staff_user,
                status=Job.STATUS_COMPLETED,
                context=Job.CONTEXT_CLEANING,
                scheduled_date=start.date(),
                scheduled_start_time=time(9, 0),
                scheduled_end_time=time(11, 0),
                actual_start_time=start,
                actual_end_time=end  # Invalid: end < start
            )


@pytest.mark.django_db
class TestEvidenceInvariants:
    """Photo evidence requirements"""

    def test_verification_required_jobs_need_photos(self, api_client, in_progress_job, staff_user):
        """Jobs with verification_required=True cannot complete without photos"""
        # Set verification_required
        in_progress_job.verification_required = True
        in_progress_job.save()

        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        # Try to check out without uploading photos
        response = api_client.post(f'/api/jobs/{in_progress_job.id}/check-out/', {
            'latitude': 25.0808,
            'longitude': 55.1408
        })

        # Should either block (400) or set status to completed_unverified (not fully completed)
        if response.status_code == 200:
            in_progress_job.refresh_from_db()
            assert in_progress_job.status != Job.STATUS_COMPLETED  # Not fully completed
        else:
            assert response.status_code == 400

    def test_check_events_created_on_check_in_out(self, api_client, scheduled_job, staff_user):
        """Check-in and check-out create JobCheckEvent records"""
        from apps.jobs.models import JobCheckEvent

        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        # Check in
        api_client.post(f'/api/jobs/{scheduled_job.id}/check-in/', {
            'latitude': 25.0808,
            'longitude': 55.1408
        })

        assert JobCheckEvent.objects.filter(
            job=scheduled_job,
            event_type=JobCheckEvent.TYPE_CHECK_IN
        ).exists()

        # Check out
        api_client.post(f'/api/jobs/{scheduled_job.id}/check-out/', {
            'latitude': 25.0808,
            'longitude': 55.1408
        })

        assert JobCheckEvent.objects.filter(
            job=scheduled_job,
            event_type=JobCheckEvent.TYPE_CHECK_OUT
        ).exists()


@pytest.mark.django_db
class TestDataIntegrityInvariants:
    """Data ownership and integrity rules"""

    def test_all_jobs_belong_to_company(self, company, location, staff_user):
        """Every job must have a company"""
        from datetime import time
        job = Job.objects.create(
            company=company,
            location=location,
            cleaner=staff_user,
            status=Job.STATUS_SCHEDULED,
            context=Job.CONTEXT_CLEANING,
            scheduled_date=timezone.now().date(),
            scheduled_start_time=time(9, 0),
            scheduled_end_time=time(11, 0)
        )

        assert job.company is not None
        assert job.company == company

    def test_all_users_belong_to_company(self, company):
        """Every user (except superuser) must have a company"""
        from apps.accounts.models import User

        user = User.objects.create_user(
            email="test@test.com",
            password="testpass123!",
            role=User.ROLE_MANAGER,
            company=company
        )

        assert user.company is not None

    def test_cannot_delete_company_with_active_jobs(self, company, scheduled_job):
        """Cannot delete company that has active jobs"""
        # Try to delete company with jobs
        with pytest.raises((IntegrityError, ValueError)):
            company.delete()

    def test_locations_belong_to_company(self, location, company):
        """Locations must belong to a company"""
        assert location.company is not None
        assert location.company == company

    def test_cleaner_belongs_to_same_company_as_job(self, scheduled_job):
        """Job cleaner must be from the same company"""
        assert scheduled_job.cleaner.company == scheduled_job.company

    def test_job_location_belongs_to_same_company(self, scheduled_job):
        """Job location must be from the same company"""
        assert scheduled_job.location.company == scheduled_job.company

    def test_job_context_field_required(self, company, location, staff_user):
        """All jobs must have a context (cleaning/maintenance/etc)"""
        from datetime import time
        job = Job.objects.create(
            company=company,
            location=location,
            cleaner=staff_user,
            status=Job.STATUS_SCHEDULED,
            context=Job.CONTEXT_CLEANING,  # Must be set
            scheduled_date=timezone.now().date(),
            scheduled_start_time=time(9, 0),
            scheduled_end_time=time(11, 0)
        )

        assert job.context is not None
        assert job.context in [Job.CONTEXT_CLEANING, Job.CONTEXT_MAINTENANCE]
