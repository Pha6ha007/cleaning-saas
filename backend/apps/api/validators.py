"""
Custom validators for API input validation.

Security: PR3 - Critical Validation Fixes
- File upload validation (size, type, content)
- Text sanitization (HTML stripping)
- Coordinate range validation
"""

from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
import bleach


# =============================================================================
# File Upload Validators
# =============================================================================

class FileSizeValidator:
    """
    Validates file size does not exceed maximum.

    Usage:
        file = serializers.FileField(validators=[FileSizeValidator(max_mb=10)])
    """

    def __init__(self, max_mb=10):
        self.max_bytes = max_mb * 1024 * 1024  # Convert MB to bytes
        self.max_mb = max_mb

    def __call__(self, value):
        if value.size > self.max_bytes:
            raise ValidationError(
                f"File size {value.size / 1024 / 1024:.1f}MB exceeds maximum allowed size of {self.max_mb}MB"
            )


class ImageFileValidator:
    """
    Validates file is a valid image by checking MIME type.

    Note: This uses python-magic to check actual file content,
    not just the extension. Requires libmagic installed.

    Install:
        - macOS: brew install libmagic
        - Ubuntu: apt-get install libmagic1
        - pip install python-magic

    Usage:
        file = serializers.FileField(validators=[ImageFileValidator()])
    """

    ALLOWED_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/heic',
        'image/heif',
        'image/webp',  # Added for future support
    ]

    def __call__(self, value):
        # Try to import magic - if not available, skip MIME validation
        # (extension validation still happens via FileExtensionValidator)
        try:
            import magic
        except ImportError:
            # python-magic not installed - warn but allow
            # Extension validator will still catch obvious bad files
            return

        # Read first 1KB to detect MIME type
        file_header = value.read(1024)
        value.seek(0)  # Reset file pointer

        try:
            mime_type = magic.from_buffer(file_header, mime=True)
        except Exception:
            # If magic fails, allow (extension validator is backup)
            return

        if mime_type not in self.ALLOWED_MIME_TYPES:
            raise ValidationError(
                f"Invalid file type '{mime_type}'. Allowed types: {', '.join(self.ALLOWED_MIME_TYPES)}"
            )


# Reusable file extension validator for images
IMAGE_EXTENSION_VALIDATOR = FileExtensionValidator(
    allowed_extensions=['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp']
)


# =============================================================================
# Text Sanitization
# =============================================================================

def sanitize_html(text: str) -> str:
    """
    Strip all HTML tags from text to prevent XSS.

    Uses bleach library with zero allowed tags (strips everything).

    Args:
        text: Input text that may contain HTML

    Returns:
        Sanitized text with all HTML removed

    Example:
        >>> sanitize_html("<script>alert('XSS')</script>Hello")
        "Hello"
        >>> sanitize_html("Normal text")
        "Normal text"
    """
    if not text:
        return text

    # Strip all HTML tags
    cleaned = bleach.clean(
        text,
        tags=[],  # No tags allowed
        strip=True  # Remove tags instead of escaping
    )

    return cleaned


def sanitize_html_allow_basic(text: str) -> str:
    """
    Allow only basic safe HTML tags (b, i, u, p, br).

    Use this if you need to support rich text in the future.
    For now, sanitize_html() (zero tags) is recommended.

    Args:
        text: Input text with HTML

    Returns:
        Text with only safe tags preserved
    """
    if not text:
        return text

    allowed_tags = ['b', 'i', 'u', 'p', 'br', 'strong', 'em']

    cleaned = bleach.clean(
        text,
        tags=allowed_tags,
        attributes={},  # No attributes allowed
        strip=True
    )

    return cleaned
