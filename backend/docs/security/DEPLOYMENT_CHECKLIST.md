# Production Deployment Security Checklist

**Last Updated:** 2026-02-19
**Target Environment:** Production (AWS/DigitalOcean/etc.)

This checklist MUST be completed before deploying to production. Check off each item and document completion date.

---

## Pre-Deployment (Development)

### Code Quality & Testing

- [ ] All unit tests passing
  ```bash
  pytest -v
  ```
  **Completed:** __________ **By:** __________

- [ ] All security tests passing
  ```bash
  pytest tests/security/ -v
  ```
  **Completed:** __________ **By:** __________

- [ ] Bandit security scan clean (no HIGH or MEDIUM issues)
  ```bash
  bandit -c .bandit -r apps/
  ```
  **Completed:** __________ **By:** __________

- [ ] Safety dependency scan clean (no known CVEs)
  ```bash
  safety check
  ```
  **Completed:** __________ **By:** __________

- [ ] No hardcoded secrets in code (grep check)
  ```bash
  grep -r "password\|secret\|api_key" apps/ --exclude-dir=migrations
  ```
  **Completed:** __________ **By:** __________

---

## Environment Configuration

### Django Settings

- [ ] `DEBUG = False` in production settings
  **File:** `config/settings.py`
  **Completed:** __________ **By:** __________

- [ ] `SECRET_KEY` generated and stored in environment variable
  ```python
  from django.core.management.utils import get_random_secret_key
  print(get_random_secret_key())
  ```
  **Completed:** __________ **By:** __________

- [ ] `ALLOWED_HOSTS` configured with production domain
  ```python
  ALLOWED_HOSTS = ['app.proofplatform.com', 'api.proofplatform.com']
  ```
  **Completed:** __________ **By:** __________

- [ ] HTTPS enforcement enabled
  ```python
  SECURE_SSL_REDIRECT = True
  SESSION_COOKIE_SECURE = True
  CSRF_COOKIE_SECURE = True
  SECURE_HSTS_SECONDS = 31536000
  ```
  **Completed:** __________ **By:** __________

- [ ] CORS restricted to frontend domain only
  ```python
  CORS_ALLOWED_ORIGINS = ['https://app.proofplatform.com']
  ```
  **Completed:** __________ **By:** __________

### Environment Variables

- [ ] All secrets in `.env` file (NOT in code)
  ```bash
  # Required variables:
  SECRET_KEY=
  DATABASE_URL=
  AWS_ACCESS_KEY_ID=
  AWS_SECRET_ACCESS_KEY=
  ```
  **Completed:** __________ **By:** __________

- [ ] `.env` file added to `.gitignore`
  **Completed:** __________ **By:** __________

- [ ] Environment variables set in production server/container
  **Completed:** __________ **By:** __________

---

## Database Security

- [ ] Production database created
  **Database:** __________ **Provider:** __________
  **Completed:** __________ **By:** __________

- [ ] Strong database password (20+ characters, random)
  ```bash
  openssl rand -base64 32
  ```
  **Completed:** __________ **By:** __________

- [ ] Database user has minimal permissions (no DROP DATABASE)
  **Completed:** __________ **By:** __________

- [ ] Database accessible only from application servers (firewall rules)
  **IP Whitelist:** __________
  **Completed:** __________ **By:** __________

- [ ] SSL/TLS connection to database enabled
  **Completed:** __________ **By:** __________

- [ ] Database backups configured (daily minimum)
  **Backup schedule:** __________
  **Retention:** __________
  **Completed:** __________ **By:** __________

- [ ] Backup restoration tested successfully
  **Test date:** __________
  **Completed:** __________ **By:** __________

---

## Authentication & Authorization

### JWT Configuration (PR4)

- [ ] JWT secret key different from Django SECRET_KEY
  **Completed:** __________ **By:** __________

- [ ] JWT token lifetimes configured
  ```python
  ACCESS_TOKEN_LIFETIME = timedelta(days=30)
  REFRESH_TOKEN_LIFETIME = timedelta(days=90)
  ```
  **Completed:** __________ **By:** __________

- [ ] Token blacklist enabled
  ```python
  ROTATE_REFRESH_TOKENS = True
  BLACKLIST_AFTER_ROTATION = True
  ```
  **Completed:** __________ **By:** __________

- [ ] Frontend migrated to JWT endpoints
  **Migration guide:** `docs/security/JWT_MIGRATION_GUIDE.md`
  **Completed:** __________ **By:** __________

### User Management

- [ ] Default admin user deleted (if created during development)
  **Completed:** __________ **By:** __________

- [ ] All production users have strong passwords (12+ chars)
  **Completed:** __________ **By:** __________

- [ ] User roles correctly assigned (Owner, Manager, Staff, Cleaner)
  **Completed:** __________ **By:** __________

---

## File Upload Security

### Input Validation (PR3)

- [ ] File size limit enforced (10 MB)
  **Test:** Upload 11 MB file → should reject
  **Completed:** __________ **By:** __________

- [ ] File type validation active (images only)
  **Test:** Upload .exe file → should reject
  **Completed:** __________ **By:** __________

- [ ] MIME type checking via magic bytes (not just extension)
  **Completed:** __________ **By:** __________

### ClamAV Virus Scanning (PR5)

- [ ] ClamAV daemon installed on production server
  ```bash
  # Ubuntu/Debian
  sudo apt-get install clamav clamav-daemon

  # Check status
  sudo systemctl status clamav-daemon
  ```
  **Completed:** __________ **By:** __________

- [ ] ClamAV virus database updated
  ```bash
  sudo freshclam
  ```
  **Last updated:** __________
  **Completed:** __________ **By:** __________

- [ ] ClamAV daemon configured to start on boot
  ```bash
  sudo systemctl enable clamav-daemon
  ```
  **Completed:** __________ **By:** __________

- [ ] Daily virus database updates scheduled (cron)
  ```bash
  # Add to /etc/crontab
  0 2 * * * root /usr/bin/freshclam --quiet
  ```
  **Completed:** __________ **By:** __________

- [ ] ClamAV tested with EICAR pattern
  ```bash
  echo 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > eicar.com
  curl -X POST https://api.proofplatform.com/api/jobs/1/photos/ \
    -H "Authorization: Token YOUR_TOKEN" \
    -F "photo_type=before" \
    -F "file=@eicar.com"
  # Expected: HTTP 400 "Malware detected"
  ```
  **Test result:** __________
  **Completed:** __________ **By:** __________

- [ ] Fail-open vs fail-closed strategy decided
  - **Fail-open (default):** Uploads allowed if ClamAV down
  - **Fail-closed (strict):** Uploads blocked if ClamAV down

  **Choice:** __________
  **Completed:** __________ **By:** __________

- [ ] ClamAV monitoring/alerts configured
  **Alert method:** __________
  **Completed:** __________ **By:** __________

---

## Rate Limiting (PR5)

- [ ] Login rate limiting verified (5 attempts/min per IP)
  **Test:** Make 6 login attempts in 1 minute → 6th should return HTTP 429
  **Test result:** __________
  **Completed:** __________ **By:** __________

- [ ] Photo upload rate limiting verified (10 uploads/min per user)
  **Test:** Upload 11 photos in 1 minute → 11th should return HTTP 429
  **Test result:** __________
  **Completed:** __________ **By:** __________

- [ ] Rate limit configuration appropriate for production traffic
  **Expected traffic:** __________ requests/min
  **Current limits:** Login 5/min, Upload 10/min
  **Adjustment needed:** __________
  **Completed:** __________ **By:** __________

---

## HTTPS & SSL/TLS

- [ ] SSL certificate obtained (Let's Encrypt, Cloudflare, etc.)
  **Provider:** __________
  **Expiration:** __________
  **Completed:** __________ **By:** __________

- [ ] SSL certificate installed on web server
  **Completed:** __________ **By:** __________

- [ ] HTTPS enforced (HTTP redirects to HTTPS)
  **Test:** http://app.proofplatform.com → https://app.proofplatform.com
  **Completed:** __________ **By:** __________

- [ ] SSL grade A or higher (test at ssllabs.com)
  **Test URL:** https://www.ssllabs.com/ssltest/
  **Grade:** __________
  **Completed:** __________ **By:** __________

- [ ] HSTS header enabled
  ```python
  SECURE_HSTS_SECONDS = 31536000
  SECURE_HSTS_INCLUDE_SUBDOMAINS = True
  ```
  **Completed:** __________ **By:** __________

---

## Cross-Company Data Isolation

### Multi-Tenant Security (PR6)

- [ ] RBAC isolation tests passing (40+ tests)
  ```bash
  pytest tests/security/test_rbac_isolation_pr6.py -v
  ```
  **Completed:** __________ **By:** __________

- [ ] Manual cross-company isolation test
  **Test:**
  1. Create two test companies (Company A, Company B)
  2. Login as Manager A
  3. Try to access Company B's jobs/locations/users via API
  4. Verify all requests return 404 (not 403)

  **Test result:** __________
  **Completed:** __________ **By:** __________

- [ ] IDOR protection verified
  **Test:** Sequential ID enumeration blocked
  **Completed:** __________ **By:** __________

---

## Logging & Monitoring

- [ ] Django logging configured
  ```python
  LOGGING = {
      'version': 1,
      'handlers': {
          'file': {
              'class': 'logging.FileHandler',
              'filename': '/var/log/django/app.log',
          },
      },
      'loggers': {
          'django': {'handlers': ['file'], 'level': 'INFO'},
      },
  }
  ```
  **Completed:** __________ **By:** __________

- [ ] Error tracking service configured (Sentry, Rollbar, etc.)
  **Service:** __________
  **Completed:** __________ **By:** __________

- [ ] Security event logging active
  - Failed login attempts
  - Access denied (403)
  - Virus detections
  - Rate limit violations

  **Completed:** __________ **By:** __________

- [ ] Monitoring alerts configured
  - Multiple failed logins (potential brute-force)
  - Virus detected
  - High error rate
  - Database connection failures

  **Alert destination:** __________
  **Completed:** __________ **By:** __________

- [ ] Log rotation configured (prevent disk full)
  ```bash
  # /etc/logrotate.d/django
  /var/log/django/*.log {
      daily
      rotate 30
      compress
      delaycompress
      missingok
  }
  ```
  **Completed:** __________ **By:** __________

---

## Application Server

- [ ] Gunicorn (or uWSGI) installed
  ```bash
  pip install gunicorn
  ```
  **Completed:** __________ **By:** __________

- [ ] Gunicorn configured with appropriate workers
  ```bash
  # Recommended: (2 * CPU cores) + 1
  gunicorn config.wsgi:application --workers 5 --bind 0.0.0.0:8000
  ```
  **Workers:** __________
  **Completed:** __________ **By:** __________

- [ ] Gunicorn service configured to start on boot
  ```bash
  # /etc/systemd/system/gunicorn.service
  sudo systemctl enable gunicorn
  ```
  **Completed:** __________ **By:** __________

- [ ] Reverse proxy configured (Nginx, Caddy, etc.)
  **Proxy:** __________
  **Completed:** __________ **By:** __________

---

## Static & Media Files

- [ ] Static files collected
  ```bash
  python manage.py collectstatic --noinput
  ```
  **Completed:** __________ **By:** __________

- [ ] Static files served via CDN or Nginx (not Django)
  **Method:** __________
  **Completed:** __________ **By:** __________

- [ ] Media files storage configured (S3, DigitalOcean Spaces, etc.)
  **Provider:** __________
  **Bucket:** __________
  **Completed:** __________ **By:** __________

- [ ] Media files access restricted (signed URLs if sensitive)
  **Completed:** __________ **By:** __________

---

## Firewall & Network Security

- [ ] Firewall configured (UFW, AWS Security Groups, etc.)
  **Allowed ports:**
  - 22 (SSH, restricted IPs only)
  - 80 (HTTP → HTTPS redirect)
  - 443 (HTTPS)

  **Blocked:** All other ports
  **Completed:** __________ **By:** __________

- [ ] SSH access restricted to specific IPs
  **Allowed IPs:** __________
  **Completed:** __________ **By:** __________

- [ ] Database port NOT exposed to public internet
  **Completed:** __________ **By:** __________

- [ ] DDoS protection enabled (Cloudflare, AWS Shield, etc.)
  **Service:** __________
  **Completed:** __________ **By:** __________

---

## Dependency Management

- [ ] All dependencies up to date
  ```bash
  pip list --outdated
  ```
  **Completed:** __________ **By:** __________

- [ ] No known vulnerabilities in dependencies
  ```bash
  safety check
  ```
  **Completed:** __________ **By:** __________

- [ ] `requirements.txt` pinned to exact versions (not `>=`)
  **Completed:** __________ **By:** __________

---

## Final Pre-Launch Tests

### Functionality Tests

- [ ] User registration flow works
  **Completed:** __________ **By:** __________

- [ ] User login works (email + password, PIN)
  **Completed:** __________ **By:** __________

- [ ] JWT token refresh works
  **Completed:** __________ **By:** __________

- [ ] Photo upload works (clean file)
  **Completed:** __________ **By:** __________

- [ ] Photo upload blocks virus (EICAR test)
  **Completed:** __________ **By:** __________

- [ ] Job creation/update/delete works
  **Completed:** __________ **By:** __________

- [ ] Multi-tenant isolation verified (manual test)
  **Completed:** __________ **By:** __________

### Security Tests

- [ ] Unauthenticated access blocked
  **Test:** Access `/api/jobs/` without token → HTTP 401/403
  **Completed:** __________ **By:** __________

- [ ] Cross-company access blocked
  **Test:** User A cannot access User B's data
  **Completed:** __________ **By:** __________

- [ ] SQL injection attempts blocked
  **Test:** `/api/jobs/?id=1' OR '1'='1` → no error, no data leak
  **Completed:** __________ **By:** __________

- [ ] XSS attempts sanitized
  **Test:** Submit `<script>alert(1)</script>` in notes → stripped
  **Completed:** __________ **By:** __________

- [ ] File upload size limit works
  **Test:** Upload 11 MB file → HTTP 400
  **Completed:** __________ **By:** __________

- [ ] Rate limiting works (login)
  **Test:** 6 login attempts → HTTP 429
  **Completed:** __________ **By:** __________

- [ ] Rate limiting works (uploads)
  **Test:** 11 photo uploads → HTTP 429
  **Completed:** __________ **By:** __________

---

## Post-Deployment Verification

### Immediate (Day 1)

- [ ] Application accessible via HTTPS
  **URL:** https://app.proofplatform.com
  **Completed:** __________ **By:** __________

- [ ] No 500 errors in logs
  **Completed:** __________ **By:** __________

- [ ] ClamAV daemon running
  ```bash
  sudo systemctl status clamav-daemon
  ```
  **Completed:** __________ **By:** __________

- [ ] Database connections working
  **Completed:** __________ **By:** __________

- [ ] Error monitoring active (Sentry receiving events)
  **Completed:** __________ **By:** __________

### Week 1

- [ ] Review security logs for anomalies
  **Findings:** __________
  **Completed:** __________ **By:** __________

- [ ] Verify backups are running
  **Last backup:** __________
  **Completed:** __________ **By:** __________

- [ ] Test backup restoration
  **Completed:** __________ **By:** __________

- [ ] Monitor performance metrics (response times, errors)
  **Completed:** __________ **By:** __________

### Month 1

- [ ] Security review meeting
  **Date:** __________
  **Attendees:** __________

- [ ] Review and update this checklist based on lessons learned
  **Completed:** __________ **By:** __________

---

## Incident Response Plan

- [ ] Incident response team identified
  **Primary:** __________
  **Secondary:** __________
  **Escalation:** __________

- [ ] Emergency contacts documented
  **Completed:** __________ **By:** __________

- [ ] Incident response playbook created
  **Location:** __________
  **Completed:** __________ **By:** __________

- [ ] Database rollback procedure documented
  **Completed:** __________ **By:** __________

---

## Sign-Off

**Security Review Completed By:**

- **Name:** __________
- **Role:** __________
- **Date:** __________
- **Signature:** __________

**Deployment Approved By:**

- **Name:** __________
- **Role:** __________
- **Date:** __________
- **Signature:** __________

---

## References

- `docs/SECURITY.md` - Comprehensive security documentation
- `docs/security/JWT_MIGRATION_GUIDE.md` - JWT implementation guide
- `docs/security/CLAMAV_SETUP_GUIDE.md` - ClamAV installation guide
- `tests/security/` - All security tests

---

**Production Deployment Date:** __________

**Next Security Review:** __________ (Quarterly recommended)
