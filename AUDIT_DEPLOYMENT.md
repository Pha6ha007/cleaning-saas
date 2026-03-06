# AUDIT_DEPLOYMENT — Production Deployment Readiness

**Дата:** 2026-03-06
**Проект:** Proof Platform (CleanProof + MaintainProof)

---

## Сводка

| Область | Статус | Приоритет |
|---------|--------|-----------|
| Environment Variables | ✅ Ready | — |
| Database | ✅ Ready | — |
| Static Files | ⚠️ Needs Work | High |
| Media Files | ⚠️ Needs Work | Medium |
| Celery | ⚠️ Needs Work | Medium |
| Monitoring | ⚠️ Needs Work | High |
| CI/CD | ⚠️ Needs Work | High |

---

## 1. Environment Variables — ✅ Ready

- `DEBUG` — defaults to False (safe)
- `SECRET_KEY` — required in production, raises ValueError if missing
- `ALLOWED_HOSTS` — from env, defaults to localhost only
- `CORS_ORIGINS` — required in production, raises ValueError if missing
- `DATABASE_URL` — supported with PostgreSQL parsing
- `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` — defaults to localhost Redis
- `EMAIL_HOST_PASSWORD` — optional, falls back to console backend
- `CSRF_TRUSTED_ORIGINS` — defaults to CORS_ORIGINS if not set

**Required for production:**

```
SECRET_KEY=<generated-key>
ALLOWED_HOSTS=app.cleanproof.com,www.cleanproof.com
CORS_ORIGINS=https://app.cleanproof.com
DATABASE_URL=postgres://user:pass@host:5432/dbname
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
EMAIL_HOST_PASSWORD=<app-password>
```

**Action:**
- Generate SECRET_KEY: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
- Set up Redis instance for Celery
- Configure Gmail App Password for email

---

## 2. Static Files — ⚠️ Needs Work

- `STATIC_URL = "static/"`, `STATIC_ROOT = BASE_DIR / "staticfiles"`
- **WhiteNoise NOT installed** — не в requirements.txt
- Нет CDN configuration

**Action:**
```bash
pip install whitenoise
```
```python
# settings.py — middleware after SecurityMiddleware
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # Add this
    ...
]
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
```
```bash
python manage.py collectstatic  # during deployment
```

---

## 3. Media Files — ⚠️ Needs Work

- `MEDIA_URL = "/media/"`, `MEDIA_ROOT = BASE_DIR / "media"`
- **Local filesystem only** — нет cloud storage
- Нет django-storages, нет S3/R2

**Риск:** Media files потеряются при замене сервера/контейнера.

**Action (рекомендуемый — S3/Cloudflare R2):**
```bash
pip install django-storages boto3
```
```python
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.getenv('AWS_STORAGE_BUCKET_NAME')
```

**Action (минимальный):** Mount persistent volume к /media в Docker/Kubernetes.

---

## 4. Celery Configuration — ⚠️ Needs Work

- Celery 5.4.0 + Redis broker ✅
- django-celery-beat для periodic tasks ✅
- 2 scheduled tasks:
  - `generate-recurring-visits-daily` — 6:00 AM Dubai time
  - `check-sla-warnings-hourly` — каждый час
- Timezone: Asia/Dubai ✅

**Проблемы:**
- Нет graceful degradation — система зависит от Celery
- Нет Flower monitoring
- Нет task result expiration

**Action:**
```python
CELERY_RESULT_EXPIRES = 3600  # 1 hour
```
```bash
# Production startup
celery -A config worker -l info --pool=prefork --concurrency=4
celery -A config beat -l info

# Optional monitoring
pip install flower
celery -A config flower --port=5555
```

---

## 5. Database — ✅ Ready

- `DATABASE_URL` env variable supported ✅
- PostgreSQL parsing implemented correctly ✅
- Connection pooling: `CONN_MAX_AGE = 600` (10 min) ✅
- Connect timeout: 10 seconds ✅
- SQLite fallback for development ✅

**Action:**
```bash
pip install psycopg2-binary
python manage.py migrate
```

---

## 6. Monitoring & Health Checks — ⚠️ Needs Work

- Health endpoint exists: `GET /api/health/` → `{"status": "ok"}` ✅
- **Нет Sentry** — errors not tracked ❌
- **Нет application metrics** — no Prometheus/DataDog ❌
- Logging — console only

**Action (Sentry):**
```bash
pip install sentry-sdk
```
```python
if not DEBUG:
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
    )
```

**Action (Health check с БД):**
```python
def health_view(request):
    from django.db import connection
    try:
        connection.ensure_connection()
        return JsonResponse({"status": "ok", "database": "connected"})
    except Exception as e:
        return JsonResponse({"status": "error", "database": str(e)}, status=503)
```

---

## 7. CI/CD Pipeline — ⚠️ Needs Work

**Что есть:**
- `.github/workflows/security-checks.yml` ✅
  - Bandit security linter ✅
  - Safety dependency scan ✅
  - CodeQL analysis ✅

**Что отсутствует:**

| Item | Status |
|------|--------|
| Dockerfile | ❌ Missing |
| docker-compose.yml | ❌ Missing |
| Deploy workflow | ❌ Missing |
| Frontend build workflow | ❌ Missing |
| tests/security/ directory (referenced in CI) | ❌ Missing |

**Action — Dockerfile:**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN pip install gunicorn psycopg2-binary
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
RUN python manage.py collectstatic --noinput
EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
```

**Action:** Create `tests/security/` directory or update CI workflow path.

---

## Critical Pre-Launch Checklist

| # | Action | Priority |
|---|--------|----------|
| 1 | Install WhiteNoise + configure static files | 🔴 High |
| 2 | Add Sentry for error tracking | 🔴 High |
| 3 | Create Dockerfile | 🔴 High |
| 4 | Fix CI security tests path | 🔴 High |
| 5 | Set up production PostgreSQL | 🔴 High |
| 6 | Set up production Redis | 🔴 High |
| 7 | Configure media storage (S3/R2 or persistent volume) | 🟡 Medium |
| 8 | Generate production SECRET_KEY | 🔴 High |
| 9 | Run `python manage.py check --deploy` | 🔴 High |

---

## Production Startup Commands

```bash
# Collect static files
python manage.py collectstatic --noinput

# Run migrations
python manage.py migrate

# Start Gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4

# Start Celery worker
celery -A config worker -l info

# Start Celery beat
celery -A config beat -l info
```
