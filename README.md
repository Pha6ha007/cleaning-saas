# Proof Platform

**CleanProof + MaintainProof** — Multi-context SaaS platform for cleaning and maintenance service management.

[![Security Checks](https://github.com/proof-platform-app/cleaning-saas/actions/workflows/security-checks.yml/badge.svg)](https://github.com/proof-platform-app/cleaning-saas/actions/workflows/security-checks.yml)
[![Python](https://img.shields.io/badge/python-3.11-blue.svg)](https://www.python.org/downloads/)
[![Django](https://img.shields.io/badge/django-5.2-green.svg)](https://www.djangoproject.com/)
[![Security](https://img.shields.io/badge/security-hardened-brightgreen.svg)](backend/docs/SECURITY.md)

---

## 🏗️ Architecture

```
proof-platform/
├── backend/          # Django REST API (CleanProof + MaintainProof)
├── mobile/           # React Native mobile app for cleaners
├── docs/             # Project documentation
└── .github/          # CI/CD workflows
```

---

## 🚀 Features

### CleanProof (Cleaning Services)
- ✅ **Production-Stable** — Fully operational cleaning SaaS
- 📅 Job scheduling and assignment
- 📸 Photo documentation (before/after)
- 👥 Multi-role access (Owner, Manager, Staff, Cleaner)
- 📊 Performance analytics and reporting
- 📱 Mobile app for cleaners

### MaintainProof (Maintenance Services)
- 🔧 **Under Development** — Maintenance management system
- 🏢 Asset tracking with QR codes
- 📅 Preventive maintenance scheduling
- 🗺️ Location-based job navigation
- 📱 PWA offline photo capture
- 📊 Maintenance analytics

---

## 🔒 Security Features (Foundation Plan)

**Enterprise-grade security implemented February 2026:**

### ✅ Authentication & Authorization
- **JWT Authentication** with token expiration (30-day access, 90-day refresh)
- **Token Rotation** on refresh to prevent replay attacks
- **Automatic Logout** with refresh token blacklisting
- **Role-Based Access Control (RBAC)** with 4 user roles
- **Multi-Tenant Isolation** — complete data separation between companies

### ✅ Input Validation & Sanitization
- **File Size Limits** (10 MB maximum)
- **MIME Type Validation** using magic bytes (not just extensions)
- **HTML Sanitization** to prevent XSS attacks
- **Coordinate Validation** for GPS data integrity
- **Bulk Operation Limits** (max 100 items per request)

### ✅ File Upload Security
- **ClamAV Virus Scanning** for all uploaded files
- **EICAR Test Pattern** detection for deployment verification
- **Malware Blocking** with detailed virus identification
- **Fail-Safe Strategy** (configurable fail-open/fail-closed)

### ✅ Rate Limiting & DoS Protection
- **Login Rate Limiting:** 5 attempts per minute per IP
- **Upload Rate Limiting:** 10 uploads per minute per user
- **HTTP 429** responses when limits exceeded
- **Brute-Force Protection** for all authentication endpoints

### ✅ Security Testing
- **115+ Security Tests** across all critical areas
- **40+ RBAC Isolation Tests** for multi-tenant security
- **30+ JWT Authentication Tests**
- **15+ Virus Scanning Tests**
- **Automated Security Scans** (Bandit, Safety, CodeQL)

### ✅ Documentation & Compliance
- **Comprehensive Security Documentation** (4,300+ lines)
- **Deployment Security Checklist** for production
- **Incident Response Procedures**
- **Quarterly Security Review Schedule**

**See:** [`backend/docs/SECURITY.md`](backend/docs/SECURITY.md) for complete security documentation.

---

## 📋 Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 13+ (or SQLite for development)
- ClamAV daemon (for virus scanning in production)
- Git

### Backend Setup

```bash
# Clone repository
git clone https://github.com/proof-platform-app/cleaning-saas.git
cd cleaning-saas/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your settings (SECRET_KEY, DATABASE_URL, etc.)

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

### Security Setup (Development)

```bash
# Install pre-commit hooks
pip install pre-commit
pre-commit install

# Install ClamAV (macOS)
brew install clamav
sudo freshclam  # Update virus database

# Install ClamAV (Ubuntu/Debian)
sudo apt-get install clamav clamav-daemon
sudo freshclam

# Test virus scanning with EICAR
python manage.py shell
>>> from apps.jobs.virus_scan import test_virus_scanning
>>> test_virus_scanning()
True  # EICAR detected successfully
```

**See:** [`backend/docs/security/CLAMAV_SETUP_GUIDE.md`](backend/docs/security/CLAMAV_SETUP_GUIDE.md) for detailed setup.

### Running Tests

```bash
# All tests
pytest

# Security tests only
pytest tests/security/ -v

# With coverage
pytest --cov=apps --cov-report=html

# Security scans
bandit -c .bandit -r apps/
safety check
```

---

## 🔐 Authentication

### JWT Authentication (Recommended)

```bash
# Login
curl -X POST http://localhost:8000/api/auth/jwt/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Response
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user_id": 1,
  "email": "user@example.com",
  "role": "manager"
}

# Use access token in requests
curl http://localhost:8000/api/manager/jobs/ \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."

# Refresh access token
curl -X POST http://localhost:8000/api/auth/jwt/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."}'
```

**Frontend Migration:** See [`backend/docs/security/JWT_MIGRATION_GUIDE.md`](backend/docs/security/JWT_MIGRATION_GUIDE.md)

### Legacy Token Authentication (Deprecated)

```bash
# Login (will be removed in Q2 2026)
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Use token in requests
curl http://localhost:8000/api/manager/jobs/ \
  -H "Authorization: Token abc123..."
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [SECURITY.md](backend/docs/SECURITY.md) | Comprehensive security guide (architecture, authentication, validation, testing) |
| [DEPLOYMENT_CHECKLIST.md](backend/docs/security/DEPLOYMENT_CHECKLIST.md) | Production deployment security checklist |
| [JWT_MIGRATION_GUIDE.md](backend/docs/security/JWT_MIGRATION_GUIDE.md) | Frontend JWT implementation guide with TypeScript examples |
| [CLAMAV_SETUP_GUIDE.md](backend/docs/security/CLAMAV_SETUP_GUIDE.md) | ClamAV installation and configuration |
| [FOUNDATION_PLAN_SUMMARY.md](backend/docs/FOUNDATION_PLAN_SUMMARY.md) | Complete overview of security implementation (PR1-PR7) |
| [CHANGELOG.md](CHANGELOG.md) | Version history and release notes |

---

## 🧪 Testing

### Test Organization

```
backend/tests/
├── security/                    # Security tests (115+ tests)
│   ├── test_validation_pr3.py   # Input validation (20+ tests)
│   ├── test_jwt_pr4.py          # JWT authentication (30+ tests)
│   ├── test_virus_ratelimit_pr5.py  # Virus scanning + rate limiting (25+ tests)
│   └── test_rbac_isolation_pr6.py   # RBAC multi-tenant isolation (40+ tests)
├── unit/                        # Unit tests
├── integration/                 # Integration tests
└── performance/                 # Performance tests
```

### Test Markers

```bash
# Run only security tests
pytest -m security

# Run only database tests
pytest -m django_db

# Run only slow tests
pytest -m slow

# Exclude slow tests
pytest -m "not slow"
```

### Coverage Goals

- **Overall:** 80%+ code coverage
- **Security:** 100% coverage for critical security code
- **API:** 90%+ endpoint coverage
- **Models:** 85%+ model coverage

---

## 🚀 Deployment

### Production Deployment Checklist

**Before deploying to production, complete ALL items in:**

[`backend/docs/security/DEPLOYMENT_CHECKLIST.md`](backend/docs/security/DEPLOYMENT_CHECKLIST.md)

**Critical items:**
- [ ] All security tests passing (`pytest tests/security/ -v`)
- [ ] Bandit security scan clean
- [ ] Safety dependency scan clean
- [ ] ClamAV daemon installed and tested with EICAR
- [ ] Rate limiting configured and tested
- [ ] JWT authentication enabled
- [ ] `DEBUG=False` in production
- [ ] `SECRET_KEY` randomized and secure
- [ ] HTTPS enforced (`SECURE_SSL_REDIRECT=True`)
- [ ] CORS restricted to frontend domain only
- [ ] Database password strong (20+ characters)
- [ ] All secrets in environment variables (not in code)

### Environment Variables

```bash
# Required
SECRET_KEY=<random-50-char-string>
DATABASE_URL=postgresql://user:pass@host:5432/db
DEBUG=False
ALLOWED_HOSTS=app.proofplatform.com,api.proofplatform.com

# Optional
AWS_ACCESS_KEY_ID=<aws-key>
AWS_SECRET_ACCESS_KEY=<aws-secret>
EMAIL_HOST_PASSWORD=<smtp-password>
```

### Production Requirements

- **Python:** 3.11+
- **Database:** PostgreSQL 13+
- **Web Server:** Gunicorn + Nginx
- **ClamAV:** Daemon running with daily updates
- **SSL:** Valid HTTPS certificate
- **Monitoring:** Error tracking (Sentry, Rollbar)

---

## 🔄 CI/CD

### GitHub Actions Workflows

- **Security Checks** (`.github/workflows/security-checks.yml`)
  - Runs on push/PR and weekly on Mondays
  - Security test suite (115+ tests)
  - Bandit static analysis
  - Safety vulnerability scan
  - CodeQL security analysis

### Pre-commit Hooks

- Trailing whitespace removal
- End-of-file fixer
- YAML/JSON validation
- Large file detection
- Private key detection
- Black code formatting
- isort import sorting
- Flake8 linting
- Bandit security scan
- Detect-secrets for credentials
- Django system checks
- Security tests on push

**Setup:**
```bash
pip install pre-commit
pre-commit install
```

---

## 🛡️ Security

### Reporting Security Issues

**Do NOT open public GitHub issues for security vulnerabilities.**

**Instead:**
1. Email: security@proofplatform.com (TBD)
2. Include: Description, steps to reproduce, impact assessment
3. Response time: 48 hours
4. Fix timeline: 7 days for critical, 30 days for others

### Security Audit History

| Date | Type | Findings | Status |
|------|------|----------|--------|
| 2026-02-13 | Comprehensive Audit (PR2) | 11 critical vulnerabilities | ✅ All fixed (PR3-PR6) |
| 2026-02-19 | Foundation Plan Complete | 0 known vulnerabilities | ✅ Production-ready |

### Next Security Review

**Due:** May 19, 2026 (Quarterly)

**Checklist:**
- Review user permissions
- Rotate database credentials
- Update dependencies
- Run full security test suite
- Review logs for anomalies
- Test incident response plan

---

## 📊 Project Status

### CleanProof (Cleaning)
- **Status:** ✅ Production-stable
- **Version:** 0.9.0
- **Security:** Hardened (Foundation Plan complete)
- **Code Quality:** LOCKED (no modifications without approval)

### MaintainProof (Maintenance)
- **Status:** 🚧 Under development
- **Version:** 0.9.0 (V3 in progress)
- **Security:** Hardened (shares backend security)
- **Code Quality:** Active development

### Foundation Plan (Security)
- **Status:** ✅ Complete (PR1-PR7)
- **Timeline:** February 12-19, 2026 (7 days)
- **Vulnerabilities Fixed:** 11/11 (100%)
- **Tests Added:** 115+ security tests
- **Documentation:** 4,300+ lines

---

## 👥 Team & Roles

### User Roles

| Role | Permissions |
|------|------------|
| **Owner** | Full company control, billing, user management, all CRUD operations |
| **Manager** | User management (excluding owners), location/job CRUD, analytics |
| **Staff** | Limited admin access, job monitoring |
| **Cleaner** | View assigned jobs, update status, upload photos |

**See:** [`backend/docs/SECURITY.md`](backend/docs/SECURITY.md) → Role-Based Access Control section

---

## 📝 Contributing

### Development Workflow

1. **Create branch:** `git checkout -b feature/your-feature`
2. **Make changes** (pre-commit hooks will run automatically)
3. **Run tests:** `pytest`
4. **Run security scans:** `bandit -c .bandit -r apps/`
5. **Commit:** `git commit -m "feat: your feature"`
6. **Push:** `git push origin feature/your-feature`
7. **Create Pull Request** on GitHub

### Code Quality Standards

- **Python:** PEP 8 (enforced by Black + Flake8)
- **Line Length:** 100 characters
- **Import Sorting:** isort with Black profile
- **Type Hints:** Required for public APIs
- **Docstrings:** Required for all public functions/classes
- **Tests:** Required for all new features

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `security`

**Example:**
```
feat(auth): add JWT refresh token rotation

Implements automatic refresh token rotation on token refresh to prevent
replay attacks. New refresh token is issued and old token is blacklisted.

Addresses SEC-001 from security audit.
```

---

## 📄 License

**Proprietary** — All rights reserved.

This is a commercial SaaS platform. Unauthorized copying, distribution, or use is prohibited.

---

## 🔗 Links

- **Repository:** https://github.com/proof-platform-app/cleaning-saas
- **Security Documentation:** [backend/docs/SECURITY.md](backend/docs/SECURITY.md)
- **Deployment Guide:** [backend/docs/security/DEPLOYMENT_CHECKLIST.md](backend/docs/security/DEPLOYMENT_CHECKLIST.md)
- **Changelog:** [CHANGELOG.md](CHANGELOG.md)

---

## 📞 Support

- **Technical Issues:** Create GitHub issue
- **Security Issues:** security@proofplatform.com
- **General Questions:** support@proofplatform.com

---

**Last Updated:** February 19, 2026
**Version:** 0.9.0 (Foundation Plan Complete)
