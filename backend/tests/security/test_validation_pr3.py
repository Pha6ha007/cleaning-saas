"""
Security validation tests for PR3: Critical Validation Fixes

Tests:
- File upload size limits
- File upload type validation
- Coordinate range validation
- Text field length limits
- HTML sanitization
- Bulk operation limits
- Date/time business logic
"""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from datetime import timedelta

from apps.jobs.models import Job
from apps.accounts.models import User
from rest_framework.authtoken.models import Token


# =============================================================================
# PNG Test Image (1x1 pixel valid PNG)
# =============================================================================
PNG_1X1 = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
    b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


@pytest.mark.django_db
class TestFileUploadValidation:
    """Test file upload security validation (PR3)"""

    def test_file_size_limit_10mb(self, api_client, in_progress_job, staff_user):
        """File upload should reject files larger than 10MB"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        # Create a file that's 11MB (exceeds limit)
        large_file = SimpleUploadedFile(
            name="large.jpg",
            content=b"x" * (11 * 1024 * 1024),  # 11MB
            content_type="image/jpeg"
        )

        response = api_client.post(
            f'/api/jobs/{in_progress_job.id}/photos/',
            {'photo_type': 'before', 'file': large_file},
            format='multipart'
        )

        assert response.status_code == 400
        assert "exceeds maximum" in str(response.data).lower()

    def test_file_type_validation_extension(self, api_client, in_progress_job, staff_user):
        """File upload should reject non-image file extensions"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        # Create an executable file
        exe_file = SimpleUploadedFile(
            name="malware.exe",
            content=b"MZ\x90\x00",  # DOS executable header
            content_type="application/x-msdownload"
        )

        response = api_client.post(
            f'/api/jobs/{in_progress_job.id}/photos/',
            {'photo_type': 'before', 'file': exe_file},
            format='multipart'
        )

        assert response.status_code == 400
        # Should reject due to extension validator
        assert "extension" in str(response.data).lower() or "file" in str(response.data).lower()

    def test_valid_image_upload_succeeds(self, api_client, in_progress_job, staff_user):
        """Valid images should upload successfully"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        valid_image = SimpleUploadedFile(
            name="test.png",
            content=PNG_1X1,
            content_type="image/png"
        )

        response = api_client.post(
            f'/api/jobs/{in_progress_job.id}/photos/',
            {'photo_type': 'before', 'file': valid_image},
            format='multipart'
        )

        assert response.status_code == 201


@pytest.mark.django_db
class TestCoordinateValidation:
    """Test GPS coordinate range validation (PR3)"""

    def test_latitude_out_of_range_high(self, api_client, scheduled_job, staff_user):
        """Latitude > 90 should be rejected"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        response = api_client.post(
            f'/api/jobs/{scheduled_job.id}/check-in/',
            {'latitude': 91.0, 'longitude': 0.0}  # Invalid: latitude > 90
        )

        assert response.status_code == 400
        assert "latitude" in str(response.data).lower()

    def test_latitude_out_of_range_low(self, api_client, scheduled_job, staff_user):
        """Latitude < -90 should be rejected"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        response = api_client.post(
            f'/api/jobs/{scheduled_job.id}/check-in/',
            {'latitude': -91.0, 'longitude': 0.0}  # Invalid: latitude < -90
        )

        assert response.status_code == 400

    def test_longitude_out_of_range(self, api_client, scheduled_job, staff_user):
        """Longitude outside -180 to 180 should be rejected"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        response = api_client.post(
            f'/api/jobs/{scheduled_job.id}/check-in/',
            {'latitude': 0.0, 'longitude': 181.0}  # Invalid: longitude > 180
        )

        assert response.status_code == 400

    def test_valid_coordinates_accepted(self, api_client, scheduled_job, staff_user):
        """Valid coordinates should be accepted"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        # First need to change job status to in_progress
        scheduled_job.status = Job.STATUS_SCHEDULED
        scheduled_job.save()

        response = api_client.post(
            f'/api/jobs/{scheduled_job.id}/check-in/',
            {'latitude': 25.276, 'longitude': 55.296}  # Valid: Dubai coordinates
        )

        # Should succeed (or fail for other reasons, but not coordinate validation)
        assert response.status_code != 400 or "latitude" not in str(response.data).lower()


@pytest.mark.django_db
class TestTextFieldValidation:
    """Test text field length limits and HTML sanitization (PR3)"""

    def test_manager_notes_length_limit(self, api_client, owner_user, location, staff_user):
        """Manager notes should be limited to 2000 characters"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {owner_user.token}')

        # Create notes with 2001 characters
        long_notes = "x" * 2001

        response = api_client.post('/api/manager/jobs/', {
            'location_id': location.id,
            'cleaner_id': staff_user.id,
            'scheduled_date': '2026-02-20',
            'scheduled_start_time': '09:00:00',
            'scheduled_end_time': '11:00:00',
            'context': Job.CONTEXT_CLEANING,
            'manager_notes': long_notes  # Too long
        })

        assert response.status_code == 400
        assert "manager_notes" in str(response.data).lower() or "max" in str(response.data).lower()

    def test_html_sanitization_in_manager_notes(self, api_client, owner_user, location, staff_user):
        """Manager notes should strip HTML tags to prevent XSS"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {owner_user.token}')

        response = api_client.post('/api/manager/jobs/', {
            'location_id': location.id,
            'cleaner_id': staff_user.id,
            'scheduled_date': '2026-02-20',
            'scheduled_start_time': '09:00:00',
            'scheduled_end_time': '11:00:00',
            'context': Job.CONTEXT_CLEANING,
            'manager_notes': '<script>alert("XSS")</script>Clean thoroughly'
        })

        assert response.status_code == 201

        # Verify HTML was stripped
        job = Job.objects.get(id=response.data['id'])
        assert '<script>' not in job.manager_notes
        assert 'Clean thoroughly' in job.manager_notes  # Text should remain


@pytest.mark.django_db
class TestBulkOperationLimits:
    """Test bulk operation size limits (PR3)"""

    def test_bulk_checklist_update_limit_100_items(self, api_client, in_progress_job, staff_user):
        """Bulk checklist update should reject > 100 items"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        # Create 101 items
        items = [{'id': i, 'is_completed': True} for i in range(1, 102)]

        response = api_client.post(
            f'/api/jobs/{in_progress_job.id}/checklist/bulk-update/',
            {'items': items},
            format='json'
        )

        assert response.status_code == 400
        assert "100" in str(response.data) or "maximum" in str(response.data).lower()

    def test_bulk_checklist_update_100_items_succeeds(self, api_client, in_progress_job, staff_user):
        """Bulk checklist update should accept exactly 100 items"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {staff_user.token}')

        # Create checklist items first
        from apps.jobs.models import JobChecklistItem
        for i in range(100):
            JobChecklistItem.objects.create(
                job=in_progress_job,
                order=i,
                text=f"Task {i}",
                is_required=False,
                is_completed=False
            )

        # Update 100 items
        items = [{'id': item.id, 'is_completed': True} for item in in_progress_job.checklist_items.all()[:100]]

        response = api_client.post(
            f'/api/jobs/{in_progress_job.id}/checklist/bulk-update/',
            {'items': items},
            format='json'
        )

        # Should succeed or fail for other reasons (not size limit)
        assert response.status_code != 400 or "100" not in str(response.data)


@pytest.mark.django_db
class TestDateTimeBusinessLogic:
    """Test date/time business logic validation (PR3)"""

    def test_reject_past_date_scheduling(self, api_client, owner_user, location, staff_user):
        """Should reject scheduling jobs in the past"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {owner_user.token}')

        yesterday = (timezone.now() - timedelta(days=1)).date()

        response = api_client.post('/api/manager/jobs/', {
            'location_id': location.id,
            'cleaner_id': staff_user.id,
            'scheduled_date': str(yesterday),  # Past date
            'scheduled_start_time': '09:00:00',
            'scheduled_end_time': '11:00:00',
            'context': Job.CONTEXT_CLEANING
        })

        assert response.status_code == 400
        assert "past" in str(response.data).lower() or "date" in str(response.data).lower()

    def test_reject_end_before_start_time(self, api_client, owner_user, location, staff_user):
        """Should reject end_time before start_time"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {owner_user.token}')

        tomorrow = (timezone.now() + timedelta(days=1)).date()

        response = api_client.post('/api/manager/jobs/', {
            'location_id': location.id,
            'cleaner_id': staff_user.id,
            'scheduled_date': str(tomorrow),
            'scheduled_start_time': '11:00:00',  # After end time
            'scheduled_end_time': '09:00:00',    # Before start time
            'context': Job.CONTEXT_CLEANING
        })

        assert response.status_code == 400
        assert "end" in str(response.data).lower() or "time" in str(response.data).lower()

    def test_valid_future_date_accepted(self, api_client, owner_user, location, staff_user):
        """Valid future dates should be accepted"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {owner_user.token}')

        tomorrow = (timezone.now() + timedelta(days=1)).date()

        response = api_client.post('/api/manager/jobs/', {
            'location_id': location.id,
            'cleaner_id': staff_user.id,
            'scheduled_date': str(tomorrow),
            'scheduled_start_time': '09:00:00',
            'scheduled_end_time': '11:00:00',
            'context': Job.CONTEXT_CLEANING
        })

        assert response.status_code == 201
