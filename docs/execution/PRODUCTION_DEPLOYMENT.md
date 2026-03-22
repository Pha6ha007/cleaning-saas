# Production Deployment Guide

**Version:** 1.0
**Created:** 2026-03-22
**Status:** LIVE ✅

---

## 1. Production Stack

| Component | Service | URL | Status |
|-----------|---------|-----|--------|
| Frontend | Vercel | `https://proofplatform.vercel.app` | ✅ Live |
| Backend API | Railway | `https://proofplatform.up.railway.app` | ✅ Live |
| Database | Railway Postgres | `Postgres-bnDY` (internal) | ✅ Live |
| DNS/CDN | Vercel Edge | Global CDN | ✅ Auto |

---

## 2. Vercel (Frontend)

### Project
- **Vercel Project:** `proofplatform`
- **Team:** `pashas-projects-6821db89`
- **Git:** `https://github.com/proof-platform-app/cleaning-saas.git` (branch: `main`)
- **Build:** `cd dubai-control && npm run build`
- **Output:** `dubai-control/dist`

### Environment Variables (Production)
```
VITE_API_BASE_URL=https://proofplatform.up.railway.app
VITE_GOOGLE_MAPS_API_KEY=<encrypted>
```

### Deploy Command (Manual)
```bash
cd /Users/pavelgayvoronskiy/Downloads/Cleaning-saas
vercel deploy --prod --yes
```

### SPA Routing
`vercel.json` at repo root handles SPA rewrites — all routes → `index.html`.

---

## 3. Railway (Backend)

### Service
- **Project ID:** `e173f66e-f7b5-43f2-aeef-cb1a04316270`
- **Service Name:** `api`
- **Service ID:** `91156a6d-d474-406b-9237-8b8fa78d5c96`
- **Builder:** Dockerfile (MUST be set in Dashboard → Settings → Build)
- **Dockerfile:** `backend/Dockerfile`

### Environment Variables
```
SECRET_KEY=<encrypted>
DEBUG=False
ALLOWED_HOSTS=.railway.app,.up.railway.app,proofplatform.up.railway.app
CORS_ORIGINS=https://proofplatform.vercel.app
PORT=8000
DATABASE_URL=${{Postgres-bnDY.DATABASE_URL}}
RAILWAY_DOCKERFILE_PATH=Dockerfile
SKIP_EMAIL_VERIFICATION=true
```

### Deploy Command (Manual CLI)
```bash
cd /Users/pavelgayvoronskiy/Downloads/Cleaning-saas
railway up --service api -d --path-as-root backend
```

> **IMPORTANT:** Do NOT use Railway Dashboard auto-deploy or Root Directory setting — they don't work reliably with monorepo. Always deploy via CLI with `--path-as-root backend`.

### Startup Flow
`entrypoint.sh` runs on container start:
1. `python manage.py migrate --noinput`
2. `python manage.py collectstatic --noinput`
3. `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`

### Health Checks
- Liveness: `GET /api/health/` → `{"status":"ok"}`
- Readiness: `GET /api/health/ready/` → `{"status":"ok","checks":{"database":"ok","cache":"ok"}}`

---

## 4. Database (Railway Postgres)

- **Service:** `Postgres-bnDY`
- **Connection:** via `DATABASE_URL` reference variable
- **Migrations:** Auto-run on deploy via `entrypoint.sh`
- **Backups:** Railway automatic daily backups

---

## 5. CORS Configuration

Backend `config/settings.py` reads `CORS_ORIGINS` env var:
```python
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in os.environ.get("CORS_ORIGINS", "").split(",") if origin.strip()]
```

Current allowed origin: `https://proofplatform.vercel.app`

When adding custom domain, add it to `CORS_ORIGINS`:
```
CORS_ORIGINS=https://proofplatform.vercel.app,https://app.proofplatform.com
```

---

## 6. Authentication Flow

### Signup
- `POST /api/auth/signup/` → Creates account with `is_active=True` (email verification skipped via `SKIP_EMAIL_VERIFICATION=true`)
- Django password validators enforce strong passwords
- Frontend shows password strength indicator (Weak → Fair → Good → Strong)

### Login
- `POST /api/manager/auth/jwt/login/` → Returns JWT `access` + `refresh` tokens
- Access token lifetime: 30 days
- Refresh token lifetime: 90 days

### Token Storage
- `access_token` → localStorage
- `refresh_token` → localStorage
- Auto-refresh on 401 via `apiFetch` in `src/api/core.ts`

---

## 7. Custom Domain Setup

### Frontend (Vercel)
1. Vercel Dashboard → proofplatform → Settings → Domains
2. Add domain (e.g., `app.proofplatform.com`)
3. Configure DNS: CNAME `app` → `cname.vercel-dns.com`
4. SSL auto-issued by Vercel

### Backend (Railway)
1. Railway Dashboard → api service → Settings → Networking → Custom Domain
2. Add domain (e.g., `api.proofplatform.com`)
3. Configure DNS: CNAME to Railway-provided domain
4. Update Vercel env: `VITE_API_BASE_URL=https://api.proofplatform.com`
5. Update Railway env: `ALLOWED_HOSTS` and `CORS_ORIGINS` with new domains
6. Redeploy both

### Google Maps
Add new domain to Google Cloud Console → APIs & Services → Credentials → API key → Website restrictions.

---

## 8. Deployment Checklist

### Before Deploy
- [ ] `npm run build` passes locally (zero errors)
- [ ] `npx tsc --noEmit` passes (zero type errors)
- [ ] Backend migrations created (`makemigrations`)
- [ ] No LOCKED files modified (check CLAUDE.md)

### After Deploy
- [ ] `GET /api/health/ready/` returns 200
- [ ] Login works on production
- [ ] Dashboard loads
- [ ] CORS preflight succeeds (check OPTIONS to any API endpoint)

---

## 9. Troubleshooting

### White screen on Vercel
- Check Vite chunk splitting in `vite.config.ts`
- React-dependent libs must be in `vendor-react` chunk
- Run `npm run build` locally to reproduce

### Railway build fails
- Ensure Builder = Dockerfile in Dashboard (not Railpack/Nixpacks)
- Check `RAILWAY_DOCKERFILE_PATH=Dockerfile` env var is set
- Deploy via CLI: `railway up --service api -d --path-as-root backend`

### "Authentication credentials were not provided"
- View must include `JWTAuthentication` in `authentication_classes`
- Check: `authentication_classes = [JWTAuthentication, TokenAuthentication]`

### CORS errors
- Verify `CORS_ORIGINS` env var includes frontend domain
- Check `Access-Control-Allow-Origin` header in OPTIONS response

### Google Maps not loading
- Check Google Cloud Billing is active (prepayment required)
- Verify domain in API key Website restrictions
- Propagation delay: up to 5 minutes after changes
