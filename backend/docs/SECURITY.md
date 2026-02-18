# Security Documentation - Proof Platform

## Overview

This document describes the security architecture, implemented protections, and security best practices for the Proof Platform (CleanProof + MaintainProof).

**Last Updated:** 2026-02-19
**Security Audit:** PR2 (2026-02-13)
**Remediation:** PR3-PR6 (2026-02-13 to 2026-02-19)

---

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Authentication & Authorization](#authentication--authorization)
3. [Input Validation & Sanitization](#input-validation--sanitization)
4. [File Upload Security](#file-upload-security)
5. [Rate Limiting](#rate-limiting)
6. [Multi-Tenant Isolation](#multi-tenant-isolation)
7. [Security Testing](#security-testing)
8. [Deployment Security](#deployment-security)
9. [Incident Response](#incident-response)
10. [Security Checklist](#security-checklist)

---

## Security Architecture

### Layered Defense Strategy

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: Network (HTTPS, Firewall, DDoS protection)│
├─────────────────────────────────────────────────────┤
│ Layer 2: Authentication (JWT, Token expiration)    │
├─────────────────────────────────────────────────────┤
│ Layer 3: Authorization (RBAC, Multi-tenant RLS)    │
├─────────────────────────────────────────────────────┤
│ Layer 4: Input Validation (Size, Type, Format)     │
├─────────────────────────────────────────────────────┤
│ Layer 5: Data Sanitization (XSS, SQL injection)    │
├─────────────────────────────────────────────────────┤
│ Layer 6: Malware Detection (ClamAV virus scanning) │
├─────────────────────────────────────────────────────┤
│ Layer 7: Rate Limiting (Brute-force protection)    │
├─────────────────────────────────────────────────────┤
│ Layer 8: Monitoring & Logging (Audit trails)       │
└─────────────────────────────────────────────────────┘
```

### Security Principles

1. **Defense in Depth**: Multiple layers of protection
2. **Fail Secure**: Default to denying access
3. **Principle of Least Privilege**: Minimal permissions for each role
4. **Separation of Duties**: Different roles for different operations
5. **Audit Everything**: Comprehensive logging

---

## Authentication & Authorization

### Authentication Methods

#### 1. JWT Authentication (PR4 - Recommended)

**Endpoints:**
- `POST /api/auth/jwt/login/` - Email/password login
- `POST /api/auth/jwt/cleaner-login/` - PIN login for cleaners
- `POST /api/manager/auth/jwt/login/` - Manager login
- `POST /api/auth/jwt/refresh/` - Token refresh
- `POST /api/auth/jwt/logout/` - Logout (blacklist token)

**Configuration:**
```python
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(days=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=90),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
}
```

**Security Features:**
- ✅ Access tokens expire after 30 days
- ✅ Refresh tokens expire after 90 days
- ✅ Automatic token rotation on refresh
- ✅ Blacklisting on logout
- ✅ Secure HS256 algorithm

**Frontend Migration:** See `docs/security/JWT_MIGRATION_GUIDE.md`

#### 2. Legacy Token Authentication (Deprecated)

**Note:** Token authentication without expiration is deprecated but still supported for backward compatibility. Migrate to JWT as soon as possible.

**Migration Timeline:**
- **Phase 1 (Current):** Both JWT and legacy tokens accepted
- **Phase 2 (Q2 2026):** JWT only, legacy tokens disabled

### Role-Based Access Control (RBAC)

#### User Roles

| Role | Permissions |
|------|------------|
| **Owner** | Full company control, billing, user management, all CRUD operations |
| **Manager** | User management (excluding owner), location/job CRUD, analytics |
| **Staff** | Limited admin access, job monitoring |
| **Cleaner** | View assigned jobs, update job status, upload photos |

#### Permission Matrix

| Resource | Owner | Manager | Staff | Cleaner |
|----------|-------|---------|-------|---------|
| Create Users | ✅ | ✅ (not Owner) | ❌ | ❌ |
| Delete Users | ✅ | ✅ (not Owner) | ❌ | ❌ |
| Manage Billing | ✅ | ❌ | ❌ | ❌ |
| Create Jobs | ✅ | ✅ | ❌ | ❌ |
| View Jobs | ✅ | ✅ | ✅ | ✅ (assigned only) |
| Upload Photos | ✅ | ✅ | ✅ | ✅ (assigned jobs only) |
| View Analytics | ✅ | ✅ | ✅ | ❌ |

#### Implementation

**Permissions:** `apps/api/permissions.py`
```python
class IsManagerOrOwner(BasePermission):
    def has_permission(self, request, view):
        return request.user.role in [User.ROLE_OWNER, User.ROLE_MANAGER]

class IsOwnerOnly(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == User.ROLE_OWNER
```

**Usage:**
```python
class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsManagerOrOwner]

    def get_queryset(self):
        # CRITICAL: Filter by user's company
        return User.objects.filter(company=self.request.user.company)
```

---

## Input Validation & Sanitization

### File Upload Validation (PR3)

**Location:** `apps/api/validators.py`

#### 1. File Size Validation

```python
FileSizeValidator(max_mb=10)
```

- **Limit:** 10 MB per file
- **Prevents:** DoS via large uploads, storage abuse
- **Applied to:** All photo uploads

#### 2. File Type Validation

```python
ImageFileValidator()
```

- **Allowed MIME types:**
  - `image/jpeg`
  - `image/png`
  - `image/heic`
  - `image/heif`
  - `image/webp`
- **Method:** Magic byte detection (not just extension)
- **Prevents:** Executable uploads disguised as images

#### 3. File Extension Validation

```python
IMAGE_EXTENSION_VALIDATOR
```

- **Allowed:** `.jpg`, `.jpeg`, `.png`, `.heic`, `.heif`, `.webp`
- **Defense in depth:** Supplements MIME type check

### Coordinate Validation

```python
latitude = FloatField(
    validators=[MinValueValidator(-90.0), MaxValueValidator(90.0)]
)
longitude = FloatField(
    validators=[MinValueValidator(-180.0), MaxValueValidator(180.0)]
)
```

- **Prevents:** Invalid GPS coordinates, data corruption

### Text Sanitization

**HTML Sanitization (PR3):**
```python
def sanitize_html(text: str) -> str:
    return bleach.clean(text, tags=[], strip=True)
```

- **Strips:** All HTML tags
- **Prevents:** XSS attacks via user input
- **Applied to:** Notes, addresses, custom fields

### Bulk Operation Limits

```python
def validate_items(self, items):
    if len(items) > 100:
        raise ValidationError("Maximum 100 items allowed")
    return items
```

- **Limit:** 100 items per bulk request
- **Prevents:** DoS via massive bulk operations

### Date/Time Validation

```python
# No past dates for scheduled jobs
if scheduled_date and scheduled_date < timezone.now().date():
    raise ValidationError("Cannot schedule jobs in the past")

# End time must be after start time
if start_time and end_time and start_time >= end_time:
    raise ValidationError("End time must be after start time")
```

---

## File Upload Security

### ClamAV Virus Scanning (PR5)

**Location:** `apps/jobs/virus_scan.py`

#### Scanning Workflow

```
User uploads file
       ↓
File size/type validation (PR3)
       ↓
ClamAV virus scan (PR5)
       ↓
    Clean? ──NO──→ Reject upload (HTTP 400)
       ↓ YES
Save to storage
```

#### Configuration

**Fail-Open Strategy (Default):**
- If ClamAV daemon is unavailable, uploads are **allowed**
- Warning logged, upload proceeds
- Suitable for development, low-risk environments

**Fail-Closed Strategy (High Security):**
- If ClamAV daemon is unavailable, uploads are **blocked**
- Requires 100% ClamAV uptime
- Recommended for high-security production

**To enable fail-closed:** Edit `apps/jobs/virus_scan.py`
```python
def scan_file_for_viruses(file):
    try:
        import clamd
    except ImportError:
        raise Exception("Virus scanning unavailable. Upload rejected.")
    # ... rest of code ...
```

#### EICAR Test Pattern

Test virus scanning with EICAR (harmless test file):
```bash
echo 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > eicar.com
curl -X POST http://localhost:8000/api/jobs/1/photos/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -F "photo_type=before" \
  -F "file=@eicar.com"
```

**Expected response:**
```json
{
  "detail": "Malware detected: Eicar-Test-Signature. Upload rejected.",
  "virus_detected": "Eicar-Test-Signature"
}
```

#### Production Setup

See `docs/security/CLAMAV_SETUP_GUIDE.md` for:
- Installation instructions (macOS, Ubuntu)
- Daemon configuration
- Automatic virus database updates
- Performance tuning
- Monitoring

---

## Rate Limiting

**Library:** `django-ratelimit==4.1.0`

### Login Endpoints (PR5)

**Rate:** 5 attempts per minute per IP

**Protected endpoints:**
- `POST /api/auth/login/`
- `POST /api/auth/cleaner-login/`
- `POST /api/manager/auth/login/`

**Implementation:**
```python
@method_decorator(ratelimit(key='ip', rate='5/m', method='POST'), name='dispatch')
class LoginView(APIView):
    # ...
```

**Response when rate limited:**
```json
HTTP 429 Too Many Requests
{
  "detail": "Too many requests. Please try again later."
}
```

### Photo Upload Endpoints (PR5)

**Rate:** 10 uploads per minute per user

**Protected endpoints:**
- `POST /api/jobs/{id}/photos/`
- `POST /api/maintenance/jobs/{id}/photos/`

**Implementation:**
```python
@method_decorator(ratelimit(key='user', rate='10/m', method='POST'), name='dispatch')
class JobPhotosView(APIView):
    # ...
```

### Customization

To adjust rate limits:

1. Edit `apps/api/views_auth.py` or `apps/api/views_cleaner.py`
2. Change `rate='5/m'` to desired limit (e.g., `'10/m'`, `'100/h'`, `'1000/d'`)
3. Restart Django server

**Format:** `'<count>/<period>'`
- `s` = second
- `m` = minute
- `h` = hour
- `d` = day

---

## Multi-Tenant Isolation

### Data Isolation Strategy

**Every query MUST filter by company:**

```python
# ✅ CORRECT
queryset = Job.objects.filter(company=request.user.company)

# ❌ WRONG - Cross-company data leak!
queryset = Job.objects.all()
```

### Company Filtering Enforcement

**Viewset level:**
```python
class JobViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Job.objects.filter(company=self.request.user.company)
```

**Serializer level:**
```python
class JobSerializer(serializers.ModelSerializer):
    def create(self, validated_data):
        validated_data['company'] = self.context['request'].user.company
        return super().create(validated_data)
```

### IDOR Protection

**Insecure Direct Object Reference (IDOR) Prevention:**

1. **Always filter by company** before retrieving objects:
   ```python
   job = Job.objects.filter(
       id=job_id,
       company=request.user.company  # CRITICAL
   ).first()

   if not job:
       return Response(status=404)  # 404, not 403 (don't leak existence)
   ```

2. **Never trust user input** for company selection:
   ```python
   # ❌ WRONG - User can manipulate company field
   company_id = request.data.get('company')
   job = Job.objects.create(company_id=company_id, ...)

   # ✅ CORRECT - Always use authenticated user's company
   job = Job.objects.create(
       company=request.user.company,
       ...
   )
   ```

### Testing Cross-Company Isolation

**RBAC Tests:** `tests/security/test_rbac_isolation_pr6.py`

- 40+ tests covering all major endpoints
- Verifies users cannot access other companies' data
- Tests IDOR attack scenarios
- Validates role-based permissions

**Run tests:**
```bash
pytest tests/security/test_rbac_isolation_pr6.py -v
```

---

## Security Testing

### Automated Security Scans

#### 1. Bandit (Python Security Linter)

**Install:**
```bash
pip install bandit==1.8.0
```

**Run scan:**
```bash
cd backend
bandit -c .bandit -r apps/
```

**Configuration:** `.bandit`

**What it detects:**
- Hardcoded passwords
- SQL injection vulnerabilities
- Use of `eval()`, `exec()`
- Insecure cryptography
- Shell injection risks

#### 2. Safety (Dependency Vulnerability Scanner)

**Install:**
```bash
pip install safety==3.2.18
```

**Run scan:**
```bash
safety check --json
```

**What it detects:**
- Known CVEs in dependencies
- Outdated packages with security fixes
- Malicious packages

#### 3. RBAC & Isolation Tests (PR6)

**Run tests:**
```bash
pytest tests/security/ -v
```

**Coverage:**
- Cross-company data isolation (40+ tests)
- JWT authentication (30+ tests)
- Rate limiting (10+ tests)
- Input validation (20+ tests)
- Virus scanning (15+ tests)

### Manual Security Testing

#### Penetration Testing Checklist

- [ ] **Authentication Bypass**
  - Try accessing endpoints without token
  - Try accessing with expired token
  - Try accessing with other company's token

- [ ] **Authorization Bypass**
  - Try accessing higher-privilege endpoints with lower-privilege token
  - Try modifying other companies' resources

- [ ] **IDOR (Insecure Direct Object Reference)**
  - Try accessing resources by guessing IDs
  - Try sequential ID enumeration

- [ ] **SQL Injection**
  - Test query parameters with `' OR '1'='1`
  - Test with `1; DROP TABLE users--`

- [ ] **XSS (Cross-Site Scripting)**
  - Upload files with `<script>` tags in filename
  - Submit forms with JavaScript payloads

- [ ] **File Upload Attacks**
  - Upload executable disguised as image
  - Upload EICAR test file (should be blocked)
  - Upload oversized files (should be rejected at 10MB)

- [ ] **Rate Limit Bypass**
  - Attempt >5 logins per minute (should 429)
  - Attempt >10 uploads per minute (should 429)

---

## Deployment Security

### Environment Variables

**Never commit sensitive data to git.**

**Required secrets:**
```bash
# Django
SECRET_KEY=<random-50-char-string>
DEBUG=False

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# AWS (if using S3)
AWS_ACCESS_KEY_ID=<aws-key>
AWS_SECRET_ACCESS_KEY=<aws-secret>

# Email (if configured)
EMAIL_HOST_PASSWORD=<smtp-password>
```

**Generate secure SECRET_KEY:**
```python
from django.core.management.utils import get_random_secret_key
print(get_random_secret_key())
```

### HTTPS Enforcement

**settings.py (production):**
```python
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
```

### CORS Configuration

**Restrict to frontend domain only:**
```python
CORS_ALLOWED_ORIGINS = [
    "https://app.proofplatform.com",  # Production frontend
]

# Development only
if DEBUG:
    CORS_ALLOWED_ORIGINS += ["http://localhost:5173"]
```

### Database Security

1. **Use strong passwords** (20+ characters, random)
2. **Enable SSL connections** to database
3. **Restrict database access** to application servers only
4. **Regular backups** with encryption
5. **Rotate credentials** quarterly

### ClamAV in Production

See `docs/security/CLAMAV_SETUP_GUIDE.md` for full setup.

**Critical steps:**
1. Install ClamAV daemon
2. Configure auto-start on boot
3. Schedule daily virus database updates
4. Monitor daemon health
5. Test with EICAR pattern

**Cron job for daily updates:**
```bash
# /etc/crontab
0 2 * * * root /usr/bin/freshclam --quiet
```

---

## Incident Response

### Security Incident Workflow

```
Detect Incident
       ↓
Contain (disable affected accounts, block IPs)
       ↓
Investigate (review logs, identify scope)
       ↓
Eradicate (patch vulnerability, remove backdoors)
       ↓
Recover (restore from backup if needed)
       ↓
Post-Mortem (document, improve processes)
```

### Logging & Monitoring

**Critical events to log:**
- Failed login attempts (potential brute-force)
- Access denied (authorization failures)
- Virus detections (malware upload attempts)
- Rate limit violations (abuse attempts)
- Admin actions (user creation, deletion, permission changes)

**Log location:**
- Django logs: `logs/django.log`
- ClamAV logs: `/var/log/clamav/clamav.log`

**Monitoring alerts:**
- Multiple failed logins from same IP
- Virus detected in uploads
- Unexpected surge in API traffic
- Database connection failures

### Emergency Contacts

**Security Team:**
- Security Lead: [TBD]
- DevOps Lead: [TBD]

**Escalation Path:**
1. Developer on-call
2. Technical Lead
3. CTO

---

## Security Checklist

### Pre-Deployment

- [ ] All security tests passing (`pytest tests/security/ -v`)
- [ ] Bandit scan clean (no high/medium issues)
- [ ] Safety scan clean (no known vulnerabilities)
- [ ] ClamAV daemon installed and tested with EICAR
- [ ] Rate limiting configured (5/min login, 10/min uploads)
- [ ] JWT authentication enabled
- [ ] `DEBUG=False` in production
- [ ] `SECRET_KEY` randomized and secure
- [ ] HTTPS enforced (SECURE_SSL_REDIRECT=True)
- [ ] CORS restricted to frontend domain only
- [ ] Database password strong (20+ chars)
- [ ] All secrets in environment variables (not in code)
- [ ] Logs configured and monitored

### Post-Deployment

- [ ] HTTPS certificate valid
- [ ] ClamAV virus database up to date
- [ ] Login rate limiting working (test with 6 attempts)
- [ ] Upload rate limiting working (test with 11 uploads)
- [ ] Virus scanning blocking EICAR test file
- [ ] Cross-company isolation verified (manual test)
- [ ] JWT token expiration working (test after 30 days)
- [ ] Monitoring alerts configured
- [ ] Backup and restore tested

### Quarterly Security Review

- [ ] Review user permissions (remove inactive users)
- [ ] Rotate database credentials
- [ ] Update dependencies (`pip list --outdated`)
- [ ] Run full security test suite
- [ ] Review logs for anomalies
- [ ] Test incident response plan
- [ ] Update documentation

---

## References

### Internal Documentation

- `docs/security/JWT_MIGRATION_GUIDE.md` - Frontend JWT migration
- `docs/security/CLAMAV_SETUP_GUIDE.md` - ClamAV installation and config
- `docs/security/DEPLOYMENT_CHECKLIST.md` - Pre-deployment security checklist
- `tests/security/` - All security tests

### External Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Django Security](https://docs.djangoproject.com/en/stable/topics/security/)
- [DRF Security](https://www.django-rest-framework.org/topics/security/)
- [ClamAV Documentation](https://docs.clamav.net/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-19 | Initial security documentation (PR6) |
| 0.5 | 2026-02-18 | Virus scanning added (PR5) |
| 0.4 | 2026-02-17 | JWT authentication (PR4) |
| 0.3 | 2026-02-14 | Input validation (PR3) |
| 0.2 | 2026-02-13 | Security audit (PR2) |
| 0.1 | 2026-02-12 | Branch strategy (PR1) |

---

**Last reviewed:** 2026-02-19
**Next review due:** 2026-05-19 (quarterly)
