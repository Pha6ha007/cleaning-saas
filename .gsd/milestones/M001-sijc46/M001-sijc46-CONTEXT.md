# M001-sijc46: Launch-Ready Billing & Auth

**Gathered:** 2026-03-16
**Status:** Ready for planning

## Project Description

Proof Platform is a multi-context B2B SaaS for verifying physical field work. Currently running on Django Token auth with no payment processor. This milestone makes the platform launch-ready: JWT auth for secure sessions, Paddle billing for self-serve payments, and trial enforcement for monetization.

## Why This Milestone

The platform has two production-ready products (CleanProof, MaintainProof) but cannot accept money. Token auth has no expiry, no rotation, and no revocation — unacceptable for a paid product. Without billing integration, the trial flow is a dead end. This milestone bridges the gap between "product works" and "business works."

## User-Visible Outcome

### When this milestone is complete, the user can:

- Sign up → start 7-day trial → use the full platform → see pricing → pay via Paddle checkout → plan activates automatically
- Log in and have their session managed with JWT (auto-refresh, secure rotation)
- See their real billing status (plan, next payment, billing cycle) in the billing dashboard
- Continue viewing data when trial expires (read-only) and upgrade via a clear CTA
- Access the deployment docs to push JWT + Paddle to the production VPS

### Entry point / environment

- Entry point: `dubai-control/` web app at localhost:5173 (dev) / production URL
- Environment: local dev with Paddle sandbox; deployment docs for Ubuntu VPS production
- Live dependencies involved: Paddle API (sandbox for dev, live for production), webhook delivery

## Completion Class

- Contract complete means: JWT auth endpoints tested, webhook handlers tested with simulated Paddle payloads, subscription state sync verified
- Integration complete means: Paddle.js checkout overlay opens, webhook signature verification passes, plan state updates end-to-end
- Operational complete means: deployment docs enable the user to go live on VPS without further engineering help

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A company can complete the full signup → trial → checkout → paid flow in one session against Paddle sandbox
- JWT login → use app → token expires → auto-refresh → continue using app without re-login
- A simulated Paddle webhook (subscription.canceled) correctly transitions company to blocked/read-only
- An expired trial company can view data but cannot create jobs/visits, and sees an upgrade prompt

## Risks and Unknowns

- **JWT migration touches auth pipeline** — Every authenticated endpoint changes auth method. Must run JWT alongside Token during transition to avoid breaking anything.
- **Paddle webhook reliability** — Out-of-order delivery, duplicate events, and signature verification edge cases. Need robust idempotency and ordering logic.
- **No Paddle account yet** — All development is against sandbox with configurable env vars. Real account setup happens at deployment time.
- **CleanProof LOCKED boundary** — JWT backend changes (settings.py, views_auth.py) necessarily affect CleanProof's auth flow. Must be additive, not breaking.

## Existing Codebase / Prior Art

- `backend/apps/api/views_auth.py` — Current login views (LoginView, ManagerLoginView, CleanerPinLoginView, ManagerSignupView). Returns `Token` key. JWT endpoints will parallel these.
- `backend/apps/accounts/models.py` — Company model with plan (trial/active/blocked), plan_tier (standard/pro/enterprise), trial_started_at, trial_expires_at. Paddle subscription fields will extend this.
- `backend/config/settings.py` — DRF config with `rest_framework.authtoken` and `TokenAuthentication`. JWT auth class will be added alongside.
- `dubai-control/src/api/client.ts` — Frontend API client. Uses `Authorization: Token xxx` from localStorage. Will switch to `Bearer access_token` with refresh logic.
- `dubai-control/src/pages/Login.tsx` — Login page. Posts to `/api/manager/auth/login/`, stores token in localStorage. Will switch to JWT pair.
- `dubai-control/src/pages/PricingPage.tsx` — Pricing page with 3 tiers ($129/$279/$499). Will integrate Paddle.js checkout overlay.
- `dubai-control/src/pages/settings/Billing.tsx` — Billing settings page with placeholder data. Will show real Paddle subscription data.
- `mobile-cleaner/src/api/client.ts` — Mobile API client with Token auth. Stays on Token for now (both auth methods supported).

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R001–R002 — JWT auth backend + frontend migration
- R003–R004, R009–R011 — Paddle webhook receiver, subscription sync, reliability trio
- R005–R006 — Paddle checkout + self-serve conversion flow
- R007–R008 — Soft degradation enforcement + upgrade CTA
- R012–R013 — Billing dashboard + configuration-driven setup
- R014 — Deployment documentation

## Scope

### In Scope

- JWT authentication backend (djangorestframework-simplejwt)
- JWT frontend migration for manager portal only
- Paddle billing backend (webhooks, subscription sync, audit trail)
- Paddle.js checkout overlay on pricing/upgrade pages
- Self-serve trial → paid conversion flow
- Soft degradation (read-only) for expired trials
- Upgrade CTA on blocked actions
- Billing dashboard with real Paddle data
- Configuration-driven Paddle setup (env vars)
- Deployment documentation for VPS

### Out of Scope / Non-Goals

- JWT migration for mobile cleaner app (deferred — stays on Token)
- Paddle customer portal for self-service subscription management
- Failed payment email notifications
- Plan upgrade/downgrade mid-cycle
- Email onboarding drip campaigns
- In-app usage analytics / activation tracking
- Credit card required for trial signup
- Any changes to CleanProof business logic (LOCKED)
- Any changes to MaintainProof feature set

## Technical Constraints

- CleanProof code is LOCKED per CLAUDE.md — auth changes must be additive, not breaking
- Backend is Django 5.2 + DRF on Python 3.14
- Frontend is React 18 + Vite + TypeScript + Tailwind + shadcn/ui
- Production runs on Ubuntu VPS with Nginx + Gunicorn + PostgreSQL
- No Paddle account exists yet — must be sandbox-first, config-driven
- Mobile cleaner app stays on Token auth — backend must support both JWT and Token simultaneously

## Integration Points

- **Paddle API** — Webhook delivery for subscription lifecycle events. Paddle.js for frontend checkout overlay. Sandbox for development, live for production.
- **Django auth pipeline** — JWT auth class added alongside TokenAuthentication in DRF settings. Both work simultaneously.
- **Company model** — Extended with Paddle subscription fields (paddle_subscription_id, paddle_customer_id, etc.)
- **Frontend API client** — Authorization header changes from `Token xxx` to `Bearer access_token`. Refresh logic added.

## Open Questions

- **Paddle price IDs** — Will be determined when the user sets up their Paddle account. Code references env vars, not hardcoded IDs.
- **Trial duration** — Currently implied as 7 days from the signup UI copy. Need to confirm this matches the Company model trial logic.
