# Launch Readiness Checklist

**Version:** 1.0
**Created:** 2026-03-22
**Status:** Pre-Launch

---

## ✅ DONE — Infrastructure

| Item | Status | Details |
|------|--------|---------|
| Frontend deployed (Vercel) | ✅ | `proofplatform.vercel.app` |
| Backend deployed (Railway) | ✅ | `proofplatform.up.railway.app` |
| PostgreSQL database | ✅ | Railway Postgres-bnDY |
| CORS configured | ✅ | Vercel ↔ Railway |
| Health checks | ✅ | `/api/health/` and `/api/health/ready/` |
| SSL/HTTPS | ✅ | Auto via Vercel + Railway |
| SPA routing | ✅ | `vercel.json` rewrites |
| Database migrations | ✅ | Auto-run via `entrypoint.sh` |

## ✅ DONE — Authentication

| Item | Status | Details |
|------|--------|---------|
| Signup flow | ✅ | Email + password, no email verification |
| Login flow (JWT) | ✅ | Access + refresh tokens |
| Password strength indicator | ✅ | 4-level visual bar on signup |
| Strong password enforcement | ✅ | Django validators (min 8 chars, not common) |
| Token refresh | ✅ | Auto-refresh on 401 |
| Logout | ✅ | Clear tokens from localStorage |
| Demo login | ✅ | "Try demo" button on login page |

## ✅ DONE — Core Features

| Item | Status | Details |
|------|--------|---------|
| CleanProof — Job Planning | ✅ | Create, view, filter jobs |
| CleanProof — Job Execution | ✅ | Check-in, checklist, photos, check-out |
| CleanProof — Reports | ✅ | Weekly/monthly PDF + email |
| CleanProof — Analytics | ✅ | KPI dashboard, trends, SLA |
| MaintainProof — Service Visits | ✅ | Full CRUD + execution |
| MaintainProof — Assets | ✅ | CRUD + service history |
| MaintainProof — Reports | ✅ | Visit PDF, asset history PDF |
| Locations management | ✅ | CRUD + Google Maps |
| Company settings | ✅ | Profile, team, logo |
| Billing infrastructure | ✅ | Plan display, usage metrics |

---

## 🟡 REQUIRES ACTION — Before Public Launch

### 1. Google Maps (Blocked by Billing)
- **Action:** Complete Google Cloud $50 prepayment
- **Where:** Google Cloud Console → Billing → Pay now
- **Impact:** Maps on Locations pages (both products) won't load until paid
- **Risk:** Low — maps are optional for core functionality

### 2. Custom Domain
- **Action:** Configure custom domain (e.g., `app.proofplatform.com`)
- **Steps:**
  1. Vercel Dashboard → Settings → Domains → Add
  2. DNS: CNAME `app` → `cname.vercel-dns.com`
  3. Railway: Add custom domain for API (e.g., `api.proofplatform.com`)
  4. Update `VITE_API_BASE_URL` in Vercel env
  5. Update `CORS_ORIGINS` and `ALLOWED_HOSTS` in Railway env
  6. Add domain to Google Maps API key restrictions
  7. Redeploy both frontend and backend
- **Risk:** Medium — `*.vercel.app` domain is not branded

### 3. Email Delivery (SMTP)
- **Current:** Email verification skipped; report emails use Gmail SMTP
- **Action:** Configure production SMTP (e.g., SendGrid, Resend, AWS SES)
- **Steps:**
  1. Create SMTP account
  2. Set Railway env vars: `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`
  3. Verify sender domain (SPF, DKIM)
  4. Optionally re-enable email verification (`SKIP_EMAIL_VERIFICATION` removed)
- **Risk:** Medium — report email delivery may fail without proper SMTP

### 4. Error Monitoring
- **Action:** Set up Sentry for error tracking
- **Steps:**
  1. Create Sentry project
  2. Set `VITE_SENTRY_DSN` in Vercel env
  3. Set `SENTRY_DSN` in Railway env
- **Risk:** Low — app works without it, but blind to production errors

### 5. Remaining Design Improvements (5 items)
- **#6:** Filter bar standardization (MaintainProof VisitList filters)
- **#8:** CTA button consistency (Maintenance buttons)
- **#10:** Table sorting indicators (Maintenance tables)
- **#13:** Calendar colored dots (Maintenance Calendar)
- **#15:** Mobile responsive sidebar (AppSidebar)
- **Risk:** Low — cosmetic, not blocking launch

---

## ⛔ NOT REQUIRED FOR LAUNCH (Post-Launch)

| Item | Priority | Notes |
|------|----------|-------|
| Payment integration (Paddle/Stripe) | High | Billing page ready, needs provider |
| Email verification flow | Medium | Currently skipped; enable when SMTP ready |
| GitHub auto-deploy for Railway | Low | Currently manual CLI deploy |
| Staging environment | Low | Only production exists now |
| Rate limiting tuning | Low | DRF throttling configured but untested at scale |
| Mobile app polish | Low | PWA works, native apps not started |
| Multi-language support | Low | i18n infrastructure exists, only English populated |
| Backup automation | Low | Railway auto-backups; consider manual export schedule |
| CDN for media files | Low | Currently served from Railway; move to S3/CloudFront |

---

## Quick Deploy Reference

### Frontend (Vercel)
```bash
cd /Users/pavelgayvoronskiy/Downloads/Cleaning-saas
vercel deploy --prod --yes
```

### Backend (Railway)
```bash
cd /Users/pavelgayvoronskiy/Downloads/Cleaning-saas
railway up --service api -d --path-as-root backend
```

### Verify Deployment
```bash
# Backend health
curl https://proofplatform.up.railway.app/api/health/ready/

# Test login
curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"TestPassword123!"}' \
  https://proofplatform.up.railway.app/api/manager/auth/jwt/login/

# Test CORS
curl -I -X OPTIONS \
  -H "Origin: https://proofplatform.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  https://proofplatform.up.railway.app/api/auth/signup/
```

---

## Architecture Diagram

```
┌─────────────────────┐     HTTPS      ┌──────────────────────┐
│   Vercel (Frontend)  │ ──────────────▶│  Railway (Backend)    │
│                      │     REST API   │                       │
│ proofplatform.       │◀──────────────│ proofplatform.up.     │
│ vercel.app           │    JSON + JWT  │ railway.app           │
│                      │               │                       │
│ • React + Vite       │               │ • Django + DRF        │
│ • SPA (client-side)  │               │ • Gunicorn            │
│ • PWA support        │               │ • WhiteNoise (static) │
└─────────────────────┘               └───────┬───────────────┘
                                               │
                                               │ DATABASE_URL
                                               ▼
                                      ┌──────────────────┐
                                      │ Railway Postgres  │
                                      │ (Postgres-bnDY)   │
                                      └──────────────────┘
```
