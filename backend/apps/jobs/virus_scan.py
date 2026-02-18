"""
Virus Scanning Utility (PR5: Virus Scanning + Rate Limiting)

Integrates with ClamAV daemon for malware detection in uploaded files.

ClamAV Setup:
- macOS: brew install clamav
- Ubuntu: apt-get install clamav clamav-daemon
- Start daemon: sudo clamd

Usage:
    from apps.jobs.virus_scan import scan_file_for_viruses

    is_clean, virus_name = scan_file_for_viruses(uploaded_file)
    if not is_clean:
        raise ValidationError(f"Malware detected: {virus_name}")
"""

import logging
from typing import Tuple

logger = logging.getLogger(__name__)


def scan_file_for_viruses(file) -> Tuple[bool, str]:
    """
    Scan uploaded file for viruses using ClamAV.

    Args:
        file: Django UploadedFile object

    Returns:
        tuple: (is_clean: bool, virus_name: str or None)
            - (True, None) if file is clean
            - (False, "Virus.Name") if virus detected
            - (True, None) if ClamAV unavailable (fail-open for dev)

    Example:
        >>> is_clean, virus = scan_file_for_viruses(uploaded_file)
        >>> if not is_clean:
        ...     raise ValidationError(f"Virus detected: {virus}")
    """
    try:
        import clamd
    except ImportError:
        # ClamAV not installed - log warning and allow upload (dev mode)
        logger.warning(
            "clamd library not installed. Virus scanning disabled. "
            "Install: pip install clamd"
        )
        return True, None

    try:
        # Connect to ClamAV daemon
        # Default: localhost:3310 (TCP) or /var/run/clamav/clamd.sock (Unix socket)
        cd = clamd.ClamdUnixSocket()  # Try Unix socket first
    except Exception:
        try:
            # Fallback to TCP connection
            cd = clamd.ClamdNetworkSocket()
        except Exception as e:
            # ClamAV daemon not running - log error and fail-open
            logger.error(
                f"ClamAV daemon not available: {e}. "
                "Virus scanning disabled. Start with: sudo clamd"
            )
            return True, None

    # Ping ClamAV to ensure it's responding
    try:
        cd.ping()
    except Exception as e:
        logger.error(f"ClamAV daemon not responding: {e}")
        return True, None

    # Read file content
    try:
        # Read all bytes from uploaded file
        file.seek(0)  # Reset pointer to start
        file_bytes = file.read()
        file.seek(0)  # Reset again for later use
    except Exception as e:
        logger.error(f"Failed to read file for scanning: {e}")
        return True, None  # Fail-open: allow upload if can't read

    # Scan file content
    try:
        scan_result = cd.instream(file_bytes)
    except Exception as e:
        logger.error(f"ClamAV scan failed: {e}")
        return True, None  # Fail-open: allow upload if scan fails

    # Parse scan result
    # Result format: {'stream': ('FOUND', 'Virus.Name')} or {'stream': ('OK', None)}
    result = scan_result.get('stream')
    if not result:
        logger.error(f"Unexpected ClamAV result format: {scan_result}")
        return True, None

    status, virus_name = result

    if status == 'FOUND':
        # Virus detected
        logger.warning(
            f"Malware detected in uploaded file: {virus_name}. "
            f"File size: {len(file_bytes)} bytes"
        )
        return False, virus_name
    elif status == 'OK':
        # File is clean
        logger.debug(f"File scanned successfully: clean ({len(file_bytes)} bytes)")
        return True, None
    else:
        # Unknown status
        logger.error(f"Unknown ClamAV status: {status}")
        return True, None  # Fail-open


def test_virus_scanning() -> bool:
    """
    Test virus scanning with EICAR test file.

    EICAR is a standard anti-virus test file that all AV software detects.
    It's not actually malware - just a test pattern.

    Returns:
        bool: True if ClamAV is working and detects EICAR, False otherwise

    Usage:
        >>> from apps.jobs.virus_scan import test_virus_scanning
        >>> if test_virus_scanning():
        ...     print("ClamAV is working!")
    """
    # EICAR test file content (standard AV test pattern)
    # This is NOT actual malware - it's a test string
    eicar = b'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'

    try:
        import clamd
        from io import BytesIO
    except ImportError:
        logger.error("clamd not installed - cannot test virus scanning")
        return False

    try:
        # Connect to ClamAV
        try:
            cd = clamd.ClamdUnixSocket()
        except Exception:
            cd = clamd.ClamdNetworkSocket()

        # Scan EICAR test file
        result = cd.instream(eicar)
        status, virus_name = result.get('stream', (None, None))

        if status == 'FOUND' and 'EICAR' in (virus_name or '').upper():
            logger.info(f"ClamAV test successful: EICAR detected as {virus_name}")
            return True
        else:
            logger.error(f"ClamAV test failed: Expected EICAR detection, got {status}")
            return False

    except Exception as e:
        logger.error(f"ClamAV test failed: {e}")
        return False


# Convenience function for Django management commands
def check_clamav_status():
    """
    Check ClamAV daemon status and version.

    Returns:
        dict: {
            'available': bool,
            'version': str or None,
            'ping': bool,
            'test_passed': bool
        }

    Usage:
        >>> from apps.jobs.virus_scan import check_clamav_status
        >>> status = check_clamav_status()
        >>> print(f"ClamAV available: {status['available']}")
    """
    status = {
        'available': False,
        'version': None,
        'ping': False,
        'test_passed': False
    }

    try:
        import clamd
    except ImportError:
        logger.error("clamd library not installed")
        return status

    try:
        # Try to connect
        try:
            cd = clamd.ClamdUnixSocket()
        except Exception:
            cd = clamd.ClamdNetworkSocket()

        status['available'] = True

        # Check ping
        try:
            cd.ping()
            status['ping'] = True
        except Exception as e:
            logger.error(f"ClamAV ping failed: {e}")

        # Get version
        try:
            version = cd.version()
            status['version'] = version
        except Exception as e:
            logger.error(f"Failed to get ClamAV version: {e}")

        # Run EICAR test
        status['test_passed'] = test_virus_scanning()

    except Exception as e:
        logger.error(f"ClamAV connection failed: {e}")

    return status
