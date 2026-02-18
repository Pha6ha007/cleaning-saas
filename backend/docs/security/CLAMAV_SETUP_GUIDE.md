# ClamAV Setup Guide (PR5: Virus Scanning)

## Overview

ClamAV is an open-source antivirus engine used to detect malware, viruses, trojans, and other malicious threats in uploaded files.

The Proof Platform uses ClamAV to scan all uploaded photos before processing.

## Installation

### macOS

```bash
# Install ClamAV via Homebrew
brew install clamav

# Create configuration files
cd /opt/homebrew/etc/clamav
sudo cp freshclam.conf.sample freshclam.conf
sudo cp clamd.conf.sample clamd.conf

# Edit freshclam.conf - remove "Example" line
sudo sed -i '' '/^Example$/d' /opt/homebrew/etc/clamav/freshclam.conf

# Edit clamd.conf - remove "Example" line
sudo sed -i '' '/^Example$/d' /opt/homebrew/etc/clamav/clamd.conf

# Update virus database
sudo freshclam

# Start ClamAV daemon
sudo /opt/homebrew/sbin/clamd
```

### Ubuntu/Debian

```bash
# Install ClamAV
sudo apt-get update
sudo apt-get install clamav clamav-daemon

# Stop daemon before updating database
sudo systemctl stop clamav-freshclam
sudo systemctl stop clamav-daemon

# Update virus database
sudo freshclam

# Start services
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon
```

### Python Library

```bash
# Install Python ClamAV client
pip install clamd==1.0.2
```

## Configuration

### Check ClamAV is Running

```bash
# Check status
sudo systemctl status clamav-daemon  # Ubuntu
ps aux | grep clamd                  # macOS

# Test connection
telnet localhost 3310
# Should connect successfully
```

### Test Virus Scanning

```python
# Django shell
python manage.py shell

from apps.jobs.virus_scan import test_virus_scanning, check_clamav_status

# Check ClamAV status
status = check_clamav_status()
print(status)
# {'available': True, 'version': 'ClamAV 0.103.0', 'ping': True, 'test_passed': True}

# Test EICAR detection
test_virus_scanning()
# True (EICAR detected successfully)
```

## Usage

### In Code

```python
from apps.jobs.virus_scan import scan_file_for_viruses

# Scan uploaded file
is_clean, virus_name = scan_file_for_viruses(uploaded_file)

if not is_clean:
    raise ValidationError(f"Malware detected: {virus_name}")
```

### Testing with EICAR

EICAR is a standard test file that all antivirus software detects. It's NOT actual malware - just a test pattern.

```bash
# Create EICAR test file
echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > eicar.com

# Try to upload via API - should be rejected
curl -X POST http://localhost:8000/api/jobs/1/photos/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -F "photo_type=before" \
  -F "file=@eicar.com"

# Response:
# {
#   "detail": "Malware detected: Eicar-Test-Signature. Upload rejected.",
#   "virus_detected": "Eicar-Test-Signature"
# }
```

## Production Setup

### Automatic Virus Database Updates

```bash
# Edit crontab
sudo crontab -e

# Add daily update at 2 AM
0 2 * * * /usr/bin/freshclam --quiet
```

### Monitoring

```bash
# Check daemon logs
tail -f /var/log/clamav/clamav.log

# Check database version
sigtool --info /var/lib/clamav/main.cvd
```

### Performance Tuning

ClamAV can be resource-intensive. For production:

**Option 1: Optimize ClamAV**

Edit `/etc/clamav/clamd.conf`:

```conf
# Reduce memory usage
MaxScanSize 100M          # Max file size to scan
MaxFileSize 50M           # Max file size in archive
MaxRecursion 10           # Archive depth
MaxFiles 1000             # Max files in archive

# Performance
MaxThreads 4              # Parallel scanning threads
```

**Option 2: External Scanning Service**

For high-traffic production, consider cloud-based scanning:

- **VirusTotal API** (free tier: 4 requests/min)
- **MetaDefender Cloud** (free tier: 5000 scans/day)
- **AWS GuardDuty** (malware protection for S3)

```python
# Example: VirusTotal integration
import requests

def scan_with_virustotal(file):
    url = 'https://www.virustotal.com/vtapi/v2/file/scan'
    params = {'apikey': 'YOUR_API_KEY'}
    files = {'file': file}

    response = requests.post(url, files=files, params=params)
    return response.json()
```

## Fail-Open vs Fail-Closed

The current implementation uses **fail-open** mode:

- **If ClamAV is unavailable:** File uploads are ALLOWED (with warning logged)
- **If ClamAV is working:** Files are scanned, malware is BLOCKED

**Why fail-open?**

1. Development environments may not have ClamAV installed
2. Prevents service outages if ClamAV daemon crashes
3. Virus scanning is defense-in-depth, not the only security layer

**For stricter security (fail-closed):**

Edit `apps/jobs/virus_scan.py`:

```python
def scan_file_for_viruses(file) -> Tuple[bool, str]:
    try:
        import clamd
    except ImportError:
        # FAIL-CLOSED: Reject uploads if ClamAV not installed
        raise Exception("Virus scanning unavailable. Upload rejected.")

    try:
        cd = clamd.ClamdUnixSocket()
    except Exception:
        # FAIL-CLOSED: Reject uploads if daemon not running
        raise Exception("ClamAV daemon unavailable. Upload rejected.")

    # ... rest of scanning logic ...
```

## Troubleshooting

### Error: "ClamAV daemon not available"

```bash
# Check if daemon is running
ps aux | grep clamd

# Start daemon
sudo clamd  # macOS
sudo systemctl start clamav-daemon  # Ubuntu

# Check logs
tail -f /var/log/clamav/clamav.log
```

### Error: "clamd library not installed"

```bash
pip install clamd==1.0.2
```

### Error: "Database outdated"

```bash
# Update virus database
sudo freshclam

# Restart daemon
sudo systemctl restart clamav-daemon
```

### Error: "Connection refused"

Check that ClamAV is listening on correct socket/port:

```bash
# Check configuration
grep "^LocalSocket\|^TCPSocket\|^TCPAddr" /etc/clamav/clamd.conf

# Default socket: /var/run/clamav/clamd.sock (Unix socket)
# Default TCP: localhost:3310 (TCP socket)
```

If using custom socket, update `virus_scan.py`:

```python
# Custom Unix socket
cd = clamd.ClamdUnixSocket('/custom/path/clamd.sock')

# Custom TCP port
cd = clamd.ClamdNetworkSocket('localhost', 3310)
```

## Security Best Practices

1. **Keep Database Updated**
   - Run `freshclam` daily
   - Monitor database age

2. **Monitor Scan Results**
   - Log all virus detections
   - Alert on unusual patterns
   - Track false positives

3. **Defense in Depth**
   - Virus scanning is ONE layer
   - Also use: file type validation, size limits, user permissions

4. **Test Regularly**
   - Use EICAR to verify scanning works
   - Run automated tests in CI/CD
   - Simulate daemon failures

5. **Rate Limiting**
   - Limit upload frequency (PR5: 10/min)
   - Prevent DoS via large file uploads

## Performance Metrics

Typical scanning times (MacBook Pro M1):

| File Size | Scan Time |
|-----------|-----------|
| 1 KB      | 2 ms      |
| 100 KB    | 5 ms      |
| 1 MB      | 15 ms     |
| 10 MB     | 120 ms    |

For high-traffic production:
- Consider async scanning (scan after upload, quarantine if virus found)
- Use Redis queue for scanning jobs
- Implement caching for known-clean file hashes

## Support

For issues or questions:
- **ClamAV Documentation:** https://docs.clamav.net/
- **Python clamd:** https://github.com/graingert/python-clamd
- **Proof Platform:** Check `apps/jobs/virus_scan.py`
