# Deployment Environments

**Updated:** 2026-03-22

---

## Production (LIVE ✅)

### Frontend — Vercel
- **URL:** `https://proofplatform.vercel.app`
- **Branch:** `main` (auto-deploy on push)
- **Build:** `cd dubai-control && npm run build`
- **Env vars:**
  - `VITE_API_BASE_URL=https://proofplatform.up.railway.app`
  - `VITE_GOOGLE_MAPS_API_KEY=<encrypted>`

### Backend — Railway
- **URL:** `https://proofplatform.up.railway.app`
- **Service:** `api` (ID: `91156a6d-d474-406b-9237-8b8fa78d5c96`)
- **Project:** ID `e173f66e-f7b5-43f2-aeef-cb1a04316270`
- **Builder:** Dockerfile
- **Deploy:** Manual CLI (`railway up --service api -d --path-as-root backend`)
- **Startup:** `entrypoint.sh` → migrate → collectstatic → gunicorn
- **Env vars:**
  - `SECRET_KEY=<encrypted>`
  - `DEBUG=False`
  - `ALLOWED_HOSTS=.railway.app,.up.railway.app,proofplatform.up.railway.app`
  - `CORS_ORIGINS=https://proofplatform.vercel.app`
  - `PORT=8000`
  - `DATABASE_URL=${{Postgres-bnDY.DATABASE_URL}}`
  - `RAILWAY_DOCKERFILE_PATH=Dockerfile`
  - `SKIP_EMAIL_VERIFICATION=true`

### Database — Railway Postgres
- **Service:** `Postgres-bnDY`
- **Connection:** via `DATABASE_URL` reference variable
- **Backups:** Railway automatic

---

## Local Development

### Frontend
```bash
cd dubai-control
npm run dev
# → http://localhost:8080
```

### Backend
```bash
cd backend
source venv/bin/activate
python manage.py runserver 8001
# → http://127.0.0.1:8001
```

### Environment
- Frontend connects to `http://127.0.0.1:8001` (fallback in `src/api/core.ts`)
- Backend uses SQLite locally (`db.sqlite3`)
- Test credentials: `manager@test.com` / `Test1234!`

---

## Deploy Workflow

### Frontend Changes Only
```bash
git add . && git commit -m "feat: ..." && git push
vercel deploy --prod --yes
```

### Backend Changes Only
```bash
git add . && git commit -m "fix: ..." && git push
railway up --service api -d --path-as-root backend
```

### Full Stack Changes
```bash
git add . && git commit -m "feat: ..." && git push
# Deploy both in parallel:
vercel deploy --prod --yes &
railway up --service api -d --path-as-root backend &
wait
```

---

## Important Notes

1. **Railway Builder MUST be Dockerfile** — Set in Dashboard → Settings → Build → Builder. Railpack/Nixpacks detect Node.js incorrectly for Python monorepo.

2. **`--path-as-root backend`** is required — Railway CLI needs this flag to build from `backend/` subdirectory.

3. **Migrations auto-run** — `entrypoint.sh` runs `migrate --noinput` before gunicorn starts. No manual migration step needed.

4. **CORS requires both sides** — Frontend domain must be in Railway `CORS_ORIGINS` env var, AND backend domain must be in Vercel `VITE_API_BASE_URL`.

5. **Google Maps requires billing** — Google Cloud prepayment ($50) must be completed for Maps JavaScript API to work on production.

---

## Staging Environment (Not Yet Configured)

Future staging setup:
- Separate Railway service for API staging
- Separate Postgres instance
- Vercel Preview deployments (auto-created for PRs)
- Branch: `staging` → staging backend

See `PRODUCTION_DEPLOYMENT.md` for full deployment reference.
