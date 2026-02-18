# Security Documentation

This directory contains all security-related documentation for the Proof Platform.

## Documents

### 📋 [JWT_MIGRATION_GUIDE.md](JWT_MIGRATION_GUIDE.md)
**Purpose:** Frontend migration guide for JWT authentication
**Created:** PR4 (Token Security)
**Audience:** Frontend developers

**Contents:**
- JWT authentication flow
- TypeScript implementation examples
- Auto-refresh interceptor
- Token storage best practices
- Migration from legacy tokens

---

### 🦠 [CLAMAV_SETUP_GUIDE.md](CLAMAV_SETUP_GUIDE.md)
**Purpose:** ClamAV virus scanning installation and configuration
**Created:** PR5 (Virus Scanning + Rate Limiting)
**Audience:** DevOps, System Administrators

**Contents:**
- Installation (macOS, Ubuntu/Debian)
- Configuration and testing
- EICAR test pattern usage
- Performance tuning
- Fail-open vs fail-closed strategies
- Troubleshooting guide
- Production best practices

---

### ✅ [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
**Purpose:** Pre-deployment security checklist
**Created:** PR6 (Security Testing + Documentation)
**Audience:** DevOps, Technical Leads

**Contents:**
- Pre-deployment tasks (code quality, testing, config)
- Environment configuration
- Database security
- Authentication setup
- File upload security
- HTTPS/SSL configuration
- Multi-tenant isolation verification
- Post-deployment verification
- Incident response plan

---

## Related Documentation

### Main Security Documentation
See [../SECURITY.md](../SECURITY.md) for:
- Security architecture overview
- Authentication & authorization details
- Input validation & sanitization
- Multi-tenant isolation
- Security testing procedures
- Monitoring & incident response

### Test Coverage
See [../../tests/security/](../../tests/security/) for:
- RBAC isolation tests (40+ tests)
- JWT authentication tests (30+ tests)
- Rate limiting tests (10+ tests)
- Input validation tests (20+ tests)
- Virus scanning tests (15+ tests)

---

## Quick Links

| Task | Document | Command |
|------|----------|---------|
| **Install ClamAV** | [CLAMAV_SETUP_GUIDE.md](CLAMAV_SETUP_GUIDE.md) | `brew install clamav` |
| **Migrate to JWT** | [JWT_MIGRATION_GUIDE.md](JWT_MIGRATION_GUIDE.md) | See frontend examples |
| **Deploy to Production** | [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | Complete all checkboxes |
| **Run Security Tests** | [../SECURITY.md](../SECURITY.md) | `pytest tests/security/ -v` |
| **Security Scan (Bandit)** | [../SECURITY.md](../SECURITY.md) | `bandit -c .bandit -r apps/` |
| **Dependency Scan (Safety)** | [../SECURITY.md](../SECURITY.md) | `safety check` |

---

## Security Incident Response

**In case of security incident:**

1. **Contain:** Disable affected accounts, block IPs
2. **Investigate:** Review logs, identify scope
3. **Escalate:** Contact security team (see [../SECURITY.md](../SECURITY.md))
4. **Document:** Log all actions taken
5. **Remediate:** Patch vulnerability, deploy fix
6. **Post-mortem:** Update documentation and processes

**Emergency Contacts:** See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) → Incident Response Plan

---

## Version History

| Version | Date | Changes | PR |
|---------|------|---------|-----|
| 1.0 | 2026-02-19 | Complete security documentation | PR6 |
| 0.3 | 2026-02-18 | ClamAV setup guide | PR5 |
| 0.2 | 2026-02-17 | JWT migration guide | PR4 |

---

**Last Updated:** 2026-02-19
**Maintained By:** Security Team
