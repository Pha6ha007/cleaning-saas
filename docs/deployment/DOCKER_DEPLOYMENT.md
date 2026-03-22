# Production Deployment v2 — Docker Compose

> **Stack:** Docker + Compose, PostgreSQL 16, Redis 7, Nginx
> **Target:** Ubuntu 22.04 VPS (2+ vCPU, 2GB+ RAM, 40GB SSD)
> **Frontend:** Vercel (unchanged — this guide covers the backend API only)
> **Last Updated:** 2026-03-17

---

## Quick Start (< 30 minutes)

```bash
# 1. Clone and enter repo
git clone <your-repo> /opt/cleanproof
cd /opt/cleanproof

# 2. Configure environment
cp backend/.env.production.example backend/.env.production
nano backend/.env.production   # fill in required values (see below)

# 3. Add SSL certificate (or skip for HTTP-only staging)
mkdir -p nginx/certs
cp /etc/letsencrypt/live/app.cleanproof.com/fullchain.pem nginx/certs/cleanproof.crt
cp /etc/letsencrypt/live/app.cleanproof.com/privkey.pem   nginx/certs/cleanproof.key

# 4. Build and start
docker compose up -d

# 5. First-run setup
docker compose exec backend python manage.py migrate --noinput
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py setup_periodic_tasks

# 6. Verify
curl http://localhost/api/health/
curl http://localhost/api/health/ready/
```

---

## Required Environment Variables

All variables live in `backend/.env.production`. Copy from `.env.production.example` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | ✅ | Django secret key — generate with `python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DEBUG` | ✅ | Must be `False` |
| `ALLOWED_HOSTS` | ✅ | Your domain(s), e.g. `app.cleanproof.com` |
| `DATABASE_URL` | ✅ | `postgres://cleanproof:PASSWORD@db:5432/cleanproof` |
| `REDIS_URL` | ✅ | `redis://redis:6379/0` |
| `POSTGRES_PASSWORD` | ✅ | Matches PASSWORD in DATABASE_URL |
| `CORS_ORIGINS` | ✅ | `https://app.cleanproof.com,https://proofplatform.vercel.app` |
| `CSRF_TRUSTED_ORIGINS` | ✅ | Same as CORS_ORIGINS |
| `PADDLE_API_KEY` | ✅ | From Paddle dashboard |
| `PADDLE_WEBHOOK_SECRET` | ✅ | From Paddle notification endpoint |
| `EMAIL_HOST_PASSWORD` | ✅ | Gmail App Password |
| `SENTRY_DSN` | optional | Leave blank to disable |
| `WHATSAPP_PHONE_NUMBER_ID` | optional | Leave blank to disable |

---

## Services

| Service | Port (internal) | Description |
|---------|-----------------|-------------|
| nginx | 80, 443 (host) | Reverse proxy, TLS, static files |
| backend | 8000 | Django + Gunicorn (4 workers) |
| celery-worker | — | Async tasks (email, webhooks, PDF) |
| celery-beat | — | Periodic tasks (05:00 Dubai — recurring jobs) |
| db | 5432 | PostgreSQL 16 |
| redis | 6379 | Cache + Celery broker |

---

## Health Checks

| Endpoint | Purpose | Expected |
|----------|---------|---------|
| `GET /api/health/` | Liveness — process alive | `200 {"status": "ok"}` |
| `GET /api/health/ready/` | Readiness — DB + cache | `200 {"status": "ok", "checks": {...}}` |

The Nginx upstream uses `/api/health/` as the backend health probe.
Docker healthchecks are configured on all services.

---

## First-Time Setup

```bash
# Apply all migrations
docker compose exec backend python manage.py migrate --noinput

# Create admin user
docker compose exec backend python manage.py createsuperuser

# Set up Celery Beat periodic tasks (recurring job generation, etc.)
docker compose exec backend python manage.py setup_periodic_tasks

# Verify the setup
docker compose exec backend python manage.py check --deploy
```

---

## Updating / Rolling Deploy

```bash
cd /opt/cleanproof

# Pull latest code
git pull origin main

# Rebuild and restart (zero-downtime for DB/Redis — they don't restart)
docker compose build --no-cache backend celery-worker celery-beat
docker compose run --rm backend python manage.py migrate --noinput
docker compose up -d --no-deps backend celery-worker celery-beat nginx

# Verify
curl -f http://localhost/api/health/ready/
```

---

## SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot

# Get certificate (stop nginx first so certbot can use port 80)
docker compose stop nginx
sudo certbot certonly --standalone -d app.cleanproof.com

# Copy certs into nginx/certs/
sudo cp /etc/letsencrypt/live/app.cleanproof.com/fullchain.pem nginx/certs/cleanproof.crt
sudo cp /etc/letsencrypt/live/app.cleanproof.com/privkey.pem   nginx/certs/cleanproof.key
sudo chown $USER:$USER nginx/certs/*

# Start nginx
docker compose up -d nginx

# Auto-renewal cron
echo "0 3 * * * cd /opt/cleanproof && sudo certbot renew --quiet && \
  sudo cp /etc/letsencrypt/live/app.cleanproof.com/fullchain.pem nginx/certs/cleanproof.crt && \
  sudo cp /etc/letsencrypt/live/app.cleanproof.com/privkey.pem nginx/certs/cleanproof.key && \
  docker compose exec nginx nginx -s reload" | sudo crontab -
```

---

## Backups

```bash
# Database backup
docker compose exec db pg_dump -U cleanproof cleanproof | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore
gunzip -c backup_20260317.sql.gz | docker compose exec -T db psql -U cleanproof cleanproof

# Automate (daily at 02:00)
echo "0 2 * * * cd /opt/cleanproof && docker compose exec db pg_dump -U cleanproof cleanproof | gzip > /var/backups/cleanproof_\$(date +\%Y\%m\%d).sql.gz && find /var/backups -name 'cleanproof_*.sql.gz' -mtime +30 -delete" | crontab -
```

---

## Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f celery-worker
docker compose logs -f nginx

# Last 100 lines
docker compose logs --tail=100 backend
```

---

## Monitoring

```bash
# Service health
docker compose ps

# Resource usage
docker stats

# Check readiness
watch -n 10 'curl -s http://localhost/api/health/ready/ | python3 -m json.tool'
```

---

## Troubleshooting

### Backend won't start

```bash
docker compose logs backend
# Common causes:
# - Missing env vars in .env.production
# - DATABASE_URL uses 'localhost' instead of 'db' (the service name)
# - REDIS_URL uses 'localhost' instead of 'redis'
```

### Migrations fail

```bash
# Run manually to see error
docker compose run --rm backend python manage.py migrate --verbosity=2
```

### Static files 404

```bash
# Re-run collectstatic
docker compose run --rm backend python manage.py collectstatic --noinput
# Verify volume is mounted
docker compose exec nginx ls /app/staticfiles/
```

### Celery tasks not running

```bash
# Check worker is alive
docker compose exec celery-worker celery -A config inspect ping
# Check beat schedule
docker compose logs celery-beat
```

---

## CI/CD

See `.github/workflows/ci.yml` for the automated pipeline:
- **Triggers:** push to main/develop, all PRs
- **Backend:** 464 tests + E2E API flows
- **Frontend:** TypeScript check + Vite build + chunk size validation
- **Mobile:** 28 Jest tests
- **Deploy:** manual trigger via `.github/workflows/deploy.yml`

---

## Security Checklist

- [ ] `DEBUG=False` in `.env.production`
- [ ] Unique `SECRET_KEY` (not the example value)
- [ ] `ALLOWED_HOSTS` set to your domain only
- [ ] `POSTGRES_PASSWORD` is a random 32+ char string
- [ ] `nginx/certs/` contains valid SSL certificate
- [ ] Firewall: only ports 22, 80, 443 open to internet
- [ ] PostgreSQL port 5432 NOT exposed to internet (`ports:` removed from db service)
- [ ] Redis port 6379 NOT exposed to internet
- [ ] Paddle webhook secret matches Paddle dashboard
- [ ] Sentry DSN configured for error monitoring
