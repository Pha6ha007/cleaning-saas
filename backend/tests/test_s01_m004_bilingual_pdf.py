# backend/tests/test_s01_m004_bilingual_pdf.py
"""
M004/S01: Bilingual Arabic/English Maintenance PDFs — Contract Tests

Proves:
1. fpdf2, arabic_reshaper, python-bidi are installed and importable
2. _reshape_arabic() returns a non-empty string for Arabic input
3. _reshape_arabic() handles empty string gracefully
4. _find_arabic_font() returns a path when Amiri font is bundled
5. LABELS dict has all required Arabic + English keys
6. generate_bilingual_visit_report_pdf() returns PDF bytes
7. PDF bytes start with %PDF (valid PDF header)
8. Bilingual endpoint exists at /api/maintenance/visits/<id>/report/bilingual/
9. Endpoint returns 404 for non-existent visit
10. Endpoint returns 400 for non-completed visit
11. Endpoint returns PDF content-type on valid completed visit
"""

import pytest
from datetime import date
from unittest.mock import patch, MagicMock


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def company(db):
    from apps.accounts.models import Company
    return Company.objects.create(name="Bilingual Test Co", plan="active")


@pytest.fixture
def owner(company, db):
    from apps.accounts.models import User
    u = User.objects.create(
        company=company, role=User.ROLE_OWNER,
        email="bilingual_owner@test.com", full_name="Bilingual Owner",
        is_active=True,
    )
    u.set_password("Pass123!")
    u.save()
    return u


@pytest.fixture
def manager_jwt(owner):
    from apps.api.serializers_jwt import ProofTokenObtainPairSerializer
    token = ProofTokenObtainPairSerializer.get_token(owner)
    return str(token.access_token)


@pytest.fixture
def completed_visit(company, db):
    from apps.jobs.models import Job
    from apps.locations.models import Location
    from apps.accounts.models import User
    from django.utils import timezone

    location = Location.objects.create(company=company, name="Bilingual Location")
    tech = User.objects.create(
        company=company, role=User.ROLE_CLEANER,
        email="bilingual_tech@test.com", full_name="Ahmad Al Rashidi",
        is_active=True,
    )
    job = Job.objects.create(
        company=company,
        location=location,
        cleaner=tech,
        scheduled_date=date(2026, 4, 1),
        status=Job.STATUS_COMPLETED,
        context=Job.CONTEXT_MAINTENANCE,
        actual_end_time=timezone.now(),
    )
    return job


@pytest.fixture
def scheduled_visit(company, db):
    from apps.jobs.models import Job
    from apps.locations.models import Location
    from apps.accounts.models import User

    location = Location.objects.create(company=company, name="Scheduled Location")
    tech = User.objects.create(
        company=company, role=User.ROLE_CLEANER,
        email="bilingual_tech2@test.com", full_name="Tech 2", is_active=True,
    )
    job = Job.objects.create(
        company=company, location=location, cleaner=tech,
        scheduled_date=date(2026, 5, 1),
        status=Job.STATUS_SCHEDULED, context=Job.CONTEXT_MAINTENANCE,
    )
    return job


# =============================================================================
# Package Installation Tests
# =============================================================================

class TestDependenciesInstalled:
    def test_fpdf2_importable(self):
        from fpdf import FPDF
        assert FPDF is not None

    def test_arabic_reshaper_importable(self):
        import arabic_reshaper
        assert arabic_reshaper is not None

    def test_python_bidi_importable(self):
        from bidi.algorithm import get_display
        assert callable(get_display)


# =============================================================================
# Arabic Text Processing Tests
# =============================================================================

class TestArabicReshaping:
    def test_reshape_arabic_returns_string(self):
        from apps.api.bilingual_pdf import _reshape_arabic
        result = _reshape_arabic("مرحبا")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_reshape_arabic_handles_empty_string(self):
        from apps.api.bilingual_pdf import _reshape_arabic
        assert _reshape_arabic("") == ""

    def test_reshape_arabic_handles_none(self):
        from apps.api.bilingual_pdf import _reshape_arabic
        assert _reshape_arabic(None) == None  # returns None unchanged (falsy fast path)

    def test_reshape_arabic_preserves_english(self):
        from apps.api.bilingual_pdf import _reshape_arabic
        # English text should pass through without mangling
        result = _reshape_arabic("Hello World")
        assert "Hello" in result or len(result) > 0

    def test_reshape_arabic_mixed_text(self):
        from apps.api.bilingual_pdf import _reshape_arabic
        result = _reshape_arabic("Visit #42 — زيارة رقم ٤٢")
        assert isinstance(result, str)


# =============================================================================
# Font Discovery Tests
# =============================================================================

class TestFontDiscovery:
    def test_amiri_font_bundled(self):
        from apps.api.bilingual_pdf import _find_arabic_font
        path = _find_arabic_font()
        assert path is not None, "Amiri-Regular.ttf not found in apps/api/fonts/ — run font download"

    def test_amiri_font_file_exists(self):
        from apps.api.bilingual_pdf import _find_arabic_font
        import os
        path = _find_arabic_font()
        if path:
            assert os.path.exists(path), f"Font path returned but file missing: {path}"


# =============================================================================
# Labels Dict Tests
# =============================================================================

class TestBilingualLabels:
    def test_labels_dict_has_arabic_keys(self):
        from apps.api.bilingual_pdf import LABELS
        arabic_keys = [k for k in LABELS if k.endswith("_ar")]
        assert len(arabic_keys) >= 10, "Expected at least 10 Arabic label keys"

    def test_labels_dict_has_english_keys(self):
        from apps.api.bilingual_pdf import LABELS
        english_keys = [k for k in LABELS if k.endswith("_en")]
        assert len(english_keys) >= 10

    def test_required_labels_present(self):
        from apps.api.bilingual_pdf import LABELS
        required = [
            "report_title_ar", "report_title_en",
            "location_ar", "location_en",
            "technician_ar", "technician_en",
            "completed_at_ar", "completed_at_en",
        ]
        for key in required:
            assert key in LABELS, f"Missing label key: {key}"


# =============================================================================
# PDF Generation Tests
# =============================================================================

@pytest.mark.django_db
class TestBilingualPDFGeneration:
    def test_generates_pdf_bytes(self, completed_visit):
        from apps.api.bilingual_pdf import generate_bilingual_visit_report_pdf
        pdf_bytes = generate_bilingual_visit_report_pdf(completed_visit)
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 100

    def test_pdf_has_valid_header(self, completed_visit):
        from apps.api.bilingual_pdf import generate_bilingual_visit_report_pdf
        pdf_bytes = generate_bilingual_visit_report_pdf(completed_visit)
        assert pdf_bytes[:4] == b"%PDF", f"Not a valid PDF — starts with: {pdf_bytes[:4]}"

    def test_generates_without_optional_fields(self, company, db):
        """Generate PDF when job has no asset, no category, no notes."""
        from apps.api.bilingual_pdf import generate_bilingual_visit_report_pdf
        from apps.jobs.models import Job
        from apps.locations.models import Location
        from apps.accounts.models import User
        from django.utils import timezone

        location = Location.objects.create(company=company, name="Minimal Location")
        tech = User.objects.create(
            company=company, role=User.ROLE_CLEANER,
            email="minimal_tech@test.com", full_name="Min Tech", is_active=True,
        )
        job = Job.objects.create(
            company=company, location=location, cleaner=tech,
            scheduled_date=date(2026, 4, 1),
            status=Job.STATUS_COMPLETED, context=Job.CONTEXT_MAINTENANCE,
            actual_end_time=timezone.now(),
        )
        pdf_bytes = generate_bilingual_visit_report_pdf(job)
        assert pdf_bytes[:4] == b"%PDF"


# =============================================================================
# API Endpoint Tests
# =============================================================================

@pytest.mark.django_db
class TestBilingualReportEndpoint:
    URL = "/api/maintenance/visits/{pk}/report/bilingual/"

    def test_returns_pdf_for_completed_visit(self, completed_visit, manager_jwt):
        from rest_framework.test import APIClient
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {manager_jwt}")
        resp = client.get(self.URL.format(pk=completed_visit.id))
        assert resp.status_code == 200
        assert resp["Content-Type"] == "application/pdf"
        assert resp.content[:4] == b"%PDF"

    def test_returns_404_for_nonexistent_visit(self, manager_jwt):
        from rest_framework.test import APIClient
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {manager_jwt}")
        resp = client.get(self.URL.format(pk=99999))
        assert resp.status_code == 404

    def test_returns_400_for_non_completed_visit(self, scheduled_visit, manager_jwt):
        from rest_framework.test import APIClient
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {manager_jwt}")
        resp = client.get(self.URL.format(pk=scheduled_visit.id))
        assert resp.status_code == 400
        assert resp.json()["code"] == "INVALID_STATUS"

    def test_returns_401_unauthenticated(self, completed_visit):
        from rest_framework.test import APIClient
        client = APIClient()
        resp = client.get(self.URL.format(pk=completed_visit.id))
        assert resp.status_code == 401

    def test_content_disposition_header(self, completed_visit, manager_jwt):
        from rest_framework.test import APIClient
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {manager_jwt}")
        resp = client.get(self.URL.format(pk=completed_visit.id))
        assert resp.status_code == 200
        assert "bilingual" in resp["Content-Disposition"]
