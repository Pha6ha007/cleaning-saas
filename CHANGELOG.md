# Changelog

All notable changes to the Proof Platform (CleanProof + MaintainProof) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Coming Soon
- Frontend migration to JWT authentication
- Multi-factor authentication (MFA)

---

## [0.10.0] - 2026-03-22 - Production Hardening 🛡️

### Added — Email Service
- **Centralized email module** (`apps.emails`) with HTML + plaintext templates
- **Branded HTML templates** with consistent header/footer, responsive design
  - `verification.html` — email verification on signup
  - `password_reset.html` — password reset flow
  - `trial_expiry_reminder.html` — 3-day, 1-day, and expired trial reminders
  - `payment_success.html` — payment confirmation with plan details
  - `payment_failed.html` — failed payment with update CTA
  - `subscription_canceled.html` — cancellation with resubscribe CTA
- **Celery tasks** for async email delivery
  - `send_email_async` — retries 3x on SMTP failures
  - `check_trial_expiry_reminders` — daily task at 08:00 Dubai, sends 3-day/1-day/expired reminders
  - `send_billing_notification` — queued from Paddle webhook handlers, retries 2x
- **Paddle webhook email hooks** — payment success/failure/cancellation emails triggered automatically
- **Migrated** signup verification and password reset emails from plaintext to HTML templates

### Added — Rate Limiting (Enhanced)
- **Auth-specific DRF throttles** to prevent brute force:
  - `auth_login`: 5 requests/minute per IP
  - `auth_signup`: 3 requests/minute per IP
  - `auth_password_reset`: 3 requests/minute per IP
- **Nginx rate limiting config** (`deploy/nginx-rate-limiting.conf`):
  - API general: 30 req/s per IP (burst 50)
  - Auth endpoints: 5 req/min per IP
  - Signup: 3 req/min per IP
  - Paddle webhooks: 20 req/s per IP (burst 30)
  - File uploads: 10 req/s per IP
  - JSON 429 error responses

### Added — Backup & Recovery
- **PostgreSQL backup script** (`deploy/backup-postgres.sh`):
  - `pg_dump` + gzip compression
  - Integrity verification after backup
  - Optional S3/Spaces offsite upload
  - 30-day local retention with automatic cleanup
  - Cron-ready: `0 3 * * * ./backup-postgres.sh`
- **Restore script** (`deploy/restore-postgres.sh`):
  - Interactive confirmation before restore
  - Post-restore checklist (migrate, verify, restart)

### Added — Structured Logging
- **JSON log formatter** (`config/logging_json.py`):
  - Zero external dependencies (stdlib only)
  - Fields: `ts`, `level`, `logger`, `msg`, `module`, `line`, exception traceback
  - Supports extra fields via `logger.info("msg", extra={...})`
- **Auto-switching**: text in development, JSON in production (`LOG_FORMAT` env var)
- **Per-app loggers**: `apps.emails`, `apps.api`, `apps.maintenance`
- Compatible with journalctl, jq, CloudWatch, Datadog, Grafana Loki

### Changed
- `views_auth.py` — signup verification and password reset now send branded HTML emails
- `views_paddle.py` — webhook handlers now queue billing notification emails
- `throttles.py` — added `AuthLoginThrottle`, `AuthSignupThrottle`, `AuthPasswordResetThrottle`
- `settings.py` — added `apps.emails` to INSTALLED_APPS, email template directory, auth throttle rates, structured logging config
- `setup_periodic_tasks.py` — added `check-trial-expiry-reminders-daily` Celery Beat task

### Documentation
- `deploy/DEPLOYMENT_EMAIL_RATELIMIT_BACKUP_LOGGING.md` — full deployment guide for all 4 systems
- `deploy/nginx-rate-limiting.conf` — production-ready nginx config with comments

---

## [0.9.0] - 2026-02-19 - Foundation Plan Complete 🎉

### Added - Security Hardening (PR3-PR6)

#### PR3: Critical Validation Fixes (2026-02-14)
- **File Upload Validation**
  - File size limit enforced (10 MB maximum)
  - MIME type validation using magic bytes (not just extensions)
  - File extension whitelist (.jpg, .png, .heic, .webp)
  - Custom validators: `FileSizeValidator`, `ImageFileValidator`
- **Input Validation**
  - Coordinate validation (latitude: -90 to 90, longitude: -180 to 180)
  - Bulk operation limits (maximum 100 items per request)
  - Date/time validation (no past scheduled dates, end > start time)
  - Text length limits (max 2000 characters on notes fields)
- **HTML Sanitization**
  - `sanitize_html()` function using bleach library
  - Applied to notes, addresses, and custom text fields
  - Prevents XSS attacks via user input
- **Dependencies**
  - `bleach==6.2.0` for HTML sanitization
  - `python-magic==0.4.27` for MIME type detection
- **Tests**
  - 20+ validation tests in `tests/security/test_validation_pr3.py`

#### PR4: Token Security (2026-02-17)
- **JWT Authentication**
  - Access tokens expire after 30 days
  - Refresh tokens expire after 90 days
  - Automatic token rotation on refresh
  - Refresh token blacklisting on logout
  - JWT endpoints: `/api/auth/jwt/login/`, `/api/auth/jwt/refresh/`, `/api/auth/jwt/logout/`
- **Authentication Views**
  - `JWTLoginView` for email/password login
  - `JWTCleanerPinLoginView` for PIN-based cleaner login
  - `JWTManagerLoginView` for manager login
  - `JWTRefreshView` for token refresh
  - `JWTLogoutView` for secure logout with blacklisting
- **Configuration**
  - `SIMPLE_JWT` settings in `config/settings.py`
  - HS256 algorithm for token signing
  - Token rotation enabled by default
- **Dependencies**
  - `djangorestframework-simplejwt==5.4.0`
- **Documentation**
  - Frontend JWT migration guide with TypeScript examples
  - Auto-refresh interceptor implementation for Axios
  - Token storage best practices
- **Tests**
  - 30+ JWT tests in `tests/security/test_jwt_pr4.py`
  - Tests for login, refresh, rotation, blacklisting, expiration
- **Migration Path**
  - Phase 1 (current): Both JWT and legacy tokens supported
  - Phase 2 (Q2 2026): JWT only, legacy tokens disabled

#### PR5: Virus Scanning + Rate Limiting (2026-02-18)
- **ClamAV Virus Scanning**
  - Integration with ClamAV daemon for malware detection
  - `scan_file_for_viruses()` function in `apps/jobs/virus_scan.py`
  - EICAR test pattern detection for deployment verification
  - `check_clamav_status()` for daemon health monitoring
  - Fail-open strategy (allows uploads if ClamAV unavailable)
  - Virus scanning applied to all photo uploads (cleaning + maintenance)
- **Rate Limiting**
  - Login endpoints: 5 attempts per minute per IP
  - Photo upload endpoints: 10 uploads per minute per user
  - Returns HTTP 429 when rate limit exceeded
  - Applied to: `LoginView`, `CleanerPinLoginView`, `ManagerLoginView`, `JobPhotosView`
- **Dependencies**
  - `clamd==1.0.2` for ClamAV Python client
  - `django-ratelimit==4.1.0` for rate limiting
- **Documentation**
  - ClamAV setup guide for macOS and Ubuntu/Debian
  - Configuration, testing with EICAR, performance tuning
  - Fail-open vs fail-closed strategies
  - Troubleshooting guide
  - Production deployment best practices
- **Tests**
  - 15+ virus scanning tests in `tests/security/test_virus_ratelimit_pr5.py`
  - 10+ rate limiting tests
  - EICAR detection tests with mocking
  - Fail-open behavior tests

#### PR6: Security Testing + Documentation (2026-02-19)
- **RBAC Isolation Tests**
  - 40+ tests for cross-company data isolation in `tests/security/test_rbac_isolation_pr6.py`
  - Test coverage: jobs, locations, users, assets, maintenance jobs
  - Role-based permission enforcement tests
  - IDOR (Insecure Direct Object Reference) protection tests
  - SQL injection protection tests
  - Authentication requirement tests
- **Security Scanning Tools**
  - Bandit configuration (`.bandit`) for static code analysis
  - Safety for dependency vulnerability scanning
  - Added to `requirements.txt`: `bandit==1.8.0`, `safety==3.2.18`
- **Comprehensive Documentation**
  - `docs/SECURITY.md` (650 lines): Security architecture, authentication, authorization, input validation, file upload security, rate limiting, multi-tenant isolation, IDOR protection, security testing, deployment security, incident response
  - `docs/security/DEPLOYMENT_CHECKLIST.md` (850 lines): Pre-deployment tasks, environment config, database security, HTTPS/SSL, monitoring, post-deployment verification, incident response
  - `docs/security/README.md` (180 lines): Documentation index, quick reference, security incident response
  - `docs/FOUNDATION_PLAN_SUMMARY.md` (700 lines): Complete overview of PR1-PR6, metrics, test coverage, deployment readiness

#### PR7: CI/CD Integration (2026-02-19)
- **GitHub Actions Workflows**
  - `.github/workflows/security-checks.yml`: Automated security testing on push/PR
  - Security test suite execution with coverage reporting
  - Bandit security linter scan
  - Safety dependency vulnerability scan
  - CodeQL security analysis
  - Weekly scheduled security scans (Mondays 9 AM UTC)
- **Pre-commit Hooks**
  - `.pre-commit-config.yaml`: Local git hooks for code quality
  - Trailing whitespace, end-of-file fixes
  - YAML/JSON validation
  - Large file detection, merge conflict detection
  - Private key detection
  - Black code formatting (line length 100)
  - isort import sorting
  - Flake8 linting
  - Bandit security scanning
  - Detect-secrets for credential scanning
  - Django system checks and migration checks
  - Security tests run on git push
- **Pytest Configuration**
  - `backend/pytest.ini`: Centralized test configuration
  - Test markers: django_db, slow, security, integration, unit, smoke, regression, performance
  - Verbose output, coverage options, logging configuration
  - Parallel execution support (pytest-xdist)
- **Project Documentation**
  - Updated `README.md` with security features
  - Created `CHANGELOG.md` (this file)

### Changed

#### Authentication System
- **Breaking Change (Q2 2026):** Legacy token authentication will be deprecated
- Current: Both JWT and legacy tokens accepted
- Future: JWT-only authentication (30-day access tokens, 90-day refresh tokens)
- **Migration:** See `docs/security/JWT_MIGRATION_GUIDE.md`

#### File Upload Processing
- All photo uploads now scanned for viruses before processing
- File size limit enforced (10 MB maximum)
- MIME type validation using magic bytes (prevents executable uploads)
- Malicious files rejected with HTTP 400 and virus name in response

#### API Rate Limiting
- Login endpoints limited to 5 attempts per minute per IP
- Photo upload endpoints limited to 10 uploads per minute per user
- Rate limit violations return HTTP 429 Too Many Requests

### Fixed

#### Security Vulnerabilities (from PR2 Audit)
- **SEC-001:** ✅ No token expiration → JWT with 30/90-day expiration
- **SEC-002:** ✅ No file size limits → 10 MB enforced
- **SEC-003:** ✅ No MIME type validation → Magic byte detection
- **SEC-004:** ✅ No XSS protection → HTML sanitization with bleach
- **SEC-005:** ✅ No multi-tenant isolation tests → 40+ RBAC tests
- **SEC-006:** ✅ No rate limiting on authentication → 5/min per IP
- **SEC-007:** ✅ No malware scanning → ClamAV integration
- **SEC-008:** ✅ Weak password requirements → Validation improved
- **SEC-009:** ✅ No CSRF protection → Django CSRF enabled
- **SEC-010:** ✅ No security documentation → Comprehensive docs
- **SEC-011:** ✅ No deployment checklist → Complete checklist

### Security

#### Test Coverage
- **Total Security Tests:** 115+
  - Input validation: 20+ tests
  - JWT authentication: 30+ tests
  - Virus scanning: 15+ tests
  - Rate limiting: 10+ tests
  - RBAC isolation: 40+ tests

#### Security Tools
- **Bandit:** Python security linter (static analysis)
- **Safety:** Dependency vulnerability scanner
- **CodeQL:** GitHub security analysis
- **Pre-commit:** Local security checks before commits
- **ClamAV:** Real-time virus scanning for uploads

#### Documentation
- **Total Documentation:** 4,300+ lines
  - Security architecture guide
  - JWT migration guide
  - ClamAV setup guide
  - Deployment checklist
  - Foundation Plan summary

### Deployment

#### Production Readiness
- ✅ All security tests passing (115+ tests)
- ✅ No known vulnerabilities (Bandit + Safety clean)
- ✅ JWT authentication implemented
- ✅ File upload security (size + type + virus scanning)
- ✅ Rate limiting configured
- ✅ Multi-tenant isolation verified
- ✅ Comprehensive security documentation
- ✅ Deployment checklist created
- ✅ CI/CD security workflows automated

#### Deployment Requirements
1. Install ClamAV daemon on production server
2. Configure environment variables (SECRET_KEY, DATABASE_URL, etc.)
3. Enable HTTPS (SECURE_SSL_REDIRECT=True)
4. Set DEBUG=False
5. Complete deployment checklist (`docs/security/DEPLOYMENT_CHECKLIST.md`)
6. Run all security tests (`pytest tests/security/ -v`)
7. Verify virus scanning with EICAR test
8. Test rate limiting (5 login attempts, 10 uploads)
9. Manual cross-company isolation verification

**See:** `docs/security/DEPLOYMENT_CHECKLIST.md` for complete deployment guide.

---

## [0.8.0] - 2026-02-13 - Security Audit (PR2)

### Added
- Comprehensive security audit report (`docs/security/SECURITY_AUDIT_REPORT.md`)
- Identified 11 critical security vulnerabilities
- Created remediation roadmap (PR3-PR6)
- Vulnerability categorization: Critical (9), High (9), Medium (6), Low (1)

### Security
- **Audit Findings:**
  - Authentication vulnerabilities: 4 issues
  - Authorization vulnerabilities: 3 issues
  - Input validation vulnerabilities: 9 issues
  - File upload vulnerabilities: 4 issues
  - Rate limiting vulnerabilities: 2 issues
  - Documentation gaps: 3 issues

---

## [0.7.0] - 2026-02-12 - Branch Strategy (PR1)

### Added
- Git branching strategy documentation (`docs/foundation/BRANCH_STRATEGY.md`)
- Foundation Plan workflow and PR structure
- Branch naming conventions (`foundation/pr#-description`)
- Merge strategy and commit message guidelines

---

## [0.6.0] - 2026-02-10 - Maintenance Context V3 (Stages 5-8)

### Added
- **Stage 5: Calendar View** for maintenance scheduling
- **Stage 6: PWA Offline** for offline photo capture
- **Stage 7: Map Locations** for location navigation
- **Stage 8: QR Code Asset Tracking** for asset identification

---

## [0.5.0] - Prior Releases

### Earlier Versions
- CleanProof: Production-stable cleaning SaaS
- MaintainProof V1-V2: Basic maintenance functionality
- Multi-tenant architecture
- Role-based access control (Owner, Manager, Staff, Cleaner)
- Photo upload and management
- Job scheduling and tracking
- Analytics and reporting

---

## How to Use This Changelog

### For Developers
- Review **Added** section for new features and APIs
- Check **Changed** section for breaking changes
- Read **Security** section for security updates
- Review **Fixed** section for bug fixes

### For DevOps
- Check **Deployment** section for production requirements
- Review **Dependencies** in each PR
- Follow deployment checklist before production

### For Security Team
- Review **Security** section for vulnerability fixes
- Check **Test Coverage** for security test additions
- Review security audit findings and remediation

---

## Version History Summary

| Version | Date | Description | PRs |
|---------|------|-------------|-----|
| **0.9.0** | 2026-02-19 | Foundation Plan Complete | PR3-PR7 |
| **0.8.0** | 2026-02-13 | Security Audit | PR2 |
| **0.7.0** | 2026-02-12 | Branch Strategy | PR1 |
| **0.6.0** | 2026-02-10 | Maintenance V3 | - |
| **0.5.0** | Prior | Earlier Releases | - |

---

## Links

- **Security Documentation:** `backend/docs/SECURITY.md`
- **Deployment Checklist:** `backend/docs/security/DEPLOYMENT_CHECKLIST.md`
- **Foundation Plan Summary:** `backend/docs/FOUNDATION_PLAN_SUMMARY.md`
- **GitHub Repository:** https://github.com/proof-platform-app/cleaning-saas

---

**Last Updated:** 2026-02-19
**Next Release:** TBD (Frontend JWT Migration)
