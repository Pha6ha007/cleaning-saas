# JWT + Paddle Billing — Deployment Supplement

> **Supplement to:** `docs/deployment/PRODUCTION_DEPLOYMENT_V1.md`
> **Milestone:** M001-sijc46: Launch-Ready Billing & Auth
> **Last Updated:** 2026-03-17

This document covers everything added in M001-sijc46 that isn't in the base deployment guide:
JWT authentication backend, Paddle billing integration, and the end-to-end smoke test procedure.

---

## Table of Contents

1. [JWT Auth Setup](#1-jwt-auth-setup)
2. [Paddle Billing Setup](#2-paddle-billing-setup)
3. [Nginx — Webhook Passthrough](#3-nginx--webhook-passthrough)
4. [Database Migrations](#4-database-migrations)
5. [Vercel Frontend Env Vars](#5-vercel-frontend-env-vars)
6. [Smoke Test Procedure](#6-smoke-test-procedure)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. JWT Auth Setup

### How it works

JWT replaces the `Token` auth scheme for the manager/owner web app. The mobile cleaner app continues using Token auth — both schemes coexist on all backend endpoints.

- **Login:** `POST /api/manager/auth/login/` → returns `{ access, refresh, user: {...} }`
- **Access token lifetime:** 30 days (configurable in `settings.py → SIMPLE_JWT`)
- **Refresh token lifetime:** 90 days, rotates on use, blacklisted after rotation
- **Token format:** Bearer — `Authorization: Bearer <access_token>`
- **Custom claims:** `user_id`, `email`, `role`, `company_id` embedded in every access token

### JWT is derived from `SECRET_KEY`

JWT signing uses Django's `SECRET_KEY` via `SIMPLE_JWT["SIGNING_KEY"]`. No separate JWT secret is needed. Keep `SECRET_KEY` long (50+ chars), random, and secret.

### Migration: JWT blacklist tables

After deploying, run migrations to create the token blacklist tables:

```bash
cd /opt/cleanproof/backend
sudo -u cleanproof bash -c 'set -a && source .env.production && set +a && \
  ./venv/bin/python manage.py migrate rest_framework_simplejwt'
```

Or just run the full migrate (safe to re-run):

```bash
sudo -u cleanproof bash -c 'set -a && source .env.production && set +a && \
  ./venv/bin/python manage.py migrate'
```

### Verify JWT endpoints are live

```bash
# Should return 400 (missing body) — confirms endpoint exists
curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://app.cleanproof.com/api/manager/auth/login/
# Expected: 400

# Login and capture tokens
curl -s -X POST https://app.cleanproof.com/api/manager/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' | python3 -m json.tool
# Expected: {"access":"eyJ...", "refresh":"eyJ...", "user":{...}}
```

---

## 2. Paddle Billing Setup

### 2.1 Create a Paddle Account

1. Go to [paddle.com](https://paddle.com) and create an account
2. Complete business verification (required before going live)
3. For development: use the **sandbox** environment at [sandbox-vendors.paddle.com](https://sandbox-vendors.paddle.com)

### 2.2 Create Products and Prices

In Paddle dashboard → **Catalog → Products**:

1. Create product: **CleanProof Standard**
   - Billing: Recurring monthly
   - Price: e.g. $129/month
   - Copy the `pri_xxxxx` ID → this is `PADDLE_PRICE_ID_STANDARD`

2. Create product: **CleanProof Pro**
   - Billing: Recurring monthly
   - Price: e.g. $279/month
   - Copy the `pri_xxxxx` ID → this is `PADDLE_PRICE_ID_PRO`

### 2.3 Get API Credentials

In Paddle dashboard → **Developer Tools → Authentication**:

| What | Where | Env var |
|------|-------|---------|
| API key (secret) | Authentication → API keys → Generate | `PADDLE_API_KEY` |
| Client-side token | Authentication → Client-side tokens | `PADDLE_CLIENT_TOKEN` and `VITE_PADDLE_CLIENT_TOKEN` |

> **Note:** The client-side token is the same value for backend and frontend. The API key is backend-only — never expose it in frontend builds.

### 2.4 Register the Webhook Endpoint

In Paddle dashboard → **Developer Tools → Notifications → New destination**:

| Field | Value |
|-------|-------|
| Type | URL |
| URL | `https://app.cleanproof.com/api/billing/webhook/` |
| Events | `subscription.activated`, `subscription.updated`, `subscription.canceled`, `subscription.past_due`, `subscription.paused`, `subscription.resumed` |

After saving, copy the **Secret key** → this is `PADDLE_WEBHOOK_SECRET`.

> **Critical:** The webhook secret must match exactly between Paddle and your `PADDLE_WEBHOOK_SECRET` env var. Any mismatch silently rejects all webhooks (returns 400 with no further logging by default).

### 2.5 Sandbox vs Production

| Setting | Sandbox | Production |
|---------|---------|-----------|
| `PADDLE_ENVIRONMENT` | `sandbox` | `production` |
| `VITE_PADDLE_ENVIRONMENT` | `sandbox` | `production` |
| API domain | `sandbox-api.paddle.com` | `api.paddle.com` |
| Dashboard | `sandbox-vendors.paddle.com` | `vendors.paddle.com` |
| Price IDs | `pri_sandbox_xxxxx` | `pri_xxxxx` |

Switching environments requires new credentials — sandbox and production credentials are entirely separate.

### 2.6 Backend `.env.production` — Paddle block

```bash
PADDLE_ENVIRONMENT=production
PADDLE_API_KEY=live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PADDLE_CLIENT_TOKEN=live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PADDLE_WEBHOOK_SECRET=pdl_ntfset_xxxxxxxxxxxxxxxxxxxxxxxx_xxxxxxxxxxxx
PADDLE_PRICE_ID_STANDARD=pri_01xxxxxxxxxxxxx
PADDLE_PRICE_ID_PRO=pri_01xxxxxxxxxxxxx
PADDLE_PRICE_ID_ENTERPRISE=pri_01xxxxxxxxxxxxx
```

---

## 3. Nginx — Webhook Passthrough

The Paddle webhook endpoint must receive the **raw request body** with signature headers intact. Nginx must not buffer or modify the body.

Check your Nginx config at `/etc/nginx/sites-available/cleanproof`. The `/api/` location block should already pass through to Gunicorn. Confirm `proxy_pass` is present:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    # Webhook bodies can be up to ~10KB — default 1MB limit is fine
}
```

No special configuration is needed for the webhook URL — it's under `/api/` and uses the same proxy pass.

After any Nginx change:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 4. Database Migrations

M001-sijc46 adds two new tables:

| Table | Purpose |
|-------|---------|
| `maintenance_paddlesubscription` | Stores Paddle subscription state per company |
| `maintenance_paddlewebhookevent` | Idempotency log for received webhook events |
| `token_blacklist_*` | JWT refresh token blacklist (simplejwt) |

Run after deploying:

```bash
cd /opt/cleanproof/backend
sudo -u cleanproof bash -c 'set -a && source .env.production && set +a && \
  ./venv/bin/python manage.py migrate'
```

Verify the new tables exist:

```bash
sudo -u cleanproof bash -c 'set -a && source .env.production && set +a && \
  ./venv/bin/python manage.py showmigrations maintenance'
# Should show: [X] 0001_initial ... [X] 0003_paddlesubscription_paddlewebhookevent (or similar)
```

---

## 5. Vercel Frontend Env Vars

If the frontend is deployed on Vercel, set these in the Vercel project settings (Settings → Environment Variables):

| Variable | Value | Where to get it |
|----------|-------|-----------------|
| `VITE_API_BASE_URL` | `https://app.cleanproof.com` | Your VPS domain |
| `VITE_GOOGLE_MAPS_API_KEY` | `AIza...` | Google Cloud Console |
| `VITE_PADDLE_ENVIRONMENT` | `production` | Hardcode for prod |
| `VITE_PADDLE_CLIENT_TOKEN` | `live_xxx...` | Paddle → Authentication → Client-side tokens |
| `VITE_PADDLE_PRICE_ID_STANDARD` | `pri_01xxx...` | Paddle → Catalog → your Standard price |
| `VITE_PADDLE_PRICE_ID_PRO` | `pri_01xxx...` | Paddle → Catalog → your Pro price |

> Set all variables for **Production** environment. After adding/changing them, trigger a new deployment — Vite bakes env vars at build time.

For local dev, these go in `dubai-control/.env.local` (already configured with sandbox placeholders).

---

## 6. Smoke Test Procedure

Run these after a fresh production deployment to confirm the full JWT + Paddle flow is operational.

### 6.1 JWT Auth

```bash
BASE=https://app.cleanproof.com

# 1. Login
TOKEN_RESPONSE=$(curl -s -X POST $BASE/api/manager/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_OWNER_EMAIL","password":"YOUR_PASSWORD"}')
echo $TOKEN_RESPONSE | python3 -m json.tool

# 2. Extract access token
ACCESS=$(echo $TOKEN_RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['access'])")
REFRESH=$(echo $TOKEN_RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['refresh'])")

# 3. Call an authenticated endpoint
curl -s -H "Authorization: Bearer $ACCESS" $BASE/api/settings/billing/ | python3 -m json.tool
# Expected: billing summary JSON (not 401)

# 4. Refresh tokens
curl -s -X POST $BASE/api/manager/auth/refresh/ \
  -H "Content-Type: application/json" \
  -d "{\"refresh\":\"$REFRESH\"}" | python3 -m json.tool
# Expected: {"access":"eyJ...", "refresh":"eyJ..."}

# 5. Logout
curl -s -X POST $BASE/api/manager/auth/logout/ \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d "{\"refresh\":\"$REFRESH\"}"
# Expected: 200 {}
```

### 6.2 Paddle Billing Status

```bash
# After login (use new access token if old was logged out)
curl -s -H "Authorization: Bearer $ACCESS" \
  $BASE/api/billing/subscription/ | python3 -m json.tool
# Expected: {"status": null} if no subscription yet (correct for new account)
# Or: {"status": "active", "plan_tier": "standard", ...} if subscribed
```

### 6.3 Paddle Webhook (Simulated)

In Paddle dashboard → **Developer Tools → Notifications → your endpoint → Send test notification**:

1. Select event type: `subscription.activated`
2. Click "Send test"
3. Check response — should be `200 OK`
4. Check backend logs: `sudo journalctl -u cleanproof-api -f`
   - Look for: `Paddle webhook received: subscription.activated`
   - Look for: `Skipping already-processed event` (idempotency working)

If you get a `400` with "Invalid signature":
- Double-check `PADDLE_WEBHOOK_SECRET` matches exactly (no trailing whitespace)
- Restart the service: `sudo systemctl restart cleanproof-api`

### 6.4 Trial Enforcement (Optional)

To verify plan enforcement works end-to-end:

1. In Django admin or shell, set a test company to `plan=blocked`
2. Log in as that company's manager
3. Try to create a maintenance visit → should get `403 {"code": "company_blocked", ...}`
4. Frontend should show the `UpgradeDialog`
5. Reset the company plan back to `active`

---

## 7. Troubleshooting

### JWT: "Invalid token" / 401 on all endpoints

1. Check token is being sent: `Authorization: Bearer <access>` (not `Token <access>`)
2. Check token hasn't expired (30-day default — unlikely unless clock skew)
3. Verify `SECRET_KEY` hasn't changed since token was issued (rotation invalidates all tokens)

```bash
# Decode token payload (no verification) to inspect claims
echo "YOUR_ACCESS_TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | python3 -m json.tool
```

### JWT: "Token is blacklisted"

This is expected after logout. The user needs to log in again. If happening unexpectedly, check for duplicate logout calls in the frontend.

### Paddle: Webhook returns 400 "Invalid signature"

1. The `PADDLE_WEBHOOK_SECRET` must be the notification destination's secret — not the API key
2. Copy the secret character by character — trailing newlines or spaces cause mismatches
3. Sandbox and production have different secrets — confirm `PADDLE_ENVIRONMENT` matches

```bash
# Verify the env var is set and has correct length (typically ~60 chars)
sudo -u cleanproof bash -c 'set -a && source .env.production && set +a && \
  python3 -c "import os; s = os.environ[\"PADDLE_WEBHOOK_SECRET\"]; print(f\"len={len(s)}, first4={s[:4]}\")"'
```

### Paddle: Checkout overlay doesn't open

1. Check browser console for Paddle.js errors
2. Verify `VITE_PADDLE_CLIENT_TOKEN` is set in the Vercel env (not just local)
3. Verify `VITE_PADDLE_ENVIRONMENT` matches the environment where the price IDs exist
4. Verify `VITE_PADDLE_PRICE_ID_STANDARD` / `_PRO` use the correct `pri_xxx` format

### Subscription state not updating after payment

1. Confirm the webhook endpoint is reachable from the internet (Paddle must reach it)
2. Check Paddle dashboard → Notifications → your endpoint → delivery history for failures
3. Check backend logs: `sudo journalctl -u cleanproof-api --since "1 hour ago" | grep -i paddle`
4. If deliveries failed, Paddle retries for up to 72 hours — or use "Resend" in dashboard

### Company plan not changing after subscription.activated

```bash
# Check webhook event was stored
cd /opt/cleanproof/backend
sudo -u cleanproof bash -c 'set -a && source .env.production && set +a && \
  ./venv/bin/python manage.py shell -c "
from apps.maintenance.models import PaddleWebhookEvent
events = PaddleWebhookEvent.objects.order_by(\"-created_at\")[:5]
for e in events: print(e.event_type, e.event_id, e.created_at)
"'

# Check PaddleSubscription exists
sudo -u cleanproof bash -c 'set -a && source .env.production && set +a && \
  ./venv/bin/python manage.py shell -c "
from apps.maintenance.models import PaddleSubscription
for s in PaddleSubscription.objects.all(): print(s.company, s.status, s.plan_tier)
"'
```

---

*For base deployment steps (Nginx, Gunicorn, PostgreSQL, SSL), see `PRODUCTION_DEPLOYMENT_V1.md`.*
