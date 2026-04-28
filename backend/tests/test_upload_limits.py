# backend/tests/test_upload_limits.py
"""
TICKET-003: Django must enforce a global upload-size ceiling.

The configured ceiling (DATA_UPLOAD_MAX_MEMORY_SIZE) MUST equal the value
hardcoded in nginx/conf.d/cleanproof.conf (client_max_body_size 20M),
otherwise oversized requests bypass nginx and surprise the application.
"""
import pytest
from django.conf import settings


# Must match nginx/conf.d/cleanproof.conf: client_max_body_size 20M
EXPECTED_MAX_BODY_BYTES = 20 * 1024 * 1024


class TestUploadLimitsConfig:
    """Configuration sanity: settings exist and have sane values."""

    def test_data_upload_max_memory_size_is_set(self):
        assert hasattr(settings, "DATA_UPLOAD_MAX_MEMORY_SIZE")
        assert isinstance(settings.DATA_UPLOAD_MAX_MEMORY_SIZE, int)
        assert settings.DATA_UPLOAD_MAX_MEMORY_SIZE > 0

    def test_data_upload_max_matches_nginx(self):
        """Django and nginx must agree on the body-size ceiling."""
        assert settings.DATA_UPLOAD_MAX_MEMORY_SIZE == EXPECTED_MAX_BODY_BYTES, (
            f"Django DATA_UPLOAD_MAX_MEMORY_SIZE = {settings.DATA_UPLOAD_MAX_MEMORY_SIZE} "
            f"but nginx client_max_body_size = {EXPECTED_MAX_BODY_BYTES}. "
            f"They MUST match — see nginx/conf.d/cleanproof.conf."
        )

    def test_file_upload_max_memory_size_is_set(self):
        assert hasattr(settings, "FILE_UPLOAD_MAX_MEMORY_SIZE")
        assert settings.FILE_UPLOAD_MAX_MEMORY_SIZE > 0
        # FILE_UPLOAD_MAX_MEMORY_SIZE should be <= DATA_UPLOAD_MAX_MEMORY_SIZE
        assert settings.FILE_UPLOAD_MAX_MEMORY_SIZE <= settings.DATA_UPLOAD_MAX_MEMORY_SIZE

    def test_max_number_fields_is_capped(self):
        assert hasattr(settings, "DATA_UPLOAD_MAX_NUMBER_FIELDS")
        assert 0 < settings.DATA_UPLOAD_MAX_NUMBER_FIELDS <= 10000

    def test_max_number_files_is_capped(self):
        assert hasattr(settings, "DATA_UPLOAD_MAX_NUMBER_FILES")
        assert 0 < settings.DATA_UPLOAD_MAX_NUMBER_FILES <= 1000


@pytest.mark.django_db
class TestUploadLimitsEnforcement:
    """Behavioural test: Django actually rejects oversized request bodies."""

    def test_oversized_request_body_rejected(self, client):
        """A request body larger than DATA_UPLOAD_MAX_MEMORY_SIZE must be rejected."""
        from django.conf import settings as dj_settings

        # Build a payload 1 KB larger than the hard limit
        oversized_payload = "x" * (dj_settings.DATA_UPLOAD_MAX_MEMORY_SIZE + 1024)

        # Use a public endpoint that accepts POST. /api/auth/login/ rejects
        # oversized bodies before authentication kicks in.
        response = client.post(
            "/api/auth/login/",
            data=oversized_payload,
            content_type="application/json",
        )
        # Django returns 400 (RequestDataTooBig) for oversized JSON bodies.
        assert response.status_code in (400, 413), (
            f"Expected 400 or 413 for oversized body, got {response.status_code}. "
            f"Body limit may not be enforced."
        )
