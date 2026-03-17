"""
apps/jobs/watermark.py

Photo watermarking for proof reports (M003/S03).

Overlays company name, timestamp, and GPS coordinates onto a copy of a job photo
using Pillow. The original file is NEVER modified.

Usage in pdf.py:
    from apps.jobs.watermark import apply_watermark_to_path
    watermarked_path = apply_watermark_to_path(abs_path, photo, company_name)
    # pass watermarked_path to ReportLab Image()

Architecture:
- apply_watermark_to_path(): main entry point — reads file, applies overlay, writes temp file
- apply_watermark(): works on PIL Image object (testable without filesystem)
- Returns original path unchanged if watermarking fails (non-fatal, report still renders)

Design:
- Dark semi-transparent bar at bottom of image
- Three text elements: company name (bottom-left), GPS (bottom-right), timestamp (bottom-center)
- Font: PIL default (no external font dependency); falls back gracefully
- Temp file written to /tmp with deterministic name (photo id + hash); cleaned up by OS
"""

import hashlib
import logging
import os
import tempfile
from io import BytesIO
from typing import Optional

logger = logging.getLogger(__name__)

# Bar height as fraction of image height
_BAR_HEIGHT_RATIO = 0.08
_MIN_BAR_HEIGHT_PX = 28
_MAX_BAR_HEIGHT_PX = 80

# Colors
_BAR_COLOR = (0, 0, 0, 160)        # semi-transparent black
_TEXT_COLOR = (255, 255, 255, 255)  # white, fully opaque
_TEXT_PADDING = 8


def _get_font(size: int):
    """Return a PIL font. Falls back to default if truetype unavailable."""
    try:
        from PIL import ImageFont
        # Try common system fonts (macOS / Linux / Docker)
        for font_path in [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        ]:
            if os.path.exists(font_path):
                return ImageFont.truetype(font_path, size)
        # Default bitmap font (always available)
        return ImageFont.load_default()
    except Exception:
        from PIL import ImageFont
        return ImageFont.load_default()


def apply_watermark(
    image,  # PIL.Image.Image
    *,
    company_name: str = "",
    timestamp_str: str = "",
    gps_str: str = "",
) -> "PIL.Image.Image":  # type: ignore[name-defined]
    """
    Apply a watermark bar to a PIL Image object.

    Returns a new PIL Image (does not modify the input).
    All text parameters are optional — missing ones are omitted from the bar.
    """
    from PIL import Image, ImageDraw

    # Work on a copy
    img = image.copy()

    # Ensure RGBA for alpha compositing
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    w, h = img.size
    bar_h = max(_MIN_BAR_HEIGHT_PX, min(_MAX_BAR_HEIGHT_PX, int(h * _BAR_HEIGHT_RATIO)))
    font_size = max(11, bar_h // 2)
    font = _get_font(font_size)

    # Create transparent overlay layer
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Draw semi-transparent bar at bottom
    bar_top = h - bar_h
    draw.rectangle([(0, bar_top), (w, h)], fill=_BAR_COLOR)

    text_y = bar_top + (bar_h - font_size) // 2

    # Left: company name
    if company_name:
        draw.text((_TEXT_PADDING, text_y), company_name, font=font, fill=_TEXT_COLOR)

    # Right: GPS
    if gps_str:
        try:
            bbox = draw.textbbox((0, 0), gps_str, font=font)
            text_w = bbox[2] - bbox[0]
        except AttributeError:
            # Older Pillow versions
            text_w, _ = draw.textsize(gps_str, font=font)
        draw.text((w - text_w - _TEXT_PADDING, text_y), gps_str, font=font, fill=_TEXT_COLOR)

    # Center: timestamp
    if timestamp_str:
        try:
            bbox = draw.textbbox((0, 0), timestamp_str, font=font)
            text_w = bbox[2] - bbox[0]
        except AttributeError:
            text_w, _ = draw.textsize(timestamp_str, font=font)
        draw.text(((w - text_w) // 2, text_y), timestamp_str, font=font, fill=_TEXT_COLOR)

    # Composite overlay onto image
    result = Image.alpha_composite(img, overlay)
    return result


def apply_watermark_to_path(
    abs_path: str,
    photo=None,  # Optional[JobPhoto]
    company_name: str = "",
) -> str:
    """
    Read image at abs_path, apply watermark, write to a temp file, return temp path.

    On any failure returns the original abs_path so the PDF still renders.
    The temp file is written to the system temp directory and will be cleaned
    up by the OS (or by the process exit).

    Args:
        abs_path: Absolute filesystem path to the original image
        photo: JobPhoto instance (for latitude, longitude, photo_timestamp)
        company_name: Company name text for the overlay

    Returns:
        Path to watermarked temp file, or original abs_path on failure
    """
    try:
        from PIL import Image

        # Build text strings
        timestamp_str = ""
        gps_str = ""

        if photo is not None:
            ts = getattr(photo, "photo_timestamp", None)
            if ts:
                try:
                    timestamp_str = ts.strftime("%Y-%m-%d %H:%M UTC")
                except Exception:
                    pass

            lat = getattr(photo, "latitude", None)
            lon = getattr(photo, "longitude", None)
            if lat is not None and lon is not None:
                gps_str = f"{lat:.5f}, {lon:.5f}"

        # Skip watermark if nothing to overlay
        if not company_name and not timestamp_str and not gps_str:
            return abs_path

        # Open image
        with Image.open(abs_path) as img:
            watermarked = apply_watermark(
                img,
                company_name=company_name,
                timestamp_str=timestamp_str,
                gps_str=gps_str,
            )

        # Write to temp file
        # Use deterministic name based on abs_path hash so repeated calls reuse the file
        path_hash = hashlib.md5(abs_path.encode()).hexdigest()[:12]
        ext = os.path.splitext(abs_path)[1] or ".jpg"
        tmp_name = f"proof_wm_{path_hash}{ext}"
        tmp_path = os.path.join(tempfile.gettempdir(), tmp_name)

        # Convert back to RGB for JPEG (RGBA can't be saved as JPEG)
        save_img = watermarked
        if ext.lower() in (".jpg", ".jpeg") and save_img.mode == "RGBA":
            save_img = save_img.convert("RGB")

        save_img.save(tmp_path, quality=92)
        return tmp_path

    except Exception as exc:
        logger.warning(
            "Watermark failed for %s: %s — using original",
            os.path.basename(abs_path), exc,
        )
        return abs_path
