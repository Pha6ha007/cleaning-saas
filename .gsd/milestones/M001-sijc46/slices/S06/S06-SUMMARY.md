---
id: S06
milestone: M001-sijc46
provides:
  - "docs/deployment/JWT_PADDLE_SUPPLEMENT.md — full JWT+Paddle deployment guide (7 sections)"
  - "backend/.env.production.example — updated with Paddle billing block"
  - "dubai-control/.env.production.example — updated with VITE_PADDLE_* vars"
  - "docs/deployment/PRODUCTION_DEPLOYMENT_V1.md — env section updated, Key Endpoints table updated, changelog entry"
requires:
  - slice: S05
    provides: Complete JWT+Paddle+enforcement system to document
key_files:
  - docs/deployment/JWT_PADDLE_SUPPLEMENT.md (new)
  - backend/.env.production.example (updated)
  - dubai-control/.env.production.example (updated)
  - docs/deployment/PRODUCTION_DEPLOYMENT_V1.md (updated)
duration: ~30min
verification_result: pass
completed_at: 2026-03-17T04:00:00Z
---

# S06: Launch Polish & Deployment Docs

**Documentation complete. No code changes. M001-sijc46 milestone DONE.**

## What Was Built

**`JWT_PADDLE_SUPPLEMENT.md`** — Standalone addendum to the base deployment guide covering:
1. JWT auth setup — how it works, migration command, curl smoke tests
2. Paddle billing setup — account creation, products/prices, webhook registration, sandbox vs production table
3. Nginx webhook passthrough — verification that existing proxy_pass config is sufficient
4. Database migrations — new tables list, migration command, verification command
5. Vercel frontend env vars — full table of VITE_PADDLE_* vars with where-to-find-it column
6. Smoke test procedure — JWT login/refresh/logout curl script + Paddle webhook simulation steps
7. Troubleshooting — 5 specific failure scenarios with diagnostic commands

**Example file updates:**
- `backend/.env.production.example` — added full Paddle block with comments pointing to exact dashboard locations
- `dubai-control/.env.production.example` — added `VITE_PADDLE_*` block with comments

**`PRODUCTION_DEPLOYMENT_V1.md` updates:**
- Section 4.3 env block: added Paddle vars
- Key Endpoints table: added 5 new JWT/Paddle endpoints
- Changelog: v1.3 entry

## Verification

All documentation is self-consistent with the implemented code:
- JWT endpoints match `urls.py` + `views_auth.py` (S01)
- Webhook URL matches `urls.py` (`/api/billing/webhook/`)
- Env var names match `settings.py` exactly (`PADDLE_ENVIRONMENT`, `PADDLE_API_KEY`, etc.)
- Vite var names match `usePaddle.ts` and `Billing.tsx` (`VITE_PADDLE_CLIENT_TOKEN` etc.)
- Migration tables match `backend/apps/maintenance/models.py` (`PaddleSubscription`, `PaddleWebhookEvent`)
- Troubleshooting shell commands use real model paths
