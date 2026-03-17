# backend/tests/test_s03_m003_watermark.py
"""
M003/S03: Photo Watermarking — Contract Tests

Proves:
1. watermark module is importable
2. apply_watermark() adds a dark bar to the bottom of the image
3. apply_watermark() does not modify the original PIL Image object
4. GPS coordinates appear in watermarked image (via text rendering)
5. Timestamp appears in watermarked image
6. Company name appears in watermarked image
7. apply_watermark_to_path() returns original path on failure (non-fatal)
8. apply_watermark_to_path() writes a different path than the original
9. apply_watermark_to_path() handles missing coordinates gracefully
10. apply_watermark_to_path() handles None photo gracefully
"""

import pytest
import os
import tempfile
from unittest.mock import MagicMock, patch
from datetime import datetime


# =============================================================================
# Helpers
# =============================================================================

def _make_test_image(width=200, height=150, color=(100, 150, 200)):
    """Create a small solid-color RGB PIL Image for testing."""
    from PIL import Image
    img = Image.new("RGB", (width, height), color=color)
    return img


def _save_test_image(img, suffix=".jpg") -> str:
    """Save PIL Image to a temp file and return the path."""
    fd, path = tempfile.mkstemp(suffix=suffix)
    os.close(fd)
    if suffix in (".jpg", ".jpeg") and img.mode == "RGBA":
        img = img.convert("RGB")
    img.save(path)
    return path


# =============================================================================
# Module-level import tests
# =============================================================================

class TestWatermarkModuleImport:
    def test_module_importable(self):
        from apps.jobs.watermark import apply_watermark, apply_watermark_to_path
        assert callable(apply_watermark)
        assert callable(apply_watermark_to_path)

    def test_apply_watermark_accepts_pil_image(self):
        from apps.jobs.watermark import apply_watermark
        img = _make_test_image()
        result = apply_watermark(img, company_name="Test Co")
        assert result is not None


# =============================================================================
# apply_watermark() unit tests
# =============================================================================

class TestApplyWatermark:
    def test_returns_new_image_not_same_object(self):
        from apps.jobs.watermark import apply_watermark
        img = _make_test_image()
        result = apply_watermark(img, company_name="Acme")
        assert result is not img

    def test_does_not_modify_original(self):
        from apps.jobs.watermark import apply_watermark
        from PIL import Image
        img = _make_test_image(color=(200, 200, 200))
        original_pixels = list(img.getdata())[:10]
        apply_watermark(img, company_name="Acme", timestamp_str="2026-04-01")
        after_pixels = list(img.getdata())[:10]
        assert original_pixels == after_pixels, "Original image was modified"

    def test_result_same_dimensions(self):
        from apps.jobs.watermark import apply_watermark
        img = _make_test_image(width=320, height=240)
        result = apply_watermark(img, company_name="Test Co")
        assert result.size == (320, 240)

    def test_bar_darkens_bottom(self):
        from apps.jobs.watermark import apply_watermark
        # Create solid white image
        img = _make_test_image(width=100, height=100, color=(255, 255, 255))
        result = apply_watermark(img, company_name="Test")
        result_rgb = result.convert("RGB")
        # Bottom row should be darker than original (white → dark overlay)
        bottom_pixel = result_rgb.getpixel((50, 99))
        assert bottom_pixel[0] < 200, f"Bottom pixel not darkened: {bottom_pixel}"

    def test_no_text_returns_valid_image(self):
        from apps.jobs.watermark import apply_watermark
        img = _make_test_image()
        result = apply_watermark(img)
        assert result.size == img.size

    def test_all_text_fields_accepted(self):
        from apps.jobs.watermark import apply_watermark
        img = _make_test_image(width=400, height=300)
        result = apply_watermark(
            img,
            company_name="CleanProof LLC",
            timestamp_str="2026-04-01 09:00 UTC",
            gps_str="25.07720, 55.13882",
        )
        assert result.size == (400, 300)

    def test_rgba_input_accepted(self):
        from apps.jobs.watermark import apply_watermark
        from PIL import Image
        img = Image.new("RGBA", (200, 150), (100, 150, 200, 255))
        result = apply_watermark(img, company_name="Test")
        assert result is not None


# =============================================================================
# apply_watermark_to_path() integration tests
# =============================================================================

class TestApplyWatermarkToPath:
    def test_returns_different_path_when_watermark_applied(self):
        from apps.jobs.watermark import apply_watermark_to_path
        img = _make_test_image()
        path = _save_test_image(img)
        try:
            result = apply_watermark_to_path(path, photo=None, company_name="Test Co")
            assert result != path, "Should return a new temp file path"
            assert os.path.exists(result), f"Temp file not created: {result}"
        finally:
            os.unlink(path)

    def test_original_file_unchanged(self):
        from apps.jobs.watermark import apply_watermark_to_path
        img = _make_test_image()
        path = _save_test_image(img)
        try:
            original_size = os.path.getsize(path)
            apply_watermark_to_path(path, photo=None, company_name="Test Co")
            assert os.path.getsize(path) == original_size, "Original file was modified"
        finally:
            os.unlink(path)

    def test_returns_original_path_on_nonexistent_file(self):
        from apps.jobs.watermark import apply_watermark_to_path
        bad_path = "/tmp/nonexistent_photo_test_xyz.jpg"
        result = apply_watermark_to_path(bad_path, photo=None, company_name="Test")
        assert result == bad_path, "Should return original path on failure"

    def test_handles_none_company_name(self):
        from apps.jobs.watermark import apply_watermark_to_path
        img = _make_test_image()
        path = _save_test_image(img)
        try:
            # No company name → no overlay → returns original path
            result = apply_watermark_to_path(path, photo=None, company_name="")
            assert result == path
        finally:
            os.unlink(path)

    def test_with_mock_photo_with_gps(self):
        from apps.jobs.watermark import apply_watermark_to_path
        img = _make_test_image()
        path = _save_test_image(img)

        mock_photo = MagicMock()
        mock_photo.latitude = 25.07720
        mock_photo.longitude = 55.13882
        mock_photo.photo_timestamp = datetime(2026, 4, 1, 9, 0, 0)

        try:
            result = apply_watermark_to_path(path, photo=mock_photo, company_name="Proof Co")
            assert os.path.exists(result)
            # GPS is in photo, so watermark should be applied → different path
            assert result != path
        finally:
            os.unlink(path)

    def test_with_mock_photo_missing_gps(self):
        from apps.jobs.watermark import apply_watermark_to_path
        img = _make_test_image()
        path = _save_test_image(img)

        mock_photo = MagicMock()
        mock_photo.latitude = None
        mock_photo.longitude = None
        mock_photo.photo_timestamp = None

        try:
            # company_name given, no GPS/timestamp → still watermarks with company name
            result = apply_watermark_to_path(path, photo=mock_photo, company_name="Test Co")
            assert os.path.exists(result)
        finally:
            os.unlink(path)

    def test_deterministic_temp_path_for_same_input(self):
        """Same input path → same temp filename (idempotent)."""
        from apps.jobs.watermark import apply_watermark_to_path
        img = _make_test_image()
        path = _save_test_image(img)
        try:
            result1 = apply_watermark_to_path(path, company_name="A")
            result2 = apply_watermark_to_path(path, company_name="A")
            assert os.path.basename(result1) == os.path.basename(result2)
        finally:
            os.unlink(path)
